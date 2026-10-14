// Bricks Breaker Quest (bricks-breaker-quest): opens the stage map, picks a stage, takes screenshots of the map, aiming,
// flight, items and the clear/fail panels, lets the bot finish both turns, and checks the result dialog + saved quest
// progress. Also runs the Node bot over a few stages. Screens go to OUT (default /tmp/claude-0/sc/bbq-*).
// Usage: node tests/bricksquest.mjs [WxH ...]   (SHAMB_FILE=... to test a private build; STAGE=n picks the stage)
import {open} from './lib.mjs';
import {load} from './kartlib.mjs';
import {mkdirSync} from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';mkdirSync(out,{recursive:true});
let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
// --- Node: rules + stage data ---
const Sim=load('src/engines/bricksQuestSim.js'),Lv=load('src/data/bricksQuestLevels.js');
for(const n of [...Lv.HAND_STAGES,37,99,250,1001,5000]){const d=Lv.stage(n);try{Sim.newStage(d);}catch(e){fail(`stage ${n} does not parse: ${e.message}`);}
 if(!(d.balls>0))fail(`stage ${n} has no balls`);}
for(const n of [1,5,12]){const r=Sim.botPlay(Lv.stage(n),{tries:15});if(r.result!=='clear')fail(`bot cannot clear stage ${n} (${JSON.stringify(r)})`);}
{const st=Sim.newStage({balls:10,rows:['5 5 5 5 5 5 5 5 5']});Sim.startVolley(st,-Math.PI/2);let g=0;while(!Sim.stepFlight(st,1/60,[])&&g++<5000);
 if(!(st.score>0||[...st.grid.values()].some(b=>b.hp<5)))fail('straight-up shot did not hit the wall');if(Sim.endTurn(st)!=='next')fail('turn should continue');}
// --- browser ---
const sizes=process.argv.slice(2).length?process.argv.slice(2).map(s=>s.split('x').map(Number)):[[390,780],[1100,700]];
for(const [w,h] of sizes){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});const tag=`bbq-${w}`;
 const shot=name=>page.screenshot({path:`${out}/${tag}-${name}.png`});
 await page.evaluate(()=>{window.ShambConkins.requestGame({id:'bricks-breaker-quest',origin:'arcade'});});
 await page.waitForTimeout(400);await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
 await page.waitForTimeout(900);
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(!d)return null;const p=d.play;
  return {view:d.view,turn:d.turn,phase:p?.phase,score:p?.st.score,bricks:p?.st.grid.size,balls:p?.st.balls,turns:p?.st.turn};});
 const lay=await page.evaluate(()=>{const c=document.querySelector('#game-canvas').getBoundingClientRect();return {cw:c.width,ch:c.height};});
 if(lay.cw<w-4||lay.ch<h-4)fail(`${tag} canvas not full screen ${JSON.stringify(lay)}`);
 await shot('map');
 // tap stage 1 on the map (bottom-left tile)
 const tap=async(vx,vy)=>{const p=await page.evaluate(([vx,vy])=>{const c=document.querySelector('#game-canvas').getBoundingClientRect(),s=window.ShambConkins.store.session,W=s.W,H=s.H;
   const k=Math.min(W/576,(H-Math.max(44,40)-36+30)/1024),ox=(W-576*k)/2,oy=Math.max(38,(H-1024*k)/2);return {x:c.left+ox+vx*k,y:c.top+oy+vy*k};},[vx,vy]);await page.mouse.click(p.x,p.y);};
 const stage=+(process.env.STAGE||0);
 if(stage)await page.evaluate(n=>{window.ShambConkins.store.session.debug.pick=n;},stage);else await tap(68,896-60);
 await page.waitForTimeout(600);
 for(let i=0;i<10;i++){if((await D())?.view==='play'&&await page.$('.pass-overlay [data-ready]'))break;await page.waitForTimeout(200);}
 await shot('handoff');
 await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(700);
 let d=await D();if(d?.phase!=='aim')fail(`${tag} not aiming after pick (${JSON.stringify(d)})`);
 await shot('stage');
 // drag to aim, screenshot the dotted guide, then release
 const geo=await page.evaluate(()=>{const c=document.querySelector('#game-canvas').getBoundingClientRect(),s=window.ShambConkins.store.session,W=s.W,H=s.H;const k=Math.min(W/576,(H-44-36)/940),spare=H-44-36-940*k;return {l:c.left,t:c.top,k,ox:(W-576*k)/2,oy:44+spare*.55};});
 const sp=(vx,vy)=>({x:geo.l+geo.ox+vx*geo.k,y:geo.t+geo.oy+vy*geo.k});
 let a=sp(288,700),b=sp(160,330);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:6});await page.waitForTimeout(150);await shot('aim');
 await page.mouse.up();await page.waitForTimeout(500);d=await D();if(d?.phase!=='flight')fail(`${tag} release did not fire (${JSON.stringify(d)})`);await shot('flight');
 for(let i=0;i<60;i++){d=await D();if(d.phase!=='flight')break;await page.waitForTimeout(150);}
 await shot('after1');
 if(!(d.score>0))fail(`${tag} first shot scored nothing (${JSON.stringify(d)})`);
 // bot plays the rest of both turns
 await page.evaluate(()=>{window.ShambConkins.store.session.debug.bot=true;});
 let shotPanel=false;
 for(let i=0;i<900;i++){d=await D();
  if(!shotPanel&&(d?.phase==='clear'||d?.phase==='fail')){await page.waitForTimeout(500);await shot(`panel-${d.phase}`);shotPanel=true;}
  if(await page.$('.pass-overlay [data-ready]')){await shot('handoff2');await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());}
  if(!d||d.view===undefined)break;await page.waitForTimeout(200);}
 await page.waitForTimeout(800);await shot('result');
 const res=await page.evaluate(()=>({text:document.querySelector('#dialog')?.innerText||'',q:window.ShambConkins.store.profile.bricksQuest}));
 if(!/Bricks Breaker Quest/.test(res.text))fail(`${tag} no result dialog (${res.text.slice(0,120)})`);
 if(!res.q||!(res.q.cleared>=1))fail(`${tag} quest progress not saved ${JSON.stringify(res.q)}`);
 console.log(tag,res.text.replace(/\s+/g,' ').slice(0,160),JSON.stringify(res.q));
 if(errors.length)fail(`${tag} errors: ${errors.join(' | ')}`);
 await browser.close();
}
console.log(ok?'bricksquest OK':'bricksquest FAILED');process.exit(ok?0:1);
