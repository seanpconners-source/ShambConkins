// The Legend of Zelda · Hyrule Field, one shared top-down screen in the style of the 1986 overworld.
// Both Links (your head on a green / red tunic) roam the same seeded screen with Octoroks and Tektites.
//  'rupees': Rupee Rush. Cut bushes, beat monsters and grab rupees (green 1, blue 5, red 20). Slashing your rival
//            knocks rupees out of their wallet. Most rupees after 60 seconds wins.
//  'duel':   Sword Duel. Three hearts each; a sword hit costs a heart, monsters cost half. Hearts hide in bushes.
//            Last Link standing, or the most hearts after 60 seconds.
const {clamp}=require("src/utils.js");
const {Fx,arenaKeys,arenaTouch,snd,noise,jingle,outlined,rr,FONT,PCOL,settle,Countdown,heart}=require("src/engines/arenaKit.js");

const FLOOR='#fcd8a8',TREE='#00a844',TREE_D='#005a24',ROCK='#c84c0c',ROCK_D='#7a2a00',BUSH='#58d854',WATER='#2a6af0';
const TIME=60,DIRS={u:[0,-1],d:[0,1],l:[-1,0],r:[1,0]};

function buildMap(rand,cols,rows){
 for(let attempt=0;attempt<40;attempt++){
  const g=Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>x===0||y===0||x===cols-1||y===rows-1?'tree':'floor'));
  const sp=[[2,Math.floor(rows/2)],[cols-3,Math.floor(rows/2)]];if(rows>cols){sp[0]=[Math.floor(cols/2),2];sp[1]=[Math.floor(cols/2),rows-3];}
  const near=(x,y)=>sp.some(([a,b])=>Math.abs(a-x)<=1&&Math.abs(b-y)<=1);
  // clusters of rocks/trees, mirrored for fairness
  for(let k=0;k<7;k++){const x0=1+Math.floor(rand()*(cols-2)),y0=1+Math.floor(rand()*(rows-2)),kind=rand()<.5?'rock':'tree',w=1+Math.floor(rand()*2),h=1+Math.floor(rand()*2);
   for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const mx=cols-1-x,my=rows-1-y;for(const [a,b] of [[x,y],[mx,my]])if(a>0&&b>0&&a<cols-1&&b<rows-1&&!near(a,b))g[b][a]=kind;}}
  // a pond in the middle
  const cx=Math.floor(cols/2),cy=Math.floor(rows/2);if(rand()<.7)for(const [a,b] of [[cx,cy],[cx-1,cy],[cx,cy-1],[cx-1,cy-1]])if(!near(a,b))g[b][a]='water';
  // bushes
  let n=0;for(let k=0;k<200&&n<22;k++){const x=1+Math.floor(rand()*(cols-2)),y=1+Math.floor(rand()*(rows-2));if(g[y][x]==='floor'&&!near(x,y)){g[y][x]='bush';const mx=cols-1-x,my=rows-1-y;if(g[my][mx]==='floor'&&!near(mx,my))g[my][mx]='bush';n+=2;}}
  // every floor tile reachable from spawn 0 (bushes count as passable: they can be cut)
  const seen=new Set([sp[0].join()]),q=[sp[0]];while(q.length){const [x,y]=q.pop();for(const [dx,dy] of Object.values(DIRS)){const a=x+dx,b=y+dy;if(seen.has(a+','+b)||!['floor','bush'].includes(g[b]?.[a]))continue;seen.add(a+','+b);q.push([a,b]);}}
  let ok=true;for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(['floor','bush'].includes(g[y][x])&&!seen.has(x+','+y))ok=false;
  if(ok)return {g,sp};
 }
 const g=Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>x===0||y===0||x===cols-1||y===rows-1?'tree':'floor'));return {g,sp:[[2,Math.floor(rows/2)],[cols-3,Math.floor(rows/2)]]};
}

async function hyrule(s){
 const mode=s.game.hyruleMode==='duel'?'duel':'rupees';
 const [c,x]=s.canvas(900,620,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 if(!await settle(s))return;
 const portrait=s.H>s.W*1.05,cols=portrait?11:16,rows=portrait?16:11;
 const {g,sp}=buildMap(s.random,cols,rows),bushT=new Map(),drops=[],shots=[],fx=new Fx();let dropSeq=0;
 const solid=(tx,ty)=>{const v=g[ty]?.[tx];return v===undefined||v==='tree'||v==='rock'||v==='water'||v==='bush';};
 const L=[0,1].map(i=>({i,x:sp[i][0]+.5,y:sp[i][1]+.5,dir:i?(portrait?'u':'l'):(portrait?'d':'r'),slash:0,cd:0,hearts:6,rupees:0,inv:0,kx:0,ky:0,walk:0,down:0}));
 const enemies=[];const spawnEnemy=(kind)=>{for(let k=0;k<50;k++){const tx=1+Math.floor(s.random()*(cols-2)),ty=1+Math.floor(s.random()*(rows-2));if(g[ty][tx]!=='floor'||L.some(l=>Math.hypot(l.x-tx-.5,l.y-ty-.5)<4))continue;enemies.push({kind,x:tx+.5,y:ty+.5,dir:['u','d','l','r'][Math.floor(s.random()*4)],t:0,fire:1.5+s.random()*2,hp:1,hop:0,vx:0,vy:0,dead:0});return;}};
 for(let k=0;k<(mode==='duel'?2:3);k++)spawnEnemy('octorok');for(let k=0;k<(mode==='duel'?1:2);k++)spawnEnemy('tektite');
 const kb=arenaKeys(s),sticks=[null,null],cd=new Countdown(3);let phase='count',t=0,clock=0,endT=0,endText='',respawnQ=[];
 const zoneOf=p=>portrait?(p.y<s.H/2?0:1):(p.x<s.W/2?0:1);
 const slash=i=>{const l=L[i];if(phase!=='play'||l.cd>0||l.down>0)return;l.slash=.24;l.cd=.36;snd(900,.06,{type:'sawtooth',vol:.03,to:300});noise(.06,{vol:.03,freq:3000});};
 arenaTouch(s,{owner:zoneOf,maxFingers:2,onDown:f=>{if(!sticks[f.owner])sticks[f.owner]=f;else slash(f.owner);},onUp:f=>{if(sticks[f.owner]===f){sticks[f.owner]=null;if(f.moved<12&&f.held<220)slash(f.owner);}}});
 kb.onDown((i,k)=>{if(k==='fire')slash(i);});
 s.hint(mode==='rupees'?'Rupee Rush: drag on your half to walk (P1 top or left, P2 bottom or right); tap to swing your sword (a second finger works too). Cut bushes, beat Octoroks and Tektites, grab rupees: green 1, blue 5, red 20. Slash your rival to knock rupees out of their wallet. Face a rock to block it with your shield. Most rupees after 60 seconds. P1 WASD + Space, P2 arrows + Enter.':'Sword Duel: drag on your half to walk, tap to swing. Three hearts each: a sword hit costs a full heart, monsters half. Cut bushes for hearts. Face incoming rocks to block them with your shield. Last Link standing, or the most hearts after 60 seconds. P1 WASD + Space, P2 arrows + Enter.');
 const tile=()=>{const T=Math.floor(Math.min(s.W/cols,(s.H*.9)/rows));return {T,ox:(s.W-T*cols)/2,oy:s.H*.1+(s.H*.9-T*rows)/2};};
 const drop=(px,py,from='bush')=>{const r=((dropSeq++*0.6180339)%1+Math.sin(dropSeq*12.9898)*.5+.5)%1;let kind=null;
  if(mode==='duel'){kind=r<.32?'heart':null;}else kind=r<.04?'red':r<.22?'blue':r<.78?'green':r<.86?'heart':null;
  if(kind)drops.push({kind,x:px,y:py,t:0});};
 const hurt=(l,amt,fromX,fromY,byRival=false)=>{if(l.inv>0||l.down>0)return;l.hearts=Math.max(0,l.hearts-amt);l.inv=1;const d=Math.hypot(l.x-fromX,l.y-fromY)||1;l.kx=(l.x-fromX)/d*9;l.ky=(l.y-fromY)/d*9;snd(200,.2,{type:'square',vol:.04,to:80});s.react(l.i,'sad');
  if(mode==='rupees'&&byRival&&l.rupees>0){const n=Math.min(l.rupees,5);l.rupees-=n;for(let k=0;k<n;k++)drops.push({kind:'green',x:l.x+(Math.random()-.5)*1.4,y:l.y+(Math.random()-.5)*1.4,t:0});}
  if(l.hearts<=0){if(mode==='duel'){phase='end';endT=0;endText=`${s.players[1-l.i].name.toUpperCase()} WINS THE DUEL!`;jingle([523,659,784,1047,1319],{step:.1,type:'square',vol:.04});}
   else{l.down=2;const lost=Math.floor(l.rupees/4);l.rupees-=lost;for(let k=0;k<Math.min(lost,8);k++)drops.push({kind:'green',x:l.x+(Math.random()-.5)*2,y:l.y+(Math.random()-.5)*2,t:0});}}};
 const move=(o,dx,dy,r=.34)=>{const nx=o.x+dx;if(!solid(Math.floor(nx-r),Math.floor(o.y-r))&&!solid(Math.floor(nx+r),Math.floor(o.y-r))&&!solid(Math.floor(nx-r),Math.floor(o.y+r))&&!solid(Math.floor(nx+r),Math.floor(o.y+r)))o.x=nx;
  const ny=o.y+dy;if(!solid(Math.floor(o.x-r),Math.floor(ny-r))&&!solid(Math.floor(o.x+r),Math.floor(ny-r))&&!solid(Math.floor(o.x-r),Math.floor(ny+r))&&!solid(Math.floor(o.x+r),Math.floor(ny+r)))o.y=ny;};
 const swordBox=l=>{const [dx,dy]=DIRS[l.dir];return {x:l.x+dx*.85,y:l.y+dy*.85,r:.5};};
 s.debug={L,enemies,drops,g,get phase(){return phase;},slash,setClock(v){clock=v;}};
 let curT=tile().T;
 s.frame(dt=>{t+=dt;fx.update(dt);dt=Math.min(dt,.04);curT=tile().T;
  if(phase==='count'){if(!cd.update(dt))phase='play';}
  else if(phase==='play'){clock+=dt;
   for(const l of L){l.cd=Math.max(0,l.cd-dt);l.inv=Math.max(0,l.inv-dt);if(l.down>0){l.down-=dt;if(l.down<=0){l.hearts=6;l.x=sp[l.i][0]+.5;l.y=sp[l.i][1]+.5;l.inv=1.5;}continue;}
    if(Math.abs(l.kx)+Math.abs(l.ky)>.1){move(l,l.kx*dt,l.ky*dt);l.kx*=Math.pow(.002,dt);l.ky*=Math.pow(.002,dt);}
    let mx=0,my=0;const k=kb.state[l.i],st=sticks[l.i];if(k.l)mx--;if(k.r)mx++;if(k.u)my--;if(k.d)my++;
    if(st){const dx=st.x-st.sx,dy=st.y-st.sy;if(Math.hypot(dx,dy)>10){if(Math.abs(dx)>Math.abs(dy))mx=Math.sign(dx);else my=Math.sign(dy);}}
    if(mx&&my){if(Math.abs(mx)>=Math.abs(my))my=0;else mx=0;}
    if((mx||my)&&l.slash<=0){l.dir=mx<0?'l':mx>0?'r':my<0?'u':'d';move(l,mx*4.6*dt,my*4.6*dt);l.walk+=dt*8;}
    if(l.slash>0){l.slash-=dt;const sb=swordBox(l);
     const tx=Math.floor(sb.x),ty=Math.floor(sb.y);if(g[ty]?.[tx]==='bush'){g[ty][tx]='cut';bushT.set(tx+','+ty,12);fx.burst((tx+.5)*curT,(ty+.5)*curT,{n:10,color:BUSH,speed:3*curT,life:.4,size:.12*curT,drag:3});noise(.1,{vol:.04,freq:2400});drop(tx+.5,ty+.5);}
     for(const e of enemies)if(!e.dead&&Math.hypot(e.x-sb.x,e.y-sb.y)<.75){e.dead=.4;snd(300,.15,{type:'square',vol:.04,to:900});fx.burst(e.x*curT,e.y*curT,{n:12,colors:['#fff','#ffd21c','#ff7a2a'],speed:4*curT,life:.35,size:.1*curT,drag:3});drop(e.x,e.y,'enemy');respawnQ.push(4);}
     const o=L[1-l.i];if(o.down<=0&&Math.hypot(o.x-sb.x,o.y-sb.y)<.8&&o.inv<=0){hurt(o,mode==='duel'?2:1,l.x,l.y,true);fx.burst(o.x*curT,o.y*curT,{n:10,color:'#fff',speed:4*curT,life:.3,size:.1*curT,drag:3});}}}
   // bushes regrow
   for(const [key,v] of bushT){const nv=v-dt;if(nv<=0){const [tx,ty]=key.split(',').map(Number);if(!L.some(l=>Math.floor(l.x)===tx&&Math.floor(l.y)===ty)){g[ty][tx]='bush';bushT.delete(key);}}else bushT.set(key,nv);}
   for(let k=respawnQ.length-1;k>=0;k--){respawnQ[k]-=dt;if(respawnQ[k]<=0){respawnQ.splice(k,1);spawnEnemy(s.random()<.6?'octorok':'tektite');}}
   // enemies
   for(let k=enemies.length-1;k>=0;k--){const e=enemies[k];if(e.dead){e.dead-=dt;if(e.dead<=0)enemies.splice(k,1);continue;}e.t+=dt;
    if(e.kind==='octorok'){const [dx,dy]=DIRS[e.dir],ox=e.x,oy=e.y;move(e,dx*1.8*dt,dy*1.8*dt,.38);if((ox===e.x&&oy===e.y)||s.random()<dt*.5)e.dir=['u','d','l','r'][Math.floor(s.random()*4)];
     e.fire-=dt;if(e.fire<=0){e.fire=2+s.random()*2;shots.push({x:e.x+dx*.5,y:e.y+dy*.5,dx,dy,t:0});snd(500,.06,{type:'square',vol:.025});}}
    else{e.hop-=dt;if(e.hop<=0){e.hop=.9+s.random()*.8;const a=s.random()*Math.PI*2;e.vx=Math.cos(a)*3.2;e.vy=Math.sin(a)*3.2;e.air=.45;}if(e.air>0){e.air-=dt;move(e,e.vx*dt,e.vy*dt,.3);}}
    for(const l of L)if(l.down<=0&&Math.hypot(l.x-e.x,l.y-e.y)<.7)hurt(l,1,e.x,e.y);}
   for(let k=shots.length-1;k>=0;k--){const sh=shots[k];sh.t+=dt;sh.x+=sh.dx*7*dt;sh.y+=sh.dy*7*dt;let gone=solid(Math.floor(sh.x),Math.floor(sh.y))||sh.t>3;
    for(const l of L)if(!gone&&l.down<=0&&Math.hypot(l.x-sh.x,l.y-sh.y)<.5){const [fx0,fy0]=DIRS[l.dir];if(fx0===-sh.dx&&fy0===-sh.dy&&l.slash<=0){snd(1400,.05,{type:'square',vol:.03});fx.burst(sh.x*curT,sh.y*curT,{n:6,color:'#fff',speed:3*curT,life:.2,size:.08*curT,drag:3});}else hurt(l,1,sh.x-sh.dx,sh.y-sh.dy);gone=true;}
    if(gone)shots.splice(k,1);}
   // pickups
   for(let k=drops.length-1;k>=0;k--){const d=drops[k];d.t+=dt;if(d.t>9){drops.splice(k,1);continue;}for(const l of L)if(l.down<=0&&d.t>.3&&Math.hypot(l.x-d.x,l.y-d.y)<.6){drops.splice(k,1);
     if(d.kind==='heart'){l.hearts=Math.min(6,l.hearts+2);jingle([1047,1319],{step:.05,type:'square',vol:.03});}else{const v=d.kind==='red'?20:d.kind==='blue'?5:1;l.rupees+=v;snd(v>1?1568:1319,.06,{type:'square',vol:.03});snd(v>1?2093:1760,.1,{type:'square',vol:.03,delay:.05});fx.pop(d.x*curT,(d.y-.4)*curT,`+${v}`,{color:'#fff',stroke:'#000',size:Math.max(12,.45*curT),rise:.8*curT});}break;}}
   if(phase==='play'&&clock>=TIME){phase='end';endT=0;if(mode==='rupees'){const [a,b]=L.map(l=>l.rupees);endText=a===b?'A TIE IN RUPEES':`${s.players[a>b?0:1].name.toUpperCase()} IS RICHEST IN HYRULE`;}else{const [a,b]=L.map(l=>l.hearts);endText=a===b?'THE DUEL IS A DRAW':`${s.players[a>b?0:1].name.toUpperCase()} WINS THE DUEL!`;}jingle([523,659,784,1047,1319],{step:.1,type:'square',vol:.04});}}
  else{endT+=dt;if(endT>2.8){const sc=mode==='rupees'?L.map(l=>l.rupees):L.map(l=>Math.ceil(l.hearts/2));s.finish(sc,mode==='rupees'?`Rupee Rush: ${s.players[0].name} ${sc[0]} rupees, ${s.players[1].name} ${sc[1]}.`:`Sword Duel: ${s.players[0].name} ${L[0].hearts/2} hearts left, ${s.players[1].name} ${L[1].hearts/2}.`);return;}}
  s.setScores(mode==='rupees'?L.map(l=>l.rupees):L.map(l=>Math.ceil(l.hearts/2)));
  // ------------- draw
  const {T,ox,oy}=tile();x.fillStyle='#000';x.fillRect(0,0,s.W,s.H);x.save();fx.begin(x);x.translate(ox,oy);
  x.fillStyle=FLOOR;x.fillRect(0,0,T*cols,T*rows);x.fillStyle='rgba(200,120,60,.18)';for(let y=0;y<rows;y++)for(let xx=0;xx<cols;xx++)if((xx*7+y*13)%5===0)x.fillRect(xx*T+T*.3,y*T+T*.6,T*.1,T*.1);
  for(let y=0;y<rows;y++)for(let xx=0;xx<cols;xx++){const v=g[y][xx],px=xx*T,py=y*T;
   if(v==='tree'){x.fillStyle=TREE_D;rr(x,px+1,py+1,T-2,T-2,T*.35);x.fill();x.fillStyle=TREE;x.beginPath();x.arc(px+T*.5,py+T*.42,T*.4,0,7);x.fill();x.fillStyle=TREE_D;x.fillRect(px+T*.3,py+T*.55,T*.4,T*.3);x.fillStyle='#000';x.fillRect(px+T*.36,py+T*.62,T*.08,T*.08);x.fillRect(px+T*.56,py+T*.62,T*.08,T*.08);}
   else if(v==='rock'){x.fillStyle=ROCK;rr(x,px+1,py+2,T-2,T-3,T*.3);x.fill();x.fillStyle=ROCK_D;x.fillRect(px+T*.2,py+T*.55,T*.6,T*.1);x.fillStyle='#ffb070';x.fillRect(px+T*.25,py+T*.2,T*.25,T*.1);}
   else if(v==='water'){x.fillStyle=WATER;x.fillRect(px,py,T,T);x.strokeStyle='rgba(255,255,255,.6)';x.lineWidth=2;x.beginPath();const w=Math.sin(t*3+xx+y)*T*.06;x.moveTo(px+T*.2,py+T*.4+w);x.lineTo(px+T*.45,py+T*.35+w);x.moveTo(px+T*.5,py+T*.7-w);x.lineTo(px+T*.78,py+T*.65-w);x.stroke();}
   else if(v==='bush'){x.fillStyle='#0a7a2a';x.beginPath();x.arc(px+T*.5,py+T*.55,T*.42,0,7);x.fill();x.fillStyle=BUSH;x.beginPath();x.arc(px+T*.38,py+T*.45,T*.24,0,7);x.arc(px+T*.62,py+T*.45,T*.24,0,7);x.arc(px+T*.5,py+T*.62,T*.26,0,7);x.fill();}
   else if(v==='cut'){x.fillStyle='rgba(10,122,42,.35)';x.fillRect(px+T*.3,py+T*.6,T*.4,T*.15);}}
  for(const d of drops){if(d.t>7&&Math.floor(d.t*10)%2)continue;const px=d.x*T,py=d.y*T-Math.abs(Math.sin(d.t*6))*T*.08;if(d.kind==='heart')heart(x,px,py,T*.55,'#e8282c','#fff');else{x.fillStyle=d.kind==='red'?'#e8282c':d.kind==='blue'?'#2a6af0':'#2fbf3a';x.beginPath();x.moveTo(px,py-T*.3);x.lineTo(px+T*.16,py-T*.12);x.lineTo(px+T*.16,py+T*.12);x.lineTo(px,py+T*.3);x.lineTo(px-T*.16,py+T*.12);x.lineTo(px-T*.16,py-T*.12);x.closePath();x.fill();x.strokeStyle='#fff';x.lineWidth=1.5;x.stroke();}}
  for(const e of enemies){const px=e.x*T,py=e.y*T;x.save();x.globalAlpha=e.dead?Math.max(0,e.dead/.4):1;
   if(e.kind==='octorok'){x.fillStyle='#e8282c';x.beginPath();x.arc(px,py,T*.36,0,7);x.fill();const [dx,dy]=DIRS[e.dir];x.fillStyle='#ffb070';x.beginPath();x.arc(px+dx*T*.32,py+dy*T*.32,T*.13,0,7);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(px-T*.12+dx*T*.12,py-T*.08+dy*T*.12,T*.08,0,7);x.arc(px+T*.12+dx*T*.12,py-T*.08+dy*T*.12,T*.08,0,7);x.fill();x.strokeStyle='#a01010';x.lineWidth=T*.07;for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4+Math.sin(t*10+k)*.2;x.beginPath();x.moveTo(px+Math.cos(a)*T*.3,py+Math.sin(a)*T*.3);x.lineTo(px+Math.cos(a)*T*.48,py+Math.sin(a)*T*.48);x.stroke();}}
   else{const lift=e.air>0?Math.sin((1-e.air/.45)*Math.PI)*T*.35:0;x.fillStyle='rgba(0,0,0,.2)';x.beginPath();x.ellipse(px,py+T*.25,T*.28,T*.08,0,0,7);x.fill();x.fillStyle='#2a6af0';x.beginPath();x.arc(px,py-lift,T*.28,0,7);x.fill();x.strokeStyle='#123a9a';x.lineWidth=T*.06;for(const sd of [-1,1]){x.beginPath();x.moveTo(px+sd*T*.2,py-lift);x.lineTo(px+sd*T*.42,py-lift+T*.25);x.stroke();}x.fillStyle='#fff';x.beginPath();x.arc(px,py-lift-T*.04,T*.1,0,7);x.fill();x.fillStyle='#000';x.beginPath();x.arc(px,py-lift-T*.04,T*.05,0,7);x.fill();}
   x.restore();}
  for(const sh of shots){x.fillStyle='#8a5a2a';x.beginPath();x.arc(sh.x*T,sh.y*T,T*.14,0,7);x.fill();x.fillStyle='#c89a6a';x.beginPath();x.arc(sh.x*T-T*.04,sh.y*T-T*.04,T*.05,0,7);x.fill();}
  for(const l of [...L].sort((a,b)=>a.y-b.y))drawLink(l,T);
  fx.draw(x);fx.end(x);x.restore();
  // HUD
  const hy=Math.max(8,oy-Math.min(T,s.H*.09));for(let i=0;i<2;i++){const l=L[i],hx=i?s.W-10:10,al=i?'right':'left',sz=Math.min(T*.55,22);
   outlined(x,s.players[i].name.toUpperCase(),hx,hy+sz*.5,{size:sz*.8,fill:PCOL[i],stroke:'#000',align:al});
   for(let k=0;k<3;k++){const v=clamp(l.hearts-k*2,0,2),cx=i?hx-sz*.6-k*sz*1.05:hx+sz*.6+k*sz*1.05;heart(x,cx,hy+sz*1.6,sz*.9,v===2?'#e8282c':v===1?'#f08080':'#333','#fff');}
   if(mode==='rupees'){const rx=i?hx-sz*4:hx+sz*4;x.fillStyle='#2fbf3a';x.beginPath();x.moveTo(rx,hy+sz*1.1);x.lineTo(rx+sz*.25,hy+sz*1.4);x.lineTo(rx+sz*.25,hy+sz*1.8);x.lineTo(rx,hy+sz*2.1);x.lineTo(rx-sz*.25,hy+sz*1.8);x.lineTo(rx-sz*.25,hy+sz*1.4);x.closePath();x.fill();outlined(x,`×${l.rupees}`,i?rx-sz*.4:rx+sz*.4,hy+sz*1.6,{size:sz*.85,fill:'#fff',stroke:'#000',align:al});}}
  outlined(x,`${Math.ceil(Math.max(0,TIME-clock))}`,s.W/2,hy+Math.min(T*.55,22)*.9,{size:Math.min(T*.7,26),fill:'#fff',stroke:'#000'});
  if(clock<6&&phase!=='end'){x.save();x.globalAlpha=clamp(1-(clock-3)/3,0,1)*.8;const sz=Math.min(T*.45,16);outlined(x,portrait?'P1: drag the top half · tap to slash':'P1: drag the left half · tap to slash',s.W*(portrait?.5:.25),portrait?oy+T*rows*.25:s.H-12,{size:sz,fill:'#fff',stroke:'#000'});outlined(x,portrait?'P2: drag the bottom half · tap to slash':'P2: drag the right half · tap to slash',s.W*(portrait?.5:.75),portrait?oy+T*rows*.75:s.H-12,{size:sz,fill:'#fff',stroke:'#000'});x.restore();}
  if(phase==='count')cd.draw(x,s.W,s.H);
  if(phase==='end'){const size=Math.min(s.W*.055,s.H*.06,40);x.fillStyle='rgba(0,0,0,.7)';x.fillRect(0,s.H/2-size,s.W,size*2);outlined(x,endText,s.W/2,s.H/2,{size,fill:'#ffd21c',stroke:'#000'});}
 });
 function drawLink(l,T){const px=l.x*T,py=l.y*T,tunic=l.i?'#d83a2a':'#2fbf3a',dark=l.i?'#8a1a10':'#146a1a';
  if(l.down>0){x.save();x.globalAlpha=.6;x.translate(px,py);x.rotate(Math.PI/2);s.sprite(x,l.i,0,0,T*1.1,{exact:true,mood:'sad'});x.restore();return;}
  x.save();if(l.inv>0&&Math.floor(l.inv*14)%2)x.globalAlpha=.4;
  x.fillStyle='rgba(0,0,0,.2)';x.beginPath();x.ellipse(px,py+T*.42,T*.32,T*.1,0,0,7);x.fill();
  const step=Math.sin(l.walk)*T*.07;x.fillStyle='#8a5a2a';x.fillRect(px-T*.22,py+T*.2+step,T*.16,T*.2);x.fillRect(px+T*.06,py+T*.2-step,T*.16,T*.2);
  x.fillStyle=tunic;rr(x,px-T*.28,py-T*.12,T*.56,T*.42,T*.12);x.fill();x.fillStyle=dark;x.fillRect(px-T*.28,py+T*.08,T*.56,T*.07);x.fillStyle='#ffd21c';x.fillRect(px-T*.05,py+T*.07,T*.1,T*.09);
  const [dx,dy]=DIRS[l.dir];
  // shield
  x.fillStyle='#8a5a2a';const shx=px+(l.dir==='l'?-T*.3:l.dir==='r'?T*.3:dy>0?-T*.32:T*.32),shy=py+(dy>0?T*.05:0);rr(x,shx-T*.1,shy-T*.16,T*.2,T*.3,T*.05);x.fill();x.fillStyle='#c8c8d8';x.fillRect(shx-T*.04,shy-T*.1,T*.08,T*.18);
  // sword
  if(l.slash>0){const k=1-l.slash/.24,reach=T*(.5+Math.min(1,k*3)*.55);x.save();x.translate(px+dx*T*.2,py+dy*T*.2);x.rotate(Math.atan2(dy,dx));x.fillStyle='#8a5a2a';x.fillRect(T*.05,-T*.08,T*.12,T*.16);x.fillStyle='#e8e8f8';x.fillRect(T*.17,-T*.05,reach,T*.1);x.fillStyle='#fff';x.beginPath();x.moveTo(T*.17+reach,-T*.05);x.lineTo(T*.17+reach+T*.12,0);x.lineTo(T*.17+reach,T*.05);x.fill();x.restore();}
  s.sprite(x,l.i,px,py-T*.58,T*1.3,{exact:true,mood:l.inv>0?'sad':l.slash>0?'angry':undefined});
  // green cap peeking over the head
  x.fillStyle=tunic;x.beginPath();x.moveTo(px-T*.36,py-T*1.06);x.quadraticCurveTo(px,py-T*1.48,px+T*.36,py-T*1.06);x.lineTo(px+T*(l.dir==='l'?-.66:.66),py-T*.8);x.closePath();x.fill();
  x.restore();}
}
Object.assign(exports,{hyrule,buildMap});
