// Warp zone ending works like a level gate: first player to the end, the other is dragged to the boss (-0.5/space),
// INCOMING BOSS, co-op fight, then both return to the main map.
import {open} from './lib.mjs';
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
const click=()=>page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){const b=[...d.querySelectorAll('button')].find(b=>/fight|jump|start|continue|ok|back/i.test(b.innerText))||d.querySelector('button');b?.click();return (d.querySelector('h2')?.innerText||'')+' > '+b?.innerText;}const c=document.querySelector('.level-card,.gentlemen-card');if(c){c.click();return 'card';}return '';});
const idle=()=>page.evaluate(()=>!window.ShambConkins.store.busy&&!document.querySelector('.level-card,.gentlemen-card,.warp-fx')&&!document.getElementById('dialog').open);
for(let i=0;i<40;i++){await page.waitForTimeout(400);await click();if(i>12&&await idle())break;}
await page.evaluate(()=>{const S=window.ShambConkins;S.store.run.warpsVisited=['pokemon'];S.enterWarpZone();});
for(let i=0;i<40;i++){await page.waitForTimeout(400);await click();if(i>4&&await idle()&&await page.evaluate(()=>window.ShambConkins.store.run.board.format==='warp'))break;}
const start=await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run,b=run.board,gate=b.realms.warp.gate,pre=Object.values(b.nodes).find(n=>n.next.includes(gate));run.current=0;run.players[0].node=pre.id;run.players[1].node=b.realms.warp.start;run.players[1].points=20;S.focusBoardAction(run);S.updateBoard(true);return {warp:b.warp.id,boss:b.warp.bossId,pre:pre.id,gate};});
console.log('start',start);
if(start.warp==='pokemon'){console.log('Kanto has its own gym ending; rerun');await browser.close();process.exit(0);}
await page.evaluate(()=>document.querySelector('[data-action=roll]').click());
const log=[];let drag=false,bossCard=false,pts=[];
for(let i=0;i<120;i++){await page.waitForTimeout(350);const r=await click();if(r)log.push(r);
 const st=await page.evaluate(()=>({drag:!!document.querySelector('.drag-banner'),card:!!document.querySelector('.boss-card'),pts:window.ShambConkins.store.run.players.map(p=>p.points)}));
 if(st.drag&&!drag){drag=true;await page.screenshot({path:'/tmp/claude-0/sc/warpboss-drag.png'});}if(st.card)bossCard=true;if(st.drag)pts.push(st.pts[1]);
 await page.evaluate(()=>{const s=window.ShambConkins.store.session;if(s?.debug?.killBoss){s.debug.skipIntro?.();s.debug.killBoss();}});
 if(i>5&&await page.evaluate(()=>window.ShambConkins.store.run.board.format!=='warp'&&!window.ShambConkins.store.run.warp))break;}
await page.waitForTimeout(2500);for(let i=0;i<6;i++){await click();await page.waitForTimeout(300);}
const end=await page.evaluate(()=>{const r=window.ShambConkins.store.run;return {format:r.board.format,warp:r.warp,bossGate:r.bossGate,pts:r.players.map(p=>p.points),beaten:r.bossesBeaten,phase:r.phase};});
console.log([...new Set(log)].join('\n'));console.log('drag',drag,'bossCard',bossCard,'P2 points while dragged',[...new Set(pts)].join(' → '));console.log('end',JSON.stringify(end));
const ok=drag&&bossCard&&end.format!=='warp'&&!end.bossGate&&(end.beaten||[]).includes(start.boss)&&errors.length===0;
console.log('errors',errors);console.log(ok?'OK':'FAIL');await browser.close();process.exit(ok?0:1);
