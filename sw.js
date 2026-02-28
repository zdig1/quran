const CACHE_NAME = 'quran-cache-v2'; // Incrémentez le numéro à chaque déploiement
const PRE_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/quran-reader.js',
  '/quran-calculator.js',
  '/tafsir-search.js',
  '/data/quran.json',
  '/data/tafsir.json',
  // Ajoutez les fichiers média essentiels (optionnel)
  '/media/icon-192.png',
  '/media/icon-512.png',
  '/media/screenshot.webp',
  // Si vous voulez pré-cacher les images de khatm et tajwid :
  '/media/605.webp',
  '/media/606.webp',
  '/media/000.webp'
  // N'ajoutez pas les 604 images des pages ici !
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRE_CACHE))
      .then(() => self.skipWaiting()) // Active immédiatement le nouveau SW
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // Prend le contrôle des clients ouverts
  );
});

self.addEventListener('fetch', event => {
  // Ne traiter que les requêtes vers notre domaine (évite les problèmes CORS)
  if (!event.request.url.startsWith(self.location.origin)) {
    // Pour les requêtes externes (comme les mises à jour), on passe directement au réseau
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Mettre en cache uniquement les ressources valides (statut 200)
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            // On évite de mettre en cache les requêtes vers des APIs externes (optionnel)
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // Fallback pour les images (afficher une image placeholder)
        if (event.request.destination === 'image') {
          return caches.match('/media/placeholder.webp'); // Créez cette image
        }
        return new Response('Application hors ligne', { status: 503 });
      });
    })
  );
});