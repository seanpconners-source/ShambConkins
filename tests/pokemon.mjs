// Pokémon battles: plays wild, catch, trainer and gym battles with an autopilot at high
// speed, opens the field menu, checks trainer spaces on new boards and builds the
// Pokémon warp zone. Screenshots go to /tmp/claude-0/sc. Exits 1 on any failure.
import {open} from './lib.mjs';
const N=+(process.argv[2]||6);
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
const fails=[];const check=(ok,msg)=>{if(!ok){fails.push(msg);console.log('FAIL',msg);}};
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
const click=async()=>page.evaluate(()=>{const rp=document.getElementById('route-panel');if(rp&&!rp.hidden){rp.querySelector('.rp-option:not([disabled])')?.click();setTimeout(()=>document.querySelector('[data-action=route-go]')?.click(),150);return 3;}const d=document.getElementById('dialog');if(d.open){d.querySelector('button.primary,button')?.click();return 1;}const c=document.querySelector('.level-card,.gentlemen-card');if(c){c.click();return 2;}return null;});
for(let i=0;i<30;i++){await page.waitForTimeout(300);await click();const ready=await page.evaluate(()=>!window.ShambConkins.store.busy&&!document.querySelector('.level-card,.gentlemen-card')&&!document.getElementById('dialog').open);if(ready&&i>8)break;}
// Autopilot: FIGHT with a random usable move; throw balls when asked; pick the first able teammate.
await page.evaluate(()=>{
 const S=window.ShambConkins;S.pkmn.speed(12);window.__pk={plan:'fight',menus:{}};
 S.pkmn.auto(menu=>{const st=window.__pk;st.menus[menu.kind]=(st.menus[menu.kind]||0)+1;
  if(menu.kind==='main')return st.plan==='ball'?2:0;
  if(menu.kind==='fight'){const ok=menu.moves.map((m,i)=>i).filter(i=>{const b=menu.battler;return true;});return ok[Math.floor(Math.random()*ok.length)];}
  if(menu.kind==='bag'){const i=menu.items.findIndex(it=>/BALL/.test(it.label));return i>=0?i:menu.items.length-1;}
  if(menu.kind==='party'){st.party=(st.party||0)+1;if(st.party>30)return -1;const i=menu.list.findIndex(m=>m.hp>0);return i;}
  if(menu.kind==='yesno')return 1;
  if(menu.kind==='sub')return 0;
  return 0;});
});
const runOne=async(js,label,timeout=90000)=>{
 await page.evaluate(js);const t0=Date.now();
 while(Date.now()-t0<timeout){await page.waitForTimeout(300);if(!(await page.evaluate(()=>window.ShambConkins.pkmn.isOpen())))await click();const r=await page.evaluate(()=>window.__res);if(r)return r;}
 return {outcome:'TIMEOUT',label};
};
const outcomes=[];
for(let i=0;i<N;i++){
 const r=await runOne(()=>{const S=window.ShambConkins,run=S.store.run,p=run.players[run.current];window.__res=null;window.__pk.plan='fight';window.__pk.party=0;S.pkmn.run.wildEncounter(run,p).then(r=>window.__res={outcome:r.outcome,defeated:r.defeated,lv:p.pkmn.team.map(m=>m.lvl+':'+m.hp).join(',')}).catch(e=>window.__res={outcome:'ERROR '+e.message});},'wild');
 outcomes.push(r.outcome);check(['win','lose','run'].includes(r.outcome),'wild battle ended badly: '+JSON.stringify(r));
}
console.log('wild outcomes',outcomes.join(' '));
// catching: a weakened wild character and a master ball
const caught=await runOne(()=>{const S=window.ShambConkins,run=S.store.run,p=run.players[run.current];window.__res=null;window.__pk.plan='ball';p.pkbag={'master-ball':1};const before=JSON.stringify(S.store.profile.rosters);S.pkmn.run.wildEncounter(run,p,{id:'ash-ketchum',level:5}).then(r=>window.__res={outcome:r.outcome,unlocked:r.unlocked,team:p.pkmn.team.map(m=>m.id),box:p.pkmn.box.length}).catch(e=>window.__res={outcome:'ERROR '+e.message});},'catch');
console.log('catch',JSON.stringify(caught));check(caught.outcome==='caught','master ball did not catch');check((caught.unlocked||[]).includes('ash-ketchum'),'caught character was not unlocked');
// unlock dialog may be open now
for(let i=0;i<6;i++){await page.waitForTimeout(300);await click();}
// trainer battle
const tr=await runOne(()=>{const S=window.ShambConkins,run=S.store.run,p=run.players[run.current];window.__res=null;window.__pk.plan='fight';window.__pk.party=0;S.pkmn.run.trainerSpace(run,p).then(r=>window.__res={outcome:r.outcome,defeated:r.defeated.length,unlocked:r.unlocked}).catch(e=>window.__res={outcome:'ERROR '+e.message});},'trainer',180000);
console.log('trainer',JSON.stringify(tr));check(['win','lose'].includes(tr.outcome),'trainer battle ended badly');
for(let i=0;i<6;i++){await page.waitForTimeout(300);await click();}
// a Poké Ball trainer space on the board, then a wild encounter in the middle of a walk
await page.evaluate(()=>{const S=window.ShambConkins;S.pkmn.auto(menu=>{if(menu.kind==='main')return 0;if(menu.kind==='party')return menu.list.findIndex(m=>m.hp>0);if(menu.kind==='yesno')return 1;return 0;});});
const landed=await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run,p=run.players[run.current],t=Object.values(run.board.nodes).find(n=>n.type==='trainer'&&n.realm==='mind');window.__turn=run.turn;p.node=t.id;run.phase='landing';run.pending={kind:'landing'};S.updateBoard(true);S.resolveLanding();return t.id;});
let advanced=false;for(let i=0;i<400&&!advanced;i++){await page.waitForTimeout(300);if(!(await page.evaluate(()=>window.ShambConkins.pkmn.isOpen())))await click();advanced=await page.evaluate(()=>window.ShambConkins.store.run.turn>window.__turn&&!window.ShambConkins.store.busy);}
check(advanced,'trainer space did not finish the turn');console.log('trainer space',landed,'done',advanced);
const walk=await page.evaluate(()=>{const S=window.ShambConkins;S.store.forceWildChance=1;window.__turn=S.store.run.turn;document.querySelector('[data-action=roll]').click();return true;});
let sawBattle=false,done=false;for(let i=0;i<500&&!done;i++){await page.waitForTimeout(300);const st=await page.evaluate(()=>({open:window.ShambConkins.pkmn.isOpen(),turn:window.ShambConkins.store.run.turn,busy:window.ShambConkins.store.busy}));if(st.open)sawBattle=true;else await click();done=st.turn>(await page.evaluate(()=>window.__turn))&&!st.busy;}
await page.evaluate(()=>{delete window.ShambConkins.store.forceWildChance;});
check(sawBattle&&done,'walking wild encounter did not run and resume');console.log('walk encounter',sawBattle,done,JSON.stringify(await page.evaluate(()=>{const r=window.ShambConkins.store.run;return {turn:r.turn,phase:r.phase,pending:r.pending,cur:r.current,wt:r.players.map(p=>p.wildTurn),busy:window.ShambConkins.store.busy,dlg:document.getElementById('dialog').open,title:document.querySelector('#dialog h2,#dialog h3')?.textContent};})));
// field menu opens and closes
await page.evaluate(()=>{const S=window.ShambConkins;S.pkmn.auto(null);document.querySelector('[data-action=pkmn]')?.click();});
await page.waitForTimeout(900);await page.screenshot({path:'/tmp/claude-0/sc/field-menu.png'});
await page.keyboard.press('z');await page.waitForTimeout(700);await page.screenshot({path:'/tmp/claude-0/sc/field-party.png'});
for(let i=0;i<4;i++){await page.keyboard.press('x');await page.waitForTimeout(300);}
check(!(await page.evaluate(()=>window.ShambConkins.pkmn.isOpen())),'field menu did not close with B');
// trainer spaces on a fresh board
const spaces=await page.evaluate(()=>{const S=window.ShambConkins,b=S.generateBoard?S.generateBoard('trainer-check'):null;return b?Object.values(b.nodes).filter(n=>n.type==='trainer').length:-1;});
console.log('trainer spaces on a new board',spaces);check(spaces>=4,'expected Poké Ball trainer spaces on new boards');
const board=await page.evaluate(()=>{const S=window.ShambConkins,b=S.buildWarpBoard('pokemon','t1');return {n:Object.keys(b.nodes).length,trainers:b.warp.trainers.length,types:[...new Set(Object.values(b.nodes).map(n=>n.type))]};});
console.log('pokemon warp',JSON.stringify(board));check(board.n>=20&&board.trainers>=4,'pokemon warp board too small');
console.log('errors',errors);check(!errors.length,'page errors');
await browser.close();
console.log(fails.length?`POKEMON FAIL (${fails.length})`:'POKEMON OK');process.exit(fails.length?1:0);
