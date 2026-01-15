
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}


function findPlayerByRole(players, roleName) {
  return Object.values(players).find(
    (p) => p.role && p.role.name === roleName
  );
}


function findPlayerById(players, id) {
  return players[id] || null;
}


function addScore(room, playerId, score) {
  const gamePlayer = room.game.players[playerId];
  const totalPlayer = room.players.find(p => p.id === playerId);

  if (!gamePlayer || !totalPlayer) return;

  gamePlayer.cycleScore += score;
  totalPlayer.score += score;
}


function isCorrectPrediction(players, targetId, roleName) {
  if (!targetId) return false;
  return players[targetId]?.role?.name === roleName;
}


function getOtherPlayers(players, selfId) {
  return Object.values(players).filter(p => p.id !== selfId);
}


function resetCycleScores(players) {
  Object.values(players).forEach(p => {
    p.cycleScore = 0;
  });
}

module.exports = {
  shuffle,
  findPlayerByRole,
  findPlayerById,
  addScore,
  isCorrectPrediction,
  getOtherPlayers,
  resetCycleScores
};
