// THE PRICE IS RIGHT, THE WHOLE EPISODE (owner, Nov 26: "exactly like the real show"). Picked from the TV guide (tpir/guide.js).
// The open (the announcer over the theme, the curtain, the logo), the first four called down by name and the host's entrance, then
// the show's own rules (owner, Nov 26, round 2): Contestants' Row again and again (six rows at most) until every player has won a bid;
// a player who wins a bid plays a pricing game (never the same game twice in a show; Safe Crackers for a new car most shows); a studio
// guest who wins goes off camera and just turns up at the Big Wheel. A commercial break halfway. Each player then spins THE BIG WHEEL
// against two guests; the wheel winners meet in THE SHOWCASE (tpir/showcase.js); the Showcase winner gets the ending: a NEW CAR scene
// when there's one, the family runs down, the host's spay-and-neuter sign-off in front of them, the credits over the celebration.
// Losing anywhere (still on the row after six rows, the wheel, the Showcase) = the host thanks you by name, the announcer reads the
// parting gifts, and your show is over (no ending). Then the tally; score = cash + the value of every prize.
// 1P: alone (you + guests) or vs the CPU (a contestant like you). Each part of the show is the show's own game engine run as a
// segment (tpir/segment.js). Online and on the board the episode isn't offered (tpirShow.js keeps the single-game menu there).
const ST=require("src/engines/gameshow/stage.js");
const SS=require("src/data/showSprites.js");
const {runSegment}=require("src/engines/tpir/segment.js");
const P=require("src/engines/tpir/people.js");
const {txt,money}=require("src/engines/gameshow/pricingKit.js");
const {seededRandom,clamp}=require("src/utils.js");
const {holdMusic,releaseMusic,vibrate}=require("src/audio.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {nameOf,facePool}=require("src/engines/gameshow/guests.js");
const {character}=require("src/characters.js");
const SP=require("src/data/showPrizes.js");
const TV=require("src/data/tpirVoice.js");
const SC=require("src/data/tpirScript.js");
const TAU=Math.PI*2,ease=v=>1-Math.pow(1-clamp(v,0,1),3);
// the pricing games an episode deals from (Contestants' Row and the wheel are their own parts)
const GAMES=['range-game','safe-crackers','race-game','punch-a-bunch','clock-game','cliff-hangers','plinko-show'];
const ADS=[['ad-fightmilk','FIGHT MILK','For bodyguards, by bodyguards.','fightmilk'],['ad-brawndo','BRAWNDO','It\'s got electrolytes!','brawndo'],['ad-rumham','RUM HAM','A meal and a party, all in one!','rumham']];
// the lineup: four games, never the same twice; most episodes have the car game (Safe Crackers for a new car)
function lineup(R){const pool=GAMES.slice(),out=[];while(out.length<4){out.push(pool.splice(Math.floor(R()*pool.length),1)[0]);}
 const car=R()<.72;if(car&&!out.includes('safe-crackers'))out[1+Math.floor(R()*3)]='safe-crackers';return {games:out,car};}
async function episode(s,{alone=false}={}){
 const pg=require("src/engines/tpirShow.js").PRICING_GAMES,gameOf=id=>pg.find(g=>g.id===id);
 const R=seededRandom(`${s.seed}:episode`),L0=lineup(R),cpuMode=!alone&&s.solo?.kind==='cpu';
 const humans=alone?[s.players[0]]:s.players.slice(0,2),hName=i=>String(humans[i]?.name||'Player').replace(/\s*\(CPU\)\s*$/i,'');
 // the tally: one entry per person who won something (players first)
 const T=new Map();const key=w=>w.p!=null?'p'+w.p:'g:'+w.id;
 const entry=w=>{const k=key(w);if(!T.has(k))T.set(k,{name:w.p!=null?hName(w.p):w.name,who:w.p!=null?{p:w.p}:{id:w.id},total:0,lines:[],guest:w.p==null});return T.get(k);};
 humans.forEach((h,i)=>entry({p:i}));
 const add=(w,amount,what)=>{const e=entry(w);e.total+=Math.max(0,amount|0);if(what)e.lines.push([what,amount|0]);};
 const ep0={row:{},start:0,want:['v-ep-first-four','v-ep-star','v-ep-welcome-1','v-ep-welcome-2','v-ep-welcome-3','v-ep-welcome-tail','v-ep-ann-banter-1','v-ep-ann-banter-2','v-ep-ann-banter-3','v-ep-host-banter-1','v-ep-host-banter-2','v-ep-host-banter-3','v-ep-come-up-1','v-ep-come-up-2','v-ep-come-up-3']};
 // ---- the episode's own scenes (between the segments): one canvas made again after each segment, one frame loop
 let scene=null,sceneT=0,hurry=false,c=null,x=null;const snd=ST.createShowSound({voice:'episode'}),sfx=snd.sfx,cast=ST.createCast();
 holdMusic(6*3600);s.cleanup(()=>{snd.stop();releaseMusic();});
 function stage(){[c,x]=s.canvas(900,560,{fill:true});fullBleed(s,{bg:'#14062e'});s.on(c,'pointerdown',ev=>{if(s.paused)return;ev.preventDefault();hurry=true;});holdMusic(6*3600);}
 const wait=ms=>new Promise(r=>{const end=performance.now()+Math.max(ms,snd.talking());const f=()=>{if(!s.alive||hurry||performance.now()>=end){if(hurry)snd.hush();hurry=false;r();return;}setTimeout(f,30);};f();});
 let bubble=null,caption=null,banner=null;
 const say=(text,ms=2600)=>{bubble={text,t:ms/1000};if(snd.speak(text))bubble.t=Math.max(bubble.t,snd.talking()/1000+.3);};
 const ann=(text,ms=2600)=>{caption={text,t:ms/1000};if(snd.speak(text))caption.t=Math.max(caption.t,snd.talking()/1000+.3);};
 const show=(big,small,secs=2.4,col='#ffe23a')=>{banner={big,small,t:secs,col};};
 s.frame(dt=>{if(!scene)return;dt=Math.min(dt,.05);sceneT+=dt;for(const o of [bubble,caption,banner])if(o)o.t-=dt;if(bubble&&bubble.t<=0)bubble=null;if(caption&&caption.t<=0)caption=null;if(banner&&banner.t<=0)banner=null;
  cast.step(dt,{host:!!bubble||scene.host,model:!!scene.model});const g=x,W=s.W,H=s.H,fs=clamp(Math.min(W,H)*.04,12,20);g.setTransform(s.dpr||1,0,0,s.dpr||1,0,0);scene.draw(g,W,H,sceneT,fs);
  if(scene.cast!==false){const sp=cast.spots(W,H,{foot:H-4});cast.draw(g,W,H,sceneT,sp,!!bubble);if(bubble&&cast.hv>.5){const b=cast.bubbleAt(W,H,sp,fs);ST.bubble(g,b.x,b.y,bubble.text,b.w,fs*.85,b.tx,b.ty);}}
  else if(bubble){ST.bubble(g,W/2,H*.18,bubble.text,Math.min(W*.8,fs*18),fs*.85,W/2,H*.3);}
  if(caption){const w=Math.min(W*.9,fs*26),y0=scene.capY?scene.capY(W,H,fs):scene.capLow?H-fs*3.2:52+fs*.2;g.fillStyle='rgba(10,4,30,.82)';g.beginPath();g.roundRect(W/2-w/2,y0,w,fs*2.6,10);g.fill();
   // long lines on two rows (one shrunk row was unreadable)
   const tx='♪ '+caption.text,mx=w*.94;g.save();g.font=`800 ${fs*.85}px "SC Nunito",sans-serif`;if(g.measureText(tx).width<=mx){g.restore();txt(g,tx,W/2,y0+fs*1.3,fs*.85,'#fff',{max:mx,w:800});}
   else{const ws=tx.split(' ');let a='',i=0;while(i<ws.length&&g.measureText(a+ws[i]+' ').width<=mx)a+=ws[i++]+' ';g.restore();txt(g,a.trim(),W/2,y0+fs*.8,fs*.8,'#fff',{max:mx,w:800});txt(g,ws.slice(i).join(' '),W/2,y0+fs*1.8,fs*.8,'#fff',{max:mx,w:800});}}
  if(banner)ST.moneyBanner(g,W,H,banner.big,banner.small,Math.min(1,banner.t*3),banner.col);});
 const setScene=sc=>{if(!c||!c.isConnected)stage();scene=sc;sceneT=0;bubble=caption=banner=null;s.debug={episode:true,scene:sc.name,lineup:L0,get tally(){return [...T.values()].map(e=>({name:e.name,total:e.total,lines:e.lines}));},set hurry(v){hurry=!!v;}};};
 // a part of the show as a segment: the scene stops drawing while it runs
 async function seg(run,o){scene=null;snd.hush();snd.music(false);const r=await runSegment(s,run,o);if(!s.alive||!r)return null;stage();return r;}
 const studio=(kind)=>(g,W,H,t)=>{ST.drawStage(g,W,H,kind,t);};
 // ---- 1. the open: the curtain, the logo, the announcer over the theme
 stage();await SS.ready(['curtain','keyart:price-bid-off-logo','stage-row','stage-row-tall','stage-row-fold','stage-wheel','host','model','model-2',...ADS.map(a=>a[0]),'credits-bg','host-bye','family-1','family-2','family-3','family-4','stage-showcase','stage-showcase-tall','stage-showcase-fold','cr-body-1','cr-body-2','cr-body-3','cr-body-4'],5000);if(!s.alive)return;
 snd.want(['v-ep-intro-1','v-ep-first-four','v-ep-star','v-ep-welcome-1','v-ep-welcome-2','v-ep-welcome-3','v-ep-welcome-tail','v-ep-break-1','v-ep-back','v-ep-family','v-ep-signoff','v-ep-credits-1','v-ep-credits-2','v-ep-tally','v-ep-tally-win',...ADS.flatMap(a=>[1,2,3].map(n=>`v-ep-ad-${a[3]}-${n}`))]);
 setScene({name:'open',cast:false,draw(g,W,H,t){ST.drawStage(g,W,H,'row',t);const logo=SS.picture('keyart:price-bid-off-logo'),k=ease((t-1.4)/1.1),pulse=1+.02*Math.sin(t*3);
  if(logo&&k>0){const w=Math.min(W*.86,H*1.3)*pulse,h=w*logo.height/logo.width;g.save();g.globalAlpha=k;g.translate(W/2,H*.42);g.scale(.6+.4*k,.6+.4*k);g.drawImage(logo,-w/2,-h/2,w,h);g.restore();}
  else if(k>0)txt(g,'THE PRICE IS RIGHT!',W/2,H*.42,Math.min(W,H)*.12,'#ffe23a',{font:'"SC Bangers",Impact,sans-serif',w:400,max:W*.9});
  ST.drawCurtain(g,W,H,clamp((t-.6)/1.6,0,1),t);}});
 snd.title(true);sfx.applause?.(3.4,.9);await wait(700);if(!s.alive)return;ann('Here it comes! From Hollywood! The Price Is Right!',3600);await wait(3800);if(!s.alive)return;
 // ---- the host's entrance, after the first four are called down (Contestants' Row calls this once they're at their podiums)
 ep0.first=async(K)=>{K.show('THE FIRST FOUR!','',2,'#ffe23a');snd.title(false);if(!K.snd.speak('You\'re the first four contestants on The Price Is Right!'))sfx.cheer?.(2,.2);await K.wait(2600);if(!s.alive)return;
  K.show('BOB BARKER!','The star of our show',2.8,'#fff');K.snd.speak('And now, here\'s the star of our show... Bob Barker!');K.cast.cheer(4);K.sfx.applause(4,1);await K.wait(3000);if(!s.alive)return;
  const w=['Thank you, thank you! Hello everybody, and welcome to The Price Is Right!','Thank you very much! Hi everybody! Welcome to The Price Is Right!','Thank you! Oh, what a nice welcome. Welcome to The Price Is Right!'][Math.floor(R()*3)];
  K.say(w,3600);await K.wait(3400);if(!s.alive)return;
  if(R()<.6){const n=1+Math.floor(R()*3),A=['Bob, you look fantastic today!','Great crowd today, Bob!','Bob, I brought you a little something.'][n-1],B=['Thank you. I\'ve been told it\'s the lighting.','They sure are. Some of them have been waiting outside since four in the morning!','Is it a new car? ... It\'s not a new car.'][n-1];
   K.show('',A,2.4,'#fff');K.snd.speak(A);await K.wait(2400);if(!s.alive)return;K.say(B,3000);await K.wait(3000);if(!s.alive)return;}
  K.say('We have a lot of prizes to give away today, so let\'s get right to it!',3000);await K.wait(3000);};
 snd.title(false);
 // ---- THE SHOW'S RULES (owner, Nov 26): Contestants' Row again and again until every real player has won a bid and played a pricing
 // game (a studio guest who wins a bid doesn't play on camera: they just turn up at the Big Wheel); six rows at most, like the show. Then
 // each player spins the Big Wheel against two guests; the wheel winners go to the Showcase; the Showcase winner gets the ending (the
 // family, the sign-off, the credits over the celebration). Losing anywhere (never out of the row, the wheel, the Showcase) = the host
 // thanks you by name, the announcer reads the parting gifts, and your show is over. Score = cash + the value of every prize.
 const MAXROWS=6,cpuSeat=i=>cpuMode&&i===1,auto=i=>cpuSeat(i)||!!globalThis.__tpirAuto,real=i=>!cpuSeat(i);
 const st=humans.map(()=>'row'),bodyOf=humans.map((h,i)=>i);
 // the games, never one twice: shuffled, the car game (Safe Crackers for a new car) near the front most episodes
 const queue=L0.games.slice();{const rest=GAMES.filter(g=>!queue.includes(g));queue.push(...rest);}
 const guests=[];// studio guests who won a bid: {name,id,won}
 const asPlayer=w=>w.p!=null?humans[w.p]:{name:w.name,character:w.id,guest:true};
 const left=()=>humans.some((h,i)=>st[i]!=='out'&&st[i]!=='champ');
 const realLeft=()=>humans.some((h,i)=>real(i)&&(st[i]==='row'||st[i]==='played'||st[i]==='wheel'));
 // a guest's winnings off camera (they played a pricing game we didn't watch): like the show, about half win
 const offCamera=g=>{const r=R();g.won+=r<.5?0:r<.85?400+Math.floor(R()*12)*50:2000+Math.floor(R()*20)*250;};
 let gi=0,carLeft=L0.car,rows=0,broke=false;
 while(rows<MAXROWS&&humans.some((h,i)=>st[i]==='row')){if(!s.alive)return;
  // a row of Contestants' Row: one item, the winner comes up (the players who already played aren't on it any more)
  const onRow=humans.map((h,i)=>st[i]==='row'?h:null),rowPlayers=alone?[humans[0],humans[0]]:humans;
  const rowEp={...ep0,alone,first:rows===0?ep0.first:null,gone:humans.map((h,i)=>st[i]!=='row')};
  const r=await seg(require("src/engines/contestantsRow.js").contestantsRow,{players:rowPlayers,solo:s.solo,episode:rowEp,seed:`${s.seed}:ep:row${rows}`});if(!r)return;rows++;
  Object.assign(ep0,{row:rowEp.row,start:rowEp.start});const o=rowEp.out||{};
  if(o.p!=null&&st[o.p]==='row'){const i=o.p,w={p:i};st[i]='played';if(o.body!=null)bodyOf[i]=o.body;if(o.prize)add(w,o.won,o.prize[1]);
   // the player's pricing game (the CPU's plays itself; tests: globalThis.__tpirAuto plays them all)
   const id=queue[gi++],gm=gameOf(id),me=humans[i],a=auto(i);
   const players=a?[humans[0],me]:i===1?[humans[1],humans[0]]:alone?[humans[0],{name:'Guest',character:facePool()[0]}]:humans;
   const solo=a?{...(s.solo||{}),kind:'cpu',skill:cpuSeat(i)?(s.solo?.skill??.6):.42}:s.solo;
   const gep={only:a?1:0,car:id==='safe-crackers'?carLeft:null};if(id==='safe-crackers')carLeft=false;
   const g2=await seg(gm.run,{players,solo,episode:gep,seed:`${s.seed}:ep:game${gi}`});if(!g2)return;
   const t0=gm.title.replace(/^THE /,'');if(gep.out)add(w,gep.out.won,t0[0]+t0.slice(1).toLowerCase());
   if(gep.out?.car&&gep.out.won>0){await newCar(w,gep.out.car);if(!s.alive)return;}}
  else if(o.guest){const g={name:o.guest.short||'Guest',id:o.guest.id,won:o.won||0};offCamera(g);guests.push(g);add({name:g.name,id:g.id},g.won,o.prize?o.prize[1]:'');}
  // the commercial break halfway through the show
  if(!broke&&rows===3&&humans.some((h,i)=>st[i]==='row')){broke=true;await commercial();if(!s.alive)return;}}
 // anybody still on the row after six rows: their day is over
 for(let i=0;i<humans.length;i++)if(st[i]==='row'){await goodbye(i,'row');if(!s.alive)return;}
 if(!realLeft())return endShow(null);
 // ---- THE BIG WHEEL: one per player who played, with two of the guests who won a bid (the lowest winnings spin first)
 const guestPool=guests.slice(),nextGuest=()=>{if(guestPool.length)return guestPool.shift();const d=ep0.row.deal&&ep0.row.deal();const g=d?{name:d.short,id:d.id,won:0}:{name:'Guest',id:facePool()[guests.length+2],won:0};offCamera(g);return g;};
 const finalists=[];
 for(let i=0;i<humans.length;i++){if(st[i]!=='played'||!s.alive)continue;
  const ga=nextGuest(),gb=nextGuest(),C=[{p:i},{name:ga.name,id:ga.id},{name:gb.name,id:gb.id}];[ga,gb].forEach(g=>{const e=entry({name:g.name,id:g.id});if(!e.total&&g.won)add({name:g.name,id:g.id},g.won,'Pricing game');});
  const tot=C.map(w=>entry(w).total),order=[0,1,2].sort((a,b)=>tot[a]-tot[b]);
  const wep={guest:{name:gb.name,short:gb.name,id:gb.id,col:'#e86a92'},order,auto:auto(i)?[0]:[]};
  const wr=await seg(require("src/engines/bigWheel.js").bigWheel,{players:[humans[i],asPlayer(C[1])],solo:{...(s.solo||{}),kind:'cpu',skill:.42},episode:wep,seed:`${s.seed}:ep:wheel${i}`});if(!wr)return;
  const out=wep.out||{winner:-1,bonus:[0,0,0]};if(globalThis.__tpirWin)out.winner=0;// tests: reach the Showcase and the ending
  out.bonus.forEach((b,k)=>{if(b)add(C[k],b,'Big Wheel bonus');});
  if(out.winner===0){st[i]='wheel';finalists.push({p:i});}else{if(out.winner>0)finalists.push(C[out.winner]);await goodbye(i,'wheel');if(!s.alive)return;}}
 if(!realLeft())return endShow(null);
 // the Showcase needs two: a player alone at the top meets the winner of the other wheel (a guest's spin we didn't watch)
 let fin=finalists.filter(w=>w.p!=null&&st[w.p]==='wheel');const gFin=finalists.filter(w=>w.p==null);
 while(fin.length<2){const g=gFin.shift()||(()=>{const n=nextGuest();return {name:n.name,id:n.id};})();fin.push(g);}
 fin=fin.slice(0,2);
 // no break yet (owner, Nov 27): the show always goes to a commercial before the Showcase
 if(!broke){broke=true;await commercial();if(!s.alive)return;}
 // ---- THE SHOWCASE
 const [A,B]=fin;const scWho=[A,B].map((w,i)=>{const e=entry(w),isP=w.p!=null;return {name:e.name,p:isP?w.p:null,id:isP?null:w.id,body:isP?bodyOf[w.p]:i*2+1,won:e.total,human:isP&&(!auto(w.p)||!!globalThis.__tpirScHuman),skill:isP?(s.solo?.skill??.6):.42};});
 const scEp={sc:{who:scWho,top:scWho[0].won>=scWho[1].won?0:1}};
 const sr=await seg(require("src/engines/tpir/showcase.js").showcase,{players:alone?[humans[0],humans[0]]:humans,solo:s.solo,episode:scEp,seed:`${s.seed}:ep:showcase`});if(!sr)return;
 const so=scEp.out||{won:[0,0],winner:-1};[A,B].forEach((w,i)=>{if(so.won[i])add(w,so.won[i],'Showcase');});
 const wIdx=so.winner>=0?so.winner%2:-1,champ=wIdx>=0?[A,B][wIdx]:null;
 // a car in the winning showcase
 if(champ&&champ.p!=null){st[champ.p]='champ';const car=(so.cases?.[wIdx]?.items||[]).find(it=>it[4]==='car');if(car){await newCar(champ,[car[0],'a new '+car[1],car[2],car[3]]);if(!s.alive)return;}}
 for(const w of [A,B])if(w.p!=null&&w!==champ&&st[w.p]!=='out'){await goodbye(w.p,'showcase');if(!s.alive)return;}
 return endShow(champ&&champ.p!=null&&real(champ.p)?champ:null);

 // ---- the scenes between the parts
 async function commercial(){setScene({name:'break',host:true,draw:studio('row')});cast.cheer(1);say(R()<.5?'Stay with us! We\'ll be right back after this.':'Don\'t go away! We\'ll be right back.',2600);sfx.applause?.(2.4,.8);await wait(2600);if(!s.alive)return;
  const ad=ADS[Math.floor(R()*ADS.length)];setScene({name:'ad',cast:false,draw(g,W,H,t){g.fillStyle='#000';g.fillRect(0,0,W,H);const pic=SS.picture(ad[0]),z=1.02+t*.012;if(pic){// the 16:9 ad: fills a wide screen; on an upright one it sits whole in the middle over a blurred, darkened copy
   if(W>H*1.2){const k=Math.max(W/pic.width,H/pic.height)*z,w=pic.width*k,h=pic.height*k;g.drawImage(pic,(W-w)/2,(H-h)/2,w,h);}
   else{const kb=Math.max(W/pic.width,H/pic.height),bw=pic.width*kb,bh=pic.height*kb;g.save();g.filter='blur(14px) brightness(.45)';g.drawImage(pic,(W-bw)/2,(H-bh)/2,bw,bh);g.restore();const k=W/pic.width*z,w=pic.width*k,h=pic.height*k;g.drawImage(pic,(W-w)/2,H*.42-h/2,w,h);}}
   const fs=Math.min(W,H)*.06,y=H*.8;g.fillStyle='rgba(0,0,0,.45)';g.fillRect(0,y-fs*1.6,W,fs*3.4);txt(g,ad[1],W/2,y-fs*.5,fs*1.3,'#ffe23a',{font:'"SC Bangers",Impact,sans-serif',w:400,max:W*.9});txt(g,ad[2],W/2,y+fs*.85,fs*.6,'#fff',{max:W*.9});
   if(t>5)txt(g,'Available TODAY at your local store!',W/2,H*.12,fs*.7,'#fff',{max:W*.9});
   // an old TV ad: soft scanlines
   g.globalAlpha=.08;g.fillStyle='#000';for(let yy=0;yy<H;yy+=4)g.fillRect(0,yy,W,2);g.globalAlpha=1;}});
  for(let n=1;n<=3&&s.alive;n++){const line=({fightmilk:['Are you a bodyguard? Do you want to fight like a crow?','Fight Milk! The first alcoholic, dairy based protein drink, for bodyguards, by bodyguards.','Available today, at your local store. Look in the aisle where you buy your milk!'],
   brawndo:['Brawndo! The Thirst Mutilator!','It\'s got what plants crave. It\'s got electrolytes!','Brawndo. Available today, at your local store!'],rumham:['Planning a day at the beach? Don\'t forget the Rum Ham!','A whole ham, soaked in a bath of rum. It\'s a meal and a party, all in one!','Rum Ham! Available today, at Paddy\'s Pub. Look in the aisle where you buy your ham.']})[ad[3]][n-1];
   if(!snd.speak(line))await wait(900);await wait(2400);}
  if(!s.alive)return;setScene({name:'back',host:true,draw:studio('row')});sfx.applause?.(3,.9);snd.title(true);await wait(1600);snd.title(false);say('Welcome back to The Price Is Right!',2400);await wait(2400);}
 // A NEW CAR (owner, Nov 26: "make a big deal... cut away to the car and the model showing it... the player jumping up and down and freaking
 // out around the new car... the right scale... front and center"): the car alone on the turntable with a model, then the winner runs in
 async function newCar(w,car){const e=entry(w),who=w.p!=null?{p:w.p}:{id:w.id},body=w.p!=null?bodyOf[w.p]:1;snd.want(['v-'+TV.nameKey(e.name)]);
  setScene({name:'newcar',host:true,capLow:true,draw(g,W,H,t,fs){ST.drawStage(g,W,H,'showcase',t);
   // spotlights sweeping, the car big in the middle on the turntable, the model presenting it; the winner runs in after 3 s
   g.save();g.globalCompositeOperation='lighter';for(let k=0;k<3;k++){const a=Math.sin(t*1.3+k*2)*.35,x0=W*(.2+.3*k);const gr=g.createLinearGradient(x0,0,x0+Math.sin(a)*H,H);gr.addColorStop(0,'rgba(255,240,180,.22)');gr.addColorStop(1,'rgba(255,240,180,0)');g.fillStyle=gr;g.beginPath();g.moveTo(x0-W*.02,0);g.lineTo(x0+W*.02,0);g.lineTo(x0+Math.sin(a)*H+W*.16,H);g.lineTo(x0+Math.sin(a)*H-W*.16,H);g.fill();}g.restore();
   const tY=H*.13+Math.min(W*.08,H*.09)+fs,ph=Math.min(H*.36,W*.3,(H*.86-tY)*.62),fy=H*.86,carW=Math.min(W*.86,ph*2.6),tt=SS.picture('turntable');
   if(tt){const tw=carW*1.08,th=tw*tt.height/tt.width;g.drawImage(tt,W/2-tw/2,fy-th*.55,tw,th);}else{g.fillStyle='#d8d8e6';g.beginPath();g.ellipse(W/2,fy,carW*.54,carW*.1,0,0,TAU);g.fill();}
   ST.drawPrizeOn(g,SP.prizePhoto(car[0]),W/2,fy+carW*.02,carW,carW*.62,{emoji:car[3]||'🚗'});
   ST.drawModel(g,W/2+carW*.55,fy+ph*.06,ph*1.12,t%2<1.2?'present':'wave',t,0,true);
   if(t>3){const run=clamp((t-3)/1.1,0,1),bx=W/2+Math.sin((t-3)*2.2)*carW*.42,px=-ph+(bx+ph)*ease(run);ST.floorShadow(g,px,fy+ph*.05,ph*.4);P.contestant(g,s,who,px,fy+ph*.08,ph*1.05,{body,pose:run<1?'run'+(1+Math.floor(t*10)%4):'jump',mood:'win',t});}
   for(let i=0;i<60&&t>3;i++){const px=(i*97.3+t*40*(1+i%3))%W,py=((i*53.1)+t*(70+i%5*20))%H;g.fillStyle=['#ffe23a','#ff4fa0','#3ac8ff','#7dff5a','#fff'][i%5];g.fillRect(px,py,fs*.35,fs*.2);}
   txt(g,'A NEW CAR!',W/2,H*.13,Math.min(W*.12,H*.13),'#ffe23a',{font:'"SC Bangers",Impact,sans-serif',w:400,max:W*.92});txt(g,String(car[1]).replace(/^a new /i,'').toUpperCase()+' · '+money(car[2]),W/2,H*.13+Math.min(W*.08,H*.09),fs*1.1,'#fff',{max:W*.9});}});
  snd.clip('new-car',{max:6})||sfx.fanfare?.();sfx.applause?.(4,1);snd.speak('A NEW CAR!');await wait(3000);if(!s.alive)return;
  sfx.cheer?.(3,.25);vibrate([40,60,40,60,120]);say(`${e.name}, you just won a NEW CAR!`,3200);await wait(3600);if(!s.alive)return;
  ann(SC.CAR_DESC[Math.floor(R()*SC.CAR_DESC.length)],3600);await wait(3800);}
 // OUT (owner, Nov 26): the host thanks them by name, the announcer reads the parting gifts (a lifetime supply of Rice-A-Roni, the home
 // game), and their show is over
 async function goodbye(i,why){st[i]='out';const e=entry({p:i}),who={p:i};
  // the parting gifts (owner, Nov 27): always the home game, and a year's supply of something (not always the Rice-A-Roni)
  const gift=SC.PARTING[Math.floor(R()*SC.PARTING.length)],gname=gift[2]?gift[2].replace(/^a year's supply of /i,''):'Rice-A-Roni';
  add({p:i},0,`${gname} + the home game`);snd.want(['v-'+TV.nameKey(e.name)]);snd.prepare?.([gift[1]]);SP.prizePhoto(gift[0]);SP.prizePhoto(SC.HOME_GAME);
  setScene({name:'goodbye',host:true,capY:(W,H,fs)=>H*.12+Math.min(W*.06,H*.065)+fs*1.1,draw(g,W,H,t,fs){ST.drawStage(g,W,H,why==='showcase'?'showcase':'wheel',t);const h=Math.min(H*.6,W*.5),fy=H*.94;
   const cx=H>W*1.15?W*.42:W*.5;ST.floorShadow(g,cx,fy,h*.4);P.contestant(g,s,who,cx,fy,h,{body:bodyOf[i],pose:t>4?'clap':'stand',mood:t>4?'normal':'sad',t});
   if(t>3.2){const a=ease(t-3.2),tall=H>W*1.15,bw=tall?W*.21:Math.min(W*.26,h*.55),ph=SP.prizePhoto(gift[0]),hg=SP.prizePhoto(SC.HOME_GAME);g.save();g.globalAlpha=a;
    // phones: both gifts on the right (Bob stands on the left); wide: one each side of the contestant
    const gx=tall?W*.885:W*.79,hx=tall?W*.665:W*.21;
    ST.drawPrizeOn(g,ph,gx,fy-h*.05,bw,bw,{emoji:'🎁',ped:true});ST.drawPrizeOn(g,hg,hx,fy-h*.05,bw,bw,{emoji:'🎲',ped:true});
    const lf=Math.min(fs*.85,W*.03,tall?W*.026:99);txt(g,'THE HOME GAME',hx,fy+lf*.2,lf,'#fff',{max:tall?W*.21:W*.36});txt(g,gname.toUpperCase(),gx,fy+lf*.2,lf,'#fff',{max:tall?W*.21:W*.36});g.restore();}
   txt(g,`THANKS FOR PLAYING, ${String(e.name).toUpperCase()}!`,W/2,H*.12,Math.min(W*.07,H*.075),'#ffe23a',{font:'"SC Bangers",Impact,sans-serif',w:400,max:W*.92});
   txt(g,`${money(e.total)} in cash and prizes`,W/2,H*.12+Math.min(W*.06,H*.065),fs*1,'#fff',{max:W*.9});}});
  if(!snd.clip('losing-horn'))sfx.aww?.();await wait(900);if(!s.alive)return;say(`${e.name}, thank you for playing The Price Is Right!`,3000);sfx.applause?.(2.4,.6);await wait(3200);if(!s.alive)return;
  ann(gift[1],6000);await wait(6200);}
 // ---- the end of the show: the ending only for a real player who won the Showcase, else straight to the winnings
 async function endShow(champ){if(!s.alive)return;
  const tally=[...T.values()].sort((p,q)=>(q.guest?0:1)-(p.guest?0:1)||q.total-p.total);
  if(champ){const champE=entry(champ),famIds=familyFor(humans[champ.p]?.character,R),body=bodyOf[champ.p];
   // the winner and the family celebrating: the family runs down, then the host steps out in front of them, then the credits roll over it
   const party=(g,W,H,t,fs,k=1)=>{const fy=H*.93,h=Math.min(H*.5,W*.42)*k,cx=W/2;
    for(let i=0;i<80;i++){const px=(i*97.3+t*40*(1+i%3))%W,py=((i*53.1)+t*(60+i%5*20))%H;g.fillStyle=['#ffe23a','#ff4fa0','#3ac8ff','#7dff5a','#fff'][i%5];g.fillRect(px,py,fs*.35,fs*.2);}
    ST.floorShadow(g,cx,fy,h*.4);P.contestant(g,s,{p:champ.p},cx,fy,h,{body,pose:t%2.4<1.2?'jump':'cheer',mood:'win',t});
    famIds.forEach((id,i)=>{const n=i+1,side=i%2?1:-1,slot=cx+side*h*(.32+.24*Math.floor(i/2)),start=side*(W*.6+i*W*.08),run=clamp((t-.4-i*.35)/1.6,0,1),px=slot+start*(1-ease(run)),
     pose=run<1?'run'+(1+Math.floor(t*10+i)%4):['jump','hug','cheer','wave'][Math.floor(t/1.3+i)%4],hh=h*(n===4?.78:.98);ST.floorShadow(g,px,fy,hh*.35);P.family(g,s,{id},n,px,fy,hh,pose,t,-side);});};
   setScene({name:'family',host:true,model:true,draw(g,W,H,t,fs){ST.drawStage(g,W,H,'showcase',t);party(g,W,H,t,fs);
    txt(g,`${champE.name.toUpperCase()}`,W/2,H*.14,fs*2,'#ffe23a',{font:'"SC Bangers",Impact,sans-serif',w:400,max:W*.9});txt(g,`${money(champE.total)} IN CASH AND PRIZES!`,W/2,H*.14+fs*2,fs*1.1,'#fff',{max:W*.9});}});
   snd.clip('big-winner',{max:7});sfx.applause?.(5,1);cast.cheer(6);say('Come on, everybody! Come on down here!',2600);await wait(3400);if(!s.alive)return;say(`${champE.name}, you're our big winner today!`,2600);await wait(3000);if(!s.alive)return;
   // the sign-off: the host in front of the celebrating family
   let t0=0;setScene({name:'signoff',cast:false,draw(g,W,H,t,fs){ST.drawStage(g,W,H,'showcase',t+6);party(g,W,H,t+6,fs,.8);g.fillStyle='rgba(10,4,30,.18)';g.fillRect(0,0,W,H);
    const h=Math.min(H*.92,W*.9),z=1+t*.01;const hb=SS.picture('host-bye'),HB=SS.HOST_BYE;if(hb){const fi=HB.frames.indexOf(t<4.6?'sincere':t<6.6?'wave':'bow'),k=h*z*.92/HB.h;g.drawImage(hb,fi*HB.w,0,HB.w,HB.h,W/2-HB.feet[0]*k,H+h*.1-HB.feet[1]*k,HB.w*k,HB.h*k);}else ST.drawHost(g,W/2,H+h*.1,h*z*.85,'talk',t);}});
   snd.title(true);snd.music(false);await wait(600);if(!s.alive)return;say('This is Bob Barker, reminding you: help control the pet population. Have your pets spayed or neutered. Bye bye, everybody!',7000);await wait(7000);if(!s.alive)return;
   // the credits roll over the celebration
   const names=[['THE PRICE IS RIGHT',''],['Host','Bob Barker'],['Announcer','Rich Fields'],['Starring',tally.map(e=>e.name).join(' · ')],['Models','The Barker\'s Beauties'],['Prizes furnished by','Fight Milk · Brawndo · Paddy\'s Pub'],['A ShambConkins Production','']];
   setScene({name:'credits',cast:false,draw(g,W,H,t,fs){ST.drawStage(g,W,H,'showcase',t+13);party(g,W,H,t+13,fs,.9);
    g.fillStyle='rgba(0,0,20,.35)';g.fillRect(0,0,W,H);let y=H-t*fs*2.6;for(const [a,b] of names){txt(g,a,W/2,y,fs*(b?1:1.6),'#ffd75a',{max:W*.76,font:b?'"SC Nunito",sans-serif':'"SC Bangers",Impact,sans-serif',w:b?900:400});if(b)txt(g,b,W/2,y+fs*1.5,fs*1.1,'#fff',{max:W*.76});y+=fs*4.4;}}});
   ann('The Price Is Right is a ShambConkins production.',3000);await wait(3200);if(!s.alive)return;ann('Promotional consideration furnished by Fight Milk, Brawndo the Thirst Mutilator, and Paddy\'s Pub. Prizes described by your announcer.',5200);await wait(5400);snd.title(false);if(!s.alive)return;}
  // ---- the tally (everyone's cash + prizes; the players' totals are the scores)
  const people=tally.filter(e=>!e.guest||e.total>0).slice(0,6),best=[...T.values()].filter(e=>!e.guest).sort((p,q)=>q.total-p.total)[0];
  setScene({name:'tally',cast:false,draw(g,W,H,t,fs){const pic=SS.picture(H>W*1.15?'tally-bg-tall':'tally-bg')||SS.picture('tally-bg');if(pic){const k=Math.max(W/pic.width,H/pic.height),w=pic.width*k,h=pic.height*k;g.drawImage(pic,(W-w)/2,(H-h)/2,w,h);}else ST.drawStage(g,W,H,'wheel',t);
   const pw=Math.min(W*.92,fs*30),ph=Math.min(H*.8,fs*4+people.length*fs*4.2),px=W/2-pw/2,py=Math.max(56,(H-ph)/2);g.fillStyle='rgba(20,6,46,.9)';g.beginPath();g.roundRect(px,py,pw,ph,14);g.fill();g.strokeStyle='#ffd75a';g.lineWidth=3;g.stroke();
   txt(g,'TODAY\'S WINNINGS',W/2,py+fs*1.6,fs*1.5,'#ffe23a',{font:'"SC Bangers",Impact,sans-serif',w:400});
   people.forEach((e,i)=>{const y=py+fs*3.8+i*fs*4.2,a=ease((t-.5-i*.5)*2);if(a<=0)return;g.save();g.globalAlpha=a;P.face(g,s,e.who,px+fs*2.2,y,fs*2.6,e===best?'win':'normal');
    txt(g,e.name.toUpperCase()+(e.guest?' (GUEST)':''),px+fs*4.2,y-fs*.7,fs*1.05,e===best?'#ffe23a':'#fff',{align:'left',max:pw*.5});
    txt(g,e.lines.map(l=>l[0]).filter(Boolean).slice(0,4).join(' · ')||'—',px+fs*4.2,y+fs*.8,fs*.62,'#bfe7ff',{align:'left',max:pw*.52,w:800});
    const roll=Math.min(1,Math.max(0,(t-.8-i*.5)/1.4));txt(g,money(e.total*roll),px+pw-fs*1,y,fs*1.6,'#7dff5a',{align:'right',font:'"SC Bangers",Impact,sans-serif',w:400});g.restore();});}});
  ann('Let\'s see how everybody did today!',2400);sfx.applause?.(3,.8);await wait(3000);if(!s.alive)return;ann('Today\'s big winner...',1800);await wait(2000);if(!s.alive)return;
  show(`${best.name.toUpperCase()}!`,money(best.total)+' in cash and prizes',3.2,'#ffe23a');sfx.winner?.();vibrate([30,40,30]);await wait(3600);if(!s.alive)return;
  const scores=humans.map((h,i)=>entry({p:i}).total);
  // played alone: the result card is a personal best (no CPU line), like the other play-alone games; the score = cash + prizes
  if(alone&&s.solo){s.solo.kind='game';s.solo.alone=true;}
  s.finish(scores,`THE PRICE IS RIGHT · ${humans.map((h,i)=>`${hName(i)} ${money(scores[i])}`).join(' · ')}`);}}
// the winner's family: characters from the same show/film as the winner (else anybody), up to four
function familyFor(id,R){const pool=facePool(),src=id&&character(id)?.source,same=src?pool.filter(f=>f!==id&&character(f)?.source===src):[],rest=pool.filter(f=>f!==id&&!same.includes(f));
 const pick=a=>a.splice(Math.floor(R()*a.length),1)[0],out=[];while(out.length<4&&same.length)out.push(pick(same));while(out.length<4&&rest.length)out.push(pick(rest));return out;}
Object.assign(exports,{episode,lineup,GAMES});
