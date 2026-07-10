# Cat Teiness Multiplayer Backend

This is a tiny privacy-safe room server for Cat Teiness 3D.

It stores only temporary game data in memory:

- room code
- Player 1 / Player 2 score
- whose turn it is
- rally count
- ball position
- last shot data

It does not store names, passwords, accounts, cookies, or persistent database records.
Rooms expire after two hours of inactivity and are lost whenever the server restarts.

## Local Run

```bash
npm start
```

The default local URL is:

```text
http://127.0.0.1:8787
```

Paste that URL into the game's `Backend URL` field, then create or join a room.

## Public Hosting

GitHub Pages can host the static game, but it cannot run this backend. Host this
folder separately on a Node-capable host such as Render, Fly.io, Railway, or a
small VPS.

Use the public backend URL in the game's `Backend URL` field. Do not put API
keys or passwords in the frontend code.

## Render Settings

- Service type: Web Service
- Root directory: `outputs/cat-teiness-3d/backend`
- Build command: `npm install`
- Start command: `npm start`
