// Black Sabbath. Table 2 of the band-table series: a different machine from Bucketheadland, not a reskin.
// Layout: four I-R-O-N top lanes; three WAR PIGS pop bumpers upper right; IRON MAN (a hulking toy that steps toward
// the flippers in his mode) upper left, fed by a LEFT upper flipper that a full plunge reaches round the top arch;
// the INTO THE VOID spinning disc in the middle; two crossing ramps: PARANOID (left wireform over the top to a
// diverter: right inlane, or straight into the Graveyard when the lock is lit) and ELECTRIC FUNERAL (right wire
// ramp back to the left inlane, the SUPERNAUT spinner in its mouth); the GRAVEYARD lock behind four D-O-O-M drop
// targets; M-A-S standups left, T-E-R right; the HEAVEN AND HELL saucer starts the album modes; the HAND OF DOOM post
// rises between the flippers; right outlane kickback (SABBATH SAVE). Rules: tables/sabbathRules.js.
const {tableBuilder,arc,spline}=require("src/engines/pinball/build.js");

function buildTable(){
 const T=tableBuilder({id:'black-sabbath',name:'Black Sabbath',W:514,H:1067,gravity:1300,slope:6.5,drainY:1040,timeScale:.85});
 const m=p=>[472-p[0],p[1]];
 // Cabinet + shooter lane (no left orbit on this table: a full plunge runs round the arch and down onto the upper flipper).
 T.wall([[12,880],[12,256],...arc(256,256,244,180,360,36).slice(1),[500,1062]],{look:'wood',r:3});
 T.wall([[460,1062],[460,342]],{look:'rail',r:3});
 T.wall([[460,1062],[500,1062]],{look:'none',r:3});
 T.gate('shooterGate',[460,338],[499,302],[0,-1]);
 T.plunger(463,497,1010,{travel:36,vmin:950,vmax:3600,auto:2900});
 // I-R-O-N top lanes.
 for(const gx of [158,202,246,290,334])T.wall([[gx,104],[gx,148]],{look:'rail',r:4});
 [['laneI',180],['laneR',224],['laneO',268],['laneN',312]].forEach(([id,x],i)=>{T.rollover(id,x,126,{label:'IRON'[i]});T.lamp(id,x,96,{r:8,color:'#ff7a1a',label:'IRON'[i]});});
 // WAR PIGS pop bumpers.
 T.bumper('pig1',318,214,{r:26}).bumper('pig2',396,214,{r:26}).bumper('pig3',357,282,{r:26});
 // IRON MAN: a toy that steps toward you (parts.ironMan.ty). Peaked head; the underside slopes down to the right so a
 // hit from the upper flipper falls away into the middle, not back onto the flipper.
 T.toy('ironMan',190,245,{w:84,h:116,speed:40,label:'IRON MAN',segs:[[150,298,230,280,7],[150,298,150,208,7],[230,280,230,208,7],[150,208,190,186,7],[190,186,230,208,7]]});
 for(let i=0;i<5;i++)T.lamp('im'+i,158+i*16,342,{r:5,color:'#ff3b30'});
 // Upper LEFT flipper (left button). A rubber post above the left outlane nudges balls coming down the wall inward.
 T.flipper('flipUL',30,440,{len:56,r0:10,r1:5.5,rest:12,up:-38,input:0,wUp:50});
 T.post(28,686,7);
 // INTO THE VOID spinning disc.
 T.disc('void',268,352,{r:38,spin:3,grip:2.6,label:'INTO THE VOID'});
 // The GRAVEYARD: lock pocket behind D-O-O-M drop targets (peaked roof).
 T.wall([[192,484],[192,418],[236,400],[280,418],[280,484]],{look:'plastic',r:4});
 T.drops('doom',[[[196,486],[214,486]],[[216,486],[234,486]],[[238,486],[256,486]],[[258,486],[276,486]]],{labels:['D','O','O','M']});
 T.hole('grave',236,446,{r:17,hold:1.2,eject:[0,950],label:'GRAVEYARD'});
 [0,1,2].forEach(i=>T.lamp('lock'+i,216+i*20,516,{r:7,color:'#7cff4f'}));
 T.lamp('graveJ',236,548,{shape:'arrow',r:12,color:'#7cff4f',label:'SUPER'});
 // PARANOID wireform: left mouth → up the left side → over the top → diverter: right inlane, or into the Graveyard.
 T.wall([[106,596],[106,530]],{look:'plastic',r:4}).wall([[154,596],[154,530]],{look:'plastic',r:4});T.post(106,596,5).post(154,596,5);
 T.flag('paraDiv');   // the ramp diverter at the top of PARANOID (on = into the Graveyard)
 T.rail('paranoid',spline([[130,520,0],[126,440,28],[110,350,55],[86,260,78],[70,190,90],[92,122,96],[160,84,98],[260,74,98],[330,96,96]],8),{look:'wire',width:46,label:'PARANOID',exit:{next:{switch:'paraDiv',on:'paraGrave',off:'paraRight'}}});
 T.rail('paraRight',spline([[330,96,96],[400,130,92],[446,220,86],[452,330,76],[450,480,58],[440,640,36],[420,720,20],[400,770,8],[400,800,0]],8),{look:'wire',width:40,noEntry:true,exit:{minOut:600}});
 T.rail('paraGrave',spline([[330,96,96],[300,160,90],[262,250,75],[244,340,55],[238,400,30],[236,446,0]],8),{look:'wire',width:40,noEntry:true,exit:{hole:'grave'}});
 T.lamp('paraArrow',130,616,{shape:'arrow',r:13,color:'#bf5af2',label:'PARANOID'});T.lamp('paraJ',130,648,{r:8,color:'#ffd23f',label:'JACKPOT'});
 // ELECTRIC FUNERAL wire ramp: right mouth (SUPERNAUT spinner inside) → up → across the middle → left inlane.
 T.wall([[336,596],[336,530]],{look:'plastic',r:4}).wall([[384,596],[384,530]],{look:'plastic',r:4});T.post(336,596,5).post(384,596,5);
 T.spinner('supernaut',[340,582],[380,582],{label:'SUPERNAUT'});
 T.rail('funeral',spline([[360,520,0],[366,440,26],[380,380,48],[330,362,60],[240,368,66],[150,384,64],[94,430,56],[62,500,48],[50,620,34],[64,720,16],[72,770,6],[72,800,0]],8),{look:'wire',width:44,label:'ELECTRIC FUNERAL',exit:{minOut:600}});   // a wireform, so the disc shows through
 T.lamp('funeralArrow',360,616,{shape:'arrow',r:13,color:'#ff2d55',label:'FUNERAL'});T.lamp('funeralJ',360,648,{r:8,color:'#ffd23f',label:'JACKPOT'});
 // M-A-S on the left wall, T-E-R on the shooter wall.
 [['sM',300],['sA',340],['sS',380]].forEach(([id,y],i)=>{T.standup(id,[17,y-11],[17,y+11],{label:'MAS'[i],color:'#bf5af2'});T.lamp(id,34,y,{r:7,color:'#bf5af2',label:'MAS'[i]});});
 [['sT',400],['sE',440],['sR',480]].forEach(([id,y],i)=>{T.standup(id,[455,y-11],[455,y+11],{label:'TER'[i],color:'#bf5af2'});T.lamp(id,438,y,{r:7,color:'#bf5af2',label:'TER'[i]});});
 // HEAVEN AND HELL saucer (album modes) under the upper flipper.
 T.hole('heaven',44,600,{r:16,maxSpeed:1500,hold:1,eject:[560,700],label:'HEAVEN & HELL'});
 T.lamp('hhAlbum',44,560,{r:8,color:'#ffd23f',label:'ALBUM'});T.lamp('hhEB',44,642,{r:8,color:'#ff9f0a',label:'EXTRA BALL'});
 // Lower playfield (mirrored), slings, flippers, the HAND OF DOOM post between them.
 const lower=(f)=>{T.wall([f([12,880]),f([110,976])],{look:'wood',r:3});T.wall([f([50,722]),f([50,850]),f([134,930])],{look:'rail',r:3});T.post(...f([50,722]),6);};
 lower(p=>p);lower(m);
 T.sling('slingL',[94,762],[94,830],[132,868]);T.sling('slingR',m([94,762]),m([94,830]),m([132,868]));
 T.post(94,762,6).post(...m([94,762]),6);
 T.flipper('flipL',148,946,{len:74,rest:30,up:-28,input:0});
 T.flipper('flipR',324,946,{len:74,rest:150,up:208,input:1});
 T.diverter('handOfDoom',[236,1000],[236,1000],{up:false,r:7});
 T.rollover('inL',72,812,{r:10});T.rollover('inR',400,812,{r:10});
 T.rollover('outL',31,858,{r:10});T.kickback('sabbathSave',441,858,[0,-2500]);
 T.lamp('outL',31,812,{r:7,color:'#ff3b30'});T.lamp('sabbathSave',441,812,{r:8,color:'#ff3b30',label:'SAVE'});
 T.lamp('inL',72,780,{r:7,color:'#ff7a1a'});T.lamp('inR',400,780,{r:7,color:'#ff7a1a'});
 T.lamp('hod',236,930,{r:9,shape:'star',color:'#ff2d2d',label:'HAND OF DOOM'});
 // Centre: the six-album ladder, bonus X, shoot again, the WAR PIGS star.
 ['#bf5af2','#ff7a1a','#64d2ff','#ff2d2d','#7cff4f','#ffd23f'].forEach((c,i)=>T.lamp('al'+i,174+i*25,590,{r:8,color:c}));
 ['2','3','4','5','6'].forEach((t,i)=>T.lamp('bx'+t,176+i*30,738,{r:10,color:'#ff7a1a',label:t+'X'}));
 T.lamp('shootAgain',236,895,{r:12,color:'#ff3b30',label:'SHOOT AGAIN'});
 T.lamp('warPigs',236,640,{r:22,shape:'star',color:'#ff2d55',label:'WAR PIGS'});
 T.lamp('spinner',360,500,{r:6,color:'#64d2ff'});
 T.gi([[70,740],[402,740],[110,900],[362,900],[60,520],[432,640],[150,560],[372,560],[236,380],[120,200],[360,160],[60,330],[440,430],[236,690],[300,80],[180,80]],{color:'#ffc89a'});
 T.flasher('fIron',120,182,{color:'#ff3b30'}).flasher('fPigs',440,170,{color:'#ff6ec7'}).flasher('fGrave',236,388,{color:'#7cff4f',r:8}).flasher('fFuneral',402,520,{color:'#bf5af2'}).flasher('fVoid',300,60,{color:'#ffffff'});
 return T.def;
}
const {rules}=require("src/engines/pinball/tables/sabbathRules.js");
const {art}=require("src/engines/pinball/tables/sabbathArt.js");
const {dmdScenes}=require("src/engines/pinball/tables/sabbathDmd.js");
const {songs}=require("src/engines/pinball/tables/sabbathMusic.js");
const GRAVE={x:236,y:446},IRON={x:190,y:245},VOID={x:268,y:352};
const cues={
 jackpot:m=>{m.show('radial',1.4,GRAVE);m.giOff(.9);m.flash('all',5);},
 pigs:m=>{m.show('sweepUp',2.6,{loop:.6});m.giOff(1.6);m.flash('all',8);},
 iron:m=>{m.flash('fIron',4);m.show('radial',.8,IRON);},
 ironDown:m=>{m.show('radial',1.4,IRON);m.giOff(1);m.flash('all',6);},
 grave:m=>{m.flash('fGrave',5);m.show('implode',1.1,GRAVE);},
 lock:m=>{m.flash('fGrave',6);m.show('implode',1.2,GRAVE);m.giOff(.6);},
 void:m=>{m.flash('fVoid',3);m.show('chase',1.2,{arms:3,speed:16});},
 bats:m=>{m.show('sparkle',1);m.flash('fPigs',2);},
 paranoid:m=>{m.show('strobe',.6);m.flash('fFuneral',2);},
 funeral:m=>{m.show('sweepLeft',.9);m.flash('fFuneral',4);},
 witch:m=>{m.show('sweepDown',1.1);m.flash('fVoid',2);},
 hand:m=>{m.show('sweepUp',.9);m.giOff(.5);},
 cross:m=>{m.show('chase',1.6);},
 wizard:m=>{m.show('chase',3,{arms:4,speed:12});m.flash('all',10);m.giOff(1);},
 extra:m=>{m.show('blink',1.6);m.flash('all',8);},
 skill:m=>{m.show('sweepUp',.8);m.flash('fVoid',2);},
 save:m=>{m.show('sweepUp',.7);},
};
// shots the test bot must be able to make (tests/pinball-sim.mjs)
const simChecks=['bumper','sling','spin','drop','junction:paranoid','rail:funeral','hole:heaven','hole:grave','standup','rollover:lane','toy:ironMan','disc:void','flip:flipUL'];
Object.assign(exports,{buildTable,rules,art,dmdScenes,songs,cues,simChecks,id:'black-sabbath',title:'Black Sabbath'});
