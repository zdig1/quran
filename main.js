class QuranApp {
  constructor() {
    this.isInitialized = false;
    this.isInitializing = false;

    this.bookmarks = [];
    this.pinnedSurahs = [];
    this.lastPage = 1;
    this.theme = "light";

    this.NOTIFICATION_DURATION = 2000;

    this.tafsirLoaded = false;
    this.tafsirLoading = false;
    this.tafsirLoadQueue = [];

    this._toastTimeout = null;
    this._beforeUnloadHandler = null;
    this._pageHideHandler = null;
    this._visibilityChangeHandler = null;
    this._onlineHandler = null;
    this._offlineHandler = null;
    this._pageChangedHandler = null;
    this._bookmarkChangedHandler = null;
    this._readingModeChangedHandler = null;
    this._keyDownHandler = null;
  }

  // ============================================
  // INITIALISATION
  // ============================================

  async init() {
    if (this.isInitializing) return;
    if (this.isInitialized) {
      this.destroy();
    }
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
      window.dispatchEvent(new CustomEvent("quran:appReady"));
    } catch (err) {
      this.showToast("❌ خطأ في تحميل التطبيق");
      window.dispatchEvent(
        new CustomEvent("quran:appError", { detail: { error: err.message } }),
      );
    } finally {
      this.isInitializing = false;
    }
  }

  async initCalculator() {
    if (!window.quranCalculator)
      throw new Error("Module Calculator non trouvé");
    await window.quranCalculator.load();
  }

  async initReader() {
    if (!window.quranReader) throw new Error("Module Reader non trouvé");
    await window.quranReader.init({}, this.lastPage);
  }

  initOverlays() {
    if (!window.overlayManager)
      throw new Error("Module OverlayManager non trouvé");
    window.overlayManager.init({ app: this });
  }

  // ============================================
  // PERSISTANCE
  // ============================================

  restoreFromLocalStorage() {
    try {
      const rawBookmarks = localStorage.getItem("quran_bookmarks");
      this.bookmarks = rawBookmarks ? JSON.parse(rawBookmarks) : [];
      if (!Array.isArray(this.bookmarks)) this.bookmarks = [];
      this.bookmarks = this.bookmarks.map((b, i) => ({
        ...b,
        id: b.id || `bookmark_${b.page}_${Date.now()}_${i}`,
        lastModified: b.lastModified || b.date || new Date().toISOString(),
      }));

      const rawPage = localStorage.getItem("quran_lastPage");
      this.lastPage = rawPage ? parseInt(rawPage) : 1;
      if (isNaN(this.lastPage) || this.lastPage < 1 || this.lastPage > 604)
        this.lastPage = 1;

      this.theme = localStorage.getItem("quran_theme") || "light";

      const rawPinned = localStorage.getItem("quran_pinnedSurahs");
      this.pinnedSurahs = rawPinned ? JSON.parse(rawPinned) : [];
    } catch {
      this.bookmarks = [];
      this.lastPage = 1;
      this.theme = "light";
      this.pinnedSurahs = [];
      [
        "quran_bookmarks",
        "quran_lastPage",
        "quran_theme",
        "quran_pinnedSurahs",
        "quran_readingMode",
        "quran_lastMode",
      ].forEach((key) => localStorage.removeItem(key));
      localStorage.setItem("quran_lastPage", "1");
      localStorage.setItem("quran_theme", "light");
      localStorage.setItem("quran_bookmarks", "[]");
      localStorage.setItem("quran_pinnedSurahs", "[]");
    }
  }

  saveToLocalStorage() {
    try {
      localStorage.setItem("quran_bookmarks", JSON.stringify(this.bookmarks));
      localStorage.setItem("quran_lastPage", this.lastPage.toString());
      localStorage.setItem("quran_theme", this.theme);
      localStorage.setItem(
        "quran_pinnedSurahs",
        JSON.stringify(this.pinnedSurahs),
      );
      if (window.quranReader)
        localStorage.setItem(
          "quran_readingMode",
          window.quranReader.readingMode,
        );
    } catch {
      try {
        localStorage.setItem("quran_lastPage", this.lastPage.toString());
      } catch {
        // Ignorer
      }
    }
  }

  // ============================================
  // UTILITAIRES GLOBAUX
  // ============================================

  escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  setPreference(key, value) {
    try {
      localStorage.setItem(`quran_${key}`, value);
    } catch (e) {
      // ignore
    }
  }

  getPreference(key, defaultValue = null) {
    try {
      const val = localStorage.getItem(`quran_${key}`);
      return val !== null ? val : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  enableSwipe(element, onSwipeLeft, onSwipeRight, threshold = 50) {
    if (!element) return;
    let startX = 0;
    const onTouchStart = (e) => {
      startX = e.touches[0].clientX;
    };
    const onTouchEnd = (e) => {
      const endX = e.changedTouches[0].clientX;
      const delta = startX - endX;
      if (Math.abs(delta) > threshold) {
        if (delta < 0) onSwipeLeft?.();
        else onSwipeRight?.();
      }
    };
    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchend', onTouchEnd);
    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchend', onTouchEnd);
    };
  }

  // ============================================
  // NAVIGATION
  // ============================================

  getCurrentPage() {
    return this.lastPage;
  }

  updateCurrentPage(page) {
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > 604) return;
    this.lastPage = pageNum;
    localStorage.setItem("quran_lastPage", pageNum.toString());
    if (typeof window !== "undefined") window.currentQuranPage = pageNum;
  }

  goToPage(page) {
    window.quranReader?.goToPage(page);
  }

  // ============================================
  // SOURATES ÉPINGLÉES
  // ============================================

  togglePinSurah(sura_id) {
    const idx = this.pinnedSurahs.indexOf(sura_id);
    const added = idx === -1;
    if (added) this.pinnedSurahs.push(sura_id);
    else this.pinnedSurahs.splice(idx, 1);
    this.saveToLocalStorage();
    window.dispatchEvent(new CustomEvent("quran:pinnedSurahsUpdated"));
    return added;
  }

  isSurahPinned(sura_id) {
    return this.pinnedSurahs.includes(sura_id);
  }
  getPinnedSurahs() {
    return [...this.pinnedSurahs];
  }

  // ============================================
  // MARQUE-PAGES
  // ============================================

  getBookmarks() {
    return [...this.bookmarks];
  }

  addBookmark(bookmark) {
    if (!bookmark.lastModified) {
      bookmark.lastModified = new Date().toISOString();
    }
    this.bookmarks.push(bookmark);
    this.bookmarks.sort((a, b) => a.page - b.page);
    this.saveToLocalStorage();
    this.updateBookmarkIcon(bookmark.page);
    window.dispatchEvent(new CustomEvent("quran:bookmarkChanged"));
  }

  replaceBookmarkPage(bookmarkId, newPage) {
    const bookmark = this.bookmarks.find((b) => b.id === bookmarkId);
    if (!bookmark || newPage < 1 || newPage > 604) return false;
    const oldPage = bookmark.page;
    bookmark.page = newPage;
    bookmark.lastModified = new Date().toISOString();
    this.bookmarks.sort((a, b) => a.page - b.page);
    this.saveToLocalStorage();
    this.updateBookmarkIcon(oldPage);
    this.updateBookmarkIcon(newPage);
    window.dispatchEvent(new CustomEvent("quran:bookmarkChanged"));
    return true;
  }

  removeBookmarkById(bookmarkId) {
    const idx = this.bookmarks.findIndex((b) => b.id === bookmarkId);
    if (idx === -1) return false;
    const removed = this.bookmarks.splice(idx, 1)[0];
    this.saveToLocalStorage();
    this.updateBookmarkIcon(removed.page);
    window.dispatchEvent(new CustomEvent("quran:bookmarkChanged"));
    return true;
  }

  updateBookmark(bookmarkId, newName) {
    const bookmark = this.bookmarks.find((b) => b.id === bookmarkId);
    if (!bookmark) return false;
    bookmark.name = newName.trim() || `صفحة ${bookmark.page}`;
    bookmark.lastModified = new Date().toISOString();
    this.saveToLocalStorage();
    window.dispatchEvent(new CustomEvent("quran:bookmarkChanged"));
    return true;
  }

  updateBookmarkIcon(page) {
    const icon = document.getElementById("bookmarkIcon");
    if (!icon) return;
    const hasBookmark = this.bookmarks.some((b) => b.page === page);
    icon.textContent = hasBookmark ? "⭐" : "🔖";
    icon.title = hasBookmark ? "علامة مرجعية موجودة" : "إضافة علامة مرجعية";
  }

  /**
   * Exporte toutes les données utilisateur (signets + épingles)
   */
  exportUserData() {
    const pinnedReciters = {};
    Object.keys(window.RIWAYAT_CONFIG || {}).forEach(riwaya => {
      const stored = this.getPreference(`pinnedReciters_${riwaya}`);
      if (stored) pinnedReciters[riwaya] = JSON.parse(stored);
    });
    const data = {
      bookmarks: this.bookmarks,
      pinnedSurahs: this.pinnedSurahs,
      pinnedReciters,
    };
    return JSON.stringify(data, null, 2);
  }
  /**
   * Importe des données utilisateur depuis une chaîne JSON
   */
  importUserData(jsonString, merge = false) {
    try {
      const imported = JSON.parse(jsonString);

      if (imported.bookmarks && Array.isArray(imported.bookmarks)) {
        const validBookmarks = imported.bookmarks.every(
          (b) =>
            b &&
            typeof b === "object" &&
            typeof b.page === "number" &&
            b.page >= 1 &&
            b.page <= 604,
        );
        if (!validBookmarks) throw new Error("Signets invalides");

        // Validation des épingles (optionnel)
        const validPinned =
          Array.isArray(imported.pinnedSurahs) &&
          imported.pinnedSurahs.every(
            (id) => typeof id === "number" && id >= 1 && id <= 114,
          );

        let newBookmarks = [...this.bookmarks];
        let newPinned = [...this.pinnedSurahs];

        if (merge) {
          // Fusion des signets
          const existingIds = new Set(this.bookmarks.map((b) => b.id));
          const toAddBookmarks = imported.bookmarks.filter(
            (b) => !existingIds.has(b.id),
          ).map((b) => ({
            ...b,
            lastModified: b.lastModified || b.date || new Date().toISOString(),
          }));
          newBookmarks = [...this.bookmarks, ...toAddBookmarks];

          // Fusion des épingles
          const existingPinned = new Set(this.pinnedSurahs);
          imported.pinnedSurahs = imported.pinnedSurahs || [];
          const toAddPinned = imported.pinnedSurahs.filter((id) => !existingPinned.has(id),
          );
          newPinned = [...this.pinnedSurahs, ...toAddPinned];
        } else {
          // Remplacement
          newBookmarks = imported.bookmarks.map((b) => ({
            ...b,
            id: b.id || `bookmark_${b.page}_${Date.now()}_${Math.random()}`,
            lastModified: b.lastModified || b.date || new Date().toISOString(),
          }));
          newPinned = validPinned
            ? [...imported.pinnedSurahs]
            : this.pinnedSurahs;
        }

        // Tri des signets par page
        newBookmarks.sort((a, b) => a.page - b.page);

        this.bookmarks = newBookmarks;
        this.pinnedSurahs = newPinned;
        // Restaurer pinnedReciters
        if (imported.pinnedReciters && typeof imported.pinnedReciters === 'object') {
          Object.entries(imported.pinnedReciters).forEach(([riwaya, ids]) => {
            if (Array.isArray(ids)) {
              if (merge) {
                const existing = JSON.parse(this.getPreference(`pinnedReciters_${riwaya}`) || '[]');
                const merged = [...new Set([...existing, ...ids])];
                this.setPreference(`pinnedReciters_${riwaya}`, JSON.stringify(merged));
              } else {
                this.setPreference(`pinnedReciters_${riwaya}`, JSON.stringify(ids));
              }
            }
          });
        }
        this.saveToLocalStorage();
        window.dispatchEvent(new CustomEvent("quran:bookmarkChanged"));
        window.dispatchEvent(new CustomEvent("quran:pinnedSurahsUpdated"));

        return true;
      }

      throw new Error("Format inconnu");
    } catch (err) {
      console.error("Import error:", err);
      return false;
    }
  }

  // ============================================
  // TAFSIR
  // ============================================

  async loadTafsir() {
    if (this.tafsirLoaded) return true;
    if (this.tafsirLoading)
      return new Promise((resolve) => {
        this.tafsirLoadQueue.push(resolve);
      });

    this.tafsirLoading = true;
    try {
      if (!window.tafsirManager)
        throw new Error("Module TafsirManager non trouvé");
      const load = window.tafsirManager.preload();
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 20000),
      );
      await Promise.race([load, timeout]);

      this.tafsirLoaded = true;
      this.tafsirLoading = false;
      this.tafsirLoadQueue.forEach((resolve) => resolve(true));
      this.tafsirLoadQueue = [];
      window.dispatchEvent(new CustomEvent("tafsir:ready"));
      return true;
    } catch {
      this.tafsirLoaded = false;
      this.tafsirLoading = false;
      this.tafsirLoadQueue.forEach((resolve) => resolve(false));
      this.tafsirLoadQueue = [];
      this.showToast("❌ خطأ في تحميل التفسير");
      return false;
    }
  }

  // ============================================
  // THÈME
  // ============================================

  toggleTheme() {
    const isNight = document.body.classList.toggle("night-mode");
    this.theme = isNight ? "night" : "light";
    this.saveToLocalStorage();
    this.updateAllThemeIcons();
    window.dispatchEvent(
      new CustomEvent("quran:themeChanged", { detail: { theme: this.theme } }),
    );
    this.showToast(
      isNight ? "🌙 تفعيل الوضع الليلي" : "☀️ تفعيل الوضع النهاري",
    );
  }

  updateAllThemeIcons() {
    const btn = document.getElementById("tafsirThemeToggle");
    if (btn)
      btn.textContent = document.body.classList.contains("night-mode")
        ? "☀️"
        : "🌙";
    window.overlayManager?.updateThemeButtonText();
  }

  applyTheme() {
    if (this.theme === "night") {
      document.body.classList.add("night-mode");
    } else {
      document.body.classList.remove("night-mode");
    }
  }

  // ============================================
  // TOAST
  // ============================================

  showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    if (this._toastTimeout) clearTimeout(this._toastTimeout);
    toast.textContent = message;
    toast.style.display = "block";
    toast.style.opacity = "1";
    toast.classList.add("show");
    this._toastTimeout = setTimeout(() => {
      toast.style.opacity = "0";
      toast.classList.remove("show");
      setTimeout(() => {
        toast.style.display = "none";
      }, 300);
    }, this.NOTIFICATION_DURATION);
  }

  // ============================================
  // ÉCOUTEURS D'ÉVÉNEMENTS
  // ============================================

  setupEventListeners() {
    const onPageChanged = (e) => {
      if (!e.detail?.page) return;
      const page = e.detail.page;
      this.updateCurrentPage(page);
      this.updateBookmarkIcon(page);
      if (typeof window !== "undefined") window.currentQuranPage = page;
    };
    window.addEventListener("quran:pageChanged", onPageChanged);
    this._pageChangedHandler = onPageChanged;

    const onBookmarkChanged = () => this.updateBookmarkIcon(this.lastPage);
    window.addEventListener("quran:bookmarkChanged", onBookmarkChanged);
    this._bookmarkChangedHandler = onBookmarkChanged;

    const onReadingModeChanged = (e) => {
      if (e.detail?.savedPage) {
        this.lastPage = e.detail.savedPage;
        this.updateCurrentPage(e.detail.savedPage);
      }
    };
    window.addEventListener("quran:readingModeChanged", onReadingModeChanged);
    this._readingModeChangedHandler = onReadingModeChanged;

    const onKeyDown = (e) => {
      const overlayEl = document.querySelector(".overlay.show");
      const menuEl = document.querySelector(".menu-overlay.show");

      if (overlayEl) {
        const body = overlayEl.querySelector(".overlay-body");
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            body?.scrollBy({ top: 120, behavior: "smooth" });
            break;
          case "ArrowUp":
            e.preventDefault();
            body?.scrollBy({ top: -120, behavior: "smooth" });
            break;
          case "Home":
            e.preventDefault();
            if (body) body.scrollTop = 0;
            break;
          case "End":
            e.preventDefault();
            if (body) body.scrollTop = body.scrollHeight;
            break;
        }
        return;
      }

      if (menuEl) return;

      const reader = window.quranReader;
      if (!reader) return;

      switch (e.key) {
        case "ArrowLeft":
        case "PageDown":
          e.preventDefault();
          reader.goToNextPage();
          break;
        case "ArrowRight":
        case "PageUp":
          e.preventDefault();
          reader.goToPreviousPage();
          break;
        case "ArrowUp":
          e.preventDefault();
          if (reader.readingMode === "scroll")
            reader.elements.pageScroll?.scrollBy({
              top: -120,
              behavior: "smooth",
            });
          break;
        case "ArrowDown":
          e.preventDefault();
          if (reader.readingMode === "scroll")
            reader.elements.pageScroll?.scrollBy({
              top: 120,
              behavior: "smooth",
            });
          break;
        case "Home":
          e.preventDefault();
          reader.goToFirstPage();
          break;
        case "End":
          e.preventDefault();
          reader.goToLastPage();
          break;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    this._keyDownHandler = onKeyDown;
  }

  // ============================================
  // NETTOYAGE
  // ============================================

  setupCleanupHandlers() {
    this._pageHideHandler = () => {
      if (this.isInitialized) this.saveToLocalStorage();
    };
    window.addEventListener("pagehide", this._pageHideHandler);

    this._visibilityChangeHandler = () => {
      if (document.visibilityState === "hidden") {
        this.saveToLocalStorage();
        window.quranReader?.imageCache.clear();
      } else if (document.visibilityState === "visible") {
        if (typeof window.quranReader?.onAppResume === "function") {
          window.quranReader.onAppResume();
        }
      }
    };
    document.addEventListener(
      "visibilitychange",
      this._visibilityChangeHandler,
    );

    this._onlineHandler = () =>
      window.quranApp?.showToast("✅ الاتصال بالإنترنت متوفر");
    this._offlineHandler = () =>
      window.quranApp?.showToast("⚠️ تم فقدان الاتصال بالإنترنت");
    window.addEventListener("online", this._onlineHandler);
    window.addEventListener("offline", this._offlineHandler);
  }

  // ============================================
  // DESTROY (NETTOYAGE COMPLET)
  // ============================================

  destroy() {
    // Annuler le timeout du toast
    if (this._toastTimeout) {
      clearTimeout(this._toastTimeout);
      this._toastTimeout = null;
    }

    // Retirer tous les écouteurs d'événements
    const events = [
      {
        target: window,
        type: "quran:pageChanged",
        handler: this._pageChangedHandler,
      },
      {
        target: window,
        type: "quran:bookmarkChanged",
        handler: this._bookmarkChangedHandler,
      },
      {
        target: window,
        type: "quran:readingModeChanged",
        handler: this._readingModeChangedHandler,
      },
      { target: document, type: "keydown", handler: this._keyDownHandler },

      { target: window, type: "pagehide", handler: this._pageHideHandler },
      {
        target: document,
        type: "visibilitychange",
        handler: this._visibilityChangeHandler,
      },
      { target: window, type: "online", handler: this._onlineHandler },
      { target: window, type: "offline", handler: this._offlineHandler },
    ];

    events.forEach(({ target, type, handler }) => {
      if (handler) {
        target.removeEventListener(type, handler);
      }
    });

    // Remettre les propriétés à null
    this._pageChangedHandler = null;
    this._bookmarkChangedHandler = null;
    this._readingModeChangedHandler = null;
    this._keyDownHandler = null;
    this._pageHideHandler = null;
    this._visibilityChangeHandler = null;
    this._onlineHandler = null;
    this._offlineHandler = null;

    // L'application n'est plus initialisée
    this.isInitialized = false;
  }
}

// ============================================
// UTILITAIRES DE RENDU DE LISTES
// ============================================

class ListItemRenderer {
  /**
   * Crée un conteneur d'item avec les classes de base
   * @param {string} type - "surah", "juz", "search", "bookmark"
   * @param {string} id - identifiant optionnel
   */
  static createContainer(type, id = null) {
    const div = document.createElement('div');
    div.className = `item-container item-${type}`;
    if (id) div.setAttribute(`data-${type}-id`, id);
    return div;
  }

  /**
   * Construit la première ligne (badge + titre à droite, éléments à gauche)
   */
  static buildLine1({ rightElements = [], leftElements = [] }) {
    const line1 = document.createElement('div');
    line1.className = 'item-line-1';

    const rightPart = document.createElement('div');
    rightPart.className = 'item-right';
    rightElements.forEach(el => rightPart.appendChild(el));

    const leftPart = document.createElement('div');
    leftPart.className = 'item-left';
    leftElements.forEach(el => leftPart.appendChild(el));

    line1.appendChild(rightPart);
    line1.appendChild(leftPart);
    return line1;
  }

  /**
   * Construit une ligne supplémentaire (2, 3...)
   */
  static buildLine(className, content) {
    const line = document.createElement('div');
    line.className = className;
    if (typeof content === 'string') {
      line.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      line.appendChild(content);
    }
    return line;
  }

  /**
   * Crée un badge standard
   */
  static createBadge(text, extraClass = '') {
    const span = document.createElement('span');
    span.className = `item-badge badge ${extraClass}`;
    span.textContent = text;
    return span;
  }

  /**
   * Crée un titre d'item
   */
  static createTitle(text) {
    const span = document.createElement('span');
    span.className = 'item-title';
    span.textContent = text;
    return span;
  }

  /**
   * Crée une étiquette de page
   */
  static createPageTag(page) {
    const span = document.createElement('span');
    span.className = 'page-tag';
    span.textContent = `ص ${page}`;
    return span;
  }

  /**
   * Crée une icône (bookmark, etc.)
   */
  static createIcon(icon, extraClass = '') {
    const span = document.createElement('span');
    span.className = `item-icon ${extraClass}`;
    span.textContent = icon;
    return span;
  }
}

// ============================================
// GESTION DES SELECTEURS PERSONNALISÉS
// ============================================

class CustomSelect {
  static _toggleReady = false;

  static initToggle() {
    if (CustomSelect._toggleReady) return;
    CustomSelect._toggleReady = true;

    document.querySelectorAll('.custom-select-btn').forEach(btn => {
      // Éviter les doublons en remplaçant le bouton par un clone
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wrap = newBtn.closest('.custom-select');
        const isOpen = wrap?.classList.contains('open');
        // Fermer tous les autres
        document.querySelectorAll('.custom-select.open').forEach(w => w.classList.remove('open'));
        if (!isOpen && wrap) {
          wrap.classList.add('open');
        }
      });
    });

    // Fermer au clic en dehors, mais pas si on clique sur un bouton
    document.addEventListener('click', (e) => {
      if (e.target.closest('.custom-select-btn')) return;
      document.querySelectorAll('.custom-select.open').forEach(w => w.classList.remove('open'));
    });
  }

  static render(listId, options) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = '';
    let curGroup = null;

    options.forEach(opt => {
      if (opt.group && opt.group !== curGroup) {
        curGroup = opt.group;
        const groupDiv = document.createElement('div');
        groupDiv.className = 'custom-select-group';
        groupDiv.textContent = opt.group;
        list.appendChild(groupDiv);
      }

      const el = document.createElement('div');
      el.className = 'custom-select-option';
      el.dataset.value = opt.value;
      el.textContent = opt.label;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        list.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        const btn = list.previousElementSibling;
        if (btn) btn.querySelector('.custom-select-val').textContent = opt.label;
        list.closest('.custom-select')?.classList.remove('open');
        if (opt.value !== '' && opt.onSelect) opt.onSelect(opt.value);
      });

      list.appendChild(el);
    });
  }

  static setValue(btnId, listId, value) {
    const list = document.getElementById(listId);
    const btn = document.getElementById(btnId);
    if (!list || !btn) return;

    const opt = list.querySelector(`[data-value="${value}"]`);
    if (!opt) return;

    list.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    btn.querySelector('.custom-select-val').textContent = opt.textContent;
    opt.scrollIntoView({ block: 'nearest' });
  }

  static getValue(listId) {
    const list = document.getElementById(listId);
    return list?.querySelector('.selected')?.dataset.value || '';
  }
}

// ============================================
// EXPOSITION GLOBALE (pour les autres modules)
// ============================================
window.ListItemRenderer = ListItemRenderer;
window.CustomSelect = CustomSelect;

// ============================================
// INITIALISATION DE L'APPLICATION
// ============================================

if (!window.quranApp) window.quranApp = new QuranApp();
if (typeof window !== "undefined" && !window.currentQuranPage)
  window.currentQuranPage = 1;
