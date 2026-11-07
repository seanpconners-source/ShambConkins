// Character Select and New Game in the console look (owner, Nov 3: "professional, polished, coherent with the Arcade";
// characters are chosen ONLY on Character Select, New Game is about the game). app.js keeps doing the work: the same
// data-actions (choose-character, solo-set, start-run, setup, players…) and the same field ids (player-name-N, run-seed,
// board-theme, game-mode, start-level, team-mate-N) as before, so saves, picks, 1P vs CPU and online setup are unchanged.
const {store}=require("src/state.js");
const {character,characterPerk,differentCharacters}=require("src/characters.js");
const {availableCharacters}=require("src/profile.js");
const {portraitHTML,portraitURL,brandHTML}=require("src/assets.js");
const {characterTravelSkills,TRAVEL_SKILLS}=require("src/obstacles.js");
const {soloSettings}=require("src/solo.js");
const {netState}=require("src/net.js");
const {pairForCharacters}=require("src/pairs.js");
const {escapeHTML:e}=require("src/utils.js");

const ui={active:0,mode:null,level:null,query:'',board:'main',warp:null};
const btn=(action,text,cls='',extra='')=>`<button class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
const MOODS=['normal','win','think','silly','angry','sad','walk'];
function moodsOf(id){const seen=new Set(),out=[];for(const m of MOODS){const u=portraitURL(id,m)||m;if(seen.has(u))continue;seen.add(u);out.push(m);}return out;}
const face=(id,cls='')=>portraitHTML(id,`portrait mx-face ${cls}`);
function topBar(title,back,right=''){return `<header class="mx-top"><button class="mx-icon" data-action="${back}" aria-label="Back">←</button><b class="mx-brand">${e(title)}</b><span class="mx-top-r">${right}</span></header>`;}
const ownerOf=i=>i?'Amber':'Sean';

// ---------- Character Select (view 'players') ----------
// Two player slots on top (tap one to pick for it), its roster below as big blocks, search. On phones one roster shows
// at a time; on wide screens both sit side by side. 1P vs CPU: the other slot is the CPU rival's head.
function charSelectHTML(names,selected,{strip=''}={}){
 const ns=store.netSetup,solo=!ns&&soloSettings(store.profile).on,s=soloSettings(store.profile);
 const mine=i=>!ns||i===ns.me;
 if(ns)ui.active=ns.me;
 const panels=[0,1].map(i=>{
  const c=character(selected[i]),cpu=solo&&s.who!==i,remote=!mine(i),list=remote?[]:availableCharacters(store.profile,ownerOf(i)),skills=characterTravelSkills(c.id),moods=moodsOf(c.id);
  const tiles=list.map(id=>{const other=!differentCharacters(id,selected[1-i]),on=selected[i]===id,ch=character(id);
   return `<button class="cs-tile mx-tile ${on?'selected':''} ${other?'taken':''}" data-action="choose-character" data-player="${i}" data-id="${e(id)}" data-name="${e((ch.name+' '+ch.source).toLowerCase())}" aria-pressed="${on}" ${other?'disabled title="Chosen by the other player"':''}><span class="mx-tile-art">${face(id)}</span><span class="mx-tile-name">${e(ch.name)}</span>${other?`<i class="mx-taken">P${2-i}</i>`:''}${on?'<i class="mx-check" aria-hidden="true">✓</i>':''}</button>`;}).join('');
  const label=cpu?`CPU RIVAL · ${ownerOf(i).toUpperCase()}’S ROSTER`:remote?`PLAYER ${i+1} · ON THE OTHER PHONE`:`PLAYER ${i+1} · ${ownerOf(i).toUpperCase()}’S ROSTER`;
  const nameField=cpu?`<b class="mx-slot-name">${e(c.name.split(' ')[0])} (CPU)</b>`:remote?`<b class="mx-slot-name">${e(names[i])}</b>`:`<input id="player-name-${i}" class="mx-name" maxlength="28" value="${e(names[i])}" aria-label="Player ${i+1} name">`;
  return `<section class="cs-panel p${i+1}${cpu?' cs-cpu':''}${remote?' cs-remote':''}${ui.active===i?' on':''}" data-cs-slot="${i}" aria-label="${cpu?'CPU rival':`Player ${i+1}`}">
   <div class="mx-slot" data-cs-pick="${i}" role="button" tabindex="0" aria-label="Pick for ${cpu?'the CPU':`player ${i+1}`}">
    <div class="mx-slot-art cs-stage" data-cycle="${moods.length}"><div class="mx-glow"></div>${moods.map((m,k)=>`<span class="cs-face ${k?'':'on'}" data-mood-name="${m}">${portraitHTML(c.id,'portrait mx-face mx-big',m)}</span>`).join('')}<div class="mx-slot-top" title="${e(label)}"><span class="mx-badge">${cpu?'CPU':`P${i+1}`}</span>${nameField}</div></div>
    <div class="mx-slot-info">
     <h3 class="mx-char">${e(c.name)}</h3><div class="mx-src">${brandHTML(c.source)}<span>${e(c.source)}</span></div>
     <p class="mx-perk">${e(characterPerk(c.id))}</p>${skills.length?`<div class="mx-skills">${skills.map(k=>`<span>${e(TRAVEL_SKILLS[k])}</span>`).join('')}</div>`:''}</div>
   </div>
   ${remote?`<p class="mx-remote-note">${e(names[i])} picks on their phone.</p>`:`<div class="mx-grid-head"><span>${list.length} unlocked</span></div><div class="cs-grid mx-grid" data-player="${i}" aria-label="${ownerOf(i)}'s roster">${tiles}</div>`}
  </section>`;});
 return `<main class="shell setup-shell pick-shell mx-shell mx-chars${ns?' net-setup':''}">${topBar('Characters','players-done',btn('players-done','Done','mx-done'))}
  ${ns?`<p class="mx-note">🌐 Online · room ${e(netState().room||'')} · pick your character; the other phone picks theirs.</p>`:`<div class="mx-strip">${strip}</div>`}
  <div class="mx-search"><input id="cs-search" type="search" value="${e(ui.query)}" placeholder="Search characters or shows…" aria-label="Search characters" autocomplete="off"></div>
  <div class="mx-panels">${panels.join('')}</div>
  <div class="pick-controls mx-foot">${btn('players-done','Done ✓','mx-cta')}</div></main>`;
}

// ---------- New Game (view 'setup') ----------
const MODES={versus:['Versus','Race to the end of Level III (or IV). Win minigames, grab items, beat each level’s boss.','⚔️'],horror:['Horror expedition','Straight onto the horror board, once you have found it.','🩸'],team:['Team Relay','Each player brings a teammate who takes turns with them.','🤝'],coop:['Co-op vs Mario + Luigi','Team up and race the plumbers in every game.','🍄']};
const LEVELS=[['mind','Level I','Mind'],['body','Level II','Body'],['spirit','Level III','Spirit'],['horror','Level IV','Horror']];
function newGameHTML(names,selected,{strip='',pair=null,warps=[]}={}){
 const p=store.profile,ns=store.netSetup,guest=ns?.role==='guest',lock=guest?' disabled':'',solo=!ns&&soloSettings(p).on,s=soloSettings(p),peer=ns?names[ns.peer]:'';
 // Versus is the only mode (owner, Nov 7: the Mode card is gone); a hidden field keeps startRun's reading of it.
 const reached=Math.max(1,Math.min(4,p.levelReached||1));if(!LEVELS.slice(0,reached).some(l=>l[0]===ui.level))ui.level='mind';
 const card=i=>{const c=character(selected[i]),cpu=solo&&s.who!==i,remote=ns&&i===ns.peer;
  const moods=moodsOf(c.id);
  return `<article class="mx-pcard p${i+1}"><div class="mx-pcard-art cs-stage" data-cycle="${moods.length}">${moods.map((m,k)=>`<span class="cs-face ${k?'':'on'}" data-mood-name="${m}">${portraitHTML(c.id,'portrait mx-face mx-big',m)}</span>`).join('')}</div><div class="mx-pcard-info"><span class="mx-badge">${cpu?'CPU':`P${i+1}`}</span><b>${e(cpu?`${c.name.split(' ')[0]} (CPU)`:names[i])}</b><span class="mx-char">${e(c.name)}</span><small>${remote?'picks on their phone':cpu?'CPU rival':`${ownerOf(i)}’s roster`}</small></div></article>`;};

 // Board: Main Board or one of the warp boards found so far (radio pair + a picker). A warp start skips Start at.
 if(!warps.some(w=>w.id===ui.warp))ui.warp=warps[0]?.id||null;if(!ui.warp)ui.board='main';const warpOn=ui.board==='warp';
 const boardSec=`<section class="mx-sec mx-boardsec"><h3>Board</h3><div class="mx-board" role="radiogroup" aria-label="Board">
  <button class="mx-bchoice${warpOn?'':' on'}" data-ng-board="main" role="radio" aria-checked="${!warpOn}"${lock}>Main Board</button>
  <button class="mx-bchoice${warpOn?' on':''}" data-ng-board="warp" role="radio" aria-checked="${warpOn}"${warps.length?lock:' disabled title="Find a warp pipe on the main board first"'}>Warp Zones</button>
  <select id="start-warp" aria-label="Warp board"${warps.length?lock:' disabled'}>${warps.length?warps.map(w=>`<option value="${e(w.id)}"${w.id===ui.warp?' selected':''}>${e(w.icon+' '+w.title)}</option>`).join(''):'<option>None found yet</option>'}</select>
  <input type="hidden" id="board-kind" value="${warpOn?'warp':'main'}"><input type="hidden" id="board-theme" value="Mashup"><input type="hidden" id="game-mode" value="versus"></div></section>`;
 const levels=reached>1?`<section class="mx-sec mx-levelsec${warpOn?' off':''}"><h3>Start at</h3><div class="mx-levels">${LEVELS.slice(0,reached).map(([id,n,name])=>`<button class="mx-level${ui.level===id?' on':''}" data-ng-level="${id}"${lock||(warpOn?' disabled':'')} aria-pressed="${ui.level===id}"><b>${n}</b><span>${name}</span></button>`).join('')}</div><input type="hidden" id="start-level" value="${ui.level}"></section>`:'';
 const start=guest?`<button class="mx-cta" disabled>Waiting for ${e(peer)} to start…</button>`:btn('start-run',ns?'Start on both phones ▸':'Start ▸','mx-cta');
 return `<main class="shell setup-shell mx-shell mx-newgame${ns?' net-setup':''}"><div class="mx-ng">${topBar('New Game','home')}
  ${ns?`<p class="mx-note">🌐 Online · room ${e(netState().room||'')}${guest?` · ${e(peer)} starts the game`:''}</p>`:''}
  <section class="mx-sec mx-players"><div class="mx-sec-head"><h3>Players</h3>${btn('players','Change characters ▸','mx-link')}</div><div class="mx-pcards">${card(0)}<span class="mx-vs">VS</span>${card(1)}</div>${ns?'':`<div class="mx-strip">${strip}</div>`}${pair?`<div class="mx-pair">✦ ${e(pair.title)} · ${e(pair.description)}</div>`:''}</section>
  <div class="mx-opts">${boardSec}
  ${levels}
  <p class="mx-fine">${solo?'You play every minigame against the CPU; only your roster collects new characters.':'A fresh route every run. Unlocks and XP carry forward. Both players take part in every minigame.'}</p>
  <div class="mx-foot setup-controls">${start}</div></div></div></main>`;
}

// Mode / level cards and the character search work in place (no rebuild), so a refresh keeps the choice (ui.*).
if(typeof document!=='undefined'){
 document.addEventListener('click',ev=>{
  const m=ev.target.closest?.('[data-ng-mode]');if(m&&!m.disabled){ui.mode=m.dataset.ngMode;document.getElementById('game-mode').value=ui.mode;document.querySelectorAll('[data-ng-mode]').forEach(b=>{b.classList.toggle('on',b===m);b.setAttribute('aria-pressed',String(b===m));});const t=document.querySelector('.mx-team');if(t){t.hidden=ui.mode!=='team';fitNewGame();}return;}
  const bd=ev.target.closest?.('[data-ng-board]');if(bd&&!bd.disabled){setBoard(bd.dataset.ngBoard);return;}
  const l=ev.target.closest?.('[data-ng-level]');if(l&&!l.disabled){ui.level=l.dataset.ngLevel;document.getElementById('start-level').value=ui.level;document.querySelectorAll('[data-ng-level]').forEach(b=>{b.classList.toggle('on',b===l);b.setAttribute('aria-pressed',String(b===l));});return;}
  const slot=ev.target.closest?.('[data-cs-pick]');if(slot&&!ev.target.closest('input')){setActive(+slot.dataset.csPick);}
 });
 document.addEventListener('change',ev=>{if(ev.target.id!=='start-warp')return;ui.warp=ev.target.value;setBoard('warp');});
 document.addEventListener('input',ev=>{if(ev.target.id!=='cs-search')return;ui.query=ev.target.value;filterTiles();});
}
// Main Board / Warp Zones: a radio pair; Warp Zones greys out Start at (a warp run starts on the warp board).
function setBoard(kind){ui.board=kind;const warp=kind==='warp';document.querySelectorAll('[data-ng-board]').forEach(b=>{const on=b.dataset.ngBoard===kind;b.classList.toggle('on',on);b.setAttribute('aria-checked',String(on));});
 const k=document.getElementById('board-kind');if(k)k.value=kind;const sec=document.querySelector('.mx-levelsec');if(sec){sec.classList.toggle('off',warp);const guest=store.netSetup?.role==='guest';sec.querySelectorAll('[data-ng-level]').forEach(b=>{b.disabled=warp||guest;});}}
function setActive(i){const sec=document.querySelector(`.mx-chars [data-cs-slot="${i}"]`);if(!sec||sec.classList.contains('cs-remote'))return;ui.active=i;document.querySelectorAll('.mx-chars [data-cs-slot]').forEach(s=>s.classList.toggle('on',+s.dataset.csSlot===i));}
function filterTiles(){const q=ui.query.trim().toLowerCase();document.querySelectorAll('.mx-chars .mx-tile').forEach(t=>{t.hidden=!!q&&!t.dataset.name.includes(q);});}
// After a rebuild: the picked player's roster stays in front, the search still applies.
function installMenuScreens(view,player){if(view==='players'){if(player!=null)ui.active=player;setActive(ui.active);filterTiles();}if(view==='setup')fitNewGame();}
// New Game never scrolls (owner, Nov 6: buttons were off screen with no way to reach them): the layout is a column that
// fills the screen, the player pictures take whatever height is left, and if it still doesn't fit we first drop the
// extras (mode descriptions, fine print, smaller gaps: .mx-tight, then .mx-tighter) and finally zoom the whole page down.
// The zoom sits on the inner .mx-ng (viewport.js resets zoom on the <main> after every DOM change).
let fitQueued=false;
function fitNewGame(){
 const box=document.querySelector('.mx-newgame'),ng=box?.querySelector('.mx-ng');if(!ng)return;
 box.classList.remove('mx-tight','mx-tighter');ng.style.setProperty('--mx-k','1');
 const over=()=>ng.scrollHeight>ng.clientHeight+1||ng.scrollWidth>ng.clientWidth+1;
 if(over())box.classList.add('mx-tight');
 if(over())box.classList.add('mx-tighter');
 let k=1;
 for(let i=0;i<4&&over();i++){k=Math.max(.45,k*Math.min(ng.clientHeight/ng.scrollHeight,ng.clientWidth/ng.scrollWidth)*.99);ng.style.setProperty('--mx-k',k.toFixed(3));}
}
function queueFit(){if(fitQueued)return;fitQueued=true;requestAnimationFrame(()=>{fitQueued=false;if(store.view==='setup')fitNewGame();});}
if(typeof window!=='undefined'){window.addEventListener('resize',queueFit);window.addEventListener('orientationchange',queueFit);window.visualViewport?.addEventListener('resize',queueFit);document.fonts?.ready?.then(queueFit);}
function menuState(){return ui;}

Object.assign(exports,{charSelectHTML,newGameHTML,installMenuScreens,menuState});
