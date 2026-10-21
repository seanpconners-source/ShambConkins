// Doom action functions and interactions: monster AI (look, chase, attacks of every monster, Arch-vile, Pain
// Elemental, Icon of Sin), weapon actions (fire, refire, raise/lower, bob), damage, death, item drops and pickups.
const I=require("src/engines/doom/info.js");
const P=require("src/engines/doom/play.js");
const {Game,MF,MT,ANG45,ANG90,ANG180,ANG270,MELEERANGE,MISSILERANGE,fsin,fcos,pointToAngle2,aproxDist,sangle}=P;
const S=I.STATE;
const NODIR=8,OPPOSITE=[4,5,6,7,0,1,2,3,8],DIAGS=[3,1,5,7],XSPEED=[1,47000/65536,0,-47000/65536,-1,-47000/65536,0,47000/65536],YSPEED=[0,47000/65536,1,47000/65536,0,-47000/65536,-1,-47000/65536];
const WP={fist:0,pistol:1,shotgun:2,chaingun:3,missile:4,plasma:5,bfg:6,chainsaw:7,supershotgun:8,nochange:10};
const PW={invulnerability:0,strength:1,invisibility:2,ironfeet:3,allmap:4,infrared:5};
const WEAPONTOP=32,WEAPONBOTTOM=128,BFGCELLS=40,BONUSADD=6,TRACEANGLE=0xc000000,FATSPREAD=ANG90/8,SKULLSPEED=20;

const A={};// monster/thing actions: this = game, mo = actor
const W={};// weapon actions: (player, psp)
// ---------- monsters ----------
Object.assign(Game.prototype,{
 checkMeleeRange(a){const t=a.target;if(!t)return false;if(aproxDist(t.x-a.x,t.y-a.y)>=MELEERANGE-20+t.info.radius)return false;return this.checkSight(a,t);},
 checkMissileRange(a){
  if(!this.checkSight(a,a.target))return false;
  if(a.flags&MF.JUSTHIT){a.flags&=~MF.JUSTHIT;return true;}
  if(a.reactiontime)return false;
  let d=aproxDist(a.x-a.target.x,a.y-a.target.y)-64;if(!a.info.meleestate)d-=128;d=Math.floor(d);
  if(a.type===MT.VILE&&d>14*64)return false;
  if(a.type===MT.UNDEAD){if(d<196)return false;d>>=1;}
  if(a.type===MT.CYBORG||a.type===MT.SPIDER||a.type===MT.SKULL)d>>=1;
  if(d>200)d=200;if(a.type===MT.CYBORG&&d>160)d=160;
  return !(this.P_Random()<d);},
 move(a){
  if(a.movedir===NODIR)return false;
  const tx=a.x+a.info.speed*XSPEED[a.movedir],ty=a.y+a.info.speed*YSPEED[a.movedir];
  if(!this.tryMove(a,tx,ty)){
   if(a.flags&MF.FLOAT&&this.floatok){if(a.z<this.tmfloorz)a.z+=P.FLOATSPEED;else a.z-=P.FLOATSPEED;a.flags|=MF.INFLOAT;return true;}
   if(!this.spechit.length)return false;a.movedir=NODIR;let good=false;const hits=this.spechit.slice();
   for(let i=hits.length-1;i>=0;i--)if(this.useSpecialLine(a,hits[i],0))good=true;return good;}
  a.flags&=~MF.INFLOAT;if(!(a.flags&MF.FLOAT))a.z=a.floorz;return true;},
 tryWalk(a){if(!this.move(a))return false;a.movecount=this.P_Random()&15;return true;},
 newChaseDir(a){
  const t=a.target,dx=t.x-a.x,dy=t.y-a.y,old=a.movedir,turn=OPPOSITE[old];
  let d1=dx>10?0:dx<-10?4:NODIR,d2=dy<-10?6:dy>10?2:NODIR;
  if(d1!==NODIR&&d2!==NODIR){a.movedir=DIAGS[((dy<0)<<1)+(dx>0?1:0)];if(a.movedir!==turn&&this.tryWalk(a))return;}
  if(this.P_Random()>200||Math.abs(dy)>Math.abs(dx)){const t2=d1;d1=d2;d2=t2;}
  if(d1===turn)d1=NODIR;if(d2===turn)d2=NODIR;
  if(d1!==NODIR){a.movedir=d1;if(this.tryWalk(a))return;}
  if(d2!==NODIR){a.movedir=d2;if(this.tryWalk(a))return;}
  if(old!==NODIR){a.movedir=old;if(this.tryWalk(a))return;}
  if(this.P_Random()&1){for(let d=0;d<=7;d++)if(d!==turn){a.movedir=d;if(this.tryWalk(a))return;}}
  else{for(let d=7;d>=0;d--)if(d!==turn){a.movedir=d;if(this.tryWalk(a))return;}}
  if(turn!==NODIR){a.movedir=turn;if(this.tryWalk(a))return;}
  a.movedir=NODIR;},
 lookForPlayers(a,allaround){
  for(const pl of this.players){if(!pl||pl.health<=0||!pl.mo)continue;if(!this.checkSight(a,pl.mo))continue;
   if(!allaround){const an=(pointToAngle2(a.x,a.y,pl.mo.x,pl.mo.y)-a.angle)>>>0;if(an>ANG90&&an<ANG270&&aproxDist(pl.mo.x-a.x,pl.mo.y-a.y)>MELEERANGE)continue;}
   a.target=pl.mo;return true;}
  return false;},
});
A.Look=function(a){
 a.threshold=0;const targ=a.subsector.sector.soundtarget;let see=false;
 if(targ&&targ.flags&MF.SHOOTABLE){a.target=targ;if(a.flags&MF.AMBUSH){if(this.checkSight(a,a.target))see=true;}else see=true;}
 if(!see&&!this.lookForPlayers(a,false))return;
 const ss=a.info.seesound;if(ss){let snd=ss;if(/^posit[123]$/.test(ss))snd='posit'+(1+this.P_Random()%3);else if(/^bgsit[12]$/.test(ss))snd='bgsit'+(1+this.P_Random()%2);
  this.sound(a.type===MT.SPIDER||a.type===MT.CYBORG?null:a,snd);}
 this.setMobjState(a,a.info.seestate);};
A.Chase=function(a){
 if(a.reactiontime)a.reactiontime--;
 if(a.threshold){if(!a.target||a.target.health<=0)a.threshold=0;else a.threshold--;}
 if(a.movedir<8){a.angle=(a.angle&(7<<29))>>>0;const delta=sangle((a.angle-(a.movedir<<29))>>>0);if(delta>0)a.angle=(a.angle-ANG90/2)>>>0;else if(delta<0)a.angle=(a.angle+ANG90/2)>>>0;}
 if(!a.target||!(a.target.flags&MF.SHOOTABLE)){if(this.lookForPlayers(a,true))return;this.setMobjState(a,a.info.spawnstate);return;}
 if(a.flags&MF.JUSTATTACKED){a.flags&=~MF.JUSTATTACKED;if(this.skill!==4&&!this.fastparm)this.newChaseDir(a);return;}
 if(a.info.meleestate&&this.checkMeleeRange(a)){if(a.info.attacksound)this.sound(a,a.info.attacksound);this.setMobjState(a,a.info.meleestate);return;}
 if(a.info.missilestate){if(!(this.skill<4&&!this.fastparm&&a.movecount)&&this.checkMissileRange(a)){this.setMobjState(a,a.info.missilestate);a.flags|=MF.JUSTATTACKED;return;}}
 if(--a.movecount<0||!this.move(a))this.newChaseDir(a);
 if(a.info.activesound&&this.P_Random()<3)this.sound(a,a.info.activesound);};
A.FaceTarget=function(a){if(!a.target)return;a.flags&=~MF.AMBUSH;a.angle=pointToAngle2(a.x,a.y,a.target.x,a.target.y);if(a.target.flags&MF.SHADOW)a.angle=(a.angle+((this.P_Random()-this.P_Random())<<21))>>>0;};
const hitscan=(g,a,n,snd)=>{if(!a.target)return;g.sound(a,snd);A.FaceTarget.call(g,a);const ba=a.angle,slope=g.aimLineAttack(a,ba,MISSILERANGE);
 for(let i=0;i<n;i++){const an=(ba+((g.P_Random()-g.P_Random())<<20))>>>0,dmg=((g.P_Random()%5)+1)*3;g.lineAttack(a,an,MISSILERANGE,slope,dmg);}};
A.PosAttack=function(a){hitscan(this,a,1,'pistol');};
A.SPosAttack=function(a){hitscan(this,a,3,'shotgn');};
A.CPosAttack=function(a){hitscan(this,a,1,'shotgn');};
A.CPosRefire=function(a){A.FaceTarget.call(this,a);if(this.P_Random()<40)return;if(!a.target||a.target.health<=0||!this.checkSight(a,a.target))this.setMobjState(a,a.info.seestate);};
A.SpidRefire=function(a){A.FaceTarget.call(this,a);if(this.P_Random()<10)return;if(!a.target||a.target.health<=0||!this.checkSight(a,a.target))this.setMobjState(a,a.info.seestate);};
A.BspiAttack=function(a){if(!a.target)return;A.FaceTarget.call(this,a);this.spawnMissile(a,a.target,MT.ARACHPLAZ);};
A.TroopAttack=function(a){if(!a.target)return;A.FaceTarget.call(this,a);if(this.checkMeleeRange(a)){this.sound(a,'claw');this.damageMobj(a.target,a,a,(this.P_Random()%8+1)*3);return;}this.spawnMissile(a,a.target,MT.TROOPSHOT);};
A.SargAttack=function(a){if(!a.target)return;A.FaceTarget.call(this,a);if(this.checkMeleeRange(a))this.damageMobj(a.target,a,a,((this.P_Random()%10)+1)*4);};
A.HeadAttack=function(a){if(!a.target)return;A.FaceTarget.call(this,a);if(this.checkMeleeRange(a)){this.damageMobj(a.target,a,a,(this.P_Random()%6+1)*10);return;}this.spawnMissile(a,a.target,MT.HEADSHOT);};
A.CyberAttack=function(a){if(!a.target)return;A.FaceTarget.call(this,a);this.spawnMissile(a,a.target,MT.ROCKET);};
A.BruisAttack=function(a){if(!a.target)return;if(this.checkMeleeRange(a)){this.sound(a,'claw');this.damageMobj(a.target,a,a,(this.P_Random()%8+1)*10);return;}this.spawnMissile(a,a.target,MT.BRUISERSHOT);};
A.SkelMissile=function(a){if(!a.target)return;A.FaceTarget.call(this,a);a.z+=16;const mo=this.spawnMissile(a,a.target,MT.TRACER);a.z-=16;mo.x+=mo.momx;mo.y+=mo.momy;mo.tracer=a.target;};
A.Tracer=function(a){
 if(this.gametic&3)return;this.spawnPuff(a.x,a.y,a.z);const th=this.spawnMobj(a.x-a.momx,a.y-a.momy,a.z,MT.SMOKE);th.momz=1;th.tics-=this.P_Random()&3;if(th.tics<1)th.tics=1;
 const d=a.tracer;if(!d||d.health<=0)return;const exact=pointToAngle2(a.x,a.y,d.x,d.y);
 if(exact!==a.angle){if(((exact-a.angle)>>>0)>0x80000000){a.angle=(a.angle-TRACEANGLE)>>>0;if(((exact-a.angle)>>>0)<0x80000000)a.angle=exact;}else{a.angle=(a.angle+TRACEANGLE)>>>0;if(((exact-a.angle)>>>0)>0x80000000)a.angle=exact;}}
 a.momx=a.info.speed*fcos(a.angle);a.momy=a.info.speed*fsin(a.angle);
 let dist=Math.floor(aproxDist(d.x-a.x,d.y-a.y)/a.info.speed);if(dist<1)dist=1;const slope=(d.z+40-a.z)/dist;if(slope<a.momz)a.momz-=1/8;else a.momz+=1/8;};
A.SkelWhoosh=function(a){if(!a.target)return;A.FaceTarget.call(this,a);this.sound(a,'skeswg');};
A.SkelFist=function(a){if(!a.target)return;A.FaceTarget.call(this,a);if(this.checkMeleeRange(a)){this.sound(a,'skepch');this.damageMobj(a.target,a,a,((this.P_Random()%10)+1)*6);}};
A.VileChase=function(a){
 if(a.movedir!==NODIR){const lv=this.lv,tx=a.x+a.info.speed*XSPEED[a.movedir],ty=a.y+a.info.speed*YSPEED[a.movedir],R=P.MAXRADIUS*2;
  const xl=Math.floor((tx-lv.bmaporgx-R)/128),xh=Math.floor((tx-lv.bmaporgx+R)/128),yl=Math.floor((ty-lv.bmaporgy-R)/128),yh=Math.floor((ty-lv.bmaporgy+R)/128);
  let hit=null;const vr=this.mobjinfo[MT.VILE].radius;
  const check=th=>{if(!(th.flags&MF.CORPSE)||th.tics!==-1||!th.info.raisestate)return true;const md=th.info.radius+vr;if(Math.abs(th.x-tx)>md||Math.abs(th.y-ty)>md)return true;
   th.momx=th.momy=0;th.height*=4;const ok=this.checkPosition(th,th.x,th.y);th.height/=4;if(!ok)return true;hit=th;return false;};
  for(let bx=xl;bx<=xh&&!hit;bx++)for(let by=yl;by<=yh&&!hit;by++)this.blockThings(bx,by,check);
  if(hit){const t=a.target;a.target=hit;A.FaceTarget.call(this,a);a.target=t;this.setMobjState(a,S.VILE_HEAL1);this.sound(hit,'slop');const info=hit.info;
   this.setMobjState(hit,info.raisestate);hit.height=info.height;hit.flags=info.flags;hit.health=info.spawnhealth;hit.target=null;this.events.push({kind:'raise',mo:hit});return;}}
 A.Chase.call(this,a);};
A.VileStart=function(a){this.sound(a,'vilatk');};
A.Fire=function(a){const d=a.tracer;if(!d||!a.target)return;if(!this.checkSight(a.target,d))return;this.unsetThingPosition(a);a.x=d.x+24*fcos(d.angle);a.y=d.y+24*fsin(d.angle);a.z=d.z;this.setThingPosition(a);};
A.StartFire=function(a){this.sound(a,'flamst');A.Fire.call(this,a);};
A.FireCrackle=function(a){this.sound(a,'flame');A.Fire.call(this,a);};
A.VileTarget=function(a){if(!a.target)return;A.FaceTarget.call(this,a);const fog=this.spawnMobj(a.target.x,a.target.x,a.target.z,MT.FIRE);a.tracer=fog;fog.target=a;fog.tracer=a.target;A.Fire.call(this,fog);};
A.VileAttack=function(a){if(!a.target)return;A.FaceTarget.call(this,a);if(!this.checkSight(a,a.target))return;this.sound(a,'barexp');this.damageMobj(a.target,a,a,20);a.target.momz=1000/a.target.info.mass;
 const fire=a.tracer;if(!fire)return;fire.x=a.target.x-24*fcos(a.angle);fire.y=a.target.y-24*fsin(a.angle);this.radiusAttack(fire,a,70);};
A.FatRaise=function(a){A.FaceTarget.call(this,a);this.sound(a,'manatk');};
const fatShot=(g,a,turn)=>{const mo=g.spawnMissile(a,a.target,MT.FATSHOT);if(turn){mo.angle=(mo.angle+turn)>>>0;mo.momx=mo.info.speed*fcos(mo.angle);mo.momy=mo.info.speed*fsin(mo.angle);}return mo;};
A.FatAttack1=function(a){if(!a.target)return;A.FaceTarget.call(this,a);a.angle=(a.angle+FATSPREAD)>>>0;fatShot(this,a,0);fatShot(this,a,FATSPREAD);};
A.FatAttack2=function(a){if(!a.target)return;A.FaceTarget.call(this,a);a.angle=(a.angle-FATSPREAD)>>>0;fatShot(this,a,0);fatShot(this,a,-FATSPREAD*2);};
A.FatAttack3=function(a){if(!a.target)return;A.FaceTarget.call(this,a);fatShot(this,a,-FATSPREAD/2);fatShot(this,a,FATSPREAD/2);};
A.SkullAttack=function(a){if(!a.target)return;const d=a.target;a.flags|=MF.SKULLFLY;this.sound(a,a.info.attacksound);A.FaceTarget.call(this,a);
 a.momx=SKULLSPEED*fcos(a.angle);a.momy=SKULLSPEED*fsin(a.angle);let dist=Math.floor(aproxDist(d.x-a.x,d.y-a.y)/SKULLSPEED);if(dist<1)dist=1;a.momz=(d.z+d.height/2-a.z)/dist;};
const painShootSkull=(g,a,an)=>{let n=0;for(const m of g.mobjs())if(m.type===MT.SKULL)n++;if(n>20)return;
 const pre=4+3*(a.info.radius+g.mobjinfo[MT.SKULL].radius)/2,x=a.x+pre*fcos(an),y=a.y+pre*fsin(an),z=a.z+8;const nm=g.spawnMobj(x,y,z,MT.SKULL);g.events.push({kind:'spawn',mo:nm,from:a});
 if(!g.tryMove(nm,nm.x,nm.y)){g.damageMobj(nm,a,a,10000);return;}nm.target=a.target;A.SkullAttack.call(g,nm);};
A.PainAttack=function(a){if(!a.target)return;A.FaceTarget.call(this,a);painShootSkull(this,a,a.angle);};
A.PainDie=function(a){A.Fall.call(this,a);for(const t of [ANG90,ANG180,ANG270])painShootSkull(this,a,(a.angle+t)>>>0);};
A.Scream=function(a){let s=a.info.deathsound;if(!s)return;if(/^podth[123]$/.test(s))s='podth'+(1+this.P_Random()%3);else if(/^bgdth[12]$/.test(s))s='bgdth'+(1+this.P_Random()%2);this.sound(a.type===MT.SPIDER||a.type===MT.CYBORG?null:a,s);};
A.XScream=function(a){this.sound(a,'slop');};
A.Pain=function(a){if(a.info.painsound)this.sound(a,a.info.painsound);};
A.Fall=function(a){a.flags&=~MF.SOLID;};
A.Explode=function(a){this.radiusAttack(a,a.target,128);};
A.PlayerScream=function(a){this.sound(a,this.commercial&&a.health<-50?'pdiehi':'pldeth');};
A.Hoof=function(a){this.sound(a,'hoof');A.Chase.call(this,a);};
A.Metal=function(a){this.sound(a,'metal');A.Chase.call(this,a);};
A.BabyMetal=function(a){this.sound(a,'bspwlk');A.Chase.call(this,a);};
A.KeenDie=function(a){A.Fall.call(this,a);for(const m of this.mobjs())if(m!==a&&m.type===a.type&&m.health>0)return;this.evDoDoor({tag:666},'open');};
A.BossDeath=function(mo){
 const map=this.gamemap,ep=this.gameepisode;
 if(this.commercial){if(map!==7)return;if(mo.type!==MT.FATSO&&mo.type!==MT.BABY)return;}
 else{const need={1:[8,MT.BRUISER],2:[8,MT.CYBORG],3:[8,MT.SPIDER]}[ep];
  if(need){if(map!==need[0]||mo.type!==need[1])return;}else if(ep===4){if(!(map===6&&mo.type===MT.CYBORG)&&!(map===8&&mo.type===MT.SPIDER))return;}else if(map!==8)return;}
 if(!this.players.some(p=>p&&p.health>0))return;
 for(const m of this.mobjs())if(m!==mo&&m.type===mo.type&&m.health>0)return;
 if(this.commercial){if(mo.type===MT.FATSO){this.evDoFloor({tag:666},'lowerFloorToLowest');return;}if(mo.type===MT.BABY){this.evDoFloor({tag:667},'raiseToTexture');return;}}
 else if(ep===1){this.evDoFloor({tag:666},'lowerFloorToLowest');return;}
 else if(ep===4){if(map===6){this.evDoDoor({tag:666},'blazeOpen');return;}if(map===8){this.evDoFloor({tag:666},'lowerFloorToLowest');return;}}
 this.exitLevel();};
A.BrainAwake=function(){this.braintargets=[];this.braintargeton=0;for(const m of this.mobjs())if(m.type===MT.BOSSTARGET)this.braintargets.push(m);this.sound(null,'bossit');};
A.BrainPain=function(){this.sound(null,'bospn');};
const brainBoom=(g,x,y)=>{const z=128+g.P_Random()*2,th=g.spawnMobj(x,y,z,MT.ROCKET);th.momz=g.P_Random()/128;g.setMobjState(th,S.BRAINEXPLODE1);th.tics-=g.P_Random()&7;if(th.tics<1)th.tics=1;};
A.BrainScream=function(mo){for(let x=mo.x-196;x<mo.x+320;x+=8)brainBoom(this,x,mo.y-320);this.sound(null,'bosdth');};
A.BrainExplode=function(mo){brainBoom(this,mo.x+(this.P_Random()-this.P_Random())/32,mo.y);};
A.BrainDie=function(){this.exitLevel();};
A.BrainSpit=function(mo){this.brainEasy=!this.brainEasy;if(this.skill<=1&&!this.brainEasy)return;const T=this.braintargets||[];if(!T.length)return;
 const targ=T[this.braintargeton];this.braintargeton=(this.braintargeton+1)%T.length;const nm=this.spawnMissile(mo,targ,MT.SPAWNSHOT);nm.target=targ;
 nm.reactiontime=Math.floor(((targ.y-mo.y)/(nm.momy||1))/(nm.state.tics||1));this.sound(null,'bospit');};
A.SpawnSound=function(mo){this.sound(mo,'boscub');A.SpawnFly.call(this,mo);};
A.SpawnFly=function(mo){if(--mo.reactiontime>0)return;const t=mo.target;if(!t){this.removeMobj(mo);return;}const fog=this.spawnMobj(t.x,t.y,t.z,MT.SPAWNFIRE);this.sound(fog,'telept');
 const r=this.P_Random(),type=r<50?MT.TROOP:r<90?MT.SERGEANT:r<120?MT.SHADOWS:r<130?MT.PAIN:r<160?MT.HEAD:r<162?MT.VILE:r<172?MT.UNDEAD:r<192?MT.BABY:r<222?MT.FATSO:r<246?MT.KNIGHT:MT.BRUISER;
 const nm=this.spawnMobj(t.x,t.y,t.z,type);this.events.push({kind:'spawn',mo:nm});if(this.lookForPlayers(nm,true))this.setMobjState(nm,nm.info.seestate);this.teleportMove(nm,nm.x,nm.y);this.removeMobj(mo);};
// ---------- weapons ----------
Object.assign(Game.prototype,{
 setPsprite(pl,pos,stnum){const psp=pl.psprites[pos];
  for(;;){if(!stnum){psp.state=null;break;}const st=this.states[stnum];psp.state=st;psp.stnum=stnum;psp.tics=st.tics;
   if(st.action){const f=W[st.action];if(f)f.call(this,pl,psp);if(!psp.state)break;}
   stnum=psp.state.next;if(psp.tics)break;}},
 bringUpWeapon(pl){if(pl.pendingweapon===WP.nochange)pl.pendingweapon=pl.readyweapon;if(pl.pendingweapon===WP.chainsaw)this.sound(pl.mo,'sawup');
  const ns=I.WEAPONS[pl.pendingweapon].upstate;pl.pendingweapon=WP.nochange;pl.psprites[0].sy=WEAPONBOTTOM;this.setPsprite(pl,0,ns);},
 checkAmmo(pl){
  const ammo=I.WEAPONS[pl.readyweapon].ammo,count=pl.readyweapon===WP.bfg?BFGCELLS:pl.readyweapon===WP.supershotgun?2:1;
  if(ammo<0||pl.ammo[ammo]>=count)return true;
  const own=pl.weaponowned,sw=this.gamemode==='shareware';
  if(own[WP.plasma]&&pl.ammo[2]&&!sw)pl.pendingweapon=WP.plasma;
  else if(own[WP.supershotgun]&&pl.ammo[1]>2&&this.commercial)pl.pendingweapon=WP.supershotgun;
  else if(own[WP.chaingun]&&pl.ammo[0])pl.pendingweapon=WP.chaingun;
  else if(own[WP.shotgun]&&pl.ammo[1])pl.pendingweapon=WP.shotgun;
  else if(pl.ammo[0])pl.pendingweapon=WP.pistol;
  else if(own[WP.chainsaw])pl.pendingweapon=WP.chainsaw;
  else if(own[WP.missile]&&pl.ammo[3])pl.pendingweapon=WP.missile;
  else if(own[WP.bfg]&&pl.ammo[2]>40&&!sw)pl.pendingweapon=WP.bfg;
  else pl.pendingweapon=WP.fist;
  this.setPsprite(pl,0,I.WEAPONS[pl.readyweapon].downstate);return false;},
 fireWeapon(pl){if(!this.checkAmmo(pl))return;this.setMobjState(pl.mo,S.PLAY_ATK1);this.setPsprite(pl,0,I.WEAPONS[pl.readyweapon].atkstate);this.noiseAlert(pl.mo,pl.mo);pl.shots=(pl.shots||0)+1;},
 dropWeapon(pl){this.setPsprite(pl,0,I.WEAPONS[pl.readyweapon].downstate);},
 setupPsprites(pl){for(const p of pl.psprites)p.state=null;pl.pendingweapon=pl.readyweapon;this.bringUpWeapon(pl);},
 movePsprites(pl){for(let i=0;i<2;i++){const p=pl.psprites[i];if(p.state&&p.tics!==-1){p.tics--;if(!p.tics)this.setPsprite(pl,i,p.state.next);}}pl.psprites[1].sx=pl.psprites[0].sx;pl.psprites[1].sy=pl.psprites[0].sy;},
 bulletSlope(mo){let an=mo.angle;this.bulletslope=this.aimLineAttack(mo,an,1024);if(!this.linetarget){an=(an+(1<<26))>>>0;this.bulletslope=this.aimLineAttack(mo,an,1024);if(!this.linetarget){an=(an-(2<<26))>>>0;this.bulletslope=this.aimLineAttack(mo,an,1024);}}},
 gunShot(mo,accurate){const dmg=5*(this.P_Random()%3+1);let an=mo.angle;if(!accurate)an=(an+((this.P_Random()-this.P_Random())<<18))>>>0;this.lineAttack(mo,an,MISSILERANGE,this.bulletslope,dmg);},
});
W.WeaponReady=function(pl,psp){
 const mo=pl.mo;if(mo.stnum===S.PLAY_ATK1||mo.stnum===S.PLAY_ATK2)this.setMobjState(mo,S.PLAY);
 if(pl.readyweapon===WP.chainsaw&&psp.stnum===S.SAW)this.sound(mo,'sawidl');
 if(pl.pendingweapon!==WP.nochange||!pl.health){this.setPsprite(pl,0,I.WEAPONS[pl.readyweapon].downstate);return;}
 if(pl.cmd.buttons&1){if(!pl.attackdown||(pl.readyweapon!==WP.missile&&pl.readyweapon!==WP.bfg)){pl.attackdown=true;this.fireWeapon(pl);return;}}else pl.attackdown=false;
 const a=((128*this.leveltime)&8191)<<19>>>0;psp.sx=1+pl.bob*fcos(a);psp.sy=WEAPONTOP+pl.bob*fsin((a&0x7fffffff)>>>0);};
W.ReFire=function(pl){if(pl.cmd.buttons&1&&pl.pendingweapon===WP.nochange&&pl.health){pl.refire++;this.fireWeapon(pl);}else{pl.refire=0;this.checkAmmo(pl);}};
W.CheckReload=function(pl){this.checkAmmo(pl);};
W.Lower=function(pl,psp){psp.sy+=6;if(psp.sy<WEAPONBOTTOM)return;if(pl.playerstate==='dead'){psp.sy=WEAPONBOTTOM;return;}if(!pl.health){this.setPsprite(pl,0,0);return;}pl.readyweapon=pl.pendingweapon;this.bringUpWeapon(pl);};
W.Raise=function(pl,psp){psp.sy-=6;if(psp.sy>WEAPONTOP)return;psp.sy=WEAPONTOP;this.setPsprite(pl,0,I.WEAPONS[pl.readyweapon].readystate);};
W.GunFlash=function(pl){this.setMobjState(pl.mo,S.PLAY_ATK2);this.setPsprite(pl,1,I.WEAPONS[pl.readyweapon].flashstate);};
W.Punch=function(pl){const mo=pl.mo;let dmg=(this.P_Random()%10+1)<<1;if(pl.powers[PW.strength])dmg*=10;const an=(mo.angle+((this.P_Random()-this.P_Random())<<18))>>>0,slope=this.aimLineAttack(mo,an,MELEERANGE);
 this.lineAttack(mo,an,MELEERANGE,slope,dmg);if(this.linetarget){this.sound(mo,'punch');mo.angle=pointToAngle2(mo.x,mo.y,this.linetarget.x,this.linetarget.y);}};
W.Saw=function(pl){const mo=pl.mo,dmg=2*(this.P_Random()%10+1),an=(mo.angle+((this.P_Random()-this.P_Random())<<18))>>>0,slope=this.aimLineAttack(mo,an,MELEERANGE+1);
 this.lineAttack(mo,an,MELEERANGE+1,slope,dmg);if(!this.linetarget){this.sound(mo,'sawful');return;}this.sound(mo,'sawhit');
 const ang=pointToAngle2(mo.x,mo.y,this.linetarget.x,this.linetarget.y),d=(ang-mo.angle)>>>0;
 if(d>ANG180){if(sangle(d)<-ANG90/20)mo.angle=(ang+ANG90/21)>>>0;else mo.angle=(mo.angle-ANG90/20)>>>0;}else{if(d>ANG90/20)mo.angle=(ang-ANG90/21)>>>0;else mo.angle=(mo.angle+ANG90/20)>>>0;}
 mo.flags|=MF.JUSTATTACKED;};
W.FireMissile=function(pl){pl.ammo[3]--;this.spawnPlayerMissile(pl.mo,MT.ROCKET);};
W.FireBFG=function(pl){pl.ammo[2]-=BFGCELLS;this.spawnPlayerMissile(pl.mo,MT.BFG);};
W.FirePlasma=function(pl){pl.ammo[2]--;this.setPsprite(pl,1,I.WEAPONS[pl.readyweapon].flashstate+(this.P_Random()&1));this.spawnPlayerMissile(pl.mo,MT.PLASMA);};
W.FirePistol=function(pl){const mo=pl.mo;this.sound(mo,'pistol');this.setMobjState(mo,S.PLAY_ATK2);pl.ammo[0]--;this.setPsprite(pl,1,I.WEAPONS[pl.readyweapon].flashstate);this.bulletSlope(mo);this.gunShot(mo,!pl.refire);};
W.FireShotgun=function(pl){const mo=pl.mo;this.sound(mo,'shotgn');this.setMobjState(mo,S.PLAY_ATK2);pl.ammo[1]--;this.setPsprite(pl,1,I.WEAPONS[pl.readyweapon].flashstate);this.bulletSlope(mo);for(let i=0;i<7;i++)this.gunShot(mo,false);};
W.FireShotgun2=function(pl){const mo=pl.mo;this.sound(mo,'dshtgn');this.setMobjState(mo,S.PLAY_ATK2);pl.ammo[1]-=2;this.setPsprite(pl,1,I.WEAPONS[pl.readyweapon].flashstate);this.bulletSlope(mo);
 for(let i=0;i<20;i++){const dmg=5*(this.P_Random()%3+1),an=(mo.angle+((this.P_Random()-this.P_Random())<<19))>>>0;this.lineAttack(mo,an,MISSILERANGE,this.bulletslope+(this.P_Random()-this.P_Random())*32/65536,dmg);}};
W.FireCGun=function(pl,psp){const mo=pl.mo;this.sound(mo,'pistol');if(!pl.ammo[0])return;this.setMobjState(mo,S.PLAY_ATK2);pl.ammo[0]--;
 this.setPsprite(pl,1,I.WEAPONS[pl.readyweapon].flashstate+(psp.stnum-S.CHAIN1));this.bulletSlope(mo);this.gunShot(mo,!pl.refire);};
W.Light0=function(pl){pl.extralight=0;};W.Light1=function(pl){pl.extralight=1;};W.Light2=function(pl){pl.extralight=2;};
W.BFGsound=function(pl){this.sound(pl.mo,'bfg');};
W.OpenShotgun2=function(pl){this.sound(pl.mo,'dbopn');};W.LoadShotgun2=function(pl){this.sound(pl.mo,'dbload');};W.CloseShotgun2=function(pl,psp){this.sound(pl.mo,'dbcls');W.ReFire.call(this,pl,psp);};
A.BFGSpray=function(mo){for(let i=0;i<40;i++){const an=(mo.angle-ANG90/2+ANG90/40*i)>>>0;this.aimLineAttack(mo.target,an,1024);const t=this.linetarget;if(!t)continue;
 this.spawnMobj(t.x,t.y,t.z+t.height/4,MT.EXTRABFG);let dmg=0;for(let j=0;j<15;j++)dmg+=(this.P_Random()&7)+1;this.damageMobj(t,mo.target,mo.target,dmg);}};
// ---------- damage, death, pickups ----------
Object.assign(Game.prototype,{
 damageMobj(target,inflictor,source,damage){
  if(!(target.flags&MF.SHOOTABLE)||target.health<=0)return;
  if(target.flags&MF.SKULLFLY)target.momx=target.momy=target.momz=0;
  const pl=target.player;if(pl&&this.skill===0)damage>>=1;
  if(inflictor&&!(target.flags&MF.NOCLIP)&&(!source||!source.player||source.player.readyweapon!==WP.chainsaw)){
   let ang=pointToAngle2(inflictor.x,inflictor.y,target.x,target.y),thrust=damage*(1/8)*100/target.info.mass;
   if(damage<40&&damage>target.health&&target.z-inflictor.z>64&&this.P_Random()&1){ang=(ang+ANG180)>>>0;thrust*=4;}
   target.momx+=thrust*fcos(ang);target.momy+=thrust*fsin(ang);}
  if(pl){
   if(target.subsector.sector.special===11&&damage>=target.health)damage=target.health-1;
   if(damage<1000&&(pl.cheats&2||pl.powers[PW.invulnerability]))return;
   if(pl.armortype){let saved=pl.armortype===1?Math.floor(damage/3):Math.floor(damage/2);if(pl.armorpoints<=saved){saved=pl.armorpoints;pl.armortype=0;}pl.armorpoints-=saved;damage-=saved;}
   pl.health-=damage;if(pl.health<0)pl.health=0;pl.attacker=source;pl.damagecount+=damage;if(pl.damagecount>100)pl.damagecount=100;pl.hurtTic=this.gametic;pl.lastDamage=damage;}
  target.health-=damage;
  if(target.health<=0){this.killMobj(source,target);return;}
  if(this.P_Random()<target.info.painchance&&!(target.flags&MF.SKULLFLY)){target.flags|=MF.JUSTHIT;this.setMobjState(target,target.info.painstate);}
  target.reactiontime=0;
  if((!target.threshold||target.type===MT.VILE)&&source&&source!==target&&source.type!==MT.VILE){target.target=source;target.threshold=100;
   if(target.state===this.states[target.info.spawnstate]&&target.info.seestate)this.setMobjState(target,target.info.seestate);}},
 killMobj(source,target){
  target.flags&=~(MF.SHOOTABLE|MF.FLOAT|MF.SKULLFLY);if(target.type!==MT.SKULL)target.flags&=~MF.NOGRAVITY;
  target.flags|=MF.CORPSE|MF.DROPOFF;target.height/=4;
  if(target.flags&MF.COUNTKILL){const pl=source&&source.player||this.players[0];if(pl)pl.killcount++;}
  if(source&&source.player&&target.flags&MF.COUNTKILL)this.events.push({kind:'kill',mo:target,by:source.player});
  if(target.player){target.flags&=~MF.SOLID;target.player.playerstate='dead';this.dropWeapon(target.player);this.events.push({kind:'playerdeath',player:target.player});}
  if(target.health< -target.info.spawnhealth&&target.info.xdeathstate)this.setMobjState(target,target.info.xdeathstate);else this.setMobjState(target,target.info.deathstate);
  target.tics-=this.P_Random()&3;if(target.tics<1)target.tics=1;
  const item={[MT.WOLFSS]:MT.CLIP,[MT.POSSESSED]:MT.CLIP,[MT.SHOTGUY]:MT.SHOTGUN,[MT.CHAINGUY]:MT.CHAINGUN}[target.type];
  if(item!==undefined){const mo=this.spawnMobj(target.x,target.y,P.ONFLOORZ,item);mo.flags|=MF.DROPPED;}},
 giveAmmo(pl,ammo,num){
  if(ammo<0||pl.ammo[ammo]===pl.maxammo[ammo])return false;
  num=num?num*I.CLIPAMMO[ammo]:Math.floor(I.CLIPAMMO[ammo]/2);if(this.skill===0||this.skill===4)num<<=1;
  const old=pl.ammo[ammo];pl.ammo[ammo]=Math.min(pl.maxammo[ammo],pl.ammo[ammo]+num);if(old)return true;
  const rw=pl.readyweapon,own=pl.weaponowned;
  if(ammo===0){if(rw===WP.fist)pl.pendingweapon=own[WP.chaingun]?WP.chaingun:WP.pistol;}
  else if(ammo===1){if((rw===WP.fist||rw===WP.pistol)&&own[WP.shotgun])pl.pendingweapon=WP.shotgun;}
  else if(ammo===2){if((rw===WP.fist||rw===WP.pistol)&&own[WP.plasma])pl.pendingweapon=WP.plasma;}
  else if(ammo===3){if(rw===WP.fist&&own[WP.missile])pl.pendingweapon=WP.missile;}
  return true;},
 giveWeapon(pl,w,dropped){const ammo=I.WEAPONS[w].ammo,ga=ammo>=0?this.giveAmmo(pl,ammo,dropped?1:2):false;let gw=false;if(!pl.weaponowned[w]){gw=true;pl.weaponowned[w]=true;pl.pendingweapon=w;}return gw||ga;},
 giveBody(pl,n){if(pl.health>=100)return false;pl.health=Math.min(100,pl.health+n);pl.mo.health=pl.health;return true;},
 giveArmor(pl,t){const h=t*100;if(pl.armorpoints>=h)return false;pl.armortype=t;pl.armorpoints=h;return true;},
 giveCard(pl,c){if(pl.cards[c])return;pl.bonuscount=BONUSADD;pl.cards[c]=true;},
 givePower(pl,p){
  if(p===PW.invulnerability){pl.powers[p]=30*35;return true;}
  if(p===PW.invisibility){pl.powers[p]=60*35;pl.mo.flags|=MF.SHADOW;return true;}
  if(p===PW.infrared){pl.powers[p]=120*35;return true;}
  if(p===PW.ironfeet){pl.powers[p]=60*35;return true;}
  if(p===PW.strength){this.giveBody(pl,100);pl.powers[p]=1;return true;}
  if(pl.powers[p])return false;pl.powers[p]=1;return true;},
 touchSpecialThing(sp,toucher){
  const delta=sp.z-toucher.z;if(delta>toucher.height||delta<-8)return;
  const pl=toucher.player;if(!pl||toucher.health<=0)return;let snd='itemup',msg=null;const T=this.str.bind(this);
  switch(I.SPRITES[sp.sprite]){
   case 'ARM1':if(!this.giveArmor(pl,1))return;msg=T('GOTARMOR');break;
   case 'ARM2':if(!this.giveArmor(pl,2))return;msg=T('GOTMEGA');break;
   case 'BON1':pl.health=Math.min(200,pl.health+1);pl.mo.health=pl.health;msg=T('GOTHTHBONUS');break;
   case 'BON2':pl.armorpoints=Math.min(200,pl.armorpoints+1);if(!pl.armortype)pl.armortype=1;msg=T('GOTARMBONUS');break;
   case 'SOUL':pl.health=Math.min(200,pl.health+100);pl.mo.health=pl.health;msg=T('GOTSUPER');snd='getpow';break;
   case 'MEGA':if(!this.commercial)return;pl.health=200;pl.mo.health=200;this.giveArmor(pl,2);msg=T('GOTMSPHERE');snd='getpow';break;
   case 'BKEY':if(!pl.cards[0])msg=T('GOTBLUECARD');this.giveCard(pl,0);break;
   case 'YKEY':if(!pl.cards[1])msg=T('GOTYELWCARD');this.giveCard(pl,1);break;
   case 'RKEY':if(!pl.cards[2])msg=T('GOTREDCARD');this.giveCard(pl,2);break;
   case 'BSKU':if(!pl.cards[3])msg=T('GOTBLUESKUL');this.giveCard(pl,3);break;
   case 'YSKU':if(!pl.cards[4])msg=T('GOTYELWSKUL');this.giveCard(pl,4);break;
   case 'RSKU':if(!pl.cards[5])msg=T('GOTREDSKULL');this.giveCard(pl,5);break;
   case 'STIM':if(!this.giveBody(pl,10))return;msg=T('GOTSTIM');break;
   case 'MEDI':if(!this.giveBody(pl,25))return;msg=pl.health<25?T('GOTMEDINEED'):T('GOTMEDIKIT');break;
   case 'PINV':if(!this.givePower(pl,PW.invulnerability))return;msg=T('GOTINVUL');snd='getpow';break;
   case 'PSTR':if(!this.givePower(pl,PW.strength))return;msg=T('GOTBERSERK');if(pl.readyweapon!==WP.fist)pl.pendingweapon=WP.fist;snd='getpow';break;
   case 'PINS':if(!this.givePower(pl,PW.invisibility))return;msg=T('GOTINVIS');snd='getpow';break;
   case 'SUIT':if(!this.givePower(pl,PW.ironfeet))return;msg=T('GOTSUIT');snd='getpow';break;
   case 'PMAP':if(!this.givePower(pl,PW.allmap))return;msg=T('GOTMAP');snd='getpow';break;
   case 'PVIS':if(!this.givePower(pl,PW.infrared))return;msg=T('GOTVISOR');snd='getpow';break;
   case 'CLIP':if(!this.giveAmmo(pl,0,sp.flags&MF.DROPPED?0:1))return;msg=T('GOTCLIP');break;
   case 'AMMO':if(!this.giveAmmo(pl,0,5))return;msg=T('GOTCLIPBOX');break;
   case 'ROCK':if(!this.giveAmmo(pl,3,1))return;msg=T('GOTROCKET');break;
   case 'BROK':if(!this.giveAmmo(pl,3,5))return;msg=T('GOTROCKBOX');break;
   case 'CELL':if(!this.giveAmmo(pl,2,1))return;msg=T('GOTCELL');break;
   case 'CELP':if(!this.giveAmmo(pl,2,5))return;msg=T('GOTCELLBOX');break;
   case 'SHEL':if(!this.giveAmmo(pl,1,1))return;msg=T('GOTSHELLS');break;
   case 'SBOX':if(!this.giveAmmo(pl,1,5))return;msg=T('GOTSHELLBOX');break;
   case 'BPAK':if(!pl.backpack){for(let i=0;i<4;i++)pl.maxammo[i]*=2;pl.backpack=true;}for(let i=0;i<4;i++)this.giveAmmo(pl,i,1);msg=T('GOTBACKPACK');break;
   case 'BFUG':if(!this.giveWeapon(pl,WP.bfg,false))return;msg=T('GOTBFG9000');snd='wpnup';break;
   case 'MGUN':if(!this.giveWeapon(pl,WP.chaingun,sp.flags&MF.DROPPED))return;msg=T('GOTCHAINGUN');snd='wpnup';break;
   case 'CSAW':if(!this.giveWeapon(pl,WP.chainsaw,false))return;msg=T('GOTCHAINSAW');snd='wpnup';break;
   case 'LAUN':if(!this.giveWeapon(pl,WP.missile,false))return;msg=T('GOTLAUNCHER');snd='wpnup';break;
   case 'PLAS':if(!this.giveWeapon(pl,WP.plasma,false))return;msg=T('GOTPLASMA');snd='wpnup';break;
   case 'SHOT':if(!this.giveWeapon(pl,WP.shotgun,sp.flags&MF.DROPPED))return;msg=T('GOTSHOTGUN');snd='wpnup';break;
   case 'SGN2':if(!this.giveWeapon(pl,WP.supershotgun,sp.flags&MF.DROPPED))return;msg=T('GOTSHOTGUN2');snd='wpnup';break;
   default:return;}
  if(msg)pl.message=msg;if(sp.flags&MF.COUNTITEM)pl.itemcount++;
  this.removeMobj(sp);pl.bonuscount+=BONUSADD;if(snd==='wpnup')pl.grinTic=this.gametic;this.sound(null,snd);},
});
Game.prototype.actions=A;
Object.assign(exports,{A,W,WP,PW,WEAPONTOP,WEAPONBOTTOM,NODIR});
