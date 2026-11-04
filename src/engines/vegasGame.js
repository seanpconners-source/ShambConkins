// Shared scaffold for the Vegas tables after blackjack (ROADMAP G1): baccarat, five-card draw and roulette build on it.
// It sets up the full-screen canvas, the table's theme, dealer and regulars (data/casinoDealers.js), the five seats
// (players in 2 and 4, regulars in some of 1, 3, 5), the sounds, and the plumbing every table shares:
//  - ask(p,mode,opts): one choice by player p, answered by this phone's finger (G.st.ui is then set and the game's panel
//    draws it), by the CPU (opts.cpu() after a short think), or by the other phone online (its next move). Local answers
//    are sent to the other phone in order, so both phones play the same table from the seed.
//  - waits that throw STOP when the game is closed, banners, the dealer's lines and moods, seat moods and bubbles,
//  - the drawing helpers (pills, wrapped text, buttons, chip rows) and the input (hit boxes, felt taps, swipes, keys),
//  - the end: the dealer is impressed by anyone who broke the bank (unlockBy 'dealer') and the session finishes.
// A game supplies layout(), render(), panel(u) and act(id) and runs its own flow.
const {store}=require('src/state.js');
const {isCpu,cpuSkill}=require('src/engines/cpuKit.js');
const {fullBleed}=require('src/engines/fullBleed.js');
const {holdMusic,releaseMusic}=require('src/audio.js');
const {CASINO_THEMES}=require('src/data/tacticalItems.js');
const {TABLES,VEGAS_DRIFTERS}=require('src/data/casinoDealers.js');
const V=require('src/engines/vegasTable.js');
const {money,FONT,BODY}=V;
const STOP=Symbol('stop'),BUY_IN=1000,BREAK_BANK=1.5;

function createVegas(s,{seatsUsed=[0,2,4],maxRegulars=3,themeId=null}={}){
 const [c,x]=s.canvas(680,780,{fill:true}),fb=fullBleed(s,{bg:'#0b0709'});
 const net=s.online||null,cpu=isCpu(s);if(net||cpu)s.hotseat=true;s.shared=true;
 const calm=!!store.profile?.settings.reducedMotion,snd=V.tableSound(s);holdMusic(6*3600);s.cleanup(()=>releaseMusic());
 const rand=()=>s.random();
 const base=themeId?CASINO_THEMES.find(t=>t.id===themeId)||CASINO_THEMES[0]:s.game.id.includes('bond')?CASINO_THEMES[0]:CASINO_THEMES[Math.floor(rand()*CASINO_THEMES.length)];
 const TB=TABLES[base.id]||TABLES.bond,theme={...TB,id:base.id,source:base.source,title:base.title};
 let known=new Set();try{known=new Set(require('src/characters.js').CHARACTERS.map(q=>q.id));}catch{}
 const playerIds=new Set(s.players.map(p=>p.character));
 const regPool=[...TB.regulars,...(TB.regulars.length<3?VEGAS_DRIFTERS:[])].filter(id=>known.has(id)&&!playerIds.has(id)&&id!==TB.dealer);
 const dealerId=known.has(TB.dealer)?TB.dealer:(regPool.shift()||'quark');
 const nameOf=id=>{try{return require('src/characters.js').character(id)?.name||id;}catch{return id;}};
 const short=n=>String(n).split(' · ')[0].split(' ')[0].toUpperCase().slice(0,10);
 const seats=[0,1,2,3,4].map(i=>({i,kind:'empty',mood:'normal',moodT:0,say:'',sayT:0}));
 Object.assign(seats[1],{kind:'human',p:0,id:s.players[0].character,name:short(s.players[0].name)});
 Object.assign(seats[3],{kind:'human',p:1,id:s.players[1].character,name:short(s.players[1].name)});
 {const free=[...seatsUsed],n=Math.min(regPool.length,free.length,maxRegulars,1+Math.floor(rand()*maxRegulars)),pool=[...regPool];
  for(let k=0;k<n;k++){const at=free.splice(Math.floor(rand()*free.length),1)[0],id=pool.splice(Math.floor(rand()*pool.length),1)[0];Object.assign(seats[at],{kind:'extra',id,name:short(nameOf(id)),bank:BUY_IN});}}
 const seatOf=p=>seats[p===0?1:3];
 const st={bank:[BUY_IN,BUY_IN],out:[false,false],round:0,phase:'intro',ui:null,banner:null,flights:[],say:'',sayT:0,dmood:'normal',dmoodT:0,
  fast:false,auto:false,leaveAt:net?3:Infinity,pressId:null,pressT:-9,impressed:[false,false],reach:null};
 const G={s,c,x,fb,net,cpu,snd,calm,rand,theme,TB,dealerId,nameOf,short,seats,seatOf,st,STOP,BUY_IN,V,money,FONT,BODY,hits:[],L:null,T:0,
  cpuSkill:()=>cpuSkill(s),
  local:p=>net?p===net.me:!(cpu&&p===1),
  // pass and play: two people share the phone, so private cards stay hidden until asked
  shared:()=>!net&&!cpu};
 G.W8=async ms=>{if(!await s.wait(st.fast?ms*.25:calm?ms*.7:ms))throw STOP;};
 G.scores=()=>s.setScores?.(st.bank.map(v=>Math.floor(v)));
 G.sayD=(kind,secs=2.4)=>{const l=TB.lines[kind];if(!l)return;st.say=l[Math.floor(Math.random()*l.length)];st.sayT=G.T+secs;};
 G.say=(text,secs=2.4)=>{st.say=text;st.sayT=G.T+secs;};
 G.dmood=(m,secs=2)=>{st.dmood=m;st.dmoodT=G.T+secs;};
 G.moodS=(seat,m,secs=2.2)=>{seat.mood=m;seat.moodT=G.T+secs;};
 G.seatSay=(seat,text,secs=1.4)=>{seat.say=text;seat.sayT=G.T+secs;};
 G.banner=(text,color='#ffd23f',secs=1.6)=>{st.banner={text,color,t0:G.T,until:G.T+secs};};
 // one choice by player p (see the top of the file); `fallback` is what a vanished other phone counts as
 G.ask=(p,mode,opts={},fallback={leave:1})=>{
  if(net&&p!==net.me)return net.next().then(m=>m||fallback);
  if(cpu&&p===1)return G.W8(450+Math.random()*700).then(()=>opts.cpu?opts.cpu():fallback);
  return new Promise(res=>{st.ui={mode,p,opts,res:v=>{st.ui=null;if(net)net.send(v);res(v);}};});};
 // ---- drawing helpers
 G.pill=(text,px,py,color='#111',bg='rgba(255,255,255,.92)',fs=11)=>{x.save();x.font=`900 ${fs}px ${BODY}`;const w=x.measureText(text).width+fs*1.1,h=fs*1.55;V.rr(x,px-w/2,py-h/2,w,h,h/2);x.fillStyle=bg;x.fill();x.fillStyle=color;x.textAlign='center';x.textBaseline='middle';x.fillText(text,px,py+.5);x.restore();};
 G.wrap=(text,max,font)=>{x.font=font;const out=[];let cur='';for(const w of String(text).split(' ')){const t=cur?cur+' '+w:w;if(x.measureText(t).width>max&&cur){out.push(cur);cur=w;}else cur=t;}if(cur)out.push(cur);return out;};
 G.btn=o=>{G.hits.push(V.button(x,{...o,hot:st.pressId===o.id&&G.T-st.pressT<.15}));};
 G.head=(seat,hs,hx,hy,bob=0)=>{const hc=V.head(seat.id,seat.moodT>G.T?seat.mood:'normal');if(!hc)return;x.save();x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=8;x.drawImage(hc,hx-hs/2,hy-hs*.62+bob,hs,hs);x.restore();};
 // a seat's head, name plate (with the bank for players) and speech bubble
 G.drawSeat=(seat,hx,hy,ph,{active=false,label=null}={})=>{const hs=ph*1.15,bob=active?Math.sin(G.T*4)*2:0;G.head(seat,hs,hx,hy,bob);
  const human=seat.kind==='human',txt=label||(human?`${seat.name} ${money(st.bank[seat.p])}`:seat.name);
  G.pill(txt,hx,hy+hs*.42,human?'#2a1800':'#fff',human?(seat.p===0?'#ffd23f':'#9ad7ff'):'rgba(0,0,0,.6)',Math.max(9,ph*.2));
  if(human&&st.out[seat.p])G.pill('COLORED UP',hx,hy-hs*.55,'#fff','rgba(0,0,0,.7)',Math.max(8,ph*.16));
  if(seat.say&&seat.sayT>G.T)V.bubble(x,seat.say,hx,hy-hs*.55,Math.max(10,ph*.2),{max:120});};
 // the control panel's frame and its text/button helpers; returns the area to draw in
 G.panelFrame=()=>{const L=G.L,{W,H,panel:P,wide}=L;G.hits=[];
  if(wide){const g=x.createLinearGradient(P.x,0,P.x+40,0);g.addColorStop(0,'rgba(8,5,7,0)');g.addColorStop(1,'rgba(8,5,7,.9)');x.fillStyle=g;x.fillRect(P.x-30,0,P.w+30,H);x.fillStyle='rgba(8,5,7,.9)';x.fillRect(P.x+10,0,P.w,H);}
  else{const g=x.createLinearGradient(0,P.y-14,0,H);g.addColorStop(0,'rgba(10,6,8,0)');g.addColorStop(.2,'rgba(10,6,8,.85)');g.addColorStop(1,'rgba(10,6,8,.96)');x.fillStyle=g;x.fillRect(0,P.y-14,W,P.h+14);}
  const pad=wide?12:10,fs=wide?Math.max(14,Math.min(20,P.w*.075)):Math.max(13,Math.min(19,P.h*.13));
  const A={P,wide,pad,fs,X0:P.x+pad,Wd:P.w-pad*2,top:wide?(G.fb.top||40)+8:P.y+6,bottom:wide?H-34:H-32};
  A.text=(t,X,Y,size=fs,col='#fff',al='left')=>{x.font=`400 ${size}px ${FONT}`;x.fillStyle=col;x.textAlign=al;x.textBaseline='middle';x.fillText(t,X,Y);};
  A.small=(t,X,Y,al='left',col='rgba(255,255,255,.75)')=>{x.font=`800 ${fs*.68}px ${BODY}`;x.fillStyle=col;x.textAlign=al;x.textBaseline='middle';x.fillText(t,X,Y);};
  A.smallWrap=(t,Y,maxW=A.Wd)=>{const lines=G.wrap(t,maxW,`800 ${fs*.68}px ${BODY}`);lines.forEach((l,i)=>A.small(l,A.X0,Y+i*fs*.85));return Y+lines.length*fs*.85;};
  // buttons from the bottom up: a column (wide) or rows of `cols`
  A.buttons=(list,{h=wide?Math.min(58,(A.bottom-A.top)*.14):Math.min(60,P.h*.42),cols=wide?1:list.length}={})=>{const rows=Math.ceil(list.length/cols),bw=(A.Wd-pad*(cols-1))/cols;list.forEach((b,i)=>{const r=Math.floor(i/cols),cc=i%cols;G.btn({...b,X:A.X0+cc*(bw+pad),Y:A.bottom-(rows-r)*(h+pad*.8)+pad*.8,w:bw,h});});return A.bottom-rows*(h+pad*.8);};
  // a row/grid of chips to tap (ids chip:<value>), in the area from y0 to y1
  A.chips=(values,y0,y1,room)=>{const cols=wide?2:values.length,rows=Math.ceil(values.length/cols),areaH=Math.max(30,y1-y0),cd=Math.max(26,Math.min(A.Wd/cols*.66,areaH/rows/(V.SQ+.42),70));
   values.forEach((v,i)=>{const r=Math.floor(i/cols),cc=i%cols,cx=A.X0+A.Wd*(cc+.5)/cols,cy=y0+areaH*(r+.55)/rows,on=v<=room,img=V.chipImg(v,Math.round(cd));x.save();x.globalAlpha=on?1:.35;for(let k=0;k<3;k++)x.drawImage(img,cx-cd/2,cy-cd*V.SQ/2-k*cd*.13,cd+2,cd*V.SQ+cd*.13+2);x.restore();
    if(st.chip===v){x.save();x.strokeStyle='#ffe07a';x.lineWidth=3;x.beginPath();x.ellipse(cx,cy-cd*.13,cd*.62,cd*.62*V.SQ+cd*.1,0,0,7);x.stroke();x.restore();}
    G.hits.push({id:'chip:'+v,X:cx-cd*.62,Y:cy-cd*.75,w:cd*1.24,h:cd*1.2,on});});};
  A.wait=msg=>{const size=fs*1.05,lines=G.wrap(msg,A.Wd,`400 ${size}px ${FONT}`),cy=wide?H*.45:P.y+P.h*.42;lines.forEach((l,i)=>A.text(l,P.x+P.w/2,cy+(i-(lines.length-1)/2)*size*1.25,size,'#ffe9a8','center'));};
  return A;};
 // whose turn it is, for the panel while no local choice is open
 G.waitMsg=(fallback='')=>{const a=st.active!=null?seats[st.active]:null;if(a&&a.kind==='human'){if(net&&a.p!==net.me)return `${a.name} IS PLAYING ON THEIR PHONE…`;if(cpu&&a.p===1)return `${a.name} IS THINKING…`;}if(a&&a.kind==='extra')return `${a.name} IS PLAYING`;return fallback;};
 G.bannerDraw=(cx,cy)=>{const b=st.banner;if(!b||b.until<=G.T)return;const k=Math.min(1,(G.T-b.t0)*4);let fs=Math.max(26,Math.min(G.L.W*.1,60));x.font=`400 ${fs}px ${FONT}`;const tw=x.measureText(b.text).width,room=(G.L.TW||G.L.W)*.94;if(tw>room)fs*=room/tw;x.save();x.globalAlpha=Math.min(1,(b.until-G.T)*3);x.translate(cx,cy);x.scale(.7+.3*k,.7+.3*k);x.font=`400 ${fs}px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=fs*.14;x.strokeStyle='#120a04';x.strokeText(b.text,0,0);x.fillStyle=b.color;x.fillText(b.text,0,0);x.restore();};
 G.flightsDraw=(d)=>{st.flights=st.flights.filter(f=>{const k=(G.T-f.t0)/f.dur;if(k>=1.2)return false;const to=typeof f.to==='function'?f.to():f.to,e=V.ease(Math.min(1,k));V.drawStack(x,f.amount,f.fx+(to.x-f.fx)*e,f.fy+(to.y-f.fy)*e-Math.sin(e*Math.PI)*d*.6,d);return true;});};
 G.fly=(amount,from,to,dur=.45)=>{st.flights.push({amount,fx:from.x,fy:from.y,to,t0:G.T,dur});snd.chips(3);};
 G.dealerSpeech=(px,py,size,max)=>{if(st.say&&st.sayT>G.T)V.bubble(x,st.say,px,py,size,{dir:-1,max});};
 G.hud=(title,line,bar)=>{const hx=10,hy=10,L=G.L;x.save();x.font=`400 ${Math.max(14,(L.hd||60)*.2)}px ${FONT}`;x.fillStyle='#ffe9a8';x.textAlign='left';x.textBaseline='top';x.fillText(title,hx,hy);
  const by=hy+Math.max(18,(L.hd||60)*.25),bw=Math.min(90,L.W*.2);if(bar!=null){x.fillStyle='rgba(255,255,255,.18)';V.rr(x,hx,by,bw,6,3);x.fill();x.fillStyle=bar.color||'#ffd23f';V.rr(x,hx,by,bw*Math.max(0,Math.min(1,bar.k)),6,3);x.fill();}
  x.font=`800 ${Math.max(9,(L.hd||60)*.12)}px ${BODY}`;x.fillStyle=bar?.color==='#ff7a6a'?'#ff9a8a':'rgba(255,255,255,.7)';x.fillText(line,hx,by+10);x.restore();};
 // ---- input: hit boxes first, else the game's felt handler (tap or swipe)
 let drag=null;
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const p=s.pointer(ev),b=G.hits.find(h=>h.on!==false&&p.x>=h.X&&p.x<=h.X+h.w&&p.y>=h.Y&&p.y<=h.Y+h.h);
  if(b){st.pressId=b.id;st.pressT=G.T;snd.tap();G.act?.(b.id);return;}drag={id:ev.pointerId,x:p.x,y:p.y,t:G.T};G.onDown?.(p);s.capture(ev);});
 s.on(c,'pointermove',ev=>{if(!drag||ev.pointerId!==drag.id)return;G.onDrag?.(s.pointer(ev),drag);});
 for(const ty of ['pointerup','pointercancel'])s.on(c,ty,ev=>{if(!drag||ev.pointerId!==drag.id)return;s.release(ev);const p=s.pointer(ev),d=drag;drag=null;if(ty!=='pointerup')return G.onUp?.(null,d);
  const dx=p.x-d.x,dy=p.y-d.y;if(Math.hypot(dx,dy)<16)G.onTap?.(d);else if(Math.abs(dx)>42&&Math.abs(dx)>Math.abs(dy)*1.3)G.onSwipe?.(dx>0?1:-1,d);G.onUp?.(p,d);});
 s.on(document,'keydown',ev=>{if(!st.ui||s.paused)return;const id=G.key?.(ev.key.toLowerCase(),st.ui);if(id){ev.preventDefault();snd.tap();G.act?.(id);}});
 // ---- the loop and the test bots: s.debug.bot() answers this phone's open choice; st.auto answers every local one
 let botT=0;G.botAct=()=>{const u=st.ui;if(!u||G.T<botT)return null;botT=G.T+(st.fast?.05:.35);if(u.mode==='bet'&&st.round>=st.leaveAt&&!u.opts.noLeave){u.res({leave:1});return 'leave';}const v=G.bot?.(u);if(v){u.res(v);return u.mode;}return null;};
 s.frame(dt=>{G.T+=dt;if(st.auto)G.botAct();G.render?.();});
 // ---- the end: impressed dealer, then the result
 G.end=async(label)=>{st.phase='end';st.active=null;st.ui=null;const recruits=[[],[]];let canRec=()=>false;try{const {canRecruit}=require('src/profile.js');canRec=(id,owner)=>canRecruit(store.profile,id,owner,'dealer');}catch{}
  for(const p of [0,1]){if(cpu&&p===1)continue;if(st.bank[p]>=BUY_IN*BREAK_BANK){st.impressed[p]=true;G.moodS(seatOf(p),'win',4);if(canRec(dealerId,s.players[p].owner))recruits[p].push(dealerId);}}
  if(st.impressed.some(Boolean)){G.banner('YOU BROKE THE BANK!','#ffd23f',3);G.sayD('impressed',3.4);G.dmood('win',3.4);snd.win(true);await G.W8(3200);}
  else{G.banner('TABLE CLOSED','#ffe9a8',1.8);await G.W8(1600);}
  if(recruits.some(r=>r.length))s.gameRecruits=recruits;snd.stop();const n=s.players.map(p=>p.name);
  s.finish(st.bank.map(v=>Math.floor(v)),`${theme.title} ${label}: ${n[0]} ${money(st.bank[0])} · ${n[1]} ${money(st.bank[1])}${st.impressed.some(Boolean)?` · ${nameOf(dealerId)} was impressed!`:''}`);};
 G.run=async flow=>{try{snd.ambience(true);snd.music(true);G.sayD('hello',2.6);G.dmood('win',1.5);await flow();}catch(e){if(e!==STOP)throw e;}};
 return G;}
Object.assign(exports,{createVegas,STOP,BUY_IN});
