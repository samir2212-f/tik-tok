const express = require("express");
const { WebcastPushConnection } = require("tiktok-live-connector");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public"));

// ⚠️ Render / Local
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log("🚀 Servidor activo en puerto", PORT);
});

const wss = new WebSocket.Server({ server });

// ===============================
// 🔗 TIKTOK (variables globales)
// ===============================
let tiktok = null;
let currentUser = null;

// ❤️ LIKES
let totalLikes = 0;
let nextMilestone = 5000; // 🔊 sonido cada 5000 likes

// ===============================
// 📢 BROADCAST
// ===============================
function broadcast(msg) {
  const data = JSON.stringify(msg);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// ===============================
// 🔌 WEBSOCKET CLIENTES
// ===============================
wss.on("connection", ws => {
  console.log("🟢 Cliente conectado");

  // enviar likes actuales al conectar
  ws.send(JSON.stringify({ type: "likes", total: totalLikes }));

  ws.on("message", async message => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    // ===============================
    // 👤 SET USER
    // ===============================
    if (data.type === "set-user") {
      const user = data.user?.trim();
      if (!user) return;

      // evitar reconectar al mismo usuario
      if (currentUser === user && tiktok) return;

      currentUser = user;

      // reset likes
      totalLikes = 0;
      nextMilestone = 5000;

      console.log("🔄 Conectando a TikTok:", user);

      // 🔴 cerrar conexión anterior
      if (tiktok) {
        try {
          tiktok.disconnect();
        } catch {}
        tiktok = null;
      }

      // 🟢 nueva conexión
      tiktok = new WebcastPushConnection(user, {
        enableExtendedGiftInfo: true
      });

      // ===============================
      // 🎁 REGALOS (ANTI DUPLICADO REAL)
      // ===============================
      tiktok.on("gift", gift => {
        if (!gift.repeatEnd) return;

        broadcast({
          type: "gift",
          gift: gift.giftName,
          count: gift.repeatCount || 1,
          user: gift.uniqueId
        });
      });

      // ===============================
      // 💬 CHAT
      // ===============================
      tiktok.on("chat", chat => {
        broadcast({
          type: "chat",
          user: chat.nickname,
          message: chat.comment
        });
      });

      // ===============================
      // ❤️ LIKES (ÚNICO LISTENER)
      // ===============================
      tiktok.on("like", like => {
        totalLikes += like.likeCount || 1;

        // enviar contador
        broadcast({
          type: "likes",
          total: totalLikes
        });

        // 🔊 sonido cada 5000 likes
        if (totalLikes >= nextMilestone) {
          broadcast({
            type: "likes-sound",
            milestone: nextMilestone
          });

          nextMilestone += 5000;
        }
      });

      // ===============================
      // 🔴 TIKTOK DESCONECTADO
      // ===============================
      tiktok.on("disconnected", () => {
        console.log("🔴 TikTok desconectado");
        broadcast({
          type: "tiktok-status",
          connected: false
        });
      });

      // ===============================
      // ⚠️ STREAM TERMINADO
      // ===============================
      tiktok.on("streamEnd", () => {
        console.log("⚠️ Live terminado");
        broadcast({
          type: "tiktok-status",
          connected: false
        });
      });

      // ===============================
      // 🔌 CONECTAR
      // ===============================
      try {
        await tiktok.connect();

        console.log("✅ Conectado a TikTok:", user);

        broadcast({
          type: "tiktok-status",
          connected: true,
          user
        });

      } catch (err) {
        console.error("❌ Error TikTok:", err);
        ws.send(JSON.stringify({
          type: "error",
          message: "No se pudo conectar al live"
        }));
      }
    }
  });

  ws.on("close", () => {
    console.log("🔴 Cliente desconectado");
  });
});
