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
// Songs and the Doom data (~245 MB) belong to a few games, so they aren't downloaded at install: each game's files come
// the first time it opens (wantGameFiles, from the game session) or all at once from Settings (wantAllFiles). Keys by the
// games that use them; every other file still comes at install. Played offline before its files are in, a game is silent.
const LATER={'music:bhpin-':['bucketheadland-pinball'],'music:kgpin-':['king-gizzard-pinball'],'music:bspin-':['black-sabbath-pinball'],'music:thps-':['greed-island-mancala'],
 'music:sunset-':['django-hangman','django-hangman-showdown','django-hangman-wanted','sundown-showdown'],'doom:':['doom','doom-2']};
// [name, bytes] of the later files (all, or only those of prefixes that pass `which`)
function laterFiles(which=()=>true){if(!APP_FILES)return [];let up={};try{up=require("src/data/userPortraits.js").USER_PORTRAITS;}catch{}
 const names=new Set();for(const [k,url] of Object.entries(up))for(const pre of Object.keys(LATER))if(k.startsWith(pre)&&which(pre)&&typeof url==='string')names.add(url.replace(/^a\//,''));
 return APP_FILES.filter(([n])=>names.has(n));}
const post=m=>navigator.serviceWorker?.ready.then(r=>r.active?.postMessage(m)).catch(()=>{});
function sendFiles(){if(APP_FILES&&current)post({type:'sc-files',version:current,files:APP_FILES,later:laterFiles().map(f=>f[0])});}
// a game is starting: get its songs now if they aren't saved yet (the service worker skips the ones it has)
function wantGameFiles(id){if(!APP_FILES||!served())return;const files=laterFiles(pre=>LATER[pre].includes(id));if(files.length)post({type:'sc-want',files});}
// Settings → Download all songs: total MB asked for (the ones already saved are skipped, the bar shows the rest)
function wantAllFiles(){const files=laterFiles();if(files.length)post({type:'sc-want',files});return files.reduce((s,[,b])=>s+b,0);}
const laterBytes=()=>laterFiles().reduce((s,[,b])=>s+b,0);
const ASK_EVERY=5*60*1000;
// last answer from the site: {ok, ms, error} (Settings shows it when a check fails, to tell a blocked network from a slow one)
let lastCheck=null;
async function latestVersion(){const t0=Date.now(),ctl=typeof AbortController!=='undefined'?new AbortController():null,stop=setTimeout(()=>ctl?.abort(),20000);
 try{const r=await fetch('version',{cache:'no-store',signal:ctl?.signal});const t=r.ok?(await r.text()).trim():'',ok=/^v?\d+\.\d+\.\d+[\w.-]*$/.test(t);
  lastCheck={ok,ms:Date.now()-t0,error:ok?'':`the site answered ${r.status}`};return ok?t.replace(/^v/,''):null;}
 catch(err){lastCheck={ok:false,ms:Date.now()-t0,error:err?.name==='AbortError'?'no answer in 20 s':String(err?.message||err)};return null;}
 finally{clearTimeout(stop);}}
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
 navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='sc-download')downloadBar(e.data,updating);
  // a start that played the saved copy (the site was slow) has since saved the new one: offer the restart
  if(e.data?.type==='sc-saved'&&updating){ready=true;readyPill();}});
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
 if(!latest)return {state:navigator.onLine===false?'offline':'unknown',check:lastCheck};
 if(newerThan(latest,version)){readyPill(latest);return {state:'available',latest};}
 if(ready)return {state:'ready',latest};
 return {state:'current',latest};
}
function restartApp(){location.reload();}
// Download a newer release into the offline copy first, then restart (service worker v6 'sc-get'; build.mjs). A plain
// restart only waits 2.5 s for the site before playing the saved copy, so on a slow network it kept opening the old version.
// onProgress({got,total}); resolves {done} | {failed,error} | {old} (no service worker, or one from before v6: restart as before).
function fetchUpdate(onProgress){return new Promise(res=>{const sw=navigator.serviceWorker?.controller;if(!sw||typeof MessageChannel==='undefined')return res({old:true});
 let t=0;const ch=new MessageChannel(),wait=ms=>{clearTimeout(t);t=setTimeout(()=>res(heard?{failed:true,error:'the download stalled'}:{old:true}),ms);};let heard=false;
 ch.port1.onmessage=e=>{heard=true;const d=e.data||{};if(d.done||d.failed){clearTimeout(t);res(d);}else{onProgress?.(d);wait(45000);}};
 wait(4000);sw.postMessage({type:'sc-get'},[ch.port2]);});}
const mbs=n=>(n/1048576).toFixed(1)+' MB';
let fetching=null;
// The Update button (and Settings → Check for updates): download, then restart; the pill shows how far it got.
function updateApp(latest){if(fetching)return fetching;readyPill(latest);const el=document.getElementById('sc-ready'),label=el?.querySelector('span'),btns=el?[...el.querySelectorAll('button')]:[];
 btns.forEach(b=>b.disabled=true);if(label)label.textContent=`Downloading v${latest||''}…`;
 return fetching=fetchUpdate(d=>{if(label)label.textContent=`Downloading v${latest||''} · ${d.total?Math.min(99,Math.round(d.got/d.total*100))+'%':mbs(d.got)}`;}).then(r=>{fetching=null;
  if(r.done||r.old){restartApp();return r;}
  btns.forEach(b=>b.disabled=false);if(label)label.textContent=`Download stopped (${r.error}). Tap Update to carry on`;return r;});}
// Update ready (a newer release on the site, or a new offline copy): a small Update button over the bottom of the screen
// (hidden while a minigame is running).
function readyPill(latest){
 let el=document.getElementById('sc-ready');
 if(!el){el=Object.assign(document.createElement('div'),{id:'sc-ready',innerHTML:`<span></span><button type="button"></button><button type="button" class="x" aria-label="Later">✕</button>`});
  el.setAttribute('role','status');const t=setInterval(()=>{el.hidden=!canRestart();},1000);el.hidden=!canRestart();
  el.querySelector('.x').onclick=()=>{el.remove();clearInterval(t);};document.body.append(el);}
 else if(fetching)return;   // a download in progress keeps its own text
 // a saved new copy (no version given) beats "is out": restarting opens it at once, nothing left to download
 if(!latest&&el.dataset.latest)delete el.dataset.latest;else if(latest&&el.dataset.state==='ready')return;else if(latest)el.dataset.latest=latest;
 el.dataset.state=latest?'out':'ready';
 const [label,go]=el.querySelectorAll('span,button');label.textContent=latest?`v${latest} is out`:'New version ready';go.textContent=latest?'Update':'Restart';
 go.onclick=()=>latest?void updateApp(latest):restartApp();
}
// Download bar while the service worker saves pictures and sounds for offline play (all of them on the first visit, the
// new ones after an update). Whatever arrived before a stop is kept (tools/build.mjs).
function downloadBar(m,updating){
 let el=document.getElementById('sc-dl');
 if(!el){el=Object.assign(document.createElement('div'),{id:'sc-dl',innerHTML:'<span></span><i><b></b></i>'});el.setAttribute('role','status');document.body.append(el);}
 const pct=m.total?Math.min(100,Math.round(m.got/m.total*100)):0;
 el.querySelector('span').textContent=m.failed?'Download stopped. It carries on from there next time.':m.done?(m.kind==='songs'?'Songs saved for offline play':'Saved for offline play'):`${m.kind==='songs'?'Downloading songs':updating?'Saving new pictures and sounds':'Saving for offline play'} · ${pct}%`;
 el.querySelector('b').style.width=(m.done?100:pct)+'%';
 if(m.done||m.failed){clearTimeout(el._t);el._t=setTimeout(()=>el.remove(),2500);}
}
// 'accepted' / 'dismissed' from the browser's prompt, 'ios' (Share → Add to Home Screen), or 'menu' (use the browser menu).
async function installApp(){
 if(deferred){const e=deferred;deferred=null;syncInstallButtons();try{await e.prompt();return (await e.userChoice).outcome;}catch{return 'menu';}}
 return isIOS()?'ios':'menu';
}
Object.assign(exports,{wantGameFiles,wantAllFiles,laterBytes,initPWA,installApp,canInstall,installOffered,standalone,checkForUpdate,restartApp,updateApp});
