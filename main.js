class QuranApp {
  constructor() {
    this.isInitialized = false;
    this.isInitializing = false;

    this.bookmarks = [];
    this.pinnedSurahs = [];
    this.lastPage = 1;
    this.theme = "light";

    this.NOTIFICATION_DURATION = 1000;

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
    if (this.isInitialized || this.isInitializing) return;
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
      this.bookmarks = this.bookmarks.map((b, i) =>
        typeof b === "number"
          ? {
              page: b,
              name: `صفحة ${b}`,
              date: new Date().toISOString(),
              id: `bookmark_${b}_${Date.now()}_${i}`,
            }
          : { ...b, id: b.id || `bookmark_${b.page}_${Date.now()}_${i}` },
      );

      const rawPage = localStorage.getItem("quran_lastPage");
      this.lastPage = rawPage ? parseInt(rawPage) : 1;
      if (isNaN(this.lastPage) || this.lastPage < 1 || this.lastPage > 604)
        this.lastPage = 1;

      this.theme = localStorage.getItem("quran_theme") || "light";

      const rawPinned = localStorage.getItem("quran_pinnedSurahs");
      this.pinnedSurahs = rawPinned ? JSON.parse(rawPinned) : [];
    } catch (err) {
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
    } catch (err) {
      try {
        localStorage.setItem("quran_lastPage", this.lastPage.toString());
      } catch (e) {}
    }
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
    } catch (err) {
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
  // DIALOGUE SAISIE DE PAGE
  // ============================================

showPageInputDialog() {
  if (window.quranReader) window.quranReader._dialogOpen = true;
  window.dispatchEvent(new CustomEvent("quran:overlayOpened"));

  // Backdrop standard
  const backdrop = document.createElement("div");
  backdrop.className = "overlay show";
  backdrop.style.zIndex = "100000";

  // Dialog avec la classe overlay-content (largeur standard)
  const dialog = document.createElement("div");
  dialog.className = "overlay-content";

  // Header
  const header = document.createElement("div");
  header.className = "overlay-header";

  const title = document.createElement("h2");
  title.textContent = "📄 الانتقال إلى صفحة";

  const closeBtn = document.createElement("button");
  closeBtn.className = "btn close-btn";
  closeBtn.textContent = "✕";
  closeBtn.setAttribute("aria-label", "إغلاق");

  header.appendChild(title);
  header.appendChild(closeBtn);
  dialog.appendChild(header);

  // Corps
  const body = document.createElement("div");
  body.style.padding = "16px";

  const label = document.createElement("p");
  label.textContent = "أدخل رقم الصفحة (1-604)";
  label.style.textAlign = "right";
  label.style.margin = "0 0 12px 0";
  body.appendChild(label);

  // Conteneur pour input + bouton (flex row)
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "8px";

  const input = document.createElement("input");
  input.type = "tel";
  input.inputMode = "numeric";
  input.pattern = "[0-9]*";
  input.placeholder = "1-604";
  input.value = this.lastPage;
  input.className = "search-input";
  input.style.flex = "1";          // prend l'espace disponible
  input.style.direction = "ltr";
  input.style.textAlign = "right";
  input.style.margin = "0";

  const goBtn = document.createElement("button");
  goBtn.className = "confirm-btn ok";
  goBtn.textContent = "اذهب";
  goBtn.style.flexShrink = "0";    // ne se réduit pas

  row.appendChild(input);
  row.appendChild(goBtn);
  body.appendChild(row);

  dialog.appendChild(body);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);

  // Focus et sélection
  setTimeout(() => {
    input.focus();
    setTimeout(() => input.setSelectionRange(0, input.value.length), 100);
  }, 50);

  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    input.blur();
    backdrop.remove();
    if (window.quranReader) window.quranReader._dialogOpen = false;
    window.dispatchEvent(new CustomEvent("quran:overlayClosed"));
  };

  const confirm = () => {
    if (closed) return;
    const pageNum = parseInt(input.value, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= 604) {
      this.goToPage(pageNum);
      close();
    } else {
      this.showToast("❌ الرجاء إدخال رقم صفحة صحيح (1-604)");
      input.focus();
    }
  };

  const isTouch = "ontouchstart" in window;
  goBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    confirm();
  });
  goBtn.addEventListener("click", () => {
    if (!isTouch) confirm();
  });
  closeBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    close();
  });
  closeBtn.addEventListener("click", () => {
    if (!isTouch) close();
  });
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirm();
    }
  });
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
    this._beforeUnloadHandler = () => {
      if (this.isInitialized) this.saveToLocalStorage();
    };
    window.addEventListener("beforeunload", this._beforeUnloadHandler);

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
}

// ============================================
// INITIALISATION
// ============================================

if (!window.quranApp) window.quranApp = new QuranApp();
if (typeof window !== "undefined" && !window.currentQuranPage)
  window.currentQuranPage = 1;
