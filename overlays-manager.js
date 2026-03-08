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
  }

  init(config = {}) {
    Object.assign(this.config, config);
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

  getCurrentPage() {
    return window.quranApp?.getCurrentPage?.() || window.quranReader?.getCurrentPage?.() || 1;
  }

  // ============================================
  // CACHE DES ÉLÉMENTS
  // ============================================

  cacheElements() {
    this.elements = {
      menuOverlay:  document.getElementById("menuOverlay"),
      closeMenuBtn: document.getElementById("closeMenuBtn"),
      menuBtn:      document.getElementById("menuBtn"),
      surahsBtn:    document.getElementById("surahsBtn"),
      juzHizbBtn:   document.getElementById("juzHizbBtn"),
      bookmarksBtn: document.getElementById("bookmarksBtn"),
      khatmBtn:     document.getElementById("khatmBtn"),
      searchBtn:    document.getElementById("searchBtn"),
      tafsirBtn:    document.getElementById("tafsirBtn"),
      tajweedBtn:   document.getElementById("tajweedBtn"),
      aboutBtn:     document.getElementById("aboutBtn"),
      themeBtn:     document.getElementById("themeBtn"),
    };
  }

  // ============================================
  // LAZY LOADING
  // ============================================

  _overlayConfig = {
    surahs:    { element: "surahsOverlay",    closeBtn: "closeSurahsBtn",    content: "surahsList" },
    juzHizb:   { element: "juzHizbOverlay",   closeBtn: "closeJuzHizbBtn",   content: "juzHizbList" },
    bookmarks: { element: "bookmarksOverlay", closeBtn: "closeBookmarksBtn", content: "bookmarksList" },
    khatm:     { element: "khatmOverlay",     closeBtn: "closeKhatmBtn",     content: "khatmContent" },
    search:    { element: "searchOverlay",    closeBtn: "closeSearchBtn",    input: "searchInput", results: "searchResults" },
    tafsir:    { element: "tafsirOverlay",    closeBtn: "closeTafsirBtn",    content: "tafsirContent", suraSelect: "suraSelect", ayaSelect: "ayaSelect", pageSelect: "pageSelect" },
    tajweed:   { element: "tajweedOverlay",   closeBtn: "closeTajweedBtn",   content: "tajweedRulesContent" },
    about:     { element: "aboutOverlay",     closeBtn: "closeAboutBtn",     content: "aboutContent" },
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
      const handler = (e) => { if (e.target === this.elements.menuOverlay) this.closeMenu(); };
      this.elements.menuOverlay.addEventListener("click", handler);
      this.eventListeners.push({ element: this.elements.menuOverlay, type: "click", handler });
    }

    if (this.elements.menuBtn) {
      const handler = () => this.showMenu();
      this.elements.menuBtn.addEventListener("click", handler);
      this.eventListeners.push({ element: this.elements.menuBtn, type: "click", handler });
    }

    if (this.elements.closeMenuBtn) {
      const handler = () => this.closeMenu();
      this.elements.closeMenuBtn.addEventListener("click", handler);
      this.eventListeners.push({ element: this.elements.closeMenuBtn, type: "click", handler });
    }

    this.setupMenuButtons();

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        this.closeCurrentOverlay();
        this.closeMenu();
      }
    };
    document.addEventListener("keydown", handleEscape);
    this.eventListeners.push({ element: document, type: "keydown", handler: handleEscape });
  }

  setupMenuButtons() {
    const buttons = [
      { btn: this.elements.surahsBtn,   action: () => this.showSurahs() },
      { btn: this.elements.juzHizbBtn,  action: () => this.showJuzHizb() },
      { btn: this.elements.bookmarksBtn,action: () => this.showBookmarks() },
      { btn: this.elements.khatmBtn,    action: () => this.showKhatm() },
      { btn: this.elements.searchBtn,   action: () => this.showSearch() },
      { btn: this.elements.tafsirBtn,   action: () => this.showTafsir() },
      { btn: this.elements.tajweedBtn,  action: () => this.showTajweed() },
      { btn: this.elements.aboutBtn,    action: () => this.showAbout() },
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
        this.eventListeners.push({ element: btn, type: "click", handler: action });
      }
    });
  }

  setupOverlayEventListeners(name) {
    const overlay = this.overlays[name];
    if (!overlay) return;
    if (overlay.closeBtn) {
      const handler = () => this.closeOverlay(name);
      overlay.closeBtn.addEventListener("click", handler);
      this.eventListeners.push({ element: overlay.closeBtn, type: "click", handler });
    }
    if (overlay.element) {
      const handler = (e) => { if (e.target === overlay.element) this.closeOverlay(name); };
      overlay.element.addEventListener("click", handler);
      this.eventListeners.push({ element: overlay.element, type: "click", handler });
    }
  }

  // ============================================
  // MENU
  // ============================================

  showMenu() {
    this.toggleMenuOverlay(true);
    this.updateThemeButtonText();
    window.dispatchEvent(new CustomEvent("quran:menuToggle", { detail: { isOpen: true } }));
  }

  toggleMenuOverlay(show) {
    if (!this.elements.menuOverlay) return;
    if (show) {
      this.elements.menuOverlay.classList.add("show");
      document.body.style.overflow = "hidden";
    } else {
      this.elements.menuOverlay.classList.remove("show");
      document.body.style.overflow = "";
      window.dispatchEvent(new CustomEvent("quran:menuToggle", { detail: { isOpen: false } }));
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
      this.renderSurahsList();
      this.showOverlay("surahs");
    }
  }

  _createSurahItem(surah, isPinned, bookmarkedSurahIds, pinnedIds) {
    const hasBookmark = bookmarkedSurahIds.has(surah.s_id);
    const revelationIcon = surah.type === "مدنية" ? "🕌" : "🕋";
    const juzStarts = window.quranCalculator._juzBySurahId?.get(surah.s_id)?.slice(0, 1) || [];

    const item = document.createElement("div");
    item.className = "item-container item-surah";
    item.setAttribute("data-surah-id", surah.s_id);

    const line1 = document.createElement("div");
    line1.className = "item-line-1";
    line1.innerHTML = `<div class="item-right">
      <button class="pin-btn ${isPinned ? "pinned" : ""}" data-sura-id="${surah.s_id}">${isPinned ? "⭐" : "📌"}</button>
      <span class="item-badge">${surah.s_id}</span>
      <span class="item-title">${this.escapeHtml(surah.name)}</span>
    </div>
    <div class="item-left">
      <span class="item-left-icon-col" style="text-align:center;min-width:2rem;">${hasBookmark ? '<span class="item-icon item-bookmark-indicator">🔖</span>' : ""}</span>
      <span style="color:#1976d2;font-weight:bold;font-size:0.8rem;display:inline-flex;align-items:center;min-width:1rem;">${juzStarts.map((j) => `ج ${j}`).join(" ")}</span>
      <span class="item-left-tag-col" style="min-width:4rem;text-align:left;"><span class="item-tag">ص ${surah.page_start}</span></span>
    </div>`;

    const line2 = document.createElement("div");
    line2.className = "item-line-2";
    line2.innerHTML = `<div class="item-right" style="display:flex;align-items:center;gap:0.5rem;">
      <span class="item-subtitle" style="display:flex;align-items:center;gap:0.25rem;">
        <span>النزول:</span>
        <span class="order-value">${this.escapeHtml(String(surah.order))}</span>
      </span>
      <span class="item-revelation-icon" style="display:inline-flex;align-items:center;">${revelationIcon}</span>
    </div>
    <div class="item-left" style="display:flex;align-items:center;">
      <span class="item-left-icon-col" style="display:inline-flex;align-items:center;min-width:1rem;">${window.quranCalculator.hasSajdaInSurah(surah.s_id) ? '<span class="item-icon item-sajda-icon">۩</span>' : ""}</span>
      <span class="item-left-tag-col" style="min-width:4rem;text-align:left;">
        <span class="item-tertiary">(${this.escapeHtml(String(surah.verses))}) آية</span>
      </span>
    </div>`;

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
        const added = window.quranApp.togglePinSurah(surah.s_id);
        pinBtn.classList.toggle("pinned", added);
        pinBtn.textContent = added ? "⭐" : "📌";
        this.renderSurahsList();
      }
    });

    return item;
  }

  renderSurahsList() {
    const overlay = this.overlays.surahs;
    if (!overlay?.content || !window.quranCalculator) return;
    overlay.content.innerHTML = "";

    const bookmarks = window.quranApp?.getBookmarks() || [];
    const surahs = window.quranCalculator.getAllSurahs();
    const pinnedIds = window.quranApp?.getPinnedSurahs() || [];

    const bookmarkedSurahIds = new Set();
    bookmarks.forEach((bookmark) => {
      const surah = window.quranCalculator.getFirstSurahForPage(bookmark.page);
      if (surah) bookmarkedSurahIds.add(surah.s_id);
    });

    const pinnedSurahs = surahs.filter((s) => pinnedIds.includes(s.s_id));

    if (pinnedSurahs.length > 0) {
      const pinnedSection = document.createElement("div");
      pinnedSection.className = "surah-section";
      pinnedSection.innerHTML = '<h3 class="section-title">⭐ السور المفضلة</h3>';
      pinnedSurahs.forEach((surah) =>
        pinnedSection.appendChild(this._createSurahItem(surah, true, bookmarkedSurahIds, pinnedIds))
      );
      overlay.content.appendChild(pinnedSection);
    }

    const allSection = document.createElement("div");
    allSection.className = "surah-section";
    allSection.innerHTML = '<h3 class="section-title">📖 جميع السور</h3>';
    surahs.forEach((surah) =>
      allSection.appendChild(this._createSurahItem(surah, pinnedIds.includes(surah.s_id), bookmarkedSurahIds, pinnedIds))
    );
    overlay.content.appendChild(allSection);

    const currentSurah = window.quranCalculator?.getFirstSurahForPage(this.getCurrentPage());
    if (currentSurah?.s_id) {
      setTimeout(() => {
        const el = overlay.content.querySelector(`.item-container[data-surah-id="${currentSurah.s_id}"]`);
        if (el) {
          el.classList.add("current-item");
          el.scrollIntoView({ block: "center", behavior: "auto" });
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
      const hasBookmarkInRange = bookmarks.some((b) => b.page >= hizb.page_start && b.page <= hizb.page_end);
      const isNewJuz = parseInt(hizb.hizb) % 2 !== 0;
      const juzNum = Math.ceil(parseInt(hizb.hizb) / 2);
      const suraId = window.quranCalculator._surahIdByName?.get(hizb.sura) ?? "?";
      const ayaText = (hizb.aya_txt || "").replace(/\s*\(\d+\)\s*$/, "").trim();
      const prefix = `${this.escapeHtml(String(suraId))}. ${this.escapeHtml(hizb.sura)} - آية (${this.escapeHtml(String(hizb.aya))})`;

      const item = document.createElement("div");
      item.className = "item-container item-juzhizb";
      item.setAttribute("data-hizb", hizb.hizb);

      const line1 = document.createElement("div");
      line1.className = "item-line-1";
      line1.innerHTML = `<div class="item-right juzhizb-grid">
        ${isNewJuz ? `<span class="item-badge juzhizb-grid-col1">ج ${juzNum}</span>` : '<span class="juzhizb-grid-col1"></span>'}
        <span class="item-title juzhizb-grid-col2">الحزب ${hizb.hizb}</span>
      </div>
      <div class="item-left">
        <span class="item-left-icon-col">${hasBookmarkInRange ? '<span class="item-icon item-bookmark-indicator">🔖</span>' : ""}</span>
        <span class="item-left-tag-col"><span class="item-tag">ص ${hizb.page_start}</span></span>
      </div>`;

      const line2 = document.createElement("div");
      line2.className = "item-line-2";
      line2.innerHTML = `<div class="item-right juzhizb-grid">
        <span class="juzhizb-grid-col1"></span>
        <span class="item-subtitle juzhizb-grid-col2">
          <span class="aya-text">${this.escapeHtml(ayaText)}</span>
          <span class="aya-prefix">${prefix}</span>
        </span>
      </div>`;

      item.appendChild(line1);
      item.appendChild(line2);
      item.addEventListener("click", () => {
        window.quranApp?.goToPage(hizb.page_start);
        this.closeOverlay("juzHizb");
      });
      overlay.content.appendChild(item);
    });

    const currentHizb = window.quranCalculator?.getHizbForPage(this.getCurrentPage());
    if (currentHizb?.hizb) {
      setTimeout(() => {
        const el = overlay.content.querySelector(`.item-container[data-hizb="${currentHizb.hizb}"]`);
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
      backdrop.addEventListener("click", (e) => { if (e.target === backdrop) cleanup(false); });
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
      bookmarks.forEach((bookmark) => listContainer.appendChild(this.createBookmarkElement(bookmark)));
    }

    container.appendChild(listContainer);
    container.appendChild(formContainer);
    overlay.content.appendChild(container);
    this.setupBookmarkFormHandlers(currentPage);
  }

  setupBookmarkFormHandlers(currentPage) {
    if (!this.bookmarkFormInput || !this.bookmarkFormButton) return;

    const newButton = this.bookmarkFormButton.cloneNode(true);
    this.bookmarkFormButton.parentNode.replaceChild(newButton, this.bookmarkFormButton);
    this.bookmarkFormButton = newButton;

    const newCancel = this.bookmarkFormCancel.cloneNode(true);
    this.bookmarkFormCancel.parentNode.replaceChild(newCancel, this.bookmarkFormCancel);
    this.bookmarkFormCancel = newCancel;

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
      item.classList.toggle("editing-bookmark", item.dataset.bookmarkId === bookmark.id);
    });
  }

  resetBookmarkForm() {
    this.editingBookmarkId = null;
    this.bookmarkFormInput.value = `صفحة ${this.getCurrentPage()}`;
    this.bookmarkFormCancel.style.display = "none";
    this.bookmarkFormButton.textContent = "إضافة";
    document.querySelectorAll(".item-bookmark").forEach((item) => item.classList.remove("editing-bookmark"));
  }

  createBookmarkElement(bookmark) {
    const item = document.createElement("div");
    item.className = "item-container item-bookmark";
    item.setAttribute("data-bookmark-id", bookmark.id);
    this.renderBookmarkDisplayMode(item, bookmark);
    return item;
  }

  renderBookmarkDisplayMode(item, bookmark) {
    item.innerHTML = `<div class="item-line-1">
      <div class="item-right">
        <button class="icon-btn icon-btn--edit" data-id="${bookmark.id}" title="تعديل الاسم">✏️</button>
        <span class="item-title bookmark-name" data-id="${bookmark.id}">${this.escapeHtml(bookmark.name)}</span>
      </div>
      <div class="item-left">
        <span class="item-tag">ص ${bookmark.page}</span>
        <button class="icon-btn icon-btn--recycle" data-id="${bookmark.id}" title="استبدال الصفحة بالصفحة الحالية">♻️</button>
        <button class="icon-btn icon-btn--remove" data-id="${bookmark.id}" title="حذف">🗑️</button>
      </div>
    </div>`;
    this.attachBookmarkEvents(item, bookmark);
  }

  attachBookmarkEvents(item, bookmark) {
    item.querySelector(".icon-btn--edit")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.startEditingBookmark(bookmark);
    });

    item.querySelector(".icon-btn--recycle")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      const currentPage = this.getCurrentPage();
      const confirmed = await this.showConfirm(`هل تريد وضع العلامة (${bookmark.name}) بهاته الصفحة ؟`);
      if (confirmed && window.quranApp?.replaceBookmarkPage(bookmark.id, currentPage)) {
        window.quranApp.showToast(`♻️ تم استبدال الصفحة ب ${currentPage}`);
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

    item.addEventListener("click", (e) => {
      if (e.target === item || e.target.classList.contains("bookmark-name") || e.target.classList.contains("item-tag")) {
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
    if (!overlay?.content || overlay.content.children.length > 0) return;
    overlay.content.innerHTML = `<div class="khatm-page">
      <img src="media/605.webp" alt="دعاء ختم القرآن - الصفحة 605" loading="lazy">
      <img src="media/606.webp" alt="دعاء ختم القرآن - الصفحة 606" loading="lazy">
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

    const updateVisibility = () => {
      const btn = document.getElementById("clearSearchBtn");
      if (btn) btn.style.display = overlay.input.value ? "block" : "none";
    };

    overlay.input.addEventListener("input", updateVisibility);

    const newClearBtn = clearBtn.cloneNode(true);
    clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);

    document.getElementById("clearSearchBtn").addEventListener("click", () => {
      overlay.input.value = "";
      updateVisibility();
      window.tafsirManager?.clearSearch
        ? window.tafsirManager.clearSearch()
        : (overlay.results.innerHTML = "");
      overlay.input.focus();
    });

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

    if (window.tafsirManager?.initTafsirUI && !this.lazyLoaded.has("tafsirUI")) {
      overlay.content.innerHTML = `<div class="tafsir-loading-overlay" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:10;background:inherit;">
        <div style="text-align:center;">
          <div class="spinner" style="margin-bottom:20px;"></div>
          <p>جاري تحميل التفسير...</p>
        </div>
      </div>`;

      this._tafsirInitTimeout = setTimeout(async () => {
        const suraSelect  = overlay.suraSelect  || document.getElementById("suraSelect");
        const ayaSelect   = overlay.ayaSelect   || document.getElementById("ayaSelect");
        const pageSelect  = overlay.pageSelect  || document.getElementById("pageSelect");

        if (suraSelect && ayaSelect && pageSelect) {
          await window.tafsirManager.initTafsirUI(
            suraSelect, ayaSelect, pageSelect,
            overlay.content,
            (page) => { this.closeOverlay("tafsir"); setTimeout(() => window.quranApp?.goToPage(page), 200); },
            (sura, aya) => this.goToAya(sura, aya),
          );
          this.lazyLoaded.add("tafsirUI");
          const loadingEl = overlay.content.querySelector(".tafsir-loading-overlay");
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
      setTimeout(() => window.tafsirManager.scrollToFirstAyaOfPage(currentPage), 150);
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
        <img src="media/000.webp" alt="قواعد التجويد الملونة" loading="lazy">
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
        <span class="about-version">v1.0.7</span>
      </p>
      <p class="about-desc">
        تطبيق لقراءة القرآن الكريم كاملاً بجودة عالية ودون اتصال بالإنترنت، مطابق للمصحف الورقي المعتمد :
        <strong>مصحف التجويد الملون برواية حفص عن الإمام عاصم الكوفي</strong> من طريق الشاطبية (الصادر عن دار المعرفة)
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
    </div>`;
  }

  // ============================================
  // GESTION GÉNÉRALE DES OVERLAYS
  // ============================================

  updateThemeButtonText() {
    const textSpan = this.elements.themeBtn?.querySelector(".menu-text");
    if (textSpan) {
      textSpan.textContent = document.body.classList.contains("night-mode") ? "الوضع النهاري" : "الوضع الليلي";
    }
  }

  showOverlay(name) {
    if (this.currentOverlay && this.currentOverlay !== name) this.closeOverlay(this.currentOverlay);
    const overlay = this.overlays[name];
    if (!overlay?.element) return;
    overlay.element.classList.add("show");
    document.body.style.overflow = "hidden";
    this.currentOverlay = name;
    if (window.quranReader) {
      window.quranReader.buttonsVisible = true;
      window.quranReader.applyButtonsVisibility();
    }
    window.dispatchEvent(new CustomEvent("quran:overlayOpened", { detail: { overlay: name } }));
  }

  closeOverlay(name) {
    const overlay = this.overlays[name];
    if (!overlay?.element) return;
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
    window.dispatchEvent(new CustomEvent("quran:overlayClosed", { detail: { overlay: name } }));
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
