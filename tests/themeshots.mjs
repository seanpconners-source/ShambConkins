// Screenshots the themed menus/interfaces (setup, board + HUD, dialog, collection, vault, a game, level/warp tints) at phone and desktop sizes.
import {open} from './lib.mjs';
const out=process.env.OUT||'/tmp/claude-0/sc';
const only=process.argv[2]||'';
const sizes=[{width:390,height:780},{width:1100,height:700}];
const dismiss=async page=>{for(let i=0;i<14;i++){await page.waitForTimeout(450);const open=await page.evaluate(()=>{const d=document.getElementById('dialog');if(d&&d.open){d.querySelector('.dialog-actions button,button')?.click();return true;}return false;});if(!open&&i>4)break;}};
for(const vp of sizes){const tag=vp.width+'x'+vp.height;
const {browser,page,errors}=await open({viewport:vp});
const shot=async n=>{if(!only||n.includes(only))await page.screenshot({path:`${out}/theme-${n}-${tag}.png`});};
await page.click('text=NEW GAME');await page.waitForTimeout(500);await shot('setup');
await page.click('[data-action=start-run]');await page.waitForTimeout(600);
await shot('intro');for(let i=0;i<40&&!(await page.evaluate(()=>!!document.querySelector('[data-action=roll]:not(:disabled)')&&!document.querySelector('.level-card,.gentlemen-card')));i++)await dismiss(page);await page.waitForTimeout(400);await shot('board-mind');
await page.evaluate(()=>document.querySelector('[data-action=bag]')?.click());await page.waitForTimeout(500);await shot('bag');await dismiss(page);
// Preview every palette on the board (the real theme follows the current player's level / warp zone).
for(const t of ['body','spirit','horror','warp-rainbow-road','warp-candy-land','warp-chutes','warp-monopoly','warp-mario-world','warp-clue','warp-hyrule','warp-green-hill','warp-bond-lair','warp-castlevania']){await page.evaluate(t=>{document.body.dataset.theme=t;},t);await page.waitForTimeout(150);await shot('board-'+t);}
await page.evaluate(()=>window.ShambConkins.updateBoard(true));
await page.evaluate(()=>document.querySelector('[data-action=settings]').click());await page.waitForTimeout(500);await shot('settings');await dismiss(page);
// collection screens
await page.evaluate(()=>document.querySelector('[data-action=home]').click());await page.waitForTimeout(500);
await page.evaluate(()=>document.querySelector('.ts-roster').click());await page.waitForTimeout(700);await shot('roster');
await page.evaluate(()=>document.querySelector('[data-action=arcade]').click());await page.waitForTimeout(700);await shot('arcade');
await page.evaluate(()=>{window.ShambConkins.requestGame({id:'fight-night',origin:'arcade'});});await page.waitForTimeout(800);await shot('game-intro');
await page.evaluate(()=>document.querySelector('#dialog[open] .dialog-actions button')?.click());await page.waitForTimeout(1500);await shot('game-pass');
await page.evaluate(()=>{document.getElementById('game-layer').hidden=true;});await page.evaluate(()=>window.ShambConkins.continueRun?.());await page.waitForTimeout(600);await dismiss(page);
await page.evaluate(()=>document.querySelector('[data-action=roll]')?.click());await page.waitForTimeout(400);await shot('roll');await page.waitForTimeout(2500);await shot('landing');
await page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open)d.close();const S=window.ShambConkins;S.store.run.finished=true;S.continueRun();});await page.waitForTimeout(800);await shot('finish');
console.log(tag,'errors',errors.slice(0,4));await browser.close();}
