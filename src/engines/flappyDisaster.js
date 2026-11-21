// FLAPPY DISASTER (game id flappy-disaster, engine 'flappy'): real Flappy Bird. One life, tap to flap, an endless run
// of pipes that gets harder the further you get (faster, narrower gaps, wilder heights, then pipes that move). Every
// game deals one of the STAGES at random: the same game, a completely different look (the meat locker, a pink fuzzy
// hell, a Pokémon route, the ninth circle, a disco...). The bird is the player's own head with wings.
// 1P: one run, beat your best. 2P on one phone: pass and play, same stage, same pipes. Online (s.online): turns, the
// other phone watches your run live (snapshots ~20/s, extrapolated between them), then swaps; both phones finish
// with both scores.
const {clamp,seededRandom}=require("src/utils.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {soloFinish,soloProgress}=require("src/solo.js");
const {netField}=require("src/engines/netField.js");
const {snd}=require("src/engines/arenaKit.js");

// ---- the world: logical units, 512 tall like the original screen; the ground band at the bottom
const VH=512,GROUND=80,FLOOR=VH-GROUND,PIPE_W=76,BIRD_R=17,G=1650,FLAP=-500,BIRD_X=.3;
// difficulty by pipe number: gap, distance to the next pipe, speed, how far the gap jumps, moving pipes
const gapOf=i=>Math.max(136,196-i*1.05),spaceOf=i=>Math.max(196,262-i*1.1),speedOf=n=>Math.min(250,150+n*1.7);
const jumpOf=i=>i<8?.28:i<20?.42:i<40?.55:.68,moveOf=i=>i<22?0:Math.min(58,18+(i-22)*1.2);
function course(seed){const r=seededRandom(seed+':flap-course'),P=[];let x=520,y=FLOOR/2;
 return k=>{while(P.length<=k){const i=P.length,gap=gapOf(i),lo=70+gap/2,hi=FLOOR-70-gap/2,jump=(hi-lo)*jumpOf(i);
   y=clamp(y+(r()-.5)*2*jump,lo,hi);const mv=moveOf(i)&&r()<.35+Math.min(.35,(i-22)*.012)?moveOf(i):0;
   P.push({i,x,y,gap,mv,ph:r()*6.28,per:340+r()*260});x+=spaceOf(i);}return P[k];};}
// a moving pipe's gap shifts with its position on screen (so the watching phone sees exactly the same thing)
const gapY=(p,travel)=>p.mv?clamp(p.y+Math.sin((travel-p.x)/p.per*6.28+p.ph)*p.mv,60+p.gap/2,FLOOR-60-p.gap/2):p.y;

// ---- drawing helpers
const R=(x,c,X,Y,W,H)=>{x.fillStyle=c;x.fillRect(X,Y,W,H);};
const circ=(x,c,X,Y,r)=>{x.fillStyle=c;x.beginPath();x.arc(X,Y,r,0,7);x.fill();};
const hash=n=>{n=(n^61)^(n>>>16);n=n+(n<<3);n=n^(n>>>4);n=Math.imul(n,0x27d4eb2d);return ((n^(n>>>15))>>>0)/4294967296;};
// a parallax strip: fn(x,left,index) called for every slot of width sp that shows
function strip(x,vw,travel,k,sp,fn){const off=travel*k;for(let i=Math.floor(off/sp)-1;i<=Math.ceil((off+vw)/sp)+1;i++)fn(i*sp-off,i);}
function sky(x,vw,a,b){const gr=x.createLinearGradient(0,0,0,FLOOR);gr.addColorStop(0,a);gr.addColorStop(1,b);x.fillStyle=gr;x.fillRect(0,-200,vw,FLOOR+200);}
// generic pipe body: a column from y0 to y1 with a rim at the gap end; looks come from the stage
function column(x,px,y0,y1,top,st,t){const w=PIPE_W,c=st.col;
 R(x,c.edge,px-2,y0,w+4,y1-y0);R(x,c.body,px,y0,w,y1-y0);R(x,c.hl,px+6,y0,8,y1-y0);R(x,c.shade,px+w-14,y0,9,y1-y0);
 if(st.rim!==false){const ry=top?y1-26:y0;R(x,c.edge,px-8,ry-2,w+16,30);R(x,c.rim||c.body,px-6,ry,w+12,26);R(x,c.hl,px-1,ry,8,26);R(x,c.shade,px+w-6,ry,8,26);}}

// ---- the stages. Each: name, tag (the title card's joke), sky colours, bg(x,vw,travel,t), pipe(x,px,y0,y1,top,t,s),
// ground(x,vw,travel,t), wing colour, score colours, particles, and the line you get when you die
const STAGES=[
 {id:'classic',name:'FLAPPY CLASSIC',tag:'The original. Allegedly.',sky:['#4ec0ca','#8ee0d8'],wing:'#f8d820',
  col:{body:'#73bf2e',edge:'#543847',hl:'#9ce659',shade:'#558022'},
  bg(x,vw,tr){strip(x,vw,tr,.2,26,(X,i)=>{const h=40+hash(i)*70;R(x,'#e8f8f0',X,FLOOR-60-h,24,h+60);R(x,'#bfe8d8',X+4,FLOOR-50-h,5,h);});strip(x,vw,tr,.5,30,X=>circ(x,'#5ee270',X,FLOOR-14,24));R(x,'#5ee270',0,FLOOR-14,vw,14);},
  ground(x,vw,tr){R(x,'#ded895',0,FLOOR,vw,GROUND);R(x,'#543847',0,FLOOR,vw,3);R(x,'#9ce659',0,FLOOR+3,vw,8);strip(x,vw,tr,1,16,X=>R(x,'#73bf2e',X,FLOOR+3,8,8));},
  dead:['Classic.','Just like 2014.','Dong Nguyen sends his regards.']},
 {id:'meat',name:'THE MEAT LOCKER',tag:'Everything in here used to fly.',sky:['#1a0405','#4a0d0d'],wing:'#c8b8a8',drip:'#8a0b0b',
  col:{body:'#6c6460',edge:'#1a1010',hl:'#8c8480',shade:'#3c3430',rim:'#7c2020'},
  bg(x,vw,tr,t){strip(x,vw,tr,.15,90,(X,i)=>{R(x,'#2a0808',X+40,-200,3,320+hash(i)*60);x.fillStyle='#3a0a0a';x.beginPath();x.ellipse(X+41,150+hash(i)*60,16,34,0,0,7);x.fill();});
   strip(x,vw,tr,.35,60,(X,i)=>{R(x,'#120202',X,FLOOR-120-hash(i)*60,58,200);R(x,'#3a0606',X+8,FLOOR-100-hash(i)*60,12,6);});},
  pipe(x,px,y0,y1,top,t){column(x,px,y0,y1,top,{col:this.col,rim:false},t);const w=PIPE_W;
   // hooks and hanging cuts at the top pipe's end, a butcher's block on the bottom one
   if(top){for(const dx of [16,52]){R(x,'#9c9c9c',px+dx,y1-2,3,14);x.strokeStyle='#bcbcbc';x.lineWidth=3;x.beginPath();x.arc(px+dx-4,y1+14,6,-.3,Math.PI);x.stroke();}
    x.fillStyle='#a83232';x.beginPath();x.ellipse(px+20,y1+30,11,18,.2,0,7);x.fill();R(x,'#e8d8c8',px+16,y1+16,8,4);}
   else{R(x,'#5c3a1c',px-8,y0,w+16,22);R(x,'#7c5230',px-8,y0,w+16,4);R(x,'#bcbcbc',px+w-24,y0-16,22,14);R(x,'#5c3a1c',px+w-6,y0-12,10,4);}
   for(let k=0;k<3;k++){const yy=(top?y1:y0)+((t*40+k*37+px)%60);R(x,'#7a0606',px+10+k*22,top?y1:y0+22,3,Math.max(0,yy-(top?y1:y0+22)));}},
  ground(x,vw,tr){R(x,'#2c2828',0,FLOOR,vw,GROUND);strip(x,vw,tr,1,32,(X,i)=>{R(x,'#3c3636',X+1,FLOOR+4,30,30);if(hash(i)<.3)circ(x,'#5a0808',X+16,FLOOR+20,8+hash(i+9)*8);});R(x,'#5a0808',0,FLOOR,vw,4);},
  dead:['Tenderized.','Grade A.','Now that’s a cut of meat.','Medium rare.']},
 {id:'fuzzy',name:'FUZZY WUZZY HELL',tag:'Soft. Pink. Deadly.',sky:['#ffb6dc','#ffe6f4'],wing:'#ffffff',spark:'#ff5cb8',
  col:{body:'#ff8cc8',edge:'#c8448c',hl:'#ffc4e4',shade:'#e86cac'},
  bg(x,vw,tr,t){strip(x,vw,tr,.12,140,(X,i)=>{const y=60+hash(i)*120;for(const [dx,dy,r] of [[0,0,26],[22,-8,30],[48,0,24],[24,10,22]])circ(x,'#fff4fb',X+dx,y+dy,r);});
   strip(x,vw,tr,.4,48,(X,i)=>{circ(x,'#ff9fd2',X+24,FLOOR-10,30+hash(i)*14);});},
  pipe(x,px,y0,y1,top,t){const w=PIPE_W;R(x,'#c8448c',px-2,y0,w+4,y1-y0);R(x,'#ff8cc8',px,y0,w,y1-y0);
   x.strokeStyle='#ffc4e4';x.lineWidth=2;for(let y=y0+6;y<y1;y+=9)for(let k=0;k<4;k++){const X=px+6+k*18+((y*7)%9);x.beginPath();x.moveTo(X,y);x.lineTo(X+4,y-5);x.stroke();}
   // a frosted end with sprinkles
   const ry=top?y1-24:y0;x.fillStyle='#fff8fc';x.beginPath();x.ellipse(px+w/2,ry+12,w/2+10,16,0,0,7);x.fill();
   for(let k=0;k<12;k++){x.fillStyle=['#ff4c9c','#4cc8ff','#ffd84c','#7cf07c'][k%4];x.fillRect(px-2+((k*29)%(w+4)),ry+4+((k*13)%16),5,2);}},
  ground(x,vw,tr){const C=['#ff5c5c','#ffb05c','#ffe75c','#7ce07c','#5cb8ff','#b07cff'];C.forEach((c,k)=>R(x,c,0,FLOOR+k*(GROUND/6),vw,GROUND/6+1));R(x,'#fff',0,FLOOR,vw,3);},
  dead:['Hugged to death.','Too cute to live.','Fluffed it.','UwU’d.']},
 {id:'pokemon',name:'ROUTE 1 (PROBABLY)',tag:'A wild PIPE appeared!',sky:['#88d0f8','#d8f0f8'],wing:'#f8d030',
  bg(x,vw,tr){strip(x,vw,tr,.18,120,(X,i)=>{x.fillStyle='#3c8c3c';x.beginPath();x.arc(X+60,FLOOR-40,70+hash(i)*30,Math.PI,0);x.fill();});
   strip(x,vw,tr,.45,44,(X,i)=>{R(x,'#6c4424',X+18,FLOOR-70,8,60);circ(x,'#2c7c2c',X+22,FLOOR-80,22);circ(x,'#3c9c3c',X+16,FLOOR-86,12);});},
  pipe(x,px,y0,y1,top,t){const w=PIPE_W,r=w/2,n=Math.ceil((y1-y0)/w)+1;
   x.save();x.beginPath();x.rect(px-6,y0,w+12,y1-y0);x.clip();
   for(let k=0;k<n;k++){const cy=top?y1-r-k*w:y0+r+k*w;circ(x,'#202020',px+r,cy,r+2);x.fillStyle=k===0?'#e83030':'#e8e8e8';x.beginPath();x.arc(px+r,cy,r,Math.PI,0);x.fill();
    x.fillStyle='#f8f8f8';x.beginPath();x.arc(px+r,cy,r,0,Math.PI);x.fill();R(x,'#202020',px,cy-3,w,6);circ(x,'#202020',px+r,cy,11);circ(x,'#f8f8f8',px+r,cy,7);}x.restore();},
  ground(x,vw,tr){R(x,'#58a838',0,FLOOR,vw,GROUND);strip(x,vw,tr,1,14,X=>{x.fillStyle='#307820';x.beginPath();x.moveTo(X,FLOOR+18);x.lineTo(X+7,FLOOR-6);x.lineTo(X+14,FLOOR+18);x.fill();});R(x,'#c8a868',0,FLOOR+40,vw,GROUND-40);},
  dead:['It’s super effective!','You fainted!','The wild PIPE fled… no wait, you did.','Gotta flap ’em all.']},
 {id:'hell',name:'THE NINTH CIRCLE',tag:'Abandon all hope. Keep flapping.',sky:['#1c0000','#7c1800'],wing:'#3c3c3c',ember:'#ff8c1c',
  col:{body:'#e8dcc0',edge:'#3c2c1c',hl:'#fffaf0',shade:'#b8a888',rim:'#d8ccb0'},
  bg(x,vw,tr){strip(x,vw,tr,.15,100,(X,i)=>{x.fillStyle='#2c0404';x.beginPath();x.moveTo(X,FLOOR);x.lineTo(X+50,FLOOR-140-hash(i)*120);x.lineTo(X+100,FLOOR);x.fill();});},
  pipe(x,px,y0,y1,top,t){column(x,px,y0,y1,top,{col:this.col},t);const w=PIPE_W;
   // bones stacked up the column, a skull on the end
   for(let y=y0+18;y<y1-30;y+=34){R(x,'#c8b898',px+8,y,w-16,6);circ(x,'#c8b898',px+8,y+3,5);circ(x,'#c8b898',px+w-8,y+3,5);}
   const sy=top?y1-12:y0+12;circ(x,'#f0e8d8',px+w/2,sy,20);circ(x,'#1c0000',px+w/2-8,sy-2,6);circ(x,'#1c0000',px+w/2+8,sy-2,6);R(x,'#1c0000',px+w/2-6,sy+8,12,4);},
  ground(x,vw,tr,t){R(x,'#ff5a00',0,FLOOR,vw,GROUND);strip(x,vw,tr,1,40,(X,i)=>{circ(x,'#ffc81c',X+20+Math.sin(t*3+i)*6,FLOOR+18,8);});R(x,'#ff9c1c',0,FLOOR,vw,4);},
  dead:['Welcome home.','Seventh circle was full.','Satan says hi.','Toasty.']},
 {id:'space',name:'ZERO-G (NOT REALLY)',tag:'In space, no one can hear you flap.',sky:['#02020c','#14143c'],wing:'#c8c8d8',
  col:{body:'#9ca4b8',edge:'#2c3040',hl:'#d8e0f0',shade:'#6c7488',rim:'#c8382c'},
  bg(x,vw,tr,t){strip(x,vw,tr,.05,30,(X,i)=>{for(let k=0;k<3;k++)R(x,'#fff',X+hash(i*3+k)*30,hash(i*7+k)*FLOOR,1.5,1.5);});
   strip(x,vw,tr,.08,700,(X,i)=>{circ(x,'#c86c3c',X+300,140,60);circ(x,'#e88c5c',X+285,126,46);});},
  pipe(x,px,y0,y1,top,t){column(x,px,y0,y1,top,{col:this.col},t);x.strokeStyle='#4c5468';x.lineWidth=3;for(let y=y0;y<y1-20;y+=38){x.beginPath();x.moveTo(px+4,y);x.lineTo(px+PIPE_W-4,y+38);x.moveTo(px+PIPE_W-4,y);x.lineTo(px+4,y+38);x.stroke();}
   circ(x,Math.floor(t*3)%2?'#ff3c3c':'#5c1010',px+PIPE_W/2,top?y1-13:y0+13,5);},
  ground(x,vw,tr){R(x,'#8c8c94',0,FLOOR,vw,GROUND);strip(x,vw,tr,1,60,(X,i)=>{x.fillStyle='#6c6c74';x.beginPath();x.ellipse(X+30,FLOOR+20+hash(i)*30,10+hash(i+1)*14,5,0,0,7);x.fill();});},
  dead:['Houston, we have a flappin’ problem.','Lost in space.','One small flap for man.']},
 {id:'sea',name:'DAVY JONES’ PIPE LOCKER',tag:'Flapping underwater was a choice.',sky:['#0c4c7c','#0c2c4c'],wing:'#8cd8f8',bubble:true,
  bg(x,vw,tr,t){strip(x,vw,tr,.1,160,(X,i)=>{x.fillStyle='rgba(120,200,255,.12)';x.beginPath();x.moveTo(X+40,0);x.lineTo(X+90,0);x.lineTo(X+60+Math.sin(t+i)*20,FLOOR);x.lineTo(X+20,FLOOR);x.fill();});
   strip(x,vw,tr,.3,90,(X,i)=>{x.fillStyle='#0c3c5c';x.beginPath();x.ellipse(X+45,FLOOR,60,30+hash(i)*30,0,Math.PI,0);x.fill();});},
  pipe(x,px,y0,y1,top,t){const w=PIPE_W;R(x,'#1c5c2c',px-2,y0,w+4,y1-y0);for(let k=0;k<4;k++){x.strokeStyle=k%2?'#3c9c3c':'#2c7c2c';x.lineWidth=8;x.beginPath();for(let y=y0;y<=y1;y+=12)x.lineTo(px+10+k*18+Math.sin(y*.05+t*2+k)*5,y);x.stroke();}
   const ry=top?y1-18:y0;R(x,'#5c4434',px-8,ry,w+16,18);R(x,'#7c5c44',px-8,ry,w+16,4);},
  ground(x,vw,tr){R(x,'#c8b078',0,FLOOR,vw,GROUND);strip(x,vw,tr,1,50,(X,i)=>{if(hash(i)<.4){x.fillStyle='#f87c5c';x.beginPath();x.moveTo(X+20,FLOOR+10);x.lineTo(X+26,FLOOR-14);x.lineTo(X+32,FLOOR+10);x.fill();}});},
  dead:['Sleeps with the fishes.','Glub.','Just keep swimming. You didn’t.']},
 {id:'office',name:'DUNDER MIFFLAP',tag:'Cubicles all the way down.',sky:['#d8dce4','#b8c0cc'],wing:'#f8f8f8',paper:true,
  bg(x,vw,tr){strip(x,vw,tr,.2,140,(X)=>{R(x,'#8c9cb0',X+10,40,120,180);R(x,'#c8d8e8',X+16,46,52,80);R(x,'#c8d8e8',X+72,46,52,80);R(x,'#f8f8f8',X+50,-200,40,12);});},
  pipe(x,px,y0,y1,top,t){const w=PIPE_W;R(x,'#4c4c5c',px-2,y0,w+4,y1-y0);R(x,'#7c7c94',px,y0,w,y1-y0);for(let y=y0+4;y<y1;y+=8)R(x,'#6c6c84',px+4,y,w-8,2);
   const ry=top?y1-14:y0;R(x,'#3c3c4c',px-6,ry,w+12,14);if(!top){R(x,'#f8f8f8',px+10,y0-20,22,18);R(x,'#4c8cc8',px+12,y0-36,18,18);R(x,'#3c3c4c',px+44,y0-14,24,14);}},
  ground(x,vw,tr){R(x,'#5c6c5c',0,FLOOR,vw,GROUND);strip(x,vw,tr,1,8,(X,i)=>R(x,(i%2)?'#546454':'#647464',X,FLOOR,8,GROUND));R(x,'#3c3c3c',0,FLOOR,vw,4);},
  dead:['That’s what she said.','You’ve been downsized.','Please see HR.','Your stapler is in Jell-O.']},
 {id:'grave',name:'NIGHT OF THE LIVING FLAP',tag:'They’re coming to get you, birdie.',sky:['#0c0c1c','#2c2c44'],wing:'#4c4c5c',fog:true,
  bg(x,vw,tr,t){circ(x,'#f8f0c8',vw*.78,90,40);circ(x,'#e8dcb0',vw*.78-10,84,8);
   strip(x,vw,tr,.25,70,(X,i)=>{R(x,'#1c1c2c',X+20,FLOOR-50-hash(i)*20,26,60);x.fillStyle='#1c1c2c';x.beginPath();x.arc(X+33,FLOOR-50-hash(i)*20,13,Math.PI,0);x.fill();});
   strip(x,vw,tr,.5,200,(X,i)=>{const y=80+Math.sin(t*3+i)*20;x.fillStyle='#000';x.beginPath();x.moveTo(X,y);x.lineTo(X+10,y-6+Math.sin(t*20)*5);x.lineTo(X+20,y);x.fill();});},
  pipe(x,px,y0,y1,top,t){const w=PIPE_W;for(let y=y0,k=0;y<y1;y+=36,k++){R(x,'#2c2c38',px-2,y,w+4,Math.min(36,y1-y));R(x,k%2?'#6c6c7c':'#7c7c8c',px,y+2,w,Math.min(32,y1-y-2));R(x,'#4c4c5c',px+20,y+12,w-40,3);}
   if(!top){for(const dx of [10,50]){const up=Math.sin(t*4+px*.1+dx)*4;R(x,'#5c8c4c',px+dx,y0-18+up,6,18);R(x,'#5c8c4c',px+dx-3,y0-22+up,12,6);}}},
  ground(x,vw,tr){R(x,'#1c2c1c',0,FLOOR,vw,GROUND);R(x,'#2c3c2c',0,FLOOR,vw,6);},
  dead:['Braaaains.','RIP in peace.','Dead. Again.','Rest in pieces.']},
 {id:'vapor',name:'A E S T H E T I C',tag:'Flap into the void, but make it pastel.',sky:['#ff6cc8','#ffc86c'],wing:'#7cf8f8',
  bg(x,vw,tr){circ(x,'#ffe85c',vw*.5,FLOOR-40,110);for(let k=0;k<5;k++)R(x,'#ff6cc8',vw*.5-120,FLOOR-100+k*14,240,4+k);
   R(x,'#2c0c4c',0,FLOOR-40,vw,40);x.strokeStyle='#ff4cf8';x.lineWidth=1;for(let k=0;k<5;k++){x.beginPath();x.moveTo(0,FLOOR-40+k*k*2.5);x.lineTo(vw,FLOOR-40+k*k*2.5);x.stroke();}},
  pipe(x,px,y0,y1,top,t){const w=PIPE_W;R(x,'#d8d0e8',px,y0,w,y1-y0);for(let k=0;k<5;k++)R(x,k%2?'#b8b0c8':'#f0e8f8',px+4+k*14,y0,10,y1-y0);
   const ry=top?y1-18:y0;R(x,'#f0e8f8',px-8,ry,w+16,18);R(x,'#b8b0c8',px-8,top?ry:ry+14,w+16,4);if(!top){circ(x,'#e8e0f0',px+w/2,y0-22,14);R(x,'#e8e0f0',px+w/2-12,y0-10,24,10);R(x,'#ff6cc8',px+w/2-8,y0-26,16,4);}},
  ground(x,vw,tr){R(x,'#2c0c4c',0,FLOOR,vw,GROUND);x.strokeStyle='#4cf8f8';x.lineWidth=1;strip(x,vw,tr,1,40,X=>{x.beginPath();x.moveTo(X,FLOOR);x.lineTo(X-30,VH);x.stroke();});for(let k=0;k<4;k++){x.beginPath();x.moveTo(0,FLOOR+k*k*5+2);x.lineTo(vw,FLOOR+k*k*5+2);x.stroke();}},
  dead:['ｗａｓｔｅｄ','Vibe check failed.','It’s giving dead.']},
 {id:'candy',name:'SUGAR RUSH',tag:'Your dentist hates this level.',sky:['#a8e8ff','#fff0c8'],wing:'#ff6c6c',spark:'#ffffff',
  bg(x,vw,tr){strip(x,vw,tr,.2,90,(X,i)=>{const c=['#ff6c9c','#6cc8ff','#ffd86c','#9cf06c'][i&3];x.fillStyle=c;x.beginPath();x.arc(X+45,FLOOR-10,36,Math.PI,0);x.fill();circ(x,'#ffffff88',X+34,FLOOR-30,6);});},
  pipe(x,px,y0,y1,top,t){const w=PIPE_W;x.save();x.beginPath();x.rect(px,y0,w,y1-y0);x.clip();R(x,'#ffffff',px,y0,w,y1-y0);x.fillStyle='#e8203c';
   for(let y=y0-w;y<y1+w;y+=26){x.beginPath();x.moveTo(px,y);x.lineTo(px+w,y-w*.6);x.lineTo(px+w,y-w*.6+12);x.lineTo(px,y+12);x.fill();}x.restore();
   const cy=top?y1-12:y0+12;circ(x,'#7c4c2c',px+w/2,cy,w/2+6);circ(x,'#a86c3c',px+w/2,cy-3,w/2+2);for(let k=0;k<8;k++)R(x,['#ff4c9c','#4cc8ff','#ffd84c'][k%3],px+8+k*8,cy-8+(k%3)*4,4,2);},
  ground(x,vw,tr){R(x,'#a8743c',0,FLOOR,vw,GROUND);strip(x,vw,tr,1,24,(X,i)=>R(x,'#c8945c',X+2,FLOOR+4,20,10));R(x,'#fff8f0',0,FLOOR,vw,6);},
  dead:['Sugar crash.','Diabetes, achieved.','Cavity searched.']},
 {id:'upside',name:'THE UPSIDE DOWN',tag:'Friends don’t let friends flap.',sky:['#0c1424','#2c1c2c'],wing:'#5c5c6c',spore:true,
  bg(x,vw,tr,t){if(Math.floor(t*2.3)%9===0){x.strokeStyle='#ff2c2c';x.lineWidth=3;x.beginPath();let X=vw*.6,Y=0;x.moveTo(X,Y);while(Y<FLOOR-100){X+=(hash(Y|0)-.5)*60;Y+=30;x.lineTo(X,Y);}x.stroke();}
   strip(x,vw,tr,.25,80,(X,i)=>{x.fillStyle='#14101c';x.beginPath();x.moveTo(X,FLOOR);x.lineTo(X+10,FLOOR-110-hash(i)*80);x.lineTo(X+24,FLOOR);x.fill();});},
  pipe(x,px,y0,y1,top,t){const w=PIPE_W;R(x,'#1c1c24',px,y0,w,y1-y0);x.strokeStyle='#3c1c2c';x.lineWidth=5;for(let k=0;k<3;k++){x.beginPath();for(let y=y0;y<=y1;y+=10)x.lineTo(px+12+k*26+Math.sin(y*.08+k*2)*8,y);x.stroke();}
   const ry=top?y1-10:y0;R(x,'#2c1c24',px-6,ry,w+12,10);},
  ground(x,vw,tr){R(x,'#14101c',0,FLOOR,vw,GROUND);strip(x,vw,tr,1,30,X=>{x.strokeStyle='#3c1c2c';x.lineWidth=3;x.beginPath();x.moveTo(X,FLOOR);x.quadraticCurveTo(X+15,FLOOR+20,X+30,FLOOR+6);x.stroke();});},
  dead:['Demogorgon’d.','Should’ve stayed home.','Eleven is disappointed.']},
 {id:'sewer',name:'COWABUNGA SEWERS',tag:'Smells like teen turtle.',sky:['#1c2c1c','#2c3c24'],wing:'#7c8c5c',drip:'#7cf03c',
  bg(x,vw,tr){strip(x,vw,tr,.3,32,(X,i)=>{for(let y=0;y<FLOOR;y+=16)R(x,(i+y/16)%2?'#2c3424':'#34402c',X,y,30,14);});x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,0,vw,FLOOR);},
  pipe(x,px,y0,y1,top,t){column(x,px,y0,y1,top,{col:{body:'#5c6c5c',edge:'#1c241c',hl:'#7c8c7c',shade:'#3c4c3c',rim:'#4c5c4c'}},t);
   const ey=top?y1:y0;x.fillStyle='#7cf03c';x.beginPath();x.ellipse(px+PIPE_W/2,ey,PIPE_W/2,8,0,0,7);x.fill();if(top){const d=(t*60+px)%50;circ(x,'#7cf03c',px+PIPE_W/2,ey+d,4);}},
  ground(x,vw,tr,t){R(x,'#3c8c1c',0,FLOOR,vw,GROUND);strip(x,vw,tr,1,30,(X,i)=>circ(x,'#5cbc2c',X+15,FLOOR+10+Math.sin(t*4+i)*3,6));},
  dead:['Shell shocked.','Pizza time is over.','Shredded.']},
 {id:'vegas',name:'LOST WAGES',tag:'The house always wins. So does gravity.',sky:['#0c0418','#2c0c3c'],wing:'#f8d838',
  bg(x,vw,tr,t){strip(x,vw,tr,.2,70,(X,i)=>{const h=120+hash(i)*160;R(x,'#140820',X,FLOOR-h,60,h);for(let y=FLOOR-h+8;y<FLOOR-8;y+=14)for(let k=0;k<3;k++)if(hash(i*99+y+k)<.5)R(x,['#ff4c9c','#ffd84c','#4cc8ff'][(i+k)%3],X+8+k*16,y,8,6);});},
  pipe(x,px,y0,y1,top,t){const w=PIPE_W;R(x,'#1c0c2c',px,y0,w,y1-y0);const on=Math.floor(t*6);for(let y=y0+6,k=0;y<y1-6;y+=14,k++){circ(x,(k+on)%3?'#5c3c1c':'#ffd84c',px+6,y,3);circ(x,(k+on+1)%3?'#5c3c1c':'#ffd84c',px+w-6,y,3);}
   x.strokeStyle='#ff4cf8';x.lineWidth=3;x.strokeRect(px+14,y0+4,w-28,y1-y0-8);const ry=top?y1-20:y0;R(x,'#e8203c',px-6,ry,w+12,20);x.fillStyle='#fff';x.font='bold 14px sans-serif';x.textAlign='center';x.fillText('777',px+w/2,ry+15);},
  ground(x,vw,tr){R(x,'#8c0c1c',0,FLOOR,vw,GROUND);strip(x,vw,tr,1,36,(X,i)=>{circ(x,'#f8d838',X+18,FLOOR+20,7);circ(x,'#8c0c1c',X+18,FLOOR+20,3);});},
  dead:['Busted.','Snake eyes.','What happens in Vegas…','Cashed out.']},
 {id:'arctic',name:'BRAIN FREEZE',tag:'Every flap is a little colder.',sky:['#8cc8f8','#e8f8ff'],wing:'#ffffff',snow:true,
  bg(x,vw,tr){strip(x,vw,tr,.12,180,(X,i)=>{x.fillStyle='#d8ecfc';x.beginPath();x.moveTo(X,FLOOR);x.lineTo(X+90,FLOOR-170-hash(i)*80);x.lineTo(X+180,FLOOR);x.fill();x.fillStyle='#fff';x.beginPath();x.moveTo(X+70,FLOOR-130-hash(i)*60);x.lineTo(X+90,FLOOR-170-hash(i)*80);x.lineTo(X+110,FLOOR-130-hash(i)*60);x.fill();});},
  pipe(x,px,y0,y1,top,t){column(x,px,y0,y1,top,{col:{body:'#b8e8fc',edge:'#5c9cc8',hl:'#ffffff',shade:'#8cc8e8',rim:'#d8f4ff'}},t);
   if(top)for(let k=0;k<5;k++){x.fillStyle='#d8f4ff';x.beginPath();x.moveTo(px-4+k*18,y1);x.lineTo(px+4+k*18,y1+10+(k%3)*6);x.lineTo(px+12+k*18,y1);x.fill();}},
  ground(x,vw,tr){R(x,'#f8fcff',0,FLOOR,vw,GROUND);R(x,'#bcdcf8',0,FLOOR+20,vw,4);},
  dead:['Frostbitten.','Ice ice, baby.','Chill out.']},
 {id:'disco',name:'DISCO INFERNO',tag:'Stayin’ alive. Briefly.',sky:['#1c0c2c','#0c0418'],wing:'#f8f8f8',
  bg(x,vw,tr,t){for(let k=0;k<5;k++){x.fillStyle=`hsla(${(t*80+k*72)%360},90%,60%,.16)`;x.beginPath();x.moveTo(vw*.5,0);x.lineTo(vw*.5+Math.sin(t+k*1.3)*vw*.7-60,FLOOR);x.lineTo(vw*.5+Math.sin(t+k*1.3)*vw*.7+60,FLOOR);x.fill();}},
  pipe(x,px,y0,y1,top,t){const w=PIPE_W;R(x,'#2c2c3c',px,y0,w,y1-y0);for(let y=y0;y<y1;y+=12)for(let k=0;k<6;k++)R(x,`hsl(${(k*60+y+t*200)%360},80%,${55+((k+y)%3)*8}%)`,px+1+k*12.5,y+1,11,10);
   const cy=top?y1+10:y0-10;if(top){R(x,'#9c9c9c',px+w/2-1,y1,2,4);}circ(x,'#d8d8e8',px+w/2,cy,14);for(let k=0;k<6;k++)R(x,'#ffffff',px+w/2-10+((k*7+Math.floor(t*8))%20),cy-10+k*3,3,3);},
  ground(x,vw,tr,t){strip(x,vw,tr,1,32,(X,i)=>R(x,`hsl(${(i*47+Math.floor(t*4)*90)%360},80%,55%)`,X+1,FLOOR+1,30,GROUND-2));},
  dead:['Ah, ha, ha, ha, stayin’… nope.','Disco is dead. So are you.','Saturday night fever: fatal.']},
];

async function flappy(s){
 const [c,x]=s.canvas(680,420,{fill:true});const fb=fullBleed(s,{bg:'#000'});
 const online=!!s.online,solo=!!s.solo&&!online,nP=solo?1:2;
 const rnd=seededRandom((s.seed||1)+':flappy-stage'),forced=(()=>{try{return localStorage.getItem('sc-flappy-stage');}catch{return null;}})(),stage=STAGES.find(t=>t.id===forced)||STAGES[Math.floor(rnd()*STAGES.length)];
 const pipeAt=course(s.seed||1),names=s.players.map(p=>p.name||'Player'),scores=[0,0],best=(()=>{try{return +localStorage.getItem('sc-flappy-best')||0;}catch{return 0;}})();
 let k=1,vw=680,t=0,phase='intro',phaseT=0,cur=0,shake=0,flash=0;
 const B={y:FLOOR*.45,vy:0,travel:0,score:0,dead:false,wing:0,next:0,started:false,deadT:0};
 const parts=[];let remote=null;
 const sfx={flap:()=>snd(520,.07,{type:'triangle',vol:.05,to:760}),point:()=>{snd(880,.06,{type:'square',vol:.035});snd(1320,.09,{type:'square',vol:.035,delay:.06});},
  hit:()=>{snd(120,.14,{type:'sawtooth',vol:.07,to:60});snd(800,.05,{type:'square',vol:.04});},die:()=>snd(500,.5,{type:'triangle',vol:.05,to:90}),
  card:()=>{snd(392,.1,{type:'square',vol:.03});snd(523,.1,{type:'square',vol:.03,delay:.1});snd(659,.18,{type:'square',vol:.03,delay:.2});}};
 const layout=()=>{k=s.H/VH;vw=s.W/k;};
 const me=()=>online?nf.me:cur,mine=()=>!online||cur===nf?.me;
 // online: the runner's phone streams its bird; the watcher extrapolates between snapshots
 const nf=online?netField(s,{hz:20,pack:()=>({c:cur,y:Math.round(B.y*10)/10,v:Math.round(B.vy),tr:Math.round(B.travel*10)/10,sc:B.score,d:B.dead?1:0,st:B.started?1:0}),
  unpack:(i,d)=>{if(d&&d.c===cur)remote={...d,at:performance.now()};},onEvent:e=>{if(Array.isArray(e?.done))gotDone(e.done);}}):null;
 let doneWait=null;const doneGot=[false,false],gotDone=d=>{scores[d[0]]=d[1]|0;doneGot[d[0]]=true;doneWait?.();doneWait=null;};
 // ---- input: tap anywhere (Space / Up / W on a keyboard)
 const flap=()=>{if(s.paused)return;if(phase==='intro'&&phaseT>.5){phaseT=99;return;}if(phase!=='ready'&&phase!=='play')return;if(!mine())return;
  if(phase==='ready'){phase='play';phaseT=0;B.started=true;}if(B.dead)return;B.vy=FLAP;B.wing=.18;sfx.flap();nf?.push();};
 s.on(c,'pointerdown',ev=>{ev.preventDefault();flap();});
 s.on(document,'keydown',ev=>{if([' ','ArrowUp','w','W'].includes(ev.key)&&!ev.repeat){ev.preventDefault();flap();}});
 // ---- the run
 const reset=()=>Object.assign(B,{y:FLOOR*.45,vy:0,travel:0,score:0,dead:false,wing:0,next:0,started:false,deadT:0});
 function step(dt){B.wing-=dt;
  if(phase==='ready'){B.y=FLOOR*.45+Math.sin(t*6)*8;return;}
  if(B.dead){B.deadT+=dt;if(B.y<FLOOR-BIRD_R){B.vy=Math.min(B.vy+G*dt,900);B.y=Math.min(FLOOR-BIRD_R,B.y+B.vy*dt);}return;}
  const sp=speedOf(B.score);B.travel+=sp*dt;B.vy=Math.min(B.vy+G*dt,720);B.y+=B.vy*dt;if(B.y<-60){B.y=-60;B.vy=0;}
  const bx=B.travel+vw*BIRD_X;let hit=B.y>FLOOR-BIRD_R;
  for(let i=Math.max(0,B.next-2);i<B.next+3;i++){const p=pipeAt(i),gy=gapY(p,B.travel),half=p.gap/2;
   if(bx+BIRD_R*.8>p.x&&bx-BIRD_R*.8<p.x+PIPE_W&&(B.y-BIRD_R*.8<gy-half||B.y+BIRD_R*.8>gy+half))hit=true;
   if(i===B.next&&bx>p.x+PIPE_W/2){B.next++;B.score++;sfx.point();soloProgress(s,B.score,B.score,`${stage.name} · ${B.score}`);}}
  if(hit)die();}
 function die(){if(B.dead)return;B.dead=true;B.deadT=0;B.vy=Math.min(B.vy,-120);shake=.35;flash=1;sfx.hit();setTimeout(()=>s.alive&&sfx.die(),250);
  for(let i=0;i<18;i++)parts.push({x:vw*BIRD_X,y:B.y,vx:(Math.random()-.5)*400,vy:-Math.random()*300,life:.8,c:stage.drip||stage.spark||stage.wing});
  s.react?.(cur,'sad');nf?.push();}
 // ---- flow: the stage card, then every player's run
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const until=fn=>new Promise(r=>{const id=setInterval(()=>{if(!s.alive||fn()){clearInterval(id);r();}},50);});
 async function run(){
  sfx.card();await until(()=>phaseT>2.6);if(!s.alive)return;
  if(online&&nf){await nf.sync('go');}
  for(cur=0;cur<nP;cur++){reset();remote=null;
   if(!online&&!solo){phase='pass';await s.pass(cur,`${names[cur]}: ${stage.name}. Tap to flap through the pipes. One life, no pausing for breath. It gets faster and meaner the further you go.${cur?` Beat ${scores[0]}.`:''}`,'Ready');if(!s.alive)return;}
   else if(online&&cur===0){phase='pass';await s.pass(nf.me,nf.me===0?`You fly first on ${stage.name}. ${names[1]} watches your run live on their phone, then you watch theirs. Highest score wins.`:`${names[0]} flies first: you watch their run live, then it's your turn on the same pipes. Highest score wins.`,'Ready');if(!s.alive)return;}
   phase='ready';phaseT=0;
   if(mine()){await until(()=>B.dead&&B.deadT>1.3);if(!s.alive)return;scores[cur]=B.score;nf?.event({done:[cur,B.score]});phase='over';phaseT=0;s.setScores?.([...scores]);await until(()=>phaseT>2.4);}
   else{await new Promise(r=>{doneWait=r;if(doneGot[cur])r();});if(!s.alive)return;phase='over';phaseT=0;s.setScores?.([...scores]);await until(()=>phaseT>2.4);}
  }
  try{if(Math.max(...scores)>best)localStorage.setItem('sc-flappy-best',String(Math.max(...scores)));}catch{}
  if(solo)soloFinish(s,scores[0],scores[0],`${stage.name} · ${scores[0]} pipes${scores[0]>best?' · NEW BEST':''}`,scores[0]>best&&scores[0]>0);
  else s.finish([...scores],`Flappy Disaster · ${stage.name}`);}
 // ---- drawing
 function bird(y,vy,wing,dead,i){x.save();x.translate(vw*BIRD_X,y);x.rotate(dead?Math.min(1.5,.4+B.deadT*3):clamp(vy/600,-.45,1.2));const r=BIRD_R*1.55;
  const up=wing>0;x.fillStyle=stage.wing;x.strokeStyle='#0008';x.lineWidth=2;x.beginPath();x.ellipse(-r*.55,up?-r*.5:r*.2,r*.62,r*.3,up?-.5:.3,0,7);x.fill();x.stroke();
  s.sprite(x,i,0,0,r*2.05,{exact:true,mood:dead?'sad':vy<-200?'happy':undefined});x.restore();}
 function draw(){layout();x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,s.W,s.H);
  const sh=shake>0?(Math.random()-.5)*shake*22:0;x.setTransform(k,0,0,k,sh*k,0);
  // the watched run: the runner's last snapshot moved on by the time since
  let tr=B.travel,by=B.y,bvy=B.vy,dead=B.dead,sc=B.score,wing=B.wing;
  if(!mine()&&remote){const age=clamp((performance.now()-remote.at)/1000,0,.35);tr=remote.tr+(remote.st&&!remote.d?speedOf(remote.sc)*age:0);by=remote.d?remote.y:remote.y+remote.v*age;bvy=remote.v;dead=!!remote.d;sc=remote.sc;}
  sky(x,vw,stage.sky[0],stage.sky[1]);stage.bg(x,vw,tr,t);
  for(let i=Math.max(0,Math.floor(sc)-3);i<sc+8;i++){const p=pipeAt(i),px=p.x-tr;if(px>vw+40)break;if(px<-PIPE_W-20)continue;const gy=gapY(p,tr),h=p.gap/2;
   if(stage.pipe){stage.pipe.call(stage,x,px,-220,gy-h,true,t,s);stage.pipe.call(stage,x,px,gy+h,FLOOR,false,t,s);}else{column(x,px,-220,gy-h,true,stage,t);column(x,px,gy+h,FLOOR,false,stage,t);}}
  stage.ground(x,vw,tr,t);
  // weather
  if(stage.snow||stage.spore||stage.ember||stage.bubble||stage.paper)for(let i=0;i<34;i++){const X=(hash(i)*vw*1.3-tr*.6*(stage.bubble?.2:1)+t*(stage.snow?20:0))%(vw*1.3),Y=stage.ember||stage.bubble?FLOOR-((t*(30+hash(i+5)*40)+hash(i+3)*FLOOR)%FLOOR):((t*(30+hash(i+5)*30)+hash(i+3)*FLOOR)%FLOOR);
   const XX=(X+vw*1.3)%(vw*1.3)-vw*.15;if(stage.snow)circ(x,'#fff',XX,Y,2);else if(stage.spore)circ(x,'#c8c8b8aa',XX,Y,1.6);else if(stage.ember)circ(x,i%2?'#ff8c1c':'#ffd84c',XX,Y,1.8);else if(stage.bubble){x.strokeStyle='#bce8ff';x.lineWidth=1;x.beginPath();x.arc(XX,Y,3,0,7);x.stroke();}else{R(x,'#fff',XX,Y,7,9);R(x,'#ccc',XX+1,Y+2,5,1);}}
  if(stage.fog){x.fillStyle='rgba(180,190,210,.12)';for(let i=0;i<4;i++){x.beginPath();x.ellipse(((i*260-tr*.8)%(vw+400)+vw+400)%(vw+400)-200,FLOOR-20,180,30,0,0,7);x.fill();}}
  const who=online?cur:cur;if(phase!=='intro'&&phase!=='pass')bird(by,bvy,wing,dead,who);
  for(const q of parts){circ(x,q.c,q.x,q.y,2.5*q.life+1);}
  x.setTransform(1,0,0,1,0,0);
  if(flash>0){x.fillStyle=`rgba(255,255,255,${flash*.8})`;x.fillRect(0,0,s.W,s.H);}
  hud(sc,dead);}
 const big=(str,X,Y,size,fill='#fff')=>{x.font=`900 ${size}px "SC Bangers",Impact,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=size*.18;x.strokeStyle='#000';x.strokeText(str,X,Y);x.fillStyle=fill;x.fillText(str,X,Y);};
 const small=(str,X,Y,size,fill='#fff',al='center')=>{x.font=`800 ${size}px "SC Nunito",sans-serif`;x.textAlign=al;x.textBaseline='middle';x.lineWidth=size*.25;x.strokeStyle='#000a';x.strokeText(str,X,Y);x.fillStyle=fill;x.fillText(str,X,Y);};
 function hud(sc,dead){const W=s.W,H=s.H,u=Math.min(W,H)/420;
  if(phase==='intro'){x.fillStyle=`rgba(0,0,0,${.55*Math.min(1,phaseT*3)})`;x.fillRect(0,0,W,H);const p=Math.min(1,phaseT*2.2),bob=Math.sin(t*3)*4*u;
   small('FLAPPY DISASTER',W/2,H*.3,15*u,'#ffd84c');big(stage.name,W/2,H*.42+bob,Math.min(54*u,W/stage.name.length*1.5)*(.6+.4*p));small(stage.tag,W/2,H*.56,16*u);
   if(phaseT>.8)small('TAP TO SKIP',W/2,H*.82,11*u,'#ffffffaa');return;}
  if(phase==='pass')return;
  big(String(sc),W/2,fb.top+38*u,46*u);
  const who=names[cur]||'';small(online&&!mine()?`WATCHING ${who.toUpperCase()}`:nP>1?who.toUpperCase():'',W/2,fb.top+72*u,12*u,'#ffd84c');
  if(nP>1&&cur===1&&phase!=='over')small(`TO BEAT: ${scores[0]}`,12*u,fb.top+14*u,12*u,'#fff','left');
  if(phase==='ready'&&mine()){big('GET READY!',W/2,H*.3,34*u,'#ffd84c');small('TAP TO FLAP',W/2,H*.62,15*u);}
  if(phase==='over'){const pw=Math.min(W*.8,300*u),ph=150*u,px=(W-pw)/2,py=H*.32;x.fillStyle='#ded895';x.strokeStyle='#543847';x.lineWidth=4*u;x.beginPath();x.roundRect(px,py,pw,ph,12*u);x.fill();x.stroke();
   big('GAME OVER',W/2,py-30*u,38*u,'#fc7858');const s0=scores[cur],m=s0>=40?['PLATINUM','#e8f0f8']:s0>=30?['GOLD','#f8d838']:s0>=20?['SILVER','#c8c8d8']:s0>=10?['BRONZE','#d8884c']:null;
   if(m){circ(x,'#543847',px+52*u,py+ph/2,29*u);circ(x,m[1],px+52*u,py+ph/2,26*u);small(m[0],px+52*u,py+ph/2+40*u,9*u,'#543847');}
   small('SCORE',px+pw-60*u,py+30*u,12*u,'#fc7858');big(String(s0),px+pw-60*u,py+58*u,30*u);small('BEST',px+pw-60*u,py+92*u,12*u,'#fc7858');big(String(Math.max(best,...scores)),px+pw-60*u,py+118*u,24*u);
   const line=stage.dead[(s0+cur)%stage.dead.length];small(line,W/2,py+ph+26*u,14*u,'#fff');}}
 s.frame(dt=>{dt=Math.min(dt,.05);t+=dt;phaseT+=dt;if(shake>0)shake-=dt;if(flash>0)flash=Math.max(0,flash-dt*4);layout();
  if(phase==='ready'||phase==='play'||phase==='over'){if(mine()){step(dt);nf?.tick(dt);}}
  for(let i=parts.length-1;i>=0;i--){const q=parts[i];q.vy+=900*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;if(q.life<=0)parts.splice(i,1);}
  if(s.debug?.autopilot&&mine()&&(phase==='ready'||phase==='play')&&!B.dead){const p=pipeAt(B.next),gy=gapY(p,B.travel+60);if(phase==='ready'||B.y>gy+8&&B.vy>-50)flap();}
  draw();});
 s.debug={engine:'flappy',stage:stage.id,STAGES:STAGES.map(t=>t.id),get phase(){return phase;},B,scores,pipeAt,flap,die,autopilot:false,
  // online test bot: fly this phone's turn a little way, then crash
  bot(){if(phase==='intro'&&phaseT>.6){phaseT=99;return 'skip';}if(!mine())return null;if(phase==='ready'){s.debug.autopilot=true;flap();return 'go';}if(phase==='play'&&B.score>=3+cur&&!B.dead){die();return 'die';}return null;}};
 await run();
}
Object.assign(exports,{flappy,FLAPPY_STAGES:STAGES,flappyCourse:course,gapY});
