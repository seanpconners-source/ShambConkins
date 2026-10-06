const {arcadeRounds}=require("src/engines/arcade.js");
const {seededRandom}=require("src/utils.js");
const {circle}=require("src/engines/session.js");
const {sound}=require("src/audio.js");
function headHuntCourse(seed){const r=seededRandom(seed);return Array.from({length:17},(_,i)=>({id:i,at:.6+i*1.12,start:r()<.5?-1:1,y:.2+r()*.44,speed:.13+r()*.09,drift:r()*6}));}
function headHuntHit(a,point,W,H){const target=[...a.targets].reverse().find(t=>!t.hit&&Math.hypot(t.x*W-point.x,t.y*H-point.y)<=Math.min(W,H)*.074);if(!target)return false;target.hit=true;target.flash=.24;a.score+=10;return true;}
async function duckturn(s){
 const[c,x]=s.canvas(680,400,{fill:true}),course=headHuntCourse(s.seed);s.body.classList.add('drag-arena-body');let api;
 return arcadeRounds(s,{duration:20,instructions:'Head Hunt: tap the OTHER PLAYER’S flying character heads. Each hit scores ten. Heads bank and bob across the whole sky. Identical target flights for both humans; your turn starts only after Ready and the countdown.',
  reset:()=>({targets:[],spawn:0,lastShot:null}),bind:a=>{api=a;s.controls([]);s.on(c,'pointerdown',ev=>{const a=api.get();if(!a||s.paused||s.active!==a.player)return;const p=s.pointer(ev);a.lastShot={...p,left:.16};const hit=headHuntHit(a,p,s.W,s.H);sound(hit?'win':'tap');if(hit)s.react?.(a.player,'win');});s.hint('Tap opponent heads in the sky. The solid target ring marks the hit area. No translucent ducks.');},
  step:(a,dt)=>{while(a.spawn<course.length&&course[a.spawn].at<=a.elapsed){const t=course[a.spawn++];a.targets.push({...t,x:t.start<0?-.08:1.08,baseY:t.y,age:0,hit:false});}for(const t of a.targets){t.age+=dt;t.x+=-t.start*t.speed*dt;t.y=t.baseY+Math.sin(t.age*2.6+t.drift)*.09;if(t.hit)t.flash-=dt;}a.targets=a.targets.filter(t=>t.x>-.15&&t.x<1.15&&(!t.hit||t.flash>0));if(a.lastShot)a.lastShot.left-=dt;return true;},
  draw:a=>{x.globalAlpha=1;const g=x.createLinearGradient(0,0,0,s.H);g.addColorStop(0,'#6bc6ef');g.addColorStop(1,'#e9f4cc');x.fillStyle=g;x.fillRect(0,0,s.W,s.H);for(let i=0;i<5;i++)circle(x,(i+.2)*s.W/5,s.H*.15+(i%2)*40,30,'#fff');x.fillStyle='#4d9656';x.fillRect(0,s.H*.86,s.W,s.H*.14);const size=Math.min(s.W,s.H)*.14;
   for(const t of a.targets){const px=t.x*s.W,py=t.y*s.H;x.save();x.globalAlpha=1;circle(x,px,py,size*.54,t.hit?'#ffe39b':'#143052');x.strokeStyle=t.hit?'#ffdd75':'#fff';x.lineWidth=3;x.beginPath();x.arc(px,py,size*.54,0,Math.PI*2);x.stroke();s.sprite(x,1-a.player,px,py,size,{exact:true,mood:t.hit?'sad':'happy'});if(t.hit){x.fillStyle='#172b41';x.font='bold 19px monospace';x.textAlign='center';x.fillText('+10',px,py-size*.75);}x.restore();}
   if(a.lastShot?.left>0){const p=a.lastShot;x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(p.x,p.y,17,0,Math.PI*2);x.moveTo(p.x-24,p.y);x.lineTo(p.x+24,p.y);x.moveTo(p.x,p.y-24);x.lineTo(p.x,p.y+24);x.stroke();}s.sprite(x,a.player,s.W*.08,s.H*.91,size*.7,{exact:true});x.fillStyle='#142c43';x.textAlign='center';x.font='bold 20px monospace';x.fillText(`${s.players[a.player].name} · ${a.score} · ${Math.ceil(a.time)}s`,s.W/2,28);s.status('Tap '+s.players[1-a.player].name+'’s heads');s.debug={actor:a,course,headHuntHit};}
 });
}

Object.assign(exports,{headHuntCourse,headHuntHit,duckturn});