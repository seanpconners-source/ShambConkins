// CONTESTANTS' ROW (game id contestants-row, engine 'contestantsrow'; in The Price Is Right's menu, tpirShow.js). Played like the
// show's One Bid (owner, Nov 25: "i want to see the crowd going nuts. i want to see the people get called down! the whole thing!!"):
// four contestants are called down from the audience one at a time (the name in lights, the house on its feet, they jump up and run
// down the aisle to a podium), a prize comes out, everybody bids once in turn (no two bids alike, $1 is allowed), closest to the actual
// retail price without going over wins it (+$500 for a PERFECT BID); everybody over = they all bid again under the lowest bid.
// A studio guest who wins goes up on stage and the next guest is called down to the empty podium; the newest contestant bids first.
// Players: the two players + two studio guests (characters from the game under their own names, gameshow/guests.js, never the same one
// twice in a game; played by the game on every phone);
// vs CPU the second player is the CPU. Arcade 4 prizes, board 2. Score = what you won. Online: the bidder's phone sends {b:bid}.
// Pictures (all optional, drawn fallback): cr-audience(-tall/-fold) the bleachers, stage-row(-tall/-fold) the studio, cr-podium (one
// podium, the game prints the bid in its BID window), cr-body-1..4 (headless contestant sheets, the face goes on the FACE spot),
// the studio audience (gameshow/audience.js: cr-fan-1..8, cr-seat, cr-audience + cr-audience-front), cr-comeondown (the COME ON DOWN! lettering), cr-logo; the prize on clock-platform.
const ST=require("src/engines/gameshow/stage.js");
const SS=require("src/data/showSprites.js");
const SP=require("src/data/showPrizes.js");
const {createKit,txt,money}=require("src/engines/gameshow/pricingKit.js");
const {seededRandom,clamp}=require("src/utils.js");
const {faceSprite,headFacts,drawFace}=require("src/headFacts.js");
const AUD=require("src/engines/gameshow/audience.js"),{drawnBody}=AUD;
const {guestDeck}=require("src/engines/gameshow/guests.js");
const TV=require("src/data/tpirVoice.js");
const TAU=Math.PI*2,ease=v=>1-Math.pow(1-clamp(v,0,1),3);
const SHIRTS=['#e63946','#3a86ff','#ffbe0b','#8338ec','#06d6a0','#fb5607','#ff006e','#4cc9f0','#80b918','#f15bb5'];
// One Bid items like the show's: TVs, furniture, appliances, gear, instruments, now and then a trip (showCatalog BID) + the dearer MID items
const ITEMS=[...SP.BID_PRIZES,...SP.MID_PRIZES.filter(p=>p[2]>=300)];
function nice(v,R){v=Math.max(1,v);const r=R();if(v<100)return Math.round(v);if(r<.35)return Math.round(v/50)*50||50;if(r<.6)return Math.max(1,Math.round(v/100)*100-1);if(r<.8)return Math.round(v/10)*10;return Math.round(v);}
// a studio guest's / the CPU's bid: a guess near the price (better with skill), the last bidder plays the show's tricks ($1 over
// the top bid, or $1 when it thinks everybody else is over); never a bid that's taken or (rebid) not under the limit
function cpuBid(price,bids,limit,skill,R,last){const taken=bids.filter(b=>b!=null);let est=price*(1+(R()*2-1)*(.42-.28*skill)+(R()-.5)*.12);let b=nice(est,R);
 if(last&&taken.length){const hi=Math.max(...taken),lo=Math.min(...taken);if(R()<.55&&hi<est*1.05)b=hi+1;else if(R()<.25&&lo>est*1.1)b=1;}
 if(limit)b=Math.min(b,Math.max(1,limit-1-Math.floor(R()*limit*.2)));b=Math.max(1,Math.round(b));let k=0;while(taken.includes(b)&&k++<500)b=b+1<(limit||1e9)?b+1:Math.max(1,b-k);return b;}
// the drawn podium (until cr-podium art): orange front, a bulb strip, the dark BID window
function drawnPodium(g,b,t,i){const PG=SS.CR_PODIUM,k=b.w/PG.w,[a,bb,c,d]=PG.bid;const gr=g.createLinearGradient(0,b.y,0,b.y+b.h);gr.addColorStop(0,'#e8902a');gr.addColorStop(1,'#8a3a10');g.fillStyle=gr;g.beginPath();g.roundRect(b.x,b.y,b.w,b.h,b.w*.05);g.fill();
   g.fillStyle='#ffd23f';g.fillRect(b.x,b.y+b.h*.88,b.w,b.h*.05);for(let q=0;q<8;q++){const on=(q+Math.floor(t*6)+i)%3===0;g.fillStyle=on?'#fff6c0':'#7a5a20';g.beginPath();g.arc(b.x+b.w*(q+.5)/8,b.y+b.h*.94,Math.max(1.5,b.w*.022),0,TAU);g.fill();}
   g.fillStyle='#120804';g.beginPath();g.roundRect(b.x+a*k,b.y+bb*k,(c-a)*k,(d-bb)*k,6);g.fill();}
// template references (tools/gameshow-templates.mjs): the drawn versions of the slots this game owns
function drawRef(g,W,H,slot){const CB=SS.CR_BODY;
 if(slot.startsWith('cr-body')){const col=SHIRTS[(Number(slot.slice(-1))*3)%SHIRTS.length];CB.frames.forEach((f,i)=>{const p=f.startsWith('run')?'run':f;drawnBody(g,col,i*CB.w+CB.feet[0],CB.feet[1],CB.unit,p,p==='run'?(Number(f.slice(3))-1)*.14:.3);});return;}
 if(slot==='cr-podium'){drawnPodium(g,{x:0,y:0,w:W,h:H},0,0);return;}
 if(slot==='cr-comeondown'){g.font=`900 ${H*.5}px Impact,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.lineWidth=H*.05;g.strokeStyle='#c8102e';g.strokeText('COME ON DOWN!',W/2,H/2,W*.94);g.fillStyle='#ffe23a';g.fillText('COME ON DOWN!',W/2,H/2,W*.94);return;}
 if(slot.startsWith('cr-fan')){const D=SS.CR_FAN,col=SHIRTS[(Number(slot.slice(-1))*7)%SHIRTS.length];D.frames.forEach((f,i)=>drawnBody(g,col,i*D.w+D.feet[0],D.feet[1],D.unit,f,f.endsWith('2')?.18:.05));return;}
 if(slot.startsWith('cr-audience')||slot==='cr-seat')AUD.drawRef(g,slot);}
async function contestantsRow(s){
 const K=createKit(s,{kind:'row',clips:['come-on-down','perfect-bid','buzzer-overbid','buzzer-overbid-2','ding','bell'],song:null});
 const {x,net,me,cpu,board,names,snd,sfx}=K;const R=seededRandom(`${s.seed}:crow`);
 const aud=AUD.createAudience({seed:s.seed,exclude:s.players.map(p=>p.character)});
 // the guests: characters from the game under their own names, one deck per game (nobody comes down twice)
 const dealGuest=guestDeck(s.seed,s.players.map(p=>p.character),'crow:guests');
 // the seats left to right: the two players in the middle, a guest at each end
 // bodies: any of the 12 show bodies (cr-body-1..4 contestants, cr-fan-1..8 audience members), dealt from a shuffled deck so nobody
 // on the row matches; now and then (CAMEO_K) a body from one of our other games instead
 const CAMEO_K=1/50,deck=[];let cameos=null;
 const nextBody=()=>{if(!deck.length){const d=[...Array(12).keys()];for(let i=d.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[d[i],d[j]]=[d[j],d[i]];}deck.push(...d.filter(b=>!seats_?.some(o=>o.body===b)));}
  const body=deck.shift();let cameo=null;if(R()<CAMEO_K){cameos=cameos||aud.cameoList();if(cameos.length)cameo=cameos[Math.floor(R()*cameos.length)];}return {body,cameo};};
 let seats_=null;const newGuest=()=>{const g=dealGuest()||{name:'Guest',short:'Guest',col:'#e86a92',id:null};return {name:g.short,full:g.name,col:g.col,face:g.id,guest:true,...nextBody()};};
 const short=n=>String(n).replace(/\s*\(CPU\)\s*$/i,'');
 const seats=[newGuest(),{p:0,name:short(names[0]),col:'#e63946',...nextBody()},{p:1,name:short(names[1]),col:'#3a86ff',...nextBody()},newGuest()].map(o=>({...o,bid:null,won:[],score:0,in:0,here:false,pose:'stand',poseT:0,mood:'normal',lit:0}));seats_=seats;
 const N=board?2:4,items=[];{const bag=ITEMS.slice();for(let i=0;i<N;i++)items.push(bag.splice(Math.floor(R()*bag.length),1)[0]);}
 snd.prepare(items.map(it=>`It's ${/^(a|an|the) /i.test(it[1])?it[1]:'a '+it[1]}!`));
 items.forEach(it=>SP.prizePhoto(it[0]));
 let scene='row',call=null,item=null,itemT=0,priceShown=false,limit=0,cur=-1,typed='',warn=null,warnT=0,hype=0,keys=[],quick=[],tries=0,actual=null;
 const human=ci=>{const st=seats[ci];return st.p!=null&&(net?st.p===me:!(cpu&&st.p===1));};
 const remote=ci=>{const st=seats[ci];return st.p!=null&&net&&st.p!==me;};
 let resolveBid=null;
 // ---- people
 const CB=SS.CR_BODY;
 // the sheet for body k: 0-3 = cr-body-N (contestants, run frames), 4-11 = cr-fan-N (audience: no run/sad frames)
 function sheetOf(k){if(k<4){const p=SS.picture('cr-body-'+(k+1));return p?{img:p,D:SS.CR_BODY}:null;}const p=SS.picture('cr-fan-'+(k-3));return p?{img:p,D:SS.CR_FAN}:null;}
 // the frame for a pose on a sheet with nf frames: runs on an audience sheet are fists-up cheering steps, sad = stand
 function frameFor(D,nf,pose,t){const fr=D.frames.slice(0,nf),b=Math.floor(t*6)%2,has=f=>fr.includes(f);
  const want=pose==='run'?(has('run1')?'run'+(1+Math.floor(t*11)%4):(b?'cheer1':'cheer2')):pose==='cheer'?(has('cheer')?'cheer':(b?'cheer1':'cheer2')):pose==='clap'?(has('clap')?'clap':(b?'clap1':'clap2')):pose==='sad'&&!has('sad')?'stand':pose;
  const i=fr.indexOf(want);return i>=0?i:0;}
 // a contestant standing with feet on (fx,fy), h tall; pose stand/run/jump/cheer/clap/sad; the face from the player or the guest
 function person(g,o,fx,fy,h,pose,t,dir=1){const u=h/100;let jump=0;if(pose==='jump')jump=Math.abs(Math.sin(t*7))*14*u;
  if(o.cameo){const id=o.p!=null?s.players[o.p]?.character:o.face;aud.person(g,{face:id,cameo:o.cameo,dir,ph:0,beat:1,row:99},fx,fy,h,pose==='stand'?0:1,t,pose);return;}
  fy-=jump;const sh=sheetOf(o.body);let face={x:fx,y:fy-CB.face[1]*h};
  if(sh){const D=sh.D,nf=Math.max(1,Math.round(sh.img.width/D.w)),fi=frameFor(D,nf,pose,t),fw=sh.img.width/nf,k=h/D.unit,sp=(D.spots&&D.spots[fi])||D.spot;
   // the photo bodies face the camera and their shirts carry writing: never mirrored (only the face turns)
   g.save();g.translate(fx,fy);g.drawImage(sh.img,fi*fw,0,fw,sh.img.height,-D.feet[0]*k,-D.feet[1]*k,fw*k,sh.img.height*k);g.restore();
   face={x:fx+(sp[0]-D.feet[0])*k,y:fy+(sp[1]-D.feet[1])*k+h*AUD.FACE_DROP};}
  else{drawnBody(g,o.col,fx,fy,h,pose,t);face={x:fx,y:fy-CB.face[1]*h};}
  // the face (width CB.faceW x h): the player's own, else the guest's character picture, else a drawn head
  const fw=CB.faceW*h,mood=pose==='sad'?'sad':(pose==='jump'||pose==='cheer')?'win':o.mood||'normal';
  if(o.p!=null){drawFace(s,g,o.p,face.x,face.y,fw/.6,mood,dir,.6);return face;}
  const sp=o.face?faceSprite(o.face,headFacts(o.face,mood)?mood:'normal',fw,dir):null;
  if(sp)g.drawImage(sp.cv,face.x+sp.x,face.y+sp.y);else{g.fillStyle='#f1c7a3';g.beginPath();g.ellipse(face.x,face.y,fw*.55,fw*.68,0,0,TAU);g.fill();g.fillStyle='#4a2c18';g.beginPath();g.ellipse(face.x,face.y-fw*.42,fw*.6,fw*.36,0,Math.PI,TAU);g.fill();
   g.fillStyle='#222';g.beginPath();g.arc(face.x-fw*.2,face.y-fw*.05,fw*.07,0,TAU);g.arc(face.x+fw*.2,face.y-fw*.05,fw*.07,0,TAU);g.fill();g.strokeStyle='#222';g.lineWidth=fw*.06;g.beginPath();g.arc(face.x,face.y+fw*.15,fw*.2,.2,Math.PI-.2);g.stroke();}
  return face;}
 // ---- the audience (call-down scene): gameshow/audience.js = rows of show-audience bodies with faces from the game (+ a rare cameo
 // body from another of our games), all cheering with the house
  // ---- layout
 function lay(){const W=K.W,H=K.H,fs=K.fs,top=K.top;const L={W,H,fs,top};
  if(K.wide){L.row={x:W*.02,y:H*.52,w:W*.64,h:H*.46};L.panel={x:W*.68,y:top,w:W*.3,h:H-top-8};L.prize={x:W*.02,y:top,w:W*.64,h:H*.52-top};}
  else{L.prize={x:0,y:top,w:W,h:H*.4-top};L.row={x:W*.02,y:H*.4,w:W*.96,h:H*.3};L.panel={x:W*.06,y:H*.71,w:W*.88,h:H*.28};}
  const sw=L.row.w/4,pw=Math.min(sw*.9,L.row.h*.72/(SS.CR_PODIUM.h/SS.CR_PODIUM.w)),ph=pw*SS.CR_PODIUM.h/SS.CR_PODIUM.w;
  L.bodyH=Math.min(ph*1.8,L.row.h*1.3);
  // podiums at the bottom of the row, but no lower than needed to keep heads under the stage floor (upright phones: no empty floor
  // band between the stage and the row; the bids panel moves up under the podiums)
  const py=Math.min(L.row.y+L.row.h-ph-4,L.row.y+L.bodyH*.44);
  L.pod=seats.map((o,i)=>({x:L.row.x+sw*(i+.5)-pw/2,y:py,w:pw,h:ph}));
  if(!K.wide){const y0=py+ph+K.fs*.6;L.panel={x:L.panel.x,y:y0,w:L.panel.w,h:Math.min(H-y0-8,L.panel.h+(L.panel.y-y0))};}
  // the prize turntable, the host and the model stand on the stage floor: the studio picture is laid so its floor line is at the
  // turntable's foot (owner, Nov 25: "not floating and on the floor")
  L.stageY=L.prize.y+L.prize.h;K.floorY=L.stageY-L.prize.h*.05;return L;}
 // the contestants stand behind their podiums with the podium top at the waist, like the show (owner, Nov 25): feet near the podium foot
 const feetY=(b,bh)=>b.y+Math.min(b.h*.96,bh*.54);
 // ---- podium: the picture (bid printed in its window) or a drawn one; the bid in orange LED figures
 function podium(g,b,o,i,t){const PG=SS.CR_PODIUM,pic=SS.picture('cr-podium'),k=b.w/PG.w,[a,bb,c,d]=PG.bid;
  if(o.lit>0){g.save();g.globalAlpha=Math.min(1,o.lit)*(.6+.4*Math.sin(t*14));g.fillStyle='#fff3a0';g.beginPath();g.roundRect(b.x-6,b.y-6,b.w+12,b.h+12,12);g.fill();g.restore();}
  if(pic)g.drawImage(pic,b.x,b.y,b.w,b.h);
  else drawnPodium(g,b,t,i);
  const fs=(d-bb)*k*.72,cx=b.x+(a+c)/2*k,cy=b.y+(bb+d)/2*k;g.save();g.font=`900 ${fs}px "Courier New",monospace`;g.textAlign='center';g.textBaseline='middle';
  const str=o.bid==null?(cur===i?'_'.repeat(1+Math.floor(t*2)%3):''):money(o.bid).slice(0,7);g.fillStyle='rgba(255,120,20,.25)';g.fillText('8888'.slice(0,Math.max(4,str.length)),cx,cy);
  g.shadowColor='#ff7a1a';g.shadowBlur=fs*.35;g.fillStyle=o.over?'#ff3a2a':'#ffb03a';g.fillText(str,cx,cy);g.restore();
  // the name under the window, once they've been called down to it
  if(o.here)txt(g,o.name.toUpperCase(),cx,b.y+b.h*.62,Math.min(b.w*.15,K.fs*1.05),cur===i?'#ffe23a':'#fff',{font:'"SC Bangers",Impact,sans-serif',w:400,max:b.w*.9});}
 // ---- the prize on the turntable (+ the actual retail price card once it's shown)
 function drawPrize(g,P,t){if(!item)return;const a=ease(itemT*1.6),pk=SS.PLATFORM_GEOM,plat=SS.picture('clock-platform'),pw=Math.min(P.w*.46,P.h*1.25),ph=pw*pk.h/pk.w,cx=P.x+P.w/2,by=P.y+P.h-4;
  ST.floorShadow(g,cx,by-ph*.06,pw*.95,.4*a);g.save();g.globalAlpha=a;g.translate(cx,by-ph+(1-a)*P.h*.3);const k=pw/pk.w;
  if(plat)g.drawImage(plat,-pw/2,0,pw,ph);else{g.fillStyle='#c8c8d8';g.beginPath();g.ellipse(0,ph*.68,pw*.48,ph*.16,0,0,TAU);g.fill();g.fillStyle='#8a8aa0';g.fillRect(-pw*.48,ph*.68,pw*.96,ph*.18);}
  const ty=pk.top[1]*k,ph2=SP.prizePhoto(item[0]),bh=Math.min(P.h*.62,pw*.75);
  if(ph2){const kk=Math.min(pw*.8/ph2.width,bh/ph2.height),w=ph2.width*kk,h=ph2.height*kk;g.fillStyle='#fff';g.beginPath();g.roundRect(-w/2-8,ty-h-16,w+16,h+16,12);g.fill();g.drawImage(ph2,-w/2,ty-h-8,w,h);}
  else{g.font=`${bh*.7}px sans-serif`;g.textAlign='center';g.textBaseline='bottom';g.fillText(item[3],0,ty+bh*.08);}
  g.restore();
  txt(g,item[1],cx,P.y+P.h*.12+K.fs*.6,K.fs*1.15,'#fff',{max:P.w*.9});
  if(priceShown){const w=Math.min(P.w*.6,K.fs*16),h=K.fs*3.2,y0=P.y+P.h*.12+K.fs*1.6;g.fillStyle='rgba(20,6,46,.9)';g.beginPath();g.roundRect(cx-w/2,y0,w,h,10);g.fill();g.strokeStyle='#ffd75a';g.lineWidth=3;g.stroke();
   txt(g,'ACTUAL RETAIL PRICE',cx,y0+h*.27,K.fs*.75,'#ffd75a',{max:w*.9});txt(g,money(item[2]),cx,y0+h*.66,K.fs*1.7,'#7dff5a',{font:'"SC Bangers",Impact,sans-serif',w:400});}}
 // ---- the side / bottom panel: the bids so far, or the keypad while you bid
 function drawPanel(g,P,t){g.fillStyle='rgba(20,6,46,.78)';g.beginPath();g.roundRect(P.x,P.y,P.w,P.h,12);g.fill();keys=[];quick=[];const fs=K.fs;
  if(cur>=0&&human(cur)&&resolveBid){const o=seats[cur],hdr=fs*2.2;txt(g,`${o.name.toUpperCase()}, YOUR BID${limit?' (under '+money(limit)+')':''}`,P.x+P.w/2,P.y+hdr*.32,fs*.8,'#ffe23a',{max:P.w*.92});
   const dh=fs*2.1;g.fillStyle='#120804';g.beginPath();g.roundRect(P.x+P.w*.08,P.y+hdr*.62,P.w*.84,dh,8);g.fill();
   g.save();g.font=`900 ${dh*.7}px "Courier New",monospace`;g.textAlign='center';g.textBaseline='middle';g.shadowColor='#ff7a1a';g.shadowBlur=8;g.fillStyle='#ffb03a';g.fillText(typed?'$'+Number(typed).toLocaleString('en-US'):'$',P.x+P.w/2,P.y+hdr*.62+dh/2);g.restore();
   const ky=P.y+hdr*.62+dh+6,kh=P.y+P.h-ky-6,side=P.w>kh*1.5;
   // wide panels: digits left, quick buttons right; else quick buttons as a 5th row
   const gw=side?P.w*.66:P.w*.92,gx=P.x+(side?P.w*.03:P.w*.04),rows=side?4:5,cw=gw/3,ch=kh/rows;const labels=['1','2','3','4','5','6','7','8','9','⌫','0','BID'];
   labels.forEach((l,j)=>{const b={x:gx+(j%3)*cw+2,y:ky+Math.floor(j/3)*ch+2,w:cw-4,h:ch-4,l};keys.push(b);K.button(g,b,l,()=>press(l),{col:l==='BID'?'#1a9a3a':l==='⌫'?'#7a2a2a':'#c8102e',size:Math.min(ch*.5,fs*1.4)});});
   const hi=Math.max(0,...seats.map(o=>o.bid||0)),qs=[['$1',1]];if(hi&&(!limit||hi+1<limit))qs.push([`+$1 (${money(hi+1)})`,hi+1]);
   qs.forEach(([l,v],j)=>{const b=side?{x:P.x+P.w*.71,y:ky+j*ch+2,w:P.w*.26,h:ch-4,l}:{x:gx+j*gw/2+2,y:ky+4*ch+2,w:gw/2-4,h:ch-4,l};quick.push({...b,v});K.button(g,b,l,()=>{typed=String(v);press('BID');},{col:'#2a6ad0',size:Math.min(ch*.36,fs)});});
   if(warn&&warnT>0)txt(g,warn,P.x+P.w/2,P.y+P.h-fs*.8,fs*.85,'#ff6a5a',{max:P.w*.92});return;}
  // the bids board
  txt(g,limit?`REBID: UNDER ${money(limit)}`:'THE BIDS',P.x+P.w/2,P.y+fs*1.2,fs*1.1,'#ffd75a',{font:'"SC Bangers",Impact,sans-serif',w:400});
  const lh=Math.min(fs*2.2,(P.h-fs*3)/6);seats.forEach((o,i)=>{const y=P.y+fs*2.6+i*lh+lh/2;txt(g,o.name.slice(0,10),P.x+fs*.8,y,fs*.9,cur===i?'#ffe23a':'#fff',{align:'left',max:P.w*.5});
   txt(g,o.bid==null?'—':money(o.bid),P.x+P.w-fs*.8,y,fs*1.05,o.over?'#ff6a5a':'#ffb03a',{align:'right'});});
  if(seats.some(o=>o.p!=null)){const y=P.y+fs*2.6+4.4*lh;g.fillStyle='rgba(255,255,255,.15)';g.fillRect(P.x+fs*.6,y-lh*.5,P.w-fs*1.2,1);
   seats.filter(o=>o.p!=null).forEach((o,j)=>txt(g,`${o.name.slice(0,9)}: ${money(o.score)}`,P.x+P.w/2,y+lh*.25+j*lh*.62,fs*.8,'#7dff5a',{max:P.w*.92}));}}
 function press(l){if(!resolveBid)return;snd.hush();if(l==='⌫'){typed=typed.slice(0,-1);return;}if(l==='BID'){const v=Number(typed);const err=bad(v);if(err){warn=err;warnT=2.2;snd.sfx.wrong?.();return;}const r=resolveBid;resolveBid=null;r(v);return;}
  if(typed.length<5&&!(typed===''&&l==='0'))typed+=l;}
 function bad(v){if(!v||v<1)return'Type a bid first';if(limit&&v>=limit)return`It has to be under ${money(limit)}`;if(seats.some((o,i)=>i!==cur&&o.bid===v))return'That bid is taken!';return null;}
 // ---- drawing
 K.frame(dt=>{const g=K.begin(),L=lay(),t=K.t;hype=Math.max(0,hype-dt*.25);warnT-=dt;if(item)itemT+=dt;
  seats.forEach(o=>{if(o.here)o.in=Math.min(1,o.in+dt*1.6);o.lit=Math.max(0,o.lit-dt*.5);o.poseT-=dt;if(o.poseT<=0&&o.pose!=='stand'){o.pose='stand';}});
  if(scene==='crowd'&&call){const c=call;c.t+=dt;aud.draw(g,L.W,L.H,t,{hype:Math.max(hype,c.t>.3?1:0),skipCalled:true,dpr:s.dpr||1});
   // the called contestant: gets up cheering at their seat, steps into the red aisle and runs down the stairs toward the camera
   const st=c.t,at=aud.calledAt(L.W,L.H,st),xx=at.x,yy=at.y,hh=at.h;
   // the house darkens round a spotlight that follows the contestant down the aisle
   g.save();const sr=hh*.75,sx=xx,sy=yy-hh*.55,vg=g.createRadialGradient(sx,sy,sr*.55,sx,sy,sr*1.6);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.5)');g.fillStyle=vg;g.fillRect(0,0,L.W,L.H);
   g.globalCompositeOperation='lighter';g.globalAlpha=.22+.08*Math.sin(t*5);const sg=g.createRadialGradient(sx,sy,sr*.1,sx,sy,sr);sg.addColorStop(0,'#fff8c0');sg.addColorStop(1,'rgba(255,248,192,0)');g.fillStyle=sg;g.fillRect(0,0,L.W,L.H);g.restore();
   person(g,c.o,xx,yy,hh,at.pose,st,1);
   // the name in lights + COME ON DOWN!
   const ny=L.top+L.H*.08,big=Math.min(L.W*.16,L.H*.13),pop=ease(st*2.5);g.save();g.translate(L.W/2,ny+big*.5);g.scale(pop,pop);
   txt(g,(c.o.full||c.o.name).toUpperCase()+'!',0,0,big*Math.min(1,7/Math.max(4,(c.o.full||c.o.name).length)),'#ffe23a',{font:'"SC Bangers",Impact,sans-serif',w:400,max:L.W*.92});g.restore();
   const cod=SS.picture('cr-comeondown'),cw=Math.min(L.W*.8,L.H*1.2);if(st>.5){const a=ease((st-.5)*3);g.save();g.globalAlpha=a;if(cod){const ch=cw*cod.height/cod.width;g.drawImage(cod,L.W/2-cw/2,ny+big*1.15,cw,ch);}
    else txt(g,'COME ON DOWN!',L.W/2,ny+big*1.55,big*.62,'#fff',{font:'"SC Bangers",Impact,sans-serif',w:400,max:L.W*.9});g.restore();}
   K.overlay(g,null,{noCast:true});return;}
  // the row: prize up top, the four podiums with the contestants behind them, the panel
  drawPrize(g,L.prize,t);
  seats.forEach((o,i)=>{if(!o.here)return;const b=L.pod[i],slide=(1-ease(o.in))*(i<2?-1:1)*K.W*.6,fx=b.x+b.w/2+slide,fy=feetY(b,L.bodyH);person(g,o,fx,fy,L.bodyH,o.in<.98?'run':o.pose,t+i,i<2?1:-1);});
  seats.forEach((o,i)=>podium(g,L.pod[i],o,i,t));
  drawPanel(g,L.panel,t);
  // the host and the model: on the stage floor either side of the turntable, as tall as the contestants (owner, Nov 25)
  K.spots={host:{x:L.prize.x+L.bodyH*.22,y:L.stageY,h:L.bodyH*1.02,side:-1},model:{x:L.prize.x+L.prize.w-L.bodyH*.2,y:L.stageY,h:L.bodyH,side:1}};
  K.overlay(g,null);});
 // ---- the flow
 let cueUntil=0;
 async function callDown(i){const o=seats[i];o.in=0;o.here=false;scene='crowd';call={o,t:0};hype=1;K.mode='play';
  if(performance.now()>cueUntil){sfx.comeOn();cueUntil=performance.now()+(snd.loaded('come-on-down')?17000:0);}snd.voice('say-come-on-down',{at:.2,alt:o.p!=null&&TV.NAMED.includes(o.name)?'v-down-'+o.name.toLowerCase():null});sfx.cheer(3.2,.22);sfx.applause(3.4,.9);await K.wait(3300);
  scene='row';call=null;o.in=0;o.here=true;o.pose='jump';o.poseT=1.4;sfx.applause(1.6,.6);await K.wait(900);}
 async function getBid(i,tr){const o=seats[i];cur=i;typed='';warn=null;
  if(o.p==null||(!human(i)&&!remote(i))){K.say(`${o.name}?`,1400);await K.sleep(900+R()*900);
   const sk=o.p!=null?K.skill():.35+((i*7+tr*3)%5)*.08,rr=seededRandom(`${s.seed}:crow:bid:${itemIdx}:${tr}:${i}`);return cpuBid(item[2],seats.map(q=>q.bid),limit,sk,rr,seats.filter(q=>q.bid==null).length===1);}
  if(remote(i)){K.say(`${o.name}, what's your bid?`,2400);K.mode='input';const m=await K.recv();K.mode='play';return m&&m.b?m.b:1;}
  K.say(`${o.name}, what's your bid?`,2400);K.mode='input';const v=await new Promise(r=>{resolveBid=r;});K.mode='play';if(net)net.send({b:v});return v;}
 let itemIdx=0;
 async function playItem(n,startSeat){item=items[n];itemIdx=n;itemT=0;priceShown=false;limit=0;tries=0;seats.forEach(o=>{o.bid=null;o.over=false;});
  K.say(n===0?'Here\'s the first item up for bids!':'Here\'s the next item up for bids!',2200);K.cast.present(4,'present');sfx.applause(1.4,.5);await K.wait(1800);
  K.say(`It's ${/^(a|an|the) /i.test(item[1])?item[1]:'a '+item[1]}!`,2200);await K.wait(2000);
  for(;;){const order=[0,1,2,3].map(k=>(startSeat+k)%4);for(const i of order){if(!s.alive)return null;const v=await getBid(i,tries);seats[i].bid=v;sfx.click?.();K.say(`${seats[i].name}: ${money(v)}`,1200);if(seats[i].p==null||!human(i))await K.wait(500);}
   cur=-1;K.say('The actual retail price is...',1800);snd.voice('say-actual-retail-price');await K.sleep(1500);priceShown=true;actual=item[2];
   const ok=seats.map((o,i)=>[o.bid,i]).filter(([b])=>b<=actual).sort((a,b)=>b[0]-a[0]);seats.forEach(o=>{o.over=o.bid>actual;});
   if(!ok.length){(snd.clip('buzzer-overbid')||sfx.over());K.show('EVERYBODY\'S OVER!','Bid again, under '+money(Math.min(...seats.map(o=>o.bid))),2.4,'#ff6a5a');snd.voice('v-row-over',{at:.9});seats.forEach(o=>{o.pose='sad';o.poseT=1.6;});await K.wait(2600);
    limit=Math.min(...seats.map(o=>o.bid));priceShown=false;tries++;seats.forEach(o=>{o.bid=null;o.over=false;});continue;}
   const [wb,wi]=ok[0],o=seats[wi],perfect=wb===actual,gain=actual+(perfect?500:0);o.lit=3;o.pose='jump';o.poseT=3;hype=1;
   if(perfect){K.show('PERFECT BID!',`${o.name.toUpperCase()} WINS ${money(actual)} + $500!`,3,'#7dff5a');if(!snd.clip('perfect-bid'))sfx.fanfare();snd.voice('v-row-perfect',{at:1.4});}
   else{K.show(`${o.name.toUpperCase()} WINS!`,`${item[1]} · ${money(actual)}`,2.6,'#ffe23a');sfx.ding();}
   sfx.cheer(2.4,.2);o.score+=gain;o.won.push(item[1]);if(o.p!=null)s.react?.(o.p,'win');await K.wait(3000);return wi;}}
 // the show
 s.debug={get scene(){return scene;},get seats(){return seats;},get cur(){return cur;},get keys(){return keys;},get quick(){return quick;},get item(){return item;},get limit(){return limit;},get mode(){return K.mode;},get audience(){return aud;},
  bid(v){typed=String(v);press('BID');},get waiting(){return !!resolveBid;},set hurry(v){K.hurry=v;},
  // online test bot: bids for this phone's player when asked, hurries the rest
  bot:net?()=>{if(resolveBid){s.debug.autoBid();return 'bid';}K.hurry=true;return '';}:null,
  autoBid(){if(!resolveBid||!item)return;let v=Math.max(1,Math.round(item[2]*(.7+Math.random()*.5)));if(limit)v=Math.min(v,limit-1);while(bad(v)&&v>1)v--;if(bad(v))v=limit?1:item[2];typed=String(v);press('BID');}};
 if(!s.fromMenu&&!await s.pass(0,'Contestants\' Row: four contestants, one bid each. Closest to the actual retail price without going over wins!','Come on down!'))return;
 await SS.ready(['cr-audience','cr-audience-tall','cr-audience-fold','stage-row','stage-row-tall','stage-row-fold','stage-wheel','stage-wheel-tall','stage-wheel-fold','cr-podium','cr-body-1','cr-body-2','cr-body-3','cr-body-4',...[1,2,3,4,5,6,7,8].map(n=>'cr-fan-'+n),'cr-comeondown','clock-platform','curtain'],5000);if(!s.alive)return;
 if(!s.fromMenu)snd.title(true);K.mode='intro';K.introT=0;K.show('CONTESTANTS\' ROW!','Four bidders, one bid each',2.4,'#ffe23a');snd.voice('say-lets-play',{at:.6,alt:'v-lets-row'});await K.wait(2600);snd.title(false);
 // the first four, called down one at a time
 await aud.ready(K.W,K.H,3000);if(!s.alive)return;
 for(const i of [0,1,2,3]){if(!s.alive)return;await callDown(i);}
 let start=0;for(let n=0;n<N;n++){if(!s.alive)return;const wi=await playItem(n,start);if(wi==null)return;start=(start+1)%4;
  // a guest winner goes up on stage; the next guest is called down to that podium and bids first
  if(seats[wi].guest&&n<N-1){const o=seats[wi];K.say(`${o.name}, come on up here!`,1800);await K.wait(1600);{const old=seats[wi].body;seats[wi]={...newGuest(),bid:null,won:[],score:0,in:0,here:false,pose:'stand',poseT:0,mood:'normal',lit:0};deck.push(old);}await callDown(wi);start=wi;}
  item=null;}
 if(!s.alive)return;K.mode='over';cur=-1;const a=seats.find(o=>o.p===0).score,b=seats.find(o=>o.p===1).score,w=a===b?-1:a>b?0:1;
 if(w>=0){K.show(`${names[w].toUpperCase()} WINS!`,money([a,b][w])+' in prizes',3,'#ffe23a');sfx.winner();s.react?.(w,'win');}else K.show(a?'IT\'S A TIE!':'NO PRIZES TODAY','Both '+money(a),3,'#fff');
 await K.wait(3000);s.finish([a,b],`${names[0]} ${money(a)} · ${names[1]} ${money(b)}`);}
Object.assign(exports,{contestantsRow,cpuBid,drawRef});
