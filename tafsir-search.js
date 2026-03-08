class TafsirSearchManager {
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
      dataUrl: "data/tafsir.json",
      searchCacheSize: 100,
      pageCacheSize: 20,
      preloadRadius: 2,
      maxConcurrentLoads: 3,
    };

    this.data = null;
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;

    this.searchCache = new Map();
    this.pageCache = new Map();
    this.loadedPages = new Set();

    this.surahsIndex = null;
    this.surahsMap = new Map();

    this.currentTafsirPage = null;
    this.previousTafsirPage = null;
    this.nextTafsirPage = null;
    this.currentSuraInView = null;

    this.scrollUpdateTimeout = null;
    this.scrollTimeout = null;
    this.scrollHandlers = null;
    this.scrollRAF = null;
    this.isScrolling = false;
    this.isLoadingMore = false;
    this.lastScrollTime = 0;

    this.tafsirUI = null;
    this.searchUI = null;
    this.tafsirUIReady = false;

    this.stats = { totalAyat: 0, totalSuras: 0, loadedPages: 0 };
    this.updatingDropdowns = false;

    this._suraChangeHandler = null;
    this._pageChangeHandler = null;
    this._ayaChangeHandler = null;

    this.fontSizeObserver = null;
    this.themeChangeHandler = null;
    this.lastResults = "";

    this.inputElement = null;
    this.resultsElement = null;
  }

  // ============================================
  // UTILITAIRES
  // ============================================

  escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  _sortByQuranOrder(items) {
    return [...items].sort((a, b) => a[this.F.id] - b[this.F.id]);
  }

  _sortByAyaNum(items) {
    return [...items].sort((a, b) => a[this.F.aya_n] - b[this.F.aya_n]);
  }

  _getFirstAyaOfPage(ayat) {
    return ayat?.length ? this._sortByQuranOrder(ayat)[0] : null;
  }

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================

  async preload() {
    if (this.isLoaded) return;
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        this.isLoading = true;
        try {
          await this.loadData();
          this.isLoaded = true;
          this.buildSurahsIndex();
        } catch (err) {
          throw err;
        } finally {
          this.isLoading = false;
          this.loadPromise = null;
        }
      })();
    }
    return this.loadPromise;
  }

  async loadData() {
    try {
      const response = await fetch(this.config.dataUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.data = await response.json();
      this.initializeDataStructures();
      window.dispatchEvent(
        new CustomEvent("tafsir:loaded", {
          detail: { ayatCount: this.data.length },
        }),
      );
      return this.data;
    } catch (err) {
      throw err;
    }
  }

  initializeDataStructures() {
    if (!this.data?.length) return;
    this.stats.totalAyat = this.data.length;
    const suras = new Set();
    this.data.forEach((aya) => {
      suras.add(aya[this.F.sura_n]);
      if (aya[this.F.page]) this.loadedPages.add(aya[this.F.page]);
    });
    this.stats.totalSuras = suras.size;
    this.stats.loadedPages = this.loadedPages.size;
  }

  async ensureLoaded() {
    if (!this.isLoaded) await this.preload();
    return this.data;
  }

  // ============================================
  // INDEX DES SOURATES
  // ============================================

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

  // ============================================
  // ACCÈS AUX DONNÉES
  // ============================================

  getFirstAyaForPage(page) {
    const pageNum = parseInt(page);
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
    const pageNum = parseInt(page);
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
    const suraNum = parseInt(sura_n);
    const ayaNum = parseInt(aya_n);
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

  getTafsir(sura_n, aya_n) {
    const aya = this.getAya(sura_n, aya_n);
    return aya ? { ...aya, hasTafsir: !!aya.tfsir } : null;
  }

  getAyatBySura(sura_n) {
    if (!this.data) return [];
    const suraNum = parseInt(sura_n);
    const filtered = this.data.filter((aya) => aya[this.F.sura_n] === suraNum);
    return this._sortByAyaNum(filtered);
  }

  // ============================================
  // RECHERCHE
  // ============================================

  searchWithStats(query) {
    if (!this.data || !query?.trim())
      return { results: [], stats: { resultsCount: 0, totalSuras: 0 } };

    const normalized = query.toLowerCase();
    const cacheKey = `combined_${normalized}`;
    if (this.searchCache.has(cacheKey)) return this.searchCache.get(cacheKey);

    const results = [];
    const surasFound = new Set();
    let totalCount = 0;

    for (const aya of this.data) {
      if (!aya[this.F.text]?.toLowerCase().includes(normalized)) continue;
      totalCount++;
      surasFound.add(aya[this.F.sura_n]);
      if (results.length < 1000) {
        results.push({
          sura_n: aya[this.F.sura_n],
          sura: aya[this.F.sura],
          aya_n: aya[this.F.aya_n],
          text: aya[this.F.text],
          page: aya[this.F.page],
          id: aya[this.F.id],
        });
      }
    }

    const cached = {
      results: this._sortByQuranOrder(results).slice(0, 500),
      stats: { resultsCount: totalCount, totalSuras: surasFound.size },
    };

    if (this.searchCache.size >= this.config.searchCacheSize) {
      this.searchCache.delete(this.searchCache.keys().next().value);
    }
    this.searchCache.set(cacheKey, cached);
    return cached;
  }

  search(query) {
    return this.searchWithStats(query).results;
  }

  getSearchStats(query) {
    return this.searchWithStats(query).stats;
  }

  // ============================================
  // UI RECHERCHE
  // ============================================

  _createStatsElement(parent) {
    let statsEl = parent.querySelector(".search-stats");
    if (!statsEl) {
      statsEl = document.createElement("div");
      statsEl.className = "search-stats";
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
      <p>"${this.escapeHtml(query)}"</p>
      <p>جرب 🔍 كلمة بحث أخرى</p>
    </div>`;
      this.lastResults = resultsEl.innerHTML;
      return;
    }

    let html = "";
    results.forEach((item, index) => {
      html += `<div class="item-container item-search" data-sura="${item.sura_n}" data-aya="${item.aya_n}">
      <div class="item-line-1">
        <div class="item-right">
          <span class="item-badge">${index + 1}</span>
          <span class="item-title">${item.sura_n}. ${this.escapeHtml(item.sura)}</span>
        </div>
        <div class="item-left">
          <span class="item-tag">ص ${item.page}</span>
        </div>
      </div>
      <div class="item-line-2 item-search-text" data-clickable="true">${this.escapeHtml(item.text)}</div>
    </div>`;
    });

    resultsEl.innerHTML = html;
    this.lastResults = html;

    // Attacher l'écouteur uniquement sur les éléments cliquables (ligne 2)
    resultsEl.querySelectorAll('[data-clickable="true"]').forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation(); // Empêche toute propagation inutile
        const container = el.closest(".item-container");
        if (!container) return;
        const sura = container.getAttribute("data-sura");
        const aya = container.getAttribute("data-aya");
        if (onAyaClick) onAyaClick(sura, aya);
      });
    });
  }

  setupSearchUI(inputEl, resultsEl, onAyaClick) {
    if (!inputEl || !resultsEl) return null;

    this.inputElement = inputEl;
    this.resultsElement = resultsEl;
    inputEl.className = "search-input";
    inputEl.placeholder = "اكتب كلمة للبحث في القرآن الكريم...";

    const parent = inputEl.parentElement;
    if (!parent) return null;

    const statsEl = this._createStatsElement(parent);
    let searchTimeout = null;
    let currentStats = null;

    const updateStats = () => this._renderStats(statsEl, currentStats);

    const performSearch = () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        if (!this.isLoaded) {
          resultsEl.innerHTML = "";
          currentStats = null;
          updateStats();
          return;
        }

        const query = inputEl.value;
        if (query.trim().length === 0) {
          resultsEl.innerHTML = "";
          currentStats = null;
          updateStats();
          return;
        }

        const { results, stats } = this.searchWithStats(query);
        currentStats = stats;
        updateStats();
        this._renderSearchResults(resultsEl, results, query, onAyaClick);
      }, 300);
    };

    // Clone pour éviter les doublons d'écouteurs
    const clonedInput = inputEl.cloneNode(true);
    inputEl.parentNode.replaceChild(clonedInput, inputEl);
    inputEl = clonedInput;
    this.inputElement = clonedInput;

    inputEl.addEventListener("input", performSearch);
    inputEl.addEventListener("keypress", (e) => {
      if (e.key === "Enter") performSearch();
    });

    setTimeout(() => {
      try {
        inputEl.focus();
      } catch (e) {}
    }, 100);
    updateStats();
    if (inputEl.value.trim().length > 0) performSearch();

    this.searchUI = {
      performSearch,
      clear: () => {
        inputEl.value = "";
        resultsEl.innerHTML = "";
        currentStats = null;
        updateStats();
        this.lastResults = "";
      },
      focus: () => {
        try {
          inputEl.focus();
        } catch (e) {}
      },
    };

    return this.searchUI;
  }

  clearSearch() {
    if (this.resultsElement) this.resultsElement.innerHTML = "";
    if (this.inputElement) this.inputElement.value = "";
    this.lastResults = "";
  }

  // ============================================
  // UI TAFSIR — CRÉATION D'ÉLÉMENTS DOM
  // ============================================

  _createSuraTitleElement(sura_n, suraName, page) {
    const el = document.createElement("div");
    el.className = "sura-title-container";
    el.dataset.sura = sura_n;
    el.dataset.page = page;
    el.innerHTML = `<div class="sura-badge">${sura_n}</div><div class="sura-name-kufi">سورة ${this.escapeHtml(suraName)}</div>`;
    return el;
  }

  _createAyaElement(aya, tafsirText) {
    const el = document.createElement("div");
    el.className = "tafsir-aya-container";
    el.dataset.sura = aya[this.F.sura_n];
    el.dataset.aya = aya[this.F.aya_n];
    el.dataset.page = aya[this.F.page];
    el.dataset.id = aya[this.F.id];
    el.innerHTML = `<div class="item-search-text"><div class="item-line-2 item-search-text">${this.escapeHtml(aya[this.F.text])}</div><div class="tafsir-explanation">${this.escapeHtml(tafsirText)}</div></div>`;
    return el;
  }

  renderTafsirContent(container, ayat) {
    if (!container) return;
    container.innerHTML = "";
    if (!ayat?.length) return;
    const sorted = this._sortByQuranOrder(ayat);
    const addedSuras = new Set();
    sorted.forEach((aya) => {
      if (aya[this.F.aya_n] === 1 && !addedSuras.has(aya[this.F.sura_n])) {
        container.appendChild(
          this._createSuraTitleElement(
            aya[this.F.sura_n],
            aya[this.F.sura],
            aya[this.F.page],
          ),
        );
        addedSuras.add(aya[this.F.sura_n]);
      }
      const tafsir = this.getTafsir(aya[this.F.sura_n], aya[this.F.aya_n]);
      if (!tafsir?.tfsir) return;
      container.appendChild(this._createAyaElement(aya, tafsir.tfsir));
    });
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

      const tafsir = this.getTafsir(sura_n, aya_n);
      if (!tafsir?.tfsir) return;
      if (
        container.querySelector(`[data-sura="${sura_n}"][data-aya="${aya_n}"]`)
      )
        return;

      fragment.appendChild(this._createAyaElement(aya, tafsir.tfsir));
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

  // ============================================
  // UI TAFSIR — INITIALISATION
  // ============================================

  async initTafsirUI(
    suraSelect,
    ayaSelect,
    pageSelect,
    contentContainer,
    onPageChange,
    onAyaClick,
  ) {
    this.optimizeForMobile();
    this.tafsirUI = {
      suraSelect,
      ayaSelect,
      pageSelect,
      contentContainer,
      onPageChange,
      onAyaClick,
    };
    await this.ensureLoaded();
    this.initializeTafsirSelectors();
    this.initTafsirFontControls();

    const currentPage = window.quranApp?.getCurrentPage() || 1;
    const firstAya = this.getFirstAyaForPage(currentPage);

    if (firstAya) {
      this.updateTafsirNavigation(firstAya.sura_n, firstAya.aya_n, currentPage);
      this.syncDropdowns(firstAya.sura_n, firstAya.aya_n, currentPage, "init");
      await this.loadTafsirForPage(currentPage);
      setTimeout(() => this.scrollToFirstAyaOfPage(currentPage), 150);
    } else {
      contentContainer.innerHTML = "";
    }

    if (contentContainer) this.setupInfiniteScroll(contentContainer);
    this.tafsirUIReady = true;
    return this.tafsirUI;
  }

  initializeTafsirSelectors() {
    if (!this.tafsirUI) return;
    const { suraSelect, ayaSelect, pageSelect } = this.tafsirUI;
    if (!suraSelect || !ayaSelect || !pageSelect) return;

    if (this._suraChangeHandler)
      suraSelect.removeEventListener("change", this._suraChangeHandler);
    if (this._pageChangeHandler)
      pageSelect.removeEventListener("change", this._pageChangeHandler);
    if (this._ayaChangeHandler)
      ayaSelect.removeEventListener("change", this._ayaChangeHandler);

    this._suraChangeHandler = () => this.handleSuraChange();
    this._pageChangeHandler = () => this.handlePageChange();
    this._ayaChangeHandler = () => this.handleAyaChange();

    suraSelect.addEventListener("change", this._suraChangeHandler);
    pageSelect.addEventListener("change", this._pageChangeHandler);
    ayaSelect.addEventListener("change", this._ayaChangeHandler);

    suraSelect.innerHTML = '<option value="">اختر السورة</option>';
    this.getSurahsIndex().forEach((sura) => {
      const opt = document.createElement("option");
      opt.value = sura.id;
      opt.textContent = `${sura.id}. ${sura.name}`;
      suraSelect.appendChild(opt);
    });

    pageSelect.innerHTML = '<option value="">اختر الصفحة</option>';
    for (let p = 1; p <= 604; p++) {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = `الصفحة ${p}`;
      pageSelect.appendChild(opt);
    }
  }

  async handleSuraChange() {
    if (!this.tafsirUIReady || this.updatingDropdowns) return;
    this.updatingDropdowns = true;
    const sura_n = this.tafsirUI.suraSelect.value;
    if (sura_n) {
      const ayat = this.getAyatBySura(parseInt(sura_n));
      if (ayat.length) {
        const first = ayat[0];
        this.updateAyaDropdown(ayat);
        this.tafsirUI.ayaSelect.value = first[this.F.aya_n];
        this.tafsirUI.pageSelect.value = first[this.F.page];
        this.updateTafsirNavigation(
          first[this.F.sura_n],
          first[this.F.aya_n],
          first[this.F.page],
        );
        await this.loadTafsirForPage(first[this.F.page]);
        setTimeout(() => this.scrollToFirstAyaOfSura(parseInt(sura_n)), 300);
      }
    }
    this.updatingDropdowns = false;
  }

  async handlePageChange() {
    if (!this.tafsirUIReady || this.updatingDropdowns) return;
    this.updatingDropdowns = true;
    const page = this.tafsirUI.pageSelect.value;
    if (page) {
      await this.loadTafsirForPage(page);
      const ayat = this.getAyatByPage(parseInt(page));
      if (ayat.length) {
        const first = this._getFirstAyaOfPage(ayat);
        this.tafsirUI.suraSelect.value = first[this.F.sura_n];
        this.updateAyaDropdown(this.getAyatBySura(first[this.F.sura_n]));
        this.tafsirUI.ayaSelect.value = first[this.F.aya_n];
        this.updateTafsirNavigation(
          first[this.F.sura_n],
          first[this.F.aya_n],
          page,
        );
        setTimeout(() => this.scrollToFirstAyaOfPage(parseInt(page)), 300);
      }
    }
    this.updatingDropdowns = false;
  }

  async handleAyaChange() {
    if (!this.tafsirUIReady || this.updatingDropdowns) return;
    this.updatingDropdowns = true;
    const sura_n = this.tafsirUI.suraSelect.value;
    const aya_n = this.tafsirUI.ayaSelect.value;
    if (sura_n && aya_n) {
      const found = this.getAyatBySura(parseInt(sura_n)).find(
        (aya) => aya[this.F.aya_n] === parseInt(aya_n),
      );
      if (found) {
        this.tafsirUI.pageSelect.value = found[this.F.page];
        this.updateTafsirNavigation(
          found[this.F.sura_n],
          found[this.F.aya_n],
          found[this.F.page],
        );
        await this.loadTafsirForPage(found[this.F.page]);
        setTimeout(
          () => this.scrollToAya(found[this.F.sura_n], found[this.F.aya_n]),
          300,
        );
      }
    }
    this.updatingDropdowns = false;
  }

  updateAyaDropdown(ayat) {
    const select = this.tafsirUI.ayaSelect;
    if (!select) return;
    select.innerHTML = '<option value="">اختر الآية</option>';
    ayat.forEach((aya) => {
      const opt = document.createElement("option");
      opt.value = aya[this.F.aya_n];
      opt.textContent = `الآية ${aya[this.F.aya_n]}`;
      select.appendChild(opt);
    });
  }

  syncDropdowns(sura_n, aya_n, page, source = "scroll") {
    if ((this.updatingDropdowns && source !== "init") || !this.tafsirUI) return;
    if (source === "scroll" && this.isScrolling) return;
    this.updatingDropdowns = true;
    const { suraSelect, ayaSelect, pageSelect } = this.tafsirUI;
    try {
      if (sura_n && suraSelect.value != sura_n) {
        suraSelect.value = sura_n;
        const ayat = this.getAyatBySura(sura_n);
        ayaSelect.innerHTML = '<option value="">اختر الآية</option>';
        ayat.forEach((aya) => {
          const opt = document.createElement("option");
          opt.value = aya[this.F.aya_n];
          opt.textContent = `الآية ${aya[this.F.aya_n]}`;
          ayaSelect.appendChild(opt);
        });
      }
      if (aya_n && ayaSelect.value != aya_n) ayaSelect.value = aya_n;
      if (page && pageSelect.value != page) pageSelect.value = page;
    } finally {
      setTimeout(() => {
        this.updatingDropdowns = false;
      }, 50);
    }
  }

  updateTafsirNavigation(sura_n, aya_n, page) {
    this.currentTafsirPage = parseInt(page);
    this.previousTafsirPage = Math.max(1, this.currentTafsirPage - 1);
    this.nextTafsirPage = Math.min(604, this.currentTafsirPage + 1);
    this.currentSuraInView = parseInt(sura_n);
  }

  // ============================================
  // CHARGEMENT DES PAGES TAFSIR
  // ============================================

  async loadTafsirForPage(page) {
    if (!this.tafsirUI?.contentContainer) return;
    const { contentContainer } = this.tafsirUI;
    await this.smartPreloadAround(page);

    const cachedPages = Array.from(this.pageCache.keys()).sort((a, b) => a - b);
    const pageIndex = cachedPages.indexOf(parseInt(page));
    if (pageIndex === -1) {
      contentContainer.innerHTML = "";
      return;
    }

    const from = Math.max(0, pageIndex - this.config.preloadRadius);
    const to = Math.min(
      cachedPages.length - 1,
      pageIndex + this.config.preloadRadius,
    );
    let allAyat = [];
    cachedPages.slice(from, to + 1).forEach((p) => {
      const ayat = this.pageCache.get(p);
      if (ayat) allAyat = allAyat.concat(ayat);
    });

    allAyat = this._sortByQuranOrder(allAyat);

    if (allAyat.length) {
      this.renderTafsirContent(contentContainer, allAyat);
      const pageAyat = this.getAyatByPage(page);
      if (pageAyat?.length) {
        const first = this._getFirstAyaOfPage(pageAyat);
        this.updateTafsirNavigation(
          first[this.F.sura_n],
          first[this.F.aya_n],
          page,
        );
        this.syncDropdowns(
          first[this.F.sura_n],
          first[this.F.aya_n],
          page,
          "init",
        );
      }
    } else {
      contentContainer.innerHTML = "";
    }
  }

  // ============================================
  // SCROLL INFINI
  // ============================================

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
      if (now - lastScrollTime < 150) {
        if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
          this.processScroll(container);
          lastScrollTime = Date.now();
        }, 150);
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

  handleScrollPosition(container) {
    if (!container || this.isScrolling) return;
    const ayaEls = container.querySelectorAll(".tafsir-aya-container");
    if (!ayaEls.length) return;

    const rect = container.getBoundingClientRect();
    const top = rect.top;
    const threshold = top + rect.height * 0.4;
    let visible = null;

    for (let i = ayaEls.length - 1; i >= 0; i--) {
      const el = ayaEls[i];
      const elRect = el.getBoundingClientRect();
      const mid = elRect.top + elRect.height / 2;
      if (mid >= top && mid <= threshold) {
        visible = el;
        break;
      }
      if (elRect.bottom <= top) {
        visible = visible || el;
        break;
      }
    }

    if (!visible && ayaEls.length) visible = ayaEls[0];
    if (!visible) return;

    const sura_n = parseInt(visible.dataset.sura);
    const aya_n = parseInt(visible.dataset.aya);
    const page = parseInt(visible.dataset.page);

    clearTimeout(this.scrollUpdateTimeout);
    this.scrollUpdateTimeout = setTimeout(() => {
      requestAnimationFrame(() => {
        this.updateTafsirNavigation(sura_n, aya_n, page);
        this.syncDropdowns(sura_n, aya_n, page, "scroll");
      });
    }, 100);
  }

  async checkAndLoadMorePages(container) {
    if (this.isScrolling || this.isLoadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight <= 0 || clientHeight <= 0) return;
    if (scrollTop + clientHeight >= 0.8 * scrollHeight && this.nextTafsirPage) {
      await this.loadNextPage(container);
    } else if (
      scrollTop <= 0.1 * scrollHeight &&
      this.previousTafsirPage &&
      this.previousTafsirPage > 1
    ) {
      await this.loadPreviousPage(container);
    }
  }

  async loadNextPage(container) {
    if (!this.nextTafsirPage || this.nextTafsirPage > 604 || this.isLoadingMore)
      return;
    this.isLoadingMore = true;
    const page = this.nextTafsirPage;
    try {
      if (!this.pageCache.has(page)) await this.loadPageToCache(page);
      const ayat = this.pageCache.get(page);
      if (ayat && this.tafsirUI?.contentContainer) {
        this.appendAyatToContainer(container, ayat);
        this.nextTafsirPage = Math.min(604, page + 1);
        this.cleanupDistantPages();
      }
    } catch (err) {}
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
      if (!this.pageCache.has(page)) await this.loadPageToCache(page);
      const ayat = this.pageCache.get(page);
      if (ayat && this.tafsirUI?.contentContainer) {
        const prevHeight = container.scrollHeight;
        this.prependAyatToContainer(container, ayat);
        container.scrollTop += container.scrollHeight - prevHeight;
        this.previousTafsirPage = Math.max(1, page - 1);
        this.cleanupDistantPages();
      }
    } catch (err) {}
    setTimeout(() => {
      this.isLoadingMore = false;
    }, 100);
  }

  async smartPreloadAround(page) {
    if (!this.isLoaded) await this.ensureLoaded();
    const pageNum = parseInt(page);
    const toLoad = new Set([pageNum]);
    for (let i = 1; i <= this.config.preloadRadius; i++) {
      if (pageNum - i >= 1) toLoad.add(pageNum - i);
      if (pageNum + i <= 604) toLoad.add(pageNum + i);
    }
    const missing = Array.from(toLoad).filter((p) => !this.pageCache.has(p));
    for (let i = 0; i < missing.length; i += this.config.maxConcurrentLoads) {
      const batch = missing.slice(i, i + this.config.maxConcurrentLoads);
      await Promise.all(batch.map((p) => this.loadPageToCache(p)));
    }
    this.cleanupPageCache(pageNum);
  }

  async loadPageToCache(page) {
    if (!this.data) await this.ensureLoaded();
    return this.getAyatByPage(page);
  }

  cleanupPageCache(currentPage) {
    if (this.pageCache.size <= this.config.pageCacheSize) return;
    const radius = 2 * this.config.preloadRadius;
    const keep = new Set();
    for (let i = -radius; i <= radius; i++) {
      const p = currentPage + i;
      if (p >= 1 && p <= 604) keep.add(p);
    }
    this.pageCache.forEach((_, p) => {
      if (!keep.has(p)) this.pageCache.delete(p);
    });
  }

  cleanupDistantPages() {
    if (!this.tafsirUI?.contentContainer || !this.currentTafsirPage) return;
    const container = this.tafsirUI.contentContainer;
    const radius = this.config.preloadRadius + 1;
    const minPage = Math.max(1, this.currentTafsirPage - radius);
    const maxPage = Math.min(604, this.currentTafsirPage + radius);
    container.querySelectorAll("[data-page]").forEach((el) => {
      const p = parseInt(el.dataset.page);
      if (!isNaN(p) && (p < minPage || p > maxPage)) el.remove();
    });
  }

  // ============================================
  // SCROLL VERS UNE POSITION
  // ============================================

  scrollToFirstAyaOfPage(page) {
    const container = this.tafsirUI?.contentContainer;
    if (!container) return;
    setTimeout(() => {
      const el = container.querySelector(`[data-page="${page}"]`);
      if (!el) return;
      this.isScrolling = true;
      const offset =
        el.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop;
      container.scrollTop = offset;
      if (el.classList.contains("tafsir-aya-container")) {
        const sura_n = parseInt(el.dataset.sura);
        const aya_n = parseInt(el.dataset.aya);
        this.updateTafsirNavigation(sura_n, aya_n, page);
        this.syncDropdowns(sura_n, aya_n, page, "scroll");
      } else {
        const sura_n = parseInt(el.dataset.sura);
        const first = this.getAyatBySura(sura_n)[0];
        if (first) {
          this.updateTafsirNavigation(sura_n, first[this.F.aya_n], page);
          this.syncDropdowns(sura_n, first[this.F.aya_n], page, "scroll");
        }
      }
      setTimeout(() => {
        this.isScrolling = false;
      }, 100);
    }, 100);
  }

  scrollToFirstAyaOfSura(sura_n) {
    const container = this.tafsirUI?.contentContainer;
    if (!container) return;
    const el = container.querySelector(`[data-sura="${sura_n}"]`);
    if (!el) return;
    const top =
      el.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      20;
    if ("scrollBehavior" in document.documentElement.style) {
      container.scrollTo({ top, behavior: "smooth" });
    } else {
      container.scrollTop = top;
    }
  }

  scrollToAya(sura_n, aya_n) {
    const container = this.tafsirUI?.contentContainer;
    if (!container) return;
    const el = container.querySelector(
      `[data-sura="${sura_n}"][data-aya="${aya_n}"]`,
    );
    if (!el) return;
    const top =
      el.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      20;
    if ("scrollBehavior" in document.documentElement.style) {
      container.scrollTo({ top, behavior: "smooth" });
    } else {
      container.scrollTop = top;
    }
  }

  // ============================================
  // OPTIMISATION MOBILE
  // ============================================

  optimizeForMobile() {
    const isMobile =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth <= 768;
    if (!isMobile) return;
    this.config.searchCacheSize = 50;
    this.config.pageCacheSize = 10;
    this.config.preloadRadius = 1;
    this.config.maxConcurrentLoads = 2;
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

  // ============================================
  // CONTRÔLES POLICE ET THÈME TAFSIR
  // ============================================

  _applyFontSize(container, size) {
    container.style.fontSize = size + "px";
    container
      .querySelectorAll(
        ".item-search-text, .tafsir-explanation, .sura-name-kufi",
      )
      .forEach((el) => {
        el.style.fontSize = size + "px";
      });
  }

  _updateThemeToggleBtn(btn) {
    const isNight = document.body.classList.contains("night-mode");
    btn.textContent = isNight ? "☀️" : "🌙";
    btn.setAttribute("aria-label", isNight ? "الوضع النهاري" : "الوضع الليلي");
  }

  _setupFontSizeObserver(container, getFontSize) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type !== "childList" || !mutation.addedNodes.length)
          return;
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          const selector =
            ".item-search-text, .tafsir-explanation, .sura-name-kufi";
          if (node.matches?.(selector))
            node.style.fontSize = getFontSize() + "px";
          node.querySelectorAll?.(selector).forEach((el) => {
            el.style.fontSize = getFontSize() + "px";
          });
        });
      });
    });
    observer.observe(container, { childList: true, subtree: true });
    return observer;
  }

  initTafsirFontControls() {
    requestAnimationFrame(() => {
      if (this.fontSizeObserver) {
        this.fontSizeObserver.disconnect();
        this.fontSizeObserver = null;
      }
      if (this.themeChangeHandler) {
        window.removeEventListener(
          "quran:themeChanged",
          this.themeChangeHandler,
        );
        this.themeChangeHandler = null;
      }

      const btnDecrease = document.getElementById("tafsirFontDecrease");
      const btnIncrease = document.getElementById("tafsirFontIncrease");
      const btnReset = document.getElementById("tafsirFontReset");
      const btnTheme = document.getElementById("tafsirThemeToggle");
      const container = this.tafsirUI?.contentContainer;

      if (!btnDecrease || !btnIncrease || !btnReset || !btnTheme || !container)
        return;

      let fontSize = Math.min(
        32,
        Math.max(12, parseInt(localStorage.getItem("tafsir_font_size")) || 16),
      );
      this._applyFontSize(container, fontSize);
      this._updateThemeToggleBtn(btnTheme);

      // Supprimer le clonage des boutons
      btnIncrease.addEventListener("click", () => {
        fontSize = Math.min(32, fontSize + 2);
        this._applyFontSize(container, fontSize);
        localStorage.setItem("tafsir_font_size", fontSize);
        window.quranApp?.showToast(`📏 حجم النص: ${fontSize}px`);
      });

      btnDecrease.addEventListener("click", () => {
        fontSize = Math.max(12, fontSize - 2);
        this._applyFontSize(container, fontSize);
        localStorage.setItem("tafsir_font_size", fontSize);
        window.quranApp?.showToast(`📏 حجم النص: ${fontSize}px`);
      });

      btnReset.addEventListener("click", () => {
        fontSize = 16;
        this._applyFontSize(container, fontSize);
        localStorage.setItem("tafsir_font_size", fontSize);
        window.quranApp?.showToast("📏 تم إعادة الحجم الافتراضي");
      });

      btnTheme.addEventListener("click", () => {
        if (
          window.quranApp &&
          typeof window.quranApp.toggleTheme === "function"
        ) {
          window.quranApp.toggleTheme();
        } else {
          document.body.classList.toggle("night-mode");
          localStorage.setItem(
            "quran_theme",
            document.body.classList.contains("night-mode") ? "night" : "light",
          );
        }
        this._updateThemeToggleBtn(btnTheme);
      });

      this.themeChangeHandler = () => this._updateThemeToggleBtn(btnTheme);
      window.addEventListener("quran:themeChanged", this.themeChangeHandler);
      this.fontSizeObserver = this._setupFontSizeObserver(
        container,
        () => fontSize,
      );
    });
  }
}

// ============================================
// INITIALISATION
// ============================================

window.tafsirManager = new TafsirSearchManager();
if (typeof window !== "undefined") {
  window.TafsirSearchManager = TafsirSearchManager;
}

setTimeout(() => {
  if (
    !window.tafsirManager.isLoaded &&
    !window.tafsirManager.isLoading &&
    document.visibilityState === "visible"
  ) {
    window.tafsirManager.preload().catch(() => {});
  }
}, 10000);
