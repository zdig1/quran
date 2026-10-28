// ============================================================
//  FICHIER : main.js
//  Rôle : moteur de l'application (état, stockage, signets, thème,
//         toast, événements) + outils partagés par tous les scripts
//         (utilitaires, listes, menus déroulants, pickers)
//
//  SOMMAIRE
//   1. Configuration et constantes
//   2. AppUtils  — petits outils partagés
//   3. AppStore  — accès sûr à localStorage
//   4. QuranApp  — moteur de l'application
//   5. ListItemRenderer — éléments de liste
//   6. CustomSelect — menus déroulants
//   7. Picker    — sélecteur plein écran
//   8. AyaPicker — couple sourate / verset
//   9. Démarrage et gestion d'erreurs
// ============================================================

// ============================================================
//  1. CONFIGURATION ET CONSTANTES
// ============================================================

// Riwaya active = identifiant de l'application (APP_ID dans version.js) : "hafs" | "warsh" | "qaloon"
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
//  2. APPUTILS — PETITS OUTILS PARTAGÉS
// ============================================================

const AppUtils = {
  /** Échappe le HTML (null / undefined → chaîne vide). */
  esc(text) {
    if (text === null || text === undefined) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  /** Crée un élément : el("div", "classe", "texte"). */
  el(tag, className = "", text = null) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== null) node.textContent = text;
    return node;
  },

  clamp: (value, min, max) => Math.min(Math.max(value, min), max),

  /** 7 → "007" (fichiers audio, images de pages). */
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

  /** Rejette la promesse si elle dépasse `ms` millisecondes. */
  withTimeout(promise, ms) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Timeout")), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  },

  /** Lit une variable CSS ("--x") ; `fallback` si elle est absente ou si la feuille de style n'est pas chargée. */
  cssVar(name, fallback = "") {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  },

  /** Variable CSS de durée ("0.3s" ou "300ms") → millisecondes. */
  cssMs(name, fallbackMs) {
    const v = AppUtils.cssVar(name);
    const n = parseFloat(v);
    if (isNaN(n)) return fallbackMs;
    return /ms$/.test(v) ? n : n * 1000;
  },

  /** Variable CSS de longueur ("56px" ou "3.5rem") → pixels. */
  cssPx(name, fallbackPx) {
    const v = AppUtils.cssVar(name);
    const n = parseFloat(v);
    if (isNaN(n)) return fallbackPx;
    return /rem$/.test(v) ? n * parseFloat(getComputedStyle(document.documentElement).fontSize) : n;
  },

  /** Fait défiler `container` pour placer `el` à `ratio` de sa hauteur. */
  centerIn(container, el, ratio = 1 / 3) {
    const relativeTop =
      el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
    const top = relativeTop - container.clientHeight * ratio + el.clientHeight / 2;
    container.scrollTop = Math.max(0, top);
  },

  /** Promesse résolue à la prochaine image affichée. */
  nextFrame: () => new Promise((resolve) => requestAnimationFrame(resolve)),

  /** Exécute `fn` après `frames` images (2 par défaut : après le rendu). */
  afterFrames(fn, frames = 2) {
    const step = (n) => requestAnimationFrame(() => (n <= 1 ? fn() : step(n - 1)));
    step(frames);
  },

  /** Envoie un événement personnalisé sur window. */
  emit(name, detail = undefined) {
    window.dispatchEvent(new CustomEvent(name, detail === undefined ? undefined : { detail }));
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

  /** Lit un JSON ; renvoie `defaultValue` si absent ou corrompu. */
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
//  4. QURANAPP — MOTEUR DE L'APPLICATION
// ============================================================

class QuranApp {
  // ---------- Constructeur ----------

  constructor() {
    this.isInitialized = false;
    this.isInitializing = false;

    // État persistant
    this.bookmarks = [];
    this.bookmarkedPagesSet = new Set();
    this.pinnedSurahs = [];
    this.lastPage = 1;
    this.theme = "light";

    // Tafsir
    this.tafsirLoaded = false;
    this.tafsirLoading = false;
    this.tafsirLoadQueue = [];

    // Écouteurs et minuteurs
    this._listeners = [];
    this._toastTimeout = null;
    this._toastHideTimeout = null;
    this._savePageTimeout = null;
    this._lastBack = 0;
  }

  // ---------- Helpers privés ----------

  /** Retrouve un signet par identifiant (ou null). */
  _findBookmark(id) {
    return this.bookmarks.find((b) => b.id === id) || null;
  }

  /** Vrai si le menu principal est ouvert. */
  _isMenuOpen() {
    return !!document.querySelector(".menu-overlay.show");
  }


  /** Annule les deux minuteurs du toast (affichage + masquage). */
  _clearToastTimers() {
    clearTimeout(this._toastTimeout);
    clearTimeout(this._toastHideTimeout);
    this._toastTimeout = null;
    this._toastHideTimeout = null;
  }

  /** Normalise une liste d'identifiants de sourates épinglées. */
  _normalizePinnedSurahs(list) {
    return Array.isArray(list) ? list.filter(AppUtils.isValidSurahId) : [];
  }

  /** Vrai si le mode nuit est actif. */
  _isNightMode() {
    return document.body.classList.contains("night-mode");
  }

  // ---------- Initialisation ----------

  async init() {
    if (this.isInitializing) return;
    if (this.isInitialized) this.destroy();
    this.isInitializing = true;
    try {
      this.restoreFromLocalStorage();
      this.applyTheme();
      await this.initCalculator();
      await this.initReader();
      this.initOverlays();
      this.setupEventListeners();
      this.updateBookmarkIcon(this.lastPage);
      this.setupCleanupHandlers();
      this.isInitialized = true;
      AppUtils.emit((window.APP_ID || "quranreader") + ":appReady");
    } catch (err) {
      this.showToast("❌ خطأ في تحميل التطبيق");
      AppUtils.emit("quran:appError", { error: err.message });
    } finally {
      this.isInitializing = false;
    }
  }

  _requireModule(name, label) {
    const mod = window[name];
    if (!mod) throw new Error(`Module ${label} non trouvé`);
    return mod;
  }

  async initCalculator() {
    await this._requireModule("quranCalculator", "Calculator").load();
    this._migrateBookmarks();
  }

  async initReader() {
    await this._requireModule("quranReader", "Reader").init({}, this.lastPage);
  }

  initOverlays() {
    this._requireModule("overlayManager", "OverlayManager").init({ app: this });
  }

  // ---------- Persistance ----------

  restoreFromLocalStorage() {
    const bookmarks = AppStore.getJSON(STORAGE_KEYS.bookmarks, []);
    this.bookmarks = (Array.isArray(bookmarks) ? bookmarks : [])
      .filter((b) => b && typeof b === "object")
      .map((b, i) => this._normalizeBookmark(b, i));
    this._updateBookmarkedPagesSet();

    const page = parseInt(AppStore.get(STORAGE_KEYS.lastPage), 10);
    this.lastPage = AppUtils.isValidPage(page) ? page : 1;

    this.theme = AppStore.get(STORAGE_KEYS.theme) === "night" ? "night" : "light";

    const pinned = AppStore.getJSON(STORAGE_KEYS.pinned, []);
    this.pinnedSurahs = this._normalizePinnedSurahs(pinned);
  }

  saveToLocalStorage() {
    clearTimeout(this._savePageTimeout); // écriture immédiate : on annule le debounce
    AppStore.setJSON(STORAGE_KEYS.bookmarks, this.bookmarks);
    AppStore.set(STORAGE_KEYS.lastPage, this.lastPage);
    AppStore.set(STORAGE_KEYS.theme, this.theme);
    AppStore.setJSON(STORAGE_KEYS.pinned, this.pinnedSurahs);
    const mode = window.quranReader?.readingMode;
    if (mode) AppStore.set("quran_readingMode", mode);
  }

  _saveCurrentState() {
    if (!this.isInitialized) return;
    const readerPage = window.quranReader?.getCurrentPage?.();
    if (readerPage) this.lastPage = readerPage;
    this.saveToLocalStorage();
  }

  // ---------- Préférences (clés préfixées « quran_ ») ----------

  setPreference(key, value) {
    AppStore.set(STORAGE_KEYS.prefix + key, value);
  }

  getPreference(key, defaultValue = null) {
    return AppStore.get(STORAGE_KEYS.prefix + key, defaultValue);
  }

  setPreferenceJSON(key, value) {
    AppStore.setJSON(STORAGE_KEYS.prefix + key, value);
  }

  getPreferenceJSON(key, defaultValue = null) {
    return AppStore.getJSON(STORAGE_KEYS.prefix + key, defaultValue);
  }

  // ---------- Utilitaires exposés aux autres scripts ----------

  escapeHtml(text) {
    return AppUtils.esc(text);
  }

  /** Détecte un balayage horizontal. Retourne une fonction de nettoyage. */
  enableSwipe(element, onSwipeLeft, onSwipeRight, threshold = 50, cooldown = 300) {
    if (!element) return;
    let startX = 0;
    let startY = 0;
    let lastSwipeTime = 0;

    const onTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onTouchEnd = (e) => {
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
  }

  // ---------- Navigation ----------

  getCurrentPage() {
    return window.quranReader?.getCurrentPage?.() || this.lastPage;
  }

  updateCurrentPage(page) {
    const pageNum = parseInt(page, 10);
    if (!AppUtils.isValidPage(pageNum)) return;
    this.lastPage = pageNum;
    // Debounce : évite d'écrire localStorage à chaque page défilée
    clearTimeout(this._savePageTimeout);
    this._savePageTimeout = setTimeout(
      () => AppStore.set(STORAGE_KEYS.lastPage, pageNum),
      500,
    );
  }

  goToPage(page) {
    window.quranReader?.goToPage(page);
  }

  // ---------- Sourates épinglées ----------

  togglePinSurah(surahId) {
    const idx = this.pinnedSurahs.indexOf(surahId);
    const added = idx === -1;
    if (added) this.pinnedSurahs.push(surahId);
    else this.pinnedSurahs.splice(idx, 1);
    this.saveToLocalStorage();
    AppUtils.emit(APP_EVENTS.pinnedUpdated);
    return added;
  }

  getPinnedSurahs() {
    return [...this.pinnedSurahs];
  }

  // ---------- Signets ----------

  getBookmarks() {
    return [...this.bookmarks];
  }

  _makeBookmarkId(page, index = 0) {
    return `bookmark_${page}_${Date.now()}_${index}`;
  }

  /** Complète un signet : id et date de modification. */
  _normalizeBookmark(bookmark, index = 0) {
    return {
      ...bookmark,
      id: bookmark.id || this._makeBookmarkId(bookmark.page, index),
      lastModified: bookmark.lastModified || bookmark.date || new Date().toISOString(),
    };
  }

  _surahIdForPage(page) {
    return window.quranCalculator?.getFirstSurahForPage?.(page)?.s_id ?? null;
  }

  /** Ajoute la sourate aux anciens signets qui n'en ont pas. */
  _migrateBookmarks() {
    if (!window.quranCalculator?.isLoaded) return;
    let changed = false;
    this.bookmarks = this.bookmarks.map((b) => {
      if (b.surahId || !b.page) return b;
      const surahId = this._surahIdForPage(b.page);
      if (!surahId) return b;
      changed = true;
      return { ...b, surahId };
    });
    if (changed) this.saveToLocalStorage();
  }

  _updateBookmarkedPagesSet() {
    this.bookmarkedPagesSet = new Set(this.bookmarks.map((b) => b.page));
  }

  /** Étape finale commune : tri, index, sauvegarde, icônes, événement. */
  _commitBookmarks(pagesToRefresh = []) {
    this.bookmarks.sort((a, b) => a.page - b.page);
    this._updateBookmarkedPagesSet();
    this.saveToLocalStorage();
    pagesToRefresh.forEach((p) => this.updateBookmarkIcon(p));
    AppUtils.emit(APP_EVENTS.bookmarkChanged);
  }

  addBookmark(bookmark) {
    if (!bookmark.lastModified) bookmark.lastModified = new Date().toISOString();
    if (!bookmark.surahId && bookmark.page) {
      const surahId = this._surahIdForPage(bookmark.page);
      if (surahId) bookmark.surahId = surahId;
    }
    this.bookmarks.push(bookmark);
    this._commitBookmarks([bookmark.page]);
  }

  replaceBookmarkPage(bookmarkId, newPage) {
    const page = Number(newPage);
    const bookmark = this._findBookmark(bookmarkId);
    if (!bookmark || !AppUtils.isValidPage(page)) return false;
    const oldPage = bookmark.page;
    bookmark.page = page;
    bookmark.lastModified = new Date().toISOString();
    bookmark.surahId = this._surahIdForPage(page);
    this._commitBookmarks([oldPage, page]);
    return true;
  }

  removeBookmarkById(bookmarkId) {
    const idx = this.bookmarks.findIndex((b) => b.id === bookmarkId);
    if (idx === -1) return false;
    const [removed] = this.bookmarks.splice(idx, 1);
    this._commitBookmarks([removed.page]);
    return true;
  }

  updateBookmark(bookmarkId, newName) {
    const bookmark = this._findBookmark(bookmarkId);
    if (!bookmark) return false;
    bookmark.name = newName.trim() || `صفحة ${bookmark.page}`;
    bookmark.lastModified = new Date().toISOString();
    this._commitBookmarks();
    return true;
  }

  updateBookmarkIcon(page) {
    const icon = document.getElementById("bookmarkIcon");
    if (!icon) return;
    const has = this.bookmarkedPagesSet.has(page);
    icon.textContent = has ? "⭐" : "🔖";
    icon.title = has ? "علامة مرجعية موجودة" : "إضافة علامة مرجعية";
  }

  // ---------- Export / import des données utilisateur ----------

  _riwayas() {
    return Object.keys(window.RIWAYAT_CONFIG || {});
  }

  /** Exporte signets, épingles, récitateurs, dernière page et thème. */
  exportUserData() {
    const pinnedReciters = {};
    const activeReciters = {};
    this._riwayas().forEach((riwaya) => {
      const pinned = this.getPreferenceJSON(`pinnedReciters_${riwaya}`, null);
      if (pinned) pinnedReciters[riwaya] = pinned;
      const active = this.getPreference(`reciter_${riwaya}`);
      if (active) activeReciters[riwaya] = active;
    });
    return JSON.stringify(
      {
        bookmarks: this.bookmarks,
        pinnedSurahs: this.pinnedSurahs,
        pinnedReciters,
        activeReciters,
        lastPage: this.lastPage,
        theme: this.theme,
      },
      null,
      2,
    );
  }

  /** Importe un JSON exporté. `merge` = fusionner au lieu de remplacer. */
  importUserData(jsonString, merge = false) {
    try {
      const imported = JSON.parse(jsonString);
      if (!imported || !Array.isArray(imported.bookmarks)) throw new Error("Format inconnu");
      const allValid = imported.bookmarks.every(
        (b) => b && typeof b === "object" && AppUtils.isValidPage(b.page),
      );
      if (!allValid) throw new Error("Signets invalides");

      this._importBookmarksAndPins(imported, merge);
      this._importReciters(imported, merge);
      this._importPageAndTheme(imported);

      this.saveToLocalStorage();
      AppUtils.emit(APP_EVENTS.bookmarkChanged);
      AppUtils.emit(APP_EVENTS.pinnedUpdated);
      AppUtils.emit(APP_EVENTS.prefsImported);
      return true;
    } catch {
      return false;
    }
  }

  _importBookmarksAndPins(imported, merge) {
    const incoming = imported.bookmarks.map((b, i) => this._normalizeBookmark(b, i));
    const pins = Array.isArray(imported.pinnedSurahs) ? imported.pinnedSurahs : null;

    if (merge) {
      const known = new Set(this.bookmarks.map((b) => b.id));
      this.bookmarks = [...this.bookmarks, ...incoming.filter((b) => !known.has(b.id))];
      const validPins = this._normalizePinnedSurahs(pins || []);
      this.pinnedSurahs = [...new Set([...this.pinnedSurahs, ...validPins])];
    } else {
      this.bookmarks = incoming;
      if (pins && pins.every(AppUtils.isValidSurahId)) this.pinnedSurahs = [...pins];
    }

    this.bookmarks.sort((a, b) => a.page - b.page);
    this._updateBookmarkedPagesSet();
    this._migrateBookmarks();
  }

  _importReciters(imported, merge) {
    const { pinnedReciters, activeReciters } = imported;

    if (pinnedReciters && typeof pinnedReciters === "object") {
      Object.entries(pinnedReciters).forEach(([riwaya, ids]) => {
        if (!Array.isArray(ids)) return;
        const key = `pinnedReciters_${riwaya}`;
        const existing = merge ? this.getPreferenceJSON(key, []) : [];
        const base = Array.isArray(existing) ? existing : [];
        this.setPreferenceJSON(key, [...new Set([...base, ...ids])]);
      });
    }

    if (activeReciters && typeof activeReciters === "object") {
      Object.entries(activeReciters).forEach(([riwaya, reciterId]) => {
        const reciters = window.RIWAYAT_CONFIG?.[riwaya]?.reciters;
        if (!reciters || typeof reciterId !== "string" || !reciterId) return;
        if (reciters.some((r) => r.id === reciterId)) {
          this.setPreference(`reciter_${riwaya}`, reciterId);
        }
      });
    }
  }

  _importPageAndTheme(imported) {
    if (AppUtils.isValidPage(imported.lastPage)) {
      this.lastPage = imported.lastPage;
      window.quranReader?.goToPage?.(imported.lastPage);
    }
    if (imported.theme === "light" || imported.theme === "night") {
      this.theme = imported.theme;
      this.applyTheme();
      this.updateAllThemeIcons();
    }
  }

  // ---------- Tafsir ----------

  async loadTafsir() {
    if (this.tafsirLoaded) return true;
    if (this.tafsirLoading) {
      return new Promise((resolve) => this.tafsirLoadQueue.push(resolve));
    }

    this.tafsirLoading = true;
    let ok = false;
    try {
      const manager = this._requireModule("tafsirManager", "TafsirManager");
      await AppUtils.withTimeout(manager.preload(), 20000);
      ok = true;
    } catch {
      this.showToast("❌ خطأ في تحميل التفسير");
    }

    this.tafsirLoaded = ok;
    this.tafsirLoading = false;
    this.tafsirLoadQueue.splice(0).forEach((resolve) => resolve(ok));
    if (ok) AppUtils.emit("tafsir:ready");
    return ok;
  }

  // ---------- Thème ----------

  applyTheme() {
    document.body.classList.toggle("night-mode", this.theme === "night");
  }

  toggleTheme() {
    const isNight = document.body.classList.toggle("night-mode");
    this.theme = isNight ? "night" : "light";
    this.saveToLocalStorage();
    this.updateAllThemeIcons();
    AppUtils.emit("quran:themeChanged", { theme: this.theme });
    this.showToast(isNight ? "🌙 تفعيل الوضع الليلي" : "☀️ تفعيل الوضع النهاري");
  }

  updateAllThemeIcons() {
    const btn = document.getElementById("tafsirThemeToggle");
    if (btn) btn.textContent = this._isNightMode() ? "☀️" : "🌙";
    window.overlayManager?.updateThemeButtonText();
  }

  // ---------- Toast ----------

  showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    this._clearToastTimers();
    toast.textContent = message;
    toast.style.display = "block";
    toast.style.opacity = "1";
    this._toastTimeout = setTimeout(() => {
      toast.style.opacity = "0";
      this._toastHideTimeout = setTimeout(() => {
        toast.style.display = "none";
      }, AppUtils.cssMs("--toast-fade", 300));
    }, 2000);
  }

  // ---------- Écouteurs d'événements ----------

  /** Ajoute un écouteur et le mémorise pour le retirer dans destroy(). */
  _on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this._listeners.push({ target, type, handler, options });
  }

  _off() {
    this._listeners.forEach(({ target, type, handler, options }) =>
      target.removeEventListener(type, handler, options),
    );
    this._listeners = [];
  }

  setupEventListeners() {
    this._on(window, APP_EVENTS.pageChanged, (e) => {
      const page = e.detail?.page;
      if (!page) return;
      this.updateCurrentPage(page);
      this.updateBookmarkIcon(page);
    });

    this._on(window, APP_EVENTS.bookmarkChanged, () => this.updateBookmarkIcon(this.lastPage));

    this._on(window, APP_EVENTS.readingModeChanged, (e) => {
      const page = e.detail?.savedPage;
      if (!page) return;
      this.lastPage = page;
      this.updateCurrentPage(page);
    });

    this._on(document, "keydown", (e) => this._onKeyDown(e));
  }

  // ---------- Clavier ----------

  _onKeyDown(e) {
    const overlayEl = document.querySelector(".overlay.show");
    if (overlayEl) return this._scrollOverlayByKey(e, overlayEl.querySelector(".overlay-body"));
    if (this._isMenuOpen()) return;
    this._navigateByKey(e);
  }

  _runKeyAction(e, actions) {
    const action = actions[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  }

  _scrollOverlayByKey(e, body) {
    const step = 120;
    this._runKeyAction(e, {
      ArrowDown: () => body?.scrollBy({ top: step, behavior: "auto" }),
      ArrowUp: () => body?.scrollBy({ top: -step, behavior: "auto" }),
      Home: () => body && (body.scrollTop = 0),
      End: () => body && (body.scrollTop = body.scrollHeight),
    });
  }

  _navigateByKey(e) {
    const reader = window.quranReader;
    if (!reader) return;
    const step = 120;
    const next = () => reader.goToNextPage();
    const prev = () => reader.goToPreviousPage();
    const scrollPage = (top) => {
      if (reader.readingMode !== "scroll") return;
      reader.elements.pageScroll?.scrollBy({ top, behavior: "auto" });
    };
    this._runKeyAction(e, {
      ArrowLeft: next,
      PageDown: next,
      ArrowRight: prev,
      PageUp: prev,
      ArrowUp: () => scrollPage(-step),
      ArrowDown: () => scrollPage(step),
      Home: () => reader.goToFirstPage(),
      End: () => reader.goToLastPage(),
    });
  }

  // ---------- Cycle de vie (sauvegarde, réseau, Cordova) ----------

  setupCleanupHandlers() {
    this._on(window, "pagehide", () => this._saveCurrentState());

    // Cordova
    this._on(document, "pause", () => this._saveCurrentState(), false);
    this._on(
      document,
      "deviceready",
      () => this._on(document, "backbutton", () => this.handleBack(), false),
      false,
    );

    this._on(document, "visibilitychange", () => this._onVisibilityChange());

    this._on(window, "online", () => this.showToast("✅ الاتصال بالإنترنت متوفر"));
    this._on(window, "offline", () => this.showToast("⚠️ تم فقدان الاتصال بالإنترنت"));
  }

  _onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this._saveCurrentState();
      window.quranReader?.imageCache.clear();
    } else if (document.visibilityState === "visible") {
      window.quranReader?.onAppResume?.();
    }
  }

  // ---------- Bouton retour ----------

  handleBack() {
    const om = window.overlayManager;
    // 0) sélecteur plein écran
    if (window.Picker?.close()) return;
    // 1) overlay ouvert
    if (om?.currentOverlay) {
      om.closeCurrentOverlay();
      return;
    }
    // 2) menu principal
    if (this._isMenuOpen()) {
      om?.closeMenu();
      return;
    }
    // 3) double appui pour quitter
    const now = Date.now();
    if (now - this._lastBack < 2000) {
      navigator.app?.exitApp?.();
      return;
    }
    this._lastBack = now;
    this.showToast("↩️ اضغط مرة أخرى للخروج");
  }

  // ---------- Destruction ----------

  destroy() {
    this._clearToastTimers();
    clearTimeout(this._savePageTimeout);
    this._savePageTimeout = null;
    this._off();
    window.quranReader?.destroy?.();
    this.isInitialized = false;
  }
}

// ============================================================
//  5. LISTITEMRENDERER — ÉLÉMENTS DE LISTE
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
//  6. CUSTOMSELECT — MENUS DÉROULANTS
//  Convention d'ids : bouton « xxx », liste « xxxList », bloc « xxxWrap »
// ============================================================

class CustomSelect {
  static _initialized = false;

  // ---------- Ouverture / fermeture (une seule fois) ----------

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

  // ---------- HTML ----------

  /** Génère le bloc HTML d'un menu : markup("suraSelect", "اختر السورة"). */
  static markup(id, placeholder) {
    return `<div class="custom-select" id="${id}Wrap">
      <button type="button" class="custom-select-btn" id="${id}">
        <span class="custom-select-val">${AppUtils.esc(placeholder)}</span><span class="custom-select-arrow">▾</span>
      </button>
      <div class="custom-select-dropdown" id="${id}List"></div>
    </div>`;
  }

  // ---------- Remplissage et valeur (ids complets) ----------

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

  /** Garde l'option visible dans la liste ouverte. */
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

  // ---------- Raccourcis : un seul id ----------

  static fill(id, options) {
    CustomSelect.render(`${id}List`, options);
  }

  static set(id, value) {
    CustomSelect.setValue(id, `${id}List`, value);
  }

  static get(id) {
    return CustomSelect.getValue(`${id}List`);
  }

  // ---------- Listes standard (sourates, versets, pages) ----------

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
//  7. PICKER — SÉLECTEUR PLEIN ÉCRAN
//  (mini-overlay, 🟢 sur l'élément actif, centré au 1/3)
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

  /** Retourne true si le sélecteur était ouvert (utilisé par le bouton retour). */
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

  /** build(rerender) retourne la liste des nœuds à afficher. */
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

  /** items : [{ value, label }] */
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

  /** Construit la liste à partir d'un menu CustomSelect (groupes, .selected, bouton 📌). */
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
//  8. AYAPICKER — COUPLE SOURATE / VERSET
//  (saut vers un verset, mémorisation)
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

  /** Position de départ : lecture en cours, sinon début de la page affichée. */
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
//  9. DÉMARRAGE ET GESTION D'ERREURS
// ============================================================

window.AppUtils = AppUtils;
window.AppStore = AppStore;
window.ListItemRenderer = ListItemRenderer;
window.CustomSelect = CustomSelect;

if (!window.quranApp) window.quranApp = new QuranApp();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => CustomSelect.initToggle());
} else {
  CustomSelect.initToggle();
}

window.addEventListener("error", () => window.quranApp?.showToast("⚠️ حدث خطأ غير متوقع"));

window.addEventListener("unhandledrejection", (e) => {
  e.preventDefault();
  const reason = String(e.reason?.message || e.reason || "").toLowerCase();
  if (["fetch", "network", "timeout"].some((k) => reason.includes(k))) return;
  window.quranApp?.showToast("⚠️ حدث خطأ غير متوقع");
});