// Super Mario Bros. (NES) art: the 8x8 HUD font, 16x16 tile sets for the four World 1 looks (overworld, underground,
// treetops, castle), the title logo, and the sprite drawers (enemies, items, Bowser, Toad, lifts, fire). Everything is
// drawn in NES pixels with plain fills so it stays crisp at any scale. Colours come from the NES palette.
const {GLYPHS}=require("src/pkmn/gbFont.js");
const {T,TILE}=require("src/engines/smb/smbLevels.js");

const C={sky:'#5c94fc',brick:'#c84c0c',light:'#fcbcb0',q:'#fc9838',brown:'#883000',olive:'#ac7c00',green:'#00a800',lime:'#b8f818',
 bush:'#80d010',white:'#fcfcfc',cloud:'#3cbcfc',skin:'#fca044',red:'#d82800',gold:'#f8b800',gray:'#bcbcbc',dgray:'#7c7c7c',
 teal:'#008888',tealLight:'#9cfcf0',lava:'#e45c10',lavaTop:'#fca044',black:'#000'};

// ------------------------------------------------------------------ font: Super Mario Bros. digits and symbols, capitals from the bold 8x8 set
const EXTRA=`
0
..###...
.#..##..
##...##.
##...##.
##...##.
.##..#..
..###...

1
...##...
..###...
...##...
...##...
...##...
...##...
.######.

2
.#####..
##...##.
....###.
..####..
.####...
###.....
#######.

3
.######.
....##..
...##...
..####..
.....##.
##...##.
.#####..

4
...###..
..####..
.##.##..
##..##..
#######.
....##..
....##..

5
######..
##......
######..
.....##.
.....##.
##...##.
.#####..

6
..####..
.##.....
##......
######..
##...##.
##...##.
.#####..

7
#######.
##...##.
....##..
...##...
..##....
..##....
..##....

8
.####...
##...#..
###..#..
.####...
#..####.
#....##.
.#####..

9
.#####..
##...##.
##...##.
.######.
.....##.
....##..
.####...

©
..####..
.#....#.
#..##..#
#.#....#
#.#....#
#..##..#
.#....#.
..####..

×
........
.##..##.
..####..
...##...
..####..
.##..##.
........

-
........
........
........
.######.
........
........
........
`;
const FONT=new Map();for(const [k,b] of GLYPHS)if(!/[a-z]/.test(k))FONT.set(k,b);
for(const block of EXTRA.trim().split(/\n\s*\n/)){const lines=block.split('\n'),bits=new Uint8Array(64);lines.slice(1,9).forEach((row,y)=>{for(let x=0;x<8;x++)if(row[x]==='#')bits[y*8+x]=1;});FONT.set(lines[0],bits);}
const ORDER=[...FONT.keys()],INDEX=new Map(ORDER.map((k,i)=>[k,i])),atlases=new Map();
function atlas(color){if(atlases.has(color))return atlases.get(color);const c=document.createElement('canvas');c.width=ORDER.length*8;c.height=8;const x=c.getContext('2d');x.fillStyle=color;
 ORDER.forEach((k,i)=>{const b=FONT.get(k);for(let p=0;p<64;p++)if(b[p])x.fillRect(i*8+(p&7),p>>3,1,1);});atlases.set(color,c);return c;}
const fontText=str=>String(str??'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[‘’`]/g,"'").replace(/[–—]/g,'-').replace(/[^ A-Z0-9!?.,'\-:;/()+=%&"#*×©\n]/g,'');
// draws NES text with its top-left at (x,y); sx/sy stretch the glyphs (the title logo uses big letters)
function nesText(g,str,x,y,color='#fcfcfc',sx=1,sy=sx){const a=atlas(color);let cx=x,cy=y;for(const ch of fontText(str)){if(ch==='\n'){cx=x;cy+=10*sy;continue;}const i=INDEX.get(ch);if(i!==undefined)g.drawImage(a,i*8,0,8,8,cx,cy,8*sx,8*sy);cx+=8*sx;}}
const textW=str=>fontText(str).length*8;

// ------------------------------------------------------------------ tiles
function mk(fn){const cv=document.createElement('canvas');cv.width=cv.height=T;const q=cv.getContext('2d');fn((col,X,Y,W=1,H=1)=>{q.fillStyle=col;q.fillRect(X,Y,W,H);});return cv;}
const groundTile=(base,light)=>mk(px=>{px(base,0,0,16,16);px(light,0,0,10,1);px(light,0,0,1,10);px(light,11,0,4,1);px(light,11,6,5,1);px(light,0,11,4,1);px(light,6,11,1,4);
 px('#000',15,0,1,16);px('#000',0,15,16,1);px('#000',10,0,1,6);px('#000',10,5,6,1);px('#000',4,10,1,6);px('#000',0,10,4,1);px('#000',7,10,8,1);px('#000',6,12,1,3);});
const brickTile=(base,light,mortar='#000')=>mk(px=>{px(base,0,0,16,16);px(light,0,0,16,1);for(const y of [3,7,11,15])px(mortar,0,y,16,1);for(const [y,xs] of [[0,[7,15]],[4,[3,11]],[8,[7,15]],[12,[3,11]]])for(const X of xs)px(mortar,X,y+(y?0:1),1,y?3:2);});
const qglyph=[[5,3,5,1],[4,4,2,1],[9,4,2,1],[9,5,2,1],[8,6,2,1],[7,7,2,1],[7,8,2,1],[7,10,2,2]];
const qTile=(base,glyph,edge)=>mk(px=>{px(base,0,0,16,16);px('#000',15,0,1,16);px('#000',0,15,16,1);px(edge,0,0,15,1);px(edge,0,0,1,15);for(const [X,Y] of [[2,2],[13,2],[2,13],[13,13]])px('#000',X,Y);for(const [X,Y,W,H] of qglyph)px('#000',X+1,Y+1,W,H);for(const [X,Y,W,H] of qglyph)px(glyph,X,Y,W,H);});
const usedTile=base=>mk(px=>{px(base,0,0,16,16);px('#000',0,0,16,1);px('#000',0,0,1,16);px('#000',15,0,1,16);px('#000',0,15,16,1);for(const [X,Y] of [[2,2],[13,2],[2,13],[13,13]])px('#000',X,Y);});
const hardTile=(base,light)=>mk(px=>{px(base,0,0,16,16);px(light,0,0,15,1);px(light,0,0,1,15);px(light,1,1,13,1);px(light,1,1,1,13);px('#000',15,0,1,16);px('#000',0,15,16,1);px('#000',14,1,1,14);px('#000',1,14,14,1);});
const pipeTop=right=>mk(px=>{px(C.green,0,0,16,16);px('#000',0,0,16,1);px('#000',0,15,16,1);if(!right){px('#000',0,0,1,16);px(C.lime,2,1,2,14);px(C.lime,5,1,1,14);}else{px('#000',15,0,1,16);for(let y=1;y<15;y+=2){px('#000',10,y);px('#000',12,y+1);}px('#000',13,1,1,14);}});
const pipeBody=right=>mk(px=>{if(!right){px('#000',2,0,1,16);px(C.green,3,0,13,16);px(C.lime,5,0,2,16);px(C.lime,8,0,1,16);}else{px(C.green,0,0,13,16);for(let y=0;y<16;y+=2){px('#000',8,y);px('#000',10,y+1);}px('#000',13,0,1,16);}});
// sideways pipe: mouth (top/bottom half) and body (top/bottom half)
const sideTile=(mouth,bottom)=>mk(px=>{px(C.green,0,0,16,16);
 if(mouth){px('#000',0,0,1,16);if(!bottom){px('#000',0,0,16,1);px(C.lime,2,2,1,14);px(C.lime,4,3,12,2);}else{px('#000',0,15,16,1);px(C.lime,2,0,1,14);for(let x=3;x<16;x+=2)px('#000',x,12);}}
 else{if(!bottom){px('#000',0,2,16,1);px(C.lime,0,4,16,2);px(C.lime,0,7,16,1);}else{px('#000',0,13,16,1);for(let x=1;x<16;x+=2){px('#000',x,8);px('#000',x+1,10);}}}});
const treeTile=kind=>mk(px=>{px(C.green,0,1,16,15);px('#000',0,0,16,1);px('#000',0,15,16,1);px(C.lime,0,2,16,2);
 for(const X of [3,9,13])px(C.lime,X,6,2,2);px(C.lime,6,10,2,2);
 if(kind==='l'){px(C.sky,0,0,3,3);px(C.sky,0,0,1,6);px('#000',3,0,1,1);px('#000',1,3,2,1);px('#000',0,4,1,11);}
 if(kind==='r'){px(C.sky,13,0,3,3);px(C.sky,15,0,1,6);px('#000',12,0,1,1);px('#000',13,3,2,1);px('#000',15,4,1,11);}});
const trunkTile=mk(px=>{px('#c06c18',0,0,16,16);px('#fcbc74',1,0,2,16);px('#fcbc74',9,0,1,16);px('#7c3800',5,0,1,16);px('#7c3800',12,0,2,16);for(let y=2;y<16;y+=5)px('#7c3800',7,y,2,2);});
const bridgeTile=mk(px=>{px('#c84c0c',0,0,16,16);px('#fcbcb0',0,0,16,2);px('#000',0,4,16,1);for(let x=1;x<16;x+=4){px('#000',x,7,2,4);px('#fc9838',x+2,7,1,4);}px('#000',0,13,16,1);px('#883000',0,14,16,2);});
const chainTile=mk(px=>{for(let k=0;k<4;k++){const X=k*4,Y=12-k*4;px('#bcbcbc',X,Y,4,3);px('#000',X+1,Y+1,2,1);}});
const lavaTop=mk(px=>{px(C.lava,0,6,16,10);for(let x=0;x<16;x++){const hgt=Math.round(3+2*Math.sin(x/16*Math.PI*2));px(C.lava,x,6-hgt,1,hgt);px(C.lavaTop,x,6-hgt,1,2);}px('#f83800',0,12,16,4);});
const lavaBody=mk(px=>{px('#f83800',0,0,16,16);px(C.lava,0,0,16,4);for(const [X,Y] of [[3,7],[11,11],[7,14]])px(C.lavaTop,X,Y,2,1);});

// ------------------------------------------------------------------ World 2 (New Dork City) tiles: our own city looks
// steel girder block (red-orange construction steel with rivets)
const girderTile=(base='#c8401c',light='#f88c5c',dark='#6c1c08')=>mk(px=>{px(base,0,0,16,16);px(light,0,0,16,2);px(dark,0,14,16,2);px(dark,0,7,16,2);px(light,0,9,16,1);
 for(const X of [2,7,12])for(const Y of [3,11]){px(dark,X+1,Y+1,2,2);px('#fcd8b0',X,Y,2,2);}px('#000',15,0,1,16);});
// sidewalk paving slabs
const paveTile=(base,light,dark)=>mk(px=>{px(base,0,0,16,16);px(light,0,0,16,1);px(light,0,8,16,1);px(dark,0,7,16,1);px(dark,0,15,16,1);px(dark,7,0,1,7);px(dark,15,8,1,7);px(light,8,0,1,7);px(light,0,9,1,6);
 px(dark,3,3,1,1);px(dark,11,12,1,1);px(dark,13,4,1,1);});
// glazed subway wall tile
const subwayTile=(base,light,grout)=>mk(px=>{px(grout,0,0,16,16);for(const [X,Y] of [[0,0],[8,0],[4,8],[12,8],[-4,8]]){px(base,X+0.5|0,Y,7,7);px(light,X+1|0,Y+1,4,1);}});
// office floor: steel panels with a seam and bolts
const officeTile=(base,light,dark)=>mk(px=>{px(base,0,0,16,16);px(light,0,0,16,1);px(light,0,0,1,16);px(dark,15,0,1,16);px(dark,0,15,16,1);px(dark,0,7,16,1);px(light,0,8,16,1);for(const [X,Y] of [[2,2],[13,2],[2,11],[13,11]])px(dark,X,Y,1,1);});
// rooftop: concrete parapet cap; ends round off into the dusk sky
const roofTile=kind=>mk(px=>{px('#8c8c9c',0,2,16,14);px('#d8d8e8',0,2,16,2);px('#5c5c6c',0,6,16,1);px('#5c5c6c',0,15,16,1);px('#000',0,1,16,1);for(const X of [2,8,14])px('#4c4c5c',X,0,1,2);px('#bcbccc',0,0,16,1);
 if(kind==='l'){px('#000',0,1,1,15);px('#e8e8f8',1,3,1,12);}if(kind==='r'){px('#000',15,1,1,15);px('#3c3c4c',14,3,1,12);}});
// building facade under a rooftop: brick with two windows (lit or dark, chosen per tile column by the drawer)
const facadeTile=lit=>mk(px=>{px('#5c2c3c',0,0,16,16);px('#3c1c2c',0,15,16,1);for(const X of [2,9]){px('#1c0c14',X,3,5,8);px(lit?'#f8d878':'#2c3c6c',X+1,4,3,6);if(lit)px('#fcf0b8',X+1,4,1,6);px('#8c5c6c',X,11,5,1);}});
const catwalkTile=mk(px=>{px('#5c6c8c',0,0,16,3);px('#bcc8e8',0,0,16,1);px('#2c3448',0,3,16,1);for(let x=0;x<16;x+=4){px('#5c6c8c',x,4,1,9);px('#5c6c8c',x+1,4+((x/4)%2?0:8),3,1);}px('#5c6c8c',0,12,16,2);px('#2c3448',0,14,16,1);});
const shaftTop=mk(px=>{px('#0c0c20',0,0,16,16);for(let x=0;x<16;x++){const h=Math.round(2+2*Math.sin(x*1.7));px('#38c8fc',x,8-h,1,1);}px('#1c2c5c',0,10,16,6);px('#9cf0fc',5,7,1,1);px('#fcfcfc',11,6,1,1);});
const shaftBody=mk(px=>{px('#0c0c20',0,0,16,16);px('#1c2c5c',0,0,16,3);for(const [X,Y] of [[3,7],[11,11],[7,14]])px('#38c8fc',X,Y,2,1);});

function tileSets(){
 const sets={},common={[TILE.PTL]:pipeTop(false),[TILE.PTR]:pipeTop(true),[TILE.PL]:pipeBody(false),[TILE.PR]:pipeBody(true),
  [TILE.HMT]:sideTile(true,false),[TILE.HMB]:sideTile(true,true),[TILE.HBT]:sideTile(false,false),[TILE.HBB]:sideTile(false,true),
  [TILE.TREE_L]:treeTile('l'),[TILE.TREE_M]:treeTile('m'),[TILE.TREE_R]:treeTile('r'),[TILE.TRUNK]:trunkTile,[TILE.BRIDGE]:bridgeTile,[TILE.CHAIN]:chainTile,[TILE.LAVA_TOP]:lavaTop,[TILE.LAVA]:lavaBody};
 const pal={over:[C.brick,C.light],athletic:[C.brick,C.light],under:[C.teal,C.tealLight],castle:[C.dgray,C.gray]};
 for(const [kind,[base,light]] of Object.entries(pal)){
  const usedCol=kind==='under'?'#005c5c':C.brick;
  sets[kind]={...common,[TILE.GROUND]:groundTile(base,light),[TILE.BRICK]:brickTile(base,light),[TILE.USED]:usedTile(usedCol),[TILE.HARD]:hardTile(base,light),
   [TILE.CASTLE]:brickTile(C.gray,C.white,C.dgray),q:[qTile(C.q,C.brick,C.brown),qTile('#e47a24',C.brown,C.brown),qTile(C.brick,'#5a1c00','#5a1c00')]};}
 // World 2 looks: the street, the flooded subway, the rooftops at dusk and the skyscraper HQ
 const girder=girderTile(),q=sets.over.q;
 sets.city={...sets.over,[TILE.GROUND]:paveTile('#9c9c9c','#dcdcdc','#5c5c5c'),[TILE.BRICK]:brickTile('#a84828','#f8a878','#3c1408'),[TILE.HARD]:girder,[TILE.USED]:usedTile('#7c3c1c'),q};
 sets.subway={...sets.over,[TILE.GROUND]:subwayTile('#e8e4d0','#fcfcf4','#6c6c64'),[TILE.BRICK]:subwayTile('#e8e4d0','#fcfcf4','#6c6c64'),[TILE.HARD]:subwayTile('#2c8c6c','#8cdcbc','#0c3c2c'),[TILE.USED]:usedTile('#2c4c6c'),q};
 sets.roof={...sets.over,[TILE.GROUND]:paveTile('#7c7c8c','#bcbccc','#3c3c4c'),[TILE.BRICK]:brickTile('#8c3c2c','#d88c6c','#2c0c08'),[TILE.HARD]:girder,[TILE.USED]:usedTile('#5c2c1c'),
  [TILE.TREE_L]:roofTile('l'),[TILE.TREE_M]:roofTile('m'),[TILE.TREE_R]:roofTile('r'),[TILE.TRUNK]:facadeTile(false),trunkLit:facadeTile(true),q};
 const office=officeTile('#3c4c6c','#8ca0c8','#1c2438');
 sets.tower={...sets.castle,[TILE.CASTLE]:office,[TILE.GROUND]:office,[TILE.BRICK]:office,[TILE.HARD]:girder,[TILE.BRIDGE]:catwalkTile,[TILE.LAVA_TOP]:shaftTop,[TILE.LAVA]:shaftBody,[TILE.USED]:usedTile('#2c3c5c'),q};
 return sets;
}

// ------------------------------------------------------------------ scenery
function drawCloud(g,cx,cy,n,fill,edge){g.fillStyle=edge;for(let k=0;k<n;k++){g.beginPath();g.arc(cx+12+k*16,cy+3,10,0,7);g.fill();}g.fillStyle=fill;for(let k=0;k<n;k++){g.beginPath();g.arc(cx+12+k*16,cy,10,0,7);g.arc(cx+20+k*16,cy-6,9,0,7);g.fill();}g.fillRect(cx+4,cy,n*16+16,8);g.fillStyle=edge;g.fillRect(cx+4,cy+8,n*16+16,2);
 g.fillStyle='#000';g.fillRect(cx+4,cy+10,n*16+16,1);}
function drawHill(g,hx,w5){const w=w5*T,h=w5===5?2.4*T:1.2*T,base=13*T;g.fillStyle=C.green;g.strokeStyle='#000';g.lineWidth=1;g.beginPath();g.moveTo(hx,base);g.bezierCurveTo(hx+w*.28,base-h*.3,hx+w*.3,base-h,hx+w/2,base-h);g.bezierCurveTo(hx+w*.7,base-h,hx+w*.72,base-h*.3,hx+w,base);g.closePath();g.fill();g.stroke();
 g.fillStyle='#000';const sp=w5===5?[[.38,.45],[.62,.45],[.5,.75]]:[[.5,.6]];for(const [a,b] of sp){g.fillRect(hx+w*a-1.5,base-h*b-3,2,6);g.fillRect(hx+w*a+1.5,base-h*b-2,2,5);}}
function drawCastle(g,brick,X,small=true,sky=C.sky){const base=13*T,pat=g.createPattern(brick,'repeat');
 g.save();g.fillStyle=pat;g.fillRect(X,base-5*T,5*T,5*T);g.restore();
 g.fillStyle=sky;g.fillRect(X,base-5*T,T,2*T);g.fillRect(X+4*T,base-5*T,T,2*T);
 g.fillStyle=pat;for(let k=0;k<5;k++)g.fillRect(X+k*T+2,base-3*T-6,10,6);for(let k=1;k<4;k++)g.fillRect(X+k*T+2,base-5*T-6,10,6);
 g.fillStyle='#000';g.fillRect(X+2*T,base-2*T+4,T,2*T-4);g.beginPath();g.arc(X+2.5*T,base-2*T+4,T/2,Math.PI,0);g.fill();g.fillRect(X+1.5*T,base-4*T,5,10);g.fillRect(X+3.2*T,base-4*T,5,10);}
// the city skyline behind World 2's outdoor stages: two layers of towers sliding slower than the street (parallax);
// heights and lit windows come from a hash of the tower's number, so they never change
const hash=n=>{let x=Math.imul(n^0x5bd1e995,0x27d4eb2d);x^=x>>>15;x=Math.imul(x,0x85ebca6b);x^=x>>>13;return (x>>>0)/4294967296;};
function drawSkyline(g,camX,viewW,night){
 const base=13*T,layers=night?[[.25,40,'#3c2c6c','#5c4c8c',.5],[.5,52,'#1c1438','#f8d878',.35]]:[[.25,40,'#9cbcf0','#c8dcfc',0],[.5,52,'#6c8cc8','#bcd0f4',0]];
 for(const [k,sp,body,win,litP] of layers){const off=camX*k,i0=Math.floor((off-sp*2)/sp),i1=Math.ceil((off+viewW+sp)/sp);
  for(let i=i0;i<=i1;i++){const h=hash(i*7+(k*100|0)),w=sp*(.62+.3*hash(i*13+5)),hgt=T*(3+h*(k<.4?7:5)),x=camX-off+i*sp+(sp-w)/2,y=base-hgt;
   g.fillStyle=body;g.fillRect(x,y,w,hgt);
   if(hash(i*3+1)>.6){g.fillRect(x+w*.4,y-T*.8,w*.2,T*.8);g.fillRect(x+w*.48,y-T*1.6,2,T*.8);}
   for(let yy=y+4;yy<base-6;yy+=7)for(let xx=x+3;xx<x+w-4;xx+=6){if(litP?hash(i*977+xx*3+yy)<litP:hash(i*31+((yy-y)|0))<.5){g.fillStyle=win;g.fillRect(xx,yy,3,3);}}}}
}
// a glass curtain wall inside the HQ tower: city lights outside, steel mullions in front
function drawTowerGlass(g,camX,viewW,top,bottom){drawSkyline(g,camX,viewW,true);
 g.fillStyle='rgba(20,28,52,.35)';g.fillRect(camX,top,viewW,bottom-top);g.fillStyle='#1c2438';
 const sp=3*T;for(let x=Math.floor(camX/sp)*sp;x<camX+viewW+sp;x+=sp)g.fillRect(x-2,top,4,bottom-top);for(let y=4*T;y<13*T;y+=3*T)g.fillRect(camX,y-1,viewW,3);}
// street furniture (feet at the sidewalk)
function drawCityProp(g,d){const x=d.x,b=13*T;g.save();
 if(d.type==='lamp'){g.fillStyle='#2c3c3c';g.fillRect(x-1,b-46,3,46);g.fillRect(x-4,b-3,9,3);g.fillRect(x-1,b-46,10,2);g.fillStyle='#fcf0a8';g.fillRect(x+6,b-44,5,3);g.fillStyle='rgba(252,240,168,.18)';g.beginPath();g.moveTo(x+6,b-41);g.lineTo(x+16,b);g.lineTo(x,b);g.closePath();g.fill();}
 else if(d.type==='hydrant'){g.fillStyle=C.red;g.fillRect(x-3,b-11,6,11);g.fillRect(x-5,b-8,10,3);g.fillRect(x-4,b-13,8,2);g.fillStyle='#fc7460';g.fillRect(x-2,b-10,1,8);g.fillStyle='#000';g.fillRect(x-4,b-1,8,1);}
 else if(d.type==='bench'){g.fillStyle='#5c3c1c';g.fillRect(x-14,b-10,28,3);g.fillRect(x-14,b-16,28,3);g.fillStyle='#2c2c2c';g.fillRect(x-12,b-7,2,7);g.fillRect(x+10,b-7,2,7);}
 else if(d.type==='news'){g.fillStyle='#1c58c8';g.fillRect(x-5,b-14,10,14);g.fillStyle='#bcdcfc';g.fillRect(x-3,b-12,6,4);g.fillStyle='#000';g.fillRect(x-5,b-1,10,1);}
 else if(d.type==='subway'){g.fillStyle='#2c3c3c';g.fillRect(x-1,b-40,3,40);g.fillRect(x+31,b-40,3,40);g.fillStyle=C.green;g.beginPath();g.arc(x,b-42,4,0,7);g.arc(x+32,b-42,4,0,7);g.fill();g.fillStyle='#000';g.fillRect(x+2,b-36,28,10);nesText(g,'SUBWAY',x+4,b-35,'#fcfcfc',.6,1);}
 g.restore();}
function star5(g,cx,cy,r){g.beginPath();for(let k=0;k<10;k++){const rr=k%2?r*.45:r,a=k*Math.PI/5-Math.PI/2;g.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);}g.closePath();g.fill();}
function drawCastleFlag(g,X,k){if(k<=0)return;const y=13*T-5*T-6-k*20;g.fillStyle='#000';g.fillRect(X-1,y,2,k*20);g.fillStyle=C.white;g.fillRect(X+1,y,14,10);g.fillStyle=C.red;star5(g,X+8,y+5,4);}
function drawFlagpole(g,f,flagPos){const X=f.x,top=f.top;g.fillStyle=C.bush;g.fillRect(X-1,top,2,f.base-top);g.fillStyle=C.green;g.beginPath();g.arc(X,top-4,4,0,7);g.fill();g.fillStyle='#000';g.lineWidth=1;g.strokeStyle='#000';g.stroke();g.fillStyle=C.lime;g.fillRect(X-2,top-6,2,2);
 const fy=top+4+flagPos;g.fillStyle=C.white;g.beginPath();g.moveTo(X-1,fy);g.lineTo(X-17,fy+8);g.lineTo(X-1,fy+16);g.closePath();g.fill();g.fillStyle=C.green;g.beginPath();g.arc(X-7,fy+8,3.4,0,7);g.fill();g.fillStyle=C.white;g.fillRect(X-8,fy+6,2,2);}

// ------------------------------------------------------------------ the title logo (the brown board with SUPER / MARIO BROS.)
function drawLogo(g,x,y){
 const w=176,h=88;g.fillStyle='#000';g.fillRect(x+2,y+2,w,h);g.fillStyle=C.brick;g.fillRect(x,y,w,h);
 g.fillStyle=C.light;g.fillRect(x,y,w,2);g.fillRect(x,y,2,h);g.fillStyle='#5a1c00';g.fillRect(x,y+h-2,w,2);g.fillRect(x+w-2,y,2,h);
 for(const [X,Y] of [[4,4],[w-7,4],[4,h-7],[w-7,h-7]]){g.fillStyle=C.light;g.fillRect(x+X,y+Y,3,3);g.fillStyle='#000';g.fillRect(x+X+1,y+Y+1,2,2);}
 const big=(str,X,Y,sx,sy)=>{nesText(g,str,X+2,Y+2,'#000',sx,sy);nesText(g,str,X,Y,C.light,sx,sy);};
 big('SUPER',x+12,y+8,1.5,1.4);big('MARIO',x+12,y+22,3.4,3.1);big('BROS.',x+36,y+50,3.4,3.1);
 nesText(g,'©1985 NINTENDO',x+w-114,y+h+4,C.light);
}

// ------------------------------------------------------------------ sprites (feet at x,y)
function drawCoin(g,cx,cy,ph){const wd=[5,3.6,1.4,3.6][Math.floor(ph)%4];g.fillStyle=C.brown;g.fillRect(cx-wd-1,cy-7,wd*2+2,14);g.fillStyle=C.q;g.fillRect(cx-wd,cy-6,wd*2,12);g.fillStyle=C.white;g.fillRect(cx-wd*.4,cy-4,Math.max(1,wd*.5),8);}
function drawGoomba(g,e,ug){const body=ug?'#005c5c':C.brick,face=ug?C.tealLight:C.light;g.save();g.translate(e.x,e.y);if(e.state==='dying'){g.scale(1,-1);g.translate(0,14);}
 if(e.state==='squash'){g.fillStyle=body;g.fillRect(-8,-6,16,4);g.fillStyle=face;g.fillRect(-6,-3,12,3);g.fillStyle='#000';g.fillRect(-4,-5,2,1);g.fillRect(2,-5,2,1);g.restore();return;}
 const st=Math.floor(e.frame*6)%2;g.fillStyle=body;g.beginPath();g.ellipse(0,-9,8,6.5,0,Math.PI,0);g.lineTo(8,-6);g.lineTo(-8,-6);g.fill();g.fillRect(-7,-9,14,4);
 g.fillStyle=face;g.fillRect(-4,-6,8,4);g.fillStyle=C.white;g.fillRect(-5,-11,3,4);g.fillRect(2,-11,3,4);g.fillStyle='#000';g.fillRect(-4,-10,2,3);g.fillRect(2,-10,2,3);g.fillRect(-6,-13,4,1);g.fillRect(2,-13,4,1);
 g.fillStyle='#000';g.fillRect(st?-8:-6,-2,6,2);g.fillRect(st?2:0,-2,6,2);g.restore();}
function drawKoopa(g,e){const red=e.type==='koopaRed'||e.type==='paraRed',shellC=red?C.red:C.green,rimC=red?C.white:C.white;g.save();g.translate(e.x,e.y);if(e.state==='dying'){g.scale(1,-1);g.translate(0,14);}const shell=e.state!=='walk';
 if(!shell){g.scale(e.vx>0?-1:1,1);const st=Math.floor(e.frame*6)%2;g.fillStyle=C.gold;g.fillRect(-7,-24,5,9);g.fillRect(-9,-22,3,4);g.fillStyle='#000';g.fillRect(-7,-21,1,2);g.fillStyle=C.white;g.fillRect(-6,-16,3,3);
  g.fillStyle=C.gold;g.fillRect(st?-5:-3,-3,4,3);g.fillRect(st?3:1,-3,4,3);
  if(e.type==='paraRed'){const fl=Math.floor(e.frame*8)%2;g.fillStyle=C.white;g.beginPath();g.ellipse(6,fl?-20:-16,4,fl?6:4,-.4,0,7);g.fill();g.strokeStyle='#000';g.lineWidth=.8;g.stroke();}}
 const y0=shell?-1:-3,ox=shell?0:2;g.fillStyle=rimC;g.beginPath();g.ellipse(ox,y0-6,7.5,7,0,Math.PI,0);g.lineTo(9.5,y0);g.lineTo(-5.5+(shell?-2:0),y0);g.fill();
 g.fillStyle=shellC;g.beginPath();g.ellipse(ox,y0-6,6,6,0,Math.PI,0);g.fill();g.fillStyle=red?'#fc7460':C.lime;g.fillRect(ox-3,y0-10,2,2);g.fillRect(ox+1,y0-10,2,2);g.fillRect(ox-1,y0-7,2,2);
 if(shell&&e.vx===0&&e.t>380&&Math.floor(e.t/6)%2){g.fillStyle=C.gold;g.fillRect(-3,-3,6,2);}
 g.restore();}
function drawPiranha(g,e){if(e.off<=0)return;const chomp=Math.floor(e.frame*5)%2,top=e.home-e.off;g.save();g.translate(e.x,top);
 g.fillStyle=C.green;g.fillRect(-1,8,2,Math.max(0,e.off-8));g.beginPath();g.ellipse(-5,13,5,2.5,-.5,0,7);g.ellipse(5,13,5,2.5,.5,0,7);g.fill();
 g.fillStyle=C.red;g.beginPath();g.arc(0,4,7,0,7);g.fill();g.fillStyle=C.white;g.fillRect(-5,1,2,2);g.fillRect(3,6,2,2);g.fillRect(-2,8,2,1);
 g.fillStyle='#000';g.beginPath();g.moveTo(0,4);g.lineTo(chomp?-4:-2,-3);g.lineTo(chomp?4:2,-3);g.fill();g.fillStyle=C.white;g.fillRect(chomp?-4:-2,-3,1,2);g.fillRect(chomp?3:1,-3,1,2);g.restore();}
// underwater: a fish that swims across and a squid that darts after you
function drawCheep(g,e){const red=e.type==='cheepRed';g.save();g.translate(e.x,e.y-7);if(e.state==='dying')g.scale(1,-1);g.scale(e.vx>0?-1:1,1);const fl=Math.floor(e.frame*6)%2;
 g.fillStyle=red?C.red:'#bcbcbc';g.beginPath();g.ellipse(0,0,7,5.5,0,0,7);g.fill();g.fillStyle=red?'#fc7460':C.white;g.beginPath();g.moveTo(5,0);g.lineTo(11,fl?-5:-3);g.lineTo(11,fl?5:3);g.closePath();g.fill();
 g.fillStyle=red?'#fc7460':C.white;g.fillRect(-2,-7,5,3);g.fillStyle=C.white;g.fillRect(-5,-3,4,4);g.fillStyle='#000';g.fillRect(-5,-2,2,2);g.fillStyle=red?C.gold:C.q;g.fillRect(-7,1,3,1);g.restore();}
function drawBlooper(g,e){g.save();g.translate(e.x,e.y);if(e.state==='dying'){g.scale(1,-1);g.translate(0,16);}const up=e.vy<0;
 g.fillStyle=C.white;g.beginPath();g.ellipse(0,-12,6,up?7:5,0,Math.PI,0);g.lineTo(6,-8);g.lineTo(-6,-8);g.fill();g.fillStyle='#000';g.fillRect(-4,-12,2,3);g.fillRect(2,-12,2,3);
 g.fillStyle=C.white;for(const X of [-5,-2,1,4])g.fillRect(X,-8,2,up?8:5);g.restore();}
function drawItem(g,it,simT){g.save();g.translate(it.x,it.y);
 if(it.type==='mushroom'||it.type==='1up'){const cap=it.type==='1up'?C.green:C.red;g.fillStyle=C.light;g.fillRect(-4,-7,8,7);g.fillStyle='#000';g.fillRect(-2,-6,1,3);g.fillRect(1,-6,1,3);g.fillStyle=cap;g.beginPath();g.ellipse(0,-8,8,7,0,Math.PI,0);g.fill();g.fillRect(-8,-8,16,2);g.fillStyle=C.white;g.beginPath();g.arc(0,-11,2.6,0,7);g.arc(-5,-9,1.8,0,7);g.arc(5,-9,1.8,0,7);g.fill();}
 else if(it.type==='flower'){const cyc=[C.red,C.q,C.gold,C.white][Math.floor(simT*10)%4];g.fillStyle=C.green;g.fillRect(-1,-7,2,7);g.fillRect(-6,-5,4,2);g.fillRect(2,-5,4,2);g.fillStyle=cyc;g.beginPath();g.ellipse(0,-11,7,4.5,0,0,7);g.fill();g.fillStyle=C.gold;g.beginPath();g.ellipse(0,-11,4.5,2.8,0,0,7);g.fill();g.fillStyle=C.white;g.fillRect(-2,-12,4,2);}
 else{g.fillStyle=Math.floor(simT*12)%2?C.gold:C.q;star5(g,0,-7,8);g.fillStyle='#000';g.fillRect(-2,-9,1,3);g.fillRect(1,-9,1,3);}
 g.restore();}
function drawFireball(g,x,y,t){const a=Math.floor(t/3)%4;g.save();g.translate(x,y);g.rotate(a*Math.PI/2);g.fillStyle=C.red;g.fillRect(-3,-3,6,6);g.fillStyle=C.gold;g.fillRect(-2,-2,3,3);g.fillStyle=C.white;g.fillRect(-1,-1,1,1);g.restore();}
function drawLift(g,l){const x0=l.x-l.w/2;
 if(l.look==='taxi'){const y=l.y,cx=l.x;g.fillStyle='#000';g.fillRect(x0-1,y+7,l.w+2,12);g.fillStyle=C.gold;g.fillRect(cx-14,y,28,9);g.fillRect(x0,y+8,l.w,10);g.fillStyle='#fcf078';g.fillRect(cx-14,y,28,2);g.fillRect(x0,y+8,l.w,2);
  g.fillStyle='#8cc8fc';g.fillRect(cx-12,y+3,10,5);g.fillRect(cx+2,y+3,10,5);g.fillStyle='#000';for(let x=x0+2;x<x0+l.w-2;x+=4)g.fillRect(x,y+13,2,2);g.fillStyle=C.white;g.fillRect(x0+l.w-3,y+10,3,3);g.fillStyle=C.red;g.fillRect(x0,y+10,2,3);
  g.fillStyle='#000';for(const X of [x0+10,x0+l.w-10]){g.beginPath();g.arc(X,y+19,5,0,7);g.fill();}g.fillStyle=C.gray;for(const X of [x0+10,x0+l.w-10])g.fillRect(X-1,y+18,3,3);return;}
 if(l.look==='elevator'){g.fillStyle='#8c9cbc';g.fillRect(x0+4,0,1,l.y);g.fillRect(x0+l.w-5,0,1,l.y);g.fillStyle='#5c6c8c';g.fillRect(x0,l.y,l.w,8);g.fillStyle='#bcc8e8';g.fillRect(x0,l.y,l.w,2);
  for(let x=x0;x<x0+l.w;x+=8){g.fillStyle=C.gold;g.fillRect(x,l.y+4,4,3);g.fillStyle='#000';g.fillRect(x+4,l.y+4,4,3);}return;}g.fillStyle='#fc9838';g.fillRect(x0,l.y,l.w,8);g.fillStyle=C.light;g.fillRect(x0,l.y,l.w,2);g.fillStyle='#000';for(let x=x0+3;x<x0+l.w-2;x+=8)g.fillRect(x,l.y+4,3,2);g.fillStyle='#883000';g.fillRect(x0,l.y+7,l.w,1);}
function drawAxe(g,x,y,t,glass=false){g.save();g.translate(x,y);if(glass){g.fillStyle=C.red;g.fillRect(-7,-14,18,24);g.fillStyle='rgba(188,220,252,.45)';g.fillRect(-5,-12,14,20);g.fillStyle=C.white;g.fillRect(-4,-11,2,6);}g.fillStyle='#883000';g.fillRect(-1,-6,3,14);const sh=Math.floor(t*4)%3;g.fillStyle=[C.white,C.gray,C.q][sh];g.beginPath();g.moveTo(1,-8);g.lineTo(8,-10);g.quadraticCurveTo(11,-3,8,4);g.lineTo(1,1);g.closePath();g.fill();g.fillStyle='#000';g.fillRect(1,-8,1,9);g.restore();}
function drawBowser(g,b,simT){g.save();g.translate(b.x,b.y);if(b.dir>0)g.scale(-1,1);if(b.state==='dead'){g.scale(1,-1);g.translate(0,32);}
 const st=Math.floor(simT*4)%2;
 // shell, spikes, belly, head with horns and the red mane, mouth open when breathing fire
 g.fillStyle=C.green;g.beginPath();g.ellipse(6,-17,11,13,0,0,7);g.fill();g.fillStyle=C.white;for(const [X,Y] of [[0,-29],[8,-30],[15,-24],[16,-14]]){g.beginPath();g.moveTo(X-3,Y+3);g.lineTo(X,Y-3);g.lineTo(X+3,Y+3);g.fill();}
 if(b.ceo){g.fillStyle='#1c2c5c';g.beginPath();g.ellipse(6,-15,10,10,0,0,7);g.fill();g.fillStyle='#2c3c7c';g.fillRect(-7,-20,4,15);g.fillRect(4,-20,4,15);
  g.fillStyle=C.white;g.fillRect(-4,-19,8,14);g.fillStyle=C.red;g.beginPath();g.moveTo(-2,-19);g.lineTo(2,-19);g.lineTo(1,-16);g.lineTo(3,-8);g.lineTo(0,-5);g.lineTo(-3,-8);g.lineTo(-1,-16);g.closePath();g.fill();
  g.fillStyle='#1c2c5c';g.fillRect(-8,-6,20,3);}
 else{g.fillStyle=C.gold;g.fillRect(-5,-18,9,14);g.fillStyle='#fce0a8';for(let y=-17;y<-5;y+=4)g.fillRect(-4,y,7,2);}
 g.fillStyle=C.green;g.fillRect(-8,-6,8,6);g.fillRect(4,-6,8,6);g.fillStyle=C.white;g.fillRect(st?-9:-8,-2,3,2);g.fillRect(st?3:4,-2,3,2);
 g.fillStyle=C.green;g.fillRect(-14,-30,13,11);g.fillStyle=C.gold;g.fillRect(-16,-24,6,6);g.fillStyle=C.white;g.fillRect(-12,-34,3,5);g.fillRect(-5,-35,3,6);
 g.fillStyle=C.red;g.fillRect(-2,-32,6,8);g.fillStyle='#000';g.fillRect(-11,-27,2,2);
 if(b.mouth>0){g.fillStyle='#000';g.fillRect(-17,-20,8,3);g.fillStyle=C.white;g.fillRect(-16,-20,1,1);g.fillRect(-13,-20,1,1);}
 g.fillStyle=C.green;g.fillRect(-12,-17,4,4);g.restore();}
function drawFlame(g,f,simT){g.save();g.translate(f.x,f.y);const fl=Math.floor(simT*12)%2;g.fillStyle=C.red;g.beginPath();g.ellipse(4,0,12,fl?3.5:3,0,0,7);g.fill();g.fillStyle=C.q;g.beginPath();g.ellipse(0,0,8,2.2,0,0,7);g.fill();g.fillStyle=C.white;g.fillRect(-8,-1,6,2);g.restore();}
function drawToad(g,x,y){g.save();g.translate(x,y);g.fillStyle='#0058f8';g.fillRect(-5,-11,10,7);g.fillStyle=C.white;g.fillRect(-4,-4,8,2);g.fillStyle=C.olive;g.fillRect(-5,-2,4,2);g.fillRect(1,-2,4,2);
 g.fillStyle=C.skin;g.fillRect(-5,-17,10,6);g.fillStyle='#000';g.fillRect(-3,-15,1,2);g.fillRect(2,-15,1,2);
 g.fillStyle=C.white;g.beginPath();g.ellipse(0,-19,9,7,0,Math.PI,0);g.fill();g.fillRect(-9,-19,18,3);g.fillStyle=C.red;g.beginPath();g.arc(0,-23,3,0,7);g.arc(-6,-19,2,0,7);g.arc(6,-19,2,0,7);g.fill();g.restore();}
function drawFirework(g,f){const k=f.t/30;g.save();g.translate(f.x,f.y);g.fillStyle=k<.33?C.white:k<.66?C.q:C.red;const r=4+k*14;for(let a=0;a<8;a++){const an=a*Math.PI/4;g.fillRect(Math.cos(an)*r-1.5,Math.sin(an)*r-1.5,3,3);}g.restore();}

Object.assign(exports,{drawSkyline,drawTowerGlass,drawCityProp,drawCheep,drawBlooper,C,nesText,textW,tileSets,drawCloud,drawHill,drawCastle,drawCastleFlag,drawFlagpole,drawLogo,drawCoin,drawGoomba,drawKoopa,drawPiranha,drawItem,drawFireball,drawLift,drawAxe,drawBowser,drawFlame,drawToad,drawFirework,star5});
