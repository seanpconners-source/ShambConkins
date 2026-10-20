// Single-player (1P) Arcade mode: settings, which games support it, CPU skill and best-run records.
// Kinds: 'levels' = one player plays level after level until the run ends or they bank it;
//        'rounds' = timed turn game replayed in harder rounds (turnRunner / arcadeRounds handle it);
//        'turns' = pass-and-play engine the launcher runs once per round (soloTurnRounds); 'cpu' = player 2 is a CPU.
const SOLO_LEVELS=['easy','normal','hard'];
const SOLO_LEVEL_NAMES={easy:'Easy',normal:'Normal',hard:'Hard'};
// CPU skill 0..1 per difficulty; engines scale reaction time, aim error and speed from it.
const SOLO_SKILL={easy:.35,normal:.65,hard:.9};
const SOLO_IDS={
 'broforce-jungle':'levels','broforce-factory':'levels','broforce-city':'levels','broforce-desert':'levels',
 'smb-world-1':'levels','smb-coin-rush':'levels','smb-castle-dash':'levels',
 'sonic-ring-rush':'levels','sonic-goal-dash':'levels',
 'cv-vampire-killer':'levels','cv-candle-hunt':'levels','cv-symphony':'levels',
 'bricks-breaker-quest':'levels','paddys-hole':'levels','megatouch-photohunt':'levels',
 'kart-grand-prix-pass':'levels','kart-time-trial':'levels','rainbow-road-kart':'cpu',
 // batch 2: timed turn games replayed in faster rounds (retroKit turnRunner → soloTurnRuns)
 'warriors-brawl':'rounds','paddys-darts':'rounds','duck-hunt-turn':'rounds','snake-run':'rounds','mars-missile-defense':'rounds',
 'moonraker-lander':'rounds','t800-scan-long':'rounds','bond-facility':'rounds','major-league-bats':'rounds','asteroid-drift':'rounds',
 'breakout-party':'rounds','banana-money-grab':'rounds',
 // arcadeRounds (arcade.js → soloArcadeRounds)
 'radical-bike':'rounds','flappy-disaster':'rounds','crossy-chaos':'rounds','gopher-hunt':'rounds','wind-archery':'rounds',
 // pass-and-play engines run once per round by the launcher (soloTurnRounds); the hand-off to P2 ends the round
 'taskmaster-fruit-ninja':'turns','angry-heads':'turns','neon-ball-storm':'turns','home-alone-paint-can':'turns','tm-cones':'turns',
 'paper-route':'turns','warehouse-shift':'turns','matrix-hardline-hack':'turns','alien-sonar-grid':'turns','kitchen-service':'turns',
 'space-swarm':'turns','taskmaster-micro-relay':'turns','kingpin-bowling':'turns','bucketheadland-pinball':'turns',
 'major-league-fielding':'turns','flipadelphia-cup':'turns','office-hockey-shootout':'turns','chutes-spinner-showdown':'turns',
 'smb3-spade-slots':'turns',
 // batch 3: CPU opponents (cpuKit / cpuBoards)
 'matrix-ultimate':'cpu','greed-island-mancala':'cpu','deadite-checkers':'cpu','ten-forward-chess':'cpu','office-dots-boxes':'cpu',
 'four-lights':'cpu','strategema-grid':'cpu','wopr-grid':'cpu','trek-mini-chess':'cpu',
};
const soloKind=game=>game?SOLO_IDS[game.id]||game.soloKind||null:null;
function soloSettings(profile){const s=profile?.settings?.solo||{};return {on:s.on===true,who:s.who===1?1:0,level:SOLO_LEVELS.includes(s.level)?s.level:'normal'};}
function setSolo(profile,patch){profile.settings.solo={...soloSettings(profile),...patch};return profile.settings.solo;}
function normalizeSoloSettings(saved){if(!saved||typeof saved!=='object')return undefined;return {on:saved.on===true,who:saved.who===1?1:0,level:SOLO_LEVELS.includes(saved.level)?saved.level:'normal'};}
// Best solo run per game id: {score, level} (level = levels cleared / rounds reached).
function normalizeSoloBest(saved){if(!saved||typeof saved!=='object'||Array.isArray(saved))return {};const out={};for(const [id,v] of Object.entries(saved)){if(typeof id!=='string'||id.length>64||!v||typeof v!=='object')continue;const score=Number.isFinite(v.score)&&v.score>=0?Math.floor(v.score):0,level=Number.isFinite(v.level)&&v.level>=0?Math.min(9999,Math.floor(v.level)):0;out[id]={score,level};}return out;}
function soloBest(profile,id){return profile?.soloBest?.[id]||null;}
function recordSolo(profile,id,{score=0,level=0}={}){const book=profile.soloBest||={},old=book[id]||{score:0,level:0};const best={score:Math.max(old.score,Math.floor(score)||0),level:Math.max(old.level,Math.floor(level)||0)};const newBest=(score>old.score)||(level>old.level);book[id]=best;return {best,old,newBest};}
function soloBestText(profile,id){const b=soloBest(profile,id);if(!b||!(b.score||b.level))return '';return `BEST ${b.score.toLocaleString()}${b.level?` · ${b.level} CLEARED`:''}`;}
// Session helpers for engines. s.solo is set by the launcher on a solo run: {kind, who, level, skill}.
const isSolo=s=>!!s?.solo;
const cpuSkill=s=>s?.solo?.skill??SOLO_SKILL.normal;
// Engines keep s.soloProgress = {score, level, label} current so Exit can bank the run.
function soloProgress(s,score,level,label=''){if(s?.solo)s.soloProgress={score:Math.max(0,Math.floor(score)||0),level:Math.max(0,Math.floor(level)||0),label};}
// End a solo run: scores [player, 0]; won = cleared at least one level (or beat the CPU).
function soloFinish(s,score,level,label,won=level>0){if(!s?.solo||!s.alive)return;soloProgress(s,score,level,label);s.solo.won=!!won;s.finish([Math.max(0,Math.floor(score)||0),0],label);}
// Between levels: a card with the run so far. Resolves true to keep going (Exit on the card banks the run).
async function soloNext(s,{title='Level cleared!',body='',level=1,score=0,label='Next level'}={}){if(!s?.alive)return false;return s.pass(0,body,label,{summary:`${title} Level ${level} · ${Number(score).toLocaleString()} points so far.`,soloTitle:title});}

Object.assign(exports,{SOLO_LEVELS,SOLO_LEVEL_NAMES,SOLO_SKILL,soloKind,soloSettings,setSolo,normalizeSoloSettings,normalizeSoloBest,soloBest,recordSolo,soloBestText,isSolo,cpuSkill,soloProgress,soloFinish,soloNext});
