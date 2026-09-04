const C='einkaufsliste-v2';const F=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F))));
self.addEventListener('fetch',e=>{if(e.request.method==='GET')e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});
