// Collection in the console look (owner, Nov 3): big blocks you scroll through; tap a character for its page: big
// picture, every mood, its versions (e.g. Mick Foley's personas), its boss medals and tier outfits, its perk and phrase,
// and buttons to make it Player 1 / Player 2's character. Items and landmarks keep their cards inside the same shell.
// ui.js catalogHTML still builds the list and the endless feed (.catalog-grid + .catalog-more), so search/filters work.
const {store}=require("src/state.js");
const {CHARACTERS,character,characterIdentity,characterPerk}=require("src/characters.js");
const {characterPhrase}=require("src/characterPhrases.js");
const {portraitHTML,portraitMoods,brandHTML}=require("src/assets.js");
const {characterTravelSkills,TRAVEL_SKILLS}=require("src/obstacles.js");
const {availableCharacters}=require("src/profile.js");
const {BOSSES,BOSS_TIERS}=require("src/data/bosses.js");
const {escapeHTML:e}=require("src/utils.js");

const MOOD_NAME={normal:'Normal',win:'Win',think:'Thinking',silly:'Silly',angry:'Angry',sad:'Sad',walk:'Walking'};
// Who owns a character: 'SHARED', 'SEAN', 'AMBER', 'SEAN + AMBER' or '' (locked).
function ownerLabel(id){const p=store.profile,ident=characterIdentity(id);if(p.shared.some(x=>characterIdentity(x)===ident))return 'SHARED';
 return Object.entries(p.rosters).filter(([,ids])=>ids.some(x=>characterIdentity(x)===ident)).map(([o])=>o.toUpperCase()).join(' + ');}
function tileHTML(c){const own=ownerLabel(c.id);
 return `<button class="col-tile${own?'':' locked'}" data-col-char="${e(c.id)}" aria-label="${e(c.name)}${own?'':' (locked)'}"><span class="col-tile-art">${portraitHTML(c.id,'portrait col-face')}${own?'':'<span class="col-lock" aria-hidden="true">🔒</span>'}</span><span class="col-tile-name">${e(own?c.name:'???')}</span><span class="col-tile-sub">${e(own?c.source:c.source)}</span></button>`;}

function shellHTML({filter,filters,query,count,cards,more}){
 const pills=filters.map(([id,label])=>`<button class="arc-pill${id===filter?' on':''}" data-action="filter" data-id="${e(id)}">${e(label)}</button>`).join('');
 return `<main class="shell catalog-shell col-shell${filter==='items'||filter==='locations'?' col-cards':''}"><header class="mx-top"><button class="mx-icon" data-action="home" aria-label="Back to the title screen">←</button><b class="mx-brand">Collection</b><span class="mx-top-r"><span class="col-count catalog-count">${count}</span></span></header>
  <nav class="arc-pills col-pills" aria-label="Show">${pills}</nav>
  <div class="mx-search"><input id="catalog-search" type="search" value="${e(query)}" placeholder="${filter==='items'?'Search items…':filter==='locations'?'Search landmarks…':'Search names or shows…'}" aria-label="Search collection" autocomplete="off"></div>
  <div class="catalog-grid col-grid">${cards||'<p class="empty-message">Nothing discovered here yet. Explore another route.</p>'}${more?'<div class="catalog-more" aria-hidden="true"></div>':''}</div>
  <section class="col-detail" hidden aria-label="Character"></section></main>`;}

// ---- the character page ----
const det={id:null,mood:'normal'};
function bossFor(id){const ident=characterIdentity(id);return BOSSES.find(b=>b.unlockId&&characterIdentity(b.unlockId)===ident)||null;}
function versionsOf(c){const base=c.name.split(' · ')[0];return CHARACTERS.filter(x=>x.id!==c.id&&(x.name===base||x.name.startsWith(base+' · ')||c.name.startsWith(x.name+' · ')));}
function detailHTML(id){const c=character(id),own=ownerLabel(id),moods=['normal',...portraitMoods(id)],skills=characterTravelSkills(id),phrase=characterPhrase(id),boss=bossFor(id),p=store.profile;
 if(!moods.includes(det.mood))det.mood='normal';
 const tier=boss?(p.bossTiers?.[boss.id]??(p.bossesBeaten?.includes(boss.id)?0:-1)):-1;
 const versions=versionsOf(c);
 const pickBtn=i=>{const owner=i?'Amber':'Sean',ok=availableCharacters(p,owner).includes(id)||own==='SHARED';return ok?`<button class="col-btn${store.setupSelected?.[i]===id?' on':''}" data-action="pick-face" data-player="${i}" data-id="${e(id)}">${store.setupSelected?.[i]===id?`Player ${i+1}'s character ✓`:`Play as ${e(store.setupNames?.[i]||owner)}`}</button>`:'';};
 const outfits=boss?`<section class="col-sec"><h3>Boss medals &amp; outfits</h3><div class="col-strip">${BOSS_TIERS.map((t,i)=>{const got=i<=tier;return `<div class="col-fit${got?'':' locked'}" style="--tier:${i}"><span class="col-fit-art">${portraitHTML(id,'portrait col-face')}${got?'':'<span class="col-lock">🔒</span>'}</span><b>${i?e(t.name)+' look':'Classic'}</b><small>${got?(i?`${e(t.name)} cleared`:'Unlocked'):`Beat ${e(boss.name)} on ${e(t.name)}`}</small></div>`;}).join('')}</div><p class="col-fine">Tier outfits get their own art soon; the colours are stand-ins.</p></section>`:'';
 return `<header class="arc-fam-top"><button class="arc-icon mx-icon" data-col-close aria-label="Back to the Collection">←</button><div><div class="arc-src">${e(own||'NOT FOUND YET')}</div><h2 class="arc-title">${e(own?c.name:'???')}</h2></div></header>
  <div class="col-hero${own?'':' locked'}"><div class="col-hero-art">${portraitHTML(id,'portrait col-face col-big',det.mood)}</div>
   <div class="col-hero-info"><div class="mx-src">${brandHTML(c.source)}<span>${e(c.source)}</span></div>${own?`<p class="col-perk">${e(characterPerk(id))}</p>${phrase?`<blockquote class="col-phrase">“${e(phrase)}”</blockquote>`:''}${skills.length?`<div class="mx-skills">${skills.map(k=>`<span>${e(TRAVEL_SKILLS[k])}</span>`).join('')}</div>`:''}<div class="col-picks">${pickBtn(0)}${pickBtn(1)}</div>`:`<p class="col-perk">${e(c.unlockHint||'Visit related landmarks and encounters to meet them.')}</p>`}</div></div>
  ${own&&moods.length>1?`<section class="col-sec"><h3>Moods</h3><div class="col-strip">${moods.map(m=>`<button class="col-mood${m===det.mood?' on':''}" data-col-mood="${m}"><span class="col-mood-art">${portraitHTML(id,'portrait col-face',m)}</span>${MOOD_NAME[m]||m}</button>`).join('')}</div></section>`:''}
  ${outfits}
  ${versions.length?`<section class="col-sec"><h3>Other versions</h3><div class="col-strip">${versions.map(v=>{const vo=ownerLabel(v.id);return `<button class="col-ver${vo?'':' locked'}" data-col-char="${e(v.id)}"><span class="col-mood-art">${portraitHTML(v.id,'portrait col-face')}</span>${e(vo?v.name.replace(/^.* · /,''):'???')}</button>`;}).join('')}</div></section>`:''}`;}
function openDetail(id,{keepMood=false}={}){const s=document.querySelector('.col-shell .col-detail');if(!s)return;if(!keepMood&&det.id!==id)det.mood='normal';det.id=id;s.innerHTML=detailHTML(id);if(s.hidden){s.hidden=false;s.classList.remove('arc-fam-out');s.classList.remove('arc-fam-in');void s.offsetWidth;s.classList.add('arc-fam-in');}s.scrollTop=0;}
function closeDetail(){det.id=null;const s=document.querySelector('.col-shell .col-detail');if(!s)return;s.classList.add('arc-fam-out');setTimeout(()=>{if(det.id)return;s.hidden=true;s.innerHTML='';s.classList.remove('arc-fam-out');},240);}
// After a rebuild (e.g. Play as… changed the picks), reopen the page that was open.
function installCollection(){if(det.id&&document.querySelector('.col-shell'))openDetail(det.id,{keepMood:true});}
if(typeof document!=='undefined'){
 document.addEventListener('click',ev=>{
  const t=ev.target.closest?.('[data-col-char],[data-col-close],[data-col-mood]');if(!t||!t.closest('.col-shell'))return;
  if(t.dataset.colClose!==undefined)closeDetail();
  else if(t.dataset.colMood){det.mood=t.dataset.colMood;const s=document.querySelector('.col-shell .col-detail');const y=s.scrollTop;s.innerHTML=detailHTML(det.id);s.scrollTop=y;}
  else if(t.dataset.colChar)openDetail(t.dataset.colChar);
 });
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&det.id&&document.querySelector('.col-shell'))closeDetail();});
}
Object.assign(exports,{collectionTileHTML:tileHTML,collectionShellHTML:shellHTML,installCollection,ownerLabel});
