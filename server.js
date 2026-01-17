const express = require("express");
const { WebcastPushConnection } = require("tiktok-live-connector");
const WebSocket = require("ws");

const TIKTOK_USER = "djnenebaltimore"; 

const app = express();
app.use(express.static("public"));

const server = app.listen(3000, () => {
  console.log("Servidor activo en http://localhost:3000");
});

const wss = new WebSocket.Server({ server });

const tiktok = new WebcastPushConnection(TIKTOK_USER);

tiktok.connect()
  .then(() => console.log("✅ Conectado a TikTok Live"))
  .catch(err => console.error("❌ Error TikTok:", err));

// 🎁 REGALOS
tiktok.on("gift", data => {
  console.log("🎁 Regalo:", data.giftName);

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        gift: data.giftName
      }));
    }
  });
});

// 💬 CHAT (ESTO ES LO NUEVO)
tiktok.on("chat", data => {
  console.log("💬 Chat:", data.nickname, data.comment);

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "chat",
        user: data.nickname,
        message: data.comment
      }));
    }
  });
});
