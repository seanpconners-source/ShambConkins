// SQWORDLE (owner, Nov 12): the daily-word game, looking just like the real one, the whole thing themed on Squirtle.
// Six tries at a five-letter word: a tile turns SQUIRTLE BLUE for the right letter in the right spot, SHELL GOLD for a
// letter that's in the word somewhere else, grey for a letter that isn't in it. Typing pops the tile, ENTER flips the row
// one tile at a time, a word not in the list shakes the row, a win bounces it and Squirtle pops up squirting water.
// Two players: the same word for both, one after the other (a hand-off card hides it); fewer guesses wins, the clock breaks
// ties. One player (Arcade 1P): word after word until a miss, every solved word adds to the streak score.
// Online (owner, Nov 12): both phones get the same NET_WORDS words and play each one at the same time (netField start).
// Each phone sends its guesses ({g:[word,res,letters]}), what's typed ({c:[word,n,letters]}) and its result ({d:[word,res]}).
// While you play you only see the other's little colour grid (no letters drawn); once you're done you watch their whole
// board, letters and all (owner, Nov 12), until they finish. Then both see the word's result; the next word starts once both tapped
// Next word (sync) at the same moment on both phones. Most points over the words wins.
// Squirtle is our own drawing until the owner's pictures come in (slots in sqwordleArt.js). Getting the word plays one of
// Squirtle's moves by the number of guesses (Water Gun, Bubble Beam, Hydro Pump...), and the head by the title reacts to each guess.
// Light or dark like the phone (the real game's two looks). Touch the on-screen keys or type on a real keyboard.
const {fullBleed}=require("src/engines/fullBleed.js");
const {fullscreenSupported}=require("src/fullscreen.js");
const {ANSWERS,VALID}=require("src/data/sqwordleWords.js");
const {tone,vibrate}=require("src/audio.js");
const {store}=require("src/state.js");
const {soloProgress,soloFinish}=require("src/solo.js");
const {netField}=require("src/engines/netField.js");
let CHAT=null;try{CHAT=require("src/chat.js");}catch{}

const {ROWS,COLS,grade,points}=require("src/engines/sqwordleRules.js");
const FLIP=480,STAG=280,BOUNCE=110;
// win messages by number of guesses (the real game's six, Squirtle style)
const WIN=['SQUIRTLE SQUIRT!','Hydro Pump!','Bubble Beam!','Water Gun!','Withdraw…','Phew! Close one'];
const NET_WORDS=3;
const KEYROWS=['qwertyuiop','asdfghjkl','+zxcvbnm<'];// + = ENTER, < = backspace

// Squirtle (our drawing, or the owner's pictures when they're in), backgrounds and the six moves: src/engines/sqwordleArt.js
const ART=require("src/engines/sqwordleArt.js"),{picture,mascot}=ART;
const rr=(x,X,Y,w,h,r)=>{x.beginPath();if(x.roundRect)x.roundRect(X,Y,w,h,r);else x.rect(X,Y,w,h);};

async function sqwordle(s){
 const [c,x]=s.canvas(420,760,{fill:true});
 const dark=typeof matchMedia!=='undefined'&&matchMedia('(prefers-color-scheme: dark)').matches;
 const P=dark?{bg:'#121213',text:'#f8f8f8',empty:'#3a3a3c',filled:'#565758',key:'#818384',keyText:'#f8f8f8',absent:'#3a3a3c',line:'#3a3a3c',soft:'#818384',toast:'#f8f8f8',toastText:'#121213'}
  :{bg:'#ffffff',text:'#1a1a1b',empty:'#d3d6da',filled:'#878a8c',key:'#d3d6da',keyText:'#1a1a1b',absent:'#787c7e',line:'#d3d6da',soft:'#787c7e',toast:'#1a1a1b',toastText:'#ffffff'};
 P.correct='#3a95d6';P.present='#d39a3a';// Squirtle blue, shell gold
 const COL=[P.absent,P.present,P.correct];
 const fb=fullBleed(s,{bg:P.bg});
 s.hint('Guess the five-letter word in six tries. Tap the keys (or type) and press ENTER. Blue = right letter in the right spot, gold = in the word but somewhere else, grey = not in the word.');
 let dpr=1,L=null,board=null,toast=null,help=false,results=null,parts=[],keyDown=null,phase='play',react=null,hasBg=false;
 // online: nf = the move channel, word = the word being played, opp[word] = the other phone's board (colours only)
 let nf=null,word=0;const opp={},tot=[0,0];
 const tell=e=>{if(nf&&board&&board.i===nf.me)nf.event(e);};
 const sfx=(f,d=.05,v=.04,w='triangle')=>{if(store.profile?.settings.sound!==false)tone(f,d,v,w);};

 function newBoard(i,ans){return {i,ans,rows:[],cur:'',done:null,t0:performance.now(),t1:0,shake:0,pop:[],revealAt:[],winAt:0,doneAt:0};}
 // layout for this screen: header, info line, grid, keyboard (side by side on short wide screens)
 function layout(){const W=s.W,H=s.H,side=W>H*1.25&&H<600,hh=Math.max(Math.round(Math.max(40,Math.min(62,H*.075))),(fb?.top||0)+4),info=board?(nf?40:28):0,bot=fullscreenSupported()?40:12;// room for the ⤢ toggle at the bottom centre
  const gx0=0,gy0=hh+info+6;let kbX,kbY,kbW,keyH,gW,gH;
  if(side){gW=W*.5;gH=H-gy0-8;kbW=Math.min(W*.46,480);keyH=Math.max(34,Math.min(54,(H-gy0-bot)/3.6));kbX=W*.52;kbY=gy0+(H-gy0-bot-(keyH*3+16))/2;}
  else{kbW=Math.min(W-12,500);keyH=Math.round(Math.max(36,Math.min(58,H*.072)));kbY=H-bot-(keyH*3+16);kbX=(W-kbW)/2;gW=W;gH=kbY-gy0-8;}
  const gap=Math.max(3,Math.round(Math.min(gW,gH)*.012)),t=Math.floor(Math.min(62,(gW-24-gap*4)/COLS,(gH-gap*5)/ROWS)),gw=t*COLS+gap*4,gh=t*ROWS+gap*5;
  const keys=[];KEYROWS.forEach((row,r)=>{const units=[...row].reduce((a,k)=>a+(k==='+'||k==='<'?1.5:1),0)+(r===1?1:0),kg=6,u=(kbW-kg*(row.length-1)-(r===1?kg:0))/units;let px=kbX+(r===1?u*.5+kg/2:0);
   for(const k of row){const w=(k==='+'||k==='<'?1.5:1)*u;keys.push({k,x:px,y:kbY+r*(keyH+8),w,h:keyH});px+=w+kg;}});
  return {W,H,side,hh,info,gx:gx0+(gW-gw)/2,gy:gy0+Math.max(0,(gH-gh)/2),t,gap,keys,keyH};}
 // letter states on the keyboard: only from rows that have finished flipping
 function keyState(b,now){const st={};b.rows.forEach((row,ri)=>{if(now<b.revealAt[ri]+STAG*(COLS-1)+FLIP)return;[...row.word].forEach((ch,i)=>{st[ch]=Math.max(st[ch]??-1,row.res[i]);});});return st;}
 function say(text,ms=1100){toast={text,until:performance.now()+ms};}
 function press(k){if(help){help=false;return;}if(skipShow())return;if(phase==='results'){if(results&&!results.waiting&&performance.now()>results.at+600)results.done();return;}
  const b=board;if(!b||b.done||s.paused)return;const now=performance.now();
  if(b.revealAt.length&&now<b.revealAt[b.revealAt.length-1]+STAG*(COLS-1)+FLIP)return;// wait for the last row to finish flipping
  if(k==='<'){if(b.cur.length){b.cur=b.cur.slice(0,-1);sfx(330,.04,.03);tell({c:[word,b.cur.length,b.cur]});}return;}
  if(k==='+'){if(b.cur.length<COLS){b.shake=now;say('Not enough letters');sfx(150,.12,.05,'square');vibrate(30);return;}
   if(!VALID.has(b.cur)){b.shake=now;say('Not in word list');react={mood:'think',at:now,until:now+1500};sfx(150,.12,.05,'square');vibrate(30);return;}
   const res=grade(b.cur,b.ans);b.rows.push({word:b.cur,res});b.revealAt.push(now);b.cur='';tell({g:[word,res,b.rows[b.rows.length-1].word]});
   for(let i=0;i<COLS;i++)setTimeout(()=>{if(s.alive)sfx([392,440,494,523,587][i],.06,.035);},STAG*i+FLIP/2);
   const end=now+STAG*(COLS-1)+FLIP;
   if(res.every(v=>v===2)){b.done='win';b.t1=now;b.winAt=end;const kind=ART.moveFor(b.rows.length,true);b.show={kind,at:end};b.doneAt=end+ART.LEN[kind]+500;
    setTimeout(()=>{if(!s.alive)return;say(WIN[b.rows.length-1],1800);sfx(659,.12,.05);setTimeout(()=>sfx(784,.12,.05),120);setTimeout(()=>sfx(1047,.2,.05),240);},end-now);}
   else if(b.rows.length>=ROWS){b.done='lose';b.t1=now;b.show={kind:'sad',at:end};b.doneAt=end+ART.LEN.sad+200;setTimeout(()=>{if(!s.alive)return;say(b.ans.toUpperCase(),2200);sfx(220,.25,.05,'sine');},end-now);}
   else{// the head by the title reacts once the row has flipped: new blue tiles = happy, nothing at all = sad
    const before=b.rows.slice(0,-1),newBlue=res.filter((v,i)=>v===2&&!before.some(r=>r.res[i]===2)).length,blank=res.every(v=>v===0);
    if(newBlue>=2||blank)setTimeout(()=>{if(s.alive&&board===b&&!b.done)react={mood:blank?'sad':'happy',at:performance.now(),until:performance.now()+1600};},end-now);}
   return;}
  if(/^[a-z]$/.test(k)&&b.cur.length<COLS){b.pop[b.cur.length]=now;b.cur+=k;sfx(520,.03,.025);tell({c:[word,b.cur.length,b.cur]});}
 }
 // water squirting out of Squirtle's mouth when you get it
 function splash(){if(!L)return;const cx=L.gx+(L.t*COLS+L.gap*4)/2,cy=L.gy+L.t*ROWS+L.gap*5;
  for(let k=0;k<60;k++){const a=-Math.PI/2+(Math.random()-.5)*1.6,v=260+Math.random()*420;parts.push({x:cx,y:cy,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1.4+Math.random()*.6,r:2+Math.random()*4});}}

 // tap during Squirtle's move (after a moment) = on to the next screen
 function skipShow(){const b=board,now=performance.now();if(!b||!b.done||!b.show||b.reported||now<b.show.at+800)return false;b.doneAt=Math.min(b.doneAt,now);return true;}
 // Squirtle stands where the keyboard was (not needed once the word is done) and aims at the last row
 function stageFor(b){const ks=L.keys;if(!ks.length)return null;const x0=Math.min(...ks.map(q=>q.x)),x1=Math.max(...ks.map(q=>q.x+q.w)),y0=Math.min(...ks.map(q=>q.y)),y1=Math.max(...ks.map(q=>q.y+q.h));
  const r=Math.max(0,b.rows.length-1),tx=L.gx+(L.t*COLS+L.gap*4)/2,ty=L.gy+r*(L.t+L.gap)+L.t/2,h=Math.min(240,Math.max(90,(y1-y0)*1.08),L.H*.34);
  const left=L.side?false:true;return {gw:L.t*COLS+L.gap*4,x:left?Math.max(x0+(x1-x0)*.24,x0+h*.42):Math.min(x0+(x1-x0)*.75,x1-h*.42),y:y1+2,h,face:left?1:-1,tx,ty,W:L.W,H:L.H};}
 function showSfx(e){if(e==='gun'){for(let k=0;k<8;k++)setTimeout(()=>sfx(700+k*60,.05,.025,'sine'),k*70);}
  else if(e==='hydro'){for(let k=0;k<10;k++)setTimeout(()=>sfx(110+Math.random()*40,.09,.04,'sawtooth'),k*90);}
  else if(e==='bubble'){for(let k=0;k<12;k++)setTimeout(()=>sfx(900+Math.random()*500,.03,.025,'sine'),k*110);}
  else if(e==='pop')sfx(1100+Math.random()*300,.03,.03,'sine');
  else if(e==='spin'){for(let k=0;k<6;k++)setTimeout(()=>sfx([523,659,784][k%3],.05,.03),k*160);}
  else if(e==='phew'){sfx(500,.12,.03,'sine');setTimeout(()=>sfx(350,.2,.03,'sine'),130);}
  else if(e==='cheer'){sfx(784,.08,.04);setTimeout(()=>sfx(1047,.15,.04),100);}}
 function drawShow(b,now,dt){if(!b||!b.show||now<b.show.at)return 0;const st=stageFor(b);if(!st)return 0;
  if(!b.showRun)b.showRun=ART.createShow(b.show.kind,st,b.show.at);b.showRun.stage=st;
  return ART.drawShow(x,b.showRun,now,dt,dark,showSfx).shake||0;}
 function keysAlpha(b,now){return b&&b.show&&now>b.show.at?Math.max(.1,1-(now-b.show.at)/350):1;}
 s.on(c,'pointerdown',ev=>{ev.preventDefault();if(!L)return;const pt=s.pointer(ev);
  if(pt.y<L.hh&&pt.x<L.hh*1.2){help=!help;return;}// ? opens How to play
  if(help||phase==='results'){press('');return;}if(skipShow())return;
  const k=L.keys.find(q=>pt.x>=q.x&&pt.x<=q.x+q.w&&pt.y>=q.y&&pt.y<=q.y+q.h);if(k){keyDown={k:k.k,at:performance.now()};press(k.k);}});
 s.on(document,'keydown',ev=>{if(s.paused||ev.metaKey||ev.ctrlKey||ev.altKey)return;const k=ev.key;
  if(k==='Enter'){ev.preventDefault();press('+');}else if(k==='Backspace'){ev.preventDefault();press('<');}else if(/^[a-zA-Z]$/.test(k))press(k.toLowerCase());});

 // ---- drawing
 function tile(cx,cy,t,ch,state,now,{flip=1,colour=null,border=P.empty,scale=1,dy=0}={}){
  x.save();x.translate(cx,cy+dy);x.scale(scale,scale*flip);
  if(colour){x.fillStyle=colour;x.fillRect(-t/2,-t/2,t,t);}else{x.strokeStyle=border;x.lineWidth=2;x.strokeRect(-t/2+1,-t/2+1,t-2,t-2);}
  if(ch){x.fillStyle=colour?'#fff':P.text;x.font=`bold ${Math.round(t*.55)}px "Helvetica Neue",Arial,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(ch.toUpperCase(),0,t*.03);}
  x.restore();}
 function drawBoard(b,now){const {gx,gy,t,gap}=L;
  for(let r=0;r<ROWS;r++){const row=b.rows[r],cur=r===b.rows.length&&!b.done;let sx=0;
   if(cur&&b.shake&&now-b.shake<600){const k=(now-b.shake)/600;sx=Math.sin(k*Math.PI*8)*t*.14*(1-k);}
   for(let i=0;i<COLS;i++){const cx=gx+sx+i*(t+gap)+t/2,cy=gy+r*(t+gap)+t/2;
    if(row){const st=b.revealAt[r]+STAG*i,p=Math.min(1,Math.max(0,(now-st)/FLIP)),shown=p>=.5;let dy=0;
     if(b.done==='win'&&r===b.rows.length-1&&now>b.winAt){const q=(now-b.winAt-BOUNCE*i)/320;if(q>0&&q<1)dy=-Math.sin(q*Math.PI)*t*.38;}
     tile(cx,cy,t,row.word[i],0,now,{flip:Math.abs(Math.cos(p*Math.PI)),colour:shown?COL[row.res[i]]:null,border:P.filled,dy});}
    else if(cur&&i<b.cur.length){const q=Math.min(1,(now-(b.pop[i]||0))/110);tile(cx,cy,t,b.cur[i],0,now,{border:P.filled,scale:1+.12*Math.sin(q*Math.PI)});}
    else tile(cx,cy,t,'',0,now,{border:P.empty});}}}
 function drawKeys(b,now){const st=b?keyState(b,now):{};
  for(const q of L.keys){const v=st[q.k],down=keyDown&&keyDown.k===q.k&&now-keyDown.at<120;
   x.fillStyle=v===undefined?P.key:COL[v];const ga=x.globalAlpha;if(down)x.globalAlpha=ga*.7;rr(x,q.x,q.y,q.w,q.h,4);x.fill();x.globalAlpha=ga;
   x.fillStyle=v===undefined?P.keyText:'#fff';x.textAlign='center';x.textBaseline='middle';
   if(q.k==='+'){x.font=`bold ${Math.round(Math.min(q.h*.24,q.w*.2))}px "Helvetica Neue",Arial,sans-serif`;x.fillText('ENTER',q.x+q.w/2,q.y+q.h/2);}
   else if(q.k==='<'){const cx=q.x+q.w/2,cy=q.y+q.h/2,u=Math.min(q.h,q.w)*.18;x.strokeStyle=x.fillStyle;x.lineWidth=2;x.beginPath();x.moveTo(cx-u*1.9,cy);x.lineTo(cx-u*.9,cy-u);x.lineTo(cx+u*1.8,cy-u);x.lineTo(cx+u*1.8,cy+u);x.lineTo(cx-u*.9,cy+u);x.closePath();x.stroke();x.beginPath();x.moveTo(cx-u*.1,cy-u*.5);x.lineTo(cx+u*.9,cy+u*.5);x.moveTo(cx+u*.9,cy-u*.5);x.lineTo(cx-u*.1,cy+u*.5);x.stroke();}
   else{x.font=`bold ${Math.round(Math.min(q.h*.34,q.w*.55))}px "Helvetica Neue",Arial,sans-serif`;x.fillText(q.k.toUpperCase(),q.x+q.w/2,q.y+q.h/2+1);}}}
 function drawHeader(now){const {W,hh}=L;x.fillStyle=P.bg;x.fillRect(0,0,W,hh);x.strokeStyle=P.line;x.lineWidth=1;x.beginPath();x.moveTo(0,hh-.5);x.lineTo(W,hh-.5);x.stroke();
  // ? help (left), the title with Squirtle (centre); the right side stays clear for Pause/Exit
  x.strokeStyle=P.text;x.lineWidth=2;x.beginPath();x.arc(hh*.55,hh/2,hh*.2,0,Math.PI*2);x.stroke();x.fillStyle=P.text;x.font=`bold ${Math.round(hh*.26)}px "Helvetica Neue",Arial,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText('?',hh*.55,hh/2+1);
  // centred between the ? and the Pause/Exit pills (about 130 px at the top right), smaller if it doesn't fit
  const r=hh*.3,lo=nf?chatSlot(hh).x+31:hh*1.1,hi=W-136;let fs=Math.round(hh*.56);x.font=`bold ${fs}px Georgia,"Times New Roman",serif`;let tw=x.measureText('Sqwordle').width;
  if(tw+r*2.6>hi-lo){fs=Math.max(14,Math.floor(fs*(hi-lo)/(tw+r*2.6)));x.font=`bold ${fs}px Georgia,"Times New Roman",serif`;tw=x.measureText('Sqwordle').width;}
  const mid=Math.min(W/2,(lo+hi)/2),tx=mid+r*1.3;
  // the head reacts to the last guess: a hop when happy, a shake when sad or puzzled
  const re=react&&now<react.until?react:null,q=re?(now-re.at)/1000:0,mood=re?re.mood:'idle',
   hop=re&&mood==='happy'?-Math.abs(Math.sin(q*9))*r*.5*Math.max(0,1-q/1.4):0,wig=re&&mood!=='happy'?Math.sin(q*22)*r*.18*Math.max(0,1-q/1.2):0;
  const logo=picture('logo');if(logo){const lh=hh*.78,lw=Math.min(hi-lo-r*2.6,logo.naturalWidth*lh/logo.naturalHeight),k=lw/logo.naturalWidth;x.drawImage(logo,mid-lw/2+r*1.3,hh/2-logo.naturalHeight*k/2,lw,logo.naturalHeight*k);
   mascot(x,mid-lw/2-r*.1+wig,hh/2-r*.1+hop,r,mood,now/1000);return;}
  x.fillText('Sqwordle',tx,hh/2+hh*.03);mascot(x,tx-tw/2-r*1.25+wig,hh/2-r*.1+hop,r,mood,now/1000);}
 function drawInfo(b,now){if(!L.info)return;const watch=phase==='watch'&&nf;if(watch)b=oppOf(word);const {W,hh}=L,y=hh+L.info/2+3,p=s.players[b.i],secs=((b.done?b.t1||now:now)-b.t0)/1000;
  const label=watch?`Watching ${p.name} · word ${word+1}/${NET_WORDS}`:nf?`${p.name} · word ${word+1}/${NET_WORDS}${tot[b.i]?` · ${tot[b.i]} pts`:''}`:s.solo?`${p.name} · word ${streak.n+1}${streak.total?` · ${streak.total} pts`:''}`:`${p.name}'s word`;
  // online while you play: the other player's face + colour grid on the LEFT (the top-right corner belongs to Pause/Exit),
  // your own line centred in the room that's left
  let lo=8;if(nf&&!watch){const o=oppOf(word),cell=5,gw=cell*5+4,gx=12+26,gy=y-(cell*6+5)/2;
   s.sprite(x,o.i,12+11,y,22,{exact:true,still:true,noBadge:true,mood:o.done==='win'?'win':o.done?'sad':undefined});miniGrid(o,gx,gy,cell,now);lo=gx+gw+10;}
  let fs=13;x.font=`bold ${fs}px "Helvetica Neue",Arial,sans-serif`;let w=x.measureText(label).width+66;const room=W-8-lo;
  if(w>room){fs=Math.max(9,Math.floor(fs*(room-66)/(w-66)));x.font=`bold ${fs}px "Helvetica Neue",Arial,sans-serif`;w=x.measureText(label).width+66;}
  const X=lo+Math.max(0,(room-w)/2);
  s.sprite(x,b.i,X+11,y,22,{exact:true,still:true,noBadge:true});x.fillStyle=P.text;x.textAlign='left';x.textBaseline='middle';x.fillText(label,X+26,y);
  x.fillStyle=P.soft;x.font=`${fs}px "Helvetica Neue",Arial,sans-serif`;x.fillText(`${Math.floor(secs/60)}:${String(Math.floor(secs%60)).padStart(2,'0')}`,X+w-34,y);}
 // online: the chat button's own spot in the header, right of the ? (src/chat.js setChatHome; the player can still drag it
 // anywhere and it remembers that)
 function chatSlot(hh){return {x:hh*.75+31,y:hh/2};}
 // a small colour-only grid of board b (rows that have flipped, the typed letters of the row being written as grey cells)
 function miniGrid(b,gx,gy,cell,now){for(let r=0;r<ROWS;r++)for(let i=0;i<COLS;i++){const row=b.rows[r],X=gx+i*(cell+1),Y=gy+r*(cell+1);
   if(row&&now>=b.revealAt[r]+STAG*i+FLIP/2)x.fillStyle=COL[row.res[i]];else if(!row&&r===b.rows.length&&!b.done&&i<b.cur.length)x.fillStyle=P.filled;else{x.strokeStyle=P.empty;x.lineWidth=1;x.strokeRect(X+.5,Y+.5,cell-1,cell-1);continue;}
   x.fillRect(X,Y,cell,cell);}}
 // the other phone's board for word w (made on their first message, or when the word starts)
 function oppOf(w){return opp[w]||(opp[w]=Object.assign(newBoard(nf?nf.remote:1,''),{t0:performance.now()}));}
 function onEvent(e){const now=performance.now();
  if(Array.isArray(e?.c)){const o=oppOf(e.c[0]);if(!o.done){const n=Math.max(0,Math.min(COLS,e.c[1]|0)),txt=typeof e.c[2]==='string'?e.c[2].toLowerCase().replace(/[^a-z]/g,'').slice(0,n):'';if(n>o.cur.length)o.pop[n-1]=now;o.cur=txt.padEnd(n,' ');}}
  else if(Array.isArray(e?.g)&&Array.isArray(e.g[1])){const o=oppOf(e.g[0]);if(o.done||o.rows.length>=ROWS)return;o.rows.push({word:typeof e.g[2]==='string'?e.g[2].toLowerCase().replace(/[^a-z]/g,'').slice(0,COLS):'',res:e.g[1].map(v=>v|0)});o.revealAt.push(now);o.cur='';
   if(phase==='watch'&&e.g[0]===word)for(let i=0;i<COLS;i++)setTimeout(()=>{if(s.alive)sfx([392,440,494,523,587][i],.06,.025);},STAG*i+FLIP/2);}
  else if(Array.isArray(e?.d)&&e.d[1]){const w=e.d[0],o=oppOf(w),r=e.d[1];if(o.res)return;o.res=r;o.done=r.win?'win':'lose';o.t1=o.t0+(+r.secs||0)*1000;
   const end=Math.max(now,(o.revealAt[o.revealAt.length-1]||0)+STAG*(COLS-1)+FLIP),watching=phase==='watch'&&w===word;o.winAt=end;o.doneAt=watching?end+(r.win?BOUNCE*COLS+1600:2400):now;
   const name=s.players[o.i].name;setTimeout(()=>{if(!s.alive||w!==word)return;if(r.win){say(`${name} got it in ${r.n}!`,1800);if(watching){splash();sfx(659,.12,.05);setTimeout(()=>sfx(784,.12,.05),120);}}else say(`${name} missed it`,1800);},end-now);}}
 // after your board is done: their board up top, your result where the keys were
 function drawWatch(now){const o=oppOf(word),b=board,top=L.keys.length?Math.min(...L.keys.map(q=>q.y)):L.H*.7,left=L.side?L.W*.52:0,w=L.side?L.W*.46:L.W,cx=left+w/2;
  x.fillStyle=P.text;x.textAlign='center';x.textBaseline='middle';x.font=`bold 16px "Helvetica Neue",Arial,sans-serif`;
  const r=b.done==='win';x.fillText(r?`You got it in ${b.rows.length}!`:`Missed it: ${b.ans.toUpperCase()}`,cx,top+14);
  const cell=8,gw=cell*5+4*2;b.rows.forEach((row,k)=>row.res.forEach((v,i)=>{x.fillStyle=COL[v];x.fillRect(cx-gw/2+i*(cell+2),top+32+k*(cell+2),cell,cell);}));
  x.fillStyle=P.soft;x.font=`14px "Helvetica Neue",Arial,sans-serif`;const dots='.'.repeat(1+Math.floor(now/400)%3);
  x.fillText(o.done?`${s.players[o.i].name} is done`:`Waiting for ${s.players[o.i].name} to finish${dots}`,cx,top+40+6*(cell+2)+14);}
 function drawMascot(b,now){if(!b||!b.done)return;const end=b.revealAt[b.revealAt.length-1]+STAG*(COLS-1)+FLIP;if(now<end)return;
  const k=Math.min(1,(now-end)/350),r=Math.min(L.t*.9,46),cx=L.gx+(L.t*COLS+L.gap*4)/2,cy=L.gy+L.t*ROWS+L.gap*5-r*(.2+.75*k);
  x.save();x.beginPath();x.rect(0,0,L.W,L.gy+L.t*ROWS+L.gap*5+2);x.clip();mascot(x,cx,cy,r,b.done==='win'?'happy':'sad',now/1000);x.restore();}
 // with a background picture: soft frosted panels behind the grid and the keys so the tiles still read like the real game
 function drawPanels(){const {gx,gy,t,gap}=L,gw=t*COLS+gap*4,gh=t*ROWS+gap*5,pad=Math.max(8,t*.2);x.save();x.fillStyle=P.bg;x.globalAlpha=.86;
  if(phase==='results'){rr(x,8,L.hh+8,L.W-16,L.H-L.hh-16,18);x.fill();x.restore();return;}
  rr(x,gx-pad,gy-pad,gw+pad*2,gh+pad*2,16);x.fill();
  if(L.keys.length){const x0=Math.min(...L.keys.map(q=>q.x)),x1=Math.max(...L.keys.map(q=>q.x+q.w)),y0=Math.min(...L.keys.map(q=>q.y)),y1=Math.max(...L.keys.map(q=>q.y+q.h));
   if(!(board&&board.show&&performance.now()>board.show.at)){rr(x,x0-6,y0-6,x1-x0+12,y1-y0+12,14);x.fill();}}
  x.restore();}
 function drawParts(dt){for(const p of parts){p.vy+=900*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;x.globalAlpha=Math.max(0,Math.min(1,p.life));ART.drop(x,p,dark);}x.globalAlpha=1;parts=parts.filter(p=>p.life>0&&p.y<L.H+20);}
 function drawToast(now){if(!toast||now>toast.until)return;x.font=`bold 15px "Helvetica Neue",Arial,sans-serif`;const w=x.measureText(toast.text).width+32,h=40,X=(L.W-w)/2,Y=L.gy+8;
  x.globalAlpha=Math.min(1,(toast.until-now)/200);x.fillStyle=P.toast;rr(x,X,Y,w,h,4);x.fill();x.fillStyle=P.toastText;x.textAlign='center';x.textBaseline='middle';x.fillText(toast.text,L.W/2,Y+h/2);x.globalAlpha=1;}
 function drawHelp(){const {W,H}=L;x.fillStyle=dark?'#000c':'#fffe';x.fillRect(0,0,W,H);const w=Math.min(W-24,420),X=(W-w)/2,t=Math.min(40,(w-40)/5.6);let y=Math.max(L.hh+10,H*.08);
  x.fillStyle=P.text;x.textAlign='left';x.textBaseline='top';x.font=`bold 26px Georgia,serif`;x.fillText('How To Play',X,y);y+=40;x.font=`16px "Helvetica Neue",Arial,sans-serif`;
  for(const line of ['Guess the Sqwordle in 6 tries.','Each guess must be a real 5-letter word.','The tiles change colour to show how close you are.']){x.fillText(line,X,y);y+=24;}
  y+=8;const ex=[['shell',0,2,'S is in the word and in the right spot.'],['water',1,1,'A is in the word but in the wrong spot.'],['squid',2,0,'U is not in the word in any spot.']];
  for(const [w2,at,v,txt] of ex){for(let i=0;i<5;i++)tile(X+i*(t+4)+t/2,y+t/2,t,w2[i]||'e',0,0,{colour:i===at?COL[v]:null,border:P.filled});y+=t+6;x.fillStyle=P.text;x.textAlign='left';x.textBaseline='top';x.font=`15px "Helvetica Neue",Arial,sans-serif`;x.fillText(txt,X,y);y+=28;}
  mascot(x,X+w-40,y+30,30,'happy',0);x.font=`italic 14px "Helvetica Neue",Arial,sans-serif`;x.fillStyle=P.soft;x.fillText('Squirtle squirt! Tap anywhere to play.',X,y+20);}
 function drawResults(now){const {W,H}=L;if(!hasBg){x.fillStyle=P.bg;x.fillRect(0,L.hh,W,H-L.hh);}const R=results;
  x.fillStyle=P.text;x.textAlign='center';x.textBaseline='middle';x.font=`bold ${Math.round(Math.min(30,W*.07))}px Georgia,serif`;x.fillText(R.title,W/2,L.hh+40);
  x.font=`15px "Helvetica Neue",Arial,sans-serif`;x.fillStyle=P.soft;x.fillText(`The word was`,W/2,L.hh+72);
  const t=Math.min(40,(W-40)/7);for(let i=0;i<COLS;i++)tile(W/2+(i-2)*(t+4),L.hh+100+t/2,t,R.ans[i],0,now,{colour:P.correct});
  const colW=Math.min(W/2-10,220),y0=L.hh+100+t+30,mt=Math.min(18,(colW-40)/6);
  R.rows.forEach((r,j)=>{const cx=R.rows.length===1?W/2:W/2+(j?1:-1)*(colW/2+6);s.sprite(x,r.i,cx,y0+22,40,{exact:true,still:true,noBadge:true,mood:r.res.win?'win':'sad'});
   x.fillStyle=P.text;x.font=`bold 16px "Helvetica Neue",Arial,sans-serif`;x.fillText(s.players[r.i].name,cx,y0+56);
   x.font=`14px "Helvetica Neue",Arial,sans-serif`;x.fillStyle=P.soft;x.fillText(`${r.res.win?r.res.n:'X'}/6 · ${Math.floor(r.res.secs/60)}:${String(Math.round(r.res.secs%60)).padStart(2,'0')}`,cx,y0+78);
   r.res.grid.forEach((row,k)=>row.forEach((v,i)=>{x.fillStyle=COL[v];x.fillRect(cx-(mt*5+12)/2+i*(mt+3),y0+94+k*(mt+3),mt,mt);}));
   x.fillStyle=P.text;x.font=`bold 18px "Helvetica Neue",Arial,sans-serif`;x.fillText(`${points(r.res)} pts`,cx,y0+104+6*(mt+3)+8);
   if(R.tot){x.fillStyle=P.soft;x.font=`14px "Helvetica Neue",Arial,sans-serif`;x.fillText(`${R.tot[r.i]} total`,cx,y0+104+6*(mt+3)+30);}});
  const by0=Math.min(H-46-44,y0+150+6*(mt+3)+(R.tot?16:0));
  if(R.waiting){x.fillStyle=P.soft;x.font=`15px "Helvetica Neue",Arial,sans-serif`;x.fillText(R.waiting+'.'.repeat(1+Math.floor(now/400)%3),W/2,by0+23);}
  else if(now>R.at+600){x.fillStyle=P.correct;const bw=180,bh=46,bx=W/2-bw/2,by=by0;rr(x,bx,by,bw,bh,23);x.fill();x.fillStyle='#fff';x.font=`bold 16px "Helvetica Neue",Arial,sans-serif`;x.fillText(R.btn||'Continue',W/2,by+bh/2);}}

 let last=performance.now();
 s.frame(()=>{const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
  dpr=Math.min(2,window.devicePixelRatio||1);const cw=Math.round(s.W*dpr),ch=Math.round(s.H*dpr);if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}
  x.setTransform(dpr,0,0,dpr,0,0);L=layout();x.fillStyle=P.bg;x.fillRect(0,0,L.W,L.H);
  hasBg=ART.drawBackground(x,L.W,L.H,dark,L.hh);if(hasBg)drawPanels();
  drawHeader(now);
  if(phase==='results'&&results)drawResults(now);
  else if(board&&phase==='watch'){drawInfo(board,now);const o=oppOf(word);drawBoard(o,now);drawMascot(o,now);drawWatch(now);drawToast(now);}
  else if(board){drawInfo(board,now);const sh=board.shakeK||0;if(sh){x.save();x.translate((Math.random()-.5)*sh*2,(Math.random()-.5)*sh*2);}drawBoard(board,now);if(sh)x.restore();
   x.save();x.globalAlpha=keysAlpha(board,now);drawKeys(board,now);x.restore();board.shakeK=drawShow(board,now,dt);drawToast(now);}
  drawParts(dt);if(help)drawHelp();
  if(board&&board.done&&!board.reported&&now>board.doneAt){board.reported=true;board.finish?.();}});

 // one board for player i; resolves {win,n,secs,best,grid} once the row has flipped and the moment has sunk in
 function play(i,ans){return new Promise(res=>{board=newBoard(i,ans);board.finish=()=>{const b=board;res({win:b.done==='win',n:b.rows.length,secs:(b.t1-b.t0)/1000,best:Math.max(0,...b.rows.map(r=>r.res.filter(v=>v===2).length)),grid:b.rows.map(r=>r.res)});};});}
 const pick=()=>ANSWERS[Math.floor(s.random()*ANSWERS.length)];
 const streak={n:0,total:0};
 // test hooks: the answer, type a word, an autopilot that guesses two random words then the answer
 s.debug={get board(){return board;},get phase(){return phase;},answer:()=>board?.ans,show:()=>board?.show&&{kind:board.show.kind,at:board.show.at,run:!!board.showRun},react:()=>react,type(w){for(const ch of w)press(ch);press('+');},grade,points,
  set bot(on){if(!on)return;const tick=()=>{if(!s.alive)return;botStep();setTimeout(tick,400);};tick();},
  // online tests: one step per call (tests/online-native.mjs)
  get bot(){return nf?botStep:undefined;},get opp(){return oppOf(word);},get word(){return word;},get totals(){return tot.slice();}};
 let botAt=0;
 function botStep(){const now=performance.now();if(now<botAt)return 'wait';botAt=now+400+Math.random()*900;
  if(phase==='results'){if(results&&!results.waiting&&now>results.at+700){results.done();return 'next';}return 'results';}
  if(board&&!board.done&&!board.cur&&!(board.revealAt.length&&now<board.revealAt[board.revealAt.length-1]+STAG*(COLS-1)+FLIP)){const n=board.rows.length;
   s.debug.type(n<1+Math.floor(Math.random()*3)?ANSWERS[Math.floor(Math.random()*ANSWERS.length)]:board.ans);return 'guess';}
  return 'play';}

 nf=netField(s,{pack:()=>0,unpack(){},onEvent,hz:1});
 if(nf){// online: the same words for both phones, played at the same time
  // the duel score chip would sit on the ? and the title; the game shows both players' points itself
  if(!document.getElementById('sqw-net-css'))document.head.append(Object.assign(document.createElement('style'),{id:'sqw-net-css',textContent:'body.sqw-net #duel-chip{display:none}'}));
  document.body.classList.add('sqw-net');s.cleanup(()=>document.body.classList.remove('sqw-net'));
  if(CHAT?.setChatHome){CHAT.setChatHome(()=>{if(!L)return null;const r=c.getBoundingClientRect(),q=chatSlot(L.hh);return {x:r.left+q.x,y:r.top+q.y};});s.cleanup(()=>CHAT.setChatHome(null));}
  const words=Array.from({length:NET_WORDS},pick),me=nf.me,them=nf.remote,wait=ok=>new Promise(r=>{const t=setInterval(()=>{if(!s.alive||nf.gone||ok()){clearInterval(t);r();}},100);});
  for(word=0;word<NET_WORDS;word++){const ans=words[word];board=null;phase='play';
   await nf.start('w'+word);if(!s.alive)return;if(nf.gone)break;
   oppOf(word).t0=performance.now();
   const mine=await play(me,ans);if(!s.alive)return;nf.event({d:[word,mine]});
   const o=oppOf(word);if(!o.res)phase='watch';
   await wait(()=>o.res&&performance.now()>o.doneAt);if(!s.alive)return;if(nf.gone)break;
   tot[me]+=points(mine);tot[them]+=points(o.res);s.setScores(tot.slice());
   const last=word===NET_WORDS-1,pm=points(mine),po=points(o.res),wr=pm===po?-1:pm>po?me:them,wt=tot[0]===tot[1]?-1:tot[0]>tot[1]?0:1;
   const title=last?(wt<0?'Dead even!':`${s.players[wt].name} wins!`):wr<0?`Word ${word+1}: dead even`:`${s.players[wr].name} takes word ${word+1}`;
   await new Promise(done=>{phase='results';results={ans,rows:[{i:0,res:me===0?mine:o.res},{i:1,res:me===1?mine:o.res}],title,tot:tot.slice(),btn:last?'Finish':'Next word',at:performance.now(),done};});
   if(last)break;results.waiting=`Waiting for ${s.players[them].name}`;await nf.sync('n'+word);if(!s.alive)return;if(nf.gone)break;results=null;}
  results=null;
  s.finish(tot.slice(),`${s.players[0].name} ${tot[0]} · ${s.players[1].name} ${tot[1]} over ${Math.min(NET_WORDS,word+1)} word${word?'s':''}`);return;}
 if(s.solo){// Arcade 1P: word after word until a miss
  for(;;){const r=await play(0,pick());if(!s.alive)return;
   if(r.win){streak.total+=points(r);streak.n++;s.setScores([streak.total,0]);soloProgress(s,streak.total,streak.n,`${streak.n} word${streak.n===1?'':'s'} in a row`);
    board=null;if(!await s.pass(0,`Word ${streak.n+1}. Keep the streak going!`,'Next word',{soloTitle:`Word ${streak.n+1}`}))return;continue;}
   soloFinish(s,streak.total,streak.n,streak.n?`${streak.n} word${streak.n===1?'':'s'} in a row, then "${board.ans.toUpperCase()}" got away`:`"${board.ans.toUpperCase()}" got away`);return;}}
 // two players: the same word for both, one after the other
 const ans=pick(),out=[];
 for(const i of [0,1]){board=null;const other=s.players[1-i].name;
  if(!await s.pass(i,`${s.players[i].name}'s turn at today's Sqwordle. ${other}, no peeking!`,'Ready'))return;
  out.push({i,res:await play(i,ans)});if(!s.alive)return;s.setScores([0,1].map(j=>out.find(o=>o.i===j)?points(out.find(o=>o.i===j).res):0));}
 const sc=[0,1].map(j=>points(out.find(o=>o.i===j).res)),w=sc[0]===sc[1]?-1:sc[0]>sc[1]?0:1;
 await new Promise(done=>{phase='results';results={ans,rows:out,title:w<0?'Dead even!':`${s.players[w].name} wins!`,at:performance.now(),done};});
 const label=out.map(o=>`${s.players[o.i].name} ${o.res.win?o.res.n:'X'}/6`).join(' · ')+` · the word was ${ans.toUpperCase()}`;
 s.finish(sc,label);
}

Object.assign(exports,{sqwordle});
