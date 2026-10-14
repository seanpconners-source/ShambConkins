// Head Hunt, rebuilt to look like NES Duck Hunt (1984): the blue sky, the big tree and bush, tall grass, the hunting
// dog who pops up with your catch (or laughs at you), and the classic bottom bar with R=, SHOT, HIT and SCORE.
// The ducks wear your rival's head. Ten ducks a round, two at a time, three shots per pair; a pair that survives too
// long flies away and the sky flashes pink. Black 500, blue 1000, red 1500; all ten = PERFECT bonus. Turn-based.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,makeShake}=require("src/engines/tarantinoKit.js");
const {pixText,drawSprite,fitField,turnRunner}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");

const FW=256,SKY='#3cbcfc',PINK='#fcbcb0';
const WING=[['..##....','.####...','######..','.#####..'],['........','######..','.#######','..####..'],['........','........','######..','########']];
const BODY=['....######..','..##########','############','.##########.','...######...'];
const DOG=[['.......##.......','......####......','.....######.....','..##########....','.############...','##############..','.##..######.....','.....######.....','....########....','...##########...','...##########...','...###....###...'],
 ['....##....##....','...####..####...','...##########...','..############..','..############..','...##########...','....########....','.....######.....','....########....','...##########...','...##########...','...###....###...']];
const DUCK_KIND=[{c:'#2a2a2a',w:'#7c7c7c',pts:500,sp:62},{c:'#2038ec',w:'#7ca0fc',pts:1000,sp:78},{c:'#a81000',w:'#f87858',pts:1500,sp:96}];

async function duckturn(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.ownHud(true,true);
 const shake=makeShake();let cur=null,L=null;
 const rnd=seededRandom(s.seed+':duckhunt');const PAIRS=Array.from({length:5},(_,p)=>[0,1].map(()=>({kind:rnd()<.2+p*.06?2:rnd()<.45?1:0,x:40+rnd()*176,a:-Math.PI/2+(rnd()-.5)*1.6})));
 function make(){return {pair:-1,ducks:[],shots:3,hits:Array(10).fill(0),score:0,state:'start',t:0,flash:0,dog:{mode:'hide',t:0,y:0,n:0},sky:0,shotFx:[]};}
 function nextPair(w){w.pair++;w.shots=3;w.t=0;if(w.pair>=5){w.state='done';if(w.hits.every(h=>h===1)){w.score+=10000;w.perfect=true;voice(784,.3,.05,'square');}return;}
  w.ducks=PAIRS[w.pair].map((d,i)=>{const K=DUCK_KIND[d.kind];return {i:w.pair*2+i,kind:d.kind,x:d.x,y:L.FH*.72,vx:Math.cos(d.a)*K.sp*(1+w.pair*.1),vy:Math.sin(d.a)*K.sp*(1+w.pair*.1),state:'fly',flap:0,turn:.8+rnd()*.6,fall:0};});
  w.state='fly';voice(1046,.08,.04,'square');voice(1318,.08,.04,'square',{delay:.1});}
 function shoot(w,px,py){if(w.state!=='fly'||w.shots<=0)return;w.shots--;w.flash=.06;noise(.18,.12,{f0:2600,f1:300});voice(120,.12,.06,'square',{slide:.4});w.shotFx.push({x:px,y:py,t:.25});
  for(const d of w.ducks)if(d.state==='fly'&&Math.hypot(d.x-px,d.y-py)<22){d.state='hit';d.t=.5;w.hits[d.i]=1;w.score+=DUCK_KIND[d.kind].pts;s.react?.(w.player,'happy',.8);vibrate(15);return;}
  if(w.shots<=0&&w.ducks.some(d=>d.state==='fly'))w.t=Math.max(w.t,9);}
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||!cur||!L)return;ev.preventDefault();const p=s.pointer(ev),f=L.toField(p.x,p.y);shoot(cur,f.x,f.y);});
 s.on(document,'keydown',ev=>{if((ev.key===' '||ev.key==='Enter')&&cur){const d=cur.ducks.find(q=>q.state==='fly');if(d){ev.preventDefault();shoot(cur,d.x+(Math.random()-.5)*20,d.y+(Math.random()-.5)*20);}}});
 s.hint('Tap a flying duck to shoot it. Two ducks at a time, three shots per pair. Wait too long and they fly away. Black 500, blue 1000, red 1500; hit all ten for a 10,000 PERFECT bonus.');
 function step(w,dt){
  shake.step(dt);w.t+=dt;w.flash=Math.max(0,w.flash-dt);w.sky=Math.max(0,w.sky-dt*.6);for(const f of w.shotFx)f.t-=dt;w.shotFx=w.shotFx.filter(f=>f.t>0);
  const dog=w.dog;dog.t+=dt;
  if(w.state==='start'){if(w.t>1.2)nextPair(w);return;}
  if(w.state==='fly'){
   for(const d of w.ducks){d.flap+=dt*10;
    if(d.state==='fly'){if(w.t>8.5){d.state='away';w.sky=1;}d.turn-=dt;if(d.turn<=0){d.turn=.6+Math.random()*.8;const a=Math.atan2(d.vy,d.vx)+(Math.random()-.5)*1.4,sp=Math.hypot(d.vx,d.vy);d.vx=Math.cos(a)*sp;d.vy=Math.sin(a)*sp;}
     d.x+=d.vx*dt;d.y+=d.vy*dt;if(d.x<10||d.x>FW-10){d.vx*=-1;d.x=clamp(d.x,10,FW-10);}if(d.y<14){d.vy=Math.abs(d.vy);}if(d.y>L.FH*.66){d.vy=-Math.abs(d.vy);}}
    else if(d.state==='away'){d.y-=110*dt;d.vx*=.98;d.x+=d.vx*dt*.3;}
    else if(d.state==='hit'){d.t-=dt;if(d.t<=0){d.state='fall';voice(900,.5,.04,'square',{slide:.3});}}
    else if(d.state==='fall'){d.y+=130*dt;if(d.y>L.FH*.8){d.state='down';}}}
   if(w.t>8.5&&w.ducks.some(d=>d.state==='fly')){for(const d of w.ducks)if(d.state==='fly'){d.state='away';}w.sky=1;}
   if(w.ducks.every(d=>d.state==='down'||d.state==='away'&&d.y<-30)){const got=w.ducks.filter(d=>d.state==='down').length;w.state='dog';dog.mode=got?'show':'laugh';dog.n=got;dog.t=0;dog.x=got?w.ducks.find(d=>d.state==='down').x:FW/2;
    if(got){voice(523,.1,.05,'square');voice(659,.1,.05,'square',{delay:.1});voice(784,.2,.05,'square',{delay:.2});}else{for(let k=0;k<4;k++)voice(400-k*30,.1,.04,'square',{delay:k*.12});s.react?.(w.player,'sad',1.2);}}}
  if(w.state==='dog'){const up=dog.t<.5?dog.t/.5:dog.t<1.4?1:Math.max(0,1-(dog.t-1.4)/.4);dog.y=up;if(dog.t>1.9){dog.mode='hide';nextPair(w);}}
 }
 function draw(w){
  const W=s.W,H=s.H;L=fitField(W,H,FW,{minH:224,maxH:400,top:0,bottom:0,anchor:'bottom'});const {scale:k,ox,oy,FH}=L;
  x.setTransform(1,0,0,1,0,0);x.fillStyle=w.flash>0?'#000':w.sky>0?PINK:SKY;x.fillRect(0,0,W,H);
  let sx=0,sy=0;if(shake.mag>.3){sx=(Math.random()-.5)*shake.mag;sy=(Math.random()-.5)*shake.mag;}
  x.setTransform(k,0,0,k,ox+sx,oy+sy);x.imageSmoothingEnabled=false;
  const ground=FH*.78;
  if(w.flash>0){for(const d of w.ducks)if(d.state==='fly'){x.fillStyle='#fff';x.fillRect(d.x-12,d.y-12,24,24);}x.setTransform(1,0,0,1,0,0);return;}
  // tree + bush
  x.fillStyle='#7c4c00';x.fillRect(22,ground-110,12,110);x.fillRect(12,ground-70,10,6);x.fillStyle='#00a800';for(const [tx,ty,r] of [[28,ground-120,26],[14,ground-96,18],[44,ground-100,20],[30,ground-86,18]]){x.beginPath();x.arc(tx,ty,r,0,Math.PI*2);x.fill();}
  x.fillStyle='#00a800';x.beginPath();x.arc(FW-40,ground-6,22,Math.PI,0);x.arc(FW-14,ground-8,16,Math.PI,0);x.fill();
  // ducks (behind the grass when falling)
  const rival=1-w.player;
  for(const d of w.ducks){if(d.state==='down')continue;const K=DUCK_KIND[d.kind],flip=d.vx<0?-1:1;x.save();x.translate(d.x,d.y);if(d.state==='fall')x.rotate(Math.PI);x.scale(flip,1);
   x.scale(1.6,1.6);drawSprite(x,BODY,-6,-1,1,K.c,{res:Math.max(1,Math.round(k*1.6))});if(d.state!=='hit')drawSprite(x,WING[Math.floor(d.flap)%3],-5,-6+(Math.floor(d.flap)%3)*1,1.1,K.w,{res:Math.max(1,Math.round(k*1.6))});x.fillStyle='#fc9838';x.fillRect(6,0,4,2);x.restore();
   s.sprite(x,rival,d.x+flip*8,d.y-8,24,{exact:true,mood:d.state==='hit'||d.state==='fall'?'sad':'silly'});}
  // the dog
  if(w.dog.mode!=='hide'){const dy=ground-14-w.dog.y*36,dx=w.dog.x;x.save();x.translate(dx,dy);x.scale(1.7,1.7);x.translate(-dx,-dy);const fr=w.dog.mode==='laugh'?Math.floor(w.dog.t*8)%2:0;drawSprite(x,DOG[w.dog.mode==='laugh'?1:0],dx-8,dy,1.3,'#a85a10',{res:Math.max(1,Math.round(k*1.3))});x.fillStyle='#fcfcfc';x.fillRect(dx-3,dy+4+fr,6,3);x.fillStyle='#000';x.fillRect(dx-3,dy+2,1.5,1.5);x.fillRect(dx+2,dy+2,1.5,1.5);
   if(w.dog.mode==='show')for(let q=0;q<w.dog.n;q++){drawSprite(x,BODY,dx-16+q*16,dy-6,.9,'#2a2a2a',{res:Math.max(1,Math.round(k))});s.sprite(x,rival,dx-10+q*16,dy-8,11,{exact:true,mood:'sad'});}x.restore();}
  // grass + dirt
  x.fillStyle='#80d010';x.fillRect(-ox/k-2,ground-10,FW+ox*2/k+4,8);for(let gx=-8;gx<FW+8;gx+=6){x.beginPath();x.moveTo(gx,ground-10);x.lineTo(gx+3,ground-20-(gx*7)%8);x.lineTo(gx+6,ground-10);x.fill();}
  x.fillStyle='#887000';x.fillRect(-ox/k-2,ground-2,FW+ox*2/k+4,FH-ground+40);x.fillStyle='#503000';for(let q=0;q<40;q++)x.fillRect((q*37)%FW,ground+4+(q*13)%(FH-ground-30),3,2);
  // bottom bar: R=, SHOT, HIT, SCORE
  const by=FH-26;x.fillStyle='#000';x.fillRect(4,by,40,22);x.fillRect(50,by,120,22);x.fillRect(176,by,76,22);
  pixText(x,`R=${w.player+1}`,8,by+2,.9,'#80d010');pixText(x,'SHOT',8,by+12,.8,'#3cbcfc');for(let q=0;q<3;q++){x.fillStyle=q<w.shots?'#fcfcfc':'#383838';x.fillRect(30+q*4,by+11,2.4,6);}
  pixText(x,'HIT',54,by+3,.8,'#80d010');for(let q=0;q<10;q++){x.fillStyle=w.hits[q]?'#f83800':(q>=(w.pair*2)&&q<w.pair*2+2&&Math.floor(w.t*6)%2?'#fcfcfc':'#fcfcfc88');drawSprite(x,['.##.','####','.##.'],56+q*11,by+12,1.6,x.fillStyle,{res:Math.max(1,Math.round(k))});}
  pixText(x,String(w.score).padStart(6,'0'),246,by+3,.9,'#fcfcfc',{align:'right'});pixText(x,'SCORE',246,by+13,.8,'#fcfcfc',{align:'right'});
  if(w.state==='start')pixText(x,`ROUND ${w.player+1}`,FW/2,FH*.3,1.6,'#fcfcfc',{align:'center'});
  if(w.sky>0&&w.ducks.some(d=>d.state==='away'))pixText(x,'FLY AWAY',FW/2,FH*.3,1.6,'#000',{align:'center'});
  if(w.perfect&&w.state==='done')pixText(x,'PERFECT!! 10000',FW/2,FH*.3,1.4,'#fcfcfc',{align:'center'});
  if(w.player===1&&w.state!=='done')pixText(x,`BEAT ${w.scores[0]}`,FW/2,6,.8,'#ffffff',{align:'center'});
  for(const f of w.shotFx){x.strokeStyle=`rgba(255,255,255,${f.t*4})`;x.lineWidth=1;x.beginPath();x.arc(f.x,f.y,6+(.25-f.t)*30,0,Math.PI*2);x.stroke();}
  x.setTransform(1,0,0,1,0,0);
  s.debug={engine:'duckturn',world:w};
 }
 const scores=await turnRunner(s,{seconds:120,endDelay:1.4,
  intro:(i,sc)=>i===0?`Duck Hunt, except every duck is wearing ${s.players[1].name}'s head. ${s.players[0].name} shoots first: tap the ducks, three shots per pair, ten ducks in all.`:`${s.players[1].name}, same flight patterns (and now they look like ${s.players[0].name}). Beat ${sc[0]}.`,
  make:()=>{cur=make();cur.dog={mode:'hide',t:0,y:0,n:0,x:FW/2};return cur;},step,draw,done:w=>w.state==='done',score:w=>w.score});
 if(!scores)return;
 s.finish(scores,`Head Hunt · ${scores[0]} vs ${scores[1]}`);
}
Object.assign(exports,{duckturn});
