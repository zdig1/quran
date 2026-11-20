// ============================================================
//  FICHIER : stats.js
//  Rôle : gestion des statistiques de lecture et des objectifs
// ============================================================

class StatsManager {
  constructor() {
    this.storageKey = "quran_stats";
    this.data = this._loadData();
  }

  // ---------- 1. Persistance & Utilitaires ----------

  _loadData() {
    const defaultData = {
      version: 3,
      pages: {},                                    // { "2026-11-20": count }
      pagesSet: {},                                 // { "2026-11-20": [1,2,3,...] }
      goals: { daily: 10 }
    };

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return defaultData;
      const parsed = JSON.parse(raw);

      // Migration v2 → v3 : créer pagesSet à partir des counts existants
      let pagesSet = parsed.pagesSet || {};
      if (!parsed.pagesSet && parsed.pages) {
        // Ancienne version : on ne connaît pas les pages exactes, on laisse vide
        // Les anciens counts restent dans `pages`, mais pagesSet démarre vide
        pagesSet = {};
      }

      return {
        version: 3,
        pages: parsed.pages || {},
        pagesSet,
        goals: { daily: parsed.goals?.daily ?? defaultData.goals.daily }
      };
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

  _pagesToHizb(pages) {
    return (pages / 10).toFixed(1).replace('.0', '');
  }

  _todaySet() {
    const today = this._getDateKey();
    if (!this.data.pagesSet[today]) this.data.pagesSet[today] = [];
    return this.data.pagesSet[today];
  }

  // ---------- 2. Logique d'enregistrement ----------

  // ✅ Appelée par quran-reader.js quand une page est quittée après >= 10s
  commitPageRead(page) {
    if (!page || page < 1 || page > 604) return;

    const todaySet = this._todaySet();

    // ✅ Anti-doublon journalier : si déjà comptée aujourd'hui, on ignore
    if (todaySet.includes(page)) return;

    todaySet.push(page);
    const today = this._getDateKey();
    this.data.pages[today] = todaySet.length;

    // Nettoyage des données > 365 jours
    const keys = Object.keys(this.data.pages).sort();
    if (keys.length > 365) {
      const oldest = keys[0];
      delete this.data.pages[oldest];
      delete this.data.pagesSet[oldest];
    }

    this.save();
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

  _renderUI(container) {
    const today = this.data.pages[this._getDateKey()] || 0;
    const gDaily = this.data.goals.daily;

    // --- Calculs 7 jours ---
    let sum7 = 0;
    let daysGoalReached7 = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const p = this.data.pages[this._getDateKey(d)] || 0;
      sum7 += p;
      if (gDaily > 0 && p >= gDaily) daysGoalReached7++;
    }
    const avg7 = (sum7 / 7).toFixed(1);
    const percent7 = Math.round((daysGoalReached7 / 7) * 100);

    // --- Calculs 28 jours ---
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

    // --- Calcul de la barre du jour ---
    let percentToday = 0;
    let isGoalReached = false;
    if (gDaily > 0) {
      percentToday = Math.min(100, Math.round((today / gDaily) * 100));
      isGoalReached = percentToday >= 100;
    }

    const fillClass = isGoalReached ? '' : 'red-fill';
    const textClass = isGoalReached ? '' : 'red-text';

    const TEXT_INSIDE_THRESHOLD = 15;
    const textPosClass = percentToday < TEXT_INSIDE_THRESHOLD ? 'outside' : 'inside';

    container.innerHTML = `
      <!-- 1. Objectif du jour (Barre horizontale) -->
      <div class="stats-goal-header">
        <div class="stats-goal-top">
          <span class="stats-goal-title">🎯 الهدف اليومي</span>
          <button class="stats-edit-btn" id="editGoalsBtn">⚙️ تعديل</button>
        </div>
        
        <div class="stats-goal-numbers">
          <span class="stats-goal-current ${textClass}">${today}</span>
          <span class="stats-goal-target">/ ${gDaily > 0 ? gDaily : '∞'} ص</span>
        </div>

        <div class="stats-goal-bar-bg">
          <div class="stats-goal-bar-fill ${fillClass}" style="width: ${percentToday}%">
          <span class="stats-goal-bar-text ${textPosClass}">${percentToday}%</span>
          </div>
        </div>
        
        <div class="stats-hizb-equivalence">
          ${today} صفحة = ${this._pagesToHizb(today)} حزب
        </div>
      </div>

      <!-- 2. Derniers 7 jours -->
      <div class="stats-card">
        <div class="stats-section-header">
          <span>📅 آخر 7 أيام</span>
        </div>
        
        <div class="stats-summary-grid">
          <div class="stats-summary-box">
            <span class="stats-summary-label">المجموع</span>
            <span class="stats-summary-value">${sum7}</span>
            <span class="stats-summary-hizb">${this._pagesToHizb(sum7)} حزب</span>
          </div>
          <div class="stats-summary-box">
            <span class="stats-summary-label">المعدل</span>
            <span class="stats-summary-value">${avg7}</span>
            <span class="stats-summary-hizb">${this._pagesToHizb(avg7)} حزب</span>
          </div>
          <div class="stats-summary-box">
            <span class="stats-summary-label">منجز</span>
            <span class="stats-summary-value">${percent7}%</span>
            <span class="stats-summary-hizb">${daysGoalReached7} من 7</span>
          </div>
        </div>

        <div class="stats-7days-bars">
          ${this._render7DaysBars()}
        </div>
      </div>

      <!-- 3. Derniers 28 jours -->
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
            <span class="stats-summary-label">منجز</span>
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
    const daysAbbr = ['أ', 'إ', 'ث', 'إ', 'خ', 'ج', 'س'];
    const gDaily = this.data.goals.daily;
    const today = new Date();

    let maxPages = 1;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      maxPages = Math.max(maxPages, this.data.pages[this._getDateKey(d)] || 0);
    }

    let html = '';
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const pages = this.data.pages[this._getDateKey(d)] || 0;

      const heightPercent = Math.max(6, (pages / maxPages) * 100);
      const isFull = (pages >= gDaily && gDaily > 0);

      const barClass = `${isFull ? 'full' : 'partial'} ${i === 0 ? 'active' : ''}`;

      html += `
        <div class="stats-7days-bar-wrapper">
          <span class="stats-bar-value">${pages}</span>
          <div class="stats-7days-bar ${barClass}" style="height: ${heightPercent}%"></div>
          <span class="stats-day-label">${daysAbbr[d.getDay()]}</span>
        </div>
      `;
    }
    return html;
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

  _showGoalEditor() {
    const g = this.data.goals;

    const rowHtml = (key, label, val) => `
      <div class="stats-goal-row">
        <div>
          <span class="stats-goal-row-label">${label}</span>
          <span class="stats-goal-row-sub" id="sub_${key}">(${val > 0 ? this._pagesToHizb(val) + ' حزب' : 'معطل'})</span>
        </div>
        <div class="stats-counter">
          <input type="number" class="stats-counter-input" id="val_${key}" 
                 value="${val}" min="0" inputmode="numeric" data-key="${key}">
          <span style="color: var(--text-light); font-weight: bold;">ص</span>
        </div>
      </div>
    `;

    window.overlayManager._showBackdropDialog(
      `<h3 style="margin-bottom:15px; text-align:center;">🎯 تعديل الأهداف</h3>
       <div style="text-align: center; font-size: var(--text-sm); color: var(--text-light); margin-bottom: 10px;">
         حدد عدد الصفحات التي تريد قراءتها يومياً
       </div>
       <div class="stats-goal-editor">
         ${rowHtml('daily', 'الهدف اليومي', g.daily)}
       </div>`,
      (dialog, cleanup) => {
        const input = dialog.querySelector('#val_daily');

        // ✅ Focus + sélection automatique à l'ouverture
        requestAnimationFrame(() => {
          input.focus();
          input.select();
        });

        input.addEventListener('input', (e) => {
          let val = parseInt(e.target.value, 10) || 0;
          if (val < 0) val = 0;
          this.data.goals.daily = val;
          dialog.querySelector('#sub_daily').textContent = val > 0 ? `(${this._pagesToHizb(val)} حزب)` : '(معطل)';
        });

        // ✅ Entrée pour valider
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
          this.save();
          cleanup(null);
          this._renderUI(document.getElementById('statsContent'));
        });

        dialog.appendChild(saveBtn);
      }
    );
  }

  // ---------- 5. Export / Import pour Backup ----------

  exportData() {
    return {
      goals: { daily: this.data.goals.daily },
      pages: this.data.pages,
      pagesSet: this.data.pagesSet
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
    } else {
      if (importedStats.pages) this.data.pages = importedStats.pages;
      if (importedStats.pagesSet) this.data.pagesSet = importedStats.pagesSet;
    }

    this.save();
  }

}

// Démarrage
window.statsManager = new StatsManager();