// THE PRICE IS RIGHT, THE WHOLE EPISODE (owner, Nov 26: "exactly like the real show"). Picked from the TV guide (tpir/guide.js).
// The open (the announcer over the theme, the curtain, the logo), then the first four called down by name and the host's entrance
// (Contestants' Row, gameshow + contestantsRow.js in episode mode), then for each half of the show: a row, a pricing game for the
// row's winner, another row and game, then THE BIG WHEEL; a commercial break between the halves (Fight Milk, Brawndo, Rum Ham:
// "Available TODAY at your local store!"); THE SHOWCASE for the two wheel winners (tpir/showcase.js); the winner's family runs down;
// the host's spay-and-neuter sign-off; the credits; then a tally of what everybody won. The car: most episodes put one up in a
// pricing game ("A NEW CAR!"), now and then the Showcase has one too.
// Who plays: both players stay on Contestants' Row all show (so nobody sits out for long); the row's winner plays the pricing
// game, a studio guest who wins plays it too (the game plays for them: s.solo kind 'cpu', seat 1). 1P: alone (you + guests) or vs
// the CPU (it bids and plays like a third player). Each part of the show is the show's own game engine run as a segment
// (tpir/segment.js). Online and on the board the episode isn't offered (tpirShow.js keeps the single-game menu there).
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
  if(caption){const w=Math.min(W*.9,fs*26),y0=52+fs*.2;g.fillStyle='rgba(10,4,30,.82)';g.beginPath();g.roundRect(W/2-w/2,y0,w,fs*2.6,10);g.fill();txt(g,'♪ '+caption.text,W/2,y0+fs*1.3,fs*.85,'#fff',{max:w*.94,w:800});}
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
 // ---- the halves
 const wheels=[];let gi=0,carLeft=L0.car;
 const asPlayer=w=>w.p!=null?humans[w.p]:{name:w.name,character:w.id,guest:true};
 for(let half=0;half<2;half++){const played=[];
  for(let k=0;k<2;k++){if(!s.alive)return;
   // a row of Contestants' Row: one item, the winner comes up
   const rowEp={...ep0,alone,first:gi===0?ep0.first:null};const r=await seg(require("src/engines/contestantsRow.js").contestantsRow,{players:alone?[humans[0],humans[0]]:humans,solo:s.solo,episode:rowEp,seed:`${s.seed}:ep:row${gi}`});if(!r)return;
   Object.assign(ep0,{row:rowEp.row,start:rowEp.start});const o=rowEp.out||{};const w=o.p!=null?{p:o.p}:{name:o.guest?.short||'Guest',id:o.guest?.id};
   if(o.prize)add(w,o.won,o.prize[1]);played.push(w);
   // the pricing game for the row's winner
   // (tests: globalThis.__tpirAuto = the game plays the players' pricing games too, so a whole episode runs on its own)
   const id=L0.games[gi],gm=gameOf(id);const guestPlays=w.p==null||!!globalThis.__tpirAuto,cpuPlays=w.p===1&&cpuMode;
   const players=guestPlays?[humans[0],w.p!=null?humans[w.p]:asPlayer(w)]:w.p===1&&!cpuMode?[humans[1],humans[0]]:alone?[humans[0],{name:'Guest',character:facePool()[0]}]:humans;
   const only=guestPlays||cpuPlays?1:0,solo=guestPlays?{...(s.solo||{}),kind:'cpu',skill:.42}:s.solo;
   const gep={only,car:id==='safe-crackers'?carLeft:null};if(id==='safe-crackers')carLeft=false;
   const g2=await seg(gm.run,{players,solo,episode:gep,seed:`${s.seed}:ep:game${gi}`});if(!g2)return;gi++;
   if(gep.out)add(w,gep.out.won,gm.title.replace(/^THE /,'')[0]+gm.title.replace(/^THE /,'').slice(1).toLowerCase());}
  if(!s.alive)return;
  // ---- THE BIG WHEEL: both players + a studio guest (one who played this half, else the next one in line); lowest winnings spin first
  const gw=played.find(w=>w.p==null)||(()=>{const d=ep0.row.deal&&ep0.row.deal();return d?{name:d.short,id:d.id}:{name:'Guest',id:facePool()[0]};})();
  const other=alone?(played.find(w=>w.p==null&&w!==gw)||(()=>{const d=ep0.row.deal&&ep0.row.deal();return d?{name:d.short,id:d.id}:{name:'Guest',id:facePool()[1]};})()):null;
  const C=alone?[{p:0},other,gw]:[{p:0},{p:1},gw],tot=C.map(w=>entry(w).total),order=[0,1,2].sort((a,b)=>tot[a]-tot[b]);
  const wep={guest:{name:gw.name,short:gw.name,id:gw.id,col:'#e86a92'},order};
  const wr=await seg(require("src/engines/bigWheel.js").bigWheel,{players:alone?[humans[0],asPlayer(other)]:humans,solo:alone?{...(s.solo||{}),kind:'cpu',skill:.42}:s.solo,episode:wep,seed:`${s.seed}:ep:wheel${half}`});if(!wr)return;
  const out=wep.out||{winner:0,bonus:[0,0,0],totals:[0,0,0]};out.bonus.forEach((b,i)=>{if(b)add(C[i],b,'Big Wheel bonus');});wheels.push({winner:C[out.winner],C,totals:out.totals});
  // ---- the commercial break between the halves
  if(half===0){setScene({name:'break',host:true,draw:studio('row')});cast.cheer(1);say(R()<.5?'Stay with us! We\'ll be right back after this.':'Don\'t go away! We\'ll be right back.',2600);sfx.applause?.(2.4,.8);await wait(2600);if(!s.alive)return;
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
   if(!s.alive)return;setScene({name:'back',host:true,draw:studio('row')});sfx.applause?.(3,.9);snd.title(true);await wait(1600);snd.title(false);say('Welcome back to The Price Is Right!',2400);await wait(2400);}}
 if(!s.alive)return;
 // ---- THE SHOWCASE: the two wheel winners (the same one twice = the second wheel's runner-up goes instead)
 let A=wheels[0].winner,B=wheels[1].winner;if(key(A)===key(B)){const w2=wheels[1],cand=[0,1,2].filter(i=>key(w2.C[i])!==key(A)).sort((p,q)=>w2.totals[q]-w2.totals[p]);B=w2.C[cand[0]];}
 const scWho=[A,B].map((w,i)=>{const e=entry(w),isP=w.p!=null;return {name:e.name,p:isP?w.p:null,id:isP?null:w.id,body:i*2+1,won:e.total,human:isP&&!(cpuMode&&w.p===1),skill:isP?(s.solo?.skill??.6):.42};});
 const scEp={sc:{who:scWho,top:scWho[0].won>=scWho[1].won?0:1}};
 const sr=await seg(require("src/engines/tpir/showcase.js").showcase,{players:alone?[humans[0],humans[0]]:humans,solo:s.solo,episode:scEp,seed:`${s.seed}:ep:showcase`});if(!sr)return;
 const so=scEp.out||{won:[0,0],winner:-1};[A,B].forEach((w,i)=>{if(so.won[i])add(w,so.won[i],'Showcase');});
 // ---- the family runs down to the day's big winner (the Showcase winner, else the top winner)
 const tally=[...T.values()].sort((p,q)=>(q.guest?0:1)-(p.guest?0:1)||q.total-p.total);
 const champ=so.winner>=0?[A,B][so.winner%2]:(()=>{const best=[...T.entries()].sort((p,q)=>q[1].total-p[1].total)[0];return best[1].who.p!=null?{p:best[1].who.p}:{id:best[1].who.id,name:best[1].name};})();
 const champE=entry(champ),famIds=familyFor(champ.p!=null?humans[champ.p]?.character:champ.id,R);
 setScene({name:'family',host:true,model:true,draw(g,W,H,t,fs){ST.drawStage(g,W,H,'showcase',t);const fy=H*.93,h=Math.min(H*.5,W*.42),cx=W/2;
  // confetti
  for(let i=0;i<80;i++){const px=(i*97.3+t*40*(1+i%3))%W,py=((i*53.1)+t*(60+i%5*20))%H;g.fillStyle=['#ffe23a','#ff4fa0','#3ac8ff','#7dff5a','#fff'][i%5];g.fillRect(px,py,fs*.35,fs*.2);}
  ST.floorShadow(g,cx,fy,h*.4);P.contestant(g,s,champE.who,cx,fy,h,{body:1,pose:t%2.4<1.2?'jump':'cheer',mood:'win',t});
  famIds.forEach((id,i)=>{const n=i+1,side=i%2?1:-1,slot=cx+side*h*(.32+.24*Math.floor(i/2)),start=side*(W*.6+i*W*.08),run=clamp((t-.4-i*.35)/1.6,0,1),px=slot+start*(1-ease(run)),
   pose=run<1?'run'+(1+Math.floor(t*10+i)%4):['jump','hug','cheer','wave'][Math.floor(t/1.3+i)%4],hh=h*(n===4?.78:.98);ST.floorShadow(g,px,fy,hh*.35);P.family(g,s,{id},n,px,fy,hh,pose,t,-side);});
  txt(g,`${champE.name.toUpperCase()}`,W/2,H*.14,fs*2,'#ffe23a',{font:'"SC Bangers",Impact,sans-serif',w:400,max:W*.9});txt(g,`${money(champE.total)} IN CASH AND PRIZES!`,W/2,H*.14+fs*2,fs*1.1,'#fff',{max:W*.9});}});
 snd.clip('big-winner',{max:7});sfx.applause?.(5,1);cast.cheer(6);say('Come on, everybody! Come on down here!',2600);await wait(5200);if(!s.alive)return;
 // ---- the sign-off
 setScene({name:'signoff',cast:false,draw(g,W,H,t,fs){ST.drawStage(g,W,H,'wheel',t);const h=Math.min(H*.92,W*.9),z=1+t*.01;const hb=SS.picture('host-bye'),B=SS.HOST_BYE;if(hb){const fi=B.frames.indexOf(t<4.6?'sincere':t<6.6?'wave':'bow'),k=h*z*1.08/B.h;g.drawImage(hb,fi*B.w,0,B.w,B.h,W/2-B.feet[0]*k,H+h*.08-B.feet[1]*k,B.w*k,B.h*k);}else ST.drawHost(g,W/2,H+h*.08,h*z,'talk',t);
  ST.drawModel(g,W*.14,H*.98,h*.7,t%1.6<.8?'wave':'present',t,0);ST.drawModel(g,W*.86,H*.98,h*.7,t%1.6<.8?'present':'wave',t,1,true);}});
 snd.title(true);snd.music(false);await wait(600);if(!s.alive)return;say('This is Bob Barker, reminding you: help control the pet population. Have your pets spayed or neutered. Bye bye, everybody!',7000);await wait(7000);if(!s.alive)return;
 // ---- the credits
 const names=[['THE PRICE IS RIGHT',''],['Host','Bob Barker'],['Announcer','Rich Fields'],['Starring',tally.map(e=>e.name).join(' · ')],['Models','The Barker\'s Beauties'],['Prizes furnished by','Fight Milk · Brawndo · Paddy\'s Pub'],['A ShambConkins Production','']];
 setScene({name:'credits',cast:false,draw(g,W,H,t,fs){const pic=SS.picture('credits-bg');if(pic){const k=Math.max(W/pic.width,H/pic.height),w=pic.width*k,h=pic.height*k;g.drawImage(pic,(W-w)/2,(H-h)/2,w,h);}else ST.drawStage(g,W,H,'wheel',t);
  g.fillStyle='rgba(0,0,20,.45)';g.fillRect(W*.1,0,W*.8,H);let y=H-t*fs*2.6;for(const [a,b] of names){txt(g,a,W/2,y,fs*(b?1:1.6),'#ffd75a',{max:W*.76,font:b?'"SC Nunito",sans-serif':'"SC Bangers",Impact,sans-serif',w:b?900:400});if(b)txt(g,b,W/2,y+fs*1.5,fs*1.1,'#fff',{max:W*.76});y+=fs*4.4;}}});
 ann('The Price Is Right is a ShambConkins production.',3000);await wait(3200);if(!s.alive)return;ann('Promotional consideration furnished by Fight Milk, Brawndo the Thirst Mutilator, and Paddy\'s Pub. Prizes described by your announcer.',5200);await wait(5400);snd.title(false);if(!s.alive)return;
 // ---- the tally
 const people=tally.filter(e=>!e.guest||e.total>0).slice(0,6),best=[...T.values()].filter(e=>!e.guest).sort((p,q)=>q.total-p.total)[0];
 setScene({name:'tally',cast:false,draw(g,W,H,t,fs){const pic=SS.picture(H>W*1.15?'tally-bg-tall':'tally-bg')||SS.picture('tally-bg');if(pic){const k=Math.max(W/pic.width,H/pic.height),w=pic.width*k,h=pic.height*k;g.drawImage(pic,(W-w)/2,(H-h)/2,w,h);}else ST.drawStage(g,W,H,'wheel',t);
  const pw=Math.min(W*.92,fs*30),ph=Math.min(H*.8,fs*4+people.length*fs*4.2),px=W/2-pw/2,py=Math.max(56,(H-ph)/2);g.fillStyle='rgba(20,6,46,.9)';g.beginPath();g.roundRect(px,py,pw,ph,14);g.fill();g.strokeStyle='#ffd75a';g.lineWidth=3;g.stroke();
  txt(g,'TODAY\'S WINNINGS',W/2,py+fs*1.6,fs*1.5,'#ffe23a',{font:'"SC Bangers",Impact,sans-serif',w:400});
  people.forEach((e,i)=>{const y=py+fs*3.8+i*fs*4.2,a=ease((t-.5-i*.5)*2);if(a<=0)return;g.save();g.globalAlpha=a;P.face(g,s,e.who,px+fs*2.2,y,fs*2.6,e===best?'win':'normal');
   txt(g,e.name.toUpperCase()+(e.guest?' (GUEST)':''),px+fs*4.2,y-fs*.7,fs*1.05,e===best?'#ffe23a':'#fff',{align:'left',max:pw*.5});
   txt(g,e.lines.map(l=>l[0]).slice(0,4).join(' · ')||'—',px+fs*4.2,y+fs*.8,fs*.62,'#bfe7ff',{align:'left',max:pw*.52,w:800});
   const roll=Math.min(1,Math.max(0,(t-.8-i*.5)/1.4));txt(g,money(e.total*roll),px+pw-fs*1,y,fs*1.6,'#7dff5a',{align:'right',font:'"SC Bangers",Impact,sans-serif',w:400});g.restore();});}});
 ann('Let\'s see how everybody did today!',2400);sfx.applause?.(3,.8);await wait(3000);if(!s.alive)return;ann('Today\'s big winner...',1800);await wait(2000);if(!s.alive)return;
 show(`${best.name.toUpperCase()}!`,money(best.total)+' in cash and prizes',3.2,'#ffe23a');sfx.winner?.();vibrate([30,40,30]);await wait(3600);if(!s.alive)return;
 const scores=humans.map((h,i)=>entry({p:i}).total);
 // played alone: the result card is a personal best (no CPU line), like the other play-alone games
 if(alone&&s.solo){s.solo.kind='game';s.solo.alone=true;}
 s.finish(scores,`THE PRICE IS RIGHT · ${humans.map((h,i)=>`${hName(i)} ${money(scores[i])}`).join(' · ')}`);}
// the winner's family: characters from the same show/film as the winner (else anybody), up to four
function familyFor(id,R){const pool=facePool(),src=id&&character(id)?.source,same=src?pool.filter(f=>f!==id&&character(f)?.source===src):[],rest=pool.filter(f=>f!==id&&!same.includes(f));
 const pick=a=>a.splice(Math.floor(R()*a.length),1)[0],out=[];while(out.length<4&&same.length)out.push(pick(same));while(out.length<4&&rest.length)out.push(pick(rest));return out;}
Object.assign(exports,{episode,lineup,GAMES});
