const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createRoom, joinRoom, rooms } = require("./roomManager");
const { startGame, handleAction } = require("./gameLogic");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("create-room", ({ name, roomId, password }) => {
    const res = createRoom(roomId, password, socket.id, name);
    if (!res.error) socket.join(roomId);
    socket.emit("room-response", res);
  });

  socket.on("join-room", ({ name, roomId, password }) => {
    const res = joinRoom(roomId, password, socket.id, name);
    if (!res.error) socket.join(roomId);
    io.to(roomId).emit("room-update", rooms[roomId]);
    socket.emit("room-response", res);
  });

  socket.on("player-ready", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.ready.add(socket.id);
    if (room.ready.size === room.players.length) {
      setTimeout(() => startGame(roomId, io), 5000);
    }
  });

  socket.on("action", (data) => {
    handleAction(data, io);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

server.listen(3000, () => console.log("Server running on 3000"));
