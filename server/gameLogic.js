const roles = require("./roles");
const { rooms } = require("./roomManager");
const {
  shuffle,
  findPlayerByRole,
  findPlayerById,
  addScore,
  isCorrectPrediction,
  getOtherPlayers,
  resetCycleScores
} = require("./utils");

/**
 * Start a new cycle/game for the room
 */
function startGame(roomId, io) {
  const room = rooms[roomId];
  room.cycle++;

  // Reset cycle scores
  resetCycleScores(room.game?.players || {});

  // Initialize game object
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

  // Randomize roles for this cycle
  const rolePool = shuffle([
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
      role: rolePool[i],
      cycleScore: 0
    };
    io.to(p.id).emit("role", rolePool[i]);
  });

  // Broadcast players list
  io.to(roomId).emit("players", room.players);
  // Move to first phase
  io.to(roomId).emit("phase", "MINISTER_JESTER");
}

/**
 * Handle player actions
 */
function handleAction({ roomId, type, data, from }, io) {
  const room = rooms[roomId];
  if (!room?.game) return;

  const game = room.game;
  const playerRole = game.players[from]?.role?.name;

  // Minister & Jester actions
  if (type === "MINISTER_JESTER") {
    if (playerRole === "Minister") game.actions.MINISTER[from] = data;
    if (playerRole === "Jester") game.actions.JESTER[from] = data;

    // Move to Spy phase once any action occurs
    if (
      Object.keys(game.actions.MINISTER).length ||
      Object.keys(game.actions.JESTER).length
    ) {
      io.to(roomId).emit("phase", "SPY");
    }
  }

  // Spy actions
  if (type === "SPY" && playerRole === "Spy") {
    game.actions.SPY[from] = data;
    io.to(roomId).emit("phase", "POLICE_KNIGHT");
  }

  // Police / Knight actions
  if (type === "POLICE_KNIGHT") {
    if (playerRole === "Police") game.actions.POLICE = data;
    if (playerRole === "Knight") game.actions.KNIGHT = data;

    if (game.actions.POLICE !== null || game.actions.KNIGHT !== null) {
      endCycle(roomId, io);
    }
  }
}

/**
 * Compute scores and finalize the cycle
 */
function endCycle(roomId, io) {
  const room = rooms[roomId];
  if (!room?.game) return;

  const game = room.game;
  const players = game.players;

  // Find Thief
  const thief = findPlayerByRole(players, "Thief");

  // Spy logic + bonus blocking
  Object.entries(game.actions.SPY).forEach(([spyId, guesses]) => {
    let correct = 0;

    if (
      guesses?.minister &&
      isCorrectPrediction(players, guesses.minister, "Minister")
    ) {
      correct++;
      game.spyBlocks.minister = true; // block minister bonus
    }

    if (
      guesses?.jester &&
      isCorrectPrediction(players, guesses.jester, "Jester")
    ) {
      correct++;
      game.spyBlocks.jester = true; // block jester bonus
    }

    addScore(room, spyId, correct * 100);
  });

  // Police score
  const police = findPlayerByRole(players, "Police");
  if (police) {
    if (game.actions.POLICE === thief?.id) {
      addScore(room, police.id, 900);
    } else {
      addScore(room, police.id, -900);
    }
  }

  // Knight score
  const knight = findPlayerByRole(players, "Knight");
  if (knight) {
    if (game.actions.KNIGHT === thief?.id) {
      addScore(room, knight.id, 300); // bonus for protecting Thief
    }
  }

  // Minister bonus
  const minister = findPlayerByRole(players, "Minister");
  if (
    minister &&
    !game.spyBlocks.minister &&
    game.actions.POLICE === thief?.id
  ) {
    addScore(room, minister.id, 100);
  }

  // Jester bonus
  const jester = findPlayerByRole(players, "Jester");
  if (
    jester &&
    !game.spyBlocks.jester &&
    game.actions.KNIGHT === thief?.id
  ) {
    addScore(room, jester.id, 400);
  }

  // Add base role scores
  Object.values(players).forEach((p) => {
    addScore(room, p.id, p.role.score);
  });

  // Broadcast results
  io.to(roomId).emit("result", {
    players,
    police: game.actions.POLICE,
    knight: game.actions.KNIGHT,
    spyBlocks: game.spyBlocks
  });

  io.to(roomId).emit("phase", "RESULT");
}

module.exports = {
  startGame,
  handleAction,
  endCycle
};
