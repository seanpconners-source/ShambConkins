// Super Mario Bros. (NES) World 1 stage maps: 1-1, 1-2 (with its intro pipe, exit scene and the Warp Zone), 1-3 and
// 1-4. Maps are laid out on the NES grid: 16 px tiles, 15 rows (rows 0-1 sit under the HUD, ground is rows 13-14).
// Columns follow the original stages as closely as the tile grid allows. Each stage has named areas; pipes and side
// pipes ("doors") move the runner between them. Only data here: the engine in marioBros.js runs and draws it.
const T=16,ROWS=15;
const EMPTY=0,GROUND=1,BRICK=2,QBLOCK=3,USED=4,HARD=5,PTL=6,PTR=7,PL=8,PR=9,HMT=12,HMB=13,HBT=14,HBB=15,HIDDEN=16,
 TREE_L=17,TREE_M=18,TREE_R=19,TRUNK=20,BRIDGE=21,CHAIN=22,LAVA_TOP=23,LAVA=24,CASTLE=25;
const TILE={EMPTY,GROUND,BRICK,QBLOCK,USED,HARD,PTL,PTR,PL,PR,HMT,HMB,HBT,HBB,HIDDEN,TREE_L,TREE_M,TREE_R,TRUNK,BRIDGE,CHAIN,LAVA_TOP,LAVA,CASTLE};
// tiles the runner and enemies collide with (HIDDEN blocks only stop a head coming up from below)
const SOLID=new Uint8Array(32);for(const t of [GROUND,BRICK,QBLOCK,USED,HARD,PTL,PTR,PL,PR,HMT,HMB,HBT,HBB,TREE_L,TREE_M,TREE_R,BRIDGE,CASTLE])SOLID[t]=1;
// tiles drawn behind the runner (scenery that happens to live in the tile grid)
const BACK=new Uint8Array(32);for(const t of [TRUNK,CHAIN])BACK[t]=1;

function area(W,kind){
 const A={W,kind,tiles:new Uint8Array(W*ROWS),content:new Map(),coins:[],enemies:[],pipes:[],doors:[],decor:[],lifts:[],firebars:[],texts:[],scenery:kind==='over'};
 const tileFor=()=>kind==='castle'?CASTLE:GROUND;
 Object.assign(A,{
  set(c,r,t,what){if(c<0||c>=W||r<0||r>=ROWS)return;A.tiles[r*W+c]=t;if(what)A.content.set(r*W+c,what);else A.content.delete(r*W+c);},
  fill(c0,c1,r0,r1,t){for(let c=c0;c<=c1;c++)for(let r=r0;r<=r1;r++)A.set(c,r,t);},
  ground(c0,c1,top=13){A.fill(c0,c1,top,14,tileFor());},
  // pattern across a row: ? = question block, B = brick, H = hard block, U = used block, space = skip
  row(c,r,pat,sp={}){[...pat].forEach((ch,k)=>{const cc=c+k;if(ch==='?')A.set(cc,r,QBLOCK,sp[cc]||'coin');else if(ch==='B')A.set(cc,r,BRICK,sp[cc]);else if(ch==='H')A.set(cc,r,HARD);else if(ch==='U')A.set(cc,r,USED);});},
  q(c,r,what='coin'){A.set(c,r,QBLOCK,what);},
  brick(c,r,what){A.set(c,r,BRICK,what);},
  hidden(c,r,what='1up'){A.set(c,r,HIDDEN,what);},
  pipe(c,h,o={},base=13){const top=base-h;A.set(c,top,PTL);A.set(c+1,top,PTR);for(let r=top+1;r<base;r++){A.set(c,r,PL);A.set(c+1,r,PR);}
   const p={c,h,top,...o};A.pipes.push(p);if(o.piranha)A.foe('piranha',c+1,top);if(o.to||o.warp)A.doors.push({kind:'down',c,top,to:o.to,warp:o.warp});return p;},
  // sideways pipe: mouth at column c (rows r-1..r), body to its right, then a shaft up to row topRow
  sidePipe(c,r,body,topRow,o={}){A.set(c,r-1,HMT);A.set(c,r,HMB);for(let k=1;k<=body;k++){A.set(c+k,r-1,HBT);A.set(c+k,r,HBB);}
   const sc=c+body+1;for(let rr=topRow;rr<=r;rr++){A.set(sc,rr,PL);A.set(sc+1,rr,PR);}if(o.cap){A.set(sc,topRow,PTL);A.set(sc+1,topRow,PTR);}
   if(o.to)A.doors.push({kind:'side',c,r,to:o.to});},
  stairs(c,h,dir,base=13){for(let k=0;k<h;k++){const hh=dir>0?k+1:h-k;A.fill(c+k,c+k,base-hh,base-1,HARD);}},
  col(c,h,base=13){A.fill(c,c,base-h,base-1,HARD);},
  coin(c,r){A.coins.push({x:c*T+8,y:r*T+8});},
  coinRun(c0,c1,r){for(let c=c0;c<=c1;c++)A.coin(c,r);},
  // enemies stand with their feet on row r (x is the column centre unless a fractional column is given)
  foe(type,c,r=13,o={}){A.enemies.push({type,x:type==='piranha'?c*T:c*T+8,y:r*T,...o});},
  tree(c,w,top){A.set(c,top,TREE_L);for(let k=1;k<w-1;k++)A.set(c+k,top,TREE_M);A.set(c+w-1,top,TREE_R);for(let r=top+1;r<ROWS;r++)for(let k=1;k<w-1;k++)A.set(c+k,r,TRUNK);},
  lava(c0,c1,top=12){A.fill(c0,c1,top,top,LAVA_TOP);A.fill(c0,c1,top+1,14,LAVA);},
  lift(o){A.lifts.push({w:48,vx:0,vy:0,...o});},
  firebar(c,r,dir=1,n=6){A.set(c,r,USED);A.firebars.push({c,r,n,dir,x:c*T+8,y:r*T+8});},
  text(str,c,r){A.texts.push({str,x:c*T,y:r*T});}
 });
 return A;
}

// World 1-1's scenery repeats every 48 columns: big hill, cloud, triple bush, small hill, cloud, bush, triple cloud,
// double cloud, double bush. Hills and bushes only sit on ground.
function overworldScenery(A,{hills=true,from=0,to=A.W}={}){
 const onGround=(c,w)=>{for(let k=0;k<w;k++)if(A.tiles[13*A.W+c+k]!==GROUND||A.tiles[12*A.W+c+k])return false;return true;};
 for(let c=from;c<to;c++){const m=c%48;
  if(hills&&m===0&&onGround(c,5))A.decor.push({type:'hill',x:c*T,w:5});
  if(hills&&m===16&&onGround(c,3))A.decor.push({type:'hill',x:c*T,w:3});
  const bush=m===11?3:m===23?1:m===41?2:0;if(hills&&bush&&onGround(c,bush+2))A.decor.push({type:'bush',x:c*T,n:bush});
  if(m===8||m===19||m===27||m===36)A.decor.push({type:'cloud',x:c*T,y:(m===19||m===36?2:3)*T,n:m===27?3:m===36?2:1});}
}
function flagAndCastle(A,flagCol,castleCol,{big=false}={}){
 A.set(flagCol,12,HARD);A.flag={col:flagCol,x:flagCol*T+8,top:2*T+8,base:12*T};
 A.castle={x:castleCol*T,big,door:castleCol*T+(big?4.5:2.5)*T};
}

// ------------------------------------------------------------------ 1-1
function w11(){
 const A=area(212,'over');
 A.ground(0,68);A.ground(71,85);A.ground(89,152);A.ground(155,211);
 A.q(16,9);A.row(20,9,'B?B?B',{21:'power'});A.q(22,5);
 A.pipe(28,2);A.pipe(38,3);A.pipe(46,4);A.pipe(57,4,{to:{area:'room',x:2*T+8,y:2*T,how:'drop'}});
 A.hidden(64,8,'1up');
 A.row(77,9,'B?B',{78:'power'});A.row(80,5,'BBBBBBBB');
 A.row(91,5,'BBB?');A.brick(94,9,'multi');
 A.brick(100,9);A.brick(101,9,'star');
 A.q(106,9);A.q(109,9);A.q(109,5,'power');A.q(112,9);
 A.brick(118,9);A.row(121,5,'BBB');
 A.row(128,5,'B??B');A.row(129,9,'BB');
 A.stairs(134,4,1);A.stairs(140,4,-1);A.stairs(148,4,1);A.col(152,4);A.stairs(155,4,-1);
 A.pipe(163,2,{exitOf:'room'});
 A.row(168,9,'BB?B');
 A.pipe(179,2);
 A.stairs(181,8,1);A.col(189,8);
 flagAndCastle(A,198,202);
 for(const c of [22,40,51,52.5,97,98.5,114,115.5,124,125.5,128,129.5,174,175.5])A.foe('goomba',c);
 A.foe('goomba',80,5);A.foe('goomba',82,5);A.foe('koopa',107);
 overworldScenery(A);
 // the underground coin room under the fourth pipe
 const R=area(17,'under');R.scenery=false;
 R.ground(0,16);R.fill(0,0,2,12,BRICK);R.fill(4,10,2,2,BRICK);R.fill(4,10,10,12,BRICK);
 R.sidePipe(13,12,1,0,{to:{area:'main',pipe:163,how:'rise'}});
 for(let c=4;c<11;c++){R.coin(c,8);R.coin(c,9);}for(let c=5;c<10;c++)R.coin(c,5);
 return {name:'1-1',time:400,areas:{main:A,room:R},start:{area:'main',x:40,y:13*T},check:{area:'main',x:82*T+8,y:13*T}};
}

// ------------------------------------------------------------------ 1-2
function w12(){
 // the overworld lead-in: walk into the sideways pipe
 const I=area(16,'over');I.ground(0,15);I.sidePipe(10,12,1,4,{cap:true,to:{area:'main',x:2*T+8,y:2*T,how:'drop'}});
 I.decor.push({type:'cloud',x:3*T,y:3*T,n:1},{type:'cloud',x:13*T,y:2*T,n:1});I.decor.push({type:'castle',x:0,small:true});
 const A=area(178,'under');
 A.ground(0,79);A.ground(83,120);A.ground(127,133);A.ground(140,177);
 A.fill(0,0,2,12,BRICK);A.fill(6,120,2,2,BRICK);A.fill(127,133,2,2,BRICK);A.fill(140,151,2,2,BRICK);
 // ? blocks, the first with a mushroom, and the rising pillars
 A.row(10,9,'?????',{10:'power'});
 for(const [c,h] of [[18,1],[20,2],[22,3],[24,4],[26,4],[28,3]])A.col(c,h);
 // coin shelf, multi-coin brick and the Starman brick
 A.brick(30,9,'multi');A.row(33,8,'BBBBB');A.coinRun(33,37,7);
 A.row(40,9,'BBBBBBB',{42:'star'});A.coinRun(40,46,5);A.row(40,5,'B     B');A.fill(40,40,6,8,BRICK);A.fill(46,46,6,8,BRICK);
 // low ceiling and hanging brick columns with coins between them
 A.fill(52,59,3,4,BRICK);A.coinRun(52,59,7);
 A.fill(62,62,3,8,BRICK);A.fill(66,66,3,8,BRICK);A.fill(70,70,3,8,BRICK);A.coinRun(63,65,10);A.coinRun(67,69,10);A.brick(68,6,'1up');
 A.fill(74,79,9,9,BRICK);A.coinRun(74,79,8);A.q(76,5,'coin');
 // over the first pit: brick slab with a trench of Goombas behind it
 A.fill(84,86,9,12,BRICK);A.coinRun(84,86,8);A.fill(94,96,9,12,BRICK);A.coinRun(94,96,8);A.row(88,6,'BB?BB',{90:'power'});
 // the three pipes with piranha plants
 A.pipe(103,3,{piranha:true});A.pipe(109,4,{piranha:true});A.pipe(115,2,{piranha:true});
 // lifts: down over the first lift pit, up over the second; the ceiling is open above both
 A.lift({x:124*T,y:4*T,kind:'loop',vy:.75,w:48});A.lift({x:124*T,y:12*T,kind:'loop',vy:.75,w:48});
 A.row(128,9,'B?B',{129:'coin'});
 A.lift({x:137*T,y:6*T,kind:'loop',vy:-.75,w:48});A.lift({x:137*T,y:14*T,kind:'loop',vy:-.75,w:48});
 // the exit pipe sits in a brick wall; run over the ceiling instead to reach the Warp Zone
 A.sidePipe(142,12,1,3,{to:{area:'exit',pipe:2,how:'rise'}});A.fill(146,147,3,12,BRICK);
 A.fill(176,177,2,12,BRICK);
 A.pipe(156,3,{warp:4});A.pipe(162,3,{warp:3});A.pipe(168,3,{warp:2});
 A.text('WELCOME TO WARP ZONE!',157.75,5);A.text('4',156.75,8.5);A.text('3',162.75,8.5);A.text('2',168.75,8.5);A.warpZoneX=150*T;
 for(const c of [15.5,17,31,57,59,61,90,91.5,100,124,130.5])A.foe('goomba',c);
 A.foe('koopa',44);A.foe('koopa',45.5);A.foe('koopa',73);
 // the exit scene: up out of a pipe, the staircase, the flagpole and the castle
 const E=area(40,'over');E.ground(0,39);E.pipe(2,2,{exitOf:'main'});E.stairs(8,8,1);E.col(16,8);flagAndCastle(E,25,29);overworldScenery(E,{hills:false});
 E.decor.push({type:'hill',x:0,w:5});
 return {name:'1-2',time:400,areas:{intro:I,main:A,exit:E},start:{area:'intro',x:40,y:13*T,auto:true},startPlay:{area:'main',x:2*T+8,y:2*T},check:{area:'main',x:85*T,y:13*T}};
}

// ------------------------------------------------------------------ 1-3
function w13(){
 const A=area(176,'over');A.kind='athletic';
 A.ground(0,15);
 const trees=[[16,4,11],[21,5,8],[28,4,6],[34,6,9],[42,4,11],[57,8,10],[67,5,7],[74,3,10],[79,7,7],[93,5,9],[100,4,12],[105,6,9],[113,4,9],[121,5,7],[129,4,10],[145,4,7]];
 for(const [c,w,top] of trees)A.tree(c,w,top);
 A.coinRun(22,24,6);A.coinRun(29,30,4);A.coinRun(80,84,5);A.coinRun(122,124,5);A.coinRun(106,109,7);A.coinRun(58,63,8);
 A.q(69,3,'power');
 A.lift({x:48*T,y:9*T,kind:'h',x0:47*T,x1:54*T,vx:.75,w:48});
 A.lift({x:88*T,y:10*T,kind:'v',y0:6*T,y1:12*T,vy:-.75,w:48});
 A.lift({x:135*T,y:8*T,kind:'h',x0:134*T,x1:141*T,vx:-.75,w:48});
 A.ground(150,175);A.stairs(152,3,1);A.col(155,3);
 flagAndCastle(A,163,167);
 A.foe('goomba',25,8);A.foe('goomba',60,10);A.foe('goomba',62,10);A.foe('goomba',131,10);A.foe('goomba',158);
 A.foe('koopaRed',36,9);A.foe('koopaRed',82,7);A.foe('koopaRed',107,9);A.foe('koopaRed',123,7);
 A.foe('paraRed',118,6,{y0:4*T,y1:10*T});
 overworldScenery(A,{hills:false});
 return {name:'1-3',time:300,areas:{main:A},start:{area:'main',x:40,y:13*T},check:{area:'main',x:79*T+40,y:7*T}};
}

// ------------------------------------------------------------------ 1-4
function w14(){
 const A=area(152,'castle');A.scenery=false;
 A.fill(0,151,2,2,CASTLE);A.fill(0,12,3,4,CASTLE);
 A.fill(0,12,8,14,CASTLE);A.fill(13,13,9,14,CASTLE);A.fill(14,22,10,14,CASTLE);
 A.lava(23,25);A.fill(26,40,10,14,CASTLE);A.firebar(31,6,1);A.firebar(37,6,-1);
 A.lava(41,44);A.fill(45,58,10,14,CASTLE);A.fill(45,58,3,5,CASTLE);A.q(50,6,'power');A.firebar(55,9,1);
 A.lava(59,63);A.lift({x:61*T,y:9*T,kind:'h',x0:59*T+8,x1:63*T+8,vx:.6,w:32});
 A.fill(64,82,10,14,CASTLE);A.firebar(69,9,-1);A.firebar(77,6,1);
 A.lava(83,86);A.fill(87,100,10,14,CASTLE);A.firebar(93,9,1);
 A.fill(101,112,8,14,CASTLE);A.fill(101,112,3,3,CASTLE);
 // Bowser's bridge over the lava, the chain and the axe
 A.fill(113,125,8,8,BRIDGE);A.lava(113,125);A.set(125,7,CHAIN);
 A.fill(126,151,8,14,CASTLE);A.fill(150,151,2,7,CASTLE);
 A.bridge={c0:113,c1:125,r:8};A.axe={x:126*T+8,y:7*T+8};A.bowser={x:121*T,y:8*T,home:121*T};A.toad={x:141*T+8,y:8*T};
 A.bowserFireFrom=80*T;
 return {name:'1-4',time:300,areas:{main:A},start:{area:'main',x:40,y:8*T},check:{area:'main',x:66*T,y:10*T}};
}

const STAGES=[w11,w12,w13,w14];
const buildStage=i=>STAGES[i]();
Object.assign(exports,{T,ROWS,TILE,SOLID,BACK,buildStage,STAGE_COUNT:STAGES.length});
