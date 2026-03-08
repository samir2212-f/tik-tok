const { WebcastPushConnection } = require("tiktok-live-connector");

// 🎁 MAPA DE REGALOS A ARCHIVOS DE SONIDO
const regalos = {
    heartme: "Heart.mp3",
    perfume: "perfume.mp3",
    
    moneygun: "MoneyGun.mp3",
    papercrane: "PaperCrane.mp3",
    doughnut: "Doughnut.mp3",
    corgi: "Corgi.mp3",
    confetti: "Confetti.mp3",
    loveyou: "LoveYou.mp3",
    handheart: "HandHeart.mp3",
    friendshipnecklace: "FriendshipNecklace.mp3",
    rosa: "Rosa.mp3",
    hearts: "Hearts.mp3",
    coral: "Coral.mp3",
    loveyousomuch: "Loveyousomuch.mp3",
    hatandmustache: "HatandMustache.mp3",
    cap: "Gorra.mp3",
    youreawesome: "youreawesome.mp3",
    overreact:"overreact.mp3",
    bffnecklace: "bffnecklace.mp3",
    capybara: "capybara.mp3",
    sombrero: "sombrero.mp3",
    winkwink:"",
    marvelousconfetti:"Confetti.mp3",
    nightstar: "nightstar.mp3",
    bravo: "bravo.mp3",     
    mishkabear:"Bearlove.mp3"
};

// 🧼 FUNCIÓN PARA LIMPIAR TEXTO - MEJORADA
function normalizar(texto) {
    if (!texto) return "";
    return texto
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

// 🧼 FUNCIÓN PARA LIMPIAR TEXTO PARA MOSTRAR - SOLO LETRAS Y NÚMEROS
function limpiarTextoParaMostrar(texto) {
    if (!texto) return "";
    // Mantener solo letras (incluyendo acentos), números y espacios básicos
    return texto
        .replace(/[^\w\s\u00C0-\u00FFáéíóúÁÉÍÓÚñÑ]/gi, '') // Permite letras con acentos
        .replace(/\s+/g, ' ') // Reemplazar múltiples espacios por uno solo
        .trim();
}

// Función para obtener el mejor nombre (nickname si existe, sino uniqueId)
function obtenerNombreUsuario(data) {
    let nombre = "";
    
    // Preferir nickname (nombre visible), sino uniqueId (nombre único)
    if (data.nickname && data.nickname.trim() !== "") {
        nombre = data.nickname;
    } else if (data.uniqueId && data.uniqueId.trim() !== "") {
        nombre = data.uniqueId;
    } else {
        nombre = 'Anónimo';
    }
    
    // Limpiar el nombre antes de devolverlo
    return limpiarTextoParaMostrar(nombre);
}

// Función principal para iniciar TikTok Live
function iniciarTikTok(user, socket) {
    console.log(`🎬 Iniciando TikTok Live para @${user}`);
    
    // Contadores POR CADA CONEXIÓN
    let roseCounter = 0;
    let fingerheartCounter = 0;
    let tiktokLive = null;

    // Detener conexión anterior si existe
    if (tiktokLive) {
        console.log("🔴 Desconectando conexión anterior...");
        try {
            tiktokLive.disconnect();
        } catch (err) {
            console.log("ℹ️  No había conexión activa");
        }
        tiktokLive = null;
    }

    tiktokLive = new WebcastPushConnection(user, {
        enableExtendedGiftInfo: true,
        processInitialData: true
    });

    tiktokLive.connect()
        .then(state => {
            console.log(`🟢 Conectado al live de @${user}`);
            console.log(`👤 Room ID: ${state.roomId}`);
            socket.emit("estado", `🟢 Conectado a @${user}`);
        })
        .catch(err => {
            console.error("❌ Error al conectar:", err.message);
            socket.emit("estado", `❌ Error: ${err.message || "Verifica que el usuario esté en vivo"}`);
            tiktokLive = null;
        });

    // 🎁 EVENTO REGALO
       // 🎁 EVENTO REGALO
    tiktokLive.on("gift", data => {
        console.log("\n=== 🎁 REGALO RECIBIDO ===");
        console.log(`Usuario único: ${data.uniqueId || 'Anónimo'}`);
        console.log(`Usuario visible: ${data.nickname || 'Sin nickname'}`);
        console.log(`Regalo: ${data.giftName || 'Sin nombre'}`);
        console.log(`Cantidad: ${data.repeatCount || 1}`);
        
        const nombreOriginal = data.giftName || data.describe || `Gift_${data.giftId || data.id}`;
        const nombreLimpio = normalizar(nombreOriginal);
        const nombreUsuario = obtenerNombreUsuario(data);  // Esto ya usará la función actualizada
        
        console.log(`Normalizado: ${nombreOriginal} → ${nombreLimpio}`);
        console.log(`Nombre a usar: ${nombreUsuario}`);
        // Manejo especial para Rose (cada 2 = 1 sonido)
        if (nombreLimpio === "rose") {
            const cantidad = data.repeatCount || 1;
            roseCounter += cantidad;
            console.log(`🌹 Roses recibidas: ${cantidad}`);
            console.log(`🌹 Contador total: ${roseCounter}`);
            
            // Calcular cuántos sonidos especiales debemos enviar
            const sonidosEspecialesNecesarios = Math.floor(roseCounter / 2);
            const roseCounterAnterior = roseCounter - cantidad;
            const sonidosEspecialesAnteriores = Math.floor(roseCounterAnterior / 2);
            const nuevosSonidosEspeciales = sonidosEspecialesNecesarios - sonidosEspecialesAnteriores;
            
            console.log(`🎯 Sonidos Rose especiales a enviar: ${nuevosSonidosEspeciales}`);
            
            if (nuevosSonidosEspeciales > 0) {
                // Enviar SOLO UN evento
                socket.emit("regalo", {
                    usuario: nombreUsuario,
                    usuarioUnico: data.uniqueId || 'Anónimo',
                    regalo: `${nombreOriginal} (Especial cada 2)`,
                    archivoSonido: "Rose.mp3",
                    cantidad: nuevosSonidosEspeciales * 2,
                    diamantes: data.diamondCount || 0,
                    timestamp: Date.now(),
                    esRose: true,
                    esRoseEspecial: true,
                    esFingerHeart: false,
                    esFingerHeartEspecial: false,
                    contadorRose: roseCounter,
                    contadorFingerHeart: fingerheartCounter
                });
            }
            
            // NO enviar evento para Rose normal
            return;
            
        // Manejo especial para FingerHeart
        } else if (nombreLimpio === "fingerheart") {
            const cantidad = data.repeatCount || 1;
            fingerheartCounter += cantidad;
            console.log(`💝 FingerHearts recibidos: ${cantidad}`);
            console.log(`💝 Contador total: ${fingerheartCounter}`);
            
            const sonidosEspecialesNecesarios = Math.floor(fingerheartCounter / 2);
            const fingerheartCounterAnterior = fingerheartCounter - cantidad;
            const sonidosEspecialesAnteriores = Math.floor(fingerheartCounterAnterior / 2);
            const nuevosSonidosEspeciales = sonidosEspecialesNecesarios - sonidosEspecialesAnteriores;
            
            console.log(`🎯 Sonidos FingerHeart especiales a enviar: ${nuevosSonidosEspeciales}`);
            
            if (nuevosSonidosEspeciales > 0) {
                socket.emit("regalo", {
                    usuario: nombreUsuario,
                    usuarioUnico: data.uniqueId || 'Anónimo',
                    regalo: `${nombreOriginal} (Especial cada 2)`,
                    archivoSonido: "FingerHeart.mp3",
                    cantidad: nuevosSonidosEspeciales * 2,
                    diamantes: data.diamondCount || 0,
                    timestamp: Date.now(),
                    esRose: false,
                    esRoseEspecial: false,
                    esFingerHeart: true,
                    esFingerHeartEspecial: true,
                    contadorRose: roseCounter,
                    contadorFingerHeart: fingerheartCounter
                });
            }
            
            return;
            
        } else {
            // Para otros regalos, comportamiento normal
            const archivoSonido = regalos[nombreLimpio];
            
            socket.emit("regalo", {
                usuario: nombreUsuario,
                usuarioUnico: data.uniqueId || 'Anónimo',
                regalo: nombreOriginal,
                archivoSonido: archivoSonido,
                cantidad: data.repeatCount || 1,
                diamantes: data.diamondCount || 0,
                timestamp: Date.now(),
                esRose: false,
                esRoseEspecial: false,
                esFingerHeart: false,
                esFingerHeartEspecial: false,
                contadorRose: roseCounter,
                contadorFingerHeart: fingerheartCounter
            });
        }
    });

    // Evento cuando alguien se une
    tiktokLive.on("member", data => {
        const nombreUsuario = obtenerNombreUsuario(data);
        console.log(`👤 ${nombreUsuario} (${data.uniqueId}) se unió al live`);
        socket.emit("miembro", {
            usuario: nombreUsuario,
            usuarioUnico: data.uniqueId
        });
    });

        // Evento de comentario
    tiktokLive.on("chat", data => {
        const nombreUsuario = obtenerNombreUsuario(data);
        const mensajeLimpio = limpiarTextoParaMostrar(data.comment || "");
        
        console.log(`💬 ${nombreUsuario} (${data.uniqueId}): ${mensajeLimpio}`);
        socket.emit("chat", {
            usuario: nombreUsuario,
            usuarioUnico: data.uniqueId,
            mensaje: mensajeLimpio  // Usar el mensaje limpio
        });
    });

    // Manejar errores
    tiktokLive.on("error", err => {
        console.error("❌ Error en la conexión:", err);
        socket.emit("estado", "❌ Error en la conexión");
    });

    // Manejar desconexión
    tiktokLive.on("disconnected", () => {
        console.log("🔴 Desconectado del live");
        socket.emit("estado", "🔴 Desconectado del live");
        tiktokLive = null;
    });

    return tiktokLive;
}

// Exportar la función directamente
module.exports = iniciarTikTok;