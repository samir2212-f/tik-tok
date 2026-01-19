const express = require("express");
const { WebcastPushConnection } = require("tiktok-live-connector");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public"));

// ⚠️ IMPORTANTE PARA RENDER
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log("Servidor activo en puerto", PORT);
});

const wss = new WebSocket.Server({ server });

// 🔗 conexión dinámica a TikTok
let tiktok = null;

// 🖤 CONTADOR DE LIKES
let totalLikes = 0;
let nextMilestone = 1000; // cada 1000 likes

// 📢 enviar a todos los clientes
function broadcast(msg) {
  const data = JSON.stringify(msg);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// ===============================
// 🔌 CLIENTES WEBSOCKET
// ===============================
wss.on("connection", ws => {

  console.log("🟢 Cliente conectado");

  // enviar likes actuales
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
      const user = data.user?.trim();

      if (!user) return;

      console.log("🔄 Conectando a TikTok:", user);

      // reset likes
      totalLikes = 0;
      nextMilestone = 1000;

      // 🔴 cerrar conexión anterior
      if (tiktok) {
        try {
          tiktok.disconnect();
        } catch {}
        tiktok = null;
      }

      // 🟢 nueva conexión
      tiktok = new WebcastPushConnection(user);

      // 🎁 REGALOS
      tiktok.on("gift", gift => {

  // ⚠️ ignorar eventos intermedios
  if (!gift.repeatEnd) return;

  console.log(
    `🎁 Regalo FINAL: ${gift.giftName} x${gift.repeatCount}`
  );

  broadcast({
    type: "gift",
    gift: gift.giftName,
    count: gift.repeatCount || 1,
    user: gift.uniqueId
  });
});


      // 💬 CHAT
      tiktok.on("chat", chat => {
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

        // avisar al front
        broadcast({
          type: "status",
          message: `Conectado a @${user}`
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

