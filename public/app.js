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
  const REGALO_VENTANA_MS = 550;
  const combosActivos = new Map();
  const chatsProcesados = new Map();

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
// 🎁 REGALOS (COMBOS REALES SIN DUPLICADOS)
if (data.gift) {
  const rawGift =
  typeof data.gift === "string"
    ? data.gift
    : data.gift.name || "";

const giftName = rawGift.replace(/\s+/g, "").toLowerCase();

  const key = `${data.user}|${giftName}`;
  const ahora = Date.now();

  let combo = combosActivos.get(key);

  if (!combo) {
    combo = {
      cantidad: 0,
      timer: null,
      ultimoEvento: 0
    };
  }

  // Ignorar evento espejo (muy separado)
  if (ahora - combo.ultimoEvento > REGALO_VENTANA_MS && combo.cantidad > 0) {
    combo.cantidad = 0;
  }

  combo.ultimoEvento = ahora;
  combo.cantidad += 1;

  // Reiniciar temporizador del combo
  if (combo.timer) clearTimeout(combo.timer);

  combo.timer = setTimeout(() => {
    // 👉 AQUÍ SE CONFIRMA EL COMBO
    contadorRegalos[giftName] =
      (contadorRegalos[giftName] || 0) + combo.cantidad;
    actualizarRegalosUI();

    for (let i = 0; i < combo.cantidad; i++) {
      if (giftSounds[giftName]) {
        colaSonidos.push(giftSounds[giftName]);
      }
    }
    procesarColaSonidos();

    combosActivos.delete(key);
  }, REGALO_VENTANA_MS);

  combosActivos.set(key, combo);
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







