// 1-player board game vs a CPU (src/cpuBoard.js) and the title screen's Choose Characters page.
// Picks are made on Choose Characters (1 Player vs CPU, a new head for Sean) and survive a reload; New Game starts a
// run with the CPU in seat 2. A bot plays the human: it rolls, picks roads and answers only dialogs that are not
// read-only; minigames are banked with random scores. Checks: the CPU rolls on its own turns while the human's roll
// button is off, CPU decisions show read-only, every board minigame is a vs-CPU / play-alone version, the CPU's roster
// owner (Amber) gains no characters, no page errors. TURNS=n (default 10); screenshots → solo-board-*.png.
import {open,screenshotPath} from './lib.mjs';
const TURNS=+process.env.TURNS||10,WHO=process.env.WHO==='1',LIMIT=+process.env.LIMIT_S||420;
let failed=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)failed++;};
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
await page.waitForSelector('.title-screen',{timeout:60000});await page.waitForFunction(()=>!document.getElementById('boot'));
const act=(name,data={})=>page.evaluate(([name,data])=>{const b=document.createElement('button');b.dataset.action=name;Object.assign(b.dataset,data);document.body.append(b);b.click();b.remove();},[name,data]);
await page.evaluate(()=>{const s=window.ShambConkins;s.pkmn?.auto?.(menu=>menu.kind==='party'?menu.list.findIndex(m=>m.hp>0):menu.kind==='yesno'?1:0);s.pkmn?.speed?.(8);s.store.profile.settings.reducedMotion=true;document.body.classList.add('reduced-motion');
 // two unlocked faces for Sean so the pick can change
 const P=s.store.profile;for(const id of ['dennis','charlie'])if(!P.rosters.Sean.includes(id))P.rosters.Sean.push(id);});

// Choose Characters from the title screen
check(await page.$('.title-screen [data-action="players"]')!==null,'the title screen has a Choose Characters button');
await page.click('.title-screen [data-action="players"]');await page.waitForSelector('.pick-shell');
await page.click('.setup-players [data-key="on"][data-value="1"]');await page.waitForSelector('.cs-panel.cs-cpu');
check(await page.$$eval('.cs-panel.cs-cpu',n=>n.length)===1,'1 Player vs CPU marks the other panel as the CPU rival');
await page.click('.setup-players [data-key="level"][data-value="hard"]');
await page.click('.cs-grid[data-player="0"] .cs-tile[data-id="dennis"]');
// WHO=1: Amber plays, the CPU wears Sean's pick (seat order: the human is always seat 1)
if(WHO)await page.click('.setup-players [data-key="who"][data-value="1"]');
await page.screenshot({path:screenshotPath('solo-board-pick.png')});
await page.click('.pick-controls [data-action="home"]');await page.waitForSelector('.title-screen');
check(/vs CPU/.test(await page.innerText('.ts-pick')),'the title screen shows the 1-player pick');
await page.screenshot({path:screenshotPath('solo-board-home.png')});
await page.reload();await page.waitForSelector('.title-screen',{timeout:60000});await page.waitForFunction(()=>!document.getElementById('boot'));
const after=await page.evaluate(()=>({sel:window.ShambConkins.store.setupSelected,solo:window.ShambConkins.store.profile.settings.solo}));
check(after.sel[0]==='dennis'&&after.solo.on&&after.solo.level==='hard','picks and the 1P setting survive a reload');
await page.evaluate(()=>{const s=window.ShambConkins;s.pkmn?.auto?.(menu=>menu.kind==='party'?menu.list.findIndex(m=>m.hp>0):menu.kind==='yesno'?1:0);s.pkmn?.speed?.(8);s.store.profile.settings.reducedMotion=true;document.body.classList.add('reduced-motion');});
const cpuOwner=WHO?'Sean':'Amber',amberBefore=await page.evaluate(o=>window.ShambConkins.store.profile.rosters[o].length,cpuOwner);

// New Game: 1P vs CPU
await act('setup');await page.waitForSelector('.setup-shell .setup-players');
check(await page.$eval('.cs-grid[data-player="0"] .cs-tile.selected',b=>b.dataset.id)==='dennis','New Game starts from the Choose Characters pick');
await page.selectOption('#run-length','12').catch(()=>{});
await page.screenshot({path:screenshotPath('solo-board-setup.png')});
await act('start-run');
await page.waitForFunction(()=>document.body.dataset.view==='board'&&!!window.ShambConkins.store.run,null,{timeout:30000});
const start=await page.evaluate(()=>{const r=window.ShambConkins.store.run;return {cpu:r.cpu,names:r.players.map(p=>p.name),chars:r.players.map(p=>p.character),owners:r.players.map(p=>p.owner)};});
check(start.cpu?.seat===1&&start.cpu.level==='hard'&&/\(CPU\)$/.test(start.names[1])&&start.chars[WHO?1:0]==='dennis'&&start.owners.join()===(WHO?'Amber,Sean':'Sean,Amber'),`the run puts the CPU in seat 2 (${start.names.join(' vs ')})`);

const stats={},games=[],titles=new Set();let badRoll=0,cpuRolls=0,lastCpuTurn=0;
const step=()=>page.evaluate(()=>{
 const SC=window.ShambConkins,store=SC.store,dlg=document.getElementById('dialog'),run=store.run;
 if(SC.pkmn.isOpen()){if(run.current===0)SC.pkmn.auto(menu=>menu.kind==='party'?menu.list.findIndex(m=>m.hp>0):menu.kind==='yesno'?1:0);return 'pkmn';}
 if(store.session){const s=store.session;if(!s.__t){s.__t=performance.now();window.__games=(window.__games||[]);window.__games.push({id:s.game.id,kind:s.solo?.kind||null,board:!!s.solo?.board});}
  if(!s.__bank&&s.alive&&performance.now()-s.__t>900){s.__bank=true;if(s.solo)s.solo.won=Math.random()<.5;s.finish([Math.floor(Math.random()*400),Math.floor(Math.random()*400)],'bot bank');return 'bank';}return 'game';}
 if(dlg.open){
  const title=dlg.querySelector('#dialog-title')?.innerText||'';
  if(dlg.querySelector('.dialog-watch'))return 'watch:'+title;
  const avoid=/Leave|Skip|Cancel|Not now|Erase|Exit|Reset|Flee|limp|Sneak|Return to board/i;
  const btns=[...dlg.querySelectorAll('button')].filter(b=>!b.disabled&&!avoid.test(b.innerText));
  if(!btns.length)return 'wait:'+title;
  const b=btns.find(b=>b.classList.contains('primary'))||btns[Math.floor(Math.random()*btns.length)];b.click();return 'dlg:'+title;
 }
 if(document.querySelector('#route-panel:not([hidden]) .rp-head small')&&document.querySelector('[data-action="route-go"][disabled]'))return 'watchroute';
 const go=document.querySelector('[data-action="route-go"]:not([disabled])');if(go){go.click();return 'route';}
 for(const c of document.querySelectorAll('.level-card,.boss-card,.smash-card,.gentlemen-card'))c.click();
 const roll=document.querySelector('[data-action="roll"]:not([disabled])');
 if(roll&&store.view==='board'&&!store.busy){if(run.current===1)return 'badroll';roll.click();return 'roll';}
 return 'idle';
});
const t0=Date.now();let last=null,stuck=0,shotWatch=false,shotTurn=false;
for(;;){
 const s=await step();const k=s.split(':')[0];stats[k]=(stats[k]||0)+1;if(k==='dlg'||k==='watch')titles.add(s.slice(k.length+1));
 if(k==='badroll')badRoll++;
 if(k==='watch'&&!shotWatch){shotWatch=true;await page.screenshot({path:screenshotPath('solo-board-cpu-dialog.png')});}
 const v=await page.evaluate(()=>{const r=window.ShambConkins.store.run;return {turn:r.turn,current:r.current,finished:!!r.finished,cpuRoll:r.players[1].rollCommittedTurn||0,label:document.querySelector('[data-action="roll"]')?.textContent||'',phase:r.phase,pending:r.pending?.kind||null};});
 if(v.cpuRoll!==lastCpuTurn&&v.cpuRoll){cpuRolls++;lastCpuTurn=v.cpuRoll;}
 if(v.current===1&&/CPU/.test(v.label)&&!shotTurn){shotTurn=true;await page.screenshot({path:screenshotPath('solo-board-cpu-turn.png')});}
 const key=JSON.stringify([s,v]);stuck=key===last?stuck+1:0;last=key;
 if(stuck>240){console.log('STUCK',s,JSON.stringify(v));await page.screenshot({path:screenshotPath('solo-board-stuck.png')});break;}
 if(v.turn>TURNS||v.finished)break;
 if((Date.now()-t0)/1000>LIMIT){console.log('time limit');break;}
 await page.waitForTimeout(150);
}
const end=await page.evaluate(o=>({turn:window.ShambConkins.store.run.turn,finished:window.ShambConkins.store.run.finished,games:window.__games||[],amber:window.ShambConkins.store.profile.rosters[o].length}),cpuOwner);
console.log('stats',JSON.stringify(stats));console.log('games',end.games.map(g=>`${g.id}:${g.kind}`).join(' '));
console.log('human answered / watched:',[...titles].slice(0,14).join(' | '));
check(end.turn>TURNS||end.finished,`the run reached turn ${end.turn} (goal ${TURNS+1})`);
check(cpuRolls>=3,`the CPU rolled on its own turns (${cpuRolls})`);
check(!badRoll,'the roll button is off on the CPU\'s turns');
check((stats.roll||0)>=3,`the human rolled on their turns (${stats.roll||0})`);
check(end.games.length>=1&&end.games.every(g=>g.board&&['cpu','alone'].includes(g.kind)),`every board minigame was a vs-CPU / play-alone version (${end.games.length})`);
check(end.amber===amberBefore,`the CPU's roster owner gained no characters (${amberBefore} → ${end.amber})`);
check((stats.watch||0)+(stats.watchroute||0)>=1,'CPU decisions were shown read-only');
// 2 Players again: a normal pass-and-play run, no CPU
await act('home');await page.waitForSelector('.title-screen');await act('setup');await page.waitForSelector('.setup-players');
await page.click('.setup-players [data-key="on"][data-value="0"]');await page.waitForFunction(()=>!document.querySelector('.cs-panel.cs-cpu'));
await act('start-run');await page.waitForFunction(()=>document.getElementById('dialog').open||document.body.dataset.view==='board');
await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog[open] button')].find(b=>/Start fresh/.test(b.innerText));b?.click();});
await page.waitForFunction(()=>window.ShambConkins.store.run&&!window.ShambConkins.store.run.cpu,null,{timeout:20000}).then(()=>check(true,'2 Players starts a run without a CPU'),()=>check(false,'2 Players starts a run without a CPU'));
check(!errors.length,'no page errors '+errors.slice(0,3).join(' | '));
await browser.close();console.log(failed?`${failed} solo board check(s) failed`:'SOLO BOARD OK');process.exit(failed?1:0);
