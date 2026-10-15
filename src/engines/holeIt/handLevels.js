// Hand-built remakes of real Hole.it levels from the owner's gameplay videos (Hard Level 30 and Levels 31-34).
// Goal cards and their counts are copied from the video; props, size classes, formations and grass islands follow
// what the video shows, zone by zone. Coordinates: x across (±W/2), z down the tray (+z = bottom, where you start).
const PI=Math.PI;
// One arm of a spiral galaxy: r grows by `pitch` per turn, props `sp` apart along the arm.
function arm(B,k,cx,cz,r0,r1,pitch,a0,sp,o={}){let a=a0,r=r0;while(r<=r1){B.add(k,cx+Math.cos(a)*r,cz+Math.sin(a)*r,{...o,yaw:o.yaw??a*2.7});a+=sp/r;r=r0+pitch*(a-a0)/(2*PI);}}
// Popsicles standing radially round a centre, sticks pointing in (a slight pinwheel), as in the owner's Level 3 video.
function popRing(B,k,cx,cz,rad,n,o={}){for(let i=0;i<n;i++){const a=(o.a0||0)+i/n*2*PI;B.add(k,cx+Math.cos(a)*rad,cz+Math.sin(a)*rad,{...o,yaw:Math.atan2(-Math.cos(a),-Math.sin(a))+.35});}}
// Level 4 block: a border of tangerines (7 x 6), a ring of strawberry halves inside and four red onions in the middle.
function orangeBlock(B,cx,cz){const sp=.6;for(let i=0;i<7;i++)for(let j=0;j<6;j++){const x=cx+(i-3)*sp,z=cz+(j-2.5)*sp,edge=i===0||i===6||j===0||j===5,ring=i===1||i===5||j===1||j===4;
  if(edge)B.add('tangerine',x,z,{rand:true});else if(ring)B.add('strawberry-half',x,z,{rand:true});}
 for(const [dx,dz] of [[-.32,-.3],[.32,-.3],[-.32,.3],[.32,.3]])B.add('onion-red',cx+dx,cz+dz,{sc:1.12,rand:true});}
const HAND={
 // ---- Owner's Oct 14 phone video (Galaxy Fold, 1080x1200): Levels 2, 3 and the start of 4. Positions come from a map
 // stitched from the video (hole track × camera scale), in tray coordinates; x across, z down the tray (+z = bottom).
 // Level 2: two orange-slice / strawberry spiral galaxies; 18 big green apples ring the lower one, a watermelon sits
 // in the middle of the upper one. Apples +3, watermelon +10 (video popups). 4:00 clock.
 2:{theme:'fruit',floor:'#46566a',W:15,D:22.2,start:{x:0,z:8.82},time:240,growBase:16,goals:[['watermelon-lying',1],['apple-green',18]],
  build(B){const g1=3.22,g2=-6.28;
   for(const [x,z] of [[0,0],...Array.from({length:6},(_,i)=>[Math.cos(i*PI/3)*.42,Math.sin(i*PI/3)*.42])])B.add('strawberry',x,g1+z,{sc:1.15,rand:true});
   arm(B,'orange-slice',0,g1,.85,3.0,1.0,PI*.5,.56);arm(B,'strawberry',0,g1,.85,3.05,1.0,PI*1.5,.48,{sc:1.15});
   for(let i=0;i<18;i++){const a=i/18*2*PI+.09;B.add('apple-green',Math.cos(a)*3.6,g1+Math.sin(a)*3.6,{sc:1.55,xp:3,yaw:i*1.7});}
   B.add('watermelon-lying',0,g2,{yaw:.5});
   for(let i=0;i<9;i++){const a=i/9*2*PI;B.add('strawberry',Math.cos(a)*1.05,g2+Math.sin(a)*1.05,{sc:1.15,rand:true});}
   arm(B,'orange-slice',0,g2,1.45,3.9,1.0,PI*.2,.56);arm(B,'strawberry',0,g2,1.45,3.95,1.0,PI*1.2,.48,{sc:1.15});
  }},
 // Level 3: a closed box of white dice holds a thick ring of rubber ducks round the green jelly, with spotted-egg piles
 // in its corners; popsicle rings (blue inside, watermelon red outside) sit left and right of the box round the two
 // orange jellies and below it round two towers of 21 wooden discs, each topped by a red jelly. 4:00 clock.
 3:{theme:'treats',floor:'#46566a',W:23,D:20.4,start:{x:0,z:4.1},time:240,growBase:16,goals:[['jelly-green',1],['jelly-red',2],['jelly-orange',2]],
  build(B){const bz=-1.6,sp=.6;
   for(let i=0;i<14;i++){B.add('dice-white',-3.9+i*sp,bz+3.9,{yaw:0});B.add('dice-white',-3.9+i*sp,bz-3.9,{yaw:0});}
   for(let j=1;j<13;j++){B.add('dice-white',-3.9,bz-3.9+j*sp,{yaw:0});B.add('dice-white',3.9,bz-3.9+j*sp,{yaw:0});}
   for(let i=0;i<8;i++)for(let j=0;j<8;j++)if(i<2||i>5||j<2||j>5)B.add('duck',(i-3.5)*.45,bz+(j-3.5)*.45,{sc:.68,yaw:PI});
   B.add('jelly-green',0,bz,{sc:1.1,yaw:.3});
   for(const [x,z,k] of [[-2.68,bz-2.68,'egg-pink'],[-2.68,bz+2.68,'egg-pink'],[2.68,bz-2.68,'egg-orange'],[2.68,bz+2.68,'egg-orange']])B.pile(k,x,z,.78,{sc:1.08,layers:2});
   for(const sx of [-1,1]){const cx=sx*7.8;B.add('jelly-orange',cx,bz,{yaw:.4});popRing(B,'popsicle-ice',cx,bz,1.5,12,{sc:.88});popRing(B,'popsicle-melon',cx,bz,2.65,22,{sc:.88,a0:.1});}
   for(const sx of [-1,1]){const cx=sx*3.9,cz=6.4;const top=B.tower('wood-disc',cx,cz,21,{dy:.2,yaw:0});B.add('jelly-red',cx,cz,{y:21*.2,on:top,yaw:.2});
    popRing(B,'popsicle-ice',cx,cz,1.4,12,{sc:.88});popRing(B,'popsicle-melon',cx,cz,2.45,22,{sc:.88,a0:.1});}
  }},
 // Level 4 (only its first second is in the video): tangerine-bordered blocks of strawberry halves with four red onions,
 // two blocks a row; the top of the tray alternates rows of halves and onions. Goals as on the cards, 3:30 clock.
 4:{theme:'fruit',floor:'#46566a',W:14,D:30.05,start:{x:0,z:12.38},time:210,growBase:16,goals:[['strawberry-half',200],['onion-red',88],['tangerine',228]],
  build(B){const z0=12.38;
   for(let r=0;r<5;r++)for(const cx of [-2.5,2.5])orangeBlock(B,cx,z0-3.1-r*3.9);
   for(let i=0;i<8;i++)B.add('tangerine',-2.8+i*.8,z0-20.9,{rand:true});
   for(let r=0;r<9;r++)for(let i=0;i<12;i++)B.add(r%2?'onion-red':'strawberry-half',-4.4+i*.8,z0-21.6-r*.6,{sc:r%2?1.12:1,rand:true});
  }},
 // Hard Level 30: stars & blueberries, bakery, latte cups, cabbages. Ends at Size 10 eating toy blocks (+15).
 // Sizes measured against the hole in the video: star r.30, latte r.33, cream cupcake r.58, choc muffin r.54, cabbage r1.04.
 30:{theme:'treats',floor:'#3b4254',W:16,D:38,start:{x:0,z:17.2},islands:[[5.0,-8.8,7.6,-6.2],[-7.6,-1.4,-5.2,1.2]],
  goals:[['star',234],['choc-muffin',45],['latte',121],['cabbage',19]],
  build(B){const A=PI/4;
   // bottom: diagonal star / blueberry stripes around the start
   B.diag(['star','star','blueberry'],0,11.8,15.2,8.4,{angle:-A,sp:.66,rsp:.6});
   // bakery row: cream cupcakes, chocolate muffins, cake pops, snack bags
   B.grid('cupcake',-5.8,4.9,3,3,{sc:1.9,sp:1.24});
   B.grid('choc-muffin',-.6,5.6,6,2,{sc:1.8,sp:1.15});
   B.row('cakepop',-3.4,3.2,2.4,3.2,10,{sc:1.5,yaw:0});
   for(let c=0;c<4;c++)B.grid(c%2?'snack-orange':'snack-purple',4.3+c*1.0,4.9,1,5,{sc:1.5,sp:.92});
   B.scatter('candy',-.6,1.8,1.0,5,{sc:1.4});
   // latte heaps (75) and the carrot bundle
   B.triangle('latte',3.4,-2.6,9,{sc:1.25,sp:.74});
   B.grid('latte',-2.6,-2.4,6,5,{sc:1.25,sp:.74,stagger:true});
   B.grid('carrot',.1,-5.6,5,3,{sc:1.7,sp:.6,stagger:true,yaw:.2});
   B.row('jelly',-7.0,-4.0,-4.6,-4.0,4,{sc:1.4});
   // middle: muffin blocks (33), latte lines (46), radishes, cannoli
   B.grid('choc-muffin',-2.6,-9.0,6,2,{sc:1.8,sp:1.15});
   B.grid('choc-muffin',-.6,-12.8,7,3,{sc:1.8,sp:1.15});
   B.row('latte',-7.3,-6.4,-7.3,-14.4,10,{sc:1.25});B.row('latte',3.9,-9.6,3.9,-14.8,8,{sc:1.25});
   B.grid('latte',.2,-16.6,14,2,{sc:1.25,sp:.74});
   B.grid('radish',5.9,-12.6,2,4,{sc:1.5,sp:.75,yaw:.5});B.grid('cannoli',5.4,-.6,3,2,{sc:1.4,sp:.8,yaw:.4});
   // top: hot dogs, trays, croissants, loaves, eggplants
   B.grid('hotdog',-4.6,-18.6,4,1,{sc:1.4,sp:1.25,yaw:.5});B.grid('tray-strawberry',4.9,-18.4,2,1,{sc:1.4,sp:1.8,yaw:.3});
   B.add('croissant',-7.0,-16.6,{sc:1.6,yaw:.6});B.add('croissant',-5.6,-15.6,{sc:1.6,yaw:-.4});
   B.add('bread',6.8,-16.0,{sc:1.5,yaw:.4});B.add('eggplant',-6.4,-10.6,{sc:1.5,yaw:.8});B.add('eggplant',6.4,2.0,{sc:1.5,yaw:-.6});
   B.add('cookie-box',-6.0,8.6,{sc:1.6,yaw:.6});B.add('cookie-box',6.0,-3.6,{sc:1.6,yaw:-.5});
   // cabbages (19) in their own spots, toy blocks (the Size 10 finish) in the corners
   for(const [x,z] of [[-6.4,2.6],[-3.8,1.6],[2.2,1.4],[6.6,8.2],[-6.6,-7.6],[-4.6,-6.4],[1.0,-8.2],[6.4,-10.6],[-3.6,-15.0],[2.8,-15.0],[-1.0,-18.2],[1.6,-18.2],[-6.6,-12.8],[6.6,-14.4],[-2.4,7.2],[2.6,7.4],[6.6,11.2],[-6.6,13.6],[-.2,-6.4]])B.add('cabbage',x,z,{sc:1.15,yaw:x*z});
   B.add('block-yellow',-6.2,16.6,{sc:2.2,yaw:.3});B.add('block-blue',6.2,16.6,{sc:2.2,yaw:.1});B.add('block-red',6.2,-18.0,{sc:2.2,yaw:.5});B.add('block-green',-6.2,-18.4,{sc:2.0,yaw:.2});
   B.diag(['star'],0,7.6,11,1.1,{angle:0,sp:.66,rsp:.66});                                     // overflow: trimmed to exactly 234
  }},
 // Level 31: rubber ducks (402), pineapple buddies and toy sharks in a sea of toys.
 31:{theme:'toys',floor:'#394052',W:16,D:40,start:{x:0,z:15.6},islands:[[-7.6,-3.2,-4.8,-.4],[4.6,-11.4,7.6,-8.6],[-2.2,-14.6,1.4,-12]],
  goals:[['shark',4],['duck',402],['pineapple-toy',28]],
  build(B){
   B.rings('octopus',0,15.6,1.6,3.8,{sc:1.0,sp:.72});                                          // pink octopus rings around the start
   B.diag(['duck','duck','pin-stack','pin-stack'],0,8.4,15.2,6.2,{angle:-.62,sp:.62,rsp:.62,sc:.9});
   B.spiral('duck',-3.6,1.6,1.2,3.2,{sc:.9,sp:.64});
   B.add('duck',-3.6,1.6,{sc:4.6,gk:'duck+',yaw:.4});                                           // giant duck in the middle of a duck spiral
   B.snake('duck',4.2,1.2,6,2,{sc:.9,sp:.62});
   B.snake('pineapple-toy',6.8,-4.6,5,1,{sc:1.3,sp:.95});B.scatter('pineapple-toy',-.4,-5.2,1.4,6,{sc:1.3});
   B.row('frog-ball',-6.6,4.6,-1.6,-.2,7,{sc:1.4});B.row('frog-ball',1.2,-1.4,6.6,-6.8,7,{sc:1.4});
   B.grid('dice',-4.6,-6.4,6,4,{sc:.9,sp:.44});B.grid('dice',5.6,-14.6,6,4,{sc:.9,sp:.44});
   B.rectRing('lego-long',.2,-8.6,3.4,2.4,{sc:1.0,sp:1.0});
   for(const [x,z] of [[-6.2,-8],[-6.2,-9.4],[2.6,-12.6]])B.tower('lego-yellow',x,z,3,{sc:1.6,dy:.32});
   B.diag(['duck','pin-stack'],-.6,-12.4,9,3.6,{angle:.5,sp:.62,rsp:.62,sc:.9});
   B.grid('penguin',3.4,-4.4,4,2,{sc:1.3,sp:.75});B.row('penguin',-7.2,-14.4,-3.4,-14.4,4,{sc:1.3});
   B.scatter('fox',4.8,-17.0,1.8,10,{sc:1.3});B.scatter('fox',-5.6,10.6,1.2,4,{sc:1.3});
   B.ring('pearl',-5.4,-17.2,1.6,22,{sc:1.2});B.ring('pearl',3.6,-1.6,1.4,18,{sc:1.2});
   B.add('dolphin',-5.0,-17.2,{sc:1.4,yaw:.8});B.add('dolphin',-5.8,-16.6,{sc:1.4,yaw:-.5});B.add('dolphin',3.6,-1.6,{sc:1.4});B.add('dolphin',4.2,-2.0,{sc:1.4,yaw:2});
   B.add('pig',-1.2,-9.0,{sc:1.5,yaw:.3});B.ring('octopus',-1.2,-9.0,1.5,12,{sc:.9});
   B.add('boat',6.2,-2.0,{sc:1.4,yaw:.5});
   B.add('shark',-6.2,7.0,{sc:1.55,yaw:.9});B.add('shark',6.0,-7.2,{sc:1.55,yaw:-.7});B.add('shark',-2.6,-14.6,{sc:1.55,yaw:2.2});B.add('shark',6.4,-18.2,{sc:1.55,yaw:1.4});
   B.add('duck',5.8,11.6,{sc:4.6,gk:'duck+',yaw:-.3});B.add('duck',-6.4,-12.4,{sc:4.6,gk:'duck+',yaw:.7});
   B.snake('pineapple-toy',-7.2,6.4,3,1,{sc:1.3,sp:.95});B.row('pineapple-toy',-2.4,-19,2.6,-19,6,{sc:1.3});
   B.rings('duck',3.6,-1.6,2.2,3.1,{sc:.9,sp:.62});B.grid('duck',-2.4,-2.6,7,3,{sc:.9,sp:.62});B.row('duck',-7.4,-19.2,7.4,-19.2,24,{sc:.9});
   B.row('pineapple-toy',-7.2,-6.8,-7.2,-13.6,7,{sc:1.3});B.row('pineapple-toy',1.4,-15.2,4.2,-15.2,3,{sc:1.3});B.scatter('pineapple-toy',3.6,8.6,1.2,4,{sc:1.3});
   B.diag(['duck'],-1.8,5.2,6,1.9,{angle:0,sp:.62,rsp:.62,sc:.9});B.diag(['duck'],2.6,-5.6,4,3.2,{angle:.3,sp:.62,rsp:.62,sc:.9}); // overflow: trimmed to exactly 402
  }},
 // Level 32: points level, reach 1150. Latte heaps, pawn spirals, alien bots, toy cars, dice rings, penguins, mixers.
 32:{theme:'toys',floor:'#3a4152',W:16,D:46,start:{x:0,z:18.6},islands:[[4.8,2.6,7.6,5.4],[-7.6,-12.6,-4.8,-9.8]],mode:'score',score:1150,
  build(B){
   B.pile('latte',-4.6,15.4,2.4,{sc:1.6,layers:3});B.pile('latte',4.6,15.0,2.4,{sc:1.6,layers:3});    // latte heaps beside the start
   B.ring('octopus',0,10.6,4.4,30,{sc:.95});B.ring('octopus',0,10.6,3.6,24,{sc:.95});
   B.grid('alien-bot',0,10.6,6,2,{sc:1.4,sp:1.0});B.grid('alien-bot',-1.0,7.0,10,2,{sc:1.4,sp:1.0});
   B.spiral('pawn',-4.0,2.6,.5,2.7,{sc:1.3,sp:.4});B.spiral('pawn',3.8,-3.4,.5,2.7,{sc:1.3,sp:.4});B.spiral('pawn',-3.6,-16.0,.5,2.4,{sc:1.3,sp:.4});
   B.scatter('toy-car',1.6,2.8,1.6,8,{sc:1.6});B.scatter('toy-car',-2.4,-3.4,2.2,12,{sc:1.6});B.scatter('toy-car',2.6,-16.8,2.0,10,{sc:1.6});
   B.rings('dice',3.4,-10.4,.8,3.2,{sc:.95,sp:.5});B.rings('dice',-4.6,-6.4,.6,1.8,{sc:.95,sp:.5});
   B.grid('penguin-green',6.0,-.6,2,4,{sc:1.8,sp:1.0});B.grid('penguin-green',6.0,-16.2,2,3,{sc:1.8,sp:1.0});B.grid('penguin-green',-6.4,7.0,2,2,{sc:1.8,sp:1.0});
   B.row('frog-ball',-7.0,-1.8,-1.4,-1.8,7,{sc:1.4});B.row('maraca',.6,-6.6,7.0,-6.6,10,{sc:1.3});B.row('maraca',-6.6,-19.0,6.6,-19.0,18,{sc:1.3});
   B.add('mixer',-6.2,11.4,{sc:2.0,yaw:.4});B.add('mixer',6.2,7.8,{sc:2.0,yaw:-.5});B.add('mixer',-.2,-13.4,{sc:2.0});
   B.grid('smoothie-green',-2.0,-9.2,6,2,{sc:1.5,sp:.68});B.grid('matcha',.6,-6.0,6,2,{sc:1.6,sp:.86});
   B.pile('latte',5.6,-12.0,1.6,{sc:1.6,layers:2});B.pile('latte',-5.2,-16.2,1.0,{sc:1.6,layers:2});
   B.add('egg-carton',2.6,6.0,{sc:1.4,yaw:.3});B.add('egg-carton',-6.4,-3.8,{sc:1.4,yaw:-.2});B.add('egg-carton',6.4,-19.2,{sc:1.4});
   B.add('toy-car',6.2,12.0,{sc:3.2,gk:'toy-car+',yaw:.6});B.add('penguin-green',-6.6,-7.8,{sc:3.4,gk:'penguin-green+',yaw:-.3});
  }},
 // Level 33: matcha lattes (201), watermelon slices (37), corn (8), pink cakes (4), strawberry trays (4).
 33:{theme:'kitchen',floor:'#3b4254',W:16,D:40,start:{x:0,z:15.8},islands:[[-7.6,-6.6,-4.8,-3.8],[4.8,-15.6,7.6,-12.8]],
  goals:[['matcha',201],['melon-slice',37],['corn',8],['cake-pink',4],['tray-strawberry',4]],
  build(B){
   B.row('matcha',-4.4,17.4,4.4,17.4,10,{sc:1.3});                                             // matcha row and shrimp under the start
   B.row('shrimp',-6.8,15.8,-2.2,15.8,6,{sc:1.4,yaw:0});B.row('shrimp',2.2,15.8,6.8,15.8,6,{sc:1.4,yaw:0});
   B.grid('macaron',0,13.2,11,2,{sc:1.35,sp:.75});
   B.grid('lollipop',0,8.8,13,6,{sc:1.05,sp:.56});                                             // the lollipop field
   B.grid('radish',-4.6,3.6,6,3,{sc:1.6,sp:.6,yaw:.5});B.grid('carrot',4.8,3.8,5,2,{sc:1.5,sp:.6,yaw:-.4});
   B.grid('matcha',-.4,-1.2,10,6,{sc:1.2,sp:.72});
   for(let i=0;i<10;i++)B.tower('matcha',3.4+(i%2)*.7+(i>=6?-.0:0),-6.0-Math.floor(i/2)*.7,8,{sc:1.2,dy:.19});
   B.ring('melon-slice',-1.6,-9.4,1.6,18,{sc:1.4,face:'out'});B.ring('melon-slice',-1.6,-9.4,2.6,19,{sc:1.4,face:'out'});
   B.add('watermelon',-1.6,-9.4,{sc:.85});
   B.row('corn',-6.8,-1.8,-6.8,-1.8-7*.82,8,{sc:1.6});
   B.grid('jam-jar',4.6,-18.2,3,2,{sc:.6,sp:1.75});
   B.row('tray-strawberry',-6.2,-14.6,-2.2,-14.6,4,{sc:1.5,yaw:.3});
   B.grid('cake-pink',-.4,-18.0,2,2,{sc:2.4,sp:2.4});
   B.add('teapot',2.6,-13.6,{sc:1.4});B.scatter('apple-green',5.6,-9.6,1.4,14,{sc:1.0});B.add('pumpkin',-6.4,8.6,{sc:1.0});
   B.grid('pot-pink',6.6,9.2,1,3,{sc:1.3,sp:1.2});
   B.grid('pepper',5.4,-1.6,3,4,{sc:1.2,sp:.8});B.spiral('popsicle-orange',-3.4,-12.6,.6,1.9,{sc:1.1});B.grid('apple-green',-5.6,-.6,4,3,{sc:1.0,sp:.66});
   B.rings('candy-pink',4.8,-5.4,.5,1.4,{sc:1.4,sp:.42});B.grid('lollipop',-4.6,13.6,5,2,{sc:1.05,sp:.56});B.grid('lollipop',4.6,13.6,5,2,{sc:1.05,sp:.56});
   B.row('matcha',-7.4,-19.4,7.4,-19.4,19,{sc:1.2});B.row('matcha',-7.4,-16.4,-7.4,-7.8,12,{sc:1.2});
   B.grid('matcha',0,11.4,13,2,{sc:1.2,sp:.72});                                                // overflow: trimmed to exactly 201
  }},
 // Level 34: waffles (26), watermelons (11), blue milkshakes (26), orange jam jars (19).
 34:{theme:'kitchen',floor:'#3a4152',W:16,D:40,start:{x:0,z:12.6},bombs:3,islands:[[4.8,2.4,7.6,5.2],[-7.6,-8.6,-4.8,-5.8],[4.6,-16.8,7.6,-14]],
  goals:[['waffle',26],['watermelon',11],['milkshake-blue',26],['jar-orange',19]],
  build(B){
   B.ring('blueberry',0,12.6,1.25,14,{sc:1.4});B.rectRing('tomato',0,12.6,3.6,3.6,{sc:1.2,sp:.7});
   B.ring('blueberry',0,12.6,2.7,30,{sc:1.4});B.ring('blueberry',0,12.6,3.5,38,{sc:1.4});
   B.scatter('orange',4.6,7.6,2.0,26,{sc:.75});B.pile('orange',-4.8,6.6,1.6,{sc:.75,layers:3});
   B.scatter('waffle',2.6,5.8,1.8,8,{sc:1.35});B.grid('waffle',5.6,-7.4,2,3,{sc:1.35,sp:1.05});B.grid('waffle',-1.0,-6.4,3,2,{sc:1.35,sp:1.05});B.grid('waffle',-3.6,-12.4,4,3,{sc:1.35,sp:1.05});B.scatter('waffle',5.6,-4.8,1.4,6,{sc:1.35});
   B.grid('milkshake-blue',-1.6,1.2,2,6,{sc:1.3,sp:.58});B.grid('milkshake-blue',2.4,-15.2,2,7,{sc:1.3,sp:.58});
   for(let i=0;i<12;i++)B.tower('cup-red',-6.8+i*.62,-1.6,3,{sc:1.0,dy:.12});
   B.grid('candy-pink',5.8,9.8,3,2,{sc:1.6,sp:.42});B.grid('candy-purple',-6,1.0,3,2,{sc:1.6,sp:.42});B.grid('candy-orange',1.8,-3.8,6,2,{sc:1.6,sp:.42});B.grid('candy-orange',-1.4,-19.0,6,2,{sc:1.6,sp:.42});
   B.grid('milkshake',-4.4,-17.4,4,4,{sc:1.5,sp:.7});
   B.grid('cake-strawberry',1.0,-9.6,3,2,{sc:1.3,sp:1.4});B.add('cake-birthday',-5.6,-2.8,{sc:1.5});
   B.grid('jar-apple',-6.4,10.2,1,2,{sc:2.0,sp:2.5});B.grid('pepper',2.4,-7.2,6,4,{sc:1.2,sp:.75});
   B.row('smoothie-green',-6.8,-10.2,-6.8,-15.6,8,{sc:1.4});
   for(const [x,z] of [[6.2,12.6],[-6.6,13.4],[3.0,-1.2],[-3.4,-6.6],[6.4,-9.2],[-1.2,-15.6],[5.8,-19.0],[-6.6,-19.2],[.2,-4.8],[4.2,-12.2],[-6.4,4.2]])B.add('watermelon',x,z,{sc:1.25});
   B.row('jar-orange',-6.0,-18.4,6.0,-18.4,6,{sc:2.0});B.row('jar-orange',7.2,8,7.2,-12,8,{sc:2.0});B.row('jar-orange',-7.2,-.2,-7.2,-4.0,2,{sc:2.0});B.row('jar-orange',-5.6,17.6,5.6,17.6,3,{sc:2.0});
  }},
};
Object.assign(exports,{HAND});
