/* =========================
   LOADER CONTROL
========================= */
function showLoader(msg = "Loading...") {
  document.getElementById("loader").classList.remove("hidden");
  document.querySelector("#loader p").innerText = msg;
}

function hideLoader() {
  document.getElementById("loader").classList.add("hidden");
}

/* =========================
   API CALL (POST)
========================= */
async function apiCall(action, payload = {}) {
  showLoader("Synchronizing...");

  const body = {
    action,
    ...payload
  };

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    // ⏳ compensate Apps Script delay
    await new Promise(r => setTimeout(r, 2000));

    hideLoader();
    return data;

  } catch (err) {
    hideLoader();
    alert("Network Error");
    console.error(err);
    return null;
  }
}

/* =========================
   POLLING ENGINE
========================= */
function startPolling() {
  stopPolling();
  APP.poller = setInterval(fetchRoomState, 3000);
}

function stopPolling() {
  if (APP.poller) {
    clearInterval(APP.poller);
    APP.poller = null;
  }
}
