// ============================================
// LRU CACHE
// ============================================

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

// ============================================
// QURAN READER
// ============================================

class QuranReader {
  constructor() {
    this.config = { totalPages: 604, preloadRadius: 2 };

    this.currentPage = 1;
    this.previousPage = null;
    this.isMenuOpen = false;
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
    this.swipeEnabled = false;
    this.swipeHandlers = null;

    this.resizeTimeout = null;
    this.pendingPage = null;
    this.orientationMedia = null;
    this.resizeFallbackHandler = null;
    this.resizeObserver = null;
    this.imageObserver = null;
    this.menuObserver = null;

    // Scroll mode — virtual pool
    this.wrapperPool = [];
    this.poolSize = 5;
    this.pageHeight = 0;
    this.totalHeight = 0;
    this.spacer = null;

    // Auto scroll
    this.autoScrollActive = false;
    this.autoScrollRAF = null;
    this.autoScrollSpeed = 0.2;
    this.minSpeed = 0.1;
    this.maxSpeed = 0.8;
    this.speedStep = 0.1;
    this._scrollAccum = 0;
  }

  // ============================================
  // INITIALISATION
  // ============================================

  async init(config = {}, startPage = 1) {
    Object.assign(this.config, config);
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
      menuIcon: document.getElementById("menuIcon"),
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
    this.currentPage = Math.max(1, Math.min(604, startPage));
    this.isRestoring = true;
    this.createAllPages();
    this.updatePageInfo(this.currentPage);
    await new Promise((r) => requestAnimationFrame(r));
    this.applyReadingMode();
    await new Promise((r) => requestAnimationFrame(r));
    this.goToPage(this.currentPage);
    await new Promise((r) => requestAnimationFrame(r));
    this.isRestoring = false;
    this.updateAutoScrollButton();
  }

  // ============================================
  // INFOS DE PAGE
  // ============================================

  updatePageInfo(page) {
    if (page > 604) page = 604;
    if (page < 1) page = 1;
    if (!window.quranCalculator) return;

    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > 604) return;

    this.currentPage = pageNum;
    if (this.elements.pageNumber)
      this.elements.pageNumber.textContent = pageNum;

    const data = window.quranCalculator.getPageData(pageNum);
    if (!data) return;

    if (this.elements.hizbNumber)
      this.elements.hizbNumber.textContent = data.hizb || 1;
    if (this.elements.surahInfo && data.surah) {
      this.elements.surahInfo.textContent = `${data.surah.s_id}.${data.surah.name} (${data.surah.verses_count})`;
    }
    if (this.elements.sajdaIcon) {
      this.elements.sajdaIcon.style.display = data.sajda ? "inline" : "none";
    }

    this.updateBookmarkButton();

    const notifications = window.quranCalculator.getPageNotifications(pageNum);
    if (notifications?.length) {
      const relevant = notifications.filter(
        (n) => n.includes("الجزء") || n.includes("الحزب") || n.includes("سجدة"),
      );
      if (relevant.length) window.quranApp?.showToast(relevant.join(" - "));
    }

    this.applyButtonsVisibility();
  }

  updateBookmarkButton() {
    if (!this.elements.bookmarkIcon || !window.quranApp) return;
    const hasBookmark = window.quranApp
      .getBookmarks()
      .some((b) => b.page === this.currentPage);
    this.elements.bookmarkIcon.textContent = hasBookmark ? "⭐" : "🔖";
  }

  // ============================================
  // CRÉATION DES PAGES
  // ============================================

  createAllPages() {
    if (!this.elements.pageScroll) return;
    this.elements.pageScroll.innerHTML = "";
    if (this.readingMode === "book") {
      this.createPagesForBookMode();
    } else {
      this.createPagesForScrollMode();
    }
  }

  createPagesForBookMode() {
    const container = this.elements.pageScroll;
    if (!container) return;
    container.innerHTML = "";
    for (let i = 0; i < 3; i++) {
      const wrapper = document.createElement("div");
      wrapper.className = "page-wrapper";
      wrapper.style.display = "none";
      const img = document.createElement("img");
      img.className = "page-image portrait-image";
      img.setAttribute("data-loaded", "false");
      wrapper.appendChild(img);
      container.appendChild(wrapper);
    }
    this.showCurrentPageImage();
  }

  showCurrentPageImage() {
    if (this.readingMode !== "book") return;
    const wrappers = this.elements.pageScroll.querySelectorAll(".page-wrapper");
    const pages = [
      this.currentPage - 1,
      this.currentPage,
      this.currentPage + 1,
    ].filter((p) => p >= 1 && p <= 604);

    wrappers.forEach((wrapper, i) => {
      const page = pages[i];
      if (!page) {
        wrapper.style.display = "none";
        return;
      }
      const img = wrapper.querySelector("img");
      wrapper.setAttribute("data-page", page);
      img.id = `page-${page}`;
      img.setAttribute("data-page", page);
      img.setAttribute("data-loaded", "false");
      img.src = "";
      wrapper.style.display = page === this.currentPage ? "flex" : "none";
      if (page === this.currentPage) {
        const naturalH = (1100 * window.innerWidth) / 700;
        const maxStretch = naturalH * 1.25;
        if (naturalH >= window.innerHeight) {
          img.style.cssText = "width:100%;height:auto;";
        } else if (window.innerHeight <= maxStretch) {
          img.style.cssText =
            "width:100%;height:" + window.innerHeight + "px;object-fit:fill;";
        } else {
          img.style.cssText =
            "width:100%;height:" + maxStretch + "px;object-fit:fill;";
        }
      }
      wrapper.classList.toggle("active", page === this.currentPage);
      this.loadPageImage(page, page === this.currentPage ? "high" : "low");
    });
  }

  createPagesForScrollMode() {
    const container = this.elements.pageScroll;
    if (!container) return;

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.updatePageHeight();

    this.spacer = document.createElement("div");
    this.spacer.style.position = "relative";
    this.spacer.style.height = this.totalHeight + "px";
    this.spacer.style.width = "100%";
    container.appendChild(this.spacer);

    this.wrapperPool = [];
    for (let i = 0; i < this.poolSize; i++) {
      const wrapper = document.createElement("div");
      wrapper.className = "page-wrapper";
      wrapper.style.position = "absolute";
      wrapper.style.width = "100%";
      wrapper.style.height = this.pageHeight + "px";
      wrapper.style.top = "0";
      wrapper.style.left = "0";
      wrapper.dataset.page = "";
      const img = document.createElement("img");
      img.className = "page-image landscape-image";
      img.dataset.loaded = "false";
      wrapper.appendChild(img);
      this.spacer.appendChild(wrapper);
      this.wrapperPool.push(wrapper);
    }

    let rafPending = false;
    container.addEventListener("scroll", () => {
      if (!rafPending) {
        rafPending = true;
        window.requestAnimationFrame(() => {
          this.updateVisiblePages();
          this.detectCurrentPage();
          rafPending = false;
        });
      }
    });

    this.updateVisiblePages();
    this.setupImageObserver();
    this.loadInitialPages();
    this.setupResizeObserver();
  }

  // ============================================
  // HAUTEUR ET RESIZE
  // ============================================

  updatePageHeight() {
    this.pageHeight = (1100 * window.innerWidth) / 700;
    this.totalHeight = 604 * this.pageHeight;
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
    if (this.readingMode !== "scroll" || !this.spacer || this.resizePending)
      return;
    this.resizePending = true;
    requestAnimationFrame(() => {
      if (!this.elements.pageScroll) {
        this.resizePending = false;
        return;
      }
      const savedPage = this.currentPage;
      this.updatePageHeight();
      const scrollTarget = (savedPage - 1) * this.pageHeight;
      if (this.spacer) this.spacer.style.height = this.totalHeight + "px";
      this.wrapperPool.forEach((wrapper) => {
        wrapper.style.height = this.pageHeight + "px";
        const p = parseInt(wrapper.dataset.page);
        if (!isNaN(p) && p > 0)
          wrapper.style.top = (p - 1) * this.pageHeight + "px";
      });
      this.elements.pageScroll.scrollTo({
        top: scrollTarget,
        behavior: "auto",
      });
      this.updateVisiblePages();
      this.resizePending = false;
    });
  }

  // ============================================
  // PAGES VISIBLES (SCROLL MODE)
  // ============================================

  loadInitialPages() {
    const from = Math.max(1, this.currentPage - 2);
    const to = Math.min(604, this.currentPage + 2);
    for (let p = from; p <= to; p++) this.loadPageImage(p, "high");
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
    let toPage = Math.min(604, centerPage + half);

    if (toPage - fromPage + 1 < this.poolSize) {
      if (fromPage === 1) toPage = Math.min(604, fromPage + this.poolSize - 1);
      else if (toPage === 604)
        fromPage = Math.max(1, toPage - this.poolSize + 1);
    }

    const visiblePages = [];
    for (let p = fromPage; p <= toPage; p++) visiblePages.push(p);

    visiblePages.forEach((page, i) => {
      if (i >= this.wrapperPool.length) return;
      const wrapper = this.wrapperPool[i];
      if (parseInt(wrapper.dataset.page) !== page) {
        wrapper.dataset.page = page;
        wrapper.style.top = (page - 1) * this.pageHeight + "px";
        wrapper.style.height = this.pageHeight + "px";
        const img = wrapper.querySelector("img");
        img.id = `page-${page}`;
        img.dataset.page = page;
        img.dataset.loaded = "false";
        img.src = "";
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
      const page = parseInt(wrapper.dataset.page);
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
          const page = parseInt(img.dataset.page);
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

  // ============================================
  // CHARGEMENT DES IMAGES
  // ============================================

  getPageImageUrl(page) {
    if (page < 1 || page > 604) return "";
    return `quran_pages/${page.toString().padStart(3, "0")}.webp`;
  }

  async loadPageImage(page, priority = "low") {
    if (page < 1 || page > 604) return;

    let imgEl = null;
    if (this.readingMode === "scroll") {
      for (const wrapper of this.wrapperPool) {
        if (parseInt(wrapper.dataset.page) === page) {
          imgEl = wrapper.querySelector("img");
          break;
        }
      }
    } else {
      imgEl = document.getElementById(`page-${page}`);
    }

    if (!imgEl || imgEl.dataset.loaded === "true") return;

    const url = this.getPageImageUrl(page);

    if (this.imageCache.has(page)) {
      imgEl.src = this.imageCache.get(page);
      imgEl.dataset.loaded = "true";
      return;
    }

    const tempImg = new Image();
    tempImg.fetchPriority = priority;
    tempImg.src = url;

    try {
      await tempImg.decode();
    } catch (err) {}

    this.imageCache.set(page, url);
    imgEl.src = url;
    imgEl.dataset.loaded = "true";
  }

  // ============================================
  // NAVIGATION
  // ============================================

  goToPage(page) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > 604) return;
    this.currentPage = pageNum;
    this.updatePageInfo(pageNum);
    if (this.readingMode === "book") {
      this.showCurrentPageImage();
      this.loadPageImage(pageNum, "high");
      this.preloadAdjacentPages(pageNum);
    } else {
      this.scrollToPage(pageNum);
    }
    this.notifyPageChange();
  }

  scrollToPage(page) {
    const container = this.elements.pageScroll;
    if (!container || this.readingMode !== "scroll") return;
    container.scrollTo({ top: (page - 1) * this.pageHeight, behavior: "auto" });
  }

  preloadAdjacentPages(page) {
    if (this.readingMode !== "book") return;
    const from = Math.max(1, page - this.config.preloadRadius);
    const to = Math.min(604, page + this.config.preloadRadius);
    for (let p = from; p <= to; p++) {
      if (p !== page && !this.imageCache.has(p)) this.loadPageImage(p, "low");
    }
  }

  goToNextPage() {
    if (this.currentPage < 604) this.goToPage(this.currentPage + 1);
  }
  goToPreviousPage() {
    if (this.currentPage > 1) this.goToPage(this.currentPage - 1);
  }
  goToFirstPage() {
    this.goToPage(1);
  }
  goToLastPage() {
    this.goToPage(604);
  }
  getCurrentPage() {
    return this.currentPage;
  }

  // ============================================
  // MODE DE LECTURE
  // ============================================

  detectReadingMode() {
    if (window.screen?.orientation) {
      this.isPortraitMode = window.screen.orientation.type.includes("portrait");
    } else {
      this.isPortraitMode = window.innerHeight / window.innerWidth > 11 / 7;
    }
    return this.isPortraitMode ? "book" : "scroll";
  }

  applyReadingMode() {
    const prevMode = this.readingMode;
    this.readingMode = this.detectReadingMode();
    const container = this.elements.pageScroll;
    if (!container) return;

    this.cleanupResizeObserver();
    this._cleanupTapHandlers();
    container.style.opacity = "0";

    if (prevMode !== this.readingMode) this.createAllPages();

    container.classList.remove("mode-portrait", "mode-landscape");
    container.style.cssText = "";

    if (this.readingMode === "book") {
      container.classList.add("mode-portrait");
      Object.assign(container.style, {
        overflowX: "hidden",
        overflowY: "auto",
        display: "block",
        height: "100%",
        width: "100vw",
      });
      this.swipeEnabled = true;
      this.setupSwipeNavigation();
    } else {
      container.classList.add("mode-landscape");
      Object.assign(container.style, {
        overflowX: "hidden",
        overflowY: "auto",
        display: "block",
        height: "100%",
        width: "100%",
      });
      this.swipeEnabled = false;
      this.removeSwipeNavigation();
    }

    if (this.readingMode === "scroll") this.setupResizeObserver();

    requestAnimationFrame(() => {
      if (this.readingMode === "scroll") {
        this.scrollToPage(this.currentPage);
      } else {
        this.goToPage(this.currentPage);
      }
      container.style.opacity = "1";
    });

    window.dispatchEvent(
      new CustomEvent("quran:readingModeChanged", {
        detail: {
          mode: this.readingMode,
          isPortrait: this.isPortraitMode,
          savedPage: this.currentPage,
        },
      }),
    );

    this.updateAutoScrollButton();
    this.setupTapToHide();
  }

  // ============================================
  // DÉTECTION DE PAGE (SCROLL)
  // ============================================

  detectCurrentPage() {
    if (!this.isRestoring && this.readingMode !== "book")
      this.detectCurrentPageScroll();
  }

  detectCurrentPageScroll() {
    if (this.isTransitioning) return;
    const container = this.elements.pageScroll;
    if (!container || this.readingMode !== "scroll") return;
    const detected = Math.max(
      1,
      Math.min(
        604,
        Math.floor(
          (container.scrollTop + container.clientHeight / 2) / this.pageHeight,
        ) + 1,
      ),
    );
    if (detected !== this.currentPage) {
      this.currentPage = detected;
      this.updatePageInfo(detected);
      this.notifyPageChange();
    }
  }

  notifyPageChange() {
    if (this.isTransitioning) return;
    const oldPage = this.previousPage;
    this.previousPage = this.currentPage;
    window.dispatchEvent(
      new CustomEvent("quran:pageChanged", {
        detail: { page: this.currentPage, oldPage },
      }),
    );
  }

  // ============================================
  // SWIPE NAVIGATION (BOOK MODE)
  // ============================================

  setupSwipeNavigation() {
    if (!this.elements.pageScroll || this.readingMode !== "book") return;
    let startX = 0;
    let endX = 0;

    const onTouchStart = (e) => {
      startX = e.touches[0].clientX;
    };
    const onTouchMove = (e) => {
      e.preventDefault();
    };
    const onTouchEnd = (e) => {
      endX = e.changedTouches[0].clientX;
      const delta = startX - endX;
      if (delta < -50 && this.currentPage < 604)
        this.goToPage(this.currentPage + 1);
      else if (delta > 50 && this.currentPage > 1)
        this.goToPage(this.currentPage - 1);
      startX = 0;
      endX = 0;
    };

    this.removeSwipeNavigation();
    this.elements.pageScroll.addEventListener("touchstart", onTouchStart, {
      passive: true,
    });
    this.elements.pageScroll.addEventListener("touchmove", onTouchMove, {
      passive: false,
    });
    this.elements.pageScroll.addEventListener("touchend", onTouchEnd);
    this.swipeHandlers = {
      touchstart: onTouchStart,
      touchmove: onTouchMove,
      touchend: onTouchEnd,
    };
  }

  removeSwipeNavigation() {
    if (!this.elements.pageScroll || !this.swipeHandlers) return;
    this.elements.pageScroll.removeEventListener(
      "touchstart",
      this.swipeHandlers.touchstart,
    );
    this.elements.pageScroll.removeEventListener(
      "touchmove",
      this.swipeHandlers.touchmove,
    );
    this.elements.pageScroll.removeEventListener(
      "touchend",
      this.swipeHandlers.touchend,
    );
    this.swipeHandlers = null;
    this.swipeEnabled = false;
  }

  // ============================================
  // TAP TO HIDE
  // ============================================

  _cleanupTapHandlers() {
    if (!this.tapHandlers || !this.elements.pageScroll) return;
    this.elements.pageScroll.removeEventListener(
      "touchstart",
      this.tapHandlers.touchstart,
    );
    this.elements.pageScroll.removeEventListener(
      "touchend",
      this.tapHandlers.touchend,
    );
    this.elements.pageScroll.removeEventListener(
      "click",
      this.tapHandlers.click,
    );
    this.tapHandlers = {};
  }

  setupTapToHide() {
    if (!this.elements.pageScroll) return;
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    const onTouchStart = (e) => {
      if (this.isTransitioning || !this.tapEnabled) return;
      touchStartTime = Date.now();
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const onTouchEnd = (e) => {
      if (this.isTransitioning || !this.tapEnabled) return;
      const now = Date.now();
      const duration = now - touchStartTime;
      const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX);
      const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY);
      if (
        duration < 400 &&
        deltaX < 20 &&
        deltaY < 20 &&
        now - this.lastTapTime > 300
      ) {
        this.lastTapTime = now;
        this.toggleButtonsVisibility();
      }
    };

    const onClick = (e) => {
      if (this.isTransitioning || !this.tapEnabled) return;
      const now = Date.now();
      if (now - this.lastTapTime < 300) {
        this.lastTapTime = now;
        return;
      }
      this.lastTapTime = now;
      if (
        e.target.closest(".header-btn") ||
        e.target.closest(".footer-item") ||
        e.target.closest(".menu-overlay") ||
        e.target.closest(".overlay")
      )
        return;
      this.toggleButtonsVisibility();
    };

    this.elements.pageScroll.addEventListener("touchstart", onTouchStart, {
      passive: false,
    });
    this.elements.pageScroll.addEventListener("touchend", onTouchEnd, {
      passive: true,
    });
    this.elements.pageScroll.addEventListener("click", onClick);
    this.tapHandlers = {
      touchstart: onTouchStart,
      touchend: onTouchEnd,
      click: onClick,
    };
  }

  toggleButtonsVisibility() {
    const menuOpen = document.querySelector(".menu-overlay.show");
    if (document.querySelector(".overlay.show") && !menuOpen) return;
    this.buttonsVisible = !this.buttonsVisible;
    this._applyHeaderFooterVisibility();
    window.dispatchEvent(
      new CustomEvent("quran:buttonsVisibilityChanged", {
        detail: { visible: this.buttonsVisible },
      }),
    );
  }

  applyButtonsVisibility() {
    this._applyHeaderFooterVisibility();
    window.dispatchEvent(
      new CustomEvent("quran:buttonsVisibilityChanged", {
        detail: { visible: this.buttonsVisible },
      }),
    );
  }

  _applyHeaderFooterVisibility() {
    if (!this.elements.header || !this.elements.footer) return;
    if (this.buttonsVisible) {
      this.elements.header.classList.remove("hidden");
      this.elements.footer.classList.remove("hidden");
    } else {
      this.elements.header.classList.add("hidden");
      this.elements.footer.classList.add("hidden");
    }
  }

  enableTapDetection(enabled) {
    this.tapEnabled = enabled;
  }

  // ============================================
  // AUTO SCROLL
  // ============================================

  startAutoScroll() {
    if (this.autoScrollActive) return;
    this.autoScrollActive = true;

    if ("wakeLock" in navigator) {
      navigator.wakeLock
        .request("screen")
        .then((lock) => (this._wakeLock = lock))
        .catch((err) => console.warn("Wake Lock error:", err));
    }

    const btnScroll = document.getElementById("autoScrollBtn");
    const btnIcon = document.getElementById("autoScrollIcon");
    const btnSlower = document.getElementById("autoScrollSlower");
    const btnFaster = document.getElementById("autoScrollFaster");

    if (btnScroll) btnScroll.classList.add("playing");
    if (btnIcon) btnIcon.textContent = "⏸️";
    if (btnSlower) {
      btnSlower.style.display = "";
      requestAnimationFrame(() => btnSlower.classList.add("visible"));
    }
    if (btnFaster) {
      btnFaster.style.display = "";
      requestAnimationFrame(() => btnFaster.classList.add("visible"));
    }
    this._updateSpeedButtons();

    let lastTimestamp = null;
    const tick = (timestamp) => {
      if (!this.autoScrollActive) return;
      if (lastTimestamp !== null) {
        const delta = timestamp - lastTimestamp;
        if (this.elements.pageScroll) {
          this._scrollAccum += (this.autoScrollSpeed * delta) / 16;
          const pixels = Math.floor(this._scrollAccum);
          if (pixels > 0) {
            this.elements.pageScroll.scrollTop += pixels;
            this._scrollAccum -= pixels;
          }
          const el = this.elements.pageScroll;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
            this.stopAutoScroll();
            return;
          }
        }
      }
      lastTimestamp = timestamp;
      this.autoScrollRAF = requestAnimationFrame(tick);
    };
    this.autoScrollRAF = requestAnimationFrame(tick);
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

    const btnScroll = document.getElementById("autoScrollBtn");
    const btnIcon = document.getElementById("autoScrollIcon");
    const btnSlower = document.getElementById("autoScrollSlower");
    const btnFaster = document.getElementById("autoScrollFaster");

    if (btnScroll) btnScroll.classList.remove("playing");
    if (btnIcon) btnIcon.textContent = "▶️";
    if (btnSlower) {
      btnSlower.classList.remove("visible");
      setTimeout(() => {
        btnSlower.style.display = "none";
      }, 200);
    }
    if (btnFaster) {
      btnFaster.classList.remove("visible");
      setTimeout(() => {
        btnFaster.style.display = "none";
      }, 200);
    }
  }

  toggleAutoScroll() {
    this.autoScrollActive ? this.stopAutoScroll() : this.startAutoScroll();
  }

  changeSpeed(direction) {
    let speed =
      Math.round((this.autoScrollSpeed + direction * this.speedStep) * 10) / 10;
    speed = Math.min(this.maxSpeed, Math.max(this.minSpeed, speed));
    if (speed === this.autoScrollSpeed) return;
    this.autoScrollSpeed = speed;
    this._updateSpeedButtons();
    window.quranApp?.showToast(`⚡ السرعة: ${speed.toFixed(1)}`);
  }

  _updateSpeedButtons() {
    const btnSlower = document.getElementById("autoScrollSlower");
    const btnFaster = document.getElementById("autoScrollFaster");
    if (btnSlower)
      btnSlower.disabled = this.autoScrollSpeed <= this.minSpeed + 0.01;
    if (btnFaster)
      btnFaster.disabled = this.autoScrollSpeed >= this.maxSpeed - 0.01;
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

  // ============================================
  // SETUP UI ET ÉVÉNEMENTS
  // ============================================

  setupUI() {
    setTimeout(() => {
      if (this.readingMode === "book") {
        this.loadPageImage(this.currentPage, "high");
        this.preloadAdjacentPages(this.currentPage);
      }
    }, 50);
    this.updateAutoScrollButton();
  }

  setupEventListeners() {
    if (!this.elements.pageScroll) return;

    const handleOrientationChange = () => {
      this.isTransitioning = true;
      const savedPage = this.currentPage;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const delay = isIOS ? 500 : 50;

      setTimeout(() => {
        try {
          this.applyReadingMode();
          setTimeout(
            () => {
              this.goToPage(savedPage);

              // Sur iOS, forcer le rechargement de l'image en mode portrait
              if (isIOS && this.readingMode === "book") {
                const img = document.querySelector(
                  `img[data-page="${savedPage}"]`,
                );
                if (img) {
                  const src = img.src;
                  img.src = "";
                  requestAnimationFrame(() => {
                    img.src = src;
                    img.setAttribute("data-loaded", "true");
                  });
                }
              }

              this.isTransitioning = false;
            },
            isIOS ? 300 : 200,
          );
        } catch (err) {
          this.isTransitioning = false;
        }
      }, delay);
    };

    if (window.matchMedia) {
      this.orientationMedia = window.matchMedia("(orientation: portrait)");
      const onOrientationChange = (e) => {
        if ((e.matches ? "book" : "scroll") !== this.readingMode)
          handleOrientationChange();
      };
      try {
        this.orientationMedia.addEventListener("change", onOrientationChange);
        this.eventListeners.push({
          element: this.orientationMedia,
          type: "change",
          handler: onOrientationChange,
        });
      } catch (err) {
        window.addEventListener("orientationchange", handleOrientationChange);
        this.eventListeners.push({
          element: window,
          type: "orientationchange",
          handler: handleOrientationChange,
        });
      }
    } else {
      window.addEventListener("orientationchange", handleOrientationChange);
      this.eventListeners.push({
        element: window,
        type: "orientationchange",
        handler: handleOrientationChange,
      });
    }

    if (this.elements.bookmarkBtn) {
      const handler = () => window.overlayManager?.showBookmarks();
      this.elements.bookmarkBtn.addEventListener("click", handler);
      this.eventListeners.push({
        element: this.elements.bookmarkBtn,
        type: "click",
        handler,
      });
    }

    if (this.elements.autoScrollBtn) {
      const handler = () => this.toggleAutoScroll();
      this.elements.autoScrollBtn.addEventListener("click", handler);
      this.eventListeners.push({
        element: this.elements.autoScrollBtn,
        type: "click",
        handler,
      });
    }

    const btnSlower = document.getElementById("autoScrollSlower");
    if (btnSlower) {
      const handler = () => this.changeSpeed(-1);
      btnSlower.addEventListener("click", handler);
      this.eventListeners.push({ element: btnSlower, type: "click", handler });
    }

    const btnFaster = document.getElementById("autoScrollFaster");
    if (btnFaster) {
      const handler = () => this.changeSpeed(1);
      btnFaster.addEventListener("click", handler);
      this.eventListeners.push({ element: btnFaster, type: "click", handler });
    }

    if (this.elements.pageNumber) {
      const handler = () => {
        if (
          window.quranApp &&
          typeof window.quranApp.showPageInputDialog === "function"
        ) {
          window.quranApp.showPageInputDialog();
        }
      };
      this.elements.pageNumber.addEventListener("click", handler);
      this.elements.pageNumber.style.cursor = "pointer";
      this.elements.pageNumber.style.userSelect = "none";
      this.eventListeners.push({
        element: this.elements.pageNumber,
        type: "click",
        handler,
      });
    }

    const menuOverlay = document.querySelector(".menu-overlay");
    if (menuOverlay) {
      this.menuObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.attributeName === "class" &&
            !menuOverlay.classList.contains("show") &&
            this.isMenuOpen
          ) {
            this.isMenuOpen = false;
            setTimeout(() => this.detectCurrentPage(), 100);
          }
        });
      });
      this.menuObserver.observe(menuOverlay, { attributes: true });
    }

    this.setupTapToHide();

    const onMenuToggle = (e) => {
      if (e.detail.isOpen) {
        this.buttonsVisible = true;
        this.applyButtonsVisibility();
        this.enableTapDetection(false);
      } else {
        this.enableTapDetection(true);
      }
    };
    window.addEventListener("quran:menuToggle", onMenuToggle);
    this.eventListeners.push({
      element: window,
      type: "quran:menuToggle",
      handler: onMenuToggle,
    });

    const onOverlayOpened = () => {
      this.buttonsVisible = true;
      this.applyButtonsVisibility();
      this.enableTapDetection(false);
      this._dialogOpen = true;
    };
    window.addEventListener("quran:overlayOpened", onOverlayOpened);
    this.eventListeners.push({
      element: window,
      type: "quran:overlayOpened",
      handler: onOverlayOpened,
    });

    const onOverlayClosed = () => {
      this.enableTapDetection(true);
      this._dialogOpen = false;
    };
    window.addEventListener("quran:overlayClosed", onOverlayClosed);
    this.eventListeners.push({
      element: window,
      type: "quran:overlayClosed",
      handler: onOverlayClosed,
    });
  }

  // ============================================
  // REPRISE ET DESTRUCTION
  // ============================================

  onAppResume() {
    this.isTransitioning = false;
    const overlayOpen =
      document.querySelector(".overlay.show, .menu-overlay.show") !== null;
    this.tapEnabled = !overlayOpen;
    this.applyReadingMode();
    setTimeout(() => {
      if (this.readingMode === "book")
        this.loadPageImage(this.currentPage, "high");
    }, 100);
  }

  destroy() {
    this.stopAutoScroll();
    this.cleanupResizeObserver();
    if (this.imageObserver) {
      this.imageObserver.disconnect();
      this.imageObserver = null;
    }
    if (this.menuObserver) {
      this.menuObserver.disconnect();
      this.menuObserver = null;
    }
    this.eventListeners.forEach(({ element, type, handler }) => {
      try {
        element.removeEventListener(type, handler);
      } catch (err) {}
    });
    this.eventListeners = [];
    this._cleanupTapHandlers();
    this.removeSwipeNavigation();
    this.imageCache.clear();
  }
}

// ============================================
// INITIALISATION
// ============================================

window.quranReader = new QuranReader();
if (typeof window !== "undefined") window.QuranReader = QuranReader;
