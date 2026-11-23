// ============================================================
//  FICHIER : stats.js
//  Rôle : statistiques de lecture, série de jours, khatma, objectifs
// ============================================================

class StatsManager {
  constructor() {
    this.storageKey = `quran_stats_${window.APP_ID}`;
    this.undoKey = `${this.storageKey}_undo`;
    this.TOTAL = 604;
    this.HISTORY_DAYS = 400;
    this.MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];
    this._container = null;
    this.data = this._loadData();
  }

  // ---------- 1. Persistance & Utilitaires ----------

  _validPage(p) {
    return Number.isInteger(p) && p >= 1 && p <= this.TOTAL;
  }

  _parse(raw) {
    const p = raw || {};
    const data = {
      pages: p.pages || {},
      pagesSet: p.pagesSet || {},
      goals: { daily: p.goals?.daily ?? 10 },
      khatma: {
        start: this._validPage(p.khatma?.start) ? p.khatma.start : 1,
        count: p.khatma?.count || 0
      }
    };

    // pagesSet : seulement aujourd'hui
    const today = this._getDateKey();
    Object.keys(data.pagesSet).forEach((date) => {
      if (date !== today) delete data.pagesSet[date];
    });

    this._trimPages(data.pages);
    return data;
  }

  _trimPages(pages) {
    const keys = Object.keys(pages).sort();
    const extra = keys.length - this.HISTORY_DAYS;
    for (let i = 0; i < extra; i++) delete pages[keys[i]];
  }

  _loadData() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return this._parse(raw ? JSON.parse(raw) : null);
    } catch {
      return this._parse(null);
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

  _khatmaDays(perDay, pages = this.TOTAL) {
    return perDay > 0 ? Math.max(1, Math.floor(pages / perDay)) : 0;
  }

  // ---------- 2. Logique d'enregistrement ----------

  // Appelée par quran-reader.js quand une page est quittée après >= 10s
  commitPageRead(page) {
    page = Number(page);
    if (!this._validPage(page)) return;

    const todaySet = this._todaySet();
    if (todaySet.includes(page)) return;

    todaySet.push(page);
    const today = this._getDateKey();
    this.data.pages[today] = todaySet.length;

    Object.keys(this.data.pagesSet).forEach((date) => {
      if (date !== today) delete this.data.pagesSet[date];
    });
    this._trimPages(this.data.pages);
    this.save();
  }

  _streaks() {
    const goal = this.data.goals.daily;
    const threshold = goal > 0 ? goal : 1;
    const ok = (d) => (this.data.pages[this._getDateKey(d)] || 0) >= threshold;

    const d = new Date();
    if (!ok(d)) d.setDate(d.getDate() - 1);
    let current = 0;
    while (ok(d)) {
      current++;
      d.setDate(d.getDate() - 1);
    }

    const keys = Object.keys(this.data.pages).sort();
    let best = 0;
    let run = 0;
    let prev = null;
    for (const k of keys) {
      if ((this.data.pages[k] || 0) < threshold) {
        run = 0;
        prev = null;
        continue;
      }
      const t = new Date(`${k}T00:00:00`).getTime();
      run = prev !== null && Math.round((t - prev) / 86400000) === 1 ? run + 1 : 1;
      prev = t;
      if (run > best) best = run;
    }
    return { current, best: Math.max(best, current) };
  }

  // ---------- 3. Khatma (marque de khatma = signet de type "khatma") ----------

  _khatmaMarker() {
    return window.quranApp?.getKhatmaBookmark?.() || null;
  }
  // Nom proposé pour la prochaine khatma : « ختمة N »
  defaultKhatmaName() {
    return `ختمة ${this.data.khatma.count + 1}`;
  }

  _esc(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  setKhatmaStart(page) {
    this.data.khatma.start = this._validPage(page) ? page : 1;
    this.save();
  }

  _startKhatma(page) {
    this.setKhatmaStart(page);
    const app = window.quranApp;
    const name = this.defaultKhatmaName();
    app?.setKhatmaMarker(page, name); // crée avec ce nom, ou déplace la marque existante
    const m = this._khatmaMarker();
    if (m && m.name !== name) app.updateBookmark(m.id, name);
    if (this._container) this._renderUI(this._container);
  }

  _setKhatmaCount(n) {
    const k = this.data.khatma;
    const marker = this._khatmaMarker();
    const wasDefault = !!marker && marker.name === this.defaultKhatmaName();
    k.count = Math.max(0, n);
    if (wasDefault) window.quranApp?.updateBookmark(marker.id, this.defaultKhatmaName());
  }

  async _khatmaRestartDialog() {
    const om = window.overlayManager;
    const choice = await om._showBackdropDialog(
      `<h3 style="margin-bottom:12px; text-align:center;">🚩 ختمة جديدة</h3>
       <p style="text-align:center;">ستبدأ ختمة جديدة من الصفحة 1.</p>
       <div class="confirm-buttons col">
         <button class="confirm-btn ok" id="kk_done">✅ أتممت الختمة (+1)</button>
         <button class="confirm-btn" id="kk_reset">↻ إعادة البدء دون احتساب</button>
         <button class="confirm-btn cancel" id="kk_cancel">إلغاء</button>
       </div>`,
      (dialog, cleanup) => {
        dialog.querySelector('#kk_done').addEventListener('click', () => cleanup('done'));
        dialog.querySelector('#kk_reset').addEventListener('click', () => cleanup('reset'));
        dialog.querySelector('#kk_cancel').addEventListener('click', () => cleanup(null));
      }
    );
    if (!choice) return;
    if (choice === 'done') this.data.khatma.count++;
    this._startKhatma(1);
  }

  _khatmaCardHtml() {
    const k = this.data.khatma;
    const gDaily = this.data.goals.daily;
    const marker = this._khatmaMarker();

    if (!marker) {
      return `
        <div class="stats-card stats-ring-card">
          <div class="stats-ring-title">🚩 الختمة</div>
          ${this._ringHtml(0, false)}
          <div class="stats-ring-sub">0 / ${this.TOTAL} ص</div>
          <div class="stats-ring-note">ابدأ ختمة من ⚙️</div>
        </div>`;
    }

    const done = (marker.page - k.start + this.TOTAL) % this.TOTAL;
    const remaining = this.TOTAL - done;
    const last = done >= this.TOTAL - 1;
    const percent = last ? 100 : Math.floor((done / this.TOTAL) * 100);
    const name = this._esc(marker.name || 'الختمة');

    let note;
    if (last) note = '🏁 آخر صفحة';
    else if (gDaily > 0) note = `≈ ${this._khatmaDays(gDaily, remaining)} يوم متبقي`;
    else note = `بقي ${remaining} صفحة`;

    return `
      <div class="stats-card stats-ring-card">
        <div class="stats-ring-title" title="${name}">🚩 ${name}</div>
        ${this._ringHtml(percent, last)}
        <div class="stats-ring-sub">${done} / ${this.TOTAL} ص</div>
        <div class="stats-ring-note">${note}</div>
      </div>`;
  }

  // ---------- 4. Interface Utilisateur (Rendu) ----------

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
    const today = this.data.pages[this._getDateKey()] || 0;
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
    const { current: streak, best } = this._streaks();
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
        ${this._khatmaCardHtml()}
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

  // ---------- 5. Mini-Overlay Objectifs ----------

  _khatmaText(val) {
    return val > 0 ? `🚩 ختمة خلال ${this._khatmaDays(val)} يوم` : 'الهدف معطل';
  }

  _hasUndo() {
    try {
      return !!localStorage.getItem(this.undoKey);
    } catch {
      return false;
    }
  }

  _showGoalEditor() {
    const g = this.data.goals;
    const k = this.data.khatma;
    const marker = this._khatmaMarker();
    const PRESETS = [5, 10, 20];

    // Actions khatma : nouvelle khatma, ou démarrage si aucune n'est en cours
    let khatmaActions;
    if (marker) {
      khatmaActions = `<button type="button" class="stats-action-btn" id="set_khatma_new">🏁 ختمة جديدة</button>`;
    } else {
      const cur = window.quranReader?.getCurrentPage?.() || window.overlayManager?.getCurrentPage?.() || 1;
      khatmaActions = `
        <button type="button" class="stats-action-btn" data-khatma-start="1">🚩 ابدأ من الصفحة 1</button>
        ${cur > 1 ? `<button type="button" class="stats-action-btn" data-khatma-start="${cur}">🚩 ابدأ من الصفحة ${cur}</button>` : ''}`;
    }
    const khatmaSub = marker ? `${this._esc(marker.name)} · ص ${marker.page}` : 'لا توجد ختمة جارية';
    const undoBtn = this._hasUndo()
      ? `<button type="button" class="stats-undo-btn" id="set_undo">↩️ استرجاع الإحصائيات المحذوفة</button>`
      : '';

    window.overlayManager._showBackdropDialog(
      `<div class="stats-dlg-title">⚙️ الإعدادات</div>

       <div class="stats-set-card">
         <div class="stats-set-head">
          <span class="stats-set-label">🎯 الهدف اليومي (صفحات)</span>
           <span class="stats-set-sub" id="sub_daily"></span>
         </div>
         <div class="stats-stepper">
           <button type="button" class="stats-step-btn" data-target="goal" data-d="-1" aria-label="إنقاص">−</button>
           <input type="number" class="stats-step-input" id="val_daily" min="0" inputmode="numeric">
           <button type="button" class="stats-step-btn" data-target="goal" data-d="1" aria-label="زيادة">+</button>
         </div>
         <div class="stats-presets">
           ${PRESETS.map((n) => `<button type="button" class="stats-preset" data-v="${n}">${n}</button>`).join('')}
         </div>
         <div class="stats-set-info" id="khatma_calc"></div>
       </div>

       <div class="stats-set-card">
         <div class="stats-set-head">
           <span class="stats-set-label">🚩 الختمة</span>
<span class="stats-set-sub" id="sub_khatma">${khatmaSub}</span>
         </div>
         <div class="stats-set-actions">${khatmaActions}</div>
         <div class="stats-set-row secondary">
           <span>✅ ختمات منجزة</span>
           <div class="stats-stepper stats-stepper-sm">
             <button type="button" class="stats-step-btn" data-target="count" data-d="-1" aria-label="إنقاص">−</button>
             <span class="stats-step-value" id="val_count"></span>
             <button type="button" class="stats-step-btn" data-target="count" data-d="1" aria-label="زيادة">+</button>
           </div>
         </div>
       </div>

       <button type="button" class="stats-save-btn" id="set_save">تم</button>

       <div class="stats-danger">
         ${undoBtn}
         <button type="button" class="stats-reset-btn" id="set_reset">🗑️ إعادة تعيين الإحصائيات</button>
        </div>`,
      (dialog, cleanup) => {
        dialog.classList.add('stats-settings-dialog');
        const input = dialog.querySelector('#val_daily');
        const countEl = dialog.querySelector('#val_count');
        const countMinus = dialog.querySelector('[data-target="count"][data-d="-1"]');
        let newVal = g.daily;
        let countVal = k.count;

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

        const setCount = (n) => {
          countVal = Math.max(0, n);
          countEl.textContent = countVal;
          countMinus.disabled = countVal === 0;
        };

        const commit = () => {
          this.data.goals.daily = newVal;
          if (countVal !== k.count) this._setKhatmaCount(countVal);
          this.save();
        };
        const live = () => {
          commit();
          const m = this._khatmaMarker();
          const sub = dialog.querySelector('#sub_khatma');
          if (sub) sub.textContent = m ? `${m.name} · ص ${m.page}` : 'لا توجد ختمة جارية';
          if (this._container) this._renderUI(this._container);
        };
        refresh(g.daily);
        setCount(k.count);

        dialog.querySelectorAll('.stats-step-btn').forEach((b) =>
          b.addEventListener('click', () => {
            const d = Number(b.dataset.d);
            if (b.dataset.target === 'goal') refresh(Math.max(0, newVal + d));
            else setCount(countVal + d);
            live();
          })
        );

        dialog.querySelectorAll('.stats-preset').forEach((b) =>
          b.addEventListener('click', () => {
            refresh(Number(b.dataset.v));
            live();
          })
        );

        input.addEventListener('input', (e) => {
          let val = parseInt(e.target.value, 10) || 0;
          if (val < 0) val = 0;
          refresh(val, true);
          live();
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            dialog.querySelector('#set_save').click();
          }
        });

        dialog.querySelector('#set_khatma_new')?.addEventListener('click', () => {
          commit();
          cleanup(null);
          this._khatmaRestartDialog();
        });
        dialog.querySelectorAll('[data-khatma-start]').forEach((b) =>
          b.addEventListener('click', () => {
            commit();
            cleanup(null);
            this._startKhatma(Number(b.dataset.khatmaStart));
          })
        );

        dialog.querySelector('#set_save').addEventListener('click', () => {
          commit();
          cleanup(null);
          if (this._container) this._renderUI(this._container);
        });

        dialog.querySelector('#set_reset').addEventListener('click', () => {
          commit();
          cleanup(null);
          this._confirmReset();
        });

        dialog.querySelector('#set_undo')?.addEventListener('click', () => {
          this._restoreStats();
          cleanup(null);
          window.quranApp?.showToast('↩️ تم استرجاع الإحصائيات');
          if (this._container) this._renderUI(this._container);
        });
      }
    );
  }

  // ---------- 6. Réinitialisation ----------

  async _confirmReset() {
    const om = window.overlayManager;
    const ok = await om._showBackdropDialog(
      `<h3 style="margin-bottom:10px; text-align:center;">⚠️ إعادة تعيين الإحصائيات</h3>
       <p style="text-align:center; line-height:1.8;">
         سيتم حذف: سجل القراءة، السلسلة والرقم القياسي، وعدد الختمات المنجزة.<br>
         لن يُحذف: الهدف اليومي والعلامات المرجعية (ومنها علامة الختمة).
       </p>
       <div class="confirm-buttons col">
         <button class="confirm-btn ok" id="rs_backup">💾 حفظ نسخة احتياطية أولاً</button>
         <button class="confirm-btn danger" id="rs_delete">🗑️ حذف نهائي</button>
         <button class="confirm-btn cancel" id="rs_cancel">إلغاء</button>
       </div>`,
      (dialog, cleanup) => {
        dialog.querySelector('#rs_backup').addEventListener('click', () => om.exportBookmarks());
        dialog.querySelector('#rs_delete').addEventListener('click', () => cleanup(true));
        dialog.querySelector('#rs_cancel').addEventListener('click', () => cleanup(false));
      }
    );
    if (!ok) return;
    this._resetStats();
    window.quranApp?.showToast('🗑️ تمت إعادة التعيين');
    if (this._container) this._renderUI(this._container);
  }

  _resetStats() {
    try {
      localStorage.setItem(this.undoKey, JSON.stringify(this.data)); // copie de sécurité
    } catch { /* ignore */ }
    this.data.pages = {};
    this.data.pagesSet = {};
    this.data.khatma = { start: 1, count: 0 };
    this.save();
  }

  _restoreStats() {
    try {
      const raw = localStorage.getItem(this.undoKey);
      if (!raw) return;
      this.data = this._parse(JSON.parse(raw));
      localStorage.removeItem(this.undoKey);
      this.save();
    } catch { /* ignore */ }
  }

  // ---------- 7. Export / Import pour Backup ----------

  exportData() {
    return {
      app: window.APP_ID,
      appName: window.APP_NAME,
      version: window.APP_VERSION,
      exportedAt: new Date().toISOString(),

      goals: { daily: this.data.goals.daily },
      pages: this.data.pages,
      pagesSet: this.data.pagesSet,
      khatma: { start: this.data.khatma.start, count: this.data.khatma.count }
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
      if (importedStats.khatma) {
        const k = this.data.khatma;
        k.count = Math.max(k.count, importedStats.khatma.count || 0);
        // La page de départ locale est conservée si une marque existe déjà
        if (!this._khatmaMarker() && this._validPage(importedStats.khatma.start)) {
          k.start = importedStats.khatma.start;
        }
      }
    } else {
      if (importedStats.pages) this.data.pages = importedStats.pages;
      if (importedStats.pagesSet) this.data.pagesSet = importedStats.pagesSet;
      if (importedStats.khatma) {
        this.data.khatma = {
          start: this._validPage(importedStats.khatma.start) ? importedStats.khatma.start : 1,
          count: importedStats.khatma.count || 0
        };
      }
    }

    this._trimPages(this.data.pages);
    this.save();
  }
}

// Démarrage
window.statsManager = new StatsManager();