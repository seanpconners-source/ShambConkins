const {validPhotoPair:isValidPhotoPair, photoPairLibrary}=require("src/photoPairs.js");
const {PHOTO_HUNT_PAIRS}=require("src/data/photoHuntPairs.js");
const {USER_PORTRAITS}=require("src/data/userPortraits.js");
const {shuffle}=require("src/utils.js");
const {circle}=require("src/engines/session.js");
const {store}=require("src/state.js");
const {saveProfile}=require("src/profile.js");
const {audioContext}=require("src/audio.js");
// Illustrated fallback scenes: used when the photo library runs out (endless rounds still need pictures).
const PHOTO_SCENES = [
 {name:'Paddy’s after hours',source:'Always Sunny',wall:'#335442',sign:'PADDY’S PUB',props:['ham','cat','beer','pool','milk','stool','jukebox','clock','poster','plant','burger','hat']},
 {name:'The Rivoli soundcheck',source:'Nirvanna the Band the Show',wall:'#543758',sign:'THE RIVOLI',props:['guitar','amp','drum','mic','record','stool','jukebox','clock','poster','plant','bass','hat']},
 {name:'The movie arcade',source:'Megatouch',wall:'#213e59',sign:'MEGATOUCH · PHOTO HUNT',props:['cabinet','frog','gak','pool','soda','stool','jukebox','clock','poster','plant','burger','hat']}
];
function photoRound(scene,random=Math.random){const changes=shuffle(Array.from({length:12},(_,i)=>i),random).slice(0,5);return {scene,changes,regions:changes.map(index=>({x:(index%4+.5)/4,y:(Math.floor(index/4)+.5)/3,r:.075,index}))};}
function photoHit(regions,p,found=[]){return regions.findIndex((r,i)=>!found.includes(i)&&Math.hypot(p.x-r.x,p.y-r.y)<r.r);}
const validPhotoPair=isValidPhotoPair;
function prop(x,type,cx,cy,size,changed){
 x.save();x.translate(cx,cy);x.lineWidth=3;x.strokeStyle='#ead4aa';
 const color=changed?'#e97083':'#edc56e';
 switch(type){
 case 'pool':circle(x,0,0,size*.43,changed?'#466fc4':'#242323');circle(x,0,0,size*.22,'#fff6d8');x.fillStyle='#222';x.font=`bold ${size*.25}px Arial`;x.textAlign='center';x.fillText(changed?'9':'8',0,4);break;
 case 'clock':circle(x,0,0,size*.44,'#f0d7a9');x.strokeStyle='#312d24';x.beginPath();x.moveTo(0,0);x.lineTo(changed?14:0,-15);x.moveTo(0,0);x.lineTo(-13,5);x.stroke();break;
 case 'stool':x.fillStyle=color;x.fillRect(-size*.45,-8,size*.9,12);x.strokeStyle='#bb9c76';for(const side of [-1,1]){x.beginPath();x.moveTo(side*16,4);x.lineTo(side*(changed?25:16),28);x.stroke();}break;
 case 'poster':x.fillStyle='#ecd7b0';x.fillRect(-27,-30,54,60);x.fillStyle=changed?'#337468':'#aa5548';x.font='bold 12px Arial';x.textAlign='center';x.fillText(changed?'OBEY':'HANG IN',0,-9);x.fillText(changed?'👽':'🐈',0,17);break;
 case 'cabinet':case 'jukebox':x.fillStyle=changed?'#a95c81':'#628eae';x.fillRect(-23,-30,46,61);x.fillStyle='#121e35';x.fillRect(-17,-22,34,28);x.fillStyle='#e4c576';x.fillRect(-16,15,32,5);x.font='bold 9px Arial';x.textAlign='center';x.fillText(type==='cabinet'?(changed?'FROGGER':'GALAGA'):'ONE MORE',0,-9);break;
 case 'guitar':case 'bass':circle(x,-2,12,17,color);circle(x,4,0,12,color);x.fillStyle='#ceaa7c';x.fillRect(-3,-32,6,40);x.strokeStyle='#faeacd';x.beginPath();x.moveTo(changed?-8:0,-28);x.lineTo(0,22);x.stroke();break;
 case 'amp':x.fillStyle='#22262b';x.fillRect(-26,-23,52,46);x.strokeStyle=changed?'#e36fae':'#ae956d';x.strokeRect(-21,-16,42,27);circle(x,changed?15:-15,-19,3,'#f2db97');break;
 case 'drum':circle(x,0,5,24,color);circle(x,0,5,17,'#211f2a');x.strokeStyle='#efdfbe';x.beginPath();x.moveTo(-27,-28);x.lineTo(20,changed?8:-5);x.stroke();break;
 case 'mic':x.strokeStyle='#c8c8bf';x.beginPath();x.moveTo(0,-20);x.lineTo(0,27);x.moveTo(-18,28);x.lineTo(18,28);x.stroke();circle(x,changed?9:0,-23,10,color);break;
 case 'record':circle(x,0,0,25,'#101b23');circle(x,0,0,9,color);circle(x,0,0,2,'#f0d9b0');break;
 case 'plant':x.fillStyle=color;x.fillRect(-13,7,26,22);for(let j=0;j<(changed?3:5);j++){x.fillStyle='#70a67c';x.beginPath();x.ellipse((j%2?1:-1)*12,-j*6,13,6,j%2?.8:-.8,0,Math.PI*2);x.fill();}break;
 default: {const icons={ham:'🍖',cat:'🐈',beer:'🍺',milk:'🥛',burger:'🍔',hat:'🎩',frog:'🐸',gak:'🟢',soda:'🥤'};x.font=`${size*.95}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText(changed?({ham:'🍍',cat:'🐕',beer:'🍷',milk:'🧃',burger:'🌭',hat:'👑',frog:'🐢',gak:'🟣',soda:'🍊'}[type]||'⭐'):icons[type]||'⭐',0,0);}
 }x.restore();
}
function sceneDraw(x,scene,changes,right,rect){
 x.save();x.translate(rect.x,rect.y);x.fillStyle=scene.wall;x.fillRect(0,0,rect.w,rect.h);x.fillStyle='#151725';x.fillRect(0,0,rect.w,27);x.fillStyle='#f2d59b';x.textAlign='center';x.font='bold 11px Arial';x.fillText(scene.sign,rect.w/2,18);
 x.strokeStyle='#f0d7ad33';for(let y=39;y<rect.h;y+=23){x.beginPath();x.moveTo(0,y);x.lineTo(rect.w,y);x.stroke();}
 for(let i=0;i<12;i++)prop(x,scene.props[i],(i%4+.5)*rect.w/4,(Math.floor(i/4)+.5)*rect.h/3+8,43,right&&changes.includes(i));
 x.restore();
}

// ---- Megatouch Photo Hunt (Aurora 2007 cabinet) replica ----
// One player hunts round after round until the timer bar runs out; then the other player gets their own photo set.
// Find = the clock value (counts down from 1000, resets after each find); a cleared round converts the pills left into a time bonus.
// Scoring numbers were read off cabinet photos (≈14k a round, ≈320 per pill); tweak them here.
const RULES=Object.freeze({diffs:5,pills:48,roundTime:48,timeStep:1.5,minTime:30,missPenalty:3,clockStart:1000,clockDecay:25,clockFloor:250,pillBonus:320,hints:3,houseName:'WILLYZ CREW',houseScore:369127});
const DW=800,DH=600;
const LAY=Object.freeze({logo:{x:22,y:6},clock:{x:486,y:12,w:150,h:52},help:{x:698,y:38,r:25},quit:{x:762,y:38,r:25},badge:{x:22,y:104,r:13},score:{x:40,y:89,w:154,h:30},hi:{x:484,y:85,w:306,h:38},
 frame:{x:10,y:130,w:780,h:404},bar:{x:40,y:139,w:720,h:36},photos:[{x:18,y:196,w:372,h:322},{x:410,y:196,w:372,h:322}],round:{x:40,y:568},glasses:[{x:322,y:565},{x:400,y:565},{x:478,y:565}]});
const FONT='"Arial Rounded MT Bold","Nunito","Varela Round","Trebuchet MS",Arial,sans-serif';
const LOGO_FONT='"Arial Rounded MT Bold","Nunito","Varela Round","Arial Black",sans-serif';
const fmt=n=>Math.round(n).toLocaleString('en-US');
const roundTime=n=>Math.max(RULES.minTime,RULES.roundTime-n*RULES.timeStep);

function rr(x,X,Y,W,H,R){R=Math.min(R,W/2,H/2);x.beginPath();x.moveTo(X+R,Y);x.arcTo(X+W,Y,X+W,Y+H,R);x.arcTo(X+W,Y+H,X,Y+H,R);x.arcTo(X,Y+H,X,Y,R);x.arcTo(X,Y,X+W,Y,R);x.closePath();}
function vgrad(x,y0,y1,stops){const g=x.createLinearGradient(0,y0,0,y1);stops.forEach((c,i)=>g.addColorStop(i/(stops.length-1),c));return g;}

// Cabinet sounds (synth, no samples): bright double ding, low buzzer, sparkle, ticks, fanfares.
function sfx(kind){
 if(!store.profile?.settings.sound)return;const a=audioContext();if(!a)return;const t0=a.currentTime;
 const note=(f,at,dur,type='square',vol=.045,to)=>{const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t0+at);if(to)o.frequency.exponentialRampToValueAtTime(to,t0+at+dur);g.gain.setValueAtTime(.0001,t0+at);g.gain.exponentialRampToValueAtTime(vol,t0+at+.008);g.gain.exponentialRampToValueAtTime(.0001,t0+at+dur);o.connect(g);g.connect(a.destination);o.start(t0+at);o.stop(t0+at+dur+.02);};
 switch(kind){
  case 'find':note(1175,0,.1);note(1568,.07,.22);note(2349,.07,.22,'sine',.03);break;
  case 'miss':note(98,0,.38,'sawtooth',.075);note(104,0,.38,'square',.05);break;
  case 'hint':[784,988,1175,1568,1976].forEach((f,i)=>note(f,i*.05,.14,'sine',.04));break;
  case 'go':note(659,0,.09);note(988,.1,.2);break;
  case 'tick':note(2200,0,.035,'square',.018);break;
  case 'bonus':note(1760,0,.035,'square',.02);break;
  case 'button':note(880,0,.05,'sine',.03);break;
  case 'complete':[523,659,784,1047,784,1047].forEach((f,i)=>note(f,i*.09,i===5?.4:.12));break;
  case 'timeup':[659,523,415,330].forEach((f,i)=>note(f,i*.16,.22,'triangle',.06));break;
  case 'high':[523,659,784,1047,1319,1568].forEach((f,i)=>note(f,i*.08,.18,'square',.04));break;
 }
}

let logoCache=null;
function logoImage(){
 if(logoCache)return logoCache;const k=2,cv=document.createElement('canvas');cv.width=430*k;cv.height=74*k;const x=cv.getContext('2d');x.scale(k,k);
 x.font=`900 56px ${LOGO_FONT}`;x.textBaseline='alphabetic';x.lineJoin='round';
 const words=[['PHOTO',['#fbf3ff','#d9b2f7','#9a5bd8','#7b3cc0']],['HUNT',['#f2feff','#a7e8fb','#43a6e6','#2378c8']]];
 const widths=words.map(([w])=>[...w].reduce((s,ch)=>s+x.measureText(ch).width*.96,0)),gap=20,total=widths[0]+widths[1]+gap,scale=Math.min(1,392/total);
 x.save();x.translate(8,0);x.scale(scale,1);let cx=0;const letters=[];
 words.forEach(([w,stops],wi)=>{[...w].forEach((ch,i)=>{const lw=x.measureText(ch).width*.96;letters.push({ch,cx:cx+lw/2,tilt:((i+wi)%2?1:-1)*.035,dy:(i%2?2:-1),stops});cx+=lw;});cx+=gap;});
 const pass=(fn)=>{for(const L of letters){x.save();x.translate(L.cx,60+L.dy);x.rotate(L.tilt);x.textAlign='center';fn(L);x.restore();}};
 pass(L=>{x.strokeStyle='#2c1c52';x.lineWidth=13;x.strokeText(L.ch,0,0);});
 pass(L=>{x.strokeStyle='#ffffff';x.lineWidth=6;x.strokeText(L.ch,0,0);});
 pass(L=>{x.fillStyle=vgrad(x,-44,2,L.stops);x.fillText(L.ch,0,0);});
 pass(L=>{x.save();x.beginPath();x.rect(-40,-46,80,22);x.clip();x.fillStyle='rgba(255,255,255,.38)';x.fillText(L.ch,0,0);x.restore();});
 x.restore();x.fillStyle='#6b6f80';x.font=`bold 8px ${FONT}`;x.fillText('TM',398,14);
 return logoCache=cv;
}

function darkPill(x,b,gold=false){
 rr(x,b.x,b.y,b.w,b.h,b.h/2);x.fillStyle='#7e8794';x.fill();
 rr(x,b.x+2,b.y+2,b.w-4,b.h-4,(b.h-4)/2);x.fillStyle=vgrad(x,b.y,b.y+b.h,['#fbfdff','#c9d1da']);x.fill();
 rr(x,b.x+5,b.y+5,b.w-10,b.h-10,(b.h-10)/2);x.fillStyle=gold?vgrad(x,b.y,b.y+b.h,['#fff4b8','#f0c53e','#c99512']):vgrad(x,b.y,b.y+b.h,['#555e6b','#262c35','#14181e']);x.fill();
 x.save();rr(x,b.x+7,b.y+6,b.w-14,(b.h-12)*.45,(b.h-12)*.22);x.fillStyle='rgba(255,255,255,.13)';x.fill();x.restore();
}
function clockIcon(x,cx,cy,r){
 circle(x,cx,cy,r+2,'#5b4a12');x.fillStyle=vgrad(x,cy-r,cy+r,['#fff1a8','#e2b43a','#a8780c']);x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fill();circle(x,cx,cy,r-4,'#fffdf5');
 x.strokeStyle='#222';x.lineCap='round';x.lineWidth=2.4;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx,cy-r*.62);x.moveTo(cx,cy);x.lineTo(cx-r*.42,cy-r*.2);x.stroke();circle(x,cx,cy,1.8,'#222');
}
function roundButton(x,b,kind,glow=0){
 const [hi,mid,lo,edge]=kind==='help'?['#c9ff9e','#4fc43f','#1f7d1c','#0e4a0d']:['#ffc0b4','#ee4a3e','#a0161b','#5a0a0d'];
 circle(x,b.x,b.y+2,b.r+3,'rgba(0,0,0,.25)');circle(x,b.x,b.y,b.r+3,'#9aa3ad');circle(x,b.x,b.y,b.r+1.5,'#ffffff');
 const g=x.createRadialGradient(b.x-b.r*.35,b.y-b.r*.45,2,b.x,b.y,b.r);g.addColorStop(0,hi);g.addColorStop(.55,mid);g.addColorStop(1,lo);x.fillStyle=g;x.beginPath();x.arc(b.x,b.y,b.r,0,Math.PI*2);x.fill();
 if(glow){x.fillStyle=`rgba(255,255,255,${.35*glow})`;x.beginPath();x.arc(b.x,b.y,b.r,0,Math.PI*2);x.fill();}
 x.save();x.lineJoin='round';x.lineCap='round';
 if(kind==='help'){x.font=`900 33px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.strokeStyle=edge;x.lineWidth=5;x.strokeText('?',b.x,b.y+2);x.fillStyle='#fff';x.fillText('?',b.x,b.y+2);}
 else{const d=b.r*.4;for(const [w,c] of [[10,edge],[5.5,'#fff']]){x.strokeStyle=c;x.lineWidth=w;x.beginPath();x.moveTo(b.x-d,b.y-d);x.lineTo(b.x+d,b.y+d);x.moveTo(b.x+d,b.y-d);x.lineTo(b.x-d,b.y+d);x.stroke();}}
 x.restore();
}
function magnifier(x,cx,cy,used,s=1){
 x.save();x.translate(cx,cy);x.scale(s,s);x.globalAlpha=used?.28:1;x.lineCap='round';
 x.strokeStyle='#1d1f24';x.lineWidth=9;x.beginPath();x.moveTo(8,8);x.lineTo(24,24);x.stroke();x.strokeStyle='#6b7079';x.lineWidth=5.5;x.beginPath();x.moveTo(8,8);x.lineTo(23,23);x.stroke();
 x.strokeStyle='#2a2d33';x.lineWidth=7;x.beginPath();x.arc(-4,-4,15,0,Math.PI*2);x.stroke();
 const g=x.createRadialGradient(-9,-10,1,-4,-4,15);g.addColorStop(0,'#ffffff');g.addColorStop(.5,'#dbe8f3');g.addColorStop(1,'#9fb6cc');x.fillStyle=g;x.beginPath();x.arc(-4,-4,13,0,Math.PI*2);x.fill();
 x.strokeStyle=vgrad(x,-20,12,['#ffffff','#b9c0c9','#7c848f']);x.lineWidth=4;x.beginPath();x.arc(-4,-4,14.5,0,Math.PI*2);x.stroke();
 x.restore();
}
// Hand-drawn answer ring: wobbly, slightly spiralling, ends overlap like a marker stroke.
function marker(x,cx,cy,rx,ry,seed,prog=1,color='#3cf03c',dark='rgba(8,80,14,.6)'){
 const a0=seed*6.283,ph=seed*41%6.283,sweep=(Math.PI*2+.45)*Math.min(1,prog),n=Math.max(2,Math.ceil(48*Math.min(1,prog)));
 const path=()=>{x.beginPath();for(let i=0;i<=n;i++){const t=i/n,a=a0+t*sweep,k=1+.045*Math.sin(2*a+ph)+.03*Math.sin(3*a+ph*2)+.07*t-.035;const px=cx+Math.cos(a)*rx*k,py=cy+Math.sin(a)*ry*k;i?x.lineTo(px,py):x.moveTo(px,py);}};
 x.save();x.lineCap='round';x.lineJoin='round';path();x.strokeStyle=dark;x.lineWidth=6.5;x.stroke();path();x.strokeStyle=color;x.lineWidth=3.8;x.stroke();x.restore();
}

// Photo windows show the picture cover-fitted (cropped to the window), optionally mirrored.
function photoView(img,slot,mirror){
 const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,k=Math.max(slot.w/iw,slot.h/ih),w=iw*k,h=ih*k;
 return {x:slot.x+(slot.w-w)/2,y:slot.y+(slot.h-h)/2,w,h,mirror};
}
const toSlot=(v,u,y)=>({x:v.x+(v.mirror?1-u:u)*v.w,y:v.y+y*v.h});
const fromSlot=(v,p)=>{const u=(p.x-v.x)/v.w;return {u:v.mirror?1-u:u,v:(p.y-v.y)/v.h};};

function illustratedPair(index,random){
 const scene=PHOTO_SCENES[index%PHOTO_SCENES.length],round=photoRound(scene,random),w=740,h=640,rect={x:0,y:0,w:320,h:277};
 const images=[false,true].map(right=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;const x=cv.getContext('2d');x.scale(w/rect.w,h/rect.h);sceneDraw(x,scene,round.changes,right,rect);return cv;});
 const regions=round.changes.map(i=>({x:(i%4+.5)/4,y:((Math.floor(i/4)+.5)*rect.h/3+8)/rect.h,rx:.085,ry:.1}));
 return {id:'scene-'+index,title:scene.name,images,regions};
}
function bundledPairs(){return PHOTO_HUNT_PAIRS.map(p=>({id:p.id,title:p.title,urls:[USER_PORTRAITS[`photohunt:${p.id}:a`],USER_PORTRAITS[`photohunt:${p.id}:b`]],regions:(p.regions||[]).map(r=>({x:r.x,y:r.y,rx:r.rx??r.r,ry:r.ry??r.r}))})).filter(p=>p.urls.every(u=>typeof u==='string')&&p.regions.length&&p.regions.every(r=>[r.x,r.y,r.rx,r.ry].every(Number.isFinite)));}
function profilePairs(){return photoPairLibrary(store.profile).filter(isValidPhotoPair).map((p,i)=>({id:'mine-'+i,title:p.title||'Your photo pair',urls:[p.left,p.right],regions:p.regions.map(r=>({x:r.x,y:r.y,rx:r.r,ry:r.r}))}));}
function houseRecord(){const saved=store.profile?.photoHuntHigh;return saved&&Number.isFinite(saved.score)&&saved.score>RULES.houseScore?saved:{name:RULES.houseName,score:RULES.houseScore};}
function loadImage(s,url){return new Promise(resolve=>{const img=new Image();let done=false;const end=ok=>{if(done)return;done=true;img.onload=img.onerror=null;resolve(ok?img:null);};img.onload=()=>end(!!img.naturalWidth);img.onerror=()=>end(false);s.cleanup(()=>end(false));setTimeout(()=>end(false),10000);img.src=url;});}

function fullBleed(s){
 const shell=s.body.closest('.game-shell'),layer=shell?.parentElement;if(!shell)return;
 shell.classList.add('ph-shell');layer?.classList.add('ph-layer');const css=document.createElement('style');
 css.textContent=`#game-layer.ph-layer{padding:0;height:100dvh;max-height:none}
  .game-shell.ph-shell{position:relative;max-width:none;width:100%;height:100%;border:0;border-radius:0;grid-template-rows:minmax(0,1fr);overflow:hidden;background:#050507}
  .ph-shell>.game-header,.ph-shell>#game-scorebar{display:none}
  .ph-shell>.game-body{padding:0;display:flex;gap:0;overflow:hidden;min-height:0}
  .ph-shell .canvas-frame{border:0;border-radius:0;flex:1;min-height:0;width:100%;height:100%;background:#050507}
  .ph-shell .game-canvas{display:block;border:0;border-radius:0;max-width:none;max-height:none;touch-action:none}
  .ph-shell #game-status,.ph-shell #game-hint,.ph-shell #game-controls{display:none}
  .ph-shell .pass-overlay{z-index:30}`;
 shell.appendChild(css);s.cleanup(()=>{css.remove();shell.classList.remove('ph-shell');layer?.classList.remove('ph-layer');});
}

async function photohunt(s){
 const [c,x]=s.canvas(DW,DH,{fill:true});s.body.classList.add('drag-arena-body');fullBleed(s);
 s.hint('Tap a difference on either photo. A wrong tap costs time. Tap a magnifying glass for a hint (3 per game).');
 const players=[0,1].map(()=>({score:0,round:0,hints:RULES.hints,done:false,high:false}));
 const photos=shuffle([...bundledPairs(),...profilePairs()],s.random),decks=[photos.filter((_,i)=>i%2===0),photos.filter((_,i)=>i%2===1)];
 if(photos.length===1)decks[1]=[...decks[0]];
 const cache=new Map();let sceneIndex=Math.floor(s.random()*PHOTO_SCENES.length);
 let actor=0,phase='wait',T=0,st=null,help=false,portrait=false,view={k:1,ox:0,oy:0},resolveGame=null,lastTick=0,clockGlow=0,quitGlow=0,lockTried=false;
 const P=()=>players[actor];
 const name=i=>(s.players[i]?.name||`Player ${i+1}`);
 const pushScores=()=>s.setScores(players.map(p=>p.score));
 // Each player first plays their own half of the library, then the other half mirrored, then illustrated scenes forever.
 const seqs=[0,1].map(p=>{const own=decks[p],ids=new Set(own.map(q=>q.id));return [...own.map(pair=>({pair,mirror:false})),...decks[1-p].filter(q=>!ids.has(q.id)).map(pair=>({pair,mirror:true}))];});
 function roundSpec(p,n){const seq=seqs[p];if(n<seq.length)return {...seq[n]};return {pair:illustratedPair(sceneIndex++,s.random),mirror:false};}
 function imagesFor(pair){if(pair.images)return Promise.resolve(pair.images);if(!cache.has(pair.id))cache.set(pair.id,Promise.all(pair.urls.map(u=>loadImage(s,u))));return cache.get(pair.id);}
 function startGame(p){actor=p;s.active=p;Object.assign(players[p],{score:0,round:0,hints:RULES.hints,done:false,high:false});pushScores();startRound();}
 async function startRound(){
  const n=P().round,spec=roundSpec(actor,n),total=roundTime(n);
  st={spec,regions:spec.pair.regions.slice(0,8),found:[],hinted:[],marks:[],misses:[],total,left:total,clock:RULES.clockStart,swap:s.random()<.5,images:null,bonusLeft:0,bonusT:0};
  phase='loading';T=0;const mine=st;
  let imgs=await imagesFor(spec.pair);if(mine!==st||!s.alive)return;
  if(!imgs||imgs.some(i=>!i)){spec.pair=illustratedPair(sceneIndex++,s.random);spec.mirror=false;st.regions=spec.pair.regions;imgs=spec.pair.images;}
  st.images=st.swap?[imgs[1],imgs[0]]:imgs;phase='intro';T=0;
  const next=roundSpec(actor,n+1);if(next.pair.urls)void imagesFor(next.pair);
 }
 const views=()=>st?.images?st.images.map((img,i)=>photoView(img,LAY.photos[i],st.spec.mirror)):null;
 const lit=()=>st?Math.max(0,Math.min(RULES.pills,Math.ceil(st.left/st.total*RULES.pills-1e-9))):RULES.pills;
 function find(i,hinted=false){
  st.found.push(i);st.marks.push({i,t:0,seed:((i+1)*0.618+st.found.length*.37)%1,hinted});
  if(hinted){st.hinted.push(i);sfx('hint');}
  else{P().score+=Math.round(st.clock);st.clock=RULES.clockStart;clockGlow=1;sfx('find');s.react(actor,'happy');}
  pushScores();
  if(st.found.length>=st.regions.length){phase='solved';T=0;sfx('complete');}
 }
 function useHint(){if(phase!=='hunt'||P().hints<=0)return;const open=st.regions.map((_,i)=>i).filter(i=>!st.found.includes(i));if(!open.length)return;P().hints--;find(open[Math.floor(s.random()*open.length)],true);}
 function update(dt){
  clockGlow=Math.max(0,clockGlow-dt*2.2);quitGlow=Math.max(0,quitGlow-dt*3);
  if(portrait||help||!st)return;
  T+=dt;for(const m of st.marks)m.t+=dt;for(const m of st.misses)m.t+=dt;st.misses=st.misses.filter(m=>m.t<.9);
  if(phase==='intro'&&T>1.7){phase='hunt';T=0;sfx('go');}
  else if(phase==='hunt'){
   st.left=Math.max(0,st.left-dt);st.clock=Math.max(RULES.clockFloor,st.clock-RULES.clockDecay*dt);
   if(st.left<st.total*.2&&st.left>0){const sec=Math.ceil(st.left);if(sec!==lastTick){lastTick=sec;sfx('tick');}}
   if(st.left<=0){phase='timeup';T=0;sfx('timeup');s.react(actor,'sad');}
  }
  else if(phase==='solved'&&T>1.1){phase='bonus';T=0;st.bonusT=0;}
  else if(phase==='bonus'){
   st.bonusT+=dt;const per=st.total/RULES.pills;
   while(st.bonusT>.04&&lit()>0){st.bonusT-=.04;st.left=Math.max(0,(lit()-1)*per);st.bonusLeft+=RULES.pillBonus;P().score+=RULES.pillBonus;sfx('bonus');pushScores();}
   if(lit()===0&&st.bonusT>1){P().round++;void startRound();}
  }
  else if(phase==='timeup'&&T>3.4){phase='over';T=0;const rec=houseRecord();if(P().score>rec.score){P().high=true;store.profile.photoHuntHigh={name:name(actor).toUpperCase().slice(0,16),score:P().score,round:P().round+1};saveProfile(store.profile);sfx('high');}}
  else if(phase==='over'&&T>3.6){phase='done';P().done=true;const r=resolveGame;resolveGame=null;r?.();}
 }

 // ---- drawing ----
 function drawScreen(){
  const bg=x.createLinearGradient(0,0,DW,DH);bg.addColorStop(0,'#f7f9fc');bg.addColorStop(.5,'#e6edf5');bg.addColorStop(1,'#d5e0eb');x.fillStyle=bg;x.fillRect(0,0,DW,DH);
  x.save();x.globalAlpha=.35;x.fillStyle='#ffffff';for(let i=-2;i<6;i++){x.beginPath();x.moveTo(i*190,0);x.lineTo(i*190+120,0);x.lineTo(i*190-60,130);x.lineTo(i*190-180,130);x.fill();}x.restore();
  x.drawImage(logoImage(),LAY.logo.x,LAY.logo.y,430,74);
  // clock
  const cb=LAY.clock,gold=phase==='bonus'||clockGlow>.15;darkPill(x,cb,gold);clockIcon(x,cb.x+29,cb.y+cb.h/2,15);
  x.fillStyle=gold?'#2b2108':'#ffffff';x.font=`bold 25px ${FONT}`;x.textAlign='center';x.textBaseline='middle';x.fillText(String(Math.round(st&&phase!=='wait'?st.clock:RULES.clockStart)),cb.x+92,cb.y+cb.h/2+1);
  roundButton(x,LAY.help,'help');roundButton(x,LAY.quit,'quit',quitGlow);
  // player badge + score
  const b=LAY.badge;circle(x,b.x,b.y,b.r+2,'#7d8692');const bg2=x.createRadialGradient(b.x-4,b.y-5,1,b.x,b.y,b.r);bg2.addColorStop(0,'#ffffff');bg2.addColorStop(1,'#aeb6c0');x.fillStyle=bg2;x.beginPath();x.arc(b.x,b.y,b.r,0,Math.PI*2);x.fill();
  x.fillStyle='#14171c';x.font=`900 17px ${FONT}`;x.fillText(String(actor+1),b.x,b.y+1);
  darkPill(x,LAY.score);x.fillStyle='#fff';x.font=`bold 17px ${FONT}`;x.fillText(fmt(P().score),LAY.score.x+LAY.score.w/2,LAY.score.y+LAY.score.h/2+1);
  // hi score bar
  const h=LAY.hi,rec=houseRecord();rr(x,h.x-2,h.y-2,h.w+4,h.h+4,(h.h+4)/2);x.fillStyle='#8c1a17';x.fill();rr(x,h.x,h.y,h.w,h.h,h.h/2);x.fillStyle=vgrad(x,h.y,h.y+h.h,['#ff8a7c','#ea3b31','#c0201c','#a5171a']);x.fill();
  rr(x,h.x+8,h.y+3,h.w-16,h.h*.38,h.h*.19);x.fillStyle='rgba(255,255,255,.2)';x.fill();
  x.textAlign='left';x.fillStyle='#ffe3df';x.font=`bold 8px ${FONT}`;x.fillText('HI SCORE',h.x+20,h.y+8.5);
  x.fillStyle='#fff';x.font=`bold 18px ${FONT}`;x.fillText(String(rec.name).slice(0,16),h.x+17,h.y+h.h/2+5);x.textAlign='right';x.fillText(fmt(rec.score),h.x+h.w-18,h.y+h.h/2+5);
  // frame
  const f=LAY.frame;rr(x,f.x,f.y,f.w,f.h,22);x.fillStyle=vgrad(x,f.y,f.y+f.h,['#d6e6f6','#bcd4ec','#aac7e5']);x.fill();x.lineWidth=3;x.strokeStyle='#5f8fc2';x.stroke();
  rr(x,f.x+4,f.y+4,f.w-8,f.h-8,19);x.lineWidth=1.5;x.strokeStyle='rgba(255,255,255,.7)';x.stroke();
  drawBar();drawPhotos();
  // bottom strip
  x.textAlign='left';x.textBaseline='middle';x.fillStyle='#2b2d33';x.font=`bold 22px ${FONT}`;x.fillText(`ROUND ${P().round+1}`,LAY.round.x,LAY.round.y);
  LAY.glasses.forEach((g,i)=>magnifier(x,g.x,g.y,i>=P().hints));
 }
 function drawBar(){
  const b=LAY.bar,n=RULES.pills;rr(x,b.x,b.y,b.w,b.h,b.h/2);x.fillStyle=vgrad(x,b.y,b.y+b.h,['#ffffff','#e3ebf3']);x.fill();x.lineWidth=2;x.strokeStyle='#86a7cb';x.stroke();
  const pad=14,slot=(b.w-pad*2)/n,pw=slot-2.6,ph=b.h-11,on=lit(),now=performance.now()/1000,low=phase==='hunt'&&on<=Math.ceil(n*.2);
  for(let i=0;i<n;i++){
   const px=b.x+pad+i*slot+1.3,py=b.y+5.5,isOn=i<on&&!(low&&i===on-1&&Math.sin(now*14)>0);
   const cols=i<8?['#ff9b8c','#e83c33','#a11b16']:i<20?['#ffeaa0','#f2bd2f','#c38a0d']:['#c4f5a4','#5fc94a','#2c8a22'];
   rr(x,px,py,pw,ph,pw/2);x.fillStyle=isOn?vgrad(x,py,py+ph,cols):vgrad(x,py,py+ph,['#4a5878','#27304a','#161c2e']);x.fill();
   x.lineWidth=1;x.strokeStyle=isOn?'rgba(0,0,0,.28)':'rgba(0,0,0,.45)';x.stroke();
   rr(x,px+2,py+2,pw-4,ph*.36,(pw-4)/2);x.fillStyle=isOn?'rgba(255,255,255,.5)':'rgba(255,255,255,.12)';x.fill();
  }
 }
 function drawPhotos(){
  const vs=views(),now=performance.now()/1000;
  LAY.photos.forEach((p,i)=>{
   x.fillStyle='rgba(30,60,100,.25)';x.fillRect(p.x+3,p.y+4,p.w,p.h);x.fillStyle='#ffffff';x.fillRect(p.x-3,p.y-3,p.w+6,p.h+6);
   x.save();x.beginPath();x.rect(p.x,p.y,p.w,p.h);x.clip();
   if(vs&&['hunt','solved','bonus','timeup','over'].includes(phase)){
    const v=vs[i],img=st.images[i];x.save();if(v.mirror){x.translate(v.x+v.w,v.y);x.scale(-1,1);x.drawImage(img,0,0,v.w,v.h);}else x.drawImage(img,v.x,v.y,v.w,v.h);x.restore();
    for(const m of st.marks){const r=st.regions[m.i],c=toSlot(v,r.x,r.y),rx=r.rx*v.w,ry=r.ry*v.h;
     if(m.hinted&&m.t<.7){const k=Math.min(1,m.t/.35);magnifier(x,c.x+(1-k)*40,c.y+(1-k)*40,false,1.4);}
     marker(x,c.x,c.y,rx,ry,m.seed,m.hinted?Math.max(0,(m.t-.45)/.3):m.t/.28,m.hinted?'#ffe44d':'#3cf03c',m.hinted?'rgba(110,80,0,.6)':undefined);}
    if(phase==='timeup'||phase==='over')st.regions.forEach((r,j)=>{if(st.found.includes(j)||Math.sin(now*9)<-.2)return;const c=toSlot(v,r.x,r.y);marker(x,c.x,c.y,r.rx*v.w,r.ry*v.h,(j*.29)%1,1,'#ff3a2e','rgba(90,0,0,.6)');});
    for(const m of st.misses)if(m.side===i){const a=1-m.t/.9,sz=16;x.save();x.globalAlpha=a;x.lineCap='round';for(const [w,col] of [[9,'#5a0000'],[5,'#ff2b2b']]){x.strokeStyle=col;x.lineWidth=w;x.beginPath();x.moveTo(m.x-sz,m.y-sz);x.lineTo(m.x+sz,m.y+sz);x.moveTo(m.x+sz,m.y-sz);x.lineTo(m.x-sz,m.y+sz);x.stroke();}x.restore();}
   }else{x.fillStyle=vgrad(x,p.y,p.y+p.h,['#2f4f86','#1b2f57','#101d38']);x.fillRect(p.x,p.y,p.w,p.h);
    x.globalAlpha=.12;x.drawImage(logoImage(),p.x+p.w/2-150,p.y+p.h/2-26,300,52);x.globalAlpha=1;}
   x.restore();
  });
  if(phase==='intro')banner(`ROUND ${P().round+1}`,`Find the ${st.regions.length} differences!`);
  else if(phase==='loading')banner('LOADING…','');
  else if(phase==='solved')banner('ROUND COMPLETE!',st.hinted.length?`${st.hinted.length} hint${st.hinted.length>1?'s':''} used`:'Nice eyes!');
  else if(phase==='bonus')banner('TIME BONUS',fmt(st.bonusLeft));
  else if(phase==='timeup')banner("TIME'S UP!",`${st.regions.length-st.found.length} left to find`);
  else if(phase==='over')banner(P().high?'NEW HIGH SCORE!':'GAME OVER',`${name(actor)} · ${fmt(P().score)} · round ${P().round+1}`);
 }
 function banner(title,sub){
  const w=470,h=sub?112:80,bx=DW/2-w/2,by=LAY.photos[0].y+LAY.photos[0].h/2-h/2;
  x.save();x.shadowColor='rgba(0,0,0,.45)';x.shadowBlur=18;rr(x,bx,by,w,h,22);x.fillStyle='#0d1a36';x.fill();x.restore();
  rr(x,bx+3,by+3,w-6,h-6,19);x.fillStyle=vgrad(x,by,by+h,['#3e64b0','#20387a','#142554']);x.fill();x.lineWidth=3;x.strokeStyle='#f6d36a';x.stroke();
  x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.font=`900 38px ${FONT}`;x.strokeStyle='#0b1430';x.lineWidth=7;x.strokeText(title,DW/2,by+(sub?40:h/2));x.fillStyle=vgrad(x,by+20,by+60,['#ffffff','#ffe27a','#f3a90f']);x.fillText(title,DW/2,by+(sub?40:h/2));
  if(sub){const big=/^[\d,]+$/.test(sub);x.font=`bold ${big?30:20}px ${FONT}`;x.fillStyle=big?'#ffffff':'#e9f1ff';x.fillText(sub,DW/2,by+82);}
 }
 function drawHelp(){
  x.fillStyle='rgba(6,12,28,.72)';x.fillRect(0,0,DW,DH);const bx=110,by=120,w=580,h=380;
  rr(x,bx,by,w,h,24);x.fillStyle=vgrad(x,by,by+h,['#f8fbff','#dbe7f4']);x.fill();x.lineWidth=4;x.strokeStyle='#5f8fc2';x.stroke();
  roundButton(x,{x:bx+40,y:by+40,r:22},'help');x.textAlign='left';x.textBaseline='middle';x.fillStyle='#1d2b4a';x.font=`900 28px ${FONT}`;x.fillText('HOW TO PLAY',bx+78,by+42);
  const lines=['Find the differences between the two photos.','Touch a difference on either photo to circle it.','Each find scores the clock: it counts down from 1,000.','Wrong touches cost time off the bar.',`Clear the round: every pill left pays ${RULES.pillBonus}.`,'Magnifying glasses show a difference (3 per game).','The game ends when the bar runs out.','Then pass the phone: the next player gets new photos.'];
  x.font=`bold 18px ${FONT}`;lines.forEach((l,i)=>{circle(x,bx+44,by+96+i*34,4,'#4fc43f');x.fillStyle='#24324f';x.fillText(l,bx+60,by+97+i*34);});
  x.textAlign='center';x.fillStyle='#5f6d86';x.font=`bold 15px ${FONT}`;x.fillText('Touch anywhere to continue',DW/2,by+h-18);
 }
 function drawRotate(){
  const W=s.W,H=s.H,t=performance.now()/1000;x.fillStyle='#07090f';x.fillRect(0,0,W,H);
  x.drawImage(logoImage(),W/2-Math.min(W*.9,430)/2,H*.16,Math.min(W*.9,430),Math.min(W*.9,430)*74/430);
  x.save();x.translate(W/2,H*.47);x.rotate(-Math.PI/2*Math.min(1,Math.max(0,Math.sin(t*1.6)*1.4+.3)));rr(x,-34,-58,68,116,11);x.fillStyle='#1a2236';x.fill();x.lineWidth=4;x.strokeStyle='#cfd8e6';x.stroke();x.fillStyle='#4fa6ff';x.fillRect(-26,-46,52,88);x.restore();
  x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';x.font=`bold 22px ${FONT}`;x.fillText('Turn your phone sideways',W/2,H*.68);x.font=`16px ${FONT}`;x.fillStyle='#aeb9cc';x.fillText('Photo Hunt plays in landscape,',W/2,H*.68+30);x.fillText('just like the bar cabinet.',W/2,H*.68+52);
  roundButton(x,{x:W-34,y:34,r:20},'quit');
 }
 function draw(){
  const dpr=Math.min(2,window.devicePixelRatio||1),cw=Math.round(s.W*dpr),ch=Math.round(s.H*dpr);if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}
  x.setTransform(dpr,0,0,dpr,0,0);portrait=s.H>s.W*1.02;
  if(portrait){drawRotate();return;}
  const k=Math.min(s.W/DW,s.H/DH);view={k,ox:(s.W-DW*k)/2,oy:(s.H-DH*k)/2};
  x.fillStyle='#050507';x.fillRect(0,0,s.W,s.H);
  if(view.ox>8){const g=x.createRadialGradient(s.W/2,s.H/2,DW*k*.4,s.W/2,s.H/2,s.W*.7);g.addColorStop(0,'rgba(60,40,120,.35)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,s.W,s.H);}
  x.setTransform(dpr*k,0,0,dpr*k,dpr*view.ox,dpr*view.oy);
  rr(x,-4,-4,DW+8,DH+8,14);x.fillStyle='#1b1c22';x.fill();x.save();rr(x,0,0,DW,DH,10);x.clip();drawScreen();if(help)drawHelp();x.restore();
 }
 s.frame(dt=>{update(dt);draw();refresh();});
 function refresh(){s.debug={phase,actor,round:P().round,players,regions:st?.regions||[],found:st?.found||[],left:st?.left??0,total:st?.total??0,clock:st?.clock??0,help,portrait,decks:decks.map(d=>d.map(p=>p.id)),pair:st?.spec?.pair?.id,mirror:!!st?.spec?.mirror,
  // canvas-relative CSS px of difference i on photo `side` (tests tap here)
  point:(i,side=0)=>{const v=views()?.[side],r=st?.regions[i];if(!v||!r)return null;const p=toSlot(v,r.x,r.y);return {x:view.ox+p.x*view.k,y:view.oy+p.y*view.k};},
  at:(side,u,v)=>{const w=views()?.[side];if(!w)return null;const p=toSlot(w,u,v);return {x:view.ox+p.x*view.k,y:view.oy+p.y*view.k};},
  ui:(key,i=0)=>{const b=key==='glass'?LAY.glasses[i]:LAY[key];return {x:view.ox+b.x*view.k,y:view.oy+b.y*view.k};},
  expire:()=>{if(st)st.left=.01;}};}

 const inCircle=(p,b,pad=6)=>Math.hypot(p.x-b.x,p.y-b.y)<=b.r+pad;
 s.on(c,'pointerdown',ev=>{
  if(s.paused||!s.alive)return;ev.preventDefault();const sp=s.pointer(ev);
  if(!lockTried){lockTried=true;try{const r=screen.orientation?.lock?.('landscape');r?.catch?.(()=>{});}catch{}}
  if(portrait){if(Math.hypot(sp.x-(s.W-34),sp.y-34)<30)s.manualPause();return;}
  const p={x:(sp.x-view.ox)/view.k,y:(sp.y-view.oy)/view.k};
  if(help){help=false;sfx('button');return;}
  if(inCircle(p,LAY.help)){help=true;sfx('button');return;}
  if(inCircle(p,LAY.quit)){quitGlow=1;sfx('button');s.manualPause();return;}
  const g=LAY.glasses.findIndex(q=>Math.hypot(p.x-q.x,p.y-q.y)<34);if(g>=0){useHint();return;}
  if(phase!=='hunt'||!st?.images)return;
  const side=LAY.photos.findIndex(q=>p.x>=q.x&&p.x<=q.x+q.w&&p.y>=q.y&&p.y<=q.y+q.h);if(side<0)return;
  const v=views()[side],tol=13/view.k;
  let best=-1,bestD=Infinity;st.regions.forEach((r,i)=>{const c=toSlot(v,r.x,r.y),d=Math.hypot((p.x-c.x)/(r.rx*v.w+tol),(p.y-c.y)/(r.ry*v.h+tol));if(d<=1&&d<bestD){best=i;bestD=d;}});
  if(best>=0){if(!st.found.includes(best))find(best);return;}
  st.left=Math.max(0,st.left-RULES.missPenalty);st.misses.push({side,x:p.x,y:p.y,t:0});sfx('miss');s.react(actor,'sad');
 });
 s.on(document,'keydown',ev=>{if(s.paused||!s.alive)return;if(ev.key==='h'||ev.key==='H')useHint();else if(ev.key==='?')help=!help;});

 for(let p=0;p<2;p++){
  actor=p;s.active=p;phase='wait';st=null;help=false;s.updateScores();
  const intro=p===0?`${name(0)} plays first. Find the differences between the two photos before the timer bar runs out. The game goes round after round until time runs out.`
   :`${name(1)}'s turn, with a different photo set. ${name(0)} scored ${fmt(players[0].score)} (round ${players[0].round+1}). Beat it!`;
  if(!await s.pass(p,intro,'Start Photo Hunt',{countdown:3}))return;
  await new Promise(r=>{resolveGame=r;s.cleanup(r);startGame(p);});
  if(!s.alive)return;
 }
 const scores=players.map(p=>p.score);
 s.finish(scores,`Photo Hunt · ${name(0)} ${fmt(scores[0])} (round ${players[0].round+1}) vs ${name(1)} ${fmt(scores[1])} (round ${players[1].round+1}).`);
}

Object.assign(exports,{PHOTO_SCENES,photoRound,photoHit,validPhotoPair,photohunt,PHOTO_HUNT_RULES:RULES});
