// PRICING KIT: what every Price Is Right pricing game shares (Range Game, Safe Crackers, Race Game, Punch-a-Bunch ...): the
// full-screen canvas, the show's sounds, who plays where (you / CPU / the other phone online), the curtain + title + host lines at
// the start, the two contestants one after the other (pass card on one phone), name tags, lit buttons, banners and the result.
// A game gives: kind (studio picture stage-<kind>), clips, and run({title, sub, col, pass, intro, ready, play(i), result()}).
// Online: the contestant's phone decides, the game sends its own small messages with K.net.send and reads them with K.recv().
const ST=require("src/engines/gameshow/stage.js");
const SS=require("src/data/showSprites.js");
const {clamp}=require("src/utils.js");
const {holdMusic,releaseMusic,vibrate}=require("src/audio.js");
const {isCpu,cpuSkill,isOnline}=require("src/engines/cpuKit.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const TAU=Math.PI*2,money=n=>'$'+Math.round(n).toLocaleString('en-US');
function shuffle(a,R){a=a.slice();for(let k=a.length-1;k>0;k--){const j=Math.floor(R()*(k+1));[a[k],a[j]]=[a[j],a[k]];}return a;}
function txt(g,str,x0,y0,size,col,{font='"SC Nunito",sans-serif',w=900,align='center',max=0,base='middle'}={}){g.save();g.font=`${w} ${size}px ${font}`;
 if(max){const m=g.measureText(str).width;if(m>max)g.font=`${w} ${size*max/m}px ${font}`;}g.textAlign=align;g.textBaseline=base;g.lineWidth=size*.28;
 g.strokeStyle='rgba(0,0,0,.75)';g.lineJoin='round';g.strokeText(str,x0,y0);g.fillStyle=col;g.fillText(str,x0,y0);g.restore();}
// marquee bulbs round a box (lit = all on, else chasing)
function bulbs(g,b,r,n,t,lit){const per=2*(b.w+b.h);for(let i=0;i<n;i++){let d=i/n*per,px,py;if(d<b.w){px=b.x+d;py=b.y;}else if((d-=b.w)<b.h){px=b.x+b.w;py=b.y+d;}else if((d-=b.h)<b.w){px=b.x+b.w-d;py=b.y+b.h;}else{d-=b.w;px=b.x;py=b.y+b.h-d;}
 const on=lit||((i+Math.floor(t*9))%3===0);g.fillStyle=on?'#fff6c0':'#7a5a20';g.beginPath();g.arc(px,py,r,0,TAU);g.fill();if(on){g.fillStyle='rgba(255,240,160,.25)';g.beginPath();g.arc(px,py,r*2.2,0,TAU);g.fill();}}}
function createKit(s,{kind,bg='#14062e',clips=[],song=null}={}){
 const [c,x]=s.canvas(900,560,{fill:true});const fb=fullBleed(s,{bg});
 const net=isOnline(s)?s.online:null,me=net?net.me:0,cpu=!net&&isCpu(s),board=s.origin==='board',names=s.players.map(p=>p.name||'Player');
 const snd=ST.createShowSound({clips,...(song?{song}:{})}),sfx=snd.sfx;holdMusic(6*3600);s.cleanup(()=>{snd.stop();releaseMusic();});
 const K={c,x,fb,net,me,cpu,board,names,snd,sfx,kind,t:0,cur:0,mode:'intro',curtain:0,introT:0,banner:null,hostSay:null,hurry:false,
  W:s.W,H:s.H,fs:14,top:40,wide:false,fold:false,hits:[],onTap:null,onDown:null,onMove:null,onUp:null,skill:()=>cpuSkill(s),money,txt,TAU};
 K.cast=ST.createCast();K.spots=null;
 K.present=(secs,pose)=>K.cast.present(secs,pose);
 K.mine=i=>net?i===me:!(cpu&&i===1);
 K.cpuTurn=()=>cpu&&K.cur===1;
 K.waiting=()=>!K.mine(K.cur)||K.cpuTurn();
 K.wait=ms=>new Promise(r=>{const end=performance.now()+ms;const f=()=>{if(!s.alive||K.hurry||performance.now()>=end){K.hurry=false;r();return;}setTimeout(f,30);};f();});
 // real time (the hurry tap doesn't cut it short): clocks, the CPU's thinking
 K.sleep=ms=>new Promise(r=>{const end=performance.now()+ms;const f=()=>{if(!s.alive||performance.now()>=end){r();return;}setTimeout(f,30);};f();});
 K.say=(text,ms=2600)=>{K.hostSay={text,t:ms/1000};if(/actual retail price/i.test(text))snd.voice('say-actual-retail-price');else if(/new car/i.test(text))snd.voice('say-new-car');};
 K.show=(big,small,secs=1.8,col='#ffe23a')=>{K.banner={big,small,t:secs,col};if(col==='#7dff5a'||col==='#ffe23a'){K.cast.cheer(Math.min(3,secs+.4));snd.voice('crowd-cheer',{vol:.8});}else if(col==='#ff6a5a')snd.voice('crowd-aww');};
 // the other phone's next message (online), or null once they've gone
 K.recv=async()=>{const m=await net.next();return m&&s.alive?m:null;};
 // sizes for this frame; a game calls it first in its draw
 K.base=()=>{K.W=s.W;K.H=s.H;K.top=(fb.top||40)+6;K.fs=clamp(Math.min(K.W,K.H)*.04,12,20);K.wide=K.W>K.H*1.15;K.fold=!K.wide&&K.W>K.H*.78;return K;};
 K.begin=()=>{K.base();const g=x;g.setTransform(s.dpr||1,0,0,s.dpr||1,0,0);K.hits=[];ST.drawStage(g,K.W,K.H,kind,K.t);return g;};
 // a lit game-show button; tapping it calls fn (only while it is drawn)
 K.button=(g,b,label,fn,{col='#c8102e',dim=false,size=0}={})=>{const fs=size||Math.min(b.h*.42,K.fs*1.3);g.save();if(dim)g.globalAlpha=.45;
  const gr=g.createLinearGradient(0,b.y,0,b.y+b.h);gr.addColorStop(0,col);gr.addColorStop(1,'#14062e');g.fillStyle=gr;g.beginPath();g.roundRect(b.x,b.y,b.w,b.h,Math.min(b.h*.35,K.fs));g.fill();
  g.strokeStyle='#ffd75a';g.lineWidth=Math.max(2,K.fs*.16);g.stroke();txt(g,label,b.x+b.w/2,b.y+b.h/2+1,fs,'#fff',{font:'"SC Bangers",Impact,sans-serif',w:400,max:b.w*.88});g.restore();
  if(!dim&&fn)K.hits.push({...b,fn});};
 // contestant tags along a box: face, name and a status line per player
 K.tags=(g,T,line,moods=[])=>{const fs=K.fs,th=T.h;names.forEach((n,i)=>{const w=Math.min(T.w/2-6,fs*11),x0=i?T.x+T.w-w:T.x,y0=T.y;
  g.fillStyle=i===K.cur?'rgba(255,226,58,.92)':'rgba(20,6,46,.78)';g.beginPath();g.roundRect(x0,y0,w,th,10);g.fill();
  s.sprite(g,i,x0+fs*1.5,y0+th/2,th*.75,{exact:true,still:true,mood:moods[i]||'normal'});g.fillStyle=i===K.cur?'#14062e':'#fff';g.font=`900 ${fs*.9}px "SC Nunito",sans-serif`;g.textAlign='left';g.textBaseline='middle';
  g.fillText(n.slice(0,12).toUpperCase(),x0+fs*3,y0+th*.31);g.font=`900 ${fs*1.05}px "SC Bangers",Impact,sans-serif`;g.fillText(String(line(i)||'—').slice(0,18),x0+fs*3,y0+th*.69);});};
 // host bubble, curtain, banner (drawn last)
 K.overlay=(g,B)=>{const sp=K.spots||K.cast.spots(K.W,K.H,{foot:K.H-K.fs*3-10});K.cast.draw(g,K.W,K.H,K.t,sp,!!K.hostSay);
  if(K.hostSay){if(K.cast.hv>.5){const b=K.cast.bubbleAt(K.W,K.H,sp,K.fs);ST.bubble(g,b.x,b.y,K.hostSay.text,b.w,K.fs*.85,b.tx,b.ty);}else if(B)ST.bubble(g,B.x,B.y,K.hostSay.text,B.w,K.fs*.85,B.x,B.y+K.fs*2.5);}if(K.mode==='intro')ST.drawCurtain(g,K.W,K.H,K.curtain,K.t);
  if(K.banner)ST.moneyBanner(g,K.W,K.H,K.banner.big,K.banner.small,Math.min(1,K.banner.t*3),K.banner.col);};
 K.inBox=(pt,b)=>pt.x>=b.x&&pt.x<=b.x+b.w&&pt.y>=b.y&&pt.y<=b.y+b.h;
 s.on(c,'pointerdown',ev=>{if(s.paused)return;ev.preventDefault();const pt=s.pointer(ev);for(let i=K.hits.length-1;i>=0;i--){const b=K.hits[i];if(K.inBox(pt,b)){b.fn();vibrate(8);return;}}
  if(K.onDown&&K.onDown(pt))return;if(K.onTap&&K.onTap(pt))return;if(K.mode!=='input')K.hurry=true;});
 s.on(c,'pointermove',ev=>{if(s.paused||!K.onMove)return;K.onMove(s.pointer(ev));});
 s.on(c,'pointerup',ev=>{if(s.paused||!K.onUp)return;K.onUp(s.pointer(ev));});
 s.on(c,'pointercancel',()=>{K.onUp&&K.onUp(null);});
 K.frame=fn=>s.frame(dt=>{dt=Math.min(dt,.05);K.t+=dt;if(K.mode==='intro'){K.introT+=dt;K.curtain=clamp((K.introT-.4)/1.4,0,1);}
  if(K.hostSay){K.hostSay.t-=dt;if(K.hostSay.t<=0)K.hostSay=null;}const playing=K.mode!=='intro'&&K.mode!=='over';if(playing!==K.murOn){K.murOn=playing;snd.murmur(playing);}
  // the audience yells advice while a contestant decides (drop-in crowd-shout takes)
  if(K.mode==='input'){K.yellT=(K.yellT??2)-dt;if(K.yellT<=0){K.yellT=2.4+Math.random()*3.2;snd.voice('crowd-shout',{vol:.55+Math.random()*.3,pan:Math.random()*1.4-.7});}}
  K.cast.step(dt,{host:!!K.hostSay||(K.mode==='intro'&&K.introT>2)||K.mode==='over',model:K.mode==='intro'&&K.introT>2.4});if(K.banner){K.banner.t-=dt;if(K.banner.t<=0)K.banner=null;}fn(dt);});
 // the show: start card, curtain + title + the host's rules, then each contestant, then the winner
 K.run=async({title,sub,col='#ffe23a',pass,intro=[],ready=[],play,result})=>{
  if(!s.fromMenu&&!await s.pass(0,pass,'Come on down!'))return;
  const bk=ST.STAGE_BORROW[kind];await SS.ready(ready.concat(['curtain',...['','-tall','-fold'].flatMap(f=>[`stage-${kind}${f}`,...(bk?[`stage-${bk}${f}`]:[])])]),5000);if(!s.alive)return;
  if(!s.fromMenu)snd.title(true);snd.crowd(3,.9,{at:.3});K.mode='intro';K.introT=0;
  K.show(title+'!',sub,2.6,col);snd.voice('say-lets-play',{at:.6});await K.wait(2600);
  for(const [line,ms] of intro){if(!s.alive)return;K.say(line,ms);K.introT=Math.max(K.introT,2.3);await K.wait(ms-200);}
  snd.title(false);K.mode='play';
  for(let i=0;i<2;i++){if(!s.alive)return;K.cur=i;if(i===1&&!net&&!cpu&&!board){if(!await s.pass(1,`${names[1]}, come on down! Your turn at ${title}.`,'Play'))return;}
   K.show(names[i].toUpperCase(),`IT'S YOUR TURN AT ${title}!`,1.6,'#fff');K.cast.present(3.4,'wave');sfx.applause(1.6,.5);await K.wait(1600);if(!s.alive)return;await play(i);}
  if(!s.alive)return;K.mode='over';const {scores,summary,lines=[]}=result(),[a,b]=scores,w=a===b?-1:a>b?0:1;
  if(w>=0){K.show(`${names[w].toUpperCase()} WINS!`,lines[w]||money(scores[w]),3,'#ffe23a');sfx.winner();s.react?.(w,'win');}else K.show(a?'IT\'S A TIE!':'NOBODY WON','Both '+money(a),3,'#fff');
  await K.wait(3000);s.finish([a,b],summary);};
 return K;}
Object.assign(exports,{createKit,shuffle,txt,bulbs,money});
