const CACHE_NAME = 'quran-v105';

// Fichiers indispensables au fonctionnement (JS, CSS, HTML, JSON, manifeste, icônes)
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './quran-reader.js',
  './quran-calculator.js',
  './tafsir-search.js',
  './overlays-manager.js',
  './version.js',
  './manifest.json',
  './data/quran.json',
  './data/tafsir.json',
  './media/icon-192.png',
  './media/icon-512.png',
  './media/000.webp',           // couverture
  './media/605.webp',           // doua
  './media/606.webp',            // tajweed/infos
  './media/NotoKufiArabic-Bold.woff2'  // police (indispensable pour l'affichage)
];

// Pré-cache des 10 premières pages pour une première expérience immédiate
const FIRST_PAGES = [];
for (let i = 1; i <= 10; i++) {
  FIRST_PAGES.push(`./quran_pages/${i.toString().padStart(3, '0')}.webp`);
}

// Toutes les ressources à mettre en cache lors de l'installation
const PRE_CACHE = [...CORE_ASSETS, ...FIRST_PAGES];

// Installation : mise en cache des ressources critiques
self.addEventListener('install', event => {
  self.skipWaiting(); // active immédiatement le nouveau SW
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Installation : pré-cache des ressources essentielles');
      // allSettled pour ne pas échouer si un fichier mineur manque
      return Promise.allSettled(PRE_CACHE.map(url => 
        cache.add(url).catch(err => console.warn(`[SW] Échec pré-cache ${url}:`, err))
      ));
    })
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // prend le contrôle des clients ouverts
  );
});

// Interception des requêtes (stratégie Cache First)
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;

  // Ne pas intercepter les requêtes vers d'autres domaines (ex: updates)
  if (!event.request.url.startsWith(self.location.origin)) {
    // Pour les requêtes externes, on passe au réseau sans mise en cache
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Si en cache, on renvoie direct
      if (cached) return cached;

      // Sinon on va chercher sur le réseau
      return fetch(event.request).then(response => {
        // On ne met en cache que les réponses valides (statut 200)
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return response;
      }).catch(error => {
        // Si la requête réseau échoue (hors ligne) et que c'est une image
        if (event.request.destination === 'image') {
          // On retourne un SVG avec un message explicite
          return new Response(
            `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="1100" viewBox="0 0 700 1100">
               <rect width="100%" height="100%" fill="#f5f5f5"/>
               <text x="50%" y="45%" font-family="sans-serif" font-size="24" text-anchor="middle" fill="#333">
                 ⚠️ الصفحة غير متوفرة حاليا
               </text>
               <text x="50%" y="55%" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#666">
                 زر الصفحة مرة واحدة على الأقل مع الاتصال بالإنترنت
               </text>
             </svg>`,
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
        // Pour les autres types, on renvoie une réponse d'erreur simple
        return new Response('غير متصل', { status: 503 });
      });
    })
  );
});