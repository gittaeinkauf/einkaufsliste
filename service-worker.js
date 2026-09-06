const CACHE="einkaufsliste-modern-v3";
const ASSETS=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"];

const OLD_AUTOCOMPLETE='return state.route.filter(name=>norm(name).startsWith(q)&&norm(name)!==q).slice(0,5);';
const NEW_AUTOCOMPLETE='return state.route.filter(name=>norm(name).includes(q)&&norm(name)!==q).sort((a,b)=>{const as=norm(a).startsWith(q),bs=norm(b).startsWith(q);return Number(bs)-Number(as)}).slice(0,5);';

const QUICK_CSS=`
    .quickArea{margin:13px 3px 1px}
    .quickLabel{display:flex;align-items:center;gap:6px;margin-bottom:8px;color:var(--muted);font-size:.72rem;font-weight:720}
    .quickLabel::before{content:"◷";font-size:.9rem}
    .quickButtons{display:flex;gap:7px;flex-wrap:wrap}
    .quickBtn{border:1px solid #cce7d4;background:var(--green-soft);color:var(--green-dark);min-height:40px;padding:8px 13px;border-radius:999px;font-size:.78rem;font-weight:780}
    .quickBtn:active{transform:scale(.97)}
`;

const QUICK_HTML=`
      <div id="quickArea" class="quickArea" hidden>
        <div class="quickLabel">Häufig gekauft</div>
        <div id="quickButtons" class="quickButtons"></div>
      </div>
`;

const QUICK_JS=`
function topQuickItems(){
 const usage=state.usage&&typeof state.usage==="object"?state.usage:{};
 const inList=new Set(state.items.map(x=>norm(x.name)));
 const ranked=Object.entries(usage)
  .filter(([,v])=>v&&typeof v==="object"&&v.name&&!inList.has(norm(v.name)))
  .sort((a,b)=>(Number(b[1].count)||0)-(Number(a[1].count)||0)||(Number(b[1].lastUsed)||0)-(Number(a[1].lastUsed)||0))
  .map(([,v])=>v.name);
 const fallback=["Milch","Toast","Tomaten",...state.route];
 return [...ranked,...fallback]
  .filter((name,i,arr)=>name&&!inList.has(norm(name))&&arr.findIndex(x=>norm(x)===norm(name))===i)
  .slice(0,3);
}
function renderQuick(){
 const names=topQuickItems();
 quickButtons.innerHTML="";
 names.forEach(name=>{
  const b=document.createElement("button");
  b.type="button";b.className="quickBtn";b.textContent="+ "+name;
  b.setAttribute("aria-label",name+" schnell hinzufügen");
  b.addEventListener("click",()=>addNames([name]));
  quickButtons.append(b);
 });
 quickArea.hidden=names.length===0;
}
function recordUsage(name){
 if(!state.usage||typeof state.usage!=="object")state.usage={};
 const key=norm(name);
 const current=state.usage[key]&&typeof state.usage[key]==="object"?state.usage[key]:{};
 state.usage[key]={name,count:(Number(current.count)||0)+1,lastUsed:Date.now()};
}
`;

async function enhanceHtml(response){
  const type=response.headers.get("content-type")||"";
  if(!response.ok||!type.includes("text/html"))return response;
  let enhanced=await response.text();

  enhanced=enhanced.replace(OLD_AUTOCOMPLETE,NEW_AUTOCOMPLETE);
  enhanced=enhanced.replace('    #speechStatus{min-height:0;margin:8px 4px 0}',QUICK_CSS+'\n    #speechStatus{min-height:0;margin:8px 4px 0}');
  enhanced=enhanced.replace('      <div id="speechStatus" class="status"></div>',QUICK_HTML+'      <div id="speechStatus" class="status"></div>');
  enhanced=enhanced.replace('const suggestions=document.querySelector("#suggestions"), toast=document.querySelector("#toast");','const suggestions=document.querySelector("#suggestions"), toast=document.querySelector("#toast");\nconst quickArea=document.querySelector("#quickArea"), quickButtons=document.querySelector("#quickButtons");');
  enhanced=enhanced.replace('let state={items:[],route:["Gurken","Tomaten","Toast","Milch","Getränke"]}, loaded=false;','let state={items:[],route:["Gurken","Tomaten","Toast","Milch","Getränke"],usage:{}}, loaded=false;');
  enhanced=enhanced.replace('function render(){',''+QUICK_JS+'\nfunction render(){');
  enhanced=enhanced.replace(' routeEl.textContent=state.route.join(" → ");\n if(document.activeElement===input)showSuggestions();',' routeEl.textContent=state.route.join(" → ");\n renderQuick();\n if(document.activeElement===input)showSuggestions();');
  enhanced=enhanced.replace('state={items:Array.isArray(v.items)?v.items:[],route:Array.isArray(v.route)?v.route:state.route};','state={items:Array.isArray(v.items)?v.items:[],route:Array.isArray(v.route)?v.route:state.route,usage:v.usage&&typeof v.usage==="object"?v.usage:{}};');
  enhanced=enhanced.replace('state.items.push({id:id(),name,done:false});changed=true;addedNames.push(name);','state.items.push({id:id(),name,done:false});recordUsage(name);changed=true;addedNames.push(name);');

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
