// Crappy Crush worlds and stages. Each world is a theme built from the board game's own items (assets/items/<id>.webp):
// one franchise when it has 6+ pictured items, else a themed mix (horror night, action heroes, heavy metal...).
// Background per world (owner's art, optional): assets/crappycrush/<world key>.webp|png, tall (1080x1920) →
// USER_PORTRAITS['crappy:<key>'] (tools/build.mjs). Stages: PER per world (Candy Land = the tutorial, ridiculously easy);
// after the last world the worlds come round again harder ("Remix"), forever. Special pieces are the dog coins
// (kc-token / mylo-token / loki-token), so those three never appear as plain pieces.
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

// Nov 18 (owner: "way more stages... every map stage a new theme based on groups of in-game items"): 53 more worlds
const hx=(h,sat,l)=>{sat/=100;l/=100;const f=n=>{const k=(n+h/30)%12,c=l-sat*Math.min(l,1-l)*Math.max(-1,Math.min(k-3,9-k,1));return Math.round(255*c).toString(16).padStart(2,'0');};return '#'+f(0)+f(8)+f(4);};
const NW=(key,name,source,h,items)=>({key,name,source,tint:[hx(h,62,46),hx((h+20)%360,55,11)],items:items.split(' ')});
WORLDS.push(
 NW('citywok','City Wok','South Park',200,'wz-kenny-parka wz-chinpokomon wz-tweek-coffee wz-city-wok wz-mr-hat wz-manbearpig-trap'),
 NW('qbranch','Q Branch','James Bond',40,'aston-key bond-watch vodka-martini briefcase-gadget v43-aston-eject-button v43-q-laser-pen'),
 NW('crystalcamp','Camp Crystal Lake','Horror Night',350,'hockey-mask jason-machete shape-mask freddy-glove ghostface-phone lament-box'),
 NW('actionheroes','Action Heroes','Action Movies',20,'chuck-roundhouse chuck-beard jcvd-epic-split kumite-headband nakatomi-radio under-siege-cake'),
 NW('chutes','Ladder Valley','Chutes and Ladders',95,'wz-golden-ladder wz-good-deed-badge wz-lucky-spinner wz-chute-wax wz-kaa-coils wz-ladder-rung'),
 NW('snackattack','Snack Attack','Snack Lore',30,'orange-soda golden-birthday-cake-oreos banh-mi pho-bowl burger pasta'),
 NW('clocktower','The Clock Tower','Castlevania',300,'vampire-killer alucard-shield belmont-lantern wz-throwing-axe wz-invisibility-potion wz-wall-candle'),
 NW('heavymetal','Heavy Metal','Black Sabbath & friends',0,'iron-man-boots doom-encore v43-war-pigs-snare v43-paranoid-earplugs doom-amp-stack buckethead-bucket'),
 NW('larrydavid',"Larry David's World",'Seinfeld · Curb Your Enthusiasm',210,'soup-nazi-ladle v43-marble-rye frogger-quarter v43-pretty-good-card v43-spite-store-cup v43-latte-larry-key'),
 NW('pokecenter','Pokémon Center','Pokémon',345,'pk-great-balls-5 pk-ultra-balls-5 pk-hyper-potions-2 pk-x-items pk-elixer pk-full-heals-3'),
 NW('fifthelement','New York 2263','The Fifth Element',25,'multipass element-stones leeloo-rescue v43-korben-taxi-key v43-ruby-rod-mic v43-diva-ticket'),
 NW('nostromo','The Nostromo','Alien',150,'motion-tracker v43-nostromo-fire-kit v43-ripley-loader-glove v43-facehugger-egg power-loader area51-keycard'),
 NW('nintendopower','Nintendo Power','Nintendo',0,'nintendo-blue-shell nintendo-super-star mini-mushroom wz-question-block v43-lakitu-cloud mega-mushroom'),
 NW('galaxy','A Galaxy Far Away','Star Wars',230,'lightsaber thermal-detonator force-push v43-r2-repair-kit v43-jedi-holocron v43-hans-sabacc-deck'),
 NW('shadowmoses','Shadow Moses','Metal Gear',110,'cardboard-box codec box-tank-key snake-ration v43-snake-bandana briefcase'),
 NW('cabin','The Cabin','Evil Dead',15,'ash-chainsaw necronomicon boomstick halloween-mask v43-s-mart-badge v43-ash-gauntlet'),
 NW('dancefloor','The Dance Floor','Daft Punk & friends',280,'daft-helmet robot-drum daft-record v43-harder-better-pedal identity-disc nightcall-cassette'),
 NW('sewerlair','Sewer Lair','Teenage Mutant Ninja Turtles',120,'pizza-slice turtle-raft v43-shell-cell v43-sewer-pizza warp-pipe pow-block'),
 NW('coenland','Coen Country','Fargo · The Coen brothers',190,'fargo-scraper woodchipper v43-paul-bunyan-keyring v43-marge-duck-stamp chigurh-coin hula-hoop'),
 NW('deathmountain','Death Mountain','The Legend of Zelda · Nintendo',10,'wz-bomb-bag wz-master-sword wz-blue-candle nintendo-pokeball nintendo-triforce-shard nintendo-heart-container'),
 NW('invasion','They Live Among Us','Alien invasion movies',160,'they-live-glasses obey-remote v43-bubblegum-pack mib-neuralyzer v43-noisy-cricket ack-ray'),
 NW('backnine','The Back Nine','Happy Gilmore · Caddyshack',100,'clockwork-caddy v43-chubbs-hand v43-shooter-trophy sandler-golf lost-golf-ball caddyshack-gopher-plush'),
 NW('mccallister','The McCallister House','Home Alone',5,'paint-can home-alone-trap v43-kevin-bb-gun v43-tar-bucket v43-kevin-micro-machines doubtfire-mask'),
 NW('isla','Isla Nublar','Jurassic Park',85,'dino-can jurassic-winch v43-amber-resin v43-nedry-cryo-pack v43-sattler-flashlight dragon-scale'),
 NW('nightmares','Nightmares','Horror Night',270,'dream-token freddy-sweater saw-key reverse-trap scissor-gloves sandworm-ticket'),
 NW('rocknroll',"Rock 'n' Roll",'The Beatles & friends',50,'beatles-yellow-sub beatles-abbey-sign beatles-sgt-pepper will-cowbell wayne-guitar guitar-hero-guitar'),
 NW('stranding','The Strand','Death Stranding',195,'bb-pod parcel-stack ladder v43-container-spray v43-fragile-umbrella v43-likes-token'),
 NW('coneyisland','Coney Island','The Warriors',330,'warriors-vest spray-can subway-token warriors-bottle warriors-radio baby-ipod'),
 NW('shagadelic','Shagadelic','Austin Powers · Zoolander',310,'shaguar v43-austin-mojo v43-cryogenic-capsule v43-fembot-shield blue-steel v43-magnum-mirror'),
 NW('raccoon','Raccoon City','Survival horror',90,'spencer-key green-herb v43-first-aid-spray v43-ink-ribbon silent-radio blood-sample'),
 NW('kombat','The Tournament','Mortal Kombat & fight movies',355,'mk-fatality-scroll mk-dragon-medallion mk-toasty mk-test-your-might reflex-gloves rocky-gloves'),
 NW('spectre','SPECTRE Island','James Bond',45,'spectre-ring bond-cufflinks moonraker-thruster bond-lockpick oddjob-hat wz-diamond-collar'),
 NW('saturday','Saturday Morning','90s kids TV',290,'ranger-morpher ranger-power-coin ranger-command-center ranger-megazord-key reptar-bar nick-gak'),
 NW('thehunt','The Hunt','Predator · Commando',105,'predator-cloak v43-thermal-scope v43-smart-disc v43-yautja-med-kit val-verde-launcher rambo-bandana'),
 NW('sitcom','Sitcom Night','Arrested Development & friends',55,'banana v43-blue-man-paint v43-loose-seal-glove v43-tracy-egot v43-night-cheese v43-louise-hat'),
 NW('crystalquest','Crystal Quest','Final Fantasy & fantasy',250,'buster-sword v43-phoenix-down v43-chocobo-lure v43-materia-orb pendant-of-life brave-merida-bow'),
 NW('arcadehall','The Arcade Hall','Arcade classics',265,'power-pellet frogger-cabinet tetris-cartridge remote-bomb ge-cartridge turbo-sneakers'),
 NW('toxic','Toxic Waste','Troma · Idiocracy',75,'troma-hazmat nuke-barrel nuke-pass toxie-tutu toxie-mop brawndo'),
 NW('lethal','Lethal Weapons','Action Movies',220,'mel-wallace-paint mel-interceptor-keys mel-riggs-badge terminator-shades jackie-chair jcvd-timecop-badge'),
 NW('cringe','Nathan & Tim','Nathan for You · I Think You Should Leave',175,'dingdong-mic v43-dumb-starbucks-cup v43-summit-ice-jacket v43-dan-flashes-shirt v43-karl-havoc-costume v43-orange-juice-prop'),
 NW('klendathu','Bugs & Aliens','Starship Troopers · Men in Black · Mars Attacks!',35,'bug-rifle bug-helmet martian-defense-button v43-orions-galaxy v43-worm-guys-coffee tribble-swarm'),
 NW('trainingarc','Training Arc','Dragon Ball Z · Hunter × Hunter',30,'scouter kamehameha-burst time-chamber-pass capsule-rescue-kit v43-gons-fishing-rod sumo-suit'),
 NW('popcharts','Pop Charts','Boy bands & legends',320,'nsync-strings bsb-larger-than-life tupac-bandana marley-one-love-flag stevie-clavinet primus-bass-rig'),
 NW('goldeneye','The Facility','GoldenEye',60,'exploding-pen ge-proximity-mine ge-klobb mini-goldeneye laser-table-key jetpack'),
 NW('basement','The Basement','Horror Night',20,'basement-key tape-measure raincoat ritual-bowl plant-food handbook-dead'),
 NW('slackers','Slacker Comedies','Jay and Silent Bob · Superbad',140,'snoochie v43-snoogans-beanie v43-mallrats-sailboat v43-moobys-card mclovin-id superbad-vest'),
 NW('sportsbar','The Sports Bar','Sports movies',210,'v43-flying-v-book v43-bombay-whistle v43-ducks-jersey baseketball-ball dodgeball-wrench rocky-meat-gloves'),
 NW('psychfest','Psych Fest','King Gizzard · Osees & friends',100,'nonagon gizzard-record osees-face osees-fuzz dopesmoker-staff comatorium-pass'),
 NW('fivestars','Five Stars','Review & friends',45,'review-pancakes five-stars forrest-review-card v43-turbo-team-voucher v43-bar-replica-plan spagett-ambush'),
 NW('hillvalley','Hill Valley','80s adventure movies',185,'hoverboard flux v43-mr-fusion goonies-rope raiders-idol gremlin-grease'),
 NW('smalltown','Pawnee & Arlen','Parks and Recreation · King of the Hill',30,'cone v43-pawnee-waffles v43-li-l-sebastian-ticket v43-ron-mustache-comb propane v43-pocket-sand'),
 NW('blades','Blades & Battles','Seven Samurai · Troy · Battle Royale',5,'samurai-sword samurai-banner rice-ball achilles-shield battle-schoolbag battle-collar'),
 NW('airforce','Get Off My Plane','Air Force One · Fast & Furious',215,'presidential-seal airforce-phone plane-parachute nitro-canister v43-corona-cooler adrenaline-battery'));
const PER=8;

// Board shapes (9 rows x 8 cols, 1 = playable). Later stages use them.
const SH=s=>s.trim().split(/\s+/).join('').split('').map(Number);
const SHAPES=[
 null,
 SH(`11111111 11111111 11111111 11100111 11000011 11100111 11111111 11111111 11111111`),// hole
 SH(`00111100 01111110 11111111 11111111 11111111 11111111 11111111 01111110 00111100`),// round
 SH(`11111111 11111111 01111110 00111100 00111100 00111100 01111110 11111111 11111111`),// hourglass
 SH(`11100111 11100111 11111111 11111111 11111111 11111111 11111111 11100111 11100111`),// notches
 SH(`11111111 10111101 11111111 11011011 11111111 11011011 11111111 10111101 11111111`)];// pillars

// More shapes for the later worlds
SHAPES.push(
 SH(`00011000 00111100 01111110 11111111 11111111 11111111 01111110 00111100 00011000`),// diamond
 SH(`11100111 11100111 11100111 11111111 11111111 11111111 11100111 11100111 11100111`),// cross-ish
 SH(`11111100 11111100 11111110 01111111 00111111 01111111 11111110 11111100 11111100`),// zigzag
 SH(`11111111 11111111 11011011 11011011 11111111 11111111 11011011 11011011 11111111`));// windows

// Points and collected pieces per move on each shape vs the full board (casual bot, 30 games x 18 moves each, Nov 18)
const SHAPE_PTS=[1,.51,.87,.69,.69,.58,.69,.51,.85,.49],SHAPE_COL=[1,.61,.82,.74,.72,.63,.68,.54,.79,.55];
// Candy Land = the tutorial: 6 kinds of piece like everywhere else (owner, Nov 18 later: 4 kinds = one swap set off chain
// after chain, too easy; real Candy Crush uses 6), extra moves, low goals, one tip each.
const TUTORIAL=[
 {kind:'score',tip:'Swipe a piece onto a neighbour to swap them. Line up 3 of the same and they clear.'},
 {kind:'score',tip:'Line up 4 in a row to make a MYLO COIN: match it (or swap it) and it clears a whole row or column.'},
 {kind:'collect',tip:'Collect the pieces shown at the top before your moves run out.'},
 {kind:'score',tip:'Make an L or a T shape to get a KC COIN: it blasts everything around it.'},
 {kind:'crap',tip:'Crap never matches. Clear pieces right next to it to flush it away.'},
 {kind:'score',tip:'Line up 5 for the LOKI COIN: swap it with any piece to clear every piece of that kind.'},
 {kind:'mix',tip:'Two goals at once: collect the pieces AND flush the crap.'},
 {kind:'crap',drip:true,tip:'Uh oh: the toilet backs up every few moves and drops new crap. Flush it all!'}];
// Stage kinds round each world (the last one = the world finale: the toilet backs up)
const KINDS=['score','collect','crap','score','mix','collect','crap','crap'];

// stage(n): {n, world, w (index), loop, kind:'score'|'collect'|'crap'|'mix', K, moves, target, s2, s3, collect:[[k,n]..],
// crap:[[cell,layers]..], drip, mask, tip?, d}
// Difficulty d climbs from 0 (first stage after the tutorial) to ~1.25 at the last world, a little lower at the start of
// each world than at its end (a breather after every finale); Remix loops add more.
const MAIN=()=>WORLDS.length*PER;
function stage(n){n=Math.max(1,n|0);const wi=Math.floor((n-1)/PER)%WORLDS.length,loop=Math.floor((n-1)/(PER*WORLDS.length)),k=(n-1)%PER;
 const R=9,C=8,rnd=mulberry(n*9973+17);
 if(wi===0&&loop===0){const t=TUTORIAL[k],K=6,moves=k<2?18:20;
  const st={n,world:WORLDS[0],w:0,loop,kind:t.kind,K,R,C,moves,mask:null,collect:[],crap:[],drip:t.drip?7:0,tip:t.tip,d:0};
  if(t.kind==='collect'||t.kind==='mix'){const a=(rnd()*K)|0;st.collect=[[a,t.kind==='mix'?10:14]];}
  if(t.kind==='crap'||t.kind==='mix'){const cells=[];for(let i=0;i<R*C;i++)if(((i/C)|0)>=5)cells.push(i);for(let j=0;j<(t.kind==='mix'?3:4);j++)st.crap.push([cells.splice((rnd()*cells.length)|0,1)[0],1]);}
  st.crapGoal=st.crap.reduce((a,[,l])=>a+l,0);const target=k===0?1500:k===1?2500:3000;
  st.target=t.kind==='score'?target:300;st.s2=Math.round(target*1.6/50)*50;st.s3=Math.round(target*2.4/50)*50;return st;}
 const g=Math.max(0,(n-PER-1)/Math.max(1,MAIN()-PER-1)),saw=(k/(PER-1)-.5)*.14;
 const d=Math.max(0,Math.min(1.45,1.25*Math.pow(Math.min(1,g),.8)+saw+loop*.15));
 const K=6,kind=KINDS[k];// 6 kinds on every stage (with 4-5 one swap cascaded on and on: ~3 / ~2 waves a move vs 1.5)
 const mask=(d<.12||k===0||k===1)?null:SHAPES[1+((n*7+wi)%(SHAPES.length-1))];
 const moves=Math.round((kind==='score'?21:kind==='collect'?23:kind==='crap'?26:27)-d*(kind==='crap'||kind==='mix'?3:4.5));
 const si=mask?SHAPES.indexOf(mask):0,af=SHAPE_PTS[si]||1,cf=SHAPE_COL[si]||1;// a shaped board makes fewer points/pieces (measured)
 const per=(260+d*60)*af;const target=Math.round(moves*per/50)*50;
 const st={n,world:WORLDS[wi],w:wi,loop,kind,K,R,C,moves,mask,collect:[],crap:[],drip:0,d:+d.toFixed(3)};
 if(kind==='collect'||kind==='mix'){const a=(rnd()*K)|0,b=(a+1+((rnd()*(K-1))|0))%K,c=Math.round(moves*(.8+d*.15)*(1+cf)/2);st.collect=d<.25?[[a,Math.round(c*1.1)]]:[[a,c],[b,Math.round(c*.7)]];if(kind==='mix')st.collect=[[a,Math.round(moves*(.8+d*.15)*cf*.7)]];}
 if(kind==='crap'||kind==='mix'){const fin=k===PER-1,want=Math.round((fin?6+d*3:kind==='mix'?4+d*3:6+d*4.5)*(.55+.45*cf)),layers=kind==='mix'?1:Math.min(fin&&d>1.1?3:2,1+Math.floor(d*1.1));const cells=[];
  for(let i=0;i<R*C;i++){const r=(i/C)|0;if(r>=3&&(!mask||mask[i]))cells.push(i);}
  for(let j=0;j<want&&cells.length;j++){const i=cells.splice((rnd()*cells.length)|0,1)[0];st.crap.push([i,1+((rnd()*layers)|0)]);}
  if(fin)st.drip=Math.max(5,7-Math.floor(d*2));}// world finale: the toilet backs up every few moves (new piles block, the goal stays the starting crap)
 st.crapGoal=st.crap.reduce((a,[,l])=>a+l,0);
 st.target=kind==='score'?target:Math.round(target*.6/50)*50;st.s2=Math.round(target*(kind==='score'?1.35:.8)/50)*50;st.s3=Math.round(target*(kind==='score'?1.8:1.2)/50)*50;
 return st;}
function mulberry(a){return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const STAGE_COUNT=WORLDS.length*PER;// 576
Object.assign(exports,{WORLDS,PER,SHAPES,stage,STAGE_COUNT});
