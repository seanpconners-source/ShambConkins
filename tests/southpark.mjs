// South Park warp: jumping in recruits a missing South Park character for each player, the board/theme/music are the lair's,
// every space type stays on theme, and beating Mecha-Streisand unlocks Barbra Streisand.
// Screenshots to $OUT (default /tmp/claude-0/sc).
import {open} from './lib.mjs';
const out=process.env.OUT||'/tmp/claude-0/sc';let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
for(const [w,h] of [[390,780],[1100,700]]){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});
 await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
 const click=async()=>page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){const t=d.querySelector('h2,h3,.dialog-title')?.textContent||'dialog';d.querySelector('button.primary,button')?.click();return t;}const c=document.querySelector('.level-card,.gentlemen-card,.smash-card');if(c){c.click();return 'card';}return null;});
 for(let i=0;i<40;i++){await page.waitForTimeout(400);await click();const ready=await page.evaluate(()=>!window.ShambConkins.store.busy&&!document.querySelector('.level-card,.gentlemen-card')&&!document.getElementById('dialog').open);if(ready&&i>12)break;}
 const before=await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run,P=S.store.profile;
  run.warpsVisited=Object.keys(S.warpThemes).concat('pokemon').filter(id=>id!=="south-park");
  const warp=Object.values(run.board.nodes).find(n=>n.type==='warp');run.players[run.current].node=warp.id;S.updateBoard(true);S.resolveLanding();
  return run.players.map(p=>[...(P.rosters[p.owner]||[])]);});
 const titles=[];
 for(let i=0;i<40;i++){await page.waitForTimeout(450);const t=await click();if(t)titles.push(t);const st=await page.evaluate(()=>({fmt:window.ShambConkins.store.run.board.format,fx:!!document.querySelector('.warp-fx'),busy:window.ShambConkins.store.busy,open:document.getElementById('dialog').open}));if(st.fmt==='warp'&&!st.fx&&!st.busy&&!st.open&&i>4)break;}
 const after=await page.evaluate(b=>{const S=window.ShambConkins,run=S.store.run,P=S.store.profile;return {warp:run.warp?.id,theme:document.body.dataset.theme,gained:run.players.map((p,i)=>(P.rosters[p.owner]||[]).filter(id=>!b[i].includes(id)))};},before);
 console.log(w,'titles',titles.join(' | '));console.log(w,'after',JSON.stringify(after));
 if(after.warp!=='south-park')fail('not in South Park');
 if(after.theme!=='warp-south-park')fail('theme '+after.theme);
 if(!after.gained.every(g=>g.some(id=>/^sp-|^(cartman|butters|randy|towlie)$/.test(id))))fail('each player should gain a South Park character: '+JSON.stringify(after.gained));
 await page.waitForTimeout(1500);const song=await page.evaluate(()=>window.ShambConkins.nowPlaying?.());console.log(w,'music',JSON.stringify(song));
 if(song&&song.zone!=='warp-south-park')fail('music zone '+song.zone);
 await page.waitForTimeout(600);await page.screenshot({path:`${out}/southpark-board-${w}.png`});
 // overview of the whole lair
 await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run;run.camera='overview';S.updateBoard(true);});await page.waitForTimeout(700);await page.screenshot({path:`${out}/southpark-overview-${w}.png`});
 // boss reward: Barbra Streisand (settled through a real boss game win)
 const vill=await page.evaluate(async()=>{const S=window.ShambConkins,P=S.store.profile,owned=new Set([...P.shared,...Object.values(P.rosters).flat()]);
  S.requestGame({id:'boss-mecha-streisand',origin:'board'});return [...owned];});
 for(let i=0;i<40;i++){const r=await page.evaluate(()=>{const s=window.ShambConkins.store.session;if(s?.debug?.bossId){if(s.debug.mode==='intro')s.debug.skipIntro();else if(s.debug.mode==='fight'){s.debug.killBoss();return 'killed';}}const d=document.getElementById('dialog');if(d.open&&!s)(d.querySelector('button.primary')||d.querySelector('button'))?.click();return null;});if(r)break;await page.waitForTimeout(300);}
 const results=[];for(let i=0;i<40;i++){await page.waitForTimeout(500);const t=await click();if(t)results.push(t);const st=await page.evaluate(()=>({warp:window.ShambConkins.store.run.warp?.id,fmt:window.ShambConkins.store.run.board.format}));if(st.fmt!=='warp'&&i>3)break;}
 const won=await page.evaluate(owned=>{const P=window.ShambConkins.store.profile;return P.shared.filter(id=>!owned.includes(id));},vill);
 console.log(w,'boss dialogs',results.join(' | '),'new shared',won);
 if(!won.includes('barbra-streisand'))fail('beating Mecha-Streisand should unlock Barbra Streisand, got '+JSON.stringify(won));
 console.log(w,errors.length?'ERRORS '+errors.join(' | '):'clean');if(errors.length)ok=false;await browser.close();
}
console.log(ok?'south park OK':'south park FAILED');process.exit(ok?0:1);
