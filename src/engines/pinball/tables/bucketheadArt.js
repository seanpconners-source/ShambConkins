// Bucketheadland playfield art, drawn in table millimetres. A night-time theme park (Ferris wheel, coaster lattice,
// circus stripes) with Buckethead himself (white mask, striped bucket) between the slingshots.
const {seededRandom}=require("src/utils.js");
const TAU=Math.PI*2;
function playfieldPath(x){x.beginPath();x.moveTo(12,1067);x.lineTo(12,256);x.arc(256,256,244,Math.PI,TAU);x.lineTo(500,1067);x.closePath();}
// Buckethead: striped bucket over a blank white mask (s = size in mm, centred on cx,cy = top of the mask).
function buckethead(x,cx,cy,s,o={}){
 x.save();x.translate(cx,cy);x.scale(s/100,s/100);
 // hair/hood shadow
 x.fillStyle='#120a10';x.beginPath();x.ellipse(0,40,44,52,0,0,TAU);x.fill();
 // mask
 const g=x.createLinearGradient(-30,0,30,90);g.addColorStop(0,'#fbfaf5');g.addColorStop(1,'#bdb8ad');x.fillStyle=g;x.beginPath();x.moveTo(-30,4);x.quadraticCurveTo(-34,62,0,92);x.quadraticCurveTo(34,62,30,4);x.closePath();x.fill();
 x.fillStyle='#1b1418';x.beginPath();x.ellipse(-12,34,7,4.5,.1,0,TAU);x.fill();x.beginPath();x.ellipse(12,34,7,4.5,-.1,0,TAU);x.fill();
 x.strokeStyle='rgba(60,50,50,.5)';x.lineWidth=1.5;x.beginPath();x.moveTo(-6,66);x.lineTo(6,66);x.stroke();
 // bucket (tapered, red/white stripes, FUNERAL sticker)
 x.save();x.beginPath();x.moveTo(-40,8);x.lineTo(-32,-58);x.lineTo(32,-58);x.lineTo(40,8);x.closePath();x.clip();
 for(let i=-6;i<6;i++){x.fillStyle=i%2?'#f5f2ea':'#c8102e';x.beginPath();x.moveTo(i*8,8);x.lineTo(i*6.4,-58);x.lineTo((i+1)*6.4,-58);x.lineTo((i+1)*8,8);x.fill();}
 x.restore();
 x.fillStyle='#f5f2ea';x.fillRect(-36,-64,72,8);x.fillStyle='#e8e2d4';x.fillRect(-42,2,84,8);
 x.fillStyle='#fff';x.fillRect(-20,-34,40,13);x.strokeStyle='#111';x.lineWidth=1;x.strokeRect(-20,-34,40,13);x.fillStyle='#111';x.font='bold 9px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText('FUNERAL',0,-27);
 x.restore();
}
function ferris(x,cx,cy,r,a){x.save();x.globalAlpha=a;x.strokeStyle='#ff9ecf';x.lineWidth=2;x.beginPath();x.arc(cx,cy,r,0,TAU);x.stroke();x.beginPath();x.arc(cx,cy,r*.7,0,TAU);x.stroke();
 for(let i=0;i<16;i++){const t=i/16*TAU;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(t)*r,cy+Math.sin(t)*r);x.stroke();x.fillStyle=i%2?'#ffd23f':'#64d2ff';x.fillRect(cx+Math.cos(t)*r-4,cy+Math.sin(t)*r-3,8,7);}
 x.beginPath();x.moveTo(cx,cy);x.lineTo(cx-r*.6,cy+r*1.25);x.moveTo(cx,cy);x.lineTo(cx+r*.6,cy+r*1.25);x.stroke();x.restore();}
function coaster(x,a){x.save();x.globalAlpha=a;x.strokeStyle='#7cd7ff';x.lineWidth=2.5;x.beginPath();x.moveTo(14,760);x.bezierCurveTo(60,520,120,640,170,420);x.bezierCurveTo(190,330,220,360,230,300);x.stroke();
 x.lineWidth=1;for(let i=0;i<=24;i++){const t=i/24,px=(1-t)**3*14+3*(1-t)**2*t*60+3*(1-t)*t*t*120+t**3*170,py=(1-t)**3*760+3*(1-t)**2*t*520+3*(1-t)*t*t*640+t**3*420;x.beginPath();x.moveTo(px,py);x.lineTo(px,800);x.stroke();if(i%2){x.beginPath();x.moveTo(px,py+20);x.lineTo(px+18,800);x.stroke();}}x.restore();}

const art={
 plastic:'#ffbf3f',sling:'#c8102e',drop:'#ffb703',flipper:'#f7f4ec',flipperRubber:'#c8102e',
 base(x,def){
  x.fillStyle='#1d120c';x.fillRect(0,0,def.W,def.H);
  x.save();playfieldPath(x);x.clip();
  const g=x.createLinearGradient(0,0,0,def.H);g.addColorStop(0,'#0e0420');g.addColorStop(.45,'#2a0b3d');g.addColorStop(.8,'#4a0c27');g.addColorStop(1,'#260611');x.fillStyle=g;x.fillRect(0,0,def.W,def.H);
  const r=seededRandom(77);for(let i=0;i<140;i++){x.fillStyle=`rgba(255,255,255,${.15+r()*.5})`;x.fillRect(r()*def.W,r()*520,1.2,1.2);}
  // moon
  x.fillStyle='rgba(255,244,214,.18)';x.beginPath();x.arc(120,150,42,0,TAU);x.fill();
  ferris(x,330,400,118,.22);coaster(x,.25);
  // circus big-top stripes behind the bonus ladder
  x.save();x.globalAlpha=.16;for(let i=0;i<14;i++){x.fillStyle=i%2?'#ffffff':'#ff2d55';x.beginPath();x.moveTo(236,560);x.lineTo(40+i*30,800);x.lineTo(70+i*30,800);x.closePath();x.fill();}x.restore();
  // straw floor under the coop bumpers
  const sg=x.createRadialGradient(241,240,10,241,240,120);sg.addColorStop(0,'rgba(255,214,102,.35)');sg.addColorStop(1,'rgba(255,214,102,0)');x.fillStyle=sg;x.beginPath();x.arc(241,240,120,0,TAU);x.fill();
  x.fillStyle='rgba(255,230,160,.6)';x.font='bold 9px Georgia';x.textAlign='center';x.fillText('CHICKEN COOP',241,170);
  x.fillStyle='rgba(255,255,255,.75)';x.font='bold 8px Arial';x.fillText('THE COOP',236,393);
  // logo
  x.save();x.translate(236,700+330);const word='BUCKETHEADLAND';x.font='bold 21px Georgia';x.textBaseline='middle';x.textAlign='center';
  for(let i=0;i<word.length;i++){const a=(i-(word.length-1)/2)*.05;x.save();x.rotate(a);x.lineWidth=4;x.strokeStyle='#1a0610';x.strokeText(word[i],0,-330);x.fillStyle=i%2?'#ffd23f':'#ff6b35';x.fillText(word[i],0,-330);x.restore();}
  x.restore();
  // lane arrows
  x.fillStyle='rgba(255,255,255,.08)';for(const [ax,ay] of [[72,700],[400,700]]){x.beginPath();x.moveTo(ax,ay+30);x.lineTo(ax-10,ay);x.lineTo(ax+10,ay);x.fill();}
  buckethead(x,236,812,70);
  x.fillStyle='rgba(255,255,255,.55)';x.font='bold 7px Arial';x.fillText('WELCOME TO THE PARK',236,892-20);
  x.restore();
 },
 over(x,def){
  // Apron: drained balls disappear under it.
  x.save();x.beginPath();x.moveTo(12,880);x.lineTo(110,976);x.lineTo(168,1004);x.lineTo(304,1004);x.lineTo(362,976);x.lineTo(460,880);x.lineTo(460,1067);x.lineTo(12,1067);x.closePath();
  const g=x.createLinearGradient(0,970,0,1067);g.addColorStop(0,'#3b3f4a');g.addColorStop(1,'#15171c');x.fillStyle=g;x.fill();x.strokeStyle='#9aa1ad';x.lineWidth=2;x.stroke();
  x.fillStyle='#f4efe2';x.fillRect(40,1012,112,40);x.fillRect(320,1012,112,40);x.fillStyle='#1a1a1a';x.font='bold 7px Arial';x.textAlign='center';
  x.fillText('BUCKETHEADLAND',96,1022);x.font='6px Arial';x.fillText('3 BALLS PER GAME',96,1032);x.fillText('LOCK 3 FOR JORDAN',96,1041);
  x.font='bold 7px Arial';x.fillText('SPELL B-U-C-K-E-T',376,1022);x.font='6px Arial';x.fillText('LIGHTS EXTRA BALL',376,1032);x.fillText('AT THE HAUNTED RIDE',376,1041);
  x.fillStyle='#ffd23f';x.font='bold 9px Georgia';x.fillText('BUCKETHEAD',236,1030);x.restore();
  // shooter housing
  x.fillStyle='#24262c';x.fillRect(460,1050,40,17);
 },
 bumperCap(x,p,r,lit){
  // top view of a striped bucket
  x.save();x.translate(p.x,p.y);for(let i=0;i<12;i++){x.fillStyle=i%2?(lit?'#ffffff':'#ece6d8'):(lit?'#ff3355':'#c8102e');x.beginPath();x.moveTo(0,0);x.arc(0,0,r*.86,i/12*TAU,(i+1)/12*TAU);x.closePath();x.fill();}
  x.fillStyle=lit?'#fffbe0':'#f5f2ea';x.beginPath();x.arc(0,0,r*.42,0,TAU);x.fill();x.fillStyle='#1a1a1a';x.font='bold 9px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText('BH',0,.5);x.restore();
 },
 slingArt(x,p){x.save();x.fillStyle='rgba(255,255,255,.5)';const [ax,ay]=p.a,[bx,by]=p.b,[cx,cy]=p.c;x.beginPath();x.moveTo((ax*2+bx+cx)/4,(ay*2+by+cy)/4);x.lineTo((ax+bx*2+cx)/4,(ay+by*2+cy)/4);x.lineTo((ax+bx+cx*2)/4,(ay+by+cy*2)/4);x.closePath();x.fill();x.restore();},
 backbox(x,W,H,dx,dw,t){
  const side=dx-8;const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2a0b3d');g.addColorStop(1,'#4a0c27');x.fillStyle=g;x.fillRect(0,0,W,H);
  if(side<70){for(let i=0;i<8;i++){const on=(Math.floor(t*6)+i)%3===0;x.fillStyle=on?'#ffd23f':'#5a3a12';x.beginPath();x.arc(dx+dw+16+i*((W-dx-dw-30)/7),H-6,2,0,TAU);x.fill();}return;}
  x.save();x.textAlign='center';x.textBaseline='middle';x.font=`bold ${Math.min(26,H*.32,side/7)}px Georgia`;x.lineWidth=4;x.strokeStyle='#1a0610';x.fillStyle='#ffd23f';
  x.strokeText('BUCKETHEADLAND',(dx-6)/2,H/2);x.fillText('BUCKETHEADLAND',(dx-6)/2,H/2);x.restore();
  const cx=dx+dw+6+(W-dx-dw-6)/2;buckethead(x,cx,H*.42,H*.62);
  for(let i=0;i<12;i++){const on=(Math.floor(t*6)+i)%3===0;x.fillStyle=on?'#ffd23f':'#5a3a12';x.beginPath();x.arc(8+i*((dx-22)/11),H-5,2,0,TAU);x.fill();}
 },
};
Object.assign(exports,{art,buckethead});
