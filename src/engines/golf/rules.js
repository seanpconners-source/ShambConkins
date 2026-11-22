// Tin Cup Tour rules (plain data, Node-testable): stroke play, water = 1 stroke + a drop where the ball went in,
// out of bounds = stroke and distance (play again from where you hit), pick up at par + 4 (arcade pace),
// score names (ace, albatross, eagle, birdie, par, bogey...). settle(hole, before, result) -> what happens next.
const NAMES={'-4':'CONDOR!','-3':'ALBATROSS!','-2':'EAGLE!','-1':'BIRDIE!','0':'PAR','1':'BOGEY','2':'DOUBLE BOGEY','3':'TRIPLE BOGEY'};
function scoreName(strokes,par){if(strokes===1)return 'HOLE IN ONE!';const d=strokes-par;return NAMES[d]||(d>0?'+'+d:String(d));}
const MAX_OVER=4;
// the drop after water: the last point of the flight/roll that was dry, nudged back 2 m toward where the shot came from
function dropPoint(hole,shot,from){const path=shot.path;for(let i=path.length-1;i>=0;i--){const [x,,z]=path[i];const l=hole.lie(x,z);
  if(l!=='water'&&l!=='ob'){const dx=from.x-x,dz=from.z-z,d=Math.hypot(dx,dz)||1;let px=x+dx/d*2,pz=z+dz/d*2;
   for(let k=0;k<20&&(hole.lie(px,pz)==='water');k++){px+=dx/d*2;pz+=dz/d*2;}return {x:px,z:pz};}}
 return {x:from.x,z:from.z};}
// after a shot: {ball, lie, strokes, penalty, holed, picked, note}
function settle(hole,before,shotResult,shot){const out={strokes:before.strokes+1,penalty:0,holed:false,picked:false,note:null};
 const r=shotResult;
 if(r.why==='holed'){out.holed=true;out.ball={x:hole.cup.x,z:hole.cup.z};out.lie='cup';}
 else if(r.why==='water'){out.penalty=1;out.strokes++;const d=dropPoint(hole,shot,before.ball);out.ball=d;out.lie=hole.lie(d.x,d.z);out.note='WATER';}
 else if(r.why==='ob'){out.penalty=1;out.strokes++;out.ball={...before.ball};out.lie=before.lie;out.note='OUT OF BOUNDS';}
 else{out.ball={x:r.x,z:r.z};out.lie=r.lie;}
 if(!out.holed&&out.strokes>=hole.par+MAX_OVER){out.picked=true;out.strokes=hole.par+MAX_OVER;out.note=(out.note?out.note+' · ':'')+'PICKED UP';}
 return out;}
Object.assign(exports,{scoreName,settle,dropPoint,MAX_OVER});
