// Kingpin Bowling (kingpin-bowling) in the browser: the alley screen (buy an upgrade, pick 3 frames), a real swipe that
// bowls a ball, then the autopilot plays 1P vs CPU to the result; the overhead animations show up; 2P on one phone runs to
// the end too. Screenshots to $OUT (default /tmp/claude-0/sc/bowl-*). Usage: node tests/bowling.mjs [WxH]
import {chromium,browserLaunchOptions,appURL} from './lib.mjs';
import {mkdirSync} from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';mkdirSync(out,{recursive:true});
const [vw,vh]=(process.argv[2]||'390x780').split('x').map(Number);
let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);},pass=m=>console.log('  ok  ',m);
const browser=await chromium.launch(browserLaunchOptions()),page=await browser.newPage({viewport:{width:vw,height:vh}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::/.test(m.text()))errors.push('console: '+m.text());});
const open=async()=>{await page.goto(await appURL(),{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.ShambConkins?.requestGame,null,{timeout:60000});await page.waitForTimeout(300);};
const S=(fn,a)=>page.evaluate(fn,a);const dbg=fn=>page.evaluate(fn=>{const d=window.ShambConkins.store.session?.debug;return d?new Function('d',fn)(d):null;},fn);
const clickReady=()=>S(()=>{const b=document.querySelector('.pass-overlay [data-ready]:not(:disabled)')||[...document.querySelectorAll('#dialog[open] button')].find(b=>/start|ready|play/i.test(b.textContent));b?.click();return !!b;});
const until=async(fn,ms=20000)=>{const t0=Date.now();while(Date.now()-t0<ms){const v=await fn();if(v)return v;await page.waitForTimeout(150);}return null;};
const shot=n=>page.screenshot({path:`${out}/bowl-${n}-${vw}x${vh}.png`});
const tag=`${vw}x${vh}`;
// ---- 1P vs CPU from the Arcade: the alley screen first
await open();await S(()=>{const st=window.ShambConkins.store.profile;st.bowlAlley={cash:2000};st.settings.solo={...(st.settings.solo||{}),on:true};});
await S(()=>{const b=document.createElement('button');b.dataset.action='arcade-solo';b.dataset.id='kingpin-bowling';document.body.append(b);b.click();b.remove();});
await until(clickReady,8000);
const shop=await until(()=>dbg('return d.phase==="shop"&&!!d.shop'),20000);if(!shop)fail('no alley screen');else pass('alley screen');
await page.waitForTimeout(1200);await shot('shop');
await dbg('d.shop.tab("alley")');await page.waitForTimeout(300);await dbg('d.shop.act("part","lanes")');const lanes=await dbg('return d.alley.parts.lanes');
if(lanes!==1)fail('lane upgrade not bought ('+lanes+')');else pass('bought the Star Lanes lanes');
await page.waitForTimeout(800);await shot('shop-alley');
await dbg('d.shop.act("frames","3")');await dbg('d.shop.go()');
const aim=await until(()=>dbg('return d.phase==="aim"&&d.cur===0'),30000);if(!aim)fail('never reached the aim phase');else pass('aiming');
await page.waitForTimeout(600);await shot('aim');
// a real swipe from the ball straight up, curving left at the end
const box=await page.locator('canvas.game-canvas').first().boundingBox();
const bx=box.x+box.width*.5,by=box.y+box.height*.86;await page.mouse.move(bx,by);await page.mouse.down();
for(let i=1;i<=10;i++){await page.mouse.move(bx-(i>6?(i-6)*6:0),by-i*box.height*.05);await page.waitForTimeout(12);}await page.mouse.up();
const rolled=await until(()=>dbg('return ["roll","pins","sweep","anim"].includes(d.phase)||d.players[0].marks[0]?.length>0'),6000);
if(!rolled)fail('the swipe did not bowl');else pass('a swipe bowls the ball');
await page.waitForTimeout(1300);await shot('roll');
await until(()=>dbg('return d.phase==="pins"'),6000);await page.waitForTimeout(700);await shot('pins');
// the autopilot finishes the game (fast); grab an animation on the way
await dbg('d.bot=true;d.fast=2.5');let animShot=false;
const end=await until(async()=>{const r=await S(()=>{const s=window.ShambConkins.store.session;const dlg=document.querySelector('#dialog[open]');if((!s||!s.alive)&&dlg)return 'end:'+dlg.textContent.replace(/\s+/g,' ').slice(0,140);return s?.debug?.anim||s?.debug?.phase||'?';});
 if(!animShot&&/strike|spare|gutter|split|turkey|double|foul|pickup/.test(r)){animShot=true;await page.waitForTimeout(900);await shot('anim-'+r);}
 if(r==='summary'&&!animShot){}
 return r.startsWith('end:')?r:null;},240000);
if(!end)fail('1P game never ended: '+(await dbg('return d.phase+" "+JSON.stringify(d.players)')));else pass('1P vs CPU result: '+end.slice(4,130));
const cash=await S(()=>window.ShambConkins.store.profile.bowlAlley?.cash);const games=await S(()=>window.ShambConkins.store.profile.bowlAlley?.stats?.games);
if(!(games>=1))fail('game not counted in the alley stats');else pass(`alley: $${cash}, ${games} game(s)`);
// ---- 2P on one phone (board-style 3 frames, no shop), autopilot to the end
await open();await S(()=>{const st=window.ShambConkins.store.profile;st.settings.solo={...(st.settings.solo||{}),on:false};window.ShambConkins.requestGame({id:'lebowski-bowling',origin:'board-test'});});
await until(clickReady,8000);await until(()=>dbg('return d.phase==="aim"||d.phase==="intro"'),30000);await dbg('d.bot=true;d.fast=3');
const end2=await until(()=>S(()=>{const s=window.ShambConkins.store.session;const dlg=document.querySelector('#dialog[open]');if((!s||!s.alive)&&dlg)return dlg.textContent.replace(/\s+/g,' ').slice(0,140);return null;}),300000);
if(!end2)fail('2P game never ended');else pass('2P result: '+end2.slice(0,120));
if(errors.length)fail('page errors: '+[...new Set(errors)].slice(0,4).join(' | '));
console.log(ok?`bowling OK (${tag})`:`bowling FAILED (${tag})`);await browser.close();process.exit(ok?0:1);
