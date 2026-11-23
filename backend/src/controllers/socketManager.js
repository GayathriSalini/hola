import { Server } from "socket.io";
import { getAllowedOrigins } from "../allowedOrigins.js";

let connections = {};
let messages = {};
let timeonline = {};
let socketToPath = {};

const connectToSocket = (server) => {
    const origins = getAllowedOrigins();
    const io = new Server(server, {
        cors: {
            origin: origins,
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
        },
    });

    io.on("connection", (socket) => {
        socket.on("join_call", (path) => {
            if (typeof path !== "string" || socketToPath[socket.id] !== undefined) return;
            if (connections[path] === undefined) connections[path] = [];

            connections[path].push(socket.id);
            socketToPath[socket.id] = path;
            timeonline[socket.id] = new Date();

            connections[path].forEach((id) => {
                io.to(id).emit("user_joined", socket.id, connections[path]);
            });

            if (messages[path] !== undefined) {
                messages[path].forEach((m) => {
                    io.to(socket.id).emit("chat_message", m.data, m.sender, m["socket-id-sender"]);
                });
            }
        });

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        socket.on("chat_message", (data, sender) => {
            const path = socketToPath[socket.id];
            if (path === undefined) return;
            if (typeof data !== "string" || !data.trim()) return;
            data = data.slice(0, 2000);
            sender = typeof sender === "string" ? sender.slice(0, 50) : "Guest";

            if (messages[path] === undefined) messages[path] = [];
            messages[path].push({ sender, data, "socket-id-sender": socket.id });

            connections[path].forEach((id) => {
                io.to(id).emit("chat_message", data, sender, socket.id);
            });
        });

        socket.on("disconnect", () => {
            const path = socketToPath[socket.id];
            if (path === undefined) return;

            connections[path] = connections[path].filter((id) => id !== socket.id);
            connections[path].forEach((id) => io.to(id).emit("user_left", socket.id));

            if (connections[path].length === 0) {
                delete connections[path];
                delete messages[path];
            }
            delete socketToPath[socket.id];
            delete timeonline[socket.id];
        });
    });

    return io;
};

export default connectToSocket;
