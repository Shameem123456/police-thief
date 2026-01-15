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
    actions: {
      MINISTER: {},
      JESTER: {},
      SPY: {},
      POLICE: null,
      KNIGHT: null
    },
    spyBlocks: {
      minister: false,
      jester: false
    }
  };

  const baseRoles = shuffle([
    ...roles.slice(0, room.players.length),
    ...Array(Math.max(0, room.players.length - roles.length)).fill({
      name: "Citizen",
      score: 200
    })
  ]);

  room.players.forEach((p, i) => {
    room.game.players[p.id] = {
      id: p.id,
      name: p.name,
      role: baseRoles[i],
      cycleScore: 0
    };
    io.to(p.id).emit("role", baseRoles[i]);
  });

  io.to(roomId).emit("players", room.players);
  io.to(roomId).emit("phase", "MINISTER_JESTER");
}

function handleAction({ roomId, type, data, from }, io) {
  const room = rooms[roomId];
  const game = room.game;

  const role = game.players[from]?.role.name;

  // Minister & Jester
  if (type === "MINISTER_JESTER") {
    if (role === "Minister") game.actions.MINISTER[from] = data;
    if (role === "Jester") game.actions.JESTER[from] = data;

    if (
      Object.keys(game.actions.MINISTER).length ||
      Object.keys(game.actions.JESTER).length
    ) {
      io.to(roomId).emit("phase", "SPY");
    }
  }

  // Spy
  if (type === "SPY" && role === "Spy") {
    game.actions.SPY[from] = data;
    io.to(roomId).emit("phase", "POLICE_KNIGHT");
  }

  // Police
  if (type === "POLICE_KNIGHT") {
    if (role === "Police") game.actions.POLICE = data;
    if (role === "Knight") game.actions.KNIGHT = data;

    if (game.actions.POLICE !== null || game.actions.KNIGHT !== null) {
      endCycle(roomId, io);
    }
  }
}

function endCycle(roomId, io) {
  const room = rooms[roomId];
  const game = room.game;

  const players = game.players;

  let thiefId;
  Object.values(players).forEach(p => {
    if (p.role.name === "Thief") thiefId = p.id;
  });

  // Spy logic
  Object.entries(game.actions.SPY).forEach(([spyId, guesses]) => {
    let correct = 0;
    if (guesses?.minister && players[guesses.minister]?.role.name === "Minister") {
      correct++;
      game.spyBlocks.minister = true;
    }
    if (guesses?.jester && players[guesses.jester]?.role.name === "Jester") {
      correct++;
      game.spyBlocks.jester = true;
    }
    players[spyId].cycleScore += correct * 100;
  });

  // Police
  if (game.actions.POLICE === thiefId) {
    players[Object.keys(players).find(id => players[id].role.name === "Police")]
      .cycleScore += 900;
  } else {
    players[Object.keys(players).find(id => players[id].role.name === "Police")]
      .cycleScore -= 900;
  }

  // Knight
  if (game.actions.KNIGHT === thiefId) {
    players[Object.keys(players).find(id => players[id].role.name === "Knight")]
      .cycleScore += 300;
  }

  // Minister
  if (!game.spyBlocks.minister && game.actions.POLICE === thiefId) {
    players[Object.keys(players).find(id => players[id].role.name === "Minister")]
      .cycleScore += 100;
  }

  // Jester
  if (!game.spyBlocks.jester && game.actions.KNIGHT === thiefId) {
    players[Object.keys(players).find(id => players[id].role.name === "Jester")]
      .cycleScore += 400;
  }

  // Base scores
  Object.values(players).forEach(p => {
    p.cycleScore += p.role.score;
    const totalPlayer = room.players.find(x => x.id === p.id);
    totalPlayer.score += p.cycleScore;
  });

  io.to(roomId).emit("result", {
    players,
    police: game.actions.POLICE,
    knight: game.actions.KNIGHT,
    blocks: game.spyBlocks
  });

  io.to(roomId).emit("phase", "RESULT");
}

module.exports = { startGame, handleAction };
