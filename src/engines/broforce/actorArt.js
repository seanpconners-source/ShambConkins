// BF-25: original canvas action-hero art. x/y denotes the soles of the boots.
// All geometry is local to a 1px grid; the caller owns loading/caching portraits.
// drawHead(ctx, left, top, size) receives coordinates in the translated/scaled
// actor-local canvas space. No state, DOM, assets, or other modules are touched.
const OUTFIT = [
  {accent:'#5de0d5',dark:'#162c35',cloth:'#365c59',light:'#6c9483',belt:'#c8a96c'},
  {accent:'#ffad65',dark:'#322735',cloth:'#694b5a',light:'#a47a78',belt:'#edcf8b'}
];
const POSES = new Set(['idle','run','jump','fall','shoot','recoil','hurt','dead','rescue','celebrate']);
const RUN = [
  [[-7,-7,-11,-2],[5,-8,10,-2]],
  [[-3,-8,1,-2],[2,-7,2,-2]],
  [[3,-8,10,-2],[-7,-7,-11,-2]],
  [[-2,-7,-2,-2],[3,-8,1,-2]]
];

function tile(g,colour,x,y,w,h){g.fillStyle=colour;g.fillRect(x,y,w,h);}
function stroke(g,colour,width,x1,y1,x2,y2){
  g.strokeStyle=colour;g.lineWidth=width;g.lineCap='square';
  g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
}
function shape(g,colour,coords){
  g.fillStyle=colour;g.beginPath();g.moveTo(coords[0],coords[1]);
  for(let i=2;i<coords.length;i+=2)g.lineTo(coords[i],coords[i+1]);
  g.closePath();g.fill();
}
const HELMET_OUTLINE=[-8,-48,7,-48,11,-44,11,-30,8,-26,-8,-26,-12,-30,-12,-43];
const MUZZLE=[0,-2,4,-7,5,-3,10,-5,7,-1,12,2,5,1,3,6,0,2,-3,4,-1,-1];

function leg(g,p,hip,kneeX,kneeY,bootX,bootY){
  stroke(g,p.dark,6,hip,-12,kneeX,kneeY);
  stroke(g,p.cloth,4,hip-1,-12,kneeX-1,kneeY);
  stroke(g,p.dark,6,kneeX,kneeY,bootX,bootY-2);
  stroke(g,p.light,2,kneeX-1,kneeY,bootX-1,bootY-3);
  tile(g,'#151e25',bootX-4,bootY-3,9,4);
  tile(g,p.belt,bootX+1,bootY-2,3,1);
}
function arm(g,p,shoulderX,shoulderY,elbowX,elbowY,handX,handY){
  stroke(g,p.dark,6,shoulderX,shoulderY,elbowX,elbowY);
  stroke(g,p.cloth,4,shoulderX,shoulderY,elbowX,elbowY);
  stroke(g,p.dark,5,elbowX,elbowY,handX,handY);
  stroke(g,p.light,2,elbowX,elbowY,handX,handY);
  tile(g,'#d6a57d',handX-2,handY-2,4,4);
  tile(g,'#f3d0a1',handX-1,handY-2,2,1);
}
function uniform(g,p,flash){
  shape(g,p.dark,[-8,-27,6,-27,9,-22,8,-12,-8,-12,-10,-21]);
  tile(g,p.cloth,-7,-26,13,12);
  tile(g,p.light,-6,-26,3,10);
  tile(g,'#26363c',-2,-25,6,10);
  tile(g,p.accent,3,-25,2,9);
  tile(g,p.dark,-9,-15,18,4);
  tile(g,p.belt,-7,-14,14,2);
  tile(g,'#dcd2a3',-1,-15,4,3);
  tile(g,p.dark,-9,-24,4,7);
  tile(g,p.accent,-10,-25,5,2);
  tile(g,p.dark,5,-23,5,6);
  tile(g,p.accent,6,-24,4,2);
  tile(g,'#dce0c0',-4,-23,2,2);
  tile(g,'#83988b',-4,-19,2,2);
  if(flash){tile(g,'#eefbff',-7,-26,13,12);tile(g,p.accent,-7,-26,3,12);}
}
function fallbackHead(g,p,pose){
  // Squared jaw, swept hair, bandana and tiny expressive features; never a circle.
  tile(g,'#151e28',-10,-45,20,16);
  tile(g,'#151e28',-8,-48,16,5);
  tile(g,'#dba779',-9,-42,18,14);
  tile(g,'#f5cf9c',-7,-41,6,9);
  tile(g,'#b97763',6,-38,3,7);
  tile(g,'#613d37',-9,-45,18,4);
  tile(g,'#302c36',-8,-47,11,5);
  tile(g,p.accent,-9,-45,18,2);
  tile(g,p.dark,-9,-36,18,3);
  tile(g,'#e7f3e6',-7,-35,5,2);
  tile(g,'#e7f3e6',2,-35,5,2);
  tile(g,'#19242b',-5,-35,2,2);
  tile(g,'#19242b',4,-35,2,2);
  tile(g,'#a7675b',-1,-33,3,3);
  tile(g,pose==='celebrate'?'#fff3dd':'#522f35',-3,-29,7,1);
  tile(g,'#733e38',-7,-28,14,2);
  tile(g,'#f5dbb5',-7,-28,4,1);
}
function head(g,p,pose,image,drawHead){
  const hx=-10,hy=-47,side=20;
  // The inset remains visible around both custom and fallback portraits.
  shape(g,p.dark,HELMET_OUTLINE);
  tile(g,p.accent,-8,-48,15,2);
  if(typeof drawHead==='function'){
    g.save();try{drawHead(g,hx,hy,side);}finally{g.restore();}
    return;
  }
  const w=image&&(image.naturalWidth||image.width),h=image&&(image.naturalHeight||image.height);
  if(image&&image.complete!==false&&Number.isFinite(w)&&Number.isFinite(h)&&w>0&&h>0){
    let drawn=false;
    g.save();
    try{
      // Centre-crop, never stretch. The clipping bevel makes photos and cutouts
      // sit naturally on the original uniform's neckline.
      shape(g,p.dark,HELMET_OUTLINE);
      g.beginPath();g.moveTo(-8,-46);g.lineTo(7,-46);g.lineTo(10,-42);
      g.lineTo(10,-30);g.lineTo(7,-27);g.lineTo(-8,-27);
      g.lineTo(-10,-30);g.lineTo(-10,-42);g.closePath();g.clip();
      const crop=Math.min(w,h);
      g.drawImage(image,(w-crop)/2,(h-crop)/2,crop,crop,hx,hy,side,side);
      drawn=true;
    }catch(_err){/* Tainted or unloaded images use the authored offline head. */}
    finally{g.restore();}
    if(drawn){tile(g,p.accent,-10,-46,3,3);return;}
  }
  fallbackHead(g,p,pose);
}
function gun(g,type,time,active){
  const pistol=type==='pistol',shotgun=type==='shotgun',launcher=type==='launcher';
  const x=active?6:7,y=active?-21:-20;
  if(launcher){
    tile(g,'#1d252c',x-2,y-5,22,8);
    tile(g,'#62786e',x-1,y-4,19,5);
    tile(g,'#a5b89b',x+1,y-4,11,2);
    tile(g,'#202b30',x+16,y-6,4,10);
  }else{
    tile(g,'#172329',x-2,y-2,pistol?14:shotgun?25:27,5);
    tile(g,'#60737b',x+2,y-2,pistol?9:shotgun?21:22,2);
    tile(g,'#a9b5a5',x+5,y-1,pistol?5:shotgun?17:15,1);
    if(!pistol){
      tile(g,'#202a2e',x+10,y-5,7,3);
      tile(g,'#d0b46f',x+11,y-4,3,1);
      tile(g,'#1b252a',x+23,y-1,shotgun?5:7,3);
    }
    tile(g,'#1a2429',x+3,y+2,6,8);
    tile(g,'#6f5646',x+4,y+4,4,4);
  }
  if(active){
    const flashFrame=((Math.floor(time*22)%3)+3)%3;
    g.save();g.translate(pistol?x+13:launcher?x+20:shotgun?x+28:x+30,y);
    if(flashFrame===2)shape(g,'#ffc767',[-1,-2,4,-3,7,0,4,3,-1,2]);
    else{shape(g,'#f1aa42',MUZZLE);shape(g,'#fff3b7',[0,-1,5,-3,8,0,5,2,0,1]);}
    g.restore();
    tile(g,'#e8bb65',x+3,y-12,2,3);
  }
}
function corpse(g,p,image,drawHead,flash){
  // Prone, low silhouette instead of recycling an upright frame.
  tile(g,'#111b22',-3,-7,25,6);
  tile(g,p.cloth,-2,-12,17,7);
  tile(g,p.light,1,-12,8,2);
  tile(g,p.accent,8,-12,3,6);
  tile(g,p.dark,13,-12,10,7);
  tile(g,'#151d26',19,-7,10,5);
  arm(g,p,0,-10,-7,-8,-13,-5);
  g.save();g.translate(20,-13);g.rotate(-Math.PI/2);
  head(g,p,'dead',image,drawHead);
  g.restore();
  tile(g,'#29343b',9,-2,17,2);
  if(flash)tile(g,'#eefbff',-2,-11,16,3);
}

function drawBroforceActor(ctx,{x,y,scale=1,facing=1,pose='idle',time=0,team=0,
  weapon='rifle',headImage=null,drawHead=null,hitFlash=false}={}){
  if(!ctx||!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(scale)||scale<=0)return;
  if(!Number.isFinite(time))time=0;
  if(!POSES.has(pose))pose='idle';
  const p=OUTFIT[team===1?1:0],air=pose==='jump'||pose==='fall',dead=pose==='dead';
  const frame=((Math.floor(time*12)%4)+4)%4;
  const bob=pose==='run'?(frame%2):pose==='idle'?(Math.sin(time*3.5)>.65?1:0):pose==='celebrate'?Math.round(2*Math.abs(Math.sin(time*9))):0;
  const fire=pose==='shoot'||pose==='recoil';
  ctx.save();
  try{
    ctx.translate(x,y);ctx.scale((facing<0?-1:1)*scale,scale);
    ctx.fillStyle=air?'rgba(13,22,27,.16)':'rgba(13,22,27,.34)';
    ctx.beginPath();ctx.ellipse(0,1,dead?19:air?7:12,2.2,0,0,Math.PI*2);ctx.fill();
    if(pose==='run'){tile(ctx,'#bec1a0',-13,-1,3,1);if(frame%2)tile(ctx,'#bec1a0',-16,0,2,1);}
    if(dead){corpse(ctx,p,headImage,drawHead,hitFlash);return;}
    ctx.translate(fire?pose==='recoil'?-3:-1:pose==='hurt'?-3:0,-bob);
    if(pose==='hurt')ctx.rotate(-.13);
    if(pose==='fall')ctx.rotate(.07);
    let legs;
    if(pose==='run')legs=RUN[frame];
    else if(pose==='jump')legs=[[-9,-9,-11,-11],[7,-8,10,-10]];
    else if(pose==='fall')legs=[[-8,-7,-9,-1],[9,-7,12,-2]];
    else if(pose==='rescue')legs=[[-5,-7,-7,-2],[5,-7,7,-2]];
    else if(pose==='celebrate')legs=[[-8,-8,-10,-2],[9,-8,11,-2]];
    else if(pose==='hurt')legs=[[-9,-6,-13,-2],[7,-7,9,-3]];
    else legs=[[-5,-7,-5,-2],[5,-7,6,-2]];
    leg(ctx,p,-4,...legs[0]);leg(ctx,p,4,...legs[1]);
    // Rear arm has its own animation, and is layered behind the armour.
    if(pose==='celebrate')arm(ctx,p,-6,-24,-13,-32,-15,-39);
    else if(pose==='rescue')arm(ctx,p,-6,-24,-13,-28,-14,-34);
    else if(pose==='hurt')arm(ctx,p,-6,-24,-12,-31,-15,-36);
    else if(pose==='jump'||pose==='fall')arm(ctx,p,-6,-24,-14,-21,-16,-15);
    else if(pose==='run')arm(ctx,p,-6,-24,-12,-23+frame%2*3,-13,-15+frame%2*4);
    else arm(ctx,p,-6,-24,-11,-18,-8,-15);
    uniform(ctx,p,hitFlash);
    if(pose==='celebrate')arm(ctx,p,7,-24,13,-31,17,-38);
    else if(pose==='rescue')arm(ctx,p,7,-24,12,-31,9,-39);
    else if(pose==='hurt')arm(ctx,p,7,-24,12,-18,19,-16);
    else if(pose==='fall')arm(ctx,p,7,-24,14,-18,20,-16);
    else if(pose==='jump')arm(ctx,p,7,-24,13,-29,19,-32);
    else if(pose==='run')arm(ctx,p,7,-24,11,-19-frame%2*2,9,-16-frame%2*4);
    else arm(ctx,p,7,-24,11,-20,12,-18);
    if(pose!=='celebrate'&&pose!=='rescue'&&pose!=='hurt')gun(ctx,weapon,time,fire);
    head(ctx,p,pose,headImage,drawHead);
    if(hitFlash){
      tile(ctx,'#fcf5d9',-13,-42,2,7);
      tile(ctx,'#ffffff',13,-30,2,8);
      tile(ctx,p.accent,-15,-27,3,2);
    }
    if(pose==='celebrate'){
      tile(ctx,p.accent,-16,-42,3,3);tile(ctx,'#f1d18b',18,-42,3,3);
    }
    if(pose==='rescue')tile(ctx,'#fff6cc',8,-42,3,3);
  }finally{ctx.restore();}
}
Object.assign(exports,{drawBroforceActor});