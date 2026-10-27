// Seams for the online board game (src/netBoard.js). It has no imports so any module can use it without a cycle.
// Board visuals (cards, dice, banners, sounds, toasts) call fx() so the hosting phone can repeat them on the other
// phone; showDialog / showRoutePanel ask netDialog / netRoute first; updateBoard and saveRun call netChanged() so
// the host sends its run. With no online game everything here does nothing.
const hooks={fx:null,dialog:null,route:null,changed:null,watching:null};
let localDepth=0;
function setNetHooks(h){Object.assign(hooks,h);}
function fx(name,...args){if(hooks.fx)try{hooks.fx(name,args);}catch(err){console.error(err);}}
// Dialogs opened by this phone's own menus (story log, settings, help...) never go to the other phone.
async function localDialogs(fn){localDepth++;try{return await fn();}finally{localDepth--;}}
function netDialog(opts){return hooks.dialog&&!localDepth&&!opts.local?hooks.dialog(opts):null;}
function netRoute(opts){return hooks.route&&!localDepth?hooks.route(opts):null;}
function netChanged(){hooks.changed?.();}
// A menu of this phone's own (story log, settings, help...) is open right now.
function localBusy(){return localDepth>0;}
// Read-only note for animated dialogs (the game roulette) while the other phone's player is up, else ''.
function netWatching(){return hooks.watching?.()||'';}
Object.assign(exports,{setNetHooks,fx,localDialogs,localBusy,netDialog,netRoute,netChanged,netWatching});
