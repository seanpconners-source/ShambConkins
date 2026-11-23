// Judgment Day Chase road: one endless road per stage from the seed. road(y) = centre x, width and the look at
// distance y (y grows forward, up the screen). Walls are the road edges (no falling off: you scrape and lose a
// little health), medians split the road for a while, ramps throw you over the traffic, overpasses cross above.
const {seededRandom,clamp}=require("src/utils.js");

const LOOK={
 street: {w:[280,340],amp:120,f:1/2300,lanes:5,edge:'curb',ground:'sidewalk'},
 canal:  {w:[230,270],amp:70,f:1/2800,lanes:4,edge:'canal',ground:'concrete'},
 highway:{w:[330,390],amp:150,f:1/2600,lanes:6,edge:'rail',ground:'dirt'},
 city:   {w:[300,360],amp:110,f:1/2100,lanes:5,edge:'curb',ground:'sidewalk'},
 freeway:{w:[380,440],amp:170,f:1/3000,lanes:7,edge:'rail',ground:'dirt'}};

function makeCourse(stage,seed){
 const rand=seededRandom(seed+':tcroad:'+stage.id),ph=[rand()*6.28,rand()*6.28,rand()*6.28,rand()*6.28];
 const lookAt=y=>stage.canalAt&&y>stage.len*stage.canalAt?'canal':stage.look;
 // a smooth blend into the canal (the street drops down a ramp into the storm drain)
 const canalY=stage.canalAt?stage.len*stage.canalAt:Infinity;
 function base(y,look){const L=LOOK[look];
  const c=Math.sin(y*L.f+ph[0])*L.amp+Math.sin(y*L.f*2.7+ph[1])*L.amp*.28;
  const w=(L.w[0]+L.w[1])/2+Math.sin(y*L.f*1.7+ph[2])*(L.w[1]-L.w[0])/2+Math.sin(y*L.f*4.1+ph[3])*8;return {c,w};}
 // features (ramps, medians, overpasses, construction) along the road
 const ramps=[],medians=[],overs=[],works=[];
 for(let y=4200;y<stage.len+80000;){const look=lookAt(y),r=rand();
  if(r<.3&&look!=='canal'){medians.push({y0:y,y1:y+1500+rand()*1600});y+=4200+rand()*2200;continue;}
  if(r<.55){ramps.push({y,side:rand()<.5?-1:1,wide:rand()<.35});y+=3600+rand()*2400;continue;}
  if(r<.75){overs.push({y,h:110+rand()*40});y+=3000+rand()*2000;continue;}
  works.push({y,lane:rand(),n:2+(rand()*3|0)});y+=3400+rand()*2400;}
 if(stage.canalAt)overs.push({y:canalY+5200,h:150,crash:true});
 function road(y){const look=lookAt(y);let {c,w}=base(y,look);
  if(stage.canalAt&&Math.abs(y-canalY)<900){const u=clamp((y-(canalY-900))/1800,0,1),a=base(y,stage.look),b=base(y,'canal'),e=u*u*(3-2*u);c=a.c+(b.c-a.c)*e;w=a.w+(b.w-a.w)*e;}
  const m=medians.find(m=>y>m.y0-300&&y<m.y1+300);let med=0;if(m)med=clamp(Math.min(y-(m.y0-300),(m.y1+300)-y)/300,0,1)*26;
  return {c,w,look,med,edge:LOOK[look].edge,ground:LOOK[look].ground,lanes:LOOK[look].lanes};}
 // side walls at y: x of the left and right inner faces, plus the median half width
 function walls(y){const r=road(y);return {l:r.c-r.w/2,r:r.c+r.w/2,med:r.med,c:r.c};}
 // which ramp (if any) covers (x,y): a ramp is a 70-unit-long strip across one side of the road (or all of it)
 function rampAt(x,y){for(const rp of ramps){if(y<rp.y||y>rp.y+70)continue;const r=road(rp.y);if(rp.wide)return rp;const mid=r.c+rp.side*r.w/4;if(Math.abs(x-mid)<r.w/4)return rp;}return null;}
 return {stage,road,walls,rampAt,ramps,medians,overs,works,canalY,lookAt};}

Object.assign(exports,{makeCourse,LOOK});
