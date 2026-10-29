// Installable app (PWA). Only works when the game is served over http(s) (localhost counts); opened as a file it stays
// a plain page. The PWA folder from `node tools/build.mjs --pwa` puts manifest.webmanifest, sw.js (offline cache) and
// icons/ beside the game as index.html. Served without that folder, a manifest is built here from the embedded icons,
// so Chrome can still install it (no offline cache then: the page's own server has to be running).
const MANIFEST=/*@@PWA_MANIFEST@@*/null;
const ICONS={'icon-192':'@@asset:assets/pwa/icon-192.png@@','icon-512':'@@asset:assets/pwa/icon-512.png@@',
 'icon-maskable-512':'@@asset:assets/pwa/icon-maskable-512.png@@'};
const APPLE_ICON='@@asset:assets/pwa/apple-touch-icon.png@@',FAVICON='@@asset:assets/pwa/favicon-48.png@@';
const served=()=>/^https?:$/.test(globalThis.location?.protocol||'');
let deferred=null;
function standalone(){try{return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;}catch{return false;}}
function isIOS(){const n=globalThis.navigator||{};return /iPad|iPhone|iPod/.test(n.userAgent||'')||(n.platform==='MacIntel'&&n.maxTouchPoints>1);}
// The title-screen icon shows only when the browser offered an install (or on iOS, which installs from the Share menu).
function canInstall(){return served()&&!standalone()&&(!!deferred||isIOS());}
function installOffered(){return served()&&!standalone();}
function syncInstallButtons(){document.querySelectorAll('[data-action="install-app"].ts-install').forEach(b=>{b.hidden=!canInstall();});}
function headLink(rel,href,extra={}){const l=Object.assign(document.createElement('link'),{rel,href},extra);document.head.append(l);return l;}
function inlineManifest(){
 const page=new URL(location.href);page.hash='';page.search='';const scope=new URL('./',page).href;
 const icons=MANIFEST.icons.map(i=>({...i,src:ICONS[i.src.replace(/^icons\/|\.png$/g,'')]||i.src}));
 const json=JSON.stringify({...MANIFEST,id:page.pathname,start_url:page.href,scope,icons});
 return URL.createObjectURL(new Blob([json],{type:'application/manifest+json'}));
}
// The PWA folder is there when its manifest is (a server answering every path with the page does not count).
async function folderManifest(){try{const r=await fetch('manifest.webmanifest',{cache:'no-store'});return r.ok&&!/text\/html/.test(r.headers.get('content-type')||'');}catch{return false;}}
// Updates: the browser only looks at sw.js when the app is opened fresh, and an installed app that Android kept in memory
// just resumes, so it could run an old version for days. Here the app also asks whenever it comes back on screen (at most
// every few minutes); a newer sw.js downloads the new game in the background (download bar), and once it is in, a
// Restart button (#sc-ready) loads it. Settings → Check for updates runs the same check by hand (checkForUpdate).
let reg=null,ready=false,updating=false,lastAsk=0,canRestart=()=>true;
const ASK_EVERY=5*60*1000;
function askForUpdate(force=false){
 if(!reg||ready||(!force&&Date.now()-lastAsk<ASK_EVERY))return Promise.resolve();
 lastAsk=Date.now();return reg.update().catch(()=>{});
}
async function initPWA({onUpdate,restartOK}={}){
 headLink('icon',FAVICON,{type:'image/png'});headLink('apple-touch-icon',APPLE_ICON);
 if(!served()||!MANIFEST)return;
 if(restartOK)canRestart=restartOK;
 addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;syncInstallButtons();});
 addEventListener('appinstalled',()=>{deferred=null;syncInstallButtons();});
 const folder=await folderManifest();
 headLink('manifest',folder?'manifest.webmanifest':inlineManifest());
 if(!folder||!navigator.serviceWorker)return;
 updating=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!updating)return;ready=true;readyPill();onUpdate?.();});
 navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='sc-download')downloadBar(e.data,updating);});
 try{reg=await navigator.serviceWorker.register('sw.js');lastAsk=Date.now();}catch{return;}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void askForUpdate();});
}
// Settings → Check for updates. The game's site answers /version with the newest release tag (cloudflare/worker.js).
// Resolves {state, latest}: 'current' | 'downloading' (the bar shows progress) | 'ready' (restart to play it) |
// 'pending' (newer release, download not started yet) | 'reload' (served without the offline cache: a reload fetches it) |
// 'offline' | 'file' (opened as a file, can't check).
async function checkForUpdate(current){
 if(!served())return {state:'file'};
 if(ready)return {state:'ready'};
 let latest=null;
 try{const r=await fetch('version',{cache:'no-store'});const t=r.ok?(await r.text()).trim():'';if(/^v?\d+\.\d+\.\d+[\w.-]*$/.test(t))latest=t.replace(/^v/,'');}
 catch{if(navigator.onLine===false)return {state:'offline'};}
 if(!reg){if(!latest)return {state:'offline'};return {state:latest===current?'current':'reload',latest};}
 if(reg.installing)return {state:'downloading',latest};
 if(latest===current)return {state:'current',latest};
 await askForUpdate(true);
 if(ready)return {state:'ready',latest};
 if(reg.installing||reg.waiting)return {state:'downloading',latest};
 return {state:latest?'pending':'current',latest};   // newer release, download not started yet (it starts on its own)
}
function restartApp(){location.reload();}
// Update ready: a small Restart button over the bottom of the screen (hidden while a minigame is running).
function readyPill(){
 if(document.getElementById('sc-ready'))return;
 const el=Object.assign(document.createElement('div'),{id:'sc-ready',innerHTML:'<span>New version ready</span><button type="button">Restart</button><button type="button" class="x" aria-label="Later">✕</button>'});
 el.setAttribute('role','status');
 const [go,later]=el.querySelectorAll('button');go.onclick=restartApp;later.onclick=()=>{el.remove();clearInterval(t);};
 const t=setInterval(()=>{el.hidden=!canRestart();},1000);el.hidden=!canRestart();
 document.body.append(el);
}
// Download bar while the service worker saves a version for offline play (first visit) or fetches an update.
function downloadBar(m,updating){
 let el=document.getElementById('sc-dl');
 if(!el){el=Object.assign(document.createElement('div'),{id:'sc-dl',innerHTML:'<span></span><i><b></b></i>'});el.setAttribute('role','status');document.body.append(el);}
 const pct=m.total?Math.min(100,Math.round(m.got/m.total*100)):0;
 el.querySelector('span').textContent=m.failed?'Download stopped. It will try again next time.':m.done?(updating?'Update downloaded':'Saved for offline play'):`${updating?'Downloading update':'Saving for offline play'} · ${pct}%`;
 el.querySelector('b').style.width=(m.done?100:pct)+'%';
 if(m.done||m.failed){clearTimeout(el._t);el._t=setTimeout(()=>el.remove(),2500);}
}
// 'accepted' / 'dismissed' from the browser's prompt, 'ios' (Share → Add to Home Screen), or 'menu' (use the browser menu).
async function installApp(){
 if(deferred){const e=deferred;deferred=null;syncInstallButtons();try{await e.prompt();return (await e.userChoice).outcome;}catch{return 'menu';}}
 return isIOS()?'ios':'menu';
}
Object.assign(exports,{initPWA,installApp,canInstall,installOffered,standalone,checkForUpdate,restartApp});
