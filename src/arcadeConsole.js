// Arcade as a console home screen (ROADMAP M1/M3/M4, owner's pick from the Nov 3 look book: "Console Home" layout,
// Clean Console colours, Neon-outline pictures, Comic lettering). One big hero for the focused game (its character
// cut out with a glowing outline, its own colour wash), category pills on top, one scrolling row of tiles at the bottom.
// Versions of one game (Broforce's 4 missions, the 3 pinball tables, every boss…) share ONE tile; its hero opens a
// version page laid out as tiles. ui.js catalogHTML still decides what is listed and how each game is played
// (`partsFor` gives the play button, info line and medals), so 1P / online / dev mode work as before.
const {ART}=require("src/data/art.js");
const {KEY_SCREENS,KEY_PLACE}=require("src/data/keyPlacements.js");
const {USER_PORTRAITS,isRasterArt}=require("src/data/userPortraits.js");
const {CHARACTERS}=require("src/characters.js");
const {bossById}=require("src/data/bosses.js");
const {escapeHTML:e}=require("src/utils.js");
const {store}=require("src/state.js");
const {tone}=require("src/audio.js");
const {saveProfile,toggleFavorite}=require("src/profile.js");

// Families: [key, title, subtitle, hero character, member ids]. The tile/hero uses the family; the version page lists members.
const FAMILIES=[
 ['bosses','Boss Select','Every boss you have beaten','king-kandy',null],
 ['pinball','Pinball Tables','Bucketheadland · Black Sabbath · King Gizzard','buckethead',['bucketheadland-pinball','black-sabbath-pinball','king-gizzard-pinball']],
 ['smb','Super Mario Bros.','World 1, Coin Rush, Castle Dash, SMB3','mario',['smb-world-1','smb-coin-rush','smb-castle-dash','smb3-nspade','smb3-spade-slots']],
 ['kart','Mario Kart','Grand Prix, time trials, battle','bowser',['rainbow-road-kart','kart-grand-prix-pass','kart-time-trial','rainbow-balloon-battle']],
 ['castlevania','Castlevania','NES and Symphony of the Night','alucard',['cv-symphony','cv-vampire-killer','cv-candle-hunt']],
 ['sonic','Sonic the Hedgehog','Green Hill Zone',null,['sonic-ring-rush','sonic-goal-dash']],
 ['doom','DOOM','DOOM and DOOM II',null,['doom','doom-2']],
 ['hangman','Hangman Unchained','Quick Draw, Showdown, Wanted','dj-django',['django-hangman','django-hangman-showdown','django-hangman-wanted']],
 ['invaders','Space Invaders','Solo, versus and co-op',null,['space-swarm','space-swarm-versus','space-swarm-coop']],
 ['tarantino','Tarantino Night','Seven Tarantino games','kb-the-bride',['tarantino-crazy88','kill-bill-duel','tarantino-standoff','tarantino-twist','tarantino-adrenaline','tarantino-bounty','tarantino-chase']],
 ['southpark','South Park','Dodgeball, Poofs, Kenny, snowballs','cartman',['sp-dodgeball','sp-cheesy-poofs','sp-killed-kenny','snowball-fight']],
 ['bond','007 Missions','GoldenEye and the Bond lair',null,['bond-facility','bond-laser-vault','bond-golden-gun','bond-goldfinger-bomb']],
 ['paddys',"Paddy's Pub",'Beer pong, flip cup, darts','charlie',['paddys-beer-pong','flipadelphia-cup','paddys-darts']],
 ['casino','Casino Night','Cards, wheels and dice',null,['blackjack','five-card','roulette','bond-baccarat','liars-dice']],
 ['trivia','Trivia Night','Nine quiz shows',null,['trivia-mixed','trivia-hardcore','trivia-lightning','trivia-wager','trivia-survival','trivia-sitcom','trivia-nick90','trivia-dbz','trivia-hxh']],
 ['taskmaster','Taskmaster','Six tasks',null,['taskmaster-micro-relay','taskmaster-fruit-ninja','taskmaster-sumo','task-tallest-thing','taskmaster-curling','tm-cones']],
 ['trek','Star Trek Game Night','Chess, Tri-D, Strategema, Four Lights',null,['ten-forward-chess','trek-mini-chess','strategema-grid','four-lights']],
 ['rush','Microgame Rush','Rush and Marathon',null,['microgame-rush','rush-marathon']],
 ['hyrule','The Legend of Zelda','Rupee Rush and Sword Duel',null,['hyrule-rupee-rush','hyrule-sword-duel']],
 ['clue','Clue','Whodunit and Lineup',null,['clue-whodunit','clue-lineup']],
 ['monopoly','Monopoly','Speed Die and Auction',null,['monopoly-speed-die','monopoly-auction']],
 ['chutes','Chutes and Ladders','Ladder Rush and Spinner Showdown',null,['chutes-ladder-rush','chutes-spinner-showdown']],
 ['candy','Candy Land','Gumdrop Catch and Color Card Dash',null,['candy-gumdrop-catch','candy-color-dash']],
 ['baseball','Major League','Home Run Derby and Bat & Field',null,['major-league-bats','major-league-fielding']],
 ['ducks','The Mighty Ducks','Air hockey and shootout',null,['rink-rivals','office-hockey-shootout']],
 ['matrix','The Matrix','Nine Realities and Hardline Hack','neo',['matrix-ultimate','matrix-hardline-hack']],
 ['terminator','Terminator','Skynet scan and freeway chase','terminator',['terminator-scan','t800-scan-long']],
 ['pokemon','Pokémon Battles','Wild and trainer battles','pikachu',['pkmn-wild','pkmn-trainer']]];
const FAMILY=new Map(FAMILIES.map(([key,title,sub,hero,ids])=>[key,{key,title,sub,hero,ids}]));
const FAMILY_OF=new Map();for(const f of FAMILY.values())for(const id of f.ids||[])FAMILY_OF.set(id,f.key);
const familyOf=g=>g.bossId?'bosses':FAMILY_OF.get(g.id)||null;
// These are one game on every shelf (owner, Nov 3): one tile, even where the shelf names a single version; its page lists them all.
const ONE_TILE=new Set(['hangman']);
// Arcade categories (owner, Nov 3: "make way more sense"): what a player would look for, not the engine's old tags.
// A game can sit in more than one. Old filter ids (arcade/strategy/skill/sports/dice) are mapped for old links.
const CATEGORIES=[['featured','★ Featured'],['recent','Recent'],['favorites','Favorites'],['all','All games'],['action','Action'],['retro','Retro arcade'],['versus','Head to head'],['sports','Racing & sports'],['board','Board & cards'],['puzzle','Puzzle'],['party','Party'],['trivia','Trivia & shows'],['casino','Casino & dice'],['pinball','Pinball'],['coop','Co-op'],['boss','Bosses'],['pokemon','Pokémon'],['variants','Encounter variants']];
const CAT_IDS={
 action:'broforce smb-world-1 smb-coin-rush smb-castle-dash cv-vampire-killer cv-candle-hunt cv-symphony sonic-ring-rush sonic-goal-dash doom doom-2 warriors-brawl bond-facility hyrule-rupee-rush hyrule-sword-duel tarantino-crazy88 tarantino-bounty kill-bill-duel living-dead-horde battle-royale-island raiders-ball-run',
 retro:'frogger-heads pong-duel breakout-party asteroid-drift space-swarm space-swarm-versus space-swarm-coop snake-run pac-maze-duel moonraker-lander mars-missile-defense duck-hunt-turn crossy-chaos block-battle t800-scan-long driller-duel bubble-battle flappy-disaster paper-route banana-money-grab metal-gear-tank-duel derezzed-cycles snake-v-snake bomber-duel sewer-clash neon-ball-storm smb-world-1 cv-vampire-killer doom',
 sports:'rainbow-road-kart kart-grand-prix-pass kart-time-trial rainbow-balloon-battle fast-quarter-mile radical-bike major-league-bats major-league-fielding league-penalties baseketball-shootout color-of-money happy-gilmore-golf kingpin-bowling underdog-dodgeball fight-night wind-archery disc-duel rink-rivals office-hockey-shootout taskmaster-curling sp-dodgeball',
 board:'shamb-uno traitors-guess-who matrix-ultimate greed-island-mancala deadite-checkers ten-forward-chess office-dots-boxes wopr-grid trek-mini-chess strategema-grid four-lights battleship-fog clue-whodunit clue-lineup monopoly-speed-die monopoly-auction chutes-ladder-rush chutes-spinner-showdown candy-color-dash smb3-nspade full-shambyahtzee',
 puzzle:'megatouch-photohunt brawndo-fruit-merge warehouse-shift matrix-hardline-hack alien-sonar-grid paddys-hole bricks-breaker-quest tm-cones simon-faceoff django-hangman django-hangman-showdown django-hangman-wanted bubble-battle block-battle',
 party:'taskmaster-micro-relay taskmaster-fruit-ninja taskmaster-sumo task-tallest-thing taskmaster-curling tm-cones microgame-rush rush-marathon review-pancakes newlywed-spirit roast-battle draw-it kitchen-service paddys-beer-pong flipadelphia-cup paddys-darts terminator-scan hungry-hungry-heads home-alone-paint-can angry-heads gopher-hunt tarantino-twist tarantino-adrenaline tarantino-standoff tarantino-chase bond-laser-vault bond-golden-gun bond-goldfinger-bomb sp-cheesy-poofs sp-killed-kenny snowball-fight candy-gumdrop-catch smb3-spade-slots',
 trivia:'price-bid-off newlywed-spirit',
 casino:'blackjack five-card roulette bond-baccarat liars-dice full-shambyahtzee',
 pinball:'bucketheadland-pinball black-sabbath-pinball king-gizzard-pinball',
 coop:'living-dead-horde space-swarm-coop rainbow-rivals'};
const CAT_OF=new Map();for(const [cat,ids] of Object.entries(CAT_IDS))for(const id of ids.split(' '))(CAT_OF.get(id)||CAT_OF.set(id,new Set()).get(id)).add(cat);
const BASE={puzzle:'puzzle',strategy:'board',skill:'party',sports:'sports',trivia:'trivia',casino:'casino',dice:'casino',duel:'versus',coop:'coop',arcade:'retro'};
const OLD={arcade:'retro',strategy:'board',skill:'party',dice:'casino'};
function categoriesOf(g){const out=new Set(CAT_OF.get(g.id)||[]);if(g.category==='duel'||g.engine==='trivia')out.add(BASE[g.category]);if(!out.size&&BASE[g.category])out.add(BASE[g.category]);if(g.category==='coop'||g.cooperative)out.add('coop');return out;}
const inCategory=(g,cat)=>cat==='all'||categoriesOf(g).has(OLD[cat]||cat);
const CAT_NAME=Object.fromEntries(CATEGORIES);

// Characters picked by hand where the source match would choose someone odd.
const HERO={broforce:'rambo','bucketheadland-pinball':'buckethead','black-sabbath-pinball':'ozzy-osbourne','cv-symphony':'alucard','kill-bill-duel':'kb-the-bride','tarantino-crazy88':'kb-the-bride','tarantino-bounty':'dj-django','pac-maze-duel':'pac-man','pkmn-wild':'pikachu','pkmn-trainer':'ash-ketchum','paddys-beer-pong':'charlie','flipadelphia-cup':'charlie','terminator-scan':'terminator','t800-scan-long':'terminator','matrix-hardline-hack':'neo','evil-dead-cabin':'ash','django-hangman':'dj-django','django-hangman-showdown':'dj-king-schultz','django-hangman-wanted':'dj-django','sewer-clash':'leonardo-tmnt','snake-run':'snake','shred-hero':'buckethead','king-gizzard-pinball':'ref-stumackenzie','deadite-checkers':'ash','tarantino-chase':'dp-stuntman-mike','tarantino-adrenaline':'pf-vincent','tarantino-twist':'pf-jules','tarantino-standoff':'pf-jules'};

// ---- pictures ----
const own=id=>{const u=id&&USER_PORTRAITS['photo:char:'+id];return isRasterArt(u)?u:null;};
const norm=s=>String(s||'').toLowerCase().replace(/^the /,'').replace(/[^a-z0-9]+/g,'');
let bySource=null;
function sourceIndex(){if(bySource)return bySource;bySource=new Map();for(const c of CHARACTERS){if(!own(c.id))continue;const k=norm(c.source);if(!k)continue;if(!bySource.has(k))bySource.set(k,[]);bySource.get(k).push(c.id);}return bySource;}
const heroCache=new Map();
function heroId(g){
 if(heroCache.has(g.id))return heroCache.get(g.id);
 let id=HERO[g.id]&&own(HERO[g.id])?HERO[g.id]:null;
 if(!id&&g.bossId){const b=bossById(g.bossId);for(const c of [b?.unlockId,g.bossId])if(own(c)){id=c;break;}}
 if(!id){const k=norm(g.source),idx=sourceIndex();const hit=idx.get(k)||[...idx.entries()].find(([s])=>k.length>3&&s.length>3&&(s.startsWith(k)||k.startsWith(s)))?.[1];if(hit?.length)id=hit[Math.abs(hash(g.id))%hit.length];}
 if(!id){const f=FAMILY.get(familyOf(g));if(f&&own(f.hero))id=f.hero;}
 heroCache.set(g.id,id||null);return id||null;
}
function hash(s){let h=0;for(const ch of String(s))h=(h*31+ch.charCodeAt(0))|0;return h;}
const hue=s=>((hash(norm(s))%360)+360)%360;
// The cut-out with the neon outline; games without a character fall back to their own art, then their icon.
// Owner's own tile art wins: assets/tiles/<game id>.webp, or <family key>.webp for a family tile.
const dropArt=(kind,k)=>{const u=k&&USER_PORTRAITS[kind+':'+k];return u&&(isRasterArt(u)||/^data:image\/svg|\.svg$/i.test(u))?u:null;};
const tileArt=k=>dropArt('tile',k);
// Key art: a big picture for the hero (assets/keyart/<game id or family key>.*), shown full-bleed behind the selected game.
const keyArt=it=>it&&(dropArt('keyart',it.fam?.key)||dropArt('keyart',it.g?.id)||dropArt('keyart',it.g&&familyOf(it.g)));   // a version listed on its own uses its family's picture
// What must stay in view in each big picture: [x0,y0,x1,y1] as fractions of the picture, drawn tight round Sean's and Amber's
// faces (owner, Nov 3: "backgrounds still cut off the faces"; check with a contact sheet of the boxes drawn on the pictures).
// placeKey() sizes and moves the picture so this box is always fully on screen on any phone/tablet/desktop, beside the
// text on wide screens and above it on tall ones; it zooms out (edges fade into the backdrop) rather than cut it off.
// New key art: add its box here (slot = game id or family key); without one the middle of the picture is kept.
const KEY_BOX={baseball:[.664,.385,.929,.579], 'black-sabbath-pinball':[.674,.299,.887,.533], bond:[.302,.394,.608,.762], bosses:[.296,.501,.58,.828],
 'bricks-breaker-quest':[.77,.478,.947,.656], broforce:[.579,.308,.816,.542], 'bucketheadland-pinball':[.387,.391,.799,.713], candy:[.668,.342,.795,.442],
 casino:[.412,.299,.688,.516], castlevania:[.555,.542,.758,.691], clue:[.746,.524,.827,.619], doom:[.526,.168,.831,.506], 'doom-2':[.454,.302,.731,.502],
 ducks:[.604,.352,.916,.519], 'greed-island-mancala':[.331,.034,.677,.251], hangman:[.258,.1,.709,.617], hyrule:[.565,.478,.77,.638],
 invaders:[.47,.63,.818,.805], kart:[.47,.258,.787,.601], 'king-gizzard-pinball':[.351,.305,.583,.668], matrix:[.6,.442,.826,.606],
 monopoly:[.647,.29,.929,.598], 'pac-maze-duel':[.374,.666,.902,.935], paddys:[.477,.345,.838,.517], pinball:[.3,.15,.75,.6], rush:[.287,0,.738,.58],
 smb:[.296,.493,.494,.792], sonic:[.597,.37,.836,.773], southpark:[.514,.395,.934,.794], tarantino:[.54,.483,.785,.626], taskmaster:[.619,.446,.819,.582],
 terminator:[.474,.378,.772,.597], trek:[.454,.218,.748,.478], trivia:[.44,.244,.829,.57]};
const KEY_BOX_DEFAULT=[.28,.15,.72,.85];
const keyBox=it=>KEY_BOX[it.fam?.key]||KEY_BOX[it.g?.id]||KEY_BOX[familyOf(it.g)]||KEY_BOX_DEFAULT;
// Behind the picture: a blurred copy covering the whole screen, shown only when the picture had to zoom out (no bare backdrop).
const keySlot=it=>it&&[it.fam?.key,it.g?.id,it.g&&familyOf(it.g)].find(k=>k&&dropArt('keyart',k));
const keyImg=it=>{const b=keyBox(it),u=e(keyArt(it));return `<img class="arc-keyfill" src="${u}" alt="" decoding="sync" hidden><img src="${u}" alt="" decoding="sync" data-box="${b.join(',')}" data-slot="${e(keySlot(it)||'')}" style="transform-origin:${(b[0]+b[2])*50}% ${(b[1]+b[3])*50}%">`;};
// Backgrounds kept ready (owner, Nov 3: "it should be immediate"): every picture is fetched once and held, so a new <img> of it
// has its bytes at once; the ones next to the focused tile are decoded too. Held images let the browser drop decoded pixels
// under memory pressure, so swapKeyArt below still waits for its own decode.
const warmed=new Map();
function warmPic(u,decode=false){if(!u||typeof Image==='undefined')return Promise.resolve();let w=warmed.get(u);
 if(!w){const im=new Image();im.decoding='async';w={im,load:new Promise(r=>{im.onload=im.onerror=r;})};im.src=u;warmed.set(u,w);}
 if(decode&&!w.dec)w.dec=w.load.then(()=>w.im.decode?.()).catch(()=>{});return w.dec||w.load;}
let warmRun=0;
async function warmKeyArt(){if(typeof Image==='undefined')return;const run=++warmRun,items=current?.items||[],at=Math.max(0,items.findIndex(x=>x.key===state.focus));
 const near=items.map((it,i)=>[Math.abs(i-at),keyArt(it)]).filter(x=>x[1]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
 const all=Object.keys(USER_PORTRAITS).filter(k=>k.startsWith('keyart:')&&!/-logo$|-word-/.test(k)).map(k=>USER_PORTRAITS[k]);
 const list=[...new Set([...near,...all])];
 for(let i=0;i<list.length;i++){await warmPic(list[i],i<5);if(run!==warmRun)return;await new Promise(r=>setTimeout(r,30));}}
const SPILL=1.3;   // how much bigger than its area the faces' box may get before the picture zooms out instead
// The owner's locked setting (Background Picker) for the screen nearest this one, by shape first, then size, with that
// screen's size ({z,fx,fy,w,h}); null = automatic. Screens with the other layout (text beside the picture vs under it) only
// count when no locked screen has this one's.
const sideLayout=(w,h)=>w>=700||(w>h&&h<=520);
function lockedPlace(slot,W,H){const t=slot&&KEY_PLACE[slot];if(!t)return null;let best=null,bd=1e9;
 for(const [id,w,h] of KEY_SCREENS){if(!t[id])continue;const d=3*Math.abs(Math.log((W/H)/(w/h)))+.5*Math.abs(Math.log((W*H)/(w*h)))+(sideLayout(w,h)!==sideLayout(W,H)?9:0);if(d<bd){bd=d;best=[id,w,h];}}
 return best&&{...t[best[0]],id:best[0],w:best[1],h:best[2]};}
// A locked setting moved onto a screen that isn't exactly the one it was locked on (owner, Nov 3: "pick closest one and scale
// smart based on that one"). Zoom and focus point alone are relative to the screen's centre, so on a shorter or longer phone
// the faces drifted under the text, which is pinned to the bottom. Instead the faces' box keeps its place relative to the
// free space between the controls and the text (tall) or right of the text (wide), as the owner saw it on the locked screen:
// same share of the width, same gap above the text; with less height it first uses up the room above the faces and only
// then gets smaller, with more height the extra room is shared out like the room above and below them was. Edges the
// picture covered there stay covered when a small zoom or nudge does it. On the locked screen itself this gives exactly the
// locked placement. free = this screen's {x0,x1,y0,y1} free space; the locked screen's is worked out from it: the controls
// keep their height, the text and tiles their distance from the bottom and (wide) the text column its share of the width.
function mapLock(lock,box,iw,ih,W,H,free,side){
 const {w:Wr,h:Hr}=lock,cr=Math.max(Wr/iw,Hr/ih),sr=cr*lock.z,dwr=iw*sr,dhr=ih*sr,Lr=Wr/2-lock.fx*dwr,Tr=Hr/2-lock.fy*dhr;
 const ref={x0:side?free.x0*Wr/W:free.x0,x1:side?Wr-(W-free.x1)*Wr/W:Wr-(W-free.x1),y0:free.y0,y1:Hr-(H-free.y1)};
 const [bx0,by0,bx1,by1]=box,bcx=(bx0+bx1)/2;
 const By0=Tr+by0*dhr,BH=(by1-by0)*dhr,m0=By0-ref.y0,m1=ref.y1-(By0+BH),need=BH+m1+Math.min(m0,0),Ah=free.y1-free.y0;
 const k=Math.max(.55*W/Wr,Math.min(W/Wr,side?(free.x1-free.x0)/Math.max(1,ref.x1-ref.x0):9,need>1?Ah/need:9));   // never under 55% of the width ratio
 const slack=Ah-k*need,room=Math.max(m0,0)*k;
 const faceTop=free.y0+Math.min(m0,0)*k+(slack>=room?room+(slack-room)*(m0>0&&m1>0?m0/(m0+m1):.5):Math.max(0,slack));
 // across: the box's centre keeps its share of the free width
 const ux=(Lr+bcx*dwr-ref.x0)/Math.max(1,ref.x1-ref.x0),cx=free.x0+ux*(free.x1-free.x0);
 let s=sr*k;const cov={l:Lr<=.5,r:Lr+dwr>=Wr-.5,t:Tr<=.5,b:Tr+dhr>=Hr-.5};
 // an axis the picture filled there: zoom in a little (up to 12%, round the faces' centre) if that fills it here too
 const need2=Math.max(cov.l&&cov.r?W/(iw*s):1,cov.t&&cov.b?H/(ih*s):1),grow=need2>1&&need2<=1.12?need2:1;
 const fcy=faceTop+BH*k/2;s*=grow;
 const dw=iw*s,dh=ih*s;let L=cx-bcx*dw,T=fcy-(by0+by1)/2*dh;
 // covered edges stay covered, moving the picture at most a tenth of the screen and never pushing the faces further out of
 // the free space (on a short screen that nudge put them under the buttons)
 const pin=(p,d,len,lo,hi,f0,f1,a0,a1)=>{let q=p;if(lo&&hi&&d>=len)q=Math.min(0,Math.max(len-d,p));else if(lo)q=Math.min(p,0);else if(hi)q=Math.max(p,len-d);
  q=Math.max(p-Math.max(0,f0-a0),Math.min(p+Math.max(0,a1-f1),q));return Math.abs(q-p)<=len*.1?q:p;};
 L=pin(L,dw,W,cov.l,cov.r,L+bx0*dw,L+bx1*dw,free.x0,free.x1);T=pin(T,dh,H,cov.t,cov.b,T+by0*dh,T+by1*dh,free.y0,free.y1);
 return {s,left:L,top:T};}
const clampR=(v,lo,hi)=>lo>hi?(lo+hi)/2:Math.min(hi,Math.max(lo,v));
function placeKey(img){
 const root=img?.closest?.('.arcade-console');if(!root||!img.naturalWidth||!img.dataset.box)return;
 const R=root.getBoundingClientRect(),W=R.width,H=R.height,iw=img.naturalWidth,ih=img.naturalHeight;if(!W||!H)return;
 const [bx0,by0,bx1,by1]=img.dataset.box.split(',').map(Number);
 const rel=sel=>{const el=root.querySelector(sel),r=el&&el.getBoundingClientRect();return r&&r.height?{l:r.left-R.left,t:r.top-R.top,r:r.right-R.left,b:r.bottom-R.top}:null;};
 const side=matchMedia('(min-width:700px),(orientation:landscape) and (max-height:520px)').matches;
 const info=rel('.arc-info'),row=rel('.arc-row-head')||rel('.arc-row');
 // clear of every control: below the top bar, the category pills and the player strip (and the search box when open)
 const top=Math.max(H*.06,...['.arc-top','.arc-pills','.arc-strip','.arc-search'].map(q=>rel(q)?.b||0))+8;
 // where the faces may go: tall = between the strip and the text; wide = right of the text (down to the tiles) or, when that
 // is narrow, the full width above the text; whichever lets the picture show biggest (closest to filling the screen)
 const bw=(bx1-bx0)*iw,bh=(by1-by0)*ih,cover=Math.max(W/iw,H/ih);
 const bot=(row?.t??H*.8)-8,areas=[];
 if(!side)areas.push([W*.02,top,W*.98,Math.max(top+60,info?info.t-6:H*.6)]);
 else{areas.push([info&&info.r<W*.75?info.r+12:W*.02,top,W*.98,Math.max(top+60,bot)]);if(info&&info.t-6-top>60)areas.push([W*.02,top,W*.98,info.t-6]);}
 const fitIn=a=>.95*Math.min((a[2]-a[0])/bw,(a[3]-a[1])/bh);
 const [ax0,ay0,ax1,ay1]=areas.reduce((a,b)=>fitIn(b)>fitIn(a)*1.02?b:a);
 // fill the screen first: the faces may spill a little past their area (into the text's edge, never the buttons) rather
 // than the picture zooming out and leaving empty space (owner, Nov 3: "a little covering isn't the end of the world")
 const s0=Math.min(cover,fitIn([ax0,ay0,ax1,ay1])*SPILL,.94*W/bw,.94*(H-top)/bh);   // but never past the screen's edges
 const lock=lockedPlace(img.dataset.slot,W,H);
 const mapped=lock&&mapLock(lock,[bx0,by0,bx1,by1],iw,ih,W,H,side?{x0:info&&info.r<W*.75?info.r+12:W*.02,x1:W*.98,y0:top,y1:Math.max(top+60,bot)}:{x0:0,x1:W,y0:top,y1:Math.max(top+60,info?info.t-6:H*.6)},side);
 const s=mapped?mapped.s:s0,dw=iw*s,dh=ih*s;
 // wide: the box sits right of the text when it fits there, else as far right as it can
 const cx=(ax0+ax1)/2,cy=(ay0+ay1)/2;
 // keep the box inside its area; cover the screen on an axis where the picture is big enough, else stay inside the screen
 // when the faces are bigger than their area, `bias` says where they spill: 0 = keep their top edge (spill down into the
 // text on tall screens), 1 = keep their right edge (spill left towards the text on wide ones)
 const solve=(want,d,L,b0,b1,a0,a1,bias)=>{const lo=a0-b0*d,hi=a1-b1*d,p=lo>hi?lo+(hi-lo)*bias:clampR(want,lo,hi);const c0=d>=L?L-d:0,c1=d>=L?0:L-d;
  const l2=Math.max(lo,c0),h2=Math.min(hi,c1);return l2<=h2?clampR(p,l2,h2):p;};
 const left=mapped?mapped.left:solve(cx-(bx0+bx1)/2*dw,dw,W,bx0,bx1,ax0,ax1,1),topP=mapped?mapped.top:solve(cy-(by0+by1)/2*dh,dh,H,by0,by1,ay0,ay1,side?.35:0);
 // edges that end on screen fade into the backdrop
 const f=(n,d)=>n?`${Math.round(d*.16)}px`:'0px',fl=left>1,fr=left+dw<W-1,ft=topP>1,fb=topP+dh<H-1;
 const mask=(fl||fr||ft||fb)?`linear-gradient(90deg,#0000,#000 ${f(fl,dw)},#000 calc(100% - ${f(fr,dw)}),#0000),linear-gradient(180deg,#0000,#000 ${f(ft,dh)},#000 calc(100% - ${f(fb,dh)}),#0000)`:'none';
 const fill=img.previousElementSibling;if(fill?.classList.contains('arc-keyfill'))fill.hidden=!(fl||fr||ft||fb);
 Object.assign(img.style,{left:left+'px',top:topP+'px',width:dw+'px',height:dh+'px',maskImage:mask,webkitMaskImage:mask,maskComposite:'intersect',webkitMaskComposite:'source-in'});
 img.classList.add('placed');
 // the shade stays light over the faces' area (theme.css .has-key .arc-shade reads these)
 // a locked picture keeps the shade the owner saw in the Background Picker: clear from the controls down to the tiles
 // (wide) or to the text (tall)
 const sy0=lock?top:ay0,sy1=lock?(side?bot:(info?info.t-6:H*.6)):ay1;
 root.classList.toggle('key-above',!lock&&side&&ax0<W*.1);
 root.style.setProperty('--key-y0',(sy0/H*100).toFixed(1)+'%');root.style.setProperty('--key-y1',(sy1/H*100).toFixed(1)+'%');
}
const placeKeys=()=>{if(typeof document!=='undefined')document.querySelectorAll('.arc-keyart img').forEach(placeKey);};
if(typeof document!=='undefined'){document.addEventListener('load',ev=>{if(ev.target?.closest?.('.arc-keyart'))placeKey(ev.target);},true);
 let rz=0;addEventListener('resize',()=>{cancelAnimationFrame(rz);rz=requestAnimationFrame(placeKeys);});}
// A game's own logo (assets/keyart/<game id or family key>-logo.*, transparent) replaces the plain title on the hero, the version page and the tile.
const logoOf=it=>it&&(dropArt('keyart',it.fam?.key&&it.fam.key+'-logo')||dropArt('keyart',it.g?.id&&it.g.id+'-logo')||(it.g&&familyOf(it.g)&&dropArt('keyart',familyOf(it.g)+'-logo')));
const titleHTML=(title,logo)=>logo?`<h2 class="arc-title arc-title-logo"><span>${e(title)}</span><img src="${e(logo)}" alt="" draggable="false"></h2>`:`<h2 class="arc-title">${e(title)}</h2>`;
function art(g,{fam=null,size=''}={}){
 const drop=tileArt(fam?.key)||tileArt(g?.id)||(g?.id&&tileArt(familyOf(g)));if(drop)return `<img class="arc-cut arc-drop${size}" src="${e(drop)}" alt="" loading="lazy" draggable="false">`;
 const cid=fam?.hero&&own(fam.hero)?fam.hero:g?.id?heroId(g):null;
 if(cid)return `<img class="arc-cut${size}" src="${e(own(cid))}" alt="" loading="lazy" draggable="false">`;
 const gameArt=g&&g.id!=='wopr-grid'&&ART[`game:${g.id}`];
 if(gameArt)return `<img class="arc-card-art${size}" src="${e(gameArt)}" alt="" loading="lazy" draggable="false">`;
 return `<span class="arc-emoji${size}" aria-hidden="true">${e(g?.icon||'🎮')}</span>`;
}

// ---- the screen ----
const state={focus:null,family:null,grid:false};
let current=null;
// opts: {list, partsFor(g), filter, filters:[[id,label]], query, strip (1P/online strip HTML), devStrip, extraBosses}
function arcadeConsoleHTML(opts){
 const {list,filter,filters,query,strip,devStrip,familyPool=list}=opts;const grouped=!query&&filter==='all'; // families only on the main list; categories, bosses and search list every game (but ONE_TILE)
 const items=[],seen=new Set();
 for(const g of list){const fk0=familyOf(g),one=ONE_TILE.has(fk0),fk=(grouped||one)&&fk0;
  if(fk){const members=(one?familyPool:list).filter(x=>familyOf(x)===fk);if(members.length>1||fk==='bosses'){if(!seen.has(fk)){seen.add(fk);items.push({key:'f:'+fk,fam:FAMILY.get(fk),members,g:members[0]});}continue;}}
  items.push({key:'g:'+g.id,g});}
 current={...opts,items};
 let at=items.findIndex(it=>it.key===state.focus);if(at<0){at=0;state.focus=items[0]?.key||null;}
 const pills=filters.map(([id,label])=>`<button class="arc-pill${id===filter?' on':''}" data-action="filter" data-id="${e(id)}">${e(label)}</button>`).join('');
 const tiles=items.map((it,i)=>tileHTML(it,i,i===at)).join('');const root0=items[at];
 return `<main class="arcade-console${root0&&keyArt(root0)?' has-key':''}" style="${heroVars(items[at])}"><div class="arc-wash" aria-hidden="true"></div>
  <div class="arc-keyart" aria-hidden="true">${items[at]&&keyArt(items[at])?`<div class="arc-layer">${keyImg(items[at])}</div>`:''}</div>
  <div class="arc-hero-art" aria-hidden="true">${items[at]&&!keyArt(items[at])?`<div class="arc-layer">${heroArt(items[at])}</div>`:''}</div><div class="arc-shade" aria-hidden="true"></div>
  <header class="arc-top"><button class="arc-icon" data-action="home" aria-label="Back to the title screen">←</button><b class="arc-brand">Arcade</b>
   <span class="arc-top-r"><button class="arc-icon" data-action="arcade-random" aria-label="Random game" title="Random game">🎲</button><button class="arc-icon arc-search-btn${query?' on':''}" data-arc-search aria-label="Search games">⌕</button></span></header>
  <div class="arc-search"${query?'':' hidden'}><input id="catalog-search" type="search" value="${e(query)}" placeholder="Search games or shows…" aria-label="Search games" autocomplete="off"></div>
  <nav class="arc-pills" aria-label="Game categories">${pills}</nav>
  <div class="arc-strip">${strip||''}</div>
  <section class="arc-info arc-info-in" aria-live="polite">${items[at]?infoHTML(items[at]):`<p class="arc-empty">${query?'Nothing here yet. Try another category.':filter==='recent'?'The games you play will show up here.':filter==='favorites'?'Tap ☆ on any game to keep it here.':'Nothing here yet. Try another category.'}</p>`}</section>
  <div class="arc-row-head"><span class="arc-row-label">${e(filters.find(f=>f[0]===filter)?.[1]||'Games')} · ${items.length}</span>${items.length>1?'<button class="arc-viewall" data-arc-all>View all ▸</button>':''}</div>
  <div class="arc-row" role="listbox" aria-label="Games">${tiles}</div>
  ${devStrip?`<div class="arc-dev">${devStrip}</div>`:''}
  <section class="arc-grid-page"${state.grid?'':' hidden'} aria-label="All games">${state.grid?gridHTML():''}</section>
  <section class="arc-fam"${state.family?'':' hidden'} aria-label="Versions">${state.family?familyHTML(state.family):''}</section></main>`;
}
function heroVars(it){const g=it?.g,h=hue(it?.fam?.title||g?.source||'');return `--arc-h:${h}`;}
function heroArt(it){return art(it.g,{fam:it.fam,size:' big'});}
function tileHTML(it,i,on){const g=it.g,locked=!it.fam&&!current.partsFor(g).open;
 return `<button class="arc-tile${on?' on':''}${locked?' locked':''}" role="option" aria-selected="${on}" data-arc-focus="${i}" style="--arc-h:${hue(it.fam?.title||g.source)};--i:${Math.min(i,14)}" aria-label="${e(it.fam?.title||g.title)}">${art(g,{fam:it.fam})}${it.fam?`<span class="arc-count">×${it.fam.key==='bosses'?bossTotal():it.members.length}</span>`:''}${locked?'<span class="arc-lock" aria-hidden="true">🔒</span>':''}${logoOf(it)?`<span class="arc-tile-name has-logo" aria-hidden="true"><img src="${e(logoOf(it))}" alt="" loading="lazy" draggable="false"></span>`:`<span class="arc-tile-name" aria-hidden="true"><span>${e(tileName(it))}</span></span>`}</button>`;}
// The name on a tile: the family or game title, the separator dropped so it wraps cleanly on two lines.
const tileName=it=>(it.fam?.title||it.g.title).replace(/^Boss · /,'').replace(/ · /,' ');
function bossTotal(){return (current.extraBosses||[]).length+current.items.find(x=>x.fam?.key==='bosses')?.members.length||0;}
// The genre line sits under the title/logo, above the chips (owner, Nov 3: above the logo it ran across the faces).
function infoHTML(it){
 if(it.fam){const f=it.fam,n=f.key==='bosses'?bossTotal():it.members.length,played=it.members.filter(g=>store.profile.played.includes(g.id)).length;
  return `${titleHTML(f.title,logoOf(it))}<div class="arc-src">${e(f.sub)}</div><div class="arc-chips"><span>${n} ${f.key==='bosses'?'bosses':'versions'}</span>${played?`<span>${played} played</span>`:''}${f.key==='bosses'?`<span>${it.members.length} beaten</span>`:''}</div>
   <p class="arc-rules">${e(it.members.slice(0,6).map(g=>shortTitle(g,f)).join(' · '))}${it.members.length>6?' …':''}</p>
   <div class="arc-actions"><button class="arc-cta" data-arc-family="${e(f.key)}">Choose a version ▸</button></div>`;}
 const g=it.g,p=current.partsFor(g);
 return `${titleHTML(g.title,logoOf(it))}<div class="arc-src">${e(g.srcLabel||g.source)} · ${e(catName(g))}</div><div class="arc-chips">${p.chips.map(c=>`<span>${c}</span>`).join('')}</div>
  <p class="arc-rules">${e(g.rules||'')}</p><div class="arc-actions">${quick(p.play)}${starHTML(g)}${p.dev||''}</div>`;
}
// The ☆ next to a game's play button keeps it on the Favorites shelf.
function starHTML(g){const on=(store.profile.favorites||[]).includes(g.id);return `<button class="arc-star${on?' on':''}" data-arc-star="${e(g.id)}" aria-pressed="${on}" aria-label="${on?'Remove from favorites':'Add to favorites'}">${on?'★':'☆'}</button>`;}
// The console's Play buttons start the game at once (no Start/Back card; app.js passes quick to requestGame).
const quick=html=>String(html).replace(/data-action="arcade-(game|solo)"/,'data-quick="1" data-action="arcade-$1"');
const catName=g=>g.bossId?'Boss':g.pokemon?'Pokémon':[...categoriesOf(g)].map(c=>CAT_NAME[c]).filter(Boolean)[0]||'Game';
function shortTitle(g,f){const t=g.title.replace(/^Boss · /,'');const parts=t.split(' · ');return parts.length>1&&norm(parts[0]).includes(norm(f.title).slice(0,5))?parts.slice(1).join(' · '):t.replace(/^Broforce: /,'');}
function familyHTML(key){const f=FAMILY.get(key);if(!f||!current)return '';
 let members=current.items.find(it=>it.fam?.key===key)?.members||current.list.filter(g=>familyOf(g)===key);if(key==='bosses')members=[...members,...(current.extraBosses||[])];
 const cards=members.map((g,i)=>{const p=current.partsFor(g);return `<article class="arc-ver${p.open?'':' locked'}" style="--arc-h:${hue(g.source)};--i:${Math.min(i,12)}"><div class="arc-ver-art">${dropArt('keyart',g.id)&&!tileArt(g.id)?`<img class="arc-card-art" src="${e(dropArt('keyart',g.id))}" alt="" loading="lazy">`:art(g)}${p.open?'':'<span class="arc-lock" aria-hidden="true">🔒</span>'}</div>
  <div class="arc-ver-body"><h3>${e(shortTitle(g,f))}</h3><div class="arc-chips small">${p.chips.map(c=>`<span>${c}</span>`).join('')}</div><p>${e(g.rules||'')}</p><div class="arc-actions">${quick(p.play)}${starHTML(g)}${p.dev||''}</div></div></article>`;}).join('');
 return `<header class="arc-fam-top"><button class="arc-icon" data-arc-close aria-label="Back to the Arcade">←</button><div><div class="arc-src">${e(f.sub)}</div>${titleHTML(f.title,logoOf({fam:f}))}</div></header>
  <div class="arc-fam-hero" aria-hidden="true">${art(members[0]||{},{fam:f,size:' big'})}</div><div class="arc-ver-grid">${cards}</div>`;}

// Focus a tile without rebuilding the screen (fast, keeps the row's scroll position).
// "View all": every tile of the current list as big blocks you scroll through (owner, Nov 3).
function gridHTML(){if(!current)return '';const lab=current.filters.find(f=>f[0]===current.filter)?.[1]||'Games';
 return `<header class="arc-fam-top"><button class="arc-icon" data-arc-grid-close aria-label="Back to the Arcade">←</button><div><div class="arc-src">${current.items.length} ${current.items.length===1?'game':'tiles'}</div><h2 class="arc-title">${e(lab)}</h2></div></header>
  <div class="arc-block-grid">${current.items.map((it,i)=>{const g=it.g,locked=!it.fam&&!current.partsFor(g).open;
   return `<button class="arc-block${locked?' locked':''}" data-arc-pick="${i}" style="--arc-h:${hue(it.fam?.title||g.source)};--i:${Math.min(i,16)}"><span class="arc-block-art">${art(g,{fam:it.fam})}${it.fam?`<span class="arc-count">×${it.fam.key==='bosses'?bossTotal():it.members.length}</span>`:''}${locked?'<span class="arc-lock" aria-hidden="true">🔒</span>':''}</span><span class="arc-block-name">${e(it.fam?.title||g.title)}</span><span class="arc-block-sub">${e(it.fam?it.fam.sub:catName(g))}</span></button>`;}).join('')}</div>`;}
function openGrid(){const root=document.querySelector('.arcade-console');if(!root)return;state.grid=true;const s=root.querySelector('.arc-grid-page');s.classList.remove('arc-fam-out');s.innerHTML=gridHTML();s.hidden=false;s.scrollTop=0;restart(s,'arc-fam-in');}
function closeGrid(){state.grid=false;const s=document.querySelector('.arcade-console .arc-grid-page');if(!s)return;if(matchMedia('(prefers-reduced-motion: reduce)').matches){s.hidden=true;s.innerHTML='';return;}s.classList.add('arc-fam-out');setTimeout(()=>{if(state.grid)return;s.hidden=true;s.innerHTML='';s.classList.remove('arc-fam-out');},260);}
// Swap a picture layer: the new one slides/fades in while the old one fades out (direction follows the tile row).
function swapLayer(box,html){if(!box)return;const old=[...box.children];old.forEach(o=>{o.classList.add('arc-layer-out');setTimeout(()=>o.remove(),460);});
 if(!html)return;const layer=document.createElement('div');layer.className='arc-layer arc-layer-in';layer.innerHTML=html;box.append(layer);}
// The background swap: the old picture stays until the new one is decoded, then the new one fades in on top of it, so the plain
// colour behind them never shows (owner, Nov 3). Tapping on quickly only ever shows the last tile picked.
let keySwap=0;
function swapKeyArt(box,it,key,then){if(!box)return;const run=++keySwap;if(!key){swapLayer(box,'');then();return;}
 const layer=document.createElement('div');layer.className='arc-layer arc-layer-in';layer.innerHTML=keyImg(it);const img=layer.querySelector('img:not(.arc-keyfill)');
 const show=()=>{if(run!==keySwap||!box.isConnected)return;then();const old=[...box.children];box.append(layer);placeKey(img);old.forEach(o=>{o.classList.add('arc-layer-under');setTimeout(()=>o.remove(),600);});};
 Promise.race([Promise.resolve(img.decode?.()).catch(()=>{}),new Promise(r=>setTimeout(r,1500))]).then(show);}
function restart(el,cls){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);}
function focusTile(i,{scroll=true}={}){
 const root=document.querySelector('.arcade-console');if(!root||!current)return;const it=current.items[i];if(!it)return;
 const was=current.items.findIndex(x=>x.key===state.focus);if(was===i)return;
 state.focus=it.key;root.style.setProperty('--arc-dir',i>=was?1:-1);root.style.setProperty('--arc-h',hue(it.fam?.title||it.g.source));
 const key=keyArt(it);
 swapKeyArt(root.querySelector('.arc-keyart'),it,key,()=>{root.classList.toggle('has-key',!!key);swapLayer(root.querySelector('.arc-hero-art'),key?'':heroArt(it));});for(const d of [1,-1,2,-2])warmPic(keyArt(current.items[i+d]),true);
 const info=root.querySelector('.arc-info');info.innerHTML=infoHTML(it);restart(info,'arc-info-in');
 root.querySelectorAll('.arc-tile').forEach((t,j)=>{t.classList.toggle('on',j===i);t.setAttribute('aria-selected',String(j===i));});
 const tile=root.querySelectorAll('.arc-tile')[i];if(scroll&&tile)tile.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',inline:'center',block:'nearest'});
 if(store.profile?.settings.sound)tone(660+((i%5)*40),.05,.02,'triangle');
}
function openFamily(key){const root=document.querySelector('.arcade-console');if(!root)return;state.family=key;const s=root.querySelector('.arc-fam');s.classList.remove('arc-fam-out');s.innerHTML=familyHTML(key);s.hidden=false;s.scrollTop=0;restart(s,'arc-fam-in');}
// Closing slides the version page away before hiding it.
function closeFamily(){state.family=null;const s=document.querySelector('.arcade-console .arc-fam');if(!s)return;if(matchMedia('(prefers-reduced-motion: reduce)').matches){s.hidden=true;s.innerHTML='';return;}s.classList.add('arc-fam-out');setTimeout(()=>{if(state.family)return;s.hidden=true;s.innerHTML='';s.classList.remove('arc-fam-out');},260);}
// After a rebuild: put the focused tile in view (no animation) and reopen the version page if one was open.
function installArcadeConsole(){const root=document.querySelector('.arcade-console');if(!root||!current)return;placeKeys();warmKeyArt();
 const i=current.items.findIndex(it=>it.key===state.focus);const tile=root.querySelectorAll('.arc-tile')[i];if(tile){const row=root.querySelector('.arc-row');row.scrollLeft=tile.offsetLeft-row.clientWidth/2+tile.clientWidth/2;}}
// The dice button: this game's own page (its picture, rules and Play button), not the game itself. It stays on this list when the
// game has its own tile here; otherwise it returns the category to switch to, whose list shows every game on its own.
function focusArcadeGame(g){const fk=ONE_TILE.has(familyOf(g))?'f:'+familyOf(g):'g:'+g.id,i=current?current.items.findIndex(it=>it.key===fk):-1;
 if(i>=0&&document.querySelector('.arcade-console')){if(state.grid)closeGrid();if(state.family)closeFamily();focusTile(i);return null;}
 state.focus=fk;state.family=null;state.grid=false;return g.bossId?'boss':g.pokemon?'pokemon':[...categoriesOf(g)].find(c=>CAT_NAME[c])||'all';}
function resetArcadeConsole(){state.focus=null;state.family=null;state.grid=false;}
if(typeof document!=='undefined')document.addEventListener('click',ev=>{
 const t=ev.target.closest?.('[data-arc-focus],[data-arc-family],[data-arc-close],[data-arc-search],[data-arc-all],[data-arc-pick],[data-arc-grid-close],[data-arc-star]');if(!t||!t.closest('.arcade-console'))return;
 if(t.dataset.arcStar){const id=t.dataset.arcStar,on=toggleFavorite(store.profile,id);saveProfile(store.profile);
  document.querySelectorAll('.arcade-console [data-arc-star]').forEach(b=>{if(b.dataset.arcStar!==id)return;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'Remove from favorites':'Add to favorites');b.textContent=on?'★':'☆';});
  if(store.profile.settings.sound)tone(on?880:440,.06,.02,'triangle');return;}
 if(t.dataset.arcAll!==undefined){openGrid();return;}
 if(t.dataset.arcGridClose!==undefined){closeGrid();return;}
 if(t.dataset.arcPick!==undefined){const i=+t.dataset.arcPick,it=current?.items[i];if(!it)return;closeGrid();focusTile(i);if(it.fam)openFamily(it.fam.key);return;}
 if(t.dataset.arcFocus!==undefined){const i=+t.dataset.arcFocus;if(current?.items[i]?.key===state.focus&&current.items[i].fam)openFamily(current.items[i].fam.key);else focusTile(i);}
 else if(t.dataset.arcFamily)openFamily(t.dataset.arcFamily);
 else if(t.dataset.arcClose!==undefined)closeFamily();
 else if(t.dataset.arcSearch!==undefined){const s=document.querySelector('.arcade-console .arc-search');s.hidden=!s.hidden;if(!s.hidden)s.querySelector('input').focus();}
});
// Swipe through the games (owner, Nov 4, M24): a sideways drag anywhere on the game's page (picture, logo, text, buttons)
// moves the picture and text with the finger; let go past ~22% of the width (or a quick flick) and the next game (drag left)
// or the previous one (drag right) comes in, like the arrow keys. Rows that scroll sideways themselves (tiles, category pills,
// player strip, search) and the version / View all pages keep their own touches. A drag that turned into a swipe doesn't
// also count as a tap on the button it started on. Vertical moves are left alone.
const SWIPE_SKIP='.arc-row,.arc-pills,.arc-strip,.arc-search,.arc-fam,.arc-grid-page,input,select,textarea';
let swipe=null,swallowClick=0;
function swipeParts(root){return [root.querySelector('.arc-info'),root.querySelector('.arc-keyart'),root.querySelector('.arc-hero-art')].filter(Boolean);}
function swipeMove(root,dx,anim){for(const el of swipeParts(root)){const k=el.classList.contains('arc-info')?1:.45;el.style.transition=anim?'transform .22s cubic-bezier(.2,.8,.3,1),opacity .22s':'none';
 el.style.transform=dx?`translateX(${(dx*k).toFixed(1)}px)`:'';if(el.classList.contains('arc-info'))el.style.opacity=dx?String(Math.max(.25,1-Math.abs(dx)/(root.clientWidth*.7))):'';}}
if(typeof document!=='undefined'){
 document.addEventListener('pointerdown',ev=>{const root=ev.target.closest?.('.arcade-console');
  if(!root||!current||state.family||state.grid||ev.button>0||ev.target.closest(SWIPE_SKIP)||current.items.length<2)return;
  swipe={root,id:ev.pointerId,x:ev.clientX,y:ev.clientY,t:performance.now(),on:false,dx:0};},true);
 document.addEventListener('pointermove',ev=>{if(!swipe||ev.pointerId!==swipe.id)return;const dx=ev.clientX-swipe.x,dy=ev.clientY-swipe.y;
  if(!swipe.on){if(Math.abs(dy)>14&&Math.abs(dy)>Math.abs(dx)){swipe=null;return;}if(Math.abs(dx)<12||Math.abs(dx)<Math.abs(dy)*1.4)return;swipe.on=true;swipe.root.classList.add('arc-swiping');}
  const i=current.items.findIndex(x=>x.key===state.focus),edge=(dx>0&&i<=0)||(dx<0&&i>=current.items.length-1);
  swipe.dx=edge?dx*.3:dx;swipeMove(swipe.root,swipe.dx,false);},true);
 const end=ev=>{if(!swipe||ev.pointerId!==swipe.id)return;const sw=swipe;swipe=null;if(!sw.on)return;sw.root.classList.remove('arc-swiping');swallowClick=performance.now();
  const W=sw.root.clientWidth||360,v=sw.dx/Math.max(1,performance.now()-sw.t),i=current?current.items.findIndex(x=>x.key===state.focus):-1,
   dir=ev.type==='pointercancel'?0:Math.abs(sw.dx)>W*.22||Math.abs(v)>.5&&Math.abs(sw.dx)>30?(sw.dx<0?1:-1):0,j=i+dir;
  if(dir&&current&&j>=0&&j<current.items.length){swipeMove(sw.root,0,false);focusTile(j);}else swipeMove(sw.root,0,true);};
 document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);
 // the tap that ended a swipe is not a click on whatever button it started on
 document.addEventListener('click',ev=>{if(performance.now()-swallowClick<350&&ev.target.closest?.('.arcade-console')){ev.stopPropagation();ev.preventDefault();swallowClick=0;}},true);
}
// Keyboard / controller-style browsing on desktop: left/right move the focus, Enter opens a family.
if(typeof document!=='undefined')document.addEventListener('keydown',ev=>{
 if(!document.querySelector('.arcade-console')||!current||ev.target.closest?.('input,textarea,dialog'))return;
 const i=current.items.findIndex(it=>it.key===state.focus);
 if(ev.key==='ArrowRight'||ev.key==='ArrowLeft'){ev.preventDefault();focusTile(Math.max(0,Math.min(current.items.length-1,i+(ev.key==='ArrowRight'?1:-1))));}
 else if(ev.key==='Escape'&&state.family)closeFamily();
 else if(ev.key==='Escape'&&state.grid)closeGrid();
});

// Pictures for the title screen's Arcade tile (owner, Nov 3: "cycling through recently played or featured games so they are
// always changing"): the given games (recent + featured) in a fresh random order every time the title screen is built,
// each as its tile icon (game, else family) or character cut-out; a few other families fill in when the list is short.
function arcadeReel(n=10,games=[]){const out=[];const add=u=>{if(u&&!out.includes(u))out.push(u);};
 const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 for(const g of shuffle(games.filter(Boolean))){if(out.length>=n)break;add(tileArt(g.id)||tileArt(familyOf(g))||own(heroId(g)));}
 for(const f of shuffle([...FAMILY.values()])){if(out.length>=Math.min(n,6))break;add(tileArt(f.key)||own(f.hero));}
 return out.slice(0,n);}
Object.assign(exports,{warmKeyArt,focusArcadeGame,arcadeReel,CATEGORIES,categoriesOf,inCategory,arcadeConsoleHTML,installArcadeConsole,resetArcadeConsole,familyOf,heroId,FAMILIES,FAMILY,keyArt,tileArt});
