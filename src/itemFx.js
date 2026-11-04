// Item use you can't miss (ROADMAP F5): a full-screen cut-in when someone uses an item on the board. The item zooms in
// over rays in its category's colour, its name slams in, then the outcome lands on each player in big numbers (points
// count up or down, faces shake when hit, "BLOCKED!" when a shield or ward stops it, status stamps like NEXT ROLL +3) and a
// plain sentence says what happened. Tap to skip; it closes by itself after ~3 s. Also the small stamps when a player
// runs into a roadblock / toll booth / coin stack (markHits). Online the other phone plays the same thing (fx).
const {store}=require("src/state.js");
const {portraitHTML,itemArtHTML}=require("src/assets.js");
const {findItem,itemTag}=require("src/items.js");
const {effectDetails}=require("src/effects.js");
const {escapeHTML:e,wait}=require("src/utils.js");
const {fx}=require("src/netHooks.js");
const {sound}=require("src/audio.js");

const TONE={'⚔':'attack','🛡':'defense','👟':'move','★':'points','🏆':'reward','🎁':'more','🎮':'game','◓':'pkmn','👥':'recruit','✦':'combo','✨':'combo'};
const toneOf=it=>TONE[[...itemTag(it)][0]]||'combo';
const reduced=()=>!!(store.profile?.settings.reducedMotion||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
function layer(){let el=document.getElementById('ifx');if(!el){el=document.createElement('div');el.id='ifx';document.body.append(el);}return el;}
// The outcome per player: {name, character, points (delta or null), stamps:[{text,tone}], blocked}
function outcome(details,message,userName,otherName){
 const rows=details.map(d=>{let points=null;const stamps=[];
  for(const t of d.tags){const m=/^([+-]\d+) points$/.exec(t.text);if(m&&points===null)points=+m[1];else stamps.push(t);}
  return {name:d.name,character:d.character||null,points,stamps:stamps.slice(0,4)};});
 // an attack a shield, cloak, ward or Kitten Mittens stopped: show it on the defender
 if(/blocked|avoided/i.test(message)&&otherName){let r=rows.find(x=>x.name===otherName);if(!r){r={name:otherName,character:null,points:null,stamps:[]};rows.push(r);}r.blocked=true;}
 return rows.filter(r=>r.points!==null||r.stamps.length||r.blocked);
}
function cutInHTML(data){
 const it=findItem(data.itemId),tone=it?toneOf(it):'combo';
 const hits=data.rows.map((r,i)=>{const face=r.character||data.faces?.[r.name];const bad=r.points<0||r.stamps.some(t=>t.tone==='bad');
  return `<div class="ifx-hit ${r.blocked?'blocked':bad?'bad':'good'}" style="--d:${.75+i*.32}s">${face?portraitHTML(face,'portrait ifx-face',r.blocked?'win':bad?'sad':'win'):''}<div class="ifx-hit-text"><b>${e(r.name)}</b>${r.points!==null?`<span class="ifx-big" data-to="${r.points}">${r.points>0?'+':''}${reduced()?r.points:0}</span><small>POINTS</small>`:''}${r.blocked?'<span class="ifx-block">🛡 BLOCKED!</span>':''}<span class="ifx-stamps">${r.stamps.map((t,k)=>`<em class="${t.tone}" style="--k:${k}">${e(t.text)}</em>`).join('')}</span></div></div>`;}).join('');
 return `<div class="ifx-card ifx-${tone}${reduced()?' still':''}" role="dialog" aria-label="${e(it?.name||'Item')}"><div class="ifx-rays"></div><div class="ifx-user">${data.user?.character?portraitHTML(data.user.character,'portrait ifx-uface'):''}<span>${e(data.user?.name||'')} uses</span></div><div class="ifx-art">${it?itemArtHTML(it):'✦'}</div><h2 class="ifx-name">${e(it?.name||'Item')}</h2><div class="ifx-tag">${e(it?itemTag(it):'')}</div><div class="ifx-hits">${hits}</div><p class="ifx-msg">${e(data.message||'')}</p><small class="ifx-tap">Tap to continue</small></div>`;
}
function countUp(root){for(const el of root.querySelectorAll('.ifx-big')){const to=+el.dataset.to,t0=performance.now()+(parseFloat(getComputedStyle(el.closest('.ifx-hit')).getPropertyValue('--d'))||0)*1000,dur=650;
 const step=now=>{if(!el.isConnected)return;const k=Math.max(0,Math.min(1,(now-t0)/dur)),v=Math.round(to*(1-Math.pow(1-k,3)));el.textContent=(v>0?'+':'')+v;if(k<1)requestAnimationFrame(step);};requestAnimationFrame(step);}}
// Plays the cut-in; resolves when it closes (tap after a moment, or by itself). data from itemCutInData.
async function playCutIn(data){
 const root=layer(),fast=reduced();root.className='ifx-on';root.innerHTML=cutInHTML(data);
 const card=root.firstElementChild;sound('whoosh');
 if(!fast){countUp(root);data.rows.forEach((r,i)=>setTimeout(()=>{if(card.isConnected)sound(r.blocked?'block':r.points>0?'coin':r.points<0||r.stamps.some(t=>t.tone==='bad')?'thud':'stamp');},(.75+i*.32)*1000));}
 const total=fast?1600:Math.max(2600,1500+data.rows.length*320+Math.min(1500,(data.message||'').length*14));
 const t0=performance.now();
 await new Promise(resolve=>{let done=false;const end=()=>{if(done)return;done=true;clearTimeout(timer);root.removeEventListener('pointerdown',tap);card.classList.add('out');setTimeout(()=>{if(root.firstElementChild===card){root.innerHTML='';root.className='';}resolve();},fast?60:220);};
  const tap=()=>{if(performance.now()-t0>450)end();};const timer=setTimeout(end,total);root.addEventListener('pointerdown',tap);root.__end=end;});
}
// From the item use (app.js useBagItem): what to show, worked out once so both phones show the same.
function itemCutInData(before,{item,message,run=store.run}){
 const p=run.players[run.current],o=run.players[1-run.current];
 const faces=Object.fromEntries(run.players.map(q=>[q.name,q.character]));
 return {itemId:item.id,message,user:{name:p.name,character:p.character},faces,rows:outcome(effectDetails(before,run),message,p.name,o?.name)};
}
async function itemCutIn(before,opts){const data=itemCutInData(before,opts);fx('itemCutIn',data);await playCutIn(data);}
// Someone ran into board marks while walking (boardMarks.js passMarks events).
const MARK={block:['🚧','ROADBLOCK!','bad'],toll:['💰','TOLL','bad'],coin:['🪙','COINS!','good']};
async function playMarkHits(data){
 for(const h of data.hits){const [icon,title,tone]=MARK[h.kind]||MARK.coin,root=layer();
  const line=h.kind==='block'?`${data.owner?.[h.owner]||'Their'}’s roadblock stops ${data.name}!`:h.kind==='toll'?(h.blocked?`${data.name} sneaks through free`:`${data.name} pays ${data.owner?.[h.owner]||'them'} ${h.amount}`):`${data.name} grabs ${h.amount} points`;
  root.className='ifx-on ifx-mini-on';root.innerHTML=`<div class="ifx-mini ${h.blocked?'good':tone}"><span class="ifx-mini-icon">${icon}</span>${data.character?portraitHTML(data.character,'portrait ifx-face',tone==='bad'&&!h.blocked?'sad':'win'):''}<b>${title}</b>${h.kind!=='block'&&!h.blocked?`<span class="ifx-big">${h.kind==='toll'?'−':'+'}${h.amount}</span>`:''}<small>${e(line)}</small></div>`;
  sound(h.kind==='coin'?'coin':h.blocked?'block':'thud');try{navigator.vibrate?.(h.kind==='block'?[40,40,90]:30);}catch{}
  await wait(reduced()?700:1300);if(root.firstElementChild?.classList.contains('ifx-mini')){root.innerHTML='';root.className='';}}
}
async function markHits(hits,p,run){const data={hits,name:p.name,character:p.character,owner:run.players.map(q=>q.name)};fx('markHits',data);await playMarkHits(data);}
Object.assign(exports,{itemCutIn,itemCutInData,playCutIn,markHits,playMarkHits});
