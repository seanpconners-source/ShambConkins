// Judgment Day Chase drawn art: every vehicle, the T-1000, the helicopter, road surfaces and effects, seen from above.
// Drawn in game units with the nose pointing UP (-y). Each draw first tries the GPT picture (src/data/tchaseSprites.js)
// and falls back to these drawings, so the game looks finished before any art arrives.
const TS=require("src/data/tchaseSprites.js");

const rr=(x,px,py,w,h,r)=>{r=Math.min(r,w/2,h/2);x.beginPath();x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath();};
function shade(hex,k){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const f=c=>Math.max(0,Math.min(255,Math.round(k<0?c*(1+k):c+(255-c)*k)));return `rgb(${f(r)},${f(g)},${f(b)})`;}
const CIV_COLS=['#c0392b','#ecf0f1','#f1c40f','#27ae60','#7fb3d5','#1c1c22'];

// generic car body: w x h units, body colour, nose up
function body(x,w,h,col,{roof=.42,glass='#0d1626',stripes=null,cab=0}={}){
 // shadow
 x.fillStyle='rgba(0,0,0,.35)';rr(x,-w/2+3,-h/2+5,w,h,w*.28);x.fill();
 // wheels peeking out
 x.fillStyle='#111';for(const sy of [-.3,.3])for(const sx of [-1,1]){rr(x,sx*w/2-(sx>0?3:1),sy*h-6,4,12,2);x.fill();}
 const g=x.createLinearGradient(-w/2,0,w/2,0);g.addColorStop(0,shade(col,-.35));g.addColorStop(.25,col);g.addColorStop(.55,shade(col,.18));g.addColorStop(1,shade(col,-.4));
 x.fillStyle=g;rr(x,-w/2,-h/2,w,h,w*.28);x.fill();
 if(stripes)stripes();
 // windshield, roof, rear window
 x.fillStyle=glass;rr(x,-w*.38,-h*.22,w*.76,h*.14,4);x.fill();rr(x,-w*.36,h*.2,w*.72,h*.09,3);x.fill();
 const rg=x.createLinearGradient(0,-h*.1,0,h*.2);rg.addColorStop(0,shade(col,.1));rg.addColorStop(1,shade(col,-.15));x.fillStyle=rg;rr(x,-w*.36,-h*.08,w*.72,h*roof*.66,5);x.fill();
 // windshield sheen
 x.fillStyle='rgba(255,255,255,.14)';x.beginPath();x.moveTo(-w*.3,-h*.21);x.lineTo(-w*.1,-h*.21);x.lineTo(-w*.22,-h*.09);x.lineTo(-w*.34,-h*.09);x.fill();
 // hood line + mirrors
 x.strokeStyle='rgba(0,0,0,.25)';x.lineWidth=1;x.beginPath();x.moveTo(-w*.25,-h*.46);x.lineTo(-w*.3,-h*.24);x.moveTo(w*.25,-h*.46);x.lineTo(w*.3,-h*.24);x.stroke();
 x.fillStyle=shade(col,-.3);x.fillRect(-w/2-3,-h*.18,4,5);x.fillRect(w/2-1,-h*.18,4,5);}
function lightsFront(x,w,h,on){x.fillStyle=on?'#fffbe0':'#c9c3a0';x.fillRect(-w*.42,-h/2+1,w*.2,3);x.fillRect(w*.22,-h/2+1,w*.2,3);}
function lightsRear(x,w,h,brake){x.fillStyle=brake?'#ff2a2a':'#8c1010';x.fillRect(-w*.42,h/2-3,w*.18,3);x.fillRect(w*.24,h/2-3,w*.18,3);}

// ---------------------------------------------------------------- vehicles
function car(x,kind,o={}){const t=o.t||0,night=!!o.night;
 switch(kind){
  case 'cruiser':{if(TS.sheet(x,'cruiser',(t*6|0)%2,0,0))break;const w=36,h=66;
   body(x,w,h,'#16161c',{stripes:()=>{x.fillStyle='#f4f4f4';x.fillRect(-w/2+1,-h*.1,w-2,h*.32);}});
   x.fillStyle='#f4f4f4';rr(x,-w*.36,-h*.08,w*.72,h*.27,5);x.fill();x.fillStyle='#111';x.font='bold 9px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(String(o.id%90+10),0,h*.08);
   const a=(t*6|0)%2;x.fillStyle=a?'#ff2020':'#501010';x.fillRect(-w*.34,-h*.06,w*.32,5);x.fillStyle=a?'#102050':'#2a6cff';x.fillRect(w*.02,-h*.06,w*.32,5);
   lightsFront(x,w,h,night);lightsRear(x,w,h,o.brake);break;}
  case 'civ':{if(TS.pic(x,'civ-'+((o.col|0)%6+1),0,0))break;const w=34,h=60;body(x,w,h,CIV_COLS[(o.col|0)%6]);lightsFront(x,w,h,night);lightsRear(x,w,h,o.brake);
   if(o.blink>0&&(t*4|0)%2){x.fillStyle='#ffb000';const s=o.bdir||1;x.fillRect(s*w/2-(s>0?4:0),-h/2+2,4,4);x.fillRect(s*w/2-(s>0?4:0),h/2-6,4,4);}break;}
  case 'truck':{if(TS.pic(x,o.rig?'rig':'truck',0,0))break;const w=46,h=104;
   x.fillStyle='rgba(0,0,0,.35)';rr(x,-w/2+3,-h/2+5,w,h,6);x.fill();
   // cab
   body(x,w,30,o.rig?'#1c1f24':'#b83227',{roof:.3});x.save();x.translate(0,0);
   x.fillStyle=o.rig?'#22262c':'#9a9da3';rr(x,-w/2,-h/2+30,w,h-30,3);x.fill();x.fillStyle='rgba(255,255,255,.08)';for(let i=0;i<6;i++)x.fillRect(-w/2+2,-h/2+36+i*11,w-4,2);
   if(o.rig){x.fillStyle='#0a0';x.globalAlpha=.6+.4*Math.sin(t*6);x.fillRect(-w/2+4,h/2-8,w-8,3);x.globalAlpha=1;x.fillStyle='#444';x.fillRect(-w/2+6,h/2,w-12,16);x.fillStyle='#ffd23f';for(let i=0;i<4;i++)x.fillRect(-w/2+8+i*8,h/2+4,4,10);}
   x.restore();x.save();x.translate(0,-h/2+15);x.restore();break;}
  case 'swat':{if(TS.pic(x,'swat',0,0))break;const w=44,h=84;body(x,w,h,'#1b2230',{roof:.6});x.fillStyle='#3a4352';for(let i=0;i<3;i++)x.fillRect(-w*.42,-h*.05+i*12,w*.84,3);
   x.fillStyle='#ddd';x.font='bold 10px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('SWAT',0,h*.12);const a=(t*5|0)%2;x.fillStyle=a?'#f22':'#24f';x.fillRect(-w*.3,-h*.12,w*.6,4);lightsFront(x,w,h,night);break;}
  case 'roadcar':{x.save();x.rotate(Math.PI/2);car(x,'cruiser',o);x.restore();break;}
  case 'wagon':{if(TS.pic(x,'wagon',0,0))break;const w=38,h=70;body(x,w,h,'#7a4a24',{roof:.7,stripes:()=>{x.fillStyle='#b98b55';x.fillRect(-w/2+1,-h*.15,3,h*.55);x.fillRect(w/2-4,-h*.15,3,h*.55);}});
   x.strokeStyle='#cfcfcf';x.lineWidth=1.5;x.strokeRect(-w*.3,-h*.05,w*.6,h*.4);lightsFront(x,w,h,night);break;}
  case 'van':{if(TS.pic(x,'van',0,0))break;const w=44,h=82;body(x,w,h,'#1d2a44',{roof:.62});x.fillStyle='#cfd6e4';x.font='bold 10px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('SWAT',0,h*.15);
   x.fillStyle='#555';x.fillRect(w/2-2,-h*.05,14,4);x.fillStyle='#888';x.fillRect(w/2+8,-h*.07,8,8);lightsFront(x,w,h,night);break;}
  case 'pickup':{if(TS.pic(x,'pickup',0,0))break;const w=40,h=76;body(x,w,h,'#2d3436',{roof:.3});x.fillStyle='#1e2324';rr(x,-w*.4,h*.05,w*.8,h*.4,3);x.fill();
   x.fillStyle='#8a6a3a';x.fillRect(-w*.3,h*.12,w*.25,h*.14);x.fillRect(w*.05,h*.22,w*.25,h*.14);lightsFront(x,w,h,night);break;}
  case 'towtruck':{if(TS.pic(x,'towtruck',0,0))break;const w=58,h=128;
   x.fillStyle='rgba(0,0,0,.4)';rr(x,-w/2+4,-h/2+6,w,h,8);x.fill();
   x.save();x.translate(0,-h/2+26);body(x,w,52,'#e67e22',{roof:.4});x.fillStyle=(t*4|0)%2?'#ffbf00':'#7a5a00';x.fillRect(-w*.3,-6,w*.6,5);x.restore();
   x.fillStyle='#3d3d42';rr(x,-w/2+2,-h/2+54,w-4,h-56,4);x.fill();x.fillStyle='#55565c';x.fillRect(-4,-h/2+56,8,h-66);
   x.strokeStyle='#999';x.lineWidth=2;x.beginPath();x.moveTo(0,h/2-12);x.lineTo(0,h/2+6);x.stroke();x.fillStyle='#aaa';x.beginPath();x.arc(0,h/2+8,4,0,7);x.fill();
   for(let i=0;i<4;i++){x.fillStyle='rgba(255,255,255,.07)';x.fillRect(-w/2+4,-h/2+62+i*14,w-8,3);}break;}
  case 'tanker':{if(TS.pic(x,'tanker',0,0))break;const w=62,h=190;
   x.fillStyle='rgba(0,0,0,.4)';rr(x,-w/2+4,-h/2+6,w,h,10);x.fill();
   x.save();x.translate(0,-h/2+22);body(x,w-6,44,'#e8e8ea',{roof:.35});x.restore();
   const g=x.createLinearGradient(-w/2,0,w/2,0);g.addColorStop(0,'#6d7681');g.addColorStop(.35,'#e9eef5');g.addColorStop(.6,'#b7c0cb');g.addColorStop(1,'#59616b');
   x.fillStyle=g;rr(x,-w/2,-h/2+48,w,h-52,w/2);x.fill();x.strokeStyle='rgba(0,0,0,.25)';for(let i=1;i<5;i++){x.beginPath();x.moveTo(-w/2+3,-h/2+48+i*(h-52)/5);x.lineTo(w/2-3,-h/2+48+i*(h-52)/5);x.stroke();}
   x.fillStyle='rgba(220,240,255,.35)';x.fillRect(-w*.18,-h/2+56,6,h-70);
   x.fillStyle='#ffd23f';for(let i=0;i<6;i++){x.save();x.translate(-w/2+4+i*10,h/2-8);x.rotate(.5);x.fillRect(0,0,4,9);x.restore();}
   if(o.valves)for(const v of o.valves){const on=v.hp>0;x.fillStyle=on?`rgba(79,195,255,${.6+.4*Math.sin(t*8)})`:'#333';x.beginPath();x.arc(v.dx,v.dy,7,0,7);x.fill();x.strokeStyle=on?'#cff':'#111';x.lineWidth=2;x.stroke();
    if(on&&v.hp<v.max){x.fillStyle='#f33';x.fillRect(v.dx-9,v.dy-13,18*v.hp/v.max,3);}}
   break;}}
 if(o.flash>0){x.globalCompositeOperation='lighter';x.fillStyle=`rgba(255,255,255,${Math.min(.6,o.flash*6)})`;rr(x,-18,-30,36,60,10);x.fill();x.globalCompositeOperation='source-over';}}

// the hero's bike with its rider (the game draws the face on top)
function bike(x,o={}){const lean=o.lean||0,f=lean<-.3?0:lean>.3?2:1;if(TS.sheet(x,'bike',f,0,0,lean*.2))return [0,-1+lean*2];
 x.save();x.rotate(lean*.2);x.fillStyle='rgba(0,0,0,.35)';rr(x,-8,-20,18,46,8);x.fill();
 x.fillStyle='#111';rr(x,-4,-24,8,13,3);x.fill();rr(x,-4,12,8,14,3);x.fill();// wheels
 x.fillStyle='#202024';rr(x,-6,-12,12,26,5);x.fill();const g=x.createLinearGradient(-5,0,5,0);g.addColorStop(0,'#333');g.addColorStop(.5,'#9aa0a8');g.addColorStop(1,'#333');x.fillStyle=g;rr(x,-4,-12,8,10,3);x.fill();
 x.strokeStyle='#c8ccd6';x.lineWidth=2;x.beginPath();x.moveTo(-10,-14);x.lineTo(10,-14);x.stroke();// bars
 x.fillStyle='#ccc';x.fillRect(-8,8,3,10);x.fillRect(5,8,3,10);// pipes
 // rider: leather jacket shoulders + arms to the bars
 x.fillStyle='#16161a';rr(x,-11,-6,22,18,8);x.fill();x.strokeStyle='#16161a';x.lineWidth=5;x.lineCap='round';x.beginPath();x.moveTo(-9,-2);x.lineTo(-10,-13);x.moveTo(9,-2);x.lineTo(10,-13);x.stroke();
 x.fillStyle='rgba(255,255,255,.12)';x.fillRect(-9,-4,4,12);
 if(o.headlight){x.fillStyle='#fffbe0';x.fillRect(-2,-26,4,3);}
 x.restore();return [lean*2,-1];}
function moto(x,o={}){const t=o.t||0;if(TS.sheet(x,o.boss?'t1000-bike':'moto',o.blade?1:0,0,0,o.lean||0))return;
 x.save();x.rotate((o.lean||0)*.2);x.fillStyle='rgba(0,0,0,.35)';rr(x,-7,-19,16,42,7);x.fill();x.fillStyle='#111';rr(x,-3.5,-22,7,12,3);x.fill();rr(x,-3.5,10,7,12,3);x.fill();
 x.fillStyle=o.boss?'#1a2a55':'#f2f2f2';rr(x,-5,-11,10,24,4);x.fill();x.fillStyle='#2a6cff';x.fillRect(-5,-2,10,3);
 x.fillStyle=o.boss?'#14203f':'#1c2c50';rr(x,-9,-5,18,15,7);x.fill();
 if(!o.boss){x.fillStyle='#f4f4f4';x.beginPath();x.arc(0,-2,6,0,7);x.fill();x.fillStyle='#223';x.fillRect(-4,-6,8,3);}
 const a=(t*6|0)%2;x.fillStyle=a?'#f22':'#24f';x.fillRect(-5,12,4,3);x.fillStyle=a?'#24f':'#f22';x.fillRect(1,12,4,3);
 if(o.blade){const g=x.createLinearGradient(8,0,40,0);g.addColorStop(0,'#9aa');g.addColorStop(.5,'#fff');g.addColorStop(1,'#bcd');x.fillStyle=g;x.beginPath();x.moveTo(8,-2);x.lineTo(44,-8);x.lineTo(46,-5);x.lineTo(8,3);x.fill();}
 x.restore();}
// the T-1000 running; liquid-metal holes where bullets hit; the game draws his face
function t1000(x,o={}){const t=o.t||0,st=o.state||'run';
 if(st==='puddle'||st==='reform'){const k=st==='puddle'?Math.min(1,o.st/.3):1-Math.min(1,o.st/1.1);if(TS.sheet(x,'t1000-splash',st==='puddle'?(o.st<.25?1:2):3,0,0))return false;
  const g=x.createRadialGradient(-4,-4,2,0,0,26);g.addColorStop(0,'#ffffff');g.addColorStop(.35,'#b9c4d2');g.addColorStop(1,'#4c5663');x.fillStyle=g;
  x.beginPath();for(let i=0;i<14;i++){const a=i/14*6.283,r=(18+6*Math.sin(i*2.3+t*5))*(.4+.6*k)+(st==='reform'?Math.sin(t*12+i)*3:0);x.lineTo(Math.cos(a)*r*1.3,Math.sin(a)*r);}x.closePath();x.fill();
  if(st==='reform'){x.fillStyle='rgba(30,45,80,.7)';rr(x,-8,-16*(1-k),16,22*(1-k)+2,6);x.fill();}return st==='reform'&&k<.5;}
 if(TS.sheet(x,'t1000-run',(t*12|0)%6,0,0,o.lean||0))return true;
 const sw=Math.sin(t*14)*(st==='crouch'?.2:1),crouch=st==='crouch'?.8:1;
 x.save();x.scale(1,crouch);x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(3,6,14,9,0,0,7);x.fill();
 // legs
 x.fillStyle='#152241';rr(x,-7,2+sw*6,6,14,3);x.fill();rr(x,1,2-sw*6,6,14,3);x.fill();x.fillStyle='#0b0b0f';x.fillRect(-7,13+sw*6,6,4);x.fillRect(1,13-sw*6,6,4);
 // torso + arms
 x.fillStyle='#1b2a52';rr(x,-10,-10,20,16,7);x.fill();x.fillStyle='#0d0d12';x.fillRect(-10,3,20,3);
 x.fillStyle='#1b2a52';rr(x,-14,-8-sw*7,6,13,3);x.fill();rr(x,8,-8+sw*7,6,13,3);x.fill();
 if(st==='leap'||st==='land'){const g=x.createLinearGradient(8,0,30,-20);g.addColorStop(0,'#9aa');g.addColorStop(1,'#fff');x.fillStyle=g;x.beginPath();x.moveTo(10,-6);x.lineTo(34,-26);x.lineTo(30,-22);x.lineTo(13,0);x.fill();x.beginPath();x.moveTo(-10,-6);x.lineTo(-34,-26);x.lineTo(-30,-22);x.lineTo(-13,0);x.fill();}
 // silver bullet holes
 for(let i=0;i<Math.min(8,o.splash|0);i++){const a=i*2.4,r=4+(i*3)%7;x.fillStyle='#e9eef5';x.beginPath();x.arc(Math.cos(a)*r,Math.sin(a)*r-2,1.8+(i%3)*.5,0,7);x.fill();x.fillStyle='#7c8794';x.beginPath();x.arc(Math.cos(a)*r+.6,Math.sin(a)*r-1.4,.8,0,7);x.fill();}
 x.restore();return true;}
// helicopter: body + spinning rotor + its shadow far below (alt = how high)
function heli(x,o={}){const t=o.t||0;if(!TS.pic(x,'heli',0,0)){const w=34,h=86;
  x.fillStyle='#1d2a44';x.beginPath();x.ellipse(0,-8,16,26,0,0,7);x.fill();x.fillStyle='#e8e8ec';x.beginPath();x.ellipse(0,-12,13,10,0,0,7);x.fill();
  x.fillStyle='#0d1626';x.beginPath();x.ellipse(0,-26,10,8,0,3.3,6.1);x.fill();x.fillStyle='#1d2a44';x.fillRect(-3,14,6,40);x.fillRect(-12,50,24,4);
  x.strokeStyle='#555';x.lineWidth=2;x.beginPath();x.moveTo(-18,-24);x.lineTo(-18,10);x.moveTo(18,-24);x.lineTo(18,10);x.stroke();
  x.fillStyle='rgba(200,200,200,.4)';x.beginPath();x.arc(14,52,7,0,7);x.fill();void w;void h;}
 // rotor
 x.save();x.rotate(t*28);const rp=TS.picture('heli-rotor');if(rp){x.globalAlpha=.85;x.drawImage(rp,-65,-65,130,130);x.globalAlpha=1;}
 else{x.fillStyle='rgba(20,20,25,.18)';x.beginPath();x.arc(0,0,62,0,7);x.fill();x.fillStyle='#1a1a1f';x.fillRect(-62,-2.5,124,5);x.fillRect(-2.5,-62,5,124);}
 x.restore();x.fillStyle='#333';x.beginPath();x.arc(0,0,4,0,7);x.fill();}
function heliShadow(x){x.fillStyle='rgba(0,0,0,.28)';x.beginPath();x.ellipse(0,0,22,40,0,0,7);x.fill();x.beginPath();x.arc(0,0,58,0,7);x.fillStyle='rgba(0,0,0,.08)';x.fill();}

// ---------------------------------------------------------------- road textures (made once per look)
const PAT={};
function pattern(x,name,night){const key=name+(night?':n':'');if(PAT[key])return PAT[key];
 const img=TS.picture(name.startsWith('asphalt')?(night&&name!=='asphalt-canal'?'asphalt-night':name):name);
 if(img){const p=x.createPattern(img,'repeat');if(p){PAT[key]={p,size:img.width/TS.PX};return PAT[key];}}
 const S=256,c=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(S,S):Object.assign(document.createElement('canvas'),{width:S,height:S}),g=c.getContext('2d');
 const fill={'asphalt-street':'#3a3b40','asphalt-canal':'#9a9a94','asphalt-night':'#26272c','ground-street':'#8d877c','ground-canal':'#a8a59c','ground-highway':'#5a5233','ground-city':'#5a5856','ground-freeway':'#4f4a2e'}[name]||'#444';
 g.fillStyle=night&&!name.startsWith('asphalt')?shade(fill,-.45):fill;g.fillRect(0,0,S,S);
 let r=1;const rnd=()=>{r=(r*16807)%2147483647;return r/2147483647;};
 for(let i=0;i<2600;i++){const v=rnd();g.fillStyle=v<.5?`rgba(0,0,0,${rnd()*.12})`:`rgba(255,255,255,${rnd()*.07})`;g.fillRect(rnd()*S,rnd()*S,1+rnd()*2,1+rnd()*2);}
 if(name==='ground-street'||name==='ground-city'){g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=1;for(let i=0;i<=S;i+=32){g.beginPath();g.moveTo(i,0);g.lineTo(i,S);g.moveTo(0,i);g.lineTo(S,i);g.stroke();}}
 if(name==='ground-canal'||name==='asphalt-canal'){g.strokeStyle='rgba(0,0,0,.2)';g.lineWidth=2;for(let i=0;i<=S;i+=64){g.beginPath();g.moveTo(0,i);g.lineTo(S,i);g.stroke();}for(let i=0;i<14;i++){g.fillStyle=`rgba(60,50,30,${.05+rnd()*.08})`;g.beginPath();g.ellipse(rnd()*S,rnd()*S,8+rnd()*30,4+rnd()*12,rnd()*3,0,7);g.fill();}}
 if(name==='ground-highway'||name==='ground-freeway'){for(let i=0;i<90;i++){g.fillStyle=`rgba(${60+rnd()*40|0},${70+rnd()*40|0},${30+rnd()*20|0},.5)`;g.beginPath();g.arc(rnd()*S,rnd()*S,2+rnd()*7,0,7);g.fill();}}
 const p=x.createPattern(c,'repeat');PAT[key]={p,size:S};return PAT[key];}

// pickups, icons
const PK_ICON={repair:'🔧',grenade:'💣',nitro:'🔥',weapon:'🔫',shield:'🛡️',cash:'$'};
function pickup(x,kind,t,col){if(TS.pic(x,'pk-'+kind,0,0))return;const g=x.createRadialGradient(0,0,2,0,0,18);g.addColorStop(0,col+'ff');g.addColorStop(1,col+'00');x.fillStyle=g;x.beginPath();x.arc(0,0,18+Math.sin(t*6)*2,0,7);x.fill();
 x.fillStyle='rgba(10,12,20,.85)';x.beginPath();x.arc(0,0,11,0,7);x.fill();x.strokeStyle=col;x.lineWidth=2;x.stroke();x.font='12px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';x.fillText(PK_ICON[kind]||'?',0,1);}

// particles (in units, unrotated)
function particle(x,f){const k=f.t/f.life;
 if(f.kind==='boom'){const fr=Math.min(7,k*8|0);if(TS.sheet(x,'explosion',fr,0,0,0,f.r/48))return;
  x.globalCompositeOperation='lighter';const r=f.r*(.4+k*.9);const g=x.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,`rgba(255,255,220,${1-k})`);g.addColorStop(.35,`rgba(255,170,40,${.9*(1-k)})`);g.addColorStop(1,'rgba(255,60,0,0)');x.fillStyle=g;x.beginPath();x.arc(0,0,r,0,7);x.fill();x.globalCompositeOperation='source-over';
  x.strokeStyle=`rgba(255,240,200,${.6*(1-k)})`;x.lineWidth=3;x.beginPath();x.arc(0,0,f.r*(.6+k*1.6),0,7);x.stroke();return;}
 if(f.kind==='fire'){x.globalCompositeOperation='lighter';x.fillStyle=`rgba(255,${120+120*(1-k)|0},30,${.8*(1-k)})`;x.beginPath();x.arc(0,0,f.r*(1-k*.5),0,7);x.fill();x.globalCompositeOperation='source-over';return;}
 if(f.kind==='smoke'){x.fillStyle=`rgba(40,40,44,${.45*(1-k)})`;x.beginPath();x.arc(0,0,f.r*(.6+k*1.6),0,7);x.fill();return;}
 if(f.kind==='spark'){x.strokeStyle=`rgba(255,230,120,${1-k})`;x.lineWidth=1.6;x.beginPath();x.moveTo(0,0);x.lineTo(-f.vx*.025,f.vy*.0+(-f.vy+0)*.0);x.lineTo(-f.vx*.03,-(f.vy*.0));x.stroke();x.fillStyle=`rgba(255,250,200,${1-k})`;x.fillRect(-1,-1,2,2);return;}
 if(f.kind==='debris'){x.save();x.rotate(f.spin+f.t*10);x.fillStyle=`rgba(30,30,34,${1-k*.5})`;x.fillRect(-f.r,-f.r*.6,f.r*2,f.r*1.2);x.restore();return;}
 if(f.kind==='dust'){x.fillStyle=`rgba(180,170,150,${.35*(1-k)})`;x.beginPath();x.arc(0,0,f.r*(1+k*2),0,7);x.fill();return;}
 if(f.kind==='metal'){x.fillStyle=`rgba(230,238,250,${1-k})`;x.beginPath();x.arc(0,0,f.r*(1-k*.6),0,7);x.fill();return;}
 if(f.kind==='ln2'){x.fillStyle=`rgba(225,245,255,${.42*(1-k)})`;x.beginPath();x.arc(0,0,f.r*(.8+k*1.4),0,7);x.fill();return;}}

Object.assign(exports,{car,bike,moto,t1000,heli,heliShadow,pattern,pickup,particle,rr,shade,CIV_COLS});
