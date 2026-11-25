// THE WARRIORS touch buttons drawn as real arcade buttons (owner, Nov 25: "arcade buttons or simple punch kick icons... make it
// look good"): a black plastic bezel, a glossy domed cap in the button's colour with a white icon (fist, boot, jump arrows,
// lightning bolt) that sinks when pressed, and a small label plate under it for what the button does right now.
// A painted button dropped in as assets/warriors/btn-<name>.webp (and btn-<name>-down for the pressed look) replaces the drawn
// cap; the label plate is still drawn. Every look is cached per size/colour/state (one drawImage a frame per button).
const cache=new Map();
function shade(hex,k){const n=parseInt(hex.slice(1),16),f=c=>Math.max(0,Math.min(255,Math.round(k>0?c+(255-c)*k:c*(1+k))));
 return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`;}
// icons in unit space (about -1..1), filled white
function icon(g,name){g.beginPath();
 if(name==='punch'){// a fist seen from the front: four knuckles, the thumb across them, and speed lines
  g.roundRect(-.52,-.48,1.04,.92,.26);g.fill();
  g.globalCompositeOperation='destination-out';g.lineWidth=.07;g.lineCap='round';
  for(const fx of [-.26,0,.26]){g.beginPath();g.moveTo(fx,-.46);g.lineTo(fx,-.02);g.stroke();}
  g.beginPath();g.moveTo(-.5,.05);g.quadraticCurveTo(0,.16,.42,.02);g.stroke();
  g.globalCompositeOperation='source-over';g.beginPath();g.roundRect(-.48,.04,.86,.26,.13);g.fill();
  g.lineWidth=.1;g.lineCap='round';g.strokeStyle='#fff';for(const [y,l] of [[-.3,.32],[0,.42],[.3,.3]]){g.beginPath();g.moveTo(-.66,y);g.lineTo(-.66-l,y);g.stroke();}}
 else if(name==='kick'){// a boot kicking forward: tall shaft, laces, a rounded toe, a thick sole and speed lines behind
  g.moveTo(-.5,-.78);g.lineTo(-.04,-.78);g.lineTo(-.02,-.06);g.quadraticCurveTo(.3,-.06,.52,.06);g.quadraticCurveTo(.74,.18,.72,.36);g.lineTo(.72,.46);g.lineTo(-.54,.46);g.quadraticCurveTo(-.58,.1,-.5,-.78);g.closePath();g.fill();
  g.globalCompositeOperation='destination-out';g.fillRect(-.6,.3,1.4,.08);g.lineWidth=.07;g.lineCap='round';for(const y of [-.58,-.4,-.22]){g.beginPath();g.moveTo(-.36,y);g.lineTo(-.14,y+.08);g.stroke();}g.globalCompositeOperation='source-over';
  g.lineWidth=.1;g.lineCap='round';for(const [y,l] of [[-.52,.22],[-.22,.3],[.08,.22]]){g.beginPath();g.moveTo(-.72,y);g.lineTo(-.72-l,y);g.stroke();}}
 else if(name==='jump'){// two stacked chevrons going up
  g.lineWidth=.24;g.lineCap='round';g.lineJoin='round';g.strokeStyle='#fff';for(const y of [-.12,.36]){g.beginPath();g.moveTo(-.52,y+.2);g.lineTo(0,y-.3);g.lineTo(.52,y+.2);g.stroke();}}
 else if(name==='special'){// a lightning bolt
  g.moveTo(.18,-.86);g.lineTo(-.46,.1);g.lineTo(-.04,.1);g.lineTo(-.2,.86);g.lineTo(.48,-.16);g.lineTo(.05,-.16);g.closePath();g.fill();}}
function render(name,col,r,down,pic){const pad=Math.ceil(r*.18),S=Math.ceil(r*2+pad*2),cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d'),c=S/2;
 // drop shadow and the black bezel
 g.fillStyle='rgba(0,0,0,.45)';g.beginPath();g.ellipse(c,c+r*.1,r*1.02,r*.98,0,0,7);g.fill();
 let gr=g.createLinearGradient(0,c-r,0,c+r);gr.addColorStop(0,'#3a3a40');gr.addColorStop(.5,'#141418');gr.addColorStop(1,'#050507');g.fillStyle=gr;g.beginPath();g.arc(c,c,r,0,7);g.fill();
 g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=Math.max(1,r*.035);g.beginPath();g.arc(c,c,r*.97,Math.PI*1.1,Math.PI*1.9);g.stroke();
 // the hole the cap sits in
 g.fillStyle='#000';g.beginPath();g.arc(c,c+r*.03,r*.82,0,7);g.fill();
 const cr=r*(down?.74:.78),cy=c+(down?r*.05:-r*.03);
 if(pic){g.save();g.beginPath();g.arc(c,cy,cr,0,7);g.clip();g.drawImage(pic,c-cr,cy-cr,cr*2,cr*2);g.restore();return cv;}
 // the cap's side (a darker band under the dome), then the dome
 if(!down){g.fillStyle=shade(col,-.45);g.beginPath();g.arc(c,cy+r*.09,cr,0,7);g.fill();}
 gr=g.createRadialGradient(c-cr*.35,cy-cr*.45,cr*.08,c,cy,cr*1.05);gr.addColorStop(0,shade(col,down?.15:.5));gr.addColorStop(.55,shade(col,down?-.15:0));gr.addColorStop(1,shade(col,down?-.5:-.35));
 g.fillStyle=gr;g.beginPath();g.arc(c,cy,cr,0,7);g.fill();
 g.strokeStyle=shade(col,-.55);g.lineWidth=Math.max(1,r*.03);g.stroke();
 // the icon, pressed into the cap: drawn on its own canvas (it cuts its finger lines out of itself), a dark copy a little lower
 const ik=cr*.62,IS=Math.ceil(ik*2.6),ic=document.createElement('canvas');ic.width=ic.height=IS;const h=ic.getContext('2d');h.translate(IS/2,IS/2);h.scale(ik,ik);h.fillStyle=h.strokeStyle='#fff';icon(h,name);
 const dk=document.createElement('canvas');dk.width=dk.height=IS;const d=dk.getContext('2d');d.drawImage(ic,0,0);d.globalCompositeOperation='source-in';d.fillStyle='rgba(0,0,0,.45)';d.fillRect(0,0,IS,IS);
 g.drawImage(dk,c-IS/2,cy-IS/2+r*.045);g.drawImage(ic,c-IS/2,cy-IS/2);
 // the glossy highlight
 if(!down){g.save();g.beginPath();g.arc(c,cy,cr,0,7);g.clip();gr=g.createLinearGradient(0,cy-cr,0,cy);gr.addColorStop(0,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.beginPath();g.ellipse(c-cr*.12,cy-cr*.52,cr*.62,cr*.34,-.2,0,7);g.fill();g.restore();}
 return cv;}
// draw one button centred on (x,y), hit radius r; label = what it does now (drawn on a plate under the button)
function drawButton(g,DS,name,x,y,r,{col,down,label,alpha=1,glow=0}={}){const R=Math.round(r),pic=(down&&DS?.picture('btn-'+name+'-down'))||DS?.picture('btn-'+name);
 const key=`${name}|${col}|${R}|${down?1:0}|${pic?1:0}`;let cv=cache.get(key);if(!cv){if(cache.size>64)cache.clear();cv=render(name,col,R,down,pic);cache.set(key,cv);}
 g.save();g.globalAlpha=alpha;
 if(glow>0){const gl=g.createRadialGradient(x,y,r*.5,x,y,r*1.6);gl.addColorStop(0,`rgba(255,220,90,${.45*glow})`);gl.addColorStop(1,'rgba(255,220,90,0)');g.fillStyle=gl;g.beginPath();g.arc(x,y,r*1.6,0,7);g.fill();}
 g.drawImage(cv,x-cv.width/2,y-cv.height/2);
 if(label){const fs=Math.max(9,r*.27);g.font=`900 ${fs}px "SC Nunito",sans-serif`;g.textAlign='center';g.textBaseline='middle';const tw=g.measureText(label).width+fs*.9,ty=y+r+fs*.2;
  g.fillStyle='rgba(0,0,0,.72)';g.beginPath();g.roundRect(x-tw/2,ty-fs*.62,tw,fs*1.24,fs*.4);g.fill();g.fillStyle='#fff';g.fillText(label,x,ty+fs*.04);}
 g.restore();}
Object.assign(exports,{drawButton});
