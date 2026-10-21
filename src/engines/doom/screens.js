// Doom front end: title/attract loop, the menus (main, episode, skill, options, sound volume, read this, quit, and a
// level picker for the 2-player mode), the intermission tally (WI) and the text finale / end pictures / cast call (F).
// Everything is drawn with the WAD's own graphics in 320x200 space. Touch: tap a menu item to pick it.
const LINE=16;
const QUIT_SOUNDS1=['pldeth','dmpain','popain','slop','telept','posit1','posit3','sgtatk'],QUIT_SOUNDS2=['vilact','getpow','boscub','slop','skeswg','kntdth','bspact','sgtatk'];

class Menu{
 constructor(app){this.app=app;this.active=false;this.stack=[];this.cur=null;this.skull=0;this.msg=null;this.tics=0;}
 get v(){return this.app.video;}
 get g(){return this.app.game;}
 open(id='main'){this.active=true;this.stack=[];this.cur=null;this.msg=null;this.go(id);this.app.sound('swtchn');}
 close(){this.active=false;this.msg=null;this.stack=[];this.cur=null;this.app.menuClosed?.();}
 go(id){const m=this.build(id);if(!m)return;if(this.cur)this.stack.push(this.cur);this.cur=m;m.on=Math.min(m.last??m.on??0,m.items.length-1);while(m.items[m.on]?.skip)m.on++;}
 back(){if(this.msg){this.answer(false);return;}if(this.stack.length){this.cur=this.stack.pop();this.app.sound('swtchn');}else if(this.app.canCloseMenu())this.close();}
 message(text,yesno,cb){this.msg={text,yesno,cb};}
 answer(yes){const m=this.msg;this.msg=null;if(m.yesno&&m.cb)m.cb(yes);else if(m.cb)m.cb();}
 build(id){
  const a=this.app,g=this.g,commercial=g.commercial,o=a.options;
  const pic=(lump,fn,extra={})=>({lump,fn,...extra});
  if(id==='main'){const items=[pic('M_NGAME',()=>this.newGame()),pic('M_OPTION',()=>this.go('options')),pic('M_LOADG',()=>this.go('load')),pic('M_SAVEG',()=>{if(!a.inLevel()){this.message('you can\'t save if you aren\'t playing!\n\ntap to continue.');return;}this.go('save');})];
   if(!commercial)items.push(pic('M_RDTHIS',()=>this.go('readthis')));items.push(pic('M_QUITG',()=>this.quit()));
   return {id,x:97,y:64,items,title:[['M_DOOM',94,2]]};}
  if(id==='episode'){const n=g.episodes(),items=[];for(let e=1;e<=Math.max(n,1);e++)items.push(pic('M_EPI'+e,()=>{this.ep=e;if(g.gamemode==='shareware'&&e>1){this.message('this is the shareware version of doom.\n\nyou need to order the entire trilogy.\n\ntap to continue.');return;}this.afterEpisode();}));
   return {id,x:48,y:63,items,title:[['M_EPISOD',54,38]]};}
  if(id==='skill'){const L=['M_JKILL','M_ROUGH','M_HURT','M_ULTRA','M_NMARE'];
   return {id,x:48,y:63,last:2,items:L.map((l,i)=>pic(l,()=>{if(i===4){this.message(g.str('NIGHTMARE').replace('press y or n.','tap yes or no.'),true,y=>{if(y)this.start(4);});return;}this.start(i);})),title:[['M_NEWG',96,14],['M_SKILL',54,38]]};}
  if(id==='level'){const ep=this.ep||1,n=commercial?(g.wad.has('MAP32')?32:30):9,items=[];
   for(let m=1;m<=n;m++){const lump=g.mapLump(ep,m);if(!g.wad.has(lump))continue;items.push({text:g.levelName(ep,m).toUpperCase(),fn:()=>{this.map=m;this.go('skill');}});}
   return {id,x:20,y:24,line:commercial?5.4:10,items,text:true,heading:'CHOOSE THE LEVEL'};}
  if(id==='options')return {id,x:60,y:37,items:[pic('M_ENDGAM',()=>{if(!a.inLevel()){this.message('you can\'t end a game if you aren\'t playing!\n\ntap to continue.');return;}this.message('are you sure you want to end the game?\n\ntap yes or no.',true,y=>{if(y){this.close();a.endGame();}});}),
    pic('M_MESSG',()=>{o.messages=!o.messages;a.saveOptions();},{draw:(x,y)=>this.v.patch(o.messages?'M_MSGON':'M_MSGOFF',x+120,y)}),
    pic('M_DETAIL',()=>{o.detail=o.detail?0:1;a.saveOptions();a.resize();},{draw:(x,y)=>this.v.patch(o.detail?'M_GDHIGH':'M_GDLOW',x+175,y)}),
    pic('M_SCRNSZ',()=>{},{slide:d=>{o.screenblocks=Math.max(10,Math.min(11,o.screenblocks+d));a.saveOptions();a.resize();}}),{skip:true,thermo:()=>[o.screenblocks-10,2]},
    pic('M_MSENS',()=>{},{slide:d=>{o.sens=Math.max(0,Math.min(9,o.sens+d));a.saveOptions();}}),{skip:true,thermo:()=>[o.sens,10]},
    pic('M_SVOL',()=>this.go('sound')),
    {text:'USE MY OWN DOOM WAD...',fn:()=>a.pickWad?.()},{text:o.alwaysRun?'ALWAYS RUN: ON':'ALWAYS RUN: OFF',fn:()=>{o.alwaysRun=!o.alwaysRun;a.saveOptions();this.cur.items[9].text=o.alwaysRun?'ALWAYS RUN: ON':'ALWAYS RUN: OFF';}},
    {text:'CHEATS...',fn:()=>this.go('cheats')}],title:[['M_OPTTTL',108,15]]};
  if(id==='sound')return {id,x:80,y:64,items:[pic('M_SFXVOL',()=>{},{slide:d=>{o.sfx=Math.max(0,Math.min(15,o.sfx+d));a.saveOptions();a.applyVolume();}}),{skip:true,thermo:()=>[o.sfx,16]},
    pic('M_MUSVOL',()=>{},{slide:d=>{o.music=Math.max(0,Math.min(15,o.music+d));a.saveOptions();a.applyVolume();}}),{skip:true,thermo:()=>[o.music,16]}],title:[['M_SVOL',60,38]]};
  if(id==='cheats'){const C=[['IDDQD','iddqd'],['IDKFA','idkfa'],['IDCLIP','idclip'],['IDCHOPPERS','idchoppers']];
   return {id,x:90,y:60,line:14,text:true,heading:'CHEATS',items:C.map(([t,c])=>({text:t,fn:()=>{if(!a.inLevel())return;g.cheat(c);this.close();}}))};}
  if(id==='load'||id==='save'){const slots=a.saveSlots(),items=[];
   for(let i=0;i<6;i++)items.push({slot:i,label:slots[i]||(id==='load'?'EMPTY SLOT':''),fn:()=>{if(id==='load'){if(!slots[i])return;this.close();a.loadGame(i);}else{a.saveGame(i);this.close();}}});
   return {id,x:80,y:54,items,save:true,title:[[id==='load'?'M_LOADG':'M_SAVEG',72,28]]};}
  if(id==='readthis'){const pages=commercial?['HELP','CREDIT']:g.wad.has('HELP1')?['HELP1','HELP2']:['HELP2','CREDIT'];return {id,pages,page:0,items:[{fn:()=>{}}],full:true};}
  return null;}
 newGame(){if(this.app.inLevel()&&this.app.twoPlayer){this.message('you can\'t start a new game\nduring a 2 player turn.\n\ntap to continue.');return;}
  if(this.g.commercial){this.ep=1;this.afterEpisode();}else this.go('episode');}
 afterEpisode(){if(this.app.twoPlayer){this.go('level');return;}this.map=1;this.go('skill');}
 start(skill){this.close();this.app.newGame(skill,this.ep||1,this.map||1);}
 quit(){const g=this.g,list=['QUITMSG',...Array.from({length:14},(_,i)=>'QUITMSG'+(i+1))].map(k=>g.strings?.[k]||(k==='QUITMSG'||/QUITMSG[1-7]$/.test(k)?require("src/engines/doom/strings.js").STRINGS[k]:null)).filter(Boolean);
  const t=list[g.M_Random()%list.length]||'are you sure you want to quit?';
  this.message(t+'\n\ntap yes to quit.',true,y=>{if(y){const s=g.commercial?QUIT_SOUNDS2:QUIT_SOUNDS1;this.app.sound(s[g.M_Random()%s.length]);this.app.quit();}});}
 tick(){this.tics++;if(this.tics%8===0)this.skull^=1;}
 // geometry of item i: [x,y,w,h] in virtual coords
 itemRect(m,i){const it=m.items[i];if(m.text){const y=m.y+i*(m.line||12);return [0,y-2,320,(m.line||12)];}if(m.save)return [m.x-8,m.y+i*LINE-4,210,LINE];return [m.x-8,m.y+i*LINE-2,240,LINE];}
 tap(vx,vy){
  if(this.msg){if(this.msg.yesno){if(vy>130&&vy<170){if(vx<160)this.answer(true);else this.answer(false);}}else this.answer();return;}
  const m=this.cur;if(!m)return;
  if(vx<40&&vy<24&&(this.stack.length||this.app.canCloseMenu())){this.back();return;}
  if(m.pages){if(++m.page>=m.pages.length)this.back();else this.app.sound('pistol');return;}
  for(let i=0;i<m.items.length;i++){const it=m.items[i];if(it.skip)continue;const [x,y,w,h]=this.itemRect(m,i);
   if(vx>=x&&vx<x+w&&vy>=y&&vy<y+h+(m.items[i+1]?.skip?LINE:0)){
    if(it.slide){const tx=m.x+(m.id==='sound'?0:0);const [val,n]=m.items[i+1].thermo();const thx=m.x,thw=(n+2)*8;if(vy>=y+LINE&&vx>=thx&&vx<thx+thw){const k=Math.floor((vx-thx-8)/8);it.slide(Math.max(0,Math.min(n-1,k))-val);this.app.sound('stnmov');}else if(m.on===i){it.slide(vx>200?1:-1);this.app.sound('stnmov');}m.on=i;return;}
    if(m.on!==i&&!m.text&&!m.save){m.on=i;this.app.sound('pstop');}else{m.on=i;}
    this.app.sound('pistol');it.fn();return;}}}
 key(k){
  if(this.msg){if(k==='y'||k==='enter')this.answer(true);else if(k==='n'||k==='back')this.answer(false);else if(!this.msg.yesno)this.answer();return;}
  const m=this.cur;if(!m)return;if(k==='back'){this.back();return;}
  if(m.pages){if(k==='enter'){if(++m.page>=m.pages.length)this.back();}return;}
  const step=d=>{let i=m.on;do{i=(i+d+m.items.length)%m.items.length;}while(m.items[i].skip);m.on=i;this.app.sound('pstop');};
  if(k==='up')step(-1);else if(k==='down')step(1);
  else if(k==='left'||k==='right'){const it=m.items[m.on];if(it.slide){it.slide(k==='left'?-1:1);this.app.sound('stnmov');}}
  else if(k==='enter'){const it=m.items[m.on];if(it.fn){this.app.sound('pistol');it.fn();}}}
 thermo(x,y,n,val){const v=this.v;v.patch('M_THERML',x,y);for(let i=0;i<n;i++)v.patch('M_THERMM',x+8+i*8,y);v.patch('M_THERMR',x+8+n*8,y);v.patch('M_THERMO',x+8+val*8,y);}
 draw(){
  const v=this.v,m=this.cur;
  if(this.msg){this.drawMessage();return;}
  if(!m)return;
  if(m.pages){v.fill(0);v.patchAt(m.pages[m.page],0,0);return;}
  for(const [l,x,y] of m.title||[])v.patch(l,x,y);
  if(m.heading)v.text(m.heading,160-v.textWidth(m.heading)/2,m.y-16);
  m.items.forEach((it,i)=>{
   if(m.text){const y=m.y+i*(m.line||12);if(y>195)return;v.text(it.text,m.x+(m.line<8?8:0),y,{tr:i===m.on?null:this.gray()});if(i===m.on)v.text('>',m.x-10+(m.line<8?8:0),y);return;}
   const y=m.y+i*LINE;
   if(m.save){v.patch('M_LSLEFT',m.x-8,y+7);for(let k=0;k<24;k++)v.patch('M_LSCNTR',m.x+k*8,y+7);v.patch('M_LSRGHT',m.x+24*8,y+7);v.text(it.label,m.x,y);return;}
   if(it.thermo){const [val,n]=it.thermo();this.thermo(m.x,y,n,val);return;}
   if(it.lump)v.patch(it.lump,m.x,y);else if(it.text)v.text(it.text,m.x,y+3);
   it.draw?.(m.x,y);});
  if(!m.text){const sy=m.y-5+m.on*LINE;v.patch(this.skull?'M_SKULL2':'M_SKULL1',m.x-32,sy);}
  if(this.stack.length||this.app.canCloseMenu())v.text('< BACK',4,4);}
 gray(){return this._gray||(this._gray=this.v.tint(80));}
 drawMessage(){const v=this.v,lines=this.msg.text.split('\n');let y=100-lines.length*4;
  for(const l of lines){v.text(l,160-v.textWidth(l)/2,y);y+=8;}
  if(this.msg.yesno){v.text('YES',80-v.textWidth('YES')/2,150);v.text('NO',240-v.textWidth('NO')/2,150);}}
}

// ---- intermission tally (WI) ----
const LNODES=[[[185,164],[148,143],[69,122],[209,102],[116,89],[166,55],[71,56],[135,29],[71,24]],
 [[254,25],[97,50],[188,64],[128,78],[214,92],[133,130],[208,136],[148,140],[235,158]],
 [[156,168],[48,154],[174,95],[265,75],[130,48],[279,23],[198,48],[140,25],[281,136]]];
class Intermission{
 constructor(app,stats){this.app=app;this.st=stats;this.state=1;this.cnt={kills:-1,items:-1,secret:-1,time:-1,par:-1};this.pause=35;this.bcnt=0;this.done=false;this.accel=false;this.phase='stats';this.blink=0;}
 get v(){return this.app.video;}
 bg(){const g=this.app.game;if(g.commercial||this.st.episode>3)return 'INTERPIC';return 'WIMAP'+(this.st.episode-1);}
 lname(map){const g=this.app.game;return g.commercial?'CWILV'+String(map-1).padStart(2,'0'):`WILV${this.st.episode-1}${map-1}`;}
 pct(n,d){return d?Math.floor(n*100/d):100;}
 tick(){
  this.bcnt++;this.blink++;const S=this.st,c=this.cnt,snd=n=>this.app.sound(n);
  if(this.phase==='stats'){
   if(this.accel&&this.state!==10){this.accel=false;c.kills=this.pct(S.kills,S.totalkills);c.items=this.pct(S.items,S.totalitems);c.secret=this.pct(S.secrets,S.totalsecret);c.time=S.time;c.par=S.par;snd('barexp');this.state=10;}
   const step=(k,target,next)=>{c[k]+=2;if(!(this.bcnt&3))snd('pistol');if(c[k]>=target){c[k]=target;snd('barexp');this.state=next;}};
   switch(this.state){
    case 2:case 4:case 6:case 8:if(!--this.pause){this.state++;this.pause=35;}break;
    case 1:if(c.kills<0)c.kills=0;step('kills',this.pct(S.kills,S.totalkills),2);break;
    case 3:if(c.items<0)c.items=0;step('items',this.pct(S.items,S.totalitems),4);break;
    case 5:if(c.secret<0)c.secret=0;step('secret',this.pct(S.secrets,S.totalsecret),6);break;
    case 7:if(c.time<0)c.time=0;if(c.par<0)c.par=0;c.time+=3;c.par+=3;if(!(this.bcnt&3))snd('pistol');if(c.time>=S.time)c.time=S.time;if(c.par>=S.par){c.par=S.par;if(c.time>=S.time){snd('barexp');this.state=8;}}break;
    case 10:if(this.accel){this.accel=false;snd('sgcock');if(this.app.game.commercial||this.st.episode>3||this.app.noNextLoc){this.phase='nostate';this.cnt.wait=10;}else{this.phase='next';this.cnt.wait=4*35;}}break;}}
  else if(this.phase==='next'){if(!--this.cnt.wait||this.accel){this.accel=false;this.phase='nostate';this.cnt.wait=10;}}
  else if(this.phase==='nostate'){if(!--this.cnt.wait)this.done=true;}}
 press(){this.accel=true;}
 num(x,y,n,digits){const v=this.v,w=v.width('WINUM0');n=Math.floor(n);if(digits<0)digits=n?String(n).length:1;for(let i=0;i<digits;i++){x-=w;v.patch('WINUM'+(n%10),x,y);n=Math.floor(n/10);}return x;}
 percent(x,y,p){if(p<0)return;this.v.patch('WIPCNT',x,y);this.num(x,y,p,-1);}
 time(x,y,t){if(t<0)return;const v=this.v;if(t<=61*59){let div=1;do{const n=Math.floor(t/div)%60;x=this.num(x,y,n,2)-v.width('WICOLON');div*=60;if(div===60||Math.floor(t/div))v.patch('WICOLON',x,y);}while(Math.floor(t/div));}else v.patch('WISUCKS',x-v.width('WISUCKS'),y);}
 draw(){
  const v=this.v,S=this.st;v.flatFill(this.app.game.commercial?'GRNROCK':'FLOOR7_2',0,0,v.r.W,v.r.H);v.patchAt(this.bg(),0,0);
  const g=this.app.game,lp=g.gfx.patch(this.lname(S.map)),np=g.gfx.patch(this.lname(S.next));
  if(this.phase==='stats'){
   if(lp)v.patch(lp,(320-lp.w)/2,2);else v.text(g.levelName(S.episode,S.map).toUpperCase(),160-v.textWidth(g.levelName(S.episode,S.map))/2,4);
   const fp=this.dead?null:g.gfx.patch('WIF');if(fp)v.patch(fp,(320-fp.w)/2,2+5*(lp?lp.h:12)/4);
   const lh=3*(g.gfx.patch('WINUM0')?.h||12)/2;
   v.patch('WIOSTK',50,50);this.percent(270,50,this.cnt.kills);
   v.patch('WIOSTI',50,50+lh);this.percent(270,50+lh,this.cnt.items);
   v.patch('WISCRT2',50,50+2*lh);this.percent(270,50+2*lh,this.cnt.secret);
   v.patch('WITIME',16,168);this.time(160-16,168,this.cnt.time);
   if(g.commercial||S.episode<4){v.patch('WIPAR',160+16,168);this.time(320-16,168,this.cnt.par);}
   if(this.app.turnScore)this.app.turnScore(v);}
  else{
   if(!g.commercial&&S.episode<=3){const nodes=LNODES[S.episode-1];for(let i=0;i<9;i++)if(i<S.map-1||(i===8&&S.didsecret))v.patch('WISPLAT',nodes[i][0],nodes[i][1]);
    if(this.blink&16&&nodes[S.next-1]){const p=g.gfx.patch('WIURH0');if(p)v.patch(p,nodes[S.next-1][0],nodes[S.next-1][1]);}}
   const ep=g.gfx.patch('WIENTER');if(ep)v.patch(ep,(320-ep.w)/2,2);if(np)v.patch(np,(320-np.w)/2,2+5*(ep?ep.h:12)/4);}}
}

// ---- finale: text crawl, end pictures, bunny scroll, Doom II cast call ----
const CAST=[['CC_ZOMBIE','POSSESSED'],['CC_SHOTGUN','SHOTGUY'],['CC_HEAVY','CHAINGUY'],['CC_IMP','TROOP'],['CC_DEMON','SERGEANT'],['CC_LOST','SKULL'],['CC_CACO','HEAD'],['CC_HELL','KNIGHT'],['CC_BARON','BRUISER'],['CC_ARACH','BABY'],['CC_PAIN','PAIN'],['CC_REVEN','UNDEAD'],['CC_MANCU','FATSO'],['CC_ARCH','VILE'],['CC_SPIDER','SPIDER'],['CC_CYBER','CYBORG'],['CC_HERO','PLAYER']];
class Finale{
 constructor(app,stats){this.app=app;this.st=stats;this.count=0;this.stage=0;this.done=false;const g=app.game;
  if(g.commercial){const k={6:'C1TEXT',11:'C2TEXT',20:'C3TEXT',30:'C4TEXT',15:'C5TEXT',31:'C6TEXT'}[stats.map];this.text=g.str(k);this.flat=g.str({6:'BGFLAT06',11:'BGFLAT11',20:'BGFLAT20',30:'BGFLAT30',15:'BGFLAT15',31:'BGFLAT31'}[stats.map]);}
  else{this.text=g.str('E'+stats.episode+'TEXT');this.flat=g.str('BGFLATE'+stats.episode);}
  app.music(g.commercial?'D_READ_M':'D_VICTOR');}
 get v(){return this.app.video;}
 tick(){this.count++;
  if(this.stage===0&&this.count>this.text.length*3+250+10){this.next();}
  if(this.stage==='cast')this.castTick();}
 next(){const g=this.app.game,S=this.st;
  if(g.commercial){if(S.map===30){this.stage='cast';this.castStart();return;}this.done=true;return;}
  this.stage=1;this.count=0;if(S.episode===3){this.stage='bunny';this.app.music('D_BUNNY');}}
 press(){if(this.stage===0){if(this.count<this.text.length*3+10)this.count=this.text.length*3+10;else this.next();return;}
  if(this.stage==='cast'){this.castDeath();return;}
  if(this.stage===1||(this.stage==='bunny'&&this.count>640))this.done=true;}
 draw(){const v=this.v,g=this.app.game;
  if(this.stage===0){v.flatFill(this.flat,0,0,v.r.W,v.r.H);let n=Math.floor((this.count-10)/3),x=10,y=10;
   for(const ch of this.text){if(n--<=0)break;if(ch==='\n'){x=10;y+=11;continue;}const p=v.fontChar(ch);if(!p){x+=4;continue;}if(x+p.w>320)continue;v.patchAt(p,x,y);x+=p.w;}return;}
  if(this.stage===1){v.fill(0);const S=this.st,pic=S.episode===1?(g.gamemode==='retail'?'CREDIT':'HELP2'):S.episode===2?'VICTORY2':'ENDPIC';v.patchAt(g.gfx.patch(pic)?pic:'CREDIT',0,0);return;}
  if(this.stage==='bunny'){v.fill(0);const sc=Math.max(0,Math.min(320,(this.count-230)/2));v.patchAt('PFUB2',-sc,0);v.patchAt('PFUB1',320-sc,0);
   if(this.count>=1130){const stage=Math.min(6,Math.floor((this.count-1180)/5));if(stage>=0)v.patch('END'+stage,(320-13*8)/2,(200-8*8)/2);}return;}
  if(this.stage==='cast'){v.patchAt('BOSSBACK',0,0);const c=this.cast;if(!c)return;const name=g.str(CAST[c.i][0]);v.text(name,160-v.textWidth(name)/2,180);
   const st=c.state;if(!st)return;const sd=g.gfx.sprites[st.sprite],fr=sd?.frames[st.frame&0x7fff];if(!fr)return;const p=g.gfx.patchAt(fr.lump[0]);if(p)v.patch(p,160,170,{flip:fr.flip[0]});}}
 castStart(){this.app.music('D_EVIL');this.castSet(0);}
 castSet(i){const g=this.app.game,I=require("src/engines/doom/info.js"),info=g.mobjinfo[I.MT[CAST[i][1]]];this.cast={i,info,dying:false,frames:0,state:g.states[info.seestate],tics:0,onAttack:false};this.cast.tics=this.cast.state.tics;if(info.seesound)this.app.sound(info.seesound);}
 castTick(){const c=this.cast,g=this.app.game;if(!c)return;if(--c.tics>0)return;
  if(c.state.tics===-1||c.state.next===0){if(c.dying){this.castSet((c.i+1)%CAST.length);return;}}
  let nx=c.state.next;c.frames++;
  if(!c.dying&&c.frames>=12){c.frames=0;const info=c.info;nx=info.missilestate||info.meleestate||info.seestate;if(!nx)nx=info.seestate;c.onAttack=!c.onAttack;if(!c.onAttack)nx=info.seestate;}
  c.state=g.states[nx]||c.state;c.tics=c.state.tics>0?c.state.tics:15;}
 castDeath(){const c=this.cast;if(!c||c.dying)return;c.dying=true;const g=this.app.game;c.state=g.states[c.info.deathstate];c.tics=c.state.tics;c.frames=0;if(c.info.deathsound)this.app.sound(c.info.deathsound);}
}
Object.assign(exports,{Menu,Intermission,Finale});
