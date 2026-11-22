// STRANDS & LADDERS: our Chutes and Ladders dressed as a Death Stranding board game (a parody theme: the rules are
// the classic 1943 board, only the pictures and words are Death Stranding). Shared by the game (src/engines/strandsLadders.js)
// and the GPT template tool (tools/strands-templates.mjs); brief docs/art-for-gpt/STRANDS-ART.md.
// Every picture is optional: assets/strands/<slot>.webp|png -> USER_PORTRAITS['strands:<slot>'] (tools/build.mjs); a missing
// picture is drawn by the game instead.

// ---- the board: the classic 10x10 board (1 bottom-left, rows snake up, 100 top-left)
const LADDERS={1:38,4:14,9:31,21:42,28:84,36:44,51:67,71:91,80:100};
const CHUTES={16:6,47:26,49:11,56:53,62:19,64:60,87:24,93:73,95:75,98:78};
// what happens (the good deed at a ladder's foot, the slip at a chute's top) and where it takes you
const STORIES={
 1:['Rebuilt the river bridge','Porters left you 1,000 Likes'],
 4:['Left your ladder for a stranger','Climbed the ridge with it'],
 9:['Delivered the pizza flat','Promoted to Great Deliverer'],
 21:['Fixed a zip-line pylon','Zipped across the valley'],
 28:['Sang BB a lullaby','BB spotted every BT for you'],
 36:['Charged a stranger’s trike','Hitched a ride uphill'],
 51:['Built a timefall shelter','Rode out the storm'],
 71:['Paved the national highway','Cruised all the way up'],
 80:['Connected the last Knot','Made it to Edge Knot City'],
 16:['Breathed near a BT','Dragged into the tar'],
 47:['Stacked cargo to the sky','Tumbled down the slope'],
 49:['Walked out in the timefall','Cargo rotted, back to base'],
 56:['Tripped on a rock','Stumbled a few steps'],
 62:['Wandered into MULE camp','MULEs took the lot'],
 64:['Napped in the open','BB had a meltdown'],
 87:['Shouted at a Catcher','VOIDOUT!'],
 93:['Waded the deep river','Swept downstream'],
 95:['Skipped your drink break','Ran out of stamina'],
 98:['Listened to Higgs','Knocked off the mountain']};
// ---- the board picture: 2048 square, the 10x10 squares inside a printed frame
const BOARD={S:2048,G0:104,GS:1840};          // squares from G0 to G0+GS (184 px each)
const SQ=BOARD.GS/10;
function squareRC(n){const r=Math.floor((n-1)/10),c0=(n-1)%10,c=r%2?9-c0:c0;return {row:9-r,col:c};}
function squareXY(n,k=1){const {row,col}=squareRC(n);return {x:(BOARD.G0+(col+.5)*SQ)*k,y:(BOARD.G0+(row+.5)*SQ)*k};}
// a chute's curve (board px): cubic from the top square to the bottom one, bowed to one side
function chutePath(a,b){const p=squareXY(a),q=squareXY(b),dx=q.x-p.x,dy=q.y-p.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,side=(a%2?1:-1)*Math.min(SQ*1.3,L*.28);
 return [p,{x:p.x+dx*.3+nx*side,y:p.y+dy*.3+ny*side},{x:p.x+dx*.7-nx*side*.8,y:p.y+dy*.7-ny*side*.8},q];}
const bez=(P,t)=>{const u=1-t;return {x:u*u*u*P[0].x+3*u*u*t*P[1].x+3*u*t*t*P[2].x+t*t*t*P[3].x,y:u*u*u*P[0].y+3*u*u*t*P[1].y+3*u*t*t*P[2].y+t*t*t*P[3].y};};

// ---- picture slots (size in px; GPT paints to these sizes exactly)
const SLOTS={
 board:{w:2048,h:2048,what:'the printed game board: frame + 100 squares, no numbers, no ladders, no chutes'},
 table:{w:1080,h:1920,what:'tall phone backdrop: the table the board sits on'},
 'table-wide':{w:1920,h:1080,what:'wide backdrop: the table the board sits on'},
 'ladder-tile':{w:256,h:256,what:'one section of a ladder, repeats upward (rails at x 64 and 192, one rung)'},
 'tar-tile':{w:256,h:256,what:'seamless black tar texture for the chutes'},
 'spinner-face':{w:1024,h:1024,what:'the spinner dial: 6 equal sectors numbered 1-6 clockwise, 1 at the top'},
 'spinner-arrow':{w:1024,h:1024,what:'the spinner arrow, pointing straight up, pivot at the centre, transparent'},
 'pawn-p1':{w:256,h:384,what:'player 1 standee body (no head), head circle at (128,96) 132 px'},
 'pawn-p2':{w:256,h:384,what:'player 2 standee body (no head), head circle at (128,96) 132 px'},
 logo:{w:1600,h:700,what:'title logo STRANDS & LADDERS, transparent'},
 card:{w:1024,h:720,what:'event card frame: picture window (64,64)-(448,448) round, text area right'}};
for(const n of Object.keys(LADDERS))SLOTS['deed-'+n]={w:512,h:512,what:'ladder '+n+'->'+LADDERS[n]+': '+STORIES[n].join(' -> ')};
for(const n of Object.keys(CHUTES))SLOTS['slip-'+n]={w:512,h:512,what:'chute '+n+'->'+CHUTES[n]+': '+STORIES[n].join(' -> ')};
const PAWN_HEAD={x:128,y:96,d:132},ARROW_PIVOT={x:512,y:512},CARD_PIC={x:64,y:64,d:384};

// ---- pictures at runtime
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const imgs=new Map();
function picture(name){const url=USER['strands:'+name];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.decoding='async';e.img.onload=()=>{e.ok=true;};e.img.src=url;imgs.set(name,e);}return e.ok?e.img:null;}
const hasPicture=name=>!!USER['strands:'+name];
function preload(){for(const n of Object.keys(SLOTS))if(hasPicture(n))picture(n);}
Object.assign(exports,{LADDERS,CHUTES,STORIES,BOARD,SQ,squareRC,squareXY,chutePath,bez,SLOTS,PAWN_HEAD,ARROW_PIVOT,CARD_PIC,picture,hasPicture,preload});
