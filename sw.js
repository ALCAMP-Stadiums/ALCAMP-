importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
// v194

// تفعيل الإصدار الجديد فوراً بدون انتظار إغلاق التطبيق
self.addEventListener('install', e => { e.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', e => { e.waitUntil(clients.claim()); });

const OFFLINE_HTML = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>ALCAMP - غير متصل</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{
  background:#0f172a;
  color:#e2e8f0;
  font-family:'Segoe UI',Tahoma,sans-serif;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  min-height:100vh;
  text-align:center;
  padding:24px;
  direction:rtl;
}
.logo{
  width:80px;height:80px;
  background:linear-gradient(135deg,#22c55e,#16a34a);
  border-radius:20px;
  display:flex;align-items:center;justify-content:center;
  font-size:40px;margin-bottom:28px;
  box-shadow:0 8px 32px rgba(34,197,94,0.3);
}
.signal{font-size:56px;margin-bottom:24px;opacity:.7}
h1{font-size:22px;font-weight:700;margin-bottom:10px;color:#f1f5f9}
p{color:#94a3b8;font-size:15px;margin-bottom:32px;line-height:1.7}
button{
  background:linear-gradient(135deg,#22c55e,#16a34a);
  color:#fff;border:none;
  padding:14px 36px;
  border-radius:14px;
  font-size:16px;font-weight:600;
  cursor:pointer;
  box-shadow:0 4px 20px rgba(34,197,94,0.35);
  transition:opacity .2s;
}
button:active{opacity:.8}
.dot{
  display:inline-block;width:8px;height:8px;
  border-radius:50%;background:#94a3b8;
  margin:20px 4px 0;
  animation:pulse 1.4s infinite;
}
.dot:nth-child(2){animation-delay:.2s}
.dot:nth-child(3){animation-delay:.4s}
@keyframes pulse{0%,80%,100%{opacity:.3}40%{opacity:1}}
</style>
</head>
<body>
  <div class="logo">⚽</div>
  <div class="signal">📶</div>
  <h1>لا يوجد اتصال بالإنترنت</h1>
  <p>تحقق من اتصالك بالشبكة<br>ثم حاول مرة أخرى</p>
  <button onclick="location.reload()">🔄 إعادة المحاولة</button>
  <div>
    <span class="dot"></span>
    <span class="dot"></span>
    <span class="dot"></span>
  </div>
</body>
</html>`;

self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(OFFLINE_HTML, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
      )
    );
  }
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
