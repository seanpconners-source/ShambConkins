// Content pack: BOSS FIGHT. One encounter game per boss (launched by the board or the arcade/debug launcher).
const lazy=(file,name)=>s=>require(file)[name](s);
const {BOSSES,bossesForLevel}=require("src/data/bosses.js");
const engines={bossfight:lazy("src/engines/bossFight.js","bossfight")};
const games=[];
const LEVEL_LABEL={mind:'Mind',body:'Body',spirit:'Spirit',horror:'Horror',warp:'Warp'};
const events=BOSSES.map(b=>({id:'boss-'+b.id,engine:'bossfight',bossId:b.id,title:'Boss · '+b.name,source:b.source,icon:b.icon,category:'coop',
 duration:'about 90 seconds',cooperative:true,reward:10,level:b.level,tier:b.tier,
 rules:`BOTH PLAYERS FIGHT ${b.name.toUpperCase()}, ${b.epithet.toUpperCase()}. Drag your half of the screen to fly; you auto-fire. Tap on a PINK bullet to parry it (safe moment + super meter). Tap again or flick up with a full meter to unleash your Super. Each of you has 3 hearts; a downed partner floats as a bubble: fly into it and tap within 5 seconds to revive. Both down means defeat. Win to unlock ${b.name}.`}));
// Pick a random boss of a board level ('mind'|'body'|'spirit'|'horror'|'warp'). `random` is a () => [0,1) source.
function bossFor(level,random=Math.random,excludeIds=[]){const ex=new Set(excludeIds||[]);let list=bossesForLevel(level).filter(b=>!ex.has(b.id)&&!ex.has('boss-'+b.id));if(!list.length)list=bossesForLevel(level);if(!list.length)return null;return list[Math.min(list.length-1,Math.floor(random()*list.length))];}
Object.assign(exports,{engines,games,events,bossFor,LEVEL_LABEL});
