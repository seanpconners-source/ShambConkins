// Kingpin Bowling: the alley you upgrade with the cash you win (src/engines/kingpinBowling.js), saved in profile.bowlAlley
// (checked by validAlley, called from profile.js). Owner (Nov 21): "Just like pool we can upgrade things one at a time: start
// with a 70s-80s shitty bowling alley, then 90s cool but kind of run down, all the way to a modern sleek badass bowling
// alley. Then a futuristic space alley!" Kingpin and The Big Lebowski themed.
// ERAS (index 0..4) are the looks every PART of the alley moves through, one part at a time and in order:
//  0 Ocelot Bowl (Ocelot, Iowa, 1979: Roy Munson's home lanes), 1 Hollywood Star Lanes (the Dude's lanes, 1991),
//  2 Cosmic Bowl (blacklight night, 1998), 3 The Reno Showdown (the million-dollar tournament, modern), 4 Gutterballs
//  Galactic (the Dude's dream, in space).
// LANES change how the lane PLAYS (oil + wear: physics makeLane cond): Ocelot's warped wood has dead spots and a crown,
// pro lanes are true, the space lane hooks like crazy. Balls: cover (how much they grip the dry boards), revs, weight.
const ERAS=[
 {id:'ocelot',name:'Ocelot Bowl',year:'1979',desc:'Ocelot, Iowa. Wood paneling, burnt-orange carpet, nicotine ceiling tiles and a flickering tube light. Roy Munson\'s home lanes.'},
 {id:'starlanes',name:'Hollywood Star Lanes',year:'1991',desc:'Googie stars on the carpet, teal and purple, colour TVs over the lanes. The Dude abides here. A bit run down.'},
 {id:'cosmic',name:'Cosmic Bowl',year:'1998',desc:'Lights out, blacklights on. Glowing pins, neon lanes, a fog machine and lasers.'},
 {id:'reno',name:'The Reno Showdown',year:'Today',desc:'The million-dollar tournament. Black lacquer, LED strips, giant HD screens, synthetic pro lanes.'},
 {id:'galactic',name:'Gutterballs Galactic',year:'2199',desc:'The Dude\'s dream, in orbit. Holo-pins, a starfield ceiling and the Earth out the window.'},
];
// the parts you upgrade (each era in order). price[i] = the price of era i (era 0 is free)
const PARTS={
 room:{name:'The Room',price:[0,350,900,2000,4200],what:'Walls, carpet, ceiling, seats',
  tiers:['Wood paneling and orange shag','Googie stars and teal vinyl','Blacklight murals and neon trim','Black lacquer and LED strips','A space station with a view']},
 lanes:{name:'The Lanes',price:[0,300,800,1800,3800],what:'The lane surface and its oil (they play differently)',
  tiers:['Warped wood with dead spots','Old wood, a fair house shot','Refinished wood, glow-in-the-dark arrows','Synthetic pro lanes, true every time','Anti-grav holo lanes: the ball hooks like crazy'],
  cond:[{len:12.2,mid:.03,edge:.07,dry:.22,spots:[{x:-.18,z:11.5,r:.5,k:.05},{x:.22,z:15.2,r:.4,k:-.06}],crown:.006},
   {len:12.8,mid:.024,edge:.065,dry:.24},{len:13,mid:.02,edge:.06,dry:.25},{len:13.2,mid:.018,edge:.06,dry:.26},{len:12.6,mid:.015,edge:.05,dry:.34}]},
 masking:{name:'The Masking',price:[0,200,600,1300,2800],what:'The big panels over the pins',
  tiers:['Faded bowling-pin murals','Hollywood stars and a bowling ball comet','Glow-in-the-dark galaxy','LED video panels','Holographic nebula']},
 screens:{name:'Score Screens',price:[0,250,700,1500,3200],what:'The overhead monitors and their strike animations',
  tiers:['Amber CRTs, blocky animations','Colour TVs, cartoon animations','Neon TVs, party animations','Giant HD screens, slick 3D animations','Holograms over the lanes']},
 lights:{name:'The Lights',price:[0,150,500,1100,2400],what:'Ceiling lights',
  tiers:['Flickering tube lights','Warm star pendants','Blacklights and lasers','LED strips and spotlights','Starlight']},
 pins:{name:'The Pins',price:[0,120,400,900,2000],what:'The pins and the pinsetter',
  tiers:['Chipped, yellowed pins','Clean white pins with red necks','Glowing pins','Pro pins, mirror finish','Holo-pins']},
};
const PART_IDS=Object.keys(PARTS);
// balls: cover = grip on dry boards (x the lane friction), revs = how much the player can put on it, lb = weight, rg = how
// late it rolls. look: base colours for the drawn swirl (drop-in picture: assets/bowling/ball-<id>.webp, an equirect wrap)
const BALLS=[
 {id:'house',name:'House Ball #12',price:0,cover:.62,revs:.7,lb:14,rg:.42,look:['#2f5fb3','#1d3c78'],desc:'Plastic, chipped, the holes fit nobody. Goes straight.'},
 {id:'ocelot',name:'Ocelot Special',price:150,cover:.78,revs:.85,lb:15,rg:.41,look:['#c96b1e','#6e2c0c'],desc:'Burnt orange urethane from the Ocelot pro shop.'},
 {id:'munson',name:'The Munson',price:350,cover:.88,revs:.95,lb:15,rg:.40,look:['#3f8f4b','#163d1d'],desc:'Roy\'s ball. "You\'re on a gravy train with biscuit wheels."'},
 {id:'dude',name:'The Dude Abides',price:500,cover:.92,revs:1,lb:14,rg:.40,look:['#3c7ac4','#e9e2cf'],desc:'Blue and cream, like a White Russian in a bowling bag.'},
 {id:'rug',name:'The Rug',price:650,cover:.95,revs:1,lb:15,rg:.40,look:['#8a2b1d','#d7b46a'],desc:'It really ties the lane together.'},
 {id:'walter',name:'Walter\'s Brass',price:800,cover:.93,revs:.9,lb:16,rg:.39,look:['#b38a2e','#4a3a14'],desc:'Heavy. "This is not \'Nam. This is bowling. There are rules."'},
 {id:'jesus',name:'The Jesus',price:1200,cover:1.05,revs:1.15,lb:15,rg:.38,look:['#7a2fb3','#e2c7ff'],desc:'Purple, polished, licked. "Nobody messes with the Jesus."'},
 {id:'big-ern',name:'Big Ern',price:1800,cover:1.08,revs:1.1,lb:16,rg:.38,look:['#e0b838','#fff4c2'],desc:'Gold glitter and a comb-over. Ernie McCracken\'s pride.'},
 {id:'nihilist',name:'The Nihilist',price:2200,cover:1.12,revs:1.15,lb:15,rg:.37,look:['#111114','#c2181f'],desc:'We believe in nothing. Except back-end reaction.'},
 {id:'reno-gold',name:'Reno Gold',price:3000,cover:1.16,revs:1.2,lb:15,rg:.37,look:['#f0c23c','#ffffff'],desc:'Million-dollar tournament ball. Tour-level hook.'},
 {id:'gutterball',name:'Gutterballs Nebula',price:4200,cover:1.2,revs:1.25,lb:15,rg:.36,look:['#2bd6ff','#ff3fb4'],desc:'From the dream sequence: glows, sparkles, never misses the pocket (much).'},
];
// shoes: steadier release (less hand shake), a faster approach (more speed)
const SHOES=[
 {id:'rental',name:'Rental Shoes',price:0,steady:0,speed:0,desc:'Size 11. Sprayed. Probably.'},
 {id:'two-tone',name:'Two-Tone Classics',price:120,steady:.15,speed:.02,desc:'Red and blue, the Ocelot standard.'},
 {id:'jelly',name:'Jelly Rollers',price:300,steady:.25,speed:.03,desc:'The Dude\'s sandals. Don\'t ask how they slide.'},
 {id:'pro',name:'Pro Sliders',price:700,steady:.4,speed:.04,desc:'Changeable slide soles. Smooth as Big Ern\'s hair.'},
 {id:'moon',name:'Moon Boots',price:1500,steady:.55,speed:.05,desc:'Magnetic soles, perfect slide.'},
];
// decor: shown in the alley (posters on the walls, things on the settee table); look only
const DECOR=[
 {id:'rug',name:'The Rug',price:120,desc:'It really tied the room together.',spot:'floor'},
 {id:'white-russian',name:'White Russian',price:60,desc:'On the score table, always half full.',spot:'table'},
 {id:'big-ern-poster',name:'Big Ern Poster',price:150,desc:'Ernie McCracken in rhinestones.',spot:'wall'},
 {id:'munson-poster',name:'"Getting Munsoned" Poster',price:150,desc:'1979 Iowa champion, before the hand.',spot:'wall'},
 {id:'rubber-hand',name:'The Rubber Hand',price:250,desc:'In a trophy case. Roy\'s old hand.',spot:'case'},
 {id:'mark-it-zero',name:'"Mark It Zero" Sign',price:100,desc:'Over the line! Mark it zero!',spot:'wall'},
 {id:'jesus-poster',name:'Jesus Quintana Poster',price:200,desc:'Eight-year-olds, Dude.',spot:'wall'},
 {id:'coffee-can',name:'Folgers-Style Coffee Can',price:80,desc:'Donny\'s urn. Watch the wind.',spot:'table'},
 {id:'amish-sign',name:'Amish Country Sign',price:120,desc:'Ishmael\'s farm says hi.',spot:'wall'},
 {id:'disco-ball',name:'Disco Ball',price:400,desc:'Spins over the lanes.',spot:'ceiling'},
 {id:'trophy',name:'Reno Trophy',price:900,desc:'The million-dollar trophy. A real one.',spot:'case'},
 {id:'neon-gutterballs',name:'GUTTERBALLS Neon',price:500,desc:'The dream sequence title, in neon.',spot:'wall'},
];
// perks: game helpers
const PERKS=[
 {id:'aim-line',name:'Lane Arrows Guide',price:200,desc:'Shows where your ball will cross the arrows while you aim.'},
 {id:'spare-ball',name:'Spare Ball Switch',price:350,desc:'Throw the straight house ball at spares with one tap.'},
 {id:'oil-man',name:'The Oil Man',price:600,desc:'Fresh oil every game: the lane doesn\'t break down.'},
 {id:'tip-jar',name:'Tip Jar',price:900,desc:'+15% cash every game.'},
 {id:'replay',name:'Pin Cam Replays',price:300,desc:'Slow-motion replay of every strike.'},
];
const TIP=.15;
// cash per game (each player wins their own): pins, strikes, spares, streaks, splits picked up, the match
const CASH={pin:1,strike:8,spare:4,double:10,turkey:25,bonus4:15,picked:25,clean:40,win:60,perfect:500,score200:50};
const START_CASH=80;
const byId=(list,id)=>list.find(q=>q.id===id);
function freshAlley(){const parts={};for(const k of PART_IDS)parts[k]=0;
 return {cash:START_CASH,parts,own:[],ball:'house',shoes:'rental',decor:[],hide:[],perks:[],
  stats:{games:0,best:0,strikes:0,spares:0,turkeys:0,perfect:0,gutters:0},set:{frames:10,hand:1,seen:false,guide:true}};}
const LISTS={ball:BALLS,shoes:SHOES};
function validAlley(saved){
 const h=freshAlley();if(!saved||typeof saved!=='object'||Array.isArray(saved))return h;
 const int=(v,d,max=1e9)=>Number.isFinite(v)&&v>=0?Math.min(max,Math.floor(v)):d;
 h.cash=int(saved.cash,START_CASH);
 if(saved.parts&&typeof saved.parts==='object')for(const k of PART_IDS)h.parts[k]=int(saved.parts[k],0,ERAS.length-1);
 if(Array.isArray(saved.own))h.own=[...new Set(saved.own.filter(k=>typeof k==='string'&&/^(ball|shoes):/.test(k)&&byId(LISTS[k.split(':')[0]],k.split(':')[1])))];
 if(typeof saved.ball==='string'&&owns(h,'ball',saved.ball))h.ball=saved.ball;
 if(typeof saved.shoes==='string'&&owns(h,'shoes',saved.shoes))h.shoes=saved.shoes;
 if(Array.isArray(saved.decor))h.decor=[...new Set(saved.decor.filter(d=>byId(DECOR,d)))];
 if(Array.isArray(saved.hide))h.hide=[...new Set(saved.hide.filter(d=>h.decor.includes(d)))];
 if(Array.isArray(saved.perks))h.perks=[...new Set(saved.perks.filter(d=>byId(PERKS,d)))];
 if(saved.stats&&typeof saved.stats==='object')for(const k of Object.keys(h.stats))h.stats[k]=int(saved.stats[k],0);
 const st=saved.set;if(st&&typeof st==='object'){if([3,5,10].includes(st.frames))h.set.frames=st.frames;if(st.hand===-1||st.hand===1)h.set.hand=st.hand;h.set.seen=!!st.seen;h.set.guide=st.guide!==false;}
 return h;}
const owns=(h,kind,id)=>{const it=byId(LISTS[kind]||[],id);return !!it&&(it.price===0||h.own.includes(kind+':'+id));};
function buy(h,kind,id){const it=byId(LISTS[kind]||[],id);if(!it||owns(h,kind,id)||h.cash<it.price)return false;h.cash-=it.price;h.own.push(kind+':'+id);return true;}
function equip(h,kind,id){if(!owns(h,kind,id))return false;h[kind]=id;return true;}
function nextPart(h,k){const p=PARTS[k],n=h.parts[k]+1;return p&&n<ERAS.length?{era:n,price:p.price[n]}:null;}
function buyPart(h,k){const nx=nextPart(h,k);if(!nx||h.cash<nx.price)return false;h.cash-=nx.price;h.parts[k]=nx.era;return true;}
function buyDecor(h,id){const d=byId(DECOR,id);if(!d||h.decor.includes(id)||h.cash<d.price)return false;h.cash-=d.price;h.decor.push(id);return true;}
function buyPerk(h,id){const d=byId(PERKS,id);if(!d||h.perks.includes(id)||h.cash<d.price)return false;h.cash-=d.price;h.perks.push(id);return true;}
const hasPerk=(h,id)=>h.perks.includes(id);
const showsDecor=(h,id)=>h.decor.includes(id)&&!h.hide.includes(id);
// what the alley looks / plays like now
function loadout(h){const p=h.parts;return {era:p,eraOf:k=>ERAS[p[k]].id,ball:byId(BALLS,h.ball)||BALLS[0],shoes:byId(SHOES,h.shoes)||SHOES[0],
 lane:PARTS.lanes.cond[p.lanes],decor:DECOR.filter(d=>showsDecor(h,d.id)).map(d=>d.id),perks:h.perks.slice()};}
// the alley's overall era (the name on the door): the era most parts have reached
function alleyEra(h){const c=[0,0,0,0,0];for(const k of PART_IDS)c[h.parts[k]]++;let best=0;for(let i=0;i<5;i++)if(c[i]>=c[best])best=i;return best;}
function progress(h){let tot=0,got=0;for(const k of PART_IDS)for(let i=1;i<ERAS.length;i++){tot+=PARTS[k].price[i];if(h.parts[k]>=i)got+=PARTS[k].price[i];}
 for(const k of Object.keys(LISTS))for(const it of LISTS[k]){tot+=it.price;if(owns(h,k,it.id))got+=it.price;}
 for(const d of [...DECOR,...PERKS]){tot+=d.price;if(h.decor.includes(d.id)||h.perks.includes(d.id))got+=d.price;}return got/tot;}
// cash for one finished game: ev list from rules.addBall, total, won
function earnings(evs,total,won,{tip=false}={}){let c=0;const lines=[];const add=(k,n,what)=>{if(n>0){c+=n*CASH[k];lines.push([what,n*CASH[k]]);}};
 let pins=0,strikes=0,spares=0,doubles=0,turkeys=0,more=0,picked=0;
 for(const e of evs){pins+=e.n;if(e.strike){strikes++;if(e.streak===2)doubles++;if(e.streak===3)turkeys++;if(e.streak>=4)more++;}if(e.spare)spares++;}
 for(let i=1;i<evs.length;i++)if(evs[i].spare&&evs[i-1].split)picked++;
 add('pin',pins,'Pins');add('strike',strikes,'Strikes');add('spare',spares,'Spares');add('double',doubles,'Doubles');add('turkey',turkeys,'Turkeys');
 add('bonus4',more,'Hambones and up');add('picked',picked,'Splits picked up');
 if(total>=200)add('score200',1,'200 game');if(total>=300)add('perfect',1,'PERFECT GAME');if(won)add('win',1,'Won the match');
 if(tip&&c>0){const t=Math.round(c*TIP);c+=t;lines.push(['Tip jar',t]);}
 return {cash:c,lines};}
Object.assign(exports,{ERAS,PARTS,PART_IDS,BALLS,SHOES,DECOR,PERKS,TIP,CASH,START_CASH,LISTS,byId,freshAlley,validAlley,owns,buy,equip,nextPart,buyPart,
 buyDecor,buyPerk,hasPerk,showsDecor,loadout,alleyEra,progress,earnings});
