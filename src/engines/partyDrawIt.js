// Draw It: one player draws a secret prompt with a finger, the other watches the replay and picks the right prompt out of six.
const {PROMPTS,CATS,makeRound}=require("src/data/partyDraw.js");
const {PartyUI,sfx,head,pname,esc,burst,banner,titleCard,shuffle,extraCSS,tone}=require("src/engines/partyKit.js");

const CW=800,CH=600,ROUNDS=6,DRAW_SECS=25,GUESS_SECS=20;
const COLORS=['#222831','#e63946','#1d6fe0','#2fb86a','#ffb703','#8e44ad'];
const SIZES=[4,10,22];
const CSS=`
.pk-draw{--pk-bg:linear-gradient(160deg,#0f4c5c,#16697a 60%,#1b8a8f);--pk-accent:#ff9f1c}
.dr-screen{padding:8px clamp(8px,2vw,16px)!important;gap:6px!important}
.dr-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.dr-prompt{font:900 clamp(18px,4.6vw,30px)/1.1 Arial;text-shadow:0 2px 0 rgba(0,0,0,.25)}
.dr-time{font:900 clamp(26px,7vw,40px)/1 Arial;min-width:54px;text-align:center}
.dr-canvaswrap{display:flex;justify-content:center}
.dr-canvas{background:#fff;border-radius:14px;box-shadow:0 6px 0 rgba(0,0,0,.28);touch-action:none;aspect-ratio:4/3;max-width:100%;cursor:crosshair}
.dr-tools{display:flex;gap:6px;justify-content:center;align-items:center;flex-wrap:wrap}
.pk-stage .dr-sw{appearance:none;width:38px;height:38px;min-height:0;padding:0;border-radius:50%;border:3px solid #fff8;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,.3)}
.pk-stage .dr-sw.sel{border-color:#fff;box-shadow:0 0 0 3px #ff9f1c,0 2px 0 rgba(0,0,0,.3);transform:scale(1.12)}
.pk-stage .dr-sw:hover{border-color:#fff8}.pk-stage .dr-tool:hover{background:rgba(0,0,0,.3);border-color:#fff6}.pk-stage .dr-tool.sel:hover{background:#ff9f1c}
.pk-stage .dr-tool{appearance:none;min-height:0;width:42px;height:38px;padding:0;border-radius:10px;border:2px solid #fff6;background:rgba(0,0,0,.3);color:#fff;font:900 18px Arial;cursor:pointer}
.pk-stage .dr-tool.sel{border-color:#fff;background:#ff9f1c;color:#222}
.dr-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.pk-stage .dr-opt{min-height:clamp(46px,7.5vh,60px);font-size:clamp(13px,3.2vw,17px);padding:6px 10px}
.dr-wide{flex-direction:row!important;align-items:center;max-width:1000px!important}
.dr-wide>.dr-left{flex:1 1 55%;display:flex;flex-direction:column;gap:8px;align-items:center;min-width:0}
.dr-wide>.dr-right{flex:1 1 40%;display:flex;flex-direction:column;gap:8px;min-width:0}
.dr-pts{font:900 clamp(26px,7vw,42px)/1 Arial;text-shadow:0 3px 0 rgba(0,0,0,.3)}
`;

function paintStroke(x,st,n){
 const pts=st.pts,m=Math.min(n,pts.length);if(!m)return;
 x.strokeStyle=st.c;x.fillStyle=st.c;x.lineWidth=st.w;x.lineCap='round';x.lineJoin='round';
 if(m===1){x.beginPath();x.arc(pts[0][0]*CW,pts[0][1]*CH,st.w/2,0,Math.PI*2);x.fill();return;}
 x.beginPath();x.moveTo(pts[0][0]*CW,pts[0][1]*CH);
 for(let i=1;i<m-1;i++){const mx=(pts[i][0]+pts[i+1][0])/2*CW,my=(pts[i][1]+pts[i+1][1])/2*CH;x.quadraticCurveTo(pts[i][0]*CW,pts[i][1]*CH,mx,my);}
 const l=pts[m-1];x.lineTo(l[0]*CW,l[1]*CH);x.stroke();
}
function paintAll(x,strokes){x.fillStyle='#fff';x.fillRect(0,0,CW,CH);for(const st of strokes)paintStroke(x,st,st.pts.length);}
// Builds a replay timeline: gaps between strokes are squeezed so empty thinking time is skipped.
function timeline(strokes){
 let clock=0,prevEnd=null;const out=[];
 for(const st of strokes){
  const t0=st.pts[0][2],t1=st.pts[st.pts.length-1][2],gap=prevEnd==null?0:Math.min(350,Math.max(0,t0-prevEnd));
  clock+=gap;out.push({st,start:clock,t0,dur:t1-t0});clock+=t1-t0;prevEnd=t1;
 }
 return {items:out,total:clock};
}
function paintAt(x,tl,clock){
 x.fillStyle='#fff';x.fillRect(0,0,CW,CH);
 for(const it of tl.items){
  if(clock<it.start)break;
  const el=clock-it.start;let n=0;for(const p of it.st.pts){if(p[2]-it.t0<=el)n++;else break;}
  paintStroke(x,it.st,n);
 }
}
function pickPrompts(rand,n){
 const cats=shuffle(Object.keys(CATS),rand),out=[];
 for(let i=0;i<n;i++){const cat=cats[i%cats.length];const pool=PROMPTS.filter(p=>p.cat===cat&&!out.includes(p));out.push(pool[Math.floor(rand()*pool.length)]);}
 return out;
}

async function drawIt(s){
 extraCSS('dr-css',CSS);
 const ui=new PartyUI(s,{theme:'draw'});
 const rand=s.random,names=[pname(s,0),pname(s,1)],score=[0,0],prompts=pickPrompts(rand,ROUNDS);
 let tick=null;s.frame(dt=>{if(tick)tick(dt);});
 s.hint('The drawer sketches a secret prompt with a finger: pick colours, the eraser, undo or brush size. The other player watches the replay and taps the right answer among six. Faster correct guesses score more, and the drawer earns half of what the guesser earns.');
 const wide=()=>ui.root.clientWidth>=720;
 const fit=(c,extra,share=1)=>{
  const aw=(ui.root.clientWidth-30)*share,ah=ui.root.clientHeight-extra;
  const w=Math.max(200,Math.min(aw,ah*4/3,860));c.style.width=w+'px';
 };
 const blank=()=>ui.set(`<div class="pk-screen"><div class="pk-q" style="font-size:50px">🎨</div><div class="pk-sub">Pass the phone…</div></div>`);

 function drawPhase(D,prompt){
  return new Promise(resolve=>{
   const cat=CATS[prompt.cat];
   ui.set(`<div class="pk-screen dr-screen">
    <div class="dr-top"><div><div class="pk-over" style="text-align:left">${cat.icon} ${cat.label} · no words!</div><div class="dr-prompt">${esc(prompt.text)}</div></div><div class="dr-time" data-time>${DRAW_SECS}</div></div>
    <div class="pk-bar"><i data-bar style="width:100%"></i></div>
    <div class="dr-canvaswrap"><canvas class="dr-canvas" width="${CW}" height="${CH}"></canvas></div>
    <div class="dr-tools">${COLORS.map((c,i)=>`<button class="dr-sw ${i===0?'sel':''}" style="background:${c}" data-act="col" data-i="${i}" aria-label="colour ${i+1}"></button>`).join('')}
     <button class="dr-tool" data-act="era" aria-label="eraser">🧽</button><button class="dr-tool" data-act="size" aria-label="brush size" data-size>●</button><button class="dr-tool" data-act="undo" aria-label="undo">↶</button></div>
    <button class="pk-btn good sm" data-act="done" style="align-self:center">Done ✓</button></div>`);
   const c=ui.root.querySelector('canvas'),x=c.getContext('2d');fit(c,185);paintAll(x,[]);
   const strokes=[];let col=0,eraser=false,sizeI=1,cur=null,pid=null,t0=null,finished=false;
   const colour=()=>eraser?'#fff':COLORS[col],width=()=>eraser?SIZES[sizeI]*2.2:SIZES[sizeI];
   const pos=ev=>{const r=c.getBoundingClientRect();return [Math.min(1,Math.max(0,(ev.clientX-r.left)/r.width)),Math.min(1,Math.max(0,(ev.clientY-r.top)/r.height))];};
   const now=()=>performance.now();
   s.on(c,'pointerdown',ev=>{if(finished||pid!=null)return;ev.preventDefault?.();pid=ev.pointerId;if(ev.pointerId>=0)try{c.setPointerCapture(ev.pointerId);}catch{}
    if(t0==null)t0=now();const p=pos(ev);cur={c:colour(),w:width(),pts:[[p[0],p[1],now()-t0]]};strokes.push(cur);paintStroke(x,cur,1);});
   s.on(c,'pointermove',ev=>{if(!cur||ev.pointerId!==pid)return;ev.preventDefault?.();const p=pos(ev),l=cur.pts[cur.pts.length-1];if(Math.abs(p[0]-l[0])+Math.abs(p[1]-l[1])<.004)return;cur.pts.push([p[0],p[1],now()-t0]);
    const n=cur.pts.length;if(n>=2){x.strokeStyle=cur.c;x.lineWidth=cur.w;x.lineCap='round';x.lineJoin='round';x.beginPath();const a=cur.pts[n-2],b=cur.pts[n-1];x.moveTo(a[0]*CW,a[1]*CH);x.lineTo(b[0]*CW,b[1]*CH);x.stroke();}});
   const up=ev=>{if(ev.pointerId!==pid)return;pid=null;cur=null;};
   s.on(c,'pointerup',up);s.on(c,'pointercancel',up);
   let left=DRAW_SECS;
   const finish=()=>{if(finished)return;finished=true;tick=null;ui.handler=null;sfx.ok();resolve(strokes.filter(st=>st.pts.length));};
   tick=dt=>{left-=dt;const l=Math.max(0,left);const t=ui.root.querySelector('[data-time]'),b=ui.root.querySelector('[data-bar]');
    if(t){const v=Math.ceil(l);if(t.textContent!==String(v)){t.textContent=v;if(v<=5&&v>0)sfx.tick();}t.style.color=l<6?'#ffb3a0':'#fff';}if(b)b.style.width=l/DRAW_SECS*100+'%';
    if(l<=0)finish();};
   ui.handler=(a,el)=>{
    if(a==='col'){eraser=false;col=+el.dataset.i;ui.root.querySelectorAll('.dr-sw').forEach((b,i)=>b.classList.toggle('sel',i===col));ui.root.querySelector('[data-act=era]').classList.remove('sel');sfx.tap();}
    else if(a==='era'){eraser=!eraser;el.classList.toggle('sel',eraser);ui.root.querySelectorAll('.dr-sw').forEach((b,i)=>b.classList.toggle('sel',!eraser&&i===col));sfx.tap();}
    else if(a==='size'){sizeI=(sizeI+1)%3;el.style.fontSize=[12,18,28][sizeI]+'px';sfx.tap();}
    else if(a==='undo'){if(strokes.length){strokes.pop();paintAll(x,strokes);sfx.tap();}}
    else if(a==='done'){finish();}
   };
   s.debug.drawCanvas=c;s.debug.strokes=strokes;
  });
 }

 function guessPhase(G,D,round,strokes){
  return new Promise(resolve=>{
   const w=wide();
   ui.set(`<div class="pk-screen dr-screen ${w?'dr-wide':''}">
    <div class="dr-left"><div class="dr-top" style="width:100%"><div><div class="pk-over" style="text-align:left">${esc(names[G])}, what is ${esc(names[D])} drawing?</div><div class="pk-sub" style="text-align:left">Faster = more points</div></div><div class="dr-time" data-time>${GUESS_SECS}</div></div>
    <div class="pk-bar" style="width:100%"><i data-bar style="width:100%"></i></div>
    <div class="dr-canvaswrap"><canvas class="dr-canvas" width="${CW}" height="${CH}"></canvas></div></div>
    <div class="dr-right"><div class="dr-grid">${round.options.map((o,i)=>`<button class="pk-opt dr-opt pk-in" style="animation-delay:${i*40}ms" data-act="g" data-i="${i}"><span>${esc(o)}</span></button>`).join('')}</div></div></div>`);
   const c=ui.root.querySelector('canvas'),x=c.getContext('2d');
   if(w)fit(c,110,.55);else fit(c,285);
   const tl=timeline(strokes),speed=Math.max(1.5,tl.total/11000);
   let clock=0,tt=0,done=false;paintAt(x,tl,0);
   tick=dt=>{
    if(done)return;
    clock+=dt*1000*speed;tt+=dt;paintAt(x,tl,Math.min(clock,tl.total+1));
    const l=Math.max(0,GUESS_SECS-tt),t=ui.root.querySelector('[data-time]'),b=ui.root.querySelector('[data-bar]');
    if(t)t.textContent=Math.ceil(l);if(b)b.style.width=l/GUESS_SECS*100+'%';
    if(l<=0){done=true;tick=null;ui.handler=null;resolve({idx:-1,t:GUESS_SECS});}
   };
   ui.handler=(a,el)=>{if(a==='g'){done=true;tick=null;ui.handler=null;sfx.pick();resolve({idx:+el.dataset.i,t:tt});}};
  });
 }

 function revealPhase(D,G,round,strokes,g,pts){
  return new Promise(resolve=>{
   const ok=g.idx===round.answer,w=wide();
   ui.set(`<div class="pk-screen dr-screen ${w?'dr-wide':''}">
    <div class="dr-left"><div class="pk-over">The drawing, replayed</div><div class="dr-canvaswrap"><canvas class="dr-canvas" width="${CW}" height="${CH}"></canvas></div></div>
    <div class="dr-right" style="align-items:center;text-align:center"><div class="pk-row">${head(s,D,ok?'win':'silly','lg')}${head(s,G,ok?'win':'sad','lg')}</div>
     <div class="pk-q" data-ans style="visibility:hidden">It was <b>${esc(round.options[round.answer])}</b></div>
     <div class="pk-sub" data-res style="min-height:20px"></div><div class="dr-pts" data-pts></div>
     <button class="pk-btn" data-act="go" style="visibility:hidden">Next ▸</button></div></div>`);
   const c=ui.root.querySelector('canvas'),x=c.getContext('2d');
   if(w)fit(c,110,.55);else fit(c,370);
   const tl=timeline(strokes),speed=Math.max(3,tl.total/3200);let clock=0,shown=false;
   tick=dt=>{
    clock+=dt*1000*speed;paintAt(x,tl,Math.min(clock,tl.total+1));
    if(!shown&&clock>tl.total+200){
     shown=true;tick=null;
     ui.root.querySelector('[data-ans]').style.visibility='visible';ui.root.querySelector('[data-ans]').classList.add('pk-pop');
     ui.root.querySelector('[data-res]').innerHTML=g.idx<0?`${esc(names[G])} ran out of time.`:ok?`${esc(names[G])} nailed it in ${g.t.toFixed(1)}s!`:`${esc(names[G])} guessed “${esc(round.options[g.idx])}”.`;
     ui.root.querySelector('[data-pts]').innerHTML=ok?`+${pts[G]} ${esc(names[G])} · +${pts[D]} ${esc(names[D])}`:'No points';
     if(ok){sfx.big();burst(ui.root,{emojis:['🎨','✨','⭐'],n:26,spread:230});banner(ui.root,'GOT IT!','#ffe27a');}else{sfx.bad();banner(ui.root,g.idx<0?'TIME!':'NOPE!','#ffb3b3');}
     const b=ui.root.querySelector('[data-act=go]');b.style.visibility='visible';
     ui.handler=a=>{if(a==='go'){sfx.tap();ui.handler=null;resolve(1);}};
    }
   };
  });
 }

 if(!await titleCard(s,'🎨','Take turns drawing a secret pop-culture prompt with your finger while the other player watches the replay and picks the right answer from six, as fast as possible.','Grab the pen'))return;
 for(let r=0;r<ROUNDS;r++){
  const D=r%2,G=1-D,prompt=prompts[r],round=makeRound(prompt,rand,shuffle);
  s.shared=false;blank();
  if(!await s.pass(D,`Round ${r+1} of ${ROUNDS}: you will see a secret prompt and have ${DRAW_SECS} seconds to draw it. ${names[G]}, look away!`,'Show me the prompt'))return;
  const strokes=await drawPhase(D,prompt);if(!s.alive)return;
  blank();
  if(!await s.pass(G,`${names[D]} drew something. Watch the replay and pick the right answer, fast!`,'Show me the drawing'))return;
  const g=await guessPhase(G,D,round,strokes);if(!s.alive)return;
  const ok=g.idx===round.answer,gp=ok?Math.round(3+7*(1-g.t/GUESS_SECS)):0,pts=[0,0];pts[G]=gp;pts[D]=Math.ceil(gp/2);
  s.shared=true;s.updateScores();
  score[0]+=pts[0];score[1]+=pts[1];s.setScores([...score]);
  if(ok){s.react(G,'happy');s.react(D,'happy');}else{s.react(G,'sad');}
  await revealPhase(D,G,round,strokes,g,pts);if(!s.alive)return;
  s.shared=false;
 }
 const w=score[0]>score[1]?0:score[1]>score[0]?1:-1;
 s.shared=true;s.updateScores();
 ui.set(`<div class="pk-screen"><div class="pk-over">Draw It · final</div><div class="pk-row">${head(s,0,w===0?'win':w<0?'silly':'sad','xl')}${head(s,1,w===1?'win':w<0?'silly':'sad','xl')}</div>
  <h1 class="pk-h1 pk-pop">${w<0?'A perfectly drawn tie!':esc(names[w])+' is the better artist!'}</h1><div class="pk-q">${score[0]} – ${score[1]}</div><button class="pk-btn" data-act="go">Finish</button></div>`);
 sfx.cheer();burst(ui.root,{emojis:['🎨','🖍️','⭐'],n:30,spread:240});
 await new Promise(res=>{ui.handler=a=>{if(a==='go')res(1);};});if(!s.alive)return;
 s.finish([...score],w<0?'Tied on the sketch pad.':`${names[w]} won Draw It ${score[w]}–${score[1-w]}.`);
}

Object.assign(exports,{drawIt,timeline,paintAt});
