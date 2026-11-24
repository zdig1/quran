// ============================================================
//  FICHIER : aya-context-menu.js
//  Rôle : menu contextuel sur appui long d'un verset (hit-test
//         livre/défilement, lecture, partage, ouverture du tafsir)
// ============================================================

// ============================================================
//   MENU CONTEXTUEL AYA (appui long)
//   Réutilise ayaCoords / _getAyaRects / highlightAya existants
// ============================================================

class AyaContextMenu {
  constructor(reader, options = {}) {
    this.reader = reader;
    this.pageImgSize = options.pageImgSize || { W: 1260, H: 1890 };
    this.longPressMs = options.longPressMs ?? 500;
    this.moveTolerance = options.moveTolerance ?? 20;

    this.menuEl = null;
    this.pressTimer = null;
    this.pressStart = null;
    this.currentHit = null;
    this.bound = false;
    this.globalHandlers = null;
  }

  init() {
    if (this.bound) return this;
    this.bound = true;

    this._createElement();
    this._bindEvents();
    return this;
  }
  
  _createElement() {
    if (this.menuEl) return;

    const menu = AppUtils.el("div", "aya-context-menu");
    menu.setAttribute("role", "menu");
    menu.innerHTML = `
      <button type="button" class="aya-menu-btn" data-action="share" role="menuitem" title="مشاركة" aria-label="مشاركة">
        <span class="aya-menu-emoji">🔗</span>
        <span class="aya-menu-label">مشاركة</span>
      </button>
      <button type="button" class="aya-menu-btn" data-action="tafsir" role="menuitem" title="تفسير" aria-label="التفسير">
        <span class="aya-menu-emoji">📖</span>
        <span class="aya-menu-label">تفسير</span>
      </button>  
      <button type="button" class="aya-menu-btn" data-action="play" role="menuitem" title="تشغيل الآية" aria-label="تشغيل الآية">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
          <polygon points="8 6 18 12 8 18"/>
        </svg>
        <span class="aya-menu-label">تشغيل</span>
      </button>
    `;
    document.body.appendChild(menu);
    this.menuEl = menu;

    menu.addEventListener("click", (e) => {
      const btn = e.target.closest(".aya-menu-btn");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      this._runAction(btn.dataset.action);
    });
  }

  _bindEvents() {
    const handlers = [];
    const add = (target, type, handler, options) => {
      target.addEventListener(type, handler, options);
      handlers.push({ target, type, handler, options });
    };

    add(document, "pointerdown", (e) => this._onPointerDown(e), true);
    add(document, "pointermove", (e) => this._onPointerMove(e), true);
    add(document, "pointerup", () => this._onPointerUp(), true);
    add(document, "pointercancel", () => this._onPointerUp(), true);

    add(document, "pointerdown", (e) => {
      if (!this.menuEl?.classList.contains("show")) return;
      if (!this.menuEl.contains(e.target)) this.hide();
    }, true);

    add(window, "scroll", () => this.hide(), true);
    const pageScrollEl = this.reader?.elements?.pageScroll;
    if (pageScrollEl) {
      const onScroll = () => this.hide();
      pageScrollEl.addEventListener("scroll", onScroll, { capture: true, passive: true });
      handlers.push({ target: pageScrollEl, type: "scroll", handler: onScroll, options: { capture: true } });
    }
    add(document, "keydown", (e) => {
      if (e.key === "Escape" && this.menuEl?.classList.contains("show")) {
        e.preventDefault();
        this.hide();
      }
    });

    this.globalHandlers = handlers;
  }

  // ---------- Détection appui long ----------

  _onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (this.menuEl?.contains(e.target)) return;

    const pageWrapper = e.target?.closest?.(".page-wrapper");
    if (!pageWrapper) return;

    const hit = this._hitTest(e.clientX, e.clientY, pageWrapper);
    if (!hit) return;

    this.pressStart = {
      x: e.clientX,
      y: e.clientY,
      hit,
    };

    clearTimeout(this.pressTimer);
    this.pressTimer = setTimeout(() => {
      const start = this.pressStart;
      if (!start) return;
      this.pressStart = null;
      this._show(start.hit, start.x, start.y);
    }, this.longPressMs);
  }

  _onPointerMove(e) {
    if (!this.pressStart) return;
    const dx = e.clientX - this.pressStart.x;
    const dy = e.clientY - this.pressStart.y;
    if (Math.hypot(dx, dy) > this.moveTolerance) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
      this.pressStart = null;
    }
  }

  _onPointerUp() {
    clearTimeout(this.pressTimer);
    this.pressTimer = null;
    this.pressStart = null;
  }

  // ---------- Hit-test point écran → (s, a) ----------

  _hitTest(clientX, clientY, pageWrapper) {
    const page = parseInt(pageWrapper.dataset.page, 10);
    if (!page) return null;

    // --- Mode "book" : aya sur une image de page ---
    const img = pageWrapper.querySelector("img");
    if (img) {
      const player = window.quranAudioPlayer;
      if (!player?.ayaCoordsLoaded) return null;

      const imgRect = img.getBoundingClientRect();
      if (!imgRect.width || !imgRect.height) return null;

      // Les rects sont en coordonnées PAGE_IMG (1260×1890)
      const sx = imgRect.width / this.pageImgSize.W;
      const sy = imgRect.height / this.pageImgSize.H;

      const candidates = this._getAyasOnPage(page);
      for (const { s, a } of candidates) {
        const rects = player._getAyaRects(s, a);
        if (!rects?.length) continue;
        for (const r of rects) {
          const x0 = imgRect.left + r.x1 * sx;
          const y0 = imgRect.top + r.y1 * sy;
          const x1 = imgRect.left + r.x2 * sx;
          const y1 = imgRect.top + r.y2 * sy;
          if (clientX >= x0 && clientX <= x1 && clientY >= y0 && clientY <= y1) {
            return { s, a, page, rects, text: this._getAyaText(s, a) };
          }
        }
      }
      return null;
    }

    // --- Mode "scroll" : aya dans un élément DOM ---
    const el = document.elementFromPoint(clientX, clientY)?.closest("[data-aya]");
    if (el && pageWrapper.contains(el)) {
      return {
        s: +el.dataset.sura,
        a: +el.dataset.aya,
        page,
        rects: null,
        text: el.textContent?.trim() || "",
      };
    }
    return null;
  }

  _getAyasOnPage(page) {
    const player = window.quranAudioPlayer;
    if (!player?._ayaByPage) return [];
    const set = player._ayaByPage.get(page);
    if (!set) return [];
    return Array.from(set).map((k) => {
      const [s, a] = k.split(":").map(Number);
      return { s, a };
    });
  }

  _getAyaText(s, a) {
    const tm = window.tafsirManager;
    if (!tm?.data) return "";
    const F = tm.F;
    const found = tm.data.find((x) => x[F.sura_n] === s && x[F.aya_n] === a);
    return found?.[F.text] || "";
  }

  // ---------- Affichage / fermeture ----------

  _show(hit, clientX, clientY) {
    this.currentHit = hit;

    if (window.quranAudioPlayer?.isStopped) {
      this.reader?.highlightAya?.(hit.s, hit.a, hit.rects, true);
    }

    const menu = this.menuEl;
    menu.classList.add("show");
    menu.classList.remove("below");
    const mw = menu.offsetWidth;
    const mh = menu.offsetHeight;

    let left = clientX - mw / 2;
    let top = clientY - mh - 14;
    let below = false;

    // Clamp horizontal
    left = Math.max(8, Math.min(window.innerWidth - mw - 8, left));

    if (top < 8) {
      top = clientY + 20;
      below = true;
    }
    // Clamp vertical
    if (top + mh > window.innerHeight - 8) {
      top = window.innerHeight - mh - 8;
    }

    if (below) menu.classList.add("below");

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    AppUtils.emit("quran:ayaContextMenuOpened", { s: hit.s, a: hit.a });
  }

  hide() {
    if (!this.menuEl?.classList.contains("show")) return;
    this.menuEl.classList.remove("show");
    this.currentHit = null;
    if (window.quranAudioPlayer?.isStopped) {
      this.reader?.clearHighlight?.();
    }
  }

  // ---------- Actions ----------

  async _runAction(action) {
    let hit = this.currentHit;
    if (!hit) return;
    const { s, a } = hit;
    this.hide();
    if (action === "tafsir" || action === "share") {
      const ok = await window.quranApp?.loadTafsir?.();
      if (!ok && action === "tafsir") return;
      hit = { ...hit, text: this._getAyaText(s, a) };
    }
    switch (action) {
      case "play": this._playAya(s, a); break;
      case "share": this._shareAya(s, a, hit.text); break;
      case "tafsir": this._openTafsir(s, a); break;
    }
  }

  async _playAya(s, a) {
    const player = window.quranAudioPlayer;
    if (!player) {
      window.quranApp?.showToast("⚠️ المشغل غير متاح");
      return;
    }
    try {
      await player.init();

      // 1. Sélectionner un récitateur si pas encore fait
      if (!player.currentReciter) {
        const saved = window.quranApp.getPreference(`reciter_${player.currentRiwaya}`);
        player._selectReciter(saved, false);
      }
      if (!player.currentReciter) {
        const reciters = window.RIWAYAT_CONFIG?.[player.currentRiwaya]?.reciters || [];
        if (reciters.length) player._selectReciter(reciters[0].id, false);
      }
      if (!player.currentReciter) {
        window.quranApp?.showToast("❌ لا يوجد قارئ متاح");
        return;
      }

      // 2. Attendre les coordonnées (pour le highlight)
      if (!player.ayaCoordsLoaded) {
        await new Promise((resolve) => {
          const start = Date.now();
          const check = () => {
            if (player.ayaCoordsLoaded || Date.now() - start > 3000) resolve();
            else setTimeout(check, 100);
          };
          check();
        });
      }

      // 3. Mode "une seule aya" : désactiver la répétition automatique
      player._playSingleAya(s, a);
    } catch {
      window.quranApp?.showToast("⚠️ تعذر تشغيل الآية");
    }
  }

  async _shareAya(s, a, text) {
    if (!text) {
      try {
        await window.tafsirManager?.ensureLoaded?.();
        text = this._getAyaText(s, a);
      } catch { /* silencieux */ }
    }
    const surahName = window.quranCalculator?.getSurah?.(s)?.name || "";
    const surahLabel = surahName ? `${s}.${surahName}` : `${s}`;
    const ref = `${surahLabel} - الآية ${a}`;
    const msg = text ? `${text}

[${ref}]` : `[${ref}]`;

    if (navigator.share) {
      try {
        await navigator.share({ title: ref, text: msg });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }

    if (typeof cordova !== "undefined" && window.plugins?.socialsharing) {
      window.plugins.socialsharing.share(msg, ref);
      return;
    }

    try {
      await navigator.clipboard.writeText(msg);
      window.quranApp?.showToast("📋 تم نسخ الآية");
    } catch {
      window.quranApp?.showToast("⚠️ تعذر المشاركة");
    }
  }

  _openTafsir(s, a) {
    const tm = window.tafsirManager;
    if (!tm) return;
    const ayaInfo = tm.getAya?.(s, a);
    if (!ayaInfo?.page) {
      window.quranApp?.showToast("❌ لم يتم العثور على الآية");
      return;
    }

    // Naviguer dans le reader vers la page de l'aya (pour que la fermeture du tafsir ramène à la bonne page)
    window.quranApp?.goToPage?.(ayaInfo.page);

    // Ouvrir le tafsir en ciblant cette aya précise
    setTimeout(() => {
      tm.showTafsirOverlay({ s: Number(s), a: Number(a) });
    }, 150);
  }

  destroy() {
    clearTimeout(this.pressTimer);
    this.pressTimer = null;
    this.pressStart = null;
    this.menuEl?.remove();
    this.menuEl = null;
    this.bound = false;
    this.currentHit = null;
    if (this.globalHandlers) {
      this.globalHandlers.forEach(({ target, type, handler, options }) => {
        try { target.removeEventListener(type, handler, options); } catch { /* ignoré */ }
      });
      this.globalHandlers = null;
    }
  }
}

window.AyaContextMenu = AyaContextMenu;
