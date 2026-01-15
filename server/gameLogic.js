const roles = require("./roles");
const { rooms } = require("./roomManager");

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function startGame(roomId, io) {
  const room = rooms[roomId];
  room.cycle++;
  room.game = {
    phase: "BOX",
    players: {},
    actions: {},
    spyBlocks: {}
  };

  const rolePool = shuffle([
    ...roles.slice(0, room.players.length),
    ...Array(Math.max(0, room.players.length - roles.length)).fill({
      name: "Citizen",
      score: 200
    })
  ]);

  room.players.forEach((p, i) => {
    room.game.players[p.id] = {
      ...p,
      role: rolePool[i],
      cycleScore: 0
    };
    io.to(p.id).emit("role", rolePool[i]);
  });

  io.to(roomId).emit("phase", "MINISTER_JESTER");
}

function handleAction({ roomId, type, from, data }, io) {
  const game = rooms[roomId].game;
  game.actions[type] = game.actions[type] || {};
  game.actions[type][from] = data;

  // Phase transitions are handled here (shortened for clarity)
}

module.exports = { startGame, handleAction };
