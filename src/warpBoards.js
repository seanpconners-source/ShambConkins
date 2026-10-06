// Warp zones: small themed boards the whole party is teleported to from a warp
// space on the main map. Each is a stand-alone board (run.board is swapped, the
// main one is parked in run.mainBoard) that ends in a boss.
const {seededRandom, escapeHTML:e}=require("src/utils.js");
const W=1800,H=1200;
const WARP_DEFS={
 'rainbow-road':{id:'rainbow-road',title:'Rainbow Road',source:'Mario Kart',icon:'🌈',bossId:'bowser',count:19,color:'#2a1556',intro:'No guardrails. Seventeen items. One very large turtle at the finish line.'},
 'candy-land':{id:'candy-land',title:'Candy Land',source:'Candy Land',icon:'🍭',bossId:'king-kandy',count:21,color:'#ffd6e8',intro:'Roll, step onto the next colour, and try not to get stuck in the Molasses Swamp.'},
 'chutes':{id:'chutes',title:'Chutes & Ladders',source:'Chutes and Ladders',icon:'🪜',bossId:'kaa',count:25,color:'#bfe8a8',intro:'Ladders go up. Chutes go down. Kaa is waiting on the last square.'},
 'monopoly':{id:'monopoly',title:'Boardwalk Empire',source:'Monopoly',icon:'🎩',bossId:'mr-monopoly',count:22,color:'#cfe9d1',intro:'Go around the board once. Pay no attention to the man in the top hat.'},
 'mario-world':{id:'mario-world',title:'World 1 · Grass Land',source:'Super Mario Bros. 3',icon:'🍄',bossId:'boom-boom',count:15,color:'#7fc8ee',intro:'Hammer Bros. wander the map. The fortress is just past the bridge.'},
 'clue':{id:'clue',title:'Tudor Mansion',source:'Clue',icon:'🔎',bossId:'professor-plum',count:10,color:'#3a2418',intro:'It was Professor Plum, in the secret passage, with the final boss.'},
 'hyrule':{id:'hyrule',title:'Hyrule Field',source:'The Legend of Zelda',icon:'🗡️',bossId:'ganon',count:17,color:'#8fd47a',intro:'It is dangerous to go alone. Take each other.'},
 'green-hill':{id:'green-hill',title:'Green Hill Zone',source:'Sonic the Hedgehog',icon:'💍',bossId:'dr-robotnik',count:18,color:'#7cc8ff',intro:'Gotta go fast. Collect rings. Avoid the egg-shaped man.'}
};
const WARP_IDS=Object.keys(WARP_DEFS);
const RING_COLORS=['#ff3b3b','#ff9c2a','#ffe23b','#4cd964','#3aa7ff','#5b4bff','#b45bff'];
const CANDY=['#ee4b5b','#a85bd6','#f6d93a','#3a8ff0','#f4902c','#4ccc6a'];

// ------------------------------------------------------------ layouts
function pathAlong(points,count){const seg=[],total=points.slice(1).reduce((s,p,i)=>{const d=Math.hypot(p[0]-points[i][0],p[1]-points[i][1]);seg.push(d);return s+d;},0),out=[];for(let i=0;i<count;i++){let t=total*i/(count-1),k=0;while(k<seg.length-1&&t>seg[k]){t-=seg[k];k++;}const a=points[k],b=points[k+1],f=seg[k]?t/seg[k]:0;out.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]);}return out;}
function layoutPoints(id,count){
 const pts=[];
 if(id==='rainbow-road'){for(let i=0;i<count;i++){const t=i/(count-1);pts.push([170+t*1460,H/2+Math.sin(t*Math.PI*3.2)*330-(t>.5?40:0)]);}}
 else if(id==='candy-land'){const per=Math.ceil(count/3);for(let i=0;i<count;i++){const row=Math.floor(i/per),k=i%per,x=240+k*(1320/(per-1));pts.push([row%2?1800-x:x,230+row*370]);}}
 else if(id==='chutes'){const size=5,cell=190,x0=(W-cell*size)/2+cell/2,y0=H-130;for(let i=0;i<count;i++){const row=Math.floor(i/size),k=i%size;pts.push([x0+(row%2?size-1-k:k)*cell,y0-row*(cell-12)]);}}
 else if(id==='monopoly'){const x0=260,x1=1540,y0=170,y1=1030,per=2*((x1-x0)+(y1-y0)),step=per/count,corners=[[x1,y1],[x0,y1],[x0,y0],[x1,y0],[x1,y1]];const lens=[x1-x0,y1-y0,x1-x0,y1-y0];for(let i=0;i<count;i++){let d=i*step,k=0;while(k<3&&d>lens[k]){d-=lens[k];k++;}const a=corners[k],b=corners[k+1],f=d/lens[k];pts.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]);}}
 else if(id==='mario-world'){return pathAlong([[190,990],[430,960],[650,860],[560,640],[760,500],[1010,560],[1180,420],[1430,470],[1580,680],[1500,900],[1260,960],[1090,820],[1260,700],[1330,880]].slice(0,13).concat([[1480,1010]]),count);}
 else if(id==='clue'){for(let i=0;i<count-1;i++){const row=Math.floor(i/3),k=i%3,x=300+(row%2?2-k:k)*600;pts.push([x,260+row*340]);}pts.push([900,1100]);}
 else if(id==='hyrule'){return pathAlong([[180,980],[500,930],[760,1010],[980,820],[760,640],[520,520],[760,340],[1080,270],[1350,430],[1600,300]],count);}
 else {for(let i=0;i<count;i++){const t=i/(count-1);pts.push([160+t*1480,760-Math.sin(t*Math.PI*2.2)*230-t*100]);}}
 return pts;
}
function assignTypes(count,random,id){
 const pool=['game','game','game','event','item','bonus','trivia','game','penalty','event','bonus','task'],types=['start'];
 for(let i=1;i<count-1;i++)types.push(pool[Math.floor(random()*pool.length)]);types.push('gate');
 // guarantee a useful spread
 const need=['item','trivia','bonus'];for(const t of need)if(!types.includes(t))types[2+Math.floor(random()*(count-5))]=t;
 let games=types.filter(t=>t==='game').length;for(let i=2;games<4&&i<count-2;i+=3)if(types[i]!=='game'){types[i]='game';games++;}
 if(id==='candy-land'||id==='rainbow-road')for(let i=3;i<count-2;i+=7)types[i]='item';
 return types;
}
// Chutes and ladders: [from,to] by node index.
const CHUTES_JUMPS=[[2,10],[7,14],[12,19],[16,5],[21,9],[23,15]];
const MONOPOLY_NAMES=['GO','Paddy’s Alley','Chance','Kitten Mittens Ct','Income Tax','Dunder Mifflin Ave','Jail','Cones of Dunshire','Chest','Rum Ham Row','Free Parking','Fight Milk Blvd','Chance','Hill Valley Way','Go to Jail','Goon Docks','Chest','Raccoon City Rd','Luxury Tax','Quark’s Plaza','Silent Hill Sq','Boardwalk'];
const MONOPOLY_COLORS=['#8b5a2b','#8b5a2b','#9ad0f0','#9ad0f0','#9ad0f0','#e0559a','#e0559a','#f08a1c','#f08a1c','#e03a3a','#e03a3a','#e03a3a','#f3d52b','#f3d52b','#f3d52b','#2fa75a','#2fa75a','#2fa75a','#2f4fd6','#2f4fd6'];
const CLUE_ROOMS=['Hall','Lounge','Dining Room','Kitchen','Ballroom','Conservatory','Billiard Room','Library','Study','Secret Passage'];

function buildWarpBoard(id,seed='warp'){
 const def=WARP_DEFS[id];if(!def)return null;
 const random=seededRandom(seed+':warp:'+id),count=def.count,points=layoutPoints(id,count).map(p=>[Math.round(p[0]),Math.round(p[1])]),types=assignTypes(count,random,id);
 const nodes={},ids=[];
 for(let i=0;i<count;i++){const nid=`warp-${id}-${i}`;ids.push(nid);nodes[nid]={id:nid,realm:'warp',col:i,lane:0,x:points[i][0],y:points[i][1],type:types[i],worldSpace:true,next:[]};}
 for(let i=0;i<count-1;i++)nodes[ids[i]].next=[ids[i+1]];
 const jumps=[];
 if(id==='chutes')for(const [a,b] of CHUTES_JUMPS){if(a<count-2&&b<count-1){nodes[ids[a]].jump=ids[b];nodes[ids[a]].type=b>a?'bonus':'penalty';jumps.push([a,b]);}}
 if(id==='monopoly'){nodes[ids[0]].label='GO';ids.forEach((nid,i)=>{nodes[nid].label=MONOPOLY_NAMES[i]||'';});}
 if(id==='clue')ids.forEach((nid,i)=>{nodes[nid].label=CLUE_ROOMS[i]||'';});
 const board={format:'warp',generation:0,width:W,height:H,nodes,realms:{warp:{ids,start:ids[0],gate:ids[count-1],cols:count-1,y:0,height:H,color:def.color,title:def.title}},obstacles:[],signs:[],baseSpan:id==='chutes'?1500:1500,pieceScale:.9,
  warp:{id,title:def.title,source:def.source,icon:def.icon,bossId:def.bossId,intro:def.intro,points,jumps}};
 return board;
}
function pickWarpId(run,random){
 const done=new Set(run.warpsVisited||[]),left=WARP_IDS.filter(id=>!done.has(id));
 const pool=left.length?left:WARP_IDS;return pool[Math.floor(random()*pool.length)];
}

// ------------------------------------------------------------ scenery
const smooth=pts=>pts.length<3?'M'+pts.map(p=>p.join(' ')).join('L'):'M'+pts[0].join(' ')+pts.slice(1).map((p,i)=>{const prev=pts[i],mx=(prev[0]+p[0])/2,my=(prev[1]+p[1])/2;return `Q${prev[0]} ${prev[1]} ${mx} ${my}`;}).join('')+`T${pts.at(-1).join(' ')}`;
const stars=(random,n,w=W,h=H)=>Array.from({length:n},()=>`<circle cx="${Math.round(random()*w)}" cy="${Math.round(random()*h)}" r="${(random()*2.4+.6).toFixed(1)}" fill="#fff" opacity="${(.4+random()*.6).toFixed(2)}"/>`).join('');
function castle(x,y,color,flag,name){return `<g transform="translate(${x},${y})" class="warp-castle"><rect x="-90" y="-60" width="180" height="120" fill="${color}" stroke="#2b2230" stroke-width="5"/><rect x="-110" y="-110" width="50" height="170" fill="${color}" stroke="#2b2230" stroke-width="5"/><rect x="60" y="-110" width="50" height="170" fill="${color}" stroke="#2b2230" stroke-width="5"/>${[-110,-90,-70,60,80,100].map(dx=>`<rect x="${dx}" y="-126" width="14" height="18" fill="${color}" stroke="#2b2230" stroke-width="4"/>`).join('')}<path d="M-30 60V0Q0 -34 30 0V60Z" fill="#2b2230"/><path d="M0 -126V-190" stroke="#2b2230" stroke-width="5"/><path d="M0 -190l54 16-54 18z" fill="${flag}" stroke="#2b2230" stroke-width="3"/><text y="96" text-anchor="middle" class="warp-castle-name">${e(name)}</text></g>`;}

function sceneRainbow(b,random){const d=smooth(b.warp.points);
 return `<rect width="${W}" height="${H}" fill="url(#wg-space)"/>${stars(random,150)}<circle cx="1450" cy="210" r="90" fill="#7a5bd6" opacity=".7"/><circle cx="260" cy="260" r="46" fill="#e0559a" opacity=".6"/><ellipse cx="1450" cy="210" rx="140" ry="22" fill="none" stroke="#c9b4ff" stroke-width="6" opacity=".6"/>
 <path d="${d}" fill="none" stroke="#ffffff" stroke-width="150" stroke-linecap="round" opacity=".18"/>${RING_COLORS.map((c,i)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${126-i*17}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}<path d="${d}" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="4 26" stroke-linecap="round" opacity=".8"/>`;}
function sceneCandy(b,random){const pts=b.warp.points,d=smooth(pts);
 const trees=Array.from({length:14},()=>{const x=random()*W,y=random()*H,r=24+random()*22,c=CANDY[Math.floor(random()*6)];return `<g transform="translate(${x.toFixed(0)},${y.toFixed(0)})" opacity=".85"><rect x="-4" y="0" width="8" height="${(r*1.9).toFixed(0)}" fill="#fff" stroke="#e98fb5" stroke-width="2"/><circle r="${r.toFixed(0)}" fill="${c}"/><path d="M0 0m-${(r*.8).toFixed(0)} 0a${(r*.8).toFixed(0)} ${(r*.8).toFixed(0)} 0 1 1 ${(r*1.6).toFixed(0)} 0" fill="none" stroke="#fff" stroke-width="5" opacity=".7"/></g>`;}).join('');
 const hills=[[260,1160,300,'#9be7ff'],[900,1180,380,'#ffd0f0'],[1560,1160,320,'#c3f7a8']].map(([x,y,r,c])=>`<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*.45}" fill="${c}" stroke="#fff" stroke-width="6"/>`).join('');
 return `<rect width="${W}" height="${H}" fill="url(#wg-candy)"/>${hills}${trees}<path d="${d}" fill="none" stroke="#fff" stroke-width="150" stroke-linecap="round" opacity=".55"/><path d="${d}" fill="none" stroke="#f7a5c8" stroke-width="12" stroke-linecap="round" stroke-dasharray="2 26"/>`+pts.map((p,i)=>`<rect x="${p[0]-62}" y="${p[1]-62}" width="124" height="124" rx="26" fill="${CANDY[i%6]}" stroke="#fff" stroke-width="8"/>`).join('');}
function sceneChutes(b,random){const pts=b.warp.points,cell=190;
 const tiles=pts.map((p,i)=>`<rect x="${p[0]-cell/2+4}" y="${p[1]-cell/2+10}" width="${cell-8}" height="${cell-20}" rx="14" fill="${(i+Math.floor(i/5))%2?'#fff5c2':'#bfe6ff'}" stroke="#5f7f55" stroke-width="4"/><text x="${p[0]-cell/2+16}" y="${p[1]-cell/2+34}" class="warp-num">${i+1}</text>`).join('');
 const jumps=b.warp.jumps.map(([a,t])=>{const A=pts[a],T=pts[t];if(t>a){const dx=T[0]-A[0],dy=T[1]-A[1],len=Math.hypot(dx,dy),nx=-dy/len*16,ny=dx/len*16,rungs=Array.from({length:Math.floor(len/38)},(_,k)=>{const f=(k+.7)*38/len;return `<path d="M${(A[0]+dx*f+nx).toFixed(0)} ${(A[1]+dy*f+ny).toFixed(0)}L${(A[0]+dx*f-nx).toFixed(0)} ${(A[1]+dy*f-ny).toFixed(0)}" stroke="#b07a3a" stroke-width="6"/>`;}).join('');return `<path d="M${A[0]+16} ${A[1]}L${T[0]+16} ${T[1]}M${A[0]-16} ${A[1]}L${T[0]-16} ${T[1]}" stroke="#8a5a26" stroke-width="9" stroke-linecap="round"/>${rungs}`;}
  const mx=(A[0]+T[0])/2+90,my=(A[1]+T[1])/2;return `<path d="M${A[0]} ${A[1]}Q${mx} ${my} ${T[0]} ${T[1]}" fill="none" stroke="#e8543a" stroke-width="30" stroke-linecap="round" opacity=".85"/><path d="M${A[0]} ${A[1]}Q${mx} ${my} ${T[0]} ${T[1]}" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="10 14" opacity=".8"/><circle cx="${A[0]}" cy="${A[1]}" r="26" fill="#e8543a"/>`;}).join('');
 return `<rect width="${W}" height="${H}" fill="#bfe8a8"/><rect x="0" y="0" width="${W}" height="150" fill="#9fd8ff"/><ellipse cx="300" cy="80" rx="120" ry="40" fill="#fff" opacity=".9"/><ellipse cx="1460" cy="70" rx="150" ry="46" fill="#fff" opacity=".9"/>${tiles}${jumps}`;}
function sceneMonopoly(b,random){const pts=b.warp.points,names=pts.map((_,i)=>MONOPOLY_NAMES[i]||'');
 const tiles=pts.map((p,i)=>{const side=p[1]>=1000?0:p[0]<=270?1:p[1]<=180?2:3,vertical=side===1||side===3,w=vertical?150:180,h=vertical?180:150,col=MONOPOLY_COLORS[i-1]||null,corner=[0,6,10,14,18].includes(i),bar=col?(side===0?`<rect x="${-w/2}" y="${-h/2}" width="${w}" height="34" fill="${col}"/>`:side===1?`<rect x="${w/2-34}" y="${-h/2}" width="34" height="${h}" fill="${col}"/>`:side===2?`<rect x="${-w/2}" y="${h/2-34}" width="${w}" height="34" fill="${col}"/>`:`<rect x="${-w/2}" y="${-h/2}" width="34" height="${h}" fill="${col}"/>`):'';
  return `<g transform="translate(${p[0]},${p[1]})"><rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" fill="${corner?'#fff1b8':'#f6fff3'}" stroke="#25402c" stroke-width="4"/>${bar}<text y="${vertical?h/2-12:h/2-14}" text-anchor="middle" class="warp-tile-name">${e(names[i].length>12?names[i].replace(/ /,'\n').split('\n')[0]:names[i])}</text></g>`;}).join('');
 const card=(x,y,c,r)=>`<g transform="translate(${x},${y}) rotate(${r})"><rect x="-120" y="-70" width="240" height="140" rx="12" fill="${c}" stroke="#25402c" stroke-width="5"/><text y="12" text-anchor="middle" class="warp-card-text">${c==='#ffb347'?'CHANCE':'CHEST'}</text></g>`;
 return `<rect width="${W}" height="${H}" fill="#cfe9d1"/><rect x="170" y="90" width="1460" height="1020" rx="24" fill="#a6d6ad" stroke="#25402c" stroke-width="8"/>${card(760,560,'#ffb347',-14)}${card(1040,600,'#7ec8ff',10)}<text x="900" y="400" text-anchor="middle" class="warp-title-big">BOARDWALK EMPIRE</text><text x="900" y="800" text-anchor="middle" class="warp-sub">Roll. Buy nothing. Beat the banker.</text>${tiles}`;}
function sceneMario(b,random){const pts=b.warp.points,d=smooth(pts);
 const hill=(x,y,r)=>`<g transform="translate(${x},${y})"><path d="M${-r} 0a${r} ${r*.8} 0 0 1 ${r*2} 0z" fill="#59b84a" stroke="#2f6a2a" stroke-width="5"/><circle cx="${-r*.2}" cy="${-r*.35}" r="7" fill="#1b1b1b"/><circle cx="${r*.2}" cy="${-r*.35}" r="7" fill="#1b1b1b"/></g>`;
 const bush=(x,y)=>`<g transform="translate(${x},${y})"><circle r="26" fill="#3fae3f" stroke="#256b25" stroke-width="4"/><circle cx="30" cy="8" r="20" fill="#3fae3f" stroke="#256b25" stroke-width="4"/><circle cx="-30" cy="8" r="20" fill="#3fae3f" stroke="#256b25" stroke-width="4"/></g>`;
 const extra=Array.from({length:10},()=>bush(Math.round(random()*W),Math.round(200+random()*900))).join('');
 return `<rect width="${W}" height="${H}" fill="#7fc8ee"/><path d="M0 120Q300 60 600 120T1200 120T1800 120V0H0Z" fill="#a9e0ff"/><path d="M60 230Q50 700 140 1090Q600 1180 1100 1130Q1700 1100 1720 900Q1780 520 1600 260Q1000 120 60 230Z" fill="#8fe06a" stroke="#2f7a2a" stroke-width="8"/>${extra}${hill(420,360,100)}${hill(1280,300,120)}${hill(250,640,80)}${hill(1560,1000,100)}<path d="${d}" fill="none" stroke="#2b2230" stroke-width="44" stroke-linecap="round" opacity=".35"/><path d="${d}" fill="none" stroke="#f2d79b" stroke-width="34" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#d6b36a" stroke-width="5" stroke-dasharray="6 20" stroke-linecap="round"/>`+pts.map((p,i)=>i&&i<pts.length-1?`<rect x="${p[0]-34}" y="${p[1]-34}" width="68" height="68" rx="8" fill="#fff" stroke="${['#e0453a','#2f7bd6','#e3a319','#2fa75a'][i%4]}" stroke-width="8"/><text x="${p[0]}" y="${p[1]+12}" text-anchor="middle" class="warp-level-num">${i}</text>`:'').join('');}
function sceneClue(b,random){const pts=b.warp.points;
 return `<rect width="${W}" height="${H}" fill="#3a2418"/><rect x="0" y="0" width="${W}" height="${H}" fill="url(#wg-wood)"/>`+pts.map((p,i)=>`<g transform="translate(${p[0]},${p[1]})"><rect x="-250" y="-130" width="500" height="260" rx="10" fill="${['#7b3a45','#3f5f7b','#6b7b3a','#7b6b3a','#4f3a7b','#3a7b6b','#7b3a6b','#8a5a2a','#3a4a7b','#2a2a2a'][i]}" stroke="#d9b87a" stroke-width="6" opacity=".9"/><text y="-84" text-anchor="middle" class="warp-room">${e(CLUE_ROOMS[i]||'')}</text></g>`).join('')+`<path d="${smooth(pts)}" fill="none" stroke="#d9b87a" stroke-width="10" stroke-dasharray="3 22" stroke-linecap="round" opacity=".8"/>`;}
function sceneHyrule(b,random){const d=smooth(b.warp.points);
 const tree=(x,y)=>`<g transform="translate(${x},${y})"><rect x="-6" y="0" width="12" height="36" fill="#6b4226"/><circle cy="-8" r="34" fill="#2f8a3a" stroke="#1d5a26" stroke-width="5"/></g>`;
 return `<rect width="${W}" height="${H}" fill="#8fd47a"/><ellipse cx="1240" cy="840" rx="300" ry="150" fill="#6fc4e8" stroke="#3f8fb8" stroke-width="8"/>${Array.from({length:24},()=>tree(Math.round(random()*W),Math.round(random()*H))).join('')}<path d="${d}" fill="none" stroke="#7a5a2a" stroke-width="86" stroke-linecap="round" opacity=".45"/><path d="${d}" fill="none" stroke="#d9b66b" stroke-width="70" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#b8935a" stroke-width="6" stroke-dasharray="4 18" stroke-linecap="round"/><path transform="translate(1590,250)" d="M0 -40L34 20H-34ZM-34 20L0 80L-34 20ZM34 20L0 80L34 20Z" fill="#ffd84a" stroke="#a37a12" stroke-width="5"/>`;}
function sceneGreenHill(b,random){const pts=b.warp.points,d=smooth(pts);
 const palm=(x,y)=>`<g transform="translate(${x},${y})"><path d="M0 0Q8 -60 -4 -120" stroke="#8a5a2a" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M-4 -120q-50 -10 -64 22M-4 -120q50 -16 62 18M-4 -120q-24 -40 -58 -34M-4 -120q22 -40 56 -30" stroke="#2fa75a" stroke-width="14" fill="none" stroke-linecap="round"/></g>`;
 return `<rect width="${W}" height="${H}" fill="url(#wg-sky)"/><ellipse cx="300" cy="150" rx="140" ry="44" fill="#fff"/><ellipse cx="1300" cy="110" rx="170" ry="50" fill="#fff"/><path d="M0 900Q450 760 900 880T1800 840V1200H0Z" fill="#46b34a"/><path d="M0 980Q450 880 900 960T1800 940V1200H0Z" fill="#a7742f"/>${Array.from({length:12},(_,i)=>`<rect x="${i*160}" y="${1010+(i%2)*40}" width="80" height="60" fill="#8a5a1f" opacity=".6"/>`).join('')}${[200,700,1250,1600].map((x,i)=>palm(x,820+(i%2)*60)).join('')}<path d="${d}" fill="none" stroke="#2b2230" stroke-width="40" stroke-linecap="round" opacity=".3"/><path d="${d}" fill="none" stroke="#f4cf5a" stroke-width="30" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="3 24" stroke-linecap="round"/>`+pts.filter((_,i)=>i%2===1).map(p=>`<circle cx="${p[0]+4}" cy="${p[1]-62}" r="14" fill="none" stroke="#ffd800" stroke-width="7"/>`).join('');}
const SCENES={'rainbow-road':sceneRainbow,'candy-land':sceneCandy,chutes:sceneChutes,monopoly:sceneMonopoly,'mario-world':sceneMario,clue:sceneClue,hyrule:sceneHyrule,'green-hill':sceneGreenHill};
const CASTLE_COLORS={'rainbow-road':['#a77bff','#e8543a'],'candy-land':['#ffb3d9','#ee4b5b'],chutes:['#8bcf6a','#2f8a3a'],monopoly:['#ffd45a','#e03a3a'],'mario-world':['#e0c58f','#e0453a'],clue:['#8b6a4a','#7b3a6b'],hyrule:['#8f9aa8','#3a8a3a'],'green-hill':['#7ec8ff','#e8543a']};
// The castle goes wherever it clears the path and the board edge best, close to the gate.
function castleSpot(b,gate){
 const pts=Object.values(b.nodes);let best=[gate.x,gate.y-190],bestScore=-1;
 for(const dist of [210,270,340])for(let a=0;a<16;a++){const ang=a*Math.PI/8,x=gate.x+Math.cos(ang)*dist,y=gate.y+Math.sin(ang)*dist;if(x<150||x>W-150||y<250||y>H-120)continue;const clear=Math.min(...pts.map(n=>Math.hypot(n.x-x,n.y-y)));const score=Math.min(clear,230)-dist*.18;if(score>bestScore){bestScore=score;best=[Math.round(x),Math.round(y)];}}
 return best;
}
function warpSceneSVG(run){
 const b=run.board,id=b.warp.id,random=seededRandom(run.seed+':scene:'+id),gate=b.nodes[b.realms.warp.gate],scene=SCENES[id]||sceneHyrule;
 const defs=`<defs><linearGradient id="wg-space" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#120a2e"/><stop offset="1" stop-color="#3a1a6e"/></linearGradient><linearGradient id="wg-candy" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe3f1"/><stop offset="1" stop-color="#d9f4ff"/></linearGradient><linearGradient id="wg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4aa8ff"/><stop offset="1" stop-color="#bfe9ff"/></linearGradient><pattern id="wg-wood" width="120" height="40" patternUnits="userSpaceOnUse"><path d="M0 20H120M0 0H120" stroke="#2a180d" stroke-width="3" opacity=".5"/></pattern></defs>`;
 const [cc,flag]=CASTLE_COLORS[id]||['#aaa','#e33'];
 const spot=castleSpot(b,gate),cx=spot[0],cy=spot[1];
 return `<g class="warp-scene" data-warp="${id}">${defs}<rect x="-2400" y="-1800" width="6600" height="4800" fill="${WARP_DEFS[id].color}"/>${scene(b,random)}${castle(cx,cy,cc,flag,(b.warp.bossName||'Boss')+'’s Castle')}<text x="40" y="66" class="warp-banner">${e(b.warp.icon)} ${e(b.warp.title.toUpperCase())}</text></g>`;
}
Object.assign(exports,{WARP_DEFS,WARP_IDS,buildWarpBoard,pickWarpId,warpSceneSVG});
