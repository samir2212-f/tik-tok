document.addEventListener("DOMContentLoaded", () => {
const protocolo = location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(`${protocolo}://${location.host}`);

  const regalosProcesados = new Map();
  const REGALO_VENTANA_MS = 400; // ventana de duplicado técnico

  let audioActivado = false;
  let totalLikes = 0;

  const estadoEl = document.getElementById("estado");
  const likesEl = document.getElementById("likes");

  // Revisar si el audio estaba activado antes
  if (localStorage.getItem("audioActivado") === "true") {
    audioActivado = true;
    if (estadoEl) estadoEl.innerText = "Estado: 🔊 sonido ACTIVADO";
  }

  // 🗣️ VOCES
  let vocesDisponibles = [];
  speechSynthesis.onvoiceschanged = () => {
    vocesDisponibles = speechSynthesis.getVoices();
  };

  // 🎁 SONIDOS DE REGALOS + LIKES
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

  // 🧹 LIMPIAR TEXTO
  function limpiarTexto(texto) {
    return texto
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
      .replace(/[^\p{L}\p{N}\s.,!?]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ===============================
  // 🔊 SISTEMA DE COLA DE VOZ
  // ===============================
  let colaVoz = [];
  let hablando = false;

  function procesarCola() {
    if (!audioActivado || hablando || colaVoz.length === 0) return;

    hablando = true;
    const texto = colaVoz.shift();
    const voz = new SpeechSynthesisUtterance(texto);

    const vozEsp = vocesDisponibles.find(v => v.lang.startsWith("es"));
    if (vozEsp) voz.voice = vozEsp;

    voz.onend = () => {
      hablando = false;
      setTimeout(procesarCola, 200);
    };

    voz.onerror = () => {
      speechSynthesis.cancel();
      hablando = false;
      setTimeout(procesarCola, 500);
    };

    speechSynthesis.speak(voz);
  }

  // ===============================
  // 🔊 SISTEMA DE COLA DE SONIDOS
  // ===============================
  let colaSonidos = [];
  let sonidoReproduciendo = false;
// 🧹 LIMPIEZA DE REGALOS PROCESADOS (ANTI DUPLICADOS TÉCNICOS)
setInterval(() => {
  const ahora = Date.now();
  for (const [k, t] of regalosProcesados) {
    if (ahora - t > 5000) regalosProcesados.delete(k);
  }
}, 5000);

  function procesarColaSonidos() {
    if (!audioActivado || sonidoReproduciendo || colaSonidos.length === 0) return;

    sonidoReproduciendo = true;
    const sonidoUrl = colaSonidos.shift();
    const audio = new Audio(sonidoUrl);
    audio.volume = 0.3; // 👈 baja regalos (0.0 a 1.0)

    audio.onended = () => {
      sonidoReproduciendo = false;
      setTimeout(procesarColaSonidos, 50);
    };

    audio.onerror = () => {
      sonidoReproduciendo = false;
      setTimeout(procesarColaSonidos, 50);
    };

    audio.play().catch(() => {
      sonidoReproduciendo = false;
    });
  }

  // 📡 MENSAJES DEL SERVIDOR
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // 🎁 REGALOS → COLA (ANTI DUPLICADO REAL)
if (data.gift) {

  const giftName = data.gift.replace(/\s+/g, "").toLowerCase();
  const sonidoUrl = giftSounds[giftName];

  if (sonidoUrl) {
    const usuario = data.user || "anon";
    const ahora = Date.now();

    // 🧬 huella única del regalo
    const firma = `${usuario}|${giftName}`;
    const ultimo = regalosProcesados.get(firma) || 0;

    // ⛔ duplicado técnico
    if (ahora - ultimo >= REGALO_VENTANA_MS) {
      regalosProcesados.set(firma, ahora);
      colaSonidos.push(sonidoUrl);
      procesarColaSonidos();

      // 🧪 DEBUG (temporal)
      console.log("REGALO OK:", data.user, data.gift);
    }
  }
}



    // ❤️ LIKES
    if (data.type === "likes") {
      totalLikes = data.total;
      if (likesEl) likesEl.innerText = `❤️ Likes: ${totalLikes}`;
    }

    // 🔊 SONIDO CADA 1000 LIKES → COLA
    if (data.type === "likes-sound" && audioActivado) {
      colaSonidos.push(giftSounds.likes);
      procesarColaSonidos();
    }

    // 💬 CHAT → COLA DE VOZ
    if (data.type === "chat") {
      const texto = limpiarTexto(`${data.user} dice ${data.message}`);
      if (texto) {
        colaVoz.push(texto);
        procesarCola();
      }
    }
  };

  // 🔓 ACTIVAR SONIDO
  window.activarSonido = function () {
    const testAudio = new Audio("/sounds/Rose.mp3");

    testAudio.play().then(() => {
      testAudio.pause();
      testAudio.currentTime = 0;
      audioActivado = true;

      localStorage.setItem("audioActivado", "true");

      colaVoz = [];
      colaSonidos = [];
      hablando = false;
      sonidoReproduciendo = false;

      const voz = new SpeechSynthesisUtterance("Sonido activado correctamente");
      voz.lang = "es-ES";
      speechSynthesis.speak(voz);

      if (estadoEl) estadoEl.innerText = "Estado: 🔊 sonido ACTIVADO";
    });
  };
  // 🔗 CONECTAR A TIKTOK DESDE EL INPUT
window.conectar = function () {
  const input = document.getElementById("user");
  if (!input) {
    alert("No existe el input de usuario");
    return;
  }

  const user = input.value.trim();
  if (!user) {
    alert("Ingresa un usuario de TikTok");
    return;
  }

  ws.send(JSON.stringify({
    type: "set-user",
    user
  }));

  console.log("➡️ Usuario enviado al servidor:", user);
};

});


