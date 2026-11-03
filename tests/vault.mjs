// Minigame vault: Boss fights filter (beaten bosses playable, others locked), and the two Pokémon battle entries
// run a real Game Boy battle outside an expedition and return to the vault.
import {open} from './lib.mjs';
const out=process.env.OUT||'/tmp/claude-0/sc';
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
const act=v=>page.evaluate(v=>{const b=document.createElement('button');b.dataset.action=v;document.body.append(b);b.click();b.remove();},v);
await page.evaluate(()=>{window.ShambConkins.store.profile.bossesBeaten=['biff-tannen'];});
await act('arcade');await page.waitForTimeout(300);
// console Arcade (src/arcadeConsole.js): category pills, one tile per game, the focused game's buttons in the hero
const pill=id=>page.click(`.arc-pill[data-id="${id}"]`).then(()=>page.waitForTimeout(300));
const search=async q=>{await page.evaluate(q=>{const i=document.getElementById('catalog-search');i.value=q;i.dispatchEvent(new Event('input',{bubbles:true}));},q);await page.waitForTimeout(250);};
const focus=re=>page.evaluate(src=>{const t=[...document.querySelectorAll('.arc-tile')].find(t=>new RegExp(src).test(t.getAttribute('aria-label')));t?.click();return !!t;},re.source);
await pill('boss');
const boss=await page.evaluate(()=>({cards:document.querySelectorAll('.arc-tile').length,open:[...document.querySelectorAll('.arc-tile:not(.locked)')].map(t=>t.getAttribute('aria-label')),locked:document.querySelectorAll('.arc-tile.locked').length,label:document.querySelector('.arc-pill.on').textContent}));
console.log('boss filter',JSON.stringify(boss));await page.screenshot({path:`${out}/vault-boss.png`});
let bad=0;if(boss.open.length!==1||!/Biff/.test(boss.open[0])){console.log('FAIL: expected only Biff unlocked');bad++;}
await pill('all');
await search('biff');
const inAll=await page.evaluate(()=>[...document.querySelectorAll('.arc-tile')].map(t=>t.getAttribute('aria-label')));console.log('All + "biff":',inAll);if(!inAll.some(t=>/Biff/.test(t))){console.log('FAIL: beaten boss missing from All');bad++;}
await search('');await pill('pokemon');
await page.screenshot({path:`${out}/vault-pokemon.png`});
for(const kind of ['wild','trainer']){
 await page.evaluate(()=>{const S=window.ShambConkins;S.pkmn.speed(12);S.pkmn.auto(menu=>{if(menu.kind==='main')return 0;if(menu.kind==='party')return menu.list.findIndex(m=>m.hp>0);if(menu.kind==='yesno')return 1;return 0;});});
 await focus(kind==='wild'?/Wild/:/Trainer/);await page.waitForTimeout(200);
 await page.click(`.arc-info [data-action=arcade-pokemon][data-id=${kind}]`);await page.waitForTimeout(300);
 await page.click('#dialog button.primary');
 let opened=false,done=false;
 for(let i=0;i<240;i++){await page.waitForTimeout(250);const st=await page.evaluate(()=>({open:window.ShambConkins.pkmn.isOpen(),dialog:document.getElementById('dialog').open,busy:window.ShambConkins.store.busy,view:window.ShambConkins.store.view}));
  if(st.open)opened=true;if(st.dialog&&opened)await page.evaluate(()=>document.querySelector('#dialog button')?.click());
  if(opened&&!st.open&&!st.busy&&!st.dialog){done=st.view;break;}}
 console.log(kind,'battle opened',opened,'back in',done);if(!opened||done!=='arcade')bad++;
}
console.log('errors',errors);if(errors.length)bad++;
await browser.close();console.log(bad?'FAIL':'OK');process.exit(bad?1:0);
