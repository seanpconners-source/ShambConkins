// DOOM / DOOM II for ShambConkins: the full game (title screen, menus, episodes, intermission, finales) on a JS
// rebuild of the 1993 engine (src/engines/doom/). Data comes from the owner's own DOOM.WAD / DOOM2.WAD when present
// (picked on the phone in Options, or dropped into assets/doom/user/ before building), otherwise from Freedoom.
// Monsters wear random roster heads; the status-bar face is the player's character.
//  1P: regular Doom, level after level (dying restarts the level); the run banks one tally score per level.
//  2P: player 1 picks episode, level and skill; each player gets one life on that level; Doom tally score wins.
// Touch (like the Android port): left thumb = floating move stick, right side = drag to turn, FIRE / USE buttons
// (drag on FIRE also turns), tap the status-bar arms numbers or the weapon button to switch, MAP and menu buttons.
// Keys: WASD / arrows move, Q/E or arrows turn, Ctrl/Space/J fire, Enter/F use, 1-7 weapons, Tab map, Esc menu.
// Online (s.online): CO-OP on one level, the way 1993 netgames ran: both phones run the same deterministic game and
// swap only ticcmds. Each phone sends its player's ticcmd for tic n+DELAY {t}, and a tic runs once both are in (a slow
// link stalls both rather than drifting). The phones first agree on the data {wad} (different WADs → both use Freedoom),
// player 1 picks episode, level and skill {go}; every second a state hash {h} is swapped to spot a desync. Co-op rules
// (game.js/actions.js coop): both player starts, multiplayer things, placed weapons stay for the partner, keys are
// shared, USE brings you back beside your partner while you have a spare life (3 lives each); with none left you watch
// your partner's view. One player at the exit ends the level for both; both out = the run ends. Tally score each
// (your kills/items/secrets share + 100 exit + par bonus); highest wins.
const {fullBleed}=require("src/engines/fullBleed.js");
const {netField}=require("src/engines/netField.js");
const DELAY=4; // online: ticcmds run this many tics (~0.11 s) after they are made
const {store}=require("src/state.js");
const {soloProgress,soloFinish}=require("src/solo.js");
const audio=require("src/audio.js");
const W=require("src/engines/doom/wad.js"),I=require("src/engines/doom/info.js"),{Gfx}=require("src/engines/doom/gfx.js");
const {Renderer}=require("src/engines/doom/render.js"),{Game,WP}=require("src/engines/doom/game.js");
const {Video,Melt}=require("src/engines/doom/video.js"),{Hud}=require("src/engines/doom/hud.js"),{Automap}=require("src/engines/doom/automap.js");
const {Menu,Intermission,Finale}=require("src/engines/doom/screens.js"),{DoomSound}=require("src/engines/doom/sound.js"),{DoomMusic}=require("src/engines/doom/music.js");
const {Heads}=require("src/engines/doom/heads.js");
const TIC=1/35,BAM=4294967296,MT=I.MT,MF=I.MF;
const D2MUS='runnin stalks countd betwee doom the_da shawn ddtblu in_cit dead stlks2 theda2 doom2 ddtbl2 runni2 dead2 stlks3 romero shawn2 messag count2 ddtbl3 ampie theda3 adrian messg2 romer2 tense shawn3 openin evil ultima'.split(' ');
const E4MUS=['E3M4','E3M2','E3M3','E1M5','E2M7','E2M4','E2M6','E2M5','E1M9'];
const OPTKEY='shambconkins-doom-options';
function loadOptions(){let o={};try{o=JSON.parse(localStorage.getItem(OPTKEY)||'{}')||{};}catch{}return {messages:o.messages!==false,detail:o.detail===1?1:0,screenblocks:o.screenblocks===11?11:10,sens:Number.isFinite(o.sens)?o.sens:5,sfx:Number.isFinite(o.sfx)?o.sfx:10,music:Number.isFinite(o.music)?o.music:8,alwaysRun:o.alwaysRun!==false};}

async function doom(s){
 const kind=s.game.doomGame==='doom2'?'doom2':'doom1';
 const [c,x]=s.canvas(960,600,{fill:true});s.body.classList.add('drag-arena-body');const FB=fullBleed(s,{bg:'#000'});
 c.style.imageRendering='pixelated';
 const shell=s.body.closest('.game-shell'),fsBtn=shell?.querySelector('.fb-fs');if(fsBtn){fsBtn.style.top='max(6px,env(safe-area-inset-top))';fsBtn.style.bottom='auto';fsBtn.style.left='auto';fsBtn.style.right='150px';fsBtn.style.transform='none';}
 s.hint('Left thumb: move. Right side: drag to turn. FIRE and USE buttons (drag on FIRE to turn too). Tap the arms numbers to switch weapon. MAP shows the automap; ☰ is the Doom menu.');
 const loadingText=t=>{x.fillStyle='#000';x.fillRect(0,0,s.W,s.H);x.fillStyle='#b00';x.font='bold 22px monospace';x.textAlign='center';x.fillText(t,s.W/2,s.H/2);};
 loadingText('LOADING…');
 let wad;try{wad=await W.loadWad(kind);}catch(e){loadingText('No Doom data in this build.');await s.wait(2500);s.finish([0,0],'Doom could not load.');return;}
 if(!s.alive)return;
 // online: one channel for the whole game; both phones must run the same WAD (else both fall back to Freedoom)
 let nf=null,app=null;const early=[];
 if(s.online){let theirs=null,got=null;const mine=wadId(wad);
  nf=netField(s,{pack:()=>({}),unpack:()=>{},onEvent:e=>{if(e&&typeof e==='object'&&e.wad!==undefined){theirs=e.wad;got?.();}else if(app)app.onNet(e);else early.push(e);}});
  loadingText('WAITING FOR '+(s.players[1-s.online.me]?.name||'YOUR PARTNER').toUpperCase()+'…');nf.event({wad:mine});
  if(theirs===null)await new Promise(r=>{got=r;s.cleanup(r);});if(!s.alive)return;
  if(theirs!==mine){try{wad=await W.loadWad(kind,{freedoom:true});}catch{}}if(!s.alive)return;}
 app=new DoomApp(s,wad,kind,c,x,FB,nf);s.debug=app.debugApi();for(const e of early.splice(0))app.onNet(e);
 app.start();
}

// the same data on both phones: name, game mode and the whole lump directory
function wadId(w){let h=w.dir.length;for(const l of w.dir)h=(Math.imul(h,31)+l.size+l.name.charCodeAt(0))|0;return `${w.label}|${w.mode}|${h>>>0}`;}

class DoomApp{
 constructor(s,wad,kind,c,x,fb,nf=null){
  this.s=s;this.wad=wad;this.kind=kind;this.c=c;this.x=x;this.fb=fb;this.options=loadOptions();
  this.nf=nf;this.net=nf?s.online:null;this.me=this.net?this.net.me:0;this.mate=1-this.me;this.mateName=s.players[this.mate]?.name||'your partner';
  this.gfx=new Gfx(wad);const deh=wad.lump('DEHACKED');this.tables=I.applyDehacked(deh?I.dehText(new TextDecoder('latin1').decode(deh)):'');
  this.game=new Game(wad,this.gfx,this.tables);this.game.seed(Math.floor((s.random?.()??Math.random())*2**31));
  this.r=new Renderer(this.gfx);this.video=new Video(this.gfx,this.r);this.hud=new Hud(this.video,this.game);this.automap=new Automap(this.video);
  this.menu=new Menu(this);this.snd=new DoomSound(wad);this.mus=new DoomMusic(wad);this.heads=new Heads(this.gfx);this.applyVolume();
  this.r.headHook=(r,v,ct,cb)=>{try{this.heads.draw(r,v,ct,cb);}catch{}};
  this.twoPlayer=!s.solo&&!this.net;this.game.coop=!!this.net;this.turn=0;this.scores=[0,0];this.turnStats=[null,null];this.soloTotal=0;this.soloCleared=0;
  this.state='title';this.titleTics=0;this.titlePage=0;this.acc=0;this.wipe=null;this.pendingTurn=0;this.keys=new Set();this.pointers=new Map();this.tapQueue=[];
  this.headPool=this.buildHeadPool();this.recruitPool=s.players.map((p,i)=>{try{return require("src/rewards.js").gameRecruitPool(s.game,store.profile,p).map(ch=>ch.id);}catch{return [];}});
  s.gameRecruits=[[],[]];}
 // ---- setup ----
 buildHeadPool(){let ids=[];try{const {CHARACTERS}=require("src/characters.js"),{portraitURL}=require("src/assets.js");
  ids=CHARACTERS.filter(ch=>{const u=portraitURL(ch.id,'normal');return u&&!/^data:image\/svg/.test(u);}).map(ch=>ch.id);if(ids.length<20)ids=CHARACTERS.map(ch=>ch.id);}catch{}return ids;}
 start(){
  const s=this.s;audio.stopMusic();s.cleanup(()=>{this.mus.stop();this.snd.stopAll();if(store.profile?.settings.music)try{audio.startMusic();}catch{}});
  this.installInput();this.resize();this.music(this.game.commercial?'D_DM2TTL':'D_INTRO',false);
  s.setScores([0,0]);
  s.frame((dt)=>this.frame(dt));}
 saveOptions(){try{localStorage.setItem(OPTKEY,JSON.stringify(this.options));}catch{}}
 applyVolume(){this.snd.setVolume(this.options.sfx/15);this.mus.setVolume(this.options.music/15);}
 sound(name){if(store.profile?.settings.sound===false)return;this.snd.start(null,name);}
 music(name,loop=true){if(store.profile?.settings.music===false){this.mus.stop();return;}this.mus.play(name,loop);}
 levelMusic(){const g=this.game;if(g.commercial){this.music('D_'+D2MUS[(g.gamemap-1)%32].toUpperCase());return;}
  let n=`E${g.gameepisode}M${g.gamemap}`;if(g.gameepisode===4&&!this.wad.has('D_'+n))n=E4MUS[g.gamemap-1];this.music('D_'+n);}
 // layout: the game picture keeps Doom's 4:3-at-320x200 pixel shape; wide screens see more to the sides
 resize(){
  const cw=Math.max(1,this.s.W),ch=Math.max(1,this.s.H),H=this.options.detail?400:200;
  const portrait=ch>cw*1.05;let vw=cw,vh=ch;if(portrait){vh=Math.round(cw*3/4);}
  let Wb=Math.round(vw*H*1.2/vh);Wb=Math.max(320*H/200,Math.min(Wb,H*4));Wb-=Wb%2;
  const bar=this.options.screenblocks<11,viewH=bar?H-32*H/200:H;
  this.r.setSize(Wb,H,viewH);this.view={x:0,y:0,w:vw,h:vh,portrait,cw,ch};this.img=new ImageData(Wb,H);
  this.off=this.off||document.createElement('canvas');this.off.width=Wb;this.off.height=H;this.ox=this.off.getContext('2d');this.lastSize=cw+'x'+ch+':'+H+':'+this.options.screenblocks;}
 inLevel(){return this.state==='level';}
 canCloseMenu(){return this.state==='level'||this.state==='inter'||this.state==='finale';}
 menuClosed(){this.releaseAll();}
 // ---- flow ----
 startWipe(){this.wipe=new Melt(this.r.screen,this.r.W,this.r.H,()=>this.game.M_Random());}
 async newGame(skill,ep,map){
  const s=this.s;this.skill=skill;this.ep=ep;this.map=map;
  // online: player 1's pick goes to the other phone, then both start the level together
  if(this.net){if(this.state==='level'||this.netDone)return;if(this.me===0)this.nf.event({go:[skill,ep,map]});this.menu.close();this.beginLevel();return;}
  if(this.twoPlayer){this.turn=0;this.scores=[0,0];this.turnStats=[null,null];
   const name=this.game.levelName(ep,map);
   if(!await s.pass(0,`${s.players[0].name} goes first on ${name}. One life each: kills, items, secrets, reaching the exit and beating par all score. ${s.players[1].name} plays the same level next.`,'Ready — start my turn'))return;}
  this.beginLevel();}
 beginLevel(){const g=this.game;this.startWipe();
  if(this.twoPlayer||this.net)g.seed(1000+this.ep*100+this.map);
  if(this.net)g.gametic=0;
  g.initNew(this.skill,this.ep,this.map);
  // online: two spare lives each; the first DELAY tics run with empty ticcmds on both phones
  if(this.net){for(const p of g.players)p.lives=2;const z=()=>({forwardmove:0,sidemove:0,angleturn:0,buttons:0});
   this.ls={simTic:0,cmdTic:DELAY,lead:DELAY,stallWin:0,calm:0,cmds:[new Map(),new Map()],mine:new Map(),theirs:new Map(),desync:0,stalls:0,outTics:0};for(let t=0;t<DELAY;t++){this.ls.cmds[0].set(t,z());this.ls.cmds[1].set(t,z());}
   for(const [t,c] of this.pendingCmds||[])this.ls.cmds[this.mate].set(t,c);this.pendingCmds=null;}
  this.afterLoad();}
 afterLoad(){const g=this.game;this.state='level';this.hud.reset();this.automap.on=false;this.pendingTurn=0;this.r.skytex=this.gfx.texture(g.sky);this.levelMusic();this.assignHeads();this.snd.bossmap=!g.commercial&&g.gamemap===8;}
 // random roster heads on every monster (same per map for both players), plus one WANTED monster per map that
 // wears a character the current player has not unlocked: kill it to recruit them
 assignHeads(){const g=this.game,pool=this.headPool;if(!pool.length)return;let i=0;const mobjs=[...g.mobjs()].filter(m=>m.flags&MF.COUNTKILL||m.type===MT.SKULL);
  const seedOf=k=>{let h=2166136261^(g.gameepisode*977+g.gamemap*131+k);h=Math.imul(h^(h>>>15),2246822507);h=Math.imul(h^(h>>>13),3266489909);return (h^(h>>>16))>>>0;};
  for(const m of mobjs)m.head=pool[seedOf(i++)%pool.length];
  const me=this.twoPlayer?this.turn:this.me,locked=(this.recruitPool[me]||[]).filter(id=>!this.s.gameRecruits[0].includes(id)&&!this.s.gameRecruits[1].includes(id));
  if(locked.length&&mobjs.length){const boss=mobjs.reduce((a,b)=>b.info.spawnhealth>a.info.spawnhealth?b:a);boss.head=locked[seedOf(999)%locked.length];boss.wanted=true;
   let name='someone new';try{name=require("src/characters.js").character(boss.head)?.name||name;}catch{}g.players[this.me].message=`wanted: ${name}. kill them to recruit them.`.toLowerCase();}
  this.heads.preload(new Set([...mobjs.map(m=>m.head).filter(Boolean),...this.s.players.map(p=>p.character).filter(Boolean)]));
  g.onSpawnHead=m=>{if(!m.head&&(m.flags&MF.COUNTKILL||m.type===MT.SKULL))m.head=pool[(seedOf(i++))%pool.length];};}
 endGame(){this.mus.stop();this.state='title';this.titleTics=0;this.music(this.game.commercial?'D_DM2TTL':'D_INTRO',false);}
 quit(){this.leave();}
 leave(){const s=this.s;if(this.net){if(this.netDone&&this.netScores)this.netFinish();else{this.netDone=true;s.finish(this.netScores||[0,0],'DOOM co-op: left before the end of the level.');}return;}
  if(this.twoPlayer){if(this.state==='level'&&this.turnStats[this.turn]===null){this.endTurn(false,true);return;}
   s.finish(this.scores,`DOOM: ${s.players[0].name} ${this.scores[0]}, ${s.players[1].name} ${this.scores[1]}.`);return;}
  soloFinish(s,this.soloTotal,this.soloCleared,`DOOM: ${this.soloCleared} level${this.soloCleared===1?'':'s'} cleared, ${this.soloTotal} points.`);}
 // Doom tally score: kills% + items% + secrets% + 100 for reaching the exit + up to 100 for beating par
 tallyScore(st,exited){const pc=(n,d)=>d?Math.floor(n*100/d):100;let sc=pc(st.kills,st.totalkills)+pc(st.items,st.totalitems)+pc(st.secrets,st.totalsecret);
  if(exited){sc+=100;const par=st.par||120;sc+=Math.round(100*Math.max(0,Math.min(1,(2*par-st.time)/par)));}return sc;}
 levelDone(){const g=this.game,st=g.levelStats();this.stats=st;const score=this.tallyScore(st,true);
  if(this.twoPlayer){this.turnStats[this.turn]={...st,score,exited:true};this.scores[this.turn]=score;this.s.setScores(this.scores);}
  else{this.soloTotal+=score;this.soloCleared++;soloProgress(this.s,this.soloTotal,this.soloCleared,`DOOM: ${this.soloCleared} levels cleared.`);this.s.setScores([this.soloTotal,0]);}
  // the end of a Doom episode goes straight to the text screen (no tally), as in the original
  if(!this.twoPlayer&&!g.commercial&&st.map===8){this.startWipe();this.state='finale';this.finale=new Finale(this,st);return;}
  this.startWipe();this.state='inter';this.inter=new Intermission(this,st);this.inter.noNextLoc=this.twoPlayer;this.music(g.commercial?'D_DM2INT':'D_INTER');}
 async endTurn(exited,gaveUp){// 2P: the turn ends at the exit or on death
  const g=this.game,st=g.levelStats();const score=this.tallyScore(st,exited);this.turnStats[this.turn]={...st,score,exited};this.scores[this.turn]=score;this.s.setScores(this.scores);
  if(!exited){this.startWipe();this.state='inter';this.inter=new Intermission(this,st);this.inter.dead=true;this.music(g.commercial?'D_DM2INT':'D_INTER');}
  if(gaveUp)this.afterInter();}
 async afterInter(){
  const s=this.s,g=this.game,st=this.stats||g.levelStats();
  if(this.net){this.netFinish();return;}
  if(this.twoPlayer){
   if(this.turn===0){this.turn=1;this.mus.stop();const a=this.turnStats[0];
    if(!await s.pass(1,`${s.players[0].name} scored ${a.score} (${a.exited?'reached the exit':'died'}). Same level, same skill: beat it.`,'Ready — start my turn',{summary:`${s.players[0].name}: ${a.score}.`}))return;
    this.beginLevel();return;}
   this.mus.stop();s.finish(this.scores,`DOOM ${g.levelName(this.ep,this.map)}: ${s.players[0].name} ${this.scores[0]}, ${s.players[1].name} ${this.scores[1]}.`);return;}
  if(st.finale){this.startWipe();this.state='finale';this.finale=new Finale(this,st);return;}
  this.startWipe();g.nextLevel(st);this.afterLoad();}
 afterFinale(){const st=this.stats,g=this.game;
  if(st.endOfGame||!g.commercial){this.leave();return;}
  this.startWipe();g.nextLevel(st);this.afterLoad();}
 // ---- saves (IndexedDB) ----
 saveSlots(){return this.slots||(this.loadSlotNames(),[]);}
 loadSlotNames(){this.slots=[];const req=window.indexedDB?.open('shambconkins-doom-saves',1);if(!req)return;req.onupgradeneeded=()=>req.result.createObjectStore('saves');
  req.onsuccess=()=>{try{const tx=req.result.transaction('saves','readonly'),st=tx.objectStore('saves');for(let i=0;i<6;i++){const g=st.get(this.kind+':'+i);g.onsuccess=()=>{if(g.result)this.slots[i]=g.result.label;};}}catch{}};}
 saveGame(i){if(this.net){this.menu.message('you can\'t save an online game.\n\ntap to continue.');return;}const data=require("src/engines/doom/savegame.js").serialize(this.game,{skill:this.skill,soloTotal:this.soloTotal,soloCleared:this.soloCleared});
  const label=`${this.game.levelName().toUpperCase().slice(0,20)}`;const req=indexedDB.open('shambconkins-doom-saves',1);req.onupgradeneeded=()=>req.result.createObjectStore('saves');
  req.onsuccess=()=>{try{const tx=req.result.transaction('saves','readwrite');tx.objectStore('saves').put({label,data},this.kind+':'+i);tx.oncomplete=()=>{this.slots[i]=label;this.game.players[0].message='game saved.';};}catch{}};}
 loadGame(i){if(this.net){this.menu.message('you can\'t load during an online game.\n\ntap to continue.');return;}const req=indexedDB.open('shambconkins-doom-saves',1);req.onupgradeneeded=()=>req.result.createObjectStore('saves');
  req.onsuccess=()=>{try{const tx=req.result.transaction('saves','readonly'),g=tx.objectStore('saves').get(this.kind+':'+i);g.onsuccess=()=>{if(!g.result)return;this.startWipe();
   const meta=require("src/engines/doom/savegame.js").deserialize(this.game,g.result.data);this.skill=meta.skill;this.ep=this.game.gameepisode;this.map=this.game.gamemap;if(!this.twoPlayer){this.soloTotal=meta.soloTotal||0;this.soloCleared=meta.soloCleared||0;}this.afterLoad();};}catch{}};}
 pickWad(){const inp=document.createElement('input');inp.type='file';inp.accept='.wad,.WAD';inp.style.display='none';document.body.appendChild(inp);
  inp.onchange=async()=>{const f=inp.files?.[0];inp.remove();if(!f)return;try{const w=await W.storeWad(f);this.menu.message(`${f.name} saved on this phone.\n\nit is used next time you start ${w.kind==='doom2'?'doom ii':'doom'}.\n\ntap to continue.`);}catch(e){this.menu.message(String(e.message||e).toLowerCase()+'\n\ntap to continue.');}};
  inp.click();}
 // ---- per frame ----
 frame(dt){
  const s=this.s;if(s.W+'x'+s.H+':'+(this.options.detail?400:200)+':'+this.options.screenblocks!==this.lastSize)this.resize();
  this.mus.pump();
  // online in a level: the lockstep runs the tics (a tic waits for both ticcmds); menus never pause it
  if(this.net&&this.state==='level'&&!this.wipe&&this.ls){this.processTaps();if(this.menu.active)this.menu.tick();
   if(this.nf.gone&&!this.netDone){this.netLevelEnd(false);}
   this.acc+=dt;let n=0,stalled=false;while(this.acc>=TIC&&n<4&&this.state==='level'){if(!this.lockstep()){stalled=true;break;}this.acc-=TIC;n++;}this.acc=Math.min(this.acc,TIC*2);if(stalled&&this.ls)this.ls.stallWin+=dt;
   this.draw(Math.min(1,this.acc/TIC));return;}
  this.acc+=dt;let n=0;while(this.acc>=TIC&&n<4){this.acc-=TIC;this.tick();n++;}if(n===4)this.acc=Math.min(this.acc,TIC);
  this.draw(this.acc/TIC);}
 // ---- online co-op (see the top of the file) ----
 onNet(e){if(!e||typeof e!=='object')return;
  if(Array.isArray(e.t)){const [t,fwd,side,turn,buttons,weapon,exit]=e.t;const c={forwardmove:fwd|0,sidemove:side|0,angleturn:turn|0,buttons:buttons|0};if(weapon>=0)c.weapon=weapon|0;if(exit)c.exit=1;
   if(this.ls&&!this.netDone)this.ls.cmds[this.mate].set(t,c);else(this.pendingCmds=this.pendingCmds||[]).push([t,c]);}
  else if(Array.isArray(e.go)){if(this.me!==0&&this.state==='title'){const [sk,ep,map]=e.go;this.newGame(sk|0,ep|0,map|0);}}
  else if((e.ld===1||e.ld===-1)&&this.ls)this.ls.lead=Math.max(DELAY,Math.min(12,this.ls.lead+e.ld));
  else if(Array.isArray(e.h)&&this.ls){const [t,h]=e.h;const m=this.ls.mine.get(t);if(m===undefined)this.ls.theirs.set(t,h);else if(m!==h)this.netDesync(t);}}
 netDesync(t){if(!this.ls.desync++)console.warn('DOOM online: the two phones disagree at tic',t);}
 // a cheap fingerprint of the game state (positions, health, the random index)
 simHash(){const g=this.game;let h=(g.prndindex*31+g.leveltime)|0;for(const m of g.mobjs())h=(Math.imul(h,31)+((m.x*16)|0)+Math.imul((m.y*16)|0,7)+m.health*13+m.type)|0;return h;}
 lockstep(){const g=this.game,L=this.ls,me=this.me;
  while(L.cmdTic<L.simTic+L.lead){const pl=g.players[me];this.buildCmd(pl);const c=pl.cmd;if(this.botExit){c.exit=1;this.botExit=false;}L.cmds[me].set(L.cmdTic,c);
   this.nf.event({t:[L.cmdTic,c.forwardmove,c.sidemove,c.angleturn,c.buttons,c.weapon??-1,c.exit?1:0]});L.cmdTic++;}
  const a=L.cmds[0].get(L.simTic),b=L.cmds[1].get(L.simTic);if(!a||!b){L.stalls++;if(!L.stallSince)L.stallSince=performance.now();return false;}L.stallSince=0;
  L.cmds[0].delete(L.simTic);L.cmds[1].delete(L.simTic);g.players[0].cmd=a;g.players[1].cmd=b;
  if(a.exit||b.exit)g.exitLevel();// test bots end the level the same tic on both phones
  const vp=this.viewPlayer();vp.pviewz=vp.viewz;vp.pbob=vp.psprites.map(p=>[p.sx,p.sy]);
  g.tick();L.simTic++;
  for(let i=0;i<2;i++){const mo=g.players[i].mo;if(mo&&!mo.coopHead){mo.coopHead=true;mo.head=this.s.players[i]?.character||null;}}
  this.hud.tick(this.viewPlayer());this.playSounds();this.events();
  if(L.simTic%35===0){// the partner's lead adapts to the link: this phone stalling > .12 s a second (their ticcmds came late)
   // asks them to send a tic further ahead {ld:1}; three clean seconds ask for one tic less {ld:-1}
   if(L.stallWin>.12){this.nf.event({ld:1});L.calm=0;}else if(L.stallWin===0&&++L.calm>=3){this.nf.event({ld:-1});L.calm=0;}L.stallWin=0;
   const h=this.simHash();L.mine.set(L.simTic,h);this.nf.event({h:[L.simTic,h]});const t=L.theirs.get(L.simTic);if(t!==undefined&&t!==h)this.netDesync(L.simTic);L.mine.delete(L.simTic-35*20);L.theirs.delete(L.simTic-35*20);}
  if(!this.netDone){if(g.exiting)this.netLevelEnd(true);
   else if(g.players.every(p=>p.playerstate==='dead'&&p.lives<=0)){if(++L.outTics>35*3)this.netLevelEnd(false);}}
  return true;}
 // turning made since the last simulated tic shows at once (the ticcmds carrying it run DELAY tics later)
 predTurn(){const L=this.ls;if(!this.net||!L)return 0;let a=0;for(const [t,c] of L.cmds[this.me])if(t>=L.simTic)a+=c.angleturn*65536;return a;}
 // online overlay: lives, the partner, out-of-lives spectating, a stalled link
 drawNetHud(){const x=this.x,V=this.view,g=this.game,me=g.players[this.me],q=g.players[this.mate];if(!me||!q)return;x.save();x.textAlign='center';x.textBaseline='top';
  const f=Math.round(Math.max(11,Math.min(V.cw,V.ch)*.032));x.font=`bold ${f}px monospace`;x.lineWidth=3;x.strokeStyle='#000';
  const line=(t,y,c)=>{x.strokeText(t,V.cw/2,y);x.fillStyle=c;x.fillText(t,V.cw/2,y);};
  const qs=q.playerstate==='dead'?(q.lives>0?'DOWN':'OUT'):`${Math.max(0,q.health)}%`;
  line(`LIVES ${Math.max(0,me.lives+(me.playerstate==='dead'?0:1))} · ${this.mateName.toUpperCase()} ${qs}`,Math.max(34,V.h*.06),'#e8d0a0');
  if(this.isOut())line(`OUT OF LIVES · WATCHING ${this.mateName.toUpperCase()}`,V.h*.4,'#ff6060');
  else if(me.playerstate==='dead')line('TAP TO COME BACK BESIDE '+this.mateName.toUpperCase(),V.h*.4,'#ffd060');
  if(this.ls?.stallSince&&performance.now()-this.ls.stallSince>300)line('WAITING FOR '+this.mateName.toUpperCase()+'…',V.h*.5,'#bbb');
  x.restore();}
 // the player this phone looks through: its own, or the partner's once out of lives
 viewIndex(){if(!this.net)return 0;const g=this.game,p=g.players[this.me],q=g.players[this.mate];return p?.playerstate==='dead'&&p.lives<=0&&q?.mo&&q.playerstate!=='dead'?this.mate:this.me;}
 viewPlayer(){return this.game.players[this.viewIndex()];}
 isOut(i=this.me){const p=this.game.players[i];return !!p&&p.playerstate==='dead'&&p.lives<=0;}
 // the level is over (exit reached, both out, or the partner left): both phones score it the same way from the game
 netLevelEnd(exited){if(this.netDone)return;this.netDone=true;const g=this.game;this.netScores=[0,1].map(i=>this.tallyScore(g.levelStats(i),exited));this.s.setScores(this.netScores);
  const st=g.levelStats(this.me);this.stats=st;this.startWipe();this.state='inter';this.inter=new Intermission(this,st);this.inter.noNextLoc=true;if(!exited)this.inter.dead=true;this.interTics=0;
  this.music(g.commercial?'D_DM2INT':'D_INTER');}
 netFinish(){if(this.finished)return;this.finished=true;this.mus.stop();const s=this.s,g=this.game,sc=this.netScores||[0,0];
  s.finish(sc,`DOOM co-op, ${g.levelName(this.ep,this.map)}: ${s.players[0].name} ${sc[0]}, ${s.players[1].name} ${sc[1]}.`);}
 tick(){
  const g=this.game;this.processTaps();
  if(this.wipe){if(this.wipe.tick())this.wipe=null;return;}
  if(this.menu.active){this.menu.tick();if(this.state!=='title')return;}
  switch(this.state){
   case 'title':this.titleTics++;if(this.titleTics>(this.titlePage?200:g.commercial?35*11:170)){this.titlePage^=1;this.titleTics=0;}break;
   case 'level':{const pl=g.players[0];this.buildCmd(pl);pl.pviewz=pl.viewz;pl.pbob=pl.psprites.map(p=>[p.sx,p.sy]);g.tick();this.hud.tick(g.players[0]);this.playSounds();this.events();
    if(g.exiting){if(this.twoPlayer&&this.turnStats[this.turn]===null){this.levelDone();}else if(!this.twoPlayer)this.levelDone();}
    else if(g.players[0].playerstate==='reborn'){if(this.twoPlayer){if(this.turnStats[this.turn]===null)this.endTurn(false);}else{this.startWipe();g.rebornLevel();this.afterLoad();}}
    else if(this.twoPlayer&&g.players[0].playerstate==='dead'&&!this.deadTics)this.deadTics=1;
    if(this.deadTics&&++this.deadTics>35*3&&this.twoPlayer&&this.turnStats[this.turn]===null){this.deadTics=0;this.endTurn(false);}
    if(g.players[0].playerstate!=='dead')this.deadTics=0;
    break;}
   case 'inter':this.inter.tick();this.playSounds();if(this.net&&++this.interTics%(35*3)===0)this.inter.press();if(this.inter.done)this.afterInter();break;
   case 'finale':this.finale.tick();if(this.finale.done)this.afterFinale();break;}}
 playSounds(){const g=this.game,pl=g.players[this.net?this.viewIndex():0];this.snd.listener=pl.mo;
  for(const e of g.sounds){if(e.stop){this.snd.stopOrigin(e.origin);continue;}if(store.profile?.settings.sound===false)continue;this.snd.start(e.origin,e.name);}
  g.sounds.length=0;this.snd.update();}
 events(){const g=this.game,s=this.s;
  for(const e of g.events){
   if(e.kind==='spawn'&&!e.map)g.onSpawnHead?.(e.mo);
   if(e.kind==='raise'&&e.mo&&!e.mo.head)g.onSpawnHead?.(e.mo);
   // online each phone has its own WANTED monster; only this phone's player recruits it
   if(e.kind==='kill'&&e.mo.wanted&&(!this.net||e.by===g.players[this.me])){const me=this.twoPlayer?this.turn:this.me;if(!s.gameRecruits[me].includes(e.mo.head))s.gameRecruits[me].push(e.mo.head);e.mo.wanted=false;
    let name='them';try{name=require("src/characters.js").character(e.mo.head)?.name||name;}catch{}g.players[this.me].message=`wanted: ${name} recruited!`.toLowerCase();s.react?.(me,'win');}
   if(e.kind==='playerdeath'){const pi=this.twoPlayer?this.turn:this.net?g.players.indexOf(e.player):0;if(pi>=0)s.react?.(pi,'sad');}}
  g.events.length=0;}
 // ---- input → ticcmd ----
 buildCmd(pl){
  const k=this.keys,run=this.options.alwaysRun!==k.has('Shift'),fwdK=(k.has('KeyW')||k.has('ArrowUp')?1:0)-(k.has('KeyS')||k.has('ArrowDown')?1:0),sideK=(k.has('KeyD')?1:0)-(k.has('KeyA')?1:0),turnK=(k.has('ArrowLeft')||k.has('KeyQ')?1:0)-(k.has('ArrowRight')||k.has('KeyE')?1:0);
  let fwd=fwdK*(run?50:25),side=sideK*(run?40:24);
  const st=this.stick;if(st){fwd+=-st.dy*50;side+=st.dx*40;}
  fwd=Math.max(-50,Math.min(50,Math.round(fwd)));side=Math.max(-40,Math.min(40,Math.round(side)));
  if(turnK){this.keyTurn=(this.keyTurn||0)+1;this.pendingTurn+=turnK*(this.keyTurn<6?320:run?1280:640)*65536;}else this.keyTurn=0;
  let turn=Math.trunc(this.pendingTurn/65536);this.pendingTurn-=turn*65536;
  const fire=k.has('ControlLeft')||k.has('ControlRight')||k.has('Space')||k.has('KeyJ')||!!this.fireHeld||this.fireTap>0,use=k.has('Enter')||k.has('KeyF')||!!this.useTap;
  let buttons=(fire?1:0)|(use?2:0);this.useTap=Math.max(0,(this.useTap||0)-1);this.fireTap=Math.max(0,(this.fireTap||0)-1);
  const cmd={forwardmove:fwd,sidemove:side,angleturn:turn,buttons};
  if(this.weaponReq!==undefined){cmd.buttons|=4;cmd.weapon=this.weaponReq;this.weaponReq=undefined;}
  if(this.botOn)this.botCmd(pl,cmd);
  pl.cmd=cmd;}
 // online test bot: runs forward firing, turns away when stuck, presses USE now and then (doors, coming back)
 botCmd(pl,cmd){const mo=pl.mo,b=this.botS||(this.botS={t:0,x:0,y:0,stuck:0,dir:1});b.t++;cmd.forwardmove=50;cmd.buttons|=1;if(b.t%20===0)cmd.buttons|=2;
  if(mo){if(Math.hypot(mo.x-b.x,mo.y-b.y)<1)b.stuck++;else b.stuck=0;b.x=mo.x;b.y=mo.y;}
  if(b.stuck>8){cmd.angleturn=b.dir*1280;if(b.stuck>40){b.dir=-b.dir;b.stuck=0;}}else if(b.t%90<12)cmd.angleturn=b.dir*640;}
 nextWeapon(dir){const pl=this.game.players[this.me];if(!pl?.mo)return;const order=[WP.fist,WP.chainsaw,WP.pistol,WP.shotgun,WP.supershotgun,WP.chaingun,WP.missile,WP.plasma,WP.bfg];
  const cur=pl.pendingweapon!==WP.nochange?pl.pendingweapon:pl.readyweapon;let i=order.indexOf(cur);
  for(let n=0;n<order.length;n++){i=(i+dir+order.length)%order.length;const w=order[i];if(!pl.weaponowned[w])continue;const am=I.WEAPONS[w].ammo;if(am>=0&&pl.ammo[am]<(w===WP.bfg?40:w===WP.supershotgun?2:1))continue;if(w===WP.plasma||w===WP.bfg){if(this.game.gamemode==='shareware')continue;}this.weaponReq=w;return;}}
 releaseAll(){this.stick=null;this.fireHeld=false;this.pointers.clear();}
 // screen px -> Doom virtual (320x200 space, centred)
 toVirtual(px,py){const V=this.view;return [(px/V.w*this.r.W-this.video.ox)/this.video.s,(py/V.h*this.r.H)/this.video.s];}
 buttons(){const v=this.view,R=Math.max(26,Math.min(v.cw,v.ch)*.1),inPortrait=v.portrait;
  const bottom=inPortrait?v.ch-R*1.3:v.h*(this.options.screenblocks<11?168/200:1)-R*1.25;
  const fire={x:v.cw-R*1.35,y:bottom,r:R,id:'fire',label:'FIRE'};
  const use={x:fire.x-R*2.25,y:bottom+R*.25,r:R*.72,id:'use',label:'USE'};
  const wpn={x:fire.x,y:fire.y-R*2.05,r:R*.6,id:'wpn',label:'WPN'};
  const map={x:R*.75+6,y:R*.75+Math.max(26,v.h*.09)+(this.net?30:0),r:R*.55,id:'map',label:'MAP'};const menu={x:map.x+R*1.35,y:map.y,r:R*.55,id:'menu',label:'☰'};
  return [fire,use,wpn,map,menu];}
 installInput(){
  const s=this.s,c=this.c;
  const pos=e=>{const b=c.getBoundingClientRect();return [(e.clientX-b.left)*(this.view.cw/b.width),(e.clientY-b.top)*(this.view.ch/b.height)];};
  s.on(c,'pointerdown',e=>{if(s.paused)return;e.preventDefault();try{c.setPointerCapture(e.pointerId);}catch{}const [px,py]=pos(e);
   const p={id:e.pointerId,x0:px,y0:py,x:px,y:py,t0:performance.now(),role:null};this.pointers.set(e.pointerId,p);
   if(this.state!=='level'||this.menu.active){p.role='tap';return;}
   if(this.game.players[this.me]?.playerstate==='dead'){this.useTap=2;p.role='bar';return;}
   const hit=this.buttons().find(b=>Math.hypot(px-b.x,py-b.y)<=b.r*1.15);
   if(hit){p.role=hit.id;if(hit.id==='fire'){this.fireHeld=true;p.turn=true;}else if(hit.id==='use')this.useTap=2;else if(hit.id==='wpn')this.nextWeapon(1);else if(hit.id==='map')this.automap.toggle();else if(hit.id==='menu'){this.menu.open('main');this.releaseAll();}return;}
   // status bar arms numbers
   const bar=this.options.screenblocks<11,v=this.view;if(bar&&py<=v.h&&py>=v.h*168/200){const [vx,vy]=this.toVirtual(px,py);if(vx>=104&&vx<=142){const col=Math.max(0,Math.min(2,Math.floor((vx-108)/12))),row=vy>181?1:0,slot=row*3+col+2;this.selectSlot(slot);p.role='bar';return;}if(vx>=143&&vx<=177){this.useTap=2;p.role='bar';return;}}
   if(this.automap.on){p.role='mappan';return;}
   if(px<v.cw*.45&&!this.stick){p.role='stick';this.stick={dx:0,dy:0,ox:px,oy:py,id:e.pointerId};return;}
   p.role='turn';});
  s.on(c,'pointermove',e=>{const p=this.pointers.get(e.pointerId);if(!p)return;const [px,py]=pos(e);const dx=px-p.x,dy=py-p.y;p.x=px;p.y=py;
   if(p.role==='stick'&&this.stick){const R=Math.max(40,Math.min(this.view.cw,this.view.ch)*.12);let sx=(px-this.stick.ox)/R,sy=(py-this.stick.oy)/R;const m=Math.hypot(sx,sy);if(m>1){sx/=m;sy/=m;}
    // dead zone, then full speed quickly (thumb sticks on the Android port feel snappy)
    const dz=v=>Math.abs(v)<.12?0:Math.sign(v)*Math.min(1,(Math.abs(v)-.12)/.6);this.stick.dx=dz(sx);this.stick.dy=dz(sy);}
   else if(p.role==='turn'||(p.role==='fire'&&p.turn)){const k=(.55+this.options.sens*.17)*Math.PI/this.view.cw;this.pendingTurn-=dx*k/(Math.PI*2)*BAM;}
   else if(p.role==='mappan')this.automap.pan(dx/this.view.w*this.r.W,dy/this.view.h*this.r.H);});
  const up=e=>{const p=this.pointers.get(e.pointerId);if(!p)return;this.pointers.delete(e.pointerId);
   if(p.role==='stick')this.stick=null;if(p.role==='fire')this.fireHeld=false;
   if(p.role==='tap'&&Math.hypot(p.x-p.x0,p.y-p.y0)<30)this.tapQueue.push([p.x0,p.y0]);
   if(p.role==='mappan'&&Math.hypot(p.x-p.x0,p.y-p.y0)<12)this.automap.zoom(p.x0>this.view.cw/2?1.4:1/1.4);};
  s.on(c,'pointerup',up);s.on(c,'pointercancel',up);s.on(c,'lostpointercapture',up);
  s.on(window,'keydown',e=>{if(s.paused)return;const k=e.code;
   if(this.menu.active||this.state!=='level'){const map={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'enter',Space:'enter',Escape:'back',Backspace:'back',KeyY:'y',KeyN:'n'};
    if(this.state==='title'&&!this.menu.active){this.menu.open('main');e.preventDefault();return;}
    if(this.menu.active&&map[k]){this.menu.key(map[k]);e.preventDefault();return;}
    if(!this.menu.active&&(k==='Escape')){this.menu.open('main');e.preventDefault();return;}
    if(this.state==='inter'&&(k==='Enter'||k==='Space'))this.inter.press();if(this.state==='finale'&&(k==='Enter'||k==='Space'))this.finale.press();return;}
   if(k==='Escape'){this.menu.open('main');this.releaseAll();e.preventDefault();return;}
   if(k==='Tab'){this.automap.toggle();e.preventDefault();return;}
   if(/^Digit[1-7]$/.test(k)){this.selectSlot(+k.slice(5));return;}
   if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(k))e.preventDefault();
   if(k==='Enter'||k==='KeyF')this.useTap=2;if(['ControlLeft','ControlRight','Space','KeyJ'].includes(k))this.fireTap=2;
   this.keys.add(k);if(k==='ShiftLeft'||k==='ShiftRight')this.keys.add('Shift');});
  s.on(window,'keyup',e=>{this.keys.delete(e.code);if(e.code==='ShiftLeft'||e.code==='ShiftRight')this.keys.delete('Shift');});
  s.on(window,'blur',()=>{this.keys.clear();this.releaseAll();});}
 selectSlot(slot){const pl=this.game.players[this.me];if(!pl?.mo)return;let w=[0,WP.fist,WP.pistol,WP.shotgun,WP.chaingun,WP.missile,WP.plasma,WP.bfg][slot];
  if(slot===1&&pl.weaponowned[WP.chainsaw]&&(pl.readyweapon!==WP.chainsaw))w=WP.chainsaw;
  if(slot===3&&pl.weaponowned[WP.supershotgun]&&this.game.commercial&&(pl.readyweapon===WP.shotgun||!pl.weaponowned[WP.shotgun]))w=WP.supershotgun;
  this.weaponReq=w;}
 processTaps(){const q=this.tapQueue;this.tapQueue=[];for(const [px,py] of q){const [vx,vy]=this.toVirtual(px,py);
  if(this.menu.active){this.menu.tap(vx,vy);continue;}
  if(this.state==='title'){this.menu.open('main');continue;}
  if(this.state==='inter')this.inter.press();else if(this.state==='finale')this.finale.press();}}
 // ---- drawing ----
 draw(alpha){
  this.t0=performance.now();const g=this.game,r=this.r,v=this.video;
  let palette=0;
  if(this.state==='title'){v.fill(0);v.patchAt(this.titlePage?'CREDIT':'TITLEPIC',0,0);if(!v.gfx.patch('TITLEPIC'))v.text('DOOM',140,90);
   if(this.net){const t=this.me===0?'TAP: PICK A LEVEL TO PLAY TOGETHER':`WAITING FOR ${this.mateName.toUpperCase()} TO PICK A LEVEL`;v.text(t,160-v.textWidth(t)/2,186);}}
  else if(this.state==='level'){const pl=this.viewPlayer(),own=!this.net||this.viewIndex()===this.me;
   if(this.automap.on)this.automap.draw(g,pl,r.viewH);
   else if(pl.mo){for(const m of g.mobjs()){m.rx=m.px+(m.x-m.px)*alpha;m.ry=m.py+(m.y-m.py)*alpha;m.rz=m.pz+(m.z-m.pz)*alpha;}
    const mo=pl.mo,ang=(mo.angle+(pl.playerstate==='dead'||!own?0:this.pendingTurn+this.predTurn()))/BAM*Math.PI*2,lerp=(a,b)=>a+(b-a)*alpha;
    // moving floors/ceilings and the weapon bob drawn between tics
    const moved=[];for(const sec of g.movedSectors||[]){if(sec.movedTic!==g.gametic-1){g.movedSectors.delete(sec);continue;}moved.push([sec,sec.floorheight,sec.ceilingheight]);sec.floorheight=lerp(sec.pf,sec.floorheight);sec.ceilingheight=lerp(sec.pc,sec.ceilingheight);}
    const ps=pl.psprites.map((p,i)=>{const b=pl.pbob?.[i];return b&&p.state?{...p,sx:lerp(b[0],p.sx),sy:lerp(b[1],p.sy)}:p;});
    const vz=pl.pviewz!==undefined&&Math.abs(pl.viewz-pl.pviewz)<24?lerp(pl.pviewz,pl.viewz):pl.viewz;
    r.render(g.lv,{x:mo.rx,y:mo.ry,z:vz,angle:ang,extralight:pl.extralight,fixedcolormap:pl.fixedcolormap||-1,psprites:pl.playerstate==='dead'?null:ps,invisible:pl.powers[2]>4*32||pl.powers[2]&8,sectorlight:mo.subsector.sector.lightlevel});
    for(const [sec,f,c] of moved){sec.floorheight=f;sec.ceilingheight=c;}}
   if(r.viewH<r.H){this.hud.portrait=!!this.faceCanvas(pl);this.hud.drawBar(pl);}
   if(this.options.messages)this.hud.drawMessage();
   palette=paletteFor(pl);}
  else if(this.state==='inter')this.inter.draw();
  else if(this.state==='finale')this.finale.draw();
  if(this.menu.active)this.menu.draw();
  if(this.wipe)this.wipe.draw(r.screen);
  this.perf=(this.perf||0)*.95+(performance.now()-this.t0)*.05;
  r.blit(this.img,palette);this.ox.putImageData(this.img,0,0);
  const x=this.x,V=this.view;x.imageSmoothingEnabled=false;x.fillStyle='#000';x.fillRect(0,0,V.cw,V.ch);x.drawImage(this.off,0,0,V.w,V.h);
  if(this.state==='level'&&!this.wipe){this.drawFace();if(!this.menu.active)this.drawControls();}
  if(this.net&&this.state==='level'&&!this.wipe)this.drawNetHud();
  if(V.portrait)this.drawPortraitPanel();}
 faceCanvas(pl){const id=this.s.players[this.twoPlayer?this.turn:this.viewIndex()]?.character;if(!id)return null;try{return this.heads.face(id,this.hud.faceindex);}catch{return null;}}
 drawFace(){const pl=this.viewPlayer();if(this.r.viewH>=this.r.H)return;const fc=this.faceCanvas(pl);if(!fc)return;const V=this.view,k=V.h/200,sx=V.w/this.r.W*this.video.s;
  const ox=this.video.ox*(V.w/this.r.W),x=ox+144*sx,y=169*k,w=30*sx,h=30*k;this.x.imageSmoothingEnabled=false;this.x.drawImage(fc,x,y,w,h);}
 drawControls(){const x=this.x;x.save();x.textAlign='center';x.textBaseline='middle';
  for(const b of this.buttons()){const held=(b.id==='fire'&&this.fireHeld);x.globalAlpha=held?.42:.26;x.fillStyle='#000';x.beginPath();x.arc(b.x,b.y,b.r,0,7);x.fill();
   x.globalAlpha=held?.85:.5;x.strokeStyle='#ddd';x.lineWidth=2;x.stroke();x.fillStyle='#eee';x.font=`bold ${Math.round(b.r*(b.id==='menu'?.8:.42))}px sans-serif`;x.fillText(b.label,b.x,b.y+1);}
  let st=this.stick;if(!st&&this.view.portrait){const R=Math.max(40,Math.min(this.view.cw,this.view.ch)*.12);x.globalAlpha=.35;x.strokeStyle='#a33';x.lineWidth=2;x.beginPath();x.arc(R*1.6,this.view.ch-R*1.6,R,0,7);x.stroke();x.fillStyle='#a33';x.font='bold 13px sans-serif';x.fillText('MOVE',R*1.6,this.view.ch-R*1.6);x.globalAlpha=1;}
  if(st){const R=Math.max(40,Math.min(this.view.cw,this.view.ch)*.12);x.globalAlpha=.25;x.fillStyle='#000';x.beginPath();x.arc(st.ox,st.oy,R,0,7);x.fill();x.globalAlpha=.55;x.strokeStyle='#ccc';x.stroke();
   x.globalAlpha=.6;x.fillStyle='#ddd';x.beginPath();x.arc(st.ox+st.dx*R*.8,st.oy+st.dy*R*.8,R*.38,0,7);x.fill();}
  x.restore();}
 drawPortraitPanel(){const x=this.x,V=this.view;x.save();x.fillStyle='#120808';x.fillRect(0,V.h,V.cw,V.ch-V.h);x.fillStyle='#5a1e1e';x.fillRect(0,V.h,V.cw,2);
  x.fillStyle='#a33';x.font='bold 13px monospace';x.textAlign='center';x.fillText(this.state==='level'?'TURN YOUR PHONE SIDEWAYS FOR FULL SCREEN':'TAP THE SCREEN ABOVE',V.cw/2,V.h+22);
  if(this.state==='level'&&!this.menu.active)this.drawControls();x.restore();}
 turnScore(v){if(!this.twoPlayer)return;const t=this.turnStats[this.turn];if(!t)return;const name=(this.s.players[this.turn]?.name||'').toUpperCase(),txt=`${name}: ${t.score} POINTS${t.exited?'':' (DIED)'}`;v.text(txt,160-v.textWidth(txt)/2,186);}
 debugApi(){const app=this;return {get state(){return app.state;},
  // online test: player 1's phone picks E1M1 on skill 2; both phones' bots drive; after BOT_EXIT ms player 1's bot
  // puts an exit request in its ticcmd so both phones end the level on the same tic
  get bot(){if(!app.net)return undefined;return ()=>{if(app.state==='title'&&app.me===0&&!app.botPicked){app.botPicked=true;app.newGame(1,1,1);return 'pick';}
   if(app.state==='level'&&!app.botOn){app.botOn=true;app.botT0=performance.now();return 'drive';}
   if(app.state==='level'&&app.me===0&&!app.botExitSent&&app.botT0&&performance.now()-app.botT0>(app.botExitMs??45000)){app.botExitSent=true;app.botExit=true;return 'exit';}return '';};},
  get net(){return app.ls?{tic:app.ls.simTic,desync:app.ls.desync,stalls:app.ls.stalls,lead:app.ls.lead,lives:app.game.players.map(p=>p.lives),hp:app.game.players.map(p=>p.health)}:null;},get game(){return app.game;},get app(){return app;},
  start(skill=2,ep=1,map=1){app.menu.close();return app.newGame(skill,ep,map);},menu(){return app.menu;},
  tap(vx,vy){app.menu.tap(vx,vy);},cheat(c){app.game.cheat(c);},exit(){app.game.exitLevel();},
  kill(){const pl=app.game.players[0];if(pl.mo)app.game.damageMobj(pl.mo,null,null,10000);},skipInter(){if(app.inter){app.inter.accel=true;}},
  // put a monster (info.js MT key) dist units in front of the player, turned by ang degrees
  spawn(key,dist=160,ang=0,side=0){const g=app.game,mo=g.players[0].mo,a=mo.angle/BAM*Math.PI*2;const m=g.spawnMobj(mo.x+Math.cos(a)*dist-Math.sin(a)*side,mo.y+Math.sin(a)*dist+Math.cos(a)*side,-Infinity,MT[key]);
   m.angle=(mo.angle+0x80000000+Math.round(ang/360*BAM))>>>0;g.onSpawnHead?.(m);if(!m.head)m.head=app.headPool[(m.id*7)%app.headPool.length];return m.id;},
  freeze(){for(const m of app.game.mobjs())if(m!==app.game.players[0].mo){m.tics=-1;m.momx=m.momy=0;}},
  setState(id,stKey){const m=[...app.game.mobjs()].find(m=>m.id===id);if(m)app.game.setMobjState(m,I.STATE[stKey]);},
  get audio(){return {sfx:[...app.snd.buffers.values()].filter(Boolean).length,music:app.mus.playing,bank:!!app.mus.bank};},get perf(){return app.perf;},
  warp(ep,map){app.ep=ep;app.map=map;app.skill=app.skill??2;app.startWipe();app.game.initNew(app.skill,ep,map);app.afterLoad();},
  get finale(){return app.finale&&{stage:app.finale.stage,count:app.finale.count,cast:app.finale.cast?.i};},
  get scores(){return app.scores;},get stats(){return app.turnStats;}};}
}
function paletteFor(pl){let cnt=pl.damagecount;if(pl.powers[1]){const bz=12-(pl.powers[1]>>6);if(bz>cnt)cnt=bz;}
 if(cnt){let p=(cnt+7)>>3;if(p>=8)p=7;return p+1;}if(pl.bonuscount){let p=(pl.bonuscount+7)>>3;if(p>=4)p=3;return p+9;}
 if(pl.powers[3]>4*32||pl.powers[3]&8)return 13;return 0;}
Object.assign(exports,{doom});
