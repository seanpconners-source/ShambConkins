// Hangman Unchained (Django Unchained): full-bleed western hangman with big touch keys.
//  'shared' (django-hangman): both players race on ONE phrase at the same time, each on their own keyboard.
//     A letter belongs to whoever shoots it first; a miss adds a piece to your own cowboy and jams your gun briefly.
//  'turns'  (django-hangman-showdown): one keyboard, players take turns guessing the same phrase (15 s shot clock).
//  'pass'   (django-hangman-wanted): one player writes a phrase (or deals one from the deck), the other guesses; then swap.
// Six bullets = six misses: torso, arms, legs, then the trapdoor drops. Sounds are all synthesized western SFX.
const {fullBleed}=require("src/engines/fullBleed.js");
const {vibrate}=require("src/audio.js");
const {shuffle}=require("src/utils.js");
const {SFX}=require("src/engines/westernSfx.js");
const {PHRASES,CATEGORIES}=require("src/data/hangmanPhrases.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");

const LIVES=6,ROUNDS=3,CLOCK=75,TURN=15,MAXLEN=34;
const ABC=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const isLetter=ch=>ch>='A'&&ch<='Z';
const SLAB='"Rockwell Extra Bold","Rockwell","Roboto Slab","Clarendon","Noto Serif","Georgia",serif';
const SANS='system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
const PC=['#5cb8ff','#ff6f91'];
// P1 dresses like Django (green jacket, brown hat), P2 like Dr. King Schultz (grey coat, black hat, burgundy vest)
const OUTFIT=[{hat:'#6e4524',hatD:'#4a2c15',band:'#2a170b',coat:'#2f7040',coatD:'#1d4a29',shirt:'#eedcb4',vest:'#86602f',scarf:'#c2412e',pants:'#4d3b2a',chaps:'#8f5c30',boot:'#3b2414',glove:'#7c4e28'},
 {hat:'#221e1e',hatD:'#0f0d0d',band:'#7d1d24',coat:'#4a4d55',coatD:'#2c2e34',shirt:'#f4efe3',vest:'#741f29',scarf:'#232323',pants:'#33302e',chaps:'#5a3a22',boot:'#1f1510',glove:'#3d2b1f'}];

// kept for old callers/tests: one letter guess against a word
function hangmanGuess(word,guessed,letter){
 const value=String(letter).toUpperCase();
 if(!/^[A-Z]$/.test(value)||guessed.includes(value))return null;
 const hits=[...word].filter(ch=>ch===value).length,letters=[...guessed,value];
 return {letters,hits,solved:[...word].every(ch=>!/^[A-Z]$/.test(ch)||letters.includes(ch))};
}
function normalizeHangmanAnswer(value){return String(value).toUpperCase().replace(/[^A-Z0-9]/g,'');}
const HANGMAN_WORDS=PHRASES.map(p=>p.text);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rr(x,X,Y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath();}
function inRect(p,r){return r&&p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;}
// wrap the phrase into lines of whole words that fit `cols` tiles; every char keeps its index in the phrase
function wrapPhrase(text,cols){
 const words=[];let cur=[];[...text].forEach((ch,i)=>{if(ch===' '){if(cur.length)words.push(cur);cur=[];}else cur.push({ch,i});});if(cur.length)words.push(cur);
 const lines=[];let line=[];for(const w of words){if(line.length&&line.length+1+w.length>cols){lines.push(line);line=[];}if(line.length)line.push({ch:' ',i:-1});line.push(...w);}
 if(line.length)lines.push(line);return lines;
}
function fitPhrase(text,w,h){
 const longest=Math.max(1,...text.split(' ').map(s=>s.length));
 for(let t=Math.floor(Math.min(64,h));t>=9;t--){const cell=t*1.1,cols=Math.floor((w+t*.1)/cell);if(cols<longest)continue;const lines=wrapPhrase(text,cols);if(lines.length*t*1.3-t*.3<=h)return {t,cell,lines};}
 const t=9,cols=Math.max(1,Math.floor(w/(t*1.1)));return {t,cell:t*1.1,lines:wrapPhrase(text,cols)};
}
// best grid of n keys inside r (largest key), last row centred
function keyGrid(r,n,gap=5,maxW=104){
 let best=null;for(let cols=4;cols<=13;cols++){const rows=Math.ceil(n/cols),kw=(r.w-gap*(cols-1))/cols,kh=(r.h-gap*(rows-1))/rows;if(kw<12||kh<12)continue;const sc=Math.min(kw,kh*1.15);if(!best||sc>best.sc+.01)best={cols,rows,kw,kh,sc};}
 if(!best)best={cols:13,rows:2,kw:r.w/13,kh:r.h/2};
 let {cols,rows,kw,kh}=best;kw=Math.min(kw,maxW);kh=Math.min(kh,kw*1.2,92);
 const gw=cols*kw+(cols-1)*gap,gh=rows*kh+(rows-1)*gap,x0=r.x+(r.w-gw)/2,y0=r.y+(r.h-gh)/2,out=[];
 for(let i=0;i<n;i++){const row=Math.floor(i/cols),inRow=row===rows-1?n-row*cols:cols,col=i%cols,off=(cols-inRow)*(kw+gap)/2;out.push({x:x0+off+col*(kw+gap),y:y0+row*(kh+gap),w:kw,h:kh});}
 return out;
}

// ------------------------------------------------------------------ the logo: HANGMAN / UNCHAINED in the Django style
const LOGOS=new Map();
function makeLogo(w,k=1,tag=true){
 const key=Math.round(w)+':'+k+':'+tag;if(LOGOS.has(key))return LOGOS.get(key);
 const probe=document.createElement('canvas').getContext('2d');let fs=w*.2;probe.font=`900 ${fs}px ${SLAB}`;fs*=w*.95/probe.measureText('HANGMAN').width;
 const h=fs*(tag?1.62:1.36),c=document.createElement('canvas');c.width=Math.ceil(w*k);c.height=Math.ceil(h*k);const g=c.getContext('2d');g.scale(k,k);
 const y1=fs*.86,font=`900 ${fs}px ${SLAB}`;g.font=font;g.textAlign='center';g.textBaseline='alphabetic';g.lineJoin='round';
 const total=g.measureText('HANGMAN').width,left=w/2-total/2;
 // drips hanging from the letters (drawn first so the outline covers their tops)
 g.fillStyle='#9d0d14';g.strokeStyle='#120303';g.lineWidth=fs*.035;
 for(const [ch,len] of [[1.5,.22],[3.4,.34],[5.55,.16],[6.6,.28]]){const px=left+g.measureText('HANGMAN'.slice(0,Math.floor(ch))).width+(ch%1)*fs*.5,r=fs*.045;
  g.beginPath();g.moveTo(px-r,y1-fs*.1);g.lineTo(px-r*.8,y1+fs*len);g.arc(px,y1+fs*len,r*1.05,Math.PI,0,true);g.lineTo(px+r,y1-fs*.1);g.closePath();g.stroke();g.fill();}
 g.shadowColor='rgba(0,0,0,.6)';g.shadowOffsetY=fs*.05;g.shadowBlur=fs*.08;
 g.strokeStyle='#140303';g.lineWidth=fs*.15;g.strokeText('HANGMAN',w/2,y1);g.shadowColor='transparent';
 const grad=g.createLinearGradient(0,y1-fs*.72,0,y1);grad.addColorStop(0,'#ff5444');grad.addColorStop(.38,'#d3151d');grad.addColorStop(1,'#7e080d');
 g.fillStyle=grad;g.fillText('HANGMAN',w/2,y1);
 // distressed texture inside the letters
 g.save();g.globalCompositeOperation='source-atop';let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let i=0;i<220;i++){g.fillStyle=`rgba(40,0,0,${.18+rnd()*.3})`;g.beginPath();g.arc(left+rnd()*total,y1-fs*.75+rnd()*fs*.8,fs*(.006+rnd()*.018),0,7);g.fill();}
 g.strokeStyle='rgba(255,170,150,.22)';g.lineWidth=fs*.012;for(let i=0;i<14;i++){const sx=left+rnd()*total,sy=y1-fs*.7+rnd()*fs*.6;g.beginPath();g.moveTo(sx,sy);g.lineTo(sx+fs*(.05+rnd()*.12),sy+fs*(rnd()-.5)*.05);g.stroke();}
 g.restore();
 g.strokeStyle='rgba(255,120,100,.55)';g.lineWidth=fs*.018;g.strokeText('HANGMAN',w/2,y1-fs*.012);
 // UNCHAINED, widely spaced, with red rules ending in chain links
 const f2=fs*.27,y2=y1+fs*.42;g.font=`800 ${f2}px ${SLAB}`;const sp=f2*.5,word='UNCHAINED';let ww=0;for(const ch of word)ww+=g.measureText(ch).width+sp;ww-=sp;
 let cx=w/2-ww/2;g.textAlign='left';g.lineWidth=f2*.2;g.strokeStyle='#120303';g.fillStyle='#f3e6c9';
 for(const ch of word){g.strokeText(ch,cx,y2);g.fillText(ch,cx,y2);cx+=g.measureText(ch).width+sp;}
 const ry=y2-f2*.36,gap=f2*.7;g.strokeStyle='#b3121b';g.lineWidth=f2*.13;g.lineCap='round';
 for(const sd of [-1,1]){const inner=w/2+sd*(ww/2+gap),outer=sd<0?w*.05:w*.95;g.beginPath();g.moveTo(outer,ry);g.lineTo(inner-sd*f2*.9,ry);g.stroke();
  g.lineWidth=f2*.09;for(let j=0;j<2;j++){g.beginPath();g.ellipse(inner-sd*f2*(.62-j*.42),ry,f2*.24,f2*.13,0,0,7);g.stroke();}g.lineWidth=f2*.13;}
 if(tag){g.textAlign='center';g.font=`italic 600 ${fs*.14}px Georgia,"Noto Serif",serif`;g.fillStyle='#e9c590';g.fillText('The H is silent.',w/2,y2+fs*.27);}
 const out={c,w,h};LOGOS.set(key,out);return out;
}

async function hangman(s){
 const mode=['pass','turns'].includes(s.game?.hangMode)?s.game.hangMode:'shared',duel=mode!=='pass';
 const [c]=s.canvas(900,600,{fill:true});const x=c.getContext('2d');const fb=fullBleed(s,{bg:'#160a06'});
 s.shared=mode==='shared';s.active=0;s.updateScores();
 s.hint(mode==='turns'?'Take turns on one keyboard: the glowing keyboard, card and banner show whose shot it is. One letter per turn, 15 seconds a shot (running out counts as a miss). +10 for every time your letter appears; a miss builds your cowboy, six and the trapdoor drops (−20). The last letter collects the bounty (+40). Three bounties.'
  :mode==='shared'?'Both at once on one phrase: P1 taps the bottom/left keyboard, P2 the top/right one. A hit is yours (+10 a letter), a miss builds your cowboy and jams your gun for a moment. Six misses and the trapdoor drops. The last letter collects the bounty (+40). Three bounties.'
  :'One writes, one guesses, then swap. The writer types a phrase (or deals one from the deck) while the guesser looks away. Guesser: +10 per letter found, +60 and +15 per bullet left for solving. If the guesser hangs, the writer gets +50.');
 let headOf=null;try{headOf=require("src/engines/broforce.js").headCanvas;}catch{}
 let T=0,DT=1/60,W=s.W,H=s.H,dpr=1,lay={},shake=0;
 const st={phase:'intro',skip:false,round:0,text:'',cat:'',guessed:new Map(),reveal:{},misses:[0,0],partT:[[],[]],hanged:[0,0],cut:[0,0],lock:[0,0],clock:CLOCK,
  score:[0,0],turn:0,tclock:TURN,turnT:-9,mood:[null,null],press:{},result:null,guesser:1,writer:0,draft:'',draftCat:0,written:null,bannerT:0,tick:-1,hat:[null,null],winner:-1};
 const fx=[],floats=[];
 const waits=[];const until=f=>new Promise(r=>waits.push({f,r}));const sleep=sec=>{const e=T+sec;return until(()=>T>=e||st.skip);};
 const name=p=>s.players[p].name;

 // ---------------------------------------------------------------- rules
 function startRound(text,cat){
  Object.assign(st,{text:text.toUpperCase(),cat,guessed:new Map(),reveal:{},misses:[0,0],partT:[[],[]],hanged:[0,0],cut:[0,0],lock:[0,0],clock:CLOCK,result:null,tick:-1,hat:[null,null]});
 }
 const solvedNow=()=>[...st.text].every(ch=>!isLetter(ch)||st.guessed.get(ch)?.hit);
 const players=()=>mode==='shared'?[0,1]:mode==='turns'?[st.turn]:[st.guesser];
 function passTurn(){const o=1-st.turn;if(!st.hanged[o]&&o!==st.turn){st.turn=o;st.turnT=T;SFX.spurs({steps:2,vol:.3,pan:o?.4:-.4});}st.tclock=TURN;st.tick=-1;s.active=st.turn;s.updateScores();}
 function timeout(p){if(st.phase!=='play')return;st.misses[p]++;st.partT[p][st.misses[p]]=T;SFX.dryFire({});mood(p,'angry');vibrate(45);shake=.3;floatText(p,'TOO SLOW','#ff6b5e');dust(p);
  if(st.misses[p]>=LIVES)return hang(p);if(st.misses[p]===LIVES-1)floatText(p,'LAST BULLET','#ff8a5c',1.6);passTurn();}
 function mood(p,m,sec=1.2){st.mood[p]={m,until:T+sec};}
 function guess(p,L){
  if(st.phase!=='play'||!s.alive||s.paused||!players().includes(p))return;
  if(st.hanged[p]||st.lock[p]>T||!isLetter(L)||st.guessed.has(L))return;
  const idx=[];[...st.text].forEach((ch,i)=>{if(ch===L)idx.push(i);});
  st.guessed.set(L,{by:p,hit:idx.length>0,t:T});st.press[p+L]=T;
  const pan=duel?(p?.5:-.5):0;
  if(idx.length){
   st.score[p]+=10*idx.length;idx.forEach((i,k)=>{st.reveal[i]={t:T+k*.11,by:p};});
   idx.slice(0,4).forEach((_,k)=>SFX.gunshot({pan,delay:k*.11,vol:k?.6:.9}));if(idx.length===1||Math.random()<.4)SFX.ricochet({pan,delay:.12+idx.length*.1});
   floatText(p,`+${10*idx.length}`,'#ffd36a');mood(p,'win');vibrate(14);shake=Math.max(shake,.12);
   if(solvedNow())return collect(p);
  }else{
   st.misses[p]++;st.partT[p][st.misses[p]]=T;SFX.dryFire({});if(st.misses[p]<LIVES)SFX.snort({delay:.15,vol:.3});
   if(mode==='shared')st.lock[p]=T+.85;mood(p,'angry');vibrate(45);shake=.35;floatText(p,`${L} ✗`,'#ff6b5e');dust(p);
   if(st.misses[p]>=LIVES)return hang(p);
   if(st.misses[p]===LIVES-1)floatText(p,'LAST BULLET','#ff8a5c',1.6);
  }
  if(mode==='turns')passTurn();
  s.setScores(st.score);
 }
 function collect(p){
  if(duel)st.score[p]+=40;else st.score[p]+=60+15*(LIVES-st.misses[p]);
  st.cut[p]=T;st.result={kind:'solved',p};mood(p,'win',3);
  SFX.gunshot({delay:.05});SFX.yeehaw({delay:.35,pitch:p?1.12:1});SFX.gunshot({delay:1.45,vol:.6});SFX.gunshot({delay:1.62,vol:.6});SFX.gallop({delay:1.7,beats:5,vol:.4});
  floatText(p,duel?'+40 BOUNTY':`+${60+15*(LIVES-st.misses[p])} BOUNTY`,'#ffe28a',2);vibrate(30);endRound();
 }
 function hang(p){
  st.hanged[p]=T;mood(p,'sad',99);SFX.trapdoor({});SFX.whinny({delay:.45});vibrate(120);shake=.6;
  if(duel){st.score[p]=Math.max(0,st.score[p]-20);floatText(p,'−20 HANGED','#ff6b5e',2);if(st.hanged[1-p]){st.result={kind:'hanged'};endRound();}else if(mode==='turns')passTurn();}
  else{st.score[st.writer]+=50;st.result={kind:'hanged',p};endRound();}
  s.setScores(st.score);
 }
 function endRound(){st.phase='reveal';st.bannerT=T;s.setScores(st.score);}
 // writer (pass mode)
 const letterCount=t=>[...t].filter(isLetter).length;
 function typeChar(ch){if(st.phase!=='write')return;if(st.draft.length>=MAXLEN){SFX.dryFire({vol:.4});return;}if(ch===' '&&(!st.draft||st.draft.endsWith(' ')))return;st.draft+=ch;SFX.jingle({});}
 function backspace(){if(st.phase!=='write'||!st.draft)return;st.draft=st.draft.slice(0,-1);SFX.cock({vol:.35});}
 function deal(){if(st.phase!=='write')return;const pool=PHRASES.filter(q=>q.text!==st.draft&&(st.draftCat===0||q.cat===CATEGORIES[st.draftCat]));const q=pool[Math.floor(s.random()*pool.length)];if(!q)return;st.draft=q.text;st.draftCat=Math.max(0,CATEGORIES.indexOf(q.cat));SFX.cylinder({});}
 function cycleClue(){if(st.phase!=='write')return;st.draftCat=(st.draftCat+1)%CATEGORIES.length;SFX.jingle({});}
 function doneWriting(){if(st.phase!=='write')return;const text=st.draft.trim().replace(/\s+/g,' ');if(letterCount(text)<3){SFX.dryFire({});floats.push({x:W/2,y:H*.3,text:'At least 3 letters',color:'#ff8a7a',t:T,life:1.2});return;}
  st.written={text,cat:CATEGORIES[st.draftCat]==='ANYTHING'?'ANYTHING GOES':CATEGORIES[st.draftCat]};SFX.whip({});SFX.cock({delay:.3});}

 // ---------------------------------------------------------------- effects
 function panelCenter(p){const pn=lay.panels?.[duel?p:0];return pn?{x:pn.gx,y:pn.neckY}:{x:W/2,y:H/2};}
 function floatText(p,text,color,life=1.1){const c0=panelCenter(p);floats.push({x:c0.x,y:c0.y-20,text,color,t:T,life});}
 function dust(p){const c0=panelCenter(p);for(let i=0;i<10;i++)fx.push({k:'dust',x:c0.x+(Math.random()-.5)*30,y:c0.y+(Math.random()-.2)*40,vx:(Math.random()-.5)*60,vy:-Math.random()*40,life:.7,t:T,r:3+Math.random()*5});}
 function smoke(x0,y0){for(let i=0;i<6;i++)fx.push({k:'smoke',x:x0,y:y0,vx:(Math.random()-.5)*40,vy:-20-Math.random()*40,life:.8+Math.random()*.4,t:T,r:4+Math.random()*6});for(let i=0;i<8;i++){const a=Math.random()*7;fx.push({k:'spark',x:x0,y:y0,vx:Math.cos(a)*160,vy:Math.sin(a)*160,life:.25,t:T,r:1.5});}}
 const dusts=Array.from({length:26},()=>({x:Math.random(),y:Math.random(),s:.2+Math.random()*.8,p:Math.random()*7}));
 let weed=null,nextWeed=4;

 // ---------------------------------------------------------------- layout
 function layout(){
  const M=8,TOP=Math.max(48,fb.top+4),BOT=36,port=W<H*.95,L={port,TOP,BOT,M};
  if(st.phase==='intro'||st.phase==='final')return L;
  if(mode==='turns'){
   if(port){L.scene={x:M,y:TOP,w:W-2*M,h:(H-TOP-BOT)*.33};L.phrase={x:M,y:L.scene.y+L.scene.h+6,w:W-2*M,h:(H-TOP-BOT)*.2};L.kb=[{x:M,y:L.phrase.y+L.phrase.h+8,w:W-2*M,h:H-BOT-(L.phrase.y+L.phrase.h+8)}];}
   else{const lw=W*.47;L.scene={x:M,y:TOP,w:lw-M,h:(H-TOP-BOT)*.58};L.phrase={x:M,y:TOP+L.scene.h+6,w:lw-M,h:H-BOT-(TOP+L.scene.h+6)};const rx=lw+8;L.kb=[{x:rx,y:TOP,w:W-rx-M,h:H-TOP-M}];}
   const sc=L.scene;L.panels=[0,1].map(p=>panel({x:sc.x+(p?sc.w/2+3:0),y:sc.y,w:sc.w/2-3,h:sc.h},p?1:-1));
  }else if(mode==='shared'){
   if(port){const kbH=clamp((H-TOP-BOT)*.3,150,260);L.kb=[{x:M,y:H-BOT-kbH,w:W-2*M,h:kbH},{x:M,y:TOP,w:W-2*M,h:kbH}];
    const my=TOP+kbH+8,mh=H-BOT-kbH-8-my;L.scene={x:M,y:my,w:W-2*M,h:mh*.61};L.phrase={x:M,y:my+mh*.61+4,w:W-2*M,h:mh*.39-4};}
   else{const side=clamp(W*.28,170,360);L.kb=[{x:M,y:TOP,w:side,h:H-TOP-M},{x:W-M-side,y:TOP,w:side,h:H-TOP-M}];
    const mx=M+side+10,mw=W-2*mx;L.scene={x:mx,y:TOP,w:mw,h:(H-TOP-BOT)*.56};L.phrase={x:mx,y:TOP+L.scene.h+6,w:mw,h:H-BOT-(TOP+L.scene.h+6)};}
   const sc=L.scene;L.panels=[0,1].map(p=>panel({x:sc.x+(p?sc.w/2+3:0),y:sc.y,w:sc.w/2-3,h:sc.h},p?1:-1));
  }else if(st.phase==='write'){
   if(port){L.poster={x:M,y:TOP,w:W-2*M,h:(H-TOP-BOT)*.36};L.actions={x:M,y:L.poster.y+L.poster.h+8,w:W-2*M,h:clamp(H*.07,44,60)};L.kb=[{x:M,y:L.actions.y+L.actions.h+8,w:W-2*M,h:H-BOT-(L.actions.y+L.actions.h+8)}];}
   else{const lw=W*.42;L.poster={x:M,y:TOP,w:lw-M,h:H-TOP-BOT};const rx=lw+8,rw=W-rx-M;L.actions={x:rx,y:TOP,w:rw,h:clamp(H*.11,44,62)};L.kb=[{x:rx,y:L.actions.y+L.actions.h+8,w:rw,h:H-BOT-(L.actions.y+L.actions.h+8)}];}
   const A=L.actions,n=5,gw=6,bw=(A.w-gw*(n-1))/n;L.act=['deal','clue','space','back','done'].map((id,i)=>({id,x:A.x+i*(bw+gw),y:A.y,w:bw,h:A.h}));
  }else{
   if(port){L.scene={x:M,y:TOP,w:W-2*M,h:(H-TOP-BOT)*.41};L.phrase={x:M,y:L.scene.y+L.scene.h+6,w:W-2*M,h:(H-TOP-BOT)*.21};L.kb=[{x:M,y:L.phrase.y+L.phrase.h+8,w:W-2*M,h:H-BOT-(L.phrase.y+L.phrase.h+8)}];}
   else{const lw=W*.42;L.scene={x:M,y:TOP,w:lw-M,h:H-TOP-BOT};const rx=lw+8,rw=W-rx-M;L.phrase={x:rx,y:TOP,w:rw,h:(H-TOP-BOT)*.36};L.kb=[{x:rx,y:L.phrase.y+L.phrase.h+8,w:rw,h:H-BOT-(L.phrase.y+L.phrase.h+8)}];}
   L.panels=[panel(L.scene,-1)];
  }
  L.keys=L.kb.map(r=>{const hd=mode==='shared'?20:mode==='turns'?clamp(r.h*.13,32,46):8,inner={x:r.x+6,y:r.y+hd,w:r.w-12,h:r.h-hd-6};return keyGrid(inner,26,clamp(Math.min(r.w,r.h)*.02,4,7)).map((k,i)=>({...k,L:ABC[i]}));});
  return L;
 }
 // a player's corner of the scene: status card on the outer side, gallows beside it
 function panel(r,side){
  const cardW=clamp(r.w*.36,74,128),u=Math.max(.3,Math.min((r.h-6)/182,(r.w-cardW-8)/110)),gw=r.w-cardW-6;
  const gx=(side<0?r.x+cardW+6+gw/2:r.x+gw/2)-7*u,baseY=r.y+r.h-3,yp=baseY-26*u,neckY=yp-88*u,beamY=neckY-59*u;
  const cardH=clamp(r.h*.62,86,150);
  return {r,u,gx,baseY,yp,neckY,beamY,card:{x:side<0?r.x:r.x+r.w-cardW,y:r.y+Math.max(0,(r.h-cardH)*.35),w:cardW,h:cardH}};
 }

 // ---------------------------------------------------------------- drawing: backdrop
 let bg=null,bgKey='';
 function backdrop(){
  const key=W+'x'+H+'@'+dpr;if(bgKey!==key){bgKey=key;bg=document.createElement('canvas');bg.width=Math.ceil(W*dpr);bg.height=Math.ceil(H*dpr);const g=bg.getContext('2d');g.scale(dpr,dpr);
   const hz=H*.7,sky=g.createLinearGradient(0,0,0,hz);sky.addColorStop(0,'#1d0b1c');sky.addColorStop(.38,'#5e1a2c');sky.addColorStop(.72,'#c4502c');sky.addColorStop(1,'#f3a24c');g.fillStyle=sky;g.fillRect(0,0,W,hz+2);
   let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
   g.fillStyle='rgba(255,240,220,.7)';for(let i=0;i<60;i++){g.globalAlpha=rnd()*.6;g.fillRect(rnd()*W,rnd()*hz*.4,1.2,1.2);}g.globalAlpha=1;
   const sr=Math.min(W,H)*.17,sx=W*.64,sy=hz-sr*.35,glow=g.createRadialGradient(sx,sy,sr*.3,sx,sy,sr*3);glow.addColorStop(0,'rgba(255,200,120,.55)');glow.addColorStop(1,'rgba(255,120,60,0)');g.fillStyle=glow;g.fillRect(0,0,W,hz);
   const sun=g.createLinearGradient(0,sy-sr,0,sy+sr);sun.addColorStop(0,'#fff0b0');sun.addColorStop(1,'#ff8a3a');g.fillStyle=sun;g.beginPath();g.arc(sx,sy,sr,0,7);g.fill();
   g.fillStyle='rgba(120,30,40,.55)';for(let i=0;i<4;i++)g.fillRect(sx-sr,sy+sr*(.15+i*.2),sr*2,sr*.05+i*1.2);
   const mesa=(col,base,amp,seed2)=>{seed=seed2;g.fillStyle=col;g.beginPath();g.moveTo(0,hz+2);let px=0;while(px<W){const w=40+rnd()*140,top=base-rnd()*amp;g.lineTo(px+w*.15,top);g.lineTo(px+w*.85,top);g.lineTo(px+w,base-rnd()*amp*.25);px+=w;}g.lineTo(W,hz+2);g.closePath();g.fill();};
   mesa('#8c3b3d',hz-H*.02,H*.16,3);mesa('#5c2232',hz,H*.1,9);mesa('#34141c',hz+2,H*.05,21);
   const ground=g.createLinearGradient(0,hz,0,H);ground.addColorStop(0,'#4a2414');ground.addColorStop(1,'#170905');g.fillStyle=ground;g.fillRect(0,hz,W,H-hz);
   seed=5;g.fillStyle='#1d0b07';for(let i=0;i<5;i++){const cx=rnd()*W,cy=hz+rnd()*H*.06,h2=H*(.05+rnd()*.07),w2=h2*.16;g.fillRect(cx-w2/2,cy-h2,w2,h2);g.beginPath();g.arc(cx,cy-h2,w2/2,0,7);g.fill();
    for(const sd of [-1,1]){const ay=cy-h2*(.4+rnd()*.25),aw=w2*1.6;g.fillRect(cx+sd*w2/2-(sd<0?aw:0),ay,aw,w2*.8);g.fillRect(cx+sd*(w2/2+aw)-(sd<0?0:w2*.8),ay-h2*.28,w2*.8,h2*.28+w2*.8);}}
   const vig=g.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.75);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.55)');g.fillStyle=vig;g.fillRect(0,0,W,H);}
  x.drawImage(bg,0,0,W,H);
  // vultures, drifting dust and the odd tumbleweed
  x.strokeStyle='rgba(20,6,8,.75)';x.lineWidth=2;x.lineCap='round';
  for(let i=0;i<2;i++){const a=T*.35+i*3,vx=W*(.28+i*.12)+Math.cos(a)*W*.08,vy=H*.12+Math.sin(a)*H*.03,f=Math.sin(T*5+i)*3,sz=7+i*2;x.beginPath();x.moveTo(vx-sz,vy-3+f);x.quadraticCurveTo(vx-sz/2,vy-5,vx,vy);x.quadraticCurveTo(vx+sz/2,vy-5,vx+sz,vy-3+f);x.stroke();}
  for(const d of dusts){const px=((d.x+T*.012*d.s)%1)*W,py=d.y*H+Math.sin(T+d.p)*6;x.fillStyle=`rgba(255,210,160,${.12+.12*Math.sin(T*2+d.p)})`;x.fillRect(px,py,1.6*d.s+.6,1.6*d.s+.6);}
  if(!weed&&T>nextWeed){weed={x:-30,y:H*.72+Math.random()*H*.18,r:9+Math.random()*9,vx:70+Math.random()*60,a:0,b:0};}
  if(weed){weed.x+=weed.vx*DT;weed.a+=weed.vx*DT/weed.r;weed.b=Math.abs(Math.sin(weed.x/38))*weed.r*1.4;const wx=weed.x,wy=weed.y-weed.b;x.save();x.translate(wx,wy);x.rotate(weed.a);x.strokeStyle='rgba(120,78,40,.8)';x.lineWidth=1.3;
   for(let i=0;i<9;i++){x.beginPath();x.ellipse(0,0,weed.r,weed.r*(.4+(i%3)*.2),i*.7,0,6.2);x.stroke();}x.restore();if(weed.x>W+40){weed=null;nextWeed=T+9+Math.random()*10;}}
 }
 // ---------------------------------------------------------------- drawing: gallows + cowboy
 function wood(x0,y0,w,h,horizontal){x.fillStyle='#5b3a21';x.fillRect(x0,y0,w,h);x.fillStyle='rgba(255,210,150,.16)';if(horizontal)x.fillRect(x0,y0,w,Math.max(1,h*.25));else x.fillRect(x0,y0,Math.max(1,w*.25),h);
  x.strokeStyle='rgba(30,14,6,.55)';x.lineWidth=.8;x.beginPath();if(horizontal){x.moveTo(x0+2,y0+h*.6);x.lineTo(x0+w-2,y0+h*.55);}else{x.moveTo(x0+w*.6,y0+2);x.lineTo(x0+w*.55,y0+h-2);}x.stroke();x.strokeStyle='#22120a';x.lineWidth=1.2;x.strokeRect(x0,y0,w,h);}
 function gallows(pn,open){
  const {gx,baseY,yp,beamY,u}=pn;
  x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.ellipse(gx,baseY,52*u,6*u,0,0,7);x.fill();
  wood(gx-41*u,yp,5*u,26*u);wood(gx+36*u,yp,5*u,26*u);wood(gx-12*u,yp+4*u,4*u,22*u);wood(gx+8*u,yp+4*u,4*u,22*u);
  x.strokeStyle='#3b2413';x.lineWidth=2.4*u;x.beginPath();x.moveTo(gx-38*u,yp+24*u);x.lineTo(gx+38*u,yp+6*u);x.stroke();
  wood(gx+44*u,yp+8*u,10*u,3*u,true);wood(gx+50*u,yp+17*u,10*u,3*u,true);
  wood(gx-46*u,yp,32*u,6*u,true);wood(gx+14*u,yp,32*u,6*u,true);
  const ang=open*1.45;for(const sd of [-1,1]){x.save();x.translate(gx+sd*14*u,yp);x.rotate(sd*ang);wood(sd<0?0:-14*u,0,14*u,6*u,true);x.restore();}
  wood(gx-44*u,beamY,7*u,yp-beamY);wood(gx-46*u,beamY-2*u,64*u,7*u,true);
  x.strokeStyle='#4a2d18';x.lineWidth=4*u;x.beginPath();x.moveTo(gx-38*u,beamY+30*u);x.lineTo(gx-14*u,beamY+5*u);x.stroke();
  x.fillStyle='#caa26a';for(let i=0;i<3;i++){x.beginPath();x.ellipse(gx+6*u,beamY+5*u+i*2.6*u,3.2*u,1.6*u,0,0,7);x.fill();}
 }
 function cowboy(pn,p,parts,{hangT=0,cutT=0}={}){
  const o=OUTFIT[p],{gx,beamY,u}=pn,age=k=>T-(st.partT[p][k]??-9),rope=52;
  let sway=Math.sin(T*1.3+p*2)*.018,drop=0,hop=0;
  if(hangT){const a=T-hangT;drop=Math.min(1,a/.14)*13;sway=.3*Math.exp(-a*.6)*Math.sin(a*3.3)+Math.sin(T*1.1)*.02;}
  else if(parts>=LIVES-1)sway+=Math.sin(T*30)*.006;
  if(cutT){const a=T-cutT;sway=0;hop=-Math.abs(Math.sin(a*6))*6*Math.max(0,1-a/1.6);}
  if(cutT){x.strokeStyle='#c9a26b';x.lineWidth=2.4*u;x.beginPath();x.moveTo(gx+6*u,beamY+5*u);x.lineTo(gx+6*u,beamY+18*u);x.stroke();x.lineWidth=1*u;for(let i=-1;i<=1;i++){x.beginPath();x.moveTo(gx+6*u,beamY+18*u);x.lineTo(gx+(6+i*2)*u,beamY+21*u);x.stroke();}}
  x.save();x.translate(gx+6*u,beamY+5*u);x.rotate(sway);x.translate(-6*u,(rope+drop+hop)*u);x.scale(u,u);x.lineJoin='round';x.lineCap='round';
  // rope (the top piece stays on the beam once it is shot through)
  x.strokeStyle='#c9a26b';x.lineWidth=2.4;x.beginPath();if(cutT){x.moveTo(6,-12);x.lineTo(6,-4);}else{x.moveTo(6,-rope-drop-hop);x.lineTo(6,-4);}x.stroke();
  const pop=k=>{const a=age(k);return a<.3?1+.45*(1-a/.3)*Math.cos(a*30):1;};
  const part=(k,ax,ay,fn)=>{if(parts<k){x.save();x.globalAlpha=.16;x.fillStyle='#ffe2b0';fn(true);x.restore();return;}const sc=pop(k);x.save();x.translate(ax,ay);x.scale(sc,sc);x.translate(-ax,-ay);fn(false);x.restore();};
  part(4,-7,36,g=>leg(-1,o,g));part(5,7,36,g=>leg(1,o,g));
  part(1,0,18,g=>torso(o,g));
  part(2,-15,6,g=>arm(-1,o,g,hangT));part(3,15,6,g=>arm(1,o,g,hangT));
  // noose round the neck + the coiled knot
  x.strokeStyle='#b88f58';x.lineWidth=2.2;x.beginPath();x.ellipse(0,0,8,2.4,0,0,7);x.stroke();
  // head: the player's own face under a Stetson
  const md=st.hanged[p]?'sad':st.mood[p]&&st.mood[p].until>T?st.mood[p].m:'normal',hc=headOf?.(s.players[p].character,md);
  if(hc)x.drawImage(hc,-18,-34,36,36);else{x.fillStyle='#d9a477';x.beginPath();x.ellipse(0,-15,13,16,0,0,7);x.fill();}
  if(!st.hat[p]&&hangT&&T-hangT>.35)st.hat[p]={t:T};
  if(!st.hat[p]){const tip=cutT?Math.max(0,Math.sin((T-cutT)*3))*-.5:0;x.save();x.translate(0,-28+(tip?tip*6:0));x.rotate((p?.08:-.08)+tip);hat(o);x.restore();}
  x.fillStyle='#c9a26b';x.strokeStyle='#7a5a32';x.lineWidth=.8;for(let i=0;i<4;i++){x.beginPath();x.ellipse(7.5,-5+i*2.6,3,1.5,0,0,7);x.fill();x.stroke();}
  x.restore();
  // a hat knocked off by the drop falls to the ground
  if(st.hat[p]){const a=T-st.hat[p].t,fallY=Math.min(pn.baseY-4*u,pn.neckY-28*u+(drop)*u+.5*900*a*a),hx=gx+22*u*Math.min(1,a*1.5),rot=Math.min(1,a*1.6)*(p?1:-1)*.9;
   x.save();x.translate(hx,fallY);x.rotate(rot);x.scale(u,u);hat(OUTFIT[p]);x.restore();}
 }
 function hat(o){
  x.fillStyle=o.hat;x.strokeStyle='#120a05';x.lineWidth=1;
  x.beginPath();x.moveTo(-11,1);x.bezierCurveTo(-12,-8,-10,-13,-6,-13);x.quadraticCurveTo(0,-10,6,-13);x.bezierCurveTo(10,-13,12,-8,11,1);x.closePath();x.fill();x.stroke();
  x.fillStyle=o.band;x.fillRect(-11.3,-3,22.6,3.4);
  x.fillStyle='rgba(255,230,190,.18)';x.beginPath();x.ellipse(-5,-8,2,4,.2,0,7);x.fill();
  const br=x.createLinearGradient(0,-3,0,5);br.addColorStop(0,o.hat);br.addColorStop(1,o.hatD);x.fillStyle=br;
  x.beginPath();x.moveTo(-23,-1);x.quadraticCurveTo(-20,4,0,4.4);x.quadraticCurveTo(20,4,23,-1);x.quadraticCurveTo(14,1.5,0,1.6);x.quadraticCurveTo(-14,1.5,-23,-1);x.closePath();x.fill();x.stroke();
 }
 function torso(o,g){
  if(g){x.beginPath();x.moveTo(-15,3);x.lineTo(15,3);x.lineTo(15,40);x.lineTo(-15,40);x.closePath();x.fill();return;}
  x.fillStyle=o.shirt;x.beginPath();x.moveTo(-14,4);x.quadraticCurveTo(0,0,14,4);x.lineTo(13,37);x.lineTo(-13,37);x.closePath();x.fill();
  x.fillStyle=o.vest;x.beginPath();x.moveTo(-7,5);x.lineTo(-1,15);x.lineTo(1,15);x.lineTo(7,5);x.lineTo(7,33);x.lineTo(-7,33);x.closePath();x.fill();
  x.fillStyle='#e8c060';for(let i=0;i<3;i++){x.beginPath();x.arc(0,18+i*5,.9,0,7);x.fill();}
  for(const sd of [-1,1]){x.fillStyle=o.coat;x.beginPath();x.moveTo(sd*15,3);x.quadraticCurveTo(sd*8,1,sd*5,4);x.lineTo(sd*7,22);x.lineTo(sd*6,42);x.lineTo(sd*17,42);x.lineTo(sd*16.5,10);x.closePath();x.fill();
   x.fillStyle=o.coatD;x.beginPath();x.moveTo(sd*5,4);x.lineTo(sd*10,4);x.lineTo(sd*9,13);x.lineTo(sd*7,20);x.closePath();x.fill();
   x.strokeStyle='rgba(0,0,0,.35)';x.lineWidth=.7;x.beginPath();x.moveTo(sd*7,22);x.lineTo(sd*6,42);x.stroke();}
  x.fillStyle='#2a170c';x.fillRect(-14,32,28,4.6);x.fillStyle='#ddd5bf';x.fillRect(-3.4,31.4,6.8,5.8);x.strokeStyle='#7d6c4c';x.lineWidth=.8;x.strokeRect(-3.4,31.4,6.8,5.8);
  x.strokeStyle='#4a2a14';x.lineWidth=3;x.beginPath();x.moveTo(-14,37);x.quadraticCurveTo(0,41,15,38);x.stroke();
  x.fillStyle='#d7a446';for(let i=0;i<7;i++)x.fillRect(-11+i*3.2,37.3+Math.sin(i/6*Math.PI)*1.6,1.3,2.4);
  x.fillStyle='#5a3218';x.beginPath();x.moveTo(12,37);x.lineTo(18,37);x.lineTo(17.5,52);x.lineTo(13,50);x.closePath();x.fill();x.fillStyle='#e8dcc0';x.fillRect(13.6,31.5,3.2,5.8);
  x.fillStyle=o.scarf;x.beginPath();x.moveTo(-8,1);x.lineTo(8,1);x.lineTo(0,11);x.closePath();x.fill();x.beginPath();x.arc(0,2,2.2,0,7);x.fill();
 }
 function arm(sd,o,g,hangT){
  const el=hangT?[sd*17,21]:[sd*20,20],wr=hangT?[sd*16,35]:[sd*19,33];
  x.strokeStyle=g?'#ffe2b0':o.coat;x.lineWidth=7;x.beginPath();x.moveTo(sd*14,7);x.lineTo(el[0],el[1]);x.lineTo(wr[0],wr[1]);x.stroke();if(g)return;
  x.strokeStyle=o.coatD;x.lineWidth=7.4;x.beginPath();x.moveTo(wr[0],wr[1]-2.5);x.lineTo(wr[0],wr[1]);x.stroke();
  if(sd>0){x.fillStyle='#3a3a40';x.save();x.translate(wr[0],wr[1]+3);x.rotate(.25);x.fillRect(-1.2,0,2.4,12);x.fillStyle='#55555c';x.fillRect(-2.2,1,4.4,4);x.fillStyle='#e8dcc0';x.fillRect(-1.6,-4,3.2,5);x.restore();}
  else{x.strokeStyle='#c9a26b';x.lineWidth=1.1;for(let i=0;i<3;i++){x.beginPath();x.ellipse(wr[0]-1,wr[1]+8,4.6-i*.6,7-i,.15,0,7);x.stroke();}}
  x.fillStyle=o.glove;x.beginPath();x.arc(wr[0],wr[1]+3,3.7,0,7);x.fill();x.strokeStyle='rgba(0,0,0,.4)';x.lineWidth=.6;x.stroke();
 }
 function leg(sd,o,g){
  const hx=sd*7,kx=sd*8.5,ax=sd*8.5;
  x.strokeStyle=g?'#ffe2b0':o.pants;x.lineWidth=11;x.beginPath();x.moveTo(hx,37);x.lineTo(kx,56);x.lineTo(ax,74);x.stroke();
  if(g){x.fillStyle='#ffe2b0';x.fillRect(ax-5,72,10,14);return;}
  x.fillStyle=o.chaps;x.beginPath();x.moveTo(sd*2.5,38);x.lineTo(sd*13.5,38);x.lineTo(sd*14,73);x.lineTo(sd*4,73);x.closePath();x.fill();
  x.strokeStyle=o.chaps;x.lineWidth=.9;for(let i=0;i<9;i++){x.beginPath();x.moveTo(sd*13.8,41+i*3.6);x.lineTo(sd*17,42.5+i*3.6);x.stroke();}
  x.fillStyle='#d0b070';x.beginPath();x.arc(sd*8.5,45,1.1,0,7);x.fill();
  x.fillStyle=o.boot;x.fillRect(ax-5,70,10,12);x.beginPath();x.moveTo(ax-sd*5,81);x.lineTo(ax+sd*5,81);x.quadraticCurveTo(ax+sd*12,82,ax+sd*12.5,86);x.lineTo(ax-sd*5.5,86.5);x.closePath();x.fill();
  x.fillStyle='rgba(255,220,170,.18)';x.fillRect(ax-4,71,2,10);x.fillStyle='#120a05';x.fillRect(ax-sd*5.5-(sd<0?0:0)-1,84,4,2.5);
  x.strokeStyle='#b8b0a0';x.lineWidth=.9;x.beginPath();x.moveTo(ax-sd*4.5,82);x.lineTo(ax-sd*8.5,82.5);x.stroke();
  x.save();x.translate(ax-sd*9.5,82.5);x.rotate(T*2*sd);x.strokeStyle='#e6b84c';x.lineWidth=.9;for(let i=0;i<6;i++){x.rotate(Math.PI/3);x.beginPath();x.moveTo(0,0);x.lineTo(0,2.8);x.stroke();}x.restore();
 }
 // revolver cylinder: one chamber per remaining life
 function cylinder(cx,cy,r,left,spin=0){
  x.save();x.translate(cx,cy);x.rotate(spin);const gm=x.createRadialGradient(-r*.3,-r*.3,r*.1,0,0,r);gm.addColorStop(0,'#8d8f98');gm.addColorStop(1,'#34353b');x.fillStyle=gm;x.beginPath();
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2-Math.PI/2,b=a+Math.PI/6;x.arc(0,0,r,a-.32,a+.32);x.lineTo(Math.cos(b)*r*.86,Math.sin(b)*r*.86);}x.closePath();x.fill();x.strokeStyle='#17171a';x.lineWidth=1.2;x.stroke();
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2-Math.PI/2,px=Math.cos(a)*r*.56,py=Math.sin(a)*r*.56,full=i<left;x.fillStyle=full?'#d9a441':'#0d0d0f';x.beginPath();x.arc(px,py,r*.24,0,7);x.fill();
   if(full){x.fillStyle='#a8752a';x.beginPath();x.arc(px,py,r*.1,0,7);x.fill();}}
  x.fillStyle='#202024';x.beginPath();x.arc(0,0,r*.13,0,7);x.fill();x.restore();
 }
 function card(pn,p,{label=null}={}){
  const r=pn.card,col=PC[p],on=mode==='turns'&&st.phase==='play'&&st.turn===p,off=mode==='turns'&&st.phase==='play'&&st.turn!==p;
  if(on){x.save();x.shadowColor=col;x.shadowBlur=16+8*Math.sin(T*5);rr(x,r.x,r.y,r.w,r.h,12);x.strokeStyle=col;x.lineWidth=4;x.stroke();x.restore();}x.save();x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=10;rr(x,r.x,r.y,r.w,r.h,12);x.fillStyle='rgba(22,11,6,.82)';x.fill();x.restore();
  rr(x,r.x,r.y,r.w,r.h,12);x.strokeStyle=col;x.lineWidth=1.5;x.stroke();
  x.textAlign='center';x.textBaseline='middle';const cx=r.x+r.w/2;let fsz=clamp(r.w*.15,10,15);x.font=`700 ${fsz}px ${SANS}`;let nm=name(p).toUpperCase();while(x.measureText(nm).width>r.w-10&&nm.length>3)nm=nm.slice(0,-2)+'…';
  x.fillStyle=col;x.fillText(nm,cx,r.y+r.h*.14);
  if(label){x.font=`600 ${clamp(r.w*.1,8,11)}px ${SANS}`;x.fillStyle='#d8bf98';x.fillText(label,cx,r.y+r.h*.27);}
  x.font=`900 ${clamp(r.w*.3,18,34)}px ${SLAB}`;x.fillStyle='#ffe7b4';x.fillText(String(st.score[p]),cx,r.y+r.h*(label?.47:.42));
  const left=Math.max(0,LIVES-st.misses[p]),spin=T-(st.partT[p][st.misses[p]]??-9)<.4?(T-(st.partT[p][st.misses[p]]??0))*12:0;
  cylinder(cx,r.y+r.h*.76,clamp(r.w*.19,12,22),left,spin);
  if(st.hanged[p])stamp('HANGED',cx,r.y+r.h*.76,r.w*.9,'#e0332b',-.25);
  else if(st.cut[p])stamp('PAID',cx,r.y+r.h*.76,r.w*.7,'#ffcc4a',-.2);
 }
 function stamp(text,cx,cy,w,col,rot){x.save();x.translate(cx,cy);x.rotate(rot);const f=clamp(w/text.length*1.45,10,64);x.font=`900 ${f}px ${SLAB}`;const tw=x.measureText(text).width+f*.6;
  x.globalAlpha=.92;x.strokeStyle=col;x.lineWidth=Math.max(2,f*.09);rr(x,-tw/2,-f*.68,tw,f*1.3,f*.18);x.stroke();x.fillStyle=col;x.textAlign='center';x.textBaseline='middle';x.fillText(text,0,f*.04);x.restore();}

 // ---------------------------------------------------------------- drawing: phrase board, keys, HUD
 function board(r,{all=false,text=st.text,title=st.cat,cursor=false}={}){
  x.save();x.shadowColor='rgba(0,0,0,.55)';x.shadowBlur=14;x.shadowOffsetY=4;rr(x,r.x,r.y,r.w,r.h,12);const pg=x.createLinearGradient(0,r.y,0,r.y+r.h);pg.addColorStop(0,'#f4e3bb');pg.addColorStop(1,'#dcbd85');x.fillStyle=pg;x.fill();x.restore();
  const burn=x.createRadialGradient(r.x+r.w/2,r.y+r.h/2,Math.min(r.w,r.h)*.3,r.x+r.w/2,r.y+r.h/2,Math.max(r.w,r.h)*.7);burn.addColorStop(0,'rgba(120,60,20,0)');burn.addColorStop(1,'rgba(110,50,15,.38)');rr(x,r.x,r.y,r.w,r.h,12);x.fillStyle=burn;x.fill();
  rr(x,r.x+4,r.y+4,r.w-8,r.h-8,9);x.strokeStyle='rgba(90,40,12,.45)';x.lineWidth=1.5;x.stroke();
  x.fillStyle='#4a3020';for(const [nx,ny]of [[r.x+10,r.y+10],[r.x+r.w-10,r.y+10],[r.x+10,r.y+r.h-10],[r.x+r.w-10,r.y+r.h-10]]){x.beginPath();x.arc(nx,ny,2.6,0,7);x.fill();}
  const th=clamp(r.h*.15,13,22);x.font=`900 ${th*.78}px ${SLAB}`;x.textAlign='center';x.textBaseline='middle';x.fillStyle='#9a1219';
  const t1=title||'';let tw=x.measureText(t1).width;x.fillText(t1,r.x+r.w/2,r.y+th*.82);x.strokeStyle='rgba(154,18,25,.5)';x.lineWidth=1.2;x.beginPath();x.moveTo(r.x+18,r.y+th*.82);x.lineTo(r.x+r.w/2-tw/2-8,r.y+th*.82);x.moveTo(r.x+r.w/2+tw/2+8,r.y+th*.82);x.lineTo(r.x+r.w-18,r.y+th*.82);x.stroke();
  const area={x:r.x+12,y:r.y+th*1.55,w:r.w-24,h:r.h-th*1.55-10},show=text||' ',fit=fitPhrase(show,area.w,area.h),t=fit.t,lh=t*1.3,top=area.y+(area.h-(fit.lines.length*lh-t*.3))/2;
  let lastX=area.x+area.w/2,lastY=top;
  fit.lines.forEach((line,li)=>{const lw=line.length*fit.cell-t*.1;let px=area.x+(area.w-lw)/2;const py=top+li*lh;
   for(const {ch,i}of line){if(ch!==' ')tile(ch,i,px,py,t,all);px+=fit.cell;lastX=px;lastY=py;}});
  if(cursor&&Math.floor(T*2)%2===0){x.fillStyle='#9a1219';x.fillRect(text?lastX-t*.05:area.x+area.w/2-1,lastY+2,3,t-4);}
 }
 function tile(ch,i,px,py,t,all){
  if(!isLetter(ch)){x.fillStyle='#3a2416';x.font=`900 ${t*.8}px ${SLAB}`;x.textAlign='center';x.textBaseline='middle';x.fillText(ch,px+t/2,py+t*.55);return;}
  const rv=st.reveal[i],shown=all||(rv&&T>=rv.t),late=all&&!rv&&st.phase==='reveal'&&st.text;
  if(!shown){const g=x.createLinearGradient(0,py,0,py+t);g.addColorStop(0,'#3d2617');g.addColorStop(1,'#24150c');rr(x,px,py,t,t,t*.16);x.fillStyle=g;x.fill();x.fillStyle='rgba(255,210,150,.35)';x.fillRect(px+t*.18,py+t*.82,t*.64,Math.max(1.5,t*.06));return;}
  const age=rv?T-rv.t:1,k=Math.min(1,age/.18);
  if(rv&&!rv.fx&&age>=0){rv.fx=1;smoke(px+t/2,py+t/2);}
  x.save();x.translate(px+t/2,py+t/2);x.scale(1,Math.max(.05,k));rr(x,-t/2,-t/2,t,t,t*.16);x.fillStyle='#fff6e0';x.fill();
  if(rv){x.strokeStyle=PC[rv.by];x.lineWidth=Math.max(1.5,t*.08);x.stroke();}
  x.fillStyle=late?'#b3121b':'#2a140a';x.font=`900 ${t*.74}px ${SLAB}`;x.textAlign='center';x.textBaseline='middle';x.fillText(ch,0,t*.05);x.restore();
  if(rv&&age<.12){x.fillStyle=`rgba(255,230,140,${1-age/.12})`;x.beginPath();x.arc(px+t/2,py+t/2,t*(.6+age*4),0,7);x.fill();}
 }
 function keyboard(r,keys,p,{active=true}={}){
  const col=p==null?'#e0b060':PC[p];
  x.save();x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=12;rr(x,r.x,r.y,r.w,r.h,14);x.fillStyle='rgba(18,9,5,.84)';x.fill();x.restore();
  rr(x,r.x,r.y,r.w,r.h,14);x.strokeStyle=col;x.globalAlpha=.75;x.lineWidth=1.6;x.stroke();x.globalAlpha=1;
  if(mode==='turns'&&p!=null)turnHeader(r,p);
  if(mode==='shared'&&p!=null){x.font=`800 11px ${SANS}`;const label=`P${p+1} · ${name(p).toUpperCase()}`;const lw=Math.min(r.w-24,x.measureText(label).width+16);rr(x,r.x+10,r.y+3,lw,15,7.5);x.fillStyle=col;x.fill();
   x.fillStyle='#160a05';x.textAlign='left';x.textBaseline='middle';x.fillText(label,r.x+18,r.y+10.8,lw-14);}
  for(const k of keys)key(k,p);
  if(mode==='turns'&&p!=null)turnSweep(r,p);
  const locked=p!=null&&st.lock[p]>T,hanged=p!=null&&st.hanged[p];
  if((locked||hanged||!active)&&st.phase==='play'||hanged){x.save();rr(x,r.x,r.y,r.w,r.h,14);x.fillStyle=hanged?'rgba(30,4,4,.72)':'rgba(10,5,3,.55)';x.fill();
   const cx=r.x+r.w/2,cy=r.y+r.h/2;if(hanged)stamp('HANGED',cx,cy,Math.min(r.w*.6,260),'#e0332b',-.12);
   else if(locked){cylinder(cx,cy-8,Math.min(r.h*.16,26),Math.max(0,LIVES-st.misses[p]),T*14);x.font=`800 ${clamp(r.h*.07,11,16)}px ${SANS}`;x.fillStyle='#ffd7a0';x.textAlign='center';x.fillText('JAMMED!',cx,cy+Math.min(r.h*.16,26)+8);}x.restore();}
 }
 // turns mode: the keyboard glows in the shooter's colour under a "NAME'S SHOT" banner with their face and a shot clock
 function turnHeader(r,p){
  const col=PC[p],live=st.phase==='play',pulse=.55+.45*Math.sin(T*5);
  x.save();x.shadowColor=col;x.shadowBlur=live?14+8*pulse:6;rr(x,r.x,r.y,r.w,r.h,14);x.strokeStyle=col;x.lineWidth=3.2;x.stroke();x.restore();
  const hh=clamp(r.h*.13,32,46)-6,bx=r.x+6,by=r.y+5,bw=r.w-12;rr(x,bx,by,bw,hh,hh/2);const g=x.createLinearGradient(bx,0,bx+bw,0);g.addColorStop(0,col);g.addColorStop(1,p?'#b8325a':'#2a6fb0');x.fillStyle=g;x.fill();
  const hc=headOf?.(s.players[p].character,st.mood[p]&&st.mood[p].until>T?st.mood[p].m:'normal');if(hc)x.drawImage(hc,bx+4,by+hh/2-hh*.62,hh*1.24,hh*1.24);
  x.fillStyle='#160a05';x.font=`900 ${hh*.5}px ${SLAB}`;x.textAlign='left';x.textBaseline='middle';x.fillText(`${name(p).toUpperCase()}’S SHOT`,bx+hh*1.4,by+hh/2+1,bw-hh*1.4-hh*1.3);
  if(live){const fr=clamp(st.tclock/TURN,0,1),cx=bx+bw-hh/2-2,cy=by+hh/2,rad=hh*.38;x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.arc(cx,cy,rad+2,0,7);x.fill();
   x.strokeStyle=fr<.34?'#ffe14a':'#fff3dc';x.lineWidth=3;x.beginPath();x.arc(cx,cy,rad,-Math.PI/2,-Math.PI/2+fr*Math.PI*2);x.stroke();x.fillStyle='#fff3dc';x.font=`800 ${hh*.36}px ${SANS}`;x.textAlign='center';x.fillText(String(Math.ceil(st.tclock)),cx,cy+1);}
 }
 function turnSweep(r,p){
  // fresh turn: the name sweeps across the keys
  const col=PC[p],live=st.phase==='play',hh=clamp(r.h*.13,32,46)-6,a=T-st.turnT;if(live&&a<.9){const k=a<.15?a/.15:a>.65?(.9-a)/.25:1;x.save();rr(x,r.x,r.y,r.w,r.h,14);x.clip();x.globalAlpha=k*.92;x.fillStyle='rgba(12,6,3,.35)';x.fillRect(r.x,r.y+hh+8,r.w,r.h-hh-8);
   const f=clamp(r.w*.11,20,56);x.font=`900 ${f}px ${SLAB}`;x.textAlign='center';x.lineWidth=f*.12;x.strokeStyle='#120503';const ty=r.y+hh+8+(r.h-hh-8)/2,tx=r.x+r.w/2+(1-k)*(p?40:-40);
   x.strokeText(`${name(p).toUpperCase()}’S TURN`,tx,ty,r.w-20);x.fillStyle=col;x.fillText(`${name(p).toUpperCase()}’S TURN`,tx,ty,r.w-20);x.restore();}
 }
 function key(k,p){
  const g=p==null?null:st.guessed.get(k.L),pressed=T-(st.press[(p??'w')+k.L]??-9)<.12,y=k.y+(pressed?2:0),rad=Math.min(k.w,k.h)*.2;
  if(g&&g.hit){const gg=x.createLinearGradient(0,y,0,y+k.h);gg.addColorStop(0,'#f6cf6a');gg.addColorStop(1,'#c4862a');rr(x,k.x,y,k.w,k.h,rad);x.fillStyle=gg;x.fill();
   x.fillStyle=PC[g.by];x.beginPath();x.arc(k.x+k.w-6,y+6,3.2,0,7);x.fill();x.fillStyle='#3a1c0b';}
  else if(g){rr(x,k.x,y,k.w,k.h,rad);x.fillStyle='rgba(30,18,12,.75)';x.fill();x.strokeStyle='rgba(255,255,255,.06)';x.lineWidth=1;x.stroke();
   const cx=k.x+k.w/2,cy=y+k.h/2,hr=Math.min(k.w,k.h)*.16;x.fillStyle='#070302';x.beginPath();x.arc(cx+k.w*.18,cy+k.h*.12,hr,0,7);x.fill();x.strokeStyle='rgba(180,40,30,.8)';x.lineWidth=1;
   for(let i=0;i<5;i++){const a=i*1.3+k.L.charCodeAt(0);x.beginPath();x.moveTo(cx+k.w*.18+Math.cos(a)*hr,cy+k.h*.12+Math.sin(a)*hr);x.lineTo(cx+k.w*.18+Math.cos(a)*hr*2.3,cy+k.h*.12+Math.sin(a)*hr*2.3);x.stroke();}x.fillStyle='rgba(200,160,120,.3)';}
  else{const gg=x.createLinearGradient(0,y,0,y+k.h);gg.addColorStop(0,pressed?'#6a4428':'#4a2e1a');gg.addColorStop(1,pressed?'#3c2414':'#2a170c');rr(x,k.x,y,k.w,k.h,rad);x.fillStyle=gg;x.fill();
   x.strokeStyle='rgba(255,214,150,.32)';x.lineWidth=1.2;x.stroke();x.fillStyle='rgba(255,230,190,.12)';rr(x,k.x+3,y+2,k.w-6,Math.max(2,k.h*.18),rad*.6);x.fill();x.fillStyle='#fbe8c4';}
  x.font=`900 ${Math.min(k.h*.56,k.w*.62)}px ${SLAB}`;x.textAlign='center';x.textBaseline='middle';x.fillText(k.label||k.L,k.x+k.w/2,y+k.h*.53);
 }
 function hud(){
  const lw=clamp(W*.24,96,190),logo=makeLogo(lw,dpr,false),lh=Math.min(40,logo.h);const sc=lh/logo.h;x.drawImage(logo.c,8,4,logo.w*sc,logo.h*sc);
  const hx=8+logo.w*sc+12,maxW=W-hx-140;if(maxW<60)return;x.textAlign='left';x.textBaseline='alphabetic';
  if(mode==='turns'){x.font=`900 ${clamp(H*.022,13,17)}px ${SLAB}`;x.fillStyle='#ffd88a';x.fillText(`BOUNTY ${st.round+1}/${ROUNDS}`,hx,20,maxW);
   if(st.phase==='play'){x.font=`800 12px ${SANS}`;x.fillStyle=PC[st.turn];x.fillText(`▶ ${name(st.turn).toUpperCase()}’S TURN`,hx,37,maxW);}}
  else if(mode==='shared'){x.font=`900 ${clamp(H*.022,13,17)}px ${SLAB}`;x.fillStyle='#ffd88a';x.fillText(`BOUNTY ${st.round+1}/${ROUNDS}`,hx,20,maxW);
   const bw=Math.min(maxW,170),fr=clamp(st.clock/CLOCK,0,1);rr(x,hx,28,bw,8,4);x.fillStyle='rgba(0,0,0,.45)';x.fill();rr(x,hx,28,Math.max(8,bw*fr),8,4);x.fillStyle=fr<.2?'#ff5a3c':'#f2b04e';x.fill();
   x.font=`700 11px ${SANS}`;x.fillStyle='#f7dfb8';if(maxW>bw+40)x.fillText(`${Math.ceil(st.clock)}s`,hx+bw+8,36);}
  else{x.font=`900 ${clamp(H*.022,13,17)}px ${SLAB}`;x.fillStyle='#ffd88a';const g=st.guesser,wr=st.writer;x.fillText(st.phase==='write'?`${name(wr).toUpperCase()} POSTS A BOUNTY`:`BOUNTY ${st.round+1}/2`,hx,20,maxW);
   x.font=`600 11px ${SANS}`;x.fillStyle='#f0d4ac';x.fillText(st.phase==='write'?`for ${name(g)} · keep it secret`:`${name(g)} guesses · written by ${name(wr)}`,hx,36,maxW);}
 }
 function actionButton(b){
  const labels={deal:'🎲 DEAL',clue:'CLUE',space:'SPACE',back:'⌫',done:'DONE ✓'},ok=b.id!=='done'||letterCount(st.draft)>=3,pressed=T-(st.press['w'+b.id]??-9)<.12,y=b.y+(pressed?2:0);
  const g=x.createLinearGradient(0,y,0,y+b.h);if(b.id==='done'&&ok){g.addColorStop(0,'#e64a3a');g.addColorStop(1,'#9b1419');}else{g.addColorStop(0,'#4a2e1a');g.addColorStop(1,'#2a170c');}
  rr(x,b.x,y,b.w,b.h,12);x.fillStyle=g;x.fill();x.strokeStyle=b.id==='done'?'#ffb08a':'rgba(255,214,150,.35)';x.lineWidth=1.3;x.stroke();x.globalAlpha=ok?1:.45;
  x.fillStyle='#fbe8c4';x.textAlign='center';x.textBaseline='middle';
  if(b.id==='clue'){x.font=`600 ${clamp(b.h*.2,9,12)}px ${SANS}`;x.fillText('CLUE',b.x+b.w/2,y+b.h*.3);x.font=`800 ${clamp(b.h*.22,9,13)}px ${SANS}`;x.fillText(CATEGORIES[st.draftCat],b.x+b.w/2,y+b.h*.66,b.w-6);}
  else{x.font=`800 ${clamp(b.h*.3,11,17)}px ${SANS}`;x.fillText(labels[b.id],b.x+b.w/2,y+b.h*.53,b.w-6);}
  x.globalAlpha=1;
 }
 function poster(r){
  x.save();x.shadowColor='rgba(0,0,0,.55)';x.shadowBlur=16;rr(x,r.x,r.y,r.w,r.h,12);x.fillStyle='#e9d3a4';x.fill();x.restore();
  const head=clamp(r.h*.17,24,60);x.font=`900 ${head}px ${SLAB}`;x.textAlign='center';x.textBaseline='middle';x.fillStyle='#2a140a';x.fillText('WANTED',r.x+r.w/2,r.y+head*.75,r.w-20);
  x.font=`700 ${clamp(head*.3,10,15)}px ${SANS}`;x.fillStyle='#7a1a14';x.fillText(`A PHRASE FOR ${name(st.guesser).toUpperCase()} TO GUESS`,r.x+r.w/2,r.y+head*1.45,r.w-20);
  const br={x:r.x+8,y:r.y+head*1.8,w:r.w-16,h:r.h-head*1.8-28};board(br,{all:true,text:st.draft,title:'CLUE: '+CATEGORIES[st.draftCat],cursor:true});
  x.font=`600 ${clamp(r.h*.04,9,12)}px ${SANS}`;x.fillStyle='#5a3a22';x.fillText(`${st.draft.length}/${MAXLEN} · tap 🎲 DEAL for a phrase from the deck`,r.x+r.w/2,r.y+r.h-13,r.w-16);
 }

 // ---------------------------------------------------------------- frame
 s.frame(dt=>{
  T+=dt;DT=dt;W=s.W;H=s.H;if(cpu)cpuHang(dt);
  dpr=Math.min(2,window.devicePixelRatio||1);const cw=Math.round(W*dpr),ch=Math.round(H*dpr);if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}
  x.setTransform(dpr,0,0,dpr,0,0);
  for(let i=waits.length-1;i>=0;i--)if(waits[i].f()){waits[i].r();waits.splice(i,1);}
  if(st.phase==='play'&&mode==='shared'){st.clock-=dt;const sec=Math.ceil(st.clock);if(sec<=5&&sec>0&&sec!==st.tick){st.tick=sec;SFX.spurs({steps:1,vol:.25});}
   if(st.clock<=0){st.clock=0;st.result={kind:'time'};SFX.whinny({});endRound();}}
  if(st.phase==='play'&&mode==='turns'){st.tclock-=dt;const sec=Math.ceil(st.tclock);if(sec<=3&&sec>0&&sec!==st.tick){st.tick=sec;SFX.spurs({steps:1,vol:.25});}if(st.tclock<=0)timeout(st.turn);}
  lay=layout();shake=Math.max(0,shake-dt*1.6);
  x.save();if(shake>0)x.translate((Math.random()-.5)*shake*14,(Math.random()-.5)*shake*14);
  backdrop();
  if(st.phase==='intro'||st.phase==='final')drawCard();
  else if(st.phase==='write'){poster(lay.poster);for(const b of lay.act)actionButton(b);keyboard(lay.kb[0],lay.keys[0].map(k=>({...k})),null);hud();}
  else{
   for(const [i,pn] of (lay.panels||[]).entries()){const p=duel?i:st.guesser,open=st.hanged[p]?Math.min(1,(T-st.hanged[p])/.14):0;gallows(pn,open);
    if(st.phase!=='handoff')cowboy(pn,p,Math.min(LIVES-1,st.misses[p]),{hangT:st.hanged[p],cutT:st.cut[p]});card(pn,p,{label:mode==='pass'?'GUESSING':mode==='turns'&&st.phase==='play'?(st.turn===p?'▼ YOUR SHOT':st.hanged[p]?null:'WAITING'):null});
    if(mode==='turns'&&st.phase==='play'&&st.turn!==p&&!st.hanged[p]){x.save();rr(x,pn.r.x,pn.r.y,pn.r.w,pn.r.h,10);x.fillStyle='rgba(12,5,3,.38)';x.fill();x.restore();}}
   if(st.phase!=='handoff'){board(lay.phrase,{all:st.phase==='reveal'});
    lay.kb.forEach((r,i)=>keyboard(r,lay.keys[i],mode==='shared'?i:mode==='turns'?st.turn:st.guesser,{active:st.phase==='play'}));}
   hud();
   if(st.phase==='banner')banner();
   if(st.phase==='reveal')resultBanner();
  }
  for(let i=fx.length-1;i>=0;i--){const f=fx[i],a=(T-f.t)/f.life;if(a>=1){fx.splice(i,1);continue;}f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=f.k==='spark'?300*dt:-10*dt;
   if(f.k==='spark'){x.fillStyle=`rgba(255,${200+Math.random()*55|0},120,${1-a})`;x.fillRect(f.x,f.y,2,2);}else{x.fillStyle=f.k==='smoke'?`rgba(235,225,210,${.3*(1-a)})`:`rgba(190,140,90,${.5*(1-a)})`;x.beginPath();x.arc(f.x,f.y,f.r*(1+a*1.5),0,7);x.fill();}}
  for(let i=floats.length-1;i>=0;i--){const f=floats[i],a=(T-f.t)/f.life;if(a>=1){floats.splice(i,1);continue;}x.globalAlpha=Math.min(1,(1-a)*2);x.font=`900 ${clamp(Math.min(W,H)*.05,16,30)}px ${SLAB}`;x.textAlign='center';x.textBaseline='middle';
   x.lineWidth=4;x.strokeStyle='#1a0704';x.strokeText(f.text,f.x,f.y-a*40);x.fillStyle=f.color;x.fillText(f.text,f.x,f.y-a*40);x.globalAlpha=1;}
  x.restore();
 });
 function drawCard(){
  const lw=Math.min(W*.86,620,H*1.05),logo=makeLogo(lw,dpr,true),hs0=clamp(Math.min(W,H)*.2,60,140),ly=Math.max(8,(H-(logo.h+H*.03+hs0*2.1))/2-H*.05);
  const k=st.phase==='intro'?Math.min(1,T/.35):1;x.save();x.globalAlpha=k;x.translate(W/2,ly+logo.h/2);x.scale(.8+.2*k,.8+.2*k);x.drawImage(logo.c,-logo.w/2,-logo.h/2,logo.w,logo.h);x.restore();
  const y0=ly+logo.h+H*.03,hs=clamp(Math.min(W,H)*.2,60,140);
  for(const p of [0,1]){const cx=W/2+(p?1:-1)*hs*.85,hc=headOf?.(s.players[p].character,st.phase==='final'?(st.winner===p?'win':st.winner<0?'normal':'sad'):'normal');
   x.save();x.translate(cx,y0+hs*.62);x.scale(hs/40,hs/40);if(hc)x.drawImage(hc,-18,-34+14,36,36);x.translate(0,-14);x.rotate(p?.1:-.1);hat(OUTFIT[p]);x.restore();
   x.textAlign='center';x.textBaseline='middle';x.font=`800 ${clamp(hs*.15,12,18)}px ${SANS}`;x.fillStyle=PC[p];x.fillText(name(p).toUpperCase(),cx,y0+hs*1.22,hs*1.5);
   if(st.phase==='final'){x.font=`900 ${clamp(hs*.3,20,40)}px ${SLAB}`;x.fillStyle='#ffe2a8';x.fillText(String(st.score[p]),cx,y0+hs*1.5);}}
  x.textAlign='center';x.textBaseline='middle';
  if(st.phase==='intro'){x.font=`700 ${clamp(H*.026,13,19)}px ${SANS}`;x.fillStyle='#f6d9a8';x.fillText(mode==='turns'?'SHOWDOWN · take turns, one letter each':mode==='shared'?'QUICK DRAW · both guess at once':'WANTED · write one, guess one',W/2,y0+hs*1.6,W-30);
   x.font=`600 ${clamp(H*.02,11,14)}px ${SANS}`;x.fillStyle=`rgba(255,230,190,${.5+.4*Math.sin(T*4)})`;x.fillText('tap to ride',W/2,Math.min(H-50,y0+hs*1.6+34));}
  else{const w=st.winner,txt=w<0?'A DEAD HEAT':`${name(w).toUpperCase()} COLLECTS THE BOUNTY`;x.font=`900 ${clamp(Math.min(W,H)*.06,18,40)}px ${SLAB}`;x.lineWidth=5;x.strokeStyle='#1a0704';x.strokeText(txt,W/2,y0+hs*1.95,W-24);x.fillStyle='#ffcf5a';x.fillText(txt,W/2,y0+hs*1.95,W-24);}
 }
 function banner(){const a=T-st.bannerT,k=Math.min(1,a/.25);x.save();x.fillStyle=`rgba(10,4,2,${.55*k})`;x.fillRect(0,0,W,H);x.translate(W/2,H*.45);x.scale(1.4-.4*k,1.4-.4*k);x.globalAlpha=k;
  const w=Math.min(W*.8,420),h=w*.42;rr(x,-w/2,-h/2,w,h,14);x.fillStyle='#ead2a0';x.fill();x.strokeStyle='#5a3218';x.lineWidth=3;x.stroke();
  x.textAlign='center';x.textBaseline='middle';x.fillStyle='#2a140a';x.font=`900 ${h*.28}px ${SLAB}`;x.fillText(duel?`BOUNTY ${st.round+1}`:'WANTED',0,-h*.12);
  if(mode==='turns'){x.font=`800 ${h*.11}px ${SANS}`;x.fillStyle=PC[st.turn];x.fillText(`${name(st.turn).toUpperCase()} SHOOTS FIRST`,0,h*.38,w-20);}
  x.font=`800 ${h*.13}px ${SANS}`;x.fillStyle='#9a1219';x.fillText(st.cat,0,h*.22,w-20);x.restore();}
 function resultBanner(){const a=T-st.bannerT;if(a<.6)return;const k=Math.min(1,(a-.6)/.25),r=st.result||{};let txt,col;
  if(r.kind==='solved'){txt=`${name(r.p).toUpperCase()} COLLECTS`;col='#ffcf5a';}else if(r.kind==='time'){txt='SUNDOWN · NO BOUNTY';col='#ff9a5a';}else if(r.kind==='hanged'&&r.p!=null){txt=`${name(r.p).toUpperCase()} SWINGS · +50 ${name(st.writer).toUpperCase()}`;col='#ff6b5e';}else{txt='BOTH HANGED';col='#ff6b5e';}
  const cy=lay.phrase?lay.phrase.y-14:H*.5;x.save();x.globalAlpha=k;x.font=`900 ${clamp(Math.min(W,H)*.055,16,34)}px ${SLAB}`;x.textAlign='center';x.textBaseline='middle';const tw=Math.min(W-20,x.measureText(txt).width+30);
  rr(x,W/2-tw/2,cy-22,tw,40,20);x.fillStyle='rgba(16,7,3,.9)';x.fill();x.strokeStyle=col;x.lineWidth=2;x.stroke();x.fillStyle=col;x.fillText(txt,W/2,cy-1,tw-20);x.restore();}

 // vs CPU (Quick Draw and Showdown): the outlaw guesses by English letter frequency, and now and then (more on Hard) a letter it knows is there
 const cpu=isCpu(s)&&mode!=='pass',FREQ='ETAOINSRHLDCUMFPGWYBVKXJQZ';let cpuT=1.5;
 function cpuHang(dt){if(st.phase!=='play'||st.hanged[1]||st.lock[1]>T||!players().includes(1))return;const sk=cpuSkill(s);cpuT-=dt;if(cpuT>0)return;cpuT=mode==='shared'?1.6-sk*.8+Math.random()*.7:.9+Math.random()*.8;
  const left=[...FREQ].filter(L=>!st.guessed.has(L)),inText=left.filter(L=>st.text.includes(L));if(!left.length)return;const L=inText.length&&Math.random()<.12+sk*.3?inText[0]:left[Math.min(left.length-1,Math.floor(Math.random()*(4-sk*3)))];guess(1,L);}
 // ---------------------------------------------------------------- input
 s.on(c,'pointerdown',ev=>{ev.preventDefault();if(s.paused||!s.alive)return;const pt=s.pointer(ev);
  if(st.phase==='intro'||st.phase==='final'){if(T>.5)st.skip=true;return;}
  if(st.phase==='reveal'||st.phase==='banner'){if(T-st.bannerT>1.2)st.skip=true;return;}
  if(st.phase==='write'){for(const b of lay.act||[])if(inRect(pt,b)){st.press['w'+b.id]=T;({deal,clue:cycleClue,space:()=>typeChar(' '),back:backspace,done:doneWriting})[b.id]();return;}
   for(const k of lay.keys?.[0]||[])if(inRect(pt,k)){st.press['w'+k.L]=T;typeChar(k.L);return;}return;}
  if(st.phase==='play')(lay.keys||[]).forEach((ks,i)=>{const p=mode==='shared'?i:mode==='turns'?st.turn:st.guesser;if(cpu&&p===1)return;for(const k of ks)if(inRect(pt,{x:k.x-2,y:k.y-2,w:k.w+4,h:k.h+4})){guess(p,k.L);st.press[p+k.L]=T;return;}});
 });
 s.on(document,'keydown',ev=>{if(s.paused||!s.alive||ev.repeat||ev.target?.matches?.('input,textarea,[contenteditable]'))return;const k=ev.key;
  if(st.phase==='write'){if(/^[a-z]$/i.test(k))typeChar(k.toUpperCase());else if(k===' '||k==="'"||k==='-')typeChar(k);else if(k==='Backspace')backspace();else if(k==='Enter')doneWriting();else return;ev.preventDefault();return;}
  if(st.phase==='play'&&/^[a-z]$/i.test(k)){ev.preventDefault();const who=mode==='shared'?0:mode==='turns'?st.turn:st.guesser;if(!(cpu&&who===1))guess(who,k.toUpperCase());}
  else if(['intro','final','reveal'].includes(st.phase)&&(k==='Enter'||k===' ')){ev.preventDefault();st.skip=true;}});
 s.debug={st,guess,type:t=>{st.draft=String(t).toUpperCase().slice(0,MAXLEN);},deal,done:doneWriting,skip:()=>{st.skip=true;},layout:()=>lay};

 // ---------------------------------------------------------------- flow
 SFX.gallop({beats:7,vol:.45});SFX.whip({delay:1.3});SFX.gunshot({delay:1.6});SFX.yeehaw({delay:1.85});
 st.skip=false;await sleep(3.2);if(!s.alive)return;st.skip=false;
 if(duel){
  const picks=[];for(const q of shuffle(PHRASES,s.random)){if(picks.length>=ROUNDS)break;if(q.text.length>26||picks.some(o=>o.cat===q.cat))continue;picks.push(q);}
  for(let r=0;r<ROUNDS;r++){st.round=r;startRound(picks[r].text,picks[r].cat);st.turn=r%2;st.tclock=TURN;s.active=st.turn;s.updateScores();st.phase='banner';st.bannerT=T;SFX.cylinder({});SFX.cock({delay:.55});
   await sleep(1.5);if(!s.alive)return;st.skip=false;st.phase='play';st.turnT=T;st.tclock=TURN;await until(()=>st.phase==='reveal');await sleep(3.2);if(!s.alive)return;st.skip=false;}
 }else{
  for(let r=0;r<2;r++){st.round=r;st.writer=r;st.guesser=1-r;st.draft='';st.draftCat=0;st.written=null;st.phase='handoff';
   if(!await s.pass(st.writer,`${name(st.writer)}: write a phrase for ${name(st.guesser)} to guess, or deal one from the deck. ${name(st.guesser)}, look away!`,'Write the bounty'))return;
   st.phase='write';SFX.spurs({steps:2});await until(()=>st.written);if(!s.alive)return;st.phase='handoff';
   if(!await s.pass(st.guesser,`${name(st.guesser)}: ${name(st.writer)} posted a bounty. Six bullets in the chamber. Guess it before the trapdoor drops.`,'Saddle up',{countdown:3}))return;
   startRound(st.written.text,st.written.cat);st.phase='banner';st.bannerT=T;SFX.cylinder({});await sleep(1.3);if(!s.alive)return;st.skip=false;
   st.phase='play';await until(()=>st.phase==='reveal');await sleep(3.4);if(!s.alive)return;st.skip=false;}
 }
 st.winner=st.score[0]===st.score[1]?-1:st.score[0]>st.score[1]?0:1;st.phase='final';floats.length=0;fx.length=0;s.setScores(st.score);
 SFX.yeehaw({pitch:st.winner===1?1.12:1});SFX.gunshot({delay:1.1});SFX.gunshot({delay:1.35});SFX.gunshot({delay:1.6});
 await sleep(3.4);if(!s.alive)return;
 s.finish(st.score,st.winner<0?'Hangman Unchained · a dead heat.':`Hangman Unchained · ${name(st.winner)} collects the bounty.`);
}
Object.assign(exports,{HANGMAN_WORDS,hangmanGuess,normalizeHangmanAnswer,hangman,makeLogo});
