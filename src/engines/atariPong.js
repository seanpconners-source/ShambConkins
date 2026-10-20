// Pong (Atari, 1972) remake: black screen, white block paddles, square ball, dashed net and blocky score digits,
// with each player's head riding the back of their paddle as a 1-bit dithered bitmap. CRT persistence, glow and
// scanlines. Landscape plays left/right like the cabinet; portrait phones turn the court so P1 is bottom, P2 top.
const {clamp}=require("src/utils.js");
const {voice,keyboard}=require("src/engines/tarantinoKit.js");
const {vibrate}=require("src/audio.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");

// 3x5 Pong score digits.
const DIGITS=['111101101101111','001001001001001','111001111100111','111001111001111','101101111001001','111100111001111','111100111101111','111001001001001','111101111101111','111101111001111'];
function drawDigits(x,n,cx,top,cell){const str=String(n);const w=cell*3,gap=cell;const total=str.length*w+(str.length-1)*gap;let left=cx-total/2;for(const ch of str){const d=DIGITS[+ch]||DIGITS[0];for(let r=0;r<5;r++)for(let c=0;c<3;c++)if(d[r*3+c]==='1')x.fillRect(Math.round(left+c*cell),Math.round(top+r*cell),Math.ceil(cell),Math.ceil(cell));left+=w+gap;}}

// A head as a 1-bit (white on black) ordered-dither bitmap, like a picture on a 1972 monochrome monitor.
function ditherHead(s,i,N=22){
 const src=document.createElement('canvas');src.width=src.height=N;const g=src.getContext('2d');g.imageSmoothingEnabled=true;
 try{s.sprite(g,i,N/2,N/2,N*1.3,{exact:true,mood:'normal'});}catch{}
 const out=document.createElement('canvas');out.width=out.height=N;const o=out.getContext('2d');
 let im;try{im=g.getImageData(0,0,N,N);}catch{return out;}
 const d=im.data,gray=new Float32Array(N*N),op=new Uint8Array(N*N);let lo=255,hi=0;
 for(let p=0;p<N*N;p++){op[p]=d[p*4+3]>120?1:0;if(op[p]){const v=d[p*4]*.3+d[p*4+1]*.59+d[p*4+2]*.11;gray[p]=v;lo=Math.min(lo,v);hi=Math.max(hi,v);}}
 // histogram-equalise the face, then Floyd-Steinberg it to pure white/black
 const vals=[];for(let p=0;p<N*N;p++)if(op[p])vals.push(gray[p]);vals.sort((m,n)=>m-n);const rank=v=>{let l=0,h=vals.length;while(l<h){const m=(l+h)>>1;if(vals[m]<v)l=m+1;else h=m;}return l/Math.max(1,vals.length);};
 const e=new Float32Array(N*N);for(let p=0;p<N*N;p++)e[p]=op[p]?Math.pow(rank(gray[p]),.85):0;
 const res=o.createImageData(N,N);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const p=y*N+x;if(!op[p])continue;
  const edge=x===0||y===0||x===N-1||y===N-1||!op[p-1]||!op[p+1]||!op[p-N]||!op[p+N];
  const on=edge||e[p]>.5,err=e[p]-(on?1:0);
  if(!edge){if(x+1<N&&op[p+1])e[p+1]+=err*7/16;if(y+1<N){if(x>0&&op[p+N-1])e[p+N-1]+=err*3/16;if(op[p+N])e[p+N]+=err*5/16;if(x+1<N&&op[p+N+1])e[p+N+1]+=err/16;}}
  if(on){res.data[p*4]=res.data[p*4+1]=res.data[p*4+2]=255;res.data[p*4+3]=255;}}
 o.putImageData(res,0,0);return out;
}

async function pong(s){
 const [c,x]=s.canvas(680,400,{fill:true});s.shared=true;s.updateScores();s.controls([]);s.body.classList.add('drag-arena-body');s.ownHud(true,true);
 const TARGET=7,CAP=120;
 const st={score:[0,0],pv:[.5,.5],ball:{u:.5,v:.5,du:0,dv:0},hits:0,serve:1.4,serveTo:s.random()<.5?0:1,time:0,flash:[0,0],over:false};
 const keys=[{u:false,d:false},{u:false,d:false}];
 keyboard(s,(i,name,down)=>{if(name==='u'||name==='d')keys[i][name]=down;});
 const heads=[null,null];let headAge=99;
 let L=1,Wd=1,fx=0,fy=0,portrait=false;
 function layout(){const W=s.W,H=s.H;portrait=H>W*1.08;if(portrait){const top=48;fx=0;fy=top;L=H-top-8;Wd=W;}else{fx=0;fy=0;L=W;Wd=H;}}
 // field (u along play, v across; both 0..1) -> screen
 const sx=(u,v)=>portrait?fx+v*Wd:fx+u*L, sy=(u,v)=>portrait?fy+(1-u)*L:fy+v*Wd;
 const dims=()=>{const k=Math.min(L,Wd),b=clamp(k*.026,8,18),hs=clamp(k*.13,40,80),len=Math.max(Wd*.165,58),inset=hs+b*1.6+8;return {k,b,hs,len,inset};};
 // pointer ownership: P1 left (landscape) or bottom (portrait)
 const fingers=new Map();
 const cpu=isCpu(s);let cpuHits=-1,cpuErr=0;
 const owner=p=>cpu?0:portrait?(p.y>s.H/2?0:1):(p.x<s.W/2?0:1);
 const aim=(i,p)=>{const v=portrait?(p.x-fx)/Wd:(p.y-fy)/Wd;st.pv[i]=v;};
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const p=s.pointer(ev),i=owner(p);fingers.set(ev.pointerId,i);s.capture(ev);aim(i,p);});
 s.on(c,'pointermove',ev=>{const i=fingers.get(ev.pointerId);if(i===undefined||s.paused)return;ev.preventDefault();aim(i,s.pointer(ev));});
 for(const t of ['pointerup','pointercancel'])s.on(c,t,ev=>{fingers.delete(ev.pointerId);s.release(ev);});
 s.resetOnPause(()=>{fingers.clear();for(const k of keys)k.u=k.d=false;});
 s.hint('Drag on your own side to move your paddle (P1 left or bottom, P2 right or top). Where the ball hits the paddle sets the angle; it speeds up after 4 and 12 hits. First to 7. Keys: P1 W/S, P2 ↑/↓.');
 // CRT overlay pieces
 let scan=null,vig=null,vigKey='';
 function crt(W,H){if(!scan){const t=document.createElement('canvas');t.width=1;t.height=3;const g=t.getContext('2d');g.fillStyle='rgba(0,0,0,.28)';g.fillRect(0,2,1,1);scan=x.createPattern(t,'repeat');}
  x.fillStyle=scan;x.fillRect(0,0,W,H);const key=W+'x'+H;if(key!==vigKey){vigKey=key;vig=x.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.hypot(W,H)*.62);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.62)');}x.fillStyle=vig;x.fillRect(0,0,W,H);}
 function serve(){const r=s.random();st.ball={u:.5,v:.25+r*.5,du:0,dv:0};st.hits=0;const dir=st.serveTo===0?-1:1;st.ball.du=dir*.5;st.ball.dv=(s.random()-.5)*.5;}
 const SEG=[-1,-.66,-.38,-.14,.14,.38,.66,1];
 if(!await s.pass(0,`${s.players[0].name} vs ${s.players[1].name}. Set the phone flat between you: ${s.players[0].name} takes the ${'left / bottom'} paddle, ${s.players[1].name} the ${'right / top'}. First to ${TARGET}.`,'Both ready — serve!'))return;
 x.fillStyle='#000';x.fillRect(0,0,s.W,s.H);
 s.frame(dt=>{
  const W=s.W,H=s.H;layout();const D=dims();st.time+=dt;headAge+=dt;
  if(headAge>.6&&st.time<8){headAge=0;const n=Math.round(D.hs/2);heads[0]=ditherHead(s,0,n);heads[1]=ditherHead(s,1,n);}
  const hl=D.len/2/Wd,bu=D.b/L,bv=D.b/Wd,pu=[D.inset/L,1-D.inset/L];
  for(let i=0;i<2;i++){const k=keys[i];const flip=portrait&&i===1?1:1;st.pv[i]+=((k.d?1:0)-(k.u?1:0))*flip*1.5*dt;st.pv[i]=clamp(st.pv[i],hl*.6,1-hl*.6);st.flash[i]=Math.max(0,st.flash[i]-dt);}
  // vs CPU: P2 slides toward the ball while it's coming, with an aim error that's re-rolled on every return
  if(cpu){const b=st.ball,sk=cpuSkill(s);if(cpuHits!==st.hits){cpuHits=st.hits;cpuErr=(s.random()-.5)*(1.15-sk)*hl*2.6;}const coming=st.serve<=0&&b.du>0,tgt=coming?b.v+cpuErr:.5+(b.v-.5)*.3,spd=(.55+sk*1.05)*(coming?1:.5);st.pv[1]=clamp(st.pv[1]+clamp(tgt-st.pv[1],-spd*dt,spd*dt),hl*.6,1-hl*.6);}
  if(!st.over){
   if(st.serve>0){st.serve-=dt;if(st.serve<=0)serve();}
   else{
    const b=st.ball,mult=st.hits>=12?1.5:st.hits>=4?1.22:1,speed=(.52+Math.min(st.hits,30)*.006)*mult*(L>Wd?1:1.12);
    const pu0=b.u;b.u+=Math.sign(b.du)*speed*dt;b.v+=b.dv*speed*dt*(L/Wd);
    if(b.v<bv/2){b.v=bv/2;b.dv=Math.abs(b.dv);voice(226,.016,.06,'square');}
    if(b.v>1-bv/2){b.v=1-bv/2;b.dv=-Math.abs(b.dv);voice(226,.016,.06,'square');}
    for(let i=0;i<2;i++){const face=i===0?pu[0]+bu:pu[1]-bu;const crossing=i===0?(b.du<0&&pu0>=face&&b.u<=face):(b.du>0&&pu0<=face&&b.u>=face);
     if(crossing&&Math.abs(b.v-st.pv[i])<=hl+bv/2){const f=clamp((b.v-st.pv[i])/(hl+bv/2),-.999,.999),q=Math.floor((f+1)/2*8);b.u=face;b.du=i===0?1:-1;b.dv=SEG[q]*.9;st.hits++;voice(459,.035,.07,'square');s.react?.(i,'happy',.4);vibrate(6);}}
    if(b.u<-.03||b.u>1.03){const scorer=b.u<0?1:0;st.score[scorer]++;st.flash[scorer]=1.2;st.serveTo=1-scorer;st.serve=1.1;st.ball.du=0;voice(490,.257,.07,'square');vibrate(20);s.react?.(scorer,'win',1.4);s.react?.(1-scorer,'sad',1.4);s.setScores(st.score);
     if(st.score[scorer]>=TARGET){st.over=true;setTimeout(()=>s.finish(st.score,`Pong · ${st.score[0]}–${st.score[1]}`),1300);}}
   }
   if(st.time>=CAP&&!st.over){st.over=true;s.finish(st.score,`Pong · time · ${st.score[0]}–${st.score[1]}`);}
  }
  // draw: phosphor persistence instead of a hard clear
  x.globalCompositeOperation='source-over';x.fillStyle='rgba(0,0,0,.5)';x.fillRect(0,0,W,H);
  x.save();x.fillStyle='#fff';x.shadowColor='rgba(255,255,255,.85)';x.shadowBlur=D.b*.9;
  // net
  const seg=D.b*1.1;for(let v=seg*.5;v<Wd;v+=seg*2.2){if(portrait)x.fillRect(fx+v,fy+L/2-D.b*.35,seg,D.b*.7);else x.fillRect(fx+L/2-D.b*.35,fy+v,D.b*.7,seg);}
  // scores
  const cell=clamp(D.k*.024,6,17);
  for(let i=0;i<2;i++){x.globalAlpha=st.flash[i]>0&&Math.sin(st.flash[i]*22)>0?.35:1;
   if(portrait)drawDigits(x,st.score[i],W*.82,i===0?fy+L/2+cell*2:fy+L/2-cell*7,cell);
   else drawDigits(x,st.score[i],i===0?L*.32:L*.68,fy+cell*2,cell);}
  x.globalAlpha=1;
  // paddles
  for(let i=0;i<2;i++){const cu=pu[i],cv=st.pv[i];if(portrait){const X=sx(cu,cv),Y=sy(cu,cv);x.fillRect(X-D.len/2,Y-D.b/2,D.len,D.b);}else{const X=sx(cu,cv),Y=sy(cu,cv);x.fillRect(X-D.b/2,Y-D.len/2,D.b,D.len);}}
  // ball (blinks before the serve)
  if(st.serve<=0&&!st.over||st.serve>0&&!st.over&&Math.sin(st.time*14)>0&&st.serve<.6){const b=st.serve>0?{u:.5,v:st.ball.v}:st.ball;const X=sx(b.u,b.v),Y=sy(b.u,b.v);x.fillRect(X-D.b/2,Y-D.b/2,D.b,D.b);}
  // last 15 seconds: blocky countdown on the net
  const left=Math.ceil(CAP-st.time);if(left<=15&&!st.over){x.globalAlpha=.7;drawDigits(x,left,portrait?W*.18:L/2,portrait?fy+L/2-cell*2.5:H-cell*7,cell*.6);x.globalAlpha=1;}
  x.restore();
  // heads ride the back of each paddle
  x.save();x.imageSmoothingEnabled=false;
  for(let i=0;i<2;i++){const img=heads[i];if(!img)continue;const back=i===0?pu[0]-(D.b/2+5+D.hs/2)/L:pu[1]+(D.b/2+5+D.hs/2)/L;const X=sx(back,st.pv[i]),Y=sy(back,st.pv[i]);const bob=st.flash[i]>0?Math.sin(st.flash[i]*18)*D.hs*.12:0;x.drawImage(img,Math.round(X-D.hs/2),Math.round(Y-D.hs/2+bob),Math.round(D.hs),Math.round(D.hs));}
  x.restore();
  crt(W,H);
  s.debug={engine:'pong',state:st,keys,fingers,portrait,layout:{L,Wd,fx,fy,...D}};
 });
}
Object.assign(exports,{pong,ditherHead,drawDigits});
