const CACHE="einkaufsliste-modern-v2";
const ASSETS=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"];

const OLD_AUTOCOMPLETE='return state.route.filter(name=>norm(name).startsWith(q)&&norm(name)!==q).slice(0,5);';
const NEW_AUTOCOMPLETE='return state.route.filter(name=>norm(name).includes(q)&&norm(name)!==q).sort((a,b)=>{const as=norm(a).startsWith(q),bs=norm(b).startsWith(q);return Number(bs)-Number(as)}).slice(0,5);';

async function enhanceHtml(response){
  const type=response.headers.get("content-type")||"";
  if(!response.ok||!type.includes("text/html"))return response;
  const html=await response.text();
  const enhanced=html.replace(OLD_AUTOCOMPLETE,NEW_AUTOCOMPLETE);
  const headers=new Headers(response.headers);
  headers.delete("content-length");
  return new Response(enhanced,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener("install",e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener("activate",e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  e.respondWith((async()=>{
    try{
      const network=await fetch(e.request);
      const response=await enhanceHtml(network);
      const copy=response.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy));
      return response;
    }catch{
      return caches.match(e.request);
    }
  })());
});
