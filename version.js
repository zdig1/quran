(function () {
  "use strict";
  const APP_ID = "quranreader";
  const APP_VERSION = "1.0.6";
  function safe(text) {
    return text
      ? text
          .toString()
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")
      : "";
  }

  window.updateChecker = {
    check: function () {
      fetch("https://quran-58c7cd.gitlab.io/updates.json?t=" + Date.now())
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          const app = data.apps[APP_ID];
          if (!app) return;

          const remote = app.version.split(".").map(Number);
          const local = APP_VERSION.split(".").map(Number);
          let isNewer = false;

          for (let i = 0; i < 3; i++) {
            if (remote[i] > local[i]) {
              isNewer = true;
              break;
            }
            if (remote[i] < local[i]) break;
          }
          if (!isNewer) return;
          const color = safe(app.color);
          const message = safe(app.message || "Nouvelle version disponible");
          const version = safe(app.version);
          const log = safe(app.log || "");
          const url = app.url && app.url.startsWith("http") ? app.url : "#";
          const btnText = app.button_text
            ? safe(app.button_text)
            : "تحميــل";
          const logHtml = log
            ? `<div style="font-size:0.85rem;margin-top:4px;">📝 ${log}</div>`
            : "";
          const banner = document.createElement("div");
          banner.id = "update-banner";
          banner.style.cssText =
            "position:fixed;top:0;left:0;width:100%;z-index:9999;box-sizing:border-box;";
          banner.innerHTML = `
            <div style="background:${color};color:white;padding:10px;display:flex;flex-direction:column;">
              <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
                <div style="flex:1;">
                  <div style="font-weight:bold;margin-bottom:2px;">${message}</div>
                  <div style="font-size:0.9rem;">v${version}</div>
                  ${logHtml}
                </div>
                <button id="update-download-btn" style="background:white;color:${color};border:none;padding:10px;border-radius:4px;font-weight:bold;cursor:pointer;">${btnText}</button>
              </div>
              <button id="update-close-btn" style="background:none;border:none;color:white;cursor:pointer;font-size:20px;margin:4px auto 0;">×</button>
            </div>`;
          document.body.prepend(banner);
          document
            .getElementById("update-download-btn")
            .addEventListener("click", function () {
              window.open(url, "_blank");
            });
          document
            .getElementById("update-close-btn")
            .addEventListener("click", function () {
              banner.remove();
            });
        })
        .catch(function () {});
    },
  };
  setTimeout(function () {
    window.updateChecker.check();
  }, 3000);
})();
