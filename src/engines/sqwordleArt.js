// SQWORDLE ART (owner, Nov 12): picture slots + Squirtle's moves. Every picture is optional: assets/sqwordle/<name>.webp|png
// → USER_PORTRAITS['sqwordle:<name>'] (tools/build.mjs); with none in, everything below is drawn in code.
// Slots and the GPT brief: docs/art-for-gpt/SQWORDLE-ART.md (template pictures: tools/sqwordle-templates.mjs).
//  heads   mascot, mascot-happy, mascot-sad, mascot-think   (square, the head by the title; reacts to each guess)
//  bodies  body-<pose> facing RIGHT, feet at the bottom middle, 768x768: idle aim blow brace shell cheer phew sad
//          (a pose may come as frames body-<pose>-1, -2, ... played at FPS; the plain name wins if both exist)
//  effects fx-jet (water stream, tiles left to right), fx-hydro (thick blast stream, tiles), fx-bubble, fx-drop,
//          fx-splash (impact burst), fx-rainbow, fx-sparkle
//  backgrounds bg (light, tall 1080x1920), bg-dark, bg-wide (1920x1080), bg-wide-dark
// MOVES are played when you get the word, one per guess count like the real game's six messages:
//  1 squirt (SQUIRTLE SQUIRT!), 2 hydro (Hydro Pump!), 3 bubble (Bubble Beam!), 4 gun (Water Gun!), 5 withdraw, 6 phew;
//  a miss = sad. Squirtle rises over the keyboard (not needed once the word is done) and aims at the winning row.
let USER={};try{USER=require("src/data/userPortraits.js").USER_PORTRAITS||{};}catch{}
const imgs=new Map();
function picture(name){const url=USER['sqwordle:'+name];if(!url||typeof Image==='undefined')return null;
 let e=imgs.get(name);if(!e){e={img:new Image(),ok:false};e.img.onload=()=>{e.ok=true;};e.img.src=url;imgs.set(name,e);}return e.ok?e.img:null;}
const has=name=>!!USER['sqwordle:'+name];
// frames of a pose: body-aim, or body-aim-1..-8
function frames(name){if(has(name)){const p=picture(name);return p?[p]:[];}const out=[];for(let k=1;k<=8&&has(name+'-'+k);k++){const p=picture(name+'-'+k);if(p)out.push(p);}return out;}
const FPS=8;
// where the water comes out and where tears/sweat start, as fractions of the picture (facing right). Claude measures them
// on import from the owner's pictures and writes them here; these defaults match the template guides.
const MOVES=['squirt','hydro','bubble','gun','withdraw','phew'];
const ease=k=>1-Math.pow(1-Math.max(0,Math.min(1,k)),3);
const back=k=>{k=Math.max(0,Math.min(1,k));const c=1.7;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);};

// ---- the head (our own drawing): big eyes, mood 'idle' | 'happy' | 'sad' | 'think' | 'blow'
function head(x,r,mood,t){
 const g=x.createRadialGradient(-r*.3,-r*.4,r*.2,0,0,r*1.1);g.addColorStop(0,'#a6dcf6');g.addColorStop(1,'#5aaee0');
 x.fillStyle=g;x.beginPath();x.ellipse(0,0,r,r*.92,0,0,Math.PI*2);x.fill();x.strokeStyle='#2c6d96';x.lineWidth=Math.max(1,r*.06);x.stroke();
 const blink=mood==='idle'&&((t%4)>3.85),closed=mood==='sad'||blink||mood==='happy'&&(t%1.2)<.5;
 for(const s of [-1,1]){const ex=s*r*.38,ey=-r*.12;
  if(closed){x.strokeStyle='#3a2318';x.lineWidth=r*.09;x.lineCap='round';x.beginPath();const sad=mood==='sad';x.arc(ex,ey+(sad?r*.12:mood==='happy'?r*.06:0),r*.17,sad?Math.PI*1.15:mood==='happy'?Math.PI*1.15:Math.PI*.15,sad?Math.PI*1.85:mood==='happy'?Math.PI*1.85:Math.PI*.85);x.stroke();continue;}
  x.fillStyle='#fff';x.beginPath();x.ellipse(ex,ey,r*.22,r*.28,0,0,Math.PI*2);x.fill();
  const lx=mood==='think'?r*.06:s*r*.03,ly=mood==='think'?-r*.06:r*.04;
  x.fillStyle='#7a2e1e';x.beginPath();x.ellipse(ex+lx,ey+ly,r*.15,r*.2,0,0,Math.PI*2);x.fill();
  x.fillStyle='#1b0b06';x.beginPath();x.ellipse(ex+lx,ey+ly+r*.02,r*.08,r*.11,0,0,Math.PI*2);x.fill();
  x.fillStyle='#fff';x.beginPath();x.arc(ex+lx-r*.07,ey+ly-r*.1,r*.06,0,Math.PI*2);x.fill();
  if(mood==='think'&&s>0){x.strokeStyle='#2c4f66';x.lineWidth=r*.07;x.lineCap='round';x.beginPath();x.moveTo(ex-r*.18,ey-r*.38);x.lineTo(ex+r*.16,ey-r*.46);x.stroke();}}
 x.strokeStyle='#2c4f66';x.lineWidth=r*.07;x.lineCap='round';
 if(mood==='happy'){x.fillStyle='#8a2b2b';x.beginPath();x.arc(0,r*.32,r*.22,0,Math.PI);x.closePath();x.fill();x.stroke();x.fillStyle='#f28b8b';x.beginPath();x.arc(0,r*.44,r*.1,0,Math.PI*2);x.fill();}
 else if(mood==='sad'){x.beginPath();x.arc(0,r*.55,r*.18,Math.PI*1.15,Math.PI*1.85);x.stroke();
  x.fillStyle='#8fd3ff';x.beginPath();x.ellipse(r*.42,r*.2+((t*40)%(r*.6)),r*.06,r*.1,0,0,Math.PI*2);x.fill();}
 else if(mood==='blow'){x.fillStyle='#5a1f1f';x.beginPath();x.ellipse(r*.04,r*.36,r*.13,r*.11,0,0,Math.PI*2);x.fill();x.stroke();}
 else if(mood==='think'){x.beginPath();x.moveTo(-r*.14,r*.34);x.quadraticCurveTo(r*.02,r*.26,r*.18,r*.36);x.stroke();}
 else{x.beginPath();x.arc(0,r*.25,r*.2,Math.PI*.15,Math.PI*.85);x.stroke();}
}
// head with a peek of the shell (the header mascot / old pop-up)
function squirtle(x,cx,cy,r,mood='idle',t=0){
 x.save();x.translate(cx,cy);
 x.fillStyle='#b8733a';x.beginPath();x.ellipse(0,r*.95,r*1.15,r*.55,0,Math.PI,0);x.fill();
 x.fillStyle='#f1d58e';x.beginPath();x.ellipse(0,r*1.02,r*.95,r*.42,0,Math.PI,0);x.fill();
 head(x,r,mood,t);x.restore();}
const HEAD={happy:'mascot-happy',sad:'mascot-sad',think:'mascot-think'};
function mascot(x,cx,cy,r,mood,t){const im=picture(HEAD[mood]||'mascot')||(mood!=='idle'&&picture('mascot'));
 if(!im){squirtle(x,cx,cy,r,mood,t);return;}const k=r*2.3/Math.max(im.naturalWidth,im.naturalHeight);x.drawImage(im,cx-im.naturalWidth*k/2,cy-im.naturalHeight*k/2,im.naturalWidth*k,im.naturalHeight*k);}

// ---- background: cover the screen, keep the middle; null when the owner hasn't sent one
function background(dark,wide){const order=wide?(dark?['bg-wide-dark','bg-dark','bg-wide','bg']:['bg-wide','bg','bg-wide-dark','bg-dark']):(dark?['bg-dark','bg','bg-wide-dark','bg-wide']:['bg','bg-wide','bg-dark','bg-wide-dark']);
 for(const n of order){const p=picture(n);if(p)return p;}return null;}
function drawBackground(x,W,H,dark,top=0){const im=background(dark,W>H*1.1);if(!im)return false;
 const k=Math.max(W/im.naturalWidth,(H-top)/im.naturalHeight),w=im.naturalWidth*k,h=im.naturalHeight*k;x.drawImage(im,(W-w)/2,top+(H-top-h)/2,w,h);return true;}

// ---- the whole body (our own drawing), facing right, in a box h tall with the feet at (0,0)
const POSE_LOOK={idle:{arm:[.3,.6],mood:'idle'},aim:{arm:[-.1,-.2],mood:'blow',lean:.12},blow:{arm:[.5,.7],mood:'blow',lean:.05},
 brace:{arm:[.2,.1],mood:'blow',lean:-.06,wide:1},cheer:{arm:[-1.9,-1.4],mood:'happy'},phew:{arm:[-2.4,.6],mood:'idle'},sad:{arm:[1.2,1.3],mood:'sad',lean:.1}};
// where the water comes out (mouth) and tears/sweat start (eye), as fractions of the picture (facing right, feet at the
// bottom middle). They match our drawing and the templates; Claude re-measures them from the owner's pictures on import.
const rot=(a,[px,py])=>[.5+px*Math.cos(a)-py*Math.sin(a),1+px*Math.sin(a)+py*Math.cos(a)].map(v=>Math.round(v*1000)/1000);
const POSES={shell:{mouth:[.77,.66],eye:[.77,.66]}};
for(const [k,v] of Object.entries(POSE_LOOK))POSES[k]={mouth:rot(v.lean||0,[.105,-.65]),eye:rot(v.lean||0,[.184,-.746])};
function drawnBody(x,pose,h,t){const u=h;x.lineCap='round';x.lineJoin='round';
 const blue='#5aaee0',dk='#2c6d96';
 if(pose==='shell'){// pulled in: just the shell, from the back, holes for head/arms/legs
  x.fillStyle='#b8733a';x.strokeStyle='#6e4020';x.lineWidth=u*.025;x.beginPath();x.ellipse(0,-u*.3,u*.32,u*.28,0,0,Math.PI*2);x.fill();x.stroke();
  x.strokeStyle='#e7b26a';x.lineWidth=u*.02;for(const [a,b,c,d] of [[-.16,-.42,.16,-.42],[-.24,-.28,.24,-.28],[-.16,-.14,.16,-.14],[0,-.56,0,-.04]]){x.beginPath();x.moveTo(a*u,b*u);x.lineTo(c*u,d*u);x.stroke();}
  x.fillStyle='#2a1a10';for(const [cx,cy,r] of [[.27,-.34,.06],[-.27,-.34,.05],[.18,-.08,.045],[-.18,-.08,.045]]){x.beginPath();x.arc(cx*u,cy*u,r*u,0,Math.PI*2);x.fill();}
  return;}
 const L=POSE_LOOK[pose]||POSE_LOOK.idle,sw=Math.sin(t*6)*.06;x.save();x.rotate((L.lean||0));
 // tail (curl, behind)
 x.strokeStyle=dk;x.lineWidth=u*.1;x.beginPath();x.moveTo(-u*.2,-u*.18);x.quadraticCurveTo(-u*.48,-u*.12,-u*.46,-u*.34);x.stroke();
 x.strokeStyle=blue;x.lineWidth=u*.07;x.stroke();x.fillStyle=blue;x.beginPath();x.arc(-u*.4,-u*.36,u*.07,0,Math.PI*2);x.fill();
 // legs
 const lw=L.wide?.17:.11;x.fillStyle=blue;x.strokeStyle=dk;x.lineWidth=u*.02;for(const s of [-1,1]){x.beginPath();x.ellipse(s*lw*u+u*.02,-u*.06,u*.1,u*.07,0,0,Math.PI*2);x.fill();x.stroke();}
 // shell + cream belly
 x.fillStyle='#b8733a';x.strokeStyle='#6e4020';x.lineWidth=u*.025;x.beginPath();x.ellipse(-u*.06,-u*.32,u*.25,u*.26,0,0,Math.PI*2);x.fill();x.stroke();
 x.fillStyle='#f1d58e';x.beginPath();x.ellipse(u*.06,-u*.31,u*.15,u*.22,0,0,Math.PI*2);x.fill();x.strokeStyle='#c99c4a';x.lineWidth=u*.012;x.stroke();
 for(const y of [-.4,-.31,-.22]){x.beginPath();x.moveTo(u*-.04,y*u);x.lineTo(u*.16,y*u);x.stroke();}
 // arms (stubby, from the shoulders)
 for(const [k,s] of [[0,1],[1,-1]]){const a=L.arm[k]+sw*(pose==='cheer'?3:1),sx=u*(.02+s*.12),sy=-u*.46;
  x.strokeStyle=dk;x.lineWidth=u*.1;x.beginPath();x.moveTo(sx,sy);x.lineTo(sx+Math.cos(a)*u*.2,sy+Math.sin(a)*u*.2);x.stroke();
  x.strokeStyle=blue;x.lineWidth=u*.075;x.stroke();}
 // head
 x.save();x.translate(u*.1,-u*.72);head(x,u*.22,L.mood,t);x.restore();x.restore();}

// draw a pose with its feet at (fx,fy), h tall, face +1 right / -1 left; returns the mouth and eye points on screen
// the owner's pictures (Nov 13): mouth/eye spots measured on each one (assets/originals/sqwordle/body-*.png, 768 canvas,
// ground y 737, body box 691 px). A pose without its own picture borrows the nearest one (POSE_ALIAS) so the drawn turtle
// never pops up next to the painted one: Water Gun (aim) and Hydro Pump (brace) use the puffed-cheek blow picture.
const ART_POSES={idle:{mouth:[.624,.368],eye:[.697,.269]},blow:{mouth:[.636,.353],eye:[.711,.255]},cheer:{mouth:[.622,.36],eye:[.711,.259]},
 phew:{mouth:[.598,.342],eye:[.679,.237]},sad:{mouth:[.668,.36],eye:[.762,.295]},shell:{mouth:[.525,.702],eye:[.525,.702]}};
const POSE_ALIAS={aim:['blow','idle'],brace:['blow','cheer','idle'],blow:['idle'],cheer:['idle'],phew:['idle'],sad:['idle'],shell:[],idle:[]};
function poseArt(pose){let fr=frames('body-'+pose);if(fr.length)return {fr,key:pose};
 for(const alt of POSE_ALIAS[pose]||[]){fr=frames('body-'+alt);if(fr.length)return {fr,key:alt};}return null;}
function drawBody(x,pose,fx,fy,h,face,t,{rot=0,alpha=1}={}){const art=poseArt(pose),fr=art?art.fr:[],A=art?(ART_POSES[art.key]||POSES[art.key]||POSES.idle):(POSES[pose]||POSES.idle);
 x.save();x.globalAlpha*=alpha;x.translate(fx,fy);if(face<0)x.scale(-1,1);
 // a picture is the whole template canvas: ground line at 96% of its height, the body box (h) = 90% of it;
 // it turns round a point .3 h up (the middle of the shell in the Withdraw spin), like the drawn turtle
 if(fr.length){const im=fr[Math.floor(t*FPS)%fr.length],k=h/.9/im.naturalHeight,iw=im.naturalWidth*k,ih=im.naturalHeight*k;
  x.translate(0,-h*.3);x.rotate(rot);x.drawImage(im,-iw/2,h*.3-ih*.96,iw,ih);}
 else{x.translate(0,-h*.3);x.rotate(rot);x.translate(0,h*.3);drawnBody(x,pose,h,t);}
 x.restore();
 const pt=([u,v])=>({x:fx+face*(u-.5)*h,y:fy-(1-v)*h});return {mouth:pt(A.mouth),eye:pt(A.eye)};}

// ---- water: a stream from a to b (thickness w, k 0..1 = how far it has reached)
function stream(x,a,b,w,k,t,big){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)*k;if(len<2)return;
 const im=picture(big?'fx-hydro':'fx-jet');x.save();x.translate(a.x,a.y);x.rotate(Math.atan2(dy,dx));
 if(im){const seg=w*im.naturalWidth/im.naturalHeight,off=-((t*900)%seg);x.beginPath();x.rect(0,-w,len,w*2);x.clip();for(let p=off;p<len;p+=seg)x.drawImage(im,p,-w/2,seg,w);}
 else{const g=x.createLinearGradient(0,-w/2,0,w/2);g.addColorStop(0,'rgba(170,225,255,.9)');g.addColorStop(.5,'rgba(70,160,230,.95)');g.addColorStop(1,'rgba(30,110,200,.9)');
  x.fillStyle=g;x.beginPath();x.moveTo(0,-w*.25);
  for(let p=0;p<=len;p+=6){const ww=w*(.35+.15*Math.min(1,p/(w*2)))*(1+.12*Math.sin(p*.08-t*30));x.lineTo(p,-ww);}
  for(let p=len;p>=0;p-=6){const ww=w*(.35+.15*Math.min(1,p/(w*2)))*(1+.12*Math.sin(p*.08-t*30+1.7));x.lineTo(p,ww);}
  x.closePath();x.fill();x.strokeStyle='rgba(255,255,255,.7)';x.lineWidth=Math.max(1,w*.08);x.beginPath();
  for(let p=0;p<=len;p+=6)x.lineTo(p,-w*.12+Math.sin(p*.1-t*24)*w*.05);x.stroke();}
 x.restore();}
function bubble(x,cx,cy,r,a=1){const im=picture('fx-bubble');x.save();x.globalAlpha*=a;
 if(im)x.drawImage(im,cx-r,cy-r,r*2,r*2);
 else{const g=x.createRadialGradient(cx-r*.3,cy-r*.3,r*.1,cx,cy,r);g.addColorStop(0,'rgba(255,255,255,.75)');g.addColorStop(.6,'rgba(140,210,255,.25)');g.addColorStop(1,'rgba(90,170,240,.55)');
  x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fill();x.strokeStyle='rgba(60,140,220,.7)';x.lineWidth=Math.max(1,r*.1);x.stroke();
  x.fillStyle='rgba(255,255,255,.9)';x.beginPath();x.ellipse(cx-r*.35,cy-r*.4,r*.2,r*.12,-.6,0,Math.PI*2);x.fill();}
 x.restore();}
function drop(x,p,dark){const im=picture('fx-drop');const r=p.r;
 if(im){x.save();x.translate(p.x,p.y);x.rotate(Math.atan2(p.vy,p.vx)-Math.PI/2);x.drawImage(im,-r*1.2,-r*1.6,r*2.4,r*3.2);x.restore();return;}
 x.fillStyle=p.col||(dark?'#7cc8ff':'#4aa8e8');x.beginPath();x.ellipse(p.x,p.y,r*.7,r,Math.atan2(p.vy,p.vx)+Math.PI/2,0,Math.PI*2);x.fill();}
function burst(x,cx,cy,r,a){const im=picture('fx-splash');if(a<=0)return;x.save();x.globalAlpha*=a;
 if(im)x.drawImage(im,cx-r,cy-r,r*2,r*2);
 else{x.strokeStyle='rgba(90,175,240,.9)';x.lineWidth=Math.max(2,r*.08);x.beginPath();x.arc(cx,cy,r*.7,0,Math.PI*2);x.stroke();
  x.fillStyle='rgba(170,225,255,.8)';for(let k=0;k<10;k++){const ang=k/10*Math.PI*2;x.beginPath();x.ellipse(cx+Math.cos(ang)*r*.85,cy+Math.sin(ang)*r*.85,r*.07,r*.16,ang+Math.PI/2,0,Math.PI*2);x.fill();}}
 x.restore();}
function rainbow(x,cx,cy,r,a){if(a<=0)return;const im=picture('fx-rainbow');x.save();x.globalAlpha*=a;
 if(im)x.drawImage(im,cx-r,cy-r,r*2,r);
 else{x.lineWidth=r*.06;['#ff5a5a','#ffa34d','#ffe14d','#6ad46a','#4da6ff','#8a6dff'].forEach((c,i)=>{x.strokeStyle=c;x.beginPath();x.arc(cx,cy,r*(1-i*.06),Math.PI,0);x.stroke();});}
 x.restore();}
function sparkle(x,cx,cy,r,a){if(a<=0)return;const im=picture('fx-sparkle');x.save();x.globalAlpha*=a;
 if(im)x.drawImage(im,cx-r,cy-r,r*2,r*2);
 else{x.fillStyle='#fff6b0';x.beginPath();for(let k=0;k<8;k++){const ang=k*Math.PI/4,rr=k%2?r*.3:r;x.lineTo(cx+Math.cos(ang)*rr,cy+Math.sin(ang)*rr);}x.closePath();x.fill();}
 x.restore();}

// ---- a move: kind = MOVES[n-1] or 'sad'; stage = {x,y (feet), h, face, tx,ty (target), W,H}
const LEN={squirt:3000,hydro:2800,bubble:2700,gun:2500,withdraw:2600,phew:2400,sad:2400};
function createShow(kind,stage,now){return {kind,stage,t0:now,len:LEN[kind]||2500,bubbles:[],drops:[],nextB:0,nextD:0,hits:0};}
function moveFor(n,win){return win?(MOVES[Math.max(0,Math.min(5,n-1))]):'sad';}
// draws the show; returns {shake} for the caller (screen shake px) and plays sounds through sfx(event)
function drawShow(x,S,now,dt,dark,sfx=()=>{}){const st=S.stage,T=now-S.t0,t=now/1000,k=S.kind;let shake=0;
 // rise up from the bottom of the screen, then hold; sink away at the very end of a sad one
 const rise=back(T/420),fy=st.y+(1-rise)*(st.h*1.1),dir=st.face;let fx=st.x,pose='idle',rot=0;
 const fire=(a,b)=>T>=a&&T<b,ph=(a,b)=>Math.max(0,Math.min(1,(T-a)/(b-a)));
 const fireAt=(name,at)=>{if(T>=at&&!S['s'+name]){S['s'+name]=1;sfx(name);}};
 if(k==='gun'){pose=T<380?'idle':T<1700?'aim':'cheer';}
 else if(k==='hydro'){pose=T<380?'idle':T<1900?'brace':'cheer';if(fire(500,800))fx+=Math.sin(T*.12)*2;if(fire(800,1800))fx-=dir*Math.min(12,(T-800)*.03);}
 else if(k==='bubble'){pose=T<380?'idle':T<2000?'blow':'cheer';}
 else if(k==='squirt'){pose=T<380?'idle':T<1500?'brace':T<2300?'cheer':'cheer';}
 else if(k==='withdraw'){if(fire(420,1800)){pose='shell';rot=dir*ease(ph(420,1800))*Math.PI*4;}else pose=T<420?'idle':'cheer';}
 else if(k==='phew')pose=T<380?'idle':'phew';
 else if(k==='sad')pose='sad';
 let hop=0;if(pose==='cheer')hop=Math.abs(Math.sin((T-1500)/170))*st.h*.07;if(k==='withdraw'&&pose==='shell')hop=Math.sin(ph(420,1800)*Math.PI)*st.h*.35;
 if(k==='squirt'&&T>1500)hop=Math.abs(Math.sin((T-1500)/150))*st.h*.12;
 const body=drawBody(x,pose,fx,fy-hop,st.h,dir,t,{rot});
 const tgt={x:st.tx,y:st.ty},w=st.h*.11;
 // water gun: a jet that reaches the row, splashes it, then lets go
 const jet=(a,b,big)=>{if(!fire(a,b))return;const grow=ease(ph(a,a+260)),fade=1-ph(b-200,b);stream(x,body.mouth,tgt,(big?w*2.4:w)*(.4+.6*fade),grow,t,big);
  if(grow>=1&&T>S.nextD){S.nextD=T+(big?16:30);for(let q=0;q<(big?4:2);q++){const ang=Math.atan2(body.mouth.y-tgt.y,body.mouth.x-tgt.x)+(Math.random()-.5)*2.2,v=(big?260:160)+Math.random()*260;S.drops.push({x:tgt.x,y:tgt.y,vx:Math.cos(ang)*v,vy:Math.sin(ang)*v-120,life:.9,r:(big?3:2)+Math.random()*3});}}
  if(grow>=1)burst(x,tgt.x,tgt.y,st.h*(big?.55:.32)*(1+.08*Math.sin(T*.05)),.85*fade);return grow>=1;};
 if(k==='gun'){fireAt('gun',420);jet(420,1650,false);}
 if(k==='hydro'){if(fire(380,800)){// charge: water gathers at the mouth
   const c=ph(380,800);for(let q=0;q<3;q++){const a=Math.random()*Math.PI*2,d=st.h*.25*(1-c);x.fillStyle='rgba(120,200,255,.8)';x.beginPath();x.arc(body.mouth.x+Math.cos(a)*d,body.mouth.y+Math.sin(a)*d,2+c*3,0,Math.PI*2);x.fill();}bubble(x,body.mouth.x,body.mouth.y,st.h*.08*c,.9);}
  fireAt('hydro',800);if(jet(800,1850,true))shake=4;}
 if(k==='squirt'){fireAt('hydro',420);if(jet(420,1450,true))shake=3;fireAt('cheer',1500);
  rainbow(x,st.tx,st.ty+(st.gw||st.h*2)*.12,(st.gw||st.h*2)*.62,ph(1500,2000)*(1-ph(2700,3000))*.8);
  if(fire(1500,2700)&&T>S.nextB){S.nextB=T+70;S.bubbles.push({x:body.mouth.x,y:body.mouth.y,vx:dir*(40+Math.random()*90),vy:-120-Math.random()*120,r:st.h*(.04+Math.random()*.06),life:1.6});}
  for(let q=0;q<5;q++){const a=T/300+q*1.26;sparkle(x,st.tx+Math.cos(a)*st.h*.9,st.ty+Math.sin(a)*st.h*.35,st.h*.07*(1+.3*Math.sin(T/90+q)),ph(1500,1800)*(1-ph(2600,3000)));}}
 if(k==='bubble'){fireAt('bubble',420);
  if(fire(420,1900)&&T>S.nextB){S.nextB=T+85;const ang=Math.atan2(tgt.y-body.mouth.y,tgt.x-body.mouth.x),v=320+Math.random()*120;
   S.bubbles.push({x:body.mouth.x,y:body.mouth.y,vx:Math.cos(ang)*v,vy:Math.sin(ang)*v,r:st.h*(.035+Math.random()*.04),life:2,aim:1,wob:Math.random()*6});}}
 if(k==='withdraw'&&T>1800&&!S.out){S.out=1;sfx('pop');for(let q=0;q<14;q++){const a=-Math.PI/2+(Math.random()-.5)*2;S.drops.push({x:fx,y:fy-st.h*.5,vx:Math.cos(a)*220,vy:Math.sin(a)*260,life:1,r:2+Math.random()*2});}}
 if(k==='withdraw')fireAt('spin',420);
 if(k==='phew'&&T>900&&!S.sw){S.sw=1;sfx('phew');S.drops.push({x:body.eye.x,y:body.eye.y-st.h*.06,vx:-dir*140,vy:-220,life:1.2,r:st.h*.035,col:'#bfe6ff'});}
 if(k==='sad'&&T>500&&T>S.nextD&&T<LEN.sad-300){S.nextD=T+260;for(const s of [-1,1])S.drops.push({x:body.eye.x+s*st.h*.05,y:body.eye.y+st.h*.04,vx:s*40,vy:-40,life:1,r:st.h*.035,col:'#8fd3ff'});}
 // bubbles: aimed ones fly to the row and pop there, loose ones float up
 for(const b of S.bubbles){b.life-=dt;b.wob=(b.wob||0)+dt*8;
  if(b.aim){b.x+=b.vx*dt;b.y+=b.vy*dt+Math.sin(b.wob)*.8;if(Math.hypot(b.x-tgt.x,b.y-tgt.y)<st.h*.12||(b.x-tgt.x)*Math.sign(b.vx)>0){b.life=0;S.hits++;if(S.hits%3===1)sfx('pop');
    for(let q=0;q<5;q++){const a=Math.random()*Math.PI*2;S.drops.push({x:b.x,y:b.y,vx:Math.cos(a)*150,vy:Math.sin(a)*150-60,life:.6,r:2+Math.random()*2});}}}
  else{b.vy-=30*dt;b.x+=b.vx*dt+Math.sin(b.wob)*.6;b.y+=b.vy*dt;}
  bubble(x,b.x,b.y,b.r,Math.min(1,b.life*2));}
 S.bubbles=S.bubbles.filter(b=>b.life>0);
 for(const p of S.drops){p.vy+=900*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;x.globalAlpha=Math.max(0,Math.min(1,p.life*2));drop(x,p,dark);}x.globalAlpha=1;
 S.drops=S.drops.filter(p=>p.life>0&&p.y<st.H+20);
 return {shake};}

Object.assign(exports,{poseArt,ART_POSES,picture,frames,mascot,squirtle,drawBackground,background,drawBody,createShow,drawShow,moveFor,MOVES,POSES,LEN,drop,bubble,stream});
