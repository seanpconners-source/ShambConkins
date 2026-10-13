const {validPhotoPair:isValidPhotoPair, photoPairLibrary, addPhotoPair, removePhotoPair, photoPairId}=require("src/photoPairs.js");
const {PHOTO_HUNT_PAIRS}=require("src/data/photoHuntPairs.js");
const {ART}=require("src/data/art.js");
const {clamp, shuffle}=require("src/utils.js");
const {circle, COLORS}=require("src/engines/session.js");
const {store}=require("src/state.js");
const {saveProfile}=require("src/profile.js");
const {sound}=require("src/audio.js");
const PHOTO_SCENES = [
 {name:'Paddy’s after hours',source:'Always Sunny',wall:'#335442',sign:'PADDY’S PUB',props:['ham','cat','beer','pool','milk','stool','jukebox','clock','poster','plant','burger','hat']},
 {name:'The Rivoli soundcheck',source:'Nirvanna the Band the Show',wall:'#543758',sign:'THE RIVOLI',props:['guitar','amp','drum','mic','record','stool','jukebox','clock','poster','plant','bass','hat']},
 {name:'The movie arcade',source:'Megatouch',wall:'#213e59',sign:'MEGATOUCH · PHOTO HUNT',props:['cabinet','frog','gak','pool','soda','stool','jukebox','clock','poster','plant','burger','hat']}
];
function photoRound(scene,random=Math.random){const changes=shuffle(Array.from({length:12},(_,i)=>i),random).slice(0,5);return {scene,changes,regions:changes.map(index=>({x:(index%4+.5)/4,y:(Math.floor(index/4)+.5)/3,r:.075,index}))};}
// r is in image-width units, so a tap's vertical offset is scaled by the image's height/width (aspect).
function photoHit(regions,p,found=[],aspect=1){return regions.findIndex((r,i)=>!found.includes(i)&&Math.hypot(p.x-r.x,(p.y-r.y)*aspect)<r.r);}
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
async function imageFrom(s,url){return new Promise((resolve,reject)=>{const img=new Image();let done=false;const end=(err)=>{if(done)return;done=true;clearTimeout(timer);img.onload=img.onerror=null;err?reject(err):resolve(img);};const timer=setTimeout(()=>end(new Error('Image took too long to load.')),8000);s.cleanup(()=>end(new Error('Game closed.')));img.onload=()=>end(img.naturalWidth?null:new Error('Empty image.'));img.onerror=()=>end(new Error('Could not read that image.'));img.src=url;});}
async function fileData(s,file){return new Promise((resolve,reject)=>{if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>850000)return reject(new Error('Use PNG, JPG or WebP images smaller than 850 KB each.'));const r=new FileReader();let done=false;const end=(err)=>{if(done)return;done=true;clearTimeout(t);r.onload=r.onerror=null;err?reject(err):resolve(r.result);};const t=setTimeout(()=>{r.abort();end(new Error('File reading timed out.'));},8000);s.cleanup(()=>{r.abort();end(new Error('Game closed.'));});r.onload=()=>end();r.onerror=()=>end(new Error('Could not read that file.'));r.readAsDataURL(file);});}

async function photohunt(s){
 const[c,x]=s.canvas(680,355,{fill:true}),panels=[{x:13,y:43,w:319,h:276},{x:348,y:43,w:319,h:276}],starter=shuffle(PHOTO_SCENES,s.random).map(scene=>photoRound(scene,s.random)),scores=[0,0];
 const bundled=PHOTO_HUNT_PAIRS.map(p=>({...p,left:ART[p.leftKey],right:ART[p.rightKey]})).filter(validPhotoPair);
 let W=680,H=355,deck=[],round=0,actor=0,found=[],clock=40,turnClock=10,phase='loading',flash=null,images=null,calibration=null,pendingLoad=false,message='',loadVersion=0,radius=.06;
 s.shared=true;s.updateScores();
 // Panels sit side by side on wide screens and stack on a portrait phone so the photos use the whole height.
 const layout=()=>{W=s.W;H=s.H;const top=36,bottom=26,g=8;if(H>W*1.05){const h=(H-top-bottom-g)/2;Object.assign(panels[0],{x:8,y:top,w:W-16,h});Object.assign(panels[1],{x:8,y:top+h+g,w:W-16,h});}else{const w=(W-8*2-g)/2,h=H-top-bottom;Object.assign(panels[0],{x:8,y:top,w,h});Object.assign(panels[1],{x:8+w+g,y:top,w,h});}};
 const pills=()=>[{id:'hint',x:6,y:6,w:92,h:25,text:'HINT −25'},{id:'photos',x:W-98,y:6,w:92,h:25,text:'PHOTOS ☰'}];
 const hint=()=>{if(phase!=='hunt')return;const target=regions().findIndex((_,i)=>!found.includes(i));if(target<0)return;scores[actor]=Math.max(0,scores[actor]-25);flash={...regions()[target],until:2,hint:true};s.setScores(scores);};
 const allPairs=()=>[...bundled,...photoPairLibrary(store.profile)];
 const currentPair=()=>deck[round]||null;
 const regions=()=>currentPair()?.regions||starter[Math.min(round,2)].regions;
 const count=()=>deck.length||3;
 // target(i): canvas point of difference i on the changed photo (tests tap it).
 const target=i=>{layout();const img=images?.[1],r=img?imageRect(img,panels[1]):panels[1],g=regions()[i];return g&&{x:r.x+g.x*r.w,y:r.y+g.y*r.h+(img?0:8)};};
 const refresh=()=>{s.debug={round,actor,phase,regions:regions(),found,panels,pair:currentPair(),clock,turnClock,roundCount:count(),library:allPairs().length,calibration,target};};
 function controls(){const root=document.getElementById('game-controls');if(root){root.innerHTML='';root.className='game-controls';}}
 function starterScenes(){loadVersion++;deck=[];images=null;round=0;found=[];clock=40;turnClock=10;phase='hunt';message='Illustrated starter scenes. Add real photo pairs from the Photos menu.';controls();}
 async function loadCurrent(){const version=++loadVersion,pair=currentPair();images=null;phase='loading';refresh();if(pair){try{const result=await Promise.all([imageFrom(s,pair.left),imageFrom(s,pair.right)]);if(version!==loadVersion||!s.alive)return;if(Math.abs(result[0].naturalWidth/result[0].naturalHeight-result[1].naturalWidth/result[1].naturalHeight)>.02)throw new Error('Photo pair proportions differ.');images=result;}catch(error){if(!s.alive)return;message=error.message+' Illustrated scenes are available.';deck=[];round=0;}}if(version===loadVersion){phase='hunt';clock=40;turnClock=10;refresh();}}
 async function startDeck(pairs){deck=pairs.filter(validPhotoPair).slice(0,3);round=0;found=[];actor=0;s.active=0;s.updateScores();await loadCurrent();controls();}
 function advance(){round++;found=[];actor=round%2;s.active=actor;s.updateScores();if(round>=count()){s.finish(scores,`Megatouch Photo Hunt · ${count()} ${deck.length?'real photo pairs':'illustrated scenes'}, two detectives.`);return;}void loadCurrent();}
 function library(){if(pendingLoad||phase==='calibrate')return;phase='library';message='Choose a saved photo pair, add another, or play a shuffled photo set.';const pairs=allPairs();s.controls([{text:'Add photo pair',click:()=>load()},{text:'Play photo set',click:()=>void startDeck(shuffle(pairs,s.random))},...pairs.flatMap((p,i)=>[{text:`Play ${p.title||'Photo pair '+(i+1)}`,click:()=>void startDeck([p])},...(bundled.some(b=>photoPairId(b)===photoPairId(p))?[]:[{text:`Remove ${p.title||'pair '+(i+1)}`,click:()=>{removePhotoPair(store.profile,photoPairId(p));saveProfile(store.profile);library();}}])]),{text:'Starter scenes',click:starterScenes},{text:'Back to hunt',click:()=>{phase='hunt';controls();}}]);if(!pairs.length)message='Send Codex an original and changed photo, plus the differences, to bundle them offline. Or tap Add photo pair and mark the changes yourself.';refresh();}
 async function load(){
  if(pendingLoad||phase==='calibrate')return;const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';input.multiple=true;input.hidden=true;s.body.appendChild(input);
  const before=phase;phase='choose-files';const cancel=()=>{phase=before;input.remove();refresh();};s.on(input,'cancel',cancel);
  s.on(input,'change',async()=>{
   if(input.files?.length!==2){message='Choose exactly two images: original first, changed version second.';cancel();return;}
   pendingLoad=true;phase='loading';
   try{const files=[...input.files],urls=await Promise.all(files.map(f=>fileData(s,f))),loaded=await Promise.all(urls.map(url=>imageFrom(s,url)));if(Math.abs(loaded[0].naturalWidth/loaded[0].naturalHeight-loaded[1].naturalWidth/loaded[1].naturalHeight)>.02)throw new Error('Use two photos with the same proportions.');if(!s.alive)return;calibration={left:urls[0],right:urls[1],regions:[],images:loaded,title:(files[0].name||'My photo pair').replace(/\.[^.]+$/,'').slice(0,100)};phase='calibrate';message='Tap each difference on the RIGHT photo. Five is classic; 1–8 are supported.';calibrationControls();}
   catch(error){message=error.message;phase=before;}finally{pendingLoad=false;input.remove();refresh();}
  });input.click();
 }
 function calibrationControls(){s.controls([{text:'Save pair & play',click:()=>{
  if(!calibration?.regions.length){message='Mark at least one difference on the right.';return;}
  const pair={left:calibration.left,right:calibration.right,regions:calibration.regions,title:calibration.title},result=addPhotoPair(store.profile,pair);if(!result.ok){message=result.message;return;}
  const persisted=saveProfile(store.profile);message=persisted?'Photo pair added to your library and save exports.':'Pair works this session. Storage is full: export your save to keep it.';
  images=calibration.images;deck=[result.pair];calibration=null;phase='hunt';round=0;actor=0;found=[];clock=40;turnClock=10;controls();refresh();
 }},{text:'Undo mark',click:()=>calibration?.regions.pop()},{text:'Swap photos',click:()=>{if(!calibration)return;[calibration.left,calibration.right]=[calibration.right,calibration.left];calibration.images.reverse();message='Photos swapped. Marks use the same positions on both sides.';}},{text:'Smaller target',click:()=>{radius=Math.max(.025,radius-.01);if(calibration?.regions.length)calibration.regions.at(-1).r=radius;}},{text:'Larger target',click:()=>{radius=Math.min(.15,radius+.01);if(calibration?.regions.length)calibration.regions.at(-1).r=radius;}},{text:'Cancel',click:()=>{calibration=null;phase='hunt';controls();}}]);}
 function imageRect(img,p){const scale=Math.min(p.w/img.naturalWidth,p.h/img.naturalHeight);return {x:p.x+(p.w-img.naturalWidth*scale)/2,y:p.y+(p.h-img.naturalHeight*scale)/2,w:img.naturalWidth*scale,h:img.naturalHeight*scale};}
 s.on(c,'pointerdown',ev=>{
  if(s.paused||!s.alive||!['hunt','calibrate'].includes(phase))return;ev.preventDefault();layout();const p=s.pointer(ev);if(phase==='hunt'){const pill=pills().find(q=>p.x>=q.x&&p.x<=q.x+q.w&&p.y>=q.y&&p.y<=q.y+q.h);if(pill){if(pill.id==='hint')hint();else library();return;}}const panel=panels.findIndex(q=>p.x>=q.x&&p.x<=q.x+q.w&&p.y>=q.y&&p.y<=q.y+q.h);if(panel<0)return;
  const img=phase==='calibrate'?calibration.images[panel]:currentPair()?images?.[panel]:null,rect=img?imageRect(img,panels[panel]):panels[panel],point={x:(p.x-rect.x)/rect.w,y:(p.y-rect.y)/rect.h};if(point.x<0||point.x>1||point.y<0||point.y>1)return;
  if(phase==='calibrate'){if(panel===1&&calibration.regions.length<8){if(calibration.regions.some(r=>Math.hypot(r.x-point.x,r.y-point.y)<.07)){message='That area is already marked.';return;}calibration.regions.push({...point,r:radius});message=`${calibration.regions.length} differences marked. Save & play when ready.`;}refresh();return;}
  if(!img)point.y-=8/rect.h;const aspect=rect.h/rect.w,hit=photoHit(regions(),point,found,img?aspect:1);
  if(hit>=0){found.push(hit);scores[actor]+=100;s.react?.(actor,'happy');sound('win');message=`${s.players[actor].name} found one!`;if(found.length===regions().length){scores[actor]+=Math.ceil(clock)*2;phase='reveal';clock=2;message='All differences found! Time bonus awarded.';}}
  else if(regions().some((r,i)=>found.includes(i)&&Math.hypot(point.x-r.x,(point.y-r.y)*(img?aspect:1))<r.r)){message='Already found. Try another detail.';return;}
  else{scores[actor]=Math.max(0,scores[actor]-20);clock-=3;s.react?.(actor,'sad');sound('lose');message='Miss: −20 and −3 seconds.';flash={...point,until:.45,miss:true};}
  actor=1-actor;s.active=actor;turnClock=10;s.setScores(scores);s.updateScores();refresh();
 });
 s.frame(dt=>{
  layout();
  if(flash){flash.until-=dt;if(flash.until<=0)flash=null;}
  if(phase==='hunt'){clock-=dt;turnClock-=dt;if(turnClock<=0){actor=1-actor;s.active=actor;s.updateScores();turnClock=10;}if(clock<=0){phase='reveal';clock=2;message='Time! Here are the remaining differences.';}}
  else if(phase==='reveal'){clock-=dt;if(clock<=0)advance();}
  if(!s.alive)return;
  const custom=phase==='calibrate'?calibration:currentPair(),loaded=phase==='calibrate'?calibration.images:images;
  x.fillStyle='#121e32';x.fillRect(0,0,W,H);x.font='bold 16px Arial';x.textAlign='center';x.fillStyle='#f4d79b';x.fillText(custom?custom.title||'YOUR PHOTO HUNT':starter[Math.min(round,2)].scene.name.toUpperCase(),W/2,24,W-210);if(phase==='hunt'){for(const q of pills()){x.fillStyle='#2b3d5c';x.fillRect(q.x,q.y,q.w,q.h);x.strokeStyle='#f4d79b88';x.lineWidth=1.5;x.strokeRect(q.x,q.y,q.w,q.h);x.fillStyle='#f4d79b';x.font='bold 12px Arial';x.fillText(q.text,q.x+q.w/2,q.y+17);}x.font='bold 16px Arial';}
  for(let i=0;i<2;i++){
   const p=panels[i];if(custom&&loaded){x.fillStyle='#080f1b';x.fillRect(p.x,p.y,p.w,p.h);const r=imageRect(loaded[i],p);x.drawImage(loaded[i],r.x,r.y,r.w,r.h);}else sceneDraw(x,starter[Math.min(round,2)].scene,starter[Math.min(round,2)].changes,i===1,p);
   const marks=phase==='calibrate'?calibration.regions:regions(),rect=custom&&loaded?imageRect(loaded[i],p):p;
   for(let j=0;j<marks.length;j++)if(phase==='calibrate'||found.includes(j)||phase==='reveal'){const r=marks[j];x.strokeStyle=found.includes(j)?'#80efb4':'#ffe497';x.lineWidth=3;x.beginPath();x.arc(rect.x+r.x*rect.w,rect.y+r.y*rect.h+(custom?0:8),r.r*rect.w,0,Math.PI*2);x.stroke();}
   if(flash){x.strokeStyle=flash.miss?'#ff6c80':'#fff29b';x.lineWidth=3;x.beginPath();x.arc(rect.x+flash.x*rect.w,rect.y+flash.y*rect.h+(custom?0:8),22,0,Math.PI*2);x.stroke();}
  }
  s.sprite(x,0,27,H-14,27,{exact:true,mood:actor===0?'thinking':'normal'});s.sprite(x,1,W-27,H-14,27,{exact:true,mood:actor===1?'thinking':'normal'});x.fillStyle='#f1d6a5';x.font='12px Arial';x.textAlign='center';x.fillText(message||`Find all ${regions().length} differences before time runs out.`,W/2,H-8,W-80);
  s.status(phase==='hunt'?`Pair ${round+1}/${count()} · ${s.players[actor].name} guesses · ${Math.ceil(clock)}s · ${found.length}/${regions().length} found`:message||'Loading local photos…');refresh();
 });
 await startDeck(shuffle(allPairs(),s.random));
 s.hint('Both players compare the SAME photos and alternate guesses. Add pairs to Photo library, then mark the differences on the right. Send paired images to Codex to include them in the offline game.');
 await s.pass(0,`Megatouch Photo Hunt. ${deck.length?'Photo pairs are ready.':'Illustrated practice scenes are ready; Photo library accepts real pairs.'} Both players compare the same pictures and take turns finding the differences. +100 per find; a miss costs 20 points and three seconds.`);
}

Object.assign(exports,{PHOTO_SCENES,photoRound,photoHit,validPhotoPair,photohunt});