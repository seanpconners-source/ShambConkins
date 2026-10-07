// Theme audit: opens every minigame (intro card, then a few seconds of play) and reports text whose colour
// is too close to the background it sits on (WCAG ratio < 2.6). Usage: node tests/contrast.mjs [id-regex] [concurrency]
import {chromium, root} from './lib.mjs';
import path from 'node:path';
const filter=process.argv[2], conc=+process.argv[3]||4;
const file='file://'+path.resolve(root,process.env.SHAMB_FILE||'dist/ShambConkins.html');
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const probe=await browser.newPage();await probe.goto(file);
let ids=await probe.evaluate(()=>window.ShambConkins.gameRegistry.map(g=>g.id));await probe.close();
if(filter)ids=ids.filter(i=>new RegExp(filter).test(i));
export function audit(){
 const parse=c=>{const k=c.match(/color\(srgb ([^)]+)\)/);if(k){const p=k[1].split(/[ \/]+/).filter(Boolean).map(Number);return {r:p[0]*255,g:p[1]*255,b:p[2]*255,a:p[3]??1};}const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return {r:p[0],g:p[1],b:p[2],a:p[3]??1};};
 const lum=({r,g,b})=>{const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;};return .2126*f(r)+.7152*f(g)+.0722*f(b);};
 const blend=(top,bot)=>({r:top.r*top.a+bot.r*(1-top.a),g:top.g*top.a+bot.g*(1-top.a),b:top.b*top.a+bot.b*(1-top.a),a:1});
 const firstGrad=img=>{const m=img.match(/rgba?\([^)]+\)|color\(srgb [^)]+\)/g);if(!m)return null;const cs=m.map(parse);return cs.reduce((a,c)=>({r:a.r+c.r/cs.length,g:a.g+c.g/cs.length,b:a.b+c.b/cs.length,a:Math.max(a.a,c.a)}),{r:0,g:0,b:0,a:0});};
 const bgOf=el=>{const layers=[];for(let n=el;n&&n.nodeType===1;n=n.parentElement){const cs=getComputedStyle(n);if(n.tagName==='CANVAS'||n.tagName==='IMG'||n.tagName==='svg')return null;if(cs.backgroundImage.includes('url('))return null;let c=parse(cs.backgroundColor);const g=cs.backgroundImage!=='none'?firstGrad(cs.backgroundImage):null;if(g&&g.a>0)c=g.a>=.5?{...g,a:1}:g;if(c&&c.a>0){layers.push(c);if(c.a>=.99)break;}}let out={r:255,g:255,b:255,a:1};for(let i=layers.length-1;i>=0;i--)out=blend(layers[i],out);return out;};
 const bad=[];const seen=new Set();
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){const t=walker.currentNode;if(!t.textContent.trim())continue;const el=t.parentElement;if(!el||seen.has(el))continue;seen.add(el);
  if(el.closest('svg,canvas,#fx-layer,script,style,noscript,[hidden]'))continue;const r=el.getBoundingClientRect();if(!r.width||!r.height||r.bottom<0||r.top>innerHeight)continue;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||+cs.opacity===0)continue;
  let o=1;for(let n=el;n;n=n.parentElement)o*=+getComputedStyle(n).opacity;if(o<.3)continue;
  const fg=parse(cs.color),bg=bgOf(el);if(!fg||!bg||fg.a===0)continue;if(cs.webkitTextStrokeWidth&&parseFloat(cs.webkitTextStrokeWidth)>0)continue;
  const f=blend(fg,bg),L1=lum(f),L2=lum(bg),ratio=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
  if(ratio<2.6&&!(cs.textShadow!=='none'&&ratio>1.6))bad.push({text:t.textContent.trim().slice(0,40),ratio:+ratio.toFixed(2),cls:(el.className&&el.className.baseVal===undefined?el.className:'')+' <'+el.tagName.toLowerCase()+'> in .'+(el.closest('[class]')?.parentElement?.className||'').toString().slice(0,40),color:cs.color,bg:`rgb(${bg.r|0},${bg.g|0},${bg.b|0})`});}
 return bad;
}
const results={};
// Board walk: plays turns of a real run, auditing the board and every dialog, sheet and banner on the way.
async function walk(seed,turns=14){const ctx=await browser.newContext({viewport:{width:390,height:780}});const page=await ctx.newPage();await page.goto(file);await page.waitForTimeout(300);
 const found=[];const note=(where,list)=>{for(const x of list)if(!found.some(y=>y.text===x.text&&y.cls===x.cls))found.push({...x,where});};
 await page.evaluate(()=>{for(const a of ['help','media-sources','settings']){}});
 await page.click('text=NEW GAME');await page.waitForTimeout(300);await page.fill('#run-seed',String(seed));await page.evaluate(()=>document.querySelector('[data-action=start-run]').click());
 for(let i=0;i<turns*12;i++){await page.waitForTimeout(450);
  const st=await page.evaluate(()=>({dlg:document.getElementById('dialog').open,game:!document.getElementById('game-layer').hidden,roll:!!document.querySelector('[data-action=roll]:not(:disabled)'),route:!document.getElementById('route-panel')?.hidden}));
  if(st.dlg||st.route){note('dialog',await page.evaluate(audit));await page.evaluate(()=>{const b=document.querySelector('#dialog[open] .dialog-actions button:not(:disabled),#route-panel:not([hidden]) button.primary');b?.click();});}
  else if(st.game){await page.evaluate(()=>{const ex=[...document.querySelectorAll('#game-layer button')].find(b=>/exit|skip|forfeit/i.test(b.innerText));ex?.click();});}
  else if(st.roll){note('board',await page.evaluate(audit));await page.evaluate(()=>document.querySelector('[data-action=roll]').click());await page.waitForTimeout(250);note('roll',await page.evaluate(audit));}}
 await ctx.close();return found;}
if(process.env.WALK){const all=[];for(const seed of String(process.env.WALK).split(','))for(const x of await walk(seed))if(!all.some(y=>y.text===x.text&&y.cls===x.cls))all.push(x);for(const x of all)console.log(JSON.stringify(x));console.log(all.length,'low-contrast text nodes on the board walk');await browser.close();process.exit(0);}
async function run(id){const ctx=await browser.newContext({viewport:{width:390,height:780}});const page=await ctx.newPage();await page.goto(file);await page.waitForTimeout(300);
 await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade'});},id);await page.waitForTimeout(700);
 const a=await page.evaluate(audit);
 await page.evaluate(()=>document.querySelector('#dialog[open] .dialog-actions button')?.click());await page.waitForTimeout(900);
 await page.evaluate(()=>document.querySelector('.pass-card button.primary,.pass-card .dialog-actions button,.pass-card button:last-child')?.click());await page.waitForTimeout(1500);
 const b=await page.evaluate(audit);
 const all=[...a,...b].filter((x,i,arr)=>arr.findIndex(y=>y.text===x.text&&y.cls===x.cls)===i);
 if(all.length)results[id]=all;await ctx.close();}
const q=[...ids];await Promise.all(Array.from({length:conc},async()=>{while(q.length){const id=q.shift();await run(id).catch(e=>{results[id]=[{error:e.message.slice(0,100)}];});}}));
for(const [id,list] of Object.entries(results)){console.log('##',id);for(const x of list.slice(0,8))console.log('  ',JSON.stringify(x));}
console.log(`${ids.length-Object.keys(results).length}/${ids.length} games have readable text`);
await browser.close();
