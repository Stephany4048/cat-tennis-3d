import * as THREE from "./vendor/three.module.min.js";

const cats = [
  {
    name: "Midnight Server",
    trait: "laser focus",
    move: "Moonball Serve",
    img: "./assets/midnight-server.jpg",
    color: 0x0b1215,
    accent: 0x22d6c1,
    power: 0.82,
  },
  {
    name: "Ginger Captain",
    trait: "steady paws",
    move: "Velvet Drop",
    img: "./assets/ginger-captain.jpg",
    color: 0xd97826,
    accent: 0xffb34f,
    power: 0.72,
  },
  {
    name: "Sun Striker",
    trait: "jump reach",
    move: "Solar Topspin",
    img: "./assets/sun-striker.jpg",
    color: 0xf08b22,
    accent: 0xc7ff21,
    power: 0.88,
  },
  {
    name: "Black Volley",
    trait: "net guard",
    move: "Shadow Slice",
    img: "./assets/black-volley.jpg",
    color: 0x06090a,
    accent: 0xff6b6b,
    power: 0.78,
  },
  {
    name: "Spin Master",
    trait: "curved shots",
    move: "Comet Spin",
    img: "./assets/spin-master.jpg",
    color: 0xe87f25,
    accent: 0x72f6cf,
    power: 0.84,
  },
  {
    name: "Airborne Save",
    trait: "quick recovery",
    move: "Sky Paw",
    img: "./assets/airborne-save.jpg",
    color: 0xef8f31,
    accent: 0xffffff,
    power: 0.76,
  },
];

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x071115, 20, 72);

const canvas = document.querySelector("#gameCanvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 120);
camera.position.set(0, 12.4, 21);
camera.lookAt(0, 0, 0);

const textureLoader = new THREE.TextureLoader();
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const state = {
  player: 0,
  rival: 2,
  mode: "solo",
  pickingSide: "player",
  playerScore: 0,
  rivalScore: 0,
  servingSide: "player",
  busy: false,
  rally: 0,
};

const ui = {
  roster: document.querySelector("#catRoster"),
  playerName: document.querySelector("#playerName"),
  rivalName: document.querySelector("#rivalName"),
  scoreCards: [...document.querySelectorAll(".scoreboard div")],
  playerScore: document.querySelector("#playerScore"),
  rivalScore: document.querySelector("#rivalScore"),
  turnLabel: document.querySelector("#turnLabel"),
  moveLabel: document.querySelector("#moveLabel"),
  moves: [...document.querySelectorAll(".move")],
  soloMode: document.querySelector("#soloMode"),
  versusMode: document.querySelector("#versusMode"),
  pickPlayer: document.querySelector("#pickPlayer"),
  pickRival: document.querySelector("#pickRival"),
};

function makeMat(color, roughness = 0.65, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

const court = new THREE.Group();
scene.add(court);

function addCourt() {
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(17, 0.22, 28),
    makeMat(0x315f4b, 0.82),
  );
  base.position.y = -0.13;
  base.receiveShadow = true;
  court.add(base);

  const inner = new THREE.Mesh(new THREE.PlaneGeometry(13, 24), makeMat(0x406f58, 0.86));
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.002;
  inner.receiveShadow = true;
  court.add(inner);

  const white = makeMat(0xf6fff5, 0.54);
  const lineSpecs = [
    [0, 0, 0.08, 24],
    [-6.5, 0, 0.08, 24],
    [6.5, 0, 0.08, 24],
    [0, -12, 13, 0.08],
    [0, 12, 13, 0.08],
    [0, -6, 13, 0.07],
    [0, 6, 13, 0.07],
    [-3.25, 0, 0.07, 12],
    [3.25, 0, 0.07, 12],
  ];

  lineSpecs.forEach(([x, z, w, h]) => {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(w, h), white);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.015, z);
    court.add(line);
  });

  const netPosts = makeMat(0xdecda4, 0.5);
  [-7.15, 7.15].forEach((x) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.1, 16), netPosts);
    post.position.set(x, 1.05, 0);
    post.castShadow = true;
    court.add(post);
  });

  const net = new THREE.Mesh(
    new THREE.PlaneGeometry(14.4, 1.45, 28, 5),
    new THREE.MeshBasicMaterial({
      color: 0xeaf9ef,
      transparent: true,
      opacity: 0.34,
      wireframe: true,
    }),
  );
  net.position.set(0, 1.08, 0);
  court.add(net);

  const wallMat = makeMat(0x18332f, 0.85);
  [-9.2, 9.2].forEach((x) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.2, 31), wallMat);
    wall.position.set(x, 1.5, 0);
    wall.receiveShadow = true;
    court.add(wall);
  });

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(19, 3.2, 0.16), wallMat);
  backWall.position.set(0, 1.5, -15.6);
  court.add(backWall);

  const frontWall = backWall.clone();
  frontWall.position.z = 15.6;
  court.add(frontWall);
}

addCourt();

const hemi = new THREE.HemisphereLight(0xdafcff, 0x152313, 1.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffe4aa, 3.2);
sun.position.set(-7, 14, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 42;
sun.shadow.camera.left = -16;
sun.shadow.camera.right = 16;
sun.shadow.camera.top = 18;
sun.shadow.camera.bottom = -18;
scene.add(sun);

const rim = new THREE.PointLight(0x22d6c1, 2.6, 28);
rim.position.set(7, 5, -10);
scene.add(rim);

function createLightOrb(x, z, color) {
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 24, 16),
    new THREE.MeshBasicMaterial({ color }),
  );
  orb.position.set(x, 0.68, z);
  const glow = new THREE.PointLight(color, 2.6, 9);
  glow.position.copy(orb.position);
  scene.add(orb, glow);
  return { orb, glow };
}

const orbs = [
  createLightOrb(-6.6, -9.6, 0xc7ff21),
  createLightOrb(6.5, 9.7, 0x22d6c1),
  createLightOrb(-7.1, 7.2, 0xffb34f),
];

function createCatAvatar(cat, side) {
  const group = new THREE.Group();
  const sign = side === "player" ? 1 : -1;
  group.position.set(side === "player" ? -3.4 : 3.4, 0, side === "player" ? 8.3 : -8.3);
  group.rotation.y = side === "player" ? Math.PI : 0;

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 1.5, 7, 16), makeMat(cat.color, 0.76));
  body.position.y = 1.35;
  body.scale.set(0.82, 1.1, 0.72);
  body.castShadow = true;
  group.add(body);

  const shirt = new THREE.Mesh(new THREE.CapsuleGeometry(0.84, 0.9, 7, 16), makeMat(0xf3fbf2, 0.74));
  shirt.position.y = 1.55;
  shirt.scale.set(0.88, 0.7, 0.74);
  shirt.castShadow = true;
  group.add(shirt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.74, 32, 24), makeMat(cat.color, 0.72));
  head.position.y = 2.82;
  head.scale.set(1.02, 0.9, 0.95);
  head.castShadow = true;
  group.add(head);

  [-0.38, 0.38].forEach((x) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.58, 4), makeMat(cat.color, 0.7));
    ear.position.set(x, 3.42, 0.04);
    ear.rotation.z = x < 0 ? 0.28 : -0.28;
    ear.rotation.y = Math.PI / 4;
    ear.castShadow = true;
    group.add(ear);
  });

  const faceTexture = textureLoader.load(cat.img);
  faceTexture.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.38, 1.12),
    new THREE.MeshBasicMaterial({
      map: faceTexture,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    }),
  );
  face.position.set(0, 2.84, -0.55 * sign);
  face.rotation.y = side === "player" ? Math.PI : 0;
  group.add(face);

  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 12, 32, Math.PI * 1.35), makeMat(cat.color, 0.7));
  tail.position.set(-0.75, 1.18, 0.38 * sign);
  tail.rotation.set(0.6, 0.15 * sign, 1.2);
  tail.castShadow = true;
  group.add(tail);

  const racket = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 1.25, 14), makeMat(0x5a3724, 0.48));
  handle.rotation.z = Math.PI / 2.45;
  handle.position.set(0.78, 1.62, -0.35 * sign);
  const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 12, 36), makeMat(0xeaf9ef, 0.36, 0.08));
  rimMesh.position.set(1.2, 2.08, -0.52 * sign);
  rimMesh.scale.y = 1.28;
  const strings = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.72, 6, 8),
    new THREE.MeshBasicMaterial({ color: 0xeaf9ef, wireframe: true, transparent: true, opacity: 0.78 }),
  );
  strings.position.copy(rimMesh.position);
  strings.rotation.z = 0.18;
  racket.add(handle, rimMesh, strings);
  group.add(racket);

  const nameSprite = makeTextSprite(cat.name, cat.accent);
  nameSprite.position.set(0, 4.08, 0);
  group.add(nameSprite);

  return { group, racket, body, head, tail, face, side };
}

function makeTextSprite(text, color) {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 512;
  labelCanvas.height = 128;
  const ctx = labelCanvas.getContext("2d");
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = "rgba(5, 13, 16, 0.72)";
  roundRect(ctx, 18, 25, 476, 72, 18);
  ctx.fill();
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.font = "800 34px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 62, 420);
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(3.9, 0.98, 1);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

let playerAvatar = createCatAvatar(cats[state.player], "player");
let rivalAvatar = createCatAvatar(cats[state.rival], "rival");
scene.add(playerAvatar.group, rivalAvatar.group);

const ball = new THREE.Mesh(
  new THREE.SphereGeometry(0.28, 32, 18),
  new THREE.MeshStandardMaterial({
    color: 0xc7ff21,
    roughness: 0.34,
    emissive: 0x5d7300,
    emissiveIntensity: 0.2,
  }),
);
ball.castShadow = true;
scene.add(ball);

const ballGlow = new THREE.PointLight(0xc7ff21, 1.8, 8);
scene.add(ballGlow);

const trailMaterial = new THREE.LineBasicMaterial({ color: 0xdfff72, transparent: true, opacity: 0.65 });
let trail = null;

const floorTarget = new THREE.Mesh(
  new THREE.PlaneGeometry(17, 28),
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
);
floorTarget.rotation.x = -Math.PI / 2;
scene.add(floorTarget);

function setBallForServer() {
  const z = state.servingSide === "player" ? 7.3 : -7.3;
  ball.position.set(state.servingSide === "player" ? -2.2 : 2.2, 0.45, z);
  ballGlow.position.copy(ball.position);
}

setBallForServer();

function renderRoster() {
  ui.roster.innerHTML = "";
  cats.forEach((cat, index) => {
    const button = document.createElement("button");
    const selectedClass = index === state.player ? " is-selected" : "";
    const rivalClass = index === state.rival ? " is-rival" : "";
    button.className = `cat-card${selectedClass}${rivalClass}`;
    button.type = "button";
    button.innerHTML = `
      <img src="${cat.img}" alt="${cat.name}" />
      <span>
        <strong>${cat.name}</strong>
        <span>${cat.trait}</span>
        <small>${cat.move}</small>
      </span>
      <b>${Math.round(cat.power * 100)}</b>
    `;
    button.addEventListener("click", () => selectCat(index));
    ui.roster.appendChild(button);
  });
}

function selectCat(index) {
  if (state.busy) return;
  if (state.pickingSide === "player") {
    state.player = index;
    if (state.rival === index) state.rival = (index + 1) % cats.length;
  } else {
    state.rival = index;
    if (state.player === index) state.player = (index + 1) % cats.length;
  }
  state.playerScore = 0;
  state.rivalScore = 0;
  state.servingSide = "player";
  swapAvatars();
  setBallForServer();
  updateUi(`${activeSideLabel(state.pickingSide)} selected`);
  renderRoster();
}

function swapAvatars() {
  scene.remove(playerAvatar.group, rivalAvatar.group);
  playerAvatar = createCatAvatar(cats[state.player], "player");
  rivalAvatar = createCatAvatar(cats[state.rival], "rival");
  scene.add(playerAvatar.group, rivalAvatar.group);
}

function updateUi(moveText = "Ready") {
  ui.playerName.textContent = cats[state.player].name;
  ui.rivalName.textContent = cats[state.rival].name;
  ui.playerScore.textContent = state.playerScore;
  ui.rivalScore.textContent = state.rivalScore;
  ui.turnLabel.textContent = `${activeSideLabel(state.servingSide)} ${state.rally ? "returns" : "serves"}`;
  ui.moveLabel.textContent = moveText;
  ui.scoreCards[0].classList.toggle("is-active", state.servingSide === "player");
  ui.scoreCards[1].classList.toggle("is-active", state.servingSide === "rival");
  ui.soloMode.classList.toggle("is-active", state.mode === "solo");
  ui.versusMode.classList.toggle("is-active", state.mode === "versus");
  ui.pickPlayer.classList.toggle("is-active", state.pickingSide === "player");
  ui.pickRival.classList.toggle("is-active", state.pickingSide === "rival");
  ui.moves.forEach((button) => {
    button.disabled = state.busy;
  });
}

function activeSideLabel(side) {
  const prefix = side === "player" ? "Player 1" : state.mode === "versus" ? "Player 2" : "Opponent";
  const cat = side === "player" ? cats[state.player] : cats[state.rival];
  return `${prefix}: ${cat.name}`;
}

function shotConfig(shot) {
  const base = {
    serve: { height: 4.7, curve: 0.05, speed: 930, label: "Clean serve" },
    topspin: { height: 3.4, curve: 1.35, speed: 850, label: "Topspin rally" },
    lob: { height: 6.4, curve: -0.45, speed: 1120, label: "High lob" },
    slice: { height: 2.85, curve: -1.2, speed: 780, label: "Low slice" },
  };
  return base[shot] || base.serve;
}

function animateHit(avatar, intensity = 1) {
  avatar.group.userData.pulse = Math.max(avatar.group.userData.pulse || 0, intensity);
}

function playShot(shot, forcedSide = null) {
  if (state.busy) return;
  state.busy = true;
  updateUi(shotConfig(shot).label);

  const fromSide = forcedSide || state.servingSide;
  const fromZ = fromSide === "player" ? 7.2 : -7.2;
  const toZ = fromSide === "player" ? -7.2 : 7.2;
  const fromX = fromSide === "player" ? -2.2 : 2.2;
  const receiverX = fromSide === "player" ? 2.4 : -2.4;
  const cfg = shotConfig(shot);
  const cat = fromSide === "player" ? cats[state.player] : cats[state.rival];
  const avatar = fromSide === "player" ? playerAvatar : rivalAvatar;
  const targetAvatar = fromSide === "player" ? rivalAvatar : playerAvatar;
  const targetX = THREE.MathUtils.clamp(receiverX + cfg.curve + (Math.random() - 0.5) * 1.4, -5.4, 5.4);
  const start = new THREE.Vector3(fromX, 0.54, fromZ);
  const end = new THREE.Vector3(targetX, 0.62, toZ);
  const apex = cfg.height + cat.power * 1.2;
  const duration = cfg.speed - cat.power * 160;
  const startTime = performance.now();
  animateHit(avatar, 1.2);
  makeTrail(start, end, apex, cfg.curve);

  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const pos = bezier(start, new THREE.Vector3((start.x + end.x) / 2 + cfg.curve, apex, 0), end, ease);
    ball.position.copy(pos);
    ball.rotation.x += 0.18 + cat.power * 0.08;
    ball.rotation.z += 0.12;
    ballGlow.position.copy(ball.position);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pos.x * 0.08, 0.025);
    camera.lookAt(0, 0.8, 0);

    if (t < 1) {
      requestAnimationFrame(step);
      return;
    }

    animateHit(targetAvatar, 0.72);
    resolveShot(fromSide, shot, targetX);
  }

  requestAnimationFrame(step);
}

function bezier(a, b, c, t) {
  const ab = a.clone().lerp(b, t);
  const bc = b.clone().lerp(c, t);
  return ab.lerp(bc, t);
}

function makeTrail(start, end, apex, curve) {
  if (trail) scene.remove(trail);
  const points = [];
  const control = new THREE.Vector3((start.x + end.x) / 2 + curve, apex, 0);
  for (let i = 0; i <= 28; i += 1) {
    points.push(bezier(start, control, end, i / 28));
  }
  trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), trailMaterial);
  scene.add(trail);
}

function resolveShot(fromSide, shot, targetX) {
  const playerPower = cats[state.player].power;
  const rivalPower = cats[state.rival].power;
  const attackerPower = fromSide === "player" ? playerPower : rivalPower;
  const receiverPower = fromSide === "player" ? rivalPower : playerPower;
  const shotBonus = { serve: 0.08, topspin: 0.04, lob: -0.01, slice: 0.02 }[shot] || 0;
  const pressure = Math.abs(targetX) / 8;
  const chance = 0.56 + attackerPower * 0.28 + shotBonus + pressure * 0.08 - receiverPower * 0.2;
  const scored = Math.random() < chance || state.rally > 4 + Math.round(receiverPower * 3);
  state.rally += 1;

  setTimeout(() => {
    if (scored) {
      if (fromSide === "player") state.playerScore += 1;
      else state.rivalScore += 1;
      state.servingSide = fromSide === "player" ? "rival" : "player";
      state.rally = 0;
      state.busy = false;
      setBallForServer();
      updateUi(`${fromSide === "player" ? cats[state.player].name : cats[state.rival].name} wins the point`);
      celebrate(fromSide);
      return;
    }

    state.busy = false;
    const receiverSide = fromSide === "player" ? "rival" : "player";
    state.servingSide = receiverSide;
    updateUi(`${activeSideLabel(receiverSide)} returns`);
    if (state.mode === "solo") {
      const nextShot = ["topspin", "slice", "lob"][Math.floor(Math.random() * 3)];
      setTimeout(() => playShot(nextShot, receiverSide), 420);
    }
  }, 320);
}

function celebrate(side) {
  const avatar = side === "player" ? playerAvatar : rivalAvatar;
  avatar.group.userData.celebrate = 1.4;
  if (state.playerScore >= 7 || state.rivalScore >= 7) {
    const winner = state.playerScore > state.rivalScore ? cats[state.player].name : cats[state.rival].name;
    ui.moveLabel.textContent = `${winner} wins the Friendship Cup`;
    state.playerScore = 0;
    state.rivalScore = 0;
    setTimeout(() => updateUi("New match"), 1600);
  }
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
}

function animate() {
  const elapsed = clock.getElapsedTime();
  const delta = clock.getDelta();

  [playerAvatar, rivalAvatar].forEach((avatar, index) => {
    const sidePulse = Math.sin(elapsed * 2.2 + index) * 0.035;
    avatar.body.position.y = 1.35 + sidePulse;
    avatar.head.rotation.y = Math.sin(elapsed * 1.5 + index) * 0.1;
    avatar.tail.rotation.z = 1.15 + Math.sin(elapsed * 3 + index) * 0.18;
    avatar.racket.rotation.z = Math.sin(elapsed * 1.8 + index) * 0.08;

    if (avatar.group.userData.pulse) {
      avatar.racket.rotation.z += avatar.group.userData.pulse * 0.55;
      avatar.group.position.y = Math.sin(avatar.group.userData.pulse * Math.PI) * 0.18;
      avatar.group.userData.pulse = Math.max(0, avatar.group.userData.pulse - delta * 2.6);
    }

    if (avatar.group.userData.celebrate) {
      avatar.group.position.y = Math.abs(Math.sin(elapsed * 10)) * 0.36;
      avatar.group.rotation.z = Math.sin(elapsed * 8) * 0.04;
      avatar.group.userData.celebrate = Math.max(0, avatar.group.userData.celebrate - delta);
      if (!avatar.group.userData.celebrate) {
        avatar.group.position.y = 0;
        avatar.group.rotation.z = 0;
      }
    }
  });

  orbs.forEach(({ orb, glow }, index) => {
    orb.position.y = 0.68 + Math.sin(elapsed * 1.7 + index) * 0.08;
    glow.position.copy(orb.position);
  });

  ballGlow.intensity = 1.6 + Math.sin(elapsed * 6) * 0.25;
  court.rotation.y = Math.sin(elapsed * 0.16) * 0.012;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

ui.moves.forEach((button) => {
  button.addEventListener("click", () => playShot(button.dataset.shot));
});

ui.soloMode.addEventListener("click", () => {
  if (state.busy) return;
  state.mode = "solo";
  updateUi("Solo opponent active");
  renderRoster();
});

ui.versusMode.addEventListener("click", () => {
  if (state.busy) return;
  state.mode = "versus";
  updateUi("Two Player match active");
  renderRoster();
});

ui.pickPlayer.addEventListener("click", () => {
  if (state.busy) return;
  state.pickingSide = "player";
  updateUi("Choose Player 1 cat");
  renderRoster();
});

ui.pickRival.addEventListener("click", () => {
  if (state.busy) return;
  state.pickingSide = "rival";
  updateUi("Choose Player 2 cat");
  renderRoster();
});

canvas.addEventListener("pointerdown", (event) => {
  if (state.busy) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(floorTarget)[0];
  const shot = hit && Math.abs(hit.point.x) > 3.8 ? "slice" : hit && Math.abs(hit.point.z) < 3 ? "lob" : "serve";
  playShot(shot);
});

window.addEventListener("resize", resize);
renderRoster();
updateUi();
resize();
animate();
