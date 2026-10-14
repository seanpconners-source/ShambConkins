// Bricks Breaker Quest: pure rules + ball physics (no drawing), so Node tests and the bot can run whole stages.
// Units are grid cells: the field is COLS x ROWS cells, y grows downward, the launcher sits on the bottom line (y=ROWS).
// Bricks live on whole cells; row 0 stays empty under the top wall, new lines drop in at row 1, and a brick that
// reaches the last row (FAIL_ROW) ends the stage. Every turn the whole wall moves down one row and the next queued line
// of the stage drops in at the top; once the queue is empty the wall still moves down one row a turn. Clearing the
// whole top line in one turn drops the wall three rows at once (three queued lines come in), as in the real game.
// Brick tokens (see src/data/bricksQuestLevels.js): '.' empty, '+' ball ring, 'N' square with N hits,
// suffix a/b/c/d = triangle with its right angle at the top-left / top-right / bottom-left / bottom-right corner,
// h = horizontal laser, v = vertical laser, x = bomb (every hit also hits the 8 neighbours), ':k' = colour key.
// Green beam rings (not bricks, balls fly through them): '-' fires a beam both ways along its row, '*' (drawn as a green
// plus) fires along its row and column. Every ball that passes through fires it again (1 hit to each brick on the line);
// a ring that fired this turn is gone at the end of the turn.
const COLS=9,ROWS=11,FIRST_ROW=1,FAIL_ROW=10,R=.14,GAP=.035,SPEED=15,GAP_T=.055,STEP=.07,PICK_R=.3;
const COLORS={c:'#33e6ff',b:'#3b8bff',i:'#6f66ff',g:'#2fe85a',t:'#2fd8a8',y:'#d6ef3c',o:'#ff9d2a',r:'#ff3d52',p:'#ff4fd8',u:'#a75bff'};
// hp -> colour band, read off the real game's screenshots (2 cyan, 9-16 yellow, 23-26 blue, 32-35 green, 37-44 orange,
// 45 indigo, 48-58 green/teal, 63 pink, 66-69 red, 72 purple, 98-104 red, 105+ purple).
const BANDS=[[8,'c'],[19,'y'],[29,'b'],[36,'g'],[44,'o'],[47,'i'],[53,'g'],[59,'t'],[65,'p'],[70,'r'],[80,'u'],[89,'b'],[97,'g'],[104,'r'],[119,'u'],[149,'b'],[199,'o'],[299,'r'],[Infinity,'u']];
const bandColor=hp=>COLORS[BANDS.find(b=>hp<=b[0])[1]];
const SHAPES={a:'a',b:'b',c:'c',d:'d'},KINDS={h:'h',v:'v',x:'x'};

function parseToken(tok){
 if(!tok||tok==='.')return null;if(tok==='+')return {pick:true};if(tok==='-'||tok==='*')return {beam:tok==='-'?'h':'x'};
 const m=/^(\d+)([abcdhvx]?)(?::([a-z]))?$/.exec(tok);if(!m)throw new Error('Bad brick token '+tok);
 const hp=+m[1];return {hp,shape:SHAPES[m[2]]||'s',kind:KINDS[m[2]]||'n',keyed:!!m[3],color:m[3]?COLORS[m[3]]:m[2]&&KINDS[m[2]]?COLORS.o:bandColor(hp)};
}
function parseRow(str){const t=str.trim().split(/\s+/);if(t.length!==COLS)throw new Error(`Row needs ${COLS} cells: "${str}"`);return t.map(parseToken);}

function polygon(c,r,shape){const x0=c+GAP,y0=r+GAP,x1=c+1-GAP,y1=r+1-GAP;
 return shape==='a'?[[x0,y0],[x1,y0],[x0,y1]]:shape==='b'?[[x0,y0],[x1,y0],[x1,y1]]:shape==='c'?[[x0,y0],[x1,y1],[x0,y1]]:shape==='d'?[[x1,y0],[x1,y1],[x0,y1]]:[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];}

// st: {grid:Map(key->brick), picks:Map(key->{c,r}), hidden:[rows bottom-first], balls, origin, score, turn, ...}
const key=(c,r)=>r*COLS+c;
function place(st,c,r,cell){if(!cell)return;if(cell.pick){st.picks.set(key(c,r),{c,r});return;}if(cell.beam){st.beams.set(key(c,r),{c,r,dir:cell.beam,used:false});return;}
 st.grid.set(key(c,r),{c,r,hp:cell.hp,max:cell.hp,shape:cell.shape,kind:cell.kind,color:cell.color,pts:polygon(c,r,cell.shape),flash:0,id:st.nextId++});}
// Low-number stages would all be cyan under the hp bands, so (like the real early stages) each distinct number gets the
// next neon colour instead, row by row.
const RANK=['c','g','y','o','r','p','u','b','t','i'];
function rankColors(rows){const cells=rows.flat().filter(c=>c&&c.hp&&c.kind==='n'&&!c.keyed),max=Math.max(0,...cells.map(c=>c.hp));if(max>=40)return;
 const vals=[...new Set(cells.map(c=>c.hp))].sort((a,b)=>a-b);for(const c of cells)c.color=COLORS[RANK[vals.indexOf(c.hp)%RANK.length]];}
function newStage(def){
 const rows=def.rows.map(parseRow);if(!def.colors)rankColors(rows);const show=Math.min(rows.length,def.show||6);
 const st={def,rng:def.rng||Math.random,mode:def.mode||'stage',grid:new Map(),picks:new Map(),beams:new Map(),hidden:[],balls:def.balls,origin:COLS/2,score:0,turn:0,kills:0,nextId:1,bricksTotal:0,result:null,classicRow:0};
 // the bottom `show` rows start on the board (rows FIRST_ROW..), the rest wait above and drop in one per turn
 const visible=rows.slice(rows.length-show),hidden=rows.slice(0,rows.length-show);
 visible.forEach((row,i)=>row.forEach((cell,c)=>place(st,c,FIRST_ROW+i,cell)));
 st.hidden=hidden.reverse();
 st.bricksTotal=rows.flat().filter(c=>c&&c.hp).length;
 if(st.mode!=='stage'){st.bricksTotal=0;spawnClassicRow(st);}
 st.stars=starTargets(st);return st;
}
// Score: the n-th brick destroyed in one turn pays 10*n (16 bricks in one volley = 1,360, as in the screenshots).
// One star for clearing; the other two sit on the score bar, scaled to the number of bricks in the stage (the test bot
// averages ~60 points a brick, so 2 stars = 45/brick and 3 stars = 85/brick).
function starTargets(st){if(st.mode!=='stage')return [0,0,0];const n=st.bricksTotal;return [0,Math.round(n*4.5)*10,Math.round(n*8.5)*10];}
function starsFor(st){return st.result!=='clear'?0:1+(st.score>=st.stars[1])+(st.score>=st.stars[2]);}

// Classic / 100 Balls: one fresh line per turn, Ballz style, numbers grow with the turn.
function spawnClassicRow(st){
 const rnd=st.rng||Math.random,n=++st.classicRow,hundred=st.mode==='hundred';
 const base=hundred?30+n*6:n,row=Array(COLS).fill(null),slots=[...Array(COLS).keys()].sort(()=>rnd()-.5);
 const count=Math.min(COLS-1,2+Math.floor(rnd()*(n<4?4:7)));
 for(let i=0;i<count;i++){const c=slots[i],r=rnd(),hp=r<.25?base*2:base;
  const shape=r>.88?'abcd'[Math.floor(rnd()*4)]:'s',kind=n>3&&r>.84&&r<=.88?'hvx'[Math.floor(rnd()*3)]:'n';
  row[c]={hp,shape:kind==='n'?shape:'s',kind,color:kind!=='n'?COLORS.o:hundred?bandColor(hp):COLORS[RANK[Math.floor((hp-1)/4)%RANK.length]]};}
 row[slots[count]]={pick:true};
 row.forEach((cell,c)=>place(st,c,FIRST_ROW,cell));st.bricksTotal+=count;
}

// ---- turn / flight -------------------------------------------------------------------------------------------
function launchAngleOK(a){return Math.max(-Math.PI+.14,Math.min(-.14,a));}
function startVolley(st,angle,{count}={}){
 const n=count||st.balls;angle=launchAngleOK(angle);
 st.fl={angle,toLaunch:n,launched:0,clock:0,launchT:0,balls:[],first:null,returned:0,total:n,gotPicks:0,recall:false,hits:0,topLine:topLine(st)};st.combo=0;
 st.events=[];return st.fl;
}
// the highest row that holds a brick (rings don't count); -1 on an empty board
function topLine(st){let top=Infinity;for(const b of st.grid.values())if(b.r<top)top=b.r;return top===Infinity?-1:top;}
function lowLine(st){let low=-1;for(const b of st.grid.values())if(b.r>low)low=b.r;return low;}
function lineEmpty(st,r){for(const b of st.grid.values())if(b.r===r)return false;return true;}
function fireBeam(st,q,events){q.used=true;events.push({type:'beam',dir:q.dir,c:q.c,r:q.r});
 for(const o of [...st.grid.values()])if(o.r===q.r||q.dir==='x'&&o.c===q.c)damage(st,o,1,events);}
function damage(st,b,dmg,events){
 if(b.hp<=0)return;b.hp-=dmg;b.flash=1;
 if(b.hp<=0){st.grid.delete(key(b.c,b.r));const n=++st.combo;st.kills++;const pts=10*n;st.score+=pts;events.push({type:'kill',b,pts});}
 else events.push({type:'hit',b});
}
function special(st,b,events){
 if(b.kind==='h'){events.push({type:'laser',dir:'h',c:b.c,r:b.r,color:b.color});for(const o of [...st.grid.values()])if(o!==b&&o.r===b.r)damage(st,o,1,events);}
 else if(b.kind==='v'){events.push({type:'laser',dir:'v',c:b.c,r:b.r,color:b.color});for(const o of [...st.grid.values()])if(o!==b&&o.c===b.c)damage(st,o,1,events);}
 else if(b.kind==='x'){events.push({type:'blast',c:b.c,r:b.r,color:b.color});for(let dc=-1;dc<=1;dc++)for(let dr=-1;dr<=1;dr++){const c=b.c+dc;if(!dc&&!dr||c<0||c>=COLS)continue;const o=st.grid.get(key(c,b.r+dr));if(o)damage(st,o,1,events);}}
}
// closest point of a convex polygon to (px,py) + inside test
function nearest(pts,px,py){let best=Infinity,bx=0,by=0,inside=true,sign=0;
 for(let i=0;i<pts.length;i++){const [ax,ay]=pts[i],[cx,cy]=pts[(i+1)%pts.length],ex=cx-ax,ey=cy-ay,l=ex*ex+ey*ey;
  let t=((px-ax)*ex+(py-ay)*ey)/l;t=t<0?0:t>1?1:t;const qx=ax+ex*t,qy=ay+ey*t,d=(px-qx)**2+(py-qy)**2;if(d<best){best=d;bx=qx;by=qy;}
  const cr=ex*(py-ay)-ey*(px-ax);if(cr!==0){const sg=cr>0?1:-1;if(!sign)sign=sg;else if(sg!==sign)inside=false;}}
 return {d:Math.sqrt(best),x:bx,y:by,inside};
}
function collideBrick(ball,b){const q=nearest(b.pts,ball.x,ball.y);if(!q.inside&&q.d>=R)return false;
 let nx,ny;if(q.d<1e-9){const cx=b.c+.5,cy=b.r+.5;nx=ball.x-cx;ny=ball.y-cy;const l=Math.hypot(nx,ny)||1;nx/=l;ny/=l;}
 else if(q.inside){nx=(q.x-ball.x)/q.d;ny=(q.y-ball.y)/q.d;}else{nx=(ball.x-q.x)/q.d;ny=(ball.y-q.y)/q.d;}
 ball.x=q.x+nx*(R+1e-4);ball.y=q.y+ny*(R+1e-4);const dot=ball.vx*nx+ball.vy*ny;
 if(dot<0){ball.vx-=2*dot*nx;ball.vy-=2*dot*ny;return true;}return false;
}
function unstick(ball){ // never let a ball crawl sideways forever (direction is unit length)
 const min=.09;if(Math.abs(ball.vy)<min){ball.vy=(ball.vy>0?1:-1)*min;ball.vx=(ball.vx<0?-1:1)*Math.sqrt(1-min*min);}
}
// Advance the volley by dt seconds of game time. Returns true once every ball is home.
function stepFlight(st,dt,events=st.events){
 const fl=st.fl;if(!fl)return true;fl.clock+=dt;
 const boost=fl.clock>18?3:fl.clock>11?2.2:fl.clock>6?1.5:1,v=SPEED*boost*(st.fast?2:1);
 // launch the chain from the origin, one ball every GAP_T seconds of travel
 fl.launchT+=dt*boost*(st.fast?2:1);
 while(fl.toLaunch>0&&fl.launchT>=0&&!fl.recall){fl.launchT-=GAP_T;fl.toLaunch--;fl.launched++;
  // a ball launched part-way through this frame only travels for the part after its launch moment
  fl.balls.push({x:st.origin,y:ROWS-R-1e-3,vx:Math.cos(fl.angle),vy:Math.sin(fl.angle),done:false,fresh:fl.launchT+GAP_T});}
 for(const ball of fl.balls){if(ball.done)continue;
  if(fl.recall){ball.y+=dt*SPEED*3;ball.vx=0;if(ball.y>=ROWS-R){ball.y=ROWS-R;home(st,ball);}continue;}
  let move=ball.fresh!=null?ball.fresh*SPEED:v*dt;ball.fresh=null;
  // normalise direction then sub-step
  const l=Math.hypot(ball.vx,ball.vy);ball.vx/=l;ball.vy/=l;
  while(move>0&&!ball.done){const h=Math.min(STEP,move);move-=h;
   ball.x+=ball.vx*h;ball.y+=ball.vy*h;
   if(ball.x<R){ball.x=R;ball.vx=Math.abs(ball.vx);unstick(ball);}else if(ball.x>COLS-R){ball.x=COLS-R;ball.vx=-Math.abs(ball.vx);unstick(ball);}
   if(ball.y<R){ball.y=R;ball.vy=Math.abs(ball.vy);}
   if(ball.y>=ROWS-R&&ball.vy>0){ball.y=ROWS-R;home(st,ball);break;}
   const c0=Math.floor(ball.x),r0=Math.floor(ball.y);
   for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const c=c0+dc,r=r0+dr;if(c<0||c>=COLS||r<0)continue;const k=key(c,r);
    const b=st.grid.get(k);if(b&&collideBrick(ball,b)){unstick(ball);fl.hits++;damage(st,b,1,events);if(b.kind!=='n')special(st,b,events);}
    const p=st.picks.get(k);if(p&&Math.hypot(ball.x-(c+.5),ball.y-(r+.5))<PICK_R+R){st.picks.delete(k);fl.gotPicks++;events.push({type:'pick',c,r,x:c+.5,y:r+.5});}
    const q=st.beams.get(k);if(q){const d=Math.hypot(ball.x-(c+.5),ball.y-(r+.5));
     if(d<PICK_R+R){if(ball.beam!==k){ball.beam=k;fireBeam(st,q,events);}}else if(ball.beam===k&&d>PICK_R+R+.05)ball.beam=-1;}}
  }
 }
 return fl.toLaunch<=0&&fl.balls.every(b=>b.done);
}
function home(st,ball){ball.done=true;st.fl.returned++;if(st.fl.first===null){st.fl.first=Math.max(R*2,Math.min(COLS-R*2,ball.x));(st.events||[]).push({type:'first',x:st.fl.first});}}
function recall(st){if(st.fl){st.fl.recall=true;st.fl.toLaunch=0;}}

// After the last ball lands: bank the rings, check for a clear, drop the wall one row, check for a loss.
function endTurn(st){
 const fl=st.fl;st.turn++;st.lastDrop=0;st.balls+=fl.gotPicks;if(fl.first!==null)st.origin=fl.first;st.fl=null;
 for(const [k,q] of st.beams)if(q.used)st.beams.delete(k);
 if(st.mode==='stage'&&!st.grid.size&&!st.hidden.length){st.result='clear';return 'clear';}
 // the top line was wiped out this turn: pull up to three queued lines in at once
 // (never past row FAIL_ROW-3 for the lowest brick: it speeds a thin board up, it doesn't crush you)
 const cleared=st.mode==='stage'&&fl.topLine>=0&&lineEmpty(st,fl.topLine)&&st.grid.size>0;
 const drops=cleared?Math.max(1,Math.min(3,st.hidden.length,FAIL_ROW-3-lowLine(st))):1;st.lastDrop=drops;
 for(let i=0;i<drops;i++)descend(st);
 if(st.mode!=='stage')spawnClassicRow(st);
 else while(!st.grid.size&&st.hidden.length){descend(st);st.lastDrop++;} // an empty board pulls the next line straight in
 if([...st.grid.values()].some(b=>b.r>=FAIL_ROW)){st.result='fail';return 'fail';}
 return 'next';
}
function descend(st){
 const g=new Map(),p=new Map();
 for(const b of st.grid.values()){b.r++;b.pts=polygon(b.c,b.r,b.shape);g.set(key(b.c,b.r),b);}
 for(const q of st.picks.values()){q.r++;if(q.r<FAIL_ROW)p.set(key(q.c,q.r),q);}
 const bm=new Map();for(const q of st.beams.values()){q.r++;if(q.r<FAIL_ROW)bm.set(key(q.c,q.r),q);}
 st.grid=g;st.picks=p;st.beams=bm;
 if(st.mode==='stage'&&st.hidden.length)st.hidden.shift().forEach((cell,c)=>place(st,c,FIRST_ROW,cell));
}
// Lightning: strike every brick on the lowest occupied line (the one about to crush you).
function lightning(st,events=[]){
 const rows=[...st.grid.values()].map(b=>b.r);if(!rows.length)return events;const low=Math.max(...rows);st.combo=0;
 for(const b of [...st.grid.values()])if(b.r===low){events.push({type:'bolt',c:b.c,r:b.r,color:b.color});damage(st,b,b.hp,events);}
 if(clearRule(st))st.result='clear';return events;
}
// Continue after a loss: knock out the three lowest lines.
function rescue(st){const rows=[...new Set([...st.grid.values()].map(b=>b.r))].sort((a,b)=>b-a).slice(0,3);
 for(const b of [...st.grid.values()])if(rows.includes(b.r))st.grid.delete(key(b.c,b.r));st.result=null;}
function clearRule(st){return st.mode==='stage'&&!st.grid.size&&!st.hidden.length;}

// Aim guide: march a ball from the origin until it first touches a brick / ring line (or 14 cells of travel).
function aimPath(st,angle){angle=launchAngleOK(angle);const b={x:st.origin,y:ROWS-R,vx:Math.cos(angle),vy:Math.sin(angle)},pts=[[b.x,b.y]];
 const touching=()=>{const c0=Math.floor(b.x),r0=Math.floor(b.y);for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const c=c0+dc;if(c<0||c>=COLS)continue;const o=st.grid.get(key(c,r0+dr));if(o){const q=nearest(o.pts,b.x,b.y);if(q.inside||q.d<R)return true;}}return false;};
 for(let t=0,walls=0;t<16;t+=.04){b.x+=b.vx*.04;b.y+=b.vy*.04;
  if(b.x<R||b.x>COLS-R){if(++walls>2)break;b.x=Math.max(R,Math.min(COLS-R,b.x));b.vx=-b.vx;pts.push([b.x,b.y]);}
  if(b.y<R){b.y=R;break;}
  if(touching())break;
 }
 pts.push([b.x,b.y]);return {pts,end:[b.x,b.y]};
}

// ---- snapshots (rewind) and the bot -----------------------------------------------------------------------------
function snapshot(st){return {grid:[...st.grid.values()].map(b=>({...b})),picks:[...st.picks.values()].map(p=>({...p})),beams:[...st.beams.values()].map(q=>({...q})),hidden:st.hidden.slice(),balls:st.balls,origin:st.origin,score:st.score,turn:st.turn,kills:st.kills,classicRow:st.classicRow,bricksTotal:st.bricksTotal};}
function restore(st,snap){st.grid=new Map(snap.grid.map(b=>[key(b.c,b.r),{...b}]));st.picks=new Map(snap.picks.map(p=>[key(p.c,p.r),{...p}]));st.beams=new Map((snap.beams||[]).map(q=>[key(q.c,q.r),{...q}]));st.hidden=snap.hidden.slice();
 Object.assign(st,{balls:snap.balls,origin:snap.origin,score:snap.score,turn:snap.turn,kills:snap.kills,classicRow:snap.classicRow,bricksTotal:snap.bricksTotal,fl:null,result:null});}
function cloneState(st){const n={...st,events:[]};restore(n,snapshot(st));n.rng=st.rng;return n;}
// Simulate a shot to the end of the volley without touching st; returns a rating (more kills, lower danger = better).
function rateShot(st,angle){const t=cloneState(st);t.rng=()=>.5;startVolley(t,angle);let guard=0;while(!stepFlight(t,1/30,[])&&guard++<6000);
 const kills=t.combo,picks=t.fl.gotPicks;let low=0,lowHp=0;for(const b of t.grid.values()){if(b.r>low){low=b.r;lowHp=0;}if(b.r===low)lowHp+=b.hp;}
 return kills*40+picks*25+(t.grid.size?0:1e6)-low*low*30-lowHp*.4+(t.score-st.score)*.02;}
function botAngle(st,tries=25){let best=-Math.PI/2,bv=-Infinity;for(let i=0;i<tries;i++){const a=-Math.PI+.16+(Math.PI-.32)*(i+.5)/tries,v=rateShot(st,a);if(v>bv){bv=v;best=a;}}return best;}
// Play a whole stage with the bot (Node tests / balance). Returns {result, turns, score, stars}.
function botPlay(def,{tries=25,maxTurns=80}={}){const st=newStage(def);let r='next';while(r==='next'&&st.turn<maxTurns){startVolley(st,botAngle(st,tries));let g=0;while(!stepFlight(st,1/30,[])&&g++<9000);r=endTurn(st);}
 return {result:st.result||'timeout',turns:st.turn,score:st.score,stars:starsFor(st),targets:st.stars,balls:st.balls};}

Object.assign(exports,{COLS,ROWS,FIRST_ROW,FAIL_ROW,BALL_R:R,GAP,COLORS,bandColor,parseRow,newStage,startVolley,stepFlight,recall,endTurn,lightning,rescue,aimPath,snapshot,restore,starsFor,botAngle,botPlay,clearRule,launchAngleOK,spawnClassicRow});
