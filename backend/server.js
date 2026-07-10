const http = require("node:http");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 8787);
const ROOM_TTL_MS = 1000 * 60 * 60 * 2;
const rooms = new Map();

const catPowers = {
  player: 0.82,
  rival: 0.88,
};

function json(res, status, payload) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 4096) {
        req.destroy();
        reject(new Error("Body too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return code;
}

function createRoom() {
  let code = roomCode();
  while (rooms.has(code)) code = roomCode();
  const now = new Date().toISOString();
  const room = {
    roomCode: code,
    scores: { player: 0, rival: 0 },
    turn: "player",
    rally: 0,
    ball: { x: -2.2, y: 0.45, z: 7.3 },
    lastShot: null,
    updatedAt: now,
  };
  rooms.set(code, room);
  return room;
}

function publicRoom(room) {
  return {
    roomCode: room.roomCode,
    scores: room.scores,
    turn: room.turn,
    rally: room.rally,
    ball: room.ball,
    lastShot: room.lastShot,
    updatedAt: room.updatedAt,
  };
}

function shotConfig(shot) {
  return {
    serve: { curve: 0.05 },
    topspin: { curve: 1.35 },
    lob: { curve: -0.45 },
    slice: { curve: -1.2 },
  }[shot] || { curve: 0.05 };
}

function moveRoom(room, side, shot) {
  if (!["player", "rival"].includes(side)) {
    return { error: "Invalid side", status: 400 };
  }
  if (!["serve", "topspin", "lob", "slice"].includes(shot)) {
    return { error: "Invalid shot", status: 400 };
  }
  if (room.turn !== side) {
    return { error: "Not this side's turn", status: 409 };
  }

  const cfg = shotConfig(shot);
  const receiverX = side === "player" ? 2.4 : -2.4;
  const targetX = clamp(receiverX + cfg.curve + (Math.random() - 0.5) * 1.4, -5.4, 5.4);
  const attackerPower = side === "player" ? catPowers.player : catPowers.rival;
  const receiverPower = side === "player" ? catPowers.rival : catPowers.player;
  const shotBonus = { serve: 0.08, topspin: 0.04, lob: -0.01, slice: 0.02 }[shot] || 0;
  const pressure = Math.abs(targetX) / 8;
  const chance = 0.56 + attackerPower * 0.28 + shotBonus + pressure * 0.08 - receiverPower * 0.2;
  const scored = Math.random() < chance || room.rally > 4 + Math.round(receiverPower * 3);
  const nextTurn = scored ? (side === "player" ? "rival" : "player") : side === "player" ? "rival" : "player";
  const nextRally = scored ? 0 : room.rally + 1;
  const ball = {
    x: scored ? (nextTurn === "player" ? -2.2 : 2.2) : targetX,
    y: scored ? 0.45 : 0.62,
    z: scored ? (nextTurn === "player" ? 7.3 : -7.3) : side === "player" ? -7.2 : 7.2,
  };

  if (scored) room.scores[side] += 1;
  room.turn = nextTurn;
  room.rally = nextRally;
  room.ball = ball;
  room.updatedAt = new Date().toISOString();
  room.lastShot = {
    id: Date.now(),
    shot,
    fromSide: side,
    targetX,
    scored,
    winnerSide: scored ? side : null,
    scores: { ...room.scores },
    nextTurn,
    nextRally,
    ball,
    label: scored
      ? `${side === "player" ? "Player 1" : "Player 2"} wins the point`
      : `${nextTurn === "player" ? "Player 1" : "Player 2"} returns`,
  };
  return { room };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cleanupRooms() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - Date.parse(room.updatedAt) > ROOM_TTL_MS) rooms.delete(code);
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    json(res, 204, {});
    return;
  }

  cleanupRooms();

  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, { ok: true, rooms: rooms.size });
      return;
    }

    if (req.method === "POST" && url.pathname === "/rooms") {
      const room = createRoom();
      json(res, 201, { roomCode: room.roomCode, state: publicRoom(room) });
      return;
    }

    if (parts[0] === "rooms" && parts[1]) {
      const code = parts[1].toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        json(res, 404, { error: "Room not found" });
        return;
      }

      if (req.method === "GET" && parts.length === 2) {
        json(res, 200, { roomCode: code, state: publicRoom(room) });
        return;
      }

      if (req.method === "POST" && parts[2] === "join") {
        room.updatedAt = new Date().toISOString();
        json(res, 200, { roomCode: code, state: publicRoom(room) });
        return;
      }

      if (req.method === "POST" && parts[2] === "move") {
        const body = await readBody(req);
        const result = moveRoom(room, body.side, body.shot);
        if (result.error) {
          json(res, result.status, { error: result.error });
          return;
        }
        json(res, 200, { roomCode: code, state: publicRoom(result.room) });
        return;
      }
    }

    json(res, 404, { error: "Not found" });
  } catch (error) {
    json(res, 400, { error: "Bad request" });
  }
});

server.listen(PORT, () => {
  console.log(`Cat Teiness room server listening on ${PORT}`);
});
