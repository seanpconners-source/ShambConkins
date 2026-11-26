// CLIFF HANGERS (game id cliff-hangers, engine 'cliffhangers'; in The Price Is Right's menu, tpirShow.js). Played like the show:
// three small prizes, guess each one's price. For every dollar you're off, the little mountain climber takes one step up the
// mountain to the yodelling music; steps 0 to 25 are safe, the 26th takes him over the cliff (crash, horn) and you lose. Get
// through all three and you win the grand prize (a real product, showPrizes.js GRAND_PRIZES; both contestants play for the same
// one). Right on the money = he doesn't move. Score = grand prize dollars + $100 for every step he had left; a fall = $0.
// 1P = you, then a CPU contestant; 2P = one after the other on one phone; board = the same. Online: turns; the player's phone sends
// {cg:[prize,guess]} and both phones climb the same steps. Pictures (all optional, drawn fallback): src/data/showSprites.js
// cliff-mountain / cliff-climber / cliff-stand / cliff-logo / stage-cliff(-tall/-fold); sounds = the show's cues
// (tpir-cliff-hangers = the yodel while he climbs, resumed where it stopped; tpir-cliff-hangers-crash-2 = the fall).
const ST=require("src/engines/gameshow/stage.js");
const SS=require("src/data/showSprites.js");
const SP=require("src/data/showPrizes.js");
const {clamp,seededRandom}=require("src/utils.js");
const {holdMusic,releaseMusic,vibrate}=require("src/audio.js");
const {isCpu,cpuSkill,isOnline}=require("src/engines/cpuKit.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const TAU=Math.PI*2,money=n=>'$'+Math.round(n).toLocaleString('en-US');
const SAFE=25,STEP_S=.55,MAX_SMALL=60;
const G=SS.CLIFF_GEOM;
// where the climber stands at step n (0..25 on the path, past 25 = along the ledge to the edge), in mountain picture px
function stepPos(n){const [x0,y0]=G.step0,[x1,y1]=G.step25;if(n<=SAFE){const f=n/SAFE;return [x0+(x1-x0)*f,y0+(y1-y0)*f];}
 const f=Math.min(1,(n-SAFE)/1.6);return [x1+(G.edge[0]-x1)*f,y1];}
// ---- drawn fallbacks (also used for the template references): everything in mountain picture px
function drawMountain(g,t=0){const pic=SS.picture('cliff-mountain');if(pic){g.drawImage(pic,0,0,G.w,G.h);return;}
 const [x0,y0]=G.step0,[x1,y1]=G.step25,[ex]=G.edge;
 // the back peaks
 g.fillStyle='#8fa7c8';g.beginPath();g.moveTo(40,G.h);g.lineTo(380,330);g.lineTo(560,470);g.lineTo(820,160);g.lineTo(1050,400);g.lineTo(1180,60);g.lineTo(1300,180);g.lineTo(1300,G.h);g.fill();
 g.fillStyle='#f2f6ff';for(const [px,py,w] of [[380,330,70],[820,160,90],[1180,60,80]]){g.beginPath();g.moveTo(px,py);g.lineTo(px-w,py+w*1.1);g.lineTo(px-w*.4,py+w*.8);g.lineTo(px,py+w*1.2);g.lineTo(px+w*.5,py+w*.85);g.lineTo(px+w*.9,py+w*1.05);g.fill();}
 // the climbing face: up the path to the ledge, then a sheer cliff down the right side
 const rock=g.createLinearGradient(0,y1,0,G.h);rock.addColorStop(0,'#9a8470');rock.addColorStop(1,'#5a4636');g.fillStyle=rock;
 g.beginPath();g.moveTo(0,G.h);g.lineTo(0,y0+40);g.lineTo(x0-80,y0+10);g.lineTo(x0,y0+18);g.lineTo(x1,y1+18);g.lineTo(ex,y1+18);g.lineTo(ex+8,y1+120);g.lineTo(ex-6,y1+330);g.lineTo(ex+10,y1+560);g.lineTo(ex,G.h);g.closePath();g.fill();
 // cracks and snow on the face
 g.strokeStyle='rgba(40,28,18,.35)';g.lineWidth=5;for(let i=0;i<14;i++){const a=(i*97)%1000/1000,b=(i*61)%1000/1000,px=x0+(ex-x0)*a,py=y1+60+(G.h-y1-80)*b;if(py<y0+18-(px-x0)*(y0-y1)/(x1-x0)+30)continue;g.beginPath();g.moveTo(px,py);g.lineTo(px+30,py+40);g.lineTo(px+12,py+80);g.stroke();}
 g.fillStyle='#f4f7ff';g.beginPath();g.moveTo(x1-40,y1+18);g.lineTo(ex,y1+18);g.lineTo(ex+6,y1+70);g.lineTo(ex-60,y1+50);g.lineTo(x1-100,y1+64);g.fill();
 // the path: a pale band with a wooden rail
 g.strokeStyle='#d8c6a0';g.lineWidth=26;g.lineCap='round';g.beginPath();g.moveTo(x0-60,y0+6);g.lineTo(x0,y0+6);g.lineTo(x1,y1+6);g.lineTo(ex-6,y1+6);g.stroke();
 g.strokeStyle='#6b4a2a';g.lineWidth=6;g.beginPath();g.moveTo(x0,y0+20);g.lineTo(x1,y1+20);g.lineTo(ex-6,y1+20);g.stroke();
 // pine trees at the foot
 for(let i=0;i<9;i++){const px=20+i*55,py=G.h-10-(i%3)*18,h=110+(i*37)%60;g.fillStyle='#1f5a32';g.beginPath();g.moveTo(px,py-h);g.lineTo(px-h*.32,py);g.lineTo(px+h*.32,py);g.fill();g.fillStyle='#4a3020';g.fillRect(px-6,py,12,14);}}
// the step markers the game always draws on the path: a tick per step, a numbered sign every 5
function drawSteps(g,cur=-1){g.save();for(let n=0;n<=SAFE;n++){const [px,py]=stepPos(n),big=n%5===0,lit=cur>=0&&n<=cur;g.strokeStyle=lit?'#ffe23a':'#fff';g.lineWidth=big?7:4;g.beginPath();g.moveTo(px,py+14);g.lineTo(px,py+(big?44:30));g.stroke();
  if(big){const w=66,h=52,yy=py+48;g.fillStyle=n===SAFE?'#c8102e':'#14388a';g.beginPath();g.roundRect(px-w/2,yy,w,h,8);g.fill();g.strokeStyle='#fff';g.lineWidth=4;g.stroke();g.fillStyle='#fff';g.font='900 38px "SC Bangers",Impact,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(String(n),px,yy+h/2+2);}}
 g.restore();}
// the climber: feet at (0,0), h tall, facing right; pose by name, k = animation phase
function drawClimber(g,h,pose='stand',k=0){const pic=SS.picture('cliff-climber'),D=SS.CLIMBER;if(pic){const f=Math.max(0,D.frames.indexOf(pose)),fw=pic.width/D.frames.length,s=h/D.unit,w=fw*s;g.drawImage(pic,f*fw,0,fw,pic.height,-D.feet[0]*s,-D.feet[1]*s,w,pic.height*s);return;}
 const u=h/100;g.save();g.lineCap='round';g.lineJoin='round';const walk=pose.startsWith('walk')?Math.sin(k*TAU):0,up=pose==='yodel',tee=pose==='teeter';
 // legs (knee socks, boots)
 for(const s of [-1,1]){const sw=walk*s*14;g.strokeStyle='#e8e2d0';g.lineWidth=7*u;g.beginPath();g.moveTo(s*4*u,-40*u);g.lineTo(s*4*u+sw*.5*u,-20*u);g.lineTo(s*4*u+sw*u,-6*u);g.stroke();g.fillStyle='#3a2414';g.beginPath();g.ellipse(s*4*u+sw*u+3*u,-3*u,7*u,4*u,0,0,TAU);g.fill();}
 // lederhosen + braces, white shirt
 g.fillStyle='#7a4a22';g.beginPath();g.roundRect(-11*u,-56*u,22*u,20*u,4*u);g.fill();g.fillStyle='#f4f0e6';g.beginPath();g.roundRect(-10*u,-78*u,20*u,24*u,6*u);g.fill();
 g.strokeStyle='#7a4a22';g.lineWidth=3*u;g.beginPath();g.moveTo(-6*u,-56*u);g.lineTo(-5*u,-76*u);g.moveTo(6*u,-56*u);g.lineTo(5*u,-76*u);g.moveTo(-5*u,-68*u);g.lineTo(5*u,-68*u);g.stroke();
 // backpack + walking stick
 g.fillStyle='#2f6b3a';g.beginPath();g.roundRect(-20*u,-76*u,10*u,22*u,3*u);g.fill();
 // arms
 g.strokeStyle='#f4f0e6';g.lineWidth=6*u;const arm=(s,a)=>{g.beginPath();g.moveTo(s*8*u,-74*u);g.lineTo(s*8*u+Math.cos(a)*16*u,-74*u+Math.sin(a)*16*u);g.stroke();return [s*8*u+Math.cos(a)*16*u,-74*u+Math.sin(a)*16*u];};
 if(up){arm(-1,-2.2);arm(1,-.9);}else if(tee){arm(-1,-2.6+Math.sin(k*TAU*2)*.9);arm(1,-.4-Math.sin(k*TAU*2)*.9);}else{arm(-1,1.9-walk*.5);const [hx,hy]=arm(1,1.2+walk*.5);g.strokeStyle='#8a5a2a';g.lineWidth=3*u;g.beginPath();g.moveTo(hx,hy-14*u);g.lineTo(hx+4*u,0);g.stroke();}
 // head, rosy cheeks, moustache, alpine hat with a feather
 g.fillStyle='#f2c49a';g.beginPath();g.arc(0,-88*u,10*u,0,TAU);g.fill();g.fillStyle='#e8806a';g.beginPath();g.arc(5*u,-85*u,2.6*u,0,TAU);g.fill();
 g.fillStyle='#4a2a14';g.beginPath();g.ellipse(6*u,-83*u,5*u,1.8*u,0,0,TAU);g.fill();g.fillStyle='#111';g.beginPath();g.arc(5*u,-90*u,1.4*u,0,TAU);g.fill();
 if(up){g.fillStyle='#5a1010';g.beginPath();g.ellipse(7*u,-82*u,2.4*u,3*u,0,0,TAU);g.fill();}
 g.fillStyle='#2f6b3a';g.beginPath();g.ellipse(0,-96*u,15*u,3.5*u,0,0,TAU);g.fill();g.beginPath();g.moveTo(-9*u,-96*u);g.quadraticCurveTo(0,-112*u,9*u,-96*u);g.fill();
 g.fillStyle='#c8102e';g.fillRect(-9*u,-99*u,18*u,3*u);g.strokeStyle='#e8e0c0';g.lineWidth=2*u;g.beginPath();g.moveTo(-6*u,-99*u);g.quadraticCurveTo(-14*u,-114*u,-20*u,-118*u);g.stroke();
 g.restore();}
// the small-prize pedestal (STAND_GEOM px): the prize photo sits on top, the price window on the front
function drawStand(g,lit=false){const pic=SS.picture('cliff-stand'),S=SS.STAND_GEOM,[a,b,c,d]=S.price;if(pic){g.drawImage(pic,0,0,S.w,S.h);return;}
 const gr=g.createLinearGradient(0,0,S.w,0);gr.addColorStop(0,'#5a1a6a');gr.addColorStop(.5,'#a03ab8');gr.addColorStop(1,'#5a1a6a');g.fillStyle=gr;g.beginPath();g.moveTo(90,260);g.lineTo(510,260);g.lineTo(540,590);g.lineTo(60,590);g.closePath();g.fill();
 g.fillStyle='#ffd23f';g.beginPath();g.ellipse(300,260,230,34,0,0,TAU);g.fill();g.fillStyle='#e0b020';g.fillRect(70,560,460,30);
 for(let i=0;i<12;i++){g.fillStyle=lit&&i%2===0?'#fff6c0':'#ffe9a0';g.beginPath();g.arc(100+i*36.4,505,9,0,TAU);g.fill();}
 g.fillStyle='#14062e';g.beginPath();g.roundRect(a-10,b-10,c-a+20,d-b+20,14);g.fill();g.fillStyle='#2a0a10';g.fillRect(a,b,c-a,d-b);}
async function cliffHangers(s){
 const [c,x]=s.canvas(900,560,{fill:true});const fb=fullBleed(s,{bg:'#14062e'});
 const net=isOnline(s)?s.online:null,me=net?net.me:0,cpu=!net&&isCpu(s),board=s.origin==='board',names=s.players.map(p=>p.name||'Player');
 const snd=ST.createShowSound({clips:['cliff-hangers','cliff-hangers-crash-2','big-winner','losing-horn','ding','bell'],voice:'cliff'}),sfx=snd.sfx;holdMusic(6*3600);s.cleanup(()=>{snd.stop();releaseMusic();});
 const mine=i=>net?i===me:!(cpu&&i===1),cpuTurn=()=>cpu&&cur===1;
 const R0=seededRandom(`${s.seed}:cliff:grand`),grand=SP.GRAND_PRIZES[Math.floor(R0()*SP.GRAND_PRIZES.length)];
 const smalls=SP.PRIZES.filter(p=>p[2]<=MAX_SMALL);
 const P=names.map((n,i)=>{const R=seededRandom(`${s.seed}:cliff:${i}`),pool=smalls.slice();for(let k=pool.length-1;k>0;k--){const j=Math.floor(R()*(k+1));[pool[k],pool[j]]=[pool[j],pool[k]];}
  return {prizes:pool.slice(0,3).map(([id,name,price,em])=>({id,name,price,em,guess:null})),steps:0,fell:false,done:false,score:0,mood:'normal'};});
 for(const p of P)for(const q of p.prizes)SP.prizePhoto(q.id);SP.prizePhoto(grand[0]);
 let W=s.W,H=s.H,t=0,mode='intro',introT=0,curtain=0,cur=0,pk=-1,entry='',banner=null,hostSay=null,hurry=false;
 // the climber: shown position (steps, may be fractional), pose, fall animation
 let cl={pos:0,pose:'stand',walkT:0,fall:null},climb=null,music=null,musicOff=0;
 // waits let the host finish what he's saying (not online: both phones keep the same pace); a tap hurries the show and cuts him off
 const wait=ms=>new Promise(r=>{const end=performance.now()+Math.max(ms,net?0:snd.talking());const f=()=>{if(!s.alive||hurry||performance.now()>=end){if(hurry)snd.hush();hurry=false;r();return;}setTimeout(f,30);};f();});
 const say=(text,ms=2600)=>{hostSay={text,t:ms/1000};if(snd.speak(text))hostSay.t=Math.max(hostSay.t,snd.talking()/1000+.3);};const cast=ST.createCast();
 // ---- layout: mountain box, prize stands, keypad
 // wide: the mountain fills the left column (logo as a sign over its sky, name tags under it), prizes + keypad on the right.
 // tall: logo, mountain, the three stands, then the keypad; name tags along the bottom.
 let L={};function layout(){W=s.W;H=s.H;const top=(fb.top||40)+6,fs=clamp(Math.min(W,H)*.04,12,20),wide=W>H*1.15;
  // side by side on landscape screens
  if(wide){const tagH=fs*2.8,lw0=W*.58,mw=Math.min(lw0,(H-8-tagH-6-8)*G.w/G.h),mh=mw*G.h/G.w,mx=8+(lw0-mw)/2,spare=H-8-tagH-6-8-mh,my=8+spare*(W>H*1.15?.5:.42);
   const px=lw0+fs*.8,pw=W-px-8,sh=Math.min(pw/3*1.15,(H-top)*.38),colH=sh+fs*1.8+Math.min(H-top-sh-fs*1.8-8,fs*15),t0=Math.max(top,(H-colH)/2),padY=t0+sh+fs*1.8;
   L={wide,fs,top,tagH,mx,my,mk:mw/G.w,mh,mw,logo:{x:mx+mw*.2,y:my+mh*.1,w:Math.min(mw*.36,fs*12)},count:{x:mx+mw*.2,y:my+mh*.1+Math.min(mw*.36,fs*12)*.24+fs*.9},
    tags:{x:8,w:lw0,y:Math.min(H-tagH-6,my+mh+fs*.6)},stands:{x:px,y:t0,w:pw,h:sh},pad:{x:px,y:padY,w:pw,h:Math.min(H-padY-8,fs*15)},bub:{x:mx+mw*.55,y:my+mh*.3,w:Math.min(mw*.6,fs*15)}};}
  else{const lw=Math.min(W*.6,fs*14),lh=lw*.3,my=top+lh+4,mw=Math.min(W*.98,H*.5*G.w/G.h),mh=mw*G.h/G.w,sy=my+mh+fs*.4,tagH=fs*3.2,bandB=H-tagH-14;
   let sh=Math.min(W/3*1.2,H*.2),stands={x:W*.02,y:sy,w:W*.96,h:sh},pad={x:W*.08,y:sy+sh+fs*2.2,w:W*.84,h:bandB-(sy+sh+fs*2.2)};
   // near-square screens (the open Fold): no room for the keypad under the stands, so stands left, keypad right in one band
   if(pad.h<fs*9){sh=Math.min(bandB-sy-fs*2.4,W*.47/3*1.25);stands={x:W*.02,y:sy,w:W*.47,h:sh};pad={x:W*.52,y:sy,w:W*.46,h:bandB-sy};}
   L={wide,fs,top,tagH,mx:(W-mw)/2,my,mk:mw/G.w,mh,mw,logo:{x:W/2,y:top+lh/2,w:lw},count:{x:W/2,y:my+fs*.7},
    tags:{x:8,w:W-16,y:H-tagH-8},stands,pad,bub:{x:W/2,y:my+mh*.32,w:Math.min(W*.86,fs*17)}};}}
 const mxp=v=>L.mx+v*L.mk,myp=v=>L.my+v*L.mk;
 const txt=(g,str,x0,y0,size,col,{font='"SC Nunito",sans-serif',w=900,align='center',max=0}={})=>{g.save();g.font=`${w} ${size}px ${font}`;if(max){const m=g.measureText(str).width;if(m>max)g.font=`${w} ${size*max/m}px ${font}`;}g.textAlign=align;g.textBaseline='middle';g.lineWidth=size*.28;g.strokeStyle='rgba(0,0,0,.75)';g.lineJoin='round';g.strokeText(str,x0,y0);g.fillStyle=col;g.fillText(str,x0,y0);g.restore();};
 // ---- drawing
 let keys=[];
 function draw(){layout();const g=x;g.setTransform(s.dpr||1,0,0,s.dpr||1,0,0);const fs=L.fs;ST.drawStage(g,W,H,'cliff',t);
  // the mountain + markers + climber
  g.save();g.translate(L.mx,L.my);g.scale(L.mk,L.mk);drawMountain(g,t);drawSteps(g,Math.floor(cl.pos+.001));
  let [cx,cy]=stepPos(Math.min(cl.pos,SAFE+1.6)),rot=0;const ch=170;
  if(cl.fall){const f=cl.fall.t;cx=G.edge[0]+f*60;cy=G.edge[1]+(f>.35?Math.pow(f-.35,2)*2600:0);rot=Math.min(2.6,Math.max(0,f-.3)*5);}
  if(cy<G.h+ch*1.2){g.save();g.translate(cx,cy);g.rotate(rot);drawClimber(g,ch,cl.pose,cl.walkT);g.restore();}
  g.restore();
  // step counter above the mountain
  const p=P[cur];ST.drawLogo(g,'cliff-logo','CLIFF HANGERS',L.logo.x,L.logo.y,L.logo.w,t,{cols:['#7fd8ff','#ffffff']});
  txt(g,`${names[cur].toUpperCase()}: ${Math.min(SAFE,Math.round(cl.pos))} OF ${SAFE} STEPS`,L.count.x,L.count.y,fs*.8,cl.pos>SAFE-5?'#ff8a6a':'#fff',{max:L.mw*.5});
  drawStands(g);
  if(mode==='guess'&&mine(cur)&&!cpuTurn())drawPad(g);else keys=[];
  if(mode==='guess'&&(!mine(cur)||cpuTurn()))txt(g,`${names[cur].toUpperCase()} IS GUESSING…${entry?'  $'+entry:''}`,L.pad.x+L.pad.w/2,L.pad.y+fs*1.5,fs*1,'#bfe7ff',{max:L.pad.w*.95});
  // contestant tags
  P.forEach((q,i)=>{const T=L.tags,th=L.tagH,w=Math.min(T.w/2-6,fs*11),x0=i?T.x+T.w-w:T.x,y0=T.y;g.fillStyle=i===cur?'rgba(255,226,58,.92)':'rgba(20,6,46,.78)';g.beginPath();g.roundRect(x0,y0,w,th,10);g.fill();
   s.sprite(g,i,x0+fs*1.5,y0+th/2,th*.75,{exact:true,still:true,mood:q.mood});g.fillStyle=i===cur?'#14062e':'#fff';g.font=`900 ${fs*.9}px "SC Nunito",sans-serif`;g.textAlign='left';g.textBaseline='middle';
   g.fillText(names[i].slice(0,12).toUpperCase(),x0+fs*3,y0+th*.31);g.font=`900 ${fs*1.1}px "SC Bangers",Impact,sans-serif`;g.fillText(q.done?(q.fell?'FELL OFF!':money(q.score)):q.steps?`${q.steps} STEPS`:'—',x0+fs*3,y0+th*.69);});
  {const sp=cast.spots(W,H,{foot:L.tags.y-6});cast.draw(g,W,H,t,sp,!!hostSay);if(hostSay){if(cast.hv>.5){const b=cast.bubbleAt(W,H,sp,fs);ST.bubble(g,b.x,b.y,hostSay.text,b.w,fs*.85,b.tx,b.ty);}else{const B=L.bub;ST.bubble(g,B.x,B.y,hostSay.text,B.w,fs*.85,B.x,B.y+fs*2.5);}}}
  if(mode==='intro')ST.drawCurtain(g,W,H,curtain,t);
  if(banner)ST.moneyBanner(g,W,H,banner.big,banner.small,Math.min(1,banner.t*3),banner.col);}
 function drawStands(g){const fs=L.fs,S=SS.STAND_GEOM,b=L.stands,sw=b.w/3,k=Math.min(sw/S.w,b.h/S.h);
  P[cur].prizes.forEach((q,i)=>{const cx=b.x+sw*(i+.5),w=S.w*k,h=S.h*k,x0=cx-w/2,y0=b.y+b.h-h,on=i===pk;g.save();g.globalAlpha=pk>=0&&i>pk?.55:1;g.translate(x0,y0);g.scale(k,k);drawStand(g,on);
   // the prize on top
   const ph=SP.prizePhoto(q.id),[tx,ty]=S.top;if(ph){const bw=320,bh=220,kk=Math.min(bw/ph.width,bh/ph.height),pw=ph.width*kk,phh=ph.height*kk;g.fillStyle='#fff';g.beginPath();g.roundRect(tx-pw/2-8,ty-phh-8,pw+16,phh+16,14);g.fill();g.drawImage(ph,tx-pw/2,ty-phh,pw,phh);}
   else{g.font='190px serif';g.textAlign='center';g.textBaseline='alphabetic';g.fillText(q.em,tx,ty-10);}
   // the price window: the guess in white while guessing, then the real price in red LEDs
   const [a,bb,c2,d]=S.price,val=q.guess==null?(on&&mode==='guess'?entry:''):(q.shown?String(q.price):String(q.guess));g.font='900 92px "SC Bangers",Impact,sans-serif';g.textAlign='center';g.textBaseline='middle';
   g.fillStyle=q.shown?'#ff3a2a':'#fff';g.shadowColor=q.shown?'#ff3a2a':'#fff';g.shadowBlur=18;if(val||on)g.fillText('$'+val+(on&&q.guess==null&&Math.floor(t*2)%2?'_':''),(a+c2)/2,(bb+d)/2+4);g.restore();
   if(on||q.guess!=null)txt(g,q.name.toUpperCase(),cx,y0+h+fs*.55,fs*.62,on?'#ffe23a':'#ddd',{w:800,max:sw*.96});
   if(q.shown&&q.guess!=null){const off=Math.abs(q.price-q.guess);txt(g,off?`GUESS $${q.guess} · OFF ${off}`:'RIGHT ON!',cx,y0+h+fs*1.45,fs*.62,off?'#fff':'#7dff5a',{max:sw*.96});}});}
 function drawPad(g){const fs=L.fs,b=L.pad,cols=3,rows=4,gap=fs*.35,kw=Math.min((b.w-gap*2)/cols,fs*5),kh=Math.min((b.h-gap*3-fs*1.4)/rows,fs*3.2),x0=b.x+(b.w-(kw*3+gap*2))/2,y0=b.y+fs*1.4;keys=[];
  txt(g,'GUESS THE PRICE',b.x+b.w/2,b.y+fs*.6,fs*.85,'#ffd75a');
  const lab=['1','2','3','4','5','6','7','8','9','⌫','0','OK'];lab.forEach((l,i)=>{const kx=x0+(i%3)*(kw+gap),ky=y0+Math.floor(i/3)*(kh+gap),ok=l==='OK',dis=ok&&!entry;
   g.fillStyle=ok?(dis?'#555':'#2fa84f'):l==='⌫'?'#c8102e':'#fff8dc';g.beginPath();g.roundRect(kx,ky,kw,kh,kh*.25);g.fill();g.strokeStyle='#ffd75a';g.lineWidth=2;g.stroke();
   txt(g,l,kx+kw/2,ky+kh/2,kh*.48,ok||l==='⌫'?'#fff':'#14062e',{font:'"SC Bangers",Impact,sans-serif',w:400});keys.push({x:kx,y:ky,w:kw,h:kh,l});});}
 // ---- input
 let guessDone=null;
 function press(l){if(mode!=='guess'||!mine(cur)||cpuTurn())return;if(l==='⌫')entry=entry.slice(0,-1);else if(l==='OK'){if(entry)submit(+entry);return;}else if(/\d/.test(l)&&entry.length<2&&!(entry===''&&l==='0'))entry+=l;sfx.peg?.(3);vibrate(6);}
 function submit(v){if(mode!=='guess')return;snd.hush();const q=P[cur].prizes[pk];q.guess=clamp(Math.round(v),1,99);if(net&&mine(cur))net.send({cg:[pk,q.guess]});mode='reveal';const d=guessDone;guessDone=null;d?.();}
 s.on(c,'pointerdown',ev=>{if(s.paused)return;ev.preventDefault();const pt=s.pointer(ev);
  for(const k of keys)if(pt.x>=k.x&&pt.x<=k.x+k.w&&pt.y>=k.y&&pt.y<=k.y+k.h){press(k.l);return;}
  if(mode!=='guess')hurry=true;});
 s.on(document,'keydown',ev=>{if(s.paused)return;if(/^\d$/.test(ev.key))press(ev.key);else if(ev.key==='Backspace')press('⌫');else if(ev.key==='Enter')press('OK');});
 // ---- the climb: n steps at STEP_S each to the yodel; returns when he stops (or falls)
 function musicOn(){if(music)return;const h=snd.clip('cliff-hangers',{off:musicOff,vol:1});if(h)music={h,t0:h.src.context.currentTime,off:musicOff};}
 function musicStop(){if(!music)return;const {h,t0,off}=music,a=h.src.context,now=a.currentTime;musicOff=(off+(now-t0))%Math.max(1,(h.src.buffer?.duration||15)-1);try{h.g.gain.cancelScheduledValues(now);h.g.gain.setValueAtTime(h.g.gain.value,now);h.g.gain.linearRampToValueAtTime(.0001,now+.25);h.src.stop(now+.3);}catch{}music=null;}
 function doClimb(n){return new Promise(r=>{if(n<=0)return r();climb={from:cl.pos,to:cl.pos+n,t:0,dur:n*STEP_S,done:r};cl.pose='walk1';musicOn();});}
 async function fallOff(){cl.pose='teeter';musicStop();await wait(900);cl.pose='fall';cl.fall={t:0};if(!snd.clip('cliff-hangers-crash-2',{vol:1}))sfx.over();vibrate([60,40,120]);await wait(2600);}
 // ---- one contestant
 async function remoteNext(){const m=await net.next();if(!m||!s.alive)return null;return m;}
 async function play(i){const p=P[i];cur=i;cl={pos:0,pose:'stand',walkT:0,fall:null};musicOff=0;
  for(let k=0;k<3;k++){if(!s.alive)return;pk=k;entry='';mode='guess';const q=p.prizes[k];
   say(k===0?`First prize: ${q.name}. What do you think it costs?`:k===1?`Next: ${q.name}.`:`Last one: ${q.name}. He's on step ${p.steps}.`,2800);
   if(cpuTurn()){await wait(1400);const sk=cpuSkill(s),R=seededRandom(`${s.seed}:cliffcpu:${k}`),err=Math.round((R()+R()+R()-1.5)*(18-12*sk)),v=clamp(q.price+err,1,99);for(const d of String(v)){entry+=d;await wait(350);}submit(v);}
   else if(!mine(i)){for(;;){const m=await remoteNext();if(!m)return;if(m.cg&&+m.cg[0]===k){entry=String(m.cg[1]);submit(+m.cg[1]);break;}}}
   else await new Promise(r=>{guessDone=r;});
   if(!s.alive)return;hostSay=null;await wait(500);q.shown=true;sfx.ding();await wait(900);const off=Math.abs(q.price-q.guess);
   if(!off){banner={big:'RIGHT ON THE MONEY!',small:'He doesn\'t move a step',t:1.8,col:'#7dff5a'};sfx.applause(2,.6);cl.pose='yodel';await wait(1900);cl.pose='stand';continue;}
   banner={big:`OFF BY ${off}`,small:off===1?'One step':`${off} steps up the mountain`,t:1.4,col:'#fff'};await wait(1400);
   const safe=Math.max(0,Math.min(off,SAFE-p.steps)),over=p.steps+off>SAFE;
   await doClimb(over?SAFE+1.6-p.steps:safe);p.steps+=off;if(!s.alive)return;
   if(over){p.fell=true;p.mood='sad';await fallOff();break;}
   if(p.steps>=SAFE-3)say('He\'s hanging on by his toenails!',2000);else if(p.steps>=SAFE-8)sfx.cheer?.(1,.1);
   await wait(700);}
  if(!s.alive)return;pk=-1;mode='done';p.done=true;
  if(p.fell){p.score=0;banner={big:'OVER THE CLIFF!',small:`${names[i]} went ${p.steps} steps`,t:2.4,col:'#ff6a5a'};if(!snd.clip('losing-horn'))sfx.aww?.();say('Oh, I\'m sorry. He took a tumble!',2400);}
  else{p.score=grand[2]+100*(SAFE-p.steps);p.mood='win';cl.pose='yodel';banner={big:'YOU WIN!',small:`${grand[1]} · ${money(grand[2])}`,t:2.8,col:'#ffe23a'};sfx.jackpot(true);vibrate([30,40,30]);say(`He made it! You win ${grand[1]}!`,2600);}
  await wait(2900);}
 // ---- frame
 s.frame(dt=>{dt=Math.min(dt,.05);t+=dt;
  if(mode==='intro'){introT+=dt;curtain=clamp((introT-.4)/1.4,0,1);}
  if(hostSay){hostSay.t-=dt;if(hostSay.t<=0)hostSay=null;}
  // the host and the models (stage.js createCast): he walks on to talk, she presents at each turn, both cheer at a win
  cast.step(dt,{host:!!hostSay||(mode==='intro'&&introT>2)||mode==='over',model:mode==='intro'&&introT>2.4});
  {const pl=mode!=='intro'&&mode!=='over';if(pl!==cast.mur){cast.mur=pl;snd.murmur?.(pl);}}
  if(mode==='guess'){cast.yellT=(cast.yellT??2)-dt;if(cast.yellT<=0){cast.yellT=2.4+Math.random()*3.2;snd.voice?.('crowd-shout',{vol:.55+Math.random()*.3,pan:Math.random()*1.4-.7});}}
  if(banner&&!banner.cast){banner.cast=1;if(banner.col==='#ff6a5a')snd.voice?.('crowd-aww');if(banner.col==='#7dff5a'||banner.col==='#ffe23a'){cast.cheer(Math.min(3,banner.t+.4));snd.voice?.('crowd-cheer',{vol:.8});}else if(/YOUR TURN/.test(banner.small||''))cast.present(3.4,'wave');}
  if(banner){banner.t-=dt;if(banner.t<=0)banner=null;}
  if(climb){climb.t+=dt*(hurry?3:1);const f=Math.min(1,climb.t/climb.dur);const prev=Math.floor(cl.pos);cl.pos=climb.from+(climb.to-climb.from)*f;cl.walkT+=dt/STEP_S*(hurry?3:1);cl.pose=['walk1','walk2','walk3','walk4'][Math.floor(cl.walkT*4)%4];
   if(Math.floor(cl.pos)!==prev&&Math.floor(cl.pos)<=SAFE)vibrate(4);
   if(f>=1){const d=climb.done;climb=null;hurry=false;cl.pose='stand';musicStop();d();}}
  if(cl.fall)cl.fall.t+=dt*.9;
  draw();});
 s.debug={snd,get mode(){return mode;},P,get cur(){return cur;},grand,get climber(){return cl;},stepPos,set hurry(v){hurry=!!v;},
  guess:v=>{if(mode==='guess')submit(v??P[cur].prizes[pk].price);},get entry(){return entry;},press,get keys(){return keys.map(k=>({x:k.x,y:k.y,w:k.w,h:k.h,l:k.l}));},get pk(){return pk;},
  bot:net?()=>{if(!mine(cur))return '';if(mode==='guess'){const q=P[cur].prizes[pk];submit(clamp(q.price+Math.round((Math.random()-.5)*16),1,99));return 'guess';}hurry=true;return '';}:null};
 // ---- the show
 if(!s.fromMenu&&!await s.pass(0,net?'CLIFF HANGERS online: take turns guessing three small prices. Every dollar off is one step up the mountain; past 25 he falls.':cpu?`CLIFF HANGERS vs ${names[1]}: guess three small prices. Every dollar off = one step; past 25 the climber falls off the cliff.`:'CLIFF HANGERS: guess three small prices. Every dollar off = one step up the mountain; past 25 he falls off the cliff.','Come on down!'))return;
 await SS.ready(['stage-cliff','stage-cliff-tall','stage-cliff-fold','curtain','cliff-mountain','cliff-climber','cliff-stand','cliff-logo'],5000);
 if(!s.fromMenu)snd.title(true);snd.crowd(3,.9,{at:.3});mode='intro';introT=0;
 banner={big:'CLIFF HANGERS!',small:`Playing for ${grand[1]} · ${money(grand[2])}`,t:2.8,col:'#7fd8ff'};await wait(2800);
 say('For every dollar you\'re off, our mountain climber takes one step. Twenty-five steps are safe... one more and he goes right over the cliff!',3600);introT=Math.max(introT,2.3);await wait(3400);snd.title(false);
 for(let i=0;i<2;i++){if(!s.alive)return;if(i===1&&!net&&!cpu&&!board){if(!await s.pass(1,`${names[1]}, come on down! Your turn at CLIFF HANGERS.`,'Play'))return;}
  banner={big:names[i].toUpperCase(),small:'IT\'S YOUR TURN AT CLIFF HANGERS!',t:1.6,col:'#fff'};sfx.applause(1.6,.5);await wait(1600);await play(i);}
 if(!s.alive)return;mode='over';
 const a=P[0].score,b=P[1].score,w=a===b?-1:a>b?0:1;
 if(w>=0){banner={big:`${names[w].toUpperCase()} WINS!`,small:P[w].fell?'':`${grand[1]} + ${money(100*(SAFE-P[w].steps))}`,t:3,col:'#ffe23a'};sfx.winner();s.react?.(w,'win');}else banner={big:a?'BOTH MADE IT!':'BOTH FELL OFF!',small:'A tie',t:3,col:'#fff'};
 await wait(3000);
 s.finish([a,b],`CLIFF HANGERS · ${names[0]} ${P[0].fell?'fell':P[0].steps+' steps'} – ${names[1]} ${P[1].fell?'fell':P[1].steps+' steps'}`);}
Object.assign(exports,{cliffHangers,stepPos,drawMountain,drawSteps,drawClimber,drawStand,SAFE});
