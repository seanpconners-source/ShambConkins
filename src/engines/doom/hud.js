// Doom's status bar (ammo, health, arms, face, armor, keys, ammo table), the face state machine (ST_updateFaceWidget)
// and the HUD message line. The face is the player's own character in ShambConkins: hud.faceIndex picks the expression
// and doom.js draws that portrait over the face slot (the WAD's STF* faces are the fallback).
const {pointToAngle2,ANG45,ANG180}=require("src/engines/doom/play.js");
const FACESTRIDE=8,TURNOFF=3,OUCHOFF=5,EVILOFF=6,RAMPAGEOFF=7,GODFACE=40,DEADFACE=41,MUCHPAIN=20;
const faceLump=i=>{if(i===GODFACE)return 'STFGOD0';if(i===DEADFACE)return 'STFDEAD0';const p=Math.floor(i/8),k=i%8;return k<3?`STFST${p}${k}`:k===3?`STFTR${p}0`:k===4?`STFTL${p}0`:k===5?`STFOUCH${p}`:k===6?`STFEVL${p}`:`STFKILL${p}`;};
// what each face index means, for the portrait version: mood + pose
function faceInfo(i){if(i===GODFACE)return {pain:0,kind:'god'};if(i===DEADFACE)return {pain:4,kind:'dead'};const pain=Math.floor(i/8),k=i%8;
 return {pain,kind:['straight','left','right','turnright','turnleft','ouch','grin','rampage'][k]};}

class Hud{
 constructor(v,game){this.v=v;this.game=game;this.reset();}
 reset(){this.priority=0;this.facecount=0;this.faceindex=0;this.oldhealth=-1;this.lastattackdown=-1;this.oldweapons=null;this.msg=null;this.msgTics=0;this.lastMsg=null;}
 painOffset(pl){const h=Math.min(100,pl.health);return FACESTRIDE*Math.floor(((100-h)*5)/101);}
 // ST_Ticker
 tick(pl){
  const g=this.game,po=this.painOffset(pl),rnd=g.M_Random();if(this.oldhealth<0)this.oldhealth=pl.health;if(!this.oldweapons)this.oldweapons=pl.weaponowned.slice();
  if(this.priority<10&&!pl.health){this.priority=9;this.faceindex=DEADFACE;this.facecount=1;}
  if(this.priority<9&&pl.bonuscount){let grin=false;for(let i=0;i<9;i++)if(this.oldweapons[i]!==pl.weaponowned[i]){grin=true;this.oldweapons[i]=pl.weaponowned[i];}
   if(grin){this.priority=8;this.facecount=2*35;this.faceindex=po+EVILOFF;}}
  if(this.priority<8&&pl.damagecount&&pl.attacker&&pl.attacker!==pl.mo){this.priority=7;
   // (vanilla tests the health change the wrong way round, so its ouch face almost never shows; this is the intended test)
   if(this.oldhealth-pl.health>MUCHPAIN){this.facecount=35;this.faceindex=po+OUCHOFF;}
   else{const bad=pointToAngle2(pl.mo.x,pl.mo.y,pl.attacker.x,pl.attacker.y);let diff,right;
    if(bad>pl.mo.angle){diff=bad-pl.mo.angle;right=diff>ANG180;}else{diff=pl.mo.angle-bad;right=diff<=ANG180;}
    this.facecount=35;this.faceindex=po;if(diff<ANG45)this.faceindex+=RAMPAGEOFF;else this.faceindex+=right?TURNOFF:TURNOFF+1;}}
  if(this.priority<7&&pl.damagecount){if(this.oldhealth-pl.health>MUCHPAIN){this.priority=7;this.facecount=35;this.faceindex=po+OUCHOFF;}else{this.priority=6;this.facecount=35;this.faceindex=po+RAMPAGEOFF;}}
  if(this.priority<6){if(pl.attackdown){if(this.lastattackdown===-1)this.lastattackdown=2*35;else if(!--this.lastattackdown){this.priority=5;this.faceindex=po+RAMPAGEOFF;this.facecount=1;this.lastattackdown=1;}}else this.lastattackdown=-1;}
  if(this.priority<5&&(pl.cheats&2||pl.powers[0])){this.priority=4;this.faceindex=GODFACE;this.facecount=1;}
  if(!this.facecount){this.faceindex=this.painOffset(pl)+(rnd%3);this.facecount=17;this.priority=0;}
  this.facecount--;this.oldhealth=pl.health;
  // HUD message (HU_MSGTIMEOUT 4 seconds)
  if(pl.message){this.msg=pl.message;this.msgTics=4*35;pl.message=null;}
  if(this.msgTics&&!--this.msgTics)this.msg=null;}
 // number right-aligned at x (vanilla STlib_drawNum)
 num(n,x,y,font,digits=3){const v=this.v,w=v.width(font+'0');n=Math.max(-99,Math.min(10**digits-1,Math.floor(n)));const neg=n<0;n=Math.abs(n);
  if(!n){v.patch(font+'0',x-w,y);return;}let i=0;while(n&&i<digits){x-=w;v.patch(font+(n%10),x,y);n=Math.floor(n/10);i++;}if(neg&&font==='STTNUM')v.patch('STTMINUS',x-8,y);}
 // draw the whole bar; returns the face slot (virtual coords) for the portrait overlay
 drawBar(pl){
  const v=this.v,r=v.r,g=this.game,s=v.s,y0=r.H-32*s;
  v.flatFill(g.commercial?'GRNROCK':'FLOOR7_2',0,y0,r.W,r.H);
  v.patch('STBAR',0,168);v.patch('STARMS',104,168);
  const wi=require("src/engines/doom/info.js").WEAPONS[pl.readyweapon];if(wi&&wi.ammo>=0)this.num(pl.ammo[wi.ammo],44,171,'STTNUM');
  this.num(pl.health,90,171,'STTNUM');v.patch('STTPRCNT',90,171);
  for(let i=0;i<6;i++){const owned=pl.weaponowned[i+1];v.patch((owned?'STYSNUM':'STGNUM')+(i+2),111+(i%3)*12,172+Math.floor(i/3)*10);}
  this.num(pl.armorpoints,221,171,'STTNUM');v.patch('STTPRCNT',221,171);
  for(let i=0;i<3;i++){const k=pl.cards[i+3]?i+3:pl.cards[i]?i:-1;if(k>=0)v.patch('STKEYS'+k,239,171+i*10);}
  const AY=[173,179,191,185];for(let i=0;i<4;i++){this.num(pl.ammo[i],288,AY[i],'STYSNUM');this.num(pl.maxammo[i],314,AY[i],'STYSNUM');}
  if(!this.portrait)v.patch(faceLump(this.faceindex),143,168);
  return {x:143,y:168,w:34,h:32};}
 drawMessage(){if(!this.msg)return;const v=this.v;v.text(this.msg,Math.ceil(-v.ox/v.s)+2,2,{right:9999});}
}
Object.assign(exports,{Hud,faceLump,faceInfo,GODFACE,DEADFACE});
