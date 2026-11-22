// PLINKO (game id plinko-show, engine 'plinko'): the TV pricing game on its own, on our own studio set (gameshow/stage.js:
// set, rising curtain, our host and two show assistants, original music and sounds; pictures via src/data/showSprites.js).
// A contestant's game: COME ON DOWN, then four small prizes: each shows a two-digit price with ONE digit right; tap the right
// digit to win a chip (you start with one, so up to 5). Then drop the chips: drag along the top of the board, let go. The chip
// rattles down 13 rows of pegs into one of nine slots: $100 $500 $1,000 $0 $10,000 $0 $1,000 $500 $100 (top prize $50,000).
// 1P = you vs a CPU contestant (solo kind 'cpu'); 2P = one phone, one after the other; board = 3 chips each, no pricing.
// Online: turns; the player's phone sends {g:[prize,digit]} for each pick, {d:[chip,x]} for each drop and {l:[chip,slot]} when it
// lands; the chip path comes from the seed (simChip), and the watcher takes the slot from {l}. Money in dollars = the score.
const ST=require("src/engines/gameshow/stage.js");
const SS=require("src/data/showSprites.js");
const {clamp,seededRandom}=require("src/utils.js");
const {holdMusic,releaseMusic,vibrate}=require("src/audio.js");
const {isCpu,cpuSkill,isOnline}=require("src/engines/cpuKit.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const TAU=Math.PI*2,money=n=>'$'+Math.round(n).toLocaleString('en-US');
// ---- the board, in board units: 9 slots 100 wide, 13 peg rows, slots below
const BW=900,TOPY=150,ROWS=13,ROWH=74,PEG_R=7,CHIP_R=34,SLOT_Y=TOPY+ROWS*ROWH-10,FLOOR=SLOT_Y+150,BH=FLOOR+20;
const VALUES=[100,500,1000,0,10000,0,1000,500,100];
const PEGS=(()=>{const p=[];for(let r=0;r<ROWS;r++){const y=TOPY+r*ROWH;if(r%2===0)for(let k=0;k<=9;k++)p.push([k*100,y]);else for(let k=0;k<9;k++)p.push([50+k*100,y]);}return p;})();
// the chip's whole path from where it's let go: fixed 240 Hz steps, a seeded kick at every peg (the board's famous chaos)
function simChip(x0,seed){const R=seededRandom(seed),DT=1/240,G=2300,out=[],hits=[];let x=clamp(x0,CHIP_R,BW-CHIP_R),y=TOPY-120,vx=0,vy=0,t=0,stuck=0,last=-1;
 for(let n=0;n<240*14;n++){t+=DT;vy+=G*DT;x+=vx*DT;y+=vy*DT;
  for(let i=0;i<PEGS.length;i++){const [px,py]=PEGS[i],dx=x-px,dy=y-py,d=Math.hypot(dx,dy),m=CHIP_R+PEG_R;if(d<m&&d>1e-6){const nx=dx/d,ny=dy/d;x=px+nx*m;y=py+ny*m;const vn=vx*nx+vy*ny;
   if(vn<0){vx-=1.48*vn*nx;vy-=1.48*vn*ny;const kick=(R()-.5)*260;vx+=-ny*kick*.9+nx*20;vy+=nx*kick*.2;if(i!==last||t-(hits.length?hits[hits.length-1][0]:0)>.06){hits.push([t,i]);last=i;}}}}
  if(x<CHIP_R){x=CHIP_R;vx=Math.abs(vx)*.5;}if(x>BW-CHIP_R){x=BW-CHIP_R;vx=-Math.abs(vx)*.5;}
  if(y>SLOT_Y){for(let k=1;k<=8;k++){const wx=k*100,dx=x-wx;if(Math.abs(dx)<CHIP_R+3){x=wx+Math.sign(dx||1)*(CHIP_R+3);vx=-vx*.4;}}}
  const sp=Math.hypot(vx,vy);if(sp>1500){vx*=1500/sp;vy*=1500/sp;}if(sp<25&&y<SLOT_Y){stuck+=DT;if(stuck>.3){vx+=(R()-.5)*240;stuck=0;}}else stuck=0;
  if(y>=FLOOR-CHIP_R){y=FLOOR-CHIP_R;if(n%4===0)out.push([x,y,t]);break;}
  if(n%4===0)out.push([x,y,t]);}
 const slot=clamp(Math.floor(x/100),0,8);return {path:out,hits,slot,dur:t};}
// small prizes with honest little prices (one digit shown right, one wrong)
const PRIZES=[['🥛','Fight Milk, a gallon',14],['🍖','A whole Rum Ham',38],['⚡','Brawndo, the case',28],['🍩','A dozen Lard Lad donuts',19],['🧃','Slurm, six pack',23],
 ['🎳','Bowling shoes (used, sprayed)',36],['🕶️','Gas-station sunglasses',12],['🧸','A Teddy Ruxpin knock-off',47],['🍳','A waffle iron',59],['🧴','Cucumber face mask set',26],
 ['🎲','Fuzzy dice for the car',15],['🦆','A rubber duck pool float',33],['🍿','Popcorn maker',64],['🪥','Electric toothbrush',42],['📻','Clock radio',29],['🧢','Paddy\'s Pub trucker cap',17],
 ['🍷','Boxed wine, the good one',24],['🎮','Off-brand game controller',31],['🪴','Ficus (plastic)',22],['🧦','Six pairs of novelty socks',18],['🥫','Bachelor Chow, a flat',27],['🔦','Big camping flashlight',35]];
const HOST_LINES={intro:['Here\'s a game a whole lot of people love to watch...','It\'s PLINKO!'],price:'One digit in each price is right. Pick the right one and win a Plinko chip!',
 drop:'Drag it along the top and let it go. Right down the middle is ten thousand dollars!',big:'TEN THOUSAND DOLLARS!',zero:'Ohhh, nothing on that one.',done:n=>n?`You won ${money(n)}!`:'Oh, I\'m sorry. Better luck next time.'};
async function plinko(s){
 const [c,x]=s.canvas(900,560,{fill:true});const fb=fullBleed(s,{bg:'#14062e'});
 const net=isOnline(s)?s.online:null,me=net?net.me:0,cpu=!net&&isCpu(s),board=s.origin==='board',names=s.players.map(p=>p.name||'Player');
 const snd=ST.createShowSound(),sfx=snd.sfx;holdMusic(6*3600);s.cleanup(()=>{snd.stop();releaseMusic();});
 const mine=i=>net?i===me:!(cpu&&i===1);
 let W=s.W,H=s.H,t=0,mode='intro',introT=0,cur=0,curtain=0,banner=null,hostSay=null,modelPose='present',hostPose='talk',hurry=false,cheerT=0;
 const P=names.map(()=>({won:0,chips:1,dropped:0,picks:[]}));
 let prizes=[],pick=null,aim=BW/2,dragging=false,chip=null,lit=new Map(),pops=[],landed=[],boardCv=null,boardKey='';
 const wait=ms=>new Promise(r=>{const end=performance.now()+ms;const f=()=>{if(!s.alive||hurry||performance.now()>=end){hurry=false;r();return;}setTimeout(f,30);};f();});
 const say=(text,ms=2400,pose='talk')=>{hostSay={text,t:ms/1000};hostPose=pose;};
 // ---- layout: board box on screen
 let L={};function layout(){W=s.W;H=s.H;const wide=W>H*1.15,top=(fb.top||40)+6,fs=clamp(Math.min(W,H)*.04,12,20),strip=fs*3.4+16;
  if(wide){const bh=H-top-10,k=Math.min(bh/BH,W*.5/BW),bw=BW*k,h2=BH*k,bx=(W-bw)/2,by=top+(H-top-h2)/2,side=W-bx-bw,lw=Math.min(side*.9,fs*14);
   L={wide,k,bx,by,bw,bh:h2,top,fs,logo:{x:bx+bw+side/2,y:top+lw*.2,w:lw}};}
  else{const lw=Math.min(W*.52,fs*15),lh=lw*.32,avail=H-top-lh-12-strip,k=Math.min(avail/BH,W*.94/BW),bw=BW*k,h2=BH*k,bx=(W-bw)/2,by=top+lh+10+Math.max(0,(avail-h2)/2);
   L={wide,k,bx,by,bw,bh:h2,top,fs,logo:{x:W/2,y:top+lh/2+2,w:lw}};}}
 const toB=(px,py)=>({x:(px-L.bx)/L.k,y:(py-L.by)/L.k}),bxp=v=>L.bx+v*L.k,byp=v=>L.by+v*L.k;
 // ---- board picture (cached): frame, backing, pegs, slot boxes with prizes
 function boardLayer(){const key=[Math.round(L.bw),Math.round(L.bh),SS.version()].join(':');if(boardCv&&boardKey===key)return boardCv;boardKey=key;
  const cv=boardCv||document.createElement('canvas'),dpr=Math.min(2,window.devicePixelRatio||1);cv.width=Math.ceil(L.bw*dpr)+2;cv.height=Math.ceil(L.bh*dpr)+2;const g=cv.getContext('2d'),k=L.k*dpr;g.setTransform(k,0,0,k,0,0);
  const pic=SS.picture('plinko-board');
  if(pic)g.drawImage(pic,0,0,BW,BH);else{const fr=g.createLinearGradient(0,0,BW,0);fr.addColorStop(0,'#7a5a1a');fr.addColorStop(.5,'#ffd75a');fr.addColorStop(1,'#7a5a1a');g.fillStyle=fr;g.beginPath();g.roundRect(-14,-10,BW+28,BH+20,26);g.fill();
   const bg=g.createLinearGradient(0,0,0,BH);bg.addColorStop(0,'#0e2a8a');bg.addColorStop(.55,'#1b4fd0');bg.addColorStop(1,'#0b1f66');g.fillStyle=bg;g.fillRect(0,0,BW,BH);
   g.globalAlpha=.08;g.fillStyle='#fff';for(let i=0;i<18;i++){g.beginPath();g.moveTo(i*60,0);g.lineTo(i*60+30,0);g.lineTo(i*60-300,BH);g.lineTo(i*60-330,BH);g.fill();}g.globalAlpha=1;
   for(let i=0;i<24;i++){g.fillStyle='#fff3b0';g.beginPath();g.arc(BW*(i+.5)/24,22,6,0,TAU);g.fill();}}
  for(const [px,py] of PEGS){g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.arc(px+2,py+3,PEG_R,0,TAU);g.fill();const pg=g.createRadialGradient(px-2,py-2,1,px,py,PEG_R);pg.addColorStop(0,'#fff');pg.addColorStop(1,'#9aa6c4');g.fillStyle=pg;g.beginPath();g.arc(px,py,PEG_R,0,TAU);g.fill();}
  VALUES.forEach((v,k2)=>{const x0=k2*100,y0=SLOT_Y+8;g.fillStyle=v===10000?'#c8102e':v?'#0b1f66':'#2a2a2a';g.fillRect(x0+4,y0,92,FLOOR-y0);g.strokeStyle='#ffd75a';g.lineWidth=3;g.strokeRect(x0+4,y0,92,FLOOR-y0);
   g.save();g.translate(x0+50,y0+(FLOOR-y0)/2);g.rotate(-Math.PI/2);g.font=`900 ${v>=10000?40:34}px "SC Bangers",Impact,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=v?'#fff':'#aaa';g.fillText(v?money(v):'$0',0,2);g.restore();});
  for(let k2=0;k2<=9;k2++){g.fillStyle='#d8dde8';g.fillRect(k2*100-3,SLOT_Y,6,FLOOR-SLOT_Y);}
  return boardCv=cv;}
 function drawChip(g,cx,cy,r,a=1){const pic=SS.picture('plinko-chip');g.save();g.globalAlpha=a;if(pic){g.drawImage(pic,cx-r*1.1,cy-r*1.1,r*2.2,r*2.2);g.restore();return;}
  g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.arc(cx+r*.12,cy+r*.18,r,0,TAU);g.fill();const gr=g.createRadialGradient(cx-r*.35,cy-r*.4,r*.1,cx,cy,r);gr.addColorStop(0,'#ffffff');gr.addColorStop(1,'#b9c0cc');g.fillStyle=gr;g.beginPath();g.arc(cx,cy,r,0,TAU);g.fill();
  g.strokeStyle='#8a93a3';g.lineWidth=r*.12;g.beginPath();g.arc(cx,cy,r*.72,0,TAU);g.stroke();for(let i=0;i<10;i++){const a2=i/10*TAU;g.beginPath();g.moveTo(cx+Math.cos(a2)*r*.8,cy+Math.sin(a2)*r*.8);g.lineTo(cx+Math.cos(a2)*r*.96,cy+Math.sin(a2)*r*.96);g.stroke();}g.restore();}
 // ---- drawing
 function draw(){layout();x.setTransform(s.dpr||1,0,0,s.dpr||1,0,0);const g=x,fs=L.fs;ST.drawStage(g,W,H,'plinko',t);
  const showBoard=mode!=='intro'||introT>2.2;
  // host and models: beside the board when wide, small at the bottom corners when tall
  const hostH=L.wide?H*.62:Math.min(H*.3,W*.42),hx=L.wide?L.bx*.45:W*.13,hy=L.wide?H*.96:H-4;
  if(showBoard){const bc=boardLayer();g.drawImage(bc,L.bx,L.by,bc.width/(Math.min(2,window.devicePixelRatio||1)),bc.height/(Math.min(2,window.devicePixelRatio||1)));
   for(const [i,v] of lit){const [px,py]=PEGS[i];g.fillStyle=`rgba(255,247,170,${v})`;g.beginPath();g.arc(bxp(px),byp(py),(PEG_R+6*v)*L.k,0,TAU);g.fill();}
   ST.drawLogo(g,'plinko-logo','PLINKO',L.logo.x,L.logo.y,L.logo.w,t);
   // the chip in your hand / falling
   if(mode==='aim'){const cx=bxp(clamp(aim,CHIP_R,BW-CHIP_R)),cy=byp(TOPY-110);drawChip(g,cx,cy,CHIP_R*L.k);if(mine(cur)){g.fillStyle='rgba(255,255,255,.18)';g.fillRect(L.bx,byp(TOPY-160),L.bw,100*L.k);}}
   if(chip){const q=chip.pos;drawChip(g,bxp(q[0]),byp(q[1]),CHIP_R*L.k);}
   for(const l of landed)drawChip(g,bxp(l[0]),byp(l[1]),CHIP_R*L.k*.92,.85);
   for(const p of pops){g.save();g.globalAlpha=Math.min(1,p.t*3)*Math.min(1,(1.6-p.t)*2);g.font=`900 ${fs*2.2}px "SC Bangers",Impact,sans-serif`;g.textAlign='center';g.lineWidth=fs*.3;g.strokeStyle='#000';const yy=byp(SLOT_Y-40)-p.t*fs*3;g.strokeText(p.v?money(p.v):'$0',bxp(p.x),yy);g.fillStyle=p.v>=10000?'#ffe23a':p.v?'#fff':'#ff6a5a';g.fillText(p.v?money(p.v):'$0',bxp(p.x),yy);g.restore();}}
  if(L.wide||mode==='intro'||mode==='price'){ST.drawHost(g,hx,hy,hostH,hostPose,t);ST.drawModel(g,W-(L.wide?L.bx*.45:W*.12),hy,hostH*.95,modelPose,t,0,true);if(L.wide)ST.drawModel(g,W-L.bx*.18,hy,hostH*.9,modelPose,t+1,1,true);}
  // contestants' tags + money
  P.forEach((p,i)=>{const w=Math.min(W*.42,fs*11),x0=i?W-w-8:8,y0=H-fs*3.4-8;if(L.wide&&mode!=='over'){}g.fillStyle=i===cur?'rgba(255,226,58,.92)':'rgba(20,6,46,.78)';g.beginPath();g.roundRect(x0,y0,w,fs*3.2,10);g.fill();
   s.sprite(g,i,x0+fs*1.5,y0+fs*1.6,fs*2.4,{exact:true,still:true,mood:p.mood||'normal'});g.fillStyle=i===cur?'#14062e':'#fff';g.font=`900 ${fs*.9}px "SC Nunito",sans-serif`;g.textAlign='left';g.textBaseline='middle';
   g.fillText(names[i].slice(0,12).toUpperCase(),x0+fs*3,y0+fs*1);g.font=`900 ${fs*1.25}px "SC Bangers",Impact,sans-serif`;g.fillText(money(p.won),x0+fs*3,y0+fs*2.2);
   if(i===cur&&(mode==='aim'||mode==='drop')){g.font=`800 ${fs*.7}px "SC Nunito",sans-serif`;g.textAlign='right';g.fillText(`${p.chips-p.dropped} CHIP${p.chips-p.dropped===1?'':'S'}`,x0+w-8,y0+fs*1);}});
  if(mode==='price'&&pick)drawPricing(g);
  if(hostSay){const bx2=L.wide?hx+hostH*.18:W*.5,by2=L.wide?hy-hostH*1.02:mode==='price'?H*.3:Math.max(L.top+fs*5.5,H-hostH*1.1);ST.bubble(g,bx2,by2,hostSay.text,Math.min(W*.6,fs*15),fs*.85,hx+hostH*.05,hy-hostH*.92);}
  if(mode==='aim'&&mine(cur)&&!cpuTurn())txtC(g,'DRAG ALONG THE TOP · LET GO TO DROP',W/2,byp(TOPY-175),fs*.8,'#fff');
  if(mode==='intro')ST.drawCurtain(g,W,H,curtain,t);
  if(banner)ST.moneyBanner(g,W,H,banner.big,banner.small,Math.min(1,banner.t*3),banner.col);}
 const txtC=(g,s2,x0,y0,size,col)=>{g.save();g.font=`900 ${size}px "SC Nunito",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.lineWidth=size*.3;g.strokeStyle='rgba(0,0,0,.7)';g.strokeText(s2,x0,y0);g.fillStyle=col;g.fillText(s2,x0,y0);g.restore();};
 // pricing card: the prize on a pedestal, the two digits to choose from
 let priceBtns=[];
 function drawPricing(g){const fs=L.fs,cw=Math.min(W*.86,fs*22),ch=fs*13,cx=W/2,cy=L.wide?H*.55:H*.55,x0=cx-cw/2,y0=cy-ch/2;priceBtns=[];
  g.fillStyle='rgba(20,6,46,.92)';g.beginPath();g.roundRect(x0,y0,cw,ch,16);g.fill();g.strokeStyle='#ffd75a';g.lineWidth=3;g.stroke();
  txtC(g,`PRIZE ${pick.k+1} OF 4`,cx,y0+fs*1.1,fs*.8,'#ffd75a');g.font=`${fs*3.6}px serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(pick.em,cx,y0+fs*3.6);txtC(g,pick.name.toUpperCase(),cx,y0+fs*6.2,fs*.95,'#fff');
  const bw=fs*4.4,gap=fs*1.4;pick.digits.forEach((d,j)=>{const bx=cx+(j?gap/2:-gap/2-bw),by=y0+fs*7.4,on=pick.res!=null&&j===pick.right,chosen=pick.choice===j;
   g.fillStyle=on?'#2fa84f':chosen&&pick.res!=null?'#c8102e':'#fff8dc';g.beginPath();g.roundRect(bx,by,bw,fs*4.2,10);g.fill();g.strokeStyle=chosen?'#ffe23a':'#c8102e';g.lineWidth=chosen?5:3;g.stroke();
   g.font=`900 ${fs*3.2}px "SC Bangers",Impact,sans-serif`;g.fillStyle=on||chosen&&pick.res!=null?'#fff':'#c8102e';g.fillText(String(d),bx+bw/2,by+fs*2.2);priceBtns.push({x:bx,y:by,w:bw,h:fs*4.2,j});});
  txtC(g,pick.res==null?(mine(cur)&&!cpuTurn()?'ONE DIGIT IS RIGHT: TAP IT':`${names[cur].toUpperCase()} IS THINKING…`):`PRICE: ${money(pick.price)} ${pick.res?'· YOU WIN A CHIP!':''}`,cx,y0+ch-fs*.9,fs*.8,pick.res==null?'#bfe7ff':pick.res?'#7dff5a':'#ff8a6a');}
 const cpuTurn=()=>cpu&&cur===1;
 // ---- input
 s.on(c,'pointerdown',ev=>{if(s.paused)return;const pt=s.pointer(ev);ev.preventDefault();
  if(mode==='intro'||banner||hostSay&&mode!=='aim'&&mode!=='price'){hurry=true;return;}
  if(mode==='price'&&pick&&pick.res==null&&mine(cur)&&!cpuTurn()){for(const b of priceBtns)if(pt.x>=b.x&&pt.x<=b.x+b.w&&pt.y>=b.y&&pt.y<=b.y+b.h){pickDigit(b.j);return;}return;}
  if(mode==='aim'&&mine(cur)&&!cpuTurn()){dragging=true;aim=toB(pt.x,pt.y).x;s.capture?.(ev);}
  if(mode==='drop'||mode==='done')hurry=true;});
 s.on(c,'pointermove',ev=>{if(!dragging)return;const pt=s.pointer(ev);aim=clamp(toB(pt.x,pt.y).x,CHIP_R,BW-CHIP_R);});
 const up=()=>{if(dragging){dragging=false;if(mode==='aim')dropAt(aim);}};s.on(c,'pointerup',up);s.on(c,'pointercancel',up);
 let pickDone=null,dropDone=null;
 function pickDigit(j){if(!pick||pick.res!=null)return;pick.choice=j;pick.res=j===pick.right;if(net&&mine(cur))net.send({g:[pick.k,j]});const d=pickDone;pickDone=null;d?.();}
 function dropAt(xx){if(mode!=='aim')return;const p=P[cur],n=p.dropped;xx=Math.round(clamp(xx,CHIP_R,BW-CHIP_R));if(net&&mine(cur))net.send({d:[n,xx]});mode='drop';
  const sim=simChip(xx,`${s.seed}:plinko:${cur}:${n}`);chip={sim,i:0,t:0,pos:sim.path[0],n,hit:0};sfx.drop();hostSay=null;}
 // ---- one contestant's game
 async function remoteNext(){for(;;){const m=await net.next();if(!m||!s.alive)return null;return m;}}
 async function pricing(i){const p=P[i],R=seededRandom(`${s.seed}:prizes:${i}`),pool=PRIZES.slice();for(let k=pool.length-1;k>0;k--){const j=Math.floor(R()*(k+1));[pool[k],pool[j]]=[pool[j],pool[k]];}
  mode='price';say(HOST_LINES.price,3200,'point');modelPose='present';
  for(let k=0;k<4;k++){const [em,name,price]=pool[k],T=Math.floor(price/10),O=price%10,tensRight=R()<.5;
   // the price shown as two digits: one of them is right, the other is a wrong digit in its place
   let wrong;do{wrong=Math.floor(R()*10);}while(tensRight?wrong===O:(wrong===T||wrong===0));
   const digits=tensRight?[T,wrong]:[wrong,O],right=tensRight?0:1;
   pick={k,em,name,price,digits,right,choice:null,res:null};
   if(cpuTurn()){await wait(1300);const sk=cpuSkill(s);pickDigit(R()<.55+.35*sk?right:1-right);}
   else if(!mine(i)){const m=await remoteNext();if(!m)return;if(m.g)pickDigit(+m.g[1]);}
   else await new Promise(r=>{pickDone=r;});
   if(!s.alive)return;if(pick.res){p.chips++;sfx.ding();sfx.applause(1.2);modelPose='clap';}else{sfx.buzz();modelPose='present';}await wait(1500);}
  pick=null;}
 async function drops(i){const p=P[i];mode='aim';say(HOST_LINES.drop,3000,'point');modelPose='present';
  while(p.dropped<p.chips){if(!s.alive)return;mode='aim';aim=BW/2;
   if(cpuTurn()){await wait(900);const sk=cpuSkill(s),tx=BW/2+(Math.random()-.5)*(520-360*sk);for(let k=0;k<20;k++){aim+=(tx-aim)*.2;await wait(30);}dropAt(tx);}
   else if(!mine(i)){const m=await remoteNext();if(!m)return;if(m.d){aim=+m.d[1];dropAt(aim);}else continue;}
   else{await new Promise(r=>{const go=()=>{if(!s.alive||mode!=='aim')return r();setTimeout(go,40);};go();});}
   await new Promise(r=>{dropDone=r;});if(!s.alive)return;}
  }
 // chip landed
 let remoteSlot=null;
 function landChip(){const p=P[cur],sim=chip.sim;let slot=sim.slot;const n=chip.n;
  if(net&&!mine(cur)&&remoteSlot&&remoteSlot[0]===n)slot=+remoteSlot[1];
  if(net&&mine(cur))net.send({l:[n,slot]});
  const v=VALUES[slot];p.won+=v;p.dropped++;landed.push([slot*100+50,FLOOR-CHIP_R]);pops.push({v,x:slot*100+50,t:0});sfx.slot(v);vibrate(v>=10000?[40,60,40,60,120]:v?20:8);
  if(v>=10000){say(HOST_LINES.big,2400,'cheer');modelPose='clap';banner={big:'$10,000!',small:'Right down the middle!',t:2.2,col:'#ffe23a'};cheerT=2.5;}
  else if(!v){say(HOST_LINES.zero,1800,'talk');}
  chip=null;mode='landed';setTimeout(()=>{const d=dropDone;dropDone=null;d?.();},v>=10000?2300:1100);}
 // the watcher keeps the slot the player's phone reports
 s.frame(dt=>{dt=Math.min(dt,.05);t+=dt;
  if(mode==='intro'){introT+=dt;curtain=clamp((introT-.4)/1.4,0,1);}
  if(hostSay){hostSay.t-=dt;if(hostSay.t<=0){hostSay=null;hostPose='talk';}}
  if(banner){banner.t-=dt;if(banner.t<=0)banner=null;}
  for(const [i,v] of lit){const nv=v-dt*2.5;if(nv<=0)lit.delete(i);else lit.set(i,nv);}
  for(const p of pops)p.t+=dt;pops=pops.filter(p=>p.t<1.6);
  if(chip){chip.t+=dt*(hurry?3:1);const path=chip.sim.path;while(chip.i<path.length-1&&path[chip.i+1][2]<=chip.t)chip.i++;chip.pos=path[chip.i];
   while(chip.hit<chip.sim.hits.length&&chip.sim.hits[chip.hit][0]<=chip.t){const pi=chip.sim.hits[chip.hit][1];lit.set(pi,1);sfx.peg(pi);chip.hit++;}
   if(chip.i>=path.length-1){hurry=false;landChip();}}
  draw();});
 s.debug={get mode(){return mode;},P,get cur(){return cur;},simChip,VALUES,pick:j=>pickDigit(j),drop:xx=>dropAt(xx??BW/2),get price(){return pick;},
  set hurry(v){hurry=!!v;},bot:net?()=>{if(!mine(cur))return '';if(mode==='price'&&pick&&pick.res==null){pickDigit(Math.random()<.6?pick.right:1-pick.right);return 'pick';}if(mode==='aim'){dropAt(BW/2+(Math.random()-.5)*300);return 'drop';}hurry=true;return '';}:null};
 // remote slot messages arrive in order with the drops: read {l} right after a watched drop
 const origNext=net?net.next.bind(net):null;
 if(net){net.next=async()=>{for(;;){const m=await origNext();if(m&&m.l){remoteSlot=m.l;continue;}return m;}};}
 // ---- the show
 if(!await s.pass(0,net?'PLINKO online: take turns. Price four small prizes to win chips, then drop them for up to $50,000.':cpu?`PLINKO vs ${names[1]}. Price four small prizes to win chips, then drop them down the board. Most money wins.`:'PLINKO: two contestants. Price four small prizes to win chips, then drop them for up to $50,000. Most money wins.','Come on down!'))return;
 await SS.ready(['stage-plinko','stage-plinko-tall','curtain','plinko-board','plinko-chip','plinko-logo','host','model','model-2','nametag'],5000);
 snd.music(true);sfx.comeOn();
 mode='intro';introT=0;banner={big:'COME ON DOWN!',small:names.map(n=>n.toUpperCase()).join(' · '),t:2.6,col:'#ffe23a'};await wait(2600);
 say(HOST_LINES.intro[0],2200);await wait(2200);say(HOST_LINES.intro[1],1800,'cheer');modelPose='present';sfx.fanfare();introT=Math.max(introT,2.3);await wait(1800);
 for(let i=0;i<2;i++){if(!s.alive)return;cur=i;if(i===1&&!net&&!cpu&&!board){snd.music(false);if(!await s.pass(1,`${names[1]}, come on down! Your turn at PLINKO.`,'Play'))return;snd.music(true);}
  banner={big:names[i].toUpperCase(),small:'IT\'S YOUR TURN AT PLINKO!',t:1.8,col:'#fff'};await wait(1800);
  if(board){P[i].chips=3;}else await pricing(i);
  if(!s.alive)return;banner={big:`${P[i].chips} CHIP${P[i].chips===1?'':'S'}`,small:'Let\'s drop them!',t:1.6,col:'#ffe23a'};await wait(1500);
  landed=[];await drops(i);if(!s.alive)return;
  mode='done';say(HOST_LINES.done(P[i].won),2600,P[i].won?'cheer':'talk');if(P[i].won)sfx.applause(2);await wait(2600);}
 if(!s.alive)return;mode='over';snd.music(false);
 const w=P[0].won===P[1].won?-1:P[0].won>P[1].won?0:1;if(w>=0){banner={big:`${names[w].toUpperCase()} WINS!`,small:`${money(P[w].won)} on the Plinko board`,t:3,col:'#ffe23a'};sfx.jackpot();s.react?.(w,'win');}else banner={big:'A TIE!',small:money(P[0].won),t:3,col:'#fff'};
 await wait(3000);
 s.finish(P.map(p=>p.won),`PLINKO · ${names[0]} ${money(P[0].won)} – ${money(P[1].won)} ${names[1]}`);}
Object.assign(exports,{plinko,simChip,VALUES,PEGS});
