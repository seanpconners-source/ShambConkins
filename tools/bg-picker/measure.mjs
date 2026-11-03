// Background Picker, step 1 (roadmap M20; how-to in tools/bg-picker/README.md).
// Opens the Arcade of a served --pwa build on the picker's 8 screens and records, per screen:
//  - where the game shows every background right now (zoom z vs "just fills the screen", focus point fx/fy) = the
//    picker's "game's current" starting point,
//  - where the controls/text/tiles are (rects),
//  - a see-through capture of the real menu layer (overlay-<screen>.png) that the picker lays over the pictures.
// Usage: SHAMB_URL=http://localhost:8123/ OUT=<dir> node tools/bg-picker/measure.mjs [screen-id ...]
import {open} from '../../tests/lib.mjs';
import fs from 'node:fs';
import path from 'node:path';
const OUT=process.env.OUT||'local-test-reports/bg-picker';fs.mkdirSync(OUT,{recursive:true});
const SCREENS=JSON.parse(fs.readFileSync(new URL('./screens.json',import.meta.url),'utf8'));
const only=process.argv.slice(2);
// slot of each picture: the key-art box written on the <img> (data-slot since v0.80.4)
const out=fs.existsSync(OUT+'/measure.json')?JSON.parse(fs.readFileSync(OUT+'/measure.json','utf8')):{};
for(const sc of SCREENS.filter(s=>!only.length||only.includes(s.id))){
 const {browser,page,errors}=await open({viewport:{width:sc.w,height:sc.h}});await page.waitForTimeout(1200);
 await page.click('[data-action="arcade"]');await page.waitForSelector('.arcade-console');await page.waitForTimeout(800);
 await page.click('.arc-pill[data-id="all"]');await page.waitForTimeout(600);
 const one=page.locator('.solo-seg',{hasText:'1 Player'}).first();if(await one.count())await one.click().catch(()=>{});await page.waitForTimeout(900);
 const n=await page.locator('.arc-tile').count();const res={w:sc.w,h:sc.h,place:{},rects:null,titles:{}};
 for(let i=0;i<n;i++){
  await page.evaluate(i=>{const t=document.querySelectorAll('.arc-tile')[i];t.scrollIntoView({inline:'center'});t.click();},i);await page.waitForTimeout(500);
  const r=await page.evaluate(()=>{const root=document.querySelector('.arcade-console');if(!root.classList.contains('has-key'))return null;
   const im=[...document.querySelectorAll('.arc-keyart .arc-layer')].pop()?.querySelector('img:not(.arc-keyfill)');if(!im||!im.classList.contains('placed'))return null;
   const R=root.getBoundingClientRect(),rel=q=>{const e=root.querySelector(q),b=e&&e.getBoundingClientRect();return b&&b.height?[b.left-R.left,b.top-R.top,b.right-R.left,b.bottom-R.top].map(Math.round):null;};
   return {slot:im.dataset.slot,l:parseFloat(im.style.left),t:parseFloat(im.style.top),w:parseFloat(im.style.width),nw:im.naturalWidth,nh:im.naturalHeight,
    title:document.querySelector('.arc-title')?.textContent?.trim(),rects:{W:R.width,H:R.height,top:Math.max(...['.arc-top','.arc-pills','.arc-strip'].map(q=>rel(q)?.[3]||0)),info:rel('.arc-info'),row:rel('.arc-row-head')||rel('.arc-row')}};});
  if(!r||!r.slot||res.place[r.slot])continue;
  const cover=Math.max(sc.w/r.nw,sc.h/r.nh),dh=r.w*r.nh/r.nw;
  res.place[r.slot]={z:+(r.w/(r.nw*cover)).toFixed(4),fx:+((sc.w/2-r.l)/r.w).toFixed(4),fy:+((sc.h/2-r.t)/dh).toFixed(4)};res.titles[r.slot]=r.title;if(!res.rects)res.rects=r.rects;}
 await page.addStyleTag({content:`html,body,#app,.arcade-console{background:transparent!important}.arc-wash,.arc-shade,.arc-keyart,.arc-hero-art,.arc-info,#sc-dl,#sc-ready,.music-chip,.toast,.sc-ghost{visibility:hidden!important}`});
 await page.waitForTimeout(300);await page.screenshot({path:path.join(OUT,`overlay-${sc.id}.png`),omitBackground:true});
 out[sc.id]=res;console.log(sc.id,Object.keys(res.place).length,'pictures',errors.slice(0,2).join(' | '));await browser.close();
 fs.writeFileSync(OUT+'/measure.json',JSON.stringify(out));}
