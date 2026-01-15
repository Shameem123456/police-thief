import { io } from "socket.io-client";

export const socket = io(
  import.meta.env.VITE_SERVER_URL || "https://police-thief-server.onrender.com"
);
