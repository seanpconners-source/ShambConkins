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
async function initPWA({onUpdate}={}){
 headLink('icon',FAVICON,{type:'image/png'});headLink('apple-touch-icon',APPLE_ICON);
 if(!served()||!MANIFEST)return;
 addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;syncInstallButtons();});
 addEventListener('appinstalled',()=>{deferred=null;syncInstallButtons();});
 const folder=await folderManifest();
 headLink('manifest',folder?'manifest.webmanifest':inlineManifest());
 if(!folder||!navigator.serviceWorker)return;
 const updating=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updating)onUpdate?.();});
 navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='sc-download')downloadBar(e.data,updating);});
 navigator.serviceWorker.register('sw.js').catch(()=>{});
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
Object.assign(exports,{initPWA,installApp,canInstall,installOffered,standalone});
