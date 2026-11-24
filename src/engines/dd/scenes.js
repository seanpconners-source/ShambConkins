// THE WARRIORS: the drawn scenery of every story area (src/engines/dd/story.js kinds), used until GPT's pictures are in
// (src/data/ddSprites.js far-/wall-/floor-<kind>; the old biome pictures stand in where they fit). Drawn in world units:
// g is already scaled, x = world x - camera, the sky/far scenery fills y 0..BACK*.8, the back wall BACK*.46..BACK, the
// walkable floor BACK..FRONT (and on below the band). Parallax: far .15, mid .45, wall 1. Moving trains scroll their
// window view by time. Everything is a pure function of the camera and the clock, so both phones draw the same.
const DS=require("src/data/ddSprites.js");
function hash(n){n=(n^61)^(n>>>16);n=n+(n<<3);n=n^(n>>>4);n=Math.imul(n,0x27d4eb2d);return ((n^(n>>>15))>>>0)/4294967296;}
const FALLBACK={conclave:'forest',park:'forest',cemetery:'graveyard',elstreet:'nyc',yard:'nyc',tenement:'nyc',burning:'nyc',riverside:'forest',playground:'nyc',boardwalk:'themepark',beach:'beach'};
const pic=(kind,layer)=>DS.picture(layer+'-'+kind)||(FALLBACK[kind]?DS.picture(layer+'-'+FALLBACK[kind]):null);
function tilePic(g,im,camX,par,vw,y,h){const w=h*im.width/im.height,o=((camX*par)%w+w)%w;for(let X=-o;X<vw;X+=w)g.drawImage(im,X,y,w+1,h);}
function sky(g,vw,BACK,top,bot){const gr=g.createLinearGradient(0,-300,0,BACK);gr.addColorStop(0,top);gr.addColorStop(1,bot);g.fillStyle=gr;g.fillRect(0,-400,vw,BACK+400);}
// repeat something every sp world units at parallax par: f(X, i) with X the screen x of slot i
function each(camX,vw,sp,par,f,pad=1){const o=camX*par;for(let i=Math.floor(o/sp)-pad;i<=Math.ceil((o+vw)/sp)+pad;i++)f(i*sp-o,i);}
function rect(g,c,x,y,w,h){g.fillStyle=c;g.fillRect(x,y,w,h);}
function stars(g,camX,vw,BACK,t){each(camX,vw,60,.05,(X,i)=>{for(let k=0;k<3;k++){const a=.4+.6*Math.abs(Math.sin(t*.8+i*3+k));g.fillStyle=`rgba(255,255,240,${a*.7})`;g.fillRect(X+hash(i*11+k)*60,hash(i*7+k*3)*BACK*.5-60,1.2,1.2);}});}
function skyline(g,camX,vw,base,par,col,lit,seed=0,hMax=120){each(camX,vw,46,par,(X,i)=>{const h=40+hash(i*13+seed)*hMax,w=30+hash(i*5+seed)*14;rect(g,col,X,base-h,w,h);
 if(hash(i*3+seed)<.3){rect(g,col,X+w*.4,base-h-12,3,12);}
 if(lit)for(let y=base-h+6;y<base-6;y+=9)for(let c=0;c<3;c++)if(hash(i*31+y*7+c+seed)<.33)rect(g,lit,X+4+c*(w-10)/3,y,4,4);});}
function treeLine(g,camX,vw,base,par,col,big=40,seed=0){g.fillStyle=col;each(camX,vw,34,par,(X,i)=>{const r=big*.55+hash(i*9+seed)*big*.5;g.beginPath();g.arc(X+17,base-r*.55,r,0,7);g.fill();});rect(g,col,0,base-4,vw,600);}
function floorStripes(g,vw,BACK,FRONT,c1,c2,camX,spX=60,slant=26){const gr=g.createLinearGradient(0,BACK,0,FRONT+60);gr.addColorStop(0,c1);gr.addColorStop(1,c2);g.fillStyle=gr;g.fillRect(0,BACK,vw,FRONT-BACK+400);
 if(spX){g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=1.2;each(camX,vw,spX,1,X=>{g.beginPath();g.moveTo(X,BACK);g.lineTo(X-slant,FRONT+40);g.stroke();});}}
function hLines(g,vw,BACK,FRONT,step,col,a=.4){g.strokeStyle=col;g.globalAlpha=a;g.lineWidth=1;for(let y=BACK+step;y<FRONT+40;y+=step*(1+(y-BACK)/300)){g.beginPath();g.moveTo(0,y);g.lineTo(vw,y);g.stroke();}g.globalAlpha=1;}
function lamp(g,X,y0,h,t,col='#ffe8a0'){rect(g,'#14141a',X-1.5,y0-h,3,h);rect(g,'#14141a',X-6,y0-h-4,12,5);const gr=g.createRadialGradient(X,y0-h+2,1,X,y0-h+2,40);gr.addColorStop(0,col+'cc');gr.addColorStop(1,col+'00');g.fillStyle=gr;g.beginPath();g.arc(X,y0-h+2,40,0,7);g.fill();}
function sign(g,X,y,w,h,txt,col,glow,t,i){const on=Math.sin(t*3+i)>-.85||hash(Math.floor(t*6)+i)<.5;rect(g,'#14101a',X,y,w,h);g.font=`900 ${h*.62}px "SC Bangers",Impact,sans-serif`;g.textAlign='center';g.textBaseline='middle';
 if(on&&glow){g.shadowColor=col;g.shadowBlur=6;}g.fillStyle=on?col:'#3c3440';g.fillText(txt,X+w/2,y+h/2+1);g.shadowBlur=0;}
// ---- one painter per kind: far(g,..) then wall(g,..), floor(g,..)
const K={
 conclave:{far(g,c){sky(g,c.vw,c.B,'#05060f','#1c2442');stars(g,c.cam,c.vw,c.B,c.t);g.fillStyle='#fff8e0';g.beginPath();g.arc(c.vw*.72-c.cam*.02,30,14,0,7);g.fill();
   treeLine(g,c.cam,c.vw,c.B*.62,.12,'#070b0a',34);
   // the gangs gathered on the field: rows of silhouettes, coloured vests catching the stage lights
   each(c.cam,c.vw,9,.35,(X,i)=>{const h=hash(i*17);if(h<.18)return;const y=c.B*.74+hash(i*5)*8,s=.7+hash(i*3)*.25;rect(g,'#0c0c12',X,y-22*s,6*s,22*s);g.beginPath();g.fillStyle='#0c0c12';g.arc(X+3*s,y-25*s,3.2*s,0,7);g.fill();
    rect(g,['#c83c3c','#3c8ce8','#e8c83c','#3cb85c','#c83cc8','#e8e8e8'][i%6]+'99',X,y-20*s,6*s,8*s);});
   // the stage with its lights
   each(c.cam,c.vw,900,.45,(X,i)=>{rect(g,'#14101c',X+300,c.B*.6,220,c.B*.14);for(let k=0;k<4;k++){const a=.18+.12*Math.sin(c.t*2+k);g.fillStyle=`rgba(255,240,200,${a})`;g.beginPath();g.moveTo(X+330+k*55,c.B*.18);g.lineTo(X+300+k*55,c.B*.74);g.lineTo(X+360+k*55,c.B*.74);g.fill();}
    rect(g,'#c8a43c',X+390,c.B*.6-12,40,10);});},
  wall(g,c){const y=c.B*.8;rect(g,'#0c1a10',0,y,c.vw,c.B-y);each(c.cam,c.vw,160,1,X=>lamp(g,X+40,c.B-2,40,c.t));},
  floor(g,c){floorStripes(g,c.vw,c.B,c.F,'#1c3a1c','#0c1a0c',c.cam,0);g.globalAlpha=.25;each(c.cam,c.vw,80,1,(X,i)=>{if(i%2)rect(g,'#2c5a2c',X,c.B,80,c.F-c.B+300);});g.globalAlpha=1;}},
 park:{far(g,c){sky(g,c.vw,c.B,'#04060c','#14203a');stars(g,c.cam,c.vw,c.B,c.t);treeLine(g,c.cam,c.vw,c.B*.7,.15,'#08120c',46,3);treeLine(g,c.cam,c.vw,c.B*.84,.4,'#0c1c10',38,7);},
  wall(g,c){each(c.cam,c.vw,70,1,(X,i)=>{rect(g,'#1c140c',X+hash(i)*30,c.B*.5,7,c.B*.5);g.fillStyle='#10200f';g.beginPath();g.arc(X+20,c.B*.95,22+hash(i*3)*10,Math.PI,0);g.fill();});
   g.strokeStyle='#0c0c0c';g.lineWidth=1.5;each(c.cam,c.vw,12,1,X=>{g.beginPath();g.moveTo(X,c.B-24);g.lineTo(X,c.B);g.stroke();});rect(g,'#0c0c0c',0,c.B-24,c.vw,2);each(c.cam,c.vw,260,1,X=>lamp(g,X+90,c.B-3,58,c.t));},
  floor(g,c){floorStripes(g,c.vw,c.B,c.F,'#4a3c2c','#2a2018',c.cam,0);rect(g,'#1c2c14',0,c.B,c.vw,6);g.fillStyle='rgba(0,0,0,.2)';each(c.cam,c.vw,40,1,(X,i)=>{g.beginPath();g.ellipse(X+hash(i)*30,c.B+20+hash(i*7)*(c.F-c.B),6,2,0,0,7);g.fill();});}},
 cemetery:{far(g,c){sky(g,c.vw,c.B,'#06060e','#24243a');stars(g,c.cam,c.vw,c.B,c.t);treeLine(g,c.cam,c.vw,c.B*.66,.12,'#0a0a12',40,5);
   each(c.cam,c.vw,600,.3,X=>{rect(g,'#14141e',X+200,c.B*.48,70,c.B*.3);g.beginPath();g.fillStyle='#14141e';g.moveTo(X+192,c.B*.48);g.lineTo(X+235,c.B*.36);g.lineTo(X+278,c.B*.48);g.fill();});},
  wall(g,c){each(c.cam,c.vw,30,.7,(X,i)=>{if(hash(i*7)<.4)return;const h=10+hash(i)*10;g.fillStyle='#3c3c48';g.fillRect(X,c.B*.86-h,10,h);g.beginPath();g.arc(X+5,c.B*.86-h,5,Math.PI,0);g.fill();});
   g.strokeStyle='#0c0c10';g.lineWidth=1.6;each(c.cam,c.vw,9,1,X=>{g.beginPath();g.moveTo(X,c.B-30);g.lineTo(X,c.B);g.stroke();g.beginPath();g.moveTo(X-2,c.B-30);g.lineTo(X,c.B-35);g.lineTo(X+2,c.B-30);g.stroke();});rect(g,'#0c0c10',0,c.B-26,c.vw,2);},
  floor(g,c){floorStripes(g,c.vw,c.B,c.F,'#1c241c','#0c120c',c.cam,0);for(let k=0;k<4;k++){const y=c.B+20+k*28;g.fillStyle=`rgba(180,190,210,${.06+.04*Math.sin(c.t*.7+k)})`;each(c.cam,c.vw,220,.8+k*.1,X=>{g.beginPath();g.ellipse(X+(c.t*6%220),y,90,10,0,0,7);g.fill();});}}},
 elstreet:{far(g,c){sky(g,c.vw,c.B,'#05050c','#2c2240');skyline(g,c.cam,c.vw,c.B*.62,.12,'#0e0e18','rgba(255,220,130,.5)',1,110);},
  wall(g,c){const y=c.B*.38;skyline(g,c.cam,c.vw,c.B*.8,.45,'#16141c','rgba(255,200,120,.45)',9,60);
   each(c.cam,c.vw,120,1,(X,i)=>{rect(g,['#3c2c28','#2c2c34','#4c3424','#34302c'][i%4],X,y+20,118,c.B-y-20);rect(g,'#1c1414',X+6,c.B-46,50,44);rect(g,i%3?'#5c5c64':'#3c3c44',X+64,c.B-46,48,44);
    g.strokeStyle='rgba(0,0,0,.35)';for(let k=0;k<6;k++){g.beginPath();g.moveTo(X+64,c.B-46+k*7.5);g.lineTo(X+112,c.B-46+k*7.5);g.stroke();}
    sign(g,X+12,y+30,80,14,['LIQUORS','PAWN','DELI','BAR','HOTEL','RECORDS'][i%6],['#ff4c5c','#4ce8ff','#ffd23c','#ff8c3c','#c84cff','#4cff8c'][i%6],1,c.t,i);
    if(hash(i*13)<.6){g.font='900 10px "SC Bangers",Impact,sans-serif';g.fillStyle=['#e83c8c','#3ce8c8','#e8e83c'][i%3];g.save();g.translate(X+70,c.B-24);g.rotate(-.15);g.fillText(['WARRIORS','TURNBULL','RIFFS','ROGUES'][i%4],0,0);g.restore();}});
   rect(g,'#7c7468',0,c.B-4,c.vw,4);
   // the El overhead: girders across the top and columns down to the street, a train now and then
   if(c.A.el){rect(g,'#1c2024',0,-20,c.vw,28);each(c.cam,c.vw,22,1,X=>{g.strokeStyle='#2c3238';g.lineWidth=2;g.beginPath();g.moveTo(X,-20);g.lineTo(X+11,8);g.lineTo(X+22,-20);g.stroke();});
    each(c.cam,c.vw,200,1,X=>{rect(g,'#1c2024',X+90,8,8,c.B-8);});
    const per=11,p=(c.t%per)/3.4;if(p<1){const tx=-c.vw*.2+p*c.vw*1.6;for(let k=0;k<4;k++){rect(g,'#3c4448',tx-k*92,-46,88,26);for(let w=0;w<5;w++)rect(g,'#ffe8a0',tx-k*92+6+w*16,-40,10,8);}}}},
  floor(g,c){rect(g,'#5c5850',0,c.B,c.vw,12);floorStripes(g,c.vw,c.B+12,c.F,'#3c3c44','#1c1c22',c.cam,0);g.fillStyle='#d8c83c';each(c.cam,c.vw,90,1,X=>rect(g,'#c8b83c',X,c.B+12+(c.F-c.B)*.55,40,3));}},
 yard:{far(g,c){sky(g,c.vw,c.B,'#05050c','#3c2c30');skyline(g,c.cam,c.vw,c.B*.6,.12,'#0e0e16','rgba(255,220,130,.4)',4,100);each(c.cam,c.vw,400,.25,X=>{rect(g,'#14141c',X+100,c.B*.2,4,c.B*.5);const gr=g.createRadialGradient(X+102,c.B*.2,1,X+102,c.B*.2,60);gr.addColorStop(0,'rgba(255,250,220,.6)');gr.addColorStop(1,'rgba(255,250,220,0)');g.fillStyle=gr;g.beginPath();g.arc(X+102,c.B*.2,60,0,7);g.fill();});},
  wall(g,c){each(c.cam,c.vw,150,.8,(X,i)=>{rect(g,['#5c2c1c','#2c3c5c','#3c4c2c'][i%3],X+4,c.B*.62,140,c.B*.3);rect(g,'rgba(0,0,0,.3)',X+60,c.B*.66,24,c.B*.22);rect(g,'#1c1c1c',X+20,c.B*.92,12,6);rect(g,'#1c1c1c',X+110,c.B*.92,12,6);});
   g.strokeStyle='rgba(180,190,200,.35)';g.lineWidth=.8;for(let X=-(c.cam%8);X<c.vw;X+=8){g.beginPath();g.moveTo(X,c.B-36);g.lineTo(X+18,c.B);g.moveTo(X+18,c.B-36);g.lineTo(X,c.B);g.stroke();}rect(g,'#5c6064',0,c.B-36,c.vw,2);},
  floor(g,c){floorStripes(g,c.vw,c.B,c.F,'#4c4840','#24221e',c.cam,0);for(const r of [.3,.42,.7,.82]){const y=c.B+(c.F-c.B)*r;rect(g,'#8c8c94',0,y,c.vw,1.6);}g.fillStyle='#3c2c1c';each(c.cam,c.vw,14,1,X=>{rect(g,'#3c2c1c',X,c.B+(c.F-c.B)*.28,6,(c.F-c.B)*.16);rect(g,'#3c2c1c',X,c.B+(c.F-c.B)*.68,6,(c.F-c.B)*.16);});}},
 tenement:{far(g,c){sky(g,c.vw,c.B,'#05050c','#1c1c30');skyline(g,c.cam,c.vw,c.B*.5,.12,'#0c0c14','rgba(255,220,130,.4)',2,80);},
  wall(g,c){const doors=c.A.doors||[];each(c.cam,c.vw,140,1,(X,i)=>{rect(g,['#5c3424','#4c2c24','#6c3c2c'][i%3],X,c.B*.12,140,c.B*.88);
    for(let fl=0;fl<3;fl++)for(let w=0;w<3;w++){const lit=hash(i*29+fl*7+w)<.35;rect(g,lit?'#e8c878':'#1c1c24',X+16+w*40,c.B*.18+fl*30,18,22);rect(g,'#2c1c14',X+14+w*40,c.B*.18+fl*30+22,22,3);}
    g.strokeStyle='#14141a';g.lineWidth=1.4;g.strokeRect(X+10,c.B*.42,120,1);for(let k=0;k<9;k++){g.beginPath();g.moveTo(X+10+k*15,c.B*.42);g.lineTo(X+10+k*15,c.B*.47);g.stroke();}});
   for(const dx of doors){const X=dx-c.cam;if(X<-60||X>c.vw+60)continue;rect(g,'#14100c',X-14,c.B-46,28,44);rect(g,'#3c2c1c',X-17,c.B-49,34,4);rect(g,'#6c6460',X-24,c.B-6,48,6);rect(g,'#7c7470',X-20,c.B-10,40,4);}
   rect(g,'#7c7468',0,c.B-3,c.vw,3);},
  floor(g,c){rect(g,'#6c6860',0,c.B,c.vw,16);floorStripes(g,c.vw,c.B+16,c.F,'#3c3c42','#1c1c20',c.cam,0);each(c.cam,c.vw,300,1,X=>{rect(g,'#c8282c',X+40,c.B+4,6,10);rect(g,'#a82024',X+38,c.B+2,10,3);});}},
 burning:{far(g,c){K.tenement.far(g,c);const a=.25+.08*Math.sin(c.t*9)+.05*Math.sin(c.t*23);g.fillStyle=`rgba(255,110,30,${a})`;g.fillRect(0,-400,c.vw,c.B+400);},
  wall(g,c){K.tenement.wall(g,c);const a=.18+.06*Math.sin(c.t*11);g.fillStyle=`rgba(255,120,40,${a})`;g.fillRect(0,0,c.vw,c.B);
   for(let k=0;k<6;k++){const X=((k*137-c.cam*.6)%c.vw+c.vw)%c.vw,y=c.B*.3-((c.t*14+k*40)%120);g.fillStyle='rgba(30,26,30,.35)';g.beginPath();g.arc(X,y,18+k*3,0,7);g.fill();}},
  floor(g,c){K.tenement.floor(g,c);g.fillStyle=`rgba(255,120,40,${.12+.05*Math.sin(c.t*13)})`;g.fillRect(0,c.B,c.vw,c.F-c.B+300);}},
 // the subway car: windows show the tunnel rushing by (lights and pillars), seats under them, the car end doors
 train:{far(g,c){rect(g,'#05060a',0,-400,c.vw,c.B+400);const sp=900;g.fillStyle='#2c2c30';each(c.cam,c.vw,70,1,(X)=>{const x2=((X-c.t*sp)%(c.vw+140)+c.vw+140)%(c.vw+140)-70;rect(g,'#1c1c22',x2,c.B*.16,14,c.B*.5);});
   each(c.cam,c.vw,260,1,(X)=>{const x2=((X-c.t*sp*1.0)%(c.vw+260)+c.vw+260)%(c.vw+260)-130;const gr=g.createLinearGradient(x2-60,0,x2+20,0);gr.addColorStop(0,'rgba(255,230,150,0)');gr.addColorStop(1,'rgba(255,230,150,.9)');g.fillStyle=gr;g.fillRect(x2-60,c.B*.3,80,3);})
   // every few seconds a lit station rushes past the windows
   const per=9,p=(c.t%per)/2.2;if(p<1){const L=c.vw*1.6,x0=c.vw-p*(L+c.vw);rect(g,'#c8c4b4',x0,c.B*.12,L,c.B*.5);rect(g,'#2c5c3c',x0,c.B*.2,L,8);
    each(0,L,60,1,(X,i)=>{rect(g,'#2c3c5c',x0+X,c.B*.12,6,c.B*.5);if(i%3===0){rect(g,'#2c5c3c',x0+X+14,c.B*.26,40,10);g.fillStyle='#f0ece0';g.font='900 7px sans-serif';g.fillText(['96 ST','86 ST','72 ST'][Math.floor(c.t/per)%3],x0+X+18,c.B*.26+8);}
     if(hash(i*7)<.4){rect(g,'#1c1c24',x0+X+30,c.B*.38,6,c.B*.2);g.beginPath();g.fillStyle='#1c1c24';g.arc(x0+X+33,c.B*.37,3.5,0,7);g.fill();}});
    g.fillStyle='rgba(255,255,255,.15)';for(let k=0;k<8;k++)g.fillRect(0,c.B*.14+k*c.B*.06,c.vw,1);}},
  wall(g,c){car(g,c,'#9ca4a8','#c8ccc8');},
  floor(g,c){floorStripes(g,c.vw,c.B,c.F,'#6c6c70','#3c3c40',c.cam,0);hLines(g,c.vw,c.B,c.F,6,'#2c2c30',.35);rect(g,'#c8a43c',0,c.B,c.vw,2);}},
 trainDawn:{far(g,c){sky(g,c.vw,c.B,'#ff9c5c','#ffe0b0');const sp=520;g.fillStyle='#fff4c8';g.beginPath();g.arc(c.vw*.3,c.B*.42,26,0,7);g.fill();
   const roll=(par,base,col,seed,hm)=>{g.save();const o=c.t*sp*par;skylineMove(g,c.vw,base,o,col,seed,hm);g.restore();};roll(.15,c.B*.62,'#a8645c',2,70);roll(.45,c.B*.74,'#6c3c3c',5,50);
   each(0,c.vw,120,1,X=>{const x2=((X-c.t*sp*1.4)%(c.vw+120)+c.vw+120)%(c.vw+120)-60;rect(g,'#3c2420',x2,c.B*.1,4,c.B*.7);rect(g,'#3c2420',x2-14,c.B*.14,32,2);})
   // now and then a train the other way flashes past
   const per=13,p=(c.t%per)/1.3;if(p<1){const L=c.vw*1.8,x0=-L+p*(L+c.vw)*1.0;rect(g,'#8c8478',x0,c.B*.2,L,c.B*.45);for(let X=0;X<L;X+=40){rect(g,'#ffe8a0',x0+X+6,c.B*.26,26,c.B*.14);rect(g,'#5c5448',x0+X,c.B*.2,3,c.B*.45);}
    g.fillStyle='rgba(255,255,255,.2)';for(let k=0;k<6;k++)g.fillRect(0,c.B*.22+k*c.B*.07,c.vw,1);}},
  wall(g,c){car(g,c,'#a8a49c','#d8d0c0',true);},
  floor(g,c){K.train.floor(g,c);}},
 riverside:{far(g,c){sky(g,c.vw,c.B,'#04060c','#1c2a44');stars(g,c.cam,c.vw,c.B,c.t);rect(g,'#0c1628',0,c.B*.5,c.vw,c.B*.3);skyline(g,c.cam,c.vw,c.B*.5,.08,'#0a0e18','rgba(255,220,150,.6)',6,40);
   g.globalAlpha=.4;each(c.cam,c.vw,18,.08,(X,i)=>{if(hash(i*3)<.5)rect(g,'#ffe0a0',X,c.B*.52+hash(i)*c.B*.2,6,1);});g.globalAlpha=1;treeLine(g,c.cam,c.vw,c.B*.86,.4,'#08140c',30,9);},
  wall(g,c){rect(g,'#4c4c54',0,c.B-20,c.vw,20);g.fillStyle='#3c3c44';each(c.cam,c.vw,24,1,X=>rect(g,'#34343c',X,c.B-20,1.5,20));rect(g,'#6c6c74',0,c.B-22,c.vw,3);each(c.cam,c.vw,220,1,X=>lamp(g,X+50,c.B-20,60,c.t,'#fff0c8'));},
  floor(g,c){floorStripes(g,c.vw,c.B,c.F,'#56524c','#2c2a28',c.cam,44,18);}},
 playground:{far(g,c){K.riverside.far(g,c);},
  wall(g,c){g.strokeStyle='rgba(200,200,210,.4)';g.lineWidth=.8;for(let X=-(c.cam%8);X<c.vw;X+=8){g.beginPath();g.moveTo(X,c.B-44);g.lineTo(X+22,c.B);g.moveTo(X+22,c.B-44);g.lineTo(X,c.B);g.stroke();}rect(g,'#7c8088',0,c.B-44,c.vw,2);
   each(c.cam,c.vw,380,.8,X=>{g.strokeStyle='#c83c3c';g.lineWidth=3;g.beginPath();g.moveTo(X+40,c.B-4);g.lineTo(X+40,c.B-60);g.lineTo(X+120,c.B-60);g.lineTo(X+120,c.B-4);g.stroke();g.strokeStyle='#3c8ce8';g.beginPath();g.moveTo(X+120,c.B-40);g.lineTo(X+160,c.B-4);g.stroke();});},
  floor(g,c){floorStripes(g,c.vw,c.B,c.F,'#4c3c3c','#241c1c',c.cam,0);each(c.cam,c.vw,500,1,X=>{g.strokeStyle='rgba(240,240,200,.4)';g.lineWidth=1.5;for(let k=0;k<5;k++)g.strokeRect(X+100+k*18,c.B+40+(k%2)*14,18,14);});}},
 apartment:{far(g,c){rect(g,'#2c1424',0,-400,c.vw,c.B+400);},
  wall(g,c){const doors=c.A.doors||[];rect(g,'#4c1c34',0,-40,c.vw,c.B+40);g.fillStyle='rgba(255,180,220,.08)';each(c.cam,c.vw,24,1,X=>rect(g,'rgba(255,190,230,.07)',X,-40,10,c.B+40));
   each(c.cam,c.vw,260,1,(X,i)=>{rect(g,'#0c0c1c',X+30,c.B*.22,60,c.B*.4);skylineIn(g,X+30,c.B*.22,60,c.B*.4,i);rect(g,'#c8a43c',X+28,c.B*.2,64,3);
    rect(g,'#2c1c0c',X+150,c.B*.3,40,30);rect(g,['#c83c3c','#3c8ce8','#e8c83c'][i%3],X+154,c.B*.3+4,32,22);
    const gr=g.createRadialGradient(X+220,c.B*.6,2,X+220,c.B*.6,50);gr.addColorStop(0,'rgba(255,200,150,.45)');gr.addColorStop(1,'rgba(255,200,150,0)');g.fillStyle=gr;g.beginPath();g.arc(X+220,c.B*.6,50,0,7);g.fill();rect(g,'#e8d0a0',X+212,c.B*.55,16,10);rect(g,'#2c1c14',X+219,c.B*.62,2,c.B*.38);});
   for(const dx of doors){const X=dx-c.cam;if(X<-60||X>c.vw+60)continue;rect(g,'#1c0c14',X-16,c.B-62,32,62);rect(g,'#c8a43c',X-18,c.B-64,36,3);}
   // the jukebox glow
   each(c.cam,c.vw,700,1,(X)=>{const h=(c.t*60)%360;rect(g,'#2c1c14',X+380,c.B-44,30,44);g.fillStyle=`hsl(${h},90%,60%)`;g.beginPath();g.arc(X+395,c.B-34,12,Math.PI,0);g.fill();});
   rect(g,'#1c0c10',0,c.B-6,c.vw,6);},
  floor(g,c){floorStripes(g,c.vw,c.B,c.F,'#5c3c24','#2c1c10',c.cam,28,8);hLines(g,c.vw,c.B,c.F,9,'#1c0c04',.3);each(c.cam,c.vw,520,1,X=>{g.fillStyle='rgba(140,30,60,.6)';g.beginPath();g.ellipse(X+260,c.B+(c.F-c.B)*.5,120,26,0,0,7);g.fill();});}},
 apartment2:{far(g,c){K.apartment.far(g,c);},
  wall(g,c){rect(g,'#3c2c3c',0,-40,c.vw,c.B+40);each(c.cam,c.vw,150,1,(X,i)=>{rect(g,'#1c1014',X+40,c.B-62,32,62);rect(g,'#c8a43c',X+66,c.B-32,3,3);rect(g,'#2c1c24',X+36,c.B-66,40,4);g.font='8px sans-serif';g.fillStyle='#c8a43c';g.fillText(String(2+i)+'B',X+50,c.B-52);
    const gr=g.createRadialGradient(X+110,c.B*.25,2,X+110,c.B*.25,40);gr.addColorStop(0,'rgba(255,230,180,.4)');gr.addColorStop(1,'rgba(255,230,180,0)');g.fillStyle=gr;g.beginPath();g.arc(X+110,c.B*.25,40,0,7);g.fill();});rect(g,'#140c10',0,c.B-6,c.vw,6);},
  floor(g,c){floorStripes(g,c.vw,c.B,c.F,'#4c1c1c','#240c0c',c.cam,0);rect(g,'#c8a43c',0,c.B+10,c.vw,1.5);rect(g,'#c8a43c',0,c.F-10,c.vw,1.5);}},
 // a subway platform: tiled wall with the station name, the track pit between the wall and the platform, a train
 station:{far(g,c){rect(g,'#0c0c10',0,-400,c.vw,c.B+400);},
  wall(g,c){const y=c.B*.55;rect(g,'#c8c4b4',0,-40,c.vw,y+40);g.strokeStyle='rgba(60,60,60,.25)';g.lineWidth=.6;for(let yy=-40;yy<y;yy+=6){g.beginPath();g.moveTo(0,yy);g.lineTo(c.vw,yy);g.stroke();}
   each(c.cam,c.vw,8,1,X=>{g.beginPath();g.moveTo(X,-40);g.lineTo(X,y);g.stroke();});
   each(c.cam,c.vw,320,1,(X,i)=>{rect(g,'#2c5c3c',X+40,y*.28,180,20);g.font='900 13px "SC Nunito",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#f0ece0';g.fillText(c.A.kind==='station96'?(i%2?'96 ST':'BROADWAY'):c.A.kind==='platform'||i%2?'UNION SQ':'14 ST',X+130,y*.28+10);});
   rect(g,'#3c5c3c',0,y-8,c.vw,4);
   // the track pit and rails, then the train (at the end of the platform on the escape stage)
   rect(g,'#141414',0,y,c.vw,c.B-y);rect(g,'#6c6c6c',0,c.B-14,c.vw,2);rect(g,'#6c6c6c',0,c.B-6,c.vw,2);each(c.cam,c.vw,16,1,X=>rect(g,'#2c2418',X,c.B-16,8,14));
   each(c.cam,c.vw,140,1,X=>{rect(g,'#2c3c5c',X+60,-40,8,c.B+40);rect(g,'#1c2c4c',X+58,-40,12,6);});
   if(c.A.escape){const tx=c.A.len-420-c.cam,lv=c.A.trainLeave||0;drawTrainSide(g,tx+lv,y-6,c.B,c.t,c.A.trainOpen);}},
  floor(g,c){rect(g,'#e8c83c',0,c.B,c.vw,4);floorStripes(g,c.vw,c.B+4,c.F,'#6c6860','#34322e',c.cam,0);g.fillStyle='rgba(0,0,0,.25)';each(c.cam,c.vw,24,1,X=>rect(g,'rgba(0,0,0,.2)',X,c.B+4,1,c.F-c.B+300));}},
 platform:{far(g,c){K.station.far(g,c);},wall(g,c){K.station.wall(g,c);},floor(g,c){K.station.floor(g,c);}},
 station96:{far(g,c){K.station.far(g,c);},wall(g,c){K.station.wall(g,c);},floor(g,c){K.station.floor(g,c);}},
 restroom:{far(g,c){rect(g,'#1c201c',0,-400,c.vw,c.B+400);},
  wall(g,c){rect(g,'#c8d8c8',0,-40,c.vw,c.B+40);g.strokeStyle='rgba(60,80,60,.25)';g.lineWidth=.6;for(let yy=-40;yy<c.B;yy+=7){g.beginPath();g.moveTo(0,yy);g.lineTo(c.vw,yy);g.stroke();}each(c.cam,c.vw,7,1,X=>{g.beginPath();g.moveTo(X,-40);g.lineTo(X,c.B);g.stroke();});
   rect(g,'#3c6c4c',0,c.B*.5,c.vw,4);each(c.cam,c.vw,90,1,(X,i)=>{rect(g,'#5c6c64',X+6,c.B*.12,70,c.B*.88);rect(g,'#7c8c84',X+8,c.B*.14,66,c.B*.84);rect(g,'#c8a43c',X+60,c.B*.55,3,6);
    if(hash(i*5)<.5){g.font='900 9px "SC Bangers",Impact';g.fillStyle='#1c1c1c';g.fillText(['PUNKS','RULE','WAS HERE'][i%3],X+20,c.B*.4);}});
   each(c.cam,c.vw,400,1,X=>{const f=.5+.5*Math.sin(c.t*40)>.1?1:.5;g.fillStyle=`rgba(230,255,230,${.18*f})`;g.fillRect(X+150,-40,100,c.B+40);});},
  floor(g,c){rect(g,'#d8e0d8',0,c.B,c.vw,c.F-c.B+300);each(c.cam,c.vw,16,1,(X,i)=>{for(let k=0;k<12;k++)if((i+k)%2)rect(g,'#5c6c64',X,c.B+k*12,16,12);});g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,c.B,c.vw,c.F-c.B+300);}},
 boardwalk:{far(g,c){sky(g,c.vw,c.B,'#5c4c8c','#ffb88c');g.fillStyle='#fff0c0';g.beginPath();g.arc(c.vw*.6,c.B*.6,22,0,7);g.fill();
   each(c.cam,c.vw,700,.12,X=>{g.strokeStyle='#3c2c44';g.lineWidth=2.5;const cx=X+200,cy=c.B*.4,r=c.B*.26;g.beginPath();g.arc(cx,cy,r,0,7);g.stroke();for(let k=0;k<8;k++){const a=k/8*Math.PI*2+c.t*.05;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);g.stroke();g.fillStyle='#3c2c44';g.fillRect(cx+Math.cos(a)*r-4,cy+Math.sin(a)*r,8,7);}
    g.beginPath();g.moveTo(cx-r*.6,c.B*.8);g.lineTo(cx,cy);g.lineTo(cx+r*.6,c.B*.8);g.stroke();
    // the parachute tower
    g.beginPath();g.moveTo(X+480,c.B*.8);g.lineTo(X+500,c.B*.05);g.lineTo(X+520,c.B*.8);g.stroke();g.beginPath();g.arc(X+500,c.B*.06,24,Math.PI,0);g.stroke();for(let k=-3;k<=3;k++){g.beginPath();g.moveTo(X+500+k*7,c.B*.06);g.lineTo(X+500+k*8,c.B*.16);g.stroke();}});},
  wall(g,c){each(c.cam,c.vw,170,1,(X,i)=>{rect(g,['#c83c3c','#3c8ce8','#e8a83c','#3cb85c'][i%4],X+10,c.B*.5,150,c.B*.42);rect(g,'#f0ece0',X+10,c.B*.5,150,10);
    for(let s=0;s<6;s++)rect(g,s%2?'#f0ece0':['#c83c3c','#3c8ce8','#e8a83c','#3cb85c'][i%4],X+10+s*25,c.B*.5-8,25,8);
    rect(g,'#5c5c64',X+20,c.B*.62,130,c.B*.3);g.strokeStyle='rgba(0,0,0,.4)';for(let k=0;k<7;k++){g.beginPath();g.moveTo(X+20,c.B*.62+k*5);g.lineTo(X+150,c.B*.62+k*5);g.stroke();}
    sign(g,X+40,c.B*.53,90,10,['HOT DOGS','SKEE BALL','ARCADE','CLAMS'][i%4],'#fff',0,c.t,i);});
   rect(g,'#e8e0d0',0,c.B-14,c.vw,3);each(c.cam,c.vw,30,1,X=>rect(g,'#e8e0d0',X,c.B-14,3,14));},
  floor(g,c){floorStripes(g,c.vw,c.B,c.F,'#9c7c54','#5c4428',c.cam,0);g.strokeStyle='rgba(40,24,10,.45)';g.lineWidth=1;each(c.cam,c.vw,14,1,X=>{g.beginPath();g.moveTo(X,c.B);g.lineTo(X-30,c.F+40);g.stroke();});}},
 beach:{far(g,c){sky(g,c.vw,c.B,'#7c6ca8','#ffc89c');g.fillStyle='#fff4d0';g.beginPath();g.arc(c.vw*.5,c.B*.5,30,0,7);g.fill();
   rect(g,'#3c6c9c',0,c.B*.52,c.vw,c.B*.48);for(let k=0;k<6;k++){g.fillStyle=`rgba(255,240,220,${.18+.1*Math.sin(c.t*1.5+k)})`;g.fillRect(0,c.B*.56+k*10+Math.sin(c.t+k)*2,c.vw,1.5);}
   each(c.cam,c.vw,900,.1,X=>{g.strokeStyle='#3c2c44';g.lineWidth=2;g.beginPath();g.moveTo(X+300,c.B*.52);g.lineTo(X+320,-20);g.lineTo(X+340,c.B*.52);g.stroke();g.beginPath();g.arc(X+320,-18,26,Math.PI,0);g.stroke();});},
  wall(g,c){const ph=(c.t*.6)%1;g.fillStyle=`rgba(255,255,255,${.5*(1-ph)})`;g.beginPath();g.ellipse(c.vw/2,c.B*.97,c.vw*.6,4+ph*6,0,0,7);g.fill();rect(g,'#c8b490',0,c.B*.97,c.vw,c.B*.03+2);},
  floor(g,c){floorStripes(g,c.vw,c.B,c.F,'#e0c898','#b89c70',c.cam,0);g.fillStyle='rgba(120,90,50,.25)';each(c.cam,c.vw,30,1,(X,i)=>{g.beginPath();g.ellipse(X+hash(i)*20,c.B+10+hash(i*3)*(c.F-c.B),5,1.5,0,0,7);g.fill();});}}};
function skylineMove(g,vw,base,o,col,seed,hm){const sp=46;for(let i=Math.floor(o/sp)-1;i<=Math.ceil((o+vw)/sp)+1;i++){const X=i*sp-o,h=30+hash(i*13+seed)*hm,w=30+hash(i*5+seed)*14;rect(g,col,X,base-h,w,h+400);if(hash(i*7+seed)<.4){rect(g,col,X+8,base-h-14,10,14);rect(g,col,X+6,base-h-16,14,3);}}}
function skylineIn(g,x0,y0,w,h,i){g.save();g.beginPath();g.rect(x0,y0,w,h);g.clip();for(let k=0;k<5;k++){const bh=h*(.3+hash(i*9+k)*.5);rect(g,'#1c1c34',x0+k*13,y0+h-bh,11,bh);for(let y=y0+h-bh+3;y<y0+h-3;y+=6)if(hash(k*31+y+i)<.4)rect(g,'#e8d07c',x0+k*13+3,y,3,3);}g.restore();}
// a subway car interior as the back wall: windows (the far painter shows through them), ad strip, seats, poles
function car(g,c,body,trim,dawn){const y0=c.B*.08,wy=c.B*.22,wh=c.B*.4;
 // body panels drawn around the windows (evenodd above keeps the windows clear)
 g.fillStyle=body;g.beginPath();g.rect(0,-400,c.vw,c.B+400);each(c.cam,c.vw,110,1,X=>{g.rect(X+14,wy,82,wh);});g.fill('evenodd');
 g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=1.5;each(c.cam,c.vw,110,1,X=>g.strokeRect(X+14,wy,82,wh));
 rect(g,trim,0,y0,c.vw,10);each(c.cam,c.vw,110,1,(X,i)=>{rect(g,['#e83c3c','#3c8ce8','#e8c83c','#3cb85c'][i%4],X+20,y0+1,70,8);g.font='700 6px sans-serif';g.fillStyle='#fff';g.textAlign='center';g.fillText(['CAN YOU DIG IT','FEET OFF SEATS','NEXT STOP','LOST? ASK'][i%4],X+55,y0+7);});
 // graffiti on the panels (the 70s train look)
 each(c.cam,c.vw,220,1,(X,i)=>{g.save();g.globalAlpha=.55;g.font='900 12px "SC Bangers",Impact';g.fillStyle=['#e83c8c','#3cc8e8','#e8e83c'][i%3];g.translate(X+40,wy+wh+20);g.rotate(-.12);g.fillText(['WARRIORS','DIG IT','B-BOYS'][i%3],0,0);g.restore();});
 rect(g,'#2c4c7c',0,c.B-22,c.vw,16);rect(g,'#1c3c6c',0,c.B-8,c.vw,8);each(c.cam,c.vw,40,1,X=>rect(g,'rgba(0,0,0,.25)',X,c.B-22,1,16));
 each(c.cam,c.vw,220,1,X=>{rect(g,'#c8ccd0',X+100,-40,3,c.B+40);});
 // hand straps swinging with the ride
 rect(g,'#c8ccd0',0,y0+14,c.vw,2);each(c.cam,c.vw,36,1,(X,i)=>{const a=Math.sin(c.t*2.2+i*.7)*.18+Math.sin(c.t*7.1)*.05;g.save();g.translate(X+18,y0+15);g.rotate(a);rect(g,'#3c3c3c',-1,0,2,14);g.strokeStyle='#e8e0c8';g.lineWidth=2;g.beginPath();g.arc(0,18,4,0,7);g.stroke();g.restore();});
 // car ends: the connecting doors (enemies come through them)
 for(const dx of c.A.doors||[]){const X=dx-c.cam;if(X<-60||X>c.vw+60)continue;rect(g,'#5c6468',X-22,y0,44,c.B-y0);rect(g,'#2c3034',X-14,y0+12,28,c.B-y0-12);rect(g,'#0c0c10',X-8,wy+4,16,22);}
 // lights flicker as the train runs
 const fl=Math.sin(c.t*30)>.93?.25:0;if(fl){g.fillStyle=`rgba(0,0,0,${fl})`;g.fillRect(0,-400,c.vw,c.B+800);}}
function drawTrainSide(g,X,y,B,t,open){const L=380,h=B-y+6;rect(g,'#9ca4a8',X,y-h*.9,L,h);rect(g,'#5c6468',X,y-h*.9,L,6);
 for(let k=0;k<6;k++){rect(g,'#ffe8a0',X+14+k*60,y-h*.7,34,h*.28);}
 for(let k=0;k<3;k++){const dx=X+44+k*120,o=open?14:0;rect(g,'#2c3034',dx-o,y-h*.82,18,h*.8);rect(g,'#2c3034',dx+18+o,y-h*.82,18,h*.8);if(open){rect(g,'#ffe8a0',dx+4,y-h*.8,28,h*.76);}}
 g.font='900 10px "SC Nunito",sans-serif';g.fillStyle='#fff';g.textAlign='left';g.fillText('CONEY ISLAND',X+8,y-h*.78);}
// draw an area's backdrop (far + wall + floor): pictures first, else the drawn painter
function drawArea(g,A,camX,vw,BACK,FRONT,t){const c={A,cam:camX,vw,B:BACK,F:FRONT,t},P=K[A.kind]||K.elstreet;
 const far=pic(A.kind,'far'),wall=pic(A.kind,'wall'),floor=pic(A.kind,'floor');
 if(far&&!A.moving)tilePic(g,far,camX,.25,vw,-40,BACK*.8+40);else P.far(g,c);
 if(wall)tilePic(g,wall,camX,1,vw,BACK*.46,BACK*.54);else P.wall(g,c);
 if(floor)tilePic(g,floor,camX,1,vw,BACK,FRONT-BACK+60);else P.floor(g,c);
 // pits: open graves, a trench in the rail yard
 for(const [a,b,d0,d1] of A.pits||[]){const X0=a-camX,X1=b-camX;if(X1<-30||X0>vw+30)continue;const y0=BACK+Math.max(0,d0),y1=Math.min(FRONT,BACK+d1),sk=(y1-y0)/(FRONT-BACK)*18;
  // a mound of dirt behind an open grave, a lip round a trench
  g.fillStyle=A.kind==='cemetery'?'#3c2c1c':'#5c5c5c';g.beginPath();g.ellipse((X0+X1)/2,y0,(X1-X0)*.7,5,0,Math.PI,0);g.fill();
  g.fillStyle='#050403';g.beginPath();g.moveTo(X0,y0+2);g.lineTo(X1,y0+2);g.lineTo(X1-sk,y1);g.lineTo(X0-sk,y1);g.fill();
  g.fillStyle='rgba(255,255,255,.12)';g.fillRect(X0,y0+2,X1-X0,1.5);}}
// solid obstacles, drawn at their front edge (depth-sorted with the fighters by the engine). X = screen x of b.x in world
// units, yb/yf = y of the back/front edge
// how much wider than its footprint a painted prop is drawn
const PROP_W={car:1.05,wreck:1.05,newsstand:1.1,bench:1.15,couch:1.1,swings:1.1,hotdog:1.15,grave:1.25,hydrant:1.6,meter:2,mailbox:1.4,trashcan:1.35,phone:1.4,lamp:2.2,pylon:1.4,sink:1.3};
function drawBlock(g,b,X,yb,yf,t){const w=b.w,k=b.kind,box=(h,front,top)=>{rect(g,top,X,yb-h,w,yf-yb);rect(g,front,X,yf-h,w,h);g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=1;g.strokeRect(X,yf-h,w,h);};
 g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(X+w/2,yf,w*.6,4,0,0,7);g.fill();
 // a painted prop (ddSprites prop-<kind>): as wide as the footprint (cars/newsstands a touch wider), standing on the front edge
 const im=DS.picture('prop-'+k);if(im){const pw=w*(PROP_W[k.split('-')[0]]||1.2),ph=pw*im.height/im.width;g.drawImage(im,X+w/2-pw/2,yf-ph+2,pw,ph);return;}
 const kk=k.split('-')[0],v=+(k.split('-')[1]||1);
 if(kk==='grave'){const st=v===2?'#7c7c84':v===3?'#5c5c64':'#6c6c78',H=v===3?40:v===4?20:28;g.fillStyle=st;g.strokeStyle='#22222a';g.lineWidth=1;
  if(v===2){g.fillRect(X+w*.4,yf-H-6,w*.2,H+6);g.fillRect(X+w*.12,yf-H+4,w*.76,w*.2);g.fillRect(X,yf-6,w,6);g.strokeRect(X,yf-6,w,6);}
  else if(v===3){g.beginPath();g.moveTo(X+w*.25,yf);g.lineTo(X+w*.38,yf-H);g.lineTo(X+w/2,yf-H-8);g.lineTo(X+w*.62,yf-H);g.lineTo(X+w*.75,yf);g.fill();g.stroke();}
  else{g.beginPath();g.moveTo(X,yf);g.lineTo(X,yf-H);g.arc(X+w/2,yf-H,w/2,Math.PI,0);g.lineTo(X+w,yf);g.fill();g.stroke();g.fillStyle='rgba(0,0,0,.35)';g.fillRect(X+w*.3,yf-H+2,w*.4,1.5);g.fillRect(X+w*.25,yf-H+6,w*.5,1.5);}
  g.fillStyle='rgba(70,110,50,.5)';g.fillRect(X,yf-3,w,3);return;}
 if(kk==='hydrant'){rect(g,'#b81c1c',X+1,yf-14,w-2,14);rect(g,'#d82c2c',X+2,yf-18,w-4,5);rect(g,'#8c1414',X-1,yf-11,w+2,3);rect(g,'#b81c1c',X+w/2-1.5,yf-21,3,3);return;}
 if(kk==='meter'){rect(g,'#4c4c54',X+w/2-1,yf-26,2,26);rect(g,'#7c7c84',X,yf-36,w,11);rect(g,'#cce0e8',X+1.2,yf-34,w-2.4,4);return;}
 if(kk==='newsstand'){box(30,'#2c5c3c','#3c7c4c');rect(g,'#1c3c28',X-2,yb-34,w+4,5);for(let i=0;i<4;i++)rect(g,['#e8e0c8','#c83c3c','#e8c83c','#4c8cc8'][i],X+4+i*(w-8)/4,yf-24,(w-8)/4-2,10);return;}
 if(kk==='mailbox'){rect(g,'#1c1c1c',X+2,yf-6,2,6);rect(g,'#1c1c1c',X+w-4,yf-6,2,6);rect(g,'#2c4c9c',X,yf-24,w,18);g.fillStyle='#2c4c9c';g.beginPath();g.arc(X+w/2,yf-24,w/2,Math.PI,0);g.fill();rect(g,'#c8c8d8',X+2,yf-20,w-4,1.5);return;}
 if(kk==='trashcan'){rect(g,'#6c6c70',X,yf-18,w,18);for(let i=1;i<4;i++)rect(g,'#4c4c50',X+i*w/4,yf-18,1,18);g.fillStyle='#8c8c90';g.beginPath();g.ellipse(X+w/2+3,yf-20,w*.55,3,-.2,0,7);g.fill();return;}
 if(kk==='phone'){rect(g,'#9c9ca4',X+2,yf-44,w-4,44);rect(g,'#4c8cc8',X,yf-48,w,6);rect(g,'#1c1c24',X+5,yf-36,w-10,14);rect(g,'#2c2c2c',X+w/2-2,yf-32,4,6);return;}
 if(kk==='hotdog'){rect(g,'#0c0c0c',X+4,yf-6,6,6);rect(g,'#0c0c0c',X+w-10,yf-6,6,6);box(18,'#c8c8cc','#e8e8ec');rect(g,'#5c5c5c',X+w/2-1,yb-48,2,30);g.fillStyle='#e83c3c';g.beginPath();g.moveTo(X-4,yb-46);g.quadraticCurveTo(X+w/2,yb-64,X+w+4,yb-46);g.fill();return;}
 if(kk==='pylon'){g.fillStyle='#ff7c1c';g.beginPath();g.moveTo(X+1,yf);g.lineTo(X+w/2,yf-14);g.lineTo(X+w-1,yf);g.fill();rect(g,'#fff',X+w*.3,yf-8,w*.4,2);rect(g,'#ff7c1c',X-1,yf-2,w+2,2);return;}
 if(k==='bench'){rect(g,'#3c2c1c',X+3,yf-10,3,10);rect(g,'#3c2c1c',X+w-6,yf-10,3,10);rect(g,'#7c5c34',X,yf-14,w,4);rect(g,'#6c4c2c',X,yb-24,w,4);rect(g,'#6c4c2c',X,yb-30,w,4);rect(g,'#2c2c2c',X+2,yb-30,2,30);rect(g,'#2c2c2c',X+w-4,yb-30,2,30);}
 else if(k==='grave'){g.fillStyle='#6c6c78';g.beginPath();g.moveTo(X,yf);g.lineTo(X,yf-22);g.arc(X+w/2,yf-22,w/2,Math.PI,0);g.lineTo(X+w,yf);g.fill();g.strokeStyle='#2c2c34';g.stroke();g.fillStyle='#3c3c48';g.fillRect(X+w*.3,yf-20,w*.4,1.5);g.fillRect(X+w*.25,yf-15,w*.5,1.5);}
 else if(k==='car'||k==='wreck'){const body=k==='wreck'?'#2c2420':'#3c5c8c';rect(g,'#0c0c0c',X+8,yf-10,12,10);rect(g,'#0c0c0c',X+w-20,yf-10,12,10);box(18,body,k==='wreck'?'#3c3430':'#5c7cac');rect(g,k==='wreck'?'#1c1410':'#2c4c7c',X+w*.22,yb-34,w*.56,16);rect(g,k==='wreck'?'#0c0808':'#9cc8e8',X+w*.28,yb-31,w*.44,10);
  if(k==='wreck')for(let i=0;i<5;i++){const fx=X+8+i*(w-16)/4,fh=14+8*Math.sin(t*12+i*2);g.fillStyle='rgba(255,140,30,.85)';g.beginPath();g.moveTo(fx-6,yb-20);g.quadraticCurveTo(fx,yb-20-fh*1.8,fx+6,yb-20);g.fill();g.fillStyle='rgba(255,230,120,.9)';g.beginPath();g.moveTo(fx-3,yb-20);g.quadraticCurveTo(fx,yb-20-fh,fx+3,yb-20);g.fill();}}
 else if(k==='lamp'){lamp(g,X+w/2,yf,70,t,'#fff0c8');}
 else if(k==='swings'){g.strokeStyle='#5c5c64';g.lineWidth=2.5;g.beginPath();g.moveTo(X,yf);g.lineTo(X+6,yb-48);g.lineTo(X+w-6,yb-48);g.lineTo(X+w,yf);g.stroke();g.lineWidth=1;for(let i=0;i<3;i++){const sx=X+12+i*(w-24)/2,sw=Math.sin(t*1.5+i)*4;g.beginPath();g.moveTo(sx,yb-48);g.lineTo(sx+sw,yb-16);g.stroke();rect(g,'#2c2c2c',sx+sw-4,yb-16,8,2);}}
 else if(k==='couch'){box(16,'#6c1c3c','#8c2c4c');rect(g,'#5c142c',X,yb-30,w,16);rect(g,'#7c2444',X-3,yf-22,7,22);rect(g,'#7c2444',X+w-4,yf-22,7,22);}
 else if(k==='sink'){box(20,'#c8ccc8','#e8ece8');rect(g,'#9ca4a0',X+6,yb-24,w-12,4);rect(g,'#5c5c5c',X+w/2-1,yb-30,2,8);}
 else box(16,'#5c5c5c','#7c7c7c');}
Object.assign(exports,{drawArea,drawBlock,drawTrainSide,KINDS:Object.keys(K),FALLBACK});
