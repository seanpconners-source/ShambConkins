// Single-player (1P) Arcade mode: settings, which games support it, CPU skill and best-run records.
// Kinds: 'levels' = one player plays level after level until the run ends or they bank it;
//        'rounds' = timed turn game replayed in harder rounds (turnRunner / arcadeRounds handle it);
//        'turns' = pass-and-play engine the launcher runs once per round (soloTurnRounds); 'cpu' = player 2 is a CPU;
//        'alone' = a co-op game played by one player, no CPU teammate (the engine thins out the enemies);
//        'game' = one whole game on your own (pinball: 3 balls, beat the replay score; engine calls soloFinish).
const SOLO_LEVELS=['easy','normal','hard'];
const SOLO_LEVEL_NAMES={easy:'Easy',normal:'Normal',hard:'Hard'};
// CPU skill 0..1 per difficulty; engines scale reaction time, aim error and speed from it.
const SOLO_SKILL={easy:.35,normal:.65,hard:.9};
const SOLO_IDS={
 'broforce-jungle':'levels','broforce-factory':'levels','broforce-city':'levels','broforce-desert':'levels',
 'smb-world-1':'levels','smb-coin-rush':'levels','smb-castle-dash':'levels',
 'sonic-ring-rush':'levels','sonic-goal-dash':'levels',
 'cv-vampire-killer':'levels','cv-candle-hunt':'levels','cv-symphony':'levels',
 'bricks-breaker-quest':'levels','doom':'levels','doom-2':'levels','paddys-hole':'levels','megatouch-photohunt':'levels',
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
 'space-swarm':'turns','taskmaster-micro-relay':'turns','kingpin-bowling':'turns',
 'major-league-fielding':'turns','flipadelphia-cup':'turns','office-hockey-shootout':'turns','chutes-spinner-showdown':'turns',
 'smb3-spade-slots':'turns',
 // batch 3: CPU opponents (cpuKit / cpuBoards)
 'matrix-ultimate':'cpu','greed-island-mancala':'cpu','deadite-checkers':'cpu','ten-forward-chess':'cpu','office-dots-boxes':'cpu',
 'four-lights':'cpu','strategema-grid':'cpu','wopr-grid':'cpu','trek-mini-chess':'cpu',
 'pong-duel':'cpu','rink-rivals':'cpu','taskmaster-sumo':'cpu','fast-quarter-mile':'cpu','snake-v-snake':'cpu','kill-bill-duel':'cpu',
 'raiders-ball-run':'cpu','battle-royale-island':'cpu','metal-gear-tank-duel':'cpu',
 'league-penalties':'cpu','brawndo-fruit-merge':'cpu','terminator-scan':'cpu','review-pancakes':'cpu','tarantino-standoff':'cpu',
 'tarantino-twist':'cpu','tarantino-adrenaline':'cpu','tarantino-crazy88':'cpu','tarantino-bounty':'cpu','tarantino-chase':'cpu',
 'hungry-hungry-heads':'cpu','snowball-fight':'cpu','disc-duel':'cpu','arrow-arena':'cpu','driller-duel':'cpu','bubble-battle':'cpu',
 'sp-dodgeball':'cpu','sp-cheesy-poofs':'cpu','sp-killed-kenny':'cpu','bond-laser-vault':'cpu','bond-golden-gun':'cpu','bond-goldfinger-bomb':'cpu',
 'hyrule-rupee-rush':'cpu','hyrule-sword-duel':'cpu','chutes-ladder-rush':'cpu','candy-gumdrop-catch':'cpu','candy-color-dash':'cpu',
 'derezzed-cycles':'cpu','bomber-duel':'cpu','pac-maze-duel':'cpu','block-battle':'cpu','shred-hero':'cpu','underdog-dodgeball':'cpu','fight-night':'cpu',
 'color-of-money':'cpu','task-tallest-thing':'cpu','bug-artillery':'cpu','taskmaster-curling':'cpu','happy-gilmore-golf':'cpu','space-swarm-versus':'cpu',
 'sewer-clash':'cpu','paddys-beer-pong':'cpu','baseketball-shootout':'cpu','django-hangman':'cpu','django-hangman-showdown':'cpu',
 // batch 4: trivia, cards, dice and table games vs CPU
 'trivia-mixed':'cpu','trivia-nick90':'cpu','trivia-dbz':'cpu','trivia-hxh':'cpu','trivia-sitcom':'cpu','trivia-hardcore':'cpu',
 'trivia-lightning':'cpu','trivia-wager':'cpu','trivia-survival':'cpu',
 'blackjack':'cpu','five-card':'cpu','roulette':'cpu','bond-baccarat':'cpu','full-shambyahtzee':'cpu','cheaters-yahtzee':'cpu',
 'shamb-uno':'cpu','traitors-guess-who':'cpu','liars-dice':'cpu','battleship-fog':'cpu','simon-faceoff':'cpu','price-bid-off':'cpu',
 'clue-whodunit':'cpu','clue-lineup':'cpu','monopoly-speed-die':'cpu','monopoly-auction':'cpu','smb3-nspade':'cpu',
 'django-hangman-wanted':'cpu','microgame-rush':'cpu','rush-marathon':'cpu',
 // batch 5: co-op games with a take-turns version (Space Swarm plays solo) keep a CPU teammate (engine sets s.solo.coop +
 // s.solo.won); co-op games without one are played alone. Rainbow Rivals runs leg after leg, Balloon Battle is vs a CPU kart
 'living-dead-horde':'alone','bucketheadland-pinball':'game','space-swarm-coop':'cpu','rainbow-rivals':'levels','rainbow-balloon-battle':'cpu',
};
// Purely social games (they need two real people) are hidden from the 1P Arcade list.
const SOLO_HIDDEN=new Set(['newlywed-spirit','roast-battle','draw-it']);
const soloHidden=game=>!!game&&SOLO_HIDDEN.has(game.id);
// Co-op games where the 'cpu' is a teammate, not an opponent.
const SOLO_COOP=new Set(['space-swarm-coop']);
const soloCoop=game=>!!game&&SOLO_COOP.has(game.id);
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

// Online duels (src/duel.js): both phones play the 1P version from the same seed and compare scores, so only games whose
// solo run ends in a score qualify; CPU-opponent games need real head-to-head play: those whose engine plays natively
// online (src/netPlay.js: both phones run the 2P game, each plays its own player) are listed in NET_NATIVE.
const DUEL_KINDS=new Set(['levels','rounds','turns','game','alone']);
const NET_NATIVE=new Set(['trivia-mixed','trivia-nick90','trivia-dbz','trivia-hxh','trivia-sitcom','trivia-hardcore','trivia-lightning','trivia-wager','trivia-survival',
 'paddys-beer-pong','shamb-uno','ten-forward-chess','deadite-checkers',
 'four-lights','strategema-grid','full-shambyahtzee','cheaters-yahtzee',
 'blackjack','five-card','roulette','bond-baccarat','traitors-guess-who','battleship-fog',
 'liars-dice','clue-whodunit','monopoly-speed-die','monopoly-auction',
 'simon-faceoff','price-bid-off','django-hangman-showdown','django-hangman-wanted',
 'matrix-ultimate','greed-island-mancala','office-dots-boxes',
 'trek-mini-chess','wopr-grid','smb3-nspade','clue-lineup','django-hangman',
 'taskmaster-curling','bug-artillery','happy-gilmore-golf','color-of-money','baseketball-shootout',
 'task-tallest-thing','fast-quarter-mile','block-battle','shred-hero','candy-color-dash','chutes-ladder-rush',
 'brawndo-fruit-merge','candy-gumdrop-catch','review-pancakes','terminator-scan','microgame-rush','rush-marathon',
 'pong-duel','derezzed-cycles','snake-v-snake','metal-gear-tank-duel','kill-bill-duel',
 'arrow-arena','battle-royale-island','bomber-duel','pac-maze-duel',
 'driller-duel','bubble-battle','snowball-fight','disc-duel',
 'rink-rivals','taskmaster-sumo','hungry-hungry-heads','underdog-dodgeball',
 'tarantino-standoff','tarantino-twist','tarantino-adrenaline','tarantino-bounty','tarantino-crazy88','tarantino-chase',
 'sp-dodgeball','sp-cheesy-poofs','sp-killed-kenny',
 'raiders-ball-run','sewer-clash','league-penalties','fight-night','hyrule-rupee-rush','hyrule-sword-duel',
]);
const netNative=g=>!!g&&NET_NATIVE.has(g.id);
function duelOK(g){return !!g&&!g.pokemon&&!SOLO_HIDDEN.has(g.id)&&(DUEL_KINDS.has(soloKind(g))||netNative(g));}
// 1P board game (src/cpuBoard.js): the human plays games with a real CPU opponent ('cpu') or co-op games alone ('alone':
// bosses, the horde); score-attack kinds can't decide a head-to-head board game, and CPU-teammate games are left out.
function boardCpuKind(g){const k=soloKind(g);return !!g&&!g.pokemon&&!SOLO_HIDDEN.has(g.id)&&!SOLO_COOP.has(g.id)&&(k==='cpu'||k==='alone')?k:null;}
Object.assign(exports,{boardCpuKind,duelOK,netNative,NET_NATIVE,SOLO_LEVELS,SOLO_LEVEL_NAMES,SOLO_SKILL,soloKind,soloHidden,soloCoop,soloSettings,setSolo,normalizeSoloSettings,normalizeSoloBest,soloBest,recordSolo,soloBestText,isSolo,cpuSkill,soloProgress,soloFinish,soloNext});
