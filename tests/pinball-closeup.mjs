// Pinball close-ups (phone size): starts a game, forces the Giant Robot battle, parks the camera on the upper right
// and screenshots the robot, beam, upper flipper, Golden Egg and VUK wireform; then a ball riding the VUK.
// Screenshots → OUT (default system temp /pinball). Usage: node tests/pinball-closeup.mjs
import {open} from './lib.mjs';
import {mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const out=process.env.OUT||path.join(tmpdir(),'pinball');mkdirSync(out,{recursive:true});
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
await page.waitForFunction(()=>window.ShambConkins?.requestGame,null,{timeout:40000});
await page.evaluate(()=>{window.ShambConkins.requestGame({id:'bucketheadland-pinball',origin:'arcade'});});
const D=()=>page.evaluate(()=>window.ShambConkins.store.session?.debug?.phase);
for(let i=0;i<60&&!(await D());i++){await page.waitForTimeout(200);await page.evaluate(()=>[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent))?.click());}
await page.evaluate(()=>document.querySelector('.pass-overlay [data-ready]')?.click());
for(let i=0;i<40&&(await D())!=='ball';i++)await page.waitForTimeout(200);
await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.plunge(.6);});
await page.waitForTimeout(400);
// battle on, ball dropped onto the beam
await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug,m=d.m;m.ball.battle={t:30,hits:1,grabCool:0};const b=m.w.balls[0];b.state='free';b.x=404;b.y=300;b.vx=0;b.vy=-50;});
await page.waitForTimeout(500);await page.screenshot({path:`${out}/pbc-battle.png`});
const st=await page.evaluate(()=>{const m=window.ShambConkins.store.session.debug.m;return {held:m.w.balls.map(b=>b.state+':'+(b.hold?.hole.id||'')),robot:m.w.parts.giantRobot.ox};});
console.log('battle',JSON.stringify(st));
// ball into the Coop VUK
await page.evaluate(()=>{const m=window.ShambConkins.store.session.debug.m;m.ball.battle=null;const b=m.w.balls[0];b.state='free';b.hold=null;b.ignoreHole=null;b.x=236;b.y=436;b.vx=0;b.vy=0;});
await page.waitForTimeout(1500);await page.screenshot({path:`${out}/pbc-vuk.png`});
const v=await page.evaluate(()=>{const m=window.ShambConkins.store.session.debug.m;return m.w.balls.map(b=>`${b.state} ${b.x|0},${b.y|0} z${b.z|0}`);});
console.log('vuk',v.join(' | '));
if(errors.length)console.log('ERRORS',errors.join(' | '));
await browser.close();
