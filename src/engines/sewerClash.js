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
  // TMNT sewer: brick arches, pipes dripping ooze, toxic river, steel grates, pizza slices, turtle shells
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0a1410');bg.addColorStop(1,'#16302a');x.fillStyle=bg;x.fillRect(0,0,W,H);
  x.fillStyle='#2a3a30';for(let yy=40;yy<H;yy+=22)for(let xx=(Math.floor(yy/22)%2)*24;xx<W;xx+=48){x.fillRect(xx+1,yy+1,46,20);}
  x.fillStyle='#0a1410aa';for(let q=0;q<Math.ceil(W/220)+1;q++){const ax=q*220+110;x.beginPath();x.moveTo(ax-90,H);x.lineTo(ax-90,H*.45);x.arc(ax,H*.45,90,Math.PI,0);x.lineTo(ax+90,H);x.fill();}
  for(let q=0;q<Math.ceil(W/180)+1;q++){const px=q*180+60;x.fillStyle='#4a5a52';x.fillRect(px,40,22,H*.18);x.fillStyle='#5f7268';x.fillRect(px-4,40+H*.18,30,10);const drip=((a.elapsed*1.4+q*.37)%1);x.fillStyle='#7dff6a';x.globalAlpha=1-drip;x.beginPath();x.arc(px+11,40+H*.18+12+drip*H*.5,4,0,Math.PI*2);x.fill();x.globalAlpha=1;}
  const riverY=H*.94;x.fillStyle='#2fae3a';x.fillRect(0,riverY,W,H-riverY);x.fillStyle='#7dff6a66';for(let xx=0;xx<W;xx+=24){x.beginPath();x.arc(xx+((a.elapsed*30)%24),riverY+2,8,Math.PI,0);x.fill();}
  x.save();x.shadowColor='#7dff6a';x.shadowBlur=20;x.fillStyle='#7dff6a33';x.fillRect(0,riverY-6,W,6);x.restore();
  for(const p of SEWER_PLATFORMS){const X=p.x*sx,Y=p.y*sy,w=p.w*sx,h=Math.max(10,p.h*sy);x.fillStyle='#000a';x.fillRect(X+4,Y+6,w,h);x.fillStyle='#4a525c';x.fillRect(X,Y,w,h);x.fillStyle='#6a737e';x.fillRect(X,Y,w,3);
   x.strokeStyle='#2a3038';x.lineWidth=1;for(let gx=X+6;gx<X+w;gx+=8){x.beginPath();x.moveTo(gx,Y+4);x.lineTo(gx,Y+h-2);x.stroke();}
   for(let hx=X;hx<X+w;hx+=14){x.fillStyle=(Math.floor((hx-X)/14))%2?'#ffd23f':'#1a1a1a';x.fillRect(hx,Y+h-3,14,3);}}
  for(const c of a.coins){const px=c.x*sx,py=(c.y+Math.sin(a.elapsed*5+c.bob)*4)*sy,r=clamp(Math.min(W,H)*.03,11,22);x.save();x.translate(px,py);x.rotate(Math.sin(a.elapsed*3+c.bob)*.3);x.shadowColor='#ffd23f';x.shadowBlur=12;
   x.fillStyle='#f2b84a';x.beginPath();x.moveTo(0,r);x.lineTo(-r*.9,-r*.6);x.quadraticCurveTo(0,-r*1.05,r*.9,-r*.6);x.closePath();x.fill();x.shadowBlur=0;x.fillStyle='#c8762a';x.beginPath();x.moveTo(-r*.9,-r*.6);x.quadraticCurveTo(0,-r*1.05,r*.9,-r*.6);x.lineTo(r*.8,-r*.4);x.quadraticCurveTo(0,-r*.82,-r*.8,-r*.4);x.closePath();x.fill();
   x.fillStyle='#c8202a';for(const [ox,oy] of [[-.3,-.2],[.25,-.15],[0,.25]]){x.beginPath();x.arc(ox*r,oy*r,r*.15,0,Math.PI*2);x.fill();}x.restore();}
  const size=clamp(Math.min(W,H)*.115,46,78),mask=['#2a62d8','#d8323a'];for(let i=0;i<2;i++){const p=a.players[i],px=p.x*sx,py=p.y*sy;
   x.fillStyle='#000a';x.beginPath();x.ellipse(px,py,size*.35,size*.08,0,0,Math.PI*2);x.fill();x.fillStyle='#3c8a2a';x.beginPath();x.ellipse(px,py-size*.28,size*.32,size*.3,0,0,Math.PI*2);x.fill();x.fillStyle='#8a5a2a';x.beginPath();x.ellipse(px+(p.vx||0)*-.002*size,py-size*.3,size*.24,size*.24,0,0,Math.PI*2);x.fill();x.strokeStyle='#5a3a1a';x.lineWidth=1.5;x.stroke();
   s.sprite(x,i,px,py-size*.72,size,{exact:true,mood:p.grounded?'walking':'silly'});x.fillStyle=mask[i];x.fillRect(px-size*.36,py-size*.82,size*.72,size*.1);x.beginPath();x.moveTo(px+size*.34,py-size*.8);x.lineTo(px+size*.55,py-size*.72+Math.sin(a.elapsed*12+i)*3);x.lineTo(px+size*.34,py-size*.74);x.fill();}
  x.fillStyle='#071723cc';x.fillRect(0,0,W,Math.min(48,H*.11));x.fillStyle='#fff3b9';x.textAlign='center';x.textBaseline='middle';x.font=`bold ${clamp(W*.025,14,25)}px monospace`;{const narrow=W<640,fs=clamp(W*.025,13,24),parts=[[s.players[0].name.slice(0,narrow?6:12)+' '+a.players[0].score,'#6fa0ff'],['  '+Math.ceil(Math.max(0,a.left))+'s  ','#fff3b9'],[a.players[1].score+' '+s.players[1].name.slice(0,narrow?6:12),'#ff7a7a']];x.font=`bold ${fs}px monospace`;const tw=parts.reduce((t,q)=>t+x.measureText(q[0]).width,0);let tx=narrow?12:W/2-tw/2;x.textAlign='left';for(const [t,c] of parts){x.fillStyle=c;x.fillText(t,tx,24);tx+=x.measureText(t).width;}if(!narrow){x.fillStyle='#fff3b988';x.font=`bold ${fs*.6}px monospace`;x.textAlign='center';x.fillText('FIRST TO '+SEWER.goal+' SLICES',W/2,Math.min(48,H*.11)-6);}}
  gestureHint(x,s,controls);s.setScores(a.players.map(p=>p.score));s.status('Drag to run · Flick up / tap to jump · '+s.players.map((p,i)=>p.name+' '+a.players[i].score+'/'+SEWER.goal).join(' · '));
  if(a.left<=0||a.players.some(p=>p.score>=SEWER.goal))s.finish(a.players.map(p=>p.score),'TMNT · Sewer Clash');
 });
}

Object.assign(exports,{SEWER,SEWER_PLATFORMS,sewerState,sewerJump,sewerPlayerStep,sewer});