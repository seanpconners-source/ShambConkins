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

// ------------------------------------------------------------------ World 3 (the Haunted Boardwalk) tiles
const plankTile=(base='#8c5c34',light='#c8946c',dark='#3c2414')=>mk(px=>{px(base,0,0,16,16);for(const y of [0,8]){px(light,0,y,16,1);px(dark,0,y+7,16,1);}px(dark,5,0,1,8);px(dark,12,8,1,8);for(const [X,Y] of [[2,3],[9,3],[2,11],[14,11],[8,11]])px('#1c1008',X,Y,1,1);});
const crateTile=mk(px=>{px('#a8743c',0,0,16,16);px('#e0b07c',0,0,16,2);px('#e0b07c',0,0,2,16);px('#5c3814',14,0,2,16);px('#5c3814',0,14,16,2);for(let k=2;k<14;k++){px('#5c3814',k,k,2,1);px('#5c3814',15-k,k,1,1);}});
const postTile=mk(px=>{px('#6c4424',0,0,16,16);px('#a8744c',0,0,16,1);px('#a8744c',0,0,1,16);px('#2c1808',15,0,1,16);px('#2c1808',0,15,16,1);px('#2c1808',5,1,1,14);px('#2c1808',10,1,1,14);for(const [X,Y] of [[2,2],[13,2],[2,13],[13,13]])px('#c8c8c8',X,Y,1,1);});
const checkTile=mk(px=>{px('#1c1c1c',0,0,16,16);px('#ecdcfc',0,0,8,8);px('#ecdcfc',8,8,8,8);px('#000',0,15,16,1);});
const candyTile=mk(px=>{px(C.white,0,0,16,16);for(let k=-16;k<16;k+=8)for(let t=0;t<4;t++)for(let y=0;y<16;y++){const x=k+y+t;if(x>=0&&x<16)px('#e8203c',x,y,1,1);}px('#000',15,0,1,16);px('#000',0,15,16,1);});
const trackTile=kind=>mk(px=>{px('#5c3c24',0,4,16,4);for(let x=1;x<16;x+=4)px('#8c5c34',x,3,2,6);px('#bcbcbc',0,1,16,2);px('#fcfcfc',0,1,16,1);px('#2c2c2c',0,3,16,1);
 if(kind==='l')px('#2c2c2c',0,1,1,8);if(kind==='r')px('#2c2c2c',15,1,1,8);});
const latticeTile=mk(px=>{for(let k=0;k<16;k++){px('#4c3020',k,k,1,1);px('#4c3020',15-k,k,1,1);}px('#5c3c24',0,0,2,16);px('#5c3c24',14,0,2,16);px('#5c3c24',0,7,16,2);});
const circusTile=mk(px=>{px('#a8141c',0,0,16,16);px('#f8c838',0,0,16,2);px('#f8c838',0,14,16,2);px('#5c0810',0,13,16,1);px('#e8505c',0,2,16,1);px('#f8c838',6,5,4,4);px('#fcfcb0',7,6,2,2);px('#5c0810',15,0,1,16);});
const tightTile=mk(px=>{px('#f8c838',0,0,16,3);px('#fcf0a0',0,0,16,1);for(let x=0;x<16;x+=4)px(x%8?'#a8141c':C.white,x,3,4,5);px('#5c0810',0,8,16,1);});

// ------------------------------------------------------------------ Worlds 4-8 tiles (our own looks)
// ground with a cap layer on top (snow, sand, grass, embers, cloud fluff) over a body texture
const capGround=(top,topL,body,dark)=>mk(px=>{px(body,0,0,16,16);for(const [X,Y] of [[2,7],[9,10],[13,5],[5,13],[11,14]])px(dark,X,Y,2,1);px(top,0,0,16,4);px(topL,0,0,16,1);for(let x=0;x<16;x+=3)px(top,x,4,2,1+(x%2));px('#000',0,15,16,1);});
const capTop=(top,topL,edge)=>kind=>mk(px=>{px(edge,0,3,16,13);px(top,0,0,16,5);px(topL,0,0,16,2);for(let x=1;x<16;x+=4)px(top,x,5,2,2);if(kind==='l')px('#000',0,0,1,16);if(kind==='r')px('#000',15,0,1,16);px('#000',0,15,16,1);});
const faceTile=(base,dark,light)=>mk(px=>{px(base,0,0,16,16);px(light,1,0,1,16);px(dark,6,0,1,16);px(dark,12,0,2,16);for(const [X,Y] of [[3,4],[9,9],[13,2],[4,13]])px(dark,X,Y,2,2);});
const iceBlock=mk(px=>{px('#8cd8fc',0,0,16,16);px('#e8fcff',0,0,15,2);px('#e8fcff',0,0,2,15);px('#3c8cc8',15,0,1,16);px('#3c8cc8',0,15,16,1);px('#ffffff',3,3,4,1);px('#ffffff',3,4,1,3);px('#bcecff',9,8,3,3);});
const goldBlock=mk(px=>{px('#d8a000',0,0,16,16);px('#fce870',0,0,15,2);px('#fce870',0,0,2,15);px('#7c5000',15,0,1,16);px('#7c5000',0,15,16,1);px('#fcfcb0',4,4,3,3);});
const neonBrick=mk(px=>{px('#3c0c4c',0,0,16,16);for(const y of [0,8])px('#fc3cbc',0,y,16,1);px('#fc3cbc',7,0,1,8);px('#fc3cbc',15,8,1,8);px('#7c1c8c',0,1,16,1);px('#7c1c8c',0,9,16,1);});
const feltTop=capTop('#1c8c3c','#3cc85c','#7c3c1c');
const slotFace=mk(px=>{px('#a8141c',0,0,16,16);px('#f8c838',0,0,16,1);px('#f8c838',0,15,16,1);px('#fcfcfc',3,4,10,7);px('#000',3,4,10,1);px('#e8203c',4,6,2,3);px('#2c7cfc',7,6,2,3);px('#f8c838',10,6,2,3);px('#5c0810',0,12,16,1);});
const cloudTile=mk(px=>{px('#fcfcfc',0,2,16,14);px('#dcecfc',0,10,16,6);for(const x of [0,6,11])px('#fcfcfc',x,0,5,3);px('#bcd8f8',0,15,16,1);});
const marbleTile=mk(px=>{px('#f4f0e4',0,0,16,16);px('#fcfcf4',0,0,16,1);px('#d8c890',0,15,16,1);px('#d8c890',15,0,1,16);px('#c8c0b0',3,5,5,1);px('#c8c0b0',7,6,1,4);px('#c8c0b0',10,11,4,1);px('#f8c838',0,7,16,1);});
const fleshTile=mk(px=>{px('#4c2c2c',0,0,16,16);px('#7c4c3c',0,0,16,1);px('#2c1414',0,15,16,1);px('#2c1414',7,0,1,16);for(const [X,Y] of [[2,3],[11,9],[4,11]])px('#a81418',X,Y,2,2);px('#5c3c3c',9,3,4,3);});
const techTile=mk(px=>{px('#3c3c44',0,0,16,16);px('#6c6c7c',0,0,16,1);px('#6c6c7c',0,0,1,16);px('#1c1c24',15,0,1,16);px('#1c1c24',0,15,16,1);px('#a81418',3,6,10,2);px('#fc3c3c',4,6,3,1);for(const [X,Y] of [[2,2],[13,2],[2,13],[13,13]])px('#9c9cac',X,Y,1,1);});
const boneTop=capTop('#e8e0c8','#fcfcf0','#5c3c3c');
const liquid=(main,top,deep)=>[mk(px=>{px(main,0,6,16,10);for(let x=0;x<16;x++){const hgt=Math.round(3+2*Math.sin(x/16*Math.PI*2));px(main,x,6-hgt,1,hgt);px(top,x,6-hgt,1,2);}px(deep,0,12,16,4);}),
 mk(px=>{px(deep,0,0,16,16);px(main,0,0,16,4);for(const [X,Y] of [[3,7],[11,11],[7,14]])px(top,X,Y,2,1);})];

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

 const plank=plankTile(),post=postTile;
 sets.pier={...sets.over,[TILE.GROUND]:plank,[TILE.BRICK]:crateTile,[TILE.HARD]:post,[TILE.USED]:usedTile('#5c3c24'),q};
 sets.funhouse={...sets.over,[TILE.GROUND]:checkTile,[TILE.BRICK]:brickTile('#6c1c8c','#c87cec','#1c0428'),[TILE.HARD]:candyTile,[TILE.USED]:usedTile('#4c1c5c'),q};
 sets.coaster={...sets.over,[TILE.GROUND]:plank,[TILE.BRICK]:crateTile,[TILE.HARD]:post,[TILE.TREE_L]:trackTile('l'),[TILE.TREE_M]:trackTile('m'),[TILE.TREE_R]:trackTile('r'),[TILE.TRUNK]:latticeTile,[TILE.USED]:usedTile('#5c3c24'),q};
 const Wk=(base,ex)=>({...base,q,...ex});
 const icy=liquid('#5cbcfc','#dcf4ff','#1c5c9c'),acid=liquid('#8c3cfc','#e8b8fc','#3c0c7c');
 sets.snow=Wk(sets.over,{[TILE.GROUND]:capGround('#fcfcfc','#ffffff','#6c7c9c','#4c5c7c'),[TILE.BRICK]:brickTile('#8cc8e8','#e8f8ff','#2c5c8c'),[TILE.HARD]:iceBlock,[TILE.USED]:usedTile('#4c6c9c')});
 sets.icecave=Wk(sets.over,{[TILE.GROUND]:iceBlock,[TILE.BRICK]:brickTile('#5c9cc8','#c8ecff','#0c2c5c'),[TILE.HARD]:iceBlock,[TILE.USED]:usedTile('#2c4c7c')});
 sets.skilift=Wk(sets.snow,{[TILE.TREE_L]:capTop('#fcfcfc','#ffffff','#6c6c7c')('l'),[TILE.TREE_M]:capTop('#fcfcfc','#ffffff','#6c6c7c')('m'),[TILE.TREE_R]:capTop('#fcfcfc','#ffffff','#6c6c7c')('r'),[TILE.TRUNK]:faceTile('#5c5c6c','#3c3c4c','#7c7c8c')});
 sets.icepalace=Wk(sets.castle,{[TILE.CASTLE]:brickTile('#8cc8e8','#e8f8ff','#3c6c9c'),[TILE.HARD]:iceBlock,[TILE.BRIDGE]:iceBlock,[TILE.LAVA_TOP]:icy[0],[TILE.LAVA]:icy[1],[TILE.USED]:usedTile('#4c6c9c')});
 sets.strip=Wk(sets.over,{[TILE.GROUND]:paveTile('#7c6c5c','#c8b48c','#3c2c1c'),[TILE.BRICK]:neonBrick,[TILE.HARD]:goldBlock,[TILE.USED]:usedTile('#5c3c0c')});
 sets.desert=Wk(sets.over,{[TILE.GROUND]:capGround('#f8c878','#fce0a8','#c8843c','#8c5014'),[TILE.BRICK]:brickTile('#c8843c','#f8c878','#5c2c08'),[TILE.HARD]:faceTile('#b8743c','#7c4414','#e8a868'),[TILE.USED]:usedTile('#7c4414')});
 sets.slots=Wk(sets.strip,{[TILE.TREE_L]:feltTop('l'),[TILE.TREE_M]:feltTop('m'),[TILE.TREE_R]:feltTop('r'),[TILE.TRUNK]:slotFace});
 sets.casino=Wk(sets.castle,{[TILE.CASTLE]:brickTile('#8c0c1c','#f8c838','#3c0408'),[TILE.HARD]:goldBlock,[TILE.BRIDGE]:goldBlock,[TILE.LAVA_TOP]:acid[0],[TILE.LAVA]:acid[1],[TILE.USED]:usedTile('#5c0810')});
 sets.jungle=Wk(sets.over,{[TILE.GROUND]:capGround('#3cb83c','#8cf05c','#7c4c24','#4c2c10'),[TILE.BRICK]:brickTile('#6c7c4c','#a8c07c','#2c3414'),[TILE.HARD]:faceTile('#7c7c6c','#4c4c3c','#a8a890'),[TILE.USED]:usedTile('#4c3c1c')});
 sets.dig=Wk(sets.over,{[TILE.GROUND]:faceTile('#8c5c34','#5c3414','#b8844c'),[TILE.BRICK]:brickTile('#a8743c','#e0b07c','#3c2008'),[TILE.HARD]:faceTile('#6c6c5c','#3c3c2c','#9c9c8c'),[TILE.USED]:usedTile('#5c3414')});
 sets.ruins=Wk(sets.jungle,{[TILE.TREE_L]:capTop('#5cb83c','#9cf07c','#8c8c7c')('l'),[TILE.TREE_M]:capTop('#5cb83c','#9cf07c','#8c8c7c')('m'),[TILE.TREE_R]:capTop('#5cb83c','#9cf07c','#8c8c7c')('r'),[TILE.TRUNK]:faceTile('#7c7c6c','#4c4c3c','#a8a890')});
 sets.volcano=Wk(sets.castle,{[TILE.CASTLE]:faceTile('#3c2c2c','#1c1010','#6c3c2c'),[TILE.HARD]:faceTile('#5c3c2c','#2c1810','#8c5c3c'),[TILE.USED]:usedTile('#3c1c14')});
 sets.hell=Wk(sets.over,{[TILE.GROUND]:capGround('#e85c1c','#fca044','#5c2c2c','#2c1010'),[TILE.BRICK]:fleshTile,[TILE.HARD]:techTile,[TILE.USED]:usedTile('#3c1c1c')});
 sets.hellcave=Wk(sets.hell,{[TILE.GROUND]:faceTile('#5c2c2c','#2c1010','#8c4c3c')});
 sets.bones=Wk(sets.hell,{[TILE.TREE_L]:boneTop('l'),[TILE.TREE_M]:boneTop('m'),[TILE.TREE_R]:boneTop('r'),[TILE.TRUNK]:faceTile('#3c1c1c','#1c0808','#5c2c2c')});
 sets.fortress=Wk(sets.castle,{[TILE.CASTLE]:techTile,[TILE.HARD]:fleshTile,[TILE.BRIDGE]:techTile,[TILE.USED]:usedTile('#2c2c34')});
 sets.heaven=Wk(sets.over,{[TILE.GROUND]:cloudTile,[TILE.BRICK]:brickTile('#f8e8a8','#fcfcf0','#c8a848'),[TILE.HARD]:goldBlock,[TILE.USED]:usedTile('#c8a848')});
 sets.gates=Wk(sets.heaven,{[TILE.TREE_L]:capTop('#fcfcfc','#ffffff','#f8e8a8')('l'),[TILE.TREE_M]:capTop('#fcfcfc','#ffffff','#f8e8a8')('m'),[TILE.TREE_R]:capTop('#fcfcfc','#ffffff','#f8e8a8')('r'),[TILE.TRUNK]:marbleTile});
 sets.throne=Wk(sets.castle,{[TILE.CASTLE]:marbleTile,[TILE.HARD]:goldBlock,[TILE.BRIDGE]:goldBlock,[TILE.LAVA_TOP]:liquid('#fcfcfc','#ffffff','#bcd8f8')[0],[TILE.LAVA]:liquid('#fcfcfc','#ffffff','#bcd8f8')[1],[TILE.USED]:usedTile('#c8a848')});
 // the cloud areas at the top of a beanstalk
 sets.sky=Wk(sets.over,{[TILE.GROUND]:cloudTile,[TILE.HARD]:cloudTile});
 sets.bigtop={...sets.castle,[TILE.CASTLE]:circusTile,[TILE.GROUND]:circusTile,[TILE.HARD]:post,[TILE.BRIDGE]:tightTile,[TILE.USED]:usedTile('#5c0810'),q};
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
   // windows are numbered inside their tower (column, row), so which ones are lit never changes as the camera moves
   for(let r=0,yy=y+4;yy<base-6;r++,yy+=7)for(let c=0,xx=x+3;xx<x+w-4;c++,xx+=6){if(litP?hash(i*977+c*131+r*17+(k*100|0))<litP:hash(i*31+r)<.5){g.fillStyle=win;g.fillRect(xx,yy,3,3);}}}}
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
// the boardwalk at night: stars, the moon, a Ferris wheel turning far off (or roller-coaster hills), strings of bulbs
function drawCarnivalNight(g,camX,viewW,t,coaster){
 for(let k=0;k<40;k++){const x=camX+((hash(k*7)*viewW*1.4-camX*.05)%(viewW+40)+viewW+40)%(viewW+40)-20,y=40+hash(k*11)*110;g.fillStyle=hash(k*5+((t*2)|0))>.85?'#fcfcfc':'#8c84bc';g.fillRect(x,y,1,1);}
 const mx=camX+viewW*.78-camX*.02%40;g.fillStyle='#fcf4c8';g.beginPath();g.arc(mx,64,14,0,7);g.fill();g.fillStyle='#160e36';g.beginPath();g.arc(mx+6,60,12,0,7);g.fill();
 const base=13*T,k=.3,sp=640,off=camX*k;
 for(let i=Math.floor((off-sp)/sp);i<=Math.ceil((off+viewW+sp)/sp);i++){const x=camX-off+i*sp+sp*.4;
  if(coaster||i%2){g.strokeStyle='#3c2c6c';g.lineWidth=3;g.beginPath();for(let u=-200;u<=200;u+=8){const y=base-30-60*Math.abs(Math.sin((u+i*97)/70));u===-200?g.moveTo(x+u,y):g.lineTo(x+u,y);}g.stroke();g.lineWidth=1;for(let u=-200;u<=200;u+=16){const y=base-30-60*Math.abs(Math.sin((u+i*97)/70));g.fillStyle='#2c2058';g.fillRect(x+u,y,2,base-y);}}
  else{const cy=base-92,R=74;g.strokeStyle='#3c2c6c';g.lineWidth=2;g.beginPath();g.arc(x,cy,R,0,7);g.stroke();g.fillStyle='#2c2058';g.beginPath();g.moveTo(x-30,base);g.lineTo(x,cy);g.lineTo(x+30,base);g.closePath();g.fill();
   for(let s=0;s<10;s++){const a=t*.25+s*Math.PI/5,ex=x+Math.cos(a)*R,ey=cy+Math.sin(a)*R;g.strokeStyle='#3c2c6c';g.lineWidth=1;g.beginPath();g.moveTo(x,cy);g.lineTo(ex,ey);g.stroke();g.fillStyle=s%2?'#f8d878':'#fc7460';g.fillRect(ex-3,ey,6,5);}}}
 const lk=.6,lsp=96,loff=camX*lk;for(let i=Math.floor((loff-lsp)/lsp);i<=Math.ceil((loff+viewW+lsp)/lsp);i++){const x0=camX-loff+i*lsp;for(let u=0;u<lsp;u+=8){const y=70+18*Math.sin(u/lsp*Math.PI);g.fillStyle=['#fc7460','#f8d878','#7cd8fc','#9cfc88'][(i*12+u/8|0)%4];if((((t*3)|0)+u/8)%5)g.fillRect(x0+u,y,2,2);}}
}
// inside the funhouse: swirling purple stripes
function drawFunhouseBg(g,camX,viewW,top,bottom){const k=.4,off=camX*k;g.fillStyle='#3c1450';for(let x=Math.floor((off-60)/24)*24;x<off+viewW+bottom;x+=24){g.beginPath();g.moveTo(camX-off+x,top);g.lineTo(camX-off+x+12,top);g.lineTo(camX-off+x+12-(bottom-top),bottom);g.lineTo(camX-off+x-(bottom-top),bottom);g.closePath();g.fill();}}
// a mirror zone: framed silver panels with a shine sliding across (left and right are swapped in front of them)
function drawMirrors(g,x0,x1,top,bottom,t){for(let x=x0;x<x1;x+=2*T){const w=Math.min(2*T,x1-x)-2;const grd=g.createLinearGradient(x,top,x+w,bottom);grd.addColorStop(0,'#5c6c8c');grd.addColorStop(.5,'#bcc8e8');grd.addColorStop(1,'#4c5c7c');
  g.fillStyle='#f8c838';g.fillRect(x,top,w+2,bottom-top);g.fillStyle=grd;g.fillRect(x+2,top+2,w-2,bottom-top-4);
  const sx=x+2+((t*40+x*.3)%(w+30))-20;g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.moveTo(sx,top+2);g.lineTo(sx+8,top+2);g.lineTo(sx-14,bottom-2);g.lineTo(sx-22,bottom-2);g.closePath();g.fill();}}
// inside the big top: canvas stripes and bunting
function drawBigTopBg(g,camX,viewW,top,bottom,t){const k=.3,off=camX*k,sp=32;for(let i=Math.floor((off-sp)/sp);i<=Math.ceil((off+viewW+sp)/sp);i++){g.fillStyle=i%2?'#4c0814':'#2c040c';g.fillRect(camX-off+i*sp,top,sp,bottom-top);}
 const lsp=80,loff=camX*.6;for(let i=Math.floor((loff-lsp)/lsp);i<=Math.ceil((loff+viewW+lsp)/lsp);i++){const x0=camX-loff+i*lsp;for(let u=0;u<lsp;u+=10){const y=58+14*Math.sin(u/lsp*Math.PI);g.fillStyle=(i+u/10|0)%2?'#f8c838':'#fcfcfc';g.beginPath();g.moveTo(x0+u,y);g.lineTo(x0+u+8,y);g.lineTo(x0+u+4,y+7);g.closePath();g.fill();}}}
// boardwalk furniture (feet at the boards)
function drawPierProp(g,d,t){const b=13*T,x=d.x;g.save();
 if(d.type==='stall'){const w=3*T,cols=[['#e8203c','#fcfcfc'],['#2c7cfc','#fcfcfc'],['#2ca83c','#f8d878']][d.n||0];g.fillStyle='#5c3c24';g.fillRect(x+2,b-40,3,40);g.fillRect(x+w-5,b-40,3,40);g.fillStyle='#8c5c34';g.fillRect(x,b-16,w,16);g.fillStyle='#c8946c';g.fillRect(x,b-16,w,2);
  for(let k=0;k<6;k++){g.fillStyle=cols[k%2];g.fillRect(x+k*8,b-48,8,10);g.beginPath();g.arc(x+k*8+4,b-38,4,0,Math.PI);g.fill();}
  g.fillStyle='#f8d878';for(let k=0;k<3;k++){g.beginPath();g.arc(x+10+k*14,b-22,4,0,7);g.fill();}nesText(g,['RING TOSS','DUNK TANK','WIN A FISH'][d.n||0],x+2,b-58,'#f8d878',.55,.9);}
 else if(d.type==='balloons'){for(let k=0;k<4;k++){const bx=x+(k-1.5)*6,by=b-40-(k%2)*7+Math.sin(t*2+k)*1.5;g.strokeStyle='#bcbcbc';g.beginPath();g.moveTo(x,b-6);g.lineTo(bx,by+5);g.stroke();g.fillStyle=['#e8203c','#f8d878','#2c7cfc','#9cfc88'][k];g.beginPath();g.ellipse(bx,by,4,5,0,0,7);g.fill();}g.fillStyle='#5c3c24';g.fillRect(x-3,b-6,6,6);}
 else if(d.type==='funsign'){g.fillStyle='#5c3c24';g.fillRect(x+4,b-54,3,54);g.fillRect(x+60,b-54,3,54);g.fillStyle='#6c1c8c';g.fillRect(x,b-70,68,18);g.fillStyle='#f8d878';for(let k=0;k<17;k++)if(((t*4|0)+k)%3)g.fillRect(x+2+k*4,b-69,2,2);nesText(g,'FUNHOUSE',x+3,b-64,'#fcfcfc',1,1);}
 g.restore();}
// Worlds 4-8 backdrops: a far layer and a near layer of shapes sliding at different speeds, plus weather
function layer(g,camX,viewW,k,sp,fn){const off=camX*k;for(let i=Math.floor((off-sp*2)/sp);i<=Math.ceil((off+viewW+sp)/sp);i++)fn(camX-off+i*sp,i);}
function drawThemeBg(g,camX,viewW,kind,t,y0,y1,wind){const base=13*T;
 const peaks=(col,cap,k,sp,hmin,hmax)=>layer(g,camX,viewW,k,sp,(x,i)=>{const h=hmin+hash(i*17+sp)*(hmax-hmin),w=sp*1.3;g.fillStyle=col;g.beginPath();g.moveTo(x-w/2,base);g.lineTo(x,base-h);g.lineTo(x+w/2,base);g.fill();if(cap){g.fillStyle=cap;g.beginPath();g.moveTo(x-h*.22,base-h*.75);g.lineTo(x,base-h);g.lineTo(x+h*.22,base-h*.75);g.lineTo(x+h*.08,base-h*.7);g.lineTo(x-h*.06,base-h*.78);g.fill();}});
 const towers=(col,k,sp,hmin,hmax,deco)=>layer(g,camX,viewW,k,sp,(x,i)=>{const h=hmin+hash(i*23+sp)*(hmax-hmin),w=sp*.6;g.fillStyle=col;g.fillRect(x,base-h,w,h);if(deco)deco(x,base-h,w,h,i);});
 const specks=(col,n,vy,vx)=>{g.fillStyle=col;for(let k=0;k<n;k++){const x=camX+((hash(k*3)*viewW+t*vx*(.5+hash(k*7)))%(viewW+20)+viewW+20)%(viewW+20)-10,y=y0+((hash(k*5)*(y1-y0)+t*vy*(.5+hash(k*11)))%(y1-y0)+(y1-y0))%(y1-y0);g.fillRect(x,y,1.5,1.5);}};
 switch(kind){
  case 'snow':case 'skilift':peaks('#a8c8ec','#fcfcfc',.15,260,90,170);peaks('#7ca0d0','#fcfcfc',.35,180,50,110);
   layer(g,camX,viewW,.6,40,(x,i)=>{if(hash(i*9)<.55){const h=20+hash(i*13)*18;g.fillStyle='#2c5c4c';g.beginPath();g.moveTo(x-9,base);g.lineTo(x,base-h);g.lineTo(x+9,base);g.fill();g.fillStyle='#fcfcfc';g.fillRect(x-2,base-h,4,3);}});
   if(kind==='skilift'){g.strokeStyle='#3c3c4c';g.lineWidth=1;g.beginPath();g.moveTo(camX,48);g.lineTo(camX+viewW,40);g.stroke();layer(g,camX,viewW,.8,90,(x)=>{g.fillStyle='#e8203c';g.fillRect(x,46,12,3);g.fillRect(x+5,40,1,7);});}
   specks('#ffffff',50,22,-6);break;
  case 'icecave':layer(g,camX,viewW,.4,36,(x,i)=>{const h=10+hash(i*7)*40;g.fillStyle='#1c4c7c';g.beginPath();g.moveTo(x-8,3*T);g.lineTo(x,3*T+h);g.lineTo(x+8,3*T);g.fill();});
   layer(g,camX,viewW,.5,60,(x,i)=>{if(hash(i*3)<.5){g.fillStyle='rgba(140,216,252,.25)';g.beginPath();g.moveTo(x,base);g.lineTo(x+6,base-30-hash(i)*30);g.lineTo(x+12,base);g.fill();}});break;
  case 'icepalace':layer(g,camX,viewW,.3,64,(x)=>{g.fillStyle='#bce0f8';g.fillRect(x,3*T,40,base-3*T);g.fillStyle='#e8f8ff';g.beginPath();g.arc(x+20,6*T,16,Math.PI,0);g.fill();g.fillRect(x+4,6*T,32,base-6*T);});specks('#ffffff',30,14,-4);break;
  case 'strip':drawSkyline(g,camX,viewW,true);towers('#1c0c2c',.55,70,60,140,(x,y,w,h,i)=>{const c=['#fc3cbc','#3cfcfc','#fcf03c','#fc7c3c'][i&3];g.fillStyle=((t*3|0)+i)%4?c:'#3c1c4c';g.fillRect(x+4,y+10,w-8,8);g.fillRect(x+w/2-1,y-14,2,14);});
   layer(g,camX,viewW,.8,110,(x,i)=>{if(hash(i)<.6){g.fillStyle='#0c0814';g.fillRect(x,base-46,3,46);for(const a of [-1,-.4,.3,1])g.fillRect(x+1+a*9,base-48+Math.abs(a)*4,8,2);}});break;
  case 'desert':layer(g,camX,viewW,.15,300,(x,i)=>{g.fillStyle='#e8a860';g.beginPath();g.ellipse(x,base,170,40+hash(i)*30,0,Math.PI,0);g.fill();});
   layer(g,camX,viewW,.4,200,(x,i)=>{g.fillStyle='#d88c48';g.beginPath();g.ellipse(x,base,120,24+hash(i*3)*24,0,Math.PI,0);g.fill();if(hash(i*5)<.5){g.fillStyle='#4c7c2c';g.fillRect(x+30,base-34,5,34);g.fillRect(x+24,base-26,6,3);g.fillRect(x+24,base-32,3,8);}});
   if(wind){g.fillStyle='rgba(248,216,160,.6)';for(let k=0;k<26;k++){const x=camX+((hash(k*3)*viewW-t*260*(1+hash(k)))%viewW+viewW)%viewW,y=y0+hash(k*7)*(y1-y0);g.fillRect(x,y,18+hash(k)*16,1);}}break;
  case 'slots':layer(g,camX,viewW,.35,56,(x,i)=>{g.fillStyle='#3c0810';g.fillRect(x,6*T,40,base-6*T);g.fillStyle=((t*4|0)+i)%3?'#f8c838':'#fc3c3c';g.fillRect(x+4,6*T+4,32,3);g.fillStyle='#1c0408';g.fillRect(x+6,7*T+2,28,14);});break;
  case 'casino':layer(g,camX,viewW,.3,36,(x,i)=>{g.fillStyle=i%2?'#5c0810':'#3c0408';g.fillRect(x,y0,36,y1-y0);});layer(g,camX,viewW,.6,96,(x)=>{g.fillStyle='#f8c838';g.beginPath();g.arc(x,4*T,6,0,7);g.fill();g.fillRect(x-1,3*T,2,T);});break;
  case 'jungle':case 'ruins':peaks('#2c6c4c',null,.1,400,120,160);layer(g,camX,viewW,.1,800,(x)=>{g.fillStyle='#4c2c2c';g.beginPath();g.moveTo(x-90,base);g.lineTo(x-20,base-150);g.lineTo(x+20,base-150);g.lineTo(x+90,base);g.fill();g.fillStyle='#fc5c1c';g.fillRect(x-14,base-152,28,4);g.fillStyle='rgba(120,120,120,.5)';g.beginPath();g.arc(x+6,base-170-(t*8%30),12,0,7);g.fill();});
   if(kind==='ruins')towers('#5c6c5c',.3,140,60,110,(x,y,w)=>{g.fillStyle='#3c4c3c';for(let yy=y+8;yy<base;yy+=14)g.fillRect(x+3,yy,w-6,2);});
   layer(g,camX,viewW,.5,50,(x,i)=>{g.fillStyle='#1c5c2c';g.beginPath();g.ellipse(x,base-30-hash(i)*40,22,14,0,0,7);g.fill();g.fillStyle='#3c2c14';g.fillRect(x-2,base-30,4,30);});break;
  case 'dig':layer(g,camX,viewW,.35,90,(x,i)=>{g.fillStyle='#3c2414';g.fillRect(x,3*T,70,base-3*T);if(hash(i)<.5){g.strokeStyle='#d8c8a8';g.lineWidth=2;g.beginPath();g.arc(x+35,8*T,14,Math.PI*.2,Math.PI*.9);g.stroke();for(let k=0;k<4;k++)g.fillRect(x+24+k*6,8*T+4,2,8);g.lineWidth=1;}});break;
  case 'volcano':case 'hellcave':layer(g,camX,viewW,.3,48,(x,i)=>{g.fillStyle=kind==='volcano'?'#3c1410':'#2c0808';g.fillRect(x,3*T,34,base-3*T);if(hash(i)<.35){g.fillStyle='#fc7c1c';g.fillRect(x+14,3*T,4,base-3*T);g.fillStyle='#fcd84c';g.fillRect(x+15,3*T,1,base-3*T);}});
   g.fillStyle='rgba(252,92,28,.25)';g.fillRect(camX,base-16,viewW,y1-base+16);specks('#fc9c3c',30,-18,0);break;
  case 'hell':case 'bones':g.fillStyle='#5c0808';g.fillRect(camX,base-60,viewW,y1-base+60);peaks('#3c0404',null,.15,160,80,170);peaks('#1c0202',null,.4,110,40,110);
   if(kind==='bones')layer(g,camX,viewW,.7,70,(x)=>{g.fillStyle='#6c6c6c';for(let y=y0;y<3*T+20;y+=5)g.fillRect(x,y,3,3);});
   specks('#fc7c1c',40,-20,3);break;
  case 'fortress':layer(g,camX,viewW,.3,48,(x,i)=>{g.fillStyle='#24242c';g.fillRect(x,y0,46,y1-y0);g.fillStyle='#14141a';g.fillRect(x+46,y0,2,y1-y0);if(i%3===0){g.fillStyle='#a81418';g.beginPath();g.arc(x+23,6*T,7,0,7);g.fill();g.fillStyle='#24242c';g.fillRect(x+19,6*T,2,3);g.fillRect(x+25,6*T,2,3);}});
   g.fillStyle='rgba(200,20,20,'+(.12+.06*Math.sin(t*3))+')';g.fillRect(camX,y0,viewW,y1-y0);break;
  case 'heaven':case 'gates':{const gr=g.createLinearGradient(0,y0,0,base);gr.addColorStop(0,'#bcdcfc');gr.addColorStop(1,'#fcf4dc');g.fillStyle=gr;g.fillRect(camX,y0,viewW,base-y0);
   g.fillStyle='rgba(255,248,200,.25)';for(let k=0;k<5;k++){const x=camX+viewW*.7;g.beginPath();g.moveTo(x,20);g.lineTo(x-160+k*70,base);g.lineTo(x-130+k*70,base);g.closePath();g.fill();}
   layer(g,camX,viewW,.2,140,(x,i)=>{g.fillStyle='#fcfcfc';g.beginPath();g.ellipse(x,90+hash(i)*60,40,12,0,0,7);g.fill();});
   if(kind==='gates')layer(g,camX,viewW,.35,300,(x)=>{g.fillStyle='#f8d878';g.fillRect(x-40,base-140,8,140);g.fillRect(x+32,base-140,8,140);g.strokeStyle='#f8d878';g.lineWidth=2;for(let k=-30;k<32;k+=8){g.beginPath();g.moveTo(x+k,base);g.lineTo(x+k,base-120);g.stroke();}g.beginPath();g.arc(x,base-120,40,Math.PI,0);g.stroke();g.lineWidth=1;});
   layer(g,camX,viewW,.55,90,(x,i)=>{g.fillStyle='#fcfcfc';g.beginPath();g.ellipse(x,base-6,34,14+hash(i)*8,0,Math.PI,0);g.fill();});break;}
  case 'throne':layer(g,camX,viewW,.3,64,(x)=>{g.fillStyle='#e8e0c8';g.fillRect(x,3*T,14,base-3*T);g.fillStyle='#f8c838';g.fillRect(x-2,3*T,18,4);g.fillRect(x-2,base-6,18,6);});
   g.fillStyle='rgba(255,248,200,'+(.15+.05*Math.sin(t*2))+')';g.fillRect(camX,y0,viewW,y1-y0);break;}
}
// themed props standing on the ground
function drawThemeProp(g,d,t){const b=13*T,x=d.x;g.save();
 switch(d.type){
  case 'pine':g.fillStyle='#5c3c24';g.fillRect(x-2,b-8,4,8);g.fillStyle='#2c6c4c';for(let k=0;k<3;k++){g.beginPath();g.moveTo(x-12+k*3,b-8-k*9);g.lineTo(x,b-26-k*9);g.lineTo(x+12-k*3,b-8-k*9);g.fill();}g.fillStyle='#fcfcfc';g.fillRect(x-3,b-44,6,3);break;
  case 'snowman':g.fillStyle='#fcfcfc';g.beginPath();g.arc(x,b-7,7,0,7);g.arc(x,b-18,5,0,7);g.fill();g.fillStyle='#000';g.fillRect(x-2,b-20,1,1);g.fillRect(x+1,b-20,1,1);g.fillStyle='#fc7c1c';g.fillRect(x,b-18,4,1);g.fillStyle='#e8203c';g.fillRect(x-5,b-14,10,2);break;
  case 'neon':{const c=['#fc3cbc','#3cfcfc','#fcf03c'][(x/16|0)%3];g.fillStyle='#2c2c2c';g.fillRect(x-1,b-40,3,40);g.fillStyle='#000';g.fillRect(x-20,b-62,42,22);g.strokeStyle=((t*3|0)+(x|0))%5?c:'#3c1c4c';g.strokeRect(x-19,b-61,40,20);nesText(g,['CASINO','SLOTS','24 HR'][(x/16|0)%3],x-17,b-55,c,.7,1);break;}
  case 'cactusd':g.fillStyle='#3c8c3c';g.fillRect(x-3,b-28,6,28);g.fillRect(x-10,b-18,4,8);g.fillRect(x-10,b-14,8,3);g.fillRect(x+6,b-22,4,8);g.fillRect(x+3,b-18,7,3);break;
  case 'skull':g.fillStyle='#e8e0c8';g.beginPath();g.arc(x,b-6,5,0,7);g.fill();g.fillRect(x-3,b-3,6,3);g.fillStyle='#000';g.fillRect(x-3,b-8,2,2);g.fillRect(x+1,b-8,2,2);break;
  case 'fern':g.fillStyle='#2c8c3c';for(let k=-2;k<=2;k++){g.beginPath();g.ellipse(x+k*5,b-10+Math.abs(k)*2,3,11,k*.4,0,7);g.fill();}break;
  case 'fence':g.fillStyle='#6c6c6c';for(const dx of [-14,14])g.fillRect(x+dx-1,b-40,3,40);g.fillStyle='#9c9c9c';for(let y=b-36;y<b-4;y+=6)g.fillRect(x-14,y,28,1);g.fillStyle='#f8d838';g.fillRect(x-8,b-24,16,7);g.fillStyle='#000';nesText(g,'DANGER',x-8,b-23,'#000',.34,.6);break;
  case 'fossil':g.strokeStyle='#e8d8b8';g.lineWidth=2;g.beginPath();g.arc(x,b-12,8,Math.PI,0);g.stroke();for(let k=0;k<4;k++)g.fillRect(x-6+k*4,b-12,2,6);g.lineWidth=1;break;
  case 'torch':g.fillStyle='#5c4c3c';g.fillRect(x-1,b-24,3,24);g.fillStyle=Math.floor(t*10)%2?'#fc9c1c':'#fcd84c';g.beginPath();g.ellipse(x,b-28,4,6,0,0,7);g.fill();break;
  case 'firepot':g.fillStyle='#3c3c44';g.fillRect(x-6,b-10,12,10);g.fillStyle=Math.floor(t*10)%2?'#fc5c1c':'#fcd84c';g.beginPath();g.moveTo(x-6,b-10);g.lineTo(x,b-24-Math.sin(t*9)*3);g.lineTo(x+6,b-10);g.fill();break;
  case 'harp':g.strokeStyle='#f8c838';g.lineWidth=2;g.beginPath();g.moveTo(x-6,b);g.quadraticCurveTo(x-10,b-30,x+6,b-34);g.lineTo(x+6,b);g.stroke();g.lineWidth=1;for(let k=-4;k<6;k+=3){g.beginPath();g.moveTo(x+k,b-2);g.lineTo(x+k,b-28+k);g.stroke();}break;
 }g.restore();}
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
// a boardwalk ghost: chases you while your back is turned, covers its face when you look at it
function drawGhost(g,e,t){g.save();g.translate(e.x,e.y-8+Math.sin(t*3+e.x)*1.5);if(e.state==='dying'){g.scale(1,-1);}g.scale(e.dir>0?-1:1,1);g.globalAlpha*=e.shy?.75:.95;
 g.fillStyle='#f0f0fc';g.beginPath();g.arc(0,-2,8,Math.PI,0);g.lineTo(8,6);for(let k=0;k<4;k++)g.lineTo(8-4*k-2,6+(k%2?-2:2)),g.lineTo(8-4*k-4,6);g.closePath();g.fill();
 if(e.shy){g.fillStyle='#fcbcd8';g.fillRect(-6,1,3,2);g.fillRect(3,1,3,2);g.fillStyle='#d8d8ec';g.fillRect(-7,-4,5,4);g.fillRect(2,-4,5,4);}
 else{g.fillStyle='#000';g.fillRect(-5,-4,3,4);g.fillRect(1,-4,3,4);g.fillStyle='#e8203c';g.fillRect(-3,2,5,3);}g.restore();}
// Worlds 3-8 enemies (our own designs; feet at x,y)
function drawFoe(g,e,t){g.save();g.translate(e.x,e.y);if(e.state==='dying'){g.scale(1,-1);g.translate(0,e.type==='trex'?32:20);}
 if(e.hit>0&&(e.hit>>1)%2)g.globalAlpha*=.4;const f=(e.vx>0||e.dir>0&&!e.vx)?-1:1,st=Math.floor(e.frame*7)%2,R=(c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};
 switch(e.type){
  case 'slasher':g.scale(f,1);if(e.state==='down'){R('#1c2c4c',-12,-6,22,6);R('#fcfcf0',-16,-7,6,6);R('#3c2c1c',-17,-8,3,6);break;}
   R('#1c2c4c',-5,-18,10,12);R('#1c2c4c',-5,-6,4,6-st*2);R('#1c2c4c',1,-6,4,4+st*2);R('#000',-5,-1,4,1);R('#000',1,-1,4,1);R('#3c2c1c',-6,-27,12,4);R('#fcfcf0',-5,-26,10,9);R('#000',-3,-23,2,1);R('#000',1,-23,2,1);R('#9c9c9c',-1,-20,2,1);
   R('#1c2c4c',-8,-17,3,7);R('#fcfcf0',-8,-10,3,2);R('#d8d8e8',-9,-20,2,10);R('#5c3c1c',-9,-10,2,3);break;
  case 'dreamer':if(e.state==='fade')g.globalAlpha*=Math.max(0,1-e.t/30);if(e.state==='appear')g.globalAlpha*=Math.min(1,e.t/30);g.scale(f,1);
   for(let k=0;k<4;k++)R(k%2?'#2c7c2c':'#c8202c',-5,-18+k*3,10,3);R('#5c3c1c',-5,-6,4,6-st*2);R('#5c3c1c',1,-6,4,4+st*2);R('#c8645c',-4,-25,8,7);R('#000',-2,-22,1,1);R('#000',1,-22,1,1);R('#8c3c2c',-3,-20,6,1);
   R('#6c4c2c',-6,-28,12,3);R('#6c4c2c',-4,-31,8,3);R('#c8645c',-9,-15,3,5);for(let k=0;k<4;k++)R('#d8d8e8',-11-k%2,-17+k*2,4,1);break;
  case 'imp':case 'brute':{const s2=e.type==='brute'?1.6:1;g.scale(f*s2,s2);R(e.type==='brute'?'#d8788c':'#a81418',-5,-11,10,8);R(e.type==='brute'?'#d8788c':'#a81418',-4,-3,3,3);R(e.type==='brute'?'#d8788c':'#a81418',1,-3,3,3);R('#fcf03c',-3,-9,2,2);R('#fcf03c',1,-9,2,2);R('#fcfcfc',-3,-6,6,1);
   R('#3c0808',-5,-14,2,3);R('#3c0808',3,-14,2,3);R('#a81418',5,-6,4,1);R('#a81418',8,-8,1,2);break;}
  case 'climber':{g.scale(f,1);const c=(e.x/16|0)%2?'#e85cbc':'#3c7cfc';R(c,-6,-18,12,12);R('#fcfcfc',-6,-19,12,2);R('#fcbc8c',-3,-15,6,5);R('#000',-2,-13,1,1);R('#000',1,-13,1,1);R('#2c2c2c',-5,-6,4,6-st*2);R('#2c2c2c',1,-6,4,4+st*2);
   if(e.mouth>0){R(c,-8,-24,3,8);break;}g.save();g.translate(-7,-12);g.rotate(e.swing?Math.sin(t*14)*1.2-.4:-.4);R('#8c5c34',-1,-12,2,12);R('#5c5c6c',-4,-15,8,4);g.restore();break;}
  case 'penguin':g.scale(f,1);R('#1c1c2c',-8,-8,16,8);R('#fcfcfc',-6,-4,11,4);R('#f8a018',-10,-6,3,2);R('#fcfcfc',-7,-7,2,2);R('#000',-7,-7,1,1);R('#f8a018',6,-2,4,2);break;
  case 'icicle':{const sh=e.state==='shake'?Math.sin(t*60):0;g.translate(sh,0);g.fillStyle='#bcecff';g.beginPath();g.moveTo(-6,-14);g.lineTo(6,-14);g.lineTo(0,2);g.fill();R('#ffffff',-3,-13,2,8);break;}
  case 'dice':g.rotate(e.vy?e.frame*6:0);R('#fcfcfc',-7,-14,14,14);R('#9c9c9c',-7,-1,14,1);R('#e8203c',-1,-8,2,2);R('#000',-5,-12,2,2);R('#000',3,-4,2,2);break;
  case 'chip':g.translate(0,-6);g.rotate(e.frame*e.vx*-4);g.fillStyle='#e8203c';g.beginPath();g.arc(0,0,6,0,7);g.fill();g.fillStyle='#fcfcfc';for(let k=0;k<4;k++){g.rotate(Math.PI/2);g.fillRect(-1,-6,2,3);}g.beginPath();g.arc(0,0,2.5,0,7);g.fill();break;
  case 'card':{const fl=Math.abs(Math.sin(e.frame*6));g.scale(fl*.8+.2,1);R('#fcfcfc',-6,-16,12,16);R('#000',-6,-16,12,1);R('#000',-6,-1,12,1);g.fillStyle='#000';g.beginPath();g.moveTo(0,-11);g.lineTo(-4,-6);g.lineTo(4,-6);g.fill();R('#000',-1,-7,2,3);R('#e8203c',-5,-15,2,2);break;}
  case 'cactus':R('#2c8c3c',-4,-22,8,22);R('#2c8c3c',-10,-16,4,8);R('#2c8c3c',-10,-11,8,3);R('#2c8c3c',6,-19,4,8);R('#2c8c3c',3,-14,6,3);R('#fcfcfc',-3,-18,2,2);R('#fcfcfc',1,-18,2,2);R('#000',-2,-17,1,1);R('#000',2,-17,1,1);R('#1c5c2c',-2,-13,4,1);
   for(const [x,y] of [[-5,-20],[5,-8],[-5,-6],[5,-16]])R('#fcf0a8',x,y,1,1);break;
  case 'raptor':g.scale(f,1);R('#6c8c3c',-8,-14,12,8);R('#6c8c3c',-12,-18,6,6);R('#fcfcfc',-11,-14,4,1);R('#000',-10,-17,1,1);R('#6c8c3c',4,-12,8,3);R('#4c6c2c',-4,-6,3,6-st*2);R('#4c6c2c',0,-6,3,4+st*2);R('#3c4c1c',-6,-12,8,1);break;
  case 'dilo':g.scale(-(e.dir||-1),1);R('#c8b83c',-5,-12,10,8);R('#c8b83c',-9,-19,6,8);R('#000',-8,-17,1,1);if(e.mouth>0){g.fillStyle='#e8203c';g.beginPath();g.arc(-6,-16,9,Math.PI*.6,Math.PI*1.6);g.fill();R('#c8b83c',-9,-19,6,8);R('#000',-8,-17,1,1);}
   R('#8c7c1c',-3,-4,3,4);R('#8c7c1c',1,-4,3,4);R('#c8b83c',5,-10,6,3);break;
  case 'trex':g.scale(f,1);R('#7c5c3c',-10,-26,20,14);R('#7c5c3c',-18,-32,14,10);R('#fcfcfc',-17,-24,12,2);R('#000',-14,-30,2,2);R('#7c5c3c',8,-22,10,5);R('#5c3c24',-8,-12,6,12-st*3);R('#5c3c24',2,-12,6,9+st*3);R('#5c3c24',-6,-18,4,3);break;
  case 'ptero':{g.scale(f,1);const fl=Math.floor(e.frame*6)%2;R('#8c5c3c',-5,-8,10,4);R('#8c5c3c',-10,-9,5,3);R('#8c5c3c',-12,-12,4,2);R('#000',-9,-8,1,1);g.fillStyle='#a8744c';g.beginPath();g.moveTo(-3,-7);g.lineTo(fl?-2:2,fl?-20:2);g.lineTo(6,-6);g.fill();break;}
  case 'skull':{g.fillStyle=Math.floor(t*12)%2?'#fc7c1c':'#fcd84c';g.beginPath();g.moveTo(-6*f+0,-8);g.lineTo(14*f,-14);g.lineTo(14*f,-2);g.fill();R('#e8e0c8',-6,-14,12,10);R('#e8e0c8',-4,-4,8,3);R('#000',-4,-11,3,3);R('#000',1,-11,3,3);break;}
  case 'floater':R('#c8202c',-9,-20,18,16);R('#a81418',-9,-6,18,2);R('#e8e0c8',-9,-24,3,5);R('#e8e0c8',6,-24,3,5);R('#fcfcfc',-3,-17,6,6);R('#2c7c2c',-1,-15,2,2);if(e.mouth>0){R('#3c0808',-6,-9,12,4);R('#fcfcfc',-5,-9,1,2);R('#fcfcfc',3,-9,1,2);}break;
  case 'angel':{R('#fcfcfc',-5,-16,10,14);R('#fcbc8c',-3,-21,6,5);R('#f8c838',-5,-26,10,2);const fl=Math.floor(e.frame*5)%2;g.fillStyle='#fcfcfc';g.beginPath();g.ellipse(-8,-14,6,fl?8:4,-.5,0,7);g.ellipse(8,-14,6,fl?8:4,.5,0,7);g.fill();R('#f8c838',6,-22,1,14);break;}
  // the cloud rider: a goggled pilot on a little cloud with a face; arm up with a spiky shell when he throws
  case 'rider':{const bob=Math.sin(t*5+e.x)*1;g.translate(0,bob);
   if(e.mouth>0){R('#e8203c',-3,-30,7,6);for(const [x,y] of [[-4,-31],[3,-31],[0,-33]])R('#fcfcfc',x,y,1,2);R('#fcbc8c',0,-25,2,4);}
   R('#2c8c8c',-5,-22,10,7);R('#5cc8c8',-5,-22,10,2);R('#fcbc8c',-4,-16,8,4);R('#3c3c4c',-5,-19,10,3);R('#8cd8fc',-4,-19,3,2);R('#8cd8fc',1,-19,3,2);
   g.fillStyle='#fcfcfc';for(const [x,y,rr] of [[-8,-8,6],[0,-10,7],[8,-8,6],[-3,-5,6],[4,-5,6]]){g.beginPath();g.arc(x,y,rr,0,7);g.fill();}
   g.fillStyle='#bcd8f8';g.fillRect(-13,-4,26,2);R('#000',-4,-9,2,3);R('#000',2,-9,2,3);R('#e8786c',-1,-6,3,1);break;}
  // the spiky shell: a red dome of white spikes on little orange feet; still curled up while it falls
  case 'spiny':{if(e.state==='egg'){g.translate(0,-6);g.rotate(e.frame*8);g.fillStyle='#e8203c';g.beginPath();g.arc(0,0,5,0,7);g.fill();g.fillStyle='#fcfcfc';for(let k=0;k<6;k++){g.rotate(Math.PI/3);g.beginPath();g.moveTo(-1.5,-4);g.lineTo(0,-8);g.lineTo(1.5,-4);g.fill();}break;}
   g.scale(f,1);g.fillStyle='#e8203c';g.beginPath();g.ellipse(1,-6,8,6,0,Math.PI,0);g.fill();R('#e8203c',-7,-6,16,3);g.fillStyle='#fcfcfc';for(const x of [-5,-1,3,7]){g.beginPath();g.moveTo(x-2,-8);g.lineTo(x,-14+Math.abs(x-1)*.5);g.lineTo(x+2,-8);g.fill();}
   R('#f8a018',-9,-6,4,4);R('#000',-8,-5,1,1);R('#f8a018',-5,-2,3,2+st);R('#f8a018',3,-2,3,3-st);break;}
  case 'cherub':{R('#fcd0b0',-5,-12,10,9);R('#fcd0b0',-4,-18,8,6);R('#f8c838',-4,-20,8,2);R('#000',-2,-16,1,1);R('#000',1,-16,1,1);const fl=Math.floor(e.frame*8)%2;g.fillStyle='#fcfcfc';g.beginPath();g.ellipse(-7,-12,4,fl?6:3,-.5,0,7);g.ellipse(7,-12,4,fl?6:3,.5,0,7);g.fill();
   g.strokeStyle='#8c5c34';g.beginPath();g.arc(-(e.dir||-1)*6,-8,6,-1.2,1.2);g.stroke();break;}
 }g.restore();}
function drawItem(g,it,simT){g.save();g.translate(it.x,it.y);
 if(it.type==='mushroom'||it.type==='1up'){const cap=it.type==='1up'?C.green:C.red;g.fillStyle=C.light;g.fillRect(-4,-7,8,7);g.fillStyle='#000';g.fillRect(-2,-6,1,3);g.fillRect(1,-6,1,3);g.fillStyle=cap;g.beginPath();g.ellipse(0,-8,8,7,0,Math.PI,0);g.fill();g.fillRect(-8,-8,16,2);g.fillStyle=C.white;g.beginPath();g.arc(0,-11,2.6,0,7);g.arc(-5,-9,1.8,0,7);g.arc(5,-9,1.8,0,7);g.fill();}
 else if(it.type==='flower'){const cyc=[C.red,C.q,C.gold,C.white][Math.floor(simT*10)%4];g.fillStyle=C.green;g.fillRect(-1,-7,2,7);g.fillRect(-6,-5,4,2);g.fillRect(2,-5,4,2);g.fillStyle=cyc;g.beginPath();g.ellipse(0,-11,7,4.5,0,0,7);g.fill();g.fillStyle=C.gold;g.beginPath();g.ellipse(0,-11,4.5,2.8,0,0,7);g.fill();g.fillStyle=C.white;g.fillRect(-2,-12,4,2);}
 else if(it.type==='skis'){g.fillStyle='#e8203c';g.fillRect(-9,-4,18,2);g.fillRect(-9,-8,18,2);g.fillRect(8,-10,2,8);g.fillStyle='#fcfcfc';g.fillRect(-5,-8,3,2);g.fillRect(-5,-4,3,2);g.fillStyle='#5c5c6c';g.fillRect(-1,-14,1,12);g.fillRect(2,-14,1,12);}
 else if(it.type==='cape'){g.fillStyle='#fcfcfc';g.beginPath();g.moveTo(-6,-14);g.lineTo(6,-14);g.lineTo(8,0);g.lineTo(-8,0);g.closePath();g.fill();g.fillStyle='#f8c838';for(let k=0;k<6;k++)g.fillRect(-5+k*2,-12+((k*5)%10),1.5,1.5);g.fillRect(-6,-15,12,2);}
 else if(it.type==='mega'){const pul=1+.08*Math.sin(simT*10);g.scale(pul*1.4,pul*1.4);g.fillStyle='#fcbc8c';g.fillRect(-4,-7,8,7);g.fillStyle='#e8a018';g.beginPath();g.ellipse(0,-8,9,8,0,Math.PI,0);g.fill();g.fillRect(-9,-8,18,2);g.fillStyle='#e8203c';g.beginPath();g.arc(0,-12,3,0,7);g.arc(-6,-9,2,0,7);g.arc(6,-9,2,0,7);g.fill();}
 else if(it.type==='yoshi'){g.fillStyle='#fcfcfc';g.beginPath();g.ellipse(0,-7,6,8,0,0,7);g.fill();g.fillStyle='#3cb83c';for(const [x,y] of [[-2,-11],[3,-6],[-3,-3]]){g.beginPath();g.arc(x,y,2,0,7);g.fill();}}
 else{g.fillStyle=Math.floor(simT*12)%2?C.gold:C.q;star5(g,0,-7,8);g.fillStyle='#000';g.fillRect(-2,-9,1,3);g.fillRect(1,-9,1,3);}
 g.restore();}
function drawFireball(g,x,y,t){const a=Math.floor(t/3)%4;g.save();g.translate(x,y);g.rotate(a*Math.PI/2);g.fillStyle=C.red;g.fillRect(-3,-3,6,6);g.fillStyle=C.gold;g.fillRect(-2,-2,3,3);g.fillStyle=C.white;g.fillRect(-1,-1,1,1);g.restore();}
function drawLift(g,l){const x0=l.x-l.w/2;
 if(l.look==='taxi'){const y=l.y,cx=l.x;g.fillStyle='#000';g.fillRect(x0-1,y+7,l.w+2,12);g.fillStyle=C.gold;g.fillRect(cx-14,y,28,9);g.fillRect(x0,y+8,l.w,10);g.fillStyle='#fcf078';g.fillRect(cx-14,y,28,2);g.fillRect(x0,y+8,l.w,2);
  g.fillStyle='#8cc8fc';g.fillRect(cx-12,y+3,10,5);g.fillRect(cx+2,y+3,10,5);g.fillStyle='#000';for(let x=x0+2;x<x0+l.w-2;x+=4)g.fillRect(x,y+13,2,2);g.fillStyle=C.white;g.fillRect(x0+l.w-3,y+10,3,3);g.fillStyle=C.red;g.fillRect(x0,y+10,2,3);
  g.fillStyle='#000';for(const X of [x0+10,x0+l.w-10]){g.beginPath();g.arc(X,y+19,5,0,7);g.fill();}g.fillStyle=C.gray;for(const X of [x0+10,x0+l.w-10])g.fillRect(X-1,y+18,3,3);return;}
 if(l.look==='coaster'){const y=l.y;g.fillStyle='#000';g.fillRect(x0-1,y+1,l.w+2,12);g.fillStyle='#e8203c';g.fillRect(x0,y+2,l.w,10);g.fillStyle='#f8d878';g.fillRect(x0,y+2,l.w,2);g.fillRect(x0,y+10,l.w,2);
  g.fillStyle='#5c0810';g.fillRect(x0+2,y-2,4,6);g.fillRect(x0+l.w/2-2,y-2,4,6);g.fillStyle='#2c2c2c';for(const X of [x0+8,x0+l.w-8]){g.beginPath();g.arc(X,y+14,3.5,0,7);g.fill();}return;}
 if(l.look==='raft'){g.fillStyle='#6c4424';g.fillRect(x0,l.y,l.w,8);g.fillStyle='#a8744c';for(let x=x0;x<x0+l.w;x+=8)g.fillRect(x,l.y,7,2);g.fillStyle='#2c1808';for(let x=x0+7;x<x0+l.w;x+=8)g.fillRect(x,l.y,1,8);return;}
 if(l.look==='trapeze'){g.fillStyle='#d8c8a0';g.fillRect(x0+3,0,1,l.y);g.fillRect(x0+l.w-4,0,1,l.y);g.fillStyle='#f8c838';g.fillRect(x0,l.y,l.w,5);g.fillStyle='#a8141c';for(let x=x0;x<x0+l.w;x+=8)g.fillRect(x,l.y+1,4,3);return;}
 if(l.look==='elevator'){g.fillStyle='#8c9cbc';g.fillRect(x0+4,0,1,l.y);g.fillRect(x0+l.w-5,0,1,l.y);g.fillStyle='#5c6c8c';g.fillRect(x0,l.y,l.w,8);g.fillStyle='#bcc8e8';g.fillRect(x0,l.y,l.w,2);
  for(let x=x0;x<x0+l.w;x+=8){g.fillStyle=C.gold;g.fillRect(x,l.y+4,4,3);g.fillStyle='#000';g.fillRect(x+4,l.y+4,4,3);}return;}g.fillStyle='#fc9838';g.fillRect(x0,l.y,l.w,8);g.fillStyle=C.light;g.fillRect(x0,l.y,l.w,2);g.fillStyle='#000';for(let x=x0+3;x<x0+l.w-2;x+=8)g.fillRect(x,l.y+4,3,2);g.fillStyle='#883000';g.fillRect(x0,l.y+7,l.w,1);}
function drawAxe(g,x,y,t,glass=false){g.save();g.translate(x,y);if(glass){g.fillStyle=C.red;g.fillRect(-7,-14,18,24);g.fillStyle='rgba(188,220,252,.45)';g.fillRect(-5,-12,14,20);g.fillStyle=C.white;g.fillRect(-4,-11,2,6);}g.fillStyle='#883000';g.fillRect(-1,-6,3,14);const sh=Math.floor(t*4)%3;g.fillStyle=[C.white,C.gray,C.q][sh];g.beginPath();g.moveTo(1,-8);g.lineTo(8,-10);g.quadraticCurveTo(11,-3,8,4);g.lineTo(1,1);g.closePath();g.fill();g.fillStyle='#000';g.fillRect(1,-8,1,9);g.restore();}
function drawBowser(g,b,simT){g.save();g.translate(b.x,b.y);if(b.dir>0)g.scale(-1,1);if(b.state==='dead'){g.scale(1,-1);g.translate(0,32);}
 const GR=b.devil?'#a81418':b.god?'#f0e0a8':C.green;
 if(b.god){g.fillStyle='rgba(252,248,200,'+(.35+.15*Math.sin(simT*4))+')';g.beginPath();g.ellipse(0,-16,26,24,0,0,7);g.fill();}
 if(b.devil){g.fillStyle='#3c0808';g.beginPath();g.moveTo(10,-24);g.lineTo(30,-36);g.lineTo(26,-22);g.lineTo(32,-14);g.lineTo(12,-12);g.fill();}
 const st=Math.floor(simT*4)%2;
 // shell, spikes, belly, head with horns and the red mane, mouth open when breathing fire
 g.fillStyle=GR;g.beginPath();g.ellipse(6,-17,11,13,0,0,7);g.fill();g.fillStyle=C.white;for(const [X,Y] of [[0,-29],[8,-30],[15,-24],[16,-14]]){g.beginPath();g.moveTo(X-3,Y+3);g.lineTo(X,Y-3);g.lineTo(X+3,Y+3);g.fill();}
 if(b.ceo){g.fillStyle='#1c2c5c';g.beginPath();g.ellipse(6,-15,10,10,0,0,7);g.fill();g.fillStyle='#2c3c7c';g.fillRect(-7,-20,4,15);g.fillRect(4,-20,4,15);
  g.fillStyle=C.white;g.fillRect(-4,-19,8,14);g.fillStyle=C.red;g.beginPath();g.moveTo(-2,-19);g.lineTo(2,-19);g.lineTo(1,-16);g.lineTo(3,-8);g.lineTo(0,-5);g.lineTo(-3,-8);g.lineTo(-1,-16);g.closePath();g.fill();
  g.fillStyle='#1c2c5c';g.fillRect(-8,-6,20,3);}
 else if(b.elvis||b.god){g.fillStyle=C.white;g.beginPath();g.ellipse(6,-15,10,10,0,0,7);g.fill();g.fillRect(-6,-20,12,16);g.fillStyle='#f8c838';for(let y=-19;y<-5;y+=3)g.fillRect(-4+(y&1),y,2,1);g.fillRect(-6,-7,12,2);if(b.elvis){g.fillStyle='#f8c838';g.fillRect(-7,-21,14,2);}}
 else if(b.safari||b.ski){g.fillStyle=b.ski?'#2c7cfc':'#b8a070';g.beginPath();g.ellipse(6,-15,10,10,0,0,7);g.fill();g.fillRect(-6,-20,12,15);g.fillStyle=b.ski?'#fcfcfc':'#8c7448';g.fillRect(-6,-14,12,2);g.fillRect(-1,-20,2,14);}
 else if(b.ring){g.fillStyle='#a8141c';g.beginPath();g.ellipse(6,-15,10,10,0,0,7);g.fill();g.fillRect(8,-10,8,10);g.fillStyle=C.gold;g.fillRect(-5,-18,9,14);g.fillStyle='#fce0a8';for(let y=-17;y<-5;y+=4)g.fillRect(-4,y,7,2);
  g.fillStyle='#a8141c';g.fillRect(-7,-20,3,15);g.fillRect(4,-20,3,15);g.fillStyle='#f8c838';for(const Y of [-17,-12,-7]){g.fillRect(-6,Y,2,2);g.fillRect(5,Y,2,2);}}
 else{g.fillStyle=C.gold;g.fillRect(-5,-18,9,14);g.fillStyle='#fce0a8';for(let y=-17;y<-5;y+=4)g.fillRect(-4,y,7,2);}
 g.fillStyle=GR;g.fillRect(-8,-6,8,6);g.fillRect(4,-6,8,6);g.fillStyle=C.white;g.fillRect(st?-9:-8,-2,3,2);g.fillRect(st?3:4,-2,3,2);
 g.fillStyle=GR;g.fillRect(-14,-30,13,11);g.fillStyle=C.gold;g.fillRect(-16,-24,6,6);g.fillStyle=C.white;g.fillRect(-12,-34,3,5);g.fillRect(-5,-35,3,6);
 g.fillStyle=C.red;g.fillRect(-2,-32,6,8);g.fillStyle='#000';g.fillRect(-11,-27,2,2);
 if(b.mouth>0){g.fillStyle='#000';g.fillRect(-17,-20,8,3);g.fillStyle=C.white;g.fillRect(-16,-20,1,1);g.fillRect(-13,-20,1,1);}
 g.fillStyle=GR;g.fillRect(-12,-17,4,4);
 if(b.ski){g.fillStyle='#e8203c';g.fillRect(-15,-35,14,5);g.fillStyle='#fcfcfc';g.beginPath();g.arc(-8,-37,3,0,7);g.fill();g.fillStyle='#3c3c4c';g.fillRect(-15,-29,10,3);g.fillStyle='#8cd8fc';g.fillRect(-14,-29,4,2);g.fillStyle='#e8203c';g.fillRect(-8,-20,12,3);}
 if(b.elvis){g.fillStyle='#1c1c1c';g.beginPath();g.ellipse(-8,-33,9,5,-.3,0,7);g.fill();g.fillRect(-15,-34,6,7);g.fillStyle='#000';g.fillRect(-15,-29,9,3);g.fillStyle='#3c3c3c';g.fillRect(-14,-29,3,1);}
 if(b.safari){g.fillStyle='#d8c890';g.beginPath();g.ellipse(-8,-33,10,4,0,0,7);g.fill();g.beginPath();g.arc(-8,-34,6,Math.PI,0);g.fill();g.fillStyle='#8c7448';g.fillRect(-14,-35,12,1);}
 if(b.devil){g.fillStyle='#1c0404';g.beginPath();g.moveTo(-14,-30);g.lineTo(-20,-44);g.lineTo(-10,-32);g.fill();g.beginPath();g.moveTo(-4,-31);g.lineTo(0,-46);g.lineTo(2,-31);g.fill();g.fillStyle='#5c5c6c';g.fillRect(-20,-40,2,36);g.beginPath();g.moveTo(-24,-42);g.lineTo(-19,-50);g.lineTo(-14,-42);g.lineTo(-16,-42);g.lineTo(-19,-46);g.lineTo(-22,-42);g.fill();}
 if(b.god){g.fillStyle='#fcfcfc';g.beginPath();g.moveTo(-16,-24);g.lineTo(-10,-6);g.lineTo(-4,-22);g.fill();g.strokeStyle='#f8d838';g.lineWidth=2;g.beginPath();g.ellipse(-7,-42,9,3,0,0,7);g.stroke();g.lineWidth=1;}
 if(b.ring){g.fillStyle='#1c1c1c';g.fillRect(-17,-33,17,2);g.fillRect(-14,-43,11,10);g.fillStyle='#a8141c';g.fillRect(-14,-36,11,2);}
 g.restore();}
function drawFlame(g,f,simT){g.save();g.translate(f.x,f.y);
 if(f.look==='hammer'){g.rotate((f.t||0)*.35*(f.vx<0?-1:1));g.fillStyle='#8c5c34';g.fillRect(-1,-1,2,9);g.fillStyle='#5c5c6c';g.fillRect(-4,-5,8,5);g.fillStyle='#9c9cac';g.fillRect(-4,-5,8,1);g.restore();return;}
 if(f.look==='venom'){g.fillStyle='#8cf03c';g.beginPath();g.arc(0,0,3,0,7);g.fill();g.fillStyle='#e8fcb8';g.fillRect(-1,-1,1,1);g.restore();return;}
 if(f.look==='note'){g.fillStyle=Math.floor(simT*8)%2?'#f8c838':'#fcfcfc';g.beginPath();g.ellipse(-2,2,3,2.2,-.4,0,7);g.fill();g.fillRect(0,-8,1.5,10);g.fillRect(0,-8,5,2);g.restore();return;}
 if(f.look==='bolt'||f.look==='holy'){g.fillStyle=f.look==='holy'?'#fcfcfc':'#fcf03c';g.beginPath();g.moveTo(-8,0);g.lineTo(-2,-3);g.lineTo(0,1);g.lineTo(8,-2);g.lineTo(2,3);g.lineTo(0,-1);g.closePath();g.fill();if(f.look==='holy'){g.fillStyle='rgba(252,240,168,.5)';g.beginPath();g.ellipse(0,0,12,5,0,0,7);g.fill();}g.restore();return;}
 if(f.look==='arrow'){g.scale(Math.sign(f.vx)||1,1);g.fillStyle='#8c5c34';g.fillRect(-7,-.5,12,1.5);g.fillStyle='#bcbcbc';g.beginPath();g.moveTo(5,-2.5);g.lineTo(9,0);g.lineTo(5,2.5);g.fill();g.fillStyle='#fcfcfc';g.fillRect(-8,-2,3,4);g.restore();return;}
 if(f.look==='ice'){g.fillStyle='#8cd8fc';g.beginPath();g.ellipse(4,0,12,3.2,0,0,7);g.fill();g.fillStyle='#fcfcfc';g.fillRect(-8,-1,8,2);g.restore();return;}const fl=Math.floor(simT*12)%2;g.fillStyle=C.red;g.beginPath();g.ellipse(4,0,12,fl?3.5:3,0,0,7);g.fill();g.fillStyle=C.q;g.beginPath();g.ellipse(0,0,8,2.2,0,0,7);g.fill();g.fillStyle=C.white;g.fillRect(-8,-1,6,2);g.restore();}
// a beanstalk: a stem with leaves on alternate sides and a curl at the tip
function drawVine(g,x,top,bottom){if(bottom<=top)return;g.fillStyle='#00a800';g.fillRect(x-1,top,2,bottom-top);
 for(let y=bottom-6;y>top+4;y-=8){const sd=((y/8|0)%2)?1:-1;g.fillStyle='#b8f818';g.beginPath();g.ellipse(x+sd*4,y,4,2,sd*.5,0,7);g.fill();g.fillStyle='#00a800';g.fillRect(x+(sd>0?1:-4),y,3,1);}
 g.fillStyle='#b8f818';g.beginPath();g.arc(x+1,top+2,3,0,7);g.fill();g.fillStyle='#00a800';g.fillRect(x,top+1,2,2);}
function drawToad(g,x,y){g.save();g.translate(x,y);g.fillStyle='#0058f8';g.fillRect(-5,-11,10,7);g.fillStyle=C.white;g.fillRect(-4,-4,8,2);g.fillStyle=C.olive;g.fillRect(-5,-2,4,2);g.fillRect(1,-2,4,2);
 g.fillStyle=C.skin;g.fillRect(-5,-17,10,6);g.fillStyle='#000';g.fillRect(-3,-15,1,2);g.fillRect(2,-15,1,2);
 g.fillStyle=C.white;g.beginPath();g.ellipse(0,-19,9,7,0,Math.PI,0);g.fill();g.fillRect(-9,-19,18,3);g.fillStyle=C.red;g.beginPath();g.arc(0,-23,3,0,7);g.arc(-6,-19,2,0,7);g.arc(6,-19,2,0,7);g.fill();g.restore();}
function drawFirework(g,f){const k=f.t/30;g.save();g.translate(f.x,f.y);g.fillStyle=k<.33?C.white:k<.66?C.q:C.red;const r=4+k*14;for(let a=0;a<8;a++){const an=a*Math.PI/4;g.fillRect(Math.cos(an)*r-1.5,Math.sin(an)*r-1.5,3,3);}g.restore();}

Object.assign(exports,{drawVine,drawThemeBg,drawThemeProp,drawFoe,drawCarnivalNight,drawFunhouseBg,drawMirrors,drawBigTopBg,drawPierProp,drawGhost,drawSkyline,drawTowerGlass,drawCityProp,drawCheep,drawBlooper,C,nesText,textW,tileSets,drawCloud,drawHill,drawCastle,drawCastleFlag,drawFlagpole,drawLogo,drawCoin,drawGoomba,drawKoopa,drawPiranha,drawItem,drawFireball,drawLift,drawAxe,drawBowser,drawFlame,drawToad,drawFirework,star5});
