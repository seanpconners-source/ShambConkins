// Loads a Doom map (vanilla binary format) into plain JS structures, like P_SetupLevel: vertexes, sectors, sides,
// lines (with bounding boxes and slope types), segs, subsectors, BSP nodes, blockmap (built if missing) and reject.
const ML={BLOCKING:1,BLOCKMONSTERS:2,TWOSIDED:4,DONTPEGTOP:8,DONTPEGBOTTOM:16,SECRET:32,SOUNDBLOCK:64,DONTDRAW:128,MAPPED:256};
const ST={HORIZONTAL:0,VERTICAL:1,POSITIVE:2,NEGATIVE:3};
const name8=(u8,p)=>{let s='';for(let i=0;i<8;i++){const c=u8[p+i];if(!c)break;s+=String.fromCharCode(c);}return s.toUpperCase();};

function mapLumps(wad,map){const i=wad.num(map);if(i<0)return null;const out={};
 for(let j=i+1;j<Math.min(wad.dir.length,i+12);j++){const n=wad.dir[j].name;if(!/^(THINGS|LINEDEFS|SIDEDEFS|VERTEXES|SEGS|SSECTORS|NODES|SECTORS|REJECT|BLOCKMAP|BEHAVIOR)$/.test(n))break;out[n]=wad.lumpAt(j);}
 return out;}
const dvOf=b=>new DataView(b.buffer,b.byteOffset,b.byteLength);

function loadLevel(wad,gfx,map){
 const L=mapLumps(wad,map);if(!L||!L.LINEDEFS)throw new Error('Map '+map+' not found');
 const lv={name:map,vertexes:[],sectors:[],sides:[],lines:[],segs:[],subsectors:[],nodes:[],things:[]};
 let d=dvOf(L.VERTEXES);for(let p=0;p+4<=L.VERTEXES.length;p+=4)lv.vertexes.push({x:d.getInt16(p,true),y:d.getInt16(p+2,true)});
 d=dvOf(L.SECTORS);const sb=L.SECTORS;
 for(let p=0,i=0;p+26<=sb.length;p+=26,i++)lv.sectors.push({id:i,floorheight:d.getInt16(p,true),ceilingheight:d.getInt16(p+2,true),floorpic:gfx.flatnum(name8(sb,p+4)),ceilingpic:gfx.flatnum(name8(sb,p+12)),
  lightlevel:d.getInt16(p+20,true),special:d.getInt16(p+22,true),tag:d.getInt16(p+24,true),lines:[],thinglist:null,specialdata:null,soundtraversed:0,soundtarget:null,validcount:0,blockbox:[0,0,0,0],soundorg:{x:0,y:0,z:0},
  floordata:null,ceilingdata:null,lightingdata:null,interpFloor:0,interpCeil:0});
 d=dvOf(L.SIDEDEFS);const sdb=L.SIDEDEFS;
 for(let p=0;p+30<=sdb.length;p+=30)lv.sides.push({textureoffset:d.getInt16(p,true),rowoffset:d.getInt16(p+2,true),toptexture:gfx.texture(name8(sdb,p+4)),bottomtexture:gfx.texture(name8(sdb,p+12)),midtexture:gfx.texture(name8(sdb,p+20)),sector:lv.sectors[d.getUint16(p+28,true)]||lv.sectors[0]});
 d=dvOf(L.LINEDEFS);
 for(let p=0,i=0;p+14<=L.LINEDEFS.length;p+=14,i++){const v1=lv.vertexes[d.getUint16(p,true)],v2=lv.vertexes[d.getUint16(p+2,true)],s0=d.getUint16(p+10,true),s1=d.getUint16(p+12,true);
  const dx=v2.x-v1.x,dy=v2.y-v1.y,ln={id:i,v1,v2,dx,dy,flags:d.getInt16(p+4,true),special:d.getInt16(p+6,true),tag:d.getInt16(p+8,true),
   sidenum:[s0===0xffff?-1:s0,s1===0xffff?-1:s1],bbox:[Math.max(v1.y,v2.y),Math.min(v1.y,v2.y),Math.min(v1.x,v2.x),Math.max(v1.x,v2.x)],
   slopetype:!dx?ST.VERTICAL:!dy?ST.HORIZONTAL:(dy/dx>0?ST.POSITIVE:ST.NEGATIVE),validcount:0,specialdata:null,soundorg:{x:(v1.x+v2.x)/2,y:(v1.y+v2.y)/2,z:0}};
  ln.frontsector=ln.sidenum[0]>=0?lv.sides[ln.sidenum[0]].sector:null;ln.backsector=ln.sidenum[1]>=0?lv.sides[ln.sidenum[1]]?.sector||null:null;
  if(!ln.frontsector){ln.sidenum[0]=0;ln.frontsector=lv.sides[0]?.sector||lv.sectors[0];}
  if(!(ln.flags&ML.TWOSIDED)&&ln.backsector){/* keep it: some maps rely on it for sound */}
  lv.lines.push(ln);}
 d=dvOf(L.SEGS);
 for(let p=0;p+12<=L.SEGS.length;p+=12){const ln=lv.lines[d.getUint16(p+6,true)],side=d.getInt16(p+8,true);if(!ln)continue;
  const sd=lv.sides[ln.sidenum[side]]||lv.sides[ln.sidenum[0]];const seg={v1:lv.vertexes[d.getUint16(p,true)],v2:lv.vertexes[d.getUint16(p+2,true)],angle:(d.getUint16(p+4,true)<<16)>>>0,linedef:ln,side,sidedef:sd,offset:d.getInt16(p+10,true),
   frontsector:sd.sector,backsector:(ln.flags&ML.TWOSIDED)?(lv.sides[ln.sidenum[side^1]]?.sector||null):null};
  seg.len=Math.hypot(seg.v2.x-seg.v1.x,seg.v2.y-seg.v1.y);lv.segs.push(seg);}
 d=dvOf(L.SSECTORS);
 for(let p=0;p+4<=L.SSECTORS.length;p+=4){const num=d.getUint16(p,true),first=d.getUint16(p+2,true),seg=lv.segs[first];lv.subsectors.push({numlines:num,firstline:first,sector:seg?seg.sidedef.sector:lv.sectors[0]});}
 d=dvOf(L.NODES);
 for(let p=0;p+28<=L.NODES.length;p+=28){const n={x:d.getInt16(p,true),y:d.getInt16(p+2,true),dx:d.getInt16(p+4,true),dy:d.getInt16(p+6,true),bbox:[[],[]],children:[d.getUint16(p+24,true),d.getUint16(p+26,true)]};
  for(let s=0;s<2;s++)for(let k=0;k<4;k++)n.bbox[s][k]=d.getInt16(p+8+s*8+k*2,true);lv.nodes.push(n);}
 d=dvOf(L.THINGS);
 for(let p=0;p+10<=L.THINGS.length;p+=10)lv.things.push({x:d.getInt16(p,true),y:d.getInt16(p+2,true),angle:d.getInt16(p+4,true),type:d.getInt16(p+6,true),options:d.getInt16(p+8,true)});
 // group lines into sectors (P_GroupLines): line lists, bounding boxes for sound origins and the blockmap box
 for(const ln of lv.lines){ln.frontsector.lines.push(ln);if(ln.backsector&&ln.backsector!==ln.frontsector)ln.backsector.lines.push(ln);}
 for(const s of lv.sectors){let t=-1e9,b=1e9,l=1e9,r=-1e9;for(const ln of s.lines)for(const v of [ln.v1,ln.v2]){t=Math.max(t,v.y);b=Math.min(b,v.y);l=Math.min(l,v.x);r=Math.max(r,v.x);}
  if(!s.lines.length){t=b=l=r=0;}s.soundorg={x:(l+r)/2,y:(t+b)/2,z:0};s.bbox=[t,b,l,r];}
 buildBlockmap(lv,L.BLOCKMAP);
 lv.reject=L.REJECT&&L.REJECT.length>=Math.ceil(lv.sectors.length*lv.sectors.length/8)?L.REJECT:null;
 for(const s of lv.sectors){const [t,b,l,r]=s.bbox,MAXR=32;s.blockbox=[Math.min(lv.bmapheight-1,(t-lv.bmaporgy+MAXR)>>7),Math.max(0,(b-lv.bmaporgy-MAXR)>>7),Math.max(0,(l-lv.bmaporgx-MAXR)>>7),Math.min(lv.bmapwidth-1,(r-lv.bmaporgx+MAXR)>>7)];}
 return lv;}

// blockmap: 128x128 cells listing the lines that touch them; rebuilt when the lump is missing or broken
function buildBlockmap(lv,raw){
 if(raw&&raw.length>=8){const d=dvOf(raw),ox=d.getInt16(0,true),oy=d.getInt16(2,true),w=d.getUint16(4,true),h=d.getUint16(6,true);
  if(w&&h&&8+w*h*2<=raw.length){const lists=[];let ok=true;
   for(let i=0;i<w*h&&ok;i++){let p=d.getUint16(8+i*2,true)*2;const out=[];if(p+2>raw.length){ok=false;break;}
    if(d.getInt16(p,true)===0)p+=2;// leading 0 marker
    for(let g=0;g<20000;g++){if(p+2>raw.length){ok=false;break;}const v=d.getInt16(p,true);if(v===-1)break;if(v>=0&&v<lv.lines.length)out.push(v);p+=2;}
    lists.push(out);}
   if(ok){lv.bmaporgx=ox;lv.bmaporgy=oy;lv.bmapwidth=w;lv.bmapheight=h;lv.blockmap=lists;lv.blocklinks=new Array(w*h).fill(null);return;}}}
 let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const v of lv.vertexes){x0=Math.min(x0,v.x);y0=Math.min(y0,v.y);x1=Math.max(x1,v.x);y1=Math.max(y1,v.y);}
 x0-=8;y0-=8;const w=((x1-x0)>>7)+1,h=((y1-y0)>>7)+1,lists=Array.from({length:w*h},()=>[]);
 lv.lines.forEach((ln,i)=>{const bx0=Math.min(ln.v1.x,ln.v2.x),bx1=Math.max(ln.v1.x,ln.v2.x),by0=Math.min(ln.v1.y,ln.v2.y),by1=Math.max(ln.v1.y,ln.v2.y);
  for(let by=(by0-y0)>>7;by<=((by1-y0)>>7);by++)for(let bx=(bx0-x0)>>7;bx<=((bx1-x0)>>7);bx++){
   const cx0=x0+bx*128,cy0=y0+by*128;if(boxOnLineSide([cy0+128,cy0,cx0,cx0+128],ln)===-1)lists[by*w+bx].push(i);}});
 Object.assign(lv,{bmaporgx:x0,bmaporgy:y0,bmapwidth:w,bmapheight:h,blockmap:lists,blocklinks:new Array(w*h).fill(null)});}

// which side of the line a point is on: 0 front, 1 back
function pointOnLineSide(x,y,ln){
 if(!ln.dx)return x<=ln.v1.x?(ln.dy>0?1:0):(ln.dy<0?1:0);
 if(!ln.dy)return y<=ln.v1.y?(ln.dx<0?1:0):(ln.dx>0?1:0);
 return (y-ln.v1.y)*ln.dx>=(x-ln.v1.x)*ln.dy?1:0;}
// box [top,bottom,left,right] fully on one side (0/1) or crossing (-1)
function boxOnLineSide(box,ln){let p1,p2;
 switch(ln.slopetype){
  case ST.HORIZONTAL:p1=box[0]>ln.v1.y?1:0;p2=box[1]>ln.v1.y?1:0;if(ln.dx<0){p1^=1;p2^=1;}break;
  case ST.VERTICAL:p1=box[3]<ln.v1.x?1:0;p2=box[2]<ln.v1.x?1:0;if(ln.dy<0){p1^=1;p2^=1;}break;
  case ST.POSITIVE:p1=pointOnLineSide(box[2],box[0],ln);p2=pointOnLineSide(box[3],box[1],ln);break;
  default:p1=pointOnLineSide(box[3],box[0],ln);p2=pointOnLineSide(box[2],box[1],ln);}
 return p1===p2?p1:-1;}
// BSP: the subsector containing a point (R_PointInSubsector)
function pointOnNodeSide(x,y,n){
 if(!n.dx)return x<=n.x?(n.dy>0?1:0):(n.dy<0?1:0);
 if(!n.dy)return y<=n.y?(n.dx<0?1:0):(n.dx>0?1:0);
 return (y-n.y)*n.dx>=(x-n.x)*n.dy?1:0;}
function pointInSubsector(lv,x,y){if(!lv.nodes.length)return lv.subsectors[0];let n=lv.nodes.length-1;
 while(!(n&0x8000)){const node=lv.nodes[n];n=node.children[pointOnNodeSide(x,y,node)];}return lv.subsectors[n&0x7fff];}

Object.assign(exports,{ML,ST,loadLevel,pointOnLineSide,boxOnLineSide,pointOnNodeSide,pointInSubsector,name8});
