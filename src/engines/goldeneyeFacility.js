// GoldenEye 007 · Facility, rebuilt as a top-down stealth run: start in the bathroom, sneak through the Arkangelsk
// chemical weapons facility past patrolling guards with vision cones, collect the intel disks and reach the exit.
// Get spotted and the klaxon sounds: every guard hunts you and shoots. Drag like a joystick to move; tap a guard to
// take him down (karate chop up close, silenced PP7 at range). Turn-based on the same layout, 80 seconds each.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,sfx,makeShake,makeFx,label,SANS,rr}=require("src/engines/tarantinoKit.js");
const {turnRunner}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");

const MAP=['########################','#TT.#.....#......#.....#','#S..#..I..#..G...#..K..#','#...D.....D......D..K..#','#TT.#.....#......#.....#','##.###.####..I...###.###','#......G.............G.#','#..I...........##......#','##.###.####.#####..###.#','#.....#......#.....#...#','#..G..D..KK..D..I..D..E#','#.....#..KK..#..G..#...#','#..I..#......#.....#...#','########################'];

async function bondmission(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.ownHud(true,true);
 const shake=makeShake(),fx=makeFx();let cur=null,view=null;const stick={id:null,sx:0,sy:0,x:0,y:0,t0:0};const keys={};
 function build(portrait){const R=MAP.length,C=MAP[0].length,cols=portrait?R:C,rows=portrait?C:R,grid=[],ents=[];
  for(let r=0;r<rows;r++){grid.push([]);for(let cI=0;cI<cols;cI++){const ch=portrait?MAP[cI][C-1-r]:MAP[r][cI];grid[r].push(ch==='#'||ch==='T'||ch==='K'?ch:'.');if('SEIG'.includes(ch))ents.push({ch,x:cI+.5,y:r+.5});}}
  return {grid,cols,rows,ents};}
 const wall=(w,px,py)=>{const r=Math.floor(py),cI=Math.floor(px);return r<0||cI<0||r>=w.rows||cI>=w.cols||w.grid[r][cI]!=='.';};
 const free=(w,px,py,rad=.28)=>!wall(w,px-rad,py-rad)&&!wall(w,px+rad,py-rad)&&!wall(w,px-rad,py+rad)&&!wall(w,px+rad,py+rad);
 function los(w,a,b){const d=Math.hypot(b.x-a.x,b.y-a.y),n=Math.ceil(d*4);for(let k=1;k<n;k++){if(wall(w,a.x+(b.x-a.x)*k/n,a.y+(b.y-a.y)*k/n))return false;}return true;}
 function make(){const portrait=s.H>s.W*1.05,m=build(portrait),rand=seededRandom(s.seed+':facility');const w={...m,portrait,rand,score:0,hp:3,ammo:8,intel:0,alarm:0,detect:0,alarmed:false,shots:[],pops:[],kills:0,flash:0,exited:false};
  w.me={x:0,y:0,a:0,step:0};w.guards=[];w.disks=[];
  for(const e of m.ents){if(e.ch==='S'){w.me.x=e.x;w.me.y=e.y;}else if(e.ch==='E')w.exit={x:e.x,y:e.y};else if(e.ch==='I')w.disks.push({x:e.x,y:e.y});
   else if(e.ch==='G'){const dirs=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>!wall(w,e.x+dx,e.y+dy));const d=dirs[Math.floor(rand()*dirs.length)]||[1,0];let L=0;while(L<6&&!wall(w,e.x+d[0]*(L+1),e.y+d[1]*(L+1)))L++;
    w.guards.push({x:e.x,y:e.y,a:Math.atan2(d[1],d[0]),home:{x:e.x,y:e.y},to:{x:e.x+d[0]*L,y:e.y+d[1]*L},leg:1,pause:0,alive:true,fireT:1,look:0,hp:1,seen:0});}}
  return w;}
 function nearestGuard(w,px,py,maxD){let best=null,bd=maxD;for(const g of w.guards)if(g.alive){const d=Math.hypot(g.x-px,g.y-py);if(d<bd){bd=d;best=g;}}return best;}
 function takedown(w,g){const p=w.me,d=Math.hypot(g.x-p.x,g.y-p.y);
  if(d<1.3){g.alive=false;w.score+=40;w.kills++;w.pops.push({x:g.x,y:g.y,text:'+40 CHOP',t:1,c:'#ffd23f'});sfx.hit();shake.kick(4);s.react?.(w.player,'happy',.6);return;}
  if(w.ammo<=0){voice(200,.05,.04,'square');return;}if(!los(w,p,g))return;w.ammo--;p.a=Math.atan2(g.y-p.y,g.x-p.x);noise(.06,.05,{type:'highpass',f0:2500});voice(900,.04,.03,'square',{slide:.5});
  if(Math.random()<(d<4?.9:.65)){g.alive=false;w.score+=25;w.kills++;w.pops.push({x:g.x,y:g.y,text:'+25',t:1,c:'#ffd23f'});const P=toS(g.x,g.y);fx.splat(P.x,P.y,{n:14,speed:160,size:3});}else{g.seen=Math.max(g.seen,.6);}
  // gunfire nearby draws attention
  for(const o of w.guards)if(o.alive&&o!==g&&Math.hypot(o.x-p.x,o.y-p.y)<3.5)o.seen=Math.max(o.seen,.5);}
 let toS=(X,Y)=>({x:X,y:Y});
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||!cur)return;ev.preventDefault();const p=s.pointer(ev);
  if(view){const wx=(p.x-view.ox)/view.k,wy=(p.y-view.oy)/view.k;const g=nearestGuard(cur,wx,wy,1.4);if(g){takedown(cur,g);return;}}
  if(stick.id===null){stick.id=ev.pointerId;stick.sx=stick.x=p.x;stick.sy=stick.y=p.y;s.capture(ev);}});
 s.on(c,'pointermove',ev=>{if(ev.pointerId!==stick.id||s.paused)return;ev.preventDefault();const p=s.pointer(ev);stick.x=p.x;stick.y=p.y;});
 for(const ty of ['pointerup','pointercancel'])s.on(c,ty,ev=>{if(ev.pointerId===stick.id){stick.id=null;s.release(ev);}});
 s.on(document,'keydown',ev=>{keys[ev.key.toLowerCase()]=true;if((ev.key===' '||ev.key==='Enter')&&cur){const g=nearestGuard(cur,cur.me.x,cur.me.y,7);if(g)takedown(cur,g);}});s.on(document,'keyup',ev=>{keys[ev.key.toLowerCase()]=false;});
 s.resetOnPause(()=>{stick.id=null;for(const k in keys)keys[k]=false;});
 s.hint('Drag anywhere like a joystick to sneak. Tap a guard to take him down: a karate chop if you are next to him, a silenced PP7 shot otherwise (8 bullets). Stay out of the yellow vision cones; if a guard spots you the alarm sounds and everyone hunts you. Grab the intel disks and reach the red EXIT. Keys: arrows/WASD + Space.');
 function step(w,dt){
  fx.step(dt);shake.step(dt);w.flash=Math.max(0,w.flash-dt*2);for(const p of w.pops)p.t-=dt;w.pops=w.pops.filter(p=>p.t>0);
  if(w.ending||w.exited||w.hp<=0)return;
  const p=w.me;let ax=((keys.arrowright||keys.d)?1:0)-((keys.arrowleft||keys.a)?1:0),ay=((keys.arrowdown||keys.s)?1:0)-((keys.arrowup||keys.w)?1:0);
  if(stick.id!==null){const dx=stick.x-stick.sx,dy=stick.y-stick.sy,d=Math.hypot(dx,dy);if(d>10){ax=dx/d*clamp(d/50,0,1);ay=dy/d*clamp(d/50,0,1);}}
  const sp=3.4;const nx=p.x+ax*sp*dt,ny=p.y+ay*sp*dt;if(free(w,nx,p.y))p.x=nx;if(free(w,p.x,ny))p.y=ny;if(ax||ay){p.a=Math.atan2(ay,ax);p.step+=dt*10;}
  for(const d of w.disks)if(!d.got&&Math.hypot(d.x-p.x,d.y-p.y)<.6){d.got=true;w.intel++;w.score+=100;w.pops.push({x:d.x,y:d.y,text:'+100 INTEL',t:1.2,c:'#7dff6a'});sfx.coin();}
  if(w.exit&&Math.hypot(w.exit.x-p.x,w.exit.y-p.y)<.7){w.exited=true;const bonus=200+Math.max(0,Math.round(w.cap-w.time))*5+(w.alarmed?0:150);w.score+=bonus;w.pops.push({x:p.x,y:p.y,text:`ESCAPED +${bonus}`,t:2,c:'#ffd23f'});sfx.fanfare();s.react?.(w.player,'win',2);return;}
  // guards
  let anySee=false;
  for(const g of w.guards){if(!g.alive)continue;g.fireT-=dt;
   const dx=p.x-g.x,dy=p.y-g.y,d=Math.hypot(dx,dy);let da=Math.atan2(dy,dx)-g.a;da=Math.atan2(Math.sin(da),Math.cos(da));
   const sees=d<5.5&&Math.abs(da)<.62&&los(w,g,p)||d<1.1;if(sees){anySee=true;g.seen=Math.min(1,g.seen+dt*2.2);}else g.seen=Math.max(0,g.seen-dt*.6);
   if(w.alarm>0||g.seen>=1){// hunt
    const want=Math.atan2(dy,dx);g.a+=clamp(Math.atan2(Math.sin(want-g.a),Math.cos(want-g.a)),-5*dt,5*dt);if(d>2.2){const gx=g.x+Math.cos(want)*2.4*dt,gy=g.y+Math.sin(want)*2.4*dt;if(free(w,gx,g.y))g.x=gx;if(free(w,g.x,gy))g.y=gy;}
    if(sees&&g.fireT<=0){g.fireT=.9+w.rand()*.6;const a=Math.atan2(dy,dx)+(w.rand()-.5)*.3;w.shots.push({x:g.x,y:g.y,vx:Math.cos(a)*9,vy:Math.sin(a)*9,life:1});noise(.08,.05,{f0:2000,f1:400});}}
   else{// patrol
    if(g.pause>0){g.pause-=dt;g.a+=Math.sin(g.look+=dt*2)*dt*1.4;continue;}const tgt=g.leg?g.to:g.home,ddx=tgt.x-g.x,ddy=tgt.y-g.y,dd=Math.hypot(ddx,ddy);
    if(dd<.08){g.leg^=1;g.pause=1+w.rand()*1.2;}else{const want=Math.atan2(ddy,ddx);g.a+=clamp(Math.atan2(Math.sin(want-g.a),Math.cos(want-g.a)),-4*dt,4*dt);g.x+=ddx/dd*1.3*dt;g.y+=ddy/dd*1.3*dt;}}}
  if(anySee){w.detect=Math.min(1,w.detect+dt*1.6);}else w.detect=Math.max(0,w.detect-dt*.5);
  if(w.guards.some(g=>g.alive&&g.seen>=1)&&w.alarm<=0){w.alarm=9;w.alarmed=true;w.pops.push({x:p.x,y:p.y-1,text:'ALARM!',t:1.5,c:'#ff3b3b'});s.react?.(w.player,'sad',1.2);}
  if(w.alarm>0){w.alarm-=dt;if(Math.floor(w.alarm*2)!==Math.floor((w.alarm+dt)*2))voice(Math.floor(w.alarm*2)%2?660:520,.35,.03,'sawtooth',{lp:1400});if(w.alarm<=0)for(const g of w.guards)g.seen=0;}
  for(const b of w.shots){b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(wall(w,b.x,b.y)){b.life=0;continue;}if(Math.hypot(b.x-p.x,b.y-p.y)<.35){b.life=0;w.hp--;w.flash=.6;shake.kick(8);vibrate(40);s.react?.(w.player,'sad',1);const P=toS(p.x,p.y);fx.splat(P.x,P.y,{n:16,speed:160,size:3});voice(120,.2,.06,'square');}}
  w.shots=w.shots.filter(b=>b.life>0);
 }
 function draw(w){
  const W=s.W,H=s.H,p=w.me,k=w.portrait?Math.min(W/7.2,H/12):Math.min(W/16,H/10),camAxis=(size,span,pos,pad)=>span*k<=size-pad?(size+pad-span*k)/2:clamp(size/2-pos*k,size-span*k,pad),ox=camAxis(W,w.cols,p.x,0),oy=camAxis(H,w.rows,p.y,44);view={k,ox,oy};toS=(X,Y)=>({x:ox+X*k,y:oy+Y*k});
  x.setTransform(1,0,0,1,0,0);x.fillStyle='#0c0f0c';x.fillRect(0,0,W,H);let shx=0,shy=0;if(shake.mag>.3){shx=(Math.random()-.5)*shake.mag;shy=(Math.random()-.5)*shake.mag;}
  x.setTransform(k,0,0,k,ox+shx,oy+shy);
  const c0=Math.max(0,Math.floor(-ox/k)-1),c1=Math.min(w.cols,Math.ceil((W-ox)/k)+1),r0=Math.max(0,Math.floor(-oy/k)-1),r1=Math.min(w.rows,Math.ceil((H-oy)/k)+1);
  for(let r=r0;r<r1;r++)for(let cI=c0;cI<c1;cI++){const t=w.grid[r][cI];if(t==='.'){x.fillStyle=(r+cI)%2?'#c8c2a8':'#bdb69c';x.fillRect(cI,r,1.01,1.01);}
   else if(t==='#'){x.fillStyle='#5f6e5a';x.fillRect(cI,r,1.01,1.01);x.fillStyle='#738270';x.fillRect(cI,r,1,.18);x.strokeStyle='#4a5746';x.lineWidth=.03;x.strokeRect(cI+.1,r+.25,.8,.65);}
   else if(t==='T'){x.fillStyle='#bdb69c';x.fillRect(cI,r,1.01,1.01);x.fillStyle='#f4f4f0';rr(x,cI+.2,r+.15,.6,.7,.2);x.fill();x.fillStyle='#d8dde0';x.beginPath();x.ellipse(cI+.5,r+.55,.22,.25,0,0,Math.PI*2);x.fill();}
   else if(t==='K'){x.fillStyle='#bdb69c';x.fillRect(cI,r,1.01,1.01);const g=x.createRadialGradient(cI+.4,r+.4,.05,cI+.5,r+.5,.48);g.addColorStop(0,'#bfe0ff');g.addColorStop(1,'#3a6a9a');x.fillStyle=g;x.beginPath();x.arc(cI+.5,r+.5,.46,0,Math.PI*2);x.fill();}}
  if(w.exit){x.fillStyle=Math.floor(w.time*3)%2?'#d02a2a':'#ff4a4a';x.fillRect(w.exit.x-.45,w.exit.y-.45,.9,.9);x.fillStyle='#fff';x.font='bold .28px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('EXIT',w.exit.x,w.exit.y);}
  for(const d of w.disks)if(!d.got){x.fillStyle='#2a2a30';x.fillRect(d.x-.22,d.y-.22,.44,.44);x.fillStyle='#e8e8e8';x.fillRect(d.x-.14,d.y-.22,.28,.16);x.fillStyle='#ffd23f';x.fillRect(d.x-.1,d.y+.04,.2,.12);}
  // vision cones
  for(const g of w.guards){if(!g.alive)continue;const alert=w.alarm>0||g.seen>.5;x.fillStyle=alert?'rgba(255,40,40,.22)':'rgba(255,230,90,.18)';x.beginPath();x.moveTo(g.x,g.y);const n=14;for(let q=0;q<=n;q++){const a=g.a-.62+1.24*q/n;let L=0;while(L<5.5&&!wall(w,g.x+Math.cos(a)*L,g.y+Math.sin(a)*L))L+=.15;x.lineTo(g.x+Math.cos(a)*L,g.y+Math.sin(a)*L);}x.closePath();x.fill();}
  for(const b of w.shots){x.strokeStyle='#fff6b0';x.lineWidth=.07;x.beginPath();x.moveTo(b.x,b.y);x.lineTo(b.x-b.vx*.03,b.y-b.vy*.03);x.stroke();}
  for(const g of w.guards){x.save();x.translate(g.x,g.y);if(!g.alive){x.fillStyle='#3e4a2c';x.fillRect(-.35,-.15,.7,.3);x.restore();continue;}x.rotate(g.a);x.fillStyle='#4f5d33';x.beginPath();x.ellipse(0,0,.26,.34,0,0,Math.PI*2);x.fill();x.fillStyle='#2a2a2a';x.fillRect(.15,.08,.4,.08);x.fillStyle='#6a5a4a';x.beginPath();x.arc(0,0,.17,0,Math.PI*2);x.fill();x.fillStyle='#3a3020';x.beginPath();x.arc(-.04,0,.15,0,Math.PI*2);x.fill();x.restore();
   if(g.seen>0&&w.alarm<=0){x.fillStyle=g.seen>=1?'#ff3b3b':'#ffd23f';x.font='bold .5px sans-serif';x.textAlign='center';x.fillText(g.seen>=1?'!':'?',g.x,g.y-.45);}}
  x.setTransform(1,0,0,1,0,0);fx.drawDecals(x);fx.draw(x);
  // Bond (you)
  const P=toS(p.x,p.y);x.fillStyle='#1a1a22';x.beginPath();x.ellipse(P.x,P.y+k*.1,k*.28,k*.32,0,0,Math.PI*2);x.fill();s.sprite(x,w.player,P.x,P.y-k*.15,k*.85,{exact:true});
  if(w.alarm>0){x.fillStyle=`rgba(255,0,0,${.12+.1*Math.sin(w.time*10)})`;x.fillRect(0,0,W,H);}
  if(w.flash>0){x.fillStyle=`rgba(255,0,0,${w.flash*.3})`;x.fillRect(0,0,W,H);}
  // HUD
  const fs=Math.max(13,Math.min(W,H)*.028);
  label(x,`${w.score}`,14,22,fs*1.3,{fill:'#fff',align:'left',font:`900 ${fs*1.3}px ${SANS}`});
  label(x,`INTEL ${w.intel}/${w.disks.length}   PP7 ${w.ammo}`,14,22+fs*1.5,fs*.85,{fill:'#7dff6a',align:'left',font:`800 ${fs*.85}px ${SANS}`});
  for(let q=0;q<3;q++){x.fillStyle=q<w.hp?'#4ab0ff':'#ffffff22';x.fillRect(14+q*(fs*1.1),22+fs*2.5,fs,fs*.4);}
  const left=Math.max(0,Math.ceil(w.cap-w.time));label(x,String(left),W/2,22,fs*1.1,{fill:left<=10?'#ff4a4a':'#fff'});
  if(w.player===1)label(x,`beat ${w.scores[0]}`,W/2,22+fs*1.3,fs*.75,{fill:'#ffffffaa'});
  if(w.detect>0&&w.alarm<=0){x.fillStyle='#000a';x.fillRect(W/2-60,H-30,120,8);x.fillStyle='#ffd23f';x.fillRect(W/2-60,H-30,120*w.detect,8);}
  if(w.alarm>0)label(x,'ALARM',W/2,H-40,fs*1.4,{fill:'#ff3b3b'});
  if(w.ending)label(x,w.exited?'MISSION COMPLETE':w.hp<=0?'MISSION FAILED':'TIME UP',W/2,H*.4,clamp(W*.07,22,46),{fill:w.exited?'#ffd23f':'#ff4a4a'});
  if(stick.id!==null){x.strokeStyle='#ffffff40';x.lineWidth=2;x.beginPath();x.arc(stick.sx,stick.sy,40,0,Math.PI*2);x.stroke();}
  s.debug={engine:'bondmission',world:w};
 }
 const scores=await turnRunner(s,{seconds:80,
  intro:(i,sc)=>i===0?`GoldenEye: Facility. ${s.players[0].name} goes in first, out of the bathroom vent. Drag to sneak, tap guards to take them down (chop up close, silenced PP7 from range). Stay out of the vision cones, grab the intel disks and reach the red EXIT. 80 seconds.`:`${s.players[1].name}, same facility, same guards. Beat ${sc[0]}.`,
  make:i=>{cur=make();return cur;},step,draw,done:w=>w.exited||w.hp<=0,soloPass:w=>!!w.exited,soloGoal:()=>"Reach the red EXIT before the clock runs out to reach the next round.",score:w=>w.score});
 if(!scores)return;
 s.finish(scores,`GoldenEye Facility · ${scores[0]} vs ${scores[1]}`);
}
Object.assign(exports,{bondmission});
