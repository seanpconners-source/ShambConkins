const {weighted}=require("src/utils.js");
// Shared by supplies, themed encounters and shops. Selecting never grants or
// records an item: only the actual acquisition changes discovery history.
function itemDropFamily(item){return ['game','duel'].includes(item.kind)?'challenge':item.kind==='bundle'?'bundle:'+item.role:item.kind;}
function selectItemDrop(items,{random=Math.random,player=null,profile=null,recent=[],blockedIds=[]}={}){
 const blocked=new Set(blockedIds),unique=new Map(items.filter(Boolean).map(i=>[i.id,i]));
 let pool=[...unique.values()].filter(i=>!blocked.has(i.id));if(!pool.length)return null;
 const bag=new Set(player?.items||[]),notHeld=pool.filter(i=>!bag.has(i.id));if(notHeld.length)pool=notHeld;
 const history=[...(player?.itemFindHistory||[]),...(profile?.recentItemFinds?.[player?.owner]||[]),...recent];
 // Small themed pools also cycle: relax the oldest exclusion only when needed.
 const limit=Math.min(12,pool.length-1);for(let n=limit;n>0;n--){const seen=new Set(history.slice(-n)),fresh=pool.filter(i=>!seen.has(i.id));if(fresh.length){pool=fresh;break;}}
 const found=new Set(profile?.itemFinds?.[player?.owner]||profile?.itemsSeen||[]),newItems=pool.filter(i=>!found.has(i.id));if(newItems.length)pool=newItems;
 const byId=new Map(items.filter(Boolean).map(i=>[i.id,i])),lastFamilies=new Set(history.slice(-3).map(id=>byId.get(id)).filter(Boolean).map(itemDropFamily));
 const different=pool.filter(i=>!lastFamilies.has(itemDropFamily(i)));if(different.length)pool=different;
 // Normalize within each mechanic so dozens of vouchers or shields do not
 // bury a smaller effect family. Rarity weights still apply within a family.
 const totals=new Map();for(const i of pool){const f=itemDropFamily(i);totals.set(f,(totals.get(f)||0)+(i.findWeight||1));}
 const preference={challenge:.8,gear:.8,music:.4,transform:.75};
 return weighted(pool,()=>{const v=Number(random());return Number.isFinite(v)?Math.min(1-Number.EPSILON,Math.max(0,v)):0;},i=>(i.findWeight||1)/totals.get(itemDropFamily(i))*(preference[itemDropFamily(i)]||1));
}
function selectItemStock(items,context={},count=3){
 const chosen=[];for(let n=0;n<count;n++){const item=selectItemDrop(items,{...context,blockedIds:[...(context.blockedIds||[]),...chosen.map(i=>i.id)],recent:[...(context.recent||[]),...chosen.map(i=>i.id)]});if(!item)break;chosen.push(item);}return chosen;
}
function rememberItemFind(profile,player,id){
 player.itemFindHistory=[...(player.itemFindHistory||[]),id].slice(-32);
 if(!profile)return;profile.itemsSeen ||= [];if(!profile.itemsSeen.includes(id))profile.itemsSeen.push(id);
 profile.itemFinds ||= {Sean:[],Amber:[]};const found=profile.itemFinds[player.owner] ||= [];if(!found.includes(id))found.push(id);
 profile.recentItemFinds ||= {Sean:[],Amber:[]};profile.recentItemFinds[player.owner]=[...(profile.recentItemFinds[player.owner]||[]),id].slice(-32);
}

Object.assign(exports,{itemDropFamily,selectItemDrop,selectItemStock,rememberItemFind});