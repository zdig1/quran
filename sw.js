// ============================================================
//  FICHIER : sw.js
//  Rôle : service worker (version web uniquement) — pré-cache des
// ============================================================

// ---------- Configuration ----------

const CACHE_PREFIX = "quran-";
const APP_VERSION = new URL(self.location.href).searchParams.get("v") || "0";
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  // Scripts
  "./main.js",
  "./calculator.js",
  "./quran-reader.js",
  "./overlays-manager.js",
  "./tafsir-search.js",
  "./quran-audio.js",
  "./version.js",
  // Données
  "./data/quran.json",
  "./data/tafsir.json",
  "./data/surainfo.json",
  "./data/ayapage.json",
  // Médias
  "./media/icon-192.png",
  "./media/icon-512.png",
  "./media/000.webp",
  "./media/605.webp",
  "./media/606.webp",
  "./media/NotoKufiArabic-Bold.woff2",
  "./media/surah-name-v4.woff2",
  "./media/bismillah.mp3",
];

const OFFLINE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="1100" viewBox="0 0 700 1100">
  <rect width="100%" height="100%" fill="#f5f5f5"/>
  <text x="50%" y="45%" font-family="sans-serif" font-size="60" text-anchor="middle" fill="#333">⚠️ الصفحة غير متوفرة حاليا</text>
  <text x="50%" y="55%" font-family="sans-serif" font-size="36" text-anchor="middle" fill="#666">زر الصفحة مرة واحدة على الأقل مع الاتصال بالإنترنت</text>
</svg>
`;

const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(self.location.hostname);

// ---------- Helpers ----------

const offlineImage = () => new Response(OFFLINE_SVG, { headers: { "Content-Type": "image/svg+xml" } });

const firstPageUrls = (count) =>
  Array.from({ length: count }, (_, i) => `./quran_pages/${String(i + 1).padStart(3, "0")}.webp`);

// ---------- Installation — pré-cache des fichiers essentiels ----------

self.addEventListener("install", (event) => {
  self.skipWaiting();
  // Les 10 premières pages du mushaf sont aussi disponibles hors ligne dès l'installation
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.allSettled([...CORE_ASSETS, ...firstPageUrls(10)].map((url) => cache.add(url)))),
  );
});

// ---------- Activation — suppression des anciens caches ----------

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ---------- Interception des requêtes ----------

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  if (isLocalhost) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(handleFetch(event.request));
});

async function handleFetch(request) {
  const isImage = request.destination === "image";
  try {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;

    const response = await fetch(request);

    if (isImage && !response.ok) return offlineImage();

    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Erreur réseau
    return isImage ? offlineImage() : new Response("غير متصل", { status: 503 });
  }
}