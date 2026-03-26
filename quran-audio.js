// ============================================
// CONFIGURATION — à modifier selon l'APK
// ============================================

// Riwaya active — décommenter celle souhaitée
const ACTIVE_RIWAYA = "hafs";
// const ACTIVE_RIWAYA = "warsh";
// const ACTIVE_RIWAYA = "qaloun";

// Chemins des données
const EVERYAYAH_BASE = "https://everyayah.com/data/";
const AYA_COORDS_PATH = "./data/ayainfo.json";
// Récitants disponibles par riwaya
const RIWAYAT_CONFIG = (window.RIWAYAT_CONFIG = {
  hafs: {
    label: "حفص",
    reciters: [
      { id: "Ibrahim_Akhdar_64kbps", name: "إبراهيم الأخضر" },
      { id: "Ahmed_ibn_Ali_al-Ajamy_64kbps_QuranExplorer.Com", name: "أحمد العجمي" },
      { id: "Akram_AlAlaqimy_128kbps", name: "أكرم العلاقمي" },
      { id: "Abu_Bakr_Ash-Shaatree_64kbps", name: "أبو بكر الشاطري" },
      { id: "Ali_Jaber_64kbps", name: "علي جابر" },
      { id: "Ali_Hajjaj_AlSuesy_128kbps", name: "علي حجاج السويسي" },
      { id: "Hudhaify_64kbps", name: "علي الحذيفي" },
      { id: "AbdulSamad_64kbps_QuranExplorer.Com", name: "عبد الباسط عبد الصمد — مرتل" },
      { id: "Abdul_Basit_Mujawwad_128kbps", name: "عبد الباسط — مجوّد" },
      { id: "Abdurrahmaan_As-Sudais_64kbps", name: "عبد الرحمن السديس" },
      { id: "Abdullah_Basfar_64kbps", name: "عبدالله بصفر" },
      { id: "Abdullah_Matroud_128kbps", name: "عبدالله مطرود" },
      { id: "Abdullaah_3awwaad_Al-Juhaynee_128kbps", name: "عبدالله الجهني" },
      { id: "Fares_Abbad_64kbps", name: "فارس عباد" },
      { id: "khalefa_al_tunaiji_64kbps", name: "خليفة الطنيجي" },
      { id: "Karim_Mansoori_40kbps", name: "كريم منصوري" },
      { id: "Maher_AlMuaiqly_64kbps", name: "ماهر المعيقلي" },
      { id: "Muhammad_Jibreel_64kbps", name: "محمد جبريل" },
      { id: "Muhammad_Ayyoub_64kbps", name: "محمد أيوب" },
      { id: "Mohammad_al_Tablaway_64kbps", name: "محمد الطبلاوي" },
      { id: "Menshawi_32kbps", name: "محمد صديق المنشاوي — مرتل" },
      { id: "Minshawy_Mujawwad_64kbps", name: "المنشاوي — مجوّد" },
      { id: "Minshawy_Teacher_128kbps", name: "المنشاوي — معلم" },
      { id: "Husary_64kbps", name: "محمود خليل الحصري — مرتل" },
      { id: "Husary_Mujawwad_64kbps", name: "الحصري — مجوّد" },
      { id: "Husary_Muallim_128kbps", name: "الحصري — معلم" },
      { id: "mahmoud_ali_al_banna_32kbps", name: "محمود علي البنا" },
      { id: "Mustafa_Ismail_48kbps", name: "مصطفى إسماعيل" },
      { id: "Nasser_Alqatami_128kbps", name: "ناصر القطامي" },
      { id: "Nabil_Rifa3i_48kbps", name: "نبيل الرفاعي" },
      { id: "Hani_Rifai_64kbps", name: "هاني الرفاعي" },
      { id: "Yaser_Salamah_128kbps", name: "ياسر سلامة" },
      { id: "Yasser_Ad-Dussary_128kbps", name: "ياسر الدوسري" },
      { id: "Sahl_Yassin_128kbps", name: "سهل ياسين" },
      { id: "Saood_ash-Shuraym_64kbps", name: "سعود الشريم" },
      { id: "Ghamadi_40kbps", name: "سعد الغامدي" },
      { id: "Salah_Al_Budair_128kbps", name: "صالح البدير" },
      { id: "Salaah_AbdulRahman_Bukhatir_128kbps", name: "صلاح بوخاطر" },
      { id: "Alafasy_64kbps", name: "مشاري العفاسي" },
    ],
  },
  warsh: {
    label: "ورش",
    reciters: [
      { id: "warsh/warsh_ibrahim_aldosary_128kbps", name: "إبراهيم الدوسري" },
      { id: "warsh/warsh_yassin_al_jazaery_64kbps", name: "ياسين الجزائري" },
    ],
  },
  qaloun: {
    label: "قالون",
    reciters: [],
  },
});
// ============================================
// CLASSE PRINCIPALE
// ============================================

class QuranAudioPlayer {
  constructor() {
    // État récitant
    this.currentRiwaya = ACTIVE_RIWAYA;
    this.currentReciter = null; // { id, name }

    // État lecture
    this.currentSurah = null; // 1-114
    this.currentAyah = null; // numéro aya en cours
    this.totalAyahs = 0; // total ayas de la sourate courante
    this.isPlaying = false;
    this.isStopped = true;

    // Options
    this.repeatMode = 0; // 0=off 1=aya 2=surah 3=all
    this.playbackRate = 1;

    // Vitesse cyclique
    this.speedOptions = [0.75, 1.0, 1.25, 1.5];
    this.currentSpeedIndex = 1.0;

    // DOM
    this.audioElement = null;
    this.miniBar = null;
    this.fabBtn = null;
    this.elements = {};

    // Données
    this.ayaCoords = null; // cache ayainfo.json
    this.ayaCoordsLoaded = false;
    this.surahs = [];

    // Préchargement
    this._preloadTriggered = false;
    this._nextAudioBuffer = null;
    this._crossfading = false;
    // Wake lock
    this._wakeLock = null;
    this._isTransitioning = false;
    this._retrying = false;
    // Écouteurs stockés pour destruction
    this._boundListeners = {
      audio: {},
      overlay: {},
      miniBar: {},
      window: {},
    };
  }

  // ============================================
  // INIT
  // ============================================

  async init() {
    this._buildMiniBar();
    this._buildFab();
    await this._loadAyaCoords();
    this.surahs = window.quranCalculator?.getAllSurahs() || [];
    this.audioElement = document.getElementById("quranAudioPlayer");
    this._nextAudioBuffer = null;
    this._cacheElements();
    this._setupPinReciterButton();
    this._populatePageSelect();
    this._populateSurahSelect();
    this._populateReciterSelect(ACTIVE_RIWAYA);
    this._selectReciter(
      window.quranApp.getPreference(`reciter_${ACTIVE_RIWAYA}`) || null,
      false,
    );
    this._setupAudioEvents();
    this._setupOverlayEvents();
    this._setupMiniBarEvents();
    const savedRate = window.quranApp.getPreference("rate") || 1.0;
    this._applyRate(savedRate);
    const index = this.speedOptions.indexOf(parseFloat(savedRate));
    this.currentSpeedIndex = index !== -1 ? index : 1;
    this.repeatMode = parseInt(window.quranApp.getPreference("repeat") || "0");
    this._updateRepeatBtn();
    this._setupOnlineOffline();
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
    };
    this.overlay = this.elements.overlay;
  }

  // ============================================
  // COORDONNÉES AYA (ayainfo.json)
  // ============================================

  async _loadAyaCoords() {
    if (this.ayaCoords) return;
    try {
      const r = await fetch(AYA_COORDS_PATH, { cache: "force-cache" });
      if (r.ok) {
        this.ayaCoords = await r.json();
        this.ayaCoordsLoaded = true;
      } else {
        this.ayaCoordsLoaded = false;
      }
    } catch (e) {
      console.warn("ayainfo.json non chargé:", e);
      this.ayaCoordsLoaded = false;
    }
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
  // RÉCITANTS
  // ============================================

  // ---- helpers custom select ----
  _csRender(listId, opts) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = '';
    let curGroup = null;
    opts.forEach(opt => {
      if (opt.group && opt.group !== curGroup) {
        curGroup = opt.group;
        const g = document.createElement('div');
        g.className = 'custom-select-group';
        g.textContent = opt.group;
        list.appendChild(g);
      }
      const el = document.createElement('div');
      el.className = 'custom-select-option';
      el.dataset.value = String(opt.value);
      el.textContent = opt.label;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        list.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        const btn = list.previousElementSibling;
        if (btn) btn.querySelector('.custom-select-val').textContent = opt.label;
        list.closest('.custom-select')?.classList.remove('open');
        if (opt.value !== '' && opt._cb) opt._cb(opt.value);
      });
      list.appendChild(el);
    });
  }

  _csSetValue(btnId, listId, value) {
    const list = document.getElementById(listId);
    const btn = document.getElementById(btnId);
    if (!list || !btn) return;
    const opt = list.querySelector(`[data-value="${value}"]`);
    if (!opt) return;
    list.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    btn.querySelector('.custom-select-val').textContent = opt.textContent;
    opt.scrollIntoView({ block: 'nearest' });
  }

  _csGetValue(listId) {
    return document.getElementById(listId)?.querySelector('.selected')?.dataset.value || '';
  }

  _csInitToggle() {
    if (this._csToggleReady) return;
    this._csToggleReady = true;
    document.querySelectorAll('.custom-select-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wrap = btn.closest('.custom-select');
        const isOpen = wrap?.classList.contains('open');
        document.querySelectorAll('.custom-select.open').forEach(w => w.classList.remove('open'));
        if (!isOpen && wrap) wrap.classList.add('open');
      });
    });
    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-select.open').forEach(w => w.classList.remove('open'));
    });
  }
  // ---- fin helpers ----

  _closeReciterDropdown() {
    const wrap = document.getElementById('reciterSelectWrap');
    if (wrap) wrap.classList.remove('open');
  }

  _populateReciterSelect(riwaya) {
    this._csInitToggle();
    const listContainer = document.getElementById('reciterSelectList');
    if (!listContainer) return;

    const reciters = RIWAYAT_CONFIG[riwaya]?.reciters || [];
    const pinnedIds = this.getPinnedReciters();
    // Trier : favoris en premier
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

        // Nom du récitant (cliquable pour sélectionner)
        const nameSpan = document.createElement('span');
        nameSpan.className = 'reciter-name';
        nameSpan.textContent = reciter.name;
        nameSpan.addEventListener('click', (e) => {
          e.stopPropagation();
          this._selectReciter(reciter.id);
          this._closeReciterDropdown();
        });

        // Bouton pin
        const pinBtn = document.createElement('button');
        pinBtn.className = `pin-reciter-btn action-icon ${isPinned ? 'pinned' : ''}`;
        pinBtn.textContent = isPinned ? '⭐' : '📌';
        pinBtn.setAttribute('data-id', reciter.id);
        pinBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.togglePinReciter(reciter.id);
          // Rafraîchir la liste sans fermer le dropdown
          this._populateReciterSelect(this.currentRiwaya);
          // Mettre à jour le bouton principal si le récitant actuel est celui modifié
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

    // Sélectionner l'option correspondant au récitant courant
    if (this.currentReciter) {
      this._csSetValue('reciterSelect', 'reciterSelectList', this.currentReciter.id);
    }
    this._updateReciterSelectButton();
  }

  _selectReciter(id, save = true) {
    if (!id) return;
    const reciters = RIWAYAT_CONFIG[this.currentRiwaya]?.reciters || [];
    const found = reciters.find((r) => r.id === id);
    if (!found) return;
    this.currentReciter = found;
    this._csSetValue('reciterSelect', 'reciterSelectList', id);
    if (save) window.quranApp.setPreference(`reciter_${this.currentRiwaya}`, id);
    this._updateCurrentReciterName();
    this._updateReciterSelectButton();
    this._updateUI();
    if (this.isPlaying && !this.hasError) {
      this.audioElement.pause();
      this.play();
    }
  }
  // Dans la classe QuranAudioPlayer

  _updateReciterSelectButton() {
    const btn = document.getElementById('reciterSelect');
    if (!btn || !this.currentReciter) return;
    const valSpan = btn.querySelector('.custom-select-val');
    const isPinned = this.isReciterPinned(this.currentReciter.id);
    valSpan.textContent = isPinned ? `⭐ ${this.currentReciter.name}` : this.currentReciter.name;
  }
  // Gestion des récitants favoris
  getPinnedReciters() {
    const key = `pinnedReciters_${this.currentRiwaya}`;
    const stored = window.quranApp.getPreference(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return [];
      }
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

    if (index === -1) {
      pinned.push(reciterId);
    } else {
      pinned.splice(index, 1);
    }

    this.savePinnedReciters(pinned);
    this._populateReciterSelect(this.currentRiwaya);
    if (this.currentReciter) {
      this._csSetValue('reciterSelect', 'reciterSelectList', this.currentReciter.id);
    }
    return index === -1;
  }

  isReciterPinned(reciterId) {
    return this.getPinnedReciters().includes(reciterId);
  }

  _updateReciterPinButton() {
    const pinBtn = document.getElementById('pinReciterBtn');
    if (!pinBtn || !this.currentReciter) return;

    const isPinned = this.isReciterPinned(this.currentReciter.id);
    pinBtn.textContent = isPinned ? '⭐' : '📌';
    pinBtn.title = isPinned ? 'إزالة من المفضلين' : 'إضافة إلى المفضلين';
    pinBtn.style.color = isPinned ? 'var(--color-gold)' : '';

    // Mettre à jour le label du bouton custom select avec icône ⭐
    const btn = document.getElementById('reciterSelect');
    if (btn) {
      const valEl = btn.querySelector('.custom-select-val');
      if (valEl && this.currentReciter) {
        const name = this.currentReciter.name;
        valEl.textContent = isPinned ? `⭐ ${name}` : name;
      }
    }
  }

  _updateCurrentReciterName() {
  }

  _setupPinReciterButton() {
    const pinBtn = document.getElementById('pinReciterBtn');
    if (!pinBtn) return;

    // Supprimer l'ancien listener s'il existe
    if (this._pinReciterHandler) {
      pinBtn.removeEventListener('click', this._pinReciterHandler);
    }

    this._pinReciterHandler = () => {
      if (!this.currentReciter) {
        window.quranApp?.showToast('⚠️ اختر قارئاً أولاً');
        return;
      }

      const added = this.togglePinReciter(this.currentReciter.id);
      this._updateReciterSelectButton();
      window.quranApp?.showToast(
        added ? '⭐ تمت الإضافة إلى المفضلين' : '📌 تمت الإزالة من المفضلين'
      );
    };

    pinBtn.addEventListener('click', this._pinReciterHandler);
  }
  // ============================================
  // SOURATES
  // ============================================

  _populateSurahSelect() {
    const opts = [{ value: '', label: 'اختر السورة' },
    ...this.surahs.map(s => ({
      value: String(s.s_id), label: `${s.s_id}. ${s.name}`,
      _cb: (val) => this._setSurah(val, 1)
    }))
    ];
    this._csRender('surahSelectAudioList', opts);
  }

  _setSurah(surahId, ayah = 1) {
    const s = this.surahs.find((x) => x.s_id == surahId);
    if (!s) return;
    this.currentSurah = parseInt(surahId);
    this.currentAyah = parseInt(ayah);
    const page = this._getPageForAya(this.currentSurah, this.currentAyah);
    if (page) this._csSetValue('pageSelectAudio', 'pageSelectAudioList', page);
    this.totalAyahs = s.verses_count;
    this._csSetValue('surahSelectAudio', 'surahSelectAudioList', surahId);
    this._populateAyaSelect(surahId);
    this._csSetValue('ayaSelectAudio', 'ayaSelectAudioList', ayah);
    this._updateCurrentDisplay();
    this._updateUI();
    this._preloadTriggered = false;
  }

  _populateAyaSelect(surahId) {
    if (!surahId) {
      this._csRender('ayaSelectAudioList', [{ value: '', label: 'اختر الآية' }]);
      return;
    }
    const surah = this.surahs.find((s) => s.s_id == surahId);
    if (!surah) {
      this._csRender('ayaSelectAudioList', [{ value: '', label: 'اختر الآية' }]);
      return;
    }
    const opts = [{ value: '', label: 'اختر الآية' },
    ...Array.from({ length: surah.verses_count }, (_, i) => ({
      value: String(i + 1), label: `الآية ${i + 1}`,
      _cb: (val) => { this.currentAyah = parseInt(val); this._updateCurrentDisplay(); }
    }))
    ];
    this._csRender('ayaSelectAudioList', opts);
  }

  _populatePageSelect() {
    const opts = [{ value: '', label: 'اختر الصفحة' },
    ...Array.from({ length: 604 }, (_, i) => ({
      value: String(i + 1), label: `الصفحة ${i + 1}`,
      _cb: (val) => this._handlePageChange({ target: { value: val } })
    }))
    ];
    this._csRender('pageSelectAudioList', opts);
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
    const url = this._buildAyahUrl(this.currentSurah, this.currentAyah);
    if (!url) return;
    this.hasError = false;
    this._showStatus("", false); const needsBasmala =
      this.currentAyah === 1 &&
      this.currentSurah !== 1 &&
      this.currentSurah !== 9;

    const skipBasmala = this.repeatMode === 1 && this.currentAyah === 1;

    if (needsBasmala && !skipBasmala) {
      const basmalaUrl = `./media/bismillah.mp3`;
      this.audioElement.src = basmalaUrl;
      this.audioElement.dataset.basmala = "true";
      this.audioElement.load();

      this.audioElement.playbackRate = this.playbackRate;
      this.audioElement.play().catch((e) => console.error("basmala error:", e));

      if (!this.ayaCoords) {
        this._loadAyaCoords().then(() => this._applyHighlight());
      } else {
        this._applyHighlight();
      }

      if (this._boundListeners.audio.basmalaEnded) {
        this.audioElement.removeEventListener(
          "ended",
          this._boundListeners.audio.basmalaEnded,
        );
      }

      this._boundListeners.audio.basmalaEnded = () => {
        this.audioElement.dataset.basmala = "false";
        this.audioElement.removeEventListener("ended", this._boundListeners.audio.ended);  // ligne 399
        this.audioElement.src = url;
        this.audioElement.load();
        this.audioElement.playbackRate = this.playbackRate;
        this.audioElement.play().catch((e) => {
          console.error("play error:", e);
          this._showStatus("❌ تعذر التشغيل", true);
        });
        this.audioElement.addEventListener("ended", this._boundListeners.audio.ended);  // ligne 407
        if (!this.ayaCoords) {
          this._loadAyaCoords().then(() => this._applyHighlight());
        } else {
          this._applyHighlight();
        }
      };

      this.audioElement.addEventListener(
        "ended",
        this._boundListeners.audio.basmalaEnded,
        { once: true },
      );
    } else {
      // Pas de basmala (ou répétition d'aya 1)
      if (!navigator.onLine) {
        this._showStatus("❌ لا يوجد اتصال بالإنترنت", true);
        return;
      }
      if (this.audioElement.src !== url) {
        this.audioElement.src = url;
        this.audioElement.load();
      }
      this.audioElement.playbackRate = this.playbackRate;
      this.audioElement.play().catch((e) => {
        console.error("play error:", e);
        this._handlePlayError();
      });
      if (!this.ayaCoords) {
        this._loadAyaCoords().then(() => this._applyHighlight());
      } else {
        this._applyHighlight();
      }
    }

    this.isStopped = false;
    if (!this.miniBar?.classList.contains("hidden")) this._showMiniBar();
    else this._syncMiniBar();
    this._updateCurrentDisplay();

    this._requestWakeLock();
    this._crossfading = false;
    this._preloadTriggered = false;
    // Précharger X+1 dès le début de X
    this._preloadNextAyah();
  }

  // Gestion des erreurs de lecture avec fallback
  _handlePlayError() {
    this.hasError = true;
    const reciters = RIWAYAT_CONFIG[this.currentRiwaya]?.reciters || [];
    if (reciters.length === 0) return;
    const currentIndex = reciters.findIndex(
      (r) => r.id === this.currentReciter?.id,
    );
    if (currentIndex !== -1 && currentIndex < reciters.length - 1) {
      const nextReciter = reciters[currentIndex + 1];
      this._selectReciter(nextReciter.id);
      this._showStatus(`⚠️ جاري التبديل إلى ${nextReciter.name}...`, true);

      const testUrl = `${EVERYAYAH_BASE}${nextReciter.id}/001001.mp3`;
      fetch(testUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) })
        .then(r => {
          if (r.ok) {
            this.play();
          } else {
            // Ce récitant aussi est indispo, on relance handlePlayError
            this._handlePlayError();
          }
        })
        .catch(() => {
          // Réseau mort, pas la peine d'essayer
          this._showStatus("❌ لا يوجد اتصال بالإنترنت", true);
          this.stop();
        });
    } else {
      this.stop();
      this._showStatus("❌ تعذر تشغيل الملف، جرب قارئاً آخر", true);
      if (!this.elements.overlay?.classList.contains('show')) {
        window.overlayManager?.showAudio();
      }
    }
  }

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

    // Changer de page si nécessaire
    if (ayaPage && ayaPage !== reader?.currentPage) {
      window.quranApp?.goToPage(ayaPage);
    }

    const doHighlight = () => {
      reader?.highlightAya(this.currentSurah, this.currentAyah, rects);

      if (reader?.readingMode === "scroll") {
        const container = reader?.elements?.pageScroll;
        const pageHeight = reader?.pageHeight ?? 0;
        const sy = pageHeight / 1890;
        const headerH = 3.75 * 16;
        const marginBottom = 80;
        const ayaY1 = rects[0]?.y1 ?? 0;
        const ayaY2 = rects[rects.length - 1]?.y2 ?? ayaY1;
        const ayaTop = (ayaPage - 1) * pageHeight + ayaY1 * sy;
        const ayaBottom = (ayaPage - 1) * pageHeight + ayaY2 * sy;
        const viewTop = container.scrollTop + headerH;
        const viewBottom =
          container.scrollTop + container.clientHeight - marginBottom;

        if (ayaTop < viewTop || ayaBottom > viewBottom) {
          container.scrollTop = ayaTop - headerH - 20;
        }
      }
    };

    // Délai seulement si changement de page portrait (image à charger)
    if (
      ayaPage &&
      ayaPage !== reader?.currentPage &&
      reader?.readingMode === "book"
    ) {
      setTimeout(doHighlight, 300);
    } else {
      doHighlight();
    }
  }

  pause() {
    this.audioElement.pause();
    this._releaseWakeLock();
  }

  stop() {
    this.audioElement.pause();
    this.audioElement.volume = 1;
    this.audioElement.currentTime = 0;
    this.isPlaying = false;
    this.isStopped = true;
    this._crossfading = false;
    // Arrêter le buffer sans vider son src (élément fixe du DOM)
    if (this._nextAudioBuffer) {
      this._nextAudioBuffer.pause();
      this._nextAudioBuffer.currentTime = 0;
    }
    window.quranReader?.clearHighlight();
    this._updateUI();
    this._retrying = false;
    this._showStatus("", false);
    this._releaseWakeLock();
    this._preloadTriggered = false;
  }

  togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  // ============================================
  // PRÉCHARGEMENT DU VERSET SUIVANT (point 2)
  // ============================================

  _preloadNextAyah() {
    if (!this.currentSurah || !this.currentAyah) return;

    let nextSurah = this.currentSurah;
    let nextAyah = this.currentAyah + 1;

    if (nextAyah > this.totalAyahs) {
      // Fin de la sourate
      if (this.repeatMode === 2) {
        // répéter la sourate
        nextAyah = 1;
      } else if (this.repeatMode === 3 || this.currentSurah < 114) {
        // passer à la sourate suivante (ou boucle)
        nextSurah = this.currentSurah < 114 ? this.currentSurah + 1 : 1;
        const nextSurahData = this.surahs.find((s) => s.s_id === nextSurah);
        if (!nextSurahData) return;
        nextAyah = 1;
      } else {
        return; // pas de verset suivant
      }
    }

    const url = this._buildAyahUrl(nextSurah, nextAyah);
    if (url) {
      this._nextAudioBuffer = new Audio();
      this._nextAudioBuffer.preload = "auto";
      this._nextAudioBuffer.src = url;
      this._nextAudioBuffer.load();
    }
  }

  // ============================================
  // WAKE LOCK (point 7)
  // ============================================

  async _requestWakeLock() {
    if ("wakeLock" in navigator && !this._wakeLock) {
      try {
        this._wakeLock = await navigator.wakeLock.request("screen");
        this._wakeLock.addEventListener("release", () => {
          this._wakeLock = null;
        });
      } catch (err) {
        console.warn("Wake Lock error:", err);
      }
    }
  }

  _releaseWakeLock() {
    if (this._wakeLock) {
      this._wakeLock.release();
      this._wakeLock = null;
    }
  }

  // ============================================
  // NAVIGATION
  // ============================================

  nextAyah() {
    if (!this.currentSurah) return;
    this._isTransitioning = true; // ← AJOUTEZ CETTE LIGNE
    if (this.currentAyah < this.totalAyahs) {
      this.currentAyah++;
      this.play();
    } else {
      this._onEndOfSurah();
    }
  }

  prevAyah() {
    if (!this.currentSurah) return;
    this._isTransitioning = true; // ← AJOUTEZ CETTE LIGNE
    if (this.currentAyah > 1) {
      this.currentAyah--;
      this.play();
    } else {
      if (this.currentSurah > 1) {
        const prevSurah = this.currentSurah - 1;
        const prevSurahData = this.surahs.find((s) => s.s_id === prevSurah);
        if (prevSurahData) {
          this._setSurah(prevSurah, prevSurahData.verses_count);
          this.play();
        }
      }
    }
  }
  nextSurah() {
    if (!this.currentSurah || this.currentSurah >= 114) return;
    this._setSurah(this.currentSurah + 1, 1);
    if (!this.isStopped) this.play();
  }

  prevSurah() {
    if (!this.currentSurah || this.currentSurah <= 1) return;
    this._setSurah(this.currentSurah - 1, 1);
    if (!this.isStopped) this.play();
  }

  _onEndOfSurah() {
    if (this.repeatMode === 2) {
      // répéter la sourate
      this._setSurah(this.currentSurah, 1);
      this.play();
    } else {
      // mode 0 ou 1 : passer à la sourate suivante
      if (this.currentSurah < 114) {
        this._setSurah(this.currentSurah + 1, 1);
        this.play();
      } else {
        this.stop();
      }
    }
  }

  // ============================================
  // REPEAT
  // ============================================

  cycleRepeat() {
    this.repeatMode = (this.repeatMode + 1) % 3;
    this._updateRepeatBtn();
    window.quranApp.setPreference("repeat", this.repeatMode);
    // Afficher un toast
    const titles = ["بدون تكرار", "تكرار الآية", "تكرار السورة"];
    if (window.quranApp && window.quranApp.showToast) {
      window.quranApp.showToast(titles[this.repeatMode]);
    }
  }

  _updateRepeatBtn() {
    const svgRepeat = `
<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="m3.512 6.19 1.492-1.492-1.297-1.297L0 7.107l3.707 3.707 1.297-1.297-1.492-1.492h17.356V12h1.835V6.19Zm16.781 6.996-1.297 1.297 1.492 1.492H3.132V12H1.297v5.81h19.191l-1.492 1.492 1.297 1.297L24 16.893Z"/></svg>
    `;
    const labels = [svgRepeat, `¹${svgRepeat}`, `²${svgRepeat}`]; const titles = ["بدون تكرار", "تكرار الآية", "تكرار السورة"];
    [this.elements.repeatBtn, document.getElementById("miniBarRepeat")].forEach(
      (btn) => {
        if (!btn) return;
        btn.innerHTML = labels[this.repeatMode];
        btn.title = titles[this.repeatMode];
      },
    );
  }

  // ============================================
  // VITESSE CYCLIQUE (point 6 modifié)
  // ============================================

  cycleSpeed() {
    this.currentSpeedIndex =
      (this.currentSpeedIndex + 1) % this.speedOptions.length;
    const newSpeed = this.speedOptions[this.currentSpeedIndex];
    this._applyRate(newSpeed);
  }

  _applyRate(rate) {
    // S'assurer que rate est un nombre
    const numRate = parseFloat(rate);
    if (isNaN(numRate)) return;

    this.playbackRate = numRate;
    if (this.audioElement) this.audioElement.playbackRate = this.playbackRate;

    // Mettre à jour le bouton de la mini-barre
    const speedBtn = document.getElementById("miniBarSpeed");
    if (speedBtn) speedBtn.textContent = numRate.toFixed(1) + "×";

    // Mettre à jour le bouton de l'overlay
    if (this.elements.overlaySpeedBtn) {
      this.elements.overlaySpeedBtn.textContent = numRate.toFixed(1) + "×";
    }

    // Mettre à jour l'index courant
    const index = this.speedOptions.indexOf(numRate);
    if (index !== -1) this.currentSpeedIndex = index;

    window.quranApp.setPreference("rate", numRate);
  }

  // ============================================
  // MINI-BAR
  // ============================================

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
    if (this.isPlaying) {
      this.fabBtn.classList.add("playing");
    } else {
      this.fabBtn.classList.remove("playing");
    }
  }

  _updateMiniBarIndicator() {
    const indicator = this.miniBar?.querySelector(".mini-bar-indicator");
    if (!indicator) return;
    if (this.isPlaying) {
      indicator.style.backgroundColor = "var(--success)";
      indicator.style.animation = "pulse 1.5s infinite";
    } else {
      indicator.style.backgroundColor = "var(--text-lighter)";
      indicator.style.animation = "none";
    }
  }

  _syncMiniBar() {
    this._updateMiniPlayBtn();
    this._updateRepeatBtn();
    const speedBtn = document.getElementById("miniBarSpeed");
    if (speedBtn) speedBtn.textContent = this.playbackRate.toFixed(1) + "×";
  }

  _buildFab() {
    if (document.getElementById("audioFab")) return;
    const fab = document.createElement("button");
    fab.id = "audioFab";
    fab.className = "audio-fab hidden";
    fab.innerHTML =
      '<span>🎧</span><span class="fab-indicator"></span>';
    fab.title = "فتح المشغل";
    fab.addEventListener("click", () => this._showMiniBar());
    document.body.appendChild(fab);
    this.fabBtn = fab;
  }

  _showMiniBar() {
    this.miniBar?.classList.remove("hidden");
    this.fabBtn?.classList.add("hidden");
    this._syncMiniBar();

    // Forcer un recalcul après que la barre soit visible
    setTimeout(() => {
      if (window.quranReader && typeof window.quranReader._adjustFooterHeight === 'function') {
        window.quranReader._adjustFooterHeight();
      }
    }, 50);
  }
  _hideMiniBar(showFab = true) {
    this.miniBar?.classList.add("hidden");
    if (showFab) {
      this.fabBtn?.classList.remove("hidden");
    } else {
      this.fabBtn?.classList.add("hidden");
    }

    // Recalculer après masquage
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

  // ============================================
  // SYNCHRONISATION OVERLAY ↔ ÉTAT
  // ============================================

  _syncOverlay() {
    if (!document.getElementById('reciterSelectList')) return;
    if (this.currentReciter) this._csSetValue('reciterSelect', 'reciterSelectList', this.currentReciter.id);
    if (this.currentSurah) {
      this._csSetValue('surahSelectAudio', 'surahSelectAudioList', this.currentSurah);
      this._populateAyaSelect(this.currentSurah);
      if (this.currentAyah) this._csSetValue('ayaSelectAudio', 'ayaSelectAudioList', this.currentAyah);
    }
    const dur = this.audioElement?.duration || 0;
    const cur = this.audioElement?.currentTime || 0;
    if (this.elements.progressBar) this.elements.progressBar.value = dur ? (cur / dur) * 100 : 0;
    if (this.elements.currentTime) this.elements.currentTime.textContent = this._fmt(cur);
    if (this.elements.duration) this.elements.duration.textContent = this._fmt(dur);
    this._updateUI();
    this._updateCurrentDisplay();
  }

  // ============================================
  // ÉVÉNEMENTS AUDIO (avec stockage pour destruction)
  // ============================================

  _setupAudioEvents() {
    const audio = this.audioElement;

    this._boundListeners.audio.play = () => {
      this.isPlaying = true;
      this._isTransitioning = false; // ← AJOUTEZ CETTE LIGNE
      if (this.hasError) {
        this.hasError = false;
        this._showStatus(`✅ ${this.currentReciter?.name}`, false);
        setTimeout(() => this._showStatus('', false), 3000);
      }
      this._updateUI();
    };
    this._boundListeners.audio.pause = () => {
      this.isPlaying = false;
      this._updateUI();
    };
    this._boundListeners.audio.ended = () => {
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

      // Fin de sourate
      if (this.currentAyah >= this.totalAyahs) {
        this._onEndOfSurah();
        return;
      }

      // Buffer prêt → transférer src vers l'élément principal et jouer
      if (this._nextAudioBuffer && this._nextAudioBuffer.readyState >= 2) {
        const nextUrl = this._nextAudioBuffer.src;
        this._nextAudioBuffer.pause();
        this._nextAudioBuffer.currentTime = 0;

        this.currentAyah++;
        this._preloadTriggered = false;
        this._crossfading = false;

        this.audioElement.src = nextUrl;
        this.audioElement.playbackRate = this.playbackRate;
        this.audioElement.play().catch(() => this.nextAyah());

        this._updateCurrentDisplay();
        this._applyHighlight();
        this._preloadNextAyah();
      } else {
        // Fallback normal
        this.nextAyah();
      }
    };
    this._boundListeners.audio.timeupdate = () => {
      const cur = audio.currentTime;
      const dur = audio.duration || 0;
      const pct = dur ? (cur / dur) * 100 : 0;

      if (this.elements.progressBar) this.elements.progressBar.value = pct;
      if (this.elements.currentTime)
        this.elements.currentTime.textContent = this._fmt(cur);
      if (this.elements.duration)
        this.elements.duration.textContent = this._fmt(dur);

      const miniProg = document.getElementById("miniBarProgress");
      const tLeft = document.getElementById("miniBarTimeLeft");
      const tRight = document.getElementById("miniBarTimeRight");
      if (miniProg) miniProg.value = pct;
      if (tLeft) tLeft.textContent = this._fmt(cur);
      if (tRight) tRight.textContent = this._fmt(dur);

    };

    this._boundListeners.audio.error = (e) => {
      const code = e.target?.error?.code;
      // MEDIA_ERR_NETWORK = 2 : coupure réseau confirmée
      if (!navigator.onLine || code === 2) {
        this._showStatus("❌ لا يوجد اتصال بالإنترنت", true);
        this.stop();
        window.quranApp?.showToast("✈️ تحقق من الاتصال بالإنترنت");
        return;
      }
      // MEDIA_ERR_DECODE = 3 : fichier corrompu → essayer le récitant suivant
      if (code === 3) {
        this._showStatus("❌ فشل تحميل الملف", true);
        this._handlePlayError();
        return;
      }
      // MEDIA_ERR_SRC_NOT_SUPPORTED = 4 ou inconnu : probablement lag/serveur indispo
      // Afficher spinner et réessayer une fois avant de changer de récitant
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

    audio.addEventListener("play", this._boundListeners.audio.play);
    audio.addEventListener("pause", this._boundListeners.audio.pause);
    audio.addEventListener("ended", this._boundListeners.audio.ended);
    audio.addEventListener("timeupdate", this._boundListeners.audio.timeupdate);
    audio.addEventListener("error", this._boundListeners.audio.error);
  }

  // ============================================
  // ÉVÉNEMENTS OVERLAY
  // ============================================

  _setupOverlayEvents() {
    this._boundListeners.overlay.reciterChange = (e) => { this._selectReciter(e.target.value); };
    this._boundListeners.overlay.surahChange = (e) => { if (e.target.value) this._setSurah(e.target.value, 1); };
    this._boundListeners.overlay.ayaChange = (e) => { if (e.target.value) { this.currentAyah = parseInt(e.target.value); this._updateCurrentDisplay(); } };
    this._boundListeners.overlay.playPauseClick = () => this.togglePlay();
    this._boundListeners.overlay.stopClick = () => this.stop();
    this._boundListeners.overlay.prevSurahClick = () => this.prevSurah();
    this._boundListeners.overlay.nextSurahClick = () => this.nextSurah();
    this._boundListeners.overlay.prevAyahClick = () => this.prevAyah();
    this._boundListeners.overlay.nextAyahClick = () => this.nextAyah();
    this._boundListeners.overlay.progressInput = (e) => { const dur = this.audioElement.duration; if (dur) this.audioElement.currentTime = (e.target.value / 100) * dur; };
    this._boundListeners.overlay.repeatClick = () => this.cycleRepeat();
    this._boundListeners.overlay.rateChange = (e) => this._applyRate(e.target.value);
    this._boundListeners.overlay.speedClick = () => this.cycleSpeed();
    this._boundListeners.overlay.pageChange = (e) => this._handlePageChange(e);

    // callbacks gérés directement dans _csRender
    this.elements.overlaySpeedBtn?.addEventListener("click", this._boundListeners.overlay.speedClick);
    this.elements.playPauseBtn?.addEventListener("click", this._boundListeners.overlay.playPauseClick);
    this.elements.stopBtn?.addEventListener("click", this._boundListeners.overlay.stopClick);
    this.elements.prevSurahBtn?.addEventListener("click", this._boundListeners.overlay.prevSurahClick);
    this.elements.nextSurahBtn?.addEventListener("click", this._boundListeners.overlay.nextSurahClick);
    this.elements.prevAyahBtn?.addEventListener("click", this._boundListeners.overlay.prevAyahClick);
    this.elements.nextAyahBtn?.addEventListener("click", this._boundListeners.overlay.nextAyahClick);
    this.elements.progressBar?.addEventListener("input", this._boundListeners.overlay.progressInput);
    this.elements.repeatBtn?.addEventListener("click", this._boundListeners.overlay.repeatClick);
    this.elements.rateSelect?.addEventListener("change", this._boundListeners.overlay.rateChange);
  }

  // ============================================
  // ÉVÉNEMENTS MINI-BAR
  // ============================================

  _setupMiniBarEvents() {
    const g = (id) => document.getElementById(id);

    this._boundListeners.miniBar.playPauseClick = () => this.togglePlay();
    this._boundListeners.miniBar.stopClick = () => { this.stop(); this._hideMiniBar(false); };
    this._boundListeners.miniBar.prevAyahClick = () => this.prevAyah();
    this._boundListeners.miniBar.nextAyahClick = () => this.nextAyah();
    this._boundListeners.miniBar.optionsClick = () => window.overlayManager?.showAudio();
    this._boundListeners.miniBar.hideClick = () => this._hideMiniBar(true); // 🔽 : affiche le FAB
    this._boundListeners.miniBar.progressInput = (e) => { const dur = this.audioElement.duration; if (dur) this.audioElement.currentTime = (e.target.value / 100) * dur; };
    this._boundListeners.miniBar.speedClick = () => this.cycleSpeed();
    this._boundListeners.miniBar.repeatClick = () => this.cycleRepeat();

    g("miniBarPlayPause")?.addEventListener("click", this._boundListeners.miniBar.playPauseClick,);
    g("miniBarStop")?.addEventListener("click", this._boundListeners.miniBar.stopClick,);
    g("miniBarPrevAyah")?.addEventListener("click", this._boundListeners.miniBar.prevAyahClick,);
    g("miniBarNextAyah")?.addEventListener("click", this._boundListeners.miniBar.nextAyahClick,);
    g("miniBarOptions")?.addEventListener("click", this._boundListeners.miniBar.optionsClick,);
    g("miniBarHide")?.addEventListener("click", this._boundListeners.miniBar.hideClick,);
    g("miniBarProgress")?.addEventListener("input", this._boundListeners.miniBar.progressInput,);
    g("miniBarSpeed")?.addEventListener("click", this._boundListeners.miniBar.speedClick,);
    g("miniBarRepeat")?.addEventListener("click", this._boundListeners.miniBar.repeatClick,);
  }

  _handlePageChange(e) {
    const page = parseInt(e.target.value);
    if (!page) return;
    const first = this._getFirstAyahOfPage(page); // déjà existante
    if (first) {
      this._setSurah(first.surah, first.ayah);
      // Optionnel : lancer la lecture automatiquement
      // if (!this.isStopped) this.play();
    }
  }

  // ============================================
  // GESTION ONLINE/OFFLINE (point 10)
  // ============================================

  _setupOnlineOffline() {
    this._boundListeners.window.online = () => this._updateOnlineStatus();
    this._boundListeners.window.offline = () => this._updateOnlineStatus();
    window.addEventListener("online", this._boundListeners.window.online);
    window.addEventListener("offline", this._boundListeners.window.offline);
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
      if (!this.isPlaying) {
        this._showStatus("", false);
      }
    }

    // Mettre à jour l'affichage du bouton play/pause (overlay)
    this._updatePlayButton(playBtn);

    // Mettre à jour le bouton play/pause de la mini-barre
    const miniPlay = document.getElementById("miniBarPlayPause");
    const miniStop = document.getElementById("miniBarStop");
    if (miniPlay) {
      miniPlay.disabled = !isOnline;
      if (!isOnline) {
        miniPlay.innerHTML = '<span class="spinner small"></span>';
      } else {
        miniPlay.innerHTML = this.isPlaying
          ? `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="7" y="6" width="3" height="12"/><rect x="14" y="6" width="3" height="12"/></svg>`
          : `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="8 6 18 12 8 18"/></svg>`;
      }
    }
    if (miniStop) {
      miniStop.disabled = !isOnline;
    }

    // Mettre à jour l'indicateur du FAB
    this._updateFabIndicator();
  }

  // ============================================
  // MÉTHODE PUBLIQUE
  // ============================================

  setCurrentSurahFromPage() {
    const page =
      window.quranApp?.getCurrentPage() || window.quranReader?.currentPage || 1;
    const first = this._getFirstAyahOfPage(page);
    if (first) {
      this._setSurah(first.surah, first.ayah);
      return;
    }
    // fallback via quranCalculator
    const sura = window.quranCalculator?.getFirstSurahForPage(page);
    if (sura) {
      this._setSurah(sura.s_id, 1);
      return;
    }
    // fallback final
    if (!this.currentSurah) this._setSurah(1, 1);
  }

  // ============================================
  // UI HELPERS
  // ============================================

  _updatePlayButton(btn) {
    if (!btn) return;
    if (!navigator.onLine) {
      btn.innerHTML = '<span class="spinner small"></span>';
      btn.disabled = true;
      btn.classList.remove('playing');
    } else {
      btn.innerHTML = this.isPlaying
        ? `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="7" y="6" width="3" height="12"/><rect x="14" y="6" width="3" height="12"/></svg>`
        : `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="8 6 18 12 8 18"/></svg>`;

      btn.disabled = !(this.currentReciter && this.currentSurah);
      // Modifiez cette condition :
      if (this.isPlaying || this._isTransitioning) {
        btn.classList.add('playing');
      } else {
        btn.classList.remove('playing');
      }
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
    this._updateFabIndicator(); // <--- ajout
  }

  _updateCurrentDisplay() {
    const surah = this.surahs.find((s) => s.s_id === this.currentSurah);
    if (this.elements.currentDisplay && surah) {
      this.elements.currentDisplay.textContent = `${surah.name} : آية ${this.currentAyah} / ${this.totalAyahs}`;
    }
    this._syncMiniBar();
  }

  _showStatus(msg, isError) {
    if (this.elements.status) {
      this.elements.status.textContent = msg;
      this.elements.status.style.color = isError
        ? "var(--error)"
        : "var(--text-light)";
    }
    // Toast seulement si overlay audio fermé
    const overlayVisible = this.elements.overlay?.classList.contains("show");
    if (isError && msg && !overlayVisible && window.quranApp?.showToast) {
      window.quranApp.showToast(msg);
    }
  }

  _fmt(s) {
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  }

  // ============================================
  // DESTRUCTION
  // ============================================

  destroy() {
    this.stop();
    this._releaseWakeLock();

    // Retirer les écouteurs audio
    const audio = this.audioElement;
    if (audio) {
      audio.removeEventListener("play", this._boundListeners.audio.play);
      audio.removeEventListener("pause", this._boundListeners.audio.pause);
      audio.removeEventListener("ended", this._boundListeners.audio.ended);
      audio.removeEventListener(
        "timeupdate",
        this._boundListeners.audio.timeupdate,
      );
      audio.removeEventListener("error", this._boundListeners.audio.error);
    }

    // Overlay events
    const els = this.elements;
    const ov = this._boundListeners.overlay;
    els.pageSelect?.removeEventListener("change", ov.pageChange);
    els.reciterSelect?.removeEventListener("change", ov.reciterChange);
    els.surahSelect?.removeEventListener("change", ov.surahChange);
    els.ayaSelect?.removeEventListener("change", ov.ayaChange);
    els.overlaySpeedBtn?.removeEventListener("click", ov.speedClick);
    els.playPauseBtn?.removeEventListener("click", ov.playPauseClick);
    els.stopBtn?.removeEventListener("click", ov.stopClick);
    els.prevSurahBtn?.removeEventListener("click", ov.prevSurahClick);
    els.nextSurahBtn?.removeEventListener("click", ov.nextSurahClick);
    els.prevAyahBtn?.removeEventListener("click", ov.prevAyahClick);
    els.nextAyahBtn?.removeEventListener("click", ov.nextAyahClick);
    els.progressBar?.removeEventListener("input", ov.progressInput);
    els.repeatBtn?.removeEventListener("click", ov.repeatClick);
    els.rateSelect?.removeEventListener("change", ov.rateChange);

    // Mini-bar events
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

    // Retirer les écouteurs window
    window.removeEventListener("online", this._boundListeners.window.online);
    window.removeEventListener("offline", this._boundListeners.window.offline);

    // Supprimer les éléments du DOM
    if (this.miniBar) this.miniBar.remove();
    if (this.fabBtn) this.fabBtn.remove();

    // Vider le cache (si utilisé)
    // this.imageCache?.clear();
  }
}

// ============================================
// INITIALISATION
// ============================================

window.quranAudioPlayer = new QuranAudioPlayer();
window.quranAudioPlayer._loadAyaCoords();