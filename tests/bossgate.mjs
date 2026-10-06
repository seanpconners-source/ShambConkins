// Walks player 1 through the Mind gate: level win, other player dragged (-0.5/space), INCOMING BOSS, fight, both advance to Body.
import {open} from './lib.mjs';
const {browser,page,errors}=await open({viewport:{width:1100,height:700}});
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
const click=()=>page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){const b=[...d.querySelectorAll('button')].find(b=>/fight|start|continue|ok|back/i.test(b.innerText))||d.querySelector('button');b?.click();return (d.querySelector('h2')?.innerText||'')+' > '+b?.innerText;}const c=document.querySelector('.level-card,.gentlemen-card');if(c){c.click();return 'card:'+c.innerText.split('\n').slice(0,3).join(' ');}return null;});
for(let i=0;i<40;i++){await page.waitForTimeout(400);await click();if(i>12&&await page.evaluate(()=>!window.ShambConkins.store.busy&&!document.querySelector('.level-card,.gentlemen-card')&&!document.getElementById('dialog').open))break;}
const start=await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run;const pre=Object.values(run.board.nodes).find(n=>n.next.includes('mind-gate'));run.current=0;run.players[0].node=pre.id;run.players[1].points=10;S.focusBoardAction(run);S.updateBoard(true);document.querySelector('[data-action=roll]').click();return {pre:pre.id,p1:run.players[1].node};});
console.log('start',start);
const log=[];let shot=false;
for(let i=0;i<90;i++){await page.waitForTimeout(400);const r=await click();if(r)log.push(r);
 if(!shot&&await page.evaluate(()=>!!document.querySelector('.drag-banner'))){await page.screenshot({path:'/tmp/claude-0/drag.png'});shot=true;}
 const killed=await page.evaluate(()=>{const s=window.ShambConkins.store.session;if(s&&s.debug&&s.debug.killBoss){s.debug.skipIntro&&s.debug.skipIntro();s.debug.killBoss();return 1;}return 0;});if(killed)log.push('kill');
 const st=await page.evaluate(()=>{const r=window.ShambConkins.store.run;return r.players.map(p=>r.board.nodes[p.node].realm).join(',')+'|'+r.phase;});if(st.startsWith('body,body|board')&&i>5)break;}
console.log([...new Set(log)].join('\n').slice(0,1500));
console.log(await page.evaluate(()=>{const r=window.ShambConkins.store.run;return {realms:r.players.map(p=>r.board.nodes[p.node].realm),pts:r.players.map(p=>p.points),phase:r.phase,beaten:r.bossesBeaten,shared:window.ShambConkins.store.profile.shared.slice(-2)};}));
console.log('errors',errors);await browser.close();
