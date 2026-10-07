// Pokémon battles inside a ShambConkins run: each player's team (their character plus
// up to five random unlocked characters), the battle bag, wild encounters drawn from the
// landmark the player is walking past, trainer battles on Poké Ball spaces, and rewards
// (catching or beating a character unlocks it). Team and bag live on the player object
// (player.pkmn, player.pkbag) so old saves simply start without them.
const {store}=require("src/state.js");
const {CHARACTERS,character,characterIdentity}=require("src/characters.js");
const {availableCharacters,canRecruitReward,recruitReward}=require("src/profile.js");
const {location}=require("src/locations.js");
const {seededRandom,shuffle,clamp,hash}=require("src/utils.js");
const {pointChange}=require("src/items.js");
const D=require("src/pkmn/pkmnData.js");
const B=require("src/pkmn/pkmnBattle.js");
const AU=require("src/pkmn/pkmnAudio.js");

// Characters that never show up as wild or trainer Pokémon (special unlock paths stay untouched).
const RESERVED=new Set(['kc','mylo','loki','sean','amber']);
const isWildable=c=>c&&!c.unlockBy&&!RESERVED.has(c.id);
const WILDABLE=()=>CHARACTERS.filter(isWildable);
const REALM_FLOOR={mind:3,body:10,spirit:18,horror:26,'upside-down':20,warp:6};
const START_LEVEL={mind:6,body:12,spirit:20,horror:28,'upside-down':18,warp:8};
let hooks={};
function configurePkmn(h){hooks={...hooks,...h};}
const rnd=(run,salt)=>seededRandom(`${run.seed}:pkmn:${salt}:${run.turn}:${run.pkmnSerial=(run.pkmnSerial||0)+1}`);

// ---------------------------------------------------------------- team + bag
function realmOf(run,p){return run.board.nodes[p.node]?.realm||'mind';}
function ensureTeam(run,p,profile=store.profile){
 const kept=Array.isArray(p.pkmn?.team)?p.pkmn.team.map(D.normalizeMon).filter(Boolean).slice(0,6):[];
 const box=Array.isArray(p.pkmn?.box)?p.pkmn.box.map(D.normalizeMon).filter(Boolean).slice(-60):[];
 p.pkbag=sanitizeBag(p.pkbag);
 if(kept.length){p.pkmn={...p.pkmn,team:kept,box};if(!kept.some(m=>m.hp>0))kept.forEach(D.healMon);return p.pkmn;}
 const random=rnd(run,'team:'+p.owner),level=START_LEVEL[realmOf(run,p)]||6;
 const mine=characterIdentity(p.character),seen=new Set([mine]);
 const others=shuffle(availableCharacters(profile,p.owner).filter(id=>CHARACTERS.some(c=>c.id===id)&&!seen.has(characterIdentity(id))),random).filter(id=>{const k=characterIdentity(id);if(seen.has(k))return false;seen.add(k);return true;}).slice(0,5);
 const team=[p.character,...others].map(id=>D.makeMon(id,level));
 p.pkmn={team,box,created:run.turn};
 for(const [k,n] of Object.entries({'poke-ball':5,'potion':3}))p.pkbag[k]=Math.max(p.pkbag[k]||0,n);
 return p.pkmn;
}
function sanitizeBag(bag){const out={};if(bag&&typeof bag==='object')for(const [k,v] of Object.entries(bag))if(D.BAG_ITEMS[k]&&Number.isFinite(v)&&v>0)out[k]=Math.min(99,Math.floor(v));return out;}
function healTeam(p){if(!p?.pkmn?.team)return;for(const m of p.pkmn.team)D.healMon(m);}
// A new level: the team is healed and Professor Oak mails three more Poké Balls.
function healAll(run){for(const p of run.players){healTeam(p);if(p.pkmn){p.pkbag=sanitizeBag(p.pkbag);p.pkbag['poke-ball']=Math.min(99,(p.pkbag['poke-ball']||0)+3);}}}
function teamLevel(p){const t=p.pkmn?.team||[];if(!t.length)return 5;const lv=t.map(m=>m.lvl).sort((a,b)=>b-a);return Math.round(lv.slice(0,3).reduce((a,b)=>a+b,0)/Math.min(3,lv.length));}
function addCaught(p,mon){
 const t=p.pkmn.team;if(t.length<6){t.push(mon);return 'team';}
 p.pkmn.box.push(mon);p.pkmn.box=p.pkmn.box.slice(-60);return 'pc';
}

// ---------------------------------------------------------------- wild pools
// The landmark nearest to the player in the same realm decides who lives in the grass.
function nearestLandmark(run,p,max=650){
 const n=run.board.nodes[p.node];if(!n)return null;let best=null,bd=Infinity;
 for(const m of Object.values(run.board.nodes)){if(m.type!=='location'||m.realm!==n.realm)continue;const L=location(m.location);if(!L)continue;const d=Math.hypot(m.x-n.x,m.y-n.y);if(d<bd){bd=d;best=L;}}
 return bd<=max?best:null;
}
function wildPool(run,p,profile=store.profile){
 if(run.board.warp?.id==='pokemon'){const poke=WILDABLE().filter(c=>c.source==='Pokémon');return {ids:[...poke.map(c=>c.id),...shuffle(WILDABLE().map(c=>c.id),rnd(run,'pkpool')).slice(0,40)],place:'Route 1'};}
 const L=nearestLandmark(run,p);let ids=[];
 if(L){const fromLandmark=(L.characters||[]).filter(id=>CHARACTERS.some(c=>c.id===id)).map(character).filter(isWildable);const fromSource=WILDABLE().filter(c=>c.source===L.source);ids=[...new Set([...fromLandmark,...fromSource].map(c=>c.id))];}
 if(!ids.length)ids=WILDABLE().filter(c=>c.source!=='Pokémon').map(c=>c.id);
 return {ids,place:L?.name||null};
}
function pickWild(run,p,profile=store.profile,random=rnd(run,'wild')){
 const {ids,place}=wildPool(run,p,profile);
 const weights=ids.map(id=>canRecruitReward(profile,id,p.owner,'encounter')?4:1),sum=weights.reduce((a,b)=>a+b,0);let r=random()*sum;
 for(let i=0;i<ids.length;i++){r-=weights[i];if(r<=0)return {id:ids[i],place};}return {id:ids[0],place};
}
function wildLevel(run,p,random){const floor=REALM_FLOOR[realmOf(run,p)]||3;return clamp(teamLevel(p)-3+Math.floor(random()*5),floor,100);}
// Per-step encounter roll while walking ("from time to time"), at most once a turn.
function wildChance(run,p,node){
 if(store.profile?.settings?.wildEncounters===false||run.mutation||p.finishedPlayer||run.turn<2)return 0;
 if(p.wildTurn===run.turn)return 0;if(!node||['gate','warp','start'].includes(node.type))return 0;
 if(Number.isFinite(store.forceWildChance))return store.forceWildChance; // tests
 if(run.board.warp){if(run.board.warp.id!=='pokemon')return 0;return node.type==='grass'?.2:0;}
 return nearestLandmark(run,p,450)?.07:.035;
}

// ---------------------------------------------------------------- battles
function trainerLabel(id){return D.trainerClassFor(id)+' '+D.speciesFor(id).name;}
const INTRO_LINES=['Our eyes met! That means we battle!','I trained all six of these in a parking lot. Brace yourself!','You look like you have never lost a coin toss. Let’s fix that!','I’ve been standing here since the pilot episode. Fight me!','My team is stacked. My snacks are stacked. Let’s go!','Hey! You! Yes, you. Battle!'];
const LOSE_LINES=['Ugh! I should have trained harder!','You’re the real deal!','That was NOT in the script!','Fine. FINE. Take one of them.','I’m going back to the grass to think.'];
function buildTrainer(run,p,random,{size=6,levelBoost=1,trainerId=null,profile=store.profile}={}){
 const mine=new Set([...(p.pkmn?.team||[]).map(m=>characterIdentity(m.id)),characterIdentity(p.character)]);
 const pool=WILDABLE().filter(c=>!mine.has(characterIdentity(c.id))&&c.source!=='Pokémon');
 const trainer=trainerId||pool[Math.floor(random()*pool.length)].id,tSrc=character(trainer).source;
 const chosen=[],ids=new Set([characterIdentity(trainer)]);
 const add=c=>{const k=characterIdentity(c.id);if(ids.has(k)||chosen.length>=size)return;ids.add(k);chosen.push(c.id);};
 for(const c of shuffle(pool.filter(c=>c.source===tSrc),random).slice(0,2))add(c);
 const fresh=shuffle(pool.filter(c=>canRecruitReward(profile,c.id,p.owner,'encounter')),random);for(const c of fresh.slice(0,Math.ceil(size/2)))add(c);
 for(const c of shuffle(pool,random))add(c);
 // A short team faces the same six, a few levels lower.
 const short=Math.ceil(Math.max(0,6-(p.pkmn?.team?.length||6))*1.1),base=teamLevel(p)-short;
 const team=shuffle(chosen,random).map((id,i)=>D.makeMon(id,clamp(base-2+Math.floor(random()*3)+levelBoost+(i===chosen.length-1?1:0),2,100)));
 return {trainer,team};
}
async function battleFlow(run,p,{mode,foe,random,prize=0,pre=[],intro=null,unlockFrom=null,extraUnlock=null}){
 const profile=store.profile,T=ensureTeam(run,p,profile),wasBusy=store.busy;hooks.stopMusic?.();store.busy=true;
 if(pre.length){await B.gbMessages(pre,{keepOpen:true,song:intro});}
 const r=await B.battle({mode,player:{name:p.name,character:p.character,team:T.team,bag:p.pkbag},foe,random,prizeText:prize?`${p.name.toUpperCase()} got ${prize} points for winning!`:null});
 const unlocked=[];const lines=[];
 if(r.outcome==='caught'&&r.caught){
  const mon=D.normalizeMon(r.caught)||D.makeMon(r.caught.id,r.caught.lvl);const name=D.speciesFor(mon.id).name;
  const actual=canRecruitReward(profile,mon.id,p.owner,'encounter')?recruitReward(profile,mon.id,p.owner,'encounter',random):null;
  if(actual)unlocked.push(actual);
  const where=addCaught(p,mon);
  lines.push(where==='team'?`${name} joined ${p.name.toUpperCase()}’s team!`:`${name} was transferred to BILL’s PC!`);
  if(actual)lines.push(`${character(actual).name} is now on ${p.name}’s roster! Pick them on any expedition.`);
  else{p.points+=2;lines.push(`${name} was already on your roster. +2 points.`);}
  hooks.logRun?.(`${p.name} caught ${character(mon.id).name}.`);
 }
 if(r.outcome==='win'){
  p.points+=prize;
  const cands=[...new Set([...(extraUnlock?[extraUnlock]:[]),...(unlockFrom||[]).filter(id=>r.defeated.includes(id))])].filter(id=>canRecruitReward(profile,id,p.owner,'encounter'));
  const pickId=extraUnlock&&cands.includes(extraUnlock)?extraUnlock:cands[Math.floor(random()*cands.length)];
  const actual=pickId?recruitReward(profile,pickId,p.owner,'encounter',random):null;
  if(actual){unlocked.push(actual);lines.push(`${D.speciesFor(actual).name} was so impressed by your team, they joined ${p.name}’s roster!`);}
  else if(unlockFrom)lines.push('Everyone you beat is already on your roster. You keep the prize money.');
  if(mode!=='wild')hooks.logRun?.(`${p.name} won a Pokémon battle against ${foe.label}.`);else p.points+=1;
 }
 if(r.outcome==='lose'){
  const loss=pointChange(p,-3);healTeam(p);
  lines.push(`${p.name.toUpperCase()} scurried to a POKéMON CENTER, protecting the exhausted team from further harm! ${loss.blocked?'A shield kept your points.':loss.delta?`${loss.delta} points.`:''}`);
  hooks.logRun?.(`${p.name} blacked out in a Pokémon battle.`);
 }
 for(const l of lines){if(!B.isOpen())break;await B.say(l);}
 B.closeGB();store.busy=wasBusy;hooks.saveRun?.();hooks.updateBoard?.();hooks.startMusic?.();
 if(unlocked.length&&hooks.unlockDialog){store.busy=true;await hooks.unlockDialog(unlocked,p.owner);store.busy=wasBusy;}
 return {...r,unlocked};
}
async function wildEncounter(run,p,{id=null,level=null,cause='grass'}={}){
 const random=rnd(run,'wild-battle'),profile=store.profile;ensureTeam(run,p,profile);
 const pick=id?{id,place:null}:pickWild(run,p,profile,random),lvl=level||wildLevel(run,p,random);
 p.wildTurn=run.turn;
 return battleFlow(run,p,{mode:'wild',foe:{team:[D.makeMon(pick.id,lvl)]},random});
}
async function trainerSpace(run,p,{gym=false,trainerId=null,size=6,label=null,intro=null,pre=null}={}){
 const random=rnd(run,'trainer'),profile=store.profile;ensureTeam(run,p,profile);
 const {trainer,team}=buildTrainer(run,p,random,{size,levelBoost:gym?2:1,trainerId});
 const name=label||trainerLabel(trainer),c=character(trainer);
 const lines=pre||[`${name}: ${intro||c.unlockPhrase||INTRO_LINES[Math.floor(random()*INTRO_LINES.length)]}`];
 const prize=gym?6:Math.max(2,Math.round(size*.7));
 return battleFlow(run,p,{mode:gym?'gym':'trainer',foe:{label:name,character:trainer,team,lose:LOSE_LINES[Math.floor(random()*LOSE_LINES.length)]},random,prize,pre:lines,intro:'spotted',unlockFrom:team.map(m=>m.id),extraUnlock:gym?trainer:null});
}
async function openTeam(run,p){const T=ensureTeam(run,p);hooks.stopMusic?.();await B.fieldMenu({team:T.team,bag:p.pkbag,name:p.name,character:p.character});hooks.saveRun?.();hooks.startMusic?.();}

Object.assign(exports,{configurePkmn,ensureTeam,healTeam,healAll,teamLevel,wildPool,pickWild,wildChance,wildEncounter,trainerSpace,buildTrainer,openTeam,nearestLandmark,isWildable,RESERVED});
