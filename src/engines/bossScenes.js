// BOSS FIGHT backdrops: layered parallax scenes pre-rendered per canvas size and scrolled vertically.
// makeScene(key,pal,W,H) -> {draw(x,t,boost)}   pal=[main,dark,accent,light]
const TAU=Math.PI*2;
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const hashStr=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
const wrap=(H,y,h,fn)=>{fn(y);if(y+h>H)fn(y-H);if(y-h<0)fn(y+H);};
function mix(a,b,t){const pa=parseInt(a.slice(1),16),pb=parseInt(b.slice(1),16);const f=s=>Math.round(((pa>>s&255)*(1-t)+(pb>>s&255)*t));return `rgb(${f(16)},${f(8)},${f(0)})`;}
// ---- styles: (g,W,H,pal,r,opt)
const S={
 stars(g,W,H,P,r,o){const n=o.n||90;for(let i=0;i<n;i++){const y=r()*H,x=r()*W,s=.6+r()*(o.size||1.8);g.fillStyle=`rgba(255,255,255,${.3+r()*.6})`;g.fillRect(x,y,s,s);}},
 glowlines(g,W,H,P,r,o){g.strokeStyle=o.col||P[2];g.globalAlpha=.25;g.lineWidth=2;for(let x=W*.08;x<W;x+=W*.14){g.beginPath();g.moveTo(x,0);g.lineTo(x,H);g.stroke();}for(let y=0;y<H;y+=H/8){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}g.globalAlpha=1;},
 circuit(g,W,H,P,r,o){g.strokeStyle=o.col||P[2];g.fillStyle=o.col||P[2];g.lineWidth=2;g.globalAlpha=.4;for(let i=0;i<(o.n||26);i++){let x=r()*W,y=r()*H;g.beginPath();g.moveTo(x,y);for(let k=0;k<3;k++){if(r()<.5)x+=(r()-.5)*W*.4;else y+=(r()-.5)*H*.2;g.lineTo(x,y);}g.stroke();g.beginPath();g.arc(x,y,4,0,TAU);g.fill();}g.globalAlpha=1;},
 code(g,W,H,P,r,o){g.font='bold 14px monospace';g.textAlign='center';const ch='01ｱｲｳｴｵ=+:<>';for(let x=10;x<W;x+=18){const len=4+Math.floor(r()*14),y0=r()*H;for(let k=0;k<len;k++){g.fillStyle=k===len-1?'#eafff0':P[2];g.globalAlpha=(k/len)*.7;const y=(y0+k*16)%H;g.fillText(ch[Math.floor(r()*ch.length)],x,y);}}g.globalAlpha=1;},
 skyline(g,W,H,P,r,o){const base=o.dark?P[1]:mix(P[1],P[0],.25);let x=-10;g.fillStyle=base;while(x<W){const w=30+r()*50,h=H*(.25+r()*.5)*(o.tall||1);const y=H-h;wrap(H,0,0,()=>{});g.fillRect(x,y,w,h+1);g.fillStyle=o.win||'#ffd87a';for(let wy=y+8;wy<H-8;wy+=14)for(let wx=x+6;wx<x+w-8;wx+=12)if(r()<.35){g.globalAlpha=.7;g.fillRect(wx,wy,5,7);g.globalAlpha=1;}g.fillStyle=base;x+=w+3;}},
 pillars(g,W,H,P,r,o){const c=o.col||mix(P[1],P[0],.35);for(const x of [W*.05,W*.95]){g.fillStyle=c;g.fillRect(x-20,0,40,H);g.fillStyle='rgba(255,255,255,.1)';g.fillRect(x-20,0,8,H);g.fillStyle='rgba(0,0,0,.3)';for(let y=H/6;y<H;y+=H/3)g.fillRect(x-24,y-6,48,12);}},
 snow(g,W,H,P,r,o){for(let i=0;i<(o.n||80);i++){g.fillStyle=`rgba(255,255,255,${.4+r()*.5})`;g.beginPath();g.arc(r()*W,r()*H,.8+r()*2.2,0,TAU);g.fill();}},
 mountains(g,W,H,P,r,o){g.fillStyle=o.col||mix(P[1],P[0],.3);g.beginPath();g.moveTo(0,H);let x=0;while(x<W+40){g.lineTo(x,H*(.62+r()*.2));x+=W*.12;g.lineTo(x-W*.06,H*(.4+r()*.15));}g.lineTo(W,H);g.fill();g.fillStyle='rgba(255,255,255,.18)';g.fillRect(0,H*.86,W,H*.14);},
 foliage(g,W,H,P,r,o){for(let i=0;i<(o.n||26);i++){const left=r()<.5,x=left?r()*W*.2-10:W-r()*W*.2+10,y=r()*H,s=30+r()*60;wrap(H,y,s,yy=>{g.fillStyle=mix(P[1],P[0],r()*.7);g.beginPath();g.ellipse(x,yy,s*.5,s*.8,r()*3,0,TAU);g.fill();});}},
 fog(g,W,H,P,r,o){for(let i=0;i<(o.n||10);i++){const x=r()*W,y=r()*H,s=60+r()*100;wrap(H,y,s,yy=>{const gr=g.createRadialGradient(x,yy,0,x,yy,s);gr.addColorStop(0,o.col||'rgba(220,220,230,.28)');gr.addColorStop(1,'rgba(220,220,230,0)');g.fillStyle=gr;g.fillRect(x-s,yy-s,s*2,s*2);});}},
 tiles(g,W,H,P,r,o){const s=o.s||48,a=o.a||mix(P[1],P[0],.35),b=o.b||P[1];for(let y=0;y<H;y+=s)for(let x=0;x<W;x+=s){g.fillStyle=((x/s+y/s)&1)?a:b;g.fillRect(x,y,s,s);}},
 bricks(g,W,H,P,r,o){const bw=54,bh=26;for(let y=0,i=0;y<H;y+=bh,i++)for(let x=-(i%2)*bw/2;x<W;x+=bw){g.fillStyle=mix(P[1],P[0],.15+r()*.25);g.fillRect(x+1,y+1,bw-2,bh-2);}},
 waves(g,W,H,P,r,o){g.strokeStyle=o.col||P[2];g.globalAlpha=.3;g.lineWidth=3;for(let y=0;y<H;y+=H/10){g.beginPath();for(let x=0;x<=W;x+=10)g.lineTo(x,y+Math.sin(x*.04+y)*6);g.stroke();}g.globalAlpha=1;},
 stripes(g,W,H,P,r,o){const cols=o.cols||['#ff4b4b','#ffb02e','#ffe34b','#4bd86b','#4bb6ff','#a56bff'];const n=cols.length;for(let i=0;i<n;i++){g.fillStyle=cols[i];g.globalAlpha=.32;g.save();g.translate(W/2,H/2);g.rotate(.25);g.fillRect(-W*.7+i*(W*1.4/n),-H,W*1.4/n+1,H*2);g.restore();}g.globalAlpha=1;},
 clouds(g,W,H,P,r,o){for(let i=0;i<(o.n||9);i++){const x=r()*W,y=r()*H,s=30+r()*40;wrap(H,y,s,yy=>{g.fillStyle=o.col||'rgba(255,255,255,.35)';for(let k=0;k<4;k++){g.beginPath();g.arc(x+k*s*.5-s*.7,yy+(k%2)*-6,s*.5,0,TAU);g.fill();}});}},
 embers(g,W,H,P,r,o){for(let i=0;i<(o.n||50);i++){g.fillStyle=o.col||P[2];g.globalAlpha=.3+r()*.6;g.fillRect(r()*W,r()*H,1.5+r()*2,1.5+r()*2);}g.globalAlpha=1;},
 arches(g,W,H,P,r,o){const c=mix(P[1],P[0],.4);for(let y=H*.1;y<H;y+=H/3){for(const x of [W*.13,W*.87]){wrap(H,y,90,yy=>{g.fillStyle=c;g.beginPath();g.moveTo(x-22,yy+70);g.lineTo(x-22,yy);g.arc(x,yy,22,Math.PI,0);g.lineTo(x+22,yy+70);g.fill();g.fillStyle=o.glow||P[2];g.globalAlpha=.5;g.beginPath();g.moveTo(x-14,yy+64);g.lineTo(x-14,yy);g.arc(x,yy,14,Math.PI,0);g.lineTo(x+14,yy+64);g.fill();g.globalAlpha=1;});}}},
 wallpaper(g,W,H,P,r,o){const s=o.s||40;g.fillStyle=o.bg||mix(P[1],P[0],.25);g.fillRect(0,0,W,H);g.fillStyle=o.col||mix(P[1],P[0],.45);for(let y=0;y<H;y+=s)for(let x=((y/s)&1)*s/2;x<W;x+=s){g.beginPath();g.moveTo(x,y+s*.2);g.lineTo(x+s*.18,y+s*.5);g.lineTo(x,y+s*.8);g.lineTo(x-s*.18,y+s*.5);g.fill();}},
 banners(g,W,H,P,r,o){for(const x of [W*.1,W*.9])for(let y=H/8;y<H;y+=H/3){g.fillStyle=o.col||P[2];g.globalAlpha=.55;g.beginPath();g.moveTo(x-18,y);g.lineTo(x+18,y);g.lineTo(x+18,y+80);g.lineTo(x,y+66);g.lineTo(x-18,y+80);g.fill();g.globalAlpha=1;}},
 crowd(g,W,H,P,r,o){for(let y=0;y<H;y+=16)for(const side of [0,1]){for(let i=0;i<3;i++){const x=side?W-12-i*20:12+i*20;g.fillStyle=mix(P[1],'#000000',.2+r()*.4);g.beginPath();g.arc(x+(r()-.5)*6,y+(r()-.5)*4,8,0,TAU);g.fill();}}},
 spots(g,W,H,P,r,o){for(let i=0;i<3;i++){const x=W*(.2+i*.3),gr=g.createLinearGradient(x,0,x+(i-1)*40,H);gr.addColorStop(0,'rgba(255,255,255,.18)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.beginPath();g.moveTo(x-6,0);g.lineTo(x+6,0);g.lineTo(x+(i-1)*80+40,H);g.lineTo(x+(i-1)*80-40,H);g.fill();}},
 hills(g,W,H,P,r,o){g.fillStyle=o.col||'#3ea04a';g.beginPath();g.moveTo(0,H);for(let x=0;x<=W;x+=10)g.lineTo(x,H*.85+Math.sin(x*.025)*H*.05);g.lineTo(W,H);g.fill();g.fillStyle='#e8d28a';g.fillRect(0,H*.93,W,H*.07);},
 swirls(g,W,H,P,r,o){const cols=['#ff4d8d','#4dd2ff','#ffd23c','#6cff6a'];for(let i=0;i<(o.n||14);i++){const x=r()*W,y=r()*H,s=10+r()*14;wrap(H,y,s*2,yy=>{g.fillStyle=cols[i%4];g.globalAlpha=.7;g.beginPath();g.arc(x,yy,s,0,TAU);g.fill();g.strokeStyle='#fff';g.lineWidth=3;g.beginPath();g.arc(x,yy,s*.6,0,4);g.stroke();g.globalAlpha=1;});}}
};
const PRESETS={
 station:[['stars',0,{}],['glowlines',.5,{}],['stars',1.6,{n:30,size:3}]],
 circuit:[['circuit',.4,{}],['circuit',1.1,{n:14}],['embers',.8,{n:20}]],
 lab:[['glowlines',.5,{col:'#8bb8ff'}],['circuit',.9,{n:16}],['stars',1.4,{n:20}]],
 city:[['stars',0,{n:50}],['skyline',.5,{dark:true,tall:1.3}],['skyline',1.2,{}]],
 matrix:[['code',.7,{}],['code',1.4,{}]],
 foundry:[['bricks',.3,{}],['embers',1.5,{n:60}],['glowlines',.6,{col:'#ff7a1a'}]],
 courtyard:[['bricks',.4,{}],['pillars',1,{}],['embers',1.4,{n:40}]],
 ring:[['crowd',.5,{}],['spots',0,{}],['pillars',1,{col:'#3a1a1a'}]],
 pit:[['bricks',.5,{}],['fog',.9,{n:12}],['pillars',1.2,{}]],
 russia:[['stripes',0,{cols:['#5a0f0f','#2a0808','#5a0f0f','#2a0808']}],['snow',1.4,{n:90}],['pillars',1,{}]],
 snow:[['mountains',.4,{}],['snow',1.2,{n:110}],['fog',.8,{n:6}]],
 keep:[['bricks',.4,{}],['banners',1,{col:'#ffb347'}],['pillars',1,{}]],
 jungle:[['fog',.4,{n:8,col:'rgba(120,200,100,.18)'}],['foliage',1.1,{}],['foliage',1.8,{n:14}]],
 kitchen:[['tiles',.6,{}],['fog',1,{n:6}],['embers',1.4,{n:20,col:'#ffd8a0'}]],
 ward:[['tiles',.6,{a:'#2a4a4a',b:'#1e3636'}],['pillars',1,{col:'#366060'}],['glowlines',.4,{col:'#bff'}]],
 pinkoffice:[['wallpaper',.4,{}],['banners',1,{col:'#c8161d'}],['clouds',1.4,{n:3,col:'rgba(255,255,255,.2)'}]],
 mansion:[['wallpaper',.4,{s:50}],['pillars',1,{col:'#3a2a1a'}],['embers',1.3,{n:14,col:'#ffd87a'}]],
 throne:[['bricks',.4,{}],['banners',1,{col:'#8c1d18'}],['pillars',1,{}]],
 hillvalley:[['stars',0,{n:60}],['skyline',.6,{dark:true}],['skyline',1.2,{}],['embers',1.6,{n:20,col:'#bfe0ff'}]],
 rust:[['bricks',.4,{}],['fog',.9,{n:14}],['glowlines',.6,{col:'#9b2d1f'}],['fog',1.5,{n:8}]],
 raccoon:[['skyline',.5,{dark:true,tall:1.2,win:'#ff7a3a'}],['embers',1.4,{n:70,col:'#ff6a2a'}],['fog',1,{n:6,col:'rgba(255,120,60,.14)'}]],
 sewer:[['bricks',.5,{}],['waves',1,{col:'#58b87a'}],['fog',1.3,{n:8,col:'rgba(120,200,120,.14)'}]],
 castle:[['bricks',.3,{}],['arches',.9,{glow:'#c8161d'}],['fog',1.4,{n:6}]],
 antarctic:[['mountains',.4,{}],['snow',1.6,{n:140}],['fog',1.1,{n:14}]],
 rlyeh:[['waves',.6,{}],['pillars',1,{col:'#0b2a2a'}],['fog',1.2,{n:10,col:'rgba(120,255,160,.13)'}]],
 rainbow:[['stars',0,{n:90}],['stripes',1.2,{}],['stars',1.9,{n:30,size:3}]],
 candy:[['clouds',.5,{n:6,col:'rgba(255,255,255,.4)'}],['swirls',1.1,{}],['swirls',1.8,{n:6}]],
 board:[['tiles',.8,{s:60,a:'#c9e2c0',b:'#a8d2a0'}],['pillars',1,{col:'#8a2a1a'}]],
 smb3:[['tiles',.7,{s:44,a:'#f0a04a',b:'#d9822b'}],['clouds',1.2,{n:7}]],
 clue:[['wallpaper',.4,{}],['tiles',.8,{s:56,a:'rgba(0,0,0,.25)',b:'rgba(0,0,0,0)'}],['pillars',1,{col:'#2a1a3a'}]],
 hyrule:[['stars',0,{n:60}],['mountains',.4,{}],['fog',1,{n:10,col:'rgba(180,140,255,.14)'}],['embers',1.5,{n:30,col:'#ffd23c'}]],
 lair:[['mountains',.4,{col:'#2a1712'}],['glowlines',.6,{col:'#c8161d'}],['embers',1.4,{n:70,col:'#ff5a1f'}]],
 greenhill:[['clouds',.5,{n:6}],['tiles',.8,{s:52,a:'#c98a3a',b:'#a86a22'}],['hills',1,{}]]
};
const BASE={station:1,hillvalley:1,rlyeh:1,hyrule:1,rainbow:1,matrix:1,city:1,circuit:1,antarctic:0,candy:0,greenhill:0,smb3:0,board:0,pinkoffice:0};
function makeScene(key,pal,W,H){const preset=PRESETS[key]||PRESETS.station,r=rng(hashStr(key));const mk=()=>{const c=document.createElement('canvas');c.width=Math.max(8,Math.ceil(W));c.height=Math.max(8,Math.ceil(H));return c;};
 const base=mk(),bg=base.getContext('2d');const gr=bg.createLinearGradient(0,0,0,H);
 const top=key==='candy'?'#7a3cff':key==='rainbow'?'#0b0b2a':key==='greenhill'||key==='smb3'?'#58b8ff':key==='pinkoffice'?'#f6c0e0':pal[1];gr.addColorStop(0,top);gr.addColorStop(1,key==='candy'?'#ff7ac6':key==='greenhill'||key==='smb3'?'#c8ecff':mixHex(pal[1],pal[0],.28));bg.fillStyle=gr;bg.fillRect(0,0,W,H);
 const layers=preset.map(([style,speed,opt])=>{const c=mk(),g=c.getContext('2d');S[style](g,W,H,pal,r,opt||{});return{c,speed};});
 // vignette (screen-space) so the arena reads against the margins
 return{draw(x,t,boost=1,fx0=0,fx1=W){x.drawImage(base,0,0);const a=Math.max(0,Math.floor(fx0)),b=Math.min(W,Math.ceil(fx1)),w=b-a;if(w<=0)return;
  for(const L of layers){if(!L.speed){x.drawImage(L.c,a,0,w,H,a,0,w,H);continue;}const y=((t*38*L.speed*boost)%H+H)%H;x.drawImage(L.c,a,0,w,H-y,a,y,w,H-y);if(y>0)x.drawImage(L.c,a,H-y,w,y,a,0,w,y);}}};}
function mixHex(a,b,t){const pa=parseInt(a.slice(1),16),pb=parseInt(b.slice(1),16);const f=s=>Math.round(((pa>>s&255)*(1-t)+(pb>>s&255)*t));return `rgb(${f(16)},${f(8)},${f(0)})`;}
Object.assign(exports,{makeScene,PRESETS});
