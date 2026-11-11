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
 const res={w:sc.w,h:sc.h,place:{},rects:null,titles:{},info:{}};
 fs.mkdirSync(path.join(OUT,'info',sc.id),{recursive:true});
 await page.addStyleTag({content:`body.bgp-cap,body.bgp-cap #app,body.bgp-cap .arcade-console{background:transparent!important}body.bgp-cap .arc-wash,body.bgp-cap .arc-shade,body.bgp-cap .arc-keyart,body.bgp-cap .arc-hero-art,body.bgp-cap #sc-dl,body.bgp-cap #sc-ready,body.bgp-cap .toast{visibility:hidden!important}body.bgp-cap .arc-info *{animation:none!important}`});
 // the game's real hero text for every picture (the Featured shelf the Arcade opens on first, then the All list), captured
 // see-through so the picker shows exactly what covers the picture; rects feed the faces-under-text check (assemble.py)
 // All games holds collections and groups (Nov 11): walk into every group too, so every picture is measured
 const walk=async(shelf,depth=0)=>{
  const n=await page.locator('.arc-row .arc-tile:not(.arc-tile-all)').count();
  for(let i=0;i<n;i++){
   await page.evaluate(i=>{const t=document.querySelectorAll('.arc-row .arc-tile:not(.arc-tile-all)')[i];t.scrollIntoView({inline:'center'});t.click();},i);await page.waitForTimeout(650);
   let r=null;for(let k=0;k<6&&!r;k++){if(k)await page.waitForTimeout(400);r=await page.evaluate(()=>{const root=document.querySelector('.arcade-console');if(!root.classList.contains('has-key'))return null;
    const im=(document.querySelector('.arc-keyart .arc-key-front')||[...document.querySelectorAll('.arc-keyart .arc-layer')].pop())?.querySelector('img:not(.arc-keyfill)');if(!im||!im.classList.contains('placed'))return null;
    const R=root.getBoundingClientRect(),rel=q=>{const e=root.querySelector(q),b=e&&e.getBoundingClientRect();return b&&b.height?[b.left-R.left,b.top-R.top,b.right-R.left,b.bottom-R.top].map(Math.round):null;};
    return {slot:im.dataset.slot,l:parseFloat(im.style.left),t:parseFloat(im.style.top),w:parseFloat(im.style.width),nw:im.naturalWidth,nh:im.naturalHeight,
     title:document.querySelector('.arc-title')?.textContent?.trim(),rects:{W:R.width,H:R.height,top:Math.max(...['.arc-top','.arc-pills','.arc-strip'].map(q=>rel(q)?.[3]||0)),info:rel('.arc-info'),row:rel('.arc-row-head')||rel('.arc-row')}};});}  // big lossless key art can take a moment to decode and be placed
   if(!r||!r.slot)continue;
   if(!res.place[r.slot]){const cover=Math.max(sc.w/r.nw,sc.h/r.nh),dh=r.w*r.nh/r.nw;
    res.place[r.slot]={z:+(r.w/(r.nw*cover)).toFixed(4),fx:+((sc.w/2-r.l)/r.w).toFixed(4),fy:+((sc.h/2-r.t)/dh).toFixed(4)};res.titles[r.slot]=r.title;if(!res.rects)res.rects=r.rects;}
   const I=r.rects.info;if(!I)continue;const tag=shelf==='featured'?'f':'a';
   if((res.info[r.slot]||[]).some(x=>x.v===tag))continue;
   await page.evaluate(()=>document.body.classList.add('bgp-cap'));await page.waitForTimeout(120);
   const file=`info/${sc.id}/${r.slot}.${tag}.png`;
   await page.screenshot({path:path.join(OUT,file),omitBackground:true,clip:{x:I[0],y:I[1],width:I[2]-I[0],height:I[3]-I[1]}});
   await page.evaluate(()=>document.body.classList.remove('bgp-cap'));
   (res.info[r.slot]||=[]).push({v:tag,rect:I,file});}
  if(shelf==='featured')return;
  for(let i=0;i<n;i++){const grp=await page.evaluate(i=>!!document.querySelectorAll('.arc-row .arc-tile:not(.arc-tile-all)')[i]?.querySelector('.arc-count'),i);if(!grp||depth>2)continue;
   await page.evaluate(i=>{const t=document.querySelectorAll('.arc-row .arc-tile:not(.arc-tile-all)')[i];t.scrollIntoView({inline:'center'});t.click();},i);await page.waitForTimeout(400);
   await page.click('.arc-info [data-arc-open]').catch(()=>{});await page.waitForTimeout(700);await walk(shelf,depth+1);
   await page.click('[data-arc-up]').catch(()=>{});await page.waitForTimeout(600);}};
 for(const shelf of ['featured','all']){
  await page.click(`.arc-pill[data-id="${shelf}"]`);await page.waitForTimeout(700);await walk(shelf);}
 await page.addStyleTag({content:`html,body,#app,.arcade-console{background:transparent!important}.arc-wash,.arc-shade,.arc-keyart,.arc-hero-art,.arc-info,#sc-dl,#sc-ready,.music-chip,.toast,.sc-ghost{visibility:hidden!important}`});
 await page.waitForTimeout(300);await page.screenshot({path:path.join(OUT,`overlay-${sc.id}.png`),omitBackground:true});
 out[sc.id]=res;console.log(sc.id,Object.keys(res.place).length,'pictures',errors.slice(0,2).join(' | '));await browser.close();
 fs.writeFileSync(OUT+'/measure.json',JSON.stringify(out));}
