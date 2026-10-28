const {newUno, unoLegalCards, unoPlay, unoDraw, unoPass, unoCall, unoResult, UNO_COLORS}=require("src/engines/unoRules.js");
const {escapeHTML}=require("src/utils.js");
const {portraitHTML}=require("src/assets.js");
const {sound}=require("src/audio.js");
const {casinoTap}=require("src/engines/casinoTable.js");
const {isCpu,isOnline,cpuHotseat,cpuSkill,cpuBlunder,pickRandom}=require("src/engines/cpuKit.js");
const glyph={skip:'⊘',reverse:'⇄',draw2:'+2',wild:'WILD',wild4:'+4'};
function unoCardHTML(card){return `<span class="uno-corner">${glyph[card.value]||card.value}</span><span class="uno-symbol">${glyph[card.value]||card.value}</span><span class="uno-corner bottom">${glyph[card.value]||card.value}</span>`;}
async function uno(s){
 const state=newUno(s.random),cpu=isCpu(s);let view='handoff',busy=false,pendingWild=null,left=20,lastTop=null;
 // Online (s.online): each phone always shows its own hand and plays its own turns; the other phone's plays {p,c}, draws
 // {d}, passes {x}, UNO calls {u} and time-outs {to} arrive through s.online (same deck order from the shared seed).
 const NOREL={relay:false};   // Uno sends its own moves online (below), not through the casino table relay
 const net=isOnline(s)?s.online:null,theirs=()=>!!net&&state.turn===net.remote;if(net)s.hotseat=true;
 s.body.classList.add('uno-body');s.body.innerHTML=`<div class="uno-opponent" id="uno-opponent"></div><div class="uno-table"><div class="uno-deck"><div class="uno-card card-back"><strong>SHAMB<br>UNO</strong></div><small>DRAW PILE</small></div><div class="uno-discard"><div id="uno-top" class="uno-card"></div><small id="uno-color"></small></div><div class="uno-announcer"><b id="uno-status">PASS THE PHONE</b><span id="uno-clock">20s</span><small>Match color or symbol · no stacking</small></div></div><div id="uno-hand-label" class="uno-hand-label"></div><div id="uno-hand" class="uno-hand" aria-label="Your private hand"></div><div id="uno-colors" class="uno-colors" hidden>${UNO_COLORS.map(color=>`<button class="uno-color-${color}" data-uno-color="${color}">${color.toUpperCase()}</button>`).join('')}</div><div class="uno-actions"><button id="uno-draw">Draw ONE card</button><button id="uno-pass">Pass · keep the drawn card</button><button id="uno-call" class="primary">Call UNO!</button></div><p class="uno-help">Skip / Reverse / +2 / +4 give you another turn in this two-player game. +4 requires no card in the current color. Call UNO before playing down to one.</p>`;
 const handRoot=document.getElementById('uno-hand'),topRoot=document.getElementById('uno-top'),cards=new Map();
 const wait=ms=>s.wait?s.wait(ms):s.delay(ms);
 function render(message=''){
  const owner=state.turn,shown=net?net.me:owner,op=1-shown,visible=net?view!=='result':view==='playing'&&!(cpu&&owner===1),legal=new Set(theirs()||view!=='playing'?[]:unoLegalCards(state).map(c=>c.id)),top=state.discard.at(-1);
  document.getElementById('uno-opponent').innerHTML=`${portraitHTML(s.players[op].character,'portrait mini')}<strong>${escapeHTML(s.players[op].name)}</strong><span>${state.hands[op].length} cards · HAND HIDDEN</span><div class="uno-backed-hand">${Array.from({length:Math.min(5,state.hands[op].length)},()=>'<i class="uno-mini-back">?</i>').join('')}</div>`;
  if(lastTop!==top.id){topRoot.className='uno-card uno-color-'+(top.color||'wild')+' card-land';topRoot.innerHTML=unoCardHTML(top);lastTop=top.id;}
  document.getElementById('uno-color').textContent=state.color.toUpperCase()+' IS ACTIVE';
  document.getElementById('uno-color').className='uno-ink-'+state.color;
  document.getElementById('uno-hand-label').innerHTML=visible?`${portraitHTML(s.players[shown].character,'portrait mini')}<b>${escapeHTML(s.players[shown].name)} · ${state.hands[shown].length} cards</b><span>${theirs()?`${escapeHTML(s.players[owner].name)} is playing on their phone…`:state.phase==='after-draw'?'Only the card you just drew may be played.':'Play a highlighted card or draw one.'}</span>`:cpu&&owner===1&&view==='playing'?`<b>${escapeHTML(s.players[1].name)} is thinking…</b>`:'<b>HAND HIDDEN · PASS THE PHONE</b>';
  if(!visible){handRoot.innerHTML='';cards.clear();}else{
   const ids=new Set(state.hands[shown].map(c=>c.id));for(const[id,node]of cards)if(!ids.has(id)){node.remove();cards.delete(id);}
   for(const card of state.hands[shown]){let node=cards.get(card.id);if(!node){node=document.createElement('button');node.className='uno-card uno-color-'+(card.color||'wild')+' card-enter';node.setAttribute('data-uno-card',card.id);node.innerHTML=unoCardHTML(card);node.setAttribute('aria-label',(card.color||'Wild')+' '+(glyph[card.value]||card.value));node.style.setProperty('--card-delay',Math.min(cards.size,6)*45+'ms');cards.set(card.id,node);casinoTap(s,node,()=>play(card.id),NOREL);}node.disabled=busy||pendingWild!==null||!legal.has(card.id);node.classList.toggle('playable',legal.has(card.id));node.classList.toggle('newly-drawn',state.drawnId===card.id);handRoot.appendChild(node);}
  }
  document.getElementById('uno-draw').disabled=!visible||theirs()||busy||pendingWild!==null||state.phase!=='playing';document.getElementById('uno-pass').disabled=!visible||theirs()||busy||pendingWild!==null||state.phase!=='after-draw';
  const call=document.getElementById('uno-call');call.disabled=!visible||theirs()||busy||state.hands[owner].length!==2;call.textContent=state.called?'UNO called ✓':'Call UNO!';
  document.getElementById('uno-colors').hidden=pendingWild===null;if(cpu&&owner===1&&/^Your turn/.test(message))message=`${s.players[1].name}’s turn`;document.getElementById('uno-status').textContent=message||`${s.players[owner].name}’s turn`;s.active=owner;s.updateScores();
  s.debug={engine:'uno',state,view,busy,pendingWild,left,bot:net?()=>{if(theirs()||view!=='playing'||busy||state.ended||s.paused)return null;const legal=unoLegalCards(state);if(legal.length){void play(legal[0].id,legal[0].color?null:'red');return 'play';}if(state.phase==='playing'){void draw();return 'draw';}void pass();return 'pass';}:null};
 }
 async function handoff(previous,message){
  if(state.ended){view='result';render(message);s.finish(unoResult(state),state.reason);return;}
  left=20;pendingWild=null;busy=false;
  if(state.turn!==previous){view='handoff';render('HAND HIDDEN');if(!await s.pass(state.turn,message+' Memorize your cards privately; your opponent’s hand stays hidden.','Ready — show my cards'))return;}
  view='playing';render(message);
 }
 async function play(id,color=null,remote=false){
  if(!remote&&s.paused||!s.alive||busy||view!=='playing'||theirs()&&!remote)return;
  const card=state.hands[state.turn].find(c=>c.id===id);if(!unoLegalCards(state).some(c=>c.id===id))return;
  if(!card.color&&!color){pendingWild=id;render('Choose the active color');return;}
  if(net&&!remote)net.send({p:id,c:color});
  pendingWild=null;busy=true;const owner=state.turn;cards.get(id)?.classList.add('card-leave');render('Playing the card…');if(!await wait(230))return;
  const event=unoPlay(state,id,color,s.random);if(!event.ok){busy=false;render();return;}
  if(state.turn!==owner)view='handoff';
  sound('card');const message=event.forgotten?'Forgot UNO! Draw two.':event.drawn.length?`${s.players[1-owner].name} draws ${event.drawn.length}; you play again.`:event.again?'Opponent skipped · you play again.':'Your turn.';
  render(message);if(!await wait(event.drawn.length||event.forgotten?650:350))return;await handoff(owner,message);
 }
 async function draw(remote=false){if(!remote&&s.paused||!s.alive||busy||view!=='playing'||state.phase!=='playing'||theirs()&&!remote)return;if(net&&!remote)net.send({d:1});busy=true;const event=unoDraw(state,s.random);sound('card');busy=false;render(event.canPlay?'Play the new card, or pass.':'Keep this card and pass.');}
 async function pass(remote=false){if(!remote&&s.paused||!s.alive||busy||view!=='playing'||theirs()&&!remote)return;const owner=state.turn;if(!unoPass(state))return;if(net&&!remote)net.send({x:1});busy=true;await handoff(owner,'Your opponent passed.');}
 // vs CPU: player 2 plays from a hidden hand. Holds wilds for last, fires action cards when the human is close to out,
 // picks the colour it holds most, and (usually) remembers to call UNO.
 function cpuUnoMove(){const hand=state.hands[1],legal=unoLegalCards(state),sk=cpuSkill(s),foe=state.hands[0].length;
  if(hand.length===2&&!state.called&&Math.random()<.55+sk*.5)unoCall(state);
  if(!legal.length)return state.phase==='playing'?draw():pass();
  const held=c=>hand.filter(h=>h.color===c).length;
  const rank=c=>(c.color?0:-30)+(c.value==='wild4'?(foe<=2?60:-10):0)+(['skip','reverse','draw2'].includes(c.value)?(foe<=2?40:10):0)+(/^\d$/.test(c.value)?+c.value:0)+(c.color?held(c.color)*2:0);
  const card=cpuBlunder(s)?pickRandom(legal):legal.slice().sort((a,b)=>rank(b)-rank(a))[0],color=card.color?null:UNO_COLORS.slice().sort((a,b)=>held(b)-held(a))[0];
  return play(card.id,color);}
 if(cpu)cpuHotseat(s,{isTurn:()=>state.turn===1&&view==='playing'&&!busy&&!state.ended&&pendingWild===null,think:cpuUnoMove,delay:900});
 casinoTap(s,document.getElementById('uno-draw'),draw,NOREL);casinoTap(s,document.getElementById('uno-pass'),pass,NOREL);casinoTap(s,document.getElementById('uno-call'),()=>{if(!busy&&view==='playing'&&!theirs()&&unoCall(state)){net?.send({u:1});sound('win');render('UNO! Now play down to one.');}},NOREL);
 function timeUp(){const owner=state.turn;if(state.phase==='playing')unoDraw(state,s.random);unoPass(state);busy=true;pendingWild=null;void handoff(owner,'Time! One card drawn if needed; turn passed.');}
 if(net)void (async()=>{for(;;){const m=await net.next();if(!m||!s.alive)return;
  while(s.alive&&!state.ended&&(busy||view!=='playing'||state.turn!==net.remote))await new Promise(r=>setTimeout(r,60));if(!s.alive||state.ended)return;
  if(m.u){if(unoCall(state)){sound('win');render(`${s.players[net.remote].name} calls UNO!`);}}else if(m.p!=null)await play(m.p,m.c||null,true);else if(m.d)await draw(true);else if(m.x)await pass(true);else if(m.to)timeUp();}})();
 for(const button of document.querySelectorAll('[data-uno-color]'))casinoTap(s,button,()=>{if(pendingWild!==null)void play(pendingWild,button.dataset.unoColor);},NOREL);
 render();if(!await s.pass(0,'Seven private cards each. Match the active color or symbol, or draw one; only that newly drawn card may then be played. No draw stacking. In two-player Uno, Skip, Reverse and draw cards return the turn to you. Call UNO before playing your second-last card. Twenty seconds per turn; 80-turn safety limit.','Ready — show my hand'))return;
 view='playing';render();s.frame(dt=>{if(view!=='playing'||busy||state.ended)return;left-=dt;document.getElementById('uno-clock').textContent=Math.ceil(Math.max(0,left))+'s';if(left<=0&&!theirs()){net?.send({to:1});timeUp();}});
}

Object.assign(exports,{unoCardHTML,uno});