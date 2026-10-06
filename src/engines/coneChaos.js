// Taskmaster · Cone Chaos: a rule-following whack-a-cone. Things pop up on a 12-spot field; tap only what the
// current rule allows. Four very different colours AND four different shapes, so every rule is readable at a glance.
// Rules escalate (colour, shape, "everything except", colour+shape, colour-changing decoys, a mid-round rule flip,
// a frenzy). The whole pop-up schedule is generated once from the seed, so both players face identical rounds.
const {clamp, seededRandom}=require("src/utils.js");
const {circle}=require("src/engines/session.js");
const {sound, tone, vibrate}=require("src/audio.js");
const {store}=require("src/state.js");

const CONE_COLORS={orange:{fill:'#ff7a00',dark:'#b34f00',name:'ORANGE'},blue:{fill:'#2563ff',dark:'#123a9e',name:'BLUE'},green:{fill:'#1fbf4a',dark:'#0f7a2c',name:'GREEN'},purple:{fill:'#b14dff',dark:'#6d1fb0',name:'PURPLE'}};
const CONE_SHAPES={cone:'CONES',ball:'BALLS',cube:'CUBES',star:'STARS'};
const COLOR_KEYS=Object.keys(CONE_COLORS),SHAPE_KEYS=Object.keys(CONE_SHAPES);
const SLOTS=12,ROUND_INTRO=1.4;
const word=(t,c='#fff')=>({t,c});
const colorWord=k=>word(CONE_COLORS[k].name,CONE_COLORS[k].fill);
const shapeWord=k=>word(CONE_SHAPES[k],'#ffe27a');
// Each rule: banner text segments, a test, and an optional flip half-way through the round.
function coneRules(){
 return [
  {title:'Warm-up',text:[word('Tap only '),colorWord('orange'),word(' cones')],test:o=>o.color==='orange',len:7,gap:[.62,.5],ttl:[2.1,1.8],shapes:['cone']},
  {title:'Shapes',text:[word('Tap every '),shapeWord('cone'),word(' · any colour')],test:o=>o.shape==='cone',len:7.5,gap:[.55,.45],ttl:[1.9,1.6]},
  {title:'Opposite day',text:[word('Tap everything '),word('EXCEPT ','#ff6b6b'),colorWord('blue')],test:o=>o.color!=='blue',len:7.5,gap:[.5,.4],ttl:[1.8,1.5],targetBias:.45},
  {title:'Picky',text:[word('Only '),colorWord('orange'),word(' '),shapeWord('cone')],test:o=>o.color==='orange'&&o.shape==='cone',len:8,gap:[.48,.38],ttl:[1.7,1.4],decoy:o=>o.color==='orange'||o.shape==='cone'},
  {title:'Chameleons',text:[word('Tap '),colorWord('green'),word(' · colours change!','#ffb4e0')],test:o=>o.color==='green',len:8,gap:[.46,.36],ttl:[1.9,1.6],morph:'green'},
  {title:'Rule flip',text:[word('Tap '),shapeWord('star')],test:o=>o.shape==='star',len:9,gap:[.44,.34],ttl:[1.6,1.3],
   flip:{at:.5,text:[word('FLIP! ','#ff6b6b'),word('Everything '),word('EXCEPT ','#ff6b6b'),shapeWord('star')],test:o=>o.shape!=='star'}},
  {title:'Frenzy · double points',text:[word('FRENZY! Tap '),colorWord('orange'),word(' + '),colorWord('blue')],test:o=>o.color==='orange'||o.color==='blue',len:7,gap:[.32,.24],ttl:[1.3,1.05],double:true},
 ];
}
function pick(random,list){return list[Math.floor(random()*list.length)];}
// Deterministic schedule: [{round,t,slot,color,shape,ttl,morph:{at,to}|null}] for every round.
function coneSchedule(seed,rules=coneRules()){const random=seededRandom(seed+'-cones'),out=[];
 rules.forEach((rule,round)=>{const busy=new Array(SLOTS).fill(-1);let t=ROUND_INTRO;
  while(t<rule.len-.35){const k=(t-ROUND_INTRO)/Math.max(.1,rule.len-ROUND_INTRO),gap=rule.gap[0]+(rule.gap[1]-rule.gap[0])*k,ttl=rule.ttl[0]+(rule.ttl[1]-rule.ttl[0])*k;
   const free=[];for(let i=0;i<SLOTS;i++)if(busy[i]<t)free.push(i);
   if(free.length){const slot=pick(random,free),test=rule.flip&&t>=ROUND_INTRO+(rule.len-ROUND_INTRO)*rule.flip.at?rule.flip.test:rule.test,want=random()<(rule.targetBias??.5);let o=null;
    for(let tries=0;tries<40;tries++){const c={color:pick(random,COLOR_KEYS),shape:pick(random,rule.shapes||SHAPE_KEYS)};if(test(c)!==want)continue;if(!want&&rule.decoy&&tries<20&&!rule.decoy(c))continue;o=c;break;}
    if(!o)o={color:pick(random,COLOR_KEYS),shape:pick(random,rule.shapes||SHAPE_KEYS)};
    let morph=null;if(rule.morph&&random()<.45){const other=pick(random,COLOR_KEYS.filter(c=>c!==rule.morph));if(o.color===rule.morph)morph={at:.35+random()*.3,to:other};else{o.color=other;morph={at:.35+random()*.3,to:rule.morph};}}
    out.push({round,t,slot,...o,ttl,morph});busy[slot]=t+ttl+.15;}
   t+=gap*(.8+random()*.4);}
 });return out;}
function drawConeShape(x,shape,color,cx,cy,r,squash=0){const C=CONE_COLORS[color];x.save();x.translate(cx,cy);x.scale(1+squash*.25,1-squash*.25);
 x.fillStyle='#0004';x.beginPath();x.ellipse(0,r*.92,r*.8,r*.18,0,0,Math.PI*2);x.fill();x.lineJoin='round';x.lineWidth=Math.max(2,r*.08);x.strokeStyle=C.dark;x.fillStyle=C.fill;
 if(shape==='cone'){x.beginPath();x.moveTo(0,-r);x.lineTo(r*.62,r*.72);x.lineTo(-r*.62,r*.72);x.closePath();x.fill();x.stroke();x.fillStyle='#fff';x.beginPath();x.moveTo(-r*.27,-r*.1);x.lineTo(r*.27,-r*.1);x.lineTo(r*.36,r*.14);x.lineTo(-r*.36,r*.14);x.closePath();x.fill();x.fillStyle=C.fill;x.fillRect(-r*.9,r*.66,r*1.8,r*.24);x.strokeRect(-r*.9,r*.66,r*1.8,r*.24);}
 else if(shape==='ball'){x.beginPath();x.arc(0,0,r*.82,0,Math.PI*2);x.fill();x.stroke();x.fillStyle='#ffffff88';x.beginPath();x.arc(-r*.28,-r*.3,r*.22,0,Math.PI*2);x.fill();}
 else if(shape==='cube'){const a=r*.7;x.beginPath();x.rect(-a,-a*.7,a*1.6,a*1.6);x.fill();x.stroke();x.fillStyle='#ffffff55';x.beginPath();x.moveTo(-a,-a*.7);x.lineTo(-a*.6,-a*1.1);x.lineTo(a,-a*1.1);x.lineTo(a*.6,-a*.7);x.closePath();x.fill();x.stroke();x.fillStyle=C.dark;x.beginPath();x.moveTo(a*.6,-a*.7);x.lineTo(a,-a*1.1);x.lineTo(a,a*.5);x.lineTo(a*.6,a*.9);x.closePath();x.fill();x.stroke();}
 else{x.beginPath();for(let i=0;i<10;i++){const rr=i%2?r*.42:r*.95,a=-Math.PI/2+i*Math.PI/5;x.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}x.closePath();x.fill();x.stroke();}
 x.restore();}
function drawWords(x,segs,cx,cy,size,maxW){x.font=`900 ${size}px system-ui`;let w=segs.reduce((n,s)=>n+x.measureText(s.t).width,0);if(w>maxW){size*=maxW/w;x.font=`900 ${size}px system-ui`;w=maxW;}
 let px=cx-w/2;x.textAlign='left';x.textBaseline='middle';for(const s of segs){x.lineWidth=Math.max(3,size*.16);x.strokeStyle='#000a';x.strokeText(s.t,px,cy);x.fillStyle=s.c;x.fillText(s.t,px,cy);px+=x.measureText(s.t).width;}}

async function coneChaos(s){
 const[c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');
 const rules=coneRules(),schedule=coneSchedule(s.seed,rules),scores=[0,0],stats=[null,null];
 let actor=0,phase='wait',round=0,clock=0,next=0,items=[],fx=[],combo=0,best=0,shake=0,flash=null,flipped=false;
 const beep=(f,d=.07,v=.04,type='triangle')=>{if(store.profile?.settings.sound)tone(f,d,v,type);};
 const rule=()=>rules[round],activeTest=()=>flipped?rule().flip.test:rule().test,activeText=()=>flipped?rule().flip.text:rule().text;
 const mult=()=>Math.min(4,1+Math.floor(combo/5))*(rule()?.double?2:1);
 function layout(){const W=s.W,H=s.H,top=Math.min(118,H*.2),bottom=Math.min(60,H*.1),portrait=H>W*1.1,cols=portrait?3:4,rows=portrait?4:3,cw=W/cols,ch=(H-top-bottom)/rows;return {W,H,top,bottom,cols,rows,cw,ch,r:Math.min(cw,ch)*.36};}
 function slotPos(slot,L=layout()){const col=slot%L.cols,row=Math.floor(slot/L.cols);return {x:(col+.5)*L.cw,y:L.top+(row+.5)*L.ch};}
 const colorOf=(o,age)=>o.morph&&age>=o.ttl*o.morph.at?o.morph.to:o.color;
 function startRound(i){round=i;clock=0;flipped=false;items=[];flash={text:rules[i].title.toUpperCase(),age:0};sound('handoff');}
 function startTurn(){next=0;combo=0;best=0;stats[actor]={hits:0,wrong:0,missed:0};startRound(0);phase='play';}
 async function endTurn(){phase='handoff';items=[];if(actor===1){const a=stats[0],b=stats[1];return s.finish(scores,`Cone Chaos · ${s.players[0].name} ${a.hits} right/${a.wrong} wrong, ${s.players[1].name} ${b.hits}/${b.wrong}. Same rules and pop-ups for both.`);}
  actor=1;if(await s.pass(1,`${s.players[0].name} scored ${scores[0]} (best combo ${best}). Your turn: same seven rules, same pop-ups. Read the rule bar, tap only what it allows. Wrong taps cost 15 and break your combo.`,'Ready',{countdown:3}))startTurn();}
 function tap(p){if(s.paused||phase!=='play')return;const L=layout();let hit=null,d0=Infinity;
  for(const o of items){if(o.done)continue;const q=slotPos(o.slot,L),d=Math.hypot(p.x-q.x,p.y-q.y);if(d<L.r*1.15&&d<d0){hit=o;d0=d;}}
  if(!hit)return;const age=clock-hit.t,obj={color:colorOf(hit,age),shape:hit.shape},q=slotPos(hit.slot,L);hit.done=true;hit.doneAt=clock;
  if(activeTest(obj)){combo++;best=Math.max(best,combo);const gain=10*mult();scores[actor]+=gain;stats[actor].hits++;hit.good=true;beep(440+Math.min(combo,16)*45,.08,.05);if(combo%5===0){sound('pickup');s.react?.(actor,'happy');}
   fx.push({x:q.x,y:q.y,text:`+${gain}`,color:'#fff',age:0,big:combo>=5});for(let j=0;j<12;j++)fx.push({x:q.x,y:q.y,vx:Math.cos(j*.52)*(120+j*9),vy:Math.sin(j*.52)*(120+j*9)-60,color:CONE_COLORS[obj.color].fill,age:0,spark:true});}
  else{scores[actor]=Math.max(0,scores[actor]-15);stats[actor].wrong++;combo=0;hit.good=false;shake=.3;sound('lose');vibrate(40);s.react?.(actor,'sad');fx.push({x:q.x,y:q.y,text:'-15',color:'#ff5a5a',age:0,cross:true});}
  s.setScores(scores);}
 s.on(c,'pointerdown',ev=>{ev.preventDefault();tap(s.pointer(ev));});
 s.hint('Read the rule bar at the top and tap ONLY the things it allows: colour words, shape words, or "everything except". Each tap that follows the rule scores 10 × your combo multiplier (x2 at 5 in a row, up to x4). Wrong taps cost 15 and reset the combo; letting a right one escape also resets it. Watch for colour-changing decoys and a rule that flips mid-round. Both players get identical rounds.');
 s.frame(dt=>{
  const L=layout(),{W,H}=L;
  if(phase==='play'){clock+=dt;const R=rule();
   if(R.flip&&!flipped&&clock>=ROUND_INTRO+(R.len-ROUND_INTRO)*R.flip.at){flipped=true;flash={text:'RULE FLIP!',age:0,red:true};sound('rare');vibrate(30);}
   while(next<schedule.length&&schedule[next].round===round&&schedule[next].t<=clock)items.push({...schedule[next++],done:false});
   for(const o of items)if(!o.done&&clock-o.t>=o.ttl){o.done=true;o.doneAt=clock;o.expired=true;const age=o.ttl;if(activeTest({color:colorOf(o,age),shape:o.shape})){if(combo>=3)fx.push({...slotPos(o.slot,L),text:'combo lost',color:'#ffb3b3',age:0});combo=0;stats[actor].missed++;}}
   items=items.filter(o=>!o.done||clock-o.doneAt<.3);
   if(clock>=R.len){if(round+1<rules.length)startRound(round+1);else void endTurn();}}
  for(const f of fx){f.age+=dt;if(f.spark){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=500*dt;}}fx=fx.filter(f=>f.age<(f.spark?.6:.8));shake=Math.max(0,shake-dt);if(flash)flash.age+=dt;
  if(!s.alive)return;x.save();if(shake>0)x.translate((Math.random()-.5)*shake*28,(Math.random()-.5)*shake*28);
  // Field: Taskmaster-house lawn with spot markers.
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2f5d3a');g.addColorStop(1,'#1d3d27');x.fillStyle=g;x.fillRect(-20,-20,W+40,H+40);
  for(let i=0;i<SLOTS;i++){const q=slotPos(i,L);x.fillStyle='#ffffff14';x.beginPath();x.ellipse(q.x,q.y+L.r*.9,L.r*.95,L.r*.24,0,0,Math.PI*2);x.fill();}
  for(const o of items){const q=slotPos(o.slot,L),age=clock-o.t,col=colorOf(o,Math.min(age,o.ttl));let scale=Math.min(1,age/.12),alpha=1,squash=0;
   if(o.done){const k=(clock-o.doneAt)/.3;if(o.expired){scale*=1-k;}else if(o.good){scale*=1+k*.5;alpha=1-k;squash=-k;}else{alpha=1-k;squash=k;}}
   if(!o.done&&o.morph&&Math.abs(age-o.ttl*o.morph.at)<.12){x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(q.x,q.y,L.r*1.05,0,Math.PI*2);x.stroke();}
   x.globalAlpha=Math.max(0,alpha);drawConeShape(x,o.shape,col,q.x,q.y,L.r*Math.max(.05,scale),squash);
   if(!o.done){const left=1-age/o.ttl;x.strokeStyle=left<.3?'#ff8080':'#ffffffaa';x.lineWidth=4;x.beginPath();x.arc(q.x,q.y,L.r*1.12,-Math.PI/2,-Math.PI/2+left*Math.PI*2);x.stroke();}
   x.globalAlpha=1;}
  for(const f of fx){const k=f.age/(f.spark?.6:.8);x.globalAlpha=Math.max(0,1-k);if(f.spark)circle(x,f.x,f.y,Math.max(2,L.r*.09),f.color);
   else{if(f.cross){x.strokeStyle='#ff4040';x.lineWidth=8;x.lineCap='round';const a=L.r*.6;x.beginPath();x.moveTo(f.x-a,f.y-a);x.lineTo(f.x+a,f.y+a);x.moveTo(f.x+a,f.y-a);x.lineTo(f.x-a,f.y+a);x.stroke();}
    x.font=`900 ${clamp(L.r*(f.big?.62:.5),14,34)}px system-ui`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=4;x.strokeStyle='#000b';x.strokeText(f.text,f.x,f.y-L.r-k*36);x.fillStyle=f.color;x.fillText(f.text,f.x,f.y-L.r-k*36);}
   x.globalAlpha=1;}
  x.restore();
  // Rule bar: big, coloured words, round progress, the player's head reacting.
  const R=rule();x.fillStyle=flipped?'#5a1020':'#141826';x.fillRect(0,0,W,L.top);
  const head=clamp(L.top*.62,40,72);s.sprite(x,actor,head*.62,L.top*.42,head,{exact:true,mood:shake>0?'sad':combo>=5?'win':'thinking'});
  x.font=`700 ${clamp(L.top*.13,10,15)}px system-ui`;x.textAlign='left';x.textBaseline='middle';x.fillStyle='#aab3c8';x.fillText(`RULE ${round+1}/${rules.length} · ${R.title.toUpperCase()}`,head*1.25,L.top*.2);
  drawWords(x,activeText(),head*1.25+(W-head*1.35)/2,L.top*.5,clamp(L.top*.26,16,34),W-head*1.4);
  if(phase==='play'){const k=clamp(clock/R.len,0,1);x.fillStyle='#ffffff22';x.fillRect(0,L.top-6,W,6);x.fillStyle=flipped?'#ff6b6b':'#ffd166';x.fillRect(0,L.top-6,W*(1-k),6);}
  x.fillStyle='#0b0f18cc';x.fillRect(0,H-L.bottom,W,L.bottom);x.font=`800 ${clamp(L.bottom*.36,13,22)}px system-ui`;x.textBaseline='middle';x.textAlign='left';x.fillStyle='#fff';x.fillText(`${scores[actor]} pts`,14,H-L.bottom/2);
  x.textAlign='right';x.fillStyle=combo>=5?'#ffd166':'#cfd6e6';x.fillText(combo?`combo ${combo} · x${mult()}`:'no combo',W-14,H-L.bottom/2);
  if(flash&&flash.age<1.3&&phase==='play'){const a=flash.age<.15?flash.age/.15:Math.max(0,1-(flash.age-.9)/.4),y=L.top+(H-L.top-L.bottom)/2;x.globalAlpha=a;x.fillStyle=flash.red?'#c0203fdd':'#000c';x.fillRect(0,y-Math.min(90,H*.13),W,Math.min(180,H*.26));
   drawWords(x,[word(flash.text,flash.red?'#fff':'#ffd166')],W/2,y-Math.min(30,H*.045),clamp(W*.07,22,46),W*.9);drawWords(x,activeText(),W/2,y+Math.min(34,H*.05),clamp(W*.05,15,30),W*.92);x.globalAlpha=1;}
  s.status(`${s.players[actor].name} · rule ${round+1}/${rules.length} · ${phase==='play'?Math.ceil(Math.max(0,R.len-clock))+'s':'get ready'} · ${scores[actor]} pts`);
  s.debug={actor,phase,round,clock,flipped,combo,scores,stats,schedule,items:items.filter(o=>!o.done).map(o=>({...slotPos(o.slot,L),color:colorOf(o,clock-o.t),shape:o.shape,r:L.r,good:activeTest({color:colorOf(o,clock-o.t),shape:o.shape})})),tap};
 });
 if(await s.pass(0,`Cone Chaos! Seven quick rules flash up in the bar at the top: tap only the cones, balls, cubes and stars that the rule allows. Combos multiply your points; wrong taps cost 15. Watch for colour-changing decoys and a rule that flips mid-round. ${s.players[1].name} gets the identical rounds next.`,'Ready',{countdown:3}))startTurn();
}

Object.assign(exports,{coneRules,coneSchedule,coneChaos,CONE_COLORS});
