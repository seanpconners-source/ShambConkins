// THE WARRIORS (Double Dragon style): missions. Every mission is one of the game's LOCATIONS: its gangs wear the faces of
// that place's characters, its boss is one of them (a locked one when there is one: beat them and they join you), and the
// scenery comes from the place's biome (src/biomes.js: city, forest, desert, graveyard, space...). Built from the run's
// seed and the mission number only, so both players (and both phones online) fight the same thing.
const {seededRandom,clamp}=require("src/utils.js");
const DS=require("src/data/ddSprites.js");
const DEPTH=80;
// enemy archetypes (Double Dragon roles, our own gangs): hp, speed, what they do
const FOES={
 thug:{hp:9,sp:52,moves:['jab','cross','hook','kick'],pts:200,o:'thug',name:'Street thug'},
 bat:{hp:10,sp:48,moves:['swing'],weapon:'bat',pts:250,o:'bat',name:'Slugger'},
 whip:{hp:9,sp:62,moves:['whip','kick'],weapon:'whip',pts:250,o:'whip',name:'Whip'},
 knife:{hp:8,sp:58,moves:['jab','toss'],weapon:'knife',pts:250,o:'knife',name:'Knife thrower'},
 kicker:{hp:14,sp:74,moves:['kick','jkick','cross','hook'],pts:400,o:'kicker',name:'Black belt'},
 brute:{hp:28,sp:40,moves:['hook','ebash','bgrab'],pts:800,o:'brute',big:1.28,noGrab:true,name:'Bruiser'}};
// biome look for the drawn scenery (until GPT's stage art is in): sky, far shapes, wall, floor
const LOOK={
 nyc:{sky:['#1c2438','#5c6c8c'],far:'#2c3448',wall:'#6c5c50',trim:'#3c3028',floor:'#5c5c64',line:'#4c4c54',far2:'tower',wall2:'brick'},
 gotham:{sky:['#0c0c18','#2c2c44'],far:'#14141c',wall:'#3c3c44',trim:'#1c1c24',floor:'#34343c',line:'#24242c',far2:'tower',wall2:'brick'},
 suburb:{sky:['#7cb8e8','#d8ecf8'],far:'#8cac7c',wall:'#c8b89c',trim:'#8c7c64',floor:'#8c8c8c',line:'#7c7c7c',far2:'house',wall2:'fence'},
 forest:{sky:['#4c8cb8','#b8dcd0'],far:'#2c5c3c',wall:'#3c6c34',trim:'#2c4c24',floor:'#6c5434',line:'#5c4428',far2:'trees',wall2:'hedge'},
 jungle:{sky:['#3c8c6c','#b8e8a8'],far:'#1c4c2c',wall:'#2c6c2c',trim:'#1c4c1c',floor:'#5c4c2c',line:'#4c3c1c',far2:'trees',wall2:'hedge'},
 beach:{sky:['#4cb8e8','#e8f8f8'],far:'#2c8cb8',wall:'#d8c898',trim:'#b8a878',floor:'#e8d8a8',line:'#d8c898',far2:'sea',wall2:'fence'},
 desert:{sky:['#e8984c','#f8e0a8'],far:'#b86c3c',wall:'#c89c6c',trim:'#9c6c3c',floor:'#d8b07c',line:'#c89c6c',far2:'mesa',wall2:'adobe'},
 snow:{sky:['#9cc8e8','#f0f8ff'],far:'#c8dcf0',wall:'#d8e4f0',trim:'#9cb4cc',floor:'#f0f4f8',line:'#d0dce8',far2:'peaks',wall2:'ice'},
 graveyard:{sky:['#141428','#3c3c5c'],far:'#1c1c2c',wall:'#3c3c4c',trim:'#24242c',floor:'#2c3424',line:'#1c241c',far2:'graves',wall2:'iron'},
 gothic:{sky:['#1c0c1c','#4c1c2c'],far:'#2c1424',wall:'#4c3c44',trim:'#2c1c24',floor:'#3c343c',line:'#2c242c',far2:'castle',wall2:'stone'},
 lava:{sky:['#2c0404','#8c2c0c'],far:'#3c0c04',wall:'#4c2c24',trim:'#2c140c',floor:'#3c2c24',line:'#ff5c1c',far2:'spires',wall2:'stone'},
 space:{sky:['#04040c','#14143c'],far:'#2c2c5c',wall:'#5c6478',trim:'#3c4458',floor:'#4c5468',line:'#6cc8f8',far2:'stars',wall2:'panel'},
 digital:{sky:['#020814','#0c2c3c'],far:'#0c3c4c',wall:'#0c1c2c',trim:'#1cf8f8',floor:'#081420',line:'#1cc8f8',far2:'grid',wall2:'panel'},
 themepark:{sky:['#5cb8f8','#f8d8e8'],far:'#e85c8c',wall:'#f8d84c',trim:'#e83c3c',floor:'#b89c7c',line:'#a88c6c',far2:'rides',wall2:'fence'},
 funhouse:{sky:['#7c3cc8','#f87cc8'],far:'#f8a83c',wall:'#3cc87c',trim:'#f83c8c',floor:'#f8e85c',line:'#e8c83c',far2:'rides',wall2:'panel'},
 stage:{sky:['#0c0414','#2c0c3c'],far:'#1c0c2c',wall:'#2c1c34',trim:'#c83cf8',floor:'#2c2c34',line:'#c83cf8',far2:'lights',wall2:'amps'},
 mountains:{sky:['#5c9ce8','#d8ecf8'],far:'#7c8cac',wall:'#a8946c',trim:'#7c6c4c',floor:'#a8946c',line:'#8c7c5c',far2:'peaks',wall2:'stone'},
 countryside:{sky:['#7cb8e8','#e8f4f8'],far:'#7cac5c',wall:'#9c7c54',trim:'#6c543c',floor:'#7c9c4c',line:'#6c8c3c',far2:'hills',wall2:'fence'}};
// the mission list for a run: locations with at least 3 characters that have their own pictures, shuffled by the seed
let POOL=null;
function pool(){if(POOL)return POOL;let L=[],C=[],art=()=>false,biomeFor=()=>'nyc';
 try{L=require("src/locations.js").LOCATIONS;C=require("src/characters.js").CHARACTERS;const {portraitURL}=require("src/assets.js"),{isRasterArt}=require("src/data/userPortraits.js");art=id=>{try{return isRasterArt(portraitURL(id,'normal'));}catch{return false;}};biomeFor=require("src/biomes.js").biomeFor;}catch{}
 const ids=new Set(C.map(c=>c.id));
 POOL=L.map(l=>{const cast=[...new Set([...(l.characters||[]),...C.filter(c=>c.source===l.source).map(c=>c.id)])].filter(id=>ids.has(id)&&art(id));
  let b='nyc';try{b=biomeFor(l,l.scene||l.kind);}catch{}return {id:l.id,name:l.name,source:l.source,icon:l.icon,biome:LOOK[b]?b:'nyc',cast};}).filter(m=>m.cast.length>=3);
 if(!POOL.length)POOL=[{id:'streets',name:'The Streets',source:'The Warriors',biome:'nyc',cast:[]}];
 return POOL;}
function missions(seed,n=60){const r=seededRandom(seed+':ww-missions'),P=[...pool()].sort((a,b)=>a.id<b.id?-1:1);
 // shuffle, then spread biomes so two missions in a row never share one
 for(let i=P.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[P[i],P[j]]=[P[j],P[i]];}
 const out=[];const left=[...P];while(out.length<Math.min(n,P.length)){const prev=out[out.length-1];let k=left.findIndex(m=>!prev||m.biome!==prev.biome);if(k<0)k=0;out.push(left.splice(k,1)[0]);}
 return out;}
// one mission: waves along the street, then the boss. n = mission number (0-based), bossPool = locked character ids
function buildStage(m,n,seed,bossPool=[]){const r=seededRandom(seed+':ww-stage:'+n+':'+m.id),pick=a=>a[Math.floor(r()*a.length)];
 const lv=Math.min(1,n/9),nw=3+Math.min(2,Math.floor(n/3)),len=420+nw*300+360;
 const types=n<1?['thug','thug','bat']:n<2?['thug','bat','whip','thug']:n<4?['thug','bat','whip','knife','kicker']:['thug','bat','whip','knife','kicker','kicker'];
 const faces=[...m.cast],face=()=>faces.length?pick(faces):null;
 const waves=[];for(let w=0;w<nw;w++){const at=300+w*300,cnt=clamp(2+Math.floor(n/2)+(w===nw-1?1:0)+Math.floor(r()*2),2,6),list=[];
  for(let i=0;i<cnt;i++){let t=pick(types);if(w===nw-1&&i===0&&n>=1)t='brute';if(w>=1&&n>=3&&r()<.15)t='brute';
   list.push({type:t,face:face(),side:i%2?-1:1,delay:i*.9+r()*.6,d:r()*DEPTH});}
  waves.push({at,list,max:2+Math.min(2,Math.floor(n/3))});}
 // boss: a location character (a locked one if any), a big fighter with every move
 const locked=m.cast.filter(id=>bossPool.includes(id)),bossFace=locked.length?pick(locked):face();
 const boss={type:'boss',face:bossFace,unlock:locked.includes(bossFace),at:len-260,hp:42+n*7,minions:n>=2?2:1};
 // ground pickups: weapons and food, a few barrels/crates to throw (some hide food)
 const items=[];for(let i=0;i<2+Math.floor(r()*3);i++)items.push({x:200+r()*(len-500),d:8+r()*(DEPTH-16),kind:pick(['bat','pipe','chain','knife','rock'])});
 const props=[];for(let i=0;i<2+Math.floor(r()*3);i++)props.push({x:260+r()*(len-560),d:6+r()*(DEPTH-12),kind:pick(['barrel','crate']),hides:r()<.5?pick(['chicken','burger','pizza']):null});
 // holes in the street (Double Dragon pits): thrown or knocked into one = gone; from mission 3 in some biomes
 const pits=[];if(n>=2&&['lava','gothic','mountains','digital','space','graveyard','nyc','gotham'].includes(m.biome)&&r()<.7){const px=360+Math.floor(r()*(nw-1))*300+120;pits.push([px,px+64]);}
 return {id:m.id,name:m.name,source:m.source,biome:m.biome,icon:m.icon,n,len,waves,boss,items,props,pits,lv,cast:m.cast};}
// ---- drawn scenery (fallback when the stage has no pictures): sky, far shapes, the back wall, the floor
function hash(n){n=(n^61)^(n>>>16);n=n+(n<<3);n=n^(n>>>4);n=Math.imul(n,0x27d4eb2d);return ((n^(n>>>15))>>>0)/4294967296;}
// g in world units (x = world x - camera), wall from y 0 to BACK, floor BACK..BACK+DEPTH+front
function drawScenery(g,st,camX,vw,BACK,FRONT,t){const L=LOOK[st.biome]||LOOK.nyc,b=st.biome;
 const far=DS.picture('far-'+b),wall=DS.picture('wall-'+b),floor=DS.picture('floor-'+b);
 // far layer (slow parallax)
 if(far){const h=BACK*.78,w=h*far.width/far.height,o=((camX*.25)%w+w)%w;for(let X=-o;X<vw;X+=w)g.drawImage(far,X,0,w+1,h);}
 else{const gr=g.createLinearGradient(0,0,0,BACK);gr.addColorStop(0,L.sky[0]);gr.addColorStop(1,L.sky[1]);g.fillStyle=gr;g.fillRect(0,-400,vw,BACK+400);
  const sp=90,o=camX*.25;for(let i=Math.floor(o/sp)-1;i<=Math.ceil((o+vw)/sp)+1;i++){const X=i*sp-o,h0=hash(i*7+3);g.fillStyle=L.far;
   const kind=L.far2;if(kind==='tower'){const h=60+h0*70;g.fillRect(X,BACK*.78-h,58,h);g.fillStyle='rgba(255,220,120,.35)';for(let y=BACK*.78-h+8;y<BACK*.78-6;y+=12)for(let k=0;k<3;k++)if(hash(i*31+y+k)<.45)g.fillRect(X+8+k*16,y,7,6);}
   else if(kind==='trees'){g.beginPath();g.arc(X+40,BACK*.74,30+h0*22,Math.PI,0);g.fill();g.fillRect(X+36,BACK*.7,8,30);}
   else if(kind==='mesa'){g.beginPath();g.moveTo(X,BACK*.78);g.lineTo(X+14,BACK*.78-30-h0*30);g.lineTo(X+70,BACK*.78-30-h0*30);g.lineTo(X+84,BACK*.78);g.fill();}
   else if(kind==='peaks'||kind==='spires'){g.beginPath();g.moveTo(X,BACK*.78);g.lineTo(X+45,BACK*.78-50-h0*60);g.lineTo(X+90,BACK*.78);g.fill();if(kind==='peaks'){g.fillStyle='#fff';g.beginPath();g.moveTo(X+33,BACK*.78-38-h0*45);g.lineTo(X+45,BACK*.78-50-h0*60);g.lineTo(X+57,BACK*.78-38-h0*45);g.fill();}}
   else if(kind==='graves'){g.fillRect(X+20,BACK*.7,16,20);g.beginPath();g.arc(X+28,BACK*.7,8,Math.PI,0);g.fill();}
   else if(kind==='castle'){const h=50+h0*60;g.fillRect(X,BACK*.78-h,40,h);for(let k=0;k<4;k++)g.fillRect(X+k*11,BACK*.78-h-8,6,8);}
   else if(kind==='stars'){g.fillStyle='#fff';for(let k=0;k<4;k++)g.fillRect(X+hash(i*5+k)*sp,hash(i*9+k)*BACK*.7,1.5,1.5);}
   else if(kind==='grid'){g.strokeStyle=L.trim;g.globalAlpha=.4;g.beginPath();g.moveTo(X,0);g.lineTo(X,BACK);g.stroke();g.globalAlpha=1;}
   else if(kind==='sea'){g.fillRect(X,BACK*.62,sp+1,BACK*.2);}
   else if(kind==='rides'){g.strokeStyle=L.far;g.lineWidth=3;g.beginPath();g.arc(X+45,BACK*.55,28,0,7);g.stroke();}
   else if(kind==='lights'){g.fillStyle=`hsla(${(i*60+t*40)%360},90%,60%,.35)`;g.beginPath();g.moveTo(X+45,0);g.lineTo(X+15,BACK);g.lineTo(X+75,BACK);g.fill();}
   else{g.beginPath();g.arc(X+45,BACK*.8,40+h0*20,Math.PI,0);g.fill();}}}
 // back wall (scrolls with the street)
 const wy=BACK*.62;
 if(wall){const h=BACK-wy,w=h*wall.width/wall.height,o=((camX%w)+w)%w;for(let X=-o;X<vw;X+=w)g.drawImage(wall,X,wy,w+1,h);}
 else{g.fillStyle=L.wall;g.fillRect(0,wy,vw,BACK-wy);g.fillStyle=L.trim;g.fillRect(0,wy,vw,4);g.fillRect(0,BACK-5,vw,5);
  const sp=40,o=camX;for(let i=Math.floor(o/sp)-1;i<=Math.ceil((o+vw)/sp)+1;i++){const X=i*sp-o;g.globalAlpha=.25;g.fillStyle=L.trim;
   if(L.wall2==='brick'||L.wall2==='stone'){for(let y=wy+8;y<BACK-6;y+=10)g.fillRect(X+((y/10|0)%2)*20,y,1.5,10);g.fillRect(X,wy+8,sp,1.2);}
   else if(L.wall2==='fence'||L.wall2==='iron'){g.fillRect(X+4,wy+6,4,BACK-wy-10);}
   else if(L.wall2==='panel'||L.wall2==='amps'){g.strokeStyle=L.trim;g.strokeRect(X+3,wy+8,sp-6,BACK-wy-16);}
   else g.fillRect(X,wy+10+hash(i)*10,sp*.6,3);
   g.globalAlpha=1;}}
 // floor band
 if(floor){const h=FRONT-BACK,w=h*floor.width/floor.height,o=((camX%w)+w)%w;for(let X=-o;X<vw;X+=w)g.drawImage(floor,X,BACK,w+1,h);}
 else{const gr=g.createLinearGradient(0,BACK,0,FRONT);gr.addColorStop(0,L.floor);gr.addColorStop(1,shadeHex(L.floor,-.25));g.fillStyle=gr;g.fillRect(0,BACK,vw,FRONT-BACK+200);
  g.strokeStyle=L.line;g.lineWidth=1.2;g.globalAlpha=.55;for(let y=BACK+12;y<FRONT;y+=16){g.beginPath();g.moveTo(0,y);g.lineTo(vw,y);g.stroke();}
  const sp=64,o=camX;for(let i=Math.floor(o/sp)-1;i<=Math.ceil((o+vw)/sp)+1;i++){const X=i*sp-o;g.beginPath();g.moveTo(X,BACK);g.lineTo(X-26,FRONT);g.stroke();}g.globalAlpha=1;}
 // pits: black holes through the whole floor band with a lip
 for(const [a,bb] of st.pits){const X0=a-camX,X1=bb-camX;if(X1<-20||X0>vw+20)continue;g.fillStyle='#050505';g.beginPath();g.moveTo(X0,BACK);g.lineTo(X1,BACK);g.lineTo(X1-20,FRONT);g.lineTo(X0-20,FRONT);g.fill();
  g.fillStyle=st.biome==='lava'?'#ff5c1c':'rgba(255,255,255,.18)';g.fillRect(X0,BACK,X1-X0,2);}}
function shadeHex(hex,k){const n=parseInt(hex.slice(1),16),f=c=>Math.max(0,Math.min(255,Math.round(c*(1+k))));return `rgb(${f(n>>16)},${f((n>>8)&255)},${f(n&255)})`;}
Object.assign(exports,{FOES,LOOK,DEPTH,missions,buildStage,drawScenery,pool});
