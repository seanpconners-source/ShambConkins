const {store}=require("src/state.js");
const {portraitHTML, itemArtHTML}=require("src/assets.js");
const {findItem}=require("src/items.js");
const {escapeHTML, wait}=require("src/utils.js");
const dots={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
let effectToken=0,effectTimer=0;
function layer(){let root=document.getElementById('fx-layer');if(!root){root=document.createElement('div');root.id='fx-layer';root.className='fx-layer';document.body.appendChild(root);}return root;}
function clearEffects(){effectToken++;clearTimeout(effectTimer);const root=document.getElementById('fx-layer');if(root){root.innerHTML='';root.className='fx-layer';}}
function diceFace(value){return `<span class="die-face" role="img" aria-label="Die ${value}">${Array.from({length:9},(_,i)=>`<i class="pip ${dots[value]?.includes(i)?'on':''}"></i>`).join('')}</span>`;}
async function animateDice({faces,base,steps,name,character,note='',valid=()=>true}){
 clearEffects();const token=effectToken,root=layer(),reduced=store.profile.settings.reducedMotion||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 root.className='fx-layer dice-stage';root.innerHTML=`<article class="roll-card"><div class="roll-player">${portraitHTML(character,'portrait mini')}<b>${escapeHTML(name)} rolls</b></div><div class="rolling-dice">${faces.map((face,i)=>`<div class="dice-cube tumbling" id="roll-cube-${i}" style="--die-delay:${i*-.11}s">${diceFace(face)}</div>`).join('')}</div><div class="roll-outcome" id="roll-outcome" aria-live="polite">Rolling…</div></article>`;
 const die=document.getElementById('die-value');die?.classList.add('rolling');
 if(!reduced)for(let frame=0;frame<14;frame++){
  if(token!==effectToken||!valid())return false;
  faces.forEach((_,i)=>{const node=document.getElementById('roll-cube-'+i);if(node)node.innerHTML=diceFace(1+(frame*5+i*3)%6);});
  if(die)die.innerHTML=diceFace(1+frame%6);await wait(46);
 }
 if(token!==effectToken||!valid())return false;
 faces.forEach((face,i)=>{const node=document.getElementById('roll-cube-'+i);if(node){node.classList.remove('tumbling');node.classList.add('landed');node.innerHTML=diceFace(face);}});
 const outcome=document.getElementById('roll-outcome');if(outcome)outcome.innerHTML=`<strong>${steps} spaces</strong><small>${faces.length>1?`Rolled ${faces.join(' + ')} · kept ${base}`:`Rolled ${base}`}${steps!==base?` · effects ${steps-base>0?'+':''}${steps-base}`:''}${note?' · '+escapeHTML(note):''}</small>`;
 if(die){die.classList.remove('rolling');die.innerHTML=diceFace(base);}
 await wait(reduced?180:330);if(token!==effectToken||!valid())return false;clearEffects();return true;
}
function effectSnapshot(run=store.run){return {acquisitionSerial:run?.itemAcquisitionSerial||0,xp:store.profile?.xp||0,players:(run?.players||[]).map(p=>({name:p.name,character:p.character,node:p.node,points:p.points,items:[...p.items],boost:p.boost,shields:p.shields,slow:p.slow,slowAfterRoll:p.slowAfterRoll,triple:p.triple,large:p.large,cloak:p.cloak,double:p.double,rewardBonus:p.rewardBonus,rerolls:p.rerolls,rollDouble:p.rollDouble,rollFloor:p.rollFloor,ward:p.ward,rollAdvantage:p.rollAdvantage,rollDisadvantage:p.rollDisadvantage,rollCeiling:p.rollCeiling,rollFixed:p.rollFixed,rollReverse:p.rollReverse,travelPasses:p.travelPasses,bounty:p.bounty,gateDividend:p.gateDividend,rewardFoodBonus:p.rewardFoodBonus,recruitGuarantee:p.recruitGuarantee,banked:(p.itemInvestments||[]).reduce((s,d)=>s+d.amount,0)}))};}
function itemTransferDrops(before,run,index){
 const p=run?.players[index];if(!p||!before)return [];const remaining=[...(before.players[index]?.items||[])],gained=[];
 for(const id of p.items){const found=remaining.indexOf(id);if(found>=0)remaining.splice(found,1);else gained.push({id,consumed:false});}
 for(const drop of run.itemAcquisitions||[])if(drop.serial>(before.acquisitionSerial||0)&&drop.player===index&&drop.consumed)gained.push({id:drop.id,consumed:true});
 return gained;
}
function animateItemTransfers(before){
 if(!before||!store.run||store.profile.settings.reducedMotion)return;
 for(let i=0;i<store.run.players.length;i++)itemTransferDrops(before,store.run,i).slice(0,4).forEach((drop,offset)=>{
  const item=findItem(drop.id);if(!item)return;const node=document.createElement('div');node.className='flying-item';node.innerHTML=itemArtHTML(item);document.body.appendChild(node);
  const panel=document.querySelector(`[data-inventory-target="${i}"]`),target=(drop.consumed?panel?.querySelector('.portrait'):panel)||panel||document.querySelector('[data-action="bag"]'),end=target?.getBoundingClientRect(),source=document.querySelector('.dialog-content .effect-emblem')?.getBoundingClientRect();
  const sx=source?source.left+source.width/2:(window.innerWidth||900)/2,sy=source?source.top+source.height/2:(window.innerHeight||800)/2,ex=end?end.left+end.width/2:sx,ey=end?end.top+end.height/2:(window.innerHeight||800)-65;
  node.style.left=(sx-32)+'px';node.style.top=(sy-32)+'px';node.animate([{transform:'scale(.7)',opacity:0},{transform:'translate(0,-20px) scale(1.15)',opacity:1,offset:.2},{transform:`translate(${ex-sx}px,${ey-sy}px) scale(.3)`,opacity:.9}],{duration:900,delay:offset*130,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});setTimeout(()=>node.remove(),1100+offset*130);
 });
}
function effectDetails(before,run=store.run){const details=[];if(!before)return details;
 for(let i=0;i<(run?.players.length||0);i++){const p=run.players[i],old=before.players[i];if(!old)continue;const tags=[];
  const delta=p.points-old.points;if(delta)tags.push({text:`${delta>0?'+':''}${delta} points`,tone:delta>0?'good':'bad'});
  if(p.node!==old.node)tags.push({text:'Moved to a new space',tone:'move'});
  if(p.character!==old.character)tags.push({text:'Character changed',tone:'move'});
  const status=[['boost','Next roll'],['shields','Shields'],['slow','Slow rolls'],['slowAfterRoll','Following slow rolls'],['triple','Triple rolls'],['rollDouble','Double rolls'],['rollFloor','Minimum die'],['ward','Attack wards'],['large','Giant turns'],['cloak','Cloak turns'],['double','Double reward'],['rewardBonus','Game reward'],['rerolls','Lucky rolls'],['rollAdvantage','Better dice'],['rollDisadvantage','Lower-die jinx'],['rollCeiling','Die ceiling'],['rollFixed','Fixed die'],['rollReverse','Reverse die'],['travelPasses','Crossing passes'],['bounty','Next game bounty'],['gateDividend','Next gate bonus'],['rewardFoodBonus','Food game bonus']];
  for(const[key,label]of status){const n=(p[key]||0)-(old[key]||0);if(n)tags.push({text:`${label} ${n>0?'+':''}${n}`,tone:['slow','slowAfterRoll','rollDisadvantage','rollCeiling'].includes(key)&&n>0||n<0?'bad':'good'});}
  if(p.recruitGuarantee&&!old.recruitGuarantee)tags.push({text:'Guaranteed recruit on next board win',tone:'good'});const banked=(p.itemInvestments||[]).reduce((s,d)=>s+d.amount,0);if(banked!==old.banked)tags.push({text:banked?'Banked payout: '+banked:'Investment paid',tone:'good'});
  const remaining=[...old.items];for(const id of p.items){const previous=remaining.indexOf(id);if(previous>=0)remaining.splice(previous,1);else tags.push({text:`Found ${findItem(id)?.name||'an item'}`,tone:'good'});}
  if(tags.length)details.push({name:p.name,character:p.character,tags});
 }
 const xp=(store.profile?.xp||0)-before.xp;if(xp)details.push({name:'Collection',tags:[{text:`+${xp} XP saved`,tone:'good'}]});return details;
}
function effectHTML(before,{icon='✦',item=null}={}){const details=effectDetails(before);return `<div class="outcome-fx"><div class="effect-emblem">${item?itemArtHTML(item):escapeHTML(icon)}</div>${details.map(d=>`<div class="effect-player">${d.character?portraitHTML(d.character,'portrait tiny'):''}<div><b>${escapeHTML(d.name)}</b><div class="effect-tags">${d.tags.map(t=>`<span class="effect-tag ${t.tone}">${escapeHTML(t.text)}</span>`).join('')}</div></div></div>`).join('')}</div>`;}
function boardFeedback(before,{title='Something changed',icon='✦',item=null}={}){if(store.view!=='board')return;clearEffects();const root=layer();root.className='fx-layer brief-stage';root.innerHTML=`<article class="board-feedback"><strong>${escapeHTML(title)}</strong>${effectHTML(before,{icon,item})}</article>`;const token=effectToken;effectTimer=setTimeout(()=>{if(token===effectToken)clearEffects();},store.profile.settings.reducedMotion?500:1150);}
function turnFeedback(player){clearEffects();const root=layer();root.className='fx-layer turn-stage';root.innerHTML=`<div class="turn-banner">${portraitHTML(player.character,'portrait mini')}<span>${escapeHTML(player.name)}’s turn</span></div>`;const token=effectToken;effectTimer=setTimeout(()=>{if(token===effectToken)clearEffects();},store.profile.settings.reducedMotion?300:1000);}

Object.assign(exports,{clearEffects,diceFace,animateDice,effectSnapshot,itemTransferDrops,animateItemTransfers,effectDetails,effectHTML,boardFeedback,turnFeedback});