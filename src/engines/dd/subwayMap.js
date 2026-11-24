// THE WARRIORS subway map (owner, Nov 24: "the chapter select should be the Warriors subway map. Between stages ... show the
// subway map and where the stage currently is ... like it's on a dirty 70s subway wall"). Our own drawing of a 1970s-style
// New York subway map (no real map or logo copied): the Warriors' route from Van Cortlandt Park down to Coney Island, one stop
// per chapter with that gang's tag, pasted on a grimy tiled station wall. Picture slots (src/data/ddSprites.js) replace the
// drawn parts as they arrive: ww:map-wall(-tall/-fold) = the wall, ww:map-base = the map poster without stops or tags (stops
// sit at STOPS in poster fractions), ww:map-tag-<chapter id> = each stop's gang tag.
const DS=require("src/data/ddSprites.js");
const SHAPE=require("src/bgShape.js");
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// the poster is 4:5 (w:h); stops in poster fractions, in chapter order, with the side their tag hangs on
const ASPECT=.8;
const STOPS=[
 {x:.36,y:.07,tag:'r',col:'#e8b83c'},  // the Conclave, Van Cortlandt Park
 {x:.58,y:.13,tag:'r',col:'#8c8c8c'},  // the Turnbull AC's, under the El
 {x:.52,y:.21,tag:'r',col:'#5c7c3c'},  // the Orphans, Tremont
 {x:.40,y:.29,tag:'l',col:'#4c8cc8'},  // the train south
 {x:.29,y:.37,tag:'l',col:'#e8e8e8'},  // the Baseball Furies, 96th Street
 {x:.33,y:.46,tag:'r',col:'#e85c9c'},  // the Lizzies, uptown
 {x:.31,y:.56,tag:'l',col:'#c8c83c'},  // Union Square
 {x:.36,y:.61,tag:'r',col:'#9c3cc8'},  // the Punks
 {x:.52,y:.77,tag:'r',col:'#4c8cc8'},  // the ride home, Brooklyn
 {x:.58,y:.93,tag:'l',col:'#e83c3c'}]; // Coney Island
// the drawn land (poster fractions): water everywhere else
const LAND={
 nj:[[0,0],[.2,0],[.22,.2],[.24,.4],[.22,.56],[.18,.7],[.12,.74],[0,.76]],
 bronx:[[.27,0],[.82,0],[.86,.1],[.8,.2],[.66,.25],[.5,.27],[.4,.23],[.35,.14],[.3,.08]],
 manhattan:[[.34,.15],[.39,.2],[.42,.3],[.42,.42],[.41,.52],[.37,.62],[.33,.67],[.29,.64],[.27,.56],[.28,.44],[.3,.32],[.32,.22]],
 island:[[.46,.3],[1,.24],[1,1],[.72,1],[.62,.97],[.5,.9],[.45,.78],[.44,.66],[.46,.56],[.47,.44]],
 staten:[[.06,.8],[.2,.78],[.28,.86],[.24,.97],[.1,.99],[.03,.9]]};
const PARKS=[[.33,.33,.04,.12],[.34,.03,.06,.05],[.56,.6,.07,.06]];
// other lines on the map, for the look (the Warriors' route is drawn over them in red)
const LINES=[['#2c9c4c',[[.36,.2],[.38,.32],[.37,.46],[.35,.6],[.48,.7],[.6,.82]]],['#e8902c',[[.45,.05],[.42,.2],[.4,.38],[.38,.52],[.42,.66],[.62,.74],[.84,.78]]],
 ['#2c5cc8',[[.3,.15],[.32,.3],[.3,.45],[.29,.6],[.4,.72],[.5,.86],[.6,.98]]],['#e8d42c',[[.38,.55],[.5,.6],[.7,.5],[.95,.46]]],['#8c8c8c',[[.36,.58],[.6,.56],[.9,.62]]]];
const LABELS=[['The Bronx',.7,.17],['Manhattan',.22,.45,-1.25],['Brooklyn',.7,.86],['Queens',.78,.4],['New Jersey',.08,.3,-1.4],['Hudson River',.25,.12,-1.35]];
function hash(n){n=(n^61)^(n>>>16);n=n+(n<<3);n=n^(n>>>4);n=Math.imul(n,0x27d4eb2d);return ((n^(n>>>15))>>>0)/4294967296;}
// the station wall: dirty white tiles, grime and old graffiti (cached per size)
const cache={};
function drawnWall(W,H){const key=W+'x'+H;if(cache[key])return cache[key];const cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');
 g.fillStyle='#cfc8b4';g.fillRect(0,0,W,H);const tw=Math.max(28,Math.min(W,H)/12),th=tw/2;
 for(let r=0,y=0;y<H;r++,y+=th)for(let c=-1,X=(r%2)*tw/2-tw;X<W;c++,X+=tw){const n=hash(r*131+c*7),l=200+Math.floor(n*30);g.fillStyle=`rgb(${l},${l-6},${l-22})`;g.fillRect(X+1,y+1,tw-2,th-2);}
 // a band of maroon tiles and a name strip like a station wall
 g.fillStyle='#5c1c24';g.fillRect(0,H*.08,W,th*1.2);g.fillRect(0,H*.9,W,th*1.2);
 // grime: dark streaks running down, soot at the top, a wet stain
 for(let i=0;i<40;i++){const X=hash(i*17)*W,w=8+hash(i*29)*60,h=H*(.2+hash(i*5)*.7);const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(40,30,20,.35)');gr.addColorStop(1,'rgba(40,30,20,0)');g.fillStyle=gr;g.fillRect(X,0,w,h);}
 const top=g.createLinearGradient(0,0,0,H*.25);top.addColorStop(0,'rgba(20,14,10,.6)');top.addColorStop(1,'rgba(20,14,10,0)');g.fillStyle=top;g.fillRect(0,0,W,H*.25);
 const bot=g.createLinearGradient(0,H*.7,0,H);bot.addColorStop(0,'rgba(30,20,10,0)');bot.addColorStop(1,'rgba(30,20,10,.55)');g.fillStyle=bot;g.fillRect(0,H*.7,W,H*.3);
 // spray-paint scribbles (our own: loops and a crude WARRIORS-ish swoosh)
 g.lineCap='round';for(let i=0;i<9;i++){const cx=hash(i*41)*W,cy=H*(.2+hash(i*43)*.65),col=['#c8282c','#2c4cc8','#1c1c1c','#2c8c3c','#c87c1c'][i%5];g.strokeStyle=col;g.globalAlpha=.55;g.lineWidth=3+hash(i)*5;g.beginPath();
  for(let k=0;k<14;k++){const a=k*.9+hash(i*3)*6,r=18+hash(i*7+k)*40;const px=cx+k*9+Math.cos(a)*r,py=cy+Math.sin(a)*r*.5;k?g.lineTo(px,py):g.moveTo(px,py);}g.stroke();}
 g.globalAlpha=1;const vg=g.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');g.fillStyle=vg;g.fillRect(0,0,W,H);
 return cache[key]=cv;}
// the drawn map poster (cached per size): water, land, parks, lines, borough names, an old paper look
function drawnPoster(w,h){const key='p'+w+'x'+h;if(cache[key])return cache[key];const cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d');
 g.fillStyle='#bcd8e0';g.fillRect(0,0,w,h);
 const poly=pts=>{g.beginPath();pts.forEach(([a,b],i)=>i?g.lineTo(a*w,b*h):g.moveTo(a*w,b*h));g.closePath();};
 for(const pts of Object.values(LAND)){poly(pts);g.fillStyle='#efe3c2';g.fill();g.strokeStyle='#9c8c6c';g.lineWidth=Math.max(1,w/400);g.stroke();}
 g.fillStyle='#b8d49c';for(const [a,b,c,d] of PARKS)g.fillRect(a*w,b*h,c*w,d*h);
 g.lineJoin=g.lineCap='round';for(const [col,pts] of LINES){g.strokeStyle=col;g.lineWidth=w/70;g.beginPath();pts.forEach(([a,b],i)=>i?g.lineTo(a*w,b*h):g.moveTo(a*w,b*h));g.stroke();}
 g.fillStyle='#3c3c3c';g.textAlign='center';g.textBaseline='middle';for(const [t,a,b,rot] of LABELS){g.save();g.translate(a*w,b*h);if(rot)g.rotate(rot);g.font=`700 ${w/26}px "Helvetica Neue",Arial,sans-serif`;g.fillText(t,0,0);g.restore();}
 // the title strip
 g.fillStyle='#1c1c1c';g.fillRect(0,0,w,h*.045);g.fillStyle='#fff';g.font=`900 ${h*.028}px "Helvetica Neue",Arial,sans-serif`;g.textAlign='left';g.fillText('NEW YORK CITY SUBWAY',w*.03,h*.024);
 // age: yellowing, creases, stains
 const age=g.createRadialGradient(w/2,h/2,w*.2,w/2,h/2,w*.9);age.addColorStop(0,'rgba(220,190,120,0)');age.addColorStop(1,'rgba(150,110,50,.35)');g.fillStyle=age;g.fillRect(0,0,w,h);
 g.strokeStyle='rgba(90,70,40,.25)';g.lineWidth=2;g.beginPath();g.moveTo(w/2,0);g.lineTo(w/2,h);g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();
 for(let i=0;i<6;i++){g.fillStyle=`rgba(110,80,40,${.08+hash(i*9)*.12})`;g.beginPath();g.arc(hash(i*3)*w,hash(i*5)*h,w*(.03+hash(i)*.06),0,TAU);g.fill();}
 return cache[key]=cv;}
// where the poster goes on this screen (and the text panel beside or under it)
function layout(W,H){const wide=W>H*1.05;if(wide){const ph=H*.92,pw=Math.min(ph*ASPECT,W*.58);return {wide,x:W*.04,y:(H-pw/ASPECT)/2,w:pw,h:pw/ASPECT,panel:{x:W*.04+pw+W*.03,y:H*.12,w:W*.93-pw-W*.03,h:H*.76}};}
 const pw=Math.min(W*.92,H*.56*ASPECT);return {wide,x:(W-pw)/2,y:H*.04,w:pw,h:pw/ASPECT,panel:{x:W*.05,y:H*.04+pw/ASPECT+H*.02,w:W*.9,h:H*.92-pw/ASPECT-H*.02}};}
// draw the wall + map. o = {chapters, reached, at (stop to mark), from (stop the ride starts at), t (s since shown), done:Set, pick}
// returns the stops' screen spots for taps
function drawMap(g,W,H,o){const L=layout(W,H),t=o.t||0;
 const wall=SHAPE.pick(W,H,{wide:'map-wall',tall:'map-wall-tall',fold:'map-wall-fold'},n=>DS.picture(n));
 if(wall){const sc=Math.max(W/wall.width,H/wall.height);g.drawImage(wall,(W-wall.width*sc)/2,(H-wall.height*sc)/2,wall.width*sc,wall.height*sc);}else g.drawImage(drawnWall(Math.ceil(W),Math.ceil(H)),0,0);
 // the poster: shadow, the map, tape at the corners, a torn corner
 g.save();g.fillStyle='rgba(0,0,0,.45)';g.fillRect(L.x+6,L.y+8,L.w,L.h);const base=DS.picture('map-base');
 if(base)g.drawImage(base,L.x,L.y,L.w,L.h);else g.drawImage(drawnPoster(Math.ceil(L.w),Math.ceil(L.h)),L.x,L.y,L.w,L.h);
 g.fillStyle='rgba(230,220,170,.7)';for(const [a,b,r] of [[0,0,-.6],[1,0,.6],[0,1,.6],[1,1,-.6]]){g.save();g.translate(L.x+a*L.w,L.y+b*L.h);g.rotate(r);g.fillRect(-L.w*.06,-L.w*.018,L.w*.12,L.w*.036);g.restore();}
 g.restore();
 const P=i=>({x:L.x+STOPS[i].x*L.w,y:L.y+STOPS[i].y*L.h});
 // the Warriors' route: grey ahead, red where they've been, the ride drawn in as it happens
 const rideK=o.from!=null&&o.at!=null&&o.at>o.from?clamp((t-.4)/1.6,0,1):1,lw=Math.max(4,L.w/55);g.lineJoin=g.lineCap='round';
 g.strokeStyle='rgba(60,60,60,.55)';g.lineWidth=lw;g.beginPath();STOPS.forEach((s,i)=>{const p=P(i);i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);});g.stroke();
 const upto=o.at??o.reached??0;g.strokeStyle='#d8202c';g.lineWidth=lw*1.15;g.beginPath();for(let i=0;i<=upto;i++){let p=P(i);if(o.from!=null&&i===upto&&i>o.from){const a=P(i-1);p={x:a.x+(p.x-a.x)*rideK,y:a.y+(p.y-a.y)*rideK};}i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);}g.stroke();
 const spots=[],fs=Math.max(9,Math.min(16,L.w/30));
 STOPS.forEach((s,i)=>{const p=P(i),reached=i<=(o.reached??0),here=i===(o.at??-1),r=Math.max(6,L.w/48)*(here?1.35:1);
  g.fillStyle=reached?'#fff':'#bbb';g.strokeStyle='#1c1c1c';g.lineWidth=Math.max(2,r*.35);g.beginPath();g.arc(p.x,p.y,r,0,TAU);g.fill();g.stroke();
  if(o.done?.has(i)){g.fillStyle='#d8202c';g.beginPath();g.arc(p.x,p.y,r*.5,0,TAU);g.fill();}
  // the stop's gang tag
  const C=o.chapters[i],tagIm=DS.picture('map-tag-'+C.id),side=s.tag==='l'?-1:1,tx=p.x+side*(r+6);
  if(tagIm){const tw=L.w*.24,th=tw*tagIm.height/tagIm.width;g.globalAlpha=reached?1:.55;g.drawImage(tagIm,side>0?tx:tx-tw,p.y-th/2,tw,th);g.globalAlpha=1;}
  else{g.font=`900 ${fs}px "SC Bangers",Impact,sans-serif`;g.textAlign=side>0?'left':'right';g.textBaseline='middle';const name=C.title.replace(/^THE /,'');
   const tw=g.measureText(name).width;g.save();g.translate(tx,p.y);g.rotate(side*-.06);g.fillStyle=reached?'rgba(20,14,10,.85)':'rgba(60,60,60,.55)';g.fillRect(side>0?-3:-tw-3,-fs*.62,tw+6,fs*1.24);
    g.fillStyle=reached?s.col:'#aaa';g.fillText(name,0,0);g.restore();}
  if(here){const pulse=.5+.5*Math.sin(t*5);g.strokeStyle=`rgba(255,220,60,${.5+.5*pulse})`;g.lineWidth=3;g.beginPath();g.arc(p.x,p.y,r*(1.6+pulse*.5),0,TAU);g.stroke();
   g.font=`900 ${fs*.85}px "SC Nunito",sans-serif`;g.textAlign=side>0?'right':'left';g.textBaseline='middle';const hx=p.x-side*r*2.2;g.lineWidth=3;g.strokeStyle='#000';g.strokeText('YOU ARE HERE',hx,p.y);g.fillStyle='#ffd23c';g.fillText('YOU ARE HERE',hx,p.y);}
  spots.push({i,x:p.x,y:p.y,r:Math.max(r*2.4,22),reached});});
 // the Warriors on the move: a little train running the last stretch
 if(o.from!=null&&o.at!=null&&o.at>o.from&&rideK<1){const a=P(o.at-1),b=P(o.at),px=a.x+(b.x-a.x)*rideK,py=a.y+(b.y-a.y)*rideK;g.fillStyle='#1c1c1c';g.beginPath();g.roundRect(px-lw*1.6,py-lw,lw*3.2,lw*2,lw*.5);g.fill();g.fillStyle='#ffd23c';g.fillRect(px-lw,py-lw*.4,lw*.6,lw*.6);g.fillRect(px+lw*.3,py-lw*.4,lw*.6,lw*.6);}
 return {spots,L};}
Object.assign(exports,{drawMap,drawnPoster,layout,STOPS,ASPECT,LAND,LINES,PARKS,LABELS});
