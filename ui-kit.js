// ============================================================
//  FICHIER : ui-kit.js
//  Rôle : socle partagé (constantes, utilitaires DOM/temps/UI,
//         stockage localStorage, listes, menus déroulants,
//         sélecteurs plein écran et couple sourate/verset)
// ============================================================

// ============================================================
//  1. CONFIGURATION ET CONSTANTES
// ============================================================

window.ACTIVE_RIWAYA = ["hafs", "warsh", "qaloon"].includes(window.APP_ID) ? window.APP_ID : "hafs";

const APP_CFG = Object.freeze({
  TOTAL_PAGES: 604,
  TOTAL_SURAHS: 114,
});

const STORAGE_KEYS = Object.freeze({
  prefix: "quran_",
  bookmarks: "quran_bookmarks",
  lastPage: "quran_lastPage",
  theme: "quran_theme",
  pinned: "quran_pinnedSurahs",
});

const APP_EVENTS = Object.freeze({
  pageChanged: "quran:pageChanged",
  bookmarkChanged: "quran:bookmarkChanged",
  readingModeChanged: "quran:readingModeChanged",
  pinnedUpdated: "quran:pinnedSurahsUpdated",
  prefsImported: "quran:preferencesImported",
  buttonsVisibility: "quran:buttonsVisibilityChanged",
  menuToggle: "quran:menuToggle",
  overlayOpened: "quran:overlayOpened",
  overlayClosed: "quran:overlayClosed",
});

const APP_TEXTS = Object.freeze({
  pickSurah: "اختر السورة",
  pickAyah: "اختر الآية",
  pickPage: "اختر الصفحة",
  ayahWord: "الآية",
  pageShort: "ص",
});

// ============================================================
//  2. APPUTILS — OUTILS PARTAGÉS, GESTES ET TOAST
// ============================================================

const AppUtils = {
  _toastTimeout: null,
  _toastHideTimeout: null,

  esc(text) {
    if (text === null || text === undefined) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  el(tag, className = "", text = null) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== null) node.textContent = text;
    return node;
  },

  clamp: (value, min, max) => Math.min(Math.max(value, min), max),

  pad3: (n) => String(n).padStart(3, "0"),

  isValidPage: (p) => Number.isInteger(p) && p >= 1 && p <= APP_CFG.TOTAL_PAGES,

  isValidSurahId: (id) => Number.isInteger(id) && id >= 1 && id <= APP_CFG.TOTAL_SURAHS,

  debounce(fn, delay) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  withTimeout(promise, ms) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Timeout")), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  },

  cssVar(name, fallback = "") {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  },

  cssMs(name, fallbackMs) {
    const v = AppUtils.cssVar(name);
    const n = parseFloat(v);
    if (isNaN(n)) return fallbackMs;
    return /ms$/.test(v) ? n : n * 1000;
  },

  cssPx(name, fallbackPx) {
    const v = AppUtils.cssVar(name);
    const n = parseFloat(v);
    if (isNaN(n)) return fallbackPx;
    return /rem$/.test(v) ? n * parseFloat(getComputedStyle(document.documentElement).fontSize) : n;
  },

  centerIn(container, el, ratio = 1 / 3) {
    const relativeTop =
      el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
    const top = relativeTop - container.clientHeight * ratio + el.clientHeight / 2;
    container.scrollTop = Math.max(0, top);
  },

  nextFrame: () => new Promise((resolve) => requestAnimationFrame(resolve)),

  afterFrames(fn, frames = 2) {
    const step = (n) => requestAnimationFrame(() => (n <= 1 ? fn() : step(n - 1)));
    step(frames);
  },

  emit(name, detail = undefined) {
    window.dispatchEvent(new CustomEvent(name, detail === undefined ? undefined : { detail }));
  },

  onSwipe(element, { onSwipeLeft, onSwipeRight, threshold = 50, cooldown = 300 } = {}) {
    if (!element) return () => {};
    let startX = 0;
    let startY = 0;
    let lastSwipeTime = 0;

    const onTouchStart = (e) => {
      if (!e.touches?.length) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onTouchEnd = (e) => {
      if (!e.changedTouches?.length) return;
      const now = Date.now();
      if (now - lastSwipeTime < cooldown) return;
      const dx = startX - e.changedTouches[0].clientX;
      const dy = startY - e.changedTouches[0].clientY;
      if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
        lastSwipeTime = now;
        if (dx < 0) onSwipeLeft?.();
        else onSwipeRight?.();
      }
    };

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchend", onTouchEnd);
    };
  },

  clearToastTimers() {
    clearTimeout(AppUtils._toastTimeout);
    clearTimeout(AppUtils._toastHideTimeout);
    AppUtils._toastTimeout = null;
    AppUtils._toastHideTimeout = null;
  },

  toast(message, duration = 2000) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    AppUtils.clearToastTimers();
    toast.textContent = message;
    toast.style.display = "block";
    toast.style.opacity = "1";
    AppUtils._toastTimeout = setTimeout(() => {
      toast.style.opacity = "0";
      AppUtils._toastHideTimeout = setTimeout(() => {
        toast.style.display = "none";
      }, AppUtils.cssMs("--toast-fade", 300));
    }, duration);
  },
};

// ============================================================
//  3. APPSTORE — ACCÈS SÛR À LOCALSTORAGE
// ============================================================

const AppStore = {
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, String(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignoré */
    }
  },

  getJSON(key, defaultValue = null) {
    const raw = AppStore.get(key);
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  },

  setJSON(key, value) {
    return AppStore.set(key, JSON.stringify(value));
  },
};

// ============================================================
//  4. LISTITEMRENDERER — ÉLÉMENTS DE LISTE
// ============================================================

class ListItemRenderer {
  static createContainer(type, id = null) {
    const div = AppUtils.el("div", `item-container item-${type}`);
    if (id) div.setAttribute(`data-${type}-id`, id);
    return div;
  }

  static buildLine1({ rightElements = [], leftElements = [] }) {
    const line = AppUtils.el("div", "item-line-1");
    const right = AppUtils.el("div", "item-right");
    const left = AppUtils.el("div", "item-left");
    right.append(...rightElements);
    left.append(...leftElements);
    line.append(right, left);
    return line;
  }

  static createBadge(text, extraClass = "") {
    return AppUtils.el("span", `item-badge badge ${extraClass}`, text);
  }

  static createTitle(text) {
    return AppUtils.el("span", "item-title", text);
  }

  static createPageTag(page) {
    return AppUtils.el("span", "page-tag", `${APP_TEXTS.pageShort} ${page}`);
  }

  static createIcon(icon, extraClass = "") {
    return AppUtils.el("span", `item-icon ${extraClass}`, icon);
  }
}

// ============================================================
//  5. CUSTOMSELECT — MENUS DÉROULANTS
// ============================================================

class CustomSelect {
  static _initialized = false;

  static initToggle() {
    if (CustomSelect._initialized) return;
    CustomSelect._initialized = true;
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".custom-select-btn");
      const wrap = btn?.closest(".custom-select");
      const wasOpen = wrap?.classList.contains("open");
      document.querySelectorAll(".custom-select.open").forEach((w) => w.classList.remove("open"));
      if (wrap && !wasOpen) {
        wrap.classList.add("open");
        CustomSelect.scrollToSelectedOption(wrap);
      }
    });
  }

  static scrollToSelectedOption(wrap) {
    const dropdown = wrap?.querySelector(".custom-select-dropdown");
    const selected = dropdown?.querySelector(".custom-select-option.selected");
    if (!selected) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const top = selected.offsetTop - dropdown.clientHeight / 4 + selected.clientHeight / 2;
        dropdown.scrollTo({ top: Math.max(0, top), behavior: "auto" });
      });
    });
  }

  static markup(id, placeholder) {
    return `<div class="custom-select" id="${id}Wrap">
      <button type="button" class="custom-select-btn" id="${id}">
        <span class="custom-select-val">${AppUtils.esc(placeholder)}</span><span class="custom-select-arrow">▾</span>
      </button>
      <div class="custom-select-dropdown" id="${id}List"></div>
    </div>`;
  }

  static render(listId, options) {
    const list = document.getElementById(listId);
    if (!list) return;
    const nodes = [];
    let currentGroup = null;

    options.forEach((opt) => {
      if (opt.group && opt.group !== currentGroup) {
        currentGroup = opt.group;
        nodes.push(AppUtils.el("div", "custom-select-group", opt.group));
      }

      const optEl = AppUtils.el("div", "custom-select-option", opt.label);
      optEl.dataset.value = opt.value;

      optEl.addEventListener("click", (e) => {
        e.stopPropagation();
        list.querySelectorAll(".custom-select-option").forEach((o) => o.classList.remove("selected"));
        optEl.classList.add("selected");
        const wrap = list.closest(".custom-select");
        const val = wrap?.querySelector(".custom-select-val");
        if (val) val.textContent = opt.label;
        wrap?.classList.remove("open");
        if (opt.value !== "" && opt.onSelect) opt.onSelect(opt.value);
      });
      nodes.push(optEl);
    });

    list.replaceChildren(...nodes);
  }

  static setValue(btnId, listId, value) {
    const list = document.getElementById(listId);
    const btn = document.getElementById(btnId);
    if (!list || !btn) return;

    const opt = list.querySelector(`[data-value="${String(value)}"]`);
    if (!opt) return;

    list.querySelectorAll(".custom-select-option").forEach((o) => o.classList.remove("selected"));
    opt.classList.add("selected");

    const valEl = btn.querySelector(".custom-select-val");
    if (valEl) {
      const nm = (opt.querySelector(".reciter-name") || opt).textContent.trim();
      valEl.textContent = opt.querySelector(".pin-reciter-btn.pinned") ? `💫 ${nm}` : nm;
    }
    if (list.closest(".custom-select")?.classList.contains("open")) {
      CustomSelect._keepVisible(list, opt);
    }
  }

  static getValue(listId) {
    return document.getElementById(listId)?.querySelector(".selected")?.dataset.value || "";
  }

  static _keepVisible(list, opt) {
    const optTop = opt.offsetTop;
    const optBottom = optTop + opt.offsetHeight;
    const viewTop = list.scrollTop;
    const viewBottom = viewTop + list.clientHeight;
    if (optTop < viewTop) {
      list.scrollTop = optTop - 10;
    } else if (optBottom > viewBottom) {
      list.scrollTop = optBottom - list.clientHeight + list.clientHeight / 3;
    }
  }

  static fill(id, options) {
    CustomSelect.render(`${id}List`, options);
  }

  static set(id, value) {
    CustomSelect.setValue(id, `${id}List`, value);
  }

  static get(id) {
    return CustomSelect.getValue(`${id}List`);
  }

  static surahOptions(onSelect) {
    const surahs = window.quranCalculator?.getAllSurahs?.() || [];
    return surahs.map((s) => ({
      value: String(s.s_id),
      label: `${s.s_id}. ${s.name}`,
      onSelect,
    }));
  }

  static ayahOptions(surahId, onSelect) {
    const total = window.AyaPicker?.totalOf(Number(surahId)) || 0;
    return Array.from({ length: total }, (_, i) => ({
      value: String(i + 1),
      label: `${APP_TEXTS.ayahWord} ${i + 1}`,
      onSelect,
    }));
  }

  static pageOptions(onSelect) {
    return Array.from({ length: APP_CFG.TOTAL_PAGES }, (_, i) => ({
      value: String(i + 1),
      label: `الصفحة ${i + 1}`,
      onSelect,
    }));
  }
}

// ============================================================
//  6. PICKER — SÉLECTEUR PLEIN ÉCRAN
// ============================================================

window.Picker = (() => {
  let box = null;

  const ensure = () => {
    if (box) return box;
    box = AppUtils.el("div", "mini-overlay");
    box.id = "pickerOverlay";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.innerHTML = `<div class="mini-overlay-content">
      <div class="mini-overlay-header">
        <span class="mini-overlay-title"></span>
        <button type="button" class="close-btn" aria-label="إغلاق">✕</button>
      </div>
      <div class="mini-overlay-body"></div>
    </div>`;
    document.body.appendChild(box);
    box.addEventListener("click", (e) => {
      if (e.target === box) close();
    });
    box.querySelector(".close-btn").addEventListener("click", close);
    return box;
  };

  function close() {
    if (!box?.classList.contains("show")) return false;
    box.classList.remove("show");
    return true;
  }

  const centerCurrent = (body) => {
    const current = body.querySelector(".choice-current");
    if (current) AppUtils.centerIn(body, current, 1 / 3);
  };

  const row = (label, { current = false, onClick, pin = null }) => {
    const r = AppUtils.el("div", "pick-row" + (current ? " choice-current" : ""));
    if (pin) {
      const b = AppUtils.el("button", "pick-pin" + (pin.active ? " pinned" : ""), pin.active ? "💫" : "📌");
      b.type = "button";
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        pin.onToggle();
      });
      r.appendChild(b);
    }
    r.appendChild(AppUtils.el("span", "pick-label", label));

    if (current) r.appendChild(AppUtils.el("span", "pick-check", "🟢"));
    r.addEventListener("click", onClick);
    return r;
  };

  const show = (title, build) => {
    const b = ensure();
    b.querySelector(".mini-overlay-title").textContent = title;
    const body = b.querySelector(".mini-overlay-body");
    const render = (keepScroll) => {
      const scrollTop = body.scrollTop;
      body.replaceChildren(...build(render));
      if (keepScroll) body.scrollTop = scrollTop;
      else centerCurrent(body);
    };
    b.classList.add("show");
    render(false);
  };

  const open = (title, items, current, onSelect) =>
    show(title, () =>
      items.map((it) =>
        row(it.label, {
          current: String(it.value) === String(current),
          onClick: () => {
            close();
            onSelect(it.value);
          },
        }),
      ),
    );

  const fromList = (listId, title) =>
    show(title, (rerender) => {
      const list = document.getElementById(listId);
      if (!list) return [];
      return [...list.children].map((el) => {
        if (el.classList.contains("custom-select-group")) {
          return AppUtils.el("div", "pick-group", el.textContent);
        }
        const label = (el.querySelector(".reciter-name") || el).textContent.trim();
        const pinBtn = el.querySelector(".pin-reciter-btn");
        return row(label, {
          current: el.classList.contains("selected"),
          onClick: () => {
            close();
            el.click();
          },
          pin: pinBtn
            ? {
                active: pinBtn.classList.contains("pinned"),
                onToggle: () => {
                  pinBtn.click();
                  rerender(true);
                },
              }
            : null,
        });
      });
    });

  const bindButton = (btn, listId, title) =>
    btn?.addEventListener("click", (e) => {
      e.stopPropagation();
      fromList(listId, title);
    });

  return { open, close, fromList, bindButton };
})();

// ============================================================
//  7. AYAPICKER — COUPLE SOURATE / VERSET
// ============================================================

window.AyaPicker = (() => {
  const surahs = () => window.quranCalculator?.getAllSurahs?.() || [];
  const surahOf = (id) => surahs().find((s) => s.s_id === id);

  const totalOf = (id) => surahOf(id)?.verses_count || 0;
  const surahStartPage = (id) => surahOf(id)?.page_start || null;
  const surahLabel = (id) => `${id}. ${surahOf(id)?.name || ""}`;
  const ayaLabel = (a) => `${APP_TEXTS.ayahWord} ${a}`;

  const pickBtn = (id, label) =>
    `<button type="button" class="custom-select-btn" id="${id}"><span class="custom-select-val">${AppUtils.esc(label)}</span><span class="custom-select-arrow">▾</span></button>`;

  const pairHtml = (id, p) =>
    `<div class="aya-pair">${pickBtn(id + "S", surahLabel(p.s))}${pickBtn(id + "A", ayaLabel(p.a))}</div>`;

  const bindPair = (root, id, p, onChange) => {
    const sBtn = root.querySelector(`#${id}S`);
    const aBtn = root.querySelector(`#${id}A`);
    const setText = (btn, text) => {
      btn.querySelector(".custom-select-val").textContent = text;
    };
    const refresh = () => {
      setText(sBtn, surahLabel(p.s));
      setText(aBtn, ayaLabel(p.a));
    };

    sBtn.addEventListener("click", () =>
      window.Picker.open(
        APP_TEXTS.pickSurah,
        surahs().map((s) => ({ value: s.s_id, label: surahLabel(s.s_id) })),
        p.s,
        (v) => {
          p.s = +v;
          p.a = 1;
          refresh();
          onChange?.(id);
        },
      ),
    );

    aBtn.addEventListener("click", () =>
      window.Picker.open(
        APP_TEXTS.pickAyah,
        Array.from({ length: totalOf(p.s) || 1 }, (_, i) => ({ value: i + 1, label: ayaLabel(i + 1) })),
        p.a,
        (v) => {
          p.a = +v;
          refresh();
          onChange?.(id);
        },
      ),
    );

    return { refresh };
  };

  const currentPos = () => {
    const player = window.quranAudioPlayer;
    if (player?.currentSurah && player?.currentAyah) {
      return { s: player.currentSurah, a: player.currentAyah };
    }
    const page = window.quranApp?.getCurrentPage?.() || 1;
    const first = player?._getFirstAyahOfPage?.(page);
    if (first) return { s: first.surah, a: first.ayah };
    const surah = window.quranCalculator?.getFirstSurahForPage?.(page);
    return { s: surah?.s_id || 1, a: 1 };
  };

  return { surahs, totalOf, surahStartPage, pairHtml, bindPair, currentPos };
})();

// ============================================================
//  8. EXPOSITION GLOBALE ET INITIALISATION UI
// ============================================================

window.AppUtils = AppUtils;
window.AppStore = AppStore;
window.ListItemRenderer = ListItemRenderer;
window.CustomSelect = CustomSelect;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => CustomSelect.initToggle());
} else {
  CustomSelect.initToggle();
}