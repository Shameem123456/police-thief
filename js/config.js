/* =========================
   GLOBAL CONFIG
========================= */

// 🔴 REPLACE with your Apps Script Web App URL
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzSUg2IFMrO-SVyrb1Uu5Cj1xhuUpGZPeemUkQ_91HZVvsS2Ko7fdLBfp1m_EpaWmehmA/exec";

// App State (cached)
let APP = {
  roomId: null,
  roomPass: null,
  playerId: null,
  playerName: null,
  isHost: false,
  currentPhase: null,
  poller: null
};
