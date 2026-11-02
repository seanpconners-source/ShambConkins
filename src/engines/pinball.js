// Pinball engine (band/music tables). Real pinball rules: 3 balls each, players alternate balls, no clock; 1P = a
// whole game on your own (beat the table's replay score). Physics, rules, DMD and art live in src/engines/pinball/;
// a game picks its table with `pinballTable` (default Bucketheadland). Controls: hold the left / right half of the
// screen for that flipper; drag down and release to pull the plunger; flick a finger up to nudge (too much = TILT).
// Online (two phones, s.online) it is still one machine: balls alternate (player 1's ball 1, player 2's ball 1, ...),
// the phone whose ball it is runs the table, the other phone watches it live; both scores stay on screen.
const {fullBleed}=require("src/engines/fullBleed.js");
const {fullscreenSupported,toggleFullscreen,fullscreenLabel}=require("src/fullscreen.js");
const {soloFinish,soloProgress}=require("src/solo.js");
const {store}=require("src/state.js");
const {saveProfile}=require("src/profile.js");
const P=require("src/engines/pinball/physics.js");
const {createMachine}=require("src/engines/pinball/machine.js");
const {createRenderer}=require("src/engines/pinball/render.js");
const {createDMD,scoreScene,splashScene}=require("src/engines/pinball/dmd.js");
const {pinballSound,rollLevel,stopRoll,setSoundBus}=require("src/engines/pinball/sound.js");
const {createMusic}=require("src/engines/pinball/music.js");
const {createSongs,createGuitar,soundBus,measure}=require("src/engines/pinball/tableAudio.js");
const {netField}=require("src/engines/netField.js");
const {createLights}=require("src/engines/pinball/lights.js");
const {loadDropins}=require("src/engines/pinball/dropins.js");
const audio=require("src/audio.js");
const TABLES={buckethead:require("src/engines/pinball/tables/buckethead.js"),"black-sabbath":require("src/engines/pinball/tables/sabbath.js"),"king-gizzard":require("src/engines/pinball/tables/gizzard.js")};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,fmt=n=>Math.round(n).toLocaleString('en-US');
const LEFT=new Set(['KeyZ','KeyA','ShiftLeft','ArrowLeft','ControlLeft']),RIGHT=new Set(['Slash','KeyL','ShiftRight','ArrowRight','ControlRight']),PLUNGE=new Set(['Enter','ArrowDown','Space','NumpadEnter']);

// Player view settings, shared by every table and saved in the profile: five zoom notches (0 = whole table, scaled to
// the height .. 4 = the table's width fills the screen, the default) and five ball speeds (2 = the table as built).
const ZOOMS=5,SPEEDS=[.8,.9,1,1.1,1.2];
function viewSettings(){const v=store.profile?.settings?.pinballView||{};return {zoom:Number.isInteger(v.zoom)&&v.zoom>=0&&v.zoom<ZOOMS?v.zoom:ZOOMS-1,speed:Number.isInteger(v.speed)&&v.speed>=0&&v.speed<SPEEDS.length?v.speed:2};}
function saveView(v){if(!store.profile)return;store.profile.settings.pinballView={zoom:v.zoom,speed:v.speed};saveProfile(store.profile);}
const PANEL_CSS=`.pb-tools{position:absolute;z-index:13;display:flex;gap:4px}
 .pb-tools button{width:30px;height:30px;min-width:0;min-height:0;padding:0;margin:0;border-radius:999px;background:#000a;color:#fff;border:1px solid #ffffff40;box-shadow:none;font:700 15px/28px system-ui,sans-serif;text-align:center;cursor:pointer}
 .pb-shell .fb-fs{display:none}
 body.pb-net #duel-chip{display:none}
 .pb-panel{position:absolute;inset:0;z-index:25;display:flex;align-items:center;justify-content:center;background:#0008;touch-action:none}
 .pb-card{width:min(340px,88vw);background:#141019f2;color:#fff;border:1px solid #ffffff30;border-radius:14px;padding:16px 18px 14px;font:14px/1.3 system-ui,sans-serif;box-shadow:0 10px 40px #000c}
 .pb-card h3{margin:0 0 12px;font-size:15px;letter-spacing:.08em;text-align:center}
 .pb-row{margin:0 0 14px}.pb-row b{display:block;margin-bottom:6px;font-size:13px}
 .pb-row input[type=range]{width:100%;margin:0;accent-color:#ffd23f;height:28px}
 .pb-ticks{display:flex;justify-content:space-between;padding:0 6px;margin-top:-4px}.pb-ticks i{width:2px;height:7px;background:#ffffff70}
 .pb-ends{display:flex;justify-content:space-between;font-size:11px;color:#ffffffa0;margin-top:3px}
 .pb-check{display:flex;align-items:center;gap:8px;font-size:13px;margin:0 0 14px}.pb-check input{width:18px;height:18px;accent-color:#ffd23f}
 .pb-card .pb-done{display:block;width:100%;min-height:40px;border-radius:10px;border:0;background:#ffd23f;color:#1a1200;font-weight:800;font-size:14px;cursor:pointer}`;
function highTable(id){return (store.profile?.pinballHigh?.[id]||[]).slice();}
function recordHigh(id,name,score){if(!store.profile)return -1;const book=store.profile.pinballHigh||={},list=(book[id]||[]).slice();list.push({name:String(name).toUpperCase().slice(0,12),score:Math.floor(score)});list.sort((a,b)=>b.score-a.score);const rank=list.findIndex(e=>e.score===Math.floor(score)&&e.name===String(name).toUpperCase().slice(0,12));book[id]=list.slice(0,5);saveProfile(store.profile);return rank<5?rank:-1;}

async function pinball(s){
 const table=TABLES[s.game?.pinballTable]||TABLES.buckethead,online=!!s.online,solo=!!s.solo&&!online,nP=solo?1:2;
 const [c,x]=s.canvas(390,780,{fill:true});fullBleed(s,{bg:'#07060a'});s.body.classList.add('drag-arena-body');
 const m=createMachine({table,players:nP,seed:s.seed||1,level:s.solo?.level||'normal',onSound:name=>sound(name)});
 // drop-in art (assets/pinball/<table>/): rebuild the cached playfield when a picture finishes loading
 let R=null;const imgs=loadDropins(table.id||'buckethead',()=>R?.invalidate());
 R=createRenderer({def:m.def,art:table.art,imgs});const lights=createLights(m.def);
 const dmd=createDMD(),rules=table.rules,names=s.players.slice(0,nP).map(p=>p.name);
 const replay=rules.replay?.[s.solo?.level||'normal']||rules.replay?.normal||0;
 let phase='intro',phaseT=0,t=0,bonus=null,hintT=6,over=false,auto=false,highRanks=null,handedOff=false;
 // The table's own soundtrack replaces the board score while the game runs.
 const music=createMusic(table.songs||{},{paused:()=>s.paused||!s.alive});let song=null;
 audio.stopMusic();s.cleanup(()=>{music.stop();if(store.profile?.settings.music)try{audio.startMusic();}catch{}});
 // Recorded table audio (tables/<table>Audio.js): the band's real songs replace the synth band (the song follows the game:
 // modes and multiball switch it, 'wait'/'bonus' duck it, 'tilt' fades it), guitar licks ride on the machine's sounds.
 let nowSong=null,nowT=-9;
 const songs=table.audio?createSongs(table.audio,{paused:()=>s.paused||!s.alive,onSong:sg=>{nowSong=sg;nowT=t;}}):{has:false};
 const gtr=table.audio?createGuitar(table.audio,{onLick:sec=>songs.duck?.(sec)}):{has:false};gtr.preload?.();
 if(gtr.has){setSoundBus(()=>soundBus()?.input,table.audio.synthTrim);}
 s.cleanup(()=>{songs.stop?.();gtr.stop?.();setSoundBus(null);});
 // The music's level: title / game over calm, play medium, a mode or multiball heavy (songs change only on those changes).
 const musicLevel=()=>phase==='intro'||phase==='zoom'||phase==='gameover'?1:m.mb>1||rules.music?.(m)!=='main'?3:2;
 let level=1;const setSong=(name,lv=level)=>{if(songs.has){songs.set(name,lv);song=name;level=lv;return;}const n=name==='wait'||name==='bonus'||name==='tilt'?null:name;if(n===song)return;song=n;if(n)music.play(n);else music.stop();};
 // Every machine sound goes through here: the table's guitar part, then the synth sound unless the guitar replaces it.
 // Online, the sounds of this phone's ball also go to the watching phone (relay=false = one that came from there).
 const netSnd=[];
 const sound=(name,relay=true)=>{if(relay&&net&&phase==='ball'&&mine()&&netSnd.length<48)netSnd.push(name);if(gtr.has&&gtr.sound(name))return;pinballSound(name);};
 // ---- online: one machine on two phones. The phone whose ball it is runs the table and streams it ~20 times a second
 // (balls, flippers, parts, lamps, DMD message, sounds, song); the other phone draws it DELAY s late, easing the balls
 // between snapshots. When the ball drains it sends the bonus and the player's score/ball/extra ({eb}); both phones count
 // the bonus and run the same m.advance(), so the next ball is played on whichever phone owns that player.
 const net=online?netField(s,{pack:packSnap,unpack:(i,d)=>feed(d,null),onEvent:e=>feed(null,e),hz:20}):null,me=net?net.me:0;
 const mine=()=>!net||m.cur===me;
 const DELAY=.12,tl=[];let snapCur=null,rLamps={},rGi=1,rFl=null,rT=0,rTAt=0,rmsg=null,rcr='',rsong='main',rlevel=2,yourT=0;
 let sentParts={},sentLamps='',lampStr='';
 const r1=v=>Math.round(v*10)/10,r3=v=>Math.round(v*1000)/1000;
 function packSnap(){const w=m.w,pp={};let np=0;
  for(const [id,p] of Object.entries(w.parts)){const v=[p.down?1:0,p.lit?1:0,p.on?1:0,p.armed?1:0,p.flash>0?1:0,r3(p.angle||0),r1(p.spin||0),r1(p.ox||0),r1(p.oy||0)],k=v.join();if(sentParts[id]!==k){sentParts[id]=k;pp[id]=v;np++;}}
  const st={t:r3(m.t),sc:m.players[m.cur].score,gi:+m.gi.toFixed(2),cr:rules.dmdMode?.(m)||'',sd:song,lv:level,mu:songs.leadPos?.()||null,pl:w.plunger?r3(w.plunger.pull):0,f:w.flippers.map(f=>r3(f.a)),
   b:w.balls.map(b=>{const a=[b.id,r1(b.x),r1(b.y),r1(b.z||0)];if(b.state==='rail')a.push('r',w.rails.indexOf(b.rail.r),r1(b.rail.s),r1(b.rail.v));else if(b.state==='held')a.push('h',b.hold?.hole?.id||'',b.hold?.hole?.magnet?1:0);else a.push('f',r1(b.vx),r1(b.vy));return a;}),
   c:w.captives.map(b=>[r1(b.x),r1(b.y)]),fl:Object.entries(m.flashers).map(([id,f])=>[id,r3(f.t0),f.count])};
  if(np)st.p=pp;if(lampStr!==sentLamps){sentLamps=lampStr;st.L=lampStr;}
  if(m.msg)st.g=[m.msg.lines,m.msg.anim,r3(m.msg.age),m.msg.dur,m.msg.flash?1:0];
  if(netSnd.length)st.s=netSnd.splice(0);return st;}
 function feed(d,ev){tl.push({at:performance.now()/1000,d,ev});if(tl.length>2000)tl.splice(0,tl.length-2000);}
 // the watching phone: apply what is due, then place the balls between the last snapshot and the next one
 function watchTick(dt){const now=performance.now()/1000,rt=now-DELAY;
  while(tl.length&&tl[0].at<=rt){const e=tl.shift();if(e.ev){remoteEvent(e.ev);if(phase!=='ball')return;continue;}applySnap(e,rt-e.at);}
  if(rmsg){rmsg.age+=dt;if(rmsg.age>=rmsg.dur)rmsg=null;}
  if(!snapCur)return;const nx=tl.find(e=>e.d),k=nx?clamp((rt-snapCur.at)/Math.max(.001,nx.at-snapCur.at),0,1):0,a=snapCur.d,b=nx?.d,w=m.w;
  const nb=new Map((b?.b||[]).map(q=>[q[0],q])),mix=(q,n,i)=>n&&n[4]===q[4]?q[i]+(n[i]-q[i])*k:q[i];
  w.balls=a.b.map(q=>{const n=nb.get(q[0]),ball={id:q[0],x:mix(q,n,1),y:mix(q,n,2),z:mix(q,n,3),r:P.BALL_R,state:'free',vx:0,vy:0,rail:null,hold:null};
   if(q[4]==='r'&&w.rails[q[5]]){ball.state='rail';ball.rail={r:w.rails[q[5]],s:mix(q,n,6),v:q[7]};}
   else if(q[4]==='h'){ball.state='held';ball.hold={hole:w.holes.find(h=>h.id===q[5])||{id:q[5],x:ball.x,y:ball.y,magnet:!!q[6]},t:1};}
   else{ball.vx=q[5]||0;ball.vy=q[6]||0;}return ball;});
  if(b?.f)w.flippers.forEach((f,i)=>{if(a.f[i]!=null)f.a=a.f[i]+((b.f[i]??a.f[i])-a.f[i])*k;});}
 function applySnap(e,age){const d=e.d,w=m.w;snapCur=e;
  if(d.p)for(const [id,v] of Object.entries(d.p)){const p=w.parts[id];if(!p)continue;p.down=!!v[0];p.lit=!!v[1];p.on=!!v[2];p.armed=!!v[3];p.flash=v[4]?.12:0;p.angle=v[5];p.spin=v[6];p.ox=v[7];p.oy=v[8];const toy=w.toys?.find(q=>q.id===id);if(toy){toy.ox=v[7];toy.oy=v[8];}}
  if(d.L!=null){rLamps={};m.def.lamps.forEach((l,i)=>{const n=+d.L[i]||0;if(n)rLamps[l.id]=n/9;});}
  w.flippers.forEach((f,i)=>{if(d.f?.[i]!=null)f.a=d.f[i];});if(w.plunger)w.plunger.pull=d.pl||0;
  (d.c||[]).forEach((q,i)=>{const b=w.captives[i];if(b){b.x=q[0];b.y=q[1];}});
  m.players[m.cur].score=d.sc|0;rGi=d.gi??1;rcr=d.cr||'';rsong=d.sd||'main';rlevel=d.lv||2;if(d.mu&&songs.has&&age<1)songs.follow(d.mu[0],d.mu[1]+age);rT=d.t;rTAt=t;
  rFl=d.fl?.length?Object.fromEntries(d.fl.map(([id,t0,count])=>[id,{t0,count}])):null;
  rmsg=d.g?{lines:d.g[0],anim:d.g[1],age:d.g[2]+age,dur:d.g[3],flash:!!d.g[4]}:null;
  if(d.s&&age<.5)for(const n of d.s)sound(n,false);}
 function remoteEvent(ev){const q=ev.eb;if(!q||phase!=='ball'||mine()||q.p!==m.cur)return;
  const pl=m.players[m.cur];pl.score=q.sc|0;pl.ball=q.b|0;pl.extra=q.x|0;m.p.bonusX=q.bx||1;m.w.balls=[];snapCur=null;rmsg=null;
  rollLevel(0);bonus={lines:q.l||[],total:q.tt|0,step:0};phase='bonus';phaseT=0;}
 // Player faces for the DMD (redrawn now and then: portraits can arrive late).
 const faces=[],faceT=[];
 const face=i=>{if(i==null)return null;if(!faces[i]||t-(faceT[i]||0)>2){const cv=faces[i]||document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d');g.clearRect(0,0,64,64);try{s.sprite(g,i,32,32,60,{exact:true,noBadge:true});}catch{}faces[i]=cv;faceT[i]=t;}return faces[i];};
 const fingers=new Map(),keys={flip:[false,false],pull:false,pullT:0};let pull=0;
 const scores=()=>m.players.map(p=>p.score);
 const clear=()=>{for(const id of fingers.keys())s.release({pointerId:id});fingers.clear();keys.flip=[false,false];keys.pull=false;pull=0;};
 const flipInput=()=>{const f=[keys.flip[0],keys.flip[1]];for(const g of fingers.values())if(!g.plunger)f[g.side]=true;return f;};
 const W=()=>s.W,H=()=>s.H;
 s.hint('Hold the left or right half of the screen for that flipper (two thumbs). Ball on the plunger: drag down and let go, a longer pull shoots harder. Flick a finger up to nudge the table; too many nudges and it TILTS. Tap the score display to switch AUTO ZOOM (the view pulls back a little while the ball flies). Keys: Z / Shift / ← and / / Shift / → flip, hold Enter or ↓ to pull the plunger, Space nudges, V toggles auto zoom.');
 // Auto zoom (speed zoom-out) is a saved setting; tapping the DMD or pressing V switches it.
 R.cam.speedZoom=!!store.profile?.settings?.pinballZoom;
 const toggleZoom=()=>{R.cam.speedZoom=!R.cam.speedZoom;if(store.profile){store.profile.settings.pinballZoom=R.cam.speedZoom;saveProfile(store.profile);}m.say(['AUTO ZOOM',R.cam.speedZoom?'ON':'OFF'],1.2);pinballSound('rollover');};
 // Zoom and ball speed (the ⚙ button): five notches each, remembered for every table.
 const view=viewSettings();const applyView=()=>{R.cam.zoomK=view.zoom/(ZOOMS-1);m.timeScale=(m.def.timeScale||1)*SPEEDS[view.speed];};applyView();
 let menuOpen=false;
 const shell=s.body.closest('.game-shell'),tools=document.createElement('div');tools.className='pb-tools';
 const css=document.createElement('style');css.textContent=PANEL_CSS;
 if(shell){shell.classList.add('pb-shell');shell.append(css,tools);s.cleanup(()=>{tools.remove();css.remove();shell.querySelector('.pb-panel')?.remove();shell.classList.remove('pb-shell');});}
 // online the scoreboard shows both scores, so the duel chip (which would sit on the DMD) is hidden
 if(online){document.body.classList.add('pb-net');s.cleanup(()=>document.body.classList.remove('pb-net'));}
 const gear=document.createElement('button');gear.type='button';gear.textContent='⚙';gear.title='Zoom and ball speed';gear.setAttribute('aria-label','Pinball settings');tools.append(gear);
 let fsb=null;if(fullscreenSupported()){fsb=document.createElement('button');fsb.type='button';fsb.textContent=fullscreenLabel('icon');fsb.title='Full screen';fsb.setAttribute('aria-label','Toggle full screen');tools.append(fsb);
  s.on(fsb,'click',e=>{e.preventDefault();e.stopPropagation();toggleFullscreen();});const sync=()=>{fsb.textContent=fullscreenLabel('icon');};s.on(document,'fullscreenchange',sync);s.on(document,'webkitfullscreenchange',sync);}
 for(const b of tools.children)s.on(b,'pointerdown',e=>e.stopPropagation());
 // the buttons sit left of Pause/Exit when the backbox has room there, else just under them
 let toolsKey='';const placeTools=()=>{const acts=shell?.querySelector('.game-actions'),r=acts?.getBoundingClientRect(),sr=shell?.getBoundingClientRect();if(!r||!sr)return;
  const L=R.layout(W(),H()),right=sr.right-r.left+6,row=L.dmd.x+L.dmd.w+8<sr.width-right-70,key=row?`r${Math.round(right)},${Math.round(r.top-sr.top)}`:`c${Math.round(sr.right-r.right)},${Math.round(r.bottom-sr.top)}`;if(key===toolsKey)return;toolsKey=key;
  Object.assign(tools.style,row?{right:right+'px',top:(r.top-sr.top+1)+'px'}:{right:(sr.right-r.right)+'px',top:(r.bottom-sr.top+5)+'px'});};
 function openMenu(){if(menuOpen||!shell)return;menuOpen=true;clear();
  const notch=n=>`<div class="pb-ticks">${'<i></i>'.repeat(n)}</div>`;
  const panel=document.createElement('div');panel.className='pb-panel';panel.innerHTML=`<div class="pb-card" role="dialog" aria-label="Pinball settings"><h3>TABLE SETTINGS</h3>
   <div class="pb-row"><b>Zoom</b><input type="range" min="0" max="${ZOOMS-1}" step="1" value="${view.zoom}" data-k="zoom" aria-label="Zoom">${notch(ZOOMS)}<div class="pb-ends"><span>Whole table</span><span>Full width</span></div></div>
   <div class="pb-row"><b>Ball speed</b><input type="range" min="0" max="${SPEEDS.length-1}" step="1" value="${view.speed}" data-k="speed" aria-label="Ball speed">${notch(SPEEDS.length)}<div class="pb-ends"><span>Slower</span><span>Normal</span><span>Faster</span></div></div>
   <label class="pb-check"><input type="checkbox" data-k="auto" ${R.cam.speedZoom?'checked':''}>Auto zoom out when the ball is fast</label>
   <button type="button" class="pb-done">Done</button></div>`;
  shell.append(panel);
  for(const ev of ['pointerdown','pointermove','pointerup'])panel.addEventListener(ev,e=>e.stopPropagation());
  panel.addEventListener('input',e=>{const k=e.target.dataset.k;if(k==='zoom'||k==='speed'){view[k]=+e.target.value;applyView();saveView(view);pinballSound('rollover');}});
  panel.addEventListener('change',e=>{if(e.target.dataset.k==='auto'&&e.target.checked!==R.cam.speedZoom)toggleZoom();});
  const close=()=>{panel.remove();menuOpen=false;};panel.querySelector('.pb-done').addEventListener('click',close);panel.addEventListener('click',e=>{if(e.target===panel)close();});}
 s.on(gear,'click',e=>{e.preventDefault();e.stopPropagation();openMenu();});
 // ---- input
 s.on(c,'pointerdown',ev=>{if(s.paused||menuOpen||!(phase==='ball')||!mine())return;ev.preventDefault();const p=s.pointer(ev);
  if(p.y<R.layout(W(),H()).stripH&&p.x<W()-130){toggleZoom();return;}fingers.set(ev.pointerId,{side:p.x<W()/2?0:1,x0:p.x,y0:p.y,t0:performance.now(),plunger:false,nudged:false,pull:0});s.capture(ev);});
 s.on(c,'pointermove',ev=>{const f=fingers.get(ev.pointerId);if(!f||s.paused)return;ev.preventDefault();const p=s.pointer(ev),dy=p.y-f.y0;
  if(!f.plunger&&dy>14&&m.canPlunge())f.plunger=true;
  if(f.plunger)f.pull=clamp((dy-8)/(H()*.2),0,1);
  else if(!f.nudged&&m.phase==='play'&&-dy>H()*.06&&performance.now()-f.t0<260){f.nudged=true;m.nudge(clamp((p.x-f.x0)*2,-160,160),-300);}});
 const up=(ev,cancel)=>{const f=fingers.get(ev.pointerId);if(!f)return;fingers.delete(ev.pointerId);s.release(ev);if(f.plunger&&!cancel&&f.pull>.04&&m.canPlunge(400))P.plunge(m.w,f.pull);};
 s.on(c,'pointerup',ev=>up(ev,false));s.on(c,'pointercancel',ev=>up(ev,true));s.on(c,'lostpointercapture',ev=>up(ev,true));
 s.on(document,'keydown',ev=>{if(s.paused||menuOpen||phase!=='ball'||!mine())return;const k=ev.code;
  if(LEFT.has(k)){keys.flip[0]=true;ev.preventDefault();}else if(RIGHT.has(k)){keys.flip[1]=true;ev.preventDefault();}
  else if(PLUNGE.has(k)){ev.preventDefault();if(m.canPlunge()){if(!keys.pull){keys.pull=true;keys.pullT=0;}}else if((k==='Space'||k==='KeyN')&&!ev.repeat)m.nudge(0,-300);}
  else if(k==='KeyN'&&!ev.repeat)m.nudge(0,-300);
  else if(k==='KeyV'&&!ev.repeat)toggleZoom();});
 s.on(document,'keyup',ev=>{const k=ev.code;if(LEFT.has(k))keys.flip[0]=false;else if(RIGHT.has(k))keys.flip[1]=false;else if(PLUNGE.has(k)&&keys.pull){keys.pull=false;if(m.canPlunge(400))P.plunge(m.w,clamp(keys.pullT/1.1,.05,1));keys.pullT=0;}});
 s.on(window,'blur',clear);s.resetOnPause?.(clear);s.cleanup(()=>{clear();stopRoll();});
 // ---- autopilot for tests (s.debug.auto = true): flips when a ball drops onto a flipper, plunges at 70%.
 let botHold=[0,0],botPlungeAt=0;
 function bot(dt){const f=[false,false];for(const fl of m.w.flippers){const mid=fl.x+Math.cos(fl.rest)*fl.len/2;for(const b of m.w.balls)if(b.state==='free'&&Math.abs(b.x-mid)<58&&b.y-fl.y>-70&&b.y-fl.y<20&&b.vy>40)botHold[fl.input]=.16;}
  for(let i=0;i<2;i++)if(botHold[i]>0){f[i]=true;botHold[i]-=dt;}
  if(m.canPlunge()){botPlungeAt+=dt;if(botPlungeAt>.8){P.plunge(m.w,.72);botPlungeAt=0;}}return f;}

 // ---- flow
 async function handoff(i,again){
  clear();phase='wait';
  // online: one card at the start (each phone shows its own player); after that the balls just change phones
  if(online){if(handedOff){if(i===me)yourT=2.4;return true;}handedOff=true;const o=names[1-me]||'',fmtB=`${rules.balls} balls each`;
   return s.pass(me,me===0?`You shoot first. Ball 1 of ${rules.balls}, then ${o} plays their ball 1 on their phone while yours shows it live, and so on: balls alternate like a real machine (${fmtB}). Both scores stay on screen; highest wins. Hold the left/right half of the screen to flip, drag down + release to launch, flick up to nudge.`
    :`${o} shoots first: you watch their ball live on this phone, then it's your ball 1. Balls alternate like a real machine (${fmtB}). Both scores stay on screen; highest wins. Hold the left/right half of the screen to flip, drag down + release to launch, flick up to nudge.`,'Ready');}
  const pl=m.players[i],text=solo?`${names[0]}: three balls, no clock. Replay at ${fmt(replay)}. ${rules.howTo||''}`:`${names[i]}, you're up${again?': SHOOT AGAIN':''}. Ball ${pl.ball} of ${rules.balls}. ${pl.score?`You have ${fmt(pl.score)}.`:''} Hold the left/right half of the screen to flip, drag down + release to launch, flick up to nudge.`;
  if(solo&&(pl.ball>1||again))return true;
  return s.pass(i,text,'Ready');
 }
 // the next ball: played here, or (online, the other player's ball) watched here
 function begin(){if(mine())startBall();else watchBall();}
 function watchBall(){phase='ball';phaseT=0;m.w.balls=[];snapCur=null;rLamps={};rFl=null;rcr='';
  const pl=m.players[m.cur];rmsg={lines:[`PLAYER ${m.cur+1}`,(names[m.cur]||'').toUpperCase().slice(0,12),`BALL ${pl.ball}`],anim:'face',flash:false,age:0,dur:1.8};}
 function startBall(){for(let i=tl.length-1;i>=0;i--)if(tl[i].d)tl.splice(i,1);sentParts={};sentLamps='';netSnd.length=0;
  m.startBall();phase='ball';phaseT=0;R.follow(m.w,1,W(),H(),true);sound('start');
  // the player's face on the DMD first, then the table's own ball-start message (skill shot)
  const pl=m.players[m.cur],first=m.msg;m.msg={lines:[nP>1?`PLAYER ${m.cur+1}`:'',(names[m.cur]||'').toUpperCase().slice(0,12),`BALL ${pl.ball}${pl.extra&&m.shootAgainLamp?' · AGAIN':''}`],dur:1.8,anim:'face',flash:false,age:0};if(first)m.msgs.unshift(first);}
 async function next(){
  const nx=m.advance();
  if(!nx){phase='gameover';phaseT=0;sound('gameOver',false);
   // high scores go in now so the DMD can celebrate them (one line per player)
   highRanks=scores().map((v,i)=>v>0?recordHigh(table.id||'buckethead',names[i]||`P${i+1}`,v):-1);if(highRanks.some(r=>r>=0))sound('knocker',false);return;}
  if(!await handoff(nx.player,nx.again))return;if(!s.alive)return;
  if(R.cam.z<1){phase='zoom';phaseT=0;return;}begin();
 }
 async function finishGame(){
  if(over)return;over=true;const sc=scores(),ranks=highRanks||sc.map(()=>-1);setSong(null);
  if(solo){const won=replay>0&&sc[0]>=replay;soloFinish(s,sc[0],won?1:0,`${table.title} · ${fmt(sc[0])}${won?' · REPLAY!':''}${ranks[0]>=0?` · high score #${ranks[0]+1}`:''}`,won);}
  else s.finish(sc,`${table.title} pinball · 3 balls each${ranks.some(r=>r>=0)?' · new high score':''}`);
 }

 s.debug={engine:'pinball',m,phase,R,dmd,auto:false,view,openMenu,scores:scores(),plunge:p=>P.plunge(m.w,p),scenes:Object.keys(table.dmdScenes||{}),song:()=>songs.has?songs.role:music.current,nowSong:()=>songs.now||null,guitar:gtr.has,audio:()=>({songs:songs.status?.()||null,guitar:gtr.status?.()||null}),
  // tests: play one machine sound alone and return its loudest 50 ms RMS on the sound bus (dBFS)
  audioMeter:(name,ms)=>measure(()=>sound(name,false),ms),tableAudio:table.audio||null,
  net:()=>net&&{me,mine:mine(),queued:tl.length,balls:m.w.balls.length,remoteScore:m.players[m.cur].score},
  // tests (online-native): the autopilot plays this phone's balls; drainAfter = drain a ball after that many seconds
  bot(){s.debug.auto=true;if(s.debug.drainAfter&&phase==='ball'&&mine()&&m.phase==='play'&&phaseT>s.debug.drainAfter){m.saveUntil=0;for(const b of m.w.balls){b.state='free';b.x=236;b.y=1100;b.vx=0;b.vy=300;}}return '';}};
 s.frame((dtRaw)=>{
  const dt=Math.min(dtRaw,1/30);t+=dt;phaseT+=dt;
  const dpr=Math.min(2,window.devicePixelRatio||1),cw=Math.round(W()*dpr),ch=Math.round(H()*dpr);if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}
  auto=!!s.debug?.auto;placeTools();
  if(phase==='intro'){R.cam.z=0;if(phaseT>3.2){phase='zoom';phaseT=0;}}
  else if(phase==='zoom'){R.cam.z=clamp(phaseT/1.3,0,1);R.cam.y=m.def.H;if(R.cam.z>=1)begin();}
  else if(phase==='ball'&&!mine()){watchTick(dt);if(phase==='ball'){if(m.w.balls.length)R.follow(m.w,dt,W(),H());s.setScores(scores());}}
  else if(phase==='ball'&&menuOpen)R.follow(m.w,dt,W(),H());
  else if(phase==='ball'){
   if(keys.pull)keys.pullT+=dt;
   const flip=auto?bot(dt):flipInput();let pl=0;for(const g of fingers.values())if(g.plunger)pl=Math.max(pl,g.pull);if(keys.pull)pl=Math.max(pl,clamp(keys.pullT/1.1,0,1));pull=pl;
   const ev=m.tick(dt,{flip,pull:m.canPlunge(400)?pull:0});
   for(const e of ev){const snd={flip:'flip',flipDown:'flipDown',bumper:'bumper',sling:'sling',drop:'drop',standup:'standup',rollover:'rollover',spin:'spin',hole:'hole',eject:'eject',plunge:'plunge',kickback:'kick',trigger:'gate',wallHit:'wall',railEnter:null,rail:'rail'}[e.type];if(snd&&!(e.type==='wallHit'&&e.speed<700))sound(snd);
    if(e.type==='bumper'||e.type==='jackpot')s.react?.(m.cur,'happy');}
   let fast=0;for(const b of m.w.balls)if(b.state==='free')fast=Math.max(fast,Math.hypot(b.vx,b.vy));rollLevel(fast);
   R.follow(m.w,dt,W(),H());hintT=Math.max(0,hintT-dt);
   s.setScores(solo?[m.players[0].score,0]:scores());if(solo)soloProgress(s,m.players[0].score,0,`${table.title} · ball ${m.players[0].ball}`);
   if(m.phase==='drained'){rollLevel(0);bonus=m.endBall();bonus.step=0;phase='bonus';phaseT=0;clear();
    // online: the last snapshot (the drain), then the ball's end for the watching phone
    if(net){net.push();const pl=m.players[m.cur];net.event({eb:{p:m.cur,sc:pl.score,b:pl.ball,x:pl.extra,bx:m.p.bonusX||1,l:bonus.lines,tt:bonus.total}});}}
  }
  else if(phase==='bonus'){const steps=bonus.lines.length+1;if(Math.floor(phaseT/.9)!==bonus.step){bonus.step=Math.floor(phaseT/.9);if(bonus.step<=steps)pinballSound('bonus');}
   if(phaseT>.9*steps+.6){phase='wait';s.setScores(solo?[m.players[0].score,0]:scores());void next();}}
  else if(phase==='gameover'){if(phaseT>(highRanks?.some(r=>r>=0)?5:2.6))void finishGame();}
  // ---- music: attract under the intro and hand-offs, a build-up on the plunger, then whatever the rules ask for
  // (wait/bonus/tilt: the synth band goes quiet, recorded songs duck or fade; watching: the other phone's song)
  const watching=phase==='ball'&&!mine();
  setSong(phase==='intro'||phase==='zoom'||phase==='gameover'?'attract':phase==='wait'?'wait':phase==='bonus'?'bonus':watching?rsong:m.phase==='plunge'?'plunge':m.tilted?'tilt':rules.music?.(m)||'main',watching?rlevel:phase==='ball'||phase==='intro'||phase==='zoom'||phase==='gameover'?musicLevel():level);
  // ---- draw
  // Lights: the rules' lamps with any running light shows on top; attract shows between balls; dim for the bonus.
  const lamps=watching?rLamps:phase==='ball'?lights.apply(rules.lamps(m,t),m.shows,m.t):phase==='bonus'?bonusLamps(m.p):lights.attract(t);
  const gi=watching?rGi:phase==='ball'?m.gi:phase==='bonus'?.15:phase==='gameover'?.4:1;
  // attract: flasher domes fire one after another; in play the rules fire them (m.flashers)
  const fl=watching?rFl:phase==='ball'?m.flashers:attractFlash();
  const backglass=phase==='intro'?(phaseT<1.6?1:Math.max(0,1-(phaseT-1.6)/.6)):0;
  if(phase==='bonus')bonusScene();else if(phase==='gameover')gameOverScene();else if(phase==='intro'||phase==='zoom'||phase==='wait')attractScene();
  else if(watching?rmsg:m.msg)msgScene(watching?rmsg:m.msg);
  else scoreScene(dmd,{scores:scores(),cur:m.cur,ball:m.players[m.cur].ball,balls:rules.balls,names,t,credits:watching?rcr:rules.dmdMode?.(m)||(solo&&replay?`REPLAY ${fmt(replay)}`:'')});
  const v=R.draw(x,{W:W(),H:H(),dpr,w:m.w,lamps,t,dmd,strip:null,gi,flashers:fl,flashT:watching?rT+(t-rTAt):phase==='ball'?m.t:t,backglass});
  overlay(v,dt);
  // online: this phone's ball goes out to the watching phone (the lamps as one digit each, in the table's lamp order)
  if(net&&phase==='ball'&&mine()){lampStr=m.def.lamps.map(l=>Math.round(clamp(+lamps[l.id]||0,0,1)*9)).join('');net.tick(dt);}
  s.status(`${names[m.cur]||''} · ball ${m.players[m.cur].ball}/${rules.balls} · ${fmt(m.players[m.cur].score)}`);
  Object.assign(s.debug,{phase,auto,scores:scores()});
 });
 // A message: the table's animation for msg.anim (flash inverts on the beat), else the plain splash.
 const sceneCtx=()=>({t,face,cur:m.cur,names});
 function msgScene(msg){const sc=table.dmdScenes?.[msg.anim];if(!sc)return splashScene(dmd,{lines:msg.lines,flash:msg.flash,age:msg.age});
  sc(dmd,msg.age,msg.lines,sceneCtx());if(msg.flash&&msg.age<1.2&&Math.floor(msg.age*8)%2)dmd.invert();}
 // Attract loop (intro / hand-offs): park logo, grand champion, high-score table, game rules lines.
 function attractScene(){
  if(phase==='wait'&&!over){const sc=table.dmdScenes?.face;const pl=m.players[m.cur],L=[nP>1?`PLAYER ${m.cur+1}`:'',(names[m.cur]||'').toUpperCase().slice(0,12),`BALL ${pl.ball}`];return sc?sc(dmd,phaseT,L,sceneCtx()):splashScene(dmd,{lines:L,age:phaseT});}
  const hs=highTable(table.id||'buckethead'),slot=Math.floor(t/3)%4,age=t%3,sc=table.dmdScenes||{};
  if(slot===0&&sc.ferris)return sc.ferris(dmd,age,[table.title.toUpperCase(),'NOW OPEN'],sceneCtx());
  if(slot===1&&hs[0]){dmd.clear();dmd.text('GRAND CHAMPION',64,2,{align:'center',v:10});dmd.fit(hs[0].name,64,11,{align:'center'});dmd.fit(fmt(hs[0].score),64,21,{align:'center'});dmd.sparkle(age,10,6);return;}
  if(slot===2&&hs.length>1){dmd.clear();hs.slice(1,4).forEach((e,i)=>{dmd.text(`${i+2} ${e.name.slice(0,8)}`,2,1+i*11,{v:10});dmd.text(fmt(e.score),126,1+i*11,{align:'right'});});return;}
  const L=rules.attract||[table.title];splashScene(dmd,{lines:[L[Math.floor(t/3)%L.length]],age});}
 function bonusScene(){const i=Math.min(bonus.lines.length,Math.floor(phaseT/.9));dmd.clear();
  if(i<bonus.lines.length){const [k,v]=bonus.lines[i];dmd.fit(k,64,3,{align:'center'});dmd.fit(typeof v==='number'&&k.includes('X')?`${v}X`:fmt(v),64,14,{scale:2,align:'center'});}
  else{dmd.fit('TOTAL BONUS',64,3,{align:'center'});dmd.fit(fmt(bonus.total),64,14,{scale:2,align:'center'});}}
 function gameOverScene(){
  // new high score: the knocker fires and the panel celebrates each player that made the table
  const best=(highRanks||[]).map((r,i)=>[r,i]).filter(([r])=>r>=0);
  if(best.length&&phaseT>2){const [r,i]=best[Math.floor((phaseT-2)/1.5)%best.length],sc=table.dmdScenes?.jackpot;const L=[r===0?'GRAND CHAMPION':`HIGH SCORE #${r+1}`,`${(names[i]||'').toUpperCase().slice(0,10)} ${fmt(scores()[i])}`];
   if(sc)sc(dmd,(phaseT-2)%1.5,L,sceneCtx());else splashScene(dmd,{lines:L,age:phaseT});return;}
  dmd.clear();dmd.text('GAME OVER',64,1,{align:'center'});const sc=scores();if(nP===1)dmd.fit(fmt(sc[0]),64,12,{scale:2,align:'center'});else sc.forEach((v,i)=>dmd.fit(`${(names[i]||'P'+(i+1)).slice(0,8)} ${fmt(v)}`,64,11+i*10,{align:'center'}));}
 function bonusLamps(p){const L={};for(const n of [2,3,4,5,6])L['bx'+n]=p.bonusX>=n?1:0;L.shootAgain=m.players[m.cur].extra>0?Math.floor(t*4)%2:0;return L;}
 function attractFlash(){const fs=m.def.flashers;if(!fs.length)return null;const i=Math.floor(t/1.1)%fs.length,age=t%1.1;return age<.35?{[fs[i].id]:{t0:t-age,count:3}}:null;}
 // Touch hints + plunger meter, drawn in screen space.
 // 2 players: both scores side by side like the machine's score displays (whose ball it is, ball numbers, who leads).
 function scoreboard(v){
  const sc=scores(),w=W(),bw=Math.min(190,w*.5),x0=8,head=online&&phase==='ball'?(mine()?'YOUR BALL':`WATCHING ${(names[m.cur]||'').toUpperCase()}`):'',rh=16;
  const diff=Math.abs(sc[0]-sc[1]),lead=sc[0]===sc[1]?-1:sc[0]>sc[1]?0:1,foot=lead<0?(sc[0]?'TIED':''):`${(names[lead]||'P'+(lead+1)).toUpperCase().slice(0,10)} LEADS BY ${fmt(diff)}`;
  const y0=v.top+6,hh=(head?14:0)+rh*2+(foot?13:0)+6;
  x.fillStyle='rgba(0,0,0,.55)';x.beginPath();x.roundRect?x.roundRect(x0,y0,bw,hh,8):x.rect(x0,y0,bw,hh);x.fill();
  let y=y0+3;x.textBaseline='top';
  if(head){x.font='bold 10px Arial';x.textAlign='left';x.fillStyle=mine()?'#7CFF8A':'#9ad1ff';x.fillText(head,x0+7,y+1);y+=14;}
  for(let i=0;i<2;i++){const cur=i===m.cur&&phase!=='gameover',pl=m.players[i];x.font=`${cur?'bold ':''}12px Arial`;x.fillStyle=cur?'#ffd23f':'rgba(255,255,255,.72)';
   x.textAlign='left';x.fillText(`${cur?'▶':'  '} ${(names[i]||'P'+(i+1)).slice(0,9)}${lead===i?' ★':''}`,x0+5,y+2);
   x.textAlign='right';x.fillText(fmt(sc[i]),x0+bw-32,y+2);x.font='10px Arial';x.fillText(`B${Math.min(rules.balls,pl.ball)}`,x0+bw-6,y+3);y+=rh;}
  if(foot){x.font='10px Arial';x.textAlign='left';x.fillStyle='rgba(255,255,255,.55)';x.fillText(foot,x0+7,y+1);}}
 function overlay(v,dt=0){
  const w=W(),h=H();x.save();x.setTransform(Math.min(2,window.devicePixelRatio||1),0,0,Math.min(2,window.devicePixelRatio||1),0,0);
  if(nP>1&&(phase==='ball'||phase==='bonus'||phase==='wait'||phase==='gameover'))scoreboard(v);
  // Now playing (recorded songs): artist and title for a few seconds when a song starts
  if(nowSong&&t-nowT<4.5&&phase!=='intro'){const a=Math.min(1,(4.5-(t-nowT))/.6,(t-nowT)/.3),txt=`♪ ${table.audio?.artist||''}${table.audio?.artist?' · ':''}${nowSong.title}${nowSong.album?` (${nowSong.album})`:''}`;
   x.globalAlpha=a;x.font='bold 12px Arial';const tw=Math.min(w-16,x.measureText(txt).width+18),yy=h-58;x.fillStyle='rgba(0,0,0,.6)';x.fillRect((w-tw)/2,yy-10,tw,20);x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.fillText(txt,w/2,yy,w-20);x.globalAlpha=1;}
  // online: your turn now
  if(yourT>0&&phase==='ball'&&mine()){yourT-=dt;x.globalAlpha=Math.min(1,yourT/.5);x.font='900 30px Arial';x.textAlign='center';x.textBaseline='middle';x.lineWidth=5;x.strokeStyle='#000';x.strokeText('YOUR BALL!',w/2,h*.42);x.fillStyle='#ffd23f';x.fillText('YOUR BALL!',w/2,h*.42);x.globalAlpha=1;}
  if(phase!=='ball'||!mine()){x.restore();return;}
  if(m.canPlunge()){const pl=m.w.plunger,[sx,sy]=R.toScreen(v,(pl.x0+pl.x1)/2,pl.y);const mh=Math.min(110,h*.18),mx=Math.min(w-14,sx),my=clamp(sy-mh-20,v.top+10,h-mh-10);
   x.fillStyle='rgba(0,0,0,.55)';x.fillRect(mx-7,my,14,mh);x.fillStyle=pull>.85?'#ff3b30':'#ffd23f';x.fillRect(mx-5,my+2,10,(mh-4)*pull);
   if(pull<.05){x.fillStyle='rgba(255,255,255,.9)';x.font='bold 13px Arial';x.textAlign='right';x.textBaseline='middle';x.fillText('DRAG DOWN & RELEASE ⤓',mx-12,my+mh/2);}}
  if(hintT>0&&m.players[m.cur].ball===1){x.globalAlpha=Math.min(1,hintT)*.55;x.fillStyle='#fff';x.font='bold 13px Arial';x.textBaseline='bottom';x.textAlign='left';x.fillText('◀ HOLD: LEFT FLIPPER',10,h-34);x.textAlign='right';x.fillText('RIGHT FLIPPER: HOLD ▶',w-10,h-34);
   x.fillStyle='rgba(255,255,255,.25)';x.fillRect(w/2-.5,v.top+40,1,h-v.top-80);}
  x.restore();
 }
 if(!await handoff(0,false)||!s.alive)return;
 phase='intro';phaseT=0;
}
Object.assign(exports,{pinball,PINBALL_TABLES:TABLES});
