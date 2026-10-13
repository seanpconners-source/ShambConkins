// Megatouch Photo Hunt with the bundled photo pairs: checks every bundled pair loads, a round deals real
// photos, tapping each marked difference on the right photo finds it (aspect-corrected hit circles), and
// screenshots the hunt and the reveal at phone and desktop size.
import {open} from './lib.mjs';
const out=process.env.OUT||'/tmp/claude-0/sc';let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
for(const [w,h] of [[390,780],[1100,700]]){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});const tag=`photohunt-${w}`;
 await page.evaluate(()=>{window.ShambConkins.requestGame({id:'megatouch-photohunt',origin:'arcade'});});
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;return d&&{phase:d.phase,round:d.round,found:d.found.length,regions:d.regions,panels:d.panels,pair:d.pair&&{id:d.pair.id,right:d.pair.right.slice(0,40)},library:d.library};});
 // press through the intro dialog and the pass-the-phone hand-off until the hunt is live
 let d;for(let i=0;i<60;i++){d=await D();if(d?.phase==='hunt'&&!(await page.evaluate(()=>window.ShambConkins.store.session.paused)))break;await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button, #game-layer button')].find(b=>b.offsetParent&&/ready|start/i.test(b.textContent));b?.click();});await page.waitForTimeout(250);}
 if(d?.phase!=='hunt'||await page.evaluate(()=>window.ShambConkins.store.session.paused))fail(`${tag} never reached the hunt (${JSON.stringify(d)})`);
 // library counts only pairs that pass validPhotoPair, so 14 means every bundled pair embedded cleanly
 if(!(d?.library>=14))fail(`${tag} bundled pairs missing: library ${d?.library}`);
 if(!/^ph-/.test(d?.pair?.id||''))fail(`${tag} round is not a bundled photo pair (${d?.pair?.id})`);
 await page.waitForTimeout(500);await page.screenshot({path:`${out}/${tag}-hunt.png`});
 // tap the centre of every difference on the right-hand (changed) photo
 const taps=await page.evaluate(()=>{const s=window.ShambConkins.store.session,c=s.c.getBoundingClientRect();
  return s.debug.regions.map((_,i)=>{const t=s.debug.target(i);return {x:c.left+t.x*c.width/s.W,y:c.top+t.y*c.height/s.H};});});
 for(const t of taps){await page.mouse.click(t.x,t.y);await page.waitForTimeout(120);}
 await page.waitForTimeout(150);await page.screenshot({path:`${out}/${tag}-found.png`});
 d=await D();if(!(d.phase==='reveal'||d.round>0))fail(`${tag} tapping all ${taps.length} marks did not finish the pair (${d.phase}, found ${d.found})`);
 console.log(tag,'library',d.library,'phase',d.phase,'round',d.round);
 if(errors.length)fail(`${tag} errors: ${errors.join(' | ')}`);
 await browser.close();
}
console.log(ok?'PHOTOHUNT OK':'PHOTOHUNT FAILED');process.exit(ok?0:1);
