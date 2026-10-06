const {clamp, seededRandom}=require("src/utils.js");
const {circle, COLORS}=require("src/engines/session.js");
const {sound}=require("src/audio.js");
const TARGET=52,TARGET_DRAW=74,HEAD_R=30,HEAD_DRAW=76;
function headFort(seed,level=0){const random=seededRandom(seed+'-'+level),bodies=[];
 // Sizes are chosen so the opponent's heads (targets) read clearly on a phone; TARGET is the target box, drawn at TARGET_DRAW.
 for(let tower=0;tower<3;tower++){const cx=410+tower*104,height=2+(level+tower)%2;for(let row=0;row<height;row++)bodies.push({id:`b${tower}-${row}`,kind:'block',material:row===height-1?'glass':tower===1?'stone':'wood',x:cx,y:310-25-row*50,w:76,h:48,vx:0,vy:0,hp:tower===1?3:row===height-1?1:2,dead:false});bodies.push({id:`t${tower}`,kind:'target',x:cx,y:310-height*50-TARGET/2-1,w:TARGET,h:TARGET,vx:0,vy:0,hp:1,dead:false});}
 bodies.push({id:'t-ground',kind:'target',x:318+random()*24,y:310-TARGET/2,w:TARGET,h:TARGET,vx:0,vy:0,hp:1,dead:false});return bodies;
}
function separateBoxes(a,b){const dx=b.x-a.x,dy=b.y-a.y,ox=(a.w+b.w)/2-Math.abs(dx),oy=(a.h+b.h)/2-Math.abs(dy);if(ox<=0||oy<=0)return;
 const axis=ox<oy?'x':'y',sign=Math.sign(axis==='x'?dx:dy)||1,overlap=axis==='x'?ox:oy,velocity=axis==='x'?'vx':'vy';a[axis]-=sign*overlap/2;b[axis]+=sign*overlap/2;const impulse=(a[velocity]-b[velocity])*sign;
 if(impulse>0){a[velocity]-=sign*impulse*.65;b[velocity]+=sign*impulse*.65;if(impulse>120){a.hp-=a.kind==='target'?1:.3;b.hp-=b.kind==='target'?1:.3;}}
}
function stepHeadFort(bodies,head,dt,ground=310){const destroyed=[];const steps=Math.max(1,Math.ceil(dt*160)),h=dt/steps;
 for(let sub=0;sub<steps;sub++){
  for(const b of bodies){if(b.dead)continue;b.vy+=460*h;b.x+=b.vx*h;b.y+=b.vy*h;b.vx*=Math.pow(.993,h*60);if(b.y+b.h/2>ground){const speed=b.vy;b.y=ground-b.h/2;b.vy=speed>28?-speed*.14:0;b.vx*=.95;if(speed>145&&b.kind==='target')b.hp=0;}if(b.x<25||b.x>705||b.y>360)b.hp=0;}
  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++)if(!bodies[i].dead&&!bodies[j].dead)separateBoxes(bodies[i],bodies[j]);
  if(head?.flying){head.vy+=460*h;head.x+=head.vx*h;head.y+=head.vy*h;
   for(const b of bodies){if(b.dead)continue;const nearest={x:clamp(head.x,b.x-b.w/2,b.x+b.w/2),y:clamp(head.y,b.y-b.h/2,b.y+b.h/2)},dx=head.x-nearest.x,dy=head.y-nearest.y,d=Math.hypot(dx,dy);if(d>=head.r)continue;const nx=d>0?dx/d:Math.sign(head.x-b.x)||-1,ny=d>0?dy/d:0,speed=(head.vx-b.vx)*nx+(head.vy-b.vy)*ny;
    head.x+=nx*(head.r-d+.1);head.y+=ny*(head.r-d+.1);if(speed<0){const impact=-speed;b.vx-=nx*impact*.52;b.vy-=ny*impact*.52;head.vx-=nx*speed*1.18;head.vy-=ny*speed*1.18;if(impact>60)b.hp-=b.kind==='target'?1:impact/(b.material==='stone'?260:145);}}
   if(head.y+head.r>ground){head.y=ground-head.r;head.vy=-Math.abs(head.vy)*.27;head.vx*=.7;if(Math.hypot(head.vx,head.vy)<32)head.flying=false;}if(head.x>740||head.x<-70||head.y>400)head.flying=false;
  }
  for(const b of bodies)if(!b.dead&&b.hp<=0){b.dead=true;destroyed.push(b);}
 }return destroyed;
}

async function headlaunch(s){const[c,x]=s.canvas(700,355,{fill:true}),W=700,H=355,scores=[0,0],origin={x:110,y:235};let K=1,ox=0,oy=0,from=origin,actor=0,level=0,shot=0,bodies=[],head=null,drag=null,phase='aim',aimClock=12,flight=0,angle=-.55,power=100,particles=[];
 function resetLevel(){bodies=headFort(s.seed,level);for(let i=0;i<90;i++)stepHeadFort(bodies,null,1/160);shot=0;resetHead();}
 function resetHead(){head={...origin,vx:0,vy:0,r:HEAD_R,flying:false};drag=null;phase='aim';aimClock=12;flight=0;}
 function fire(){if(phase!=='aim'||s.paused)return;head.vx=Math.cos(angle)*power*5;head.vy=Math.sin(angle)*power*5;head.flying=true;shot++;phase='flight';flight=0;drag=null;s.react?.(actor,'silly');sound('shot');}
 async function next(){if(phase!=='flight'||!s.alive)return;phase='handoff';if(shot<3&&bodies.some(b=>b.kind==='target'&&!b.dead)){resetHead();return;}
  level++;if(level===3){if(actor===0){actor=1;level=0;}else return s.finish(scores,'Angry Heads · three identical destructible forts each.');}resetLevel();phase='handoff';if(await s.pass(actor,`Fort ${level+1}/3. Three heads to clear it. Glass breaks easily; stone needs momentum.`))phase='aim';}
 // The 700x355 range keeps its proportions, scales to the canvas and sits on the bottom edge; portrait phones get extra sky instead of buttons.
 // Only x 70..680 holds play (sling to last tower), so narrow screens zoom in on that slice.
 const VIEW_X=70,VIEW_W=610,layout=()=>{K=Math.min(s.W/VIEW_W,s.H/H);ox=(s.W/K-VIEW_W)/2-VIEW_X;oy=s.H/K-H;};
 const pt=ev=>{layout();const p=s.pointer(ev);return {x:p.x/K-ox,y:p.y/K-oy};};
 const setPull=()=>{const dx=from.x-drag.point.x,dy=from.y-drag.point.y;angle=clamp(Math.atan2(dy,dx),-1.3,.3);power=clamp(Math.hypot(dx,dy)*(from===origin?1:1.1),30,135);};
 // Drag back from the head, or from anywhere (the pull is then measured from where you first touched).
 s.on(c,'pointerdown',ev=>{if(phase!=='aim'||s.paused||drag)return;ev.preventDefault();const p=pt(ev);from=Math.hypot(p.x-head.x,p.y-head.y)<=75?origin:p;drag={id:ev.pointerId,point:p};s.capture(ev);});
 s.on(c,'pointermove',ev=>{if(!drag||ev.pointerId!==drag.id)return;drag.point=pt(ev);setPull();});
 s.on(c,'pointerup',ev=>{if(drag?.id===ev.pointerId){drag.point=pt(ev);setPull();if(Math.hypot(from.x-drag.point.x,from.y-drag.point.y)>14)fire();drag=null;}s.release(ev);});
 const clear=()=>drag=null;s.on(c,'pointercancel',clear);s.resetOnPause?.(clear);s.on(window,'blur',clear);
 s.on(document,'keydown',ev=>{if(phase!=='aim'||s.paused)return;const k=ev.key;if(k===' '||k==='Enter'){ev.preventDefault();fire();}else if(k==='ArrowUp'||k==='w')angle=clamp(angle-.07,-1.3,.3);else if(k==='ArrowDown'||k==='s')angle=clamp(angle+.07,-1.3,.3);else if(k==='ArrowLeft'||k==='a')power=clamp(power-6,30,135);else if(k==='ArrowRight'||k==='d')power=clamp(power+6,30,135);});
 s.hint('Drag back from the sling (or anywhere) and release: the dotted arc previews your shot, and drag back to the start to cancel. Keyboard: arrows aim, Space launches. Real falling towers: destroy targets +100, blocks +15. Your opponent’s heads are every target. Same forts and three shots each.');
 s.frame(dt=>{layout();x.setTransform(K,0,0,K,ox*K,oy*K);if(phase==='aim'){aimClock-=dt;if(aimClock<=0)fire();}if(phase==='flight'){flight+=dt;for(const b of stepHeadFort(bodies,head,dt)){scores[actor]+=b.kind==='target'?100:15;particles.push({x:b.x,y:b.y,t:.7,color:b.kind==='target'?'#f99fae':'#e4c997'});s.react?.(actor,'happy');sound('win');}s.setScores(scores);if((!head.flying&&flight>1)||flight>6||bodies.every(b=>b.kind!=='target'||b.dead))void next();}if(!s.alive)return;
  x.fillStyle='#85bac0';x.fillRect(-ox,-oy,s.W/K,s.H/K);circle(x,610,47-oy*.5,30,'#f5d888');x.fillStyle='#9dba8a';for(let i=-3;i<9;i++){x.beginPath();x.ellipse(i*180,290,150,80,0,0,Math.PI*2);x.fill();}x.fillStyle='#6d8050';x.fillRect(-ox,310,s.W/K,45+oy);x.fillStyle='#60442c';x.fillRect(96,228,12,82);x.fillRect(119,225,10,85);
  for(const b of bodies){if(b.dead)continue;if(b.kind==='target'){s.sprite(x,1-actor,b.x,b.y,TARGET_DRAW,{exact:true,mood:phase==='flight'?'sad':'thinking'});}else{x.fillStyle={wood:'#aa744c',glass:'#99e3eb',stone:'#747f89'}[b.material];x.fillRect(b.x-b.w/2,b.y-b.h/2,b.w,b.h);x.strokeStyle='#304d4966';x.lineWidth=2;x.strokeRect(b.x-b.w/2+3,b.y-b.h/2+3,b.w-6,b.h-6);}}
  if(phase==='aim'){x.strokeStyle=COLORS[actor];x.setLineDash([3,7]);x.beginPath();for(let t=0;t<(drag?1.1:.55);t+=.055){const px=origin.x+Math.cos(angle)*power*5*t,py=origin.y+Math.sin(angle)*power*5*t+230*t*t;t?x.lineTo(px,py):x.moveTo(px,py);}x.lineWidth=drag?3:1.5;x.stroke();x.setLineDash([]);x.lineWidth=1;}s.sprite(x,actor,head.x,head.y,HEAD_DRAW,{exact:true,mood:phase==='flight'?'angry':'thinking'});
  for(const p of particles){p.t-=dt;for(let i=0;i<5;i++)circle(x,p.x+Math.cos(i*1.3)*(1-p.t)*32,p.y+Math.sin(i*1.3)*(1-p.t)*25,3,p.color);}particles=particles.filter(p=>p.t>0);
  s.status(`${s.players[actor].name} · fort ${level+1}/3 · head ${Math.min(shot+1,3)}/3 · ${phase==='aim'?Math.ceil(aimClock)+'s to launch':'Tower chaos!'} · ${bodies.filter(b=>b.kind==='target'&&!b.dead).length} targets`);s.debug={actor,level,shot,bodies,head,phase,fire};
 });resetLevel();await s.pass(0,'Angry Birds-inspired head launches. Pull backward, release, and use collapsing towers to knock out your opponent’s heads.');}

Object.assign(exports,{headFort,stepHeadFort,headlaunch});