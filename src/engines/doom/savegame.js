// Doom save games: a plain-JSON snapshot of the running level (sectors, lines, sides, every thing and special
// thinker, the player) that deserialize() rebuilds on a freshly loaded copy of the same map.
const {Mobj}=require("src/engines/doom/play.js");
const {Door,Floor,Ceiling,Plat,Light,tFireFlicker,tLightFlash,tStrobe,tGlow}=require("src/engines/doom/spec.js");
const LIGHTS={tFireFlicker,tLightFlash,tStrobe,tGlow};
const MOBJ_KEYS=['id','type','x','y','z','momx','momy','momz','angle','flags','health','stnum','tics','movedir','movecount','reactiontime','threshold','lastlook','radius','height','floorz','ceilingz','head','wanted'];
function serialize(g,meta={}){
 const lv=g.lv,ref=m=>m&&!m.removed?m.id:null;
 const things=[],specials=[];let order=0;
 for(const t of g.thinkers){if(t.removed)continue;
  if(t instanceof Mobj){const o={};for(const k of MOBJ_KEYS)o[k]=t[k];o.target=ref(t.target);o.tracer=ref(t.tracer);o.sp=t.spawnpoint?lv.things.indexOf(t.spawnpoint):-1;o.player=!!t.player;o.order=order++;things.push(o);continue;}
  const kind=t instanceof Door?'door':t instanceof Floor?'floor':t instanceof Ceiling?'ceiling':t instanceof Plat?'plat':t instanceof Light?'light':null;if(!kind)continue;
  const o={kind,sector:t.sector.id};for(const [k,v] of Object.entries(t))if(!['game','sector','removed','fn'].includes(k)&&(typeof v!=='object'||v===null))o[k]=v;
  if(kind==='light')o.fn=Object.keys(LIGHTS).find(n=>LIGHTS[n]===t.fn);o.order=order++;o.active=kind==='plat'?g.activeplats.includes(t):kind==='ceiling'?g.activeceilings.includes(t):false;specials.push(o);}
 const pl=g.players[0],p={};for(const [k,v] of Object.entries(pl)){if(['mo','attacker','cmd','psprites','message'].includes(k))continue;p[k]=Array.isArray(v)?v.slice():v;}
 p.psprites=pl.psprites.map(s=>({stnum:s.state?s.stnum:0,tics:s.tics,sx:s.sx,sy:s.sy}));p.attacker=ref(pl.attacker);
 return {v:1,meta,ep:g.gameepisode,map:g.gamemap,skill:g.skill,leveltime:g.leveltime,gametic:g.gametic,rnd:[g.prndindex,g.rndindex],rtable:Array.from(g.rtable),
  totals:[g.totalkills,g.totalitems,g.totalsecret],
  sectors:lv.sectors.map(s=>[s.floorheight,s.ceilingheight,s.floorpic,s.ceilingpic,s.lightlevel,s.special,s.tag,ref(s.soundtarget)]),
  lines:lv.lines.map(l=>[l.special,l.flags,l.tag]),sides:lv.sides.map(d=>[d.textureoffset,d.rowoffset,d.toptexture,d.bottomtexture,d.midtexture]),
  things,specials,player:p,buttons:g.buttons.map(b=>({line:b.line.id,where:b.where,tex:b.tex,timer:b.timer})),brain:(g.braintargets||[]).map(ref)};}
function deserialize(g,d){
 g.skill=d.skill;g.gameepisode=d.ep;g.gamemap=d.map;g.initNew(d.skill,d.ep,d.map);
 const lv=g.lv;
 // drop everything initNew spawned; rebuild from the snapshot
 for(const t of g.thinkers)if(t instanceof Mobj)g.unsetThingPosition(t);
 g.thinkers=[];g.activeplats=[];g.activeceilings=[];g.buttons=[];for(const s of lv.sectors){s.thinglist=null;s.specialdata=null;}lv.blocklinks.fill(null);
 g.leveltime=d.leveltime;g.gametic=d.gametic;g.rtable=Uint8Array.from(d.rtable);[g.prndindex,g.rndindex]=d.rnd;[g.totalkills,g.totalitems,g.totalsecret]=d.totals;
 d.sectors.forEach((a,i)=>{const s=lv.sectors[i];[s.floorheight,s.ceilingheight,s.floorpic,s.ceilingpic,s.lightlevel,s.special,s.tag]=a;});
 d.lines.forEach((a,i)=>{const l=lv.lines[i];[l.special,l.flags,l.tag]=a;});
 d.sides.forEach((a,i)=>{const s=lv.sides[i];[s.textureoffset,s.rowoffset,s.toptexture,s.bottomtexture,s.midtexture]=a;});
 const byId=new Map(),pending=[];
 const pl=Object.assign(g.players[0],d.player);pl.cmd={forwardmove:0,sidemove:0,angleturn:0,buttons:0};pl.message=null;
 for(const o of d.things){const m=new Mobj();m.game=g;for(const k of MOBJ_KEYS)m[k]=o[k];m.info=g.mobjinfo[m.type];m.state=g.states[m.stnum];m.sprite=m.state.sprite;m.frame=m.state.frame;
  m.spawnpoint=o.sp>=0?lv.things[o.sp]:null;m.px=m.x;m.py=m.y;m.pz=m.z;g.setThingPosition(m);g.addThinker(m);byId.set(m.id,m);pending.push([m,o]);if(o.player){m.player=pl;pl.mo=m;}}
 for(const [m,o] of pending){m.target=byId.get(o.target)||null;m.tracer=byId.get(o.tracer)||null;}
 g.nextId=Math.max(1,...d.things.map(t=>t.id))+1;
 pl.psprites=d.player.psprites.map(s=>({state:s.stnum?g.states[s.stnum]:null,stnum:s.stnum,tics:s.tics,sx:s.sx,sy:s.sy}));pl.attacker=byId.get(d.player.attacker)||null;
 d.sectors.forEach((a,i)=>{lv.sectors[i].soundtarget=byId.get(a[7])||null;});
 const K={door:Door,floor:Floor,ceiling:Ceiling,plat:Plat,light:Light};
 for(const o of d.specials){const t=new K[o.kind](g);for(const [k,v] of Object.entries(o))if(!['kind','sector','active','fn'].includes(k))t[k]=v;t.sector=lv.sectors[o.sector];
  if(o.kind==='light'){t.fn=LIGHTS[o.fn]||tGlow;t.sector.lightingdata=t;}else t.sector.specialdata=t;
  g.addThinker(t);if(o.active&&o.kind==='plat')g.activeplats.push(t);if(o.active&&o.kind==='ceiling')g.activeceilings.push(t);}
 // the original thinker order (it decides who uses the random numbers first)
 const ord=new Map();d.things.forEach(o=>ord.set(byId.get(o.id),o.order??0));g.thinkers.forEach((t,i)=>{if(!ord.has(t))ord.set(t,d.specials[i-d.things.length]?.order??i);});g.thinkers.sort((a,b)=>ord.get(a)-ord.get(b));
 g.buttons=d.buttons.map(b=>({line:lv.lines[b.line],side:lv.sides[lv.lines[b.line].sidenum[0]],where:b.where,tex:b.tex,timer:b.timer}));
 g.braintargets=(d.brain||[]).map(id=>byId.get(id)).filter(Boolean);
 return d.meta||{};}
Object.assign(exports,{serialize,deserialize});
