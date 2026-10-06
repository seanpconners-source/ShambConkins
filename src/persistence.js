const {validObstacles}=require("src/obstacles.js");
const PROFILE_KEY = 'shambconkins-profile-v20';
const RUN_KEY = 'shambconkins-run-v20';
const memory = new Map();
function readJSON(key, fallback = null) { try { const raw = memory.has(key)?memory.get(key):globalThis.localStorage?.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function writeJSON(key, value) { const raw=JSON.stringify(value);memory.set(key,raw);try { const storage=globalThis.localStorage;if(typeof storage?.setItem!=='function')return false;storage.setItem(key,raw);memory.delete(key);return true; } catch { return false; } }
function removeSaved(key) { memory.set(key,null);try { const storage=globalThis.localStorage;if(typeof storage?.removeItem!=='function')return;storage.removeItem(key);memory.delete(key); } catch {} }
function validRun(run) {
 if(run?.version!==20||!Array.isArray(run.players)||run.players.length!==2||!run.board?.nodes||!run.board?.realms)return false;
 if(!Number.isInteger(run.current)||run.current<0||run.current>1||!Number.isInteger(run.turn)||run.turn<1||!Number.isFinite(run.maxTurns))return false;
 if(!['board','moving','landing','event','game','result','finished'].includes(run.phase))return false;
 if(!validObstacles(run.board))return false;
 if(!['history','gameHistory','cardsSeen','triviaSeen'].every(key=>Array.isArray(run[key])))return false;
 if(!run.players.every((p,i)=>p&&typeof p.name==='string'&&typeof p.character==='string'&&p.owner===(i?'Amber':'Sean')&&run.board.nodes[p.node]&&Number.isFinite(p.points)&&p.points>=0&&['items','visited','cleared'].every(k=>Array.isArray(p[k]))&&['boost','rewardBonus','shields','double','slow','large','cloak','antiSteal','rerolls','wins'].every(k=>Number.isFinite(p[k]))))return false;
 for(const p of run.players){
  if(!['rollAdvantage','rollDisadvantage','rollCeiling','rollFixed','rollReverse','lastBaseRoll','travelPasses','bounty','gateDividend','rewardFoodBonus'].every(k=>p[k]===undefined||Number.isFinite(p[k])&&p[k]>=0))return false;
  if(p.recruitGuarantee!==undefined&&typeof p.recruitGuarantee!=='boolean')return false;
  if(p.itemInvestments!==undefined&&(!Array.isArray(p.itemInvestments)||!p.itemInvestments.every(d=>Number.isInteger(d?.dueTurn)&&d.dueTurn>=1&&Number.isFinite(d.amount)&&d.amount>0)))return false;
  if(p.itemFindHistory!==undefined&&(!Array.isArray(p.itemFindHistory)||!p.itemFindHistory.every(id=>typeof id==='string')))return false;
 }
 if(run.traps!==undefined&&(!Array.isArray(run.traps)||!run.traps.every(t=>run.board.nodes[t?.node]&&[-1,0,1].includes(t.owner)&&(t.damage===undefined||Number.isFinite(t.damage)&&t.damage>0))))return false;
 for(const node of Object.values(run.board.nodes))if(!node||typeof node.id!=='string'||!Array.isArray(node.next)||!node.next.every(id=>run.board.nodes[id])||!run.board.realms[node.realm]||![node.x,node.y,node.col,node.lane].every(Number.isFinite))return false;
 for(const realm of Object.values(run.board.realms))if(!Array.isArray(realm.ids)||!realm.ids.every(id=>run.board.nodes[id])||!run.board.nodes[realm.start]||!run.board.nodes[realm.gate])return false;
 if(run.phase==='game'&&typeof run.pending?.gameId!=='string')return false;
 if(run.phase==='result'&&(!Array.isArray(run.pending?.scores)||!Array.isArray(run.pending?.rewards)||typeof run.pending.gameId!=='string'))return false;
 if(run.phase==='moving'&&(!Number.isFinite(run.pending?.left)||run.pending.kind!=='move'))return false;
 if(run.pending?.routeDecision){const d=run.pending.routeDecision;if(run.phase!=='moving'||typeof d.targetId!=='string'||!run.board.nodes[d.from]?.next.includes(d.targetId)||d.from!==run.players[run.current].node||typeof d.applied!=='boolean'||d.applied&&(!d.result||d.result.blocked!==false))return false;}
 if(run.phase==='event'&&!['event','location','location-result','pair-intro','pair-turn','shop','boss-gate'].includes(run.pending?.kind))return false;
 if(run.pending?.kind==='pair-intro'&&(!run.pending.pair?.rule?.id||!Array.isArray(run.pending.pair.unlocked)))return false;
 if(run.pending?.kind==='pair-turn'){
  const pending=run.pending,event=pending.event;if(!event?.title)return false;
  const waiting=event.effect==='choice'&&pending.applied===false&&pending.result===null;
  if(waiting){
   if(event.owner!==run.current||event.turn!==run.turn||typeof event.key!=='string'||!Array.isArray(event.choices)||event.choices.length<2)return false;
   if(!event.choices.every(c=>typeof c.id==='string'&&typeof c.label==='string'&&typeof c.description==='string'&&c.effects&&typeof c.effects==='object'&&Number.isFinite(c.effects.cost||0)&&(c.effects.cost||0)>=0))return false;
  }else if(typeof pending.result?.skip!=='boolean')return false;
 }
 if(run.pending?.kind==='shop'&&(!Array.isArray(run.pending.stock)||!run.pending.stock.every(entry=>typeof entry.id==='string'&&Number.isFinite(entry.price)&&entry.price>0)))return false;
 return true;
}

Object.assign(exports,{PROFILE_KEY,RUN_KEY,readJSON,writeJSON,removeSaved,validRun});