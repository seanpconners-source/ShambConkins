// Doom play simulation core (35 tics a second): things (mobjs), the state machine, blockmap/sector links, movement and
// collision (check position, try move, slide move), intercept traversal, hitscan aiming/shooting, splash damage,
// crushing, line-of-sight (REJECT + BSP) and monster wake-up by sound. Behaviour follows the 1993 engine's rules.
// Other modules add their methods to Game.prototype (actions.js, spec.js, game.js).
const I=require("src/engines/doom/info.js");
const {ML,ST,pointOnLineSide,boxOnLineSide,pointInSubsector}=require("src/engines/doom/level.js");
const {MF,MT}=I;
const BAM=4294967296,ANG45=0x20000000,ANG90=0x40000000,ANG180=0x80000000,ANG270=0xc0000000;
const MAXRADIUS=32,MAXMOVE=30,USERANGE=64,MELEERANGE=64,MISSILERANGE=2048,FLOATSPEED=4,GRAVITY=1,FRICTION=0xe800/65536,STOPSPEED=0x1000/65536,VIEWHEIGHT=41,MAXBOB=16;
const ONFLOORZ=-Infinity,ONCEILINGZ=Infinity;
// fine sine table like the original (8192 steps a turn)
const FINE=8192,FS=new Float64Array(FINE+FINE/4);for(let i=0;i<FS.length;i++)FS[i]=Math.sin((i+.5)*2*Math.PI/FINE);
const fsin=a=>FS[a>>>19],fcos=a=>FS[(a>>>19)+2048];
function pointToAngle2(x1,y1,x2,y2){let a=Math.atan2(y2-y1,x2-x1);if(a<0)a+=Math.PI*2;return Math.floor(a/(Math.PI*2)*BAM)>>>0;}
const aproxDist=(dx,dy)=>{dx=Math.abs(dx);dy=Math.abs(dy);return dx+dy-(dx<dy?dx:dy)/2;};
const sangle=a=>a>=ANG180?a-BAM:a;// signed view of a binary angle

class Mobj{constructor(){this.x=this.y=this.z=0;this.momx=this.momy=this.momz=0;this.angle=0;this.target=null;this.tracer=null;this.player=null;this.movedir=8;this.movecount=0;this.reactiontime=0;this.threshold=0;this.lastlook=0;this.snext=this.sprev=this.bnext=this.bprev=null;this.removed=false;}
 think(){this.game.mobjThinker(this);}}

class Game{
 constructor(wad,gfx,tables){
  this.wad=wad;this.gfx=gfx;this.states=tables.states;this.mobjinfo=tables.mobj;this.strings=tables.strings;this.pars=tables.pars;
  this.commercial=wad.kind==='doom2';this.gamemode=this.commercial?'commercial':wad.mode;
  this.validcount=1;this.leveltime=0;this.gametic=0;this.thinkers=[];this.rndindex=0;this.prndindex=0;this.rtable=null;this.seed(1);
  this.spechit=[];this.intercepts=[];this.sounds=[];this.events=[];this.skill=2;this.nextId=1;}
 seed(n){// a fixed 256-entry table read in a cycle, like P_Random; seeded so both players get the same stream
  let s=(n>>>0)||1;const t=new Uint8Array(256);for(let i=0;i<256;i++){s^=s<<13;s^=s>>>17;s^=s<<5;t[i]=(s>>>0)&255;}this.rtable=t;this.prndindex=0;this.rndindex=0;}
 P_Random(){this.prndindex=(this.prndindex+1)&255;return this.rtable[this.prndindex];}
 M_Random(){this.rndindex=(this.rndindex+1)&255;return this.rtable[this.rndindex];}
 sound(origin,name){if(name)this.sounds.push({origin,name});}
 stopSound(origin){this.sounds.push({origin,stop:true});}
 // ---- thinkers ----
 addThinker(t){t.removed=false;this.thinkers.push(t);}
 removeThinker(t){t.removed=true;}
 runThinkers(){const T=this.thinkers;for(let i=0;i<T.length;i++){const t=T[i];if(!t.removed)t.think();}
  if(T.some(t=>t.removed))this.thinkers=T.filter(t=>!t.removed);}
 *mobjs(){for(const t of this.thinkers)if(t instanceof Mobj&&!t.removed)yield t;}
 // ---- mobjs ----
 spawnMobj(x,y,z,type){
  const mo=new Mobj(),info=this.mobjinfo[type];mo.game=this;mo.id=this.nextId++;mo.type=type;mo.info=info;mo.x=x;mo.y=y;mo.radius=info.radius;mo.height=info.height;mo.flags=info.flags;mo.health=info.spawnhealth;
  if(this.skill!==4)mo.reactiontime=info.reactiontime;mo.lastlook=this.P_Random()%4;
  const st=this.states[info.spawnstate];mo.state=st;mo.stnum=info.spawnstate;mo.tics=st.tics;mo.sprite=st.sprite;mo.frame=st.frame;
  this.setThingPosition(mo);mo.floorz=mo.subsector.sector.floorheight;mo.ceilingz=mo.subsector.sector.ceilingheight;
  mo.z=z===ONFLOORZ?mo.floorz:z===ONCEILINGZ?mo.ceilingz-info.height:z;mo.px=x;mo.py=y;mo.pz=mo.z;
  this.addThinker(mo);return mo;}
 removeMobj(mo){if(mo.removed)return;this.unsetThingPosition(mo);this.stopSound(mo);this.removeThinker(mo);mo.removed=true;}
 setMobjState(mo,stnum){
  for(;;){if(!stnum){mo.state=null;this.removeMobj(mo);return false;}
   const st=this.states[stnum];mo.state=st;mo.stnum=stnum;mo.tics=st.tics;mo.sprite=st.sprite;mo.frame=st.frame;
   if(st.action){const f=this.actions[st.action];if(f)f.call(this,mo);if(mo.removed)return false;}
   stnum=st.next;if(mo.tics)break;}
  return true;}
 mobjThinker(mo){
  mo.px=mo.x;mo.py=mo.y;mo.pz=mo.z;
  if(mo.momx||mo.momy||(mo.flags&MF.SKULLFLY)){this.xyMovement(mo);if(mo.removed)return;}
  if(mo.z!==mo.floorz||mo.momz){this.zMovement(mo);if(mo.removed)return;}
  if(mo.tics!==-1){mo.tics--;if(!mo.tics)this.setMobjState(mo,mo.state.next);}
  else{if(!(mo.flags&MF.COUNTKILL)||!this.respawnmonsters)return;mo.movecount++;if(mo.movecount<12*35||(this.leveltime&31)||this.P_Random()>4)return;this.nightmareRespawn(mo);}}
 nightmareRespawn(mo){
  const sp=mo.spawnpoint;if(!sp)return;if(!this.checkPosition(mo,sp.x,sp.y))return;
  let fog=this.spawnMobj(mo.x,mo.y,mo.subsector.sector.floorheight,MT.TFOG);this.sound(fog,'telept');
  const ss=pointInSubsector(this.lv,sp.x,sp.y);fog=this.spawnMobj(sp.x,sp.y,ss.sector.floorheight,MT.TFOG);this.sound(fog,'telept');
  const z=mo.info.flags&MF.SPAWNCEILING?ONCEILINGZ:ONFLOORZ,n=this.spawnMobj(sp.x,sp.y,z,mo.type);n.spawnpoint=sp;n.angle=ANG45*Math.floor(sp.angle/45)>>>0;if(sp.options&8)n.flags|=MF.AMBUSH;n.reactiontime=18;n.head=mo.head;
  this.removeMobj(mo);}
 // ---- position links (sector thing lists for drawing, blockmap for collision) ----
 setThingPosition(mo){
  const lv=this.lv,ss=pointInSubsector(lv,mo.x,mo.y);mo.subsector=ss;
  if(!(mo.flags&MF.NOSECTOR)){const sec=ss.sector;mo.sprev=null;mo.snext=sec.thinglist;if(sec.thinglist)sec.thinglist.sprev=mo;sec.thinglist=mo;}
  if(!(mo.flags&MF.NOBLOCKMAP)){const bx=Math.floor((mo.x-lv.bmaporgx)/128),by=Math.floor((mo.y-lv.bmaporgy)/128);
   if(bx>=0&&by>=0&&bx<lv.bmapwidth&&by<lv.bmapheight){const i=by*lv.bmapwidth+bx;mo.bprev=null;mo.bnext=lv.blocklinks[i];if(mo.bnext)mo.bnext.bprev=mo;lv.blocklinks[i]=mo;mo.bblock=i;}else{mo.bnext=mo.bprev=null;mo.bblock=-1;}}}
 unsetThingPosition(mo){
  const lv=this.lv;
  if(!(mo.flags&MF.NOSECTOR)&&mo.subsector){if(mo.snext)mo.snext.sprev=mo.sprev;if(mo.sprev)mo.sprev.snext=mo.snext;else if(mo.subsector.sector.thinglist===mo)mo.subsector.sector.thinglist=mo.snext;mo.snext=mo.sprev=null;}
  if(!(mo.flags&MF.NOBLOCKMAP)&&mo.bblock>=0&&mo.bblock!==undefined){if(mo.bnext)mo.bnext.bprev=mo.bprev;if(mo.bprev)mo.bprev.bnext=mo.bnext;else if(lv.blocklinks[mo.bblock]===mo)lv.blocklinks[mo.bblock]=mo.bnext;mo.bnext=mo.bprev=null;mo.bblock=-1;}}
 blockLines(bx,by,fn){const lv=this.lv;if(bx<0||by<0||bx>=lv.bmapwidth||by>=lv.bmapheight)return true;
  for(const i of lv.blockmap[by*lv.bmapwidth+bx]){const ld=lv.lines[i];if(ld.validcount===this.validcount)continue;ld.validcount=this.validcount;if(!fn(ld))return false;}return true;}
 blockThings(bx,by,fn){const lv=this.lv;if(bx<0||by<0||bx>=lv.bmapwidth||by>=lv.bmapheight)return true;
  for(let m=lv.blocklinks[by*lv.bmapwidth+bx];m;){const n=m.bnext;if(!fn(m))return false;m=n;}return true;}
 lineOpening(ln){const o=this.open||(this.open={});if(ln.sidenum[1]<0||!ln.backsector){o.range=0;return o;}
  const f=ln.frontsector,b=ln.backsector;o.top=Math.min(f.ceilingheight,b.ceilingheight);
  if(f.floorheight>b.floorheight){o.bottom=f.floorheight;o.lowfloor=b.floorheight;}else{o.bottom=b.floorheight;o.lowfloor=f.floorheight;}
  o.range=o.top-o.bottom;return o;}
 // ---- movement clipping (P_CheckPosition / P_TryMove) ----
 checkPosition(thing,x,y){
  const lv=this.lv;this.tmthing=thing;this.tmflags=thing.flags;this.tmx=x;this.tmy=y;const r=thing.radius;this.tmbbox=[y+r,y-r,x-r,x+r];
  const ss=pointInSubsector(lv,x,y);this.ceilingline=null;this.tmfloorz=this.tmdropoffz=ss.sector.floorheight;this.tmceilingz=ss.sector.ceilingheight;
  this.validcount++;this.spechit.length=0;if(this.tmflags&MF.NOCLIP)return true;
  const b=this.tmbbox,ox=lv.bmaporgx,oy=lv.bmaporgy;
  let xl=Math.floor((b[2]-ox-MAXRADIUS)/128),xh=Math.floor((b[3]-ox+MAXRADIUS)/128),yl=Math.floor((b[1]-oy-MAXRADIUS)/128),yh=Math.floor((b[0]-oy+MAXRADIUS)/128);
  const ct=m=>this.pitCheckThing(m);
  for(let bx=xl;bx<=xh;bx++)for(let by=yl;by<=yh;by++)if(!this.blockThings(bx,by,ct))return false;
  xl=Math.floor((b[2]-ox)/128);xh=Math.floor((b[3]-ox)/128);yl=Math.floor((b[1]-oy)/128);yh=Math.floor((b[0]-oy)/128);
  const cl=ld=>this.pitCheckLine(ld);
  for(let bx=xl;bx<=xh;bx++)for(let by=yl;by<=yh;by++)if(!this.blockLines(bx,by,cl))return false;
  return true;}
 pitCheckLine(ld){const b=this.tmbbox;
  if(b[3]<=ld.bbox[2]||b[2]>=ld.bbox[3]||b[0]<=ld.bbox[1]||b[1]>=ld.bbox[0])return true;
  if(boxOnLineSide(b,ld)!==-1)return true;
  if(!ld.backsector)return false;
  const t=this.tmthing;if(!(t.flags&MF.MISSILE)){if(ld.flags&ML.BLOCKING)return false;if(!t.player&&ld.flags&ML.BLOCKMONSTERS)return false;}
  const o=this.lineOpening(ld);if(o.top<this.tmceilingz){this.tmceilingz=o.top;this.ceilingline=ld;}if(o.bottom>this.tmfloorz)this.tmfloorz=o.bottom;if(o.lowfloor<this.tmdropoffz)this.tmdropoffz=o.lowfloor;
  if(ld.special)this.spechit.push(ld);return true;}
 pitCheckThing(th){
  if(!(th.flags&(MF.SOLID|MF.SPECIAL|MF.SHOOTABLE)))return true;const t=this.tmthing,bd=th.radius+t.radius;
  if(Math.abs(th.x-this.tmx)>=bd||Math.abs(th.y-this.tmy)>=bd)return true;if(th===t)return true;
  if(t.flags&MF.SKULLFLY){const dmg=((this.P_Random()%8)+1)*t.info.damage;this.damageMobj(th,t,t,dmg);t.flags&=~MF.SKULLFLY;t.momx=t.momy=t.momz=0;this.setMobjState(t,t.info.spawnstate);return false;}
  if(t.flags&MF.MISSILE){if(t.z>th.z+th.height)return true;if(t.z+t.height<th.z)return true;
   if(t.target&&(t.target.type===th.type||(t.target.type===MT.KNIGHT&&th.type===MT.BRUISER)||(t.target.type===MT.BRUISER&&th.type===MT.KNIGHT))){if(th===t.target)return true;if(th.type!==MT.PLAYER)return false;}
   if(!(th.flags&MF.SHOOTABLE))return !(th.flags&MF.SOLID);
   this.damageMobj(th,t,t.target,((this.P_Random()%8)+1)*t.info.damage);return false;}
  if(th.flags&MF.SPECIAL){const solid=th.flags&MF.SOLID;if(this.tmflags&MF.PICKUP)this.touchSpecialThing(th,t);return !solid;}
  return !(th.flags&MF.SOLID);}
 tryMove(thing,x,y){
  this.floatok=false;if(!this.checkPosition(thing,x,y))return false;
  if(!(thing.flags&MF.NOCLIP)){if(this.tmceilingz-this.tmfloorz<thing.height)return false;this.floatok=true;
   if(!(thing.flags&MF.TELEPORT)&&this.tmceilingz-thing.z<thing.height)return false;
   if(!(thing.flags&MF.TELEPORT)&&this.tmfloorz-thing.z>24)return false;
   if(!(thing.flags&(MF.DROPOFF|MF.FLOAT))&&this.tmfloorz-this.tmdropoffz>24)return false;}
  this.unsetThingPosition(thing);const ox=thing.x,oy=thing.y;thing.floorz=this.tmfloorz;thing.ceilingz=this.tmceilingz;thing.x=x;thing.y=y;this.setThingPosition(thing);
  if(!(thing.flags&(MF.TELEPORT|MF.NOCLIP))){const hits=this.spechit.slice();for(let i=hits.length-1;i>=0;i--){const ld=hits[i];const side=pointOnLineSide(thing.x,thing.y,ld),old=pointOnLineSide(ox,oy,ld);if(side!==old&&ld.special)this.crossSpecialLine(ld,old,thing);}}
  return true;}
 thingHeightClip(th){const onfloor=th.z===th.floorz;this.checkPosition(th,th.x,th.y);th.floorz=this.tmfloorz;th.ceilingz=this.tmceilingz;
  if(onfloor)th.z=th.floorz;else if(th.z+th.height>th.ceilingz)th.z=th.ceilingz-th.height;return th.ceilingz-th.floorz>=th.height;}
 teleportMove(thing,x,y){
  const lv=this.lv;this.tmthing=thing;this.tmflags=thing.flags;this.tmx=x;this.tmy=y;const r=thing.radius;this.tmbbox=[y+r,y-r,x-r,x+r];
  const ss=pointInSubsector(lv,x,y);this.ceilingline=null;this.tmfloorz=this.tmdropoffz=ss.sector.floorheight;this.tmceilingz=ss.sector.ceilingheight;this.validcount++;this.spechit.length=0;
  const b=this.tmbbox,xl=Math.floor((b[2]-lv.bmaporgx-MAXRADIUS)/128),xh=Math.floor((b[3]-lv.bmaporgx+MAXRADIUS)/128),yl=Math.floor((b[1]-lv.bmaporgy-MAXRADIUS)/128),yh=Math.floor((b[0]-lv.bmaporgy+MAXRADIUS)/128);
  const stomp=th=>{if(!(th.flags&MF.SHOOTABLE))return true;const bd=th.radius+thing.radius;if(Math.abs(th.x-x)>=bd||Math.abs(th.y-y)>=bd)return true;if(th===thing)return true;if(!thing.player&&this.gamemap!==30)return false;this.damageMobj(th,thing,thing,10000);return true;};
  for(let bx=xl;bx<=xh;bx++)for(let by=yl;by<=yh;by++)if(!this.blockThings(bx,by,stomp))return false;
  this.unsetThingPosition(thing);thing.floorz=this.tmfloorz;thing.ceilingz=this.tmceilingz;thing.x=x;thing.y=y;this.setThingPosition(thing);thing.px=x;thing.py=y;return true;}
 // ---- sliding along walls (P_SlideMove) ----
 slideMove(mo){
  let hit=0;
  for(;;){
   if(++hit===3)break;
   let leadx,leady,trailx,traily;
   if(mo.momx>0){leadx=mo.x+mo.radius;trailx=mo.x-mo.radius;}else{leadx=mo.x-mo.radius;trailx=mo.x+mo.radius;}
   if(mo.momy>0){leady=mo.y+mo.radius;traily=mo.y-mo.radius;}else{leady=mo.y-mo.radius;traily=mo.y+mo.radius;}
   this.bestslidefrac=1.00001;this.bestslideline=null;this.slidemo=mo;
   const tr=in_=>this.ptrSlideTraverse(in_);
   this.pathTraverse(leadx,leady,leadx+mo.momx,leady+mo.momy,1,tr);this.pathTraverse(trailx,leady,trailx+mo.momx,leady+mo.momy,1,tr);this.pathTraverse(leadx,traily,leadx+mo.momx,traily+mo.momy,1,tr);
   if(this.bestslidefrac===1.00001)break;
   let f=this.bestslidefrac-1/32;
   if(f>0){if(!this.tryMove(mo,mo.x+mo.momx*f,mo.y+mo.momy*f))break;}
   f=1-(f+1/32);if(f>1)f=1;if(f<=0)return;
   this.tmxmove=mo.momx*f;this.tmymove=mo.momy*f;this.hitSlideLine(this.bestslideline);mo.momx=this.tmxmove;mo.momy=this.tmymove;
   if(this.tryMove(mo,mo.x+this.tmxmove,mo.y+this.tmymove))return;}
  if(!this.tryMove(mo,mo.x,mo.y+mo.momy))this.tryMove(mo,mo.x+mo.momx,mo.y);}
 ptrSlideTraverse(in_){const li=in_.line;if(!li)return true;
  let blocking=false;
  if(!(li.flags&ML.TWOSIDED)){if(pointOnLineSide(this.slidemo.x,this.slidemo.y,li))return true;blocking=true;}
  else{const o=this.lineOpening(li),m=this.slidemo;if(o.range<m.height||o.top-m.z<m.height||o.bottom-m.z>24)blocking=true;}
  if(!blocking)return true;
  if(in_.frac<this.bestslidefrac){this.bestslidefrac=in_.frac;this.bestslideline=li;}return false;}
 hitSlideLine(ld){
  if(ld.slopetype===ST.HORIZONTAL){this.tmymove=0;return;}if(ld.slopetype===ST.VERTICAL){this.tmxmove=0;return;}
  const side=pointOnLineSide(this.slidemo.x,this.slidemo.y,ld);let la=pointToAngle2(0,0,ld.dx,ld.dy);if(side===1)la=(la+ANG180)>>>0;
  const ma=pointToAngle2(0,0,this.tmxmove,this.tmymove);let da=(ma-la)>>>0;if(da>ANG180)da=(da+ANG180)>>>0;
  const len=aproxDist(this.tmxmove,this.tmymove),nl=len*fcos(da);this.tmxmove=nl*fcos(la);this.tmymove=nl*fsin(la);}
 // ---- intercepts (P_PathTraverse): lines/things crossed by the segment, in order; trav returns false to stop ----
 pathTraverse(x1,y1,x2,y2,flags,trav){
  const lv=this.lv;this.validcount++;const ic=[];const tr={x:x1,y:y1,dx:x2-x1,dy:y2-y1};this.trace=tr;
  const addLine=ld=>{const s1=divSide(ld.v1.x,ld.v1.y,tr),s2=divSide(ld.v2.x,ld.v2.y,tr);if(s1===s2)return true;
   const frac=interceptVector(tr,{x:ld.v1.x,y:ld.v1.y,dx:ld.dx,dy:ld.dy});if(frac<0)return true;
   if(flags&4&&frac<1&&!ld.backsector)return false;ic.push({frac,line:ld});return true;};
  const addThing=th=>{const tp=(tr.dx>0)===(tr.dy>0)&&tr.dx!==0&&tr.dy!==0;let ax,ay,bx,by;const r=th.radius;
   if(tp){ax=th.x-r;ay=th.y+r;bx=th.x+r;by=th.y-r;}else{ax=th.x-r;ay=th.y-r;bx=th.x+r;by=th.y+r;}
   if(divSide(ax,ay,tr)===divSide(bx,by,tr))return true;const frac=interceptVector(tr,{x:ax,y:ay,dx:bx-ax,dy:by-ay});if(frac<0)return true;ic.push({frac,thing:th});return true;};
  // walk the blockmap cells the segment passes through
  const ox=lv.bmaporgx,oy=lv.bmaporgy;let fx=(x1-ox)/128,fy=(y1-oy)/128;const ex=(x2-ox)/128,ey=(y2-oy)/128;
  let cx=Math.floor(fx),cy=Math.floor(fy);const tx=Math.floor(ex),ty=Math.floor(ey),sx=Math.sign(ex-fx),sy=Math.sign(ey-fy);
  const ddx=sx?Math.abs(1/(ex-fx)):Infinity,ddy=sy?Math.abs(1/(ey-fy)):Infinity;
  let tmx=sx>0?(cx+1-fx)*ddx:sx<0?(fx-cx)*ddx:Infinity,tmy=sy>0?(cy+1-fy)*ddy:sy<0?(fy-cy)*ddy:Infinity;
  const visit=(x,y)=>{if(flags&1&&!this.blockLines(x,y,addLine))return false;if(flags&2)this.blockThings(x,y,addThing);return true;};
  for(let n=0;n<1000;n++){
   if(!visit(cx,cy))return false;
   if(cx===tx&&cy===ty)break;
   if(Math.abs(tmx-tmy)<1e-12){if(tmx>1)break;if(!visit(cx+sx,cy)||!visit(cx,cy+sy))return false;cx+=sx;cy+=sy;tmx+=ddx;tmy+=ddy;}
   else if(tmx<tmy){if(tmx>1)break;cx+=sx;tmx+=ddx;}else{if(tmy>1)break;cy+=sy;tmy+=ddy;}}
  ic.sort((a,b)=>a.frac-b.frac);
  // duplicates (a thing in several cells) are passed once
  const seen=new Set();for(const it of ic){if(it.frac>1)break;if(it.thing){if(seen.has(it.thing))continue;seen.add(it.thing);}if(!trav(it))return false;}
  return true;}
 // ---- hitscan (P_AimLineAttack / P_LineAttack) ----
 aimLineAttack(t1,angle,distance){
  this.shootthing=t1;const x2=t1.x+distance*fcos(angle),y2=t1.y+distance*fsin(angle);this.shootz=t1.z+t1.height/2+8;
  this.topslope=100/160;this.bottomslope=-100/160;this.attackrange=distance;this.linetarget=null;
  this.pathTraverse(t1.x,t1.y,x2,y2,3,in_=>this.ptrAimTraverse(in_));return this.linetarget?this.aimslope:0;}
 ptrAimTraverse(in_){
  if(in_.line){const li=in_.line;if(!(li.flags&ML.TWOSIDED))return false;const o=this.lineOpening(li);if(o.bottom>=o.top)return false;const dist=this.attackrange*in_.frac;if(dist<=0)return true;
   if(li.frontsector.floorheight!==li.backsector.floorheight){const s=(o.bottom-this.shootz)/dist;if(s>this.bottomslope)this.bottomslope=s;}
   if(li.frontsector.ceilingheight!==li.backsector.ceilingheight){const s=(o.top-this.shootz)/dist;if(s<this.topslope)this.topslope=s;}
   return this.topslope>this.bottomslope;}
  const th=in_.thing;if(th===this.shootthing||!(th.flags&MF.SHOOTABLE))return true;const dist=this.attackrange*in_.frac;if(dist<=0)return true;
  let tt=(th.z+th.height-this.shootz)/dist;if(tt<this.bottomslope)return true;let tb=(th.z-this.shootz)/dist;if(tb>this.topslope)return true;
  if(tt>this.topslope)tt=this.topslope;if(tb<this.bottomslope)tb=this.bottomslope;this.aimslope=(tt+tb)/2;this.linetarget=th;return false;}
 lineAttack(t1,angle,distance,slope,damage){
  this.shootthing=t1;this.la_damage=damage;const x2=t1.x+distance*fcos(angle),y2=t1.y+distance*fsin(angle);this.shootz=t1.z+t1.height/2+8;this.attackrange=distance;this.aimslope=slope;
  this.pathTraverse(t1.x,t1.y,x2,y2,3,in_=>this.ptrShootTraverse(in_));}
 ptrShootTraverse(in_){
  const tr=this.trace;
  if(in_.line){const li=in_.line;if(li.special)this.shootSpecialLine(this.shootthing,li);
   let hit=!(li.flags&ML.TWOSIDED);
   if(!hit){const o=this.lineOpening(li),dist=this.attackrange*in_.frac;
    if(li.frontsector.floorheight!==li.backsector.floorheight&&(o.bottom-this.shootz)/dist>this.aimslope)hit=true;
    if(li.frontsector.ceilingheight!==li.backsector.ceilingheight&&(o.top-this.shootz)/dist<this.aimslope)hit=true;}
   if(!hit)return true;
   const frac=in_.frac-4/this.attackrange,x=tr.x+tr.dx*frac,y=tr.y+tr.dy*frac,z=this.shootz+this.aimslope*(frac*this.attackrange);
   if(li.frontsector.ceilingpic===this.gfx.skyflatnum){if(z>li.frontsector.ceilingheight)return false;if(li.backsector&&li.backsector.ceilingpic===this.gfx.skyflatnum)return false;}
   this.spawnPuff(x,y,z);return false;}
  const th=in_.thing;if(th===this.shootthing||!(th.flags&MF.SHOOTABLE))return true;const dist=this.attackrange*in_.frac;
  if((th.z+th.height-this.shootz)/dist<this.aimslope)return true;if((th.z-this.shootz)/dist>this.aimslope)return true;
  const frac=in_.frac-10/this.attackrange,x=tr.x+tr.dx*frac,y=tr.y+tr.dy*frac,z=this.shootz+this.aimslope*(frac*this.attackrange);
  if(th.flags&MF.NOBLOOD)this.spawnPuff(x,y,z);else this.spawnBlood(x,y,z,this.la_damage);
  if(this.la_damage)this.damageMobj(th,this.shootthing,this.shootthing,this.la_damage);return false;}
 useLines(player){
  const mo=player.mo;this.usething=mo;const x2=mo.x+USERANGE*fcos(mo.angle),y2=mo.y+USERANGE*fsin(mo.angle);
  this.pathTraverse(mo.x,mo.y,x2,y2,1,in_=>{const ln=in_.line;if(!ln.special){const o=this.lineOpening(ln);if(o.range<=0){this.sound(mo,'noway');return false;}return true;}
   const side=pointOnLineSide(mo.x,mo.y,ln);this.useSpecialLine(mo,ln,side);return false;});}
 radiusAttack(spot,source,damage){
  const lv=this.lv,dist=damage+MAXRADIUS,yh=Math.floor((spot.y+dist-lv.bmaporgy)/128),yl=Math.floor((spot.y-dist-lv.bmaporgy)/128),xh=Math.floor((spot.x+dist-lv.bmaporgx)/128),xl=Math.floor((spot.x-dist-lv.bmaporgx)/128);
  const fn=th=>{if(!(th.flags&MF.SHOOTABLE))return true;if(th.type===MT.CYBORG||th.type===MT.SPIDER)return true;
   let d=Math.max(Math.abs(th.x-spot.x),Math.abs(th.y-spot.y))-th.radius;d=Math.floor(d);if(d<0)d=0;if(d>=damage)return true;
   if(this.checkSight(th,spot))this.damageMobj(th,spot,source,damage-d);return true;};
  for(let y=yl;y<=yh;y++)for(let x=xl;x<=xh;x++)this.blockThings(x,y,fn);}
 changeSector(sec,crunch){
  let nofit=false;const bb=sec.blockbox;
  const fn=th=>{if(this.thingHeightClip(th))return true;
   if(th.health<=0){this.setMobjState(th,I.STATE.GIBS);th.flags&=~MF.SOLID;th.height=0;th.radius=0;return true;}
   if(th.flags&MF.DROPPED){this.removeMobj(th);return true;}
   if(!(th.flags&MF.SHOOTABLE))return true;nofit=true;
   if(crunch&&!(this.leveltime&3)){this.damageMobj(th,null,null,10);const mo=this.spawnMobj(th.x,th.y,th.z+th.height/2,MT.BLOOD);mo.momx=(this.P_Random()-this.P_Random())/16;mo.momy=(this.P_Random()-this.P_Random())/16;}
   return true;};
  for(let x=bb[2];x<=bb[3];x++)for(let y=bb[1];y<=bb[0];y++)this.blockThings(x,y,fn);
  return nofit;}
 // ---- line of sight (P_CheckSight) ----
 checkSight(t1,t2){
  const lv=this.lv,s1=t1.subsector.sector.id,s2=t2.subsector.sector.id,pn=s1*lv.sectors.length+s2;
  if(lv.reject&&lv.reject[pn>>3]&(1<<(pn&7)))return false;
  this.validcount++;this.sightzstart=t1.z+t1.height-t1.height/4;this.stopslope=t2.z+t2.height-this.sightzstart;this.sbottomslope=t2.z-this.sightzstart;
  this.strace={x:t1.x,y:t1.y,dx:t2.x-t1.x,dy:t2.y-t1.y};this.t2x=t2.x;this.t2y=t2.y;
  if(!lv.nodes.length)return this.crossSubsector(0);
  return this.crossBSPNode(lv.nodes.length-1);}
 crossBSPNode(bsp){
  if(bsp&0x8000)return this.crossSubsector(bsp===0xffff?0:bsp&0x7fff);
  const n=this.lv.nodes[bsp];let side=divSide(this.strace.x,this.strace.y,n);if(side===2)side=0;
  if(!this.crossBSPNode(n.children[side]))return false;
  if(side===divSide(this.t2x,this.t2y,n))return true;
  return this.crossBSPNode(n.children[side^1]);}
 crossSubsector(num){
  const lv=this.lv,ss=lv.subsectors[num],tr=this.strace;
  for(let i=0;i<ss.numlines;i++){const seg=lv.segs[ss.firstline+i],ln=seg.linedef;if(ln.validcount===this.validcount)continue;ln.validcount=this.validcount;
   const v1=ln.v1,v2=ln.v2;if(divSide(v1.x,v1.y,tr)===divSide(v2.x,v2.y,tr))continue;
   const dl={x:v1.x,y:v1.y,dx:v2.x-v1.x,dy:v2.y-v1.y};if(divSide(tr.x,tr.y,dl)===divSide(this.t2x,this.t2y,dl))continue;
   if(!(ln.flags&ML.TWOSIDED)||!seg.backsector)return false;
   const f=seg.frontsector,b=seg.backsector;if(f.floorheight===b.floorheight&&f.ceilingheight===b.ceilingheight)continue;
   const top=Math.min(f.ceilingheight,b.ceilingheight),bot=Math.max(f.floorheight,b.floorheight);if(bot>=top)return false;
   const frac=interceptVector(tr,dl);if(frac<=0)continue;
   if(f.floorheight!==b.floorheight){const s=(bot-this.sightzstart)/frac;if(s>this.sbottomslope)this.sbottomslope=s;}
   if(f.ceilingheight!==b.ceilingheight){const s=(top-this.sightzstart)/frac;if(s<this.stopslope)this.stopslope=s;}
   if(this.stopslope<=this.sbottomslope)return false;}
  return true;}
 // ---- sound alerts (P_NoiseAlert) ----
 noiseAlert(target,emitter){this.soundtarget=target;this.validcount++;this.recursiveSound(emitter.subsector.sector,0);}
 recursiveSound(sec,blocks){
  if(sec.validcount===this.validcount&&sec.soundtraversed<=blocks+1)return;sec.validcount=this.validcount;sec.soundtraversed=blocks+1;sec.soundtarget=this.soundtarget;
  for(const ln of sec.lines){if(!(ln.flags&ML.TWOSIDED))continue;const o=this.lineOpening(ln);if(o.range<=0)continue;
   const other=ln.frontsector===sec?ln.backsector:ln.frontsector;if(!other)continue;
   if(ln.flags&ML.SOUNDBLOCK){if(!blocks)this.recursiveSound(other,1);}else this.recursiveSound(other,blocks);}}
 // ---- thing movement (P_XYMovement / P_ZMovement) ----
 xyMovement(mo){
  if(!mo.momx&&!mo.momy){if(mo.flags&MF.SKULLFLY){mo.flags&=~MF.SKULLFLY;mo.momx=mo.momy=mo.momz=0;this.setMobjState(mo,mo.info.spawnstate);}return;}
  const pl=mo.player;
  mo.momx=Math.max(-MAXMOVE,Math.min(MAXMOVE,mo.momx));mo.momy=Math.max(-MAXMOVE,Math.min(MAXMOVE,mo.momy));
  let xm=mo.momx,ym=mo.momy;
  do{let px,py;
   if(xm>MAXMOVE/2||ym>MAXMOVE/2){px=mo.x+xm/2;py=mo.y+ym/2;xm/=2;ym/=2;}else{px=mo.x+xm;py=mo.y+ym;xm=ym=0;}
   if(!this.tryMove(mo,px,py)){
    if(mo.player)this.slideMove(mo);
    else if(mo.flags&MF.MISSILE){const cl=this.ceilingline;if(cl&&cl.backsector&&cl.backsector.ceilingpic===this.gfx.skyflatnum){this.removeMobj(mo);return;}this.explodeMissile(mo);}
    else mo.momx=mo.momy=0;}
   if(mo.removed)return;
  }while(xm||ym);
  if(pl&&pl.cheats&4){mo.momx=mo.momy=0;return;}
  if(mo.flags&(MF.MISSILE|MF.SKULLFLY))return;if(mo.z>mo.floorz)return;
  if(mo.flags&MF.CORPSE&&(mo.momx>1/4||mo.momx<-1/4||mo.momy>1/4||mo.momy<-1/4)&&mo.floorz!==mo.subsector.sector.floorheight)return;
  if(mo.momx>-STOPSPEED&&mo.momx<STOPSPEED&&mo.momy>-STOPSPEED&&mo.momy<STOPSPEED&&(!pl||(!pl.cmd.forwardmove&&!pl.cmd.sidemove))){
   if(pl&&mo.stnum>=I.STATE.PLAY_RUN1&&mo.stnum<I.STATE.PLAY_RUN1+4)this.setMobjState(mo,I.STATE.PLAY);mo.momx=mo.momy=0;}
  else{mo.momx*=FRICTION;mo.momy*=FRICTION;}}
 zMovement(mo){
  if(mo.player&&mo.z<mo.floorz){mo.player.viewheight-=mo.floorz-mo.z;mo.player.deltaviewheight=(VIEWHEIGHT-mo.player.viewheight)/8;}
  mo.z+=mo.momz;
  if(mo.flags&MF.FLOAT&&mo.target&&!(mo.flags&MF.SKULLFLY)&&!(mo.flags&MF.INFLOAT)){const dist=aproxDist(mo.x-mo.target.x,mo.y-mo.target.y),delta=mo.target.z+mo.height/2-mo.z;
   if(delta<0&&dist<-(delta*3))mo.z-=FLOATSPEED;else if(delta>0&&dist<delta*3)mo.z+=FLOATSPEED;}
  if(mo.z<=mo.floorz){
   if(mo.flags&MF.SKULLFLY)mo.momz=-mo.momz;
   if(mo.momz<0){if(mo.player&&mo.momz<-GRAVITY*8){mo.player.deltaviewheight=mo.momz/8;this.sound(mo,'oof');}mo.momz=0;}
   mo.z=mo.floorz;
   if(mo.flags&MF.MISSILE&&!(mo.flags&MF.NOCLIP)){this.explodeMissile(mo);return;}}
  else if(!(mo.flags&MF.NOGRAVITY)){if(mo.momz===0)mo.momz=-GRAVITY*2;else mo.momz-=GRAVITY;}
  if(mo.z+mo.height>mo.ceilingz){if(mo.momz>0)mo.momz=0;mo.z=mo.ceilingz-mo.height;if(mo.flags&MF.SKULLFLY)mo.momz=-mo.momz;
   if(mo.flags&MF.MISSILE&&!(mo.flags&MF.NOCLIP)){this.explodeMissile(mo);return;}}}
 // ---- spawning effects / missiles ----
 spawnPuff(x,y,z){z+=(this.P_Random()-this.P_Random())/64;const th=this.spawnMobj(x,y,z,MT.PUFF);th.momz=1;th.tics-=this.P_Random()&3;if(th.tics<1)th.tics=1;if(this.attackrange===MELEERANGE)this.setMobjState(th,I.STATE.PUFF3);}
 spawnBlood(x,y,z,damage){z+=(this.P_Random()-this.P_Random())/64;const th=this.spawnMobj(x,y,z,MT.BLOOD);th.momz=2;th.tics-=this.P_Random()&3;if(th.tics<1)th.tics=1;
  if(damage<=12&&damage>=9)this.setMobjState(th,I.STATE.BLOOD2);else if(damage<9)this.setMobjState(th,I.STATE.BLOOD3);}
 checkMissileSpawn(th){th.tics-=this.P_Random()&3;if(th.tics<1)th.tics=1;th.x+=th.momx/2;th.y+=th.momy/2;th.z+=th.momz/2;if(!this.tryMove(th,th.x,th.y))this.explodeMissile(th);}
 explodeMissile(mo){mo.momx=mo.momy=mo.momz=0;if(!this.setMobjState(mo,mo.info.deathstate))return;mo.tics-=this.P_Random()&3;if(mo.tics<1)mo.tics=1;mo.flags&=~MF.MISSILE;if(mo.info.deathsound)this.sound(mo,mo.info.deathsound);}
 spawnMissile(source,dest,type){
  const th=this.spawnMobj(source.x,source.y,source.z+32,type);if(th.info.seesound)this.sound(th,th.info.seesound);th.target=source;
  let an=pointToAngle2(source.x,source.y,dest.x,dest.y);if(dest.flags&MF.SHADOW)an=(an+((this.P_Random()-this.P_Random())<<20))>>>0;
  th.angle=an;th.momx=th.info.speed*fcos(an);th.momy=th.info.speed*fsin(an);let dist=aproxDist(dest.x-source.x,dest.y-source.y)/th.info.speed;dist=Math.floor(dist);if(dist<1)dist=1;
  th.momz=(dest.z-source.z)/dist;this.checkMissileSpawn(th);return th;}
 spawnPlayerMissile(source,type){
  let an=source.angle,slope=this.aimLineAttack(source,an,1024);
  if(!this.linetarget){an=(an+(1<<26))>>>0;slope=this.aimLineAttack(source,an,1024);if(!this.linetarget){an=(an-(2<<26))>>>0;slope=this.aimLineAttack(source,an,1024);}if(!this.linetarget){an=source.angle;slope=0;}}
  const th=this.spawnMobj(source.x,source.y,source.z+32,type);if(th.info.seesound)this.sound(th,th.info.seesound);th.target=source;th.angle=an;
  th.momx=th.info.speed*fcos(an);th.momy=th.info.speed*fsin(an);th.momz=th.info.speed*slope;this.checkMissileSpawn(th);return th;}
}
// side of a point relative to a divline/node {x,y,dx,dy}: 0 front, 1 back, 2 on the line (P_DivlineSide)
function divSide(x,y,n){
 if(!n.dx){if(x===n.x)return 2;if(x<=n.x)return n.dy>0?1:0;return n.dy<0?1:0;}
 if(!n.dy){if(y===n.y)return 2;if(y<=n.y)return n.dx<0?1:0;return n.dx>0?1:0;}
 const l=n.dy*(x-n.x),r=(y-n.y)*n.dx;if(r<l)return 0;if(l===r)return 2;return 1;}
// fraction along v2 where it crosses v1 (P_InterceptVector)
function interceptVector(v2,v1){const den=v1.dy*v2.dx-v1.dx*v2.dy;if(!den)return 0;return ((v1.x-v2.x)*v1.dy+(v2.y-v1.y)*v1.dx)/den;}

Object.assign(exports,{Game,Mobj,MF,MT,BAM,ANG45,ANG90,ANG180,ANG270,MAXRADIUS,MELEERANGE,MISSILERANGE,USERANGE,VIEWHEIGHT,MAXBOB,FLOATSPEED,ONFLOORZ,ONCEILINGZ,fsin,fcos,pointToAngle2,aproxDist,sangle,divSide,interceptVector});
