/* Lưu sẵn trang để mở nhanh và dùng được khi mất mạng. */
const V='sotu-202611221039', STATIC='sotu-net-v1';
const CORE=['./','index.html','lib/hanzi-writer.min.js','lib/ts-fsrs.min.js','lib/firebase.min.js','data/vocab.json','data/sentences.json','strokes/core.json','strokes/index.json','audio/pack/index.json','manifest.webmanifest','icon-192.png','icon-180.png','sfx/331047.mp3','sfx/124539.mp3','sfx/470710s.mp3','sfx/879789.mp3','sfx/546279s.mp3'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==STATIC).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
const put=(name,req,res)=>{ if(res&&res.ok){ const cp=res.clone(); caches.open(name).then(c=>c.put(req,cp)); } return res; };
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==location.origin) return;
  /* gói âm thanh không bao giờ ghi đè (gói mới mang tên mới) nên giữ lâu dài, không xoá khi đổi bản */
  if(/\/strokes\/s\//.test(u.pathname)||/\/audio\/pack\/b\d+\.mp3$/.test(u.pathname)){ e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>put(STATIC,e.request,r)))); return; }
  if(/\.(mp3|js|png)$/.test(u.pathname)&&!/sw\.js$/.test(u.pathname)){ e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>put(V,e.request,r)))); return; }
  e.respondWith(fetch(e.request).then(r=>put(V,e.request,r)).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))));
});
