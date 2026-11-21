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
 A.lava(41,44);A.fill(45,58,10,14,CASTLE);A.fill(45,58,3,4,CASTLE);A.q(50,6,'power');A.firebar(55,9,1);
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
 const A=area(220,'city');
 A.ground(0,40);A.ground(43,90);A.ground(94,140);A.ground(148,219);
 A.q(14,9);A.row(18,9,'B?B?B',{19:'power'});A.q(20,5);
 A.pipe(26,2);A.pipe(36,3,{piranha:true});
 // construction site: steel girders, a work elevator and coins in the air
 A.row(46,9,'HHHH');A.coinRun(46,49,8);A.row(51,6,'HHHH');A.coinRun(51,54,5);
 A.lift({x:58*T,y:10*T,kind:'v',y0:5*T,y1:11*T,vy:-.6,w:48});
 A.brick(62,9,'star');A.row(64,5,'BBBB?BBB',{68:'power'});
 A.pipe(72,4);A.hidden(80,8,'1up');
 A.stairs(86,4,1);
 A.row(100,9,'B?B');A.brick(104,9,'multi');
 A.fill(108,111,9,9,HARD);A.fill(112,115,6,6,HARD);A.coinRun(112,115,5);
 A.pipe(120,3,{piranha:true});A.pipe(128,4,{piranha:true});
 // the cab ride over the roadworks
 A.lift({x:139*T,y:11*T+8,kind:'h',x0:139*T,x1:148*T,vx:.7,w:48,look:'taxi'});A.coinRun(142,145,8);
 A.row(156,9,'?B?',{156:'power'});A.row(164,5,'BBBB');A.coinRun(164,167,4);
 A.stairs(172,4,1);A.stairs(181,8,1);A.col(189,8);
 flagAndCastle(A,198,202);
 for(const c of [22,40,60,61.5,97,98.5,124,125.5,150,151.5,165,166.5])A.foe('goomba',c);
 A.foe('goomba',109,9);A.foe('koopa',113,6);A.foe('koopa',135);A.foe('koopa',170);
 cityScenery(A);
 return {name:'2-1',title:DORK,time:400,areas:{main:A},start:{area:'main',x:40,y:13*T},check:{area:'main',x:96*T+8,y:13*T}};
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
 A.lava(41,46);A.lift({x:43.5*T,y:9*T,kind:'v',y0:5*T,y1:11*T,vy:-.6,w:48,look:'elevator'});
 A.fill(47,70,10,14,CASTLE);A.fill(52,64,3,5,CASTLE);A.q(58,7,'power');A.firebar(67,9,1);
 A.lava(71,75);A.lift({x:73*T,y:9*T,kind:'h',x0:71*T+8,x1:75*T+8,vx:.6,w:32,look:'elevator'});
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
 A.ground(0,45);A.ground(49,95);A.ground(100,150);A.ground(156,209);
 A.q(15,9);A.row(20,9,'B?B?B',{21:'power'});A.q(22,5);
 A.pipe(30,2);A.pipe(40,3,{piranha:true});
 A.coinRun(46,48,8);
 A.row(64,9,'BBBB');A.row(68,5,'B?BB',{69:'power'});A.coinRun(64,67,8);A.hidden(78,8,'1up');
 A.stairs(91,4,1);A.coinRun(96,99,6);
 A.q(106,9,'coin');A.brick(108,9,'star');A.q(110,9,'coin');A.row(105,5,'BBBBBB');A.coinRun(105,110,4);
 A.pipe(124,3,{piranha:true});A.pipe(134,2);
 A.lift({x:153*T,y:11*T,kind:'h',x0:151*T,x1:155*T,vx:.6,w:48,look:'raft'});
 A.row(164,9,'?B?',{166:'power'});A.stairs(178,8,1);A.col(186,8);
 flagAndCastle(A,195,199);
 for(const c of [24,38,52,53.5,82,83.5,114,115.5,140,160,161.5])A.foe('goomba',c);
 A.foe('koopa',72);A.foe('koopa',128);A.foe('paraRed',97,8,{y0:5*T,y1:11*T});
 for(const [c,r] of [[60,8],[88,6],[118,7],[170,7]])A.foe('ghost',c,r);
 A.foe('slasher',74);A.foe('dreamer',132);A.foe('imp',146);A.foe('imp',168);
 pierScenery(A);
 return {name:'3-1',title:BOARD,time:400,areas:{main:A},start:{area:'main',x:40,y:13*T},check:{area:'main',x:102*T,y:13*T}};
}

// ------------------------------------------------------------------ 3-2 the funhouse (mirror maze: left and right swap)
function w32(){
 const I=area(16,'pier');I.ground(0,15);I.sidePipe(10,12,1,4,{cap:true,to:{area:'main',x:2*T+8,y:3*T,how:'drop'}});
 I.decor.push({type:'funsign',x:3*T});
 const A=area(180,'funhouse');
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
 A.sidePipe(168,12,1,3,{to:{area:'exit',pipe:2,how:'rise'}});A.fill(172,179,3,12,BRICK);
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
 A.lava(41,46);A.lift({x:43.5*T,y:9*T,kind:'v',y0:5*T,y1:11*T,vy:-.6,w:32,look:'trapeze'});
 A.fill(47,66,10,14,CASTLE);A.fill(50,62,3,5,CASTLE);A.q(56,7,'power');A.firebar(64,9,1);
 A.lava(67,72);A.lift({x:69.5*T,y:9*T,kind:'h',x0:67.5*T,x1:71.5*T,vx:.6,w:32,look:'trapeze'});
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

// an outdoor stage: flats, pits, pipes, stairs, block clusters, lift gaps and the world's own pieces (ramps, walls, cacti)
function genOver(wn,n,cfg){const r=rng(wn*100+n*7+1),W=240,d=wn,A=area(W,cfg.kind);if(cfg.ice)A.ice=true;if(cfg.wind)A.wind=true;A.ramps=[];
 A.ground(0,15);A.row(10,9,'?B?',{10:cfg.power,12:'power'});A.q(12,5,'coin');let c=16,check=null;
 const flat=len=>{A.ground(c,c+len-1);const k=Math.round(r()*(1+d*.28));for(let j=0;j<k;j++)themeFoe(A,cfg,r,c+2+Math.floor(r()*(len-4)));
  if(r()<.45){const pat=pick(r,['B?B','?B?B','BB?BB','???']);A.row(c+2,9,pat,{[c+2+Math.floor(pat.length/2)]:r()<.25?pick(r,cfg.extra||['power']):'coin'});if(r()<.5){A.row(c+3,5,'B?B');A.coinRun(c+3,c+5,4);}}
  props(A,cfg,c,c+len,r);c+=len;};
 while(c<W-62){const roll=r();
  if(!check&&c>W*.45){flat(10);check={area:'main',x:(c-8)*T,y:13*T};continue;}
  if(roll<.24)flat(8+Math.floor(r()*6));
  else if(roll<.42){const gap=2+Math.floor(r()*Math.min(4,1+d/3));A.coinRun(c,c+gap-1,9);if(gap>=5)A.lift({x:(c+gap/2)*T,y:11*T,kind:'h',x0:(c+1)*T,x1:(c+gap-1)*T,vx:.6+.04*d,w:48,look:cfg.lift});c+=gap;flat(4+Math.floor(r()*3));}
  else if(roll<.54){A.ground(c,c+13);for(const [dx,h] of [[2,2+Math.floor(r()*3)],[8,2+Math.floor(r()*3)]])A.pipe(c+dx,h,{piranha:r()<.25+.08*d});themeFoe(A,cfg,r,c+6);c+=14;}
  else if(roll<.64){A.ground(c,c+5);A.stairs(c+1,4,1);c+=6;const gap=2+Math.floor(r()*2);c+=gap;A.ground(c,c+5);A.stairs(c,4,-1);c+=6;flat(6);}
  else if(roll<.76){A.ground(c,c+13);A.row(c+2,9,'BB?BB?BB',{[c+4]:'coin',[c+7]:r()<.3?cfg.power:'coin'});themeFoe(A,cfg,r,c+5,9);themeFoe(A,cfg,r,c+10);A.row(c+5,5,'?B?');c+=14;}
  else if(roll<.86){const gap=6+Math.floor(r()*3);A.lift({x:(c+gap/2)*T,y:10*T,kind:r()<.5?'h':'v',x0:(c+1)*T,x1:(c+gap-1)*T,y0:6*T,y1:12*T,vx:.6+.04*d,vy:-.6-.04*d,w:48,look:cfg.lift});A.coinRun(c+1,c+gap-2,7);c+=gap;flat(5);}
  else{ // the world's own piece
   if(cfg.special==='ramp'){A.ground(c,c+13);A.ramps.push({c:c+11});A.coinRun(c+14,c+17,6);c+=14;c+=3;flat(6);}
   else if(cfg.special==='wall'){A.ground(c,c+13);A.col(c+3,2);A.fill(c+5,c+8,9,12,BRICK);A.fill(c+5,c+8,5,5,BRICK);A.coinRun(c+5,c+8,4);themeFoe(A,cfg,r,c+11);c+=14;}
   else if(cfg.special==='high'){A.ground(c,c+13);A.coinRun(c+2,c+11,3);A.row(c+4,6,'HHH');themeFoe(A,cfg,r,c+8);c+=14;}
   else flat(10);}
 }
 A.ground(c,W-1);A.stairs(c+2,8,1);A.col(c+10,8);flagAndCastle(A,c+19,c+23);props(A,cfg,c+24,W,r);
 return {name:`${wn}-${n}`,title:cfg.title,time:cfg.time||(wn>=7?350:400),areas:{main:A},start:{area:'main',x:40,y:13*T},check:check||{area:'main',x:(W/2|0)*T,y:13*T}};}

// an underground stage: street/scene intro, the cave, then out through a pipe to the flagpole
function genUnder(wn,n,cfg){const r=rng(wn*100+n*7+2),W=200,d=wn;
 const I=area(16,cfg.outKind);I.ground(0,15);I.sidePipe(10,12,1,4,{cap:true,to:{area:'main',x:2*T+8,y:3*T,how:'drop'}});
 const A=area(W,cfg.kind);if(cfg.ice)A.ice=true;A.ground(0,13);A.fill(0,W-1,2,2,BRICK);A.fill(0,0,3,12,BRICK);A.row(8,9,'?B?',{8:cfg.power,10:'power'});let c=14,check=null;
 while(c<W-34){const roll=r();
  if(!check&&c>W*.45){A.ground(c,c+9);check={area:'main',x:(c+3)*T,y:13*T};c+=10;continue;}
  if(roll<.3){const len=9+Math.floor(r()*5);A.ground(c,c+len-1);for(let j=0,k=Math.round(r()*(1+d*.3));j<k;j++)themeFoe(A,cfg,r,c+2+Math.floor(r()*(len-4)));if(cfg.hang&&r()<.6)A.foe(cfg.hang,c+3+Math.floor(r()*(len-6)),4);if(r()<.5){A.row(c+2,9,'B?B?B');A.coinRun(c+2,c+6,8);}c+=len;}
  else if(roll<.5){const gap=2+Math.floor(r()*Math.min(3,d/3));A.coinRun(c,c+gap-1,10);c+=gap;A.ground(c,c+4);c+=5;}
  else if(roll<.65){const len=12;A.ground(c,c+len-1);A.fill(c+2,c+len-3,3,7,BRICK);A.coinRun(c+2,c+len-3,11);themeFoe(A,cfg,r,c+6);c+=len;}
  else if(roll<.8){A.ground(c,c+13);for(const dx of [3,8])A.fill(c+dx,c+dx,3,4+Math.floor(r()*3),BRICK);A.fill(c+11,c+12,10,12,HARD);themeFoe(A,cfg,r,c+6);c+=14;}
  else{const gap=5+Math.floor(r()*2);A.lift({x:(c+gap/2)*T,y:10*T,kind:'v',y0:6*T,y1:12*T,vy:-.6-.04*d,w:48,look:cfg.lift});c+=gap;A.ground(c,c+5);c+=6;}
 }
 A.ground(c,W-1);A.sidePipe(W-12,12,1,3,{to:{area:'exit',pipe:2,how:'rise'}});A.fill(W-8,W-1,3,12,BRICK);
 const E=area(40,cfg.outKind);E.ground(0,39);E.pipe(2,2,{exitOf:'main'});E.stairs(8,8,1);E.col(16,8);flagAndCastle(E,25,29);props(E,cfg,18,39,r);
 return {name:`${wn}-${n}`,title:cfg.title,time:cfg.time||(wn>=7?350:400),areas:{intro:I,main:A,exit:E},start:{area:'intro',x:40,y:13*T,auto:true},startPlay:{area:'main',x:2*T+8,y:3*T},check:check||{area:'main',x:60*T,y:13*T}};}

// a platform stage: towers/peaks with gaps, lifts over the wide ones
function genAthletic(wn,n,cfg){const r=rng(wn*100+n*7+3),W=200,d=wn,A=area(W,cfg.kind);if(cfg.ice)A.ice=true;
 A.building(0,12,9);let c=12,top=9,check=null;A.row(4,5,'?B?',{4:cfg.power,6:'power'});
 while(c<W-46){const gapMax=Math.min(6,3+Math.floor(d/2)),gap=2+Math.floor(r()*(gapMax-1)),w=3+Math.floor(r()*5),nt=clamp(top+Math.floor(r()*7)-3,5,11),ny=nt-top<-3?top-3:nt;
  if(gap>=4)A.lift({x:(c+gap/2)*T,y:Math.min(top,ny)*T,kind:r()<.6?'h':'v',x0:(c+.5)*T,x1:(c+gap-.5)*T,y0:(Math.min(top,ny)-3)*T,y1:(Math.max(top,ny)+1)*T,vx:.6+.05*d,vy:-.6-.05*d,w:48,look:cfg.lift});
  c+=gap;A.building(c,w,ny);top=ny;if(w>=4&&r()<.6)themeFoe(A,cfg,r,c+Math.floor(w/2),top);if(r()<.5)A.coinRun(c,c+w-1,top-2);if(r()<.18&&top>5)A.q(c+1,top-4,r()<.5?cfg.power:'coin');
  if(r()<.35){const t2=cfg.foes.filter(t=>FLYERS.has(t));if(t2.length)A.foe(pick(r,t2),c,Math.max(3,top-4));}
  if(!check&&c>W*.45){check={area:'main',x:(c+1)*T,y:top*T};}c+=w;}
 A.ground(c+2,W-1);A.stairs(c+4,3,1);A.col(c+7,3);flagAndCastle(A,c+15,c+19);
 return {name:`${wn}-${n}`,title:cfg.title,time:cfg.time||300,areas:{main:A},start:{area:'main',x:40,y:9*T},check:check||{area:'main',x:40,y:9*T}};}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// a castle: rooms of fire bars over pits, lifts, the world's guards, then Bowser's bridge, the axe (and Toad)
function genCastle(wn,n,cfg){const r=rng(wn*100+n*7+4),d=wn,rooms=3+(d>=7?1:0);let c=19;const W=19+rooms*25+12+13+34,A=area(W,cfg.kind);A.scenery=false;if(cfg.ice)A.ice=true;
 A.fill(0,W-1,2,2,CASTLE);A.fill(0,18,10,14,CASTLE);let qDone=false;
 for(let k=0;k<rooms;k++){const pit=3+Math.floor(r()*Math.min(4,d/2));A.lava(c,c+pit-1);if(pit>=4)A.lift({x:(c+pit/2)*T,y:9*T,kind:r()<.5?'h':'v',x0:(c+.5)*T,x1:(c+pit-.5)*T,y0:5*T,y1:11*T,vx:.6+.04*d,vy:-.6-.04*d,w:32,look:cfg.lift});
  c+=pit;const len=25-pit;A.fill(c,c+len-1,10,14,CASTLE);
  const bars=1+Math.floor(r()*(1+d/3)),fbn=d>=6?8:6;for(let j=0;j<bars;j++){const fc=c+5+Math.floor((len-8)*(j+.5)/bars);A.firebar(fc,r()<.5?6:9,r()<.5?1:-1,fbn);}
  if(!qDone){A.fill(c+4,c+len-5,3,5,CASTLE);A.q(c+1,7,'power');qDone=true;}
  for(let j=0,m=1+Math.floor(r()*(d/3));j<m;j++)themeFoe(A,cfg,r,c+2+Math.floor(r()*(len-4)),10);c+=len;}
 A.fill(c,c+11,8,14,CASTLE);A.fill(c,c+11,3,3,CASTLE);c+=12;const b0=c;
 A.fill(b0,b0+12,10,10,BRIDGE);A.lava(b0,b0+12);A.set(b0+12,9,CHAIN);A.fill(b0+13,W-1,10,14,CASTLE);A.fill(W-2,W-1,2,9,CASTLE);
 A.bridge={c0:b0,c1:b0+12,r:10};A.axe={x:(b0+13)*T+8,y:9*T+8};A.bowser={x:(b0+8)*T,y:10*T,home:(b0+8)*T,...cfg.bowser};
 if(cfg.finale)A.finale=true;else{A.toad={x:(b0+28)*T+8,y:10*T};A.toadLines=cfg.toad;}A.bowserFireFrom=(b0-32)*T;
 return {name:`${wn}-${n}`,title:cfg.title,time:300,areas:{main:A},start:{area:'main',x:40,y:10*T},check:{area:'main',x:(19+25+5)*T,y:10*T}};}

const WORLDS={
 4:{title:'FROSTBITE PEAKS',power:'skis',lift:'chair',ice:true,stages:[
  ['over',{kind:'snow',foes:['climber','climber','penguin','goomba'],props:['pine','pine','snowman'],special:'ramp'}],
  ['under',{kind:'icecave',outKind:'snow',foes:['penguin','climber'],hang:'icicle',props:['pine']}],
  ['ath',{kind:'skilift',foes:['climber','penguin']}],
  ['castle',{kind:'icepalace',foes:['penguin','climber'],bowser:{ski:true},toad:['BUT OUR PRINCESS WENT','SKIING AT ANOTHER RESORT!']}]]},
 5:{title:'LOST WAGES',power:'cape',extra:['cape','power','star'],stages:[
  ['over',{kind:'strip',foes:['dice','chip','chip','card'],props:['neon'],special:'high'}],
  ['over',{kind:'desert',foes:['cactus','dice','card','chip'],props:['cactusd','skull'],wind:true,special:'high'}],
  ['ath',{kind:'slots',foes:['dice','chip','card']}],
  ['castle',{kind:'casino',foes:['dice','chip'],bowser:{elvis:true},toad:['BUT OUR PRINCESS HAS','LEFT THE BUILDING!']}]]},
 6:{title:'JURASSIC JUNGLE',power:'mega',extra:['mega','power'],stages:[
  ['over',{kind:'jungle',foes:['raptor','raptor','dilo','ptero','goomba'],props:['fern','fern','fence'],special:'wall'}],
  ['under',{kind:'dig',outKind:'jungle',foes:['raptor','dilo'],props:['fern']}],
  ['ath',{kind:'ruins',foes:['raptor','ptero','dilo']}],
  ['castle',{kind:'volcano',foes:['raptor','trex','dilo'],bowser:{safari:true},toad:['BUT OUR PRINCESS IS IN','ANOTHER PARK!']}]]},
 7:{title:'HELL',power:'yoshi',extra:['power','star','yoshi'],stages:[
  ['over',{kind:'hell',foes:['imp','imp','brute','skull','floater'],props:['skull','firepot'],special:'wall'}],
  ['under',{kind:'hellcave',outKind:'hell',foes:['imp','brute','skull']}],
  ['ath',{kind:'bones',foes:['imp','skull','floater']}],
  ['castle',{kind:'fortress',foes:['brute','imp','floater'],bowser:{devil:true},toad:['BUT OUR PRINCESS IS IN','ANOTHER CIRCLE OF HELL!']}]]},
 8:{title:'HEAVEN',power:'star',extra:['skis','cape','mega','yoshi','power','star'],stages:[
  ['over',{kind:'heaven',foes:['angel','cherub','koopaRed','brute'],props:['harp'],special:'high'}],
  ['ath',{kind:'gates',foes:['angel','cherub','koopaRed']}],
  ['over',{kind:'heaven',foes:['angel','cherub','skull','brute','koopaRed'],props:['harp'],special:'high'}],
  ['castle',{kind:'throne',foes:['angel','cherub','brute'],bowser:{god:true},finale:true}]]},
};
const GEN={over:genOver,under:genUnder,ath:genAthletic,castle:genCastle};
const worldStages=wn=>WORLDS[wn].stages.map(([type,cfg],k)=>()=>{const W=WORLDS[wn];const pw=wn===8?['cape','mega','skis','yoshi'][k]:W.power;
 return GEN[type](wn,k+1,{lift:W.lift,ice:W.ice,extra:W.extra,...cfg,power:pw,title:W.title});});

const STAGES=[w11,w12,w13,w14,w21,w22,w23,w24,w31,w32,w33,w34,...[4,5,6,7,8].flatMap(worldStages)];
const buildStage=i=>STAGES[i]();
Object.assign(exports,{T,ROWS,TILE,SOLID,BACK,buildStage,STAGE_COUNT:STAGES.length});
