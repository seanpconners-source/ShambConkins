// Crappy Crush worlds and stages. Each world is one show/game: its six board pieces are that franchise's items
// (assets/items/<id>.webp, the same pictures the board game uses). Background per world (owner's art, optional):
// assets/crappycrush/<world key>.webp|png, tall (1080x1920) → USER_PORTRAITS['crappy:<key>'] (tools/build.mjs).
// Stages: 5 per world, so 95; after the last world the worlds come round again harder ("Remix"), forever.
const WORLDS=[
 {key:'candyland',name:'Candy Land',source:'Candy Land',tint:['#ff7ac8','#7a2a8a'],items:['wz-gumdrop','wz-licorice','wz-molasses','wz-lolly-lollipop','wz-gingerbread-plum','wz-color-card']},
 {key:'paddys',name:"Paddy's Pub",source:'Always Sunny',tint:['#2f7a3a','#14301a'],items:['rum-ham','fight-milk','kitten-mittens','v43-golden-god-boombox','v43-jersey-sunblock','dennis-tools']},
 {key:'mariokart',name:'Rainbow Road',source:'Mario Kart',tint:['#5a3cff','#14063a'],items:['wz-triple-mushroom','wz-banana-peel','wz-red-shell','wz-lightning-bolt','wz-golden-mushroom','wz-item-box']},
 {key:'pokemon',name:'Pallet Town',source:'Pokémon',tint:['#ff5a5a','#2a3a8a'],items:['pk-master-ball','pk-poke-doll','pk-full-restore','pk-revives-3','pk-rare-candy-2','pk-poke-balls-5']},
 {key:'southpark',name:'South Park',source:'South Park',tint:['#6ec6ff','#1c3a5a'],items:['wz-dodgeball','gamesphere','v43-towelie-towel','wz-poofs-bowl','wz-respect-badge','v43-chefs-chocolate-balls']},
 {key:'office',name:'Dunder Mifflin',source:'The Office',tint:['#8fb2d6','#24364a'],items:['v43-boss-mug','v43-jello-stapler','michael-expense-card','v43-pretzel-day','air-hockey-puck','warehouse-forklift-key']},
 {key:'sonic',name:'Green Hill',source:'Sonic the Hedgehog',tint:['#3ad06a','#0c4a8a'],items:['wz-speed-shoes','wz-blue-shield','wz-chaos-emerald','wz-yellow-spring','wz-giant-ring','wz-invincibility']},
 {key:'smb3',name:'Mushroom Kingdom',source:'Super Mario Bros. 3',tint:['#ffb03a','#6a2a0a'],items:['wz-super-leaf','wz-p-wing','wz-hammer-suit','wz-music-box','wz-frog-suit','wz-n-spade-card']},
 {key:'zelda',name:'Hyrule',source:'The Legend of Zelda',tint:['#5ab04a','#1a3a2a'],items:['v43-fairy-bottle','v43-rupee-wallet','wz-boomerang','wz-ocarina','v43-hookshot','wz-pegasus-boots']},
 {key:'lebowski',name:'The Lanes',source:'The Big Lebowski',tint:['#c86a3a','#2a1430'],items:['dude-rug','bowling-ball','bowling-shoes','v43-white-russian','v43-walters-toe','v43-dude-bathrobe']},
 {key:'castlevania',name:"Dracula's Castle",source:'Castlevania',tint:['#a03a5a','#140a1a'],items:['holy-water','wz-magic-crystal','wz-pot-roast','wz-boomerang-cross','wz-stopwatch','wz-money-bag']},
 {key:'bond',name:'MI6',source:'James Bond',tint:['#c8a050','#101418'],items:['golden-gun','blofeld-cat','bond-loaded-dice','v43-felix-poker-chip','martini-glass','walther']},
 {key:'clue',name:'Tudor Mansion',source:'Clue',tint:['#a0603a','#2a140a'],items:['wz-magnifying-glass','wz-secret-passage','wz-candlestick','wz-lead-pipe','wz-rope','wz-sealed-envelope']},
 {key:'monopoly',name:'Boardwalk',source:'Monopoly',tint:['#3ab07a','#0a3a2a'],items:['wz-jail-free','wz-pass-go','wz-hotel','wz-free-parking','wz-reading-railroad','wz-speed-die']},
 {key:'taskmaster',name:'The Taskmaster House',source:'Taskmaster',tint:['#d04a3a','#2a1414'],items:['taskmaster-seal','v43-taskmaster-rubber-duck','v43-golden-greg-head','taskmaster-loaded-die','little-assistant','v43-red-green-potato']},
 {key:'startrek',name:'The Enterprise',source:'Star Trek',tint:['#3a8ad0','#0a1430'],items:['tribble','tricorder','communicator','v43-latinum-slip','v43-bajoran-orb','transporter']},
 {key:'dbz',name:'Kame House',source:'Dragon Ball Z',tint:['#ff9a3a','#3a1a0a'],items:['senzu-bean','dragon-radar','weighted-gi','v43-flying-nimbus','v43-capsule-case','v43-seven-dragon-balls']},
 {key:'hxh',name:'Greed Island',source:'Hunter × Hunter',tint:['#4ac08a','#0a2a2a'],items:['hunter-license','killua-yoyos','bungee-gum','kurapika-chain','v43-greed-island-binder','v43-biscuit-cookie']},
 {key:'matrix',name:'The Construct',source:'The Matrix',tint:['#3aff6a','#020a04'],items:['red-pill','matrix-hardline-phone','v43-training-disk','v43-trinity-bike-key','v43-white-rabbit','wopr-terminal']}];
const PER=5;

// Board shapes (9 rows x 8 cols, 1 = playable). Later stages use them.
const SH=s=>s.trim().split(/\s+/).join('').split('').map(Number);
const SHAPES=[
 null,
 SH(`11111111 11111111 11111111 11100111 11000011 11100111 11111111 11111111 11111111`),// hole
 SH(`00111100 01111110 11111111 11111111 11111111 11111111 11111111 01111110 00111100`),// round
 SH(`11111111 11111111 01111110 00111100 00111100 00111100 01111110 11111111 11111111`),// hourglass
 SH(`11100111 11100111 11111111 11111111 11111111 11111111 11111111 11100111 11100111`),// notches
 SH(`11111111 10111101 11111111 11011011 11111111 11011011 11111111 10111101 11111111`)];// pillars

// stage(n): {n, world, w (index), loop, kind:'score'|'collect'|'crap'|'mix', K, moves, target, s2, s3, collect:[[k,n]..], crap:[[cell,layers]..], drip, mask}
function stage(n){n=Math.max(1,n|0);const wi=Math.floor((n-1)/PER)%WORLDS.length,loop=Math.floor((n-1)/(PER*WORLDS.length)),k=(n-1)%PER;
 const d=Math.min(1.2,(n-1)/95*.9+loop*.2);// difficulty 0..1.2
 const K=n<=3?5:6,R=9,C=8,kind=['score','collect','crap','mix','crap'][k];
 const mask=n<=10||k===0||k===1?null:SHAPES[(n*7+wi)%SHAPES.length];
 const moves=Math.round((kind==='score'?20:kind==='collect'?22:kind==='crap'?26:27)-d*(kind==='crap'||kind==='mix'?2.5:4));
 const per=(K===5?420:260)+d*60;const target=Math.round(moves*per/50)*50;
 const st={n,world:WORLDS[wi],w:wi,loop,kind,K,R,C,moves,mask,collect:[],crap:[],drip:0};
 const rnd=mulberry(n*9973+17);
 if(kind==='collect'||kind==='mix'){const a=(rnd()*K)|0,b=(a+1+((rnd()*(K-1))|0))%K,c=Math.round(moves*(.85+d*.25));st.collect=[[a,c],[b,Math.round(c*.8)]];if(kind==='mix')st.collect=[[a,Math.round(c*.9)]];}
 if(kind==='crap'||kind==='mix'){const want=Math.round(k===4?6+d*4:7+d*5),layers=Math.min(k===4&&d>1?3:2,1+Math.floor(d*1.25));const cells=[];
  for(let i=0;i<R*C;i++){const r=(i/C)|0;if(r>=3&&(!mask||mask[i]))cells.push(i);}
  for(let j=0;j<want&&cells.length;j++){const i=cells.splice((rnd()*cells.length)|0,1)[0];st.crap.push([i,1+((rnd()*layers)|0)]);}
  if(k===4)st.drip=Math.max(4,6-Math.floor(d*1.5));}// world finale: the toilet backs up every few moves (new piles block, the goal stays the starting crap)
 st.crapGoal=st.crap.reduce((a,[,l])=>a+l,0);
 st.target=kind==='score'?target:Math.round(target*.6/50)*50;st.s2=Math.round(target*(kind==='score'?1.35:.8)/50)*50;st.s3=Math.round(target*(kind==='score'?1.8:1.2)/50)*50;
 return st;}
function mulberry(a){return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const STAGE_COUNT=WORLDS.length*PER;
Object.assign(exports,{WORLDS,PER,SHAPES,stage,STAGE_COUNT});
