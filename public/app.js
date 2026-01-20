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

  const REGALO_VENTANA_MS = 600;

  const combosActivos = new Map();
  const chatsProcesados = new Map();

  let volumenActual = 0.3;
  let totalLikes = 0;
  let audioActivado = localStorage.getItem("audioActivado") === "true";

  if (audioActivado && estadoEl) {
    estadoEl.innerText = "Estado: 🔊 sonido ACTIVADO";
  }

  // ===============================
  // 🌐 WEBSOCKET (RENDER / LOCAL)
  // ===============================
  const protocolo = location.protocol === "https:" ? "wss" : "ws";
  let ws;

  function conectarWS() {
    ws = new WebSocket(`${protocolo}://${location.host}/ws`);

    ws.onopen = () => {
      if (conexionEl) conexionEl.innerText = "🟢 Conectado al servidor";
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

  // 🎯 REGALOS QUE NO SON COMBO
  const regalosSinCombo = new Set([
    "heartme"
  ]);

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
  // 🔊 REPRODUCIR REGALO (SIMPLE)
  // ===============================
  function reproducirRegalo(giftName, veces = 1) {
    const sonido = giftSounds[giftName];
    if (!audioActivado || !sonido) return;

    for (let i = 0; i < veces; i++) {
      colaSonidos.push(sonido);
    }
    procesarColaSonidos();
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

    // ===============================
    // 🎁 REGALOS
    // ===============================
    if (data.gift) {
      const rawGift = typeof data.gift === "string"
        ? data.gift
        : data.gift.name || "";

      const giftName = rawGift.replace(/\s+/g, "").toLowerCase();

      // 👉 REGALOS SIN COMBO (heartme)
      if (regalosSinCombo.has(giftName)) {
        contadorRegalos[giftName] =
          (contadorRegalos[giftName] || 0) + 1;

        actualizarRegalosUI();
        reproducirRegalo(giftName, 1);
        return;
      }

      // 👉 REGALOS CON COMBO
      const user = data.user || "anon";
      const key = `${user}|${giftName}`;
      const ahora = Date.now();

      let combo = combosActivos.get(key);
      if (!combo) {
        combo = { cantidad: 0, timer: null };
      }

      combo.cantidad += 1;

      if (combo.timer) clearTimeout(combo.timer);

      combo.timer = setTimeout(() => {
        contadorRegalos[giftName] =
          (contadorRegalos[giftName] || 0) + combo.cantidad;

        actualizarRegalosUI();
        reproducirRegalo(giftName, combo.cantidad);
        combosActivos.delete(key);
      }, REGALO_VENTANA_MS);

      combosActivos.set(key, combo);
    }

    // ❤️ LIKES
    if (data.type === "likes") {
      totalLikes = data.total;
      likesEl.innerText = `❤️ Likes: ${totalLikes}`;
    }

    // 💬 CHAT
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
  // 🔌 CONECTAR USUARIO
  // ===============================
  window.conectar = function () {
    const user = document.getElementById("user").value.trim();
    if (!user) return alert("Ingresa un usuario de TikTok");
    ws.send(JSON.stringify({ type: "set-user", user }));
    conexionEl.innerText = `🟢 Conectado a @${user}`;
  };

});

