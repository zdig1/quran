const CACHE_NAME = "quran-v105",
  CORE_ASSETS = [
    "/",
    "/index.html",
    "/style.css",
    "/main.js",
    "/quran-reader.js",
    "/quran-calculator.js",
    "/tafsir-search.js",
    "/overlays-manager.js",
    "/version.js",
    "/manifest.json",
    "/data/quran.json",
    "/data/tafsir.json",
    "/media/icon-192.png",
    "/media/icon-512.png",
    "/media/000.webp",
    "/media/605.webp",
    "/media/606.webp",
    "/media/NotoKufiArabic-Bold.woff2",
  ],
  FIRST_PAGES = [];
for (let e = 1; e <= 10; e++)
  FIRST_PAGES.push(`/quran_pages/${e.toString().padStart(3, "0")}.webp`);
const PRE_CACHE = [...CORE_ASSETS, ...FIRST_PAGES];
(self.addEventListener("install", (e) => {
  (self.skipWaiting(),
    e.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((e) =>
          Promise.allSettled(PRE_CACHE.map((t) => e.add(t).catch((e) => {}))),
        ),
    ));
}),
  self.addEventListener("activate", (e) => {
    e.waitUntil(
      caches
        .keys()
        .then((e) =>
          Promise.all(
            e.filter((e) => e !== CACHE_NAME).map((e) => caches.delete(e)),
          ),
        )
        .then(() => self.clients.claim()),
    );
  }),
  self.addEventListener("fetch", (e) => {
    "GET" === e.request.method &&
      (e.request.url.startsWith(self.location.origin)
        ? e.respondWith(
            caches.match(e.request).then(
              (t) =>
                t ||
                fetch(e.request)
                  .then((t) => {
                    if (t && 200 === t.status) {
                      const s = t.clone();
                      caches.open(CACHE_NAME).then((t) => t.put(e.request, s));
                    }
                    return t;
                  })
                  .catch((t) =>
                    "image" === e.request.destination
                      ? new Response(
                          '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="1100" viewBox="0 0 700 1100">\n               <rect width="100%" height="100%" fill="#f5f5f5"/>\n               <text x="50%" y="45%" font-family="sans-serif" font-size="24" text-anchor="middle" fill="#333">\n                 ⚠️ الصفحة غير متوفرة حاليا\n               </text>\n               <text x="50%" y="55%" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#666">\n                 زر الصفحة مرة واحدة على الأقل مع الاتصال بالإنترنت\n               </text>\n             </svg>',
                          { headers: { "Content-Type": "image/svg+xml" } },
                        )
                      : new Response("غير متصل", { status: 503 }),
                  ),
            ),
          )
        : e.respondWith(
            fetch(e.request).catch(() => new Response("", { status: 503 })),
          ));
  }));
