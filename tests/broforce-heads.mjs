// Broforce heads: renders every character's in-game head (headCanvas) onto contact sheets and counts how each was made:
// cutout (transparent art, outlined), removed (photo backdrop flood-filled away, outlined), oval (busy photo fallback),
// placeholder (no image). Sheets go to OUT/bf-heads-<n>.png (default /tmp/claude-0/sc).
import {launchBrowser, root} from './lib.mjs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync} from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';mkdirSync(out,{recursive:true});
const browser=await launchBrowser();const page=await browser.newPage({viewport:{width:1200,height:900}});const errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(path.resolve(root,process.env.SHAMB_FILE||'dist/ShambConkins.html')).href,{waitUntil:'domcontentloaded',timeout:90000});
await page.waitForFunction(()=>window.ShambConkins?.requestGame,null,{timeout:60000});
await page.evaluate(()=>{window.ShambConkins.requestGame({id:'broforce-jungle',origin:'arcade'});});
await page.waitForTimeout(600);await page.evaluate(()=>[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent))?.click());
await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.ids,null,{timeout:20000});
const ids=await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug,ids=d.ids();for(const id of ids)d.head(id);return ids;});
await page.waitForTimeout(6000);
const count=await page.evaluate(ids=>{const d=window.ShambConkins.store.session.debug,c={};for(const id of ids){const k=d.head(id).headKind||'placeholder';c[k]=(c[k]||0)+1;}return c;},ids);
console.log(ids.length,'characters',JSON.stringify(count));
const per=120;for(let p=0;p*per<ids.length;p++){
 await page.evaluate(({ids,p,per})=>{document.getElementById('bf-sheet')?.remove();const d=window.ShambConkins.store.session.debug,c=document.createElement('canvas');c.id='bf-sheet';c.width=1200;c.height=900;
  c.style.cssText='position:fixed;left:0;top:0;z-index:99999';const g=c.getContext('2d');g.fillStyle='#4f9ac8';g.fillRect(0,0,1200,900);
  ids.slice(p*per,p*per+per).forEach((id,i)=>{const x=(i%12)*100,y=Math.floor(i/12)*90;const h=d.head(id);g.drawImage(h,x+14,y+2,72,72);g.fillStyle={cutout:'#fff',removed:'#ffe23a',oval:'#ff8a6a'}[h.headKind]||'#ccc';g.font='9px Arial';g.textAlign='center';g.fillText(id.slice(0,18),x+50,y+84);});
  document.body.appendChild(c);},{ids,p,per});
 await page.screenshot({path:`${out}/bf-heads-${p}.png`});}
if(errors.length)console.log('errors',errors.slice(0,3));
await browser.close();
