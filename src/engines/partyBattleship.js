// Battleship: hidden fleets on an 8x8 grid, drag-to-place with tap-to-rotate, alternate shots, a hit earns another shot.
const {PartyUI,sfx,head,pname,esc,burst,banner,titleCard,shuffle,extraCSS,tone}=require("src/engines/partyKit.js");

const N=8;
const SHIPS=[['Battleship',4],['Cruiser',3],['Submarine',3],['Destroyer',2],['Patrol Boat',2]];
const COLS='ABCDEFGH';
const CSS=`
.pk-bs{--pk-bg:linear-gradient(180deg,#0b2a45,#0e3b5e 60%,#114d73);--pk-accent:#ff5a3c}
.bs-wrap{flex:1;display:flex;flex-direction:column;min-height:0;padding:6px 8px 8px;gap:6px}
.bs-status{font:800 clamp(13px,3.2vw,17px)/1.25 Arial;text-align:center;min-height:2.5em;display:flex;align-items:center;justify-content:center;text-wrap:balance}
.bs-cv{flex:1;min-height:0;position:relative}
.bs-cv canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block}
.bs-btns{display:flex;gap:8px;justify-content:center}
.bs-btns .pk-btn{max-width:260px}
`;
const cellsOf=sh=>Array.from({length:sh.len},(_,i)=>[sh.x+(sh.dir?0:i),sh.y+(sh.dir?i:0)]);
function fits(ships,sh,ignore){
 const occ=new Set();for(const o of ships)if(o!==ignore)for(const [x,y] of cellsOf(o))occ.add(x+','+y);
 return cellsOf(sh).every(([x,y])=>x>=0&&y>=0&&x<N&&y<N&&!occ.has(x+','+y));
}
function randomFleet(rand){
 for(let tries=0;tries<200;tries++){
  const ships=[];let ok=true;
  for(const [name,len] of SHIPS){
   let placed=false;
   for(let k=0;k<200&&!placed;k++){const dir=rand()<.5?0:1,sh={name,len,dir,x:Math.floor(rand()*(N-(dir?0:len-1))),y:Math.floor(rand()*(N-(dir?len-1:0))),hits:0};if(fits(ships,sh)){ships.push(sh);placed=true;}}
   if(!placed){ok=false;break;}
  }
  if(ok)return ships;
 }
 return SHIPS.map(([name,len],i)=>({name,len,dir:0,x:0,y:i,hits:0}));
}
const shipAt=(ships,x,y)=>ships.find(sh=>cellsOf(sh).some(c=>c[0]===x&&c[1]===y));

function layoutFor(W,H,mode){
 if(mode==='place'){const sz=Math.floor(Math.min(W-34,H-40)/N)*N;return {enemy:{x:Math.round((W-sz)/2)+8,y:22,s:sz,c:sz/N}};}
 if(W>=H*1.2){
  const e=Math.floor(Math.min(H-34,W*.55)/N)*N,o=Math.floor(Math.min(W-e-70,H*.42)/N)*N,ex=26,ey=Math.round((H-e)/2)+8;
  return {enemy:{x:ex,y:ey,s:e,c:e/N},own:{x:ex+e+34,y:ey,s:o,c:o/N},legend:{x:ex+e+34,y:ey+o+22,w:W-(ex+e+34)-10}};
 }
 const o=Math.floor(Math.min(W*.44,H*.25)/N)*N,e=Math.floor(Math.min(W-34,H-o-70)/N)*N,ex=Math.round((W-e)/2)+8,ey=20;
 return {enemy:{x:ex,y:ey,s:e,c:e/N},own:{x:10,y:ey+e+26,s:o,c:o/N},legend:{x:o+22,y:ey+e+26,w:W-o-30}};
}

function drawShip(x,px,py,c,sh,mode){
 // mode: 'own' | 'ghost-ok' | 'ghost-bad' | 'sunk'
 const L=sh.len*c,h=c;x.save();
 if(sh.dir){x.translate(px+c,py);x.rotate(Math.PI/2);}else x.translate(px,py);
 const g=x.createLinearGradient(0,0,0,h);
 const pal=mode==='sunk'?['#7a2b25','#3d0f0c']:mode==='ghost-ok'?['#7be495','#2b9f58']:mode==='ghost-bad'?['#ff8f85','#c0392b']:['#c3ccd6','#6c7a8a'];
 g.addColorStop(0,pal[0]);g.addColorStop(1,pal[1]);
 x.fillStyle=g;x.strokeStyle=mode==='sunk'?'#220806':'#2b3440';x.lineWidth=Math.max(1.5,c*.05);
 x.beginPath();x.moveTo(c*.08,h*.16);x.lineTo(L-h*.45,h*.16);x.quadraticCurveTo(L-h*.06,h*.3,L-h*.02,h*.5);x.quadraticCurveTo(L-h*.06,h*.7,L-h*.45,h*.84);x.lineTo(c*.08,h*.84);x.quadraticCurveTo(c*.0,h*.5,c*.08,h*.16);x.closePath();x.fill();x.stroke();
 // deck details
 x.fillStyle=mode==='sunk'?'#5b1b17':'rgba(40,52,68,.55)';
 const n=sh.len;
 for(let i=0;i<n;i++){const cx=(i+.5)*c;if(i===Math.floor(n/2)){x.fillRect(cx-c*.26,h*.3,c*.52,h*.4);x.fillStyle='rgba(255,255,255,.55)';x.fillRect(cx-c*.12,h*.4,c*.24,h*.2);x.fillStyle=mode==='sunk'?'#5b1b17':'rgba(40,52,68,.55)';}else{x.beginPath();x.arc(cx,h*.5,c*.16,0,Math.PI*2);x.fill();}}
 x.restore();
}
function drawFire(x,px,py,c,t,k=0){
 const cx=px+c/2,cy=py+c/2,f=1+Math.sin(t*14+k)*.1;
 const g=x.createRadialGradient(cx,cy,1,cx,cy,c*.42*f);g.addColorStop(0,'#fff3a0');g.addColorStop(.35,'#ffa51f');g.addColorStop(.75,'#e8381a');g.addColorStop(1,'rgba(120,20,10,0)');
 x.fillStyle=g;x.beginPath();x.arc(cx,cy,c*.42*f,0,Math.PI*2);x.fill();
 x.strokeStyle='#2a0a05';x.lineWidth=Math.max(2,c*.07);x.lineCap='round';x.beginPath();x.moveTo(cx-c*.17,cy-c*.17);x.lineTo(cx+c*.17,cy+c*.17);x.moveTo(cx+c*.17,cy-c*.17);x.lineTo(cx-c*.17,cy+c*.17);x.stroke();
}
function drawMiss(x,px,py,c){x.fillStyle='rgba(255,255,255,.88)';x.beginPath();x.arc(px+c/2,py+c/2,c*.13,0,Math.PI*2);x.fill();x.strokeStyle='rgba(255,255,255,.4)';x.lineWidth=Math.max(1,c*.04);x.beginPath();x.arc(px+c/2,py+c/2,c*.26,0,Math.PI*2);x.stroke();}
function drawGrid(x,r,t,labels){
 const {x:gx,y:gy,s:sz,c}=r;
 const g=x.createLinearGradient(0,gy,0,gy+sz);g.addColorStop(0,'#2a8bc4');g.addColorStop(1,'#14608f');
 x.fillStyle=g;x.beginPath();x.roundRect?x.roundRect(gx-3,gy-3,sz+6,sz+6,8):x.rect(gx-3,gy-3,sz+6,sz+6);x.fill();
 x.save();x.beginPath();x.rect(gx,gy,sz,sz);x.clip();
 x.strokeStyle='rgba(255,255,255,.09)';x.lineWidth=2;
 for(let i=0;i<N*2;i++){const yy=gy+(i+.5)*c/2;x.beginPath();for(let k=0;k<=sz;k+=6){const yv=yy+Math.sin(k*.07+t*1.6+i)*1.8;k?x.lineTo(gx+k,yv):x.moveTo(gx,yv);}x.stroke();}
 x.restore();
 x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=1;
 for(let i=0;i<=N;i++){x.beginPath();x.moveTo(gx+i*c,gy);x.lineTo(gx+i*c,gy+sz);x.moveTo(gx,gy+i*c);x.lineTo(gx+sz,gy+i*c);x.stroke();}
 if(labels){x.fillStyle='rgba(255,255,255,.8)';x.font=`bold ${Math.max(9,Math.min(13,c*.3))}px Arial`;x.textAlign='center';x.textBaseline='middle';for(let i=0;i<N;i++){x.fillText(COLS[i],gx+(i+.5)*c,gy-9);x.fillText(String(i+1),gx-10,gy+(i+.5)*c);}}
}

async function battleship(s){
 extraCSS('bs-css',CSS);
 const ui=new PartyUI(s,{theme:'bs',scroll:false});
 const rand=s.random,names=[pname(s,0),pname(s,1)];
 const fleets=[null,null],shots=[Array.from({length:N},()=>Array(N).fill(0)),Array.from({length:N},()=>Array(N).fill(0))];// shots[p][y][x]: p's shots at the enemy: 1 miss, 2 hit
 const sunk=[0,0],log=[[],[]];
 s.debug={shots,fleets,sunk};
 let view=null;// {cv,x,W,H,mode,P,lay,sel,drag,ships,t,parts,rings,shake}
 let t=0;
 s.hint('Setup: drag your ships to move them and tap a ship to rotate it. Battle: tap a square on the enemy waters, then FIRE. A hit lets you shoot again; a miss passes the phone. Sink the whole fleet to win.');

 function mkView(mode,P){
  const cv=ui.root.querySelector('canvas'),x=cv.getContext('2d');
  const v={cv,x,mode,P,W:0,H:0,sel:null,drag:null,t:0,parts:[],rings:[],shake:0,flash:null,denied:0};
  v.size=()=>{const b=cv.parentElement.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1),w=Math.max(10,Math.floor(b.width)),h=Math.max(10,Math.floor(b.height));
   if(cv.width!==Math.round(w*d)||cv.height!==Math.round(h*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d);}
   x.setTransform(cv.width/w,0,0,cv.height/h,0,0);v.W=w;v.H=h;v.lay=layoutFor(w,h,mode);};
  v.size();return v;
 }
 const pt=(v,ev)=>{const r=v.cv.getBoundingClientRect();return [(ev.clientX-r.left)*(v.W/r.width),(ev.clientY-r.top)*(v.H/r.height)];};
 const cellIn=(r,px,py)=>{const cx=Math.floor((px-r.x)/r.c),cy=Math.floor((py-r.y)/r.c);return cx>=0&&cy>=0&&cx<N&&cy<N?[cx,cy]:null;};
 const boardPx=(r,cx,cy)=>[r.x+(cx+.5)*r.c,r.y+(cy+.5)*r.c];

 function splash(v,r,cx,cy){const [px,py]=boardPx(r,cx,cy);for(let i=0;i<18;i++){const a=-Math.PI/2+(Math.random()-.5)*1.6,sp=60+Math.random()*130;v.parts.push({x:px,y:py,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,g:380,life:.9,max:.9,r:2+Math.random()*3,col:'#e8f7ff'});}
  v.rings.push({x:px,y:py,r:2,max:r.c*.9,life:.9,col:'255,255,255'},{x:px,y:py,r:2,max:r.c*.55,life:.6,col:'200,235,255'});sfx.splash();}
 function boom(v,r,cx,cy,big){const [px,py]=boardPx(r,cx,cy),n=big?46:24;for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,sp=40+Math.random()*(big?260:160);v.parts.push({x:px,y:py,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-30,g:60,life:.7+Math.random()*.6,max:1.3,r:3+Math.random()*(big?7:4),col:['#ffd24d','#ff8a1f','#e8381a','#4a4a4a'][i%4]});}
  v.rings.push({x:px,y:py,r:3,max:r.c*(big?2.4:1.3),life:.5,col:'255,190,80'});v.shake=big?14:7;sfx.boom();}

 function render(dt){
  const v=view;if(!v||!v.cv.isConnected)return;
  v.t+=dt;t+=dt;v.size();const {x,W,H,lay}=v;
  x.clearRect(0,0,W,H);
  const sx=v.shake>0?(Math.random()-.5)*v.shake:0,sy=v.shake>0?(Math.random()-.5)*v.shake:0;v.shake=Math.max(0,v.shake-dt*40);
  x.save();x.translate(sx,sy);
  const P=v.P;
  if(v.mode==='place'){
   const r=lay.enemy;drawGrid(x,r,v.t,true);
   for(const sh of v.ships){if(v.drag&&v.drag.ship===sh)continue;drawShip(x,r.x+sh.x*r.c,r.y+sh.y*r.c,r.c,sh,'own');}
   if(v.drag&&v.drag.moved){const g=v.drag.cand;drawShip(x,r.x+g.x*r.c,r.y+g.y*r.c,r.c,g,v.drag.ok?'ghost-ok':'ghost-bad');}
   else if(v.drag){const sh=v.drag.ship;drawShip(x,r.x+sh.x*r.c,r.y+sh.y*r.c,r.c,sh,'ghost-ok');}
   if(v.denied>0){v.denied-=dt;x.fillStyle=`rgba(255,80,60,${Math.min(.5,v.denied)})`;x.fillRect(r.x,r.y,r.s,r.s);}
  }else{
   const e=lay.enemy,me=fleets[P],en=fleets[1-P],my=shots[P],their=shots[1-P];
   drawGrid(x,e,v.t,true);
   // sunk enemy ships are revealed
   for(const sh of en)if(sh.hits>=sh.len)drawShip(x,e.x+sh.x*e.c,e.y+sh.y*e.c,e.c,sh,'sunk');
   for(let yy=0;yy<N;yy++)for(let xx=0;xx<N;xx++){const m=my[yy][xx];if(m===1)drawMiss(x,e.x+xx*e.c,e.y+yy*e.c,e.c);else if(m===2)drawFire(x,e.x+xx*e.c,e.y+yy*e.c,e.c,v.t,xx+yy);}
   if(v.sel){const [cx,cy]=v.sel,px=e.x+cx*e.c,py=e.y+cy*e.c,pulse=1+Math.sin(v.t*8)*.08;x.save();x.translate(px+e.c/2,py+e.c/2);x.scale(pulse,pulse);x.strokeStyle='#ffe14d';x.lineWidth=Math.max(2,e.c*.07);x.beginPath();x.arc(0,0,e.c*.36,0,Math.PI*2);x.stroke();x.beginPath();x.moveTo(-e.c*.48,0);x.lineTo(-e.c*.18,0);x.moveTo(e.c*.18,0);x.lineTo(e.c*.48,0);x.moveTo(0,-e.c*.48);x.lineTo(0,-e.c*.18);x.moveTo(0,e.c*.18);x.lineTo(0,e.c*.48);x.stroke();x.restore();}
   x.fillStyle='rgba(255,255,255,.9)';x.font='bold 11px Arial';x.textAlign='left';x.textBaseline='alphabetic';
   if(lay.own){
    const o=lay.own;drawGrid(x,o,v.t,false);
    for(const sh of me)drawShip(x,o.x+sh.x*o.c,o.y+sh.y*o.c,o.c,sh,'own');
    for(let yy=0;yy<N;yy++)for(let xx=0;xx<N;xx++){const m=their[yy][xx];if(m===1)drawMiss(x,o.x+xx*o.c,o.y+yy*o.c,o.c);else if(m===2)drawFire(x,o.x+xx*o.c,o.y+yy*o.c,o.c,v.t,xx*3+yy);}
    x.fillStyle='#fff';x.font='bold 11px Arial';x.textAlign='left';x.fillText('YOUR FLEET',o.x,o.y-7);
    const L=lay.legend;let ly=L.y;x.font='bold 10px Arial';
    const row=(label,ships,col)=>{x.fillStyle='#bfe3ff';x.textAlign='left';x.fillText(label,L.x,ly);ly+=5;let lx=L.x;for(const sh of ships){const w=sh.len*9;const dead=sh.hits>=sh.len;x.fillStyle=dead?'#ff5a3c':col;x.fillRect(lx,ly,w,8);if(dead){x.strokeStyle='#fff';x.lineWidth=1.5;x.beginPath();x.moveTo(lx,ly+8);x.lineTo(lx+w,ly);x.stroke();}lx+=w+5;}ly+=22;};
    row('YOUR SHIPS AFLOAT',me,'#9fd0ff');row('ENEMY SHIPS AFLOAT',en,'#ffd27a');
   }
   x.fillStyle='#fff';x.font='bold 11px Arial';x.textAlign='left';x.fillText('ENEMY WATERS',e.x,e.y-17>8?e.y-17:e.y-4);
  }
  // particles
  for(const p of v.parts){p.life-=dt;p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;x.globalAlpha=Math.max(0,p.life/p.max);x.fillStyle=p.col;x.beginPath();x.arc(p.x,p.y,p.r,0,Math.PI*2);x.fill();}
  x.globalAlpha=1;v.parts=v.parts.filter(p=>p.life>0);
  for(const r of v.rings){r.life-=dt;const k=1-Math.max(0,r.life)/(r.max/(r.max)*.9);r.r+=(r.max-r.r)*Math.min(1,dt*5);x.strokeStyle=`rgba(${r.col},${Math.max(0,r.life)})`;x.lineWidth=2.5;x.beginPath();x.arc(r.x,r.y,r.r,0,Math.PI*2);x.stroke();}
  v.rings=v.rings.filter(r=>r.life>0);
  x.restore();
 }
 s.frame(render);

 const screen=(status,btns,P)=>{ui.set(`<div class="bs-wrap"><div class="bs-status" data-status>${status}</div><div class="bs-cv"><canvas></canvas></div><div class="bs-btns">${btns}</div></div>`);view=null;};
 const setStatus=h=>{const el=ui.root.querySelector('[data-status]');if(el)el.innerHTML=h;};
 const blank=()=>{view=null;ui.set(`<div class="pk-screen"><div class="pk-q" style="font-size:54px">⚓</div><div class="pk-sub">Pass the phone…</div></div>`);};

 function place(P){
  return new Promise(resolve=>{
   screen(`<span><b>${esc(names[P])}</b>: drag ships to move them, tap a ship to rotate.</span>`,`<button class="pk-btn alt" data-act="shuf">🔀 Shuffle</button><button class="pk-btn good" data-act="ready">Ready ✓</button>`,P);
   const v=mkView('place',P);view=v;v.ships=randomFleet(rand);
   const down=ev=>{ev.preventDefault?.();const [px,py]=pt(v,ev),r=v.lay.enemy,c=cellIn(r,px,py);if(!c)return;const sh=shipAt(v.ships,c[0],c[1]);if(!sh)return;
    const idx=sh.dir?c[1]-sh.y:c[0]-sh.x;v.drag={ship:sh,idx,id:ev.pointerId,sx:px,sy:py,moved:false,cand:{...sh},ok:true};if(ev.pointerId>=0)try{v.cv.setPointerCapture(ev.pointerId);}catch{}};
   const move=ev=>{const d=v.drag;if(!d||ev.pointerId!==d.id)return;ev.preventDefault?.();const [px,py]=pt(v,ev);if(!d.moved&&Math.hypot(px-d.sx,py-d.sy)<7)return;d.moved=true;
    const r=v.lay.enemy,cx=Math.floor((px-r.x)/r.c),cy=Math.floor((py-r.y)/r.c),sh=d.ship;let nx=sh.dir?cx:cx-d.idx,ny=sh.dir?cy-d.idx:cy;
    nx=Math.max(0,Math.min(N-(sh.dir?1:sh.len),nx));ny=Math.max(0,Math.min(N-(sh.dir?sh.len:1),ny));d.cand={...sh,x:nx,y:ny};d.ok=fits(v.ships,d.cand,sh);};
   const up=ev=>{const d=v.drag;if(!d||ev.pointerId!==d.id)return;v.drag=null;const sh=d.ship;
    if(d.moved){if(d.ok){sh.x=d.cand.x;sh.y=d.cand.y;sfx.pick();}else{sfx.bad();v.denied=.35;}}
    else{const nd={...sh,dir:1-sh.dir};nd.x=Math.max(0,Math.min(N-(nd.dir?1:nd.len),nd.x));nd.y=Math.max(0,Math.min(N-(nd.dir?nd.len:1),nd.y));
     if(fits(v.ships,nd,sh)){sh.dir=nd.dir;sh.x=nd.x;sh.y=nd.y;sfx.tap();}else{sfx.bad();v.denied=.35;}}};
   s.on(v.cv,'pointerdown',down);s.on(v.cv,'pointermove',move);s.on(v.cv,'pointerup',up);s.on(v.cv,'pointercancel',ev=>{if(v.drag&&ev.pointerId===v.drag.id)v.drag=null;});
   ui.handler=a=>{if(a==='shuf'){v.ships=randomFleet(rand);sfx.whoosh();}else if(a==='ready'){ui.handler=null;sfx.ok();resolve(v.ships);}};
   s.debug.placeView=v;
  });
 }

 // One shooting screen: returns {hit,sunkShip,all,cell}
 function shoot(P,note){
  return new Promise(resolve=>{
   screen(note,`<button class="pk-btn off" data-act="fire">FIRE! 💥</button>`,P);
   const v=mkView('fire',P);view=v;const en=fleets[1-P];
   const fire=()=>{
    if(!v.sel)return;const [cx,cy]=v.sel;if(shots[P][cy][cx])return;
    ui.handler=null;v.sel=null;const r=v.lay.enemy,sh=shipAt(en,cx,cy),lbl=COLS[cx]+(cy+1);
    ui.root.querySelector('[data-act=fire]').classList.add('off');
    let res={cell:lbl,hit:!!sh,sunk:null,all:false};
    if(!sh){shots[P][cy][cx]=1;splash(v,r,cx,cy);setStatus(`💦 Splash! <b>${lbl}</b> is open water.`);}
    else{shots[P][cy][cx]=2;sh.hits++;
     if(sh.hits>=sh.len){res.sunk=sh;sunk[P]++;boom(v,r,cx,cy,true);setStatus(`🔥 <b>${esc(names[P])} sank the ${sh.name.toUpperCase()}!</b>`);banner(ui.root,'SUNK!','#ffd24d');sfx.cheer();s.react(P,'happy');s.react(1-P,'sad');}
     else{boom(v,r,cx,cy,false);setStatus(`💥 <b>HIT at ${lbl}!</b> Fire again!`);s.react(P,'happy');}
     s.setScores([...sunk]);
     res.all=en.every(q=>q.hits>=q.len);}
    log[P].push(res.sunk?`${lbl} (sunk your ${res.sunk.name}!)`:res.hit?`${lbl} (hit)`:`${lbl} (miss)`);
    resolve(res);
   };
   const tap=ev=>{ev.preventDefault?.();const [px,py]=pt(v,ev),c=cellIn(v.lay.enemy,px,py);if(!c||!view||view!==v||!ui.handler)return;if(shots[P][c[1]][c[0]]){sfx.bad();return;}
    if(v.sel&&v.sel[0]===c[0]&&v.sel[1]===c[1]){fire();return;}
    v.sel=c;sfx.tap();setStatus(`Aiming at <b>${COLS[c[0]]}${c[1]+1}</b>. Tap FIRE!`);ui.root.querySelector('[data-act=fire]').classList.remove('off');};
   s.on(v.cv,'pointerdown',tap);
   ui.handler=a=>{if(a==='fire')fire();};
   s.debug.fireView=v;s.debug.fire=(cx,cy)=>{v.sel=[cx,cy];fire();};s.debug.P=P;
  });
 }

 if(!await titleCard(s,'🚢','Secretly place your fleet, then take turns firing at the enemy waters. A hit earns another shot, a miss passes the phone. Sink every enemy ship to win.','Man the decks'))return;
 for(const P of [0,1]){
  blank();
  if(!await s.pass(P,`Place your fleet in secret. ${names[1-P]}, look away!`,'Show my ocean'))return;
  fleets[P]=await place(P);if(!s.alive)return;
 }
 s.setScores([0,0]);
 let P=0,winner=-1,last=null,shotsFired=[0,0];
 while(winner<0){
  const incoming=log[1-P].length?`Since your last turn, ${names[1-P]} fired: ${log[1-P].join(', ')}.`:'No shots at you yet.';
  log[1-P]=[];
  blank();
  if(!await s.pass(P,`The seas are fogged. Eyes only for ${names[P]}!`,'Open fire',{summary:incoming}))return;
  let note=`<b>${esc(names[P])}</b>: tap a square in the enemy waters.`;
  for(;;){
   const res=await shoot(P,note);if(!s.alive)return;shotsFired[P]++;
   if(!await s.wait(res.sunk?1700:1100))return;
   if(res.all){winner=P;break;}
   if(res.hit){note=`${res.sunk?'Ship down!':'Direct hit!'} <b>${esc(names[P])}</b>, fire again.`;continue;}
   break;
  }
  if(winner>=0)break;
  P=1-P;
 }
 // Final scores: ships sunk, plus the winner's survivors and a victory bonus so the winner always leads.
 const survivors=fleets[winner].filter(q=>q.hits<q.len).length;
 const final=[...sunk];final[winner]=sunk[winner]+survivors+1;
 s.setScores([...final]);
 s.shared=true;s.updateScores();
 view=null;
 ui.set(`<div class="pk-screen"><div class="pk-over">Battleship · victory</div><div class="pk-row">${head(s,winner,'win','xl')}${head(s,1-winner,'sad','lg')}</div>
  <h1 class="pk-h1 pk-pop">${esc(names[winner])} wins the war!</h1>
  <div class="pk-sub">${esc(names[winner])} sank all ${SHIPS.length} ships with ${survivors} still afloat. ${esc(names[1-winner])} sank ${sunk[1-winner]}.</div>
  <button class="pk-btn" data-act="go">Finish</button></div>`);
 sfx.big();burst(ui.root,{emojis:['⚓','💥','🌊'],n:30,spread:250});
 await new Promise(res=>{ui.handler=a=>{if(a==='go')res(1);};});if(!s.alive)return;
 s.finish(final,`${names[winner]} sank the whole enemy fleet (${shotsFired[winner]} salvos) and kept ${survivors} ship${survivors===1?'':'s'}.`);
}

Object.assign(exports,{battleship,randomFleet,fits,cellsOf});
