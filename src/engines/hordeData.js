// Data tables for the Horde engine (weapons, passives, enemies, modes, schedule). Pure data + tiny helpers: no DOM here.
const {clamp}=require("src/utils.js");

// ---------- weapons ----------
// lv[i] = [card text, modifier] for level i+2. Modifier keys: plain = add, "xxx x" suffix x = multiply (dmgx -> dmg*=).
// evo: {set,mul,add} applied on top of the max-level stats. pass = passive needed for the evolution chest.
const WEAPONS={
 boomstick:{name:'Boomstick',cab:'Boomstick',icon:'boomstick',kind:'shot',pass:'might',desc:'Blasts a spread of shells at the nearest ghoul.',
  base:{dmg:6,cd:1.3,count:3,spread:.5,speed:560,life:.3,pierce:0,kb:170,size:3.4},
  lv:[['+1 shell',{count:1}],['+25% damage',{dmgx:1.25}],['+1 shell',{count:1}],['Reloads 15% faster',{cdx:.85}],['+1 shell, pierces 1',{count:1,pierce:1}],['+30% damage',{dmgx:1.3}],['+2 shells',{count:2}]],
  evo:{name:'Hail to the King',text:'Twelve piercing shells in a huge cone.',set:{count:12,spread:.95,pierce:3,life:.42},mul:{dmg:1.7,cd:.8}}},
 chainsaw:{name:'Chainsaw Hand',cab:'Chainsaw Hand',icon:'chainsaw',kind:'slash',pass:'area',desc:'Rips a wide arc through whatever is closest.',
  base:{dmg:10,cd:1.1,range:92,arc:1.75,kb:110,both:0},
  lv:[['+20% reach',{rangex:1.2}],['+30% damage',{dmgx:1.3}],['Swings 15% faster',{cdx:.85}],['Also slashes behind you',{both:1}],['+25% damage',{dmgx:1.25}],['+20% reach',{rangex:1.2}],['+30% damage, faster',{dmgx:1.3,cdx:.85}]],
  evo:{name:'Groovy Chainsaw',text:'A full circle of buzzing carnage.',set:{arc:6.4,both:0},mul:{dmg:1.8,range:1.25,cd:.75}}},
 necro:{name:'Necronomicon',cab:'Necronomicon',icon:'necro',kind:'orbit',pass:'duration',desc:'Cursed pages orbit you and shred the dead.',
  base:{dmg:8,count:1,radius:82,spd:2.6,dur:2.8,gap:2.2,hitcd:.5,size:12,kb:70},
  lv:[['+1 tome',{count:1}],['+25% damage',{dmgx:1.25}],['Wider and faster orbit',{radius:14,spd:.4}],['+1 tome',{count:1}],['Lasts 30% longer',{durx:1.3}],['+1 tome',{count:1}],['+30% damage, shorter gap',{dmgx:1.3,gapx:.75}]],
  evo:{name:'Book of the Dead',text:'Six tomes orbit forever.',set:{count:6,gap:0},mul:{dmg:1.5}}},
 barrel:{name:'Trioxin Barrel',cab:'Kerosene Drum',icon:'barrel',kind:'pool',pass:'armor',desc:'Lobs a barrel that leaves a burning green pool.',
  base:{dmg:6,tick:.45,count:1,radius:52,dur:3,cd:3.2,range:230},
  lv:[['Bigger fire pool',{radiusx:1.2}],['+30% damage',{dmgx:1.3}],['+1 barrel',{count:1}],['Burns 30% longer',{durx:1.3}],['+30% damage',{dmgx:1.3}],['Bigger fire pool',{radiusx:1.2}],['+1 barrel',{count:1}]],
  evo:{name:'245 Meltdown',cabName:'Cabin Inferno',text:'Huge pools that burn much longer.',set:{},mul:{radius:1.5,dur:1.6,dmg:1.8},add:{count:1}}},
 goo:{name:'Tarman Goo',cab:'Deadite Ichor',icon:'goo',kind:'aura',pass:'maxhp',desc:'A sticky aura that slows and burns the dead.',
  base:{dmg:4,tick:.6,radius:70,slow:.22,heal:0},
  lv:[['Bigger puddle',{radiusx:1.25}],['+35% damage',{dmgx:1.35}],['Slows 32%',{slow:.1}],['Bigger puddle',{radiusx:1.2}],['+35% damage',{dmgx:1.35}],['Ticks faster',{tickx:.75}],['Slows 47%, +30% dmg',{slow:.15,dmgx:1.3}]],
  evo:{name:'Tarman’s Embrace',cabName:'Ichor Tide',text:'Wider, nastier, and it heals you.',set:{heal:.8},mul:{radius:1.4,dmg:2}}},
 crowbar:{name:'Crowbar',cab:'Crowbar',icon:'crowbar',kind:'boomerang',pass:'luck',desc:'A thrown crowbar that flies out and comes back.',
  base:{dmg:11,cd:1.7,count:1,range:230,speed:380,size:12,kb:130,all:0},
  lv:[['+25% damage',{dmgx:1.25}],['Flies farther',{rangex:1.2}],['+1 crowbar',{count:1}],['Faster and bigger',{speedx:1.2,sizex:1.2}],['+30% damage',{dmgx:1.3}],['+1 crowbar',{count:1}],['Throws 20% faster',{cdx:.8}]],
  evo:{name:'Wrecking Crew',text:'Huge spinning crowbars that hit everything.',set:{},mul:{dmg:1.9,size:1.7,range:1.2},add:{count:1}}},
 nailgun:{name:'Nail Gun',cab:'Nail Gun',icon:'nailgun',kind:'rapid',pass:'pspeed',desc:'Spits nails at the nearest ghoul, fast.',
  base:{dmg:3,cd:.3,count:1,speed:720,life:.7,pierce:0,spread:.07,kb:40},
  lv:[['Fires 20% faster',{cdx:.8}],['+40% damage',{dmgx:1.4}],['Twin nails',{count:1}],['Fires 20% faster',{cdx:.8}],['Nails pierce 1',{pierce:1}],['+40% damage',{dmgx:1.4}],['Fires 25% faster',{cdx:.75}]],
  evo:{name:'Nail Storm',text:'A relentless piercing hailstorm.',set:{pierce:3},mul:{cd:.5,dmg:1.5},add:{count:2}}},
 lantern:{name:'Hurricane Lantern',cab:'Hurricane Lantern',icon:'lantern',kind:'pulse',pass:'cooldown',desc:'Flashes a pulse of light that shoves the dead back.',
  base:{dmg:9,cd:3.4,radius:140,kb:280,burn:0},
  lv:[['+20% reach',{radiusx:1.2}],['+30% damage',{dmgx:1.3}],['Pulses 15% faster',{cdx:.85}],['+20% reach',{radiusx:1.2}],['+30% damage',{dmgx:1.3}],['Pulses 15% faster',{cdx:.85}],['+25% reach and damage',{radiusx:1.25,dmgx:1.25}]],
  evo:{name:'Dawn’s Early Light',text:'A blinding sunburst that sets the dead alight.',set:{burn:1},mul:{dmg:2.2,radius:1.4,cd:.5}}},
 grenade:{name:'Holy Hand Grenade',cab:'Holy Hand Grenade',icon:'grenade',kind:'grenade',pass:'growth',desc:'Lobs a grenade into the thickest crowd.',
  base:{dmg:38,cd:3.6,count:1,radius:82,fuse:.75,range:250,split:0},
  lv:[['Bigger blast',{radiusx:1.2}],['+30% damage',{dmgx:1.3}],['Throws 15% faster',{cdx:.85}],['+1 grenade',{count:1}],['Bigger blast',{radiusx:1.2}],['+30% damage',{dmgx:1.3}],['+1 grenade',{count:1}]],
  evo:{name:'Hand Grenade of Antioch',text:'Splits into three more blasts.',set:{split:1},mul:{dmg:2.2,radius:1.3}}},
 medics:{name:'Send More Paramedics',cab:'Fake Shemps',icon:'medics',kind:'summon',pass:'revive',desc:'Paramedics sprint at the nearest ghouls.',
  base:{dmg:7,cd:2.7,count:1,speed:210,life:3.2,pierce:1,kb:70,shock:0},
  lv:[['+1 paramedic',{count:1}],['+30% damage',{dmgx:1.3}],['Dispatch 15% faster',{cdx:.85}],['+1 paramedic',{count:1}],['Hits 1 more ghoul',{pierce:1}],['+30% damage',{dmgx:1.3}],['+1 paramedic',{count:1}]],
  evo:{name:'Code Blue',cabName:'Shemp Stampede',text:'More medics, with defibrillator shocks.',set:{shock:1},mul:{dmg:1.6,cd:.75},add:{count:3}}},
 vinyl:{name:'Vinyl Record',cab:'Vinyl Record',icon:'vinyl',kind:'bounce',pass:'greed',desc:'A flung record that ricochets between the dead.',
  base:{dmg:7,cd:2.4,count:1,speed:340,life:3,bounces:3,size:10,kb:90,gold:0},
  lv:[['+1 bounce',{bounces:1}],['+30% damage',{dmgx:1.3}],['+1 record',{count:1}],['+2 bounces',{bounces:2}],['+30% damage',{dmgx:1.3}],['Throws 15% faster',{cdx:.85}],['+1 record, +1 bounce',{count:1,bounces:1}]],
  evo:{name:'Gold Record',text:'Bounces forever and spits coins.',set:{gold:1,bounces:14},mul:{dmg:1.7},add:{count:2}}},
 bolt:{name:'Reanimation Bolt',cab:'Reanimation Bolt',icon:'bolt',kind:'strike',pass:'magnet',desc:'Lightning strikes random ghouls on screen.',
  base:{dmg:16,cd:2,count:1,radius:38,range:360,chain:0},
  lv:[['+1 bolt',{count:1}],['+30% damage',{dmgx:1.3}],['Strikes 15% faster',{cdx:.85}],['+1 bolt',{count:1}],['Bigger blast',{radiusx:1.3}],['+30% damage',{dmgx:1.3}],['+1 bolt',{count:1}]],
  evo:{name:'Storm of the Dead',text:'Chain lightning and a swarm of bolts.',set:{chain:1},mul:{dmg:1.6,cd:.8},add:{count:3}}}
};
const WEAPON_IDS=Object.keys(WEAPONS);
const STARTERS=['boomstick','chainsaw','necro','crowbar','nailgun','lantern','vinyl'];
const MAX_LEVEL=8;

function applyMod(st,mod){for(const k in mod){if(k.length>2&&k.endsWith('x')&&k!=='ax'){const b=k.slice(0,-1);st[b]=(st[b]||0)*mod[k];}else st[k]=(st[k]||0)+mod[k];}}
function weaponStats(id,level,evolved){
 const d=WEAPONS[id],st={...d.base};
 for(let i=0;i<level-1;i++)applyMod(st,d.lv[i][1]);
 if(evolved){const e=d.evo;if(e.set)Object.assign(st,e.set);if(e.mul)for(const k in e.mul)st[k]*=e.mul[k];if(e.add)for(const k in e.add)st[k]+=e.add[k];}
 return st;
}
function weaponText(id,level){const d=WEAPONS[id];return level<=1?d.desc:d.lv[level-2][0];}

// ---------- passives ----------
const PASSIVES={
 might:{name:'Adrenaline Shot',icon:'might',max:5,text:'+12% damage',eff:(l,s)=>{s.might+=.12*l;}},
 armor:{name:'Hazmat Vest',icon:'armor',max:5,text:'Take 1 less damage per hit',eff:(l,s)=>{s.armor+=l;}},
 maxhp:{name:'Spare Heart',icon:'maxhp',max:5,text:'+15% max health',eff:(l,s)=>{s.maxHp+=.15*l;}},
 recovery:{name:'First-Aid Kit',icon:'recovery',max:5,text:'Heal +0.5 health per second',eff:(l,s)=>{s.regen+=.5*l;}},
 cooldown:{name:'Alarm Clock',icon:'cooldown',max:5,text:'Weapons recharge 8% faster',eff:(l,s)=>{s.cd*=Math.pow(.92,l);}},
 area:{name:'Megaphone',icon:'area',max:5,text:'+10% weapon area',eff:(l,s)=>{s.area+=.1*l;}},
 pspeed:{name:'Greased Barrels',icon:'pspeed',max:5,text:'+12% projectile speed',eff:(l,s)=>{s.pspeed+=.12*l;}},
 duration:{name:'Extra Batteries',icon:'duration',max:5,text:'Effects last 12% longer',eff:(l,s)=>{s.dur+=.12*l;}},
 magnet:{name:'Fridge Magnet',icon:'magnet',max:5,text:'+30% pickup range',eff:(l,s)=>{s.magnet+=.3*l;}},
 luck:{name:'Rabbit’s Foot',icon:'luck',max:5,text:'More crits, drops and card choices',eff:(l,s)=>{s.luck+=l;}},
 growth:{name:'Brain Jar',icon:'growth',max:5,text:'+8% experience',eff:(l,s)=>{s.growth+=.08*l;}},
 greed:{name:'Piggy Bank',icon:'greed',max:5,text:'+12% coins and score',eff:(l,s)=>{s.greed+=.12*l;}},
 revive:{name:'Defibrillator',icon:'revive',max:2,text:'Come back to life once more',eff:(l,s)=>{s.revive+=l;}}
};
const PASSIVE_IDS=Object.keys(PASSIVES);
function freshStats(){return {might:1,armor:0,maxHp:1,regen:0,cd:1,area:1,pspeed:1,dur:1,magnet:1,luck:0,growth:1,greed:1,revive:0};}
function calcStats(passives){const s=freshStats();for(const id in passives)PASSIVES[id].eff(passives[id],s);return s;}

// ---------- enemies ----------
// ai: chase runner bat spitter barrel charger ghost tarman colonel banshee mama titan hunger
const ENEMIES={
 shambler:{n:'Shambler',cn:'Deadite',r:12,hp:11,spd:44,dmg:6,xp:1,ai:'chase',sz:46},
 runner:{n:'Runner',cn:'Possessed',r:10,hp:6,spd:104,dmg:5,xp:1,ai:'runner',sz:42},
 crawler:{n:'Half-body',cn:'Half-body',r:9,hp:7,spd:58,dmg:5,xp:1,ai:'chase',sz:38},
 bloater:{n:'Bloater',cn:'Bloater',r:21,hp:70,spd:28,dmg:11,xp:5,ai:'chase',sz:72,kb:.5},
 bat:{n:'Bat',cn:'Bat',r:8,hp:3,spd:140,dmg:4,xp:1,ai:'bat',sz:34,fly:1},
 spitter:{n:'Spitter',cn:'Spitter',r:12,hp:16,spd:40,dmg:5,xp:3,ai:'spitter',sz:48},
 barrel:{n:'Barrel zombie',cn:'Barrel deadite',r:14,hp:20,spd:46,dmg:8,xp:3,ai:'barrel',sz:54},
 charger:{n:'Linebacker',cn:'Linebacker',r:15,hp:42,spd:50,dmg:12,xp:4,ai:'charger',sz:58},
 ghost:{n:'Ghost',cn:'Wraith',r:12,hp:24,spd:62,dmg:7,xp:4,ai:'ghost',sz:52,fly:1,phase:1},
 armored:{n:'Riot zombie',cn:'Armored deadite',r:15,hp:60,spd:36,dmg:10,xp:5,ai:'chase',sz:56,armor:3},
 sergeant:{n:'Sergeant',cn:'Sergeant',r:17,hp:240,spd:50,dmg:12,xp:20,ai:'chase',sz:72,armor:2,elite:1,aura:'haste',kb:.4},
 nurse:{n:'Zombie Nurse',cn:'Nurse deadite',r:16,hp:190,spd:44,dmg:10,xp:20,ai:'chase',sz:68,elite:1,aura:'heal',kb:.4},
 tarman:{n:'TARMAN',cn:'HENRIETTA',r:30,hp:800,spd:34,dmg:16,xp:80,ai:'tarman',sz:112,boss:1,kb:.1,line:'BRAAAAINS!'},
 colonel:{n:'THE COLONEL',cn:'THE LUMBERJACK',r:26,hp:900,spd:38,dmg:15,xp:80,ai:'colonel',sz:108,boss:1,armor:3,kb:.1,line:'Hold the line!'},
 banshee:{n:'THE BANSHEE',cn:'THE BANSHEE',r:22,hp:700,spd:54,dmg:13,xp:80,ai:'banshee',sz:100,boss:1,fly:1,phase:1,kb:.1,line:'AAAAAAAH!'},
 mama:{n:'MAMA BLOAT',cn:'MAMA BLOAT',r:36,hp:1300,spd:24,dmg:18,xp:80,ai:'mama',sz:140,boss:1,kb:.05,line:'Burst her!'},
 titan:{n:'THE TRIOXIN TITAN',cn:'THE DARK ONE',r:44,hp:14000,spd:34,dmg:24,xp:0,ai:'titan',sz:170,boss:1,final:1,kb:0,line:'Kill it before dawn!'},
 hunger:{n:'THE HUNGER',cn:'THE EVIL FORCE',r:26,hp:1e9,spd:80,dmg:40,xp:0,ai:'hunger',sz:120,boss:1,fly:1,phase:1,immune:1,kb:0,line:'It cannot be killed. Survive.'}
};
const ENEMY_IDS=Object.keys(ENEMIES);
const MINIS=['tarman','colonel','banshee','mama'];
// natural spawns: [type, fromMinute, weightAtFrom, weightAtMinute8]
const SPAWNS=[['shambler',0,100,55],['crawler',.4,10,24],['runner',.8,8,26],['bat',1.3,3,12],['barrel',1.8,4,12],['spitter',2.2,5,13],['bloater',2.6,3,9],['armored',3.2,4,13],['charger',3.8,4,12],['ghost',4.6,4,13]];

// ---------- modes ----------
const MODES=[
 {id:'short',name:'Short night',label:'3:00',time:180,blurb:'A quick scare. Gentler horde, early boss.',mt:5.2,hp:.72,cap:.7,rate:.8,dmg:.8,xp:2,boss:.4,bossLead:48,hungerLead:20,
  minis:[55,100],elites:[38,80,115],bats:[45],ring:[75],wall:[110],hazard:[90],supply:[60]},
 {id:'full',name:'Full night',label:'8:00',time:480,blurb:'The real thing. Mini-bosses, a final boss, and the Hunger.',mt:8,hp:1,cap:1,rate:1,dmg:1,xp:1,boss:1,bossLead:70,hungerLead:30,
  minis:[90,180,270,360],elites:[40,92,144,196,248,300,352],bats:[62,150,238,330],ring:[125,215,305,385],wall:[165,255,340],hazard:[130,225,320,395],supply:[75,200,330]},
 {id:'dawn',name:'Dawn patrol',label:'12:00',time:720,blurb:'A marathon. The horde never stops growing.',mt:10.5,hp:1.12,cap:1.1,rate:1,dmg:1.08,xp:.8,boss:1.3,bossLead:80,hungerLead:34,
  minis:[100,200,300,400,500,600],elites:[45,100,155,210,265,320,375,430,485,540,595],bats:[70,170,270,370,470,570],ring:[135,235,335,435,535,615],wall:[180,280,380,480,560],hazard:[150,250,350,450,550],supply:[85,230,380,520]}
];

const hpMul=(m,mode)=>(1+.3*m+.028*m*m)*mode.hp;
const capAt=(m,mode)=>Math.round((16+16*m+1.8*m*m)*mode.cap);
const rateAt=(m,mode)=>(1.6+1.1*m)*mode.rate;
function spawnWeights(m,out){let n=0;for(let i=0;i<SPAWNS.length;i++){const s=SPAWNS[i];let w=0;if(m>=s[1]){const f=clamp((m-s[1])/Math.max(.5,8-s[1]),0,1.4);w=s[2]+(s[3]-s[2])*f;}out[i]=w;n+=w;}return n;}
function buildSchedule(mode){
 const ev=[],D=mode.time;
 for(const [key,list] of [['mini',mode.minis],['elite',mode.elites],['bats',mode.bats],['ring',mode.ring],['wall',mode.wall],['hazard',mode.hazard],['supply',mode.supply]])list.forEach((t,k)=>ev.push({t,type:key,k}));
 ev.push({t:D-mode.bossLead,type:'boss',k:0},{t:D-mode.hungerLead,type:'hunger',k:0});
 ev.sort((a,b)=>a.t-b.t);return ev;
}

// drops from destructibles / chests, weights are [gem, coin, chicken, magnet, bomb]
const DROPS=[['gem',30],['coin',34],['chicken',16],['magnet',9],['bomb',8]];
const XP_TIERS=[[1,'#58b8ff'],[5,'#62e08a'],[25,'#ff6a6a'],[100,'#d98cff']];
const xpNeed=lv=>Math.round(5+lv*3.6+lv*lv*.4);


// ---------- procedural art (baked once into offscreen canvases) ----------
const TAU=Math.PI*2,OL='#10150f';
function mk(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c;}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function ell(c,x,y,rx,ry,fill,stroke,rot=0){c.beginPath();c.ellipse(x,y,rx,ry,rot,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function poly(c,pts,fill,stroke){c.beginPath();c.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)c.lineTo(pts[i],pts[i+1]);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function seg(c,x1,y1,x2,y2,w,col){c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function limb(c,x1,y1,x2,y2,w,col){seg(c,x1,y1,x2,y2,w+2.6,OL);seg(c,x1,y1,x2,y2,w,col);}
function eyes(c,x,y,col,gap=5,r=2.4,pup='#101010'){for(const dx of[-gap/2,gap/2]){ell(c,x+dx,y,r,r*1.1,col);ell(c,x+dx+.6,y+.3,r*.45,r*.55,pup);}}
function dots(c,list,col){c.fillStyle=col;for(let i=0;i<list.length;i+=3){c.beginPath();c.arc(list[i],list[i+1],list[i+2],0,TAU);c.fill();}}
function star(c,x,y,r,col){c.fillStyle=col;c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rad=i%2?r*.45:r;c.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad);}c.closePath();c.fill();}

// humanoid in a 48x48 design box (facing right). o: skin shirt pants hair lean k head, torso(c) head(c,f) extra(c,f)
function human(c,f,o){
 const sw=f?1:-1,k=o.k||1;c.save();c.lineJoin='round';c.lineWidth=1.6;c.strokeStyle=OL;
 if(o.lean){c.translate(0,18);c.rotate(o.lean);c.translate(0,-18);}c.scale(k,k);
 c.fillStyle=o.pants;rr(c,-7,6,6,14+sw*2,2);c.fill();c.stroke();rr(c,1,6,6,14-sw*2,2);c.fill();c.stroke();
 c.fillStyle='#1b1b1b';rr(c,-8,18+sw*2,8,3,1.5);c.fill();rr(c,0,18-sw*2,8,3,1.5);c.fill();
 limb(c,-4,-2,-12,5+sw*2,3.4,o.skin);
 c.fillStyle=o.shirt;c.strokeStyle=OL;c.lineWidth=1.6;rr(c,-9,-7,18,16,4);c.fill();c.stroke();
 if(o.torso)o.torso(c,f);
 limb(c,4,-3,17,-8+sw*2,3.6,o.skin);limb(c,4,1,16,-1-sw*2,3.6,o.skin);
 ell(c,2,-14,8.6,8.6,o.skin,OL);
 if(o.hair)o.hair(c,f);
 eyes(c,5.2,-15,o.eye||'#f1edc6',4.6);
 c.fillStyle=o.mouth||'#2a0e0e';ell(c,5.6,-9.6,3,1.6+f*.7,o.mouth||'#2a0e0e');
 if(o.extra)o.extra(c,f);
 c.restore();
}
const blood=(c,l)=>dots(c,l,'#8f1f1f');

const ARTS={
 shambler:(c,f,t)=>human(c,f,{skin:t.skin,shirt:'#5a6f8f',pants:'#3e3a4a',eye:t.eye,
  hair:c=>{c.fillStyle='#2e2a22';c.beginPath();c.arc(1,-17,8,Math.PI*1.05,Math.PI*1.85);c.fill();},
  torso:c=>{blood(c,[-3,0,2,3,4,1.5,-5,5,1.4]);seg(c,-6,-4,-2,8,1,'#2d3b52');}}),
 runner:(c,f,t)=>human(c,f,{skin:t.skin2,shirt:'#8f3b3b',pants:'#2b2b36',lean:.38,k:.92,eye:t.eye,mouth:'#400',
  hair:c=>{for(let i=0;i<4;i++)poly(c,[-5+i*3,-20,-3+i*3,-30+(i%2)*2,-1+i*3,-20],'#e0399a','#10150f');},
  torso:c=>{blood(c,[0,0,2.2,4,5,1.5]);poly(c,[-9,8,-5,12,-1,8],'#8f3b3b');}}),
 spitter:(c,f,t)=>human(c,f,{skin:'#a7b85a',shirt:'#6b7a38',pants:'#35402a',eye:'#e8ff70',mouth:'#10320c',
  hair:null,torso:c=>{},extra:(c,f)=>{ell(c,3,-5,5+f*1.2,6+f*1.2,'#d4e64a',OL);dots(c,[2,-6,1.2,5,-3,1],'#6d7d1a');c.fillStyle='#8cff4a';c.beginPath();c.arc(11,-8+f*2,1.6,0,TAU);c.fill();c.fillRect(10.4,-8,1.2,4+f*2);}}),
 barrel:(c,f,t)=>human(c,f,{skin:t.skin,shirt:'#d8b92a',pants:'#3a3a4a',eye:t.eye,
  torso:(c,f)=>{c.fillStyle='#d8b92a';rr(c,-11,-8,22,23,4);c.fill();c.stroke();c.fillStyle='#1a1a1a';for(let i=0;i<3;i++)poly(c,[-11+i*8,-8,-6+i*8,-8,-11+i*8,-3],'#1a1a1a');c.fillStyle='#4ee03a';ell(c,0,4,6,6,'#2b2b2b',OL);for(let i=0;i<3;i++){c.fillStyle='#4ee03a';c.beginPath();c.moveTo(0,4);c.arc(0,4,5,i*TAU/3-.4,i*TAU/3+.5);c.closePath();c.fill();}ell(c,0,4,1.5,1.5,'#4ee03a');},
  extra:c=>{c.fillStyle='#6dff4e';c.fillRect(-9,14,1.6,5);}}),
 charger:(c,f,t)=>human(c,f,{skin:t.skin,shirt:'#b83232',pants:'#e6e6e6',lean:.22,k:1.08,eye:'#ff7a50',
  hair:c=>{c.fillStyle='#8892a0';c.beginPath();c.arc(2,-15,9.4,Math.PI,TAU);c.fill();c.stroke();seg(c,8,-14,12,-9,1.8,'#cfd6dd');seg(c,5,-9,12,-9,1.8,'#cfd6dd');},
  torso:c=>{ell(c,-8,-6,5,4,'#d8dde3',OL);ell(c,8,-6,5,4,'#d8dde3',OL);c.fillStyle='#fff';c.font='bold 11px Arial';c.textAlign='center';c.fillText('88',0,6);}}),
 armored:(c,f,t)=>human(c,f,{skin:t.skin,shirt:'#6f7885',pants:'#2b3038',k:1.04,eye:'#ffcf80',
  hair:c=>{c.fillStyle='#4a525d';c.beginPath();c.arc(2,-15,9.2,Math.PI*.9,TAU+.2);c.fill();c.stroke();c.fillStyle='rgba(120,200,255,.55)';rr(c,2,-18,9,6,2);c.fill();},
  torso:c=>{ell(c,-9,-6,5,4,'#8f98a5',OL);ell(c,9,-6,5,4,'#8f98a5',OL);seg(c,-8,0,8,0,1.4,'#3b424c');seg(c,-8,4,8,4,1.4,'#3b424c');},
  extra:c=>{c.fillStyle='#8a94a2';rr(c,10,-12,6,26,3);c.fill();c.stroke();c.fillStyle='#e9e44a';c.fillRect(11.5,-4,3,6);}}),
 sergeant:(c,f,t)=>human(c,f,{skin:'#9bb08c',shirt:'#233a6b',pants:'#161d34',k:1.12,eye:'#ff3b3b',
  hair:c=>{c.fillStyle='#16203d';c.beginPath();c.arc(2,-18,9.2,Math.PI,TAU);c.fill();c.stroke();c.fillStyle='#d8b92a';c.fillRect(-4,-19,12,2);star(c,2,-24,3,'#d8b92a');},
  torso:c=>{star(c,-3,-2,3.6,'#e6c84a');c.fillStyle='#d8b92a';c.fillRect(-9,5,18,2.4);poly(c,[-3,-7,3,-7,0,-1],'#b02020');},
  extra:c=>{poly(c,[-11,-8,-15,-14,-8,-11],'#8f98a5',OL);poly(c,[11,-8,15,-14,8,-11],'#8f98a5',OL);}}),
 nurse:(c,f,t)=>human(c,f,{skin:'#b1c2a2',shirt:'#f0f0ec',pants:'#e8e8e2',k:1.1,eye:'#ffe27a',mouth:'#7a1010',
  hair:c=>{c.fillStyle='#f6f6f2';rr(c,-6,-25,16,8,2);c.fill();c.stroke();c.fillStyle='#d12020';c.fillRect(1,-24,2,6);c.fillRect(-1,-22,6,2);},
  torso:c=>{blood(c,[-4,0,3,4,3,2.4,-1,7,2,6,-1,1.6]);c.fillStyle='#b02020';c.fillRect(-9,9,18,3);},
  extra:c=>{limb(c,12,-2,20,-10,2,'#cfd8dc');poly(c,[19,-12,23,-16,22,-9],'#4ee03a',OL);}}),
 colonel:(c,f,t)=>human(c,f,{skin:t.skin,shirt:'#4d5a3a',pants:'#2f3a27',k:1.2,eye:'#ff4a30',
  hair:c=>{c.fillStyle='#3a462d';c.beginPath();c.arc(2,-18,9.4,Math.PI,TAU);c.fill();c.stroke();c.fillStyle='#202820';rr(c,-6,-19,17,3,1);c.fill();star(c,2,-22,3,'#e6c84a');},
  torso:c=>{dots(c,[-4,-3,1.6,0,-3,1.6,4,-3,1.6],'#e6c84a');c.fillStyle='#2b3322';c.fillRect(-9,4,18,2.6);},
  extra:c=>{c.fillStyle='#262a30';rr(c,12,-10,14,5,2);c.fill();c.stroke();c.fillStyle='#ffd04a';poly(c,[26,-9,31,-7.5,26,-6],'#ffd04a');}}),
 titan:(c,f,t)=>{c.lineJoin='round';c.lineWidth=2;c.strokeStyle=OL;const g=f?1:-1;
  limb(c,-14,6,-20,20+g,8,t.skin2);limb(c,14,6,20,20-g,8,t.skin2);
  limb(c,-16,-4,-24,6+g*2,6,t.skin);limb(c,16,-4,25,4-g*2,6,t.skin);limb(c,-14,-12,-23,-10,4,t.skin);limb(c,14,-12,23,-14,4,t.skin);
  ell(c,0,2,17,19,t.skin2,OL);ell(c,0,4,9,10,t.glow,OL);seg(c,-12,-6,-4,-2,1.4,'#10150f');seg(c,12,-6,4,-2,1.4,'#10150f');
  ell(c,0,-16,9.5,9,t.skin,OL);poly(c,[-8,-22,-13,-34,-3,-23],'#e8e2cf',OL);poly(c,[8,-22,13,-34,3,-23],'#e8e2cf',OL);
  eyes(c,0,-17,t.glowEye,6,2.6,'#400');c.fillStyle='#2a0808';rr(c,-5,-11,10,5,2);c.fill();c.fillStyle='#e8e2cf';for(let i=-3;i<=3;i+=2)c.fillRect(i-.6,-11,1.2,2);},
 mama:(c,f,t)=>{c.lineJoin='round';c.lineWidth=2;c.strokeStyle=OL;const p=f?1.04:1;
  limb(c,-10,12,-12,22,6,'#8a7a5a');limb(c,10,12,12,22,6,'#8a7a5a');limb(c,-18,2,-22,12,4,'#c9a89a');limb(c,18,2,22,12,4,'#c9a89a');
  ell(c,0,4,21*p,19*p,'#c9b07a',OL);ell(c,-5,-2,9,7,'#d6c28d');dots(c,[-9,6,3,8,9,2.4,0,13,3,-12,-4,2,12,-2,2.6],'#8fa23e');dots(c,[-9,6,1.2,8,9,1,0,13,1.2],'#e8f08a');
  ell(c,2,-16,8,7.5,'#b9a58f',OL);c.fillStyle='#f6f6f2';rr(c,-5,-27,14,8,2);c.fill();c.stroke();c.fillStyle='#d12020';c.fillRect(1,-26,2,6);c.fillRect(-1,-24,6,2);
  eyes(c,3,-17,'#ffe27a',4.6,2.2);ell(c,4,-12,3,2,'#401010');},
 hunger:(c,f,t)=>{c.lineJoin='round';c.lineWidth=1.8;c.strokeStyle='#050507';const w=f?2:0;
  c.fillStyle='rgba(20,18,30,.92)';c.beginPath();c.moveTo(-14,-14);c.quadraticCurveTo(-18,10,-20+w,24);c.lineTo(-8,19);c.lineTo(-2,25);c.lineTo(5,19);c.lineTo(12,25);c.lineTo(18+w,22);c.quadraticCurveTo(15,6,12,-14);c.quadraticCurveTo(0,-30,-14,-14);c.fill();c.stroke();
  ell(c,0,-13,8,9,'#e9e4d2',OL);ell(c,0,-18,10,6,'#0b0b12');ell(c,-3.2,-13,2.3,2.8,'#0b0b12');ell(c,3.2,-13,2.3,2.8,'#0b0b12');c.fillStyle='#ff3b3b';c.beginPath();c.arc(-3.2,-13,.9,0,TAU);c.arc(3.2,-13,.9,0,TAU);c.fill();c.strokeStyle='#0b0b12';c.lineWidth=1;for(let i=-3;i<=3;i+=2){c.beginPath();c.moveTo(i,-7);c.lineTo(i,-4.5);c.stroke();}
  seg(c,18,-24,17,22,2.6,'#6b4a2a');c.strokeStyle='#050507';c.fillStyle='#c7ccd6';c.beginPath();c.moveTo(18,-24);c.quadraticCurveTo(0,-34,-6,-18);c.quadraticCurveTo(2,-26,18,-20);c.closePath();c.fill();c.stroke();
  limb(c,10,-4,17,-1,3,'#dad5c0');},
 tarman:(c,f,t)=>{c.lineJoin='round';c.lineWidth=2;c.strokeStyle='#050607';const g=f?2:-2;
  limb(c,-8,10,-10,22+g,8,'#1b1e24');limb(c,8,10,10,22-g,8,'#1b1e24');
  limb(c,-12,-4,-24,0+g,6,'#20242b');limb(c,12,-4,24,-6-g,6,'#20242b');
  ell(c,0,2,15,17,'#16181d',OL);ell(c,-5,-3,5,8,'#2e333c',null,.3);
  ell(c,0,-14,10.5,9.5,'#1a1d23',OL);ell(c,-4,-17,2.6,3.2,'#f4f4ee');ell(c,4,-17,2.6,3.2,'#f4f4ee');dots(c,[-4,-16.5,1,4,-16.5,1],'#050505');
  c.fillStyle='#050505';ell(c,0,-9,4.5,2.6+(f?.6:0),'#050505');c.fillStyle='#f4f4ee';c.fillRect(-2.5,-10.4,1.4,1.2);c.fillRect(1,-10.4,1.4,1.2);
  c.fillStyle='#16181d';for(const [x,y,h] of [[-10,12,7+f*2],[2,16,9-f*2],[9,12,6]]){rr(c,x-1.6,y,3.2,h,1.6);c.fill();}
  ell(c,-6,22,5,2,'#16181d');ell(c,14,22,4,1.6,'#16181d');},
 banshee:(c,f,t)=>{c.lineJoin='round';c.lineWidth=1.6;c.strokeStyle='#20182e';const w=f?3:0;
  c.fillStyle='rgba(235,232,250,.9)';c.beginPath();c.moveTo(-9,-8);c.quadraticCurveTo(-18,12,-20+w,24);c.lineTo(-8,19);c.lineTo(0,26);c.lineTo(8,19);c.lineTo(20-w,24);c.quadraticCurveTo(18,12,9,-8);c.closePath();c.fill();c.stroke();
  c.fillStyle='#1c1428';c.beginPath();c.moveTo(-12,-18);c.quadraticCurveTo(-20,6,-16,16);c.quadraticCurveTo(-8,6,-8,-8);c.fill();c.beginPath();c.moveTo(12,-18);c.quadraticCurveTo(20,6,16,16);c.quadraticCurveTo(8,6,8,-8);c.fill();
  ell(c,0,-15,9,10,'#e4e0f3',OL);c.fillStyle='#1c1428';c.beginPath();c.moveTo(-12,-16);c.quadraticCurveTo(0,-34,12,-16);c.quadraticCurveTo(0,-22,-12,-16);c.fill();
  ell(c,-3.4,-14,2.6,3.4,'#0a0612');ell(c,3.4,-14,2.6,3.4,'#0a0612');ell(c,0,-6.5,3.6,4.6+(f?1:0),'#0a0612');
  limb(c,-8,-2,-19,2-w,3,'#e4e0f3');limb(c,8,-2,19,2-w,3,'#e4e0f3');},
 bloater:(c,f,t)=>{c.lineJoin='round';c.lineWidth=1.8;c.strokeStyle=OL;const p=f?1.05:1;
  limb(c,-7,12,-8,22,5,'#5a6a3a');limb(c,7,12,8,22,5,'#5a6a3a');limb(c,-16,0,-21,10,3.4,t.skin);limb(c,16,0,21,10,3.4,t.skin);
  ell(c,0,4,19*p,17*p,'#a3b55a',OL);ell(c,-5,-2,8,6,'#bccd72');dots(c,[-9,6,3,8,9,2.4,0,13,3,-12,-4,2,10,-3,2.6],'#7d9238');dots(c,[-9,6,1,8,9,.9,0,13,1.1],'#e8f08a');
  ell(c,2,-15,7,6.6,t.skin,OL);eyes(c,3,-16,t.eye,4.2,2);ell(c,4,-11,3,1.6,'#2a0e0e');},
 crawler:(c,f,t)=>{c.lineJoin='round';c.lineWidth=1.6;c.strokeStyle=OL;const g=f?2:-2;
  c.strokeStyle='#7a1f2a';c.lineWidth=3;c.beginPath();c.moveTo(-8,10);c.bezierCurveTo(-16,16,-20,8,-24,14);c.stroke();c.strokeStyle=OL;c.lineWidth=1.6;
  ell(c,-4,8,11,7,'#7a8e6a',OL);for(let i=-1;i<=1;i++)seg(c,-4+i*4,4,-4+i*4,10,1,'#c9d2b6');ell(c,-12,10,4,4,'#a8423f');
  limb(c,3,6,14,10+g,3.4,t.skin);limb(c,2,10,13,14-g,3.4,t.skin);ell(c,9,2,7.4,7,t.skin,OL);eyes(c,12,0,t.eye,3.6,2);ell(c,13,5,2.6,1.4,'#2a0e0e');
  c.fillStyle='#e8e8d0';c.fillRect(14.6,9+g,1.4,2);c.fillRect(15,13-g,1.4,2);},
 bat:(c,f,t)=>{c.lineJoin='round';c.lineWidth=1.4;c.strokeStyle=OL;const u=f?-10:8,d=f?3:-1;
  c.fillStyle='#4a3f5c';c.beginPath();c.moveTo(-3,0);c.lineTo(-18,u);c.lineTo(-13,u+9);c.lineTo(-10,u+4);c.lineTo(-6,u+11);c.lineTo(-2,d+6);c.closePath();c.fill();c.stroke();
  c.beginPath();c.moveTo(3,0);c.lineTo(18,u);c.lineTo(13,u+9);c.lineTo(10,u+4);c.lineTo(6,u+11);c.lineTo(2,d+6);c.closePath();c.fill();c.stroke();
  ell(c,0,3,5,6.4,'#2c2438',OL);poly(c,[-4,-2,-5,-8,-1,-4],'#2c2438',OL);poly(c,[4,-2,5,-8,1,-4],'#2c2438',OL);dots(c,[-2,1,1.2,2,1,1.2],'#ff4040');c.fillStyle='#fff';c.fillRect(-1.5,6,1,1.6);c.fillRect(.5,6,1,1.6);},
 ghost:(c,f,t)=>{c.lineJoin='round';c.lineWidth=1.5;c.strokeStyle='#27405a';const w=f?3:-3;
  const g=c.createLinearGradient(0,-20,0,24);g.addColorStop(0,'rgba(215,240,255,.95)');g.addColorStop(1,'rgba(120,170,230,.15)');c.fillStyle=g;
  c.beginPath();c.moveTo(-11,-6);c.quadraticCurveTo(-12,-24,0,-24);c.quadraticCurveTo(12,-24,11,-6);c.quadraticCurveTo(14+w,10,8,18);c.quadraticCurveTo(4+w,24,0,18);c.quadraticCurveTo(-4-w,24,-8,18);c.quadraticCurveTo(-14-w,10,-11,-6);c.closePath();c.fill();c.stroke();
  ell(c,-4,-12,2.8,3.6,'#0c1624');ell(c,4,-12,2.8,3.6,'#0c1624');ell(c,0,-4,3,3.8+(f?1:0),'#0c1624');limb(c,10,-2,19,2+w,2.6,'rgba(200,230,255,.8)');}
};
const BIG_ART={titan:1,mama:1,tarman:1,colonel:1,banshee:1,hunger:1};
const THEMES={
 dead:{name:'dead',skin:'#8aa67a',skin2:'#a9b99a',eye:'#f1edc6',glow:'#6dff4e',glowEye:'#9bff6a',ground:'#1c2a24',ground2:'#233629',road:'#2a2e36',sign:'UNEEDA MEDICAL',dirt:'#2e3b30',leaf:'#2e5a3a'},
 cabin:{name:'cabin',skin:'#b4bfae',skin2:'#c4cdb8',eye:'#f4f6ee',glow:'#ff5a3a',glowEye:'#ff6a4a',ground:'#1d261b',ground2:'#27301f',road:'#3a2f22',sign:'KNOWBY CABIN',dirt:'#3a2d1f',leaf:'#4a3a1e'}
};
const ESS=1.5;
// bake: per type one canvas, 4 columns (right f0,f1, left f0,f1) x 2 rows (normal, flash)
function bakeEnemies(theme){
 const th=THEMES[theme]||THEMES.dead,out={};
 for(const id of ENEMY_IDS){
  const def=ENEMIES[id],art=ARTS[id]||ARTS[({elite:'sergeant'})[id]]||ARTS.shambler,cell=Math.ceil(def.sz*ESS),cv=mk(cell*4,cell*2),c=cv.getContext('2d'),k=def.sz/48*ESS;
  for(let col=0;col<4;col++){
   c.save();c.translate(col*cell+cell/2,cell/2);c.scale(k,k);if(col>=2)c.scale(-1,1);
   if(!def.fly)ell(c,0,20,12,4,'rgba(0,0,0,.35)');
   art(c,col&1,th);c.restore();
  }
  c.drawImage(cv,0,0,cell*4,cell,0,cell,cell*4,cell);c.globalCompositeOperation='source-atop';c.fillStyle='rgba(255,255,255,.82)';c.fillRect(0,cell,cell*4,cell);c.globalCompositeOperation='source-over';
  out[id]={img:cv,cell,sz:def.sz};
 }
 return out;
}

// ---------- icons: glyph drawn in a 64x64 box centred on the origin ----------
function grad(c,x1,y1,x2,y2,a,b){const g=c.createLinearGradient(x1,y1,x2,y2);g.addColorStop(0,a);g.addColorStop(1,b);return g;}
const ICONS={
 boomstick(c){c.save();c.rotate(-.55);c.lineWidth=2;c.strokeStyle=OL;poly(c,[-28,8,-8,-2,-4,8,-24,18],'#7b4a28',OL);
  for(const y of[-6,1]){rr(c,-8,y-1,38,6,3);c.fillStyle=grad(c,0,y,0,y+6,'#d4dce2','#5b6770');c.fill();c.stroke();}
  star(c,34,-1,9,'#ffb347');c.restore();},
 chainsaw(c){c.lineWidth=2;c.strokeStyle=OL;rr(c,-26,-8,22,22,5);c.fillStyle='#e0702a';c.fill();c.stroke();rr(c,-22,-16,14,8,3);c.fillStyle='#35383e';c.fill();c.stroke();
  rr(c,-6,-4,34,12,6);c.fillStyle='#b9c2c9';c.fill();c.stroke();c.fillStyle='#2b2f34';for(let i=0;i<7;i++)c.fillRect(-2+i*4.2,-6,2,3),c.fillRect(-2+i*4.2,7,2,3);ell(c,-16,4,4,4,'#222');},
 necro(c){c.lineWidth=2;c.strokeStyle=OL;rr(c,-20,-24,40,48,5);c.fillStyle='#5a3a24';c.fill();c.stroke();rr(c,-15,-19,30,38,3);c.fillStyle='#7a5638';c.fill();c.stroke();
  ell(c,0,-4,8,9,'#ece6d0',OL);ell(c,-3,-5,2.2,2.8,'#1a0a0a');ell(c,3,-5,2.2,2.8,'#1a0a0a');c.fillStyle='#ece6d0';rr(c,-4,3,8,6,1);c.fill();c.stroke();c.fillStyle='#1a0a0a';c.fillRect(-1,4,1,4);c.fillRect(1.5,4,1,4);
  seg(c,-14,14,14,14,1.6,'#2b1a0e');dots(c,[-14,-17,1.6,14,-17,1.6,-14,17,1.6,14,17,1.6],'#c9a64a');},
 barrel(c){c.lineWidth=2;c.strokeStyle=OL;rr(c,-15,-22,30,44,5);c.fillStyle=grad(c,-15,0,15,0,'#e3c93a','#a8901c');c.fill();c.stroke();seg(c,-15,-10,15,-10,2,OL);seg(c,-15,10,15,10,2,OL);
  ell(c,0,0,7,7,'#222',OL);for(let i=0;i<3;i++){c.fillStyle='#5eff3a';c.beginPath();c.moveTo(0,0);c.arc(0,0,6,i*TAU/3-.4,i*TAU/3+.5);c.closePath();c.fill();}
  c.fillStyle='#5eff3a';rr(c,-6,-26,12,6,3);c.fill();ell(c,9,24,3,4,'#5eff3a');},
 goo(c){c.lineWidth=2;c.strokeStyle='#000';c.fillStyle='#1b1e24';c.beginPath();c.moveTo(-22,12);c.quadraticCurveTo(-26,-14,0,-16);c.quadraticCurveTo(26,-14,22,12);c.quadraticCurveTo(14,20,8,14);c.quadraticCurveTo(6,26,2,14);c.quadraticCurveTo(-6,20,-12,14);c.quadraticCurveTo(-18,20,-22,12);c.fill();c.stroke();
  ell(c,-6,-4,4.4,5.4,'#f4f4ee');ell(c,6,-4,4.4,5.4,'#f4f4ee');dots(c,[-6,-3,1.6,6,-3,1.6],'#000');ell(c,-9,-11,6,2.6,'rgba(255,255,255,.25)',null,-.3);},
 crowbar(c){c.save();c.rotate(.7);seg(c,0,-26,0,26,7,OL);seg(c,0,-26,0,26,4.6,'#d23b3b');c.strokeStyle=OL;c.lineWidth=7;c.beginPath();c.moveTo(0,-26);c.quadraticCurveTo(0,-34,-9,-31);c.stroke();c.strokeStyle='#d23b3b';c.lineWidth=4.6;c.stroke();seg(c,0,26,5,30,7,OL);seg(c,0,26,5,30,4.6,'#d23b3b');seg(c,-1.2,-22,-1.2,18,1.2,'rgba(255,255,255,.4)');c.restore();},
 nailgun(c){c.lineWidth=2;c.strokeStyle=OL;rr(c,-26,-12,40,16,4);c.fillStyle='#e6a021';c.fill();c.stroke();rr(c,-14,2,13,22,3);c.fillStyle='#3a3d44';c.fill();c.stroke();rr(c,14,-8,16,7,2);c.fillStyle='#9aa4ac';c.fill();c.stroke();rr(c,-22,-6,16,6,2);c.fillStyle='#c9ccd2';c.fill();
  for(let i=0;i<3;i++)seg(c,26+i*2,-18+i*8,34+i*2,-18+i*8,2,'#e7edf2');},
 lantern(c){c.lineWidth=2;c.strokeStyle=OL;c.beginPath();c.arc(0,-22,8,Math.PI,TAU);c.stroke();rr(c,-14,-16,28,6,2);c.fillStyle='#3a3e44';c.fill();c.stroke();
  rr(c,-12,-10,24,28,4);c.fillStyle=grad(c,0,-10,0,18,'#ffe58a','#ff9a30');c.fill();c.stroke();ell(c,0,4,5,8,'#fff7cf');seg(c,-4,-10,-4,18,1.4,OL);seg(c,4,-10,4,18,1.4,OL);rr(c,-14,18,28,6,2);c.fillStyle='#3a3e44';c.fill();c.stroke();},
 grenade(c){c.lineWidth=2;c.strokeStyle=OL;ell(c,0,6,18,18,grad(c,-10,-10,10,22,'#ffe27a','#c28d1c'),OL);rr(c,-6,-16,12,7,2);c.fillStyle='#c28d1c';c.fill();c.stroke();
  c.fillStyle='#fff6c8';c.fillRect(-2,-30,4,16);c.fillRect(-7,-26,14,4);c.strokeRect(-2,-30,4,16);c.fillStyle='#ffe27a';c.fillRect(-1,-29,2,14);seg(c,-14,6,14,6,1.4,'#8a5f0e');seg(c,0,-6,0,18,1.4,'#8a5f0e');},
 medics(c){c.lineWidth=2;c.strokeStyle=OL;ell(c,0,0,23,23,'#f6f6f2',OL);c.fillStyle='#d62a2a';rr(c,-6,-16,12,32,2);c.fill();c.stroke();rr(c,-16,-6,32,12,2);c.fill();c.stroke();c.fillStyle='#d62a2a';rr(c,-5,-15,10,30,2);c.fill();rr(c,-15,-5,30,10,2);c.fill();ell(c,0,-26,5,3,'#ff5a4a');},
 vinyl(c){c.lineWidth=2;ell(c,0,0,25,25,'#15161a',OL);for(const r of[21,17,13]){c.strokeStyle='rgba(255,255,255,.12)';c.lineWidth=1;c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();}c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=2;c.beginPath();c.arc(0,0,19,-2.3,-1.3);c.stroke();ell(c,0,0,8,8,'#d23b5a',OL);ell(c,0,0,1.8,1.8,'#111');},
 bolt(c){c.lineWidth=2;poly(c,[6,-30,-14,4,-2,4,-8,30,16,-8,3,-8,12,-30],'#ffe94a',OL);poly(c,[3,-22,-6,0,3,0],'rgba(255,255,255,.7)');},
 // passives
 might(c){c.save();c.rotate(.7);c.lineWidth=2;c.strokeStyle=OL;rr(c,-5,-26,10,36,3);c.fillStyle='rgba(220,235,245,.85)';c.fill();c.stroke();rr(c,-4,-8,8,18,2);c.fillStyle='#e03a3a';c.fill();rr(c,-9,-30,18,5,2);c.fillStyle='#8892a0';c.fill();c.stroke();seg(c,0,10,0,22,2,'#cfd6dd');poly(c,[-3,22,3,22,0,30],'#cfd6dd',OL);c.restore();},
 armor(c){c.lineWidth=2;c.strokeStyle=OL;c.beginPath();c.moveTo(0,-26);c.lineTo(22,-18);c.quadraticCurveTo(22,10,0,28);c.quadraticCurveTo(-22,10,-22,-18);c.closePath();c.fillStyle=grad(c,0,-26,0,28,'#7ad0ff','#2f6fb0');c.fill();c.stroke();seg(c,0,-20,0,22,2,'rgba(255,255,255,.5)');seg(c,-16,-8,16,-8,2,'rgba(255,255,255,.5)');},
 maxhp(c){c.lineWidth=2;c.strokeStyle=OL;c.beginPath();c.moveTo(0,24);c.bezierCurveTo(-34,-2,-22,-30,0,-12);c.bezierCurveTo(22,-30,34,-2,0,24);c.fillStyle=grad(c,0,-20,0,24,'#ff6a7a','#b01c3a');c.fill();c.stroke();c.fillStyle='#fff';c.fillRect(-2.5,-8,5,16);c.fillRect(-8,-2.5,16,5);},
 recovery(c){c.lineWidth=2;c.strokeStyle=OL;rr(c,-24,-16,48,36,5);c.fillStyle='#f6f6f2';c.fill();c.stroke();rr(c,-10,-24,20,9,3);c.fillStyle='#d62a2a';c.fill();c.stroke();c.fillStyle='#d62a2a';c.fillRect(-4,-9,8,22);c.fillRect(-11,-2,22,8);},
 cooldown(c){c.lineWidth=2;ell(c,0,2,22,22,'#e9f4ff',OL);ell(c,0,2,18,18,'#bfe0ff');c.strokeStyle=OL;seg(c,0,2,0,-12,3,OL);seg(c,0,2,10,8,3,OL);ell(c,0,2,2.4,2.4,OL);rr(c,-4,-26,8,5,2);c.fillStyle='#8892a0';c.fill();c.stroke();for(const a of[0,1,2,3]){seg(c,Math.cos(a*Math.PI/2)*16,2+Math.sin(a*Math.PI/2)*16,Math.cos(a*Math.PI/2)*19,2+Math.sin(a*Math.PI/2)*19,2,OL);}},
 area(c){for(const [r,a] of[[26,.3],[18,.55],[10,1]]){c.strokeStyle='rgba(255,208,90,'+a+')';c.lineWidth=4;c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();}c.fillStyle='#ffd05a';c.beginPath();c.arc(0,0,4,0,TAU);c.fill();for(let i=0;i<4;i++){const a=i*Math.PI/2+.78;poly(c,[Math.cos(a)*26-3,Math.sin(a)*26-3,Math.cos(a)*32,Math.sin(a)*32,Math.cos(a)*26+3,Math.sin(a)*26+3],'#ffd05a',OL);}},
 pspeed(c){c.lineWidth=2;seg(c,-30,-10,-14,-10,3,'rgba(255,255,255,.5)');seg(c,-30,0,-10,0,3,'rgba(255,255,255,.5)');seg(c,-30,10,-14,10,3,'rgba(255,255,255,.5)');rr(c,-12,-8,30,16,6);c.fillStyle=grad(c,0,-8,0,8,'#f0c060','#a8741c');c.fill();c.strokeStyle=OL;c.stroke();poly(c,[18,-8,30,0,18,8],'#d8dde3',OL);},
 duration(c){c.lineWidth=2;c.strokeStyle=OL;poly(c,[-16,-24,16,-24,3,0,16,24,-16,24,-3,0],'rgba(220,240,255,.8)',OL);poly(c,[-12,-22,12,-22,2,-4,-2,-4],'#f2c14e');poly(c,[-12,22,12,22,5,12,-5,12],'#f2c14e');seg(c,0,-4,0,12,2,'#f2c14e');rr(c,-19,-29,38,6,2);c.fillStyle='#7a4a24';c.fill();c.stroke();rr(c,-19,23,38,6,2);c.fill();c.stroke();},
 magnet(c){c.lineWidth=2;c.strokeStyle=OL;c.lineCap='butt';c.beginPath();c.arc(0,2,16,Math.PI,TAU);c.lineTo(16,22);c.lineTo(8,22);c.lineTo(8,2);c.arc(0,2,8,0,Math.PI,true);c.lineTo(-8,22);c.lineTo(-16,22);c.closePath();c.fillStyle='#d62a2a';c.fill();c.stroke();c.fillStyle='#e8edf2';c.fillRect(-16,14,8,8);c.fillRect(8,14,8,8);c.strokeRect(-16,14,8,8);c.strokeRect(8,14,8,8);
  seg(c,-4,-24,-8,-30,2,'#ffe94a');seg(c,4,-24,8,-30,2,'#ffe94a');},
 luck(c){c.lineWidth=2;for(const [x,y] of[[-9,-9],[9,-9],[-9,9],[9,9]])ell(c,x,y,10,10,'#4ec45a',OL);seg(c,0,0,8,26,4,OL);seg(c,0,0,8,26,2.4,'#2f8a3a');ell(c,0,0,3.4,3.4,'#2f8a3a');},
 growth(c){c.lineWidth=2;c.strokeStyle=OL;ell(c,-9,-2,15,17,'#f2a0b8',OL);ell(c,9,-2,15,17,'#f2a0b8',OL);c.strokeStyle='#c0607e';c.lineWidth=2;c.beginPath();c.arc(-9,-4,8,.3,2.6);c.stroke();c.beginPath();c.arc(9,-4,8,.5,2.8);c.stroke();c.beginPath();c.moveTo(0,-16);c.lineTo(0,14);c.stroke();rr(c,-9,16,18,8,3);c.fillStyle='rgba(180,230,255,.7)';c.fill();c.strokeStyle=OL;c.stroke();},
 greed(c){c.lineWidth=2;ell(c,0,0,23,23,'#f6cd3a',OL);ell(c,0,0,17,17,'#e0a81c');c.fillStyle='#8a5f0e';c.font='bold 26px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('$',0,2);seg(c,-12,-12,-4,-18,2,'rgba(255,255,255,.6)');},
 revive(c){c.lineWidth=2;c.strokeStyle=OL;c.beginPath();c.moveTo(0,24);c.bezierCurveTo(-34,-2,-22,-30,0,-12);c.bezierCurveTo(22,-30,34,-2,0,24);c.fillStyle=grad(c,0,-20,0,24,'#ffd0d8','#d62a4a');c.fill();c.stroke();c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(-18,2);c.lineTo(-8,2);c.lineTo(-4,-8);c.lineTo(2,12);c.lineTo(6,2);c.lineTo(18,2);c.stroke();},
 // pickups
 chicken(c){c.lineWidth=2;c.strokeStyle=OL;ell(c,-2,-4,16,13,grad(c,0,-14,0,10,'#e69a46','#a85c1c'),OL,-.5);seg(c,8,6,22,18,5,OL);seg(c,8,6,22,18,2.8,'#f1e6cf');ell(c,24,20,4,4,'#f1e6cf',OL);ell(c,19,16,4,4,'#f1e6cf',OL);ell(c,-7,-9,5,3,'rgba(255,255,255,.35)',null,-.5);},
 brains(c){ICONS.growth(c);},
 gem(c){poly(c,[0,-20,14,-4,0,20,-14,-4],'#8fd0ff',OL);poly(c,[0,-20,14,-4,0,0],'#fff',null);c.globalAlpha=.5;poly(c,[0,-20,14,-4,0,0],'#fff');c.globalAlpha=1;},
 chest(c){c.lineWidth=2;c.strokeStyle=OL;rr(c,-24,-4,48,26,4);c.fillStyle=grad(c,0,-4,0,22,'#a8682e','#6b3c16');c.fill();c.stroke();c.beginPath();c.moveTo(-24,-4);c.quadraticCurveTo(-24,-24,0,-24);c.quadraticCurveTo(24,-24,24,-4);c.closePath();c.fillStyle=grad(c,0,-24,0,-4,'#c98a42','#8a5424');c.fill();c.stroke();
  c.fillStyle='#f6cd3a';c.fillRect(-4,-8,8,12);c.strokeRect(-4,-8,8,12);c.fillRect(-26,0,4,6);c.fillRect(22,0,4,6);seg(c,-14,-22,-14,22,3,'#f6cd3a');seg(c,14,-22,14,22,3,'#f6cd3a');ell(c,0,-3,2,2,OL);},
 bomb(c){ICONS.barrel(c);c.fillStyle='#ff4a2a';ell(c,10,-8,7,7,'#ff4a2a',OL);c.fillStyle='#fff';c.font='bold 10px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('!',10,-7);},
 coin(c){c.lineWidth=2;ell(c,0,0,18,18,'#f6cd3a',OL);ell(c,0,0,12,12,'#e0a81c');c.fillStyle='#8a5f0e';c.font='bold 18px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('$',0,1);},
 medic(c){ICONS.medics(c);},
 skull(c){ell(c,0,-4,18,16,'#ece6d0',OL);rr(c,-9,8,18,12,3);c.fillStyle='#ece6d0';c.fill();c.stroke();ell(c,-7,-4,5,6,'#111');ell(c,7,-4,5,6,'#111');poly(c,[0,2,-3,8,3,8],'#111');}
};
function bakeIcon(id,size,bg,accent){
 const cv=mk(size,size),c=cv.getContext('2d'),k=size/64;c.translate(size/2,size/2);c.scale(k,k);
 if(bg){rr(c,-30,-30,60,60,12);c.fillStyle=grad(c,0,-30,0,30,'#2c3a52','#171d2c');c.fill();c.lineWidth=3;c.strokeStyle=accent||'#d9b24a';c.stroke();c.scale(.78,.78);}
 else c.scale(.95,.95);
 (ICONS[id]||ICONS.skull)(c);return cv;
}
function lightSprite(r,hard=.35){const cv=mk(r*2,r*2),c=cv.getContext('2d'),g=c.createRadialGradient(r,r,0,r,r,r);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(hard,'rgba(255,255,255,.8)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,r*2,r*2);return cv;}
function glowSprite(r,rgb){const cv=mk(r*2,r*2),c=cv.getContext('2d'),g=c.createRadialGradient(r,r,0,r,r,r);g.addColorStop(0,`rgba(${rgb},.9)`);g.addColorStop(.4,`rgba(${rgb},.35)`);g.addColorStop(1,`rgba(${rgb},0)`);c.fillStyle=g;c.fillRect(0,0,r*2,r*2);return cv;}

// ---------- ground & props ----------
function groundTile(theme,seed){
 const th=THEMES[theme]||THEMES.dead,S=256,cv=mk(S,S),c=cv.getContext('2d');let n=seed>>>0||1;const R=()=>{n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return((n^n>>>14)>>>0)/4294967296;};
 c.fillStyle=th.ground;c.fillRect(0,0,S,S);
 const wrap=(fn,x,y,m)=>{for(const dx of[-S,0,S])for(const dy of[-S,0,S])if(x+dx>-m&&x+dx<S+m&&y+dy>-m&&y+dy<S+m)fn(x+dx,y+dy);};
 for(let i=0;i<26;i++){const x=R()*S,y=R()*S,r=18+R()*34,col=R()<.5?th.ground2:th.dirt;wrap((a,b)=>{ell(c,a,b,r,r*.7,col+'66');},x,y,r);}
 for(let i=0;i<170;i++){const x=R()*S,y=R()*S;c.fillStyle=R()<.5?'rgba(0,0,0,.18)':'rgba(255,255,255,.04)';c.fillRect(x,y,2+R()*3,2+R()*2);}
 for(let i=0;i<46;i++){const x=R()*S,y=R()*S,h=4+R()*5;wrap((a,b)=>{c.strokeStyle=th.leaf;c.lineWidth=1.3;c.beginPath();c.moveTo(a,b);c.lineTo(a-2,b-h);c.moveTo(a,b);c.lineTo(a+1,b-h*1.2);c.moveTo(a,b);c.lineTo(a+3,b-h*.8);c.stroke();},x,y,10);}
 return cv;
}
const PROPS={
 grave:[(c,t)=>{c.lineWidth=1.6;c.strokeStyle=OL;c.beginPath();c.moveTo(-11,0);c.lineTo(-11,-22);c.quadraticCurveTo(0,-34,11,-22);c.lineTo(11,0);c.closePath();c.fillStyle=grad(c,0,-30,0,0,'#9aa2a8','#6a7279');c.fill();c.stroke();seg(c,0,-22,0,-10,1.6,'#4a5258');seg(c,-5,-17,5,-17,1.6,'#4a5258');ell(c,-6,-2,6,2.5,'#3f5a3a');},
  (c,t)=>{c.lineWidth=1.6;c.strokeStyle=OL;rr(c,-9,-26,18,26,3);c.fillStyle=grad(c,0,-26,0,0,'#8a9096','#5e656b');c.fill();c.stroke();seg(c,-5,-19,5,-19,1.4,'#40484e');seg(c,-5,-14,3,-14,1.4,'#40484e');seg(c,-5,-9,5,-9,1.4,'#40484e');ell(c,5,-1,6,2.4,'#3f5a3a');},
  (c,t)=>{c.lineWidth=1.6;c.strokeStyle=OL;rr(c,-9,-6,18,6,2);c.fillStyle='#6a7279';c.fill();c.stroke();rr(c,-3,-34,6,30,2);c.fillStyle='#8a9096';c.fill();c.stroke();rr(c,-10,-28,20,6,2);c.fill();c.stroke();}],
 tree:[(c,t)=>{c.lineWidth=2;c.strokeStyle=OL;rr(c,-5,-24,10,26,3);c.fillStyle='#4a3524';c.fill();c.stroke();for(const [x,y,r,col] of [[-14,-34,14,'#2c4a2e'],[12,-36,15,'#315434'],[0,-50,18,'#386038'],[-4,-32,16,'#2c4a2e']]){ell(c,x,y,r,r*.9,col,OL);}ell(c,-4,-54,8,5,'rgba(255,255,255,.1)');},
  (c,t)=>{c.lineWidth=2;c.strokeStyle=OL;c.fillStyle='#3d2e22';c.beginPath();c.moveTo(-7,2);c.quadraticCurveTo(-4,-30,-2,-50);c.lineTo(3,-50);c.quadraticCurveTo(5,-30,8,2);c.closePath();c.fill();c.stroke();for(const [x,y,x2,y2] of[[-1,-34,-18,-50],[1,-26,16,-44],[0,-42,-8,-60],[0,-44,10,-58]])seg(c,x,y,x2,y2,3,'#3d2e22');},
  (c,t)=>{c.lineWidth=2;c.strokeStyle=OL;rr(c,-4,-14,8,16,2);c.fillStyle='#4a3524';c.fill();c.stroke();for(let i=0;i<3;i++)poly(c,[-18+i*2,-12-i*14,18-i*2,-12-i*14,0,-34-i*14],['#244a2c','#2a5632','#306438'][i],OL);}],
 car:[(c,t)=>{c.lineWidth=2;c.strokeStyle=OL;c.fillStyle='rgba(0,0,0,.3)';ell(c,0,2,44,10,'rgba(0,0,0,.3)');rr(c,-42,-18,84,22,7);c.fillStyle='#8a3b2e';c.fill();c.stroke();rr(c,-24,-32,46,18,6);c.fillStyle='#7a3226';c.fill();c.stroke();rr(c,-20,-29,16,12,2);c.fillStyle='#51667a';c.fill();rr(c,0,-29,18,12,2);c.fill();seg(c,-16,-28,-8,-18,1,'#cfe');ell(c,-26,4,9,9,'#17181b',OL);ell(c,26,4,9,9,'#17181b',OL);ell(c,-26,4,3.5,3.5,'#7b828a');ell(c,26,4,3.5,3.5,'#7b828a');dots(c,[-30,-10,4,20,-10,3.6,36,-12,2.6],'#5a2a20');},
  (c,t)=>{c.lineWidth=2;c.strokeStyle=OL;ell(c,0,2,46,10,'rgba(0,0,0,.3)');rr(c,-44,-16,88,20,6);c.fillStyle='#3d5f8a';c.fill();c.stroke();rr(c,-18,-32,48,18,6);c.fillStyle='#35547a';c.fill();c.stroke();rr(c,-14,-29,18,12,2);c.fillStyle='#51667a';c.fill();rr(c,8,-29,18,12,2);c.fill();ell(c,-28,4,9,9,'#17181b',OL);ell(c,28,4,9,9,'#17181b',OL);ell(c,-28,4,3.5,3.5,'#7b828a');ell(c,28,4,3.5,3.5,'#7b828a');dots(c,[-34,-8,5,36,-6,3.4],'#2a3c58');c.fillStyle='#ffe58a';c.fillRect(40,-12,4,5);}],
 lamp:[(c,t)=>{c.lineWidth=2;c.strokeStyle=OL;ell(c,0,1,8,3,'rgba(0,0,0,.35)');rr(c,-3,-46,6,48,2);c.fillStyle='#454b55';c.fill();c.stroke();rr(c,-10,-56,20,12,4);c.fillStyle='#ffe58a';c.fill();c.stroke();ell(c,0,-50,5,4,'#fffbe0');rr(c,-12,-60,24,5,2);c.fillStyle='#35383e';c.fill();c.stroke();},
  (c,t)=>{c.lineWidth=2;c.strokeStyle=OL;ell(c,0,1,8,3,'rgba(0,0,0,.35)');rr(c,-3,-46,6,48,2);c.fillStyle='#34383f';c.fill();c.stroke();rr(c,-10,-56,20,12,4);c.fillStyle='#4a4f58';c.fill();c.stroke();seg(c,-6,-54,6,-46,1.5,OL);rr(c,-12,-60,24,5,2);c.fillStyle='#2a2d33';c.fill();c.stroke();}],
 torch:[(c,t)=>{c.lineWidth=2;c.strokeStyle=OL;ell(c,0,1,8,3,'rgba(0,0,0,.35)');rr(c,-3,-34,6,36,2);c.fillStyle='#5a3e26';c.fill();c.stroke();rr(c,-8,-42,16,10,3);c.fillStyle='#35383e';c.fill();c.stroke();poly(c,[-6,-42,0,-60,6,-42],'#ff9a30',OL);poly(c,[-3,-42,0,-54,3,-42],'#ffe58a');},
  (c,t)=>{c.lineWidth=2;c.strokeStyle=OL;ell(c,0,1,8,3,'rgba(0,0,0,.35)');rr(c,-3,-34,6,36,2);c.fillStyle='#3a2a1c';c.fill();c.stroke();rr(c,-8,-42,16,10,3);c.fillStyle='#2a2d33';c.fill();c.stroke();}],
 barrel:[(c,t)=>{c.lineWidth=2;c.strokeStyle=OL;ell(c,0,1,14,4,'rgba(0,0,0,.35)');rr(c,-12,-26,24,28,4);c.fillStyle=grad(c,-12,0,12,0,'#8a5a30','#5a3a1c');c.fill();c.stroke();seg(c,-12,-18,12,-18,2,OL);seg(c,-12,-6,12,-6,2,OL);ell(c,0,-26,12,4,'#4a2e16',OL);},
  (c,t)=>{c.lineWidth=2;c.strokeStyle=OL;ell(c,0,1,14,4,'rgba(0,0,0,.35)');rr(c,-12,-26,24,28,4);c.fillStyle=grad(c,-12,0,12,0,'#d23b2a','#8a1c12');c.fill();c.stroke();seg(c,-12,-18,12,-18,2,OL);seg(c,-12,-6,12,-6,2,OL);c.fillStyle='#fff';poly(c,[0,-16,-4,-8,0,-10,4,-8],'#ffe94a',OL);ell(c,0,-26,12,4,'#6a1810',OL);},
  (c,t)=>{c.lineWidth=2;c.strokeStyle=OL;ell(c,0,1,14,4,'rgba(0,0,0,.35)');rr(c,-12,-26,24,28,4);c.fillStyle=grad(c,-12,0,12,0,'#c9b02a','#8a7a14');c.fill();c.stroke();seg(c,-12,-18,12,-18,2,OL);seg(c,-12,-6,12,-6,2,OL);ell(c,0,-12,5,5,'#222');for(let i=0;i<3;i++){c.fillStyle='#5eff3a';c.beginPath();c.moveTo(0,-12);c.arc(0,-12,4.4,i*TAU/3-.4,i*TAU/3+.5);c.closePath();c.fill();}ell(c,0,-26,12,4,'#5a4e10',OL);}],
 crate:[(c,t)=>{c.lineWidth=2;c.strokeStyle=OL;ell(c,0,1,16,4,'rgba(0,0,0,.35)');rr(c,-14,-26,28,28,3);c.fillStyle='#8a6a3a';c.fill();c.stroke();seg(c,-14,-12,14,-12,2,'#5a4220');poly(c,[-12,-24,12,0,12,-3,-9,-24],'#6a5028');seg(c,-12,-2,12,-24,2.4,'#5a4220');}],
 bush:[(c,t)=>{c.lineWidth=1.6;c.strokeStyle=OL;ell(c,0,1,16,4,'rgba(0,0,0,.3)');for(const [x,y,r] of[[-9,-6,9],[9,-6,9],[0,-12,10]])ell(c,x,y,r,r*.85,'#2d4a2a',OL);ell(c,-2,-14,5,3,'rgba(255,255,255,.08)');}],
 bones:[(c,t)=>{c.lineWidth=1;c.strokeStyle='#1a1a14';seg(c,-10,-3,8,2,3,'#d8d2bc');seg(c,-6,3,10,-4,3,'#d8d2bc');ell(c,-4,-2,6,5,'#e6e0ca','#1a1a14');dots(c,[-6,-3,1.2,-2,-3,1.2],'#222');}],
 rubble:[(c,t)=>{c.lineWidth=1.5;c.strokeStyle=OL;for(const [x,y,r,col] of[[-8,-3,6,'#6a7279'],[6,-2,7,'#7a8288'],[0,-8,5,'#59606a']])ell(c,x,y,r,r*.7,col,OL);}]
};
function bakeProps(theme){
 const th=THEMES[theme]||THEMES.dead,out={};
 for(const key in PROPS){out[key]=PROPS[key].map(fn=>{const S=2,w=130*S,h=140*S,cv=mk(w,h),c=cv.getContext('2d');c.translate(w/2,h-10*S);c.scale(S,S);fn(c,th);return {img:cv,w:w/S,h:h/S,ax:w/2/S,ay:(h-10*S)/S};});}
 return out;
}
function bakeBuilding(theme){
 const th=THEMES[theme]||THEMES.dead,w=300,h=190,cv=mk(w,h),c=cv.getContext('2d');c.lineWidth=2.4;c.strokeStyle=OL;c.lineJoin='round';
 if(theme==='cabin'){
  rr(c,20,66,260,112,4);c.fillStyle='#5a3e26';c.fill();c.stroke();for(let y=76;y<176;y+=14)seg(c,22,y,278,y,1.4,'#3a2616');
  poly(c,[6,70,150,10,294,70],'#3a2a22',OL);for(let i=0;i<10;i++)seg(c,26+i*28,66-i*0,150+(i-5)*14,18,1,'#2a1c16');
  rr(c,128,100,46,78,2);c.fillStyle='#2a1a10';c.fill();c.stroke();rr(c,52,96,44,38,2);c.fillStyle='#e8c860';c.fill();c.stroke();seg(c,74,96,74,134,2,OL);seg(c,52,115,96,115,2,OL);rr(c,204,96,44,38,2);c.fillStyle='#8a7a40';c.fill();c.stroke();seg(c,204,96,248,134,2,OL);
  rr(c,215,24,22,40,2);c.fillStyle='#6a6a6a';c.fill();c.stroke();
 }else{
  rr(c,20,40,260,138,4);c.fillStyle='#8a8f96';c.fill();c.stroke();rr(c,20,40,260,26,4);c.fillStyle='#d8dde2';c.fill();c.stroke();
  for(const x of[44,118,192]){rr(c,x,86,50,40,2);c.fillStyle='#34495e';c.fill();c.stroke();seg(c,x+25,86,x+25,126,2,OL);}
  rr(c,126,132,48,46,2);c.fillStyle='#2c3a44';c.fill();c.stroke();seg(c,150,132,150,178,2,OL);
  rr(c,0,6,300,36,6);c.fillStyle='#d62a2a';c.fill();c.stroke();c.fillStyle='#fff';c.font='bold 22px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('UNEEDA MEDICAL',150,25);
  ell(c,266,22,0,0);c.fillStyle='#4ee03a';c.fillRect(284,48,6,16);
 }
 return {img:cv,w,h};
}
Object.assign(exports,{THEMES,ICONS,bakeEnemies,bakeIcon,bakeProps,bakeBuilding,lightSprite,glowSprite,groundTile,mk,rr,ell,poly,seg,star});
Object.assign(exports,{WEAPONS,WEAPON_IDS,STARTERS,MAX_LEVEL,PASSIVES,PASSIVE_IDS,ENEMIES,ENEMY_IDS,MINIS,SPAWNS,MODES,DROPS,XP_TIERS,applyMod,weaponStats,weaponText,freshStats,calcStats,hpMul,capAt,rateAt,spawnWeights,buildSchedule,xpNeed});
