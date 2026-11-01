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
// Updates: the installed app's game page is network-first (sw.js from tools/build.mjs): opening it loads a newer release
// straight from the site, like a browser tab. An app that Android kept in memory just resumes, though, so the app also
// asks the site's /version when it starts and whenever it comes back on screen (at most every few minutes); a newer
// release shows an Update button (#sc-ready) that reloads the page. Settings → Check for updates asks by hand.
let reg=null,ready=false,updating=false,lastAsk=0,canRestart=()=>true,current=null;
// The app build's pictures and sounds, [file name in a/, bytes] (tools/build.mjs --pwa; null in the one-file game). The
// service worker downloads the ones it doesn't have yet for offline play; sent at start and on coming back on screen
// (a download that was cut off carries on).
const APP_FILES=/*@@APP_FILES@@*/null;
function sendFiles(){if(APP_FILES&&current)navigator.serviceWorker?.ready.then(r=>r.active?.postMessage({type:'sc-files',version:current,files:APP_FILES})).catch(()=>{});}
const ASK_EVERY=5*60*1000;
async function latestVersion(){try{const r=await fetch('version',{cache:'no-store'});const t=r.ok?(await r.text()).trim():'';return /^v?\d+\.\d+\.\d+[\w.-]*$/.test(t)?t.replace(/^v/,''):null;}catch{return null;}}
// a > b for "0.71.1" style versions
function newerThan(a,b){const pa=String(a).split('.').map(n=>parseInt(n,10)||0),pb=String(b).split('.').map(n=>parseInt(n,10)||0);for(let i=0;i<3;i++)if(pa[i]!==pb[i])return pa[i]>pb[i];return false;}
async function askForUpdate(force=false){
 if(!force&&Date.now()-lastAsk<ASK_EVERY)return null;
 lastAsk=Date.now();reg?.update().catch(()=>{});
 if(!current)return null;const latest=await latestVersion();if(latest&&newerThan(latest,current))readyPill(latest);return latest;
}
async function initPWA({onUpdate,restartOK,version}={}){current=version||null;
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
 try{reg=await navigator.serviceWorker.register('sw.js');}catch{return;}
 // first install: ask the offline copy to keep this page (it loaded before the service worker was in charge)
 navigator.serviceWorker.ready.then(r=>r.active?.postMessage({type:'sc-keep'})).catch(()=>{});
 sendFiles();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){void askForUpdate();sendFiles();}});
 setTimeout(()=>void askForUpdate(true),4000);
}
// Settings → Check for updates. The game's site answers /version with the newest release tag (cloudflare/worker.js).
// Resolves {state, latest}: 'current' | 'available' (newer release: restarting loads it) | 'ready' (a new version of the
// offline copy itself is in: restart) | 'unknown' (the site didn't answer) | 'offline' | 'file' (opened as a file).
async function checkForUpdate(version){
 if(!served())return {state:'file'};
 const latest=await latestVersion();
 if(!latest)return {state:navigator.onLine===false?'offline':'unknown'};
 if(newerThan(latest,version)){readyPill(latest);return {state:'available',latest};}
 if(ready)return {state:'ready',latest};
 return {state:'current',latest};
}
function restartApp(){location.reload();}
// Update ready (a newer release on the site, or a new offline copy): a small Update button over the bottom of the screen
// (hidden while a minigame is running).
function readyPill(latest){
 const old=document.getElementById('sc-ready');if(old){if(latest)old.querySelector('span').textContent=`v${latest} is out`;return;}
 const el=Object.assign(document.createElement('div'),{id:'sc-ready',innerHTML:`<span>${latest?`v${latest} is out`:'New version ready'}</span><button type="button">${latest?'Update':'Restart'}</button><button type="button" class="x" aria-label="Later">✕</button>`});
 el.setAttribute('role','status');
 const [go,later]=el.querySelectorAll('button');go.onclick=restartApp;later.onclick=()=>{el.remove();clearInterval(t);};
 const t=setInterval(()=>{el.hidden=!canRestart();},1000);el.hidden=!canRestart();
 document.body.append(el);
}
// Download bar while the service worker saves pictures and sounds for offline play (all of them on the first visit, the
// new ones after an update). Whatever arrived before a stop is kept (tools/build.mjs).
function downloadBar(m,updating){
 let el=document.getElementById('sc-dl');
 if(!el){el=Object.assign(document.createElement('div'),{id:'sc-dl',innerHTML:'<span></span><i><b></b></i>'});el.setAttribute('role','status');document.body.append(el);}
 const pct=m.total?Math.min(100,Math.round(m.got/m.total*100)):0;
 el.querySelector('span').textContent=m.failed?'Download stopped. It carries on from there next time.':m.done?'Saved for offline play':`${updating?'Saving new pictures and sounds':'Saving for offline play'} · ${pct}%`;
 el.querySelector('b').style.width=(m.done?100:pct)+'%';
 if(m.done||m.failed){clearTimeout(el._t);el._t=setTimeout(()=>el.remove(),2500);}
}
// 'accepted' / 'dismissed' from the browser's prompt, 'ios' (Share → Add to Home Screen), or 'menu' (use the browser menu).
async function installApp(){
 if(deferred){const e=deferred;deferred=null;syncInstallButtons();try{await e.prompt();return (await e.userChoice).outcome;}catch{return 'menu';}}
 return isIOS()?'ios':'menu';
}
Object.assign(exports,{initPWA,installApp,canInstall,installOffered,standalone,checkForUpdate,restartApp});
