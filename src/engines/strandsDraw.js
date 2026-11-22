// STRANDS & LADDERS drawing: every piece looks like a printed board game (cardboard board, plastic spinner, standee
// pawns). Each piece uses the owner's picture when it is in (src/data/strandsArt.js slots), else draws a stand-in.
// Shared by the game and tools/strands-templates.mjs.
const A=require("src/data/strandsArt.js");
const {LADDERS,CHUTES,STORIES,BOARD,SQ,squareRC,squareXY,chutePath,bez,picture}=A;
const PAL=['#d9cfb4','#9fb0b0','#c58a5c','#7f8f78','#e6dcc2','#a9a2c2'];
const ICON={1:'🌉',4:'🪜',9:'🍕',21:'🚡',28:'👶',36:'🛺',51:'⛺',71:'🛣️',80:'🏙️',16:'👻',47:'📦',49:'🌧️',56:'🪨',62:'🤖',64:'😴',87:'💥',93:'🌊',95:'🥤',98:'🎭'};
const pat=new Map();
function pattern(x,name,draw){const img=picture(name);if(img){const k='img:'+name;if(!pat.has(k))pat.set(k,x.createPattern(img,'repeat'));return pat.get(k);}
 if(!pat.has(name)){const c=document.createElement('canvas');c.width=c.height=128;draw(c.getContext('2d'));pat.set(name,x.createPattern(c,'repeat'));}return pat.get(name);}

// ---- the board (board px, S = 2048) into context x scaled by k
function drawBoardBase(x,k=1,{numbers=true,labels=true}={}){const S=BOARD.S*k,img=picture('board');
 x.save();
 if(img)x.drawImage(img,0,0,S,S);
 else{ // cardboard frame + printed squares
  x.fillStyle='#1d2429';x.fillRect(0,0,S,S);const g=x.createLinearGradient(0,0,S,S);g.addColorStop(0,'#2c3a42');g.addColorStop(1,'#151c20');x.fillStyle=g;x.fillRect(S*.012,S*.012,S*.976,S*.976);
  x.strokeStyle='#c9a24a';x.lineWidth=Math.max(1,6*k);x.strokeRect(S*.03,S*.03,S*.94,S*.94);x.lineWidth=Math.max(1,2*k);x.strokeRect(S*.038,S*.038,S*.924,S*.924);
  for(let n=1;n<=100;n++){const {row,col}=squareRC(n),X=(BOARD.G0+col*SQ)*k,Y=(BOARD.G0+row*SQ)*k,w=SQ*k;
   x.fillStyle=PAL[(n*7+row)%PAL.length];x.fillRect(X,Y,w,w);
   // paper grain + contour lines, like the printed terrain of a delivery map
   x.globalAlpha=.12;x.strokeStyle='#3a3020';x.lineWidth=Math.max(.5,2*k);for(let j=0;j<3;j++){x.beginPath();const yy=Y+w*(.3+j*.22);x.moveTo(X,yy);x.bezierCurveTo(X+w*.3,yy-w*.12,X+w*.6,yy+w*.12,X+w,yy-((n+j)%3-1)*w*.06);x.stroke();}x.globalAlpha=1;}
  x.strokeStyle='#1d2429';x.lineWidth=Math.max(1,4*k);for(let i=0;i<=10;i++){x.beginPath();x.moveTo((BOARD.G0+i*SQ)*k,BOARD.G0*k);x.lineTo((BOARD.G0+i*SQ)*k,(BOARD.G0+BOARD.GS)*k);x.stroke();x.beginPath();x.moveTo(BOARD.G0*k,(BOARD.G0+i*SQ)*k);x.lineTo((BOARD.G0+BOARD.GS)*k,(BOARD.G0+i*SQ)*k);x.stroke();}}
 if(numbers){x.textBaseline='top';x.textAlign='left';for(let n=1;n<=100;n++){const {row,col}=squareRC(n),X=(BOARD.G0+col*SQ)*k,Y=(BOARD.G0+row*SQ)*k;
   x.font=`900 ${Math.max(7,SQ*.2*k)}px "SC Nunito",Georgia,serif`;x.fillStyle='#fffc';x.fillText(String(n),X+SQ*.07*k+1,Y+SQ*.05*k+1);x.fillStyle='#1d2429';x.fillText(String(n),X+SQ*.07*k,Y+SQ*.05*k);}}
 if(labels){x.textAlign='center';x.textBaseline='bottom';x.font=`900 ${Math.max(6,SQ*.11*k)}px "SC Nunito",sans-serif`;x.fillStyle='#1d2429';
  const a=squareXY(1,k),b=squareXY(100,k);x.fillText('CAPITAL KNOT',a.x,a.y+SQ*.45*k);x.fillText('EDGE KNOT',b.x,b.y+SQ*.45*k);}
 x.restore();}
// a Bridges ladder from square a up to square b
function drawLadder(x,a,b,k=1){const p=squareXY(a,k),q=squareXY(b,k),dx=q.x-p.x,dy=q.y-p.y,L=Math.hypot(dx,dy),ang=Math.atan2(dy,dx),w=SQ*.34*k;
 x.save();x.translate(p.x,p.y);x.rotate(ang);
 x.fillStyle='rgba(0,0,0,.28)';x.fillRect(w*.08,-w*.5+w*.12,L,w*1.0);
 const tile=picture('ladder-tile');
 if(tile){x.save();x.rotate(-Math.PI/2);const t=w;for(let d=0;d<L;d+=t){const h=Math.min(t,L-d);x.drawImage(tile,0,0,256,256*h/t,-w/2,d,w,h);}x.restore();}
 else{for(const s of [-1,1]){x.fillStyle='#4a5258';x.fillRect(0,s*w*.42-w*.07,L,w*.14);x.fillStyle='#e07a2a';x.fillRect(0,s*w*.42-w*.07,L,w*.035);x.fillStyle='#8a949a';x.fillRect(0,s*w*.42+w*.02,L,w*.03);}
  for(let d=w*.25;d<L-w*.1;d+=w*.42){x.fillStyle='#2e353a';x.fillRect(d,-w*.42,w*.09,w*.84);x.fillStyle='#9aa4aa';x.fillRect(d,-w*.42,w*.03,w*.84);}}
 x.restore();}
// a BT tar slide from square a down to square b (t = time for the slow ooze shine)
function drawChute(x,a,b,k=1,t=0){const P=chutePath(a,b).map(p=>({x:p.x*k,y:p.y*k})),w=SQ*.34*k,N=40,pts=[];
 for(let i=0;i<=N;i++)pts.push(bez(P,i/N));
 const side=(sign,shrink)=>pts.map((p,i)=>{const q=pts[Math.min(N,i+1)],r=pts[Math.max(0,i-1)],dx=q.x-r.x,dy=q.y-r.y,L=Math.hypot(dx,dy)||1,ww=w*(.5-.18*i/N)*shrink;return {x:p.x-dy/L*ww*sign,y:p.y+dx/L*ww*sign};});
 const band=(shrink)=>{const l=side(1,shrink),r=side(-1,shrink).reverse();x.beginPath();x.moveTo(l[0].x,l[0].y);for(const p of l)x.lineTo(p.x,p.y);for(const p of r)x.lineTo(p.x,p.y);x.closePath();};
 x.save();x.translate(w*.08,w*.1);band(1.05);x.fillStyle='rgba(0,0,0,.3)';x.fill();x.restore();
 band(1);x.fillStyle=pattern(x,'tar-tile',g=>{g.fillStyle='#0b0b0d';g.fillRect(0,0,128,128);for(let i=0;i<40;i++){g.fillStyle=`rgba(${60+i%3*20},${50+i%4*10},40,.25)`;g.beginPath();g.arc((i*37)%128,(i*53)%128,3+i%5,0,7);g.fill();}});x.fill();
 x.strokeStyle='#2a2620';x.lineWidth=Math.max(1,3*k);x.stroke();
 // glossy ooze shine running down + tar handprints reaching out
 x.strokeStyle='rgba(200,190,170,.35)';x.lineWidth=Math.max(1,4*k);x.setLineDash([w*.3,w*.6]);x.lineDashOffset=-t*w*.8;x.beginPath();const l2=side(1,.45);x.moveTo(l2[0].x,l2[0].y);for(const p of l2)x.lineTo(p.x,p.y);x.stroke();x.setLineDash([]);
 for(let i=1;i<4;i++){const p=pts[Math.floor(N*i/4)],r=w*.16;x.fillStyle='#0b0b0d';x.beginPath();x.arc(p.x,p.y,r,0,7);x.fill();for(let f=0;f<4;f++){const a2=-Math.PI/2+(f-1.5)*.45;x.beginPath();x.ellipse(p.x+Math.cos(a2)*r*1.4,p.y+Math.sin(a2)*r*1.4,r*.22,r*.55,a2+Math.PI/2,0,7);x.fill();}}
 // the mouth at the top: a dark pool
 const m=pts[0];x.fillStyle='#050506';x.beginPath();x.ellipse(m.x,m.y,w*.55,w*.32,0,0,7);x.fill();x.strokeStyle='#c9a24a';x.lineWidth=Math.max(1,2*k);x.stroke();
 }
// the small round picture on a ladder's foot / chute's top square (and big on the event card)
function drawVignette(x,cx,cy,r,n,{ring=true}={}){const ladder=!!LADDERS[n],img=picture((ladder?'deed-':'slip-')+n);
 x.save();x.beginPath();x.arc(cx,cy,r,0,7);x.closePath();x.save();x.clip();
 if(img)x.drawImage(img,cx-r,cy-r,r*2,r*2);
 else{const g=x.createRadialGradient(cx,cy-r*.3,r*.1,cx,cy,r);g.addColorStop(0,ladder?'#fff3c8':'#d8d8e8');g.addColorStop(1,ladder?'#c9a24a':'#3a3a52');x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);
  x.font=`${r*1.05}px serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(ICON[n]||'★',cx,cy+r*.05);}
 x.restore();if(ring){x.lineWidth=Math.max(1,r*.12);x.strokeStyle=ladder?'#e8c25a':'#7a1a2a';x.stroke();}x.restore();}
function drawBoard(x,k=1,t=0,{numbers=true}={}){drawBoardBase(x,k,{numbers});
 for(const [a,b] of Object.entries(CHUTES))drawChute(x,+a,b,k,t);
 for(const [a,b] of Object.entries(LADDERS))drawLadder(x,+a,b,k);
 for(const a of Object.keys(LADDERS)){const p=squareXY(+a,k);drawVignette(x,p.x+SQ*.14*k,p.y+SQ*.14*k,SQ*.22*k,+a);}
 for(const a of Object.keys(CHUTES)){const p=squareXY(+a,k);drawVignette(x,p.x+SQ*.2*k,p.y-SQ*.18*k,SQ*.19*k,+a);}}

// ---- the spinner card: dial r (screen px) at cx,cy, arrow angle ang (0 = up, clockwise)
const NUMCOL=['#c8402a','#e0a02a','#4a8a5a','#2a6a9a','#6a4a9a','#2a2a32'];
function drawSpinner(x,cx,cy,r,ang,{shadow=true,arrow:withArrow=true}={}){const face=picture('spinner-face'),arrow=picture('spinner-arrow');
 x.save();
 if(shadow){x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.arc(cx+r*.05,cy+r*.07,r*1.04,0,7);x.fill();}
 if(face)x.drawImage(face,cx-r,cy-r,r*2,r*2);
 else{x.fillStyle='#1d2429';x.beginPath();x.arc(cx,cy,r,0,7);x.fill();x.strokeStyle='#c9a24a';x.lineWidth=r*.04;x.beginPath();x.arc(cx,cy,r*.96,0,7);x.stroke();
  for(let i=0;i<6;i++){const a0=-Math.PI/2+(i-.5)*Math.PI/3,a1=a0+Math.PI/3;x.fillStyle=NUMCOL[i];x.beginPath();x.moveTo(cx,cy);x.arc(cx,cy,r*.9,a0,a1);x.closePath();x.fill();
   x.strokeStyle='#e8dcc0';x.lineWidth=r*.02;x.stroke();const am=(a0+a1)/2;x.fillStyle='#f6eedc';x.font=`900 ${r*.3}px "SC Bangers","SC Nunito",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(String(i+1),cx+Math.cos(am)*r*.6,cy+Math.sin(am)*r*.6);
   x.fillStyle='#c9a24a';x.beginPath();x.arc(cx+Math.cos(a0)*r*.9,cy+Math.sin(a0)*r*.9,r*.03,0,7);x.fill();}}
 // the arrow, with its shadow
 if(!withArrow){x.restore();return;}
 x.translate(cx,cy);
 const arrowAt=(dx,dy,col,stroke)=>{x.save();x.translate(dx,dy);x.rotate(ang);if(arrow&&!col){x.drawImage(arrow,-r,-r,r*2,r*2);x.restore();return;}
  x.fillStyle=col||'#e8e2d0';x.beginPath();x.moveTo(0,-r*.84);x.lineTo(r*.13,-r*.5);x.lineTo(r*.05,-r*.5);x.lineTo(r*.07,r*.34);x.lineTo(-r*.07,r*.34);x.lineTo(-r*.05,-r*.5);x.lineTo(-r*.13,-r*.5);x.closePath();x.fill();
  if(stroke){x.strokeStyle='#5a5040';x.lineWidth=r*.015;x.stroke();x.fillStyle='#e07a2a';x.fillRect(-r*.05,-r*.5,r*.1,r*.08);}x.restore();};
 arrowAt(r*.04,r*.06,'rgba(0,0,0,.35)',false);arrowAt(0,0,arrow?null:'#e8e2d0',true);
 x.fillStyle='#c9a24a';x.beginPath();x.arc(0,0,r*.09,0,7);x.fill();x.fillStyle='#fff8';x.beginPath();x.arc(-r*.025,-r*.025,r*.035,0,7);x.fill();
 x.restore();}
// a standee pawn: base + body (picture pawn-p1/p2 or drawn porter), head circle returned for the face
function drawPawn(x,i,cx,footY,h,{lift=0}={}){const img=picture('pawn-p'+(i+1)),w=h*256/384,top=footY-h-lift;
 x.save();x.fillStyle='rgba(0,0,0,.32)';x.beginPath();x.ellipse(cx,footY+h*.02,w*.42,h*.07,0,0,7);x.fill();
 if(img)x.drawImage(img,cx-w/2,top,w,h);
 else{const col=i?'#e07a2a':'#4a8ac8',dark=i?'#8a4a1a':'#2a4a6a';
  x.fillStyle='#d8d0c0';x.beginPath();x.ellipse(cx,footY-h*.05-lift,w*.4,h*.07,0,0,7);x.fill();x.fillStyle='#a8a090';x.fillRect(cx-w*.4,footY-h*.05-lift,w*.8,h*.04);
  // porter: body suit, the tall cargo pack, BB pod on the chest
  x.fillStyle='#6a6458';x.fillRect(cx-w*.26,top+h*.35,w*.52,h*.42);x.fillStyle=dark;x.fillRect(cx-w*.3,top+h*.3,w*.6,h*.4);
  x.fillStyle='#8a7a5a';x.fillRect(cx-w*.34,top+h*.06,w*.22,h*.5);x.fillRect(cx+w*.12,top+h*.1,w*.22,h*.46);x.strokeStyle='#4a4030';x.lineWidth=h*.01;x.strokeRect(cx-w*.34,top+h*.06,w*.22,h*.5);x.strokeRect(cx+w*.12,top+h*.1,w*.22,h*.46);
  x.fillStyle=col;x.fillRect(cx-w*.3,top+h*.62,w*.6,h*.05);x.fillStyle='#ffcf6a';x.beginPath();x.ellipse(cx,top+h*.5,w*.1,h*.07,0,0,7);x.fill();
  x.fillStyle='#3a3a3a';x.fillRect(cx-w*.22,top+h*.76,w*.16,h*.17);x.fillRect(cx+w*.06,top+h*.76,w*.16,h*.17);}
 x.restore();return {x:cx,y:top+h*96/384,d:h*132/384};}
// the event card: picture window + two lines of text
function drawCard(x,cx,cy,w,n,{line1='',line2='',ladder=true}={}){const img=picture('card'),h=w*720/1024,X=cx-w/2,Y=cy-h/2;
 x.save();x.fillStyle='rgba(0,0,0,.4)';x.fillRect(X+w*.02,Y+w*.025,w,h);
 if(img)x.drawImage(img,X,Y,w,h);else{x.fillStyle='#efe6cf';x.fillRect(X,Y,w,h);x.strokeStyle=ladder?'#c9a24a':'#7a1a2a';x.lineWidth=w*.02;x.strokeRect(X+w*.025,Y+w*.025,w*.95,h-w*.05);
  x.fillStyle=ladder?'#c9a24a':'#7a1a2a';x.fillRect(X+w*.025,Y+h-w*.13,w*.95,w*.105);}
 const pr=w*192/1024;drawVignette(x,X+w*256/1024,Y+w*256/1024,pr,n);
 x.textAlign='left';x.textBaseline='top';x.fillStyle='#1d2429';const tx=X+w*.5,tw=w*.46;
 const wrap=(txt,y,fs,font)=>{x.font=`${font} ${fs}px "SC Nunito",sans-serif`;const words=txt.split(' ');let line='',yy=y;for(const wd of words){const t2=line?line+' '+wd:wd;if(x.measureText(t2).width>tw&&line){x.fillText(line,tx,yy);line=wd;yy+=fs*1.15;}else line=t2;}x.fillText(line,tx,yy);return yy+fs*1.3;};
 let yy=wrap(line1,Y+h*.12,w*.052,'800');x.fillStyle=ladder?'#7a5a10':'#7a1a2a';yy=wrap(line2,yy+w*.01,w*.06,'900');
 x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';x.font=`900 ${w*.055}px "SC Bangers","SC Nunito",sans-serif`;x.fillText(ladder?`CLIMB TO ${LADDERS[n]}`:`SLIDE TO ${CHUTES[n]}`,cx,Y+h-w*.078);
 x.restore();}
function drawTable(x,W,H){const img=picture(W>H?'table-wide':'table')||picture(W>H?'table':'table-wide');
 if(img){const s=Math.max(W/img.width,H/img.height);x.drawImage(img,(W-img.width*s)/2,(H-img.height*s)/2,img.width*s,img.height*s);return;}
 const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2a2622');g.addColorStop(1,'#14120f');x.fillStyle=g;x.fillRect(0,0,W,H);
 x.globalAlpha=.08;x.strokeStyle='#d8c8a8';x.lineWidth=2;for(let yy=0;yy<H;yy+=26){x.beginPath();x.moveTo(0,yy);for(let xx=0;xx<=W;xx+=40)x.lineTo(xx,yy+Math.sin(xx*.02+yy)*4);x.stroke();}x.globalAlpha=1;}
function drawLogo(x,cx,cy,w){const img=picture('logo');if(img){const h=w*img.height/img.width;x.drawImage(img,cx-w/2,cy-h/2,w,h);return h;}
 x.save();x.textAlign='center';x.textBaseline='middle';const fs=w*.12;x.font=`900 ${fs}px "SC Bangers","SC Nunito",sans-serif`;x.lineWidth=fs*.12;x.strokeStyle='#0d1114';x.strokeText('STRANDS & LADDERS',cx,cy);x.fillStyle='#e8e2d0';x.fillText('STRANDS & LADDERS',cx,cy);
 x.font=`800 ${fs*.32}px "SC Nunito",sans-serif`;x.fillStyle='#c9a24a';x.fillText('A DEATH STRANDING BOARD GAME · AGES 4 AND UP',cx,cy+fs*.75);x.restore();return fs*1.3;}
Object.assign(exports,{drawBoardBase,drawBoard,drawLadder,drawChute,drawVignette,drawSpinner,drawPawn,drawCard,drawTable,drawLogo,ICON});
