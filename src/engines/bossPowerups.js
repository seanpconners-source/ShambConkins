// Boss fights: power-ups (ROADMAP K16) and the players' ships (K15). Pickups drift down the arena in glowing capsules;
// flying into one gives your own plane: SPREAD (5-way fan), TURBO (double fire rate), MISSILES (homing rockets),
// SHIELD (soaks the next hit), BOMB (wipes every enemy bullet off the screen and hits the boss hard) or a HEART.
// The engine (bossFight.js) owns spawning, pickup and effects; this file holds the table, the weighted pick and the
// drawing (capsules, the power-up ring round a plane, missiles, and the two ships).
const TAU=Math.PI*2;
// t = seconds the effect lasts (0 = instant), col = capsule colour, name = popup text
const PU={
 spread:{t:10,col:'#ff4b3a',name:'SPREAD SHOT!',w:3},
 turbo:{t:10,col:'#3ad16b',name:'TURBO FIRE!',w:3},
 missile:{t:10,col:'#3aa8ff',name:'MISSILES!',w:2},
 shield:{t:15,col:'#7de8ff',name:'SHIELD!',w:3},
 bomb:{t:0,col:'#ffb02e',name:'SMART BOMB!',w:2},
 heart:{t:0,col:'#ff5a9a',name:'+1 HEART!',w:1}};
const PU_KINDS=Object.keys(PU);
// weighted pick; hurt = someone is low on hearts (hearts get likelier), r = a random number 0..1
function pickPowerup(r,hurt){const w=PU_KINDS.map(k=>k==='heart'&&hurt?5:PU[k].w),tot=w.reduce((a,b)=>a+b,0);let x=r*tot;for(let i=0;i<w.length;i++){if((x-=w[i])<0)return PU_KINDS[i];}return 'spread';}
// seconds until the next pickup: rarer on the higher tiers
// seconds to the next pickup: harder tiers drop them more often, so the player stays powerful in the storm (ROADMAP K25)
const puGap=(diff,r)=>(13+r*6)*(1-diff*.14);
function heart(g,x,y,s){g.beginPath();g.moveTo(x,y+s*.35);g.bezierCurveTo(x-s*.6,y-s*.05,x-s*.35,y-s*.55,x,y-s*.22);g.bezierCurveTo(x+s*.35,y-s*.55,x+s*.6,y-s*.05,x,y+s*.35);g.closePath();}
function glyph(g,k,r){g.fillStyle='#fff';g.strokeStyle='#14060a';g.lineWidth=2.2;g.lineJoin='round';
 if(k==='shield'){g.beginPath();g.moveTo(0,-r*.62);g.lineTo(r*.5,-r*.38);g.lineTo(r*.42,r*.2);g.quadraticCurveTo(r*.2,r*.55,0,r*.68);g.quadraticCurveTo(-r*.2,r*.55,-r*.42,r*.2);g.lineTo(-r*.5,-r*.38);g.closePath();g.stroke();g.fill();return;}
 if(k==='bomb'){g.beginPath();g.arc(0,r*.08,r*.45,0,TAU);g.fillStyle='#222';g.fill();g.stroke();g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.moveTo(r*.25,-r*.3);g.quadraticCurveTo(r*.45,-r*.6,r*.6,-r*.5);g.stroke();g.fillStyle='#ffe66a';g.beginPath();g.arc(r*.62,-r*.52,r*.13,0,TAU);g.fill();return;}
 if(k==='heart'){heart(g,0,r*.05,r*1.25);g.stroke();g.fill();return;}
 const L={spread:'S',turbo:'T',missile:'M'}[k]||'?';g.font=`900 ${Math.round(r*1.15)}px "Arial Black",Arial`;g.textAlign='center';g.textBaseline='middle';g.lineWidth=3.5;g.strokeText(L,0,r*.06);g.fillText(L,0,r*.06);}
// a capsule: glow, rotating dashed ring, metal rim, coloured gem with the kind's glyph; fade 0..1
function drawPickup(g,p,T){const d=PU[p.k],r=15,bob=Math.sin(T*4+p.id)*2.5,fade=p.fade??1;g.save();g.translate(p.x,p.y+bob);g.globalAlpha=fade;
 const gl=g.createRadialGradient(0,0,4,0,0,r*2.4);gl.addColorStop(0,d.col+'aa');gl.addColorStop(1,d.col+'00');g.fillStyle=gl;g.beginPath();g.arc(0,0,r*2.4,0,TAU);g.fill();
 g.save();g.rotate(T*2.2);g.setLineDash([6,5]);g.lineWidth=2.5;g.strokeStyle='#fff';g.beginPath();g.arc(0,0,r+6+Math.sin(T*6)*1.5,0,TAU);g.stroke();g.restore();
 const rim=g.createLinearGradient(-r,-r,r,r);rim.addColorStop(0,'#f4f6fa');rim.addColorStop(.5,'#8a93a3');rim.addColorStop(1,'#e6e9ef');g.fillStyle=rim;g.beginPath();g.arc(0,0,r+3,0,TAU);g.fill();g.lineWidth=2;g.strokeStyle='#14060a';g.stroke();
 const gem=g.createRadialGradient(-r*.35,-r*.35,1,0,0,r);gem.addColorStop(0,'#fff');gem.addColorStop(.35,d.col);gem.addColorStop(1,'#14060a');g.fillStyle=gem;g.beginPath();g.arc(0,0,r,0,TAU);g.fill();
 glyph(g,p.k,r);g.restore();}
// the power-up a plane carries: a ring round it that empties as the time runs out, and the shield's hex bubble
function drawPowerRing(g,x,y,pw,shield,T){if(pw&&PU[pw.k]?.t){const u=Math.max(0,pw.t/PU[pw.k].t),col=PU[pw.k].col;g.save();g.lineWidth=3;g.strokeStyle='rgba(0,0,0,.5)';g.beginPath();g.arc(x,y,31,0,TAU);g.stroke();g.strokeStyle=col;g.globalAlpha=u<.25?.5+.5*Math.sin(T*20):1;g.beginPath();g.arc(x,y,31,-Math.PI/2,-Math.PI/2+TAU*u);g.stroke();g.restore();}
 if(shield>0){g.save();g.globalAlpha=.35+.15*Math.sin(T*5);g.strokeStyle='#7de8ff';g.fillStyle='rgba(125,232,255,.12)';g.lineWidth=2.5;g.beginPath();for(let i=0;i<6;i++){const a=i/6*TAU+T*.8;g.lineTo(x+Math.cos(a)*38,y+Math.sin(a)*38);}g.closePath();g.fill();g.stroke();g.restore();}}
function drawMissile(g,q,col,T){g.save();g.translate(q.x,q.y);g.rotate(Math.atan2(q.vy,q.vx)+Math.PI/2);const fl=5+Math.sin(T*60+q.x)*2;g.fillStyle='#ffb02e';g.beginPath();g.moveTo(-2.5,7);g.lineTo(0,7+fl+4);g.lineTo(2.5,7);g.fill();
 g.fillStyle='#e8ecf2';g.strokeStyle='#14060a';g.lineWidth=1.2;g.beginPath();g.moveTo(0,-9);g.quadraticCurveTo(3,-5,3,0);g.lineTo(3,7);g.lineTo(-3,7);g.lineTo(-3,0);g.quadraticCurveTo(-3,-5,0,-9);g.fill();g.stroke();g.fillStyle=col;g.fillRect(-3,1,6,2.5);g.beginPath();g.moveTo(-3,4);g.lineTo(-6,8);g.lineTo(-3,7);g.moveTo(3,4);g.lineTo(6,8);g.lineTo(3,7);g.fill();g.restore();}
// ---- ships, drawn nose up at the origin (the engine has already rotated and banked the canvas)
const shadeFill=(g,x0,x1,light,mid,dark)=>{const gr=g.createLinearGradient(x0,0,x1,0);gr.addColorStop(0,light);gr.addColorStop(.5,mid);gr.addColorStop(1,dark);return gr;};
function lights(g,T,xl,xr,y){const on=Math.floor(T*2.5)%2===0;g.fillStyle=on?'#ff3b3b':'#5a1010';g.beginPath();g.arc(xl,y,2.4,0,TAU);g.fill();g.fillStyle=on?'#3bff7a':'#104a20';g.beginPath();g.arc(xr,y,2.4,0,TAU);g.fill();}
function pods(g,k,xs,y,col){for(const x of xs){if(k==='spread'){g.fillStyle='#4a4f5a';g.fillRect(x-2.5,y-10,5,12);g.strokeRect(x-2.5,y-10,5,12);g.fillStyle=col;g.fillRect(x-1.5,y-12,3,3);}
  else if(k==='missile'){g.fillStyle='#e8ecf2';g.beginPath();g.moveTo(x,y-11);g.lineTo(x+2.5,y-6);g.lineTo(x+2.5,y+4);g.lineTo(x-2.5,y+4);g.lineTo(x-2.5,y-6);g.closePath();g.fill();g.stroke();}}}
// i 0 = gold delta fighter, 1 = pink twin-engine biplane jet; o: {main,dark,T,ink,pw}
function drawShip(g,i,o){const {main,dark,T,ink}=o,pk=o.pw?.k;g.lineJoin='round';g.lineWidth=2.6;g.strokeStyle=ink;
 const fl=10+Math.sin(T*50+i)*5;
 const flame=(x,y,w)=>{const gr=g.createLinearGradient(0,y,0,y+fl+10);gr.addColorStop(0,'#fff6c0');gr.addColorStop(.4,'#ffb02e');gr.addColorStop(1,'rgba(255,60,20,0)');g.fillStyle=gr;g.beginPath();g.moveTo(x-w,y);g.quadraticCurveTo(x,y+fl+12,x+w,y);g.fill();};
 if(i===0){flame(-5,22,3.6);flame(5,22,3.6);
  // swept wings with stripes
  g.fillStyle=shadeFill(g,-36,36,'#fff2c8',main,dark);g.beginPath();g.moveTo(-6,-6);g.lineTo(-36,16);g.lineTo(-36,23);g.lineTo(-9,17);g.lineTo(9,17);g.lineTo(36,23);g.lineTo(36,16);g.lineTo(6,-6);g.closePath();g.fill();g.stroke();
  g.fillStyle=dark;g.beginPath();g.moveTo(-30,16);g.lineTo(-22,11);g.lineTo(-22,15);g.closePath();g.moveTo(30,16);g.lineTo(22,11);g.lineTo(22,15);g.closePath();g.fill();
  // tail fins
  g.fillStyle=dark;for(const sd of [-1,1]){g.beginPath();g.moveTo(sd*6,12);g.lineTo(sd*15,28);g.lineTo(sd*8,26);g.lineTo(sd*4,18);g.closePath();g.fill();g.stroke();}
  // fuselage: needle nose, engines at the back
  g.fillStyle=shadeFill(g,-9,9,'#fffbe8',main,dark);g.beginPath();g.moveTo(0,-36);g.quadraticCurveTo(8,-18,8,4);g.lineTo(8,22);g.lineTo(-8,22);g.lineTo(-8,4);g.quadraticCurveTo(-8,-18,0,-36);g.fill();g.stroke();
  g.fillStyle='#2a2f3a';g.fillRect(-8,19,7,5);g.fillRect(1,19,7,5);g.strokeRect(-8,19,7,5);g.strokeRect(1,19,7,5);
  g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=1;g.beginPath();g.moveTo(-5,-20);g.lineTo(-5,14);g.moveTo(5,-20);g.lineTo(5,14);g.stroke();g.strokeStyle=ink;g.lineWidth=2.6;
  lights(g,T,-35,35,19);pods(g,pk,[-24,24],14,main);}
 else{flame(-15,14,3);flame(15,14,3);
  // lower wing, twin engine nacelles, upper wing, tail
  g.fillStyle=shadeFill(g,-34,34,'#ffe0f0',main,dark);g.beginPath();g.roundRect?g.roundRect(-36,-1,72,11,4):g.rect(-36,-1,72,11);g.fill();g.stroke();
  for(const sd of [-1,1]){g.fillStyle=shadeFill(g,sd*15-5,sd*15+5,'#ffe0f0',main,dark);g.beginPath();g.ellipse(sd*15,2,5,12,0,0,TAU);g.fill();g.stroke();g.fillStyle='#2a2f3a';g.fillRect(sd*15-3,11,6,3);}
  g.fillStyle=dark;g.beginPath();g.moveTo(-12,24);g.lineTo(12,24);g.lineTo(8,30);g.lineTo(-8,30);g.closePath();g.fill();g.stroke();
  g.fillStyle=shadeFill(g,-7,7,'#ffe0f0',main,dark);g.beginPath();g.moveTo(0,-34);g.quadraticCurveTo(7,-24,7,-8);g.lineTo(5,26);g.lineTo(-5,26);g.lineTo(-7,-8);g.quadraticCurveTo(-7,-24,0,-34);g.fill();g.stroke();
  g.fillStyle=shadeFill(g,-32,32,'#ffe0f0',main,dark);g.beginPath();g.roundRect?g.roundRect(-32,-18,64,10,4):g.rect(-32,-18,64,10);g.fill();g.stroke();
  g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1.5;g.beginPath();g.moveTo(-26,-8);g.lineTo(-26,-1);g.moveTo(26,-8);g.lineTo(26,-1);g.stroke();g.strokeStyle=ink;g.lineWidth=2.6;
  g.fillStyle='#fff';g.beginPath();g.arc(-20,4,3,0,TAU);g.arc(20,4,3,0,TAU);g.fill();
  lights(g,T,-34,34,4);pods(g,pk,[-29,29],-6,main);}
 // canopy glass (the pilot's head sits on it)
 const cg=g.createRadialGradient(-6,-6,2,0,0,20);cg.addColorStop(0,'rgba(255,255,255,.75)');cg.addColorStop(1,'rgba(150,215,255,.35)');g.fillStyle=cg;g.beginPath();g.arc(0,0,19,0,TAU);g.fill();g.lineWidth=2.6;g.stroke();}
Object.assign(exports,{PU,PU_KINDS,pickPowerup,puGap,drawPickup,drawPowerRing,drawMissile,drawShip});
