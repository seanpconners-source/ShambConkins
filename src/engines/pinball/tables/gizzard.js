// King Gizzard & the Lizard Wizard. Table 3 of the band-table series, its own machine again.
// Layout: the top third is THE RATS' NEST, a separate upper playfield walled off from the main one, with its own pair
// of mini flippers (both buttons work them too), the R-A-T-S targets and the PLANET B scoop; it drains between its
// flippers through a one-way gate straight down into the three MICROTONAL pop bumpers. Round it runs the NONAGON
// INFINITY loop: left and right orbits joined over the top, so a loop shot comes back down the other side forever.
// The RATTLESNAKE (right) swallows the ball: you watch it slide up inside the snake's body (a hidden carry rail drawn
// as a travelling bulge) and get spat out into the Nest. The FLIGHT b741 ramp (left) flies over the top to the right
// inlane, or (diverter) lands in the Nest. G-I-L-A drop targets guard the pops and light the snake's locks; K-G-L-W
// standups on the orbit walls, the GAMMA KNIFE spinner in the left orbit, the GIZZVERSE saucer (album modes), left
// outlane kickback. Rules: tables/gizzardRules.js.
const {tableBuilder,arc,spline}=require("src/engines/pinball/build.js");

// Points on the Nest arc / orbit inner wall (centre 256,256, radius 190) and the R-A-T-S target ring (radius 168).
const ring=(r,a)=>[256+Math.cos(a*Math.PI/180)*r,256+Math.sin(a*Math.PI/180)*r];
function target(a,half=11){const [cx,cy]=ring(168,a),tx=-Math.sin(a*Math.PI/180),ty=Math.cos(a*Math.PI/180);return [[cx-tx*half,cy-ty*half],[cx+tx*half,cy+ty*half]];}

function buildTable(){
 const T=tableBuilder({id:'king-gizzard',name:'King Gizzard & the Lizard Wizard',W:514,H:1067,gravity:1300,slope:6.5,drainY:1040,timeScale:.85});
 const m=p=>[472-p[0],p[1]];
 // Cabinet + shooter lane. A plunge rides the arch over the Nest and comes down the left orbit.
 T.wall([[12,880],[12,256],...arc(256,256,244,180,360,36).slice(1),[500,1062]],{look:'wood',r:3});
 T.wall([[460,1062],[460,342]],{look:'rail',r:3});
 T.wall([[460,1062],[500,1062]],{look:'none',r:3});
 T.gate('shooterGate',[460,338],[499,302],[0,-1]);
 T.plunger(463,497,1010,{travel:36,vmin:950,vmax:3600,auto:2900});
 // The NONAGON INFINITY loop: one inner wall from the left orbit, over the Nest's roof, down to the right orbit.
 T.wall([[66,560],[66,256],...arc(256,256,190,180,325.2,30).slice(1),[412,147.6],[412,540]],{look:'rail',r:4});
 T.post(66,560,6).post(412,540,6);
 T.trigger('orbitL',[16,330],[62,330]);T.trigger('orbitR',[416,420],[457,420]);
 T.spinner('gamma',[16,470],[62,470],{label:'GAMMA KNIFE'});
 // Rubber kickers where the orbits come back down, so a returning ball is thrown into play instead of an outlane.
 T.wall([[14,604],[40,652]],{look:'rubber',r:4});T.wall([[458,604],[432,652]],{look:'rubber',r:4});
 // ---- THE RATS' NEST (upper playfield). Floor guides down to its two mini flippers; walls under the flippers;
 // a one-way gate in the drain gap lets the ball fall out into the pops but never back up.
 T.wall([ring(190,200),[160,234],[166,251],[207,272]],{look:'rail',r:4});
 T.wall([[412,186],[312,234],[306,251],[265,282]],{look:'rail',r:4});
 T.gate('nestDrain',[207,276],[265,286],[0,1]);   // tilted: a ball kicked up from the pops glances off it sideways
 T.flipper('miniL',172,240,{len:46,r0:9,r1:5,rest:26,up:-32,input:0,wUp:48});
 T.flipper('miniR',300,240,{len:46,r0:9,r1:5,rest:154,up:212,input:1,wUp:48});
 [['ratR',222],['ratA',244],['ratT',296],['ratS',318]].forEach(([id,a],i)=>{const [p,q]=target(a);T.standup(id,p,q,{label:'RATS'[i],color:'#7cff4f'});const l=ring(150,a);T.lamp(id,l[0],l[1],{r:6,color:'#7cff4f',label:'RATS'[i]});});
 T.hole('planetB',236,106,{r:15,maxSpeed:1700,hold:1,eject:[0,700],label:'PLANET B'});
 T.lamp('planetB',236,138,{r:9,shape:'star',color:'#64d2ff',label:'PLANET B'});
 // ---- main playfield: three MICROTONAL pops under the Nest drain, G-I-L-A drop targets in front of them.
 T.bumper('pop1',192,334,{r:24}).bumper('pop2',280,338,{r:24}).bumper('pop3',244,400,{r:24});
 T.drops('gila',[[[189,470],[209,470]],[[213,470],[233,470]],[[239,470],[259,470]],[[263,470],[283,470]]],{labels:['G','I','L','A']});
 // K-G on the left orbit wall, L-W on the right one.
 [['kK',420],['kG',470]].forEach(([id,y],i)=>{T.standup(id,[70,y-11],[70,y+11],{label:'KG'[i],color:'#ff9f0a'});T.lamp(id,86,y,{r:6,color:'#ff9f0a',label:'KG'[i]});});
 [['kL',420],['kW',470]].forEach(([id,y],i)=>{T.standup(id,[408,y-11],[408,y+11],{label:'LW'[i],color:'#ff9f0a'});T.lamp(id,392,y,{r:6,color:'#ff9f0a',label:'LW'[i]});});
 // FLIGHT b741: a plastic ramp up the left, over the arch; the diverter at the top sends it on round to the right
 // inlane, or down into the Nest.
 T.wall([[92,598],[92,530]],{look:'plastic',r:4}).wall([[140,598],[140,530]],{look:'plastic',r:4});T.post(92,598,5).post(140,598,5);
 T.flag('flightDiv');
 T.rail('flight',spline([[116,522,0],[112,440,26],[98,350,52],[80,262,74],[70,182,88],[94,112,96],[150,80,98]],8),{look:'plastic',width:46,color:'#ffd23f',label:'FLIGHT b741',exit:{next:{switch:'flightDiv',on:'flightNest',off:'flightLoop'}}});
 T.rail('flightLoop',spline([[150,80,98],[240,58,100],[330,66,98],[396,108,94],[440,190,86],[452,330,76],[450,480,58],[440,640,36],[420,720,20],[400,770,8],[400,800,0]],8),{look:'plastic',width:42,color:'#ffd23f',noEntry:true,exit:{minOut:600}});
 T.rail('flightNest',spline([[150,80,98],[200,96,80],[192,140,50],[152,170,22],[128,184,4],[120,188,0]],8),{look:'plastic',width:42,color:'#ffd23f',noEntry:true,exit:{minOut:200}});
 T.lamp('flightArrow',116,620,{shape:'arrow',r:13,color:'#ffd23f',label:'FLIGHT'});T.lamp('flightJ',116,652,{r:8,color:'#ff2d55',label:'JACKPOT'});
 // The RATTLESNAKE: its open mouth is a peaked pocket; the ball is swallowed (a VUK onto a hidden carry rail drawn as
 // the snake's body) and spat out into the Nest.
 T.wall([[324,592],[324,540],[348,526],[372,540],[372,592]],{look:'plastic',r:4});
 T.hole('snake',348,560,{r:16,hold:.7,toRail:'snakeBody',railSpeed:300});
 T.rail('snakeBody',spline([[348,560,0],[360,500,14],[384,430,26],[394,350,34],[392,270,38],[382,206,34],[362,166,24],[342,154,12],[330,160,4],[324,170,0]],10),{look:'snake',width:30,noEntry:true,carry:300,hidden:true,exit:{minOut:240}});
 T.lamp('snakeArrow',348,620,{shape:'arrow',r:13,color:'#ff3b30',label:'SNAKE'});T.lamp('snakeJ',348,652,{r:8,color:'#ff2d55',label:'JACKPOT'});
 [0,1,2].forEach(i=>T.lamp('lock'+i,330+i*18,684,{r:6,color:'#ff9f0a'}));
 // The orbit arrows (in the lanes), the NONAGON ring in the middle with the INFINITY star.
 T.lamp('loopL',39,530,{shape:'arrow',r:11,color:'#bf5af2',label:'LOOP'});T.lamp('loopR',436,520,{shape:'arrow',r:11,color:'#bf5af2',label:'LOOP'});
 for(let i=0;i<9;i++){const a=-90+i*40;T.lamp('nona'+i,236+Math.cos(a*Math.PI/180)*30,612+Math.sin(a*Math.PI/180)*30,{r:6,color:'#bf5af2'});}
 T.lamp('infinity',236,612,{r:15,shape:'star',color:'#ff2d55',label:'NONAGON'});
 // GIZZVERSE saucer (album modes), left under the ramp.
 T.hole('gizzverse',100,710,{r:16,maxSpeed:1500,hold:1,eject:[420,520],label:'GIZZVERSE'});
 T.lamp('gvAlbum',150,672,{r:8,color:'#ffd23f',label:'ALBUM'});T.lamp('gvEB',150,704,{r:8,color:'#ff9f0a',label:'EXTRA BALL'});
 // Lower playfield (mirrored), slings, flippers, left outlane kickback.
 const lower=(f)=>{T.wall([f([12,880]),f([110,976])],{look:'wood',r:3});T.wall([f([50,722]),f([50,850]),f([134,930])],{look:'rail',r:3});T.post(...f([50,722]),6);};
 lower(p=>p);lower(m);
 T.sling('slingL',[94,762],[94,830],[132,868]);T.sling('slingR',m([94,762]),m([94,830]),m([132,868]));
 T.post(94,762,6).post(...m([94,762]),6);
 T.flipper('flipL',148,946,{len:74,rest:30,up:-28,input:0});
 T.flipper('flipR',324,946,{len:74,rest:150,up:208,input:1});
 T.rollover('inL',72,812,{r:10});T.rollover('inR',400,812,{r:10});
 T.kickback('kickback',31,858,[0,-2500]);T.rollover('outR',441,858,{r:10});
 T.lamp('kickback',31,812,{r:8,color:'#ff3b30',label:'KICK'});T.lamp('outR',441,812,{r:7,color:'#ff3b30'});
 T.lamp('inL',72,780,{r:7,color:'#7cff4f'});T.lamp('inR',400,780,{r:7,color:'#7cff4f'});
 // Centre: the six-album ladder, bonus X, shoot again.
 ['#ff2d55','#ffd23f','#bf5af2','#7cff4f','#ff7a1a','#64d2ff'].forEach((c,i)=>T.lamp('al'+i,174+i*25,556,{r:8,color:c}));
 // bonus X: an arch under the title, over the wizard's hat (the owner's playfield art has its title where a straight row sat)
 ['2','3','4','5','6'].forEach((t,i)=>T.lamp('bx'+t,[162,196,236,276,310][i],[808,798,786,798,808][i],{r:10,color:'#7cff4f',label:t+'X'}));
 T.lamp('shootAgain',236,895,{r:12,color:'#ff3b30',label:'SHOOT AGAIN'});
 T.lamp('gamma',39,500,{r:6,color:'#64d2ff'});
 T.gi([[70,740],[402,740],[110,900],[362,900],[40,620],[432,620],[150,560],[330,500],[236,300],[120,200],[360,170],[236,180],[440,430],[236,690],[300,40],[180,40]],{color:'#ffd0f0'});
 T.flasher('fNest',236,72,{color:'#7cff4f',r:8}).flasher('fSnake',388,272,{color:'#ff3b30'}).flasher('fFlight',60,150,{color:'#ffd23f'}).flasher('fPops',150,300,{color:'#bf5af2'}).flasher('fLoop',440,120,{color:'#64d2ff'});
 return T.def;
}
const {rules}=require("src/engines/pinball/tables/gizzardRules.js");
const {art}=require("src/engines/pinball/tables/gizzardArt.js");
const {dmdScenes}=require("src/engines/pinball/tables/gizzardDmd.js");
const {songs}=require("src/engines/pinball/tables/gizzardMusic.js");
const NEST={x:236,y:150},SNAKE={x:370,y:380},POPS={x:236,y:350},CENTRE={x:236,y:612};
const cues={
 jackpot:m=>{m.show('radial',1.4,CENTRE);m.giOff(.9);m.flash('all',5);},
 snake:m=>{m.flash('fSnake',5);m.show('sweepUp',1);},
 lock:m=>{m.flash('fSnake',6);m.show('implode',1.2,SNAKE);m.giOff(.6);},
 rattle:m=>{m.show('sweepUp',2.6,{loop:.6});m.giOff(1.6);m.flash('all',8);},
 nest:m=>{m.flash('fNest',4);m.show('radial',1,NEST);},
 planet:m=>{m.flash('fNest',6);m.show('implode',1.2,NEST);m.giOff(.6);},
 loop:m=>{m.flash('fLoop',3);m.show('chase',1,{arms:3,speed:14});},
 nonagon:m=>{m.show('chase',2.4,{arms:9,speed:10});m.giOff(1.2);m.flash('all',6);},
 flight:m=>{m.flash('fFlight',4);m.show('sweepRight',.9);},
 gila:m=>{m.show('radial',1,POPS);m.flash('fPops',3);},
 banana:m=>{m.show('sparkle',1.2);m.flash('fPops',2);},
 dragon:m=>{m.show('strobe',.8);m.flash('fSnake',4);},
 wizard:m=>{m.show('chase',3,{arms:4,speed:12});m.flash('all',10);m.giOff(1);},
 album:m=>{m.show('sweepUp',1.2);m.flash('all',4);},
 extra:m=>{m.show('blink',1.6);m.flash('all',8);},
 skill:m=>{m.show('sweepUp',.8);m.flash('fSnake',2);},
 save:m=>{m.show('sweepUp',.7);},
};
// shots the test bot must be able to make (tests/pinball-sim.mjs)
const simChecks=['bumper','sling','spin','drop','junction:flight','hole:snake','rail:snakeBody','hole:gizzverse','standup','trigger:orbit','flip:miniL','flip:miniR'];
Object.assign(exports,{buildTable,rules,art,dmdScenes,songs,cues,simChecks,id:'king-gizzard',title:'King Gizzard & the Lizard Wizard'});
