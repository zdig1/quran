// ============================================================
//  FICHIER : main.js
//  Rôle : moteur de l'application (état, stockage, signets,
//         khatma, thème, tafsir, toast, clavier, cycle de vie)
//  Dépend de : ui-kit.js (chargé avant ce fichier)
// ============================================================

// ============================================================
//  1. QURANAPP — MOTEUR DE L'APPLICATION
// ============================================================

class QuranApp {
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
    this._savePageTimeout = null;
    this._lastBack = 0;
  }

  // ---------- Helpers privés ----------

  _findBookmark(id) {
    return this.bookmarks.find((b) => b.id === id) || null;
  }

  _isMenuOpen() {
    return !!document.querySelector(".menu-overlay.show");
  }

  _normalizePinnedSurahs(list) {
    if (!Array.isArray(list)) return [];
    return [...new Set(list.filter(AppUtils.isValidSurahId))];
  }

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
    let repaired = false;

    this.bookmarks = (Array.isArray(bookmarks) ? bookmarks : [])
      .filter((b) => b && typeof b === "object" && AppUtils.isValidPage(Number(b.page)))
      .map((b, i) => {
        const normalized = this._normalizeBookmark(b, i);
        if (normalized.name !== b.name) repaired = true; // nom absent, illisible ("[object Object]") ou trop long
        return normalized;
      });

    if (repaired) {
      AppStore.setJSON(STORAGE_KEYS.bookmarks, this.bookmarks);
    }

    this._updateBookmarkedPagesSet();

    const page = parseInt(AppStore.get(STORAGE_KEYS.lastPage), 10);
    this.lastPage = AppUtils.isValidPage(page) ? page : 1;

    this.theme = AppStore.get(STORAGE_KEYS.theme) === "night" ? "night" : "light";

    const pinned = AppStore.getJSON(STORAGE_KEYS.pinned, []);
    this.pinnedSurahs = this._normalizePinnedSurahs(pinned);
  }

  saveToLocalStorage() {
    clearTimeout(this._savePageTimeout);
    this._savePageTimeout = null;
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
    if (readerPage && AppUtils.isValidPage(Number(readerPage))) {
      this.lastPage = Number(readerPage);
    }
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

  // ---------- Navigation ----------

  getCurrentPage() {
    return window.quranReader?.getCurrentPage?.() || this.lastPage;
  }

  updateCurrentPage(page) {
    const pageNum = parseInt(page, 10);
    if (!AppUtils.isValidPage(pageNum)) return;
    this.lastPage = pageNum;
    clearTimeout(this._savePageTimeout);
    this._savePageTimeout = setTimeout(() => {
      this._savePageTimeout = null;
      AppStore.set(STORAGE_KEYS.lastPage, pageNum);
    }, 500);
  }

  goToPage(page) {
    window.quranReader?.goToPage(page);
  }

  // ---------- Sourates épinglées ----------

  togglePinSurah(surahId) {
    const id = Number(surahId);
    if (!AppUtils.isValidSurahId(id)) return false;
    const idx = this.pinnedSurahs.indexOf(id);
    const added = idx === -1;
    if (added) this.pinnedSurahs.push(id);
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

  getKhatmaBookmark() {
    return this.bookmarks.find((b) => b.type === "khatma") || null;
  }

  setKhatmaMarker(page, name = "الختمة") {
    const p = Number(page);
    if (!AppUtils.isValidPage(p)) return false;
    const existing = this.getKhatmaBookmark();
    if (existing) return this.replaceBookmarkPage(existing.id, p);
    this.addBookmark({ id: `khatma_${Date.now()}`, type: "khatma", page: p, name });
    return true;
  }

  _makeBookmarkId(page, index = 0) {
    return `bookmark_${page}_${Date.now()}_${index}`;
  }

  _normalizeBookmark(bookmark, index = 0) {
    const page = Number(bookmark.page);
    const isKhatma = bookmark.type === "khatma";
    const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

    // Le nom est toujours du texte : valeur absente ou corrompue → nom par défaut
    let name = text(bookmark.name, 100);
    if (!name || name.includes("[object Object]")) {
      name = isKhatma ? "الختمة" : window.overlayManager?.getDefaultBookmarkName?.(page) || `صفحة ${page}`;
    }

    // Seuls les champs connus sont conservés (les signets importés peuvent venir d'un fichier externe)
    const surahId = Number(bookmark.surahId);
    return {
      id: text(bookmark.id, 64) || this._makeBookmarkId(page, index),
      name,
      page,
      ...(isKhatma ? { type: "khatma" } : {}),
      ...(AppUtils.isValidSurahId(surahId) ? { surahId } : {}),
      lastModified: text(bookmark.lastModified || bookmark.date, 40) || new Date().toISOString(),
    };
  }

  _surahIdForPage(page) {
    return window.quranCalculator?.getFirstSurahForPage?.(page)?.s_id ?? null;
  }

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
    this.bookmarkedPagesSet = new Set(
      this.bookmarks.filter((b) => b.type !== "khatma").map((b) => b.page),
    );
  }

  _sortBookmarks() {
    this.bookmarks.sort((a, b) => (b.type === "khatma") - (a.type === "khatma") || a.page - b.page);
  }

  _dedupeKhatma() {
    const list = this.bookmarks.filter((b) => b.type === "khatma");
    if (list.length < 2) return;
    list.sort((a, b) => String(b.lastModified).localeCompare(String(a.lastModified)));
    this.bookmarks = this.bookmarks.filter((b) => b.type !== "khatma" || b === list[0]);
  }

  _commitBookmarks(pagesToRefresh = []) {
    this._sortBookmarks();
    this._updateBookmarkedPagesSet();
    this.saveToLocalStorage();
    pagesToRefresh.forEach((p) => this.updateBookmarkIcon(p));
    AppUtils.emit(APP_EVENTS.bookmarkChanged);
  }

  addBookmark(bookmark) {
    const page = Number(bookmark.page);
    if (!AppUtils.isValidPage(page)) return;

    const normalized = this._normalizeBookmark({ ...bookmark, page });
    if (!normalized.surahId) {
      const surahId = this._surahIdForPage(page);
      if (surahId) normalized.surahId = surahId;
    }

    this.bookmarks.push(normalized);
    this._commitBookmarks([page]);
    return normalized;
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
    bookmark.name = String(newName ?? "").trim() || (bookmark.type === "khatma" ? "الختمة" : `صفحة ${bookmark.page}`);
    bookmark.lastModified = new Date().toISOString();
    this._commitBookmarks();
    return true;
  }

  updateBookmarkIcon(page) {
    const icon = document.getElementById("bookmarkIcon");
    if (!icon) return;
    const isKhatma = this.getKhatmaBookmark()?.page === page;
    const has = this.bookmarkedPagesSet.has(page);
    icon.textContent = isKhatma ? "🏴" : has ? "⭐" : "🔖";
    icon.title = isKhatma ? "علامة الختمة" : has ? "علامة مرجعية موجودة" : "إضافة علامة مرجعية";
  }

  // ---------- Export / import des données utilisateur ----------

  _riwayas() {
    return Object.keys(window.RIWAYAT_CONFIG || {});
  }

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
        stats: window.statsManager ? window.statsManager.exportData() : null,
      },
      null,
      2,
    );
  }

  importUserData(jsonString, merge = false) {
    try {
      const imported = JSON.parse(jsonString);
      const hasBookmarks = Array.isArray(imported?.bookmarks);
      if (!imported || (!hasBookmarks && !imported.stats)) throw new Error("Format inconnu");

      if (hasBookmarks) {
        const allValid = imported.bookmarks.every(
          (b) => b && typeof b === "object" && AppUtils.isValidPage(Number(b.page)),
        );
        if (!allValid) throw new Error("Signets invalides");
        this._importBookmarksAndPins(imported, merge);
      }
      this._importReciters(imported, merge);
      this._importPageAndTheme(imported);
      if (imported.stats && window.statsManager) {
        window.statsManager.importData(imported.stats, merge);
      }

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
    const incoming = imported.bookmarks.slice(0, 2000).map((b, i) => this._normalizeBookmark(b, i));
    const pins = Array.isArray(imported.pinnedSurahs) ? imported.pinnedSurahs : null;

    if (merge) {
      const known = new Set(this.bookmarks.map((b) => b.id));
      this.bookmarks = [...this.bookmarks, ...incoming.filter((b) => !known.has(b.id))];
      const validPins = this._normalizePinnedSurahs(pins || []);
      this.pinnedSurahs = [...new Set([...this.pinnedSurahs, ...validPins])];
    } else {
      this.bookmarks = incoming;
      if (pins) this.pinnedSurahs = this._normalizePinnedSurahs(pins);
    }

    this._dedupeKhatma();
    this._sortBookmarks();
    this._updateBookmarkedPagesSet();
    this._migrateBookmarks();
  }

  _importReciters(imported, merge) {
    const { pinnedReciters, activeReciters } = imported;

    if (pinnedReciters && typeof pinnedReciters === "object") {
      Object.entries(pinnedReciters).forEach(([riwaya, ids]) => {
        const reciters = this._riwayas().includes(riwaya) ? window.RIWAYAT_CONFIG[riwaya]?.reciters : null;
        if (!reciters || !Array.isArray(ids)) return;
        const known = new Set(reciters.map((r) => r.id));
        const valid = ids.filter((id) => typeof id === "string" && known.has(id));
        const key = `pinnedReciters_${riwaya}`;
        const existing = merge ? this.getPreferenceJSON(key, []) : [];
        const base = Array.isArray(existing) ? existing : [];
        this.setPreferenceJSON(key, [...new Set([...base, ...valid])]);
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
    const page = Number(imported.lastPage);
    if (AppUtils.isValidPage(page)) {
      this.lastPage = page;
      window.quranReader?.goToPage?.(page);
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

  showToast(message, duration = 2000) {
    AppUtils.toast(message, duration);
  }

  // ---------- Écouteurs d'événements ----------

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
    if (overlayEl) {
      const scroller =
        overlayEl.querySelector(".overlay-body") ||
        overlayEl.querySelector(".tafsir-content-container") ||
        overlayEl.querySelector(".audio-body");
      return this._scrollOverlayByKey(e, scroller);
    }
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
      window.quranReader?.imageCache?.clear?.();
    } else if (document.visibilityState === "visible") {
      window.quranReader?.onAppResume?.();
    }
  }

  // ---------- Bouton retour ----------

  handleBack() {
    const om = window.overlayManager;
    if (window.Picker?.close()) return;
    if (om?.currentOverlay) {
      om.closeCurrentOverlay();
      return;
    }
    if (this._isMenuOpen()) {
      om?.closeMenu();
      return;
    }
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
    AppUtils.clearToastTimers();
    clearTimeout(this._savePageTimeout);
    this._savePageTimeout = null;
    this._off();
    window.quranReader?.destroy?.();
    this.isInitialized = false;
  }
}

// ============================================================
//  2. INSTANCIATION ET GESTION D'ERREURS
// ============================================================

if (!window.quranApp) window.quranApp = new QuranApp();

window.addEventListener("error", (e) => {
  if (String(e.message || "").includes("ResizeObserver")) return;
  window.quranApp?.showToast("⚠️ حدث خطأ غير متوقع");
});

window.addEventListener("unhandledrejection", (e) => {
  e.preventDefault();
  const reason = String(e.reason?.message || e.reason || "").toLowerCase();
  if (["fetch", "network", "failed to fetch", "timeout", "abort"].some((k) => reason.includes(k))) return;
  window.quranApp?.showToast("⚠️ حدث خطأ غير متوقع");
});