import express from "express";
import { createServer } from "node:http";

import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import connectToSocket from "./controllers/socketManager.js";

import { getAllowedOrigins } from "./allowedOrigins.js";
import userRoutes from "./routes/users.routes.js";

dotenv.config();

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.set("port", process.env.PORT || 8000)
app.use(cors({ origin: getAllowedOrigins() }));
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));
app.use("/api/v1/users", userRoutes);




const start = async () => {
    // Start the server first: video calls and chat don't need the database.
    server.listen(app.get("port"), () => {
        console.log(`LISTEN ON PORT ${app.get("port")}`);
    });

    if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is not set. Login/history will not work. Add it to backend/.env");
        return;
    }
    try {
        const connectionDb = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MONGO Connected DB host: ${connectionDb.connection.host}`);
    } catch (e) {
        console.error(`MONGO connection failed (login/history unavailable): ${e.message}`);
    }
};

start();
