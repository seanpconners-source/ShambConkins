// THE SHOWCASE (the end of THE EPISODE, tpir/episode.js; owner, Nov 26: exactly like the real show). The two Showcase Showdown winners
// stand at their podiums. The one who has won more so far chooses: bid on the first showcase or pass it to the other. The big doors
// slide open on the turntable and the announcer presents each prize (a trip, furniture... usually a car or a boat last: "A NEW CAR!"),
// "and it can all be yours... if the price is right!"; the contestant gives a bid. Then the second showcase for the other one. The
// actual retail prices: closest without going over wins their showcase, within $250 wins BOTH, both over = nobody wins.
// Runs as a segment of the episode: s.episode.sc = {who:[A,B], top:0|1}, A/B = {name, p (player seat) | id (guest character),
// body, won (so far), cpu (the game bids for them), human (this phone bids)}. Out: s.episode.out = {won:[a,b], winner, bids, arps}.
// Pictures: stage-showcase(-tall/-fold) with the doors painted in (SS.SC_DOOR = their opening), turntable, showcase-podium.
const ST=require("src/engines/gameshow/stage.js");
const SS=require("src/data/showSprites.js");
const SP=require("src/data/showPrizes.js");
const TV=require("src/data/tpirVoice.js");
const SC=require("src/data/tpirScript.js");
const P=require("src/engines/tpir/people.js");
const {createKit,txt,money}=require("src/engines/gameshow/pricingKit.js");
const {seededRandom,clamp}=require("src/utils.js");
const {vibrate}=require("src/audio.js");
const TAU=Math.PI*2,ease=v=>1-Math.pow(1-clamp(v,0,1),3);
const WITHIN=250;
async function showcase(s){
 const ep=s.episode||{},sc=ep.sc;const K=createKit(s,{kind:'showcase',clips:['showcase-win','ding','bell','buzzer-wrong','losing-horn']});
 const {x,snd,sfx}=K,R=seededRandom(`${s.seed}:showcase`);
 const who=sc.who.map((w,i)=>({...w,bid:null,arp:null,mood:'normal',pose:'stand',diff:null,lit:0}));
 // two showcases: the dearer one second (usually the one with the car), never the same theme twice in a row of episodes
 const pool=SP.SHOWCASES.slice();const a=pool.splice(Math.floor(R()*pool.length),1)[0],b=pool[Math.floor(R()*pool.length)];const cases=[a,b].sort((p,q)=>p.total-q.total);
 snd.prepare([...cases.map(c=>c.intro),...cases.flatMap(c=>c.items.map(it=>`It's ${TV.art(it[1])}!`)),'A NEW CAR!','And it can all be yours... if the price is right!']);
 cases.forEach(c=>c.items.forEach(it=>SP.prizePhoto(it[0])));
 snd.prepare([...cases.flatMap(c=>[...(SC.SHOWCASE_TIES[c.id]||[]),...c.items.map(it=>SC.TRIP_DESC[it[0]]).filter(Boolean)]),...SC.CAR_DESC,...SC.BOB_COMMENTS,...who.map(o=>`${o.name}, here's your showcase!`)]);who.forEach(o=>snd.wantName(o.name));
 snd.prepare(['It\'s time for the Showcase!','Let\'s take a look at the first showcase!',...who.map(o=>`${o.name}, you were our top winner on the wheel, so you decide. Do you want to bid on this showcase, or pass it?`),'You\'ll pass it.','You\'ll bid on it.','Here\'s your showcase!','Here\'s the second showcase!','Take your time, and give me your bid.','Let\'s find out the actual retail prices of these showcases.','The actual retail price of your showcase is...','Oh, you overbid.','You were closer. You win your showcase!','You were within two hundred fifty dollars! You win both showcases!','Oh, you both overbid! Nobody wins a showcase today.']);
 let door=0,doorTo=0,choosing=false,bidOn={},cur=null,curT=0,shown=-1,cap=null,typed='',bidder=-1,resolveBid=null,choose=null,warn=null,warnT=0,reveal=-1,keys=[];
 // the announcer is off camera: his lines play over a lower-third caption
 const ann=(text,ms=2600)=>{cap={text,t:Math.max(ms/1000,.5)};if(snd.speak(text))cap.t=Math.max(cap.t,snd.talking()/1000+.3);};
 // ---- layout
 function lay(){const W=K.W,H=K.H,fs=K.fs,F=ST.stageFit(W,H,'showcase',K.floorY),sh=require("src/bgShape.js").shape(W,H),d=SS.SC_DOOR[sh]||SS.SC_DOOR.wide;let door;
  if(F.pic){const pw=F.pic.width*F.k,ph=F.pic.height*F.k;door={x:F.ox+d[0]*pw,y:F.oy+d[1]*ph,w:(d[2]-d[0])*pw,h:(d[3]-d[1])*ph};}else door={x:W*.16,y:H*.1,w:W*.68,h:H*.55};
  const pod=SS.SC_PODIUM,ratio=pod.h/pod.w;let pods;
  if(K.wide){const pw=Math.min(W*.15,H*.36/ratio),ph=pw*ratio;pods=[0,1].map(i=>({x:W*.985-pw*(2-i)-i*pw*.08,y:H-ph-4,w:pw,h:ph}));}
  else{const pw=Math.min(W*.34,H*.24/ratio),ph=pw*ratio;pods=[0,1].map(i=>({x:W/2+(i?pw*.12:-pw*1.12),y:H-ph-4,w:pw,h:ph}));}
  return {W,H,fs,door,pods,floor:F.floor};}
 // ---- drawing
 function drawDoors(g,L,t){const D=L.door,F=ST.stageFit(L.W,L.H,'showcase',K.floorY),open=ease(door);if(open<=.001)return;
  g.save();g.beginPath();g.roundRect(D.x,D.y,D.w,D.h,[D.w*.04,D.w*.04,0,0]);g.clip();
  // backstage behind the doors: dark, a spotlight on the turntable
  const bg=g.createLinearGradient(0,D.y,0,D.y+D.h);bg.addColorStop(0,'#1a0630');bg.addColorStop(1,'#4a0a3a');g.fillStyle=bg;g.fillRect(D.x,D.y,D.w,D.h);
  const sp=g.createRadialGradient(D.x+D.w/2,D.y+D.h*.55,D.h*.05,D.x+D.w/2,D.y+D.h*.6,D.h*.75);sp.addColorStop(0,'rgba(255,248,210,.55)');sp.addColorStop(1,'rgba(255,248,210,0)');g.fillStyle=sp;g.fillRect(D.x,D.y,D.w,D.h);
  // bulbs round the back wall
  for(let i=0;i<18;i++){const on=(i+Math.floor(t*8))%3===0;g.fillStyle=on?'#fff6c0':'#6a4a20';g.beginPath();g.arc(D.x+D.w*(i+.5)/18,D.y+D.h*.06,Math.max(2,D.w*.008),0,TAU);g.fill();}
  // the turntable with the prize on it
  const T=SS.TURNTABLE,tt=SS.picture('turntable'),tw=Math.min(D.w*.78,D.h*1.5),k=tw/T.w,th=T.h*k,tx=D.x+D.w/2-tw/2,ty=D.y+D.h-th*.92;
  if(tt)g.drawImage(tt,tx,ty,tw,th);else{g.fillStyle='#d9d4c8';g.beginPath();g.ellipse(D.x+D.w/2,ty+T.top[1]*k,T.top[2]*k,T.top[3]*k,0,0,TAU);g.fill();g.fillStyle='#e8601a';g.fillRect(tx+tw*.05,ty+T.top[1]*k,tw*.9,th*.35);}
  // the prize stands ON the turntable (owner, Nov 27: the car floated over it and was small): trimmed to its visible pixels, feet on the
  // middle of the top, as big as the doorway allows; its name on a plate low on the back wall (the announcer's caption is a lower third)
  if(cur){const top={x:D.x+D.w/2,y:ty+T.top[1]*k},slide=ease(curT*1.8),ph=SP.prizePhoto(cur[0]),car=cur[4]==='car',xo=(1-slide)*D.w*.6;
   const foot=top.y+T.top[3]*k*.5,bh=Math.max(20,Math.min(foot-D.y-L.fs*2.6,D.h*(car?.74:.64))),bw=tw*(car?1.04:.8);
   g.save();g.globalAlpha=slide;g.translate(xo,0);ST.drawPrizeOn(g,ph,top.x,foot,bw,bh,{emoji:cur[3]});g.restore();
   const nf=Math.min(L.fs*1.1,D.w*.055);g.save();g.globalAlpha=slide;g.fillStyle='rgba(20,6,46,.78)';const nw=Math.min(D.w*.94,nf*(String(cur[1]).length*.62+3));g.beginPath();g.roundRect(D.x+D.w/2-nw/2,D.y+nf*.5,nw,nf*1.7,nf*.4);g.fill();g.restore();
   txt(g,cur[1],D.x+D.w/2,D.y+nf*1.35,nf,'#fff',{max:D.w*.9});}
  // the two door halves (the stage picture's own doors) slide apart
  if(F.pic){const pw=F.pic.width*F.k,ph=F.pic.height*F.k,ix=(D.x-F.ox)/F.k,iy=(D.y-F.oy)/F.k,iw=D.w/F.k,ih=D.h/F.k,off=open*D.w*.5;
   g.drawImage(F.pic,ix,iy,iw/2,ih,D.x-off,D.y,D.w/2,D.h);g.drawImage(F.pic,ix+iw/2,iy,iw/2,ih,D.x+D.w/2+off,D.y,D.w/2,D.h);}
  g.restore();}
 function drawPodium(g,b,o,i,t){const PG=SS.SC_PODIUM,pic=SS.picture('showcase-podium'),k=b.w/PG.w;
  // the contestant behind the podium: body + face, the podium top at the waist
  const h=b.h*1.55;P.contestant(g,s,o,b.x+b.w/2,b.y+b.h*.62,h,{body:o.body||i,pose:o.pose,mood:o.mood,dir:i?-1:1,t});
  if(o.lit>0){g.save();g.globalAlpha=Math.min(1,o.lit)*(.55+.45*Math.sin(t*14));g.fillStyle='#fff3a0';g.beginPath();g.roundRect(b.x-6,b.y-6,b.w+12,b.h+12,12);g.fill();g.restore();}
  if(pic)g.drawImage(pic,b.x,b.y,b.w,b.h);else{const gr=g.createLinearGradient(0,b.y,0,b.y+b.h);gr.addColorStop(0,'#f0a020');gr.addColorStop(1,'#a05010');g.fillStyle=gr;g.beginPath();g.roundRect(b.x,b.y,b.w,b.h,b.w*.08);g.fill();
   g.fillStyle='#000';g.fillRect(b.x+PG.bid[0]*k,b.y+PG.bid[1]*k,PG.bid[2]*k,PG.bid[3]*k);g.fillStyle='#e8501a';g.fillRect(b.x+PG.name[0]*k,b.y+PG.name[1]*k,PG.name[2]*k,PG.name[3]*k);}
  const [bx,by,bw,bh]=PG.bid,fs=bh*k*.62;g.save();g.font=`900 ${fs}px "Courier New",monospace`;g.textAlign='center';g.textBaseline='middle';const str=o.bid==null?(bidder===i&&!o.human?'· · ·':''):money(o.bid);
  g.shadowColor='#ff7a1a';g.shadowBlur=fs*.35;g.fillStyle=o.diff!=null&&o.diff<0?'#ff3a2a':'#ffb03a';g.fillText(str,b.x+(bx+bw/2)*k,b.y+(by+bh/2)*k,bw*k*.92);g.restore();
  const [nx,ny,nw,nh]=PG.name;txt(g,String(o.name).toUpperCase(),b.x+(nx+nw/2)*k,b.y+(ny+nh/2)*k,nh*k*.55,'#fff',{font:'"SC Bangers",Impact,sans-serif',w:400,max:nw*k*.9});
  // after the reveal: the actual retail price + how far off (or OVERBID) above the podium
  if(o.arp!=null){const y0=b.y-b.h*.95,w=b.w*1.05;g.fillStyle='rgba(20,6,46,.9)';g.beginPath();g.roundRect(b.x+b.w/2-w/2,y0,w,b.h*.42,10);g.fill();g.strokeStyle='#ffd75a';g.lineWidth=2;g.stroke();
   txt(g,'ACTUAL RETAIL PRICE',b.x+b.w/2,y0+b.h*.08,b.h*.05,'#ffd75a',{max:w*.9});txt(g,money(o.arp),b.x+b.w/2,y0+b.h*.2,b.h*.1,'#7dff5a',{font:'"SC Bangers",Impact,sans-serif',w:400,max:w*.9});
   if(o.diff!=null)txt(g,o.diff<0?'OVERBID':`${money(o.diff)} AWAY`,b.x+b.w/2,y0+b.h*.33,b.h*.07,o.diff<0?'#ff6a5a':'#fff',{max:w*.9});}}
 function card(g,L){const fs=L.fs,p=L.pods[0],top=K.top+4;let r;
  if(K.wide){const x1=p.x-10,w=Math.min(x1-8,fs*24);r={x:Math.max(8,x1-w),y:top,w,h:L.H-top-8};}
  else{const w=Math.min(L.W-16,fs*24),y1=p.y-8;r={x:L.W/2-w/2,y:top,w,h:Math.max(fs*14,y1-top)};}
  g.fillStyle='rgba(20,6,46,.94)';g.beginPath();g.roundRect(r.x,r.y,r.w,r.h,14);g.fill();g.strokeStyle='#ffd75a';g.lineWidth=3;g.stroke();return r;}
 // the showcase's prizes, listed on the bid / choice card (owner, Nov 27): small picture + name, two columns when there's room
 function itemList(g,C,y,n,maxH){const fs=L0.fs,its=cases[n].items,cols=C.w>fs*17&&its.length>3?2:1,rows=Math.ceil(its.length/cols),lh=Math.min(fs*1.5,maxH/rows),cw=(C.w-fs)/cols;
  its.forEach((it,j)=>{const cx=C.x+fs*.5+(j%cols)*cw,cy=y+Math.floor(j/cols)*lh+lh/2,ph=SP.prizePhoto(it[0]),ps=lh*.86;
   if(ph)ST.drawPrizeOn(g,ph,cx+ps/2,cy+ps/2,ps,ps,{emoji:it[3]});else txt(g,it[3],cx+ps/2,cy,ps*.7,'#fff');
   g.save();g.font=`700 ${Math.min(fs*.78,lh*.55)}px "SC Nunito",sans-serif`;g.textAlign='left';g.textBaseline='middle';g.fillStyle=it[4]==='car'?'#ffe23a':'#fff';
   let t=String(it[1]);const mw=cw-ps-fs*.6;while(t.length>4&&g.measureText(t).width>mw)t=t.slice(0,-2)+'…';if(t.endsWith('……'))t=t.slice(0,-1);g.fillText(t,cx+ps+fs*.3,cy);g.restore();});
  return rows*lh;}
 let L0={fs:14};
 function drawKeypad(g,L){const o=who[bidder],C=card(g,L),fs=L.fs;keys=[];let y=C.y+fs*1.3;txt(g,`${String(o.name).toUpperCase()}, YOUR BID`,C.x+C.w/2,y,fs*1.1,'#ffe23a',{max:C.w*.9});y+=fs*1.1;
  const dh=Math.min(fs*2.4,C.h*.13),keyMin=Math.max(fs*1.7,C.h*.07)*4;y+=itemList(g,C,y,bidOn[bidder],Math.max(fs*2,C.h-(y-C.y)-dh-keyMin-fs*1.4))+fs*.4;
  g.fillStyle='#120804';g.beginPath();g.roundRect(C.x+C.w*.08,y,C.w*.84,dh,8);g.fill();g.save();g.font=`900 ${dh*.68}px "Courier New",monospace`;g.textAlign='center';g.textBaseline='middle';g.shadowColor='#ff7a1a';g.shadowBlur=8;g.fillStyle='#ffb03a';
  g.fillText(typed?'$'+Number(typed).toLocaleString('en-US'):'$',C.x+C.w/2,y+dh/2);g.restore();
  const ky=y+dh+6,kh=C.y+C.h-ky-6,cw=C.w*.92/3,ch=kh/4;['1','2','3','4','5','6','7','8','9','⌫','0','BID'].forEach((l,j)=>{const b={x:C.x+C.w*.04+(j%3)*cw+3,y:ky+Math.floor(j/3)*ch+3,w:cw-6,h:ch-6};keys.push({...b,l});
   K.button(g,b,l,()=>press(l),{col:l==='BID'?'#1a9a3a':l==='⌫'?'#7a2a2a':'#c8102e',size:Math.min(ch*.5,fs*1.4)});});
  if(warn&&warnT>0)txt(g,warn,C.x+C.w/2,y+dh+fs*.1,fs*.9,'#ff6a5a',{max:C.w});}
 function drawChoice(g,L){const C=card(g,L),fs=L.fs,o=who[sc.top];let y=C.y+fs*1.4;txt(g,`${String(o.name).toUpperCase()}:`,C.x+C.w/2,y,fs*1.2,'#ffe23a',{max:C.w*.9});y+=fs*1.4;
  txt(g,'Bid on this showcase, or pass it?',C.x+C.w/2,y,fs*.95,'#fff',{max:C.w*.92});y+=fs*1;
  const bh=Math.min(fs*4,C.h*.22);itemList(g,C,y,0,Math.max(fs*2,C.y+C.h-y-bh-fs*1.6));
  const bw=C.w*.4;K.button(g,{x:C.x+C.w*.07,y:C.y+C.h-bh-fs*.8,w:bw,h:bh},'BID',()=>choose&&choose('bid'),{col:'#1a9a3a'});K.button(g,{x:C.x+C.w*.53,y:C.y+C.h-bh-fs*.8,w:bw,h:bh},'PASS',()=>choose&&choose('pass'),{col:'#c8102e'});}
 // a caption on two lines when it's long (one shrunk line was unreadable)
 function wrapCap(g,text,cx,cy,fs,max){g.save();g.font=`800 ${fs}px "SC Nunito",sans-serif`;if(g.measureText(text).width<=max){g.restore();txt(g,text,cx,cy,fs,'#fff',{max,w:800});return;}
  const ws=text.split(' ');let a='',i=0;while(i<ws.length&&g.measureText(a+ws[i]+' ').width<=max)a+=ws[i++]+' ';g.restore();const b=ws.slice(i).join(' ');
  txt(g,a.trim(),cx,cy-fs*.58,fs*.92,'#fff',{max,w:800});txt(g,b,cx,cy+fs*.58,fs*.92,'#fff',{max,w:800});}
 function press(l){if(!resolveBid)return;snd.hush();if(l==='⌫'){typed=typed.slice(0,-1);return;}if(l==='BID'){const v=Number(typed);if(!v){warn='Type a bid first';warnT=2;sfx.wrong?.();return;}const r=resolveBid;resolveBid=null;r(v);return;}if(typed.length<6&&!(typed===''&&l==='0'))typed+=l;}
 K.frame(dt=>{K.base();K.floorY=K.wide?K.H*.72:K.H*.6;const g=K.begin(),L=lay(),t=K.t;L0=L;door+=(doorTo-door)*Math.min(1,dt*2.2);if(cur)curT+=dt;warnT-=dt;if(cap){cap.t-=dt;if(cap.t<=0)cap=null;}who.forEach(o=>{o.lit=Math.max(0,o.lit-dt*.4);});
  drawDoors(g,L,t);
  // the host (left) and the model (beside the turntable) on the stage floor
  const hh=K.wide?L.H*.62:Math.min(L.H*.34,L.W*.5);K.spots={host:{x:Math.max(hh*.2,L.door.x-hh*.12),y:L.floor+hh*.05,h:hh,side:-1},model:K.wide?{x:L.door.x+hh*.3,y:L.floor+hh*.04,h:hh*.96,side:1}:{x:Math.min(L.W-hh*.2,L.door.x+L.door.w+hh*.1),y:L.floor+hh*.04,h:hh*.96,side:1}};
  // wide: the model presents from the turntable's left (on the right she stood over the podiums)
  who.forEach((o,i)=>drawPodium(g,L.pods[i],o,i,t));
  // the announcer's caption = a lower third: on wide screens left of the podiums, on tall ones just above them (never over the prize)
  if(cap){const fs=L.fs,p=L.pods[0],ch=fs*2.6;let cx,w,y0;if(K.wide){const x1=p.x-10;w=Math.min(x1-12,fs*26);cx=Math.max(8+w/2,x1-w/2);y0=L.H-ch-10;}else{w=Math.min(L.W*.94,fs*26);cx=L.W/2;y0=p.y-ch-8;}
   g.fillStyle='rgba(10,4,30,.82)';g.beginPath();g.roundRect(cx-w/2,y0,w,ch,10);g.fill();wrapCap(g,'♪ '+cap.text,cx,y0+ch/2,fs*.85,w*.94);}
  K.overlay(g,null);
  if(resolveBid&&bidder>=0&&who[bidder].human)drawKeypad(g,L);else if(choose&&who[sc.top].human)drawChoice(g,L);});
 // ---- the flow
 async function present(n){const c=cases[n];doorTo=1;sfx.applause(2.2,.6);snd.clip('ding');await K.wait(1100);ann(c.intro,3200);K.cast.present(5,'present');await K.wait(3200);
  // each prize on the turntable a good while (owner, Nov 26: "show off each item longer... things in between... describe the trips"):
  // the announcer names it, describes a trip or a car, then bridges to the next prize; the host chimes in once
  const ties=SC.SHOWCASE_TIES[c.id]||[];let comment=Math.floor(R()*c.items.length);
  for(let k=0;k<c.items.length;k++){const it=c.items[k];if(!s.alive)return;cur=it;curT=0;
   if(it[4]==='car'){K.show('A NEW CAR!',it[1].toUpperCase(),2.6,'#ffe23a');if(!snd.clip('new-car',{max:4}))sfx.fanfare?.();ann('A NEW CAR!',1500);sfx.cheer?.(2.6,.2);await K.wait(1500);if(!s.alive)return;}
   ann(`It's ${TV.art(it[1])}!`,2400);K.cast.present(6,'present');sfx.applause(1.4,.45);await K.wait(2400);if(!s.alive)return;
   const desc=SC.TRIP_DESC[it[0]]||(it[4]==='car'?SC.CAR_DESC[Math.floor(R()*SC.CAR_DESC.length)]:null);if(desc){ann(desc,4200);K.cast.present(6,'present');await K.wait(4200);if(!s.alive)return;}
   if(k===comment){K.say(SC.BOB_COMMENTS[Math.floor(R()*SC.BOB_COMMENTS.length)],1800);await K.wait(1800);if(!s.alive)return;}
   if(ties[k]&&k<c.items.length-1){ann(ties[k],3400);await K.wait(3400);}}
  if(!s.alive)return;ann('And it can all be yours... if the price is right!',3000);sfx.applause(2.6,.8);await K.wait(3000);cur=null;doorTo=0;await K.sleep(700);}
 async function getBid(i,n){const o=who[i];bidder=i;typed='';warn=null;K.say('Take your time, and give me your bid.',2600);await K.wait(1800);if(!s.alive)return 0;
  if(o.human){K.mode='input';const v=await new Promise(r=>{resolveBid=r;});K.mode='play';bidder=-1;return v;}
  // the game bids for a guest / the CPU: near the total, more often under (skill sharpens it), rounded like people do
  await K.sleep(1400+R()*1400);const sk=o.skill??.4,tot=cases[n].total,est=tot*(1-(.04+R()*.22)*(1-sk*.5)+(R()-.35)*(.3-.2*sk));bidder=-1;return Math.max(1000,Math.round(est/(R()<.5?500:100))*(R()<.5?500:100));}
 s.debug={get who(){return who;},cases,get door(){return door;},get prize(){return cur&&curT>1.2?cur[0]:null;},get choosing(){return !!choose;},get bidder(){return bidder;},bid(v){typed=String(v);press('BID');},get waiting(){return !!resolveBid;},choose:c=>choose&&choose(c),set hurry(v){K.hurry=v;},
  autoBid(){if(!resolveBid)return;const n=bidOn[bidder];typed=String(Math.round(cases[n].total*(globalThis.__tpirSharp?.96+Math.random()*.035:.85+Math.random()*.2)));press('BID');}};
 await SS.ready(['stage-showcase','stage-showcase-tall','stage-showcase-fold','showcase-podium','turntable','cr-body-1','cr-body-2','cr-body-3','cr-body-4','host','model','model-2'],5000);if(!s.alive)return;
 K.mode='play';snd.music(false);sfx.applause(3,.9);K.show('THE SHOWCASE!',who.map(o=>String(o.name).toUpperCase()).join('  vs  '),2.6,'#ffe23a');K.say('It\'s time for the Showcase!',2400);await K.wait(2600);if(!s.alive)return;
 // like the show (owner, Nov 27): the first showcase is presented, THEN the top winner of the wheel decides to bid on it or pass it
 const top=sc.top,second=1-top;K.say('Let\'s take a look at the first showcase!',2200);await K.wait(2200);if(!s.alive)return;
 await present(0);if(!s.alive)return;
 choosing=true;K.say(`${who[top].name}, you were our top winner on the wheel, so you decide. Do you want to bid on this showcase, or pass it?`,4200);await K.wait(2600);if(!s.alive)return;
 let pick;if(who[top].human)pick=await new Promise(r=>{choose=v=>{choose=null;r(v);};});else{await K.sleep(1500);pick=R()<.72?'pass':'bid';}
 choosing=false;K.say(pick==='pass'?'You\'ll pass it.':'You\'ll bid on it.',1600);who[top].pose='clap';sfx.applause(1.2,.5);await K.wait(1600);if(!s.alive)return;
 const first=pick==='pass'?second:top;bidOn[first]=0;bidOn[1-first]=1;
 who[first].bid=await getBid(first,0);if(!s.alive)return;sfx.ding();snd.voice('crowd-cheer',{vol:.6});await K.wait(900);if(!s.alive)return;
 K.say('Here\'s the second showcase!',2000);await K.wait(2000);if(!s.alive)return;await present(1);if(!s.alive)return;
 who[1-first].bid=await getBid(1-first,1);if(!s.alive)return;sfx.ding();snd.voice('crowd-cheer',{vol:.6});await K.wait(900);
 if(!s.alive)return;
 // the reveal: the bid that was second first, like the show
 K.say('Let\'s find out the actual retail prices of these showcases.',3000);await K.wait(3000);
 for(const i of [1-first,first]){if(!s.alive)return;const n=bidOn[i],o=who[i];K.say('The actual retail price of your showcase is...',2400);await K.wait(2600);o.arp=cases[n].total;o.diff=o.arp-o.bid;
  if(o.diff<0){if(!snd.clip('buzzer-wrong'))sfx.over?.();o.pose='sad';o.mood='sad';K.say('Oh, you overbid.',1800);}else{sfx.ding();sfx.applause(1.4,.5);}await K.wait(2200);}
 const ok=who.map((o,i)=>i).filter(i=>who[i].diff>=0);let winner=-1;const won=[0,0];
 if(!ok.length){K.say('Oh, you both overbid! Nobody wins a showcase today.',3200);if(!snd.clip('losing-horn'))sfx.aww?.();K.show('DOUBLE OVERBID','Nobody wins a showcase',3,'#ff6a5a');}
 else{const w=ok.sort((p,q)=>who[p].diff-who[q].diff)[0],o=who[w];winner=w;o.lit=4;o.pose='jump';o.mood='win';won[w]=cases[bidOn[w]].total;
  if(o.diff<=WITHIN){won[w]+=cases[bidOn[1-w]].total;winner=2+w;K.show('BOTH SHOWCASES!',`${String(o.name).toUpperCase()} WITHIN ${money(WITHIN)}!`,3.4,'#7dff5a');K.say('You were within two hundred fifty dollars! You win both showcases!',3600);}
  else{K.show(`${String(o.name).toUpperCase()} WINS!`,money(won[w])+' showcase',3,'#ffe23a');K.say('You were closer. You win your showcase!',2800);}
  if(!snd.clip('showcase-win',{max:9,fout:1.4}))sfx.winner();else sfx.applause(3.4,.9);vibrate([30,40,30]);}
 await K.wait(3600);if(!s.alive)return;
 ep.out={won,winner,bids:who.map(o=>o.bid),arps:who.map(o=>o.arp),cases:who.map((o,i)=>cases[bidOn[i]])};s.finish(won,'');}
Object.assign(exports,{showcase,WITHIN});
