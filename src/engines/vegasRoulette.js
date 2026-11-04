// Roulette at a Vegas table (id `roulette`, engine `roulette`; ROADMAP G1). A drawn single-zero wheel with a ball that
// really spins against it, drops off the track, rattles over the pockets and settles; the croupier calls the number,
// the dolly marks it, losing chips are swept and winners paid where they lie. The betting layout is the real one:
// straight numbers (35 to 1), dozens and columns (2 to 1), red/black, odd/even, 1-18/19-36 (1 to 1). Each player bets
// in turn with their own chip colour (pick a chip, tap the layout; tap UNDO to take the last one back), regulars drop
// a few chips of their own, then the wheel spins. Table: $10 to $500 a spin. Ten spins, or color up.
// vs CPU: seat 4 likes the outside with a number or two. Online: each player's bets go over as one move
// {bets:[[key,amount]..]} (or {leave}); the number comes from the shared seed, so both phones see the same spin.
const {createVegas}=require('src/engines/vegasGame.js');
const {WHEEL,RED,betReturn,betLabel,betPays}=require('src/engines/casinoRules.js');

const MIN=10,MAX=500,SPINS=10,CHIP_VALUES=[5,25,100,500];
const OWN=['#ffd23f','#5aa9ff'];   // player chip colours (the regulars play plain casino chips)
const OUTSIDE=['low','even','red','black','odd','high'];

async function vegasRoulette(s){
 const G=createVegas(s,{maxRegulars:2}),{x,st,seats,V,money,FONT,BODY,snd}=G;
 Object.assign(st,{spin:0,bets:[],placing:null,history:[],number:null,wheel:{a:0,v:.25},ball:null,lastBets:[[],[]],chip:25,dolly:null});
 let L=null,layKey='',wheelImg=null,bg=null;
 // ---- layout: the wheel and croupier, then the betting layout; the controls strip/column as at the other tables
 function lay(){const k=s.W+'x'+s.H;if(k===layKey&&L)return L;layKey=k;const T=V.tableLayout(s.W,s.H,(G.fb.top||40)+4);
  L=G.L={...T,cells:[]};const {TW,B,wide}=L,cells=L.cells,add=(key,X,Y,w,h,label,fill)=>cells.push({key,X,Y,w,h,label,fill});
  const col=n=>n===0?'#0f7a3a':RED.has(n)?'#b3141f':'#141414';
  if(!wide){const R=Math.min(TW*.27,B*.16);L.wheel={x:TW*.6,y:16+R,R};L.crou={x:TW*.16,y:16+R*1.25};
   const gx=8,gy=L.wheel.y+R+14,gw=TW-16,gh=B-gy-8,rh=gh/14,cw0=gw*.14,cw1=gw*.14,nx=gx+cw0+cw1,nw=(gw-cw0-cw1)/3;
   add('n0',nx,gy,nw*3,rh,'0',col(0));
   for(let n=1;n<=36;n++){const r=Math.ceil(n/3)-1,c=(n-1)%3;add('n'+n,nx+c*nw,gy+rh*(1+r),nw,rh,String(n),col(n));}
   for(let c=1;c<=3;c++)add('c'+c,nx+(c-1)*nw,gy+rh*13,nw,rh,'2 to 1');
   for(let d=1;d<=3;d++)add('d'+d,gx+cw0,gy+rh*(1+(d-1)*4),cw1,rh*4,['1st 12','2nd 12','3rd 12'][d-1],null,true);
   OUTSIDE.forEach((key,i)=>add(key,gx,gy+rh*(1+i*2),cw0,rh*2,betLabel(key),key==='red'?'#b3141f':key==='black'?'#141414':null));
   L.vertical=true;}
  else{const R=Math.min(B*.3,TW*.22);L.wheel={x:R+14,y:Math.max(B*.56,R+L.hd*.9),R};L.crou={x:R+14,y:Math.max(L.hd*.62,L.wheel.y-R-L.hd*.55)};
   const gx=L.wheel.x+R+20,gw=TW-gx-10,gy=(G.fb.top||40)+6,gh=B-gy-12,cwid=gw/14,rh=gh/5.4;
   add('n0',gx,gy,cwid,rh*3,'0',col(0));
   for(let n=1;n<=36;n++){const c=Math.ceil(n/3)-1,r=2-(n-1)%3;add('n'+n,gx+cwid*(1+c),gy+r*rh,cwid,rh,String(n),col(n));}
   for(let c=1;c<=3;c++)add('c'+c,gx+cwid*13,gy+(3-c)*rh,cwid,rh,'2:1');
   for(let d=1;d<=3;d++)add('d'+d,gx+cwid*(1+(d-1)*4),gy+rh*3,cwid*4,rh*1.1,['1st 12','2nd 12','3rd 12'][d-1]);
   OUTSIDE.forEach((key,i)=>add(key,gx+cwid*(1+i*2),gy+rh*4.1,cwid*2,rh*1.1,betLabel(key),key==='red'?'#b3141f':key==='black'?'#141414':null));
   L.vertical=false;}
  L.chipD=Math.max(14,Math.min(...cells.filter(c=>c.key[0]==='n'&&c.key!=='n0').map(c=>Math.min(c.w,c.h)))*.78);
  wheelImg=makeWheel(L.wheel.R);bg=makeBG();return L;}
 // the felt and the printed layout, cached
 function makeBG(){const {W,H}=L,c=document.createElement('canvas'),k=Math.min(2,devicePixelRatio||1);c.width=Math.ceil(W*k);c.height=Math.ceil(H*k);const g=c.getContext('2d');g.scale(k,k);
  g.drawImage(V.roomLayer(W,H,G.theme,{y0:L.wheel.y+L.wheel.R}),0,0,W,H);
  const t=G.theme;let x0=Math.min(...L.cells.map(q=>q.X))-10,y0=Math.min(...L.cells.map(q=>q.Y))-10,x1=Math.max(...L.cells.map(q=>q.X+q.w))+10,y1=Math.max(...L.cells.map(q=>q.Y+q.h))+10;
  // table bed: felt from under the wheel to the end of the layout, a padded rail round it
  const fx0=4,fy0=L.vertical?6:6,fx1=L.TW-4,fy1=L.B-4;g.save();g.shadowColor='rgba(0,0,0,.7)';g.shadowBlur=18;V.rr(g,fx0,fy0,fx1-fx0,fy1-fy0,26);g.fillStyle=t.rail;g.fill();g.restore();
  const fg=g.createRadialGradient(L.TW/2,L.B*.45,20,L.TW/2,L.B*.45,Math.max(L.TW,L.B)*.7);fg.addColorStop(0,V.shade(t.felt,.12));fg.addColorStop(1,t.felt2);V.rr(g,fx0+9,fy0+9,fx1-fx0-18,fy1-fy0-18,18);g.fillStyle=fg;g.fill();
  g.strokeStyle=t.trim;g.lineWidth=1.5;V.rr(g,fx0+9,fy0+9,fx1-fx0-18,fy1-fy0-18,18);g.stroke();
  for(const q of L.cells){if(q.fill){g.fillStyle=q.fill;g.globalAlpha=.88;g.fillRect(q.X+1,q.Y+1,q.w-2,q.h-2);g.globalAlpha=1;}g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=1;g.strokeRect(q.X+.5,q.Y+.5,q.w-1,q.h-1);
   g.fillStyle='#fff';const fs=Math.max(8,Math.min(q.h*.5,q.w*(q.label.length>3?.2:.45),20));g.font=`${q.key[0]==='n'?900:800} ${fs}px ${q.key[0]==='n'?BODY:BODY}`;g.textAlign='center';g.textBaseline='middle';
   if(q.key==='red'||q.key==='black'){g.fillStyle=q.key==='red'?'#e0313a':'#000';g.strokeStyle='#fff';g.lineWidth=1.2;g.beginPath();const cx=q.X+q.w/2,cy=q.Y+q.h/2,r=Math.min(q.w,q.h)*.32;g.moveTo(cx,cy-r);g.lineTo(cx+r*.8,cy);g.lineTo(cx,cy+r);g.lineTo(cx-r*.8,cy);g.closePath();g.fill();g.stroke();continue;}
   if(L.vertical&&(q.key[0]==='d'||OUTSIDE.includes(q.key))){g.save();g.translate(q.X+q.w/2,q.Y+q.h/2);g.rotate(-Math.PI/2);g.fillText(q.label,0,1);g.restore();}else g.fillText(q.label,q.X+q.w/2,q.Y+q.h/2+1);}
  g.fillStyle=t.trim;g.font=`400 ${Math.max(12,L.wheel.R*.16)}px ${FONT}`;g.textAlign='center';g.globalAlpha=.85;g.fillText(t.name,L.vertical?L.TW*.22:L.wheel.x,L.vertical?L.wheel.y+L.wheel.R*.95:L.wheel.y+L.wheel.R+L.wheel.R*.12);g.globalAlpha=1;
  return c;}
 // the wheel: bowl, pocket ring with the numbers in wheel order, cone and turret
 function makeWheel(R){const c=document.createElement('canvas'),k=Math.min(2,devicePixelRatio||1),S=Math.ceil(R*2*k);c.width=c.height=S;const g=c.getContext('2d');g.scale(k,k);g.translate(R,R);
  let gr=g.createRadialGradient(0,0,R*.2,0,0,R);gr.addColorStop(0,'#5a3218');gr.addColorStop(.85,'#3a1e0c');gr.addColorStop(1,'#1c0e05');g.fillStyle=gr;g.beginPath();g.arc(0,0,R,0,7);g.fill();
  g.strokeStyle='#d9b45a';g.lineWidth=R*.025;g.beginPath();g.arc(0,0,R*.97,0,7);g.stroke();
  const r0=R*.62,r1=R*.82,n=WHEEL.length,da=Math.PI*2/n;
  for(let i=0;i<n;i++){const a=i*da-da/2-Math.PI/2,v=WHEEL[i];g.fillStyle=v===0?'#0f8a3e':RED.has(v)?'#c3121e':'#151515';g.beginPath();g.arc(0,0,r1,a,a+da);g.arc(0,0,r0,a+da,a,true);g.closePath();g.fill();
   g.strokeStyle='#d9b45a';g.lineWidth=1;g.stroke();g.save();g.rotate(a+da/2+Math.PI/2);g.fillStyle='#fff';g.font=`900 ${Math.max(6,R*.075)}px ${BODY}`;g.textAlign='center';g.textBaseline='middle';g.fillText(String(v),0,-(r1-R*.055));g.restore();}
  gr=g.createRadialGradient(-R*.1,-R*.1,R*.05,0,0,r0);gr.addColorStop(0,'#c99a4a');gr.addColorStop(1,'#6b4318');g.fillStyle=gr;g.beginPath();g.arc(0,0,r0*.92,0,7);g.fill();
  g.strokeStyle='#e8c46a';g.lineWidth=R*.03;for(let i=0;i<4;i++){g.save();g.rotate(i*Math.PI/2);g.beginPath();g.moveTo(0,0);g.lineTo(0,-r0*.7);g.stroke();g.beginPath();g.arc(0,-r0*.7,R*.035,0,7);g.fillStyle='#f3d98a';g.fill();g.restore();}
  g.fillStyle='#f3d98a';g.beginPath();g.arc(0,0,R*.08,0,7);g.fill();return c;}
 const pocketAngle=n=>WHEEL.indexOf(n)*Math.PI*2/WHEEL.length;   // from the wheel's top, clockwise
 // ---- bets
 const owner=p=>'p'+p,stakeOf=(who,list=st.bets)=>list.filter(b=>b.who===who).reduce((t,b)=>t+b.amt,0);
 function addBet(list,who,key,amt){const b=list.find(q=>q.who===who&&q.key===key);if(b)b.amt+=amt;else list.push({who,key,amt});}
 const cellOf=key=>L.cells.find(q=>q.key===key);
 // ---- a spin
 async function spin(){
  st.spin++;st.round=st.spin;st.phase='bet';st.bets=[];st.number=null;st.dolly=null;for(const se of seats){se.res=null;se.net=0;}G.sayD('bet',2);
  const keys=()=>{const r=G.rand();return r<.55?OUTSIDE[Math.floor(G.rand()*6)]:r<.75?'d'+(1+Math.floor(G.rand()*3)):'n'+Math.floor(G.rand()*37);};
  for(const se of seats)if(se.kind==='extra'){const n=1+Math.floor(G.rand()*3);for(let k=0;k<n;k++)addBet(st.bets,'x'+se.i,keys(),[5,5,10,25][Math.floor(G.rand()*4)]);snd.chips(2);}
  for(const p of [0,1]){if(st.out[p])continue;const se=G.seatOf(p);st.active=se.i;const others=[0,1].filter(q=>q!==p&&!st.out[q]);
   const m=await G.ask(p,'bet',{room:Math.min(MAX,st.bank[p]),placed:[],last:p===1||!others.length||st.out[1],cpu:()=>cpuBets()},{leave:1});
   if(m.leave||!Array.isArray(m.bets)){st.out[p]=true;G.banner(`${se.name} COLORS UP`,'#7dd3fc',1.6);snd.chips(6);G.moodS(se,'win');continue;}
   let total=0;const mine=[];for(const [key,amt] of m.bets){const a=Math.round(+amt);if(!cellKey(key)||!(a>0)||total+a>Math.min(MAX,st.bank[p]))continue;total+=a;addBet(mine,owner(p),key,a);}
   if(total<MIN){st.out[p]=true;G.banner(`${se.name} COLORS UP`,'#7dd3fc',1.6);continue;}
   mine.forEach(b=>st.bets.push(b));st.bank[p]-=total;st.lastBets[p]=mine.map(b=>[b.key,b.amt]);G.scores();snd.chips(3);}
  st.active=null;if(![0,1].some(p=>stakeOf(owner(p))))return;
  // no more bets: the croupier spins
  st.phase='spin';G.say('No more bets.',1.6);const n=Math.floor(G.rand()*37);st.number=n;await spinWheel(n);
  const name=n===0?'Zero, green.':`${n}, ${RED.has(n)?'red':'black'}.`;G.say(name,2.4);st.history.unshift(n);st.dolly=n;
  G.banner(n===0?'0 · GREEN':`${n} · ${RED.has(n)?'RED':'BLACK'}`,n===0?'#7dff9a':RED.has(n)?'#ff8a7a':'#e8e8e8',2);await G.W8(900);
  // sweep the losers, pay the winners
  st.phase='result';const cro={x:L.crou.x,y:L.crou.y};
  for(const b of st.bets){const q=cellOf(b.key),pos={x:q.X+q.w/2,y:q.Y+q.h/2},back=betReturn(b.key,b.amt,n);b.back=back;if(!back){G.fly(b.amt,pos,cro,.4);b.gone=true;}}
  await G.W8(600);
  for(const b of st.bets)if(b.back){const q=cellOf(b.key);G.fly(b.back-b.amt,cro,{x:q.X+q.w/2+L.chipD*.45,y:q.Y+q.h/2},.45);b.paid=true;}
  for(const p of [0,1]){const won=st.bets.filter(b=>b.who===owner(p)).reduce((t,b)=>t+(b.back||0),0),bet=stakeOf(owner(p));if(!bet)continue;const se=G.seatOf(p);st.bank[p]+=won;se.net=won-bet;G.moodS(se,won>bet?'win':won?'happy':'sad',2.6);if(won>bet)snd.win(won-bet>=200);else if(!won)snd.lose();}
  for(const se of seats)if(se.kind==='extra'){const own=st.bets.filter(b=>b.who==='x'+se.i);const won=own.reduce((t,b)=>t+(b.back||0),0),bet=own.reduce((t,b)=>t+b.amt,0);if(bet)G.seatSay(se,won>bet?'Yes!':'Ugh.',1.3);}
  G.scores();if([0,1].some(p=>G.seatOf(p).net>0)){G.sayD('win');G.dmood('sad');}else{G.sayD('house');G.dmood('win');}
  await G.W8(2200);st.bets=[];st.dolly=null;
  for(const p of [0,1])if(!st.out[p]&&st.bank[p]<MIN){st.out[p]=true;G.banner(`${G.seatOf(p).name} IS TAPPED OUT`,'#ff8a7a',2);await G.W8(1200);}}
 const cellKey=key=>typeof key==='string'&&L.cells.some(q=>q.key===key);
 function cpuBets(){const sk=G.cpuSkill(),bank=st.bank[1],out=[],budget=Math.max(MIN,Math.min(MAX,bank,Math.round(bank*(.05+.1*sk)/5)*5));
  out.push([OUTSIDE[Math.floor(Math.random()*6)],Math.max(5,Math.round(budget*.6/5)*5)]);if(budget>=20)out.push(['n'+Math.floor(Math.random()*37),5]);if(Math.random()<.4&&budget>=40)out.push(['d'+(1+Math.floor(Math.random()*3)),Math.round(budget*.25/5)*5||5]);
  let t=0;return {bets:out.filter(([,a])=>(t+=a)<=Math.min(MAX,bank))};}
 // the spin: the ball runs round the track against the wheel, drops, rattles and rests in pocket n
 async function spinWheel(n){const D=st.fast?1.1:5.2,t0=G.T,w0=st.wheel.a,wTurn=Math.PI*2*(st.fast?.8:1.6),wEnd=w0+wTurn;
  const bEnd=wEnd+pocketAngle(n),b0=bEnd+Math.PI*2*(st.fast?4:7)+G.rand()*.2;st.ball={t0,D,w0,wEnd,b0,bEnd,n,last:0};snd.whir(D+.6);
  let next=0;while(G.T-t0<D){const k=(G.T-t0)/D;if(k>.55&&G.T>next){snd.clack(1-(k-.55));next=G.T+.08+(k-.55)*.5;}await G.W8(40);}st.wheel.a=wEnd;st.ball.done=true;snd.clack(1);}
 function wheelState(){const b=st.ball;if(!b)return {wa:st.wheel.a,ba:null};const k=Math.min(1,(G.T-b.t0)/b.D);
  const wa=b.done?st.wheel.a:b.w0+(b.wEnd-b.w0)*(1-(1-k)*(1-k));let ba,rr;
  // the ball decelerates on the track, then drops (radius shrinks) with a few bounces, then rides the wheel
  const kb=Math.min(1,k/.8),eb=1-Math.pow(1-kb,2.2);ba=b.b0+(b.bEnd-b.b0)*eb;
  if(k<.55)rr=.9;else if(k<.8){const q=(k-.55)/.25;rr=.9-.18*q+Math.abs(Math.sin(q*Math.PI*3))*.05*(1-q);}else{rr=.72;ba=wa+pocketAngle(b.n);}
  if(b.done){rr=.72;ba=wa+pocketAngle(b.n);}return {wa,ba,rr};}
 // ---- input: pick a chip in the panel, tap the layout to place it
 G.act=id=>{const u=st.ui;if(!u||s.paused)return;if(u.mode!=='bet')return;const o=u.opts,sum=o.placed.reduce((t,b)=>t+b[1],0);
  if(id.startsWith('chip:')){st.chip=+id.slice(5);snd.chips(1);return;}
  if(id.startsWith('cell:')){const key=id.slice(5),v=st.chip;if(sum+v>o.room){G.say('Table limit, darling.',1.2);return;}o.placed.push([key,v]);snd.chips(1);return;}
  if(id==='undo'){o.placed.pop();snd.chips(1);return;}
  if(id==='rebet'){let t=0;o.placed=st.lastBets[u.p].filter(([,a])=>(t+=a)<=o.room).map(b=>[...b]);snd.chips(3);return;}
  if(id==='clear'){o.placed=[];return;}
  if(id==='done'&&sum>=MIN){const agg=[];for(const [k,a] of o.placed){const f=agg.find(q=>q[0]===k);if(f)f[1]+=a;else agg.push([k,a]);}u.res({bets:agg});return;}
  if(id==='leave')u.res({leave:1});};
 G.onTap=d=>{if(st.ui?.mode!=='bet'||!L)return;const q=L.cells.find(c=>d.x>=c.X&&d.x<=c.X+c.w&&d.y>=c.Y&&d.y<=c.Y+c.h);if(q)G.act('cell:'+q.key);};
 G.key=(k,u)=>{if(u.mode!=='bet')return null;const m={'1':5,'2':25,'3':100,'4':500};if(m[k])return 'chip:'+m[k];if(k==='enter')return 'done';if(k==='backspace'||k==='u')return 'undo';if(k==='r')return 'rebet';return null;};
 G.bot=u=>u.mode==='bet'?{bets:[[Math.random()<.5?'red':'black',MIN],...(Math.random()<.5?[['n'+Math.floor(Math.random()*37),5]]:[])]}:null;
 // ---- drawing
 function drawChips(list,alpha=1){const byCell=new Map();for(const b of list){if(b.gone)continue;(byCell.get(b.key)||byCell.set(b.key,[]).get(b.key)).push(b);}
  for(const [key,bs] of byCell){const q=cellOf(key);if(!q)continue;bs.forEach((b,i)=>{const cx=q.X+q.w/2+(i-(bs.length-1)/2)*L.chipD*.42,cy=q.Y+q.h/2+L.chipD*.1;const own=b.who[0]==='p'?OWN[+b.who[1]]:null;
   x.save();x.globalAlpha=alpha;if(own){x.fillStyle=own;x.strokeStyle='#111';x.lineWidth=1.5;x.beginPath();x.ellipse(cx,cy+L.chipD*.1,L.chipD*.7,L.chipD*.7*V.SQ,0,0,7);x.fill();x.stroke();}V.drawStack(x,b.amt,cx,cy,L.chipD,{max:6});x.restore();
   if(b.paid)V.drawStack(x,b.back-b.amt,cx+L.chipD*.45,cy,L.chipD,{max:6});});}}
 G.render=()=>{lay();const {W,H}=L;x.setTransform(1,0,0,1,0,0);x.drawImage(bg,0,0,W,H);
  // the wheel and the ball
  const {wa,ba,rr}=wheelState(),Wl=L.wheel;if(!st.ball||st.ball.done)st.wheel.a+=.0025;x.save();x.translate(Wl.x,Wl.y);x.save();x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=16;x.beginPath();x.arc(0,0,Wl.R,0,7);x.fillStyle='#120a04';x.fill();x.restore();
  x.rotate(wa);x.drawImage(wheelImg,-Wl.R,-Wl.R,Wl.R*2,Wl.R*2);x.restore();
  if(ba!=null){const bx=Wl.x+Math.sin(ba)*Wl.R*rr,by=Wl.y-Math.cos(ba)*Wl.R*rr,br=Math.max(3,Wl.R*.045);const g=x.createRadialGradient(bx-br*.3,by-br*.3,br*.1,bx,by,br);g.addColorStop(0,'#fff');g.addColorStop(1,'#bbb');x.fillStyle=g;x.beginPath();x.arc(bx,by,br,0,7);x.fill();}
  // last numbers
  st.history.slice(0,8).forEach((n,i)=>{const px=L.vertical?Wl.x+Wl.R+14:Wl.x-Wl.R+10+i*22,py=L.vertical?Wl.y-Wl.R+10+i*20:Wl.y+Wl.R+L.wheel.R*.3;G.pill(String(n),px,py,'#fff',n===0?'#0f8a3e':RED.has(n)?'#c3121e':'#151515',Math.max(9,i?10:12));});
  // the croupier
  G.head({id:G.dealerId,mood:st.dmood,moodT:st.dmoodT},L.hd*1.2,L.crou.x,L.crou.y);
  // the layout: everyone's chips; the bet being built; the dolly on the number
  drawChips(st.bets);if(st.ui?.mode==='bet')drawChips(st.ui.opts.placed.map(([key,amt])=>({who:owner(st.ui.p),key,amt})));
  if(st.dolly!=null){const q=cellOf('n'+st.dolly);if(q){const cx=q.X+q.w/2,cy=q.Y+q.h/2-L.chipD*.45;x.save();x.fillStyle='rgba(255,255,255,.85)';x.strokeStyle='#d9b45a';x.lineWidth=2;x.beginPath();x.moveTo(cx-6,cy+10);x.lineTo(cx+6,cy+10);x.lineTo(cx+3,cy-4);x.lineTo(cx-3,cy-4);x.closePath();x.fill();x.stroke();x.beginPath();x.arc(cx,cy-8,6,0,7);x.fill();x.stroke();x.restore();}
   x.save();x.strokeStyle='#ffe07a';x.lineWidth=3;x.strokeRect(q.X+1,q.Y+1,q.w-2,q.h-2);x.restore();}
  if(st.ui?.mode==='bet'){x.save();x.strokeStyle=`rgba(255,226,120,${.25+.25*Math.sin(G.T*5)})`;x.lineWidth=2;for(const q of L.cells)x.strokeRect(q.X+1,q.Y+1,q.w-2,q.h-2);x.restore();}
  G.flightsDraw(L.chipD);
  G.dealerSpeech(L.crou.x+L.hd*.5,L.crou.y-L.hd*.5,Math.max(11,L.hd*.17),Math.min(190,L.TW*.42));
  G.hud(`SPIN ${Math.max(1,st.spin)} OF ${SPINS}`,`ROULETTE · $${MIN}-$${MAX}`,null);
  panel();G.bannerDraw(L.vertical?L.TW/2:L.wheel.x,L.vertical?L.wheel.y+L.wheel.R+30:L.wheel.y);};
 function panel(){const A=G.panelFrame(),u=st.ui,{fs,X0,Wd,top,wide}=A;
  // the players' banks (no seats round a roulette table here: they stand at the layout)
  const banks=[0,1].map(p=>`${G.seatOf(p).name} ${st.out[p]?'(out)':money(st.bank[p])}`);
  if(!u){A.text(banks.join('  ·  '),wide?X0:A.P.x+A.P.w/2,top+fs*.6,fs*.8,'#fff',wide?'left':'center');A.wait(G.waitMsg(st.phase==='spin'?'NO MORE BETS':st.phase==='result'?'PAYING THE WINNERS':''));return;}
  const se=G.seatOf(u.p),o=u.opts,sum=o.placed.reduce((t,b)=>t+b[1],0);
  A.text(`${se.name}’S BETS`,X0,top+fs*.6,fs,OWN[u.p]);A.text(sum?money(sum):'—',X0+Wd,top+fs*.6,fs,'#fff','right');
  A.small(`BANK ${money(st.bank[u.p]-sum)} · pick a chip, tap the layout`,X0,top+fs*1.7);
  const btnTop=A.buttons([{id:'leave',label:'COLOR UP',sub:'leave'},{id:o.placed.length?'undo':'rebet',label:o.placed.length?'UNDO':'REBET',sub:o.placed.length?'last chip':money(st.lastBets[u.p].reduce((t,b)=>t+b[1],0)),on:o.placed.length>0||st.lastBets[u.p].length>0},{id:'clear',label:'CLEAR',on:sum>0},{id:'done',label:o.last?'SPIN':'DONE',sub:sum<MIN?`min ${money(MIN)}`:money(sum),tone:'gold',on:sum>=MIN}],{cols:wide?2:4,h:wide?Math.min(52,(A.bottom-top)*.12):Math.min(44,A.P.h*.24)});
  A.chips(CHIP_VALUES,top+fs*2.3,btnTop-A.pad,o.room-sum);}
 s.debug={engine:'vegas-roulette',st,seats,get T(){return G.T;},bot:()=>G.botAct(),layout:()=>L,hits:()=>G.hits,dealerId:G.dealerId,theme:G.theme.id,cell:k=>cellOf(k)};
 await G.run(async()=>{lay();await G.W8(800);
  while(st.spin<SPINS&&![0,1].every(p=>st.out[p]||st.bank[p]<MIN))await spin();
  if(st.spin>=SPINS){G.banner('LAST SPIN','#ffe9a8',1.6);await G.W8(1200);}
  await G.end('roulette');});
}
Object.assign(exports,{vegasRoulette});
