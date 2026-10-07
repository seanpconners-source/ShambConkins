// The Office · Warehouse Shift: a Rush Hour style car park in the Dunder Mifflin warehouse. Your head drives Darryl's
// forklift; slide the clutter (paper pallets, Schrute beets, Sabre printers, Kevin's chili, Michael's Sebring, Dwight's
// Trans Am, the delivery truck...) along its aisle and get the forklift out of the loading dock. One 75-second shift per
// player, orders get harder, the last 15 seconds are Dwight's fire drill (double points). Same orders for both players.
// Rules/puzzle generation live in warehouseRules.js; the puzzle pool is precomputed in src/data/warehouseOrders.js.
const {clamp, seededRandom}=require("src/utils.js");
const {sound, tone, vibrate}=require("src/audio.js");
const {store}=require("src/state.js");
const {WAREHOUSE_N:N,EXIT_ROW,GOAL,slideRange,occupancy,solvePath,decodeOrder}=require("src/engines/warehouseRules.js");
const {WAREHOUSE_ORDERS}=require("src/data/warehouseOrders.js");

const SHIFT=75,DRILL=15,ORDER_PARS=[3,5,6,8,10,12,14,16,18,20,22,24];
const CLIENTS=['Blue Cross of Pennsylvania','Lackawanna County','Alfredo’s Pizza Café','Pizza by Alfredo','Serenity by Jan','Schrute Farms B&B','Vance Refrigeration','Poor Richard’s Pub','the Stamford branch','the Utica branch','the Nashua branch','Sabre · Tallahassee','Michael Scott Paper Co.','Chili’s · Scranton','Scranton Business Park','Cugino’s'];
const SOLVED=['Limitless paper in a paperless world!','Bears. Beets. Battlestar Galactica.','Shipped. Darryl nods once.','I am Beyoncé, always.','World’s Best Forklift Driver','Dunder Mifflin, this is Pam.','Nard Dog approves!','Somehow I manage.'];
const PERFECT=['PERFECT ROUTE · Dundie!','FLAWLESS · Dundie awarded','DWIGHT IS JEALOUS'];
const LOOK={
 boxes:{fill:'#c99b62',dark:'#7c5a31',label:'DUNDER MIFFLIN',sub:'20 LB BOND'},boxes3:{fill:'#c99b62',dark:'#7c5a31',label:'DUNDER MIFFLIN',sub:'COPY PAPER · 10 REAMS'},
 beets:{fill:'#8a5a34',dark:'#4c2f17',label:'SCHRUTE FARMS',sub:'BEETS'},sabre:{fill:'#e3e7ec',dark:'#8d97a3',label:'SABRE',sub:'PYRAMID',ink:'#c81e2b'},
 chili:{fill:'#8a6a45',dark:'#4d3a22',label:'KEVIN’S CHILI',sub:'DO NOT SPILL'},fridge:{fill:'#eef3f7',dark:'#9fb0bf',label:'VANCE',sub:'REFRIGERATION',ink:'#1d5fb4'},
 hay:{fill:'#e0be55',dark:'#9b7d22',label:'MOSE’S HAY',sub:''},sebring:{fill:'#c3122f',dark:'#6d0819',label:'SEBRING',sub:''},transam:{fill:'#202024',dark:'#000',label:'TRANS AM',sub:'',ink:'#e8c35a'},
 truck:{fill:'#f4f5f7',dark:'#8e98a5',label:'DUNDER MIFFLIN',sub:'PAPER COMPANY, INC.',ink:'#174a8b'},shelf:{fill:'#e8742a',dark:'#8d3d0c',label:'AISLE 6',sub:''},
 forklift:{fill:'#ffc21a',dark:'#8a6400',label:'',sub:''}};

// Picks this match's orders from the pool: one per difficulty step, seeded so both players get identical orders.
function warehouseOrders(seed){const random=seededRandom(seed+'-warehouse'),pool=WAREHOUSE_ORDERS.map(decodeOrder);
 return ORDER_PARS.map((par,i)=>{let best=Infinity,list=[];for(const o of pool){const d=Math.abs(o.par-par);if(d<best){best=d;list=[o];}else if(d===best)list.push(o);}
  const o=list[Math.floor(random()*list.length)];return {...o,start:o.start.slice(),client:CLIENTS[Math.floor(random()*CLIENTS.length)],n:i+1};});}

function roundRect(x,X,Y,w,h,r){r=Math.min(r,w/2,h/2);x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath();}
function fitText(x,text,max,size,weight=900){x.font=`${weight} ${size}px system-ui`;const w=x.measureText(text).width;if(w>max){size*=max/w;x.font=`${weight} ${size}px system-ui`;}return size;}
function label(x,text,cx,cy,max,size,color,stroke){if(!text)return;fitText(x,text,max,size);x.textAlign='center';x.textBaseline='middle';if(stroke){x.lineWidth=3;x.strokeStyle=stroke;x.strokeText(text,cx,cy);}x.fillStyle=color;x.fillText(text,cx,cy);}

// Draws a piece in local coordinates: long axis horizontal, centred on 0,0, size w x h.
function drawPieceBody(x,kind,w,h,t){const L=LOOK[kind]||LOOK.boxes,r=h*.14;
 x.fillStyle='#0006';roundRect(x,-w/2+3,-h/2+5,w,h,r);x.fill();
 if(kind==='sebring'||kind==='transam'){x.fillStyle=L.fill;roundRect(x,-w/2,-h/2+h*.06,w,h*.88,h*.32);x.fill();x.strokeStyle=L.dark;x.lineWidth=2;x.stroke();
  x.fillStyle='#111';for(const sx of [-.3,.3])for(const sy of [-1,1])x.fillRect(sx*w-h*.13,sy*h*.45-h*.07,h*.26,h*.14);
  x.fillStyle=L.fill;roundRect(x,-w/2,-h/2+h*.06,w,h*.88,h*.32);x.fill();
  x.fillStyle='#9fd3ff';roundRect(x,w*.08,-h*.3,w*.12,h*.6,h*.08);x.fill();
  if(kind==='sebring'){x.fillStyle='#3a1a12';roundRect(x,-w*.12,-h*.3,w*.16,h*.24,4);x.fill();roundRect(x,-w*.12,h*.06,w*.16,h*.24,4);x.fill();}
  else{x.fillStyle='#0b0b0d';roundRect(x,-w*.2,-h*.32,w*.26,h*.64,6);x.fill();x.strokeStyle=L.ink;x.lineWidth=Math.max(2,h*.05);x.beginPath();x.moveTo(w*.24,-h*.22);x.lineTo(w*.34,0);x.lineTo(w*.24,h*.22);x.stroke();}
  x.fillStyle='#fff6b0';x.fillRect(w/2-h*.08,-h*.36,h*.06,h*.16);x.fillRect(w/2-h*.08,h*.2,h*.06,h*.16);
  label(x,L.label,-w*.33,0,w*.3,h*.2,L.ink||'#fff','#0008');return;}
 if(kind==='truck'){x.fillStyle='#2b3440';roundRect(x,w*.28,-h*.4,w*.21,h*.8,h*.18);x.fill();x.fillStyle='#9fd3ff';roundRect(x,w*.4,-h*.3,w*.07,h*.6,4);x.fill();
  x.fillStyle=L.fill;roundRect(x,-w/2,-h/2+h*.04,w*.76,h*.92,r);x.fill();x.strokeStyle=L.dark;x.lineWidth=2;x.stroke();
  x.fillStyle=L.ink;x.fillRect(-w/2+h*.1,-h*.06,w*.76-h*.2,h*.04);label(x,L.label,-w*.12,-h*.2,w*.66,h*.26,L.ink);label(x,L.sub,-w*.12,h*.18,w*.66,h*.14,'#46566b');return;}
 if(kind==='forklift'){const bob=Math.sin(t*9)*.6;x.fillStyle='#c8ccd2';x.fillRect(w*.18,-h*.32,w*.32,h*.1);x.fillRect(w*.18,h*.22,w*.32,h*.1);
  x.fillStyle='#55595f';x.fillRect(w*.1,-h*.44,w*.09,h*.88);
  x.fillStyle='#111';for(const sx of [-.32,.02])for(const sy of [-1,1])roundRect(x,sx*w,sy*h*.42-h*.1+bob*0,w*.14,h*.2,4),x.fill();
  x.fillStyle=L.fill;roundRect(x,-w/2+2,-h*.38,w*.62,h*.76,h*.18);x.fill();x.strokeStyle=L.dark;x.lineWidth=2.5;x.stroke();
  x.fillStyle='#2b2b2b';x.fillRect(-w/2+2,-h*.1,w*.1,h*.2);x.strokeStyle='#222';x.lineWidth=Math.max(2,h*.05);x.strokeRect(-w*.36,-h*.33,w*.42,h*.66);
  x.fillStyle='#000';x.font=`900 ${h*.13}px system-ui`;x.textAlign='center';x.textBaseline='middle';x.fillText('◢◤◢◤',-w*.16,h*.3);return;}
 // Pallet goods: wooden pallet, then the load.
 x.fillStyle='#a37b4b';roundRect(x,-w/2,-h/2,w,h,r);x.fill();x.fillStyle='#7a5730';for(let i=1;i<4;i++)x.fillRect(-w/2,-h/2+h*i/4-1,w,2);
 const ins=h*.08;x.fillStyle=L.fill;roundRect(x,-w/2+ins,-h/2+ins,w-ins*2,h-ins*2,r*.8);x.fill();x.strokeStyle=L.dark;x.lineWidth=2;x.stroke();
 if(kind==='boxes'||kind==='boxes3'||kind==='sabre'||kind==='fridge'){const n=Math.round(w/h)*2;x.strokeStyle=L.dark+'aa';x.lineWidth=1.5;for(let i=1;i<n;i++){const X=-w/2+ins+(w-ins*2)*i/n;x.beginPath();x.moveTo(X,-h/2+ins);x.lineTo(X,h/2-ins);x.stroke();}
  x.fillStyle='#d9c7a0';if(kind==='boxes'||kind==='boxes3')x.fillRect(-w/2+ins,-h*.03,w-ins*2,h*.06);}
 if(kind==='beets'){x.strokeStyle=L.dark;x.lineWidth=2;for(let i=1;i<3;i++){x.beginPath();x.moveTo(-w/2+ins,-h/2+ins+(h-ins*2)*i/3);x.lineTo(w/2-ins,-h/2+ins+(h-ins*2)*i/3);x.stroke();}
  for(let i=0;i<Math.round(w/h)*3;i++){const bx=-w/2+h*.25+i*h*.34,by=(i%2?-.18:.2)*h;if(bx>w/2-h*.2)break;x.fillStyle='#7b1238';x.beginPath();x.arc(bx,by,h*.11,0,Math.PI*2);x.fill();x.fillStyle='#3d8a2a';x.fillRect(bx-1,by-h*.2,3,h*.1);}}
 if(kind==='hay'){x.strokeStyle='#b8952e';x.lineWidth=1.5;for(let i=0;i<14;i++){const X=-w/2+ins+((i*37)%100)/100*(w-ins*2);x.beginPath();x.moveTo(X,-h/2+ins);x.lineTo(X+h*.12,h/2-ins);x.stroke();}x.strokeStyle='#6b3a1a';x.lineWidth=3;for(const f of [-.25,.25]){x.beginPath();x.moveTo(f*w,-h/2+ins);x.lineTo(f*w,h/2-ins);x.stroke();}}
 if(kind==='chili'){const R=h*.32;x.fillStyle='#9aa3ad';x.beginPath();x.arc(-w*.18,0,R,0,Math.PI*2);x.fill();x.fillStyle='#8c1d0c';x.beginPath();x.arc(-w*.18,0,R*.82,0,Math.PI*2);x.fill();x.fillStyle='#b8341a';for(let i=0;i<5;i++){x.beginPath();x.arc(-w*.18+Math.cos(i*1.3)*R*.45,Math.sin(i*1.3)*R*.45,R*.12,0,Math.PI*2);x.fill();}
  x.fillStyle='#8c1d0c';x.beginPath();x.ellipse(-w*.18+R*1.15,R*.55,R*.35,R*.18,.3,0,Math.PI*2);x.fill();label(x,L.label,w*.2,-h*.08,w*.45,h*.2,'#fff','#0009');label(x,L.sub,w*.2,h*.17,w*.45,h*.13,'#ffd7b0');return;}
 if(kind==='shelf'){x.fillStyle='#3b3f46';x.fillRect(-w/2+ins,-h/2+ins,w-ins*2,h-ins*2);x.fillStyle=L.fill;x.fillRect(-w/2+ins,-h/2+ins,w-ins*2,h*.14);x.fillRect(-w/2+ins,h/2-ins-h*.14,w-ins*2,h*.14);
  for(let i=0;i<6;i++){const bw=(w-ins*4)/6;x.fillStyle=i%3===1?'#e3e7ec':'#c99b62';x.fillRect(-w/2+ins*2+i*bw+2,-h*.2,bw-4,h*.4);}label(x,L.label,0,-h*.36,w*.4,h*.13,'#1b1b1b');return;}
 if(kind==='fridge')label(x,'❄',w/2-h*.3,-h*.22,h*.4,h*.24,L.ink);
 if(kind==='sabre')label(x,'🔥',w/2-h*.28,-h*.22,h*.4,h*.24,'#fff');
 label(x,L.label,0,L.sub?-h*.1:0,w-h*.5,h*.24,L.ink||'#fff',L.ink?null:'#0009');if(L.sub)label(x,L.sub,0,h*.17,w-h*.5,h*.14,L.ink||'#fff3d6',L.ink?null:'#0008');}

async function warehouseShift(s){
 const[c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');
 const orders=warehouseOrders(s.seed),scores=[0,0],stats=[null,null];
 let actor=0,phase='wait',clock=0,idx=0,order=null,pos=[],vis=[],moves=0,drag=null,exitT=0,fx=[],banner=null,shake=0,drillOn=false,alarm=0,said=false,pressed=null;
 const beep=(f,d=.07,v=.04,type='triangle')=>{if(store.profile?.settings.sound)tone(f,d,v,type);};
 function layout(){const W=s.W,H=s.H,top=clamp(H*.13,56,86),bottom=clamp(H*.11,52,74),pad=8,availW=W-pad*2,availH=H-top-bottom-pad*2,
   cell=Math.max(18,Math.min(availW/(N+1.1),availH/(N+.5))),bw=cell*N,ox=(W-bw-cell*.7)/2+cell*.15,oy=top+pad+(availH-bw)/2;return {W,H,top,bottom,cell,ox,oy,bw};}
 function loadOrder(i){idx=i;order=orders[Math.min(i,orders.length-1)];pos=order.start.slice();vis=pos.slice();moves=0;said=false;drag=null;
  banner={text:`ORDER #${i+1}`,sub:`→ ${order.client} · par ${order.par}`,age:0,color:'#ffd166'};sound('card');}
 function startTurn(){clock=0;drillOn=false;stats[actor]={shipped:0,perfect:0,skipped:0};loadOrder(0);phase='play';}
 async function endTurn(){phase='handoff';drag=null;sound('whistle');
  if(actor===1){const a=stats[0],b=stats[1];return s.finish(scores,`Warehouse Shift · ${s.players[0].name} shipped ${a.shipped} (${a.perfect} perfect), ${s.players[1].name} shipped ${b.shipped} (${b.perfect} perfect). Same orders for both.`);}
  actor=1;if(await s.pass(1,`${s.players[0].name} shipped ${stats[0].shipped} orders for ${scores[0]} points. Your shift: same orders in the same order. Drag the clutter along its aisle and drive your forklift out the loading dock. Last ${DRILL} seconds: fire drill, double points.`,'Clock in',{countdown:3}))startTurn();}
 function shipped(){const L=layout(),m=drillOn?2:1,perfect=moves<=order.par,bonus=perfect?60:Math.max(0,50-8*(moves-order.par)),gain=(100+bonus)*m;
  scores[actor]+=gain;stats[actor].shipped++;if(perfect)stats[actor].perfect++;s.setScores(scores);s.react?.(actor,'happy');sound(perfect?'rare':'win');vibrate(30);
  const ex=L.ox+L.bw,ey=L.oy+(EXIT_ROW+.5)*L.cell;fx.push({x:ex-L.cell,y:ey-L.cell*.9,text:`+${gain}`,color:'#7dffb0',age:0,big:true});
  for(let j=0;j<26;j++)fx.push({x:ex,y:ey,vx:-60-Math.random()*260,vy:-220+Math.random()*300,rot:Math.random()*6,vr:(Math.random()-.5)*12,age:0,paper:true});
  banner={text:perfect?PERFECT[Math.floor(Math.random()*PERFECT.length)]:'SHIPPED!',sub:SOLVED[Math.floor(Math.random()*SOLVED.length)],age:0,color:perfect?'#ffd166':'#7dffb0'};
  phase='exit';exitT=0;}
 function skip(){if(phase!=='play')return;scores[actor]=Math.max(0,scores[actor]-30);stats[actor].skipped++;s.setScores(scores);s.react?.(actor,'sad');sound('lose');shake=.3;
  loadOrder(idx+1);banner={text:'WHY ARE YOU THE WAY THAT YOU ARE?',sub:`Blamed Toby · −30 · Order #${idx+1}: par ${order.par}`,age:0,color:'#ff8a8a'};}
 function restart(){if(phase!=='play'||!order)return;pos=order.start.slice();vis=pos.slice();drag=null;sound('handoff');banner={text:'FROM THE TOP',sub:'Moves keep counting. Somehow I manage.',age:0,color:'#cfe3ff'};}
 const buttons=L=>{const bh=L.bottom*.66,y=L.H-L.bottom+(L.bottom-bh)/2,w=Math.min(L.W*.44,220);return [{id:'restart',x:10,y,w,h:bh,text:'↺ Start over'},{id:'skip',x:L.W-10-w,y,w,h:bh,text:'Blame Toby · skip −30'}];};
 function pieceAt(p,L){const col=Math.floor((p.x-L.ox)/L.cell),row=Math.floor((p.y-L.oy)/L.cell);if(col<0||row<0||col>=N||row>=N)return -1;const g=occupancy(order.pieces,pos);return g[row*N+col];}
 s.on(c,'pointerdown',ev=>{ev.preventDefault();if(s.paused||phase!=='play')return;const p=s.pointer(ev),L=layout();
  for(const b of buttons(L))if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){pressed={id:b.id,age:0};return b.id==='skip'?skip():restart();}
  const i=pieceAt(p,L);if(i<0)return;const [lo,hi]=slideRange(order.pieces,pos,i);drag={i,id:ev.pointerId,start:p,from:pos[i],lo,hi};try{c.setPointerCapture(ev.pointerId);}catch{}beep(330,.04,.03);});
 s.on(c,'pointermove',ev=>{if(!drag||ev.pointerId!==drag.id||phase!=='play')return;const p=s.pointer(ev),L=layout(),P=order.pieces[drag.i],d=(P.h?p.x-drag.start.x:p.y-drag.start.y)/L.cell;
  const v=clamp(drag.from+d,drag.lo,drag.hi);if((v===drag.lo||v===drag.hi)&&Math.abs(vis[drag.i]-v)>.08)beep(110,.05,.05,'square');vis[drag.i]=v;
  if(drag.i===0&&drag.hi>=GOAL&&v>=GOAL-.15)drop();});
 function drop(){if(!drag)return;const i=drag.i,v=Math.round(vis[i]);vis[i]=vis[i];pos[i]=v;const dist=Math.abs(v-drag.from);drag=null;
  if(dist){moves++;sound('tap');const P=order.pieces[i];if(!said&&(P.len===3||dist>=3)&&Math.random()<.4){said=true;banner={text:'THAT’S WHAT SHE SAID!',sub:'',age:0,color:'#ff9fd8'};}}
  if(pos[0]===GOAL)shipped();}
 s.on(c,'pointerup',ev=>{if(drag&&ev.pointerId===drag.id)drop();});s.on(c,'pointercancel',ev=>{if(drag&&ev.pointerId===drag.id)drop();});
 s.hint(`Rush Hour in the Dunder Mifflin warehouse. Drag any pallet, car or truck along its own aisle (long pieces only slide lengthwise). Clear a path and drive your forklift (your head) out the loading dock on the right. Each order: 100 + up to 60 for matching par moves. Start over resets the order; Blame Toby skips it for −30. The last ${DRILL} seconds are Dwight's fire drill: double points. Same ${SHIFT}-second shift and same orders for both players.`);
 s.frame((dt,t)=>{const L=layout(),{W,H,cell,ox,oy,bw}=L;
  if(phase==='play'||phase==='exit'){clock+=dt;const left=SHIFT-clock;
   if(!drillOn&&left<=DRILL){drillOn=true;banner={text:'FIRE DRILL!',sub:'Dwight lit a trash can · points ×2',age:0,color:'#ff6b4a'};sound('rare');vibrate(60);}
   if(drillOn){alarm-=dt;if(alarm<=0){alarm=.5;beep(alarm>0&&Math.floor(clock*2)%2?880:660,.14,.03,'square');}}
   if(left<=0&&phase==='play'){void endTurn();}}
  if(phase==='exit'){exitT+=dt;vis[0]=GOAL+exitT*exitT*14;if(exitT>.7){if(clock>=SHIFT)void endTurn();else{loadOrder(idx+1);phase='play';}}}
  for(let i=0;i<vis.length;i++)if(!(drag&&drag.i===i)&&!(phase==='exit'&&i===0))vis[i]+=(pos[i]-vis[i])*Math.min(1,dt*18);
  for(const f of fx){f.age+=dt;if(f.paper){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=380*dt;f.vx*=.99;f.rot+=f.vr*dt;}}fx=fx.filter(f=>f.age<(f.paper?1.4:.9));if(banner)banner.age+=dt;if(pressed)pressed.age+=dt;shake=Math.max(0,shake-dt);
  if(!s.alive)return;x.save();if(shake>0)x.translate((Math.random()-.5)*shake*24,(Math.random()-.5)*shake*24);
  // Warehouse: concrete, racks with paper boxes at the sides, hanging lamps.
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2a2f37');g.addColorStop(1,'#16191e');x.fillStyle=g;x.fillRect(-20,-20,W+40,H+40);
  for(let r=0;r*cell*1.2<H;r++)for(const side of [0,1]){const rx=side?ox+bw+cell*.75:0,rw=side?W-rx:ox-cell*.25;if(rw<10)continue;x.fillStyle='#e8742a';x.fillRect(rx,L.top+r*cell*1.2,rw,4);
   for(let k=0;k*cell*.5<rw;k++){x.fillStyle=(k+r)%3?'#a37f52':'#c9cdd3';x.fillRect(rx+k*cell*.5+2,L.top+r*cell*1.2-cell*.36,cell*.44,cell*.36);}}
  // Floor with hazard border and loading dock.
  x.fillStyle='#000';x.fillRect(ox-cell*.12,oy-cell*.12,bw+cell*.24,bw+cell*.24);
  x.save();x.beginPath();x.rect(ox-cell*.12,oy-cell*.12,bw+cell*.24,bw+cell*.24);x.clip();x.fillStyle='#ffc21a';for(let k=-bw;k<bw*2;k+=cell*.4){x.beginPath();x.moveTo(ox+k,oy-cell*.2);x.lineTo(ox+k+cell*.2,oy-cell*.2);x.lineTo(ox+k+cell*.2+bw+cell,oy+bw+cell);x.lineTo(ox+k+bw+cell,oy+bw+cell);x.fill();}x.restore();
  x.fillStyle='#7d838b';x.fillRect(ox,oy,bw,bw);for(let r=0;r<N;r++)for(let q=0;q<N;q++){x.fillStyle=(r+q)%2?'#80868e':'#767c84';x.fillRect(ox+q*cell+1,oy+r*cell+1,cell-2,cell-2);}
  x.fillStyle='#ffd34a55';for(let q=0;q<N;q++){x.beginPath();const ax=ox+(q+.5)*cell,ay=oy+(EXIT_ROW+.5)*cell;x.moveTo(ax-cell*.12,ay-cell*.14);x.lineTo(ax+cell*.1,ay);x.lineTo(ax-cell*.12,ay+cell*.14);x.fill();}
  x.fillStyle='#0003';x.font=`900 ${cell*.32}px system-ui`;x.textAlign='center';x.textBaseline='middle';x.fillText('DUNDER',ox+bw/2,oy+cell*4.3);x.fillText('MIFFLIN',ox+bw/2,oy+cell*4.75);
  const dy=oy+EXIT_ROW*cell,glow=x.createLinearGradient(ox+bw,0,ox+bw+cell*.8,0);glow.addColorStop(0,'#fff6c9');glow.addColorStop(1,'#ffd36a00');x.fillStyle=glow;x.fillRect(ox+bw,dy,cell*.9,cell);
  x.fillStyle='#ffc21a';x.fillRect(ox+bw-2,dy-4,cell*.7,4);x.fillRect(ox+bw-2,dy+cell,cell*.7,4);
  label(x,'DOCK',ox+bw+cell*.32,dy-cell*.22,cell*.62,cell*.2,'#ffc21a');
  // Days-since-accident sign above the floor when there is room.
  if(oy-L.top>cell*.55){const sw=Math.min(bw*.62,260),sh=Math.min(oy-L.top-10,cell*.55),sx=ox+(bw-sw)/2,sy=oy-cell*.14-sh-4;x.fillStyle='#f4f4ef';roundRect(x,sx,sy,sw,sh,6);x.fill();x.strokeStyle='#1d5d2a';x.lineWidth=3;x.stroke();
   label(x,'DAYS SINCE LAST ACCIDENT',sx+sw*.42,sy+sh*.5,sw*.72,sh*.36,'#1d5d2a');x.fillStyle='#111';roundRect(x,sx+sw*.82,sy+sh*.14,sw*.14,sh*.72,4);x.fill();label(x,'0',sx+sw*.89,sy+sh*.52,sw*.12,sh*.6,'#ff5a4a');}
  // Pieces (forklift last so it sits on top while leaving).
  if(order){const draw=i=>{const P=order.pieces[i],v=vis[i],len=P.len*cell,w=len-cell*.1,h=cell*.86,cx=P.h?ox+v*cell+len/2:ox+(P.line+.5)*cell,cy=P.h?oy+(P.line+.5)*cell:oy+v*cell+len/2;
    x.save();if(i===0&&phase==='exit')x.globalAlpha=clamp(1-(exitT-.4)/.3,0,1);x.translate(cx,cy);if(!P.h)x.rotate(Math.PI/2);if(drag&&drag.i===i)x.scale(1.04,1.04);drawPieceBody(x,P.kind,w,h,t);x.restore();
    if(i===0){x.save();if(phase==='exit')x.globalAlpha=clamp(1-(exitT-.4)/.3,0,1);s.sprite(x,actor,cx-w*.08,cy,clamp(h*.95,22,80),{exact:true,mood:phase==='exit'?'win':drag?.i===0?'thinking':undefined});x.restore();}
    if(drag&&drag.i===i){x.strokeStyle='#fff';x.lineWidth=3;x.setLineDash([6,5]);const r0=drag.lo*cell,r1=(drag.hi+P.len)*cell;if(P.h)x.strokeRect(ox+r0+2,oy+P.line*cell+2,r1-r0-4,cell-4);else x.strokeRect(ox+P.line*cell+2,oy+r0+2,cell-4,r1-r0-4);x.setLineDash([]);}};
   for(let i=1;i<order.pieces.length;i++)draw(i);draw(0);}
  // FX: flying paper and score pops.
  for(const f of fx){const k=f.age/(f.paper?1.4:.9);x.globalAlpha=Math.max(0,1-k);if(f.paper){x.save();x.translate(f.x,f.y);x.rotate(f.rot);x.fillStyle='#fff';x.fillRect(-cell*.12,-cell*.16,cell*.24,cell*.32);x.fillStyle='#9bb';x.fillRect(-cell*.08,-cell*.08,cell*.16,2);x.fillRect(-cell*.08,0,cell*.16,2);x.restore();}
   else label(x,f.text,f.x,f.y-k*40,cell*3,clamp(cell*(f.big?.6:.45),16,40),f.color,'#000b');x.globalAlpha=1;}
  if(drillOn&&phase!=='handoff'){const a=.25+.2*Math.sin(t*12);x.strokeStyle=`rgba(255,40,30,${a})`;x.lineWidth=Math.min(W,H)*.05;x.strokeRect(0,0,W,H);}
  x.restore();
  // HUD: head, order, moves vs par, clock and score.
  x.fillStyle='#14171d';x.fillRect(0,0,W,L.top);x.save();x.beginPath();x.rect(0,L.top-6,W,6);x.clip();x.fillStyle='#ffc21a';x.fillRect(0,L.top-6,W,6);x.fillStyle='#111';for(let k=-10;k<W;k+=20){x.beginPath();x.moveTo(k,L.top);x.lineTo(k+10,L.top-6);x.lineTo(k+20,L.top-6);x.lineTo(k+10,L.top);x.fill();}x.restore();
  const head=clamp(L.top*.7,36,64);s.sprite(x,actor,head*.62,L.top*.45,head,{exact:true,mood:shake>0?'sad':undefined});
  const left=Math.max(0,SHIFT-clock),tx=head*1.3;
  x.textAlign='left';x.textBaseline='middle';fitText(x,order?`ORDER #${idx+1} · ${order.client}`:'WAREHOUSE SHIFT',W*.5,clamp(L.top*.2,12,18),800);x.fillStyle='#aab3c8';x.fillText(order?`ORDER #${idx+1} · ${order.client}`:'WAREHOUSE SHIFT',tx,L.top*.26);
  if(order){x.font=`900 ${clamp(L.top*.3,16,26)}px system-ui`;x.fillStyle=moves>order.par?'#ffb46b':'#fff';x.fillText(`${moves} moves`,tx,L.top*.6);const mw=x.measureText(`${moves} moves`).width;x.font=`700 ${clamp(L.top*.2,12,17)}px system-ui`;x.fillStyle='#8f9bb2';x.fillText(` / par ${order.par}`,tx+mw,L.top*.62);}
  x.textAlign='right';x.font=`900 ${clamp(L.top*.34,18,30)}px system-ui`;x.fillStyle=drillOn?'#ff6b4a':'#ffd166';{const l=Math.ceil(left);x.fillText(`${Math.floor(l/60)}:${String(l%60).padStart(2,'0')}`,W-12,L.top*.34);}
  x.font=`800 ${clamp(L.top*.2,12,17)}px system-ui`;x.fillStyle='#cfd6e6';x.fillText(`${scores[actor]} pts${drillOn?' · ×2':''}`,W-12,L.top*.7);
  // Bottom buttons (inside the canvas, thumb height).
  x.fillStyle='#0b0e13';x.fillRect(0,H-L.bottom,W,L.bottom);
  for(const b of buttons(L)){const down=pressed&&pressed.id===b.id&&pressed.age<.15;x.fillStyle=b.id==='skip'?'#3a1f24':'#1f2c3d';roundRect(x,b.x,b.y+(down?2:0),b.w,b.h,10);x.fill();x.strokeStyle=b.id==='skip'?'#ff8a8a66':'#8fb8ff66';x.lineWidth=2;x.stroke();label(x,b.text,b.x+b.w/2,b.y+b.h/2+(down?2:0),b.w-14,clamp(b.h*.36,12,18),b.id==='skip'?'#ffc4c4':'#d6e6ff');}
  if(W-2*Math.min(W*.44,220)>70)label(x,stats[actor]?`📦 ${stats[actor].shipped} shipped`:'',W/2,H-L.bottom/2,Math.max(10,W-2*Math.min(W*.44,220)-30),clamp(L.bottom*.28,11,16),'#9aa6ba');
  // Banner.
  if(banner&&banner.age<1.6&&phase!=='handoff'){const a=banner.age<.12?banner.age/.12:Math.max(0,1-(banner.age-1.2)/.4),y=oy+bw*.5,hh=Math.min(120,cell*1.8);x.globalAlpha=a;x.fillStyle='#000c';x.fillRect(0,y-hh/2,W,hh);
   label(x,banner.text,W/2,y-(banner.sub?hh*.14:0),W*.92,clamp(W*.075,20,44),banner.color,'#000');if(banner.sub)label(x,banner.sub,W/2,y+hh*.24,W*.9,clamp(W*.04,12,22),'#fff');x.globalAlpha=1;}
  s.status(`${s.players[actor].name} · ${phase==='play'||phase==='exit'?Math.ceil(left)+'s':'get ready'} · order ${idx+1} · ${scores[actor]} pts`);
  s.debug={actor,phase,idx,clock,scores,stats,moves,par:order?.par,pieces:order?.pieces,pos:pos.slice(),orders,layout:L,setClock(v){clock=v;},
   solveStep(){if(phase!=='play')return false;const path=solvePath(order.pieces,pos);if(!path||!path.length)return false;const n=path[0];pos=n.slice();moves++;if(pos[0]===GOAL)shipped();return true;}};
 });
 if(await s.pass(0,`Warehouse Shift! Darryl's forklift is boxed in by paper pallets, Schrute beets, Sabre printers, Kevin's chili and Michael's Sebring. Drag the clutter along its aisle and drive your forklift (that's your head) out the loading dock. ${SHIFT}-second shift, harder orders as you go, fire drill at the end for double points. ${s.players[1].name} gets the same orders next.`,'Clock in',{countdown:3}))startTurn();
}

Object.assign(exports,{warehouseShift,warehouseOrders,LOOK});
