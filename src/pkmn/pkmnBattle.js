// First-generation Pokémon battles on a Game Boy screen (160x144, 8x8 tile layout):
// encounter transition, slide-in intro, FIGHT / PKMN / ITEM / RUN menus, typewriter text,
// HP bars that drain, cheap little move animations, catching with ball wobbles,
// experience and level ups. The screen sits in a Game Boy Color shell with a D-pad and
// A/B buttons; menus can also be tapped directly and text advances with a tap.
const {store}=require("src/state.js");
const {seededRandom,clamp}=require("src/utils.js");
const {drawText,wrapText,gbText}=require("src/pkmn/gbFont.js");
const D=require("src/pkmn/pkmnData.js");
const SP=require("src/pkmn/pkmnSprites.js");
const AU=require("src/pkmn/pkmnAudio.js");
const {fullscreenSupported,fullscreenLabel,toggleFullscreen}=require("src/fullscreen.js");
const {MOVES,move,speciesFor,statsAt,movesAt,effectiveness,BAG_ITEMS,BAG_ORDER,expFor,levelForExp,expGain,ppLeft,ABILITIES}=D;
const W=160,H=144;

// ---------------------------------------------------------------- overlay + input
let G=null; // the open Game Boy: {root, canvas, ctx, buf, b, S, ...}
let speed=1,autoPilot=null;
function setTestSpeed(s){speed=Math.max(1,s||1);}
function setAutoPilot(fn){autoPilot=fn||null;}
function deviceHTML(){
 return `<div class="gb-overlay" role="dialog" aria-label="Pokémon battle"><div class="gb-device"><div class="gb-bezel"><span class="gb-led"></span><span class="gb-bezel-label">SHAMBCONKINS · COLOR</span>${fullscreenSupported()?`<button class="gb-fs" data-gb-fs aria-label="Toggle full screen" title="Full screen">${fullscreenLabel('icon')}</button>`:''}<canvas class="gb-screen" width="${W}" height="${H}"></canvas></div>
 <div class="gb-brand">ShambBoy <b>C</b><b>O</b><b>L</b><b>O</b><b>R</b></div>
 <div class="gb-controls"><div class="gb-dpad"><button data-btn="up" aria-label="Up"></button><button data-btn="left" aria-label="Left"></button><span></span><button data-btn="right" aria-label="Right"></button><button data-btn="down" aria-label="Down"></button></div>
 <div class="gb-ab"><button data-btn="b" class="gb-b" aria-label="B">B</button><button data-btn="a" class="gb-a" aria-label="A">A</button></div>
 <div class="gb-ss"><button data-btn="select">SELECT</button><button data-btn="start">START</button></div></div><div class="gb-speaker"><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div>`;
}
const KEYS={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right',W:'up',S:'down',A:'left',D:'right',z:'a',Z:'a',Enter:'a',' ':'a',x:'b',X:'b',Backspace:'b',Escape:'b',Shift:'select'};
function openGB(){
 if(G)return G;
 const wrap=document.createElement('div');wrap.innerHTML=deviceHTML();const root=wrap.firstElementChild;document.body.append(root);
 const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 const buf=document.createElement('canvas');buf.width=W;buf.height=H;const b=buf.getContext('2d');b.imageSmoothingEnabled=false;
 G={root,canvas,ctx,buf,b,S:freshScene(),waiters:[],held:{},hits:[],raf:0,frame:0,frameWaiters:[],closed:false,listeners:[]};
 const on=(el,ev,fn,opt)=>{el.addEventListener(ev,fn,opt);G.listeners.push(()=>el.removeEventListener(ev,fn,opt));};
 on(window,'keydown',e=>{const btn=KEYS[e.key];if(!btn)return;e.preventDefault();e.stopPropagation();if(!e.repeat)press(btn);G.held[btn]=true;},true);
 on(window,'keyup',e=>{const btn=KEYS[e.key];if(btn){G.held[btn]=false;e.stopPropagation();}},true);
 for(const el of root.querySelectorAll('[data-btn]')){const btn=el.dataset.btn;on(el,'pointerdown',e=>{e.preventDefault();el.classList.add('down');G.held[btn]=true;press(btn);});const up=()=>{el.classList.remove('down');G.held[btn]=false;};on(el,'pointerup',up);on(el,'pointerleave',up);on(el,'pointercancel',up);}
 on(canvas,'pointerdown',e=>{e.preventDefault();const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W,y=(e.clientY-r.top)/r.height*H;const hit=G.hits.find(h=>x>=h.x&&x<h.x+h.w&&y>=h.y&&y<h.y+h.h);G.held.a=true;if(hit)press('tap',hit.index);else press('a');});
 on(canvas,'pointerup',()=>{G.held.a=false;});
 // small full-screen toggle in the bezel corner
 const fs=root.querySelector('[data-gb-fs]');
 if(fs){on(fs,'click',e=>{e.preventDefault();e.stopPropagation();toggleFullscreen();});const sync=()=>{fs.textContent=fullscreenLabel('icon');};on(document,'fullscreenchange',sync);on(document,'webkitfullscreenchange',sync);}
 on(window,'resize',fit);
 fit();loop();
 document.body.classList.add('gb-open');
 return G;
}
function fit(){
 if(!G)return;const r=G.root.getBoundingClientRect(),portrait=r.height>=r.width*1.05;G.root.dataset.layout=portrait?'portrait':'landscape';
 const availW=portrait?Math.min(r.width-56,560):Math.min(r.width-360,820),availH=portrait?Math.min(r.height*.56,r.height-330):r.height-150;
 let s=Math.min(availW/W,availH/H);if(s>=2)s=Math.floor(s*2)/2;s=Math.max(1,s);
 G.canvas.style.width=Math.round(W*s)+'px';G.canvas.style.height=Math.round(H*s)+'px';
}
function closeGB(){
 if(!G)return;G.closed=true;cancelAnimationFrame(G.raf);for(const off of G.listeners)off();G.root.remove();document.body.classList.remove('gb-open');document.querySelectorAll('.gb-encounter').forEach(el=>el.remove());
 for(const w of G.waiters)w.resolve(null);for(const w of G.frameWaiters)w.resolve();AU.stopAll();G=null;
}
function press(btn,index){
 if(!G)return;if(btn==='select'){SP.setPaletteMode(SP.paletteMode()==='dmg'?'color':'dmg');G.root.dataset.pal=SP.paletteMode();AU.sfx('press');return;}
 const w=G.waiters.shift();if(w)w.resolve({btn,index});
}
function button(){
 if(!G)return Promise.resolve(null);
 if(autoPilot){return new Promise(res=>setTimeout(()=>res(G?{btn:'a'}:null),20));}
 return new Promise(resolve=>G.waiters.push({resolve}));
}
function frames(n=1){
 if(!G)return Promise.resolve();const target=G.frame+Math.max(1,Math.ceil(n/speed));
 return new Promise(resolve=>G.frameWaiters.push({target,resolve}));
}
const live=()=>!!G&&!G.closed;
function loop(){
 if(!G)return;const g=G;
 const step=()=>{if(G!==g)return;g.frame++;const due=g.frameWaiters.filter(w=>w.target<=g.frame);g.frameWaiters=g.frameWaiters.filter(w=>w.target>g.frame);try{render();}catch(err){console.error(err);}for(const w of due)w.resolve();g.raf=requestAnimationFrame(step);};
 g.raf=requestAnimationFrame(step);
 // rAF stalls in background tabs and some headless runs: keep logic moving.
 g.tick=setInterval(()=>{if(G!==g){clearInterval(g.tick);return;}if(document.hidden||speed>1){g.frame+=4;const due=g.frameWaiters.filter(w=>w.target<=g.frame);g.frameWaiters=g.frameWaiters.filter(w=>w.target>g.frame);for(const w of due)w.resolve();}},16);
}

// ---------------------------------------------------------------- scene + drawing
function freshScene(){return {mode:'battle',enemy:mon0(96,0,'front'),player:mon0(8,40,'back'),eHud:null,pHud:null,balls:null,text:null,menus:[],fx:[],invert:false,shake:[0,0],wave:0,dark:0,overlay:null,white:false,party:null,stats:null};}
function mon0(x,y,kind){return {x,y,kind,sp:null,pal:'NORMAL',show:false,scale:1,blink:false,clip:null,dy:0,dx:0,silhouette:false,trainer:false};}
const col=(pal,i)=>SP.color(pal,i);
function txt(c,s,x,y,shade=4,pal='ui'){drawText(c,s,x,y,col(pal,shade));}
function box(c,x,y,w,h){
 c.fillStyle=col('ui',1);c.fillRect(x,y,w,h);c.fillStyle=col('ui',4);
 c.fillRect(x+1,y+1,w-2,2);c.fillRect(x+1,y+h-3,w-2,2);c.fillRect(x+1,y+1,2,h-2);c.fillRect(x+w-3,y+1,2,h-2);
 c.fillRect(x+4,y+4,w-8,1);c.fillRect(x+4,y+h-5,w-8,1);c.fillRect(x+4,y+4,1,h-8);c.fillRect(x+w-5,y+4,1,h-8);
 c.fillStyle=col('ui',1);for(const [px,py] of [[x+1,y+1],[x+w-2,y+1],[x+1,y+h-2],[x+w-2,y+h-2]])c.fillRect(px,py,1,1);
}
function hpColor(f){if(SP.paletteMode()==='dmg')return SP.DMG[3];return f>.5?'#38b848':f>.2?'#f0b800':'#e82818';}
function hpBar(c,x,y,hp,max){
 txt(c,'④',x,y);const bx=x+8;c.fillStyle=col('ui',4);c.fillRect(bx,y+1,1,6);c.fillRect(bx+1,y+2,49,1);c.fillRect(bx+1,y+5,49,1);c.fillRect(bx+50,y+2,1,4);
 c.fillStyle=col('ui',1);c.fillRect(bx+1,y+3,49,2);const f=max?clamp(hp/max,0,1):0,px=Math.ceil(f*48);c.fillStyle=hpColor(f);c.fillRect(bx+2,y+3,px,2);
}
function lvlOrStatus(b){return b.status?({par:'PAR',brn:'BRN',psn:'PSN',slp:'SLP',frz:'FRZ'}[b.status]):'③'+b.lvl;}
function drawHuds(c,S){
 if(S.eHud){const h=S.eHud;txt(c,h.name,8,0);txt(c,lvlOrStatus(h),h.status?32:32,8);hpBar(c,16,16,h.shownHp,h.max);c.fillStyle=col('ui',4);c.fillRect(8,10,1,17);c.fillRect(8,26,72,2);c.fillRect(79,24,1,3);c.fillRect(80,25,1,1);}
 if(S.pHud){const h=S.pHud;txt(c,h.name,80,56);txt(c,lvlOrStatus(h),112,64);hpBar(c,80,72,h.shownHp,h.max);txt(c,String(Math.round(h.shownHp)).padStart(3,' ')+'/'+String(h.max).padStart(3,' '),88,80);c.fillStyle=col('ui',4);c.fillRect(151,66,1,22);c.fillRect(80,87,72,2);c.fillRect(79,86,1,3);c.fillRect(78,87,1,1);}
}
function drawMonSprite(c,m){
 if(!m.show||!m.sp||m.blink)return;
 // m.mood (think/win/angry/sad/silly) shows that face when the character has its own picture for it.
 const sp=m.silhouette?m.sp:SP.moodSprite(m.sp,m.mood),pxScale=m.kind==='back'?2:1,size=sp.w*pxScale,baseY=m.y+(56-size);
 if(m.scale<1){const s=m.scale,w=Math.round(size*s),h=w,cx=m.x+28,cy=m.y+56-h;const cv=SP.paint(sp,m.pal,m.silhouette);if(cv)c.drawImage(cv,0,0,sp.w,sp.h,Math.round(cx-w/2),cy,w,h);return;}
 SP.drawSprite(c,sp,m.pal,m.x+m.dx,baseY+m.dy,{scale:pxScale,silhouette:m.silhouette,clipBottom:m.clip!==null?m.y+56:null});
}
function drawBallRow(c,list,x,y,dir){for(let i=0;i<6;i++){const st=list[i]||'empty',art=st==='ok'?SP.ART.partyBall:st==='faint'?SP.ART.partyFaint:SP.ART.partyEmpty;SP.drawSprite(c,art,'ball',x+i*8*dir,y);}}
function drawTextBox(c,S){
 if(!S.text){if(S.mode==='battle')box(c,0,96,160,48);return;}box(c,0,96,160,48);const t=S.text;let left=t.count;
 t.lines.slice(0,2).forEach((line,i)=>{const show=line.slice(0,Math.max(0,left));left-=line.length;txt(c,show,8,112+i*16);});
 if(t.arrow&&(G.frame>>4)%2===0)txt(c,'▼',144,128);
}
function render(){
 const g=G,S=g.S,c=g.b;
 c.fillStyle=S.mode==='black'?'#000':col('ui',1);c.fillRect(0,0,W,H);
 if(S.mode==='battle'){
  if(S.dark){c.fillStyle=col('ui',3);c.globalAlpha=S.dark;c.fillRect(0,0,W,96);c.globalAlpha=1;}
  drawMonSprite(c,S.enemy);drawMonSprite(c,S.player);
  for(const f of S.fx)f.draw(c,g.frame);
  drawHuds(c,S);
  if(S.balls){const B=S.balls;if(B.enemy){c.fillStyle=col('ui',4);c.fillRect(8,26,72,2);drawBallRow(c,B.enemy,64,16,-1);}if(B.player){c.fillStyle=col('ui',4);c.fillRect(80,87,72,2);drawBallRow(c,B.player,88,78,1);}}
  drawTextBox(c,S);
 }else if(S.mode==='party')drawParty(c,S);
 else if(S.mode==='stats')drawStats(c,S);
 else if(S.mode==='text')drawTextBox(c,S);
 g.hits=[];for(const m of S.menus)m.draw(c,g.hits);
 if(S.overlay)S.overlay(c,g.frame);
 if(S.invert){c.globalCompositeOperation='difference';c.fillStyle='#fff';c.fillRect(0,0,W,H);c.globalCompositeOperation='source-over';}
 // copy to screen (with shake / psychic wave)
 const out=g.ctx;out.fillStyle=col('ui',1);out.fillRect(0,0,W,H);const [sx,sy]=S.shake;
 if(S.wave){for(let y=0;y<H;y++){const off=Math.round(Math.sin(y/6+g.frame/3)*S.wave);out.drawImage(g.buf,0,y,W,1,off+sx,y+sy,W,1);}}
 else out.drawImage(g.buf,sx,sy);
}

// ---------------------------------------------------------------- text + menus
async function say(text,{wait=true,auto=false,pause=40}={}){
 if(!live())return;const S=G.S,lines=wrapText(text,18);let shown=[];
 for(let i=0;i<lines.length;i++){
  if(shown.length===2){shown=[shown[1]];S.text={lines:[shown[0],''],count:shown[0].length,arrow:false};await frames(4);}
  shown.push(lines[i]);S.text={lines:[...shown],count:shown.slice(0,-1).join('').length,arrow:false};
  const total=shown.join('').length;
  while(live()&&S.text.count<total){S.text.count+=autoPilot?999:G.held.a||G.held.b?4:1;await frames(1);}
  if(i<lines.length-1&&shown.length===2){S.text.arrow=true;if(autoPilot)await frames(4);else await waitA();S.text.arrow=false;AU.sfx('press');}
 }
 if(!live())return;
 if(wait&&!auto){S.text.arrow=true;if(autoPilot)await frames(4);else await waitA();if(S.text)S.text.arrow=false;}
 else if(auto)await waitAOrFrames(pause);
}
function waitA(){return new Promise(async resolve=>{while(live()){const b=await button();if(!b||['a','b','tap'].includes(b.btn))break;}resolve();});}
// Auto-advancing text: continue after n frames or on A, without leaving a stale input waiter.
function waitAOrFrames(n){
 if(!live())return Promise.resolve();if(autoPilot)return frames(Math.min(n,6));
 return new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;const i=G?G.waiters.indexOf(w):-1;if(i>=0)G.waiters.splice(i,1);resolve();};
  const w={resolve:b=>{if(done)return;if(!b||['a','b','tap'].includes(b.btn))finish();else if(G)G.waiters.push(w);}};G.waiters.push(w);frames(n).then(finish);});
}
function clearText(){if(G)G.S.text=null;}
// A menu: items [{label,x,y,disabled}] laid out by the caller's draw; returns index or -1 (B).
async function choose(menu){
 if(!live())return -1;const S=G.S;menu.cursor=clamp(menu.cursor||0,0,menu.items.length-1);S.menus.push(menu);
 try{
  if(autoPilot){await frames(3);const pick=autoPilot(menu);return pick;}
  while(live()){
   const b=await button();if(!b)return -1;const n=menu.items.length,cols=menu.cols||1;
   if(b.btn==='tap'){menu.cursor=b.index;AU.sfx('press');if(menu.items[b.index]?.disabled){continue;}return b.index;}
   if(b.btn==='a'){AU.sfx('press');if(menu.items[menu.cursor]?.disabled)continue;return menu.cursor;}
   if(b.btn==='b'){if(menu.cancel===false)continue;AU.sfx('press');return -1;}
   if(b.btn==='start'&&menu.start){return -2;}
   const step=b.btn==='up'?-cols:b.btn==='down'?cols:b.btn==='left'?-1:b.btn==='right'?1:0;if(!step)continue;
   if((b.btn==='left'||b.btn==='right')&&cols===1){if(menu.page){menu.page(step);}continue;}
   const next=menu.cursor+step;if(next>=0&&next<n){menu.cursor=next;menu.onMove?.(next);}
  }
  return -1;
 }finally{const i=S.menus.indexOf(menu);if(i>=0)S.menus.splice(i,1);}
}
function hitList(hits,menu,rects){rects.forEach((r,i)=>hits.push({...r,index:i}));}
function cursorAt(c,x,y){txt(c,'▶',x,y);}
// Main battle menu: FIGHT ①② / ITEM RUN
function mainMenu(){
 const items=[{label:'FIGHT'},{label:'①②'},{label:'ITEM'},{label:'RUN'}],pos=[[72,112],[120,112],[72,128],[120,128]];
 return {kind:'main',items,cols:2,cursor:0,draw(c,hits){box(c,64,96,96,48);items.forEach((it,i)=>txt(c,it.label,pos[i][0]+8,pos[i][1]));cursorAt(c,...pos[this.cursor]);hitList(hits,this,pos.map(([x,y])=>({x:x-2,y:y-4,w:46,h:16})));}};
}
function fightMenu(b){
 const ids=b.moves,items=ids.map(m=>({label:m}));
 return {kind:'fight',moves:ids,battler:b,items,cursor:b.lastMove||0,draw(c,hits){
  box(c,0,64,88,40);const m=move(ids[this.cursor]);txt(c,'TYPE/',8,72);txt(c,m.type,16,80);txt(c,String(ppLeft(b.mon,m.id)).padStart(2,' ')+'/'+String(m.pp).padStart(2,' '),40,88);
  box(c,32,96,128,48);ids.forEach((id,i)=>txt(c,id,48,104+i*8));cursorAt(c,40,104+this.cursor*8);hitList(hits,this,ids.map((_,i)=>({x:36,y:102+i*8,w:122,h:9})));}};
}
function yesNo(){const items=[{label:'YES'},{label:'NO'}];return {kind:'yesno',items,cursor:0,draw(c,hits){box(c,112,56,48,40);txt(c,'YES',128,64);txt(c,'NO',128,80);cursorAt(c,120,64+this.cursor*16);hitList(hits,this,[{x:114,y:60,w:44,h:16},{x:114,y:76,w:44,h:16}]);}};}

// ---------------------------------------------------------------- party / stats / bag screens
function partyIcon(c,mon,x,y,frame,sel){
 const sp=SP.spriteOf(mon.id,'icon');const fainted=mon.hp<=0;const bob=!fainted&&sel&&((frame>>3)%2)?-1:0;
 if(sp)SP.drawSprite(c,sp,speciesFor(mon.id).types[0],x,y+bob,{silhouette:false});else txt(c,'●',x+4,y+4);
}
function drawParty(c,S){
 const P=S.party;P.list.forEach((mon,i)=>{const y=i*16,st=statsAt(mon.id,mon.lvl);partyIcon(c,mon,8,y,G.frame,P.cursor===i);txt(c,speciesFor(mon.id).name,24+8,y);
  txt(c,mon.status?({par:'PAR',brn:'BRN',psn:'PSN',slp:'SLP',frz:'FRZ'}[mon.status]):mon.hp<=0?'FNT':'③'+mon.lvl,112,y);hpBar(c,32,y+8,mon.shownHp??mon.hp,st.hp);txt(c,String(Math.round(mon.shownHp??mon.hp)).padStart(3,' ')+'/'+String(st.hp).padStart(3,' '),96+8,y+8);
  if(P.marked===i)txt(c,'▷',0,y);});
 if(P.showCursor!==false)cursorAt(c,0,P.cursor*16);
 drawTextBox(c,S);
}
function partyMenu(S){return {kind:'party',list:S.party.list,items:S.party.list.map(m=>({label:m.id})),cursor:S.party.cursor,onMove(i){S.party.cursor=i;},draw(c,hits){S.party.cursor=this.cursor;hitList(hits,this,S.party.list.map((_,i)=>({x:0,y:i*16,w:160,h:16})));}};}
function drawStats(c,S){
 const {mon,page}=S.stats,sp=speciesFor(mon.id),st=statsAt(mon.id,mon.lvl),front=SP.spriteOf(mon.id,'front');
 if(front)SP.drawSprite(c,front,sp.types[0],8,0);txt(c,'⑤'+String(sp.dex).padStart(3,'0'),8,56);
 txt(c,sp.name,72,8);txt(c,'③'+mon.lvl,112,16);hpBar(c,72,24,mon.hp,st.hp);txt(c,String(mon.hp).padStart(3,' ')+'/'+String(st.hp).padStart(3,' '),88,32);txt(c,'STATUS/'+(mon.hp<=0?'FNT':mon.status?mon.status.toUpperCase():'OK'),72,48);
 c.fillStyle=col('ui',4);c.fillRect(152,8,1,40);c.fillRect(72,47,80,1);
 if(page===0){
  box(c,0,64,80,80);[['ATTACK',st.atk],['DEFENSE',st.def],['SPEED',st.spd],['SPECIAL',st.spc]].forEach(([k,v],i)=>{txt(c,k,8,72+i*16);txt(c,String(v).padStart(3,' '),48,80+i*16);});
  txt(c,'TYPE1/',88,72);txt(c,sp.types[0],96,80);txt(c,'TYPE2/',88,88);txt(c,sp.types[1]||'-',96,96);txt(c,'ABILITY/',88,104);txt(c,sp.ability.slice(0,8),96,112);txt(c,'OT/',88,128);txt(c,(S.stats.ot||'').slice(0,7).toUpperCase(),96,136);
 }else{
  txt(c,'EXP POINTS',8,64);txt(c,String(mon.exp).padStart(9,' '),72,72);txt(c,'LEVEL UP',8,80);txt(c,String(Math.max(0,expFor(mon.lvl+1)-mon.exp)).padStart(7,' ')+' to ③'+Math.min(100,mon.lvl+1),24,88);
  box(c,0,96,160,48);movesAt(mon.id,mon.lvl).forEach((m,i)=>{txt(c,m,8,104+i*8);});
 }
}
async function showStats(mon,ot){
 if(!live())return;const S=G.S,prev={mode:S.mode,text:S.text};await SP.prepareSprites([[mon.id,'front']]);S.mode='stats';S.stats={mon,page:0,ot};S.text=null;
 for(let page=0;page<2&&live();page++){S.stats.page=page;await waitA();}
 S.mode=prev.mode;S.text=prev.text;S.stats=null;
}
// Party screen. purpose: 'battle' | 'faint' | 'item' | 'field'. Returns index or -1.
async function partyScreen(team,{prompt='Choose a POKéMON.',cancel=true,onPick,ot}={}){
 if(!live())return -1;const S=G.S,prev={mode:S.mode,text:S.text};await SP.prepareSprites(team.map(m=>[m.id,'icon']));
 S.mode='party';S.party={list:team,cursor:0};S.text={lines:wrapText(prompt,18),count:999};
 try{
  while(live()){
   const i=await choose({...partyMenu(S),cancel});if(i<0)return -1;S.party.cursor=i;
   const r=onPick?await onPick(i):i;if(r!==undefined&&r!==null)return r;
   S.text={lines:wrapText(prompt,18),count:999};
  }
  return -1;
 }finally{S.mode=prev.mode;S.text=prev.text;S.party=null;}
}
function subMenu(labels,x=88){const h=8+labels.length*16;const items=labels.map(l=>({label:l}));return {kind:'sub',items,cursor:0,draw(c,hits){box(c,x,144-h-8,160-x,h+8);items.forEach((it,i)=>txt(c,it.label,x+16,144-h+i*16));cursorAt(c,x+8,144-h+this.cursor*16);hitList(hits,this,items.map((_,i)=>({x:x+4,y:144-h-4+i*16,w:160-x-6,h:16})));}};}
// Bag list (Gen 1 style: names with ×quantities, CANCEL at the end). Returns item id or null.
async function bagScreen(bag,{filter=null}={}){
 if(!live())return null;const ids=BAG_ORDER.filter(id=>(bag[id]||0)>0&&(!filter||filter(id)));const items=[...ids.map(id=>({label:BAG_ITEMS[id].name,id})),{label:'CANCEL',id:null}];
 let top=0;const S=G.S;
 const menu={kind:'bag',items,cursor:0,onMove(i){if(i<top)top=i;if(i>top+3)top=i-3;},draw(c,hits){box(c,32,8,128,88);const view=items.slice(top,top+4);view.forEach((it,k)=>{txt(c,it.label,48,16+k*16);if(it.id)txt(c,'×'+String(bag[it.id]).padStart(2,' '),120,24+k*16);});cursorAt(c,40,16+(this.cursor-top)*16);if(top+4<items.length&&(G.frame>>4)%2)txt(c,'▼',144,88);view.forEach((_,k)=>hits.push({x:36,y:12+k*16,w:122,h:16,index:top+k}));}};
 const i=await choose(menu);if(i<0)return null;return items[i].id;
}

// ---------------------------------------------------------------- catching (Gen 1, pokered ItemUseBall)
// rate: 1 POKé BALL, 1.5 GREAT, 2 ULTRA, 255 MASTER. Returns {caught, shakes 0-3}. A catch always
// shows three shakes; a miss shakes 0-3 times depending on how close it was. One house rule: with the
// HP bar in the red the species counts as easy to catch (rate at least 160), so a weakened foe is
// usually caught instead of bouncing out of ball after ball.
function gen1Catch(R,{rate=1,catchRate=45,hp=1,max=1,status=null}={}){
 if(rate>=255)return {caught:true,shakes:3};
 const r256=n=>Math.floor(R()*(n+1));
 const rand1Max=rate>=2?150:rate>=1.5?200:255,ballFactor=rate>=1.5&&rate<2?12:8,shakeDiv=rate>=2?150:rate>=1.5?200:255;
 const S=['slp','frz'].includes(status)?25:status?12:0,S2=['slp','frz'].includes(status)?10:status?5:0;
 const red=hp<=max*.2,cr=clamp(Math.round(red?Math.max(catchRate,160):catchRate),1,255);
 const W=Math.min(255,Math.floor(Math.floor(max*255/ballFactor)/Math.max(1,Math.floor(hp/4))));
 const rand1=r256(rand1Max);
 if(rand1<S)return {caught:true,shakes:3};
 if(rand1-S<=cr&&(W>=255||r256(255)<=W))return {caught:true,shakes:3};
 const Z=Math.floor(Math.floor(cr*100/shakeDiv)*W/255)+S2;
 return {caught:false,shakes:Z<10?0:Z<30?1:Z<70?2:3};
}

// ---------------------------------------------------------------- battlers + mechanics
function battler(mon,side){
 const sp=speciesFor(mon.id),stats=statsAt(mon.id,mon.lvl);
 return {mon,side,sp,stats,name:sp.name,types:sp.types,ability:sp.ability,lvl:mon.lvl,moves:movesAt(mon.id,mon.lvl),stages:{atk:0,def:0,spc:0,spd:0,acc:0,eva:0},conf:0,flinch:false,recharge:false,leech:false,focus:false,armor:false,lastMove:0,participated:false,toxic:0};
}
const statusName={par:'paralyzed',brn:'burned',psn:'poisoned',slp:'asleep',frz:'frozen'};
const STAGE=n=>n>=0?(2+n)/2:2/(2-n),ACC=n=>n>=0?(3+n)/3:3/(3-n);
function eff(b,stat){let v=b.stats[stat]*STAGE(b.stages[stat]);if(stat==='spd'&&b.mon.status==='par')v/=4;if(stat==='atk'&&b.mon.status==='brn')v/=2;if(stat==='atk'&&b.ability==='HUGE POWER')v*=2;if(stat==='atk'&&b.ability==='GUTS'&&b.mon.status)v*=1.5;return Math.max(1,v);}
function hudOf(b){return {name:b.name,lvl:b.lvl,max:b.stats.hp,shownHp:b.mon.hp,status:b.mon.status};}
const prefix=b=>b.side==='enemy'?'Enemy ':'';

// ---------------------------------------------------------------- the battle
async function battle(opts){
 const R=opts.random||seededRandom('battle:'+Date.now()),wild=opts.mode==='wild',trainerName=opts.foe?.label||'';
 const team=opts.player.team,bag=opts.player.bag,foeTeam=opts.foe.team,playerName=(opts.player.name||'RED').toUpperCase().slice(0,10);
 const result={outcome:null,defeated:[],caught:null,levelUps:[]};
 // Sprites (portraits may still be loading) are prepared while the music starts and the screen wipes.
 const sprites=SP.prepareSprites([...team.map(m=>[m.id,'back']),...team.map(m=>[m.id,'icon']),...team.map(m=>[m.id,'front']),...foeTeam.map(m=>[m.id,'front']),[opts.player.character,'back'],...(opts.foe.character?[[opts.foe.character,'front']]:[])]);
 const lead=team.find(m=>m.hp>0)||team[0],kind=wipeKind({trainer:!wild,stronger:(foeTeam[0]?.lvl||0)>=(lead?.lvl||0)+3,dungeon:!!opts.dungeon});
 const music=opts.mode==='gym'?'gym':wild?'wild':'trainer';
 // ---- transition: music, three flashes, wipe (on the board unless the Game Boy is already showing text)
 AU.playSong(music);
 let layer=null;
 if(G)await transition(kind);
 else{try{layer=await boardTransition(kind);}catch(err){console.error(err);}}
 const g=openGB(),S=g.S;S.mode='black';S.overlay=null;
 if(layer)setTimeout(()=>layer.remove(),320);
 await sprites;
 if(!live()){layer?.remove();return result;}
 const firstAlive=()=>team.findIndex(m=>m.hp>0);
 let pi=firstAlive(),ei=0,P=battler(team[pi],'player'),E=foeBattler(foeTeam[0]),runs=0;P.participated=true;
 const participants=new Set([pi]);
 await frames(8);S.mode='battle';
 // ---- intro: trainers / wild mon slide in as black silhouettes, then the colours come back
 const pTrainer=await SP.characterSprite(opts.player.character,'back');
 S.player={...mon0(8,40,'back'),sp:pTrainer,pal:'trainer',show:true,trainer:true,silhouette:true};
 if(wild){S.enemy={...mon0(96,0,'front'),sp:SP.spriteOf(E.mon.id,'front'),pal:E.types[0],show:true,silhouette:true};}
 else{S.enemy={...mon0(96,0,'front'),sp:await SP.characterSprite(opts.foe.character,'front'),pal:'trainer',show:true,trainer:true,silhouette:true};}
 for(let f=0;f<=40;f++){const k=1-f/40;S.enemy.dx=-Math.round(120*k);S.player.dx=Math.round(120*k);await frames(1);if(!live())return result;}
 S.enemy.dx=0;S.player.dx=0;S.enemy.silhouette=false;S.player.silhouette=false;
 if(wild){AU.cry(E.mon.id);S.eHud=hudOf(E);await say(`Wild ${E.name} appeared!`);}
 else{
  S.balls={enemy:foeTeam.map(m=>m.hp>0?'ok':'faint'),player:team.map(m=>m.hp>0?'ok':'faint')};
  await say(`${trainerName} wants to fight!`);S.balls=null;
  await slideOut(S.enemy,1);await say(`${trainerName} sent out ${E.name}!`,{auto:true,pause:10});await sendOut(S.enemy,E);
 }
 await slideOut(S.player,-1);await say(`Go! ${P.name}!`,{auto:true,pause:10});await sendOut(S.player,P);
 await entryAbility(P,E);await entryAbility(E,P);
 alarm();
 // ---- turns
 while(live()&&!result.outcome){
  clearText();
  S.player.mood='think';const act=await playerAction();S.player.mood=null;if(!live())break;if(!act)continue;
  if(act.kind==='run'){
   if(!wild){await say('No! There’s no running from a trainer battle!');continue;}
   runs++;const ps=eff(P,'spd'),es=eff(E,'spd'),ok=ps>=es||R()<clamp(.45+(ps-es)/(2*es)+.12*runs,.15,.95);
   if(ok){AU.sfx('run');await say('Got away safely!');result.outcome='run';break;}
   await say('Can’t escape!',{auto:true});await enemyTurnOnly();continue;
  }
  if(act.kind==='flee'){AU.sfx('run');await say('Got away safely!');result.outcome='run';break;}
  if(act.kind==='caught'){result.outcome='caught';break;}
  if(act.kind==='switched'||act.kind==='used')continue;
  const eAct=chooseEnemyMove();
  const pFirst=act.kind!=='move'||priority(act.move,eAct,P,E);
  const order=pFirst?[['p',act],['e',eAct]]:[['e',eAct],['p',act]];
  let fainted=false;
  for(const [who,a] of order){
   if(!live()||result.outcome)break;
   if(who==='p'){if(a.kind==='move'){if(P.mon.hp>0&&E.mon.hp>0)await useMove(P,E,a.move);}}
   else if(E.mon.hp>0&&P.mon.hp>0)await useMove(E,P,a.move);
   if(await checkFaints()){fainted=true;break;}
  }
  if(!live()||result.outcome)break;
  if(!fainted&&P.mon.hp>0&&E.mon.hp>0){await endOfTurn(P,E);if(await checkFaints())continue;await endOfTurn(E,P);await checkFaints();}
  alarm();
 }
 AU.lowHpAlarm(false);
 return result;

 // ---------------- helpers bound to this battle
 // Like Gen 1 trainer AI item counts: a foe can only patch itself up a few times (heal and rest
 // moves such as RECOVER, WAFFLES or PIZZA TIME), so nothing out-heals your damage forever.
 function foeBattler(mon){const b=battler(mon,'enemy');b.healsLeft=opts.mode==='gym'?2:1;return b;}
 function isHeal(id){const m=move(id);return !!(m.heal||m.rest);}
 function alarm(){AU.lowHpAlarm(P.mon.hp>0&&P.mon.hp<=P.stats.hp*.2&&live());}
 async function playerAction(){
  while(live()){
   S.text={lines:['',''],count:0};
   const main=mainMenu();main.cursor=S.lastMain||0;const c=await choose({...main,cancel:false});S.lastMain=Math.max(0,c);
   if(c===0){
    if(P.recharge){return {kind:'move',move:null};}
    if(P.moves.every(m=>ppLeft(P.mon,m)<=0))return {kind:'move',move:'STRUGGLE'};
    const fm=fightMenu(P);const m=await choose(fm);if(m<0)continue;P.lastMove=m;const id=P.moves[m];
    if(ppLeft(P.mon,id)<=0){await say('No PP left for this move!');continue;}
    return {kind:'move',move:id};
   }
   if(c===1){const r=await switchMenu(false);if(r)return r;continue;}
   if(c===2){const r=await itemMenu();if(r)return r;continue;}
   if(c===3)return {kind:'run'};
  }
  return null;
 }
 async function switchMenu(forced){
  let out=null;
  await partyScreen(team,{prompt:forced?'Bring out which POKéMON?':'Choose a POKéMON.',cancel:!forced,ot:playerName,onPick:async i=>{
   const sub=forced?null:await choose(subMenu(['SWITCH','STATS','CANCEL']));
   if(!forced&&sub===1){await showStats(team[i],playerName);return null;}
   if(!forced&&(sub<0||sub===2))return null;
   if(team[i].hp<=0){await say('There’s no will to fight!');return null;}
   if(i===pi&&P.mon.hp>0){await say(`${P.name} is already out!`);return null;}
   out=i;return i;
  }});
  if(out===null)return null;
  if(P.mon.hp>0){if(P.ability==='REGENERATOR')P.mon.hp=Math.min(P.stats.hp,P.mon.hp+Math.floor(P.stats.hp/3));await say(`${P.name} enough! Come back!`,{auto:true,pause:20});await recall(S.player);}
  S.pHud=null;pi=out;participants.add(pi);P=battler(team[pi],'player');P.participated=true;S.player={...mon0(8,40,'back'),sp:SP.spriteOf(P.mon.id,'back'),pal:P.types[0]};
  await say(`Go! ${P.name}!`,{auto:true,pause:10});await sendOut(S.player,P);await entryAbility(P,E);alarm();
  if(forced)return null;
  // switching costs the turn: the foe attacks the newcomer
  await enemyTurnOnly();return {kind:'switched'};
 }
 async function enemyTurnOnly(){const e=chooseEnemyMove();if(E.mon.hp>0&&P.mon.hp>0)await useMove(E,P,e.move);if(await checkFaints())return;if(P.mon.hp>0&&E.mon.hp>0){await endOfTurn(P,E);if(await checkFaints())return;await endOfTurn(E,P);await checkFaints();}alarm();}
 async function itemMenu(){
  const id=await bagScreen(bag);if(!id)return null;const it=BAG_ITEMS[id];
  if(it.ball){
   if(!wild){await say(`${playerName} used ${it.name}!`,{auto:true});await say('The trainer blocked the BALL!');await say('Don’t be a thief!');return null;}
   bag[id]--;await say(`${playerName} used ${it.name}!`,{auto:true,pause:10});
   const caught=await throwBall(it.ball);if(caught){return {kind:'caught'};}
   await enemyTurnOnly();return {kind:'used'};
  }
  if(it.flee){if(!wild){await say('It won’t have any effect.');return null;}bag[id]--;return {kind:'flee'};}
  if(it.boost||it.focus){bag[id]--;await say(`${playerName} used ${it.name}!`,{auto:true});if(it.focus){P.focus=true;await say(`${P.name}’s getting pumped!`);}else await changeStat(P,it.boost,1,true);await enemyTurnOnly();return {kind:'used'};}
  // target items
  let used=false;
  await partyScreen(team,{prompt:'Use item on which POKéMON?',ot:playerName,onPick:async i=>{const r=await applyItem(id,team[i],i===pi?P:null);if(r){used=true;return i;}return null;}});
  if(!used)return null;
  await enemyTurnOnly();return {kind:'used'};
 }
 async function applyItem(id,mon,active){
  const r=await useBagItem(bag,id,mon,{say,active,battle:true});
  if(active&&r){active.stats=statsAt(mon.id,mon.lvl);active.lvl=mon.lvl;active.moves=movesAt(mon.id,mon.lvl);S.pHud=hudOf(active);}
  return r;
 }
 async function throwBall(rate){
  AU.sfx('throw');const ball={x:24,y:72,show:true,open:false};const fx={draw(c){if(ball.show)SP.drawSprite(c,ball.open?SP.ART.ballOpen:SP.ART.ball,'ball',Math.round(ball.x),Math.round(ball.y));}};S.fx.push(fx);
  for(let f=0;f<=24;f++){const t=f/24;ball.x=24+(120-24)*t;ball.y=72-Math.sin(t*Math.PI)*56-(48*t);await frames(1);}
  ball.open=true;AU.sfx('poof');await poof(S.enemy,true);S.enemy.show=false;ball.open=false;
  for(let f=0;f<10;f++){ball.y+=2;await frames(1);}
  const {caught:got,shakes:rocks}=gen1Catch(R,{rate,catchRate:E.sp.catchRate,hp:E.mon.hp,max:E.stats.hp,status:E.mon.status});
  const shakes=got?4:rocks;
  const wob=Math.min(3,shakes);
  // each shake rocks the ball left, right and back to rest
  for(let i=0;i<wob;i++){await frames(20);AU.sfx('wobble');for(let f=0;f<16;f++){ball.x=120+Math.round(Math.sin(f/16*Math.PI*2)*3);await frames(1);}ball.x=120;}
  await frames(16);
  if(shakes>=4){AU.sfx('click');AU.stopSong();await frames(10);AU.playJingle('caught');await say(`All right! ${E.name} was caught!`);S.fx.splice(S.fx.indexOf(fx),1);result.caught={...E.mon,hp:E.mon.hp,status:E.mon.status};E.mon.caught=true;return true;}
  ball.open=true;AU.sfx('poof');await poof(S.enemy,false);ball.show=false;S.enemy.show=true;S.fx.splice(S.fx.indexOf(fx),1);
  await say(['You missed the POKéMON!','Darn! The POKéMON broke free!','Aww! It appeared to be caught!','Shoot! It was so close too!'][wob]);
  return false;
 }
 function chooseEnemyMove(){
  const withPP=E.moves.filter(m=>ppLeft(E.mon,m)>0);if(E.recharge||!withPP.length)return {move:E.recharge?null:'STRUGGLE'};
  // Healing only when hurt and while the foe still has heals left.
  const canHeal=E.healsLeft>0&&E.mon.hp<=E.stats.hp*.5,attacks=withPP.filter(m=>!isHeal(m)),usable=canHeal||!attacks.length?withPP:attacks;
  if(wild)return {move:usable[Math.floor(R()*usable.length)]};
  const smart=opts.mode==='gym'?1:.6;
  const score=id=>{const m=move(id);if(!m.power&&!m.fixed&&!m.level){if(m.fx.some(f=>f.kind==='status')&&P.mon.status)return .1;if(m.heal||m.rest)return E.mon.hp<E.stats.hp*.4?1.4:.05;return .7;}const e=effectiveness(m.type,P.types);return (m.power||60)*(e||.05)*(E.types.includes(m.type)?1.5:1)/60;};
  if(R()>smart)return {move:usable[Math.floor(R()*usable.length)]};
  const w=usable.map(score),sum=w.reduce((a,b)=>a+b,0);let r=R()*sum;for(let i=0;i<usable.length;i++){r-=w[i];if(r<=0)return {move:usable[i]};}return {move:usable[0]};
 }
 function priority(pm,em,a,b){const pp=pm&&move(pm).prio?1:0,ep=em.move&&move(em.move).prio?1:0;if(pp!==ep)return pp>ep;const sa=eff(a,'spd'),sb=eff(b,'spd');return sa===sb?R()<.5:sa>sb;}
 async function checkFaints(){
  if(E.mon.hp<=0&&!E.fainted){
   E.fainted=true;AU.cry(E.mon.id,{faint:true});await faintAnim(S.enemy);S.eHud=null;await say(`Enemy ${E.name} fainted!`);result.defeated.push(E.mon.id);
   const alive=[...participants].filter(i=>team[i].hp>0);
   for(const i of alive){const mon=team[i],gain=expGain(E.mon.id,E.lvl,!wild,alive.length);await gainExp(mon,gain,i===pi?P:null);}
   const next=foeTeam.findIndex((m,i)=>i>ei&&m.hp>0);
   if(wild||next<0){
    AU.lowHpAlarm(false);AU.playSong('victory');
    if(!wild){S.enemy={...mon0(96,0,'front'),sp:SP.spriteOf(opts.foe.character,'front')||await SP.characterSprite(opts.foe.character,'front'),pal:'trainer',show:true,trainer:true,mood:'sad'};for(let f=0;f<=30;f++){S.enemy.dx=Math.round(80*(1-f/30));await frames(1);}await say(`${playerName} defeated ${trainerName}!`);if(opts.foe.lose)await say(opts.foe.lose);if(opts.prizeText)await say(opts.prizeText);}
    result.outcome='win';return true;
   }
   // Gen 1 shift prompt
   const nextMon=foeTeam[next];
   if(team.filter(m=>m.hp>0).length>1&&P.mon.hp>0){await say(`${trainerName} is about to use ${speciesFor(nextMon.id).name}! Will ${playerName} change POKéMON?`,{wait:false});const yn=await choose(yesNo());if(yn===0)await switchMenuForced(true);}
   ei=next;E=foeBattler(foeTeam[ei]);participants.clear();if(P.mon.hp>0)participants.add(pi);
   await say(`${trainerName} sent out ${E.name}!`,{auto:true,pause:10});await sendOut(S.enemy,E);await entryAbility(E,P);
  }
  if(P.mon.hp<=0&&!P.fainted){
   P.fainted=true;AU.lowHpAlarm(false);AU.cry(P.mon.id,{faint:true});await faintAnim(S.player);S.pHud=null;await say(`${P.name} fainted!`);participants.delete(pi);
   if(!team.some(m=>m.hp>0)){AU.stopSong();await say(`${playerName} is out of useable POKéMON!`);AU.playJingle('blackout');await say(`${playerName} blacked out!`);result.outcome='lose';return true;}
   if(wild){await say('Use next POKéMON?',{wait:false});const yn=await choose({...yesNo(),cancel:false});if(yn===1){const ps=eff(P,'spd'),es=eff(E,'spd');if(ps>=es||R()<.5){AU.sfx('run');await say('Got away safely!');result.outcome='run';return true;}await say('Can’t escape!');}}
   await switchMenuForced(false);
   return 'continue';
  }
  return false;
 }
 async function switchMenuForced(optional){
  let out=null;
  await partyScreen(team,{prompt:'Bring out which POKéMON?',cancel:optional,ot:playerName,onPick:async i=>{if(team[i].hp<=0){await say('There’s no will to fight!');return null;}if(i===pi&&P.mon.hp>0){await say(`${P.name} is already out!`);return null;}out=i;return i;}});
  if(out===null)return;
  if(P.mon.hp>0){await say(`${P.name} enough! Come back!`,{auto:true,pause:20});await recall(S.player);}
  pi=out;participants.add(pi);P=battler(team[pi],'player');P.participated=true;S.player={...mon0(8,40,'back'),sp:SP.spriteOf(P.mon.id,'back'),pal:P.types[0]};
  await say(`Go! ${P.name}!`,{auto:true,pause:10});await sendOut(S.player,P);await entryAbility(P,E);alarm();
 }
 async function gainExp(mon,gain,active){
  mon.exp+=gain;const name=speciesFor(mon.id).name;await say(`${name} gained ${gain} EXP. Points!`);AU.sfx('exp');
  let lvl=levelForExp(mon.exp);while(mon.lvl<lvl&&mon.lvl<100){await levelUp(mon,active);}
 }
 async function levelUp(mon,active){
  const before=statsAt(mon.id,mon.lvl),oldMoves=movesAt(mon.id,mon.lvl);mon.lvl++;const after=statsAt(mon.id,mon.lvl);if(mon.hp>0)mon.hp+=after.hp-before.hp;
  result.levelUps.push(mon.id);
  if(active){active.stats=after;active.lvl=mon.lvl;S.pHud=hudOf(active);}
  AU.playJingle('levelup');await say(`${speciesFor(mon.id).name} grew to level ${mon.lvl}!`);
  await statBox(after);
  const now=movesAt(mon.id,mon.lvl);for(const m of now)if(!oldMoves.includes(m)){const old=oldMoves.find(o=>!now.includes(o));if(old){await say(`1, 2 and... Poof! ${speciesFor(mon.id).name} forgot ${old}!`,{auto:true});await say('And...',{auto:true,pause:20});}AU.playJingle('item');await say(`${speciesFor(mon.id).name} learned ${m}!`);}
  if(active)active.moves=now;
 }
 async function statBox(st){const m={items:[{label:''}],draw(c){box(c,72,0,88,80);[['ATTACK',st.atk],['DEFENSE',st.def],['SPEED',st.spd],['SPECIAL',st.spc]].forEach(([k,v],i)=>{txt(c,k,80,8+i*16);txt(c,String(v).padStart(3,' '),128,16+i*16);});}};S.menus.push(m);await waitA();S.menus.splice(S.menus.indexOf(m),1);}
 async function entryAbility(a,b){if(a.ability==='INTIMIDATE'&&b.mon.hp>0){await say(`${prefix(a)}${a.name}’s INTIMIDATE!`,{auto:true,pause:20});await changeStat(b,'atk',-1,false);}if(a.ability==='PRESSURE'){await say(`${prefix(a)}${a.name} is exerting its PRESSURE!`,{auto:true,pause:20});}}
 async function changeStat(t,stat,n,silentFail){
  const names={atk:'ATTACK',def:'DEFENSE',spc:'SPECIAL',spd:'SPEED',acc:'ACCURACY',eva:'EVADE'};
  if(stat==='acc'&&n<0&&t.ability==='KEEN EYE'){await say(`${prefix(t)}${t.name}’s KEEN EYE prevents accuracy loss!`);return;}
  const old=t.stages[stat],nv=clamp(old+n,-6,6);if(nv===old){if(!silentFail)await say('Nothing happened!');return;}
  t.stages[stat]=nv;AU.sfx(n>0?'statUp':'statDown');await statAnim(t===P?S.player:S.enemy,n>0);
  await say(`${prefix(t)}${t.name}’s ${names[stat]} ${n>1?'greatly rose':n>0?'rose':n<-1?'greatly fell':'fell'}!`);
 }
 async function setStatus(t,st,src){
  if(t.mon.hp<=0)return false;
  if(st==='conf'){if(t.conf>0||t.ability==='OWN TEMPO')return false;t.conf=2+Math.floor(R()*4);AU.sfx('status');await say(`${prefix(t)}${t.name} became confused!`);return true;}
  if(st==='flinch'){t.flinch=true;return true;}
  if(t.mon.status)return false;
  if(st==='brn'&&t.types.includes('FIRE')||st==='psn'&&t.types.includes('POISON')||st==='frz'&&t.types.includes('ICE')||st==='slp'&&t.ability==='INSOMNIA'||st==='par'&&t.types.includes('ELECTRIC')&&src==='ELECTRIC')return false;
  t.mon.status=st;if(st==='slp')t.mon.slp=1+Math.floor(R()*5);AU.sfx('status');
  if(t===P)S.pHud=hudOf(P);else S.eHud=hudOf(E);
  await say(`${prefix(t)}${t.name} ${st==='par'?'is paralyzed! It may not attack!':st==='slp'?'fell asleep!':st==='frz'?'was frozen solid!':st==='brn'?'was burned!':'was poisoned!'}`);
  return true;
 }
 async function damage(t,amount,{silent=false}={}){
  const hud=t===P?S.pHud:S.eHud,from=t.mon.hp;t.mon.hp=Math.max(0,t.mon.hp-amount);
  if(hud){const steps=Math.max(1,Math.ceil(Math.abs(from-t.mon.hp)/t.stats.hp*48));for(let i=1;i<=steps;i++){hud.shownHp=from+(t.mon.hp-from)*i/steps;await frames(2);}hud.shownHp=t.mon.hp;}
  if(t===P)alarm();
 }
 async function heal(t,amount){const hud=t===P?S.pHud:S.eHud,from=t.mon.hp;t.mon.hp=Math.min(t.stats.hp,t.mon.hp+amount);if(hud){const steps=Math.max(1,Math.ceil(Math.abs(t.mon.hp-from)/t.stats.hp*48));for(let i=1;i<=steps;i++){hud.shownHp=from+(t.mon.hp-from)*i/steps;await frames(2);}hud.shownHp=t.mon.hp;}if(t===P)alarm();}
 async function useMove(a,t,id){
  const aS=a===P?S.player:S.enemy,tS=a===P?S.enemy:S.player;aS.mood=null;
  if(a.recharge){a.recharge=false;await say(`${prefix(a)}${a.name} must recharge!`);return;}
  if(a.mon.status==='slp'){a.mon.slp=(a.mon.slp||1)-1;if(a.mon.slp<=0){a.mon.status=null;(a===P?S.pHud:S.eHud)&&Object.assign(a===P?S.pHud:S.eHud,{status:null});await say(`${prefix(a)}${a.name} woke up!`);return;}await say(`${prefix(a)}${a.name} is fast asleep!`);return;}
  if(a.mon.status==='frz'){if(R()<.15){a.mon.status=null;Object.assign(a===P?S.pHud:S.eHud,{status:null});await say(`${prefix(a)}${a.name} thawed out!`);}else{await say(`${prefix(a)}${a.name} is frozen solid!`);return;}}
  if(a.flinch){a.flinch=false;await say(`${prefix(a)}${a.name} flinched!`);return;}
  if(a.conf>0){a.conf--;if(a.conf===0){await say(`${prefix(a)}${a.name}’s confused no more!`);}else{await say(`${prefix(a)}${a.name} is confused!`,{auto:true});if(R()<.5){await confusionAnim();const dmg=calc(a,a,{power:40,type:'NONE',cat:'phys'},false).dmg;aS.mood='silly';await say('It hurt itself in its confusion!',{auto:true});AU.sfx('hit');await blink(aS);await damage(a,dmg);return;}}}
  if(a.mon.status==='par'&&R()<.25){await say(`${prefix(a)}${a.name}’s fully paralyzed!`);return;}
  if(!id){return;}
  const m=id==='STRUGGLE'?{id:'STRUGGLE',name:'STRUGGLE',type:'NORMAL',power:50,acc:100,pp:1,cat:'phys',fx:[],recoil:true,anim:'tackle'}:move(id);
  if(id!=='STRUGGLE'){const left=ppLeft(a.mon,id);a.mon.pp={...(a.mon.pp||{}),[id]:Math.max(0,left-(t.ability==='PRESSURE'?2:1))};}
  await say(`${prefix(a)}${a.name} used ${m.name}!`,{auto:true,pause:16});
  // accuracy
  if(m.acc&&!(m.cat==='status'&&m.fx.every(f=>f.kind==='stat'&&f.who==='self'))){const p=m.acc/100*ACC(a.stages.acc)/ACC(t.stages.eva);if(R()>p){AU.sfx('miss');aS.mood='sad';await say(`${prefix(a)}${a.name}’s attack missed!`);return;}}
  const selfOnly=m.cat==='status'&&(m.heal||m.rest||m.fx.every(f=>f.kind==='stat'&&f.who==='self'||f.kind==='focus')||m.haze||m.nothing);
  if(m.cat==='status'&&!selfOnly&&t.mon.hp<=0){await say('But, it failed!');return;}
  await animate(m,a,aS,tS);
  if(m.power||m.fixed||m.level){
   const e=m.type==='GROUND'&&t.ability==='LEVITATE'?0:effectiveness(m.type,t.types);
   if(e===0){await say(`It doesn’t affect ${prefix(t)}${t.name}!`);return;}
   const hits=m.multi?[2,2,2,3,3,3,4,5][Math.floor(R()*8)]:m.twice?2:1;let crit=false,last=null,total=0;
   for(let h=0;h<hits&&t.mon.hp>0;h++){
    const r=calc(a,t,m,true);crit=crit||r.crit;last=r;let dmg=r.dmg;
    if(t.mon.hp-dmg<=0&&t.mon.hp===t.stats.hp&&t.ability==='STURDY'){dmg=t.mon.hp-1;t.endured='STURDY';}
    else if(t.mon.hp-dmg<=0&&t.ability==='PLOT ARMOR'&&!t.armor&&R()<.5){dmg=t.mon.hp-1;t.armor=true;t.endured='PLOT ARMOR';}
    tS.mood='angry';aS.mood='win';AU.sfx(r.e>1?'hitSuper':r.e<1?'hitWeak':'hit');await blink(tS);if(r.e>1)await shake(4);
    await damage(t,dmg);total+=dmg;
    if(t.endured){await say(`${prefix(t)}${t.name} endured the hit with ${t.endured}!`);t.endured=null;}
   }
   if(crit)await say('Critical hit!');
   if(last&&last.e>1)await say('It’s super effective!');else if(last&&last.e<1)await say('It’s not very effective...');
   if(hits>1)await say(`Hit the enemy ${hits} times!`);
   if(m.drain&&total>0){await heal(a,Math.max(1,Math.floor(total/2)));await say(`Sucked health from ${prefix(t)}${t.name}!`);}
   if((m.recoil)&&a.ability!=='ROCK HEAD'&&total>0){await damage(a,Math.max(1,Math.floor(total/4)));await say(`${prefix(a)}${a.name}’s hit with recoil!`);}
   if(m.explode){await damage(a,a.mon.hp);}
   if(m.recharge)a.recharge=true;
   // contact abilities
   if(m.cat==='phys'&&a.mon.hp>0&&R()<.3){const ab={STATIC:'par','POISON POINT':'psn','FLAME BODY':'brn'}[t.ability];if(ab&&!a.mon.status){await say(`${prefix(t)}${t.name}’s ${t.ability}!`,{auto:true,pause:16});await setStatus(a,ab);}}
   if(t.mon.hp<=0)return;
  }
  // effects
  const grace=a.ability==='SERENE GRACE'?2:1;let did=false;
  for(const f of m.fx){
   if(f.kind==='status'){const chance=m.cat==='status'?100:f.chance*grace;if(R()*100<chance){if(await setStatus(t,f.status,m.type))did=true;}}
   else if(f.kind==='stat'){const chance=m.cat==='status'?100:f.chance*grace;if(R()*100<chance){await changeStat(f.who==='self'?a:t,f.stat,f.n,m.cat!=='status');did=true;}}
   else if(f.kind==='focus'){a.focus=true;await say(`${prefix(a)}${a.name}’s getting pumped!`);did=true;}
  }
  const healsGone=a.side==='enemy'&&!(a.healsLeft>0);
  if(m.heal){if(a.mon.hp>=a.stats.hp||healsGone){await say('But, it failed!');}else{if(a.side==='enemy')a.healsLeft--;AU.sfx('heal');await heal(a,Math.floor(a.stats.hp/2));await say(`${prefix(a)}${a.name} regained health!`);}did=true;}
  if(m.rest){if(a.mon.hp>=a.stats.hp&&!a.mon.status||healsGone){await say('But, it failed!');}else{if(a.side==='enemy')a.healsLeft--;a.mon.status='slp';a.mon.slp=2;await say(`${prefix(a)}${a.name} started sleeping!`);AU.sfx('heal');await heal(a,a.stats.hp);Object.assign(a===P?S.pHud:S.eHud,{status:'slp'});}did=true;}
  if(m.leech){if(t.types.includes('GRASS')||t.leech){await say('But, it failed!');}else{t.leech=true;await say(`${prefix(t)}${t.name} was seeded!`);}did=true;}
  if(m.haze){for(const b of [P,E]){b.stages={atk:0,def:0,spc:0,spd:0,acc:0,eva:0};b.conf=0;}await say('All STATUS changes are eliminated!');did=true;}
  if(m.nothing){await say('But nothing happened!');did=true;}
  if(m.cat==='status'&&!did)await say('But, it failed!');
 }
 function calc(a,t,m,useStages){
  const phys=m.cat==='phys'||m.type==='NONE';
  if(m.fixed)return {dmg:m.fixed,e:1,crit:false};if(m.level)return {dmg:a.lvl,e:1,crit:false};
  const critRate=Math.min(.6,(a.sp.base.spd/512)*(m.crit?8:1)*(a.focus?4:1)*(a.ability==='SUPER LUCK'?2:1));const crit=useStages&&R()<critRate;
  const A=crit?a.stats[phys?'atk':'spc']*(phys&&a.ability==='HUGE POWER'?2:1):eff(a,phys?'atk':'spc'),Dv=crit?t.stats[phys?'def':'spc']:eff(t,phys?'def':'spc');
  const L=a.lvl*(crit?2:1);let dmg=Math.floor(Math.floor(Math.floor(2*L/5+2)*m.power*A/Dv)/50)+2;
  const e=m.type==='NONE'?1:effectiveness(m.type,t.types);
  if(m.type!=='NONE'&&a.types.includes(m.type))dmg=Math.floor(dmg*1.5);
  const pinch={BLAZE:'FIRE',TORRENT:'WATER',OVERGROW:'GRASS',SWARM:'BUG'}[a.ability]||(a.ability==='UNDERDOG'?a.types[0]:null);if(pinch===m.type&&a.mon.hp<=a.stats.hp/3)dmg=Math.floor(dmg*1.5);
  dmg=Math.floor(dmg*e);if(useStages)dmg=Math.floor(dmg*(217+Math.floor(R()*39))/255);
  return {dmg:Math.max(1,dmg),e,crit};
 }
 async function endOfTurn(b,o){
  if(b.mon.hp<=0)return;const bS=b===P?S.player:S.enemy;
  if(b.mon.status==='psn'||b.mon.status==='brn'){await say(`${prefix(b)}${b.name}’s hurt by ${b.mon.status==='psn'?'poison':'the burn'}!`,{auto:true,pause:16});bS.mood='angry';AU.sfx('hitWeak');await blink(bS);await damage(b,Math.max(1,Math.floor(b.stats.hp/16)));if(b.mon.hp<=0)return;}
  if(b.leech&&o.mon.hp>0){const d=Math.max(1,Math.floor(b.stats.hp/16));await say(`LEECH SEED saps ${prefix(b)}${b.name}!`,{auto:true,pause:16});await damage(b,d);await heal(o,d);if(b.mon.hp<=0)return;}
  if(b.ability==='SPEED BOOST'&&b.stages.spd<6){b.stages.spd++;await say(`${prefix(b)}${b.name}’s SPEED BOOST!`,{auto:true,pause:16});}
  if(b.ability==='SECOND WIND'&&b.mon.hp<b.stats.hp){await heal(b,Math.max(1,Math.floor(b.stats.hp/16)));}
  if(b.ability==='SHED SKIN'&&b.mon.status&&R()<.3){b.mon.status=null;Object.assign(b===P?S.pHud:S.eHud,{status:null});await say(`${prefix(b)}${b.name} shed its skin!`,{auto:true,pause:16});}
 }
 // ---- animations (cheap on purpose)
 async function blink(m){for(let i=0;i<6;i++){m.blink=!m.blink;await frames(4);}m.blink=false;}
 async function shake(n=4){for(let i=0;i<10;i++){S.shake=[i%2?n:-n,0];await frames(2);}S.shake=[0,0];}
 async function statAnim(m,up){for(let i=0;i<8;i++){m.dy=up?-((i%2)*2):((i%2)*2);await frames(3);}m.dy=0;}
 async function confusionAnim(){S.wave=3;await frames(30);S.wave=0;}
 async function animate(m,a,aS,tS){
  const kind=m.anim||'tackle',dir=a===P?1:-1,from=a===P?[36,64]:[124,28],to=a===P?[124,28]:[36,64];
  const add=fx=>{S.fx.push(fx);return ()=>{const i=S.fx.indexOf(fx);if(i>=0)S.fx.splice(i,1);};};
  const ink=()=>col('ui',4);
  if(kind==='tackle'||kind==='dash'){AU.sfx('swoosh');for(let i=0;i<(kind==='dash'?3:2);i++){aS.dx=8*dir;await frames(3);aS.dx=0;await frames(3);}if(kind==='dash'){S.invert=true;await frames(3);S.invert=false;}return;}
  if(kind==='scratch'||kind==='bite'){AU.sfx('swoosh');const [x,y]=to;const rm=add({draw(c,f){c.fillStyle=ink();for(let k=0;k<3;k++)for(let j=0;j<14;j++)c.fillRect(x-10+k*6+j*(kind==='bite'?0:1),y-12+j*(kind==='bite'?1:1)+(kind==='bite'&&k===1?-4:0),2,2);}});await frames(14);rm();return;}
  if(kind==='punch'){const [x,y]=to;const fist=SP.ART.bang;for(const [ox,oy] of [[-10,-8],[8,4],[0,-2]]){const rm=add({draw(c){SP.drawSprite(c,fist,'ui',x+ox-4,y+oy-5);}});AU.sfx('bump');await frames(6);rm();await frames(2);}return;}
  if(kind==='beam'||kind==='zap'||kind==='psywave'||kind==='fire'||kind==='water'||kind==='bubble'||kind==='leaf'||kind==='ice'||kind==='sting'||kind==='stars'||kind==='rock'||kind==='wind'||kind==='powder'||kind==='smoke'||kind==='web'||kind==='whip'||kind==='drain'||kind==='wave'||kind==='ghost'||kind==='sound'||kind==='stare'||kind==='flash'){
   AU.sfx({beam:'beam',zap:'zap',psywave:'psy',fire:'fire',water:'water',bubble:'water',ice:'beam',ghost:'ghost',rock:'shake',wind:'swoosh',sound:'statDown',stare:'status',flash:'beam'}[kind]||'swoosh');
   if(kind==='psywave'){S.wave=4;await frames(36);S.wave=0;return;}
   if(kind==='ghost'){S.dark=.6;await frames(10);for(let i=0;i<4;i++){tS.blink=!tS.blink;await frames(5);}tS.blink=false;S.dark=0;return;}
   if(kind==='flash'){for(let i=0;i<4;i++){S.invert=!S.invert;await frames(4);}S.invert=false;return;}
   if(kind==='sound'||kind==='stare'){const [x,y]=from;const rm=add({draw(c,f){c.fillStyle=ink();for(let k=0;k<3;k++){const r=6+((f*2+k*8)%22);c.fillRect(x+dir*r,y-8+k*8,2,2);c.fillRect(x+dir*r+dir*2,y-10+k*8,2,2);}}});await frames(28);rm();return;}
   if(kind==='wave'){const rm=add({draw(c,f){c.fillStyle=SP.paletteMode()==='dmg'?SP.DMG[2]:'#3060c0';for(let x=0;x<W;x+=2){const y=60+Math.sin(x/8+f/3)*6-(f%40);c.fillRect(x,y,2,4);}}});await frames(36);rm();return;}
   // projectiles along a line, then an impact
   const N={beam:12,zap:5,fire:6,water:8,bubble:6,leaf:5,ice:6,sting:4,stars:5,rock:4,wind:6,powder:10,smoke:6,web:5,whip:3,drain:6}[kind]||6;const travel=kind==='rock'?24:28;
   const glyph={fire:'*',water:'o',bubble:'o',leaf:'/',ice:'*',sting:'-',stars:'*',rock:'#',powder:'.',smoke:'o',web:'#',drain:'o'}[kind]||'o';
   const rm=add({draw(c,f){c.fillStyle=ink();const start=this.start??(this.start=f);const t=f-start;for(let i=0;i<N;i++){const p=clamp((t-i*2)/travel,0,1);if(p<=0||p>=1&&kind!=='beam')continue;let x,y;
    if(kind==='rock'){x=to[0]-12+i*7;y=to[1]-40+p*40;}else if(kind==='drain'){x=to[0]+(from[0]-to[0])*p;y=to[1]+(from[1]-to[1])*p-Math.sin(p*Math.PI)*14;}
    else if(kind==='powder'||kind==='smoke'){x=to[0]-10+((i*7)%22);y=to[1]-20+p*26+((i*5)%9);}else{x=from[0]+(to[0]-from[0])*p;y=from[1]+(to[1]-from[1])*p+(kind==='zap'?((t+i)%4<2?-3:3):kind==='wind'?Math.sin(p*9)*6:0);}
    if(kind==='beam'){c.fillRect(Math.round(x),Math.round(y),3,3);}else if(kind==='zap'){c.fillRect(Math.round(x),Math.round(y)-4,2,8);c.fillRect(Math.round(x)+2,Math.round(y),2,6);}else drawText(c,glyph,Math.round(x)-4,Math.round(y)-4,ink());}}});
   await frames(travel+N*2+4);rm();
   if(kind==='zap'||kind==='beam'||kind==='ice'){for(let i=0;i<2;i++){S.invert=true;await frames(3);S.invert=false;await frames(3);}}
   if(kind==='rock')await shake(3);
   return;
  }
  if(kind==='shake'){AU.sfx('shake');await shake(6);return;}
  if(kind==='explode'){AU.sfx('explode');for(let i=0;i<6;i++){S.invert=!S.invert;S.shake=[i%2?5:-5,i%3-1];await frames(4);}S.invert=false;S.shake=[0,0];return;}
  if(kind==='up'){AU.sfx('statUp');for(let i=0;i<4;i++){aS.silhouette=!aS.silhouette;await frames(4);}aS.silhouette=false;return;}
  if(kind==='heal'){AU.sfx('heal');const [x,y]=from;const rm=add({draw(c,f){c.fillStyle=ink();for(let k=0;k<6;k++){const a=f/6+k*Math.PI/3,r=14+Math.sin(f/5)*4;c.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r),2,2);}}});await frames(30);rm();return;}
  if(kind==='wiggle'){for(let i=0;i<8;i++){aS.dx=(i%2?3:-3);await frames(3);}aS.dx=0;return;}
  await frames(10);
 }
 async function poof(m,shrinkIn){
  const cx=m.x+28,cy=m.y+40;const rm=(()=>{const fx={draw(c,f){c.fillStyle=col('ui',3);const t=f-(this.s??(this.s=f));for(let k=0;k<8;k++){const a=k*Math.PI/4,r=Math.min(18,t*1.5);c.fillRect(Math.round(cx+Math.cos(a)*r)-2,Math.round(cy+Math.sin(a)*r)-2,4,4);}}};S.fx.push(fx);return ()=>S.fx.splice(S.fx.indexOf(fx),1);})();
  if(shrinkIn){for(const s of [.66,.33]){m.scale=s;await frames(5);}}await frames(10);rm();m.scale=1;
 }
}
// ---------------------------------------------------------------- shared animations
// Gen 1 encounter transition (pokered battle_transitions.asm): the battle music starts, the screen
// flashes three times (palette fades to black, back, to white, back) and then one of eight wipes closes
// it, picked by bits: trainer battle | foe at least 3 levels above your lead | dungeon.
const WIPES=['doubleCircle','spiralOut','circle','spiralIn','hStripes','shrink','vStripes','split'];
function wipeKind({trainer=false,stronger=false,dungeon=false}={}){return WIPES[(trainer?1:0)|(stronger?2:0)|(dungeon?4:0)];}
const FLASH=[[0,.33],[0,.66],[0,1],[0,.66],[0,.33],[0,0],[1,.33],[1,.66],[1,1],[1,.66],[1,.33],[0,0]]; // [white?,alpha], 2 frames each
const WIPE_FRAMES={doubleCircle:34,circle:44,spiralOut:40,spiralIn:40,hStripes:28,vStripes:28,shrink:30,split:30};
const spiralCache=new Map();
function spiralOrder(cols,rows){
 const key=cols+'x'+rows;if(spiralCache.has(key))return spiralCache.get(key);
 const order=[];let x0=0,y0=0,x1=cols-1,y1=rows-1;
 while(x0<=x1&&y0<=y1){for(let x=x0;x<=x1;x++)order.push([x,y0]);y0++;for(let y=y0;y<=y1;y++)order.push([x1,y]);x1--;if(y0<=y1){for(let x=x1;x>=x0;x--)order.push([x,y1]);y1--;}if(x0<=x1){for(let y=y1;y>=y0;y--)order.push([x0,y]);x0++;}}
 spiralCache.set(key,order);return order;
}
// Fills the tiles of a wipe at progress t (0..1) on a cols x rows tile grid: fill(x,y,w,h) in tiles.
function drawWipe(kind,t,cols,rows,fill){
 t=clamp(t,0,1);
 if(kind==='hStripes'){const w=cols*t;for(let y=0;y<rows;y++){if(y%2)fill(0,y,w,1);else fill(cols-w,y,w,1);}return;}
 if(kind==='vStripes'){const h=rows*t;for(let x=0;x<cols;x++){if(x%2)fill(x,0,1,h);else fill(x,rows-h,1,h);}return;}
 if(kind==='shrink'){const ix=cols/2*t,iy=rows/2*t;fill(0,0,cols,iy);fill(0,rows-iy,cols,iy);fill(0,0,ix,rows);fill(cols-ix,0,ix,rows);return;}
 if(kind==='split'){const h=rows*t,w=cols*t;fill(0,(rows-h)/2,cols,h);fill((cols-w)/2,0,w,rows);return;}
 if(kind==='spiralIn'||kind==='spiralOut'){const order=spiralOrder(cols,rows),n=Math.round(order.length*t);for(let i=0;i<n;i++){const [x,y]=kind==='spiralIn'?order[i]:order[order.length-1-i];fill(x,y,1,1);}return;}
 // circle: one clock hand sweeps from 12 o'clock; doubleCircle: two hands from 12 and 6.
 const cx=cols/2,cy=rows/2,span=kind==='doubleCircle'?Math.PI:Math.PI*2,lim=t*span+1e-9;
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){let a=Math.atan2(x+.5-cx,cy-(y+.5));if(a<0)a+=Math.PI*2;if(a%span<lim||t>=1)fill(x,y,1,1);}
}
// Inside an already open Game Boy (e.g. after a trainer's speech).
async function transition(kind='doubleCircle'){
 const S=G.S;if(!WIPE_FRAMES[kind])kind=kind==='wild'?'doubleCircle':'spiralIn';
 const shade=([white,a])=>c=>{if(!a)return;c.globalAlpha=a;c.fillStyle=white?'#fff':'#000';c.fillRect(0,0,W,H);c.globalAlpha=1;};
 for(let i=0;i<3&&live();i++)for(const step of FLASH){S.overlay=shade(step);await frames(2);}
 const n=WIPE_FRAMES[kind];
 for(let f=0;f<=n&&live();f++){S.overlay=c=>{c.fillStyle='#000';drawWipe(kind,f/n,20,18,(x,y,w,h)=>c.fillRect(Math.floor(x*8),Math.floor(y*8),Math.ceil(w*8),Math.ceil(h*8)));};await frames(1);}
 S.overlay=c=>{c.fillStyle='#000';c.fillRect(0,0,W,H);};await frames(10);
}
// On the board itself, before the Game Boy opens: a full-screen layer flashes and wipes whatever is
// on screen (the board). Returns the black layer; it is removed once the Game Boy is up.
async function boardTransition(kind){
 const layer=document.createElement('canvas');layer.className='gb-encounter';
 const vw=Math.max(1,window.innerWidth),vh=Math.max(1,window.innerHeight),tile=Math.max(16,Math.round(Math.min(vw,vh)/18)),cols=Math.ceil(vw/tile),rows=Math.ceil(vh/tile);
 layer.width=cols*tile;layer.height=rows*tile;document.body.append(layer);const c=layer.getContext('2d');
 const step=1000/60,wait=n=>new Promise(res=>{const end=performance.now()+n*step/speed;let done=false;const fin=()=>{if(!done){done=true;res();}};const tick=()=>{if(done)return;if(performance.now()>=end)fin();else requestAnimationFrame(tick);};requestAnimationFrame(tick);setTimeout(fin,n*step/speed+40);});
 for(let i=0;i<3;i++)for(const [white,a] of FLASH){c.clearRect(0,0,layer.width,layer.height);if(a){c.globalAlpha=a;c.fillStyle=white?'#fff':'#000';c.fillRect(0,0,layer.width,layer.height);c.globalAlpha=1;}await wait(2);}
 const n=WIPE_FRAMES[kind]||34,t0=performance.now(),dur=n*step/speed;
 for(;;){const t=Math.min(1,(performance.now()-t0)/dur);c.clearRect(0,0,layer.width,layer.height);c.fillStyle='#000';drawWipe(kind,t,cols,rows,(x,y,w,h)=>c.fillRect(Math.floor(x*tile),Math.floor(y*tile),Math.ceil(w*tile),Math.ceil(h*tile)));if(t>=1)break;await wait(1);}
 c.fillStyle='#000';c.fillRect(0,0,layer.width,layer.height);await wait(10);
 return layer;
}
async function slideOut(m,dir){for(let f=0;f<=20;f++){m.dx=Math.round(dir*f*5);await frames(1);}m.show=false;m.dx=0;}
async function sendOut(m,b){
 const S=G.S;m.sp=SP.spriteOf(b.mon.id,m.kind);m.mood=null;m.pal=b.types[0];m.trainer=false;m.show=true;m.dx=0;m.dy=0;m.clip=null;
 AU.sfx('poof');for(const s of [.33,.66,1]){m.scale=s;await frames(5);}AU.cry(b.mon.id);
 if(m===S.enemy)S.eHud=hudOf(b);else S.pHud=hudOf(b);await frames(10);
}
async function recall(m){for(const s of [.66,.33]){m.scale=s;await frames(4);}m.show=false;m.scale=1;}
async function faintAnim(m){m.mood='sad';AU.sfx('faint');m.clip=0;for(let d=0;d<=56;d+=4){m.dy=d;await frames(1);}m.show=false;m.dy=0;m.clip=null;}

// ---------------------------------------------------------------- items outside the battle loop
// Applies a bag item to a party member. Returns true when it was used.
async function useBagItem(bag,id,mon,{say:speak=say,active=null}={}){
 const it=BAG_ITEMS[id];if(!it||!(bag[id]>0))return false;const name=speciesFor(mon.id).name,max=statsAt(mon.id,mon.lvl).hp;
 const fail=async()=>{await speak('It won’t have any effect.');return false;};
 if(it.revive){if(mon.hp>0)return fail();mon.hp=Math.max(1,Math.floor(max*it.revive));mon.status=null;bag[id]--;AU.sfx('heal');await speak(`${name} is revitalized!`);return true;}
 if(it.heal){if(mon.hp<=0||mon.hp>=max&&!(it.cure&&mon.status))return fail();const before=mon.hp;mon.hp=Math.min(max,mon.hp+it.heal);if(it.cure)mon.status=null;bag[id]--;AU.sfx('heal');await animatePartyHp(mon,before);await speak(`${name} recovered by ${mon.hp-before}!`);return true;}
 if(it.cure){if(mon.hp<=0||!mon.status||it.cure!=='all'&&mon.status!==it.cure)return fail();const was=mon.status;mon.status=null;bag[id]--;AU.sfx('heal');await speak(`${name} ${({psn:'was cured of poison',par:'’s rid of paralysis',slp:'woke up',brn:'’s burn was healed',frz:'was defrosted'})[was]}!`);return true;}
 if(it.candy){if(mon.lvl>=100)return fail();bag[id]--;const before=statsAt(mon.id,mon.lvl);mon.lvl++;mon.exp=Math.max(mon.exp,expFor(mon.lvl));const after=statsAt(mon.id,mon.lvl);if(mon.hp>0)mon.hp+=after.hp-before.hp;AU.playJingle('levelup');await speak(`${name} grew to level ${mon.lvl}!`);return true;}
 if(it.pp){const ms=movesAt(mon.id,mon.lvl);if(ms.every(m=>ppLeft(mon,m)>=move(m).pp))return fail();for(const m of ms)mon.pp[m]=Math.min(move(m).pp,ppLeft(mon,m)+it.pp);bag[id]--;AU.sfx('heal');await speak('PP was restored.');return true;}
 if(it.ball||it.boost||it.focus||it.flee){await speak('OAK: This isn’t the time to use that!');return false;}
 return false;
}
async function animatePartyHp(mon,from){if(!G?.S?.party)return;mon.shownHp=from;const max=statsAt(mon.id,mon.lvl).hp,steps=Math.max(1,Math.ceil(Math.abs(mon.hp-from)/max*48));for(let i=1;i<=steps;i++){mon.shownHp=from+(mon.hp-from)*i/steps;await frames(2);}delete mon.shownHp;}

// ---------------------------------------------------------------- field (START menu) screens
// The board's POKéMON button: a Gen 1 START menu over a blank field screen.
async function fieldMenu({team,bag,name,character}){
 openGB();const S=G.S;S.mode='text';S.text=null;await SP.prepareSprites(team.flatMap(m=>[[m.id,'icon'],[m.id,'front']]));
 const labels=['POKéMON','ITEM',String(name||'YOU').toUpperCase().slice(0,7),'OPTION','EXIT'];
 try{
  while(live()){
   const items=labels.map(l=>({label:l}));const menu={kind:'field',items,cursor:S.fieldCursor||0,draw(c,hits){box(c,80,0,80,8+items.length*16+8);items.forEach((it,i)=>txt(c,it.label,96,16+i*16));cursorAt(c,88,16+this.cursor*16);hitList(hits,this,items.map((_,i)=>({x:84,y:12+i*16,w:74,h:16})));}};
   const i=await choose(menu);S.fieldCursor=Math.max(0,i);if(i<0||i===4)break;
   if(i===0){
    if(!team.length){S.text={lines:wrapText('You have no POKéMON yet. Walk the board!',18),count:999};await waitA();S.text=null;continue;}
    await partyScreen(team,{ot:name,onPick:async k=>{const sub=await choose(subMenu(['STATS','SWITCH','CANCEL']));if(sub===0)await showStats(team[k],name);else if(sub===1){G.S.party.marked=k;const prev=G.S.text;G.S.text={lines:wrapText('Move POKéMON where?',18),count:999};const to=await choose({...partyMenu(G.S),cancel:true});G.S.party.marked=undefined;G.S.text=prev;if(to>=0&&to!==k){[team[k],team[to]]=[team[to],team[k]];AU.sfx('press');}}return null;}});
   }else if(i===1){
    const fieldSay=async t=>{const prev=S.text;await say(t);S.text=prev;};
    while(live()){const id=await bagScreen(bag);if(!id)break;const it=BAG_ITEMS[id];if(it.ball||it.boost||it.focus||it.flee){await fieldSay('OAK: This isn’t the time to use that!');S.text=null;continue;}
     await partyScreen(team,{prompt:'Use item on which POKéMON?',ot:name,onPick:async k=>{const used=await useBagItem(bag,id,team[k],{say:async t=>{G.S.text={lines:wrapText(t,18),count:0};const total=G.S.text.lines.join('').length;while(live()&&G.S.text.count<total){G.S.text.count+=2;await frames(1);}G.S.text.arrow=true;await waitA();}});return used?k:null;}});S.text=null;}
   }else if(i===2){
    await SP.prepareSprites([[character,'front']]);const sp=SP.spriteOf(character,'front');const owned=team.length,balls=(bag['poke-ball']||0)+(bag['great-ball']||0)+(bag['ultra-ball']||0)+(bag['master-ball']||0);
    const card={items:[{label:''}],draw(c){box(c,0,0,160,144);if(sp)SP.drawSprite(c,sp,'trainer',96,24);txt(c,'NAME/'+String(name).toUpperCase().slice(0,9),8,16);txt(c,'TEAM/'+owned,8,40);txt(c,'BALLS/'+balls,8,56);txt(c,'BADGES',8,96);c.fillStyle=col('ui',4);for(let k=0;k<8;k++)c.fillRect(12+k*18,112,12,12);}};
    S.menus.push(card);await waitA();S.menus.splice(S.menus.indexOf(card),1);
   }else if(i===3){SP.setPaletteMode(SP.paletteMode()==='dmg'?'color':'dmg');G.root.dataset.pal=SP.paletteMode();AU.sfx('press');}
  }
 }finally{closeGB();}
}
// Simple GB message screen (used for Pokémon Center, items found, trainer spotted ...).
async function gbMessages(lines,{song=null,jingle=null,keepOpen=false}={}){
 openGB();const S=G.S;S.mode='text';if(song)AU.playSong(song);if(jingle)AU.playJingle(jingle);
 for(const l of lines){if(!live())break;await say(l);}
 if(!keepOpen)closeGB();
}

Object.assign(exports,{gen1Catch,wipeKind,drawWipe,battle,openGB,closeGB,say,gbMessages,fieldMenu,useBagItem,setTestSpeed,setAutoPilot,transition,isOpen:()=>!!G});
