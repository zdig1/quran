// ============================================================
//  FICHIER : stats.js
//  Rôle : statistiques de lecture, temps, série de jours, khatma, objectifs
//  Mode : pages (604) — pas de versets / rub3
// ============================================================

class StatsManager {
  constructor() {
    this.storageKey = `quran_stats_${window.APP_ID}`;
    this.undoKey = `${this.storageKey}_undo`;
    this.TOTAL = 604;
    this.HISTORY_DAYS = 400;
    this.MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];

    // Temps maximal compté pour une seule page (durée mesurée et envoyée par le lecteur)
    this.MAX_PAGE_MS = 5 * 60 * 1000;

    // Anti-saut (pages)
    this.MAX_JUMP = 20;           // saut max toléré entre deux commits
    this.FAST_JUMP_SEC = 2000;    // fenêtre "trop rapide"
    this.FAST_JUMP_PAGES = 3;     // nb de pages max dans cette fenêtre

    this._container = null;
    this.data = this._loadData();
  }

  // ---------- 1. Persistance & Utilitaires ----------

  _validPage(p) {
    return Number.isInteger(p) && p >= 1 && p <= this.TOTAL;
  }

  _round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  // ---------- Assainissement (données du stockage et des fichiers importés) ----------

  _cleanDayMap(obj, max) {
    const out = {};
    if (!obj || typeof obj !== "object") return out;
    for (const [key, value] of Object.entries(obj)) {
      const n = Math.floor(Number(value));
      if (/^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isFinite(n) && n >= 0) out[key] = Math.min(n, max);
    }
    return out;
  }

  _cleanTodaySet(obj) {
    const list = obj && typeof obj === "object" ? obj[this._getDateKey()] : null;
    if (!Array.isArray(list)) return {};
    const pages = [...new Set(list.map(Number).filter((p) => this._validPage(p)))];
    return pages.length ? { [this._getDateKey()]: pages } : {};
  }

  _cleanDaily(value) {
    if (value === undefined || value === null) return 10;
    const n = Math.floor(Number(value));
    return Number.isFinite(n) ? Math.min(Math.max(n, 0), this.TOTAL) : 10;
  }

  _cleanCount(value) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) ? Math.min(Math.max(n, 0), 9999) : 0;
  }

  _parse(raw) {
    const p = raw && typeof raw === "object" ? raw : {};
    const lastPage = Number(p.session?.lastPage);
    const lastTimestamp = Number(p.session?.lastTimestamp);
    const data = {
      pages: this._cleanDayMap(p.pages, this.TOTAL),
      pagesSet: this._cleanTodaySet(p.pagesSet),
      time: this._cleanDayMap(p.time, 86400),
      goals: { daily: this._cleanDaily(p.goals?.daily) },
      khatma: { count: this._cleanCount(p.khatma?.count) },
      session: {
        lastPage: this._validPage(lastPage) ? lastPage : null,
        lastTimestamp: Number.isFinite(lastTimestamp) ? lastTimestamp : 0
      }
    };

    this._trimHistory(data.pages);
    this._trimHistory(data.time);
    return data;
  }

  _trimHistory(obj) {
    if (!obj || typeof obj !== "object") return;
    const keys = Object.keys(obj).sort();
    const extra = keys.length - this.HISTORY_DAYS;
    for (let i = 0; i < extra; i++) delete obj[keys[i]];
  }

  _loadData() {
    try {
      return this._parse(AppStore.getJSON(this.storageKey));
    } catch {
      return this._parse(null);
    }
  }

  save() {
    if (!AppStore.setJSON(this.storageKey, this.data)) {
      console.warn("Impossible de sauvegarder les stats");
    }
  }

  _getDateKey(date = new Date()) {
    return date.toLocaleDateString("en-CA");
  }

  _anchorDate(offsetDays = 0) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - offsetDays);
    return d;
  }

  _forEachDay(n, cb) {
    for (let i = 0; i < n; i++) {
      const d = this._anchorDate(i);
      cb(d, this._getDateKey(d), i);
    }
  }

  _pagesToHizb(pages) {
    return this._round2((Number(pages) || 0) / 10);
  }

  _formatDuration(seconds) {
    const mins = Math.floor((Number(seconds) || 0) / 60);
    return `${mins} دق`;
  }

  _todaySet() {
    const today = this._getDateKey();
    if (!this.data.pagesSet[today]) this.data.pagesSet[today] = [];
    return this.data.pagesSet[today];
  }

  _sumPages(days) {
    let sum = 0;
    this._forEachDay(days, (_, key) => {
      sum += this.data.pages[key] || 0;
    });
    return sum;
  }

  _avgLast7DaysPages() {
    return this._sumPages(7) / 7;
  }

  _khatmaDays(perDay, pages = this.TOTAL) {
    return perDay > 0 ? Math.max(1, Math.floor(pages / perDay)) : 0;
  }

  _currentPage() {
    return (
      window.quranReader?.getCurrentPage?.() ||
      window.overlayManager?.getCurrentPage?.() ||
      1
    );
  }

  // ---------- 2. Temps de lecture (durée par page, envoyée par le lecteur) ----------

  _addReadingTime(ms) {
    const sec = Math.floor(Math.min(Number(ms) || 0, this.MAX_PAGE_MS) / 1000);
    if (sec <= 0) return;
    const today = this._getDateKey();
    this.data.time[today] = (Number(this.data.time[today]) || 0) + sec;
    this._trimHistory(this.data.time);
  }

  // ---------- 3. Logique d'enregistrement ----------

  commitPageRead(page, elapsedMs = 0) {
    page = Number(page);
    if (!this._validPage(page)) return;

    this._addReadingTime(elapsedMs);

    const now = Date.now();
    const sess = this.data.session || { lastPage: null, lastTimestamp: 0 };
    const delta = sess.lastPage != null ? page - sess.lastPage : null;
    const dt = now - (sess.lastTimestamp || 0);

    this.data.session = { lastPage: page, lastTimestamp: now };

    if (delta !== null) {
      const tooBig = Math.abs(delta) > this.MAX_JUMP;
      const backward = delta <= 0;
      const tooFast = dt < this.FAST_JUMP_SEC && delta > this.FAST_JUMP_PAGES;
      if (tooBig || backward || tooFast) {
        this.save();
        return;
      }
    }

    const todaySet = this._todaySet();
    if (todaySet.includes(page)) {
      this.save();
      return;
    }

    todaySet.push(page);
    const today = this._getDateKey();
    this.data.pages[today] = todaySet.length;

    Object.keys(this.data.pagesSet).forEach((date) => {
      if (date !== today) delete this.data.pagesSet[date];
    });
    this._trimHistory(this.data.pages);
    this.save();
    window.dispatchEvent(new CustomEvent("quran:statsUpdated"));
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

  // ---------- 4. Khatma ----------

  _khatmaMarker() {
    return window.quranApp?.getKhatmaBookmark?.() || null;
  }

  defaultKhatmaName() {
    return `ختمة ${this.data.khatma.count + 1}`;
  }

  _formatMarkerSub(marker) {
    return marker ? `${marker.name} · ص ${marker.page}` : "حدّد موضع العلامة";
  }

  _startKhatma(markerPage) {
    const page = this._validPage(Number(markerPage)) ? Number(markerPage) : 1;
    this.save();
    const app = window.quranApp;
    const name = this.defaultKhatmaName();
    app?.setKhatmaMarker(page, name);

    const m = this._khatmaMarker();
    if (m && m.name !== name) app.updateBookmark(m.id, name);

    this._refreshUI();
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
      `<h3 style="margin-bottom:12px; text-align:center;">🏴 ختمة جديدة</h3>
       <p style="text-align:center;">ستبدأ ختمة جديدة من الصفحة 1.</p>
       <div class="confirm-buttons col">
         <button class="confirm-btn ok" id="kk_done">✅ أتممت الختمة (+1)</button>
         <button class="confirm-btn" id="kk_reset">↻ إعادة البدء دون احتساب</button>
         <button class="confirm-btn cancel" id="kk_cancel">إلغاء</button>
       </div>`,
      (dialog, cleanup) => {
        dialog.querySelector("#kk_done").addEventListener("click", () => cleanup("done"));
        dialog.querySelector("#kk_reset").addEventListener("click", () => cleanup("reset"));
        dialog.querySelector("#kk_cancel").addEventListener("click", () => cleanup(null));
      }
    );
    if (!choice) return;
    if (choice === "done") this.data.khatma.count++;
    this._startKhatma(1);
  }

  _khatmaCardHtml() {
    const marker = this._khatmaMarker();

    if (!marker) {
      return `
        <div class="stats-card stats-ring-card">
          <div class="stats-ring-title">🏴 الختمة</div>
          ${this._ringHtml(0, false)}
          <div class="stats-ring-sub">0 / ${this.TOTAL} ص</div>
          <div class="stats-ring-note">ابدأ ختمة من ⚙️</div>
        </div>`;
    }

    const done = marker.page - 1;
    const remaining = this.TOTAL - done;
    const last = done >= this.TOTAL - 1;
    const percent = last ? 100 : Math.floor((done / this.TOTAL) * 100);
    const name = AppUtils.esc(marker.name || "الختمة");
    const avg7 = this._avgLast7DaysPages();

    let note;
    if (last) note = "🏁 آخر صفحة";
    else if (avg7 > 0) note = `متبقي ≈ ${this._khatmaDays(avg7, remaining)} يوم`;
    else note = `متبقي ${remaining} صفحة`;

    return `
      <div class="stats-card stats-ring-card">
        <div class="stats-ring-title" title="${name}">🏴 ${name}</div>
        ${this._ringHtml(percent, last)}
        <div class="stats-ring-sub">${done} / ${this.TOTAL} ص</div>
        <div class="stats-ring-note">${note}</div>
      </div>`;
  }

  // ---------- 5. Interface Utilisateur (Rendu) ----------

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
    const colorClass = reached ? "green" : "red";
    return `
      <div class="stats-ring ${colorClass}" style="--p:${percent}">
        <div class="stats-ring-inner">
          <span class="stats-ring-pct ${colorClass}">${percent}%</span>
        </div>
      </div>`;
  }

  _dashboardStats() {
    const today = this.data.pages[this._getDateKey()] || 0;
    const gDaily = this.data.goals.daily;

    const sum7 = this._sumPages(7);
    const time7 = Object.values(this._lastNDaysTime(7)).reduce((a, b) => a + b, 0);

    let sum28 = 0;
    let daysGoalReached28 = 0;
    this._forEachDay(28, (_, key) => {
      const p = this.data.pages[key] || 0;
      sum28 += p;
      if (gDaily > 0 && p >= gDaily) daysGoalReached28++;
    });
    const avg28 = (sum28 / 28).toFixed(1);
    const percent28 = Math.round((daysGoalReached28 / 28) * 100);

    const { current: streak, best } = this._streaks();
    const nextMilestone = this.MILESTONES.find((m) => m > streak) || streak || 1;
    const streakPct = Math.min(100, Math.round((streak / nextMilestone) * 100));

    const percentToday = gDaily > 0 ? Math.min(100, Math.round((today / gDaily) * 100)) : 0;
    const goalReached = gDaily > 0 && today >= gDaily;
    const goalNote = gDaily > 0
      ? (goalReached ? "أحسنت! ✅" : `متبقي ${gDaily - today} صفحة`)
      : "الهدف معطل";

    return {
      today, gDaily, sum7, time7, sum28, daysGoalReached28, avg28, percent28,
      streak, best, nextMilestone, streakPct, percentToday, goalReached, goalNote,
    };
  }

  _dashboardHtml() {
    const {
      today, gDaily, sum7, time7, sum28, daysGoalReached28, avg28, percent28,
      streak, best, nextMilestone, streakPct, percentToday, goalReached, goalNote,
    } = this._dashboardStats();

    return `
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
          <span>الهدف التالي: ${nextMilestone} يوم</span>
          <span>🏆 الرقم القياسي: ${best}</span>
        </div>
      </div>

      <div class="stats-rings">
        <div class="stats-card stats-ring-card">
          <div class="stats-ring-title">🎯 الهدف اليومي</div>
          ${this._ringHtml(percentToday, goalReached)}
          <div class="stats-ring-sub">${today} / ${gDaily > 0 ? gDaily : "∞"} ص</div>
          <div class="stats-ring-note">${goalNote}</div>
        </div>
        ${this._khatmaCardHtml()}
      </div>

      <div class="stats-card">
        <div class="stats-section-header">
          <span>📅 آخر 7 أيام</span>
          <span class="stats-header-total">${sum7} ص</span>
          <span class="stats-header-total"><small>(${this._pagesToHizb(sum7)} حزب - ${this._formatDuration(time7)})</small></span>
        </div>
        <div class="stats-7days-bars">
          ${this._render7DaysBars()}
        </div>
      </div>

      <div class="stats-card">
        <div class="stats-section-header">
          <span>🗓️ آخر 28 يوم</span>
        </div>

        <div class="stats-summary-grid">
          <div class="stats-summary-box">
            <span class="stats-summary-label">المجموع</span>
            <span class="stats-summary-value">${sum28}</span>
            <span class="stats-summary-hizb">${this._pagesToHizb(sum28)} حزب</span>
          </div>
          <div class="stats-summary-box">
            <span class="stats-summary-label">المعدل اليومي</span>
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
  }

  _renderUI(container) {
    this._container = container;
    container.innerHTML = this._dashboardHtml();
    container.querySelector("#editGoalsBtn").addEventListener("click", () => this._showGoalEditor());
  }

  _refreshUI() {
    if (this._container) this._renderUI(this._container);
  }

  _render7DaysBars() {
    const daysAbbr = ["أحـ", "إثـ", "ثلـ", "أر", "خمـ", "جمـ", "سبـ"];
    const gDaily = this.data.goals.daily;

    const days = [];
    let scale = Math.max(1, gDaily);
    this._forEachDay(7, (d, key, i) => {
      const pages = this.data.pages[key] || 0;
      scale = Math.max(scale, pages);
      days.unshift({ pages, label: daysAbbr[d.getDay()], isToday: i === 0 });
    });

    const cols = days.map(({ pages, isToday }) => {
      const h = Math.max(4, (pages / scale) * 100);
      const isFull = gDaily > 0 && pages >= gDaily;
      return `
        <div class="stats-plot-col">
          <span class="stats-bar-value" style="bottom: calc(${h}% + 3px)">${pages}</span>
          <div class="stats-7days-bar ${isFull ? "full" : "partial"} ${isToday ? "active" : ""}" style="height:${h}%"></div>
        </div>`;
    }).join("");

    const labels = days.map((d) => `<span class="stats-day-label">${d.label}</span>`).join("");
    const line = gDaily > 0
      ? `<div class="stats-goal-line" style="bottom:${(gDaily / scale) * 100}%"></div>`
      : "";

    return `<div class="stats-plot">${line}${cols}</div><div class="stats-day-labels">${labels}</div>`;
  }

  _renderMonthGrid() {
    const gDaily = this.data.goals.daily;
    const dots = [];
    this._forEachDay(28, (d, key, i) => {
      const pages = this.data.pages[key] || 0;

      let dotClass = "";
      let dotStyle = "";

      if (gDaily > 0 && pages > 0) {
        const percent = Math.min(100, Math.round((pages / gDaily) * 100));
        if (percent >= 100) {
          dotClass = "green";
        } else {
          dotClass = "partial";
          dotStyle = `background: conic-gradient(var(--color-red) ${percent}%, transparent 0);`;
        }
      }

      if (i === 0) dotClass += " today";

      dots.unshift(`
        <div class="stats-month-dot ${dotClass}" 
             style="${dotStyle}" 
             title="${key} : ${pages} / ${gDaily}">
          <span style="position: relative; z-index: 2;">${d.getDate()}</span>
        </div>`);
    });
    return dots.join("");
  }

  // ---------- 6. Mini-Overlay Objectifs ----------

  _khatmaText(val) {
    return val > 0 ? `ختمة خلال ${this._khatmaDays(val)} يوم` : "الهدف معطل";
  }

  _hasUndo() {
    return AppStore.get(this.undoKey) !== null;
  }

  _goalEditorHtml() {
    const marker = this._khatmaMarker();
    const PRESETS = [5, 10, 20];
    const cur = this._currentPage();

    let khatmaActions;
    if (marker) {
      khatmaActions = `<button type="button" class="stats-action-btn" id="set_khatma_new">🏁 ختمة جديدة</button>`;
    } else {
      const page1Btn = `<button type="button" class="stats-action-btn" data-khatma-start="1">صفحة 1</button>`;
      const curBtn = cur > 1
        ? `<button type="button" class="stats-action-btn" data-khatma-start="${cur}">صفحة ${cur}</button>`
        : "";
      khatmaActions = `<div class="stats-khatma-start-row">${page1Btn}${curBtn}</div>`;
    }

    const undoBtn = this._hasUndo()
      ? `<button type="button" class="stats-undo-btn" id="set_undo">↩️ استرجاع الإحصائيات المحذوفة</button>`
      : "";

    return `<div class="stats-dlg-title">إعدادات الإحصائيات</div>

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
           ${PRESETS.map((n) => `<button type="button" class="stats-preset" data-v="${n}">${n}</button>`).join("")}
         </div>
         <div class="stats-set-info" id="khatma_calc"></div>
       </div>

       <div class="stats-set-card">
         <div class="stats-set-head">
           <span class="stats-set-label">🏴 الختمة</span>
           <span class="stats-set-sub" id="sub_khatma">${AppUtils.esc(this._formatMarkerSub(marker))}</span>
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

<button type="button" class="confirm-btn ok khatma-btn" id="set_save">تم</button>
       <div class="stats-danger">
         ${undoBtn}
         <button type="button" class="stats-reset-btn" id="set_reset">🗑️ إعادة تعيين الإحصائيات</button>
        </div>`;
  }

  _showGoalEditor() {
    window.overlayManager._showBackdropDialog(this._goalEditorHtml(), (dialog, cleanup) =>
      this._bindGoalEditor(dialog, cleanup)
    );
  }

  _bindGoalEditor(dialog, cleanup) {
    const g = this.data.goals;
    const k = this.data.khatma;
    dialog.classList.add("stats-settings-dialog");
    const input = dialog.querySelector("#val_daily");
    const countEl = dialog.querySelector("#val_count");
    const countMinus = dialog.querySelector('[data-target="count"][data-d="-1"]');
    let newVal = g.daily;
    let countVal = k.count;

    const refresh = (val, fromInput) => {
      newVal = val;
      if (!fromInput) input.value = val;
      dialog.querySelector("#sub_daily").textContent =
        val > 0 ? `(${this._pagesToHizb(val)} حزب)` : "(معطل)";
      dialog.querySelector("#khatma_calc").textContent = this._khatmaText(val);
      dialog.querySelectorAll(".stats-preset").forEach((b) =>
        b.classList.toggle("active", Number(b.dataset.v) === val)
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
      const sub = dialog.querySelector("#sub_khatma");
      if (sub) sub.textContent = this._formatMarkerSub(m);
      this._refreshUI();
    };
    refresh(g.daily);
    setCount(k.count);

    dialog.querySelectorAll(".stats-step-btn").forEach((b) =>
      b.addEventListener("click", () => {
        const d = Number(b.dataset.d);
        if (b.dataset.target === "goal") refresh(Math.min(this.TOTAL, Math.max(0, newVal + d)));
        else setCount(countVal + d);
        live();
      })
    );

    dialog.querySelectorAll(".stats-preset").forEach((b) =>
      b.addEventListener("click", () => {
        refresh(Number(b.dataset.v));
        live();
      })
    );

    input.addEventListener("input", (e) => {
      let val = parseInt(e.target.value, 10) || 0;
      if (val < 0) val = 0;
      if (val > this.TOTAL) val = this.TOTAL;
      refresh(val);
      live();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        dialog.querySelector("#set_save").click();
      }
    });

    dialog.querySelector("#set_khatma_new")?.addEventListener("click", () => {
      commit();
      cleanup(null);
      this._khatmaRestartDialog();
    });
    dialog.querySelectorAll("[data-khatma-start]").forEach((b) =>
      b.addEventListener("click", () => {
        commit();
        cleanup(null);
        this._startKhatma(Number(b.dataset.khatmaStart));
      })
    );

    dialog.querySelector("#set_save").addEventListener("click", () => {
      commit();
      cleanup(null);
      this._refreshUI();
    });

    dialog.querySelector("#set_reset").addEventListener("click", () => {
      commit();
      cleanup(null);
      this._confirmReset();
    });

    dialog.querySelector("#set_undo")?.addEventListener("click", () => {
      this._restoreStats();
      cleanup(null);
      window.quranApp?.showToast("↩️ تم استرجاع الإحصائيات");
      this._refreshUI();
    });
  }

  // ---------- 7. Réinitialisation ----------

  async _confirmReset() {
    const om = window.overlayManager;
    const ok = await om._showBackdropDialog(
      `<h3 style="margin-bottom:10px; text-align:center;">⚠️ إعادة تعيين الإحصائيات</h3>
        <p style="text-align:center; line-height:1.8;">
        سيتم حذف: سجل القراءة، السلسلة والرقم القياسي، وعدد الختمات المنجزة، <b>وعلامة الختمة الحالية</b>.
          لن يُحذف: العلامات المرجعية الأخرى.
        </p>
       <div class="confirm-buttons col">
         <button class="confirm-btn ok" id="rs_backup">💾 حفظ نسخة احتياطية أولاً</button>
         <button class="confirm-btn danger" id="rs_delete">🗑️ حذف نهائي</button>
         <button class="confirm-btn cancel" id="rs_cancel">إلغاء</button>
       </div>`,
      (dialog, cleanup) => {
        dialog.querySelector("#rs_backup").addEventListener("click", () => om.exportBookmarks());
        dialog.querySelector("#rs_delete").addEventListener("click", () => cleanup(true));
        dialog.querySelector("#rs_cancel").addEventListener("click", () => cleanup(false));
      }
    );
    if (!ok) return;
    this._resetStats();
    window.quranApp?.showToast("🗑️ تمت إعادة التعيين");
    this._refreshUI();
  }

  _resetStats() {
    const marker = this._khatmaMarker();
    AppStore.setJSON(this.undoKey, {
      ...this.data,
      khatmaMarker: marker ? { page: marker.page, name: String(marker.name || "") } : null,
    });

    this.data.pages = {};
    this.data.pagesSet = {};
    this.data.time = {};

    this.data.khatma = { count: 0 };
    this.data.goals = { daily: this._cleanDaily(undefined) };
    if (marker && window.quranApp?.removeBookmarkById) {
      window.quranApp.removeBookmarkById(marker.id);
    }

    this.data.session = { lastPage: null, lastTimestamp: 0 };

    this.save();
  }

  _restoreStats() {
    try {
      const saved = AppStore.getJSON(this.undoKey);
      if (!saved) return;
      this.data = this._parse(saved);
      AppStore.remove(this.undoKey);

      const m = saved.khatmaMarker;
      if (m && this._validPage(Number(m.page)) && !this._khatmaMarker()) {
        window.quranApp?.setKhatmaMarker?.(Number(m.page), String(m.name || "").slice(0, 100) || undefined);
      }

      this.save();
    } catch { /* ignore */ }
  }

  // ---------- 8. Export / Import pour Backup ----------

  _lastNDaysTime(n = 7) {
    const out = {};
    this._forEachDay(n, (_, key) => {
      out[key] = Number(this.data.time?.[key]) || 0;
    });
    return out;
  }

  exportData() {
    return {
      app: window.APP_ID,
      appName: window.APP_NAME,
      version: window.APP_VERSION,
      exportedAt: new Date().toISOString(),
      goals: { daily: this.data.goals.daily },
      pages: this.data.pages,
      pagesSet: this.data.pagesSet,
      time: this.data.time,
      time7Days: this._lastNDaysTime(7),
      khatma: { count: this.data.khatma.count }
    };
  }

  importData(importedStats, merge = false) {
    if (!importedStats || typeof importedStats !== "object") return;

    const pages = this._cleanDayMap(importedStats.pages, this.TOTAL);
    const pagesSet = this._cleanTodaySet(importedStats.pagesSet);
    const time = this._cleanDayMap(importedStats.time || importedStats.time7Days, 86400);

    if (importedStats.goals?.daily !== undefined) {
      this.data.goals.daily = this._cleanDaily(importedStats.goals.daily);
    }

    if (merge) {
      for (const [date, count] of Object.entries(pages)) {
        this.data.pages[date] = Math.max(this.data.pages[date] || 0, count);
      }
      for (const [date, pagesArr] of Object.entries(pagesSet)) {
        const merged = Array.from(new Set([...(this.data.pagesSet[date] || []), ...pagesArr]));
        this.data.pagesSet[date] = merged;
        this.data.pages[date] = merged.length;
      }
      for (const [date, sec] of Object.entries(time)) {
        this.data.time[date] = Math.max(Number(this.data.time[date]) || 0, sec);
      }
      if (importedStats.khatma) {
        this.data.khatma.count = Math.max(this.data.khatma.count, this._cleanCount(importedStats.khatma.count));
      }
    } else {
      if (importedStats.pages) this.data.pages = pages;
      if (importedStats.pagesSet) this.data.pagesSet = pagesSet;
      if (importedStats.time || importedStats.time7Days) this.data.time = time;
      if (importedStats.khatma) {
        this.data.khatma = { count: this._cleanCount(importedStats.khatma.count) };
      }
    }

    this._trimHistory(this.data.pages);
    this._trimHistory(this.data.time);
    this.save();
  }
}

window.statsManager = new StatsManager();
