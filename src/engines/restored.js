const {swingingPaintCans}=require("src/engines/paintCan.js");
const {touchSwordDuel}=require("src/engines/swordDuel.js");
const {compactSumo, swipeRace}=require("src/engines/compactArena.js");
const {swipeLightcycles, swipeSnakeDuel}=require("src/engines/directionalDuels.js");
const {duelInputs, duelAction}=require("src/engines/duelControls.js");
const {originalContext}=require("src/engines/originalContext.js");
const {coneChaos}=require("src/engines/coneChaos.js");
async function lightcycle(s){return swipeLightcycles(s);}
async function minichess(s){
 const {canvasSetup,q,$,state,profile,clamp,mgDone,sp,hp,beepFx,buzz,playSfx,haptic,beep,toast,openMG,coneSVG,esc17,getTime,shuffle17,char,rgba,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math}=originalContext(s);
 let gameCleanup=()=>{};s.cleanup(()=>gameCleanup());
 if(!await s.pass(0,s.game.rules))return;
 const play=function(d){
    const z=canvasSetup(d),c=z[0],ctx=z[1],controls=z[2],status=z[3],W=z[4],H=z[5];let done=false,p=0,sel=null,moves=0;
    // K king, R rook, N knight, P pawn. uppercase p0, lowercase p1
    let b=[['r','n','k','n','r'],['p','p','p','p','p'],[null,null,null,null,null],['P','P','P','P','P'],['R','N','K','N','R']];
    controls.innerHTML='<button class="ctrl" disabled>5×5 MINI CHESS</button><button class="ctrl" disabled>CAPTURE KING</button><button class="ctrl" id="mcClear">CLEAR SELECT</button><button class="ctrl" disabled>♟️</button>';q('mcClear').onclick=()=>{sel=null;draw()};
    function owner(pc){if(!pc)return -1;return pc===pc.toUpperCase()?0:1}
    function legal(fr,fc,tr,tc){const pc=b[fr][fc];if(!pc||owner(pc)!==p||owner(b[tr][tc])===p)return false;const dr=tr-fr,dc=tc-fc,t=pc.toUpperCase();if(t==='K')return Math.max(Math.abs(dr),Math.abs(dc))===1;if(t==='N')return [1,2].includes(Math.abs(dr))&&[1,2].includes(Math.abs(dc))&&Math.abs(dr)!==Math.abs(dc);if(t==='P'){const dir=p===0?-1:1;if(dc===0&&dr===dir&&!b[tr][tc])return true;if(Math.abs(dc)===1&&dr===dir&&b[tr][tc]&&owner(b[tr][tc])!==p)return true;return false}if(t==='R'){if(dr!==0&&dc!==0)return false;const sr=Math.sign(dr),sc=Math.sign(dc);let r=fr+sr,c=fc+sc;while(r!==tr||c!==tc){if(b[r][c])return false;r+=sr;c+=sc}return true}return false}
    c.onclick=e=>{if(done)return;const rr=c.getBoundingClientRect(),x=(e.clientX-rr.left)/rr.width*W,y=(e.clientY-rr.top)/rr.height*H,size=Math.min(W,H)*.82,ox=(W-size)/2,oy=(H-size)/2,cc=Math.floor((x-ox)/(size/5)),r=Math.floor((y-oy)/(size/5));if(cc<0||cc>4||r<0||r>4)return;if(sel){const [fr,fc]=sel;if(legal(fr,fc,r,cc)){const cap=b[r][cc];b[r][cc]=b[fr][fc];b[fr][fc]=null;if(b[r][cc]==='P'&&r===0)b[r][cc]='R';if(b[r][cc]==='p'&&r===4)b[r][cc]='r';sel=null;beepFx(cap?'win':'coin');if(cap&&cap.toUpperCase()==='K'){done=true;setTimeout(()=>mgDone(p,`${state.players[p].name} captures the king in Three-Dimensional-ish Chess.`,11),400);return}if(++moves>=80){done=true;mgDone(null,'Mini Chess draw after 80 moves.');return}p=p?0:1;draw();return}sel=null}if(b[r][cc]&&owner(b[r][cc])===p)sel=[r,cc];draw()};
    function glyph(pc){return {K:'♔',R:'♖',N:'♘',P:'♙',k:'♚',r:'♜',n:'♞',p:'♟'}[pc]||''}
    function draw(){ctx.fillStyle='#111a2c';ctx.fillRect(0,0,W,H);const size=Math.min(W,H)*.82,ox=(W-size)/2,oy=(H-size)/2,cell=size/5;for(let r=0;r<5;r++)for(let c2=0;c2<5;c2++){ctx.fillStyle=(r+c2)%2?'#7290a4':'#d7e0df';ctx.fillRect(ox+c2*cell,oy+r*cell,cell,cell);if(sel&&sel[0]===r&&sel[1]===c2){ctx.fillStyle='#ffe65a88';ctx.fillRect(ox+c2*cell,oy+r*cell,cell,cell)}const pc=b[r][c2];if(pc){ctx.fillStyle=owner(pc)===0?'#f9d95b':'#e871a4';ctx.font=`${cell*.68}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';s.sprite(ctx,owner(pc),ox+(c2+.5)*cell,oy+(r+.46)*cell,39,{maxSize:cell*.79});ctx.fillStyle='#142033';ctx.fillRect(ox+(c2+.68)*cell,oy+(r+.64)*cell,cell*.29,cell*.31);ctx.fillStyle='#fff';ctx.font=`${cell*.28}px serif`;ctx.fillText(glyph(pc),ox+(c2+.82)*cell,oy+(r+.8)*cell)}}status.textContent=`${state.players[p].name}'s move • capture the opposing king`}
    gameCleanup=()=>{done=true};draw()
  };play(s.game);
}
async function fruitmerge(s){
 const {canvasSetup,q,$,state,profile,clamp,mgDone,sp,hp,beepFx,buzz,playSfx,haptic,beep,toast,openMG,coneSVG,esc17,getTime,shuffle17,char,rgba,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math}=originalContext(s);
 let gameCleanup=()=>{};s.cleanup(()=>gameCleanup());
 if(!await s.pass(0,s.game.rules))return;
 const play=function(d){
function finishOriginal(w,label,reward){mgDone(w,label,reward,score);}
s.debug.originalScore=()=>[...score];
    const z=canvasSetup(d),c=z[0],ctx=z[1],controls=z[2],status=z[3],W=z[4],H=z[5];let done=false,raf=0,time=40,timer=0;const cols=4,rows=7,boards=[Array.from({length:cols},()=>[]),Array.from({length:cols},()=>[])],cursor=[1,2],score=[0,0];const fruits=['🍒','🍓','🍊','🍎','🍑','🍍','🍉'];
    const inputs=duelInputs(s,{horizontal:true,fire:true,fireLabel:'DROP'}),previous=[{},{}];s.debug.edgeInputs=inputs;
    function drop(i){const col=boards[i][cursor[i]];if(col.length>=rows)return;col.push(Math.random()<.75?0:1);merge(i,cursor[i]);beepFx('coin')}
    function merge(i,c){const col=boards[i][c];while(col.length>=2&&col[col.length-1]===col[col.length-2]&&col[col.length-1]<fruits.length-1){const lv=col.pop();col[col.length-1]=lv+1;score[i]+=Math.pow(2,lv+1);buzz(8)}}
    function finish(){if(done)return;done=true;clearInterval(timer);cancelAnimationFrame(raf);const w=score[0]===score[1]?null:(score[0]>score[1]?0:1);finishOriginal(w,w===null?`Brawndo Fruit Merge ties ${score[0]}–${score[1]}.`:`${state.players[w].name} wins Fruit Merge ${score[w]}–${score[w?0:1]}.`,8)}
    function drawBoard(i,ox,w){ctx.fillStyle=i?'#502d58':'#345b43';ctx.fillRect(ox,0,w,H);const cw=w/cols,ch=(H-40)/rows;for(let c2=0;c2<cols;c2++){ctx.strokeStyle='#ffffff22';ctx.strokeRect(ox+c2*cw,40,cw,H-40);const col=boards[i][c2];for(let r=0;r<col.length;r++){ctx.font=Math.min(cw,ch)*.65+'px system-ui';ctx.textAlign='center';ctx.fillText(fruits[col[r]],ox+(c2+.5)*cw,H-(r+.45)*ch)}if(cursor[i]===c2){ctx.fillStyle='#fff8';ctx.fillRect(ox+c2*cw+cw*.25,8,cw*.5,7);s.sprite(ctx,i,ox+(c2+.5)*cw,53,32,{exact:true})}}ctx.fillStyle='#fff';ctx.font='800 12px system-ui';ctx.textAlign='center';ctx.fillText(`${state.players[i].name} • ${score[i]}`,ox+w/2,27)}
    function loop(){if(done)return;for(let i=0;i<2;i++){for(const key of ['l','r','fire'])if(inputs[i][key]&&!previous[i][key]){if(key==='fire')drop(i);else cursor[i]=clamp(cursor[i]+(key==='r'?1:-1),0,cols-1);}previous[i]={...inputs[i]};}drawBoard(0,0,W/2-3);drawBoard(1,W/2+3,W/2-3);status.textContent=`MERGE MATCHING FRUIT • ${time}s`;raf=requestAnimationFrame(loop)}timer=setInterval(()=>{time--;if(time<=0||boards.some(b=>b.every(c=>c.length>=rows)))finish()},1000);gameCleanup=()=>{done=true;clearInterval(timer);cancelAnimationFrame(raf)};loop()
  };play(s.game);
}
const slingshot=swingingPaintCans;
async function penalty(s){
 const {canvasSetup,q,$,state,profile,clamp,mgDone,sp,hp,beepFx,buzz,playSfx,haptic,beep,toast,openMG,coneSVG,esc17,getTime,shuffle17,char,rgba,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math}=originalContext(s);
 let gameCleanup=()=>{};s.cleanup(()=>gameCleanup());
 if(!await s.pass(0,s.game.rules))return;
 const play=function(d){
function finishOriginal(w,label,reward){mgDone(w,label,reward,scores);}
s.debug.originalScore=()=>[...scores];
    const z=canvasSetup(d),c=z[0],ctx=z[1],controls=z[2],status=z[3],W=z[4],H=z[5];
    let kicker=0,round=0,scores=[0,0],stage='goalie',goaliePick=null,done=false;
    function goalie(){return kicker?0:1}
    function renderControls(){
      if(stage==='goalie'){controls.innerHTML=`<div class="dualSide" style="grid-column:1/-1"><div class="dualName">${state.players[goalie()].name}: PICK DIVE SECRETLY</div><button class="ctrl" id="pkL">LEFT</button><button class="ctrl" id="pkC">CENTER</button><button class="ctrl" id="pkR">RIGHT</button></div>`;
        ['L','C','R'].forEach(k=>q('pk'+k).onclick=()=>{goaliePick=k;stage='pass';renderControls();draw()})}
      else if(stage==='pass'){controls.innerHTML=`<button class="ctrl bigMash" id="pkPass" style="grid-column:1/-1">PASS PHONE TO ${state.players[kicker].name.toUpperCase()}</button>`;q('pkPass').onclick=()=>{stage='kick';renderControls();draw()}}
      else if(stage==='kick'){controls.innerHTML=`<div class="dualSide" style="grid-column:1/-1"><div class="dualName">${state.players[kicker].name}: PICK SHOT</div><button class="ctrl" id="pkL">LEFT</button><button class="ctrl" id="pkC">CENTER</button><button class="ctrl" id="pkR">RIGHT</button></div>`;['L','C','R'].forEach(k=>q('pk'+k).onclick=()=>resolve(k))}
    }
    function resolve(shot){stage='reveal';const goal=shot!==goaliePick;if(goal){scores[kicker]++;beepFx('win')}else beepFx('lose');buzz(goal?12:20);draw(goal,shot);setTimeout(()=>{
        round++;kicker=kicker?0:1;if(round>=10)return finish();stage='goalie';goaliePick=null;renderControls();draw()
      },950)}
    function finish(){done=true;const w=scores[0]===scores[1]?null:(scores[0]>scores[1]?0:1);finishOriginal(w,w===null?`Penalty Kicks ties ${scores[0]}–${scores[1]}.`:`${state.players[w].name} wins Penalty Kicks ${scores[w]}–${scores[w?0:1]}.`,8)}
    function draw(goal=null,shot=null){ctx.fillStyle='#4a9a4c';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.fillRect(W*.18,H*.24,W*.64,8);ctx.fillRect(W*.18,H*.24,8,H*.44);ctx.fillRect(W*.82,H*.24,8,H*.44);ctx.strokeStyle='#fff8';ctx.strokeRect(W*.18,H*.24,W*.64,H*.44);
      ctx.font='52px system-ui';ctx.textAlign='center';ctx.fillText('🥅',W/2,H*.48);if(stage==='reveal'){const xs={L:W*.34,C:W*.5,R:W*.66};ctx.font='42px system-ui';ctx.fillText('⚽',xs[shot],H*.48);ctx.font='36px system-ui';ctx.fillText('🧤',xs[goaliePick],H*.39);s.sprite(ctx,goalie(),xs[goaliePick],H*.27,42,{mood:goal?'sad':'win'});ctx.font='900 28px system-ui';ctx.fillStyle=goal?'#dfffa9':'#ffe0e0';ctx.fillText(goal?'GOAL!':'SAVED!',W/2,H*.78)}
      else{ctx.fillStyle='#fff';ctx.font='800 20px system-ui';ctx.fillText(stage==='goalie'?'GOALIE CHOOSES IN SECRET':stage==='pass'?'PASS THE PHONE':'STRIKER CHOOSES SHOT',W/2,H*.78)}
      s.sprite(ctx,kicker,W*.13,H*.82,43);if(stage!=='reveal')s.sprite(ctx,goalie(),W/2,H*.36,43,{mood:'thinking'});
      status.textContent=`KICK ${Math.floor(round/2)+1}/5 • ${state.players[0].name} ${scores[0]} — ${scores[1]} ${state.players[1].name}`}
    gameCleanup=()=>{done=true};renderControls();draw()
  };play(s.game);
}
async function sumo(s){return compactSumo(s);}
async function dualrace(s){return swipeRace(s);}
async function snakeduel(s){return swipeSnakeDuel(s);}
async function moneygrab(s){
 const {canvasSetup,q,$,state,profile,clamp,mgDone,sp,hp,beepFx,buzz,playSfx,haptic,beep,toast,openMG,coneSVG,esc17,getTime,shuffle17,char,rgba,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math}=originalContext(s);
 let gameCleanup=()=>{};s.cleanup(()=>gameCleanup());
 if(!await s.pass(0,s.game.rules))return;
 const play=function(d){
    const z=canvasSetup(d),c=z[0],ctx=z[1],controls=z[2],status=z[3],W=z[4],H=z[5];let done=false,raf=0,time=30,timer=0,frame=0,things=[];
    const p=[{x:W*.25,score:0},{x:W*.75,score:0}],keys=duelInputs(s,{horizontal:true});s.debug.edgeInputs=keys;
    function finish(){if(done)return;done=true;clearInterval(timer);cancelAnimationFrame(raf);const w=p[0].score===p[1].score?null:(p[0].score>p[1].score?0:1);mgDone(w,w===null?`Banana Stand Grab ties at $${p[0].score}.`:`${state.players[w].name} finds more banana-stand money: $${p[w].score}.`,8)}
    function loop(){if(done)return;frame++;if(frame%18===0)things.push({x:20+Math.random()*(W-40),y:-20,vy:2.5+Math.random()*2,bad:Math.random()<.18});
      p.forEach((o,i)=>o.x=clamp(o.x+((keys[i].r?1:0)-(keys[i].l?1:0))*5,25,W-25));for(let i=things.length-1;i>=0;i--){const t=things[i];t.y+=t.vy;for(let j=0;j<2;j++)if(Math.abs(t.x-p[j].x)<28&&t.y>H-62&&t.y<H-20){p[j].score+=t.bad?-5:2;s.react?.(j,t.bad?'sad':'happy');beepFx(t.bad?'lose':'coin');things.splice(i,1);break}if(t.y>H+20)things.splice(i,1)}
      ctx.fillStyle='#f5cf59';ctx.fillRect(0,0,W,H);ctx.fillStyle='#82542e';ctx.fillRect(W*.38,H*.12,W*.24,H*.16);ctx.fillStyle='#fff1bf';ctx.font='900 17px system-ui';ctx.textAlign='center';ctx.fillText('BANANA STAND',W/2,H*.21);things.forEach(t=>{ctx.font='26px system-ui';ctx.fillText(t.bad?'🦭':'💵',t.x,t.y)});p.forEach((o,i)=>{ctx.font='38px system-ui';ctx.fillText(i?'🧺':'🪣',o.x,H-22);s.sprite(ctx,i,o.x,H-59,40)});status.textContent=`${state.players[0].name} $${p[0].score} • ${time}s • $${p[1].score} ${state.players[1].name}`;raf=requestAnimationFrame(loop)}
    timer=setInterval(()=>{time--;if(time<=0)finish()},1000);gameCleanup=()=>{done=true;clearInterval(timer);cancelAnimationFrame(raf)};loop()
  };play(s.game);
}
const sword2p=touchSwordDuel;
async function basketball2p(s){
 const {canvasSetup,q,$,state,profile,clamp,mgDone,sp,hp,beepFx,buzz,playSfx,haptic,beep,toast,openMG,coneSVG,esc17,getTime,shuffle17,char,rgba,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math}=originalContext(s);
 let gameCleanup=()=>{};s.cleanup(()=>gameCleanup());
 if(!await s.pass(0,s.game.rules))return;
 const play=function(d){
function finishOriginal(w,label,reward){mgDone(w,label,reward,scores);}
s.debug.originalScore=()=>[...scores];
    const z=canvasSetup(d),c=z[0],ctx=z[1],controls=z[2],status=z[3],W=z[4],H=z[5];let p=0,shots=5,scores=[0,0],done=false,raf=0,shotEnding=false,idle=0,ball,drag=false,pull=null;
    const origin={x:85,y:H-62},hoop={x:W-95,y:H*.36};
    controls.innerHTML='<button class="ctrl" disabled>DRAG BALL</button><button class="ctrl" disabled>5 SHOTS EACH</button><button class="ctrl" id="bbReset">RESET SHOT</button><button class="ctrl" disabled>SWISH = 3</button>';q('bbReset').onclick=()=>{if(!ball.flying&&shots>0)reset()};setInterval(()=>{if(!done&&!ball.flying&&++idle>=20){shots--;endShot();}},1000);
    function reset(){idle=0;ball={x:origin.x,y:origin.y,vx:0,vy:0,flying:false,scored:false};drag=false;pull=null;shotEnding=false}
    function pos(e){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}}c.onpointerdown=e=>{if(ball.flying)return;const pt=pos(e);if(Math.hypot(pt.x-ball.x,pt.y-ball.y)<65){drag=true;pull=pt;try{c.setPointerCapture(e.pointerId)}catch(_){}}};c.onpointermove=e=>{if(drag)pull=pos(e)};c.onpointerup=e=>{if(!drag)return;pull=pos(e);drag=false;const dx=origin.x-pull.x,dy=origin.y-pull.y,l=Math.hypot(dx,dy)||1,mag=Math.min(135,l);ball.vx=dx/l*mag*.105;ball.vy=dy/l*mag*.105;ball.flying=true;shots--};
    function endShot(){if(shots<=0){if(p===0){p=1;shots=5;reset();toast(`<b>${state.players[0].name}: ${scores[0]}</b><br>Pass the phone.`)}else{done=true;cancelAnimationFrame(raf);const w=scores[0]===scores[1]?null:(scores[0]>scores[1]?0:1);finishOriginal(w,w===null?`BASEketball ties ${scores[0]}–${scores[1]}.`:`${state.players[w].name} wins BASEketball ${scores[w]}–${scores[w?0:1]}.`,9)}}else reset()}
    function loop(){if(done)return;ctx.fillStyle='#e9c580';ctx.fillRect(0,0,W,H);ctx.fillStyle='#8c6239';ctx.fillRect(0,H-32,W,32);ctx.strokeStyle='#b93333';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(hoop.x-30,hoop.y);ctx.lineTo(hoop.x+30,hoop.y);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=2;for(let i=-24;i<=24;i+=12){ctx.beginPath();ctx.moveTo(hoop.x+i,hoop.y);ctx.lineTo(hoop.x+i*.5,hoop.y+34);ctx.stroke()}if(ball.flying){const prevY=ball.y;ball.vy+=.30;ball.x+=ball.vx;ball.y+=ball.vy;if(!ball.scored&&prevY<hoop.y&&ball.y>=hoop.y&&Math.abs(ball.x-hoop.x)<26&&ball.vy>0){ball.scored=true;scores[p]+=Math.abs(ball.x-hoop.x)<8?3:2;beepFx('win');buzz(12)}if((ball.y>H+30||ball.x>W+30||ball.x<-40)&&!shotEnding){shotEnding=true;setTimeout(endShot,100)}}if(drag&&pull){ctx.strokeStyle='#fff';ctx.setLineDash([7,7]);ctx.beginPath();ctx.moveTo(origin.x,origin.y);ctx.lineTo(origin.x+(origin.x-pull.x)*2.3,origin.y+(origin.y-pull.y)*2.3);ctx.stroke();ctx.setLineDash([])}ctx.font='36px system-ui';ctx.textAlign='center';ctx.fillText('🏀',ball.x,ball.y);s.sprite(ctx,p,origin.x-35,origin.y-38,43);s.marker?.(ctx,p,ball.x,ball.y,32);status.textContent=`${state.players[p].name} • ${shots} shots left • ${scores[p]} pts`;raf=requestAnimationFrame(loop)}reset();gameCleanup=()=>{done=true;cancelAnimationFrame(raf)};loop()
  };play(s.game);
}
async function ballrun2p(s){
 const {canvasSetup,q,$,state,profile,clamp,mgDone,sp,hp,beepFx,buzz,playSfx,haptic,beep,toast,openMG,coneSVG,esc17,getTime,shuffle17,char,rgba,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math}=originalContext(s);
 let gameCleanup=()=>{};s.cleanup(()=>gameCleanup());
 if(!await s.pass(0,s.game.rules))return;
 const play=function(d){
    const z=canvasSetup(d),c=z[0],ctx=z[1],controls=z[2],status=z[3],W=z[4],H=z[5];let done=false,raf=0,time=30,timer=0,frame=0;const p=[{y:H*.32,vy:0,alive:true,dist:0},{y:H*.72,vy:0,alive:true,dist:0}],obs=[[],[]],boulder=[-80,-80];
    controls.className='dualPad';controls.innerHTML=`<button class="ctrl bigMash" id="br0">${state.players[0].name}<br>JUMP</button><button class="ctrl bigMash" id="br1">${state.players[1].name}<br>JUMP</button>`;q('br0').onclick=()=>jump(0);q('br1').onclick=()=>jump(1);function jump(i){if(p[i].alive&&Math.abs(p[i].vy)<.1){p[i].vy=-8.5;beepFx('jump')}}
    function finish(){if(done)return;done=true;clearInterval(timer);cancelAnimationFrame(raf);let w=null;if(p[0].alive&&!p[1].alive)w=0;else if(p[1].alive&&!p[0].alive)w=1;else if(p[0].dist!==p[1].dist)w=p[0].dist>p[1].dist?0:1;mgDone(w,w===null?'Both runners are flattened equally.':`${state.players[w].name} escapes the boulder.`,9)}
    function loop(){if(done)return;frame++;for(let i=0;i<2;i++){if(!p[i].alive)continue;p[i].vy+=.55;p[i].y+=p[i].vy;const ground=i?H*.82:H*.42;if(p[i].y>ground){p[i].y=ground;p[i].vy=0}p[i].dist+=.18;if(frame%55===0)obs[i].push({x:W+30});obs[i].forEach(o=>o.x-=4.8);for(const o of obs[i])if(o.x>80&&o.x<120&&Math.abs(p[i].y-ground)<8){p[i].alive=false;s.react?.(i,'sad');beepFx('lose');buzz(25)}boulder[i]+=2.4;if(boulder[i]>85&&!p[i].alive){}}
      if(!p[0].alive&&!p[1].alive)return finish();ctx.fillStyle='#caa36b';ctx.fillRect(0,0,W,H);ctx.fillStyle='#563e2f';ctx.fillRect(0,H*.44,W,6);ctx.fillRect(0,H*.84,W,6);for(let i=0;i<2;i++){const ground=i?H*.82:H*.42;obs[i]=obs[i].filter(o=>o.x>-30);obs[i].forEach(o=>{ctx.font='28px system-ui';ctx.fillText('🪤',o.x,ground+4)});ctx.font='45px system-ui';ctx.fillText('🪨',clamp(boulder[i],25,75),ground+5);if(p[i].alive){ctx.font='40px system-ui';ctx.fillText('🏃',110,p[i].y);s.sprite(ctx,i,110,p[i].y-38,37)}ctx.fillStyle='#fff';ctx.font='10px system-ui';ctx.fillText(`${state.players[i].name} ${Math.floor(p[i].dist)}m`,W-70,ground-15)}status.textContent=`BOULDER RUN • ${time}s`;raf=requestAnimationFrame(loop)}timer=setInterval(()=>{time--;if(time<=0)finish()},1000);gameCleanup=()=>{done=true;clearInterval(timer);cancelAnimationFrame(raf)};loop()
  };play(s.game);
}
// Taskmaster cones: redesigned as Cone Chaos (distinct colours and shapes, escalating rules, combos).
async function conesort(s){return coneChaos(s);}
async function paperboy(s){
 const {canvasSetup,q,$,state,profile,clamp,mgDone,sp,hp,beepFx,buzz,playSfx,haptic,beep,toast,openMG,coneSVG,esc17,getTime,shuffle17,char,rgba,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math}=originalContext(s);
 let gameCleanup=()=>{};s.cleanup(()=>gameCleanup());
 if(!await s.pass(0,s.game.rules))return;
 const play=function(d){
function finishOriginal(w,label,reward){mgDone(w,label,reward,scores);}
s.debug.originalScore=()=>[...scores];let [c,x,controls,status]=canvasSetup(d),W=c.width,H=c.height,p=0,scores=[0,0],houses=[],time,timer,raf,frame=0;controls.innerHTML='<button id="throwPaper" class="ctrl">THROW PAPER</button>';function round(){houses=[];time=15;frame=0;$('throwPaper').onclick=()=>{let hit=houses.find(h=>h.x>W*.58&&h.x<W*.78&&!h.hit);if(hit){hit.hit=true;scores[p]++;beep(760,.03)}else beep(140,.03)};timer=setInterval(()=>{time--;if(time<=0)finish()},1000);loop()}function loop(){frame++;if(frame%55===0)houses.push({x:W+50,y:80+Math.random()*180,hit:false});houses.forEach(h=>h.x-=4);houses=houses.filter(h=>h.x>-70);x.fillStyle='#6b8f58';x.fillRect(0,0,W,H);x.fillStyle='#707780';x.fillRect(0,H*.62,W,H*.38);for(let h of houses){x.fillStyle=h.hit?'#4f6f49':'#d9c4a2';x.fillRect(h.x,h.y,70,60);x.fillStyle='#5a362c';x.fillRect(h.x+25,h.y+30,20,30)}x.fillStyle='#f0cb57';x.fillRect(W*.2,H*.7,30,36);s.sprite(x,p,W*.2+15,H*.7-18,41);x.strokeStyle='#fff';x.strokeRect(W*.58,0,W*.2,H);status.textContent=`${state.players[p].name} • deliveries ${scores[p]} • ${time}s`;raf=requestAnimationFrame(loop)}function finish(){clearInterval(timer);cancelAnimationFrame(raf);if(p===0){p=1;void s.pass(1,'Your turn to play the original challenge.');setTimeout(round,450)}else{let w=scores[0]===scores[1]?null:(scores[0]>scores[1]?0:1);finishOriginal(w,w===null?'Paper Route tie.':`${state.players[w].name} wins Paper Route.`)}}gameCleanup=()=>{clearInterval(timer);cancelAnimationFrame(raf)};round()};play(s.game);
}
async function brawler(s){
 const {canvasSetup,q,$,state,profile,clamp,mgDone,sp,hp,beepFx,buzz,playSfx,haptic,beep,toast,openMG,coneSVG,esc17,getTime,shuffle17,char,rgba,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math}=originalContext(s);
 let gameCleanup=()=>{};s.cleanup(()=>gameCleanup());
 if(!await s.pass(0,s.game.rules))return;
 const play=function(d){
function finishOriginal(w,label,reward){mgDone(w,label,reward,scores);}
s.debug.originalScore=()=>[...scores];
 let [c,x,controls,status]=canvasSetup(d),W=c.width,H=c.height,p=0,scores=[0,0],hero,enemies,time,timer,raf,left=false,right=false,frame=0;
 controls.innerHTML=`<div class="controls control3"><button id="brL" class="ctrl">◀</button><button id="brA" class="ctrl">ATTACK</button><button id="brR" class="ctrl">▶</button></div>`;
 function round(){hero={x:W/2,hp:5,cool:0};enemies=[];time=20;frame=0;$('brL').onpointerdown=()=>left=true;$('brL').onpointerup=$('brL').onpointercancel=()=>left=false;$('brR').onpointerdown=()=>right=true;$('brR').onpointerup=$('brR').onpointercancel=()=>right=false;$('brA').onclick=()=>{if(hero.cool)return;hero.cool=12;playSfx('gun');for(let i=enemies.length-1;i>=0;i--)if(Math.abs(enemies[i].x-hero.x)<70){enemies.splice(i,1);scores[p]++}};timer=setInterval(()=>{time--;if(time<=0)finish()},1000);loop()}
 function finish(){clearInterval(timer);cancelAnimationFrame(raf);left=right=false;if(p===0){p=1;void s.pass(1,'Your turn to review pancakes.');setTimeout(round,420)}else{let w=scores[0]===scores[1]?null:(scores[0]>scores[1]?0:1);finishOriginal(w,w===null?'Brawl tie.':`${state.players[w].name} wins the brawl ${scores[w]}–${scores[w?0:1]}.`,8)}}
 function loop(){frame++;if(frame%45===0)enemies.push({x:Math.random()<.5?-30:W+30,vx:0});hero.x+=left?-5:right?5:0;hero.x=Math.max(25,Math.min(W-25,hero.x));if(hero.cool)hero.cool--;for(let e of enemies){e.vx+=(hero.x>e.x?.05:-.05);e.vx=Math.max(-2.2,Math.min(2.2,e.vx));e.x+=e.vx;if(Math.abs(e.x-hero.x)<25){hero.hp--;e.x=e.x<hero.x?-30:W+30;playSfx('explosion')}}x.fillStyle='#40353a';x.fillRect(0,0,W,H);x.fillStyle='#66545a';x.fillRect(0,H-85,W,85);x.fillStyle='#f0cb57';x.fillRect(hero.x-18,H-130,36,50);s.sprite(x,p,hero.x,H-150,43,{mood:hero.cool?'angry':undefined});x.fillStyle='#b23e47';for(let e of enemies)x.fillRect(e.x-17,H-125,34,45);status.textContent=`${state.players[p].name} • KO ${scores[p]} • HP ${Math.max(0,hero.hp)} • ${time}s`;if(hero.hp<=0)return finish();raf=requestAnimationFrame(loop)}
 gameCleanup=()=>{clearInterval(timer);cancelAnimationFrame(raf)};round()
};play(s.game);
}
async function battleroyale(s){
 const {canvasSetup,q,$,state,profile,clamp,mgDone,sp,hp,beepFx,buzz,playSfx,haptic,beep,toast,openMG,coneSVG,esc17,getTime,shuffle17,char,rgba,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math}=originalContext(s);
 let gameCleanup=()=>{};s.cleanup(()=>gameCleanup());
 if(!await s.pass(0,s.game.rules))return;
 const play=function(d){
 let [c,x,controls,status]=canvasSetup(d),W=c.width,H=c.height,raf,timer,time=45,frame=0,zone={x:W/2,y:H/2,r:Math.min(W,H)*.46};
 let players=[{x:W*.25,y:H*.5,hp:6,dir:{x:0,y:0},weapon:0,med:0,score:0},{x:W*.75,y:H*.5,hp:6,dir:{x:0,y:0},weapon:0,med:0,score:0}],shots=[],loot=[];
 const inputs=duelInputs(s,{fire:true,fireLabel:'ATTACK'}),previousFire=[false,false];s.debug.edgeInputs=inputs;
 function attack(i){let p=players[i],o=players[i?0:1],dx=o.x-p.x,dy=o.y-p.y,l=Math.hypot(dx,dy)||1;if(p.weapon>0){p.weapon--;shots.push({x:p.x,y:p.y,vx:dx/l*7,vy:dy/l*7,owner:i});playSfx('gun')}else if(l<65){o.hp--;p.score++;playSfx('bug-hit')}}
 for(let i=0;i<2;i++)duelAction(s,i,{text:'USE MEDKIT',id:'br'+i+'use',click:()=>{if(players[i].med){players[i].med--;players[i].hp=Math.min(6,players[i].hp+2);playSfx('coin');}}});
 function spawn(){let type=Math.random()<.42?'weapon':Math.random()<.72?'med':'bag';loot.push({x:60+Math.random()*(W-120),y:60+Math.random()*(H-120),type})}
 for(let i=0;i<8;i++)spawn();
 function finish(){clearInterval(timer);cancelAnimationFrame(raf);let a=players[0].hp*3+players[0].score+players[0].weapon,b=players[1].hp*3+players[1].score+players[1].weapon,w=a===b?null:(a>b?0:1);mgDone(w,w===null?'Battle Royale ends in a deeply uncomfortable draw.':`${state.players[w].name} survives the island ${Math.max(a,b)}–${Math.min(a,b)}.`,12)}
 timer=setInterval(()=>{time--;zone.r=Math.max(85,zone.r-4);if(time<=0||players.some(p=>p.hp<=0))finish()},1000);
 function loop(){for(let i=0;i<2;i++){const k=inputs[i];players[i].dir={x:Number(k.r)-Number(k.l),y:Number(k.d)-Number(k.u)};if(k.fire&&!previousFire[i])attack(i);previousFire[i]=k.fire;}frame++;x.fillStyle='#789a60';x.fillRect(0,0,W,H);x.fillStyle='#5f784f';for(let i=0;i<18;i++)x.fillRect((i*113)%W,(i*67)%H,25,25);x.strokeStyle='#ffdf6a';x.lineWidth=5;x.beginPath();x.arc(zone.x,zone.y,zone.r,0,Math.PI*2);x.stroke();
  players.forEach((p,i)=>{let sp=3.4;p.x=Math.max(18,Math.min(W-18,p.x+p.dir.x*sp));p.y=Math.max(18,Math.min(H-18,p.y+p.dir.y*sp));if(Math.hypot(p.x-zone.x,p.y-zone.y)>zone.r&&frame%30===0)p.hp--;for(let k=loot.length-1;k>=0;k--){let q=loot[k];if(Math.hypot(p.x-q.x,p.y-q.y)<28){loot.splice(k,1);if(q.type==='weapon')p.weapon+=4;else if(q.type==='med')p.med++;else p.score+=2;playSfx('coin');spawn()}}});
  for(let i=shots.length-1;i>=0;i--){let q=shots[i];q.x+=q.vx;q.y+=q.vy;let t=players[q.owner?0:1];if(Math.hypot(q.x-t.x,q.y-t.y)<18){t.hp-=2;s.react?.(q.owner,'happy');s.react?.(1-q.owner,'sad');players[q.owner].score+=2;shots.splice(i,1);playSfx('bug-hit');continue}if(q.x<0||q.x>W||q.y<0||q.y>H)shots.splice(i,1)}
  for(let q of loot){x.font='24px sans-serif';x.textAlign='center';x.fillText(q.type==='weapon'?'🔫':q.type==='med'?'❤️':'🎒',q.x,q.y)}
  x.fillStyle='#fff17a';shots.forEach(q=>{x.beginPath();x.arc(q.x,q.y,4,0,Math.PI*2);x.fill()});
  players.forEach((p,i)=>{x.fillStyle=i?'#e779b9':'#e4c85a';x.beginPath();x.arc(p.x,p.y,18,0,Math.PI*2);x.fill();x.fillStyle='#111';x.font='18px sans-serif';s.sprite(x,i,p.x,p.y,38,{mood:p.hp<3?'sad':undefined})});
  status.textContent=`${state.players[0].name} HP ${players[0].hp} 🔫${players[0].weapon} ❤️${players[0].med}  •  ${time}s  •  ${state.players[1].name} HP ${players[1].hp} 🔫${players[1].weapon} ❤️${players[1].med}`;raf=requestAnimationFrame(loop)}
 gameCleanup=()=>{clearInterval(timer);cancelAnimationFrame(raf)};loop()
};play(s.game);
}
async function skynetid(s){
 const {canvasSetup,q,$,state,profile,clamp,mgDone,sp,hp,beepFx,buzz,playSfx,haptic,beep,toast,openMG,coneSVG,esc17,getTime,shuffle17,char,rgba,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math}=originalContext(s);
 let gameCleanup=()=>{};s.cleanup(()=>gameCleanup());
 if(!await s.pass(0,s.game.rules))return;
 const play=function(d){
function finishOriginal(w,label,reward){mgDone(w,label,reward,score);}
s.debug.originalScore=()=>[...score];
    const z=canvasSetup(d),c=z[0],ctx=z[1],controls=z[2],status=z[3],W=z[4],H=z[5];let player=0,round=0,score=[0,0],done=false,kind='human',deadline=0,raf=0;
    controls.innerHTML='<div class="scanChoice"><button class="ctrl" id="scanHuman">HUMAN</button><button class="ctrl" id="scanMachine">MACHINE</button></div><div class="mgHintSmall">Classify 12 scans each. Hesitation counts as a miss.</div>';
    q('scanHuman').onclick=()=>pick('human');q('scanMachine').onclick=()=>pick('machine');
    function newScan(){kind=Math.random()<.52?'human':'machine';deadline=performance.now()+1150}
    function pick(k){if(done)return;if(k===kind){score[player]++;try{playSfx('coin')}catch(e){}}else score[player]=Math.max(0,score[player]-1);round++;if(round>=12){if(player===0){player=1;round=0;toast(`<b>${state.players[0].name}: ${score[0]}</b><br>Pass the phone.`);newScan()}else return finish()}else newScan()}
    function finish(){done=true;cancelAnimationFrame(raf);const w=score[0]===score[1]?null:(score[0]>score[1]?0:1);finishOriginal(w,w===null?`Skynet Identification ties ${score[0]}–${score[1]}.`:`${state.players[w].name} wins Skynet Identification ${score[w]}–${score[w?0:1]}.`,9)}
    function loop(t){if(done)return;if(t>deadline){round++;if(round>=12){if(player===0){player=1;round=0;toast(`<b>${state.players[0].name}: ${score[0]}</b><br>Pass the phone.`)}else return finish()}newScan()}ctx.fillStyle='#050b0d';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#287a48';ctx.lineWidth=1;for(let x=0;x<W;x+=28){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}ctx.fillStyle='#70ff98';ctx.font='900 14px monospace';ctx.fillText('CYBERDYNE VISUAL CLASSIFICATION',18,28);ctx.font='100px system-ui';ctx.textAlign='center';ctx.fillText(kind==='human'?'🧍':'🤖',W/2,H*.54);ctx.fillStyle='#70ff98';ctx.font='700 12px monospace';ctx.fillText(kind==='human'?'BIOLOGICAL SIGNATURE?':'METAL ENDOSKELETON?',W/2,H*.72);const rem=Math.max(0,(deadline-t)/1150);ctx.fillStyle='#173c25';ctx.fillRect(W*.15,H*.82,W*.70,9);ctx.fillStyle='#70ff98';ctx.fillRect(W*.15,H*.82,W*.70*rem,9);status.textContent=`${state.players[player].name} • scan ${round+1}/12 • ${score[player]} pts`;raf=requestAnimationFrame(loop)}
    newScan();gameCleanup=()=>{done=true;cancelAnimationFrame(raf)};raf=requestAnimationFrame(loop)
  };play(s.game);
}
async function pancakes(s){
 const {canvasSetup,q,$,state,profile,clamp,mgDone,sp,hp,beepFx,buzz,playSfx,haptic,beep,toast,openMG,coneSVG,esc17,getTime,shuffle17,char,rgba,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math}=originalContext(s);
 let gameCleanup=()=>{};s.cleanup(()=>gameCleanup());
 if(!await s.pass(0,s.game.rules))return;
 const play=function(d){
function finishOriginal(w,label,reward){mgDone(w,label,reward,scores);}
s.debug.originalScore=()=>[...scores];
 let p=0,scores=[0,0],full=15,time=18,timer,eatT=null;
 openMG(d,`<div id="pcWho" class="mgScore"></div><div style="font-size:90px;text-align:center">🥞</div><div class="meter"><div class="goodZone" style="left:0;width:72%"></div><div id="fullNeedle" class="needle"></div></div><button id="eatPancake" class="bigTap">HOLD TO EAT</button><div id="pcOut" class="mgScore"></div>`);
 function paint(){$('pcWho').textContent=`${state.players[p].name} • ${time}s`;$('fullNeedle').style.left=Math.min(98,full)+'%';$('pcOut').textContent=`PANCAKES ${Math.floor(scores[p])} • MISERY ${Math.round(full)}%`}
 function round(){full=15;time=18;paint();let b=$('eatPancake');b.onpointerdown=()=>{clearInterval(eatT);eatT=setInterval(()=>{full+=3;if(full<82){scores[p]+=.35;playSfx('coin')}else scores[p]=Math.max(0,scores[p]-.4);paint()},110)};b.onpointerup=b.onpointercancel=()=>clearInterval(eatT);timer=setInterval(()=>{time--;full=Math.max(0,full-6);paint();if(time<=0){clearInterval(timer);clearInterval(eatT);scores[p]=Math.round(scores[p]);if(p===0){p=1;void s.pass(1,'Your turn to review pancakes.');setTimeout(round,420)}else{let w=scores[0]===scores[1]?null:(scores[0]>scores[1]?0:1);finishOriginal(w,w===null?'Pancake tie.':`${state.players[w].name} survives more pancakes ${scores[w]}–${scores[w?0:1]}.`,8)}}},1000)}
 gameCleanup=()=>{clearInterval(timer);clearInterval(eatT)};round()
};play(s.game);
}
async function duckturn(s){
 const {canvasSetup,q,$,state,profile,clamp,mgDone,sp,hp,beepFx,buzz,playSfx,haptic,beep,toast,openMG,coneSVG,esc17,getTime,shuffle17,char,rgba,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math}=originalContext(s);
 let gameCleanup=()=>{};s.cleanup(()=>gameCleanup());
 if(!await s.pass(0,s.game.rules))return;
 const play=function(d){
function finishOriginal(w,label,reward){mgDone(w,label,reward,scores);}
s.debug.originalScore=()=>[...scores];
    const z=canvasSetup(d),canvas=z[0],ctx=z[1],controls=z[2],status=z[3],W=z[4],H=z[5];
    const rounds=2,turnTime=8;
    let player=0,scores=[0,0],time=turnTime,ducks=[],raf=0,done=false,last=0,spawnT=0,inPass=false,started=true;
    controls.innerHTML='<div class="duckHud"><span class="duckBadge">FAST DUCKS</span><span class="duckBadge">PASS &amp; PLAY</span><span class="duckBadge">ONE TURN EACH</span></div><button class="ctrl duckPassBtn" id="duckReady" style="grid-column:1/-1">START TURN</button><div class="mgHintSmall">Tap the ducks. They are quick and annoying on purpose.</div>';
    const btn=q('duckReady');
    btn.onclick=()=>{ if(inPass) return; started=true; btn.style.display='none'; };
    function makeDuck(){
      const left=Math.random()<.5;
      const y=40+Math.random()*(H-120);
      const speed=(2.2+Math.random()*2.8)*(Math.random()<.45?1.35:1);
      return {x:left?-50:W+50,y, vx:left?speed:-speed, vy:(Math.random()-.5)*1.6, s:20+Math.random()*10, hit:false, flap:Math.random()*6};
    }
    for(let i=0;i<7;i++) ducks.push(makeDuck());
    function hitAt(x,y){
      if(inPass||done) return;
      let best=-1,bd=9999;
      for(let i=0;i<ducks.length;i++){const d=ducks[i]; const dx=x-d.x, dy=y-d.y; const dist=Math.hypot(dx,dy);
        if(dist < d.s*1.25 && dist<bd){best=i;bd=dist;} }
      if(best>=0){
        const d=ducks[best]; d.hit=true; scores[player]++; 
        try{playSfx('coin'); haptic(8)}catch(e){}
        ducks[best]=makeDuck();
      } else {
        try{playSfx('lose')}catch(e){}
      }
    }
    canvas.onclick=(e)=>{ const r=canvas.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width*W, y=(e.clientY-r.top)/r.height*H; hitAt(x,y); };
    canvas.ontouchstart=(e)=>{ const t=e.touches[0]; if(!t) return; const r=canvas.getBoundingClientRect(); const x=(t.clientX-r.left)/r.width*W, y=(t.clientY-r.top)/r.height*H; hitAt(x,y); };
    function nextTurn(){
      if(player===0){
        inPass=true; started=false; btn.style.display='block'; btn.textContent='PASS TO '+(state.players[1].name||'PLAYER 2').toUpperCase()+' — TAP TO START';
        btn.onclick=()=>{ inPass=false; player=1; time=turnTime; btn.style.display='none'; };
      } else {
        done=true; cancelAnimationFrame(raf);
        const w=scores[0]===scores[1]?null:(scores[0]>scores[1]?0:1);
        setTimeout(()=>finishOriginal(w, w===null?`Duck Hunt ties ${scores[0]}–${scores[1]}.`:`${state.players[w].name} wins Duck Hunt ${scores[w]}–${scores[w?0:1]}.`,8),350);
      }
    }
    function loop(t){
      if(done) return;
      const dt=Math.min(2, (t-last)/16 || 1); last=t;
      if(!inPass){
        time-=dt/60;
        spawnT+=dt;
        for(const d of ducks){
          d.flap += .3*dt;
          d.x += d.vx*dt;
          d.y += d.vy*dt + Math.sin(d.flap)*.35;
          if(d.y<28||d.y>H-28) d.vy*=-1;
          if(d.x < -70 || d.x > W+70) Object.assign(d, makeDuck());
        }
        if(time<=0) nextTurn();
      }
      // draw
      const sky=ctx.createLinearGradient(0,0,0,H); sky.addColorStop(0,'#83bff8'); sky.addColorStop(1,'#bfe5ff');
      ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#7bc96f'; ctx.fillRect(0,H-58,W,58);
      for(let i=0;i<8;i++){ ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect((i*97+t*.03)%W, 18+(i%4)*42, 20, 20); }
      for(const d of ducks){
        ctx.save(); ctx.translate(d.x,d.y);
        ctx.scale(d.vx>0?1:-1,1);
        // duck sprite-ish
        ctx.font = `${d.s*1.35}px system-ui`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('🦆',0,0);
        ctx.restore();
      }
      // reticle
      ctx.strokeStyle='rgba(255,255,255,.0)'; ctx.lineWidth=2;
      status.textContent = inPass
        ? `Pass the phone to ${state.players[1].name}`
        : `${state.players[player].name} • Duck Hunt • ${scores[player]} hits • ${Math.max(0,time).toFixed(1)}s`;
    raf=requestAnimationFrame(loop);
    }
    gameCleanup=()=>{ done=true; cancelAnimationFrame(raf); };
    raf=requestAnimationFrame(loop);
  };play(s.game);
}
async function sewer(s){
 const {canvasSetup,q,$,state,clamp,mgDone,sfx,vib,playSfx,sprite,drawPlayer,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math}=originalContext(s);let gameCleanup=()=>{};s.cleanup(()=>gameCleanup());if(!await s.pass(0,s.game.rules))return;const play=function(d){
    const setup=canvasSetup(d), c=setup[0], ctx=setup[1], controls=setup[2], status=setup[3], W=setup[4], H=setup[5];
    let raf=0,timer=0,seconds=35,done=false;
    const players=[
      {x:W*.20,y:H-34,vx:0,vy:0,score:0,onGround:true},
      {x:W*.80,y:H-34,vx:0,vy:0,score:0,onGround:true}
    ];
    const keys=[{l:false,r:false},{l:false,r:false}];
    const platforms=[
      {x:0,y:H-22,w:W,h:22},
      {x:W*.06,y:H*.68,w:W*.31,h:14},
      {x:W*.62,y:H*.68,w:W*.31,h:14},
      {x:W*.31,y:H*.43,w:W*.38,h:14},
      {x:W*.10,y:H*.22,w:W*.25,h:12},
      {x:W*.65,y:H*.22,w:W*.25,h:12}
    ];
    let coins=[];

    function coinSpot(){
      const pl=platforms[1+Math.floor(Math.random()*(platforms.length-1))];
      return {x:pl.x+24+Math.random()*Math.max(30,pl.w-48),y:pl.y-16,bob:Math.random()*6.28}
    }
    function refillCoins(){while(coins.length<6)coins.push(coinSpot())}
    refillCoins();

    const inputs=duelInputs(s,{horizontal:true,fire:true,fireLabel:'JUMP'}),previousFire=[false,false];s.debug.edgeInputs=inputs;
    s.frame(()=>{for(let i=0;i<2;i++){keys[i].l=inputs[i].l;keys[i].r=inputs[i].r;if(inputs[i].fire&&!previousFire[i])jump(i);previousFire[i]=inputs[i].fire;}});
    function jump(i){
      const p=players[i];
      if(p.onGround){p.vy=-9.4;p.onGround=false;sfx('jump');vib(8)}
    }
    function finish(winner){
      if(done)return;done=true;clearInterval(timer);cancelAnimationFrame(raf);
      const label=winner===null
        ?`Sewer Clash ends ${players[0].score}–${players[1].score}.`
        :`${state.players[winner].name} wins Sewer Clash ${players[winner].score}–${players[winner?0:1].score}.`;
      setTimeout(()=>mgDone(winner,label,8),80)
    }
    function updatePlayer(p,i){
      p.vx=(keys[i].r?3.9:0)-(keys[i].l?3.9:0);
      const prevY=p.y;
      p.vy+=.48;
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<16){p.x=W-16}else if(p.x>W-16){p.x=16}
      p.onGround=false;
      for(const pl of platforms){
        const top=pl.y;
        if(p.vy>=0 && prevY<=top && p.y>=top && p.x>pl.x-12 && p.x<pl.x+pl.w+12){
          p.y=top;p.vy=0;p.onGround=true;break
        }
      }
      if(p.y>H+40){p.x=i?W*.8:W*.2;p.y=H-34;p.vy=0;p.onGround=true}
      for(let k=coins.length-1;k>=0;k--){
        const c=coins[k];
        if(Math.hypot(p.x-c.x,(p.y-22)-c.y)<25){
          coins.splice(k,1);p.score++;sfx('coin');vib(10);refillCoins();
          if(p.score>=3){finish(i);return}
        }
      }
    }
    function drawPipe(x,y,w,h){
      const g=ctx.createLinearGradient(x,y,x+w,y);
      g.addColorStop(0,'#264a52');g.addColorStop(.45,'#4b7780');g.addColorStop(1,'#1d3940');
      ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
      ctx.fillStyle='#9bc1c777';ctx.fillRect(x,y,w,3)
    }
    function draw(){
      ctx.clearRect(0,0,W,H);
      const bg=ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,'#09151d');bg.addColorStop(.55,'#0c2630');bg.addColorStop(1,'#071015');
      ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
      // brick / sewer wall texture
      ctx.strokeStyle='#17323d';ctx.lineWidth=1;
      for(let yy=18;yy<H;yy+=26){
        for(let xx=(yy/26)%2?0:-24;xx<W;xx+=48)ctx.strokeRect(xx,yy,46,24)
      }
      // drips
      ctx.fillStyle='#5f8d7440';
      for(let i=0;i<14;i++){const dx=(i*79)%W;ctx.fillRect(dx,0,2,16+((i*17)%38))}
      platforms.forEach((pl,idx)=>{
        if(idx===0){ctx.fillStyle='#142c33';ctx.fillRect(pl.x,pl.y,pl.w,pl.h)}
        else drawPipe(pl.x,pl.y,pl.w,pl.h)
      });
      // water/sludge at bottom
      ctx.fillStyle='#315b4d';ctx.fillRect(0,H-12,W,12);
      ctx.fillStyle='#77aa7940';
      for(let i=0;i<12;i++){ctx.beginPath();ctx.arc((i*97+Date.now()/35)%W,H-9,5,0,Math.PI*2);ctx.fill()}
      // coins
      const coinSprite=sprite('sprite:coin');
      coins.forEach(c=>{
        const yy=c.y+Math.sin(Date.now()/180+c.bob)*3;
        if(coinSprite)ctx.drawImage(coinSprite,c.x-11,yy-11,22,22);
        else{
          const g=ctx.createRadialGradient(c.x-3,yy-4,2,c.x,yy,11);
          g.addColorStop(0,'#fff3a6');g.addColorStop(.35,'#eebc45');g.addColorStop(1,'#a87322');
          ctx.fillStyle=g;ctx.beginPath();ctx.arc(c.x,yy,11,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle='#ffd76c';ctx.lineWidth=2;ctx.stroke()
        }
      });
      // players
      players.forEach((p,i)=>{
        drawPlayer(ctx,i,p.x,p.y,44,(Math.abs(p.vx)>0?'walk':'idle'));
        ctx.fillStyle=i?'#e779b9':'#e4c85a';
        ctx.fillRect(p.x-20,p.y+4,40,4)
      });
      // top score strip
      ctx.fillStyle='#0008';ctx.fillRect(0,0,W,34);
      ctx.fillStyle='#fff';ctx.font='700 13px system-ui';ctx.textBaseline='middle';
      ctx.textAlign='left';ctx.fillText(`${state.players[0].name}: ${players[0].score}`,12,17);
      ctx.textAlign='center';ctx.fillText(`FIRST TO 3 • ${seconds}s`,W/2,17);
      ctx.textAlign='right';ctx.fillText(`${state.players[1].name}: ${players[1].score}`,W-12,17);
    }
    function loop(){
      if(done)return;
      updatePlayer(players[0],0);updatePlayer(players[1],1);
      draw();
      status.innerHTML=`<div class="sewerHud"><span class="left">${state.players[0].name}: ${players[0].score}</span><span class="center">grab 3 coins</span><span class="right">${state.players[1].name}: ${players[1].score}</span></div>`;
      raf=requestAnimationFrame(loop)
    }
    timer=setInterval(()=>{
      seconds--;
      if(seconds<=0){
        let winner=players[0].score===players[1].score?null:(players[0].score>players[1].score?0:1);
        finish(winner)
      }
    },1000);
    gameCleanup=()=>{done=true;clearInterval(timer);cancelAnimationFrame(raf)};
    loop()
  };play(s.game);
}
async function bondmission(s){
 const {canvasSetup,q,$,state,clamp,mgDone,sfx,vib,playSfx,sprite,drawPlayer,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math}=originalContext(s);let gameCleanup=()=>{};s.cleanup(()=>gameCleanup());if(!await s.pass(0,s.game.rules))return;const play=function(d){
function finishOriginal(w,label,reward){mgDone(w,label,reward,scores);}
s.debug.originalScore=()=>[...scores];
 let [c,x,controls,status]=canvasSetup(d),W=c.width,H=c.height,p=0,scores=[0,0],pos,guards,intel,time,timer,raf,move={x:0,y:0};
 controls.innerHTML=`<div class="dpad"><span></span><button class="ctrl" id="bmU">▲</button><span></span><button class="ctrl" id="bmL">◀</button><button class="ctrl" id="bmF">FIRE</button><button class="ctrl" id="bmR">▶</button><span></span><button class="ctrl" id="bmD">▼</button><span></span></div>`;
 function bindMove(id,xv,yv){let b=$(id);b.onpointerdown=()=>move={x:xv,y:yv};b.onpointerup=b.onpointercancel=()=>move={x:0,y:0}}
 function round(){pos={x:45,y:H-45};guards=Array.from({length:7},()=>({x:120+Math.random()*(W-160),y:80+Math.random()*(H-130),vx:(Math.random()-.5)*1.6,vy:(Math.random()-.5)*1.6}));intel=Array.from({length:5},()=>({x:70+Math.random()*(W-140),y:55+Math.random()*(H-110),got:false}));time=22;bindMove('bmU',0,-1);bindMove('bmD',0,1);bindMove('bmL',-1,0);bindMove('bmR',1,0);$('bmF').onclick=()=>{playSfx('gun');let i=guards.findIndex(g=>Math.hypot(g.x-pos.x,g.y-pos.y)<85);if(i>=0){guards.splice(i,1);scores[p]+=2}};timer=setInterval(()=>{time--;if(time<=0)finish()},1000);loop()}
 function finish(){clearInterval(timer);cancelAnimationFrame(raf);if(p===0){p=1;void s.pass(1,'Your turn to escape the facility.');setTimeout(round,420)}else{let w=scores[0]===scores[1]?null:(scores[0]>scores[1]?0:1);finishOriginal(w,w===null?'Facility Escape tie.':`${state.players[w].name} wins the mission ${scores[w]}–${scores[w?0:1]}.`,8)}}
 function loop(){pos.x=Math.max(18,Math.min(W-18,pos.x+move.x*4));pos.y=Math.max(18,Math.min(H-18,pos.y+move.y*4));x.fillStyle='#b8c3b0';x.fillRect(0,0,W,H);x.fillStyle='#667568';for(let k=0;k<5;k++)x.fillRect(90+k*120,80+(k%2)*120,50,100);for(let q of intel)if(!q.got){x.fillStyle='#f0cb57';x.fillRect(q.x-8,q.y-8,16,16);if(Math.hypot(q.x-pos.x,q.y-pos.y)<22){q.got=true;scores[p]+=3;playSfx('coin')}}for(let g of guards){g.x+=g.vx;g.y+=g.vy;if(g.x<20||g.x>W-20)g.vx*=-1;if(g.y<20||g.y>H-20)g.vy*=-1;x.fillStyle='#9d2e35';x.fillRect(g.x-10,g.y-10,20,20);if(Math.hypot(g.x-pos.x,g.y-pos.y)<22){scores[p]=Math.max(0,scores[p]-1);s.react?.(p,'sad');pos={x:45,y:H-45};playSfx('explosion')}}x.fillStyle='#244f99';x.beginPath();x.arc(pos.x,pos.y,13,0,Math.PI*2);x.fill();s.sprite(x,p,pos.x,pos.y,38);status.textContent=`${state.players[p].name} • INTEL SCORE ${scores[p]} • ${time}s`;raf=requestAnimationFrame(loop)}
 gameCleanup=()=>{clearInterval(timer);cancelAnimationFrame(raf)};round()
};play(s.game);
}
async function airhockey(s){const {canvasSetup,q,$,state,clamp,mgDone,sp,hp,beepFx,buzz,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math}=originalContext(s);let gameCleanup=()=>{};s.cleanup(()=>gameCleanup());if(!await s.pass(0,s.game.rules))return;const play=function(d){
function finishOriginal(w,label,reward){mgDone(w,label,reward,scores);}
s.debug.originalScore=()=>[...scores];
    const z=canvasSetup(d),c=z[0],ctx=z[1],controls=z[2],status=z[3],W=z[4],H=z[5];
    let done=false,raf=0,time=45,timer=0,scores=[0,0],touchOwners=new Map();
    const r=22,pr=30;
    const pads=[{x:W*.25,y:H*.5,vx:0,vy:0},{x:W*.75,y:H*.5,vx:0,vy:0}],puck={x:W/2,y:H/2,vx:4.8,vy:2.6};
    controls.innerHTML='<div class="twoTouchHint">DRAG ON YOUR HALF OF THE RINK. Both players can move at the same time.</div><button class="ctrl" id="ahReset">CENTER PUCK</button><button class="ctrl" disabled>FIRST TO 5</button><button class="ctrl" disabled>MULTI-TOUCH</button><button class="ctrl" disabled>45 SEC</button>';
    q('ahReset').onclick=()=>resetPuck(Math.random()<.5?-1:1);
    function resetPuck(dir){puck.x=W/2;puck.y=H/2;puck.vx=dir*(4.2+Math.random()*1.5);puck.vy=(Math.random()-.5)*4}
    function eventPos(e){const rr=c.getBoundingClientRect();return{x:(e.clientX-rr.left)/rr.width*W,y:(e.clientY-rr.top)/rr.height*H}}
    c.onpointerdown=e=>{const p=eventPos(e),i=p.x<W/2?0:1;touchOwners.set(e.pointerId,i);try{c.setPointerCapture(e.pointerId)}catch(_){};movePad(i,p)};
    c.onpointermove=e=>{if(!touchOwners.has(e.pointerId))return;movePad(touchOwners.get(e.pointerId),eventPos(e))};
    c.onpointerup=c.onpointercancel=e=>touchOwners.delete(e.pointerId);
    function movePad(i,p){const pad=pads[i],oldx=pad.x,oldy=pad.y;pad.x=Math.max(pr,Math.min(i===0?W/2-pr:W-pr,p.x));pad.x=i===0?Math.min(W/2-pr,pad.x):Math.max(W/2+pr,pad.x);pad.y=Math.max(pr,Math.min(H-pr,p.y));pad.vx=pad.x-oldx;pad.vy=pad.y-oldy}
    function collidePad(pad){
      const dx=puck.x-pad.x,dy=puck.y-pad.y,dist=Math.hypot(dx,dy),min=r+pr;
      if(dist<min){const nx=dx/(dist||1),ny=dy/(dist||1),rel=puck.vx*nx+puck.vy*ny;if(rel<6){puck.x=pad.x+nx*min;puck.y=pad.y+ny*min;const boost=6+Math.min(5,Math.hypot(pad.vx,pad.vy));puck.vx=nx*boost+pad.vx*.25;puck.vy=ny*boost+pad.vy*.25;sp('putt');hp(6)}}
    }
    function finish(){if(done)return;done=true;clearInterval(timer);cancelAnimationFrame(raf);const w=scores[0]===scores[1]?null:(scores[0]>scores[1]?0:1);finishOriginal(w,w===null?`Air Hockey ties ${scores[0]}–${scores[1]}.`:`${state.players[w].name} wins Air Hockey ${scores[w]}–${scores[w?0:1]}.`,10)}
    function loop(){
      if(done)return;
      puck.x+=puck.vx;puck.y+=puck.vy;puck.vx*=.997;puck.vy*=.997;
      if(puck.y<r||puck.y>H-r){puck.vy*=-1;puck.y=Math.max(r,Math.min(H-r,puck.y))}
      const goalTop=H*.36,goalBot=H*.64;
      if(puck.x<r){
        if(puck.y>goalTop&&puck.y<goalBot){scores[1]++;sp('win');hp(18);if(scores[1]>=5)return finish();resetPuck(1)}
        else{puck.vx=Math.abs(puck.vx);puck.x=r}
      }
      if(puck.x>W-r){
        if(puck.y>goalTop&&puck.y<goalBot){scores[0]++;sp('win');hp(18);if(scores[0]>=5)return finish();resetPuck(-1)}
        else{puck.vx=-Math.abs(puck.vx);puck.x=W-r}
      }
      collidePad(pads[0]);collidePad(pads[1]);
      // rink
      ctx.fillStyle='#e8f4f8';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#7ca7ba';ctx.lineWidth=4;ctx.strokeRect(5,5,W-10,H-10);
      ctx.strokeStyle='#d9525f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.beginPath();ctx.arc(W/2,H/2,55,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='#1f3848';ctx.fillRect(0,goalTop,8,goalBot-goalTop);ctx.fillRect(W-8,goalTop,8,goalBot-goalTop);
      pads.forEach((p,i)=>{const g=ctx.createRadialGradient(p.x-5,p.y-5,3,p.x,p.y,pr);g.addColorStop(0,i?'#ffb8dc':'#ffe994');g.addColorStop(1,i?'#bc4f8b':'#c38b22');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,pr,0,Math.PI*2);ctx.fill()});
      ctx.fillStyle='#18222d';ctx.beginPath();ctx.arc(puck.x,puck.y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.stroke();
      ctx.fillStyle='#253c4f';ctx.font='800 16px system-ui';ctx.textAlign='left';ctx.fillText(`${state.players[0].name} ${scores[0]}`,14,24);ctx.textAlign='right';ctx.fillText(`${scores[1]} ${state.players[1].name}`,W-14,24);
      status.textContent=`${state.players[0].name} ${scores[0]} • ${time}s • ${scores[1]} ${state.players[1].name}`;
      raf=requestAnimationFrame(loop)
    }
    timer=setInterval(()=>{time--;if(time<=0)finish()},1000);gameCleanup=()=>{done=true;clearInterval(timer);cancelAnimationFrame(raf)};loop()
  };play(s.game);}
async function flappy(s){const {canvasSetup,q,$,state,clamp,mgDone,sp,hp,beepFx,buzz,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math}=originalContext(s);let gameCleanup=()=>{};s.cleanup(()=>gameCleanup());if(!await s.pass(0,s.game.rules))return;const play=function(d){
function finishOriginal(w,label,reward){mgDone(w,label,reward,scores);}
s.debug.originalScore=()=>[...scores];let [c,x,controls,status]=canvasSetup(d),W=c.width,H=c.height,p=0,scores=[0,0],bird,pipes,raf,startT;controls.innerHTML='<button id="flap" class="ctrl">TAP / FLAP</button>';function round(){bird={x:150,y:H/2,vy:0};pipes=[];startT=performance.now();$('flap').onclick=()=>bird.vy=-8;c.onclick=()=>bird.vy=-8;loop()}function loop(){x.fillStyle='#112536';x.fillRect(0,0,W,H);bird.vy+=.45;bird.y+=bird.vy;if(!pipes.length||pipes.at(-1).x<W-240)pipes.push({x:W+40,gap:130+Math.random()*(H-260),passed:false});for(let q of pipes)q.x-=4;pipes=pipes.filter(q=>q.x>-60);x.fillStyle='#4eac5d';for(let q of pipes){x.fillRect(q.x,0,55,q.gap-72);x.fillRect(q.x,q.gap+72,55,H-q.gap-72);if(!q.passed&&q.x<bird.x){q.passed=true;scores[p]++}}x.fillStyle='#f4d65e';x.beginPath();x.arc(bird.x,bird.y,15,0,Math.PI*2);x.fill();let crash=bird.y<0||bird.y>H||pipes.some(q=>bird.x+14>q.x&&bird.x-14<q.x+55&&(bird.y-14<q.gap-72||bird.y+14>q.gap+72));if(crash||(performance.now()-startT)>18000){cancelAnimationFrame(raf);if(p===0){p=1;void s.pass(1,'Your turn to fly.');setTimeout(round,500);return;}else{let w=scores[0]===scores[1]?null:(scores[0]>scores[1]?0:1);return finishOriginal(w,w===null?'Flappy tie.':`${state.players[w].name} wins Flappy ${Math.max(...scores)}–${Math.min(...scores)}.`)}}status.textContent=`${state.players[p].name} • ${scores[p]} pipes`;raf=requestAnimationFrame(loop)}gameCleanup=()=>cancelAnimationFrame(raf);round()};play(s.game);}
async function tictactoe(s){const {canvasSetup,q,$,state,clamp,mgDone,sp,hp,beepFx,buzz,requestAnimationFrame,cancelAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,performance,Math}=originalContext(s);let gameCleanup=()=>{};s.cleanup(()=>gameCleanup());if(!await s.pass(0,s.game.rules))return;const play=function(d){
function finishOriginal(w,label,reward){mgDone(w,label,reward,wins);}
s.debug.originalScore=()=>[...wins];
    const z=canvasSetup(d),c=z[0],ctx=z[1],controls=z[2],status=z[3],W=z[4],H=z[5];
    let board=Array(9).fill(-1),p=0,wins=[0,0],round=1,done=false,transitioning=false;
    controls.innerHTML='<button class="ctrl" disabled>BEST OF 3</button><button class="ctrl" disabled>MATRIX</button><button class="ctrl" id="ttReset">RESET ROUND</button><button class="ctrl" disabled>3 IN A ROW</button>';
    q('ttReset').disabled=true;q('ttReset').onclick=()=>{board=Array(9).fill(-1);draw()};
    c.onclick=e=>{if(done||transitioning)return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W,y=(e.clientY-r.top)/r.height*H;
      const size=Math.min(W,H)*.78,ox=(W-size)/2,oy=(H-size)/2,col=Math.floor((x-ox)/(size/3)),row=Math.floor((y-oy)/(size/3));
      if(col<0||col>2||row<0||row>2)return;const i=row*3+col;if(board[i]!==-1)return;board[i]=p;beepFx('coin');buzz(8);draw();
      const line=winLine(p);if(line){transitioning=true;wins[p]++;if(wins[p]>=2){done=true;setTimeout(()=>finishOriginal(p,`${state.players[p].name} wins Matrix Tic-Tac-Toe ${wins[p]}–${wins[p?0:1]}.`,7),500);return}
        round++;if(round>9){done=true;finishOriginal(wins[0]===wins[1]?null:wins[0]>wins[1]?0:1,'The Construct closes after nine rounds.');return;}const winner=p;setTimeout(()=>{transitioning=false;board=Array(9).fill(-1);p=winner?0:1;draw()},650);return}
      if(board.every(v=>v!==-1)){transitioning=true;round++;if(round>9){done=true;finishOriginal(wins[0]===wins[1]?null:wins[0]>wins[1]?0:1,'The Construct closes after nine rounds.');return;}setTimeout(()=>{transitioning=false;board=Array(9).fill(-1);p=p?0:1;draw()},650);return}
      p=p?0:1;draw()
    };
    function winLine(w){return [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].find(a=>a.every(i=>board[i]===w))}
    function draw(){ctx.fillStyle='#06131e';ctx.fillRect(0,0,W,H);ctx.fillStyle='#79de88';ctx.font='700 13px monospace';ctx.textAlign='left';ctx.fillText('THE MATRIX // CONSTRUCT GRID',14,24);
      const size=Math.min(W,H)*.78,ox=(W-size)/2,oy=(H-size)/2;ctx.strokeStyle='#79de88';ctx.lineWidth=5;for(let i=1;i<3;i++){ctx.beginPath();ctx.moveTo(ox+i*size/3,oy);ctx.lineTo(ox+i*size/3,oy+size);ctx.stroke();ctx.beginPath();ctx.moveTo(ox,oy+i*size/3);ctx.lineTo(ox+size,oy+i*size/3);ctx.stroke()}
      for(let i=0;i<9;i++){if(board[i]<0)continue;const x=ox+(i%3+.5)*size/3,y=oy+(Math.floor(i/3)+.5)*size/3;ctx.font=`${size/4}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';s.sprite(ctx,board[i],x,y,50);ctx.font='18px system-ui';ctx.fillText(board[i]?'O':'X',x+size/10,y+size/10)}
      status.textContent=`ROUND ${round} • ${state.players[0].name} ${wins[0]} — ${wins[1]} ${state.players[1].name} • ${state.players[p].name}'s move`}
    gameCleanup=()=>{done=true};draw()
  };play(s.game);}

Object.assign(exports,{lightcycle,minichess,fruitmerge,slingshot,penalty,sumo,dualrace,snakeduel,moneygrab,sword2p,basketball2p,ballrun2p,conesort,paperboy,brawler,battleroyale,skynetid,pancakes,duckturn,sewer,bondmission,airhockey,flappy,tictactoe});