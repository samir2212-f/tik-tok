const express = require("express");
const { WebcastPushConnection } = require("tiktok-live-connector");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public"));

const server = app.listen(3000, () => {
  console.log("Servidor activo en http://localhost:3000");
});

const wss = new WebSocket.Server({ server });

// 🔗 conexión dinámica a TikTok
let tiktok = null;

// 🖤 CONTADOR DE LIKES
let totalLikes = 0;
let nextMilestone = 1000; // cada 1000 likes

// 📢 enviar a todos los clientes
function broadcast(msg) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(msg));
    }
  });
}

// 🔌 CLIENTES WEBSOCKET
wss.on("connection", ws => {

  // enviar likes actuales al conectarse
  ws.send(JSON.stringify({ type: "likes", total: totalLikes }));

  ws.on("message", async message => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    // 👤 SETEAR USUARIO TIKTOK DESDE EL FRONT
    if (data.type === "set-user") {
      const user = data.user;
      console.log("🔄 Conectando a TikTok:", user);

      // reset likes
      totalLikes = 0;
      nextMilestone = 1000;

      // cerrar conexión anterior
      if (tiktok) {
        try {
          tiktok.disconnect();
        } catch {}
      }

      // crear nueva conexión
      tiktok = new WebcastPushConnection(user);

      // 🎁 REGALOS
      tiktok.on("gift", gift => {
        console.log("🎁 Regalo:", gift.giftName);
        broadcast({
          gift: gift.giftName,
          user: gift.uniqueId
        });
      });

      // 💬 CHAT
      tiktok.on("chat", chat => {
        console.log("💬 Chat:", chat.nickname, chat.comment);
        broadcast({
          type: "chat",
          user: chat.nickname,
          message: chat.comment
        });
      });

      // ❤️ LIKES
      tiktok.on("like", like => {
        totalLikes += like.likeCount || 1;

        broadcast({
          type: "likes",
          total: totalLikes
        });

        if (totalLikes >= nextMilestone) {
          console.log(`🎵 ${nextMilestone} likes alcanzados`);
          broadcast({
            type: "likes-sound",
            milestone: nextMilestone
          });
          nextMilestone += 1000;
        }
      });

      try {
        await tiktok.connect();
        console.log("✅ Conectado a TikTok:", user);
      } catch (err) {
        console.error("❌ Error TikTok:", err);
      }
    }
  });
});
