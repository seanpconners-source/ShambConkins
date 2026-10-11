// Broforce Mobile — standalone, deterministic tile durability and explosions.
// Coordinates are world pixels (y increases downward); tiles are row-major.
// Each damageTerrain call is one transaction: revision advances once if any HP
// or tile type changes. Results contain every destroyed tile once and only the
// final, surviving HP of damaged tiles. Events are processed breadth-first,
// scanning affected tiles row-major within each blast.
const TILE=Object.freeze({EMPTY:0,SOIL:1,WOOD:2,STONE:3,STEEL:4,VOLATILE:5});
const START_HP=Object.freeze([0,1,1,3,255,1]);
const CHAIN_RADIUS=40, CHAIN_DAMAGE=2, MAX_BLAST_EVENTS=64;

function createTerrain({width,height,tiles,tileSize=16}){
 if(!Number.isSafeInteger(width)||width<0||!Number.isSafeInteger(height)||height<0||
    !Number.isSafeInteger(width*height))throw new RangeError('Terrain dimensions must be safe nonnegative integers');
 if(!Number.isFinite(tileSize)||tileSize<=0)throw new RangeError('tileSize must be positive and finite');
 const count=width*height;
 if(tiles!=null&&(!Number.isSafeInteger(tiles.length)||tiles.length!==count))
  throw new RangeError('Terrain tiles must match width * height');
 const out=new Uint8Array(count),hp=new Uint8Array(count);
 for(let i=0;i<count;i++){
  const type=tiles==null?TILE.EMPTY:tiles[i];
  if(!Number.isInteger(type)||type<TILE.EMPTY||type>TILE.VOLATILE)
   throw new RangeError('Invalid terrain tile type at index '+i);
  out[i]=type;hp[i]=START_HP[type];
 }
 return {width,height,tileSize,tiles:out,hp,revision:0};
}

function tileAt(world,col,row){
 if(!Number.isInteger(col)||!Number.isInteger(row)||col<0||row<0||
    col>=world.width||row>=world.height)return TILE.STEEL;
 return world.tiles[row*world.width+col];
}
function isSolidTile(world,col,row){return tileAt(world,col,row)!==TILE.EMPTY;}

function damageTerrain(world,{x,y,radius,damage=1}){
 const result={destroyed:[],damaged:[],blasts:[]};
 // Invalid positions/attacks are no-ops. Infinity is a valid *radius* and
 // safely means the entire finite grid; huge finite radii are clamped too.
 if(!Number.isFinite(x)||!Number.isFinite(y)||typeof radius!=='number'||
    Number.isNaN(radius)||radius<0||typeof damage!=='number'||Number.isNaN(damage))return result;
 const amount=Math.min(255,Math.floor(damage));
 if(amount<=0)return result;
 const queue=[{x,y,radius,damage:amount}];
 result.blasts.push({x,y,radius});
 const surviving=new Map();
 const {width,height,tileSize:s}=world;
 let changed=false;

 // Queue growth is capped even if one blast detonates the whole map. Once the
 // cap is reached, further volatile tiles still break but spawn no new events.
 for(let head=0;head<queue.length;head++){
  const event=queue[head];
  if(!width||!height)continue;
  // A zero-radius point affects exactly its containing tile. Nonzero circles
  // use exact circle/axis-aligned-tile overlap (including tangent contact).
  let c0,c1,r0,r1;
  if(event.radius===0){
   c0=c1=Math.floor(event.x/s);r0=r1=Math.floor(event.y/s);
  }else{
   c0=Math.floor((event.x-event.radius)/s)-1;
   c1=Math.floor((event.x+event.radius)/s);
   r0=Math.floor((event.y-event.radius)/s)-1;
   r1=Math.floor((event.y+event.radius)/s);
  }
  if(c1<0||r1<0||c0>=width||r0>=height)continue;
  c0=Math.max(0,c0);r0=Math.max(0,r0);
  c1=Math.min(width-1,c1);r1=Math.min(height-1,r1);
  for(let row=r0;row<=r1;row++){
   const top=row*s,bottom=top+s;
   const dy=event.y<top?top-event.y:event.y>bottom?event.y-bottom:0;
   if(dy>event.radius)continue;
   for(let col=c0;col<=c1;col++){
    const left=col*s,right=left+s;
    const dx=event.x<left?left-event.x:event.x>right?event.x-right:0;
    if(dx>event.radius||Math.hypot(dx,dy)>event.radius)continue;
    const index=row*width+col,type=world.tiles[index];
    if(type===TILE.EMPTY||type===TILE.STEEL)continue;
    const oldHp=world.hp[index];
    if(oldHp===0)continue;
    const nextHp=Math.max(0,oldHp-event.damage);
    if(nextHp===oldHp)continue;
    changed=true;world.hp[index]=nextHp;
    if(nextHp){
     surviving.set(index,{col,row,type,hp:nextHp});
    }else{
     world.tiles[index]=TILE.EMPTY;
     surviving.delete(index);
     result.destroyed.push({col,row,type});
     if(type===TILE.VOLATILE&&queue.length<MAX_BLAST_EVENTS){
      const bx=(col+.5)*s,by=(row+.5)*s;
      queue.push({x:bx,y:by,radius:CHAIN_RADIUS,damage:CHAIN_DAMAGE});
      result.blasts.push({x:bx,y:by,radius:CHAIN_RADIUS});
     }
    }
   }
  }
 }
 if(changed)world.revision++;
 result.damaged=Array.from(surviving.values());
 return result;
}

Object.assign(exports,{TILE,createTerrain,tileAt,isSolidTile,damageTerrain});
