// ============================================================
//  FICHIER : stats.js
//  Rôle : statistiques de lecture, série de jours, khatma, objectifs
// ============================================================

class StatsManager {
  constructor() {
    this.storageKey = `quran_stats_${window.APP_ID}`;
    this.TOTAL = 604;
    this.MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];
    this._container = null;
    this.data = this._loadData();
  }

  // ---------- 1. Persistance & Utilitaires ----------

  _loadData() {
    const defaultData = {
      pages: {},
      pagesSet: {},
      goals: { daily: 10 },
      streak: { current: 0, best: 0, lastDay: null },
      khatma: { pages: [], count: 0 }
    };

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return defaultData;
      const parsed = JSON.parse(raw);

      const data = {
        pages: parsed.pages || {},
        pagesSet: parsed.pagesSet || {},
        goals: { daily: parsed.goals?.daily ?? defaultData.goals.daily },
        streak: {
          current: parsed.streak?.current || 0,
          best: parsed.streak?.best || 0,
          lastDay: parsed.streak?.lastDay || null
        },
        khatma: {
          pages: Array.isArray(parsed.khatma?.pages)
            ? [...new Set(parsed.khatma.pages.filter((p) => Number.isInteger(p) && p >= 1 && p <= 604))]
            : [],
          count: parsed.khatma?.count || 0
        }
      };

      const today = this._getDateKey();
      Object.keys(data.pagesSet).forEach((date) => {
        if (date !== today) delete data.pagesSet[date];
      });

      const keys = Object.keys(data.pages).sort();
      if (keys.length > 28) {
        const toDelete = keys.length - 28;
        for (let i = 0; i < toDelete; i++) delete data.pages[keys[i]];
      }

      return data;
    } catch {
      return defaultData;
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.warn("Impossible de sauvegarder les stats", e);
    }
  }

  _getDateKey(date = new Date()) {
    return date.toLocaleDateString('en-CA');
  }

  _yesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return this._getDateKey(d);
  }

  _pagesToHizb(pages) {
    return (pages / 10).toFixed(1).replace('.0', '');
  }

  _todaySet() {
    const today = this._getDateKey();
    if (!this.data.pagesSet[today]) this.data.pagesSet[today] = [];
    return this.data.pagesSet[today];
  }

  // Nombre de jours pour une khatma avec N pages/jour (arrondi au-dessus)
  _khatmaDays(perDay) {
    return perDay > 0 ? Math.max(1, Math.floor(this.TOTAL / perDay)) : 0;
  }

  // ---------- 2. Logique d'enregistrement ----------

  // Appelée par quran-reader.js quand une page est quittée après >= 10s
  commitPageRead(page) {
    if (!page || page < 1 || page > this.TOTAL) return;

    const khatmaChanged = this._addToKhatma(page);

    const todaySet = this._todaySet();
    if (todaySet.includes(page)) {
      if (khatmaChanged) this.save();
      return;
    }

    todaySet.push(page);
    const today = this._getDateKey();
    this.data.pages[today] = todaySet.length;

    Object.keys(this.data.pagesSet).forEach((date) => {
      if (date !== today) delete this.data.pagesSet[date];
    });

    const keys = Object.keys(this.data.pages).sort();
    if (keys.length > 28) {
      const toDelete = keys.length - 28;
      for (let i = 0; i < toDelete; i++) delete this.data.pages[keys[i]];
    }

    this._updateStreak();
    this.save();
  }

  // Khatma : pages uniques de la khatma en cours. Retourne true si modifié.
  _addToKhatma(page) {
    const k = this.data.khatma;
    // Khatma terminée : la prochaine page lue démarre une nouvelle khatma
    if (k.pages.length >= this.TOTAL) k.pages = [];
    if (k.pages.includes(page)) return false;
    k.pages.push(page);
    if (k.pages.length === this.TOTAL) k.count++;
    return true;
  }
  // Jours consécutifs validés d'après l'historique (28 jours max)
  _historyStreak() {
    const goal = this.data.goals.daily;
    const threshold = goal > 0 ? goal : 1;
    const d = new Date();
    // Aujourd'hui pas encore validé : on compte à partir d'hier
    if ((this.data.pages[this._getDateKey(d)] || 0) < threshold) d.setDate(d.getDate() - 1);
    let n = 0;
    while (n < 28 && (this.data.pages[this._getDateKey(d)] || 0) >= threshold) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }
  _updateStreak() {
    const s = this.data.streak;
    const today = this._getDateKey();
    const goal = this.data.goals.daily;
    const threshold = goal > 0 ? goal : 1;

    if ((this.data.pages[today] || 0) < threshold) return;
    if (s.lastDay === today) return;

    const base = s.lastDay === this._yesterdayKey() ? s.current + 1 : 1;
    s.current = Math.max(base, this._historyStreak());
    s.best = Math.max(s.best, s.current);
    s.lastDay = today;
  }

  _currentStreak() {
    const s = this.data.streak;
    const stored = (s.lastDay === this._getDateKey() || s.lastDay === this._yesterdayKey()) ? s.current : 0;
    return Math.max(stored, this._historyStreak());
  }

  // ---------- 3. Interface Utilisateur (Rendu) ----------

  showOverlay() {
    const om = window.overlayManager;
    om.closeMenu();
    const overlay = om.lazyLoadOverlay("stats");
    if (!overlay?.content) return;

    if (!overlay.contentGenerated) {
      overlay.content.className = "overlay-body stats-body";
      overlay.contentGenerated = true;
    }

    this._renderUI(overlay.content);
    om.showOverlay("stats");
  }

  _ringHtml(percent, reached) {
    const colorClass = reached ? 'green' : 'red';
    return `
      <div class="stats-ring ${colorClass}" style="--p:${percent}">
        <div class="stats-ring-inner">
          <span class="stats-ring-pct ${colorClass}">${percent}%</span>
        </div>
      </div>`;
  }

  _renderUI(container) {
    this._container = container;
    const todayKey = this._getDateKey();
    const today = this.data.pages[todayKey] || 0;
    const gDaily = this.data.goals.daily;

    // --- 7 jours ---
    let sum7 = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      sum7 += this.data.pages[this._getDateKey(d)] || 0;
    }

    // --- 28 jours ---
    let sum28 = 0;
    let daysGoalReached28 = 0;
    for (let i = 0; i < 28; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const p = this.data.pages[this._getDateKey(d)] || 0;
      sum28 += p;
      if (gDaily > 0 && p >= gDaily) daysGoalReached28++;
    }
    const avg28 = (sum28 / 28).toFixed(1);
    const percent28 = Math.round((daysGoalReached28 / 28) * 100);

    // --- Série ---
    const streak = this._currentStreak();
    if (streak > this.data.streak.best) { this.data.streak.best = streak; this.save(); }
    const best = this.data.streak.best;
    const nextMilestone = this.MILESTONES.find((m) => m > streak) || streak || 1;
    const streakPct = Math.min(100, Math.round((streak / nextMilestone) * 100));

    // --- Cercle objectif du jour ---
    const percentToday = gDaily > 0 ? Math.min(100, Math.round((today / gDaily) * 100)) : 0;
    const goalReached = gDaily > 0 && today >= gDaily;
    let goalNote = '';
    if (gDaily > 0) {
      goalNote = goalReached ? 'أحسنت! ✅' : `بقي ${gDaily - today} صفحة`;
    } else {
      goalNote = 'الهدف معطل';
    }

    // --- Cercle khatma ---
    const kPages = this.data.khatma.pages.length;
    const kPercent = Math.min(100, Math.round((kPages / this.TOTAL) * 100));
    const kDone = kPages >= this.TOTAL;
    const avg7 = sum7 / 7;
    let kNote = '';
    if (kDone) {
      kNote = '🎉 ختمة مكتملة';
    } else if (avg7 > 0) {
      kNote = `≈ ${Math.ceil((this.TOTAL - kPages) / avg7)} يوم متبقي`;
    } else {
      kNote = `بقي ${this.TOTAL - kPages} صفحة`;
    }
    const kCount = this.data.khatma.count;

    container.innerHTML = `
      <!-- 1. Série -->
      <div class="stats-goal-header">
        <div class="stats-goal-top">
          <span class="stats-goal-title">🔥 السلسلة</span>
          <button class="stats-edit-btn" id="editGoalsBtn">⚙️ تعديل</button>
        </div>
        <div class="stats-streak-value">
          <span class="stats-goal-current">${streak}</span>
          <span class="stats-goal-target">يوم</span>
        </div>
        <div class="stats-goal-bar-bg">
          <div class="stats-goal-bar-fill" style="width: ${streakPct}%"></div>
        </div>
        <div class="stats-streak-foot">
          <span>🎯 الهدف التالي: ${nextMilestone} يوم</span>
          <span>🏆 الرقم القياسي: ${best}</span>
        </div>
      </div>

      <!-- 2. Deux cercles -->
      <div class="stats-rings">
        <div class="stats-card stats-ring-card">
          <div class="stats-ring-title">🎯 الهدف اليومي</div>
          ${this._ringHtml(percentToday, goalReached)}
          <div class="stats-ring-sub">${today} / ${gDaily > 0 ? gDaily : '∞'} ص</div>
          <div class="stats-ring-note">${goalNote}</div>
        </div>
        <div class="stats-card stats-ring-card">
          <div class="stats-ring-title">🚩 الختمة</div>
          ${this._ringHtml(kPercent, kDone)}
          <div class="stats-ring-sub">${kPages} / ${this.TOTAL} ص</div>
          <div class="stats-ring-note">${kNote}</div>
          ${kCount > 0 ? `<div class="stats-ring-note">✅ ختمات: ${kCount}</div>` : ''}
        </div>
      </div>

      <!-- 3. 7 jours -->
      <div class="stats-card">
        <div class="stats-section-header">
          <span>📅 آخر 7 أيام</span>
          <span class="stats-header-total">${sum7} ص <small>(${this._pagesToHizb(sum7)} حزب)</small></span>
        </div>
        <div class="stats-7days-bars">
          ${this._render7DaysBars()}
        </div>
      </div>

      <!-- 4. 28 jours -->
      <div class="stats-card">
        <div class="stats-section-header">
          <span>🗓️ آخر 28 يوماً</span>
        </div>

        <div class="stats-summary-grid">
          <div class="stats-summary-box">
            <span class="stats-summary-label">المجموع</span>
            <span class="stats-summary-value">${sum28}</span>
            <span class="stats-summary-hizb">${this._pagesToHizb(sum28)} حزب</span>
          </div>
          <div class="stats-summary-box">
            <span class="stats-summary-label">المعدل</span>
            <span class="stats-summary-value">${avg28}</span>
            <span class="stats-summary-hizb">${this._pagesToHizb(avg28)} حزب</span>
          </div>
          <div class="stats-summary-box">
            <span class="stats-summary-label">الهدف</span>
            <span class="stats-summary-value">${percent28}%</span>
            <span class="stats-summary-hizb">${daysGoalReached28} من 28</span>
          </div>
        </div>

        <div class="stats-month-grid">
          ${this._renderMonthGrid()}
        </div>

      </div>
    `;

    container.querySelector('#editGoalsBtn').addEventListener('click', () => this._showGoalEditor());
  }

  _render7DaysBars() {
    const daysAbbr = ['أحـ', 'إثـ', 'ثلـ', 'أر', 'خمـ', 'جمـ', 'سبـ'];
    const gDaily = this.data.goals.daily;
    const today = new Date();

    const days = [];
    let scale = Math.max(1, gDaily);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const pages = this.data.pages[this._getDateKey(d)] || 0;
      scale = Math.max(scale, pages);
      days.push({ pages, label: daysAbbr[d.getDay()], isToday: i === 0 });
    }

    const cols = days.map(({ pages, isToday }) => {
      const h = Math.max(4, (pages / scale) * 100);
      const isFull = gDaily > 0 && pages >= gDaily;
      return `
        <div class="stats-plot-col">
          <span class="stats-bar-value" style="bottom: calc(${h}% + 3px)">${pages}</span>
          <div class="stats-7days-bar ${isFull ? 'full' : 'partial'} ${isToday ? 'active' : ''}" style="height:${h}%"></div>
        </div>`;
    }).join('');

    const labels = days.map((d) => `<span class="stats-day-label">${d.label}</span>`).join('');
    const line = gDaily > 0
      ? `<div class="stats-goal-line" style="bottom:${(gDaily / scale) * 100}%"></div>`
      : '';

    return `<div class="stats-plot">${line}${cols}</div><div class="stats-day-labels">${labels}</div>`;
  }

  _renderMonthGrid() {
    const gDaily = this.data.goals.daily;
    const today = new Date();

    let html = '';
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const pages = this.data.pages[this._getDateKey(d)] || 0;

      let dotClass = '';
      let dotStyle = '';

      if (gDaily > 0 && pages > 0) {
        const percent = Math.min(100, Math.round((pages / gDaily) * 100));
        if (percent >= 100) {
          dotClass = 'green';
        } else {
          dotClass = 'partial';
          dotStyle = `background: conic-gradient(var(--color-red) ${percent}%, transparent 0);`;
        }
      }

      if (i === 0) dotClass += ' today';

      html += `
        <div class="stats-month-dot ${dotClass}" 
             style="${dotStyle}" 
             title="${this._getDateKey(d)} : ${pages} / ${gDaily}">
          <span style="position: relative; z-index: 2;">${d.getDate()}</span>
        </div>`;
    }
    return html;
  }

  // ---------- 4. Mini-Overlay Objectifs ----------

  _khatmaText(val) {
    return val > 0 ? `🚩 ختمة خلال ${this._khatmaDays(val)} يوم` : 'الهدف معطل';
  }

  _showGoalEditor() {
    const g = this.data.goals;
    const PRESETS = [5, 10, 20];

    window.overlayManager._showBackdropDialog(
      `<h3 style="margin-bottom:15px; text-align:center;">🎯 تعديل الأهداف</h3>
       <div class="stats-goal-editor">
         <div class="stats-goal-row">
           <div>
             <span class="stats-goal-row-label">الهدف اليومي</span>
             <span class="stats-goal-row-sub" id="sub_daily"></span>
           </div>
           <div class="stats-counter">
             <input type="number" class="stats-counter-input" id="val_daily"
                    min="0" inputmode="numeric">
             <span style="color: var(--text-light); font-weight: bold;">ص</span>
           </div>
         </div>
         <div class="stats-presets">
           ${PRESETS.map((n) => `<button type="button" class="stats-preset" data-v="${n}">${n}</button>`).join('')}
         </div>
         <div class="stats-khatma-line" id="khatma_calc"></div>
       </div>`,
      (dialog, cleanup) => {
        const input = dialog.querySelector('#val_daily');
        let newVal = g.daily;

        const refresh = (val, fromInput) => {
          newVal = val;
          if (!fromInput) input.value = val;
          dialog.querySelector('#sub_daily').textContent =
            val > 0 ? `(${this._pagesToHizb(val)} حزب)` : '(معطل)';
          dialog.querySelector('#khatma_calc').textContent = this._khatmaText(val);
          dialog.querySelectorAll('.stats-preset').forEach((b) =>
            b.classList.toggle('active', Number(b.dataset.v) === val)
          );
        };

        refresh(g.daily);

        dialog.querySelectorAll('.stats-preset').forEach((b) =>
          b.addEventListener('click', () => refresh(Number(b.dataset.v)))
        );

        input.addEventListener('input', (e) => {
          let val = parseInt(e.target.value, 10) || 0;
          if (val < 0) val = 0;
          refresh(val, true);
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveBtn.click();
          }
        });

        const saveBtn = document.createElement('button');
        saveBtn.className = "confirm-btn ok";
        saveBtn.style.marginTop = "15px";
        saveBtn.style.width = "100%";
        saveBtn.textContent = "حفظ وإغلاق";
        saveBtn.addEventListener('click', () => {
          this.data.goals.daily = newVal;
          this._updateStreak();
          this.save();
          cleanup(null);
          if (this._container) this._renderUI(this._container);
        });

        dialog.appendChild(saveBtn);
      }
    );
  }

  // ---------- 5. Export / Import pour Backup ----------

  exportData() {
    return {
      app: window.APP_ID,
      appName: window.APP_NAME,
      version: window.APP_VERSION,
      exportedAt: new Date().toISOString(),

      goals: { daily: this.data.goals.daily },
      pages: this.data.pages,
      pagesSet: this.data.pagesSet,
      streak: this.data.streak,
      khatma: this.data.khatma
    };
  }

  importData(importedStats, merge = false) {
    if (!importedStats) return;
    if (importedStats.goals?.daily !== undefined) {
      this.data.goals.daily = importedStats.goals.daily;
    }

    if (merge) {
      if (importedStats.pages) {
        for (const [date, count] of Object.entries(importedStats.pages)) {
          this.data.pages[date] = Math.max(this.data.pages[date] || 0, count);
        }
      }
      if (importedStats.pagesSet) {
        for (const [date, pagesArr] of Object.entries(importedStats.pagesSet)) {
          const existing = this.data.pagesSet[date] || [];
          const merged = Array.from(new Set([...existing, ...pagesArr]));
          this.data.pagesSet[date] = merged;
          this.data.pages[date] = merged.length;
        }
      }
      if (importedStats.streak) {
        const s = this.data.streak;
        const i = importedStats.streak;
        s.best = Math.max(s.best, i.best || 0);
        if ((i.lastDay || '') > (s.lastDay || '')) {
          s.current = i.current || 0;
          s.lastDay = i.lastDay;
        }
      }
      if (importedStats.khatma) {
        const k = this.data.khatma;
        const i = importedStats.khatma;
        k.pages = Array.from(new Set([...k.pages, ...(i.pages || [])]));
        k.count = Math.max(k.count, i.count || 0);
      }
    } else {
      if (importedStats.pages) this.data.pages = importedStats.pages;
      if (importedStats.pagesSet) this.data.pagesSet = importedStats.pagesSet;
      if (importedStats.streak) this.data.streak = importedStats.streak;
      if (importedStats.khatma) this.data.khatma = importedStats.khatma;
    }

    this.save();
  }
}

// Démarrage
window.statsManager = new StatsManager();