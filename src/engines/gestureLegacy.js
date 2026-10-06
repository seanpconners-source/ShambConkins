const {clamp,seededRandom}=require("src/utils.js");
const {sound,vibrate}=require("src/audio.js");
const {circle}=require("src/engines/session.js");
const {arenaGestures,gestureHint}=require("src/engines/arenaGestures.js");
const {directionGestures}=require("src/engines/directionGestures.js");
async function fruitmerge(s){
 const[,x]=s.canvas(760,520,{fill:true}),boards=Array.from({length:2},()=>Array.from({length:4},()=>[])),cursor=[1,2],scores=[0,0],drops=[0,0],fruit=['🍒','🍓','🍊','🍎','🍑','🍍','🍉'];let left=40;
 const random=seededRandom(s.seed),sequence=Array.from({length:400},()=>random()<.75?0:1);s.shared=true;s.updateScores();
 function drop(i){if(s.paused||!s.alive)return;const col=boards[i][cursor[i]];if(col.length>=7)return;col.push(sequence[drops[i]++%sequence.length]);sound('tap');while(col.length>=2&&col.at(-1)===col.at(-2)&&col.at(-1)<6){const level=col.pop();col[col.length-1]++;scores[i]+=2**(level+1);sound('coin');vibrate(8);}s.setScores(scores);}
 const controls=directionGestures(s,(i,dx,dy)=>{if(dx)cursor[i]=clamp(cursor[i]+dx,0,3);if(dy>0)drop(i);},{players:2,onTap:drop});
 s.hint('Each human owns their half. Swipe left/right to select one of four columns, then tap or swipe DOWN to drop the next fruit. Matching stacked fruit merges. Both players receive the same sequence. P1 A/D + Space; P2 arrows + Enter.');
 s.on(document,'keydown',ev=>{if(!s.paused&&!ev.repeat&&(ev.key===' '||ev.key==='Enter')){ev.preventDefault();drop(ev.key===' '?0:1);}});
 s.debug={engine:'fruitmerge',boards,cursor,scores,drops,controls};
 if(!await s.pass(0,'Brawndo: it has what fruit needs. Swipe to choose a column; tap to drop. Most merge points in 40 seconds.','Both ready — merge!'))return;
 s.frame(dt=>{left-=dt;const W=s.W,H=s.H,gutter=8,half=(W-gutter)/2,top=clamp(H*.16,44,90),cw=half/4,ch=(H-top-8)/7;x.fillStyle='#142626';x.fillRect(0,0,W,H);
  for(let i=0;i<2;i++){const ox=i*(half+gutter);x.fillStyle=i?'#472841':'#245747';x.fillRect(ox,0,half,H);x.fillStyle='#fff5ba';x.textAlign='center';x.font=`bold ${clamp(half*.06,12,21)}px monospace`;x.fillText(`${s.players[i].name} · ${scores[i]}`,ox+half/2,24);s.sprite(x,i,ox+(cursor[i]+.5)*cw,top*.67,clamp(top*.55,27,45),{exact:true});
   for(let c=0;c<4;c++){x.strokeStyle=c===cursor[i]?'#fff3b8':'#ffffff33';x.lineWidth=c===cursor[i]?3:1;x.strokeRect(ox+c*cw+2,top,cw-4,H-top-6);x.font=`${Math.max(15,Math.min(cw,ch)*.72)}px Arial`;x.textBaseline='middle';boards[i][c].forEach((level,r)=>x.fillText(fruit[level],ox+(c+.5)*cw,H-8-(r+.5)*ch));}x.textBaseline='alphabetic';
  }
  s.status(`${Math.ceil(Math.max(0,left))}s · Swipe to choose · Tap / swipe down to drop`);if(left<=0||boards.some(b=>b.every(c=>c.length>=7)))s.finish(scores,'Brawndo Fruit Merge');
 });
}

async function battleroyale(s){
 const[,x]=s.canvas(900,560,{fill:true}),players=[{x:.25,y:.5,hp:6,ammo:4,score:0,cool:0,storm:0},{x:.75,y:.5,hp:6,ammo:4,score:0,cool:0,storm:0}],shots=[],loot=[];let left=45,elapsed=0;
 s.shared=true;s.updateScores();
 function spawn(){const r=Math.sqrt(s.random())*.38,angle=s.random()*Math.PI*2;loot.push({x:.5+Math.cos(angle)*r,y:.5+Math.sin(angle)*r,type:s.random()<.42?'weapon':s.random()<.72?'med':'bag'});}
 for(let i=0;i<8;i++)spawn();
 function attack(i){const p=players[i],op=players[1-i];if(p.cool>0||s.paused||!s.alive)return;const dx=op.x-p.x,dy=op.y-p.y,d=Math.hypot(dx,dy)||1;p.cool=.6;if(p.ammo>0){p.ammo--;shots.push({x:p.x,y:p.y,vx:dx/d*.6,vy:dy/d*.6,owner:i});sound('shot');}else if(d<.1){op.hp--;p.score++;sound('lose');}}
 const controls=arenaGestures(s,{onTap:attack});s.hint('Both humans drag from their first touch on their own half. Weapons aim and fire automatically while you hold and move; tap for a shot or a close punch. Medkits heal when collected. Stay inside the shrinking yellow safe zone. WASD / arrows, Space / Enter fires.');
 s.debug={engine:'battleroyale',players,shots,loot,controls,get left(){return left;}};
 if(!await s.pass(0,'Both humans survive the island. Drag to move, collect weapons and medkits, and keep inside the shrinking safe zone.','Both ready — survive!'))return;
 s.frame(dt=>{left-=dt;elapsed+=dt;const radius=Math.max(.18,.46-elapsed*.006);
  for(let i=0;i<2;i++){const p=players[i],v=controls.input[i],d=Math.max(1,Math.hypot(v.x,v.y));p.cool=Math.max(0,p.cool-dt);p.x=clamp(p.x+v.x/d*.28*dt,.025,.975);p.y=clamp(p.y+v.y/d*.28*dt,.07,.975);if(v.fire||[...controls.fingers.values()].some(f=>f.owner===i)&&p.ammo>0)attack(i);
   p.storm=Math.hypot(p.x-.5,p.y-.5)>radius?p.storm+dt:0;if(p.storm>=1){p.storm-=1;p.hp--;sound('lose');}
   for(let k=loot.length-1;k>=0;k--){const q=loot[k];if(Math.hypot(q.x-p.x,q.y-p.y)<.045){loot.splice(k,1);if(q.type==='weapon')p.ammo+=4;else if(q.type==='med')p.hp=Math.min(6,p.hp+2);else p.score+=2;sound('coin');spawn();}}
  }
  for(let k=shots.length-1;k>=0;k--){const q=shots[k],op=players[1-q.owner];q.x+=q.vx*dt;q.y+=q.vy*dt;if(Math.hypot(q.x-op.x,q.y-op.y)<.035){op.hp-=2;players[q.owner].score+=2;s.react?.(1-q.owner,'sad');sound('lose');shots.splice(k,1);}else if(q.x<0||q.x>1||q.y<0||q.y>1)shots.splice(k,1);}
  const W=s.W,H=s.H;x.fillStyle='#60805a';x.fillRect(0,0,W,H);x.fillStyle='#39563c66';for(let k=0;k<20;k++)x.fillRect(((k*113)%997)/1000*W,((k*67)%587)/600*H,W*.028,H*.045);x.strokeStyle='#ffe77e';x.lineWidth=4;x.beginPath();x.ellipse(W/2,H/2,radius*W,radius*H,0,0,Math.PI*2);x.stroke();
  x.font=`${clamp(Math.min(W,H)*.055,18,30)}px Arial`;x.textAlign='center';x.textBaseline='middle';for(const q of loot)x.fillText(q.type==='weapon'?'🔫':q.type==='med'?'❤️':'🎒',q.x*W,q.y*H);for(const q of shots)circle(x,q.x*W,q.y*H,4,q.owner?'#ffc0dc':'#a5dbff');for(let i=0;i<2;i++){const p=players[i];s.sprite(x,i,p.x*W,p.y*H,clamp(Math.min(W,H)*.11,36,72),{exact:true});}
  gestureHint(x,s,controls);const scores=players.map(p=>Math.max(0,p.hp)*3+p.score+p.ammo);s.setScores(scores);s.status(`${Math.ceil(Math.max(0,left))}s · ${s.players.map((p,i)=>p.name+': '+Math.max(0,players[i].hp)+' HP / '+players[i].ammo+' ammo').join(' · ')}`);if(left<=0||players.some(p=>p.hp<=0))s.finish(scores,'Battle Royale · Island Survival');
 });
}

async function bondmission(s){
 const[,x]=s.canvas(900,560,{fill:true}),scores=[0,0],walls=[{x:.23,y:.22,w:.065,h:.35},{x:.47,y:.43,w:.065,h:.37},{x:.7,y:.15,w:.065,h:.34}];let player=0,actor,finishing=true;
 const roundRandom=()=>seededRandom(s.seed+'-facility');
 function reset(){const random=roundRandom();return {x:.07,y:.88,hp:3,invuln:1,fireCool:0,left:22,guards:Array.from({length:5},(_,i)=>({x:.34+(i%3)*.2,y:.12+(i%2)*.7,angle:random()*6.28})),intel:[{x:.1,y:.13},{x:.37,y:.72},{x:.6,y:.13},{x:.86,y:.72},{x:.9,y:.13}].map(q=>({...q,got:false}))};}
 function fire(){if(!actor||finishing||s.paused||actor.fireCool>0)return;actor.fireCool=.35;const target=actor.guards.findIndex(g=>Math.hypot(g.x-actor.x,g.y-actor.y)<.17);if(target>=0){actor.guards.splice(target,1);scores[player]+=2;}sound('shot');}
 const controls=arenaGestures(s,{players:1,onTap:fire});s.hint('Drag from your first touch anywhere to move. Tap to neutralize a nearby guard. Walls block movement. Collect five gold intel files; three hits ends your turn. Both humans face the same facility. WASD / arrows move; Space fires.');
 async function finish(){if(finishing)return;finishing=true;controls.clear();s.setScores(scores);if(player===0){player=1;await start();}else s.finish(scores,'GoldenEye · Facility Escape');}
 async function start(){actor=reset();finishing=true;s.debug={engine:'bondmission',actor,scores,controls,walls};if(!await s.pass(player,'Collect five files and escape the guards. Drag to move; tap to shoot in close range. Your clock waits for Ready.'))return;finishing=false;}
 const blocked=(px,py)=>walls.some(b=>px>b.x-.018&&px<b.x+b.w+.018&&py>b.y-.025&&py<b.y+b.h+.025);
 s.frame(dt=>{if(!actor||finishing)return;const a=actor,v=controls.input[0];a.left-=dt;a.invuln=Math.max(0,a.invuln-dt);a.fireCool=Math.max(0,a.fireCool-dt);const d=Math.max(1,Math.hypot(v.x,v.y)),px=clamp(a.x+v.x/d*.29*dt,.03,.97),py=clamp(a.y+v.y/d*.29*dt,.09,.95);if(!blocked(px,a.y))a.x=px;if(!blocked(a.x,py))a.y=py;if(v.fire)fire();
  for(const q of a.intel)if(!q.got&&Math.hypot(q.x-a.x,q.y-a.y)<.035){q.got=true;scores[player]+=3;sound('coin');}
  for(const g of a.guards){const gx=clamp(g.x+Math.cos(g.angle)*.075*dt,.04,.96),gy=clamp(g.y+Math.sin(g.angle)*.075*dt,.09,.95);if(blocked(gx,gy)||gx===.04||gx===.96||gy===.09||gy===.95)g.angle+=Math.PI*.7;else{g.x=gx;g.y=gy;}if(a.invuln===0&&Math.hypot(g.x-a.x,g.y-a.y)<.035){a.hp--;a.invuln=1.2;scores[player]=Math.max(0,scores[player]-1);s.react?.(player,'sad');sound('lose');}}
  const W=s.W,H=s.H;x.fillStyle='#243b36';x.fillRect(0,0,W,H);x.strokeStyle='#75a49622';for(let xx=0;xx<W;xx+=40){x.beginPath();x.moveTo(xx,0);x.lineTo(xx,H);x.stroke();}for(const b of walls){x.fillStyle='#869c92';x.fillRect(b.x*W,b.y*H,b.w*W,b.h*H);}for(const q of a.intel)if(!q.got){x.fillStyle='#fce474';x.fillRect(q.x*W-9,q.y*H-12,18,24);}for(const g of a.guards)s.sprite(x,1-player,g.x*W,g.y*H,clamp(Math.min(W,H)*.065,23,40),{exact:true,mood:'angry'});s.sprite(x,player,a.x*W,a.y*H,clamp(Math.min(W,H)*.11,36,70),{exact:true,mood:'walking'});gestureHint(x,s,controls);s.setScores(scores);s.status(`${s.players[player].name} · ${Math.ceil(Math.max(0,a.left))}s · ${a.hp} HP · ${a.intel.filter(q=>q.got).length}/5 intel · tap to fire`);if(a.left<=0||a.hp<=0||a.intel.every(q=>q.got))void finish();
 });
 await start();
}

Object.assign(exports,{fruitmerge,battleroyale,bondmission});