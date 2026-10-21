// DOOM / DOOM II (ids doom, doom-2): launches from the arcade, checks the WAD loads, the title screen and main menu
// draw, starts a level, walks/fires/uses with the keyboard, then (2P) finishes both turns and checks the result.
// Screenshots go to OUT (default /tmp/claude-0/sc/doom-*). Usage: node tests/doom.mjs [doom|doom-2] [WxH ...]
import {open} from './lib.mjs';
import {mkdirSync} from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';mkdirSync(out,{recursive:true});
let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
const args=process.argv.slice(2),id=args.find(a=>/^doom/.test(a))||'doom';
const sizes=args.filter(a=>/^\d+x\d+$/.test(a)).map(s=>s.split('x').map(Number));if(!sizes.length)sizes.push([844,390],[390,780],[1100,700]);
for(const [w,h] of sizes){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});const tag=`doom-${id}-${w}`;
 const shot=name=>page.screenshot({path:`${out}/${tag}-${name}.png`});
 await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade'});},id);
 await page.waitForTimeout(400);await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(!d?.game)return null;const g=d.game,pl=g.players?.[0];
  return {state:d.state,map:g.gamemap,ep:g.gameepisode,menu:d.app.menu.active,hp:pl?.health,x:pl?.mo&&Math.round(pl.mo.x),y:pl?.mo&&Math.round(pl.mo.y),kills:pl?.killcount,ammo:pl?.ammo,turn:d.app.turn,scores:d.scores};});
 let d=null;for(let i=0;i<60&&!(d=await D());i++)await page.waitForTimeout(250);
 if(!d){fail(`${tag} engine never loaded`);await browser.close();continue;}
 await page.waitForTimeout(600);await shot('title');
 await page.keyboard.press('Enter');await page.waitForTimeout(500);await shot('menu');
 d=await D();if(!d.menu)fail(`${tag} menu did not open`);
 await page.keyboard.press('Enter');await page.waitForTimeout(400);await shot('menu2');
 await page.evaluate(()=>{void window.ShambConkins.store.session.debug.start(2,1,1);});
 for(let i=0;i<20;i++){await page.waitForTimeout(300);await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());d=await D();if(d.state==='level')break;}
 await page.waitForTimeout(1500);await shot('level');d=await D();console.log(tag,'start',JSON.stringify(d));
 if(d.state!=='level')fail(`${tag} level did not start`);
 const x0=d.x,y0=d.y;
 await page.keyboard.down('KeyW');await page.keyboard.down('ControlLeft');await page.waitForTimeout(1200);await shot('walk');await page.keyboard.up('ControlLeft');
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(500);await page.keyboard.up('ArrowLeft');await page.waitForTimeout(700);await page.keyboard.up('KeyW');
 d=await D();console.log(tag,'moved',JSON.stringify(d));if(Math.hypot(d.x-x0,d.y-y0)<40)fail(`${tag} player did not move`);
 // touch: left-thumb stick forward, right-side drag turns, FIRE button shoots
 const A=()=>page.evaluate(()=>{const g=window.ShambConkins.store.session.debug.game,mo=g.players[0].mo;return {x:mo.x,y:mo.y,a:mo.angle,ammo:g.players[0].ammo[0]};});
 await page.evaluate(()=>{const mo=window.ShambConkins.store.session.debug.game.players[0].mo;mo.angle=(mo.angle+0x80000000)>>>0;});
 let a0=await A();await page.mouse.move(w*.2,h*.55);await page.mouse.down();await page.mouse.move(w*.2,h*.55-80,{steps:4});await page.waitForTimeout(900);await shot('touch-stick');const stick=await page.evaluate(()=>window.ShambConkins.store.session.debug.app.stick?.dy);await page.mouse.up();
 let a1=await A();if(!(stick<-.5)||Math.hypot(a1.x-a0.x,a1.y-a0.y)<8)fail(`${tag} touch stick did not move (stick ${stick}, ${JSON.stringify([a0,a1])})`);
 await page.mouse.move(w*.65,h*.35);await page.mouse.down();await page.mouse.move(w*.65-120,h*.35,{steps:6});await page.waitForTimeout(300);await page.mouse.up();
 let a2=await A();if(a2.a===a1.a)fail(`${tag} touch drag did not turn`);
 const fire=await page.evaluate(()=>{const app=window.ShambConkins.store.session.debug.app,b=app.buttons()[0],r=app.c.getBoundingClientRect();return {x:r.left+b.x*r.width/app.view.cw,y:r.top+b.y*r.height/app.view.ch};});
 await page.mouse.move(fire.x,fire.y);await page.mouse.down();await page.waitForTimeout(700);await page.mouse.up();await page.waitForTimeout(200);
 let a3=await A();if(a3.ammo>=a2.ammo)fail(`${tag} FIRE button did not shoot (${a2.ammo} -> ${a3.ammo})`);
 console.log(tag,'touch ok',a0.ammo,a3.ammo);
 const au=await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;return {...d.audio,perf:d.perf};});console.log(tag,'audio/perf',JSON.stringify(au));
 if(!au.bank||!/^D_/.test(au.music||''))fail(`${tag} music not playing (${JSON.stringify(au)})`);
 await page.keyboard.press('Tab');await page.waitForTimeout(300);await shot('automap');await page.keyboard.press('Tab');
 await page.evaluate(()=>window.ShambConkins.store.session.debug.cheat('idkfa'));await page.keyboard.press('Digit6');await page.waitForTimeout(900);await shot('plasma');
 await page.keyboard.press('Escape');await page.waitForTimeout(300);await shot('ingame-menu');await page.keyboard.press('Escape');await page.waitForTimeout(200);if(process.env.VERBOSE)console.log(tag,'menu closed?',JSON.stringify(await D()));
 // finish turn 1 (exit), the tally, then turn 2 (death), then the result
 await page.evaluate(()=>window.ShambConkins.store.session.debug.exit());await page.waitForTimeout(1800);await shot('tally');d=await D();if(process.env.VERBOSE)console.log(tag,'after exit',JSON.stringify(d));if(d.state!=='inter')fail(`${tag} exit did not reach the tally (${d.state})`);
 for(let i=0;i<8;i++){await page.keyboard.press('Enter');await page.waitForTimeout(250);}
 for(let i=0;i<20;i++){await page.waitForTimeout(300);await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());d=await D();if(d?.state==='level'&&d.turn===1)break;}
 d=await D();if(d?.turn!==1)fail(`${tag} turn 2 never started (${JSON.stringify(d)})`);else{await page.waitForTimeout(800);await shot('turn2');
  await page.evaluate(()=>window.ShambConkins.store.session.debug.kill());await page.waitForTimeout(4500);await shot('dead-tally');
  for(let i=0;i<10;i++){await page.keyboard.press('Enter');await page.waitForTimeout(250);}
  await page.waitForTimeout(800);const res=await page.evaluate(()=>!!document.querySelector('#dialog')?.textContent.match(/DOOM|wins|tie/i));await shot('result');if(!res)fail(`${tag} no result dialog`);}
 if(errors.length)fail(`${tag} page errors: ${errors.slice(0,5).join(' | ')}`);
 await browser.close();}
console.log(ok?'doom OK':'doom FAILED');process.exit(ok?0:1);
