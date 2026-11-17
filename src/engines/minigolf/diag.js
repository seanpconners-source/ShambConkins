// Sitabout Mini Golf diagnostics: the phone's own numbers, since a phone can't run a profiler.
// - deviceInfo(glx): browser, screen, pixel ratio, graphics chip, memory/cores, and a guess at whether 2D canvases live on
//   the graphics chip (reading one pixel back has to wait for the chip when they do; it is instant when they don't)
// - createBench(env): ~15 s of small drawing tests on the game's own canvas: the kinds of drawing the game does, the old
//   way (2D canvas) and the new way (WebGL textures), so we see which one this phone is slow at
// - saveJSON(name,obj): a file in Downloads (made the same way as the save backup)

const WARM=15,N=75;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c;};
function noise(c,seed){const g=c.getContext('2d');let n=seed||7;const R=()=>(n=(n*16807)%2147483647)/2147483647;
 g.fillStyle='#2c6e2a';g.fillRect(0,0,c.width,c.height);const k=Math.round(c.width*c.height/2500);
 for(let i=0;i<k;i++){g.fillStyle=`hsl(${R()*140|0},${35+R()*45|0}%,${20+R()*45|0}%)`;g.fillRect(R()*c.width,R()*c.height,3+R()*36,3+R()*36);}return c;}
const big=A=>A.big||(A.big=noise(mk(3840,2048),11));
const atlas=A=>A.atlas||(A.atlas=noise(mk(2048,2048),5));
// 150 sprites spread over the screen, drifting so every frame differs
const spots=(e,f,fn)=>{for(let i=0;i<150;i++){const cx=(i*97+f*2)%(e.W+60)-30,cy=(i*53+(i%7)*31)%(e.H+60)-30;fn(i,cx,cy);}};
const pan=(e,B,f)=>[Math.max(0,(f*7)%Math.max(1,B.width-e.W)),Math.max(0,(f*3)%Math.max(1,B.height-e.H))];
const TESTS=[
 {id:'blank',name:'nothing drawn (frame rate floor)',draw(){}},
 {id:'lawn2d',name:'2D lawn pattern, full screen',setup(e,A){A.lawn=A.lawn||noise(mk(512,512),3);return {p:e.x.createPattern(A.lawn,'repeat')};},
  draw(e,s,f){const x=e.x,o=(f*3)%512;x.save();x.translate(-o,0);x.fillStyle=s.p;x.fillRect(o,0,e.W,e.H);x.restore();}},
 {id:'sheet2d',name:'2D one big sheet 3840x2048, 1:1',setup(e,A){big(A);return {};},draw(e,s,f,A){const B=A.big,[ox,oy]=pan(e,B,f);e.x.drawImage(B,ox,oy,Math.min(e.W,B.width),Math.min(e.H,B.height),0,0,Math.min(e.W,B.width),Math.min(e.H,B.height));}},
 {id:'sheet2ds',name:'2D big sheet, scaled 0.8',setup(e,A){big(A);return {};},draw(e,s,f,A){const B=A.big,[ox,oy]=pan(e,B,f),w=Math.min(B.width-ox,e.W/.8),h=Math.min(B.height-oy,e.H/.8);e.x.drawImage(B,ox,oy,w,h,0,0,w*.8,h*.8);}},
 {id:'tiles2d',name:'2D eight 1024 px tiles',setup(e,A){const B=big(A);if(!A.tiles){A.tiles=[];for(let j=0;j<2;j++)for(let i=0;i<4;i++){const c=mk(1024,1024);c.getContext('2d').drawImage(B,i*940,j*1024,1024,1024,0,0,1024,1024);A.tiles.push(c);}}return {};},
  draw(e,s,f,A){const ox=(f*7)%Math.max(1,4096-e.W),oy=(f*3)%Math.max(1,2048-e.H);for(let j=0;j<2;j++)for(let i=0;i<4;i++){const X=i*1024-ox,Y=j*1024-oy;if(X<e.W&&Y<e.H&&X+1024>0&&Y+1024>0)e.x.drawImage(A.tiles[j*4+i],X,Y);}}},
 {id:'atlas2d',name:'2D 150 sprites from one 2048 sheet',setup(e,A){atlas(A);return {};},draw(e,s,f,A){const T=A.atlas;spots(e,f,(i,cx,cy)=>e.x.drawImage(T,(i*7%32)*64,(i*11%32)*64,64,64,cx,cy,40,40));}},
 {id:'small2d',name:'2D 150 sprites, own small canvases',setup(e,A){const T=atlas(A);if(!A.small){A.small=[];for(let i=0;i<150;i++){const c=mk(64,64);c.getContext('2d').drawImage(T,(i*7%32)*64,(i*11%32)*64,64,64,0,0,64,64);A.small.push(c);}}return {};},
  draw(e,s,f,A){spots(e,f,(i,cx,cy)=>e.x.drawImage(A.small[i],cx,cy,40,40));}},
 {id:'sheetgl',name:'GPU big sheet (texture), 1:1',gl:true,setup(e,A){return {t:e.glx.from(big(A))};},
  draw(e,s,f,A){const B=A.big,[ox,oy]=pan(e,B,f);if(!e.glx.begin(e.W,e.H))return;e.glx.quad(s.t,ox,oy,e.W,e.H,0,0,e.W,e.H);e.glx.end();},free(e,s){e.glx.free(s.t);}},
 {id:'atlasgl',name:'GPU 150 sprites (one texture)',gl:true,setup(e,A){return {t:e.glx.from(atlas(A))};},
  draw(e,s,f){if(!e.glx.begin(e.W,e.H))return;spots(e,f,(i,cx,cy)=>e.glx.quad(s.t,(i*7%32)*64,(i*11%32)*64,64,64,cx,cy,40,40));e.glx.end();},free(e,s){e.glx.free(s.t);}},
 {id:'uploadgl',name:'GPU screen-size upload every frame',gl:true,setup(e){return {c:noise(mk(e.W,e.H),9),slot:{h:null}};},
  draw(e,s,f){const g=s.c.getContext('2d');g.fillStyle=`hsl(${f*9%360},70%,50%)`;g.fillRect((f*13)%e.W,(f*7)%e.H,60,60);if(!e.glx.begin(e.W,e.H))return;const h=e.glx.dyn(s.slot,s.c);e.glx.quad(h,0,0,e.W,e.H,0,0,e.W,e.H);e.glx.end();},
  free(e,s){if(s.slot.h)e.glx.free(s.slot.h);}},

 {id:'paintgpu',name:'Paint + copy squares (chip canvas)',gl:true,setup(e){return paintSetup(e,false);},draw(e,s,f){paintDraw(e,s,f);},free(e,s){e.glx.free(s.t);}},
 {id:'paintcpu',name:'Paint + copy squares (memory canvas)',gl:true,setup(e){return paintSetup(e,true);},draw(e,s,f){paintDraw(e,s,f);},free(e,s){e.glx.free(s.t);}},
];
// what the game does while the scorecard is up: paint ground squares (clip, pattern, gradient, strokes) and copy each into
// a texture; once in a canvas on the graphics chip, once in a canvas in plain memory (what the game uses since v0.99.18)
function paintSetup(e,mem){const k=mem?{willReadFrequently:true}:undefined,src=mk(256,256),c=mk(258,258);src.getContext('2d',k);c.getContext('2d',k);noise(src,4);
 return {src,c,g:c.getContext('2d'),p:c.getContext('2d').createPattern(src,'repeat'),t:e.glx.tex(1032,258)};}
function paintDraw(e,s,f){const g=s.g;
 for(let q=0;q<4;q++){g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,258,258);g.save();g.beginPath();g.moveTo(10+q*9,20);g.lineTo(240,8+f%30);g.lineTo(250,240);g.lineTo(18,230-q*7);g.closePath();g.clip();
  g.setTransform(.9,.1*q,-.1,.86,f%40,q*11);g.fillStyle=s.p;g.fillRect(-60,-60,400,400);g.setTransform(1,0,0,1,0,0);
  const gr=g.createLinearGradient(0,0,0,258);gr.addColorStop(0,'rgba(0,0,0,.05)');gr.addColorStop(1,'rgba(0,0,0,.4)');g.fillStyle=gr;g.fillRect(0,0,258,258);
  g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=3;for(let i=0;i<12;i++){g.beginPath();g.arc(40+i*17,60+(i*37+f)%150,9+i%5,0,6.3);g.stroke();}g.restore();
  e.glx.put(s.t,s.c,q*258,0);}
 if(!e.glx.begin(e.W,e.H))return;e.glx.quad(s.t,0,0,1032,258,0,0,Math.min(e.W,1032),258*Math.min(e.W,1032)/1032);e.glx.end();}
const q=(a,p)=>{if(!a.length)return 0;const s=[...a].sort((u,v)=>u-v);return s[Math.min(s.length-1,Math.floor(s.length*p))];};
const r1=v=>Math.round(v*10)/10;
function createBench(env){
 const A={},res=[];let i=-1,f=0,st=null,cur=null,rows=[],last=0,t0=0;
 const B={done:false,results:res,total:TESTS.length,get index(){return Math.max(0,i);},get name(){return cur?cur.name:'';},
  frame(t){if(B.done)return;const x=env.x;
   if(!cur){i++;if(i>=TESTS.length){B.done=true;A.big=A.atlas=A.lawn=A.tiles=A.small=null;return;}cur=TESTS[i];f=0;rows=[];last=0;
    if(cur.gl&&!env.glx){res.push({id:cur.id,name:cur.name,skip:'no WebGL2'});cur=null;return;}
    try{st=cur.setup?cur.setup(env,A)||{}:{};}catch(err){res.push({id:cur.id,name:cur.name,skip:String(err&&err.message||err)});cur=null;return;}}
   x.setTransform(1,0,0,1,0,0);if(cur.gl)x.clearRect(0,0,env.W,env.H);else{x.fillStyle='#0b1a10';x.fillRect(0,0,env.W,env.H);}
   const a=performance.now();try{cur.draw(env,st,f,A);}catch(err){res.push({id:cur.id,name:cur.name,skip:String(err&&err.message||err)});cur=null;return;}const js=performance.now()-a;
   if(f===WARM)t0=t;if(f>WARM)rows.push([t-last,js]);else if(f===WARM)rows.push([0,js]);last=t;f++;
   if(f>=WARM+N){const g=rows.slice(1).map(r=>r[0]),j=rows.map(r=>r[1]),el=(t-t0)/1000;
    res.push({id:cur.id,name:cur.name,fps:r1((rows.length-1)/Math.max(.001,el)),gap:r1(q(g,.5)),gap90:r1(q(g,.9)),gapMax:r1(Math.max(0,...g)),js:Math.round(q(j,.5)*100)/100,js90:Math.round(q(j,.9)*100)/100});
    try{cur.free&&cur.free(env,st);}catch{}cur=null;}}};
 return B;}

function probe2D(){try{const c=mk(256,256),g=c.getContext('2d');g.fillStyle='#c33';g.fillRect(0,0,256,256);g.drawImage(c,8,8);const t=performance.now();g.getImageData(0,0,1,1);return Math.round((performance.now()-t)*1000)/1000;}catch{return -1;}}
function deviceInfo(glx,extra){const n=typeof navigator!=='undefined'?navigator:{},sc=typeof screen!=='undefined'?screen:{};
 let gl=null;if(glx&&glx.info)gl=glx.info();else{try{const g=mk(4,4).getContext('webgl2')||mk(4,4).getContext('webgl');if(g){const e=g.getExtension('WEBGL_debug_renderer_info');gl={renderer:String(e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)),maxTex:g.getParameter(g.MAX_TEXTURE_SIZE),webgl2:!!(g instanceof (globalThis.WebGL2RenderingContext||Object))};}}catch{}}
 return {ua:n.userAgent||'',dpr:typeof devicePixelRatio==='number'?devicePixelRatio:1,screen:[sc.width||0,sc.height||0],mem:n.deviceMemory||null,cores:n.hardwareConcurrency||null,
  gl,readback2D:probe2D(),standalone:typeof matchMedia==='function'&&matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches,...(extra||{})};}
function stamp(){const d=new Date(),p=v=>String(v).padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;}
function saveJSON(name,obj){try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj)],{type:'application/json'}));a.download=`${name}-${stamp()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);return true;}catch{return false;}}

Object.assign(exports,{createBench,deviceInfo,saveJSON,TESTS});
