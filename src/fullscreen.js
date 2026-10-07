// Fullscreen for phones (Samsung Internet, Chrome). Browsers only allow fullscreen from a user gesture,
// so the first tap anywhere enters it; the home screen also has a toggle button.
const doc=document,root=()=>doc.documentElement;
function fullscreenSupported(){const el=root();return !!(el.requestFullscreen||el.webkitRequestFullscreen)&&doc.fullscreenEnabled!==false;}
function isFullscreen(){return !!(doc.fullscreenElement||doc.webkitFullscreenElement);}
function enterFullscreen(){const el=root();try{const p=el.requestFullscreen?el.requestFullscreen({navigationUI:'hide'}):el.webkitRequestFullscreen?.();p?.catch?.(()=>{});}catch{}}
function exitFullscreen(){try{const p=doc.exitFullscreen?doc.exitFullscreen():doc.webkitExitFullscreen?.();p?.catch?.(()=>{});}catch{}}
function toggleFullscreen(){if(isFullscreen())exitFullscreen();else enterFullscreen();}
// style: 'text' (home stack), 'icon' (top bars), 'onoff' (settings row).
function fullscreenLabel(style='text'){const on=isFullscreen();return style==='icon'?(on?'⤡':'⤢'):style==='onoff'?(on?'On':'Off'):on?'⤡ EXIT FULL SCREEN':'⤢ FULL SCREEN';}
function fullscreenButton(style='text',cls='small ghost'){if(!fullscreenSupported())return '';return `<button class="${cls} fullscreen-toggle" data-action="fullscreen" data-fs-style="${style}" aria-label="Toggle full screen" title="Full screen">${fullscreenLabel(style)}</button>`;}
// The fullscreen element joins the browser's top layer above an open modal dialog (e.g. Settings), hiding it: re-raise it.
function raiseDialogs(){doc.querySelectorAll('dialog[open]').forEach(d=>{try{if(d.matches(':modal')){d.close();d.showModal();}}catch{}});}
function syncLabels(){raiseDialogs();doc.querySelectorAll('[data-action="fullscreen"]').forEach(b=>{b.textContent=fullscreenLabel(b.dataset.fsStyle);});}
function initFullscreen(){if(!fullscreenSupported())return;doc.addEventListener('fullscreenchange',syncLabels);doc.addEventListener('webkitfullscreenchange',syncLabels);
 // First tap anywhere (except the toggle itself, which handles its own click) goes fullscreen.
 const first=ev=>{doc.removeEventListener('pointerup',first,true);if(ev.target?.closest?.('[data-action="fullscreen"]'))return;if(!isFullscreen())enterFullscreen();};
 doc.addEventListener('pointerup',first,true);}
Object.assign(exports,{fullscreenSupported,isFullscreen,enterFullscreen,exitFullscreen,toggleFullscreen,fullscreenLabel,fullscreenButton,initFullscreen});
