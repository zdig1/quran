// ============================================================
//  FICHIER : quran-audio.js
//  Rôle : lecteur audio des versets (EveryAyah), surlignage,
//         mini-barre, notification Cordova, minuterie, mémorisation
//
//  SOMMAIRE
//   1. Configuration et constantes (riwayas, textes, icônes)
//   2. Mémorisation — constantes et réglages
//   3. QuranAudioPlayer
//      Constructeur · Helpers privés · Surlignage · Initialisation
//      Notification (MusicControls) · Mémorisation
//      Coordonnées des versets · Minuterie
//      Overlay audio · Récitateurs · Sourates
//      URL audio · Lecture · Mini-barre et bouton flottant
//      Événements · Affichage
// ============================================================

// ============================================================
//  1. CONFIGURATION ET CONSTANTES
// ============================================================

const EVERYAYAH_BASE = "https://everyayah.com/data/";
const SPINNER_HTML = '<span class="spinner small"></span>';

const LOAD_FAIL_TEXT = "❌ فشل تحميل الملف";

const SVG = Object.freeze({
  play: `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="8 6 18 12 8 18"/></svg>`,
  repeat: `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="m3.512 6.19 1.492-1.492-1.297-1.297L0 7.107l3.707 3.707 1.297-1.297-1.492-1.492h17.356V12h1.835V6.19Zm16.781 6.996-1.297 1.297 1.492 1.492H3.132V12H1.297v5.81h19.191l-1.492 1.492 1.297 1.297L24 16.893Z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="7" y="6" width="3" height="12"/><rect x="14" y="6" width="3" height="12"/></svg>`,
});

const RIWAYAT_CONFIG = (window.RIWAYAT_CONFIG = {
  hafs: {
    label: "حفص",
    reciters: [
      { id: "Ibrahim_Akhdar_64kbps", name: "إبراهيم الأخضر" },
      { id: "Abu_Bakr_Ash-Shaatree_64kbps", name: "أبو بكر الشاطري" },
      { id: "Ahmed_ibn_Ali_al-Ajamy_64kbps_QuranExplorer.Com", name: "أحمد العجمي" },
      { id: "Ahmed_Neana_128kbps", name: "أحمد نعينة" },
      { id: "Akram_AlAlaqimy_128kbps", name: "أكرم العلاقمي" },
      { id: "Ayman_Sowaid_64kbps", name: "أيمن سويد" },
      { id: "Parhizgar_48kbps", name: "پرهیزگار" },
      { id: "Khaalid_Abdullaah_al-Qahtaanee_192kbps", name: "خالد القحطاني" },
      { id: "khalefa_al_tunaiji_64kbps", name: "خليفة الطنيجي" },
      { id: "Ghamadi_40kbps", name: "سعد الغامدي" },
      { id: "Saood_ash-Shuraym_64kbps", name: "سعود الشريم" },
      { id: "Sahl_Yassin_128kbps", name: "سهل ياسين" },
      { id: "Salah_Al_Budair_128kbps", name: "صالح البدير" },
      { id: "Salaah_AbdulRahman_Bukhatir_128kbps", name: "صلاح بوخاطر" },
      { id: "Abdul_Basit_Murattal_64kbps", name: "عبد الباسط عبد الصمد — مرتل" },
      { id: "Abdul_Basit_Mujawwad_128kbps", name: "عبد الباسط عبد الصمد — مجوّد" },
      { id: "Abdurrahmaan_As-Sudais_64kbps", name: "عبد الرحمن السديس" },
      { id: "Abdullaah_3awwaad_Al-Juhaynee_128kbps", name: "عبدالله الجهني" },
      { id: "Abdullah_Basfar_64kbps", name: "عبدالله بصفر" },
      { id: "Abdullah_Matroud_128kbps", name: "عبدالله مطرود" },
      { id: "aziz_alili_128kbps", name: "عزيز العليلي" },
      { id: "Hudhaify_64kbps", name: "علي الحذيفي" },
      { id: "Ali_Jaber_64kbps", name: "علي جابر" },
      { id: "Ali_Hajjaj_AlSuesy_128kbps", name: "علي حجاج السويسي" },
      { id: "Fares_Abbad_64kbps", name: "فارس عباد" },
      { id: "Karim_Mansoori_40kbps", name: "كريم منصوري" },
      { id: "Maher_AlMuaiqly_64kbps", name: "ماهر المعيقلي" },
      { id: "Muhsin_Al_Qasim_192kbps", name: "محسن القاسم" },
      { id: "Mohammad_al_Tablaway_64kbps", name: "محمد الطبلاوي" },
      { id: "Muhammad_Ayyoub_64kbps", name: "محمد أيوب" },
      { id: "Muhammad_Jibreel_64kbps", name: "محمد جبريل" },
      { id: "mahmoud_ali_al_banna_32kbps", name: "محمود علي البنا" },
      { id: "Mustafa_Ismail_48kbps", name: "مصطفى إسماعيل" },
      { id: "Husary_64kbps", name: "محمود خليل الحصري — مرتل" },
      { id: "Husary_Mujawwad_64kbps", name: "محمود خليل الحصري — مجوّد" },
      { id: "Husary_Muallim_128kbps", name: "محمود خليل الحصري — معلم" },
      { id: "Menshawi_32kbps", name: "محمد صديق المنشاوي — مرتل" },
      { id: "Minshawy_Mujawwad_64kbps", name: "محمد صديق المنشاوي — مجوّد" },
      { id: "Minshawy_Teacher_128kbps", name: "محمد صديق المنشاوي — معلم" },
      { id: "Nasser_Alqatami_128kbps", name: "ناصر القطامي" },
      { id: "Nabil_Rifa3i_48kbps", name: "نبيل الرفاعي" },
      { id: "Hani_Rifai_64kbps", name: "هاني الرفاعي" },
      { id: "Yasser_Ad-Dussary_128kbps", name: "ياسر الدوسري" },
      { id: "Yaser_Salamah_128kbps", name: "ياسر سلامة" }
    ],
  },
  warsh: {
    label: "ورش",
    reciters: [
      { id: "warsh/warsh_Abdul_Basit_128kbps", name: "عبد الباسط عبد الصمد — ورش" },
    ],
  },
  qaloon: {
    label: "قالون",
    reciters: [
      { id: "warsh/warsh_ibrahim_aldosary_128kbps", name: "إبراهيم الدوسري" },
      { id: "warsh/warsh_yassin_al_jazaery_64kbps", name: "ياسين الجزائري" },
    ],
  },
});

// ============================================================
//  2. MÉMORISATION — CONSTANTES ET RÉGLAGES
// ============================================================

const MEM_OPTIONS = { perVerse: [1, 3, 5, 10], passes: [1, 3, 5, 10], pause: [0, "half", "same", "one_and_half"] };
const normalizeMemCfg = (saved = {}) => ({
  perVerse: MEM_OPTIONS.perVerse.includes(saved.perVerse) ? saved.perVerse : 3,
  passes: MEM_OPTIONS.passes.includes(saved.passes) ? saved.passes : 1,
  pause: MEM_OPTIONS.pause.includes(saved.pause) ? saved.pause : 0,
});
const loadMemCfg = () => normalizeMemCfg(window.quranApp.getPreferenceJSON("memorize", {}) || {});
const saveMemCfg = (cfg) => window.quranApp.setPreferenceJSON("memorize", cfg);

// ============================================================
//  3. QURANAUDIOPLAYER
// ============================================================

class QuranAudioPlayer {
  // ---------- Constructeur ----------

  constructor() {
    this.currentRiwaya = window.ACTIVE_RIWAYA;
    this.currentReciter = null;

    this.currentSurah = null;
    this.currentAyah = null;
    this.totalAyahs = 0;
    this.isPlaying = false;
    this.isStopped = true;

    this.repeatMode = 0;
    this.playbackRate = 1;

    this.speedOptions = [0.75, 1.0, 1.25, 1.5];
    this.currentSpeedIndex = 1;

    this.audioA = new Audio();
    this.audioB = new Audio();
    this.audioA.preload = "auto";
    this.audioB.preload = "auto";
    this.currentAudio = this.audioA;
    this.audioElement = this.audioA;

    this.miniBar = null;
    this.fabBtn = null;
    this.elements = {};

    this.ayaCoords = null;
    this.ayaCoordsLoaded = false;
    this.surahs = [];

    this._preloadTriggered = false;
    this._nextAudioBuffer = null;
    this._crossfading = false;
    this._isTransitioning = false;
    this._retrying = false;

    this._musicControlsReady = false;
    this._musicControlsInitDone = false;
    this._notificationCreated = false;
    this._inited = false;
    this._musicControlsRetryCount = 0;
    this._musicControlsRetryTimer = null;

    this._boundListeners = { audio: {} };
    this.hasError = false;
    this._autoNavigate = false;
    this._notifKey = null;
    this._ayaIndex = null;
    this._overlayEventsAttached = false;
    // Minuterie (إيقاف تلقائي)
    this._sleepEndsAt = 0;
    this._fadeTimer = null;
    this._sleepSurahEnd = false;
    this._sleepPending = 0;
    this._sleepChoice = 0;
    this._sleepTimeout = null;
    this._sleepTick = null;
    // Notification
    this._notifPermAsked = false;
    this._killTimer1 = null;
    this._killTimer2 = null;
  }

  // ---------- Helpers privés ----------

  /** Efface et annule le minuteur de mémorisation. */
  _clearMemTimer() {
    clearTimeout(this._memTimer);
    this._memTimer = null;
  }

  /** Synchronise les deux menus déroulants du lecteur (sourate + verset). */
  _syncSurahAyaSelects() {
    CustomSelect.set("surahSelectAudio", this.currentSurah);
    CustomSelect.set("ayaSelectAudio", this.currentAyah);
  }

  /** Rafraîchit l'affichage courant + les boutons (pattern répété 8×). */
  _refreshDisplay() {
    this._updateCurrentDisplay();
    this._updateUI();
  }

  /** Applique le taux de lecture à un élément audio donné. */
  _setRateOnElement(el) {
    if (el) el.playbackRate = this.playbackRate;
  }

  /** Lit le mode de répétition depuis les préférences. */
  _loadRepeatPreference() {
    return parseInt(window.quranApp.getPreference("repeat", "0"), 10) || 0;
  }

  /** Lit le taux de lecture depuis les préférences. */
  _loadRatePreference() {
    return parseFloat(window.quranApp.getPreference("rate")) || 1.0;
  }

  // ---------- Surlignage ----------

  _applyHighlight() {
    if (!this.ayaCoordsLoaded) {
      window.quranReader?.clearHighlight();
      return;
    }
    const rects = this._getAyaRects(this.currentSurah, this.currentAyah);
    if (!rects?.length) {
      window.quranReader?.clearHighlight();
      return;
    }
    const ayaPage = rects[0]?.p;
    const reader = window.quranReader;
    if (ayaPage && ayaPage !== reader?.currentPage) {
      if (this._autoNavigate) {
        window.quranApp?.goToPage(ayaPage);
      } else {
        reader?.clearHighlight();
      }
      return;
    }
    this._performHighlight(rects, ayaPage);
  }

  _performHighlight(rects, ayaPage) {
    const reader = window.quranReader;
    if (!reader) return;
    const waitForImage = (callback) => {
      if (reader.readingMode !== "book") { callback(); return; }
      const wrapper = reader.elements?.pageScroll?.querySelector(`.page-wrapper[data-page="${ayaPage}"]`);
      const img = wrapper?.querySelector("img");
      if (img && img.complete && img.naturalWidth > 0) callback();
      else if (img) img.addEventListener("load", () => callback(), { once: true });
      else callback();
    };
    waitForImage(() => {
      reader.highlightAya(this.currentSurah, this.currentAyah, rects);
    });
  }

  _ensureHighlight() {
    this._autoNavigate = true;
    this._applyHighlight();
    this._autoNavigate = false;
  }

  _afterNavigate() {
    this.isStopped = false;
    this._refreshDisplay();
    this._ensureHighlight();
    this._showMiniBar();
    if (this.audioElement?.dataset?.basmala !== "true") {
      this._updateMediaNotification();
    }
  }

  _onProgressInput(e) {
    const dur = this.audioElement.duration;
    if (dur) this.audioElement.currentTime = (e.target.value / 100) * dur;
  }

  _showOfflineError() {
    this._showStatus("❌ لا يوجد اتصال بالإنترنت", true);
  }

  // ---------- Initialisation ----------

  async init() {
    if (this._inited) return;
    this._inited = true;

    this._buildMiniBar();
    this._buildFab();
    await this._loadAyaCoords();
    this.surahs = window.quranCalculator?.getAllSurahs() || [];
    this._setupAudioEvents();
    this._setupMiniBarEvents();

    this._applyRate(this._loadRatePreference());
    this.repeatMode = this._loadRepeatPreference();

    this._setupOnlineOffline();
    this._initMusicControls();
    document.addEventListener("deviceready", () => { this._initMusicControls(); });
    window.addEventListener(APP_EVENTS.prefsImported, () => this._reloadPreferences());
  }

  _cacheElements() {
    const ids = {
      overlay: "audioOverlay",
      closeBtn: "closeAudioBtn",
      reciterSelect: "reciterSelect",
      surahSelect: "surahSelectAudio",
      ayaSelect: "ayaSelectAudio",
      pageSelect: "pageSelectAudio",
      overlaySpeedBtn: "overlaySpeedBtn",
      playPauseBtn: "playPauseBtn",
      stopBtn: "stopBtn",
      prevSurahBtn: "prevSurahBtn",
      nextSurahBtn: "nextSurahBtn",
      prevAyahBtn: "prevAyahBtn",
      nextAyahBtn: "nextAyahBtn",
      progressBar: "audioProgress",
      currentTime: "audioCurrentTime",
      duration: "audioDuration",
      repeatBtn: "repeatBtn",
      rateSelect: "rateSelect",
      status: "audioStatus",
      currentDisplay: "currentSurahDisplay",
      sleepBtn: "sleepBtn",
    };
    this.elements = Object.fromEntries(
      Object.entries(ids).map(([key, id]) => [key, document.getElementById(id)]),
    );
    this.overlay = this.elements.overlay;
  }

  // ---------- Notification (MusicControls) ----------

  _initMusicControls() {
    if (this._musicControlsInitDone && this._musicControlsReady) return;
    if (!window.MusicControls) { this._scheduleMusicControlsRetry(); return; }
    if (this._musicControlsInitDone) return;

    try {
      window.MusicControls.subscribe((event) => {
        let message;
        try { message = typeof event === "string" ? JSON.parse(event).message : event.message; }
        catch { message = event; }

        switch (message) {
          case "music-controls-next":
          case "music-controls-next-click": this.nextAyah(); break;
          case "music-controls-previous":
          case "music-controls-previous-click": this.prevAyah(); break;
          case "music-controls-pause":
          case "music-controls-pause-click": this.pause(); this._updateMediaNotification(); break;
          case "music-controls-play":
          case "music-controls-play-click": this.play(); break;
          case "music-controls-toggle-play-pause": this.togglePlay(); break;
          case "music-controls-headset-unplugged":
          case "music-controls-headset-plugged": this.pause(); this._updateMediaNotification(); break;
          case "music-controls-destroy":
          case "music-controls-notification-dismissed":
          case "music-controls-close": this.stop(); this._destroyMediaNotification(); break;
          default: break;
        }
      });
      window.MusicControls.listen();
      this._musicControlsReady = true;
      this._musicControlsInitDone = true;
      this._musicControlsRetryCount = 0;
    } catch {
      this._scheduleMusicControlsRetry();
    }
  }

  _scheduleMusicControlsRetry() {
    if (this._musicControlsRetryTimer) return;
    if (this._musicControlsRetryCount >= 10) return;
    const delays = [500, 500, 1000, 1000, 2000, 2000, 3000, 3000, 5000, 5000];
    const delay = delays[this._musicControlsRetryCount] || 5000;
    this._musicControlsRetryCount++;
    this._musicControlsRetryTimer = setTimeout(() => {
      this._musicControlsRetryTimer = null;
      this._initMusicControls();
    }, delay);
  }

  _killNotification() {
    try {
      window.MusicControls?.destroy(
        () => { },
        () => { },
      );
    } catch {
      /* déjà détruite */
    }
  }

  _destroyMediaNotification() {
    if (!window.MusicControls) return;
    this._notificationCreated = false;
    this._notifKey = null;
    this._killNotification();
    // Destructions différées, uniquement si la lecture est toujours à l'arrêt
    clearTimeout(this._killTimer1);
    clearTimeout(this._killTimer2);
    this._killTimer1 = setTimeout(() => this.isStopped && this._killNotification(), 400);
    this._killTimer2 = setTimeout(() => this.isStopped && this._killNotification(), 1500);
  }

  _updateMediaNotification() {
    if (this.isStopped) return;
    if (!this._musicControlsReady) this._initMusicControls();
    if (!window.MusicControls || !this._musicControlsReady) return;
    if (this.audioElement?.dataset?.basmala === "true") return;
    if (!this.currentSurah || !this.currentAyah) return;

    if (!this._notifPermAsked) {
      this._notifPermAsked = true;
      window.cordova?.plugins?.permissions?.requestPermission?.(
        "android.permission.POST_NOTIFICATIONS",
        () => { },
        () => { },
      );
    }

    const surah = this._surah(this.currentSurah);
    const surahName = surah?.name || "القرآن الكريم";
    const reciterName = this.currentReciter?.name || "قارئ";
    const track = `${this.currentSurah}.${surahName} - آية ${this.currentAyah}`;
    const key = `${track}|${reciterName}`;

    if (this._notificationCreated && this._notifKey === key) {
      try {
        window.MusicControls.updateIsPlaying?.(this.isPlaying);
      } catch {
        /* plugin indisponible */
      }
      return;
    }
    this._notifKey = key;
    this._notificationCreated = true;

    try {
      window.MusicControls.create(
        {
          track,
          artist: reciterName,
          album: "Holy Quran",
          cover: "media/icon-192.png",
          isPlaying: this.isPlaying,
          dismissable: true,
          hasPrev: true,
          hasNext: true,
          hasClose: true,
          ticker: `🎧 ${track}`,
        },
        () => {
          // Arrêt demandé pendant la création native : on supprime la notification fantôme
          if (this.isStopped) this._killNotification();
        },
        () => { },
      );
    } catch {
      this._notificationCreated = false;
    }
  }

  // ---------- Mémorisation / répétition ----------

  _mem = null;
  _memTimer = null;
  _memInternal = false;

  _memExit() {
    this._clearMemTimer();
    this._mem = null;
    this._memInternal = false;
  }

  _memStepForward(s, a) {
    return a < window.AyaPicker.totalOf(s) ? { s, a: a + 1 } : { s: s + 1, a: 1 };
  }

  _memStepBack(s, a) {
    return a > 1 ? { s, a: a - 1 } : { s: s - 1, a: window.AyaPicker.totalOf(s - 1) || 1 };
  }

  _memSpan(from, to) {
    if (!from || !to) return 0;
    if (from.s > to.s || (from.s === to.s && from.a > to.a)) return 0;
    if (from.s === to.s) return to.a - from.a + 1;
    let n = window.AyaPicker.totalOf(from.s) - from.a + 1;
    for (let s = from.s + 1; s < to.s; s++) n += window.AyaPicker.totalOf(s);
    return n + to.a;
  }

  // Positionne le lecteur sans quitter le mode mémorisation
  _memSetPos(s, a) {
    this._memInternal = true;
    try {
      this._setSurah(s, a);
    } finally {
      this._memInternal = false;
    }
  }

  _memNext() {
    const m = this._mem;
    if (!m) return null;
    const s = this.currentSurah;
    const a = this.currentAyah;
    if (m.vDone + 1 < m.perVerse) return { s, a, kind: "verse" };
    if (s === m.to.s && a === m.to.a) {
      return m.pDone + 1 < m.passes ? { s: m.from.s, a: m.from.a, kind: "pass" } : null;
    }
    return { ...this._memStepForward(s, a), kind: "next" };
  }

  _memPauseMs() {
    const m = this._mem;
    if (!m?.pause) return 0;
    const factor = { half: 0.5, same: 1, one_and_half: 1.5 }[m.pause];
    if (factor) {
      const dur = (this.audioElement.duration || 3) / this.playbackRate;
      return Math.round(dur * factor * 1000);
    }
    return m.pause * 1000;
  }

  _memCommit(n) {
    const m = this._mem;
    if (!m || !n) return;
    if (n.kind === "verse") m.vDone++;
    else {
      m.vDone = 0;
      if (n.kind === "pass") m.pDone++;
    }
    this._memSetPos(n.s, n.a);
  }

  _memOnEnded() {
    const m = this._mem;
    if (!m) return;
    const n = this._memNext();
    if (!n) {
      this._memFinish();
      return;
    }
    const wait = this._memPauseMs();
    this._memCommit(n);
    if (wait > 0) {
      m.waiting = true;
      this._updateUI();
      this._memTimer = setTimeout(() => this._memPlayTarget(), wait);
    } else {
      this._memPlayTarget();
    }
  }

  _memPlayTarget() {
    this._clearMemTimer();
    if (!this._mem) return;
    this._mem.waiting = false;
    try {
      this.audioElement.currentTime = 0;
    } catch {
      /* média non chargé */
    }
    this.play();
  }

  _memSkip(dir) {
    const m = this._mem;
    if (!m) return;
    this._clearMemTimer();
    m.waiting = false;
    if (dir > 0) {
      m.vDone = m.perVerse - 1;
      const n = this._memNext();
      if (!n) {
        this._memFinish();
        return;
      }
      this._memCommit(n);
    } else {
      m.vDone = 0;
      if (!(this.currentSurah === m.from.s && this.currentAyah === m.from.a)) {
        const p = this._memStepBack(this.currentSurah, this.currentAyah);
        this._memSetPos(p.s, p.a);
      }
    }
    this._memPlayTarget();
  }

  _memFinish() {
    window.quranApp?.showToast?.("✅ تم إكمال المقطع");
    this.stop();
  }

  _memShort() {
    const m = this._mem;
    if (!m) return "";
    return `<span>🧠</span><span>${m.passes || 1}/${(m.pDone || 0) + 1} · ${m.perVerse || 1}/${(m.vDone || 0) + 1}</span>`;
  }

  async startMem(cfg) {
    if (!cfg?.from || !cfg?.to) return;
    await this.init();
    if (!this.currentReciter) this._selectReciter(window.quranApp.getPreference(`reciter_${this.currentRiwaya}`), false);
    this._clearMemTimer();
    this._mem = { ...cfg, vDone: 0, pDone: 0, waiting: false };
    this._memSetPos(cfg.from.s, cfg.from.a);
    this.play();
    this._showMiniBar();
  }

  openMemorize() {
    if (this._mem) {
      window.overlayManager.showConfirm("إيقاف التكرار والحفظ؟").then((ok) => ok && this.stop());
      return;
    }
    this.showMemDialog();
  }

  _memOverlayShow(html, bind) {
    const om = window.overlayManager;
    const overlay = om.lazyLoadOverlay("memorize");
    if (!overlay?.content) return;
    overlay.content.innerHTML = html;
    bind(overlay.content, () => om.closeOverlay("memorize"));
    om.showOverlay("memorize");
  }

  showMemDialog() {
    const cfg = loadMemCfg();
    const pos = window.AyaPicker.currentPos();
    const from = { s: pos.s, a: pos.a };
    const to = { s: pos.s, a: Math.min(window.AyaPicker.totalOf(pos.s) || 1, pos.a + 2) };
    const cmp = (x, y) => x.s - y.s || x.a - y.a;

    this._memOverlayShow(
      `<div class="mem-overlay-body">
         <div class="mem-label">تحديد البداية</div>
         ${window.AyaPicker.pairHtml("memFrom", from)}
         
         <div class="mem-label">تحديد النهاية</div>
         ${window.AyaPicker.pairHtml("memTo", to)}
         
         <div class="mem-summary" id="memSummary"></div>
         
         <button type="button" class="mem-edit-btn" id="memEditBtn">⚙️ تعديل الإعدادات</button>
         <button type="button" class="mem-go" id="memGo">بدء</button>
       </div>`,
      (dialog, cleanup) => {
        const summary = dialog.querySelector("#memSummary");
        const updateSummary = () => {
          const n = this._memSpan(from, to);
          summary.textContent = `${n} آيات × ${cfg.perVerse} × ${cfg.passes} = ${n * cfg.perVerse * cfg.passes} قراءات`;
        };

        let fromPair, toPair;
        const onChange = (changed) => {
          if (cmp(from, to) > 0) {
            if (changed === "memFrom") Object.assign(to, from);
            else Object.assign(from, to);
            fromPair.refresh();
            toPair.refresh();
          }
          updateSummary();
        };
        fromPair = window.AyaPicker.bindPair(dialog, "memFrom", from, onChange);
        toPair = window.AyaPicker.bindPair(dialog, "memTo", to, onChange);

        dialog.querySelector("#memEditBtn").addEventListener("click", () => {
          this._showMemSettings((newCfg) => {
            Object.assign(cfg, newCfg);
            updateSummary();
          });
        });

        dialog.querySelector("#memGo").addEventListener("click", () => {
          if (this._memSpan(from, to) <= 0) {
            window.quranApp?.showToast?.("نطاق غير صالح");
            return;
          }
          saveMemCfg(cfg);
          cleanup(null);
          this.startMem({ from: { ...from }, to: { ...to }, ...cfg });
        });

        updateSummary();
      },
    );
  }

  _showMemSettings(onChange) {
    const om = window.overlayManager;
    const overlay = om.lazyLoadOverlay("memSettings");
    if (!overlay?.content) return;

    const cfg = loadMemCfg();
    const PAUSE_LABELS = { 0: "بدون", half: "0.5×", same: "1×", one_and_half: "1.5×" };

    const chips = (key, values, fmt) =>
      `<div class="mem-chips" data-key="${key}">${values
        .map((v) => `<button type="button" class="mem-chip${String(v) === String(cfg[key]) ? " active" : ""}" data-v="${v}">${fmt(v)}</button>`)
        .join("")}</div>`;

    overlay.content.innerHTML = `
      <div class="aya-label">تكرار الآية</div>
      ${chips("perVerse", MEM_OPTIONS.perVerse, (v) => `× ${v}`)}
      <div class="aya-label">تكرار المقطع</div>
      ${chips("passes", MEM_OPTIONS.passes, (v) => `× ${v}`)}
      <div class="aya-label">الانتظار بين التلاوات</div>
      ${chips("pause", MEM_OPTIONS.pause, (v) => PAUSE_LABELS[v])}
    `;

    overlay.content.querySelectorAll(".mem-chips").forEach((wrapEl) => {
      wrapEl.addEventListener("click", (e) => {
        const b = e.target.closest(".mem-chip");
        if (!b) return;
        const key = wrapEl.dataset.key;
        cfg[key] = MEM_OPTIONS[key].find((x) => String(x) === b.dataset.v);
        wrapEl.querySelectorAll(".mem-chip").forEach((x) => x.classList.toggle("active", x === b));
        saveMemCfg(cfg);
        onChange?.(cfg);
      });
    });

    const backToMem = (e) => {
      if (e.detail?.overlay !== "memSettings") return;
      window.removeEventListener("quran:overlayClosed", backToMem);
      om.showOverlay("memorize");
    };
    window.addEventListener("quran:overlayClosed", backToMem);
    om.showOverlay("memSettings");
  }

  // ---------- Coordonnées des versets ----------

  async _loadAyaCoords() {
    if (this.ayaCoords) return;
    try {
      const r = await fetch("./data/ayapage.json", { cache: "force-cache" });
      if (r.ok) {
        this.ayaCoords = await r.json();
        this._ayaIndex = new Map();
        for (const rect of this.ayaCoords) {
          const k = `${rect.s}:${rect.a}`;
          if (!this._ayaIndex.has(k)) this._ayaIndex.set(k, []);
          this._ayaIndex.get(k).push(rect);
        }
        this.ayaCoordsLoaded = true;
      } else this.ayaCoordsLoaded = false;
    } catch {
      this.ayaCoordsLoaded = false;
    }
  }

  _getAyaRects(surah, ayah) {
    return this._ayaIndex?.get(`${surah}:${ayah}`) ?? null;
  }

  _getFirstAyahOfPage(page) {
    if (!this.ayaCoords) return null;
    const found = this.ayaCoords.find((r) => r.p === page);
    return found ? { surah: found.s, ayah: found.a } : null;
  }

  // ---------- Minuterie (إيقاف تلقائي) ----------

  setSleepTimer(value) {
    this.cancelSleepTimer();
    this._sleepChoice = value || 0;
    if (!value) {
      window.quranApp?.showToast("⏱️ تم إلغاء الإيقاف التلقائي");
      this._updateSleepPill();
      return;
    }
    if (value === "surah") this._sleepSurahEnd = true;
    else if (this.isStopped) this._sleepPending = value;
    else this._startSleepCountdown(value);
    window.quranApp?.showToast(`⏱️ ${this.sleepLabel()}`);
    this._updateSleepPill();
  }

  _startSleepCountdown(minutes) {
    this._sleepEndsAt = Date.now() + minutes * 60000;
    this._sleepTimeout = setTimeout(() => this._checkSleep(), minutes * 60000 + 200);
    clearInterval(this._sleepTick);
    this._sleepTick = setInterval(() => this._updateSleepPill(), 15000);
  }

  cancelSleepTimer() {
    clearInterval(this._sleepTick);
    clearTimeout(this._sleepTimeout);
    clearInterval(this._fadeTimer);
    this._sleepTimeout = null;
    this._fadeTimer = null;
    this._sleepEndsAt = 0;
    this._sleepSurahEnd = false;
    this._sleepPending = 0;
    this._sleepChoice = 0;
    for (const a of [this.audioA, this.audioB]) a.volume = 1;
  }

  openSleepPicker() {
    this._showSleepPicker();
  }

  _updateSleepPill() {
    const btn = document.getElementById("sleepBtn");
    if (!btn) return;
    const active = !!(this._sleepEndsAt || this._sleepSurahEnd || this._sleepPending);
    const text = active ? this.sleepLabel() : "إيقاف تلقائي";
    const lbl = btn.querySelector("#sleepBtnLabel");
    if (lbl && lbl.textContent !== text) lbl.textContent = text;
    btn.classList.toggle("active", active);
  }

  sleepLabel() {
    if (this._sleepSurahEnd) return "نهاية السورة";
    if (this._sleepEndsAt) {
      const m = Math.max(1, Math.ceil((this._sleepEndsAt - Date.now()) / 60000));
      return `متبقي ${m} دقيقة`;
    }
    if (this._sleepPending) return `عند التشغيل: ${this._sleepPending} دقيقة`;
    return "إيقاف تلقائي";
  }

  _checkSleep() {
    if (!this._sleepEndsAt || Date.now() < this._sleepEndsAt) return;
    this._sleepEndsAt = 0;
    clearTimeout(this._sleepTimeout);
    this._sleepTimeout = null;
    if (!this.isPlaying) { this.stop(); return; }
    let v = 1;
    clearInterval(this._fadeTimer);
    this._fadeTimer = setInterval(() => {
      v = Math.max(0, v - 0.05);
      for (const a of [this.audioA, this.audioB]) a.volume = v;
      if (v <= 0.001) {
        clearInterval(this._fadeTimer);
        this._fadeTimer = null;
        this.stop();
      }
    }, 400);
  }

  // ---------- Overlay audio (UI + ouverture) ----------

  renderAudioUI() {
    const riwayaLabel = RIWAYAT_CONFIG[this.currentRiwaya]?.label || "حفص";
    const coordsStatus = this.ayaCoordsLoaded === false
      ? '<div class="audio-warning">⚠️ بيانات تحديد الآيات غير متوفرة، لن يظهر التظليل</div>'
      : "";

    return `
        ${coordsStatus}
        <div class="audio-select-row">
            ${CustomSelect.markup("reciterSelect", "اختر القارئ")}
        </div>
        <div class="audio-select-row audio-select-grid">
            ${CustomSelect.markup("surahSelectAudio", APP_TEXTS.pickSurah)}
            ${CustomSelect.markup("ayaSelectAudio", APP_TEXTS.pickAyah)}
            ${CustomSelect.markup("pageSelectAudio", APP_TEXTS.pickPage)}
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
                ${SVG.repeat}
            </button>
            <button class="btn audio-btn" id="nextSurahBtn" title="السورة التالية">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="12 6 20 12 12 18"/><line x1="21" y1="6" x2="21" y2="18" stroke="currentColor" stroke-width="2"/></svg>
            </button>
            <button class="btn audio-btn" id="nextAyahBtn" title="الآية التالية">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="13 6 21 12 13 18"/><polygon points="3 6 11 12 3 18"/></svg>
            </button>
            <button class="btn audio-btn" id="playPauseBtn" title="تشغيل">
                ${SVG.play}
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
        <div class="audio-current-info">
            <div class="audio-main-info">
                <span class="audio-riwaya-info">🎙️ رواية ${riwayaLabel} (عبر النت)</span>
                <span id="currentSurahDisplay" class="audio-current-display"></span>
            </div>
            <div id="memDisplay" class="audio-mem-display" style="display: none;"></div>
        </div>
        <div class="audio-sleep-row">
            <button type="button" class="audio-sleep-pill" id="sleepBtn">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                </svg>
                <span id="sleepBtnLabel">إيقاف تلقائي</span>
            </button>
        </div>
    `;
  }

  async showOverlay() {
    const om = window.overlayManager;
    if (!om) return;
    om.closeMenu();
    const overlay = om.lazyLoadOverlay("audio");
    if (!overlay?.element || !overlay?.content) return;

    await this.init();

    if (!overlay.contentGenerated) {
      overlay.content.innerHTML = this.renderAudioUI();
      overlay.contentGenerated = true;
    }

    this._cacheElements();
    this._populatePageSelect();
    this._populateSurahSelect();
    this._populateReciterSelect(this.currentRiwaya);

    if (!this.currentReciter) {
      const saved = window.quranApp.getPreference(`reciter_${this.currentRiwaya}`);
      this._selectReciter(saved, false);
    } else {
      CustomSelect.set('reciterSelect', this.currentReciter.id);
    }

    this._setupOverlayEvents();
    om.showOverlay("audio");
    this._hideMiniBar(false);
    this._syncOverlay();

    if (!this.isPlaying && !this.currentSurah) {
      this.setCurrentSurahFromPage();
    }
  }

  _showSleepPicker() {
    const opts = [[0, "معطّل"], [5, "5 دقائق"], [15, "15 دقيقة"], [30, "30 دقيقة"], ["surah", "نهاية السورة"]];
    const rows = opts.map(([v, l]) =>
      `<button type="button" class="sleep-option${this._sleepChoice === v ? " active" : ""}" data-v="${v}">${l}</button>`
    ).join("");
    window.overlayManager._showBackdropDialog(
      `<h3>⏱️ إيقاف تلقائي</h3><div class="sleep-options">${rows}</div>`,
      (dialog, cleanup) => dialog.querySelectorAll(".sleep-option").forEach((b) =>
        b.addEventListener("click", () => {
          this.setSleepTimer(b.dataset.v === "surah" ? "surah" : Number(b.dataset.v));
          cleanup(null);
        }))
    );
  }

  // ---------- Récitants ----------

  _closeReciterDropdown() {
    const wrap = document.getElementById('reciterSelectWrap');
    if (wrap) wrap.classList.remove('open');
  }

  _populateReciterSelect(riwaya) {
    const listContainer = document.getElementById('reciterSelectList');
    if (!listContainer) return;

    const reciters = RIWAYAT_CONFIG[riwaya]?.reciters || [];
    const pinnedIds = this.getPinnedReciters();
    const pinned = reciters.filter(r => pinnedIds.includes(r.id));
    const normal = reciters.filter(r => !pinnedIds.includes(r.id));
    const currentId = this.currentReciter?.id;

    listContainer.innerHTML = '';

    const addOptions = (reciterArray, groupName) => {
      if (groupName) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'custom-select-group';
        groupDiv.textContent = groupName;
        listContainer.appendChild(groupDiv);
      }

      reciterArray.forEach(reciter => {
        const isPinned = pinnedIds.includes(reciter.id);
        const isCurrent = reciter.id === currentId;

        const option = document.createElement('div');
        option.className = 'custom-select-option reciter-option';
        option.dataset.value = reciter.id;
        if (isCurrent) option.classList.add('selected', 'choice-current');

        // 1. Le point vert (🟢) à gauche si c'est le récitateur actif
        const check = document.createElement('span');
        check.className = 'choice-check';
        check.textContent = isCurrent ? '🟢' : '';
        option.appendChild(check);

        // 2. Le nom du récitateur
        const nameSpan = document.createElement('span');
        nameSpan.className = 'reciter-name';
        nameSpan.textContent = reciter.name;
        option.appendChild(nameSpan);

        // 3. L'épingle (📌) ou l'étoile (💫) à droite
        const pinBtn = document.createElement('button');
        pinBtn.className = `pin-reciter-btn action-icon ${isPinned ? 'pinned' : ''}`;
        pinBtn.textContent = isPinned ? '💫' : '📌';
        pinBtn.setAttribute('data-id', reciter.id);
        pinBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.togglePinReciter(reciter.id);
          this._populateReciterSelect(this.currentRiwaya);
        });
        option.appendChild(pinBtn);

        // Clic sur la ligne pour sélectionner
        option.addEventListener('click', (e) => {
          if (e.target.closest('.pin-reciter-btn')) return;
          this._selectReciter(reciter.id);
          this._closeReciterDropdown();
        });

        listContainer.appendChild(option);
      });
    };

    addOptions(pinned, '⭐ المفضلون');
    addOptions(normal, '📖 جميع القراء');

    if (this.currentReciter) {
      CustomSelect.setValue('reciterSelect', 'reciterSelectList', this.currentReciter.id);
    }
    this._updateReciterSelectButton();
  }

  _selectReciter(id, save = true) {
    const reciters = RIWAYAT_CONFIG[this.currentRiwaya]?.reciters || [];
    if (reciters.length === 0) return;

    let found = null;
    if (id) found = reciters.find((r) => r.id === id);
    if (!found) found = reciters[0];

    this.currentReciter = found;
    CustomSelect.set("reciterSelect", found.id);
    if (save) window.quranApp.setPreference(`reciter_${this.currentRiwaya}`, found.id);
    this._updateReciterSelectButton();
    this._refreshDisplay();
    if (this.isPlaying) this._updateMediaNotification();
    if (this.isPlaying && !this.hasError) {
      this.audioElement.pause();
      this.play();
    }
  }

  _reloadPreferences() {
    // Récitateur actif
    const saved = window.quranApp.getPreference(`reciter_${this.currentRiwaya}`);
    if (saved) {
      const reciters = RIWAYAT_CONFIG[this.currentRiwaya]?.reciters || [];
      const found = reciters.find(r => r.id === saved);
      if (found && this.currentReciter?.id !== saved) {
        this._selectReciter(saved, false); // save=false : déjà en localStorage
      }
    }

    // Récitateurs épinglés
    this._populateReciterSelect(this.currentRiwaya);

    // Vitesse de lecture
    const savedRate = this._loadRatePreference();
    if (this.playbackRate !== savedRate) {
      this._applyRate(savedRate);
    }

    // Mode répétition
    const savedRepeat = this._loadRepeatPreference();
    if (this.repeatMode !== savedRepeat) {
      this.repeatMode = savedRepeat;
      this._updateRepeatBtn();
    }

    // Rafraîchir l'UI si l'overlay est ouvert
    if (this.elements.overlay?.classList.contains("show")) {
      this._syncOverlay();
    }
  }

  _updateReciterSelectButton() {
    const btn = document.getElementById('reciterSelect');
    if (!btn || !this.currentReciter) return;
    const valSpan = btn.querySelector('.custom-select-val');
    const isPinned = this.isReciterPinned(this.currentReciter.id);
    valSpan.textContent = isPinned ? `💫 ${this.currentReciter.name}` : this.currentReciter.name;
  }

  getPinnedReciters() {
    const list = window.quranApp.getPreferenceJSON(`pinnedReciters_${this.currentRiwaya}`, []);
    return Array.isArray(list) ? list : [];
  }

  savePinnedReciters(pinnedList) {
    window.quranApp.setPreferenceJSON(`pinnedReciters_${this.currentRiwaya}`, pinnedList);
  }

  togglePinReciter(reciterId) {
    const pinned = this.getPinnedReciters();
    const index = pinned.indexOf(reciterId);
    if (index === -1) pinned.push(reciterId);
    else pinned.splice(index, 1);
    this.savePinnedReciters(pinned);
    this._populateReciterSelect(this.currentRiwaya);
    return index === -1;
  }

  isReciterPinned(reciterId) {
    return this.getPinnedReciters().includes(reciterId);
  }

  // ---------- Sourates ----------

  _populateSurahSelect() {
    CustomSelect.fill("surahSelectAudio", CustomSelect.surahOptions((val) => this._setSurah(val, 1)));
  }

  _setSurah(surahId, ayah = 1) {
    if (this._mem && !this._memInternal) this._memExit();
    const s = this._surah(surahId);
    if (!s) return;
    this.currentSurah = s.s_id;
    this.currentAyah = parseInt(ayah, 10);
    this.totalAyahs = s.verses_count;

    const page = this._getPageForAya(this.currentSurah, this.currentAyah);
    if (page) CustomSelect.set("pageSelectAudio", page);
    this._syncSurahAyaSelects();
    this._populateAyaSelect(surahId);
    CustomSelect.set("ayaSelectAudio", ayah);

    this._refreshDisplay();
    this._preloadTriggered = false;
    if (this.isPlaying) this._updateMediaNotification();
  }

  _populateAyaSelect(surahId) {
    if (!surahId || !this._surah(surahId)) {
      CustomSelect.fill("ayaSelectAudio", [{ value: "", label: APP_TEXTS.pickAyah, onSelect: () => { } }]);
      return;
    }
    CustomSelect.fill(
      "ayaSelectAudio",
      CustomSelect.ayahOptions(surahId, (val) => {
        this.currentAyah = parseInt(val, 10);
        this._updateCurrentDisplay();
      }),
    );
  }

  _populatePageSelect() {
    const options = CustomSelect.pageOptions((val) => this._handlePageChange({ target: { value: val } }));
    CustomSelect.fill("pageSelectAudio", options.map((o) => ({ ...o, label: `${APP_TEXTS.pageShort} ${o.value}` })));
  }

  _surah(id) {
    const n = Number(id);
    return this.surahs.find((s) => s.s_id === n) || null;
  }

  _getPageForAya(surah, ayah) {
    return this._getAyaRects(surah, ayah)?.[0]?.p ?? null;
  }

  // ---------- URL audio ----------

  _buildAyahUrl(surah, ayah) {
    if (!this.currentReciter) return null;
    return `${EVERYAYAH_BASE}${this.currentReciter.id}/${AppUtils.pad3(surah)}${AppUtils.pad3(ayah)}.mp3`;
  }

  // ---------- Lecture ----------

  play() {
    // ⚠️ ANTI-DOUBLE LECTURE
    if (this._isStarting) return;
    this._isStarting = true;

    if (this._mem) {
      this._clearMemTimer();
      this._mem.waiting = false;
    }
    if (!this.currentReciter || !this.currentSurah || !this.currentAyah) {
      this._isStarting = false;
      return;
    }
    this.audioElement = this.currentAudio;

    const url = this._buildAyahUrl(this.currentSurah, this.currentAyah);
    if (!url) {
      this._isStarting = false;
      return;
    }
    this.hasError = false;
    this._showStatus("", false);
    const needsBasmala = this.currentAyah === 1 && this.currentSurah !== 1 && this.currentSurah !== 9;
    const skipBasmala = (this.repeatMode === 1 || this._mem?.vDone > 0) && this.currentAyah === 1;

    if (needsBasmala && !skipBasmala) {
      this.audioElement.src = "./media/bismillah.mp3";
      this.audioElement.dataset.basmala = "true";
      this.audioElement.load();
      this._setRateOnElement(this.audioElement);
      this._ensureHighlight();

      if (this._boundListeners.audio.basmalaEnded) {
        this.audioElement.removeEventListener("ended", this._boundListeners.audio.basmalaEnded);
      }
      this._boundListeners.audio.basmalaEnded = () => {
        this.audioElement.dataset.basmala = "false";
        this.audioElement.removeEventListener("ended", this._boundListeners.audio.ended);
        this.audioElement.src = url;
        this.audioElement.load();
        this._setRateOnElement(this.audioElement);
        this.audioElement.play().catch(() => this._showStatus("❌ تعذر التشغيل", true));
        this.audioElement.addEventListener("ended", this._boundListeners.audio.ended);
        this._ensureHighlight();
      };
      this.audioElement.addEventListener("ended", this._boundListeners.audio.basmalaEnded, { once: true });
      this.audioElement.play().catch(() => this._showStatus("❌ تعذر التشغيل", true));
    } else {
      this.audioElement.dataset.basmala = "false";
      if (!navigator.onLine) { this._showOfflineError(); this._isStarting = false; return; }
      if (this.audioElement.src !== url) {
        this.audioElement.src = url;
        this.audioElement.load();
      }
      this._setRateOnElement(this.audioElement);
      this.audioElement.play().catch(() => this._handlePlayError());
      this._ensureHighlight();
    }

    this.isStopped = false;
    if (!this.miniBar?.classList.contains("hidden")) this._showMiniBar();
    else this._syncMiniBar();
    this._updateCurrentDisplay();
    this._crossfading = false;
    this._preloadTriggered = false;
    this._preloadNextAyah();

    // ⚠️ LIBÉRATION DU VERROU APRÈS 500ms
    setTimeout(() => { this._isStarting = false; }, 500);
  }

  _handlePlayError() {
    this.hasError = true;
    const reciters = RIWAYAT_CONFIG[this.currentRiwaya]?.reciters || [];
    if (reciters.length === 0) return;
    const currentIndex = reciters.findIndex((r) => r.id === this.currentReciter?.id);
    if (currentIndex !== -1 && currentIndex < reciters.length - 1) {
      const nextReciter = reciters[currentIndex + 1];
      this._selectReciter(nextReciter.id, false);
      this._showStatus(`⚠️ جاري التبديل إلى ${nextReciter.name}...`, true);
      const testUrl = `${EVERYAYAH_BASE}${nextReciter.id}/001001.mp3`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      fetch(testUrl, { method: 'HEAD', signal: controller.signal })
        .then(r => {
          clearTimeout(timeoutId);
          if (r.ok) this.play();
          else this._handlePlayError();
        })
        .catch(() => {
          clearTimeout(timeoutId);
          this._showOfflineError();
          this.stop();
        });
    } else {
      this.stop();
      this._showStatus("❌ تعذر تشغيل الملف، جرب قارئاً آخر", true);
    }
  }

  pause() {
    this._clearMemTimer();
    this.audioElement.pause();
  }

  stop() {
    this._memExit();
    this.cancelSleepTimer();
    this.isPlaying = false;
    this.isStopped = true;
    this._crossfading = false;
    this._nextAudioBuffer = null;
    window.quranReader?.clearHighlight();
    this._updateUI();
    this._retrying = false;
    this._isStarting = false;
    this._showStatus("", false);
    this._preloadTriggered = false;
    this._hideMiniBar(false);
    this.setCurrentSurahFromPage();
    this._destroyMediaNotification();
    [this.audioA, this.audioB].forEach((a) => {
      try {
        a.pause();
        a.removeAttribute("src");
        a.load();
      } catch {
        /* élément déjà libéré */
      }
    });
    if (navigator.mediaSession) {
      navigator.mediaSession.playbackState = "none";
      navigator.mediaSession.metadata = null;
    }
  }

  togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  _preloadNextAyah() {
    if (!this.currentSurah || !this.currentAyah) return;
    let nextSurah = this.currentSurah;
    let nextAyah = this.currentAyah + 1;
    if (nextAyah > this.totalAyahs) {
      if (this.repeatMode === 2) nextAyah = 1;
      else if (this.currentSurah < 114) {
        nextSurah = this.currentSurah + 1;
        const nextSurahData = this._surah(nextSurah);
        if (!nextSurahData) return;
        nextAyah = 1;
      } else return;
    }
    const url = this._buildAyahUrl(nextSurah, nextAyah);
    if (url) {
      const next = this.currentAudio === this.audioA ? this.audioB : this.audioA;
      next.src = url;
      next.preload = "auto";
      next.load();
      this._nextAudioBuffer = next;
    }
  }

  nextAyah() {
    if (this._mem) return this._memSkip(1);
    if (!this.currentSurah) return;
    this._isTransitioning = true;
    const surah = this._surah(this.currentSurah);
    if (surah) this.totalAyahs = surah.verses_count;
    if (this.currentAyah < this.totalAyahs) {
      this.currentAyah++;
      if (this.isPlaying) this.play();
      else this._afterNavigate();
    } else {
      if (this.isPlaying) this._onEndOfSurah();
      else this._afterNavigate();
    }
  }

  prevAyah() {
    if (this._mem) return this._memSkip(-1);
    if (!this.currentSurah) return;
    this._isTransitioning = true;
    if (this.currentAyah > 1) {
      this.currentAyah--;
      CustomSelect.set("ayaSelectAudio", this.currentAyah);
      if (this.isPlaying) this.play();
      else this._afterNavigate();
    } else {
      if (this.currentSurah > 1) {
        const prevSurah = this.currentSurah - 1;
        const prevSurahData = this._surah(prevSurah);
        if (prevSurahData) {
          this._setSurah(prevSurah, prevSurahData.verses_count);
          if (this.isPlaying) this.play();
          else this._afterNavigate();
        }
      }
    }
  }

  nextSurah() {
    this._memExit();
    if (!this.currentSurah || this.currentSurah >= 114) return;
    this._setSurah(this.currentSurah + 1, 1);
    if (this.isPlaying) this.play();
    else if (!this.isStopped) this._afterNavigate();
  }

  prevSurah() {
    this._memExit();
    if (!this.currentSurah || this.currentSurah <= 1) return;
    this._setSurah(this.currentSurah - 1, 1);
    if (this.isPlaying) this.play();
    else if (!this.isStopped) this._afterNavigate();
  }

  _onEndOfSurah() {
    if (this._sleepSurahEnd) { this.stop(); return; }
    if (this.repeatMode === 2) {
      this._setSurah(this.currentSurah, 1);
      this.play();
    } else {
      if (this.currentSurah < 114) {
        this._setSurah(this.currentSurah + 1, 1);
        this.play();
      } else this.stop();
    }
  }

  cycleRepeat() {
    if (this._mem) {
      window.quranApp?.showToast?.("غير متاح أثناء الحفظ");
      return;
    }
    this.repeatMode = (this.repeatMode + 1) % 3;
    this._updateRepeatBtn();
    window.quranApp.setPreference("repeat", this.repeatMode);
    const titles = ["بدون تكرار", "تكرار الآية", "تكرار السورة"];
    if (window.quranApp?.showToast) window.quranApp.showToast(titles[this.repeatMode]);
  }

  _updateRepeatBtn() {
    const svgRepeat = SVG.repeat;
    const labels = [svgRepeat, `¹${svgRepeat}`, `²${svgRepeat}`];
    const titles = ["بدون تكرار", "تكرار الآية", "تكرار السورة"];
    [this.elements.repeatBtn, document.getElementById("miniBarRepeat")].forEach((btn) => {
      if (!btn) return;
      btn.innerHTML = labels[this.repeatMode];
      btn.title = titles[this.repeatMode];
    });
  }

  cycleSpeed() {
    this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.speedOptions.length;
    const newSpeed = this.speedOptions[this.currentSpeedIndex];
    this._applyRate(newSpeed);
  }

  _applyRate(rate) {
    const numRate = parseFloat(rate);
    if (isNaN(numRate)) return;
    this.playbackRate = numRate;
    this._setRateOnElement(this.audioElement);
    this._setRateOnElement(this.audioA);
    this._setRateOnElement(this.audioB);
    const speedBtn = document.getElementById("miniBarSpeed");
    if (speedBtn) speedBtn.textContent = numRate.toFixed(2) + "×";
    if (this.elements.overlaySpeedBtn) this.elements.overlaySpeedBtn.textContent = numRate.toFixed(2) + "×";
    const index = this.speedOptions.indexOf(numRate);
    if (index !== -1) this.currentSpeedIndex = index;
    window.quranApp.setPreference("rate", numRate);
  }

  // ---------- Mini-barre et bouton flottant ----------

  _buildMiniBar() {
    if (document.getElementById("audioMiniBar")) return;
    const bar = document.createElement("div");
    bar.id = "audioMiniBar";
    bar.className = "audio-mini-bar hidden";
    bar.innerHTML = `
    <div class="mini-bar-bottom">
      <button class="audio-btn" id="miniBarOptions" title="خيارات">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </button>
      <div class="mini-bar-controls">
        <button class="audio-btn speed-btn" id="miniBarSpeed" title="السرعة">1.0×</button>
        <button class="audio-btn" id="miniBarRepeat" title="تكرار">
          ${SVG.repeat}
        </button>
        <button class="audio-btn" id="miniBarNextAyah" title="الآية التالية">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="13 6 21 12 13 18"/><polygon points="3 6 11 12 3 18"/></svg>
        </button>
        <button class="audio-btn" id="miniBarPlayPause" title="تشغيل">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="10 8 16 12 10 16"/></svg>
        </button>
        <button class="audio-btn" id="miniBarPrevAyah" title="الآية السابقة">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="11 6 3 12 11 18"/><polygon points="21 6 13 12 21 18"/></svg>
        </button>
        <button class="audio-btn" id="miniBarStop" title="إيقاف">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="8" y="8" width="8" height="8"/></svg>
        </button>
      </div>
      <button class="audio-btn" id="miniBarHide" title="إخفاء">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
    `;
    document.body.appendChild(bar);
    this.miniBar = bar;
  }

  _updateFabIndicator() {
    if (!this.fabBtn) return;
    this.fabBtn.classList.toggle("playing", this.isPlaying);
  }

  _syncMiniBar() {
    this._updateMiniPlayBtn();
    this._updateRepeatBtn();
    const speedBtn = document.getElementById("miniBarSpeed");
    if (speedBtn) speedBtn.textContent = this.playbackRate.toFixed(2) + "×";
  }

  _buildFab() {
    if (document.getElementById("audioFab")) return;
    const fab = document.createElement("button");
    fab.id = "audioFab";
    fab.className = "audio-fab hidden";
    fab.innerHTML = '<span>🎧</span><span class="fab-indicator"></span>';
    fab.title = "فتح المشغل";
    fab.addEventListener("click", () => this._showMiniBar());
    document.body.appendChild(fab);
    this.fabBtn = fab;
  }

  _showMiniBar() {
    this.miniBar?.classList.remove("hidden");
    this.fabBtn?.classList.add("hidden");
    setTimeout(() => window.quranReader?._adjustFooterHeight(), 50);
  }

  _hideMiniBar(showFab = true) {
    this.miniBar?.classList.add("hidden");
    if (showFab) this.fabBtn?.classList.remove("hidden");
    else this.fabBtn?.classList.add("hidden");
    requestAnimationFrame(() => window.quranReader?._adjustFooterHeight?.());
  }

  _updateMiniPlayBtn() {
    const btn = document.getElementById("miniBarPlayPause");
    this._updatePlayButton(btn);
  }

  _syncOverlay() {
    if (!document.getElementById("reciterSelectList")) return;
    if (this.currentReciter) CustomSelect.set("reciterSelect", this.currentReciter.id);
    if (this.currentSurah) {
      CustomSelect.set("surahSelectAudio", this.currentSurah);
      this._populateAyaSelect(this.currentSurah);
      if (this.currentAyah) CustomSelect.set("ayaSelectAudio", this.currentAyah);
    }
    const dur = this.audioElement?.duration || 0;
    const cur = this.audioElement?.currentTime || 0;
    if (this.elements.progressBar) this.elements.progressBar.value = dur ? (cur / dur) * 100 : 0;
    if (this.elements.currentTime) this.elements.currentTime.textContent = this._fmt(cur);
    if (this.elements.duration) this.elements.duration.textContent = this._fmt(dur);
    this._updateUI();
    this._updateCurrentDisplay();
    this._updateSleepPill();
  }

  // ---------- Événements ----------

  _setupAudioEvents() {
    const audioA = this.audioA;
    const audioB = this.audioB;

    const onPlay = () => {
      if (this.isStopped && !this.audioElement.getAttribute("src")) return;
      this.isPlaying = true;
      this.isStopped = false;
      this._isTransitioning = false;
      if (this._sleepPending) {
        const m = this._sleepPending;
        this._sleepPending = 0;
        this._startSleepCountdown(m);
      }
      if (this.hasError) {
        this.hasError = false;
        this._showStatus(`✅ ${this.currentReciter?.name}`, false);
        setTimeout(() => this._showStatus('', false), 3000);
      }
      this._updateUI();
      if (this.audioElement.dataset.basmala !== "true") this._updateMediaNotification();
    };

    const onPause = () => {
      this.isPlaying = false;
      this._updateUI();
      if (this.audioElement.dataset.basmala !== "true" && !this.audioElement.ended) {
        this._updateMediaNotification();
      }
    };

    const onEnded = () => {
      if (this.audioElement.dataset.basmala === "true") return;
      if (this._isStarting) return; // <-- AJOUTE CETTE LIGNE
      if (this._mem && !(this._sleepEndsAt && Date.now() >= this._sleepEndsAt)) { this._memOnEnded(); return; }
      if (this._sleepEndsAt && Date.now() >= this._sleepEndsAt) { this.stop(); return; }
      this.isPlaying = false;
      this.audioElement.volume = 1;
      this._crossfading = false;

      if (this.repeatMode === 1) {
        this.audioElement.currentTime = 0;
        this.audioElement.load();
        this.play();
        return;
      }
      if (this.currentAyah >= this.totalAyahs) { this._onEndOfSurah(); return; }

      if (
        this._nextAudioBuffer &&
        this._nextAudioBuffer.readyState >= 2 &&
        this._nextAudioBuffer.src === this._buildAyahUrl(this.currentSurah, this.currentAyah + 1)
      ) {
        const next = this._nextAudioBuffer;
        next.volume = this.audioElement.volume;
        this._setRateOnElement(next);
        next.play().catch(() => this.nextAyah());
        this.audioElement = next;
        this.currentAudio = next;
        this.currentAyah++;
        this._preloadTriggered = false;
        this._crossfading = false;
        this._updateCurrentDisplay();
        this._ensureHighlight();
        this._preloadNextAyah();
      } else {
        this.nextAyah();
      }
    };

    const onTimeUpdate = () => {
      const cur = this.audioElement.currentTime;
      const dur = this.audioElement.duration || 0;
      const pct = dur ? (cur / dur) * 100 : 0;
      if (this.elements.progressBar) this.elements.progressBar.value = pct;
      if (this.elements.currentTime) this.elements.currentTime.textContent = this._fmt(cur);
      if (this.elements.duration) this.elements.duration.textContent = this._fmt(dur);
    };

    const onError = (e) => {
      if (e.target !== this.audioElement) return;
      if (this._isStarting) return;
      if (this.isStopped) return;
      const code = e.target?.error?.code;
      if (!navigator.onLine || code === 2) {
        this._showOfflineError();
        this.stop();
        window.quranApp?.showToast("✈️ تحقق من الاتصال بالإنترنت");
        return;
      }
      if (code === 3) {
        this._showStatus(LOAD_FAIL_TEXT, true);
        this._handlePlayError();
        return;
      }
      if (!this._retrying) {
        this._retrying = true;
        this._showStatus("⏳", false);
        const miniPlay = document.getElementById("miniBarPlayPause");
        if (miniPlay) miniPlay.innerHTML = SPINNER_HTML;
        this.fabBtn?.classList.remove('playing');
        setTimeout(() => {
          if (this.isStopped) return;
          this._retrying = false;
          this.audioElement.load();
          this.audioElement.play().catch(() => {
            this._showStatus(LOAD_FAIL_TEXT, true);
            this._handlePlayError();
          });
        }, 2000);
      } else {
        this._retrying = false;
        this._showStatus(LOAD_FAIL_TEXT, true);
        this._handlePlayError();
      }
    };

    [audioA, audioB].forEach(audio => {
      audio.addEventListener("play", onPlay);
      audio.addEventListener("pause", onPause);
      audio.addEventListener("ended", onEnded);
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.addEventListener("error", onError);
    });

    this._boundListeners.audio.ended = onEnded;
  }

  _setupOverlayEvents() {
    if (this._overlayEventsAttached) return;
    this._overlayEventsAttached = true;
    const e = this.elements;
    e.overlaySpeedBtn?.addEventListener("click", () => this.cycleSpeed());
    const P = window.Picker;
    P?.bindButton(e.reciterSelect, "reciterSelectList", "اختر القارئ");
    P?.bindButton(e.surahSelect, "surahSelectAudioList", APP_TEXTS.pickSurah);
    P?.bindButton(e.ayaSelect, "ayaSelectAudioList", APP_TEXTS.pickAyah);
    P?.bindButton(e.pageSelect, "pageSelectAudioList", APP_TEXTS.pickPage);
    e.playPauseBtn?.addEventListener("click", () => this.togglePlay());
    e.stopBtn?.addEventListener("click", () => this.stop());
    e.prevSurahBtn?.addEventListener("click", () => this.prevSurah());
    e.nextSurahBtn?.addEventListener("click", () => this.nextSurah());
    e.prevAyahBtn?.addEventListener("click", () => this.prevAyah());
    e.nextAyahBtn?.addEventListener("click", () => this.nextAyah());
    e.progressBar?.addEventListener("input", (ev) => this._onProgressInput(ev));
    e.repeatBtn?.addEventListener("click", () => this.cycleRepeat());
    e.sleepBtn?.addEventListener("click", () => this.openSleepPicker());
  }

  _setupMiniBarEvents() {
    const on = (id, fn) => document.getElementById(id)?.addEventListener("click", fn);
    on("miniBarPlayPause", () => this.togglePlay());
    on("miniBarStop", () => this.stop());
    on("miniBarPrevAyah", () => this.prevAyah());
    on("miniBarNextAyah", () => this.nextAyah());
    on("miniBarOptions", () => this.showOverlay());
    on("miniBarHide", () => this._hideMiniBar(true));
    on("miniBarSpeed", () => this.cycleSpeed());
    on("miniBarRepeat", () => this.cycleRepeat());
  }

  _handlePageChange(e) {
    const page = parseInt(e.target.value);
    if (!page) return;
    const first = this._getFirstAyahOfPage(page);
    if (first) this._setSurah(first.surah, first.ayah);
  }

  _setupOnlineOffline() {
    window.addEventListener("online", () => this._updateOnlineStatus());
    window.addEventListener("offline", () => this._updateOnlineStatus());
    window.addEventListener(APP_EVENTS.pageChanged, (e) => {
      if (this.isStopped && e.detail?.page) this.setCurrentSurahFromPage();
    });
    this._updateOnlineStatus();
  }

  _updateOnlineStatus() {
    const isOnline = navigator.onLine;
    const playBtn = this.elements.playPauseBtn;
    const stopBtn = this.elements.stopBtn;
    const reciterSelect = this.elements.reciterSelect;
    const surahSelect = this.elements.surahSelect;

    if (!isOnline) {
      if (playBtn) playBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = true;
      if (reciterSelect) reciterSelect.disabled = true;
      if (surahSelect) surahSelect.disabled = true;
      this._showStatus("❌ لا يوجد اتصال بالإنترنت", true);
    } else {
      const ready = !!(this.currentReciter && this.currentSurah);
      if (playBtn) playBtn.disabled = !ready;
      if (stopBtn) stopBtn.disabled = !ready;
      if (reciterSelect) reciterSelect.disabled = false;
      if (surahSelect) surahSelect.disabled = false;
      if (!this.isPlaying) this._showStatus("", false);
    }
    this._updatePlayButton(playBtn);
    const miniPlay = document.getElementById("miniBarPlayPause");
    const miniStop = document.getElementById("miniBarStop");
    if (miniPlay) {
      miniPlay.disabled = !isOnline;
      if (!isOnline) miniPlay.innerHTML = SPINNER_HTML;
      else miniPlay.innerHTML = this.isPlaying ? SVG.pause : SVG.play;
    }
    if (miniStop) miniStop.disabled = !isOnline;
    this._updateFabIndicator();
  }

  setCurrentSurahFromPage() {
    if (this._mem) return;
    const page = window.quranApp?.getCurrentPage() || window.quranReader?.currentPage || 1;
    const first = this._getFirstAyahOfPage(page);
    if (first) { this._setSurah(first.surah, first.ayah); return; }
    const sura = window.quranCalculator?.getFirstSurahForPage(page);
    if (sura) { this._setSurah(sura.s_id, 1); return; }
    if (!this.currentSurah) this._setSurah(1, 1);
  }

  _updatePlayButton(btn) {
    if (!btn) return;
    if (!navigator.onLine) {
      btn.innerHTML = SPINNER_HTML;
      btn.disabled = true;
      btn.classList.remove('playing');
    } else {
      btn.innerHTML = this.isPlaying ? SVG.pause : SVG.play;
      btn.disabled = !(this.currentReciter && this.currentSurah);
      btn.classList.toggle("playing", this.isPlaying || this._isTransitioning);
    }
  }

  // ---------- Affichage ----------

  _updateUI() {
    const ready = !!(this.currentReciter && this.currentSurah);
    if (this.elements.stopBtn) this.elements.stopBtn.disabled = !ready;
    ["prevSurahBtn", "nextSurahBtn", "repeatBtn"].forEach((k) => {
      if (this.elements[k]) this.elements[k].disabled = false;
    });
    this._updateMiniPlayBtn();
    this._updateRepeatBtn();
    this._updatePlayButton(this.elements.playPauseBtn);
    this._updateFabIndicator();
  }

  _updateCurrentDisplay() {
    const surah = this._surah(this.currentSurah);
    const memDisplay = document.getElementById("memDisplay");

    if (this.elements.currentDisplay && surah) {
      this.elements.currentDisplay.textContent = `${surah.name} : آية ${this.currentAyah} / ${this.totalAyahs}`;
    }

    if (memDisplay) {
      if (this._mem) {
        memDisplay.innerHTML = this._memShort().trim();
        memDisplay.style.display = "flex";
      } else {
        memDisplay.style.display = "none";
      }
    }

    if (this.currentSurah) {
      const page = this._getPageForAya(this.currentSurah, this.currentAyah);
      requestAnimationFrame(() => {
        this._syncSurahAyaSelects();
        if (page) CustomSelect.set("pageSelectAudio", page);
      });
    }
    this._syncMiniBar();
  }

  _showStatus(msg, isError) {
    if (this.elements.status) {
      this.elements.status.textContent = msg;
      this.elements.status.classList.toggle("error", !!isError);
    }
    const overlayVisible = this.elements.overlay?.classList.contains("show");
    if (isError && msg && !overlayVisible && window.quranApp?.showToast) {
      window.quranApp.showToast(msg);
    }
  }

  _fmt(s) {
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  }
}

// ============================================================
//  DÉMARRAGE
// ============================================================

window.quranAudioPlayer = new QuranAudioPlayer();
window.quranAudioPlayer._loadAyaCoords();