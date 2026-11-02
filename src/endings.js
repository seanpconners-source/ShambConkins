// Endings (ROADMAP E10-E13). A run that stops after the Level III boss gets the FAKE ending: deliberately cheap and a little
// unsatisfying (broken NES congratulations, a credits roll that gives up, Frank's empty chair, a hint that something is
// missing below the Spirit castle). A run that beats the Level IV boss gets the TRUE ending: dawn, the two characters walk
// in, the players suddenly invent ridiculous lore about them (E12), real credits from this run, THE END.
// Both can be skipped, with an "are you sure?" (E13). playEnding(kind,info) plays it here and (fx) on the other phone of
// an online board game; info = {players:[{name,char,charName,source,points}],games:[titles],bosses:[names],seed}.
const {fx}=require("src/netHooks.js");
const {portraitURL}=require("src/assets.js");
const {store}=require("src/state.js");
const {tone,playFanfare}=require("src/audio.js");
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function hash(str){let h=2166136261;for(const ch of String(str))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;}
// E12: two players making up lore about their own characters. {A}/{B} = player names, {a}/{b} = characters, {as}/{bs} = shows
const LORE=[
 ['A','Fun fact: {a} was the original voice of the {bs} theme song. Uncredited. Legal reasons.'],
 ['B','Everyone knows {b} invented the high five. It’s in the {bs} director’s cut.'],
 ['A','{a} and {b} went to summer camp together. {a} was the counselor. Nobody talks about what happened at the lake.'],
 ['B','That’s why {b} still can’t hear a banjo without crying.'],
 ['A','In the expanded universe, {a} is technically {b}’s step-uncle. Twice.'],
 ['B','And {b} holds the world record for longest time spent inside a {as} episode without being cast.'],
 ['A','{a} was born on a Tuesday. In 1994. And also in 1871. It’s complicated.'],
 ['B','{b} was the fourth Ghostbuster. They cut it because he was too good.'],
 ['A','Nobody believes me, but {a} wrote the Chardee MacDennis rulebook. Mind, Body, Spirit. And the fourth one.'],
 ['B','{b} has been to Level IV before. That’s where the scar comes from. Not the visible one.'],
 ['A','{a}’s middle name is literally “Danger.” First name is also “Danger.” Last name: pending.'],
 ['B','This whole board game? Canon. It happens between seasons of {bs}. Look it up.']];
const SAME_SOURCE=[['A','We both came out of {as}. Which means, legally, this was a crossover episode.'],['B','A crossover episode that nobody asked for and everyone will remember.']];
function lore(info,n=6){const [p,q]=info.players,r=hash(info.seed+'lore');const fill=t=>t.replace(/\{A\}/g,p.name).replace(/\{B\}/g,q.name).replace(/\{a\}/g,p.charName).replace(/\{b\}/g,q.charName).replace(/\{as\}/g,p.source||'their show').replace(/\{bs\}/g,q.source||'their show');
 const start=(r%(LORE.length/2))*2,lines=[];for(let i=0;i<n;i++)lines.push(LORE[(start+i)%LORE.length]);if(p.source&&p.source===q.source)lines.splice(2,0,...SAME_SOURCE);
 return lines.map(([who,t])=>({who:who==='A'?0:1,text:fill(t)}));}
// ---- the player: a full-screen overlay running a list of scenes; Skip asks first
function playEnding(kind,info){fx('ending',kind,info);return runEnding(kind,info);}
function runEnding(kind,info){return new Promise(done=>{
 document.getElementById('ending')?.remove();const el=document.createElement('div');el.id='ending';el.className='ending '+kind;document.body.append(el);
 el.innerHTML=`<div class="en-stage"></div><button type="button" class="en-skip">Skip ▸▸</button><div class="en-confirm" hidden><p>Skip the ending? It only plays when you finish a run.</p><div><button type="button" class="en-keep">Keep watching</button><button type="button" class="en-yes">Skip it</button></div></div>`;
 const stage=el.querySelector('.en-stage'),confirm=el.querySelector('.en-confirm');let over=false,paused=false;const finish=()=>{if(over)return;over=true;el.classList.add('out');setTimeout(()=>{el.remove();done();},450);};
 el.querySelector('.en-skip').onclick=()=>{paused=true;confirm.hidden=false;};el.querySelector('.en-keep').onclick=()=>{paused=false;confirm.hidden=true;};el.querySelector('.en-yes').onclick=finish;
 const wait=ms=>new Promise(res=>{let left=ms,last=performance.now();const tick=()=>{if(over)return res();const now=performance.now();if(!paused)left-=now-last;last=now;if(left<=0)res();else requestAnimationFrame(tick);};requestAnimationFrame(tick);});
 const show=html=>{stage.innerHTML=html;stage.classList.remove('in');void stage.offsetWidth;stage.classList.add('in');};
 const beep=(f,d=.08)=>{if(store.profile?.settings?.sound)tone(f,d,.03,'square');};
 const face=(p,mood='win',cls='')=>{let u=null;try{u=portraitURL(p.char,mood)||portraitURL(p.char,'normal');}catch{}return u?`<img class="en-face ${cls}" src="${esc(u)}" alt="">`:`<div class="en-face ${cls} en-noface">${esc(p.charName[0]||'?')}</div>`;};
 const typeLine=async(sel,text,cps=26)=>{const t=stage.querySelector(sel);if(!t)return;for(let i=1;i<=text.length&&!over;i++){t.textContent=text.slice(0,i);if(i%3===0)beep(kind==='fake'?660:440,.03);await wait(1000/cps);}};
 (async()=>{const [p,q]=info.players;
  if(kind==='fake'){
   show(`<p class="en-nes en-big">CONGRATULATION.</p>`);beep(523,.2);await wait(1800);
   show(`<p class="en-nes"></p>`);await typeLine('.en-nes','THIS STORY IS HAPPY END. THANK YOU.',14);await wait(1400);
   show(`<p class="en-nes">A WINNER IS YOU</p><div class="en-row">${face(p,'think','sm')}${face(q,'think','sm')}</div>`);await wait(2200);
   show(`<div class="en-credits fake"><p>THE END?</p><p>DIRECTED BY<br>FRANK REYNOLDS</p><p>PRODUCED BY<br>FRANK REYNOLDS</p><p>CATERING<br>…</p></div>`);await wait(4200);
   show(`<p class="en-small">The credits stopped. Nobody came to clap.</p><div class="en-chair">🪑</div><p class="en-small">Frank’s chair is empty. His flask is still warm.</p>`);await wait(3600);
   show(`<p class="en-small">Somewhere below the Spirit castle, something is still waiting.</p><p class="en-nes en-tiny">(This was not the real ending.)</p>`);await wait(3400);
  }else{
   if(store.profile?.settings?.sound)try{playFanfare();}catch{}
   show(`<p class="en-title">Level IV is quiet.</p><p class="en-small">For the first time all night, nothing is screaming.</p>`);await wait(3000);
   show(`<div class="en-row walk">${face(p,'win')}${face(q,'win')}</div><p class="en-small">${esc(p.name)} as ${esc(p.charName)} · ${esc(q.name)} as ${esc(q.charName)}</p>`);await wait(3200);
   for(const l of lore(info)){const who=info.players[l.who];show(`<div class="en-talk p${l.who+1}">${face(who,l.who?'silly':'think','sm')}<div class="en-bubble"><b>${esc(who.name)}</b><span class="en-said"></span></div></div>`);await typeLine('.en-said',l.text,34);await wait(1500);if(over)break;}
   show(`<p class="en-title">Mind. Body. Spirit.</p><p class="en-small">And the one that was never in the box.</p>`);await wait(2600);
   const rows=[['A SHAMBCONKINS EXPEDITION',''],['STARRING',`${p.charName} (${p.name})<br>${q.charName} (${q.name})`],['FINAL SCORE',`${esc(p.name)} ${p.points} · ${esc(q.name)} ${q.points}`],
    ...(info.bosses.length?[['BOSSES DEFEATED',info.bosses.slice(0,12).map(esc).join('<br>')]]:[]),...(info.games.length?[['GAMES PLAYED TONIGHT',info.games.slice(0,24).map(esc).join('<br>')]]:[]),
    ['SPECIAL THANKS','Frank Reynolds<br><small>(whereabouts unknown)</small>'],['A GAME BY','Sean Conners'],['','The game playin’ the game,<br>disguised as another game.']];
   show(`<div class="en-credits"><div class="en-roll">${rows.map(([h,t])=>`<p>${h?`<span>${esc(h)}</span><br>`:''}${t}</p>`).join('')}</div></div>`);
   const roll=stage.querySelector('.en-roll');roll.style.animationDuration=Math.max(14,8+rows.length*2.2)+'s';await wait(Math.max(14,8+rows.length*2.2)*1000);
   show(`<p class="en-end">THE END</p>`);beep(392,.3);await wait(3000);}
  finish();})();});}
// what an ending needs to know about the run (plain data: it goes to the other phone too)
function endingInfo(run,character,bossName,gameTitle){return {seed:run.seed,players:run.players.map(p=>{const c=character(p.character)||{};return {name:p.name,char:p.character,charName:c.name||p.name,source:c.source||'',points:p.points|0};}),
 games:[...new Set((run.gameHistory||[]).map(g=>gameTitle(g.id)).filter(Boolean))],bosses:(run.bossesBeaten||[]).map(id=>bossName(id)).filter(Boolean)};}
Object.assign(exports,{playEnding,runEnding,endingInfo,lore});
