/* =========================
   GAME LOGIC
========================= */

// Global game state
const GAME = {
  players: [],
  roles: [],
  boxes: [],
  turnOrder: [],
  myRole: null,
  phase: "",
  timers: {},
  messages: []
};

// Role definitions with scores
const ROLE_DATA = {
  King: { score: 1000 },
  Queen: { score: 800 },
  Prince: { score: 750 },
  Knight: { score: 600, special: true },
  Jester: { score: 400, special: true },
  Minister: { score: 700, special: true },
  Spy: { score: 650, special: true },
  Treasurer: { score: 550 },
  Police: { score: 900, special: true },
  Thief: { score: 0, special: true },
  Citizen: { score: 200 }
};

/* =========================
   GAME START
========================= */
function launchGame(room) {
  GAME.players = room.players;
  GAME.phase = "BOX_SELECTION";

  showScreen("game");
  generateBoxes(GAME.players.length);
}

/* =========================
   BOX GENERATION
========================= */
function generateBoxes(count) {
  const gameContent = document.getElementById("gameContent");
  gameContent.innerHTML = '<div id="boxArea"></div>';
  const boxArea = document.getElementById("boxArea");
  boxArea.innerHTML = "";

  GAME.boxes = [];

  for (let i = 0; i < count; i++) {
    const box = document.createElement("div");
    box.className = "box";
    box.innerText = "🎁";
    box.onclick = () => selectBox(i);
    GAME.boxes.push({ index: i, taken: false });
    boxArea.appendChild(box);
  }

  startTurnOrder();
}

/* =========================
   TURN ORDER
========================= */
function startTurnOrder() {
  GAME.turnOrder = shuffle([...GAME.players.map(p => p.id)]);
  nextTurn();
}

function nextTurn() {
  if (GAME.turnOrder.length === 0) return;
  
  const current = GAME.turnOrder.shift();
  GAME.turnOrder.push(current);

  if (current === APP.playerId) {
    showMessage("Your turn! Pick a box");
  } else {
    showMessage("Waiting for other player...");
  }
}

function showMessage(msg) {
  document.getElementById("phaseTitle").innerText = msg;
}

/* =========================
   BOX SELECTION
========================= */
async function selectBox(index) {
  if (GAME.boxes[index].taken) return;

  const res = await apiCall("SELECT_BOX", {
    roomId: APP.roomId,
    playerId: APP.playerId,
    boxIndex: index
  });

  if (!res || !res.success) return;

  GAME.boxes[index].taken = true;
  document.querySelectorAll('.box')[index].classList.add('disabled');
  revealRole(res.role);
  nextTurn();
}

/* =========================
   ROLE REVEAL
========================= */
function revealRole(role) {
  GAME.myRole = role;
  
  document.getElementById("roleBox").classList.remove("hidden");
  document.getElementById("roleText").innerText = `Your Role: ${role}\nScore: ${ROLE_DATA[role]?.score || 0}`;
  
  document.getElementById("phaseTitle").innerText = `You are: ${role}`;
}

function toggleRole() {
  const roleText = document.getElementById("roleText");
  if (roleText.style.filter === 'blur(5px)') {
    roleText.style.filter = 'none';
  } else {
    roleText.style.filter = 'blur(5px)';
  }
}

/* =========================
   PHASE 1: MINISTER & JESTER (1 Minute)
========================= */
function startMinisterJesterPhase() {
  GAME.phase = "MINISTER_JESTER";
  document.getElementById("phaseTitle").innerText = "Minister & Jester Phase";
  startTimer(60, endMinisterJesterPhase);

  if (GAME.myRole === "Minister" || GAME.myRole === "Jester") {
    showPlayerSelect("Investigate a player to learn their role", player => {
      apiCall("SUBMIT_INVESTIGATION", {
        roomId: APP.roomId,
        role: GAME.myRole,
        targetPlayerId: player.id
      }).then(res => {
        if (res.success) {
          alert(`You learned: ${player.name} is ${res.learnedRole}`);
        }
      });
    });
  }
}

function endMinisterJesterPhase() {
  startPoliceKnightPhase();
}

/* =========================
   PHASE 2: POLICE & KNIGHT (2 Minutes)
========================= */
async function startPoliceKnightPhase() {
  GAME.phase = "POLICE_KNIGHT";
  document.getElementById("phaseTitle").innerText = "Police & Knight Phase";
  startTimer(120, endPoliceKnightPhase);

  // Fetch messages from backend
  const res = await apiCall("GET_MESSAGES", { 
    roomId: APP.roomId,
    playerId: APP.playerId 
  });
  
  if (res.success) {
    GAME.messages = res.messages;
    displayMessages();
    
    if (GAME.myRole === "Police") {
      showPlayerSelect("Based on messages, who is the Thief?", player => {
        apiCall("SUBMIT_POLICE", {
          roomId: APP.roomId,
          targetPlayerId: player.id
        });
      });
    }
    
    if (GAME.myRole === "Knight") {
      showPlayerSelect("Based on messages, who to protect?", player => {
        apiCall("SUBMIT_KNIGHT", {
          roomId: APP.roomId,
          targetPlayerId: player.id
        });
      });
    }
  }
}

function displayMessages() {
  const gameContent = document.getElementById("gameContent");
  gameContent.innerHTML = `
    <div class="message-box">
      <h3>You received 2 messages:</h3>
      <p>One is TRUE, one is FALSE</p>
      <div style="margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;">
        <p><strong>Message 1:</strong> "${GAME.messages[0]}"</p>
        <p><strong>Message 2:</strong> "${GAME.messages[1]}"</p>
      </div>
      <p><em>Police: True message from Minister, False from Jester</em></p>
      <p><em>Knight: True message from Jester, False from Minister</em></p>
    </div>
  `;
}

function endPoliceKnightPhase() {
  startSpyPhase();
}

/* =========================
   PHASE 3: SPY (1 Minute)
========================= */
function startSpyPhase() {
  GAME.phase = "SPY";
  document.getElementById("phaseTitle").innerText = "Spy Phase";
  startTimer(60, endSpyPhase);

  if (GAME.myRole === "Spy") {
    showDualSelect("Predict Minister & Jester", (minister, jester) => {
      apiCall("SUBMIT_SPY", {
        roomId: APP.roomId,
        minister: minister.id,
        jester: jester.id
      });
    });
  }
}

function endSpyPhase() {
  showResults();
}

/* =========================
   PLAYER SELECTION UI
========================= */
function showPlayerSelect(title, callback) {
  const gameContent = document.getElementById("gameContent");
  gameContent.innerHTML = `<h3>${title}</h3>`;
  
  GAME.players.forEach(player => {
    if (player.id !== APP.playerId) {
      const btn = document.createElement("button");
      btn.className = "box";
      btn.innerText = player.name;
      btn.onclick = () => callback(player);
      gameContent.appendChild(btn);
    }
  });
}

function showDualSelect(title, callback) {
  const gameContent = document.getElementById("gameContent");
  gameContent.innerHTML = `<h3>${title}</h3><p>Select Minister first, then Jester</p>`;
  
  let minister = null;
  
  GAME.players.forEach(player => {
    if (player.id !== APP.playerId) {
      const btn = document.createElement("button");
      btn.className = "box";
      btn.innerText = player.name;
      btn.onclick = () => {
        if (!minister) {
          minister = player;
          btn.style.background = "#0072ff";
          btn.innerText = `${player.name} (Minister)`;
        } else {
          callback(minister, player);
        }
      };
      gameContent.appendChild(btn);
    }
  });
}

/* =========================
   RESULTS
========================= */
async function showResults() {
  const res = await apiCall("GET_RESULTS", {
    roomId: APP.roomId
  });

  showScreen("result");
  
  const resultSummary = document.getElementById("resultSummary");
  resultSummary.innerHTML = "<h3>Scores</h3>";
  
  if (res && res.results) {
    res.results.forEach(r => {
      const div = document.createElement("div");
      div.className = "leaderboard-row";
      
      // Check if player was blocked by spy
      const blockedBySpy = r.bonuses && r.bonuses.some(b => b.includes("blocked"));
      const bonusText = r.bonuses && r.bonuses.length > 0 
        ? `<br><small style="color: ${blockedBySpy ? '#ff6b6b' : '#4cd964'}; font-size: 0.8em;">${r.bonuses.join(', ')}</small>`
        : '';
      
      div.innerHTML = `
        <div>
          <strong>${r.name}</strong><br>
          <span style="font-size: 0.9em; opacity: 0.8;">${r.role}</span>
          ${bonusText}
        </div>
        <div style="text-align: right;">
          <strong>${r.score} pts</strong>
        </div>
      `;
      resultSummary.appendChild(div);
    });
  }
  
  if (APP.isHost) {
    document.getElementById("nextCycleBtn").classList.remove("hidden");
  }
}

/* =========================
   NEXT CYCLE
========================= */
async function nextCycle() {
  await apiCall("NEXT_CYCLE", { roomId: APP.roomId });
  showLoader("Next cycle starting...");
}

/* =========================
   END GAME
========================= */
async function endGame() {
  const res = await apiCall("GET_LEADERBOARD", {
    roomId: APP.roomId
  });
  
  showScreen("leaderboard");
  const leaderboardList = document.getElementById("leaderboardList");
  leaderboardList.innerHTML = "";
  
  if (res && res.leaderboard) {
    res.leaderboard.forEach((player, index) => {
      const div = document.createElement("div");
      div.className = "leaderboard-row";
      div.innerHTML = `
        <span>${index + 1}. ${player.name}</span>
        <span>${player.totalScore} pts</span>
      `;
      leaderboardList.appendChild(div);
    });
  }
}

/* =========================
   UTILITIES
========================= */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
