// ============================================================
//  FICHIER : calculator.js
//  Rôle : source de vérité du mushaf (sourates, hizbs, juz, sajdas)
//         et index par page (sourate, hizb, juz de chacune des 604 pages)
// ============================================================

//  1. QURANCALCULATOR

class QuranCalculator {
  // ---------- Constructeur ----------

  constructor() {
    this.data = null;
    this.isLoaded = false;
    this._loading = null;
    this.pageMap = new Array(APP_CFG.TOTAL_PAGES + 1);

    this._surahs = [];
    this._surahById = new Map();
    this._sajdaSet = new Set();
    this._juzBySurahId = new Map();
  }

  // ---------- Chargement ----------

  load() {
    if (this.isLoaded) return Promise.resolve(this.data);
    if (!this._loading) {
      this._loading = this._fetchData().catch((err) => {
        this._loading = null;
        throw err;
      });
    }
    return this._loading;
  }

  async _fetchData() {
    const response = await fetch("./data/quran.json", { cache: "force-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    this.data = await response.json();
    this.buildPageIndex();
    this.isLoaded = true;
    return this.data;
  }

  // ---------- Index des pages ----------

  _propagateIndex(indexData, valueKey, flagKey, pageMap) {
    let currentValue = 1;
    let idx = 0;
    for (let p = 1; p <= APP_CFG.TOTAL_PAGES; p++) {
      while (indexData[idx] && indexData[idx].page <= p) {
        currentValue = indexData[idx][valueKey];
        if (indexData[idx].page === p) pageMap[p][flagKey] = true;
        idx++;
      }
      pageMap[p][valueKey] = currentValue;
    }
  }

  _createEmptyPageEntry() {
    return {
      surah: null,
      hizb: 1,
      juz: 1,
      sajda: false,
      isHizbStart: false,
      isJuzStart: false,
    };
  }

  buildPageIndex() {
    const total = APP_CFG.TOTAL_PAGES;
    const map = this.pageMap;
    map[0] = null;
    for (let p = 1; p <= total; p++) {
      map[p] = this._createEmptyPageEntry();
    }

    const {
      surah_index: surahIndex = [],
      hizb_index: hizbIndex = [],
      juz_index: juzIndex = [],
      sajda_index: sajdaIndex = [],
    } = this.data || {};

    this._surahs = surahIndex.map((s) => ({ ...s, verses_count: s.verses }));
    this._surahById = new Map(this._surahs.map((s) => [s.s_id, s]));

    const startsAtPage = Array.from({ length: total + 1 }, () => []);
    this._surahs.forEach((surah) => {
      if (surah.page_start >= 1 && surah.page_start <= total) startsAtPage[surah.page_start].push(surah.s_id);
    });

    let currentSurahId = null;
    for (let p = 1; p <= total; p++) {
      if (startsAtPage[p].length > 0) currentSurahId = Math.min(...startsAtPage[p]);
      if (currentSurahId === null) continue;
      const surah = this._surahById.get(currentSurahId);
      map[p].surah = {
        s_id: surah.s_id,
        name: surah.name,
        verses_count: surah.verses_count,
        type: surah.type,
        order: surah.order,
      };
    }

    this._propagateIndex(hizbIndex, "hizb", "isHizbStart", map);
    this._propagateIndex(juzIndex, "juz", "isJuzStart", map);

    const sajdaPages = new Set(sajdaIndex.map((s) => s.page));
    for (let p = 1; p <= total; p++) map[p].sajda = sajdaPages.has(p);

    this._sajdaSet = new Set(sajdaIndex.map((s) => s.s_id));

    this._juzBySurahId = new Map();
    juzIndex.forEach((entry) => {
      if (!this._juzBySurahId.has(entry.s_id)) this._juzBySurahId.set(entry.s_id, []);
      this._juzBySurahId.get(entry.s_id).push(entry.juz);
    });
  }

  // ---------- Helpers privés ----------

  _findSurah(id) {
    return this._surahById.get(Number(id)) || null;
  }

  _hizbIndex() {
    return this.data?.hizb_index || [];
  }

  _safePageData(page) {
    const p = Number(page);
    if (!AppUtils.isValidPage(p)) return null;
    return this.pageMap[p] || null;
  }

  // ---------- API publique — Pages ----------

  getPageData(page) {
    const data = this._safePageData(page);
    if (!data) return null;
    return { page: Number(page), ...data };
  }

  getPageNotifications(page) {
    const data = this.getPageData(page);
    if (!data) return [];
    const notifications = [];
    if (data.isJuzStart) notifications.push(`الجزء ${data.juz}`);
    if (data.isHizbStart) notifications.push(`الحزب ${data.hizb}`);
    if (data.sajda) notifications.push("سجدة");
    return notifications;
  }

  getFirstSurahForPage(page) {
    const data = this.getPageData(page);
    if (!data?.surah) return null;
    return { ...data.surah };
  }

  getHizbForPage(page) {
    return { hizb: this.getPageData(page)?.hizb ?? 1 };
  }

  // ---------- API publique — Sourates ----------

  getAllSurahs() {
    return this._surahs;
  }

  getSurah(id) {
    return this._findSurah(id);
  }

  getTotalAyahs(id) {
    return this._findSurah(id)?.verses_count || 0;
  }

  hasSajdaInSurah(sura_id) {
    return this._sajdaSet.has(sura_id);
  }

  getJuzStartsForSurah(surahId) {
    return (this._juzBySurahId.get(surahId) || []).slice(0, 1);
  }

  // ---------- API publique — Hizbs ----------

  getHizbIndex() {
    return this._hizbIndex();
  }

  getHizbWithPageRange() {
    const hizbs = this._hizbIndex();
    return hizbs.map((hizb, i) => {
      const next = hizbs[i + 1];
      return {
        ...hizb,
        page_start: hizb.page,
        page_end: next ? next.page - 1 : APP_CFG.TOTAL_PAGES,
      };
    });
  }
}

//  DÉMARRAGE

window.quranCalculator = new QuranCalculator();