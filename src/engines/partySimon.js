// Simon Says Face-Off: a shared, growing sequence. Repeat everything, then add one pad. First mistake loses.
const {PartyUI,sfx,head,pname,esc,burst,banner,titleCard,extraCSS,tone,shake}=require("src/engines/partyKit.js");

const PADS=[{c:'#2fb86a',lit:'#9dffc4',f:415,s:'▲',n:'green'},{c:'#e0453a',lit:'#ffb0a8',f:310,s:'●',n:'red'},{c:'#f2b822',lit:'#fff0a0',f:252,s:'■',n:'yellow'},{c:'#2f6fe0',lit:'#a8c8ff',f:209,s:'★',n:'blue'}];
const CSS=`
.pk-simon{--pk-bg:radial-gradient(ellipse at 50% 0,#3a3a5c,#1a1a2e 70%);--pk-accent:#f2b822}
.sm-top{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px 0}
.sm-len{font:900 clamp(28px,8vw,44px)/1 Arial;text-align:center}
.sm-len small{display:block;font:800 11px Arial;letter-spacing:.14em;opacity:.7}
.sm-status{font:800 clamp(14px,3.6vw,19px)/1.2 Arial;text-align:center;min-height:2.4em;display:flex;align-items:center;justify-content:center;padding:0 12px}
.sm-board{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:6px 10px 10px}
.sm-grid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:clamp(8px,2vw,16px);width:min(100%,calc(100vh - 330px),560px);aspect-ratio:1;min-width:230px}
.sm-pad{appearance:none;border:0;border-radius:24px;min-height:0;padding:0;color:rgba(255,255,255,.85);font:900 clamp(40px,12vw,84px)/1 Arial;background:var(--c);box-shadow:0 8px 0 rgba(0,0,0,.4),inset 0 -10px 0 rgba(0,0,0,.18),inset 0 8px 0 rgba(255,255,255,.2);filter:brightness(.62);transition:filter .08s,transform .08s;cursor:pointer;touch-action:manipulation}
.sm-pad.on{filter:brightness(1.35) saturate(1.2);transform:scale(1.04);box-shadow:0 0 38px 8px var(--lit),inset 0 8px 0 rgba(255,255,255,.4)}
.sm-pad.dead{filter:brightness(.4);pointer-events:none}
.sm-dots{display:flex;gap:4px;justify-content:center;flex-wrap:wrap;min-height:12px;padding:0 12px}
.sm-dots i{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.2)}
.sm-dots i.d{background:#fff}
`;

async function simon(s){
 extraCSS('sm-css',CSS);
 const ui=new PartyUI(s,{theme:'simon',scroll:false});
 const names=[pname(s,0),pname(s,1)],score=[0,0],seq=[];
 s.debug={seq,score};
 let phase='idle',onTap=null;
 const rand=s.random;
 s.hint('Watch the pads light up. On your turn repeat the whole sequence from the start, then tap one extra pad to add it. The sequence speeds up as it grows. Make a mistake or run out of time and you lose.');
 const render=(P,len)=>{ui.set(`<div class="sm-top">${head(s,0,P===0?'think':'normal','sm')}<div class="sm-len" data-len>${len}<small>SEQUENCE</small></div>${head(s,1,P===1?'think':'normal','sm')}</div>
  <div class="sm-status" data-st>&nbsp;</div><div class="sm-dots" data-dots></div>
  <div class="sm-board"><div class="sm-grid">${PADS.map((p,i)=>`<button class="sm-pad" data-pad="${i}" style="--c:${p.c};--lit:${p.lit}" aria-label="${p.n} pad">${p.s}</button>`).join('')}</div></div>`);};
 const st=h=>{const e=ui.root.querySelector('[data-st]');if(e)e.innerHTML='<span>'+h+'</span>';};
 const dots=(n,done)=>{const e=ui.root.querySelector('[data-dots]');if(e)e.innerHTML=Array.from({length:n},(_,i)=>`<i class="${i<done?'d':''}"></i>`).join('');};
 const pad=i=>ui.root.querySelector(`[data-pad="${i}"]`);
 async function flash(i,ms,sound=true){const e=pad(i);if(!e)return false;e.classList.add('on');if(sound)tone(PADS[i].f,Math.max(.12,ms/1000),.08,'triangle');if(!await s.wait(ms))return false;e.classList.remove('on');return true;}
 s.on(ui.root,'pointerdown',ev=>{const b=ev.target.closest?.('[data-pad]');if(!b||phase==='watch'||!onTap||s.paused)return;ev.preventDefault?.();onTap(+b.dataset.pad);});
 let idle=0,limit=0;
 s.frame(dt=>{if(limit>0&&(phase==='input')){idle+=dt;if(idle>limit&&onTap){const f=onTap;f(-1);}}});
 const speedFor=n=>Math.max(200,560-n*24);

 if(!await titleCard(s,'🔴','Pads light up in a growing pattern. Repeat the whole pattern from the start, then add one new pad for your opponent. First mistake loses.','Let’s play'))return;
 let P=0,loser=-1;
 while(loser<0){
  render(P,seq.length);
  phase='idle';onTap=null;
  if(!await s.pass(P,seq.length?`Watch the ${seq.length}-pad pattern, repeat it, then add ONE more pad.`:`You start! Tap any pad to begin the pattern.`,'Start my turn',{countdown:2}))return;
  s.shared=false;s.active=P;s.updateScores();
  render(P,seq.length);
  if(seq.length){
   phase='watch';st('👀 Watch closely…');dots(seq.length,0);
   if(!await s.wait(500))return;
   const d=speedFor(seq.length);
   for(const i of seq){if(!await flash(i,d))return;if(!await s.wait(d*.45))return;}
  }
  // input
  let k=0;const need=seq.length;
  const result=await new Promise(resolve=>{
   phase='input';idle=0;limit=need?6:10;
   st(need?`🎯 ${esc(names[P])}: repeat the pattern (0/${need})`:`✨ ${esc(names[P])}: tap any pad to start`);dots(need,0);
   onTap=async i=>{
    if(phase!=='input')return;
    if(i<0){phase='busy';onTap=null;resolve({fail:'slow'});return;}
    idle=0;
    if(k<need){
     if(i!==seq[k]){phase='busy';onTap=null;tone(120,.5,.1,'sawtooth');pad(i)?.classList.add('on');resolve({fail:'wrong',i});return;}
     k++;dots(need,k);sfx.tap();flash(i,160);
     st(k<need?`🎯 ${esc(names[P])}: repeat the pattern (${k}/${need})`:`➕ Now ADD one more pad!`);
     if(k===need)idle=0;
    }else{phase='busy';onTap=null;flash(i,260);resolve({add:i});}
   };
  });
  if(!s.alive)return;
  if(result.fail){
   loser=P;sfx.bad();shake(ui.root);
   ui.root.querySelectorAll('.sm-pad').forEach(b=>b.classList.add('dead'));
   banner(ui.root,result.fail==='slow'?'TOO SLOW!':'WRONG PAD!','#ffb3b3');
   st(result.fail==='slow'?'Time ran out!':`It should have been ${PADS[seq[k]].n.toUpperCase()}.`);
   if(result.fail==='wrong'&&seq[k]!=null){ui.root.querySelectorAll('.sm-pad.on').forEach(b=>b.classList.remove('on'));pad(seq[k])?.classList.remove('dead');pad(seq[k])?.classList.add('on');}
   if(!await s.wait(2200))return;
  }else{
   seq.push(result.add);score[P]=seq.length;s.setScores([...score]);
   st(`✅ Added! The pattern is now ${seq.length} long.`);
   const l=ui.root.querySelector('[data-len]');if(l)l.innerHTML=`${seq.length}<small>SEQUENCE</small>`;
   sfx.ok();if(!await s.wait(900))return;
   P=1-P;
  }
 }
 const win=1-loser;
 s.shared=true;s.updateScores();phase='idle';onTap=null;
 ui.set(`<div class="pk-screen"><div class="pk-over">Simon Says · result</div><div class="pk-row">${head(s,win,'win','xl')}${head(s,loser,'sad','lg')}</div>
  <h1 class="pk-h1 pk-pop">${esc(names[win])} outlasts ${esc(names[loser])}!</h1><div class="pk-sub">The pattern reached ${seq.length} pads before ${esc(names[loser])} slipped.</div><button class="pk-btn" data-act="go">Finish</button></div>`);
 sfx.cheer();burst(ui.root,{emojis:['🔴','🟢','🟡','🔵','⭐'],n:30,spread:240});
 await new Promise(res=>{ui.handler=a=>{if(a==='go')res(1);};});if(!s.alive)return;
 s.finish([...score],`${names[win]} won the memory duel; the longest pattern completed was ${Math.max(...score)}.`);
}
Object.assign(exports,{simon});
