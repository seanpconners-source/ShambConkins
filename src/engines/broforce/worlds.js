// Sean of a Gun (src/engines/broforce.js): the four NEW worlds (owner, Nov 14: "space, hell, another dimension, worlds from
// other games... not just straight lines... intricate levels with new mini bosses and end level bosses"). The first four
// worlds (jungle, factory, city, desert) are untouched; these themes carry `ext:true` and build their stages here.
// Every stage ends in a boss: stages 1 and 2 a mini-boss, stage 3 the world's end boss, then the chopper.
// The builder returns the same shape as buildStage in broforce.js (tiles, back walls, foes, cage slots, decor, flags,
// spawn, boss, arena, exit) plus `portals`, `haz` (fire bars, geysers) and `rings`.
// Layout pieces go up and down the whole 34-row map: towers with rooms on three floors, split routes (a catwalk over a
// lava trench or a tunnel under it), deep shafts, floating islands over lava or the void, carved mazes, walls topped with
// turrets, warp portals, jump pads, pipes, ? blocks and block staircases.
const THEMES_EXT={
 'broforce-space':{name:'SPACE',op:'OPERATION STAR BRO',ext:true,stages:['MOON BASE ALPHA','ORBITAL STATION','THE ALIEN HIVE'],
  sky:['#03040c','#1c1450'],far:'#2b2850',mid:'#141230',haze:'#6a4ac0',dirt:['#8d8d99','#777784','#a0a0ac'],top:'#cfd0dc',topDark:'#90909c',
  brick:['#5c6c7e','#3d4958'],wood:'#6e7e90',rock:['#5a5a68','#3c3c48'],cave:'#0b0b18',interior:'#18202e',decor:'space',grav:.55,liquid:'acid',
  stagePal:[{},{dirt:['#5c6c7e','#4d5b6b','#6a7a8c'],top:'#9aa8b8',topDark:'#5c6a7a',cave:'#101826',sky:['#000006','#0a1030']},{dirt:['#5a3a5e','#4a2c4e','#6a4870'],top:'#9a5aa0',topDark:'#5a2a60',cave:'#1a0a1e',rock:['#4a2a50','#301a36'],sky:['#0a0010','#3a0a40']}],
  foes:[{grunt:['robot','robot','alien'],heavy:['mechtank'],fly:['drone'],special:['turret']},{grunt:['robot','alien','xeno'],heavy:['mechtank'],fly:['drone'],special:['turret']},{grunt:['alien','xeno','alien'],heavy:['xeno'],fly:['drone'],special:['alien']}],
  bosses:['warmech','saucer','queen'],weapons:['laser','plasma','railgun','pulse','rifle','minigun'],
  pools:[['ridge','citadel','islands','split','tankyard','turretwall','airlock'],['airlock','maze','split','shaft','citadel','turretwall','islands'],['maze','shaft','islands','maze','split','ridge','shaft']]},
 'broforce-hell':{name:'HELL',op:'OPERATION HIGHWAY TO HELL',ext:true,stages:['GATES OF HELL','RIVER STYX','THRONE OF THE BEAST'],
  sky:['#1a0202','#a8300c'],far:'#4a0c08',mid:'#240504',haze:'#ff6a20',dirt:['#5a2a20','#4a2018','#6a3428'],top:'#3a1a14',topDark:'#1a0a08',
  brick:['#6a3a34','#4a2420'],wood:'#5a3a2a',rock:['#3a2a2a','#241818'],cave:'#120404',interior:'#2a0e0a',decor:'hell',liquid:'lava',
  stagePal:[{},{sky:['#060a14','#3a1a40'],dirt:['#3a3040','#2c2432','#4a3e50'],top:'#5a4a66',topDark:'#2a2032',cave:'#0a0610'},{sky:['#2a0000','#ff5a10'],dirt:['#6a1a10','#58140c','#7a2414'],top:'#2a0806',topDark:'#100202'}],
  foes:[{grunt:['cultist','skeleton','imp'],heavy:['demon'],fly:['imp'],special:['hellhound']},{grunt:['skeleton','skeleton','cultist'],heavy:['demon'],fly:['imp'],special:['hellhound']},{grunt:['cultist','demon','skeleton'],heavy:['chariot'],fly:['imp'],special:['hellhound']}],
  bosses:['cerberus','bonedragon','beast'],weapons:['flame','shotgun','holy','minigun','lightning','rocket'],
  pools:[['ridge','bonebridge','citadel','geysers','split','islands','turretwall'],['bonebridge','islands','shaft','geysers','maze','split','bonebridge'],['citadel','geysers','islands','split','tankyard','maze','bonebridge']]},
 'broforce-dimension':{name:'UPSIDE DOWN',op:'OPERATION OTHER SIDE',ext:true,stages:['THE VOID','PORTAL STORM','SHADOW CORE'],
  sky:['#05030c','#2a1a3a'],far:'#2a1a40',mid:'#120a1e',haze:'#7a3aa0',dirt:['#3a3048','#2c2438','#4a3e5a'],top:'#6a5a80',topDark:'#2a2038',
  brick:['#4a3a5e','#30243e'],wood:'#4a3a4a',rock:['#2a2236','#1a1424'],cave:'#08040e',interior:'#160e22',decor:'dimension',grav:.8,liquid:'void',
  stagePal:[{},{sky:['#000814','#1a3a5a'],dirt:['#2a3a50','#22304a','#34465e'],top:'#5a8ab0',topDark:'#203a5a'},{sky:['#000000','#3a0a20'],dirt:['#1a1a22','#141418','#26262e'],top:'#a02a4a',topDark:'#400a1a'}],
  foes:[{grunt:['crawler','shade','crawler'],heavy:['tentacle'],fly:['spore'],special:['eyeball']},{grunt:['shade','crawler','eyeball'],heavy:['tentacle'],fly:['spore'],special:['eyeball']},{grunt:['shade','shade','crawler'],heavy:['tentacle'],fly:['eyeball'],special:['spore']}],
  bosses:['flower','voideye','shadow'],weapons:['lightning','railgun','boomerang','plasma','pulse','laser'],
  pools:[['ridge','portals','islands','maze','split','citadel','portals'],['portals','islands','shaft','portals','maze','islands','split'],['maze','portals','shaft','islands','citadel','portals','maze']]},
 'broforce-games':{name:'GAME WORLD',op:'OPERATION GAME OVER',ext:true,stages:['8-BIT KINGDOM','TURBO ZONE','GLITCH CASTLE'],
  sky:['#5c94fc','#a4c8ff'],far:'#7ab84a',mid:'#3a8a2a',haze:'#ffffff',dirt:['#c84c0c','#a83c08','#e0702a'],top:'#3ab43a',topDark:'#1a7a1a',
  brick:['#c84c0c','#802808'],wood:'#e09c3c',rock:['#7a7a7a','#4a4a4a'],cave:'#000000',interior:'#202040',decor:'pixel',liquid:'lava',
  stagePal:[{},{sky:['#2a6ad8','#8ad0ff'],dirt:['#b0702a','#8a5418','#d08a3a'],top:'#2ad02a',topDark:'#0a8a0a',brick:['#3a7ad8','#1a4a9a'],far:'#2a9a6a',mid:'#1a6a3a',decor:'turbo'},
   {sky:['#000000','#2a003a'],dirt:['#4a4a5a','#3a3a48','#5a5a6c'],top:'#7a7a8a',topDark:'#3a3a48',brick:['#6a6a7a','#3a3a48'],far:'#2a0a3a',mid:'#14001e',cave:'#000000',decor:'glitch'}],
  foes:[{grunt:['shroom','shroom','shelly'],heavy:['plumber'],fly:['ghost'],special:['chomper']},{grunt:['hog','hog','shroom'],heavy:['plumber'],fly:['ghost'],special:['hog']},{grunt:['pixel','shelly','plumber'],heavy:['cannon'],fly:['ghost'],special:['pixel']}],
  bosses:['shellking','eggbot','glitch'],weapons:['fireball','ring','railgun','minigun','boomerang','laser'],
  pools:[['qrow','pipes','ridge','qrow','stairs','pipes','islands'],['springs','ridge','springs','islands','split','springs','shaft'],['maze','stairs','citadel','glitchy','islands','split','maze']]},
};
const BOSS_NAMES={warmech:['WAR MECH','MINI-BOSS'],saucer:['THE MOTHERSHIP','MINI-BOSS'],queen:['ALIEN QUEEN','WORLD BOSS'],cerberus:['CERBERUS','MINI-BOSS'],bonedragon:['BONE DRAGON','MINI-BOSS'],beast:['THE BEAST','WORLD BOSS'],
 flower:['THE FACE-FLOWER','MINI-BOSS'],voideye:['THE VOID EYE','MINI-BOSS'],shadow:['THE SHADOW KING','WORLD BOSS'],shellking:['KING SHELLBEARD','MINI-BOSS'],eggbot:['DR. EGGBERT','MINI-BOSS'],glitch:['MISSING.EXE','WORLD BOSS']};
function mulberry(seed){let a=seed>>>0;return ()=>{a=a+0x6D2B79F5>>>0;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
// K = the engine's constants {T,ROWS,MAXW,G,tile ids}
function buildStageExt(seed,si,theme,K){
 const {T,ROWS,MAXW,G}=K,{E,DIRT,BRICK,STEEL,WOOD,LADDER,BARREL,BAGS,PLAT,CRATE,ROCK,LAVA,SPIKE,PAD,GLASS,QBLOCK,PIPE,GOO,CRYST}=K;
 const rand=mulberry(seed),ri=(a,b)=>a+Math.floor(rand()*(b-a+1)),chance=p=>rand()<p,pickA=a=>a[Math.floor(rand()*a.length)];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const tiles=new Uint8Array(MAXW*ROWS),back=new Uint8Array(MAXW*ROWS);
 const foes=[],slots=[],decor=[],portals=[],haz=[],rings=[];let cx=0,boss=null,arena=null,exit=null;
 const set=(c,r,t)=>{if(c>=0&&c<MAXW&&r>=0&&r<ROWS)tiles[r*MAXW+c]=t;};
 const get=(c,r)=>c<0||c>=MAXW||r<0||r>=ROWS?STEEL:tiles[r*MAXW+c];
 const setB=(c,r,b)=>{if(c>=0&&c<MAXW&&r>=0&&r<ROWS)back[r*MAXW+c]=b;};
 const fill=(c0,c1,r0,r1,t)=>{for(let c=c0;c<=c1;c++)for(let r=r0;r<=r1;r++)set(c,r,t);};
 const fillB=(c0,c1,r0,r1,b)=>{for(let c=c0;c<=c1;c++)for(let r=r0;r<=r1;r++)setB(c,r,b);};
 const liquid=theme.liquid==='void'?SPIKE:LAVA;
 const soil=()=>theme.decor==='space'&&si===2||theme.decor==='dimension'&&chance(.3)?GOO:DIRT;
 const ground=(c,top)=>{for(let r=top;r<ROWS-1;r++){set(c,r,r>=top+4&&chance(.16)||r>=ROWS-4&&chance(.5)?ROCK:soil());setB(c,r,1);}set(c,ROWS-1,STEEL);};
 const F=theme.foes[si],pickF=k=>pickA(F[k]||F.grunt);
 const foe=(type,c,row,extra={})=>foes.push({type,x:(c+.5)*T,y:row*T,...extra});
 const slot=(c,row,depth)=>slots.push({x:(c+.5)*T,y:row*T,depth,c});
 const surf=c=>{for(let r=0;r<ROWS;r++){const t=get(c,r);if(K.SOLID[t]||t===PLAT)return r;}return ROWS-1;};
 const pit=(c,depth)=>{for(let r=G;r<ROWS-1;r++)set(c,r,r>=G+depth?liquid:E);setB(c,G,0);for(let r=G+depth+1;r<ROWS-1;r++)set(c,r,ROCK);set(c,ROWS-1,STEEL);if(liquid===LAVA){set(c,G+depth,LAVA);set(c,G+depth+1,LAVA);}};
 const ringRow=(c0,c1,r)=>{for(let c=c0;c<=c1;c++)rings.push({x:(c+.5)*T,y:(r+.5)*T});};
 const qblocks=theme.decor==='pixel'&&si===0;
 const SEG={
  start(){const L=10;for(let c=cx;c<cx+L;c++)ground(c,G);decor.push({k:'sign',x:(cx+6)*T,y:G*T});return L;},
  // rolling ground with big steps up and down and a jump pad
  ridge(){const L=ri(16,20);let top=G;for(let c=cx;c<cx+L;c++){if((c-cx)%3===2&&c<cx+L-3)top=clamp(top+ri(-3,3),G-6,G+2);ground(c,c>=cx+L-3?G:top);}
   const pc=cx+ri(3,6);set(pc,surf(pc),PAD);
   for(let k=0;k<3;k++){const a=ri(cx+2,cx+L-3);foe(pickF('grunt'),a,surf(a));}
   if(chance(.6)){const a=ri(cx+4,cx+L-4);foe(pickF('fly'),a,surf(a)-6,{fly:1});}
   const b=ri(cx+4,cx+L-4);set(b,surf(b)-1,chance(.5)?BARREL:CRATE);decor.push({k:'tree',x:(cx+3)*T,y:surf(cx+3)*T},{k:'tree',x:(cx+L-6)*T,y:surf(cx+L-6)*T});
   slot(cx+L-5,surf(cx+L-5),0);return L;},
  // a three-floor fort: rooms on every floor, ladders on alternate sides, a turret on the roof, the cage at the top
  citadel(){const L=16;for(let c=cx;c<cx+L;c++)ground(c,G);const a=cx+2,b=cx+13,W2=theme.decor==='space'?STEEL:BRICK;
   for(const fl of [G-5,G-10,G-15]){fill(a,b,fl,fl,fl===G-15?W2:BRICK);}
   fill(a,a,G-15,G-2,BRICK);fill(b,b,G-15,G-2,BRICK);set(a,G-2,E);set(a,G-3,E);set(b,G-2,E);set(b,G-3,E);set(a,G-7,E);set(b,G-12,E);
   fillB(a+1,b-1,G-14,G-1,2);
   for(let r=G-5;r<G;r++)set(a+2,r,LADDER);for(let r=G-10;r<G-5;r++)set(b-2,r,LADDER);for(let r=G-15;r<G-10;r++)set(a+3,r,LADDER);
   set(cx+8,G-5,GLASS);set(cx+9,G-10,GLASS);
   foe(pickF('grunt'),cx+6,G);foe(pickF('grunt'),cx+10,G);foe(pickF('heavy'),cx+8,G-5);foe(pickF('grunt'),cx+5,G-10);foe(pickF('grunt'),cx+11,G-10);
   foe(pickF('special')==='turret'?'turret':pickF('grunt'),cx+8,G-15);set(cx+11,G-6,BARREL);set(cx+5,G-11,CRATE);
   decor.push({k:'banner',x:(cx+7)*T,y:(G-15)*T});slot(cx+10,G-10,3);slot(cx+6,G-15,2);return L;},
  // two ways across a trench of lava (or the void): the catwalk with soldiers on it, or a tunnel dug under it
  split(){const L=20;for(let c=cx;c<cx+L;c++)ground(c,G);
   for(let c=cx+6;c<cx+14;c++)pit(c,3);
   fill(cx+3,cx+16,G-7,G-7,PLAT);for(let r=G-7;r<G;r++){set(cx+3,r,LADDER);set(cx+16,r,LADDER);}
   const r0=G+6,r1=G+8;fill(cx+2,cx+17,r0,r1,E);fill(cx+2,cx+3,G,r0,E);fill(cx+16,cx+17,G,r0,E);for(let r=G;r<=r1;r++){set(cx+2,r,LADDER);set(cx+17,r,LADDER);}
   for(let c=cx+6;c<cx+14;c++)set(c,G+5,ROCK);fillB(cx+2,cx+17,r0,r1,1);
   foe(pickF('grunt'),cx+7,G-7);foe(pickF('grunt'),cx+12,G-7);foe(pickF('heavy'),cx+9,r1+1);foe(pickF('grunt'),cx+13,r1+1);
   decor.push({k:'lamp',x:(cx+6)*T,y:r0*T},{k:'lamp',x:(cx+13)*T,y:r0*T});set(cx+10,r1,CRATE);set(cx+11,r1,BARREL);
   ringRow(cx+6,cx+13,G-9);slot(cx+5,r1+1,4);return L;},
  // a deep shaft down to the bottom of the map: ledges with enemies on the way down, the cage at the bottom, ladders out
  shaft(){const L=14;for(let c=cx;c<cx+L;c++)ground(c,G);const a=cx+3,b=cx+10,bot=ROWS-3;
   fill(a,b,G,bot,E);fillB(a,b,G,bot,1);for(let c=a;c<=b;c++)set(c,bot+1,ROCK);
   for(let k=0;k<4;k++){const r=G+3+k*3,side=k%2;const c0=side?b-3:a,c1=side?b:a+3;fill(c0,c1,r,r,k%2?PLAT:ROCK);foe(pickF('grunt'),side?b-1:a+1,r);}
   for(let r=G;r<=bot;r++)set(b+1,r,LADDER);fill(b+1,b+1,G,G,LADDER);
   foe(pickF('heavy'),cx+6,bot+1);set(a+1,bot,CRATE);set(a+2,bot,BARREL);slot(cx+7,bot+1,5);
   decor.push({k:'lamp',x:(a+1)*T,y:(G+1)*T});return L;},
  // floating islands over lava / the void, a jump pad to start, fliers around
  islands(){const L=22;for(let c=cx;c<cx+L;c++){if(c<cx+2||c>=cx+L-2)ground(c,G);else pit(c,3);}
   let x=cx+3;const hs=[];while(x<cx+L-4){const w=ri(2,4),h=ri(G-8,G-1);fill(x,x+w-1,h,h+1,chance(.3)?GLASS:ROCK);hs.push([x,w,h]);if(chance(.5))foe(pickF('grunt'),x+1,h);x+=w+ri(2,3);}
   set(cx+1,G,PAD);for(let k=0;k<2;k++){const a=ri(cx+4,cx+L-5);foe(pickF('fly'),a,G-10,{fly:1});}
   const top=hs.reduce((m,h)=>h[2]<m[2]?h:m,hs[0]);if(top){slot(top[0],top[2],2);ringRow(top[0],top[0]+top[1]-1,top[2]-2);}return L;},
  // a solid mass with corridors carved through it (and its roof to run over)
  maze(){const L=18,r0=G-10,r1=G+9;for(let c=cx;c<cx+L;c++)ground(c,G);
   for(let c=cx+1;c<cx+L-1;c++)for(let r=r0;r<=r1;r++){set(c,r,chance(.15)?ROCK:theme.decor==='pixel'?BRICK:soil());setB(c,r,1);}
   const carve=(c,r)=>{for(let dc=0;dc<2;dc++)for(let dr=-1;dr<1;dr++){const cc=c+dc,rr=r+dr;if(cc>cx&&cc<cx+L-1&&rr>r0&&rr<r1)set(cc,rr,E);}};
   // main corridor from the left entrance (ground level) to the right exit, wandering up and down
   let c=cx,r=G-1;while(c<cx+L-1){carve(c,r);if(chance(.35)){const nr=clamp(r+(chance(.5)?3:-3),r0+3,r1-2);const step=Math.sign(nr-r);while(r!==nr){r+=step;carve(c,r);if(r!==nr)set(c,r,LADDER);}}c++;}
   for(let rr=r;rr<=G-1;rr++){carve(cx+L-2,rr);set(cx+L-2,rr,LADDER);}
   // side branches with loot and enemies
   for(let k=0;k<3;k++){let bc=ri(cx+3,cx+L-5),br=ri(r0+3,r1-2);for(let n=0;n<ri(4,7);n++){carve(bc,br);bc+=chance(.5)?1:-1;}foe(pickF(k?'grunt':'heavy'),bc,br);set(clamp(bc+1,cx+2,cx+L-3),br-1,chance(.5)?CRATE:BARREL);}
   for(let k=0;k<2;k++){const a=ri(cx+3,cx+L-4);foe(pickF('grunt'),a,surf(a));}
   slot(ri(cx+5,cx+L-6),r1-1,5);for(let cc=cx+4;cc<cx+L-4;cc+=5){carve(cc,r1-1);}
   return L;},
  // flat yard with cover and a tank
  tankyard(){const L=18;for(let c=cx;c<cx+L;c++)ground(c,G);for(const c of [cx+3,cx+8,cx+13])set(c,G-1,BAGS);set(cx+6,G-1,BARREL);set(cx+11,G-1,BARREL);
   foe(pickF('heavy')==='mechtank'||pickF('heavy')==='chariot'?pickF('heavy'):'mechtank',cx+14,G);foe(pickF('grunt'),cx+5,G);foe(pickF('grunt'),cx+10,G);
   decor.push({k:'wire',x:cx*T,x2:(cx+L)*T,y:G*T},{k:'spot',x:(cx+16)*T,y:G*T});slot(cx+16,G,1);return L;},
  // a tall wall: blast through the brick or climb it; turrets on top
  turretwall(){const L=12;for(let c=cx;c<cx+L;c++)ground(c,G);fill(cx+4,cx+7,G-9,G-1,BRICK);fill(cx+5,cx+6,G-9,G-6,STEEL);
   foe('turret',cx+5,G-9);foe('turret',cx+6,G-9);foe(pickF('grunt'),cx+9,G);foe(pickF('grunt'),cx+2,G);set(cx+3,G-1,BARREL);slot(cx+10,G,1);return L;},
  // space station: metal corridor with glass windows, airlock doors
  airlock(){const L=16;for(let c=cx;c<cx+L;c++)ground(c,G);fill(cx+1,cx+14,G-7,G-7,STEEL);fill(cx+1,cx+1,G-7,G-3,STEEL);fill(cx+14,cx+14,G-7,G-3,STEEL);fillB(cx+1,cx+14,G-7,G-1,2);
   for(let c=cx+3;c<cx+13;c+=3)set(c,G-7,GLASS);fill(cx+7,cx+7,G-6,G-3,GLASS);
   foe(pickF('grunt'),cx+4,G);foe(pickF('grunt'),cx+11,G);foe(pickF('heavy'),cx+9,G);set(cx+5,G-1,CRYST);set(cx+12,G-1,CRATE);
   decor.push({k:'lamp',x:(cx+4)*T,y:(G-6)*T},{k:'lamp',x:(cx+11)*T,y:(G-6)*T});slot(cx+8,G,2);return L;},
  // hell: a narrow bone bridge over lava with skeletons; fire bars
  bonebridge(){const L=18;for(let c=cx;c<cx+L;c++){if(c<cx+2||c>=cx+L-2)ground(c,G);else pit(c,5);}
   fill(cx+2,cx+L-3,G,G,PLAT);decor.push({k:'posts',x:(cx+2)*T,x2:(cx+L-2)*T,y:G*T});
   for(let k=0;k<3;k++)foe(pickF('grunt'),cx+4+k*5,G);foe(pickF('fly'),cx+9,G-7,{fly:1});
   haz.push({k:'firebar',x:(cx+9.5)*T,y:(G-4.5)*T,len:5*T,spd:1.6});slot(cx+L-1,G,1);return L;},
  // hell: fire geysers between stone pillars
  geysers(){const L=18;for(let c=cx;c<cx+L;c++)ground(c,G);
   for(const k of [3,8,13]){fill(cx+k,cx+k+1,G-ri(3,7),G-1,ROCK);haz.push({k:'geyser',x:(cx+k+3)*T,y:G*T,period:2.4,ph:rand()*2.4});}
   for(let k=0;k<3;k++){const a=cx+5+k*5;foe(pickF('grunt'),a,G);}foe(pickF('special'),cx+15,G);slot(cx+16,G,1);return L;},
  // dimension: a room of portals that throw you up to a ledge route and back
  portals(){const L=20;for(let c=cx;c<cx+L;c++)ground(c,G);const hi=G-10;fill(cx+8,cx+17,hi,hi,ROCK);fill(cx+3,cx+6,G-3,G-1,ROCK);
   portals.push({x:(cx+4.5)*T,y:(G-3)*T,to:portals.length+1},{x:(cx+15.5)*T,y:hi*T,to:portals.length});
   foe(pickF('grunt'),cx+10,hi);foe(pickF('heavy'),cx+13,hi);foe(pickF('grunt'),cx+9,G);foe(pickF('grunt'),cx+15,G);foe(pickF('fly'),cx+12,G-6,{fly:1});
   slot(cx+12,hi,3);ringRow(cx+9,cx+16,hi-2);return L;},
  // 8-bit: a row of ? blocks and bricks over the ground, walkers below
  qrow(){const L=16;for(let c=cx;c<cx+L;c++)ground(c,G);const r=G-4;for(let c=cx+3;c<cx+12;c++)set(c,r,(c-cx)%3===1?QBLOCK:BRICK);set(cx+7,r-4,QBLOCK);
   for(let k=0;k<3;k++)foe(pickF('grunt'),cx+4+k*3,G);slot(cx+14,G,0);return L;},
  // 8-bit: pipes of different heights; plants pop out of some
  pipes(){const L=18;for(let c=cx;c<cx+L;c++)ground(c,G);
   for(const [k,h] of [[3,2],[8,4],[13,3]]){fill(cx+k,cx+k+1,G-h,G-1,PIPE);if(chance(.8))foe('chomper',cx+k,G-h);}
   foe(pickF('grunt'),cx+6,G);foe(pickF('grunt'),cx+11,G);foe(pickF('heavy'),cx+16,G);slot(cx+16,G,0);
   if(chance(.6)){portals.push({x:(cx+8.5)*T,y:(G-4)*T,to:portals.length+1,pipe:1},{x:(cx+16.5)*T,y:(G-1)*T,to:portals.length,pipe:1});}
   return L;},
  // 8-bit: the block staircase up and down
  stairs(){const L=18;for(let c=cx;c<cx+L;c++)ground(c,G);for(let k=0;k<7;k++){fill(cx+2+k,cx+2+k,G-k-1,G-1,ROCK);fill(cx+15-k,cx+15-k,G-k-1,G-1,ROCK);}
   foe(pickF('grunt'),cx+9,G-8);foe(pickF('fly'),cx+9,G-12,{fly:1});foe(pickF('grunt'),cx+5,G-4);slot(cx+9,G-7,1);return L;},
  // turbo zone: springs, rings, fast rolling enemies, spikes
  springs(){const L=20;for(let c=cx;c<cx+L;c++)ground(c,G);for(let c=cx+6;c<cx+9;c++)set(c,G-1,SPIKE);for(let c=cx+13;c<cx+15;c++)set(c,G-1,SPIKE);
   set(cx+4,G-1,PAD);set(cx+11,G-1,PAD);fill(cx+7,cx+12,G-9,G-9,PLAT);ringRow(cx+7,cx+12,G-11);ringRow(cx+15,cx+18,G-2);
   foe('hog',cx+10,G);foe('hog',cx+17,G);foe(pickF('grunt'),cx+9,G-9);slot(cx+18,G,0);return L;},
  // glitch castle: a corrupted stretch: random blocks, floating fragments, lava holes
  glitchy(){const L=18;for(let c=cx;c<cx+L;c++){if(chance(.18)&&c>cx+2&&c<cx+L-3)pit(c,3);else ground(c,G-ri(0,2));}
   for(let k=0;k<10;k++)set(ri(cx+1,cx+L-2),ri(G-10,G-3),pickA([BRICK,QBLOCK,GLASS,ROCK,CRYST]));
   for(let k=0;k<4;k++){const a=ri(cx+2,cx+L-3);foe(pickF('grunt'),a,surf(a));}decor.push({k:'glitch',x:(cx+9)*T,y:(G-6)*T});slot(cx+L-3,surf(cx+L-3),1);return L;},
  // the boss room: wide, a few pillars/ledges to dodge on
  arena(){const L=32;for(let c=cx;c<cx+L;c++){ground(c,G);set(c,G,ROCK);}
   fill(cx+7,cx+10,G-6,G-6,PLAT);fill(cx+21,cx+24,G-6,G-6,PLAT);
   arena={c0:cx+1,c1:cx+L-1,x0:(cx+1)*T,x1:(cx+L-1)*T,triggered:false};boss={x:(cx+23)*T,y:G*T,kind:theme.bosses[si]};
   for(const k of [4,14,18,28])decor.push({k:'brazier',x:(cx+k)*T,y:G*T});return L;},
  chopper(){const L=13;for(let c=cx;c<cx+L;c++)ground(c,G);exit={x:(cx+7)*T,y:G*T};decor.push({k:'pad',x:(cx+7)*T,y:G*T});return L;}
 };
 const mid=theme.pools[si].slice();for(let i=mid.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[mid[i],mid[j]]=[mid[j],mid[i]];}
 const order=['start',...mid,'arena','chopper'];
 for(const k of order)cx+=SEG[k]();
 const W=cx+1;for(let r=0;r<ROWS;r++){set(0,r,STEEL);set(W-1,r,STEEL);}
 // patrols on quiet open ground
 const end=arena?arena.c0-2:W-15;
 for(let c=13;c<end;c+=3){const row=surf(c);if(row>=ROWS-2||get(c,row-1)!==E||back[(row-1)*MAXW+c]||tiles[row*MAXW+c]===LAVA||foes.some(f=>Math.abs(f.x/T-c)<3&&Math.abs(f.y/T-row)<3))continue;
  if(chance(.35+si*.15))foe(chance(.12)?pickF('special'):pickF('grunt'),c,row);}
 slots.sort((a,b)=>b.depth-a.depth||a.x-b.x);const cages=[];const vip=slots.find(sl=>sl.depth>=2)||slots[0];
 if(vip)cages.push({...vip,vip:true});const rest=slots.filter(sl=>sl!==vip);for(let k=0;k<2&&rest.length;k++)cages.push({...rest.splice(Math.floor(rand()*rest.length),1)[0],vip:false});
 const flagAt=f=>{let c=Math.round(W*f);for(let k=0;k<12&&surf(c)>=ROWS-2;k++)c++;return {x:(c+.5)*T,y:surf(c)*T,up:false};};
 const flags=[.34,.67].map(flagAt);
 const spawn={x:3.5*T,y:surf(3)*T};
 void qblocks;
 return {W,tiles,back,foes,cages,decor,flags,spawn,boss,arena,exit,si,surfAt:surf,portals,haz,rings};
}
Object.assign(exports,{THEMES_EXT,BOSS_NAMES,buildStageExt});
