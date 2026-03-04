class QuranCalculator {
  constructor() {
    this.data    = null;
    this.isLoaded = false;
    this.pageMap  = new Array(605);
  }

  // ============================================
  // CHARGEMENT
  // ============================================

  async load() {
    if (this.isLoaded) return this.data;
    const response = await fetch("data/quran.json", { cache: "force-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    this.data = await response.json();
    this.buildPageIndex();
    this.isLoaded = true;
    return this.data;
  }

  // ============================================
  // INDEX DES PAGES
  // ============================================

  buildPageIndex() {
    const map = this.pageMap;
    map[0] = null;
    for (let p = 1; p <= 604; p++) {
      map[p] = { surah: null, hizb: 1, juz: 1, sajda: false, isHizbStart: false, isJuzStart: false };
    }

    const {
      surah_index: surahIndex = [],
      hizb_index:  hizbIndex  = [],
      juz_index:   juzIndex   = [],
      sajda_index: sajdaIndex = [],
    } = this.data || {};

    // Sourates
    surahIndex.forEach((surah) => {
      for (let p = surah.page_start; p <= surah.page_end; p++) {
        map[p].surah = {
          s_id:        surah.s_id,
          name:        surah.name,
          verses_count: surah.verses,
          type:        surah.type,
          order:       surah.order,
        };
      }
    });

    // Hizbs
    let currentHizb = 1;
    let hizbIdx     = 0;
    for (let p = 1; p <= 604; p++) {
      if (hizbIndex[hizbIdx]?.page === p) {
        currentHizb      = hizbIndex[hizbIdx].hizb;
        map[p].isHizbStart = true;
        hizbIdx++;
      }
      map[p].hizb = currentHizb;
    }

    // Juz
    let currentJuz = 1;
    let juzIdx     = 0;
    for (let p = 1; p <= 604; p++) {
      if (juzIndex[juzIdx]?.page === p) {
        currentJuz      = juzIndex[juzIdx].juz;
        map[p].isJuzStart = true;
        juzIdx++;
      }
      map[p].juz = currentJuz;
    }

    // Sajdas
    const sajdaPages = new Set(sajdaIndex.map((s) => s.page));
    for (let p = 1; p <= 604; p++) map[p].sajda = sajdaPages.has(p);

    // Index inversés utiles pour overlays
    this._sajdaSet = new Set(sajdaIndex.map((s) => s.s_id));

    this._juzBySurahId = new Map();
    juzIndex.forEach((entry) => {
      if (!this._juzBySurahId.has(entry.s_id)) this._juzBySurahId.set(entry.s_id, []);
      this._juzBySurahId.get(entry.s_id).push(entry.juz);
    });

    this._surahIdByName = new Map(surahIndex.map((s) => [s.name, s.s_id]));
  }

  // ============================================
  // ACCÈS AUX DONNÉES
  // ============================================

  getPageData(page) {
    page = Number(page);
    if (!Number.isInteger(page) || page < 1 || page > 604) return null;
    const data = this.pageMap[page];
    return data ? { page, ...data } : null;
  }

  getPageNotifications(page) {
    const data = this.getPageData(page);
    if (!data) return [];
    const notifications = [];
    if (data.isJuzStart)  notifications.push(`الجزء ${data.juz}`);
    if (data.isHizbStart) notifications.push(`الحزب ${data.hizb}`);
    if (data.sajda)       notifications.push("سجدة");
    return notifications;
  }

  getAllSurahs() {
    return (this.data?.surah_index || []).map((s) => ({ ...s, verses_count: s.verses }));
  }

  getHizbIndex() {
    return this.data?.hizb_index || [];
  }

  hasSajdaInSurah(sura_id) {
    if (this._sajdaSet) return this._sajdaSet.has(sura_id);
    return this.data?.sajda_index?.some((s) => s.s_id === sura_id) || false;
  }

  getFirstSurahForPage(page) {
    const data = this.getPageData(page);
    if (!data?.surah) return null;
    return {
      s_id:         data.surah.s_id,
      name:         data.surah.name,
      verses_count: data.surah.verses_count,
      type:         data.surah.type,
      order:        data.surah.order,
    };
  }

  getHizbForPage(page) {
    return { hizb: this.getPageData(page)?.hizb ?? 1 };
  }

  getHizbWithPageRange() {
    const hizbs = this.getHizbIndex();
    if (!hizbs.length) return [];
    return hizbs.map((hizb, i) => {
      const next = hizbs[i + 1];
      return {
        ...hizb,
        page_start: hizb.page,
        page_end:   next ? next.page - 1 : 604,
      };
    });
  }
}

// ============================================
// INITIALISATION
// ============================================

window.quranCalculator = new QuranCalculator();
