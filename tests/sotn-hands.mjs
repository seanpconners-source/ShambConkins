// Castlevania · Symphony of the Night: the sword sits in the hero's hand and the face sits still on the neck. Part 1 draws the hero (both players' sheets, facing
// right and left) at 4x in every swing frame of the combo (quick cut, stab, cleave) and the crouching cut, with the sword
// trail's line (bladeWorld) over it, into a contact sheet OUT/sotn-hands.png, and checks that the sword's grip middle is on
// the frame's measured fist (sotnSprites HERO_HANDS) and that the trail line runs along the drawn blade.
// Usage: node tests/sotn-hands.mjs   (SHAMB_URL = a served build)
import {open} from './lib.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';mkdirSync(out,{recursive:true});
const {browser,page,errors}=await open({viewport:{width:1100,height:700}});
await page.evaluate(()=>{window.ShambConkins.requestGame({id:'cv-symphony',origin:'arcade'});});
await page.waitForTimeout(400);await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
await page.waitForFunction(()=>window.ShambConkins.store.session?.debug?.art,null,{timeout:20000});
const res=await page.evaluate(async()=>{
 const s=window.ShambConkins.store.session;s.paused=true;const A=s.debug.art;
 // swing samples: [label, pose, atkN, atkK] per frame of each row (k in the middle of the frame)
 const rows=[['slash','attack',0,4],['stab','attack',1,5],['cleave','attack',2,6],['crouchSlash','crouchAtk',0,4]];
 const K=4,CW=96,CH=96,cols=6,list=[];
 for(const i of [0,1])for(const f of [1,-1])for(const [row,pose,n,cnt] of rows)list.push({i,f,row,pose,n,cnt});
 // let the sheets and sword pictures load
 const q0={x:0,y:0,facing:1,pose:'attack',atkN:0,atkK:.5,weapon:'alucard'};const tmp=document.createElement('canvas').getContext('2d');
 for(let t=0;t<60;t++){A.drawHero(tmp,{...q0,i:0});A.drawHero(tmp,{...q0,i:1});await new Promise(r=>setTimeout(r,50));}
 const cv=document.createElement('canvas');cv.width=cols*CW*K;cv.height=list.length*CH*K;const g=cv.getContext('2d');g.fillStyle='#24342a';g.fillRect(0,0,cv.width,cv.height);
 const bad=[];let checked=0;
 list.forEach((L,r)=>{for(let fi=0;fi<L.cnt;fi++){const k=(fi+.5)/L.cnt;
  {const q={i:L.i,x:0,y:0,facing:L.f,pose:L.pose,atkN:L.n,atkK:k,weapon:'alucard',t:0};
   g.save();g.translate((fi*CW+CW/2)*K,(r*CH+CH*.82)*K);g.scale(K,K);
   A.drawHero(g,q,{head:(gg,x,y,sz)=>{gg.strokeStyle='rgba(255,220,120,.6)';gg.lineWidth=.3;gg.beginPath();gg.arc(x,y,sz/2,0,7);gg.stroke();},headSize:20});
   const [hx,hy,tx,ty]=A.bladeWorld(q);g.strokeStyle='#ff00ff';g.lineWidth=.35;g.beginPath();g.moveTo(hx,hy);g.lineTo(tx,ty);g.stroke();
   g.restore();
   g.fillStyle='#fff';g.font='22px sans-serif';g.fillText(`p${L.i+1} ${L.f>0?'R':'L'} ${L.row}${fi}`,(fi*CW+2)*K,(r*CH+8)*K);}
  // check for every weapon: the grip's middle on the fist (world units from the anchor)
  for(const w of ['alucard','short','claymore']){const q={i:L.i,x:0,y:0,facing:L.f,pose:L.pose,atkN:L.n,atkK:k,weapon:w};
   const s=A.swordAt?A.swordAt(q):null;if(!s||!s.hand){bad.push(`${L.row}${fi} p${L.i+1} no hand`);continue;}
   const c=Math.cos(s.ang),sn=Math.sin(s.ang),d=s.L/14,gx=s.hx-c*d,gy=s.hy-sn*d;checked++;
   if(Math.hypot(gx-s.hand.x,gy-s.hand.y)>.01)bad.push(`${L.row}${fi} p${L.i+1} ${w} grip off by ${Math.hypot(gx-s.hand.x,gy-s.hand.y).toFixed(2)}`);
   // the trail line starts on the blade 0.3 of the way out and ends at the tip, mirrored by facing
   const [hx,hy,tx,ty]=A.bladeWorld(q),ex=L.f*(s.hx+c*s.L),ey=s.hy+sn*s.L;
   if(Math.hypot(tx-ex,ty-ey)>.01)bad.push(`${L.row}${fi} p${L.i+1} ${w} trail tip off`);}}});
 return {png:cv.toDataURL('image/png'),bad,checked};});
writeFileSync(`${out}/sotn-hands.png`,Buffer.from(res.png.split(',')[1],'base64'));
let ok=!res.bad.length&&!errors.length&&res.checked>0;
console.log('checked',res.checked,'grips;',res.bad.length?'problems: '+res.bad.join('; '):'all in the fist');
// 2) the faces: every frame of every row with the real face (the game's own head function), one sheet per player and
// facing (OUT/sotn-heads-p<1|2>-<R|L>.png), and the face must not move on its own: the same frame drawn twice, 350 ms
// apart, has to come out identical (the session sprite's idle bob/lean made it bounce; the game draws it `still`)
const heads=await page.evaluate(async()=>{
 const s=window.ShambConkins.store.session,A=s.debug.art,TAU=Math.PI*2;
 const rows=[['stand',4,k=>({pose:'stand',t:k*4/5})],['walk',8,k=>({pose:'walk',anim:k*TAU})],['crouch',2,k=>({pose:'crouch',t:k})],
  ['jump',3,k=>({pose:'jump',vy:(k-1)*5.7})],['fall',3,k=>({pose:'fall',vy:k*5})],['flip',8,k=>({pose:'jump',flip:k,vy:-1})],['land',2,k=>({pose:'land',land:(1-k)*7})],
  ['dash',4,k=>({pose:'dash',t:k*4/14})],['kick',2,k=>({pose:'kick',t:k*2/10})],['hurt',2,k=>({pose:'hurt',t:k*2/8})],['cast',4,k=>({pose:'cast',t:k*4/10})],
  ['slash',4,k=>({pose:'attack',atkN:0,atkK:k})],['stab',5,k=>({pose:'attack',atkN:1,atkK:k})],['cleave',6,k=>({pose:'attack',atkN:2,atkK:k})],
  ['crouchSlash',4,k=>({pose:'crouchAtk',atkK:k})],['dead',6,k=>({pose:'dead',dead:k*36})]];
 const K=3,C=96,sheets={},draw=(g,q,i)=>A.drawHero(g,q,{head:s.debug.head(i,'normal'),headSize:23});
 const tmp=document.createElement('canvas').getContext('2d');   // let the faces load
 for(let t=0;t<60;t++){draw(tmp,{x:0,y:0,facing:1,pose:'stand',i:0},0);draw(tmp,{x:0,y:0,facing:1,pose:'stand',i:1},1);await new Promise(r=>setTimeout(r,50));}
 for(const i of [0,1])for(const f of [1,-1]){const cv=document.createElement('canvas');cv.width=8*C*K;cv.height=rows.length*C*K;const g=cv.getContext('2d');g.fillStyle='#24342a';g.fillRect(0,0,cv.width,cv.height);
  rows.forEach(([row,n,mk],r)=>{for(let fi=0;fi<n;fi++){const q={i,x:0,y:0,facing:f,weapon:'alucard',...mk((fi+.5)/n)};
   g.save();g.translate((fi*C+C/2)*K,(r*C+C*.8)*K);g.scale(K,K);draw(g,q,i);g.restore();
   g.fillStyle='#fff';g.font='18px sans-serif';g.fillText(`p${i+1} ${f>0?'R':'L'} ${row}${fi}`,(fi*C+2)*K,(r*C+7)*K);}});
  sheets[`p${i+1}-${f>0?'R':'L'}`]=cv.toDataURL('image/png');}
 // stillness: the same frames drawn twice, apart in time
 const snapAt=()=>{const cv=document.createElement('canvas');cv.width=cv.height=120;const g=cv.getContext('2d');
  [['stand',{pose:'stand',t:0}],['walk',{pose:'walk',anim:1}],['slash',{pose:'attack',atkN:0,atkK:.6}]].forEach(([,q],k)=>{g.save();g.translate(20+k*40,100);g.scale(1,1);draw(g,{i:0,x:0,y:0,facing:1,weapon:'alucard',...q},0);g.restore();});
  return g.getImageData(0,0,120,120).data;};
 const a=snapAt();await new Promise(r=>setTimeout(r,350));const b=snapAt();let diff=0;for(let k=0;k<a.length;k++)if(a[k]!==b[k])diff++;
 return {sheets,diff};});
for(const [k,v] of Object.entries(heads.sheets))writeFileSync(`${out}/sotn-heads-${k}.png`,Buffer.from(v.split(',')[1],'base64'));
console.log('face moved on its own:',heads.diff,'bytes differ between two draws 350 ms apart');if(heads.diff)ok=false;
if(errors.length)console.log('errors',errors);
await browser.close();console.log(ok?'sotn-hands OK':'sotn-hands FAILED');process.exit(ok?0:1);
