// Castlevania · Symphony of the Night: drawing. Everything is vector art drawn on the canvas in world units (the engine
// scales the context); no sprites are copied from the game. The hero is a caped, silver-haired dhampir in Alucard's
// style wearing the player's own head. Also here: the monsters, Death, Dracula and his demon form, pickups, projectiles,
// and the parallax scenery (moonlit forest and castle, the gate, the entrance hall, the caverns, the marble gallery
// and the throne room), pre-rendered per scale where it is static.
const VH=240;
const TAU=Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,k)=>a+(b-a)*k;

// ------------------------------------------------------------------ glows (additive light sprites)
const glows=new Map();
function glowSprite(col){let c=glows.get(col);if(c)return c;c=document.createElement('canvas');c.width=c.height=64;const q=c.getContext('2d'),gr=q.createRadialGradient(32,32,0,32,32,32);
 gr.addColorStop(0,col);gr.addColorStop(.25,col.replace(/[\d.]+\)$/,m=>String(parseFloat(m)*.45)+')'));gr.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=gr;q.fillRect(0,0,64,64);glows.set(col,c);return c;}
function glow(g,x,y,r,col,a=1){if(a<=0||r<=0)return;const prev=g.globalCompositeOperation,pa=g.globalAlpha;g.globalCompositeOperation='lighter';g.globalAlpha=pa*clamp(a,0,1);g.drawImage(glowSprite(col),x-r,y-r,r*2,r*2);g.globalAlpha=pa;g.globalCompositeOperation=prev;}
const GLOW={fire:'rgba(255,140,40,1)',warm:'rgba(255,170,90,1)',moon:'rgba(150,180,255,1)',red:'rgba(255,40,40,1)',blood:'rgba(200,0,20,1)',purple:'rgba(170,80,255,1)',white:'rgba(255,255,255,1)',blue:'rgba(80,150,255,1)',green:'rgba(80,255,160,1)',gold:'rgba(255,215,90,1)'};

function poly(g,pts,fill){g.beginPath();g.moveTo(pts[0],pts[1]);for(let k=2;k<pts.length;k+=2)g.lineTo(pts[k],pts[k+1]);g.closePath();if(fill){g.fillStyle=fill;g.fill();}}
function line(g,x0,y0,x1,y1,w,col){g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();}
function limb(g,ax,ay,bx,by,cx,cy,w,col){g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.lineTo(cx,cy);g.stroke();}
function circ(g,x,y,r,fill){g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle=fill;g.fill();}
function ell(g,x,y,rx,ry,fill,rot=0){g.beginPath();g.ellipse(x,y,rx,ry,rot,0,TAU);g.fillStyle=fill;g.fill();}

// ------------------------------------------------------------------ the hero
const HERO_PAL=[{coat:'#1d1528',coat2:'#2c2140',trim:'#c9a24a',cape:'#0a0609',lining:'#9e0f22',hair:'#e8edf5',hair2:'#a9b3c6',pants:'#141018',boot:'#2d201a',boot2:'#4a352a'},
 {coat:'#16182c',coat2:'#232846',trim:'#b8c4d8',cape:'#07080d',lining:'#1f45a8',hair:'#eef0f6',hair2:'#a7afc3',pants:'#11121a',boot:'#251c19',boot2:'#3d302a'}];
const BLADES={alucard:{len:30,w:1.7,col:'#d6ecff',edge:'#7fa6d6',guard:'#d8b04a',glow:GLOW.blue},short:{len:18,w:1.4,col:'#dfe3ea',edge:'#8a93a3',guard:'#a8884a'},
 claymore:{len:32,w:2.4,col:'#d2d6de',edge:'#7a8090',guard:'#8a6a3a'}};
// q: {x,y,facing,pose,anim,vx,vy,t,atkK (0..1 swing), weapon, i, crouch}
function heroPose(q){return q.pose||'stand';}
function drawHero(g,q,o={}){
 const sil=o.sil||null,pal=sil?null:(o.pal||HERO_PAL[q.i||0]),f=q.facing||1,pose=heroPose(q),t=q.t||0;
 const C=k=>sil||pal[k];
 g.save();g.translate(q.x,q.y);
 if(pose==='dead'){g.translate(-f*10,-3);g.rotate(-f*1.45);}
 g.save();g.scale(f,1);
 const crouch=pose==='crouch'||pose==='crouchAtk',dy=crouch?8:0,run=Math.abs(q.vx||0),ph=q.anim||0;
 const lean=pose==='dash'?-.18:pose==='hurt'?-.25:pose==='attack'||pose==='crouchAtk'?.06:pose==='walk'?.05:0;
 // ---- cape (behind everything)
 const flare=pose==='cast'?26:pose==='dash'?20:9+Math.min(15,run*6),lift=clamp((q.vy||0)*2.6,-8,16)+(pose==='cast'?10:0),wav=Math.sin(t*9)*1.6;
 const hbx=-flare-4,hby=-1-lift+dy,cape=[-5,-31+dy, -10-flare*.4,-21+dy-lift*.35, hbx,hby, hbx*.78,hby+2+wav, hbx*.55,hby-1.5-wav*.6+lift*.15, hbx*.3,hby+1.5+wav*.5+lift*.2, -1,-1+dy+wav*.4, 3,-3+dy, 4.5,-31+dy];
 g.save();g.rotate(lean*.5);
 poly(g,cape,C('lining'));
 const inner=cape.slice();for(let k=0;k<inner.length;k+=2){inner[k]=inner[k]*.88+1.2;if(k>=4&&k<=10)inner[k+1]-=1.6;}poly(g,inner,C('cape'));
 if(pose==='cast'){const front=[3,-30+dy,14+flare*.5,-20,18+flare*.4,-6,6,-6];poly(g,front,C('lining'));const fi=front.map((v,k)=>k%2?v-1:v*.85);poly(g,fi,C('cape'));}
 g.restore();
 g.save();g.translate(0,dy);g.rotate(lean);
 // ---- legs
 const hip=[-1.5,-15],hip2=[1.5,-15];let fa,fb,ka,kb;
 if(crouch){fa=[-5,-dy];fb=[5,-dy];ka=[3,-9];kb=[8,-8];}
 else if(pose==='jump'){fa=[-4,-5];fb=[3,-3];ka=[-1,-10];kb=[6,-9];}
 else if(pose==='fall'){fa=[-3,0];fb=[4,-1];ka=[-2,-7];kb=[5,-8];}
 else if(pose==='dash'){fa=[-7,0];fb=[5,0];ka=[-4,-7];kb=[4,-8];}
 else if(pose==='attack'){fa=[-6,0];fb=[7,0];ka=[-3,-8];kb=[6,-8];}
 else if(pose==='walk'){const a=Math.sin(ph),b=Math.sin(ph+Math.PI);fa=[a*7,-Math.max(0,Math.cos(ph))*3];fb=[b*7,-Math.max(0,Math.cos(ph+Math.PI))*3];ka=[a*4+2,-8];kb=[b*4+2,-8];}
 else if(pose==='hurt'){fa=[-5,-2];fb=[4,0];ka=[-2,-8];kb=[5,-7];}
 else{fa=[-3,0];fb=[3,0];ka=[-2,-8];kb=[2.5,-8];}
 g.lineCap='round';g.lineJoin='round';
 const leg=(h,k,ft,back)=>{limb(g,h[0],h[1],k[0],k[1],ft[0],ft[1]-2,3.4,back&&!sil?'#0d0a10':C('pants'));line(g,k[0]+(ft[0]-k[0])*.35,k[1]+(ft[1]-k[1])*.35,ft[0],ft[1]-1.5,3.8,C(back?'boot':'boot2'));if(!sil){g.fillStyle=pal.boot;g.fillRect(ft[0]-1.5,ft[1]-2.2,5,2.2);}};
 leg(hip,ka,fa,true);
 // back arm
 const atk=pose==='attack'||pose==='crouchAtk',k=q.atkK||0;
 if(!atk&&pose!=='cast')limb(g,-2,-28,-4,-22,-3+(pose==='walk'?-Math.sin(ph)*3:0),-17,2.6,sil||'#120d18');
 leg(hip2,kb,fb,false);
 // ---- coat
 const sway=(pose==='walk'?Math.sin(ph*2)*1.2:0)-Math.min(5,run*2)-(lift>0?lift*.15:0);
 poly(g,[-5,-30,5,-30,4.5,-17,7+sway*.2,-6,2,-7,-2,-6.5,-8+sway,-5.5,-4.5,-17],C('coat'));
 if(!sil){poly(g,[1,-30,5,-30,4.5,-17,7+sway*.2,-6,2,-7],pal.coat2);
  line(g,2.5,-29,2,-7.5,.9,pal.trim);line(g,-4.6,-17.5,4.6,-17.5,1.5,pal.trim);g.fillStyle=pal.trim;g.fillRect(-.8,-18.6,2,2.2);
  poly(g,[-1,-31,3.5,-31,2.8,-26,1,-24.5,-.6,-27],'#f2eee6');poly(g,[-4.5,-31,-1,-31,-2,-28],'#2a1f34');}
 // ---- front arm and weapon
 const w=q.weapon||'short',bl=BLADES[w];
 if(pose==='cast'){limb(g,2,-28,9,-30,15,-34,2.6,C('coat'));if(!sil)circ(g,15,-34,1.6,'#e6d6c8');}
 else if(atk){
  // windup (behind the head) -> slash (straight out) -> follow-through (low)
  let ang,hx,hy;if(k<.25){const u=k/.25;ang=lerp(-2.2,-1.6,u);hx=lerp(-3,-1,u);hy=lerp(-33,-34,u);}else if(k<.6){const u=(k-.25)/.35;ang=lerp(-1.4,.25,u*u*(3-2*u));hx=lerp(2,10,u);hy=lerp(-33,-25,u);}else{const u=(k-.6)/.4;ang=lerp(.25,.5,u);hx=lerp(10,8,u);hy=lerp(-25,-23,u);}
  limb(g,2,-28,(2+hx)/2+1,(-28+hy)/2+1,hx,hy,2.6,C('coat'));
  if(bl)drawBlade(g,hx,hy,ang,bl,sil);else if(!sil)circ(g,hx+1,hy,2,'#e6d6c8');}
 else{const sw=pose==='walk'?Math.sin(ph)*3:0;limb(g,2,-28,3+sw*.3,-22,4+sw,-17,2.6,C('coat'));
  if(bl&&pose!=='hurt'&&pose!=='dead'){g.save();g.globalAlpha*=.95;drawBlade(g,-2,-16,2.55,{...bl,len:bl.len*.55},sil,true);g.restore();}}
 // ---- long silver hair down the back (the portrait covers the head itself)
 const fl=Math.min(9,run*3)+(pose==='dash'?7:0)+(pose==='cast'?4:0),hw=Math.sin(t*6)*1.3,hl=lift>0?lift*.35:0;
 g.beginPath();g.moveTo(-1,-43);g.quadraticCurveTo(-7.5,-43,-7.5,-35);g.quadraticCurveTo(-8.5-fl*.5,-27,-8-fl+hw,-17-hl);g.quadraticCurveTo(-6-fl*.5,-21,-4.5-fl*.3+hw*.5,-18.5-hl*.6);g.quadraticCurveTo(-4,-26,-1,-30);g.closePath();
 if(sil)g.fillStyle=sil;else{const hg=g.createLinearGradient(0,-43,0,-17);hg.addColorStop(0,pal.hair);hg.addColorStop(1,pal.hair2);g.fillStyle=hg;}g.fill();
 if(!sil){g.strokeStyle=pal.hair2;g.lineWidth=.7;g.beginPath();g.moveTo(-6,-40);g.quadraticCurveTo(-8-fl*.4,-31,-8-fl*.85+hw,-21-hl);g.moveTo(-4,-36);g.quadraticCurveTo(-5.5-fl*.3,-29,-6-fl*.5+hw*.6,-22-hl*.7);g.stroke();}
 g.restore();g.restore();
 // ---- head (never mirrored: it is the player's portrait)
 const hy=-39+dy+(pose==='hurt'?1:0);
 if(o.head&&!sil&&pose!=='dead')o.head(g,f*.5,hy,o.headSize||21);
 else if(pose!=='dead'||sil){g.save();g.scale(f,1);ell(g,0,hy,6.5,7.5,sil||'#d9ccc0');g.restore();}
 else if(o.head)o.head(g,0,hy,o.headSize||21);
 g.restore();
}
function drawBlade(g,hx,hy,ang,bl,sil,sheathed){g.save();g.translate(hx,hy);g.rotate(ang);const L=bl.len,w=bl.w;
 if(!sil&&bl.glow&&!sheathed)glow(g,L*.5,0,L*.7,bl.glow,.35);
 poly(g,[-4,-.9,0,-.9,0,.9,-4,.9],sil||'#3a2418');poly(g,[0,-w,L-3,-w*.75,L,0,L-3,w*.75,0,w],sil||bl.col);
 if(!sil){line(g,1,0,L-3,0,.6,bl.edge);g.fillStyle=bl.guard;g.fillRect(-.6,-3.4,1.8,6.8);}
 g.restore();}

// SOTN's after-images: a fading violet copy of the hero
function drawAfterimage(g,q,a){g.save();g.globalAlpha*=a;const prev=g.globalCompositeOperation;g.globalCompositeOperation='lighter';drawHero(g,q,{sil:'rgba(120,70,220,.55)'});g.globalCompositeOperation=prev;g.restore();}

// ------------------------------------------------------------------ monsters (feet at 0,0, facing right before mirroring)
function drawFoe(g,e,t){const f=e.facing||1;g.save();g.translate(e.x,e.y);
 if(e.flash>0&&!e.dead){g.globalAlpha*=.9;}
 g.scale(f,1);g.lineCap='round';g.lineJoin='round';
 const ph=e.anim||0;
 switch(e.type){
  case 'zombie':case 'bloody':{const B=e.type==='bloody',s=B?1.3:1.15;g.scale(s,s);
   const skin=B?'#8f1d1d':'#94a37a',rag=B?'#5a0d10':'#4b5541',rag2=B?'#3d0709':'#343b2d',sh=Math.sin(ph)*2.5;
   limb(g,-1,-14,-2+sh,-7,-3+sh*1.4,0,2.6,B?'#6d1214':'#2c3028');limb(g,1,-14,2-sh,-7,3-sh*1.4,0,2.6,B?'#7a1517':'#363b30');
   poly(g,[-4,-15,4,-15,6,-25,2,-29,-4,-27],rag);poly(g,[-4,-15,-5,-11,-3,-13,-1,-10,1,-13,3,-11,4,-15],rag2);
   if(B){line(g,-2,-24,3,-24,.8,'#e4c0b0');line(g,-2,-21.5,3.5,-21.5,.8,'#e4c0b0');line(g,-1.5,-19,3,-19,.8,'#e4c0b0');}
   const reach=e.state==='swipe'?Math.sin(clamp(e.t/12,0,1)*Math.PI)*6:0;
   limb(g,3,-26,9+reach,-25,14+reach*1.6,-23+Math.sin(ph*.5),2.2,skin);limb(g,1,-25,7+reach,-22,12+reach*1.4,-20+Math.cos(ph*.5),2.2,B?'#741416':'#7f8d66');
   circ(g,5,-30,4.6,skin);poly(g,[2,-27,8,-27,7,-24,3,-24.5],B?'#4a0608':'#5a634a');
   circ(g,6.6,-31,1.3,'#0a0606');circ(g,3.6,-31,1.1,'#0a0606');circ(g,6.8,-31,.55,'#ff3020');circ(g,3.7,-31,.5,'#ff3020');
   if(!B){line(g,2,-34,6,-35,1.2,'#3d4433');}
   break;}
  case 'warg':{const run=e.state==='run'||e.state==='lunge',gal=run?ph*1.6:ph*.8,lung=e.state==='lunge',tell=e.state==='tell';
   const fur='#2e3446',dark='#191c27',belly='#58607a';
   g.translate(0,tell?3:0);
   const lg=(x,y,a)=>{const k=Math.sin(gal+a);limb(g,x,y,x+k*6,y+8,x+k*9-(run?0:2),0,3.6,dark);};
   lg(-15,-12,0);lg(10,-12,Math.PI*.7);
   // tail
   g.beginPath();g.moveTo(-22,-20);g.quadraticCurveTo(-34,-24+Math.sin(t*6)*3,-38,-16+Math.sin(t*5)*3);g.lineWidth=4;g.strokeStyle=fur;g.stroke();
   poly(g,[-24,-16,-20,-24,-14,-27,-8,-25,-2,-28,6,-27,14,-29,20,-24,18,-14,10,-10,-4,-9,-18,-10],fur);
   poly(g,[-14,-27,-11,-31,-8,-26,-5,-30,-2,-27,2,-31,5,-27,9,-31,12,-28],dark);
   poly(g,[-18,-11,-4,-9,10,-10,14,-14,-2,-14],belly);
   lg(-18,-13,Math.PI);lg(13,-13,Math.PI*1.6);
   // head
   const jaw=lung?.55:tell?.25:Math.max(0,Math.sin(t*3))*.12;
   g.save();g.translate(18,-24);g.rotate(tell?.25:lung?-.15:0);
   poly(g,[-4,-6,4,-9,12,-7,20,-4,22,0,14,1,4,4,-3,4],fur);poly(g,[-1,-8,2,-14,5,-8],dark);poly(g,[3,-8,7,-13,9,-7],dark);
   g.save();g.translate(4,2);g.rotate(jaw);poly(g,[0,0,16,-1,18,2,8,5,0,4],dark);for(let k=0;k<4;k++)poly(g,[4+k*3.4,-.5,5.5+k*3.4,1.8,7+k*3.4,-.5],'#f2ead8');g.restore();
   for(let k=0;k<4;k++)poly(g,[6+k*3.4,.5,7.5+k*3.4,-1.8,9+k*3.4,.5],'#f2ead8');
   circ(g,21,-1,1.6,'#0a0a0a');circ(g,8,-4.5,1.6,'#ffd23a');glow(g,8,-4.5,7,GLOW.gold,.45);
   g.restore();
   break;}
  case 'skeleton':{const bone='#e8e1cc',sh2='#a69f88',w2=Math.sin(ph)*2.2,thr=e.state==='throw'?clamp(e.t/16,0,1):0;
   limb(g,-1,-15,-2+w2,-8,-2+w2*1.3,0,1.8,sh2);limb(g,1,-15,2-w2,-8,2-w2*1.3,0,1.8,bone);
   ell(g,0,-15,3.4,1.6,bone);line(g,0,-15,0,-26,1.6,bone);for(let k=0;k<3;k++){g.beginPath();g.ellipse(0,-22+k*2.4,3.6-k*.4,1.2,0,Math.PI,TAU);g.strokeStyle=bone;g.lineWidth=1.1;g.stroke();}
   limb(g,-1,-25,-4,-20,-3,-15,1.6,sh2);
   if(thr)limb(g,1,-25,-2+thr*8,-31,1+thr*12,-34+thr*10,1.6,bone);else limb(g,1,-25,4,-20,5,-15,1.6,bone);
   circ(g,1,-30,4.4,bone);poly(g,[-1,-28,4,-28,4.5,-25,0,-25.5],bone);circ(g,2.6,-30.6,1.15,'#120a0a');circ(g,-.6,-30.6,1,'#120a0a');
   circ(g,2.6,-30.6,.45,'#ff4020');line(g,0,-26.5,4,-26.5,.6,'#5a5446');
   break;}
  case 'bat':{const fl=Math.sin(ph*1.8),idle=e.state==='idle';g.scale(1.5,1.5);
   if(idle){ell(g,0,1,2.6,4.2,'#2a1a2e');poly(g,[-2.5,-2,-4,4,-1,3],'#3d2244');poly(g,[2.5,-2,4,4,1,3],'#3d2244');}
   else{const wy=fl*5;poly(g,[-1,-1,-6,-3+wy*.4,-11,-1+wy,-8,1+wy*.6,-5,0+wy*.3,-3,2],'#3a1f44');poly(g,[1,-1,6,-3+wy*.4,11,-1+wy,8,1+wy*.6,5,0+wy*.3,3,2],'#3a1f44');ell(g,0,0,2.6,3,'#22142a');}
   circ(g,-1,-.5,.6,'#ff2a2a');circ(g,1,-.5,.6,'#ff2a2a');glow(g,0,-.5,4,GLOW.red,.4);
   break;}
  case 'merman':{const sc='#2f6d68',dk='#1b4440',bel='#86b9a0',w2=Math.sin(ph)*2,spit=e.state==='spit'?clamp(e.t/20,0,1):0;
   limb(g,-1,-13,-2+w2,-7,-3+w2,0,2.6,dk);limb(g,1,-13,2-w2,-7,3-w2,0,2.6,sc);
   poly(g,[-4,-13,4,-13,5,-24,1,-28,-4,-25],sc);poly(g,[0,-14,4,-14,4.5,-23,1,-25],bel);
   poly(g,[-4,-26,-8,-30,-6,-24,-9,-23,-5,-20],'#a33b2e');
   limb(g,2,-24,7,-21,10,-17,2,sc);poly(g,[9,-18,12,-16,10,-15],'#d8e0c0');
   g.save();g.translate(2,-29);g.rotate(-spit*.2);poly(g,[-4,-3,3,-5,8,-2,9,1,3,3,-3,2],sc);poly(g,[-3,-4,-1,-9,2,-5,4,-8,4,-4],'#a33b2e');
   circ(g,4.5,-2,1.3,'#ffe14a');circ(g,4.8,-2,.5,'#000');if(spit){poly(g,[7,0,10,0,9,2],'#ff9030');glow(g,9,1,6+spit*4,GLOW.fire,spit*.8);}g.restore();
   break;}
  case 'armor':{const st='#8c929f',dk='#4a4f5a',hl='#c9ced8',w2=Math.sin(ph)*1.6,thr=e.state==='throw'?clamp(e.t/24,0,1):0;
   limb(g,-2,-18,-3+w2,-9,-3+w2,0,4,dk);limb(g,2,-18,3-w2,-9,3-w2,0,4,st);g.fillStyle=dk;g.fillRect(-6+w2,-2,6,2.2);g.fillStyle=st;g.fillRect(1-w2,-2,6,2.2);
   poly(g,[-7,-19,7,-19,8,-34,4,-38,-4,-38,-8,-34],st);poly(g,[-7,-19,-1,-19,-1,-37,-4,-38,-8,-34],dk);line(g,-6,-27,7,-27,1,hl);
   poly(g,[-9,-38,-4,-40,-3,-33,-9,-32],hl);poly(g,[9,-38,4,-40,3,-33,9,-32],st);
   poly(g,[-4,-38,4,-38,5,-46,0,-49,-5,-46],st);g.fillStyle='#0b0b10';g.fillRect(-1,-44,6,1.6);g.fillStyle='#ff2a1a';g.fillRect(1,-44,2.5,1.2);glow(g,2,-43.4,5,GLOW.red,.5);
   g.beginPath();g.moveTo(0,-49);g.quadraticCurveTo(-6,-56,-12,-48+Math.sin(t*4)*1.5);g.lineWidth=2.4;g.strokeStyle='#9b1522';g.stroke();
   if(!e.thrown){const ax=thr?-6+thr*4:9,ay=thr?-48+thr*4:-30;limb(g,5,-35,ax*.7+2,ay*.6-12,ax,ay,2.8,st);g.save();g.translate(ax,ay);g.rotate(thr?-1.2+thr:.2);line(g,0,10,0,-12,1.8,'#5a3a20');poly(g,[0,-12,6,-15,8,-8,6,-4,0,-6],hl);poly(g,[0,-12,-4,-13,-5,-8,0,-8],dk);g.restore();}
   else limb(g,5,-35,10,-32,13,-28,2.8,st);
   break;}
 }
 g.restore();}

// dying monsters: halves that fly apart and burn away like SOTN's flame deaths
function drawCorpse(g,c,t){const k=clamp(c.t/c.life,0,1),H=c.h||32,cut=-H*.5;g.save();g.translate(c.x+(c.dx||0),c.y+(c.dy||0)+cut);g.rotate(c.rot||0);g.translate(0,-cut);
 g.beginPath();if(c.part==='top')g.rect(-60,-120,120,120+cut);else if(c.part==='bot')g.rect(-60,cut,120,-cut+8);else g.rect(-60,-120,120,128);g.clip();
 g.globalAlpha*=k<.55?1:1-(k-.55)/.45;drawFoe(g,{...c.foe,x:0,y:0,flash:0,anim:c.foe.anim},t);
 if(c.part!=='whole'){g.fillStyle='#7a0010';g.fillRect(-7,cut-1.2,14,2.4);}
 g.restore();
 if(k>.2)glow(g,c.x+(c.dx||0),c.y+(c.dy||0)+cut*(c.part==='bot'?.5:1.4),H*.8,GLOW.fire,Math.sin(Math.min(1,(k-.2)/.8)*Math.PI)*.6);}

// ------------------------------------------------------------------ Death
function drawDeath(g,x,y,t,a=1,swing=0){g.save();g.translate(x,y+Math.sin(t*2.2)*3);g.globalAlpha*=a;g.lineCap='round';g.lineJoin='round';
 glow(g,0,-34,60,GLOW.purple,.35);
 // robe with a ragged hem fading into nothing
 g.beginPath();g.moveTo(-8,-58);g.quadraticCurveTo(-22,-30,-24,-4);for(let k=0;k<7;k++){const hx=-24+k*8;g.lineTo(hx+4,6+Math.sin(t*5+k*1.7)*4);g.lineTo(hx+8,-2);}g.quadraticCurveTo(22,-30,8,-58);g.closePath();
 const gr=g.createLinearGradient(0,-60,0,8);gr.addColorStop(0,'#3a2150');gr.addColorStop(.6,'#1d0f2a');gr.addColorStop(1,'rgba(20,8,30,0)');g.fillStyle=gr;g.fill();
 poly(g,[-12,-60,0,-74,12,-60,10,-46,-10,-46],'#2d1840');poly(g,[-7,-60,0,-70,7,-60,6,-49,-6,-49],'#08040c');
 circ(g,0,-56,5.4,'#e8e4dc');poly(g,[-3,-52,3,-52,2.5,-48,-2.5,-48],'#e8e4dc');circ(g,-2.1,-57,1.5,'#14080a');circ(g,2.1,-57,1.5,'#14080a');
 circ(g,-2.1,-57,.7,'#ff2848');circ(g,2.1,-57,.7,'#ff2848');glow(g,0,-57,9,GLOW.red,.6);for(let k=-2;k<=2;k++)line(g,k*1.1,-50.5,k*1.1,-48.5,.5,'#5a5048');
 // arms and scythe
 const sa=-.5+swing*2.4;limb(g,-8,-44,-16,-34,-20,-30,2,'#e8e4dc');limb(g,8,-44,14,-38,18,-36,2,'#e8e4dc');
 g.save();g.translate(0,-34);g.rotate(sa);line(g,-26,6,30,-6,2.4,'#4a3424');g.translate(30,-6);
 g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(10,-22,-22,-30);g.quadraticCurveTo(0,-20,-2,-2);g.closePath();g.fillStyle='#cfd5e2';g.fill();g.strokeStyle='#7b8396';g.lineWidth=.8;g.stroke();
 glow(g,-6,-18,18,GLOW.moon,.3);g.restore();
 g.restore();}

// ------------------------------------------------------------------ Dracula and his true form
// B.vis: 0..1 materialization (scanline dissolve), B.open: 0..1 cloak spread
function drawDracula(g,B,t){const f=B.facing||1,vis=B.vis??1,open=B.open||0;if(vis<=0)return;g.save();g.translate(B.x,B.y);g.lineJoin='round';
 if(vis<1){g.beginPath();for(let y=-70;y<4;y+=3){const w=vis*vis;if(((y+70)/3|0)%2===0||vis>.6)g.rect(-50*w-((y*7)%11),y,100*w+((y*5)%9),3*(vis>.6?1:vis*1.6));}g.clip();glow(g,0,-34,50,GLOW.red,(1-vis)*.8);}
 if(B.flash>0)g.globalAlpha*=.75;
 g.scale(f,1);
 const sp=open*30;
 // cloak: a bat-wing silhouette with a scalloped hem that spreads open to cast
 const wing=(sd,k)=>{const o=open*k,pts=[sd*7,-53, sd*(14+36*o),-50+8*o, sd*(12+30*o),-38+2*o, sd*(15+26*o),-31+4*o, sd*(11+19*o),-23+5*o, sd*(14+13*o),-14+4*o, sd*(10+7*o),-6+2*o, sd*13,0, 0,0, 0,-53];return pts;};
 for(const sd of [-1,1])poly(g,wing(sd,1),'#0c0910');
 if(open>0)for(const sd of [-1,1]){const pts=wing(sd,1).map((v,k2)=>k2%2?v*.92+1:v*.86);poly(g,pts,'#8b0d1d');poly(g,pts.map((v,k2)=>k2%2?v*.8+3:v*.62),'#5c0612');}
 poly(g,[-6,-50,6,-50,7,-2,-7,-2],'#1b1420');poly(g,[-2,-50,2,-50,1.5,-30,-1.5,-30],'#e8e2d8');circ(g,0,-36,2.2,'#d9a63c');glow(g,0,-36,6,GLOW.gold,.4);
 // high collar
 poly(g,[-10,-50,-12,-62,-6,-54,0,-52,6,-54,12,-62,10,-50],'#0c0910');poly(g,[-9,-51,-10,-59,-5,-53],'#8b0d1d');poly(g,[9,-51,10,-59,5,-53],'#8b0d1d');
 // head: pale, long white hair, red eyes
 g.beginPath();g.moveTo(-5,-63);g.quadraticCurveTo(-10,-60,-9,-48);g.lineTo(-4,-52);g.closePath();g.fillStyle='#d8dbe2';g.fill();
 ell(g,1,-58,4.6,6,'#d9cdc2');poly(g,[-4,-62,6,-64,5,-60,-4,-59],'#d8dbe2');poly(g,[-1,-54,4,-54,2,-51],'#a59a90');
 circ(g,3,-58.5,1,'#ff1a1a');circ(g,-.6,-58.5,.9,'#ff1a1a');glow(g,1.5,-58.5,8,GLOW.red,.55);
 // hands raised when casting
 if(open>.3){circ(g,-14-sp*.8,-38,2,'#d9cdc2');circ(g,14+sp*.8,-38,2,'#d9cdc2');}
 g.restore();}
function drawDemon(g,D,t){const f=D.facing||1;g.save();g.translate(D.x,D.y);g.lineCap='round';g.lineJoin='round';
 if(D.flash>0)g.globalAlpha*=.8;
 if(D.rise!=null&&D.rise<1){g.beginPath();g.rect(-120,-200*D.rise-10,240,200*D.rise+12);g.clip();}
 g.scale(f,1);
 const crouch=D.crouch||0,low=D.low||0,fl=Math.sin(t*3)*.15+(D.air?.6:0),by=crouch*14;
 const skin='#3b3546',dk='#221e2b',hl='#5d5670',mem='#2b1530',vein='#4f2342';
 // wings
 for(const s of [-1,1]){g.save();g.translate(-10,-92+by);g.scale(s===1?1:.8,1);g.rotate(-fl*s*.5-(s<0?.25:0));
  poly(g,[0,0,-30,-48,-62,-56,-82,-30,-66,-28,-60,-8,-44,-14,-36,8,-22,-4,-10,14],s>0?mem:'#200f25');
  for(const [x,y] of [[-30,-48],[-62,-56],[-82,-30]])line(g,0,0,x,y,1.6,vein);g.restore();}
 // legs (digitigrade)
 limb(g,-12,-50+by,-26,-26+by*.6,-18,0,9,dk);limb(g,-18,0,-24,-2,-30,0,5,dk);
 limb(g,14,-50+by,4,-26+by*.6,12,0,9,skin);limb(g,12,0,20,-2,26,0,5,skin);
 // torso
 poly(g,[-26,-50+by,-30,-84+by,-14,-104+by,14,-106+by,32,-88+by,30,-56+by,18,-44+by,-14,-44+by],skin);
 poly(g,[-6,-96+by,10,-98+by,18,-80+by,12,-56+by,-4,-56+by,-12,-78+by],hl);
 for(let k=0;k<4;k++)line(g,-2,-88+k*8+by,12,-90+k*8+by,1.2,dk);
 // arms with claws
 const sw=D.swipe||0;
 limb(g,24,-92+by,44,-70+by+sw*10,52-low*6,-46+by+sw*16,8,skin);for(let k=0;k<3;k++)line(g,52-low*6,-46+by+sw*16,58-low*6+k*2,-38+by+sw*16+k,2,'#e8e0cc');
 limb(g,-22,-90+by,-36,-66+by,-30,-44+by,7,dk);
 // head (lowered for breath)
 const hx=26+low*10,hy=-112+by+low*32;
 g.save();g.translate(hx,hy);
 poly(g,[-14,-6,-8,-16,6,-18,16,-10,20,0,14,10,0,12,-12,6],skin);
 poly(g,[-8,-14,-18,-30,-4,-16],'#c8bfa8');poly(g,[4,-16,8,-34,12,-14],'#c8bfa8');
 const mo=D.mouth||0;poly(g,[4,4,20,0,18,6+mo*6,6,8+mo*4],'#120a0e');for(let k=0;k<4;k++)poly(g,[7+k*3.3,2,8.6+k*3.3,6,10+k*3.3,2],'#efe6d2');
 if(mo>0){glow(g,16,4,10+mo*16,GLOW.fire,mo);}
 circ(g,8,-6,2.6,'#ffd030');circ(g,8,-6,1,'#ff2a00');glow(g,8,-6,10,GLOW.gold,.7);
 g.restore();
 g.restore();}

// ------------------------------------------------------------------ pickups and projectiles
function heartPath(g,x,y,s){g.beginPath();g.moveTo(x,y+s*.35);g.bezierCurveTo(x-s*.7,y-s*.1,x-s*.4,y-s*.65,x,y-s*.3);g.bezierCurveTo(x+s*.4,y-s*.65,x+s*.7,y-s*.1,x,y+s*.35);g.closePath();}
function drawPickup(g,type,x,y,t){g.save();g.lineCap='round';g.lineJoin='round';
 switch(type){
  case 'heart':case 'bigheart':{const s=type==='bigheart'?9:6;glow(g,x,y-s*.4,s*1.6,GLOW.red,.5);heartPath(g,x,y-s*.4,s);g.fillStyle='#d8102a';g.fill();g.strokeStyle='#ffd0d6';g.lineWidth=.7;g.stroke();break;}
  case 'money':{glow(g,x,y-5,9,GLOW.gold,.4);ell(g,x,y-4,4.6,4.2,'#b88a2a');poly(g,[x-2,y-8,x+2,y-8,x+3,y-10,x-3,y-10],'#8a6420');g.fillStyle='#ffe9a0';g.font='bold 6px Georgia,serif';g.textAlign='center';g.textBaseline='middle';g.fillText('$',x,y-3.6);break;}
  case 'potion':{glow(g,x,y-6,10,GLOW.blue,.5);ell(g,x,y-4,4,4.4,'#2a62d8');g.fillStyle='#8fc0ff';g.fillRect(x-1,y-12,2,4);g.fillStyle='#6a4a2a';g.fillRect(x-1.4,y-13.4,2.8,1.6);circ(g,x-1.4,y-5,1,'#cfe4ff');break;}
  case 'roast':{glow(g,x,y-4,10,GLOW.warm,.4);ell(g,x,y-1,8,2,'#d8d8e0');ell(g,x,y-5,6,4,'#7a3510');ell(g,x-1,y-6,4,2,'#b8622a');line(g,x+5,y-7,x+8,y-9,1.6,'#f2ead8');break;}
  case 'short':case 'claymore':case 'alucard':{const bl=BLADES[type];glow(g,x,y-6,14,GLOW.white,.35+Math.sin(t*6)*.15);drawBlade(g,x-bl.len*.4,y-4,-.35,{...bl,len:bl.len*.75},null);break;}
  case 'dagger':glow(g,x,y-5,9,GLOW.white,.3);drawBlade(g,x-6,y-4,0,{len:12,w:1.1,col:'#e6eaf0',edge:'#8a93a3',guard:'#a8884a'},null);break;
  case 'axe':glow(g,x,y-6,9,GLOW.white,.3);line(g,x-1,y,x-1,y-12,1.6,'#5a3a20');poly(g,[x-1,y-12,x+5,y-14,x+6,y-7,x+4,y-5,x-1,y-7],'#c9ced8');break;
  case 'holy':glow(g,x,y-6,10,GLOW.blue,.4);ell(g,x,y-4,3.6,4,'#3b6fe0');g.fillStyle='#d8e8ff';g.fillRect(x-1,y-11,2,4);circ(g,x-1,y-5,.9,'#e8f2ff');break;
  case 'cross':glow(g,x,y-6,11,GLOW.gold,.45);poly(g,[x-1.2,y-13,x+1.2,y-13,x+1.2,y-9.5,x+4.5,y-9.5,x+4.5,y-7,x+1.2,y-7,x+1.2,y,x-1.2,y,x-1.2,y-7,x-4.5,y-7,x-4.5,y-9.5,x-1.2,y-9.5],'#e8c050');break;
  case 'leap':{const p=.6+Math.sin(t*5)*.3;glow(g,x,y-8,18,GLOW.green,p);poly(g,[x,y-14,x+5,y-8,x,y-2,x-5,y-8],'#3fd890');poly(g,[x,y-14,x+5,y-8,x,y-8],'#a8ffd8');break;}
  case 'orb':{const p=.7+Math.sin(t*6)*.3;glow(g,x,y-10,26,GLOW.red,p);glow(g,x,y-10,14,GLOW.white,.5);const gr=g.createRadialGradient(x-2,y-12,1,x,y-10,7);gr.addColorStop(0,'#ffd0e0');gr.addColorStop(.5,'#e01848');gr.addColorStop(1,'#5a0018');g.beginPath();g.arc(x,y-10,7,0,TAU);g.fillStyle=gr;g.fill();break;}
 }
 g.restore();}
function drawShot(g,b,t){const x=b.x,y=b.y;g.save();g.lineCap='round';
 switch(b.kind){
  case 'hellfire':case 'pfire':case 'mfire':case 'breath':{const r=b.kind==='breath'?5.5:b.kind==='pfire'?5:4;glow(g,x,y,r*4,GLOW.fire,.9);
   g.fillStyle='rgba(255,110,20,.85)';g.beginPath();g.arc(x-(b.vx>0?2:-2),y,r*1.15,0,TAU);g.fill();circ(g,x,y,r*.75,'#ffd76a');circ(g,x,y,r*.35,'#fff6d8');break;}
  case 'inferno':{const r=8+Math.sin(t*20)*.8;glow(g,x,y,r*3.2,GLOW.purple,.7);glow(g,x,y,r*2,GLOW.fire,.5);circ(g,x,y,r,'#1a0618');g.strokeStyle='#ff5a1a';g.lineWidth=1.6;g.beginPath();g.arc(x,y,r,t*8,t*8+4);g.stroke();break;}
  case 'wave':{const h=b.h||14,k=Math.sin(t*30)*1.5;glow(g,x,y-h*.5,h*2,GLOW.fire,.6);poly(g,[x-7,y,x-3,y-h-k,x,y-h*.6,x+3,y-h+k,x+7,y],'#ff7a20');poly(g,[x-4,y,x-1,y-h*.6,x+2,y-h*.5,x+4,y],'#ffd76a');break;}
  case 'bone':{g.translate(x,y);g.rotate(t*12);line(g,-4,0,4,0,1.8,'#e8e1cc');circ(g,-4.5,-.8,1.2,'#e8e1cc');circ(g,-4.5,.8,1.2,'#e8e1cc');circ(g,4.5,-.8,1.2,'#e8e1cc');circ(g,4.5,.8,1.2,'#e8e1cc');break;}
  case 'eaxe':case 'axe':{g.translate(x,y);g.rotate(b.t*.3*(b.f||1));line(g,0,7,0,-8,1.8,'#5a3a20');poly(g,[0,-8,6,-10,7,-3,5,-1,0,-3],'#c9ced8');poly(g,[0,-8,-4,-9,-5,-4,0,-4],'#8c929f');break;}
  case 'dagger':{g.translate(x,y);g.scale(b.f||1,1);glow(g,0,0,8,GLOW.white,.3);drawBlade(g,-6,0,0,{len:12,w:1.1,col:'#e6eaf0',edge:'#8a93a3',guard:'#a8884a'},null);break;}
  case 'holy':{g.translate(x,y);g.rotate(b.t*.25*(b.f||1));ell(g,0,0,3.4,3.8,'#3b6fe0');g.fillStyle='#d8e8ff';g.fillRect(-1,-7,2,3.4);break;}
  case 'cross':{g.translate(x,y);g.rotate(b.t*.5);glow(g,0,0,12,GLOW.gold,.5);poly(g,[-1.4,-7,1.4,-7,1.4,-1.4,7,-1.4,7,1.4,1.4,1.4,1.4,7,-1.4,7,-1.4,1.4,-7,1.4,-7,-1.4,-1.4,-1.4],'#f0c850');break;}
 }
 g.restore();}
function drawHolyFlame(g,f,t){const k=f.t/f.life,a=k<.15?k/.15:1-Math.max(0,(k-.7)/.3);for(let j=-1;j<=1;j++){const fx=f.x+j*6,h=12+Math.sin(t*22+j*2+f.x)*3;glow(g,fx,f.y-h*.5,h,GLOW.blue,a*.8);
 poly(g,[fx-3,f.y,fx-1,f.y-h,fx+1,f.y-h*.5,fx+3,f.y],`rgba(110,170,255,${a})`);poly(g,[fx-1.5,f.y,fx,f.y-h*.55,fx+1.5,f.y],`rgba(230,245,255,${a})`);}}

// ------------------------------------------------------------------ scenery
// Pre-rendered layers at the current scale (rebuilt when the scale changes): night sky, castle, hills, trees, wall textures.
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c;}
function seeded(n){let s=n>>>0||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return ((s>>>0)%100000)/100000;};}
class Scenery{
 constructor(){this.sc=0;this.L={};this.pats={};}
 ensure(g,sc){const k=Math.round(sc*20)/20;if(k===this.sc)return;this.sc=k;this.build(g,k);}
 layer(w,h,fn){const c=mkCanvas(w*this.sc,h*this.sc),q=c.getContext('2d');q.scale(this.sc,this.sc);fn(q);c.lw=w;c.lh=h;return c;}
 build(g,sc){const r=seeded(7);
  this.L.sky=this.layer(64,VH,q=>{const gr=q.createLinearGradient(0,0,0,VH);gr.addColorStop(0,'#030208');gr.addColorStop(.45,'#0e0820');gr.addColorStop(.8,'#2a1236');gr.addColorStop(1,'#3a1630');q.fillStyle=gr;q.fillRect(0,0,64,VH);});
  this.L.stars=this.layer(512,150,q=>{for(let k=0;k<120;k++){const a=r();q.fillStyle=`rgba(255,255,255,${.25+a*.7})`;const s=a>.92?1.4:.7;q.fillRect(r()*512,r()*150,s,s);}});
  this.L.moon=this.layer(120,120,q=>{const gr=q.createRadialGradient(60,60,10,60,60,60);gr.addColorStop(0,'rgba(255,240,220,.55)');gr.addColorStop(.35,'rgba(200,170,220,.18)');gr.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=gr;q.fillRect(0,0,120,120);
   const m=q.createRadialGradient(54,54,2,60,60,22);m.addColorStop(0,'#fffaf0');m.addColorStop(.7,'#f0e2c8');m.addColorStop(1,'#d8c0a8');q.beginPath();q.arc(60,60,22,0,TAU);q.fillStyle=m;q.fill();
   q.fillStyle='rgba(170,140,130,.35)';for(const [x,y,s] of [[52,52,5],[66,64,4],[60,72,3],[70,50,2.5],[48,66,2]]){q.beginPath();q.arc(x,y,s,0,TAU);q.fill();}
   q.fillStyle='rgba(20,10,30,.75)';for(const [y,x0,w] of [[56,10,60],[62,30,70],[78,50,60]]){q.beginPath();q.ellipse(x0+w/2,y,w/2,2.6,0,0,TAU);q.fill();}});
  // Dracula's castle on its crag, windows lit
  this.L.castle=this.layer(360,VH,q=>{q.fillStyle='#0a0612';q.beginPath();q.moveTo(0,VH);q.lineTo(0,190);q.lineTo(40,176);q.lineTo(70,150);q.lineTo(100,160);q.lineTo(130,140);q.lineTo(170,150);q.lineTo(230,138);q.lineTo(280,160);q.lineTo(330,170);q.lineTo(360,185);q.lineTo(360,VH);q.fill();
   const tower=(x,w,top,roof)=>{q.fillRect(x,top,w,160-top+20);q.beginPath();q.moveTo(x-2,top);q.lineTo(x+w/2,top-roof);q.lineTo(x+w+2,top);q.fill();};
   for(const [x,w,top,roof] of [[78,14,78,22],[104,10,96,16],[124,22,40,40],[150,12,70,20],[170,26,62,30],[200,10,88,14],[214,18,54,34],[236,12,92,18],[252,16,104,16],[96,70,118,0],[150,110,108,0]])tower(x,w,top,roof);
   q.fillRect(120,12,4,30);q.beginPath();q.moveTo(120,12);q.lineTo(132,16);q.lineTo(120,20);q.fill();
   for(let k=0;k<26;k++){const x=84+r()*180,y=60+r()*90;q.fillStyle=r()>.5?'#ffb050':'#ff8a30';q.fillRect(x,y,1.6,2.4);q.fillStyle='rgba(255,150,60,.18)';q.fillRect(x-1.5,y-1.5,4.6,5.4);}});
  this.L.hills=this.layer(400,VH,q=>{q.fillStyle='#120a1e';q.beginPath();q.moveTo(0,VH);for(let x=0;x<=400;x+=8)q.lineTo(x,168-Math.sin(x/400*TAU*2)*8-Math.sin(x/400*TAU*5)*4-(x%16?0:r()*6));q.lineTo(400,VH);q.fill();
   q.fillStyle='#0c0716';for(let k=0;k<40;k++){const x=k*10+r()*6,h=14+r()*16,y=172-Math.sin(x/400*TAU*2)*8;q.beginPath();q.moveTo(x-5,y+6);q.lineTo(x,y-h);q.lineTo(x+5,y+6);q.fill();}});
  this.L.trees=this.layer(320,VH,q=>{q.strokeStyle='#07040c';q.fillStyle='#07040c';q.lineCap='round';
   const tree=(x,h,s)=>{q.lineWidth=5*s;q.beginPath();q.moveTo(x,VH);q.lineTo(x+2*s,VH-h);q.stroke();const br=(bx,by,a,len,w)=>{if(len<5||w<.6)return;const ex=bx+Math.cos(a)*len,ey=by+Math.sin(a)*len;q.lineWidth=w;q.beginPath();q.moveTo(bx,by);q.lineTo(ex,ey);q.stroke();br(ex,ey,a-.45-r()*.3,len*.68,w*.62);br(ex,ey,a+.35+r()*.3,len*.62,w*.6);};
    br(x+2*s,VH-h,-Math.PI/2-.3,h*.32,3.6*s);br(x+2*s,VH-h*.7,-Math.PI/2+.7,h*.28,3*s);br(x+2*s,VH-h*.55,-Math.PI/2-1,h*.26,2.6*s);};
   tree(40,150,1.1);tree(150,120,.9);tree(250,170,1.2);});
  this.L.fog=this.layer(512,60,q=>{for(let k=0;k<26;k++){const x=r()*512,y=20+r()*30,w=40+r()*70;const gr=q.createRadialGradient(x,y,0,x,y,w*.5);gr.addColorStop(0,'rgba(170,160,210,.16)');gr.addColorStop(1,'rgba(170,160,210,0)');q.fillStyle=gr;q.fillRect(x-w/2,y-w/2,w,w);
    if(x>512-w/2){q.fillStyle=gr;q.save();q.translate(-512,0);q.fillRect(x-w/2,y-w/2,w,w);q.restore();}if(x<w/2){q.save();q.translate(512,0);q.fillStyle=gr;q.fillRect(x-w/2,y-w/2,w,w);q.restore();}}});
  // wall textures (patterns): castle stone, cave rock, marble, throne room
  const brick=(w,h,base,mortar,hi,lo,bw,bh,vary)=>this.layer(w,h,q=>{q.fillStyle=mortar;q.fillRect(0,0,w,h);for(let y=0;y<h;y+=bh){const off=(y/bh)%2?bw/2:0;for(let x=-bw;x<w+bw;x+=bw){const v=r()*vary;q.fillStyle=base;q.globalAlpha=1;q.fillRect(x+off+.6,y+.6,bw-1.2,bh-1.2);q.fillStyle=`rgba(0,0,0,${v})`;q.fillRect(x+off+.6,y+.6,bw-1.2,bh-1.2);
    q.fillStyle=hi;q.fillRect(x+off+.6,y+.6,bw-1.2,.8);q.fillStyle=lo;q.fillRect(x+off+.6,y+bh-1.4,bw-1.2,.8);if(r()<.25){q.fillStyle='rgba(0,0,0,.25)';q.fillRect(x+off+r()*bw*.6,y+r()*bh*.6,2+r()*4,.6);}}}});
  this.L.stone=brick(64,32,'#2b2633','#0f0c13','#3c3546','#1a1620',32,16,.35);
  this.L.gatewall=brick(64,32,'#34303c','#121016','#4a4454','#1c1a22',22,11,.4);
  this.L.marble=brick(64,64,'#3a3a4c','#1c1c28','#565670','#262634',32,32,.25);
  this.L.throne=brick(64,32,'#2a1218','#0e0508','#3e1a22','#16080c',32,16,.4);
  this.L.rock=this.layer(64,64,q=>{q.fillStyle='#0e1820';q.fillRect(0,0,64,64);for(let k=0;k<40;k++){const x=r()*64,y=r()*64,s=4+r()*10;q.fillStyle=r()>.5?'#16242e':'#0a1218';q.beginPath();q.moveTo(x,y-s*.5);q.lineTo(x+s*.6,y);q.lineTo(x,y+s*.4);q.lineTo(x-s*.5,y);q.fill();}});
  this.L.floorStone=brick(32,32,'#3a3340','#141016','#5a5060','#211c26',16,8,.3);
  this.L.dirt=this.layer(32,32,q=>{q.fillStyle='#1c1410';q.fillRect(0,0,32,32);for(let k=0;k<30;k++){q.fillStyle=r()>.5?'#2a1e16':'#120c0a';q.fillRect(r()*32,r()*32,1+r()*3,1+r()*2);}});
  this.L.caveFloor=this.layer(32,32,q=>{q.fillStyle='#14222a';q.fillRect(0,0,32,32);for(let k=0;k<26;k++){q.fillStyle=r()>.5?'#1e3038':'#0a1418';q.fillRect(r()*32,r()*32,1+r()*4,1+r()*2);}});
  this.pats={};
 }
 pattern(g,key){let p=this.pats[key];if(p)return p;const c=this.L[key];p=g.createPattern(c,'repeat');try{p.setTransform(new DOMMatrix([1/this.sc,0,0,1/this.sc,0,0]));}catch{}this.pats[key]=p;return p;}
 tiled(g,key,camX,par,x0,x1,y=0,alpha=1){const c=this.L[key],tw=c.lw;const base=camX*par;let sx=x0-(((x0-base)%tw)+tw)%tw;g.globalAlpha=alpha;for(;sx<x1;sx+=tw)g.drawImage(c,sx,y,tw,c.lh);g.globalAlpha=1;}
}

// gothic arched window with moonlight; used in the hall, gallery and throne room
function archWindow(g,x,y,w,h,t,{glass='#0a1240',light=GLOW.moon,stained=false}={}){
 g.fillStyle='#07050a';g.beginPath();g.moveTo(x-3,y+h+3);g.lineTo(x-3,y);g.arc(x+w/2,y,w/2+3,Math.PI,0);g.lineTo(x+w+3,y+h+3);g.closePath();g.fill();
 const gr=g.createLinearGradient(x,y-w/2,x,y+h);if(stained){gr.addColorStop(0,'#5a0a2a');gr.addColorStop(.5,'#2a0a50');gr.addColorStop(1,'#0a1a50');}else{gr.addColorStop(0,'#1a2a6a');gr.addColorStop(1,glass);}
 g.fillStyle=gr;g.beginPath();g.moveTo(x,y+h);g.lineTo(x,y);g.arc(x+w/2,y,w/2,Math.PI,0);g.lineTo(x+w,y+h);g.closePath();g.fill();
 if(stained){const cols=['#a01030','#2040a0','#b08020','#601090','#108060'];for(let k=0;k<10;k++){g.fillStyle=cols[k%5];g.globalAlpha=.55;g.fillRect(x+2+(k%3)*(w-4)/3,y+4+Math.floor(k/3)*h/4,(w-4)/3-1,h/4-1);}g.globalAlpha=1;}
 g.strokeStyle='#07050a';g.lineWidth=1.4;g.beginPath();g.moveTo(x+w/2,y-w/2);g.lineTo(x+w/2,y+h);g.moveTo(x,y+h*.45);g.lineTo(x+w,y+h*.45);g.stroke();
 glow(g,x+w/2,y+h*.3,w*1.2,light,.22+Math.sin(t*.7+x)*.04);
 g.fillStyle='#1a1620';g.fillRect(x-6,y+h+2,w+12,4);}
function lightShaft(g,x,y,w,len,a){const prev=g.globalCompositeOperation;g.globalCompositeOperation='lighter';const gr=g.createLinearGradient(x,y,x+len*.45,y+len);gr.addColorStop(0,`rgba(130,150,255,${a})`);gr.addColorStop(1,'rgba(130,150,255,0)');g.fillStyle=gr;
 g.beginPath();g.moveTo(x,y);g.lineTo(x+w,y);g.lineTo(x+w+len*.5,y+len);g.lineTo(x+len*.5-w*.3,y+len);g.closePath();g.fill();g.globalCompositeOperation=prev;}
function pillar(g,x,y0,y1,w,col='#2a2430',hl='#3e3648'){g.fillStyle=col;g.fillRect(x-w/2,y0,w,y1-y0);g.fillStyle=hl;g.fillRect(x-w/2+1,y0,2,y1-y0);g.fillStyle='rgba(0,0,0,.4)';g.fillRect(x+w/2-3,y0,3,y1-y0);
 g.fillStyle=hl;g.fillRect(x-w/2-3,y0,w+6,4);g.fillRect(x-w/2-3,y1-5,w+6,5);}
function banner(g,x,y,h,t){const sw=Math.sin(t*1.3+x)*1.5;poly(g,[x,y,x+14,y,x+14+sw,y+h,x+7+sw,y+h-6,x+sw,y+h],'#5e0a14');poly(g,[x+2,y,x+5,y,x+5+sw,y+h-3,x+2+sw,y+h-2],'#7e1420');
 g.fillStyle='#b88a2a';g.fillRect(x-1,y-2,16,2);g.beginPath();g.arc(x+7+sw*.5,y+h*.35,3.4,0,TAU);g.fill();g.fillStyle='#5e0a14';g.fillRect(x+6+sw*.5,y+h*.35-2,2,4);}
function statue(g,x,y){g.fillStyle='#24202c';g.fillRect(x-9,y-10,18,10);g.fillStyle='#3a3444';g.fillRect(x-8,y-12,16,3);
 poly(g,[x-5,y-12,x+5,y-12,x+4,y-36,x+8,y-44,x+3,y-46,x-3,y-46,x-6,y-38],'#2e2a38');circ(g,x,y-50,4,'#2e2a38');poly(g,[x-8,y-44,x-16,y-56,x-12,y-42],'#2e2a38');poly(g,[x+8,y-44,x+16,y-56,x+12,y-42],'#2e2a38');}
function candelabra(g,x,y,lit,t,kind){
 if(kind==='lantern'){g.fillStyle='#2a2630';g.fillRect(x-2.5,y,5,26);g.fillStyle='#3e3846';g.fillRect(x-6,y-2,12,3);g.fillRect(x-5,y+24,10,3);
  g.fillStyle='#1a1620';g.fillRect(x-5,y-14,10,12);poly(g,[x-7,y-14,x,y-21,x+7,y-14],'#3e3846');if(lit){g.fillStyle='#ffb04a';g.fillRect(x-3,y-12,6,8);glow(g,x,y-8,22,GLOW.fire,.7+Math.sin(t*13+x)*.1);}return;}
 if(kind==='torch'){g.fillStyle='#3a2a1a';poly(g,[x-2,y,x+2,y,x+3,y-10,x-3,y-10],'#3a2a1a');g.fillStyle='#4a4048';g.fillRect(x-4,y-11,8,2);
  if(lit){const fl=Math.sin(t*17+x)*1.4;poly(g,[x-3.5,y-12,x+fl,y-24,x+3.5,y-12],'#ff7a20');poly(g,[x-2,y-12,x+fl*.6,y-19,x+2,y-12],'#ffe08a');glow(g,x,y-16,26,GLOW.fire,.75);}return;}
 // standing three-candle candelabra
 g.fillStyle='#8a6a2a';g.fillRect(x-.8,y-16,1.6,16);g.fillRect(x-5,y-1,10,1.6);poly(g,[x-9,y-16,x+9,y-16,x+7,y-14,x-7,y-14],'#8a6a2a');
 for(const dx of [-8,0,8]){g.fillStyle='#e8e0d0';g.fillRect(x+dx-1,y-22+(dx?2:0),2,6-(dx?2:0));if(lit){const fl=Math.sin(t*15+x+dx)*.8;poly(g,[x+dx-1.3,y-22+(dx?2:0),x+dx+fl,y-27+(dx?2:0),x+dx+1.3,y-22+(dx?2:0)],'#ffcf6a');}}
 if(lit)glow(g,x,y-24,22,GLOW.fire,.6+Math.sin(t*11+x)*.08);}
function throne(g,x,y){poly(g,[x-18,y,x-18,y-40,x-14,y-62,x-6,y-52,x,y-70,x+6,y-52,x+14,y-62,x+18,y-40,x+18,y],'#1a0a10');poly(g,[x-12,y-6,x-12,y-36,x,y-46,x+12,y-36,x+12,y-6],'#6a0a1a');
 g.fillStyle='#8a6a2a';g.fillRect(x-20,y-24,40,3);g.fillRect(x-20,y-4,40,4);circ(g,x,y-58,2.4,'#c9a24a');}

Object.assign(exports,{glow,GLOW,drawHero,drawAfterimage,drawFoe,drawCorpse,drawDeath,drawDracula,drawDemon,drawPickup,drawShot,drawHolyFlame,Scenery,archWindow,lightShaft,pillar,banner,statue,candelabra,throne,heartPath,poly,circ,ell,line,HERO_PAL,BLADES});
