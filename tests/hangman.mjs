// Hangman Unchained (django-hangman = both at once, django-hangman-wanted = write one / guess one).
// Plays both modes with real taps on the canvas keys at phone portrait, phone landscape and desktop sizes, checks
// scoring, misses → hanged, the writer's keyboard/deal/done, full-bleed layout and the result dialog.
// Screenshots: OUT (default /tmp/claude-0/sc/hm-*).  Usage: node tests/hangman.mjs [WxH ...]
import {open} from './lib.mjs';
import {mkdirSync} from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';mkdirSync(out,{recursive:true});
let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
const sizes=process.argv.slice(2).length?process.argv.slice(2).map(s=>s.split('x').map(Number)):[[390,780],[780,390],[1100,700]];
const ABC='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
for(const [w,h] of sizes)for(const id of ['django-hangman','django-hangman-wanted']){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});const tag=`hm-${id==='django-hangman'?'shared':'pass'}-${w}x${h}`;
 const shot=name=>page.screenshot({path:`${out}/${tag}-${name}.png`});
 await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade'});},id);
 await page.waitForTimeout(400);await page.evaluate(()=>{[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent))?.click();});
 const S=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(!d)return null;const s=d.st;return {phase:s.phase,text:s.text,round:s.round,score:[...s.score],misses:[...s.misses],hanged:[...s.hanged],guesser:s.guesser,draft:s.draft,guessed:[...s.guessed.keys()]};});
 const tapKey=async(kb,L)=>{const r=await page.evaluate(([kb,L])=>{const d=window.ShambConkins.store.session.debug,k=d.layout().keys?.[kb]?.find(k=>k.L===L),b=document.querySelector('#game-canvas').getBoundingClientRect();return k&&{x:b.left+k.x+k.w/2,y:b.top+k.y+k.h/2,w:k.w,h:k.h};},[kb,L]);if(!r)return null;await page.mouse.click(r.x,r.y);return r;};
 const tapAct=async id=>{const r=await page.evaluate(id=>{const d=window.ShambConkins.store.session.debug,k=d.layout().act.find(a=>a.id===id),b=document.querySelector('#game-canvas').getBoundingClientRect();return {x:b.left+k.x+k.w/2,y:b.top+k.y+k.h/2};},id);await page.mouse.click(r.x,r.y);};
 const waitPhase=async(ph,ms=8000)=>{for(let t=0;t<ms;t+=100){const s=await S();if(s&&ph.includes(s.phase))return s;await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());await page.waitForTimeout(100);}return S();};
 const misses=text=>[...ABC].filter(L=>!text.includes(L));
 await page.waitForTimeout(900);await shot('intro');
 const lay=await page.evaluate(()=>{const r=e=>document.querySelector(e)?.getBoundingClientRect();const c=r('#game-canvas');return {cw:c.width,ch:c.height,score:getComputedStyle(document.querySelector('#game-scorebar')).display};});
 if(lay.cw<w-2||lay.ch<h-2||lay.score!=='none')fail(`${tag} not full-bleed ${JSON.stringify(lay)}`);
 if(id==='django-hangman'){
  let s=await waitPhase(['banner']);await page.waitForTimeout(500);await shot('banner');
  s=await waitPhase(['play']);if(s?.phase!=='play'){fail(`${tag} never started ${JSON.stringify(s)}`);await browser.close();continue;}
  const keyBox=await tapKey(0,misses(s.text)[0]);if(keyBox&&(keyBox.w<36||keyBox.h<34))fail(`${tag} keys too small ${keyBox.w|0}x${keyBox.h|0}`);console.log(tag,'key',keyBox.w|0,'x',keyBox.h|0);
  const hit=[...s.text].find(c=>/[A-Z]/.test(c));await tapKey(1,hit);await page.waitForTimeout(200);s=await S();
  if(s.misses[0]!==1)fail(`${tag} P1 miss not counted ${JSON.stringify(s)}`);if(s.score[1]<10)fail(`${tag} P2 hit not scored ${JSON.stringify(s)}`);
  await tapKey(0,misses(s.text)[1]);await page.waitForTimeout(150);s=await S();if(s.misses[0]!==1)fail(`${tag} jammed gun still fired`);
  for(let i=1;i<4;i++){await page.waitForTimeout(950);await tapKey(0,misses(s.text)[i]);}
  await page.waitForTimeout(700);await shot('play');
  for(let i=4;i<6;i++){await page.waitForTimeout(950);await tapKey(0,misses(s.text)[i]);}
  await page.waitForTimeout(1300);s=await S();if(!s.hanged[0])fail(`${tag} P1 not hanged after 6 misses ${JSON.stringify(s)}`);await shot('hanged');
  for(const L of new Set([...s.text].filter(c=>/[A-Z]/.test(c)&&!s.guessed.includes(c)))){await tapKey(1,L);await page.waitForTimeout(60);}
  s=await waitPhase(['reveal'],3000);if(s.phase!=='reveal')fail(`${tag} round 1 did not end ${JSON.stringify(s)}`);await page.waitForTimeout(1200);await shot('reveal');
  for(let r=1;r<3;r++){s=await waitPhase(['play'],9000);for(const L of new Set([...s.text].filter(c=>/[A-Z]/.test(c))))await page.evaluate(L=>window.ShambConkins.store.session.debug.guess(0,L),L);await page.evaluate(()=>window.ShambConkins.store.session.debug.skip());}
 }else{
  let s=await waitPhase(['write']);if(s?.phase!=='write'){fail(`${tag} no write phase ${JSON.stringify(s)}`);await browser.close();continue;}
  for(const L of 'COW')await tapKey(0,L);await tapAct('space');for(const L of 'BOY')await tapKey(0,L);s=await S();if(s.draft!=='COW BOY')fail(`${tag} typing gave "${s.draft}"`);
  await shot('write');await tapAct('deal');s=await S();if(!s.draft||s.draft==='COW BOY')fail(`${tag} deal did nothing`);await page.waitForTimeout(300);await shot('deal');
  await page.evaluate(()=>window.ShambConkins.store.session.debug.type("THE D IS SILENT"));await tapAct('done');
  s=await waitPhase(['play'],9000);if(s.text!=='THE D IS SILENT'||s.guesser!==1)fail(`${tag} guessing wrong phrase ${JSON.stringify(s)}`);
  await tapKey(0,'E');await tapKey(0,'Z');await tapKey(0,'S');await page.waitForTimeout(700);s=await S();if(s.score[1]!==40||s.misses[1]!==1)fail(`${tag} pass scoring ${JSON.stringify(s)}`);await shot('play');
  for(const L of 'THDILN')await tapKey(0,L);s=await waitPhase(['reveal'],3000);if(s.score[1]!==255)fail(`${tag} solve bonus ${JSON.stringify(s)}`);await page.waitForTimeout(1200);await shot('solved');
  s=await waitPhase(['write'],12000);await page.evaluate(()=>window.ShambConkins.store.session.debug.type('RUM HAM'));await tapAct('done');
  s=await waitPhase(['play'],9000);for(const L of 'BCDEFG')await tapKey(0,L);s=await waitPhase(['reveal'],3000);if(!s.hanged[0]||s.score[1]!==305)fail(`${tag} hang → writer bonus ${JSON.stringify(s)}`);await page.waitForTimeout(1500);await shot('hanged');
 }
 let s=await waitPhase(['final'],14000);await page.waitForTimeout(900);await shot('final');
 let done=false;for(let i=0;i<60&&!done;i++){await page.waitForTimeout(150);done=await page.evaluate(()=>!!document.querySelector('#dialog[open]')&&!window.ShambConkins.store.session?.alive);}
 if(!done)fail(`${tag} no result dialog`);
 if(errors.length)fail(`${tag} errors: ${errors.slice(0,3).join(' | ')}`);
 console.log(tag,ok?'ok':'', JSON.stringify((await S())||{}).slice(0,80));
 await browser.close();
}
console.log(ok?'hangman OK':'hangman FAILED');process.exit(ok?0:1);
