const C='azkar-v20';
const FILES=['./','./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
const KEEP=new Set([C,'azkar-flags']);

function isFontUrl(u){
  return u.hostname==='fonts.googleapis.com' || u.hostname==='fonts.gstatic.com';
}
function isHtmlNav(req,url){
  if(req.mode==='navigate' || req.destination==='document') return true;
  if(url.origin!==self.location.origin) return false;
  const p=url.pathname;
  return p.endsWith('/index.html') || p.endsWith('/') || /(?:^|\/)index\.html$/.test(p);
}
function isSwScript(url){
  return url.origin===self.location.origin && /(?:^|\/)sw\.js$/.test(url.pathname);
}

async function networkFirstHtml(req){
  const cache=await caches.open(C);
  try{
    const res=await fetch(req,{cache:'no-store'});
    if(res && res.ok){
      cache.put(req,res.clone());
      if((res.headers.get('content-type')||'').includes('text/html')){
        cache.put(new Request('./index.html'),res.clone());
        cache.put(new Request('./'),res.clone());
      }
    }
    return res;
  }catch(e){
    return (await cache.match(req)) || (await cache.match('./index.html')) || (await cache.match('./'));
  }
}

async function staleWhileRevalidate(req){
  const cache=await caches.open(C);
  const cached=await cache.match(req);
  const net=fetch(req).then(res=>{
    if(res && res.ok) cache.put(req,res.clone());
    return res;
  }).catch(()=>undefined);
  if(cached){ net.catch(()=>{}); return cached; }
  const res=await net;
  if(res) return res;
  throw new Error('offline');
}

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>!KEEP.has(x)).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(isFontUrl(url)){
    e.respondWith(caches.open(C).then(c=>c.match(e.request).then(cached=>{
      if(cached) return cached;
      return fetch(e.request).then(res=>{
        if(res && res.ok) c.put(e.request,res.clone());
        return res;
      });
    })));
    return;
  }
  if(url.origin!==self.location.origin) return;
  if(isSwScript(url)) return;
  if(isHtmlNav(e.request,url)){
    e.respondWith(networkFirstHtml(e.request));
    return;
  }
  e.respondWith(staleWhileRevalidate(e.request));
});

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
