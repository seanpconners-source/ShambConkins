const {store}=require("src/state.js");
const {RANDOM_GAMES}=require("src/gameRegistry.js");
const {showDialog, closeDialog}=require("src/ui.js");
const {brandHTML}=require("src/assets.js");
const {shuffle, escapeHTML, wait}=require("src/utils.js");
const {sound, vibrate}=require("src/audio.js");
async function animateRoulette(selected,filter='all',themed=null){
 const pool=themed?.length?themed:RANDOM_GAMES.filter(g=>filter==='all'||g.category===filter||(filter==='taskmaster'&&g.source==='Taskmaster'));let candidates=shuffle(pool);if(candidates.length<5)candidates=[...candidates,...candidates,...candidates,...candidates,...candidates].slice(0,5);let cancelled=false;
 const dialogPromise=showDialog({title:'The next challenge…',source:'ShambConkins',html:`<div id="roulette-brand"></div><div id="roulette-title" class="roulette-title" data-final="${selected.id}"></div><div class="roulette-candidates">${candidates.slice(0,5).map((g,i)=>`<div class="roulette-candidate" data-candidate="${i}">${g.icon||'⚔'}</div>`).join('')}</div><p style="font-size:11px">The board has something planned.</p><div class="roulette-progress"><span></span></div>`,choices:[{label:'Cancel challenge',value:'cancel'}]});const activeDialog=store.dialog,current=()=>store.dialog===activeDialog;dialogPromise.then(value=>{if(value==='cancel'||value===null)cancelled=true;});
 const delays=store.profile.settings.reducedMotion?Array(9).fill(180):[...Array(16).fill(40),50,65,85,105,135,165,205,250];
 for(let i=0;i<delays.length;i++){if(cancelled||!current())return false;const game=candidates[i%candidates.length]||selected;document.getElementById('roulette-title').textContent=game.title;document.getElementById('roulette-brand').innerHTML=brandHTML(game.source);document.querySelectorAll('.roulette-candidate').forEach((n,j)=>n.classList.toggle('selected',j===i%5));sound('tick');await wait(delays[i]);}
 if(cancelled||!current())return false;document.getElementById('roulette-title').textContent=selected.title;document.getElementById('roulette-brand').innerHTML=brandHTML(selected.source);sound('win');vibrate(28);await wait(350);if(cancelled||!current())return false;closeDialog();return true;
}

Object.assign(exports,{animateRoulette});