// 128 x 32 dot-matrix display (the 1990s orange plasma DMD). Draw into the buffer with text/rect/scene helpers
// (16 shades per dot), then paint() it onto a canvas: the buffer goes up as one image under a round-dot mask.
const W=128,H=32;
// 5x7 font (HD44780-style rows, 5 bits each).
const F={
 '0':[14,17,19,21,25,17,14],'1':[4,12,4,4,4,4,14],'2':[14,17,1,2,4,8,31],'3':[31,2,4,2,1,17,14],'4':[2,6,10,18,31,2,2],
 '5':[31,16,30,1,1,17,14],'6':[6,8,16,30,17,17,14],'7':[31,1,2,4,8,8,8],'8':[14,17,17,14,17,17,14],'9':[14,17,17,15,1,2,12],
 A:[14,17,17,17,31,17,17],B:[30,17,17,30,17,17,30],C:[14,17,16,16,16,17,14],D:[28,18,17,17,17,18,28],E:[31,16,16,30,16,16,31],
 F:[31,16,16,30,16,16,16],G:[14,17,16,23,17,17,15],H:[17,17,17,31,17,17,17],I:[14,4,4,4,4,4,14],J:[7,2,2,2,2,18,12],
 K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],M:[17,27,21,21,17,17,17],N:[17,17,25,21,19,17,17],O:[14,17,17,17,17,17,14],
 P:[30,17,17,30,16,16,16],Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],
 U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,21,10],X:[17,17,10,4,10,17,17],Y:[17,17,17,10,4,4,4],
 Z:[31,1,2,4,8,16,31],'!':[4,4,4,4,0,0,4],'.':[0,0,0,0,0,12,12],',':[0,0,0,0,12,4,8],':':[0,12,12,0,12,12,0],'-':[0,0,0,31,0,0,0],
 '+':[0,4,4,31,4,4,0],'?':[14,17,1,2,4,0,4],"'":[12,4,8,0,0,0,0],'/':[0,1,2,4,8,16,0],'%':[24,25,2,4,8,19,3],'&':[12,18,20,8,21,18,13],
 '*':[0,4,21,14,21,4,0],'#':[10,10,31,10,31,10,10],'x':[0,0,17,10,4,10,17],'(':[2,4,8,8,8,4,2],')':[8,4,2,2,2,4,8],' ':[0,0,0,0,0,0,0],
 '·':[0,0,0,12,12,0,0],'>':[8,4,2,1,2,4,8],'<':[2,4,8,16,8,4,2],'=':[0,0,31,0,31,0,0],
};
// Narrow glyphs: drop empty columns on the right (and left for punctuation).
const glyph={};for(const [k,rows] of Object.entries(F)){let lo=0,hi=4;const col=c=>rows.some(r=>r&(16>>c));if(!/[0-9A-Zx#%&*?=<>]/.test(k)){while(lo<4&&!col(lo))lo++;while(hi>lo&&!col(hi))hi--;}if(k===' '){lo=0;hi=2;}glyph[k]={rows,lo,w:hi-lo+1};}

function createDMD(){
 const buf=new Uint8Array(W*H),d={W,H,buf};
 d.clear=(v=0)=>buf.fill(v);
 d.dot=(x,y,v=15)=>{x|=0;y|=0;if(x>=0&&x<W&&y>=0&&y<H)buf[y*W+x]=Math.max(buf[y*W+x],v);};
 d.set=(x,y,v)=>{x|=0;y|=0;if(x>=0&&x<W&&y>=0&&y<H)buf[y*W+x]=v;};
 d.rect=(x,y,w,h,v=15,fill=true)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(fill||i===0||j===0||i===w-1||j===h-1)d.set(x+i,y+j,v);};
 d.measure=(s,scale=1,sp=1)=>{let n=0;for(const ch of String(s).toUpperCase()){const g=glyph[ch]||glyph['?'];n+=(g.w+sp)*scale;}return Math.max(0,n-sp*scale);};
 // text(str,x,y,{scale,align:'left'|'center'|'right',v,sp})
 d.text=(s,x,y,o={})=>{const scale=o.scale||1,sp=o.sp??1,v=o.v??15;s=String(s).toUpperCase();const w=d.measure(s,scale,sp);if(o.align==='center')x=Math.round(x-w/2);else if(o.align==='right')x=Math.round(x-w);
  for(const ch of s){const g=glyph[ch]||glyph['?'];for(let r=0;r<7;r++)for(let c=0;c<g.w;c++)if(g.rows[r]&(16>>(c+g.lo)))for(let a=0;a<scale;a++)for(let b=0;b<scale;b++)d.set(x+c*scale+a,y+r*scale+b,v);x+=(g.w+sp)*scale;}return w;};
 // Shrink a line until it fits the width.
 d.fit=(s,x,y,o={})=>{let scale=o.scale||1;while(scale>1&&d.measure(s,scale,o.sp??1)>(o.max||W-2))scale--;return d.text(s,x,y,{...o,scale});};
 d.invert=()=>{for(let i=0;i<buf.length;i++)buf[i]=15-buf[i];};
 // Paint into ctx at (x,y,w,h): dots on a dark glass, with a soft orange bloom.
 let img=null,cv=null,mask=null,maskKey='';
 d.paint=(ctx,x,y,w,h,color=[255,104,16])=>{
  if(!cv){cv=document.createElement('canvas');cv.width=W;cv.height=H;img=cv.getContext('2d').createImageData(W,H);}
  const px=img.data;for(let i=0;i<buf.length;i++){const v=buf[i]/15,o=i*4;px[o]=color[0]*v+20*(1-v);px[o+1]=color[1]*v+8*(1-v);px[o+2]=color[2]*v+4*(1-v);px[o+3]=255;}
  cv.getContext('2d').putImageData(img,0,0);
  const key=`${Math.round(w)}x${Math.round(h)}`;
  if(key!==maskKey){maskKey=key;mask=document.createElement('canvas');mask.width=Math.max(1,Math.round(w));mask.height=Math.max(1,Math.round(h));const m=mask.getContext('2d'),cw=mask.width/W,ch=mask.height/H;m.fillStyle='#050302';m.fillRect(0,0,mask.width,mask.height);m.globalCompositeOperation='destination-out';
   for(let j=0;j<H;j++)for(let i=0;i<W;i++){m.beginPath();m.arc((i+.5)*cw,(j+.5)*ch,Math.min(cw,ch)*.42,0,Math.PI*2);m.fill();}}
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(cv,x,y,w,h);ctx.drawImage(mask,x,y,w,h);
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35;ctx.imageSmoothingEnabled=true;ctx.drawImage(cv,x-2,y-2,w+4,h+4);ctx.restore();
 };
 return d;
}
const fmt=n=>Math.round(n).toLocaleString('en-US');
// Standard score screen: current player's score big, players/ball small.
function scoreScene(d,{scores,cur,ball,balls,names,t,credits=''}){
 d.clear();const n=scores.length;
 d.text(`PLAYER ${cur+1}`,1,1,{v:9});d.text(`BALL ${ball}`,127,1,{align:'right',v:9});
 const s=fmt(scores[cur]);d.fit(s,64,10,{scale:2,align:'center',max:124});
 if(n>1){const o=1-cur;d.text(`${(names?.[o]||'P'+(o+1)).slice(0,8)} ${fmt(scores[o])}`,64,25,{align:'center',v:6});}
 else if(credits)d.text(credits,64,25,{align:'center',v:6});
}
// Text splash: 1-3 lines, optional flash (inverts on a beat).
function splashScene(d,{lines,t,flash=false,age=0}){
 d.clear();const L=lines.filter(Boolean);
 if(L.length===1)d.fit(L[0],64,9,{scale:2,align:'center'});
 else if(L.length===2){d.fit(L[0],64,2,{scale:L[0].length<=10?2:1,align:'center'});d.fit(L[1],64,L[0].length<=10?19:16,{scale:L[1].length<=10&&L[0].length>10?2:1,align:'center'});}
 else L.slice(0,3).forEach((s,i)=>d.fit(s,64,2+i*10,{align:'center'}));
 // a border of chasing dots
 for(let i=0;i<W;i+=4){const on=((i>>2)+Math.floor(age*12))%2;d.set(i,0,on?8:0);d.set(127-i,31,on?8:0);}
 if(flash&&Math.floor(age*8)%2&&age<1.2)d.invert();
}
Object.assign(exports,{createDMD,scoreScene,splashScene,DMD_W:W,DMD_H:H});
