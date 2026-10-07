// Level flow in the real app: the transporter card stops at the Level 1 castle door, FRANK opens Horror only after the
// Spirit boss (both players go down together), and a player in the Upside Down is pulled back before the boss drag.
import {open} from './lib.mjs';
const {browser,page,errors}=await open({viewport:{width:1100,height:700}});
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
const click=()=>page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){const b=[...d.querySelectorAll('button')].find(b=>/fight|start|continue|ok|back|welcome/i.test(b.innerText))||d.querySelector('button');b?.click();return (d.querySelector('h2,h3')?.innerText||'')+' > '+b?.innerText;}const c=document.querySelector('.level-card,.gentlemen-card,.boss-card,.smash-card');if(c){c.click();return 'card';}return null;});
const settle=async(n=40)=>{for(let i=0;i<n;i++){await page.waitForTimeout(400);await click();if(i>3&&await page.evaluate(()=>!window.ShambConkins.store.busy&&window.ShambConkins.store.run.phase==='board'&&!document.querySelector('.level-card,.gentlemen-card')&&!document.getElementById('dialog').open))return;}};
await settle();
let bad=0;const expect=(ok,msg)=>{console.log(ok?'ok  ':'FAIL',msg);if(!ok)bad++;};
// 1. Transporter card.
const t=await page.evaluate(async()=>{const S=window.ShambConkins,run=S.store.run;run.current=0;const ev=S.rareEvents.find(e=>e.effect==='body');S.resolveEvent({...ev,rare:true});return ev.title;});
await settle(15);
const r1=await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run,p=run.players[0],n=run.board.nodes[p.node];return {node:p.node,realm:n.realm,door:n.next.includes(run.board.realms.mind.gate),cleared:p.cleared};});
expect(r1.realm==='mind'&&r1.door&&!r1.cleared.includes('mind'),`${t}: lands on ${r1.node} (${r1.realm}), at the castle door`);
// 2. Spirit with Horror opened by FRANK, player 2 in the Upside Down: player 1 steps onto the Spirit gate.
await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run;run.bossesSeen={mind:true,body:true};for(const q of run.players){q.cleared=['mind','body'];q.levelsSeen=['mind','body','spirit'];q.node='spirit-start';q.visited=[];}
 S.applyEvent(run,S.store.profile,{title:'FRANK',e:['horror']});run.current=1;S.applyEvent(run,S.store.profile,{effect:'upside'});run.upsideDown.returnNode='spirit-start';
 const pre=Object.values(run.board.nodes).find(n=>n.realm==='spirit'&&n.next.includes(run.board.realms.spirit.gate));run.current=0;run.players[0].node=pre.id;run.phase='board';run.pending=null;S.store.busy=false;S.focusBoardAction(run);S.updateBoard(true);});
const r2a=await page.evaluate(()=>{const run=window.ShambConkins.store.run;return run.players.map(p=>run.board.nodes[p.node].realm);});
expect(r2a[0]==='spirit'&&r2a[1]==='upside-down',`after FRANK + Upside Down: ${r2a}`);
await page.evaluate(()=>document.querySelector('[data-action=roll]').click());
for(let i=0;i<90;i++){await page.waitForTimeout(400);await click();await page.evaluate(()=>{const s=window.ShambConkins.store.session;if(s?.debug?.killBoss){s.debug.skipIntro?.();s.debug.killBoss();}});
 if(await page.evaluate(()=>{const r=window.ShambConkins.store.run;return r.players.every(p=>r.board.nodes[p.node].realm==='horror')&&r.phase==='board'&&!window.ShambConkins.store.busy;}))break;}
await settle(10);
const r2=await page.evaluate(()=>{const r=window.ShambConkins.store.run;return {realms:r.players.map(p=>r.board.nodes[p.node].realm),nodes:r.players.map(p=>p.node),upside:r.upsideDown,finished:r.players.map(p=>!!p.finishedPlayer),seen:r.bossesSeen,over:!!r.finished,history:r.history.slice(0,8)};});
expect(r2.realms.every(x=>x==='horror')&&!r2.upside&&r2.finished.every(f=>!f)&&!r2.over,`after the Spirit boss: ${r2.nodes} ${r2.realms}`);
console.log(r2.history.join('\n'));
await page.screenshot({path:'/tmp/claude-0/levelflow-horror.png'});
console.log('errors',errors);await browser.close();process.exit(bad||errors.length?1:0);
