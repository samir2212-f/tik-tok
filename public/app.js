const ws = new WebSocket("ws://localhost:3000");

let audioActivado = false;

// 🗣️ VOCES
let vocesDisponibles = [];
speechSynthesis.onvoiceschanged = () => {
  vocesDisponibles = speechSynthesis.getVoices();
};

// 🎁 SONIDOS DE REGALOS
const giftSounds = {
  rose: "/sounds/Rose.mp3",
  heartme: "/sounds/Heart.mp3",
  perfume: "/sounds/perfume.mp3",
  bearlove: "/sounds/Bearlove.mp3",
  MoneyGun: "/sounds/MoneyGun.mp3",
  
  hatandmustache: "/sounds/HatandMustache.mp3"
  
};

// 🧹 LIMPIAR TEXTO (SIN EMOJIS)
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
  if (!audioActivado) return;
  if (hablando) return;
  if (colaVoz.length === 0) return;

  hablando = true;

  const texto = colaVoz.shift();
  const voz = new SpeechSynthesisUtterance(texto);

  const vozEsp = vocesDisponibles.find(v => v.lang.startsWith("es"));
  if (vozEsp) voz.voice = vozEsp;

  voz.rate = 1;
  voz.pitch = 1;

  // ⏹️ CUANDO TERMINA
  voz.onend = () => {
    hablando = false;
    setTimeout(procesarCola, 200);
  };

  // ❌ SI FALLA → REINICIAR TTS
  voz.onerror = () => {
    console.warn("⚠ TTS colgado, reiniciando...");
    speechSynthesis.cancel();
    hablando = false;
    setTimeout(procesarCola, 500);
  };

  speechSynthesis.speak(voz);
}

// 📡 MENSAJES DEL SERVIDOR
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  // 🎁 REGALOS
  if (data.gift) {
    const giftName = data.gift.replace(/\s+/g, "").toLowerCase();
    const sonidoUrl = giftSounds[giftName];

    if (sonidoUrl && audioActivado) {
      const sonido = new Audio(sonidoUrl);
      sonido.currentTime = 0;
      sonido.play().catch(() => {});
    }
  }

  // 💬 CHAT → COLA
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

    speechSynthesis.cancel();
    colaVoz = [];
    hablando = false;

    const voz = new SpeechSynthesisUtterance("Sonido activado correctamente");
    voz.lang = "es-ES";
    speechSynthesis.speak(voz);

    document.getElementById("estado").innerText =
      "Estado: 🔊 sonido ACTIVADO";
  });
};
