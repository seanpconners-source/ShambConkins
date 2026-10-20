// Hand-built remakes of real Hole.it levels from the owner's gameplay videos (Levels 2-6, Hard Level 30, Levels 31-34).
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
// Level 4 (full video) block over a rectangle: tangerine border, a ring of strawberry halves inside it, red onions
// filling the middle (thick blocks alternate rows of halves and onions, as in the video).
function fruitBlock(B,x0,x1,z0,z1){const sp=.54,nx=Math.max(3,Math.round((x1-x0)/sp)+1),nz=Math.max(3,Math.round((z1-z0)/sp)+1),dx=(x1-x0)/(nx-1),dz=(z1-z0)/(nz-1);
 for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const x=x0+i*dx,z=z0+j*dz,e=Math.min(i,j,nx-1-i,nz-1-j);
  if(e===0)B.add('tangerine',x,z,{sc:.95,rand:true});else if(e===1||(e%2===1&&Math.min(nx,nz)>6))B.add('strawberry-half',x,z,{sc:.95,rand:true});else B.add('onion-red',x,z,{rand:true});}}
// Level 5 popsicles stand radially with their sticks pointing out (the model's stick is along +z), 0.47 apart along a
// row, as measured in the owner's video. The two spirals follow the real arm, measured popsicle by popsicle from the
// video (polar knots [angle, radius] round its centre, clockwise, ~2.75 turns from r 0.92 to 4.4).
const outward=a=>PI/2-a,POP_SP=.47;
const ARM=[[-.375,.922],[-.899,1.289],[-1.422,1.36],[-1.946,1.449],[-2.47,1.501],[-2.993,1.625],[-3.517,1.757],[-4.04,1.893],[-4.564,2.094],[-5.088,2.266],[-5.611,2.483],[-6.135,2.694],[-6.658,2.815],[-7.182,2.86],[-7.706,2.869],[-8.229,2.875],[-8.753,2.903],[-9.276,3.005],[-9.8,3.073],[-10.324,3.154],[-10.847,3.283],[-11.371,3.512],[-11.894,3.699],[-12.418,3.952],[-12.942,4.066],[-13.465,4.105],[-13.989,4.06],[-14.512,4.1],[-15.036,4.15],[-15.56,4.21],[-16.083,4.28],[-16.607,4.34],[-17.13,4.4]];
const D2R=Math.PI/180,RED_ARM=[[137,.49],[107,.83],[82,.99],[61,1.15],[43,1.37],[28,1.53],[13,1.67],[0,1.79],[-13,1.88],[-63,1.99],[-100,1.99],[-137,2.02],[-172,2.05],[-206,2.07],[-339,2.78],[-354,2.94],[-370,3.04],[-384,3.1],[-430,3.09],[-500,3.11],[-560,3.08],[-704,3.83],[-720,4.0],[-735,4.05]].map(([d,r])=>[d*D2R,r]);
function armSpiral(B,k,cx,cz,knots=ARM,rMax=4.4){const rAt=a=>{for(let i=0;i<knots.length-1;i++){const [a0,r0]=knots[i],[a1,r1]=knots[i+1];if(a<=a0&&a>=a1)return r0+(r1-r0)*(a0-a)/(a0-a1);}return knots[knots.length-1][1];};
 let a=knots[0][0];const end=knots[knots.length-1][0];while(a>=end){const r=Math.min(rMax,rAt(a));B.add(k,cx+Math.cos(a)*r,cz+Math.sin(a)*r,{yaw:outward(a)});a-=POP_SP/r;}}
function popRing2(B,k,cx,cz,r){const n=Math.floor(2*PI*r/POP_SP);for(let i=0;i<n;i++){const a=i/n*2*PI;B.add(k,cx+Math.cos(a)*r,cz+Math.sin(a)*r,{yaw:outward(a)});}}
// Level 5 Lego stack (video): 2.2 x 2.2 footprint, 7 layers of big 2x4 bricks (4 across, 2 deep), red / blue / pink /
// green / purple / yellow / yellow from the bottom, with a pink toy train on top that needs a Size 6 hole.
function legoStack(B,cx,cz){const cols=['brick-red','brick-blue','brick-pink','brick-green','brick-purple','brick-yellow','brick-yellow'],lh=.37;
 for(let L=0;L<cols.length;L++)for(let i=0;i<4;i++)for(let j=0;j<2;j++)B.add(cols[L],cx+(i-1.5)*.55,cz+(j-.5)*1.1,{y:L*lh,yaw:0});
 B.add('train-pink',cx,cz,{y:cols.length*lh,yaw:.3,sc:1.6});}// Level 4 block between corner tangerines (x0,z0)-(x1,z1) with about `sp` spacing: tangerine border, halves ring, then
// rings alternating onions / halves; small (7x7) blocks put a 2x2 of onions in the middle instead. Cells under a
// peach stay empty.
function fruitBlock2(B,x0,x1,z0,z1,sp,small,avoid=[]){const nx=Math.round((x1-x0)/sp)+1,nz=Math.round((z1-z0)/sp)+1,dx=(x1-x0)/(nx-1),dz=(z1-z0)/(nz-1);
 const free=(x,z)=>avoid.every(([px,pz])=>Math.hypot(px-x,pz-z)>.75);
 for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const x=x0+i*dx,z=z0+j*dz,e=Math.min(i,j,nx-1-i,nz-1-j);if(!free(x,z))continue;
  if(e===0)B.add('tangerine',x,z,{sc:.95,rand:true});else if(e===1)B.add('strawberry-half',x,z,{sc:.95,rand:true});
  else if(!small)B.add(e%2?'strawberry-half':'onion-red',x,z,{sc:e%2?.95:1,rand:true});}
 if(small){const cx=(x0+x1)/2,cz=(z0+z1)/2;for(const [a,b] of [[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]])B.add('onion-red',cx+a*dx,cz+b*dz,{rand:true});}}const HAND={
 // ---- Owner's Oct 14 phone video (Galaxy Fold, 1080x1200): Levels 2, 3 and the start of 4. Positions come from a map
 // stitched from the video (hole track × camera scale), in tray coordinates; x across, z down the tray (+z = bottom).
 // Level 2: two orange-slice / strawberry spiral galaxies; 18 big green apples ring the lower one, a watermelon sits
 // in the middle of the upper one. Apples +3, watermelon +10 (video popups). 4:00 clock.
 2:{theme:'fruit',floor:'#46566a',W:15,D:22.2,start:{x:0,z:8.82},time:240,growBase:15,goals:[['watermelon-lying',1],['apple-green',18]],
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
 3:{theme:'treats',floor:'#46566a',W:23,D:20.4,start:{x:0,z:4.1},time:240,growBase:15,goals:[['jelly-green',1],['jelly-red',2],['jelly-orange',2]],
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
 // ---- Owner's second Fold video (Oct 14): Levels 4, 5 and 6 played start to finish. Positions from maps stitched
 // from the video, shifted into tray coordinates (the tray centre is 0,0).
 // Level 4: blocks read off a top-down map stitched from the owner's video (every frame warped onto the floor with the
 // measured camera). Each block: a border of tangerines, a ring of strawberry halves, then alternating rings of red onions
 // and halves; the four 7x7 blocks have a 2x2 of onions in the middle. The tray is a cross: grass fills three corners.
 // Goals 200 halves / 88 onions / 228 tangerines / 3 peaches, 3:30 clock; cleared at Size 7 in the video.
 4:{theme:'fruit',floor:'#46566a',W:21.7,D:21.3,start:{x:-1.25,z:7.65},time:210,growBase:15,
  islands:[[7.55,-10.65,10.85,-6.55],[3.65,4.85,10.85,10.65],[-10.85,.25,-6.35,10.65]],
  goals:[['strawberry-half',200],['onion-red',88],['tangerine',228],['peach',3]],
  build(B){const ox=-.75,oz=-.35,P=[[-.92,.06],[7.3,.6],[-6.0,-7.44]]; // map coordinates -> tray (the tray is centred)
   const blk=(x0,x1,z0,z1,sp,small)=>fruitBlock2(B,x0+ox,x1+ox,z0+oz,z1+oz,sp,small,P.map(([x,z])=>[x+ox,z+oz]));
   blk(.28,3.67,3.25,6.67,.57,1);blk(-5.0,-1.56,3.67,6.67,.57,1);        // the two blocks above the start
   blk(-4.53,-1.47,-6.39,-3.42,.5,1);blk(.06,3.17,-6.53,-3.53,.5,1);     // the two top blocks
   blk(-8.97,-4.53,-2.36,.39,.5);blk(-3.56,2.42,-2.36,2.92,.5);blk(3.61,6.5,-2.78,2.42,.5);blk(7.0,10.19,-2.36,2.42,.5); // middle band
   for(const [x,z] of P)B.add('peach',x+ox,z+oz,{yaw:x*z});
  }},
 // Level 5: popsicle galaxies. The start sits in a green spiral; a red spiral to its left; blue/pink and orange
 // rainbow rings round Lego brick stacks, each stack topped by a pink toy train (the 4 goal trains), and two more
 // stacks with trains between them. 2:30 clock; cleared at Size 7.
 5:{theme:'treats',floor:'#46566a',W:22.2,D:21.4,start:{x:6,z:6.25},time:150,growBase:15,goals:[['train-pink',4]],
  build(B){
   armSpiral(B,'pop-lime',6-.45,6.25-.7);armSpiral(B,'pop-red',-4.2,5.4,RED_ARM,4.1);
   popRing2(B,'pop-blue',-4.45,-2.0,2.05);popRing2(B,'pop-pink',-4.45,-2.0,2.86);popRing2(B,'pop-blue',-4.45,-2.0,3.68);
   popRing2(B,'pop-amber',4.6,-3.0,2.05);popRing2(B,'pop-orange',4.6,-3.0,2.86);popRing2(B,'pop-amber',4.6,-3.0,3.68);
   for(const [x,z] of [[-4.45,-2.0],[4.6,-3.0],[0,-6.6],[.1,1.4]])legoStack(B,x,z); // stack centres: where the hole sits under each one in the video
  }},
 // Level 6: a toy-and-gadget room. Goals: 2 green fridges, 2 toy helicopters, 7 orange TVs; 3:30 clock; Size 6 at the
 // end. A field of toy phones above the start, fridges (which wedge across a Size 5 hole), microwaves, star balls,
 // monster trucks, hair dryers, kettles, boomboxes, consoles, calculators, toy keyboards, pins and bracelets.
 6:{theme:'toys',floor:'#46566a',W:28,D:31,start:{x:-3,z:2.5},time:210,growBase:15,islands:[[.6,4.2,2.6,15.5]],
  goals:[['fridge-green',2],['helicopter',2],['tv-orange',7]],
  build(B){const T=(x,z)=>[x-3,z+2.5];const add=(k,x,z,o={})=>{const [tx,tz]=T(x,z);B.add(k,tx,tz,o);};
   // field of toy phones (with a line of pins down it) above the start
   for(let i=0;i<13;i++)for(let j=0;j<14;j++){const x=-4+i*.56,z=-10+j*.53;if(Math.abs(x+.3)<.2)add('pin',x,z);else add('phone-purple',x,z,{yaw:.5});}
   for(let i=0;i<3;i++)for(let j=0;j<3;j++)add('headphones',-9.2+i*.85,-14.2+j*.85,{yaw:0});
   add('ball-spiky',-6,-15.6);add('ball-spiky',-4.2,-15.6);add('microwave',-2,-16.8,{yaw:0});add('microwave',8.8,-10,{yaw:.3});add('microwave',-5,6.4,{yaw:-.2});add('microwave',12,-17,{yaw:0});
   for(let i=0;i<6;i++){const a=i/6*2*PI;add('kettle',-1.4+Math.cos(a)*.9,-13.4+Math.sin(a)*.9);}
   for(const [x,z,y] of [[-3.6,-13,.4],[-4.2,-12.2,1.2],[12.6,-3.2,0],[13.4,-2.2,1],[12.2,-1.8,2],[-5.6,2.4,.3],[-4.6,3,1.4],[-5.2,4,2.6],[-4,4.4,3.5]])add('hairdryer',x,z,{yaw:y});
   add('fridge-green',-8,-9.6,{yaw:.2});add('fridge-green',5.6,-13.6,{yaw:-.1});add('fridge-yellow',-6.8,8.4,{yaw:.1});add('fridge-yellow',4,-17,{yaw:0});
   for(const [x,z] of [[-6.4,-7.8],[-6.4,-5.4],[13.8,-16],[15.6,-16],[13.8,-13.8],[15.6,-13.8]])add('monster-truck',x,z,{yaw:0});
   for(const [x,z] of [[.4,-12.6],[1.5,-12.3],[5.2,-8.4],[5.8,-7.8]])add('headphones',x,z,{yaw:x});
   add('bracelet',11.6,-13.6);add('bracelet',9.4,-7.2);add('bracelet',-8.4,-1.6);
   for(const [x,z] of [[7,-3.4],[9,-3.4],[7,-1.4],[9,-1.4],[11.9,-10.4],[11.9,-7.8],[14.6,-11.6]])add('tv-orange',x,z,{yaw:0});
   for(const x of [7.2,9.6])for(const z of [.8,2.1,3.4])add('boombox',x,z,{yaw:-.15});
   for(const x of [11.6,13.4])for(const z of [1.8,3.3,4.8])add('ball-spiky',x,z);
   add('duck',8,4.9,{sc:3,yaw:-.6});add('duck',8,6.7,{sc:3,yaw:-.6});
   for(let i=0;i<8;i++){const a=i/8*2*PI;add('kettle',8.6+Math.cos(a)*1.35,10+Math.sin(a)*1.35);}
   add('helicopter',12.6,8.6,{yaw:-.4});for(let i=0;i<16;i++){const a=i/16*2*PI;add('pin',12.6+Math.cos(a)*1.35,8.6+Math.sin(a)*1.35);}
   add('helicopter',-4.8,-.4,{yaw:.8});
   for(const [x,z] of [[11,-5.6],[12.4,-5.6],[13.8,-5.6]])add('toy-piano',x,z,{yaw:0});
   for(let i=0;i<8;i++){const a=i/8*2*PI;add('toy-piano',-8.6+Math.cos(a)*1.1,10.4+Math.sin(a)*1.1,{yaw:-a+PI/2});}
   for(const x of [-1.6,-.6,.4])for(const z of [3.4,4.4])add('calculator',x,z,{yaw:.4});
   for(let i=0;i<4;i++)for(let j=0;j<2;j++)add('calculator',14+i*.65,-8.6+j*.9,{yaw:.4});
   for(const x of [-2.6,-1.1,.4])for(const z of [7.3,8.1,8.9,9.7])add('console-yellow',x,z,{yaw:0});
   for(const z of [7,7.8,8.6,9.4])add('kettle',2.8,z);
   for(const [x,z] of [[12,-12.4],[9.6,-15.6],[13.6,-10.6],[4,-9.2]])add('ball-star-blue',x,z);
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
