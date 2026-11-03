// 1-player board game: the CPU landing on a Poké Ball item space plays its own Game Boy message (soak, Nov 3: it waited for a
// tap nobody owed, the run sat on the CPU's turn). Every space on the board becomes an item space; only the human's turns get
// a bot, nothing ever taps the Game Boy on the CPU's turn. WARP=1 also checks Home works from a warp board in a 1P run.
import {open} from './lib.mjs';
let failed=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)failed++;};
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
await page.waitForSelector('.title-screen',{timeout:60000});await page.waitForFunction(()=>!document.getElementById('boot'));
const act=(name,data={})=>page.evaluate(([name,data])=>{const b=document.createElement('button');b.dataset.action=name;Object.assign(b.dataset,data);document.body.append(b);b.click();b.remove();},[name,data]);
await page.evaluate(()=>{const S=window.ShambConkins;S.store.profile.settings.reducedMotion=true;document.body.classList.add('reduced-motion');S.store.profile.settings.solo={...S.store.profile.settings.solo,on:true,level:'hard'};S.pkmn?.speed?.(8);});
await act('setup');await page.waitForSelector('.setup-shell .setup-players');await act('start-run');
await page.waitForFunction(()=>document.body.dataset.view==='board'&&!!window.ShambConkins.store.run,null,{timeout:30000});
const items=()=>page.evaluate(()=>{const n=window.ShambConkins.store.run.board.nodes;for(const k in n)if(!['start','gate','warp'].includes(n[k].type)){n[k].type='pkitem';n[k].shortcut=undefined;}});
await items();
const step=()=>page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run,dlg=document.getElementById('dialog');
 if(S.pkmn.isOpen()){if(run.current===0)S.pkmn.auto(m=>m.kind==='party'?m.list.findIndex(x=>x.hp>0):m.kind==='yesno'?1:0);return 'pkmn'+run.current;}
 if(run.current===1)S.pkmn.auto(null); // the human's autopilot must not play the CPU's Game Boy for it
 if(S.store.session){if(S.store.session.alive)S.store.session.finish([1,0],'bot');return 'game';}
 if(dlg.open){if(dlg.querySelector('.dialog-watch'))return 'watch';const b=[...dlg.querySelectorAll('button')].filter(b=>!b.disabled);(b.find(x=>x.classList.contains('primary'))||b[0])?.click();return 'dlg';}
 const go=document.querySelector('[data-action="route-go"]:not([disabled])');if(go){go.click();return 'route';}
 for(const c of document.querySelectorAll('.level-card,.boss-card,.smash-card,.gentlemen-card'))c.click();
 const roll=document.querySelector('[data-action="roll"]:not([disabled])');if(roll&&!S.store.busy&&run.current===0){roll.click();return 'roll';}return 'idle';});
const state=()=>page.evaluate(()=>{const r=window.ShambConkins.store.run;return {turn:r.turn,current:r.current,items:Object.values(r.players[1].pkbag||{}).reduce((a,b)=>a+b,0),log:(r.history||[]).filter(l=>/found|bag/i.test(l)).length};});
const t0=Date.now();let cpuGb=0,longest=0,run0=0,s0=await state(),s1=s0;
while(Date.now()-t0<90000){const s=await step();if(s==='pkmn1'){cpuGb++;run0++;longest=Math.max(longest,run0);}else run0=0;s1=await state();if(s1.turn>=s0.turn+6)break;await page.waitForTimeout(100);}
console.log('turns',s0.turn,'->',s1.turn,'CPU Game Boy ticks',cpuGb,'longest in a row',longest);
check(s1.turn>=s0.turn+6,'the run keeps going: the CPU never waits for a tap on its item message');
check(cpuGb>0,'the CPU really landed on item spaces');
if(process.env.WARP==='1'){
 await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run;run.warpsVisited=Object.keys(S.warpThemes).concat('pokemon').filter(id=>id!=='bond-lair');run.current=0;const w=Object.values(run.board.nodes).find(n=>n.type==='warp');run.players[0].node=w.id;S.updateBoard(true);S.resolveLanding();});
 for(let i=0;i<60;i++){await step();if(await page.evaluate(()=>window.ShambConkins.store.run.warp?.id==='bond-lair'&&!window.ShambConkins.store.busy))break;await page.waitForTimeout(300);}
 check(await page.evaluate(()=>window.ShambConkins.store.run.warp?.id==='bond-lair'),'in the warp');
 await act('home');await page.waitForSelector('.title-screen',{timeout:15000}).then(()=>check(true,'Home works on a warp board'),e=>check(false,'Home on a warp board: '+e.message.split('\n')[0]));
}
const errs=errors.filter(x=>!/favicon|net::|Failed to load resource/.test(x));check(!errs.length,'no page errors '+errs.slice(0,3).join(' | '));
await browser.close();console.log(failed?`${failed} problem(s)`:'SOLO CPU ITEM OK');process.exit(failed?1:0);
