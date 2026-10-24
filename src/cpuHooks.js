// Seams for the 1-player board game (src/cpuBoard.js), like netHooks.js for the online one. No imports, so ui.js,
// routePanel.js and profile.js can ask it without a cycle. With no CPU in the run everything here does nothing.
const hooks={dialog:null,route:null,waiting:null,blocksRecruit:null};
function setCpuHooks(h){Object.assign(hooks,h);}
// A dialog / road choice that belongs to the CPU player: it is shown read-only while the CPU picks (else null).
function cpuDialog(opts){return hooks.dialog?.(opts)||null;}
function cpuRoute(opts){return hooks.route?.(opts)||null;}
// "AMBER (CPU)'S TURN" while the CPU is up (the roll / items buttons are off), else ''.
function cpuWaiting(){return hooks.waiting?.()||'';}
// The CPU's wins never add characters to a real person's roster.
function cpuBlocksRecruit(owner){return !!hooks.blocksRecruit?.(owner);}
Object.assign(exports,{setCpuHooks,cpuDialog,cpuRoute,cpuWaiting,cpuBlocksRecruit});
