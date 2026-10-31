// ============================================================
//  FICHIER : overlays-manager.js
//  Rôle : menu principal et overlays (sourates, juz / hizbs, signets,
//         khatm, tajweed, à propos, sauvegarde, aller à un verset / page)
//
//  SOMMAIRE (sections de la classe OverlayManager)
//    1. Cache des éléments
//    2. Chargement à la demande
//    3. Écouteurs d'événements
//    4. Menu principal
//    5. Overlay des sourates
//    6. Fiche d'information d'une sourate
//    7. Overlay des juz et hizbs
//    8. Overlay des signets, dialogues, export et import
//    9. Overlay du khatm
//   10. Overlay du tajweed
//   11. À propos, partage et sauvegarde
//   12. Overlay « aller à » (verset ou page)
//   13. Gestion générale des overlays
// ============================================================

const hasNativeShare = () => typeof cordova !== "undefined" && !!window.plugins?.socialsharing;

class OverlayManager {
  // ---------- Constructeur ----------

  constructor() {
    this.config = {};
    this.currentOverlay = null;
    this.elements = {};
    this.overlays = {};
    this.surahsInfo = null;
    this._surahInfoKeyHandler = null;
    this._backupBound = false;
    this._tafsirSavedPage = null;
    this.editingBookmarkId = null;
    this.bookmarkFormInput = null;
    this.bookmarkFormButton = null;
    this.bookmarkFormCancel = null;
    this.currentSurahInfoId = null;
    this._surahInfoSwipeInitialized = false;
  }

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
    memorize: {
      element: "memorizeOverlay",
      closeBtn: "closeMemorizeBtn",
      content: "memorizeContent",
    },
    memSettings: {
      element: "memSettingsOverlay",
      closeBtn: "closeMemSettingsBtn",
      content: "memSettingsContent",
    },
    goTo: {
      element: "pageInputOverlay",
      closeBtn: "closePageInputBtn",
      content: "goToContent",
    },
    khatm: {
      element: "khatmOverlay",
      closeBtn: "closeKhatmBtn",
      content: "khatmContent",
    },
    search: {
      element: "searchOverlay",
      closeBtn: "closeSearchBtn",
      content: "searchContentContainer",
    },
    tafsir: {
      element: "tafsirOverlay",
      closeBtn: "closeTafsirBtn",
      content: "tafsirContentContainer",
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

  // ---------- Initialisation ----------

  init(config = {}) {
    Object.assign(this.config, config);
    this.cacheElements();
    this.setupEventListeners();
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

  // ---------- Helpers privés ----------

  /**
   * Ouvre un overlay depuis le menu : ferme le menu, charge l'overlay à la
   * demande, exécute le préparateur éventuel, puis affiche l'overlay.
   */
  _openMenuOverlay(name, prepareFn) {
    this.closeMenu();
    const overlay = this.lazyLoadOverlay(name);
    if (!overlay?.element) return null;
    if (prepareFn) prepareFn(overlay);
    this.showOverlay(name);
    return overlay;
  }

  /** Bouton d'action (✏️ / ♻️ / 🗑️) pour un signet, avec data-id. */
  _makeBookmarkIconBtn(cls, title, text, id) {
    const btn = AppUtils.el("button", `action-icon bordered ${cls}`, text);
    btn.dataset.id = id;
    btn.title = title;
    return btn;
  }

  /** Affiche une confirmation, exécute l'action si validée, puis toast + refresh. */
  async _confirmAndRefresh(message, actionFn, successMsg) {
    const confirmed = await this.showConfirm(message);
    if (confirmed && actionFn()) {
      window.quranApp.showToast(successMsg);
      this.refreshBookmarksDisplay();
    }
  }

  // ---------- 1. Cache des éléments ----------

  cacheElements() {
    this.elements = {
      menuOverlay: document.getElementById("menuOverlay"),
      closeMenuBtn: document.getElementById("closeMenuBtn"),
      menuBtn: document.getElementById("menuBtn"),
      surahsBtn: document.getElementById("surahsBtn"),
      juzHizbBtn: document.getElementById("juzHizbBtn"),
      bookmarksBtn: document.getElementById("bookmarksBtn"),
      goToBtn: document.getElementById("goToBtn"),
      audioBtn: document.getElementById("audioBtn"),
      memorizeBtn: document.getElementById("memorizeBtn"),
      searchBtn: document.getElementById("searchBtn"),
      tafsirBtn: document.getElementById("tafsirBtn"),
      tajweedBtn: document.getElementById("tajweedBtn"),
      khatmBtn: document.getElementById("khatmBtn"),
      themeBtn: document.getElementById("themeBtn"),
      aboutBtn: document.getElementById("aboutBtn"),
    };
  }

  // ---------- 2. Chargement à la demande ----------

  lazyLoadOverlay(name) {
    if (this.overlays[name]) {
      return this.overlays[name];
    }
    const config = this._overlayConfig[name];
    if (!config) return null;
    const overlay = {};
    for (const [key, id] of Object.entries(config)) {
      overlay[key] = document.getElementById(id);
    }
    this.overlays[name] = overlay;
    this.setupOverlayEventListeners(name);
    return overlay;
  }

  // ---------- 3. Écouteurs d'événements ----------

  _on(el, type, handler) {
    if (el) el.addEventListener(type, handler);
  }

  setupEventListeners() {
    const { menuOverlay, menuBtn, closeMenuBtn } = this.elements;
    this._on(menuOverlay, "click", (e) => {
      if (e.target === menuOverlay) this.closeMenu();
    });
    this._on(menuBtn, "click", () => this.showMenu());
    this._on(closeMenuBtn, "click", () => this.closeMenu());
    this.setupMenuButtons();
    this._on(document, "keydown", (e) => {
      if (e.key === "Escape") window.quranApp?.handleBack?.();
    });
  }

  setupMenuButtons() {
    const e = this.elements;
    this._on(e.surahsBtn, "click", () => this.showSurahs());
    this._on(e.juzHizbBtn, "click", () => this.showJuzHizb());
    this._on(e.bookmarksBtn, "click", () => this.showBookmarks());
    this._on(e.goToBtn, "click", () => this.showPageInputDialog());
    this._on(e.audioBtn, "click", () => window.quranAudioPlayer?.showOverlay());
    this._on(e.memorizeBtn, "click", () => { this.closeMenu(); window.quranAudioPlayer?.openMemorize(); });
    this._on(e.searchBtn, "click", () => window.tafsirManager?.showSearchOverlay());
    this._on(e.tafsirBtn, "click", () => window.tafsirManager?.showTafsirOverlay());
    this._on(e.tajweedBtn, "click", () => this.showTajweed());
    this._on(e.khatmBtn, "click", () => this.showKhatm());
    this._on(e.themeBtn, "click", () => { this.closeMenu(); setTimeout(() => window.quranApp?.toggleTheme(), 50); });
    this._on(e.aboutBtn, "click", () => this.showAbout());
  }

  setupOverlayEventListeners(name) {
    const overlay = this.overlays[name];
    if (!overlay) return;
    this._on(overlay.closeBtn, "click", () => this.closeOverlay(name));
    this._on(overlay.element, "click", (e) => {
      if (e.target === overlay.element) this.closeOverlay(name);
    });
  }

  // ---------- 4. Menu principal ----------

  showMenu() {
    this.toggleMenuOverlay(true);
    this.updateThemeButtonText();
  }

  toggleMenuOverlay(show) {
    const menu = this.elements.menuOverlay;
    if (!menu) return;
    menu.classList.toggle("show", show);
    document.body.style.overflow = show ? "hidden" : "";
    AppUtils.emit(APP_EVENTS.menuToggle, { isOpen: show });
  }

  closeMenu() {
    this.toggleMenuOverlay(false);
  }

  // ---------- 5. Overlay des sourates ----------

  showSurahs() {
    this._openMenuOverlay("surahs", () => this.renderSurahsList(true));
  }

  _createSurahItem(surah, isPinned, bookmarkedSurahIds) {
    const R = ListItemRenderer;
    const container = R.createContainer("surah", surah.s_id);
    const calc = window.quranCalculator;
    const juzStarts = calc.getJuzStartsForSurah(surah.s_id);

    // Grille : 2 lignes × 7 colonnes (RTL)
    const grid = AppUtils.el("div", "surah-grid");
    const cell = (cls, html = "") => {
      const div = AppUtils.el("div", `g-col ${cls}`);
      if (html) div.innerHTML = html;
      return div;
    };

    // Col 1 — épingle (fusion des 2 lignes)
    const pinBtn = AppUtils.el(
      "button",
      `g-col g-pin action-icon pin-btn surah-pin ${isPinned ? "pinned" : ""}`,
      isPinned ? "💫" : "📌",
    );
    pinBtn.dataset.surahId = surah.s_id;

    // Col 2 — numéro
    const badge = R.createBadge(String(surah.s_id));
    badge.classList.add("g-col", "g-badge");

    // Col 3 — nom en calligraphie + ordre de révélation
    const nameCell = cell("g-name");
    nameCell.appendChild(AppUtils.el("span", "surah-calligraphy", `surah${AppUtils.pad3(surah.s_id)}`));

    // Col 4 — info ℹ️ + lieu de révélation 🕋 / 🕌
    const infoBtn = AppUtils.el("button", "g-col g-info action-icon info-btn surah-info", "ℹ️");
    infoBtn.dataset.surahId = surah.s_id;

    // Col 5 — signet
    const bookmarkCell = cell("g-bookmark");
    if (bookmarkedSurahIds?.has(surah.s_id)) bookmarkCell.textContent = "🔖";

    grid.append(
      pinBtn,
      badge,
      nameCell,
      cell("g-order", `<span class="note-small">النزول: ${surah.order}</span>`),
      infoBtn,
      cell("g-revel", `<span class="surah-revel">${surah.type === "مدنية" ? "🕌" : "🕋"}</span>`),
      bookmarkCell,
      // Col 6 — juz + sajda ۩
      cell("g-juz", juzStarts.length ? `<span class="juz-badge">${juzStarts.map((j) => `ج${j}`).join(" ")}</span>` : ""),
      cell("g-sajda", calc.hasSajdaInSurah(surah.s_id) ? '<span class="item-sajda-icon">۩</span>' : ""),
      // Col 7 — page + nombre de versets
      cell("g-page", `<span class="page-tag">${APP_TEXTS.pageShort} ${surah.page_start}</span>`),
      cell("g-verses", `<span class="surah-verses">(${surah.verses}) آية</span>`),
    );
    container.appendChild(grid);

    container.addEventListener("click", (e) => {
      if (e.target.closest(".pin-btn") || e.target.closest(".info-btn")) return;
      window.quranApp?.goToPage(surah.page_start);
      this.closeOverlay("surahs");
    });

    pinBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!window.quranApp) return;
      window.quranApp.togglePinSurah(surah.s_id);
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
    const calc = window.quranCalculator;
    if (!overlay?.content || !calc) return;
    const container = overlay.content;

    const inAllSection = (id) =>
      container.querySelector(`.surah-section-all .item-surah[data-surah-id="${id}"]`);

    let initialClickOffset = 0;
    if (preserveSurahId) {
      const clickedEl =
        inAllSection(preserveSurahId) ||
        container.querySelector(`.item-surah[data-surah-id="${preserveSurahId}"]`);
      if (clickedEl) initialClickOffset = clickedEl.offsetTop - container.scrollTop;
    }

    const surahs = calc.getAllSurahs();
    const pinnedIds = window.quranApp?.getPinnedSurahs() || [];
    const bookmarkedSurahIds = new Set(
      (window.quranApp?.getBookmarks() || []).map((b) => b.surahId).filter(Boolean),
    );

    const section = (cls, title, list) => {
      const el = AppUtils.el("div", `surah-section ${cls}`);
      el.innerHTML = `<h3 class="section-title">${title}</h3>`;
      list.forEach((s) => el.appendChild(this._createSurahItem(s, pinnedIds.includes(s.s_id), bookmarkedSurahIds)));
      return el;
    };

    container.replaceChildren();
    const pinned = surahs.filter((s) => pinnedIds.includes(s.s_id));
    if (pinned.length > 0) container.appendChild(section("surah-section-pinned", "⭐ السور المفضلة", pinned));
    container.appendChild(section("surah-section-all", "📖 جميع السور", surahs));

    const currentId = calc.getFirstSurahForPage(this.getCurrentPage())?.s_id;
    if (currentId) inAllSection(currentId)?.classList.add("current-item");

    if (preserveSurahId) {
      const newEl = inAllSection(preserveSurahId);
      if (newEl) {
        requestAnimationFrame(() => {
          container.scrollTop = newEl.offsetTop - initialClickOffset;
        });
      }
    } else if (scrollToCurrent && currentId) {
      const el = inAllSection(currentId);
      if (el) requestAnimationFrame(() => el.scrollIntoView({ block: "center", behavior: "auto" }));
    }
  }

  // ---------- 6. Fiche d'information d'une sourate ----------

  async showSurahInfo(surahId) {
    this.closeMenu();
    const overlay = this.lazyLoadOverlay("surahInfo");
    if (!overlay?.element) return;
    overlay.content.innerHTML = `
      <div class="loading-placeholder surah-info-loading">
        <div class="spinner"></div>
        <p>جاري تحميل المعلومات...</p>
      </div>
    `;
    this.showOverlay("surahInfo");

    if (!this.surahsInfo) {
      try {
        const response = await fetch("./data/surainfo.json", { cache: "force-cache" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.surahsInfo = await response.json();
      } catch {
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
          if (this.currentSurahInfoId < APP_CFG.TOTAL_SURAHS) this._updateSurahInfoUI(this.currentSurahInfoId + 1);
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

    const info = this.surahsInfo.find(item => item.s === surahId);
    if (!info) {
      overlay.content.innerHTML = `<div class="empty-message">ℹ️ لا توجد معلومات متوفرة لهذه السورة</div>`;
      return;
    }

    const formattedHtml = this.formatSurahInfo(info.t);
    overlay.content.innerHTML = `<div class="surah-info-content">${formattedHtml}</div>`;
    this.currentSurahInfoId = surahId;
  }

  _initSurahInfoSwipe() {
    const element = this.overlays.surahInfo?.element;
    if (!element) return;
    this._surahInfoSwipeInitialized = true;
    window.quranApp.enableSwipe(
      element,
      () => {
        if (this.currentSurahInfoId < APP_CFG.TOTAL_SURAHS) this._updateSurahInfoUI(this.currentSurahInfoId + 1);
      },
      () => {
        if (this.currentSurahInfoId > 1) this._updateSurahInfoUI(this.currentSurahInfoId - 1);
      },
      50
    );
  }

  formatSurahInfo(text) {
    const lines = text.split(/\r?\n/);
    const title = lines[0]?.trim() || "";
    const remaining = lines.slice(1);

    let html = '';
    if (title) {
      html += `<div class="surah-info-center">
               <div class="surah-info-title">${AppUtils.esc(title)}</div>
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
        const colorClass = `sec-${sectionIndex++ % 8}`;
        html += `<div class="surah-section-title ${colorClass}">${prefix} ${AppUtils.esc(rest)}</div>`;
      } else {
        html += `<div class="surah-section-text">${AppUtils.esc(line)}</div>`;
      }
    }
    return html;
  }

  // ---------- 7. Overlay des juz et hizbs ----------

  showJuzHizb() {
    this._openMenuOverlay("juzHizb", () => this.renderJuzHizbList());
  }

  renderJuzHizbList() {
    const overlay = this.overlays.juzHizb;
    const calc = window.quranCalculator;
    if (!overlay?.content || !calc) return;
    const R = ListItemRenderer;

    const bookmarks = window.quranApp?.getBookmarks() || [];
    const items = calc.getHizbWithPageRange().map((hizb) => {
      const hizbNum = parseInt(hizb.hizb, 10);
      const isNewJuz = hizbNum % 2 !== 0;
      const hasBookmarkInRange = bookmarks.some((b) => b.page >= hizb.page_start && b.page <= hizb.page_end);
      const ayaText = (hizb.aya_txt || "").replace(/\s*\(\d+\)\s*$/, "").trim();
      const container = R.createContainer("juzhizb", hizb.hizb);

      // Ligne 1 : badge du juz (masqué sur les hizbs pairs), titre, signet, page
      const badge = R.createBadge(isNewJuz ? `ج${Math.ceil(hizbNum / 2)}` : "ج0");
      if (!isNewJuz) badge.style.visibility = "hidden";
      const leftElements = [];
      if (hasBookmarkInRange) leftElements.push(R.createIcon("🔖"));
      leftElements.push(R.createPageTag(hizb.page_start));
      container.appendChild(
        R.buildLine1({ rightElements: [badge, R.createTitle(`الحزب ${hizb.hizb}`)], leftElements }),
      );

      // Ligne 2 : texte du verset ; ligne 3 : sourate et numéro du verset
      const line2 = AppUtils.el("div", "item-line-2 juz-line2");
      line2.innerHTML = `<span class="aya-text">${AppUtils.esc(ayaText)}</span>`;
      const line3 = AppUtils.el("div", "item-line-3 juz-line3");
      line3.innerHTML = `<span class="note-small">${AppUtils.esc(hizb.s_id)}. ${AppUtils.esc(hizb.sura)} - آية (${AppUtils.esc(hizb.aya)})</span>`;
      container.append(line2, line3);

      container.addEventListener("click", () => {
        window.quranApp?.goToPage(hizb.page_start);
        this.closeOverlay("juzHizb");
      });
      return container;
    });
    overlay.content.replaceChildren(...items);

    const currentHizb = calc.getHizbForPage(this.getCurrentPage());
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

  // ---------- 8. Overlay des signets, dialogues, export et import ----------

  _showBackdropDialog(html, bindButtons) {
    return new Promise((resolve) => {
      const backdrop = AppUtils.el("div", "confirm-backdrop");
      const dialog = AppUtils.el("div", "confirm-dialog");
      dialog.innerHTML = html;
      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);
      AppUtils.emit(APP_EVENTS.overlayOpened);

      const cleanup = (result) => {
        backdrop.remove();
        AppUtils.emit(APP_EVENTS.overlayClosed);
        resolve(result);
      };

      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) cleanup(null);
      });
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
    this._openMenuOverlay("bookmarks", () => this.refreshBookmarksDisplay());
  }

  refreshBookmarksDisplay() {
    const overlay = this.overlays.bookmarks;
    if (!overlay?.content) return;

    this.editingBookmarkId = null;
    const bookmarks = window.quranApp?.getBookmarks() || [];
    const currentPage = this.getCurrentPage();

    const list = AppUtils.el("div", "bookmarks-list");
    if (bookmarks.length === 0) {
      list.appendChild(AppUtils.el("div", "empty-message", "لا توجد علامات مرجعية"));
    } else {
      bookmarks.forEach((bookmark) => list.appendChild(this.createBookmarkElement(bookmark)));
    }

    const input = AppUtils.el("input", "search-input");
    input.type = "text";
    input.placeholder = "اسم العلامة";
    input.value = this.getDefaultBookmarkName(currentPage);

    const addBtn = AppUtils.el("button", "confirm-btn ok", "إضافة");
    const cancelBtn = AppUtils.el("button", "confirm-btn cancel", "لا");
    cancelBtn.style.display = "none";

    const buttons = AppUtils.el("div", "bookmarks-button-container");
    buttons.append(addBtn, cancelBtn);
    const form = AppUtils.el("div", "bookmarks-add-form");
    form.append(buttons, input);

    this.bookmarkFormInput = input;
    this.bookmarkFormButton = addBtn;
    this.bookmarkFormCancel = cancelBtn;

    const container = AppUtils.el("div", "bookmarks-overlay-content");
    container.append(list, form);
    overlay.content.replaceChildren(container);

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
    const item = ListItemRenderer.createContainer("bookmark", bookmark.id);
    this.renderBookmarkDisplayMode(item, bookmark);
    return item;
  }

  /** 2026-10-25T… → 26-10-25 (chaîne vide si la date est absente ou invalide). */
  _formatShortDate(iso) {
    const date = iso ? new Date(iso) : null;
    if (!date || isNaN(date)) return "";
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  renderBookmarkDisplayMode(item, bookmark) {
    const R = ListItemRenderer;

    const nameSpan = AppUtils.el("span", "item-title bookmark-name", bookmark.name);
    nameSpan.dataset.id = bookmark.id;

    item.appendChild(
      R.buildLine1({
        rightElements: [
          this._makeBookmarkIconBtn("icon-btn--edit", "تعديل الاسم", "✏️", bookmark.id),
          nameSpan,
        ],
        leftElements: [
          R.createPageTag(bookmark.page),
          this._makeBookmarkIconBtn("icon-btn--replace", "استبدال الصفحة بالصفحة الحالية", "♻️", bookmark.id),
          this._makeBookmarkIconBtn("icon-btn--remove", "حذف", "🗑️", bookmark.id),
        ],
      }),
    );

    const dateSpan = AppUtils.el("span", "note-small", this._formatShortDate(bookmark.lastModified) || "غير معروف");
    const right = AppUtils.el("div", "item-right");
    right.appendChild(dateSpan);
    const line2 = AppUtils.el("div", "item-line-2 bookmark-line2");
    line2.appendChild(right);
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
      const currentPage = window.quranReader?.getCurrentPage() || this.getCurrentPage();
      const oldPage = bookmark.page;

      if (oldPage === currentPage) {
        window.quranApp?.showToast("⚠️ العلامة موجودة بالفعل على هذه الصفحة");
        return;
      }

      await this._confirmAndRefresh(
        `هل تريد نقل العلامة (${AppUtils.esc(bookmark.name)}) من صفحة ${oldPage} إلى صفحة ${currentPage} ؟`,
        () => window.quranApp?.replaceBookmarkPage(bookmark.id, currentPage),
        `♻️ تم نقل العلامة من صفحة ${oldPage} إلى ${currentPage}`,
      );
    });

    item.querySelector(".icon-btn--remove")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      await this._confirmAndRefresh(
        `هل تريد حذف العلامة (${AppUtils.esc(bookmark.name)}) ؟`,
        () => window.quranApp?.removeBookmarkById(bookmark.id),
        "✖️ تمت إزالة العلامة",
      );
    });

    item.addEventListener("click", () => {
      window.quranApp?.goToPage(bookmark.page);
      this.closeOverlay("bookmarks");
    });
  }

  showImportChoice() {
    return this._showBackdropDialog(
      `<p>كيف تريد استيراد البيانات؟</p><div class="confirm-buttons"><button class="confirm-btn ok" id="mergeBtn">دمج</button><button class="confirm-btn" id="replaceBtn">استبدال</button><button class="confirm-btn cancel" id="cancelBtn">إلغاء</button></div>`,
      (dialog, cleanup) => {
        dialog.querySelector("#mergeBtn").addEventListener("click", () => cleanup("merge"));
        dialog.querySelector("#replaceBtn").addEventListener("click", () => cleanup("replace"));
        dialog.querySelector("#cancelBtn").addEventListener("click", () => cleanup(null));
      }
    );
  }

  _toBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  _hasPinnedReciters() {
    return Object.keys(window.RIWAYAT_CONFIG || {}).some((riwaya) => {
      const list = window.quranApp.getPreferenceJSON(`pinnedReciters_${riwaya}`, []);
      return Array.isArray(list) && list.length > 0;
    });
  }

  async exportBookmarks() {
    const app = window.quranApp;
    if (!app.bookmarks?.length && !app.pinnedSurahs?.length && !this._hasPinnedReciters()) {
      app.showToast("⚠️ لا توجد بيانات للتصدير");
      return;
    }

    const fileName = `hafs_backup_${new Date().toISOString().slice(2, 10)}`;
    const dataUrl = "data:application/json;base64," + this._toBase64(app.exportUserData());

    if (hasNativeShare()) {
      window.plugins.socialsharing.shareWithOptions(
        {
          message: "نسخة احتياطية من العلامات المرجعية والسور المفضلة",
          subject: fileName,
          files: [dataUrl],
          chooserTitle: "حفظ أو مشاركة الملف",
        },
        () => app.showToast("✅ تم التصدير"),
        (err) => app.showToast("❌ " + err),
      );
      return;
    }

    const a = AppUtils.el("a");
    a.href = dataUrl;
    a.download = fileName + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    app.showToast("✅ تم التصدير");
  }

  importBookmarks() {
    const input = AppUtils.el("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("cancel", () => input.remove());

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

  // ---------- 9. Overlay du khatm ----------

  showKhatm() {
    this._openMenuOverlay("khatm", () => this.prepareKhatmContent());
  }

  prepareKhatmContent() {
    const overlay = this.overlays.khatm;
    if (!overlay?.content || overlay.content.children.length > 0) return;
    overlay.content.innerHTML = `<div class="khatm-page">
      <img src="./media/605.webp" alt="دعاء ختم القرآن - الصفحة 605" loading="lazy">
      <img src="./media/606.webp" alt="دعاء ختم القرآن - الصفحة 606" loading="lazy">
    </div>`;
  }

  // ---------- 10. Overlay du tajweed ----------

  showTajweed() {
    this._openMenuOverlay("tajweed", () => this.prepareTajweedContent());
  }

  prepareTajweedContent() {
    const overlay = this.overlays.tajweed;
    if (overlay?.content) overlay.content.innerHTML = `<div class="tajweed-text">
      <div class="tajweed-image">
        <img src="./media/000.webp" alt="قواعد التجويد الملونة" loading="lazy">
      </div>
      <p><span class="tj-red tj-bold tj-title">أولاً – اللون الأحمر (بتدرّجاته):</span></p>
      <p>يرمز للمدود بأزمنتها المختلفة حسب تدرّج اللون.</p>
      <ul>
        <li><span class="tj-red-dark tj-bold">اللون الأحمر الغامق</span>، يرمز للمد اللازم ويمد ست حركات، ويشمل المد الكَلمي (بنوعيه المثقّل والمخفّف) والمد الحرفي (بنوعيه المثقّل والمخفّف).</li>
        <li><span class="tj-red tj-bold">اللون الأحمر القاني:</span> يرمز للمد الواجب ويُمدّ خمس حركات ويشمل المد المتّصل والمد المنفصل والصلة الكبرى.</li>
        <li><span class="tj-orange tj-bold">اللون البرتقالي:</span> يرمز للمد الجائز، ويمد حركتين أو أربع أو ست حركات في حال الوقف على رؤوس الآي كما رسمت في المصاحف، ويشمل هذا المد الجائز كلاً من المد العارض للسكون، ومد اللين.</li>
        <li><span class="tj-yellow tj-bold">اللون الكمّوني:</span> يرمز للمد الطبيعي وهو حركتان فقط سواء للألف المحذوفة من الرسم العثماني أو للصلة الصغرى.</li>
      </ul>
      <p><strong><span class="tj-green tj-title">ثانياً – اللون الأخضر:</span></strong></p>
      <p>يرمز لموقع الغنّة وزمنها حركتان، أما تمييزها (مرقّقة أو مفخّمة والنطق بها بشكل عام، فهذا لا بدّ من الرجوع به إلى التلقّي والمشافهة)، وقد تكون لغنّة الإخفاء، أو الإخفاء الشفوي، أو للنون المشدّدة أو الميم المشدّدة، وهي تشكّل مع اللون الرمادي حكم الإدغام بغنّة وحكم الإقلاب.</p>
      <p><strong><span class="tj-blue tj-title">ثالثاً – اللون الأزرق:</span></strong></p>
      <ul>
        <li><span class="tj-navy tj-bold">الأزرق الغامق:</span> لوّنت به الراء المفخّمة فقط دون التعرّض لحروف الاستعلاء ذات المراتب المختلفة للتفخيم دفعاً للتشويش عن القارئ.</li>
        <li><span class="tj-sky tj-bold">الأزرق السماوي:</span> بالنسبة لحروف القلقلة الصغرى فقد لوّنت مع إشارة السكون التي عليها، أما بالنسبة للقلقلة الكبرى فقد لونت عند الوقف عليها في رؤوس الآي (دون تلوين الحركة).</li>
      </ul>
      <p><span class="tj-gray tj-bold tj-title">رابعاً - اللون الرمادي:</span></p>
      <p>لما يُكتب ولا يُلفظ من الحروف، كحالة اللام الشمسية لتمييزها عن اللام القمرية، وألف التفريق، والمرسوم خلاف اللفظ، وهمزة الوصل داخل الكلمة، وكرسي الألف المحذوفة (الخنجرية)، والإدغام المتجانس، والإدغام المتقارب، وكذلك النون والتنوين الخاضعتان لحكم الإقلاب (بمساعدة اللون الأخضر لحرف الميم الصغيرة الموجودة فوق حرف النون أو في مكان التنوين)، وكذلك النون والتنوين الخاضعتان لحكم الإدغام بغُنّة (بمساعدة اللون الأخضر للحرف المدغم فيه ـ لأنّ الغنّة عليه).</p>
    </div>`;
  }

  // ---------- 11. À propos, partage et sauvegarde ----------

  shareApp() {
    const appName = "مصحف التجويد - حفص";
    const appUrl = "https://zdig1.gitlab.io/quran";
    const shortMessage = `📖${appName}\n تطبيق متكامل لقراءة القرآن الكريم والاستماع إليه ودراسته.      \n يضم التفسير الميسّر، والبحث المتقدم، بالإضافة إلى قواعد التجويد.\n`;

    if (hasNativeShare()) {
      window.plugins.socialsharing.shareWithOptions(
        {
          message: shortMessage,
          subject: appName,
          url: appUrl,
          chooserTitle: "مشاركة التطبيق",
        },
        () => window.quranApp?.showToast("✅ تم فتح المشاركة"),
        () => window.quranApp?.showToast("❌ تعذر فتح المشاركة")
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
      (navigator.clipboard?.writeText(appUrl) ?? Promise.reject())
        .then(() => {
          window.quranApp?.showToast("📋 تم نسخ رابط التطبيق");
        })
        .catch(() => {
          prompt("انسخ رابط التطبيق:", appUrl);
        });
    }
  }

  showAbout() {
    this._openMenuOverlay("about", () => this.renderAboutContent());
  }

  renderAboutContent() {
    const overlay = this.overlays.about;
    if (!overlay?.content) return;
    const version = encodeURIComponent(window.APP_VERSION || "?");
    overlay.content.innerHTML = `
  <div class="about-content">
    <p class="about-title">
      <strong>مصحف التجويد - حفص</strong>
      <span class="about-version">v${version}</span>
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
      <a href="https://zdig1.gitlab.io/quran/" target="_blank" rel="noopener" class="contact-box-item">
        <span>🌐 زيارة الموقع</span>
      </a>
      <a href="mailto:zdig1.0@gmail.com?subject=quran%20hafs&body=App%20Version:%20${version}%0A---%0A%0A" class="contact-box-item">
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

    if (this._backupBound) return;
    this._backupBound = true;
    document.getElementById("backupExportBtn").addEventListener("click", () => {
      this.closeOverlay("backup");
      this.exportBookmarks();
    });
    document.getElementById("backupImportBtn").addEventListener("click", () => {
      this.closeOverlay("backup");
      this.importBookmarks();
    });
  }

  // ---------- 12. Overlay « aller à » (verset ou page) ----------

  showPageInputDialog() {
    this.closeMenu();
    const A = window.AyaPicker;
    if (!A) return;

    const pos = A.currentPos();
    const overlay = this.lazyLoadOverlay("goTo");
    if (!overlay?.content) return;

    const body = overlay.content;
    body.innerHTML = `
    <div class="aya-label">الانتقال إلى آية</div>
    <div class="goto-row">
      ${A.pairHtml("go", pos)}
      <button type="button" class="confirm-btn ok aya-go" id="goAyaBtn">اذهب</button>
    </div>
    <div class="aya-label">الانتقال إلى صفحة (1-604)</div>
    <div class="page-input-row">
      <input type="tel" id="goPageField" class="search-input"
             inputmode="numeric" pattern="[0-9]*" placeholder="1-604">
      <button type="button" class="confirm-btn ok" id="goPageBtn">اذهب</button>
    </div>`;

    const field = body.querySelector("#goPageField");
    const goAyaBtn = body.querySelector("#goAyaBtn");
    const goPageBtn = body.querySelector("#goPageBtn");

    const safePage = (n) => {
      const p = parseInt(n, 10);
      return AppUtils.isValidPage(p) ? p : 1;
    };

    const pageOf = () => {
      const p = window.quranAudioPlayer?._getPageForAya?.(pos.s, pos.a);
      return AppUtils.isValidPage(p) ? p : null;
    };

    field.value = String(pageOf() || safePage(window.quranApp?.getCurrentPage?.()));

    const selectAll = () => {
      try { field.setSelectionRange(0, field.value.length); }
      catch { field.select?.(); }
    };
    field.addEventListener("focus", selectAll);
    field.addEventListener("click", () => {
      if (document.activeElement === field &&
        field.selectionStart === field.selectionEnd) selectAll();
    });

    A.bindPair(body, "go", pos, () => {
      const pg = pageOf();
      if (pg) {
        field.value = String(pg);
        if (document.activeElement === field) selectAll();
      }
    });

    goAyaBtn.addEventListener("click", () => {
      const page = pageOf();
      if (!page) {
        window.quranApp?.showToast("⚠️ لم يتم العثور على الآية");
        return;
      }
      this.closeOverlay("goTo");
      setTimeout(() => {
        window.quranApp?.goToPage(page);
        window.overlayManager?.flashAya({ s: Number(pos.s), a: Number(pos.a) }, page);
      }, 150);
    });

    const goPage = () => {
      const page = parseInt(field.value, 10);
      if (!AppUtils.isValidPage(page)) {
        window.quranApp?.showToast("⚠️ رقم صفحة غير صالح (1-604)");
        field.focus();
        selectAll();
        return;
      }
      this.closeOverlay("goTo");
      this._refreshBookLayout();
      setTimeout(() => window.quranApp?.goToPage(page), 100);
    };
    goPageBtn.addEventListener("click", goPage);
    field.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); goPage(); }
    });

    this.showOverlay("goTo");

    requestAnimationFrame(() => requestAnimationFrame(() => {
      field.focus();
      selectAll();
    }));
  }

  _refreshBookLayout() {
    if (window.quranReader?.readingMode !== "book") return;
    setTimeout(() => {
      window.quranReader._adjustFooterHeight();
      const img = window.quranReader.elements.pageScroll?.querySelector(".page-wrapper.active img");
      if (img && window.quranReader._applyBookImageStyle) window.quranReader._applyBookImageStyle(img);
    }, 350);
  }

  flashAya(p, page) {
    const player = window.quranAudioPlayer;
    if (!player?.ayaCoordsLoaded || !player.isStopped) return;
    const rects = player._getAyaRects(p.s, p.a);
    if (!rects?.length) return;
    setTimeout(() => {
      const r = window.quranReader;
      if (!r || r.currentPage !== page || !player.isStopped) return;
      const img = r.readingMode === "book" ? r.elements.pageScroll?.querySelector(`.page-wrapper[data-page="${page}"] img`) : null;
      const go = () => {
        if (!player.isStopped) return;
        r.highlightAya(p.s, p.a, rects);
        setTimeout(() => {
          if (player.isStopped) r.clearHighlight();
        }, 3000);
      };
      if (img && !(img.complete && img.naturalWidth > 0)) img.addEventListener("load", go, { once: true });
      else go();
    }, 400);
  }

  // ---------- 13. Gestion générale des overlays ----------

  updateThemeButtonText() {
    const textSpan = this.elements.themeBtn?.querySelector(".menu-text");
    if (textSpan) {
      textSpan.textContent = document.body.classList.contains("night-mode")
        ? "الوضع النهاري"
        : "الوضع الليلي";
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
    AppUtils.emit(APP_EVENTS.overlayOpened, { overlay: name });
  }

  closeOverlay(name) {
    const overlay = this.overlays[name];
    if (!overlay?.element) return;
    overlay.element.classList.remove("show");

    if (name === "audio" && !window.quranAudioPlayer?.isStopped) window.quranAudioPlayer?._showMiniBar();
    if (name === "surahInfo") this._removeSurahInfoKeyboard();

    if (this.currentOverlay === name) this.currentOverlay = null;
    if (!this.currentOverlay) document.body.style.overflow = "";

    if (name === "tafsir" && this._tafsirSavedPage && window.quranReader?.goToPage) {
      setTimeout(() => {
        window.quranReader.goToPage(this._tafsirSavedPage);
        this._tafsirSavedPage = null;
      }, 50);
    }
    AppUtils.emit(APP_EVENTS.overlayClosed, { overlay: name });
  }

  closeCurrentOverlay() {
    if (this.currentOverlay) this.closeOverlay(this.currentOverlay);
  }
}

// ============================================================
//  DÉMARRAGE
// ============================================================

window.overlayManager = new OverlayManager();
if (typeof window !== "undefined") window.OverlayManager = OverlayManager;