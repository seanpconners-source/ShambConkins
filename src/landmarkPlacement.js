const {LOCATIONS}=require("src/locations.js");
const {LAB_ID}=require("src/data/savoryLab.js");
const {shuffle, pick}=require("src/utils.js");
// One small, spaced sample of the catalog per realm. Neither inherited fixed
// locations nor a decorations pass can turn every other node into a landmark.
function placeLandmarks(nodes,realm,random){
 const road=[],seen=new Set();let id=realm+'-start';
 while(nodes[id]?.realm===realm&&!seen.has(id)){seen.add(id);road.push(nodes[id]);id=nodes[id].next[0];}
 const chosen=[],candidates=shuffle(road.map((node,index)=>({node,index})).filter(p=>p.index>=5&&p.index<road.length-3&&!p.node.route&&!['start','gate','dice'].includes(p.node.type)),random);
 for(const place of candidates){if(chosen.every(p=>Math.abs(p.index-place.index)>=7&&Math.hypot(p.node.x-place.node.x,p.node.y-place.node.y)>=170)){chosen.push(place);if(chosen.length===5)break;}}
 const places=shuffle(LOCATIONS.filter(l=>l.realm===realm&&l.id!=='upside-down'&&l.id!=='parents'&&l.id!==LAB_ID),random).slice(0,chosen.length);
 if(realm==='mind'&&places.length){places[0]=LOCATIONS.find(l=>l.id==='parents');if(places.length>1&&random()<.35)places[1]=LOCATIONS.find(l=>l.id===LAB_ID);}
 chosen.forEach(({node},i)=>{node.type='location';node.location=places[i].id;});
 // One optional detour landmark, kept away from the main-road stops.
 const branches=Object.values(nodes).filter(n=>n.realm===realm&&n.branch&&!n.route&&chosen.every(p=>Math.hypot(n.x-p.node.x,n.y-p.node.y)>=190));
 if(branches.length&&random()<.65){const node=pick(branches,random),used=new Set(places.map(p=>p.id)),extra=LOCATIONS.filter(l=>l.realm===realm&&l.id!=='upside-down'&&!used.has(l.id));const place=pick(extra,random);if(place){node.type='location';node.location=place.id;}}
 return chosen.map(p=>p.node.id);
}

Object.assign(exports,{placeLandmarks});