// Candy Land games, both players at once on a split screen (P1 top / left, P2 bottom / right; same seeded draws).
//  'catch': Gumdrop Mountain Catch. Candies tumble down your field; a colour card at the top says which colour
//           counts. Drag your head-basket to catch matching candies (+1), skip the rest (−1), dodge Lord Licorice's
//           black licorice (−2 and sticky) and grab golden King Kandy gumdrops (+5). 45 seconds.
//  'dash':  Color Card Dash. A card flips in the middle; race to tap the matching colour square on your side.
//           Double cards are worth 2. A Lord Licorice card means hands off: whoever taps loses 2. Twenty cards.
const {clamp}=require("src/utils.js");
const {Fx,arenaKeys,arenaTouch,snd,noise,jingle,outlined,rr,FONT,PCOL,settle,Countdown}=require("src/engines/arenaKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");

const COLORS=[['red','#ee4b5b'],['purple','#a85bd6'],['yellow','#f6d93a'],['blue','#3a8ff0'],['orange','#f4902c'],['green','#4ccc6a']];
const INK='#5a1f4a',CATCH_TIME=45,DASH_CARDS=20;

function candyBackdrop(x,v,t,flip=false){
 const g=x.createLinearGradient(0,v.y,0,v.y+v.h);g.addColorStop(0,'#ffe3f1');g.addColorStop(1,'#d9f4ff');x.fillStyle=g;x.fillRect(v.x,v.y,v.w,v.h);
 const hills=[['#9be7ff',.2],['#ffd0f0',.55],['#c3f7a8',.85]];for(const [col,fx0] of hills){x.fillStyle=col;x.beginPath();x.ellipse(v.x+v.w*fx0,v.y+v.h*1.02,v.w*.32,v.h*.32,0,Math.PI,0);x.fill();x.strokeStyle='#fff';x.lineWidth=3;x.stroke();}
 for(let k=0;k<5;k++){const px=v.x+v.w*(.1+k*.2),py=v.y+v.h*.86;x.fillStyle='#fff';x.fillRect(px-2,py-26,4,26);x.fillStyle=COLORS[k%6][1];x.beginPath();x.arc(px,py-30,10,0,7);x.fill();x.strokeStyle='rgba(255,255,255,.8)';x.lineWidth=2;x.beginPath();x.arc(px,py-30,6,0,4.5);x.stroke();}
}
function candyShape(x,c,cx,cy,r,t){
 if(c.kind==='licorice'){x.save();x.translate(cx,cy);x.rotate(c.rot+t*c.spin);x.fillStyle='#1c1220';rr(x,-r*1.3,-r*.4,r*2.6,r*.8,r*.35);x.fill();x.strokeStyle='#4a3a55';x.lineWidth=2;for(let k=-2;k<=2;k++){x.beginPath();x.moveTo(k*r*.5,-r*.4);x.lineTo(k*r*.5+r*.2,r*.4);x.stroke();}x.restore();return;}
 if(c.kind==='gold'){x.fillStyle='#ffd21c';x.beginPath();x.ellipse(cx,cy,r*1.1,r,0,Math.PI,0);x.lineTo(cx+r*1.1,cy+r*.3);x.lineTo(cx-r*1.1,cy+r*.3);x.fill();x.strokeStyle='#b07800';x.lineWidth=2;x.stroke();x.fillStyle='#fff8c0';x.beginPath();x.arc(cx-r*.35,cy-r*.45,r*.22,0,7);x.fill();x.font=`${r}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText('👑',cx,cy-r*1.3);return;}
 const col=COLORS[c.color][1];
 if(c.kind==='gumdrop'){x.fillStyle=col;x.beginPath();x.ellipse(cx,cy,r,r*.95,0,Math.PI,0);x.lineTo(cx+r,cy+r*.3);x.lineTo(cx-r,cy+r*.3);x.closePath();x.fill();x.fillStyle='rgba(255,255,255,.55)';for(let k=0;k<5;k++){x.fillRect(cx-r*.6+k*r*.3,cy-r*.5+(k%2)*r*.4,2.2,2.2);}}
 else if(c.kind==='lolly'){x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx,cy+r*1.6);x.stroke();x.fillStyle=col;x.beginPath();x.arc(cx,cy,r,0,7);x.fill();x.strokeStyle='rgba(255,255,255,.8)';x.lineWidth=2.4;x.beginPath();for(let a=0;a<12;a+=.3){const rr0=a/12*r;x.lineTo(cx+Math.cos(a+t*2)*rr0,cy+Math.sin(a+t*2)*rr0);}x.stroke();}
 else{x.save();x.translate(cx,cy);x.rotate(c.rot+t*c.spin);x.fillStyle=col;x.beginPath();x.ellipse(0,0,r,r*.62,0,0,7);x.fill();x.beginPath();x.moveTo(-r,0);x.lineTo(-r*1.6,-r*.5);x.lineTo(-r*1.6,r*.5);x.closePath();x.moveTo(r,0);x.lineTo(r*1.6,-r*.5);x.lineTo(r*1.6,r*.5);x.closePath();x.fill();x.strokeStyle='rgba(255,255,255,.7)';x.lineWidth=2;x.beginPath();x.moveTo(-r*.4,-r*.5);x.lineTo(-r*.1,r*.5);x.moveTo(r*.1,-r*.5);x.lineTo(r*.4,r*.5);x.stroke();x.restore();}
}
function colorCard(x,cx,cy,w,h,card,t){x.save();x.translate(cx,cy);x.fillStyle='#fff';rr(x,-w/2,-h/2,w,h,w*.1);x.fill();x.strokeStyle=INK;x.lineWidth=Math.max(2,w*.04);x.stroke();
 if(card.lic){x.fillStyle='#1c1220';rr(x,-w*.36,-h*.36,w*.72,h*.72,w*.08);x.fill();outlined(x,'LORD',0,-h*.12,{size:w*.16,fill:'#fff',stroke:'#1c1220'});outlined(x,'LICORICE',0,h*.12,{size:w*.13,fill:'#ff6a8a',stroke:'#1c1220'});}
 else{const col=COLORS[card.color][1];if(card.double){x.fillStyle=col;rr(x,-w*.36,-h*.4,w*.72,h*.36,w*.06);x.fill();rr(x,-w*.36,h*.04,w*.72,h*.36,w*.06);x.fill();}else{x.fillStyle=col;rr(x,-w*.36,-h*.2,w*.72,h*.4,w*.06);x.fill();}}
 x.restore();}

async function candyLand(s){
 const mode=s.game.candyMode==='dash'?'dash':'catch';
 const [c,x]=s.canvas(900,600,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 if(!await settle(s))return;
 const side=()=>s.W>s.H*1.05,vp=i=>side()?{x:i?s.W/2+2:0,y:0,w:s.W/2-2,h:s.H}:{x:0,y:i?s.H/2+2:0,w:s.W,h:s.H/2-2};
 const owner=p=>side()?(p.x<s.W/2?0:1):(p.y<s.H/2?0:1);
 const fx=new Fx(),score=[0,0],kb=arenaKeys(s),cd=new Countdown(3);let phase='count',t=0,clock=0,endT=0,endText='';

 if(mode==='catch'){
  s.hint('Gumdrop Mountain Catch: your head is the basket. Drag anywhere on your half (P1 top, P2 bottom; left/right halves on wide screens) to slide it. Catch candies of the colour on the card (+1), avoid other colours (−1) and black licorice (−2, sticky). Golden King Kandy gumdrops are +5. The card changes every few seconds. P1 A/D, P2 arrows.');
  const baskets=[0,1].map(()=>({x:.5,stick:0,flash:0,mood:0})),fields=[[],[]];let spawnT=0,card={color:0},cardT=0,cardIdx=0,spawnIdx=0;
  const seq=[];for(let k=0;k<400;k++){const r=s.random();seq.push({x:.08+s.random()*.84,kind:r<.06?'licorice':r<.085?'gold':['gumdrop','lolly','wrap'][Math.floor(s.random()*3)],color:Math.floor(s.random()*6),speed:.55+s.random()*.35,rot:s.random()*6,spin:(s.random()-.5)*4});}
  const cards=[];for(let k=0;k<12;k++)cards.push({color:Math.floor(s.random()*6)});
  for(let k=0;k<cards.length;k++){if(k&&cards[k].color===cards[k-1].color)cards[k].color=(cards[k].color+1+Math.floor(s.random()*5))%6;}
  card=cards[0];
  const fingers=[null,null];
  arenaTouch(s,{owner,maxFingers:1,onDown:f=>{fingers[f.owner]={f,start:baskets[f.owner].x};},onMove:f=>{const fi=fingers[f.owner];if(!fi)return;const v=vp(f.owner);baskets[f.owner].x=clamp(fi.start+(f.x-f.sx)/v.w*1.25,.06,.94);},onUp:f=>{fingers[f.owner]=null;}});
  s.debug={get phase(){return phase;},baskets,fields,score,setClock(v){clock=v;}};
  // vs CPU: basket 2 slides under the best candy about to land (card colour or gold) and away from licorice and wrong colours
  const cpu=isCpu(s);let cpuErr=0;
  const cpuCatch=dt=>{const b=baskets[1],sk=cpuSkill(s),spd=(b.stick>0?.35:1.1)*(.7+sk*.5)*dt;let best=null,bv=-1e9;for(const cn of fields[1]){if(cn.y>.9||cn.y<.15)continue;const val=cn.kind==='gold'?5:cn.kind==='licorice'?-3:cn.color===card.color?1:-1.2,dist=Math.abs(cn.x-b.x),v=val*2-dist*3+cn.y*2;if(val>0&&v>bv){bv=v;best=cn;}}
   if(Math.random()<dt*2)cpuErr=(Math.random()-.5)*(1-sk)*.18;let tx=best?best.x+cpuErr:b.x;for(const cn of fields[1]){const bad=cn.kind==='licorice'||cn.kind!=='gold'&&cn.color!==card.color;if(bad&&cn.y>.68&&cn.y<.9&&Math.abs(cn.x-b.x)<.13&&Math.random()<.5+sk*.5){tx=b.x+(cn.x>b.x?-.25:.25);break;}}for(const cn of fields[1]){if(cn.y<.55||cn.y>.9)continue;const val=cn.kind==='licorice'?-3:cn.kind==='gold'||cn.color===card.color?1:-1;if(val<0&&Math.abs(cn.x-tx)<.09&&Math.random()<.4+sk*.6)tx+=cn.x<tx?.12:-.12;}b.x=clamp(b.x+clamp(tx-b.x,-spd,spd),.06,.94);};
  s.frame((dt)=>{t+=dt;fx.update(dt);
   if(phase==='count'){if(!cd.update(dt))phase='play';}
   else if(phase==='play'){clock+=dt;cardT+=dt;if(cpu)cpuCatch(dt);
    if(cardT>4.5){cardT=0;cardIdx=(cardIdx+1)%cards.length;card=cards[cardIdx];jingle([659,880],{step:.06,type:'triangle',vol:.03});}
    spawnT-=dt;const rate=.55-Math.min(.25,clock/CATCH_TIME*.25);if(spawnT<=0){spawnT=rate;const sp=seq[spawnIdx++%seq.length];for(let i=0;i<2;i++)fields[i].push({...sp,y:-.08,taken:false});}
    for(let i=0;i<2;i++){const b=baskets[i],k=kb.state[i];if(b.stick>0)b.stick-=dt;const spd=b.stick>0?.35:1.1;if(k.l)b.x=clamp(b.x-spd*dt,.06,.94);if(k.r)b.x=clamp(b.x+spd*dt,.06,.94);b.flash=Math.max(0,b.flash-dt);
     const v=vp(i);for(let j=fields[i].length-1;j>=0;j--){const cn=fields[i][j];cn.y+=cn.speed*dt*(1+clock/CATCH_TIME*.5)*(side()?.75:1.1);
      const bx=v.x+b.x*v.w,by=v.y+v.h*.86,cx=v.x+cn.x*v.w,cy=v.y+cn.y*v.h,r=Math.min(v.w,v.h)*.06;
      if(!cn.taken&&Math.abs(cx-bx)<r*2.4&&Math.abs(cy-by)<r*1.6){cn.taken=true;fields[i].splice(j,1);let pts=0,txt='';
       if(cn.kind==='licorice'){pts=-2;b.stick=1.2;txt='STICKY! −2';noise(.2,{vol:.05,freq:400});s.react(i,'sad');}
       else if(cn.kind==='gold'){pts=5;txt='KING KANDY +5';jingle([784,988,1319,1568],{step:.05,type:'triangle',vol:.04});s.react(i,'happy');}
       else if(cn.color===card.color){pts=1;txt='+1';snd(880+Math.random()*200,.08,{type:'triangle',vol:.03});}
       else{pts=-1;txt='WRONG COLOUR −1';snd(200,.12,{type:'square',vol:.03});}
       score[i]=Math.max(0,score[i]+pts);b.flash=.25;fx.pop(cx,cy-r,txt,{color:pts>0?'#fff':'#ff6a8a',stroke:INK,size:Math.max(14,r*.9)});fx.burst(cx,cy,{n:8,color:cn.kind==='licorice'?'#333':cn.kind==='gold'?'#ffd21c':COLORS[cn.color][1],speed:140,life:.4,size:3});continue;}
      if(cn.y>1.05)fields[i].splice(j,1);}}
    if(clock>=CATCH_TIME){phase='end';endT=0;const [a,b]=score;endText=a===b?'SWEET TIE!':`${s.players[a>b?0:1].name.toUpperCase()} REACHES THE CASTLE!`;jingle([523,659,784,1047,1319],{step:.1,type:'triangle',vol:.04});}}
   else{endT+=dt;if(endT>2.8){s.finish(score,`Gumdrop Mountain Catch: ${s.players[0].name} ${score[0]}, ${s.players[1].name} ${score[1]}.`);return;}}
   s.setScores(score);x.fillStyle='#fff';x.fillRect(0,0,s.W,s.H);
   for(let i=0;i<2;i++){const v=vp(i),b=baskets[i],r=Math.min(v.w,v.h)*.06;x.save();x.beginPath();x.rect(v.x,v.y,v.w,v.h);x.clip();candyBackdrop(x,v,t);
    for(const cn of fields[i])candyShape(x,cn,v.x+cn.x*v.w,v.y+cn.y*v.h,r,t);
    const bx=v.x+b.x*v.w,by=v.y+v.h*.86,hs=Math.min(v.w,v.h)*.2;x.fillStyle=b.stick>0?'#1c1220':'#f7a5c8';rr(x,bx-hs*.62,by-hs*.05,hs*1.24,hs*.36,hs*.12);x.fill();x.strokeStyle='#fff';x.lineWidth=3;x.stroke();
    s.sprite(x,i,bx,by-hs*.28,hs,{exact:true,mood:b.flash>0?'happy':b.stick>0?'sad':undefined});
    const cw=Math.min(v.w*.16,v.h*.22),ch=cw*1.3;colorCard(x,v.x+v.w-cw*.7,v.y+ch*.62,cw,ch,card,t);if(phase==='play'&&cardT>3.6){x.globalAlpha=.6+.4*Math.sin(t*20);outlined(x,'!',v.x+v.w-cw*1.35,v.y+ch*.62,{size:cw*.4,fill:'#fff',stroke:INK});x.globalAlpha=1;}
    outlined(x,`${s.players[i].name.toUpperCase()}  ${score[i]}`,v.x+12,v.y+22,{size:Math.max(14,Math.min(v.w,v.h)*.06),fill:PCOL[i],stroke:'#fff',align:'left'});
    outlined(x,`${Math.ceil(Math.max(0,CATCH_TIME-clock))}s`,v.x+12,v.y+22+Math.max(16,Math.min(v.w,v.h)*.07),{size:Math.max(12,Math.min(v.w,v.h)*.05),fill:'#fff',stroke:INK,align:'left'});
    x.restore();}
   fx.draw(x);
   x.fillStyle='#fff';if(side())x.fillRect(s.W/2-2,0,4,s.H);else x.fillRect(0,s.H/2-2,s.W,4);
   if(phase==='count')cd.draw(x,s.W,s.H);
   if(phase==='end'){const size=Math.min(s.W*.06,s.H*.06,44);x.fillStyle='rgba(90,31,74,.7)';x.fillRect(0,s.H/2-size,s.W,size*2);outlined(x,endText,s.W/2,s.H/2,{size,fill:'#ffe3f1',stroke:INK});}
  });
  return;
 }

 // ---------------- Color Card Dash
 s.hint('Color Card Dash: a Candy Land card flips in the middle. Be first to tap the matching colour on your side (P1 top, P2 bottom; left/right halves on wide screens). Single colour +1, double +2, a wrong tap −1 and a short freeze. Lord Licorice card: hands off! Whoever taps loses 2. Twenty cards. Keyboard: P1 keys 1-6, P2 keys 7-0 and - =.');
 const deck=[];for(let k=0;k<DASH_CARDS;k++){const r=s.random();deck.push(r<.14&&k>2?{lic:true,delay:.7+s.random()*1.1}:{color:Math.floor(s.random()*6),double:r>.78,delay:.7+s.random()*1.1});}
 let idx=-1,card=null,state='wait',waitT=1.2,lock=[0,0],shown=0,winnerFlash=-1,flashT=0;
 const buttons=i=>{const v=vp(i),cols=3,rows=2,pad=Math.min(v.w,v.h)*.04,top=side()?v.y+v.h*.5:v.y+v.h*(i?.24:.2),bh=(side()?v.h*.46:v.h*.56)-pad,bw=(v.w-pad*(cols+1))/cols,h=(bh-pad*(rows-1))/rows;
  return COLORS.map((col,k)=>({k,x:v.x+pad+(k%cols)*(bw+pad),y:top+Math.floor(k/cols)*(h+pad),w:bw,h,col:col[1]}));};
 const press=(i,k)=>{if(phase!=='play'||lock[i]>0)return;if(state!=='show'){lock[i]=.5;snd(160,.12,{type:'square',vol:.03});fx.pop(vp(i).x+vp(i).w/2,vp(i).y+vp(i).h*.2,'TOO EARLY',{color:'#ff6a8a',stroke:INK,size:18});return;}
  if(card.lic){score[i]=Math.max(0,score[i]-2);lock[i]=.8;state='done';winnerFlash=1-i;flashT=1;noise(.3,{vol:.06,freq:300});fx.pop(vp(i).x+vp(i).w/2,vp(i).y+vp(i).h*.2,'LICORICE! −2',{color:'#ff6a8a',stroke:INK,size:22});s.react(i,'sad');setTimeout(next,900);return;}
  if(k===card.color){const pts=card.double?2:1;score[i]+=pts;state='done';winnerFlash=i;flashT=1;jingle([784,1047,1319],{step:.05,type:'triangle',vol:.04});s.react(i,'happy');const b=buttons(i)[k];fx.burst(b.x+b.w/2,b.y+b.h/2,{n:16,color:COLORS[k][1],speed:220,life:.5,size:4,shape:'star'});fx.pop(b.x+b.w/2,b.y,`+${pts}`,{color:'#fff',stroke:INK,size:26});setTimeout(next,800);}
  else{score[i]=Math.max(0,score[i]-1);lock[i]=.9;snd(180,.15,{type:'square',vol:.03});const b=buttons(i)[k];fx.pop(b.x+b.w/2,b.y,'−1',{color:'#ff6a8a',stroke:INK,size:22});}};
 const next=()=>{if(!s.alive)return;idx++;if(idx>=deck.length){phase='end';endT=0;const [a,b]=score;endText=a===b?'SWEET TIE!':`${s.players[a>b?0:1].name.toUpperCase()} REACHES THE CASTLE!`;jingle([523,659,784,1047,1319],{step:.1,type:'triangle',vol:.04});return;}card=deck[idx];state='wait';waitT=card.delay;};
 arenaTouch(s,{owner,maxFingers:2,onDown:f=>{const b=buttons(f.owner).find(b=>f.x>=b.x&&f.x<=b.x+b.w&&f.y>=b.y&&f.y<=b.y+b.h);if(b)press(f.owner,b.k);}});
 s.on(document,'keydown',ev=>{if(s.paused||!s.alive||ev.repeat)return;const k=ev.key;const p1='123456'.indexOf(k),p2='7890-='.indexOf(k);if(p1>=0){ev.preventDefault();press(0,p1);}else if(p2>=0){ev.preventDefault();press(1,p2);}});
 s.debug={get phase(){return phase;},get card(){return card;},get state(){return state;},score,press};
 // vs CPU: player 2 taps the matching colour after a reaction delay; hands off the licorice (mostly)
 const cpuD=isCpu(s);let cpuReact=null,cpuIdx=-1;
 const cpuDash=dt=>{if(state!=='show'||lock[1]>0)return;const sk=cpuSkill(s);if(cpuIdx!==idx){cpuIdx=idx;cpuReact=.38+(1-sk)*.55+Math.random()*.2;}cpuReact-=dt;if(cpuReact>0)return;cpuReact=9;if(card.lic){if(Math.random()<(1-sk)*.15)press(1,0);return;}press(1,Math.random()<(1-sk)*.12?(card.color+1)%6:card.color);};
 s.frame(dt=>{t+=dt;fx.update(dt);lock[0]=Math.max(0,lock[0]-dt);lock[1]=Math.max(0,lock[1]-dt);flashT=Math.max(0,flashT-dt);
  if(phase==='count'){if(!cd.update(dt)){phase='play';next();}}
  else if(phase==='play'){if(cpuD)cpuDash(dt);if(state==='wait'){waitT-=dt;if(waitT<=0){state='show';shown=0;snd(520,.06,{type:'square',vol:.03});}}else if(state==='show'){shown+=dt;if(card.lic&&shown>1.6){state='done';fx.pop(s.W/2,s.H/2-40,'NOBODY TOUCHED IT',{color:'#fff',stroke:INK,size:20});setTimeout(next,600);}}}
  else{endT+=dt;if(endT>2.8){s.finish(score,`Color Card Dash: ${s.players[0].name} ${score[0]}, ${s.players[1].name} ${score[1]}.`);return;}}
  s.setScores(score);x.fillStyle='#fff';x.fillRect(0,0,s.W,s.H);
  for(let i=0;i<2;i++){const v=vp(i);x.save();x.beginPath();x.rect(v.x,v.y,v.w,v.h);x.clip();candyBackdrop(x,v,t);
   if(winnerFlash===i&&flashT>0){x.fillStyle=`rgba(255,255,255,${flashT*.5})`;x.fillRect(v.x,v.y,v.w,v.h);}
   for(const b of buttons(i)){x.globalAlpha=lock[i]>0?.45:1;x.fillStyle=b.col;rr(x,b.x,b.y,b.w,b.h,Math.min(b.w,b.h)*.18);x.fill();x.strokeStyle='#fff';x.lineWidth=4;x.stroke();x.fillStyle='rgba(255,255,255,.25)';rr(x,b.x+6,b.y+6,b.w-12,b.h*.3,Math.min(b.w,b.h)*.12);x.fill();x.globalAlpha=1;}
   const hs=Math.min(v.w,v.h)*.15,right=side()&&i===1,hy=!side()&&i===1?v.y+v.h-hs*.65:v.y+hs*.65,hx=right?v.x+v.w-hs*.75:v.x+hs*.75;s.sprite(x,i,hx,hy,hs,{exact:true,mood:lock[i]>0?'sad':winnerFlash===i&&flashT>0?'happy':undefined});
   outlined(x,`${s.players[i].name.toUpperCase()}  ${score[i]}`,right?hx-hs*.75:hx+hs*.75,hy,{size:Math.max(14,hs*.32),fill:PCOL[i],stroke:'#fff',align:right?'right':'left'});
   x.restore();}
  // centre card
  const ch=side()?Math.min(s.H*.36,s.W*.26):Math.min(s.H*.17,s.W*.3),cw=ch/1.3,cx=s.W/2,cy=side()?s.H*.25:s.H/2;
  if(phase==='play'||phase==='end'){if(card&&(state==='show'||state==='done')){const k=Math.min(1,shown*8);x.save();x.translate(cx,cy);x.scale(Math.max(.05,k),1);colorCard(x,0,0,cw,ch,card,t);x.restore();}
   else{x.fillStyle=INK;rr(x,cx-cw/2,cy-ch/2,cw,ch,cw*.1);x.fill();x.strokeStyle='#fff';x.lineWidth=3;x.stroke();outlined(x,'CANDY',cx,cy-ch*.1,{size:cw*.18,fill:'#ffe3f1',stroke:INK});outlined(x,'LAND',cx,cy+ch*.12,{size:cw*.18,fill:'#ffe3f1',stroke:INK});}
   outlined(x,`${Math.max(1,Math.min(DASH_CARDS,idx+1))}/${DASH_CARDS}`,cx+cw*.5+8,cy-ch*.5+8,{size:Math.max(11,cw*.13),fill:'#fff',stroke:INK,align:'left'});}
  x.fillStyle='#fff';if(side())x.fillRect(s.W/2-2,s.H*.48,4,s.H*.52);else{x.fillRect(0,s.H/2-2,s.W/2-cw*.8,4);x.fillRect(s.W/2+cw*.8,s.H/2-2,s.W/2,4);}
  fx.draw(x);
  if(phase==='count')cd.draw(x,s.W,s.H);
  if(phase==='end'){const size=Math.min(s.W*.06,s.H*.06,44);x.fillStyle='rgba(90,31,74,.7)';x.fillRect(0,s.H/2-size,s.W,size*2);outlined(x,endText,s.W/2,s.H/2,{size,fill:'#ffe3f1',stroke:INK});}
 });
}
Object.assign(exports,{candyLand});
