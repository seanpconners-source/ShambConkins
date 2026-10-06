const {clamp}=require("src/utils.js");
const {sound, vibrate}=require("src/audio.js");
const {arenaGestures,gestureHint}=require("src/engines/arenaGestures.js");
const {circle}=require("src/engines/session.js");
const SEWER={W:1000,H:640,gravity:1700,jump:900,speed:300,goal:6};
const SEWER_PLATFORMS=[
 {x:0,y:610,w:1000,h:30},{x:55,y:450,w:330,h:18},{x:615,y:450,w:330,h:18},
 {x:290,y:292,w:420,h:18},{x:75,y:134,w:310,h:18},{x:615,y:134,w:310,h:18}
];
function sewerState(){return {players:[{x:200,y:610,vx:0,vy:0,score:0,grounded:true,coyote:.12,buffer:0},{x:800,y:610,vx:0,vy:0,score:0,grounded:true,coyote:.12,buffer:0}],left:40,elapsed:0,coins:[],spawn:0,nextOwner:0};}
function sewerJump(p){p.buffer=.16;}
function sewerPlayerStep(p,dt,input){
 p.buffer=Math.max(0,p.buffer-dt);p.coyote=p.grounded?.12:Math.max(0,p.coyote-dt);
 if(p.buffer>0&&p.coyote>0){p.vy=-SEWER.jump;p.grounded=false;p.coyote=0;p.buffer=0;}
 const previous=p.y;p.vx=input.x*SEWER.speed;p.x=clamp(p.x+p.vx*dt,22,SEWER.W-22);p.vy+=SEWER.gravity*dt;p.y+=p.vy*dt;p.grounded=false;
 if(p.vy>=0)for(const platform of [...SEWER_PLATFORMS].sort((a,b)=>a.y-b.y))if(previous<=platform.y+.01&&p.y>=platform.y&&p.x>platform.x-8&&p.x<platform.x+platform.w+8){p.y=platform.y;p.vy=0;p.grounded=true;break;}
 if(p.y>SEWER.H+60){p.y=610;p.vy=0;p.grounded=true;}
}
function refill(a,random){while(a.coins.length<8){const platform=SEWER_PLATFORMS[[1,3,4][Math.floor(random()*3)]],c={x:platform.x+40+random()*(platform.w-80),y:platform.y-28,bob:random()*6.28};a.coins.push(c);if(a.coins.length<8)a.coins.push({...c,x:SEWER.W-c.x});}}
async function sewer(s){
 const[,x]=s.canvas(900,560,{fill:true}),a=sewerState();s.shared=true;s.updateScores();refill(a,s.random);
 function jump(i){if(s.paused||!s.alive)return;sewerJump(a.players[i]);sound('jump');}
 const controls=arenaGestures(s,{horizontal:true,onAction:jump,onTap:jump});
 s.hint('P1 starts a finger on the LEFT half, P2 on the RIGHT. Drag left/right from that first touch to run. Flick up to jump while running, or tap your half to jump. Return the finger to its starting point to stop. First to six pizza tokens, or most after 40 seconds. P1 A/D + W/Space; P2 arrows + Enter.');
 s.debug={engine:'sewer',state:a,players:a.players,platforms:SEWER_PLATFORMS,controls};
 if(!await s.pass(0,'Cowabunga! Both humans run and jump together. Every platform is reachable with one jump. Collect six pizza tokens first.','Both ready — sewer clash!'))return;
 s.frame(dt=>{
  a.left-=dt;a.elapsed+=dt;
  // Small fixed substeps keep landings reliable even when a frame is late.
  const steps=Math.ceil(dt*120),h=dt/steps;for(let k=0;k<steps;k++)for(let i=0;i<2;i++)sewerPlayerStep(a.players[i],h,controls.input[i]);
  for(const i of (a.nextOwner++%2?[1,0]:[0,1]))for(let k=a.coins.length-1;k>=0;k--){const p=a.players[i],c=a.coins[k];if(Math.hypot(p.x-c.x,p.y-28-c.y)<34){a.coins.splice(k,1);p.score++;sound('coin');s.react?.(i,'happy');vibrate(8);}}
  refill(a,s.random);const W=s.W,H=s.H,sx=W/SEWER.W,sy=H/SEWER.H;
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0b1d29');bg.addColorStop(1,'#244c3c');x.fillStyle=bg;x.fillRect(0,0,W,H);
  x.strokeStyle='#78a29622';x.lineWidth=1;for(let yy=48;yy<H;yy+=32)for(let xx=(Math.floor(yy/32)%2)*26;xx<W;xx+=52)x.strokeRect(xx,yy,50,30);
  for(const p of SEWER_PLATFORMS){x.fillStyle='#183331';x.fillRect(p.x*sx,(p.y+6)*sy,p.w*sx,p.h*sy);x.fillStyle='#669b7f';x.fillRect(p.x*sx,p.y*sy,p.w*sx,Math.max(6,p.h*sy));x.fillStyle='#b8d8ab';x.fillRect(p.x*sx,p.y*sy,p.w*sx,3);}
  x.fillStyle='#385f3b';x.fillRect(0,H*.965,W,H*.035);
  for(const c of a.coins){const px=c.x*sx,py=(c.y+Math.sin(a.elapsed*5+c.bob)*4)*sy,r=clamp(Math.min(W,H)*.024,9,19);circle(x,px,py,r,'#ffd661');x.font=`${r*1.5}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText('🍕',px,py);}
  const size=clamp(Math.min(W,H)*.105,34,74);for(let i=0;i<2;i++){const p=a.players[i],px=p.x*sx,py=p.y*sy;x.fillStyle=i?'#fa88bc':'#83c4ff';x.fillRect(px-size*.35,py-5,size*.7,5);s.sprite(x,i,px,py-size*.52,size,{exact:true,mood:p.grounded?'walking':'silly'});}
  x.fillStyle='#071723cc';x.fillRect(0,0,W,Math.min(48,H*.11));x.fillStyle='#fff3b9';x.textAlign='center';x.textBaseline='middle';x.font=`bold ${clamp(W*.025,14,25)}px monospace`;x.fillText(`${Math.ceil(Math.max(0,a.left))}s · FIRST TO ${SEWER.goal}`,W/2,24);
  gestureHint(x,s,controls);s.setScores(a.players.map(p=>p.score));s.status('Drag to run · Flick up / tap to jump · '+s.players.map((p,i)=>p.name+' '+a.players[i].score+'/'+SEWER.goal).join(' · '));
  if(a.left<=0||a.players.some(p=>p.score>=SEWER.goal))s.finish(a.players.map(p=>p.score),'TMNT · Sewer Clash');
 });
}

Object.assign(exports,{SEWER,SEWER_PLATFORMS,sewerState,sewerJump,sewerPlayerStep,sewer});