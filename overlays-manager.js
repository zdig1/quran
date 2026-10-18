// ============================================
// CONFIGURATION
// ============================================
window.ACTIVE_RIWAYA = "hafs";
// "hafs" | "warsh" | "qaloon"
// ============================================
class OverlayManager {
  constructor() {
    this.config = {
      animationDuration: 100,
      lazyLoadOverlays: ["search", "tafsir", "tajweed", "khatm"],
    };
    this.currentOverlay = null;
    this.isInitialized = false;
    this.elements = {};
    this.overlays = {};
    this.eventListeners = [];
    this._tafsirSavedPage = null;
    this.lazyLoaded = new Set();
    this._tafsirInitTimeout = null;
    this.editingBookmarkId = null;
    this.bookmarkFormInput = null;
    this.bookmarkFormButton = null;
    this.bookmarkFormCancel = null;
    this._clearSearchHandler = null;
    this.currentSurahInfoId = null;
    this._surahInfoSwipeInitialized = false;

    this._surahsVirtual = {
      container: null,
      items: [],
      itemHeight: 0,
      poolSize: 25,
      pool: [],
      spacer: null,
      startIndex: -1,
      pinnedCount: 0,
      allTitle: null,
      scrollHandler: null,
      rafPending: false,
      rendered: false,
    };
  }

  init(config = {}) {
    Object.assign(this.config, config);
    this.cacheElements();
    this.setupEventListeners();
    this.isInitialized = true;
    return this;
  }

  getCurrentPage() {
    return (
      window.quranApp?.getCurrentPage?.() ||
      window.quranReader?.getCurrentPage?.() ||
      1
    );
  }

  getDefaultBookmarkName(page) {
    const pageData = window.quranCalculator?.getPageData(page);
    if (pageData && pageData.surah) {
      return `سورة ${pageData.surah.name}`;
    }
    return `صفحة ${page}`;
  }

  // ============================================
  // CACHE DES ÉLÉMENTS
  // ============================================

  cacheElements() {
    this.elements = {
      menuOverlay: document.getElementById("menuOverlay"),
      closeMenuBtn: document.getElementById("closeMenuBtn"),
      menuBtn: document.getElementById("menuBtn"),
      surahsBtn: document.getElementById("surahsBtn"),
      juzHizbBtn: document.getElementById("juzHizbBtn"),
      bookmarksBtn: document.getElementById("bookmarksBtn"),
      audioBtn: document.getElementById("audioBtn"),
      khatmBtn: document.getElementById("khatmBtn"),
      searchBtn: document.getElementById("searchBtn"),
      tafsirBtn: document.getElementById("tafsirBtn"),
      tajweedBtn: document.getElementById("tajweedBtn"),
      themeBtn: document.getElementById("themeBtn"),
      aboutBtn: document.getElementById("aboutBtn"),
    };
  }

  // ============================================
  // LAZY LOADING
  // ============================================

  _overlayConfig = {
    surahs: {
      element: "surahsOverlay",
      closeBtn: "closeSurahsBtn",
      content: "surahsList",
    },
    juzHizb: {
      element: "juzHizbOverlay",
      closeBtn: "closeJuzHizbBtn",
      content: "juzHizbList",
    },
    bookmarks: {
      element: "bookmarksOverlay",
      closeBtn: "closeBookmarksBtn",
      content: "bookmarksList",
    },
    audio: {
      element: "audioOverlay",
      closeBtn: "closeAudioBtn",
      content: "audioContentContainer",
    },
    khatm: {
      element: "khatmOverlay",
      closeBtn: "closeKhatmBtn",
      content: "khatmContent",
    },
    search: {
      element: "searchOverlay",
      closeBtn: "closeSearchBtn",
      content: "searchContentContainer",  // ✅ Container unique
    },
    tafsir: {
      element: "tafsirOverlay",
      closeBtn: "closeTafsirBtn",
      content: "tafsirContentContainer",  // ✅ Le container du contenu
    },
    tajweed: {
      element: "tajweedOverlay",
      closeBtn: "closeTajweedBtn",
      content: "tajweedRulesContent",
    },
    surahInfo: {
      element: "surahInfoOverlay",
      closeBtn: "closeSurahInfoBtn",
      content: "surahInfoContent",
    },
    backup: {
      element: "backupOverlay",
      closeBtn: "closeBackupBtn",
    },
    about: {
      element: "aboutOverlay",
      closeBtn: "closeAboutBtn",
      content: "aboutContent",
    },
  };

  lazyLoadOverlay(name) {
    if (this.overlays[name]) {
      this.lazyLoaded.add(name);
      return this.overlays[name];
    }
    const config = this._overlayConfig[name];
    if (!config) return null;
    const overlay = {};
    for (const [key, id] of Object.entries(config)) {
      overlay[key] = document.getElementById(id);
    }
    this.overlays[name] = overlay;
    this.lazyLoaded.add(name);
    this.setupOverlayEventListeners(name);
    return overlay;
  }

  // ============================================
  // ÉCOUTEURS D'ÉVÉNEMENTS
  // ============================================

  setupEventListeners() {
    if (this.elements.menuOverlay) {
      const handler = (e) => {
        if (e.target === this.elements.menuOverlay) this.closeMenu();
      };
      this.elements.menuOverlay.addEventListener("click", handler);
      this.eventListeners.push({
        element: this.elements.menuOverlay,
        type: "click",
        handler,
      });
    }

    if (this.elements.menuBtn) {
      const handler = () => this.showMenu();
      this.elements.menuBtn.addEventListener("click", handler);
      this.eventListeners.push({
        element: this.elements.menuBtn,
        type: "click",
        handler,
      });
    }

    if (this.elements.closeMenuBtn) {
      const handler = () => this.closeMenu();
      this.elements.closeMenuBtn.addEventListener("click", handler);
      this.eventListeners.push({
        element: this.elements.closeMenuBtn,
        type: "click",
        handler,
      });
    }

    this.setupMenuButtons();

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        window.quranApp?.handleBack?.();
      }
    };
    document.addEventListener("keydown", handleEscape);
    this.eventListeners.push({
      element: document,
      type: "keydown",
      handler: handleEscape,
    });
  }

  setupMenuButtons() {
    const buttons = [
      { btn: this.elements.surahsBtn, action: () => this.showSurahs() },
      { btn: this.elements.juzHizbBtn, action: () => this.showJuzHizb() },
      { btn: this.elements.bookmarksBtn, action: () => this.showBookmarks() },
      { btn: this.elements.audioBtn, action: () => window.quranAudioPlayer?.showOverlay() },
      { btn: this.elements.khatmBtn, action: () => this.showKhatm() },
      { btn: this.elements.searchBtn, action: () => window.tafsirManager?.showSearchOverlay() },
      { btn: this.elements.tafsirBtn, action: () => window.tafsirManager?.showTafsirOverlay() }, { btn: this.elements.tajweedBtn, action: () => this.showTajweed() },
      { btn: this.elements.themeBtn, action: () => { this.closeMenu(); setTimeout(() => window.quranApp?.toggleTheme(), 50); } },
      { btn: this.elements.aboutBtn, action: () => this.showAbout() },
    ];
    buttons.forEach(({ btn, action }) => {
      if (btn) {
        btn.addEventListener("click", action);
        this.eventListeners.push({
          element: btn,
          type: "click",
          handler: action,
        });
      }
    });
  }

  setupOverlayEventListeners(name) {
    const overlay = this.overlays[name];
    if (!overlay) return;
    if (overlay.closeBtn) {
      const handler = () => this.closeOverlay(name);
      overlay.closeBtn.addEventListener("click", handler);
      this.eventListeners.push({
        element: overlay.closeBtn,
        type: "click",
        handler,
      });
    }
    if (overlay.element) {
      const handler = (e) => {
        if (e.target === overlay.element) this.closeOverlay(name);
      };
      overlay.element.addEventListener("click", handler);
      this.eventListeners.push({
        element: overlay.element,
        type: "click",
        handler,
      });
    }
  }

  // ============================================
  // MENU
  // ============================================

  showMenu() {
    this.toggleMenuOverlay(true);
    this.updateThemeButtonText();
    window.dispatchEvent(
      new CustomEvent("quran:menuToggle", { detail: { isOpen: true } }),
    );
  }

  toggleMenuOverlay(show) {
    if (!this.elements.menuOverlay) return;
    if (show) {
      this.elements.menuOverlay.classList.add("show");
      document.body.style.overflow = "hidden";
    } else {
      this.elements.menuOverlay.classList.remove("show");
      document.body.style.overflow = "";
      window.dispatchEvent(
        new CustomEvent("quran:menuToggle", { detail: { isOpen: false } }),
      );
    }
  }

  closeMenu() {
    this.toggleMenuOverlay(false);
  }

  // ============================================
  // 1. SURAHS OVERLAY
  // ============================================

  showSurahs() {
    this.closeMenu();
    const overlay = this.lazyLoadOverlay("surahs");
    if (overlay?.element && overlay?.content) {
      this.renderSurahsList(true);
      this.showOverlay("surahs");
    }
  }

  _createSurahItem(surah, isPinned, bookmarkedSurahIds) {
    const container = window.ListItemRenderer.createContainer('surah', surah.s_id);
    container.classList.add('item-surah');

    // ============================================
    // TABLEAU 2 lignes × 7 colonnes (RTL)
    // ============================================
    const grid = document.createElement("div");
    grid.className = "surah-grid";

    // --- Données ---
    const currentLang = window.quranApp?.getSetting?.("langue") || "ar";
    const surahCode = `surah${String(surah.s_id).padStart(3, "0")}`;
    const juzStarts = window.quranCalculator._juzBySurahId?.get(surah.s_id)?.slice(0, 1) || [];
    const hasSajda = window.quranCalculator.hasSajdaInSurah(surah.s_id);
    const hasBookmark = bookmarkedSurahIds?.has(surah.s_id);

    // ============================================
    // COL 1 — Pin 📌 (fusion 2 lignes)
    // ============================================
    const pinBtn = document.createElement("button");
    pinBtn.className = `g-col g-pin action-icon pin-btn surah-pin ${isPinned ? "pinned" : ""}`;
    pinBtn.setAttribute("data-sura-id", surah.s_id);
    pinBtn.textContent = isPinned ? "💫" : "📌";
    grid.appendChild(pinBtn);

    // ============================================
    // COL 2 — Badge (ligne 1 uniquement)
    // ============================================
    const badge = window.ListItemRenderer.createBadge(String(surah.s_id));
    badge.classList.add("g-col", "g-badge");
    grid.appendChild(badge);

    // ============================================
    // COL 3 — Nom (ligne 1) + النزول (ligne 2)
    // ============================================
    const nameCell = document.createElement("div");
    nameCell.className = "g-col g-name";

    const callig = document.createElement("span");
    callig.className = "surah-calligraphy";
    callig.textContent = surahCode;

    if (currentLang === "ar") {
      nameCell.appendChild(callig);
    } else {
      const latin = window.quranReader?.getSurahName?.(surah.s_id) || surah.name;
      const nameSpan = document.createElement("span");
      nameSpan.className = "surah-name";
      nameSpan.textContent = latin;
      nameCell.appendChild(nameSpan);
      nameCell.appendChild(callig);
    }
    grid.appendChild(nameCell);

    const orderCell = document.createElement("div");
    orderCell.className = "g-col g-order";
    orderCell.innerHTML = `<span class="note-small">النزول: ${surah.order}</span>`;
    grid.appendChild(orderCell);

    // ============================================
    // COL 4 — Info ℹ️ (ligne 1) + Révélation 🕋/🕌 (ligne 2)
    // ============================================
    const infoBtn = document.createElement("button");
    infoBtn.className = "g-col g-info action-icon info-btn surah-info";
    infoBtn.setAttribute("data-sura-id", surah.s_id);
    infoBtn.textContent = "ℹ️";
    grid.appendChild(infoBtn);

    const revelCell = document.createElement("div");
    revelCell.className = "g-col g-revel";
    revelCell.innerHTML = `<span class="surah-revel">${surah.type === "مدنية" ? "🕌" : "🕋"}</span>`;
    grid.appendChild(revelCell);

    // ============================================
    // COL 5 — Bookmark 🔖 (ligne 1 uniquement)
    // ============================================
    const bookmarkCell = document.createElement("div");
    bookmarkCell.className = "g-col g-bookmark";
    if (hasBookmark) bookmarkCell.textContent = "🔖";
    grid.appendChild(bookmarkCell);

    // ============================================
    // COL 6 — Juz (ligne 1) + Sajda ۩ (ligne 2)
    // ============================================
    const juzCell = document.createElement("div");
    juzCell.className = "g-col g-juz";
    if (juzStarts.length) {
      juzCell.innerHTML = `<span class="juz-badge">${juzStarts.map(j => `ج${j}`).join(" ")}</span>`;
    }
    grid.appendChild(juzCell);

    const sajdaCell = document.createElement("div");
    sajdaCell.className = "g-col g-sajda";
    if (hasSajda) {
      sajdaCell.innerHTML = `<span class="item-sajda-icon">۩</span>`;
    }
    grid.appendChild(sajdaCell);

    // ============================================
    // COL 7 — Page (ligne 1) + Versets (ligne 2)
    // ============================================
    const pageCell = document.createElement("div");
    pageCell.className = "g-col g-page";
    pageCell.innerHTML = `<span class="page-tag">ص ${surah.page_start}</span>`;
    grid.appendChild(pageCell);

    const versesCell = document.createElement("div");
    versesCell.className = "g-col g-verses";
    versesCell.innerHTML = `<span class="surah-verses">(${surah.verses}) آية</span>`;
    grid.appendChild(versesCell);

    // ============================================
    // Assemblage
    // ============================================
    container.appendChild(grid);

    // ============================================
    // Événements
    // ============================================
    container.addEventListener("click", (e) => {
      if (e.target.closest('.pin-btn') || e.target.closest('.info-btn')) return;
      window.quranApp?.goToPage(surah.page_start);
      this.closeOverlay("surahs");
    });

    pinBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!window.quranApp) return;
      const added = window.quranApp.togglePinSurah(surah.s_id);
      pinBtn.classList.toggle("pinned", added);
      pinBtn.textContent = added ? "💫" : "📌";
      this.renderSurahsList(true, surah.s_id);
    });

    infoBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showSurahInfo(surah.s_id);
    });

    return container;
  }

  renderSurahsList(scrollToCurrent = true, preserveSurahId = null) {
    const overlay = this.overlays.surahs;
    if (!overlay?.content || !window.quranCalculator) return;

    const container = overlay.content;
    const v = this._surahsVirtual;

    // ✅ 1. Construire la liste logique
    const bookmarks = window.quranApp?.getBookmarks() || [];
    const surahs = window.quranCalculator.getAllSurahs();
    const pinnedIds = window.quranApp?.getPinnedSurahs() || [];
    const bookmarkedSurahIds = new Set(
      bookmarks.filter(b => b.surahId).map(b => b.surahId)
    );

    const items = [];
    const pinnedSurahs = surahs.filter(s => pinnedIds.includes(s.s_id));
    pinnedSurahs.forEach(s => items.push({
      surah: s, isPinned: true, hasBookmark: bookmarkedSurahIds.has(s.s_id)
    }));
    surahs.forEach(s => items.push({
      surah: s, isPinned: pinnedIds.includes(s.s_id), hasBookmark: bookmarkedSurahIds.has(s.s_id)
    }));

    v.items = items;
    v.pinnedCount = pinnedSurahs.length;
    v.container = container;
    v.startIndex = -1;
    v.rendered = false;

    // ✅ 2. Reset DOM
    container.innerHTML = "";

    // ✅ 3. Titre "Favoris"
    if (pinnedSurahs.length > 0) {
      const t = document.createElement('h3');
      t.className = 'section-title';
      t.textContent = '⭐ السور المفضلة';
      container.appendChild(t);
    }

    // ✅ 4. Spacer global
    const spacer = document.createElement('div');
    spacer.style.position = 'relative';
    spacer.style.width = '100%';
    container.appendChild(spacer);
    v.spacer = spacer;

    // ✅ 5. Pool
    v.pool = [];
    for (let i = 0; i < v.poolSize; i++) {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.left = '0';
      el.style.right = '0';
      el.style.display = 'none';
      spacer.appendChild(el);
      v.pool.push(el);
    }
    // ✅ 7. Listener scroll (toujours attaché, même si on skip le probe)
    if (!v.scrollHandler) {
      v.scrollHandler = () => {
        if (v.rafPending) return;
        v.rafPending = true;
        requestAnimationFrame(() => {
          this._updateVisibleSurahs();
          v.rafPending = false;
        });
      };
      container.addEventListener('scroll', v.scrollHandler, { passive: true });
    }

    // ✅ 6. Skip du probe si la hauteur est déjà connue
    //    (la structure d'un item ne change pas entre 2 renders — 2 lignes × 7 col)
    if (v.itemHeight > 0) {
      // Hauteur déjà mesurée : on layout immédiatement, sans flash
      this._layoutVirtualSurahs(scrollToCurrent, preserveSurahId, bookmarkedSurahIds);
      return;
    }

    // Premier render : mesurer via un probe fantôme
    const probe = this._createSurahItem(items[0].surah, items[0].isPinned, bookmarkedSurahIds);
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.top = '0';
    probe.style.left = '0';
    probe.style.right = '0';
    spacer.appendChild(probe);

    requestAnimationFrame(() => {
      v.itemHeight = probe.offsetHeight || 80;
      probe.remove();
      this._layoutVirtualSurahs(scrollToCurrent, preserveSurahId, bookmarkedSurahIds);
    });
  }

  _layoutVirtualSurahs(scrollToCurrent, preserveSurahId, bookmarkedSurahIds) {
    const v = this._surahsVirtual;
    const totalHeight = v.items.length * v.itemHeight;
    v.spacer.style.height = (totalHeight + 50) + 'px';

    // ✅ FIX : retirer un éventuel ancien titre "Toutes" avant d'en recréer un
    if (v.allTitle && v.allTitle.parentNode) {
      v.allTitle.remove();
    }

    // Titre "Toutes les sourates"
    const allTitle = document.createElement('h3');
    allTitle.className = 'section-title';
    allTitle.textContent = '📖 جميع السور';
    allTitle.style.position = 'absolute';
    allTitle.style.left = '0';
    allTitle.style.right = '0';
    allTitle.style.top = (v.pinnedCount * v.itemHeight) + 'px';
    v.spacer.appendChild(allTitle);
    v.allTitle = allTitle;

    // Scroll cible
    const currentSurah = window.quranCalculator?.getFirstSurahForPage(this.getCurrentPage());
    let targetIndex = -1;
    if (preserveSurahId) {
      targetIndex = v.items.findIndex(it => it.surah.s_id === preserveSurahId);
    } else if (scrollToCurrent && currentSurah?.s_id) {
      targetIndex = v.items.findIndex(it => it.surah.s_id === currentSurah.s_id);
    }
    if (targetIndex >= 0) {
      const titleOffset = v.pinnedCount > 0 && targetIndex >= v.pinnedCount ? 40 : 0;
      const targetTop = targetIndex * v.itemHeight + titleOffset;
      v.container.scrollTop = Math.max(0, targetTop - v.container.clientHeight / 2 + v.itemHeight / 2);
    }

    this._updateVisibleSurahs();
  }

  _updateVisibleSurahs() {
    const v = this._surahsVirtual;
    if (!v.container || !v.itemHeight) return;

    const scrollTop = v.container.scrollTop;
    const half = Math.floor(v.poolSize / 2);
    let start = Math.max(0, Math.floor(scrollTop / v.itemHeight) - half);
    let end = Math.min(v.items.length - 1, start + v.poolSize - 1);
    if (end - start + 1 < v.poolSize) {
      start = Math.max(0, end - v.poolSize + 1);
    }

    if (start === v.startIndex && v.rendered) return;
    v.startIndex = start;

    const bookmarkedSurahIds = new Set(
      (window.quranApp?.getBookmarks() || []).filter(b => b.surahId).map(b => b.surahId)
    );
    const currentSurah = window.quranCalculator?.getFirstSurahForPage(this.getCurrentPage());

    for (let i = 0; i < v.poolSize; i++) {
      const idx = start + i;
      const el = v.pool[i];
      if (idx >= v.items.length) {
        el.style.display = 'none';
        el.dataset.index = '';
        continue;
      }
      const item = v.items[idx];
      el.style.display = 'block';
      el.style.top = (idx * v.itemHeight) + 'px';
      el.style.height = v.itemHeight + 'px';

      // Ne reconstruire que si l'index a changé
      if (el.dataset.index === String(idx)) continue;
      el.dataset.index = String(idx);
      el.innerHTML = '';

      const itemEl = this._createSurahItem(item.surah, item.isPinned, bookmarkedSurahIds);
      if (currentSurah?.s_id === item.surah.s_id) itemEl.classList.add('current-item');
      el.appendChild(itemEl);
    }
    v.rendered = true;
  }
  // ============================================
  // 1.5 SURAH INFO OVERLAY
  // ============================================

  async showSurahInfo(surahId) {
    this.closeMenu();
    const overlay = this.lazyLoadOverlay("surahInfo");
    if (!overlay?.element) return;
    overlay.content.innerHTML = `
      <div class="loading-placeholder" style="padding: 20px;">
        <div class="spinner" style="margin-bottom: 10px;"></div>
        <p>جاري تحميل المعلومات...</p>
      </div>
    `;
    this.showOverlay("surahInfo");

    if (!this.surahsInfo) {
      try {
        const response = await fetch("./data/surainfo.json", { cache: "force-cache" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.surahsInfo = await response.json();
      } catch (err) {
        overlay.content.innerHTML = `<div class="empty-message">⚠️ تعذر تحميل المعلومات</div>`;
        return;
      }
    }

    if (!this._surahInfoSwipeInitialized) {
      this._initSurahInfoSwipe();
    }

    this._setupSurahInfoKeyboard();
    this._updateSurahInfoUI(surahId);
  }

  _setupSurahInfoKeyboard() {
    if (this._surahInfoKeyHandler) return;
    this._surahInfoKeyHandler = (e) => {
      const overlayElem = this.overlays.surahInfo?.element;
      if (!overlayElem || !overlayElem.classList.contains("show")) return;
      if (!this.currentSurahInfoId) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (this.currentSurahInfoId < 114) this._updateSurahInfoUI(this.currentSurahInfoId + 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          if (this.currentSurahInfoId > 1) this._updateSurahInfoUI(this.currentSurahInfoId - 1);
          break;
      }
    };
    document.addEventListener("keydown", this._surahInfoKeyHandler);
  }

  _removeSurahInfoKeyboard() {
    if (this._surahInfoKeyHandler) {
      document.removeEventListener("keydown", this._surahInfoKeyHandler);
      this._surahInfoKeyHandler = null;
    }
  }

  _updateSurahInfoUI(surahId) {
    const overlay = this.overlays.surahInfo;
    if (!overlay?.content) return;

    if (!this.surahsInfo) {
      setTimeout(() => this._updateSurahInfoUI(surahId), 100);
      return;
    }

    const info = this.surahsInfo.find(item => item.s === surahId);
    if (!info) {
      overlay.content.innerHTML = `<div class="empty-message">ℹ️ لا توجد معلومات متوفرة لهذه السورة</div>`;
      return;
    }

    const formattedHtml = this.formatSurahInfo(info.t);
    overlay.content.innerHTML = `<div class="surah-info-content" style="padding: 1rem;">${formattedHtml}</div>`;
    this.currentSurahInfoId = surahId;
  }

  _initSurahInfoSwipe() {
    const element = this.overlays.surahInfo?.element;
    if (!element) return;
    window.quranApp.enableSwipe(
      element,
      () => {
        if (this.currentSurahInfoId < 114) this._updateSurahInfoUI(this.currentSurahInfoId + 1);
      },
      () => {
        if (this.currentSurahInfoId > 1) this._updateSurahInfoUI(this.currentSurahInfoId - 1);
      },
      50
    );
  }

  getSectionColor(index) {
    const colors = [
      'var(--primary)',
      'var(--color-blue)',
      'var(--color-brown)',
      'var(--color-violet)',
      'var(--color-gray)',
      '#ff9800',
      'var(--color-red)',
      '#009688'
    ];
    return colors[index % colors.length];
  }

  formatSurahInfo(text) {
    const lines = text.split(/\r?\n/);
    const title = lines[0]?.trim() || "";
    const remaining = lines.slice(1);

    let html = '';
    if (title) {
      html += `<div style="display: flex; justify-content: center; width: 100%;">
               <div class="surah-info-title">${window.quranApp.escapeHtml(title)}</div>
             </div>`;
    }
    let sectionIndex = 0;
    for (let line of remaining) {
      line = line.trim();
      if (line === '') {
        html += '<br>';
        continue;
      }
      const match = line.match(/^([1-9][-–:])\s*(.*)/);
      if (match) {
        const prefix = match[1];
        const rest = match[2];
        const color = this.getSectionColor(sectionIndex++);
        html += `<div class="surah-section-title" style="color: ${color}; font-weight: bold; margin-top: 0.75rem;">${prefix} ${window.quranApp.escapeHtml(rest)}</div>`;
      } else {
        html += `<div class="surah-section-text" style="line-height: 1.6; margin-bottom: 0.5rem;">${window.quranApp.escapeHtml(line)}</div>`;
      }
    }
    return html;
  }

  // ============================================
  // 2. JUZ/HIZB OVERLAY
  // ============================================

  showJuzHizb() {
    this.closeMenu();
    const overlay = this.lazyLoadOverlay("juzHizb");
    if (overlay?.element && overlay?.content) {
      this.renderJuzHizbList();
      this.showOverlay("juzHizb");
    }
  }

  renderJuzHizbList() {
    const overlay = this.overlays.juzHizb;
    if (!overlay?.content || !window.quranCalculator) return;
    overlay.content.innerHTML = "";

    const hizbs = window.quranCalculator.getHizbWithPageRange();
    const bookmarks = window.quranApp?.getBookmarks() || [];

    hizbs.forEach((hizb) => {
      const hasBookmarkInRange = bookmarks.some(
        (b) => b.page >= hizb.page_start && b.page <= hizb.page_end,
      );
      const isNewJuz = parseInt(hizb.hizb) % 2 !== 0;
      const juzNum = Math.ceil(parseInt(hizb.hizb) / 2);
      const suraId = hizb.s_id; const ayaText = (hizb.aya_txt || "").replace(/\s*\(\d+\)\s*$/, "").trim();
      const prefix = `${window.quranApp.escapeHtml(String(suraId))}. ${window.quranApp.escapeHtml(hizb.sura)} - آية (${window.quranApp.escapeHtml(String(hizb.aya))})`;
      const container = window.ListItemRenderer.createContainer('juzhizb', hizb.hizb);

      // Première ligne
      const rightElements = [];
      const badgeSpan = window.ListItemRenderer.createBadge(isNewJuz ? `ج${juzNum}` : "ج0");
      if (!isNewJuz) badgeSpan.style.visibility = "hidden";
      rightElements.push(badgeSpan);
      const titleSpan = window.ListItemRenderer.createTitle(`الحزب ${hizb.hizb}`);
      rightElements.push(titleSpan);

      const leftElements = [];
      if (hasBookmarkInRange) leftElements.push(window.ListItemRenderer.createIcon("🔖"));
      leftElements.push(window.ListItemRenderer.createPageTag(hizb.page_start));

      const line1 = window.ListItemRenderer.buildLine1({ rightElements, leftElements });
      container.appendChild(line1);

      // Ligne 2 : texte de l'ayah
      const line2 = document.createElement("div");
      line2.className = "item-line-2 juz-line2";
      line2.innerHTML = `<span class="aya-text">${window.quranApp.escapeHtml(ayaText)}</span>`;
      container.appendChild(line2);

      // Ligne 3 : référence sourate + ayah
      const line3 = document.createElement("div");
      line3.className = "item-line-3 juz-line3";
      line3.innerHTML = `<span class="note-small">${prefix}</span>`;
      container.appendChild(line3);

      container.addEventListener("click", () => {
        window.quranApp?.goToPage(hizb.page_start);
        this.closeOverlay("juzHizb");
      });
      overlay.content.appendChild(container);
    });

    const currentHizb = window.quranCalculator?.getHizbForPage(this.getCurrentPage());
    if (currentHizb?.hizb) {
      setTimeout(() => {
        const el = overlay.content.querySelector(`.item-container[data-juzhizb-id="${currentHizb.hizb}"]`);
        if (el) {
          el.classList.add("current-item");
          el.scrollIntoView({ block: "center", behavior: "auto" });
        }
      }, 50);
    }
  }

  // ============================================
  // 3. BOOKMARKS OVERLAY
  // ============================================

  _showBackdropDialog(html, bindButtons) {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "confirm-backdrop";
      const dialog = document.createElement("div");
      dialog.className = "confirm-dialog";
      dialog.innerHTML = html;
      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);
      window.dispatchEvent(new CustomEvent("quran:overlayOpened"));

      const cleanup = (result) => {
        backdrop.remove();
        window.dispatchEvent(new CustomEvent("quran:overlayClosed"));
        resolve(result);
      };

      backdrop.addEventListener("click", (e) => { if (e.target === backdrop) cleanup(null); });
      bindButtons(dialog, cleanup);
    });
  }

  showConfirm(message) {
    return this._showBackdropDialog(
      `<p>${message}</p><div class="confirm-buttons"><button class="confirm-btn ok">نعم</button><button class="confirm-btn cancel">لا</button></div>`,
      (dialog, cleanup) => {
        dialog.querySelector(".ok").addEventListener("click", () => cleanup(true));
        dialog.querySelector(".cancel").addEventListener("click", () => cleanup(false));
      }
    );
  }

  showBookmarks() {
    this.closeMenu();
    const overlay = this.lazyLoadOverlay("bookmarks");
    if (overlay?.element) {
      this.refreshBookmarksDisplay();
      this.showOverlay("bookmarks");
    }
  }

  refreshBookmarksDisplay() {
    const overlay = this.overlays.bookmarks;
    if (!overlay?.content) return;

    const bookmarks = window.quranApp?.getBookmarks() || [];
    const currentPage = this.getCurrentPage();
    overlay.content.innerHTML = "";

    const container = document.createElement("div");
    container.className = "bookmarks-overlay-content";

    // Liste des signets
    const listContainer = document.createElement("div");
    listContainer.className = "bookmarks-list";

    // Formulaire d'ajout / édition
    const formContainer = document.createElement("div");
    formContainer.className = "bookmarks-add-form";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "search-input";
    input.placeholder = "اسم العلامة";
    input.value = this.getDefaultBookmarkName(currentPage);
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "bookmarks-button-container";

    const addBtn = document.createElement("button");
    addBtn.className = "confirm-btn ok";
    addBtn.textContent = "إضافة";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "confirm-btn cancel";
    cancelBtn.textContent = "لا";
    cancelBtn.style.display = "none";

    buttonContainer.appendChild(addBtn);
    buttonContainer.appendChild(cancelBtn);
    formContainer.appendChild(buttonContainer);
    formContainer.appendChild(input);

    this.bookmarkFormInput = input;
    this.bookmarkFormButton = addBtn;
    this.bookmarkFormCancel = cancelBtn;

    if (bookmarks.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.className = "empty-message";
      emptyMsg.textContent = "لا توجد علامات مرجعية";
      listContainer.appendChild(emptyMsg);
    } else {
      bookmarks.forEach((bookmark) =>
        listContainer.appendChild(this.createBookmarkElement(bookmark))
      );
    }

    container.appendChild(listContainer);
    container.appendChild(formContainer);
    overlay.content.appendChild(container);

    this.setupBookmarkFormHandlers(currentPage);
  }

  setupBookmarkFormHandlers(currentPage) {
    if (!this.bookmarkFormInput || !this.bookmarkFormButton) return;

    this.bookmarkFormButton.addEventListener("click", () => {
      if (this.editingBookmarkId) {
        const newName = this.bookmarkFormInput.value.trim();
        if (newName && window.quranApp?.updateBookmark(this.editingBookmarkId, newName)) {
          window.quranApp.showToast("✏️ تم تعديل الاسم");
          this.resetBookmarkForm();
          this.refreshBookmarksDisplay();
        }
      } else {
        const name = this.bookmarkFormInput.value.trim() || `صفحة ${currentPage}`;
        window.quranApp.addBookmark({
          page: currentPage,
          name,
          date: new Date().toISOString(),
          id: `bookmark_${currentPage}_${Date.now()}`,
        });
        window.quranApp.showToast("✅ تمت إضافة العلامة");
        this.bookmarkFormInput.value = this.getDefaultBookmarkName(currentPage);
        this.refreshBookmarksDisplay();
      }
    });

    this.bookmarkFormCancel.addEventListener("click", () => {
      this.resetBookmarkForm();
      this.refreshBookmarksDisplay();
    });
  }

  startEditingBookmark(bookmark) {
    if (this.editingBookmarkId) this.resetBookmarkForm();
    this.editingBookmarkId = bookmark.id;
    this.bookmarkFormInput.value = bookmark.name;
    this.bookmarkFormButton.textContent = "حفظ";
    this.bookmarkFormCancel.style.display = "inline-flex";
    document.querySelectorAll(".item-bookmark").forEach((item) => {
      item.classList.toggle(
        "editing-bookmark",
        item.dataset.bookmarkId === bookmark.id
      );
    });
  }

  resetBookmarkForm() {
    this.editingBookmarkId = null;
    this.bookmarkFormInput.value = this.getDefaultBookmarkName(this.getCurrentPage());
    this.bookmarkFormCancel.style.display = "none";
    this.bookmarkFormButton.textContent = "إضافة";
    document.querySelectorAll(".item-bookmark").forEach((item) =>
      item.classList.remove("editing-bookmark")
    );
  }

  createBookmarkElement(bookmark) {
    const item = window.ListItemRenderer.createContainer('bookmark', bookmark.id);
    this.renderBookmarkDisplayMode(item, bookmark);
    return item;
  }

  renderBookmarkDisplayMode(item, bookmark) {
    let dateDisplay = "";
    if (bookmark.lastModified) {
      const date = new Date(bookmark.lastModified);
      const year = date.getFullYear().toString().slice(-2);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      dateDisplay = `${year}-${month}-${day}`;
    }

    // Utiliser les classes standard pour la ligne 1
    const rightElements = [
      (() => {
        const btn = document.createElement("button");
        btn.className = "action-icon bordered icon-btn--edit";
        btn.setAttribute("data-id", bookmark.id);
        btn.title = "تعديل الاسم";
        btn.textContent = "✏️";
        return btn;
      })(),
      (() => {
        const span = document.createElement("span");
        span.className = "item-title bookmark-name";
        span.setAttribute("data-id", bookmark.id);
        span.textContent = window.quranApp.escapeHtml(bookmark.name);
        return span;
      })(),
    ];

    const leftElements = [
      window.ListItemRenderer.createPageTag(bookmark.page),
      (() => {
        const btn = document.createElement("button");
        btn.className = "action-icon bordered icon-btn--replace";
        btn.setAttribute("data-id", bookmark.id);
        btn.title = "استبدال الصفحة بالصفحة الحالية";
        btn.textContent = "♻️";
        return btn;
      })(),
      (() => {
        const btn = document.createElement("button");
        btn.className = "action-icon bordered icon-btn--remove";
        btn.setAttribute("data-id", bookmark.id);
        btn.title = "حذف";
        btn.textContent = "🗑️";
        return btn;
      })(),
    ];

    const line1 = window.ListItemRenderer.buildLine1({ rightElements, leftElements });
    item.appendChild(line1);

    // Ligne 2 : date
    const line2 = document.createElement("div");
    line2.className = "item-line-2";
    line2.style.marginTop = "4px";
    line2.style.paddingRight = "45px";
    const rightPart2 = document.createElement("div");
    rightPart2.className = "item-right";
    const dateSpan = document.createElement("span");
    dateSpan.className = "note-small";
    dateSpan.textContent = dateDisplay || "غير معروف";
    rightPart2.appendChild(dateSpan);
    line2.appendChild(rightPart2);
    item.appendChild(line2);

    this.attachBookmarkEvents(item, bookmark);
  }

  attachBookmarkEvents(item, bookmark) {
    item.querySelector(".icon-btn--edit")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.startEditingBookmark(bookmark);
    });

    item.querySelector(".icon-btn--replace")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      // 🔁 Récupérer la page courante DIRECTEMENT depuis le lecteur (pas via `getCurrentPage()` qui peut être obsolète)
      const currentPage = window.quranReader?.getCurrentPage() || this.getCurrentPage();
      const oldPage = bookmark.page;

      // Éviter le remplacement si la page n'a pas changé
      if (oldPage === currentPage) {
        window.quranApp?.showToast("⚠️ العلامة موجودة بالفعل على هذه الصفحة");
        return;
      }

      const confirmed = await this.showConfirm(
        `هل تريد نقل العلامة (${bookmark.name}) من صفحة ${oldPage} إلى صفحة ${currentPage} ؟`
      );

      if (confirmed && window.quranApp?.replaceBookmarkPage(bookmark.id, currentPage)) {
        window.quranApp.showToast(`♻️ تم نقل العلامة من صفحة ${oldPage} إلى ${currentPage}`);
        this.refreshBookmarksDisplay();
      }
    });

    item.querySelector(".icon-btn--remove")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const confirmed = await this.showConfirm(`هل تريد حذف العلامة (${bookmark.name}) ؟`);
      if (confirmed && window.quranApp?.removeBookmarkById(bookmark.id)) {
        window.quranApp.showToast("✖️ تمت إزالة العلامة");
        this.refreshBookmarksDisplay();
      }
    });

    item.addEventListener("click", () => {
      window.quranApp?.goToPage(bookmark.page);
      this.closeOverlay("bookmarks");
    });
  }

  showImportChoice() {
    return this._showBackdropDialog(
      `<p>كيف تريد استيراد البيانات؟</p><div class="confirm-buttons"><button class="confirm-btn ok" id="mergeBtn">دمج</button><button class="confirm-btn blue" id="replaceBtn">استبدال</button><button class="confirm-btn cancel" id="cancelBtn">إلغاء</button></div>`,
      (dialog, cleanup) => {
        dialog.querySelector("#mergeBtn").addEventListener("click", () => cleanup("merge"));
        dialog.querySelector("#replaceBtn").addEventListener("click", () => cleanup("replace"));
        dialog.querySelector("#cancelBtn").addEventListener("click", () => cleanup(null));
      }
    );
  }

  async exportBookmarks() {
    const app = window.quranApp;
    const hasBookmarks = app.bookmarks?.length > 0;
    const hasPinnedSurahs = app.pinnedSurahs?.length > 0;
    const hasPinnedReciters = Object.keys(window.RIWAYAT_CONFIG || {}).some(r => {
      const s = app.getPreference(`pinnedReciters_${r}`);
      return s && JSON.parse(s).length > 0;
    });
    if (!hasBookmarks && !hasPinnedSurahs && !hasPinnedReciters) {
      app.showToast("⚠️ لا توجد بيانات للتصدير");
      return;
    }
    const data = app.exportUserData();
    const date = new Date().toISOString().slice(2, 10);
    const fileName = `hafs_backup_${date}`;
    const bytes = new TextEncoder().encode(data);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    const base64 = btoa(binary);
    if (typeof cordova !== "undefined" && window.plugins?.socialsharing) {
      window.plugins.socialsharing.shareWithOptions(
        {
          message: "نسخة احتياطية من العلامات المرجعية والسور المفضلة",
          subject: fileName,
          files: ["data:application/json;base64," + base64],
          chooserTitle: "حفظ أو مشاركة الملف",
        },
        () => app.showToast("✅ تم التصدير"),
        (err) => app.showToast("❌ " + err)
      );
    } else {
      const a = document.createElement("a");
      a.href = "data:application/json;base64," + base64;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      app.showToast("✅ تم التصدير");
    }
  }

  importBookmarks() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    document.body.appendChild(input);

    input.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) {
        input.remove();
        return;
      }

      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const json = ev.target.result;
          const choice = await this.showImportChoice();
          if (!choice) {
            input.remove();
            return;
          }

          const success = window.quranApp.importUserData(json, choice === "merge");
          if (success) {
            window.quranApp?.showToast("✅ تم استيراد البيانات");
            this.refreshBookmarksDisplay();
            if (this.overlays.surahs?.element?.classList.contains("show")) {
              this.renderSurahsList();
            }
          } else {
            window.quranApp?.showToast("❌ فشل الاستيراد: الملف غير صالح");
          }
        } catch {
          window.quranApp?.showToast("❌ خطأ في قراءة الملف");
        } finally {
          input.remove();
        }
      };
      reader.readAsText(file);
    });

    input.click();
  }

  // ============================================
  // 4. KHATM OVERLAY
  // ============================================

  showKhatm() {
    this.closeMenu();
    const overlay = this.lazyLoadOverlay("khatm");
    if (overlay) {
      this.prepareKhatmContent();
      this.showOverlay("khatm");
    }
  }

  prepareKhatmContent() {
    const overlay = this.overlays.khatm;
    if (!overlay?.content || overlay.content.children.length > 0) return;
    overlay.content.innerHTML = `<div class="khatm-page">
      <img src="./media/605.webp" alt="دعاء ختم القرآن - الصفحة 605" loading="lazy">
      <img src="./media/606.webp" alt="دعاء ختم القرآن - الصفحة 606" loading="lazy">
    </div>`;
  }

  // ============================================
  // 6. SEARCH OVERLAY
  // 7. TAFSIR OVERLAY
  // ============================================

  // ============================================
  // 8. TAJWEED OVERLAY
  // ============================================

  showTajweed() {
    this.closeMenu();
    const overlay = this.lazyLoadOverlay("tajweed");
    if (overlay) {
      this.prepareTajweedContent();
      this.showOverlay("tajweed");
    }
  }

  prepareTajweedContent() {
    const overlay = this.overlays.tajweed;
    if (!overlay?.content) return;
    overlay.content.innerHTML = `<div class="tajweed-text">
      <div class="tajweed-image">
        <img src="./media/000.webp" alt="قواعد التجويد الملونة" loading="lazy">
      </div>
      <p><span style="color:#ff0000;font-weight:bold;margin-right:5px;">أولاً – اللون الأحمر (بتدرّجاته):</span></p>
      <p>يرمز للمدود بأزمنتها المختلفة حسب تدرّج اللون.</p>
      <ul style="margin-bottom:15px;">
        <li style="margin-bottom:10px;"><span style="color:#993300;font-weight:bold;">اللون الأحمر الغامق</span>، يرمز للمد اللازم ويمد ست حركات، ويشمل المد الكَلمي (بنوعيه المثقّل والمخفّف) والمد الحرفي (بنوعيه المثقّل والمخفّف).</li>
        <li style="margin-bottom:10px;"><span style="color:#ff0000;font-weight:bold;">اللون الأحمر القاني:</span> يرمز للمد الواجب ويُمدّ خمس حركات ويشمل المد المتّصل والمد المنفصل والصلة الكبرى.</li>
        <li style="margin-bottom:10px;"><span style="color:#ff6600;font-weight:bold;">اللون البرتقالي:</span> يرمز للمد الجائز، ويمد حركتين أو أربع أو ست حركات في حال الوقف على رؤوس الآي كما رسمت في المصاحف، ويشمل هذا المد الجائز كلاً من المد العارض للسكون، ومد اللين.</li>
        <li style="margin-bottom:10px;"><span style="color:#ffcc00;font-weight:bold;">اللون الكمّوني:</span> يرمز للمد الطبيعي وهو حركتان فقط سواء للألف المحذوفة من الرسم العثماني أو للصلة الصغرى.</li>
      </ul>
      <p><strong><span style="color:#008000;margin-right:5px;">ثانياً – اللون الأخضر:</span></strong></p>
      <p>يرمز لموقع الغنّة وزمنها حركتان، أما تمييزها (مرقّقة أو مفخّمة والنطق بها بشكل عام، فهذا لا بدّ من الرجوع به إلى التلقّي والمشافهة)، وقد تكون لغنّة الإخفاء، أو الإخفاء الشفوي، أو للنون المشدّدة أو الميم المشدّدة، وهي تشكّل مع اللون الرمادي حكم الإدغام بغنّة وحكم الإقلاب.</p>
      <p><strong><span style="color:#3366ff;margin-right:5px;">ثالثاً – اللون الأزرق:</span></strong></p>
      <ul style="margin-bottom:15px;">
        <li style="margin-bottom:10px;"><span style="color:#000080;font-weight:bold;">الأزرق الغامق:</span> لوّنت به الراء المفخّمة فقط دون التعرّض لحروف الاستعلاء ذات المراتب المختلفة للتفخيم دفعاً للتشويش عن القارئ.</li>
        <li style="margin-bottom:10px;"><span style="color:#3399ff;font-weight:bold;">الأزرق السماوي:</span> بالنسبة لحروف القلقلة الصغرى فقد لوّنت مع إشارة السكون التي عليها، أما بالنسبة للقلقلة الكبرى فقد لونت عند الوقف عليها في رؤوس الآي (دون تلوين الحركة).</li>
      </ul>
      <p><span style="color:#808080;font-weight:bold;margin-right:5px;">رابعاً - اللون الرمادي:</span></p>
      <p>لما يُكتب ولا يُلفظ من الحروف، كحالة اللام الشمسية لتمييزها عن اللام القمرية، وألف التفريق، والمرسوم خلاف اللفظ، وهمزة الوصل داخل الكلمة، وكرسي الألف المحذوفة (الخنجرية)، والإدغام المتجانس، والإدغام المتقارب، وكذلك النون والتنوين الخاضعتان لحكم الإقلاب (بمساعدة اللون الأخضر لحرف الميم الصغيرة الموجودة فوق حرف النون أو في مكان التنوين)، وكذلك النون والتنوين الخاضعتان لحكم الإدغام بغُنّة (بمساعدة اللون الأخضر للحرف المدغم فيه ـ لأنّ الغنّة عليه).</p>
    </div>`;
  }

  // ============================================
  // 9. ABOUT OVERLAY
  // ============================================

  shareApp() {
    const appName = "مصحف التجويد - حفص";
    const appUrl = "https://zdig1.gitlab.io/quran";
    const shortMessage = `📖${appName}\n تطبيق متكامل لقراءة القرآن الكريم والاستماع إليه ودراسته.      \n يضم التفسير الميسّر، والبحث المتقدم، بالإضافة إلى قواعد التجويد.\n`;

    if (typeof cordova !== "undefined" && window.plugins?.socialsharing) {
      window.plugins.socialsharing.shareWithOptions(
        {
          message: shortMessage,
          subject: appName,
          url: appUrl,
          chooserTitle: "مشاركة التطبيق",
        },
        () => window.quranApp?.showToast("✅ تم فتح المشاركة"),
        (err) => {
          window.quranApp?.showToast("❌ تعذر فتح المشاركة");
        }
      );
    } else if (navigator.share) {
      navigator.share({
        title: appName,
        text: shortMessage,
        url: appUrl,
      })
        .then(() => window.quranApp?.showToast("✅ تمت المشاركة"))
        .catch((err) => {
          if (err.name !== "AbortError") {
            window.quranApp?.showToast("❌ تعذرت المشاركة");
          }
        });
    } else {
      navigator.clipboard
        .writeText(appUrl)
        .then(() => {
          window.quranApp?.showToast("📋 تم نسخ رابط التطبيق");
        })
        .catch(() => {
          prompt("انسخ رابط التطبيق:", appUrl);
        });
    }
  }

  showAbout() {
    this.closeMenu();
    const overlay = this.lazyLoadOverlay("about");
    if (overlay?.content) {
      this.renderAboutContent();
      this.showOverlay("about");
    }
  }

  renderAboutContent() {
    const overlay = this.overlays.about;
    if (!overlay?.content) return;
    overlay.content.innerHTML = `
  <div class="about-content">
    <p class="about-title">
      <strong>مصحف التجويد - حفص</strong>
      <span class="about-version">v${encodeURIComponent(window.APP_VERSION || "?")}</span>
    </p>
    <p class="about-desc">
      تطبيق شامل لقراءة القرآن الكريم. مطابق للمصحف الورقي المعتمد:
      <strong>مصحف التجويد الملون برواية حفص عن الإمام عاصم الكوفي</strong> من طريق الشاطبية.
    </p>
    <div class="contact-grid-container">
      <button id="aboutBackupBtn" class="contact-box-item">
        <span>💾 نسخ احتياطي</span>
      </button>
      <button id="shareAppBtn" class="contact-box-item">
        <span>🔗 شارك التطبيق</span>
      </button>
      <a href="https://zdig1.gitlab.io/quran/" target="_blank" class="contact-box-item">
        <span>🌐 زيارة الموقع</span>
      </a>
      <a href="mailto:zdig1.0@gmail.com?subject=quran%20hafs&body=App%20Version:%20${encodeURIComponent(window.APP_VERSION)}%0A---%0A%0A" class="contact-box-item">
        <span>📧 تواصل معنا</span>
      </a>
    </div>
    <div class="about-stats">
      <div class="about-stat"><span>السور</span><strong>114</strong></div>
      <div class="about-stat"><span>الآيات</span><strong>6236</strong></div>
      <div class="about-stat"><span>الصفحات</span><strong>604</strong></div>
      <div class="about-stat"><span>الأجزاء</span><strong>30</strong></div>
      <div class="about-stat"><span>الأحزاب</span><strong>60</strong></div>
      <div class="about-stat"><span>السجدات</span><strong>15</strong></div>
    </div>

       <!-- ✅ قسم الشكر والمصادر — سطر واحد -->
    <p class="about-credits-line">
      <span>صفحات المصحف:</span>
      <a href="https://easyquran.com/" target="_blank" rel="noopener">دار المعرفة</a>
      · <span>النص والتفسير:</span>
      <a href="https://quran.ksu.edu.sa/" target="_blank" rel="noopener">Quran.ksu.edu.sa</a>
      · <span>التلاوات:</span>
      <a href="https://everyayah.com" target="_blank" rel="noopener">EveryAyah.com</a>
    </p>

    <p class="about-footer">
      جميع الحقوق محفوظة © 2026<br>
      GDZ 🍉
    </p>
  </div>`;

    document.getElementById("shareAppBtn")?.addEventListener("click", () => this.shareApp());
    document.getElementById("aboutBackupBtn")?.addEventListener("click", () => {
      this.closeOverlay("about");
      this.showBackupDialog();
    });
  }

  showBackupDialog() {
    this.closeMenu();
    const overlay = this.lazyLoadOverlay("backup");
    if (!overlay?.element) return;
    this.showOverlay("backup");

    const exportBtn = document.getElementById("backupExportBtn");
    const importBtn = document.getElementById("backupImportBtn");

    const newExport = exportBtn.cloneNode(true);
    const newImport = importBtn.cloneNode(true);
    exportBtn.replaceWith(newExport);
    importBtn.replaceWith(newImport);

    newExport.addEventListener("click", () => {
      this.closeOverlay("backup");
      this.exportBookmarks();
    });
    newImport.addEventListener("click", () => {
      this.closeOverlay("backup");
      this.importBookmarks();
    });
  }

  // ============================================
  // 10. PAGE INPUT OVERLAY
  // ============================================

  showPageInputDialog() {
    const overlay = document.getElementById("pageInputOverlay");
    const input = document.getElementById("pageInputField");
    const goBtn = document.getElementById("pageInputGoBtn");
    const closeBtn = document.getElementById("closePageInputBtn");
    if (!overlay || !input) return;

    input.value = window.quranApp?.getCurrentPage() || 1;
    overlay.classList.add("show");

    document.body.style.overflow = "hidden";
    window.dispatchEvent(new CustomEvent("quran:overlayOpened"));
    if (window.quranReader) window.quranReader._dialogOpen = true;
    setTimeout(() => {
      input.focus();
      setTimeout(() => input.setSelectionRange(0, input.value.length), 100);
    }, 50);

    const ac = new AbortController();
    const { signal } = ac;

    const close = () => {
      if (window.quranReader) window.quranReader._dialogOpen = false;
      ac.abort();
      overlay.classList.remove("show");
      document.body.style.overflow = "";
      window.dispatchEvent(new CustomEvent("quran:overlayClosed"));

      if (window.quranReader?.readingMode === "book") {
        setTimeout(() => {
          window.quranReader._adjustFooterHeight();
          const img = window.quranReader.elements.pageScroll?.querySelector(
            '.page-wrapper.active img'
          );
          if (img && window.quranReader._applyBookImageStyle) {
            window.quranReader._applyBookImageStyle(img);
          }
        }, 350);
      }
    };

    const confirm = () => {
      const pageNum = parseInt(input.value, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= 604) {
        window.quranApp?.goToPage(pageNum);
        close();
      } else {
        window.quranApp?.showToast("❌ الرجاء إدخال رقم صفحة صحيح (1-604)");
        input.focus();
      }
    };

    const isTouch = "ontouchstart" in window;
    goBtn.addEventListener("touchend", (e) => { e.preventDefault(); confirm(); }, { signal });
    goBtn.addEventListener("click", () => { if (!isTouch) confirm(); }, { signal });
    closeBtn.addEventListener("touchend", (e) => { e.preventDefault(); close(); }, { signal });
    closeBtn.addEventListener("click", () => { if (!isTouch) close(); }, { signal });
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); }, { signal });
    input.addEventListener("keypress", (e) => { if (e.key === "Enter") { e.preventDefault(); confirm(); } }, { signal });
  }

  // ============================================
  // GESTION GÉNÉRALE DES OVERLAYS
  // ============================================

  updateThemeButtonText() {
    const textSpan = this.elements.themeBtn?.querySelector(".menu-text");
    if (textSpan) {
      textSpan.textContent = document.body.classList.contains("night-mode")
        ? "الوضع النهاري"
        : "الوضع الليلي";
    }
  }

  showOverlay(name) {
    if (this.currentOverlay && this.currentOverlay !== name)
      this.closeOverlay(this.currentOverlay);
    const overlay = this.overlays[name];
    if (!overlay?.element) return;
    overlay.element.classList.add("show");
    document.body.style.overflow = "hidden";
    this.currentOverlay = name;
    if (window.quranReader) {
      window.quranReader.buttonsVisible = true;
      window.quranReader.applyButtonsVisibility();
    }
    window.dispatchEvent(
      new CustomEvent("quran:overlayOpened", { detail: { overlay: name } })
    );
  }

  closeOverlay(name) {
    const overlay = this.overlays[name];
    if (!overlay?.element) return;
    overlay.element.classList.remove("show");
    if (name === "audio" && !window.quranAudioPlayer?.isStopped) {
      window.quranAudioPlayer?._showMiniBar();
    }
    if (name === "surahInfo") {
      this._removeSurahInfoKeyboard();
    }
    if (this.currentOverlay === name) this.currentOverlay = null;
    if (!this.currentOverlay) document.body.style.overflow = "";
    if (name === "tafsir") {
      if (this._tafsirInitTimeout) {
        clearTimeout(this._tafsirInitTimeout);
        this._tafsirInitTimeout = null;
      }
      if (this._tafsirSavedPage && window.quranReader?.goToPage) {
        setTimeout(() => {
          window.quranReader.goToPage(this._tafsirSavedPage);
          this._tafsirSavedPage = null;
        }, 50);
      }
    }
    window.dispatchEvent(
      new CustomEvent("quran:overlayClosed", { detail: { overlay: name } })
    );
  }

  closeCurrentOverlay() {
    if (this.currentOverlay) this.closeOverlay(this.currentOverlay);
  }
}

window.overlayManager = new OverlayManager();
if (typeof window !== "undefined") window.OverlayManager = OverlayManager;