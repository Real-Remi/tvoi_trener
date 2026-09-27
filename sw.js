/* ==========================================================
   Service worker PWA «Твой тренер»
   - кэширует оболочку приложения для работы без интернета
   - при обновлении версии старый кэш удаляется автоматически
   ВАЖНО: после изменения index.html / картинок поднимите версию
   в CACHE_NAME (например, tvoy-trener-v2), иначе пользователи
   со установленным приложением увидят старые файлы из кэша.
   ========================================================== */
const CACHE_NAME = 'tvoy-trener-v1.4';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './main/fon_1.jpg'
];

// Установка: складываем оболочку в кэш (каждый файл отдельно,
// чтобы ошибка одного не ломала кэширование остальных)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

// Активация: удаляем кэши предыдущих версий
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Навигация: сначала сеть (чтобы приложение обновлялось),
  // без сети — отдаём index.html из кэша
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Остальные файлы: сразу из кэша, в фоне обновляем копию
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
