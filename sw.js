const C='azkar-v7';
const FILES=['./','./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(e.request,cp));return res;}).catch(()=>caches.match('./index.html'))));});

// إشعار صامت مرة واحدة في كل فترة
async function maybeNotify(){
  const now=new Date(), hr=now.getHours();
  let slot=null;
  if(hr>=8&&hr<10) slot='am'; else if(hr>=15&&hr<17) slot='pm';
  if(!slot) return;
  const key=now.toDateString()+'-'+slot;
  const c=await caches.open('azkar-flags');
  if(await c.match(key)) return;
  await self.registration.showNotification('أذكار الصباح والمساء',{body:'أذكار الصباح والمساء',icon:'icons/icon-192.png',badge:'icons/icon-192.png',silent:true,tag:'azkar-'+slot});
  await c.put(key,new Response('1'));
}
self.addEventListener('periodicsync',e=>{ if(e.tag==='azkar-reminder') e.waitUntil(maybeNotify()); });
self.addEventListener('notificationclick',e=>{ e.notification.close(); e.waitUntil(clients.openWindow('./')); });
