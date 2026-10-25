// Native online games (src/netPlay.js): two phones in one room play a CPU-opponent game head to head. Needs the Worker
// running locally like tests/online.mjs (SC_NET_HOST). Each phone's bot only taps what is enabled on its own screen
// (its own answers, moves and hand-off/next buttons), so the game only finishes if every move reaches the other phone.
// Checks: both phones deal the same game (same first question / board), it reaches the result on both, the two result
// cards agree (mine–theirs mirrored), no page errors. GAMES=id,id (default the batch-1 games); screenshots onn-*.
import {launchBrowser,root,screenshotPath} from './lib.mjs';
import path from 'node:path';import {pathToFileURL} from 'node:url';
const HOST=process.env.SC_NET_HOST||'ws://127.0.0.1:8787',LIMIT=+process.env.LIMIT_S||240;
const GAMES=(process.env.GAMES||'trivia-mixed,trivia-lightning,trivia-wager,trivia-survival,paddys-beer-pong,shamb-uno,ten-forward-chess,four-lights,strategema-grid,full-shambyahtzee,cheaters-yahtzee,blackjack,five-card,roulette,bond-baccarat,traitors-guess-who,battleship-fog,liars-dice,clue-whodunit,monopoly-speed-die,monopoly-auction,simon-faceoff,price-bid-off,django-hangman-showdown,django-hangman-wanted,matrix-ultimate,greed-island-mancala,office-dots-boxes,trek-mini-chess,wopr-grid,smb3-nspade,clue-lineup,django-hangman,taskmaster-curling,bug-artillery,happy-gilmore-golf,color-of-money,baseketball-shootout,task-tallest-thing,fast-quarter-mile,block-battle,shred-hero,candy-color-dash,chutes-ladder-rush').split(',');
const url=pathToFileURL(path.resolve(root,process.env.SHAMB_FILE||'dist/ShambConkins.html')).href;
let failed=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)failed++;};
const browser=await launchBrowser();
async function phone(tag){
 const ctx=await browser.newContext({viewport:{width:390,height:780}});const p=await ctx.newPage();const errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(h=>{try{localStorage.setItem('sc-net-host',h);}catch{}},HOST);
 await p.goto(url);await p.waitForSelector('.title-screen',{timeout:60000});await p.waitForFunction(()=>!document.getElementById('boot'));
 await p.evaluate(()=>{window.ShambConkins.store.profile.settings.reducedMotion=true;});
 return {p,errors,tag};
}
const act=(ph,name,data={})=>ph.p.evaluate(([name,data])=>{const b=document.createElement('button');b.dataset.action=name;Object.assign(b.dataset,data);document.body.append(b);b.click();b.remove();},[name,data]);
const choose=(ph,label)=>ph.p.evaluate(l=>{const b=[...document.querySelectorAll('#dialog[open] button')].find(b=>b.textContent.trim().startsWith(l));b?.click();return !!b;},label);
const waitDialog=(ph,re,ms=20000)=>ph.p.waitForFunction(r=>new RegExp(r).test(document.querySelector('#dialog[open]')?.innerText||''),re.source,{timeout:ms});
const A=await phone('Sean'),B=await phone('Amber');
for(const [ph,who] of [[A,0],[B,1]]){await act(ph,'online-home');await waitDialog(ph,/Play online/);await ph.p.fill('#net-room',process.env.ROOM||'Native Night');await ph.p.check(`input[name="net-who"][value="${who}"]`);await choose(ph,'Join room');await ph.p.waitForSelector('.net-room');}
await A.p.waitForFunction(()=>/Amber is here/.test(document.querySelector('.net-room')?.innerText||''),null,{timeout:15000});
// Bot step: tap whatever this phone may tap. Game-specific hooks (s.debug.bot) play moves where buttons aren't enough.
const step=ph=>ph.p.evaluate(()=>{
 const S=window.ShambConkins,store=S.store,s=store.session,dlg=document.getElementById('dialog');
 if(dlg.open){const t=dlg.querySelector('#dialog-title')?.innerText||'';if(/wins the duel|Dead heat|left\. You win|You stopped/i.test(t))return 'result:'+t;
  const b=[...dlg.querySelectorAll('button')].find(b=>!b.disabled&&/Start game|Continue|OK|Welcome/i.test(b.innerText));if(b){b.click();return 'dlg:'+t;}return 'wait:'+t;}
 if(!s)return 'idle';
 const ready=document.querySelector('.pass-overlay [data-ready]');if(ready){ready.click();return 'ready';}
 if(typeof s.debug?.bot==='function'){const r=s.debug.bot();if(r)return 'bot:'+r;}
 const ans=[...document.querySelectorAll('[data-answer]:not([disabled]),[data-wager]:not([disabled])')];if(ans.length){ans[Math.floor(Math.random()*ans.length)].click();return 'answer';}
 const next=[...document.querySelectorAll('#trivia-next button,#mode-next button,.game-controls button.primary')].find(b=>!b.disabled&&b.offsetParent);if(next){next.click();return 'next';}
 return 'play';
});
for(const id of GAMES){
 console.log('== '+id);
 await act(A,'duel-propose',{id});await waitDialog(B,/challenges you/);await choose(B,'Play');
 for(const ph of [A,B])await waitDialog(ph,/Head to head/,15000).then(()=>choose(ph,'Start game'),()=>check(false,`${ph.tag}: rules card says head to head`));
 await A.p.waitForFunction(()=>!!window.ShambConkins.store.session,null,{timeout:20000});await B.p.waitForFunction(()=>!!window.ShambConkins.store.session,null,{timeout:20000});
 const same=await Promise.all([A,B].map(ph=>ph.p.evaluate(()=>{const s=window.ShambConkins.store.session;return JSON.stringify({seed:s.seed,me:s.online?.me,q:s.debug?.question?.id??s.debug?.rounds?.[0]?.id??null});})));
 const [ja,jb]=same.map(x=>JSON.parse(x));
 check(ja.seed===jb.seed&&ja.me===0&&jb.me===1,`${id}: same seed, Sean plays seat 1 and Amber seat 2`);
 const t0=Date.now();let ra='',rb='',shot=false,counts={};
 const limit=LIMIT*(id==='paddys-beer-pong'&&!process.env.LIMIT_S?1.75:1); // a full Beer Pong match runs to last call, ~4-5 min headless
 while(Date.now()-t0<limit*1000){
  const [a,b]=[await step(A),await step(B)];for(const x of [a,b]){const k=x.split(':')[0];counts[k]=(counts[k]||0)+1;}
  if(!shot&&a.startsWith('play')&&b.startsWith('play')){shot=true;await A.p.screenshot({path:screenshotPath(`onn-${id}-sean.png`)});await B.p.screenshot({path:screenshotPath(`onn-${id}-amber.png`)});}
  if(a.startsWith('result'))ra=a;if(b.startsWith('result'))rb=b;if(ra&&rb)break;
  await A.p.waitForTimeout(200);
 }
 console.log(' steps',JSON.stringify(counts));
 check(ra&&rb,`${id}: both phones reach the result (${ra||'-'} / ${rb||'-'})`);
 if(ra&&rb){
  const [ta,tb]=await Promise.all([A,B].map(ph=>ph.p.evaluate(()=>document.querySelector('#dialog[open]')?.innerText||'')));
  const nums=t=>(t.match(/(\d[\d,]*)\s*–\s*(\d[\d,]*)/)||[]).slice(1,3).map(x=>+x.replace(/,/g,''));
  const [na,nb]=[nums(ta),nums(tb)];
  console.log(' final scores',JSON.stringify(await Promise.all([A,B].map(ph=>ph.p.evaluate(()=>window.__lastScores||null)))));
  check(na.length===2&&nb.length===2&&na[0]===nb[1]&&na[1]===nb[0],`${id}: result cards agree (Sean ${na.join('–')} / Amber ${nb.join('–')})`);
  for(const ph of [A,B])await choose(ph,'Back to the room');
 }else{await A.p.screenshot({path:screenshotPath(`onn-${id}-stuck-sean.png`)});await B.p.screenshot({path:screenshotPath(`onn-${id}-stuck-amber.png`)});
  for(const ph of [A,B])await ph.p.evaluate(()=>{const S=window.ShambConkins;S.store.session?.dispose();S.store.session=null;S.store.busy=false;document.getElementById('dialog').open&&document.getElementById('dialog').close();S.store.dialog=null;});}
 // clear leftover cards (a new character won, toasts) before the next challenge
 for(let i=0;i<40;i++){const open=await Promise.all([A,B].map(ph=>ph.p.evaluate(()=>{const d=document.getElementById('dialog');if(!d.open)return false;const b=[...d.querySelectorAll('button')].find(b=>!b.disabled&&/Welcome|Continue|OK|Back to/i.test(b.innerText));b?.click();return true;})));if(!open.some(Boolean)&&i>4)break;await A.p.waitForTimeout(300);}
 await A.p.waitForTimeout(800);
}
const errs=[...new Set([...A.errors,...B.errors])];check(!errs.length,'no page errors '+errs.slice(0,3).join(' | '));
await browser.close();console.log(failed?`${failed} native online check(s) failed`:'NATIVE ONLINE OK');process.exit(failed?1:0);
