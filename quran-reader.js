class LRUCache {
  constructor(e = 30) {
    ((this.limit = e), (this.cache = new Map()));
  }
  get(e) {
    if (!this.cache.has(e)) return;
    const t = this.cache.get(e);
    return (this.cache.delete(e), this.cache.set(e, t), t);
  }
  set(e, t) {
    if (this.cache.has(e)) this.cache.delete(e);
    else if (this.cache.size >= this.limit) {
      const e = this.cache.keys().next().value;
      this.cache.delete(e);
    }
    this.cache.set(e, t);
  }
  has(e) {
    return this.cache.has(e);
  }
  clear() {
    this.cache.clear();
  }
  delete(e) {
    this.cache.delete(e);
  }
}
class QuranReader {
  constructor() {
    ((this.config = { totalPages: 604, preloadRadius: 2 }),
      (this.currentPage = 1),
      (this.previousPage = null),
      (this.isMenuOpen = !1),
      (this.isRestoring = !1),
      (this.imageCache = new LRUCache(30)),
      (this.elements = {}),
      (this.eventListeners = []),
      (this.buttonsVisible = !0),
      (this.tapEnabled = !0),
      (this.lastTapTime = 0),
      (this.tapHandlers = {}),
      (this.readingMode = "scroll"),
      (this.swipeEnabled = !1),
      (this.swipeHandlers = null),
      (this.isPortraitMode = !1),
      (this.resizeTimeout = null),
      (this.isTransitioning = !1),
      (this.pendingPage = null),
      (this.resizePending = !1),
      (this.orientationMedia = null),
      (this.imageObserver = null),
      (this.resizeFallbackHandler = null),
      (this.resizeObserver = null),
      (this.wrapperPool = []),
      (this.poolSize = 5),
      (this.pageHeight = 0),
      (this.totalHeight = 0),
      (this.spacer = null),
      (this.menuObserver = null),
      (this.autoScrollActive = !1),
      (this.autoScrollRAF = null),
      (this.autoScrollSpeeds = [0.2, 0.4, 0.7, 1.1, 1.6]),
      (this.autoScrollSpeedIdx = 1),
      (this.autoScrollSpeed = 0.4),
      (this._scrollAccum = 0));
  }
  async init(e = {}, t = 1) {
    return (
      Object.assign(this.config, e),
      this.cacheElements(),
      await this.initializeState(t),
      this.setupUI(),
      this.setupEventListeners(),
      this
    );
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
  async initializeState(e) {
    let t = e;
    this.currentPage = Math.max(1, Math.min(604, t));
    this.isRestoring = !0;
    this.createAllPages();
    this.updatePageInfo(this.currentPage);
    await new Promise((r) => requestAnimationFrame(r));
    this.applyReadingMode();
    await new Promise((r) => requestAnimationFrame(r));
    this.goToPage(this.currentPage);
    await new Promise((r) => requestAnimationFrame(r));
    this.isRestoring = !1;
    this.updateAutoScrollButton();
  }
  updatePageInfo(e) {
    if ((e > 604 && (e = 604), e < 1 && (e = 1), !window.quranCalculator))
      return;
    const t = parseInt(e);
    if (isNaN(t) || t < 1 || t > 604) return;
    ((this.currentPage = t),
      this.elements.pageNumber && (this.elements.pageNumber.textContent = t));
    const s = window.quranCalculator.getPageData(t);
    if (!s) return;
    (this.elements.hizbNumber &&
      (this.elements.hizbNumber.textContent = s.hizb || 1),
      this.elements.surahInfo &&
        s.surah &&
        (this.elements.surahInfo.textContent = `${s.surah.s_id}.${s.surah.name} (${s.surah.verses_count})`),
      this.elements.sajdaIcon &&
        (this.elements.sajdaIcon.style.display = s.sajda ? "inline" : "none"),
      this.updateBookmarkButton());
    const i = window.quranCalculator.getPageNotifications(t);
    if (i && i.length > 0) {
      const e = i.filter(
        (e) => e.includes("الجزء") || e.includes("الحزب") || e.includes("سجدة"),
      );
      e.length > 0 &&
        window.quranApp?.showToast &&
        window.quranApp.showToast(e.join(" - "));
    }
    this.applyButtonsVisibility();
  }
  updateBookmarkButton() {
    if (!this.elements.bookmarkIcon || !window.quranApp) return;
    const e = window.quranApp
      .getBookmarks()
      .some((e) => e.page === this.currentPage);
    this.elements.bookmarkIcon.textContent = e ? "⭐" : "🔖";
  }
  createAllPages() {
    this.elements.pageScroll &&
      ((this.elements.pageScroll.innerHTML = ""),
      "book" === this.readingMode
        ? this.createPagesForBookMode()
        : this.createPagesForScrollMode());
  }
  createPagesForBookMode() {
    const e = document.createDocumentFragment();
    for (let t = 1; t <= 604; t++) {
      const s = document.createElement("div");
      ((s.className = "page-wrapper"),
        (s.id = `page-wrapper-${t}`),
        s.setAttribute("data-page", t),
        (s.style.display = "none"));
      const i = document.createElement("img");
      ((i.className = "page-image portrait-image"),
        (i.id = `page-${t}`),
        (i.alt = `صفحة ${t}`),
        i.setAttribute("data-page", t),
        i.setAttribute("data-loaded", "false"),
        s.appendChild(i),
        e.appendChild(s));
    }
    (this.elements.pageScroll.appendChild(e), this.showCurrentPageImage());
  }
  showCurrentPageImage() {
    if ("book" !== this.readingMode) return;
    document.querySelectorAll(".page-wrapper").forEach((e) => {
      (e.classList.remove("active"), (e.style.display = "none"));
    });
    const e = document.getElementById(`page-wrapper-${this.currentPage}`);
    if (e) {
      ((e.style.display = "flex"), e.classList.add("active"));
      const t = document.getElementById(`page-${this.currentPage}`);
      t &&
        "false" === t.dataset.loaded &&
        this.loadPageImage(this.currentPage, "high");
    }
  }
  createPagesForScrollMode() {
    const e = this.elements.pageScroll;
    if (!e) return;
    (this.resizeObserver &&
      (this.resizeObserver.disconnect(), (this.resizeObserver = null)),
      this.updatePageHeight(),
      (this.spacer = document.createElement("div")),
      (this.spacer.style.position = "relative"),
      (this.spacer.style.height = this.totalHeight + "px"),
      (this.spacer.style.width = "100%"),
      e.appendChild(this.spacer),
      (this.wrapperPool = []));
    for (let e = 0; e < this.poolSize; e++) {
      const e = document.createElement("div");
      ((e.className = "page-wrapper"),
        (e.style.position = "absolute"),
        (e.style.width = "100%"),
        (e.style.height = this.pageHeight + "px"),
        (e.style.top = "0"),
        (e.style.left = "0"),
        (e.dataset.page = ""));
      const t = document.createElement("img");
      ((t.className = "page-image landscape-image"),
        (t.dataset.loaded = "false"),
        e.appendChild(t),
        this.spacer.appendChild(e),
        this.wrapperPool.push(e));
    }
    let t = !1;
    (e.addEventListener("scroll", () => {
      t ||
        (window.requestAnimationFrame(() => {
          (this.updateVisiblePages(), this.detectCurrentPage(), (t = !1));
        }),
        (t = !0));
    }),
      this.updateVisiblePages(),
      this.setupImageObserver(),
      this.loadInitialPages(),
      this.setupResizeObserver());
  }
  updatePageHeight() {
    const e = window.innerWidth;
    ((this.pageHeight = (1100 * e) / 700),
      (this.totalHeight = 604 * this.pageHeight));
  }
  cleanupResizeObserver() {
    (this.resizeObserver &&
      (this.resizeObserver.disconnect(), (this.resizeObserver = null)),
      this.resizeFallbackHandler &&
        (window.removeEventListener("resize", this.resizeFallbackHandler),
        (this.resizeFallbackHandler = null)));
  }
  setupResizeObserver() {
    if ("scroll" === this.readingMode)
      if ((this.cleanupResizeObserver(), window.ResizeObserver))
        ((this.resizeObserver = new ResizeObserver((e) => {
          for (let t of e)
            if (t.target === this.elements.pageScroll) {
              this.handleResize();
              break;
            }
        })),
          this.elements.pageScroll &&
            this.resizeObserver.observe(this.elements.pageScroll));
      else {
        const e = () => {
          this.handleResize();
        };
        (window.addEventListener("resize", e),
          (this.resizeFallbackHandler = e));
      }
  }
  handleResize() {
    "scroll" === this.readingMode &&
      this.spacer &&
      (this.resizePending ||
        ((this.resizePending = !0),
        requestAnimationFrame(() => {
          if (!this.elements.pageScroll) return void (this.resizePending = !1);
          const e = this.currentPage;
          this.updatePageHeight();
          const t = (e - 1) * this.pageHeight;
          (this.spacer && (this.spacer.style.height = this.totalHeight + "px"),
            this.wrapperPool.forEach((e) => {
              e.style.height = this.pageHeight + "px";
              const t = parseInt(e.dataset.page);
              !isNaN(t) &&
                t > 0 &&
                (e.style.top = (t - 1) * this.pageHeight + "px");
            }),
            this.elements.pageScroll.scrollTo({ top: t, behavior: "auto" }),
            this.updateVisiblePages(),
            (this.resizePending = !1));
        })));
  }
  loadInitialPages() {
    const e = Math.max(1, this.currentPage - 2),
      t = Math.min(604, this.currentPage + 2);
    for (let s = e; s <= t; s++) this.loadPageImage(s, "high");
  }
  updateVisiblePages() {
    if ("scroll" !== this.readingMode) return;
    const e = this.elements.pageScroll;
    if (!e || !this.spacer) return;
    if (!this.pageHeight || this.pageHeight <= 0) return;
    const t = e.scrollTop,
      s = Math.floor(t / this.pageHeight) + 1,
      i = Math.floor(this.poolSize / 2);
    let a = s - i,
      n = s + i;
    ((a = Math.max(1, a)),
      (n = Math.min(604, n)),
      n - a + 1 < this.poolSize &&
        (1 === a
          ? (n = Math.min(604, a + this.poolSize - 1))
          : 604 === n && (a = Math.max(1, n - this.poolSize + 1))));
    const o = [];
    for (let e = a; e <= n; e++) o.push(e);
    o.forEach((e, t) => {
      if (t >= this.wrapperPool.length) return;
      const s = this.wrapperPool[t];
      if (parseInt(s.dataset.page) !== e) {
        ((s.dataset.page = e),
          (s.style.top = (e - 1) * this.pageHeight + "px"),
          (s.style.height = this.pageHeight + "px"));
        const t = s.querySelector("img");
        ((t.id = `page-${e}`),
          (t.dataset.page = e),
          (t.dataset.loaded = "false"),
          (t.src = ""));
      }
      s.style.display = "block";
    });
    for (let e = o.length; e < this.wrapperPool.length; e++)
      this.wrapperPool[e].style.display = "none";
    const r = t,
      l = r + e.clientHeight;
    this.wrapperPool.forEach((e) => {
      if ("none" !== e.style.display) {
        const t = parseFloat(e.style.top);
        if (t + this.pageHeight > r && t < l) {
          const t = e.querySelector("img"),
            s = parseInt(e.dataset.page);
          t && "false" === t.dataset.loaded && this.loadPageImage(s, "high");
        }
      }
    });
  }
  setupImageObserver() {
    (this.imageObserver && this.imageObserver.disconnect(),
      (this.imageObserver = new IntersectionObserver(
        (e) => {
          e.forEach((e) => {
            if (e.isIntersecting) {
              const t = e.target,
                s = parseInt(t.dataset.page);
              "false" === t.dataset.loaded && this.loadPageImage(s, "auto");
            }
          });
        },
        {
          root: this.elements.pageScroll,
          rootMargin: "200px 0px",
          threshold: 0.01,
        },
      )),
      this.wrapperPool.forEach((e) => {
        const t = e.querySelector("img");
        t && this.imageObserver.observe(t);
      }));
  }
  getPageImageUrl(e) {
    return e < 1 || e > 604
      ? ""
      : `quran_pages/${e.toString().padStart(3, "0")}.webp`;
  }
  async loadPageImage(e, t = "low") {
    if (e < 1 || e > 604) return;
    let s = null;
    if ("scroll" === this.readingMode) {
      for (let t of this.wrapperPool)
        if (parseInt(t.dataset.page) === e) {
          s = t.querySelector("img");
          break;
        }
    } else s = document.getElementById(`page-${e}`);
    if (!s || "true" === s.dataset.loaded) return;
    const i = this.getPageImageUrl(e);
    if (this.imageCache.has(e))
      return (
        (s.src = this.imageCache.get(e)),
        void (s.dataset.loaded = "true")
      );
    const a = new Image();
    ((a.fetchPriority = t), (a.src = i));
    try {
      (await a.decode(),
        this.imageCache.set(e, i),
        (s.src = i),
        (s.dataset.loaded = "true"));
    } catch (t) {
      (this.imageCache.set(e, i), (s.src = i), (s.dataset.loaded = "true"));
    }
  }
  goToPage(e) {
    const t = parseInt(e);
    isNaN(t) ||
      t < 1 ||
      t > 604 ||
      ((this.currentPage = t),
      this.updatePageInfo(t),
      "book" === this.readingMode
        ? (this.showCurrentPageImage(),
          this.loadPageImage(t, "high"),
          this.preloadAdjacentPages(t))
        : this.scrollToPage(t),
      this.notifyPageChange());
  }
  scrollToPage(e) {
    const t = this.elements.pageScroll;
    if (!t || "scroll" !== this.readingMode) return;
    const s = (e - 1) * this.pageHeight;
    t.scrollTo({ top: s, behavior: "auto" });
  }
  preloadAdjacentPages(e) {
    if ("book" !== this.readingMode) return;
    const t = Math.max(1, e - this.config.preloadRadius),
      s = Math.min(604, e + this.config.preloadRadius);
    for (let i = t; i <= s; i++)
      i === e || this.imageCache.has(i) || this.loadPageImage(i, "low");
  }
  goToNextPage() {
    this.currentPage < 604 && this.goToPage(this.currentPage + 1);
  }
  goToPreviousPage() {
    this.currentPage > 1 && this.goToPage(this.currentPage - 1);
  }
  goToFirstPage() {
    this.goToPage(1);
  }
  goToLastPage() {
    this.goToPage(604);
  }
  detectReadingMode() {
    const e = window.innerWidth,
      t = window.innerHeight;
    // Ratio 11/7 = 1.5714... = hauteur/largeur d'une page Mushaf (700x1100px)
    // Portrait si l'écran est plus haut que large selon ce ratio de page
    return (
      window.screen && window.screen.orientation
        ? (this.isPortraitMode =
            window.screen.orientation.type.includes("portrait"))
        : (this.isPortraitMode = t / e > 11 / 7),
      this.isPortraitMode ? "book" : "scroll"
    );
  }
applyReadingMode() {
  const e = this.readingMode;
  this.readingMode = this.detectReadingMode();
  const t = this.elements.pageScroll;
  t &&
    (this.cleanupResizeObserver(),
    this._cleanupTapHandlers(),   // ← suppression des anciens handlers
    (t.style.opacity = "0"),
    e !== this.readingMode && this.createAllPages(),
    t.classList.remove("mode-portrait", "mode-landscape"),
    (t.style.cssText = ""),
    "book" === this.readingMode
      ? (t.classList.add("mode-portrait"),
        Object.assign(t.style, {
          overflowX: "hidden",
          overflowY: "auto",
          display: "block",
          height: "100%",
          width: "100vw",
        }),
        (this.swipeEnabled = !0),
        this.setupSwipeNavigation())
      : (t.classList.add("mode-landscape"),
        Object.assign(t.style, {
          overflowX: "hidden",
          overflowY: "auto",
          display: "block",
          height: "100%",
          width: "100%",
        }),
        (this.swipeEnabled = !1),
        this.removeSwipeNavigation()),
    "scroll" === this.readingMode && this.setupResizeObserver(),
    requestAnimationFrame(() => {
      ("scroll" === this.readingMode
        ? this.scrollToPage(this.currentPage)
        : this.goToPage(this.currentPage),
        (t.style.opacity = "1"));
    }),
    window.dispatchEvent(
      new CustomEvent("quran:readingModeChanged", {
        detail: {
          mode: this.readingMode,
          isPortrait: this.isPortraitMode,
          savedPage: this.currentPage,
        },
      }),
    ),
    this.updateAutoScrollButton(),
    // ✅ Réactivation du tap après nettoyage
    this.setupTapToHide());
}
  removeSwipeNavigation() {
    this.elements.pageScroll &&
      this.swipeHandlers &&
      (this.elements.pageScroll.removeEventListener(
        "touchstart",
        this.swipeHandlers.touchstart,
      ),
      this.elements.pageScroll.removeEventListener(
        "touchmove",
        this.swipeHandlers.touchmove,
      ),
      this.elements.pageScroll.removeEventListener(
        "touchend",
        this.swipeHandlers.touchend,
      ),
      (this.swipeHandlers = null),
      (this.swipeEnabled = !1));
  }
  detectCurrentPage() {
    this.isRestoring ||
      "book" === this.readingMode ||
      this.detectCurrentPageScroll();
  }
  detectCurrentPageScroll() {
    if (this.isTransitioning) return;
    const e = this.elements.pageScroll;
    if (!e || "scroll" !== this.readingMode) return;
    const t = e.scrollTop,
      s = e.clientHeight,
      i = Math.floor((t + s / 2) / this.pageHeight) + 1;
    let a = Math.max(1, Math.min(604, i));
    a !== this.currentPage &&
      ((this.currentPage = a), this.updatePageInfo(a), this.notifyPageChange());
  }
  notifyPageChange() {
    if (this.isTransitioning) return;
    const e = this.previousPage;
    ((this.previousPage = this.currentPage),
      window.dispatchEvent(
        new CustomEvent("quran:pageChanged", {
          detail: { page: this.currentPage, oldPage: e },
        }),
      ));
  }
  setupSwipeNavigation() {
    if (!this.elements.pageScroll || "book" !== this.readingMode) return;
    let e = 0,
      t = 0;
    const s = (t) => {
        e = t.touches[0].clientX;
      },
      i = (e) => {
        e.preventDefault();
      },
      a = (s) => {
        t = s.changedTouches[0].clientX;
        const i = e - t;
        (i < -50 && this.currentPage < 604
          ? this.goToPage(this.currentPage + 1)
          : i > 50 &&
            this.currentPage > 1 &&
            this.goToPage(this.currentPage - 1),
          (e = 0),
          (t = 0));
      };
    (this.removeSwipeNavigation(),
      this.elements.pageScroll.addEventListener("touchstart", s, {
        passive: !0,
      }),
      this.elements.pageScroll.addEventListener("touchmove", i, {
        passive: !1,
      }),
      this.elements.pageScroll.addEventListener("touchend", a),
      (this.swipeHandlers = { touchstart: s, touchmove: i, touchend: a }));
  }
  _cleanupTapHandlers() {
    if (this.tapHandlers && this.elements.pageScroll) {
      this.elements.pageScroll.removeEventListener("touchstart", this.tapHandlers.touchstart);
      this.elements.pageScroll.removeEventListener("touchend", this.tapHandlers.touchend);
      this.elements.pageScroll.removeEventListener("click", this.tapHandlers.click);
      this.tapHandlers = {};
    }
  }
  setupTapToHide() {
    if (!this.elements.pageScroll) return;
    let e = 0,
      t = 0,
      s = 0;
    const i = (i) => {
        if (this.isTransitioning || !this.tapEnabled) return;
        const a = i.touches[0];
        ((e = Date.now()), (t = a.clientX), (s = a.clientY));
      },
      a = (i) => {
        if (this.isTransitioning || !this.tapEnabled) return;
        const a = i.changedTouches[0],
          n = Date.now(),
          o = n - e,
          r = Math.abs(a.clientX - t),
          l = Math.abs(a.clientY - s);
        o < 400 &&
          r < 20 &&
          l < 20 &&
          n - this.lastTapTime > 300 &&
          ((this.lastTapTime = n), this.toggleButtonsVisibility());
      },
      n = (e) => {
        if (this.isTransitioning || !this.tapEnabled) return;
        const t = Date.now();
        t - this.lastTapTime < 300
          ? (this.lastTapTime = t)
          : ((this.lastTapTime = t),
            e.target.closest(".header-btn") ||
              e.target.closest(".footer-item") ||
              e.target.closest(".menu-overlay") ||
              e.target.closest(".overlay") ||
              this.toggleButtonsVisibility());
      };
    (this.elements.pageScroll.addEventListener("touchstart", i, {
      passive: !1,
    }),
      this.elements.pageScroll.addEventListener("touchend", a, { passive: !0 }),
      this.elements.pageScroll.addEventListener("click", n),
      (this.tapHandlers = { touchstart: i, touchend: a, click: n }));
  }
  toggleButtonsVisibility() {
    const e = document.querySelector(".menu-overlay.show");
    (document.querySelector(".overlay.show") && !e) ||
      ((this.buttonsVisible = !this.buttonsVisible),
      this.elements.header &&
        this.elements.footer &&
        (this.buttonsVisible
          ? (this.elements.header.classList.remove("hidden"),
            this.elements.footer.classList.remove("hidden"))
          : (this.elements.header.classList.add("hidden"),
            this.elements.footer.classList.add("hidden"))),
      window.dispatchEvent(
        new CustomEvent("quran:buttonsVisibilityChanged", {
          detail: { visible: this.buttonsVisible },
        }),
      ));
  }
  applyButtonsVisibility() {
    (this.elements.header &&
      this.elements.footer &&
      (this.buttonsVisible
        ? (this.elements.header.classList.remove("hidden"),
          this.elements.footer.classList.remove("hidden"))
        : (this.elements.header.classList.add("hidden"),
          this.elements.footer.classList.add("hidden"))),
      window.dispatchEvent(
        new CustomEvent("quran:buttonsVisibilityChanged", {
          detail: { visible: this.buttonsVisible },
        }),
      ));
  }
  startAutoScroll() {
    if (this.autoScrollActive) return;
    this.autoScrollActive = !0;
    const e = document.getElementById("autoScrollBtn"),
      t = document.getElementById("autoScrollIcon"),
      slower = document.getElementById("autoScrollSlower"),
      faster = document.getElementById("autoScrollFaster");
    (e && e.classList.add("playing"),
      t && (t.textContent = "⏸"),
      slower && (slower.style.display = "", requestAnimationFrame(() => slower.classList.add("visible"))),
      faster && (faster.style.display = "", requestAnimationFrame(() => faster.classList.add("visible"))));
    this._updateSpeedButtons();
    let s = null;
    const i = (e) => {
      if (this.autoScrollActive) {
        if (null !== s) {
          const t = e - s;
          if (this.elements.pageScroll) {
            this._scrollAccum += (this.autoScrollSpeed * t) / 16;
            const e = Math.floor(this._scrollAccum);
            e > 0 &&
              ((this.elements.pageScroll.scrollTop += e),
              (this._scrollAccum -= e));
            const s = this.elements.pageScroll;
            if (s.scrollTop + s.clientHeight >= s.scrollHeight - 2)
              return void this.stopAutoScroll();
          }
        }
        ((s = e), (this.autoScrollRAF = requestAnimationFrame(i)));
      }
    };
    this.autoScrollRAF = requestAnimationFrame(i);
  }
  stopAutoScroll() {
    if (!this.autoScrollActive) return;
    ((this.autoScrollActive = !1),
      (this._scrollAccum = 0),
      this.autoScrollRAF &&
        (cancelAnimationFrame(this.autoScrollRAF),
        (this.autoScrollRAF = null)));
    const e = document.getElementById("autoScrollBtn"),
      t = document.getElementById("autoScrollIcon"),
      slower = document.getElementById("autoScrollSlower"),
      faster = document.getElementById("autoScrollFaster");
    (e && e.classList.remove("playing"), t && (t.textContent = "▶"));
    if (slower) { slower.classList.remove("visible"); setTimeout(() => { slower.style.display = "none"; }, 200); }
    if (faster) { faster.classList.remove("visible"); setTimeout(() => { faster.style.display = "none"; }, 200); }
  }
  toggleAutoScroll() {
    this.autoScrollActive ? this.stopAutoScroll() : this.startAutoScroll();
  }
  changeSpeed(delta) {
    const newIdx = Math.max(0, Math.min(this.autoScrollSpeeds.length - 1, this.autoScrollSpeedIdx + delta));
    if (newIdx === this.autoScrollSpeedIdx) return;
    this.autoScrollSpeedIdx = newIdx;
    this.autoScrollSpeed = this.autoScrollSpeeds[newIdx];
    this._updateSpeedButtons();
  }
  _updateSpeedButtons() {
    const slower = document.getElementById("autoScrollSlower");
    const faster = document.getElementById("autoScrollFaster");
    if (slower) slower.disabled = this.autoScrollSpeedIdx === 0;
    if (faster) faster.disabled = this.autoScrollSpeedIdx === this.autoScrollSpeeds.length - 1;
  }
  updateAutoScrollButton() {
    const e = document.getElementById("autoScrollGroup") || document.getElementById("autoScrollBtn");
    e &&
      ("scroll" === this.readingMode
        ? (e.style.display = "")
        : (this.stopAutoScroll(), (e.style.display = "none")));
  }
  enableTapDetection(e) {
    this.tapEnabled = e;
  }
  getCurrentPage() {
    return this.currentPage;
  }
  onAppResume() {
    this.isTransitioning = !1;
    const e =
      null !== document.querySelector(".overlay.show, .menu-overlay.show");
    ((this.tapEnabled = !e),
      this.applyReadingMode(),
      setTimeout(() => {
        "book" === this.readingMode &&
          this.loadPageImage(this.currentPage, "high");
      }, 100));
  }
  setupUI() {
    (setTimeout(() => {
      "book" === this.readingMode &&
        (this.loadPageImage(this.currentPage, "high"),
        this.preloadAdjacentPages(this.currentPage));
    }, 50),
      this.updateAutoScrollButton());
  }
  setupEventListeners() {
    if (!this.elements.pageScroll) return;
    const e = () => {
      this.isTransitioning = !0;
      const e = this.currentPage,
        t = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 350 : 50;
      setTimeout(() => {
        try {
          (this.applyReadingMode(),
            setTimeout(() => {
              (this.goToPage(e), (this.isTransitioning = !1));
            }, 200));
        } catch (e) {
          this.isTransitioning = !1;
        }
      }, t);
    };
    if (window.matchMedia) {
      this.orientationMedia = window.matchMedia("(orientation: portrait)");
      const s = (t) => {
        (t.matches ? "book" : "scroll") !== this.readingMode && e();
      };
      try {
        (this.orientationMedia.addEventListener("change", s),
          this.eventListeners.push({
            element: this.orientationMedia,
            type: "change",
            handler: s,
          }));
      } catch (t) {
        (window.addEventListener("orientationchange", e),
          this.eventListeners.push({
            element: window,
            type: "orientationchange",
            handler: e,
          }));
      }
    } else
      (window.addEventListener("orientationchange", e),
        this.eventListeners.push({
          element: window,
          type: "orientationchange",
          handler: e,
        }));
    if (this.elements.bookmarkBtn) {
      const e = () => {
        window.overlayManager?.showBookmarks();
      };
      (this.elements.bookmarkBtn.addEventListener("click", e),
        this.eventListeners.push({
          element: this.elements.bookmarkBtn,
          type: "click",
          handler: e,
        }));
    }
    if (this.elements.autoScrollBtn) {
      const e = () => this.toggleAutoScroll();
      (this.elements.autoScrollBtn.addEventListener("click", e),
        this.eventListeners.push({
          element: this.elements.autoScrollBtn,
          type: "click",
          handler: e,
        }));
    }
    const slowerBtn = document.getElementById("autoScrollSlower");
    if (slowerBtn) {
      const h = () => this.changeSpeed(-1);
      (slowerBtn.addEventListener("click", h),
        this.eventListeners.push({ element: slowerBtn, type: "click", handler: h }));
    }
    const fasterBtn = document.getElementById("autoScrollFaster");
    if (fasterBtn) {
      const h = () => this.changeSpeed(1);
      (fasterBtn.addEventListener("click", h),
        this.eventListeners.push({ element: fasterBtn, type: "click", handler: h }));
    }
    if (this.elements.pageNumber) {
      const e = () => {
        window.quranApp &&
          "function" == typeof window.quranApp.showPageInputDialog &&
          window.quranApp.showPageInputDialog();
      };
      (this.elements.pageNumber.addEventListener("click", e),
        (this.elements.pageNumber.style.cursor = "pointer"),
        (this.elements.pageNumber.style.userSelect = "none"),
        this.eventListeners.push({
          element: this.elements.pageNumber,
          type: "click",
          handler: e,
        }));
    }
    const t = document.querySelector(".menu-overlay");
    (t &&
      ((this.menuObserver = new MutationObserver((e) => {
        e.forEach((e) => {
          "class" === e.attributeName &&
            !t.classList.contains("show") &&
            this.isMenuOpen &&
            ((this.isMenuOpen = !1),
            setTimeout(() => this.detectCurrentPage(), 100));
        });
      })),
      this.menuObserver.observe(t, { attributes: !0 })),
      this.setupTapToHide());
    const s = (e) => {
      e.detail.isOpen
        ? ((this.buttonsVisible = !0),
          this.applyButtonsVisibility(),
          this.enableTapDetection(!1))
        : this.enableTapDetection(!0);
    };
    (window.addEventListener("quran:menuToggle", s),
      this.eventListeners.push({
        element: window,
        type: "quran:menuToggle",
        handler: s,
      }));
    const i = () => {
      ((this.buttonsVisible = !0),
        this.applyButtonsVisibility(),
        this.enableTapDetection(!1),
        (this._dialogOpen = !0));
    };
    (window.addEventListener("quran:overlayOpened", i),
      this.eventListeners.push({
        element: window,
        type: "quran:overlayOpened",
        handler: i,
      }));
    const a = () => {
      (this.enableTapDetection(!0), (this._dialogOpen = !1));
    };
    (window.addEventListener("quran:overlayClosed", a),
      this.eventListeners.push({
        element: window,
        type: "quran:overlayClosed",
        handler: a,
      }));
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
    this.eventListeners.forEach(({ element: e, type: t, handler: s }) => {
      try {
        e.removeEventListener(t, s);
      } catch (e) {}
    });
    this.eventListeners = [];
    if (this.tapHandlers && this.elements.pageScroll) {
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
    this.removeSwipeNavigation();
    this.imageCache.clear();
  }
}
((window.quranReader = new QuranReader()),
  "undefined" != typeof window && (window.QuranReader = QuranReader));
