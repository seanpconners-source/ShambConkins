const {ACTIVE_CATALOG:CATALOG}=require("src/contentPolicy.js");
const {resolveEncounterGame}=require("src/encounterGames.js");
const {advanceAlong}=require("src/board.js");
const {pick, seededRandom, clamp}=require("src/utils.js");
const {recruit, saveProfile}=require("src/profile.js");
const {character, characterIdentity}=require("src/characters.js");
const {OBSTACLE_TYPES}=require("src/obstacles.js");
const {selectItemDrop, selectItemStock, rememberItemFind}=require("src/itemDrops.js");
const ITEMS = CATALOG.items;
const findItem = id => ITEMS.find(i=>i.id===id);
function canUseItem(run){const p=run?.players?.[run.current];return !!p&&!run.finished&&run.phase==='board'&&p.itemUsedTurn!==run.turn&&p.rollCommittedTurn!==run.turn;}
function rollDice(player,lucky=false,random=Math.random){
 const advantage=!!lucky||player.rollAdvantage>0,disadvantage=player.rollDisadvantage>0,notes=[];
 const draw=()=>{let value=1+Math.floor(clamp(Number(random())||0,0,1-Number.EPSILON)*6);if(player.rollReverse){value=7-value;}value=Math.max(Math.min(6,player.rollFloor||1),value);if(player.rollFixed)value=player.rollFixed;if(player.rollCeiling)value=Math.min(value,player.rollCeiling);return clamp(value,1,6);};
 const faces=[draw()];if(advantage!==disadvantage)faces.push(draw());const base=disadvantage&&!advantage?Math.min(...faces):Math.max(...faces);
 if(advantage&&disadvantage)notes.push('Lucky die and lower-die jinx cancelled');else if(disadvantage)notes.push('lower-die jinx');else if(advantage)notes.push('better of two');
 if(player.rollReverse)notes.push('dice reversed');if(player.rollCeiling)notes.push('base die capped at '+player.rollCeiling);if(player.rollFixed)notes.push('fixed die');
 if(player.rollAdvantage)player.rollAdvantage--;if(player.rollDisadvantage)player.rollDisadvantage--;if(player.rollReverse)player.rollReverse--;player.rollCeiling=0;player.rollFixed=0;player.rollFloor=0;player.lastBaseRoll=base;
 return {faces,base,note:notes.join(' · ')};
}
function clearMovementPenalties(p){p.slow=0;p.slowAfterRoll=0;p.rollDisadvantage=0;p.rollCeiling=0;p.boost=Math.max(0,p.boost);}
function settleItemInvestments(run,finish=false){const messages=[];for(const p of run.players){const due=(p.itemInvestments||[]).filter(d=>finish||run.players[run.current]===p&&d.dueTurn<=run.turn);if(!due.length)continue;const amount=due.reduce((n,d)=>n+d.amount,0);p.points+=amount;p.itemInvestments=(p.itemInvestments||[]).filter(d=>!due.includes(d));messages.push(`${p.name}’s saved investment pays ${amount} points.`);}return messages;}
function reachableBarriers(run,player){
 const realm=run.board.nodes[player.node].realm,distance=new Map([[player.node,0]]),queue=[player.node];for(let i=0;i<queue.length;i++)for(const id of run.board.nodes[queue[i]].next){if(distance.has(id)||run.board.nodes[id].realm!==realm)continue;distance.set(id,distance.get(queue[i])+1);queue.push(id);}
 return (run.board.obstacles||[]).filter(o=>!o.open&&distance.has(o.from)).sort((a,b)=>distance.get(a.from)-distance.get(b.from));
}
function rollMovement(player,base,bonus=0){let steps=Math.max(base,player.rollFloor||1)+(player.boost||0)+bonus;player.boost=0;player.rollFloor=0;if(player.rollDouble){steps*=2;player.rollDouble--;}if(player.slow){steps=Math.max(1,Math.ceil(steps/2));player.slow--;}if(player.triple){steps*=3;player.triple--;}if(player.slowAfterRoll){player.slow=(player.slow||0)+player.slowAfterRoll;player.slowAfterRoll=0;}return Math.max(1,Math.min(24,steps));}
function itemDescription(it){const base=baseItemDescription(it);if(it.kind==='trailGear')return base;const routes=OBSTACLE_TYPES.filter(o=>o.tools.includes(it.id)).map(o=>o.name);return base+(routes.length?` Carry instead: reusable passage through ${routes.join(', ')}. Keep it in your bag to cross; using it before rolling consumes it.`:'');}
function baseItemDescription(it) {
 const val=Number(it.value)||1;
 if(it.itemPack===43)return it.desc;
 const exact={
  'fight-milk':'Next roll +2; next minigame reward +4. After that game, lose 2 points and halve your next roll.',
  'kitten-mittens':'Block your next two point penalties and the next point-stealing attack.',
  'hang-cat-poster':'Clear movement slowdowns and gain a shield. Gain 6 points if at least 5 behind; otherwise gain 2.',
  'golden-birthday-cake-oreos':'+4 points and +18 XP. Half movement for four rolls, with a double-sized avatar for four personal turns.',
  'hunter-license':'+3 points and +12 XP. Your next trivia win has a 70% recruitment chance when a guest is eligible.'
 };
 if(exact[it.id])return exact[it.id];
 if(it.kind==='transform')return it.desc;
 if(it.id==='killua-yoyos')return '+2 on the next minigame reward and triple movement for one roll.';
 if(it.kind==='game'||it.kind==='duel'){const g=resolveEncounterGame(it.value,{source:it.source,itemId:it.id});return g?`Challenge both players to ${g.title}.`:'Spin the minigame roulette for a new challenge.';}
 if(it.kind==='music')return 'Switch to a new original synth groove and gain 2 points.';
 if(it.kind==='preview')return 'Reveal the whole current realm and gain one reroll.';
 if(it.kind==='shortcut')return 'Move forward 5 spaces and unlock Rainbow Road, then roll normally. Only your dice landing triggers an encounter.';
 if(it.kind==='gear'){const g=it.gear||{},bonus=g.gameBonus||g.foodGameBonus||0;return `${g.foodGameBonus?`+${g.foodGameBonus} on your next food/flavor minigame reward, or +${g.gameBonus||0} otherwise. `:bonus?`${bonus>0?'+':''}${bonus} on the next minigame reward. `:''}${g.halfTurns?`Half movement for ${g.halfTurns} rolls. `:''}${g.tripleTurns?`Triple movement for ${g.tripleTurns} rolls. `:''}${g.recruitChance?'Your next win has an increased chance to recruit a guest.':''}`;}
 const descriptions={points:`Gain ${val} points.`,boost:`Add ${val} spaces to your next dice roll.`,shield:`Block the next ${val} point ${val===1?'penalty':'penalties'}.`,double:'Double the base reward of your next winning minigame.',steal:`Steal up to ${val} points from your opponent. A shield, cloak, attack ward or Kitten Mittens can block it.`,bomb:`Steal up to ${val} points from your opponent. A shield or attack ward can block it.`,healshield:`Gain ${val} points and one penalty shield.`,forward:`Move forward ${val} spaces, then roll normally. Only the dice landing triggers an encounter.`,rewind:`Move back up to ${val} visited spaces, then roll normally.`,pushOther:`Push your opponent back up to ${val} visited spaces. An attack ward blocks it.`,swap:'Swap board positions with your opponent, then roll normally. An attack ward blocks it.',cloak:`Avoid point penalties for ${val} of your personal turns.`,extraTurn:'Take one additional turn after this turn.',statusTriple:`Triple movement for your next ${val} dice rolls.`,trap:'Plant a trap here. An opponent landing on it loses 5 points unless protected.',randomItem:'Exchange this for a random item. Your item action is then used for this turn.',multiply:'Copy a random item still in your bag. If empty, receive a random item. Use the copy on a later turn.',teleport:'Teleport to a random non-gate space in this zone, then roll normally.',chaos:'70% chance to gain 5 points, otherwise lose 3. Independently, a 30% chance adds 2 to your next roll.'};
 return descriptions[it.kind]||(it.desc||'Gain 3 points.').replace(/Game art[^.]*\./g,'');
}
function randomItem(random=Math.random,context={}) { return selectItemDrop(ITEMS,{...context,random}); }
function itemSupplyChoices(run,profile,player,item,index=player.items.indexOf(item.id)){return selectItemStock(ITEMS,{player,profile,blockedIds:[item.id],random:seededRandom(run.seed+':supply-choice:'+run.turn+':'+item.id+':'+index)},3);}
function acquireItem(run, profile, player, id) {
 const item=typeof id==='string'?findItem(id):id;if(!item||!player)return {item:null,message:'No item was found.',unlocked:[],transformed:false};
 player.items.push(item.id);rememberItemFind(profile,player,item.id);
 const result=item.kind!=='transform'?{item,message:`Found ${item.name}. Added to your bag.`,unlocked:[],transformed:false,owner:player.owner}:transformItem(run,profile,player,item,player.items.length-1);
 const index=run.players.indexOf(player);if(index>=0){run.itemAcquisitionSerial=(run.itemAcquisitionSerial||0)+1;const acquisition={serial:run.itemAcquisitionSerial,player:index,id:item.id,consumed:item.kind==='transform'&&!result.retained,transformed:result.transformed};run.itemAcquisitions=[...(run.itemAcquisitions||[]),acquisition].slice(-16);result.acquisition=acquisition;}
 return result;
}
function transformItem(run,profile,player,item,index) {
 if(profile&&!profile.itemsSeen.includes(item.id))profile.itemsSeen.push(item.id);
 const target=character(item.value),unlocked=profile&&recruit(profile,target.id,player.owner,'item')?[target.id]:[];
 const opponent=run.players.find(p=>p!==player);
 const occupied=opponent&&[opponent.character,opponent.bench].filter(Boolean).some(id=>characterIdentity(id)===characterIdentity(target.id));
 if(occupied){
  if(profile)saveProfile(profile);
  return {item,message:`${target.name} is permanently available in ${player.owner}'s roster. ${opponent.name} already has Edgar${opponent.bench&&characterIdentity(opponent.bench)===characterIdentity(target.id)?' on their team':''}, so the suit stays in your bag. Wear it after they change characters; both players must stay distinct.`,unlocked,transformed:false,retained:true,owner:player.owner};
 }
 const previous=player.character;if(player.bench&&characterIdentity(player.bench)===characterIdentity(target.id))player.bench=previous;
 player.items.splice(index,1);player.character=target.id;player.boost+=2;player.mood='silly';
 if(profile)saveProfile(profile);
 return {item,message:`${player.name} becomes ${target.name} for this run! Edgar permanently joins ${player.owner}'s roster. The suit is worn immediately; next roll +2.`,unlocked,transformed:previous!==target.id,retained:false,owner:player.owner};
}
function pointChange(player, delta, canBlock=true) { if(delta<0&&canBlock&&player.shields>0){player.shields--;return {delta:0,blocked:true};}const old=player.points;player.points=Math.max(0,player.points+delta);return {delta:player.points-old,blocked:false}; }
function useItemEffect(run, profile, index, random=Math.random,options={}) {
 const p=run.players[run.current],other=run.players[1-run.current],it=findItem(p.items[index]);if(!it)return {message:'That item is no longer in the bag.'};
 if(!canUseItem(run))return {message:'One item per turn, before rolling. Your bag stays unchanged.',blocked:true};
 let chosenSupply=null;
 if(it.kind==='chooseSupply'){const choices=itemSupplyChoices(run,profile,p,it,index);chosenSupply=choices.find(i=>i.id===options.choiceId);if(!chosenSupply)return {message:'Choose one supply before opening this crate.',blocked:true,needsChoice:true,choices};}
 if(it.kind==='investment'&&p.points<=0)return {message:'You need at least one point to invest. Keep this item for later.',blocked:true};
 if(it.kind==='itemRaid'&&!other.items.some(id=>findItem(id)))return {message:`${other.name}’s bag is empty. Keep this item for later.`,blocked:true};
 if(it.kind==='transform'){const result=transformItem(run,profile,p,it,index);if(!result.retained)p.itemUsedTurn=run.turn;return result;}
 p.itemUsedTurn=run.turn;
 p.items.splice(index,1);if(!profile.itemsSeen.includes(it.id))profile.itemsSeen.push(it.id);
 let msg='', game=null,gained=null;const gains=[];const val=Number(it.value)||1;
 const gain=drop=>{const found=acquireItem(run,profile,p,drop);gains.push(found);return found;};
 const points=n=>{const r=pointChange(p,n,false);return `${r.delta>=0?'+':''}${r.delta} points`;};
 const special={
  'fight-milk':()=>{p.boost+=2;p.rewardBonus+=4;p.crash=true;return 'Next roll +2. Next minigame reward +4. Then -2 points and one slow roll.';},
  'kitten-mittens':()=>{p.shields+=2;p.antiSteal++;return 'Two penalty shields. Your next stolen-point attack is blocked.';},
  'hang-cat-poster':()=>{clearMovementPenalties(p);p.shields++;return `${points(other.points-p.points>=5?6:2)}. Slowdowns cleared; one shield.`;},
  'golden-birthday-cake-oreos':()=>{profile.xp+=18;p.slow+=4;p.large=Math.max(p.large,4);p.largeStart=run.turn;return `${points(4)} and +18 XP. Double-sized avatar; half movement for four rolls.`;},
  'doom-amp-stack':()=>{p.rewardBonus+=5;p.slow+=2;return 'Next minigame reward +5; half movement for two rolls.';},
  'primus-bass-rig':()=>{p.boost+=5;p.rewardBonus-=2;return 'Next roll +5; next minigame reward -2.';},
  'rum-ham-reserve':()=>{p.slow+=2;return `${points(7)}; half movement for two rolls.`;},
  'brawndo-iv':()=>{p.boost+=5;return `${points(-2)}; next roll +5.`;},
  'red-pill-overclock':()=>{p.triple=(p.triple||0)+2;p.rewardBonus-=3;return 'Triple movement for two rolls; next game reward -3.';},
  'necronomicon-first-edition':()=>{profile.xp+=12;run.traps||=[];run.traps.push({node:p.node,owner:run.current});return '+12 XP. A trap is planted here for your opponent.';},
  'nick-gak':()=>{profile.xp+=10;p.shields++;p.slow++;return '+10 XP, one shield, one slow roll.';},
  'senzu-bean':()=>{clearMovementPenalties(p);profile.xp+=6;return `${points(-2)}. Slowdowns cleared; +6 XP.`;},
  'scouter':()=>{p.rewardBonus+=3;p.slow++;return 'Next minigame reward +3; one slow roll.';},
  'hunter-license':()=>{profile.xp+=12;p.triviaRecruitBonus=true;return `${points(3)}, +12 XP, and increased recruitment odds after your next trivia win.`;}
 };
 if(special[it.id])msg=special[it.id]();
 else if(['steal','bomb','pushOther','swap','slowOther','eraseBoost','siphonBoost','badDie','capDie','itemRaid'].includes(it.kind)&&other.ward){other.ward--;msg=`${other.name}'s attack ward blocked ${it.name}.`;}
 else switch(it.kind){
  case 'points':msg=points(val);break;
  case 'boost':p.boost+=val;msg=`Next roll +${val}.`;break;
  case 'trailGear':p.boost+=2;p.shields++;msg='Travel tool cashed in: next roll +2 and one shield. The tool is consumed; it no longer opens obstacle paths.';break;
  case 'rollDouble':p.rollDouble=(p.rollDouble||0)+1;if(it.id==='mega-mushroom'){p.large=Math.max(p.large,2);p.largeStart=run.turn;}if(it.id==='time-chamber-pass')p.slowAfterRoll=(p.slowAfterRoll||0)+1;msg=it.desc;break;
  case 'slowOther':other.slow+=val;msg=`${other.name}'s next ${val===1?'roll is':val+' rolls are'} halved.`;break;
  case 'ward':p.ward=(p.ward||0)+val;msg=`Block the next ${val} opponent item attacks.`;break;
  case 'insurance':p.ward=(p.ward||0)+1;p.shields+=2;msg='One attack ward and two point-penalty shields.';break;
  case 'rollFloor':p.rollFloor=Math.max(p.rollFloor||0,val);msg=`This turn's base die will be at least ${val}.`;break;
  case 'eraseBoost':other.boost=0;other.rollDouble=0;other.triple=0;other.rollFloor=0;other.rollAdvantage=0;other.rollFixed=0;msg=`${other.name}'s stored movement boosts were erased.`;break;
  case 'siphonBoost':{const amount=Math.min(3,Math.max(0,other.boost));other.boost-=amount;p.boost+=amount;msg=`Took ${amount} bonus spaces from ${other.name}.`;break;}
  case 'cleanse':clearMovementPenalties(p);p.boost+=2;msg='Movement penalties cleared; this roll +2.';break;
  case 'catchup':{const bonus=other.points>p.points?4:2;p.boost+=bonus;msg=`This roll +${bonus}${bonus===4?' because you are behind in points':''}.`;break;}
  case 'reroll':p.rerolls+=val;msg=`Gained ${val} Lucky Rolls.`;break;
  case 'bonusRisk':p.rewardBonus+=val;p.slowAfterRoll=(p.slowAfterRoll||0)+1;msg=`Next minigame reward +${val}; halve your roll after this one.`;break;
  case 'shield':p.shields+=val;msg=`${val} penalty shield${val>1?'s':''} gained.`;break;
  case 'double':p.double++;msg='Double your next winning minigame reward.';break;
  case 'steal':case 'bomb':if(other.antiSteal){other.antiSteal--;msg=`${other.name}'s Kitten Mittens blocked the steal.`;}else if(other.cloak){msg=`${other.name}'s cloak blocked the steal.`;}else{const amount=Math.min(val,other.points);const r=pointChange(other,-amount);if(!r.blocked)p.points+=amount;msg=r.blocked?`${other.name}'s shield blocked the attack.`:`${other.name} -${amount}; you +${amount}.`;}break;
  case 'healshield':msg=points(val);p.shields++;msg+=' and one shield.';break;
  case 'forward':case 'shortcut':if(it.kind==='shortcut'){profile.boards||=['Mashup'];if(!profile.boards.includes('Rainbow Road'))profile.boards.push('Rainbow Road');}advanceAlong(run,p,it.kind==='shortcut'?5:val);msg=`Moved forward ${it.kind==='shortcut'?5:val} spaces.`;break;
  case 'rewind':advanceAlong(run,p,-val);msg=`Rewound ${val} spaces.`;break;
  case 'pushOther':advanceAlong(run,other,-val);msg=`${other.name} pushed back ${val} spaces.`;break;
  case 'swap':[p.node,other.node]=[other.node,p.node];[p.visited,other.visited]=[other.visited,p.visited];msg='Board positions swapped.';break;
  case 'cloak':p.cloak+=val;msg=`Protected from penalties for ${val} turns.`;break;
  case 'extraTurn':p.extra=true;msg='One extra turn after this one.';break;
  case 'statusTriple':p.triple=(p.triple||0)+val;msg=`Triple movement for ${val} rolls.`;break;
  case 'preview':p.mapRevealed=true;p.rerolls++;msg='Current realm revealed; one reroll gained.';break;
  case 'trap':run.traps||=[];run.traps.push({node:p.node,owner:run.current});msg='Trap planted. An opponent landing here loses 5 points.';break;
  case 'randomItem':case 'multiply':{const drop=it.kind==='multiply'&&p.items.length?findItem(pick(p.items,random)):randomItem(random,{player:p,profile,blockedIds:[it.id]});gained=gain(drop);msg=gained.message;break;}
  case 'game':case 'duel':game=resolveEncounterGame(it.value,{source:it.source,itemId:it.id});msg='A challenge has been issued.';break;
  case 'teleport':{const realm=run.board.nodes[p.node].realm;const nodes=run.board.realms[realm].ids.filter(id=>run.board.nodes[id].type!=='gate');p.visited.push(p.node);p.node=pick(nodes,random);msg='Transported to an unexpected part of this realm.';break;}
  case 'gear':{const g=it.gear||{};p.rewardBonus+=g.gameBonus||g.foodGameBonus||0;if(g.foodGameBonus)p.rewardFoodBonus=(p.rewardFoodBonus||0)+g.foodGameBonus-(g.gameBonus||g.foodGameBonus);p.slow+=g.halfTurns||0;p.triple=(p.triple||0)+(g.tripleTurns||0);if(g.recruitChance)p.recruitBonus=true;msg=itemDescription(it);break;}
  case 'music':p.points+=2;msg='+2 points. A fresh original synth groove takes over.';break;
  case 'chaos':{const n=random()<.7?5:-3;msg=points(n);if(random()<.3){p.boost+=2;msg+='; next roll +2.';}break;}
  case 'bestDie':p.rollAdvantage=(p.rollAdvantage||0)+1;msg=it.desc;break;
  case 'badDie':other.rollDisadvantage=(other.rollDisadvantage||0)+1;msg=it.desc;break;
  case 'capDie':other.rollCeiling=val;msg=it.desc;break;
  case 'reverseDie':p.rollReverse=(p.rollReverse||0)+1;msg=it.desc;break;
  case 'fixedDie':p.rollFixed=val;msg=it.desc;break;
  case 'mirrorDie':p.rollFixed=other.lastBaseRoll||4;msg=`This base die is fixed at ${p.rollFixed}${other.lastBaseRoll?' — copied from '+other.name:' — no previous opponent roll'}. Bonuses still apply.`;break;
  case 'cache':for(let n=0;n<val;n++)gain(randomItem(random,{player:p,profile,blockedIds:[it.id,...gains.map(f=>f.item.id)]}));msg=gains.map(f=>f.message).join(' ');break;
  case 'chooseSupply':gain(chosenSupply);msg=gains[0].message;break;
  case 'itemRaid':{const pool=other.items.map(findItem).filter(Boolean),fresh=pool.filter(i=>!p.items.includes(i.id)),drop=pick(fresh.length?fresh:pool,random);other.items.splice(other.items.indexOf(drop.id),1);gain(drop);msg=`Took ${drop.name} from ${other.name}. ${gains[0].message}`;break;}
  case 'clearTraps':{const realm=run.board.nodes[p.node].realm,before=run.traps?.length||0;run.traps=(run.traps||[]).filter(t=>t.owner===run.current||run.board.nodes[t.node]?.realm!==realm);p.shields++;msg=`Removed ${before-run.traps.length} hostile traps in ${realm}. One penalty shield gained.`;break;}
  case 'repairPath':{const barrier=reachableBarriers(run,p)[0];if(barrier){barrier.open=true;barrier.openUntil=0;barrier.repairs++;barrier.openedTurn=run.turn;msg=`${OBSTACLE_TYPES.find(t=>t.id===barrier.type).name} permanently repaired for both players.`;}else{p.travelPasses=(p.travelPasses||0)+1;msg='No barrier ahead needs repair. Gained one single-crossing pass instead.';}break;}
  case 'trailPass':p.travelPasses=(p.travelPasses||0)+1;msg=it.desc;break;
  case 'investment':{const deposit=Math.min(val,p.points);p.points-=deposit;(p.itemInvestments||=[]).push({dueTurn:run.turn+1,amount:deposit+2});msg=`Banked ${deposit} points safely. ${deposit+2} pays at your next personal turn, or at the expedition’s end.`;break;}
  case 'collectionBonus':msg=points(clamp(new Set(p.items).size,2,8));break;
  case 'bounty':p.bounty=(p.bounty||0)+val;msg=it.desc;break;
  case 'recruitBeacon':p.recruitGuarantee=true;msg=it.desc;break;
  case 'gateDividend':p.gateDividend=(p.gateDividend||0)+val;msg=it.desc;break;
  case 'strongTrap':run.traps ||= [];run.traps.push({node:p.node,owner:run.current,damage:val});msg=`Planted a ${val}-point trap here for your opponent.`;break;
  case 'gamble':msg=points(random()<.5?val:-Math.ceil(val/2));break;
  case 'bundle':{const e=it.effects;if(e.cleanse)clearMovementPenalties(p);if(e.points)points(e.points);for(const field of ['boost','shields','ward','cloak','rerolls','rewardBonus','slow','slowAfterRoll','rollDouble','gateDividend'])if(e[field])p[field]=(p[field]||0)+e[field];if(e.rollFloor)p.rollFloor=Math.max(p.rollFloor||0,e.rollFloor);if(e.bestDie)p.rollAdvantage=(p.rollAdvantage||0)+e.bestDie;if(e.recruitBonus)p.recruitBonus=true;if(e.giftBoost)other.boost+=e.giftBoost;msg=it.desc;break;}
  default:msg=points(3);break;
 }
 return {item:it,message:msg,game,randomGame:['game','duel'].includes(it.kind)&&!game,music:it.kind==='music',unlocked:[...new Set(gains.flatMap(f=>f.unlocked))],transformed:gains.some(f=>f.transformed),retained:gains.some(f=>f.retained),owner:gains[0]?.owner,acquisitions:gains};
}

Object.assign(exports,{ITEMS,findItem,canUseItem,rollDice,clearMovementPenalties,settleItemInvestments,reachableBarriers,rollMovement,itemDescription,randomItem,itemSupplyChoices,acquireItem,pointChange,useItemEffect});