/* =========================
   CREATE ROOM (HOST)
========================= */
async function createRoom() {
  const name = document.getElementById('hostName').value.trim();
  const roomId = document.getElementById('roomIdCreate').value.trim();
  const pass = document.getElementById('roomPassCreate').value.trim();

  if (!name || !roomId || !pass) {
    alert("Fill all fields");
    return;
  }

  const res = await apiCall("CREATE_ROOM", {
    name,
    roomId,
    pass
  });

  if (!res || !res.success) {
    alert(res?.message || "Room creation failed");
    return;
  }

  APP.roomId = roomId;
  APP.roomPass = pass;
  APP.playerId = res.playerId;
  APP.playerName = name;
  APP.isHost = true;

  enterLobby(res.room);
}

/* =========================
   JOIN ROOM (PLAYER)
========================= */
async function joinRoom() {
  const name = document.getElementById('playerName').value.trim();
  const roomId = document.getElementById('roomIdJoin').value.trim();
  const pass = document.getElementById('roomPassJoin').value.trim();

  if (!name || !roomId || !pass) {
    alert("Fill all fields");
    return;
  }

  const res = await apiCall("JOIN_ROOM", {
    name,
    roomId,
    pass
  });

  if (!res || !res.success) {
    alert(res?.message || "Join failed");
    return;
  }

  APP.roomId = roomId;
  APP.roomPass = pass;
  APP.playerId = res.playerId;
  APP.playerName = name;
  APP.isHost = false;

  enterLobby(res.room);
}

/* =========================
   ENTER LOBBY
========================= */
function enterLobby(room) {
  showScreen("lobby");

  document.getElementById("roomInfo").innerHTML = `
    <p><b>Room:</b> ${APP.roomId}</p>
    <p><b>You:</b> ${APP.playerName} ${APP.isHost ? "(Host)" : ""}</p>
  `;

  document.getElementById("settingsBtn").classList.toggle("hidden", !APP.isHost);
  document.getElementById("startBtn").classList.remove("hidden");

  updatePlayerList(room.players);
  startPolling();
}

/* =========================
   POLL ROOM STATE
========================= */
async function fetchRoomState() {
  if (!APP.roomId) return;

  const res = await apiCall("GET_ROOM", {
    roomId: APP.roomId
  });

  if (!res || !res.success) return;

  updatePlayerList(res.room.players);

  if (res.room.phase === "GAME") {
    stopPolling();
    launchGame(res.room);
  }
}

/* =========================
   PLAYER LIST UI
========================= */
function updatePlayerList(players) {
  const list = document.getElementById("playerList");
  list.innerHTML = "";

  players.forEach(p => {
    const div = document.createElement("div");
    div.className = "player-card";

    div.innerHTML = `
      <span>${p.name}</span>
      ${p.isHost ? "👑" : ""}
      ${p.ready ? "✅" : ""}
    `;

    list.appendChild(div);
  });
}

/* =========================
   START GAME
========================= */
async function startGame() {
  const res = await apiCall("START_GAME", {
    roomId: APP.roomId,
    playerId: APP.playerId
  });

  if (!res || !res.success) {
    alert(res?.message || "Cannot start");
    return;
  }

  showLoader("Starting game...");
}

/* =========================
   SETTINGS (HOST ONLY)
========================= */
function openSettings() {
  const players = prompt("Number of players (7–20):", "7");
  const cycles = prompt("Number of cycles:", "5");

  if (!players || !cycles) return;

  apiCall("UPDATE_SETTINGS", {
    roomId: APP.roomId,
    maxPlayers: Number(players),
    cycles: Number(cycles)
  });
             }
