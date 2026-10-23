// Save safety (src/saveGuard.js): a fresh save shows "Restore a backup"; progress shows the backup button; backing up downloads a dated file and hides
// it (also after reload); a brand-new browser restores the file from the title screen link.
import {launchBrowser,root,screenshotPath} from './lib.mjs';import {pathToFileURL} from 'node:url';import path from 'node:path';import os from 'node:os';import fs from 'node:fs';
const D=fs.mkdtempSync(path.join(os.tmpdir(),'shamb-backup-')),url=pathToFileURL(path.resolve(root,process.env.SHAMB_FILE||'dist/ShambConkins.html')).href;const browser=await launchBrowser();
const errors=[];const check=(ok,msg)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok)process.exitCode=1;};
async function fresh(size){const ctx=await browser.newContext({viewport:size,acceptDownloads:true});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.ShambConkins?.store?.profile);await page.waitForSelector('.title-screen');return page;}
const has=(page,sel)=>page.evaluate(s=>!!document.querySelector(s),sel);
let page=await fresh({width:390,height:780});
check(await has(page,'.ts-foot [data-action="import"]'),'empty save offers Restore a backup');
check(!await has(page,'.ts-backup'),'no backup nag on an empty save');
const ids=await page.evaluate(()=>window.ShambConkins.pkmn.moodCast().filter(id=>!['sean','amber'].includes(id)).slice(0,6));
await page.evaluate(ids=>{const S=window.ShambConkins,p=S.store.profile;p.rosters.Sean.push(...ids);p.runs=1;p.xp=900;},ids);
// re-render the title screen the way the app does
await page.evaluate(()=>{const b=document.createElement('button');b.dataset.action='home';document.body.append(b);b.click();b.remove();});await page.waitForTimeout(400);
check(await has(page,'.ts-backup'),'progress shows the BACK UP PROGRESS button: '+await page.evaluate(()=>document.querySelector('.ts-backup')?.innerText.replace(/\s+/g,' ')));
check(!await has(page,'.ts-foot [data-action="import"]'),'restore link hidden once there is progress');
await page.screenshot({path:screenshotPath('backup-home-phone.png')});
const [dl]=await Promise.all([page.waitForEvent('download'),page.click('.ts-backup')]);const file=`${D}/${dl.suggestedFilename()}`;await dl.saveAs(file);
check(/^ShambConkins-save-\d{4}-\d\d-\d\d\.json$/.test(dl.suggestedFilename()),'dated file name '+dl.suggestedFilename());
check(!await has(page,'.ts-backup'),'button gone after backing up');
await page.reload();await page.waitForSelector('.title-screen');check(!await has(page,'.ts-backup'),'still gone after reload (backup mark saved)');
check(await page.evaluate(()=>!!window.ShambConkins.store.profile.backup?.at),'profile.backup kept');
// a different browser/address: empty, restore from the title screen
const page2=await fresh({width:844,height:390});
const [chooser]=await Promise.all([page2.waitForEvent('filechooser'),page2.click('.ts-foot [data-action="import"]')]);await chooser.setFiles(file);
await page2.waitForSelector('#dialog button');await page2.evaluate(()=>[...document.querySelectorAll('#dialog button')].find(b=>/restore backup/i.test(b.textContent))?.click());await page2.waitForTimeout(800);
const r=await page2.evaluate(()=>{const p=window.ShambConkins.store.profile;return {xp:p.xp,sean:p.rosters.Sean.length,runs:p.runs};});
check(r.xp===900&&r.sean===7&&r.runs===1,'restored in a fresh browser '+JSON.stringify(r));
check(!await has(page2,'.ts-backup')&&!await has(page2,'.ts-foot [data-action="import"]'),'after restore: no nag, no restore link');
await page2.screenshot({path:screenshotPath('backup-home-landscape.png')});
check(!errors.length,'no page errors '+errors.slice(0,2).join(' | '));await browser.close();
