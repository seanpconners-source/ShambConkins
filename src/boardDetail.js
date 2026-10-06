// SVG uses xMidYMid meet: the smaller axis determines the actual pixel density.
// Camera mode/zoom alone cannot tell us this while framing distant players,
// playing the opening tour, or resizing a split-screen/mobile viewport.
function boardDetail(view,viewport){
 const box=typeof view==='string'?view.trim().split(/\s+/).map(Number):view;
 const w=Number(viewport?.width),h=Number(viewport?.height);
 const valid=Array.isArray(box)&&box.length===4&&box.every(Number.isFinite)&&box[2]>0&&box[3]>0&&w>0&&h>0&&Number.isFinite(w)&&Number.isFinite(h);
 const scale=valid?Math.min(w/box[2],h/box[3]):0,nodePixels=36*scale;
 return {level:nodePixels<13?'overview':nodePixels<22?'near':'detail',scale,nodePixels,pinScale:scale>0?1/scale:1};
}
function compactLandmarkName(name){const text=String(name||'Location');return text.length>19?text.slice(0,18).trimEnd()+'…':text;}
// Keep every landmark pin, but suppress overlapping names in the distant view.
// Work entirely in projected screen coordinates; no text layout reads or media
// reconstruction are needed during a camera animation.
function landmarkLabels(markers,view,viewport){
 const box=typeof view==='string'?view.trim().split(/\s+/).map(Number):view,detail=boardDetail(box,viewport),seen=new Set(),occupied=[];
 if(!detail.scale)return seen;
 const ox=(viewport.width-box[2]*detail.scale)/2,oy=(viewport.height-box[3]*detail.scale)/2;
 for(const marker of markers){
  const x=(marker.x-box[0])*detail.scale+ox,y=(marker.y-box[1])*detail.scale+oy;
  if(x<0||y<0||x>viewport.width||y>viewport.height)continue;
  const width=compactLandmarkName(marker.name).length*6.2+4;
  const label={left:x+9,right:x+9+width,top:y-21,bottom:y-7};
  if(label.right>viewport.width-4||label.top<3||occupied.some(r=>label.left<r.right+5&&label.right>r.left-5&&label.top<r.bottom+4&&label.bottom>r.top-4))continue;
  occupied.push(label);seen.add(marker.id);
 }
 return seen;
}

Object.assign(exports,{boardDetail,compactLandmarkName,landmarkLabels});