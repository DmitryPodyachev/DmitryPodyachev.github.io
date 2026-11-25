// Signalling server for the video call app (mobile_v8), runs behind nginx on the owner's server.
//   /zoom/peerjs/...  – PeerJS server (WebSocket + /peerjs/id), replaces the public 0.peerjs.com
//                       (0.peerjs.com answers 403 to Russian IPs).
//   /zoom/turn        – short-lived TURN credentials for coturn (use-auth-secret / REST API scheme),
//                       so the TURN password is never in the public JS.
// Env: BIND (127.0.0.1; 0.0.0.0 in docker), PORT (9000), TURN_SECRET (same as static-auth-secret in turnserver.conf), TURN_HOST (public host name),
//      ORIGINS (comma separated, allowed for CORS on /zoom/turn).
"use strict";
const crypto = require("crypto");
const express = require("express");
const { ExpressPeerServer } = require("peer");

const PORT = Number(process.env.PORT || 9000);
const TURN_SECRET = process.env.TURN_SECRET || "";
const TURN_HOST = process.env.TURN_HOST || "";
const ORIGINS = (process.env.ORIGINS || "https://dmitrypodyachev.github.io").split(",").map((s) => s.trim()).filter(Boolean);
const TTL = 12 * 3600;
const BIND = process.env.BIND || "127.0.0.1";   // 0.0.0.0 inside docker

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", "loopback");

app.get("/zoom/turn", (req, res) => {
  const o = req.get("Origin");
  if (o && ORIGINS.includes(o)) res.set({ "Access-Control-Allow-Origin": o, Vary: "Origin" });
  res.set("Cache-Control", "no-store");
  if (!TURN_SECRET || !TURN_HOST) return res.json({ iceServers: [] });
  // уникальное имя на каждую выдачу: квота coturn (user-quota) считается по имени пользователя
  const username = Math.floor(Date.now() / 1000) + TTL + ":" + crypto.randomBytes(6).toString("hex");
  const credential = crypto.createHmac("sha1", TURN_SECRET).update(username).digest("base64");
  res.json({ ttl: TTL, iceServers: [{
    urls: ["turn:" + TURN_HOST + ":3478?transport=udp", "turn:" + TURN_HOST + ":3478?transport=tcp"],
    username, credential
  }] });
});
app.get("/zoom/signal-health", (req, res) => res.json({ ok: true, t: Date.now() }));

const server = app.listen(PORT, BIND, () => console.log("zoom-signal on " + BIND + ":" + PORT));
app.use("/zoom/peerjs", ExpressPeerServer(server, { path: "/", proxied: true, allow_discovery: false, alive_timeout: 60000 }));
