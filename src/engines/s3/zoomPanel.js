// Seanic's zoom button + slider (owner, Nov 11: "give me a settings with a zoom slider"). A small 🔍 pill sits left of the
// floating Pause/Exit pills; it opens a card with one slider (closer .. further out, the middle = automatic) for THIS
// screen's shape (tall phone / near-square like an open Fold / landscape), saved in profile.settings.seanicZoom per shape,
// so each screen of a folding phone keeps its own. The game holds still while the card is open (opts.hold).
const {store}=require("src/state.js");
const {saveProfile}=require("src/profile.js");
const {shapeOf,ZOOM_MIN,ZOOM_MAX}=require("src/engines/s3/camera.js");
const SHAPE_NAME={tall:'Tall phone screen',square:'Square screen (open Fold, tablet)',wide:'Landscape screen'};
const CSS=`.s3-tools{position:absolute;z-index:13;display:flex;gap:4px}
 .s3-tools button{width:30px;height:30px;min-width:0;min-height:0;padding:0;margin:0;border-radius:999px;background:#000a;color:#fff;border:1px solid #ffffff40;box-shadow:none;font:700 15px/28px system-ui,sans-serif;text-align:center;cursor:pointer}
 .s3-panel{position:absolute;inset:0;z-index:25;display:flex;align-items:flex-end;justify-content:center;padding-bottom:max(18px,6vh);background:#0005;touch-action:none}
 .s3-card{width:min(360px,90vw);background:#0b1440f0;color:#fff;border:2px solid #ffe23a;border-radius:14px;padding:14px 18px 12px;font:14px/1.3 system-ui,sans-serif;box-shadow:0 10px 40px #000c}
 .s3-card h3{margin:0 0 4px;font:italic 900 16px "Arial Black",Impact,sans-serif;letter-spacing:.04em;text-align:center}
 .s3-card .s3-shape{text-align:center;font-size:12px;color:#ffffffb0;margin-bottom:10px}
 .s3-card input[type=range]{width:100%;margin:0;accent-color:#ffe23a;height:30px}
 .s3-ends{display:flex;justify-content:space-between;font-size:11px;color:#ffffffa8;margin:2px 0 12px}
 .s3-btns{display:flex;gap:8px}.s3-btns button{flex:1;min-height:40px;border-radius:10px;border:0;font-weight:800;font-size:14px;cursor:pointer}
 .s3-btns .s3-auto{background:#ffffff22;color:#fff}.s3-btns .s3-done{background:#ffe23a;color:#0b1440}`;
// the saved zoom for a screen (1 = automatic)
function zoomFor(W,H){const z=store.profile?.settings?.seanicZoom?.[shapeOf(W,H)];return Number.isFinite(z)?Math.min(ZOOM_MAX,Math.max(ZOOM_MIN,z)):1;}
function saveZoom(W,H,z){const pr=store.profile;if(!pr)return;const o={...(pr.settings.seanicZoom||{})},k=shapeOf(W,H);if(Math.abs(z-1)<.001)delete o[k];else o[k]=Math.round(z*100)/100;pr.settings.seanicZoom=o;saveProfile(pr);}
// s = session; onChange(z) applies a zoom live; hold(on) pauses the game while the card is open
function installZoom(s,{onChange,hold}){const shell=s.body.closest('.game-shell');if(!shell)return {close(){}};
 const tools=document.createElement('div');tools.className='s3-tools';const css=document.createElement('style');css.textContent=CSS;
 const btn=document.createElement('button');btn.type='button';btn.textContent='🔍';btn.title='Zoom';btn.setAttribute('aria-label','Zoom');tools.append(btn);
 shell.append(css,tools);let panel=null;
 const close=()=>{if(!panel)return;panel.remove();panel=null;hold(false);};
 s.cleanup(()=>{close();tools.remove();css.remove();});
 for(const ev of ['pointerdown','pointerup','touchstart'])tools.addEventListener(ev,e=>e.stopPropagation());
 // left of Pause/Exit, same height
 let key='';const place=()=>{const acts=shell.querySelector('.game-actions'),r=acts?.getBoundingClientRect(),sr=shell.getBoundingClientRect();if(!r||!sr.width)return;
  const k=`${Math.round(sr.right-r.left)},${Math.round(r.top-sr.top)}`;if(k===key)return;key=k;Object.assign(tools.style,{right:(sr.right-r.left+6)+'px',top:(r.top-sr.top+1)+'px'});};
 place();const iv=setInterval(place,500);s.cleanup(()=>clearInterval(iv));
 btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(panel){close();return;}hold(true);
  const W=s.W,H=s.H,z=zoomFor(W,H);panel=document.createElement('div');panel.className='s3-panel';
  panel.innerHTML=`<div class="s3-card" role="dialog" aria-label="Zoom"><h3>ZOOM</h3><div class="s3-shape">${SHAPE_NAME[shapeOf(W,H)]} · remembered for this screen</div>
   <input type="range" min="${ZOOM_MIN*100}" max="${ZOOM_MAX*100}" step="5" value="${Math.round(z*100)}" aria-label="Zoom"><div class="s3-ends"><span>Closer</span><span>Further out</span></div>
   <div class="s3-btns"><button type="button" class="s3-auto">Auto</button><button type="button" class="s3-done">Done</button></div></div>`;
  shell.append(panel);for(const ev of ['pointerdown','pointermove','pointerup','touchstart','touchmove'])panel.addEventListener(ev,e=>e.stopPropagation());
  const range=panel.querySelector('input');
  const set=v=>{saveZoom(W,H,v);onChange(v);};
  range.addEventListener('input',()=>set(+range.value/100));
  panel.querySelector('.s3-auto').addEventListener('click',()=>{range.value=100;set(1);});
  panel.querySelector('.s3-done').addEventListener('click',close);panel.addEventListener('click',e=>{if(e.target===panel)close();});});
 return {close};}
Object.assign(exports,{installZoom,zoomFor});
