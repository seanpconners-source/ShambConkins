// Doom map specials: moving sectors (doors incl. locked/blazing, lifts, floors, stairs, donuts, ceilings/crushers),
// light effects, switches and their timed reset, teleporters, damaging/secret sectors, scrolling walls and the
// walk-over / use / shoot line trigger tables.
const P=require("src/engines/doom/play.js");
const {Game,MF,MT,fsin,fcos}=P;
const {ML}=require("src/engines/doom/level.js");
const OK=0,CRUSHED=1,PASTDEST=2,VDOORSPEED=2,VDOORWAIT=150,FLOORSPEED=1,CEILSPEED=1,PLATSPEED=1,PLATWAIT=3,GLOWSPEED=8,STROBEBRIGHT=5,FASTDARK=15,SLOWDARK=35,BUTTONTIME=35;

class Thinker{constructor(g){this.game=g;this.removed=false;}}
class Door extends Thinker{think(){this.game.tVerticalDoor(this);}}
class Floor extends Thinker{think(){this.game.tMoveFloor(this);}}
class Ceiling extends Thinker{think(){this.game.tMoveCeiling(this);}}
class Plat extends Thinker{think(){this.game.tPlatRaise(this);}}
class Light extends Thinker{think(){this.fn.call(this.game,this);}}

const getNextSector=(ln,sec)=>!(ln.flags&ML.TWOSIDED)?null:ln.frontsector===sec?ln.backsector:ln.frontsector;
Object.assign(Game.prototype,{
 *taggedSectors(line){for(const s of this.lv.sectors)if(s.tag===line.tag)yield s;},
 findLowestFloorSurrounding(sec){let f=sec.floorheight;for(const ln of sec.lines){const o=getNextSector(ln,sec);if(o&&o.floorheight<f)f=o.floorheight;}return f;},
 findHighestFloorSurrounding(sec){let f=-500;for(const ln of sec.lines){const o=getNextSector(ln,sec);if(o&&o.floorheight>f)f=o.floorheight;}return f;},
 findNextHighestFloor(sec,cur){let best=Infinity;for(const ln of sec.lines){const o=getNextSector(ln,sec);if(o&&o.floorheight>cur&&o.floorheight<best)best=o.floorheight;}return best===Infinity?cur:best;},
 findLowestCeilingSurrounding(sec){let h=32767;for(const ln of sec.lines){const o=getNextSector(ln,sec);if(o&&o.ceilingheight<h)h=o.ceilingheight;}return h;},
 findHighestCeilingSurrounding(sec){let h=0;for(const ln of sec.lines){const o=getNextSector(ln,sec);if(o&&o.ceilingheight>h)h=o.ceilingheight;}return h;},
 findMinSurroundingLight(sec,max){let m=max;for(const ln of sec.lines){const o=getNextSector(ln,sec);if(o&&o.lightlevel<m)m=o.lightlevel;}return m;},
 // T_MovePlane: move a floor (0) or ceiling (1) toward dest; undo the step if things get stuck
 movePlane(sec,speed,dest,crush,which,dir){
  const k=which?'ceilingheight':'floorheight';
  // remember where the planes were at the start of this tic, for smooth drawing between tics
  if(sec.movedTic!==this.gametic){sec.movedTic=this.gametic;sec.pf=sec.floorheight;sec.pc=sec.ceilingheight;(this.movedSectors||=new Set()).add(sec);}
  if(which===0){
   if(dir===-1){if(sec[k]-speed<dest){const last=sec[k];sec[k]=dest;if(this.changeSector(sec,crush)){sec[k]=last;this.changeSector(sec,crush);}return PASTDEST;}
    const last=sec[k];sec[k]-=speed;if(this.changeSector(sec,crush)){sec[k]=last;this.changeSector(sec,crush);return CRUSHED;}}
   else{if(sec[k]+speed>dest){const last=sec[k];sec[k]=dest;if(this.changeSector(sec,crush)){sec[k]=last;this.changeSector(sec,crush);}return PASTDEST;}
    const last=sec[k];sec[k]+=speed;if(this.changeSector(sec,crush)){if(crush)return CRUSHED;sec[k]=last;this.changeSector(sec,crush);return CRUSHED;}}}
  else{
   if(dir===-1){if(sec[k]-speed<dest){const last=sec[k];sec[k]=dest;if(this.changeSector(sec,crush)){sec[k]=last;this.changeSector(sec,crush);}return PASTDEST;}
    const last=sec[k];sec[k]-=speed;if(this.changeSector(sec,crush)){if(crush)return CRUSHED;sec[k]=last;this.changeSector(sec,crush);return CRUSHED;}}
   else{if(sec[k]+speed>dest){const last=sec[k];sec[k]=dest;if(this.changeSector(sec,crush)){sec[k]=last;this.changeSector(sec,crush);}return PASTDEST;}
    sec[k]+=speed;this.changeSector(sec,crush);}}
  return OK;},
 // ---- doors ----
 tVerticalDoor(d){const s=d.sector;
  switch(d.direction){
   case 0:if(!--d.topcountdown){if(d.type==='blazeRaise'){d.direction=-1;this.sound(s.soundorg,'bdcls');}else if(d.type==='normal'){d.direction=-1;this.sound(s.soundorg,'dorcls');}else if(d.type==='close30ThenOpen'){d.direction=1;this.sound(s.soundorg,'doropn');}}break;
   case 2:if(!--d.topcountdown&&d.type==='raiseIn5Mins'){d.direction=1;d.type='normal';this.sound(s.soundorg,'doropn');}break;
   case -1:{const r=this.movePlane(s,d.speed,s.floorheight,false,1,-1);
    if(r===PASTDEST){if(d.type==='blazeRaise'||d.type==='blazeClose'){s.specialdata=null;this.removeThinker(d);this.sound(s.soundorg,'bdcls');}
     else if(d.type==='normal'||d.type==='close'){s.specialdata=null;this.removeThinker(d);}
     else if(d.type==='close30ThenOpen'){d.direction=0;d.topcountdown=35*30;}}
    else if(r===CRUSHED&&d.type!=='blazeClose'&&d.type!=='close'){d.direction=1;this.sound(s.soundorg,'doropn');}break;}
   case 1:{const r=this.movePlane(s,d.speed,d.topheight,false,1,1);
    if(r===PASTDEST){if(d.type==='blazeRaise'||d.type==='normal'){d.direction=0;d.topcountdown=d.topwait;}else{s.specialdata=null;this.removeThinker(d);}}break;}}},
 newDoor(sec,type){const d=new Door(this);d.sector=sec;d.type=type;d.topwait=VDOORWAIT;d.speed=VDOORSPEED;sec.specialdata=d;this.addThinker(d);return d;},
 evDoLockedDoor(line,type,thing){const p=thing.player;if(!p)return false;
  const need=({99:[0,3,'PD_BLUEO'],133:[0,3,'PD_BLUEO'],134:[2,5,'PD_REDO'],135:[2,5,'PD_REDO'],136:[1,4,'PD_YELLOWO'],137:[1,4,'PD_YELLOWO']})[line.special];
  if(need&&!p.cards[need[0]]&&!p.cards[need[1]]){p.message=this.str(need[2]);this.sound(null,'oof');return false;}
  return this.evDoDoor(line,type);},
 evDoDoor(line,type){let rtn=false;
  for(const sec of this.taggedSectors(line)){if(sec.specialdata)continue;rtn=true;const d=this.newDoor(sec,type);
   switch(type){
    case 'blazeClose':d.topheight=this.findLowestCeilingSurrounding(sec)-4;d.direction=-1;d.speed=VDOORSPEED*4;this.sound(sec.soundorg,'bdcls');break;
    case 'close':d.topheight=this.findLowestCeilingSurrounding(sec)-4;d.direction=-1;this.sound(sec.soundorg,'dorcls');break;
    case 'close30ThenOpen':d.topheight=sec.ceilingheight;d.direction=-1;this.sound(sec.soundorg,'dorcls');break;
    case 'blazeRaise':case 'blazeOpen':d.direction=1;d.topheight=this.findLowestCeilingSurrounding(sec)-4;d.speed=VDOORSPEED*4;if(d.topheight!==sec.ceilingheight)this.sound(sec.soundorg,'bdopn');break;
    default:d.direction=1;d.topheight=this.findLowestCeilingSurrounding(sec)-4;if(d.topheight!==sec.ceilingheight)this.sound(sec.soundorg,'doropn');}}
  return rtn;},
 evVerticalDoor(line,thing){
  const p=thing.player,lock=({26:[0,3,'PD_BLUEK'],32:[0,3,'PD_BLUEK'],27:[1,4,'PD_YELLOWK'],34:[1,4,'PD_YELLOWK'],28:[2,5,'PD_REDK'],33:[2,5,'PD_REDK']})[line.special];
  if(lock){if(!p)return;if(!p.cards[lock[0]]&&!p.cards[lock[1]]){p.message=this.str(lock[2]);this.sound(null,'oof');return;}}
  const sec=line.backsector;if(!sec)return;
  if(sec.specialdata){const d=sec.specialdata;if([1,26,27,28,117].includes(line.special)){if(d.direction===-1)d.direction=1;else{if(!thing.player)return;d.direction=-1;}}return;}
  this.sound(sec.soundorg,line.special===117||line.special===118?'bdopn':'doropn');
  const d=this.newDoor(sec,'normal');d.direction=1;
  switch(line.special){case 31:case 32:case 33:case 34:d.type='open';line.special=0;break;case 117:d.type='blazeRaise';d.speed=VDOORSPEED*4;break;case 118:d.type='blazeOpen';line.special=0;d.speed=VDOORSPEED*4;break;}
  d.topheight=this.findLowestCeilingSurrounding(sec)-4;},
 spawnDoorCloseIn30(sec){const d=this.newDoor(sec,'normal');sec.special=0;d.direction=0;d.topcountdown=30*35;},
 spawnDoorRaiseIn5Mins(sec){const d=this.newDoor(sec,'raiseIn5Mins');sec.special=0;d.direction=2;d.topheight=this.findLowestCeilingSurrounding(sec)-4;d.topcountdown=5*60*35;},
 // ---- floors ----
 tMoveFloor(f){const s=f.sector,r=this.movePlane(s,f.speed,f.floordestheight,f.crush,0,f.direction);
  if(!(this.leveltime&7))this.sound(s.soundorg,'stnmov');
  if(r===PASTDEST){s.specialdata=null;
   if(f.direction===1&&f.type==='donutRaise'){s.special=f.newspecial;s.floorpic=f.texture;}
   else if(f.direction===-1&&f.type==='lowerAndChange'){s.special=f.newspecial;s.floorpic=f.texture;}
   this.removeThinker(f);this.sound(s.soundorg,'pstop');}},
 newFloor(sec,type){const f=new Floor(this);f.sector=sec;f.type=type;f.crush=false;f.speed=FLOORSPEED;sec.specialdata=f;this.addThinker(f);return f;},
 evDoFloor(line,type){let rtn=false;
  for(const sec of this.taggedSectors(line)){if(sec.specialdata)continue;rtn=true;const f=this.newFloor(sec,type);
   switch(type){
    case 'lowerFloor':f.direction=-1;f.floordestheight=this.findHighestFloorSurrounding(sec);break;
    case 'lowerFloorToLowest':f.direction=-1;f.floordestheight=this.findLowestFloorSurrounding(sec);break;
    case 'turboLower':f.direction=-1;f.speed=FLOORSPEED*4;f.floordestheight=this.findHighestFloorSurrounding(sec);if(f.floordestheight!==sec.floorheight)f.floordestheight+=8;break;
    case 'raiseFloorCrush':case 'raiseFloor':if(type==='raiseFloorCrush')f.crush=true;f.direction=1;f.floordestheight=Math.min(this.findLowestCeilingSurrounding(sec),sec.ceilingheight)-(type==='raiseFloorCrush'?8:0);break;
    case 'raiseFloorTurbo':f.direction=1;f.speed=FLOORSPEED*4;f.floordestheight=this.findNextHighestFloor(sec,sec.floorheight);break;
    case 'raiseFloorToNearest':f.direction=1;f.floordestheight=this.findNextHighestFloor(sec,sec.floorheight);break;
    case 'raiseFloor24':f.direction=1;f.floordestheight=sec.floorheight+24;break;
    case 'raiseFloor512':f.direction=1;f.floordestheight=sec.floorheight+512;break;
    case 'raiseFloor24AndChange':f.direction=1;f.floordestheight=sec.floorheight+24;if(line.frontsector){sec.floorpic=line.frontsector.floorpic;sec.special=line.frontsector.special;}break;
    case 'raiseToTexture':{let min=32767;f.direction=1;for(const ln of sec.lines){if(!(ln.flags&ML.TWOSIDED))continue;for(const sn of ln.sidenum){const sd=this.lv.sides[sn];if(!sd)continue;const h=this.gfx.texHeight(sd.bottomtexture);if(h<min)min=h;}}f.floordestheight=sec.floorheight+min;break;}
    case 'lowerAndChange':f.direction=-1;f.floordestheight=this.findLowestFloorSurrounding(sec);f.texture=sec.floorpic;f.newspecial=sec.special;
     for(const ln of sec.lines){if(!(ln.flags&ML.TWOSIDED))continue;const o=ln.frontsector===sec?ln.backsector:ln.frontsector;if(o&&o.floorheight===f.floordestheight){f.texture=o.floorpic;f.newspecial=o.special;break;}}break;}}
  return rtn;},
 evBuildStairs(line,type){let rtn=false;
  for(let sec of this.taggedSectors(line)){if(sec.specialdata)continue;rtn=true;const speed=type==='build8'?FLOORSPEED/4:FLOORSPEED*4,size=type==='build8'?8:16;
   let f=this.newFloor(sec,'stairs');f.direction=1;f.speed=speed;let height=sec.floorheight+size;f.floordestheight=height;const tex=sec.floorpic;
   for(let ok=true;ok;){ok=false;
    for(const ln of sec.lines){if(!(ln.flags&ML.TWOSIDED))continue;if(ln.frontsector!==sec)continue;const t=ln.backsector;if(!t||t.floorpic!==tex)continue;height+=size;if(t.specialdata)continue;
     sec=t;f=this.newFloor(sec,'stairs');f.direction=1;f.speed=speed;f.floordestheight=height;ok=true;break;}}}
  return rtn;},
 evDoDonut(line){let rtn=false;
  for(const s1 of this.taggedSectors(line)){if(s1.specialdata)continue;rtn=true;const s2=getNextSector(s1.lines[0],s1);if(!s2)continue;
   for(const ln of s2.lines){if(!(ln.flags&ML.TWOSIDED)||ln.backsector===s1)continue;const s3=ln.backsector;if(!s3)continue;
    const a=this.newFloor(s2,'donutRaise');a.direction=1;a.speed=FLOORSPEED/2;a.texture=s3.floorpic;a.newspecial=0;a.floordestheight=s3.floorheight;
    const b=this.newFloor(s1,'lowerFloor');b.direction=-1;b.speed=FLOORSPEED/2;b.floordestheight=s3.floorheight;break;}}
  return rtn;},
 // ---- ceilings ----
 tMoveCeiling(c){const s=c.sector;
  if(c.direction===1){const r=this.movePlane(s,c.speed,c.topheight,false,1,1);if(!(this.leveltime&7)&&c.type!=='silentCrushAndRaise')this.sound(s.soundorg,'stnmov');
   if(r===PASTDEST){if(c.type==='raiseToHighest')this.removeActiveCeiling(c);else if(c.type==='silentCrushAndRaise'||c.type==='fastCrushAndRaise'||c.type==='crushAndRaise'){if(c.type==='silentCrushAndRaise')this.sound(s.soundorg,'pstop');c.direction=-1;}}}
  else if(c.direction===-1){const r=this.movePlane(s,c.speed,c.bottomheight,c.crush,1,-1);if(!(this.leveltime&7)&&c.type!=='silentCrushAndRaise')this.sound(s.soundorg,'stnmov');
   if(r===PASTDEST){if(c.type==='silentCrushAndRaise'||c.type==='crushAndRaise'||c.type==='fastCrushAndRaise'){if(c.type==='silentCrushAndRaise')this.sound(s.soundorg,'pstop');if(c.type!=='fastCrushAndRaise')c.speed=CEILSPEED;c.direction=1;}
    else if(c.type==='lowerAndCrush'||c.type==='lowerToFloor')this.removeActiveCeiling(c);}
   else if(r===CRUSHED&&(c.type==='silentCrushAndRaise'||c.type==='crushAndRaise'||c.type==='lowerAndCrush'))c.speed=CEILSPEED/8;}},
 removeActiveCeiling(c){c.sector.specialdata=null;this.removeThinker(c);this.activeceilings=this.activeceilings.filter(x=>x!==c);},
 evDoCeiling(line,type){let rtn=false;
  if(type==='fastCrushAndRaise'||type==='silentCrushAndRaise'||type==='crushAndRaise')for(const c of this.activeceilings)if(c.tag===line.tag&&c.direction===0){c.direction=c.olddirection;rtn=true;}
  for(const sec of this.taggedSectors(line)){if(sec.specialdata)continue;rtn=true;const c=new Ceiling(this);c.sector=sec;c.type=type;c.crush=false;sec.specialdata=c;this.addThinker(c);
   switch(type){
    case 'fastCrushAndRaise':c.crush=true;c.topheight=sec.ceilingheight;c.bottomheight=sec.floorheight+8;c.direction=-1;c.speed=CEILSPEED*2;break;
    case 'silentCrushAndRaise':case 'crushAndRaise':c.crush=true;c.topheight=sec.ceilingheight;c.bottomheight=sec.floorheight+8;c.direction=-1;c.speed=CEILSPEED;break;
    case 'lowerAndCrush':case 'lowerToFloor':c.bottomheight=sec.floorheight+(type==='lowerToFloor'?0:8);c.direction=-1;c.speed=CEILSPEED;break;
    case 'raiseToHighest':c.topheight=this.findHighestCeilingSurrounding(sec);c.direction=1;c.speed=CEILSPEED;break;}
   c.tag=sec.tag;this.activeceilings.push(c);}
  return rtn;},
 evCeilingCrushStop(line){let rtn=false;for(const c of this.activeceilings)if(c.tag===line.tag&&c.direction!==0){c.olddirection=c.direction;c.direction=0;rtn=true;}return rtn;},
 // ---- lifts ----
 tPlatRaise(p){const s=p.sector;
  switch(p.status){
   case 'up':{const r=this.movePlane(s,p.speed,p.high,p.crush,0,1);if((p.type==='raiseAndChange'||p.type==='raiseToNearestAndChange')&&!(this.leveltime&7))this.sound(s.soundorg,'stnmov');
    if(r===CRUSHED&&!p.crush){p.count=p.wait;p.status='down';this.sound(s.soundorg,'pstart');}
    else if(r===PASTDEST){p.count=p.wait;p.status='waiting';this.sound(s.soundorg,'pstop');if(['blazeDWUS','downWaitUpStay','raiseAndChange','raiseToNearestAndChange'].includes(p.type))this.removeActivePlat(p);}break;}
   case 'down':{const r=this.movePlane(s,p.speed,p.low,false,0,-1);if(r===PASTDEST){p.count=p.wait;p.status='waiting';this.sound(s.soundorg,'pstop');}break;}
   case 'waiting':if(!--p.count){p.status=s.floorheight===p.low?'up':'down';this.sound(s.soundorg,'pstart');}break;}},
 removeActivePlat(p){p.sector.specialdata=null;this.removeThinker(p);this.activeplats=this.activeplats.filter(x=>x!==p);},
 evDoPlat(line,type,amount){let rtn=false;
  if(type==='perpetualRaise')for(const p of this.activeplats)if(p.tag===line.tag&&p.status==='in_stasis'){p.status=p.oldstatus;}
  for(const sec of this.taggedSectors(line)){if(sec.specialdata)continue;rtn=true;const p=new Plat(this);p.type=type;p.sector=sec;sec.specialdata=p;p.crush=false;p.tag=line.tag;this.addThinker(p);
   const front=line.frontsector||(line.sidenum&&this.lv.sides[line.sidenum[0]]?.sector);
   switch(type){
    case 'raiseToNearestAndChange':p.speed=PLATSPEED/2;if(front)sec.floorpic=front.floorpic;p.high=this.findNextHighestFloor(sec,sec.floorheight);p.wait=0;p.status='up';sec.special=0;this.sound(sec.soundorg,'stnmov');break;
    case 'raiseAndChange':p.speed=PLATSPEED/2;if(front)sec.floorpic=front.floorpic;p.high=sec.floorheight+amount;p.wait=0;p.status='up';this.sound(sec.soundorg,'stnmov');break;
    case 'downWaitUpStay':case 'blazeDWUS':p.speed=PLATSPEED*(type==='blazeDWUS'?8:4);p.low=Math.min(this.findLowestFloorSurrounding(sec),sec.floorheight);p.high=sec.floorheight;p.wait=35*PLATWAIT;p.status='down';this.sound(sec.soundorg,'pstart');break;
    case 'perpetualRaise':p.speed=PLATSPEED;p.low=Math.min(this.findLowestFloorSurrounding(sec),sec.floorheight);p.high=Math.max(this.findHighestFloorSurrounding(sec),sec.floorheight);p.wait=35*PLATWAIT;p.status=this.P_Random()&1?'down':'up';this.sound(sec.soundorg,'pstart');break;}
   this.activeplats.push(p);}
  return rtn;},
 evStopPlat(line){for(const p of this.activeplats)if(p.status!=='in_stasis'&&p.tag===line.tag){p.oldstatus=p.status;p.status='in_stasis';}},
 // ---- lights ----
 light(sec,fn,o){const l=new Light(this);l.sector=sec;l.fn=fn;Object.assign(l,o);sec.lightingdata=l;this.addThinker(l);return l;},
 spawnFireFlicker(sec){sec.special=0;this.light(sec,tFireFlicker,{maxlight:sec.lightlevel,minlight:this.findMinSurroundingLight(sec,sec.lightlevel)+16,count:4});},
 spawnLightFlash(sec){sec.special=0;this.light(sec,tLightFlash,{maxlight:sec.lightlevel,minlight:this.findMinSurroundingLight(sec,sec.lightlevel),maxtime:64,mintime:7,count:(this.P_Random()&64)+1});},
 spawnStrobeFlash(sec,dark,sync){const min=this.findMinSurroundingLight(sec,sec.lightlevel);this.light(sec,tStrobe,{darktime:dark,brighttime:STROBEBRIGHT,maxlight:sec.lightlevel,minlight:min===sec.lightlevel?0:min,count:sync?1:(this.P_Random()&7)+1});sec.special=0;},
 spawnGlowingLight(sec){this.light(sec,tGlow,{minlight:this.findMinSurroundingLight(sec,sec.lightlevel),maxlight:sec.lightlevel,direction:-1});sec.special=0;},
 evStartLightStrobing(line){for(const s of this.taggedSectors(line)){if(s.specialdata)continue;this.spawnStrobeFlash(s,SLOWDARK,0);}},
 evTurnTagLightsOff(line){for(const s of this.taggedSectors(line)){let min=s.lightlevel;for(const ln of s.lines){const o=getNextSector(ln,s);if(o&&o.lightlevel<min)min=o.lightlevel;}s.lightlevel=min;}},
 evLightTurnOn(line,bright){for(const s of this.taggedSectors(line)){if(!bright)for(const ln of s.lines){const o=getNextSector(ln,s);if(o&&o.lightlevel>bright)bright=o.lightlevel;}s.lightlevel=bright;}},
 // ---- teleport ----
 evTeleport(line,side,thing){
  if(thing.flags&MF.MISSILE)return false;if(side===1)return false;
  for(const sec of this.taggedSectors(line))for(const m of this.mobjs()){if(m.type!==MT.TELEPORTMAN||m.subsector.sector!==sec)continue;
   const ox=thing.x,oy=thing.y,oz=thing.z;if(!this.teleportMove(thing,m.x,m.y))return false;thing.z=thing.floorz;thing.pz=thing.z;
   if(thing.player)thing.player.viewz=thing.z+thing.player.viewheight;
   let fog=this.spawnMobj(ox,oy,oz,MT.TFOG);this.sound(fog,'telept');fog=this.spawnMobj(m.x+20*fcos(m.angle),m.y+20*fsin(m.angle),thing.z,MT.TFOG);this.sound(fog,'telept');
   if(thing.player){thing.reactiontime=18;this.events.push({kind:'teleport',player:thing.player});}thing.angle=m.angle;thing.momx=thing.momy=thing.momz=0;return true;}
  return false;},
 // ---- switches ----
 changeSwitchTexture(line,useAgain){
  if(!useAgain)line.special=0;const side=this.lv.sides[line.sidenum[0]],snd=line.special===11?'swtchx':'swtchn',sw=this.gfx.switchOf;
  for(const where of ['toptexture','midtexture','bottomtexture']){const t=side[where],o=sw.get(t);if(o===undefined||!t)continue;
   this.sound(line.soundorg,snd);side[where]=o;if(useAgain)this.buttons.push({line,side,where,tex:t,timer:BUTTONTIME});return;}},
 // ---- per-tic updates (P_UpdateSpecials) ----
 updateSpecials(){
  this.gfx.animate(this.leveltime);
  for(const ln of this.scrollers){const sd=this.lv.sides[ln.sidenum[0]];sd.textureoffset+=1;}
  for(const b of this.buttons)if(b.timer&&!--b.timer){b.side[b.where]=b.tex;this.sound(b.line.soundorg,'swtchn');}
  this.buttons=this.buttons.filter(b=>b.timer>0);},
 spawnSpecials(){
  this.activeplats=[];this.activeceilings=[];this.buttons=[];this.scrollers=[];this.totalsecret=0;
  for(const sec of this.lv.sectors){if(!sec.special)continue;
   switch(sec.special){
    case 1:this.spawnLightFlash(sec);break;case 2:this.spawnStrobeFlash(sec,FASTDARK,0);break;case 3:this.spawnStrobeFlash(sec,SLOWDARK,0);break;
    case 4:this.spawnStrobeFlash(sec,FASTDARK,0);sec.special=4;break;case 8:this.spawnGlowingLight(sec);break;case 9:this.totalsecret++;break;
    case 10:this.spawnDoorCloseIn30(sec);break;case 12:this.spawnStrobeFlash(sec,SLOWDARK,1);break;case 13:this.spawnStrobeFlash(sec,FASTDARK,1);break;
    case 14:this.spawnDoorRaiseIn5Mins(sec);break;case 17:this.spawnFireFlicker(sec);break;}}
  for(const ln of this.lv.lines)if(ln.special===48)this.scrollers.push(ln);},
 playerInSpecialSector(pl){
  const sec=pl.mo.subsector.sector;if(pl.mo.z!==sec.floorheight)return;
  switch(sec.special){
   case 5:if(!pl.powers[3]&&!(this.leveltime&0x1f))this.damageMobj(pl.mo,null,null,10);break;
   case 7:if(!pl.powers[3]&&!(this.leveltime&0x1f))this.damageMobj(pl.mo,null,null,5);break;
   case 16:case 4:if((!pl.powers[3]||this.P_Random()<5)&&!(this.leveltime&0x1f))this.damageMobj(pl.mo,null,null,20);break;
   case 9:pl.secretcount++;sec.special=0;this.events.push({kind:'secret',player:pl});break;
   case 11:pl.cheats&=~2;if(!(this.leveltime&0x1f))this.damageMobj(pl.mo,null,null,20);if(pl.health<=10)this.exitLevel();break;}},
 // ---- line triggers ----
 crossSpecialLine(line,side,thing){
  if(!thing.player){
   if([MT.ROCKET,MT.PLASMA,MT.BFG,MT.TROOPSHOT,MT.HEADSHOT,MT.BRUISERSHOT].includes(thing.type))return;
   if(![39,97,125,126,4,10,88].includes(line.special))return;}
  const sp=line.special,once=()=>{line.special=0;};
  switch(sp){
   case 2:this.evDoDoor(line,'open');once();break;case 3:this.evDoDoor(line,'close');once();break;case 4:this.evDoDoor(line,'normal');once();break;
   case 5:this.evDoFloor(line,'raiseFloor');once();break;case 6:this.evDoCeiling(line,'fastCrushAndRaise');once();break;case 8:this.evBuildStairs(line,'build8');once();break;
   case 10:this.evDoPlat(line,'downWaitUpStay',0);once();break;case 12:this.evLightTurnOn(line,0);once();break;case 13:this.evLightTurnOn(line,255);once();break;
   case 16:this.evDoDoor(line,'close30ThenOpen');once();break;case 17:this.evStartLightStrobing(line);once();break;case 19:this.evDoFloor(line,'lowerFloor');once();break;
   case 22:this.evDoPlat(line,'raiseToNearestAndChange',0);once();break;case 25:this.evDoCeiling(line,'crushAndRaise');once();break;case 30:this.evDoFloor(line,'raiseToTexture');once();break;
   case 35:this.evLightTurnOn(line,35);once();break;case 36:this.evDoFloor(line,'turboLower');once();break;case 37:this.evDoFloor(line,'lowerAndChange');once();break;
   case 38:this.evDoFloor(line,'lowerFloorToLowest');once();break;case 39:this.evTeleport(line,side,thing);once();break;
   case 40:this.evDoCeiling(line,'raiseToHighest');this.evDoFloor(line,'lowerFloorToLowest');once();break;case 44:this.evDoCeiling(line,'lowerAndCrush');once();break;
   case 52:this.exitLevel();break;case 53:this.evDoPlat(line,'perpetualRaise',0);once();break;case 54:this.evStopPlat(line);once();break;
   case 56:this.evDoFloor(line,'raiseFloorCrush');once();break;case 57:this.evCeilingCrushStop(line);once();break;case 58:this.evDoFloor(line,'raiseFloor24');once();break;
   case 59:this.evDoFloor(line,'raiseFloor24AndChange');once();break;case 104:this.evTurnTagLightsOff(line);once();break;case 108:this.evDoDoor(line,'blazeRaise');once();break;
   case 109:this.evDoDoor(line,'blazeOpen');once();break;case 100:this.evBuildStairs(line,'turbo16');once();break;case 110:this.evDoDoor(line,'blazeClose');once();break;
   case 119:this.evDoFloor(line,'raiseFloorToNearest');once();break;case 121:this.evDoPlat(line,'blazeDWUS',0);once();break;case 124:this.secretExitLevel();break;
   case 125:if(!thing.player){this.evTeleport(line,side,thing);once();}break;case 130:this.evDoFloor(line,'raiseFloorTurbo');once();break;case 141:this.evDoCeiling(line,'silentCrushAndRaise');once();break;
   case 72:this.evDoCeiling(line,'lowerAndCrush');break;case 73:this.evDoCeiling(line,'crushAndRaise');break;case 74:this.evCeilingCrushStop(line);break;case 75:this.evDoDoor(line,'close');break;
   case 76:this.evDoDoor(line,'close30ThenOpen');break;case 77:this.evDoCeiling(line,'fastCrushAndRaise');break;case 79:this.evLightTurnOn(line,35);break;case 80:this.evLightTurnOn(line,0);break;
   case 81:this.evLightTurnOn(line,255);break;case 82:this.evDoFloor(line,'lowerFloorToLowest');break;case 83:this.evDoFloor(line,'lowerFloor');break;case 84:this.evDoFloor(line,'lowerAndChange');break;
   case 86:this.evDoDoor(line,'open');break;case 87:this.evDoPlat(line,'perpetualRaise',0);break;case 88:this.evDoPlat(line,'downWaitUpStay',0);break;case 89:this.evStopPlat(line);break;
   case 90:this.evDoDoor(line,'normal');break;case 91:this.evDoFloor(line,'raiseFloor');break;case 92:this.evDoFloor(line,'raiseFloor24');break;case 93:this.evDoFloor(line,'raiseFloor24AndChange');break;
   case 94:this.evDoFloor(line,'raiseFloorCrush');break;case 95:this.evDoPlat(line,'raiseToNearestAndChange',0);break;case 96:this.evDoFloor(line,'raiseToTexture');break;
   case 97:this.evTeleport(line,side,thing);break;case 98:this.evDoFloor(line,'turboLower');break;case 105:this.evDoDoor(line,'blazeRaise');break;case 106:this.evDoDoor(line,'blazeOpen');break;
   case 107:this.evDoDoor(line,'blazeClose');break;case 120:this.evDoPlat(line,'blazeDWUS',0);break;case 126:if(!thing.player)this.evTeleport(line,side,thing);break;
   case 128:this.evDoFloor(line,'raiseFloorToNearest');break;case 129:this.evDoFloor(line,'raiseFloorTurbo');break;}},
 shootSpecialLine(thing,line){
  if(!thing.player&&line.special!==46)return;
  switch(line.special){case 24:this.evDoFloor(line,'raiseFloor');this.changeSwitchTexture(line,0);break;case 46:this.evDoDoor(line,'open');this.changeSwitchTexture(line,1);break;
   case 47:this.evDoPlat(line,'raiseToNearestAndChange',0);this.changeSwitchTexture(line,0);break;}},
 useSpecialLine(thing,line,side){
  if(side)return false;
  if(!thing.player){if(line.flags&ML.SECRET)return false;if(![1,32,33,34].includes(line.special))return false;}
  const sw=(ok,again)=>{if(ok)this.changeSwitchTexture(line,again);};
  switch(line.special){
   case 1:case 26:case 27:case 28:case 31:case 32:case 33:case 34:case 117:case 118:this.evVerticalDoor(line,thing);break;
   case 7:sw(this.evBuildStairs(line,'build8'),0);break;case 9:sw(this.evDoDonut(line),0);break;case 11:this.changeSwitchTexture(line,0);this.exitLevel();break;
   case 14:sw(this.evDoPlat(line,'raiseAndChange',32),0);break;case 15:sw(this.evDoPlat(line,'raiseAndChange',24),0);break;case 18:sw(this.evDoFloor(line,'raiseFloorToNearest'),0);break;
   case 20:sw(this.evDoPlat(line,'raiseToNearestAndChange',0),0);break;case 21:sw(this.evDoPlat(line,'downWaitUpStay',0),0);break;case 23:sw(this.evDoFloor(line,'lowerFloorToLowest'),0);break;
   case 29:sw(this.evDoDoor(line,'normal'),0);break;case 41:sw(this.evDoCeiling(line,'lowerToFloor'),0);break;case 71:sw(this.evDoFloor(line,'turboLower'),0);break;
   case 49:sw(this.evDoCeiling(line,'crushAndRaise'),0);break;case 50:sw(this.evDoDoor(line,'close'),0);break;case 51:this.changeSwitchTexture(line,0);this.secretExitLevel();break;
   case 55:sw(this.evDoFloor(line,'raiseFloorCrush'),0);break;case 101:sw(this.evDoFloor(line,'raiseFloor'),0);break;case 102:sw(this.evDoFloor(line,'lowerFloor'),0);break;
   case 103:sw(this.evDoDoor(line,'open'),0);break;case 111:sw(this.evDoDoor(line,'blazeRaise'),0);break;case 112:sw(this.evDoDoor(line,'blazeOpen'),0);break;case 113:sw(this.evDoDoor(line,'blazeClose'),0);break;
   case 122:sw(this.evDoPlat(line,'blazeDWUS',0),0);break;case 127:sw(this.evBuildStairs(line,'turbo16'),0);break;case 131:sw(this.evDoFloor(line,'raiseFloorTurbo'),0);break;
   case 133:case 135:case 137:sw(this.evDoLockedDoor(line,'blazeOpen',thing),0);break;case 140:sw(this.evDoFloor(line,'raiseFloor512'),0);break;
   case 42:sw(this.evDoDoor(line,'close'),1);break;case 43:sw(this.evDoCeiling(line,'lowerToFloor'),1);break;case 45:sw(this.evDoFloor(line,'lowerFloor'),1);break;
   case 60:sw(this.evDoFloor(line,'lowerFloorToLowest'),1);break;case 61:sw(this.evDoDoor(line,'open'),1);break;case 62:sw(this.evDoPlat(line,'downWaitUpStay',1),1);break;
   case 63:sw(this.evDoDoor(line,'normal'),1);break;case 64:sw(this.evDoFloor(line,'raiseFloor'),1);break;case 66:sw(this.evDoPlat(line,'raiseAndChange',24),1);break;
   case 67:sw(this.evDoPlat(line,'raiseAndChange',32),1);break;case 65:sw(this.evDoFloor(line,'raiseFloorCrush'),1);break;case 68:sw(this.evDoPlat(line,'raiseToNearestAndChange',0),1);break;
   case 69:sw(this.evDoFloor(line,'raiseFloorToNearest'),1);break;case 70:sw(this.evDoFloor(line,'turboLower'),1);break;case 114:sw(this.evDoDoor(line,'blazeRaise'),1);break;
   case 115:sw(this.evDoDoor(line,'blazeOpen'),1);break;case 116:sw(this.evDoDoor(line,'blazeClose'),1);break;case 123:sw(this.evDoPlat(line,'blazeDWUS',0),1);break;
   case 132:sw(this.evDoFloor(line,'raiseFloorTurbo'),1);break;case 99:case 134:case 136:sw(this.evDoLockedDoor(line,'blazeOpen',thing),1);break;
   case 138:this.evLightTurnOn(line,255);this.changeSwitchTexture(line,1);break;case 139:this.evLightTurnOn(line,35);this.changeSwitchTexture(line,1);break;}
  return true;},
});
function tFireFlicker(f){if(--f.count)return;const amt=(this.P_Random()&3)*16;f.sector.lightlevel=f.sector.lightlevel-amt<f.minlight?f.minlight:f.maxlight-amt;f.count=4;}
function tLightFlash(f){if(--f.count)return;if(f.sector.lightlevel===f.maxlight){f.sector.lightlevel=f.minlight;f.count=(this.P_Random()&f.mintime)+1;}else{f.sector.lightlevel=f.maxlight;f.count=(this.P_Random()&f.maxtime)+1;}}
function tStrobe(f){if(--f.count)return;if(f.sector.lightlevel===f.minlight){f.sector.lightlevel=f.maxlight;f.count=f.brighttime;}else{f.sector.lightlevel=f.minlight;f.count=f.darktime;}}
function tGlow(g){const s=g.sector;if(g.direction===-1){s.lightlevel-=GLOWSPEED;if(s.lightlevel<=g.minlight){s.lightlevel+=GLOWSPEED;g.direction=1;}}else{s.lightlevel+=GLOWSPEED;if(s.lightlevel>=g.maxlight){s.lightlevel-=GLOWSPEED;g.direction=-1;}}}
Object.assign(exports,{Door,Floor,Ceiling,Plat,Light,tFireFlicker,tLightFlash,tStrobe,tGlow});
