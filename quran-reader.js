// ============================================================
//  FICHIER : quran-reader.js
//  Rôle : lecteur du mushaf (images de pages), modes livre / défilement,
//         navigation, défilement automatique, surlignage des versets
//
//  SOMMAIRE
//   1. Configuration (mise en page par riwaya, constantes)
//   2. LRUCache
//   3. QuranReader
//      Constructeur · Initialisation · Helpers privés
//      Infos de page · Création des pages · Hauteur et resize
//      Pages visibles · Chargement des images · Navigation
//      Mode de lecture · Détection de page · Swipe et tap
//      Défilement automatique · Setup UI et événements
//      Reprise et destruction · Surlignage
// ============================================================

// ============================================================
//   1. CONFIGURATION
// ============================================================

const RIWAYA_LAYOUT = {
  hafs: { WEBP_TOP: 50, WEBP_BOT: 50, SHRINK: 5, LEFT_OFFSET: -40, SCROLL_OFFSET: 10 },
  warsh: { WEBP_TOP: 5, WEBP_BOT: 45, SHRINK: 5, LEFT_OFFSET: 20, SCROLL_OFFSET: 40 },
  qaloon: { WEBP_TOP: 0, WEBP_BOT: 70, SHRINK: 5, LEFT_OFFSET: 0, SCROLL_OFFSET: 20 },
};

// Repère des coordonnées de ayapage.json (taille de l'image d'origine)
const PAGE_IMG = Object.freeze({ W: 1260, H: 1890 });

// ============================================================
//   2. LRUCACHE
// ============================================================

class LRUCache {
  constructor(limit = 30) {
    this.limit = limit;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.limit) {
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
  }

  delete(key) {
    this.cache.delete(key);
  }
}

// ============================================================
//   3. QURANREADER
// ============================================================

class QuranReader {
  // ---------- Constructeur ----------

  constructor() {
    this.config = { preloadRadius: 2 };

    this.currentPage = 1;
    this.previousPage = null;
    this.isRestoring = false;
    this.isTransitioning = false;
    this.resizePending = false;

    this.imageCache = new LRUCache(30);
    this.elements = {};
    this.eventListeners = [];

    this.buttonsVisible = true;
    this.tapEnabled = true;
    this.lastTapTime = 0;
    this.tapHandlers = {};

    this.readingMode = "scroll";
    this.isPortraitMode = false;
    this.swipeCleanup = null;

    this.resizeTimeout = null;
    this.orientationMedia = null;
    this.resizeFallbackHandler = null;
    this.resizeObserver = null;
    this.imageObserver = null;
    this._scrollHandler = null;
    this._scrollTarget = null;

    // Scroll mode — virtual pool
    this.wrapperPool = [];
    this.poolSize = 5;
    this.pageHeight = 0;
    this.totalHeight = 0;
    this.spacer = null;

    // Auto scroll
    this.autoScrollActive = false;
    this.autoScrollRAF = null;
    this.autoScrollSpeed = 0.2; // la vitesse enregistrée est lue dans init()
    this.minSpeed = 0.1;
    this.maxSpeed = 0.8;
    this.speedStep = 0.1;
    this._scrollAccum = 0;
    this._wakeLock = null;
    this._dialogOpen = false;
  }

  // ---------- Initialisation ----------

  async init(config = {}, startPage = 1) {
    Object.assign(this.config, config);
    this.autoScrollSpeed = parseFloat(AppStore.get(`${STORAGE_KEYS.prefix}scrollSpeed`)) || 0.2;
    this.cacheElements();
    await this.initializeState(startPage);
    this.setupUI();
    this.setupEventListeners();
    return this;
  }

  cacheElements() {
    this.elements = {
      app: document.getElementById("app"),
      pageScroll: document.getElementById("pageScroll"),
      menuBtn: document.getElementById("menuBtn"),
      bookmarkBtn: document.getElementById("bookmarkBtn"),
      autoScrollBtn: document.getElementById("autoScrollBtn"),
      bookmarkIcon: document.getElementById("bookmarkIcon"),
      surahInfo: document.getElementById("surahInfo"),
      pageNumber: document.getElementById("pageNumber"),
      hizbNumber: document.getElementById("hizbNumber"),
      sajdaIcon: document.getElementById("sajdaIcon"),
      header: document.querySelector(".header"),
      footer: document.querySelector(".footer"),
    };
  }

  async initializeState(startPage) {
    this.currentPage = AppUtils.clamp(startPage, 1, APP_CFG.TOTAL_PAGES);
    this.isRestoring = true;
    this.createAllPages();
    this.updatePageInfo(this.currentPage);
    await AppUtils.nextFrame();
    this.applyReadingMode();
    await AppUtils.nextFrame();
    this.goToPage(this.currentPage);
    await AppUtils.nextFrame();
    this.isRestoring = false;
    this.updateAutoScrollButton();
  }

  // ---------- Helpers privés ----------

  /** Position verticale (px) du haut de la page dans le mode défilement. */
  _pageTopOffset(page) {
    return (page - 1) * this.pageHeight;
  }

  /** Numéro de page stocké sur un wrapper du pool (NaN si non défini). */
  _wrapperPage(wrapper) {
    return parseInt(wrapper.dataset.page, 10);
  }

  /** Wrapper de la page en mode livre (ou null). */
  _findBookWrapper(page) {
    return this.elements.pageScroll?.querySelector(`.page-wrapper[data-page="${page}"]`) || null;
  }

  /** Image de la page en mode livre (ou null). */
  _findBookImage(page) {
    return this._findBookWrapper(page)?.querySelector("img") || null;
  }

  /** Exécute `callback` dès que l'image est prête (immédiat si déjà chargée). */
  _whenImageReady(img, callback) {
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      callback();
    } else {
      img.addEventListener("load", () => callback(), { once: true });
    }
  }

  /** Réinitialise un wrapper du pool pour une nouvelle page (mode défilement). */
  _resetPoolWrapper(wrapper, page) {
    wrapper.dataset.page = page;
    wrapper.style.top = `${this._pageTopOffset(page)}px`;
    wrapper.style.height = `${this.pageHeight}px`;
    const img = wrapper.querySelector("img");
    img.id = `page-${page}`;
    img.dataset.page = page;
    img.dataset.loaded = "false";
    img.src = "";
  }

  /** Charge les images d'une plage de pages (skipPage optionnel). */
  _loadPageRange(from, to, priority, skipPage = null) {
    for (let p = from; p <= to; p++) {
      if (p !== skipPage) this.loadPageImage(p, priority);
    }
  }

  // ---------- Infos de page ----------

  updatePageInfo(page) {
    if (!window.quranCalculator) return;
    const parsed = parseInt(page, 10);
    if (isNaN(parsed)) return;
    const pageNum = AppUtils.clamp(parsed, 1, APP_CFG.TOTAL_PAGES);

    this.currentPage = pageNum;
    if (this.elements.pageNumber) this.elements.pageNumber.textContent = pageNum;

    const data = window.quranCalculator.getPageData(pageNum);
    if (!data) return;

    if (this.elements.hizbNumber) this.elements.hizbNumber.textContent = data.hizb || 1;
    if (this.elements.surahInfo && data.surah) {
      this.elements.surahInfo.textContent = `${data.surah.s_id}.${data.surah.name} (${data.surah.verses_count})`;
    }
    this.elements.sajdaIcon?.classList.toggle("hidden", !data.sajda);

    window.quranApp?.updateBookmarkIcon(this.currentPage);

    const notifications = window.quranCalculator.getPageNotifications(pageNum);
    if (notifications.length) {
      window.quranApp?.showToast(notifications.join(" - ").replace(/ - (.*سجدة.*)/, "\n$1"));
    }

    this.applyButtonsVisibility();
  }

  // ---------- Création des pages ----------

  createAllPages() {
    if (!this.elements.pageScroll) return;
    this.elements.pageScroll.replaceChildren();
    if (this.readingMode === "book") this.createPagesForBookMode();
    else this.createPagesForScrollMode();
  }

  createPagesForBookMode() {
    const container = this.elements.pageScroll;
    if (!container) return;
    const wrappers = Array.from({ length: 3 }, () => {
      const wrapper = AppUtils.el("div", "page-wrapper");
      wrapper.style.display = "none";
      const img = AppUtils.el("img", "page-image portrait-image");
      img.dataset.loaded = "false";
      wrapper.appendChild(img);
      return wrapper;
    });
    container.replaceChildren(...wrappers);
    this.showCurrentPageImage();
  }

  showCurrentPageImage() {
    if (this.readingMode !== "book") return;
    const wrappers = this.elements.pageScroll.querySelectorAll(".page-wrapper");
    const pages = [
      this.currentPage - 1,
      this.currentPage,
      this.currentPage + 1,
    ].filter(AppUtils.isValidPage);

    wrappers.forEach((wrapper, i) => {
      const page = pages[i];
      if (!page) {
        wrapper.style.display = "none";
        return;
      }
      const img = wrapper.querySelector("img");
      wrapper.dataset.page = page;
      img.id = `page-${page}`;
      img.dataset.page = page;
      img.dataset.loaded = "false";
      img.src = "";
      wrapper.style.display = page === this.currentPage ? "flex" : "none";
      wrapper.classList.toggle("active", page === this.currentPage);

      if (page === this.currentPage) {
        void wrapper.offsetHeight;
        void wrapper.getBoundingClientRect();
        this._applyBookImageStyle(img);
      }

      this.loadPageImage(page, page === this.currentPage ? "high" : "low");
    });

    this._adjustFooterHeight();
  }

  /** Hauteur / largeur d'une page : lue dans le CSS (--page-aspect: largeur / hauteur). */
  _pageRatio() {
    if (!this._ratioCache) {
      const [w, h] = AppUtils.cssVar("--page-aspect", "700 / 1100").split("/").map(Number);
      this._ratioCache = h / w;
    }
    return this._ratioCache;
  }

  _pageContainer() {
    return this.elements.pageScroll || document.getElementById("app") || document.body;
  }

  _applyBookImageStyle(img) {
    if (!img) return;

    const apply = () => {
      if (this.readingMode !== "book") return;
      const container = this._pageContainer();
      const containerH = container.clientHeight || window.innerHeight;
      const containerW = container.clientWidth || window.innerWidth;
      if (!containerH || !containerW) return;

      const naturalH = this._pageRatio() * containerW;
      const maxStretch = naturalH * 1.3;

      if (naturalH >= containerH) {
        img.style.cssText = "width:100%;height:auto;";
      } else {
        const height = Math.min(containerH, maxStretch);
        img.style.cssText = `width:100%;height:${height}px;object-fit:fill;`;
      }

      void img.offsetHeight;
      this._adjustFooterHeight();
    };

    this._whenImageReady(img, () => AppUtils.afterFrames(apply));
  }

  createPagesForScrollMode() {
    const container = this.elements.pageScroll;
    if (!container) return;

    this.cleanupResizeObserver();
    this.updatePageHeight();

    this.spacer = AppUtils.el("div");
    Object.assign(this.spacer.style, { position: "relative", height: `${this.totalHeight}px`, width: "100%" });
    container.appendChild(this.spacer);

    this.wrapperPool = Array.from({ length: this.poolSize }, () => this._createPoolWrapper());
    this.spacer.append(...this.wrapperPool);

    this._bindScroll(container);
    this.updateVisiblePages();
    this.setupImageObserver();
    this.loadInitialPages();
    this.setupResizeObserver();
  }

  _createPoolWrapper() {
    const wrapper = AppUtils.el("div", "page-wrapper");
    Object.assign(wrapper.style, {
      position: "absolute",
      width: "100%",
      height: `${this.pageHeight}px`,
      top: "0",
      left: "0",
    });
    wrapper.dataset.page = "";
    const img = AppUtils.el("img", "page-image landscape-image");
    img.dataset.loaded = "false";
    wrapper.appendChild(img);
    return wrapper;
  }

  /** Un seul écouteur de scroll, même après plusieurs changements de mode. */
  _bindScroll(container) {
    if (this._scrollHandler) this._scrollTarget?.removeEventListener("scroll", this._scrollHandler);
    let rafPending = false;
    this._scrollHandler = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        this.updateVisiblePages();
        this.detectCurrentPage();
        rafPending = false;
      });
    };
    this._scrollTarget = container;
    container.addEventListener("scroll", this._scrollHandler);
  }

  // ---------- Hauteur et resize ----------

  updatePageHeight() {
    this.pageHeight = this._pageRatio() * window.innerWidth;
    this.totalHeight = APP_CFG.TOTAL_PAGES * this.pageHeight;
  }

  cleanupResizeObserver() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.resizeFallbackHandler) {
      window.removeEventListener("resize", this.resizeFallbackHandler);
      this.resizeFallbackHandler = null;
    }
  }

  setupResizeObserver() {
    if (this.readingMode !== "scroll") return;
    this.cleanupResizeObserver();
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === this.elements.pageScroll) {
            this.handleResize();
            break;
          }
        }
      });
      if (this.elements.pageScroll)
        this.resizeObserver.observe(this.elements.pageScroll);
    } else {
      const handler = () => this.handleResize();
      window.addEventListener("resize", handler);
      this.resizeFallbackHandler = handler;
    }
  }

  handleResize() {
    if (this.readingMode !== "scroll" || !this.spacer || this.resizePending) return;
    this.resizePending = true;

    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      requestAnimationFrame(() => {
        try {
          this._applyResize();
        } finally {
          this.resizePending = false; // même si une erreur survient
        }
      });
    }, 150);
  }

  _applyResize() {
    const container = this.elements.pageScroll;
    if (!container) return;
    const savedPage = this.currentPage;
    this.updatePageHeight();
    if (this.spacer) this.spacer.style.height = `${this.totalHeight}px`;
    this.wrapperPool.forEach((wrapper) => {
      wrapper.style.height = `${this.pageHeight}px`;
      const p = this._wrapperPage(wrapper);
      if (!isNaN(p) && p > 0) wrapper.style.top = `${this._pageTopOffset(p)}px`;
    });
    container.scrollTo({ top: this._pageTopOffset(savedPage), behavior: "auto" });
    this.updateVisiblePages();
  }

  // ---------- Pages visibles (scroll mode) ----------

  loadInitialPages() {
    const r = this.config.preloadRadius;
    const from = Math.max(1, this.currentPage - r);
    const to = Math.min(APP_CFG.TOTAL_PAGES, this.currentPage + r);
    this._loadPageRange(from, to, "high");
  }

  updateVisiblePages() {
    if (this.readingMode !== "scroll") return;
    const container = this.elements.pageScroll;
    if (!container || !this.spacer || !this.pageHeight || this.pageHeight <= 0)
      return;

    const scrollTop = container.scrollTop;
    const centerPage = Math.floor(scrollTop / this.pageHeight) + 1;
    const half = Math.floor(this.poolSize / 2);
    let fromPage = Math.max(1, centerPage - half);
    let toPage = Math.min(APP_CFG.TOTAL_PAGES, centerPage + half);

    if (toPage - fromPage + 1 < this.poolSize) {
      if (fromPage === 1) toPage = Math.min(APP_CFG.TOTAL_PAGES, fromPage + this.poolSize - 1);
      else if (toPage === APP_CFG.TOTAL_PAGES)
        fromPage = Math.max(1, toPage - this.poolSize + 1);
    }

    const visiblePages = [];
    for (let p = fromPage; p <= toPage; p++) visiblePages.push(p);

    visiblePages.forEach((page, i) => {
      if (i >= this.wrapperPool.length) return;
      const wrapper = this.wrapperPool[i];
      if (this._wrapperPage(wrapper) !== page) {
        this._resetPoolWrapper(wrapper, page);
      }
      wrapper.style.display = "block";
    });

    for (let i = visiblePages.length; i < this.wrapperPool.length; i++) {
      this.wrapperPool[i].style.display = "none";
    }

    const viewTop = scrollTop;
    const viewBottom = viewTop + container.clientHeight;
    this.wrapperPool.forEach((wrapper) => {
      if (wrapper.style.display === "none") return;
      const top = parseFloat(wrapper.style.top);
      const img = wrapper.querySelector("img");
      const page = this._wrapperPage(wrapper);
      if (top + this.pageHeight > viewTop && top < viewBottom) {
        if (img && img.dataset.loaded === "false")
          this.loadPageImage(page, "high");
      }
    });
  }

  setupImageObserver() {
    if (this.imageObserver) this.imageObserver.disconnect();
    this.imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const img = entry.target;
          const page = parseInt(img.dataset.page, 10);
          if (img.dataset.loaded === "false") this.loadPageImage(page, "auto");
        });
      },
      {
        root: this.elements.pageScroll,
        rootMargin: "200px 0px",
        threshold: 0.01,
      },
    );
    this.wrapperPool.forEach((wrapper) => {
      const img = wrapper.querySelector("img");
      if (img) this.imageObserver.observe(img);
    });
  }

  // ---------- Chargement des images ----------

  getPageImageUrl(page) {
    if (!AppUtils.isValidPage(page)) return "";
    return `./quran_pages/${AppUtils.pad3(page)}.webp`;
  }

  _findPageImage(page) {
    if (this.readingMode === "scroll") {
      const wrapper = this.wrapperPool.find((w) => this._wrapperPage(w) === page);
      return wrapper?.querySelector("img") || null;
    }
    return document.getElementById(`page-${page}`);
  }

  async loadPageImage(page, priority = "low") {
    if (!AppUtils.isValidPage(page)) return;

    const imgEl = this._findPageImage(page);
    if (!imgEl || imgEl.dataset.loaded === "true") return;

    const url = this.getPageImageUrl(page);

    if (this.imageCache.has(page)) {
      imgEl.src = this.imageCache.get(page);
      imgEl.dataset.loaded = "true";
      imgEl.dispatchEvent(new Event("load"));
      return;
    }

    const tempImg = new Image();
    tempImg.fetchPriority = priority;
    tempImg.src = url;

    try {
      await tempImg.decode();
    } catch {
      /* image absente ou illisible : le navigateur gérera l'erreur */
    }

    this.imageCache.set(page, url);
    // Le conteneur a pu être recyclé pour une autre page pendant le décodage
    if (this._wrapperPage(imgEl) !== page) return;
    imgEl.src = url;
    imgEl.dataset.loaded = "true";
  }

  // ---------- Navigation ----------

  goToPage(page) {
    if (this.isTransitioning) return;
    const pageNum = parseInt(page, 10);
    if (!AppUtils.isValidPage(pageNum)) return;
    this.isTransitioning = true;
    this.currentPage = pageNum;
    this.updatePageInfo(pageNum);

    if (this.readingMode === "book") {
      this.showCurrentPageImage();
      this.preloadAdjacentPages(pageNum);
    } else {
      this.scrollToPage(pageNum);
    }

    this.notifyPageChange(true);
    if (this.readingMode === "book") this._reapplyHighlightIfNeeded();
    setTimeout(() => { this.isTransitioning = false; }, 200);
  }

  _reapplyHighlightIfNeeded() {
    const player = window.quranAudioPlayer;
    if (!player?.currentSurah || !player?.ayaCoordsLoaded || player?.isStopped) return;
    const rects = player._getAyaRects(player.currentSurah, player.currentAyah);
    if (!rects?.length) return;
    if (rects[0].p !== this.currentPage) {
      this.clearHighlight();
      return;
    }
    const img = this._findBookImage(this.currentPage);
    if (!img) return;
    const apply = () => {
      if (player.isStopped) return;
      this.highlightAya(player.currentSurah, player.currentAyah, rects);
    };
    this._whenImageReady(img, apply);
  }

  scrollToPage(page) {
    const container = this.elements.pageScroll;
    if (!container || this.readingMode !== "scroll") return;
    if (!window.quranAudioPlayer || window.quranAudioPlayer.isStopped) {
      container.scrollTo({ top: this._pageTopOffset(page), behavior: "auto" });
    }
  }

  preloadAdjacentPages(page) {
    if (this.readingMode !== "book") return;
    const from = Math.max(1, page - this.config.preloadRadius);
    const to = Math.min(APP_CFG.TOTAL_PAGES, page + this.config.preloadRadius);
    this._loadPageRange(from, to, "low", page);
  }

  goToNextPage() {
    if (this.currentPage < APP_CFG.TOTAL_PAGES) this.goToPage(this.currentPage + 1);
  }

  goToPreviousPage() {
    if (this.currentPage > 1) this.goToPage(this.currentPage - 1);
  }

  goToFirstPage() {
    this.goToPage(1);
  }

  goToLastPage() {
    this.goToPage(APP_CFG.TOTAL_PAGES);
  }

  getCurrentPage() {
    return this.currentPage;
  }

  // ---------- Mode de lecture ----------

  detectReadingMode() {
    if (window.screen && window.screen.orientation) {
      this.isPortraitMode =
        window.screen.orientation.type.startsWith("portrait");
    } else if (window.matchMedia) {
      this.isPortraitMode = window.matchMedia(
        "(orientation: portrait)",
      ).matches;
    } else {
      this.isPortraitMode = window.innerHeight > window.innerWidth;
    }
    return this.isPortraitMode ? "book" : "scroll";
  }

  applyReadingMode() {
    const prevMode = this.readingMode;
    this.readingMode = this.detectReadingMode();
    const container = this.elements.pageScroll;
    if (!container) return;
    const isBook = this.readingMode === "book";

    this.cleanupResizeObserver();
    this._cleanupTapHandlers();
    container.style.opacity = "0";

    if (prevMode !== this.readingMode) this.createAllPages();

    container.classList.remove("mode-portrait", "mode-landscape");
    container.style.cssText = "";
    container.classList.add(isBook ? "mode-portrait" : "mode-landscape");
    Object.assign(container.style, {
      overflowX: "hidden",
      overflowY: "auto",
      display: "block",
      height: "100%",
      width: isBook ? "100vw" : "100%",
    });

    if (isBook) {
      this.setupSwipeNavigation();
    } else {
      this.removeSwipeNavigation();
      this.setupResizeObserver();
    }

    requestAnimationFrame(() => {
      if (isBook) this.goToPage(this.currentPage);
      else this.scrollToPage(this.currentPage);
      container.style.opacity = "1";
    });

    AppUtils.emit(APP_EVENTS.readingModeChanged, {
      mode: this.readingMode,
      isPortrait: this.isPortraitMode,
      savedPage: this.currentPage,
    });

    this.updateAutoScrollButton();
    this.setupTapToHide();
  }

  // ---------- Détection de page (scroll) ----------

  detectCurrentPage() {
    if (!this.isRestoring && this.readingMode !== "book")
      this.detectCurrentPageScroll();
  }

  detectCurrentPageScroll() {
    if (this.isTransitioning) return;
    const container = this.elements.pageScroll;
    if (!container || this.readingMode !== "scroll") return;
    const middle = container.scrollTop + container.clientHeight / 2;
    const detected = AppUtils.clamp(Math.floor(middle / this.pageHeight) + 1, 1, APP_CFG.TOTAL_PAGES);
    if (detected === this.currentPage) return;

    const step = detected > this.currentPage ? 1 : -1;
    for (let p = this.currentPage + step; p !== detected + step; p += step) {
      this.currentPage = p;
      this.updatePageInfo(p);
    }
    this.notifyPageChange();
  }

  notifyPageChange(force = false) {
    if (!force && this.isTransitioning) return;
    const oldPage = this.previousPage;
    this.previousPage = this.currentPage;
    AppUtils.emit(APP_EVENTS.pageChanged, { page: this.currentPage, oldPage });
  }

  // ---------- Swipe navigation (book mode) ----------

  setupSwipeNavigation() {
    if (!this.elements.pageScroll || this.readingMode !== "book") return;
    const element = this.elements.pageScroll;

    this.removeSwipeNavigation();
    this.swipeCleanup = window.quranApp.enableSwipe(
      element,
      () => {
        if (!this.isTransitioning && !this._dialogOpen) this.goToNextPage();
      },
      () => {
        if (!this.isTransitioning && !this._dialogOpen) this.goToPreviousPage();
      },
      50,
      300
    );
  }

  removeSwipeNavigation() {
    if (this.swipeCleanup) {
      this.swipeCleanup();
      this.swipeCleanup = null;
    }
  }

  // ---------- Tap to hide ----------

  _cleanupTapHandlers() {
    const el = this.elements.pageScroll;
    if (el) {
      Object.entries(this.tapHandlers).forEach(([type, handler]) => el.removeEventListener(type, handler));
    }
    this.tapHandlers = {};
  }

  setupTapToHide() {
    const el = this.elements.pageScroll;
    if (!el) return;
    this._cleanupTapHandlers();
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    const MAX_TAP_MS = 400;
    const MAX_TAP_MOVE_PX = 20;
    const TAP_DEBOUNCE_MS = 300;

    const blocked = () => this.isTransitioning || !this.tapEnabled;

    const onTouchStart = (e) => {
      if (blocked()) return;
      touchStartTime = Date.now();
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const onTouchEnd = (e) => {
      if (blocked()) return;
      const now = Date.now();
      const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX);
      const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY);
      const isTap =
        now - touchStartTime < MAX_TAP_MS &&
        deltaX < MAX_TAP_MOVE_PX &&
        deltaY < MAX_TAP_MOVE_PX;
      if (isTap && now - this.lastTapTime > TAP_DEBOUNCE_MS) {
        this.lastTapTime = now;
        this.toggleButtonsVisibility();
      }
    };

    const onClick = (e) => {
      if (blocked()) return;
      const now = Date.now();
      const tooSoon = now - this.lastTapTime < TAP_DEBOUNCE_MS;
      this.lastTapTime = now;
      if (tooSoon) return;
      if (e.target.closest(".header-btn, .footer-item, .menu-overlay, .overlay")) return;
      this.toggleButtonsVisibility();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("click", onClick);
    this.tapHandlers = { touchstart: onTouchStart, touchend: onTouchEnd, click: onClick };
  }

  toggleButtonsVisibility() {
    const menuOpen = document.querySelector(".menu-overlay.show");
    if (document.querySelector(".overlay.show") && !menuOpen) return;
    this.buttonsVisible = !this.buttonsVisible;
    this._applyHeaderFooterVisibility();
    this._emitButtonsVisibility();
  }

  _emitButtonsVisibility() {
    AppUtils.emit(APP_EVENTS.buttonsVisibility, { visible: this.buttonsVisible });
  }

  applyButtonsVisibility() {
    this._applyHeaderFooterVisibility();
    setTimeout(() => this._adjustFooterHeight(), 50);
    this._emitButtonsVisibility();
  }

  _applyHeaderFooterVisibility() {
    [this.elements.header, this.elements.footer].forEach(el =>
      el?.classList.toggle("hidden", !this.buttonsVisible)
    );
  }

  _adjustFooterHeight() {
    if (this.readingMode !== "book") return;
    if (this.isTransitioning) return;
    const activeWrapper = this.elements.pageScroll?.querySelector(".page-wrapper.active");
    if (!activeWrapper) return;
    const img = activeWrapper.querySelector('img');
    if (!img) return;

    const apply = () => {
      if (!img.complete || img.naturalWidth === 0) return;
      if (img.getBoundingClientRect().height === 0) return;
      requestAnimationFrame(() => {
        this._applyFooterAdjustment(img);
      });
    };

    this._whenImageReady(img, apply);
  }

  _applyFooterAdjustment(img) {
    const footer = this.elements.footer;
    if (!footer) return;

    const container = this._pageContainer();
    const containerH = container.clientHeight || window.innerHeight;
    const spaceBelow =
      (container.getBoundingClientRect().bottom || containerH) - img.getBoundingClientRect().bottom;
    const minFooter = AppUtils.cssPx("--footer-height", 56);
    const footerHeight = spaceBelow > minFooter ? spaceBelow : minFooter;

    footer.style.height = `${footerHeight}px`;
    footer.style.minHeight = `${footerHeight}px`;

    // La mini-barre audio prend la même hauteur que le footer quand elle est visible
    const miniBar = document.getElementById("audioMiniBar");
    if (miniBar) {
      const visible = !miniBar.classList.contains("hidden");
      miniBar.style.height = visible ? `${footerHeight}px` : "";
      miniBar.style.minHeight = visible ? `${footerHeight}px` : "";
    }
  }

  enableTapDetection(enabled) {
    this.tapEnabled = enabled;
  }

  // ---------- Auto scroll ----------

  _getAutoScrollBtns() {
    return {
      btnScroll: document.getElementById("autoScrollBtn"),
      btnIcon: document.getElementById("autoScrollIcon"),
      btnSlower: document.getElementById("autoScrollSlower"),
      btnFaster: document.getElementById("autoScrollFaster"),
    };
  }

  startAutoScroll() {
    if (this.autoScrollActive) return;
    this.autoScrollActive = true;
    this._acquireWakeLock();

    const { btnScroll, btnIcon } = this._getAutoScrollBtns();
    btnScroll?.classList.add("playing");
    if (btnIcon) btnIcon.textContent = "⏸️";
    this._setSpeedButtonsVisible(true);
    this._updateSpeedButtons();

    let lastTimestamp = null;
    const tick = (timestamp) => {
      if (!this.autoScrollActive) return;
      if (lastTimestamp !== null && this._autoScrollStep(timestamp - lastTimestamp)) return;
      lastTimestamp = timestamp;
      this.autoScrollRAF = requestAnimationFrame(tick);
    };
    this.autoScrollRAF = requestAnimationFrame(tick);
  }

  /** Avance d'un pas ; retourne true si le défilement s'est arrêté (fin de page). */
  _autoScrollStep(delta) {
    const el = this.elements.pageScroll;
    if (!el) return false;
    this._scrollAccum += (this.autoScrollSpeed * delta) / 16;
    const pixels = Math.floor(this._scrollAccum);
    if (pixels > 0) {
      el.scrollTop += pixels;
      this._scrollAccum -= pixels;
    }
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
      this.stopAutoScroll();
      return true;
    }
    return false;
  }

  async _acquireWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      const lock = await navigator.wakeLock.request("screen");
      if (this.autoScrollActive) this._wakeLock = lock;
      else lock.release();
    } catch {
      /* non supporté ou refusé */
    }
  }

  _setSpeedButtonsVisible(visible) {
    const { btnSlower, btnFaster } = this._getAutoScrollBtns();
    [btnSlower, btnFaster].forEach((btn) => {
      if (!btn) return;
      if (visible) {
        btn.style.display = "";
        requestAnimationFrame(() => btn.classList.add("visible"));
      } else {
        btn.classList.remove("visible");
        setTimeout(() => {
          btn.style.display = "none";
        }, AppUtils.cssMs("--speed-btn-fade", 200));
      }
    });
  }

  stopAutoScroll() {
    if (!this.autoScrollActive) return;
    this.autoScrollActive = false;

    if (this._wakeLock) {
      this._wakeLock.release();
      this._wakeLock = null;
    }

    this._scrollAccum = 0;
    if (this.autoScrollRAF) {
      cancelAnimationFrame(this.autoScrollRAF);
      this.autoScrollRAF = null;
    }

    const { btnScroll, btnIcon } = this._getAutoScrollBtns();
    btnScroll?.classList.remove("playing");
    if (btnIcon) btnIcon.textContent = "⏫";
    this._setSpeedButtonsVisible(false);
  }

  toggleAutoScroll() {
    if (this.autoScrollActive) this.stopAutoScroll();
    else this.startAutoScroll();
  }

  changeSpeed(direction) {
    const raw = Math.round((this.autoScrollSpeed + direction * this.speedStep) * 10) / 10;
    const speed = AppUtils.clamp(raw, this.minSpeed, this.maxSpeed);
    if (speed === this.autoScrollSpeed) return;
    this.autoScrollSpeed = speed;
    window.quranApp?.setPreference("scrollSpeed", speed);
    this._updateSpeedButtons();
    window.quranApp?.showToast(`⚡ السرعة: ${speed.toFixed(1)}`);
  }

  _updateSpeedButtons() {
    const { btnSlower, btnFaster } = this._getAutoScrollBtns();
    if (btnSlower) btnSlower.disabled = this.autoScrollSpeed <= this.minSpeed + 0.01;
    if (btnFaster) btnFaster.disabled = this.autoScrollSpeed >= this.maxSpeed - 0.01;
  }

  updateAutoScrollButton() {
    const el =
      document.getElementById("autoScrollGroup") ||
      document.getElementById("autoScrollBtn");
    if (!el) return;
    if (this.readingMode === "scroll") {
      el.style.display = "";
    } else {
      this.stopAutoScroll();
      el.style.display = "none";
    }
  }

  // ---------- Setup UI et événements ----------

  setupUI() {
    setTimeout(() => {
      if (this.readingMode === "book") {
        this.loadPageImage(this.currentPage, "high");
        this.preloadAdjacentPages(this.currentPage);
        this._adjustFooterHeight();
      }
    }, 50);
    this.updateAutoScrollButton();
  }

  setupEventListeners() {
    if (!this.elements.pageScroll) return;

    this._setupOrientationListener();

    this._setupBookmarkButton();
    this._on(this.elements.autoScrollBtn, "click", () => this.toggleAutoScroll());
    this._on(document.getElementById("autoScrollSlower"), "click", () => this.changeSpeed(-1));
    this._on(document.getElementById("autoScrollFaster"), "click", () => this.changeSpeed(1));
    this._on(this.elements.pageNumber, "click", () => window.overlayManager?.showPageInputDialog());

    this.setupTapToHide();

    this._on(window, APP_EVENTS.menuToggle, (e) => {
      if (e.detail.isOpen) {
        this.buttonsVisible = true;
        this.applyButtonsVisibility();
        this.enableTapDetection(false);
      } else {
        this.enableTapDetection(true);
      }
    });

    this._on(window, APP_EVENTS.overlayOpened, () => {
      this.buttonsVisible = true;
      this.applyButtonsVisibility();
      this.enableTapDetection(false);
      this._dialogOpen = true;
    });

    this._on(window, APP_EVENTS.overlayClosed, () => {
      this.enableTapDetection(true);
      this._dialogOpen = false;
    });

    this._on(window, APP_EVENTS.buttonsVisibility, () => {
      if (this.readingMode === "book") this._adjustFooterHeight();
    });
  }

  // ---------- Bouton signets : appui court / appui long ----------

  /** Appui court : ouvre la fenêtre des signets. Appui long : ajoute la page directement (ruban 🔖) ou ouvre la fenêtre (étoile ⭐). */
  _setupBookmarkButton() {
    const btn = this.elements.bookmarkBtn;
    if (!btn) return;
    let timer = null;
    let longPressed = false;
    const cancel = () => {
      clearTimeout(timer);
      timer = null;
    };
    this._on(btn, "pointerdown", () => {
      longPressed = false;
      cancel();
      timer = setTimeout(() => {
        longPressed = true;
        this._bookmarkLongPress();
      }, 500);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((type) => this._on(btn, type, cancel));
    this._on(btn, "contextmenu", (e) => e.preventDefault());
    this._on(btn, "click", () => {
      if (longPressed) {
        longPressed = false; // le relâchement après un appui long ne doit pas rouvrir la fenêtre
        return;
      }
      window.overlayManager?.showBookmarks();
    });
  }

  _bookmarkLongPress() {
    const app = window.quranApp;
    const om = window.overlayManager;
    const page = this.currentPage;
    navigator.vibrate?.(30);
    if (!app || app.bookmarkedPagesSet.has(page)) {
      om?.showBookmarks(); // page déjà en favori (étoile) : on ouvre la fenêtre
      return;
    }
    const name = om?.getDefaultBookmarkName?.(page) || `صفحة ${page}`;
    app.addBookmark({ id: `bookmark_${page}_${Date.now()}`, page, name });
    app.showToast("⭐ تمت إضافة العلامة المرجعية");
  }

  // ---------- Rotation de l'écran ----------

  _setupOrientationListener() {
    if (window.matchMedia) {
      this.orientationMedia = window.matchMedia("(orientation: portrait)");
      const onChange = (e) => {
        if ((e.matches ? "book" : "scroll") !== this.readingMode) this._handleOrientationChange();
      };
      try {
        this._on(this.orientationMedia, "change", onChange);
        return;
      } catch {
        /* anciens navigateurs : repli sur orientationchange */
      }
    }
    this._on(window, "orientationchange", () => this._handleOrientationChange());
  }

  _handleOrientationChange() {
    this.isTransitioning = true;
    const savedPage = this.currentPage;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    setTimeout(() => {
      try {
        this.applyReadingMode();
        setTimeout(() => this._finishOrientationChange(savedPage, isIOS), isIOS ? 300 : 200);
      } catch {
        this.isTransitioning = false;
      }
    }, isIOS ? 500 : 50);
  }

  _finishOrientationChange(savedPage, isIOS) {
    this.goToPage(savedPage);
    if (isIOS && this.readingMode === "book") this._reloadImageIOS(savedPage);
    if (this.readingMode === "book") this._adjustFooterHeight();

    const player = window.quranAudioPlayer;
    if (!player?.isStopped && (player?.isPlaying || player?.currentAyah)) {
      setTimeout(() => this._reapplyHighlightIfNeeded(), 100);
    }
    this.isTransitioning = false;
  }

  /** iOS : force le rafraîchissement de l'image après rotation. */
  _reloadImageIOS(page) {
    const img = document.querySelector(`img[data-page="${page}"]`);
    if (!img) return;
    const src = img.src;
    img.src = "";
    requestAnimationFrame(() => {
      img.src = src;
      img.dataset.loaded = "true";
    });
  }

  _on(el, type, handler, opts) {
    if (!el) return;
    el.addEventListener(type, handler, opts);
    this.eventListeners.push({ element: el, type, handler });
  }

  // ---------- Reprise et destruction ----------

  onAppResume() {
    this.isTransitioning = false;
    const overlayOpen = document.querySelector(".overlay.show, .menu-overlay.show") !== null;
    this.tapEnabled = !overlayOpen;
    if (this.autoScrollActive) this._acquireWakeLock();
    this.applyReadingMode();
    setTimeout(() => {
      if (this.readingMode === "book") {
        this.loadPageImage(this.currentPage, "high");
        this._adjustFooterHeight();
      }
    }, 100);
  }

  destroy() {
    this.stopAutoScroll();
    this.cleanupResizeObserver();
    if (this.imageObserver) {
      this.imageObserver.disconnect();
      this.imageObserver = null;
    }
    if (this._scrollHandler) {
      this._scrollTarget?.removeEventListener("scroll", this._scrollHandler);
      this._scrollHandler = null;
      this._scrollTarget = null;
    }
    this.eventListeners.forEach(({ element, type, handler }) => {
      try {
        element.removeEventListener(type, handler);
      } catch {
        /* cible déjà détruite */
      }
    });
    this.eventListeners = [];
    this._cleanupTapHandlers();
    this.removeSwipeNavigation();
    this.imageCache.clear();
  }

  // ---------- Surlignage du verset ----------

  highlightAya(surah, ayah, rects) {
    this.clearHighlight();
    if (!rects?.length) return;
    const page = this.currentPage;
    if (rects[0]?.p !== page) return;

    const rc = RIWAYA_LAYOUT[window.ACTIVE_RIWAYA] ?? RIWAYA_LAYOUT.hafs;
    const { WEBP_TOP, WEBP_BOT, SHRINK } = rc;
    const lineMap = this._buildLineMap(page);

    let imgW, imgH, getLeft, getTop, appendTo;

    if (this.readingMode === "scroll") {
      if (!this.spacer || !this.pageHeight) return;
      imgW = this.elements.pageScroll?.clientWidth ?? window.innerWidth;
      imgH = this.pageHeight;
      if (!imgW || !imgH) return;
      const pageOffsetTop = this._pageTopOffset(page);
      getLeft = (sx, r) => (r.x1 + rc.LEFT_OFFSET) * sx;
      getTop = (sy, realY1, yCorrect) => pageOffsetTop + realY1 * sy + yCorrect + SHRINK * sy;
      appendTo = this.spacer;
    } else {
      const wrapper = this._findBookWrapper(page);
      const img = wrapper?.querySelector("img");
      if (!img) return;
      imgW = img.offsetWidth || img.naturalWidth;
      imgH = img.offsetHeight || Math.round((img.naturalWidth * PAGE_IMG.H) / PAGE_IMG.W);
      if (!imgW || !imgH) return;
      const offX = img.offsetLeft;
      const offY = img.offsetTop;
      getLeft = (sx, r) => offX + (r.x1 + rc.LEFT_OFFSET) * sx;
      getTop = (sy, realY1, yCorrect) => offY + realY1 * sy + yCorrect + SHRINK * sy;
      appendTo = wrapper;
    }

    const sx = imgW / PAGE_IMG.W;
    const sy = imgH / PAGE_IMG.H;

    rects.forEach((r) => {
      const line = r.l ? lineMap[r.l] : null;
      const realY1 = line ? line.y1 : r.y1;
      const realY2 = line ? line.y2 : r.y2;
      const yCorrect = (WEBP_TOP - (realY1 / PAGE_IMG.H) * (WEBP_TOP + WEBP_BOT)) * sy;

      const div = AppUtils.el("div", "aya-highlight");
      Object.assign(div.style, {
        position: "absolute",
        left: `${getLeft(sx, r)}px`,
        width: `${(r.x2 - r.x1) * sx}px`,
        top: `${getTop(sy, realY1, yCorrect)}px`,
        height: `${(realY2 - realY1) * sy - SHRINK * 2 * sy}px`,
      });
      appendTo.appendChild(div);
    });

    if (this.readingMode === "scroll") this._scrollToFirstHighlight(rc.SCROLL_OFFSET);
  }

  /** Une ligne peut contenir plusieurs versets : on prend ses limites verticales réelles. */
  _buildLineMap(page) {
    const lineMap = {};
    (window.quranAudioPlayer?.ayaCoords || []).forEach((r) => {
      if (r.p !== page || !r.l) return;
      const line = lineMap[r.l];
      if (!line) {
        lineMap[r.l] = { y1: r.y1, y2: r.y2 };
      } else {
        line.y1 = Math.min(line.y1, r.y1);
        line.y2 = Math.max(line.y2, r.y2);
      }
    });
    return lineMap;
  }

  _scrollToFirstHighlight(scrollOffset) {
    const first = this.spacer.querySelector(".aya-highlight");
    if (!first) return;
    const container = this.elements.pageScroll;
    const offset = container.getBoundingClientRect().top + scrollOffset;
    container.scrollTo({ top: parseFloat(first.style.top) - offset, behavior: "auto" });
  }

  clearHighlight() {
    document.querySelectorAll(".aya-highlight").forEach((el) => el.remove());
  }
}

// ============================================================
//   DÉMARRAGE
// ============================================================

window.quranReader = new QuranReader();