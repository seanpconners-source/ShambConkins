// Full-bleed game screen: the house style for every new minigame (as in Broforce, Super Mario Bros., Mario Kart and
// Photo Hunt). The canvas fills the whole screen; the title bar, score bar, status line and controls bar go; Pause
// and Exit float as small pills in the top-right corner; a discreet full-screen toggle (⤢ / ⤡) floats at the bottom
// centre. Touch controls are drawn by the game itself, floating over the canvas.
// Call it right after s.canvas(w,h,{fill:true}):  const fb=fullBleed(s,{bg:'#000'});
// Options: bg (page colour behind the canvas), hint (true keeps the "Controls" help as a chip in the top-left corner).
// Returns {top}: the screen px the floating pills cover at the top-right, so the game's own HUD can stay clear of them.
const {fullscreenSupported,toggleFullscreen,fullscreenLabel}=require("src/fullscreen.js");

const CSS=`#game-layer.fb-layer{padding:0;height:100dvh;max-height:none}
 .game-shell.fb-shell{position:relative;max-width:none;width:100%;height:100%;border:0;border-radius:0;grid-template-rows:minmax(0,1fr);overflow:hidden;background:var(--fb-bg,#000)}
 .fb-shell>.game-header{position:absolute;right:max(6px,env(safe-area-inset-right));top:max(4px,env(safe-area-inset-top));z-index:12;border:0;background:transparent;padding:0;min-height:0;box-shadow:none}
 .fb-shell>.game-header>:not(.game-actions){display:none}
 .fb-shell .game-actions{gap:4px;display:flex}
 .fb-shell .game-actions button{min-height:32px;min-width:0;padding:3px 10px;font-size:12px;line-height:1;border-radius:999px;background:#000a;color:#fff;border:1px solid #ffffff40;box-shadow:none}
 .fb-shell>#game-scorebar{display:none}
 .fb-shell>.game-body{padding:0;display:flex;gap:0;overflow:hidden;min-height:0}
 .fb-shell .canvas-frame{border:0;border-radius:0;flex:1;min-height:0;width:100%;height:100%;background:var(--fb-bg,#000)}
 .fb-shell .game-canvas{display:block;border:0;border-radius:0;max-width:none;max-height:none;touch-action:none}
 .fb-shell #game-status,.fb-shell #game-controls,.fb-shell:not(.fb-hint) #game-hint{display:none}
 .fb-shell.fb-hint #game-hint{position:absolute;left:max(6px,env(safe-area-inset-left));top:max(4px,env(safe-area-inset-top));z-index:12;margin:0;max-width:min(72vw,420px)}
 .fb-shell.fb-hint #game-hint .control-guide{background:#000a;border:1px solid #ffffff40;border-radius:8px;padding:0;color:#fff;font-size:12px}
 .fb-shell.fb-hint #game-hint summary{padding:7px 10px;min-height:20px;cursor:pointer}
 .fb-shell.fb-hint #game-hint p{margin:0;padding:0 10px 10px;max-height:50vh;overflow:auto}
 .fb-shell .pass-overlay{z-index:30}
 .fb-fs{position:absolute;left:50%;transform:translateX(-50%);bottom:max(5px,env(safe-area-inset-bottom));z-index:12;width:28px;height:28px;min-width:0;min-height:0;box-shadow:none;padding:0;margin:0;border:0;border-radius:8px;background:rgba(255,255,255,.16);color:#fff;opacity:.45;font:700 15px/28px Arial,sans-serif;cursor:pointer;touch-action:manipulation}
 .fb-shell .game-actions .fs-mini{display:none}
 .fb-fs:hover,.fb-fs:focus-visible{opacity:1}`;

function fullBleed(s,{bg='#000',hint=false}={}){
 // This look replaces the generic session.bleed() layout that s.canvas() switches on by default.
 s.bleed?.(false);
 const shell=s.body.closest('.game-shell'),layer=shell?.parentElement;if(!shell)return {top:0};
 shell.classList.add('fb-shell');if(hint)shell.classList.add('fb-hint');shell.style.setProperty('--fb-bg',bg);layer?.classList.add('fb-layer');
 const css=document.createElement('style');css.textContent=CSS;shell.appendChild(css);
 let fs=null;
 if(fullscreenSupported()){fs=document.createElement('button');fs.type='button';fs.className='fb-fs';fs.setAttribute('aria-label','Toggle full screen');fs.title='Full screen';fs.textContent=fullscreenLabel('icon');shell.appendChild(fs);
  s.on(fs,'pointerdown',e=>e.stopPropagation());s.on(fs,'click',e=>{e.preventDefault();e.stopPropagation();toggleFullscreen();});
  const sync=()=>{fs.textContent=fullscreenLabel('icon');};s.on(document,'fullscreenchange',sync);s.on(document,'webkitfullscreenchange',sync);}
 s.cleanup(()=>{css.remove();fs?.remove();shell.classList.remove('fb-shell','fb-hint');shell.style.removeProperty('--fb-bg');layer?.classList.remove('fb-layer');});
 s.queueCanvasFit?.();
 return {top:44};
}
Object.assign(exports,{fullBleed});
