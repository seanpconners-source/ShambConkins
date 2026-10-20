const {escapeHTML, clamp}=require("src/utils.js");
const {portraitHTML}=require("src/assets.js");
const {store}=require("src/state.js");
const {sound}=require("src/audio.js");
const {isCpu,cpuHotseat,cpuSkill,cpuBlunder}=require("src/engines/cpuKit.js");
const YAHTZEE_CATEGORIES=['Ones','Twos','Threes','Fours','Fives','Sixes','Three of a kind','Four of a kind','Full house','Small straight','Large straight','Yahtzee','Chance'];
function fiveScore(dice,category){const counts=Array.from({length:6},(_,i)=>dice.filter(d=>d===i+1).length),sum=dice.reduce((a,b)=>a+b,0);if(category<6)return counts[category]*(category+1);const unique=new Set(dice);if(category===6)return Math.max(...counts)>=3?sum:0;if(category===7)return Math.max(...counts)>=4?sum:0;if(category===8)return counts.includes(3)&&counts.includes(2)?25:0;if(category===9)return [1,2,3].some(n=>[n,n+1,n+2,n+3].every(k=>unique.has(k)))?30:0;if(category===10)return [1,2].some(n=>[n,n+1,n+2,n+3,n+4].every(k=>unique.has(k)))?40:0;if(category===11)return Math.max(...counts)===5?50:0;return sum;}
function bestYahtzeeHand(dice,category){if(dice.length!==6)return {dice:[...dice],omit:-1,score:fiveScore(dice,category)};let best=null;for(let i=0;i<6;i++){const hand=dice.filter((_,j)=>j!==i),score=fiveScore(hand,category);if(!best||score>best.score)best={dice:hand,omit:i,score};}return best;}
function yahtzeeScore(dice,category){return bestYahtzeeHand(dice,category).score;}
function yahtzeeTotal(card){const upper=card.slice(0,6).reduce((a,b)=>a+(b||0),0);return card.reduce((a,b)=>a+(b||0),0)+(upper>=63?35:0);}
function toggleYahtzeeHold(held,index){if(!Number.isInteger(index)||index<0||index>=held.length)return false;if(!held[index]&&held.filter(Boolean).length>=5)return false;held[index]=!held[index];return true;}
const PIPS=[[],[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]];
// vs CPU: player 2 keeps the dice that chase its best open box and scores the box worth most over a rough par.
const YAHTZEE_PAR=[3,6,9,12,15,18,20,12,18,22,25,15,22];
function cpuYahtzeeBoxes(card,dice){return card.map((v,i)=>v===null?i:-1).filter(i=>i>=0).map(c=>({c,v:yahtzeeScore(dice,c)-YAHTZEE_PAR[c]})).sort((a,b)=>b.v-a.v);}
function cpuYahtzeeKeep(card,dice){
 const open=c=>card[c]===null,counts=[1,2,3,4,5,6].map(f=>dice.filter(d=>d===f).length),top=Math.max(...counts),keep=new Set();
 const faces=list=>{for(const f of list){const i=dice.findIndex((d,j)=>d===f&&!keep.has(j));if(i>=0)keep.add(i);}return keep;};
 if(top<3&&(open(9)||open(10)))for(const run of [[2,3,4,5,6],[1,2,3,4,5],[3,4,5,6],[2,3,4,5],[1,2,3,4]])if(run.every(f=>counts[f-1]))return faces(run);
 // Most common face; ties go to a face whose upper box is still open, then the higher face.
 let face=6;for(let f=6;f>=1;f--){const better=counts[f-1]>counts[face-1]||counts[f-1]===counts[face-1]&&open(f-1)&&!open(face-1);if(better)face=f;}
 if(counts[face-1]>1||top>1)for(let i=0;i<dice.length&&keep.size<5;i++)if(dice[i]===face)keep.add(i);
 // Full house in reach: keep the pair too.
 if(open(8)&&counts[face-1]===3){const pair=counts.findIndex((n,f)=>n===2&&f!==face-1);if(pair>=0)faces([pair+1,pair+1]);}
 return keep;
}function face(value){return `<span class="die-face">${Array.from({length:9},(_,i)=>`<i class="pip ${PIPS[value].includes(i)?'on':''}"></i>`).join('')}</span>`;}

async function playYahtzee(s){
 const count=s.game.diceCount===6?6:5,cheater=count===6,cards=[Array(13).fill(null),Array(13).fill(null)];
 let player=0,dice=Array.from({length:count},(_,i)=>i%6+1),held=Array(count).fill(false),rolls=0,turn=0,rolling=false,rollAge=0,drag=null,ghost=null,note='Roll the dice onto the felt.';
 const poses=Array.from({length:count},(_,i)=>({x:15+i*70/(count-1),y:45,vx:0,vy:0,angle:0,spin:0}));
 function debug(){s.debug={cards,dice,held,rolls,turn,player,diceCount:count,rolling,rollAge,poses,note};}
 function placeDice(){for(let i=0;i<count;i++){const die=s.body.querySelector(`[data-die="${i}"]`);if(!die||held[i])continue;const p=poses[i],hop=rolling?Math.abs(Math.sin(rollAge*17+i))*Math.max(0,1-rollAge)*18:0;die.style.left=p.x+'%';die.style.top=p.y+'%';die.style.transform=`translate(-50%,-50%) translateY(${-hop}px) rotate(${p.angle}deg)`;if(rolling){const value=1+(Math.floor(rollAge*16)+i)%6;if(die.dataset.face!==String(value)){die.innerHTML=face(value);die.dataset.face=String(value);}}}}
 function draw(){
  s.active=player;s.setScores(cards.map(yahtzeeTotal));s.updateScores();
  const upper=cards[player].slice(0,6).reduce((a,b)=>a+(b||0),0);
  s.body.innerHTML=`<div class="yahtzee-meta trivia-meta">${escapeHTML(s.players[player].name)} · ${cheater?'CHEATER’S · 6 DICE':'YAHTZEE · 5 DICE'} · TURN ${Math.floor(turn/2)+1}/13</div><div class="yahtzee-layout"><section class="yahtzee-table"><div class="yahtzee-stage" id="yahtzee-stage" aria-label="Dice rolling table"><div class="yahtzee-table-player">${portraitHTML(s.players[player].character,'portrait mini','thinking')}<span>${escapeHTML(s.players[player].name)}’s table</span></div>${dice.map((v,i)=>held[i]?'':`<button type="button" data-face="${v}" data-die="${i}" class="yahtzee-die ${rolling?'rolling':''}" aria-label="Hold die ${i+1}: ${v}" ${rolling||!rolls?'disabled':''}>${face(v)}</button>`).join('')}</div><div id="yahtzee-hold" class="yahtzee-hold" aria-label="Held dice tray"><span class="hold-label">HELD · ${held.filter(Boolean).length}/5</span>${dice.map((v,i)=>held[i]?`<button type="button" data-face="${v}" data-die="${i}" class="yahtzee-die held" aria-label="Release die ${i+1}: ${v}" ${rolling?'disabled':''}>${face(v)}</button>`:'').join('')}<span class="hold-help">Drag dice here or tap to hold</span></div><div class="yahtzee-actions"><button id="yahtzee-roll" class="primary" ${rolling||rolls>=3||held.every(Boolean)?'disabled':''}>${rolling?'Rolling…':rolls?`Roll again · ${3-rolls} left`:'Roll dice'}</button><span>${rolls}/3 rolls</span></div><p id="yahtzee-note" class="game-hint" aria-live="polite">${escapeHTML(note)}</p><p class="game-hint">${cheater?'Roll six; score the best five for the category you choose. Hold up to five: the spare die must stay on the table.':'Tap or drag dice to the tray to keep them between rolls.'} Upper section ≥63 earns +35.</p></section><section class="yahtzee-card"><div class="yahtzee-card-heading"><b>Scorecard</b><span>Upper ${upper}/63 ${upper>=63?'· BONUS +35':'· +35 bonus'}</span></div><div class="yahtzee-columns"><span>Category</span>${s.players.map((p,i)=>`<b class="${player===i?'active':''}" data-score-heading="${i}">${escapeHTML(p.name)}</b>`).join('')}</div><div class="scorecard">${YAHTZEE_CATEGORIES.map((name,i)=>`<button data-category="${i}" ${cards[player][i]!==null||rolls===0||rolling?'disabled':''} aria-label="${escapeHTML(name)}: ${cards[player][i]??(rolls?yahtzeeScore(dice,i):'not rolled')}"><span>${name}</span>${s.players.map((p,j)=>`<b data-score-player="${j}" data-preview="${j===player&&cards[j][i]===null&&rolls>0&&!rolling}" class="${j===player?'active':''}" aria-label="${escapeHTML(p.name)}: ${cards[j][i]??(j===player&&rolls&&!rolling?yahtzeeScore(dice,i):'not scored')}">${cards[j][i]??(j===player&&rolls&&!rolling?yahtzeeScore(dice,i):'—')}</b>`).join('')}</button>`).join('')}</div><p class="game-hint"><b>${escapeHTML(s.players[player].name)}’s preview</b> · columns stay in player order<br>Choose one unused category after rolling. Zero is allowed.</p></section></div>`;
  s.on(document.getElementById('yahtzee-roll'),'click',()=>{if(human())roll();});
  s.body.querySelectorAll('[data-category]').forEach(b=>s.on(b,'click',()=>{if(human())void select(+b.dataset.category);}));
  s.body.querySelectorAll('[data-die]').forEach(b=>{
   const i=+b.dataset.die;let suppressClick=false;
   s.on(b,'click',()=>{if(suppressClick){suppressClick=false;return;}if(human())hold(i);});
   s.on(b,'pointerdown',ev=>{if(s.paused||rolling||!rolls||!s.alive||!human())return;drag={i,id:ev.pointerId,x:ev.clientX,y:ev.clientY,moved:false,wasHeld:held[i]};try{b.setPointerCapture(ev.pointerId);}catch{}});
   s.on(b,'pointermove',ev=>{if(!drag||drag.id!==ev.pointerId||s.paused)return;if(Math.hypot(ev.clientX-drag.x,ev.clientY-drag.y)>8)drag.moved=true;if(drag.moved){ev.preventDefault();if(!ghost){ghost=document.createElement('div');ghost.className='yahtzee-drag-ghost';ghost.innerHTML=face(dice[i]);(document.body||s.body).appendChild(ghost);b.style.opacity='.3';}ghost.style.left=ev.clientX+'px';ghost.style.top=ev.clientY+'px';}});
   s.on(b,'pointerup',ev=>{
    if(!drag||drag.id!==ev.pointerId)return;const d=drag;drag=null;if(ghost){ghost.remove();ghost=null;}try{b.releasePointerCapture(ev.pointerId);}catch{}
    if(!d.moved)return;ev.preventDefault();suppressClick=true;
    const tray=document.getElementById('yahtzee-hold').getBoundingClientRect(),inTray=ev.clientX>=tray.left&&ev.clientX<=tray.right&&ev.clientY>=tray.top&&ev.clientY<=tray.bottom;
    if(inTray!==d.wasHeld)hold(i);else draw();
   });
   s.on(b,'pointercancel',()=>{drag=null;if(ghost){ghost.remove();ghost=null;}draw();});
  });placeDice();debug();
 }
 function hold(i){if(s.paused||rolling||!rolls||!s.alive)return;if(!toggleYahtzeeHold(held,i)){note='Five dice are already held. Release one before keeping another.';}else{note=held[i]?'Die moved into the hold tray.':'Die returned to the rolling table.';sound('tap');}draw();}
 function roll(){
  if(s.paused||rolling||rolls>=3||held.every(Boolean)||!s.alive)return;
  dice=dice.map((v,i)=>held[i]&&rolls?v:1+Math.floor(s.random()*6));rolls++;rollAge=0;rolling=true;drag=null;note='Dice are tumbling…';
  for(let i=0;i<count;i++)if(!held[i]){const p=poses[i];p.x=12+s.random()*76;p.y=25+s.random()*40;p.vx=(s.random()-.5)*220;p.vy=(s.random()-.5)*150;p.spin=(s.random()-.5)*1100;}
  sound('roll');draw();if(store.profile?.settings.reducedMotion){rolling=false;poses.forEach(p=>p.angle=0);note='Dice settled. Hold, reroll, or choose a category.';draw();}
 }
 async function select(cat){
  if(s.paused||rolling||rolls===0||cards[player][cat]!==null||!s.alive)return;
  const best=bestYahtzeeHand(dice,cat);cards[player][cat]=best.score;const outcome=`${YAHTZEE_CATEGORIES[cat]}: ${best.score}${cheater?` · spare die ${dice[best.omit]} left out`:''}.`;s.react?.(player,best.score?'happy':'sad');sound(best.score?'win':'tap');turn++;
  if(turn===26)return s.finish(cards.map(yahtzeeTotal),`${cheater?'Cheater’s Yahtzee: best five of six':'Yahtzee: five dice'} · all thirteen categories scored.`);
  player=1-player;rolls=0;held.fill(false);note=outcome+' New turn.';draw();await s.pass(player,`${outcome} Roll up to three times. Drag or tap dice into the tray to hold them, then choose an unused category.${cheater?' Six dice roll; at most five can be held. Each category scores your best five.':''}`);
 }
 const cpu=isCpu(s),human=()=>!(cpu&&player===1);
 // One CPU action per beat: roll, then show its holds, then reroll or score.
 function cpuStep(){
  if(!rolls)return roll();
  const boxes=cpuYahtzeeBoxes(cards[1],dice),best=boxes[0],sk=cpuSkill(s);
  const done=rolls>=3||best.v>=10||[8,9,10,11].includes(best.c)&&best.v>=(sk>.8?6:2);
  if(!done){const keep=cpuYahtzeeKeep(cards[1],dice);if(keep.size<count){if(held.some((h,i)=>h!==keep.has(i))){held.forEach((_,i)=>held[i]=keep.has(i));note=`${s.players[1].name} keeps ${keep.size?[...keep].map(i=>dice[i]).join(' '):'nothing'}.`;sound('tap');draw();return;}return roll();}}
  const pick=cpuBlunder(s)&&boxes.length>1?boxes[Math.floor(Math.random()*Math.min(3,boxes.length))]:best;return select(pick.c);
 }
 if(cpu)cpuHotseat(s,{isTurn:()=>player===1&&!rolling,think:cpuStep,delay:850});
 const clear=()=>{drag=null;if(ghost){ghost.remove();ghost=null;}if(s.alive)draw();};s.resetOnPause?.(clear);s.on(window,'blur',clear);
 s.cleanup(()=>{if(ghost)ghost.remove();});
 s.frame(dt=>{if(!rolling||!s.alive)return;rollAge+=dt;for(let i=0;i<count;i++)if(!held[i]){const p=poses[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=p.spin*dt;const friction=Math.pow(.93,dt*60);p.vx*=friction;p.vy*=friction;p.spin*=friction;if(p.x<8||p.x>92){p.x=clamp(p.x,8,92);p.vx*=-.75;}if(p.y<22||p.y>80){p.y=clamp(p.y,22,80);p.vy*=-.75;}}
  for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)if(!held[i]&&!held[j]){const a=poses[i],b=poses[j],dx=b.x-a.x,dy=(b.y-a.y)*.5,d=Math.hypot(dx,dy);if(d<9){const nx=d?dx/d:1,ny=d?dy/d:0,gap=(9-d)/2;a.x=clamp(a.x-nx*gap,8,92);b.x=clamp(b.x+nx*gap,8,92);a.y=clamp(a.y-ny*gap*2,22,80);b.y=clamp(b.y+ny*gap*2,22,80);[a.vx,b.vx]=[b.vx*.8,a.vx*.8];[a.vy,b.vy]=[b.vy*.8,a.vy*.8];}}
  if(rollAge>=1.05){rolling=false;poses.forEach(p=>p.angle=0);note=rolls===3?'Last roll. Choose a category to score.':'Dice settled. Hold, reroll, or choose a category.';sound('tick');draw();}else{placeDice();debug();}
 });
 draw();await s.pass(0,`${cheater?'Cheater’s Yahtzee: six dice on the table; score the best five. Hold at most five so the spare can reroll.':'Classic Yahtzee: five dice, up to three rolls.'} Both players play the full thirteen-category scorecard. Dice can be tapped or dragged into the hold tray.`);
}

Object.assign(exports,{YAHTZEE_CATEGORIES,bestYahtzeeHand,yahtzeeScore,yahtzeeTotal,toggleYahtzeeHold,playYahtzee});