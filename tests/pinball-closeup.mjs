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
// DMD contact sheet: every table animation, each grabbed from the top strip twice (early + late in the scene).
const scenes=await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug,b=d.m.w.balls[0];d.m.ball.attr=null;if(b){b.state='held';b.hold={hole:{id:'freeze',x:236,y:620,eject:[0,0]},t:Infinity};b.x=236;b.y=620;}return d.scenes;});
await page.evaluate(n=>{const c=document.createElement('canvas');c.id='sheet';c.width=780;c.height=40*n;c.style.cssText='position:fixed;left:0;top:0;z-index:99;background:#000';document.body.appendChild(c);},scenes.length);
let row=0;for(const name of scenes){for(const [k,wait] of [[0,450],[1,900]]){
 await page.evaluate(n=>{const d=window.ShambConkins.store.session.debug;d.m.msg={lines:['GIANT ROBOT','1,000,000'],dur:9,anim:n,flash:false,age:0};d.m.msgs.length=0;},name);
 await page.waitForTimeout(wait);
 await page.evaluate(([r,k])=>{const g=document.getElementById('game-canvas'),s=document.getElementById('sheet').getContext('2d'),sc=g.width/g.clientWidth;s.drawImage(g,0,0,260*sc,70*sc,k*390,r*40,260*1.5*.98,40);},[row,k]);}
 row++;}
await page.waitForTimeout(100);await page.locator('#sheet').screenshot({path:`${out}/pbc-dmd-sheet.png`});
// light show: multiball start (GI blackout, sweep, all flashers), then a jackpot burst
await page.evaluate(()=>{document.getElementById('sheet')?.remove();const d=window.ShambConkins.store.session.debug;d.R.cam.y=330;d.m.say(['JORDAN','MULTIBALL'],3,{anim:'multiball',mode:true});});
await page.waitForTimeout(450);await page.screenshot({path:`${out}/pbc-show-multiball.png`});
await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.m.say(['SUPER JACKPOT','3,000,000'],3,{anim:'jackpot',flash:true});});
await page.waitForTimeout(350);await page.screenshot({path:`${out}/pbc-show-jackpot.png`});
console.log('song now',await page.evaluate(()=>window.ShambConkins.store.session?.debug?.song?.()),'music setting',await page.evaluate(()=>window.ShambConkins.store.profile?.settings?.music));
if(errors.length)console.log('ERRORS',errors.join(' | '));
await browser.close();
