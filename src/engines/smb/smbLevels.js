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

const CASTLE_KINDS=new Set(['castle','tower','bigtop','icepalace','casino','volcano','fortress','throne']);
function area(W,kind){
 const A={W,kind,tiles:new Uint8Array(W*ROWS),content:new Map(),coins:[],enemies:[],pipes:[],doors:[],decor:[],lifts:[],firebars:[],texts:[],scenery:kind==='over'};
 const tileFor=()=>CASTLE_KINDS.has(kind)?CASTLE:GROUND;
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
  // a city building for the rooftop stage: roof row on top (solid), facade below it (scenery, drawn behind the runner)
  building(c,w,top){A.set(c,top,TREE_L);for(let k=1;k<w-1;k++)A.set(c+k,top,TREE_M);A.set(c+w-1,top,TREE_R);for(let r=top+1;r<ROWS;r++)for(let k=0;k<w;k++)A.set(c+k,r,TRUNK);},
  tree(c,w,top){A.set(c,top,TREE_L);for(let k=1;k<w-1;k++)A.set(c+k,top,TREE_M);A.set(c+w-1,top,TREE_R);for(let r=top+1;r<ROWS;r++)for(let k=1;k<w-1;k++)A.set(c+k,r,TRUNK);},
  lava(c0,c1,top=12){A.fill(c0,c1,top,top,LAVA_TOP);A.fill(c0,c1,top+1,14,LAVA);},
  lift(o){A.lifts.push({w:48,vx:0,vy:0,...o});},
  firebar(c,r,dir=1,n=6){A.set(c,r,USED);A.firebars.push({c,r,n,dir,x:c*T+8,y:r*T+8});},
  text(str,c,r){A.texts.push({str,x:c*T,y:r*T});},
  // the real game's later pieces
  // a springboard standing on row r's surface
  spring(c,r=13){(A.springs||(A.springs=[])).push({c,r});},
  // a Bill Blaster h blocks tall standing on `base` (solid like a hard block); bullets come from a shared pool
  cannon(c,h,base=13){A.fill(c,c,base-h,base-1,HARD);(A.cannons||(A.cannons=[])).push({c,r:base-h,h});
   const have=A.enemies.filter(e=>e.type==='bullet').length;for(let k=have;k<Math.min(6,2+A.cannons.length);k++)A.foe('bullet',0,0,{pool:true});},
  // fish leap up over the bridge between columns c0 and c1 while somebody is on it
  cheeps(c0,c1){(A.cheepZones||(A.cheepZones=[])).push([c0*T,c1*T]);const have=A.enemies.filter(e=>e.type==='leaper').length;for(let k=have;k<5;k++)A.foe('leaper',0,0,{pool:true});},
  // a lava bubble jumping out of the lava at column c (pow = how high)
  podoboo(c,pow){A.foe('podoboo',c,12,pow?{pow}:{});},
  // two balance lifts on one rope (pulleys at row `rope`); weigh one down too far and the rope snaps
  balance(cL,cR,r,drop=4,rope=3){const i=A.lifts.length;A.lift({x:cL*T,y:r*T,kind:'bal',mate:i+1,ymax:(r+drop)*T,rope:rope*T,w:40});A.lift({x:cR*T,y:r*T,kind:'bal',mate:i,ymax:(r+drop)*T,rope:rope*T,w:40});},
  fallLift(c,r,w=40){A.lift({x:c*T,y:r*T,kind:'fall',w});},
  // a castle maze gate at column c: going right past it outside rows r0..r1 (where the feet are) loops you back `back` columns
  loop(c,back,r0,r1){(A.loops||(A.loops=[])).push({x:c*T,back:back*T,r0,r1});}
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
 return {name:'1-2',time:400,areas:{intro:I,main:A,exit:E},start:{area:'intro',x:40,y:13*T,auto:true},startPlay:{area:'main',x:2*T+8,y:2*T},check:{area:'main',x:85*T,y:9*T}};
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
 A.lava(41,44);A.fill(45,58,10,14,CASTLE);A.fill(45,58,3,3,CASTLE);A.q(50,6,'power');A.firebar(55,9,1);
 A.lava(59,63);A.lift({x:61*T,y:9*T,kind:'h',x0:59*T+8,x1:63*T+8,vx:.6,w:32});
 A.fill(64,82,10,14,CASTLE);A.firebar(69,9,-1);A.firebar(77,6,1);
 A.lava(83,86);A.fill(87,100,10,14,CASTLE);A.firebar(93,9,1);
 A.fill(101,112,8,14,CASTLE);A.fill(101,112,3,3,CASTLE);
 // Bowser's bridge over the lava, the chain and the axe
// the bridge sits 2 blocks lower than the step before it, like the NES, so there is room to jump over Bowser
 A.fill(113,125,10,10,BRIDGE);A.lava(113,125);A.set(125,9,CHAIN);
 A.fill(126,151,10,14,CASTLE);A.fill(150,151,2,9,CASTLE);
 A.bridge={c0:113,c1:125,r:10};A.axe={x:126*T+8,y:9*T+8};A.bowser={x:121*T,y:10*T,home:121*T};A.toad={x:141*T+8,y:10*T};
 A.bowserFireFrom=80*T;
 return {name:'1-4',time:300,areas:{main:A},start:{area:'main',x:40,y:8*T},check:{area:'main',x:66*T,y:10*T}};
}

// ================================================================== WORLD 2: NEW DORK CITY (our own city world: own
// layouts, own city art in smbArt.js; owner, Nov 21: streets, a flooded subway water stage, rooftops, and Bowser's
// skyscraper HQ with Bowser as the corporate CEO)
// street props: lamps, hydrants, newspaper boxes and benches on open sidewalk
function cityScenery(A,{from=0,to=A.W}={}){
 const onGround=c=>A.tiles[13*A.W+c]===GROUND&&!A.tiles[12*A.W+c];
 for(let c=from;c<to;c++){const m=c%24;
  if((m===3||m===15)&&onGround(c))A.decor.push({type:'lamp',x:c*T+8});
  else if(m===9&&onGround(c))A.decor.push({type:'hydrant',x:c*T+8});
  else if(m===20&&onGround(c)&&onGround(c+1))A.decor.push({type:'bench',x:c*T+8});
  else if(m===6&&onGround(c))A.decor.push({type:'news',x:c*T+8});}
}
const DORK='NEW DORK CITY';

// ------------------------------------------------------------------ 2-1 the streets
function w21(){
 const A=area(230,'city');
 A.ground(0,33);A.ground(37,88);A.ground(92,138);A.ground(146,229);
 // the street corner: a scaffold of girders with the power-up on top, a springboard up over a billboard wall
 A.fill(10,13,10,10,HARD);A.q(11,7,'power');A.coinRun(10,13,9);A.q(13,7,'coin');
 A.spring(17);A.fill(20,21,7,12,HARD);A.coinRun(18,23,4);A.foe('para',26);
 A.pipe(29,2,{to:{area:'bonus',x:2*T+8,y:2*T,how:'drop'}});
 // construction site: steel girders, a work elevator, coins in the air and a Bill Blaster on the far side
 A.row(42,9,'HHHH');A.coinRun(42,45,8);A.row(47,6,'HHHH');A.coinRun(47,50,5);
 A.lift({x:55*T,y:10*T,kind:'v',y0:5*T,y1:11*T,vy:-.6,w:48});
 A.brick(60,9,'star');A.row(61,5,'BBBB?BBB',{65:'power'});A.cannon(68,2);
 A.pipe(74,4,{exitOf:'bonus'});A.hidden(80,8,'1up');
 A.stairs(83,4,1);
 A.row(100,9,'B?B',{100:'vine'});A.brick(104,9,'multi');
 A.fill(108,111,9,9,HARD);A.fill(112,115,6,6,HARD);A.coinRun(112,115,5);
 A.pipe(120,3,{piranha:true});A.pipe(128,4,{piranha:true});
 // the cab ride over the roadworks
 A.lift({x:139*T,y:11*T+8,kind:'h',x0:139*T,x1:146*T,vx:.7,w:48,look:'taxi'});A.coinRun(141,144,8);
 // a pair of Bill Blasters guarding the last street, the bricks between them to hide under
 A.cannon(155,1);A.row(158,9,'?B?',{158:'power'});A.cannon(163,3);A.row(166,5,'BBBB');A.coinRun(166,169,4);
 A.stairs(175,8,1);A.col(183,8);
 flagAndCastle(A,192,196);
 for(const c of [23,40,58,59.5,96,97.5,124,125.5,150,151.5,170,171.5])A.foe('goomba',c);
 A.foe('goomba',109,9);A.foe('koopa',113,6);A.foe('para',116);A.foe('koopa',135);A.foe('para',160);
 cityScenery(A);
 // down the first pipe: a subway coin room that comes up out of the tall pipe; the brick at 100 grows a beanstalk
 A.vineTo={area:'cloud',x:3*T+8,y:9*T,how:'drop'};
 return {name:'2-1',title:DORK,time:400,areas:{main:A,bonus:coinRoom('subway',rng(21),74),cloud:cloudArea(rng(211),152,2)},start:{area:'main',x:40,y:13*T},check:{area:'main',x:96*T+8,y:13*T}};
}

// ------------------------------------------------------------------ 2-2 the flooded subway (water stage)
function w22(){
 // the street above: walk into the subway entrance
 const I=area(16,'city');I.ground(0,15);I.sidePipe(10,12,1,4,{cap:true,to:{area:'main',x:3*T,y:5*T,how:'drop'}});
 I.decor.push({type:'subway',x:6*T});cityScenery(I);
 const A=area(190,'subway');A.water=true;
 A.ground(0,39);A.ground(44,87);A.ground(93,139);A.ground(145,189);
 A.fill(0,189,2,2,HARD);A.fill(0,0,3,12,HARD);
 // the tunnel: pillars hanging from the ceiling, posts standing on the tracks, platforms and sunken train cars
 for(const c of [20,50,76,126,160])A.fill(c,c,3,6,HARD);
 for(const c of [30,64,99,134])A.fill(c,c,9,12,HARD);
 A.fill(55,60,8,8,HARD);A.coinRun(55,60,7);
 A.fill(108,121,10,12,HARD);A.coinRun(109,120,9);
 A.fill(150,156,7,7,HARD);A.coinRun(150,156,6);
 A.q(35,8,'power');A.q(84,6,'coin');A.q(140,8,'power');
 A.coinRun(40,43,11);A.coinRun(88,92,11);A.coinRun(140,144,4);
 for(const [c,r] of [[16,7],[26,10],[38,5],[47,9],[58,4],[70,8],[82,11],[95,5],[104,8],[118,4],[129,10],[138,6],[148,9],[166,5],[171,10]])A.foe('cheep',c,r);
 for(const [c,r] of [[60,6],[124,7]])A.foe('cheepRed',c,r);
 for(const [c,r] of [[44,7],[101,6],[155,11]])A.foe('blooper',c,r);
 // the exit pipe sits in the end wall
 A.sidePipe(178,12,1,3,{to:{area:'exit',pipe:2,how:'rise'}});A.fill(182,189,3,12,HARD);
 const E=area(40,'city');E.ground(0,39);E.pipe(2,2,{exitOf:'main'});E.stairs(8,8,1);E.col(16,8);flagAndCastle(E,25,29);cityScenery(E);
 return {name:'2-2',title:DORK,time:400,areas:{intro:I,main:A,exit:E},start:{area:'intro',x:40,y:13*T,auto:true},startPlay:{area:'main',x:3*T,y:5*T},check:{area:'main',x:95*T,y:13*T}};
}

// ------------------------------------------------------------------ 2-3 the rooftops
function w23(){
 const A=area(180,'roof');
 const blds=[[0,14,9],[16,5,7],[23,4,10],[30,7,7],[40,4,8],[47,6,11],[57,8,8],[69,5,9],[78,6,6],[88,4,10],[96,7,8],[107,5,5],[116,6,9],[126,4,7],[134,8,10],[146,5,8]];
 for(const [c,w,top] of blds)A.building(c,w,top);
 // steel beams and window-washer platforms over the gaps
 A.lift({x:55*T,y:9*T,kind:'h',x0:53*T+8,x1:56*T+8,vx:.6,w:48});
 A.lift({x:86*T,y:10*T,kind:'v',y0:6*T,y1:12*T,vy:-.7,w:48});
 A.lift({x:142*T,y:8*T,kind:'h',x0:141*T,x1:145*T,vx:-.6,w:48});
 A.row(42,4,'HHH');A.coinRun(42,44,3);A.row(103,6,'HHHH');A.coinRun(103,106,5);
 A.q(33,3,'power');A.row(60,4,'B?B',{61:'coin'});
 A.coinRun(17,20,5);A.coinRun(79,83,4);A.coinRun(117,121,7);A.coinRun(135,140,8);
 A.ground(154,179);A.stairs(156,3,1);A.col(159,3);
 flagAndCastle(A,167,171);
 A.foe('goomba',18,7);A.foe('goomba',72,9);A.foe('goomba',120,9);A.foe('goomba',162);
 A.foe('koopaRed',33,7);A.foe('koopaRed',60,8);A.foe('koopaRed',99,8);A.foe('koopaRed',137,10);A.foe('koopa',81,6);
 A.foe('paraRed',91,6,{y0:4*T,y1:10*T});A.foe('paraRed',129,5,{y0:3*T,y1:7*T});
 return {name:'2-3',title:DORK,time:300,areas:{main:A},start:{area:'main',x:40,y:9*T},check:{area:'main',x:78*T+40,y:6*T}};
}

// ------------------------------------------------------------------ 2-4 Bowser's HQ tower
function w24(){
 const A=area(160,'tower');A.scenery=false;
 A.fill(0,159,2,2,CASTLE);A.fill(0,20,10,14,CASTLE);A.text('KOOPA HOLDINGS INC.',2,5);
 A.lava(21,23);A.fill(24,40,10,14,CASTLE);A.firebar(29,6,1);A.firebar(35,9,-1);
 // the elevator shaft
 A.lava(41,46);A.lift({x:43.5*T,y:9*T,kind:'v',y0:5*T,y1:11*T,vy:-.6,w:48,look:'elevator'});A.podoboo(42,4.6);A.podoboo(45,5);
 A.fill(47,70,10,14,CASTLE);A.fill(52,64,3,4,CASTLE);A.q(58,7,'power');A.firebar(67,9,1);
 A.lava(71,75);A.lift({x:73*T,y:9*T,kind:'h',x0:71*T+8,x1:75*T+8,vx:.6,w:32,look:'elevator'});A.podoboo(73,5);
 A.fill(76,100,10,14,CASTLE);A.firebar(81,6,1);A.firebar(88,9,-1);A.firebar(95,6,1);
 A.fill(101,112,8,14,CASTLE);A.fill(101,112,3,3,CASTLE);
 // the boardroom catwalk over the shaft: the CEO, the emergency axe and Toad
 A.fill(113,125,10,10,BRIDGE);A.lava(113,125);A.set(125,9,CHAIN);
 A.fill(126,159,10,14,CASTLE);A.fill(158,159,2,9,CASTLE);
 A.bridge={c0:113,c1:125,r:10};A.axe={x:126*T+8,y:9*T+8,glass:true};A.bowser={x:121*T,y:10*T,home:121*T,ceo:true};A.toad={x:141*T+8,y:10*T};
 A.bowserFireFrom=80*T;A.toadLines=['BUT OUR PRINCESS GOT','TRANSFERRED TO ANOTHER BRANCH!'];
 return {name:'2-4',title:DORK,time:300,areas:{main:A},start:{area:'main',x:40,y:10*T},check:{area:'main',x:48*T,y:10*T}};
}

// ================================================================== WORLD 3: THE HAUNTED BOARDWALK (our own world: a
// run-down seaside amusement park at night; owner picked it from four ideas, Nov 21)
const BOARD='HAUNTED BOARDWALK';
// boardwalk props: carnival game stalls, balloon bunches, lamp posts
function pierScenery(A,{from=0,to=A.W}={}){
 const onGround=c=>A.tiles[13*A.W+c]===GROUND&&!A.tiles[12*A.W+c];
 for(let c=from;c<to;c++){const m=c%28;
  if(m===5&&onGround(c)&&onGround(c+1)&&onGround(c+2))A.decor.push({type:'stall',x:c*T,n:(c/28|0)%3});
  else if((m===14||m===24)&&onGround(c))A.decor.push({type:'lamp',x:c*T+8});
  else if(m===19&&onGround(c))A.decor.push({type:'balloons',x:c*T+8});}
}

// ------------------------------------------------------------------ 3-1 the pier
function w31(){
 const A=area(210,'pier');
 // the boardwalk runs out over the water: plank bridges over the gaps, fish leaping up over them
 A.ground(0,38);A.fill(39,44,13,13,BRIDGE);A.ground(45,70);A.fill(71,78,13,13,BRIDGE);A.ground(79,120);A.ground(129,160);A.fill(161,166,13,13,BRIDGE);A.ground(167,209);
 A.cheeps(36,82);A.cheeps(158,170);
 // a stack of crates at the ring-toss stall, the power-up on top
 A.fill(9,11,11,12,HARD);A.q(10,7,'power');A.coinRun(9,11,10);A.row(15,9,'B?B',{16:'coin'});
 A.foe('para',24);A.pipe(30,2,{to:{area:'bonus',x:2*T+8,y:2*T,how:'drop'}});
 A.row(52,9,'BB?BB',{54:'coin'});A.row(53,5,'B?B',{54:'coin'});
 A.row(64,9,'BBBB',{64:'vine'});A.coinRun(64,67,8);A.hidden(84,8,'1up');
 A.stairs(91,4,1);A.coinRun(96,99,6);
 A.q(106,9,'coin');A.brick(108,9,'star');A.q(110,9,'coin');A.row(105,5,'BBBBBB');A.coinRun(105,110,4);
 A.lift({x:124*T,y:11*T,kind:'h',x0:122*T,x1:128*T,vx:.6,w:48,look:'raft'});
 A.pipe(134,2,{exitOf:'bonus'});
 // a springboard up onto the stacked crates, coins on top
 A.spring(144);A.fill(147,148,6,12,HARD);A.coinRun(145,150,3);
 A.row(172,9,'?B?',{174:'power'});A.stairs(178,8,1);A.col(186,8);
 flagAndCastle(A,195,199);
 for(const c of [20,48,56,57.5,86,87.5,114,115.5,140,170,171.5])A.foe('goomba',c);
 A.foe('koopa',72,13);A.foe('koopa',132);A.foe('paraRed',97,8,{y0:5*T,y1:11*T});A.foe('para',113);A.foe('para',156);
 for(const [c,r] of [[60,8],[88,6],[118,7],[170,7]])A.foe('ghost',c,r);
 A.foe('slasher',74);A.foe('dreamer',138);A.foe('imp',150);A.foe('imp',176);
 pierScenery(A);
 A.vineTo={area:'cloud',x:3*T+8,y:9*T,how:'drop'};
 return {name:'3-1',title:BOARD,time:400,areas:{main:A,bonus:coinRoom('under',rng(31),134),cloud:cloudArea(rng(311),101,3)},start:{area:'main',x:40,y:13*T},check:{area:'main',x:102*T,y:13*T}};
}

// ------------------------------------------------------------------ 3-2 the funhouse (mirror maze: left and right swap)
function w32(){
 const I=area(16,'pier');I.ground(0,15);I.sidePipe(10,12,1,4,{cap:true,to:{area:'main',x:2*T+8,y:3*T,how:'drop'}});
 I.decor.push({type:'funsign',x:3*T});
 const A=area(196,'funhouse');
 A.ground(0,59);A.ground(62,103);A.ground(107,139);A.ground(143,179);
 A.fill(0,179,2,2,BRICK);A.fill(0,0,3,12,BRICK);
 A.row(10,9,'?B?',{10:'power'});A.row(18,6,'BBBB');A.coinRun(18,21,5);
 // mirror zone 1: a corridor of mirrors with a low ceiling
 A.mirrors=[[30,52],[95,121],[146,164]];
 A.fill(30,52,3,4,BRICK);A.coinRun(32,50,9);A.fill(40,41,10,12,HARD);
 A.coinRun(60,61,10);A.q(70,9,'coin');A.brick(72,9,'multi');A.row(76,5,'B?B',{77:'power'});
 A.fill(84,86,9,12,HARD);
 // mirror zone 2: steps and a pit inside the mirrors
 A.stairs(97,3,1);A.coinRun(104,106,8);A.fill(110,111,10,12,HARD);A.row(114,8,'BBB');A.coinRun(114,116,7);
 A.lift({x:141*T,y:10*T,kind:'v',y0:6*T,y1:12*T,vy:-.6,w:48});
 // mirror zone 3
 A.fill(150,151,9,12,HARD);A.fill(157,158,8,12,HARD);A.coinRun(152,156,10);
 A.sidePipe(168,12,1,3,{to:{area:'exit',pipe:2,how:'rise'}});A.fill(172,179,3,12,BRICK);roofRoom(A,180,'BACKSTAGE PASS!');
 for(const c of [14,26,55,66,67.5,90,125,126.5,135])A.foe('goomba',c);
 A.foe('koopa',80);A.foe('koopaRed',115,8);
 for(const [c,r] of [[44,8],[78,7],[103,6],[132,8],[160,7]])A.foe('ghost',c,r);
 A.foe('slasher',89);A.foe('dreamer',128);A.foe('imp',74);
 const E=area(40,'pier');E.ground(0,39);E.pipe(2,2,{exitOf:'main'});E.stairs(8,8,1);E.col(16,8);flagAndCastle(E,25,29);pierScenery(E);
 return {name:'3-2',title:BOARD,time:400,areas:{intro:I,main:A,exit:E},start:{area:'intro',x:40,y:13*T,auto:true},startPlay:{area:'main',x:2*T+8,y:3*T},check:{area:'main',x:64*T,y:13*T}};
}

// ------------------------------------------------------------------ 3-3 the rollercoaster (track tops on wooden scaffolds, coaster cars over the drops)
function w33(){
 const A=area(185,'coaster');
 const tracks=[[0,12,9],[14,4,8],[21,5,10],[30,6,7],[44,4,9],[52,8,6],[66,4,9],[74,6,7],[86,5,10],[95,6,8],[108,4,6],[116,7,9],[128,5,7],[137,6,10],[149,5,8]];
 for(const [c,w,top] of tracks)A.building(c,w,top);
 A.lift({x:38*T,y:9*T,kind:'h',x0:37*T,x1:43*T,vx:.8,w:48,look:'coaster'});
 A.lift({x:62*T,y:8*T,kind:'h',x0:60.5*T,x1:65*T,vx:-.8,w:48,look:'coaster'});
 A.lift({x:83*T,y:8*T,kind:'h',x0:81*T,x1:85*T,vx:.8,w:48,look:'coaster'});
 A.lift({x:104*T,y:9*T,kind:'h',x0:102*T,x1:107*T,vx:-.8,w:48,look:'coaster'});
 A.lift({x:125*T,y:9*T,kind:'v',y0:6*T,y1:11*T,vy:-.7,w:48,look:'coaster'});
 A.lift({x:146*T,y:9*T,kind:'h',x0:144*T,x1:148*T,vx:.8,w:48,look:'coaster'});
 A.q(32,3,'power');A.row(55,2,'B?B',{56:'coin'});A.coinRun(15,17,5);A.coinRun(53,59,3);A.coinRun(96,100,5);A.coinRun(117,122,6);A.coinRun(138,142,7);
 A.ground(157,184);A.stairs(159,3,1);A.col(162,3);
 flagAndCastle(A,170,174);
 A.foe('goomba',16,8);A.foe('goomba',76,7);A.foe('goomba',119,9);A.foe('goomba',166);
 A.foe('koopaRed',33,7);A.foe('koopaRed',56,6);A.foe('koopaRed',98,8);A.foe('koopaRed',140,10);A.foe('koopa',131,7);
 A.foe('paraRed',49,6,{y0:4*T,y1:9*T});A.foe('paraRed',112,4,{y0:3*T,y1:6*T});A.foe('ghost',90,5);A.foe('imp',56,6);A.foe('imp',119,9);A.foe('dreamer',77,7);
 return {name:'3-3',title:BOARD,time:300,areas:{main:A},start:{area:'main',x:40,y:9*T},check:{area:'main',x:74*T+40,y:7*T}};
}

// ------------------------------------------------------------------ 3-4 the haunted big top: Bowser the ringmaster
function w34(){
 const A=area(160,'bigtop');A.scenery=false;
 A.fill(0,159,2,2,CASTLE);A.fill(0,18,10,14,CASTLE);A.text('BOWSER BROS. CIRCUS',1,5);
 A.lava(19,22);A.fill(23,40,10,14,CASTLE);A.firebar(28,6,1);A.firebar(35,9,-1);
 // the trapeze over the fire pit
 A.lava(41,46);A.lift({x:43.5*T,y:9*T,kind:'v',y0:5*T,y1:11*T,vy:-.6,w:32,look:'trapeze'});A.podoboo(42,4.8);A.podoboo(45,5.2);
 A.fill(47,66,10,14,CASTLE);A.fill(50,62,3,4,CASTLE);A.q(56,7,'power');A.firebar(64,9,1);
 A.lava(67,72);A.lift({x:69.5*T,y:9*T,kind:'h',x0:67.5*T,x1:71.5*T,vx:.6,w:32,look:'trapeze'});A.podoboo(69,5.2);
 A.fill(73,100,10,14,CASTLE);A.firebar(79,6,1);A.firebar(86,9,-1);A.firebar(94,6,1);A.foe('ghost',83,6);A.foe('ghost',97,5);A.foe('slasher',90,10);A.foe('imp',33,10);A.foe('imp',58,10);
 A.fill(101,112,8,14,CASTLE);A.fill(101,112,3,3,CASTLE);
 A.fill(113,125,10,10,BRIDGE);A.lava(113,125);A.set(125,9,CHAIN);
 A.fill(126,159,10,14,CASTLE);A.fill(158,159,2,9,CASTLE);
 A.bridge={c0:113,c1:125,r:10};A.axe={x:126*T+8,y:9*T+8};A.bowser={x:121*T,y:10*T,home:121*T,ring:true};A.toad={x:141*T+8,y:10*T};
 A.bowserFireFrom=80*T;A.toadLines=['BUT OUR PRINCESS RAN OFF','TO JOIN ANOTHER CIRCUS!'];
 return {name:'3-4',title:BOARD,time:300,areas:{main:A},start:{area:'main',x:40,y:10*T},check:{area:'main',x:48*T,y:10*T}};
}

// ================================================================== WORLDS 4-8: built from hand-made sections (owner, Nov 21:
// Frostbite Peaks, Lost Wages, the Jurassic Jungle, Hell and Heaven; harder world by world). Each stage is the same
// every time (seeded by its number); its world's theme picks the look, the enemies, the power-up and the special pieces.
function rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
const FLYERS=new Set(['card','ptero','skull','floater','angel','cherub']);
function themeFoe(A,cfg,r,c,row=13){const t=cfg.foes[Math.floor(r()*cfg.foes.length)];if(FLYERS.has(t))A.foe(t,c,Math.max(4,row-4-Math.floor(r()*3)));else A.foe(t,c,row);}
const pick=(r,a)=>a[Math.floor(r()*a.length)];
function props(A,cfg,c0,c1,r){if(!cfg.props)return;for(let c=c0+2;c<c1-1;c+=5+Math.floor(r()*6)){if(A.tiles[13*A.W+c]&&!A.tiles[12*A.W+c])A.decor.push({type:pick(r,cfg.props),x:c*T+8});}}

// one difficulty number per stage (4-1 = 4, 4-4 = 4.75, ... 8-4 = 8.75): everything that makes a stage harder grows with it
const lvOf=(wn,n)=>wn+(n-1)*.25;
const isFree=(A,c0,c1,r0,r1)=>{for(let c=c0;c<=c1;c++)for(let r=Math.max(0,r0);r<=r1;r++)if(c<0||c>=A.W||A.tiles[r*A.W+c])return false;return true;};
// enemies climb steadily from stage to stage (the random sections alone made it jumpy): add walkers on open ground
// (solid at row 13, nothing in the four rows above) or take some away
function evenFoes(A,cfg,r,target,c0,c1){const walkers=()=>A.enemies.filter(e=>!e.pool&&e.type!=='piranha');let n=walkers().length;
 const open=[];for(let c=c0;c<c1;c++)if(A.tiles[13*A.W+c]&&!A.tiles[12*A.W+c]&&!A.tiles[11*A.W+c]&&!A.tiles[10*A.W+c]&&!A.tiles[9*A.W+c]&&!A.enemies.some(e=>Math.abs(e.x-(c*T+8))<24))open.push(c);
 while(n<target&&open.length){const cc=open.splice(Math.floor(r()*open.length),1)[0];themeFoe(A,cfg,r,cc);n++;}
 while(n>target+2){const w=walkers(),e=w[Math.floor(r()*w.length)];A.enemies.splice(A.enemies.indexOf(e),1);n--;}}
// a coin room under a pipe: in through the pipe, out through a side pipe that comes up further along the stage
function coinRoom(kind,r,exitCol){const R=area(17,kind);R.scenery=false;R.ground(0,16);R.fill(0,0,2,12,BRICK);R.fill(4,12,2,2,BRICK);
 const v=Math.floor(r()*3);
 if(v===0){R.fill(4,10,10,12,BRICK);for(let c=4;c<11;c++){R.coin(c,8);R.coin(c,9);}for(let c=5;c<10;c++)R.coin(c,5);}
 else if(v===1){R.row(4,9,'BB?BB',{6:'1up'});R.coinRun(2,11,12);R.coinRun(3,10,11);R.coinRun(4,8,5);}
 else{R.row(3,9,'BBBBBBBBB',{7:'multi'});R.coinRun(3,11,8);R.coinRun(3,11,12);R.coinRun(4,10,5);R.hidden(2,6,'1up');}
 R.sidePipe(13,12,1,0,{to:{area:'main',pipe:exitCol,how:'rise'}});return R;}
// the cloud area at the top of a beanstalk: a long walk on the clouds collecting coins, then drop back into the stage
// the bonus area at the top of a beanstalk: World 1's coin clouds, and every other world its own high place (World 4 = the
// ski run below). Fall off any gap or the far end and you drop back into the stage at the landing spot.
const SKY_THEMES={
 2:{kind:'roof',title:'PENTHOUSE ROOFTOPS',shape:'roofs',props:['lamp','bench','lamp']},
 3:{kind:'coaster',title:'TOP OF THE COASTER',shape:'track'},
 5:{kind:'strip',title:'HIGH ROLLER SKYWALK',shape:'flat',props:['neon'],gap:13},
 6:{kind:'jungle',title:'TREETOP CANOPY',shape:'islands',props:['fern']},
 7:{kind:'bones',title:"THE DEVIL'S BALCONY",shape:'islands',props:['skull','firepot']},
 8:{kind:'gates',title:'THE PEARLY GATES',shape:'flat',props:['harp']},
};
function cloudArea(r,landCol,wn=1){const th=SKY_THEMES[wn],W=80,A=area(W,th?th.kind:'sky');A.scenery=false;A.skyRoom=wn;
 // the ground: [c0,c1,top] pieces; the first always under the beanstalk
 const segs=[];const shape=th?th.shape:'flat';
 if(shape==='flat')segs.push([0,W-14,11]);
 else{let c=0,top=11;while(c<W-16){const w=c===0?10:5+Math.floor(r()*(shape==='islands'?3:6));const t=c===0?11:shape==='roofs'?10+Math.floor(r()*2):shape==='track'?clamp(top+Math.floor(r()*3)-1,9,11):9+Math.floor(r()*3);
  const c1=Math.min(c+w-1,W-14);segs.push([c,c1,t]);top=t;c=c1+1+(c1>=W-14?0:2+Math.floor(r()*(shape==='islands'?2:1)));}}
 for(const [c0,c1,t] of segs){if(shape==='roofs'||shape==='track')A.building(c0,c1-c0+1,t);else A.fill(c0,c1,t,t,GROUND);}
 const topAt=c=>{const sg=segs.find(([a,b])=>c>=a&&c<=b);return sg?sg[2]:null;};
 // coins: patterns over the ground, an arc over every gap
 for(let c=5;c<W-18;c+=6+Math.floor(r()*3)){const t=topAt(c+2);if(t===null)continue;const pat=Math.floor(r()*3);
  if(pat===0)A.coinRun(c,c+3,t-3);else if(pat===1){A.coinRun(c,c+4,t-2);A.coinRun(c+1,c+3,t-4);}else{A.coin(c,t-3);A.coin(c+1,t-4);A.coin(c+2,t-5);A.coin(c+3,t-4);A.coin(c+4,t-3);}}
 for(let k=1;k<segs.length;k++){const g0=segs[k-1][1]+1,g1=segs[k][0]-1;for(let c=g0;c<=g1;c++)A.coin(c,Math.min(segs[k-1][2],segs[k][2])-3);}
 const mid=Math.floor(W/2),mt=topAt(mid)??topAt(mid+3)??11,mc=topAt(mid)!==null?mid:mid+3;A.q(mc,mt-4,'1up');A.coinRun(W-16,W-15,(topAt(W-16)??11)-4);
 if(th){A.text(th.title,2,3);if(th.props)for(const [c0,c1,t] of segs)for(let c=c0+2;c<c1-1;c+=(th.gap||4)+Math.floor(r()*4))if(!A.tiles[(t-1)*W+c])A.decor.push({type:pick(r,th.props),x:c*T+8,gy:t});}
 else for(let c=6;c<W;c+=11)A.decor.push({type:'cloud',x:c*T,y:(2+(c*7)%3)*T,n:1+(c*3)%3});
 A.vines=[{c:1,top:8*T,bottom:ROWS*T+T,max:8*T}];
 A.fallTo={area:'main',x:landCol*T+8,y:-T,how:'drop'};return A;}
// World 4's beanstalk leads up to a downhill ski run instead of clouds: skis on, terraces of snow stepping down the
// mountain, kickers off their edges (one big one to a 1-up), grind rails over the gaps and above the slope, mogul
// bumps, coins in the air, penguins; off the cliff at the bottom you drop back into the stage
function skiRun(r,landCol){const W=150,A=area(W,'snow');A.ice=true;A.ramps=[];A.skiRun=true;
 const plat=(c0,c1,top)=>A.fill(c0,c1,top,14,GROUND),rail=(c0,c1,row)=>A.lift({x:(c0+c1+1)/2*T,y:row*T,w:(c1-c0+1)*T,kind:'rail',look:'rail'});
 const arc=(c0,c1,base,h)=>{for(let c=c0;c<=c1;c++)A.coin(c,Math.round(base-h*Math.sin((c-c0+.5)/(c1-c0+1)*Math.PI)));};
 A.text('SKI RUN!',2.5,2);plat(0,11,5);A.ramps.push({c:10,r:5});arc(12,16,4,3);
 plat(17,26,6);A.coinRun(19,23,4);rail(27,34,7);A.coinRun(28,33,5);
 // moguls
 plat(35,46,8);for(const m of [37,40,43])A.ramps.push({c:m,r:8});A.ramps.push({c:45,r:8});arc(47,52,6,3);A.foe('penguin',41,8);
 // the big kicker over a wide gap: fly high enough and the 1-up is yours
 plat(53,60,9);A.ramps.push({c:59,r:9,big:true});arc(61,70,6,4);A.q(66,2,'1up');
 // a long rail above the slope to grind for points
 plat(71,82,10);rail(73,80,7);A.coinRun(74,79,5);A.foe('penguin',81,10);
 plat(87,100,11);A.ramps.push({c:85-0,r:10});A.ramps.push({c:99,r:11});rail(101,104,11);rail(106,110,10);A.coinRun(101,110,8);
 plat(111,124,12);A.ramps.push({c:116,r:12});A.ramps.push({c:123,r:12});arc(125,129,10,3);A.foe('penguin',119,12);
 plat(130,141,13);A.coinRun(131,140,11);A.text('FINISH',133,8);
 // the kicker at the end of the second rail stretch sits on that terrace
 A.ramps=A.ramps.filter(rp=>A.tiles[rp.r*W+rp.c]);
 A.fallTo={area:'main',x:landCol*T+8,y:-T,how:'drop'};return A;}
// the end of a ceiling run (owner, Nov 21: "got stuck here... if this is going to be accessible there should be a secret
// area after it"): like 1-2's Warp Zone, the ceiling stops past the exit wall so a roof runner drops into a hidden room:
// coins, a 1-up, and a pipe down to the flagpole. The room is the last 16 columns of the area (c0 = its first column).
function roofRoom(A,c0,title='SECRET ROOF ROOM!',warps){A.ground(c0,c0+15);A.fill(c0+15,c0+15,0,12,BRICK);A.roofRoomX=c0*T;
 if(warps){warps.forEach((n,k)=>{const c=c0+2+k*4;A.pipe(c,3,{warp:n});A.text(String(n),c+.75,8.5);});A.text('WELCOME TO WARP ZONE!',c0+.75,5);A.coinRun(c0+1,c0+13,12);return;}
 A.coinRun(c0+2,c0+12,10);A.coinRun(c0+3,c0+11,8);A.q(c0+6,9,'1up');A.hidden(c0+4,9,'coin');
 A.pipe(c0+10,2,{to:{area:'exit',pipe:2,how:'rise'}});A.text(title,c0+1.25,4);}
// the 4-2 secret: like 1-2's Warp Zone, a room of pipes to later worlds
function warpRoom(kind,list){const A=area(24,kind);A.scenery=false;A.ground(0,23);A.fill(0,0,2,12,BRICK);A.fill(4,23,2,2,BRICK);A.fill(22,23,3,12,BRICK);
 list.forEach((n,k)=>{const c=4+k*6;A.pipe(c,3,{warp:n});A.text(String(n),c+.75,8.5);});A.text('WELCOME TO WARP ZONE!',2.75,5);A.coinRun(2,20,12);return A;}
// beanstalk + coin room bookkeeping shared by the outdoor and platform stages: the exit pipe and the landing spot get
// their own stretch of ground further on (see `pending` in the generators)
function secrets(A,areas,r,cfg,{exitCol,vineAt,vineRow=9,landCol}){
 if(exitCol>=0)areas.bonus=coinRoom(cfg.roomKind||'under',r,exitCol);else A.doors=A.doors.filter(d=>d.to?.area!=='bonus');
 if(vineAt>=0){if(landCol>=0&&isFree(A,vineAt,vineAt,0,vineRow-1)){if(cfg.ice){A.vineTo={area:'cloud',x:3*T+8,y:5*T,how:'drop'};areas.cloud=skiRun(r,landCol);}else{A.vineTo={area:'cloud',x:3*T+8,y:9*T,how:'drop'};areas.cloud=cloudArea(r,landCol,cfg.wn||1);}}else A.content.set(vineRow*A.W+vineAt,'coin');}
}

// ---- the real game's set pieces, shared by the stage builders. Each starts at column c and returns where the next
// thing starts; S = {A,r,lv,cfg,foe(c,row)}. Which ones a stage uses (and how often) comes from its style, so no two
// stages of a world play alike: cannon walls and Hammer Bros, bridges with leaping fish, pipe fields, springboards...
const PIECES={
 // Bill Blasters, the second one taller; a brick between them to duck under the bullets
 cannons(S,c){const {A,r,lv}=S;A.ground(c,c+13);A.cannon(c+3,1+Math.floor(r()*2));A.cannon(c+10,2+Math.floor(r()*Math.min(2,lv/3)));A.row(c+6,9,'B?B',{[c+7]:'coin'});S.foe(c+7);return c+14;},
 // the Hammer Bros' post: two brick shelves with a brother on each (just one before World 6)
 hammers(S,c){const {A,r,lv}=S;A.ground(c,c+17);A.row(c+4,9,'BBBBBBBB',{[c+7]:r()<.4?S.cfg.power:'coin'});A.row(c+6,5,'BBBB');A.foe('hammerBro',c+8,9);if(lv>=5.5)A.foe('hammerBro',c+7,5);A.coinRun(c+6,c+9,4);return c+18;},
 // a wall too high to jump with a springboard in front of it, coins over the top
 springWall(S,c){const {A,r}=S,h=6+Math.floor(r()*2);A.ground(c,c+15);A.spring(c+5);A.fill(c+8,c+9,13-h,12,HARD);A.coinRun(c+6,c+11,Math.max(3,13-h-3));S.foe(c+13);return c+16;},
 // a plank bridge over the drop, fish leaping up over it, a Paratroopa on patrol; later on the planks have gaps
 bridge(S,c){const {A,r,lv}=S,L=16+Math.floor(r()*8);A.ground(c,c+1);let x=c+2;const end=x+L;
  while(x<end){const seg=4+Math.floor(r()*5),e2=Math.min(end-1,x+seg-1);A.fill(x,e2,13,13,BRIDGE);x=e2+1;if(lv>=4.5&&x<end-3&&r()<.55)x+=2;}
  A.cheeps(c,end+2);A.coinRun(c+4,c+7,9);A.foe(r()<.5?'para':'koopaRed',c+8,13);if(lv>=6)A.foe('para',c+15,13);A.ground(end,end+5);return end+6;},
 // Koopa Paratroopas bounding along at a pipe
 paras(S,c){const {A,r,lv}=S;A.ground(c,c+17);A.pipe(c+13,2+Math.floor(r()*2),{piranha:r()<.3+.05*lv});for(let k=0,n=2+Math.floor(lv/4);k<n;k++)A.foe('para',c+3+k*3,13);A.row(c+3,9,'B?B',{[c+4]:'coin'});return c+18;},
 // balance lifts over a drop: stand on one too long and it sinks while the other rises, then the rope snaps
 balance(S,c){const {A,r}=S;A.balance(c+2.5,c+7.5,8+Math.floor(r()*2),4,3);A.coinRun(c+2,c+3,6);A.coinRun(c+7,c+8,6);A.ground(c+10,c+14);S.foe(c+13);return c+15;},
 // a row of lifts that fall away under your feet
 falls(S,c){const {A,r}=S,L=12+Math.floor(r()*5);for(let x=c+2;x<c+L-1;x+=3+Math.floor(r()*2))A.fallLift(x+.5,9+Math.floor(r()*3),32);A.coinRun(c+3,c+L-3,6);A.ground(c+L,c+L+5);return c+L+6;},
 // endless lifts: one column going up, one coming down
 loopLifts(S,c){const {A,lv}=S,sp=.7+.04*lv;A.lift({x:(c+2.5)*T,y:4*T,kind:'loop',vy:sp,w:48});A.lift({x:(c+2.5)*T,y:12*T,kind:'loop',vy:sp,w:48});A.lift({x:(c+7.5)*T,y:6*T,kind:'loop',vy:-sp,w:48});A.lift({x:(c+7.5)*T,y:14*T,kind:'loop',vy:-sp,w:48});A.ground(c+10,c+15);return c+16;},
 // a low passage full of Buzzy Beetles (fireballs bounce off them: stomp and kick them)
 buzzies(S,c){const {A,lv}=S;A.ground(c,c+15);A.fill(c+3,c+12,3,9,BRICK);for(let k=0,n=2+Math.floor(lv/3);k<n;k++)A.foe('buzzy',c+4+k*3,13);A.coinRun(c+4,c+11,11);return c+16;},
 // a pyramid of blocks either side of a pit
 // a run of one-block gaps: run at full speed and you skim over them, walk and you drop in (coins over the gaps)
 gapRun(S,c){const {A,r,lv}=S;A.ground(c,c+8);A.coinRun(c+4,c+7,11);let x=c+9;const n=4+Math.floor(r()*3)+(lv>=6?2:0);
  for(let k=0;k<n;k++){A.coinRun(x,x,11);x++;const w=r()<.6?1:2;A.ground(x,x+w-1);x+=w;}
  A.ground(x,x+5);S.foe(x+4);return x+6;},
 stairsPit(S,c){const {A,r,lv}=S,h=4+Math.floor(r()*3),gap=2+Math.floor(r()*Math.min(3,lv/2.5));A.ground(c,c+h);A.stairs(c+1,h,1);c+=h+1+gap;A.ground(c,c+h+1);A.stairs(c,h,-1);if(lv>=5)S.foe(c+h+1);return c+h+2;},
 // a field of pipes, plants in most of them, a Paratroopa over the top
 pipeField(S,c){const {A,r,lv}=S;A.ground(c,c+19);for(let k=0;k<4;k++)A.pipe(c+2+k*5,2+Math.floor(r()*3),{piranha:r()<.35+.06*lv});if(r()<.6)A.foe('para',c+9,8);return c+20;},
};
const STYLE_PIECES={classic:['springWall','gapRun','stairsPit','paras'],fortress:['cannons','hammers','gapRun','cannons','stairsPit'],bridge:['bridge','bridge','falls','paras'],
 pipes:['pipeField','gapRun','paras','springWall','pipeField'],hammer:['hammers','cannons','gapRun','paras','hammers'],
 cave:['stairsPit'],buzzy:['buzzies','buzzies','loopLifts'],lifts:['loopLifts','falls','loopLifts'],pipemaze:['pipeField','paras','buzzies']};

// an outdoor stage: flats, pits, pipes (one leads to a coin room), stairs, block clusters, tiers, floating islands,
// pipe hops over pits, brick bridges, lift gaps and the world's own pieces (ramps, walls, high ledges); a beanstalk
// block grows up to a cloud area; 5-1 has the cloud rider throwing spiky shells all the way
function genOver(wn,n,cfg){const r=rng(wn*100+n*7+1),lv=lvOf(wn,n),W=cfg.rider?240:225,A=area(W,cfg.kind);if(cfg.ice)A.ice=true;if(cfg.wind)A.wind=true;A.ramps=[];
 const areas={main:A},flats=[];let c=16,check=null,bonusAt=-1,vineAt=-1,exitCol=-1,landCol=-1,ups=0,special=0;
 A.ground(0,15);
 // four different openings (the stages used to all start alike)
 const op=(wn*3+n)%4;
 if(op===0){A.row(10,9,'?B?',{10:cfg.power,12:'power'});A.q(12,5,'coin');}
 else if(op===1){A.row(7,9,'BBB?BBB',{10:cfg.power});A.coinRun(8,12,5);A.hidden(13,5,'coin');}
 else if(op===2){A.fill(9,12,11,12,HARD);A.q(10,8,cfg.power);A.q(12,8,'coin');A.coinRun(9,12,10);}
 else{A.pipe(8,2);A.row(11,9,'??',{11:cfg.power,12:'coin'});A.q(14,6,'coin');}
 const S={A,r,lv,cfg,foe:(cc,row=13)=>themeFoe(A,cfg,r,cc,row)},sty=STYLE_PIECES[cfg.style||'classic']||STYLE_PIECES.classic;let styled=0;
 // the coin room's pipe, its way out, and the landing spot under the cloud area each get a plain stretch of ground
 const pending=()=>{
  // the beanstalk first once it is due: it needs ~30 columns after it for the landing spot
  if(vineAt<0&&cfg.vine!==false&&c>W*.42){A.ground(c,c+9);A.row(c+3,9,'?B?',{[c+3]:'coin',[c+5]:'coin',[c+4]:'vine'});vineAt=c+4;themeFoe(A,cfg,r,c+8);c+=10;return true;}
  if(bonusAt<0&&c>W*.3){A.ground(c,c+9);bonusAt=c+4;A.pipe(bonusAt,2+Math.floor(r()*2),{to:{area:'bonus',x:2*T+8,y:2*T,how:'drop'}});themeFoe(A,cfg,r,c+8);c+=10;return true;}
  if(bonusAt>=0&&exitCol<0&&c>bonusAt+26){A.ground(c,c+7);exitCol=c+3;A.pipe(exitCol,2,{exitOf:'bonus'});c+=8;return true;}
  if(vineAt>=0&&landCol<0&&c>vineAt+30){A.ground(c,c+7);landCol=c+3;A.coinRun(c+2,c+4,6);c+=8;return true;}
  return false;};
 const foes=(c0,len,row=13)=>{const k=Math.round(r()*(cfg.rider?.4+lv*.1:1+lv*.28));for(let j=0;j<k;j++)themeFoe(A,cfg,r,c0+2+Math.floor(r()*Math.max(1,len-4)),row);};
 const flat=len=>{A.ground(c,c+len-1);flats.push([c,len]);foes(c,len);
  // no bare stretches: blocks (often two rows of them), a step, a pipe or a hidden 1-up on every one
  const v=r();
  if(v<.62){const pat=pick(r,['B?B','?B?B','BB?BB','???','B?B?B','BBB?BBB','?BB?']),mid=c+2+Math.floor(pat.length/2),sp={[mid]:r()<.22-.015*lv?pick(r,cfg.extra||['power']):'coin'};
   const vine=vineAt<0&&cfg.vine!==false&&c>30&&c<W*.55;if(vine){sp[mid]='vine';vineAt=mid;}
   A.row(c+2,9,pat,sp);if(!vine&&r()<.6){const p2=pick(r,['B?B','BBBB','?B?','BB??BB'].filter(q=>q.length<=pat.length+1));A.row(c+2+Math.floor(r()*2),5,p2);A.coinRun(c+3,c+2+p2.length,4);}
   if(r()<.5)foes(c,len,9);}
  else if(v<.78&&len>=7){A.stairs(c+2,2+Math.floor(r()*2),1);if(r()<.5)A.row(c+5,9,'?',{[c+5]:'coin'});}
  else if(v<.9&&len>=7)A.pipe(c+len-4,2+Math.floor(r()*3),{piranha:r()<.25+.06*lv});
  else if(ups<2&&len>=8){A.hidden(c+3+Math.floor(r()*(len-6)),9,'1up');ups++;}
  // on skis every long stretch may end in a small ramp: launch off it into whatever comes next
  if(cfg.special==='ramp'&&len>=8&&r()<.55)A.ramps.push({c:c+len-2});
  props(A,cfg,c,c+len,r);c+=len;
  // and often a pit after it, wider further on
  if(c<W-70&&r()<.32+.03*lv){const gap=2+Math.floor(r()*Math.min(3,lv/2.6));if(r()<.5)A.coinRun(c,c+gap-1,9);c+=gap;}};
 // the world's own piece
 const piece=()=>{special++;
   // World 4 on skis: jumps over gaps, a high route up a big kicker, mogul runs
   if(cfg.special==='ramp'){const v=special===1?1:Math.floor(r()*3);
    if(v===0){A.ground(c,c+13);A.ramps.push({c:c+11});const gap=3+Math.floor(r()*Math.min(3,lv-2));
     for(let k=0;k<gap+2;k++)A.coin(c+13+k,Math.round(8-3*Math.sin((k+.5)/(gap+2)*Math.PI)));c+=14+gap;flat(6);}
    // the high route: only a full-speed run up the big kicker reaches the ice ledge (coins, a 1-up); its own ramp throws
    // you back down further on, over the enemies on the low road underneath
    else if(v===1){const L=52;A.ground(c,c+L-1);A.ramps.push({c:c+7,big:true});A.fill(c+13,c+33,7,7,HARD);A.coinRun(c+15,c+31,6);A.q(c+22,3,'1up');A.ramps.push({c:c+32,r:7});
     A.row(c+18,10,'B?B',{[c+19]:'coin'});for(const dx of [16,25,38,45])themeFoe(A,cfg,r,c+dx);flats.push([c+36,14]);c+=L;}
    else{for(let k=0;k<3;k++){A.ground(c,c+5);A.ramps.push({c:c+4});const gap=2+k;A.coinRun(c+6,c+5+gap,8-k);c+=6+gap;}flat(6);}}
   else if(cfg.special==='wall'){A.ground(c,c+13);A.col(c+3,2);A.fill(c+5,c+8,9,12,BRICK);A.fill(c+5,c+8,5,5,BRICK);A.coinRun(c+5,c+8,4);themeFoe(A,cfg,r,c+11);c+=14;}
   else if(cfg.special==='high'){A.ground(c,c+13);A.coinRun(c+2,c+11,3);A.row(c+4,6,'HHH');A.stairs(c+9,3,1);themeFoe(A,cfg,r,c+8);c+=14;}
   else flat(10);};
 const spd=.6+.04*lv;
 while(c<W-62){const roll=r();
  if(!check&&c>W*.45){flat(10);check={area:'main',x:(c-8)*T,y:13*T};continue;}
  if(pending())continue;
  if(cfg.special==='ramp'&&r()<.32){piece();continue;}
  // every stage gets its world's own piece at least twice (ramps, walls, high ledges)
  if(cfg.special&&special<2&&c>W*(special?.55:.2)){piece();continue;}
  // and its style's set pieces: at least three, otherwise about two picks in five
  if(styled<3&&c>W*(.15+.18*styled)||r()<.48){c=PIECES[sty[styled%sty.length]||pick(r,sty)](S,c);styled++;continue;}
  if(roll<.16)flat(7+Math.floor(r()*5));
  else if(roll<.28){const gap=2+Math.floor(r()*Math.min(4,1+lv/3));A.coinRun(c,c+gap-1,9);if(gap>=5)A.lift({x:(c+gap/2)*T,y:11*T,kind:'h',x0:(c+1)*T,x1:(c+gap-1)*T,vx:spd,w:48,look:cfg.lift});c+=gap;flat(4+Math.floor(r()*3));}
  else if(roll<.38){A.ground(c,c+13);
   [[2,2+Math.floor(r()*3)],[8,2+Math.floor(r()*3)]].forEach(([dx,h],k)=>{const enter=k===0&&bonusAt<0&&c>24&&c<W*.6;
    if(enter){A.pipe(c+dx,h,{to:{area:'bonus',x:2*T+8,y:2*T,how:'drop'}});bonusAt=c+dx;}else A.pipe(c+dx,h,{piranha:r()<.2+.07*lv});});
   themeFoe(A,cfg,r,c+6);c+=14;}
  else if(roll<.45){A.ground(c,c+5);A.stairs(c+1,4,1);c+=6;const gap=2+Math.floor(r()*Math.min(3,lv/3));c+=gap;A.ground(c,c+5);A.stairs(c,4,-1);c+=6;flat(6);}
  else if(roll<.53){A.ground(c,c+13);A.row(c+2,9,'BB?BB?BB',{[c+4]:'coin',[c+7]:r()<.3?cfg.power:'coin'});themeFoe(A,cfg,r,c+5,9);themeFoe(A,cfg,r,c+10);A.row(c+5,5,'?B?');c+=14;}
  else if(roll<.60){const gap=6+Math.floor(r()*3);A.lift({x:(c+gap/2)*T,y:10*T,kind:r()<.5?'h':'v',x0:(c+1)*T,x1:(c+gap-1)*T,y0:6*T,y1:12*T,vx:spd,vy:-spd,w:lv>=7?32:48,look:cfg.lift});A.coinRun(c+1,c+gap-2,7);c+=gap;flat(5);}
  // tiers: a brick shelf, a high hard ledge above it with coins, enemies on every level
  else if(roll<.68){A.ground(c,c+15);flats.push([c+12,4]);A.row(c+2,9,'BBBB?',{[c+6]:r()<.25?cfg.power:'coin'});A.fill(c+7,c+11,6,6,HARD);A.coinRun(c+7,c+11,5);
   themeFoe(A,cfg,r,c+3,9);themeFoe(A,cfg,r,c+9,6);themeFoe(A,cfg,r,c+12);if(ups<2&&r()<.3){A.hidden(c+13,9,'1up');ups++;}c+=16;}
  // floating islands over a long pit
  else if(roll<.75){const gap=8+Math.floor(r()*Math.min(4,lv/2));let x=c+1;while(x<c+gap-2){const rr=9+Math.floor(r()*3);A.fill(x,x+1,rr,rr,HARD);A.coinRun(x,x+1,rr-2);if(r()<.25+.04*lv)themeFoe(A,cfg,r,x+1,rr);x+=3+Math.floor(r()*2);}c+=gap;flat(5);}
  // pipe hops: pipes on stubs of ground with pits between them
  else if(roll<.82){for(let k=0;k<3;k++){A.ground(c,c+2);A.pipe(c,2+Math.floor(r()*3),{piranha:r()<.15+.06*lv});c+=3;c+=2+Math.floor(r()*Math.min(2,lv/4));}flat(5);}
  // a brick bridge over a pit, enemies walking across it
  else if(roll<.88){const gap=6+Math.floor(r()*4);A.ground(c,c+1);c+=2;A.row(c,10,'B'.repeat(gap));A.coinRun(c+1,c+gap-2,6);themeFoe(A,cfg,r,c+Math.floor(gap/2),10);c+=gap;flat(5);}
  else piece();
 }
 while(pending()){}
 // a late beanstalk still gets its landing spot (a long set piece can carry the builder past the usual distance)
 if(vineAt>=0&&landCol<0){A.ground(c,c+7);landCol=c+3;A.coinRun(c+2,c+4,6);c+=8;}
 secrets(A,areas,r,cfg,{exitCol,vineAt,landCol});
 evenFoes(A,cfg,r,Math.round(cfg.rider?6+lv:4+2.1*lv),20,c);
 A.ground(c,W-1);A.stairs(c+2,8,1);A.col(c+10,8);flagAndCastle(A,c+19,c+23);props(A,cfg,c+24,W,r);
 if(cfg.rider){A.foe('rider',22,4);for(let k=0;k<6;k++)A.foe('spiny',0,13,{pool:true});A.rider=true;A.riderEnd=(c-4)*T;}
 return {name:`${wn}-${n}`,title:cfg.title,time:cfg.time||(wn>=7?350:400),areas,start:{area:'main',x:40,y:13*T},check:check||{area:'main',x:(W/2|0)*T,y:13*T}};}

// an underground stage: street/scene intro, the cave (pits, low ceilings, hanging columns, lifts, pipes with plants and
// one to a coin room, brick shelves, brick stairs), then out through a pipe to the flagpole; 4-2 hides a Warp Zone
function genUnder(wn,n,cfg){const r=rng(wn*100+n*7+2),lv=lvOf(wn,n),W=210;
 const I=area(16,cfg.outKind);I.ground(0,15);I.sidePipe(10,12,1,4,{cap:true,to:{area:'main',x:2*T+8,y:3*T,how:'drop'}});
 const A=area(W+16,cfg.kind);if(cfg.ice)A.ice=true;A.ramps=[];A.ground(0,13);A.fill(0,W-1,2,2,BRICK);A.fill(0,0,3,12,BRICK);if((wn+n)%2)A.row(8,9,'?B?',{8:cfg.power,10:'power'});else{A.row(5,9,'BB?B',{7:cfg.power});A.fill(10,12,6,8,BRICK);A.coinRun(10,12,5);}
 const areas={intro:I,main:A};let c=14,check=null,bonusAt=-1,exitCol=-1,warpDone=!cfg.warpRoom,ups=0,styled=0;
 const S={A,r,lv,cfg,foe:(cc,row=13)=>themeFoe(A,cfg,r,cc,row)},sty=STYLE_PIECES[cfg.style||'cave']||STYLE_PIECES.cave;
 const foes=(c0,len)=>{for(let j=0,k=Math.round(r()*(1+lv*.3));j<k;j++)themeFoe(A,cfg,r,c0+2+Math.floor(r()*(len-4)));};
 const pending=()=>{
  if(bonusAt<0&&c>W*.3){A.ground(c,c+9);bonusAt=c+4;A.pipe(bonusAt,2,{to:{area:'bonus',x:2*T+8,y:2*T,how:'drop'}});A.fill(c+1,c+8,3,4,BRICK);themeFoe(A,cfg,r,c+8);c+=10;return true;}
  if(bonusAt>=0&&exitCol<0&&c>bonusAt+24){A.ground(c,c+7);exitCol=c+3;A.pipe(exitCol,2,{exitOf:'bonus'});c+=8;return true;}
  return false;};
 while(c<W-34){const roll=r();
  if(!check&&c>W*.45){A.ground(c,c+9);check={area:'main',x:(c+3)*T,y:13*T};c+=10;continue;}
  if(pending())continue;
  // 4-2: a pipe up on a brick shelf, only reachable from a hidden block (the coins on the shelf give it away)
  if(!warpDone&&c>W*.55){const L=16;A.ground(c,c+L-1);A.hidden(c+3,10,'coin');A.row(c+6,7,'BBBBBBBB');A.pipe(c+9,2,{to:{area:'warp',x:2*T+8,y:3*T,how:'drop'}},7);A.coinRun(c+6,c+8,6);A.coinRun(c+11,c+13,6);themeFoe(A,cfg,r,c+12);c+=L;warpDone=true;continue;}
  // the ice cave: ski ramps over its pits
  if(styled<3&&c>W*(.18+.18*styled)||r()<.35){c=PIECES[sty[styled%sty.length]](S,c);styled++;continue;}
  if(cfg.ice&&r()<.28){A.ground(c,c+11);A.ramps.push({c:c+9});const gap=3+Math.floor(r()*2);A.coinRun(c+12,c+11+gap,7);c+=12+gap;A.ground(c,c+5);c+=6;continue;}
  if(roll<.18){const len=9+Math.floor(r()*5);A.ground(c,c+len-1);foes(c,len);if(cfg.hang&&r()<.6)A.foe(cfg.hang,c+3+Math.floor(r()*(len-6)),4);
   const v=r();if(v<.4){A.row(c+2,9,'B?B?B',{[c+4]:r()<.2?'multi':'coin'});A.coinRun(c+2,c+6,8);}
   else if(v<.7){A.fill(c+2,c+len-3,3,5,BRICK);A.row(c+3,9,'?B?',{[c+3]:r()<.2?cfg.power:'coin'});A.coinRun(c+2,c+len-3,7);}
   else{A.row(c+2,8,'BBB');A.row(c+len-5,10,'BBB');if(ups<2){A.hidden(c+len-4,7,'1up');ups++;}}c+=len;}
  else if(roll<.34){const gap=2+Math.floor(r()*Math.min(3,lv/3));A.coinRun(c,c+gap-1,10);c+=gap;A.ground(c,c+4);c+=5;}
  else if(roll<.44){const len=12;A.ground(c,c+len-1);A.fill(c+2,c+len-3,3,7,BRICK);A.coinRun(c+2,c+len-3,11);themeFoe(A,cfg,r,c+6);c+=len;}
  else if(roll<.53){A.ground(c,c+13);for(const dx of [3,8])A.fill(c+dx,c+dx,3,4+Math.floor(r()*3),BRICK);A.fill(c+11,c+12,10,12,HARD);themeFoe(A,cfg,r,c+6);c+=14;}
  else if(roll<.61){const gap=5+Math.floor(r()*2);A.lift({x:(c+gap/2)*T,y:10*T,kind:'v',y0:6*T,y1:12*T,vy:-.6-.04*lv,w:lv>=7?32:48,look:cfg.lift});c+=gap;A.ground(c,c+5);c+=6;}
  // pipes with plants; the first good one before the middle leads down to a coin room
  else if(roll<.72){A.ground(c,c+13);[[2,2+Math.floor(r()*2)],[8,3+Math.floor(r()*2)]].forEach(([dx,h],k)=>{const enter=k===0&&bonusAt<0&&c>20&&c<W*.55;
    if(enter){A.pipe(c+dx,h,{to:{area:'bonus',x:2*T+8,y:2*T,how:'drop'}});bonusAt=c+dx;}else A.pipe(c+dx,h,{piranha:r()<.3+.07*lv});});themeFoe(A,cfg,r,c+6);c+=14;}
  // a long brick shelf with enemies on top and underneath
  else if(roll<.83){A.ground(c,c+15);A.row(c+3,9,'BBBBBBBBBB',{[c+7]:r()<.3?'multi':r()<.15?cfg.power:undefined});A.coinRun(c+3,c+12,8);themeFoe(A,cfg,r,c+6,9);themeFoe(A,cfg,r,c+9);if(r()<.5)themeFoe(A,cfg,r,c+13);c+=16;}
  // brick stairs up and down over a pit
  else{A.ground(c,c+5);for(let k=0;k<4;k++)A.fill(c+1+k,c+1+k,12-k,12,BRICK);c+=6;const gap=2+Math.floor(r()*Math.min(2,lv/4));c+=gap;A.ground(c,c+5);for(let k=0;k<4;k++)A.fill(c+k,c+k,9+k,12,BRICK);A.coinRun(c-gap,c-1,6);c+=6;}
 }
 while(pending()){}
 evenFoes(A,cfg,r,Math.round(3+1.9*lv),16,c);
 if(exitCol>=0)areas.bonus=coinRoom(cfg.kind,r,exitCol);else A.doors=A.doors.filter(d=>d.to?.area!=='bonus');
 if(cfg.warpRoom)areas.warp=warpRoom(cfg.kind,cfg.warpRoom);
 A.ground(c,W-1);A.sidePipe(W-12,12,1,3,{to:{area:'exit',pipe:2,how:'rise'}});A.fill(W-8,W-1,3,12,BRICK);roofRoom(A,W,undefined,cfg.warpRoom);
 const E=area(40,cfg.outKind);E.ground(0,39);E.pipe(2,2,{exitOf:'main'});E.stairs(8,8,1);E.col(16,8);flagAndCastle(E,25,29);props(E,cfg,18,39,r);areas.exit=E;
 return {name:`${wn}-${n}`,title:cfg.title,time:cfg.time||(wn>=7?350:400),areas,start:{area:'intro',x:40,y:13*T,auto:true},startPlay:{area:'main',x:2*T+8,y:3*T},check:check||{area:'main',x:60*T,y:13*T}};}

// a platform stage: towers/peaks with gaps, lifts over the wide ones, ? blocks and a hidden 1-up above the tops,
// and a beanstalk that grows up to a cloud area
function genAthletic(wn,n,cfg){const r=rng(wn*100+n*7+3),lv=lvOf(wn,n),W=210,A=area(W,cfg.kind);if(cfg.ice)A.ice=true;
 const areas={main:A},flats=[];A.ramps=[];A.building(0,12,9);let c=12,top=9,check=null,vineAt=-1,vineRow=0,ups=0;A.row(4,5,'?B?',{4:cfg.power,6:'power'});
 while(c<W-46){const gapMax=Math.min(6,3+Math.floor(lv/2)),gap=2+Math.floor(r()*(gapMax-1)),w=3+Math.floor(r()*5),nt=clamp(top+Math.floor(r()*7)-3,5,11),ny=nt-top<-3?top-3:nt;
  // the gap's lift: balance lifts or falling lifts in those styles, else a moving lift
  if(gap>=4){const lo=Math.min(top,ny),st=cfg.style;
   if(st==='balance'&&gap>=5&&r()<.7)A.balance(c+1.5,c+gap-.5,lo+1,4,Math.max(2,lo-4));
   else if((st==='balance'||st==='falls')&&r()<.65)for(let x=c+1;x<c+gap;x+=2)A.fallLift(x+.5,lo+1,32);
   else A.lift({x:(c+gap/2)*T,y:lo*T,kind:r()<.6?'h':'v',x0:(c+.5)*T,x1:(c+gap-.5)*T,y0:(lo-3)*T,y1:(Math.max(top,ny)+1)*T,vx:.6+.05*lv,vy:-.6-.05*lv,w:lv>=7?32:48,look:cfg.lift});}
  c+=gap;A.building(c,w,ny);top=ny;
  // Bill Blasters standing on the tops, Paratroopas bounding over them
  if(cfg.style==='bullet'&&w>=4&&r()<.55)A.cannon(c+w-1,1+Math.floor(r()*2),top);
  if((cfg.style==='bullet'||cfg.style==='falls')&&r()<.3)A.foe('para',c+1,top);if(cfg.ice&&w>=5&&r()<.7)A.ramps.push({c:c+w-2,r:top});if(w>=4&&r()<.6)themeFoe(A,cfg,r,c+Math.floor(w/2),top);if(r()<.5)A.coinRun(c,c+w-1,top-2);
  if(w>=4&&top>=8){if(vineAt<0&&c>40&&c<W*.5){A.brick(c+1,top-4,'vine');vineAt=c+1;vineRow=top-4;}else if(r()<.3)A.q(c+1,top-4,r()<.5?cfg.power:'coin');else if(ups<2&&r()<.2){A.hidden(c+2,top-4,'1up');ups++;}}
  if(r()<.35){const t2=cfg.foes.filter(t=>FLYERS.has(t));if(t2.length)A.foe(pick(r,t2),c,Math.max(3,top-4));}
  // a beanstalk lands you on a later top; remember the tops (as 'flats': column, width)
  if(w>=4)flats.push([c,w]);
  if(!check&&c>W*.45){check={area:'main',x:(c+1)*T,y:top*T};}c+=w;}
 if(vineAt>=0){const vr=vineRow,land=flats.find(([c0,len])=>c0>vineAt+30&&c0<c-4);
  secrets(A,areas,r,cfg,{exitCol:-2,vineAt,vineRow:vr,landCol:land?land[0]+1:-1});}
 // fish leaping up out of the drop all the way along
 if(cfg.style==='cheep'||cfg.fish)A.cheeps(14,c);
 A.ground(c+2,W-1);A.stairs(c+4,3,1);A.col(c+7,3);flagAndCastle(A,c+15,c+19);
 return {name:`${wn}-${n}`,title:cfg.title,time:cfg.time||300,areas,start:{area:'main',x:40,y:9*T},check:check||{area:'main',x:40,y:9*T}};}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// a castle, built from rooms in the order its style gives: fire-bar rooms over lava pits, mazes that loop you back
// if you take the wrong level (World 4-4 / 7-4 style), lava lakes with lifts and jumping lava bubbles, low corridors
// of fire bars; then Bowser's bridge, the axe (and Toad)
const CASTLE_PLANS={rooms:['room','room','room'],maze:['room','maze','room','maze'],lava:['lava','room','lava','lava'],gauntlet:['gaunt','lava','gaunt','room'],final:['maze','lava','gaunt','lava','maze']};
const CASTLE_LEN={room:25,maze:28,lava:22,gaunt:24};
function genCastle(wn,n,cfg){const r=rng(wn*100+n*7+4),d=wn,plan=CASTLE_PLANS[cfg.style]||CASTLE_PLANS.rooms;
 const W=19+plan.reduce((t,k)=>t+CASTLE_LEN[k],0)+12+13+34,A=area(W,cfg.kind);A.scenery=false;if(cfg.ice)A.ice=true;
 A.fill(0,W-1,2,2,CASTLE);A.fill(0,18,10,14,CASTLE);let c=19,qDone=false,check=null;
 const guards=(c0,len,row=10,m=1+Math.floor(r()*(d/3)))=>{for(let j=0;j<m;j++)themeFoe(A,cfg,r,c0+2+Math.floor(r()*(len-4)),row);};
 const liftW=d>=6?32:48,sp=.6+.04*d;
 const SEG={
  // a lava pit (a lift over a wide one, a lava bubble in it from World 4), then a floor with fire bars and guards
  room(){const pit=3+Math.floor(r()*Math.min(4,d/2));A.lava(c,c+pit-1);if(pit>=4)A.lift({x:(c+pit/2)*T,y:9*T,kind:r()<.5?'h':'v',x0:(c+.5)*T,x1:(c+pit-.5)*T,y0:5*T,y1:11*T,vx:sp,vy:-sp,w:32,look:cfg.lift});
   if(d>=4)A.podoboo(c+Math.floor(pit/2),4.6+.1*d);
   c+=pit;const len=25-pit;A.fill(c,c+len-1,10,14,CASTLE);
   const bars=1+Math.floor(r()*(1+d/3)),fbn=d>=6?7:6;for(let j=0;j<bars;j++){const fc=c+5+Math.floor((len-8)*(j+.5)/bars);if(r()<.5)A.firebar(fc,6,r()<.5?1:-1,fbn);else A.firebar(fc,9,1,d>=6?5:4);}
   if(!qDone){A.fill(c+4,c+len-5,3,3,CASTLE);A.q(c+1,7,'power');qDone=true;}
   guards(c,len);c+=len;},
  // the maze: stairs, then an upper and a lower corridor (both tall enough to jump in); only one of them goes on (a few coins at its start hint which), the other
  // loops you back to the start of the room
  maze(){const L=28;A.fill(c,c+1,10,14,CASTLE);A.fill(c+2,c+L-1,11,14,CASTLE);A.fill(c+4,c+L-1,6,6,CASTLE);A.fill(c+2,c+2,9,10,CASTLE);A.set(c+L-1,10,CASTLE);
   const up=r()<.5;A.loop(c+L-2,L-5,up?3:7,up?5:10);A.coinRun(c+5,c+9,up?4:9);A.coinRun(c+18,c+20,up?4:9);
   A.firebar(c+11,2,1,4);A.firebar(c+21,11,1,4);
   // a one-block lava gap in the lower corridor (the low ceiling keeps jumps short), a bubble in it
   A.fill(c+15,c+15,11,14,EMPTY);A.lava(c+15,c+15,12);A.podoboo(c+15,3.6);
   themeFoe(A,cfg,r,c+8,6);themeFoe(A,cfg,r,c+22,11);if(d>=6)themeFoe(A,cfg,r,c+24,6);c+=L;},
  // a lava lake: pillars to stand on, lifts between them, lava bubbles jumping all over
  lava(){const L=22;A.lava(c,c+L-1);A.fill(c+6,c+7,9,14,CASTLE);A.fill(c+14,c+15,8,14,CASTLE);
   A.lift({x:(c+3)*T,y:10*T,kind:'h',x0:(c+1.5)*T,x1:(c+4.5)*T,vx:sp,w:liftW,look:cfg.lift});
   A.lift({x:(c+11)*T,y:9*T,kind:'v',y0:6*T,y1:11*T,vy:-sp,w:liftW,look:cfg.lift});
   A.lift({x:(c+19)*T,y:10*T,kind:d>=5?'v':'h',x0:(c+17.5)*T,x1:(c+20.5)*T,y0:7*T,y1:11*T,vx:sp,vy:sp,w:liftW,look:cfg.lift});
   for(const dx of [3,10,18])A.podoboo(c+dx,4.8+.12*d);if(d>=5)A.firebar(c+14,7,r()<.5?1:-1,6);A.coinRun(c+9,c+12,5);c+=L;A.fill(c,c+1,10,14,CASTLE);},
  // a low corridor: fire bars hanging from the ceiling and turning in the floor, a lava gap with a bubble
  gaunt(){const L=24;A.fill(c,c+L-1,10,14,CASTLE);A.fill(c,c+L-1,3,4,CASTLE);
   A.firebar(c+5,4,1,4);A.firebar(c+10,10,1,4);A.firebar(c+15,4,-1,4);
   A.fill(c+18,c+20,10,14,EMPTY);A.lava(c+18,c+20,12);A.podoboo(c+19,4.2);
   guards(c,16,10,1+Math.floor(d/4));if(d>=7)A.firebar(c+22,10,1,3);c+=L;},
 };
 plan.forEach((k,i)=>{SEG[k]();if(!check&&i>=Math.floor(plan.length/2)-1)check={area:'main',x:(c-6)*T,y:10*T};});
 A.fill(c,c+11,8,14,CASTLE);A.fill(c,c+11,3,3,CASTLE);if(d>=6)A.foe('hammerBro',c+8,8);c+=12;const b0=c;
 A.fill(b0,b0+12,10,10,BRIDGE);A.lava(b0,b0+12);A.set(b0+12,9,CHAIN);A.fill(b0+13,W-1,10,14,CASTLE);A.fill(W-2,W-1,2,9,CASTLE);
 A.bridge={c0:b0,c1:b0+12,r:10};A.axe={x:(b0+13)*T+8,y:9*T+8};A.bowser={x:(b0+8)*T,y:10*T,home:(b0+8)*T,...cfg.bowser};
 if(cfg.finale)A.finale=true;else{A.toad={x:(b0+28)*T+8,y:10*T};A.toadLines=cfg.toad;}A.bowserFireFrom=(b0-32)*T;
 return {name:`${wn}-${n}`,title:cfg.title,time:plan.length>4?400:300,areas:{main:A},start:{area:'main',x:40,y:10*T},check:check||{area:'main',x:(19+25+5)*T,y:10*T}};}

const WORLDS={
 4:{title:'FROSTBITE PEAKS',power:'skis',lift:'chair',ice:true,roomKind:'icecave',stages:[
  ['over',{kind:'snow',style:'pipes',foes:['climber','climber','penguin','goomba'],props:['pine','pine','snowman'],special:'ramp'}],
  ['under',{kind:'icecave',style:'buzzy',outKind:'snow',foes:['penguin','climber'],hang:'icicle',props:['pine'],warpRoom:[5,6,7]}],
  ['ath',{kind:'skilift',style:'balance',foes:['climber','penguin'],fish:true}],
  ['castle',{kind:'icepalace',style:'maze',foes:['penguin','climber'],bowser:{ski:true},toad:['BUT OUR PRINCESS WENT','SKIING AT ANOTHER RESORT!']}]]},
 5:{title:'LOST WAGES',power:'cape',extra:['cape','power','star'],roomKind:'under',stages:[
  ['over',{kind:'strip',style:'classic',foes:['dice','chip','card'],props:['neon'],special:'high',rider:true}],
  ['over',{kind:'desert',style:'fortress',foes:['cactus','dice','card','chip'],props:['cactusd','skull'],wind:true,special:'high'}],
  ['ath',{kind:'slots',style:'bullet',foes:['dice','chip','card']}],
  ['castle',{kind:'casino',style:'lava',foes:['dice','chip'],bowser:{elvis:true},toad:['BUT OUR PRINCESS HAS','LEFT THE BUILDING!']}]]},
 6:{title:'JURASSIC JUNGLE',power:'mega',extra:['mega','power'],roomKind:'dig',stages:[
  ['over',{kind:'jungle',style:'bridge',foes:['raptor','raptor','dilo','ptero','goomba'],props:['fern','fern','fence'],special:'wall'}],
  ['under',{kind:'dig',style:'lifts',outKind:'jungle',foes:['raptor','dilo'],props:['fern']}],
  ['ath',{kind:'ruins',style:'falls',foes:['raptor','ptero','dilo']}],
  ['castle',{kind:'volcano',style:'gauntlet',foes:['raptor','trex','dilo'],bowser:{safari:true},toad:['BUT OUR PRINCESS IS IN','ANOTHER PARK!']}]]},
 7:{title:'HELL',power:'yoshi',extra:['power','star','yoshi'],roomKind:'hellcave',stages:[
  ['over',{kind:'hell',style:'hammer',foes:['imp','imp','brute','skull','floater'],props:['skull','firepot'],special:'wall'}],
  ['under',{kind:'hellcave',style:'pipemaze',outKind:'hell',foes:['imp','brute','skull']}],
  ['ath',{kind:'bones',style:'cheep',foes:['imp','skull','floater']}],
  ['castle',{kind:'fortress',style:'maze',foes:['brute','imp','floater'],bowser:{devil:true},toad:['BUT OUR PRINCESS IS IN','ANOTHER CIRCLE OF HELL!']}]]},
 8:{title:'HEAVEN',power:'star',extra:['skis','cape','mega','yoshi','power','star'],roomKind:'sky',stages:[
  ['over',{kind:'heaven',style:'fortress',foes:['angel','cherub','koopaRed','brute'],props:['harp'],special:'high'}],
  ['ath',{kind:'gates',style:'bullet',foes:['angel','cherub','koopaRed']}],
  ['over',{kind:'heaven',style:'bridge',foes:['angel','cherub','skull','brute','koopaRed'],props:['harp'],special:'high'}],
  ['castle',{kind:'throne',style:'final',foes:['angel','cherub','brute'],bowser:{god:true},finale:true}]]},
};
const GEN={over:genOver,under:genUnder,ath:genAthletic,castle:genCastle};
const worldStages=wn=>WORLDS[wn].stages.map(([type,cfg],k)=>()=>{const W=WORLDS[wn];const pw=wn===8?['cape','mega','skis','yoshi'][k]:W.power;
 return GEN[type](wn,k+1,{lift:W.lift,ice:W.ice,extra:W.extra,roomKind:W.roomKind,...cfg,power:pw,title:W.title,wn});});

const STAGES=[w11,w12,w13,w14,w21,w22,w23,w24,w31,w32,w33,w34,...[4,5,6,7,8].flatMap(worldStages)];
const buildStage=i=>STAGES[i]();
Object.assign(exports,{T,ROWS,TILE,SOLID,BACK,buildStage,STAGE_COUNT:STAGES.length});
