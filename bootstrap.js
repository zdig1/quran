(function () {
    'use strict';

    // 1. Compatibilité CSS @layer (Chrome / Android System WebView 99+)
    if (typeof window.CSSLayerBlockRule === 'undefined') {
        window.__layersUnsupported = true;
        document.addEventListener('DOMContentLoaded', function () {
            document.body.innerHTML =
                '<div style="padding:24px;font:18px/1.8 sans-serif;text-align:center;direction:rtl;color:#222;background:#fff;min-height:100vh;box-sizing:border-box">' +
                '<h3>يلزم تحديث مكوّن عرض الويب</h3>' +
                '<p>يرجى تحديث «Android System WebView» و«Chrome» من متجر Google Play ثم إعادة تشغيل التطبيق.</p>' +
                '<p dir="ltr" style="font-size:15px;color:#555">Please update “Android System WebView” and Chrome from Google Play, then restart the app.</p></div>';
        });
    }

    // 2. Chargement séquentiel des modules applicatifs
    const MODULES = [
        './version.js',
        './ui-kit.js',
        './main.js',
        './calculator.js',
        './context-menu.js',
        './reader.js',
        './overlays.js',
        './tafsir-search.js',
        './audio.js',
        './stats.js'
    ];

    const loadScript = (src) =>
        new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = false;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Erreur de chargement : ${src}`));
            document.head.appendChild(script);
        });

    function registerServiceWorker() {
        if ('serviceWorker' in navigator && location.protocol !== 'file:' && !window.cordova) {
            navigator.serviceWorker
                .register('./sw.js?v=' + (window.APP_VERSION || '0'))
                .catch(() => {});
        }
    }

    window.addEventListener('DOMContentLoaded', async () => {
        if (window.__layersUnsupported) return;
        try {
            for (const src of MODULES) {
                await loadScript(src);
            }
            window.quranApp?.init?.();
            if (document.readyState === 'complete') {
                registerServiceWorker();
            } else {
                window.addEventListener('load', registerServiceWorker, { once: true });
            }
        } catch (error) {
            console.error(error);
            const pageScroll = document.getElementById('pageScroll');
            if (pageScroll) {
                pageScroll.innerHTML = `
                    <div class="loading-placeholder">
                        <h3 class="error-title">خطأ في تحميل التطبيق</h3>
                        <p>الرجاء تحديث الصفحة</p>
                    </div>`;
            }
        }
    });
    
})();