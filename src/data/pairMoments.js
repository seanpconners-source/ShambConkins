// Occasional decisions, separate from the once-per-run pairing discoveries.
const PAIR_MOMENTS={
 'home-chaos':{title:'The house-party pit stop',body:'Sean and Amber agree to a detour. Pick what matters for this stretch of the board.',choices:[
  {id:'zoomies',label:'Let the dogs lead',description:'This roll +3; your following roll is halved.',effects:{boost:3,delayedSlow:1}},
  {id:'plan',label:'Pack for the next game',description:'One shield and +2 on your next winning game reward.',effects:{shields:1,rewardBonus:2}}
 ]},
 'regional-assistant':{title:'Dunder Mifflin needs a team-building plan',body:'Michael calls it leadership. Dwight calls it an emergency drill.',choices:[
  {id:'parkour',label:'PARKOUR!',description:'This roll +4; your following roll is halved.',effects:{boost:4,delayedSlow:1}},
  {id:'drill',label:'Dwight’s safety drill',description:'Pay 1 point for two shields. Warehouse Shift becomes the next board challenge.',effects:{cost:1,shields:2,game:'warehouse-shift'}}
 ]},
 'bullet-time':{title:'The hardline or the rooftop?',body:'Neo and Trinity have two exits. The fast one has a difficult landing.',choices:[
  {id:'roof',label:'Take the rooftop jump',description:'Pay 2 points: this roll +5, then one half-speed roll.',effects:{cost:2,boost:5,delayedSlow:1}},
  {id:'phone',label:'Find the phone',description:'One Lucky roll and one shield.',effects:{rerolls:1,shields:1}}
 ]},
 'saiyan-rivals':{title:'One more round of training',body:'Goku and Vegeta have turned a rest stop into a rivalry.',choices:[
  {id:'training',label:'Enter the Hyperbolic Time Chamber',description:'Next winning game reward +5; this roll is halved.',effects:{rewardBonus:5,slow:1}},
  {id:'tournament',label:'Head straight to the tournament',description:'This roll +2. Dragon Ball trivia becomes the next board challenge.',effects:{boost:2,game:'trivia-dbz'}}
 ]},
 'aggression':{title:'Walter has a ruling',body:'The Dude would like a quiet game. Walter has noticed an infraction.',choices:[
  {id:'zero',label:'MARK IT ZERO!',description:'Opponent loses up to 3 points (protection can block it); your roll is halved.',effects:{otherPenalty:3,slow:1}},
  {id:'abide',label:'The Dude abides',description:'One shield and one Lucky roll.',effects:{shields:1,rerolls:1}}
 ]},
 '88-mph':{title:'The DeLorean is almost ready',body:'Doc has calculated a shortcut. Marty asks about the return journey.',choices:[
  {id:'future',label:'Push it to 88 mph',description:'Pay 3 points: triple this roll, then one half-speed roll.',effects:{cost:3,triple:1,delayedSlow:1}},
  {id:'repair',label:'Check the flux capacitor',description:'+2 points and one Lucky roll.',effects:{points:2,rerolls:1}}
 ]},
 'hand-doom':{title:'One more Sabbath encore',body:'Ozzy wants another song. Tony is looking at the size of the amplifier.',choices:[
  {id:'encore',label:'TURN IT UP!',description:'Next winning game reward +5; this roll is halved.',effects:{rewardBonus:5,slow:1}},
  {id:'backstage',label:'Regroup backstage',description:'One shield and one Lucky roll.',effects:{shields:1,rerolls:1}}
 ]},
 'orange-soda':{title:'Kel found the orange-soda aisle',body:'Kenan can keep the pair moving, or let Kel replenish the bag.',choices:[
  {id:'soda',label:'Who loves orange soda?',description:'Add Orange Soda to your bag; the opponent gets +2 on their next roll.',effects:{item:'orange-soda',otherBoost:2}},
  {id:'leave',label:'Get out before something breaks',description:'This roll +3; no item.',effects:{boost:3}}
 ]},
 'jackass-stunts':{title:'One shopping cart, two bad ideas',body:'Knoxville and Steve-O have spotted a ramp. You choose the consequences.',choices:[
  {id:'ramp',label:'Send it down the ramp',description:'This roll +5; your following roll is halved.',effects:{boost:5,delayedSlow:1}},
  {id:'crew',label:'Work the camera',description:'+2 points and one shield.',effects:{points:2,shields:1}}
 ]},
 'kramer-newman':{title:'The bottle-deposit van is full',body:'Kramer wants one more stop. Newman insists they have a route to finish.',choices:[
  {id:'bottles',label:'Load another crate',description:'+5 points; this roll is halved.',effects:{points:5,slow:1}},
  {id:'delivery',label:'Keep the delivery moving',description:'This roll +2 and next winning game reward +2.',effects:{boost:2,rewardBonus:2}}
 ]},
 'burger-rescue':{title:'Bob and Gordon have a dinner service',body:'The customers are arriving. Do you prepare the kitchen or start serving?',choices:[
  {id:'service',label:'Open for service',description:'Next winning game reward +4; this roll is halved. Dinner Service is the next board challenge.',effects:{rewardBonus:4,slow:1,game:'kitchen-service'}},
  {id:'prep',label:'Do the prep first',description:'One shield and +2 points.',effects:{shields:1,points:2}}
 ]}
};

Object.assign(exports,{PAIR_MOMENTS});