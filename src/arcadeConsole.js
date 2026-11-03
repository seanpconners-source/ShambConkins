// Arcade as a console home screen (ROADMAP M1/M3/M4, owner's pick from the Nov 3 look book: "Console Home" layout,
// Clean Console colours, Neon-outline pictures, Comic lettering). One big hero for the focused game (its character
// cut out with a glowing outline, its own colour wash), category pills on top, one scrolling row of tiles at the bottom.
// Versions of one game (Broforce's 4 missions, the 3 pinball tables, every boss…) share ONE tile; its hero opens a
// version page laid out as tiles. ui.js catalogHTML still decides what is listed and how each game is played
// (`partsFor` gives the play button, info line and medals), so 1P / online / dev mode work as before.
const {ART}=require("src/data/art.js");
const {USER_PORTRAITS,isRasterArt}=require("src/data/userPortraits.js");
const {CHARACTERS}=require("src/characters.js");
const {bossById}=require("src/data/bosses.js");
const {escapeHTML:e}=require("src/utils.js");
const {store}=require("src/state.js");
const {tone}=require("src/audio.js");
const {saveProfile,toggleFavorite}=require("src/profile.js");

// Families: [key, title, subtitle, hero character, member ids]. The tile/hero uses the family; the version page lists members.
const FAMILIES=[
 ['bosses','Boss Select','Every boss you have beaten','king-kandy',null],
 ['pinball','Pinball Tables','Bucketheadland · Black Sabbath · King Gizzard','buckethead',['bucketheadland-pinball','black-sabbath-pinball','king-gizzard-pinball']],
 ['broforce','Broforce','Four missions','rambo',['broforce-jungle','broforce-desert','broforce-city','broforce-factory']],
 ['smb','Super Mario Bros.','World 1, Coin Rush, Castle Dash, SMB3','mario',['smb-world-1','smb-coin-rush','smb-castle-dash','smb3-nspade','smb3-spade-slots']],
 ['kart','Mario Kart','Grand Prix, time trials, battle','bowser',['rainbow-road-kart','kart-grand-prix-pass','kart-time-trial','rainbow-balloon-battle']],
 ['castlevania','Castlevania','NES and Symphony of the Night','alucard',['cv-symphony','cv-vampire-killer','cv-candle-hunt']],
 ['sonic','Sonic the Hedgehog','Green Hill Zone',null,['sonic-ring-rush','sonic-goal-dash']],
 ['doom','DOOM','DOOM and DOOM II',null,['doom','doom-2']],
 ['hangman','Hangman Unchained','Quick Draw, Showdown, Wanted','dj-django',['django-hangman','django-hangman-showdown','django-hangman-wanted']],
 ['invaders','Space Invaders','Solo, versus and co-op',null,['space-swarm','space-swarm-versus','space-swarm-coop']],
 ['tarantino','Tarantino Night','Seven Tarantino games','kb-the-bride',['tarantino-crazy88','kill-bill-duel','tarantino-standoff','tarantino-twist','tarantino-adrenaline','tarantino-bounty','tarantino-chase']],
 ['southpark','South Park','Dodgeball, Poofs, Kenny, snowballs','cartman',['sp-dodgeball','sp-cheesy-poofs','sp-killed-kenny','snowball-fight']],
 ['bond','007 Missions','GoldenEye and the Bond lair',null,['bond-facility','bond-laser-vault','bond-golden-gun','bond-goldfinger-bomb']],
 ['paddys',"Paddy's Pub",'Beer pong, flip cup, darts','charlie',['paddys-beer-pong','flipadelphia-cup','paddys-darts']],
 ['casino','Casino Night','Cards, wheels and dice',null,['blackjack','five-card','roulette','bond-baccarat','liars-dice']],
 ['trivia','Trivia Night','Nine quiz shows',null,['trivia-mixed','trivia-hardcore','trivia-lightning','trivia-wager','trivia-survival','trivia-sitcom','trivia-nick90','trivia-dbz','trivia-hxh']],
 ['taskmaster','Taskmaster','Six tasks',null,['taskmaster-micro-relay','taskmaster-fruit-ninja','taskmaster-sumo','task-tallest-thing','taskmaster-curling','tm-cones']],
 ['trek','Star Trek Game Night','Chess, Tri-D, Strategema, Four Lights',null,['ten-forward-chess','trek-mini-chess','strategema-grid','four-lights']],
 ['rush','Microgame Rush','Rush and Marathon',null,['microgame-rush','rush-marathon']],
 ['hyrule','The Legend of Zelda','Rupee Rush and Sword Duel',null,['hyrule-rupee-rush','hyrule-sword-duel']],
 ['clue','Clue','Whodunit and Lineup',null,['clue-whodunit','clue-lineup']],
 ['monopoly','Monopoly','Speed Die and Auction',null,['monopoly-speed-die','monopoly-auction']],
 ['chutes','Chutes and Ladders','Ladder Rush and Spinner Showdown',null,['chutes-ladder-rush','chutes-spinner-showdown']],
 ['candy','Candy Land','Gumdrop Catch and Color Card Dash',null,['candy-gumdrop-catch','candy-color-dash']],
 ['baseball','Major League','Home Run Derby and Bat & Field',null,['major-league-bats','major-league-fielding']],
 ['ducks','The Mighty Ducks','Air hockey and shootout',null,['rink-rivals','office-hockey-shootout']],
 ['matrix','The Matrix','Nine Realities and Hardline Hack','neo',['matrix-ultimate','matrix-hardline-hack']],
 ['office','The Office','Dividers and Warehouse Shift','dwight',['office-dots-boxes','warehouse-shift']],
 ['terminator','Terminator','Skynet scan and freeway chase','terminator',['terminator-scan','t800-scan-long']],
 ['pokemon','Pokémon Battles','Wild and trainer battles','pikachu',['pkmn-wild','pkmn-trainer']]];
const FAMILY=new Map(FAMILIES.map(([key,title,sub,hero,ids])=>[key,{key,title,sub,hero,ids}]));
const FAMILY_OF=new Map();for(const f of FAMILY.values())for(const id of f.ids||[])FAMILY_OF.set(id,f.key);
const familyOf=g=>g.bossId?'bosses':FAMILY_OF.get(g.id)||null;
// Arcade categories (owner, Nov 3: "make way more sense"): what a player would look for, not the engine's old tags.
// A game can sit in more than one. Old filter ids (arcade/strategy/skill/sports/dice) are mapped for old links.
const CATEGORIES=[['featured','★ Featured'],['recent','Recent'],['favorites','Favorites'],['all','All games'],['action','Action'],['retro','Retro arcade'],['versus','Head to head'],['sports','Racing & sports'],['board','Board & cards'],['puzzle','Puzzle'],['party','Party'],['trivia','Trivia & shows'],['casino','Casino & dice'],['pinball','Pinball'],['coop','Co-op'],['boss','Bosses'],['pokemon','Pokémon'],['variants','Encounter variants']];
const CAT_IDS={
 action:'broforce-jungle broforce-factory broforce-city broforce-desert smb-world-1 smb-coin-rush smb-castle-dash cv-vampire-killer cv-candle-hunt cv-symphony sonic-ring-rush sonic-goal-dash doom doom-2 warriors-brawl bond-facility hyrule-rupee-rush hyrule-sword-duel tarantino-crazy88 tarantino-bounty kill-bill-duel living-dead-horde battle-royale-island raiders-ball-run',
 retro:'pong-duel breakout-party asteroid-drift space-swarm space-swarm-versus space-swarm-coop snake-run pac-maze-duel moonraker-lander mars-missile-defense duck-hunt-turn crossy-chaos block-battle t800-scan-long driller-duel bubble-battle flappy-disaster paper-route banana-money-grab metal-gear-tank-duel derezzed-cycles snake-v-snake bomber-duel sewer-clash neon-ball-storm smb-world-1 cv-vampire-killer doom',
 sports:'rainbow-road-kart kart-grand-prix-pass kart-time-trial rainbow-balloon-battle fast-quarter-mile radical-bike major-league-bats major-league-fielding league-penalties baseketball-shootout color-of-money happy-gilmore-golf kingpin-bowling underdog-dodgeball fight-night wind-archery disc-duel rink-rivals office-hockey-shootout taskmaster-curling sp-dodgeball',
 board:'shamb-uno traitors-guess-who matrix-ultimate greed-island-mancala deadite-checkers ten-forward-chess office-dots-boxes wopr-grid trek-mini-chess strategema-grid four-lights battleship-fog clue-whodunit clue-lineup monopoly-speed-die monopoly-auction chutes-ladder-rush chutes-spinner-showdown candy-color-dash smb3-nspade full-shambyahtzee',
 puzzle:'megatouch-photohunt brawndo-fruit-merge warehouse-shift matrix-hardline-hack alien-sonar-grid paddys-hole bricks-breaker-quest tm-cones simon-faceoff django-hangman django-hangman-showdown django-hangman-wanted bubble-battle block-battle',
 party:'taskmaster-micro-relay taskmaster-fruit-ninja taskmaster-sumo task-tallest-thing taskmaster-curling tm-cones microgame-rush rush-marathon review-pancakes newlywed-spirit roast-battle draw-it kitchen-service paddys-beer-pong flipadelphia-cup paddys-darts terminator-scan hungry-hungry-heads home-alone-paint-can angry-heads gopher-hunt tarantino-twist tarantino-adrenaline tarantino-standoff tarantino-chase bond-laser-vault bond-golden-gun bond-goldfinger-bomb sp-cheesy-poofs sp-killed-kenny snowball-fight candy-gumdrop-catch smb3-spade-slots',
 trivia:'price-bid-off newlywed-spirit',
 casino:'blackjack five-card roulette bond-baccarat liars-dice full-shambyahtzee',
 pinball:'bucketheadland-pinball black-sabbath-pinball king-gizzard-pinball',
 coop:'living-dead-horde space-swarm-coop rainbow-rivals'};
const CAT_OF=new Map();for(const [cat,ids] of Object.entries(CAT_IDS))for(const id of ids.split(' '))(CAT_OF.get(id)||CAT_OF.set(id,new Set()).get(id)).add(cat);
const BASE={puzzle:'puzzle',strategy:'board',skill:'party',sports:'sports',trivia:'trivia',casino:'casino',dice:'casino',duel:'versus',coop:'coop',arcade:'retro'};
const OLD={arcade:'retro',strategy:'board',skill:'party',dice:'casino'};
function categoriesOf(g){const out=new Set(CAT_OF.get(g.id)||[]);if(g.category==='duel'||g.engine==='trivia')out.add(BASE[g.category]);if(!out.size&&BASE[g.category])out.add(BASE[g.category]);if(g.category==='coop'||g.cooperative)out.add('coop');return out;}
const inCategory=(g,cat)=>cat==='all'||categoriesOf(g).has(OLD[cat]||cat);
const CAT_NAME=Object.fromEntries(CATEGORIES);

// Characters picked by hand where the source match would choose someone odd.
const HERO={'bucketheadland-pinball':'buckethead','black-sabbath-pinball':'ozzy-osbourne','cv-symphony':'alucard','kill-bill-duel':'kb-the-bride','tarantino-crazy88':'kb-the-bride','tarantino-bounty':'dj-django','pac-maze-duel':'pac-man','pkmn-wild':'pikachu','pkmn-trainer':'ash-ketchum','paddys-beer-pong':'charlie','flipadelphia-cup':'charlie','terminator-scan':'terminator','t800-scan-long':'terminator','matrix-hardline-hack':'neo','evil-dead-cabin':'ash','django-hangman':'dj-django','django-hangman-showdown':'dj-king-schultz','django-hangman-wanted':'dj-django','sewer-clash':'leonardo-tmnt','snake-run':'snake','shred-hero':'buckethead','king-gizzard-pinball':'ref-stumackenzie','deadite-checkers':'ash','tarantino-chase':'dp-stuntman-mike','tarantino-adrenaline':'pf-vincent','tarantino-twist':'pf-jules','tarantino-standoff':'pf-jules'};

// ---- pictures ----
const own=id=>{const u=id&&USER_PORTRAITS['photo:char:'+id];return isRasterArt(u)?u:null;};
const norm=s=>String(s||'').toLowerCase().replace(/^the /,'').replace(/[^a-z0-9]+/g,'');
let bySource=null;
function sourceIndex(){if(bySource)return bySource;bySource=new Map();for(const c of CHARACTERS){if(!own(c.id))continue;const k=norm(c.source);if(!k)continue;if(!bySource.has(k))bySource.set(k,[]);bySource.get(k).push(c.id);}return bySource;}
const heroCache=new Map();
function heroId(g){
 if(heroCache.has(g.id))return heroCache.get(g.id);
 let id=HERO[g.id]&&own(HERO[g.id])?HERO[g.id]:null;
 if(!id&&g.bossId){const b=bossById(g.bossId);for(const c of [b?.unlockId,g.bossId])if(own(c)){id=c;break;}}
 if(!id){const k=norm(g.source),idx=sourceIndex();const hit=idx.get(k)||[...idx.entries()].find(([s])=>k.length>3&&s.length>3&&(s.startsWith(k)||k.startsWith(s)))?.[1];if(hit?.length)id=hit[Math.abs(hash(g.id))%hit.length];}
 if(!id){const f=FAMILY.get(familyOf(g));if(f&&own(f.hero))id=f.hero;}
 heroCache.set(g.id,id||null);return id||null;
}
function hash(s){let h=0;for(const ch of String(s))h=(h*31+ch.charCodeAt(0))|0;return h;}
const hue=s=>((hash(norm(s))%360)+360)%360;
// The cut-out with the neon outline; games without a character fall back to their own art, then their icon.
// Owner's own tile art wins: assets/tiles/<game id>.webp, or <family key>.webp for a family tile.
const dropArt=(kind,k)=>{const u=k&&USER_PORTRAITS[kind+':'+k];return u&&(isRasterArt(u)||/^data:image\/svg|\.svg$/i.test(u))?u:null;};
const tileArt=k=>dropArt('tile',k);
// Key art: a big picture for the hero (assets/keyart/<game id or family key>.*), shown full-bleed behind the selected game.
const keyArt=it=>it&&(dropArt('keyart',it.fam?.key)||dropArt('keyart',it.g?.id));
function art(g,{fam=null,size=''}={}){
 const drop=tileArt(fam?.key)||tileArt(g?.id);if(drop)return `<img class="arc-cut arc-drop${size}" src="${e(drop)}" alt="" loading="lazy" draggable="false">`;
 const cid=fam?.hero&&own(fam.hero)?fam.hero:g?.id?heroId(g):null;
 if(cid)return `<img class="arc-cut${size}" src="${e(own(cid))}" alt="" loading="lazy" draggable="false">`;
 const gameArt=g&&g.id!=='wopr-grid'&&ART[`game:${g.id}`];
 if(gameArt)return `<img class="arc-card-art${size}" src="${e(gameArt)}" alt="" loading="lazy" draggable="false">`;
 return `<span class="arc-emoji${size}" aria-hidden="true">${e(g?.icon||'🎮')}</span>`;
}

// ---- the screen ----
const state={focus:null,family:null,grid:false};
let current=null;
// opts: {list, partsFor(g), filter, filters:[[id,label]], query, strip (1P/online strip HTML), devStrip, extraBosses}
function arcadeConsoleHTML(opts){
 const {list,filter,filters,query,strip,devStrip}=opts;const grouped=!query&&filter==='all'; // families only on the main list; categories, bosses and search list every game
 const items=[],seen=new Set();
 for(const g of list){const fk=grouped&&familyOf(g);
  if(fk){const members=list.filter(x=>familyOf(x)===fk);if(members.length>1||fk==='bosses'){if(!seen.has(fk)){seen.add(fk);items.push({key:'f:'+fk,fam:FAMILY.get(fk),members,g:members[0]});}continue;}}
  items.push({key:'g:'+g.id,g});}
 current={...opts,items};
 let at=items.findIndex(it=>it.key===state.focus);if(at<0){at=0;state.focus=items[0]?.key||null;}
 const pills=filters.map(([id,label])=>`<button class="arc-pill${id===filter?' on':''}" data-action="filter" data-id="${e(id)}">${e(label)}</button>`).join('');
 const tiles=items.map((it,i)=>tileHTML(it,i,i===at)).join('');const root0=items[at];
 return `<main class="arcade-console${root0&&keyArt(root0)?' has-key':''}" style="${heroVars(items[at])}"><div class="arc-wash" aria-hidden="true"></div>
  <div class="arc-keyart" aria-hidden="true">${items[at]&&keyArt(items[at])?`<div class="arc-layer"><img src="${e(keyArt(items[at]))}" alt=""></div>`:''}</div>
  <div class="arc-hero-art" aria-hidden="true">${items[at]&&!keyArt(items[at])?`<div class="arc-layer">${heroArt(items[at])}</div>`:''}</div><div class="arc-shade" aria-hidden="true"></div>
  <header class="arc-top"><button class="arc-icon" data-action="home" aria-label="Back to the title screen">←</button><b class="arc-brand">Arcade</b>
   <span class="arc-top-r"><button class="arc-icon" data-action="arcade-random" aria-label="Random game" title="Random game">🎲</button><button class="arc-icon arc-search-btn${query?' on':''}" data-arc-search aria-label="Search games">⌕</button></span></header>
  <div class="arc-search"${query?'':' hidden'}><input id="catalog-search" type="search" value="${e(query)}" placeholder="Search games or shows…" aria-label="Search games" autocomplete="off"></div>
  <nav class="arc-pills" aria-label="Game categories">${pills}</nav>
  <div class="arc-strip">${strip||''}</div>
  <section class="arc-info arc-info-in" aria-live="polite">${items[at]?infoHTML(items[at]):`<p class="arc-empty">${query?'Nothing here yet. Try another category.':filter==='recent'?'The games you play will show up here.':filter==='favorites'?'Tap ☆ on any game to keep it here.':'Nothing here yet. Try another category.'}</p>`}</section>
  <div class="arc-row-head"><span class="arc-row-label">${e(filters.find(f=>f[0]===filter)?.[1]||'Games')} · ${items.length}</span>${items.length>1?'<button class="arc-viewall" data-arc-all>View all ▸</button>':''}</div>
  <div class="arc-row" role="listbox" aria-label="Games">${tiles}</div>
  ${devStrip?`<div class="arc-dev">${devStrip}</div>`:''}
  <section class="arc-grid-page"${state.grid?'':' hidden'} aria-label="All games">${state.grid?gridHTML():''}</section>
  <section class="arc-fam"${state.family?'':' hidden'} aria-label="Versions">${state.family?familyHTML(state.family):''}</section></main>`;
}
function heroVars(it){const g=it?.g,h=hue(it?.fam?.title||g?.source||'');return `--arc-h:${h}`;}
function heroArt(it){return art(it.g,{fam:it.fam,size:' big'});}
function tileHTML(it,i,on){const g=it.g,locked=!it.fam&&!current.partsFor(g).open;
 return `<button class="arc-tile${on?' on':''}${locked?' locked':''}" role="option" aria-selected="${on}" data-arc-focus="${i}" style="--arc-h:${hue(it.fam?.title||g.source)};--i:${Math.min(i,14)}" aria-label="${e(it.fam?.title||g.title)}">${art(g,{fam:it.fam})}${it.fam?`<span class="arc-count">×${it.fam.key==='bosses'?bossTotal():it.members.length}</span>`:''}${locked?'<span class="arc-lock" aria-hidden="true">🔒</span>':''}</button>`;}
function bossTotal(){return (current.extraBosses||[]).length+current.items.find(x=>x.fam?.key==='bosses')?.members.length||0;}
function infoHTML(it){
 if(it.fam){const f=it.fam,n=f.key==='bosses'?bossTotal():it.members.length,played=it.members.filter(g=>store.profile.played.includes(g.id)).length;
  return `<div class="arc-src">${e(f.sub)}</div><h2 class="arc-title">${e(f.title)}</h2><div class="arc-chips"><span>${n} ${f.key==='bosses'?'bosses':'versions'}</span>${played?`<span>${played} played</span>`:''}${f.key==='bosses'?`<span>${it.members.length} beaten</span>`:''}</div>
   <p class="arc-rules">${e(it.members.slice(0,6).map(g=>shortTitle(g,f)).join(' · '))}${it.members.length>6?' …':''}</p>
   <div class="arc-actions"><button class="arc-cta" data-arc-family="${e(f.key)}">Choose a version ▸</button></div>`;}
 const g=it.g,p=current.partsFor(g);
 return `<div class="arc-src">${e(g.source)} · ${e(catName(g))}</div><h2 class="arc-title">${e(g.title)}</h2><div class="arc-chips">${p.chips.map(c=>`<span>${c}</span>`).join('')}</div>
  <p class="arc-rules">${e(g.rules||'')}</p><div class="arc-actions">${quick(p.play)}${starHTML(g)}${p.dev||''}</div>`;
}
// The ☆ next to a game's play button keeps it on the Favorites shelf.
function starHTML(g){const on=(store.profile.favorites||[]).includes(g.id);return `<button class="arc-star${on?' on':''}" data-arc-star="${e(g.id)}" aria-pressed="${on}" aria-label="${on?'Remove from favorites':'Add to favorites'}">${on?'★':'☆'}</button>`;}
// The console's Play buttons start the game at once (no Start/Back card; app.js passes quick to requestGame).
const quick=html=>String(html).replace(/data-action="arcade-(game|solo)"/,'data-quick="1" data-action="arcade-$1"');
const catName=g=>g.bossId?'Boss':g.pokemon?'Pokémon':[...categoriesOf(g)].map(c=>CAT_NAME[c]).filter(Boolean)[0]||'Game';
function shortTitle(g,f){const t=g.title.replace(/^Boss · /,'');const parts=t.split(' · ');return parts.length>1&&norm(parts[0]).includes(norm(f.title).slice(0,5))?parts.slice(1).join(' · '):t.replace(/^Broforce: /,'');}
function familyHTML(key){const f=FAMILY.get(key);if(!f||!current)return '';
 let members=current.list.filter(g=>familyOf(g)===key);if(key==='bosses')members=[...members,...(current.extraBosses||[])];
 const cards=members.map((g,i)=>{const p=current.partsFor(g);return `<article class="arc-ver${p.open?'':' locked'}" style="--arc-h:${hue(g.source)};--i:${Math.min(i,12)}"><div class="arc-ver-art">${dropArt('keyart',g.id)&&!tileArt(g.id)?`<img class="arc-card-art" src="${e(dropArt('keyart',g.id))}" alt="" loading="lazy">`:art(g)}${p.open?'':'<span class="arc-lock" aria-hidden="true">🔒</span>'}</div>
  <div class="arc-ver-body"><h3>${e(shortTitle(g,f))}</h3><div class="arc-chips small">${p.chips.map(c=>`<span>${c}</span>`).join('')}</div><p>${e(g.rules||'')}</p><div class="arc-actions">${quick(p.play)}${starHTML(g)}${p.dev||''}</div></div></article>`;}).join('');
 return `<header class="arc-fam-top"><button class="arc-icon" data-arc-close aria-label="Back to the Arcade">←</button><div><div class="arc-src">${e(f.sub)}</div><h2 class="arc-title">${e(f.title)}</h2></div></header>
  <div class="arc-fam-hero" aria-hidden="true">${art(members[0]||{},{fam:f,size:' big'})}</div><div class="arc-ver-grid">${cards}</div>`;}

// Focus a tile without rebuilding the screen (fast, keeps the row's scroll position).
// "View all": every tile of the current list as big blocks you scroll through (owner, Nov 3).
function gridHTML(){if(!current)return '';const lab=current.filters.find(f=>f[0]===current.filter)?.[1]||'Games';
 return `<header class="arc-fam-top"><button class="arc-icon" data-arc-grid-close aria-label="Back to the Arcade">←</button><div><div class="arc-src">${current.items.length} ${current.items.length===1?'game':'tiles'}</div><h2 class="arc-title">${e(lab)}</h2></div></header>
  <div class="arc-block-grid">${current.items.map((it,i)=>{const g=it.g,locked=!it.fam&&!current.partsFor(g).open;
   return `<button class="arc-block${locked?' locked':''}" data-arc-pick="${i}" style="--arc-h:${hue(it.fam?.title||g.source)};--i:${Math.min(i,16)}"><span class="arc-block-art">${art(g,{fam:it.fam})}${it.fam?`<span class="arc-count">×${it.fam.key==='bosses'?bossTotal():it.members.length}</span>`:''}${locked?'<span class="arc-lock" aria-hidden="true">🔒</span>':''}</span><span class="arc-block-name">${e(it.fam?.title||g.title)}</span><span class="arc-block-sub">${e(it.fam?it.fam.sub:catName(g))}</span></button>`;}).join('')}</div>`;}
function openGrid(){const root=document.querySelector('.arcade-console');if(!root)return;state.grid=true;const s=root.querySelector('.arc-grid-page');s.classList.remove('arc-fam-out');s.innerHTML=gridHTML();s.hidden=false;s.scrollTop=0;restart(s,'arc-fam-in');}
function closeGrid(){state.grid=false;const s=document.querySelector('.arcade-console .arc-grid-page');if(!s)return;if(matchMedia('(prefers-reduced-motion: reduce)').matches){s.hidden=true;s.innerHTML='';return;}s.classList.add('arc-fam-out');setTimeout(()=>{if(state.grid)return;s.hidden=true;s.innerHTML='';s.classList.remove('arc-fam-out');},260);}
// Swap a picture layer: the new one slides/fades in while the old one fades out (direction follows the tile row).
function swapLayer(box,html){if(!box)return;const old=[...box.children];old.forEach(o=>{o.classList.add('arc-layer-out');setTimeout(()=>o.remove(),460);});
 if(!html)return;const layer=document.createElement('div');layer.className='arc-layer arc-layer-in';layer.innerHTML=html;box.append(layer);}
function restart(el,cls){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);}
function focusTile(i,{scroll=true}={}){
 const root=document.querySelector('.arcade-console');if(!root||!current)return;const it=current.items[i];if(!it)return;
 const was=current.items.findIndex(x=>x.key===state.focus);if(was===i)return;
 state.focus=it.key;root.style.setProperty('--arc-dir',i>=was?1:-1);root.style.setProperty('--arc-h',hue(it.fam?.title||it.g.source));
 const key=keyArt(it);root.classList.toggle('has-key',!!key);
 swapLayer(root.querySelector('.arc-keyart'),key?`<img src="${e(key)}" alt="">`:'');
 swapLayer(root.querySelector('.arc-hero-art'),key?'':heroArt(it));
 const info=root.querySelector('.arc-info');info.innerHTML=infoHTML(it);restart(info,'arc-info-in');
 root.querySelectorAll('.arc-tile').forEach((t,j)=>{t.classList.toggle('on',j===i);t.setAttribute('aria-selected',String(j===i));});
 const tile=root.querySelectorAll('.arc-tile')[i];if(scroll&&tile)tile.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',inline:'center',block:'nearest'});
 if(store.profile?.settings.sound)tone(660+((i%5)*40),.05,.02,'triangle');
}
function openFamily(key){const root=document.querySelector('.arcade-console');if(!root)return;state.family=key;const s=root.querySelector('.arc-fam');s.classList.remove('arc-fam-out');s.innerHTML=familyHTML(key);s.hidden=false;s.scrollTop=0;restart(s,'arc-fam-in');}
// Closing slides the version page away before hiding it.
function closeFamily(){state.family=null;const s=document.querySelector('.arcade-console .arc-fam');if(!s)return;if(matchMedia('(prefers-reduced-motion: reduce)').matches){s.hidden=true;s.innerHTML='';return;}s.classList.add('arc-fam-out');setTimeout(()=>{if(state.family)return;s.hidden=true;s.innerHTML='';s.classList.remove('arc-fam-out');},260);}
// After a rebuild: put the focused tile in view (no animation) and reopen the version page if one was open.
function installArcadeConsole(){const root=document.querySelector('.arcade-console');if(!root||!current)return;
 const i=current.items.findIndex(it=>it.key===state.focus);const tile=root.querySelectorAll('.arc-tile')[i];if(tile){const row=root.querySelector('.arc-row');row.scrollLeft=tile.offsetLeft-row.clientWidth/2+tile.clientWidth/2;}}
function resetArcadeConsole(){state.focus=null;state.family=null;state.grid=false;}
if(typeof document!=='undefined')document.addEventListener('click',ev=>{
 const t=ev.target.closest?.('[data-arc-focus],[data-arc-family],[data-arc-close],[data-arc-search],[data-arc-all],[data-arc-pick],[data-arc-grid-close],[data-arc-star]');if(!t||!t.closest('.arcade-console'))return;
 if(t.dataset.arcStar){const id=t.dataset.arcStar,on=toggleFavorite(store.profile,id);saveProfile(store.profile);
  document.querySelectorAll('.arcade-console [data-arc-star]').forEach(b=>{if(b.dataset.arcStar!==id)return;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'Remove from favorites':'Add to favorites');b.textContent=on?'★':'☆';});
  if(store.profile.settings.sound)tone(on?880:440,.06,.02,'triangle');return;}
 if(t.dataset.arcAll!==undefined){openGrid();return;}
 if(t.dataset.arcGridClose!==undefined){closeGrid();return;}
 if(t.dataset.arcPick!==undefined){const i=+t.dataset.arcPick,it=current?.items[i];if(!it)return;closeGrid();focusTile(i);if(it.fam)openFamily(it.fam.key);return;}
 if(t.dataset.arcFocus!==undefined){const i=+t.dataset.arcFocus;if(current?.items[i]?.key===state.focus&&current.items[i].fam)openFamily(current.items[i].fam.key);else focusTile(i);}
 else if(t.dataset.arcFamily)openFamily(t.dataset.arcFamily);
 else if(t.dataset.arcClose!==undefined)closeFamily();
 else if(t.dataset.arcSearch!==undefined){const s=document.querySelector('.arcade-console .arc-search');s.hidden=!s.hidden;if(!s.hidden)s.querySelector('input').focus();}
});
// Keyboard / controller-style browsing on desktop: left/right move the focus, Enter opens a family.
if(typeof document!=='undefined')document.addEventListener('keydown',ev=>{
 if(!document.querySelector('.arcade-console')||!current||ev.target.closest?.('input,textarea,dialog'))return;
 const i=current.items.findIndex(it=>it.key===state.focus);
 if(ev.key==='ArrowRight'||ev.key==='ArrowLeft'){ev.preventDefault();focusTile(Math.max(0,Math.min(current.items.length-1,i+(ev.key==='ArrowRight'?1:-1))));}
 else if(ev.key==='Escape'&&state.family)closeFamily();
 else if(ev.key==='Escape'&&state.grid)closeGrid();
});

// Pictures for the title screen's Arcade tile: the owner's tile icons first, then family / game character cut-outs.
function arcadeReel(n=10){const out=[];const add=u=>{if(u&&!out.includes(u))out.push(u);};
 for(const f of FAMILY.values())add(tileArt(f.key));for(const f of FAMILY.values())add(own(f.hero));
 return out.slice(0,n);}
Object.assign(exports,{arcadeReel,CATEGORIES,categoriesOf,inCategory,arcadeConsoleHTML,installArcadeConsole,resetArcadeConsole,familyOf,heroId,FAMILIES,FAMILY,keyArt,tileArt});
