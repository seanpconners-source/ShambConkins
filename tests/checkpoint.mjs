// Checkpoints (ROADMAP C8/E4): once a level is reached, New Game can start there: both players at that level's start,
// earlier levels cleared, empty bags; a Level IV start opens Horror and plays the short Frank reveal.
// SHAMB_URL=... node tests/checkpoint.mjs
import {open, screenshotPath} from './lib.mjs';
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
let bad=0;const expect=(ok,msg)=>{console.log(ok?'ok  ':'FAIL',msg);if(!ok)bad++;};
const click=()=>page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){(d.querySelector('button.primary')||d.querySelector('button'))?.click();return 1;}const c=document.querySelector('.level-card,.gentlemen-card,.boss-card,.smash-card');if(c){c.click();return 1;}return 0;});
async function start(level){await page.evaluate(()=>{window.ShambConkins.store.profile.levelReached=4;});
 await page.evaluate(()=>{const b=document.createElement('button');b.dataset.action='setup';document.body.append(b);b.click();b.remove();});await page.waitForTimeout(500);
 const opts=await page.evaluate(()=>[...document.querySelectorAll('[data-ng-level]')].map(o=>o.dataset.ngLevel));
 await page.click(`[data-ng-level="${level}"]`);await page.click('[data-action=start-run]');
 let sawReveal=false;for(let i=0;i<40;i++){await page.waitForTimeout(350);if(await page.$('#frank-reveal'))sawReveal=true;await click();if(i>(level==='horror'?28:4)&&await page.evaluate(()=>!window.ShambConkins.store.busy&&window.ShambConkins.store.run?.phase==='board'&&!document.getElementById('dialog').open&&!document.querySelector('#frank-reveal,.level-card')))break;}
 const r=await page.evaluate(()=>{const run=window.ShambConkins.store.run;return {realms:run.players.map(p=>run.board.nodes[p.node].realm),cleared:run.players.map(p=>p.cleared.join('+')),items:run.players.map(p=>p.items.length),horror:!!run.horror};});
 return {opts,sawReveal,...r};}
const a=await start('spirit');
expect(a.opts.join()==='mind,body,spirit,horror','START AT lists every level reached');
expect(a.realms.every(x=>x==='spirit')&&a.cleared.every(c=>c==='mind+body')&&a.items.every(n=>n===0),`Level III start: ${a.realms} cleared ${a.cleared} items ${a.items}`);
await page.screenshot({path:screenshotPath('checkpoint-spirit.png')});
const b=await start('horror');
expect(b.realms.every(x=>x==='horror')&&b.horror,`Level IV start: ${b.realms}`);
expect(b.sawReveal,'Level IV start plays the short Frank reveal');
expect(errors.length===0,'no page errors '+errors.join(' | '));
await browser.close();process.exit(bad?1:0);
