// ---------- CONFIG ----------
const API_URL = 'https://script.google.com/macros/s/AKfycbxroY62th8YX8bD1st0LFi7b2xhD1IlXjzYpgkTiYgVWHZXl5-e1Ofs7imItsaFzLCQuQ/exec'; // your web app URL
let WORDS = [];

// ---------- GLOBAL STATE ----------
let me = { name: '', room: '', role: '' };
let pollTimer = null;
let phase = 'LOBBY';
let lastChatCount = 0;

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

// ---------- GLOBAL LOADER (for long operations) ----------
function showGlobalLoader(show) {
    const loader = document.getElementById('global-loader');
    if (loader) {
        if (show) loader.classList.remove('hidden');
        else loader.classList.add('hidden');
    }
}

// ---------- API WRAPPER (with skipLoader option) ----------
async function api(action, payload, skipLoader = false) {
    if (!skipLoader) showGlobalLoader(true);
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action, ...payload })
        });
        const json = await res.json();
        if (!skipLoader) showGlobalLoader(false);
        return json;
    } catch (e) {
        console.error(e);
        if (!skipLoader) showGlobalLoader(false);
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
    document.getElementById('btn-ready').innerText = '⏳ waiting...';
    await api('set_ready', { roomId: me.room, playerName: me.name });
}

async function revealReady() {
    setButtonLoading('btn-reveal-ready', true);
    document.getElementById('btn-reveal-ready').innerText = '⏳ waiting others...';
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
    // button will be re-enabled by syncState when turn changes
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
    document.getElementById('btn-cast-vote').innerText = '🗳️ voted';
    await api('submit_vote', {
        roomId: me.room,
        playerName: me.name,
        voteTarget: selectedVote
    });
    // keep disabled
}

async function sendChat() {
    const msg = document.getElementById('chat-input').value.trim();
    const target = document.getElementById('chat-target').value;
    if (!msg) return;

    document.getElementById('chat-input').value = '';
    await api('send_chat', {
        roomId: me.room,
        sender: me.name,
        target: target,
        message: msg
    });
    // chat button never disabled
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
    // IMPORTANT: skip loader for polling
    const data = await api('get_state', { roomId: me.room, playerName: me.name }, true);
    if (!data || data.status !== 'success') return;

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
    if (phase === 'REVEAL') {
        showScreen('screen-reveal');
        document.getElementById('secret-word').innerText = data.secretWord || '???';
    } else if (phase === 'GAME') {
        showScreen('screen-game');
    } else if (phase === 'VOTE') {
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
        : `⏳ ${turnPlayer?.name || 'agent'} is typing...`;

    document.getElementById('game-word').disabled = !isMyTurn;
    const submitBtn = document.getElementById('btn-submit-word');
    submitBtn.disabled = !isMyTurn;
    if (isMyTurn) {
        submitBtn.classList.remove('btn-loading'); // reset if it was stuck
    }

    const histDiv = document.getElementById('word-history');
    histDiv.innerHTML = (data.wordHistory || [])
        .map(h => `<div><span class="chat-sender">${h.player}</span> ${h.word}</div>`)
        .join('');
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
    document.getElementById('btn-cast-vote').innerText = '🔒 confirm vote';
    setButtonLoading('btn-cast-vote', false);
}

function showResults(data) {
    let counts = {};
    data.players.forEach(p => {
        if (p.voteTarget) counts[p.voteTarget] = (counts[p.voteTarget] || 0) + 1;
    });

    const imposters = data.players.filter(p => p.role === 'Imposter').map(p => p.name);
    let html = `<h3>🕵️ imposters: ${imposters.join(', ') || 'none'}</h3>`;
    html += `<h4>📊 votes:</h4><ul>`;
    for (const [name, count] of Object.entries(counts)) {
        html += `<li>${name}: ${count} vote(s)</li>`;
    }
    html += `</ul>`;
    document.getElementById('result-display').innerHTML = html;
    clearInterval(pollTimer);
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

// ---------- make sure buttons are re-enabled on error / page unload ----------
window.addEventListener('beforeunload', function () {
    if (pollTimer) clearInterval(pollTimer);
});

// ---------- expose functions globally ----------
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
