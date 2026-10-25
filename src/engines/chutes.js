// Chutes and Ladders games.
//  'climb':   Ladder Rush. Both players at once on split halves: tap to climb a rung, swipe sideways to switch between
//             three ladders. Chute mouths (pictures of misbehaving kids) slide you down; good-deed stars boost you up.
//             Same seeded layout for both. First to rung 100, or the highest after 45 seconds.
//             Online (netField): each phone climbs its own ladders full screen, timed by its own race clock; the other
//             climber shows as a line from snapshots {rung,best,finished,finishT}. Both phones end from both finals; a
//             phone already past the other's finish time ends at once.
//  'spinner': Spinner Showdown on the classic 10×10 board (Milton Bradley ladders and chutes). Take turns stopping
//             the spinner: timing is the skill. First to square 100, or the furthest after 12 spins each.
const {clamp}=require("src/utils.js");
const {Fx,arenaKeys,arenaTouch,snd,noise,jingle,outlined,rr,FONT,PCOL,settle,Countdown}=require("src/engines/arenaKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {netField}=require("src/engines/netField.js");

const INK='#24402a',RACE_TIME=45,TOP=100,SPINS=12;
const LADDERS={1:38,4:14,9:31,21:42,28:84,36:44,51:67,71:91,80:100};
const CHUTES={16:6,47:26,49:11,56:53,62:19,64:60,87:24,93:73,95:75,98:78};
const BAD=['🍪','🪟','🧹','🎨','🩹'],GOOD=['🌻','🛒','🧸','🎁'];

async function chutes(s){
 const mode=s.game.chutesMode==='spinner'?'spinner':'climb';
 const [c,x]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 if(!await settle(s))return;
 const fx=new Fx();let t=0,phase='count',endT=0,endText='';const cd=new Countdown(3);

 if(mode==='climb'){
  const side=()=>s.W>s.H*1.05,vp=i=>nf&&i===nf.me?{x:0,y:0,w:s.W,h:s.H}:side()?{x:i?s.W/2+2:0,y:0,w:s.W/2-2,h:s.H}:{x:0,y:i?s.H/2+2:0,w:s.W,h:s.H/2-2},owner=p=>side()?(p.x<s.W/2?0:1):(p.y<s.H/2?0:1);
  s.hint('Ladder Rush: tap your half to climb one rung; swipe left or right to hop to the next ladder. Chute mouths (a kid misbehaving) slide you down, so switch ladders before you reach one; good-deed stars send you up. First to rung 100 wins, or the highest after 45 seconds. P1 W climb + A/D; P2 Up climb + Left/Right.');
  // layout: per rung, which lanes hold a chute (drop) or a good deed (boost)
  const hazard=[];for(let r=0;r<=TOP;r++)hazard.push([null,null,null]);
  for(let r=8;r<TOP-3;r+=3+Math.floor(s.random()*3)){const lane=Math.floor(s.random()*3);hazard[r][lane]={kind:'chute',drop:6+Math.floor(s.random()*6),icon:BAD[Math.floor(s.random()*BAD.length)]};
   if(s.random()<.35){const l2=(lane+1+Math.floor(s.random()*2))%3;hazard[r][l2]={kind:'chute',drop:5+Math.floor(s.random()*4),icon:BAD[Math.floor(s.random()*BAD.length)]};}
   if(s.random()<.3){const free=[0,1,2].filter(l=>!hazard[r+1]?.[l]);if(free.length&&r+1<TOP)hazard[r+1][free[Math.floor(s.random()*free.length)]]={kind:'deed',boost:4+Math.floor(s.random()*3),icon:GOOD[Math.floor(s.random()*GOOD.length)]};}}
  let netEnd=null;const nf=netField(s,{pack:i=>({rung:P[i].rung,best:P[i].best,finished:P[i].finished,finishT:+P[i].finishT.toFixed(3)}),unpack:(i,d)=>{Object.assign(P[i],{rung:+d.rung||0,best:+d.best||0,finished:!!d.finished,finishT:+d.finishT||0});}});
  const P=[0,1].map(()=>({rung:0,lane:1,shown:0,laneShown:1,anim:0,queue:0,slide:0,finished:false,finishT:0,mood:0,best:0}));let clock=0,winner=-1;
  const climb=i=>{const p=P[i];if(phase!=='play'||p.finished||p.slide>0)return;if(p.anim>0){p.queue=Math.min(1,p.queue+1);return;}step(i);};
  const step=i=>{const p=P[i];p.rung=Math.min(TOP,p.rung+1);p.anim=.11;snd(520+p.rung*4,.04,{type:'triangle',vol:.025});const h=hazard[p.rung]?.[p.lane];
   if(h?.kind==='chute'){p.slide=.7;p.rung=Math.max(0,p.rung-h.drop);p.queue=0;noise(.4,{vol:.05,freq:900});snd(700,.5,{type:'triangle',vol:.03,to:200});s.react(i,'sad');fx.pop(vp(i).x+vp(i).w/2,vp(i).y+vp(i).h*.3,`DOWN THE CHUTE −${h.drop}`,{color:'#ff6a5a',stroke:'#fff',size:20});}
   else if(h?.kind==='deed'){p.rung=Math.min(TOP,p.rung+h.boost);p.anim=.3;jingle([659,880,1175],{step:.05,type:'triangle',vol:.035});s.react(i,'happy');fx.pop(vp(i).x+vp(i).w/2,vp(i).y+vp(i).h*.3,`GOOD DEED +${h.boost}`,{color:'#ffd21c',stroke:INK,size:20});}
   p.best=Math.max(p.best,p.rung);if(p.rung>=TOP&&!p.finished){p.finished=true;p.finishT=clock;if(nf){nf.push();return;}if(winner<0){winner=i;s.react(i,'win');jingle([523,659,784,1047,1319],{step:.09,type:'triangle',vol:.04});}}};
  const lane=(i,d)=>{const p=P[i];if(phase!=='play'||p.finished||p.slide>0)return;const n=clamp(p.lane+d,0,2);if(n!==p.lane){p.lane=n;snd(380,.05,{type:'square',vol:.02});}};
  arenaTouch(s,{owner:pt=>nf?nf.me:owner(pt),maxFingers:2,onUp:f=>{if(f.moved>26&&Math.abs(f.x-f.sx)>Math.abs(f.y-f.sy))lane(f.owner,f.x>f.sx?1:-1);else if(f.moved<26)climb(f.owner);}});
  const kb=arenaKeys(s);kb.onDown((i,k)=>{if(nf)i=nf.me;if(k==='u'||k==='fire')climb(i);else if(k==='l')lane(i,-1);else if(k==='r')lane(i,1);});
  s.debug={P,hazard,get phase(){return phase;},climb,lane,setClock(v){clock=v;},bot:nf?()=>{const p=P[nf.me];if(phase!=='play'||p.finished||netEnd)return '';if(hazard[p.rung+1]?.[p.lane]?.kind==='chute'){const l=[0,1,2].find(l=>hazard[p.rung+1]?.[l]?.kind!=='chute');if(l!==undefined){lane(nf.me,Math.sign(l-p.lane));return 'lane';}}for(let k=0;k<3;k++)climb(nf.me);return 'climb';}:null};
  // vs CPU: climber 2 taps up at a steady pace and hops ladders when a chute is a rung or two ahead (it spots them less often on Easy)
  const cpu=isCpu(s);let cpuT=.5;
  const cpuClimb=dt=>{const p=P[1],sk=cpuSkill(s);if(p.finished||p.slide>0||p.anim>0||p.queue>0)return;cpuT-=dt;if(cpuT>0)return;cpuT=1/(3.5+sk*4.5)*(.8+Math.random()*.4);
   const at=(l,k=1)=>hazard[p.rung+k]?.[l]?.kind,spot=Math.random()<.45+sk*.55;
   if(spot&&at(p.lane)==='chute'){const safe=[0,1,2].filter(l=>at(l)!=='chute').sort((a,b)=>Math.abs(a-p.lane)-Math.abs(b-p.lane));if(safe.length){lane(1,Math.sign(safe[0]-p.lane));return;}}
   if(spot&&sk>.5){const deed=[p.lane-1,p.lane+1].find(l=>at(l)==='deed');if(deed!==undefined){lane(1,deed-p.lane);return;}}climb(1);};
  s.frame(dt=>{t+=dt;fx.update(dt);
   if(phase==='count'){if(!cd.update(dt))phase='play';}
   else if(phase==='play'&&nf){clock+=dt;nf.tick(dt);const p=P[nf.me],r=P[nf.remote];if(p.anim>0){p.anim-=dt;if(p.anim<=0&&p.queue>0){p.queue--;step(nf.me);}}if(p.slide>0)p.slide-=dt;
    if(!netEnd&&(p.finished||clock>=RACE_TIME||r.finished&&clock>r.finishT)){netEnd='wait';nf.finish({best:p.best,finished:p.finished,finishT:p.finishT});nf.remoteDone().then(f=>{if(f)Object.assign(r,{best:+f.best||0,finished:!!f.finished,finishT:+f.finishT||0});netEnd='done';});}
    if(netEnd==='done'){const fin=[0,1].filter(i=>P[i].finished).sort((a,b)=>P[a].finishT-P[b].finishT);winner=fin.length?fin[0]:P[0].best===P[1].best?-2:P[0].best>P[1].best?0:1;if(winner>=0){s.react(winner,'win');jingle([523,659,784,1047,1319],{step:.09,type:'triangle',vol:.04});}phase='end';endT=0;
     endText=winner===-2?'NECK AND NECK!':P[winner].finished?`${s.players[winner].name.toUpperCase()} REACHES 100!`:`${s.players[winner].name.toUpperCase()} CLIMBED HIGHEST!`;}}
   else if(phase==='play'){clock+=dt;if(cpu)cpuClimb(dt);for(let i=0;i<2;i++){const p=P[i];if(p.anim>0){p.anim-=dt;if(p.anim<=0&&p.queue>0){p.queue--;step(i);}}if(p.slide>0)p.slide-=dt;}
    if(winner>=0||clock>=RACE_TIME){phase='end';endT=0;if(winner<0){const a=P[0].best,b=P[1].best;winner=a===b?-2:a>b?0:1;}endText=winner===-2?'NECK AND NECK!':`${s.players[winner].name.toUpperCase()} REACHES 100!`;if(winner>=0&&!P[winner].finished)endText=`${s.players[winner].name.toUpperCase()} CLIMBED HIGHEST!`;}}
   else{endT+=dt;if(endT>2.8){const sc=[P[0].best,P[1].best];s.finish(sc,`Ladder Rush: ${s.players[0].name} rung ${sc[0]}, ${s.players[1].name} rung ${sc[1]}.`);return;}}
   s.setScores([P[0].best,P[1].best]);
   x.fillStyle='#fff';x.fillRect(0,0,s.W,s.H);
   for(let i=0;i<2;i++){if(nf&&i!==nf.me)continue;const v=vp(i),p=P[i];p.shown+=(p.rung-p.shown)*Math.min(1,dt*(p.slide>0?5:14));p.laneShown+=(p.lane-p.laneShown)*Math.min(1,dt*16);
    x.save();x.beginPath();x.rect(v.x,v.y,v.w,v.h);x.clip();
    const g=x.createLinearGradient(0,v.y,0,v.y+v.h);g.addColorStop(0,'#9fd8ff');g.addColorStop(1,'#d8f2c8');x.fillStyle=g;x.fillRect(v.x,v.y,v.w,v.h);
    const gap=v.h/(side()?11:8.5),baseY=v.y+v.h*.78,ry=r=>baseY-(r-p.shown)*gap,lx=l=>v.x+v.w*(.22+l*.28),lw=Math.min(v.w*.16,gap*1.7);
    for(let r=Math.max(0,Math.floor(p.shown-3));r<=Math.min(TOP,Math.ceil(p.shown+10));r++){const y=ry(r);if(r%10===0){x.fillStyle='rgba(36,64,42,.12)';x.fillRect(v.x,y-gap/2,v.w,gap);outlined(x,String(r),v.x+v.w*.06,y,{size:Math.max(11,gap*.32),fill:'#fff',stroke:INK});}}
    for(let l=0;l<3;l++){const cx=lx(l);x.strokeStyle='#b07a3a';x.lineWidth=Math.max(4,lw*.12);x.beginPath();x.moveTo(cx-lw/2,v.y);x.lineTo(cx-lw/2,v.y+v.h);x.moveTo(cx+lw/2,v.y);x.lineTo(cx+lw/2,v.y+v.h);x.stroke();
     for(let r=Math.max(0,Math.floor(p.shown-3));r<=Math.min(TOP,Math.ceil(p.shown+10));r++){const y=ry(r);x.strokeStyle=r===TOP?'#ffd21c':'#d9a75c';x.lineWidth=Math.max(3,lw*.09);x.beginPath();x.moveTo(cx-lw/2,y);x.lineTo(cx+lw/2,y);x.stroke();
      const h=hazard[r]?.[l];if(!h)continue;if(h.kind==='chute'){x.save();x.globalAlpha=.92;x.strokeStyle='#e8543a';x.lineWidth=lw*.55;x.lineCap='round';x.beginPath();x.moveTo(cx,y);x.quadraticCurveTo(cx+lw*1.2,y+gap*h.drop*.3,cx+lw*.35,y+gap*Math.min(h.drop,6));x.stroke();x.strokeStyle='rgba(255,255,255,.6)';x.lineWidth=lw*.12;x.stroke();x.restore();
        x.fillStyle='#e8543a';x.beginPath();x.arc(cx,y,lw*.42,0,7);x.fill();x.strokeStyle='#fff';x.lineWidth=2;x.stroke();x.font=`${lw*.5}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText(h.icon,cx,y);}
      else{x.fillStyle='#ffd21c';x.beginPath();for(let k=0;k<10;k++){const rr0=k%2?lw*.2:lw*.46,a=k*Math.PI/5-Math.PI/2+t;x.lineTo(cx+Math.cos(a)*rr0,y+Math.sin(a)*rr0);}x.closePath();x.fill();x.font=`${lw*.34}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText(h.icon,cx,y+1);}}}
    if(p.shown>TOP-9){const y=ry(TOP)-gap*.9;outlined(x,'🏁 100',v.x+v.w/2,y,{size:gap*.5,fill:'#ffd21c',stroke:INK});}
    const cx=v.x+v.w*(.22+p.laneShown*.28),cy=baseY-gap*.15,hs=Math.min(gap*1.5,v.w*.2),sw=Math.sin(p.anim*28);
    x.strokeStyle='#f6c890';x.lineWidth=Math.max(3,hs*.07);x.lineCap='round';x.beginPath();x.moveTo(cx-hs*.18,cy+hs*.05);x.lineTo(cx-lw/2,cy-gap*(.6+sw*.2));x.moveTo(cx+hs*.18,cy+hs*.05);x.lineTo(cx+lw/2,cy-gap*(.6-sw*.2));x.stroke();
    x.strokeStyle=PCOL[i];x.lineWidth=Math.max(4,hs*.1);x.beginPath();x.moveTo(cx,cy+hs*.25);x.lineTo(cx,cy+hs*.55);x.moveTo(cx,cy+hs*.55);x.lineTo(cx-lw/2,cy+gap*(.9-sw*.2));x.moveTo(cx,cy+hs*.55);x.lineTo(cx+lw/2,cy+gap*(.9+sw*.2));x.stroke();
    s.sprite(x,i,cx,cy,hs,{exact:true,mood:p.slide>0?'sad':p.finished?'win':undefined});
    const size=Math.max(14,Math.min(v.w,v.h)*.055);outlined(x,`${s.players[i].name.toUpperCase()}  ${p.best}`,v.x+10,v.y+size,{size,fill:PCOL[i],stroke:'#fff',align:'left'});
    outlined(x,`${Math.ceil(Math.max(0,RACE_TIME-clock))}s`,v.x+v.w-10,v.y+size,{size:size*.85,fill:'#fff',stroke:INK,align:'right'});
    x.restore();}
   if(nf){const r=P[nf.remote],size=Math.max(14,Math.min(s.W,s.H)*.045),bw=s.W*.5,bx=s.W*.25,by=size*3.8;x.fillStyle='rgba(36,64,42,.35)';x.fillRect(bx,by,bw,8);x.fillStyle=PCOL[nf.remote];x.fillRect(bx,by,bw*Math.min(1,r.rung/TOP),8);outlined(x,`${s.players[nf.remote].name.toUpperCase()} ${r.finished?'🏁 100':r.rung}`,s.W/2,by-size*.6,{size:size*.8,fill:PCOL[nf.remote],stroke:'#fff'});if(netEnd==='wait')outlined(x,`Waiting for ${s.players[nf.remote].name}…`,s.W/2,s.H*.4,{size,fill:'#fff',stroke:INK});}
   else{x.fillStyle=INK;if(side())x.fillRect(s.W/2-2,0,4,s.H);else x.fillRect(0,s.H/2-2,s.W,4);}
   fx.draw(x);if(phase==='count')cd.draw(x,s.W,s.H);
   if(phase==='end'){const size=Math.min(s.W*.06,s.H*.06,44);x.fillStyle='rgba(36,64,42,.75)';x.fillRect(0,s.H/2-size,s.W,size*2);outlined(x,endText,s.W/2,s.H/2,{size,fill:'#ffd21c',stroke:INK});}
  });
  return;
 }

 // ---------------- Spinner Showdown on the classic board
 s.hint('Spinner Showdown on the classic Chutes and Ladders board. On your turn, tap (or press Space/Enter) to stop the spinning arrow: your pawn moves that many squares. Ladders climb, chutes slide. First to square 100 wins, or the furthest after twelve spins each.');
 const pos=[0,0],spins=[0,0],draw=[0,0];let turn=0,state='ready',angle=0,spinV=0,result=0,moveLeft=0,moveT=0,jumpT=0,jumpFrom=0,jumpTo=0,msg='',msgT=0,winner=-1;
 const sq=(n,L)=>{const k=Math.max(1,Math.min(100,n))-1,row=Math.floor(k/10),col=row%2?9-k%10:k%10;return {x:L.bx+col*L.cell+L.cell/2,y:L.by+(9-row)*L.cell+L.cell/2};};
 const layout=()=>{const wide=s.W>s.H*1.05,size=wide?Math.min(s.H*.94,s.W*.6):Math.min(s.W*.96,s.H*.6),cell=size/10,bx=wide?s.W*.03:(s.W-size)/2,by=wide?(s.H-size)/2:s.H*.03;
  return {cell,bx,by,size,sx:wide?bx+size+(s.W-bx-size)/2:s.W/2,sy:wide?s.H*.56:by+size+(s.H-by-size)*.55,sr:wide?Math.min((s.W-bx-size)*.36,s.H*.26):Math.min(s.W*.26,(s.H-by-size)*.36),wide};};
 const say=(m,d=1.4)=>{msg=m;msgT=d;};
 const tap=()=>{if(phase!=='play'||winner>=0)return;if(state==='ready'){state='spin';spinV=10.5;snd(400,.06,{type:'square',vol:.03});return;}if(state==='spin'&&spinV>9){state='stop';snd(600,.06,{type:'square',vol:.03});}};
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();tap();});
 s.on(document,'keydown',ev=>{if(s.paused||!s.alive||ev.repeat)return;if([' ','enter','w','arrowup'].includes(ev.key.toLowerCase())){ev.preventDefault();tap();}});
 s.debug={pos,spins,get state(){return state;},get turn(){return turn;},tap,get phase(){return phase;}};
 say(`${s.players[0].name.toUpperCase()} SPINS FIRST`,1.8);
 s.frame(dt=>{t+=dt;fx.update(dt);if(msgT>0)msgT-=dt;const L=layout();
  if(phase==='count'){if(!cd.update(dt))phase='play';}
  else if(phase==='play'){
   if(state==='spin')angle+=spinV*dt;
   if(state==='stop'){angle+=spinV*dt;spinV*=Math.pow(.02,dt);if(spinV<.25){spinV=0;const a=((angle%(Math.PI*2))+Math.PI*2)%(Math.PI*2);result=Math.floor(a/(Math.PI/3))+1;state='move';moveLeft=result;moveT=.1;spins[turn]++;say(`${result}!`,1);snd(880,.12,{type:'square',vol:.035});}}
   if(state==='move'){moveT-=dt;if(moveT<=0){if(moveLeft>0){pos[turn]=Math.min(100,pos[turn]+1);moveLeft--;moveT=.2;snd(500+pos[turn]*5,.05,{type:'triangle',vol:.03});if(pos[turn]>=100)moveLeft=0;}
     else{const p=pos[turn];if(LADDERS[p]){state='jump';jumpFrom=p;jumpTo=LADDERS[p];jumpT=0;jingle([523,659,784,1047],{step:.06,type:'triangle',vol:.035});say('LADDER!',1.2);s.react(turn,'happy');}
      else if(CHUTES[p]){state='jump';jumpFrom=p;jumpTo=CHUTES[p];jumpT=0;snd(800,.6,{type:'triangle',vol:.03,to:150});say('CHUTE!',1.2);s.react(turn,'sad');}
      else state='next';}}}
   if(state==='jump'){jumpT+=dt;if(jumpT>=.9){pos[turn]=jumpTo;state='next';}}
   if(state==='next'){if(pos[turn]>=100){winner=turn;phase='end';endT=0;endText=`${s.players[turn].name.toUpperCase()} REACHES 100!`;jingle([523,659,784,1047,1319,1568],{step:.09,type:'triangle',vol:.04});s.react(turn,'win');}
    else if(spins[0]>=SPINS&&spins[1]>=SPINS){phase='end';endT=0;winner=pos[0]===pos[1]?-2:pos[0]>pos[1]?0:1;endText=winner===-2?'DEAD EVEN!':`${s.players[winner].name.toUpperCase()} IS FURTHEST!`;}
    else{turn=1-turn;state='ready';say(`${s.players[turn].name.toUpperCase()}’S SPIN`,1.2);}}}
  else{endT+=dt;if(endT>2.8){s.finish([pos[0],pos[1]],`Spinner Showdown: ${s.players[0].name} square ${pos[0]}, ${s.players[1].name} square ${pos[1]}.`);return;}}
  s.setScores(pos);
  // board
  x.fillStyle='#e8f6dc';x.fillRect(0,0,s.W,s.H);
  for(let n=1;n<=100;n++){const p=sq(n,L),cx0=Math.round((p.x-L.bx)/L.cell-.5),cy0=Math.round((p.y-L.by)/L.cell-.5);x.fillStyle=(cx0+cy0)%2?'#fff5c2':'#bfe6ff';if(n===100)x.fillStyle='#ffd21c';x.fillRect(p.x-L.cell/2,p.y-L.cell/2,L.cell,L.cell);x.fillStyle='rgba(36,64,42,.55)';x.font=`700 ${Math.max(8,L.cell*.24)}px ${FONT}`;x.textAlign='left';x.textBaseline='top';x.fillText(String(n),p.x-L.cell/2+3,p.y-L.cell/2+2);}
  x.strokeStyle=INK;x.lineWidth=3;x.strokeRect(L.bx,L.by,L.size,L.size);
  for(const [a,b] of Object.entries(LADDERS)){const A=sq(+a,L),B=sq(b,L),dx=B.x-A.x,dy=B.y-A.y,len=Math.hypot(dx,dy),nx=-dy/len*L.cell*.16,ny=dx/len*L.cell*.16;x.strokeStyle='#9a6a2a';x.lineWidth=Math.max(2,L.cell*.07);x.beginPath();x.moveTo(A.x+nx,A.y+ny);x.lineTo(B.x+nx,B.y+ny);x.moveTo(A.x-nx,A.y-ny);x.lineTo(B.x-nx,B.y-ny);x.stroke();x.lineWidth=Math.max(1.5,L.cell*.05);for(let k=1;k<len/(L.cell*.3);k++){const f=k*L.cell*.3/len;x.beginPath();x.moveTo(A.x+dx*f+nx,A.y+dy*f+ny);x.lineTo(A.x+dx*f-nx,A.y+dy*f-ny);x.stroke();}}
  for(const [a,b] of Object.entries(CHUTES)){const A=sq(+a,L),B=sq(b,L),mx=(A.x+B.x)/2+L.cell*.8,my=(A.y+B.y)/2;x.strokeStyle='rgba(232,84,58,.85)';x.lineWidth=L.cell*.28;x.lineCap='round';x.beginPath();x.moveTo(A.x,A.y);x.quadraticCurveTo(mx,my,B.x,B.y);x.stroke();x.strokeStyle='rgba(255,255,255,.7)';x.lineWidth=L.cell*.06;x.setLineDash([L.cell*.15,L.cell*.15]);x.stroke();x.setLineDash([]);}
  // pawns
  for(let i=0;i<2;i++){let p=sq(Math.max(1,pos[i]),L);if(pos[i]===0)p={x:L.bx-L.cell*.1+(i?L.cell*.6:0),y:L.by+L.size+L.cell*.1};if(state==='jump'&&turn===i){const A=sq(jumpFrom,L),B=sq(jumpTo,L),k=Math.min(1,jumpT/.9),e=k<.5?2*k*k:1-(-2*k+2)**2/2;p={x:A.x+(B.x-A.x)*e,y:A.y+(B.y-A.y)*e-Math.sin(k*Math.PI)*L.cell*.5};}
   const off=pos[0]===pos[1]&&pos[0]>0?(i?.18:-.18)*L.cell:0;x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.ellipse(p.x+off,p.y+L.cell*.32,L.cell*.3,L.cell*.1,0,0,7);x.fill();x.strokeStyle=PCOL[i];x.lineWidth=3;x.beginPath();x.arc(p.x+off,p.y,L.cell*.44,0,7);x.stroke();s.sprite(x,i,p.x+off,p.y,L.cell*.86,{exact:true,mood:turn===i&&state==='jump'?(jumpTo>jumpFrom?'happy':'sad'):undefined});}
  // spinner
  const {sx,sy,sr}=L;x.fillStyle='#fff';x.beginPath();x.arc(sx,sy,sr*1.08,0,7);x.fill();x.strokeStyle=INK;x.lineWidth=4;x.stroke();
  const cols=['#ee4b5b','#f4902c','#f6d93a','#4ccc6a','#3a8ff0','#a85bd6'];for(let k=0;k<6;k++){x.fillStyle=cols[k];x.beginPath();x.moveTo(sx,sy);x.arc(sx,sy,sr,k*Math.PI/3-Math.PI/2,(k+1)*Math.PI/3-Math.PI/2);x.closePath();x.fill();const a=(k+.5)*Math.PI/3-Math.PI/2;outlined(x,String(k+1),sx+Math.cos(a)*sr*.66,sy+Math.sin(a)*sr*.66,{size:sr*.28,fill:'#fff',stroke:INK});}
  x.save();x.translate(sx,sy);x.rotate(angle);x.fillStyle='#111';x.beginPath();x.moveTo(0,-sr*.92);x.lineTo(sr*.09,0);x.lineTo(0,sr*.22);x.lineTo(-sr*.09,0);x.closePath();x.fill();x.fillStyle='#ffd21c';x.beginPath();x.arc(0,0,sr*.1,0,7);x.fill();x.restore();
  const size=Math.max(14,sr*.2);outlined(x,phase==='end'?'':state==='ready'?'TAP TO SPIN':state==='spin'?'TAP TO STOP':'',sx,sy+sr*1.3,{size,fill:'#fff',stroke:INK});
  for(let i=0;i<2;i++){const hx=L.wide?sx+(i?sr*.7:-sr*.7):s.W*(i?.78:.22),hy=L.wide?s.H*.12:sy-sr*1.35,hs=Math.max(28,sr*.42);x.globalAlpha=turn===i||phase==='end'?1:.45;s.sprite(x,i,hx,hy,hs,{exact:true});outlined(x,`${pos[i]}`,hx,hy+hs*.75,{size:size*.9,fill:PCOL[i],stroke:'#fff'});outlined(x,`${Math.max(0,SPINS-spins[i])} left`,hx,hy+hs*.75+size,{size:size*.6,fill:INK,stroke:'#fff'});x.globalAlpha=1;}
  if(msgT>0){const sz=Math.min(s.W*.07,s.H*.07,48);x.save();x.globalAlpha=clamp(msgT*3,0,1);outlined(x,msg,L.bx+L.size/2,L.by+L.size/2,{size:sz,fill:'#ffd21c',stroke:INK});x.restore();}
  fx.draw(x);if(phase==='count')cd.draw(x,s.W,s.H);
  if(phase==='end'){const size=Math.min(s.W*.06,s.H*.06,44);x.fillStyle='rgba(36,64,42,.75)';x.fillRect(0,s.H/2-size,s.W,size*2);outlined(x,endText,s.W/2,s.H/2,{size,fill:'#ffd21c',stroke:INK});}
 });
}
Object.assign(exports,{chutes});
