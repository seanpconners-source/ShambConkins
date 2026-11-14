// Sitabout Mini Golf courses (a nod to Walkabout Mini Golf: you sit on the couch instead). Three themed courses of six
// holes = a full 18. Coordinates: see physics.js (ball radius 1, tee at the bottom, cup at the top). Greens may overlap:
// where two pieces at one height meet there is no rail. R(x,y,w,h) is a rectangle; circ(cx,cy,rx,ry,n) a round piece.
// Each course: id, name, ref (the film), look (palette for the drawn art + the art slot prefix), holes.
// Each hole: name, par, tee, cup, greens, water, blocks, bumpers, boost, tunnels, magnets, tramps, conveyors, movers,
// props (drawn scenery on the green: {k,x,y,s}), lost (a hidden lost ball, Walkabout style: roll over it to find it).
const {R,circ}=require("src/engines/minigolf/physics.js");
const lane=(pts,w)=>{const out=[],back=[];for(let i=0;i<pts.length;i++){const p=pts[i],a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];let dx=b[0]-a[0],dy=b[1]-a[1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
 let k=1;if(i>0&&i<pts.length-1){const ux=p[0]-a[0],uy=p[1]-a[1],ul=Math.hypot(ux,uy)||1,vx=b[0]-p[0],vy=b[1]-p[1],vl=Math.hypot(vx,vy)||1;const c=(ux*vx+uy*vy)/(ul*vl);k=1/Math.max(.5,Math.sqrt((1+c)/2));}
 out.push([+(p[0]-dy*w/2*k).toFixed(2),+(p[1]+dx*w/2*k).toFixed(2)]);back.unshift([+(p[0]+dy*w/2*k).toFixed(2),+(p[1]-dx*w/2*k).toFixed(2)]);}return out.concat(back);};

const BUSHWOOD={id:'bushwood',name:'Bushwood Country Club',ref:'Caddyshack',tag:'The Bushwood greens, gopher and all.',
 look:{lawn:'#3f7f35',lawn2:'#357029',turf:'#53b44a',turf2:'#4aa843',rail:'#8a5a2e',railTop:'#b47a44',railSide:'#5e3a1c',sand:'#e8d49c',water:'#2f86c8',sky:'#9fd4ff',props:['oak','oak','pine','pine','bush','bush','flowers','cart']},
 holes:[
 {name:'Noonan!',par:2,quote:'"Noonan! Miss it, Noonan!"',tee:[30,122],cup:[30,22],
  greens:[{pts:R(16,10,28,120),hills:[[30,72,7,1.3],[30,22,6,-.4]]},{pts:R(34,34,8,12),type:'sand'}],
  props:[{k:'flag-sign',x:12,y:120,s:1}],lost:[41,12]},
 {name:'Bushwood Windmill',par:3,quote:'A Bushwood tradition since the Judge was a boy.',tee:[32,140],cup:[32,24],
  greens:[{pts:R(18,8,28,140),hills:[[32,24,6,-.7],[26,110,6,.8]]},{pts:R(18,30,8,10),type:'sand'}],
  blocks:[{pts:R(18,60,10,12),h:7,look:'mill'},{pts:R(36,60,10,12),h:7,look:'mill'}],
  movers:[{kind:'windmill',x:32,y:72,w:8,r:15,speed:1.7,house:[18,60,28,12]}],lost:[44,10]},
 {name:"The Gopher's Lair",par:3,quote:'"In the immortal words of Jean-Paul Sartre: au revoir, gopher."',tee:[32,142],cup:[32,18],
  greens:[{pts:R(8,8,48,102),hills:[[32,18,6,-.35]]},{pts:R(18,100,28,48)}],
  water:[{pts:circ(15,62,7,9,18)},{pts:circ(49,62,7,9,18)}],
  blocks:[{pts:R(24,50,16,3),h:2.5,look:'log'}],
  movers:[{kind:'gophers',holes:[[22,92],[42,92],[32,72],[18,36],[46,36],[32,34]],period:2.1}],lost:[10,10]},
 {name:'Baby Ruth Pool',par:3,quote:'"DOODY!" Everybody out of the pool.',tee:[21,162],cup:[72,22],
  greens:[{pts:R(8,30,26,140),hills:[[21,100,6,.9]]},{pts:R(8,8,76,30),hills:[[72,22,6,-.4]]},{pts:R(56,30,10,8),type:'sand'}],
  water:[{pts:R(9,9,18,16),pool:true}],
  bumpers:[[38,34,2.4,110]],lost:[82,36]},
 {name:'Cinderella Story',par:3,quote:'"Cinderella story. Outta nowhere. A former greenskeeper..."',tee:[30,150],cup:[30,24],
  greens:[{pts:R(10,100,40,60)},{pts:R(20,74,20,26),zy:[100,0,74,5]},{pts:R(6,8,48,66),z:5,hills:[[18,40,6,1.2],[42,52,6,1.2],[30,24,6,-.45]]}],
  props:[{k:'flowers',x:8,y:96,s:1},{k:'flowers',x:52,y:96,s:1}],lost:[8,72]},
 {name:"Carl's Dynamite",par:4,quote:'"So I got that goin\' for me, which is nice."',tee:[40,170],cup:[40,22],
  greens:[{pts:R(6,8,68,172),hills:[[40,22,7,-.45]]},{pts:R(8,10,12,10),type:'sand'},{pts:R(60,10,12,10),type:'sand'}],
  bumpers:[[22,124,3,130],[58,124,3,130],[24,72,3,130],[56,72,3,130],[40,48,3.2,130]],
  movers:[{kind:'spinner',x:40,y:100,len:10,speed:1.3},{kind:'gophers',holes:[[14,150],[66,150],[40,140],[14,92],[66,92]],period:2}],
  tunnels:[{a:[68,170],r:2.6,b:[66,36],dir:[-1,0],v:55}],lost:[70,12]},
 ]};

const GILMORE={id:'gilmore',name:'Waterbury Putt-Putt',ref:'Happy Gilmore',tag:'Where Chubbs taught Happy to putt. Go to your happy place.',
 look:{lawn:'#2f6f3a',lawn2:'#28602f',turf:'#33c15a',turf2:'#2db152',rail:'#d8473a',railTop:'#f2f2f2',railSide:'#a02e24',sand:'#f0dca8',water:'#2aa0d8',sky:'#bfe8ff',props:['palm','palm','palm','bush','bush','flowers','castle','hockey']},
 holes:[
 {name:"The Clown's Mouth",par:2,quote:'"In the hole you go!" Right in the clown\'s mouth.',tee:[30,122],cup:[30,22],
  greens:[{pts:R(14,10,32,120),hills:[[30,22,6,-.45]]}],
  blocks:[{pts:R(19,50,22,12),h:9,look:'clown'}],
  tunnels:[{a:[30,63.7],r:2.4,b:[30,46],dir:[0,-1],v:46}],
  movers:[{kind:'gate',a:[25.5,65.6],b:[34.5,65.6],period:2.2,duty:.5,look:'teeth'}],lost:[44,128]},
 {name:"Chubbs' Gator",par:3,quote:'"It took my hand... I got a little upset."',tee:[32,142],cup:[32,24],
  greens:[{pts:R(14,10,36,140),hills:[[32,24,6,-.4]]},{pts:R(26,64,12,32),bridge:true,type:'carpet'}],
  water:[{pts:R(14,70,36,22)}],
  movers:[{kind:'gator',path:[[10,81],[54,81]],speed:13,r:3.4}],lost:[16,12]},
 {name:"Happy's Run-Up",par:3,quote:'Run up, wind up, Happy Gilmore it over the water.',tee:[30,250],cup:[26,26],
  greens:[{pts:R(18,150,24,110)},{pts:R(2,150,16,22)},{pts:R(2,40,8,132)},{pts:R(2,10,48,100),hills:[[26,26,6,-.8],[40,70,7,1]]},{pts:R(22,136,16,14),zy:[150,0,136,3.4],open:[0]}],
  water:[{pts:R(10,110,40,26)}],
  props:[{k:'hockey',x:46,y:200,s:1}],lost:[48,104]},
 {name:"Shooter's Slope",par:3,quote:'"I eat pieces of sh... like you for breakfast." Mind the break.',tee:[44,132],cup:[18,24],
  greens:[{pts:R(8,10,50,130),zx:[8,4.5,58,0],hills:[[34,82,8,1.6],[18,24,5,-.4]]}],
  blocks:[{pts:R(28,48,9,4),h:3,look:'brick'}],lost:[56,12]},
 {name:'The Price Is Wrong',par:3,quote:'Bob Barker swings first. Bounce off everything.',tee:[36,152],cup:[36,20],
  greens:[{pts:R(6,10,60,150),hills:[[36,20,6,-.45]]}],
  bumpers:[[20,118,3,140],[52,118,3,140],[36,100,3,140],[16,58,3,140],[56,58,3,140],[36,40,2.6,120]],
  movers:[{kind:'slider',pts:R(8,78,16,4),a:[40,0],period:3.4},{kind:'slider',pts:R(48,136,16,4),a:[-40,0],period:2.8,ph:.5}],lost:[8,12]},
 {name:'Happy Place',par:4,quote:'"Go to your happy place..." Lingerie, beer and a midget cowboy.',tee:[30,206],cup:[34,32],G:1,
  greens:[{pts:circ(30,202,14,12,22)},{pts:lane([[30,192],[30,160],[54,132],[54,112],[20,84],[22,46]],10),type:'carpet'},{pts:circ(32,38,17,16,24),hills:[[34,32,6,-.5]]}],
  tramps:[{x:38,y:195,r:3,vz:170}],links:[[38,195,54,124]],
  props:[{k:'cloud',x:62,y:180,s:1.2},{k:'cloud',x:4,y:120,s:1},{k:'cloud',x:62,y:60,s:1.1}],lost:[46,40],sky:true},
 ]};

const SPACEBALLS={id:'spaceballs',name:'Spaceball City Links',ref:'Spaceballs',tag:'Low gravity, Ludicrous Speed and the Schwartz.',
 look:{lawn:'#0c0b22',lawn2:'#13113a',turf:'#3fb7c9',turf2:'#37a7b8',rail:'#c7ccd8',railTop:'#eef2fa',railSide:'#7b8296',sand:'#e2b46a',water:'#7a3cff',sky:'#05031a',space:true,props:['rock','rock','crystal','crystal','beacon','dish']},
 holes:[
 {name:'Ludicrous Speed',par:2,quote:'"They\'ve gone to plaid!"',G:.55,tee:[31,182],cup:[31,16],
  greens:[{pts:R(18,64,26,126)},{pts:R(20,50,22,14),zy:[64,0,50,3.5],open:[0]},{pts:R(12,4,38,32),z:2,open:[2],hills:[[31,16,6,-.35]]}],
  boost:[{pts:R(23,128,16,14),dir:[0,-1],v:320}],links:[[31,135,31,22]],lost:[46,8]},
 {name:'The Schwartz',par:3,quote:'"May the Schwartz be with you!"',G:.55,tee:[30,176],cup:[30,22],
  greens:[{pts:R(8,118,44,64)},{pts:R(8,8,44,50),hills:[[30,22,6,-.35]]}],
  tunnels:[{a:[30,124],r:2.6,b:[30,56],dir:[0,-1],v:40},{a:[14,126],r:2.6,b:[12,30],dir:[1,0],v:40},{a:[46,126],r:2.6,b:[46,168],dir:[0,-1],v:30}],
  movers:[{kind:'spinner',x:30,y:140,len:9,speed:1.2}],lost:[48,10]},
 {name:'Mega Maid',par:3,quote:'"She\'s gone from suck to blow!"',G:.55,tee:[30,152],cup:[22,20],
  greens:[{pts:R(12,10,42,150),hills:[[22,20,6,-.4]]},{pts:circ(46,80,6,6,16),type:'out'}],
  magnets:[{x:46,y:80,r:28,k:430}],lost:[52,152]},
 {name:'Moons of Vega',par:3,quote:'Craters everywhere. Watch your ball roll home.',G:.55,tee:[34,150],cup:[34,26],
  greens:[{pts:circ(34,92,30,70,28),hills:[[34,26,9,-1.6],[20,70,8,-1.4],[48,70,8,-1.4],[34,104,10,-1.8],[18,122,6,1.4],[50,122,6,1.4],[34,52,5,1.2]]}],
  lost:[34,38]},
 {name:'Combing the Desert',par:3,quote:'"We ain\'t found sh..." Stick to the carpet.',G:.55,tee:[20,152],cup:[46,20],
  greens:[{pts:R(8,8,52,152),type:'sand'},{pts:lane([[20,158],[20,120],[46,96],[46,70],[22,48],[46,14]],9),type:'carpet'},{pts:circ(46,20,8,8,16),type:'carpet'}],
  lost:[10,10]},
 {name:'Eagle 5 Jump',par:4,quote:'Barf, take us up! Ride the belt, jump the gap.',G:.55,tee:[24,196],cup:[30,20],
  greens:[{pts:R(8,150,50,56)},{pts:R(46,70,12,90)},{pts:R(8,64,50,26)},{pts:R(18,46,16,18),zy:[64,0,46,3.6],open:[0]},{pts:circ(30,22,16,14,22),z:1.5,drop:'all',hills:[[30,20,6,-.4]]}],
  conveyors:[{pts:R(46,72,12,84),v:[0,-80]}],links:[[26,62,30,30]],
  bumpers:[[16,74,2.4,110]],lost:[54,200]},
 ]};

const COURSES=[BUSHWOOD,GILMORE,SPACEBALLS];
for(const c of COURSES)c.holes.forEach((h,i)=>{h.course=c.id;h.n=i+1;h.key=c.id+'-'+(i+1);});
const ALL_HOLES=COURSES.flatMap(c=>c.holes);
const courseById=id=>COURSES.find(c=>c.id===id)||COURSES[0];
Object.assign(exports,{COURSES,ALL_HOLES,courseById,lane});
