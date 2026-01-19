document.addEventListener("DOMContentLoaded", () => {

  // ===============================
  // 📊 UI ELEMENTOS
  // ===============================
  const estadoTikTokEl = document.getElementById("estadoTikTok");
  const volumenEl = document.getElementById("volumen");
  const regalosListaEl = document.getElementById("regalosLista");
  const conexionEl = document.getElementById("conexion");
  const estadoEl = document.getElementById("estado");
  const likesEl = document.getElementById("likes");

  let volumenActual = 0.3;
  let totalLikes = 0;
  let audioActivado = localStorage.getItem("audioActivado") === "true";

  if (audioActivado && estadoEl) {
    estadoEl.innerText = "Estado: 🔊 sonido ACTIVADO";
  }

  // ===============================
  // 🌐 WEBSOCKET (LOCAL / RENDER)
  // ===============================
  const protocolo = location.protocol === "https:" ? "wss" : "ws";
  let ws;

 function conectarWS() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  ws = new WebSocket(`${protocolo}://${location.host}`);

  ws.onopen = () => {
    conexionEl.innerText = "🟢 Conectado al servidor";
  };


    ws.onclose = () => {
      if (conexionEl) conexionEl.innerText = "🔴 Desconectado";
      setTimeout(conectarWS, 3000);
    };

    ws.onerror = () => ws.close();
    ws.onmessage = manejarMensaje;
  }

  conectarWS();

  // ===============================
  // 🎚 VOLUMEN
  // ===============================
  if (volumenEl) {
    volumenEl.value = volumenActual;
    volumenEl.addEventListener("input", () => {
      volumenActual = parseFloat(volumenEl.value);
    });
  }

  // ===============================
  // 🧬 ANTI DUPLICADOS
  // ===============================
  const regalosProcesados = new Map();
  const chatsProcesados = new Map();
  const REGALO_VENTANA_MS = 800;

  setInterval(() => {
    const ahora = Date.now();
    for (const [k, t] of regalosProcesados) {
      if (ahora - t > 5000) regalosProcesados.delete(k);
    }
    for (const [k, t] of chatsProcesados) {
      if (ahora - t > 5000) chatsProcesados.delete(k);
    }
  }, 5000);

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
  // 📊 CONTADOR DE REGALOS
  // ===============================
  const contadorRegalos = {};

  function actualizarRegalosUI() {
    regalosListaEl.innerHTML = "";
    Object.entries(contadorRegalos).forEach(([regalo, cantidad]) => {
      const div = document.createElement("div");
      div.innerText = `🎁 ${regalo}: ${cantidad}`;
      regalosListaEl.appendChild(div);
    });
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
    const audio = new Audio(colaSonidos.shift());
    audio.volume = volumenActual;

    audio.onended = audio.onerror = () => {
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

    // 🔴🟢 ESTADO TIKTOK
    if (data.type === "tiktok-status") {
      estadoTikTokEl.innerText = data.connected
        ? "🟢 TikTok: conectado"
        : "🔴 TikTok: desconectado";
      return;
    }

    // 🎁 REGALOS
    if (data.gift) {
      const giftName = data.gift.replace(/\s+/g, "").toLowerCase();
      contadorRegalos[giftName] = (contadorRegalos[giftName] || 0) + 1;
      actualizarRegalosUI();

      const sonidoUrl = giftSounds[giftName];
      if (!sonidoUrl) return;

     const repeat = data.repeatCount || 1;
    const firma = `${data.user}|${giftName}|${repeat}`;

      const ahora = Date.now();
      const ultimo = regalosProcesados.get(firma) || 0;

      if (ahora - ultimo >= REGALO_VENTANA_MS) {
        regalosProcesados.set(firma, ahora);
        colaSonidos.push(sonidoUrl);
        procesarColaSonidos();
      }
    }

    // ❤️ LIKES
    if (data.type === "likes") {
      totalLikes = data.total;
      likesEl.innerText = `❤️ Likes: ${totalLikes}`;
    }

    if (data.type === "likes-sound" && audioActivado) {
      colaSonidos.push(giftSounds.likes);
      procesarColaSonidos();
    }

    // 💬 CHAT (ANTI DUPLICADO)
    if (data.type === "chat") {
      const firma = `${data.user}|${data.message}`;
      const ahora = Date.now();
      const ultimo = chatsProcesados.get(firma) || 0;

      if (ahora - ultimo > 800) {
        chatsProcesados.set(firma, ahora);
        colaVoz.push(`${data.user} dice ${data.message}`);
        procesarColaVoz();
      }
    }
  }

  // ===============================
  // 🔓 ACTIVAR SONIDO
  // ===============================
  window.activarSonido = function () {
    const test = new Audio("/sounds/Rose.mp3");
    test.play().then(() => {
      test.pause();
      audioActivado = true;
      localStorage.setItem("audioActivado", "true");
      estadoEl.innerText = "Estado: 🔊 sonido ACTIVADO";
    });
  };

  // ===============================
  // 🔗 CONECTAR USUARIO
  // ===============================
  window.conectar = function () {
    const user = document.getElementById("user").value.trim();
    if (!user) return alert("Ingresa un usuario de TikTok");

    ws.send(JSON.stringify({ type: "set-user", user }));
    conexionEl.innerText = `🟢 Conectado a @${user}`;
  };

});


