// Who Wants to Be a Shambillionaire? (id trivia-hardcore), the TV show's format: each player climbs their own 15-rung money
// ladder, safe havens at $1,000 and $32,000, three lifelines, "final answer", walk away with what you have. A wrong answer
// drops you to the last safe haven. Highest bank wins. Pass and play: P1's ladder, then P2's. Vs CPU: the CPU plays its
// ladder where you can watch it. Online: both phones play their own ladder at the same time ({p} progress, {fin} the bank).
// Our own look and music (no theme tune): a synth drone that tightens as the money climbs. Screen = stage canvas + DOM.
const {store}=require('src/state.js');
const {shuffle,escapeHTML:e}=require('src/utils.js');
const {portraitHTML}=require('src/assets.js');
const {audioContext,holdMusic,releaseMusic}=require('src/audio.js');
const {triviaPool}=require('src/engines/trivia.js');
const {isCpu,cpuSkill,cpuTriviaPick,cpuThinkTime}=require('src/engines/cpuKit.js');
const {fullBleed}=require('src/engines/fullBleed.js');

const LADDER=[100,200,300,500,1000,2000,4000,8000,16000,32000,64000,125000,250000,500000,1000000];
const SAFE=new Set([4,9]);
const money=n=>'$'+n.toLocaleString('en-US');
const levelOf=r=>r<5?'easy':r<10?'medium':r<14?'hard':'impossible';
// Your chance of getting help right, by question level (audience, friend).
const HELP={easy:.92,medium:.78,hard:.6,impossible:.42};

const CSS=`.wm-ui{position:absolute;inset:0;z-index:4;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto minmax(0,1fr) auto;grid-template-areas:"top top" "say tree" "q q";gap:6px 10px;padding:var(--wm-top,44px) max(10px,env(safe-area-inset-right)) calc(36px + env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));color:#fff;font-family:"SC Nunito",system-ui,sans-serif;touch-action:manipulation}
 @media (min-aspect-ratio:1/1){.wm-ui{grid-template-areas:"top tree" "say tree" "q tree"}}
 .wm-top{grid-area:top;display:flex;align-items:center;gap:8px;min-width:0}
 .wm-lifes{display:flex;gap:6px}
 .wm-ui button.wm-life{width:clamp(46px,13vmin,62px);height:clamp(32px,8.6vmin,42px);min-height:0;margin:0;padding:0;border:2px solid #9fb6ff;border-radius:50%;background:radial-gradient(#1d3aa8,#050d45);color:#fff;font:800 clamp(10px,2.6vmin,13px)/1 "SC Nunito",sans-serif;box-shadow:0 0 10px #4d8dff66}
 .wm-ui button.wm-life:disabled{opacity:.28;border-color:#556;box-shadow:none}
 .wm-ui button.wm-walk{margin:0 0 0 auto;min-height:32px;padding:4px 12px;border:1.5px solid #ffd76a;border-radius:999px;background:#0008;color:#ffd76a;font:800 12px/1.1 "SC Nunito",sans-serif;box-shadow:none}
 .wm-ui button.wm-walk:disabled{opacity:.3}

 .wm-say{grid-area:say;min-width:0;min-height:0;overflow:hidden;align-self:start;display:flex;flex-direction:column;gap:8px}
 .wm-host{padding:7px 11px;border-radius:12px;background:#02062ecc;border:1px solid #4d6fe066;font:700 clamp(12px,3vmin,15px)/1.3 "SC Nunito",sans-serif}
 .wm-host:empty{display:none}
 .wm-host .portrait{width:42px;height:42px;float:left;margin:0 8px 2px 0}
 .wm-aud{display:flex;gap:6px;align-items:flex-end;height:clamp(64px,18vmin,110px);padding:6px 8px 0;border-radius:12px;background:#02062ecc;border:1px solid #4d6fe066}
 .wm-aud div{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;font:800 11px/1.2 "SC Nunito",sans-serif}
 .wm-aud i{display:block;width:70%;background:linear-gradient(#ffd76a,#ff9a1f);border-radius:3px 3px 0 0;transition:height .9s cubic-bezier(.2,.8,.2,1)}
 .wm-tree{grid-area:tree;width:clamp(128px,36vmin,178px);display:grid;grid-auto-rows:minmax(0,1fr);margin:0;padding:4px;list-style:none;border-radius:10px;background:#02062ed9;border:1px solid #4d6fe066;font:800 clamp(10.5px,2.6vmin,13.5px)/1 "SC Nunito",sans-serif;color:#ff9a1f;min-height:0}
 .wm-tree li{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:0 7px;border-radius:999px;min-height:0;white-space:nowrap}
 .wm-tree li.safe{color:#fff}.wm-tree li.done{opacity:.55}
 .wm-tree li.now{background:linear-gradient(#ffb43a,#e8780f);color:#10062a}
 .wm-q{grid-area:q;display:flex;flex-direction:column;gap:6px;min-width:0}
 .wm-qt,.wm-ui button.wm-a{--cut:clamp(10px,3vmin,18px);clip-path:polygon(var(--cut) 0,calc(100% - var(--cut)) 0,100% 50%,calc(100% - var(--cut)) 100%,var(--cut) 100%,0 50%)}
 .wm-qt{display:flex;align-items:center;justify-content:center;text-align:center;min-height:clamp(58px,15vmin,92px);padding:8px calc(var(--cut) + 8px);background:linear-gradient(#0f2a9e,#040a48 55%,#0a1c7c);box-shadow:inset 0 0 0 2px #9fb6ff;font:800 clamp(13.5px,3.5vmin,18px)/1.22 "SC Nunito",sans-serif}
 .wm-ans{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
 @media (max-aspect-ratio:3/4){.wm-ans{grid-template-columns:minmax(0,1fr)}}
 .wm-ui button.wm-a{display:flex;align-items:center;gap:7px;min-height:clamp(38px,10vmin,52px);margin:0;padding:3px calc(var(--cut) + 6px);border:0;border-radius:0;text-align:left;color:#fff;background:linear-gradient(#0f2a9e,#040a48 55%,#0a1c7c);box-shadow:inset 0 0 0 2px #9fb6ff;font:700 clamp(12.5px,3.2vmin,16px)/1.15 "SC Nunito",sans-serif;transition:background .15s}
 .wm-ui button.wm-a b{color:#ff9a1f;flex:none}
 .wm-ui button.wm-a:disabled{cursor:default;color:#fff}
 .wm-ui button.wm-a.gone{visibility:hidden}
 .wm-ui button.wm-a.sel{background:linear-gradient(#ffb43a,#e8780f);color:#10062a}.wm-ui button.wm-a.sel b{color:#fff}
 .wm-ui button.wm-a.ok{background:linear-gradient(#55e06a,#128a2c);color:#fff;animation:wm-flash .3s 4 alternate}.wm-ui button.wm-a.ok b{color:#fff}
 @keyframes wm-flash{to{filter:brightness(1.7)}}
 .wm-final{display:flex;gap:8px;justify-content:center;min-height:42px}
 .wm-ui button.wm-go{margin:0;min-height:42px;padding:6px 18px;border:0;border-radius:999px;background:#ffd76a;color:#10062a;font:400 clamp(17px,4.4vmin,22px)/1 "SC Bangers",Impact,sans-serif;letter-spacing:.05em;box-shadow:0 4px 14px #ffb43a66}
 .wm-ui button.wm-go:disabled{visibility:hidden}
 .wm-end{position:absolute;inset:0;z-index:6;display:grid;place-items:center;text-align:center;background:#02041fd9;padding:20px;animation:wm-in .35s}
 .wm-end h2{margin:0;font:400 clamp(40px,13vmin,84px)/1 "SC Bangers",Impact,sans-serif;color:#ffd76a;text-shadow:0 0 28px #ff9a1f}
 .wm-end p{margin:8px 0 0;font:800 clamp(14px,3.6vmin,20px)/1.3 "SC Nunito",sans-serif;color:#fff}
 @keyframes wm-in{from{opacity:0;transform:scale(1.06)}}`;

// Original sound: a pulsing drone that gets tighter and louder up the ladder, plus short stings.
function makeSound(){
 let a=null,bus=null,osc=[],lfo=null,on=false;
 const ok=()=>{if(!store.profile?.settings.music&&!store.profile?.settings.sound)return false;a=audioContext();if(!a)return false;if(!bus){bus=a.createGain();bus.gain.value=.5;bus.connect(a.destination);}return true;};
 const note=(f,t,d,v,type='sawtooth')=>{const o=a.createOscillator(),g=a.createGain(),l=a.createBiquadFilter();l.type='lowpass';l.frequency.value=2200;o.type=type;o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(l).connect(g).connect(bus);o.start(t);o.stop(t+d+.05);};
 return {
  drone(r){if(!ok()||!store.profile.settings.music)return;this.stop();const k=r/14,root=55*2**(Math.floor(r/3)/12),g=a.createGain(),f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=260+900*k;g.gain.value=.05+.09*k;
   osc=[root,root*1.5,root*2.01].map(fr=>{const o=a.createOscillator();o.type='sawtooth';o.frequency.value=fr;o.connect(f);o.start();return o;});f.connect(g).connect(bus);
   lfo=a.createOscillator();const dep=a.createGain();lfo.frequency.value=1.1+2.6*k;dep.gain.value=.035+.06*k;lfo.connect(dep).connect(g.gain);lfo.start();on=g;},
  stop(){for(const o of [...osc,lfo])try{o?.stop();}catch{}osc=[];lfo=null;if(on)try{on.disconnect();}catch{}on=false;},
  lock(){if(!ok())return;const t=a.currentTime;note(82,t,.5,.3);note(165,t,.4,.16);},
  right(r){if(!ok())return;const t=a.currentTime,b=196*2**(Math.min(r,14)/14);[1,1.26,1.5,2].forEach((m,i)=>note(b*m,t+i*.09,.34+i*.05,.2));},
  wrong(){if(!ok())return;const t=a.currentTime;[110,104,98,73].forEach((f,i)=>note(f,t+i*.2,.55,.3));},
  big(){if(!ok())return;const t=a.currentTime;[262,330,392,523,659,784,1047].forEach((f,i)=>note(f,t+i*.11,.8,.2));},
  tap(){if(!ok())return;note(660,a.currentTime,.07,.06,'triangle');}};
}

async function millionaire(s){
 const [,g]=s.canvas(680,780,{fill:true}),fb=fullBleed(s,{bg:'#02041f'});
 const net=s.online||null,me=net?net.me:0,cpu=isCpu(s),snd=makeSound(),scores=[0,0];if(cpu)s.hotseat=true;
 const css=document.createElement('style');css.textContent=CSS;document.head.append(css);
 s.body.style.position='relative';const ui=document.createElement('div');ui.className='wm-ui';ui.style.setProperty('--wm-top',(fb.top||40)+6+'px');s.body.append(ui);
 holdMusic(6*3600);s.cleanup(()=>{css.remove();ui.remove();snd.stop();releaseMusic();});
 // one set of 15 questions per player, hardest last; each list is dealt from the shared seed
 const seen=new Set(net?[]:store.profile.recentTrivia||[]);
 const deal=()=>LADDER.map((_,r)=>{const pool=shuffle(triviaPool('mixed',levelOf(r)),s.random),q=pool.find(x=>!seen.has(x.id))||pool[0];seen.add(q.id);return q;});
 const sets=[deal(),deal()];
 const st={player:net?me:0,rung:0,q:null,order:[],sel:null,phase:'wait',life:{fifty:true,aud:true,tel:true},gone:new Set()};
 let theirBank=null,theirRung=0,wake=null,glow=0;

 // ---- stage: dark studio, sweeping lights, a floor glow that climbs with the money
 s.frame((dt,time)=>{if(!s.alive)return;const W=s.W,H=s.H,t=time;glow+=(st.rung/14-glow)*Math.min(1,dt*2);
  const bg=g.createRadialGradient(W/2,H*.55,10,W/2,H*.55,Math.max(W,H)*.75);bg.addColorStop(0,`hsl(${232+glow*30},75%,${16+glow*12}%)`);bg.addColorStop(1,'#02041f');g.fillStyle=bg;g.fillRect(0,0,W,H);
  g.save();g.globalCompositeOperation='lighter';for(let i=0;i<6;i++){const a=Math.sin(t*(.3+i*.07)+i*2)*.7,x=W*(i+.5)/6;g.fillStyle=`hsla(${225+i*14},90%,60%,${.05+.05*glow})`;g.beginPath();g.moveTo(x,-10);g.lineTo(x+Math.sin(a)*H-60,H);g.lineTo(x+Math.sin(a)*H+60,H);g.closePath();g.fill();}
  const fl=g.createRadialGradient(W/2,H*1.02,10,W/2,H*1.02,W*.8);fl.addColorStop(0,`hsla(${40-glow*20},100%,60%,${.08+.25*glow})`);fl.addColorStop(1,'transparent');g.fillStyle=fl;g.fillRect(0,0,W,H);g.restore();});

 // ---- the screen
 function draw(host=''){const q=st.q,free=st.phase==='ask'&&!autoTurn();
  ui.innerHTML=`<div class="wm-top"><div class="wm-lifes"><button class="wm-life" data-life="fifty" ${st.life.fifty&&free?'':'disabled'} aria-label="Fifty fifty">50:50</button><button class="wm-life" data-life="aud" ${st.life.aud&&free?'':'disabled'} aria-label="Ask the audience">👥</button><button class="wm-life" data-life="tel" ${st.life.tel&&free?'':'disabled'} aria-label="Phone a friend">☎</button></div><button class="wm-walk" data-walk ${free&&st.rung>0?'':'disabled'}>Walk away ${st.rung?money(LADDER[st.rung-1]):''}</button></div>
   <div class="wm-say"><div class="wm-host">${host}</div><div class="wm-extra"></div>${net?`<div class="wm-host wm-them">${themLine()}</div>`:''}</div>
   <ol class="wm-tree" aria-label="Money ladder">${LADDER.map((v,i)=>({v,i})).reverse().map(({v,i})=>`<li class="${i===st.rung?'now':i<st.rung?'done':''}${SAFE.has(i)?' safe':''}"><span>${i+1}</span><span>${money(v)}</span></li>`).join('')}</ol>
   <div class="wm-q"><div class="wm-qt">${q?e(q.q):''}</div><div class="wm-ans">${st.order.map((idx,i)=>`<button class="wm-a${st.gone.has(idx)?' gone':''}${st.sel===idx?' sel':''}" data-a="${idx}" ${free?'':'disabled'}><b>${'ABCD'[i]}:</b><span>${e(q.answers[idx])}</span></button>`).join('')}</div>
   <div class="wm-final"><button class="wm-go" data-final ${free&&st.sel!==null?'':'disabled'}>FINAL ANSWER</button></div></div>`;
  for(const b of ui.querySelectorAll('[data-a]'))s.on(b,'click',()=>{if(st.phase!=='ask')return;st.sel=+b.dataset.a;snd.tap();draw(`${e(st.q.answers[st.sel])}… is that your final answer?`);});
  for(const b of ui.querySelectorAll('[data-life]'))s.on(b,'click',()=>useLife(b.dataset.life));
  const go=ui.querySelector('[data-final]');if(go)s.on(go,'click',()=>{if(st.phase==='ask'&&st.sel!==null)wake?.({answer:st.sel});});
  const walk=ui.querySelector('[data-walk]');if(walk)s.on(walk,'click',()=>{if(st.phase==='ask'&&st.rung>0)wake?.({walk:true});});}
 const autoTurn=()=>cpu&&st.player===1;
 const themLine=()=>`${e(s.players[1-me].name)}: ${theirBank!==null?`finished on ${money(theirBank)}`:theirRung?`on ${money(LADDER[theirRung-1])}`:'starting'}`;
 const hostLine=()=>`Question ${st.rung+1} for ${money(LADDER[st.rung])}.`;
 const extra=html=>{const box=ui.querySelector('.wm-extra');if(box)box.innerHTML=html;};
 const position=idx=>'ABCD'[st.order.indexOf(idx)];

 // ---- lifelines
 function useLife(kind){if(st.phase!=='ask'||!st.life[kind])return;st.life[kind]=false;snd.tap();const q=st.q,lvl=q.difficulty;
  if(kind==='fifty'){const wrong=shuffle(st.order.filter(i=>i!==q.correct),s.random).slice(0,2);wrong.forEach(i=>st.gone.add(i));if(st.gone.has(st.sel))st.sel=null;draw(`Computer, take away two wrong answers.`);return;}
  const live=st.order.filter(i=>!st.gone.has(i));
  if(kind==='aud'){const knows=HELP[lvl]*(.75+Math.random()*.25),share=Object.fromEntries(live.map(i=>[i,i===q.correct?knows*100:Math.random()*(100-knows*100)]));
   const sum=live.reduce((n,i)=>n+share[i],0);draw('The studio audience has voted.');
   extra(`<div class="wm-aud">${st.order.map(i=>{const pct=live.includes(i)?Math.round(share[i]/sum*100):0;return `<div>${pct}%<i style="height:${pct*.7}%"></i>${position(i)}</div>`;}).join('')}</div>`);return;}
  const owner=s.players[st.player].owner,mine=(store.profile.rosters?.[owner]||[]).filter(id=>id!==s.players[st.player].character),friend=mine.length?mine[Math.floor(Math.random()*mine.length)]:s.players[1-st.player].character;
  const right=Math.random()<HELP[lvl],wrong=live.filter(i=>i!==q.correct),say=right||!wrong.length?q.correct:wrong[Math.floor(Math.random()*wrong.length)],sure=right?55+Math.floor(Math.random()*44):30+Math.floor(Math.random()*40);
  draw(`${portraitHTML(friend,'portrait')}<b>Ring ring…</b> “I’m ${sure}% sure it’s ${position(say)}: ${e(q.answers[say])}.”`);}

 // ---- one question: resolves {answer} or {walk}
 function ask(r){st.rung=r;st.q=sets[st.player][r];st.order=shuffle([0,1,2,3].filter(i=>st.q.answers[i]!==undefined),s.random);st.sel=null;st.gone=new Set();st.phase='ask';
  if(!net&&!s.practice){store.profile.recentTrivia=[...(store.profile.recentTrivia||[]).filter(id=>id!==st.q.id),st.q.id].slice(-3000);if(store.run)store.run.triviaSeen=[...(store.run.triviaSeen||[]).filter(id=>id!==st.q.id),st.q.id].slice(-3000);}
  snd.drone(r);draw(hostLine());
  if(autoTurn())return cpuAnswer(r);
  return new Promise(res=>{wake=res;});}
 async function cpuAnswer(r){draw(`${e(s.players[1].name)} is thinking…`);if(!await s.wait(cpuThinkTime(s,st.q)*1000))return {walk:true};
  // the CPU takes the money rather than guess at the top of its nerve
  if(r>=8&&Math.random()<.1*(r-7)*(1.2-cpuSkill(s)))return {walk:true};
  const q=st.q,live=st.order.filter(i=>!st.gone.has(i)).map(index=>({index}));
  if(r>=5&&st.life.fifty&&Math.random()<.4){st.life.fifty=false;shuffle(st.order.filter(i=>i!==q.correct),s.random).slice(0,2).forEach(i=>st.gone.add(i));draw('Computer, take away two wrong answers.');if(!await s.wait(1100))return {walk:true};return {answer:pickLive()};}
  const pos=cpuTriviaPick(s,q,live);st.sel=live[pos]?.index??live[0].index;draw(`${e(q.answers[st.sel])}… is that your final answer?`);if(!await s.wait(1000))return {walk:true};return {answer:st.sel};
  function pickLive(){const opts=st.order.filter(i=>!st.gone.has(i)).map(index=>({index})),p=cpuTriviaPick(s,q,opts);return opts[p]?.index??opts[0].index;}}

 // ---- one player's ladder: returns their bank
 async function playLadder(i){
  st.player=i;st.life={fifty:true,aud:true,tel:true};st.rung=0;
  for(let r=0;r<LADDER.length;r++){
   const res=await ask(r);if(!s.alive)return 0;wake=null;
   if(res.walk){st.phase='end';await banner(money(r?LADDER[r-1]:0),`${e(s.players[i].name)} walks away.`);return r?LADDER[r-1]:0;}
   st.sel=res.answer;st.phase='lock';snd.stop();snd.lock();draw('Final answer. Let’s see…');
   const pace=autoTurn()?.5:1;if(!await s.wait((900+Math.min(2200,r*170))*pace))return 0;
   const right=res.answer===st.q.correct,btn=a=>ui.querySelector(`[data-a="${a}"]`);
   btn(st.q.correct)?.classList.add('ok');
   if(!right){snd.wrong();const safe=r>9?32000:r>4?1000:0;if(!await s.wait(2100))return 0;await banner(money(safe),`It was ${e(st.q.answers[st.q.correct])}.`);return safe;}
   snd.right(r);draw(`Correct! ${money(LADDER[r])}.`);btnOk(st.q.correct);
   if(net)net.send({p:r+1});scores[i]=LADDER[r];s.setScores(scores);
   if(!await s.wait((SAFE.has(r)?1700:1200)*pace))return 0;
   if(SAFE.has(r))snd.big();
  }
  snd.big();await banner('$1,000,000',`${e(s.players[i].name)} is a SHAMBILLIONAIRE!`);return LADDER[14];}
 function btnOk(a){ui.querySelector(`[data-a="${a}"]`)?.classList.add('ok');}
 async function banner(big,small){snd.stop();const end=document.createElement('div');end.className='wm-end';end.innerHTML=`<div><h2>${big}</h2><p>${small}</p></div>`;ui.append(end);await s.wait(2300);end.remove();}

 s.debug={engine:'millionaire',st,scores,sets,LADDER,bot(){if(st.phase!=='ask'||autoTurn())return '';if(st.sel===null){const open=[...ui.querySelectorAll('[data-a]:not(.gone):not(:disabled)')];open[Math.floor(Math.random()*open.length)]?.click();return 'pick';}ui.querySelector('[data-final]:not(:disabled)')?.click();return 'final';},answerRight(){st.sel=st.q.correct;wake?.({answer:st.q.correct});}};

 // ---- flow
 if(net){
  // both ladders at once; the other phone's progress arrives as moves
  const read=(async()=>{for(;;){const m=await net.next();if(m===null){if(theirBank===null)theirBank=0;return;}if(m.p)theirRung=m.p;if(typeof m.fin==='number')theirBank=m.fin;const t=ui.querySelector('.wm-them');if(t)t.textContent=themLine();if(theirBank!==null)return;}})();
  const bank=await playLadder(me);if(!s.alive)return;scores[me]=bank;net.send({fin:bank});st.phase='wait';st.q=null;st.order=[];draw(`You banked ${money(bank)}. Waiting for ${e(s.players[1-me].name)}…`);
  await read;if(!s.alive)return;scores[1-me]=theirBank||0;s.setScores(scores);
  s.finish(scores,`${s.players[0].name} ${money(scores[0])} · ${s.players[1].name} ${money(scores[1])}.`);return;}
 for(const i of [0,1]){
  if(!await s.pass(i,`Fifteen questions to $1,000,000. Tap an answer, then FINAL ANSWER. A wrong answer drops you to the last safe haven ($1,000, then $32,000). You have 50:50, Ask the Audience and Phone a Friend, once each.`,'Let’s play',i?{summary:`${s.players[0].name} banked ${money(scores[0])}.`}:{}))return;
  scores[i]=await playLadder(i);if(!s.alive)return;s.setScores(scores);}
 s.finish(scores,`${s.players[0].name} ${money(scores[0])} · ${s.players[1].name} ${money(scores[1])}.`);
}
Object.assign(exports,{millionaire});
