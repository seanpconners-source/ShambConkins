// Angry Heads stages (plain data, no browser): endless, like the real game. Every location in the game is an episode of
// five levels; level n (0-based, across all episodes) is built from its number alone, so both players (and both phones
// online) get exactly the same forts. Units: 1 unit = one block's short side; x right from the slingshot, y up from the
// ground. Bodies: block {mat wood|glass|stone|ice, x,y (centre), w,h}, pig {x,y,r,char,armor 0..2,king}, tnt {x,y,s},
// bonus {x,y,r,item} (a game item hidden in the fort: pop it for points), terrain {x,y,w,h} (solid ground that never moves).
const {seededRandom}=require("src/utils.js");
const LEVELS_PER_EPISODE=5;
const MAT={wood:{hp:3.4,density:.9,score:500},glass:{hp:1.3,density:.6,score:500},stone:{hp:9,density:2.4,score:1000},ice:{hp:1.8,density:.7,score:500}};
const PLANK=.42;

function buildLevel(n,{pigs=['pig'],items=[],abilities=null}={}){
 const r=seededRandom('angry-heads:'+n),ep=Math.floor(n/LEVELS_PER_EPISODE),k=n%LEVELS_PER_EPISODE,boss=k===LEVELS_PER_EPISODE-1;
 // difficulty grows level by level and keeps growing: more pieces, taller, more stone, more helmets, further away
 const d=n,stoneP=Math.min(.55,.06+d*.012),glassP=.22,armorP=Math.min(.6,d*.025),floorsMax=Math.min(5,2+Math.floor(d/7));
 const B=[];let pigN=0,bonusDone=false;
 const pick=a=>a[Math.floor(r()*a.length)];
 const mat=(bias=0)=>{const v=r();return v<stoneP+bias?'stone':v<stoneP+bias+glassP?'glass':ep%7===5&&v<.85?'ice':'wood';};
 const block=(x,y,w,h,m)=>B.push({kind:'block',mat:m,x,y,w,h});
 const col=(x,base,h,m)=>block(x,base+h/2,PLANK,h,m),plank=(x,y,w,m)=>block(x,y+PLANK/2,w,PLANK,m),sq=(x,y,s,m)=>block(x,y+s/2,s,s,m);
 const pig=(x,y,rr=.55)=>{const armor=r()<armorP?1+(r()<armorP*.5?1:0):0;B.push({kind:'pig',x,y:y+rr,r:rr,char:pigs[pigN++%pigs.length],armor});};
 const tnt=(x,y)=>B.push({kind:'tnt',x,y:y+.6,s:1.2});
 const bonus=(x,y)=>{if(bonusDone||!items.length)return;bonusDone=true;B.push({kind:'bonus',x,y:y+.5,r:.5,item:items[Math.floor(r()*items.length)]});};
 // ---- the fort's pieces; each returns its width
 const M={
  // floors of columns and planks, a head on every floor
  tower(x,base){const f=1+Math.floor(r()*floorsMax),w=2.6+Math.floor(r()*3)*.9,m=mat();let y=base;
   for(let i=0;i<f;i++){const h=2.1+r()*.5;col(x-w/2+.25,y,h,m);col(x+w/2-.25,y,h,m);if(w>4)col(x,y,h,m);if(i===0||r()<.6)pig(x+(w>4?-w/4:0),y,.5);else if(r()<.4)bonus(x,y);plank(x,y+h,w+.5,i===f-1&&r()<.5?'glass':m);y+=h+PLANK;}
   if(r()<.5){sq(x-.5,y,1,'glass');sq(x+.5,y,1,'glass');}else pig(x,y,.5);return w+1;},
  // a pyramid of square blocks, a head on top and one in a gap inside
  pyramid(x,base){const n=3+Math.floor(r()*Math.min(3,1+d/8)),s=1,m=mat(.05);for(let row=0;row<n;row++)for(let c=0;c<n-row;c++){const cx=x+(c-(n-row-1)/2)*s;if(row===0&&n>3&&c===Math.floor((n-1)/2)){pig(cx,base,.42);continue;}sq(cx,base+row*s,s,row===n-1?'glass':m);}
   pig(x,base+n*s,.55);return n*s+1;},
  // a little house: two walls, glass windows, a roof of planks, the head inside
  house(x,base){const w=3.4,h=2.4,m=mat();col(x-w/2+.25,base,h,m);col(x+w/2-.25,base,h,m);pig(x,base,.6);plank(x,base+h,w+.6,m);sq(x-1,base+h+PLANK,1,'glass');sq(x+1,base+h+PLANK,1,'glass');plank(x,base+h+PLANK+1,w,m);
   if(r()<.5)pig(x,base+h+PLANK*2+1,.45);else bonus(x,base+h+PLANK*2+1);return w+1.2;},
  // a bridge between two stone pillars with heads on top
  bridge(x,base){const w=5+Math.floor(r()*3),ph=1+Math.floor(r()*3);for(let i=0;i<ph;i++){sq(x-w/2+.5,base+i,1,'stone');sq(x+w/2-.5,base+i,1,'stone');}
   plank(x,base+ph,w+.4,mat());pig(x-1.2,base+ph+PLANK,.5);pig(x+1.2,base+ph+PLANK,.5);if(r()<.6)pig(x,base,.5);else bonus(x,base);return w+1;},
  // a stone bunker round a helmeted head
  bunker(x,base){const m=r()<.5?'stone':mat(.2);sq(x-1.3,base,1,m);sq(x+1.3,base,1,m);sq(x-1.3,base+1,1,m);sq(x+1.3,base+1,1,m);B.push({kind:'pig',x,y:base+.6,r:.6,char:pigs[pigN++%pigs.length],armor:Math.min(2,1+(d>14?1:0))});
   plank(x,base+2,3.8,m);sq(x,base+2+PLANK,1,'glass');return 4.6;},
  // a stack of crates with TNT in it
  crates(x,base){const n=2+Math.floor(r()*2);for(let row=0;row<n;row++)for(let c=0;c<n-(row>0?1:0);c++){const cx=x+(c-(n-(row>0?1:0)-1)/2)*1.05;if(row===0&&c===1)tnt(cx,base);else sq(cx,base+row*1.02,1,row?'wood':mat());}
   pig(x,base+n*1.02,.5);return n*1.05+1.2;},
 };
 const kinds=d<2?['tower','house']:d<5?['tower','house','pyramid','crates']:['tower','house','pyramid','crates','bridge','bunker'];
 // the boss level of every episode: a castle round the big head (the location's main character, with a crown)
 let x=21+Math.min(14,d*.35)+r()*3;const pieces=boss?2+Math.min(2,Math.floor(d/10)):1+Math.min(3,Math.floor(d/6))+(r()<.4?1:0);
 // raised ground (a hill the fort stands on) from the third episode on
 const hill=ep>=2&&r()<.5?1+Math.floor(r()*Math.min(3,ep/2)):0;
 if(hill){const hw=16+pieces*5;B.push({kind:'terrain',x:x-1+hw/2,y:hill/2,w:hw,h:hill});}
 for(let i=0;i<pieces;i++){const kd=i===0&&d<1?'tower':pick(kinds),wd=M[kd](x+2,hill);x+=wd+1+r()*1.5;}
 if(boss){const m='stone',cx=x+3,base=hill;col(cx-2.2,base,3.2,m);col(cx+2.2,base,3.2,m);B.push({kind:'pig',x:cx,y:base+1,r:1,char:pigs[0],armor:Math.min(2,ep>1?1:0),king:true});plank(cx,base+3.2,5.4,m);sq(cx-1.6,base+3.2+PLANK,1,'glass');sq(cx+1.6,base+3.2+PLANK,1,'glass');plank(cx,base+4.2+PLANK,5,m);x+=7;}
 if(!B.some(b=>b.kind==='pig'))pig(x,0,.6);
 const nPigs=B.filter(b=>b.kind==='pig').length;
 // birds: three to six, about three for every four heads (one spare early on): a good shot pops several; special birds (game items with a power) from level 3
 const nBirds=Math.min(6,Math.max(3,Math.ceil(nPigs*(d<10?.75:.65))+(d<10?1:0)));
 const ABIL=abilities||['split','boost','bomb','egg','big'];
 const birds=Array.from({length:nBirds},(_,i)=>i>0&&d>=3&&(i===1||d>=10&&i===nBirds-1)&&items.length?{kind:'item',item:items[(n*7+i)%items.length],ability:ABIL[(n+i*3)%ABIL.length]}:{kind:'head'});
 const blockScore=B.filter(b=>b.kind==='block').reduce((t,b)=>t+MAT[b.mat].score,0),pigScore=nPigs*5000;
 const stars=[pigScore,Math.round((pigScore+blockScore*.35+10000)/1000)*1000,Math.round((pigScore+blockScore*.6+10000*Math.max(1,nBirds-nPigs))/1000)*1000];
 return {n,episode:ep,level:k,boss,bodies:B,birds,stars,width:x+6,hill};
}
Object.assign(exports,{buildLevel,MAT,LEVELS_PER_EPISODE,PLANK});
