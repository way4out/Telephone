const CACHE="stellarnet-v6";
const STATIC_ASSETS=["/","/index.html","/atlas.html","/manifest.webmanifest","/icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC_ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 const u=new URL(e.request.url);
 if(u.origin===self.location.origin&&(u.pathname.startsWith("/v1/")||u.pathname.startsWith("/api/"))){
  e.respondWith(fetch(e.request).catch(()=>new Response(JSON.stringify({ok:false,offline:true,error:"Network unavailable"}),{status:503,headers:{"content-type":"application/json","cache-control":"no-store"}})));
  return;
 }
 e.respondWith(caches.match(e.request).then(x=>x||fetch(e.request).then(r=>{if(r.ok&&u.origin===self.location.origin){const c=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));}return r;}).catch(()=>caches.match("/index.html"))));
});