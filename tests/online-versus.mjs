// Online versus (turn-based board games on two phones): src/duel.js relays each move, cpuKit's s.net applies the other
// phone's moves. Needs the Worker running locally: `cd cloudflare && npx wrangler dev --local --port 8787`.
// Two browser contexts join one room; for each game Sean challenges Amber, both bots play random legal moves only on
// their own turn, the boards must stay identical, and both result cards must agree. Also checked: chess Resign reaches
// the other phone, a dropped connection loses no move, and leaving a game hands it to the other phone.
// GAMES=id,id to pick games; screenshots in /tmp/claude-0/sc/ov-*.
import {launchBrowser,root,screenshotPath} from './lib.mjs';
import {versusStep as step} from './versusBot.mjs';
import path from 'node:path';import {pathToFileURL} from 'node:url';
const HOST=process.env.SC_NET_HOST||'ws://127.0.0.1:8787';
const ALL=['four-lights','wopr-grid','strategema-grid','greed-island-mancala','office-dots-boxes','matrix-ultimate','trek-mini-chess','deadite-checkers','ten-forward-chess'];
const GAMES=process.env.GAMES?process.env.GAMES.split(','):ALL;
const url=pathToFileURL(path.resolve(root,process.env.SHAMB_FILE||'dist/ShambConkins.html')).href;
let failed=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)failed++;};
const browser=await launchBrowser();
async function phone(tag){
 const ctx=await browser.newContext({viewport:{width:390,height:780}});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(h=>{try{localStorage.setItem('sc-net-host',h);}catch{}},HOST);
 await p.goto(url);await p.waitForSelector('.title-screen',{timeout:60000});await p.waitForFunction(()=>!document.getElementById('boot'));
 // the arcade only offers unlocked games: unlock the ones under test
 await p.evaluate(ids=>{const pr=window.ShambConkins.store.profile;for(const k of ['unlockedGames','gamesUnlocked'])if(Array.isArray(pr[k]))for(const id of ids)if(!pr[k].includes(id))pr[k].push(id);},GAMES);
 return {p,errors,tag};
}
const act=(ph,name,data={})=>ph.p.evaluate(([name,data])=>{const b=document.createElement('button');b.dataset.action=name;Object.assign(b.dataset,data);document.body.append(b);b.click();b.remove();},[name,data]);
const dialogText=ph=>ph.p.evaluate(()=>document.querySelector('#dialog[open]')?.innerText||'');
const choose=(ph,label)=>ph.p.evaluate(l=>{const b=[...document.querySelectorAll('#dialog[open] button')].find(b=>b.textContent.trim().startsWith(l));b?.click();return !!b;},label);
const waitDialog=(ph,re,ms=20000)=>ph.p.waitForFunction(r=>new RegExp(r).test(document.querySelector('#dialog[open]')?.innerText||''),re.source,{timeout:ms});
async function join(ph,who){
 await act(ph,'arcade');await ph.p.waitForSelector('.solo-strip');
 await act(ph,'online-mode');await waitDialog(ph,/Play online/);
 await ph.p.fill('#net-room','Versus Room '+process.pid);await ph.p.check(`input[name="net-who"][value="${who}"]`);
 await choose(ph,'Join room');
}
const inGame=ph=>ph.p.evaluate(()=>!!window.ShambConkins.store.session);
const nap=ms=>new Promise(r=>setTimeout(r,ms));

async function playGame(id,{resignAfter=0,dropAt=0,leaveAt=0,drawAt=0}={}){
 await act(A,'duel-propose',{id});await waitDialog(A,/Waiting for Amber/);
 await waitDialog(B,/Sean challenges you/);check(/move by move/.test(await dialogText(B)),`${id}: Amber is challenged to a move-by-move game`);
 await choose(B,'Play');
 for(const ph of [A,B]){await waitDialog(ph,/ONLINE DUEL/);check(/player [12]/.test(await dialogText(ph)),`${id}: ${ph.tag} start card says which player they are`);await choose(ph,'Start game');}
 for(const ph of [A,B])await ph.p.waitForFunction(()=>!!window.ShambConkins.store.session?.net,null,{timeout:20000});
 const seats=[await A.p.evaluate(()=>window.ShambConkins.store.session.net.seat),await B.p.evaluate(()=>window.ShambConkins.store.session.net.seat)];
 check(seats[0]!==seats[1],`${id}: the phones play different seats (${seats})`);
 let moves=0,mismatch=0,worst=0,shot=false,dropped=false,left=false,offered=false;const t0=Date.now();
 while(Date.now()-t0<240000){
  if(!await inGame(A)&&!await inGame(B))break;
  const resign=resignAfter&&moves>=resignAfter;
  const a=await step(A,{resign}),b=await step(B,{resign});
  if(a.moved||b.moved)moves++;
  if(a.resigned||b.resigned){check(true,`${id}: ${a.resigned?'Sean':'Amber'} resigns after ${moves} moves`);}
  // both idle on the same turn with every move delivered: the boards must be the same
  if(a.idle&&b.idle&&a.turn===b.turn&&a.moves===b.got&&b.moves===a.got){if(a.fp!==b.fp){mismatch++;worst=Math.max(worst,mismatch);}else mismatch=0;}
  if(!shot&&moves>=6){shot=true;for(const ph of [A,B])await ph.p.screenshot({path:screenshotPath(`ov-${id}-${ph.tag}.png`)});}
  if(dropAt&&!dropped&&moves>=dropAt&&a.idle&&b.idle){dropped=true;
   // Sean's connection drops; whatever he plays meanwhile must still reach Amber after the reconnect
   const before=await B.p.evaluate(()=>window.ShambConkins.store.session.net.got);
   await A.p.evaluate(()=>window.ShambConkins.net.state().ws?.close());
   let r={};for(let k=0;k<20&&!r.moved;k++){await nap(150);r=await step(A);}
   await B.p.waitForFunction(n=>window.ShambConkins.store.session?.net?.got>n,before,{timeout:20000}).then(()=>check(true,`${id}: a move made while offline arrives after the reconnect`),()=>check(false,`${id}: move made while offline never arrived`));
   if(r.moved)moves++;
  }
  // both phones idle on the same turn with every move delivered, twice 400 ms apart (s.debug only refreshes each frame)
  const settled=async()=>{const read=async()=>{const [x,y]=[await step(A,{peek:true}),await step(B,{peek:true})];return x.idle&&y.idle&&x.turn===y.turn&&x.moves===y.got&&y.moves===x.got?JSON.stringify([x,y]):null;};
   const one=await read();if(!one)return null;await nap(400);return one===await read()?JSON.parse(one)[0]:null;};
  const st=drawAt&&!offered&&moves>=drawAt?await settled():null;
  if(st){offered=true;
   // whoever is to move offers a draw and moves on; the other accepts on their own turn (an offer only counts once the
   // phone shows it in s.debug.agreed: a tap during a move animation is refused)
   const X=st.turn===seats[0]?A:B,Y=X===A?B:A,offer=async ph=>{for(let k=0;k<60;k++){await step(ph,{offer:true,noMove:true});await nap(200);
    if(await ph.p.evaluate(()=>{const s=window.ShambConkins.store.session;return !s||s.debug.agreed?.[s.net.seat];}))return true;}return false;};
   check(await offer(X),`${id}: ${X===A?'Sean':'Amber'} offers a draw`);
   let r={};for(let k=0;k<20&&!r.moved;k++){r=await step(X);if(!r.moved)await nap(150);}moves++;
   check(await offer(Y),`${id}: ${Y===A?'Sean':'Amber'} accepts on their turn`);}
  if(leaveAt&&!left&&moves>=leaveAt){left=true;await act(B,'exit-game');await waitDialog(B,/Leave the game/);check(/Sean wins if you leave/.test(await dialogText(B)),`${id}: leaving warns that Sean wins`);await choose(B,'Leave');}
  await nap(120);
 }
 check(worst<4,`${id}: boards stayed identical on both phones (${moves} moves${worst?`, ${worst} odd reads`:''})`);
 await waitDialog(A,/wins|Dead heat|left/,30000);await waitDialog(B,/wins|Dead heat|left/,30000);
 const ra=await dialogText(A),rb=await dialogText(B);
 const sa=ra.match(/(\d+) – (\d+)/),sb=rb.match(/(\d+) – (\d+)/),title=t=>t.split('\n')[0];
 check(sa&&sb&&sa[1]===sb[2]&&sa[2]===sb[1],`${id}: result cards agree (Sean ${sa?.[0]} / Amber ${sb?.[0]})`);
 if(drawAt)check(/Dead heat/.test(ra)&&/Dead heat/.test(rb),`${id}: the agreed draw ends the game on both phones (${title(ra)} / ${title(rb)})`);
 else if(leaveAt)check(/Amber left\. You win/.test(ra)&&/Sean wins the duel/.test(rb),`${id}: leaving gives Sean the win on both phones (${title(ra)} / ${title(rb)})`);
 else check(/Dead heat/.test(ra)===/Dead heat/.test(rb)&&(/Sean wins/.test(ra)===/Sean wins/.test(rb)),`${id}: same winner on both phones (${title(ra)} / ${title(rb)})`);
 await A.p.screenshot({path:screenshotPath(`ov-${id}-result.png`)});
 for(const ph of [A,B]){await choose(ph,'Back to the room');}await nap(800);
 // the winner's phone may show an unlock card next
 for(const ph of [A,B])for(let k=0;k<6;k++){const t=await dialogText(ph);if(!t)break;console.log(`     (${ph.tag} closes: ${t.split('\n')[0]})`);await ph.p.evaluate(()=>(document.querySelector('#dialog[open] button.primary')||document.querySelector('#dialog[open] button'))?.click());await nap(600);}
}

const A=await phone('A'),B=await phone('B');
await join(A,0);await A.p.waitForFunction(()=>/waiting for player 2/.test(document.querySelector('.net-room')?.innerText||''),null,{timeout:15000});
await join(B,1);await A.p.waitForFunction(()=>/Amber is here/.test(document.querySelector('.net-room')?.innerText||''),null,{timeout:15000});
check(true,'both phones are in the room');
for(const id of GAMES){
 const opts=id==='ten-forward-chess'?{drawAt:10}:id==='deadite-checkers'?{resignAfter:40}:id==='greed-island-mancala'?{dropAt:4}:{};
 await playGame(id,opts);
}
if(!process.env.GAMES||GAMES.includes('four-lights'))await playGame('four-lights',{leaveAt:4});
check(!A.errors.length&&!B.errors.length,'no page errors '+[...A.errors,...B.errors].slice(0,2).join(' | '));
await browser.close();console.log(failed?`${failed} online versus check(s) failed`:'ONLINE VERSUS OK');process.exit(failed?1:0);
