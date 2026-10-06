const {arcadeRounds}=require("src/engines/arcade.js");
const {clamp, seededRandom}=require("src/utils.js");
const {circle}=require("src/engines/session.js");
const {sound}=require("src/audio.js");
const BRAWL_ATTACKS={punch:{duration:.64,start:.18,end:.34,reach:72,damage:1},kick:{duration:.94,start:.32,end:.54,reach:104,damage:2}};
function beginBrawlAttack(a,kind,direction){
 if(!a||a.hp<=0||a.attack||a.recovery>0||!BRAWL_ATTACKS[kind])return false;
 a.facing=direction<0?-1:1;a.attack={kind,direction:a.facing,age:0,hit:new Set()};return true;
}
function stepBrawlAttack(a,dt){
 a.recovery=Math.max(0,a.recovery-dt);const attack=a.attack;if(!attack)return 0;
 const spec=BRAWL_ATTACKS[attack.kind],before=attack.age;attack.age+=dt;let hits=0;
 // Swept time window catches low-frame-rate hits. A target can be hit once
 // per animation, and only on the selected side of the fighter.
 if(before<=spec.end&&attack.age>=spec.start)for(const enemy of a.enemies){
  const offset=(enemy.x-a.x)*attack.direction;
  if(enemy.hp<=0||attack.hit.has(enemy.id)||offset<8||offset>spec.reach)continue;
  attack.hit.add(enemy.id);enemy.hp-=spec.damage;enemy.stun=.45;enemy.x=clamp(enemy.x+attack.direction*26,10,670);hits++;
  if(enemy.hp<=0)a.score+=10;
 }
 if(attack.age>=spec.duration){a.attack=null;a.recovery=.16;}
 return hits;
}
async function brawler(s){
 const[c,x]=s.canvas(680,400,{fill:true});s.body.classList.add('brawl-arena-body');
 const random=seededRandom(s.seed),wave=Array.from({length:19},(_,i)=>({id:i,at:1+i*1.45,side:random()<.5?-1:1,speed:36+random()*15}));let api,drag=null;
 const attack=(kind,dir)=>{if(s.paused||s.active!==api?.get()?.player)return;const a=api.get();if(beginBrawlAttack(a,kind,dir))sound('shot');};
 const clear=()=>{drag=null;const a=api?.get();if(a)a.keys={};};s.resetOnPause?.(clear);s.on(window,'blur',clear);s.on(window,'resize',clear);
 return arcadeRounds(s,{duration:30,instructions:'The Warriors: defend Coney Island. Drag to move, TAP to punch toward that side, FLICK sideways to kick. Punches are quick; kicks reach farther. Each attack has a wind-up, impact and recovery: tapping faster cannot skip it. Five lives; identical waves for both fighters.',
  reset:()=>({x:340,hp:5,facing:1,attack:null,recovery:0,invuln:0,enemies:[],spawn:0,keys:{}}),
  bind:a=>{api=a;
   s.on(c,'pointerdown',ev=>{if(s.paused||drag||s.active!==api.get()?.player)return;ev.preventDefault();const p0=s.pointer(ev);drag={id:ev.pointerId,start:p0.x,sy:p0.y,x:api.get().x,t0:performance.now(),far:0};s.capture(ev);});
   s.on(c,'pointermove',ev=>{if(s.paused||drag?.id!==ev.pointerId)return;const a=api.get(),pp=s.pointer(ev),next=clamp(drag.x+(pp.x-drag.start)*680/s.W,32,648);drag.far=Math.max(drag.far,Math.hypot(pp.x-drag.start,pp.y-drag.sy));if(!a.attack&&Math.abs(next-a.x)>1)a.facing=next>a.x?1:-1;a.x=next;});
   s.on(c,'pointerup',ev=>{if(drag?.id!==ev.pointerId)return;const d=drag,a=api.get(),p=s.pointer(ev),dur=performance.now()-d.t0,dx=(p.x-d.start)*680/s.W,dy=(p.y-d.sy)*400/s.H;drag=null;s.release(ev);if(s.paused||!a||s.active!==a.player)return;
    // Tap = punch toward the side you tapped; quick horizontal flick = kick that way.
    if(dur<300&&Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.5)attack('kick',dx<0?-1:1);else if(dur<300&&d.far<14*Math.max(1,s.W/340)){const tx=p.x*680/s.W;attack('punch',Math.abs(tx-a.x)<14?a.facing:tx<a.x?-1:1);}});
   for(const type of ['pointercancel','lostpointercapture'])s.on(c,type,ev=>{if(drag?.id===ev.pointerId){drag=null;s.release(ev);}});
   s.on(document,'keydown',ev=>{if(s.paused||ev.repeat)return;const a=api.get();if(!a)return;if(['a','d','ArrowLeft','ArrowRight'].includes(ev.key)){ev.preventDefault();a.keys[ev.key==='a'||ev.key==='ArrowLeft'?'left':'right']=true;}const move={j:['punch',-1],l:['punch',1],u:['kick',-1],o:['kick',1]}[ev.key.toLowerCase()];if(move)attack(...move);});
   s.on(document,'keyup',ev=>{const a=api.get();if(a)a.keys[ev.key==='a'||ev.key==='ArrowLeft'?'left':'right']=false;});s.hint('Drag along the street to move. TAP left or right of your fighter to punch that way; FLICK sideways for a longer kick (two damage). A/D move · J/L punch · U/O kick. Wait for the recovery meter.');},
  step:(a,dt)=>{a.invuln=Math.max(0,a.invuln-dt);const move=(a.keys.right?1:0)-(a.keys.left?1:0);a.x=clamp(a.x+move*190*dt*(a.attack ? .45 : 1),32,648);if(move&&!a.attack)a.facing=move;
   while(a.spawn<wave.length&&wave[a.spawn].at<=a.elapsed){const e=wave[a.spawn++];a.enemies.push({...e,x:e.side<0?15:665,hp:2,stun:0});}
   if(stepBrawlAttack(a,dt))sound('tap');
   for(const e of a.enemies){e.stun=Math.max(0,e.stun-dt);if(e.hp<=0||e.stun>0)continue;e.x+=Math.sign(a.x-e.x)*e.speed*dt;if(Math.abs(e.x-a.x)<28&&a.invuln<=0){a.hp--;a.invuln=1.1;e.x=clamp(e.x+Math.sign(e.x-a.x||1)*95,12,668);sound('lose');}}
   a.enemies=a.enemies.filter(e=>e.hp>0);return a.hp>0;},
  draw:a=>{x.fillStyle='#192233';x.fillRect(0,0,s.W,s.H);x.save();x.scale(s.W/680,s.H/400);
   for(let i=0;i<9;i++){x.fillStyle=i%2?'#293751':'#344057';x.fillRect(i*83,76+(i%3)*17,77,230);x.fillStyle='#edaf5e';for(let j=0;j<3;j++)x.fillRect(i*83+17+j*19,115,8,14);}
   x.fillStyle='#785954';x.fillRect(0,302,680,98);x.strokeStyle='#d4a473';x.lineWidth=3;x.beginPath();x.moveTo(0,320);x.lineTo(680,320);x.stroke();x.fillStyle='#f6d78d';x.font='bold 24px Georgia';x.textAlign='center';x.fillText('CONEY ISLAND · THE WARRIORS',340,40);
   const fighter=(xx,owner,enemy=null)=>{const hero=!enemy,at=hero?a.attack:null,spec=at&&BRAWL_ATTACKS[at.kind],progress=at?at.age/spec.duration:0,impact=at?Math.sin(Math.PI*clamp((at.age-spec.start)/(spec.end-spec.start),0,1)):0,dir=hero?a.facing:Math.sign(a.x-xx);x.save();x.translate(xx,302);circle(x,0,18,24,'#0b111d66');x.strokeStyle=owner?'#fa79aa':'#65b9ff';x.lineWidth=14;x.lineCap='round';x.beginPath();x.moveTo(-11,-6);x.lineTo(-16,20);x.moveTo(11,-6);x.lineTo(at?.kind==='kick'?dir*(25+impact*58):18,at?.kind==='kick'?-10-impact*17:20);x.stroke();x.fillStyle=owner?'#9c2d51':'#255c92';x.fillRect(-18,-63,36,58);x.strokeStyle='#edc0a2';x.lineWidth=11;x.beginPath();x.moveTo(dir*9,-53);x.lineTo(dir*(at?.kind==='punch'?24+impact*49:25),-45-impact*12);x.moveTo(-dir*10,-49);x.lineTo(-dir*24,-30);x.stroke();s.sprite(x,owner,0,-88,64,{exact:true,mood:at?'angry':'normal'});if(at){x.strokeStyle='#fff0ad';x.lineWidth=4;x.beginPath();x.arc(dir*50,-39,20+impact*24,dir>0?-.8:2.3,dir>0?.8:3.9);x.stroke();}if(enemy){x.fillStyle='#ff9387';x.fillRect(-19,-131,enemy.hp*19,5);}x.restore();return progress;};
   for(const enemy of a.enemies)fighter(enemy.x,1-a.player,enemy);fighter(a.x,a.player);x.fillStyle='#fff0cc';x.font='bold 17px monospace';x.textAlign='left';x.fillText(`${a.hp} LIVES`,18,72);x.textAlign='right';x.fillText(`${Math.ceil(a.time)}s`,660,72);
   const spec=a.attack&&BRAWL_ATTACKS[a.attack.kind],ready=!a.attack&&a.recovery<=0;x.fillStyle=ready?'#99f0c0':'#ffc16a';x.font='bold 14px monospace';x.textAlign='center';x.fillText(ready?'READY':a.attack?`${a.attack.kind.toUpperCase()} · ${a.attack.age<spec.start?'WIND UP':a.attack.age<=spec.end?'STRIKE':'RECOVER'}`:'RECOVER',340,378);x.restore();
   s.status(`${s.players[a.player].name} · ${a.score} points · attack toward approaching opponents`);s.debug={actor:a,wave,attack:(kind,dir)=>attack(kind,dir),beginBrawlAttack,stepBrawlAttack};}
 });
}

Object.assign(exports,{BRAWL_ATTACKS,beginBrawlAttack,stepBrawlAttack,brawler});