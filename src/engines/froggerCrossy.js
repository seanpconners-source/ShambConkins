// Two games from the old Crossy Road Chaos (owner's triage note). frogger (new id frogger-heads): the 1981 arcade cabinet's layout and
// rules with the player's head on the frog: five bays, cars below, logs and diving turtles above, a clock per frog, three lives.
// crossyRoad (id crossy-chaos): the mobile game's look, a chunky voxel world seen at an angle; hop forever, the camera keeps coming,
// one life, an eagle takes you if you dawdle. Both use turnRunner: same seed, P1 then P2, highest score; solo = rounds.
// Our own layouts, art and sounds drawn here. Swipe or drag to hop, tap hops forward.
const {seededRandom,clamp}=require('src/utils.js');
const {tone}=require('src/audio.js');
const {turnRunner}=require('src/engines/retroKit.js');
const {directionGestures}=require('src/engines/directionGestures.js');

const hopSound=()=>tone(520,.07,.04,'square'),splat=()=>{tone(120,.25,.09,'sawtooth');tone(70,.3,.08,'square');},plunk=()=>{tone(300,.12,.07,'sine');tone(160,.2,.06,'sine');},cheer=()=>[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.12,.05,'square'),i*90));
const wrap=(v,n)=>((v%n)+n)%n;

// ==================================================================== FROGGER
const COLS=13,RIVER_TOP=11,HOME=12;
// row: [kind, speed in cells/s (minus = left), [[start cell, length], ...], period in cells]
const LANES={1:['car',-1.1,[[0,1],[4.5,1],[9,1]],13.5,'#f2d21e'],2:['dozer',1,[[1,1],[6,1],[11,1]],15,'#3ee0c8'],3:['car',-1.4,[[2,1],[7,1],[12,1]],15,'#f03e9c'],4:['racer',3,[[0,1]],13,'#fff'],5:['truck',-1.5,[[1,2],[8,2]],14,'#e8e8e8'],
 7:['turtle',-1.3,[[0,3],[4.5,3],[9,3]],13.5],8:['log',1,[[0,3],[6,3],[11,3]],16],9:['log',2.3,[[1,6],[10,6]],18],10:['turtle',-1.7,[[0,2],[4,2],[8,2],[12,2]],16],11:['log',1.5,[[2,4],[8,4],[14,4]],18]};
const BAYS=[1,3.75,6.5,9.25,12];   // bay centres (cell units from the left edge of cell 0, 13 wide)
function froggerObjects(lane,t,level){const [,sp,list,period]=LANES[lane],k=1+.18*level;return list.map(([x0,len],i)=>({x:wrap(x0+sp*k*t,period)-(period-COLS)/2,len,i}));}
const diving=(lane,o,t)=>LANES[lane][0]==='turtle'&&o.i===0&&wrap(t,9)>6;   // the first group of each turtle row dives for a while

async function frogger(s){
 const [,g]=s.canvas(680,780,{fill:true});let world=null;
 const reset=w=>{w.x=6;w.row=0;w.hopT=0;w.fromX=6;w.fromRow=0;w.frogT=30;w.maxRow=0;};
 const hop=(dx,dy)=>{const w=world;if(!w||s.paused||w.dead>0||w.hopT>0||w.ending)return;const nx=clamp(w.x+dx,0,COLS-1),row=clamp(w.row-dy,0,HOME);if(nx===w.x&&row===w.row)return;w.fromX=w.x;w.fromRow=w.row;w.x=nx;w.row=row;w.hopT=.13;hopSound();if(row>w.maxRow){w.maxRow=row;w.score+=10;}};
 directionGestures(s,(i,dx,dy)=>hop(dx,dy),{repeat:0,tap:[0,-1]});
 s.hint('Swipe or drag to hop one square; a tap hops up. Cross the road, ride the logs and turtles, fill all five bays. Turtles that are going under won’t hold you.');
 const die=(w,why)=>{if(w.dead>0)return;w.lives--;w.dead=1;w.why=why;w.deadX=w.x;w.deadRow=w.row;why==='water'?plunk():splat();s.react?.(w.player,'sad');};
 const geo=()=>{const W=s.W,H=s.H,top=Math.max(48,H*.07),bot=46,c=Math.min(W/COLS,(H-top-bot)/14),ox=(W-c*COLS)/2,oy=top+(H-top-bot-c*14)/2;return {W,H,c,ox,oy,X:x=>ox+x*c,Y:r=>oy+(HOME+1-r)*c};};
 const scores=await turnRunner(s,{seconds:300,endDelay:1.4,readyText:'Hop to it',
  intro:i=>`${s.players[i].name}: get your frog across the road and the river into all five bays. Three lives, and a clock on every frog.`,
  soloTarget:r=>400+200*r,
  make(i){const w={player:i,score:0,lives:3,level:0,t:0,dead:0,homes:[false,false,false,false,false],fly:-1,flyT:6,why:''};reset(w);world=w;return w;},
  done:w=>w.lives<=0&&w.dead<=0,score:w=>w.score,
  step(w,dt){w.t+=dt;w.hopT=Math.max(0,w.hopT-dt);w.flyT-=dt;if(w.flyT<=0){w.flyT=5+Math.random()*4;const open=w.homes.map((h,i)=>h?-1:i).filter(i=>i>=0);w.fly=w.fly>=0||!open.length?-1:open[Math.floor(Math.random()*open.length)];}
   if(w.dead>0){w.dead-=dt;if(w.dead<=0&&w.lives>0)reset(w);return;}if(w.lives<=0)return;
   w.frogT-=dt;if(w.frogT<=0)return die(w,'time');if(w.hopT>0)return;
   const lane=LANES[w.row];
   if(w.row===HOME){const bay=BAYS.findIndex(b=>Math.abs(w.x+.5-b)<.8);if(bay<0||w.homes[bay])return die(w,'hedge');w.homes[bay]=true;const fly=w.fly===bay;if(fly)w.fly=-1;w.score+=50+Math.round(w.frogT)*10+(fly?200:0);s.react?.(w.player,'win');
    if(w.homes.every(Boolean)){w.score+=1000;w.level++;w.homes=[false,false,false,false,false];w.t=0;cheer();}else tone(880,.12,.05,'square');reset(w);return;}
   if(!lane)return;const objs=froggerObjects(w.row,w.t,w.level),at=w.x+.5;
   if(lane[0]==='log'||lane[0]==='turtle'){const on=objs.find(o=>at>o.x-.15&&at<o.x+o.len+.15&&!diving(w.row,o,w.t));if(!on)return die(w,'water');w.x+=lane[1]*(1+.18*w.level)*dt;if(w.x<-.5||w.x>COLS-.5)die(w,'water');}
   else if(objs.some(o=>at>o.x+.1&&at<o.x+o.len-.1+.25))die(w,'car');},
  draw(w,dt){const G=geo(),{c,X,Y,W,H}=G;g.fillStyle='#000';g.fillRect(0,0,W,H);
   g.fillStyle='#000047';g.fillRect(X(0),Y(RIVER_TOP),c*COLS,c*5);g.fillStyle='#000';g.fillRect(X(0),Y(5),c*COLS,c*5);
   for(const r of [0,6]){g.fillStyle='#7b1fd1';g.fillRect(X(0),Y(r),c*COLS,c);g.fillStyle='#a84cf0';for(let i=0;i<COLS*2;i++)if((i+r)%3===0)g.fillRect(X(0)+i*c/2+c*.1,Y(r)+c*.25,c*.12,c*.12);}
   // home row: hedge with five bays
   g.fillStyle='#0a7a14';g.fillRect(X(0),Y(HOME),c*COLS,c);g.fillStyle='#16b022';for(let i=0;i<COLS*3;i++)g.fillRect(X(0)+i*c/3,Y(HOME)+(i%2?.1:.5)*c,c*.2,c*.2);
   BAYS.forEach((b,i)=>{const x=X(b)-c*.8;g.fillStyle='#000047';g.fillRect(x,Y(HOME)+c*.2,c*1.6,c*.8);if(w.homes[i])s.sprite(g,w.player,X(b),Y(HOME)+c*.55,c*.95,{exact:true,mood:'win'});else if(w.fly===i){g.fillStyle='#ffe23a';g.fillRect(X(b)-c*.12,Y(HOME)+c*.5,c*.24,c*.2);g.fillStyle='#cfefff';g.fillRect(X(b)-c*.3,Y(HOME)+c*.45,c*.18,c*.1);g.fillRect(X(b)+c*.12,Y(HOME)+c*.45,c*.18,c*.1);}});
   for(const [r,l] of Object.entries(LANES)){const row=+r,objs=froggerObjects(row,w.t,w.level);g.save();g.beginPath();g.rect(X(0),Y(row),c*COLS,c);g.clip();const kind=l[0];
    for(const o of objs){const x=X(o.x),y=Y(row);
     if(kind==='log'){g.fillStyle='#8a4a1a';g.fillRect(x,y+c*.14,o.len*c,c*.72);g.fillStyle='#c07a30';g.fillRect(x+c*.05,y+c*.24,o.len*c-c*.1,c*.12);g.fillStyle='#5a2c0a';for(let i=0;i<o.len;i++)g.fillRect(x+(i+.3)*c,y+c*.52,c*.4,c*.08);}
     else if(kind==='turtle'){const dive=diving(row,o,w.t);for(let i=0;i<o.len;i++){const tx=x+(i+.5)*c,ty=y+c*.5,f=dive?.55+.2*Math.sin(w.t*8):1;g.fillStyle=dive?'#7a2020':'#e03020';g.beginPath();g.ellipse(tx,ty,c*.38*f,c*.32*f,0,0,7);g.fill();g.fillStyle='#ffb020';g.fillRect(tx-c*.13*f,ty-c*.1*f,c*.26*f,c*.2*f);}}
     else{const col=l[4],len=o.len*c,right=l[1]>0;g.fillStyle=col;if(kind==='truck'){g.fillRect(x,y+c*.14,len,c*.72);g.fillStyle='#c02a2a';g.fillRect(right?x+len-c*.5:x,y+c*.14,c*.5,c*.72);}else{g.fillRect(x+c*.1,y+c*.26,c*.8,c*.5);g.fillStyle='#000';g.fillRect(x+c*.14,y+c*.12,c*.2,c*.14);g.fillRect(x+c*.66,y+c*.12,c*.2,c*.14);g.fillRect(x+c*.14,y+c*.76,c*.2,c*.14);g.fillRect(x+c*.66,y+c*.76,c*.2,c*.14);g.fillStyle=kind==='racer'?'#ff3a3a':'#2050e0';g.fillRect(x+c*(right?.55:.25),y+c*.34,c*.2,c*.34);}}}
    g.restore();}
   // the frog: green legs under the player's head
   if(w.dead>0){const x=X(w.deadX+.5),y=Y(w.deadRow)+c/2;g.save();g.translate(x,y);g.rotate((1-w.dead)*4);s.sprite(g,w.player,0,0,c*1.1*Math.max(.3,w.dead),{exact:true,mood:'sad'});g.restore();const msg={car:'SQUASHED!',water:'SPLASH!',time:'TIME!',hedge:'OUCH!'}[w.why]||'';if(msg){g.fillStyle='#ff4040';g.font=`900 ${Math.round(c*.8)}px monospace`;g.textAlign='center';g.textBaseline='middle';g.fillText(msg,W/2,Y(6)+c/2);}}
   else{const k=w.hopT>0?1-w.hopT/.13:1,fx=w.fromX+(w.x-w.fromX)*k,fr=w.fromRow+(w.row-w.fromRow)*k,x=X(fx+.5),y=Y(fr)+c/2-Math.sin(k*Math.PI)*c*.22;g.fillStyle='#2bd42b';g.fillRect(x-c*.42,y+c*.08,c*.2,c*.3);g.fillRect(x+c*.22,y+c*.08,c*.2,c*.3);g.fillRect(x-c*.28,y-c*.34,c*.14,c*.2);g.fillRect(x+c*.14,y-c*.34,c*.14,c*.2);g.fillStyle='#16a016';g.fillRect(x-c*.24,y-c*.08,c*.48,c*.46);s.sprite(g,w.player,x,y-c*.1,c*1.25,{exact:true,mood:'normal'});}
   // cabinet text: score on top, lives and the time bar below
   g.textBaseline='middle';g.font=`900 ${Math.round(Math.min(18,c*.62))}px monospace`;g.textAlign='left';g.fillStyle='#fff';g.fillText(`${w.player?'2':'1'}-UP`,10,14);g.fillStyle='#ff4040';g.fillText(String(w.score).padStart(5,'0'),10,34);g.fillStyle='#fff';g.fillText(`LV ${w.level+1}`,X(COLS/2)-20,24);
   const by=Y(0)+c+6;for(let i=0;i<w.lives;i++)s.sprite(g,w.player,12+i*(c*.75)+c*.3,by+12,c*.7,{exact:true});const frac=clamp(w.frogT/30,0,1),bw=W*.42;g.fillStyle=frac<.33?'#ff3030':'#2bd42b';g.fillRect(W-12-bw*frac,by+6,bw*frac,12);g.fillStyle='#ffe23a';g.textAlign='right';g.fillText('TIME',W-12-bw-6,by+12);
   s.debug={engine:'frogger',world:w,hop,die,LANES,geo};}});
 if(scores)s.finish(scores,`Frogger: ${s.players[0].name} ${scores[0]} · ${s.players[1].name} ${scores[1]}.`);
}

// ==================================================================== CROSSY ROAD
const HALF=4,CAMERA_K=.42;           // playable columns -4..4; forward leans right on screen
function crossyRows(seed){const R=seededRandom(seed+':crossy'),rows=[];let r=0,dir=1;
 const push=(kind,extra={})=>{rows.push({kind,...extra});r++;};
 for(let i=0;i<4;i++)push('grass',{trees:scatter(R,0)});   // a clear start
 while(r<600){const hard=Math.min(1,r/120),pick=R();
  if(pick<.4){const n=1+Math.floor(R()*(2+hard*3));for(let i=0;i<n;i++){dir=R()<.5?1:-1;const len=R()<.25?2.6:1.5;push('road',{dir,speed:(1.6+R()*1.8+hard*1.6)*dir,gap:(5.5+R()*3.5-hard*1.4)|0||4,len,off:R()*20,col:['#e84a3a','#3a8ee8','#f2c02a','#e8e8e8','#2fb06a'][Math.floor(R()*5)]});}}
  else if(pick<.62){const n=1+Math.floor(R()*3);for(let i=0;i<n;i++){dir=-dir;push('river',{dir,speed:(1+R()*1.1+hard*.5)*dir,gap:4.5+R()*2.5,len:2+Math.floor(R()*2.5),off:R()*20});}}
  else if(pick<.74)push('rail',{dir:R()<.5?1:-1,every:7+R()*5,off:R()*9});
  else{const n=1+Math.floor(R()*3);for(let i=0;i<n;i++)push('grass',{trees:scatter(R,.14+hard*.1),coin:R()<.22?Math.floor(R()*9)-4:null});}}
 return rows;}
function scatter(R,p){const out=[];for(let c=-8;c<=8;c++)if(Math.abs(c)>HALF||R()<p)if(c!==0||R()<.5)out.push(c);return out;}
// moving things on a row at time t: [{x0, x1}] in column units
function rowObjects(row,t,span=12){if(row.kind==='rail'){const cycle=wrap(t+row.off,row.every),pass=cycle<1.4;if(!pass)return [];const k=cycle/1.4,x=(k*2-1)*span*1.5*row.dir;return [{x0:x-10,x1:x+10}];}
 if(!row.gap)return [];const out=[],p=row.gap+row.len;for(let i=-Math.ceil(span/p)-1;i<=Math.ceil(span/p)+1;i++){const x=wrap(row.off+row.speed*t,p)+i*p;out.push({x0:x,x1:x+row.len});}return out;}
const railWarning=(row,t)=>row.kind==='rail'&&wrap(t+row.off,row.every)>row.every-1.1;

async function crossyRoad(s){
 const [,g]=s.canvas(680,780,{fill:true}),rows=crossyRows(s.seed);let world=null;
 const blocked=(row,col)=>rows[row]?.kind==='grass'&&rows[row].trees?.includes(col);
 const hop=(dx,dy)=>{const w=world;if(!w||s.paused||w.dead||w.hopT>0||w.ending)return;const col=Math.round(w.x)+dx,row=w.row-dy;w.face=dx?dx:w.face;w.idle=0;if(col<-HALF||col>HALF||row<Math.max(0,w.best-6)||row>=rows.length||blocked(row,col)){w.bump=.12;return;}w.fromX=w.x;w.fromRow=w.row;w.x=col;w.row=row;w.hopT=.14;hopSound();if(row>w.best){w.best=row;}};
 directionGestures(s,(i,dx,dy)=>hop(dx,dy),{repeat:.2,tap:[0,-1]});
 s.hint('Tap to hop forward; swipe left, right or back. Keep moving: the camera won’t wait, and neither will the eagle. Logs float, trains don’t stop.');
 const kill=(w,why)=>{if(w.dead)return;w.dead=why;w.deadT=0;w.deadX=w.x;w.deadRow=w.row;if(why==='water')plunk();else splat();s.react?.(w.player,'sad');};
 const scores=await turnRunner(s,{seconds:240,endDelay:1.8,readyText:'Hop!',
  intro:i=>`${s.players[i].name}: tap to hop as far as you can. One life. The same road for both of you. Farthest plus coins wins.`,
  soloTarget:r=>12+6*r,
  make(i){const w={player:i,x:0,row:1,best:1,fromX:0,fromRow:1,hopT:0,face:1,cam:0,camX:0,t:0,idle:0,coins:0,dead:null,deadT:0,taken:new Set(),bump:0};world=w;return w;},
  done:w=>!!w.dead&&w.deadT>.2,score:w=>w.best-1+w.coins,
  step(w,dt){w.t+=dt;w.bump=Math.max(0,w.bump-dt);if(w.dead){w.deadT+=dt;return;}w.idle+=dt;w.hopT=Math.max(0,w.hopT-dt);
   const speedUp=.45+Math.min(1.1,w.best/90);w.cam=Math.max(w.cam+speedUp*dt,w.row-5.2+0);w.cam+=(Math.max(w.cam,w.row-5)-w.cam)*Math.min(1,dt*6);w.camX+=(w.x*.6-w.camX)*Math.min(1,dt*4);
   if(w.row<w.cam-1.6||w.idle>9)return kill(w,'eagle');if(w.hopT>0)return;
   const row=rows[w.row],objs=rowObjects(row,w.t);
   if(row.kind==='river'){const on=objs.find(o=>w.x>o.x0-.42&&w.x<o.x1-.58);if(!on)return kill(w,'water');w.x+=row.speed*dt;if(Math.abs(w.x)>HALF+1.5)kill(w,'water');}
   else if(row.kind==='road'||row.kind==='rail'){if(objs.some(o=>w.x>o.x0-.42&&w.x<o.x1-.58+.0))kill(w,row.kind==='rail'?'train':'car');}
   if(row.coin!=null&&!w.taken.has(w.row)&&Math.abs(w.x-row.coin)<.6){w.taken.add(w.row);w.coins++;tone(1320,.08,.05,'square');}},
  draw(w,dt){const W=s.W,H=s.H,u=Math.min(W/9.5,H/13,70),cx=W/2,cy=H*.68;
   // world (col, row, height) to the screen: forward goes up and leans right
   const P=(x,r,z=0)=>[cx+(x-w.camX+(r-w.cam-4)*CAMERA_K)*u,cy-(r-w.cam-4)*u*.86-z*u*.9+(x-w.camX)*u*.12];
   const quad=(a,b,c2,d,col)=>{g.fillStyle=col;g.beginPath();g.moveTo(...a);g.lineTo(...b);g.lineTo(...c2);g.lineTo(...d);g.closePath();g.fill();};
   const shade=(hex,k)=>{const n=parseInt(hex.slice(1),16),f=v=>Math.round(clamp(v*k,0,255));return `rgb(${f(n>>16)},${f((n>>8)&255)},${f(n&255)})`;};
   // a voxel: x,y across/forward extents, z up
   const box=(x0,x1,r0,r1,z0,z1,col)=>{quad(P(x0,r0,z1),P(x1,r0,z1),P(x1,r1,z1),P(x0,r1,z1),col);quad(P(x0,r0,z0),P(x1,r0,z0),P(x1,r0,z1),P(x0,r0,z1),shade(col,.72));quad(P(x0,r0,z0),P(x0,r1,z0),P(x0,r1,z1),P(x0,r0,z1),shade(col,.55));};
   g.fillStyle='#7ccf4a';g.fillRect(0,0,W,H);
   const first=Math.max(0,Math.floor(w.cam)-3),last=Math.min(rows.length-1,Math.ceil(w.cam)+15),SPAN=11;
   for(let r=last;r>=first;r--){const row=rows[r],kind=row.kind,y0=r-.5,y1=r+.5,base={grass:r%2?'#8fdc54':'#84d34a',road:'#4c5258',river:'#45b8f0',rail:'#6e5a48'}[kind];
    quad(P(-SPAN,y0),P(SPAN,y0),P(SPAN,y1),P(-SPAN,y1),base);
    if(kind==='grass'){quad(P(-SPAN,y0),P(-HALF-.5,y0),P(-HALF-.5,y1),P(-SPAN,y1),shade(base,.82));quad(P(HALF+.5,y0),P(SPAN,y0),P(SPAN,y1),P(HALF+.5,y1),shade(base,.82));}
    if(kind==='road'&&rows[r+1]?.kind==='road'){for(let x=-SPAN;x<SPAN;x+=2)quad(P(x,y1-.03),P(x+1,y1-.03),P(x+1,y1+.03),P(x,y1+.03),'#e8e8e0');}
    if(kind==='rail'){for(let x=-SPAN;x<SPAN;x+=.6)quad(P(x,y0+.1),P(x+.2,y0+.1),P(x+.2,y1-.1),P(x,y1-.1),'#3e2c20');for(const d of [.28,-.28])quad(P(-SPAN,r+d-.04),P(SPAN,r+d-.04),P(SPAN,r+d+.04),P(-SPAN,r+d+.04),'#c8ccd0');const warn=railWarning(row,w.t);box(HALF+.8,HALF+1,r+.25,r+.45,0,1.4,'#444');g.fillStyle=warn&&Math.floor(w.t*8)%2?'#ff2a2a':'#5a2020';const lamp=P(HALF+.9,r+.35,1.5);g.beginPath();g.arc(lamp[0],lamp[1],u*.1,0,7);g.fill();}
    if(kind==='grass'){for(const c of row.trees||[]){box(c-.14,c+.14,r-.14,r+.14,0,.5,'#7a4e2a');const tall=wrap(c*7+r*3,3);box(c-.38,c+.38,r-.38,r+.38,.5,.95+tall*.3,'#2f9a3e');box(c-.26,c+.26,r-.26,r+.26,.95+tall*.3,1.3+tall*.3,'#3ab84c');}
     if(row.coin!=null&&!w.taken.has(r)){const q=P(row.coin,r,.42+Math.sin(w.t*5)*.06);g.fillStyle='#ffd21e';g.strokeStyle='#b8860b';g.lineWidth=2;g.beginPath();g.ellipse(q[0],q[1],u*.16*Math.abs(Math.cos(w.t*3))+2,u*.18,0,0,7);g.fill();g.stroke();}}
    for(const o of rowObjects(row,w.t,SPAN+4)){if(o.x1<-SPAN||o.x0>SPAN)continue;
     if(kind==='river'){box(o.x0,o.x1,r-.38,r+.38,-.02,.16,'#a8703a');box(o.x0+.05,o.x1-.05,r-.3,r+.3,.16,.2,'#c4894c');}
     else if(kind==='rail'){const x0=Math.max(o.x0,-SPAN),x1=Math.min(o.x1,SPAN);box(x0,x1,r-.4,r+.4,.06,1.05,'#d8483a');box(x0,x1,r-.42,r+.42,.55,.72,'#f2f2f2');}
     else{const L=o.x1-o.x0,fwd=row.dir>0;box(o.x0,o.x1,r-.36,r+.36,.12,.5,row.col);const cab=L>2?[fwd?o.x1-.9:o.x0+.1,fwd?o.x1-.1:o.x0+.9]:[o.x0+L*.22,o.x1-L*.22];box(cab[0],cab[1],r-.3,r+.3,.5,.84,L>2?row.col:'#d8eeff');box(cab[0]+.02,cab[1]-.02,r-.31,r-.3,.56,.78,'#5a7a90');for(const wx of [o.x0+.28,o.x1-.28])box(wx-.14,wx+.14,r-.4,r-.34,0,.2,'#111');}}
    // the hero stands on this row: drawn in order so trees and cars in front cover him
    const hRow=w.dead?w.deadRow:w.hopT>0?Math.round(w.fromRow+(w.row-w.fromRow)*(1-w.hopT/.14)):w.row;
    if(r===hRow){const k=w.hopT>0?1-w.hopT/.14:1,hx=w.dead?w.deadX:w.fromX+(w.x-w.fromX)*k,hr=w.dead?w.deadRow:w.fromRow+(w.row-w.fromRow)*k,jump=Math.sin(k*Math.PI)*(w.hopT>0?.45:0);
     if(w.dead==='water'){const q=P(hx,hr);g.strokeStyle='#fff';g.lineWidth=3;g.beginPath();g.arc(q[0],q[1],u*.2+w.deadT*u*.5,0,7);g.stroke();}
     else if(w.dead==='eagle'){}
     else{const sq=w.dead?.15:1;if(!w.dead){const q=P(hx,hr);g.fillStyle='#0003';g.beginPath();g.ellipse(q[0],q[1],u*.3,u*.14,0,0,7);g.fill();}box(hx-.24,hx+.24,hr-.22,hr+.22,jump,jump+.42*sq,'#f6f6f2');box(hx-.1,hx+.1,hr-.3,hr-.22,jump+.06,jump+.14,'#f2a01e');if(!w.dead){const q=P(hx,hr,jump+.78);s.sprite(g,w.player,q[0],q[1],u*.92,{exact:true,mood:w.idle>6?'sad':'normal'});}else{const q=P(hx,hr,.2);s.sprite(g,w.player,q[0],q[1],u*.8,{exact:true,mood:'sad'});}}}}
   // the eagle comes down from the top for a lazy player
   if(w.dead==='eagle'){const q=P(w.deadX,w.deadRow,0),k=clamp(w.deadT/1,0,1),y=k<.5?q[1]-H*(1-k*2):q[1]-H*(k-.5)*2;g.fillStyle='#2a1a10';g.beginPath();g.moveTo(q[0]-u*1.5,y-u*.4);g.lineTo(q[0],y-u*.1);g.lineTo(q[0]+u*1.5,y-u*.4);g.lineTo(q[0]+u*.3,y+u*.5);g.lineTo(q[0]-u*.3,y+u*.5);g.closePath();g.fill();g.fillStyle='#f6f6f2';g.fillRect(q[0]-u*.18,y-u*.5,u*.36,u*.4);s.sprite(g,w.player,q[0],y+u*.65,u*.8,{exact:true,mood:'sad'});}
   // HUD like the app: a big white number, top left; coins top right under the pills
   g.textAlign='left';g.textBaseline='top';g.font=`900 ${Math.round(Math.min(58,W*.13))}px Arial,sans-serif`;g.lineWidth=7;g.strokeStyle='#0008';g.lineJoin='round';g.strokeText(String(w.best-1),14,10);g.fillStyle='#fff';g.fillText(String(w.best-1),14,10);
   g.textAlign='right';g.font=`900 ${Math.round(Math.min(24,W*.06))}px Arial,sans-serif`;g.lineWidth=5;const coinTxt=`● ${w.coins}`;g.strokeText(coinTxt,W-14,52);g.fillStyle='#ffd21e';g.fillText(coinTxt,W-14,52);
   if(w.idle>6&&!w.dead){g.textAlign='center';g.font=`900 ${Math.round(Math.min(26,W*.065))}px Arial,sans-serif`;g.strokeText('KEEP MOVING!',W/2,H*.2);g.fillStyle='#fff';g.fillText('KEEP MOVING!',W/2,H*.2);}
   s.debug={engine:'crossyRoad',world:w,rows,hop,kill,rowObjects};}});
 if(scores)s.finish(scores,`Crossy Road: ${s.players[0].name} ${scores[0]} · ${s.players[1].name} ${scores[1]}.`);
}
Object.assign(exports,{frogger,crossyRoad,crossyRows,rowObjects,froggerObjects,LANES});
