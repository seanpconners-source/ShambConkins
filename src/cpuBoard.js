// 1-player board game: player 2 is a CPU. The run carries run.cpu = {seat:1, level}; the human is always seat 0, so
// minigames reuse the 1P Arcade's vs-CPU versions (cpuKit: player index 1 is the CPU). Board decisions that belong to
// the CPU (dialogs, roads, items, Pokémon battles) are shown read-only while it picks; the human still taps through
// cards that only have Continue, and decides anything the two players do together (start a game, fight a boss).
const {store}=require("src/state.js");
const {openDialog,toast}=require("src/ui.js");
const {openRoutePanel,routePreview,routePanelOpen}=require("src/routePanel.js");
const {setCpuHooks}=require("src/cpuHooks.js");
const {SOLO_LEVELS,SOLO_SKILL}=require("src/solo.js");
const {canUseItem}=require("src/items.js");
const {character}=require("src/characters.js");
const hooks={roll:null,useItem:null};
let intent=null,readyAt=0,coolUntil=0;
const cpuRun=run=>!!run?.cpu;
const seat=run=>run.cpu.seat===0?0:1;
const isCpuPlayer=(run,p)=>cpuRun(run)&&run.players[seat(run)]===p;
const skill=run=>SOLO_SKILL[run?.cpu?.level]??SOLO_SKILL.normal;
const cpuTurn=()=>{const run=store.run;return cpuRun(run)&&!run.finished&&run.current===seat(run);};
const cpuPlayer=()=>store.run.players[seat(store.run)];
const cpuName=id=>`${(character(id)?.name||'').split(' ')[0]||'Rival'} (CPU)`;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
// A human-looking pause: quicker on Hard.
const thinkMs=(base=1000)=>base*(1.25-skill(store.run)*.5)*(.8+Math.random()*.4);

// New Game: the chosen person goes first in seat 0 (keeping their roster and starting item), the CPU takes seat 1.
function makeCpuRun(run,{who=0,level='normal'}={}){
 if(who===1)run.players.reverse();
 const cpu=run.players[1];cpu.name=cpuName(cpu.character);
 run.cpu={seat:1,level:SOLO_LEVELS.includes(level)?level:'normal'};run.current=0;return run;
}

// Choices both players make together, or that start something the human plays.
const HUMAN_VALUES=new Set(['start','fight','again']);
function pickChoice(choices){
 const live=choices.map((c,i)=>[c,i]).filter(([c])=>!c.disabled);if(!live.length)return -1;
 if(intent){const hit=live.find(([c])=>c.value===intent);intent=null;if(hit)return hit[1];}
 const weight=([c])=>c.primary?3:c.danger?.3:/^(no|cancel|leave|skip|keep|stay|flee|main)$/.test(String(c.value))?.7:1;
 let r=Math.random()*live.reduce((s,x)=>s+weight(x),0);for(const x of live){r-=weight(x);if(r<=0)return x[1];}return live.at(-1)[1];
}
function cpuDialog(opts){
 const run=store.run;if(!cpuRun(run)||run.finished||opts.local||store.session||store.view!=='board')return null;
 const owner=Number.isInteger(opts.player)?opts.player:run.current;if(owner!==seat(run))return null;
 const choices=opts.choices||[];if(choices.filter(c=>!c.disabled).length<2||choices.some(c=>HUMAN_VALUES.has(c.value)))return null;
 const name=cpuPlayer().name;
 return new Promise(resolve=>{
  let done=false;const end=v=>{if(!done){done=true;resolve(v);}};
  openDialog({...opts,watch:`${name} is thinking…`}).then(()=>end(null));
  const mine=store.dialog;
  (async()=>{
   await pause(thinkMs(1200));if(done||store.dialog!==mine)return;
   const i=pickChoice(choices);document.querySelector(`#dialog [data-dialog-choice="${i}"]`)?.classList.add('cpu-pick');
   await pause(650);if(done||store.dialog!==mine)return;
   const c=choices[i];done=true;store.dialog=null;document.getElementById('dialog')?.close();mine.resolve(null);
   if(c&&choices.length>2)toast(`${name}: ${c.label}`,{local:true});
   resolve(c?c.value:null);
  })();
 });
}
// Roads: the CPU lights one up on the map, then goes. Shortcuts tempt it more on higher levels.
function cpuRoute(opts){
 const run=store.run;if(!cpuRun(run)||!cpuTurn()||store.view!=='board')return null;
 const options=opts.options||[],live=options.map((o,i)=>[o,i]).filter(([o])=>!o.disabled);if(!live.length)return null;
 const shown=openRoutePanel({...opts,watch:`${cpuPlayer().name} is choosing a road…`});let done=false;shown.then(()=>{done=true;});
 (async()=>{
  const w=([o])=>o.shortcut?1+3*skill(run):o.bridge?.6:1;let r=Math.random()*live.reduce((s,x)=>s+w(x),0),pick=live[0];for(const x of live){r-=w(x);if(r<=0){pick=x;break;}}
  await pause(thinkMs(900));if(done)return;routePreview(pick[1]);
  await pause(800);if(done||!routePanelOpen())return;
  require("src/routePanel.js").closeRoutePanel(pick[0].value);
 })();
 return shown;
}
function waiting(){return cpuTurn()?`${cpuPlayer().name.toUpperCase()}’S TURN`:'';}
// Recruits for the CPU's roster owner are dropped while a 1P board run is being played (not in the Arcade).
function blocksRecruit(owner){const run=store.run;if(!cpuRun(run)||!owner||owner!==cpuPlayer().owner)return false;return !store.arcade&&store.view!=='arcade';}

// Pokémon battles on the CPU's turn play themselves (fast) through the Game Boy autopilot.
function cpuMenu(menu){
 const ok=i=>!menu.items?.[i]?.disabled;
 if(menu.kind==='main')return 0;
 if(menu.kind==='party'){const i=(menu.list||[]).findIndex(m=>m.hp>0);return i>=0?i:-1;}
 if(menu.kind==='yesno')return 1;
 if(menu.kind==='fight'){const n=(menu.moves||menu.items||[]).length,list=[...Array(n).keys()].filter(ok);return list.length?list[Math.floor(Math.random()*list.length)]:0;}
 return 0;
}
async function cpuPk(p,fn){
 const run=store.run;if(!isCpuPlayer(run,p))return fn();
 const B=require("src/pkmn/pkmnBattle.js");B.setAutoPilot(cpuMenu);try{return await fn();}finally{B.setAutoPilot(null);}
}

// The CPU's turn: when the board is idle and it is up, it may use an item, then rolls.
function idle(run){
 if(!cpuTurn()||store.view!=='board'||run.phase!=='board'||store.busy||store.dialog||store.session||store.boardTour||routePanelOpen()||document.hidden)return false;
 try{if(require("src/pkmn/pkmnBattle.js").isOpen())return false;}catch{}
 const p=run.players[run.current];return p.rollCommittedTurn!==run.turn;
}
function tick(){
 const run=store.run,now=performance.now();
 if(!cpuRun(run)||now<coolUntil||!idle(run)){readyAt=0;return;}
 if(!readyAt){readyAt=now+thinkMs(1100);return;}
 if(now<readyAt)return;
 readyAt=0;coolUntil=now+1500;
 const p=run.players[run.current];
 if(run.cpu.itemTurn!==run.turn&&p.items.length&&canUseItem(run)){
  run.cpu.itemTurn=run.turn;
  if(Math.random()<.2+.25*skill(run)){intent='use';const i=Math.floor(Math.random()*p.items.length);void Promise.resolve(hooks.useItem?.(i)).catch(err=>console.error('CPU item failed',err)).finally(()=>{intent=null;});return;}
 }
 void Promise.resolve(hooks.roll?.()).catch(err=>console.error('CPU roll failed',err));
}
let timer=0;
function initCpuBoard(h){Object.assign(hooks,h);setCpuHooks({dialog:cpuDialog,route:cpuRoute,waiting,blocksRecruit});if(!timer)timer=setInterval(tick,300);}
Object.assign(exports,{initCpuBoard,makeCpuRun,cpuRun,cpuTurn,isCpuPlayer,cpuPk,cpuName});
