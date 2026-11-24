// THE WARRIORS: the story campaign, chapter by chapter after the film (our own scenes and words): the Conclave in the
// park and the cops' raid, the Turnbull AC's and their bus, the Orphans, the train south, the Baseball Furies in
// Riverside Park, the Lizzies' trap, the cops at Union Square, the Punks, the dawn ride home and the Rogues on Coney
// Island, where the Riffs turn up at the last minute. Every chapter is a few AREAS (each its own place with its own
// scenery, floor shape, doors, obstacles and events); every area is a few WAVES that lock the screen, the last area of a
// chapter usually ends with a boss. Built from the chapter number and the seed only, so both players (and both phones
// online) fight the same thing.
const {seededRandom}=require("src/utils.js");
const DEPTH=130;
// enemy types. moves = MV names in warriorsDD.js; head = drawn head style (src/engines/dd/body.js drawGangHead) unless
// face = a character id (their picture is used); gang = who they are (banner/name); flags: ranged knife|gun|lob|bottle,
// shield (blocks hits from the front), skate (rolls in fast, dash attacks), charge (shoulder charge), grabber.
const FOES={
 cop:{hp:10,sp:56,moves:['eswing','kick'],weapon:'stick',o:'cop',head:'cop',pts:250,name:'Patrolman',gang:'NYPD'},
 riot:{hp:16,sp:42,moves:['bash','eswing'],weapon:'stick',o:'riot',head:'riot',pts:450,name:'Riot cop',gang:'NYPD',shield:4},
 sarge:{hp:70,sp:58,moves:['eswing','kick2','bash'],weapon:'stick',o:'sarge',head:'sarge',pts:6000,name:'THE SERGEANT',gang:'NYPD',big:1.24,charge:1,noGrab:1},
 skin:{hp:11,sp:60,moves:['jab','cross','hook','kick'],o:'turnbull',head:'bald',pts:250,name:'Turnbull',gang:"TURNBULL AC'S"},
 chain:{hp:11,sp:56,moves:['eswing'],weapon:'chain',o:'turnbull',head:'bald',pts:300,name:'Chain swinger',gang:"TURNBULL AC'S"},
 big:{hp:28,sp:42,moves:['hook','ebash','bgrab'],o:'turnbull',head:'bald',pts:800,name:'Turnbull bruiser',gang:"TURNBULL AC'S",big:1.3,noGrab:1},
 driver:{hp:80,sp:52,moves:['hook','ebash','bgrab','kick2'],o:'turnbull',head:'driver',pts:7000,name:'THE BUS DRIVER',gang:"TURNBULL AC'S",big:1.34,charge:1,noGrab:1},
 orphan:{hp:7,sp:54,moves:['jab','cross','kick'],o:'orphan',head:'scruffy',pts:200,name:'Orphan',gang:'THE ORPHANS'},
 lob:{hp:7,sp:50,moves:['jab'],o:'orphan',head:'scruffy',pts:300,name:'Molotov kid',gang:'THE ORPHANS',ranged:'lob'},
 orphboss:{hp:55,sp:60,moves:['jab','cross','hook','jkickE'],o:'orphan',head:'scruffy',pts:5000,name:'ORPHANS LEADER',gang:'THE ORPHANS',big:1.12,ranged:'lob',noGrab:1},
 fury:{hp:12,sp:74,moves:['eswing','jkickE'],weapon:'bat',o:'fury',head:'fury',pts:400,name:'Baseball Fury',gang:'BASEBALL FURIES'},
 furyboss:{hp:80,sp:72,moves:['eswing','eswing','jkickE','kick2'],weapon:'bat',o:'fury',head:'fury',face:'baseball-fury',pts:8000,name:'THE LEAD FURY',gang:'BASEBALL FURIES',big:1.16,noGrab:1,leap:1},
 liz:{hp:9,sp:68,moves:['jab','kick','jkickE'],o:'lizzie',head:'lizzie',pts:300,name:'Lizzie',gang:'THE LIZZIES'},
 knifeliz:{hp:9,sp:62,moves:['jab','kick'],o:'lizzie',head:'lizzie',pts:350,name:'Lizzie',gang:'THE LIZZIES',ranged:'knife'},
 gunliz:{hp:8,sp:56,moves:['kick'],o:'lizzie',head:'lizzie',pts:450,name:'Lizzie with a gun',gang:'THE LIZZIES',ranged:'gun'},
 lizboss:{hp:60,sp:66,moves:['jab','cross','kick2','jkickE'],o:'lizzie',head:'lizzie',pts:7000,name:'LIZZIES LEADER',gang:'THE LIZZIES',big:1.1,ranged:'gun',noGrab:1},
 punk:{hp:11,sp:60,moves:['jab','cross','hook','kick'],o:'punk',head:'punk',pts:300,name:'Punk',gang:'THE PUNKS'},
 skater:{hp:10,sp:92,moves:['jab','kick'],o:'punk',head:'punk',pts:400,name:'Skater Punk',gang:'THE PUNKS',skate:1},
 punkboss:{hp:85,sp:70,moves:['hook','ebash','bgrab','kick2'],o:'punk',head:'punk',pts:8000,name:'THE BIG PUNK',gang:'THE PUNKS',big:1.3,skate:1,noGrab:1},
 rogue:{hp:13,sp:62,moves:['jab','cross','hook','kick'],o:'rogue',head:'rogue',pts:350,name:'Rogue',gang:'THE ROGUES'},
 bottler:{hp:11,sp:56,moves:['jab','kick'],o:'rogue',head:'rogue',pts:450,name:'Rogue',gang:'THE ROGUES',ranged:'bottle'},
 luther:{hp:110,sp:60,moves:['jab','cross','kick2','jkickE'],o:'rogue',head:'rogue',face:'luther',pts:15000,name:'LUTHER',gang:'THE ROGUES',big:1.12,ranged:'gun',noGrab:1},
 riff:{hp:60,sp:76,moves:['jab','cross','hook','kick2'],o:'riff',head:'riff',pts:0,name:'Riff',gang:'THE RIFFS'},
 // one of the crew, running the 96th Street platform with you (an ally until the cops drag him to the edge)
 fox:{hp:60,sp:96,moves:['jab','cross','kick'],o:'warrior',head:'thug',pts:0,name:'Fox',gang:'THE WARRIORS'}};
// one area: kind (scenery, src/engines/dd/scenes.js), len, waves 'type type ...' at hero x, depth range, doors, blocks
// (solid obstacles x..x+w, d0..d1), pits [x0,x1,d0,d1] (a hole across part or all of the floor), props/items, events, boss. A wave list may say 'door' spawns.
const W=(at,list,o={})=>({at,list:list.split(' ').filter(Boolean),...o});
const CHAPTERS=[
 {id:'conclave',title:'THE CONCLAVE',place:'Van Cortlandt Park · The Bronx',music:0,
  story:['Every gang in New York. One truce. One night.','Then a gunshot. Cyrus is down, the Warriors get the blame and the cops storm the park.'],
  areas:[
   {kind:'conclave',len:1500,beat:'SOMEBODY SHOT CYRUS!',sub:'The cops are raiding the park. RUN!',siren:1,
    waves:[W(120,'cop cop'),W(620,'cop cop cop'),W(1120,'cop riot cop')],props:'crate@500 barrel@940',items:'stick@330'},
   {kind:'park',len:1700,beat:'THROUGH THE WOODS',sub:'Every cop in the Bronx is in this park',siren:1,
    waves:[W(220,'cop cop riot'),W(760,'cop cop cop cop'),W(1300,'riot riot cop')],blocks:'bench@560:26:4 bench@1180:26:96',props:'barrel@900',items:'pipe@650 burger@1400'},
   {kind:'cemetery',len:1600,beat:'THE CEMETERY',sub:'Lie low till morning... no such luck',
    waves:[W(220,'cop cop'),W(700,'riot cop cop')],pits:'520:58:34:62',blocks:'grave@380:14:8 grave@880:14:100 grave@1010:14:20',items:'chicken@800',
    boss:{at:1180,type:'sarge',minions:'cop cop',line:'You punks are going DOWN.'}}],
  outro:'Out of the park. Coney Island is a long way off.'},
 {id:'turnbull',title:"THE TURNBULL AC'S",place:'Under the El · The Bronx',music:1,
  story:['The word is out: the Riffs want the Warriors, dead or alive.','The Turnbull AC\'s want them first. They brought their bus.'],
  areas:[
   {kind:'elstreet',len:1800,beat:"TURNBULL TURF",sub:'Watch out for the bus!',el:1,
    waves:[W(160,'skin skin'),W(640,'skin chain skin'),W(1200,'skin skin big')],events:'bus@420 bus@980 bus@1500',blocks:'car@820:70:4',props:'barrel@300 crate@1100',items:'bat@700'},
   {kind:'yard',len:1600,beat:'THE RAIL YARD',sub:'End of the line for somebody',el:1,
    waves:[W(220,'skin chain'),W(700,'big skin chain')],pits:'560:60',props:'barrel@400 barrel@430 crate@900',items:'pipe@820 pizza@1000',
    boss:{at:1160,type:'driver',minions:'skin skin',line:'Nobody gets off MY bus.'}}],
  outro:'The bus is wrecked. Back to the train.'},
 {id:'orphans',title:'THE ORPHANS',place:'Tremont · The Bronx',music:2,
  story:['The train stops short. Tremont: Orphans turf.','The Orphans have no colors and no reputation. They want one tonight.'],
  areas:[
   {kind:'tenement',len:1600,beat:'TREMONT',sub:'They come out of every doorway',doors:'260 700 1140',
    waves:[W(150,'orphan orphan orphan',{door:1}),W(580,'orphan lob orphan',{door:1}),W(1040,'orphan orphan lob orphan',{door:1})],blocks:'car@900:70:100',props:'barrel@480',items:'bat@400 burger@1300'},
   {kind:'burning',len:1400,beat:'THE BURNING CAR',sub:'Mercy tags along. Keep moving.',fire:1,
    waves:[W(200,'orphan lob orphan lob')],blocks:'wreck@520:76:6',props:'crate@820',items:'chicken@760',
    boss:{at:880,type:'orphboss',minions:'orphan orphan',line:'Take off those vests!'}}],
  outro:'The Orphans are done. The station is just ahead.'},
 {id:'train1',title:'THE TRAIN SOUTH',place:'On the subway · Manhattan bound',music:3,
  story:['A train at last. Some Turnbulls got on behind them.','Fight through the cars. Hold on to something.'],
  areas:[
   {kind:'train',len:1500,beat:'MIND THE GAP',sub:'They come through the doors between the cars',moving:1,doors:'20 740 1480',dMin:26,dMax:112,
    waves:[W(150,'skin skin',{door:1}),W(560,'skin chain orphan',{door:1}),W(1060,'big skin skin',{door:1})],items:'stick@400 pizza@900',events:'lurch@300 lurch@800 lurch@1200'}],
  outro:'FIRE ON THE TRACKS! Everybody off at 96th Street.'},
 {id:'furies',title:'THE BASEBALL FURIES',place:'96th Street · Riverside Park',music:4,
  story:['96th Street. The cops were waiting on the platform. RUN.','Then a quiet park by the river, and the bats come out.'],
  areas:[
   // the chase down the 96th Street platform: no waves to clear, the cops come from behind and the screen keeps moving;
   // Fox runs with you until a cop drags him to the platform edge as a train comes in (chase/fox: warriorsDD.js chaseStep)
   {kind:'station96',len:3200,beat:'96TH STREET',sub:'The cops were waiting. RUN!',chase:1,fox:1650,siren:1,
    waves:[],items:'stick@420 chicken@1700 burger@2600'},
   {kind:'riverside',len:1800,beat:'RIVERSIDE PARK',sub:'Grab a bat of your own',
    waves:[W(160,'fury fury'),W(640,'fury fury fury'),W(1200,'fury fury fury fury')],blocks:'bench@420:26:6 lamp@980:8:10',items:'bat@300 burger@1100'},
   {kind:'playground',len:1400,beat:'THE PLAYGROUND',sub:'The lead Fury wants a word',
    waves:[W(200,'fury fury fury')],blocks:'swings@560:60:4',items:'chicken@500',
    boss:{at:860,type:'furyboss',minions:'fury fury',line:'Batter up.'}}],
  outro:'The Furies are down. Fox is gone, and the boys are split up.'},
 {id:'lizzies',title:'THE LIZZIES',place:'A party uptown',music:5,
  story:['Music, drinks, smiles. An invitation nobody should take.','It\'s a trap. The Lizzies hate the Warriors as much as anyone.'],
  areas:[
   {kind:'apartment',len:1400,beat:'THE PARTY',sub:'Knives! Guns! Duck out of the red line!',dMin:20,dMax:120,doors:'300 900',
    waves:[W(140,'liz liz',{door:1}),W(520,'liz knifeliz liz',{door:1}),W(960,'gunliz liz liz',{door:1})],blocks:'couch@620:60:8',items:'pipe@400 pizza@1100'},
   {kind:'apartment2',len:1300,beat:'OUT THE BACK',sub:'The leader is waiting at the stairs',dMin:20,dMax:120,
    waves:[W(160,'liz gunliz knifeliz')],items:'burger@600',
    boss:{at:720,type:'lizboss',minions:'liz liz',line:'Leaving so soon?'}}],
  outro:'Out on the street. Everyone meets at Union Square.'},
 {id:'union',title:'UNION SQUARE',place:'14th Street station',music:6,
  story:['The cops know where they\'re going. The station is crawling.','Fight your way down the platform and CATCH THE TRAIN before it leaves.'],
  areas:[
   {kind:'station',len:2100,beat:'CATCH THE TRAIN!',sub:'Get to the end of the platform before time runs out',escape:90,doors:'120 1000',
    waves:[W(240,'cop cop'),W(820,'riot cop cop'),W(1420,'cop cop riot cop')],items:'stick@500 chicken@1250'}],
  outro:'Made it... but not everyone is on the train yet.'},
 {id:'punks',title:'THE PUNKS',place:'Union Square · the men\'s room',music:7,
  story:['A wait for the next train. A trip to the men\'s room.','Overalls. Roller skates. The Punks roll in.'],
  areas:[
   {kind:'platform',len:1300,beat:'THE PLATFORM',sub:'Skaters rush in fast: step out of their line',
    waves:[W(200,'punk punk skater'),W(720,'skater punk punk')],items:'pipe@480 pizza@900'},
   {kind:'restroom',len:1200,beat:'THE MEN\'S ROOM',sub:'Nowhere to run',dMin:26,dMax:118,
    waves:[W(160,'punk skater punk')],blocks:'sink@380:44:4',items:'burger@540',
    boss:{at:660,type:'punkboss',minions:'punk skater',line:'Roll \'em up.'}}],
  outro:'Last train to Coney. The sun is coming up.'},
 {id:'ride',title:'THE RIDE HOME',place:'The last train · Brooklyn',music:8,
  story:['Dawn over Brooklyn. The train comes up out of the tunnel.','Stragglers from every gang want one last shot.'],
  areas:[
   {kind:'trainDawn',len:1900,beat:'LAST STOP: CONEY ISLAND',sub:'Every gang left in the city is on this train',moving:1,doors:'20 780 1560',dMin:26,dMax:112,
    waves:[W(150,'skin fury',{door:1}),W(600,'punk skater orphan',{door:1}),W(1100,'fury fury skin',{door:1}),W(1500,'big punk liz',{door:1})],items:'bat@500 chicken@1300',events:'lurch@400 lurch@1000 lurch@1600'}],
  outro:'Coney Island. Home. Somebody is waiting.'},
 {id:'coney',title:'CONEY ISLAND',place:'The boardwalk at dawn',music:9,
  story:['Home turf. The Wonder Wheel. The ocean.','A bottle clinks. Then three. "Warriors... come out to play."'],
  areas:[
   {kind:'boardwalk',len:1700,beat:'THE BOARDWALK',sub:'The Rogues shot Cyrus. Everyone will know it.',
    waves:[W(160,'rogue rogue'),W(640,'rogue bottler rogue'),W(1160,'rogue rogue bottler rogue')],props:'barrel@400 crate@1000',items:'pipe@560 burger@900'},
   {kind:'beach',len:1500,beat:'THE BEACH',sub:'Luther. End it here.',
    waves:[W(200,'rogue bottler rogue')],items:'chicken@500',
    boss:{at:760,type:'luther',minions:'rogue rogue bottler rogue',line:'Warriors... come out to play-ay!',endless:1,riffs:1}}],
  outro:'The Riffs take care of the Rogues. The Warriors are home.'}];
const parse=(str,f)=>String(str||'').split(' ').filter(Boolean).map(f);
// build one area for play: waves with spawn sides/delays, items, props, blocks, pits, events (seeded)
function buildArea(ch,ai,seed){const C=CHAPTERS[ch],A=C.areas[ai],r=seededRandom(seed+':ww-story:'+ch+':'+ai);
 const doors=parse(A.doors,Number);
 const waves=A.waves.map((w,wi)=>({at:w.at,max:2+Math.min(2,Math.floor(ch/3)),list:w.list.map((type,i)=>({type,side:i%2?-1:1,door:w.door&&doors.length&&r()<.6?doors[Math.floor(r()*doors.length)]:null,delay:i*.75+r()*.5,d:r()*DEPTH}))}));
 const items=parse(A.items,q=>{const [k,x]=q.split('@');return {kind:k,x:+x,d:20+r()*(DEPTH-40)};});
 const props=parse(A.props,q=>{const [k,x]=q.split('@');return {kind:k,x:+x,d:14+r()*(DEPTH-28),hides:r()<.5?['chicken','burger','pizza'][Math.floor(r()*3)]:null};});
 const blocks=parse(A.blocks,q=>{const [k,rest]=q.split('@'),[x,w,d]=rest.split(':').map(Number);const dd={bench:18,grave:12,car:30,wreck:34,lamp:8,swings:14,couch:22,sink:16}[k]||16;return {kind:k,x,w,d0:d,d1:d+dd};});
 const pits=parse(A.pits,q=>{const [x,w,d0,dd]=q.split(':').map(Number);return d0!=null&&!isNaN(d0)?[x,x+w,d0,d0+dd]:[x,x+w,-99,999];});
 const events=parse(A.events,q=>{const [k,x]=q.split('@');return {kind:k,x:+x,done:false};});
 return {...A,ch,ai,chapter:C,doors,waves,items,props,blocks,pits,events,dMin:A.dMin??4,dMax:A.dMax??DEPTH-4,last:ai===C.areas.length-1};}
Object.assign(exports,{FOES,CHAPTERS,DEPTH,buildArea});
