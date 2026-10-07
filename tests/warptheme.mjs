// Themed warp zones: on every warp board (Pokémon has its own system) each kind of space must deal only that
// zone's content. Builds a real run, swaps in each warp board, forces landings on game / trivia / task / event /
// item / bonus / penalty spaces and checks the game, card, item or fortune it produced.
import {open} from './lib.mjs';
const {browser,page,errors}=await open({viewport:{width:1100,height:700}});let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
const drain=async(max=30)=>{for(let i=0;i<max;i++){const st=await page.evaluate(()=>{const S=window.ShambConkins,d=document.getElementById('dialog');
  if(d.open){const bs=[...d.querySelectorAll('button')].filter(b=>!b.disabled);const b=bs.find(b=>/return to board|cancel|keep it|walk on|continue|^ok$|got it|close|nice|back/i.test(b.textContent.trim()))||bs.find(b=>!/start game|play/i.test(b.textContent))||bs[0];b?.click();return 'dlg';}
  const c=document.querySelector('.level-card,.gentlemen-card,.smash-card,.landing-banner');if(c){c.click();return 'card';}
  if(window.ShambConkins.store.session){document.querySelector('[data-action=exit-game]')?.click();return 'game';}
  return S.store.busy?'busy':'idle';});if(st==='idle'&&i>1)return;await page.waitForTimeout(350);}};
for(let i=0;i<40;i++){await page.waitForTimeout(300);await drain(2);const ready=await page.evaluate(()=>!!window.ShambConkins.store.run&&!window.ShambConkins.store.busy);if(ready&&i>8)break;}
const ids=await page.evaluate(()=>Object.keys(window.ShambConkins.warpThemes));
for(const id of ids){
 await page.evaluate(id=>{const S=window.ShambConkins,run=S.store.run;if(run.mainBoard){run.board=run.mainBoard;delete run.mainBoard;}const b=S.buildWarpBoard(id,'test:'+id);run.mainBoard=run.board;run.board=b;run.warp={id,returns:run.players.map(q=>q.node),bossId:b.warp.bossId};for(const q of run.players){q.visited=[];q.node=b.realms.warp.start;}run.maxTurns=9999;run.finished=false;run.phase='board';run.pending=null;run.roundsWithoutGame=0;S.store.busy=false;S.updateBoard(true);},id);
 const theme=await page.evaluate(id=>window.ShambConkins.warpThemes[id],id);
 for(const type of ['game','trivia','task','event','event','item','item','bonus','penalty']){
  const before=await page.evaluate(type=>{const S=window.ShambConkins,run=S.store.run,p=run.players[run.current],ids=run.board.realms.warp.ids,n=run.board.nodes[ids[3]];n.type=type;p.node=n.id;run.phase='landing';run.pending={kind:'landing'};S.store.busy=false;const items=p.items.length;S.resolveLanding();return {items,cur:run.current};},type);
  let got=null;for(let i=0;i<14&&!got;i++){await page.waitForTimeout(250);got=await page.evaluate(({type,before})=>{const S=window.ShambConkins,run=S.store.run,p=run.players[before.cur],pend=run.pending,d=document.getElementById('dialog');
   if(['game','trivia','task'].includes(type)&&pend?.kind==='game')return {game:pend.gameId};
   if(type==='event'&&pend?.kind==='event')return {card:pend.event.title,source:pend.event.source};
   if(type==='item'&&p.items.length>before.items)return {item:p.items.at(-1)};
   if(['bonus','penalty'].includes(type)&&d.open){const h=d.querySelector('h2,h3,.dialog-title');if(h)return {fortune:h.textContent.trim()};}
   return null;},{type,before});}
  const where=`${id}/${type}`;
  if(!got)fail(`${where}: nothing happened`);
  else if(got.game&&!(type==='trivia'?theme.trivia:theme.games).includes(got.game))fail(`${where}: off-theme game ${got.game}`);
  else if(got.card&&!theme.cards.some(c=>c.title===got.card))fail(`${where}: off-theme card ${got.card} (${got.source})`);
  else if(got.item&&!theme.items.includes(got.item))fail(`${where}: off-theme item ${got.item}`);
  else if(got.fortune&&!theme[type].some(([t])=>t===got.fortune))fail(`${where}: off-theme fortune ${got.fortune}`);
  else console.log(where.padEnd(24),JSON.stringify(got));
  await drain();
 }
 // a challenge item from the bag is swapped for the zone's own game
 const swapped=await page.evaluate(async()=>{const S=window.ShambConkins,run=S.store.run;run.phase='board';run.pending=null;S.store.busy=false;S.requestGame({id:'paddys-beer-pong'});await new Promise(r=>setTimeout(r,500));return run.pending?.gameId;});
 if(!theme.games.includes(swapped))fail(`${id}: off-theme challenge item game ${swapped}`);else console.log(`${id}/challenge-item`.padEnd(24),swapped);
 await drain();
}
console.log('errors',errors.length?errors:'none');if(errors.length)ok=false;
await browser.close();console.log(ok?'warp themes OK':'warp themes FAILED');process.exit(ok?0:1);
