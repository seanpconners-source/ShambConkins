// Fullscreen for phones (Samsung Internet, Chrome). Browsers only allow fullscreen from a user gesture,
// so the first tap anywhere enters it; the home screen also has a toggle button.
const doc=document,root=()=>doc.documentElement;
function fullscreenSupported(){const el=root();return !!(el.requestFullscreen||el.webkitRequestFullscreen)&&doc.fullscreenEnabled!==false;}
function isFullscreen(){return !!(doc.fullscreenElement||doc.webkitFullscreenElement);}
function enterFullscreen(){const el=root();try{const p=el.requestFullscreen?el.requestFullscreen({navigationUI:'hide'}):el.webkitRequestFullscreen?.();p?.catch?.(()=>{});}catch{}}
function exitFullscreen(){try{const p=doc.exitFullscreen?doc.exitFullscreen():doc.webkitExitFullscreen?.();p?.catch?.(()=>{});}catch{}}
function toggleFullscreen(){if(isFullscreen())exitFullscreen();else enterFullscreen();}
function fullscreenLabel(){return isFullscreen()?'⤡ EXIT FULL SCREEN':'⤢ FULL SCREEN';}
function syncLabels(){doc.querySelectorAll('[data-action="fullscreen"]').forEach(b=>{b.textContent=fullscreenLabel();});}
function initFullscreen(){if(!fullscreenSupported())return;doc.addEventListener('fullscreenchange',syncLabels);doc.addEventListener('webkitfullscreenchange',syncLabels);
 // First tap anywhere (except the toggle itself, which handles its own click) goes fullscreen.
 const first=ev=>{doc.removeEventListener('pointerup',first,true);if(ev.target?.closest?.('[data-action="fullscreen"]'))return;if(!isFullscreen())enterFullscreen();};
 doc.addEventListener('pointerup',first,true);}
Object.assign(exports,{fullscreenSupported,isFullscreen,enterFullscreen,exitFullscreen,toggleFullscreen,fullscreenLabel,initFullscreen});
