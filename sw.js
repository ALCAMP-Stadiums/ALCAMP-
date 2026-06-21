importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
// v146

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = self.registration.scope;
  e.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(cs => {
    const match = cs.find(c => c.url.startsWith(target));
    if(match) return match.focus();
    return clients.openWindow(target);
  }));
});
