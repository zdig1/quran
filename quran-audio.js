// ============================================
// CONFIGURATION RIWAYA
// ============================================

const EVERYAYAH_BASE = "https://everyayah.com/data/";
const AYA_COORDS_PATH = "./data/ayapage.json";

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

// ============================================
// CLASSE PRINCIPALE
// ============================================

class QuranAudioPlayer {
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
    this.currentSpeedIndex = 1.0;

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
    this._pendingHighlight = null;

    this._musicControlsReady = false;
    this._musicControlsInitDone = false;
    this._notificationCreated = false;
    this._inited = false;
    this._musicControlsRetryCount = 0;
    this._musicControlsRetryTimer = null;

    this._boundListeners = {
      audio: {}, overlay: {}, miniBar: {}, window: {},
    };
    this._overlayEventsAttached = false;
    // Minuterie (إيقاف تلقائي)
    this._sleepEndsAt = 0;
    this._fadeTimer = null;
    this._sleepSurahEnd = false;
    this._sleepPending = 0;
    this._sleepChoice = 0;
    this._sleepTimeout = null;
    this._sleepTick = null;
  }

  // ============================================
  // CONSTANTES SVG
  // ============================================

  _SVG_PLAY = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="8 6 18 12 8 18"/></svg>`;
  _SVG_PAUSE = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="7" y="6" width="3" height="12"/><rect x="14" y="6" width="3" height="12"/></svg>`;

  // ============================================
  // HIGHLIGHT
  // ============================================

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
        this._pendingHighlight = { surah: this.currentSurah, ayah: this.currentAyah, rects };
        window.quranApp?.goToPage(ayaPage);
      } else {
        reader?.clearHighlight();
      }
      return;
    }
    this._performHighlight(rects, ayaPage);
  }

  _applyPendingHighlight() {
    if (!this._pendingHighlight) return;
    const { surah, ayah, rects } = this._pendingHighlight;
    if (surah === this.currentSurah && ayah === this.currentAyah) {
      this._performHighlight(rects, rects[0]?.p);
    }
    this._pendingHighlight = null;
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
    this._updateCurrentDisplay();
    this._ensureHighlight();
    this._showMiniBar();
    this._updateUI();
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

  // ============================================
  // INIT
  // ============================================

  async init() {
    if (this._inited) return;
    this._inited = true;

    this._buildMiniBar();
    this._buildFab();
    await this._loadAyaCoords();
    this.surahs = window.quranCalculator?.getAllSurahs() || [];
    this._nextAudioBuffer = null;
    // ❌ RETIRER : this._cacheElements();
    // ❌ RETIRER : this._setupOverlayEvents();
    this._setupAudioEvents();       // ← garder (car audioA/audioB existent dès le constructor)
    this._setupMiniBarEvents();     // ← garder (car miniBar existe)

    const savedRate = parseFloat(localStorage.getItem("quran_rate")) || 1.0;
    this._applyRate(savedRate);
    const index = this.speedOptions.indexOf(parseFloat(savedRate));
    this.currentSpeedIndex = index !== -1 ? index : 1;
    this.repeatMode = parseInt(localStorage.getItem("quran_repeat") || "0");

    this._setupOnlineOffline();
    this._initMusicControls();
    document.addEventListener("deviceready", () => { this._initMusicControls(); });
    window.addEventListener("quran:appReady", () => { this._initMusicControls(); }, { once: true });
    window.addEventListener("quran:preferencesImported", () => {
      this._reloadPreferences();
    });
  }

  _cacheElements() {
    const g = (id) => document.getElementById(id);
    this.elements = {
      overlay: g("audioOverlay"),
      closeBtn: g("closeAudioBtn"),
      reciterSelect: g("reciterSelect"),
      surahSelect: g("surahSelectAudio"),
      ayaSelect: g("ayaSelectAudio"),
      pageSelect: g("pageSelectAudio"),
      overlaySpeedBtn: g("overlaySpeedBtn"),
      playPauseBtn: g("playPauseBtn"),
      stopBtn: g("stopBtn"),
      prevSurahBtn: g("prevSurahBtn"),
      nextSurahBtn: g("nextSurahBtn"),
      prevAyahBtn: g("prevAyahBtn"),
      nextAyahBtn: g("nextAyahBtn"),
      progressBar: g("audioProgress"),
      currentTime: g("audioCurrentTime"),
      duration: g("audioDuration"),
      repeatBtn: g("repeatBtn"),
      rateSelect: g("rateSelect"),
      status: g("audioStatus"),
      currentDisplay: g("currentSurahDisplay"),
      sleepBtn: g("sleepBtn"),  // ✅ AJOUTER
    };
    this.overlay = this.elements.overlay;
  }
  // ============================================
  // MUSIC CONTROLS
  // ============================================

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
    } catch (err) {
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

  _updateMediaNotification() {
    if (this.isStopped) return;
    if (!this._musicControlsReady) this._initMusicControls();
    if (!window.MusicControls || !this._musicControlsReady) return;
    if (this.audioElement?.dataset?.basmala === "true") return;
    if (!this.currentSurah || !this.currentAyah) return;

    const surah = this.surahs?.find((s) => s.s_id === this.currentSurah);
    const surahName = surah?.name || "القرآن الكريم";
    const surahNumber = surah?.s_id ? `${surah.s_id}` : "";
    const reciterName = this.currentReciter?.name || "قارئ";
    const track = this.currentSurah ? `${surahNumber}.${surahName} - آية ${this.currentAyah}` : "القرآن الكريم";

    try {
      const notifKey = `${track}|${reciterName}`;
      if (this._notificationCreated && this._notifKey === notifKey) {
        if (typeof window.MusicControls.updateIsPlaying === "function") {
          window.MusicControls.updateIsPlaying(this.isPlaying);
        }
        return;
      }
      this._notifKey = notifKey;
      window.MusicControls.create({
        track, artist: reciterName, album: "Holy Quran",
        cover: "media/icon-192.png", isPlaying: this.isPlaying,
        dismissable: true, hasPrev: true, hasNext: true, hasClose: true,
        ticker: `🎧 ${track}`,
      }, () => { }, () => { });
      this._notificationCreated = true;
    } catch (err) { }
  }

  _destroyMediaNotification() {
    if (!window.MusicControls) return;
    this._notificationCreated = false;
    const kill = () => { try { window.MusicControls.destroy(() => { }, () => { }); } catch { } };
    kill();
    setTimeout(kill, 400);
  }

  // ============================================
  // AYA COORDS
  // ============================================

  async _loadAyaCoords() {
    if (this.ayaCoords) return;
    try {
      const r = await fetch(AYA_COORDS_PATH, { cache: "force-cache" });
      if (r.ok) { this.ayaCoords = await r.json(); this.ayaCoordsLoaded = true; }
      else this.ayaCoordsLoaded = false;
    } catch (e) { this.ayaCoordsLoaded = false; }
  }

  _getAyaRects(surah, ayah) {
    if (!this.ayaCoords) return null;
    return this.ayaCoords.filter((r) => r.s === surah && r.a === ayah);
  }

  _getFirstAyahOfPage(page) {
    if (!this.ayaCoords) return null;
    const found = this.ayaCoords.find((r) => r.p === page);
    return found ? { surah: found.s, ayah: found.a } : null;
  }

  // ============================================
  // MINUTERIE (إيقاف تلقائي)
  // ============================================

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

  // ============================================
  // OVERLAY AUDIO (UI + Ouverture)
  // ============================================

  renderAudioUI() {
    const riwayaLabel = window.RIWAYAT_CONFIG?.[this.currentRiwaya]?.label || "حفص";
    const coordsStatus = this.ayaCoordsLoaded === false
      ? '<div class="audio-warning">⚠️ بيانات تحديد الآيات غير متوفرة، لن يظهر التظليل</div>'
      : "";

    return `
        ${coordsStatus}
        <div class="audio-select-row">
            <div class="custom-select" id="reciterSelectWrap">
                <button type="button" class="custom-select-btn" id="reciterSelect">
                    <span class="custom-select-val">اختر القارئ</span><span class="custom-select-arrow">▾</span>
                </button>
                <div class="custom-select-dropdown" id="reciterSelectList"></div>
            </div>
        </div>
        <div class="audio-select-row audio-select-grid">
            <div class="custom-select" id="surahSelectAudioWrap">
                <button type="button" class="custom-select-btn" id="surahSelectAudio">
                    <span class="custom-select-val">اختر السورة</span><span class="custom-select-arrow">▾</span>
                </button>
                <div class="custom-select-dropdown" id="surahSelectAudioList"></div>
            </div>
            <div class="custom-select" id="ayaSelectAudioWrap">
                <button type="button" class="custom-select-btn" id="ayaSelectAudio">
                    <span class="custom-select-val">اختر الآية</span><span class="custom-select-arrow">▾</span>
                </button>
                <div class="custom-select-dropdown" id="ayaSelectAudioList"></div>
            </div>
            <div class="custom-select" id="pageSelectAudioWrap">
                <button type="button" class="custom-select-btn" id="pageSelectAudio">
                    <span class="custom-select-val">اختر الصفحة</span><span class="custom-select-arrow">▾</span>
                </button>
                <div class="custom-select-dropdown" id="pageSelectAudioList"></div>
            </div>
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
        <div class="audio-sleep-row">
            <button type="button" class="audio-sleep-pill" id="sleepBtn">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="margin-left: 6px;">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                </svg>
                <span id="sleepBtnLabel">إيقاف تلقائي</span>
            </button>
        </div>
        <audio id="quranAudioPlayer" preload="none" style="display:none;"></audio>
    `;
  }

  async showOverlay() {
    const om = window.overlayManager;
    if (!om) return;
    const overlay = om.lazyLoadOverlay("audio");
    if (!overlay?.element || !overlay?.content) return;

    // ✅ 1. INITIALISATION (chargé une seule fois grâce à _inited)
    await this.init();

    // 2. Générer le HTML si nécessaire
    if (!overlay.contentGenerated) {
      overlay.content.innerHTML = this.renderAudioUI();
      overlay.contentGenerated = true;
      if (window.CustomSelect) {
        window.CustomSelect.reset();
        window.CustomSelect.initToggle();
      }
    }

    // 3. Cacher les éléments du HTML
    this._cacheElements();

    // 4. Peupler les sélecteurs
    this._populatePageSelect();
    this._populateSurahSelect();
    this._populateReciterSelect(this.currentRiwaya);

    // 5. Sélectionner le réciteur sauvegardé (une seule fois)
    if (!this.currentReciter) {
      const saved = localStorage.getItem(`quran_reciter_${window.ACTIVE_RIWAYA}`);
      this._selectReciter(saved, false);
    } else {
      window.CustomSelect.setValue('reciterSelect', 'reciterSelectList', this.currentReciter.id);
    }

    // 6. Brancher les événements (une seule fois)
    this._setupOverlayEvents();

    // 7. Afficher l'overlay
    om.showOverlay("audio");
    this._hideMiniBar(false);
    this._syncOverlay();

    // 8. Synchroniser la sourate sur la page courante
    if (!this.isPlaying && !this.currentSurah) {
      this.setCurrentSurahFromPage();
    }
  }
  _showSleepPicker() {
    const box = document.createElement("div");
    box.className = "confirm-backdrop";
    box.style.alignItems = "center";

    const dialog = document.createElement("div");
    dialog.className = "confirm-dialog";
    dialog.style.textAlign = "right";
    dialog.style.padding = "0";
    dialog.style.overflow = "hidden";

    const header = document.createElement("div");
    header.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:15px 20px; border-bottom:1px solid var(--border);";
    header.innerHTML = `
        <h3 style="margin:0; font-size:1.1rem; color:var(--text);">⏱️ إيقاف تلقائي</h3>
        <button type="button" class="close-btn" style="font-size:1.5rem; width:30px; height:30px; color:var(--error);">✕</button>
    `;
    dialog.appendChild(header);

    const list = document.createElement("div");
    list.style.cssText = "display:flex; flex-direction:column;";

    const options = [
      { value: 0, label: "معطّل" },
      { value: 5, label: "5 دقائق" },
      { value: 15, label: "15 دقيقة" },
      { value: 30, label: "30 دقيقة" },
      { value: "surah", label: "نهاية السورة" },
    ];

    options.forEach((opt) => {
      const row = document.createElement("button");
      row.type = "button";
      row.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:15px 20px; background:none; border:none; border-bottom:1px solid var(--border); cursor:pointer; font-family:inherit; font-size:1rem; width:100%; text-align:right; transition: background 0.2s;";
      const text = document.createElement("span");
      text.textContent = opt.label;
      row.appendChild(text);

      if (this._sleepChoice === opt.value) {
        text.style.color = "var(--primary)";
        text.style.fontWeight = "bold";
        const check = document.createElement("span");
        check.textContent = "🟢";
        check.style.fontSize = "1.2rem";
        row.appendChild(check);
      }

      row.addEventListener("mouseenter", () => row.style.background = "var(--surface-alt)");
      row.addEventListener("mouseleave", () => row.style.background = "none");
      row.addEventListener("click", () => {
        this.setSleepTimer(opt.value);
        box.remove();
      });
      list.appendChild(row);
    });

    dialog.appendChild(list);
    header.querySelector(".close-btn").addEventListener("click", () => box.remove());
    box.addEventListener("click", (e) => { if (e.target === box) box.remove(); });

    box.appendChild(dialog);
    document.body.appendChild(box);
  }

  // ============================================
  // RÉCITANTS
  // ============================================

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
        const option = document.createElement('div');
        option.className = 'custom-select-option reciter-option';
        option.dataset.value = reciter.id;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'reciter-name';
        nameSpan.textContent = reciter.name;
        nameSpan.addEventListener('click', (e) => {
          e.stopPropagation();
          this._selectReciter(reciter.id);
          this._closeReciterDropdown();
        });

        const pinBtn = document.createElement('button');
        pinBtn.className = `pin-reciter-btn action-icon ${isPinned ? 'pinned' : ''}`;
        pinBtn.textContent = isPinned ? '💫' : '📌';
        pinBtn.setAttribute('data-id', reciter.id);
        pinBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.togglePinReciter(reciter.id);
          this._populateReciterSelect(this.currentRiwaya);
          if (this.currentReciter && this.currentReciter.id === reciter.id) {
            this._updateReciterSelectButton();
          }
        });

        option.appendChild(nameSpan);
        option.appendChild(pinBtn);
        listContainer.appendChild(option);
      });
    };

    addOptions(pinned, '⭐ المفضلون');
    addOptions(normal, '📖 جميع القراء');

    if (this.currentReciter) {
      window.CustomSelect.setValue('reciterSelect', 'reciterSelectList', this.currentReciter.id);
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
    if (window.CustomSelect) {
      window.CustomSelect.setValue('reciterSelect', 'reciterSelectList', found.id);
    }
    if (save) localStorage.setItem(`quran_reciter_${this.currentRiwaya}`, found.id);
    this._updateCurrentReciterName();
    this._updateReciterSelectButton();
    this._updateUI();
    if (this.isPlaying) this._updateMediaNotification();
    if (this.isPlaying && !this.hasError) {
      this.audioElement.pause();
      this.play();
    }
  }
  _reloadPreferences() {
    // 🎙️ Récitateur actif
    const saved = localStorage.getItem(`quran_reciter_${this.currentRiwaya}`);
    if (saved) {
      const reciters = RIWAYAT_CONFIG[this.currentRiwaya]?.reciters || [];
      const found = reciters.find(r => r.id === saved);
      if (found && this.currentReciter?.id !== saved) {
        this._selectReciter(saved, false); // save=false : déjà en localStorage
      }
    }

    // ⭐ Récitateurs épinglés
    this._populateReciterSelect(this.currentRiwaya);

    // ⚡ Vitesse de lecture
    const savedRate = parseFloat(localStorage.getItem("quran_rate")) || 1.0;
    if (this.playbackRate !== savedRate) {
      this._applyRate(savedRate);
    }

    // 🔁 Mode répétition
    const savedRepeat = parseInt(localStorage.getItem("quran_repeat") || "0");
    if (this.repeatMode !== savedRepeat) {
      this.repeatMode = savedRepeat;
      this._updateRepeatBtn();
    }

    // 🔄 Rafraîchir l'UI si l'overlay est ouvert
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
    const key = `pinnedReciters_${this.currentRiwaya}`;
    const stored = window.quranApp.getPreference(key);
    if (stored) {
      try { return JSON.parse(stored); }
      catch { return []; }
    }
    return [];
  }

  savePinnedReciters(pinnedList) {
    const key = `pinnedReciters_${this.currentRiwaya}`;
    window.quranApp.setPreference(key, JSON.stringify(pinnedList));
  }

  togglePinReciter(reciterId) {
    let pinned = this.getPinnedReciters();
    const index = pinned.indexOf(reciterId);
    if (index === -1) pinned.push(reciterId);
    else pinned.splice(index, 1);
    this.savePinnedReciters(pinned);
    this._populateReciterSelect(this.currentRiwaya);
    if (this.currentReciter) {
      window.CustomSelect.setValue('reciterSelect', 'reciterSelectList', this.currentReciter.id);
    }
    return index === -1;
  }

  isReciterPinned(reciterId) {
    return this.getPinnedReciters().includes(reciterId);
  }

  _updateCurrentReciterName() { }

  // ============================================
  // SOURATES
  // ============================================

  _populateSurahSelect() {
    if (!window.CustomSelect) return;
    const options = [];
    this.surahs.forEach(s => {
      options.push({
        value: String(s.s_id),
        label: `${s.s_id}.${s.name}`,
        onSelect: (val) => this._setSurah(val, 1)
      });
    });
    window.CustomSelect.render('surahSelectAudioList', options);
  }

  _setSurah(surahId, ayah = 1) {
    const s = this.surahs.find((x) => x.s_id == surahId);
    if (!s) return;
    this.currentSurah = parseInt(surahId);
    this.currentAyah = parseInt(ayah);
    const page = this._getPageForAya(this.currentSurah, this.currentAyah);
    if (page && window.CustomSelect) {
      window.CustomSelect.setValue('pageSelectAudio', 'pageSelectAudioList', page);
    }
    this.totalAyahs = s.verses_count;
    if (window.CustomSelect) {
      window.CustomSelect.setValue('surahSelectAudio', 'surahSelectAudioList', surahId);
      this._populateAyaSelect(surahId);
      window.CustomSelect.setValue('ayaSelectAudio', 'ayaSelectAudioList', ayah);
    }
    this._updateCurrentDisplay();
    this._updateUI();
    this._preloadTriggered = false;
    if (this.isPlaying) this._updateMediaNotification();
  }

  _populateAyaSelect(surahId) {
    if (!window.CustomSelect) return;
    if (!surahId) {
      window.CustomSelect.render('ayaSelectAudioList', [{ value: '', label: 'اختر الآية', onSelect: () => { } }]);
      return;
    }
    const surah = this.surahs.find((s) => s.s_id == surahId);
    if (!surah) {
      window.CustomSelect.render('ayaSelectAudioList', [{ value: '', label: 'اختر الآية', onSelect: () => { } }]);
      return;
    }
    const options = [];
    for (let i = 1; i <= surah.verses_count; i++) {
      options.push({
        value: String(i),
        label: `الآية ${i}`,
        onSelect: (val) => { this.currentAyah = parseInt(val); this._updateCurrentDisplay(); }
      });
    }
    window.CustomSelect.render('ayaSelectAudioList', options);
  }

  _populatePageSelect() {
    if (!window.CustomSelect) return;
    const options = [];
    for (let i = 1; i <= 604; i++) {
      options.push({
        value: String(i),
        label: `ص ${i}`,
        onSelect: (val) => this._handlePageChange({ target: { value: val } })
      });
    }
    window.CustomSelect.render('pageSelectAudioList', options);
  }

  _getPageForAya(surah, ayah) {
    if (!this.ayaCoords) return null;
    const found = this.ayaCoords.find((r) => r.s === surah && r.a === ayah);
    return found ? found.p : null;
  }

  // ============================================
  // URL AUDIO
  // ============================================

  _buildAyahUrl(surah, ayah) {
    if (!this.currentReciter) return null;
    const s = String(surah).padStart(3, "0");
    const a = String(ayah).padStart(3, "0");
    return `${EVERYAYAH_BASE}${this.currentReciter.id}/${s}${a}.mp3`;
  }

  // ============================================
  // LECTURE
  // ============================================

  play() {
    if (!this.currentReciter || !this.currentSurah || !this.currentAyah) return;
    this.audioElement = this.currentAudio;

    const url = this._buildAyahUrl(this.currentSurah, this.currentAyah);
    if (!url) return;
    this.hasError = false;
    this._showStatus("", false);
    const needsBasmala = this.currentAyah === 1 && this.currentSurah !== 1 && this.currentSurah !== 9;
    const skipBasmala = this.repeatMode === 1 && this.currentAyah === 1;

    if (needsBasmala && !skipBasmala) {
      const basmalaUrl = `./media/bismillah.mp3`;
      this.audioElement.src = basmalaUrl;
      this.audioElement.dataset.basmala = "true";
      this.audioElement.load();
      this.audioElement.playbackRate = this.playbackRate;
      this._ensureHighlight();

      if (this._boundListeners.audio.basmalaEnded) {
        this.audioElement.removeEventListener("ended", this._boundListeners.audio.basmalaEnded);
      }
      this._boundListeners.audio.basmalaEnded = () => {
        this.audioElement.dataset.basmala = "false";
        this.audioElement.removeEventListener("ended", this._boundListeners.audio.ended);
        this.audioElement.src = url;
        this.audioElement.load();
        this.audioElement.playbackRate = this.playbackRate;
        this.audioElement.play().catch(() => this._showStatus("❌ تعذر التشغيل", true));
        this.audioElement.addEventListener("ended", this._boundListeners.audio.ended);
        this._ensureHighlight();
        this._updateMediaNotification();
      };
      this.audioElement.addEventListener("ended", this._boundListeners.audio.basmalaEnded, { once: true });
      this.audioElement.play().catch(() => this._showStatus("❌ تعذر التشغيل", true));
    } else {
      this.audioElement.dataset.basmala = "false";
      if (!navigator.onLine) { this._showOfflineError(); return; }
      if (this.audioElement.src !== url) {
        this.audioElement.src = url;
        this.audioElement.load();
      }
      this.audioElement.playbackRate = this.playbackRate;
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
  }

  _handlePlayError() {
    this.hasError = true;
    const reciters = RIWAYAT_CONFIG[this.currentRiwaya]?.reciters || [];
    if (reciters.length === 0) return;
    const currentIndex = reciters.findIndex((r) => r.id === this.currentReciter?.id);
    if (currentIndex !== -1 && currentIndex < reciters.length - 1) {
      const nextReciter = reciters[currentIndex + 1];
      this._selectReciter(nextReciter.id);
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
      if (!this.elements.overlay?.classList.contains('show')) {
        this.showOverlay();
      }
    }
  }

  pause() {
    this.audioElement.pause();
  }

  stop() {
    this.audioElement.pause();
    this.audioElement.volume = 1;
    this.audioElement.currentTime = 0;
    this.audioA.pause();
    this.audioA.currentTime = 0;
    this.audioB.pause();
    this.audioB.currentTime = 0;

    this._mp3qEndTime = null;
    this.cancelSleepTimer();
    this.isPlaying = false;
    this.isStopped = true;
    this._crossfading = false;
    if (this._nextAudioBuffer) {
      this._nextAudioBuffer.pause();
      this._nextAudioBuffer.currentTime = 0;
    }
    window.quranReader?.clearHighlight();
    this._pendingHighlight = null;
    this._updateUI();
    this._retrying = false;
    this._showStatus("", false);
    this._preloadTriggered = false;
    this._hideMiniBar(false);
    this.setCurrentSurahFromPage();
    this._destroyMediaNotification();
    [this.audioA, this.audioB].forEach((a) => {
      try { a.pause(); a.removeAttribute("src"); a.load(); } catch { }
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
        nextSurah = this.currentSurah < 114 ? this.currentSurah + 1 : 1;
        const nextSurahData = this.surahs.find((s) => s.s_id === nextSurah);
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
    if (!this.currentSurah) return;
    this._isTransitioning = true;
    const surah = this.surahs.find((s) => s.s_id === this.currentSurah);
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
    if (!this.currentSurah) return;
    this._isTransitioning = true;
    if (this.currentAyah > 1) {
      this.currentAyah--;
      if (window.CustomSelect) {
        window.CustomSelect.setValue('ayaSelectAudio', 'ayaSelectAudioList', this.currentAyah);
      }
      if (this.isPlaying) this.play();
      else this._afterNavigate();
    } else {
      if (this.currentSurah > 1) {
        const prevSurah = this.currentSurah - 1;
        const prevSurahData = this.surahs.find((s) => s.s_id === prevSurah);
        if (prevSurahData) {
          this._setSurah(prevSurah, prevSurahData.verses_count);
          if (this.isPlaying) this.play();
          else this._afterNavigate();
        }
      }
    }
  }

  nextSurah() {
    if (!this.currentSurah || this.currentSurah >= 114) return;
    this._setSurah(this.currentSurah + 1, 1);
    if (this.isPlaying) this.play();
    else if (!this.isStopped) this._afterNavigate();
  }

  prevSurah() {
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
    this.repeatMode = (this.repeatMode + 1) % 3;
    this._updateRepeatBtn();
    localStorage.setItem("quran_repeat", this.repeatMode);
    const titles = ["بدون تكرار", "تكرار الآية", "تكرار السورة"];
    if (window.quranApp?.showToast) window.quranApp.showToast(titles[this.repeatMode]);
  }

  _updateRepeatBtn() {
    const svgRepeat = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="m3.512 6.19 1.492-1.492-1.297-1.297L0 7.107l3.707 3.707 1.297-1.297-1.492-1.492h17.356V12h1.835V6.19Zm16.781 6.996-1.297 1.297 1.492 1.492H3.132V12H1.297v5.81h19.191l-1.492 1.492 1.297 1.297L24 16.893Z"/></svg>`;
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
    if (this.audioElement) this.audioElement.playbackRate = this.playbackRate;
    if (this.audioA) this.audioA.playbackRate = this.playbackRate;
    if (this.audioB) this.audioB.playbackRate = this.playbackRate;
    const speedBtn = document.getElementById("miniBarSpeed");
    if (speedBtn) speedBtn.textContent = numRate.toFixed(2) + "×";
    if (this.elements.overlaySpeedBtn) this.elements.overlaySpeedBtn.textContent = numRate.toFixed(2) + "×";
    const index = this.speedOptions.indexOf(numRate);
    if (index !== -1) this.currentSpeedIndex = index;
    localStorage.setItem("quran_rate", numRate);
  }

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
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="m3.512 6.19 1.492-1.492-1.297-1.297L0 7.107l3.707 3.707 1.297-1.297-1.492-1.492h17.356V12h1.835V6.19Zm16.781 6.996-1.297 1.297 1.492 1.492H3.132V12H1.297v5.81h19.191l-1.492 1.492 1.297 1.297L24 16.893Z"/></svg>
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
    if (this.isPlaying) this.fabBtn.classList.add("playing");
    else this.fabBtn.classList.remove("playing");
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
    requestAnimationFrame(() => {
      if (window.quranReader && typeof window.quranReader._adjustFooterHeight === 'function') {
        window.quranReader._adjustFooterHeight();
      }
    });
  }

  _updateMiniPlayBtn() {
    const btn = document.getElementById("miniBarPlayPause");
    this._updatePlayButton(btn);
  }

  _syncOverlay() {
    if (!document.getElementById('reciterSelectList')) return;
    if (this.currentReciter && window.CustomSelect) {
      window.CustomSelect.setValue('reciterSelect', 'reciterSelectList', this.currentReciter.id);
    }
    if (this.currentSurah && window.CustomSelect) {
      window.CustomSelect.setValue('surahSelectAudio', 'surahSelectAudioList', this.currentSurah);
      this._populateAyaSelect(this.currentSurah);
      if (this.currentAyah) window.CustomSelect.setValue('ayaSelectAudio', 'ayaSelectAudioList', this.currentAyah);
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

  _setupAudioEvents() {
    const audioA = this.audioA;
    const audioB = this.audioB;

    const onPlay = () => {
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

      if (this._nextAudioBuffer && this._nextAudioBuffer.readyState >= 2) {
        const next = this._nextAudioBuffer;
        next.volume = this.audioElement.volume;
        next.playbackRate = this.playbackRate;
        next.play().catch(() => this.nextAyah());
        this.audioElement = next;
        this.currentAudio = next;
        this.currentAyah++;
        this._preloadTriggered = false;
        this._crossfading = false;
        this._updateCurrentDisplay();
        this._ensureHighlight();
        this._preloadNextAyah();
        this._updateMediaNotification();
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
      const code = e.target?.error?.code;
      if (!navigator.onLine || code === 2) {
        this._showOfflineError();
        this.stop();
        window.quranApp?.showToast("✈️ تحقق من الاتصال بالإنترنت");
        return;
      }
      if (code === 3) {
        this._showStatus("❌ فشل تحميل الملف", true);
        this._handlePlayError();
        return;
      }
      if (!this._retrying) {
        this._retrying = true;
        this._showStatus("⏳", false);
        const miniPlay = document.getElementById("miniBarPlayPause");
        if (miniPlay) miniPlay.innerHTML = '<span class="spinner small"></span>';
        this.fabBtn?.classList.remove('playing');
        setTimeout(() => {
          this._retrying = false;
          this.audioElement.load();
          this.audioElement.play().catch(() => {
            this._showStatus("❌ فشل تحميل الملف", true);
            this._handlePlayError();
          });
        }, 2000);
      } else {
        this._retrying = false;
        this._showStatus("❌ فشل تحميل الملف", true);
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

    this._boundListeners.audio.play = onPlay;
    this._boundListeners.audio.pause = onPause;
    this._boundListeners.audio.ended = onEnded;
    this._boundListeners.audio.timeupdate = onTimeUpdate;
    this._boundListeners.audio.error = onError;
  }

  _setupOverlayEvents() {
    // ✅ Éviter les doublons
    if (this._overlayEventsAttached) return;
    this._overlayEventsAttached = true;

    this._boundListeners.overlay.playPauseClick = () => this.togglePlay();
    this._boundListeners.overlay.stopClick = () => this.stop();
    this._boundListeners.overlay.prevSurahClick = () => this.prevSurah();
    this._boundListeners.overlay.nextSurahClick = () => this.nextSurah();
    this._boundListeners.overlay.prevAyahClick = () => this.prevAyah();
    this._boundListeners.overlay.nextAyahClick = () => this.nextAyah();
    this._boundListeners.overlay.progressInput = (e) => this._onProgressInput(e);
    this._boundListeners.overlay.repeatClick = () => this.cycleRepeat();
    this._boundListeners.overlay.speedClick = () => this.cycleSpeed();
    this._boundListeners.overlay.sleepClick = () => this.openSleepPicker();

    this.elements.overlaySpeedBtn?.addEventListener("click", this._boundListeners.overlay.speedClick);
    this.elements.playPauseBtn?.addEventListener("click", this._boundListeners.overlay.playPauseClick);
    this.elements.stopBtn?.addEventListener("click", this._boundListeners.overlay.stopClick);
    this.elements.prevSurahBtn?.addEventListener("click", this._boundListeners.overlay.prevSurahClick);
    this.elements.nextSurahBtn?.addEventListener("click", this._boundListeners.overlay.nextSurahClick);
    this.elements.prevAyahBtn?.addEventListener("click", this._boundListeners.overlay.prevAyahClick);
    this.elements.nextAyahBtn?.addEventListener("click", this._boundListeners.overlay.nextAyahClick);
    this.elements.progressBar?.addEventListener("input", this._boundListeners.overlay.progressInput);
    this.elements.repeatBtn?.addEventListener("click", this._boundListeners.overlay.repeatClick);
    document.getElementById("sleepBtn")?.addEventListener("click", this._boundListeners.overlay.sleepClick);
  }
  _setupMiniBarEvents() {
    const g = (id) => document.getElementById(id);

    this._boundListeners.miniBar.playPauseClick = () => this.togglePlay();
    this._boundListeners.miniBar.stopClick = () => { this.stop(); this._hideMiniBar(false); };
    this._boundListeners.miniBar.prevAyahClick = () => this.prevAyah();
    this._boundListeners.miniBar.nextAyahClick = () => this.nextAyah();
    this._boundListeners.miniBar.optionsClick = () => this.showOverlay();
    this._boundListeners.miniBar.hideClick = () => this._hideMiniBar(true);
    this._boundListeners.miniBar.progressInput = (e) => this._onProgressInput(e);
    this._boundListeners.miniBar.speedClick = () => this.cycleSpeed();
    this._boundListeners.miniBar.repeatClick = () => this.cycleRepeat();

    g("miniBarPlayPause")?.addEventListener("click", this._boundListeners.miniBar.playPauseClick);
    g("miniBarStop")?.addEventListener("click", this._boundListeners.miniBar.stopClick);
    g("miniBarPrevAyah")?.addEventListener("click", this._boundListeners.miniBar.prevAyahClick);
    g("miniBarNextAyah")?.addEventListener("click", this._boundListeners.miniBar.nextAyahClick);
    g("miniBarOptions")?.addEventListener("click", this._boundListeners.miniBar.optionsClick);
    g("miniBarHide")?.addEventListener("click", this._boundListeners.miniBar.hideClick);
    g("miniBarProgress")?.addEventListener("input", this._boundListeners.miniBar.progressInput);
    g("miniBarSpeed")?.addEventListener("click", this._boundListeners.miniBar.speedClick);
    g("miniBarRepeat")?.addEventListener("click", this._boundListeners.miniBar.repeatClick);
  }

  _handlePageChange(e) {
    const page = parseInt(e.target.value);
    if (!page) return;
    const first = this._getFirstAyahOfPage(page);
    if (first) this._setSurah(first.surah, first.ayah);
  }

  _setupOnlineOffline() {
    this._boundListeners.window.online = () => this._updateOnlineStatus();
    this._boundListeners.window.offline = () => this._updateOnlineStatus();
    window.addEventListener("online", this._boundListeners.window.online);
    window.addEventListener("offline", this._boundListeners.window.offline);
    this._updateOnlineStatus();
    this._boundListeners.window.pageChanged = (e) => {
      if (this.isStopped && e.detail?.page) this.setCurrentSurahFromPage();
    };
    window.addEventListener("quran:pageChanged", this._boundListeners.window.pageChanged);
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
      if (!isOnline) miniPlay.innerHTML = '<span class="spinner small"></span>';
      else miniPlay.innerHTML = this.isPlaying ? this._SVG_PAUSE : this._SVG_PLAY;
    }
    if (miniStop) miniStop.disabled = !isOnline;
    this._updateFabIndicator();
  }

  setCurrentSurahFromPage() {
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
      btn.innerHTML = '<span class="spinner small"></span>';
      btn.disabled = true;
      btn.classList.remove('playing');
    } else {
      btn.innerHTML = this.isPlaying ? this._SVG_PAUSE : this._SVG_PLAY;
      btn.disabled = !(this.currentReciter && this.currentSurah);
      if (this.isPlaying || this._isTransitioning) btn.classList.add('playing');
      else btn.classList.remove('playing');
    }
  }

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
    const surah = this.surahs.find((s) => s.s_id === this.currentSurah);
    if (this.elements.currentDisplay && surah) {
      this.elements.currentDisplay.textContent = `${surah.name} : آية ${this.currentAyah} / ${this.totalAyahs}`;
    }
    if (window.CustomSelect && this.currentSurah) {
      const page = this._getPageForAya(this.currentSurah, this.currentAyah);
      requestAnimationFrame(() => {
        window.CustomSelect.setValue('surahSelectAudio', 'surahSelectAudioList', String(this.currentSurah));
        window.CustomSelect.setValue('ayaSelectAudio', 'ayaSelectAudioList', String(this.currentAyah));
        if (page) window.CustomSelect.setValue('pageSelectAudio', 'pageSelectAudioList', String(page));
      });
    }
    this._syncMiniBar();
  }

  _showStatus(msg, isError) {
    if (this.elements.status) {
      this.elements.status.textContent = msg;
      this.elements.status.style.color = isError ? "var(--error)" : "var(--text-light)";
    }
    const overlayVisible = this.elements.overlay?.classList.contains("show");
    if (isError && msg && !overlayVisible && window.quranApp?.showToast) {
      window.quranApp.showToast(msg);
    }
  }

  _fmt(s) {
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  }

  destroy() {
    this.stop();
    const audioA = this.audioA;
    const audioB = this.audioB;
    if (audioA) {
      audioA.removeEventListener("play", this._boundListeners.audio.play);
      audioA.removeEventListener("pause", this._boundListeners.audio.pause);
      audioA.removeEventListener("ended", this._boundListeners.audio.ended);
      audioA.removeEventListener("timeupdate", this._boundListeners.audio.timeupdate);
      audioA.removeEventListener("error", this._boundListeners.audio.error);
    }
    if (audioB) {
      audioB.removeEventListener("play", this._boundListeners.audio.play);
      audioB.removeEventListener("pause", this._boundListeners.audio.pause);
      audioB.removeEventListener("ended", this._boundListeners.audio.ended);
      audioB.removeEventListener("timeupdate", this._boundListeners.audio.timeupdate);
      audioB.removeEventListener("error", this._boundListeners.audio.error);
    }
    const g = (id) => document.getElementById(id);
    const mb = this._boundListeners.miniBar;
    g("miniBarPlayPause")?.removeEventListener("click", mb.playPauseClick);
    g("miniBarStop")?.removeEventListener("click", mb.stopClick);
    g("miniBarPrevAyah")?.removeEventListener("click", mb.prevAyahClick);
    g("miniBarNextAyah")?.removeEventListener("click", mb.nextAyahClick);
    g("miniBarOptions")?.removeEventListener("click", mb.optionsClick);
    g("miniBarHide")?.removeEventListener("click", mb.hideClick);
    g("miniBarProgress")?.removeEventListener("input", mb.progressInput);
    g("miniBarSpeed")?.removeEventListener("click", mb.speedClick);
    g("miniBarRepeat")?.removeEventListener("click", mb.repeatClick);
    window.removeEventListener("online", this._boundListeners.window.online);
    window.removeEventListener("offline", this._boundListeners.window.offline);
    window.removeEventListener("quran:pageChanged", this._boundListeners.window.pageChanged);
    if (this.miniBar) this.miniBar.remove();
    if (this.fabBtn) this.fabBtn.remove();
    if (this._musicControlsRetryTimer) {
      clearTimeout(this._musicControlsRetryTimer);
      this._musicControlsRetryTimer = null;
    }
    this._destroyMediaNotification();
  }
}

window.quranAudioPlayer = new QuranAudioPlayer();
window.quranAudioPlayer._loadAyaCoords();