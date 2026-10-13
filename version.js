(function () {
  "use strict";

  const APP_ID = "quranreader";
  const APP_VERSION = "1.1.3";
  window.APP_VERSION = APP_VERSION;
  const UPDATE_URL = "https://quran-58c7cd.gitlab.io/updates.json";
  const CHECK_DELAY_MS = 5000;
  const FETCH_TIMEOUT_MS = 8000;
  const FALLBACK_DELAY_MS = 15000;

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
    const toParts = (v) => String(v).split(".").map((n) => parseInt(n, 10) || 0);
    const r = toParts(remote);
    const l = toParts(local);
    for (let i = 0; i < 3; i++) {
      if ((r[i] || 0) > (l[i] || 0)) return true;
      if ((r[i] || 0) < (l[i] || 0)) return false;
    }
    return false;
  }

  function showUpdateBanner(app) {
    const color = escapeHtml(app.color);
    const message = escapeHtml(app.message || "تحديث جديد");
    const version = escapeHtml(app.version);
    const log = escapeHtml(app.log || "");
    const url = /^https?:\/\//.test(app.url) ? escapeHtml(app.url) : "#";
    const btnText = escapeHtml(app.button_text || "تحميــل");
    const logHtml = log ? `<div style="font-size:0.85rem;margin-top:4px;">📝 ${log}</div>` : "";

    const banner = document.createElement("div");
    banner.id = "update-banner";
    banner.style.cssText =
      "position:fixed;top:0;left:0;width:100%;z-index:9999;box-sizing:border-box;";
    banner.innerHTML = `<div style="background:${color};color:white;padding:calc(10px + env(safe-area-inset-top)) 10px 10px;display:flex;flex-direction:column;position:relative;">
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

    banner.querySelector("#download-btn")
      .addEventListener("click", () => window.open(url, "_system"));
    banner.querySelector("#close-btn")
      .addEventListener("click", () => banner.remove());
  }

  window.updateChecker = {
    check() {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

      fetch(`${UPDATE_URL}?t=${Date.now()}`, { signal: ctrl.signal })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          const app = data?.apps?.[APP_ID];
          if (app && isNewerVersion(app.version, APP_VERSION)) showUpdateBanner(app);
        })
        .catch(() => { })
        .finally(() => clearTimeout(timer));
    },
  };

  let fired = false;
  const run = () => {
    if (fired) return;
    fired = true;
    window.updateChecker.check();
  };

  window.addEventListener(`${APP_ID}:appReady`, () => setTimeout(run, CHECK_DELAY_MS), { once: true });
  setTimeout(run, FALLBACK_DELAY_MS);
})();