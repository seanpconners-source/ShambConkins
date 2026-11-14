// BANANA STAND TAPPER (game id banana-money-grab, engine moneygrab): Tapper (Bally Midway, 1983) at the Bluths' bars, in
// the Arrested Development look (owner, Nov 14: white backgrounds, plain bold sans lettering, the show's colours).
// Four bars; customers (random characters from the whole game, who now and then say something) shuffle toward you. Tap a
// bar to jump there and slide the level's item down it (frozen banana / vodka martini / hot ham water). A customer who
// catches one is shoved back (out the door = +50), eats or drinks, then slides the empty back: catch it at the end of that
// bar (+100). An item that reaches the empty end, an empty that hits the floor, or a customer reaching you costs a life.
// Tap loose cash on the bars (+150: there's always money in the banana stand). Serve a level's last customer and the next
// bar opens (src/data/tapperSprites.js LEVELS: banana stand → Balboa Towers penthouse → Sudden Valley model home → again,
// faster). 90 seconds and three lives a turn.
// Pass and play: P1's shift, then P2's on the same seeded crowd. 1P arcade: rounds that speed up (retroKit soloTurnRuns).
// ONLINE (owner: "watching the opponent play live while you play... they are on one side and you are on the other"): both
// shifts at once. Each phone runs its own bars and streams them (netField snapshots); the other phone draws them at the far
// end of the same room: wide screens = one long bar with the door in the middle (you on the right, them on the left), tall
// screens = their bars above yours, mirrored. A customer you shove out the door walks over to their bars ({x} events).
// Art: drop-ins in assets/tapper (tapperSprites.js), drawn stand-ins here. Music/narrator: tapperAudio.js.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,makeShake,rr}=require("src/engines/tarantinoKit.js");
const {turnRunner}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {netField}=require("src/engines/netField.js");
const {isOnline}=require("src/engines/cpuKit.js");
const HF=require("src/headFacts.js");
const TS=require("src/data/tapperSprites.js");
const {createTapperAudio}=require("src/engines/tapperAudio.js");
const {store}=require("src/state.js");

const ROWS=4,SECONDS=90,FONT='"Helvetica Neue",Helvetica,Arial,sans-serif';
const INK='#111111',GREY='#8a8a8a',BLUTH='#ffd84a',BLUE='#2f6fd8';
const SHIRTS=['#5b7fb5','#c8553d','#6a994e','#e3b23c','#7d5ba6','#2d3142','#e07a5f','#f4f1de','#3d405b','#81b29a','#b56576','#457b9d'];
const LINES=['Make it a double.','I’ll have what they’re having.','Is this place still open?','Hey! Over here!','I’ve been waiting forever!','Do you take Bluth Bucks?','Same again!','Put it on my tab.','I’m a regular, you know.','Something cold. Anything.','Light on the ice.','Who do I have to know to get served?','Is there a happy hour?','Two, please. One for me, one for me.'];
const ANGRY=['HEY!','Where’s my order?!','Unbelievable.','I want to speak to the manager!','Do I have to do everything myself?'];
const MOOD={walk:'normal',push:'sad',eat:'win',angry:'angry'};
const ST=['walk','push','eat','angry'];
// every character with real face art (a stand-in face would read as a blank circle), the same list on every phone
let POOL=null;
function pool(){
 if(POOL)return POOL;
 try{const {ACTIVE_CATALOG}=require("src/contentPolicy.js"),{isRasterArt}=require("src/data/userPortraits.js"),{portraitURL}=require("src/assets.js");
  const all=ACTIVE_CATALOG.characters.map(c=>c.id).sort();POOL=all.filter(id=>{try{return isRasterArt(portraitURL(id,'normal'));}catch{return false;}});if(POOL.length<12)POOL=all;}
 catch{POOL=['sean','amber'];}
 return POOL;
}
function lineFor(id,rand){try{const {quoteOf}=require("src/data/characterQuotes.js"),q=quoteOf(id);if(q&&rand()<.7&&q.length<90)return q;}catch{}return LINES[Math.floor(rand()*LINES.length)];}
const nameOf=id=>{try{const {ACTIVE_CATALOG}=require("src/contentPolicy.js");return ACTIVE_CATALOG.characters.find(c=>c.id===id)?.name||'';}catch{return '';}};

async function moneygrab(s){
 const [c,x]=s.canvas(680,420,{fill:true});fullBleed(s,{bg:'#ffffff'});s.body.classList.add('drag-arena-body');s.controls([]);
 TS.preloadTapper();
 const shake=makeShake();
 const net=isOnline(s)?s.online:null,me=net?net.me:0,them=1-me;
 const audio=createTapperAudio({seed:s.seed,musicOn:()=>store.profile?.settings?.sound!==false});s.cleanup(()=>audio.stop());
 let cur=null,remote=null;   // cur = the world this phone plays; remote = the other phone's bars (online)
 const lvOf=w=>TS.LEVELS[w.lv%TS.LEVELS.length];

 // ---------------------------------------------------------------- world
 function make(player){
  return {player,rand:seededRandom(s.seed+':tapper'),lv:0,cleared:0,row:1,cd:0,lives:3,score:0,cust:[],nanas:[],sticks:[],cash:[],spawnT:1.2,cashT:7,
   pause:0,flash:0,bob:0,pops:[],spawned:0,phase:'card',card:2.2,uid:1,act:'idle',actT:0,say:[],sent:[],time:0,cap:SECONDS,lost:''};
 }
 const diff=w=>(1+.22*w.cleared+w.time/70)*(w.soloK||1);
 function startLevel(w){w.phase='card';w.card=2.2;w.spawned=0;w.cust=[];w.nanas=[];w.sticks=[];w.cash=[];w.spawnT=1.2;w.say=[];if(w===cur){audio.level(lvOf(w).id);audio.narrate(w.cleared?'level':'start',.8);}}
 function talk(w,cu,text,t=2.6){if(w.say.length>=2&&!/!/.test(text))return;w.say=w.say.filter(b=>b.cid!==cu.id);w.say.push({cid:cu.id,text,t});if(net&&w===cur)nf?.event({say:[cu.id,text]});}
 function spawnCust(w,row,char,sent){
  const r=w.rand,cu={id:w.uid++,row,u:-.04,state:'walk',hop:r()*.6,timer:0,char,body:Math.floor(r()*4),shirt:SHIRTS[Math.floor(r()*SHIRTS.length)],sent:sent||null,talkT:.4+r()*1.2,talks:r()<.3};
  w.cust.push(cu);return cu;
 }
 function lose(w,text,r){
  w.lives--;w.pause=1.6;w.flash=.6;w.lost=text;w.act='lose';w.actT=1.4;w.pops.push({x:.5,y:r,text,t:1.6,c:'#d62a2a',big:true});
  if(w===cur){noise(.5,.1,{f0:900,f1:100});voice(150,.4,.07,'sawtooth',{slide:.5,lp:700});shake.kick(8);vibrate(40);s.react?.(w.player,'sad',1.4);audio.narrate('lose',.5);}
  const back=w.cust.filter(cu=>!cu.sent).length;w.spawned=Math.max(0,w.spawned-back);
 }
 function serve(w,r){if(w.pause>0||w.ending||w.phase!=='play')return;if(w.row!==r){w.row=r;w.act='run';w.actT=.18;}if(w.cd>0)return;w.cd=.22;w.act='serve';w.actT=.25;w.nanas.push({row:r,u:.97});
  if(w===cur){voice(520,.05,.04,'square');noise(.12,.03,{type:'highpass',f0:2500});}}
 function grabCash(w,m){m.got=true;w.score+=150;w.pops.push({x:m.u,y:m.row,text:'+150',t:1,c:'#2e8b3a'});if(w===cur){[988,1319].forEach((f,k)=>voice(f,.07,.05,'square',{delay:k*.06}));s.react?.(w.player,'win',1);}}
 function step(w,dt){
  w.bob+=dt;w.cd=Math.max(0,w.cd-dt);w.actT-=dt;if(w.actT<=0&&w.act!=='idle')w.act='idle';w.flash=Math.max(0,w.flash-dt*2);
  for(const p of w.pops)p.t-=dt;w.pops=w.pops.filter(p=>p.t>0);for(const b of w.say)b.t-=dt;w.say=w.say.filter(b=>b.t>0&&w.cust.some(cu=>cu.id===b.cid));
  if(w.phase==='card'){w.time-=dt;w.card-=dt;if(w.card<=0)w.phase='play';return;}
  if(w.phase==='clear'){w.time-=dt;w.card-=dt;if(w.card<=0){w.lv++;startLevel(w);}return;}
  if(w.pause>0){w.pause-=dt;if(w.pause<=0){w.cust=[];w.nanas=[];w.sticks=[];w.say=[];w.lost='';}return;}
  if(w.ending)return;
  const L=lvOf(w),k=diff(w),quota=L.quota+3*Math.floor(w.cleared/TS.LEVELS.length);
  // arrivals: the level's crowd, plus anyone the other player shoved over (online)
  if(w.sent.length){const [row,char,from]=w.sent.shift();if(w.cust.filter(cu=>cu.row===row).length<4){const cu=spawnCust(w,row,char,from);cu.talks=false;}}
  w.spawnT-=dt;if(w.spawnT<=0&&w.spawned<quota){w.spawnT=clamp(2.2/k,.65,2.2)*(.6+w.rand()*.8);const r=Math.floor(w.rand()*ROWS),P=pool(),ch=P[Math.floor(w.rand()*P.length)];
   if(w.cust.filter(cu=>cu.row===r).length<3){spawnCust(w,r,ch);w.spawned++;}}
  w.cashT-=dt;if(w.cashT<=0){w.cashT=7+w.rand()*5;w.cash.push({row:Math.floor(w.rand()*ROWS),u:.2+w.rand()*.55,t:4});}
  for(const m of w.cash)m.t-=dt;w.cash=w.cash.filter(m=>m.t>0&&!m.got);
  for(const cu of w.cust){cu.timer-=dt;
   if(cu.talks&&cu.state==='walk'){cu.talkT-=dt;if(cu.talkT<=0){cu.talks=false;talk(w,cu,lineFor(cu.char,w.rand));}}
   if(cu.state==='walk'){cu.hop-=dt;if(cu.hop<=0){cu.hop=clamp(.9/k,.36,.9);cu.target=cu.u+.055;}if(cu.target!==undefined&&cu.u<cu.target)cu.u=Math.min(cu.target,cu.u+dt*.35);
    if(cu.u>=.93){cu.state='angry';talk(w,cu,ANGRY[Math.floor(w.rand()*ANGRY.length)],1.6);lose(w,'TOO SLOW!',cu.row);return;}}
   else if(cu.state==='push'){cu.u-=dt*.75;if(cu.u<-.05){cu.gone=true;w.score+=50;w.pops.push({x:0,y:cu.row,text:'+50',t:.8,c:'#b8860b'});if(net&&w===cur)nf?.event({x:[cu.row,cu.char]});}else if(cu.timer<=0){cu.state='eat';cu.timer=1.1;}}
   else if(cu.state==='eat'&&cu.timer<=0){cu.state='walk';cu.hop=.6;cu.target=undefined;w.sticks.push({row:cu.row,u:cu.u+.03});if(w===cur)voice(330,.05,.03,'square');}}
  w.cust=w.cust.filter(cu=>!cu.gone);
  for(const n of w.nanas){n.u-=dt*1.05*Math.min(1.4,.85+k*.15);const hit=w.cust.filter(cu=>cu.row===n.row&&cu.state==='walk'&&cu.u<n.u+.01&&cu.u>n.u-.06).sort((a,b)=>b.u-a.u)[0];
   if(hit){n.dead=true;hit.state='push';hit.timer=.45;hit.target=undefined;if(w===cur)voice(880,.05,.04,'triangle');}
   else if(n.u<=-.02){lose(w,'WASTED!',n.row);return;}}
  w.nanas=w.nanas.filter(n=>!n.dead);
  for(const st of w.sticks){st.u+=dt*.55*Math.min(1.3,.9+k*.1);if(st.u>=1){if(w.row===st.row){st.dead=true;w.score+=100;w.act='catch';w.actT=.25;w.pops.push({x:1,y:st.row,text:'+100',t:.8,c:'#b8860b'});if(w===cur)voice(1175,.06,.05,'square');}else{lose(w,'DROPPED IT!',st.row);return;}}}
  w.sticks=w.sticks.filter(st=>!st.dead);
  if(w.spawned>=quota&&!w.cust.length&&!w.sticks.length&&!w.nanas.length&&!w.sent.length){const bonus=500*(w.cleared+1);w.score+=bonus;w.cleared++;w.phase='clear';w.card=2.4;w.bonus=bonus;
   if(w===cur){[523,659,784,1047].forEach((f,i)=>voice(f,.12,.05,'triangle',{delay:i*.09}));s.react?.(w.player,'win',2);audio.narrate('clear',.8);}}
  if(w===cur&&w.phase==='play'&&Math.random()<dt*.012)audio.narrate('any',.5);
 }

 // ---------------------------------------------------------------- layout
 // A bar block in region R: `mirror` puts the tap end on the LEFT. Bars sit at the bottom of the region, the wall above.
 function block(R,mirror){
  const B0=Math.max(24,Math.min((R.h-(R.top||0))/ROWS,R.w*.31)),edge=B0*.42,door=B0*.3,x0=R.x+edge+door*1.6,x1=R.x+R.w-edge*2.1,L=(x1-x0);
  const B=Math.min(B0,L*.42),y0=R.y+R.h-B*ROWS-B*.06;
  const X=u=>mirror?R.x+R.w-(x0-R.x)-L*u:x0+L*u;
  return {R,mirror,L,B,y0,X,tapX:mirror?R.x+edge*1.2:R.x+R.w-edge*1.2,doorX:mirror?R.x+R.w-door*.75:R.x+door*.75,rowTop:r=>y0+B*r,barY:r=>y0+B*r+B*.68,head:B*.36,dir:mirror?-1:1};
 }
 let lay=null;
 function layout(){
  const W=s.W,H=s.H,top=50;
  if(!net)return lay={W,H,mine:block({x:0,y:0,w:W,h:H,top},false),theirs:null,kind:'solo'};
  if(W>=H*1.15){const half=W/2;return lay={W,H,kind:'wide',mine:block({x:half,y:0,w:half,h:H,top:top+14},false),theirs:block({x:0,y:0,w:half,h:H,top:top+14},true)};}
  const split=Math.round(H*.4);return lay={W,H,kind:'tall',theirs:block({x:0,y:0,w:W,h:split,top:top*1.3},true),mine:block({x:0,y:split,w:W,h:H-split,top:8},false)};
 }

 // ---------------------------------------------------------------- drawing
 const pic=n=>TS.picture(n);
 function cover(img,rx,ry,rw,rh){const k=Math.max(rw/img.width,rh/img.height),w=img.width*k,h=img.height*k;x.drawImage(img,rx+(rw-w)/2,ry+(rh-h)/2,w,h);}
 function text(t,px,py,size,{fill=INK,align='left',weight=700,alpha=1,base='middle'}={}){x.save();x.globalAlpha*=alpha;x.font=`${weight} ${size}px ${FONT}`;x.fillStyle=fill;x.textAlign=align;x.textBaseline=base;x.fillText(t,px,py);x.restore();}
 function fitText(t,maxW,size,weight=800){x.font=`${weight} ${size}px ${FONT}`;const w=x.measureText(t).width;return w>maxW?Math.max(8,size*maxW/w):size;}
 function drawRoom(w,b){
  const {R}=b,L=lvOf(w),ink=L.ink;x.save();x.beginPath();x.rect(R.x,R.y,R.w,R.h);x.clip();
  const bg=pic('bg-'+L.id+(R.w>R.h*1.1?'-wide':''))||pic('bg-'+L.id)||pic('bg-'+L.id+'-wide');
  if(bg)cover(bg,R.x,R.y,R.w,R.h);
  else{x.fillStyle=ink.wall;x.fillRect(R.x,R.y,R.w,R.h);
   // a calm white room: a thin trim line, a framed picture or two, the level's sign in plain lettering
   const wallH=b.y0-R.y;x.strokeStyle=ink.trim;x.lineWidth=2;x.beginPath();x.moveTo(R.x,b.y0-6);x.lineTo(R.x+R.w,b.y0-6);x.stroke();
   if(wallH>60){const sz=fitText(L.title,R.w*.8,clamp(wallH*.16,12,30));text(L.title,R.x+R.w/2,R.y+wallH*.55,sz,{align:'center',weight:800});
    text(L.sub.toUpperCase(),R.x+R.w/2,R.y+wallH*.55+sz*1.1,Math.max(9,sz*.42),{align:'center',fill:GREY,weight:600});
    if(L.id==='stand'){for(let k=0;k*24<R.w;k++){x.fillStyle=k%2?'#ffffff':BLUE;x.fillRect(R.x+k*24,R.y,24,Math.min(14,wallH*.12));}}
    else if(L.id==='penthouse'){x.strokeStyle='#c9ced4';x.lineWidth=1.5;for(let k=1;k<4;k++){const wx=R.x+R.w*k/4;x.strokeRect(wx-R.w*.07,R.y+wallH*.08,R.w*.14,wallH*.28);}}
    else{x.strokeStyle='#d8c39a';x.lineWidth=1;for(let k=0;k<6;k++){x.beginPath();x.moveTo(R.x,R.y+wallH*(.1+k*.05));x.lineTo(R.x+R.w,R.y+wallH*(.1+k*.05));x.stroke();}}}}
  // floor between the bars
  const fl=pic('floor-'+L.id),fy=b.y0+b.B*.4;
  if(fl){const pat=x.createPattern(fl,'repeat'),k=b.B*1.6/fl.width;if(pat.setTransform&&typeof DOMMatrix!=='undefined')pat.setTransform(new DOMMatrix().translate(R.x,fy).scale(k));x.fillStyle=pat;x.fillRect(R.x,fy,R.w,R.y+R.h-fy);}
  else if(!bg){x.fillStyle=ink.floor;x.fillRect(R.x,fy,R.w,R.y+R.h-fy);x.strokeStyle=ink.plank;x.lineWidth=1;for(let yy=fy;yy<R.y+R.h;yy+=b.B*.22){x.beginPath();x.moveTo(R.x,yy);x.lineTo(R.x+R.w,yy);x.stroke();}}
  x.restore();
 }
 function drawDoor(w,b,r){
  const L=lvOf(w),img=pic('door-'+L.id),h=b.B*1.05,y1=b.barY(r)+b.B*.3;
  if(img){const ww=h*img.width/img.height;x.save();x.translate(b.doorX,0);if(b.mirror)x.scale(-1,1);x.drawImage(img,-ww/2,y1-h,ww,h);x.restore();return;}
  // an open doorway seen edge-on: a dark gap in a door frame, a mat on the floor
  const ww=b.B*.3;x.fillStyle='#e9e9e9';x.fillRect(b.doorX-ww/2,y1-h,ww,h);x.fillStyle='#cfcfcf';x.fillRect(b.doorX-ww*.32,y1-h*.92,ww*.64,h*.92);
  x.strokeStyle=INK;x.lineWidth=1.5;x.strokeRect(b.doorX-ww/2,y1-h,ww,h);x.fillStyle=L.ink.trim;x.fillRect(b.doorX-ww*.7,y1-b.B*.05,ww*1.4,b.B*.05);
 }
 // a person behind the bar: sheet frame (headless) or the drawn stand-in, then the face
 function person(b,px,r,{sheetName,row,f,shirt,apron,face,dir,size}){
  const yb=b.barY(r),k=b.head/TS.BODY.headSize*(size||1),sh=sheetName&&TS.sheet(sheetName);
  const hx=px,hy=yb-(TS.BODY.bar-TS.BODY.head[1])*k;
  if(sh){const d=sh.def,fr=TS.frameRect(sh,row,f);x.save();x.translate(px,yb);if(dir<0)x.scale(-1,1);x.drawImage(sh.img,fr.sx,fr.sy,fr.sw,fr.sh,-d.head[0]*k,-d.bar*k,d.frame[0]*k,d.frame[1]*k);x.restore();}
  else{const tw=b.head*1.25,top=hy+b.head*.42;x.save();x.translate(px,0);if(dir<0)x.scale(-1,1);
   x.fillStyle=shirt;x.strokeStyle=INK;x.lineWidth=1.5;rr(x,-tw/2,top,tw,yb-top+4,tw*.25);x.fill();x.stroke();
   if(apron){x.fillStyle=apron[0];rr(x,-tw*.36,top+tw*.25,tw*.72,yb-top,4);x.fill();x.fillStyle=apron[1];x.fillRect(-tw*.36,top+tw*.42,tw*.72,tw*.08);}
   x.fillStyle='#ffffff';x.beginPath();x.moveTo(-tw*.14,top);x.lineTo(0,top+tw*.18);x.lineTo(tw*.14,top);x.closePath();x.fill();
   // arms by pose
   const arm=(ax,ang)=>{x.save();x.translate(ax,top+tw*.12);x.rotate(ang);x.fillStyle=shirt;rr(x,-tw*.09,0,tw*.18,tw*.62,tw*.09);x.fill();x.stroke();x.fillStyle='#e9b48c';x.beginPath();x.arc(0,tw*.66,tw*.1,0,Math.PI*2);x.fill();x.stroke();x.restore();};
   const sw=Math.sin(f*1.6)*.25;
   if(row==='angry'||row==='lose'){arm(-tw*.42,2.6+sw);arm(tw*.42,-2.6-sw);}
   else if(row==='eat'){arm(-tw*.42,.2);arm(tw*.4,-2.4);}
   else if(row==='push'||row==='serve'||row==='catch'){arm(-tw*.42,.3);arm(tw*.42,-1.3);}
   else{arm(-tw*.42,.15+sw);arm(tw*.42,-.15-sw);}
   x.restore();}
  face(hx,hy);
 }
 function drawBar(w,b,r){
  const L=lvOf(w),ink=L.ink,img=pic('bar-'+L.id),yb=b.barY(r),x0=Math.min(b.X(-.04),b.tapX),x1=Math.max(b.X(-.04),b.tapX),bh=b.B*.32;
  const xa=b.mirror?b.tapX-b.B*.2:b.X(-.06),xb=b.mirror?b.X(-.06):b.tapX+b.B*.2;
  if(img){const th=bh*1.15,tw=th*img.width/img.height;x.save();x.beginPath();x.rect(xa,yb-bh*.3,xb-xa,th);x.clip();for(let px=xa;px<xb;px+=tw)x.drawImage(img,px,yb-bh*.3,tw,th);x.restore();return;}
  x.fillStyle=ink.front;x.fillRect(xa,yb,xb-xa,bh*.85);
  if(L.id==='stand'){for(let px=xa,k=0;px<xb;px+=b.B*.16,k++){if(k%2){x.fillStyle=ink.front2;x.fillRect(px,yb,Math.min(b.B*.16,xb-px),bh*.85);}}}
  else{x.fillStyle=ink.front2;x.fillRect(xa,yb+bh*.55,xb-xa,bh*.08);}
  x.fillStyle=ink.top;x.fillRect(xa,yb-bh*.3,xb-xa,bh*.36);x.fillStyle=ink.topEdge;x.fillRect(xa,yb+bh*.02,xb-xa,bh*.08);
  x.strokeStyle=INK;x.lineWidth=1.2;x.strokeRect(xa,yb-bh*.3,xb-xa,bh*1.15);
 }
 function drawTap(w,b,r){
  const L=lvOf(w),img=pic('tap-'+L.id),yb=b.barY(r),def=TS.PICTURES['tap-'+L.id],tx=b.tapX+(b.mirror?b.B*.16:-b.B*.16);
  if(img){const h=b.B*.9,ww=h*img.width/img.height,k=h/def.size[1];x.save();x.translate(tx,0);if(b.mirror)x.scale(-1,1);x.drawImage(img,-ww/2,yb-def.bar*k,ww,h);x.restore();return;}
  const s1=b.B*.2;x.fillStyle=L.ink.tap;x.strokeStyle=INK;x.lineWidth=1.3;rr(x,tx-s1*.5,yb-s1*1.4,s1,s1*1.2,3);x.fill();x.stroke();
  x.fillStyle=INK;x.fillRect(tx-s1*.08,yb-s1*.25,s1*.16,s1*.25);
 }
 // the served thing (or its empty) lying on the bar
 function drawItem(w,b,u,r,empty){
  const L=lvOf(w),px=b.X(u),yb=b.barY(r)-b.B*.06,sz=b.B*.34,img=pic((empty?'empty-':'item-')+L.id);
  if(img){const h=sz*.75,ww=h*img.width/img.height;x.save();x.translate(px,0);if(b.mirror)x.scale(-1,1);x.drawImage(img,-ww/2,yb-h,ww,h);x.restore();return;}
  x.save();x.translate(px,yb);x.strokeStyle=INK;x.lineWidth=1.2;
  if(L.id==='stand'){if(empty){x.fillStyle='#c79a63';x.fillRect(-sz*.3,-sz*.06,sz*.6,sz*.06);x.strokeRect(-sz*.3,-sz*.06,sz*.6,sz*.06);}
   else{x.fillStyle='#8a5a2a';x.fillRect(sz*.2,-sz*.12,sz*.3,sz*.05);x.fillStyle='#ffe14a';x.beginPath();x.ellipse(0,-sz*.13,sz*.32,sz*.12,0,0,Math.PI*2);x.fill();x.stroke();x.fillStyle='#5a2e14';x.beginPath();x.ellipse(-sz*.1,-sz*.13,sz*.22,sz*.13,0,0,Math.PI*2);x.fill();}}
  else if(L.id==='penthouse'){x.fillStyle=empty?'rgba(210,230,240,.5)':'rgba(220,240,250,.85)';x.beginPath();x.moveTo(-sz*.25,-sz*.62);x.lineTo(sz*.25,-sz*.62);x.lineTo(0,-sz*.3);x.closePath();x.fill();x.stroke();
   x.beginPath();x.moveTo(0,-sz*.3);x.lineTo(0,-sz*.04);x.moveTo(-sz*.12,0);x.lineTo(sz*.12,0);x.stroke();if(!empty){x.fillStyle='#6a994e';x.beginPath();x.arc(sz*.05,-sz*.5,sz*.06,0,Math.PI*2);x.fill();}}
  else{x.fillStyle='#ffffff';rr(x,-sz*.2,-sz*.42,sz*.36,sz*.42,3);x.fill();x.stroke();x.beginPath();x.arc(sz*.18,-sz*.22,sz*.09,-1.2,1.2);x.stroke();
   if(!empty){x.fillStyle='#e9c9a8';x.fillRect(-sz*.17,-sz*.38,sz*.3,sz*.06);x.strokeStyle='rgba(120,120,120,.6)';x.beginPath();x.moveTo(-sz*.05,-sz*.48);x.quadraticCurveTo(sz*.05,-sz*.6,-sz*.02,-sz*.72);x.stroke();}}
  x.restore();
 }
 function drawCash(b,m){const px=b.X(m.u),yb=b.barY(m.row)-b.B*.05,img=pic('cash'),wd=b.B*.34;x.globalAlpha=m.t<1&&Math.floor(m.t*10)%2?.4:1;
  if(img){x.drawImage(img,px-wd/2,yb-wd*.62,wd,wd*.62);}else{x.fillStyle='#6fbf73';x.strokeStyle=INK;x.lineWidth=1.2;rr(x,px-wd/2,yb-wd*.32,wd,wd*.3,2);x.fill();x.stroke();text('$',px,yb-wd*.17,wd*.24,{align:'center',weight:800,fill:'#ffffff'});}x.globalAlpha=1;}
 function bubble(b,px,py,t,name,alpha){
  const fs=clamp(b.B*.15,9,15);x.font=`700 ${fs}px ${FONT}`;const maxW=Math.min(b.R.w*.6,260),words=t.split(' '),lines=[];let ln='';
  for(const wd of words){const tr=ln?ln+' '+wd:wd;if(x.measureText(tr).width>maxW&&ln){lines.push(ln);ln=wd;}else ln=tr;}if(ln)lines.push(ln);
  const lw=Math.max(...lines.map(l=>x.measureText(l).width),name?x.measureText(name).width*.8:0)+fs*1.1,lh=fs*1.2*lines.length+(name?fs*.95:0)+fs*.7;
  const bx=clamp(px-lw/2,b.R.x+4,b.R.x+b.R.w-lw-4),by=Math.max(b.R.y+(b.R.top||0)*.4,py-lh-fs*.6);
  x.save();x.globalAlpha=alpha;x.fillStyle='#ffffff';x.strokeStyle=INK;x.lineWidth=1.5;rr(x,bx,by,lw,lh,fs*.5);x.fill();x.stroke();
  x.beginPath();x.moveTo(clamp(px,bx+8,bx+lw-8)-5,by+lh-.5);x.lineTo(px,py-2);x.lineTo(clamp(px,bx+8,bx+lw-8)+5,by+lh-.5);x.closePath();x.fill();x.stroke();
  let yy=by+fs*.45;if(name){text(name.toUpperCase(),bx+fs*.55,yy+fs*.35,fs*.68,{fill:GREY,weight:700});yy+=fs*.95;}
  for(const l of lines){text(l,bx+fs*.55,yy+fs*.55,fs,{weight:700});yy+=fs*1.2;}x.restore();
 }
 // a whole set of bars: w = a world (own or remote), b = its block, who = player index wearing the apron
 function drawBars(w,b,who,{small}={}){
  drawRoom(w,b);const L=lvOf(w);
  for(let r=0;r<ROWS;r++){
   drawDoor(w,b,r);
   const here=w.cust.filter(cu=>cu.row===r).sort((a,bb)=>a.u-bb.u);
   for(const cu of here){const px=b.X(cu.u),f=Math.floor(w.bob*6+cu.id),row=cu.state,dir=(cu.state==='push'?-1:1)*b.dir;
    person(b,px,r,{sheetName:'customer-'+(cu.body+1),row,f,shirt:cu.shirt,dir,face:(hx,hy)=>{if(!HF.drawFaceById(x,cu.char,MOOD[cu.state],hx,hy,b.head*.74,dir)){x.fillStyle='#ddd';x.beginPath();x.arc(hx,hy,b.head*.4,0,Math.PI*2);x.fill();}}});
    if(cu.state==='eat')drawItem(w,b,cu.u+.02,r,false);}
   // the bartender (this world's player) at the tap end of the row they're on
   if(w.row===r){const f=Math.floor(w.bob*8),row=w.pause>0?'lose':w.act==='idle'?'idle':w.act,mood=w.pause>0?'sad':w.act==='catch'?'win':null;
    person(b,b.tapX,r,{sheetName:'bartender-p'+(who+1),row,f,shirt:'#ffffff',apron:who?['#d64545','#ffffff']:[BLUTH,BLUE],dir:-b.dir,size:1.05,
     face:(hx,hy)=>HF.drawFace(s,x,who,hx,hy,b.head/.6*1.05,mood||(w.act==='serve'?'normal':null),-b.dir)});}
   drawBar(w,b,r);drawTap(w,b,r);
   for(const m of w.cash)if(m.row===r)drawCash(b,m);
   for(const n of w.nanas)if(n.row===r)drawItem(w,b,n.u,r,false);
   for(const st of w.sticks)if(st.row===r)drawItem(w,b,st.u,r,true);
  }
  // speech bubbles over the faces
  for(const sb of w.say){const cu=w.cust.find(q=>q.id===sb.cid);if(!cu)continue;const px=b.X(cu.u),py=b.barY(cu.row)-(TS.BODY.bar-TS.BODY.head[1])*b.head/TS.BODY.headSize-b.head*.45;bubble(b,px,py,sb.text,small?'':nameOf(cu.char),clamp(sb.t*3,0,1));}
  for(const cu of w.cust)if(cu.sent&&cu.u<.08&&cu.state==='walk'){text('from '+cu.sent,b.X(cu.u),b.barY(cu.row)+b.B*.2,clamp(b.B*.12,8,12),{align:'center',fill:'#7d5ba6',weight:700});}
  for(const p of w.pops){const px=b.X(p.x),py=b.barY(p.y)-b.B*.5-(1.6-p.t)*b.B*.2,sz=p.big?clamp(b.B*.3,14,34):clamp(b.B*.18,11,20);text(p.text,clamp(px,b.R.x+sz*2,b.R.x+b.R.w-sz*2),py,sz,{align:'center',fill:p.c,weight:900,alpha:clamp(p.t*2,0,1)});}
  if(w.flash>0){x.fillStyle=`rgba(214,42,42,${w.flash*.18})`;x.fillRect(b.R.x,b.R.y,b.R.w,b.R.h);}
  // level title card / level clear: a plain white card with black lettering
  if(w.phase==='card'||w.phase==='clear'){const R=b.R,a=clamp(Math.min(w.card*3,(w.phase==='card'?2.2:2.4)-w.card+.3)*2,0,1),card=w.phase==='card'&&pic('card-'+L.id);
   x.save();x.globalAlpha=a;x.fillStyle='#ffffff';x.fillRect(R.x,R.y,R.w,R.h);
   if(card)cover(card,R.x,R.y,R.w,R.h);
   else{const big=fitText(w.phase==='clear'?'Level cleared':L.title,R.w*.84,clamp(Math.min(R.w,R.h)*.09,14,44));
    const title=w.phase==='clear'?'Level cleared':L.title,sub=w.phase==='clear'?`Tip jar +$${w.bonus}`:L.sub;
    text(title,R.x+R.w*.08,R.y+R.h*.46,big,{weight:800});text(sub,R.x+R.w*.08,R.y+R.h*.46+big*1.05,big*.45,{fill:GREY,weight:600});
    if(w.phase==='card'&&!small)text(`Serve ${L.item.toLowerCase()} · catch the ${L.empty.toLowerCase()}`,R.x+R.w*.08,R.y+R.h*.46+big*1.8,big*.36,{fill:INK,weight:500});}
   x.restore();}
 }
 function hud(w,b,who,{watch}={}){
  const R=b.R,fs=clamp(Math.min(R.w,R.h)*.05,11,20),y=R.y+(lay.kind==='tall'&&R.y>0?fs*.9:lay.kind!=='solo'&&watch?50+fs*.9:fs*1.6),left=R.x+fs*.7;   // online: the rival's panel sits under the duel chip
  const name=s.players[who]?.name||'';
  x.save();x.fillStyle='rgba(255,255,255,.88)';rr(x,left-fs*.4,y-fs*.95,Math.min(R.w*.55,fs*11),fs*1.9,fs*.4);x.fill();x.restore();
  text(`$${w.score}`,left,y-fs*.1,fs*1.2,{weight:800});
  x.font=`800 ${fs*1.2}px ${FONT}`;const sw=x.measureText(`$${w.score}`).width;
  text(name,left+sw+fs*.6,y-fs*.25,fs*.7,{fill:GREY,weight:700});
  for(let i=0;i<Math.max(0,w.lives);i++){x.fillStyle=BLUTH;x.strokeStyle=INK;x.lineWidth=1;x.beginPath();x.ellipse(left+sw+fs*.9+i*fs*1.1,y+fs*.45,fs*.42,fs*.16,0,0,Math.PI*2);x.fill();x.stroke();}
  if(!watch){const left2=Math.max(0,Math.ceil(w.cap-w.time)),under=R.y<10&&R.x+R.w>lay.W-5;text(String(left2),R.x+R.w-fs*.8,under?52+fs*.7:y,fs*1.3,{align:'right',weight:800,fill:left2<=10?'#d62a2a':INK});}
  if(!net&&who===1)text(`beat $${w.scores?.[0]??0}`,left,y+fs*1.5,fs*.75,{fill:GREY,weight:700});
 }
 function draw(w){
  layout();x.setTransform(1,0,0,1,0,0);x.fillStyle='#ffffff';x.fillRect(0,0,lay.W,lay.H);
  if(shake.mag>.3)x.translate((Math.random()-.5)*shake.mag,(Math.random()-.5)*shake.mag);
  drawBars(w,lay.mine,w.player);
  x.setTransform(1,0,0,1,0,0);hud(w,lay.mine,w.player);
  if(w.ending&&!net){const sz=fitText(w.endReason==='time'?'Closing time.':'Stand closed.',lay.W*.8,clamp(lay.W*.07,22,48));x.fillStyle='rgba(255,255,255,.85)';x.fillRect(0,lay.H*.42,lay.W,sz*2);text(w.endReason==='time'?'Closing time.':'Stand closed.',lay.W/2,lay.H*.42+sz,sz,{align:'center',weight:800});}
  s.debug.world=w;
 }

 // ---------------------------------------------------------------- input
 function rowAt(b,py){return clamp(Math.floor((py-b.y0)/b.B),0,ROWS-1);}
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive||!cur||!lay)return;ev.preventDefault();const p=s.pointer(ev),b=lay.mine;
  if(net&&(p.y<b.R.y||p.x<b.R.x))return;   // the other player's bars are just to watch
  for(const m of cur.cash){const X=b.X(m.u),Y=b.barY(m.row)-b.B*.15;if(Math.abs(p.x-X)<b.B*.32&&Math.abs(p.y-Y)<b.B*.25){grabCash(cur,m);nf?.push();return;}}
  serve(cur,rowAt(b,p.y));nf?.push();});
 s.on(document,'keydown',ev=>{if(!cur||s.paused)return;const k=ev.key;if(k==='ArrowUp'||k==='w'){cur.row=Math.max(0,cur.row-1);}else if(k==='ArrowDown'||k==='s'){cur.row=Math.min(ROWS-1,cur.row+1);}else if(k===' '||k==='Enter')serve(cur,cur.row);else return;ev.preventDefault();});
 s.hint('Tap a bar to jump there and slide the order down it. Shove customers out the door, then be on their bar to catch the empty they slide back. Don\'t serve an empty bar, drop an empty, or let anyone reach you. Tap loose cash for +150. Clear every customer to open the next bar. Keys: ↑/↓ + Space.');
 s.debug={engine:'moneygrab',get world(){return cur;},set world(v){},get remote(){return remote;},pool,lose:()=>cur&&lose(cur,'TEST',0),clearLevel:()=>{if(!cur)return;cur.spawned=99;cur.cust=[];cur.sticks=[];cur.nanas=[];},
  say:t=>{const cu=cur?.cust[0];if(cu)talk(cur,cu,t||lineFor(cu.char,Math.random));}};
 // autopilot (tests): serve a bar with someone walking and nothing on the way, catch empties first
 function botStep(w){if(!w||w.phase!=='play'||w.pause>0||w.ending)return;
  const st=w.sticks.filter(q=>q.u>.55).sort((a,b)=>b.u-a.u)[0];if(st){if(w.row!==st.row){w.row=st.row;w.act='run';w.actT=.15;}return;}
  const m=w.cash[0];if(m&&Math.random()<.02){grabCash(w,m);return;}
  const need=[0,1,2,3].map(r=>({r,c:w.cust.filter(cu=>cu.row===r&&cu.state==='walk').length-w.nanas.filter(n=>n.row===r).length,lead:Math.max(0,...w.cust.filter(cu=>cu.row===r&&cu.state==='walk').map(cu=>cu.u))})).filter(q=>q.c>0).sort((a,b)=>b.lead-a.lead)[0];
  if(need&&w.cd<=0)serve(w,need.r);}

 // ---------------------------------------------------------------- online: both shifts at once
 let nf=null;
 if(net){
  remote=make(them);remote.phase='card';
  const packW=w=>({lv:w.lv,cl:w.cleared,sc:w.score,li:w.lives,r:w.row,ph:w.phase,cd:+w.card.toFixed(2),pa:+Math.max(0,w.pause).toFixed(2),a:w.act,fl:+w.flash.toFixed(2),bo:w.bonus||0,
   c:w.cust.map(cu=>[cu.id,cu.row,Math.round(cu.u*1000),ST.indexOf(cu.state),cu.char,cu.body,cu.shirt,cu.sent||0]),n:w.nanas.map(q=>[q.row,Math.round(q.u*1000)]),k:w.sticks.map(q=>[q.row,Math.round(q.u*1000)]),m:w.cash.map(q=>[q.row,Math.round(q.u*1000)]),t:+w.time.toFixed(1)});
  nf=netField(s,{hz:15,pack:()=>packW(cur||remote),
   unpack:(i,d)=>{const w=remote;if(!d)return;w.lv=d.lv|0;w.cleared=d.cl|0;w.score=d.sc|0;w.lives=d.li|0;w.row=d.r|0;w.phase=d.ph||'play';w.card=+d.cd||0;w.pause=+d.pa||0;w.act=d.a||'idle';w.actT=.2;w.flash=Math.max(w.flash,+d.fl||0);w.bonus=d.bo|0;w.time=+d.t||0;
    const old=new Map(w.cust.map(cu=>[cu.id,cu]));w.cust=(d.c||[]).map(([id,row,u,st,char,body,shirt,sent])=>{const o=old.get(id)||{id,u:u/1000};return Object.assign(o,{row,tu:u/1000,state:ST[st]||'walk',char,body,shirt,sent:sent||null});});
    const lists=(arr,prev)=>(arr||[]).map(([row,u],j)=>{const o=prev.find(q=>q.row===row&&Math.abs(q.u-u/1000)<.15)||{row,u:u/1000};o.tu=u/1000;return o;});
    w.nanas=lists(d.n,w.nanas);w.sticks=lists(d.k,w.sticks);w.cash=(d.m||[]).map(([row,u])=>({row,u:u/1000,t:4}));},
   onEvent:e=>{if(Array.isArray(e?.x)&&cur){const [row,char]=e.x;cur.sent.push([row|0,String(char),s.players[them]?.name||'them']);}
    else if(Array.isArray(e?.say)){const [cid,t]=e.say;remote.say=remote.say.filter(b=>b.cid!==cid);remote.say.push({cid,text:String(t).slice(0,120),t:2.6});}}});
 }
 function easeRemote(dt){const w=remote,k=Math.min(1,dt*12);w.bob+=dt;for(const p of w.pops)p.t-=dt;for(const b of w.say)b.t-=dt;w.say=w.say.filter(b=>b.t>0);w.flash=Math.max(0,w.flash-dt*2);
  for(const q of [...w.cust,...w.nanas,...w.sticks])if(q.tu!==undefined)q.u+=(q.tu-q.u)*k;}

 if(net){
  cur=make(me);
  const intro=`Online Tapper: you and ${s.players[them].name} work the same room at the same time. You're on your own bars; theirs are at the far end. Shove a customer out your door and they walk over to ${s.players[them].name}'s bars. Most money at closing time wins.`;
  if(!await s.pass(me,intro,'Ready — open the bar'))return;
  let phase='sync',count=3,endWait=false,done=false;
  nf.start('go').then(()=>{if(phase==='sync')phase='count';});
  s.debug.bot=()=>{if(s.debug._bot)return '';s.debug._bot=true;return 'drive';};
  s.frame(dt=>{if(!s.alive||done)return;nf.tick(dt);easeRemote(dt);shake.step(dt);audio.tick();
   if(phase==='count'){count-=dt;if(count<=0){phase='play';startLevel(cur);}}
   else if(phase==='play'){cur.time+=dt;step(cur,dt);if(s.debug._bot)botStep(cur);
    if(!cur.ending&&(cur.time>=SECONDS||(cur.lives<=0&&cur.pause<=0))){cur.ending=1;cur.endReason=cur.time>=SECONDS?'time':'over';phase='wait';nf.finish({score:cur.score});audio.narrate('end',.8);
     nf.remoteDone().then(v=>{if(v&&typeof v.score==='number')remote.score=v.score|0;endWait=true;});}}
   else if(phase==='wait'){step(cur,dt);if(endWait&&!done){done=true;const sc=[0,0];sc[me]=cur.score;sc[them]=remote.score;s.setScores(sc);
    const win=sc[0]===sc[1]?null:sc[0]>sc[1]?0:1;if(win===me)audio.narrate('win',1);
    setTimeout(()=>{if(s.alive)s.finish(sc,win===null?`Banana Stand Tapper tie at $${sc[0]}.`:`${s.players[win].name} out-serves ${s.players[1-win].name}, $${Math.max(...sc)} to $${Math.min(...sc)}.`);},1600);}}
   const sc=[0,0];sc[me]=cur.score;sc[them]=remote.score;s.setScores(sc);
   layout();x.setTransform(1,0,0,1,0,0);x.fillStyle='#ffffff';x.fillRect(0,0,lay.W,lay.H);
   drawBars(remote,lay.theirs,them,{small:lay.kind==='tall'});
   if(shake.mag>.3)x.translate((Math.random()-.5)*shake.mag,(Math.random()-.5)*shake.mag);
   drawBars(cur,lay.mine,me);x.setTransform(1,0,0,1,0,0);
   // the seam between the two ends of the room
   x.strokeStyle=INK;x.lineWidth=2;x.beginPath();if(lay.kind==='wide'){x.moveTo(lay.W/2,0);x.lineTo(lay.W/2,lay.H);}else{x.moveTo(0,lay.theirs.R.h);x.lineTo(lay.W,lay.theirs.R.h);}x.stroke();
   hud(remote,lay.theirs,them,{watch:true});hud(cur,lay.mine,me);
   if(phase==='sync'||phase==='count'){const t=phase==='sync'?`Waiting for ${s.players[them].name}…`:String(Math.ceil(count)),sz=phase==='sync'?clamp(lay.W*.045,14,26):clamp(lay.W*.14,40,90),R=lay.mine.R;
    x.fillStyle='rgba(255,255,255,.85)';x.fillRect(R.x,R.y+R.h*.4,R.w,sz*2);text(t,R.x+R.w/2,R.y+R.h*.4+sz,sz,{align:'center',weight:800});}
   if(phase==='wait'&&!done){const R=lay.mine.R,sz=clamp(R.w*.05,13,22);x.fillStyle='rgba(255,255,255,.88)';x.fillRect(R.x,R.y+R.h*.45,R.w,sz*2.4);
    text(cur.endReason==='time'?'Closing time.':'Your bar is closed.',R.x+R.w/2,R.y+R.h*.45+sz*.8,sz,{align:'center',weight:800});text(`Watching ${s.players[them].name} finish…`,R.x+R.w/2,R.y+R.h*.45+sz*1.75,sz*.7,{align:'center',fill:GREY,weight:600});}
   s.debug.world=cur;});
  return;
 }

 // ---------------------------------------------------------------- pass and play / 1P rounds
 const scores=await turnRunner(s,{seconds:SECONDS,
  intro:(i,sc)=>i===0?`Tapper at the Bluths' bars. ${s.players[0].name} works the first shift; the customers are anybody and everybody. Tap a bar to slide an order down it, catch the empties they slide back, grab loose cash. Serve everyone and the next bar opens. Three lives, 90 seconds.`:`${s.players[1].name}, your shift. Same crowd. Beat $${sc[0]}.`,
  make:i=>{cur=make(i);startLevel(cur);return cur;},
  step:(w,dt)=>{shake.step(dt);audio.tick();step(w,dt);if(s.debug._bot)botStep(w);},
  draw,done:w=>w.lives<=0&&w.pause<=0,score:w=>w.score});
 audio.stop();
 if(!scores)return;
 s.finish(scores,`Banana Stand Tapper · $${scores[0]} vs $${scores[1]}`);
}
Object.assign(exports,{moneygrab});
