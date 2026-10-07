// The Pokémon warp zone: a Kanto-style route drawn in Game Boy Color tiles (50-unit
// tiles, 16x16 pixel art), no minigames. Spaces are tall grass (wild encounters), plain
// route, item balls and a Pokémon Center; trainers stand beside the path facing it and
// battle anyone who steps into their line of sight. The Gym at the end holds the rival.
const {seededRandom,escapeHTML:e,shuffle}=require("src/utils.js");
const {portraitURL,portraitFallbackURL}=require("src/assets.js");
const {headDisplayURL}=require("src/headCutouts.js");
const {CHARACTERS,character}=require("src/characters.js");
const T=50,COLS=36,ROWS=24,W=COLS*T,H=ROWS*T,STEP=3;
const POKE_DEF={id:'pokemon',title:'Route 1 · Kanto',source:'Pokémon',icon:'◓',bossId:null,count:26,color:'#9fd27a',intro:'Tall grass, item balls and a trainer behind every tree. No minigames: walk into a trainer’s line of sight and they will battle you. Rival Gary waits in the Gym.'};
// Route through the map in tile coordinates (axis-aligned legs).
const WAYPOINTS=[[3,20],[3,10],[10,10],[10,3],[22,3],[22,12],[14,12],[14,19],[30,19]];
function routeTiles(){const out=[];for(let i=0;i<WAYPOINTS.length-1;i++){const [x0,y0]=WAYPOINTS[i],[x1,y1]=WAYPOINTS[i+1],dx=Math.sign(x1-x0),dy=Math.sign(y1-y0);let x=x0,y=y0;while(x!==x1||y!==y1){out.push([x,y]);x+=dx;y+=dy;}}out.push(WAYPOINTS.at(-1));return out;}
const key=(x,y)=>x+','+y;
function buildPokemonBoard(seed='poke'){
 const random=seededRandom(seed+':pokemon-route'),tiles=routeTiles(),nodeTiles=tiles.filter((_,i)=>i%STEP===0||i===tiles.length-1),count=nodeTiles.length;
 const nodes={},ids=[];
 const center=Math.round(count*.48),items=[4,Math.round(count*.66),count-4];
 nodeTiles.forEach(([x,y],i)=>{const id=`warp-pokemon-${i}`;ids.push(id);const type=i===0?'start':i===count-1?'gate':i===center?'center':items.includes(i)?'pkitem':(random()<.62?'grass':'path');
  nodes[id]={id,realm:'warp',col:i,lane:0,x:x*T+T/2,y:y*T+T/2,tx:x,ty:y,type,worldSpace:true,next:[]};});
 for(let i=0;i<count-1;i++)nodes[ids[i]].next=[ids[i+1]];
 // Trainers: beside the path, facing a space 2-3 tiles away.
 const pathSet=new Set(tiles.map(([x,y])=>key(x,y))),blocked=new Set(pathSet),trainers=[];
 const tileIndex=new Map(tiles.map(([x,y],i)=>[key(x,y),i]));
 const candidates=shuffle(ids.map((id,i)=>i).filter(i=>i>1&&i<count-2&&!['center','pkitem'].includes(nodes[ids[i]].type)),random);
 for(const i of candidates){
  if(trainers.length>=7)break;if(trainers.some(t=>Math.abs(t.index-i)<2))continue;
  const n=nodes[ids[i]],ti=tileIndex.get(key(n.tx,n.ty)),prev=tiles[Math.max(0,ti-1)],nxt=tiles[Math.min(tiles.length-1,ti+1)],horizontal=prev[1]===nxt[1];
  const dirs=shuffle(horizontal?[[0,-1],[0,1]]:[[-1,0],[1,0]],random);
  for(const [dx,dy] of dirs){const dist=2+Math.floor(random()*2),tx=n.tx+dx*dist,ty=n.ty+dy*dist;
   if(tx<2||ty<2||tx>COLS-3||ty>ROWS-3)continue;let ok=true;for(let k=1;k<=dist;k++)if(blocked.has(key(n.tx+dx*k,n.ty+dy*k)))ok=false;if(!ok)continue;
   for(let k=1;k<=dist;k++)blocked.add(key(n.tx+dx*k,n.ty+dy*k));trainers.push({index:i,node:ids[i],tx,ty,face:[-dx,-dy],dist,beaten:[]});break;}
 }
 const board={format:'warp',generation:0,width:W,height:H,nodes,realms:{warp:{ids,start:ids[0],gate:ids[count-1],cols:count-1,y:0,height:H,color:POKE_DEF.color,title:POKE_DEF.title}},obstacles:[],signs:[],baseSpan:1500,pieceScale:.8,
  warp:{id:'pokemon',title:POKE_DEF.title,source:POKE_DEF.source,icon:POKE_DEF.icon,bossId:null,intro:POKE_DEF.intro,points:nodeTiles.map(([x,y])=>[x*T+T/2,y*T+T/2]),jumps:[],trainers,rival:CHARACTERS.some(c=>c.id==='gary-oak')?'gary-oak':null,scenery:sceneryLayout(random,blocked,pathSet,nodes,ids)}};
 assignTrainerIds(board,random);
 return board;
}
// Fixed decorations: tall grass around grass spaces, trees, a pond, buildings.
function sceneryLayout(random,blocked,pathSet,nodes,ids){
 const grass=new Set(),trees=new Set(),flowers=new Set(),water=new Set(),taken=new Set(blocked);
 const free=(x,y)=>x>=0&&y>=0&&x<COLS&&y<ROWS&&!taken.has(key(x,y));
 const centerNode=Object.values(nodes).find(n=>n.type==='center'),gate=nodes[ids.at(-1)],start=nodes[ids[0]];
 const rect=(x,y,w,h)=>{for(let i=x;i<x+w;i++)for(let j=y;j<y+h;j++)taken.add(key(i,j));};
 // buildings: Pokémon Center above/below its space, the Gym above the gate, a house by the start
 const centerPos=(()=>{for(const [ox,oy] of [[-2,-4],[-2,1],[1,-4],[-5,-1],[1,-1]]){const x=centerNode.tx+ox,y=centerNode.ty+oy;let ok=x>=1&&y>=1&&x+4<COLS&&y+3<ROWS;for(let i=x;i<x+4&&ok;i++)for(let j=y;j<y+3;j++)if(taken.has(key(i,j)))ok=false;if(ok)return [x,y];}return [centerNode.tx-2,centerNode.ty-4];})();
 rect(centerPos[0],centerPos[1],4,3);
 const gymPos=[gate.tx-3,gate.ty-5];rect(gymPos[0],gymPos[1],6,4);rect(gate.tx,gate.ty-1,1,1);
 const housePos=[start.tx+2,start.ty-3];rect(housePos[0],housePos[1],3,3);
 for(const n of Object.values(nodes))if(n.type==='grass')for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const x=n.tx+dx,y=n.ty+dy;if(x>=0&&y>=0&&x<COLS&&y<ROWS&&!taken.has(key(x,y))||pathSet.has(key(x,y))&&!(dx||dy))grass.add(key(x,y));}
 for(const k of grass)if(!pathSet.has(k))taken.add(k);
 // pond
 const pond=[19,15];let pondOk=true;for(let i=pond[0];i<pond[0]+4;i++)for(let j=pond[1];j<pond[1]+3;j++)if(taken.has(key(i,j)))pondOk=false;if(pondOk){for(let i=pond[0];i<pond[0]+4;i++)for(let j=pond[1];j<pond[1]+3;j++){water.add(key(i,j));taken.add(key(i,j));}}
 // border of trees, then scattered trees and flowers away from the path
 for(let x=0;x<COLS;x++)for(let y=0;y<ROWS;y++){const edge=x<1||y<1||x>=COLS-1||y>=ROWS-1;if(!free(x,y))continue;let nearPath=false;for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(pathSet.has(key(x+dx,y+dy)))nearPath=true;
  if(edge||!nearPath&&random()<.34){trees.add(key(x,y));taken.add(key(x,y));}else if(!nearPath&&random()<.12){flowers.add(key(x,y));}}
 return {grass:[...grass],trees:[...trees],flowers:[...flowers],water:[...water],center:centerPos,gym:gymPos,house:housePos};
}
// ---------------------------------------------------------------- drawing
const PX=T/16;
function pixelArt(rows,colors){let out='';rows.forEach((row,y)=>{let x=0;while(x<row.length){const ch=row[x];if(ch==='.'){x++;continue;}let w=1;while(row[x+w]===ch)w++;out+=`<rect x="${(x*PX).toFixed(2)}" y="${(y*PX).toFixed(2)}" width="${(w*PX+.05).toFixed(2)}" height="${(PX+.05).toFixed(2)}" fill="${colors[ch]}"/>`;x+=w;}});return out;}
const TREE=['....oooooooo....','..oogglllllggoo.','.oglllllllllllgo','oglllgllllglllgo','ogllllllllllllgo','ogllgllllllgllgo','oglllllllllllllo','.oglllgllllgllo.','.ogglllllllllgo.','..oogggllgggoo..','....oooggooo....','......otto......','......otto......','.....otttto.....','......oooo......','................'];
const TUFT=['..o..o..','.o#oo#o.','o#g##g#o','#gg##gg#','#g#gg#g#','.#gggg#.','..####..','........'];
const GRASS16=[...TUFT.map(r=>r+r),...TUFT.map(r=>r+r)];
const FLOWER=['................','..r.............','.rwr......y.....','..r......ywy....','..g.......y.....','..g.......g.....','................','.......r........','......rwr.......','.......r........','.......g........','................','..y.........r...','.ywy.......rwr..','..y.........r...','................'];
const GROUND_DOTS=[[3,4],[11,2],[7,10],[13,13],[2,14]];
const COLORS={o:'#183818',g:'#3c8038',l:'#68b850',t:'#806030','#':'#3f8a38',r:'#e05050',w:'#fff8e8',y:'#f0c838'};
function defs(){
 const ground=`<rect width="${T}" height="${T}" fill="#bfe3a0"/>`+GROUND_DOTS.map(([x,y])=>`<rect x="${x*PX}" y="${y*PX}" width="${PX}" height="${PX}" fill="#9ccb7c"/>`).join('');
 const path=`<rect width="${T}" height="${T}" fill="#ecdcae"/>`+[[2,3],[9,6],[5,11],[13,9],[11,14]].map(([x,y])=>`<rect x="${x*PX}" y="${y*PX}" width="${PX}" height="${PX}" fill="#cdb880"/>`).join('');
 const water=`<rect width="${T}" height="${T}" fill="#78a8f0"/><path d="M${3*PX} ${5*PX}h${4*PX}M${9*PX} ${11*PX}h${4*PX}" stroke="#e8f4ff" stroke-width="${PX}"/>`;
 return `<defs><pattern id="pk-ground" width="${T}" height="${T}" patternUnits="userSpaceOnUse">${ground}</pattern><pattern id="pk-path" width="${T}" height="${T}" patternUnits="userSpaceOnUse">${path}</pattern>
 <pattern id="pk-grass" width="${T}" height="${T}" patternUnits="userSpaceOnUse"><rect width="${T}" height="${T}" fill="#8fcf68"/>${pixelArt(GRASS16,{o:'#2c6428','#':'#3f8a38',g:'#6cbc50'})}</pattern>
 <pattern id="pk-tree" width="${T}" height="${T}" patternUnits="userSpaceOnUse">${ground}${pixelArt(TREE,COLORS)}</pattern>
 <pattern id="pk-flower" width="${T}" height="${T}" patternUnits="userSpaceOnUse">${ground}${pixelArt(FLOWER,{...COLORS,g:'#3c8038'})}</pattern>
 <pattern id="pk-water" width="${T}" height="${T}" patternUnits="userSpaceOnUse">${water}</pattern></defs>`;
}
function tileRects(list,fill){return list.map(k=>{const [x,y]=k.split(',').map(Number);return `<rect x="${x*T}" y="${y*T}" width="${T}" height="${T}" fill="url(#${fill})"/>`;}).join('');}
function building(x,y,w,h,{roof,label,door=true,stripes=true}){
 const X=x*T,Y=y*T,Wd=w*T,Hd=h*T,roofH=Hd*.48;
 return `<g class="pk-building"><rect x="${X+4}" y="${Y+8}" width="${Wd}" height="${Hd}" fill="#183818" opacity=".25"/><rect x="${X}" y="${Y+roofH}" width="${Wd}" height="${Hd-roofH}" fill="#f6eedc" stroke="#282828" stroke-width="4"/>
 <path d="M${X-8} ${Y+roofH}L${X+12} ${Y}H${X+Wd-12}L${X+Wd+8} ${Y+roofH}Z" fill="${roof}" stroke="#282828" stroke-width="4"/>${stripes?Array.from({length:4},(_,i)=>`<path d="M${X+i*Wd/4+6} ${Y+8}V${Y+roofH-4}" stroke="#000" stroke-opacity=".18" stroke-width="5"/>`).join(''):''}
 ${label?`<rect x="${X+Wd/2-46}" y="${Y+roofH+8}" width="92" height="26" rx="3" fill="#fff" stroke="#282828" stroke-width="3"/><text x="${X+Wd/2}" y="${Y+roofH+28}" text-anchor="middle" class="pk-sign">${e(label)}</text>`:''}
 ${door?`<rect x="${X+Wd/2-16}" y="${Y+Hd-36}" width="32" height="36" fill="#3a3a48" stroke="#282828" stroke-width="3"/>`:''}${[0,1].map(k=>`<rect x="${X+14+k*(Wd-48)}" y="${Y+Hd-46}" width="20" height="18" fill="#9ad0f0" stroke="#282828" stroke-width="3"/>`).join('')}</g>`;
}
const BODY=['....cccccccc....','...cCCCCCCCCc...','..cCCCCCCCCCCc..','..ckkkkkkkkkkc..','................','................','................','................','...bbbbbbbbbb...','..bBBBBBBBBBBb..','..bBBbBBBBbBBb..','..bBBbBBBBbBBb..','...ssbbbbbbss...','....pppppppp....','....pp....pp....','...kkk....kkk...'];
const OUTFITS=[['#e04038','#2858c0'],['#3878e0','#383848'],['#38a048','#705030'],['#e8a020','#5838a0'],['#a050d0','#303030'],['#f07898','#2878a0'],['#606060','#b03028']];
function trainerSVG(t,i,run){
 const c=character(t.id||'sean'),raw=portraitURL(c.id,'normal'),url=raw?headDisplayURL(raw):portraitFallbackURL(c.id),[cap,shirt]=OUTFITS[i%OUTFITS.length];
 const art=pixelArt(BODY,{c:'#282828',C:cap,k:'#282828',b:'#282828',B:shirt,s:'#f0c8a0',p:'#384868'});
 const beaten=run&&t.beaten.includes(run.current);
 return `<g class="pk-trainer${beaten?' beaten':''}" data-pk-trainer="${i}" transform="translate(${t.tx*T},${t.ty*T})"><ellipse cx="${T/2}" cy="${T-2}" rx="18" ry="5" fill="#000" opacity=".25"/><g transform="translate(-5,-14) scale(1.2)">${art}</g><clipPath id="pkhead-${i}"><circle cx="${T/2}" cy="2" r="17"/></clipPath><image href="${e(url)}" x="${T/2-19}" y="-17" width="38" height="38" clip-path="url(#pkhead-${i})" preserveAspectRatio="xMidYMid slice"/><circle cx="${T/2}" cy="2" r="17" fill="none" stroke="#282828" stroke-width="3"/>
 <path d="M${T/2+t.face[0]*24} ${T/2+t.face[1]*24}l${t.face[1]*6-t.face[0]*0} ${t.face[0]*6}" stroke="none"/><text x="${T/2}" y="${T+16}" text-anchor="middle" class="pk-trainer-name">${e(c.name.split(' ')[0].toUpperCase())}</text></g>`;
}
function pokemonSceneSVG(run){
 const b=run.board,w=b.warp,S=w.scenery,nodes=Object.values(b.nodes),route=routeTiles().map(([x,y])=>key(x,y));
 const ballAt=n=>`<g transform="translate(${n.x-14},${n.y-14})"><circle cx="14" cy="14" r="13" fill="#f6f6f6" stroke="#282828" stroke-width="3"/><path d="M1 14A13 13 0 0 1 27 14Z" fill="#e33b2f" stroke="#282828" stroke-width="3"/><rect x="1" y="12" width="26" height="4" fill="#282828"/><circle cx="14" cy="14" r="4.5" fill="#fff" stroke="#282828" stroke-width="2.5"/></g>`;
 const rival=w.rival?character(w.rival):null;
 return `<g class="warp-scene pk-scene" data-warp="pokemon">${defs()}<rect x="-2400" y="-1800" width="6600" height="4800" fill="#2c5a2a"/><rect width="${W}" height="${H}" fill="url(#pk-ground)"/>
 ${tileRects(S.water,'pk-water')}${tileRects(route,'pk-path')}${tileRects(S.grass,'pk-grass')}${tileRects(S.flowers,'pk-flower')}${tileRects(S.trees,'pk-tree')}
 ${nodes.filter(n=>!['grass'].includes(n.type)).map(n=>`<rect x="${n.x-T/2+3}" y="${n.y-T/2+3}" width="${T-6}" height="${T-6}" rx="6" fill="none" stroke="#a88a50" stroke-width="3" stroke-dasharray="6 5"/>`).join('')}
 ${nodes.filter(n=>n.type==='grass').map(n=>`<rect x="${n.x-T/2+2}" y="${n.y-T/2+2}" width="${T-4}" height="${T-4}" rx="6" fill="none" stroke="#2c6428" stroke-width="3"/>`).join('')}
 ${building(S.house[0],S.house[1],3,3,{roof:'#4868c8',label:null,stripes:false})}
 ${building(S.center[0],S.center[1],4,3,{roof:'#d84830',label:'POKé CENTER'})}
 ${building(S.gym[0],S.gym[1],6,4,{roof:'#7a7aa0',label:'GYM'})}
 ${nodes.filter(n=>n.type==='pkitem').map(ballAt).join('')}
 ${(w.trainers||[]).map((t,i)=>trainerSVG(t,i,run)).join('')}
 <text x="${S.gym[0]*T+3*T}" y="${S.gym[1]*T-14}" text-anchor="middle" class="pk-sign-big">RIVAL ${e(rival?rival.name.split(' ')[0].toUpperCase():'GARY')}</text>
 <g class="pk-banner"><rect x="30" y="${H-80}" width="420" height="52" rx="8" fill="#fff" stroke="#282828" stroke-width="5"/><text x="48" y="${H-45}" class="pk-sign-big">ROUTE 1 · KANTO</text></g></g>`;
}
// Trainer whose line of sight covers this space for the current player (not yet beaten).
function trainerWatching(board,nodeId,playerIndex){return (board.warp?.trainers||[]).findIndex(t=>t.node===nodeId&&!t.beaten.includes(playerIndex));}
// Pick trainer characters lazily (so they can depend on who is already on the team).
function assignTrainerIds(board,random){const pool=CHARACTERS.filter(c=>!c.unlockBy&&!['kc','mylo','loki','sean','amber'].includes(c.id));const poke=pool.filter(c=>c.source==='Pokémon'&&c.id!=='gary-oak');const used=new Set();for(const [i,t] of (board.warp?.trainers||[]).entries()){if(t.id){used.add(t.id);continue;}let c=null;for(let k=0;k<20&&(!c||used.has(c.id));k++)c=(i%3===0&&poke.length?poke[Math.floor(random()*poke.length)]:pool[Math.floor(random()*pool.length)]);t.id=c.id;used.add(c.id);}}

Object.assign(exports,{POKE_DEF,buildPokemonBoard,pokemonSceneSVG,trainerWatching,assignTrainerIds,TILE:T});
