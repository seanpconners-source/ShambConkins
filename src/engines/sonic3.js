// Sonic 3 rebuild (roadmap R59, plan docs/sonic3/PLAN.md): the game around the engine in src/engines/s3/. For now it
// plays the engine's TEST ZONE (s3/testZone.js) so the feel can be tried on a phone; Zone 1 replaces it later.
// Players take turns like the old Sonic game: P1 runs the act, then P2 (as Tails). Score = badniks + the Sonic 3 tally
// at the sign (time bonus + 100 a ring); higher wins. 1P: one run on your own. Full screen (fullBleed), physics at a fixed
// 60 steps a second, Mega Drive camera, the owner's Sonic 3 & Knuckles sounds and Sonic 3 soundtrack (sonicAudio.js):
// the act song starts with the title card (Act 1 = Sonic 1's Green Hill Zone, the owner's pick; the Test Zone = Azure Lake), Invincibility while a
// star lasts (then the act song from the top), the 1-Up jingle over it, Act Complete at the sign (the tally waits for it),
// Game Over / Time Over, silence on the hand-off cards; a respawn starts the act song again.
// Touch: drag anywhere on the left 55% = a floating d-pad (left/right run, down = crouch/roll/spin dash charge, up =
// look up); touch the right side = jump (hold for a full jump, tap in the air for the shield move / insta-shield).
// Keys: A/D/W/S or arrows to move, Space or Enter to jump.
const {settle,arenaKeys,arenaTouch,Countdown}=require("src/engines/arenaKit.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {soloFinish}=require("src/solo.js");
const S3=require("src/engines/sonicAudio.js");
const P=require("src/engines/s3/physics.js");
const O=require("src/engines/s3/objects.js");
const {Camera,FOCUS_Y}=require("src/engines/s3/camera.js");
const R=require("src/engines/s3/render.js");
const {buildTestZone}=require("src/engines/s3/testZone.js");
const {buildZone1Act1}=require("src/engines/s3/zone1.js");
const I=require("src/engines/s3/intro.js");

const STEP=1000/60,TIME_CAP=10*60*60,TALLY=60*4.2;
// Sonic 3 time bonus by the clock at the sign
const timeBonus=f=>{const s=f/60;return s<30?50000:s<45?10000:s<60?5000:s<90?4000:s<120?3000:s<180?2000:s<240?1000:s<300?500:0;};
const PCOL=['#78b6ff','#ffb85a'],NONE={l:false,r:false,u:false,d:false,jump:false,jumpPress:false};

async function sonic3(s){
 const [c,x]=s.canvas(900,600,{fill:true});const fb=fullBleed(s,{bg:'#000'});s.body.classList.add('drag-arena-body');
 if(!await settle(s))return;
 S3.open(s);s.cleanup(()=>S3.stopAll());
 const head=(g,i,cx,cy,size,mood)=>s.sprite(g,i,cx,cy,size,{exact:true,mood,noBadge:true});
 const turns=s.solo?[0]:[0,1],score=[0,0],result=[null,null];
 const zone1=s.game?.s3zone==='zone1',buildZone=zone1?buildZone1Act1:buildTestZone,LABEL=zone1?'Shamb Island Act 1':'Sonic 3 Test Zone',ACT_SONG=zone1?'green-hill':'azure-lake';// owner, Nov 11: Green Hill Zone for Act 1
 let turn=0,Z=null,w=null,p=null,cam=null,art=null,back=null,fx=null;
 let phase='idle',frames=0,clock=0,acc=0,last=0,card=0,endF=0,overLen=150,tally=null,overText='',dbg=null;const vis={x:0,y:0};
 // which runner each player is: 2P = P1 the hedgehog, P2 the fox; 1P = picked on the character select
 const bodies=['hog','fox'];
 // ---------------- title screen + 1P character select (intro.js draws them)
 const intro={t0:0,pick:0,slideAt:0,slideDir:0,go:null,skip:null};
 const introT=()=>(performance.now()-intro.t0)/1000;
 const waitIntro=()=>intro.skip?Promise.resolve():new Promise(r=>{intro.go=r;});
 const advance=()=>{const g=intro.go;intro.go=null;g?.();};
 function choose(d){intro.pick=(intro.pick+d+I.CHARS.length)%I.CHARS.length;intro.slideAt=performance.now();intro.slideDir=d;S3.play('switch')||S3.play('starpost');}
 function introTap(px,py,dx){if(introT()<.45)return;
  if(phase==='title'){advance();return;}
  if(Math.abs(dx)>40){choose(dx<0?1:-1);return;}
  const h=I.selectHit(s.W,s.H,px,py);if(h==='prev')choose(-1);else if(h==='next')choose(1);else{S3.play('starpost');advance();}}
 async function introScreens(){intro.t0=performance.now();phase='title';S3.jingle('title');await waitIntro();
  if(s.solo){S3.stopJingle();phase='select';intro.t0=performance.now();if(intro.skip)intro.pick=intro.skip.pick|0;else{S3.music('data-select');await waitIntro();}bodies[0]=I.CHARS[intro.pick].body;}
  S3.stopJingle();S3.music(null);press=false;phase='idle';return s.alive;}
 function introFrame(){const W=s.W,H=s.H;S3.tick();if(phase==='select')S3.music('data-select');
  // the title theme is one 15 s piece: after it ends and 4 s of quiet, it plays again
  if(phase==='title'){if(S3.nowPlaying().jingle)intro.quietAt=0;else if(!intro.quietAt)intro.quietAt=performance.now();else if(performance.now()-intro.quietAt>4000){intro.quietAt=0;S3.jingle('title');}}
  if(phase==='title')I.drawTitle(x,W,H,introT(),{head,i:0,foxI:s.players[1]?1:null,mode:s.solo?'1 PLAYER':'2 PLAYERS'});
  else{const k=Math.max(0,1-(performance.now()-intro.slideAt)/350);I.drawSelect(x,W,H,introT(),{pick:intro.pick,slide:k*intro.slideDir,head,i:0});}}
 // ---------------- input
 const kb=arenaKeys(s),inp={l:false,r:false,u:false,d:false,jump:false,jumpPress:false};let press=false;
 kb.onDown((i,k)=>{if(phase==='title'){if(k==='fire'&&introT()>.45)advance();return;}
  if(phase==='select'){if(k==='l')choose(-1);else if(k==='r')choose(1);else if(k==='fire'&&introT()>.45){S3.play('starpost');advance();}return;}
  if(k==='fire')press=true;});
 const pad={stick:null,jump:null};
 arenaTouch(s,{owner:()=>turns[turn]??0,maxFingers:3,
  onDown:f=>{if(phase==='title'||phase==='select'){f.data.role='intro';f.data.x0=f.x;return;}
   if(f.x>s.W*.55){f.data.role='jump';pad.jump=f;press=true;}else{f.data.role='stick';pad.stick=f;}},
  onMove:f=>{if(f.data.role!=='stick')return;const dx=f.x-f.sx,dy=f.y-f.sy,lim=60,d=Math.hypot(dx,dy);if(d>lim){f.sx=f.x-dx*lim/d;f.sy=f.y-dy*lim/d;}},
  onUp:f=>{if(f.data.role==='intro'){if(phase==='title'||phase==='select')introTap(f.x,f.y,f.x-f.data.x0);return;}
   if(pad.jump===f)pad.jump=null;if(pad.stick===f)pad.stick=null;}});
 function readInput(){const [a,b]=kb.state;let l=a.l||b.l,r=a.r||b.r,u=a.u||b.u,d=a.d||b.d,j=a.fire||b.fire;
  const st=pad.stick;if(st){const dx=st.x-st.sx,dy=st.y-st.sy;if(dx>12)r=1;if(dx<-12)l=1;if(dy>22&&Math.abs(dy)>Math.abs(dx)*.7)d=1;if(dy<-24&&Math.abs(dy)>Math.abs(dx)*.7)u=1;}
  if(pad.jump)j=1;
  if(dbg?.bot){const b=dbg.bot(p,frames);l=b.l;r=b.r;u=b.u;d=b.d;j=b.jump;if(b.press)press=true;}
  inp.l=!!l&&!r;inp.r=!!r&&!l;inp.u=!!u;inp.d=!!d;inp.jump=!!j||press;inp.jumpPress=press;press=false;}
 // ---------------- sounds + effects from the world's events
 const SOUND={jump:'jump',dash:'dash',skid:'skid',roll:'roll','insta-shield':'insta-shield','fire-dash':'fire-dash','lightning-jump':'lightning-jump','bubble-bounce':'bubble-bounce',
  spring:'spring',explode:'explode',monitor:'explode','ring-loss':'ring-loss',die:'hurt',hurt:'hurt',shield:'shield','fire-shield':'fire-shield','bubble-shield':'bubble-shield',
  'lightning-shield':'lightning-shield',starpost:'starpost',sign:'signpost',break:'break',deflect:'bumper'};
 function events(){for(const e of w.drain()){
  if(e.k==='ring')S3.ring();else if(e.k==='rev')S3.rev(p.rev);else if(SOUND[e.k]){if(e.k==='ring-loss'&&e.why==='spike')S3.play('spike');S3.play(SOUND[e.k]);}
  if(e.k==='ring')fx.sparkle(p.x,p.y-10);
  if(e.k==='explode'){fx.puff(e.x,e.y);fx.score(e.x,e.y-12,e.pts);}
  if(e.k==='monitor')fx.puff(e.x,e.y);
  if(e.k==='break')fx.debris(e.x,e.y);
  if(e.k==='skid')fx.dust(p.x,p.y+18,Math.sign(p.gsp));
  if(e.k==='dash')cam.dash((Math.abs(p.gsp)-8)*2);
  if(e.k==='sign'&&!tally){S3.music(null);const sang=S3.jingle('act-clear');
   tally={time:timeBonus(clock),rings:(p.rings|0)*100,t:0,clock,len:Math.max(TALLY,sang?Math.ceil(S3.jingleLen('act-clear')*60)+20:0)};S3.play('signpost');}
  if(e.k==='life')S3.jingle('1up');
  if(e.k==='die'){overText=p.lives<=0?'GAME OVER':'';}}}
 // the song this moment wants: the act song from the title card on, Invincibility while a star lasts
 const songFor=()=>(phase==='card'||phase==='play')&&!tally?(p.star>0&&!p.dead?'invincible':ACT_SONG):null;
 function gameOver(text){overText=text;phase='over';S3.music(null);const sang=S3.jingle('game-over');endF=0;overLen=Math.max(150,sang?Math.ceil(S3.jingleLen('game-over')*60)+20:0);}
 // ---------------- a turn
 async function startTurn(k,{noCard=false}={}){turn=k;const i=turns[k],nm=s.players[i].name;
  const desc=zone1&&s.solo?`Shamb Island Zone, Act 1. Roll tunnels, loops, high ledges, a cave, lakes and waterfalls. Reach the sign: time bonus + 100 a ring.`
   :s.solo?`Sonic 3 engine test: run the Test Zone. Loops, springs, shields, badniks, a zip line and a swing vine. Reach the sign: time bonus + 100 a ring.`
   :k===0?`${nm} runs first as Seanic the hedgehog. Reach the sign at the end: badniks + time bonus + 100 a ring. Then ${s.players[1].name} runs it as the three-tailed fox, who can fly.`
   :`${nm}, you're the fox: tap jump again in the air to fly, hold it to climb. Beat ${s.players[0].name}'s ${score[0].toLocaleString()} points.`;
  if(!noCard&&!await s.pass(i,desc,'Ready',{summary:k?`${s.players[0].name}: ${score[0].toLocaleString()}`:null}))return false;
  Z=buildZone();w=new O.World(Z.T,Z.objs,{switchers:Z.switchers,bottom:Z.bottom});
  p=P.makeRunner(Z.start.x,Z.start.y);p.body=bodies[i]||'hog';p.canFly=p.body==='fox';p.rings=0;p.lives=3;p.score=0;p.facing=1;
  cam=new Camera(Z.bounds);cam.resize(s.W,s.H);cam.snap(p);
  art=art||new R.TerrainArt(Z.T);back=back||new R.Backdrop();fx=new R.Fx();art.warm(cam);
  frames=0;clock=0;acc=0;last=performance.now();card=0;vis.x=vis.y=0;endF=0;tally=null;overText='';phase='card';return true;}
 function endTurn(){const i=turns[turn];score[i]=(p.score|0)+(tally?tally.time+tally.rings:0);result[i]={got:!!tally,clock:tally?tally.clock:clock,score:score[i]};
  s.setScores(score);}
 async function next(){endTurn();S3.music(null);
  if(turn+1<turns.length){phase='idle';if(await startTurn(turn+1))return;return;}
  phase='done';const r0=result[0];
  if(s.solo){soloFinish(s,score[0],r0.got?1:0,`${LABEL}: ${score[0].toLocaleString()} points${r0.got?` (through in ${R.fmtTime(r0.clock)})`:''}.`,r0.got);return;}
  const win=score[0]===score[1]?-1:score[0]>score[1]?0:1;if(win>=0)s.react(win,'win');
  s.finish(score,`${LABEL}: ${s.players[0].name} ${score[0].toLocaleString()}, ${s.players[1].name} ${score[1].toLocaleString()}.`);}
 // ---------------- one physics frame
 function stepFrame(){frames++;
  if(phase==='card'){card++;if(card>=100)phase='play';}
  readInput();const ctl=phase==='play'&&!tally?inp:NONE;// after the sign the runner coasts to a stop
  const px=p.x,py=p.y,roll=p.rolling;
  w.step([p],[ctl]);
  // a ground snap the speed doesn't explain (landing back on a loop's curve, a floor/wall mode change) is drawn eased
  // out over a few frames; the physics position stays exact
  vis.x*=.6;vis.y*=.6;if(p.ground&&!p.onObj&&!p.hang&&!p.dead&&roll===p.rolling){const ux=p.x-px-p.xsp,uy=p.y-py-p.ysp,u=Math.hypot(ux,uy);if(u>3&&u<40){vis.x-=ux;vis.y-=uy;}}
  if(Math.hypot(vis.x,vis.y)<.3)vis.x=vis.y=0;
  if(phase==='play'&&!tally&&!p.dead)clock++;
  events();fx.step();cam.update(p);
  if(p.dead&&p.dead>=120&&phase==='play'){if((p.lives|0)<=0)gameOver('GAME OVER');else{O.respawn(p,{x:Z.start.x,y:Z.start.y});p.y-=1;cam.snap(p);S3.restart();}}
  if(tally){tally.t++;if(tally.t===tally.len-60)S3.play('register');if(tally.t>=tally.len)return 'next';}
  if(phase==='over'){if(++endF>overLen)return 'next';}
  if(phase==='play'&&clock>=TIME_CAP)gameOver('TIME OVER');
  return null;}
 // ---------------- drawing
 function draw(t){const W=s.W,H=s.H;if(cam.W!==W||cam.H!==H){cam.resize(W,H);cam.clampIn();}
  x.save();x.imageSmoothingEnabled=false;back.draw(x,cam,t,Z.start.y-cam.vh*FOCUS_Y);
  const k=cam.k,cx=Math.round(cam.x*k)/k,cy=Math.round(cam.y*k)/k,v=cam.view(64);
  const scenery=front=>{if(!Z.decor)return;x.save();x.scale(k,k);x.translate(-cx,-cy);for(const d of Z.decor)if(!!d.front===front&&(d.box?d.box[0]<v.x1&&d.box[2]>v.x0:d.x<v.x1+80&&d.x+(d.w||0)>v.x0-80))R.drawDecor(x,d,t);x.restore();};
  scenery(false);art.draw(x,cam,2);scenery(true);x.restore();
  x.save();x.scale(k,k);x.translate(-cx,-cy);
  for(const o of w.objs)if(!o.gone||o.type==='monitor'){const ox=o.x??o.x0,oy=o.y??o.y0;if(o.type==='tube')continue;if(o.type!=='zipline'&&(ox<v.x0-80||ox>v.x1+80||oy<v.y0-140||oy>v.y1+140))continue;R.drawObject(x,o,t,{head,me:turns[turn]});}
  for(const r of w.loose)if(r.x>v.x0&&r.x<v.x1)R.drawLoose(x,r,t);
  for(const sh of w.shots)R.drawShot(x,sh,t);
  p.x+=vis.x;p.y+=vis.y;R.drawRunner(x,p,turns[turn],t,head);p.x-=vis.x;p.y-=vis.y;
  fx.draw(x);x.restore();
  // HUD
  const i=turns[turn];R.drawHUD(x,W,H,{score:(p.score|0)+(tally?Math.round((tally.time+tally.rings)*Math.min(1,tally.t/(tally.len-80))):0),rings:p.rings},tally?tally.clock:clock,{name:s.players[i].name.toUpperCase(),color:PCOL[i]});
  R.drawLives(x,W,H,p,i,head);
  drawPad(W,H);
  if(phase==='card')R.drawTitleCard(x,W,H,card,`${Z.zone}`,Z.act);
  if(tally)drawTally(W,H,i);
  if(overText&&(phase==='over'||p.dead))banner(overText,W,H);
 }
 const FONT='italic 900 %spx "Arial Black",Impact,system-ui,sans-serif';
 function banner(text,W,H){const sz=Math.round(Math.min(W/9,H/7,60));x.save();x.font=FONT.replace('%s',sz);x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=Math.max(4,sz*.16);x.strokeStyle='#08103a';x.strokeText(text,W/2,H*.42);x.fillStyle='#fff';x.fillText(text,W/2,H*.42);x.restore();}
 function drawTally(W,H,i){const T=tally.t,sz=Math.round(Math.min(W/16,H/11,34)),k=Math.min(1,Math.max(0,(T-30)/(tally.len-110))),slide=Math.min(1,T/30);x.save();x.font=FONT.replace('%s',sz);x.textBaseline='middle';x.lineJoin='round';x.lineWidth=Math.max(4,sz*.18);x.strokeStyle='#08103a';
  const L=(txt,col,yy,align,xx)=>{x.textAlign=align;x.strokeText(txt,xx,yy);x.fillStyle=col;x.fillText(txt,xx,yy);};
  const cxm=W/2,y0=H*.3;L(`${s.players[i].name.toUpperCase()} GOT`,'#fff',y0,'center',cxm-(1-slide)*W);L('THROUGH ACT 1','#fff',y0+sz*1.2,'center',cxm+(1-slide)*W);
  const rows=[['TIME BONUS',Math.round(tally.time*(1-k))],['RING BONUS',Math.round(tally.rings*(1-k))],['TOTAL',Math.round((tally.time+tally.rings)*k)]];
  rows.forEach(([lab,val],r)=>{const yy=y0+sz*(2.8+r*1.25);L(lab,'#ffe23a',yy,'left',cxm-sz*6);L(String(val),'#fff',yy,'right',cxm+sz*6);});x.restore();}
 function drawPad(W,H){if(phase!=='play')return;const coarse=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;if(!coarse&&!pad.stick&&!pad.jump)return;
  const u=Math.min(W,H)/390,r0=44*u,st=pad.stick;x.save();
  const bx=st?st.sx:W*.16,by=st?st.sy:H-r0*1.9;x.globalAlpha=st?.45:.18;x.strokeStyle='#fff';x.lineWidth=3;x.beginPath();x.arc(bx,by,r0,0,7);x.stroke();
  x.fillStyle='#fff';x.globalAlpha=st?.55:.22;x.beginPath();x.arc(st?st.x:bx,st?st.y:by,r0*.42,0,7);x.fill();
  const jx=W-r0*1.9,jy=H-r0*1.9;x.globalAlpha=pad.jump?.55:.2;x.beginPath();x.arc(jx,jy,r0*.9,0,7);x.fill();x.globalAlpha=pad.jump?.9:.5;x.fillStyle='#08103a';x.font=`900 ${Math.round(r0*.55)}px Arial Black,Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText('JUMP',jx,jy+1);x.restore();}
 // ---------------- tests
 s.debug={get state(){return {phase,frames,clock,turn,p,w,cam,score:[...score],tally};},
  set bot(f){dbg={...(dbg||{}),bot:f};},teleport(px,py){Object.assign(p,{x:px,y:py,xsp:0,ysp:0,gsp:0,ground:false});cam.snap(p);},skipCard(){card=100;phase='play';},
  rings(n){p.rings=n;},player(i){turns[turn]=i;p.body=i===1?'fox':'hog';p.canFly=i===1;},chunks:()=>art?.cache.size||0,music:()=>S3.nowPlaying(),seekSong:t=>S3.seekSong(t),SONGS:S3.SONGS,
  // tests: past the title (and the 1P select, picking CHARS[pick]: 0 hedgehog, 1 fox)
  skipIntro(pick=0){intro.skip={pick};intro.pick=pick;advance();},intro:()=>({phase,pick:intro.pick,t:introT()}),introTap,choose,get body(){return p?.body||null;}};
 s.frame((dt,t)=>{if(!s.alive)return;if(phase==='title'||phase==='select'){introFrame();return;}if(phase==='idle'||phase==='done')return;
  const now=performance.now();acc+=Math.min(100,now-last);last=now;let n=0,res=null;
  while(acc>=STEP&&n<4&&!res){acc-=STEP;n++;res=stepFrame();}
  if(n===4)acc=0;
  S3.tick();S3.music(songFor());
  draw(t);
  if(res==='next'){phase='idle';next();}});
 if(!await introScreens())return;
 if(!await startTurn(0,{noCard:!!s.solo}))return;
}
Object.assign(exports,{sonic3});
