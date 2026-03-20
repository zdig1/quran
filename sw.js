const APP_VERSION = "1.0.8";
const CACHE_NAME = `quran-${APP_VERSION}`;

const CORE_ASSETS = [
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./main.js",
  "./quran-reader.js",
  "./quran-calculator.js",
  "./tafsir-search.js",
  "./overlays-manager.js",
  "./quran-audio.js",
  "./version.js",
  "./data/quran.json",
  "./data/tafsir.json",
  "./data/ayainfo.json",
  "./media/icon-192.png",
  "./media/icon-512.png",
  "./media/000.webp",
  "./media/605.webp",
  "./media/606.webp",
  "./media/NotoKufiArabic-Bold.woff2",
  "./media/bismillah.mp3",
];

const FIRST_PAGES = [];
for (let p = 1; p <= 10; p++) {
  FIRST_PAGES.push(`./quran_pages/${p.toString().padStart(3, "0")}.webp`);
}

const PRE_CACHE = [...CORE_ASSETS, ...FIRST_PAGES];

const OFFLINE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="1100" viewBox="0 0 700 1100">
  <rect width="100%" height="100%" fill="#f5f5f5"/>
  <text x="50%" y="45%" font-family="sans-serif" font-size="60" text-anchor="middle" fill="#333">⚠️ الصفحة غير متوفرة حاليا</text>
  <text x="50%" y="55%" font-family="sans-serif" font-size="36" text-anchor="middle" fill="#666">زر الصفحة مرة واحدة على الأقل مع الاتصال بالإنترنت</text>
</svg>
`;

const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(
  self.location.hostname,
);

// ============================================
// INSTALL — pré-cache des assets essentiels
// ============================================

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          PRE_CACHE.map((url) => cache.add(url).catch(() => { })),
        ),
      ),
  );
});

// ============================================
// ACTIVATE — suppression des anciens caches
// ============================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ============================================
// FETCH — stratégie Cache First
// ============================================

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // En développement local : réseau d'abord
  if (isLocalhost) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request)),
    );
    return;
  }

  event.respondWith(handleFetch(event.request));
});

async function handleFetch(request) {
  try {
    // Cache first
    const cached = await caches.match(request);
    if (cached) return cached;

    // Sinon réseau
    const response = await fetch(request);

    // Si la requête est pour une image et que la réponse n'est pas OK (404, 500...)
    if (request.destination === "image" && !response.ok) {
      return new Response(OFFLINE_SVG, {
        headers: { "Content-Type": "image/svg+xml" },
      });
    }

    // Mise en cache des réponses valides
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Erreur réseau : fallback pour images
    if (request.destination === "image") {
      return new Response(OFFLINE_SVG, {
        headers: { "Content-Type": "image/svg+xml" },
      });
    }
    // JSON critiques → ne pas fallback, laisser échouer proprement
    const criticalJson = ["quran.json", "tafsir.json", "ayainfo.json"];
    if (request.url.includes(".json")) {
      if (criticalJson.some(f => request.url.includes(f))) {
        return new Response(JSON.stringify(null), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify([]), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("غير متصل", { status: 503 });
  }
}
