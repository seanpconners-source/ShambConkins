// Drives the Pokémon warp zone on autopilot: roll, walk, trainer line-of-sight battles, tall grass,
// Pokémon Center, item balls, and the Gym at the end, until the party leaves Kanto.
import {open} from './lib.mjs';
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
const click=async()=>page.evaluate(()=>{if(window.ShambConkins.pkmn.isOpen())return 0;const d=document.getElementById('dialog');if(d.open){d.querySelector('button.primary,button')?.click();return 1;}const c=document.querySelector('.level-card,.gentlemen-card');if(c){c.click();return 2;}return null;});
for(let i=0;i<30;i++){await page.waitForTimeout(300);await click();const ready=await page.evaluate(()=>!window.ShambConkins.store.busy&&!document.querySelector('.level-card,.gentlemen-card')&&!document.getElementById('dialog').open);if(ready&&i>8)break;}
await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run;S.pkmn.speed(12);
 S.pkmn.auto(menu=>{if(menu.kind==='main')return 0;if(menu.kind==='party')return menu.list.findIndex(m=>m.hp>0);if(menu.kind==='yesno')return 1;if(menu.kind==='fight')return Math.floor(Math.random()*menu.moves.length);return 0;});
 // strong team so the run reaches the gym
 run.warpsVisited=['rainbow-road','candy-land','chutes','monopoly','mario-world','clue','hyrule','green-hill','bond-lair','south-park'];window.__log=[];S.enterWarpZone(null);});
for(let i=0;i<10;i++){await page.waitForTimeout(400);await click();}
const stats={battles:0,turns:0,trainers:0};let left=false;
for(let k=0;k<1600&&!left;k++){
 await page.waitForTimeout(250);await click();
 const st=await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run;for(const p of run.players)if(p.pkmn){if(p.pkmn.team.length<6)for(const id of ['charlie','mac','dee','dennis','frank'])if(p.pkmn.team.length<6)p.pkmn.team.push({id,lvl:40,exp:64000,hp:999,pp:{}});for(const m of p.pkmn.team)if(m.lvl<40){m.lvl=40;m.exp=64000;m.hp=999;}}return {warp:run.warp?.id||null,busy:S.store.busy,open:S.pkmn.isOpen(),turn:run.turn,nodes:run.players.map(p=>p.node.replace('warp-pokemon-','')),beaten:(run.board.warp?.trainers||[]).reduce((n,t)=>n+t.beaten.length,0)};});
 if(st.open)stats.battles++;stats.trainers=Math.max(stats.trainers,st.beaten);stats.turns=st.turn;
 if(!st.warp){left=true;break;}
 if(!st.busy&&!st.open)await page.evaluate(()=>{const b=document.querySelector('[data-action=roll]');if(b&&!b.disabled)b.click();});
 if(k%150===0)console.log(JSON.stringify(st));
}
console.log('left kanto',left,JSON.stringify(stats));
console.log('errors',errors);await browser.close();process.exit(left&&!errors.length?0:1);
