document.addEventListener("DOMContentLoaded", () => {

  // ===============================
  // 📊 UI
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

  if (audioActivado) {
    estadoEl.innerText = "Estado: 🔊 sonido ACTIVADO";
  }

  // ===============================
  // 🌐 WEBSOCKET
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
      conexionEl.innerText = "🔴 Desconectado";
      setTimeout(conectarWS, 3000);
    };

    ws.onerror = () => ws.close();
    ws.onmessage = manejarMensaje;
  }

  conectarWS();

  // ===============================
  // 🎚 VOLUMEN
  // ===============================
  volumenEl.value = volumenActual;
  volumenEl.addEventListener("input", () => {
    volumenActual = parseFloat(volumenEl.value);
  });

  // ===============================
  // 🧬 ANTI DUPLICADOS
  // ===============================
  const regalosProcesados = new Map();
  const chatsProcesados = new Map();
  const REGALO_VENTANA_MS = 2500;

  setInterval(() => {
    const ahora = Date.now();
    for (const [k, t] of regalosProcesados)
      if (ahora - t > 15000) regalosProcesados.delete(k);

    for (const [k, t] of chatsProcesados)
      if (ahora - t > 15000) chatsProcesados.delete(k);
  }, 5000);

  // ===============================
  // 🗣 VOCES
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
    Whalediving: "/sounds/Whalediving.mp3",
    likes: "/sounds/Likes.mp3"
  };

  // ===============================
  // 📊 CONTADOR REGALOS
  // ===============================
  const contadorRegalos = {};

  function actualizarRegalosUI() {
  regalosListaEl.innerHTML = "";

  Object.entries(contadorRegalos).forEach(([g, c]) => {
    const div = document.createElement("div");
    div.className = "regalo-item";

    const nombre = document.createElement("span");
    nombre.className = "regalo-nombre";
    nombre.innerText = g;

    const cantidad = document.createElement("span");
    cantidad.className = "regalo-cantidad";
    cantidad.innerText = c;

    div.appendChild(nombre);
    div.appendChild(cantidad);
    regalosListaEl.appendChild(div);
  });
}


  // ===============================
  // 🔊 COLA SONIDOS
  // ===============================
  let colaSonidos = [];
  let reproduciendo = false;

  function procesarSonidos() {
    if (!audioActivado || reproduciendo || colaSonidos.length === 0) return;

    reproduciendo = true;
    const audio = new Audio(colaSonidos.shift());
    audio.volume = volumenActual;

    audio.onended = audio.onerror = () => {
      reproduciendo = false;
      setTimeout(procesarSonidos, 100);
    };

    audio.play().catch(() => {
      reproduciendo = false;
    });
  }

  // ===============================
  // 📡 MENSAJES
  // ===============================
  function manejarMensaje(event) {
    const data = JSON.parse(event.data);

    // 🟢🔴 ESTADO TIKTOK
    if (data.type === "tiktok-status") {
      estadoTikTokEl.innerText = data.connected
        ? "🟢 TikTok conectado"
        : "🔴 TikTok desconectado";
      return;
    }

    // ❤️ LIKES (MOSTRAR)
    if (data.type === "likes") {
      totalLikes = data.total;
      if (likesEl) {
        likesEl.innerText = `❤️ Likes: ${totalLikes}`;
      }
      return;
    }

    // 🔊 SONIDO DE LIKES (ANTI SPAM)
    if (data.type === "likes-sound") {
      const ahora = Date.now();
      const ultimo = chatsProcesados.get("likes") || 0;

      if (ahora - ultimo > 1500) {
        chatsProcesados.set("likes", ahora);
        if (audioActivado && giftSounds.likes) {
          colaSonidos.push(giftSounds.likes);
          procesarSonidos();
        }
      }
      return;
    }

    // 🎁 REGALOS
    if (data.type === "gift") {

      const gift = data.gift.replace(/\s+/g, "").toLowerCase();
      const firma = `${data.user}|${gift}|${Math.floor(Date.now() / 2000)}`;

      if (regalosProcesados.has(firma)) return;

      regalosProcesados.set(firma, Date.now());

      contadorRegalos[gift] =
  (contadorRegalos[gift] || 0) + (data.count || 1);

      actualizarRegalosUI();

      if (giftSounds[gift]) {
        colaSonidos.push(giftSounds[gift]);
        procesarSonidos();
      }
      return;
    }

    // 💬 CHAT
    if (data.type === "chat") {
     const firma = `${data.user}|${gift}|${data.count}`;

      if (chatsProcesados.has(firma)) return;

      chatsProcesados.set(firma, Date.now());

      const voz = new SpeechSynthesisUtterance(
        `${data.user} dice ${data.message}`
      );

      const esp = vocesDisponibles.find(v => v.lang.startsWith("es"));
      if (esp) voz.voice = esp;

      speechSynthesis.speak(voz);
    }
  }

  // ===============================
  // 🔓 ACTIVAR SONIDO
  // ===============================
  window.activarSonido = () => {
    const a = new Audio("/sounds/Rose.mp3");
    a.play().then(() => {
      a.pause();
      audioActivado = true;
      localStorage.setItem("audioActivado", "true");
      estadoEl.innerText = "Estado: 🔊 sonido ACTIVADO";
    });
  };

  // ===============================
  // 🔗 CONECTAR
  // ===============================
  window.conectar = () => {
    const user = document.getElementById("user").value.trim();
    if (!user) return alert("Ingresa usuario");
    ws.send(JSON.stringify({ type: "set-user", user }));
  };

});



