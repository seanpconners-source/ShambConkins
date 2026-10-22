// Bucketheadland (Buckethead, 1992 album "Bucketheadland": the theme park Buckethead dreamed up). Table 1 of the
// band-table series. Layout: left orbit with the Nunchuck spinner, Roller Coaster plastic ramp (left), Giant Robot
// wire ramp (right), three Chicken Coop pop bumpers under the B-O-T top lanes, the Coop ball lock behind three EGG
// drop targets, B-U-C-K-E-T standups, the Haunted Ride saucer, left outlane kickback. Upper right: the Giant Robot
// (a moving toy) with its tractor-beam magnet, fed by the upper flipper; the Coop is a VUK that fires the ball up a
// wireform onto that flipper. The Golden Egg captive ball sits right of the Coop.
// Rules (tables/bucketheadRules.js): attractions + wizard mode, virtual 3-ball lock → JORDAN MULTIBALL (jackpots on both ramps, super jackpot at the Coop); 5 robot hits →
// GIANT ROBOT BATTLE (robot walks, magnet grabs the ball, 4 hits to win); Golden Egg hits raise the jackpot.
const {tableBuilder,arc,spline}=require("src/engines/pinball/build.js");

function buildTable(){
 // timeScale .85: the owner found real speed a bit too fast to follow on a phone (Oct 22).
 const T=tableBuilder({id:'buckethead',name:'Bucketheadland',W:514,H:1067,gravity:1300,slope:6.5,drainY:1040,timeScale:.85});
 const m=p=>[472-p[0],p[1]];             // lower playfield mirror (centre line x 236)
 // Cabinet: left wall, top arch, right wall; shooter lane on the right.
 T.wall([[12,880],[12,256],...arc(256,256,244,180,360,36).slice(1),[500,1062]],{look:'wood',r:3});
 T.wall([[460,1062],[460,342]],{look:'rail',r:3});                 // shooter lane inner wall
 T.wall([[460,1062],[500,1062]],{look:'none',r:3});
 T.gate('shooterGate',[460,338],[499,302],[0,-1]);                  // lets the plunge out, deflects returns into play
 T.plunger(463,497,1010,{travel:36,vmin:950,vmax:3600,auto:2900});
 // Left orbit: inner wall + one-way gate at the top so plunges can't fall down the orbit.
 T.wall([[58,268],[58,560]],{look:'rail',r:4});T.post(58,560,6);
 T.gate('orbitGate',[13,232],[57,266],[0,-1]);
 T.spinner('spinner',[16,470],[54,470]);
 T.trigger('orbitL',[16,320],[54,320]);
 T.trigger('orbitR',[463,280],[497,280]);                           // ball coming down the right side = loop made
 // Top lanes B-O-T + guides.
 for(const gx of [174,218,262,306])T.wall([[gx,104],[gx,148]],{look:'rail',r:4});
 [['laneB',196],['laneO',240],['laneT',284]].forEach(([id,x],i)=>{T.rollover(id,x,126,{label:'BOT'[i]});T.lamp(id,x,98,{r:8,color:'#ffd23f',label:'BOT'[i]});});
 // Chicken Coop pop bumpers.
 T.bumper('pop1',200,212,{r:26}).bumper('pop2',282,212,{r:26}).bumper('pop3',241,278,{r:26});
 // The Coop: lock pocket behind three EGG drop targets.
 T.wall([[200,472],[200,410],[236,394],[272,410],[272,472]],{look:'plastic',r:4});   // peaked roof: nothing rests on it
 T.drops('egg',[[[204,474],[224,474]],[[226,474],[246,474]],[[248,474],[268,474]]],{labels:['E','G','G']});
 // The Coop is a VUK: the ball is kicked straight up onto a wireform that drops it on the upper flipper.
 T.hole('coop',236,436,{r:17,hold:1.2,toRail:'coopVuk',railSpeed:2600});
 T.rail('coopVuk',spline([[236,436,0],[238,428,30],[252,408,58],[290,378,76],[340,352,86],[390,338,80],[414,342,52],[420,350,24]],8),{look:'wire',width:40,noEntry:true,exit:{minOut:120}});
 [0,1,2].forEach(i=>T.lamp('lock'+i,216+i*20,506,{r:7,color:'#ff8c1a'}));
 T.lamp('coopJ',236,540,{shape:'arrow',r:12,color:'#ff2d55',label:'SUPER'});
 // Roller Coaster ramp (left plastic ramp, loops over the left orbit, drops into the left inlane).
 T.wall([[126,592],[126,526]],{look:'plastic',r:4}).wall([[174,592],[174,526]],{look:'plastic',r:4});
 T.post(126,592,5).post(174,592,5);
 T.rail('coaster',spline([[150,520,0],[146,430,26],[126,330,56],[98,236,80],[66,176,92],[34,214,96],[30,330,90],[34,500,70],[46,640,42],[72,752,12],[72,792,0]],10),{look:'plastic',width:46,color:'#e63946',label:'ROLLER COASTER',exit:{minOut:600}});
 T.lamp('coasterArrow',150,616,{shape:'arrow',r:13,color:'#ff3b30',label:'COASTER'});
 T.lamp('coasterJ',150,648,{r:8,color:'#ffd23f',label:'JACKPOT'});
 // Giant Robot wire ramp (right).
 T.wall([[348,592],[348,526]],{look:'plastic',r:4}).wall([[396,592],[396,526]],{look:'plastic',r:4});
 T.post(348,592,5).post(396,592,5);
 T.rail('robot',spline([[372,520,0],[372,440,28],[380,360,52],[400,314,64],[430,302,68],[452,332,64],[454,440,55],[446,560,40],[430,680,25],[400,752,10],[400,792,0]],10),{look:'wire',width:46,label:'ROBOT RAMP',exit:{minOut:600}});
 // Upper right flipper (right button) under the Giant Robot.
 T.flipper('flipU',450,380,{len:58,r0:10,r1:5.5,rest:170,up:215,input:1,wUp:50});
 // The Giant Robot: a moving toy (body capsules); its tractor-beam magnet sits in front of it. The underside slopes so a
 // hit from the upper flipper falls away to the left instead of straight back onto it (no endless robot loop).
 T.toy('giantRobot',404,214,{w:96,h:84,speed:60,label:'GIANT ROBOT',segs:[[362,262,446,238,7],[362,262,362,182,7],[446,238,446,182,7],[362,182,404,158,7],[404,158,446,182,7]]});
 T.magnet('beam',404,292,{r:34,force:7000,fling:[-650,700],holdT:1.4});
 [0,1,2,3,4].forEach(i=>T.lamp('rh'+i,372+i*16,272,{r:5,color:'#32d74b'}));
 // Golden Egg: captive ball in a closed channel, a target at the top.
 T.wall([[312,478],[312,350],[330,336],[348,350],[348,478]],{look:'plastic',r:4});   // peaked: nothing rests on itT.post(317,492,4).post(343,492,4);
 T.standup('eggTarget',[318,358],[342,358],{label:'EGG',color:'#ffd23f'});T.captive('egg',330,470);
 [0,1,2].forEach(i=>T.lamp('egg'+i,318+i*12,512,{r:5,color:'#ffd23f'}));
 T.lamp('robotArrow',372,616,{shape:'arrow',r:13,color:'#32d74b',label:'ROBOT'});
 T.lamp('robotJ',372,648,{r:8,color:'#ffd23f',label:'JACKPOT'});
 // B-U-C on the orbit wall, K-E-T on the shooter wall.
 [['bB',340],['bU',384],['bC',428]].forEach(([id,y],i)=>{T.standup(id,[63,y-11],[63,y+11],{label:'BUC'[i],color:'#4cc9f0'});T.lamp(id,80,y,{r:7,color:'#4cc9f0',label:'BUC'[i]});});
 [['bK',446],['bE',488],['bT',530]].forEach(([id,y],i)=>{T.standup(id,[455,y-11],[455,y+11],{label:'KET'[i],color:'#4cc9f0'});T.lamp(id,438,y,{r:7,color:'#4cc9f0',label:'KET'[i]});});
 // Haunted Ride saucer.
 T.hole('haunted',418,614,{r:16,maxSpeed:1500,hold:1,eject:[-680,880],label:'HAUNTED RIDE'});
 T.lamp('hauntedEB',418,656,{r:8,color:'#ff9f0a',label:'EXTRA BALL'});
 T.lamp('hauntedMy',418,576,{r:8,color:'#bf5af2',label:'ATTRACTION'});
 // Attraction ladder (5 park attractions) and the orbit arrow.
 ['#ff3b30','#64d2ff','#bf5af2','#4cc9f0','#ffd23f'].forEach((col,i)=>T.lamp('at'+i,186+i*25,582,{r:8,color:col}));
 T.lamp('orbitArrow',35,604,{shape:'arrow',r:11,color:'#64d2ff',label:'ORBIT'});
 // Lower playfield (left side, mirrored to the right).
 const lower=(f)=>{
  T.wall([f([12,880]),f([110,976])],{look:'wood',r:3});            // outlane floor toward the drain
  T.wall([f([50,722]),f([50,850]),f([134,930])],{look:'rail',r:3}); // outlane / inlane divider + inlane guide
  T.post(...f([50,722]),6);
 };
 lower(p=>p);lower(m);
 T.sling('slingL',[94,762],[94,830],[132,868]);T.sling('slingR',m([94,762]),m([94,830]),m([132,868]));
 T.post(94,762,6).post(...m([94,762]),6);
 T.flipper('flipL',148,946,{len:74,rest:30,up:-28,input:0});
 T.flipper('flipR',324,946,{len:74,rest:150,up:208,input:1});
 T.rollover('inL',72,812,{r:10});T.rollover('inR',400,812,{r:10});
 T.kickback('kickback',31,858,[0,-2500]);T.rollover('outR',441,858,{r:10});
 T.lamp('kickback',31,812,{r:8,color:'#ff3b30',label:'KICK'});T.lamp('outR',441,812,{r:7,color:'#ff3b30'});
 T.lamp('inL',72,780,{r:7,color:'#ffd23f'});T.lamp('inR',400,780,{r:7,color:'#ffd23f'});
 // Centre inserts: bonus X ladder, shoot again.
 ['2','3','4','5','6'].forEach((t,i)=>T.lamp('bx'+t,176+i*30,738,{r:10,color:'#ffd23f',label:t+'X'}));
 T.lamp('shootAgain',236,905,{r:13,color:'#ff3b30',label:'SHOOT AGAIN',shape:'circle'});
 T.lamp('jordan',236,620,{r:22,shape:'star',color:'#ff2d55',label:'JORDAN'});
 T.lamp('spinner',35,520,{r:7,color:'#64d2ff'});
 // General illumination: warm bulbs round the slings, inlanes, under the ramps and along the top arch.
 T.gi([[70,740],[402,740],[110,900],[362,900],[40,640],[432,640],[150,560],[372,560],[236,360],[120,200],[360,170],[60,420],[440,420],[236,680],[300,80],[180,80]]);
 // Flasher domes (fired by the light cues below).
 T.flasher('fCoaster',96,262,{color:'#ff3b30'}).flasher('fRobot',452,168,{color:'#32d74b'}).flasher('fCoop',236,384,{color:'#ffd23f',r:8}).flasher('fHaunted',450,592,{color:'#bf5af2'}).flasher('fTop',150,120,{color:'#64d2ff'});
 return T.def;
}

const {rules}=require("src/engines/pinball/tables/bucketheadRules.js");
const {art}=require("src/engines/pinball/tables/bucketheadArt.js");
const {dmdScenes}=require("src/engines/pinball/tables/bucketheadDmd.js");
const {songs}=require("src/engines/pinball/tables/bucketheadMusic.js");
// Light cues: run with every m.say of that DMD animation (light show + flasher domes + GI blackouts).
const COOP={x:236,y:436},ROBOT={x:404,y:214};
const cues={
 jackpot:m=>{m.show('radial',1.4,COOP);m.giOff(.9);m.flash('all',5);},
 multiball:m=>{m.show('sweepUp',2.6,{loop:.65});m.giOff(1.6);m.flash('all',8);},
 coaster:m=>{m.show('sweepUp',.9);m.flash('fCoaster',4);},
 robot:m=>{m.flash('fRobot',4);m.show('radial',.8,ROBOT);},
 robotDown:m=>{m.show('radial',1.4,ROBOT);m.giOff(1);m.flash('all',6);},
 beam:m=>{m.flash('fRobot',8);m.show('implode',1,{x:404,y:292});},
 egg:m=>{m.flash('fCoop',4);m.show('implode',1,COOP);},
 lock:m=>{m.flash('fCoop',6);m.show('implode',1.2,COOP);m.giOff(.5);},
 bucket:m=>{m.show('sparkle',1);},
 ghost:m=>{m.flash('fHaunted',5);m.show('sweepLeft',.9);},
 nunchuck:m=>{m.show('chase',1,{arms:2,speed:14});},
 moon:m=>{m.show('sweepDown',1.1);m.flash('fTop',3);},
 chicken:m=>{m.show('sparkle',.8);m.flash('fCoop',2);},
 ferris:m=>{m.show('chase',1.6);},
 wizard:m=>{m.show('chase',3,{arms:4,speed:12});m.flash('all',10);m.giOff(1);},
 extra:m=>{m.show('blink',1.6);m.flash('all',8);},
 skill:m=>{m.show('sweepUp',.8);m.flash('fTop',2);},
 save:m=>{m.show('sweepUp',.7);},
};
Object.assign(exports,{buildTable,rules,art,dmdScenes,songs,cues,id:'buckethead',title:'Bucketheadland'});