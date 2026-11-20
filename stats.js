// ============================================================
//  FICHIER : stats.js
//  Rôle : gestion des statistiques de lecture et des objectifs
// ============================================================

class StatsManager {
  constructor() {
    this.storageKey = "quran_stats";
    this.data = this._loadData();
    this._pageTimer = null;
    this._currentPagePending = null;
  }

  // ---------- 1. Persistance & Utilitaires ----------

  _loadData() {
    const defaultData = {
      version: 2,
      pages: {},
      goals: { daily: 10 }
    };

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return defaultData;
      const parsed = JSON.parse(raw);

      return {
        version: 2,
        pages: parsed.pages || {},
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

  // ---------- 2. Logique d'enregistrement ----------

  onPageViewed(page) {
    if (!page || page < 1 || page > 604) return;

    if (this._pageTimer) clearTimeout(this._pageTimer);
    this._currentPagePending = page;

    this._pageTimer = setTimeout(() => {
      this._commitPageRead(this._currentPagePending);
      this._pageTimer = null;
      this._currentPagePending = null;
    }, 3000);
  }

  _commitPageRead(page) {
    const today = this._getDateKey();
    this.data.pages[today] = (this.data.pages[today] || 0) + 1;

    // Nettoyage des données > 365 jours
    const keys = Object.keys(this.data.pages).sort();
    if (keys.length > 365) delete this.data.pages[keys[0]];

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
          <div class="stats-goal-bar-fill ${fillClass}" style="width: ${percentToday}%"></div>
          <span class="stats-goal-bar-text">${percentToday}%</span>
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

      // ✅ AJOUT : focus + sélection automatique à l'ouverture
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

      // Bonus : Entrée pour valider
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
      pages: this.data.pages
    };
  }

  importData(importedStats, merge = false) {
    if (!importedStats) return;

    if (merge) {
      if (importedStats.goals?.daily !== undefined) {
        this.data.goals.daily = importedStats.goals.daily;
      }
      if (importedStats.pages) {
        for (const [date, count] of Object.entries(importedStats.pages)) {
          this.data.pages[date] = Math.max(this.data.pages[date] || 0, count);
        }
      }
    } else {
      if (importedStats.goals?.daily !== undefined) {
        this.data.goals.daily = importedStats.goals.daily;
      }
      if (importedStats.pages) this.data.pages = importedStats.pages;
    }

    this.save();
  }

}

// Démarrage
window.statsManager = new StatsManager();