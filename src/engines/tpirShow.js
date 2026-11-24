// THE PRICE IS RIGHT (game id price-bid-off, engine 'partyPrice'; owner, Nov 24: one Arcade entry for every Price Is Right
// game, with the old "Come On Down!" game's Arcade background, logo and icon; the old whole-episode game, priceShow.js, is gone).
// A title screen first: the curtain goes up on the Arcade background while the show's theme plays (on a loop), the logo drops in
// and the pricing games sit on lit-up cards. Tap one and it runs in this same session (s.fromMenu = it skips its own start card
// and theme: the theme fades into its music bed). More pricing games = one more row in PRICING_GAMES; once they're all built the
// owner wants a whole episode just like the show (Contestants' Row, pricing games, wheel, Showcase) as another entry here.
// 1P vs CPU and 2P one phone: you pick. Online: seat 0's phone picks and sends {tpir:id}; the other phone shows who is picking.
// Board: no menu, the game comes from the seed. Scores and personal bests are kept per pricing game (session.scoreAs).
const ST=require("src/engines/gameshow/stage.js");
const SS=require("src/data/showSprites.js");
const {clamp,seededRandom}=require("src/utils.js");
const {holdMusic,releaseMusic,vibrate}=require("src/audio.js");
const {isOnline}=require("src/engines/cpuKit.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const TAU=Math.PI*2;
// the pricing games: id (= its own game id, for scores), card title, its show-art logo slot, one line, the engine
const PRICING_GAMES=[
 {id:'plinko-show',title:'PLINKO',logo:'plinko-logo',sub:'Price small prizes for chips, drop them for up to $50,000',col:'#1b4fd0',run:s=>require("src/engines/plinkoShow.js").plinko(s)},
 {id:'big-wheel',title:'THE BIG WHEEL',logo:'wheel-logo',sub:'Spin! Closest to $1.00 without going over',col:'#c8102e',run:s=>require("src/engines/bigWheel.js").bigWheel(s)}];
const BG='keyart:price-bid-off',LOGO='keyart:price-bid-off-logo';
async function tpirShow(s){
 const board=s.origin==='board';
 if(board){const R=seededRandom(`${s.seed}:tpir`),g=PRICING_GAMES[Math.floor(R()*PRICING_GAMES.length)];s.scoreAs=g.id;return g.run(s);}
 const [c,x]=s.canvas(900,560,{fill:true});const fb=fullBleed(s,{bg:'#14062e'});
 const net=isOnline(s)?s.online:null,picker=!net||net.me===0,names=s.players.map(p=>p.name||'Player');
 const snd=ST.createShowSound({}),sfx=snd.sfx;holdMusic(6*3600);s.cleanup(()=>{snd.stop();releaseMusic();});
 let W=s.W,H=s.H,t=0,open=0,closing=0,chosen=-1,chosenT=0,done=false,cards=[],L={};
 await SS.ready([BG,LOGO,'curtain','plinko-logo','wheel-logo'],4000);if(!s.alive)return;
 snd.title(true,{loop:true});snd.crowd(3,.8,{at:.4});
 function layout(){W=s.W;H=s.H;const top=(fb.top||44)+4,fs=clamp(Math.min(W,H)*.042,12,22),wide=W>H*1.15,n=PRICING_GAMES.length+1;
  if(wide){const lw=Math.min(W*.44,(H-top)*1.6),lx=W*.27,ly=top+(H-top)*.46,cw=Math.min(W*.42,fs*21),gap=fs*.7,ch=Math.min(fs*6.2,(H-top-fs*4-gap*(n-1))/n),cx=W*.75-cw/2,cy=top+fs*2.4+((H-top-fs*3.4)-(ch*n+gap*(n-1)))/2;
   L={wide,fs,top,logo:{x:lx,y:ly,w:lw},head:{x:W*.75,y:cy-fs*1.1},cards:Array.from({length:n},(_,i)=>({x:cx,y:cy+i*(ch+gap),w:cw,h:ch})),foot:{x:lx,y:H-fs*1.4}};}
  else{const lw=Math.min(W*.9,(H-top)*.62),lh=lw*.5,ly=top+lh/2+fs*.2,avail=H-(ly+lh/2)-fs*5.8,gap=fs*.6,ch=Math.min(fs*6.4,(avail-gap*(n-1))/n),cw=Math.min(W*.9,fs*22),cy=ly+lh/2+fs*2.2+Math.max(0,(avail-(ch*n+gap*(n-1)))/2);
   L={wide,fs,top,logo:{x:W/2,y:ly,w:lw},head:{x:W/2,y:cy-fs*1},cards:Array.from({length:n},(_,i)=>({x:(W-cw)/2,y:cy+i*(ch+gap),w:cw,h:ch})),foot:{x:W/2,y:H-fs*2.5}};}}
 const txt=(g,str,x0,y0,size,col,{font='"SC Nunito",sans-serif',w=900,align='center',max=0}={})=>{g.save();g.font=`${w} ${size}px ${font}`;if(max){const m=g.measureText(str).width;if(m>max)g.font=`${w} ${size*max/m}px ${font}`;}g.textAlign=align;g.textBaseline='middle';g.lineWidth=size*.28;g.strokeStyle='rgba(0,0,0,.75)';g.lineJoin='round';g.strokeText(str,x0,y0);g.fillStyle=col;g.fillText(str,x0,y0);g.restore();};
 // marquee bulbs chasing round a rounded box
 function bulbs(g,b,r,n,lit){const per=2*(b.w+b.h);for(let i=0;i<n;i++){let d=i/n*per,px,py;if(d<b.w){px=b.x+d;py=b.y;}else if((d-=b.w)<b.h){px=b.x+b.w;py=b.y+d;}else if((d-=b.h)<b.w){px=b.x+b.w-d;py=b.y+b.h;}else{d-=b.w;px=b.x;py=b.y+b.h-d;}
  const on=lit||((i+Math.floor(t*9))%3===0);g.fillStyle=on?'#fff6c0':'#7a5a20';g.beginPath();g.arc(px,py,r,0,TAU);g.fill();if(on){g.fillStyle='rgba(255,240,160,.25)';g.beginPath();g.arc(px,py,r*2.2,0,TAU);g.fill();}}}
 function drawBg(g){const pic=SS.picture(BG);if(pic){const z=1.04+.03*Math.sin(t*.15),k=Math.max(W/pic.width,H/pic.height)*z,w=pic.width*k,h=pic.height*k;g.drawImage(pic,(W-w)/2+Math.sin(t*.1)*W*.01,(H-h)/2,w,h);}else ST.drawStage(g,W,H,'plinko',t);
  const sh=g.createLinearGradient(0,0,L.wide?W:0,L.wide?0:H);if(L.wide){sh.addColorStop(0,'rgba(20,6,46,.25)');sh.addColorStop(.48,'rgba(20,6,46,.35)');sh.addColorStop(.62,'rgba(20,6,46,.82)');sh.addColorStop(1,'rgba(20,6,46,.9)');}
  else{sh.addColorStop(0,'rgba(20,6,46,.35)');sh.addColorStop(.3,'rgba(20,6,46,.55)');sh.addColorStop(.5,'rgba(20,6,46,.85)');sh.addColorStop(1,'rgba(20,6,46,.92)');}g.fillStyle=sh;g.fillRect(0,0,W,H);}
 function drawLogo(g){const pic=SS.picture(LOGO),drop=clamp((t-1.2)/.7,0,1),e=1-Math.pow(1-drop,3),bounce=drop<1?0:Math.sin(Math.min(1,(t-1.9)/.5)*Math.PI)*.04*Math.max(0,1-(t-1.9)/.5),pulse=1+.015*Math.sin(t*2.4)+bounce;
  if(drop<=0)return;const {x:lx,y:ly,w}=L.logo,yy=ly-(1-e)*H*.6;g.save();g.translate(lx,yy);g.scale(pulse,pulse);
  if(pic){const h=w*pic.height/pic.width,lim=L.wide?H*.62:w*.55,k=Math.min(1,lim/h);g.drawImage(pic,-w*k/2,-h*k/2,w*k,h*k);
   // a shine sweeping across the letters every few seconds
   const sw=((t-2)%4.5)/1.2;if(sw>0&&sw<1){g.globalCompositeOperation='lighter';const gx=-w*k/2+sw*w*k*1.4-w*k*.2,gr=g.createLinearGradient(gx-w*.08,0,gx+w*.08,0);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.5,'rgba(255,255,220,.22)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(-w*k/2,-h*k/2,w*k,h*k);}}
  else{const fs=w*.13;txt(g,'THE PRICE',0,-fs*1.1,fs,'#ffe23a',{font:'"SC Bangers",Impact,sans-serif'});txt(g,'IS RIGHT',0,0,fs*1.2,'#ff3d6e',{font:'"SC Bangers",Impact,sans-serif'});txt(g,'COME ON DOWN!',0,fs*1.05,fs*.5,'#fff');}
  g.restore();}
 function drawCards(g){const fs=L.fs;cards=[];
  const head=picker?'PICK A PRICING GAME':`${names[0].toUpperCase()} IS PICKING A GAME…`;txt(g,head,L.head.x,L.head.y,fs*1.05,'#ffd75a',{max:L.cards[0].w});
  L.cards.forEach((b,i)=>{const pg=PRICING_GAMES[i],soon=!pg,inT=clamp((t-1.6-i*.18)/.45,0,1),e=1-Math.pow(1-inT,3);if(inT<=0)return;
   const isChosen=chosen===i,fade=chosen>=0&&!isChosen?Math.max(.15,1-chosenT*2):1,pop=isChosen?1+.05*Math.sin(Math.min(1,chosenT/.3)*Math.PI):1;
   g.save();g.globalAlpha=e*fade*(soon?.62:1);g.translate(b.x+b.w/2+(1-e)*(L.wide?W*.3:0),b.y+b.h/2+(1-e)*(L.wide?0:H*.2));g.scale(pop,pop);const bx={x:-b.w/2,y:-b.h/2,w:b.w,h:b.h};
   const gr=g.createLinearGradient(0,bx.y,0,bx.y+bx.h);gr.addColorStop(0,soon?'#3a2a50':pg.col);gr.addColorStop(1,soon?'#1a1028':'#14062e');g.fillStyle=gr;g.beginPath();g.roundRect(bx.x,bx.y,bx.w,bx.h,fs*.8);g.fill();
   g.strokeStyle=isChosen&&Math.floor(chosenT*10)%2?'#fff':soon?'#8a7aa0':'#ffd75a';g.lineWidth=Math.max(2,fs*.2);g.stroke();
   if(!soon)bulbs(g,{x:bx.x+fs*.5,y:bx.y+fs*.5,w:bx.w-fs,h:bx.h-fs},Math.max(1.6,fs*.13),Math.round((bx.w+bx.h)/(fs*1.1)),isChosen);
   if(soon){txt(g,'MORE GAMES COMING SOON',0,-fs*.55,fs*1.05,'#d8c8f0',{max:bx.w*.86});txt(g,'Contestants’ Row · Cliff Hangers · Showcase…',0,fs*.85,fs*.66,'#b9a8d8',{w:800,max:bx.w*.86});}
   else{const pic=SS.picture(pg.logo),lh=bx.h*.52;let ly=-bx.h*.14;
    if(pic){const k=Math.min(lh/pic.height,bx.w*.7/pic.width);g.drawImage(pic,-pic.width*k/2,ly-pic.height*k/2,pic.width*k,pic.height*k);}
    else txt(g,pg.title,0,ly,Math.min(lh*.7,fs*2),'#ffe23a',{font:'"SC Bangers",Impact,sans-serif',w:400,max:bx.w*.8});
    txt(g,pg.sub,0,bx.h*.3,fs*.66,'#fff',{w:800,max:bx.w*.86});}
   g.restore();if(!soon)cards.push({...b,i});});
  txt(g,picker?'TAP A GAME TO PLAY':'',L.wide?L.head.x:L.foot.x,L.wide?H-fs*1.2:L.foot.y,fs*.7,'#bfe7ff',{w:800});
  {const who=names.map(n=>n.toUpperCase()).join('  ·  ');txt(g,`CONTESTANTS: ${who}`,L.wide?L.logo.x:W/2,L.wide?H-fs*1.2:H-fs*3.7,fs*.62,'#fff',{w:800,max:W*(L.wide?.45:.9)});}}
 function draw(){layout();const g=x;g.setTransform(s.dpr||1,0,0,s.dpr||1,0,0);drawBg(g);drawLogo(g);drawCards(g);
  // the curtain: up at the start, back down once a game is picked
  ST.drawCurtain(g,W,H,closing>0?1-closing:open,t);}
 let resolvePick=null;
 function pick(i){if(chosen>=0||!PRICING_GAMES[i])return;chosen=i;chosenT=0;sfx.ding();snd.crowd(2.2,.9);vibrate(20);if(net&&picker)net.send({tpir:PRICING_GAMES[i].id});setTimeout(()=>{snd.title(false);},500);setTimeout(()=>{const r=resolvePick;resolvePick=null;r?.();},1700);}
 s.on(c,'pointerdown',ev=>{if(s.paused||done||!picker||t<1.7)return;ev.preventDefault();const pt=s.pointer(ev);for(const b of cards)if(pt.x>=b.x&&pt.x<=b.x+b.w&&pt.y>=b.y&&pt.y<=b.y+b.h){pick(b.i);return;}});
 s.on(document,'keydown',ev=>{if(done||!picker||s.paused)return;const n=+ev.key;if(n>=1&&n<=PRICING_GAMES.length)pick(n-1);});
 s.frame(dt=>{if(done)return;dt=Math.min(dt,.05);t+=dt;open=clamp((t-.3)/1.5,0,1);if(chosen>=0){chosenT+=dt;closing=clamp((chosenT-.9)/.75,0,1);}draw();});
 s.debug={menu:true,games:PRICING_GAMES.map(g=>g.id),pick:id=>{const i=PRICING_GAMES.findIndex(g=>g.id===id||g.title===id);pick(i<0?0:i);},get chosen(){return chosen;},get cards(){return cards.map(b=>({x:b.x,y:b.y,w:b.w,h:b.h,id:PRICING_GAMES[b.i].id}));},
  bot:()=>{if(picker&&chosen<0&&t>1.7)pick(Math.floor(Math.random()*PRICING_GAMES.length));return chosen>=0?'picked':'';}};
 // wait for the pick (this phone's tap, or the picker's phone online)
 if(picker)await new Promise(r=>{resolvePick=r;});
 else{for(;;){const m=await net.next();if(!m||!s.alive)return;if(m.tpir){const i=PRICING_GAMES.findIndex(g=>g.id===m.tpir);if(i>=0){pick(i);await new Promise(r=>{resolvePick=r;});break;}}}}
 if(!s.alive)return;done=true;const g=PRICING_GAMES[chosen];s.scoreAs=g.id;s.fromMenu=true;return g.run(s);}
Object.assign(exports,{tpirShow,PRICING_GAMES});
