const {clamp}=require("src/utils.js");
const {sound,vibrate}=require("src/audio.js");
const {arenaGestures,gestureHint}=require("src/engines/arenaGestures.js");
async function moneygrab(s){
 const[,x]=s.canvas(900,540,{fill:true}),players=[{x:.25,score:0},{x:.75,score:0}],things=[];
 s.shared=true;s.updateScores();const controls=arenaGestures(s,{horizontal:true});let left=30,spawn=.2,elapsed=0,tieOwner=0;
 s.hint('Each human starts a finger on their own half, then drags left/right from that first touch. Keep holding to move; return to the starting point or lift to stop. Catch $2 bills. Seals cost $5. Both baskets can move across the whole waterfront. P1 A/D; P2 arrows.');
 s.debug={engine:'moneygrab',players,things,controls,get left(){return left;}};
 if(!await s.pass(0,'There is always money in the banana stand. Catch the falling bills, dodge the seals. Both players drag at the same time.','Both ready — catch the money!'))return;
 s.frame(dt=>{
  left-=dt;elapsed+=dt;spawn-=dt;while(spawn<=0){spawn+=.3;things.push({x:.045+s.random()*.91,y:-.05,speed:.32+s.random()*.24,bad:s.random()<.18});}
  for(let i=0;i<2;i++)players[i].x=clamp(players[i].x+controls.input[i].x*.48*dt,.035,.965);
  for(let k=things.length-1;k>=0;k--){const t=things[k];t.y+=t.speed*dt;let caught=false;for(const i of (tieOwner++%2?[1,0]:[0,1]))if(t.y>=.84&&t.y<=.94&&Math.abs(t.x-players[i].x)<.045){players[i].score+=t.bad?-5:2;s.react?.(i,t.bad?'sad':'happy');sound(t.bad?'lose':'coin');vibrate(8);caught=true;break;}if(caught||t.y>1.07)things.splice(k,1);}
  const W=s.W,H=s.H,bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#aad9df');bg.addColorStop(.6,'#dce7c1');bg.addColorStop(1,'#be9655');x.fillStyle=bg;x.fillRect(0,0,W,H);
  x.fillStyle='#65adb766';x.fillRect(0,H*.55,W,H*.21);x.strokeStyle='#c8eeee';x.lineWidth=2;for(let k=0;k<9;k++){x.beginPath();x.moveTo((k/9)*W,H*.61+Math.sin(elapsed+k)*3);x.lineTo((k/9)*W+W/16,H*.61+Math.sin(elapsed+k)*3);x.stroke();}
  x.fillStyle='#966039';x.fillRect(W*.36,H*.13,W*.28,H*.32);x.fillStyle='#ffdf62';x.beginPath();x.moveTo(W*.32,H*.14);x.lineTo(W*.5,H*.025);x.lineTo(W*.68,H*.14);x.closePath();x.fill();x.fillStyle='#422d25';x.font=`bold ${clamp(W*.031,13,27)}px sans-serif`;x.textAlign='center';x.fillText('BLUTH’S',W/2,H*.225);x.font=`bold ${clamp(W*.021,10,19)}px sans-serif`;x.fillText('BANANA STAND',W/2,H*.285);
  x.fillStyle='#825637';x.fillRect(0,H*.94,W,H*.06);x.font=`${clamp(Math.min(W,H)*.082,22,44)}px Arial`;x.textAlign='center';x.textBaseline='middle';for(const t of things)x.fillText(t.bad?'🦭':'💵',t.x*W,t.y*H);
  const size=clamp(Math.min(W,H)*.12,36,76);for(let i=0;i<2;i++){const p=players[i];x.fillStyle=i?'#d7679e':'#538bcc';x.fillRect(p.x*W-size*.48,H*.915,size*.96,H*.025);s.sprite(x,i,p.x*W,H*.88-size*.3,size,{exact:true,mood:Math.abs(controls.input[i].x)>0?'walking':undefined});}
  x.fillStyle='#193f35cc';x.fillRect(0,0,W,40);x.fillStyle='#fff5b7';x.font=`bold ${clamp(W*.027,14,25)}px monospace`;x.fillText(`${Math.ceil(Math.max(0,left))}s · $${players[0].score} — $${players[1].score}`,W/2,21);
  gestureHint(x,s,controls);s.setScores(players.map(p=>p.score));s.status('Catch 💵 +$2 · Avoid seals −$5 · Drag your half to move');if(left<=0)s.finish(players.map(p=>p.score),'Money in the Banana Stand');
 });
}

Object.assign(exports,{moneygrab});