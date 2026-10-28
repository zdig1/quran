// ============================================================
//  FICHIER : tafsir-search.js
//  Rôle : données du tafsir (tafsir.json), recherche dans le Coran,
//         interface tafsir (défilement infini, menus sourate / verset /page, police et thème)
// ============================================================


class TafsirSearchManager {
  // ---------- Constructeur ----------

  constructor() {
    this.F = {
      id: "i",
      page: "p",
      sura_n: "s",
      sura: "n",
      aya_n: "a",
      text: "t",
      tfsir: "m",
    };

    this.config = {
      dataUrl: "./data/tafsir.json",
      searchCacheSize: 100,
      pageCacheSize: 20,
      preloadRadius: 2,
    };

    this.data = null;
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;

    this.searchCache = new Map();
    this.pageCache = new Map();

    this.surahsIndex = null;
    this.surahsMap = new Map();

    this.currentTafsirPage = null;
    this.previousTafsirPage = null;
    this.nextTafsirPage = null;

    this.scrollUpdateTimeout = null;
    this.scrollTimeout = null;
    this.scrollHandlers = null;
    this.scrollRAF = null;
    this.isScrolling = false;
    this.isLoadingMore = false;

    this.tafsirUI = null;
    this.searchUI = null;
    this.tafsirUIReady = false;

    this._tafsirFontReady = false;
    this.updatingDropdowns = false;
    this._pickersBound = false;
    this.currentSuraInView = null;

    this.inputElement = null;
    this.resultsElement = null;
  }

  // ---------- 1. Utilitaires ----------

  _sortByQuranOrder(items) {
    return [...items].sort((a, b) => a[this.F.id] - b[this.F.id]);
  }

  _sortByAyaNum(items) {
    return [...items].sort((a, b) => a[this.F.aya_n] - b[this.F.aya_n]);
  }

  _getFirstAyaOfPage(ayat) {
    return ayat?.length ? this._sortByQuranOrder(ayat)[0] : null;
  }

  normalizeArabic(text) {
    if (!text) return "";
    return String(text)
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه");
  }

  _escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  _highlightQuery(text, query) {
    if (!text || !query) return AppUtils.esc(text);

    const escaped = AppUtils.esc(text);
    const normalizedQuery = this.normalizeArabic(query.toLowerCase());
    if (!normalizedQuery) return escaped;

    const variantMap = {
      "ا": "[اأإآٱ]",
      "ي": "[يى]",
      "ه": "[هة]",
    };

    const patternParts = [];
    for (const ch of normalizedQuery) {
      if (variantMap[ch]) {
        patternParts.push(variantMap[ch]);
      } else {
        patternParts.push(this._escapeRegex(ch));
      }
    }
    const pattern = patternParts.join("");

    let regex;
    try {
      regex = new RegExp(`(${pattern})`, "gi");
    } catch {
      return escaped;
    }

    // On enveloppe TOUT (même les chiffres) dans le span
    return escaped.replace(regex, '<span class="search-hit">$1</span>');
  }

  /** Lit un CustomSelect et retourne son entier (ou null si vide/invalide). */
  _readIntSelect(id) {
    return parseInt(CustomSelect.get(id), 10) || null;
  }

  /** Décalage vertical d'un élément par rapport au haut scrollable de son conteneur. */
  _getOffsetTop(el, container) {
    return el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
  }

  // ---------- 2. Chargement des données ----------

  async preload() {
    if (this.isLoaded) return;
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        this.isLoading = true;
        try {
          await this.loadData();
          this.isLoaded = true;
          this.buildSurahsIndex();
        } finally {
          this.isLoading = false;
          this.loadPromise = null;
        }
      })();
    }
    return this.loadPromise;
  }

  async loadData() {
    const response = await fetch(this.config.dataUrl, { cache: "force-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    this.data = await response.json();
    AppUtils.emit("tafsir:loaded", { ayatCount: this.data.length });
    return this.data;
  }

  async ensureLoaded() {
    if (!this.isLoaded) await this.preload();
    return this.data;
  }

  // ---------- 3. Index des sourates ----------

  buildSurahsIndex() {
    if (!this.data?.length) {
      this.surahsIndex = [];
      return;
    }
    this.surahsMap.clear();
    this.data.forEach((aya) => {
      const sura_n = aya[this.F.sura_n];
      if (!this.surahsMap.has(sura_n)) {
        this.surahsMap.set(sura_n, {
          id: sura_n,
          name: aya[this.F.sura],
          page_start: Infinity,
          page_end: -Infinity,
          verses: 0,
        });
      }
      const entry = this.surahsMap.get(sura_n);
      if (aya[this.F.page] < entry.page_start)
        entry.page_start = aya[this.F.page];
      if (aya[this.F.page] > entry.page_end) entry.page_end = aya[this.F.page];
      if (aya[this.F.aya_n] > entry.verses) entry.verses = aya[this.F.aya_n];
    });
    this.surahsIndex = Array.from(this.surahsMap.values()).sort(
      (a, b) => a.id - b.id,
    );
  }

  getSurahsIndex() {
    if (!this.surahsIndex) this.buildSurahsIndex();
    return this.surahsIndex;
  }

  // ---------- 4. Accès aux données ----------

  getFirstAyaForPage(page) {
    const pageNum = parseInt(page, 10);
    if (!this.data || isNaN(pageNum)) return null;
    const ayat = this.getAyatByPage(pageNum);
    const first = this._getFirstAyaOfPage(ayat);
    return first
      ? {
        sura_n: first[this.F.sura_n],
        sura: first[this.F.sura],
        aya_n: first[this.F.aya_n],
        page: first[this.F.page],
        isSuraStart: first[this.F.aya_n] === 1,
        id: first[this.F.id],
        ayatCountOnPage: ayat.length,
      }
      : null;
  }

  getAyatByPage(page) {
    if (!this.data) return [];
    const pageNum = parseInt(page, 10);
    if (this.pageCache.has(pageNum)) return this.pageCache.get(pageNum);
    const filtered = this.data.filter((aya) => aya[this.F.page] === pageNum);
    const sorted = this._sortByQuranOrder(filtered);
    if (this.pageCache.size >= this.config.pageCacheSize) {
      this.pageCache.delete(this.pageCache.keys().next().value);
    }
    this.pageCache.set(pageNum, sorted);
    return sorted;
  }

  getAya(sura_n, aya_n) {
    if (!this.data) return null;
    const suraNum = parseInt(sura_n, 10);
    const ayaNum = parseInt(aya_n, 10);
    const found = this.data.find(
      (aya) => aya[this.F.sura_n] === suraNum && aya[this.F.aya_n] === ayaNum,
    );
    return found
      ? {
        sura_n: found[this.F.sura_n],
        sura: found[this.F.sura],
        aya_n: found[this.F.aya_n],
        text: found[this.F.text],
        page: found[this.F.page],
        tfsir: found[this.F.tfsir],
      }
      : null;
  }

  getAyatBySura(sura_n) {
    if (!this.data) return [];
    const suraNum = parseInt(sura_n, 10);
    const filtered = this.data.filter((aya) => aya[this.F.sura_n] === suraNum);
    return this._sortByAyaNum(filtered);
  }

  // ---------- 5. Recherche ----------

  _emptySearch() {
    return { results: [], stats: { resultsCount: 0, totalSuras: 0 } };
  }

  searchWithStats(query) {
    if (!this.data || !query?.trim()) return this._emptySearch();

    const normalizedQuery = this.normalizeArabic(query.toLowerCase());

    const cacheKey = `alif_exact_${normalizedQuery}`;
    if (this.searchCache.has(cacheKey)) return this.searchCache.get(cacheKey);

    const results = [];
    const surasFound = new Set();

    for (const aya of this.data) {
      const text = aya[this.F.text];
      if (!text) continue;
      const normalizedText = this.normalizeArabic(text.toLowerCase());
      if (!normalizedText.includes(normalizedQuery)) continue;

      surasFound.add(aya[this.F.sura_n]);
      results.push({
        sura_n: aya[this.F.sura_n],
        sura: aya[this.F.sura],
        aya_n: aya[this.F.aya_n],
        text: aya[this.F.text],
        page: aya[this.F.page],
        id: aya[this.F.id],
      });
    }

    const total = results.length;
    const cached = {
      results: this._sortByQuranOrder(results).slice(0, 500),
      stats: { resultsCount: total, totalSuras: surasFound.size }
    };

    this._cacheSearchResult(cacheKey, cached);

    return cached;
  }

  _cacheSearchResult(cacheKey, value) {
    if (this.searchCache.size >= this.config.searchCacheSize) {
      this.searchCache.delete(this.searchCache.keys().next().value);
    }
    this.searchCache.set(cacheKey, value);
  }

  // ---------- 6. Interface de recherche ----------

  _createStatsElement(parent) {
    let statsEl = parent.querySelector(".search-stats");
    if (!statsEl) {
      statsEl = AppUtils.el("div", "search-stats");
      parent.appendChild(statsEl);
    }
    return statsEl;
  }

  _renderStats(statsEl, stats) {
    statsEl.innerHTML = stats
      ? `<div class="search-stats-content">
          <span>نتائج البحث:</span>
          <span class="stat-results">${stats.resultsCount}</span>
          <span>موضع</span>
          <span>في</span>
          <span class="stat-suras">${stats.totalSuras}</span>
          <span>سورة</span>
         </div>`
      : "<div></div>";
  }

  _renderSearchResults(resultsEl, results, query, onAyaClick) {
    if (results.length === 0) {
      resultsEl.innerHTML = `<div class="search-empty">
    <p><b>لا توجد نتائج لــ :</b></p>
    <p>"${AppUtils.esc(query)}"</p>
    <p>جرب 🔍 كلمة بحث أخرى</p>
   </div>`;
      return;
    }

    resultsEl.innerHTML = results.map((item, index) => this._searchItemHtml(item, index, query)).join("");

    resultsEl.querySelectorAll('[data-clickable="true"]').forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const container = el.closest(".item-container");
        if (!container || !onAyaClick) return;
        onAyaClick(container.getAttribute("data-sura"), container.getAttribute("data-aya"));
      });
    });
  }

  _searchItemHtml(item, index, query) {
    return `<div class="item-container item-search" data-sura="${item.sura_n}" data-aya="${item.aya_n}">
    <div class="item-line-1">
      <div class="item-right">
        <span class="item-badge badge">${index + 1}</span>
        <span class="item-title">${item.sura_n}. ${AppUtils.esc(item.sura)}</span>
      </div>
      <div class="item-left">
        <span class="page-tag">${APP_TEXTS.pageShort} ${item.page}</span>
      </div>
    </div>
    <div class="item-line-2 item-search-text" data-clickable="true">${this._highlightQuery(item.text, query)}</div>
  </div>`;
  }

  setupSearchUI(inputEl, resultsEl, onAyaClick) {
    const parent = inputEl?.parentElement;
    if (!inputEl || !resultsEl || !parent) return null;

    this.inputElement = inputEl;
    this.resultsElement = resultsEl;
    const statsEl = this._createStatsElement(parent);

    const reset = () => {
      resultsEl.innerHTML = "";
      this._renderStats(statsEl, null);
    };

    const search = () => {
      const query = inputEl.value;
      if (!this.isLoaded || query.trim().length === 0) {
        reset();
        return;
      }
      const { results, stats } = this.searchWithStats(query);
      this._renderStats(statsEl, stats);
      this._renderSearchResults(resultsEl, results, query, onAyaClick);
    };
    const performSearch = AppUtils.debounce(search, 300);

    inputEl.addEventListener("input", performSearch);
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") performSearch();
    });

    this._renderStats(statsEl, null);
    if (inputEl.value.trim().length > 0) performSearch();

    this.searchUI = {
      performSearch,
      clear: () => {
        inputEl.value = "";
        reset();
      },
      focus: () => {
        try {
          inputEl.focus();
        } catch {
          /* élément non focalisable */
        }
      },
    };
    return this.searchUI;
  }

  // ---------- 7. Interface tafsir — création des éléments ----------

  _createSuraTitleElement(sura_n, suraName, page) {
    const el = AppUtils.el("div", "sura-title-container");
    el.dataset.sura = sura_n;
    el.dataset.page = page;
    el.innerHTML = `<div class="sura-badge">${sura_n}</div><div class="sura-name-kufi">سورة ${AppUtils.esc(suraName)}</div>`;
    return el;
  }

  _createAyaElement(aya, tafsirText) {
    const el = AppUtils.el("div", "tafsir-aya-container");
    el.dataset.sura = aya[this.F.sura_n];
    el.dataset.aya = aya[this.F.aya_n];
    el.dataset.page = aya[this.F.page];
    el.dataset.id = aya[this.F.id];
    el.innerHTML = `<div class="item-search-text"><div class="item-line-2 item-search-text">${AppUtils.esc(aya[this.F.text])}</div><div class="tafsir-explanation">${AppUtils.esc(tafsirText)}</div></div>`;
    return el;
  }

  renderTafsirContent(container, ayat) {
    if (!container) return;
    container.replaceChildren();
    this._insertAyatToContainer(container, ayat, false);
  }

  _insertAyatToContainer(container, ayat, prepend = false) {
    if (!ayat?.length) return;
    const sorted = this._sortByQuranOrder(ayat);
    const fragment = document.createDocumentFragment();

    sorted.forEach((aya) => {
      const sura_n = aya[this.F.sura_n];
      const aya_n = aya[this.F.aya_n];

      if (
        aya_n === 1 &&
        !container.querySelector(`.sura-title-container[data-sura="${sura_n}"]`)
      ) {
        fragment.appendChild(
          this._createSuraTitleElement(
            sura_n,
            aya[this.F.sura],
            aya[this.F.page],
          ),
        );
      }

      const tfsir = aya[this.F.tfsir];
      if (!tfsir) return;
      if (
        container.querySelector(`[data-sura="${sura_n}"][data-aya="${aya_n}"]`)
      )
        return;

      fragment.appendChild(this._createAyaElement(aya, tfsir));
    });

    if (prepend && container.firstChild) {
      container.insertBefore(fragment, container.firstChild);
    } else {
      container.appendChild(fragment);
    }
  }

  appendAyatToContainer(container, ayat) {
    this._insertAyatToContainer(container, ayat, false);
  }

  prependAyatToContainer(container, ayat) {
    this._insertAyatToContainer(container, ayat, true);
  }

  // ---------- 8. Interface tafsir — initialisation et menus ----------

  async initTafsirUI(contentContainer) {
    this.optimizeForMobile();
    this.tafsirUI = { contentContainer };
    await this.ensureLoaded();
    this.initializeTafsirSelectors();

    const currentPage = window.quranApp?.getCurrentPage() || 1;
    const firstAya = this.getFirstAyaForPage(currentPage);
    if (firstAya) {
      this.updateTafsirNavigation(firstAya.sura_n, firstAya.aya_n, currentPage);
      this.syncDropdowns(firstAya.sura_n, firstAya.aya_n, currentPage, "init");
      await this.loadTafsirForPage(currentPage);
      setTimeout(() => this.scrollToFirstAyaOfPage(currentPage), 150);
    } else {
      contentContainer.replaceChildren();
    }

    this.setupInfiniteScroll(contentContainer);
    this.tafsirUIReady = true;
    return this.tafsirUI;
  }

  initializeTafsirSelectors() {
    if (!this.tafsirUI) return;

    CustomSelect.fill(
      "suraSelect",
      this.getSurahsIndex().map((s) => ({
        value: String(s.id),
        label: `${s.id}.${s.name}`,
        onSelect: () => this.handleSuraChange(),
      })),
    );
    CustomSelect.fill("pageSelect", CustomSelect.pageOptions(() => this.handlePageChange()));
    CustomSelect.fill("ayaSelect", []);
    this._bindPickers();
  }

  /** Les 3 menus s'ouvrent en sélecteur plein écran (comme dans le module audio). */
  _bindPickers() {
    if (this._pickersBound || !window.Picker) return;
    this._pickersBound = true;
    const bind = (id, title) =>
      window.Picker.bindButton(document.getElementById(id), `${id}List`, title);
    bind("suraSelect", APP_TEXTS.pickSurah);
    bind("ayaSelect", APP_TEXTS.pickAyah);
    bind("pageSelect", APP_TEXTS.pickPage);
  }

  async _withDropdownLock(fn) {
    if (!this.tafsirUIReady || this.updatingDropdowns) return;
    this.updatingDropdowns = true;
    try { await fn(); }
    finally { this.updatingDropdowns = false; }
  }

  /** Met à jour le menu des versets pour la sourate, puis sélectionne `aya_n`. */
  _setAyaForSura(sura_n, aya_n) {
    this.updateAyaDropdown(this.getAyatBySura(sura_n));
    CustomSelect.set("ayaSelect", aya_n);
  }

  /** Synchronise navigation + menus à partir du premier verset d'une page. */
  _syncFromFirstAya(page, ayaInfo) {
    this.updateTafsirNavigation(ayaInfo[this.F.sura_n], ayaInfo[this.F.aya_n], page);
    this.syncDropdowns(ayaInfo[this.F.sura_n], ayaInfo[this.F.aya_n], page, "init");
  }

  handleSuraChange() {
    return this._withDropdownLock(async () => {
      const sura_n = this._readIntSelect("suraSelect");
      if (!sura_n) return;
      const ayat = this.getAyatBySura(sura_n);
      if (!ayat.length) return;

      const first = ayat[0];
      this._setAyaForSura(sura_n, first[this.F.aya_n]);
      CustomSelect.set("pageSelect", first[this.F.page]);
      this.updateTafsirNavigation(first[this.F.sura_n], first[this.F.aya_n], first[this.F.page]);
      await this.loadTafsirForPage(first[this.F.page]);
      setTimeout(() => this.scrollToFirstAyaOfSura(sura_n), 300);
    });
  }

  handlePageChange() {
    return this._withDropdownLock(async () => {
      const page = this._readIntSelect("pageSelect");
      if (!page) return;
      await this.loadTafsirForPage(page);

      const ayat = this.getAyatByPage(page);
      if (!ayat.length) return;
      const first = this._getFirstAyaOfPage(ayat);
      CustomSelect.set("suraSelect", first[this.F.sura_n]);
      this._setAyaForSura(first[this.F.sura_n], first[this.F.aya_n]);
      this.updateTafsirNavigation(first[this.F.sura_n], first[this.F.aya_n], page);
      setTimeout(() => this.scrollToFirstAyaOfPage(page), 300);
    });
  }

  handleAyaChange() {
    return this._withDropdownLock(async () => {
      const sura_n = this._readIntSelect("suraSelect");
      const aya_n = this._readIntSelect("ayaSelect");
      if (!sura_n || !aya_n) return;

      const found = this.getAyatBySura(sura_n).find((aya) => aya[this.F.aya_n] === aya_n);
      if (!found) return;
      CustomSelect.set("pageSelect", found[this.F.page]);
      this.updateTafsirNavigation(found[this.F.sura_n], found[this.F.aya_n], found[this.F.page]);
      await this.loadTafsirForPage(found[this.F.page]);
      setTimeout(() => this.scrollToAya(found[this.F.sura_n], found[this.F.aya_n]), 300);
    });
  }

  updateAyaDropdown(ayat) {
    CustomSelect.fill(
      "ayaSelect",
      ayat.map((a) => ({
        value: String(a[this.F.aya_n]),
        label: `${APP_TEXTS.ayahWord} ${a[this.F.aya_n]}`,
        onSelect: () => this.handleAyaChange(),
      })),
    );
  }

  syncDropdowns(sura_n, aya_n, page, source = "scroll") {
    if ((this.updatingDropdowns && source !== "init") || !this.tafsirUI) return;
    if (source === "scroll" && this.isScrolling) return;
    this.updatingDropdowns = true;
    try {
      if (sura_n && CustomSelect.get("suraSelect") !== String(sura_n)) {
        CustomSelect.set("suraSelect", sura_n);
        this.updateAyaDropdown(this.getAyatBySura(sura_n));
      }
      if (aya_n) CustomSelect.set("ayaSelect", aya_n);
      if (page) CustomSelect.set("pageSelect", page);
    } finally {
      setTimeout(() => {
        this.updatingDropdowns = false;
      }, 50);
    }
  }

  updateTafsirNavigation(sura_n, aya_n, page) {
    this.currentTafsirPage = parseInt(page, 10);
    this.currentSuraInView = parseInt(sura_n, 10);
  }

  // ---------- 9. Chargement des pages du tafsir ----------

  async loadTafsirForPage(page) {
    if (!this.tafsirUI?.contentContainer) return;
    const { contentContainer } = this.tafsirUI;
    const p = parseInt(page, 10);

    if (contentContainer.querySelector(`[data-page="${p}"]`)) {
      this.scrollToFirstAyaOfPage(p);
      return;
    }

    const r = this.config.preloadRadius;
    let allAyat = [];
    for (let cp = Math.max(1, p - r); cp <= Math.min(APP_CFG.TOTAL_PAGES, p + r); cp++) {
      allAyat = allAyat.concat(this.getAyatByPage(cp));
    }
    this.cleanupPageCache(p);

    if (allAyat.length) {
      this.renderTafsirContent(contentContainer, allAyat);
      const pageAyat = this.getAyatByPage(p);
      if (pageAyat?.length) {
        const first = this._getFirstAyaOfPage(pageAyat);
        this.updateTafsirNavigation(first[this.F.sura_n], first[this.F.aya_n], p);
        this.previousTafsirPage = Math.max(0, p - r - 1);
        this.nextTafsirPage = p + r + 1;
        this.syncDropdowns(first[this.F.sura_n], first[this.F.aya_n], p, "init");
      }
    } else {
      contentContainer.replaceChildren();
    }
  }

  // ---------- 10. Scroll infini ----------

  setupInfiniteScroll(container) {
    if (!container) return;
    if (this.scrollHandlers) {
      this.scrollHandlers.container.removeEventListener(
        "scroll",
        this.scrollHandlers.handler,
      );
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = null;
      }
      if (this.scrollRAF) {
        cancelAnimationFrame(this.scrollRAF);
        this.scrollRAF = null;
      }
    }

    let lastScrollTime = 0;
    let rafPending = false;

    const handler = () => {
      const now = Date.now();
      if (now - lastScrollTime < 50) {
        if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
          this.processScroll(container);
          lastScrollTime = Date.now();
        }, 50);
        return;
      }
      lastScrollTime = now;
      if (!rafPending) {
        rafPending = true;
        this.scrollRAF = requestAnimationFrame(() => {
          this.processScroll(container);
          rafPending = false;
        });
      }
    };

    container.addEventListener("scroll", handler, { passive: true });
    this.scrollHandlers = { container, handler };
  }

  processScroll(container) {
    if (this.isScrolling || this.isLoadingMore) return;
    this.handleScrollPosition(container);
    this.checkAndLoadMorePages(container);
    this.cleanupDistantPages();
  }

  /** Premier verset visible dans le conteneur (ou null). */
  _firstVisibleAya(container, ayaEls) {
    const rect = container.getBoundingClientRect();
    return (
      Array.from(ayaEls).find((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > rect.top && r.top < rect.bottom;
      }) || null
    );
  }

  handleScrollPosition(container) {
    if (!container || this.isScrolling) return;
    const ayaEls = container.querySelectorAll(".tafsir-aya-container");
    if (!ayaEls.length) return;
    const visible = this._firstVisibleAya(container, ayaEls) || ayaEls[ayaEls.length - 1];
    const sura_n = parseInt(visible.dataset.sura, 10);
    const aya_n = parseInt(visible.dataset.aya, 10);
    const page = parseInt(visible.dataset.page, 10);
    clearTimeout(this.scrollUpdateTimeout);
    this.scrollUpdateTimeout = setTimeout(() => {
      requestAnimationFrame(() => {
        this.updateTafsirNavigation(sura_n, aya_n, page);
        this.syncDropdowns(sura_n, aya_n, page, "scroll");
      });
    }, 300);
  }

  async checkAndLoadMorePages(container) {
    if (this.isScrolling || this.isLoadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight <= 0 || clientHeight <= 0) return;
    const nearBottom = scrollTop + clientHeight >= scrollHeight - 300;
    if (nearBottom && this.nextTafsirPage) await this.loadNextPage(container);
    else if (scrollTop <= 300 && this.previousTafsirPage) await this.loadPreviousPage(container);
  }

  async loadNextPage(container) {
    if (!this.nextTafsirPage || this.nextTafsirPage > APP_CFG.TOTAL_PAGES || this.isLoadingMore)
      return;
    this.isLoadingMore = true;
    const page = this.nextTafsirPage;
    try {
      const ayat = this.getAyatByPage(page);
      if (ayat && this.tafsirUI?.contentContainer) {
        this.appendAyatToContainer(container, ayat);
        this.nextTafsirPage = page + 1;
      }
    } catch {
      /* ignoré volontairement */
    }
    setTimeout(() => {
      this.isLoadingMore = false;
    }, 100);
  }

  async loadPreviousPage(container) {
    if (
      !this.previousTafsirPage ||
      this.previousTafsirPage < 1 ||
      this.isLoadingMore
    )
      return;
    this.isLoadingMore = true;
    const page = this.previousTafsirPage;
    try {
      const ayat = this.getAyatByPage(page);
      if (ayat && this.tafsirUI?.contentContainer) {
        const prevHeight = container.scrollHeight;
        this.prependAyatToContainer(container, ayat);
        await AppUtils.nextFrame();
        container.scrollTop += container.scrollHeight - prevHeight;
        this.previousTafsirPage = page - 1;
      }
    } catch {
      /* ignoré volontairement */
    }
    setTimeout(() => {
      this.isLoadingMore = false;
    }, 100);
  }

  cleanupPageCache(currentPage) {
    if (this.pageCache.size <= this.config.pageCacheSize) return;
    const radius = 2 * this.config.preloadRadius;
    const keep = new Set();
    for (let i = -radius; i <= radius; i++) {
      const p = currentPage + i;
      if (p >= 1 && p <= APP_CFG.TOTAL_PAGES) keep.add(p);
    }
    this.pageCache.forEach((_, p) => {
      if (!keep.has(p)) this.pageCache.delete(p);
    });
  }

  cleanupDistantPages() {
    const container = this.tafsirUI?.contentContainer;
    if (!container) return;
    const allAyas = container.querySelectorAll(".tafsir-aya-container");
    let visibleAya = this._firstVisibleAya(container, allAyas);
    if (!visibleAya && allAyas.length) visibleAya = allAyas[Math.floor(allAyas.length / 2)];
    const refPage = visibleAya ? parseInt(visibleAya.dataset.page, 10) : this.currentTafsirPage;
    if (!refPage) return;

    const radius = this.config.preloadRadius + 3;
    const minPage = Math.max(1, refPage - radius);
    const maxPage = Math.min(APP_CFG.TOTAL_PAGES, refPage + radius);

    container.querySelectorAll(".tafsir-aya-container, .sura-title-container").forEach((el) => {
      const p = parseInt(el.dataset.page, 10);
      if (!isNaN(p) && (p < minPage || p > maxPage)) el.remove();
    });

    const pages = [...container.querySelectorAll("[data-page]")].map((e) => +e.dataset.page);
    if (pages.length) {
      this.previousTafsirPage = Math.min(...pages) - 1;
      this.nextTafsirPage = Math.max(...pages) + 1;
    }
  }

  // ---------- 11. Scroll vers une position ----------

  scrollToFirstAyaOfPage(page) {
    const container = this.tafsirUI?.contentContainer;
    if (!container) return;
    setTimeout(() => {
      const el = container.querySelector(`[data-page="${page}"]`);
      if (!el) return;
      this.isScrolling = true;
      const offset = this._getOffsetTop(el, container);
      container.scrollTo({ top: offset - 10, behavior: "auto" });
      if (el.classList.contains("tafsir-aya-container")) {
        const sura_n = parseInt(el.dataset.sura, 10);
        const aya_n = parseInt(el.dataset.aya, 10);
        this.updateTafsirNavigation(sura_n, aya_n, page);
        this.syncDropdowns(sura_n, aya_n, page, "init");
      } else {
        const sura_n = parseInt(el.dataset.sura, 10);
        const first = this.getAyatBySura(sura_n)[0];
        if (first) {
          this.updateTafsirNavigation(sura_n, first[this.F.aya_n], page);
          this.syncDropdowns(sura_n, first[this.F.aya_n], page, "init");
        }
      }
      setTimeout(() => {
        this.isScrolling = false;
      }, 100);
    }, 300);
  }

  _scrollContainerTo(el, offset = 20) {
    const container = this.tafsirUI?.contentContainer;
    if (!container || !el) return;
    const top = this._getOffsetTop(el, container) - offset;
    if ("scrollBehavior" in document.documentElement.style)
      container.scrollTo({ top, behavior: "auto" });
    else
      container.scrollTop = top;
  }

  scrollToFirstAyaOfSura(sura_n) {
    this._scrollContainerTo(this.tafsirUI?.contentContainer?.querySelector(`[data-sura="${sura_n}"]`));
  }

  scrollToAya(sura_n, aya_n) {
    this._scrollContainerTo(this.tafsirUI?.contentContainer?.querySelector(`[data-sura="${sura_n}"][data-aya="${aya_n}"]`));
  }

  // ---------- 12. Optimisation mobile ----------

  optimizeForMobile() {
    const isMobile =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth <= 768;
    if (!isMobile) return;
    this.config.searchCacheSize = 50;
    this.config.pageCacheSize = 10;
    this.config.preloadRadius = 1;
    if (window.devicePixelRatio > 2) {
      this.config.searchCacheSize = 30;
      this.config.pageCacheSize = 5;
    }
    if (window.performance?.memory) {
      const mem = window.performance.memory;
      if (mem.usedJSHeapSize / mem.jsHeapSizeLimit > 0.7) {
        this.config.preloadRadius = 0;
      }
    }
  }

  // ---------- 13. Police et thème du tafsir ----------

  _updateThemeToggleBtn(btn) {
    const isNight = document.body.classList.contains("night-mode");
    btn.textContent = isNight ? "☀️" : "🌙";
    btn.setAttribute("aria-label", isNight ? "الوضع النهاري" : "الوضع الليلي");
  }

  initTafsirFontControls() {
    const container = this.tafsirUI?.contentContainer;
    if (this._tafsirFontReady || !container) return;
    this._tafsirFontReady = true;

    const $ = (id) => document.getElementById(id);
    const DEFAULT = 16, MIN = 12, MAX = 32, STEP = 2, KEY = "tafsir_font_size";
    let size = AppUtils.clamp(parseInt(AppStore.get(KEY), 10) || DEFAULT, MIN, MAX);

    const apply = (n, msg) => {
      size = AppUtils.clamp(n, MIN, MAX);
      container.style.fontSize = `${size}px`;
      AppStore.set(KEY, size);
      window.quranApp?.showToast(msg || `📏 حجم النص: ${size}px`);
    };

    container.style.fontSize = `${size}px`;
    this._updateThemeToggleBtn($("tafsirThemeToggle"));
    $("tafsirFontIncrease").addEventListener("click", () => apply(size + STEP));
    $("tafsirFontDecrease").addEventListener("click", () => apply(size - STEP));
    $("tafsirFontReset").addEventListener("click", () => apply(DEFAULT, "📏 تم إعادة الحجم الافتراضي"));
    $("tafsirThemeToggle").addEventListener("click", () => window.quranApp.toggleTheme());
  }

  // ---------- 14. Overlay de recherche ----------

  async showSearchOverlay() {
    const om = window.overlayManager;
    if (!om) return;

    om.closeMenu();

    if (!(await window.quranApp?.loadTafsir())) return;

    const overlay = om.lazyLoadOverlay("search");
    if (!overlay?.content) return;

    // Injecter le HTML si nécessaire (dans le container dédié)
    if (!overlay.contentGenerated) {
      overlay.content.innerHTML = this._renderSearchUI();
      overlay.contentGenerated = true;
    }

    // Récupérer les éléments injectés
    const input = document.getElementById("searchInput");
    const results = document.getElementById("searchResults");
    if (!input || !results) return;

    om.showOverlay("search");

    if (!overlay.searchReady) {
      this.setupSearchUI(input, results, (sura, aya) => this._goToAya(sura, aya));
      this._setupClearButton(input);
      overlay.searchReady = true;
    }
    setTimeout(() => input.focus(), 100);
  }

  _renderSearchUI() {
    return `
      <div class="search-container flex-col-fill">
        <div class="search-wrapper">
          <input type="text" id="searchInput" class="search-input"
              placeholder="اكتب كلمة للبحث في القرآن الكريم..." autocomplete="off"
              aria-label="كلمة البحث">
          <button type="button" id="clearSearchBtn" class="clear-search-btn hidden"
              aria-label="مسح">✕</button>
        </div>
        <div id="searchResults" class="overlay-body"></div>
      </div>
    `;
  }

  _setupClearButton(input) {
    const clearBtn = document.getElementById("clearSearchBtn");
    if (!clearBtn) return;
    const update = () => clearBtn.classList.toggle("hidden", !input.value);
    clearBtn.addEventListener("click", () => {
      this.searchUI?.clear();
      update();
      input.focus();
    });
    input.addEventListener("input", update);
    update();
  }

  // ---------- 15. Overlay du tafsir ----------

  async showTafsirOverlay() {
    const om = window.overlayManager;
    if (!om) return;

    om.closeMenu();

    if (!(await window.quranApp?.loadTafsir())) return;

    // Sauvegarde de la page courante (restaurée à la fermeture par overlays-manager)
    if (window.quranReader?.getCurrentPage) {
      om._tafsirSavedPage = window.quranReader.getCurrentPage();
    }

    const overlay = om.lazyLoadOverlay("tafsir");
    if (!overlay?.content) return;

    // Injecter les contrôles (une seule fois)
    if (!overlay.contentGenerated) {
      const controlsEl = document.getElementById("tafsirControlsContainer");
      if (controlsEl) controlsEl.innerHTML = this._renderTafsirControls();
      overlay.contentGenerated = true;
    }

    om.showOverlay("tafsir");

    await new Promise(r => setTimeout(r, 50));

    const tafsirContent = document.getElementById("tafsirContentContainer");

    if (tafsirContent && !this.tafsirUIReady) {
      await this.initTafsirUI(tafsirContent);
      this.initTafsirFontControls();
    } else if (this.tafsirUIReady) {
      const currentPage = window.quranApp?.getCurrentPage() || 1;
      await this.loadTafsirForPage(currentPage);

      const firstAya = this.getFirstAyaForPage(currentPage);
      if (firstAya) {
        this.updateTafsirNavigation(firstAya.sura_n, firstAya.aya_n, currentPage);
        this.syncDropdowns(firstAya.sura_n, firstAya.aya_n, currentPage, "init");
        setTimeout(() => this.scrollToFirstAyaOfPage(currentPage), 200);
      }
    }
  }

  _renderTafsirControls() {
    return `
        <div class="tafsir-controls tafsir-container">
            ${CustomSelect.markup("suraSelect", APP_TEXTS.pickSurah)}
            ${CustomSelect.markup("ayaSelect", APP_TEXTS.pickAyah)}
            ${CustomSelect.markup("pageSelect", APP_TEXTS.pickPage)}
            <button type="button" class="btn tafsir-font-btn" id="tafsirThemeToggle" aria-label="تبديل الوضع الليلي">🌙</button>
            <button type="button" class="btn tafsir-font-btn" id="tafsirFontDecrease" aria-label="تصغير حجم النص">−</button>
            <button type="button" class="btn tafsir-font-btn" id="tafsirFontReset" aria-label="إعادة الحجم الافتراضي">⟲</button>
            <button type="button" class="btn tafsir-font-btn" id="tafsirFontIncrease" aria-label="تكبير حجم النص">+</button>
        </div>
    `;
  }

  // ---------- 16. Navigation depuis un verset ----------

  _goToAya(sura, aya) {
    if (!sura || !aya) return;
    const ayaInfo = this.getAya(sura, aya);
    if (!ayaInfo?.page) {
      window.quranApp?.showToast("❌ لم يتم العثور على الآية");
      return;
    }
    window.overlayManager?.closeOverlay("search");
    setTimeout(() => {
      window.quranApp?.goToPage(ayaInfo.page);
      window.quranApp?.showToast(`📖 ${ayaInfo.sura} - الآية ${ayaInfo.aya_n}`);
      window.overlayManager?.flashAya({ s: Number(sura), a: Number(aya) }, ayaInfo.page);
    }, 200);
  }

}

// ============================================================
//  DÉMARRAGE
// ============================================================

window.tafsirManager = new TafsirSearchManager();
setTimeout(() => {
  if (
    !window.tafsirManager.isLoaded &&
    !window.tafsirManager.isLoading &&
    document.visibilityState === "visible"
  ) {
    window.tafsirManager.preload().catch(() => {});
  }
}, 10000);