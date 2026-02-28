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
    this.escapeHtml = this.escapeHtml.bind(this);
  }

  init(e = {}) {
    Object.assign(this.config, e);
    this.cacheElements();
    this.setupEventListeners();
    this.isInitialized = true;
    return this;
  }
  escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  cacheElements() {
    this.elements = {
      menuOverlay: document.getElementById("menuOverlay"),
      closeMenuBtn: document.getElementById("closeMenuBtn"),
      menuBtn: document.getElementById("menuBtn"),
      surahsBtn: document.getElementById("surahsBtn"),
      juzHizbBtn: document.getElementById("juzHizbBtn"),
      bookmarksBtn: document.getElementById("bookmarksBtn"),
      khatmBtn: document.getElementById("khatmBtn"),
      searchBtn: document.getElementById("searchBtn"),
      tafsirBtn: document.getElementById("tafsirBtn"),
      tajweedBtn: document.getElementById("tajweedBtn"),
      aboutBtn: document.getElementById("aboutBtn"),
      themeBtn: document.getElementById("themeBtn"),
    };
  }

  // ============================================
  // LAZY LOADING
  // ============================================
  lazyLoadOverlay(name) {
    if (this.overlays[name]) {
      this.lazyLoaded.add(name);
      return this.overlays[name];
    }
    switch (name) {
      case "surahs":
        return this.cacheSurahsOverlay();
      case "juzHizb":
        return this.cacheJuzHizbOverlay();
      case "bookmarks":
        return this.cacheBookmarksOverlay();
      case "khatm":
        return this.cacheKhatmOverlay();
      case "search":
        return this.cacheSearchOverlay();
      case "tafsir":
        return this.cacheTafsirOverlay();
      case "tajweed":
        return this.cacheTajweedOverlay();
      case "about":
        return this.cacheAboutOverlay();
      default:
        return null;
    }
  }

  cacheSurahsOverlay() {
    this.overlays.surahs = {
      element: document.getElementById("surahsOverlay"),
      closeBtn: document.getElementById("closeSurahsBtn"),
      content: document.getElementById("surahsList"),
    };
    this.lazyLoaded.add("surahs");
    this.setupOverlayEventListeners("surahs");
    return this.overlays.surahs;
  }

  cacheJuzHizbOverlay() {
    this.overlays.juzHizb = {
      element: document.getElementById("juzHizbOverlay"),
      closeBtn: document.getElementById("closeJuzHizbBtn"),
      content: document.getElementById("juzHizbList"),
    };
    this.lazyLoaded.add("juzHizb");
    this.setupOverlayEventListeners("juzHizb");
    return this.overlays.juzHizb;
  }

  cacheBookmarksOverlay() {
    this.overlays.bookmarks = {
      element:  document.getElementById("bookmarksOverlay"),
      closeBtn: document.getElementById("closeBookmarksBtn"),
      content:  document.getElementById("bookmarksList"),
    };
    this.lazyLoaded.add("bookmarks");
    this.setupOverlayEventListeners("bookmarks");
    return this.overlays.bookmarks;
  }

  cacheKhatmOverlay() {
    this.overlays.khatm = {
      element: document.getElementById("khatmOverlay"),
      closeBtn: document.getElementById("closeKhatmBtn"),
      content: document.getElementById("khatmContent"),
    };
    this.lazyLoaded.add("khatm");
    this.setupOverlayEventListeners("khatm");
    return this.overlays.khatm;
  }

  cacheSearchOverlay() {
    this.overlays.search = {
      element: document.getElementById("searchOverlay"),
      closeBtn: document.getElementById("closeSearchBtn"),
      input: document.getElementById("searchInput"),
      results: document.getElementById("searchResults"),
    };
    this.lazyLoaded.add("search");
    this.setupOverlayEventListeners("search");
    return this.overlays.search;
  }

  cacheTafsirOverlay() {
    this.overlays.tafsir = {
      element: document.getElementById("tafsirOverlay"),
      closeBtn: document.getElementById("closeTafsirBtn"),
      content: document.getElementById("tafsirContent"),
      suraSelect: document.getElementById("suraSelect"),
      ayaSelect: document.getElementById("ayaSelect"),
      pageSelect: document.getElementById("pageSelect"),
    };
    this.lazyLoaded.add("tafsir");
    this.setupOverlayEventListeners("tafsir");
    return this.overlays.tafsir;
  }

  cacheTajweedOverlay() {
    this.overlays.tajweed = {
      element: document.getElementById("tajweedOverlay"),
      closeBtn: document.getElementById("closeTajweedBtn"),
      content: document.getElementById("tajweedRulesContent"),
    };
    this.lazyLoaded.add("tajweed");
    this.setupOverlayEventListeners("tajweed");
    return this.overlays.tajweed;
  }

  cacheAboutOverlay() {
    this.overlays.about = {
      element: document.getElementById("aboutOverlay"),
      closeBtn: document.getElementById("closeAboutBtn"),
      content: document.getElementById("aboutContent"),
    };
    this.lazyLoaded.add("about");
    this.setupOverlayEventListeners("about");
    return this.overlays.about;
  }

  // ============================================
  // SETUP DES ÉCOUTEURS
  // ============================================
  setupEventListeners() {
    if (this.elements.menuOverlay) {
      const handleMenuClick = (e) => {
        if (e.target === this.elements.menuOverlay) this.closeMenu();
      };
      this.elements.menuOverlay.addEventListener("click", handleMenuClick);
      this.eventListeners.push({
        element: this.elements.menuOverlay,
        type: "click",
        handler: handleMenuClick,
      });
    }

    if (this.elements.menuBtn) {
      const handleMenuBtn = () => this.showMenu();
      this.elements.menuBtn.addEventListener("click", handleMenuBtn);
      this.eventListeners.push({
        element: this.elements.menuBtn,
        type: "click",
        handler: handleMenuBtn,
      });
    }

    if (this.elements.closeMenuBtn) {
      const handleCloseMenu = () => this.closeMenu();
      this.elements.closeMenuBtn.addEventListener("click", handleCloseMenu);
      this.eventListeners.push({
        element: this.elements.closeMenuBtn,
        type: "click",
        handler: handleCloseMenu,
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
      { btn: this.elements.khatmBtn, action: () => this.showKhatm() },
      { btn: this.elements.searchBtn, action: () => this.showSearch() },
      { btn: this.elements.tafsirBtn, action: () => this.showTafsir() },
      { btn: this.elements.tajweedBtn, action: () => this.showTajweed() },
      { btn: this.elements.aboutBtn, action: () => this.showAbout() },
      {
        btn: this.elements.themeBtn,
        action: () => {
          this.closeMenu();
          setTimeout(() => window.quranApp?.toggleTheme(), 50);
        },
      },
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
    if (this.elements.menuOverlay) {
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
    if (overlay && overlay.element && overlay.content) {
      this.renderSurahsList();
      this.showOverlay("surahs");
    }
  }

  renderSurahsList() {
    const overlay = this.overlays.surahs;
    if (!overlay?.content || !window.quranCalculator) return;
    overlay.content.innerHTML = "";

    const bookmarks = window.quranApp ? window.quranApp.getBookmarks() : [];
    const surahs = window.quranCalculator.getAllSurahs();

    // === Construire la map des juz qui commencent dans chaque sourate ===
    const juzList = window.quranCalculator.data?.juz_index || [];
    const surahJuzMap = new Map(); // clé: id de sourate, valeur: tableau des numéros de juz
    juzList.forEach((juz) => {
      const page = juz.page;
      const surah = surahs.find(
        (s) => s.page_start <= page && page <= s.page_end,
      );
      if (surah) {
        if (!surahJuzMap.has(surah.id)) {
          surahJuzMap.set(surah.id, new Set());
        }
        surahJuzMap.get(surah.id).add(juz.juz);
      }
    });

    // === Calcul des sourates bookmarkées ===
    const bookmarkedSurahIds = new Set();
    bookmarks.forEach((bookmark) => {
      const surahForPage = window.quranCalculator.getFirstSurahForPage(
        bookmark.page,
      );
      if (surahForPage) {
        bookmarkedSurahIds.add(surahForPage.id);
      }
    });

    const pinnedIds = window.quranApp ? window.quranApp.getPinnedSurahs() : [];
    const pinnedSurahs = surahs.filter((s) => pinnedIds.includes(s.id));
    const allSurahs = surahs;

    const createSurahItem = (surah, isPinned) => {
      const hasBookmark = bookmarkedSurahIds.has(surah.id);
      const revelationIcon = surah.type === "مدنية" ? "🕌" : "🕋";
      const juzStarts = surahJuzMap.has(surah.id)
        ? [Array.from(surahJuzMap.get(surah.id))[0]]
        : [];

      const item = document.createElement("div");
      item.className = "item-container item-surah";
      item.setAttribute("data-surah-id", surah.id);

      const line1 = document.createElement("div");
      line1.className = "item-line-1";
      line1.innerHTML = `
    <div class="item-right">
        <button class="pin-btn ${isPinned ? "pinned" : ""}" data-sura-id="${surah.id}">${isPinned ? "⭐" : "📌"}</button>
        <span class="item-badge">${surah.id}</span>
        <span class="item-title">${surah.name}</span>
    </div>
    <div class="item-left">
     <span class="item-left-icon-col" style="text-align: center; min-width: 2rem;">
            ${hasBookmark ? '<span class="item-icon item-bookmark-indicator">🔖</span>' : ""}
        </span>
            <!-- Juz badge ici, aligné avec sajda -->
        <span style="color: #1976d2; font-weight: bold; font-size: 0.8rem; display: inline-flex; align-items: center; min-width: 1rem;">
            ${juzStarts.map((j) => `ج ${j}`).join(" ")}
        </span>
        <span class="item-left-tag-col" style="min-width: 4rem; text-align: left;">
            <span class="item-tag">ص ${surah.page_start}</span>
        </span>
    </div>
  `;

      const line2 = document.createElement("div");
      line2.className = "item-line-2";
      line2.innerHTML = `
    <div class="item-right" style="display: flex; align-items: center; gap: 0.5rem;">
        <span class="item-subtitle" style="display: flex; align-items: center; gap: 0.25rem;">
            <span>النزول:</span>
            <span class="order-value">${surah.order}</span>
        </span>   
        <span class="item-revelation-icon" style="display: inline-flex; align-items: center;">${revelationIcon}</span>
    </div>
    
    <div class="item-left" style="display: flex; align-items: center;">
        <span class="item-left-icon-col" style="display: inline-flex; align-items: center; min-width: 1rem;">
            ${window.quranCalculator.hasSajdaInSurah(surah.id) ? '<span class="item-icon item-sajda-icon">۩</span>' : ""}
        </span>
        <span class="item-left-tag-col" style="min-width: 4rem; text-align: left;">
                    <span class="item-tertiary">(${surah.verses}) آية</span>
        </span>
    </div>
  `;

      item.appendChild(line1);
      item.appendChild(line2);

      item.addEventListener("click", (e) => {
        if (!e.target.classList.contains("pin-btn")) {
          window.quranApp?.goToPage(surah.page_start);
          this.closeOverlay("surahs");
        }
      });

      const pinBtn = item.querySelector(".pin-btn");
      pinBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (window.quranApp) {
          const added = window.quranApp.togglePinSurah(surah.id);
          pinBtn.classList.toggle("pinned", added);
          pinBtn.textContent = added ? "⭐" : "📌";
          this.renderSurahsList();
        }
      });

      return item;
    };

    // Section des sourates épinglées
    if (pinnedSurahs.length > 0) {
      const pinnedSection = document.createElement("div");
      pinnedSection.className = "surah-section";
      pinnedSection.innerHTML =
        '<h3 class="section-title">⭐ السور المفضلة</h3>';
      pinnedSurahs.forEach((surah) =>
        pinnedSection.appendChild(createSurahItem(surah, true)),
      );
      overlay.content.appendChild(pinnedSection);
    }

    // Section de toutes les sourates
    const allSection = document.createElement("div");
    allSection.className = "surah-section";
    allSection.innerHTML = '<h3 class="section-title">📖 جميع السور</h3>';
    allSurahs.forEach((surah) =>
      allSection.appendChild(
        createSurahItem(surah, pinnedIds.includes(surah.id)),
      ),
    );
    overlay.content.appendChild(allSection);

    // Scroll vers la sourate courante
    const currentPage =
      window.quranApp?.getCurrentPage?.() ||
      window.quranReader?.getCurrentPage?.() ||
      1;
    const currentSurah =
      window.quranCalculator?.getFirstSurahForPage(currentPage);
    if (currentSurah && currentSurah.id) {
      setTimeout(() => {
        const currentElement = overlay.content.querySelector(
          `.item-container[data-surah-id="${currentSurah.id}"]`,
        );
        if (currentElement) {
          currentElement.classList.add("current-item");
          currentElement.scrollIntoView({ block: "center", behavior: "auto" });
        }
      }, 50);
    }
  }
  // ============================================
  // 2. JUZ/HIZB OVERLAY
  // ============================================
  showJuzHizb() {
    this.closeMenu();
    const overlay = this.lazyLoadOverlay("juzHizb");
    if (overlay && overlay.element && overlay.content) {
      this.renderJuzHizbList();
      this.showOverlay("juzHizb");
    }
  }

renderJuzHizbList() {
    const overlay = this.overlays.juzHizb;
    if (!overlay?.content || !window.quranCalculator) return;
    overlay.content.innerHTML = "";

    const hizbs = window.quranCalculator.getHizbWithPageRange();
    const bookmarks = window.quranApp ? window.quranApp.getBookmarks() : [];

    const allSurahs = window.quranCalculator.getAllSurahs();
    const suraNameToId = Object.fromEntries(
      allSurahs.map((s) => [s.name, s.id]),
    );

    hizbs.forEach((hizb) => {
      const startPage = hizb.page_start;
      const endPage = hizb.page_end;
      const hasBookmarkInRange = bookmarks.some(
        (b) => b.page >= startPage && b.page <= endPage,
      );
      const isNewJuz = parseInt(hizb.hizb) % 2 !== 0;
      const juzNum = Math.ceil(parseInt(hizb.hizb) / 2);
      const suraId = suraNameToId[hizb.sura] || "?";

      const item = document.createElement("div");
      item.className = "item-container item-juzhizb";
      item.setAttribute("data-hizb", hizb.hizb);

      const line1 = document.createElement("div");
      line1.className = "item-line-1";
      line1.innerHTML = `
        <div class="item-right juzhizb-grid">
          ${
            isNewJuz
              ? '<span class="item-badge juzhizb-grid-col1">ج ' +
                juzNum +
                "</span>"
              : '<span class="juzhizb-grid-col1"></span>'
          }
          <span class="item-title juzhizb-grid-col2">الحزب ${hizb.hizb}</span>
        </div>
        <div class="item-left">
          <span class="item-left-icon-col">
            ${
              hasBookmarkInRange
                ? '<span class="item-icon item-bookmark-indicator">🔖</span>'
                : ""
            }
          </span>
          <span class="item-left-tag-col">
            <span class="item-tag">ص ${hizb.page_start}</span>
          </span>
        </div>
      `;

      const line2 = document.createElement("div");
      line2.className = "item-line-2";

      let ayaText = hizb.aya_txt || "";
      ayaText = ayaText.replace(/\s*\(\d+\)\s*$/, "").trim();

      const prefix = `${suraId}. ${hizb.sura} - آية (${hizb.aya})`;

      line2.innerHTML = `
        <div class="item-right juzhizb-grid">
          <span class="juzhizb-grid-col1"></span>
          <span class="item-subtitle juzhizb-grid-col2">
            <span class="aya-text">${ayaText}</span>
            <span class="aya-prefix">${prefix}</span>
          </span>
        </div>
      `;

      item.appendChild(line1);
      item.appendChild(line2);

      item.addEventListener("click", () => {
        window.quranApp?.goToPage(hizb.page_start);
        this.closeOverlay("juzHizb");
      });
      overlay.content.appendChild(item);
    });

    const currentPage =
      window.quranApp?.getCurrentPage?.() ||
      window.quranReader?.getCurrentPage?.() ||
      1;
    const currentHizbObj = window.quranCalculator?.getHizbForPage(currentPage);
    if (currentHizbObj && currentHizbObj.hizb) {
      setTimeout(() => {
        const currentElement = overlay.content.querySelector(
          `.item-container[data-hizb="${currentHizbObj.hizb}"]`,
        );
        if (currentElement) {
          currentElement.classList.add("current-item");
          currentElement.scrollIntoView({ block: "center", behavior: "auto" });
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
      p.textContent = this.escapeHtml(message);
      dialog.appendChild(p);

      const buttonDiv = document.createElement("div");
      buttonDiv.className = "confirm-buttons";

      const okBtn = document.createElement("button");
      okBtn.className = "confirm-btn ok";
      okBtn.textContent = "نعم";
      okBtn.id = "confirm-ok";

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "confirm-btn cancel";
      cancelBtn.textContent = "لا";
      cancelBtn.id = "confirm-cancel";

      buttonDiv.appendChild(okBtn);
      buttonDiv.appendChild(cancelBtn);
      dialog.appendChild(buttonDiv);
      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);

      const cleanup = (result) => {
        backdrop.remove();
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
    if (overlay && overlay.element) {
      this.refreshBookmarksDisplay();
      this.showOverlay("bookmarks");
    }
  }

  refreshBookmarksDisplay() {
    const overlay = this.overlays.bookmarks;
    if (!overlay?.content) return;

    const bookmarks = window.quranApp ? window.quranApp.getBookmarks() : [];
    const currentPage =
      window.quranApp?.getCurrentPage?.() ||
      window.quranReader?.getCurrentPage?.() ||
      1;

    overlay.content.innerHTML = "";

    const container = document.createElement("div");
    container.className = "bookmarks-overlay-content";

    const listContainer = document.createElement("div");
    listContainer.className = "bookmarks-list";

    const formContainer = document.createElement("div");
    formContainer.className = "bookmarks-add-form";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "search-input";
    input.placeholder = "اسم العلامة";
    input.value = `صفحة ${currentPage}`;

    const addBtn = document.createElement("button");
    addBtn.className = "btn btn-add";
    addBtn.textContent = "إضافة";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-cancel";
    cancelBtn.textContent = "لا";
    cancelBtn.style.display = "none";

    formContainer.appendChild(input);
    formContainer.appendChild(addBtn);
    formContainer.appendChild(cancelBtn);

    this.bookmarkFormInput = input;
    this.bookmarkFormButton = addBtn;
    this.bookmarkFormCancel = cancelBtn;

    if (bookmarks.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.className = "empty-message";
      emptyMsg.textContent = "لا توجد علامات مرجعية";
      listContainer.appendChild(emptyMsg);
    } else {
      bookmarks.forEach((bookmark) => {
        const item = this.createBookmarkElement(bookmark);
        listContainer.appendChild(item);
      });
    }

    container.appendChild(listContainer);
    container.appendChild(formContainer);
    overlay.content.appendChild(container);

    this.setupBookmarkFormHandlers(currentPage);
  }

  setupBookmarkFormHandlers(currentPage) {
    if (!this.bookmarkFormInput || !this.bookmarkFormButton) return;

    const newButton = this.bookmarkFormButton.cloneNode(true);
    this.bookmarkFormButton.parentNode.replaceChild(
      newButton,
      this.bookmarkFormButton,
    );
    this.bookmarkFormButton = newButton;

    const newCancel = this.bookmarkFormCancel.cloneNode(true);
    this.bookmarkFormCancel.parentNode.replaceChild(
      newCancel,
      this.bookmarkFormCancel,
    );
    this.bookmarkFormCancel = newCancel;

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
        const newBookmark = {
          page: currentPage,
          name: name,
          date: new Date().toISOString(),
          id: `bookmark_${currentPage}_${Date.now()}`,
        };
        window.quranApp.addBookmark(newBookmark);
        window.quranApp.showToast("✅ تمت إضافة العلامة");
        this.bookmarkFormInput.value = `صفحة ${currentPage}`;
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
    this.bookmarkFormCancel.style.display = "inline-block";

    document.querySelectorAll(".item-bookmark").forEach((item) => {
      if (item.dataset.bookmarkId === bookmark.id) {
        item.classList.add("editing-bookmark");
      } else {
        item.classList.remove("editing-bookmark");
      }
    });
  }

  resetBookmarkForm() {
    this.editingBookmarkId = null;
    const currentPage =
      window.quranApp?.getCurrentPage?.() ||
      window.quranReader?.getCurrentPage?.() ||
      1;
    this.bookmarkFormInput.value = `صفحة ${currentPage}`;

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
    item.innerHTML = `
      <div class="item-line-1">
        <div class="item-right">
          <button class="icon-btn icon-btn--edit" data-id="${bookmark.id}" title="تعديل الاسم">✏️</button>
          <span class="item-title bookmark-name" data-id="${bookmark.id}">${this.escapeHtml(bookmark.name)}</span>
        </div>
        <div class="item-left">
          <span class="item-tag">ص ${bookmark.page}</span>
          <button class="icon-btn icon-btn--recycle" data-id="${bookmark.id}" title="استبدال الصفحة بالصفحة الحالية">♻️</button>
          <button class="icon-btn icon-btn--remove" data-id="${bookmark.id}" title="حذف">🗑️</button>
        </div>
      </div>
    `;
    this.attachBookmarkEvents(item, bookmark);
  }

  attachBookmarkEvents(item, bookmark) {
    item.querySelector(".icon-btn--edit")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.startEditingBookmark(bookmark);
    });

    item
      .querySelector(".icon-btn--recycle")
      ?.addEventListener("click", async (e) => {
        e.stopPropagation();
        const currentPage =
          window.quranApp?.getCurrentPage?.() ||
          window.quranReader?.getCurrentPage?.() ||
          1;
        const confirmed = await this.showConfirm(
          `هل تريد وضع العلامة (${bookmark.name}) بهاته الصفحة ؟`,
        );
        if (confirmed) {
          if (window.quranApp?.replaceBookmarkPage(bookmark.id, currentPage)) {
            window.quranApp.showToast(`♻️ تم استبدال الصفحة ب ${currentPage}`);
            this.refreshBookmarksDisplay();
          }
        }
      });

    item
      .querySelector(".icon-btn--remove")
      ?.addEventListener("click", async (e) => {
        e.stopPropagation();
        const confirmed = await this.showConfirm(
          `هل تريد حذف العلامة (${bookmark.name}) ؟`,
        );
        if (confirmed) {
          if (window.quranApp?.removeBookmarkById(bookmark.id)) {
            window.quranApp.showToast("✖️ تمت إزالة العلامة");
            this.refreshBookmarksDisplay();
          }
        }
      });

    item.addEventListener("click", (e) => {
      if (
        e.target === item ||
        e.target.classList.contains("bookmark-name") ||
        e.target.classList.contains("item-tag")
      ) {
        window.quranApp?.goToPage(bookmark.page);
        this.closeOverlay("bookmarks");
      }
    });
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
    if (!overlay?.content) return;
    if (overlay.content.children.length > 0) return;
    overlay.content.innerHTML = `
      <div class="khatm-page">
        <img src="media/605.webp" alt="دعاء ختم القرآن - الصفحة 605" loading="lazy">
        <img src="media/606.webp" alt="دعاء ختم القرآن - الصفحة 606" loading="lazy">
      </div>
    `;
  }

  // ============================================
  // 5. SEARCH OVERLAY
  // ============================================
  async showSearch() {
    this.closeMenu();
    if (!(await window.quranApp?.loadTafsir())) return;
    const overlay = this.lazyLoadOverlay("search");
    if (overlay && overlay.input && overlay.results) {
      this.showOverlay("search");

      // 1. Initialiser la recherche (cela clone l'input)
      if (window.tafsirManager?.setupSearchUI) {
        window.tafsirManager.setupSearchUI(
          overlay.input,
          overlay.results,
          (sura, aya) => this.goToAya(sura, aya),
        );

        // 🔁 Mettre à jour la référence de l'input (car il a été cloné)
        overlay.input = document.getElementById("searchInput");

        // Restaurer les anciens résultats
        if (window.tafsirManager.lastResults) {
          overlay.results.innerHTML = window.tafsirManager.lastResults;
        } else if (overlay.input.value.trim() !== "") {
          overlay.input.dispatchEvent(new Event("input"));
        }
      }

      // 2. Gestion du bouton d'effacement
      const setupClearButton = () => {
        const clearBtn = document.getElementById("clearSearchBtn");
        if (!clearBtn) return;

        // Fonction de mise à jour de la visibilité
        const updateClearButton = () => {
          const currentBtn = document.getElementById("clearSearchBtn");
          if (currentBtn) {
            currentBtn.style.display = overlay.input.value ? "block" : "none";
          }
        };

        // Écouter les changements de l'input
        overlay.input.addEventListener("input", updateClearButton);

        // Cloner le bouton pour éviter les doublons d'écouteurs
        const newClearBtn = clearBtn.cloneNode(true);
        clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
        const finalClearBtn = document.getElementById("clearSearchBtn");

        finalClearBtn.addEventListener("click", () => {
          overlay.input.value = "";
          updateClearButton();
          if (window.tafsirManager?.clearSearch) {
            window.tafsirManager.clearSearch();
          } else {
            overlay.results.innerHTML = "";
          }
          overlay.input.focus();
        });

        // Initialiser l'état
        updateClearButton();
      };

      setupClearButton();

      setTimeout(() => overlay.input?.focus(), 100);
    }
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
    if (overlay && overlay.content) {
      overlay.content.innerHTML = `
        <div class="tafsir-loading-overlay">
          <div style="text-align: center;">
            <div class="spinner" style="margin-bottom: 20px;"></div>
            <p>جاري تحميل التفسير...</p>
          </div>
        </div>
      `;
      this.showOverlay("tafsir");
      this._tafsirInitTimeout = setTimeout(async () => {
        if (window.tafsirManager?.initTafsirUI) {
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
            const loadingOverlay = overlay.content.querySelector(
              ".tafsir-loading-overlay",
            );
            if (loadingOverlay) {
              loadingOverlay.style.opacity = "0";
              setTimeout(() => loadingOverlay.remove(), 300);
            }
          }
        }
        this._tafsirInitTimeout = null;
      }, 200);
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
    overlay.content.innerHTML = `
      <div class="tajweed-text">
        <div class="tajweed-image">
          <img src="media/000.webp" alt="قواعد التجويد الملونة" loading="lazy">
        </div>
        
        <p><span style="color: #ff0000; font-weight: bold; margin-right: 5px;">أولاً – اللون الأحمر (بتدرّجاته):</span></p>
        <p>يرمز للمدود بأزمنتها المختلفة حسب تدرّج اللون.</p>
        <ul style="margin-bottom: 15px;">
          <li style="margin-bottom: 10px;"><span style="color: #993300; font-weight: bold;">اللون الأحمر الغامق</span>، يرمز للمد اللازم ويمد ست حركات، ويشمل المد الكَلمي (بنوعيه المثقّل والمخفّف) والمد الحرفي (بنوعيه المثقّل والمخفّف).</li>
          <li style="margin-bottom: 10px;"><span style="color: #ff0000; font-weight: bold;">اللون الأحمر القاني:</span> يرمز للمد الواجب ويُمدّ خمس حركات ويشمل المد المتّصل والمد المنفصل والصلة الكبرى.</li>
          <li style="margin-bottom: 10px;"><span style="color: #ff6600; font-weight: bold;">اللون البرتقالي:</span> يرمز للمد الجائز، ويمد حركتين أو أربع أو ست حركات في حال الوقف على رؤوس الآي كما رسمت في المصاحف، ويشمل هذا المد الجائز كلاً من المد العارض للسكون، ومد اللين.</li>
          <li style="margin-bottom: 10px;"><span style="color: #ffcc00; font-weight: bold;">اللون الكمّوني:</span> يرمز للمد الطبيعي وهو حركتان فقط سواء للألف المحذوفة من الرسم العثماني أو للصلة الصغرى.</li>
        </ul>
        <p><strong><span style="color: #008000; margin-right: 5px;">ثانياً – اللون الأخضر:</span></strong></p>
        <p>يرمز لموقع الغنّة وزمنها حركتان، أما تمييزها (مرقّقة أو مفخّمة والنطق بها بشكل عام، فهذا لا بدّ من الرجوع به إلى التلقّي والمشافهة)، وقد تكون لغنّة الإخفاء، أو الإخفاء الشفوي، أو للنون المشدّدة أو الميم المشدّدة، وهي تشكّل مع اللون الرمادي حكم الإدغام بغنّة وحكم الإقلاب .</p>
        <p><strong><span style="color: #3366ff; margin-right: 5px;">ثالثاً – اللون الأزرق:</span></strong></p>
        <ul style="margin-bottom: 15px;">
          <li style="margin-bottom: 10px;"><span style="color: #000080; font-weight: bold;">الأزرق الغامق:</span> لوّنت به الراء المفخّمة فقط دون التعرّض لحروف الاستعلاء ذات المراتب المختلفة للتفخيم دفعاً للتشويش عن القارئ.</li>
          <li style="margin-bottom: 10px;"><span style="color: #3399ff; font-weight: bold;">الأزرق السماوي:</span> بالنسبة لحروف القلقلة الصغرى فقد لوّنت مع إشارة السكون التي عليها، أما بالنسبة للقلقلة الكبرى فقد لونت عند الوقف عليها في رؤوس الآي (دون تلوين الحركة).</li>
        </ul>
        <p><span style="color: #808080; font-weight: bold; margin-right: 5px;">رابعاً - اللون الرمادي:</span></p>
        <p>لما يُكتب ولا يُلفظ من الحروف، كحالة اللام الشمسية لتمييزها عن اللام القمرية، وألف التفريق، والمرسوم خلاف اللفظ، وهمزة الوصل داخل الكلمة، وكرسي الألف المحذوفة (الخنجرية)، والإدغام المتجانس، والإدغام المتقارب، وكذلك النون والتنوين الخاضعتان لحكم الإقلاب (بمساعدة اللون الأخضر لحرف الميم الصغيرة الموجودة فوق حرف النون أو في مكان التنوين، وكذلك النون والتنوين الخاضعتان لحكم الإدغام بغُنّة (بمساعدة اللون الأخضر للحرف المدغم فيه ـ لأنّ الغنّة عليه).</p>
     
      </div>
    `;
  }

  // ============================================
  // 8. ABOUT OVERLAY
  // ============================================
  showAbout() {
    this.closeMenu();
    const overlay = this.lazyLoadOverlay("about");
    if (overlay && overlay.content) {
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
          <strong>مصحف التجويد – حفص</strong>
          <span class="about-version">v1.0.5</span>
        </p>
        <p class="about-desc">
          تطبيق لقراءة القرآن الكريم كاملاً بجودة عالية ودون اتصال بالإنترنت، مطابق للمصحف الورقي المعتمد : 
          <strong>مصحف التجويد الملون برواية حفص عن عاصم الكوفي</strong> من طريق عمرو بن الصباح (الصادر عن دار المعرفة)
        </p>
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
          <a href="https://zdig1.gitlab.io/quran/" target="_blank" rel="noopener noreferrer"><u>GDZ</u></a> 🍉
        </p>
      </div>
    `;
  }

  // ============================================
  // GESTION GÉNÉRALE DES OVERLAYS
  // ============================================
  updateThemeButtonText() {
    const themeBtn = this.elements.themeBtn;
    if (!themeBtn) return;
    const isNight = document.body.classList.contains("night-mode");
    const textSpan = themeBtn.querySelector(".menu-text");
    if (textSpan) {
      textSpan.textContent = isNight ? "الوضع النهاري" : "الوضع الليلي";
    }
  }

  showOverlay(name) {
    if (this.currentOverlay && this.currentOverlay !== name)
      this.closeOverlay(this.currentOverlay);
    const overlay = this.overlays[name];
    if (overlay && overlay.element) {
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
  }

  closeOverlay(name) {
    const overlay = this.overlays[name];
    if (overlay && overlay.element) {
      overlay.element.classList.remove("show");
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
  }

  closeCurrentOverlay() {
    if (this.currentOverlay) this.closeOverlay(this.currentOverlay);
  }
}
// Export global
window.overlayManager = new OverlayManager();
if (typeof window !== "undefined") window.OverlayManager = OverlayManager;
