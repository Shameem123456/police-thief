const rooms = {};

function createRoom(roomId, password, hostId, hostName) {
  if (rooms[roomId]) return { error: "Room exists" };

  rooms[roomId] = {
    roomId,
    password,
    hostId,
    players: [{ id: hostId, name: hostName, score: 0 }],
    ready: new Set(),
    cycle: 0,
    settings: { maxPlayers: 7, cycles: 3 },
    game: null
  };
  return { success: true, room: rooms[roomId] };
}

function joinRoom(roomId, password, id, name) {
  const room = rooms[roomId];
  if (!room || room.password !== password)
    return { error: "Invalid room" };

  room.players.push({ id, name, score: 0 });
  return { success: true, room };
}

module.exports = { rooms, createRoom, joinRoom };
