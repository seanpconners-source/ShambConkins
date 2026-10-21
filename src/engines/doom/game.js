// Doom game flow: new game / level setup (things by skill, player start), the player (movement, view bob, death,
// weapon switching, powerups), the 35 Hz ticker, exits and intermission stats, next-map rules for both games.
const I=require("src/engines/doom/info.js");
const P=require("src/engines/doom/play.js");
require("src/engines/doom/actions.js");require("src/engines/doom/spec.js");
const {loadLevel}=require("src/engines/doom/level.js");
const {STRINGS,PARS,CPARS}=require("src/engines/doom/strings.js");
const {WP,PW}=require("src/engines/doom/actions.js");
const {Game,MF,MT,ANG90,VIEWHEIGHT,MAXBOB,fsin,fcos,pointToAngle2}=P;
const S=I.STATE;

function newPlayer(){return {mo:null,playerstate:'reborn',cmd:{forwardmove:0,sidemove:0,angleturn:0,buttons:0},viewz:0,viewheight:VIEWHEIGHT,deltaviewheight:0,bob:0,
 health:100,armorpoints:0,armortype:0,powers:[0,0,0,0,0,0],cards:[false,false,false,false,false,false],backpack:false,weaponowned:[true,true,false,false,false,false,false,false,false],
 ammo:[50,0,0,0],maxammo:I.MAXAMMO.slice(),readyweapon:WP.pistol,pendingweapon:WP.pistol,attackdown:false,usedown:false,cheats:0,refire:0,
 killcount:0,itemcount:0,secretcount:0,message:null,damagecount:0,bonuscount:0,attacker:null,extralight:0,fixedcolormap:0,
 psprites:[{state:null,tics:0,sx:0,sy:0},{state:null,tics:0,sx:0,sy:0}],didsecret:false};}

Object.assign(Game.prototype,{
 str(k){return this.strings?.[k]??STRINGS[k]??k;},
 mapLump(ep,map){return this.commercial?'MAP'+String(map).padStart(2,'0'):`E${ep}M${map}`;},
 levelName(ep=this.gameepisode,map=this.gamemap){return this.commercial?this.str('HUSTR_'+map):this.str(`HUSTR_E${ep}M${map}`);},
 episodes(){if(this.commercial)return 1;return this.wad.has('E4M1')?4:this.wad.has('E3M1')?3:this.wad.has('E2M1')?2:1;},
 // G_InitNew: skill 0 (I'm too young to die) .. 4 (Nightmare!)
 initNew(skill,ep,map,keepPlayer){
  this.skill=skill;this.gameepisode=ep;this.gamemap=map;this.respawnmonsters=skill===4;this.fastparm=skill===4;
  if(!this.baseTics)this.baseTics=this.states.map(s=>s.tics);
  // nightmare: faster monsters and missiles
  for(let i=S.SARG_RUN1;i<=S.SARG_PAIN2;i++)this.states[i].tics=skill===4?this.baseTics[i]>>1:this.baseTics[i];
  const fast={[MT.BRUISERSHOT]:[15,20],[MT.HEADSHOT]:[10,20],[MT.TROOPSHOT]:[10,20]};for(const [t,[n,f]] of Object.entries(fast))this.mobjinfo[t].speed=skill===4?f:n;
  if(!keepPlayer)this.players=[newPlayer()];
  this.loadMap();},
 loadMap(){
  const lv=loadLevel(this.wad,this.gfx,this.mapLump(this.gameepisode,this.gamemap));this.lv=lv;this.thinkers=[];this.leveltime=0;this.exiting=null;this.events.length=0;this.sounds.length=0;
  this.totalkills=this.totalitems=0;this.braintargets=[];this.spawnSpecials();
  for(const p of this.players){p.killcount=p.itemcount=p.secretcount=0;p.mo=null;}
  this.playerstarts=[];
  for(const mt of lv.things)this.spawnMapThing(mt);
  const pl=this.players[0];if(!pl.mo&&this.playerstarts[0])this.spawnPlayer(this.playerstarts[0]);
  this.sky=this.commercial?(this.gamemap<12?'SKY1':this.gamemap<21?'SKY2':'SKY3'):'SKY'+this.gameepisode;
  this.levelStart=this.gametic;},
 spawnMapThing(mt){
  if(mt.type===11)return;
  if(mt.type>=1&&mt.type<=4){if(mt.type===1)this.playerstarts[0]=mt;return;}
  if(mt.options&16)return;// multiplayer only
  const bit=this.skill===0?1:this.skill===4?4:1<<(this.skill-1);if(!(mt.options&bit))return;
  const type=I.BY_DOOMEDNUM.get(mt.type);if(type===undefined)return;
  const info=this.mobjinfo[type];if(this.nomonsters&&(type===MT.SKULL||info.flags&MF.COUNTKILL))return;
  const mo=this.spawnMobj(mt.x,mt.y,info.flags&MF.SPAWNCEILING?P.ONCEILINGZ:P.ONFLOORZ,type);mo.spawnpoint=mt;
  if(mo.tics>0)mo.tics=1+this.P_Random()%mo.tics;
  if(mo.flags&MF.COUNTKILL)this.totalkills++;if(mo.flags&MF.COUNTITEM)this.totalitems++;
  mo.angle=(P.ANG45*Math.floor(mt.angle/45))>>>0;if(mt.options&8)mo.flags|=MF.AMBUSH;
  this.events.push({kind:'spawn',mo,map:true});},
 spawnPlayer(mt){
  let p=this.players[0];if(p.playerstate==='reborn'){const keep={killcount:p.killcount,itemcount:p.itemcount,secretcount:p.secretcount};p=this.players[0]=Object.assign(newPlayer(),keep);p.playerstate='live';}
  const mo=this.spawnMobj(mt.x,mt.y,P.ONFLOORZ,MT.PLAYER);mo.angle=(P.ANG45*Math.floor(mt.angle/45))>>>0;mo.player=p;mo.health=p.health;
  p.mo=mo;p.playerstate='live';p.refire=0;p.message=null;p.damagecount=0;p.bonuscount=0;p.extralight=0;p.fixedcolormap=0;p.viewheight=VIEWHEIGHT;p.viewz=mo.z+VIEWHEIGHT;
  this.setupPsprites(p);},
 // pistol start after a death (single player: the level restarts)
 rebornLevel(){this.players[0]=newPlayer();this.loadMap();},
 exitLevel(){this.exiting=this.exiting||'normal';},
 secretExitLevel(){this.exiting=this.commercial&&!this.wad.has('MAP31')?'normal':'secret';},
 // ---- the player (P_PlayerThink) ----
 playerThink(pl){
  const mo=pl.mo,cmd=pl.cmd;
  if(pl.cheats&1)mo.flags|=MF.NOCLIP;else mo.flags&=~MF.NOCLIP;
  if(mo.flags&MF.JUSTATTACKED){cmd.angleturn=0;cmd.forwardmove=0xc800/512;cmd.sidemove=0;mo.flags&=~MF.JUSTATTACKED;}
  if(pl.playerstate==='dead'){this.deathThink(pl);return;}
  if(mo.reactiontime)mo.reactiontime--;else this.movePlayer(pl);
  this.calcHeight(pl);
  if(mo.subsector.sector.special)this.playerInSpecialSector(pl);
  if(cmd.buttons&4){let nw=(cmd.buttons>>3)&7;if(cmd.weapon!==undefined)nw=cmd.weapon;
   if(nw===WP.fist&&pl.weaponowned[WP.chainsaw]&&!(pl.readyweapon===WP.chainsaw&&pl.powers[PW.strength]))nw=WP.chainsaw;
   if(this.commercial&&nw===WP.shotgun&&pl.weaponowned[WP.supershotgun]&&pl.readyweapon!==WP.supershotgun&&cmd.weapon===undefined)nw=WP.supershotgun;
   if(pl.weaponowned[nw]&&nw!==pl.readyweapon&&((nw!==WP.plasma&&nw!==WP.bfg)||this.gamemode!=='shareware'))pl.pendingweapon=nw;}
  if(cmd.buttons&2){if(!pl.usedown){this.useLines(pl);pl.usedown=true;}}else pl.usedown=false;
  this.movePsprites(pl);
  if(pl.powers[PW.strength])pl.powers[PW.strength]++;
  if(pl.powers[PW.invulnerability])pl.powers[PW.invulnerability]--;
  if(pl.powers[PW.invisibility]&&!--pl.powers[PW.invisibility])mo.flags&=~MF.SHADOW;
  if(pl.powers[PW.infrared])pl.powers[PW.infrared]--;if(pl.powers[PW.ironfeet])pl.powers[PW.ironfeet]--;
  if(pl.damagecount)pl.damagecount--;if(pl.bonuscount)pl.bonuscount--;
  const inv=pl.powers[PW.invulnerability],ir=pl.powers[PW.infrared];
  pl.fixedcolormap=inv?(inv>4*32||inv&8?32:0):ir?(ir>4*32||ir&8?1:0):0;},
 thrust(pl,angle,move){pl.mo.momx+=move*fcos(angle);pl.mo.momy+=move*fsin(angle);},
 movePlayer(pl){const cmd=pl.cmd,mo=pl.mo;mo.angle=(mo.angle+(cmd.angleturn<<16))>>>0;this.onground=mo.z<=mo.floorz;
  if(cmd.forwardmove&&this.onground)this.thrust(pl,mo.angle,cmd.forwardmove*2048/65536);
  if(cmd.sidemove&&this.onground)this.thrust(pl,(mo.angle-ANG90)>>>0,cmd.sidemove*2048/65536);
  if((cmd.forwardmove||cmd.sidemove)&&mo.state===this.states[S.PLAY])this.setMobjState(mo,S.PLAY_RUN1);},
 calcHeight(pl){const mo=pl.mo;
  pl.bob=Math.min(MAXBOB,(mo.momx*mo.momx+mo.momy*mo.momy)/4);
  if(pl.cheats&4||!this.onground){pl.viewz=mo.z+VIEWHEIGHT;if(pl.viewz>mo.ceilingz-4)pl.viewz=mo.ceilingz-4;pl.viewz=mo.z+pl.viewheight;return;}
  const a=(((8192/20*this.leveltime)|0)&8191)<<19>>>0,bob=pl.bob/2*fsin(a);
  if(pl.playerstate==='live'){pl.viewheight+=pl.deltaviewheight;if(pl.viewheight>VIEWHEIGHT){pl.viewheight=VIEWHEIGHT;pl.deltaviewheight=0;}
   if(pl.viewheight<VIEWHEIGHT/2){pl.viewheight=VIEWHEIGHT/2;if(pl.deltaviewheight<=0)pl.deltaviewheight=1/65536;}
   if(pl.deltaviewheight){pl.deltaviewheight+=1/4;if(!pl.deltaviewheight)pl.deltaviewheight=1/65536;}}
  pl.viewz=mo.z+pl.viewheight+bob;if(pl.viewz>mo.ceilingz-4)pl.viewz=mo.ceilingz-4;},
 deathThink(pl){const mo=pl.mo;this.movePsprites(pl);
  if(pl.viewheight>6)pl.viewheight-=1;if(pl.viewheight<6)pl.viewheight=6;pl.deltaviewheight=0;this.onground=mo.z<=mo.floorz;this.calcHeight(pl);
  const att=pl.attacker;
  if(att&&att!==mo){const ang=pointToAngle2(mo.x,mo.y,att.x,att.y),d=(ang-mo.angle)>>>0,A5=ANG90/18;
   if(d<A5||d>(-A5>>>0)){mo.angle=ang;if(pl.damagecount)pl.damagecount--;}else if(d<0x80000000)mo.angle=(mo.angle+A5)>>>0;else mo.angle=(mo.angle-A5)>>>0;}
  else if(pl.damagecount)pl.damagecount--;
  if(pl.cmd.buttons&2)pl.playerstate='reborn';},
 // ---- one game tic ----
 tick(){
  const pl=this.players[0];
  if(pl.mo)this.playerThink(pl);
  this.runThinkers();this.updateSpecials();
  this.leveltime++;this.gametic++;},
 // stats for the intermission (WI) and the next map number
 levelStats(){
  const pl=this.players[0],ep=this.gameepisode,map=this.gamemap,secret=this.exiting==='secret';
  let next;
  if(this.commercial){next=secret?(map===15?31:map===31?32:map+1):(map===31||map===32?16:map+1);}
  else{if(secret)next=9;else if(map===9)next=[4,6,7,3][ep-1];else next=map+1;}
  const par=this.pars?.[this.mapLump(ep,map)]??(this.commercial?CPARS[map-1]:PARS['E'+ep]?.[map-1])??0;
  return {episode:ep,map,next,secret,didsecret:pl.didsecret||secret,kills:pl.killcount,totalkills:this.totalkills,items:pl.itemcount,totalitems:this.totalitems,
   secrets:pl.secretcount,totalsecret:this.totalsecret,time:Math.floor(this.leveltime/35),par,
   // after the last map of an episode / special Doom II maps the text finale plays
   finale:this.commercial?((map===6||map===11||map===20||map===30)&&!secret?map:(map===15||map===31)&&secret?map:0):(map===8?ep:0),
   endOfGame:this.commercial?map===30:map===8};},
 finishLevel(){const pl=this.players[0];pl.powers=[0,0,0,0,0,0];pl.cards=[false,false,false,false,false,false];if(pl.mo)pl.mo.flags&=~MF.SHADOW;pl.extralight=0;pl.fixedcolormap=0;pl.damagecount=0;pl.bonuscount=0;},
 nextLevel(stats){this.finishLevel();if(stats.secret)this.players[0].didsecret=true;this.gamemap=stats.next;this.loadMap();},
 // classic cheats
 cheat(code){const pl=this.players[0];if(!pl?.mo)return;
  if(code==='iddqd'){pl.cheats^=2;if(pl.cheats&2){pl.mo.health=100;pl.health=100;}pl.message=this.str(pl.cheats&2?'STSTR_DQDON':'STSTR_DQDOFF');}
  else if(code==='idkfa'||code==='idfa'){pl.armorpoints=200;pl.armortype=2;pl.weaponowned=pl.weaponowned.map((_,i)=>i!==WP.supershotgun||this.commercial);if(!pl.backpack){pl.maxammo=pl.maxammo.map(m=>m*2);pl.backpack=true;}pl.ammo=pl.maxammo.slice();if(code==='idkfa'){pl.cards=pl.cards.map(()=>true);pl.message=this.str('STSTR_KFAADDED');}else pl.message=this.str('STSTR_FAADDED');}
  else if(code==='idclip'||code==='idspispopd'){pl.cheats^=1;pl.message=this.str(pl.cheats&1?'STSTR_NCON':'STSTR_NCOFF');}
  else if(code==='idchoppers'){pl.weaponowned[WP.chainsaw]=true;pl.powers[PW.invulnerability]=1;pl.message=this.str('STSTR_CHOPPERS');}},
});
Object.assign(exports,{Game,newPlayer,WP,PW});
