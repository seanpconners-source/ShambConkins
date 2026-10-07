const {escapeHTML:e,seededRandom}=require("src/utils.js");
const {sceneProfile,locationSceneSVG}=require("src/locationScenes.js");
const {ensureLevelBosses,bossById,castleName}=require("src/bossGate.js");
const {biomeFor,biomePatchSVG,BIOME_DEFS}=require("src/biomes.js");
const {location}=require("src/locations.js");
const {levelInfo,levelLabel}=require("src/levels.js");
const {obstacleIsOpen}=require("src/obstacles.js");
// Rendering for grid boards (generation 8): a dark tabletop per level with a faint
// grid of empty tile slots, chunky 3D tiles on coloured tracks, plank bridges,
// guarded shortcuts and glass landmark cards with white titles that read anywhere.
const GROUND={mind:['#25172f','#4a2753','#ffd36b'],body:['#2c1b0e','#5e3416','#ffb54a'],spirit:['#17142f','#302a72','#c9a8ff'],horror:['#150608','#420d16','#ff6a5c'],'upside-down':['#180c16','#3d1a33','#ff6a80']};
const groundOf=realm=>GROUND[realm]||['#0f2a2e','#1d5257','#7fe0d0'];
const TRACK=['#2fd08f','#ff9a3c','#b47cff','#ff4b55'];
const LANE_LABEL=['CALM ROAD','ADVENTUROUS ROAD','HIGH REWARD ROAD','THE ROUTE BELOW'];
const TILE={start:'#e9e6f5',game:'#3f8cff',event:'#ff9a3d',item:'#9d63ff',bonus:'#27c776',penalty:'#ff4f64',location:'#19b9b4',trivia:'#24b0d8',task:'#ff3d6e',casino:'#13a27c',dice:'#5867ff',shop:'#ffaf2e',gate:'#ffcf3f',warp:'#7a4cff',trainer:'#e5352b'};
const f=n=>Math.round(n*10)/10;
const shade=(hex,k)=>{const n=parseInt(hex.slice(1),16),c=[n>>16,n>>8&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(k<0?v*(1+k):v+(255-v)*k))));return '#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');};
const pathD=pts=>pts.map((p,i)=>`${i?'L':'M'}${f(p.x)} ${f(p.y)}`).join('');
function tileSVG(n,ring='#120c1a'){
 if(n.type==='trainer')return `<g class="gr-tile t-trainer" transform="translate(${n.x},${n.y})"><circle cy="6" r="44" fill="#5a0f0f"/><circle cy="6" r="44" fill="none" stroke="${ring}" stroke-width="5"/><circle r="43" fill="#f4f4f4"/><path d="M-43 0A43 43 0 0 1 43 0Z" fill="#e5352b"/><path d="M-34 -22A36 36 0 0 1 -6 -38" stroke="#fff" stroke-opacity=".55" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="-43" y="-5" width="86" height="10" fill="#161616"/><circle r="15" fill="#161616"/><circle r="9.5" fill="#f4f4f4"/><circle r="4" fill="#fff" stroke="#bbb" stroke-width="1.5"/><circle r="43" fill="none" stroke="${ring}" stroke-width="5"/></g>`;
 const c=TILE[n.type]||'#8a8fb0';
 return `<g class="gr-tile t-${n.type}" transform="translate(${n.x},${n.y})"><rect x="-43" y="-37" width="86" height="86" rx="19" fill="${shade(c,-.45)}"/><rect x="-43" y="-43" width="86" height="84" rx="19" fill="${c}"/><rect x="-37" y="-38" width="74" height="30" rx="13" fill="#fff" opacity=".2"/><rect x="-43" y="-43" width="86" height="84" rx="19" fill="none" stroke="${ring}" stroke-width="5"/></g>`;
}
function realmNodes(board,realm){return board.realms[realm].ids.map(id=>board.nodes[id]).filter(Boolean);}
function laneTracks(board,realm,data){
 const out=[],fork=board.nodes[data.fork],gate=board.nodes[data.gate];
 const stem=(data.stem||[]).map(id=>board.nodes[id]);
 if(stem.length>1)out.push(`<path d="${pathD(stem)}" class="gr-track gr-stem"/>`);
 for(const lane of data.lanes||[]){
  const pts=[fork,...lane.ids.map(id=>board.nodes[id]),gate].filter(Boolean),color=TRACK[lane.lane]||TRACK[0];
  out.push(`<g class="jr-road jr-lane gr-lane" data-lane-key="${realm}:${lane.lane}" style="--tag:${color}"><path d="${pathD(pts)}" class="gr-track-glow"/><path d="${pathD(pts)}" class="gr-track" style="stroke:${color}"/></g>`);
 }
 return out.join('');
}
// Realms without roads (pair trails, the Upside Down) still get a track along each step.
function edgeTracks(board,realm){
 return realmNodes(board,realm).flatMap(n=>n.next.map(id=>{const t=board.nodes[id];if(!t||t.realm!==realm||n.bridge===id||n.shortcut===id)return '';return `<path d="M${n.x} ${n.y}L${t.x} ${t.y}" class="gr-track gr-stem"/>`;})).join('');
}
function bridgeSVG(board,br){
 const a=board.nodes[br.from],b=board.nodes[br.to],ang=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI,len=Math.hypot(b.x-a.x,b.y-a.y);
 return `<g class="jr-bridge gr-bridge" data-lane-key="${br.realm}:bridge:${br.to}" transform="translate(${f(a.x)},${f(a.y)}) rotate(${f(ang)})"><rect x="20" y="-22" width="${f(len-40)}" height="44" rx="8" class="gr-plank-rail"/><rect x="26" y="-16" width="${f(len-52)}" height="32" rx="5" class="gr-plank"/>${Array.from({length:Math.max(1,Math.floor((len-52)/18))},(_,i)=>`<rect x="${f(30+i*18)}" y="-16" width="4" height="32" class="gr-plank-gap"/>`).join('')}</g>`;
}
function shortcutSVG(run,sc){
 const board=run.board,a=board.nodes[sc.from],b=board.nodes[sc.to],o=(board.obstacles||[]).find(x=>x.from===sc.from&&x.to===sc.to),open=o?obstacleIsOpen(run,o):true;
 return `<g class="jr-bridge gr-shortcut ${open?'open':'closed'}" data-lane-key="${sc.realm}:shortcut:${sc.to}"><path d="M${a.x} ${a.y}L${b.x} ${b.y}" class="gr-shortcut-bed"/><path d="M${a.x} ${a.y}L${b.x} ${b.y}" class="gr-shortcut-line"/><g transform="translate(${f((a.x+b.x)/2+(a.x===b.x?58:0))},${f((a.y+b.y)/2+(a.y===b.y?-58:0))})" class="gr-shortcut-tag"><rect x="-44" y="-15" width="88" height="30" rx="15"/><text y="6">⚡ −${sc.skip}</text></g></g>`;
}
function laneChips(board,realm,data){
 const y=data.y+60,out=[];
 for(const lane of data.lanes||[]){
  const color=TRACK[lane.lane]||TRACK[0],cx=lane.lane===3?900:lane.cx,w=lane.lane===3?640:500;
  const name=lane.name.length>30?lane.name.slice(0,29)+'…':lane.name;
  out.push(`<g class="jr-banner gr-chip" data-lane-key="${realm}:${lane.lane}" transform="translate(${f(cx-w/2)},${f(y+70)})"><rect width="${w}" height="104" rx="22" class="gr-chip-bg"/><rect width="${w}" height="34" rx="17" fill="${color}"/><text x="20" y="24" class="gr-chip-kind">${LANE_LABEL[lane.lane]||'ROAD'}</text><text x="${w-18}" y="24" text-anchor="end" class="gr-chip-count">${lane.ids.length} SPACES</text><text x="20" y="78" class="gr-chip-name" style="font-size:${name.length>24?26:31}px">${e(name)}</text></g>`);
 }
 return out.join('');
}
function castleSVG(data,gate){
 const boss=data.boss?bossById(data.boss):null;
 const arch=`<g class="gr-gate-arch" transform="translate(${gate.x},${gate.y})"><path d="M-51 44V-30Q0 -100 51 -30V44" class="gr-arch-back"/><path d="M-51 44V-30Q0 -100 51 -30V44" class="gr-arch"/></g>`;
 if(!boss)return arch;
 return `<g class="boss-castle gr-castle" transform="translate(${gate.x},${gate.y+205}) scale(.82)"><path d="M0 -150V-215" class="gr-castle-road"/><rect x="-86" y="-36" width="172" height="120" rx="6" fill="#4a4258" stroke="#120d18" stroke-width="5"/><rect x="-118" y="-84" width="46" height="168" rx="5" fill="#5a5070" stroke="#120d18" stroke-width="5"/><rect x="72" y="-84" width="46" height="168" rx="5" fill="#5a5070" stroke="#120d18" stroke-width="5"/>${[-118,-100,-82,72,90,108].map(x=>`<rect x="${x}" y="-102" width="12" height="18" fill="#5a5070" stroke="#120d18" stroke-width="4"/>`).join('')}<path d="M0 -36V-110" stroke="#120d18" stroke-width="5"/><path d="M0 -110l56 16-56 18z" fill="#ff4b55" stroke="#120d18" stroke-width="3"/><circle cx="0" cy="22" r="34" fill="#1d1428" stroke="#ffcf3f" stroke-width="5"/><text y="36" text-anchor="middle" font-size="40">${e(boss.icon||'👹')}</text><text y="122" text-anchor="middle" class="gr-castle-name">${e(castleName(boss))}</text></g>${arch}`;
}
function gridZoneSVG(run){
 ensureLevelBosses(run);
 const board=run.board,realms=Object.entries(board.realms),W=board.width||1800,defs=[];
 const body=realms.map(([realm,data],i)=>{
  const [base,hi,acc]=groundOf(realm),first=i===0,last=i===realms.length-1,top=first?data.y-4000:data.y,height=(data.height||1000)+(first?4000:0)+(last?4000:0);
  defs.push(`<radialGradient id="gz-${realm}" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="${hi}"/><stop offset="1" stop-color="${hi}" stop-opacity="0"/></radialGradient><pattern id="gp-${realm}" x="50" y="${f(data.y+20)}" width="100" height="100" patternUnits="userSpaceOnUse"><rect x="9" y="9" width="82" height="82" rx="18" fill="#ffffff" opacity=".045"/></pattern>`);
  const nodes=realmNodes(board,realm),info=levelInfo(realm),title=info.n?levelLabel(realm):(data.title||realm).toUpperCase();
  const panels=(data.lanes||[]).filter(l=>l.lane<3).map(l=>{const color=TRACK[l.lane],y0=l.top-70,y1=l.bottom+70;return `<rect class="jr-panel gr-band" data-lane-key="${realm}:${l.lane}" x="${l.x0-62}" y="${y0}" width="${l.x1-l.x0+124}" height="${y1-y0}" rx="40" fill="${color}" fill-opacity=".07" stroke="${color}" stroke-opacity=".28" stroke-width="4" stroke-dasharray="3 14" stroke-linecap="round"/>`;}).join('');
  const biomes=nodes.filter(n=>n.type==='location'&&n.card&&location(n.location)).map(n=>{const L=location(n.location),kind=biomeFor(L,sceneProfile(L).kind);if(!kind)return '';const x0=Math.min(n.card.x,n.x-50)-34,y0=Math.min(n.card.y,n.y-50)-34,x1=Math.max(n.card.x+n.card.w,n.x+50)+34,y1=Math.max(n.card.y+n.card.h,n.y+50)+34;return `<g class="gr-biome">${biomePatchSVG(kind,{x:x0,y:y0,w:x1-x0,h:y1-y0},board.seed+':'+n.id,()=>-1e9)}</g>`;}).join('');
  const camp=data.stem?board.nodes[data.stem[0]]:null,gate=board.nodes[data.gate];
  return `<g class="zone-scenery gr-realm" data-realm="${realm}"><rect x="${-W}" y="${top}" width="${W*3}" height="${height}" fill="${base}"/><rect x="0" y="${data.y}" width="${W}" height="${data.height}" fill="url(#gz-${realm})"/><rect x="${-W}" y="${top}" width="${W*3}" height="${height}" fill="url(#gp-${realm})"/>${first?'':`<rect x="${-W}" y="${data.y-3}" width="${W*3}" height="6" fill="${acc}" opacity=".35"/>`}
   ${panels}${biomes}
   <text x="900" y="${data.y+(data.lanes?.length>1?92:110)}" text-anchor="middle" class="gr-realm-title" style="fill:${acc}">${e(title)}</text>
   ${data.lanes?.length>1?laneChips(board,realm,data):''}
   ${camp&&data.lanes?`<g class="gr-camp" transform="translate(${camp.x-118},${camp.y+6})"><path d="M0 34L30 -14L60 34Z" fill="#ff9a3c" stroke="#120d18" stroke-width="4" stroke-linejoin="round"/><path d="M30 -14L30 34" stroke="#120d18" stroke-width="3"/><path d="M-6 38H66" stroke="#120d18" stroke-width="5" stroke-linecap="round"/></g>`:''}
   ${gate&&data.lanes?castleSVG(data,gate):''}
  </g>`;
 }).join('');
 return BIOME_DEFS+`<defs>${defs.join('')}</defs>`+body;
}
function gridRoadSVG(run){
 const board=run.board,out=[];
 for(const realm of Object.keys(board.realms)){
  const data=board.realms[realm];
  out.push(data.lanes?laneTracks(board,realm,data):edgeTracks(board,realm));
  for(const br of board.bridges||[])if(br.realm===realm)out.push(bridgeSVG(board,br));
  for(const sc of board.shortcuts||[])if(sc.realm===realm)out.push(shortcutSVG(run,sc));
  const ring=new Map();for(const lane of data.lanes||[])for(const id of lane.ids)ring.set(id,TRACK[lane.lane]||TRACK[0]);
  out.push(realmNodes(board,realm).map(n=>tileSVG(n,ring.get(n.id))).join(''));
 }
 return out.join('');
}
// A glass card in the empty block beside its space: scene art on top, a white title below.
function gridLandmarkCard(l,n){
 const c=n.card,p=sceneProfile(l),art=locationSceneSVG(l).replace('<svg xmlns','<svg width="420" height="270" xmlns');
 const artH=Math.round(c.h*.6),max=Math.max(8,Math.floor((c.w-24)/11)),name=l.name.length>max?l.name.slice(0,max-1)+'…':l.name,fs=Math.max(15,Math.min(21,(c.w-24)/(name.length*.56)));
 const cx=Math.max(c.x+14,Math.min(c.x+c.w-14,n.x)),cy=Math.max(c.y+14,Math.min(c.y+c.h-14,n.y));
 return `<g class="jr-landmark gr-card scenery-${p.kind}" data-location="${e(l.id)}"><path d="M${n.x} ${n.y}L${f(cx)} ${f(cy)}" class="gr-card-link" style="stroke:${p.accent}"/><rect x="${c.x}" y="${c.y+6}" width="${c.w}" height="${c.h}" rx="20" fill="#000" opacity=".45"/><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="20" class="gr-card-bg" style="stroke:${p.accent}"/><svg x="${c.x+6}" y="${c.y+6}" width="${c.w-12}" height="${artH}" viewBox="0 0 420 228" preserveAspectRatio="xMidYMid slice" aria-label="${e(l.name)} scene">${art}</svg><text x="${c.x+c.w/2}" y="${c.y+artH+6+(c.h-artH-6)*.5}" text-anchor="middle" class="gr-card-name" style="font-size:${f(fs)}px">${e(name)}</text><text x="${c.x+c.w/2}" y="${c.y+c.h-12}" text-anchor="middle" class="gr-card-source">${e(l.source.length>34?l.source.slice(0,33)+'…':l.source)}</text></g>`;
}

Object.assign(exports,{GROUND,TRACK,TILE,groundOf,gridZoneSVG,gridRoadSVG,gridLandmarkCard,tileSVG});
