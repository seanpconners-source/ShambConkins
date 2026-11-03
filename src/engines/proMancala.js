// Tony Hawk's Pro Mancala (game id greed-island-mancala, engine 'mancala'). The Kalah rules, CPU, online relay and
// hot-seat flow are the old Greed Island game's (strategyRules.js mancalaMove, cpuBoards pickMancala, classicBoards
// netTurns); everything seen and heard is new: a title sequence (Tony... Hawk's... Pro... Mancala... EXTREME
// EDITION!!) over a snare roll that explodes into original skate punk, a skateboard-deck board with glass gems that fills
// the screen (turned upright on tall screens), a THPS2-style screen around it (score, special meter, trick strings with
// multipliers, COMBO!!! on every store landing, bails when you get robbed or set the other player up, the special trick),
// 90s fisheye camera cutaways to the player's big-head skater on a halfpipe for big moves and slams, guest skaters
// going by all the time, and an end-of-run tally. Trick points are just for show: the stores decide the winner.
const {newMancala,mancalaMoves,mancalaMove}=require("src/engines/strategyRules.js");
const {isCpu,cpuHotseat}=require("src/engines/cpuKit.js");
const B=require("src/engines/cpuBoards.js");
const {netTurns}=require("src/engines/classicBoards.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {store}=require("src/state.js");
const {saveProfile}=require("src/profile.js");
const audio=require("src/audio.js");
const {USER_PORTRAITS,isRasterArt}=require("src/data/userPortraits.js");
const A=require("src/engines/proMancalaArt.js");
const SP=require("src/engines/proMancalaSpots.js");
const {fullscreenSupported,toggleFullscreen,fullscreenLabel}=require("src/fullscreen.js");
const S=require("src/engines/proMancalaAudio.js");
const {thps,clamp}=A;
const TAU=Math.PI*2;
const wait=(s,ms)=>s.wait?s.wait(ms):s.delay(ms);
const pickOf=list=>list[Math.floor(Math.random()*list.length)];
const fmt=n=>Math.round(n).toLocaleString('en-US');
const ease=t=>t<.5?2*t*t:1-(-2*t+2)**2/2;

// ------------------------------------------------------------------ trick vocabulary
const FLIPS=[['Ollie',{}],['Kickflip',{flip:1}],['Heelflip',{flip:-1}],['Pop Shove-It',{shove:1}],['Varial Kickflip',{flip:1,shove:1}],['Hardflip',{flip:1,shove:-1}],
 ['360 Flip',{flip:1,shove:2}],['Impossible',{flip:1,boardSpin:1}],['Varial Heelflip',{flip:-1,shove:1}],['Double Kickflip',{flip:2}],['Inward Heelflip',{flip:-1,shove:-1}],
 ['Laser Flip',{flip:-1,shove:2}],['Triple Kickflip',{flip:3}],['Ghetto Bird',{flip:1,shove:1,spin:.5}],['Kickflip Underflip',{flip:2,shove:1}],['Hospital Flip',{flip:1.5,shove:1}]];
const GRABS=['Indy','Melon','Madonna','Benihana','Judo','Stalefish','Method','Airwalk','Crossbone','Rocket Air','Japan Air','Tailgrab'];
const GRINDS=['50-50','5-0 Grind','Nosegrind','Crooked Grind','Smith Grind','Feeble Grind','Bluntslide','Tailslide','Overcrook','Salad Grind','Suski Grind','Noseblunt','Boardslide','Lipslide'];
// how each grind sits on a rail/curb/coping in the cutaways: which point touches (u along the board: + = nose),
// the board's tilt (+ = nose down), truck or deck contact, and a sideways turn of the board
const GRIND_POSE={'5050':{c:0,tilt:0},'50':{c:-.89,tilt:-.24},nose:{c:.89,tilt:.24},crook:{c:.89,tilt:.22,shove:.35},smith:{c:-.89,tilt:.3,shove:-.3},feeble:{c:-.89,tilt:.12,shove:.5},
 board:{c:0,tilt:0,deck:true,end:true},blunt:{c:-1.4,tilt:-.5,deck:true},tail:{c:-1.45,tilt:-.08,deck:true}};
const grindKind=n=>/^50-50/.test(n)?'5050':/^5-0|Suski/.test(n)?'50':/^Nose ?grind/i.test(n)?'nose':/Crook/.test(n)?'crook':/Smith|Salad/.test(n)?'smith':/Feeble/.test(n)?'feeble':/Blunt/.test(n)?'blunt':/Tail/.test(n)?'tail':/Board|Lip/.test(n)?'board':'5050';
const SPECIALS=['THE 900','McTWIST','CHRIST AIR','KICKFLIP McTWIST','THE 1080','SACKTAP','FRONTFLIP','BARREL ROLL','HANDSTAND KICKFLIP','THE MANCALA 900','FINGERFLIP AIRWALK'];
const GOOD=['RADICAL!','BADASS!','SICK!','GNARLY!','TUBULAR!','SHRED IT!',"RIPPIN'!",'BOOYAH!','DUDE!!','HELL YEAH!','HOLY SHIT!','FUCK YEAH!','SICK AS FUCK!','GODDAMN!','SHIT-HOT!',
 'RAD AS HELL!','NO FUCKING WAY!','KILLER!','STOKED!','EPIC!','FILTHY!','STEEZY!','GNAR GNAR!','HUCK IT!','DOPE!','BALLER!','MOTHERFUCKIN RAD!','PURE SHRED!','BITCHIN!',
 'HOLY FUCKING SHIT!!','WAY TO GO BITCH!!!','FUCK ME SIDEWAYS!','GODDAMN LEGEND!','THAT WAS FILTHY AS FUCK!','SHIT YEAH!','BADASS MOTHERFUCKER!','SICK SHIT, DUDE!','FUCKING TUBULAR!',
 'HELL TO THE YES!','YOU NASTY BITCH!','OH SHIT OH SHIT!','HOLY SHITBALLS!','STRAIGHT FIRE!','UNREAL!','MENTAL!','BONKERS!','RIDICULOUS!','LEGENDARY!','GODLY!','INSANE IN THE MEMBRANE!',
 'SEND IT!','SENT IT!','FULL SEND!','STOMPED IT!','BOLTS!','CLEAN AS FUCK!','BUTTERY!','SMOOTH OPERATOR!','PURE STEEZ!','SKATE AND DESTROY!','NOT TODAY, GRAVITY!','PHYSICS IS A SUGGESTION!',
 'MOM, GET THE CAMERA!','CALL YOUR MOM!','TELL YOUR FRIENDS!','PUT IT ON THE TAPE!','SPONSOR ME!','HALL OF FAME!','WORLD RECORD!','THE CROWD GOES WILD!','DADDY LIKES!','MAMA LIKES!',
 'GET SOME!','EAT IT!','SUCK IT!','TAKE THAT, BITCH!','SAY HELLO TO MY LITTLE STORE!','GEMS FOR DAYS!','MANCALA GOD!','MANCALA MOTHERFUCKER!','STONE COLD!','ROCK SOLID!','GEM-TASTIC!',
 'COWABUNGA!','BODACIOUS!','RADICAL, DUDE!','MOST EXCELLENT!','PARTY ON!','WICKED!','WICKED SICK!','RAD-ICAL!','HARDCORE!','PUNK AS FUCK!','OI OI OI!','HELL FUCKING YEAH!','FUCKIN A!',
 'SIIICK!','DUUUDE!','WHOA!!','YEEEAH BUDDY!','LIGHT WEIGHT, BABY!','SHOW-OFF!','DAMN, DANIEL!','CHEF\'S KISS!','NAILED IT!','CRUSHED IT!','KILLED IT!','DESTROYED!','OBLITERATED!',
 'NEXT LEVEL!','10/10!','PERFECT 10!','THE JUDGES LOVE IT!','PRO MOVE!','BIG BRAIN!','GALAXY BRAIN!','NO WAY, JOSE!','GET WRECKED!','BOW DOWN!','KNEEL, PEASANTS!','ICONIC!'];
const BAD=['BAIL!','SLAMMED!','EAT SHIT!','OUCH!','BRUTAL!','FACEPLANT!','DAMN SON!','YARD SALE!','SHIT!','GRAVEL RASH!','THAT HAD TO HURT!','KISS THE CONCRETE!','WHAT THE HELL WAS THAT?!',
 'HOLY FUCKING SHIT, ARE YOU OK?!','THAT\'S GONNA LEAVE A MARK!','CALL AN AMBULANCE!','NOT YOUR DAY, BITCH!','SWING AND A MISS!','WHOOPS!','OOF!','BIG OOF!','FUCK!','GODDAMMIT!',
 'MY BALLS!','SHIT THE BED!','AW HELL NAH!','EMBARRASSING!','TRAGIC!','CRINGE!','DENIED!','REJECTED!','GET UP, PUSSY!','WALK IT OFF!','RUB SOME DIRT ON IT!','HOSPITAL BOUND!',
 'CONCRETE SANDWICH!','SLAM CITY!','HELLO PAVEMENT!','BRUISED EGO!','BROKEN DREAMS!','THE CROWD IS LAUGHING!','YOU SUCK!','BOOOO!','WHAT A DISASTER!','SKILL ISSUE!','TRY AGAIN, LOSER!'];
const COMBO_WORDS=['COMBO!!!','COMBO x3!!!','MEGA COMBO!!!!','SICK COMBO!!!!!','INSANE COMBO!!!!!!','GODLIKE COMBO!!!!!!!'];
const PCOL=['#ff3b30','#2f8bff'];

// ------------------------------------------------------------------ layout: the board is the focus and fills the screen
// Tall screens turn the deck upright (player 1's bowls the left column, their store at the bottom; player 2's the right
// column, store at the top). Wide screens lay it flat (player 1's bowls along the bottom, store on the right).
function layout(W,H,pillsW=130){const hu=clamp(Math.min(W,H)/24,11,30);
 // both score panels always get a strip of their own above/below the board (hudH tall): the board shrinks to make room
 const hudH=hu*5.1+10,ext0=.3*.249;
 // the deck stands upright or lies flat, whichever makes it bigger (near-square screens like an open Fold lie flat)
 const lenV=Math.min(H*.7,(W*.62)/.249,(H-2*hudH)/(1+ext0)),lenH=Math.min(W*.93,(H*.44)/.249,((H-2*hudH)/1.31)/.249);
 const vertical=H>W&&lenV>lenH,lay={W,H,vertical,hu,pillsW,hudH};
 if(vertical){const geo=A.deckGeometry(lenV),L=geo.L,D=geo.D,ext=geo.edge+geo.wheel*.9,top=Math.max(hudH,(H-L-ext)/2);
  Object.assign(lay,{geo,bx:W/2,by:top+L/2,top,bottom:top+L+ext});const colW=(W-D)/2;
  lay.band=[{x:0,y:lay.bottom,w:W,h:H-lay.bottom},{x:0,y:0,w:W,h:top}];
  lay.hud=[{x:10,y:lay.bottom+4},{x:10,y:6}];
  const cw=Math.max(0,colW-16),ch=Math.min(cw*1.25,L*.42);lay.card=[{x:8,y:top+L-ch-4,w:cw,h:ch},{x:W/2+D/2+8,y:top+4,w:cw,h:ch}];
  // trick strings and banners sit in the player's own column, in the part their card leaves free (never on the deck)
  const c0=lay.card[0],c1=lay.card[1];lay.side=[{x0:6,y0:top+hu*1.6,x1:W/2-D/2-6,y1:c0.y-4},{x0:W/2+D/2+6,y0:c1.y+c1.h+4,x1:W-6,y1:top+L-hu*.4}];
  lay.cones=[[W/2-D*.5-colW*.5,top+L*.06,hu*.9],[W/2+D*.5+colW*.5,top+L*.96,hu*.8]];
 }else{const geo=A.deckGeometry(lenH),L=geo.L,D=geo.D,ext=geo.edge+geo.wheel*.95,top=(H-D-ext)/2;
  Object.assign(lay,{geo,bx:W/2,by:top+D/2,top,bottom:top+D+ext});
  lay.band=[{x:0,y:lay.bottom,w:W,h:H-lay.bottom},{x:0,y:0,w:W,h:top}];
  lay.hud=[{x:10,y:lay.bottom+4},{x:10,y:6}];
  const ch=Math.min(top-10,240),cw=ch*.86;lay.card=[{x:W-cw-10,y:lay.bottom+5,w:cw,h:ch},{x:W-pillsW-cw,y:4,w:cw,h:ch}];
  // trick strings and banners sit in the player's own strip (bottom = player 1, top = player 2) right of the score,
  // over the face card if the gap beside it is too narrow (never on the deck)
  lay.side=[0,1].map(i=>{const b=lay.band[i],x0=10+hu*9.5,edge=i?W-pillsW-6:W-8,x1=lay.card[i].x-10>=x0+W*.35?lay.card[i].x-10:edge;return {x0,y0:b.y+(i?2:4),x1,y1:b.y+b.h-(i?4:2)};});
  lay.cones=[[W/2-L*.47,lay.bottom+hu*.6,hu],[W/2+L*.46,lay.bottom+hu*.7,hu*.9]];}
 lay.pipes=[];lay.horizon=Math.max(30,lay.top*(vertical?.8:.62));
 // the board's own rectangle on screen (overlays covering it fade back while someone is choosing a bowl)
 const g=lay.geo;lay.deckRect=vertical?{x0:lay.bx-g.D/2,y0:lay.top,x1:lay.bx+g.D/2,y1:lay.top+g.L}:{x0:lay.bx-g.L/2,y0:lay.top,x1:lay.bx+g.L/2,y1:lay.top+g.D};
 return lay;}

async function proMancala(s){
 // the page behind the canvas matches what is drawn at its edges (dark title, then sky over concrete), so the hairline a
 // fractional screen scale can leave at the top/bottom (an open Fold) doesn't show as a coloured line
 const [c,x]=s.canvas(900,600,{fill:true});fullBleed(s,{bg:'#07070a'});
 const PLAY_BG='linear-gradient(#1f6fd1 0 50%,#8f897f 50% 100%)',setBg=v=>s.body.closest('.game-shell')?.style.setProperty('--fb-bg',v);
 // a small full-screen toggle beside Pause/Exit (only where the browser allows it; the installed app is full screen already)
 let fsBtn=null,fsKey='';
 if(fullscreenSupported()){const shell=s.body.closest('.game-shell');if(shell){fsBtn=document.createElement('button');fsBtn.type='button';fsBtn.className='pm-fs';fsBtn.textContent=fullscreenLabel('icon');fsBtn.title='Full screen';fsBtn.setAttribute('aria-label','Toggle full screen');
  const css=document.createElement('style');css.textContent='.pm-fs{position:absolute;z-index:13;width:30px;height:30px;min-width:0;min-height:0;padding:0;margin:0;border-radius:999px;background:#000a;color:#fff;border:1px solid #ffffff40;box-shadow:none;font:700 15px/28px system-ui,sans-serif;text-align:center;cursor:pointer;opacity:.8}.pm-shell .fb-fs{display:none}';
  shell.classList.add('pm-shell');shell.append(css,fsBtn);s.cleanup(()=>{fsBtn.remove();css.remove();shell.classList.remove('pm-shell');});
  s.on(fsBtn,'pointerdown',e=>e.stopPropagation());s.on(fsBtn,'click',e=>{e.preventDefault();e.stopPropagation();toggleFullscreen();});
  const sync=()=>{fsBtn.textContent=fullscreenLabel('icon');};s.on(document,'fullscreenchange',sync);s.on(document,'webkitfullscreenchange',sync);}}
 function placeFs(){if(!fsBtn)return;const shell=fsBtn.parentElement,r=shell?.querySelector('.game-actions')?.getBoundingClientRect(),sr=shell?.getBoundingClientRect();if(!r||!sr||!r.width)return;
  const right=Math.round(sr.right-r.left+6),top=Math.round(r.top-sr.top+(r.height-30)/2),key=right+','+top;if(key===fsKey)return;fsKey=key;fsBtn.style.right=right+'px';fsBtn.style.top=top+'px';}
 let headOf=null;try{headOf=require("src/engines/broforce.js").headCanvas;}catch{}
 const charOf=i=>s.players[i]?.character||'';
 const nameOf=i=>s.players[i]?.name||('Player '+(i+1));
 // faces are drawn big here (cards, skaters, pose shots), so ask for sharp 400 px cut-outs (Broforce's default is 72 px)
 const head=(i,mood)=>headOf?headOf(charOf(i),mood||'normal',400):null;
 let state=newMancala(),busy=true,phase='intro',moveNo=0;const cpu=isCpu(s);
 const net=netTurns(s,{isTheirs:()=>phase==='play'&&!busy&&state.winner<0&&state.turn===s.online.remote,apply:m=>Number.isInteger(m.p)&&sow(m.p,true)}),theirs=()=>!!net&&state.turn===net.remote;
 const localTurn=()=>!(cpu&&state.turn===1)&&!theirs();
 // stones: every gem keeps its color and its little offset in the bowl
 const gr=A.rnd(9001),newStone=()=>({col:A.GEM_COLORS[Math.floor(gr()*A.GEM_COLORS.length)],jx:gr()-.5,jy:gr()-.5});
 const stones=Array.from({length:14},(_,i)=>i===6||i===13?[]:Array.from({length:4},newStone)),incoming=Array(14).fill(0);
 const flyers=[],pops=[],sparks=[],waits=[];let shake=0,flash=0,T=0;
 const until=f=>new Promise(r=>waits.push({f,r}));
 // per-player THPS state (trick points are cosmetic)
 const P=[0,1].map(i=>({points:0,shown:0,meter:0,ready:false,best:0,specials:0,bails:0,combos:0,mood:'normal',moodT:0,idleT:2+i*1.7,cardKick:0,cardShake:0,tallyT:0}));
 let combo=null,banner=null,track=null,lockT=0;
 const music=S.createSoundtrack(()=>s.paused||!s.alive);
 audio.stopMusic();s.cleanup(()=>{music.stop();if(store.profile?.settings?.music)try{audio.startMusic();}catch{}});
 const npcs=[];let npcT=4;
 const guestPool=Object.keys(USER_PORTRAITS).filter(k=>k.startsWith('photo:char:')).map(k=>k.slice(11)).filter(id=>id!==charOf(0)&&id!==charOf(1));
 let lay=null,deck=null,park=null,dpr=1,layKey='';
 function relayout(){const W=s.W,H=s.H;dpr=Math.min(2,window.devicePixelRatio||1);const key=W+'x'+H+'@'+dpr;if(key===layKey)return;layKey=key;lay=layout(W,H,fsBtn?172:130);deck=A.makeDeck(lay.geo,dpr,lay.vertical?'end':'side');park=A.makePark(W,H,dpr,lay);}
 // deck-local → screen (upright deck = turned 90° clockwise)
 const pitPos=i=>{const p=lay.geo.pits[i];return lay.vertical?{x:lay.bx-p.y,y:lay.by+p.x,rx:p.ry,ry:p.rx,store:p.store}:{x:lay.bx+p.x,y:lay.by+p.y,rx:p.rx,ry:p.ry,store:p.store};};
 const gemR=()=>lay.geo.pr*.31;
 function slot(i,k){const p=pitPos(i),r=gemR(),cap=Math.max(3,Math.floor(.62*(p.rx*p.ry)/(r*r))),layer=Math.floor(k/cap),j=k%cap+layer*.5,t=Math.sqrt((j+.5)/cap),a=j*2.39996+layer*1.1;
  return {x:p.x+Math.cos(a)*t*(p.rx-r*1.1),y:p.y+Math.sin(a)*t*(p.ry-r*1.1)-layer*r*.35};}

 // ---------------------------------------------------------------- feedback helpers
 function setMood(i,m,sec=2.4){P[i].mood=m;P[i].moodT=sec;}
 // Every popup is measured, kept fully on screen (shrunk if it would not fit) and placed where it covers no other text:
 // the HUDs, cards, trick string, turn banner, now-playing card, camcorder stamps and the other popups. Big ones
 // (COMBO!!!, BAIL!, STOLEN!...) always show, pushing small ones out of their way; a small one with nowhere free is dropped.
 const inter=(a,b)=>Math.max(0,Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0))*Math.max(0,Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0));
 function textRects(){const W=lay.W,H=lay.H,hu=lay.hu,r=[{x0:W-lay.pillsW,y0:0,x1:W,y1:46}];
  for(const i of [0,1]){const h=lay.hud[i];r.push({x0:h.x,y0:h.y,x1:h.x+hu*9.2,y1:h.y+hu*5.2});if(!cut){const c=lay.card[i];if(c.h>=36)r.push({x0:c.x,y0:c.y,x1:c.x+c.w,y1:c.y+c.h});}}
  const cl=comboLayout();if(cl)r.push(cl.rect);
  if(banner)r.push(bannerRect(banner.p));
  if(track){const tr=trackBox();r.push({x0:tr.x,y0:tr.y-hu*.9,x1:tr.x+tr.w,y1:tr.y+hu*1.1});}
  if(cut){r.push({x0:W*.45,y0:44,x1:W,y1:52+hu*3.2});r.push({x0:W-hu*14,y0:H-hu*3.2,x1:W,y1:H});if(cut.impact)r.push({x0:W*.2,y0:H*.4-hu*2.2,x1:W*.8,y1:H*.4+hu*2.2});}
  return r;}
 function pop(text,{x0=null,y0=null,px=null,col=null,dur=1.3,rot=null,big=false,bad=false,imp=big}={}){const W=lay.W,H=lay.H,hu=lay.hu;
  const pal=bad?[['#ff4040','#a00000'],['#ff7070','#c01010']]:[['#fff35c','#ff9d00'],['#7dfcff','#1d8bff'],['#ff7ce5','#ff1f6d'],['#b6ff4a','#16b000'],['#ffffff','#ffd000']];
  let size=px??hu*(big?2.6:1.5+Math.random()*.7);x.font=A.font(size);let w=x.measureText(text).width*.84*1.25+size*.3;if(w>W*.92){size*=W*.92/w;w=W*.92;}
  const r=rot??(Math.random()-.5)*.36,h=size*1.25+Math.abs(Math.sin(r))*w*.5+hu*.5;
  const fixed=textRects(),others=pops.map(p=>p.r),box=(cx,cy)=>({x0:cx-w/2,y0:cy-h/2,x1:cx+w/2,y1:cy+h/2});
  const cands=[],cl=(cx,cy)=>[clamp(cx,w/2+4,W-w/2-4),clamp(cy,h/2+4,H-h/2-4)];
  if(x0!=null)for(let k=0;k<24;k++){const a=k*2.4,d=k?h*.55*Math.sqrt(k):0;cands.push(cl(x0+Math.cos(a)*d*1.5,y0+Math.sin(a)*d));}
  for(let k=0;k<30;k++)cands.push(cl(W*(.06+Math.random()*.88),H*(.08+Math.random()*.84)));
  // no popup ever sits on the deck (wheels included) outside a cutaway
  const board=cut?null:{x0:lay.deckRect.x0-hu*.3,y0:lay.deckRect.y0-hu*.3,x1:lay.deckRect.x1+hu*.3,y1:lay.bottom};
  let best=null;for(const [cx,cy] of cands){const b=box(cx,cy);let o=board?inter(b,board)*60:0;for(const q of fixed)o+=inter(b,q);for(const q of others)o+=inter(b,q)*(imp?.5:2);if(!best||o<best.o)best={cx,cy,b,o};if(o===0)break;}
  if(best.o>0&&!imp)return;if(board&&inter(best.b,board)>0)return;
  if(imp)for(let j=pops.length-1;j>=0;j--)if(!pops[j].imp&&inter(best.b,pops[j].r)>0)pops.splice(j,1);
  pops.push({text,x:best.cx,y:best.cy,px:size,grad:col||pickOf(pal),dur,t:0,rot:r,vy:-hu*.4,r:best.b,imp});if(pops.length>14)pops.shift();}
 // while a human is choosing a bowl, whatever covers the board fades back so every bowl and count stays readable
 let chooseK=0;const veil=r=>r&&lay.deckRect&&inter(r,lay.deckRect)>0?1-.72*chooseK:1;
 function clearUnder(r){for(let j=pops.length-1;j>=0;j--)if(!pops[j].imp&&inter(r,pops[j].r)>0)pops.splice(j,1);}
 function popNear(i,text,o={}){const p=pitPos(i);pop(text,{x0:p.x+(Math.random()-.5)*p.rx,y0:p.y-p.ry-lay.hu*.6,px:lay.hu*.95,dur:.9,rot:0,...o});}
 function sparkBurst(x0,y0,n=14,sp=260,list=sparks){for(let k=0;k<n;k++){const a=-Math.PI*(.1+Math.random()*.8),v=sp*(.4+Math.random());list.push({x:x0,y:y0,vx:Math.cos(a)*v*(Math.random()<.5?-1:1),vy:Math.sin(a)*v,t:0,dur:.35+Math.random()*.4});}}
 function vibrate(ms){try{audio.vibrate(ms);}catch{}}
 // ---------------------------------------------------------------- the combo (THPS: tricks add up, the multiplier is the trick count)
 function comboAdd(i,tricks){if(!combo||combo.p!==i||combo.phase!=='live')combo={p:i,tricks:[],base:0,mult:0,phase:'live',t:0,chain:0};
  for(const t of tricks){combo.tricks.push(t.name);combo.base+=t.pts;combo.mult++;P[i].meter=Math.min(1,P[i].meter+t.pts/6000);}
  combo.t=0;S.sfx('text');clearUnder(comboLayout().rect);
  if(!P[i].ready&&P[i].meter>=1){P[i].ready=true;S.sfx('special');pop('SPECIAL!',{big:true,col:['#ffffff','#ffe600'],x0:lay.hud[i].x+lay.hu*5,y0:lay.hud[i].y+lay.hu*3.4,dur:1.6,rot:-.08});setMood(i,'silly');}}
 async function landCombo(){if(!combo||combo.phase!=='live')return;const i=combo.p,total=combo.base*Math.max(1,combo.mult);combo.phase='land';combo.t=0;combo.total=total;
  S.sfx('land-combo');P[i].best=Math.max(P[i].best,total);P[i].combos++;if(P[i].ready&&combo.usedSpecial){P[i].ready=false;P[i].meter=0;}
  const word=total>=20000?'GODLIKE!!!':total>=8000?'INSANE!!':total>=3000?pickOf(GOOD):total>=1200?pickOf(['NICE!','SWEET!','CLEAN!','SOLID!','RAD!']):null;if(word)pop(word,{big:total>=3000});
  await wait(s,850);P[i].points+=total;}
 async function bailCombo(why){if(!combo||combo.phase!=='live')return;const i=combo.p;combo.phase='bail';combo.t=0;P[i].bails++;P[i].meter=0;P[i].ready=false;
  pop(pickOf(BAD),{bad:true,big:true});if(why)pop(why,{bad:true,px:lay.hu*1.05,dur:2,y0:lay.H*.62,x0:lay.W/2,rot:0});
  setMood(i,'sad',3);P[i].cardShake=.6;vibrate(60);await cutTo(i,'bail',{name:'bail',bail:true,flip:1,h:.75});}

 // ---------------------------------------------------------------- a move
 function fly(st,from,to,{dur=.32,delay=0,h=null,land}={}){const a={...from},k=incoming[to]++;flyers.push({st,a,to,k,t:-delay,dur,h:h??(18+Math.hypot(a.x-pitPos(to).x,a.y-pitPos(to).y)*.22),land});}
 function plan(before,index,move,rng){const me=before.turn,mine=me?13:6,n=before.pits[index],trail=move.trail,last=trail[trail.length-1],out=[];
  const [fname,fanim]=FLIPS[Math.min(FLIPS.length-1,n-1)];let name=fname,anim={...fanim,name,h:.6+Math.min(.4,n*.04)};if(n>=5&&rng()<.65){name+=' to '+GRABS[Math.floor(rng()*GRABS.length)];anim.grab=true;}
  out.push({name,pts:100+n*75});
  const hits=trail.filter(t=>t===mine).length,gaps=hits-(last===mine?1:0);if(gaps>0)out.push({name:gaps>1?`Store Gap x${gaps}`:'Store Gap',pts:250*gaps});
  if(trail.some(t=>me===0?t>=7&&t<=12:t<=5))out.push({name:'Hip Transfer',pts:150});
  if(trail.length>=13)out.push({name:'Around The World Gap',pts:1000});
  if(move.captured){const gn=GRINDS[Math.floor(rng()*GRINDS.length)];out.push({name:gn+` (Steal ${move.captured})`,pts:300*move.captured});anim={...anim,gtype:grindKind(gn)};}
  if(last===mine&&!move.captured){out.push({name:'Store Landing',pts:500});const sty=['','airwalk','christ','rocket',''][Math.floor(rng()*5)];anim={...anim,name:'big',spin:sty==='christ'?0:sty?1:rng()<.5?1:1.5,grab:true,h:1.15,style:sty};}
  return {tricks:out,anim,cut:rng()<.4};}
 function threat(after){// the most the other player can bank at once after this move (captures, store landings)
  const opp=after.turn,st=opp?13:6;let best=0;for(const m of mancalaMoves(after)){const r=mancalaMove(after,m);if(r){const d=r.state.pits[st]-after.pits[st]+(r.extra?2:0);if(d>best)best=d;}}return best;}
 async function sow(index,remote=false){if(!remote&&s.paused||!s.alive||busy||phase!=='play'||theirs()&&!remote)return;const before=state,move=mancalaMove(state,index);if(!move)return;
  if(net&&!remote)net.send({p:index});busy=true;moveNo++;const me=before.turn,mine=me?13:6,rng=A.rnd(moveNo*131+index*17+7),pl=plan(before,index,move,rng);
  const n=before.pits[index],step=n<=6?.15:n<=12?.115:.085,from=pitPos(index);
  // lift the gems out of the bowl and sow them, one bowl after another
  const hand=stones[index].splice(0);S.sfx('ollie');S.sfx('flip');setTimeout(()=>S.sfx('catch'),260);
  const special=P[me].ready&&(move.extra||move.captured);
  move.trail.forEach((to,k)=>{const st=hand[k]||newStone();fly(st,{x:from.x+(Math.random()-.5)*from.rx*.6,y:from.y+(Math.random()-.5)*from.ry*.6},to,{delay:k*step,land:()=>{S.sfx('clack');
   if(to===mine){popNear(to,'+'+(to===move.trail[move.trail.length-1]?500:250),{col:['#fff35c','#ff9d00']});if(k%2===0&&Math.random()<.5)pop(pickOf(GOOD),{px:lay.hu*1.2});}}});});
  await until(()=>!flyers.length);if(!s.alive)return;
  // capture: the last gem and everything opposite grind into the store; the robbed skater slams
  if(move.captured){const last=move.trail[move.trail.length-1],opp=12-last,victim=1-me;S.sfx('grind',.9);
   const take=[...stones[last].splice(0),...stones[opp].splice(0)];const src=[pitPos(last),pitPos(opp)];
   take.forEach((st,k)=>fly(st,k===0?src[0]:src[1],mine,{delay:k*.06,dur:.42,land:()=>S.sfx('clack',2)}));sparkBurst(pitPos(opp).x,pitPos(opp).y,22,320);
   pop('STOLEN!',{big:true,col:['#ffffff','#ff2d55']});pop(pickOf(GOOD));setMood(me,'win');setMood(victim,'angry',3);S.sfx('grunt');P[victim].cardShake=.7;P[victim].bails++;P[victim].meter*=.5;
   shake=Math.max(shake,8);vibrate(40);await until(()=>!flyers.length);if(!s.alive)return;
   comboAdd(me,pl.tricks);pl.tricks=[];
   await cutTo(me,'steal',{grind:true,gtype:pl.anim.gtype});if(!s.alive)return;pop(pickOf(BAD),{bad:true});await cutTo(victim,'bail',{name:'bail',bail:true,h:.55},true);if(!s.alive)return;}
  state=move.state;
  if(special){pl.tricks.push({name:'SPECIAL: '+SPECIALS[Math.floor(rng()*SPECIALS.length)],pts:3000});P[me].specials++;}
  comboAdd(me,pl.tricks);if(special&&combo)combo.usedSpecial=true;
  if(special){S.sfx('special');flash=.5;pop('SPECIAL TRICK!!',{big:true,col:['#ffffff','#38f2ff'],dur:1.8,rot:-.05});}
  // game over: sweep what's left into the stores
  if(state.winner>=0){for(let i=0;i<14;i++)if(i!==6&&i!==13&&stones[i].length){const dst=i<6?6:13,src=pitPos(i);stones[i].splice(0).forEach((st,k)=>fly(st,src,dst,{delay:k*.05+(i%7)*.08,dur:.5,land:()=>S.sfx('clack')}));}
   await until(()=>!flyers.length);syncStones();s.setScores([state.pits[6],state.pits[13]]);await landCombo();if(!s.alive)return;await wait(s,700);return endRun();}
  syncStones();s.setScores([state.pits[6],state.pits[13]]);s.react?.(state.turn,move.extra?'happy':'thinking');
  if(move.extra){// COMBO!!!
   combo.chain++;const lv=combo.chain;S.sfx('combo',lv);shake=Math.max(shake,8+lv*3);flash=.35;vibrate(30+lv*15);
   pop(COMBO_WORDS[Math.min(COMBO_WORDS.length-1,lv-1)],{big:true,px:lay.hu*(2.6+lv*.45),x0:lay.W/2,y0:lay.H*.45,col:['#ffffff','#ffd000'],dur:1.8,rot:(Math.random()-.5)*.2});
   pop(pickOf(GOOD),{big:true});pop(pickOf(GOOD));setMood(me,'win');setMood(1-me,lv>1?'angry':'sad');P[me].cardKick=1;
   sparkBurst(pitPos(mine).x,pitPos(mine).y,26,380);await wait(s,450);await cutTo(me,special?'special':'combo',special?{name:'special',special:true,spin:2.5,h:1.6,grab:true}:pl.anim);busy=false;return;}
  // the turn is over: land the combo, or slam if this move hands the other player a big one
  const gained=state.pits[mine]-before.pits[mine],danger=threat(state);
  if(gained===0&&danger>=3)await bailCombo(danger>=6?'YOU JUST SET THEM UP!':'SLOPPY LANDING!');
  else{if(special||pl.cut)await cutTo(me,special?'special':'trick',special?{name:'special',special:true,spin:2.5,h:1.6,grab:true}:pl.anim);await landCombo();}
  if(!s.alive)return;turnBanner();busy=false;}
 function syncStones(){for(let i=0;i<14;i++){const d=state.pits[i]-stones[i].length;if(d>0)for(let k=0;k<d;k++)stones[i].push(newStone());else if(d<0)stones[i].splice(d);incoming[i]=0;}}
 function turnBanner(){const i=state.turn,who=theirs()?'THEIR TURN':nameOf(i).toUpperCase()+"'S TURN";banner={text:who,sub:theirs()?'PLAYING ON THEIR PHONE':cpu&&i===1?'':'TAP A GLOWING BOWL',t:0,dur:1.7,p:i};clearUnder(bannerRect(i));
  s.active=i;s.updateScores?.();if(!cpu&&!net)lockT=.55;S.sfx('whoosh',.35,true);}

 // ---------------------------------------------------------------- 90s fisheye camera cutaways to the player's skater
 // The skater lives on one halfpipe (world units, R ≈ 315) and only appears in these cuts.
 const cutGeo=A.pipeGeo({x:-700,y:-560,w:1400,h:700}),cutSparks=[],cutC=document.createElement('canvas'),cutG=cutC.getContext('2d');
 const SK=[0,1].map(()=>({ph:0,amp:1,mode:'ride',queue:[],air:null,bail:null,t:0,bd:null}));
 // Where the cut happens: the halfpipe, or a street spot (proMancalaSpots.js), never the same one twice in a row.
 let cut=null,lastSpot='';
 const STYLES=['follow','low','punch','orbit'],LSTYLES=['follow','low','punch','track'];
 const SPOTS={trick:['pipe','stairs','rail','curb','kicker'],combo:['pipe','kicker','stairs','rail'],special:['pipe','kicker'],steal:['rail','curb','pipe'],bail:['pipe','stairs','rail','kicker','curb']};
 function cutTo(p,kind,anim,quick=false,force=null){if(!lay||!s.alive)return Promise.resolve();return new Promise(res=>{
  const opts=SPOTS[kind].filter(v=>v!==lastSpot),spot=force||pickOf(opts.length?opts:SPOTS[kind]);lastSpot=spot;
  cut={p,kind,spot,t:0,res,ts:1,freeze:0,end:null,cam:null,landed:false,line:null,lt:0,lastPart:-1,bd:null,pose:null,hat:A.hatFor(),gtype:anim&&anim.gtype||pickOf(Object.keys(GRIND_POSE)),wantPose:kind==='combo'||kind==='special'||(kind!=='bail'&&Math.random()<.5)};
  if(spot==='pipe'){const k=SK[p],cross=1;k.queue=[];k.bd=null;k.amp=1;
   if(kind==='steal'){k.mode='grind';k.t=0;k.air={side:1,trick:anim};}else{k.mode='ride';k.t=0;k.ph=Math.PI/2-(quick?.25:.42)*Math.PI/cross;k.queue=[anim];}
   cut.style=kind==='bail'?'crash':kind==='special'?'orbit':pickOf(STYLES);cut.max=kind==='special'?4.2:3.4;}
  else{cut.line=SP.buildLine(spot,anim,kind==='bail');cut.style=kind==='bail'?'crash':kind==='special'?'punch':pickOf(LSTYLES);cut.max=cut.line.T+.4;if(quick)cut.lt=.25;}
  S.sfx('cam');S.sfx('rollby',.8);flash=Math.max(flash,.5);});}
 // street spots: sounds when the run moves on to its next part (pop, grind, land, slam)
 function lineEvents(st){const k=cut,L=k.line;if(st.idx===k.lastPart)return;const prev=L.parts[st.idx-1],p=st.part;k.lastPart=st.idx;
  if(p.type==='air'){S.sfx('ollie');if(p.trick&&(L.tr.flip||L.tr.shove))S.sfx('flip');}
  else if(p.type==='grind'){S.sfx('land',.7);S.sfx(L.spot==='curb'?'grind-curb':'grind',p.t1-p.t0);}
  else if(p.type==='roll'&&prev&&prev.type==='air'){S.sfx('land',1.2);S.sfx('catch');if(prev.r0)S.sfx('revert');}
  else if(p.type==='slam'){S.sfx('bail');S.sfx('scratch');setTimeout(()=>S.sfx('aww'),350);k.freeze=.28;k.impact=1;shake=Math.max(shake,12);k.bd={x:st.x,y:st.y-SP.DEPTH*.5,vx:950,vy:-750,rot:0,vr:16};}}
 function stepBoard(b,dt,floor){b.vy+=2600*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.rot+=b.vr*dt;const fl=floor(b.x);if(b.y>fl){b.y=fl;b.vy*=-.35;b.vr*=.6;b.vx*=.8;if(Math.abs(b.vy)<80)b.vy=0;}}
 // a grind: put the board's contact point (a truck, or the deck for slides) on top of the rail/curb/coping, tilted per grind
 function grindPose(g,u,face,surf){const gk=GRIND_POSE[cut&&cut.gtype]||GRIND_POSE['5050'];g.translate(0,-surf);g.rotate(gk.tilt*face);g.translate(-gk.c*u*face,-(gk.deck?.22:.38)*u);
  return {face,crouch:.5,lean:-face*.1,arms:gk.end?[1.9,-.2,-1.9,.2]:[1.6,-.3,-1.6,.3],shove:gk.shove||0,boardEnd:!!gk.end,feet:gk.end?[[-u*.32,-u*.05],[u*.32,-u*.05]]:undefined};}
 function drawLineSkater(q,i,st,u){const L=cut.line,tr=L.tr,o=A.OUTFITS[i],hd=head(i,P[i].mood),y=st.y-SP.DEPTH*.5;q.save();
  if(cut.bd){q.save();q.translate(cut.bd.x,cut.bd.y);q.rotate(cut.bd.rot);A.drawBoard(q,u,o,cut.bd.rot*.5,0);q.restore();}
  q.translate(st.x,y);q.rotate(st.rot);let pose;
  if(st.mode==='slam')pose={crouch:.1,arms:[2.4,.5,-2.3,-.6],noBoard:true,face:1};
  else if(st.mode==='air'&&st.part.trick){const tau=st.tau,e=ease(tau),mid=Math.sin(Math.PI*tau),k=clamp((tau-.1)/.65,0,1);
   pose={face:1,crouch:.35+.55*mid,spin:(tr.spin||0)*TAU*e,flip:(tr.flip||0)*TAU*k,shove:(tr.shove||0)*Math.PI*k,grab:tr.grab&&tau>.2&&tau<.78,arms:tr.grab?[.4,-.3,-2.2,.3]:[2.4,-.6,-2.4,.6],
    boardY:(tr.flip||tr.shove)&&tau>.1&&tau<.75?u*.4*mid:0,boardRot:(tr.boardSpin||0)*TAU*k};
   if(tr.special){q.save();q.globalAlpha=.25;for(let j=1;j<=3;j++){q.save();q.translate(-j*u*1.1,j*u*.5);A.drawSkater(q,u,{...pose,spin:(tr.spin||0)*TAU*ease(clamp(tau-j*.04,0,1))},null,{...o,shirt:'#9ff6ff',shirt2:'#fff'});q.restore();}q.restore();}}
  else if(st.mode==='air')pose={face:1,crouch:.5+.3*Math.sin(Math.PI*st.tau),arms:[2.2,-.5,-2.2,.5]};
  else if(st.mode==='grind'){pose=grindPose(q,u,1,L.spot==='rail'?8:0);}
  else pose={face:1,crouch:.25+.1*Math.sin(T*7),arms:[1.2,-.5,-1,.5],lean:.06};
  SKD(q,u,st.mode==='air'&&st.part.trick?airStyle(pose,tr,st.tau,u):pose,hd,o);q.restore();}
 // the pose shot: a jump cut to the skater facing the camera, throwing up a pose, extreme fisheye close-up
 const POSE_T=1.3,CAPTIONS=['SPONSOR ME!','GET THE SHOT!','DID YOU FILM THAT?!','PRO MANCALA 4 LIFE','STOKED!','MANCALA OR DIE','HELL YEAH!','SKATE AND DESTROY','NO COMPLY!','TOTALLY RAD!','BRING IT!',"WHO'S NEXT?!"];
 function startPose(px,py){const k=cut;k.pose={t:0,x:px,y:py,kind:pickOf(['horns','point','arms','shaka','flex','boardup']),mood:pickOf(['silly','win','win']),caption:pickOf(CAPTIONS),tilt:(Math.random()-.5)*.35};
  flash=Math.max(flash,.6);shake=Math.max(shake,6);S.sfx('cam');S.sfx('hey');}
 // skaters in cutaways wear the cut's hat (guest skaters bring their own)
 const SKD=(g,u,pose,hd,o)=>A.drawSkater(g,u,cut&&hd&&!pose.hat?{...pose,hat:cut.hat}:pose,hd,o);
 // air styles on big tricks: airwalk (legs scissor, board kicked out), christ air (arms out, board held up)
 function airStyle(pose,tr,tau,u){if(!tr.style||tau<.18||tau>.82)return pose;const m=Math.sin(Math.PI*clamp((tau-.18)/.64,0,1));
  if(tr.style==='airwalk')return {...pose,grab:false,feet:[[-u*(.7+.8*m),-u*.12+u*.5*m],[u*(.7+.9*m),-u*.12-u*.45*m]],boardY:u*.9*m,boardRot:.35*m,arms:[2.4,-.4,-2.6,.5]};
  if(tr.style==='christ')return {...pose,grab:false,arms:[Math.PI/2+.1,0,-Math.PI/2-.1,0],feet:[[-u*.2,u*.55*m],[u*.2,u*.6*m]],boardHeld:{x:2.4,y:-2.4-m*.4,rot:-Math.PI/2+.2}};
  if(tr.style==='rocket')return {...pose,grab:true,feet:[[-u*.1,u*.3*m],[u*.1,u*.3*m]],boardRot:-Math.PI/2*m,boardY:u*.3*m,arms:[.2,-.2,.2,-.2]};
  return pose;}
 function endCut(){if(!cut)return;const r=cut.res;cut=null;flash=Math.max(flash,.35);S.sfx('cam');r();}
 function cutPos(i){const k=SK[i],g=cutGeo;let p;if(k.mode==='air'){const a=k.air,tau=clamp(a.t/a.dur,0,1),side=a.side;p={x:g.cx+side*(g.F+g.R*.94),y:g.floor-g.R-a.h*g.R*4*tau*(1-tau),rot:-side*(Math.PI/2)*(1-Math.sin(Math.PI*tau)),tau,side};}
  else if(k.mode==='grind'){const side=k.air.side;p={x:g.cx+side*(g.F+g.R),y:g.floor-g.R*1.08,rot:0,side};}
  else{const q=A.pipePoint(g,g.L*k.amp*Math.sin(k.ph));p={x:q.x,y:q.y,rot:q.rot};}p.y-=g.depth*.5;return p;}
 function startBail(i){const k=SK[i],pos=cutPos(i);k.mode='bail';k.t=0;k.bail={x0:pos.x,y0:pos.y,r0:pos.rot,dir:pos.x<cutGeo.cx?1:-1};k.bd={x:pos.x,y:pos.y,vx:(Math.random()-.5)*900,vy:-900,rot:0,vr:14};
  S.sfx('bail');S.sfx('scratch');setTimeout(()=>S.sfx('aww'),350);if(cut&&cut.p===i){cut.freeze=.28;cut.impact=1;}shake=Math.max(shake,12);}
 function stepSkater(i,dt){const k=SK[i],g=cutGeo,cross=1;
  if(k.mode==='ride'){const before=Math.cos(k.ph);k.ph+=dt*Math.PI/cross;const after=Math.cos(k.ph);
   if(before*after<=0){const side=Math.sign(Math.sin(k.ph))||1,tr=k.queue.shift();
    if(tr){k.ph=side>0?Math.PI/2:-Math.PI/2;if(tr.grind){k.mode='grind';k.t=0;k.air={side,trick:tr};S.sfx('grind-pipe',1);}else{k.mode='air';k.air={side,trick:tr,t:0,h:tr.h||.6,dur:.7+(tr.h||.6)*.42};S.sfx('ollie');if(tr.flip||tr.shove)S.sfx('flip');}}}}
  else if(k.mode==='air'){k.air.t+=dt;if(k.air.t>=k.air.dur){if(k.air.trick.bail){startBail(i);return;}k.mode='ride';k.ph=(k.air.side>0?Math.PI/2:-Math.PI/2)+.02;S.sfx('land',k.air.trick.special?1.4:1);S.sfx('catch');if(cut&&cut.p===i)cut.landed=true;}}
  else if(k.mode==='grind'){k.t+=dt;const pos=cutPos(i);if(Math.random()<dt*50)cutSparks.push({x:pos.x+(Math.random()-.5)*30,y:pos.y+g.R*.06,vx:(Math.random()-.5)*700,vy:-Math.random()*600,t:0,dur:.45});if(k.t>1){k.mode='ride';k.ph=(k.air.side>0?Math.PI/2:-Math.PI/2)+.02;S.sfx('revert');if(cut&&cut.p===i)cut.landed=true;}}
  else if(k.mode==='bail'){k.t+=dt;const b=k.bd,fl=g.floor-g.depth*.5-6;if(b){b.vy+=2600*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.rot+=b.vr*dt;if(b.y>fl){b.y=fl;b.vy*=-.35;b.vr*=.6;b.vx*=.8;if(Math.abs(b.vy)<80)b.vy=0;}
    const lo=g.cx-g.F-g.R*.9,hi=g.cx+g.F+g.R*.9;if(b.x<lo||b.x>hi){b.vx*=-.6;b.x=clamp(b.x,lo,hi);}}}}
 // where a slamming skater's body is: tumbling from where they bailed down to the flat, then lying there
 function bailBody(i,u){const k=SK[i],gg=cutGeo,b=k.bail,t=k.t,fall=clamp(t/.55,0,1),e=ease(fall);
  return {x:b.x0+(gg.cx+b.dir*gg.F*.3-b.x0)*e,y:b.y0+(gg.floor-gg.depth*.5-u*.5-b.y0)*e-Math.sin(fall*Math.PI)*gg.R*.25,rot:b.r0+(Math.PI/2*b.dir-b.r0)*e+(fall<1?Math.sin(t*20)*.3:0)};}
 function drawCutSkater(g,i,u){const k=SK[i],gg=cutGeo,o=A.OUTFITS[i],hd=head(i,P[i].mood);g.save();
  if(k.mode==='bail'){const bb=bailBody(i,u);
   if(k.bd){g.save();g.translate(k.bd.x,k.bd.y);g.rotate(k.bd.rot);A.drawBoard(g,u,o,k.bd.rot*.5,0);g.restore();}
   g.translate(bb.x,bb.y);g.rotate(bb.rot);SKD(g,u,{crouch:.1,arms:[2.4,.5,-2.3,-.6],noBoard:true,face:k.bail.dir,squash:1},hd,o);g.restore();return;}
  const pos=cutPos(i);g.translate(pos.x,pos.y);g.rotate(pos.rot);
  if(k.mode==='air'){const a=k.air,tr=a.trick,tau=pos.tau,e=ease(tau),mid=Math.sin(Math.PI*tau);
   const pose={face:a.side,crouch:.35+.55*mid,spin:Math.PI*tau+(tr.spin||0)*TAU*e,flip:(tr.flip||0)*TAU*clamp((tau-.1)/.6,0,1),shove:(tr.shove||0)*Math.PI*clamp((tau-.1)/.6,0,1),
    grab:tr.grab&&tau>.2&&tau<.78,arms:tr.grab?[.4,-.3,-2.2,.3]:[2.4,-.6,-2.4,.6],boardY:(tr.flip||tr.shove)&&tau>.1&&tau<.7?u*.4*mid:0,boardRot:(tr.boardSpin||0)*TAU*clamp((tau-.1)/.6,0,1)};
   if(tr.special){g.save();g.globalAlpha=.25;for(let j=1;j<=3;j++){const sp=Math.PI*tau+tr.spin*TAU*ease(clamp(tau-j*.04,0,1));g.save();g.translate(0,j*u*.9);A.drawSkater(g,u,{...pose,spin:sp},null,{...o,shirt:'#9ff6ff',shirt2:'#fff'});g.restore();}g.restore();}
   SKD(g,u,airStyle(pose,tr,tau,u),hd,o);}
  else if(k.mode==='grind')SKD(g,u,grindPose(g,u,-k.air.side,gg.R*.055),hd,o);
  else{const dir=Math.cos(k.ph)>=0?1:-1,bottom=1-Math.abs(Math.sin(k.ph));SKD(g,u,{face:dir,crouch:.2+.45*bottom,arms:[1.2,-.5,-1.0,.5],lean:dir*.08*bottom},hd,o);}
  g.restore();}
 function drawCut(dt){const W=lay.W,H=lay.H,k=cut,p=k.p,g=cutGeo,u=g.R*.115,L=k.line;
  // time: freeze-frame on a slam, slow motion through the special's peak
  let pos,apex=0,falling=false,fallT=0,st=null,landedNow=false;
  if(k.pose){k.pose.t+=dt;k.t+=dt;if(k.pose.t>=POSE_T||k.t>k.max+POSE_T+2){endCut();return;}pos={x:k.pose.x,y:k.pose.y,rot:0};}
  else if(L){if(k.freeze>0)k.freeze-=dt;else{st=SP.lineState(L,k.lt);k.ts=L.tr.special&&st.mode==='air'&&st.part.trick&&st.tau>.28&&st.tau<.72?.4:1;k.lt+=dt*k.ts;}
   st=SP.lineState(L,k.lt);lineEvents(st);if(k.bd)stepBoard(k.bd,dt,x=>SP.ground(L,x)-SP.DEPTH*.5-6);
   if(st.mode==='grind'&&Math.random()<dt*50)cutSparks.push({x:st.x,y:st.y-SP.DEPTH*.5,vx:-(200+Math.random()*500),vy:-Math.random()*500,t:0,dur:.45});
   k.t+=dt;if(k.lt>=L.T||k.t>k.max+1.5){if(k.wantPose&&!L.bail){startPose(st.x-140,SP.ground(L,st.x-140)-SP.DEPTH*.5);landedNow=true;}else{endCut();return;}}
   if(!landedNow){pos={x:st.x,y:st.y-SP.DEPTH*.5,rot:st.rot};apex=st.mode==='air'?Math.sin(Math.PI*st.tau):0;falling=st.mode==='slam';fallT=falling?k.lt-st.part.t0:0;}}
  else{if(k.freeze>0){k.freeze-=dt;}else{const sk=SK[p],tau=sk.mode==='air'?sk.air.t/sk.air.dur:0;k.ts=sk.mode==='air'&&sk.air.trick.special&&tau>.28&&tau<.72?.4:1;stepSkater(p,dt*k.ts);}
   k.t+=dt;if(k.landed&&k.end==null)k.end=k.t+(k.wantPose?.35:.5);if(SK[p].mode==='bail'&&SK[p].t>1.5&&k.end==null)k.end=k.t;
   if(k.end!=null&&k.t>=k.end||k.t>k.max){if(k.wantPose&&SK[p].mode!=='bail'){startPose(g.cx-g.F*.35,g.floor-g.depth*.5);landedNow=true;}else{endCut();return;}}
   if(!landedNow){const sk=SK[p];pos=sk.mode==='bail'?bailBody(p,u):cutPos(p);apex=sk.mode==='air'?Math.sin(Math.PI*clamp(sk.air.t/sk.air.dur,0,1)):0;falling=sk.mode==='bail';fallT=falling?sk.t:0;}}
  if(landedNow)pos={x:k.pose.x,y:k.pose.y,rot:0};
  // the camera keeps the skater's body in the middle of the frame (body centre = 3 units up from the feet, turned with them)
  const base=.48*Math.min(W,H)/(.72*g.R),pr=pos.rot||0,bodyX=pos.x+Math.sin(pr)*u*3,bodyY=pos.y-Math.cos(pr)*u*3;
  let tx=bodyX,ty=bodyY,z=base,rot=0;
  if(k.pose){z=base*(1.2+.12*Math.min(1,k.pose.t*3));ty=pos.y-u*3.6;tx=pos.x;rot=k.pose.tilt+Math.sin(k.pose.t*2.2)*.05;}
  else if(k.style==='follow'){z=base*1.15;rot=.2*Math.sin(k.t*1.3)-.1;}
  else if(k.style==='low'){z=base*.85;rot=-.32+k.t*.05;}
  else if(k.style==='punch'){z=base*(1+.75*apex);rot=.12;}
  else if(k.style==='orbit'){z=base*1.2;rot=-.5+k.t*.4;}
  else if(k.style==='track'){z=base*1.12;rot=-.08+.05*Math.sin(k.t*2);}
  else if(k.style==='crash'){z=base*(falling?1.2+Math.min(.25,fallT*.3):1.05);rot=falling?.22*Math.sin(fallT*3):-.15;}
  if(!k.cam||landedNow)k.cam={x:tx,y:ty,z:landedNow?z*1.3:z,rot};const cm=k.cam,f=Math.min(1,dt*14);cm.x+=(tx-cm.x)*f;cm.y+=(ty-cm.y)*f;cm.z+=(z-cm.z)*Math.min(1,dt*6);cm.rot+=(rot-cm.rot)*Math.min(1,dt*5);
  // render the scene, then put it through the fisheye and the camcorder
  const cw=Math.round(W*Math.min(dpr,1.25)),ch=Math.round(H*Math.min(dpr,1.25));if(cutC.width!==cw||cutC.height!==ch){cutC.width=cw;cutC.height=ch;}
  const q=cutG;q.setTransform(cw/W,0,0,ch/H,0,0);const sky=q.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#1d5fc4');sky.addColorStop(.7,'#8fd0f5');sky.addColorStop(1,'#fbe3b0');q.fillStyle=sky;q.fillRect(0,0,W,H);
  const sh=shake?(Math.random()-.5)*shake:0;q.translate(W/2+sh,H/2+sh);q.rotate(cm.rot);q.scale(cm.z,cm.z);q.translate(-cm.x,-cm.y);
  // distant city and palms (parallax), floor, the pipe
  const hz=L?(L.spot==='stairs'||L.spot==='rail'?-SP.DEPTH-1100:-SP.DEPTH-380):g.floor-g.R*1.2;
  q.save();q.translate(cm.x*.55,cm.y*.3);q.fillStyle='#6f8db0';for(let i=-8;i<=8;i++){const bw=150+((i*37)%5+5)%5*30,bh=180+((i*53)%7+7)%7*45;q.fillRect(i*190-bw/2,hz-bh,bw,bh);}
  q.strokeStyle='#2f2015';q.lineWidth=14;for(let i=-4;i<=4;i++){const px=i*420+90,py=hz+g.R*.05;q.beginPath();q.moveTo(px,py);q.quadraticCurveTo(px+40,py-230,px+20,py-420);q.stroke();q.strokeStyle='#1f5d2e';q.lineWidth=16;for(let j=0;j<6;j++){const a=-Math.PI/2+(j-2.5)*.5;q.beginPath();q.moveTo(px+20,py-420);q.quadraticCurveTo(px+20+Math.cos(a)*120,py-450+Math.sin(a)*60,px+20+Math.cos(a)*170,py-400+Math.sin(a)*90);q.stroke();}q.strokeStyle='#2f2015';q.lineWidth=14;}
  q.restore();
  const poser=()=>{q.save();q.translate(k.pose.x,k.pose.y);A.drawSkaterFront(q,u,k.pose.kind,k.pose.t,head(p,k.pose.mood),A.OUTFITS[p],k.hat);q.restore();};
  if(L){q.fillStyle='#a9a398';q.fillRect(-6000,hz,12000,6000);SP.drawSpot(q,L);if(k.pose)poser();else drawLineSkater(q,p,st,u);}
  else{q.fillStyle='#a9a398';q.fillRect(g.cx-6000,g.floor-g.R*1.2,12000,g.R*1.2+g.depth);q.fillStyle='#8f897f';q.fillRect(g.cx-6000,g.floor,12000,4000);
   A.drawPipe(q,g,'PRO MANCALA',7);if(k.pose)poser();else drawCutSkater(q,p,u);}
  for(let j=cutSparks.length-1;j>=0;j--){const sp=cutSparks[j];sp.t+=dt;if(sp.t>sp.dur){cutSparks.splice(j,1);continue;}sp.vy+=1800*dt;sp.x+=sp.vx*dt;sp.y+=sp.vy*dt;q.strokeStyle=`rgba(255,${190+Math.random()*60|0},70,${1-sp.t/sp.dur})`;q.lineWidth=5;q.beginPath();q.moveTo(sp.x,sp.y);q.lineTo(sp.x-sp.vx*.025,sp.y-sp.vy*.025);q.stroke();}
  x.save();const pz=k.t<.15?1.25-k.t/.15*.25:1;x.translate(W/2,H/2);x.scale(pz,pz);x.translate(-W/2,-H/2);A.fisheye(x,cutC,W,H,.42);x.restore();A.vhs(x,W,H,T,k.kind!=='bail');
  if(k.impact){thps(x,'BAIL!',W/2,H*.4,lay.hu*3.4,{grad:['#ffb0b0','#ff1010'],rot:-.12,scale:1+.3*Math.max(0,k.freeze),maxW:W*.9});}
  if(k.pose){const a=Math.min(1,k.pose.t*5);thps(x,k.pose.caption,W/2,H*.8,lay.hu*2.2,{grad:['#ffffff','#ffe14d','#ff7a00'],rot:-.06,scale:.7+.3*a,alpha:a,maxW:W*.86});}
  const lbl=k.kind==='steal'?'STEAL CAM':k.kind==='bail'?'SLAM CAM':k.kind==='special'?'SPECIAL CAM':'REPLAY';thps(x,lbl,W-lay.hu*4,H-lay.hu*2.5,lay.hu*.8,{fill:'#fff',align:'right',alpha:.8});
  thps(x,SP.NAMES[k.spot],W-lay.hu*4,H-lay.hu*1.5,lay.hu*.55,{fill:'#ffe14d',align:'right',alpha:.85,maxW:W*.5});
  thps(x,nameOf(p).toUpperCase(),W-lay.hu*4,H-lay.hu*.6,lay.hu*.6,{fill:PCOL[p],align:'right',alpha:.9});}

 // ---------------------------------------------------------------- guest skaters: someone from the roster goes by all the time
 function spawnNpc(){if(!guestPool.length||!lay)return;const id=pickOf(guestPool),dir=Math.random()<.5?1:-1,kinds=lay.vertical?['ollie','ollie','manual','bomb','air']:['ollie','grind','grind','manual','bomb','air'],kind=pickOf(kinds);
  let nm='';try{nm=require('src/characters.js').character(id)?.name||'';}catch{}
  const b=lay.band[Math.random()<.5?0:1],lane=lay.vertical?lay.top+lay.geo.L*(.2+Math.random()*.6):0;
  const dur=kind==='bomb'?1.5:kind==='air'?2.4:2.6;npcs.push({id,nm,dir,kind,t:0,dur,lane,band:b,o:A.OUTFITS[2+Math.floor(Math.random()*2)],flip:Math.random()<.6?1:0,spin:Math.random()<.5?1:0,hat:A.hatFor()});S.sfx('rollby',dur);if(kind==='air')setTimeout(()=>S.sfx('crowd',.6,1.4),dur*400);}
 function drawNpc(n){const W=lay.W,H=lay.H,geo=lay.geo,tau=n.t/n.dur,u=clamp(Math.min(W,H)*.03,8,24),x0=n.dir>0?-u*6:W+u*6,x1=n.dir>0?W+u*6:-u*6,px=x0+(x1-x0)*tau;
  let py=0,pose={face:n.dir,crouch:.3,arms:[1.2,-.4,-1.2,.4]};
  const hop=(lo,hi,hgt)=>{const inside=n.dir>0?px>lo&&px<hi:px<hi&&px>lo,over=clamp((n.dir>0?px-lo:hi-px)/(hi-lo),0,1);if(inside){const a=Math.sin(Math.PI*over);py-=a*hgt;pose.crouch=.4+.5*a;pose.flip=n.flip*TAU*over;pose.grab=!n.flip&&a>.3;}
   if(inside&&!n.popped){n.popped=1;S.sfx('ollie');S.sfx('flip');}if(!inside&&n.popped===1&&over>=1){n.popped=2;S.sfx('land');S.sfx('catch');}};
  if(n.kind==='air'){const a=Math.sin(Math.PI*tau);py=H*.92-a*H*.62;pose.crouch=.5+.4*a;pose.spin=n.spin*TAU*clamp((tau-.2)/.6,0,1);pose.grab=a>.4;if(!n.popped&&tau>.08){n.popped=1;S.sfx('ollie');}if(n.popped===1&&tau>.92){n.popped=2;S.sfx('land');}}
  else if(n.kind==='manual'||n.kind==='bomb'){py=n.band.y+n.band.h*.8;if(n.band.h<u*5)py=lay.bottom+u*3;if(n.kind==='manual')pose.boardRot=-.22*n.dir;else if(tau>.4&&tau<.6){py-=Math.sin((tau-.4)/.2*Math.PI)*u*4;pose.flip=TAU*((tau-.4)/.2);if(!n.popped){n.popped=1;S.sfx('ollie');S.sfx('flip');}}}
  else if(lay.vertical){py=n.lane;hop(lay.bx-geo.D*.6,lay.bx+geo.D*.6,geo.D*.7);}
  else if(n.kind==='grind'){const lo=lay.bx-geo.L/2,hi=lay.bx+geo.L/2,inside=px>lo&&px<hi;py=inside?lay.by+geo.D/2-u*.1:lay.bottom+u*.3;if(inside){pose.crouch=.5;pose.lean=-n.dir*.1;if(!n.popped){n.popped=1;S.sfx('ollie');S.sfx('grind-board',geo.L/((W+12*u)/n.dur));}if(Math.random()<.6)sparks.push({x:px-n.dir*u*1.2,y:py+u*.3,vx:-n.dir*(80+Math.random()*160),vy:-Math.random()*160,t:0,dur:.35});}else if(n.popped===1){n.popped=2;S.sfx('land');}}
  else{py=lay.bottom+u*.3;hop(lay.bx-geo.L/2-u,lay.bx+geo.L/2+u,geo.D+geo.edge+u*4);}
  x.save();x.translate(px,py);A.drawSkater(x,u,{...pose,hat:n.hat},headOf?headOf(n.id,'normal',160):null,n.o);x.restore();
  if(n.nm&&tau>.08&&tau<.92)thps(x,n.nm.toUpperCase(),clamp(px,lay.hu*4,W-lay.hu*4),clamp(py-u*8.6,lay.hu,H-lay.hu),lay.hu*.7,{fill:'#fff',alpha:.9,maxW:lay.hu*10});}

 // ---------------------------------------------------------------- drawing: board, gems, HUD, text
 function drawBoard(){const geo=lay.geo,dk=deck,sx=shake?(Math.random()-.5)*shake*.4:0;
  if(lay.vertical){x.save();x.translate(lay.bx+sx,lay.by);x.rotate(Math.PI/2);x.drawImage(dk.c,-dk.ox,-dk.oy,dk.w,dk.h);x.restore();}else x.drawImage(dk.c,lay.bx-dk.ox+sx,lay.by-dk.oy,dk.w,dk.h);
  const r=gemR(),pulse=.5+.5*Math.sin(T*6),hu=lay.hu;
  // whose turn: their row of bowls glows in their color
  if(phase==='play'){const i=state.turn,pts=[0,1,2,3,4,5].map(k=>pitPos(k+i*7)),pr=geo.pr*1.18;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const q of pts){x0=Math.min(x0,q.x-pr);y0=Math.min(y0,q.y-pr);x1=Math.max(x1,q.x+pr);y1=Math.max(y1,q.y+pr);}
   x.save();x.shadowColor=PCOL[i];x.shadowBlur=16+pulse*12;x.strokeStyle=PCOL[i];x.lineWidth=3+pulse*2;x.fillStyle=PCOL[i]+'33';x.beginPath();x.roundRect(x0,y0,x1-x0,y1-y0,pr);x.fill();x.stroke();x.restore();}
  const legal=phase==='play'&&!busy&&localTurn()&&lockT<=0?mancalaMoves(state):[];
  for(const i of legal){const p=pitPos(i);x.save();x.shadowColor='#ffe600';x.shadowBlur=10+pulse*10;x.strokeStyle=`rgba(255,230,0,${.55+.4*pulse})`;x.lineWidth=2.5;A.ell(x,p.x,p.y,p.rx+2,p.ry+2);x.stroke();x.restore();}
  for(let i=0;i<14;i++){const list=stones[i];for(let k=0;k<list.length;k++){const q=slot(i,k),st=list[k];A.drawGem(x,st.col,q.x+st.jx*r*.35,q.y+st.jy*r*.35,r,dpr);}}
  // counts: badges on the bowls (outer side), big THPS numbers over the stores
  for(let i=0;i<14;i++){const p=pitPos(i),n=stones[i].length;
   if(p.store){thps(x,String(n),p.x,p.y,geo.pr*1.5,{grad:i===6?['#ffe0e0',PCOL[0]]:['#e0eeff',PCOL[1]],lw:.24,alpha:.95});}
   else{const out=lay.vertical?(p.x<lay.bx?-1:1):(p.y<lay.by?-1:1),bx=lay.vertical?p.x+out*p.rx*.82:p.x+p.rx*.78,by=lay.vertical?p.y+p.ry*.78:p.y+out*p.ry*.82,br=Math.max(hu*.5,geo.pr*.36);
    x.fillStyle='rgba(0,0,0,.75)';A.ell(x,bx,by,br,br*.9);x.fill();x.strokeStyle=i<6?PCOL[0]:PCOL[1];x.lineWidth=1.5;x.stroke();
    x.fillStyle='#fff';x.font=A.font(br*1.2);x.textAlign='center';x.textBaseline='middle';x.fillText(String(n),bx,by+1);}}}
 function drawFlyers(dt){const r=gemR();for(let j=flyers.length-1;j>=0;j--){const f=flyers[j];f.t+=dt;if(f.t<0)continue;const tau=clamp(f.t/f.dur,0,1),q=slot(f.to,stones[f.to].length+f.k);
   const cx=f.a.x+(q.x-f.a.x)*tau,cy=f.a.y+(q.y-f.a.y)*tau,lift=f.h*Math.sin(Math.PI*tau);
   x.fillStyle='rgba(0,0,0,.3)';A.ell(x,cx+r*.3,cy+r*.3,r*.9,r*.6);x.fill();A.drawGem(x,f.st.col,cx,cy-lift,r*(1+.35*Math.sin(Math.PI*tau)),dpr);
   if(tau>=1){flyers.splice(j,1);stones[f.to].push(f.st);incoming[f.to]=Math.max(0,incoming[f.to]-1);for(const g of flyers)if(g.to===f.to&&g.k>f.k)g.k--;f.land?.();}}}
 function meterBar(x0,y0,w,h,v,ready){x.save();x.transform(1,0,-.35,1,0,0);const X=x0+y0*.35;x.fillStyle='rgba(0,0,0,.65)';x.fillRect(X-2,y0-2,w+4,h+4);
  if(ready){const fl=.6+.4*Math.sin(T*14);const lg=x.createLinearGradient(X,0,X+w,0);lg.addColorStop(0,'#fff8a0');lg.addColorStop(.5,'#ffe600');lg.addColorStop(1,'#ffffff');x.shadowColor='#ffe600';x.shadowBlur=14*fl;x.fillStyle=lg;x.fillRect(X,y0,w,h);x.shadowBlur=0;
   x.fillStyle=`rgba(255,255,255,${.5*fl})`;x.fillRect(X+((T*1.3)%1)*w,y0,w*.12,h);}
  else{const lg=x.createLinearGradient(X,0,X+w,0);lg.addColorStop(0,'#ff3b00');lg.addColorStop(1,'#ffcc00');x.fillStyle=lg;x.fillRect(X,y0,w*clamp(v,0,1),h);}
  x.strokeStyle='#fff';x.lineWidth=1;x.strokeRect(X-2,y0-2,w+4,h+4);x.restore();}
 function drawHud(i){const h=lay.hud[i],hu=lay.hu,p=P[i],big=hu*1.9,turn=phase==='play'&&state.turn===i,dim=phase==='play'&&!turn;x.save();if(dim)x.globalAlpha=.5;
  thps(x,fmt(p.shown),h.x,h.y+big*.55,big,{align:'left',grad:['#ffffff','#ffe14d','#ff9d00'],lw:.24,cond:.8});
  meterBar(h.x+2,h.y+big*1.12,hu*8.4,hu*.62,p.meter,p.ready);
  if(p.ready)thps(x,'SPECIAL',h.x+hu*4.3,h.y+big*1.12+hu*.31,hu*.62,{fill:'#000',stroke:'rgba(0,0,0,0)',lw:0,alpha:.85});
  const blink=.65+.35*Math.sin(T*8);
  thps(x,turn?'▶ '+nameOf(i).toUpperCase()+"'S TURN":nameOf(i).toUpperCase(),h.x,h.y+big*1.12+hu*1.55,hu*(turn?1.05:.85),{align:'left',fill:turn?PCOL[i]:'#fff',stroke:turn?'#fff':'#000',lw:turn?.16:.2,alpha:turn?blink:1,maxW:lay.W*.6});
  thps(x,`${state.pits[i?13:6]} IN THE STORE`,h.x,h.y+big*1.12+hu*2.55,hu*.62,{align:'left',fill:'#cfe6ff',lw:.28});x.restore();}
 function drawCard(i){const r=lay.card[i];if(!r||r.h<36||r.w<30)return;const p=P[i],hu=lay.hu,turn=phase==='play'&&state.turn===i,dim=phase==='play'&&!turn;x.save();
  const kick=p.cardKick,sh=p.cardShake?Math.sin(T*60)*p.cardShake*6:0,bob=turn?Math.sin(T*4)*.03:0;x.translate(r.x+r.w/2+sh,r.y+r.h/2);x.scale(1+kick*.12+bob,1+kick*.12+bob);x.rotate((i?-1:1)*.035);if(dim)x.globalAlpha=.55;
  const w=r.w,h=r.h;if(turn){x.shadowColor=PCOL[i];x.shadowBlur=18+8*Math.sin(T*6);}else{x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=10;}x.fillStyle='#0a0f1e';x.fillRect(-w/2,-h/2,w,h);x.shadowBlur=0;
  const bg=x.createLinearGradient(0,-h/2,0,h/2);bg.addColorStop(0,i?'#163a8a':'#8a1616');bg.addColorStop(1,'#05070d');x.fillStyle=bg;x.fillRect(-w/2+3,-h/2+3,w-6,h-6);
  x.save();x.beginPath();x.rect(-w/2+3,-h/2+3,w-6,h-6);x.clip();x.strokeStyle='rgba(255,255,255,.07)';x.lineWidth=6;for(let k=-h;k<w+h;k+=14){x.beginPath();x.moveTo(-w/2+k,-h/2);x.lineTo(-w/2+k-h,h/2);x.stroke();}
  const hd=head(i,p.mood);if(hd){const b2=Math.sin(T*3+i)*h*.015,size=Math.min(w*1.05,h*.92);A.drawHead(x,hd,0,h*.3+b2,size,Math.sin(T*1.7+i)*.04,1-kick*.08);}
  x.restore();x.strokeStyle=turn?'#ffe600':PCOL[i];x.lineWidth=turn?4:2;x.strokeRect(-w/2+1.5,-h/2+1.5,w-3,h-3);
  const lb=Math.min(hu*1.15,h*.2);x.fillStyle=PCOL[i];x.fillRect(-w/2,h/2-lb,w,lb);thps(x,turn?'YOUR TURN!':nameOf(i).toUpperCase(),0,h/2-lb*.5,lb*.74,{fill:turn?'#ffe600':'#fff',maxW:w-8});
  x.restore();}
 function wrapTricks(list,px,maxW){x.font=A.font(px);const lines=[];let cur='';for(const t of list){const nx=cur?cur+' + '+t:t;if(cur&&x.measureText(nx).width*.84>maxW){lines.push(cur);cur=t;}else cur=nx;}if(cur)lines.push(cur);return lines;}
 // where the trick string sits this frame (also used to keep popups off it)
 // off the board: in the mover's own strip/column (lay.side), shrunk to fit it; over the whole screen during a cutaway
 function comboLayout(){if(!combo)return null;const hu=lay.hu,sd=lay.side[combo.p],ph=combo.phase;
  const t=cut?{x:lay.W/2,y:lay.H*.64,w:lay.W*.92,y0:hu*.4,y1:lay.H-hu*.4,over:true}:{x:(sd.x0+sd.x1)/2,y:(sd.y0+sd.y1)/2,w:sd.x1-sd.x0,y0:sd.y0,y1:sd.y1};
  const maxL=t.w<hu*12?3:2,room=t.y1-t.y0;let px=hu*1.1,k=1,lines,big,blockH;
  for(;;){lines=wrapTricks(combo.tricks,px,t.w);big=hu*k*(ph==='land'?1.9:1.4);if(lines.length>maxL)lines=['… + '+lines[lines.length-2],lines[lines.length-1]];blockH=lines.length*px*1.05+big*1.1;if(blockH<=room||px<hu*.5)break;px*=.9;k*=.9;}
  const y0=clamp(t.y-blockH/2+(ph==='bail'?combo.t*hu*1.5:ph==='land'?-combo.t*hu:0),t.y0,Math.max(t.y0,t.y1-blockH));
  return {t,lines,px,big,blockH,y0,rect:{x0:t.x-t.w/2,y0:y0-hu*.2,x1:t.x+t.w/2,y1:y0+blockH+hu*.2}};}
 function drawCombo(){if(!combo)return;const hu=lay.hu,ph=combo.phase,a=ph==='live'?1:clamp(1.3-combo.t*.9,0,1);if(a<=0){combo=null;return;}
  const popIn=Math.min(1,combo.t*8),cl=comboLayout(),{t,lines,px,big,blockH,y0}=cl;x.save();x.globalAlpha*=veil(cl.rect);
  if(t.over){x.save();x.globalAlpha=a*.5;x.fillStyle='#000';x.beginPath();x.roundRect(t.x-t.w/2,y0-hu*.3,t.w,blockH+hu*.6,hu*.5);x.fill();x.restore();}
  lines.forEach((ln,k)=>thps(x,ln,t.x,y0+px*(k+.5)*1.05,px,{fill:ph==='bail'?'#ff4040':'#ffffff',maxW:t.w,alpha:a,scale:.85+.15*popIn}));
  const line2=ph==='land'?fmt(combo.total):`${fmt(combo.base)} X ${combo.mult}`;
  thps(x,line2,t.x,y0+lines.length*px*1.05+big*.55,big,{grad:ph==='bail'?['#ff8080','#ff1010']:ph==='land'?['#e7ffd0','#41e000']:['#fff7a0','#ffbf00'],alpha:a,maxW:t.w,scale:ph==='land'?1+.25*Math.max(0,1-combo.t*3):1});x.restore();}
 function drawPops(dt){for(let j=pops.length-1;j>=0;j--){const p=pops[j];p.t+=dt;const tau=p.t/p.dur;if(tau>=1){pops.splice(j,1);continue;}
  const sc=tau<.15?.3+tau/.15*.95:tau<.25?1.25-(tau-.15)/.1*.25:1,a=(tau>.7?1-(tau-.7)/.3:1)*veil(p.r);thps(x,p.text,p.x,p.y+p.vy*p.t,p.px,{grad:p.grad,rot:p.rot,alpha:a,scale:sc,maxW:lay.W*.92,lw:.26});}}
 function drawSparks(dt){for(let j=sparks.length-1;j>=0;j--){const p=sparks[j];p.t+=dt;if(p.t>p.dur){sparks.splice(j,1);continue;}p.vy+=700*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;A.spark(x,p.x,p.y,p.vx,p.vy,1-p.t/p.dur);}}
 // the turn banner slides through the player's own strip/column, never across the deck
 function bannerRect(p){const sd=lay.side[p],k=Math.min(1,(sd.y1-sd.y0)/(lay.hu*3.9)),y=(sd.y0+sd.y1)/2;return {x0:sd.x0,y0:y-lay.hu*1.95*k,x1:sd.x1,y1:y+lay.hu*1.95*k,y,k};}
 function drawBanner(dt){if(!banner)return;banner.t+=dt;const b=banner,tau=b.t/b.dur;if(tau>=1){banner=null;return;}const R=bannerRect(b.p),w=R.x1-R.x0,cx=(R.x0+R.x1)/2,hu=lay.hu*R.k,slide=tau<.15?1-tau/.15:tau>.85?-(tau-.85)/.15:0,y=R.y;
  x.save();x.beginPath();x.rect(R.x0,R.y0,w,R.y1-R.y0);x.clip();x.translate(slide*w,0);x.fillStyle='rgba(0,0,0,.6)';x.beginPath();x.moveTo(R.x0,y-hu*1.6);x.lineTo(R.x1,y-hu*1.9);x.lineTo(R.x1,y+hu*1.3);x.lineTo(R.x0,y+hu*1.6);x.closePath();x.fill();
  x.fillStyle=PCOL[b.p];x.fillRect(R.x0,y-hu*1.75,w,hu*.18);x.fillRect(R.x0,y+hu*1.36,w,hu*.18);
  thps(x,b.text,cx,y-hu*.25,hu*2.1,{grad:b.p?['#e0eeff','#2f8bff']:['#ffe0e0','#ff3b30'],maxW:w*.94});if(b.sub)thps(x,b.sub,cx,y+hu*.95,hu*.65,{fill:'#fff',maxW:w*.92});x.restore();}
 // the Now Playing card stays clear of the scores: bottom-right on tall screens, bottom-centre on wide ones
 function trackBox(){const W=lay.W,H=lay.H,hu=lay.hu,w=lay.vertical?Math.min(W*.56,hu*16):Math.min(W*.42,hu*18);return {x:lay.vertical?W-w:(W-w)/2,y:H-hu*2.2,w};}
 function drawTrack(dt){if(!track||cut)return;if(phase!=='intro')track.t+=dt;if(track.t>5.5){track=null;return;}const hu=lay.hu,a=clamp(Math.min(track.t*3,(5.5-track.t)*2),0,1),b=trackBox(),y=b.y;
  x.save();x.globalAlpha=a;x.fillStyle='rgba(0,0,0,.65)';x.fillRect(b.x,y-hu*.9,b.w,hu*2);x.restore();
  thps(x,track.band?`${track.band} — "${track.song}"`:track.song,b.x+hu*.5,y-hu*.15,hu*.7,{align:'left',fill:'#fff',alpha:a,maxW:b.w-hu});
  thps(x,'NOW PLAYING',b.x+hu*.5,y+hu*.6,hu*.5,{align:'left',fill:'#ffe600',alpha:a});}

 // ---------------------------------------------------------------- title sequence: Tony... Hawk's... Pro... Mancala... EXTREME EDITION!!
 // The band plays a snare roll with a guitar hit on every word and explodes into the first chorus on EXTREME EDITION;
 // the words follow the audio clock so they land on the drums.
 const HITS=[1.2,1.95,2.7,3.55],BOOM=4.55,INTRO_END=8.2;
 let introT=0,introDone=false,introClock=null,introStarted=false,lastMt=null,mtStall=0;const cues=new Set();const cue=(name,at,fn)=>{if(introT>=at&&!cues.has(name)){cues.add(name);fn();}};
 const CUES=['r1','w1','r2','w2','w3','w3b','g4','w4','w5','vs','vs2'];
 const onTrack=t=>{if(t)track={...t,t:0};};
 function startIntro(){if(introStarted)return;introStarted=true;introClock=music.intro(BOOM,HITS,onTrack);}
 function skipIntro(){if(introT>=INTRO_END-.6)return;for(const n of CUES)cues.add(n);introClock=null;music.main(onTrack);S.sfx('slam');introT=INTRO_END-.6;}
 function introAudio(){cue('r1',.75,()=>S.sfx('roll',.5,.4));cue('w1',HITS[0],()=>{S.sfx('slam');shake=6;});cue('r2',1.55,()=>S.sfx('roll',.4,.4));cue('w2',HITS[1],()=>{S.sfx('slam');shake=6;});
  cue('w3',HITS[2]-.25,()=>{S.sfx('ollie');S.sfx('flip');});cue('w3b',HITS[2],()=>{S.sfx('land',1.3);shake=7;});
  cue('g4',HITS[3]-.55,()=>S.sfx('grind',.55));cue('w4',HITS[3],()=>{S.sfx('slam');S.sfx('land',1.5);shake=12;sparkBurst(lay.W*.5,lay.H*.5,40,500);});
  cue('w5',BOOM,()=>{S.sfx('crowd',1.6,2.5);S.sfx('hey');shake=18;flash=.7;music.main(onTrack);});
  cue('vs',6.1,()=>S.sfx('whoosh',.4,true));cue('vs2',6.45,()=>{S.sfx('slam');shake=8;});}
 // The owner's word pictures replace the drawn text one by one: assets/keyart/mancala-word-<tony|hawks|pro|mancala|extreme>.*, transparent.
 const WORD={};for(const k of ['tony','hawks','pro','mancala','extreme']){const u=USER_PORTRAITS['keyart:mancala-word-'+k];if(isRasterArt(u)){const im=new Image();im.src=u;WORD[k]=im;}}
 const wordOK=k=>WORD[k]?.complete&&WORD[k].naturalWidth>0;
 // the picture's painted area without its transparent margin (measured once)
 function wordBox(im){if(im._box)return im._box;const w=200,h=Math.max(1,Math.round(w*im.naturalHeight/im.naturalWidth)),cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d');g.drawImage(im,0,0,w,h);const d=g.getImageData(0,0,w,h).data;let x0=w,x1=0,y0=h,y1=0;for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(d[(yy*w+xx)*4+3]>40){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(yy<y0)y0=yy;if(yy>y1)y1=yy;}const k=im.naturalWidth/w;return im._box={sx:x0*k,sy:y0*k,sw:Math.max(1,x1-x0+1)*k,sh:Math.max(1,y1-y0+1)*k};}
 const wordW=(k,px)=>{const b=wordBox(WORD[k]);return px*1.1*b.sw/b.sh;};
 function putWord(k,xx,yy,px,{rot=-.06,scale=1}={}){const im=WORD[k],b=wordBox(im),h=px*1.1*scale,w=h*b.sw/b.sh;x.save();x.translate(xx,yy);x.rotate(rot);x.drawImage(im,b.sx,b.sy,b.sw,b.sh,-w/2,-h/2,w,h);x.restore();}
 function drawIntro(dt){const W=lay.W,H=lay.H,hu=Math.min(W,H)/20;introAudio();
  const out=clamp((introT-(INTRO_END-.55))/.55,0,1);x.save();x.globalAlpha=1-out;x.fillStyle='#07070a';x.fillRect(0,0,W,H);
  x.save();x.translate(W/2,H/2);x.rotate(introT*(introT>BOOM?.9:.25));const rays=16;for(let k=0;k<rays;k++){x.fillStyle=k%2?(introT>BOOM?'rgba(255,60,0,.3)':'rgba(255,90,0,.16)'):'rgba(255,200,0,.08)';x.beginPath();x.moveTo(0,0);x.arc(0,0,Math.max(W,H),k/rays*TAU,(k+.5)/rays*TAU);x.closePath();x.fill();}x.restore();
  x.fillStyle='rgba(255,255,255,.04)';for(let yy=0;yy<H;yy+=6)for(let xx=(yy/6%2)*3;xx<W;xx+=6)x.fillRect(xx,yy,1.5,1.5);
  // Every line is measured on this device (phones without Impact fall back to wider fonts) and sized to fit: TONY HAWK'S,
  // then [PRO] MANCALA, then the EXTREME EDITION!! banner, stacked above the face-off cards.
  const cx=W/2,fly=(t0,dur=.3)=>clamp((introT-t0)/dur,0,1),tw=(s,px)=>{x.font=A.font(px);return x.measureText(s).width*.84+px*.3;},tww=(k,s,px)=>wordOK(k)?wordW(k,px):tw(s,px);
  const Wv=W*.9,gap=Math.min(W,H)*.025,cw=Math.min(W*.36,H*.26),ch=cw*1.18,cardsTop=H-ch-hu*1.9;
  let fa=Math.min(W,H)*.13;fa*=Math.min(1,Wv/(tww('tony','TONY',fa)+gap+tww('hawks',"HAWK'S",fa)));
  let fb=Math.min(W,H)*.2,proPx=fb*.4;const proW=()=>wordOK('pro')?wordW('pro',fb):tw('PRO',proPx)+proPx*.5;fb*=Math.min(1,Wv/(proW()+gap+tww('mancala','MANCALA',fb)));proPx=fb*.4;
  let fc=Math.min(W,H)*.085;fc*=Math.min(1,Wv/(tww('extreme','EXTREME EDITION!!',fc)+fc*1.2));
  // fit the stack between the top and the cards (shrink everything together if needed)
  let stack=fa+fb+fc*1.7+gap*3;const room=cardsTop-gap*2-H*.05;if(stack>room){const s=room/stack;fa*=s;fb*=s;fc*=s;proPx*=s;stack=room;}
  const top=Math.max(H*.05,(cardsTop-gap-stack)/2),yA=top+fa*.55,yB=yA+fa*.55+gap+fb*.5,yC=yB+fb*.5+gap+fc*.85;
  const wT=tww('tony','TONY',fa),wH=tww('hawks',"HAWK'S",fa),lineA=wT+gap+wH,xT=cx-lineA/2+wT/2,xH=cx+lineA/2-wH/2;
  const pw=proW(),wM=tww('mancala','MANCALA',fb),lineB=pw+gap+wM,xP=cx-lineB/2+pw/2,xM=cx+lineB/2-wM/2;
  let k=fly(HITS[0]-.35,.35);if(k>0){if(wordOK('tony'))putWord('tony',xT+(1-ease(k))*-W,yA,fa);else thps(x,'TONY',xT+(1-ease(k))*-W,yA,fa,{fill:'#fff',rot:-.06,lw:.22});}
  k=fly(HITS[1]-.35,.35);if(k>0){if(wordOK('hawks'))putWord('hawks',xH+(1-ease(k))*W,yA,fa);else thps(x,"HAWK'S",xH+(1-ease(k))*W,yA,fa,{fill:'#fff',rot:-.06,lw:.22});}
  k=fly(HITS[2]-.25,.25);if(k>0&&wordOK('pro'))putWord('pro',xP,yB-(1-ease(k))*H,fb,{rot:-.05});else if(k>0){const py=yB-(1-ease(k))*H;x.save();x.translate(xP,py);x.rotate(-.08);x.fillStyle='#d61f1f';x.fillRect(-pw/2,-proPx*.7,pw,proPx*1.4);x.strokeStyle='#000';x.lineWidth=3;x.strokeRect(-pw/2,-proPx*.7,pw,proPx*1.4);x.restore();
   thps(x,'PRO',xP,py,proPx,{fill:'#fff',rot:-.08});}
  k=fly(HITS[3]-.5,.5);if(k>0){const xx=xM+(1-ease(k))*W*1.1,yy=yB;if(k<1)for(let j=0;j<3;j++)sparks.push({x:xx-wM*.45,y:yy+fb*.5,vx:-200-Math.random()*300,vy:-Math.random()*250,t:0,dur:.4});
   // the rail MANCALA grinds in on: only while it slides, gone a moment after it lands
   const ra=k<1?1:clamp(1-(introT-HITS[3])*4,0,1);if(ra>0){x.save();x.globalAlpha*=ra;x.strokeStyle='#9aa3ad';x.lineWidth=Math.max(2,fb*.06);x.beginPath();x.moveTo(0,yy+fb*.52);x.lineTo(W,yy+fb*.46);x.stroke();x.restore();}
   if(wordOK('mancala'))putWord('mancala',xx,yy,fb,{rot:-.05,scale:k<1?1:1+.06*Math.max(0,1-(introT-HITS[3])*4)});else thps(x,'MANCALA',xx,yy,fb,{grad:['#fffbd0','#ffd000','#ff7a00','#c42a00'],rot:-.05,lw:.2,maxW:W*.96,scale:k<1?1:1+.06*Math.max(0,1-(introT-HITS[3])*4)});}
  k=fly(BOOM,.18);if(k>0&&wordOK('extreme')){const sc=1+(1-k)*2.2,pulse=introT>BOOM+.2?1+.04*Math.sin(introT*14):1;putWord('extreme',cx,yC,fc*1.6,{rot:-.08,scale:sc*pulse});}else if(k>0){const sc=1+(1-k)*2.2,pulse=introT>BOOM+.2?1+.04*Math.sin(introT*14):1,bw=Math.min(W*.96,tw('EXTREME EDITION!!',fc)+fc*1.2)/2;x.save();x.translate(cx,yC);x.rotate(-.08);x.scale(sc*pulse,sc*pulse);x.fillStyle='#e01b1b';x.beginPath();x.moveTo(-bw,-fc*.72);x.lineTo(bw*1.02,-fc*.85);x.lineTo(bw,fc*.72);x.lineTo(-bw*1.02,fc*.85);x.closePath();x.fill();x.strokeStyle='#000';x.lineWidth=4;x.stroke();x.restore();
   thps(x,'EXTREME EDITION!!',cx,yC,fc,{grad:['#ffffff','#ffe600'],rot:-.08,scale:sc*pulse,maxW:bw*1.9});}
  k=fly(6.1,.35);if(k>0){const yy=cardsTop;for(const i of [0,1]){const side=i?1:-1,xx=cx+side*(cw*.62)+(1-ease(k))*side*W;
    x.save();x.translate(xx,yy+ch/2);x.rotate(side*.05);x.fillStyle=PCOL[i];x.fillRect(-cw/2-3,-ch/2-3,cw+6,ch+6);x.fillStyle='#111';x.fillRect(-cw/2,-ch/2,cw,ch);const hd=head(i,'win');if(hd)A.drawHead(x,hd,0,ch*.28,Math.min(cw,ch*.9));
    thps(x,nameOf(i).toUpperCase(),0,ch/2-hu*.6,hu*.9,{fill:'#fff',maxW:cw-6});x.restore();}
   const v=fly(6.45,.15);if(v>0)thps(x,'VS',cx,yy+ch/2,hu*2.4*(1+(1-v)*2),{grad:['#ffffff','#ff2d2d'],rot:-.1});}
  thps(x,'TAP TO SKIP',W/2,H-hu*1.2,hu*.55,{fill:'rgba(255,255,255,.55)',stroke:'rgba(0,0,0,.4)',alpha:introT>.4&&introT<6?.6+.4*Math.sin(introT*5):0});
  x.restore();
  if(introT>=INTRO_END)finishIntro();}
 function finishIntro(){if(introDone)return;introDone=true;if(!cues.has('w5'))music.main(onTrack);introT=INTRO_END;phase='play';busy=false;setBg(PLAY_BG);turnBanner();}

 // ---------------------------------------------------------------- end of run tally
 let endT=0,endRes=null,endResolve=null;
 async function endRun(){phase='end';endT=0;combo=null;const w=state.winner;
  const pr=store.profile;let newHigh=-1,newCombo=-1;if(pr){pr.proMancala=pr.proMancala&&typeof pr.proMancala==='object'?pr.proMancala:{};const pm=pr.proMancala;
   for(const i of [0,1]){if(cpu&&i===1)continue;if(!pm.high||P[i].points>pm.high.score){pm.high={name:nameOf(i).slice(0,16),score:P[i].points};newHigh=i;}if(!pm.combo||P[i].best>pm.combo.score){pm.combo={name:nameOf(i).slice(0,16),score:P[i].best};newCombo=i;}}
   try{saveProfile(pr);}catch{}}
  endRes={w,newHigh,newCombo};S.sfx('timeup');setTimeout(()=>S.sfx('crowd',1.4,3),500);S.sfx('hey');if(w<2){setMood(w,'win',99);setMood(1-w,'sad',99);}
  await new Promise(r=>{endResolve=r;});if(!s.alive)return;
  s.finish(w===2?[0,0]:w===0?[1,0]:[0,1],`Tony Hawk's Pro Mancala · stores ${state.pits[6]}–${state.pits[13]}`);}
 function drawEnd(dt){const W=lay.W,H=lay.H,hu=Math.min(lay.hu,H/26),e=endRes;endT+=dt;const a=clamp(endT*2,0,1);x.save();x.globalAlpha=a*.92;x.fillStyle='#04060c';x.fillRect(0,0,W,H);x.restore();
  thps(x,e.w===2?"IT'S A TIE!":nameOf(e.w).toUpperCase()+' WINS!',W/2,H*.08,hu*2.2,{grad:['#ffffff','#ffd000','#ff7a00'],alpha:a,maxW:W*.92,rot:-.04});
  const colW=Math.min(W*.46,hu*16),rows=[['STONES',i=>state.pits[i?13:6],false],['TRICK SCORE',i=>P[i].points,true],['BEST COMBO',i=>P[i].best,true],['COMBOS',i=>P[i].combos,false],['SPECIALS',i=>P[i].specials,false],['BAILS',i=>P[i].bails,false]];
  for(const i of [0,1]){const cx=W/2+(i?1:-1)*colW*.55,top=H*.14;const hd=head(i,P[i].mood);if(hd)A.drawHead(x,hd,cx,top+hu*6,Math.min(colW*.8,hu*6.5),Math.sin(T*2+i)*.05);
   thps(x,nameOf(i).toUpperCase(),cx,top+hu*7,hu*1.1,{fill:e.w===i?'#ffe600':'#fff',maxW:colW});
   rows.forEach(([label,val,count],r)=>{const y=top+hu*(8.6+r*1.75),v=val(i),k=clamp((endT-.6-r*.35)/.9,0,1),show=count?v*ease(k):(k>0?v:0);
    if(k>0&&k<1&&count&&Math.floor(endT*22)!==Math.floor((endT-dt)*22))S.sfx('tally',Math.floor(k*40));
    thps(x,label,cx,y,hu*.6,{fill:'#9fc3ff',alpha:k>0?1:0});thps(x,fmt(show),cx,y+hu*.75,hu*(r===0?1.3:1),{grad:r===0?['#ffffff','#ffe600']:['#ffffff','#bfe6ff'],alpha:k>0?1:0,maxW:colW});});}
  if(e.newHigh>=0&&endT>3)thps(x,'NEW HIGH SCORE!',W/2,H*.88,hu*1.4,{grad:['#ffffff','#ff3df2'],alpha:.6+.4*Math.sin(T*10),rot:-.05,maxW:W*.9});
  else if(e.newCombo>=0&&endT>3)thps(x,'NEW BEST COMBO!',W/2,H*.88,hu*1.3,{grad:['#ffffff','#38f2ff'],alpha:.6+.4*Math.sin(T*10),rot:-.05,maxW:W*.9});
  if(endT>3.3&&!e.total){e.total=1;S.sfx('total');}if(endT>2.5)thps(x,'TAP TO CONTINUE',W/2,H*.95,hu*.6,{fill:'#fff',alpha:.5+.5*Math.sin(T*5)});
  if(endT>7.5&&endResolve){const r=endResolve;endResolve=null;r();}}

 // ---------------------------------------------------------------- input
 s.on(c,'pointerdown',ev=>{ev.preventDefault?.();if(s.paused||!s.alive)return;
  if(phase==='intro'){if(introT>.3)skipIntro();return;}
  if(phase==='end'){if(endT>2.5&&endResolve){const r=endResolve;endResolve=null;r();}return;}
  if(cut){if(cut.t>.35)endCut();return;}
  if(busy||lockT>0||!localTurn())return;const p=s.pointer(ev);let best=-1,bd=1e9;
  for(const i of mancalaMoves(state)){const q=pitPos(i),d=Math.hypot((p.x-q.x)/q.rx,(p.y-q.y)/q.ry);if(d<bd){bd=d;best=i;}}
  if(best>=0&&bd<1.7)void sow(best);});
 s.hint('Kalah rules: tap a glowing bowl on your side to sow its gems counterclockwise, one per bowl (skip the other store). Last gem in your own store = COMBO and you go again. Last gem in an empty bowl of yours steals the bowl opposite. Tricks, gaps, combos and specials score skate points just for show: the stores decide who wins.');

 // ---------------------------------------------------------------- frame
 let fsTick=0;
 s.frame(dt=>{T+=dt;relayout();chooseK+=((phase==='play'&&!busy&&!cut&&localTurn()&&state.winner<0?1:0)-chooseK)*Math.min(1,dt*6);if(fsTick--<=0){fsTick=30;placeFs();}const W=lay.W,H=lay.H;
  const cw=Math.round(W*dpr),ch=Math.round(H*dpr);if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}x.setTransform(dpr,0,0,dpr,0,0);
  for(let i=waits.length-1;i>=0;i--)if(waits[i].f()||!s.alive){waits[i].r();waits.splice(i,1);}
  if(phase==='intro'){startIntro();const mt=introClock?music.time():null;if(mt!=null&&mt!==lastMt){lastMt=mt;mtStall=0;introT=Math.max(introT,mt-introClock.t0);}else{mtStall+=dt;if(!introClock||mtStall>.15)introT+=dt;}}
  lockT=Math.max(0,lockT-dt);shake=Math.max(0,shake-dt*30);flash=Math.max(0,flash-dt*1.6);
  for(const i of [0,1]){const p=P[i];p.cardKick=Math.max(0,p.cardKick-dt*2.5);p.cardShake=Math.max(0,p.cardShake-dt);
   if(p.moodT>0){p.moodT-=dt;if(p.moodT<=0)p.mood='normal';}else if(phase==='play'){p.idleT-=dt;if(p.idleT<=0){p.idleT=2.5+Math.random()*3;p.mood=state.turn===i&&!busy?pickOf(['think','think','normal','silly']):pickOf(['normal','normal','silly','think','win']);}}
   if(p.shown<p.points){p.shown=Math.min(p.points,p.shown+Math.max(7,(p.points-p.shown)*Math.min(1,dt*5)));p.tallyT-=dt;if(p.tallyT<=0){p.tallyT=.045;S.sfx('tally',Math.floor(p.shown/400));}}}
  if(phase==='play'&&!cut){npcT-=dt;if(npcT<=0){npcT=3.5+Math.random()*3.5;spawnNpc();}}
  if(combo)combo.t+=dt;
  x.save();if(shake&&!cut)x.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  if(cut)drawCut(dt);
  if(!cut){x.drawImage(park,0,0,W,H);drawBoard();drawFlyers(dt);
   for(let j=npcs.length-1;j>=0;j--){const n=npcs[j];n.t+=dt;if(n.t>=n.dur){npcs.splice(j,1);continue;}drawNpc(n);}
   drawSparks(dt);}
  for(const i of [0,1]){if(!cut)drawCard(i);drawHud(i);}
  drawCombo();drawPops(dt);if(!cut)drawBanner(dt);drawTrack(dt);
  if(phase==='play'&&!busy&&!cut&&!banner){const msg=theirs()?'ON THEIR PHONE…':cpu&&state.turn===1?nameOf(1).toUpperCase()+' IS THINKING…':'';if(msg){const sd=lay.side[state.turn];thps(x,msg,(sd.x0+sd.x1)/2,(sd.y0+sd.y1)/2,lay.hu*1.1,{fill:'#fff',alpha:.6+.4*Math.sin(T*5),maxW:(sd.x1-sd.x0)*.94});}}
  x.restore();
  if(flash>0){x.fillStyle=`rgba(255,255,255,${flash*.6})`;x.fillRect(0,0,W,H);}
  if(phase==='intro')drawIntro(dt);else if(phase==='end'&&endRes)drawEnd(dt);
  s.status(`${nameOf(state.turn)}${theirs()?' · on their phone':''} · stores ${state.pits[6]}–${state.pits[13]}`);
  const centers=lay.geo.pits.map((_,i)=>{const q=pitPos(i);return {x:q.x,y:q.y};});
  s.debug={state,sow,busy,phase,centers,P,lay,cut:cut?cut.kind:null,cutSpot:cut?cut.spot:null,cutPose:cut&&cut.pose?cut.pose.kind:null,skip:()=>{introT=INTRO_END;},skipCut:()=>endCut(),cutTo:(p,kind,anim,spot)=>{void cutTo(p,kind,anim,false,spot);},
   // text drawn over the play screen this frame (tests check none of it sits on the deck)
   overlays:()=>cut?[]:[...(combo?[['combo',comboLayout().rect]]:[]),...(banner?[['banner',bannerRect(banner.p)]]:[]),...pops.map(p=>['pop:'+p.text,p.r])],
   bot:net?()=>{if(phase==='intro'){finishIntro();return 'intro';}if(phase==='end'){if(endResolve){const r=endResolve;endResolve=null;r();}return 'end';}if(cut){endCut();return 'cut';}if(theirs()||busy||s.paused||state.winner>=0)return null;void sow(pickOf(mancalaMoves(state)));return 'sow';}:null};});
 if(cpu)cpuHotseat(s,{isTurn:()=>phase==='play'&&state.turn===1&&state.winner<0&&!busy,think:()=>sow(B.pickMancala(s,state))});
 S.preload();
 await s.pass(0,"Tony Hawk's Pro Mancala. Player 1's bowls are the bottom row (or left column on a tall screen), player 2's the top row (right column). Six bowls each, four gems in each, and your own store in the kicktail. Land in your store for a COMBO and go again; land in an empty bowl of yours to steal the one opposite.");
}
Object.assign(exports,{proMancala});
