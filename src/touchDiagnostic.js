const {store}=require("src/state.js");
const {showDialog}=require("src/ui.js");
const {inputMode, listenGameInput}=require("src/touchInput.js");
async function touchDiagnostic(){
 const mode=inputMode(store.profile.settings.touchMode),abort=new AbortController(),points=new Map();let maximum=0,cancelled=0;
 const pending=showDialog({title:'Two-finger control check',body:'Hold one finger on each side and move both at once. Each dot should keep following its own finger.',html:`<canvas id="touch-test-pad" class="touch-test-pad" width="680" height="260" aria-label="Two-finger test area"></canvas><div id="touch-test-result" class="touch-test-result">Waiting for your fingers…</div><p class="how-to">Control mode: ${mode==='touch'?'Compatibility':'Pointer'} · Device reports ${Number(navigator.maxTouchPoints)||0} touch points. If only one is detected, switch Touch controls in Settings and retry in Chrome or Samsung Internet.</p>`,choices:[{label:'Back to settings',value:'done',primary:true}]});
 const canvas=document.getElementById('touch-test-pad'),ctx=canvas.getContext('2d'),result=document.getElementById('touch-test-result');
 const position=ev=>{const r=canvas.getBoundingClientRect();return {x:(ev.clientX-r.left)/r.width*680,y:(ev.clientY-r.top)/r.height*260};};
 const draw=()=>{
  ctx.fillStyle='#14243d';ctx.fillRect(0,0,680,260);ctx.strokeStyle='#8192b6';ctx.setLineDash([7,9]);ctx.beginPath();ctx.moveTo(340,0);ctx.lineTo(340,260);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#dce7fb';ctx.font='18px Arial';ctx.textAlign='center';ctx.fillText('PLAYER 1',170,32);ctx.fillText('PLAYER 2',510,32);
  for(const p of points.values()){ctx.fillStyle=p.owner?'#ff78b4':'#4d9aff';ctx.beginPath();ctx.arc(p.x,p.y,26,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 20px Arial';ctx.fillText(String(p.owner+1),p.x,p.y+7);}
  result.textContent=maximum>=2?`${points.size} fingers held · ${maximum} detected together ✓`:`${points.size} finger held · waiting for the second`;
  if(cancelled)result.textContent+=` · ${cancelled} cancelled`;
 };
 const listen=(event,fn)=>listenGameInput(canvas,event,fn,{signal:abort.signal,mode});
 listen('pointerdown',ev=>{ev.preventDefault();const p=position(ev);points.set(ev.pointerId,{...p,owner:p.x<340?0:1});maximum=Math.max(maximum,points.size);if(ev.pointerId>=0)try{canvas.setPointerCapture(ev.pointerId);}catch{}draw();});
 listen('pointermove',ev=>{const p=points.get(ev.pointerId);if(p){ev.preventDefault();Object.assign(p,position(ev));draw();}});
 listen('pointerup',ev=>{points.delete(ev.pointerId);draw();});
 listen('pointercancel',ev=>{if(points.delete(ev.pointerId))cancelled++;draw();});
 draw();await pending;abort.abort();return {maximum,cancelled,mode};
}

Object.assign(exports,{touchDiagnostic});