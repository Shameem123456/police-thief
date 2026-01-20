/* =========================
   SCREEN HANDLING
========================= */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => {
    s.classList.remove("active");
  });
  document.getElementById(id).classList.add("active");
}

/* =========================
   NAVIGATION
========================= */
function goHome() {
  stopPolling();
  showScreen("landing");
}

function showCreate() {
  showScreen("createRoom");
}

function showJoin() {
  showScreen("joinRoom");
}

/* =========================
   ROLE VISIBILITY
========================= */
function toggleRole() {
  const roleText = document.getElementById("roleText");
  if (roleText.style.filter === 'blur(5px)') {
    roleText.style.filter = 'none';
  } else {
    roleText.style.filter = 'blur(5px)';
  }
}

/* =========================
   TIMER
========================= */
let timerInterval = null;

function startTimer(seconds, onEnd) {
  clearInterval(timerInterval);

  let remaining = seconds;
  const timerEl = document.getElementById("timer");
  timerEl.innerText = formatTime(remaining);

  timerInterval = setInterval(() => {
    remaining--;
    timerEl.innerText = formatTime(remaining);

    if (remaining <= 0) {
      clearInterval(timerInterval);
      if (onEnd) onEnd();
    }
  }, 1000);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
