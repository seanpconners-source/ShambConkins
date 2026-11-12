// SQWORDLE (owner, Nov 12): the daily-word game, looking just like the real one, the whole thing themed on Squirtle.
// Six tries at a five-letter word: a tile turns SQUIRTLE BLUE for the right letter in the right spot, SHELL GOLD for a
// letter that's in the word somewhere else, grey for a letter that isn't in it. Typing pops the tile, ENTER flips the row
// one tile at a time, a word not in the list shakes the row, a win bounces it and Squirtle pops up squirting water.
// Two players: the same word for both, one after the other (a hand-off card hides it); fewer guesses wins, the clock breaks
// ties. One player (Arcade 1P, online duels): word after word until a miss, every solved word adds to the streak score.
// Squirtle here is our own drawing (a little blue turtle with a shell): art slots for the owner's pictures come later.
// Light or dark like the phone (the real game's two looks). Touch the on-screen keys or type on a real keyboard.
const {fullBleed}=require("src/engines/fullBleed.js");
const {fullscreenSupported}=require("src/fullscreen.js");
const {ANSWERS,VALID}=require("src/data/sqwordleWords.js");
const {tone,vibrate}=require("src/audio.js");
const {store}=require("src/state.js");
const {soloProgress,soloFinish}=require("src/solo.js");

const {ROWS,COLS,grade,points}=require("src/engines/sqwordleRules.js");
const FLIP=480,STAG=280,BOUNCE=110;
// win messages by number of guesses (the real game's six, Squirtle style)
const WIN=['SQUIRTLE SQUIRT!','Hydro Pump!','Bubble Beam!','Water Gun!','Withdraw…','Phew! Close one'];
const KEYROWS=['qwertyuiop','asdfghjkl','+zxcvbnm<'];// + = ENTER, < = backspace

// ---- Squirtle (our own drawing): head with big eyes, a peek of the shell; mood 'happy' | 'sad' | 'idle'
function squirtle(x,cx,cy,r,mood='idle',t=0){
 x.save();x.translate(cx,cy);
 // shell rim behind the head
 x.fillStyle='#b8733a';x.beginPath();x.ellipse(0,r*.95,r*1.15,r*.55,0,Math.PI,0);x.fill();
 x.fillStyle='#f1d58e';x.beginPath();x.ellipse(0,r*1.02,r*.95,r*.42,0,Math.PI,0);x.fill();
 // head
 const g=x.createRadialGradient(-r*.3,-r*.4,r*.2,0,0,r*1.1);g.addColorStop(0,'#a6dcf6');g.addColorStop(1,'#5aaee0');
 x.fillStyle=g;x.beginPath();x.ellipse(0,0,r,r*.92,0,0,Math.PI*2);x.fill();x.strokeStyle='#2c6d96';x.lineWidth=Math.max(1,r*.06);x.stroke();
 // eyes
 const blink=mood==='idle'&&((t%4)>3.85);
 for(const s of [-1,1]){const ex=s*r*.38,ey=-r*.12;
  if(mood==='sad'||blink){x.strokeStyle='#3a2318';x.lineWidth=r*.09;x.lineCap='round';x.beginPath();x.arc(ex,ey+(mood==='sad'?r*.12:0),r*.17,mood==='sad'?Math.PI*1.15:Math.PI*.15,mood==='sad'?Math.PI*1.85:Math.PI*.85);x.stroke();continue;}
  x.fillStyle='#fff';x.beginPath();x.ellipse(ex,ey,r*.22,r*.28,0,0,Math.PI*2);x.fill();
  x.fillStyle='#7a2e1e';x.beginPath();x.ellipse(ex+s*r*.03,ey+r*.04,r*.15,r*.2,0,0,Math.PI*2);x.fill();
  x.fillStyle='#1b0b06';x.beginPath();x.ellipse(ex+s*r*.03,ey+r*.06,r*.08,r*.11,0,0,Math.PI*2);x.fill();
  x.fillStyle='#fff';x.beginPath();x.arc(ex-r*.04,ey-r*.06,r*.06,0,Math.PI*2);x.fill();}
 // mouth
 x.strokeStyle='#2c4f66';x.lineWidth=r*.07;x.lineCap='round';
 if(mood==='happy'){x.fillStyle='#8a2b2b';x.beginPath();x.arc(0,r*.32,r*.22,0,Math.PI);x.closePath();x.fill();x.stroke();x.fillStyle='#f28b8b';x.beginPath();x.arc(0,r*.44,r*.1,0,Math.PI*2);x.fill();}
 else if(mood==='sad'){x.beginPath();x.arc(0,r*.55,r*.18,Math.PI*1.15,Math.PI*1.85);x.stroke();
  x.fillStyle='#8fd3ff';x.beginPath();x.ellipse(r*.42,r*.2+((t*40)%(r*.6)),r*.06,r*.1,0,0,Math.PI*2);x.fill();}
 else{x.beginPath();x.arc(0,r*.25,r*.2,Math.PI*.15,Math.PI*.85);x.stroke();}
 x.restore();
}
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
 let dpr=1,L=null,board=null,toast=null,help=false,results=null,parts=[],keyDown=null,phase='play';
 const sfx=(f,d=.05,v=.04,w='triangle')=>{if(store.profile?.settings.sound!==false)tone(f,d,v,w);};

 function newBoard(i,ans){return {i,ans,rows:[],cur:'',done:null,t0:performance.now(),t1:0,shake:0,pop:[],revealAt:[],winAt:0,doneAt:0};}
 // layout for this screen: header, info line, grid, keyboard (side by side on short wide screens)
 function layout(){const W=s.W,H=s.H,side=W>H*1.25&&H<600,hh=Math.round(Math.max(40,Math.min(62,H*.075))),info=board?28:0,bot=fullscreenSupported()?40:12;// room for the ⤢ toggle at the bottom centre
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
 function press(k){if(help){help=false;return;}if(phase==='results'){if(results&&performance.now()>results.at+600)results.done();return;}
  const b=board;if(!b||b.done||s.paused)return;const now=performance.now();
  if(b.revealAt.length&&now<b.revealAt[b.revealAt.length-1]+STAG*(COLS-1)+FLIP)return;// wait for the last row to finish flipping
  if(k==='<'){if(b.cur.length){b.cur=b.cur.slice(0,-1);sfx(330,.04,.03);}return;}
  if(k==='+'){if(b.cur.length<COLS){b.shake=now;say('Not enough letters');sfx(150,.12,.05,'square');vibrate(30);return;}
   if(!VALID.has(b.cur)){b.shake=now;say('Not in word list');sfx(150,.12,.05,'square');vibrate(30);return;}
   const res=grade(b.cur,b.ans);b.rows.push({word:b.cur,res});b.revealAt.push(now);b.cur='';
   for(let i=0;i<COLS;i++)setTimeout(()=>{if(s.alive)sfx([392,440,494,523,587][i],.06,.035);},STAG*i+FLIP/2);
   const end=now+STAG*(COLS-1)+FLIP;
   if(res.every(v=>v===2)){b.done='win';b.t1=now;b.winAt=end;b.doneAt=end+BOUNCE*COLS+1500;setTimeout(()=>{if(!s.alive)return;say(WIN[b.rows.length-1],1800);splash();sfx(659,.12,.05);setTimeout(()=>sfx(784,.12,.05),120);setTimeout(()=>sfx(1047,.2,.05),240);},end-now);}
   else if(b.rows.length>=ROWS){b.done='lose';b.t1=now;b.doneAt=end+2200;setTimeout(()=>{if(!s.alive)return;say(b.ans.toUpperCase(),2200);sfx(220,.25,.05,'sine');},end-now);}
   return;}
  if(/^[a-z]$/.test(k)&&b.cur.length<COLS){b.pop[b.cur.length]=now;b.cur+=k;sfx(520,.03,.025);}
 }
 // water squirting out of Squirtle's mouth when you get it
 function splash(){if(!L)return;const cx=L.gx+(L.t*COLS+L.gap*4)/2,cy=L.gy+L.t*ROWS+L.gap*5;
  for(let k=0;k<60;k++){const a=-Math.PI/2+(Math.random()-.5)*1.6,v=260+Math.random()*420;parts.push({x:cx,y:cy,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1.4+Math.random()*.6,r:2+Math.random()*4});}}

 s.on(c,'pointerdown',ev=>{ev.preventDefault();if(!L)return;const pt=s.pointer(ev);
  if(pt.y<L.hh&&pt.x<L.hh*1.2){help=!help;return;}// ? opens How to play
  if(help||phase==='results'){press('');return;}
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
   x.fillStyle=v===undefined?P.key:COL[v];if(down)x.globalAlpha=.7;rr(x,q.x,q.y,q.w,q.h,4);x.fill();x.globalAlpha=1;
   x.fillStyle=v===undefined?P.keyText:'#fff';x.textAlign='center';x.textBaseline='middle';
   if(q.k==='+'){x.font=`bold ${Math.round(Math.min(q.h*.24,q.w*.2))}px "Helvetica Neue",Arial,sans-serif`;x.fillText('ENTER',q.x+q.w/2,q.y+q.h/2);}
   else if(q.k==='<'){const cx=q.x+q.w/2,cy=q.y+q.h/2,u=Math.min(q.h,q.w)*.18;x.strokeStyle=x.fillStyle;x.lineWidth=2;x.beginPath();x.moveTo(cx-u*1.9,cy);x.lineTo(cx-u*.9,cy-u);x.lineTo(cx+u*1.8,cy-u);x.lineTo(cx+u*1.8,cy+u);x.lineTo(cx-u*.9,cy+u);x.closePath();x.stroke();x.beginPath();x.moveTo(cx-u*.1,cy-u*.5);x.lineTo(cx+u*.9,cy+u*.5);x.moveTo(cx+u*.9,cy-u*.5);x.lineTo(cx-u*.1,cy+u*.5);x.stroke();}
   else{x.font=`bold ${Math.round(Math.min(q.h*.34,q.w*.55))}px "Helvetica Neue",Arial,sans-serif`;x.fillText(q.k.toUpperCase(),q.x+q.w/2,q.y+q.h/2+1);}}}
 function drawHeader(now){const {W,hh}=L;x.fillStyle=P.bg;x.fillRect(0,0,W,hh);x.strokeStyle=P.line;x.lineWidth=1;x.beginPath();x.moveTo(0,hh-.5);x.lineTo(W,hh-.5);x.stroke();
  // ? help (left), the title with Squirtle (centre); the right side stays clear for Pause/Exit
  x.strokeStyle=P.text;x.lineWidth=2;x.beginPath();x.arc(hh*.55,hh/2,hh*.2,0,Math.PI*2);x.stroke();x.fillStyle=P.text;x.font=`bold ${Math.round(hh*.26)}px "Helvetica Neue",Arial,sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText('?',hh*.55,hh/2+1);
  // centred between the ? and the Pause/Exit pills (about 130 px at the top right), smaller if it doesn't fit
  const r=hh*.3,lo=hh*1.1,hi=W-136;let fs=Math.round(hh*.56);x.font=`bold ${fs}px Georgia,"Times New Roman",serif`;let tw=x.measureText('Sqwordle').width;
  if(tw+r*2.6>hi-lo){fs=Math.max(14,Math.floor(fs*(hi-lo)/(tw+r*2.6)));x.font=`bold ${fs}px Georgia,"Times New Roman",serif`;tw=x.measureText('Sqwordle').width;}
  const mid=Math.min(W/2,(lo+hi)/2),tx=mid+r*1.3;
  x.fillText('Sqwordle',tx,hh/2+hh*.03);squirtle(x,tx-tw/2-r*1.25,hh/2-r*.1,r,'idle',now/1000);}
 function drawInfo(b,now){if(!L.info)return;const {W,hh}=L,y=hh+L.info/2+3,p=s.players[b.i],secs=((b.done?b.t1:now)-b.t0)/1000;
  const label=s.solo?`${p.name} · word ${streak.n+1}${streak.total?` · ${streak.total} pts`:''}`:`${p.name}'s word`;
  x.font=`bold 13px "Helvetica Neue",Arial,sans-serif`;const w=x.measureText(label).width+40,X=W/2-w/2-26;
  s.sprite(x,b.i,X+11,y,22,{exact:true,still:true,noBadge:true});x.fillStyle=P.text;x.textAlign='left';x.textBaseline='middle';x.fillText(label,X+26,y);
  x.fillStyle=P.soft;x.font=`13px "Helvetica Neue",Arial,sans-serif`;x.fillText(`${Math.floor(secs/60)}:${String(Math.floor(secs%60)).padStart(2,'0')}`,X+26+w-30,y);}
 function drawMascot(b,now){if(!b||!b.done)return;const end=b.revealAt[b.revealAt.length-1]+STAG*(COLS-1)+FLIP;if(now<end)return;
  const k=Math.min(1,(now-end)/350),r=Math.min(L.t*.9,46),cx=L.gx+(L.t*COLS+L.gap*4)/2,cy=L.gy+L.t*ROWS+L.gap*5-r*(.2+.75*k);
  x.save();x.beginPath();x.rect(0,0,L.W,L.gy+L.t*ROWS+L.gap*5+2);x.clip();squirtle(x,cx,cy,r,b.done==='win'?'happy':'sad',now/1000);x.restore();}
 function drawParts(dt){x.fillStyle=dark?'#7cc8ff':'#4aa8e8';for(const p of parts){p.vy+=900*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;x.globalAlpha=Math.max(0,Math.min(1,p.life));x.beginPath();x.ellipse(p.x,p.y,p.r*.7,p.r,Math.atan2(p.vy,p.vx)+Math.PI/2,0,Math.PI*2);x.fill();}x.globalAlpha=1;parts=parts.filter(p=>p.life>0&&p.y<L.H+20);}
 function drawToast(now){if(!toast||now>toast.until)return;x.font=`bold 15px "Helvetica Neue",Arial,sans-serif`;const w=x.measureText(toast.text).width+32,h=40,X=(L.W-w)/2,Y=L.gy+8;
  x.globalAlpha=Math.min(1,(toast.until-now)/200);x.fillStyle=P.toast;rr(x,X,Y,w,h,4);x.fill();x.fillStyle=P.toastText;x.textAlign='center';x.textBaseline='middle';x.fillText(toast.text,L.W/2,Y+h/2);x.globalAlpha=1;}
 function drawHelp(){const {W,H}=L;x.fillStyle=dark?'#000c':'#fffe';x.fillRect(0,0,W,H);const w=Math.min(W-24,420),X=(W-w)/2,t=Math.min(40,(w-40)/5.6);let y=Math.max(L.hh+10,H*.08);
  x.fillStyle=P.text;x.textAlign='left';x.textBaseline='top';x.font=`bold 26px Georgia,serif`;x.fillText('How To Play',X,y);y+=40;x.font=`16px "Helvetica Neue",Arial,sans-serif`;
  for(const line of ['Guess the Sqwordle in 6 tries.','Each guess must be a real 5-letter word.','The tiles change colour to show how close you are.']){x.fillText(line,X,y);y+=24;}
  y+=8;const ex=[['shell',0,2,'S is in the word and in the right spot.'],['water',1,1,'A is in the word but in the wrong spot.'],['squid',2,0,'U is not in the word in any spot.']];
  for(const [w2,at,v,txt] of ex){for(let i=0;i<5;i++)tile(X+i*(t+4)+t/2,y+t/2,t,w2[i]||'e',0,0,{colour:i===at?COL[v]:null,border:P.filled});y+=t+6;x.fillStyle=P.text;x.textAlign='left';x.textBaseline='top';x.font=`15px "Helvetica Neue",Arial,sans-serif`;x.fillText(txt,X,y);y+=28;}
  squirtle(x,X+w-40,y+30,30,'happy',0);x.font=`italic 14px "Helvetica Neue",Arial,sans-serif`;x.fillStyle=P.soft;x.fillText('Squirtle squirt! Tap anywhere to play.',X,y+20);}
 function drawResults(now){const {W,H}=L;x.fillStyle=P.bg;x.fillRect(0,L.hh,W,H-L.hh);const R=results;
  x.fillStyle=P.text;x.textAlign='center';x.textBaseline='middle';x.font=`bold ${Math.round(Math.min(30,W*.07))}px Georgia,serif`;x.fillText(R.title,W/2,L.hh+40);
  x.font=`15px "Helvetica Neue",Arial,sans-serif`;x.fillStyle=P.soft;x.fillText(`The word was`,W/2,L.hh+72);
  const t=Math.min(40,(W-40)/7);for(let i=0;i<COLS;i++)tile(W/2+(i-2)*(t+4),L.hh+100+t/2,t,R.ans[i],0,now,{colour:P.correct});
  const colW=Math.min(W/2-10,220),y0=L.hh+100+t+30,mt=Math.min(18,(colW-40)/6);
  R.rows.forEach((r,j)=>{const cx=R.rows.length===1?W/2:W/2+(j?1:-1)*(colW/2+6);s.sprite(x,r.i,cx,y0+22,40,{exact:true,still:true,noBadge:true,mood:r.res.win?'win':'sad'});
   x.fillStyle=P.text;x.font=`bold 16px "Helvetica Neue",Arial,sans-serif`;x.fillText(s.players[r.i].name,cx,y0+56);
   x.font=`14px "Helvetica Neue",Arial,sans-serif`;x.fillStyle=P.soft;x.fillText(`${r.res.win?r.res.n:'X'}/6 · ${Math.floor(r.res.secs/60)}:${String(Math.round(r.res.secs%60)).padStart(2,'0')}`,cx,y0+78);
   r.res.grid.forEach((row,k)=>row.forEach((v,i)=>{x.fillStyle=COL[v];x.fillRect(cx-(mt*5+12)/2+i*(mt+3),y0+94+k*(mt+3),mt,mt);}));
   x.fillStyle=P.text;x.font=`bold 18px "Helvetica Neue",Arial,sans-serif`;x.fillText(`${points(r.res)} pts`,cx,y0+104+6*(mt+3)+8);});
  if(now>R.at+600){x.fillStyle=P.correct;const bw=180,bh=46,bx=W/2-bw/2,by=Math.min(H-bh-44,y0+150+6*(mt+3));rr(x,bx,by,bw,bh,23);x.fill();x.fillStyle='#fff';x.font=`bold 16px "Helvetica Neue",Arial,sans-serif`;x.fillText('Continue',W/2,by+bh/2);}}

 let last=performance.now();
 s.frame(()=>{const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
  dpr=Math.min(2,window.devicePixelRatio||1);const cw=Math.round(s.W*dpr),ch=Math.round(s.H*dpr);if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}
  x.setTransform(dpr,0,0,dpr,0,0);L=layout();x.fillStyle=P.bg;x.fillRect(0,0,L.W,L.H);
  drawHeader(now);
  if(phase==='results'&&results)drawResults(now);
  else if(board){drawInfo(board,now);drawBoard(board,now);drawMascot(board,now);drawKeys(board,now);drawToast(now);}
  drawParts(dt);if(help)drawHelp();
  if(board&&board.done&&!board.reported&&now>board.doneAt){board.reported=true;board.finish?.();}});

 // one board for player i; resolves {win,n,secs,best,grid} once the row has flipped and the moment has sunk in
 function play(i,ans){return new Promise(res=>{board=newBoard(i,ans);board.finish=()=>{const b=board;res({win:b.done==='win',n:b.rows.length,secs:(b.t1-b.t0)/1000,best:Math.max(0,...b.rows.map(r=>r.res.filter(v=>v===2).length)),grid:b.rows.map(r=>r.res)});};});}
 const pick=()=>ANSWERS[Math.floor(s.random()*ANSWERS.length)];
 const streak={n:0,total:0};
 // test hooks: the answer, type a word, an autopilot that guesses two random words then the answer
 s.debug={get board(){return board;},get phase(){return phase;},answer:()=>board?.ans,type(w){for(const ch of w)press(ch);press('+');},grade,points,
  set bot(on){if(!on)return;const tick=()=>{if(!s.alive)return;if(phase==='results'){if(results&&performance.now()>results.at+700)results.done();}
   else if(board&&!board.done&&!board.cur){const n=board.rows.length;this.type(n<2?ANSWERS[Math.floor(Math.random()*ANSWERS.length)]:board.ans);}setTimeout(tick,400);};tick();}};

 if(s.solo){// Arcade 1P and online duels: word after word until a miss
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
