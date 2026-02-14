// ---------- CONFIG ----------
const API_URL = 'https://script.google.com/macros/s/AKfycbxroY62th8YX8bD1st0LFi7b2xhD1IlXjzYpgkTiYgVWHZXl5-e1Ofs7imItsaFzLCQuQ/exec';
let WORDS = [];

// ---------- GLOBAL STATE ----------
let me = { name: '', room: '', role: '', totalCycles: 0 };
let pollTimer = null;
let phase = 'LOBBY';
let historyVisible = false;
let prevHistoryLength = 0;          // track new words
let voteTimer = null;               // setTimeout for final word delay
let pendingVote = false;            // true while waiting to switch to vote

// ---------- WORD LOADING ----------
async function loadWords() {
    try {
        const res = await fetch('words.json');
        const data = await res.json();
        WORDS = data.words || [];
    } catch (e) {
        console.warn('words.json not loaded, using fallback');
        WORDS = ['shadow', 'eagle', 'storm', 'cipher', 'night', 'phantom'];
    }
}
window.onload = function () {
    loadWords();
    document.getElementById('toggle-history').addEventListener('click', toggleHistory);

    // Input listeners for enabling/disabling buttons based on input content
    const gameWordInput = document.getElementById('game-word');
    const submitWordBtn = document.getElementById('btn-submit-word');
    gameWordInput.addEventListener('input', function() {
        const isMyTurn = !gameWordInput.disabled; // disabled prop reflects turn ownership
        submitWordBtn.disabled = !isMyTurn || this.value.trim() === '';
    });

    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('btn-send-chat');
    chatInput.addEventListener('input', function() {
        sendChatBtn.disabled = this.value.trim() === '';
    });
};

// ---------- HELPER: BUTTON LOADING STATE ----------
function setButtonLoading(buttonId, isLoading) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.classList.add('btn-loading');
    } else {
        btn.disabled = false;
        btn.classList.remove('btn-loading');
    }
}

// ---------- API WRAPPER ----------
async function api(action, payload, skipLoader = false) {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action, ...payload })
        });
        return await res.json();
    } catch (e) {
        console.error(e);
        return { status: 'error', message: 'Network error' };
    }
}

// ---------- ACTIONS ----------
async function doCreate() {
    const name = document.getElementById('c-name').value.trim();
    const imp = document.getElementById('c-imposters').value;
    const cyc = document.getElementById('c-cycles').value;

    if (!name) return alert('Agent name required');
    if (WORDS.length === 0) {
        alert('Word list not ready, try again');
        return;
    }

    setButtonLoading('btn-create', true);
    me.name = name;
    me.room = Math.floor(100000 + Math.random() * 900000);
    me.totalCycles = parseInt(cyc);                     // store total cycles

    const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];

    const res = await api('create_room', {
        playerName: name,
        roomId: me.room,
        imposters: imp,
        cycles: cyc,
        secretWord: randomWord
    });

    setButtonLoading('btn-create', false);
    if (res.status === 'success') {
        enterLobby();
    } else {
        alert(res.message || 'Creation failed');
    }
}

async function doJoin() {
    const name = document.getElementById('j-name').value.trim();
    const room = document.getElementById('j-room').value.trim();
    if (!name || !room) return alert('Name and room ID required');

    setButtonLoading('btn-join', true);
    me.name = name;
    me.room = room;

    const res = await api('join_room', { playerName: name, roomId: room });

    setButtonLoading('btn-join', false);
    if (res.status === 'success') {
        enterLobby();
    } else {
        alert(res.message || 'Join failed');
    }
}

async function doReady() {
    setButtonLoading('btn-ready', true);
    document.getElementById('btn-ready').innerText = '⏳ WAITING...';
    await api('set_ready', { roomId: me.room, playerName: me.name });
}

async function revealReady() {
    setButtonLoading('btn-reveal-ready', true);
    document.getElementById('btn-reveal-ready').innerText = '⏳ WAITING...';
    await api('reveal_ready', {
        roomId: me.room,
        playerName: me.name
    });
}

async function submitWord() {
    const word = document.getElementById('game-word').value.trim();
    if (!word) return;

    setButtonLoading('btn-submit-word', true);
    await api('submit_word', {
        roomId: me.room,
        playerName: me.name,
        word: word
    });
    document.getElementById('game-word').value = '';
    // Button stays disabled until turn changes (handled by syncState)
}

let selectedVote = '';
function selectVote(targetName) {
    selectedVote = targetName;
    document.querySelectorAll('.vote-btn').forEach(b => b.classList.remove('selected'));
    event.target.classList.add('selected');
    document.getElementById('btn-cast-vote').disabled = false;
}

async function submitVote() {
    if (!selectedVote) return;
    setButtonLoading('btn-cast-vote', true);
    document.getElementById('btn-cast-vote').innerText = '🗳️ VOTED';
    await api('submit_vote', {
        roomId: me.room,
        playerName: me.name,
        voteTarget: selectedVote
    });
}

async function sendChat() {
    const msg = document.getElementById('chat-input').value.trim();
    const target = document.getElementById('chat-target').value;
    if (!msg) return;

    document.getElementById('chat-input').value = '';
    document.getElementById('btn-send-chat').disabled = true;
    await api('send_chat', {
        roomId: me.room,
        sender: me.name,
        target: target,
        message: msg
    });
}

// ---------- LOBBY & POLLING ----------
function enterLobby() {
    showScreen('screen-lobby');
    document.getElementById('lobby-id').innerText = me.room;
    document.getElementById('chat-section').classList.remove('hidden');
    startPolling();
}

function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(syncState, 2000);
    syncState();
}

async function syncState() {
    const data = await api('get_state', { roomId: me.room, playerName: me.name }, true);
    if (!data || data.status !== 'success') return;

    // Store total cycles if provided (for joiners)
    if (data.totalCycles) me.totalCycles = data.totalCycles;

    renderPlayers(data.players);
    renderChat(data.chats, data.players);

    if (data.phase !== phase) {
        phase = data.phase;
        handlePhaseChange(data);
    }

    if (phase === 'GAME') {
        updateGameScreen(data);
    }
    if (phase === 'RESULT') {
        showResults(data);
    }
}

function handlePhaseChange(data) {
    // If we are waiting for the vote timer and server says VOTE, do not switch yet
    if (phase === 'VOTE' && voteTimer) {
        pendingVote = true;          // remember we need to switch after timer
        return;                      // stay on current screen
    }

    // Normal phase switch (or timer already expired)
    if (phase === 'REVEAL') {
        showScreen('screen-reveal');
        document.getElementById('secret-word').innerText = data.secretWord || '???';
    } else if (phase === 'GAME') {
        showScreen('screen-game');
        historyVisible = false;
        document.getElementById('word-history').classList.add('hidden');
        document.getElementById('toggle-history').innerHTML = '📜 SHOW HISTORY ▼';
        // Reset word‑detection variables when entering game
        prevHistoryLength = 0;
        if (voteTimer) {
            clearTimeout(voteTimer);
            voteTimer = null;
        }
        pendingVote = false;
    } else if (phase === 'VOTE') {
        // If we reach here without pendingVote, it's safe to switch
        showScreen('screen-vote');
        renderVoteButtons(data.players);
    } else if (phase === 'RESULT') {
        showScreen('screen-result');
    }
}

function updateGameScreen(data) {
    document.getElementById('cycle-num').innerText = data.gameState?.currentCycle || 1;

    const turnPlayer = data.players[data.gameState?.turnIndex] || null;
    const isMyTurn = turnPlayer?.name === me.name;

    document.getElementById('turn-indicator').innerText = isMyTurn
        ? '⚡ YOUR TURN!'
        : `⏳ ${turnPlayer?.name || 'agent'} IS TYPING...`;

    const gameWordInput = document.getElementById('game-word');
    const submitBtn = document.getElementById('btn-submit-word');
    gameWordInput.disabled = !isMyTurn;
    if (!isMyTurn) {
        submitBtn.disabled = true;
        submitBtn.classList.remove('btn-loading');
    } else {
        submitBtn.disabled = gameWordInput.value.trim() === '';
    }

    // Update latest word banner
    const history = data.wordHistory || [];
    if (history.length > 0) {
        const last = history[history.length - 1];
        document.querySelector('.banner-player').innerText = last.player;
        document.querySelector('.banner-word').innerText = last.word;
    } else {
        document.querySelector('.banner-player').innerText = '——';
        document.querySelector('.banner-word').innerText = '———';
    }

    // Update history panel
    const histDiv = document.getElementById('word-history');
    histDiv.innerHTML = history
        .map(h => `<div><span class="chat-sender">${h.player}</span> ${h.word}</div>`)
        .join('');

    // ----- DETECT FINAL WORD AND START 5‑SECOND TIMER -----
    const currentCycle = data.gameState?.currentCycle || 1;
    const playerCount = data.players.length;
    const totalWordsExpected = currentCycle * playerCount;

    // If a new word was added AND we are in the last cycle
    if (history.length > prevHistoryLength && currentCycle === me.totalCycles) {
        // Check if this new word completes the cycle (i.e., history length equals expected)
        if (history.length === totalWordsExpected) {
            // Final word of the game just arrived – start 5s timer (if not already started)
            if (!voteTimer) {
                voteTimer = setTimeout(() => {
                    // Timer expired: if we are still in GAME phase but server might have changed to VOTE
                    if (phase === 'GAME') {
                        // Server hasn't switched yet – we could force a sync or just wait
                        // But usually server will switch soon; we'll just mark pending false
                        // and let the next phase change handle it.
                    }
                    if (pendingVote) {
                        // Server already moved to VOTE while we were waiting – now switch
                        showScreen('screen-vote');
                        // Re‑render vote buttons using latest data (data might be stale)
                        // We'll rely on next syncState to update properly.
                        pendingVote = false;
                    }
                    voteTimer = null;
                }, 5000);
            }
        }
    }
    prevHistoryLength = history.length;
}

function renderPlayers(players) {
    const list = document.getElementById('player-list');
    if (!players) return;
    list.innerHTML = players.map(p =>
        `<div class="player-card">
            <span>${p.name}</span>
            <span>${p.isReady ? '✅' : '⏳'}</span>
         </div>`
    ).join('');
}

function renderChat(chats, players) {
    const sel = document.getElementById('chat-target');
    if (sel.options.length === 1 && players) {
        players.forEach(p => {
            if (p.name !== me.name) {
                let opt = document.createElement('option');
                opt.value = p.name;
                opt.innerText = p.name;
                sel.appendChild(opt);
            }
        });
    }

    const div = document.getElementById('chat-display');
    div.innerHTML = (chats || []).map(c => {
        const isPriv = c.target && c.target !== 'ALL';
        return `<div class="chat-msg ${isPriv ? 'chat-private' : ''}">
            <span class="chat-sender">${c.sender}</span>${isPriv ? ' (private)' : ''}: ${c.msg}
        </div>`;
    }).join('');
    div.scrollTop = div.scrollHeight;
}

function renderVoteButtons(players) {
    const div = document.getElementById('vote-list');
    div.innerHTML = players
        .filter(p => p.name !== me.name)
        .map(p => `<button class="vote-btn" onclick="selectVote('${p.name}')">${p.name}</button>`)
        .join('');
    selectedVote = '';
    document.getElementById('btn-cast-vote').disabled = true;
    document.getElementById('btn-cast-vote').innerText = '🔒 CONFIRM VOTE';
    setButtonLoading('btn-cast-vote', false);
}

function showResults(data) {
    let counts = {};
    data.players.forEach(p => {
        if (p.voteTarget) counts[p.voteTarget] = (counts[p.voteTarget] || 0) + 1;
    });

    const imposters = data.players.filter(p => p.role === 'Imposter').map(p => p.name);
    let html = `<h3>🕵️ IMPOSTERS: ${imposters.join(', ') || 'none'}</h3>`;
    html += `<h4>📊 VOTES:</h4><ul>`;
    for (const [name, count] of Object.entries(counts)) {
        html += `<li>${name}: ${count} vote(s)</li>`;
    }
    html += `</ul>`;
    document.getElementById('result-display').innerHTML = html;
    clearInterval(pollTimer);
}

// ---------- HISTORY TOGGLE ----------
function toggleHistory() {
    const panel = document.getElementById('word-history');
    const btn = document.getElementById('toggle-history');
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        btn.innerHTML = '📜 HIDE HISTORY ▲';
    } else {
        panel.classList.add('hidden');
        btn.innerHTML = '📜 SHOW HISTORY ▼';
    }
}

// ---------- UI UTILS ----------
function showScreen(id) {
    document.querySelectorAll('.container > div:not(#chat-section)').forEach(d => d.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    if (id === 'screen-main') {
        document.getElementById('chat-section').classList.add('hidden');
    }
}

function holdCard(isHolding) {
    const el = document.querySelector('.reveal-container');
    if (!el) return;
    if (isHolding) el.classList.add('held');
    else el.classList.remove('held');
}

// ---------- CLEANUP ----------
window.addEventListener('beforeunload', function () {
    if (pollTimer) clearInterval(pollTimer);
    if (voteTimer) clearTimeout(voteTimer);
});

// ---------- EXPOSE GLOBALLY ----------
window.doCreate = doCreate;
window.doJoin = doJoin;
window.doReady = doReady;
window.revealReady = revealReady;
window.submitWord = submitWord;
window.selectVote = selectVote;
window.submitVote = submitVote;
window.sendChat = sendChat;
window.showScreen = showScreen;
window.holdCard = holdCard;
window.toggleHistory = toggleHistory;
