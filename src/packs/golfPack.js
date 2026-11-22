// Content pack: SHOOTER McGAVIN'S PRO TOUR (src/engines/golfGame.js), 3D arcade trackball golf (the bar-cabinet kind) on our own
// courses: Bat Country Links (Fear and Loathing), Bushwood (Caddyshack) and the Waterbury Pro-Am (Happy Gilmore). Lazy engine.
const lazy=(file,name)=>s=>require(file)[name](s);
const engines={arcadegolf:lazy('src/engines/golfGame.js','arcadegolf')};
const games=[{id:'mcgavin-pro-tour',engine:'arcadegolf',title:"Shooter McGavin's Pro Tour",source:'Happy Gilmore',icon:'🏌️',category:'sports',noBleed:true,soloKind:'cpu',reward:10,
 duration:'3 or 9 holes (board game: 2 holes)',
 rules:"3D arcade trackball golf. The camera sits behind your ball: drag the course to aim (or tap the hole map), pick a club with ◀ ▶ (the caddie picks one first), then roll the TRACKBALL down for the backswing and up hard to swing. Faster = longer; a stroke leaning left or right draws or fades the ball (hooks and slices if you over-swing). Keep rolling right after the hit for aftertouch: up = run, down = backspin, sideways = bend. Wind, slopes, trees, bunkers and water all count. On the green the grid shows the slope (dots run downhill) and the same stroke putts. The ball furthest from the hole plays next; lowest score wins."}];
Object.assign(exports,{engines,games,events:[]});
