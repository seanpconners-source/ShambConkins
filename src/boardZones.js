const {escapeHTML:e,hash,seededRandom}=require("src/utils.js");
const {sceneProfile,locationSceneSVG}=require("src/locationScenes.js");
const {logoURL}=require("src/assets.js");
// Journey-map rendering (board generation 7): terrain per road, smooth roads with
// direction arrows, bridges, a crossroads signpost and landmark scenes beside the road.
const LANE_STYLE=[
 {key:'calm',road:'#d9cba5',edge:'#7d6f4c',tag:'#2f9e61',label:'CALM'},
 {key:'adventurous',road:'#c99a63',edge:'#6e4a28',tag:'#e08a2c',label:'ADVENTUROUS'},
 {key:'rich',road:'#e5c25a',edge:'#7a5a12',tag:'#8f55d6',label:'HIGH REWARD'}
];
const DECOR={jungle:'trees',park:'trees',home:'houses',town:'houses',pub:'houses',taskhouse:'houses',office:'blocks',city:'blocks',clock:'blocks',kitchen:'blocks',studio:'blocks',casino:'neon',bowling:'neon',stage:'spots',slime:'drips',harbor:'water',sewer:'water',space:'stars',alien:'stars',rainbow:'stars',matrix:'rain',horror:'dead',dojo:'peaks',cards:'peaks',hockey:'ice'};
const f=n=>Math.round(n*10)/10;
function laneStyle(lane){return LANE_STYLE[lane]||LANE_STYLE[0];}
function nodesOf(board,lane){return lane.ids.map(id=>board.nodes[id]);}
function roadXAt(points,y){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(y>=a.y&&y<=b.y&&b.y>a.y)return a.x+(b.x-a.x)*(y-a.y)/(b.y-a.y);}return points.at(-1)?.x??900;}
// Catmull-Rom spline through the points, as an SVG path of cubic Béziers.
function smoothPath(points){
 if(points.length<2)return '';
 let d=`M${f(points[0].x)} ${f(points[0].y)}`;
 for(let i=0;i<points.length-1;i++){const p0=points[i-1]||points[i],p1=points[i],p2=points[i+1],p3=points[i+2]||p2;
  d+=` C${f(p1.x+(p2.x-p0.x)/6)} ${f(p1.y+(p2.y-p0.y)/6)} ${f(p2.x-(p3.x-p1.x)/6)} ${f(p2.y-(p3.y-p1.y)/6)} ${f(p2.x)} ${f(p2.y)}`;}
 return d;
}
function decorSVG(kind,palette,random,count,xMin,xMax,yMin,yMax,roadAt){
 const out=[],style=DECOR[kind]||'blocks';
 for(let i=0;i<count;i++){
  const y=yMin+random()*(yMax-yMin),x=xMin+random()*(xMax-xMin),clear=roadAt(y);if(Math.abs(x-clear)<86)continue;
  const s=.7+random()*.7;
  if(style==='trees')out.push(`<g transform="translate(${f(x)},${f(y)}) scale(${f(s)})"><rect x="-3" y="-4" width="6" height="16" fill="#6b4c32"/><circle cy="-14" r="17" fill="${palette.ground}"/><circle cx="-8" cy="-8" r="11" fill="${palette.accent}" opacity=".6"/></g>`);
  else if(style==='houses')out.push(`<g transform="translate(${f(x)},${f(y)}) scale(${f(s)})"><rect x="-16" y="-14" width="32" height="24" fill="${palette.sky}" stroke="${palette.ground}" stroke-width="2"/><path d="M-20 -14L0 -32 20 -14Z" fill="${palette.ground}"/><rect x="-4" y="-2" width="8" height="12" fill="${palette.accent}"/></g>`);
  else if(style==='blocks'||style==='neon'){const h=34+random()*60,w=24+random()*20;out.push(`<g transform="translate(${f(x)},${f(y)}) scale(${f(s)})"><rect x="${-w/2}" y="${-h}" width="${f(w)}" height="${f(h)}" fill="${palette.ground}" opacity=".85"/>${Array.from({length:Math.floor(h/16)},(_,r)=>`<rect x="${-w/2+4}" y="${-h+6+r*16}" width="${f(w-8)}" height="5" fill="${style==='neon'?palette.accent:'#f6e5a8'}" opacity=".8"/>`).join('')}</g>`);}
  else if(style==='spots')out.push(`<path d="M${f(x)} ${f(y)}l-18 -70h36z" fill="${palette.accent}" opacity=".22"/><circle cx="${f(x)}" cy="${f(y)}" r="5" fill="${palette.accent}"/>`);
  else if(style==='drips')out.push(`<path transform="translate(${f(x)},${f(y)})" d="M0 -14q14 12 0 22q-14 -10 0 -22" fill="${palette.accent}" opacity=".8"/>`);
  else if(style==='water')out.push(`<path d="M${f(x-24)} ${f(y)}q8 -9 16 0t16 0t16 0" fill="none" stroke="${palette.accent}" stroke-width="3" opacity=".7"/>`);
  else if(style==='stars')out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.5+random()*2.5)}" fill="${palette.accent}" opacity=".8"/>`);
  else if(style==='rain')out.push(`<text x="${f(x)}" y="${f(y)}" font-family="monospace" font-size="15" fill="${palette.accent}" opacity=".65">${'01アイ'[Math.floor(random()*5)]}</text>`);
  else if(style==='dead')out.push(`<path transform="translate(${f(x)},${f(y)}) scale(${f(s)})" d="M0 12V-22M0 -8l-14 -14M0 -14l12 -12M-6 -18l-8 -10" stroke="#2b2230" stroke-width="3.5" fill="none" stroke-linecap="round"/>`);
  else if(style==='peaks')out.push(`<path transform="translate(${f(x)},${f(y)}) scale(${f(s)})" d="M-26 10L-4 -34L8 -16L16 -26L34 10Z" fill="${palette.ground}" opacity=".7"/><path transform="translate(${f(x)},${f(y)}) scale(${f(s)})" d="M-4 -34L4 -20L-2 -22L-8 -18Z" fill="#fff" opacity=".8"/>`);
  else if(style==='ice')out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(8+random()*10)}" fill="#fff" opacity=".35"/>`);
 }
 return out.join('');
}
function lanePanel(run,data,lane){
 const board=run.board,pts=nodesOf(board,lane),p=sceneProfile({id:lane.route||lane.kind,name:lane.name,source:lane.source,realm:''}),st=laneStyle(lane.lane),random=seededRandom(board.seed+':terrain:'+data.y+':'+lane.cx);
 const x=lane.cx-296,w=592,y=lane.top-50,h=lane.bottom-lane.top+170;
 const roadAt=yy=>roadXAt(pts,yy);
 return `<g class="jr-panel" data-lane-key="${lane.key}">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="70" fill="${p.sky}" opacity=".62"/>
  <rect x="${x}" y="${y+h*.58}" width="${w}" height="${h*.42}" rx="70" fill="${p.ground}" opacity=".16"/>
  <rect x="${x+6}" y="${y+6}" width="${w-12}" height="${h-12}" rx="64" fill="none" stroke="${st.tag}" stroke-width="5" stroke-dasharray="2 14" stroke-linecap="round" opacity=".7"/>
  <g class="jr-decor">${decorSVG(p.kind,p,random,46,x+30,x+w-30,y+160,y+h-40,roadAt)}</g>
 </g>`;
}
function laneBanner(board,lane){
 const st=laneStyle(lane.lane),x=lane.cx-270,y=lane.top-176;
 return `<g class="jr-banner" transform="translate(${x},${y})" data-lane-key="${lane.key}"><rect width="540" height="118" rx="24" fill="#fffaf0" stroke="${st.edge}" stroke-width="4"/><rect x="0" y="0" width="540" height="34" rx="24" fill="${st.tag}"/><rect x="0" y="16" width="540" height="18" fill="${st.tag}"/><text x="20" y="25" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="20" fill="#fff" letter-spacing="2">${st.label} ROAD</text><text x="520" y="25" text-anchor="end" font-family="Arial,sans-serif" font-weight="700" font-size="16" fill="#fff">${lane.ids.length} spaces</text><text x="20" y="70" font-family="Georgia,serif" font-weight="700" font-size="${lane.name.length>26?28:34}" fill="#1f2a3d">${e(lane.name)}</text><image href="${logoURL(lane.source)}" x="20" y="78" width="130" height="32" preserveAspectRatio="xMinYMid meet"/><text x="520" y="102" text-anchor="end" font-family="Arial,sans-serif" font-size="15" fill="#5b6577">${e(lane.source)}</text></g>`;
}
function realmBackdrop(board,realm,data,first,last){
 const W=board.width||1800,top=first?data.y-4000:data.y,height=data.height+(first?4000:0)+(last?4000:0);
 return `<rect x="${-W}" y="${top}" width="${W*3}" height="${height}" fill="${data.color||'#e4dcf0'}"/>`;
}
function zoneLayerSVG(run){
 const board=run.board,realms=Object.entries(board.realms),W=board.width||1800;
 return realms.map(([realm,data],i)=>{
  const first=i===0,last=i===realms.length-1,lanes=(data.lanes||[]).map((l,li)=>({...l,key:realm+':'+l.lane}));
  const title=(data.title||realm).toUpperCase();
  const camp=data.stem?board.nodes[data.stem[0]]:null,gate=board.nodes[data.gate];
  return `<g class="zone-scenery jr-realm" data-realm="${realm}">${realmBackdrop(board,realm,data,first,last)}
   <text x="900" y="${data.y+(camp?camp.y-70:60)}" text-anchor="middle" class="jr-realm-word">${e(title)}</text>
   ${lanes.map(l=>lanePanel(run,data,l)).join('')}
   ${camp?`<g transform="translate(${camp.x-92},${camp.y+8})"><path d="M0 40L32 -6L64 40Z" fill="#d9894b" stroke="#6b3a1c" stroke-width="3"/><path d="M32 -6L32 40" stroke="#6b3a1c" stroke-width="3"/><path d="M-8 44H72" stroke="#6b3a1c" stroke-width="4"/></g>`:''}
   ${gate?`<g transform="translate(${gate.x},${gate.y-6})"><path d="M-110 50V-30Q0 -110 110 -30V50" fill="none" stroke="#9a7020" stroke-width="16" stroke-linecap="round"/><path d="M-110 50V-30Q0 -110 110 -30V50" fill="none" stroke="#f0cb57" stroke-width="8" stroke-linecap="round"/><text y="-52" text-anchor="middle" class="jr-gate-word">GATE</text></g>`:''}
  </g>`;
 }).join('');
}
function crossroadsSign(board,data){
 const fork=board.nodes[data.fork];if(!fork||!data.lanes)return '';
 const arrows=data.lanes.slice().sort((a,b)=>a.position-b.position).map(l=>{const st=laneStyle(l.lane),dx=l.cx-fork.x,dir=dx<-100?-1:dx>100?1:0,y=-28+(l.position)*30;
  return `<g transform="translate(0,${y})"><path d="${dir<0?'M-92 0h-16l-20 -13h-52v26h52l20 -13Z':dir>0?'M92 0h16l20 -13h52v26h-52l-20 -13Z':'M-70 0h140v-15h-140z'}" fill="${st.tag}" stroke="#fff" stroke-width="3"/></g>`;}).join('');
 return `<g class="jr-crossroads" transform="translate(${fork.x},${fork.y+74})"><rect x="-5" y="-60" width="10" height="90" fill="#6b4c32"/>${arrows}</g>`;
}
function roadLayerSVG(run){
 const board=run.board,out=[];
 for(const [realm,data] of Object.entries(board.realms)){
  if(!data.lanes){continue;}
  const fork=board.nodes[data.fork],gate=board.nodes[data.gate];
  // The stem from camp to the crossroads is a plain road.
  const stem=(data.stem||[]).map(id=>board.nodes[id]);
  out.push(`<g class="jr-road jr-stem"><path d="${smoothPath(stem)}" class="jr-road-edge"/><path d="${smoothPath(stem)}" class="jr-road-fill" style="--road:#c9c3b2"/></g>`);
  for(const lane of data.lanes){
   const st=laneStyle(lane.lane),pts=[fork,...nodesOf(board,lane),gate];
   const d=smoothPath(pts),key=realm+':'+lane.lane;
   const arrows=[];for(let i=1;i<pts.length-2;i+=4){const a=pts[i],b=pts[i+1],ang=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;arrows.push(`<path d="M-8 -7L5 0L-8 7" class="jr-arrow" transform="translate(${f((a.x+b.x)/2)},${f((a.y+b.y)/2)}) rotate(${f(ang)})"/>`);}
   const o=(run.board.obstacles||[]).find(ob=>ob.from===fork.id&&ob.to===lane.ids[0]);
   out.push(`<g class="jr-road jr-lane" data-lane-key="${key}" style="--road:${st.road};--edge:${st.edge};--tag:${st.tag}"><path d="${d}" class="jr-road-edge"/><path d="${d}" class="jr-road-fill"/><path d="${d}" class="jr-road-dash"/>${arrows.join('')}${o?`<path d="${smoothPath([fork,board.nodes[lane.ids[0]]])}" class="jr-barrier ${o.open||o.openUntil>=run.turn?'open':''}"/>`:''}</g>`);
  }
  for(const br of board.bridges||[]){if(br.realm!==realm)continue;const a=board.nodes[br.from],b=board.nodes[br.to],mx=(a.x+b.x)/2,my=(a.y+b.y)/2-18;
   out.push(`<g class="jr-bridge" data-lane-key="${realm}:bridge:${br.to}"><path d="M${a.x} ${a.y} Q${f(mx)} ${f(my)} ${b.x} ${b.y}" class="jr-bridge-rail"/><path d="M${a.x} ${a.y} Q${f(mx)} ${f(my)} ${b.x} ${b.y}" class="jr-bridge-planks"/></g>`);}
  out.push(crossroadsSign(board,data));
  for(const lane of data.lanes)out.push(laneBanner(board,{...lane,key:realm+':'+lane.lane}));
 }
 return out.join('');
}
// A themed scene stands beside the road, joined to its space by a short path.
function landmarkScene(l,n){
 const side=n.side||1,cx=n.x+side*240,cy=n.y-70,p=sceneProfile(l);
 return `<g class="jr-landmark scenery-${p.kind}" data-location="${e(l.id)}"><path d="M${n.x} ${n.y} Q${f((n.x+cx)/2)} ${n.y+8} ${f(cx-side*118)} ${f(cy+60)}" class="jr-landmark-link"/><g transform="translate(${f(cx)},${f(cy)})"><rect x="-154" y="-110" width="308" height="226" rx="26" fill="#fffaf0" stroke="${p.accent}" stroke-width="5"/><svg x="-150" y="-106" width="300" height="193" aria-label="${e(l.name)} scene">${locationSceneSVG(l)}</svg><text y="109" text-anchor="middle" class="jr-landmark-name">${e(l.name.length>30?l.name.slice(0,29)+'…':l.name)}</text></g></g>`;
}
function laneKey(board,node){const r=board.realms[node.realm];const lane=r?.lanes?.find(l=>l.ids.includes(node.id));return lane?node.realm+':'+lane.lane:null;}
Object.assign(exports,{LANE_STYLE,laneStyle,smoothPath,zoneLayerSVG,roadLayerSVG,landmarkScene,laneKey});
