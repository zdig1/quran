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
    },
    khatm: {
      element: "khatmOverlay",
      closeBtn: "closeKhatmBtn",
      content: "khatmContent",
    },
    search: {
      element: "searchOverlay",
      closeBtn: "closeSearchBtn",
      input: "searchInput",
      results: "searchResults",
    },
    tafsir: {
      element: "tafsirOverlay",
      closeBtn: "closeTafsirBtn",
      content: "tafsirContent",
      suraSelect: "suraSelect",
      ayaSelect: "ayaSelect",
      pageSelect: "pageSelect",
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
    }, about: {
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
        this.closeCurrentOverlay();
        this.closeMenu();
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
      { btn: this.elements.audioBtn, action: () => this.showAudio() },
      { btn: this.elements.khatmBtn, action: () => this.showKhatm() },
      { btn: this.elements.searchBtn, action: () => this.showSearch() },
      { btn: this.elements.tafsirBtn, action: () => this.showTafsir() },
      { btn: this.elements.tajweedBtn, action: () => this.showTajweed() },
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
    const revelationIcon = surah.type === "مدنية" ? "🕌" : "🕋";
    const juzStarts = window.quranCalculator._juzBySurahId?.get(surah.s_id)?.slice(0, 1) || [];

    const item = document.createElement("div");
    item.className = "item-container item-surah";
    item.setAttribute("data-surah-id", surah.s_id);

    // 1. Pin (deux lignes)
    const pinBtn = document.createElement("button");
    pinBtn.className = `pin-btn surah-pin ${isPinned ? "pinned" : ""}`;
    pinBtn.setAttribute("data-sura-id", surah.s_id);
    pinBtn.textContent = isPinned ? "⭐" : "📌";

    // 2. Numéro (deux lignes)
    const numberSpan = document.createElement("span");
    numberSpan.className = "item-badge surah-number";
    numberSpan.textContent = surah.s_id;

    // 3. Nom (ligne 1)
    const nameSpan = document.createElement("span");
    nameSpan.className = "surah-name";
    nameSpan.textContent = surah.name;

    // 4. Ordre (ligne 2)
    const orderSpan = document.createElement("span");
    orderSpan.className = "surah-tanzil";
    orderSpan.textContent = `النزول: ${surah.order}`;

    // 5. Info
    const infoBtn = document.createElement("button");
    infoBtn.className = "info-btn surah-info";
    infoBtn.setAttribute("data-sura-id", surah.s_id);
    infoBtn.textContent = "ℹ️";

    // 6. Révélation
    const revelSpan = document.createElement("span");
    revelSpan.className = "surah-revel";
    revelSpan.textContent = revelationIcon;

    // Groupe pour la ligne 2 de la colonne 3
    const line2Group = document.createElement("div");
    line2Group.className = "surah-line2-group";
    line2Group.appendChild(orderSpan);
    line2Group.appendChild(revelSpan);
    line2Group.appendChild(infoBtn);

    // 7. Juz (ligne 1)
    const juzDiv = document.createElement("div");
    juzDiv.className = "surah-juz";
    juzDiv.innerHTML = `<span class="juz-badge">${juzStarts.map(j => `ج ${j}`).join(" ")}</span>`;

    // 8. Sajda (ligne 2)
    const sajdaDiv = document.createElement("div");
    sajdaDiv.className = "surah-sajda";
    if (window.quranCalculator.hasSajdaInSurah(surah.s_id)) {
      const sajdaSpan = document.createElement("span");
      sajdaSpan.className = "item-sajda-icon";
      sajdaSpan.textContent = "۩";
      sajdaDiv.appendChild(sajdaSpan);
    }

    // 9. Page (ligne 1)
    const pageDiv = document.createElement("div");
    pageDiv.className = "surah-page";
    pageDiv.innerHTML = `<span class="item-tag">ص ${surah.page_start}</span>`;

    // 10. Versets (ligne 2)
    const versesDiv = document.createElement("div");
    versesDiv.className = "surah-verses";
    versesDiv.textContent = `(${surah.verses}) آية`;

    // Ajout dans l'ordre correspondant aux colonnes de la grille
    item.appendChild(pinBtn);        // colonne 1 (2 lignes)
    item.appendChild(numberSpan);    // colonne 2 (2 lignes)
    item.appendChild(nameSpan);      // colonne 3, ligne 1
    item.appendChild(line2Group);    // colonne 3, ligne 2 (groupe)
    item.appendChild(juzDiv);        // colonne 4, ligne 1
    item.appendChild(sajdaDiv);      // colonne 4, ligne 2
    item.appendChild(pageDiv);       // colonne 5, ligne 1
    item.appendChild(versesDiv);     // colonne 5, ligne 2

    item.addEventListener("click", (e) => {
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
      pinBtn.textContent = added ? "⭐" : "📌";

      // Juste mettre à jour la section pinned sans toucher au scroll
      const container = this.overlays.surahs?.content;
      if (!container) return;
      const surahs = window.quranCalculator.getAllSurahs();
      const pinnedIds = window.quranApp.getPinnedSurahs();
      const bookmarks = window.quranApp.getBookmarks() || [];
      const bookmarkedSurahIds = new Set();
      bookmarks.forEach(b => {
        const s = window.quranCalculator.getFirstSurahForPage(b.page);
        if (s) bookmarkedSurahIds.add(s.s_id);
      });
      const pinnedSurahs = surahs.filter(s => pinnedIds.includes(s.s_id));

      let pinnedSection = container.querySelector('.surah-section-pinned');
      if (!pinnedSection) {
        pinnedSection = document.createElement("div");
        pinnedSection.className = "surah-section surah-section-pinned";
        container.insertBefore(pinnedSection, container.firstChild);
      }
      pinnedSection.innerHTML = '<h3 class="section-title">⭐ السور المفضلة</h3>';
      pinnedSurahs.forEach(s => pinnedSection.appendChild(this._createSurahItem(s, true, bookmarkedSurahIds)));
      pinnedSection.style.display = pinnedSurahs.length === 0 ? 'none' : '';
      // Synchroniser le bouton dans la section globale
      const allSection = container.querySelector('.surah-section-all');
      if (allSection) {
        const otherPin = allSection.querySelector(`.pin-btn[data-sura-id="${surah.s_id}"]`);
        if (otherPin) {
          otherPin.classList.toggle("pinned", added);
          otherPin.textContent = added ? "⭐" : "📌";
        }
      }
    });

    infoBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.overlayManager?.showSurahInfo(surah.s_id);
    });

    return item;
  }

  renderSurahsList(scrollToCurrent = true, preserveSurahId = null) {
    const overlay = this.overlays.surahs;
    if (!overlay?.content || !window.quranCalculator) return;

    const container = overlay.content;

    // --- 1. CAPTURE DE LA POSITION PRÉCISE ---
    let initialClickOffset = 0;
    if (preserveSurahId) {
      const allSectionOld = container.querySelector('.surah-section-all');
      const clickedEl = allSectionOld
        ? allSectionOld.querySelector(`.item-surah[data-surah-id="${preserveSurahId}"]`)
        : container.querySelector(`.item-surah[data-surah-id="${preserveSurahId}"]`);

      if (clickedEl) {
        initialClickOffset = clickedEl.offsetTop - container.scrollTop;
      }
    }

    // --- 2. RECONSTRUCTION DU CONTENU ---
    container.innerHTML = "";
    const bookmarks = window.quranApp?.getBookmarks() || [];
    const surahs = window.quranCalculator.getAllSurahs();
    const pinnedIds = window.quranApp?.getPinnedSurahs() || [];
    const bookmarkedSurahIds = new Set();
    bookmarks.forEach(b => {
      const s = window.quranCalculator.getFirstSurahForPage(b.page);
      if (s) bookmarkedSurahIds.add(s.s_id);
    });

    // Section Favorites
    const pinnedSurahs = surahs.filter(s => pinnedIds.includes(s.s_id));
    if (pinnedSurahs.length > 0) {
      const pinnedSection = document.createElement("div");
      pinnedSection.className = "surah-section surah-section-pinned"; // Classe spécifique
      pinnedSection.innerHTML = '<h3 class="section-title">⭐ السور المفضلة</h3>';
      pinnedSurahs.forEach(s => pinnedSection.appendChild(this._createSurahItem(s, true, bookmarkedSurahIds)));
      container.appendChild(pinnedSection);
    }

    // Section Globale
    const allSection = document.createElement("div");
    allSection.className = "surah-section surah-section-all"; // Classe spécifique
    allSection.innerHTML = '<h3 class="section-title">📖 جميع السور</h3>';
    surahs.forEach(s => {
      allSection.appendChild(this._createSurahItem(s, pinnedIds.includes(s.s_id), bookmarkedSurahIds));
    });
    container.appendChild(allSection);

    // --- 3. VERROUILLAGE VISUEL (Version Ultra-Précise) ---
    const currentSurah = window.quranCalculator?.getFirstSurahForPage(this.getCurrentPage());
    if (currentSurah?.s_id) {
      const allSectionNew = container.querySelector('.surah-section-all');
      const currentEl = allSectionNew
        ? allSectionNew.querySelector(`.item-surah[data-surah-id="${currentSurah.s_id}"]`)
        : container.querySelector(`.item-surah[data-surah-id="${currentSurah.s_id}"]`);
      if (currentEl) currentEl.classList.add("current-item");
    }

    if (preserveSurahId) {
      const allSectionNew = container.querySelector('.surah-section-all');
      const newEl = allSectionNew
        ? allSectionNew.querySelector(`.item-surah[data-surah-id="${preserveSurahId}"]`)
        : null;
      if (newEl) {
        requestAnimationFrame(() => {
          container.scrollTop = newEl.offsetTop - initialClickOffset;
        });
      }
    } else if (scrollToCurrent && currentSurah?.s_id) {
      const allSectionNew = container.querySelector('.surah-section-all');
      const el = allSectionNew
        ? allSectionNew.querySelector(`.item-surah[data-surah-id="${currentSurah.s_id}"]`)
        : null;
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ block: "center", behavior: "auto" }));
      }
    }
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
      const suraId =
        window.quranCalculator._surahIdByName?.get(hizb.sura) ?? "?";
      const ayaText = (hizb.aya_txt || "").replace(/\s*\(\d+\)\s*$/, "").trim();
      const prefix = `${window.quranApp.escapeHtml(String(suraId))}. ${window.quranApp.escapeHtml(hizb.sura)} - آية (${window.quranApp.escapeHtml(String(hizb.aya))})`;

      const item = document.createElement("div");
      item.className = "item-container item-juzhizb";
      item.setAttribute("data-hizb", hizb.hizb);

const line1 = document.createElement("div");
      line1.className = "item-line-1 juz-line1";
      line1.innerHTML = `
        <div class="juz-col-juz">${isNewJuz ? `<span class="item-badge">ج${juzNum}</span>` : ''}</div>
        <div class="juz-col-hizb"><span class="item-title">الحزب ${hizb.hizb}</span></div>
        <div class="juz-col-bookmark">${hasBookmarkInRange ? '<span class="item-icon">🔖</span>' : ''}</div>
        <div class="juz-col-page"><span class="item-tag">ص ${hizb.page_start}</span></div>
      `;

      const line2 = document.createElement("div");
      line2.className = "item-line-2 juz-line2";
      line2.innerHTML = `<span class="aya-text">${window.quranApp.escapeHtml(ayaText)}</span>`;

      const line3 = document.createElement("div");
      line3.className = "item-line-3 juz-line3";
      line3.innerHTML = `<span class="aya-prefix">${prefix}</span>`;

      item.appendChild(line1);
      item.appendChild(line2);
      item.appendChild(line3);
 
      item.addEventListener("click", () => {
        window.quranApp?.goToPage(hizb.page_start);
        this.closeOverlay("juzHizb");
      });
      overlay.content.appendChild(item);
    });

    const currentHizb = window.quranCalculator?.getHizbForPage(
      this.getCurrentPage(),
    );
    if (currentHizb?.hizb) {
      setTimeout(() => {
        const el = overlay.content.querySelector(
          `.item-container[data-hizb="${currentHizb.hizb}"]`,
        );
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

  showConfirm(message) {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "confirm-backdrop";

      const dialog = document.createElement("div");
      dialog.className = "confirm-dialog";

      const p = document.createElement("p");
      p.textContent = message;
      dialog.appendChild(p);

      const buttonDiv = document.createElement("div");
      buttonDiv.className = "confirm-buttons";

      const okBtn = document.createElement("button");
      okBtn.className = "confirm-btn ok";
      okBtn.textContent = "نعم";

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "confirm-btn cancel";
      cancelBtn.textContent = "لا";

      buttonDiv.appendChild(okBtn);
      buttonDiv.appendChild(cancelBtn);
      dialog.appendChild(buttonDiv);
      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);
      window.dispatchEvent(new CustomEvent("quran:overlayOpened"));

      const cleanup = (result) => {
        backdrop.remove();
        window.dispatchEvent(new CustomEvent("quran:overlayClosed"));
        resolve(result);
      };

      okBtn.addEventListener("click", () => cleanup(true));
      cancelBtn.addEventListener("click", () => cleanup(false));
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) cleanup(false);
      });
    });
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

    // Remplissage de la liste
    if (bookmarks.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.className = "empty-message";
      emptyMsg.textContent = "لا توجد علامات مرجعية";
      listContainer.appendChild(emptyMsg);
    } else {
      bookmarks.forEach((bookmark) =>
        listContainer.appendChild(this.createBookmarkElement(bookmark)),
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
        if (
          newName &&
          window.quranApp?.updateBookmark(this.editingBookmarkId, newName)
        ) {
          window.quranApp.showToast("✏️ تم تعديل الاسم");
          this.resetBookmarkForm();
          this.refreshBookmarksDisplay();
        }
      } else {
        const name =
          this.bookmarkFormInput.value.trim() || `صفحة ${currentPage}`;
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
        item.dataset.bookmarkId === bookmark.id,
      );
    });
  }

  resetBookmarkForm() {
    this.editingBookmarkId = null;

    this.bookmarkFormInput.value = this.getDefaultBookmarkName(
      this.getCurrentPage(),
    );
    this.bookmarkFormCancel.style.display = "none";
    this.bookmarkFormButton.textContent = "إضافة";
    document
      .querySelectorAll(".item-bookmark")
      .forEach((item) => item.classList.remove("editing-bookmark"));
  }

  createBookmarkElement(bookmark) {
    const item = document.createElement("div");
    item.className = "item-container item-bookmark";
    item.setAttribute("data-bookmark-id", bookmark.id);
    this.renderBookmarkDisplayMode(item, bookmark);
    return item;
  }

  renderBookmarkDisplayMode(item, bookmark) {
    let dateDisplay = "";
    if (bookmark.lastModified) {
      const date = new Date(bookmark.lastModified);
      const year = date.getFullYear().toString().slice(-2); // 2 derniers chiffres
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      dateDisplay = `${year}-${month}-${day}`;
    }

    item.innerHTML = `<div class="item-line-1">
    <div class="item-right">
      <button class="icon-btn icon-btn--edit" data-id="${bookmark.id}" title="تعديل الاسم">✏️</button>
      <span class="item-title bookmark-name" data-id="${bookmark.id}">${window.quranApp.escapeHtml(bookmark.name)}</span>
    </div>
    <div class="item-left">
      <span class="item-tag">ص ${bookmark.page}</span>
      <button class="icon-btn icon-btn--replace" data-id="${bookmark.id}" title="استبدال الصفحة بالصفحة الحالية">♻️</button>
      <button class="icon-btn icon-btn--remove" data-id="${bookmark.id}" title="حذف">🗑️</button>
    </div>
  </div>
  <div class="item-line-2" style="margin-top: 4px; padding-right: 45px;">
    <div class="item-right">
<span class="item-tertiary" style="font-size: 0.75rem; color: var(--text-lighter);">
  ${dateDisplay || "غير معروف"}
</span>
    </div>
  </div>`;

    this.attachBookmarkEvents(item, bookmark);
  }

  attachBookmarkEvents(item, bookmark) {
    item.querySelector(".icon-btn--edit")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.startEditingBookmark(bookmark);
    });

    item
      .querySelector(".icon-btn--replace")
      ?.addEventListener("click", async (e) => {
        e.stopPropagation();
        const currentPage = this.getCurrentPage();
        const confirmed = await this.showConfirm(
          `هل تريد وضع العلامة (${bookmark.name}) بهاته الصفحة ؟`,
        );
        if (
          confirmed &&
          window.quranApp?.replaceBookmarkPage(bookmark.id, currentPage)
        ) {
          window.quranApp.showToast(`♻️ تم استبدال الصفحة ب ${currentPage}`);
          this.refreshBookmarksDisplay();
        }
      });

    item
      .querySelector(".icon-btn--remove")
      ?.addEventListener("click", async (e) => {
        e.stopPropagation();
        const confirmed = await this.showConfirm(
          `هل تريد حذف العلامة (${bookmark.name}) ؟`,
        );
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
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "confirm-backdrop";
      const dialog = document.createElement("div");
      dialog.className = "confirm-dialog";
      dialog.innerHTML = `
      <p>كيف تريد استيراد البيانات (العلامات المرجعية والسور المفضلة)؟</p>
      <div class="confirm-buttons">
        <button class="confirm-btn ok" id="mergeBtn">دمج</button>
        <button class="confirm-btn blue" id="replaceBtn">استبدال</button>
        <button class="confirm-btn cancel" id="cancelBtn">إلغاء</button>
      </div>
        `;
      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);
      window.dispatchEvent(new CustomEvent("quran:overlayOpened"));

      const cleanup = (result) => {
        backdrop.remove();
        window.dispatchEvent(new CustomEvent("quran:overlayClosed"));
        resolve(result);
      };

      dialog
        .querySelector("#mergeBtn")
        .addEventListener("click", () => cleanup("merge"));
      dialog
        .querySelector("#replaceBtn")
        .addEventListener("click", () => cleanup("replace"));
      dialog
        .querySelector("#cancelBtn")
        .addEventListener("click", () => cleanup(null));
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) cleanup(null);
      });
    });
  }

  async exportBookmarks() {
    const data = window.quranApp.exportUserData(); // nouvelle méthode dans QuranApp
    const date = new Date().toISOString().slice(2, 10);
    const fileName = `quran_backup_${date}`;
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
        () => window.quranApp.showToast("✅ تم التصدير"),
        (err) => window.quranApp.showToast("❌ " + err),
      );
    } else {
      const a = document.createElement("a");
      a.href = "data:application/json;base64," + base64;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.quranApp.showToast("✅ تم التصدير");
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

          const success = window.quranApp.importUserData(
            json,
            choice === "merge",
          );
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
  // 3.5 audio OVERLAY
  // ============================================

  renderAudioContent(overlay) {
    const contentContainer = document.getElementById("audioContent");
    if (!contentContainer) return;

    const riwayaLabel =
      window.RIWAYAT_CONFIG?.[window.quranAudioPlayer?.currentRiwaya]?.label ||
      "";

    const coordsStatus =
      window.quranAudioPlayer?.ayaCoordsLoaded === false
        ? '<div class="audio-warning">⚠️ بيانات تحديد الآيات غير متوفرة، لن يظهر التظليل</div>'
        : "";

    contentContainer.innerHTML = `
    ${coordsStatus}
    
    <!-- Section récitant avec bouton favori -->
  <div class="audio-select-row">
  <select id="reciterSelect" class="audio-select select-violet" aria-label="اختر القارئ">
    <option value="">اختر القارئ</option>
  </select>
  <button id="pinReciterBtn" class="audio-btn pin-btn reciter-pin" title="إضافة إلى المفضلين" style="font-size:1.3rem; flex-shrink:0;">📌</button>
</div>
    
    <div class="audio-select-row">
      <select id="surahSelectAudio" class="audio-select select-ok" aria-label="اختر السورة">
        <option value="">اختر السورة</option>
      </select>
      <select id="ayaSelectAudio" class="audio-select select-blue" aria-label="اختر الآية">
        <option value="">اختر الآية</option>
      </select>
      <select id="pageSelectAudio" class="audio-select select-brown" aria-label="اختر الصفحة">
        <option value="">اختر الصفحة</option>
      </select>
    </div>
    
    <div id="audioStatus" class="audio-status"></div>
    <div class="audio-progress-wrap">
      <span id="audioCurrentTime">0:00</span>
      <input type="range" id="audioProgress" class="audio-progress" value="0" min="0" max="100" step="0.1">
      <span id="audioDuration">0:00</span>
    </div>
    
    <div class="audio-controls">
      <button class="btn audio-btn speed-btn" id="overlaySpeedBtn" title="السرعة">1.0×</button>
      <button class="btn audio-btn" id="repeatBtn" title="تكرار">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="m3.512 6.19 1.492-1.492-1.297-1.297L0 7.107l3.707 3.707 1.297-1.297-1.492-1.492h17.356V12h1.835V6.19Zm16.781 6.996-1.297 1.297 1.492 1.492H3.132V12H1.297v5.81h19.191l-1.492 1.492 1.297 1.297L24 16.893Z"/></svg>
      </button>
      <button class="btn audio-btn" id="nextSurahBtn" title="السورة التالية">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="12 6 20 12 12 18"/><line x1="21" y1="6" x2="21" y2="18" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="btn audio-btn" id="nextAyahBtn" title="الآية التالية">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="13 6 21 12 13 18"/><polygon points="3 6 11 12 3 18"/></svg>
      </button>
      <button class="btn audio-btn" id="playPauseBtn" title="تشغيل">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="8 6 18 12 8 18"/></svg>
      </button>
      <button class="btn audio-btn" id="prevAyahBtn" title="الآية السابقة">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="11 6 3 12 11 18"/><polygon points="21 6 13 12 21 18"/></svg>
      </button>
      <button class="btn audio-btn" id="prevSurahBtn" title="السورة السابقة">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="12 6 4 12 12 18"/><line x1="3" y1="6" x2="3" y2="18" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="btn audio-btn" id="stopBtn" title="إيقاف">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="7.5" y="7.5" width="9" height="9"/></svg>
      </button>
    </div>
    
    <div class="audio-current-info" style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
      <div class="audio-riwaya-info">🎙️ رواية ${riwayaLabel} (عبر النت)</div>
      <div id="currentSurahDisplay" class="audio-current-display" style="flex: 1; margin: 0; background: transparent; border: none; color: inherit;"></div>
    </div>
    
    <audio id="quranAudioPlayer" preload="none" style="display:none;"></audio>
  `;

    overlay.contentGenerated = true;

    setTimeout(() => {
      if (window.quranAudioPlayer) {
        window.quranAudioPlayer._updateReciterPinButton();
      }
    }, 50);

    document.getElementById("playPauseBtn")?.addEventListener("click", () => {
      setTimeout(() => {
        if (window.quranAudioPlayer?.isPlaying && !window.quranAudioPlayer?.hasError) this.closeOverlay("audio");
      }, 100);
    });

    return overlay;
  }

  async showAudio() {
    this.closeMenu();
    const overlay = this.lazyLoadOverlay("audio");
    if (overlay?.element) {
      if (!overlay.contentGenerated) {
        this.renderAudioContent(overlay);
        await window.quranAudioPlayer.init();
      }
      this.showOverlay("audio");
      const player = window.quranAudioPlayer;
      if (player.isPlaying) {
        player._syncOverlay();
      } else {
        player.setCurrentSurahFromPage();
      }
    }
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
  // 5. SEARCH OVERLAY
  // ============================================

  async showSearch() {
    this.closeMenu();
    if (!(await window.quranApp?.loadTafsir())) return;
    const overlay = this.lazyLoadOverlay("search");
    if (!overlay?.input || !overlay?.results) return;

    this.showOverlay("search");

    if (window.tafsirManager?.setupSearchUI) {
      window.tafsirManager.setupSearchUI(
        overlay.input,
        overlay.results,
        (sura, aya) => this.goToAya(sura, aya),
      );
      overlay.input = document.getElementById("searchInput");

      if (window.tafsirManager.lastResults) {
        overlay.results.innerHTML = window.tafsirManager.lastResults;
      } else if (overlay.input.value.trim() !== "") {
        overlay.input.dispatchEvent(new Event("input"));
      }
    }

    this._setupClearButton(overlay);
    setTimeout(() => overlay.input?.focus(), 100);
  }

  _setupClearButton(overlay) {
    const clearBtn = document.getElementById("clearSearchBtn");
    if (!clearBtn) return;

    clearBtn.classList.remove("hidden");

    if (this._clearSearchHandler) {
      clearBtn.removeEventListener("click", this._clearSearchHandler);
    }

    const updateVisibility = () => {
      clearBtn.style.display = overlay.input.value ? "block" : "none";
    };

    this._clearSearchHandler = () => {
      overlay.input.value = "";
      updateVisibility();
      if (window.tafsirManager?.clearSearch) {
        window.tafsirManager.clearSearch();
      } else {
        overlay.results.innerHTML = "";
      }
      overlay.input.focus();
    };

    clearBtn.addEventListener("click", this._clearSearchHandler);
    overlay.input.addEventListener("input", updateVisibility);
    updateVisibility();
  }

  async goToAya(sura, aya) {
    if (!sura || !aya) return;
    if (!window.tafsirManager?.getAya) {
      window.quranApp?.showToast("❌ نظام البحث غير متوفر");
      return;
    }
    const ayaInfo = window.tafsirManager.getAya(sura, aya);
    if (!ayaInfo?.page) {
      window.quranApp?.showToast("❌ لم يتم العثور على الآية");
      return;
    }
    this.closeOverlay("search");
    setTimeout(() => {
      window.quranApp?.goToPage(ayaInfo.page);
      window.quranApp?.showToast(`📖 ${ayaInfo.sura} - الآية ${ayaInfo.aya_n}`);
    }, 200);
  }

  // ============================================
  // 6. TAFSIR OVERLAY
  // ============================================

  async showTafsir() {
    this.closeMenu();
    if (window.quranReader?.getCurrentPage) {
      this._tafsirSavedPage = window.quranReader.getCurrentPage();
    }
    if (!(await window.quranApp?.loadTafsir())) return;
    const overlay = this.lazyLoadOverlay("tafsir");
    if (!overlay?.content) return;

    this.showOverlay("tafsir");

    if (
      window.tafsirManager?.initTafsirUI &&
      !this.lazyLoaded.has("tafsirUI")
    ) {
      overlay.content.innerHTML = `<div class="tafsir-loading-overlay" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:10;background:inherit;">
        <div style="text-align:center;">
          <div class="spinner" style="margin-bottom:20px;"></div>
          <p>جاري تحميل التفسير...</p>
        </div>
      </div>`;

      this._tafsirInitTimeout = setTimeout(async () => {
        const suraSelect =
          overlay.suraSelect || document.getElementById("suraSelect");
        const ayaSelect =
          overlay.ayaSelect || document.getElementById("ayaSelect");
        const pageSelect =
          overlay.pageSelect || document.getElementById("pageSelect");

        if (suraSelect && ayaSelect && pageSelect) {
          await window.tafsirManager.initTafsirUI(
            suraSelect,
            ayaSelect,
            pageSelect,
            overlay.content,
            (page) => {
              this.closeOverlay("tafsir");
              setTimeout(() => window.quranApp?.goToPage(page), 200);
            },
            (sura, aya) => this.goToAya(sura, aya),
          );
          this.lazyLoaded.add("tafsirUI");
          const loadingEl = overlay.content.querySelector(
            ".tafsir-loading-overlay",
          );
          if (loadingEl) {
            loadingEl.style.opacity = "0";
            setTimeout(() => loadingEl.remove(), 300);
          }
        }
        this._tafsirInitTimeout = null;
      }, 200);
    } else if (this.lazyLoaded.has("tafsirUI") && window.tafsirManager) {
      const currentPage = window.quranApp?.getCurrentPage() || 1;
      window.tafsirManager.loadTafsirForPage(currentPage);
      setTimeout(
        () => window.tafsirManager.scrollToFirstAyaOfPage(currentPage),
        150,
      );
    }
  }

  // ============================================
  // 7. TAJWEED OVERLAY
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
  // 8. ABOUT OVERLAY
  // ============================================

  shareApp() {
    const appName = "مصحف التجويد - حفص";
    const appUrl = "https://zdig1.gitlab.io/quran/";
    const shortMessage = `📖 ${appName} - تطبيق قرآن كامل بدون إنترنت: ${appUrl}`;

    // Utiliser socialsharing si disponible (Cordova)
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
          console.error("Share error:", err);
          window.quranApp?.showToast("❌ تعذر فتح المشاركة");
        },
      );
    }
    // Utiliser Web Share API si disponible
    else if (navigator.share) {
      navigator
        .share({
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
    }
    // Fallback : copier le lien dans le presse-papier
    else {
      navigator.clipboard
        .writeText(appUrl)
        .then(() => {
          window.quranApp?.showToast("📋 تم نسخ رابط التطبيق");
        })
        .catch(() => {
          // Dernier recours : ouvrir une boîte de dialogue avec le lien
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
    overlay.content.innerHTML = `<div class="about-content">
      <p class="about-title">
        <strong>مصحف التجويد - حفص</strong>
        <span class="about-version">v1.0.8</span>
      </p>
      <p class="about-desc">
        تطبيق لقراءة القرآن الكريم كاملاً بجودة عالية ودون اتصال بالإنترنت، مطابق للمصحف الورقي المعتمد :
        <strong>مصحف التجويد الملون برواية حفص عن الإمام عاصم الكوفي</strong> من طريق الشاطبية (الصادر عن دار المعرفة)
      </p>
      
    <div class="contact-grid-container">
      <button id="aboutBackupBtn" class="contact-box-item contact-green">
        <span>💾 نسخ احتياطي</span>
      </button>
      <button id="shareAppBtn" class="contact-box-item contact-blue">
        <span>🔗 شارك التطبيق</span>
      </button>
      <a href="https://zdig1.gitlab.io/quran/" target="_blank" class="contact-box-item contact-brown">
        <span>🌐 زيارة الموقع</span>
      </a>
      <a href="mailto:zdig1.0@gmail.com?subject=quran" class="contact-box-item contact-violet">
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
      <p class="about-footer">
        جميع الحقوق محفوظة © 2026<br>
        GDZ 🍉
        </p>
    </div>`;

    const shareBtn = document.getElementById("shareAppBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", () => this.shareApp());
    }
    const backupBtn = document.getElementById("aboutBackupBtn");
    if (backupBtn) {
      backupBtn.addEventListener("click", () => {
        this.closeOverlay("about");
        this.showBackupDialog();
      });
    }

  }

  // ============================================
  // 9 PAGE INPUT OVERLAY
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
  // 10. SURAH INFO OVERLAY
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
          if (this.currentSurahInfoId < 114) {
            this._updateSurahInfoUI(this.currentSurahInfoId + 1);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (this.currentSurahInfoId > 1) {
            this._updateSurahInfoUI(this.currentSurahInfoId - 1);
          }
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
      'var(--primary)',        // vert
      'var(--color-blue)',     // bleu
      'var(--color-brown)',    // marron
      'var(--color-violet)',   // violet
      'var(--color-gray)',     // gris
      '#ff9800',             // orange
      'var(--color-red)',      // rouge
      '#009688'              // turquoise
    ];
    return colors[index % colors.length];
  }

  formatSurahInfo(text) {
    const lines = text.split(/\r?\n/);
    const title = lines[0]?.trim() || "";
    const remaining = lines.slice(1);

    let html = '';
    if (title) {
      // Conteneur flex pour centrer le titre
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
  //  GESTION GÉNÉRALE DES OVERLAYS
  // ============================================

  updateThemeButtonText() {
    const textSpan = this.elements.themeBtn?.querySelector(".menu-text");
    if (textSpan) {
      textSpan.textContent = document.body.classList.contains("night-mode")
        ? "الوضع النهاري"
        : "الوضع الليلي";
    }
  }

  showBackupDialog() {
    this.closeMenu();
    const overlay = this.lazyLoadOverlay("backup");
    if (!overlay?.element) return;

    this.showOverlay("backup");

    const exportBtn = document.getElementById("backupExportBtn");
    const importBtn = document.getElementById("backupImportBtn");

    // Nettoyer anciens listeners
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
      new CustomEvent("quran:overlayOpened", { detail: { overlay: name } }),
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
      new CustomEvent("quran:overlayClosed", { detail: { overlay: name } }),
    );
  }

  closeCurrentOverlay() {
    if (this.currentOverlay) this.closeOverlay(this.currentOverlay);
  }
}

// ============================================
// INITIALISATION
// ============================================

window.overlayManager = new OverlayManager();
if (typeof window !== "undefined") window.OverlayManager = OverlayManager;
