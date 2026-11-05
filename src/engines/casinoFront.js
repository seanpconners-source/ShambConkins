// The casino's front of house (ROADMAP G13, owner Nov 5: "it just kind of begins... not clear what game it is, what the
// player is supposed to do, who these people are, what's even happening"). Shared by every Vegas table, drawn on the table's
// canvas through the scaffold (engines/vegasGame.js `G`):
//  - intro(): a full-screen welcome card: the game and the table, tonight's people (croupier/dealer, regulars, you), the
//    goal, how to play in three numbered steps, TAKE A SEAT (and RULES & PAYOUTS). Every session starts here.
//  - phase(text,sub,opts): the one banner that always says whose turn it is and what to do right now.
//  - coach steps: a first-time guided tour (dim everything but the thing to touch, a pulsing ring and a numbered bubble);
//    each step ends when the player does it; once finished it is remembered (profile.settings.casinoTips[key]).
//  - the ? rules sheet, opened from the top bar or the intro.
//  - summary(): the end card (everyone's chips before and after, the best moment, the dealer's verdict).
// A table calls F.act(id) first from its own act(), F.draw() last in its render(), and F.blocking() to know whether an
// overlay is up (the table then ignores felt taps).
const {store}=require('src/state.js');
let saveProfile=()=>{};try{saveProfile=require('src/profile.js').saveProfile;}catch{}

function createFront(G,spec){const {x,st,V,FONT,BODY,money}=G;
 const F={mode:null,res:null,rules:false,phaseInfo:null,coachOn:false,coachStep:0,coachT:0,best:[null,null],start:[G.BUY_IN,G.BUY_IN]};
 const seen=()=>!!store.profile?.settings?.casinoTips?.[spec.key];
 const markSeen=()=>{const p=store.profile;if(!p)return;(p.settings.casinoTips||={})[spec.key]=true;try{saveProfile(p);}catch{}};
 const charOf=id=>{try{return require('src/characters.js').character(id);}catch{return null;}};
 const sourceOf=id=>charOf(id)?.source||'';
 const W=()=>G.L?.W||G.c.width,H=()=>G.L?.H||G.c.height;
 const font=(px,w=400,f=FONT)=>`${w} ${Math.round(px)}px ${f}`;
 const text=(t,X,Y,size,col='#fff',al='left',w=400,f=FONT)=>{x.font=font(size,w,f);x.fillStyle=col;x.textAlign=al;x.textBaseline='middle';x.fillText(t,X,Y);};
 const wrapLines=(t,max,size,w=800,f=BODY)=>G.wrap(t,max,font(size,w,f));
 // ---- the people at the table, for the intro and the summary
 F.people=()=>{const out=[{id:G.dealerId,name:G.nameOf(G.dealerId),role:spec.dealerRole||'DEALER',src:sourceOf(G.dealerId),big:true}];
  for(const s of G.seats)if(s.kind==='extra')out.push({id:s.id,name:G.nameOf(s.id),role:'REGULAR',src:sourceOf(s.id)});
  for(const p of [0,1]){const pl=G.s.players[p];out.push({id:pl.character,name:pl.name+(G.cpu&&p===1?' (CPU)':''),role:G.local(p)?(G.cpu||G.net?'YOU':'PLAYER '+(p+1)):(G.cpu?'CPU':'ONLINE'),src:money(G.BUY_IN),player:p});}
  return out;};
 // ---- intro
 F.intro=()=>new Promise(res=>{F.mode='intro';F.res=()=>{F.mode=null;F.res=null;st.ui=null;res();};
  st.ui={mode:'front-intro',p:G.net?G.net.me:0,opts:{},res:()=>F.res?.()};});
 F.summary=()=>new Promise(res=>{F.mode='summary';F.res=()=>{F.mode=null;F.res=null;st.ui=null;res();};
  st.ui={mode:'front-summary',p:G.net?G.net.me:0,opts:{},res:()=>F.res?.()};});
 F.note=(p,amount,what)=>{if(amount>0&&(!F.best[p]||amount>F.best[p].amount))F.best[p]={amount,what};};
 F.blocking=()=>!!(F.mode||F.rules);
 F.act=id=>{if(id==='front:seat'||id==='front:done'){F.res?.();return true;}if(id==='front:rules'){F.rules=true;return true;}if(id==='front:close'){F.rules=false;return true;}
  if(id==='front:skip'){F.coachOn=false;markSeen();return true;}
  if(id==='front:music'||id==='front:sound'){const set=store.profile?.settings;if(!set)return true;if(id==='front:music'){const on=set.casinoMusic===false;set.casinoMusic=on;if(on&&!set.music)set.music=true;G.snd?.music(false);if(on)G.snd?.music(true);}else set.sound=!set.sound;try{saveProfile(store.profile);}catch{}return true;}return id.startsWith('front:');};
 F.bot=u=>u.mode==='front-intro'||u.mode==='front-summary'?{go:1}:null;
 // ---- the phase banner
 F.phase=(textLine,sub='',o={})=>{F.phaseInfo={text:textLine,sub,color:o.color||'#ffe9a8',p:o.p??null,t0:F.phaseInfo?.text===textLine?F.phaseInfo.t0:G.T};};
 F.drawPhase=(X,Y,w,h)=>{const ph=F.phaseInfo;if(!ph)return;x.save();const g=x.createLinearGradient(X,0,X+w,0);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.08,'rgba(6,4,10,.82)');g.addColorStop(.92,'rgba(6,4,10,.82)');g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=g;x.fillRect(X,Y,w,h);const k=Math.min(1,(G.T-ph.t0)*5),acc=ph.p===0?'#ffd23f':ph.p===1?'#7ab8ff':ph.color;x.fillStyle=acc;x.globalAlpha=.9;x.fillRect(X+w*.08,Y+h-2,w*.84*k,2);x.globalAlpha=1;
  let hx=X+w/2;const big=Math.min(h*.46,w*.06+6);
  if(ph.p!=null){const pl=G.s.players[ph.p],hc=V.head(pl.character,'normal'),hs=h*.86;x.font=font(big);const tw=x.measureText(ph.text).width;const left=X+w/2-(tw+hs+8)/2;
   if(hc)x.drawImage(hc,left,Y+h*.06,hs,hs);hx=left+hs+8+tw/2;}
  text(ph.text,hx,Y+h*(ph.sub?.36:.5),big,acc,'center');
  if(ph.sub){let sz=Math.max(10,h*.22);x.font=font(sz,800,BODY);const mw=x.measureText(ph.sub).width;if(mw>w*.92)sz*=w*.92/mw;text(ph.sub,X+w/2,Y+h*.76,sz,'rgba(255,255,255,.86)','center',800,BODY);}
  x.restore();};
 // ---- the first-time tour: spec.coach = [{text, rect:()=>{x,y,w,h}, done:()=>bool, when:()=>bool}]
 F.coachStart=()=>{if(seen())return;F.coachOn=true;F.coachStep=0;F.coachT=G.T;};
 F.coachTick=()=>{if(!F.coachOn)return null;const steps=spec.coach||[];while(F.coachStep<steps.length&&steps[F.coachStep].done())F.coachStep++,F.coachT=G.T;
  if(F.coachStep>=steps.length){F.coachOn=false;markSeen();return null;}const s=steps[F.coachStep];return s.when&&!s.when()?null:s;};
 function drawCoach(){const s=F.coachTick();if(!s)return;const r=s.rect();if(!r)return;const w=W(),h=H(),pad=6,pulse=(Math.sin((G.T-F.coachT)*5)+1)/2;
  x.save();x.fillStyle='rgba(0,0,0,.55)';x.beginPath();x.rect(0,0,w,h);V.rr(x,r.x-pad,r.y-pad,r.w+pad*2,r.h+pad*2,12);x.fill('evenodd');
  x.strokeStyle='#ffd23f';x.lineWidth=3+pulse*2;x.shadowColor='#ffd23f';x.shadowBlur=12+pulse*10;V.rr(x,r.x-pad,r.y-pad,r.w+pad*2,r.h+pad*2,12);x.stroke();x.shadowBlur=0;
  const n=F.coachStep+1,size=Math.max(14,Math.min(20,w*.045)),lines=wrapLines(s.text,Math.min(w*.8,320)-24,size*.8),bw=Math.min(w*.86,340),bh=lines.length*size*1.05+size*1.9;
  const above=r.y-bh-18>((G.fb.top||40)+4),by=above?r.y-pad-bh-14:Math.min(h-bh-6,r.y+r.h+pad+14),bx=Math.max(8,Math.min(w-bw-8,r.x+r.w/2-bw/2));
  x.fillStyle='#fff9e6';V.rr(x,bx,by,bw,bh,14);x.fill();const ax=Math.max(bx+18,Math.min(bx+bw-18,r.x+r.w/2));x.beginPath();if(above){x.moveTo(ax-9,by+bh);x.lineTo(ax+9,by+bh);x.lineTo(ax,by+bh+10);}else{x.moveTo(ax-9,by);x.lineTo(ax+9,by);x.lineTo(ax,by-10);}x.fill();
  x.fillStyle='#d79a1c';x.beginPath();x.arc(bx+size*1.05,by+size*.95,size*.62,0,7);x.fill();text(String(n),bx+size*1.05,by+size*.98,size*.8,'#fff','center');
  text(s.title||'',bx+size*2,by+size*.95,size*.9,'#2a1800','left');lines.forEach((l,i)=>text(l,bx+14,by+size*1.95+i*size*1.05,size*.8,'#3a2a10','left',800,BODY));
  const sk={id:'front:skip',X:bx+bw-62,Y:by+4,w:56,h:size*1.3};text('SKIP',sk.X+sk.w/2,sk.Y+sk.h/2,size*.6,'#9a7a40','center',900,BODY);G.hits.push(sk);x.restore();}
 // ---- the rules sheet
 function drawRules(){const w=W(),h=H();x.save();x.fillStyle='rgba(3,2,6,.95)';x.fillRect(0,0,w,h);G.hits=[{id:'front:close',X:0,Y:0,w,h}];
  const cw=Math.min(w-28,520),cx=(w-cw)/2;let y=(G.fb.top||40)+10;const secs=spec.rules||[];
  let size=Math.max(11,Math.min(15,w*.036));const est=secs.reduce((a,[,lines])=>a+size*2+lines.length*size*1.35,size*3);if(est>h-y-40)size*=(h-y-40)/est;
  text(spec.title,w/2,y+size*1.2,size*2.1,'#ffd23f','center');y+=size*3;
  for(const [hd,lines] of secs){text(hd,cx,y,size*1.05,'#ffe9a8','left');y+=size*1.4;for(const l of lines){if(Array.isArray(l)){text(l[0],cx+6,y,size*.92,'#fff','left',800,BODY);text(l[1],cx+cw,y,size*.92,'#ffd23f','right',900,BODY);}
    else{for(const ln of wrapLines(l,cw-8,size*.92)){text(ln,cx+6,y,size*.92,'rgba(255,255,255,.88)','left',800,BODY);y+=size*1.25;}y-=size*1.25;}y+=size*1.3;}y+=size*.5;}
  // the table's own switches: music (this casino only) and sound effects
  {const set=store.profile?.settings||{},mOn=set.music!==false&&set.casinoMusic!==false,sOn=!!set.sound,bw=Math.min(150,(cw-12)/2),bh=40,by=Math.min(h-80,y+size*.6),keep=G.hits;G.hits=[];
   G.btn({id:'front:music',X:w/2-bw-6,Y:by,w:bw,h:bh,label:mOn?'♪ MUSIC ON':'♪ MUSIC OFF',tone:mOn?'green':'dark'});G.btn({id:'front:sound',X:w/2+6,Y:by,w:bw,h:bh,label:sOn?'SOUNDS ON':'SOUNDS OFF',tone:sOn?'green':'dark'});G.hits=[...G.hits,...keep];}
  text('TAP ANYWHERE ELSE TO GO BACK',w/2,h-22,size*.9,'rgba(255,255,255,.6)','center',900,BODY);x.restore();}
 // ---- the intro card
 function drawIntro(){const w=W(),h=H(),T=G.T,th=G.theme;x.save();
  const g=x.createRadialGradient(w/2,h*.3,10,w/2,h*.4,Math.max(w,h)*.8);g.addColorStop(0,th.felt||'#14503f');g.addColorStop(1,'#050307');x.fillStyle=g;x.fillRect(0,0,w,h);
  x.globalAlpha=.06;for(let i=0;i<14;i++){x.fillStyle=th.trim||'#d9b45a';x.beginPath();x.arc((i*97)%w,(i*173)%h,30+(i%4)*20,0,7);x.fill();}x.globalAlpha=1;
  G.hits=[];const wide=w>h*1.15,top=(G.fb.top||40)+6,colW=wide?Math.min(w/2-30,440):Math.min(w-32,460),c1=wide?w/2-colW-12:(w-colW)/2,c2=wide?w/2+12:c1;
  const ppl=F.people(),steps=spec.steps||[];
  // measure at size 1 then scale everything to fit the height
  const lay=k=>{const s=v=>v*k;let y=top,y2=top;const r={};
   r.theme=y+s(10);y+=s(26);r.title=y+s(26);y+=s(58);r.sub=y;y+=s(28);
   r.who=y;y+=s(22);r.cards=y;const cardH=s(78);y+=cardH+s(14);r.cardH=cardH;
   if(wide){y2=top;r.goal=y2+s(10);y2+=s(26);}else{r.goal=y;y+=s(22);}
   const goalLines=wrapLines(spec.goal,colW,s(13.5));let gy=wide?y2:y;r.goalLines=goalLines;r.goalY=gy;gy+=goalLines.length*s(17)+s(16);
   r.how=gy;gy+=s(24);r.steps=gy;const stepLines=steps.map(([t,d])=>wrapLines(d,colW-s(52),s(12.5)));r.stepLines=stepLines;gy+=stepLines.reduce((a,l)=>a+s(22)+l.length*s(15.5)+s(8),0);
   r.btn=gy+s(8);gy+=s(56)+s(46);if(wide)y2=gy;else y=gy;r.end=Math.max(y,y2);return r;};
  let k=1,r=lay(1);if(r.end>h-8){k=Math.max(.55,(h-8-top)/(r.end-top));r=lay(k);}const s=v=>v*k;
  text(`${th.title} · ${th.source}`.toUpperCase(),c1+(wide?0:colW/2),r.theme,s(11),'rgba(255,233,168,.75)',wide?'left':'center',900,BODY);
  x.save();x.font=font(s(52));let tsz=s(52);const tw=x.measureText(spec.title).width;if(tw>colW)tsz*=colW/tw;x.restore();
  x.save();x.lineWidth=tsz*.12;x.strokeStyle='#1a0e02';x.font=font(tsz);x.textAlign=wide?'left':'center';x.textBaseline='middle';const tx=c1+(wide?0:colW/2);x.strokeText(spec.title,tx,r.title);
  const tg=x.createLinearGradient(0,r.title-tsz/2,0,r.title+tsz/2);tg.addColorStop(0,'#fff3b0');tg.addColorStop(1,'#e0a21e');x.fillStyle=tg;x.fillText(spec.title,tx,r.title);x.restore();
  text(spec.sub,tx,r.sub,s(13),'#fff',wide?'left':'center',800,BODY);
  text('TONIGHT AT THE TABLE',c1,r.who,s(13),'#ffe9a8','left');
  // people cards: the dealer first (bigger), then regulars, then the players
  const n=ppl.length,gap=s(6),cw2=(colW-gap*(n-1))/n;ppl.forEach((pp,i)=>{const X=c1+i*(cw2+gap),Y=r.cards,hc=V.head(pp.id,'normal'),hs=Math.min(cw2*.82,r.cardH*.58);
   x.fillStyle=pp.player!=null?(pp.player===0?'rgba(255,210,63,.16)':'rgba(122,184,255,.16)'):pp.big?'rgba(255,233,168,.14)':'rgba(255,255,255,.07)';V.rr(x,X,Y,cw2,r.cardH,10);x.fill();
   if(pp.big||pp.player!=null){x.strokeStyle=pp.player===0?'#ffd23f':pp.player===1?'#7ab8ff':'rgba(255,233,168,.6)';x.lineWidth=1.5;V.rr(x,X,Y,cw2,r.cardH,10);x.stroke();}
   if(hc){const bob=Math.sin(T*2+i)*1.2;x.drawImage(hc,X+cw2/2-hs/2,Y+s(3)+bob,hs,hs);}
   const fit=(t,max,sz,wt,f)=>{x.font=font(sz,wt,f);const m=x.measureText(t).width;return m>max?sz*max/m:sz;};
   const nm=String(pp.name).split(' ').slice(0,2).join(' ');text(nm,X+cw2/2,Y+r.cardH*.72,fit(nm,cw2-6,s(11),900,BODY),'#fff','center',900,BODY);
   text(pp.role,X+cw2/2,Y+r.cardH*.86,fit(pp.role,cw2-6,s(8.5),900,BODY),pp.player===0?'#ffd23f':pp.player===1?'#9ad0ff':'#ffe9a8','center',900,BODY);});
  // the goal and the steps
  const gx=c2;text('THE GOAL',gx,r.goal,s(13),'#ffe9a8','left');r.goalLines.forEach((l,i)=>text(l,gx,r.goalY+s(14)+i*s(17),s(13.5),'#fff','left',800,BODY));
  text('HOW TO PLAY',gx,r.how,s(13),'#ffe9a8','left');let sy=r.steps;steps.forEach(([t,d],i)=>{const cy=sy+s(10);x.fillStyle='#d79a1c';x.beginPath();x.arc(gx+s(14),cy+s(4),s(13),0,7);x.fill();text(String(i+1),gx+s(14),cy+s(5),s(15),'#fff','center');
   text(t,gx+s(36),cy,s(15),'#fff','left');r.stepLines[i].forEach((l,j)=>text(l,gx+s(36),cy+s(18)+j*s(15.5),s(12.5),'rgba(255,255,255,.82)','left',800,BODY));sy+=s(22)+r.stepLines[i].length*s(15.5)+s(8);});
  const bw=Math.min(colW,360),bx=gx+(wide?0:(colW-bw)/2);G.btn({id:'front:seat',X:bx,Y:r.btn,w:bw,h:s(56),label:F.mode==='summary'?'FINISH':'TAKE A SEAT',sub:spec.seatSub||'',tone:'gold'});
  G.btn({id:'front:rules',X:bx+bw*.2,Y:r.btn+s(64),w:bw*.6,h:s(36),label:'RULES & PAYOUTS',tone:'dark'});x.restore();}
 // ---- the summary card
 function drawSummary(){const w=W(),h=H();x.save();x.fillStyle='rgba(4,3,8,.92)';x.fillRect(0,0,w,h);G.hits=[];const cw=Math.min(w-28,460),cx=(w-cw)/2;let y=(G.fb.top||40)+14;
  const size=Math.max(12,Math.min(16,w*.04));text('TABLE CLOSED',w/2,y+size,size*2.4,'#ffd23f','center');y+=size*3.4;
  const lead=st.bank[0]===st.bank[1]?-1:st.bank[0]>st.bank[1]?0:1;
  for(const p of [0,1]){const pl=G.s.players[p],hc=V.head(pl.character,p===lead?'win':'normal'),hs=size*4.2,ch=Math.round(st.bank[p]-F.start[p]);
   x.fillStyle=p===0?'rgba(255,210,63,.12)':'rgba(122,184,255,.12)';V.rr(x,cx,y,cw,hs+size*1.4,12);x.fill();if(hc)x.drawImage(hc,cx+8,y+size*.5,hs,hs);
   text(pl.name+(G.cpu&&p===1?' (CPU)':''),cx+hs+18,y+size*1.3,size*1.35,p===0?'#ffd23f':'#9ad0ff','left');
   text(`${money(F.start[p])}  →  ${money(st.bank[p])}`,cx+hs+18,y+size*2.8,size*1.05,'#fff','left',900,BODY);
   text(`${ch>=0?'+':'−'}${money(Math.abs(ch))}`,cx+cw-12,y+size*1.3,size*1.35,ch>=0?'#7dff9a':'#ff8a7a','right');
   const b=F.best[p];text(b?`Best: ${b.what} (+${money(b.amount)})`:'No wins tonight',cx+hs+18,y+size*4.1,size*.85,'rgba(255,255,255,.72)','left',800,BODY);
   if(p===lead)text('★ TOP OF THE TABLE',cx+cw-12,y+size*2.8,size*.8,'#ffd23f','right',900,BODY);y+=hs+size*2.2;}
  const imp=st.impressed.some(Boolean)?`${G.nameOf(G.dealerId)} is impressed and joins the party!`:`Break the bank (${money(G.BUY_IN*1.5)}+) and ${G.nameOf(G.dealerId)} joins your party.`;
  for(const l of wrapLines(imp,cw,size)){text(l,w/2,y,size,'#ffe9a8','center',900,BODY);y+=size*1.3;}
  G.btn({id:'front:done',X:w/2-Math.min(cw,300)/2,Y:Math.min(h-70,y+size),w:Math.min(cw,300),h:52,label:'FINISH',tone:'gold'});x.restore();}
 // ---- the top bar: game + round, a ? button (returns its rect)
 F.topBar=(title,round)=>{const top=G.fb.top||40,size=Math.max(13,Math.min(18,W()*.042));x.save();text(title,12,size*.95+4,size*1.2,'#ffe9a8','left');
  if(round)text(round,12,size*2.15+4,size*.72,'rgba(255,255,255,.75)','left',900,BODY);x.font=font(size*1.2);const tw=x.measureText(title).width,qx=12+tw+10,qy=4+size*.35,qs=size*1.25;
  x.fillStyle='rgba(255,255,255,.14)';x.beginPath();x.arc(qx+qs/2,qy+qs/2,qs/2,0,7);x.fill();text('?',qx+qs/2,qy+qs/2+1,qs*.72,'#fff','center');G.hits.push({id:'front:rules',X:qx-6,Y:qy-6,w:qs+12,h:qs+12});x.restore();void top;};
 F.draw=()=>{if(F.mode==='intro')drawIntro();else if(F.mode==='summary')drawSummary();else if(F.rules)drawRules();else drawCoach();};
 return F;}
Object.assign(exports,{createFront});
