(function () {
  "use strict";

  const APP_ID = "quranreader";
  const APP_VERSION = "1.0.8";

  function escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function isNewerVersion(remote, local) {
    const remoteParts = remote.split(".").map(Number);
    const localParts = local.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if (remoteParts[i] > localParts[i]) return true;
      if (remoteParts[i] < localParts[i]) return false;
    }
    return false;
  }

  function showUpdateBanner(app) {
    const color = escapeHtml(app.color);
    const message = escapeHtml(app.message || "Nouvelle version disponible");
    const version = escapeHtml(app.version);
    const log = escapeHtml(app.log || "");
    const url = /^https?:\/\//.test(app.url) ? app.url : "#";
    const btnText = escapeHtml(app.button_text || "تحميــل");
    const logHtml = log
      ? `<div style="font-size:0.85rem;margin-top:4px;">📝 ${log}</div>`
      : "";

    const banner = document.createElement("div");
    banner.id = "update-banner";
    banner.style.cssText =
      "position:fixed;top:0;left:0;width:100%;z-index:9999;box-sizing:border-box;";
    banner.innerHTML = `<div style="background:${color};color:white;padding:10px;display:flex;flex-direction:column;position:relative;">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;width:100%;">
        <div style="flex:1;">
          <div style="font-weight:bold;margin-bottom:2px;">${message}</div>
          <div style="font-size:0.9rem;">الإصدار ${version}</div>
          ${logHtml}
        </div>
        <button id="download-btn" style="background:white;color:${color};border:none;padding:10px;border-radius:4px;font-weight:bold;cursor:pointer;white-space:nowrap;">${btnText}</button>
      </div>
      <button id="close-btn" style="background:none;border:none;color:white;cursor:pointer;font-size:20px;width:40px;display:flex;align-items:center;justify-content:center;margin:auto;">×</button>
    </div>`;

    document.body.prepend(banner);
    document
      .getElementById("download-btn")
      .addEventListener("click", () => window.open(url, "_system"));
    document
      .getElementById("close-btn")
      .addEventListener("click", () => banner.remove());
  }

  window.updateChecker = {
    check() {
      fetch(`https://quran-58c7cd.gitlab.io/updates.json?t=${Date.now()}`)
        .then((r) => r.json())
        .then((data) => {
          const app = data.apps?.[APP_ID];
          if (!app) return;
          if (isNewerVersion(app.version, APP_VERSION)) showUpdateBanner(app);
        })
        .catch(() => { });
    },
  };

  // ============================================
  // DÉCLENCHEMENT
  // ============================================

  let fired = false;
  const run = () => {
    if (fired) return;
    fired = true;
    window.updateChecker.check();
  };

  window.addEventListener("quran:appReady", () => setTimeout(run, 5000),
    { once: true, });
  window.addEventListener("quran:appError", () => { fired = true; }, { once: true },);
  setTimeout(run, 10000);
})
  ();
