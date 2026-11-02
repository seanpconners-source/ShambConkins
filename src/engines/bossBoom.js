// Boss explosions (ROADMAP K20/K15): fireballs, smoke, debris, shockwaves, light rays, embers and the boss's flying head,
// used for knockouts (bigger every difficulty tier) and phase breaks. Each effect is a plain object in bossFight's fx
// list (k: 'fb' fireball, 'sm' smoke, 'db' debris, 'sw' shockwave, 'ray' light rays, 'em' ember, 'hd' head);
// stepBoom moves one, drawBoom paints one. Units are arena units. `delay` holds an effect back (it is invisible and
// still) so one call can lay out a whole sequence; `life` counts delay + duration like the engine's other fx.
const TAU=Math.PI*2;
const rnd=(a,b)=>a+Math.random()*(b-a);
const mk=(k,o,dur,delay=0)=>Object.assign({k,max:dur,delay,life:dur+delay},o);
const age=e=>e.delay+e.max-e.life;
// fireball: blooms from white-hot to orange and red, then turns into a dark puff of smoke
const fireball=(x,y,r,dur=.9,delay=0)=>mk('fb',{x,y,r,lobes:Array.from({length:5},()=>[rnd(0,TAU),rnd(.25,.6),rnd(.45,.8)]),vy:rnd(-40,-15)},dur,delay);
const smoke=(x,y,r,dur=1.6,delay=0)=>mk('sm',{x,y,r,vx:rnd(-12,12),vy:rnd(-55,-25),shade:rnd(30,70)},dur,delay);
const debris=(x,y,col,sp,delay=0)=>{const a=rnd(0,TAU),v=rnd(.4,1)*sp;return mk('db',{x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-sp*.35,rot:rnd(0,TAU),spin:rnd(-9,9),s:rnd(5,13),col,pts:Array.from({length:4+Math.floor(rnd(0,3))},(_,i,l)=>[i/4*TAU+rnd(-.4,.4),rnd(.55,1)])},rnd(1.2,2),delay);};
const shockwave=(x,y,R,dur=.7,delay=0,col='#fff')=>mk('sw',{x,y,R,col},dur,delay);
const rays=(x,y,R,dur=1.6,delay=0,n=12)=>mk('ray',{x,y,R,n,rot:rnd(0,TAU)},dur,delay);
const ember=(x,y,dur,delay=0)=>mk('em',{x,y,vx:rnd(-25,25),vy:rnd(-70,-20),r:rnd(1.2,2.8),ph:rnd(0,TAU)},dur,delay);
// the head pops up a little and tumbles down across the screen past the players
const head=(x,y,img,dur=2.6)=>mk('hd',{x,y,img,vx:rnd(120,240)*(Math.random()<.5?1:-1),vy:rnd(-380,-300),rot:0,spin:rnd(6,11)*(Math.random()<.5?1:-1)},dur);

// knockout styles per difficulty tier (0 Easy .. 3 Extreme): chain = slow-motion seconds of popping before the big one,
// rate = seconds between chain pops, boom = chain fireball size, final = main blast radius (null = whole screen),
// shocks/debris/embers counts, after = extra blasts going off across the screen after the main one, white = flash,
// hold = seconds from the main blast to the result screen, title = the knockout banner
const KO_STYLE=[
 {chain:1.8,rate:.11,boom:30,final:150,shocks:1,debris:16,embers:20,after:0,rays:false,white:.9,hold:3.2,title:'KNOCKOUT!'},
 {chain:2.1,rate:.085,boom:36,final:190,shocks:2,debris:24,embers:32,after:0,rays:true,white:1,hold:3.3,title:'KNOCKOUT!'},
 {chain:2.5,rate:.065,boom:44,final:250,shocks:3,debris:34,embers:48,after:4,rays:true,white:1.2,hold:3.7,title:'DESTROYED!'},
 {chain:3.1,rate:.045,boom:54,final:null,shocks:5,debris:48,embers:80,after:9,rays:true,white:2.1,hold:4.6,title:'ANNIHILATED!!'}];

// one pop of the knockout chain, or a hit of damage smoke: a random spot on the boss's hit circles
function spotOn(circles){const c=circles[Math.floor(Math.random()*circles.length)]||[0,0,60],a=rnd(0,TAU),r=Math.sqrt(Math.random())*c[2];return [c[0]+Math.cos(a)*r,c[1]+Math.sin(a)*r];}
function chainPop(out,circles,st,pal){const [x,y]=spotOn(circles);out.push(fireball(x,y,st.boom*rnd(.6,1.2),rnd(.6,.9)),smoke(x,y-6,st.boom*.7,rnd(1.2,1.8),.25));
 if(Math.random()<.5)out.push(debris(x,y,pal[Math.floor(rnd(0,2))],rnd(180,320)));return [x,y];}
// the main blast at (x,y); W,H = arena size (Extreme's blast fills it)
function mainBlast(out,x,y,st,pal,W,H){const R=st.final||Math.hypot(W,H)*.75;
 out.push(fireball(x,y,R*.55,1.3),fireball(x+rnd(-30,30),y+rnd(-30,30),R*.42,1.2,.08),fireball(x+rnd(-40,40),y+rnd(-20,20),R*.36,1.1,.18));
 for(let i=0;i<st.shocks;i++)out.push(shockwave(x,y,R*(1.1+i*.35),.75+i*.12,i*.13,i%2?'#ffd23c':'#fff'));
 if(st.rays)out.push(rays(x,y,R*1.6,1.8,0,st.final?12:18));
 for(let i=0;i<st.debris;i++)out.push(debris(x+rnd(-20,20),y+rnd(-20,20),i%3?pal[i%2]:pal[2]||'#888',rnd(320,720)));
 for(let i=0;i<8+st.shocks*2;i++){const a=i/(8+st.shocks*2)*TAU;out.push(smoke(x+Math.cos(a)*R*.35,y+Math.sin(a)*R*.3,R*.22,rnd(1.6,2.4),rnd(.3,.6)));}
 for(let i=0;i<st.embers;i++)out.push(ember(rnd(0,W),rnd(H*.2,H),rnd(2,3.6),rnd(.2,1.2)));
 // after-blasts across the screen (Hard, Extreme), and on Extreme a rising column of smoke over the blast
 const later=[];for(let i=0;i<st.after;i++){const d=.35+i*(st.final?.28:.22),ax=rnd(W*.1,W*.9),ay=rnd(H*.15,H*.8);out.push(fireball(ax,ay,st.boom*rnd(1.3,2.2),1,d),smoke(ax,ay,st.boom,1.8,d+.3));later.push(d);}
 if(!st.final)for(let i=0;i<10;i++)out.push(smoke(x+rnd(-24,24),y-i*28,46+i*7,2.6,.5+i*.07));
 return later;}
// a phase break: a few blasts on the boss and armour flying off (bigger for the final phase)
function phaseBreak(out,circles,pal,big){for(let i=0;i<(big?7:4);i++){const [x,y]=spotOn(circles);out.push(fireball(x,y,rnd(26,44)*(big?1.4:1),rnd(.6,.9),i*.06));}
 const c=circles[0]||[0,0,60];out.push(shockwave(c[0],c[1],c[2]*(big?3.2:2.2),.7,0,big?'#ff4b6a':'#fff'));
 for(let i=0;i<(big?26:12);i++)out.push(debris(c[0],c[1],pal[i%2],rnd(240,480)));}

function stepBoom(e,dt){if(age(e)<e.delay)return;
 switch(e.k){case 'fb':e.y+=e.vy*dt;break;case 'sm':e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy*=1-dt*.6;break;
  case 'db':e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy+=520*dt;e.vx*=1-dt*.4;e.rot+=e.spin*dt;break;
  case 'em':e.x+=e.vx*dt+Math.sin(age(e)*3+e.ph)*14*dt;e.y+=e.vy*dt;break;
  case 'hd':e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy+=620*dt;e.rot+=e.spin*dt;break;}}
function drawBoom(g,e){const a=age(e);if(a<e.delay)return;const p=Math.min(1,(a-e.delay)/e.max);g.save();
 switch(e.k){
  case 'fb':{const grow=1-Math.pow(1-p,3),R=e.r*(.3+.7*grow);
   // smoke underneath first, then the fire on top in additive light
   g.globalAlpha=Math.max(0,.55*(1-p))*Math.min(1,p*3);g.fillStyle='#2a2422';for(const [ang,off,s] of e.lobes){g.beginPath();g.arc(e.x+Math.cos(ang)*R*off,e.y+Math.sin(ang)*R*off-p*R*.3,R*s*1.1,0,TAU);g.fill();}
   const heat=1-p;if(heat>.05){g.globalCompositeOperation='lighter';g.globalAlpha=Math.min(1,heat*1.4);
    for(const [ang,off,s] of e.lobes){const cx=e.x+Math.cos(ang)*R*off,cy=e.y+Math.sin(ang)*R*off,rr=R*s;const gr=g.createRadialGradient(cx,cy,0,cx,cy,rr);
     gr.addColorStop(0,p<.25?'#ffffff':'#ffe9a0');gr.addColorStop(.35,p<.45?'#ffd23c':'#ff8a2a');gr.addColorStop(.75,p<.6?'#ff6a1a':'#c2261a');gr.addColorStop(1,'rgba(120,10,0,0)');g.fillStyle=gr;g.beginPath();g.arc(cx,cy,rr,0,TAU);g.fill();}}
   break;}
  case 'sm':{const R=e.r*(.5+p*.9);g.globalAlpha=.5*(1-p)*Math.min(1,p*4);const s=e.shade;g.fillStyle=`rgb(${s},${s-4},${s-8})`;g.beginPath();g.arc(e.x,e.y,R,0,TAU);g.arc(e.x+R*.6,e.y+R*.2,R*.7,0,TAU);g.arc(e.x-R*.55,e.y+R*.25,R*.65,0,TAU);g.fill();break;}
  case 'db':{g.globalAlpha=p>.75?(1-p)*4:1;g.translate(e.x,e.y);g.rotate(e.rot);g.beginPath();e.pts.forEach(([ang,r],i)=>{const px=Math.cos(ang)*r*e.s,py=Math.sin(ang)*r*e.s;i?g.lineTo(px,py):g.moveTo(px,py);});g.closePath();
   g.fillStyle=e.col;g.fill();g.lineWidth=2;g.strokeStyle='#140a0c';g.stroke();if(p<.5){g.globalCompositeOperation='lighter';g.globalAlpha=(.5-p)*1.6;g.fillStyle='#ff9a3a';g.fill();}break;}
  case 'sw':{const u=1-Math.pow(1-p,2.2),R=e.R*u;g.globalAlpha=(1-p)*.9;g.strokeStyle=e.col;g.lineWidth=14*(1-p)+2;g.beginPath();g.arc(e.x,e.y,R,0,TAU);g.stroke();
   g.globalAlpha=(1-p)*.18;g.fillStyle=e.col;g.fill();break;}
  case 'ray':{g.globalCompositeOperation='lighter';g.globalAlpha=Math.sin(p*Math.PI)*.45;g.translate(e.x,e.y);g.rotate(e.rot+p*.6);const gr=g.createRadialGradient(0,0,0,0,0,e.R);gr.addColorStop(0,'#fff6c8');gr.addColorStop(1,'rgba(255,200,80,0)');g.fillStyle=gr;
   for(let i=0;i<e.n;i++){const a0=i/e.n*TAU,w=TAU/e.n*.32;g.beginPath();g.moveTo(0,0);g.arc(0,0,e.R,a0-w/2,a0+w/2);g.closePath();g.fill();}break;}
  case 'em':{g.globalCompositeOperation='lighter';g.globalAlpha=(1-p)*(.6+.4*Math.sin(a*12+e.ph));g.fillStyle=p<.5?'#ffd23c':'#ff6a2a';g.beginPath();g.arc(e.x,e.y,e.r,0,TAU);g.fill();break;}
  case 'hd':{if(!e.img)break;g.globalAlpha=p>.85?(1-p)/.15:1;g.translate(e.x,e.y);g.rotate(e.rot);const s=130;g.drawImage(e.img,-s/2,-s/2,s,s);break;}}
 g.restore();}
const BOOM_KINDS=new Set(['fb','sm','db','sw','ray','em','hd']);

Object.assign(exports,{KO_STYLE,chainPop,mainBlast,phaseBreak,spotOn,fireball,smoke,ember,head,debris,shockwave,stepBoom,drawBoom,BOOM_KINDS});
