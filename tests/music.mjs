// Music + title-screen checks: the generative board score follows level/landmark/warp, the
// unlock fanfare plays, and the title screen's Exit button closes to the goodbye screen.
// Screenshots go to $OUT (default /tmp/claude-0/sc).
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire('/node-tools/node_modules/');
const {chromium}=require('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=process.env.OUT||'/tmp/claude-0/sc',file='file://'+path.resolve(root,process.env.SHAMB_FILE||'dist/ShambConkins.html');
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
let fail=0;const check=(ok,msg)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok)fail++;};
async function page(vp){const p=await browser.newPage({viewport:vp});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 p.on('console',m=>{if(m.type()==='error'&&!/ERR_|Failed to load resource|viewBox/.test(m.text()))errors.push(m.text());});
 await p.addInitScript(()=>{window.__osc=0;const C=window.AudioContext.prototype.createOscillator;window.AudioContext.prototype.createOscillator=function(){window.__osc++;return C.call(this);};});
 await p.goto(file);await p.waitForTimeout(900);return {p,errors};}
const dismiss=p=>p.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){d.querySelector('button.primary,button')?.click();return true;}document.querySelector('.level-card,.gentlemen-card')?.click();return false;});
// 1) Title screen exit button, phone + desktop
for(const vp of [{width:390,height:780},{width:1100,height:700}]){
 const {p,errors}=await page(vp);
 const box=await p.locator('[data-action=quit-app]').boundingBox();
 check(box&&box.y+box.height<=vp.height&&box.x>=0&&box.x+box.width<=vp.width,`exit button visible in ${vp.width}x${vp.height}`);
 await p.screenshot({path:`${out}/music-home-${vp.width}.png`});
 await p.click('[data-action=quit-app]');await p.waitForTimeout(300);
 check(/Exit ShambConkins/.test(await p.textContent('#dialog')),'exit asks for confirmation');
 await p.click('#dialog button.primary');await p.waitForTimeout(500);
 check(await p.locator('.exit-screen').isVisible(),'goodbye screen shown when the tab cannot close');
 await p.screenshot({path:`${out}/music-exit-${vp.width}.png`});
 await p.click('.exit-screen [data-action=home]');await p.waitForTimeout(400);
 check(await p.locator('.title-screen').isVisible(),'back to the title screen');
 check(!errors.length,'no page errors '+JSON.stringify(errors));await p.close();
}
// 2) Board music follows level + nearest landmark; warp boards get their own style; fanfare plays
{const {p,errors}=await page({width:390,height:780});
 await p.click('text=NEW GAME');await p.click('[data-action=start-run]');
 for(let i=0;i<30;i++){await p.waitForTimeout(350);await dismiss(p);const ready=await p.evaluate(()=>!window.ShambConkins.store.busy&&!document.getElementById('dialog').open&&!document.querySelector('.level-card,.gentlemen-card'));if(ready&&i>6)break;}
 await p.waitForTimeout(1500);
 const a=await p.evaluate(()=>({np:window.ShambConkins.nowPlaying(),scene:window.ShambConkins.musicScene(),osc:window.__osc,chip:document.querySelector('.music-chip')?.textContent}));
 console.log('board',JSON.stringify(a));
 check(a.np&&a.np.zone==='mind'&&a.np.id==='mind','mind level plays the Mind style');
 check(a.scene?.biome&&a.np.biome===a.scene.biome,'music biome matches the nearest landmark ('+a.scene?.biome+', '+a.scene?.place+')');
 check(a.osc>20,'oscillators are running');
 // move the current player next to a different-biome landmark in another level
 const moved=await p.evaluate(async()=>{const S=window.ShambConkins,run=S.store.run;const n=Object.values(run.board.nodes).find(n=>n.realm==='body'&&n.type==='location');run.players[run.current].node=n.id;S.updateBoard(true);return n.id;});
 await p.evaluate(()=>window.ShambConkins.announceLevel?.(window.ShambConkins.store.run.players[window.ShambConkins.store.run.current]));
 for(let i=0;i<20;i++){await p.waitForTimeout(400);await dismiss(p);const np=await p.evaluate(()=>window.ShambConkins.nowPlaying());if(np?.zone==='body')break;}
 const b=await p.evaluate(()=>({np:window.ShambConkins.nowPlaying(),scene:window.ShambConkins.musicScene()}));
 console.log('body',JSON.stringify(b));
 check(b.np?.id==='body','Body level switches to the Body style');
 check(b.np?.biome===b.scene?.biome,'Body biome follows the landmark');
 const before=await p.evaluate(()=>window.__osc);
 await p.evaluate(()=>{window.ShambConkins.unlockDialog(['ref-django'],'Sean');});await p.waitForTimeout(600);
 const after=await p.evaluate(()=>window.__osc);
 check(after-before>=20,`fanfare plays on unlock (${after-before} oscillators)`);
 await p.screenshot({path:`${out}/music-unlock.png`});await dismiss(p);
 check(!errors.length,'no page errors '+JSON.stringify(errors));await p.close();}
await browser.close();
console.log(fail?`${fail} FAILED`:'music checks passed');process.exit(fail?1:0);
