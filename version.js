// ============================================================
//  FICHIER : version.js
//  Rôle : vérification de mise à jour (updates.json) + bannière
// ============================================================

(function () {
  "use strict";

  // ---------- Configuration ----------

  // SECTION À MODIFIER
  const APP_ID = "hafs";
  const APP_VERSION = "1.1.3";

  // Textes de secours
  const TEXTS = {
    message: "New version available",
    version: "Version",
    button: "Download",
  };

  const UPDATE_URL = "https://quran-58c7cd.gitlab.io/updates.json";
  const CHECK_DELAY_MS = 5000;
  const FALLBACK_DELAY_MS = 15000;
  const FETCH_TIMEOUT_MS = 8000;
  const RECHECK_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;
  const DEFAULT_COLOR = "#1a5e25";

  // ---------- État ----------

  let dismissedVersion = null;
  let checking = false;
  let lastSuccess = 0;

  window.APP_VERSION = APP_VERSION;
  window.APP_ID = APP_ID; // lu par main.js (riwaya active, nom de l'événement « prêt »)

  // ---------- Sanitisation ----------

  function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeUrl(raw) {
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : null;
  }

  function safeColor(raw) {
    return typeof raw === "string" && /^#[0-9a-f]{3,8}$/i.test(raw.trim()) ? raw.trim() : DEFAULT_COLOR;
  }

  // ---------- Comparaison de versions ----------

  function toVersionParts(version) {
    return version.split(".").map((n) => parseInt(n, 10) || 0);
  }

  function isNewerVersion(remote, local) {
    if (typeof remote !== "string" || typeof local !== "string") return false;
    const r = toVersionParts(remote);
    const l = toVersionParts(local);
    for (let i = 0; i < Math.max(r.length, l.length); i++) {
      if ((r[i] || 0) > (l[i] || 0)) return true;
      if ((r[i] || 0) < (l[i] || 0)) return false;
    }
    return false;
  }

  // ---------- Bannière ----------

  function showUpdateBanner(app) {
    if (!app || typeof app !== "object" || !document.body) return;

    document.getElementById("update-banner")?.remove();

    const color = safeColor(app.color);
    const message = escapeHtml(app.message || TEXTS.message);
    const version = escapeHtml(app.version || "");
    const log = escapeHtml(app.log || "");
    const url = safeUrl(app.url);
    const btnText = escapeHtml(app.button_text || TEXTS.button);
    const logHtml = log ? `<div style="font-size:0.85rem;margin-top:4px;">📝 ${log}</div>` : "";

    const banner = document.createElement("div");
    banner.id = "update-banner";
    banner.style.cssText = "position:fixed;top:0;left:0;width:100%;z-index:9999;box-sizing:border-box;";
    banner.innerHTML = `<div style="background:${color};color:white;padding:calc(10px + env(safe-area-inset-top, 0px)) 10px 10px;display:flex;flex-direction:column;position:relative;">
    <div style="display:flex;align-items:flex-end;justify-content:space-between;width:100%;">
      <div style="flex:1;">
        <div style="font-weight:bold;margin-bottom:2px;">${message}</div>
        <div style="font-size:0.9rem;">${escapeHtml(TEXTS.version)} ${version}</div>
        ${logHtml}
      </div>
      <button id="download-btn" type="button" style="background:white;color:${color};border:none;padding:10px;border-radius:4px;font-weight:bold;cursor:pointer;white-space:nowrap;">${btnText}</button>
    </div>
    <button id="close-btn" type="button" style="background:none;border:none;color:white;cursor:pointer;font-size:20px;width:40px;display:flex;align-items:center;justify-content:center;margin:auto;">×</button>
  </div>`;

    document.body.prepend(banner);

    banner.querySelector("#download-btn").addEventListener("click", () => {
      if (url) window.open(url, window.cordova ? "_system" : "_blank");
    });
    banner.querySelector("#close-btn").addEventListener("click", () => {
      dismissedVersion = app.version;
      banner.remove();
    });
  }

  // ---------- Vérification réseau ----------

  window.updateChecker = {
    check() {
      if (checking) return;
      checking = true;

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

      fetch(`${UPDATE_URL}?t=${Date.now()}`, { signal: ctrl.signal })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          lastSuccess = Date.now();
          const app = data?.apps?.[APP_ID];
          if (!app || typeof app.version !== "string") return;
          if (app.version === dismissedVersion) return;
          if (isNewerVersion(app.version, APP_VERSION)) showUpdateBanner(app);
        })
        .catch(() => {
          // réseau indisponible : on réessaiera plus tard
        })
        .finally(() => {
          clearTimeout(timer);
          checking = false;
        });
    },
  };

  // ---------- Déclenchement ----------

  let fired = false;

  const run = () => {
    if (fired) return;
    fired = true;
    window.updateChecker.check();
  };

  window.addEventListener(`${APP_ID}:appReady`, () => setTimeout(run, CHECK_DELAY_MS), { once: true });
  setTimeout(run, FALLBACK_DELAY_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !fired) return;
    if (Date.now() - lastSuccess < RECHECK_MIN_INTERVAL_MS) return;
    window.updateChecker.check();
  });
})();