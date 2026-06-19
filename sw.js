importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
const CACHE = 'alcamp-v130';
const ASSETS = ['/ALCAMP-/', '/ALCAMP-/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = self.registration.scope;
  e.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(cs => {
    const match = cs.find(c => c.url.startsWith(target));
    if(match) return match.focus();
    return clients.openWindow(target);
  }));
});
