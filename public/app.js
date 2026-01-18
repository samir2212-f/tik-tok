document.addEventListener("DOMContentLoaded", () => {

  // ===============================
  // 🌐 WEBSOCKET (LOCAL / RENDER)
  // ===============================
  const protocolo = location.protocol === "https:" ? "wss" : "ws";
  let ws;

  const conexionEl = document.getElementById("conexion");
  const estadoEl = document.getElementById("estado");
  const likesEl = document.getElementById("likes");

  function conectarWS() {
    ws = new WebSocket(`${protocolo}://${location.host}`);

    ws.onopen = () => {
      console.log("🟢 WebSocket conectado");
      if (conexionEl) conexionEl.innerText = "🟢 Conectado al servidor";
    };

    ws.onclose = () => {
      console.log("🔴 WebSocket cerrado, reintentando...");
      if (conexionEl) conexionEl.innerText = "🔴 Desconectado";
      setTimeout(conectarWS, 3000);
    };

    ws.onerror = () => ws.close();

    ws.onmessage = manejarMensaje;
  }

  conectarWS();

  // ===============================
  // 🧬 ANTI DUPLICADOS
  // ===============================
  const regalosProcesados = new Map();
  const REGALO_VENTANA_MS = 400;

  setInterval(() => {
    const ahora = Date.now();
    for (const [k, t] of regalosProcesados) {
      if (ahora - t > 5000) regalosProcesados.delete(k);
    }
  }, 5000);

  // ===============================
  // 🔊 ESTADO
  // ===============================
  let audioActivado = localStorage.getItem("audioActivado") === "true";
  let totalLikes = 0;

  if (audioActivado && estadoEl) {
    estadoEl.innerText = "Estado: 🔊 sonido ACTIVADO";
  }

  // ===============================
  // 🗣️ VOCES
  // ===============================
  let vocesDisponibles = [];
  speechSynthesis.onvoiceschanged = () => {
    vocesDisponibles = speechSynthesis.getVoices();
  };

  // ===============================
  // 🎁 SONIDOS
  // ===============================
  const giftSounds = {
    rose: "/sounds/Rose.mp3",
    heartme: "/sounds/Heart.mp3",
    perfume: "/sounds/perfume.mp3",
    bearlove: "/sounds/Bearlove.mp3",
    mishkateddybear: "/sounds/Bearlove.mp3",
    mishkabear: "/sounds/Bearlove.mp3",
    moneygun: "/sounds/MoneyGun.mp3",
    papercrane: "/sounds/PaperCrane.mp3",
    doughnut: "/sounds/Doughnut.mp3",
    corgi: "/sounds/Corgi.mp3",
    confetti: "/sounds/Confetti.mp3",
    fingerheart: "/sounds/FingerHeart.mp3",
    loveyou: "/sounds/LoveYou.mp3",
    handheart: "/sounds/HandHeart.mp3",
    bffnecklace: "/sounds/bffnecklace.mp3",
    rosa: "/sounds/Rosa.mp3",
    hearts: "/sounds/Hearts.mp3",
    coral: "/sounds/Coral.mp3",
    loveyousomuch: "/sounds/Loveyousomuch.mp3",
    hatandmustache: "/sounds/HatandMustache.mp3",
    gorra: "/sounds/Gorra.mp3",
    whalediving: "/sounds/Whalediving.mp3",
    likes: "/sounds/Likes.mp3"
  };

  // ===============================
  // 🧹 LIMPIAR TEXTO
  // ===============================
  function limpiarTexto(texto) {
    return texto
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
      .replace(/[^\p{L}\p{N}\s.,!?]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ===============================
  // 🔊 COLA DE VOZ
  // ===============================
  let colaVoz = [];
  let hablando = false;

  function procesarColaVoz() {
    if (!audioActivado || hablando || colaVoz.length === 0) return;

    hablando = true;
    const texto = colaVoz.shift();
    const voz = new SpeechSynthesisUtterance(texto);

    const vozEsp = vocesDisponibles.find(v => v.lang.startsWith("es"));
    if (vozEsp) voz.voice = vozEsp;

    voz.onend = () => {
      hablando = false;
      setTimeout(procesarColaVoz, 200);
    };

    voz.onerror = () => {
      hablando = false;
      speechSynthesis.cancel();
      setTimeout(procesarColaVoz, 500);
    };

    speechSynthesis.speak(voz);
  }

  // ===============================
  // 🔊 COLA DE SONIDOS
  // ===============================
  let colaSonidos = [];
  let sonidoReproduciendo = false;

  function procesarColaSonidos() {
    if (!audioActivado || sonidoReproduciendo || colaSonidos.length === 0) return;

    sonidoReproduciendo = true;
    const sonidoUrl = colaSonidos.shift();
    const audio = new Audio(sonidoUrl);
    audio.volume = 0.3;

    audio.onended = () => {
      sonidoReproduciendo = false;
      setTimeout(procesarColaSonidos, 80);
    };

    audio.onerror = () => {
      sonidoReproduciendo = false;
      setTimeout(procesarColaSonidos, 80);
    };

    audio.play().catch(() => {
      sonidoReproduciendo = false;
    });
  }

  // ===============================
  // 📡 MENSAJES DEL SERVIDOR
  // ===============================
  function manejarMensaje(event) {
    const data = JSON.parse(event.data);

    // 🎁 REGALOS
    if (data.gift) {
      const giftName = data.gift.replace(/\s+/g, "").toLowerCase();
      const sonidoUrl = giftSounds[giftName];

      if (sonidoUrl) {
        const firma = `${data.user}|${giftName}`;
        const ahora = Date.now();
        const ultimo = regalosProcesados.get(firma) || 0;

        if (ahora - ultimo >= REGALO_VENTANA_MS) {
          regalosProcesados.set(firma, ahora);
          colaSonidos.push(sonidoUrl);
          procesarColaSonidos();
        }
      }
    }

    // ❤️ LIKES
    if (data.type === "likes") {
      totalLikes = data.total;
      if (likesEl) likesEl.innerText = `❤️ Likes: ${totalLikes}`;
    }

    // 🔊 LIKES SOUND
    if (data.type === "likes-sound" && audioActivado) {
      colaSonidos.push(giftSounds.likes);
      procesarColaSonidos();
    }

    // 💬 CHAT (ANTI DUPLICADO)
    if (data.type === "chat") {
      const firma = `${data.user}|${data.message}`;
      const ahora = Date.now();
      const ultimo = regalosProcesados.get(firma) || 0;

      if (ahora - ultimo > 800) {
        regalosProcesados.set(firma, ahora);
        const texto = limpiarTexto(`${data.user} dice ${data.message}`);
        if (texto) {
          colaVoz.push(texto);
          procesarColaVoz();
        }
      }
    }
  }

  // ===============================
  // 🔓 ACTIVAR SONIDO
  // ===============================
  window.activarSonido = function () {
    const testAudio = new Audio("/sounds/Rose.mp3");

    testAudio.play().then(() => {
      testAudio.pause();
      audioActivado = true;
      localStorage.setItem("audioActivado", "true");

      colaVoz = [];
      colaSonidos = [];
      hablando = false;
      sonidoReproduciendo = false;

      speechSynthesis.speak(
        new SpeechSynthesisUtterance("Sonido activado correctamente")
      );

      if (estadoEl) estadoEl.innerText = "Estado: 🔊 sonido ACTIVADO";
    });
  };

  // ===============================
  // 🔗 CONECTAR USUARIO
  // ===============================
  window.conectar = function () {
    const input = document.getElementById("user");
    const user = input.value.trim();

    if (!user) {
      alert("Ingresa un usuario de TikTok");
      return;
    }

    ws.send(JSON.stringify({
      type: "set-user",
      user
    }));

    if (conexionEl) conexionEl.innerText = `🟢 Conectado a @${user}`;
  };

});
