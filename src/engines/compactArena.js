const {clamp}=require("src/utils.js");
const {sound, vibrate}=require("src/audio.js");
const {duelInputs}=require("src/engines/duelControls.js");
const {directionGestures,drawDirectionFeedback}=require("src/engines/directionGestures.js");
const {circle}=require("src/engines/session.js");
function sumoState(){return {players:[{x:-.45,y:0,vx:0,vy:0,angle:0},{x:.45,y:0,vx:0,vy:0,angle:Math.PI}]};}
function sumoStep(a,dt,keys){
 for(let i=0;i<2;i++){const p=a.players[i],k=keys[i];p.angle+=((k.r?1:0)-(k.l?1:0))*4.2*dt;if(k.fire){p.vx+=Math.cos(p.angle)*1.65*dt;p.vy+=Math.sin(p.angle)*1.65*dt;}const drag=Math.exp(-.9*dt);p.vx*=drag;p.vy*=drag;p.x+=p.vx*dt;p.y+=p.vy*dt;}
 const [p,q]=a.players,dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy),radius=.2;
 if(d<radius*2){const nx=d?dx/d:1,ny=d?dy/d:0,overlap=(radius*2-d)/2;p.x-=nx*overlap;p.y-=ny*overlap;q.x+=nx*overlap;q.y+=ny*overlap;const impact=Math.max(.1,(p.vx-q.vx)*nx+(p.vy-q.vy)*ny);p.vx-=nx*impact*.65;p.vy-=ny*impact*.65;q.vx+=nx*impact*.65;q.vy+=ny*impact*.65;}
 const out=a.players.map(p=>Math.hypot(p.x,p.y)>1.06);return out[0]&&out[1]?'draw':out[0]?1:out[1]?0:null;
}
async function compactSumo(s){
 const[,x]=s.canvas(760,500,{fill:true});s.shared=true;s.updateScores();
 const keys=duelInputs(s,{horizontal:true,fire:true,fireLabel:'CHARGE',stacked:true});s.body.classList.add('sumo-overlay-body');s.queueCanvasFit?.();const wins=[0,0];let state=sumoState(),round=1,left=45,breakTime=0,note='';
 s.hint('Each side has TURN LEFT, TURN RIGHT and CHARGE, stacked vertically. Hold a turn to aim your suit; hold CHARGE to push. P1 A/D + Space; P2 arrows + Enter. First to two ring-outs, or most wins in 45 seconds.');
 s.debug={engine:'sumo',state,edgeInputs:keys,wins,round,left};
 if(!await s.pass(0,'Aim your inflatable suit and charge. Shove the other head out of the ring! Each player has three stacked buttons on their own edge.','Both players ready'))return;
 s.frame(dt=>{left-=dt;if(breakTime>0){breakTime-=dt;if(breakTime<=0){if(wins.some(n=>n>=2))return s.finish(wins,'Taskmaster Sumo Suit');state=sumoState();round++;}}else{const winner=sumoStep(state,dt,keys);if(winner!==null){if(winner!=='draw'){wins[winner]++;s.setScores(wins);s.react?.(winner,'win');s.react?.(1-winner,'sad');note=s.players[winner].name+' rings out the opponent!';}else note='Double ring-out! Replay the round.';sound('win');vibrate(25);breakTime=.8;}}
  const W=s.W,H=s.H,R=Math.max(30,Math.min(W,H)*.43),cx=W/2,cy=H/2;x.fillStyle='#efe4c8';x.fillRect(0,0,W,H);circle(x,cx,cy,R+8,'#c57b52');circle(x,cx,cy,R,'#ead7ac');x.strokeStyle='#fff';x.lineWidth=5;x.beginPath();x.arc(cx,cy,R*.85,0,Math.PI*2);x.stroke();
  for(let i=0;i<2;i++){const p=state.players[i],px=cx+p.x*R,py=cy+p.y*R;circle(x,px,py,R*.2,i?'#e96aa2':'#e6bf50');x.save();x.translate(px,py);x.rotate(p.angle);x.fillStyle='#fff';x.fillRect(R*.2,-4,R*.2,8);x.beginPath();x.moveTo(R*.48,0);x.lineTo(R*.34,-9);x.lineTo(R*.34,9);x.closePath();x.fill();x.restore();s.sprite(x,i,px,py,clamp(R*.43,48,112),{exact:true,mood:keys[i].fire?'walking':undefined});}
  if(breakTime>0){x.fillStyle='#352b25';x.font='bold '+clamp(W/35,14,25)+'px sans-serif';x.textAlign='center';x.fillText(note,cx,Math.max(25,H*.09));}
  s.status(`ROUND ${round} · ${Math.ceil(Math.max(0,left))}s · ${s.players[0].name} ${wins[0]} – ${wins[1]} ${s.players[1].name}`);s.debug={engine:'sumo',state,edgeInputs:keys,wins,round,left};if(left<=0)s.finish(wins,'Taskmaster Sumo Suit time limit');
 });
}

function raceState(){return {cars:[0,1].map(()=>({lane:1,dist:0,boost:100,hp:3,nitro:0})),obstacles:[],spawn:0,left:25,elapsed:0};}
function raceStep(a,dt,keys,random){
 a.left-=dt;a.elapsed+=dt;a.spawn-=dt;if(a.spawn<=0){a.spawn+=.78;a.obstacles.push({lane:Math.floor(random()*3),y:-.12,speed:.42+random()*.14,hits:[false,false]});}
 for(let i=0;i<2;i++){const car=a.cars[i];car.nitro=Math.max(0,car.nitro-dt);const boost=(keys[i].u||car.nitro>0)&&car.boost>0;car.dist+=dt*(boost?14:7.5);car.boost=clamp(car.boost+(boost?-28:9)*dt,0,100);}
 for(const o of a.obstacles){o.y+=o.speed*dt;for(let i=0;i<2;i++)if(!o.hits[i]&&o.y>=.78&&o.y<.92&&a.cars[i].lane===o.lane){o.hits[i]=true;a.cars[i].hp--;a.cars[i].dist=Math.max(0,a.cars[i].dist-7);}}
 a.obstacles=a.obstacles.filter(o=>o.y<1.15);const done=a.left<=0||a.cars.some(c=>c.dist>=100||c.hp<=0);
 if(done){if(a.cars.every(c=>c.hp<=0)){const tie=Math.max(...a.cars.map(c=>c.dist));a.cars.forEach(c=>c.dist=tie);}else for(let i=0;i<2;i++)if(a.cars[1-i].hp<=0)a.cars[i].dist=100;}
 return done;
}
async function swipeRace(s){
 const[,x]=s.canvas(760,500,{fill:true}),a=raceState();s.shared=true;s.updateScores();
 const controls=directionGestures(s,(i,dx,dy)=>{const car=a.cars[i];if(dx)car.lane=clamp(car.lane+dx,0,2);if(dy<0)car.nitro=.65;},{players:2});
 s.hint('P1 starts a finger on the left road; P2 on the right. Swipe left/right to change lanes. Swipe up for a nitro burst; hold up to keep boosting. WASD / arrows also work. Both roads get the same traffic. Three hits wreck a car.');
 s.debug={engine:'dualrace',state:a,controls,cars:a.cars};
 if(!await s.pass(0,'Quarter-Mile Mayhem: swipe to dodge matched traffic, swipe up for nitro. Both players race together using their own half of the screen.','Both ready — race!'))return;
 s.frame(dt=>{const hp=a.cars.map(c=>c.hp),done=raceStep(a,dt,controls.keys,s.random);for(let i=0;i<2;i++)if(a.cars[i].hp<hp[i]){sound('lose');s.react?.(i,'sad');vibrate(15);}
  const W=s.W,H=s.H,road=W*.48;x.fillStyle='#1d2428';x.fillRect(0,0,W,H);x.fillStyle='#687079';x.fillRect(road,0,W*.04,H);
  for(let i=0;i<2;i++){const ox=i?W*.52:0,lane=road/3;x.strokeStyle='#eee7a6';x.lineWidth=2;x.setLineDash([15,14]);for(let j=1;j<3;j++){x.beginPath();x.moveTo(ox+j*lane,0);x.lineTo(ox+j*lane,H);x.stroke();}x.setLineDash([]);
   for(const o of a.obstacles)if(!o.hits[i]){x.fillStyle='#bd7959';x.fillRect(ox+(o.lane+.2)*lane,o.y*H-lane*.3,lane*.6,Math.min(65,H*.11));}
   const car=a.cars[i],px=ox+(car.lane+.5)*lane,py=H*.86;x.fillStyle=i?'#e96da6':'#55a6ed';x.fillRect(px-lane*.29,py-H*.055,lane*.58,H*.11);s.sprite(x,i,px,py,clamp(lane*.7,40,74),{exact:true,mood:controls.keys[i].u||car.nitro?'silly':undefined});
   x.fillStyle='#4fe081';x.fillRect(ox+12,H-10,(road-24)*car.boost/100,5);x.fillStyle='#fff';x.font='bold '+clamp(lane*.16,12,20)+'px sans-serif';x.textAlign='center';x.fillText(`${Math.min(100,Math.floor(car.dist))}% · ${Math.max(0,car.hp)} HP`,ox+road/2,25);
  }
  drawDirectionFeedback(x,controls);s.setScores(a.cars.map(c=>Math.min(100,Math.round(c.dist))));s.status(`${Math.ceil(Math.max(0,a.left))}s · Swipe to steer · Swipe up for nitro`);s.debug={engine:'dualrace',state:a,controls,cars:a.cars};if(done)s.finish(a.cars.map(c=>Math.min(100,Math.round(c.dist))),'Fast & Furious: Quarter-Mile Mayhem');
 });
}

Object.assign(exports,{sumoState,sumoStep,compactSumo,raceState,raceStep,swipeRace});