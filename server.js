const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Puerto que asigna Render (o 3000 para local)
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos (HTML, CSS, sonidos)
app.use(express.static(__dirname));
app.use('/sounds', express.static(path.join(__dirname, 'sounds')));

// Ruta principal
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Importar la lógica de TikTok
const iniciarTikTok = require("./app");

const conexiones = new Map();

io.on("connection", (socket) => {
    console.log("🟢 Cliente web conectado:", socket.id);

    socket.on("startLive", (user) => {
        console.log("📡 Recibido startLive para:", user);
        
        if (!user || user.trim() === "") {
            socket.emit("estado", "❌ Ingresa un usuario válido");
            return;
        }

        // Limpiar conexión anterior
        if (conexiones.has(socket.id)) {
            const oldConnection = conexiones.get(socket.id);
            if (oldConnection) {
                oldConnection.disconnect();
            }
            conexiones.delete(socket.id);
        }

        socket.emit("estado", `🔴 Conectando a @${user}...`);
        
        try {
            // Pasar el socket individual
            const tiktokConnection = iniciarTikTok(user, socket);
            if (tiktokConnection) {
                conexiones.set(socket.id, tiktokConnection);
                console.log(`✅ TikTok connection iniciada para @${user}`);
            }
        } catch (error) {
            console.error("Error al iniciar TikTok:", error);
            socket.emit("estado", "❌ Error: " + error.message);
        }
    });

    socket.on("disconnectLive", () => {
        console.log("🔴 Cliente solicitó desconexión");
        if (conexiones.has(socket.id)) {
            const connection = conexiones.get(socket.id);
            if (connection) {
                connection.disconnect();
            }
            conexiones.delete(socket.id);
        }
        socket.emit("estado", "🔴 Desconectado del live");
    });

    socket.on("disconnect", () => {
        console.log("🔴 Cliente web desconectado:", socket.id);
        if (conexiones.has(socket.id)) {
            const connection = conexiones.get(socket.id);
            if (connection) {
                connection.disconnect();
            }
            conexiones.delete(socket.id);
        }
    });
});

server.listen(PORT, () => {
    console.log(`🌐 Servidor corriendo en puerto ${PORT}`);
    console.log("🎨 Sirviendo archivos estáticos");
    console.log("🔊 Sonidos disponibles en /sounds/");
});

// Manejo de errores no capturados (opcional)
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
});