// Kingpin Bowling rules (plain data, Node-testable: tests/bowl-sim.mjs).
// Ten-pin scoring with any game length (3 / 5 / 10 frames): the LAST frame plays like the 10th (a strike or spare there earns
// the bonus balls, the rack resets after each strike / spare). Splits are found from the standing pins like a real alley's
// scorer (head pin down and the standing pins not touching each other), and get their bowling names; strike streaks too.
// Every call returns plain objects, so both phones online build the same sheet from the same list of balls.
const NEIGH=(()=>{// pins that touch on the deck: neighbours in the triangle (12" apart)
 const P=[];for(let r=0,n=0;r<4;r++)for(let j=0;j<=r;j++)P[++n]={x:j-r/2,z:r*Math.sqrt(3)/2};
 const out={};for(let a=1;a<=10;a++){out[a]=[];for(let b=1;b<=10;b++)if(a!==b&&Math.hypot(P[a].x-P[b].x,P[a].z-P[b].z)<1.01)out[a].push(b);}return out;})();
const key=pins=>[...pins].sort((a,b)=>a-b).join('-');
// names (right-hander's view; the mirror leaves have the same name)
const LEAVE_NAMES={
 '7-10':'BEDPOSTS','4-6-7-10':'THE BIG FOUR','4-6-7-9-10':'GREEK CHURCH','4-6-7-8-10':'GREEK CHURCH','2-7':'BABY SPLIT','3-10':'BABY SPLIT',
 '5-7':'DIME STORE','5-10':'DIME STORE','7-9':'CINCINNATI','8-10':'CINCINNATI','5-7-10':'LILY','3-7-10':'CHRISTMAS TREE','2-7-10':'CHRISTMAS TREE',
 '4-6':'BIG EARS','6-7':'THE BIG SPLIT','4-10':'THE BIG SPLIT','4-7-10':'WASHOUT','6-7-10':'WASHOUT','2-4-5-8':'THE BUCKET','3-5-6-9':'THE BUCKET',
 '1-2-4-7':'PICKET FENCE','1-3-6-10':'PICKET FENCE','1-2-10':'WASHOUT','1-2-4-10':'WASHOUT','1-3-7':'WASHOUT','1-3-6-7':'WASHOUT',
 '10':'TAP TEN','7':'LONELY SEVEN','9':'DEAD NINE','8':'SOUR APPLE','5-8':'SLEEPER','3-9':'SLEEPER','2-8':'SLEEPER','1-5':'SLEEPER','4-9':'BIG SPLIT','6-8':'BIG SPLIT',
 '2-10':'WASHOUT','3-7':'CHRISTMAS TREE','4-7':'SOUR','6-10':'SOUR'};
// a split: the head pin is down, 2+ pins stand, and they don't form one touching group
function isSplit(standing){const S=new Set(standing);if(S.size<2||S.has(1))return false;
 const first=standing[0],seen=new Set([first]),q=[first];while(q.length){const a=q.pop();for(const b of NEIGH[a])if(S.has(b)&&!seen.has(b)){seen.add(b);q.push(b);}}
 return seen.size<S.size;}
function leaveName(standing){return LEAVE_NAMES[key(standing)]||null;}
// strike streak names (what the overhead monitor shouts)
const STREAK=['', '', 'DOUBLE!', 'TURKEY!', 'HAMBONE!', 'FIVE-BAGGER!', 'SIX PACK!', 'WILD TURKEY!', 'OCTOPUS!', 'GOLDEN TURKEY!', 'TEN IN A ROW!', 'ELEVEN!', 'PERFECT GAME!'];
const streakName=n=>n>=12?'PERFECT GAME!':STREAK[n]||(n+' IN A ROW!');

function newGame(frames=10){return {frames:[],len:frames,done:false};}
const cur=g=>g.frames[g.frames.length-1];
const isLast=(g,i)=>i===g.len-1;
// the pins standing at the start of the next ball (numbers), from the sheet
const FULL=[1,2,3,4,5,6,7,8,9,10];
function rackFor(g){const f=cur(g);if(!f||frameDone(g,g.frames.length-1))return FULL.slice();const s=f.balls[f.balls.length-1].standing;return s.length?s.slice():FULL.slice();}
// a fresh rack: the frame's first ball, or (last frame) the ball after a strike / spare
function freshBall(g){const f=cur(g);if(!f||frameDone(g,g.frames.length-1)||!f.balls.length)return true;return f.balls[f.balls.length-1].standing.length===0;}
function frameDone(g,i){const f=g.frames[i];if(!f)return false;const b=f.balls,c=b.map(x=>x.n);
 if(!isLast(g,i))return c[0]===10||b.length===2;
 if(b.length===3)return true;if(b.length===2)return c[0]+c[1]<10&&c[0]!==10;return false;}
// one ball: standing = pin numbers still up after it (the deck as it lies), foul (over the line), gutter.
// returns what happened, for the score screen
function addBall(g,{standing,foul=false,gutter=false}){
 if(g.done)return null;
 const fresh=freshBall(g),before=rackFor(g);if(!cur(g)||frameDone(g,g.frames.length-1))g.frames.push({balls:[]});
 const fi=g.frames.length-1,f=cur(g);
 let up=foul?before.slice():standing.filter(n=>before.includes(n)).sort((a,b)=>a-b);// a foul counts zero and puts the pins back
 const n=before.length-up.length,ball={n,standing:up,foul,gutter,first:fresh};
 const bi=f.balls.length;f.balls.push(ball);
 const strike=fresh&&n===10,spare=!fresh&&up.length===0&&n>0&&!foul,split=fresh&&!foul&&isSplit(up);ball.split=split;
 const ev={frame:fi,ball:bi,n,strike,spare,split,foul,gutter:gutter&&n===0,standing:up,leave:fresh&&!strike?leaveName(up):null,
  mark:markOf(ball,f,bi,fresh),streak:0};
 if(strike){ev.streak=streakCount(g);ev.streakName=ev.streak>=2?streakName(ev.streak):null;}
 if(frameDone(g,fi)&&fi===g.len-1)g.done=true;
 ev.done=g.done;ev.frameDone=frameDone(g,fi);
 return ev;}
function markOf(ball,f,bi,fresh){if(ball.foul)return 'F';if(fresh&&ball.n===10)return 'X';if(!fresh&&ball.standing.length===0&&ball.n>0)return '/';if(ball.n===0)return '-';return String(ball.n);}
// strikes in a row ending with the last ball (across frames)
function streakCount(g){let n=0;for(let i=g.frames.length-1;i>=0;i--){const b=g.frames[i].balls;for(let k=b.length-1;k>=0;k--){if(b[k].first&&b[k].n===10)n++;else return n;}}return n;}
// all balls in order, then the frame scores (standard ten-pin; null = waiting for bonus balls)
function sheet(g){const all=[];g.frames.forEach((f,i)=>f.balls.forEach((b,k)=>all.push({fi:i,k,n:b.n,first:b.first})));
 const rows=[];let total=0,idx=0;
 for(let i=0;i<g.frames.length;i++){const f=g.frames[i],b=f.balls,marks=[];
  for(let k=0;k<b.length;k++){marks.push(markOf(b[k],f,k,b[k].first));}
  const start=idx;idx+=b.length;let s=null;
  if(isLast(g,i)){if(frameDone(g,i))s=b.reduce((a,x)=>a+x.n,0);}
  else if(b[0].n===10){const nx=all.slice(start+1,start+3);if(nx.length===2)s=10+nx[0].n+nx[1].n;}
  else if(b.length===2){const p=b[0].n+b[1].n;if(p===10){const nx=all[start+2];if(nx)s=10+nx.n;}else s=p;}
  if(s!=null&&(rows.length===0||rows[rows.length-1].total!=null)){total+=s;rows.push({marks,score:s,total,split:b.map(x=>!!x.split)});}
  else rows.push({marks,score:null,total:null,split:b.map(x=>!!x.split)});}
 // the frames not bowled yet
 for(let i=g.frames.length;i<g.len;i++)rows.push({marks:[],score:null,total:null,split:[]});
 return rows;}
function total(g){let t=0;for(const r of sheet(g))if(r.total!=null)t=r.total;return t;}
// the most this game can still reach (for the "beat $" line and the CPU's nerves)
function maxScore(g){const copy=JSON.parse(JSON.stringify(g));let guard=40;while(!copy.done&&guard--)addBall(copy,{standing:[]});return total(copy);}
function perfect(len){return 30*len;}

Object.assign(exports,{NEIGH,LEAVE_NAMES,isSplit,leaveName,streakName,newGame,addBall,rackFor,frameDone,sheet,total,maxScore,perfect});
