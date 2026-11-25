// THE PRICE IS RIGHT STUDIO AUDIENCE, built like the real show (owner, Nov 25, with GPT's reference picture: "big red aisle, more
// audience members... exactly like the real show, I just want it to be our people instead"). Seen from the stage: the red-carpet
// aisle with its steps runs up the middle, rows of gold theater seats rise left and right of it, coloured curtains and studio
// lights at the top, chrome rails and a ledge in front of the front row. Every seat holds one of our people: a show-audience body
// (GPT sheets cr-fan-1..8: standing AND seated poses) with the face of a random character from the game. Front rows sit; when a
// name is called (hype) the rest of the house jumps up cheering, fist-pumping, waving, pointing. Very rarely (CAMEO_MAX, a few
// rows from the front) someone wears a body from one of our other games (Warriors, Seanic, horde, Sean of a Gun, Castlevania,
// Sundown, NES Mario): CAMEOS, one small adapter per game, only sheets that are in the build.
// LAYOUT (layout(shape)): one per screen shape in design px = the cr-audience(-tall/-fold) picture's pixels, so GPT paints the empty
// studio with its seats exactly where the game seats people (the templates mark every seat). Layers per frame: the empty studio
// (picture or drawn), then from the back row to the front: that row's seats (cr-seat picture per seat, covers the legs of the row
// behind), its people; then the front rail + ledge (cr-audience-front). Rows from CACHE_FROM back are drawn into one cached
// canvas ~8 times a second (hundreds of people), the front rows live every frame.
const SS=require("src/data/showSprites.js");
const ST=require("src/engines/gameshow/stage.js");
const {seededRandom}=require("src/utils.js");
const {faceSprite,headFacts,faceGeom}=require("src/headFacts.js");
const TAU=Math.PI*2;
const CAMEO_RATE=.008,CAMEO_MAX=2,FILL=.96;
const SHIRTS=['#e63946','#3a86ff','#ffbe0b','#8338ec','#06d6a0','#fb5607','#ff006e','#4cc9f0','#80b918','#f15bb5','#f4f1de','#e9c46a'];
const NAMES=['DEB','RAY','TINA','HANK','JOY','CARL','PAM','BOB','KAY','LOU','SUE','DON','BEA','MO','VAL','ED','IDA','GIL','NAN','AL'];
// ---- the studio layout per screen shape
const DESIGN={wide:[1920,1080],tall:[1080,1920],fold:[1504,1670]};
// front = floor line of the front row, top = floor line of the back row (fractions of H); h0 = front person height (fraction of H,
// or of W when hW); a0/a1 = half the aisle width at the front / back (fractions of W); k = perspective step per row
const LAY={wide:{front:.83,top:.21,rows:13,h0:.44,hW:false,a0:.1,a1:.028,k:.3},
 tall:{front:.86,top:.17,rows:17,h0:.62,hW:true,a0:.15,a1:.04,k:.24},
 fold:{front:.85,top:.19,rows:15,h0:.5,hW:true,a0:.125,a1:.035,k:.27}};
const SEATED_ROWS=2,SEAT_W=.36,SEAT_H=.45,CACHE_FROM={wide:4,tall:5,fold:5};
const shapeOf=(W,H)=>require("src/bgShape.js").shape(W,H);
// GPT's empty studio pictures (cr-audience, -tall, -fold), measured by tools/gameshow/studio-seats.py: per row, front first:
// [seat-back top y, seat pitch, seat centre x's, aisle [left,right]] in picture px (= DESIGN px). With the picture in, people sit
// in those seats and each row's seat backs (cr-seats*: the picture with the dark gaps see-through) are drawn over the row behind
const STUDIO=/*@@STUDIO*/{"wide":[[655,174.0,[-49,125,299,473,647,1317,1491,1665,1839],[728,1212]],[559,133.0,[-30,102,236,368,502,634,1194,1326,1460,1592,1726,1858],[774,1151]],[476,108.5,[49,157,266,374,483,591,700,1177,1286,1394,1503,1611,1720,1828],[813,1100]],[412,106.0,[-21,85,191,297,403,509,615,721,1144,1250,1356,1462,1568,1674,1780,1886],[825,1085]],[357,95.5,[39,135,230,326,421,517,612,708,803,1124,1220,1315,1411,1506,1602,1697,1793,1888],[835,1073]],[310,88.0,[-22,66,154,242,330,418,506,594,682,770,1104,1192,1280,1368,1456,1544,1632,1720,1808,1896],[843,1062]],[270,79.0,[30,108,188,266,346,424,504,582,662,740,820,1092,1172,1250,1330,1408,1488,1566,1646,1724,1804,1882],[851,1054]],[236,69.5,[0,70,139,209,278,348,417,487,556,626,695,765,834,1081,1151,1220,1290,1359,1429,1498,1568,1637,1707,1776,1846,1915],[857,1046]],[206,64.5,[3,67,132,196,261,325,390,454,519,583,648,712,777,841,1098,1163,1227,1292,1356,1421,1485,1550,1614,1679,1743,1808,1872],[862,1039]],[182,60.0,[-6,54,114,174,234,294,354,414,474,534,594,654,714,774,834,1091,1151,1211,1271,1331,1391,1451,1511,1571,1631,1691,1751,1811,1871],[866,1034]]],"tall":[[1291,220.0,[118,1035],[232,925]],[1137,172.5,[25,197,944,1117],[273,880]],[1007,147.5,[-41,107,254,851,999],[324,802]],[893,135.5,[18,154,289,788,924,1059],[361,728]],[806,125.0,[68,194,318,748,874,998],[383,688]],[732,113.5,[-9,105,218,332,722,836,949,1063],[395,670]],[669,109.0,[26,134,244,352,696,804,914,1022],[405,654]],[615,97.5,[-44,54,151,249,346,684,781,879,976,1074],[414,641]],[559,91.5,[4,96,187,279,370,667,758,850,941,1033],[423,628]],[513,85.5,[39,125,210,296,381,650,736,821,907,992,1078],[430,616]],[467,79.0,[-4,74,154,232,312,390,638,716,796,874,954,1032],[437,605]],[426,75.5,[22,98,173,249,324,400,617,693,768,844,919,995,1070],[444,596]],[387,68.0,[0,68,136,204,272,340,408,615,683,751,819,887,955,1023],[450,586]],[352,65.5,[22,88,153,219,284,350,415,611,676,742,807,873,938,1004,1069],[456,578]],[321,60.0,[2,62,122,182,242,302,362,422,593,653,713,773,833,893,953,1013,1073],[461,570]],[295,55.0,[-12,44,98,154,208,264,318,374,428,590,644,700,754,810,864,920,974,1030],[465,564]],[272,56.5,[6,62,119,175,232,288,345,401,614,671,727,784,840,897,953,1010,1066],[469,558]]],"fold":[[1087,244.5,[-60,184,1353],[305,1245]],[953,203.0,[-6,198,390,1088,1298,1500],[410,1074]],[793,170.5,[-75,95,266,436,1031,1201,1372],[501,945]],[698,154.0,[15,169,323,477,989,1143,1297,1451],[531,918]],[615,141.5,[-54,88,229,371,512,946,1087,1229,1370],[556,891]],[550,128.5,[-5,123,252,380,509,926,1055,1183,1312,1440],[577,869]],[490,110.5,[0,110,221,331,442,552,888,998,1109,1219,1330,1440],[594,850]],[440,105.0,[-38,66,172,276,382,486,862,968,1072,1178,1282,1388,1492],[610,834]],[400,99.5,[-2,98,197,297,396,496,595,873,972,1072,1171,1271,1370,1470],[622,820]],[362,94.0,[36,130,224,318,412,506,600,862,956,1050,1144,1238,1332,1426],[633,808]],[330,88.5,[6,94,183,271,360,448,537,899,987,1076,1164,1253,1341,1430],[643,798]],[300,84.5,[37,121,206,290,375,459,544,628,866,950,1035,1119,1204,1288,1373,1457],[652,789]]]};
const SUFFIX={wide:'',tall:'-tall',fold:'-fold'},studioOn=shape=>!!SS.picture('cr-audience'+SUFFIX[shape]);
// a person stands on the floor 1.4 seat pitches below their seat-back top and is 3 pitches tall
const FLOOR_K=1.4,TALL_K=3;
const geoCache={};
function layout(shape){const sk=shape+(studioOn(shape)?':s':'');if(geoCache[sk])return geoCache[sk];
 if(studioOn(shape)){const [W,H]=DESIGN[shape],rows=STUDIO[shape].map(([tp,pt,s,a],r)=>({r,t:tp,y:Math.round(tp+pt*FLOOR_K),h:Math.round(pt*TALL_K),a:(a[1]-a[0])/2,ax:(a[0]+a[1])/2,sw:pt,seats:s,seated:false,band:[tp+pt*.03,tp+pt*FLOOR_K]}));
  const f=rows[0];return geoCache[sk]={shape,W,H,rows,studio:true,front:{y:f.y,h:f.h,a:f.a,rail:Math.round(f.y-f.h*.3)}};}const [W,H]=DESIGN[shape],L=LAY[shape],sl=1/(1+L.k*(L.rows-1)),rows=[];
 for(let r=0;r<L.rows;r++){const s=1/(1+L.k*r),q=(1-s)/(1-sl),y=H*(L.front-(L.front-L.top)*q),h=(L.hW?W:H)*L.h0*s,a=W*(L.a0-(L.a0-L.a1)*q),sw=h*SEAT_W,seats=[];
  for(const side of [-1,1])for(let x=W/2+side*(a+sw*.55);side<0?x>-sw*.5:x<W+sw*.5;x+=side*sw)seats.push(Math.round(x));
  seats.sort((p,q2)=>p-q2);rows.push({r,y:Math.round(y),h:Math.round(h),a:Math.round(a),sw,seats,seated:r<SEATED_ROWS});}
 const f=rows[0];return geoCache[sk]={shape,W,H,rows,front:{y:f.y,h:f.h,a:f.a,rail:Math.round(f.y-f.h*.3)}};}
// design px -> screen px: cover the screen (cropping the sides or, when the screen is wider, mostly the curtains at the top)
function view(G,W,H){const c=Math.max(W/G.W,H/G.H);return {c,ox:(W-G.W*c)/2,oy:(H-G.H*c)*.7};}
// ---- the drawn stand-ins (until the GPT pictures are in); everything in design px
// FACE_DROP: the face sits this much (of the standing height) below the sheet's face spot on the photo bodies (owner: a bit lower)
const FACE_AT=.865,FACE_SIT=.635,FACE_W=.14,FACE_W_PHOTO=.115,FACE_DROP=.032;
// a drawn stand-in audience member (until the cr-fan pictures come): feet at (fx,fy), standing height h; pose from CR_FAN's list
// (+ run/sad for contestants). look = {skin, pants, print (0 plain, 1 heart, 2 big price tag)}: real clothes shapes (shoulders,
// sleeves, bare forearms, hands), a darker side for depth, so a packed house reads as people, not blocks
const SKINS=['#f1c7a3','#e0ac85','#c68863','#8d5a3c','#f6d5bd','#a96f4c','#5e3a26'],PANTS=['#2b3550','#3b3f46','#1f2a44','#5a4632','#33415c','#4a4e57'];
function shade(col,k){const n=parseInt(col.slice(1),16),f=c=>Math.max(0,Math.min(255,Math.round(c*k)));return `rgb(${f(n>>16)},${f(n>>8&255)},${f(n&255)})`;}
function arm(g,u,sx,sy,ex,ey,hx,hy,col,skin){g.strokeStyle=skin;g.lineWidth=4.6*u;g.beginPath();g.moveTo(ex*u,ey*u);g.lineTo(hx*u,hy*u);g.stroke();
 g.strokeStyle=col;g.lineWidth=6.6*u;g.beginPath();g.moveTo(sx*u,sy*u);g.lineTo((sx+(ex-sx)*.62)*u,(sy+(ey-sy)*.62)*u);g.stroke();
 g.fillStyle=skin;g.beginPath();g.arc(hx*u,hy*u,3.1*u,0,TAU);g.fill();}
function drawnBody(g,col,fx,fy,h,pose,t,look){const u=h/100,run=pose==='run',ph=t*11,sit=pose.startsWith('sit'),L=look||{},skin=L.skin||SKINS[0],pants=L.pants||PANTS[0],dark=shade(col,.72);
 g.save();g.translate(fx,fy);g.lineCap='round';g.lineJoin='round';const sw=run?Math.sin(ph)*.6:0,wave=Math.sin(t*12)*.35;
 // S = shoulder line, W = waist line (standing / seated)
 const S=sit?-56:-74,W=sit?-34:-46;
 if(sit){// shins and knees toward us, thighs on the seat
  g.strokeStyle=pants;g.lineWidth=7.5*u;g.beginPath();g.moveTo(-6.5*u,-3*u);g.lineTo(-7*u,-25*u);g.moveTo(6.5*u,-3*u);g.lineTo(7*u,-25*u);g.stroke();
  g.fillStyle=pants;g.beginPath();g.roundRect(-14*u,-35*u,28*u,12*u,5*u);g.fill();g.fillStyle='rgba(0,0,0,.25)';g.fillRect(-14*u,-25*u,28*u,2*u);
  g.fillStyle='#14120f';g.beginPath();g.ellipse(-6.5*u,-2*u,5*u,2.6*u,0,0,TAU);g.ellipse(6.5*u,-2*u,5*u,2.6*u,0,0,TAU);g.fill();}
 else{const l=-4+sw*14,r=4-sw*14;g.strokeStyle=pants;g.lineWidth=7.5*u;g.beginPath();g.moveTo(-4.5*u,(W+1)*u);g.lineTo(l*u,-3*u);g.moveTo(4.5*u,(W+1)*u);g.lineTo(r*u,-3*u);g.stroke();
  g.fillStyle=pants;g.beginPath();g.roundRect(-10.5*u,(W-2)*u,21*u,9*u,3*u);g.fill();
  g.fillStyle='#14120f';g.beginPath();g.ellipse(l*u+1.5*u,-2*u,5.4*u,2.6*u,0,0,TAU);g.ellipse(r*u+1.5*u,-2*u,5.4*u,2.6*u,0,0,TAU);g.fill();}
 // arms behind the body first when they hang down (they read as at the sides); raised arms are drawn after, over the shirt
 const A=(sx,dir)=>{// elbow + hand for one side (dir -1 left, +1 right) in body units from the shoulder line
  const d=dir;if(pose==='wave'&&d>0)return [20,S-8,26+wave*8,S-22];if(pose==='point'&&d>0)return [24,S,36,S-6];
  if(pose==='jump'||pose==='cheer'||pose==='cheer1'||pose==='cheer2'||pose==='sitcheer'){const k=pose==='cheer1'?-4:0;return [d*19,S-10+k,d*(22-wave*6),S-23+k];}
  if(pose.includes('clap')){const c=Math.abs(Math.sin(t*9))*5;return [d*15,S+14,d*(c+2.5),S+10];}
  if(run)return [d*(16-d*sw*6),S+12,d*(14-d*sw*14),S+24];
  if(sit)return [d*15,S+14,d*10,S+23];
  return [d*15,S+14,d*14.5,S+27];};
 const arms=[-1,1].map(d=>{const [ex,ey,hx,hy]=A(0,d);return {d,ex,ey,hx,hy,up:hy<S};});
 for(const a of arms)if(!a.up&&!(pose.includes('clap')))arm(g,u,a.d*11.5,S+3,a.ex,a.ey,a.hx,a.hy,col,skin);
 // neck, then the shirt: shoulders wider than the waist, rounded; a darker right side and a collar
 g.fillStyle=skin;g.fillRect(-3.4*u,(S-8)*u,6.8*u,10*u);
 g.fillStyle=col;g.beginPath();g.moveTo(-13*u,(S+5)*u);g.quadraticCurveTo(-14*u,S*u,-8*u,(S-1)*u);g.lineTo(8*u,(S-1)*u);g.quadraticCurveTo(14*u,S*u,13*u,(S+5)*u);
 g.lineTo(11*u,(W+1)*u);g.lineTo(-11*u,(W+1)*u);g.closePath();g.fill();
 g.fillStyle=dark;g.beginPath();g.moveTo(6*u,(S-1)*u);g.lineTo(8*u,(S-1)*u);g.quadraticCurveTo(14*u,S*u,13*u,(S+5)*u);g.lineTo(11*u,(W+1)*u);g.lineTo(5*u,(W+1)*u);g.closePath();g.fill();
 g.strokeStyle=dark;g.lineWidth=1.6*u;g.beginPath();g.arc(0,(S-1.5)*u,4.2*u,.15*Math.PI,.85*Math.PI);g.stroke();
 if(L.print===1&&h>34){const y=(S+(W-S)*.42)*u,r=3.2*u;g.fillStyle=col==='#e63946'||col==='#ff006e'?'#fff':'#e63946';g.beginPath();g.moveTo(0,y+r*1.1);g.bezierCurveTo(-r*2.1,y-r*.2,-r*.9,y-r*1.6,0,y-r*.45);g.bezierCurveTo(r*.9,y-r*1.6,r*2.1,y-r*.2,0,y+r*1.1);g.fill();}
 else if(L.print===2&&h>34){const y=(S+(W-S)*.4)*u;g.fillStyle='#fff';g.beginPath();g.roundRect(-6.5*u,y-3.2*u,13*u,6.4*u,1.5*u);g.fill();g.fillStyle='#e63946';g.fillRect(-4.5*u,y-1.2*u,9*u,2.4*u);}
 for(const a of arms)if(a.up||pose.includes('clap'))arm(g,u,a.d*11.5,S+3,a.ex,a.ey,a.hx,a.hy,col,skin);
 g.restore();}
// one theater seat (front view: gold upholstered back + cushion, arm rests), floor at (x,y), sw = seat pitch
function drawSeat(g,x,y,sw){const pic=SS.picture('cr-seat'),SG=SS.CR_SEAT;if(pic){const k=sw/SG.w*1.0;g.drawImage(pic,x-SG.floor[0]*k,y-SG.floor[1]*k,SG.w*k,SG.h*k);return;}
 const h=sw/SEAT_W,bw=sw*.86,top=y-h*SEAT_H;g.fillStyle='#3a2a1a';g.fillRect(x-bw*.42,y-h*.08,bw*.84,h*.08);
 const gr=g.createLinearGradient(0,top,0,y-h*.12);gr.addColorStop(0,'#e2b85a');gr.addColorStop(1,'#a8782a');g.fillStyle=gr;g.beginPath();g.roundRect(x-bw/2,top,bw,h*.3,bw*.18);g.fill();
 g.fillStyle='#c4943e';g.beginPath();g.roundRect(x-bw*.48,y-h*.2,bw*.96,h*.09,bw*.1);g.fill();g.fillStyle='#4a3a2a';g.fillRect(x-sw*.5,y-h*.24,sw*.07,h*.16);}
function drawSeatRow(g,G,row){for(const x of row.seats)drawSeat(g,x,row.y,row.sw);}
// the empty studio (drawn): curtains + lights, dark house, the red aisle with its steps and rails, the seats, the ledge and carpet
function drawnStudio(g,G,{seats=true}={}){const {W,H,rows}=G,back=rows[rows.length-1],cy=Math.max(H*.06,back.y-back.h*1.05);
 g.fillStyle='#1c1018';g.fillRect(0,0,W,H);
 const cols=['#e0601c','#2a5ad0','#d83a8a','#f0b020','#3aa83a','#2a5ad0','#d83a8a','#e0601c','#f0b020','#2a5ad0','#3aa83a','#d83a8a','#e0601c','#2a5ad0','#f0b020','#d83a8a'];
 const n=cols.length,pw=W/n;for(let i=0;i<n;i++){const gr=g.createLinearGradient(i*pw,0,(i+1)*pw,0);gr.addColorStop(0,cols[i]);gr.addColorStop(.5,'#ffffff22');gr.addColorStop(1,cols[i]);
  g.fillStyle=cols[i];g.fillRect(i*pw,0,pw+1,cy+back.h*.5);g.fillStyle=gr;g.globalAlpha=.35;g.fillRect(i*pw,0,pw+1,cy+back.h*.5);g.globalAlpha=1;
  for(let f=0;f<3;f++){g.fillStyle='rgba(0,0,0,.18)';g.fillRect(i*pw+pw*(f+.5)/3,0,pw*.06,cy+back.h*.5);}}
 g.fillStyle='#0c0a0c';g.fillRect(0,0,W,H*.035);for(let i=0;i<8;i++){const x=W*(i+.5)/8;g.fillStyle='#f8f4e8';g.fillRect(x-W*.022,H*.008,W*.044,H*.03);const lg=g.createRadialGradient(x,H*.03,0,x,H*.03,H*.25);lg.addColorStop(0,'rgba(255,248,220,.25)');lg.addColorStop(1,'rgba(255,248,220,0)');g.fillStyle=lg;g.fillRect(x-H*.25,0,H*.5,H*.3);}
 // the house below the curtains
 const hg=g.createLinearGradient(0,cy,0,G.front.y);hg.addColorStop(0,'#2a1a1e');hg.addColorStop(1,'#3a2420');g.fillStyle=hg;g.fillRect(0,cy+back.h*.5,W,G.front.y-cy);
 // the aisle: red carpet trapezoid with a step at every row, chrome rails along both sides
 const f=G.front;g.fillStyle='#a8141c';g.beginPath();g.moveTo(W/2-back.a,back.y-back.h*.25);g.lineTo(W/2+back.a,back.y-back.h*.25);g.lineTo(W/2+f.a*1.15,H);g.lineTo(W/2-f.a*1.15,H);g.closePath();g.fill();
 for(const r of rows){g.fillStyle='rgba(0,0,0,.28)';g.fillRect(W/2-r.a,r.y,r.a*2,Math.max(1,r.h*.018));g.fillStyle='rgba(255,90,90,.25)';g.fillRect(W/2-r.a,r.y-r.h*.02,r.a*2,Math.max(1,r.h*.012));}
 for(const s of [-1,1]){g.strokeStyle='#d8dce4';g.lineWidth=Math.max(1.5,f.h*.008);g.beginPath();g.moveTo(W/2+s*back.a,back.y-back.h*.45);
  for(const r of rows.slice().reverse())g.lineTo(W/2+s*r.a,r.y-r.h*.3);g.lineTo(W/2+s*f.a*1.05,f.rail);g.stroke();}
 if(seats)for(let i=rows.length-1;i>=0;i--)drawSeatRow(g,G,rows[i]);
 // the floor in front of the ledge: the same red carpet
 g.fillStyle='#b01820';g.fillRect(0,f.y+H*.05,W,H);}
// the front rail and ledge (drawn over the front row): chrome rails left and right of the aisle, posts, the grey ledge wall
function drawnFront(g,G){const {W,H}=G,f=G.front,lh=H*.055;
 for(const s of [-1,1]){const x0=s<0?-10:W/2+f.a*1.05,x1=s<0?W/2-f.a*1.05:W+10;g.fillStyle='#8a8e96';g.fillRect(x0,f.y,x1-x0,lh);g.fillStyle='rgba(255,255,255,.25)';g.fillRect(x0,f.y,x1-x0,lh*.12);
  g.strokeStyle='#e8ecf2';g.lineWidth=Math.max(2,f.h*.022);g.beginPath();g.moveTo(x0,f.rail);g.lineTo(x1,f.rail);g.stroke();
  for(let x=s<0?x1:x0;s<0?x>x0:x<x1;x+=s*f.h*.75){g.lineWidth=Math.max(1.5,f.h*.016);g.beginPath();g.moveTo(x,f.rail);g.lineTo(x,f.y+lh*.4);g.stroke();}}}
// ---- bodies from our other games (cameos): each returns {img,sx,sy,sw,sh,fx,fy,face:{x,y,w,rot,chin},tall} in source px, or null
// face: either the face's middle (x,y) or, with chin:true, the chin spot (the neck) the face sits on
const CAMEOS={
 warriors:{sheets:()=>{const H=req("src/data/ddHeads.js")?.HEADS||{},DS=req("src/data/ddSprites.js");return Object.keys(H).filter(n=>DS&&DS.SHEETS[n]&&H[n].stand);},
  load:n=>req("src/data/ddSprites.js")?.picture(n),
  frame(n,hype,t,ph){const DS=req("src/data/ddSprites.js"),H=req("src/data/ddHeads.js").HEADS[n],img=DS.picture(n);if(!img)return null;
   const pose=hype>.3&&H.win&&Math.sin(t*3+ph)>-.2?'win':'stand',c=DS.cellOf(n,pose)||DS.cellOf(n,'stand'),hd=H[pose]||H.stand,ft=DS.footOf(pose);
   return {img,sx:c.sx,sy:c.sy,sw:DS.CELL,sh:DS.CELL,fx:ft[0],fy:ft[1],face:{x:hd[0],y:hd[1],w:30*hd[3],rot:hd[2]*Math.PI/180,behind:!!hd[4]},tall:ft[1]-(hd[1]-30*hd[3]*.95)};}},
 seanic:{sheets:()=>['runner-p1','runner-p2','runner-p3','runner-p4'],load:n=>req("src/data/sonic3Sprites.js")?.picture(n),
  frame(n,hype,t,ph){const S3=req("src/data/sonic3Sprites.js"),sh=S3.sheet(n);if(!sh)return null;const row=hype>.3?'win':'stand',f=row==='win'?Math.floor(t*6+ph)%4:0;
   const r=S3.frameRect(n,row,f),sp=S3.spot(n,row,f),d=sh.def;if(!r||!sp||sp.hide)return null;const k=sh.res,fw=d.headSize*.8;
   return {img:sh.img,sx:r[0]*k,sy:r[1]*k,sw:r[2]*k,sh:r[3]*k,fx:d.foot[0]*k,fy:d.foot[1]*k,face:{x:sp.x*k,y:sp.y*k,w:fw*k,rot:sp.rot||0},tall:(d.foot[1]-(sp.y-fw*.9))*k};}},
 horde:{sheets:()=>['survivor-p1','survivor-p2'],load:n=>req("src/data/hordeSprites.js")?.picture(n),
  frame(n,hype,t,ph){const HS=req("src/data/hordeSprites.js"),sh=HS.sheet(n);if(!sh)return null;const row='idle',f=Math.floor(t*(hype>.3?8:3)+ph);
   const r=HS.frameRect(sh,row,f),nk=HS.neckAt(sh.def,row,r?f:0)||[sh.def.foot[0],sh.def.foot[1]*.62],k=sh.k,fw=24;
   return {img:sh.img,sx:r.sx,sy:r.sy,sw:r.sw,sh:r.sh,fx:sh.def.foot[0]*k,fy:sh.def.foot[1]*k,face:{x:nk[0]*k,y:nk[1]*k,w:fw*k,chin:true},tall:(sh.def.foot[1]-nk[1]+fw*1.25)*k};}},
 seanofagun:{sheets:()=>['bro-body'],load:n=>req("src/data/broforceSprites.js")?.picture(n),
  frame(n,hype,t,ph){const BS=req("src/data/broforceSprites.js"),sh=BS.sheet(n);if(!sh)return null;const jump=hype>.3&&Math.sin(t*4+ph)>.5,row=jump?'jump':'idle';
   const r=BS.frameRect(sh,row,Math.floor(t*3+ph)),d=sh.def,k=sh.k,fw=17;
   return {img:sh.img,sx:r.sx,sy:r.sy,sw:r.sw,sh:r.sh,fx:d.feet[0]*k,fy:d.feet[1]*k,face:{x:d.neck[0]*k,y:(d.neck[1]+7)*k,w:fw*k,chin:true},tall:(d.feet[1]-d.neck[1]+fw*1.25)*k};}},
 castlevania:{sheets:()=>['hero-p1','hero-p2'],load:n=>req("src/data/sotnSprites.js")?.picture(n),
  frame(n,hype,t,ph){const SP=req("src/data/sotnSprites.js"),sh=SP.sheet(n);if(!sh)return null;const d=sh.def,fr=SP.frameOf(d,'stand',{t:t+ph,fps:4});
   const cols=Math.max(...Object.values(d.rows)),k=sh.img.width/(cols*d.frame[0]),hd=SP.headOf(d,fr);if(!hd)return null;const hx=d.foot[0]+hd.x/SP.S,hy=d.foot[1]+hd.y/SP.S,size=hd.size/SP.S,fw=size*.48;
   return {img:sh.img,sx:fr.sx*k,sy:fr.sy*k,sw:fr.w*k,sh:fr.h*k,fx:d.foot[0]*k,fy:d.foot[1]*k,face:{x:hx*k,y:(hy+size*.26)*k,w:fw*k,chin:true},tall:(d.foot[1]-hy+fw*.4)*k};}},
 sundown:{sheets:()=>['cowboy-p1','cowboy-p2'],load:n=>req("src/data/sundownSprites.js")?.picture(n),
  frame(n,hype,t,ph){const SD=req("src/data/sundownSprites.js"),sh=SD.sheet(n);if(!sh)return null;const d=sh.def,fr=SD.frameOf(d,'idle',t+ph,{fps:5});
   const cols=Math.max(...Object.values(d.rows)),k=sh.img.width/(cols*d.frame[0]),nk=SD.neckAt(d,'idle',fr.f)||[d.head[0],d.head[1]+d.headSize*.5],fw=d.headSize*.66;
   return {img:sh.img,sx:fr.sx*k,sy:fr.sy*k,sw:fr.w*k,sh:fr.h*k,fx:d.foot[0]*k,fy:d.foot[1]*k,face:{x:nk[0]*k,y:nk[1]*k,w:fw*k,chin:true},tall:(d.foot[1]-nk[1]+fw*1.25)*k};}},
 // Mario's NES body is drawn (no sheet): red shirt, overalls, boots; his cap goes on over the face
 mario:{sheets:()=>['mario','luigi'],load:()=>true,drawn:true}};
const HAS={warriors:n=>req("src/data/ddSprites.js")?.has(n),seanic:n=>!!(req("src/data/userPortraits.js")?.USER_PORTRAITS||{})['s3:'+n],
 horde:n=>req("src/data/hordeSprites.js")?.has(n),seanofagun:n=>req("src/data/broforceSprites.js")?.has(n),castlevania:n=>req("src/data/sotnSprites.js")?.has(n),
 sundown:n=>req("src/data/sundownSprites.js")?.has(n),mario:()=>true};
const cache={};function req(id){if(id in cache)return cache[id];try{cache[id]=require(id);}catch{cache[id]=null;}return cache[id];}
function cameoReady(kind,n){const C=CAMEOS[kind];if(C.drawn)return true;try{return !!C.frame(n,0,0,0);}catch{return false;}}
// the NES Mario / Luigi standing (cheering = arms up, hopping), feet at 0, 32 units cap-to-boots; returns the chin spot
function drawMario(g,luigi,hype,t,ph){const shirt=luigi?'#0a8a1a':'#c8241c',over=luigi?'#f0f0f0':'#3a4ab8',shoe='#6a3a10',skin='#f0b080',R=(c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};
 const up=hype>.3&&Math.sin(t*5+ph)>-.3,hop=up?Math.abs(Math.sin(t*7+ph))*3:0;g.translate(0,-hop);
 R(shirt,-5,-20,10,8);R(over,-5,-14,10,8);R(over,-4,-20,2,6);R(over,2,-20,2,6);R('#fcbc3c',-3,-14,1,1);R('#fcbc3c',2,-14,1,1);
 if(up){R(shirt,-7,-27,2,8);R(skin,-7,-29,2,2);R(shirt,5,-27,2,8);R(skin,5,-29,2,2);}else{R(shirt,-7,-19,2,7);R(skin,-7,-12,2,2);R(shirt,5,-19,2,7);R(skin,5,-12,2,2);}
 R(over,-5,-6,4,3);R(over,1,-6,4,3);R(shoe,-6,-3,5,3);R(shoe,1,-3,5,3);return {x:0,y:-20-hop,cap:shirt};}
// ---- the audience
function createAudience({seed='x',exclude=[]}={}){
 let pool=null;
 const faces=()=>{if(pool)return pool;try{const UP=require("src/data/userPortraits.js"),A=require("src/assets.js"),ex=new Set(exclude);
  pool=require("src/contentPolicy.js").ACTIVE_CATALOG.characters.filter(c=>c.unlockBy!=='dogs'&&!ex.has(c.id)&&headFacts(c.id,'normal')&&UP.isRasterArt(A.portraitURL(c.id,'normal'))).map(c=>c.id);}catch{pool=[];}return pool;};
 // the people per shape: one per seat (FILL of them), each keeps their face, look and beat
 const crowds={};
 function build(G){const fp=faces(),r2=seededRandom(`${seed}:audience:${G.shape}`),ppl=[];let cameos=0;
  const avail=[];for(const k of Object.keys(CAMEOS)){let ns=[];try{ns=CAMEOS[k].sheets().filter(n=>HAS[k](n));}catch{}for(const n of ns){try{CAMEOS[k].load(n);}catch{}avail.push([k,n]);}}
  for(const row of G.rows)for(const x of row.seats){if(r2()>FILL)continue;
   const p={row:row.r,x:x+(r2()-.5)*row.sw*.08,y:row.y,h:row.h*(.93+r2()*.14),face:fp.length?fp[Math.floor(r2()*fp.length)]:null,col:SHIRTS[Math.floor(r2()*SHIRTS.length)],look:{skin:SKINS[Math.floor(r2()*SKINS.length)],pants:PANTS[Math.floor(r2()*PANTS.length)],print:r2()<.3?1:r2()<.12?2:0},
    ph:r2()*TAU,beat:.8+r2()*.5,style:Math.floor(r2()*5),fan:Math.floor(r2()*8),dir:r2()<.5?-1:1,name:NAMES[Math.floor(r2()*NAMES.length)],sitter:r2()<.18};
   if(row.r>=2&&row.r<=5&&cameos<CAMEO_MAX&&avail.length&&r2()<CAMEO_RATE){p.cameo=avail[Math.floor(r2()*avail.length)];cameos++;}
   ppl.push(p);}
  // the called contestant: the aisle seat of a middle row (they get up, step into the aisle and run down the stairs)
  const cr=Math.round(G.rows.length*.24),cand=ppl.filter(p=>p.row===cr).sort((a,b)=>Math.abs(a.x-G.W/2)-Math.abs(b.x-G.W/2));
  if(cand[0]){cand[0].called=true;delete cand[0].cameo;}
  return {G,ppl,called:cand[0]||null,cache:null,cacheT:-1,cacheHype:-1,bg:null,bgKey:''};}
 function crowd(W,H){const sh=shapeOf(W,H),G=layout(sh);if(!crowds[sh]||crowds[sh].G!==G)crowds[sh]=build(G);return crowds[sh];}
 // which audience body sheet a fan uses: cr-fan-N, else a contestant sheet (standing poses only), else drawn
 function fanSheet(p,sitting){const f=SS.picture('cr-fan-'+(p.fan+1))||SS.picture('cr-fan-'+(1+p.fan%4));if(f)return {img:f,def:SS.CR_FAN};if(sitting)return null;const b=SS.picture('cr-body-'+(1+p.fan%4));return b?{img:b,def:SS.CR_BODY}:null;}
 // the pose now: the front rows always sit (arms up when hyped); the rest sit and clap now and then, and are on their feet
 // cheering (jump / fist pump / wave / point / clap, each on their own beat) while the house is hyped
 function poseOf(p,hype,t,G){const b=t*p.beat+p.ph,seatedRow=G.rows[p.row]?.seated;
  if(seatedRow||(hype<.3)||(p.sitter&&hype<.8)){if(hype>.3)return Math.sin(b*1.3)>-.2?'sitcheer':(Math.sin(b*9)>0?'sitclap1':'sitclap2');return Math.sin(b*.7)>.55?(Math.sin(b*9)>0?'sitclap1':'sitclap2'):'sit';}
  const s=(p.style+Math.floor(b*.5))%5;return s===0?'jump':s===1?(Math.sin(b*8)>0?'cheer1':'cheer2'):s===2?'wave':s===3?'point':(Math.sin(b*9)>0?'clap1':'clap2');}
 // a picture whose whole head (big hair, hats, a cartoon skull) is much wider than its face is shrunk so no head dwarfs the row
 const headK=new Map();function shrinkK(id){if(headK.has(id))return headK.get(id);let k=1;try{const geo=faceGeom(id,'normal',100,0,0,false);if(geo){const r=Math.max(geo.head.w,geo.head.h*.8)/100;if(r>1.75)k=1.75/r;}}catch{}headK.set(id,k);return k;}
 function drawFace(g,id,cx,cy,fw,dir,rot,mood){if(!id)return;fw*=shrinkK(id);const m=headFacts(id,mood)?mood:'normal',sp=faceSprite(id,m,Math.max(4,Math.round(fw)),dir);if(!sp)return;
  if(rot){g.save();g.translate(cx,cy);g.rotate(rot);g.drawImage(sp.cv,sp.x,sp.y);g.restore();}else g.drawImage(sp.cv,cx+sp.x,cy+sp.y);}
 // one person in screen px: feet (x,y), standing height h
 function drawPerson(g,p,x,y,h,hype,t,G,pose){pose=pose||poseOf(p,hype,t,G);const jump=pose==='jump'?Math.abs(Math.sin((t*p.beat+p.ph)*6))*h*.07:0;y-=jump;const mood=hype>.3?'win':'normal';
  if(p.cameo){const [kind,n]=p.cameo,C=CAMEOS[kind];
   if(C.drawn){const k=h/32;g.save();g.translate(x,y);g.scale(k*p.dir,k);const chin=drawMario(g,n==='luigi',hype,t,p.ph);g.restore();
    const fw=Math.min(10.8*k,FACE_W*h*1.15),fh=fw*1.25,cx=x,cy=y+chin.y*k-fh*.44;drawFace(g,p.face,cx,cy,fw,p.dir,0,mood);
    g.fillStyle=chin.cap;g.beginPath();g.ellipse(cx,cy-fh*.48,fw*.62,fh*.24,0,Math.PI,0);g.fill();g.fillRect(cx+(p.dir>0?0:-fw*.8),cy-fh*.5,fw*.8,fh*.1);return;}
   let fr=null;try{fr=C.frame(n,hype,t,p.ph);}catch{}
   if(fr){const k=h/fr.tall,face=fr.face,dx=(face.x-fr.fx)*k*p.dir,fw=Math.min(face.w*k,FACE_W*h*1.15),fh=fw*1.25,cx=x+dx,cy=y+(face.y-fr.fy)*k-(face.chin?fh*.44:0);
    if(face.behind)drawFace(g,p.face,cx,cy,fw,p.dir,(face.rot||0)*p.dir,mood);
    g.save();g.translate(x,y);g.scale(p.dir,1);g.drawImage(fr.img,fr.sx,fr.sy,fr.sw,fr.sh,-fr.fx*k,-fr.fy*k,fr.sw*k,fr.sh*k);g.restore();
    if(!face.behind)drawFace(g,p.face,cx,cy,fw,p.dir,(face.rot||0)*p.dir,mood);return;}}
  let sitting=pose.startsWith('sit');const sh=fanSheet(p,sitting);let fx=x,fy=y-(sitting?FACE_SIT:FACE_AT)*h;
  if(sh&&sitting&&!sh.def.frames.slice(0,Math.round(sh.img.width/sh.def.w)).includes(pose)){pose=pose==='sitcheer'?(Math.sin((t*p.beat+p.ph)*2)>0?'cheer1':'cheer2'):pose.startsWith('sitclap')?pose.slice(3):'stand';sitting=false;fx=x;fy=y-FACE_AT*h;}
  if(sh){const D=sh.def,nf=Math.max(1,Math.round(sh.img.width/D.w)),i0=D.frames.slice(0,nf).indexOf(pose),fi=i0>=0?i0:Math.max(0,D.frames.slice(0,nf).indexOf(pose.replace(/[12]$/,''))),fw=sh.img.width/nf,k=h/D.unit,sp=(D.spots&&D.spots[fi])||D.spot;
   g.save();g.translate(x,y);g.drawImage(sh.img,fi*fw,0,fw,sh.img.height,-D.feet[0]*k,-D.feet[1]*k,fw*k,sh.img.height*k);g.restore();
   fx=x+(sp[0]-D.feet[0])*k;fy=y+(sp[1]-D.feet[1])*k+h*FACE_DROP;}
  else drawnBody(g,p.col,x,y,h,pose,t*p.beat+p.ph,p.look);
  drawFace(g,p.face,fx,fy,(sh?FACE_W_PHOTO:FACE_W)*h,p.dir,0,mood);
  // every Price Is Right audience member wears a yellow price-tag name tag (front rows, where you can read it)
  if(!sh&&p.row<=3&&h>70)ST.nameTag(g,x-p.dir*h*.03,y-h*(sitting?.44:.62),h*.15,p.name);}
 // rows r0..r1 (back to front): each row's seats, then its people
 function drawRows(g,C,v,r0,r1,hype,t,skip){const G=C.G,sp=G.studio&&SS.picture('cr-seats'+SUFFIX[G.shape]);for(let r=r0;r>=r1;r--){const row=G.rows[r];g.save();g.translate(v.ox,v.oy);g.scale(v.c,v.c);
  if(G.studio){if(sp){g.beginPath();g.rect(0,row.band[0],G.W,row.band[1]-row.band[0]);g.clip();g.drawImage(sp,0,0,G.W,G.H);}}else drawSeatRow(g,G,row);g.restore();
  for(const p of C.ppl)if(p.row===r&&!(skip&&p.called))drawPerson(g,p,v.ox+p.x*v.c,v.oy+p.y*v.c,p.h*v.c,hype,t,G);}}
 // draw the house: studio, the back rows (cached, ~8 times a second), the front rows live, then the rail + ledge
 function draw(g,W,H,t,{hype=0,skipCalled=false,dpr=1}={}){const C=crowd(W,H),G=C.G,v=view(G,W,H),shape=G.shape,cf=CACHE_FROM[shape];
  const pic=SS.picture('cr-audience'+(shape==='wide'?'':'-'+shape))||require("src/bgShape.js").pick(W,H,{tall:'cr-audience-tall',wide:'cr-audience',fold:'cr-audience-fold'},SS.picture);
  if(pic&&pic.width/pic.height>.0){g.save();g.translate(v.ox,v.oy);g.scale(v.c*G.W/pic.width,v.c*G.H/pic.height);g.drawImage(pic,0,0);g.restore();}
  else{const key=W+'x'+H+':'+dpr;if(C.bgKey!==key){C.bgKey=key;C.bg=document.createElement('canvas');C.bg.width=Math.ceil(W*dpr);C.bg.height=Math.ceil(H*dpr);const b=C.bg.getContext('2d');b.scale(dpr,dpr);b.translate(v.ox,v.oy);b.scale(v.c,v.c);drawnStudio(b,G,{seats:false});}
   g.drawImage(C.bg,0,0,W,H);}
  const hy=hype>.3?1:0,ck=W+'x'+H+':'+dpr;if(!C.cache||C.cacheKey!==ck||t-C.cacheT>.12||t<C.cacheT||C.cacheHype!==hy){if(!C.cache||C.cacheKey!==ck){C.cache=document.createElement('canvas');C.cache.width=Math.ceil(W*dpr);C.cache.height=Math.ceil(H*dpr);C.cacheKey=ck;}
   const cg=C.cache.getContext('2d');cg.setTransform(1,0,0,1,0,0);cg.clearRect(0,0,C.cache.width,C.cache.height);cg.setTransform(dpr,0,0,dpr,0,0);drawRows(cg,C,v,G.rows.length-1,cf,hype,t,skipCalled);C.cacheT=t;C.cacheHype=hy;}
  g.drawImage(C.cache,0,0,W,H);
  drawRows(g,C,v,cf-1,0,hype,t,skipCalled);
  const fpic=SS.picture('cr-audience-front'+(shape==='wide'?'':'-'+shape));g.save();g.translate(v.ox,v.oy);g.scale(v.c,v.c);if(fpic)g.drawImage(fpic,0,0,G.W,G.H);else if(!G.studio)drawnFront(g,G);g.restore();}
 // the called contestant at st seconds into the call-down, screen px: gets up and cheers at the seat, steps into the aisle, runs
 // down the stairs toward the camera and past the rail; {x,y,h,pose,front} (front = drawn over the rail)
 function calledAt(W,H,st){const C=crowd(W,H),G=C.G,v=view(G,W,H),p=C.called;if(!p)return {x:W/2,y:H*.8,h:H*.3,pose:'jump'};
  const rows=G.rows,AX=r=>r.ax??G.W/2,rowAt=f=>{f=Math.max(-2.5,f);const i=Math.floor(f);if(i>=0&&i<rows.length-1){const a=rows[i],b=rows[i+1],u=f-i;return {y:a.y+(b.y-a.y)*u,h:a.h+(b.h-a.h)*u,ax:AX(a)+(AX(b)-AX(a))*u};}
   const a=rows[0],b=rows[1],u=-f;return {y:a.y+(a.y-b.y)*u*1.3,h:a.h*(1+.3*u),ax:AX(a)};};
  let x=p.x,f=p.row,pose='stand';const aisleX=AX(rows[p.row]);
  if(st<.35)pose='stand';else if(st<1.3)pose='jump';else if(st<1.7){const u=(st-1.3)/.4;x=p.x+(aisleX-p.x)*u;pose='run';}else{f=p.row-(st-1.7)*(p.row+3)/1.6;x=rowAt(f).ax;pose='run';}
  const q=f===p.row?{y:p.y,h:p.h}:rowAt(f);return {x:v.ox+x*v.c,y:v.oy+q.y*v.c,h:q.h*v.c,pose,front:f<0};}
 // wait (max ms) for the sheets and the faces this crowd uses (a crowd drawn before its faces load shows drawn heads)
 async function ready(W,H,ms=3000){const sf=SUFFIX[shapeOf(W,H)];
  await SS.ready(['cr-audience'+sf,'cr-seats'+sf,'cr-audience-front'+sf,'cr-seat',...[1,2,3,4,5,6,7,8].map(i=>'cr-fan-'+i),...[1,2,3,4].map(i=>'cr-body-'+i)],ms);
  const C=crowd(W,H);for(const p of C.ppl)if(p.face)faceSprite(p.face,'normal',8,1);
  const end=Date.now()+ms,cam=C.ppl.filter(p=>p.cameo);
  while(Date.now()<end&&(((require("src/headFacts.js").facesLoading?.()||0)>0)||cam.some(p=>!cameoReady(...p.cameo))))await new Promise(r=>setTimeout(r,60));}
 // the cameo bodies whose sheets are in this build ([kind,sheet]); person = draw one person with a given pose (Contestants' Row uses both)
 function cameoList(){const out=[];for(const k of Object.keys(CAMEOS)){let ns=[];try{ns=CAMEOS[k].sheets().filter(n=>HAS[k](n));}catch{}for(const n of ns){try{CAMEOS[k].load(n);}catch{}out.push([k,n]);}}return out;}
 return {cameoList,person:(g,p,x,y,h,hype,t,pose)=>drawPerson(g,p,x,y,h,hype,t,null,pose),probe:(k,n)=>{try{CAMEOS[k].load(n);const f=CAMEOS[k].frame?CAMEOS[k].frame(n,1,1,0):"drawn";return f&&f.img?{sw:f.sw,sh:f.sh,fx:f.fx,fy:f.fy,face:f.face,tall:f.tall}:f;}catch(e){return "err "+e.message;}},
  draw,calledAt,ready,crowd,get people(){return Object.values(crowds)[0]?.ppl||null;},get cameos(){return Object.values(crowds).flatMap(c=>c.ppl.filter(p=>p.cameo).map(p=>p.cameo.join(':')));}};}
// ---- templates (tools/gameshow-templates.mjs): the empty studio for cr-audience*, the rail for cr-audience-front*, every seat marked
function slotShape(slot){return slot.endsWith('-tall')?'tall':slot.endsWith('-fold')?'fold':'wide';}
function drawRef(g,slot){const G=layout(slotShape(slot));g.save();g.scale(g.canvas.width/G.W,g.canvas.height/G.H);
 if(slot.startsWith('cr-audience-front'))drawnFront(g,G);else if(slot==='cr-seat'){g.restore();const SG=SS.CR_SEAT;drawSeat(g,SG.floor[0],SG.floor[1],SG.w);return;}else drawnStudio(g,G);g.restore();}
function drawGuides(g,slot,label){const G=layout(slotShape(slot)),k=g.canvas.width/G.W,fs=Math.max(14,G.W/70);g.save();g.scale(k,k);g.strokeStyle='#ff2a6a';g.fillStyle='#ff2a6a';g.lineWidth=2/k;
 const f=G.front,back=G.rows[G.rows.length-1];
 if(slot.startsWith('cr-audience-front')){g.setLineDash([12,8]);g.beginPath();g.moveTo(0,f.rail);g.lineTo(G.W,f.rail);g.moveTo(0,f.y);g.lineTo(G.W,f.y);g.stroke();g.setLineDash([]);g.restore();
  label('RAIL (chrome, left and right of the aisle)',10,f.rail*k-30,fs*k);label('the front row sits behind it; LEDGE wall from here down',10,f.y*k+6,fs*k);label('transparent everywhere else (the people show through)',10,10,fs*k);return;}
 // the aisle outline
 g.beginPath();g.moveTo(G.W/2-back.a,back.y);g.lineTo(G.W/2-f.a*1.15,G.H);g.moveTo(G.W/2+back.a,back.y);g.lineTo(G.W/2+f.a*1.15,G.H);g.stroke();
 // every row: its floor line, a dot on every seat, the height a standing person reaches (tick on the first seat of each side)
 for(const r of G.rows){g.globalAlpha=.75;g.beginPath();g.moveTo(0,r.y);g.lineTo(G.W/2-r.a,r.y);g.moveTo(G.W/2+r.a,r.y);g.lineTo(G.W,r.y);g.stroke();
  for(const x of r.seats){g.beginPath();g.arc(x,r.y,Math.max(2.5/k,r.h*.02),0,TAU);g.fill();}
  const near=r.seats.filter(x=>x<G.W/2).pop();if(near!=null){g.beginPath();g.moveTo(near,r.y);g.lineTo(near,r.y-r.h);g.stroke();}g.globalAlpha=1;}
 g.restore();
 label('PAINT IT EMPTY: no people. One theater seat on every pink dot (dot = where the seat meets the floor), rows exactly on the pink lines',10,10,fs*k);
 label('red carpet AISLE with a step at every row line, chrome rails along it; curtains + studio lights above the back row',10,10+fs*k*1.4,fs*k);
 label('the vertical tick = how tall a standing person in that row is',10,10+fs*k*2.8,fs*k);}
Object.assign(exports,{createAudience,drawnBody,drawnStudio,drawnFront,drawSeat,layout,drawRef,drawGuides,CAMEOS,cameoReady,DESIGN,FACE_AT,FACE_SIT,FACE_W,FACE_DROP});
