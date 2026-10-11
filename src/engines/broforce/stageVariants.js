// BF-28 — four independent, deterministic variants of BF-10's validated route.
// Geometry and actors use 16px world tiles; player anchors remain BF-13 top-left.
const {generateBroforceStage} = require('src/engines/broforce/stage.js');
const {TILE} = require('src/engines/broforce/terrain.js');

const BROFORCE_STAGE_IDS = Object.freeze([
  'broforce-jungle', 'broforce-factory', 'broforce-city', 'broforce-desert'
]);
const SPECS = Object.freeze({
  'broforce-jungle': Object.freeze({theme:'jungle',title:'Broforce: Jungle',
    missionLabel:'OPERATION GREEN VEIL',biome:'rainforest',weather:'humid mist',
    landmark:'timber relay outposts',flavor:'Push through tangled canopy and rescue the captives.',
    objective:'Free the prisoners, defeat the locked devil and reach the extraction helicopter.',
    plan:[{at:.19,length:10,rise:6,kind:'wood-outpost'},
      {at:.37,length:13,rise:6,kind:'canopy-walk'},
      {at:.59,length:11,rise:6,kind:'wood-outpost'},
      {at:.74,length:10,rise:6,kind:'canopy-walk'}]}),
  'broforce-factory': Object.freeze({theme:'factory',title:'Broforce: Factory',
    missionLabel:'OPERATION IRON SHIFT',biome:'industrial',weather:'furnace haze',
    landmark:'conveyors and suspended catwalks',flavor:'Cross the foundry as the volatile stores ignite.',
    objective:'Free the prisoners, defeat the locked devil and reach the extraction helicopter.',
    plan:[{at:.18,length:12,rise:6,kind:'conveyor-catwalk'},
      {at:.43,length:14,rise:6,kind:'steel-catwalk'},
      {at:.67,length:12,rise:6,kind:'conveyor-catwalk'}]}),
  'broforce-city': Object.freeze({theme:'city',title:'Broforce: City Siege',
    missionLabel:'OPERATION ROOFTOP RUN',biome:'urban',weather:'smoke and ash',
    landmark:'splintered tenements and broken skylights',flavor:'Storm the rooftops above the occupied blocks.',
    objective:'Free the prisoners, defeat the locked devil and reach the extraction helicopter.',
    plan:[{at:.17,length:11,rise:6,kind:'tenement-roof'},
      {at:.36,length:10,rise:6,kind:'tenement-roof'},
      {at:.55,length:11,rise:6,kind:'tenement-roof'},
      {at:.73,length:12,rise:6,kind:'tenement-roof'}]}),
  'broforce-desert': Object.freeze({theme:'desert',title:'Broforce: Desert Assault',
    missionLabel:'OPERATION DUST STORM',biome:'badlands',weather:'blowing sand',
    landmark:'stone bunkers and lookout towers',flavor:'Advance through the dunes and silence the watchtowers.',
    objective:'Free the prisoners, defeat the locked devil and reach the extraction helicopter.',
    plan:[{at:.18,length:9,rise:6,kind:'low-bunker'},
      {at:.30,length:6,rise:6,kind:'watchtower'},
      {at:.48,length:10,rise:6,kind:'low-bunker'},
      {at:.64,length:6,rise:6,kind:'watchtower'},
      {at:.76,length:9,rise:6,kind:'low-bunker'}]})
});
function variantRandom(seed, stageId) {
  let state=(seed^0x9e3779b9)>>>0;
  for(let i=0;i<stageId.length;i++)state=Math.imul(state^stageId.charCodeAt(i),16777619)>>>0;
  return () => {
    state=(state+0x6D2B79F5)>>>0;
    let t=Math.imul(state^(state>>>15),1|state);
    t^=t+Math.imul(t^(t>>>7),61|t);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function generateBroforceVariant({stageId,seed}={}) {
  if(!Object.prototype.hasOwnProperty.call(SPECS,stageId))
    throw new RangeError('Unknown Broforce stageId: '+String(stageId));
  const stage=generateBroforceStage({seed});
  const {width,height,tileSize,tiles}=stage;
  const spec=SPECS[stageId],rng=variantRandom(stage.seed,stageId);
  const index=(col,row)=>row*width+col;
  const at=(col,row)=>col<0||col>=width||row<0||row>=height?TILE.STEEL:tiles[index(col,row)];
  // Find the original substrate, not the disconnected platforms above it.
  const rawGround=new Int16Array(width);
  for(let col=1;col<width-1;col++){
    let row=height-2;
    while(row>3&&at(col,row-1)!==TILE.EMPTY)row--;
    rawGround[col]=row;
  }
  // BF-10 also has attached 1-2 tile cover. A short median filters those
  // isolated elevations but preserves the broad terrace/substrate floors.
  const ground=new Int16Array(width);
  for(let col=1;col<width-1;col++){
    const values=[];
    for(let n=Math.max(1,col-4);n<=Math.min(width-2,col+4);n++)values.push(rawGround[n]);
    values.sort((a,b)=>a-b);
    ground[col]=values[Math.floor(values.length/2)];
  }
  // A clear halo keeps all existing enemy, prisoner, boss, checkpoints and
  // both 12x26 spawns unchanged. Never introduce new tiles into these stances.
  const actors=[...stage.spawns,...stage.prisoners,...stage.enemySpawns,
    stage.devilSpawn,stage.extraction,...stage.checkpoints];
  const protectedColumns=new Set();
  for(const actor of actors){
    const col=Math.floor(actor.x/tileSize);
    for(let d=-2;d<=2;d++)protectedColumns.add(col+d);
  }
  const structures=[];
  function safePut(col,row,type,{approach=false}={}) {
    if(col<12||col>=width-16||row<2||row>=height-2||at(col,row)!==TILE.EMPTY)return false;
    // At least two empty tile rows under a deck clear the 26px player body.
    // Short approach steps never overlap any original mission marker.
    if(!approach&&row>ground[col]-3)return false;
    if(approach&&protectedColumns.has(col))return false;
    for(const actor of actors){
      if((col+1)*tileSize>actor.x&&col*tileSize<actor.x+12&&
         (row+1)*tileSize>actor.y&&row*tileSize<actor.y+26)return false;
    }
    tiles[index(col,row)]=type;
    return true;
  }
  function covered(col) {
    return col<12||col>=width-16||at(col,ground[col]-1)!==TILE.EMPTY||
      at(col,ground[col]-2)!==TILE.EMPTY;
  }
  function chooseLeft(preferred,length) {
    // A platform above existing two-high cover can cap a mandatory jump.
    // Select a clear segment instead of compromising the proven BF-10 route.
    for(let d=0;d<=18;d++)for(const offset of d?[d,-d]:[0]){
      const left=preferred+offset;
      if(left<18||left+length>=width-17)continue;
      let open=true;
      for(let col=left-5;col<left+length+3;col++)if(covered(col)){open=false;break;}
      if(open)return left;
    }
    return null;
  }
  function roof(left,length,rise,kind,serial) {
    const right=Math.min(left+length,width-18);
    // Use the highest nearby substrate so a terrace change never closes the
    // 26px standing corridor below the structure.
    let minimum=height;
    for(let col=Math.max(12,left-5);col<Math.min(width-16,right+2);col++)
      minimum=Math.min(minimum,ground[col]);
    const row=minimum-rise;
    if(right-left<4||row<3)return;
    const openings=[];
    let count=0;
    for(let col=left;col<right;col++){
      // City skylights and canopy breaks are <= 1 tile wide and jumpable.
      const gap=kind==='tenement-roof'&&(col-left===Math.floor(length*.52));
      const hanging=kind==='canopy-walk'&&(col-left===Math.floor(length*.67));
      if(gap||hanging){openings.push(col);continue;}
      let material=TILE.WOOD;
      if(kind==='steel-catwalk'||kind==='conveyor-catwalk')
        material=(col-left)%5===0?TILE.STEEL:TILE.WOOD;
      else if(kind==='low-bunker'||kind==='watchtower')
        material=(col===left||col===right-1)?TILE.STONE:TILE.WOOD;
      else if(kind==='tenement-roof')
        material=(col-left)%7===0?TILE.STONE:TILE.WOOD;
      if(safePut(col,row,material))count++;
    }
    if(count>=4){
      structures.push({id:'bf-'+spec.theme+'-'+String(serial).padStart(2,'0'),
        kind,x:left*tileSize,y:row*tileSize,width:(right-left)*tileSize,
        openings:openings.map(col=>col*tileSize)});
    }
  }
  function chooseFlatLeft(preferred,length){
    for(let d=0;d<=24;d++)for(const offset of d?[d,-d]:[0]){
      const left=preferred+offset;
      if(left<18||left+length>=width-17)continue;
      const level=ground[left];
      let clear=true;
      for(let col=left-5;col<left+length+4;col++){
        if(covered(col)||ground[col]!==level){clear=false;break;}
        for(let row=level-7;row<level;row++)if(at(col,row)!==TILE.EMPTY){clear=false;break;}
        if(!clear)break;
      }
      if(protectedColumns.has(left-4)||protectedColumns.has(left-3))clear=false;
      if(clear)return left;
    }
    return null;
  }
  // Reachable side routes: low suspended decks leave 32px of passage beneath
  // them. The one-high approach is 16px; its jump to the deck is only 32px,
  // within BF-13's jump rise. This geometry is added only on clear, flat floor.
  const sideKind={jungle:'canopy-walk',factory:'conveyor-catwalk',
    city:'tenement-roof',desert:'low-bunker'}[spec.theme];
  for(let i=0;i<4;i++){
    const preferred=Math.round(width*(.19+i*.18))+(Math.floor(rng()*5)-2);
    const left=chooseFlatLeft(preferred,6);
    if(left===null)continue;
    const stepCol=left-4,row=ground[stepCol]-1;
    if(!safePut(stepCol,row,TILE.WOOD,{approach:true}))continue;
    // If the deck would be blocked by existing tiles, keep a valid small
    // step but do not claim a nonexistent structure.
    roof(left,6,3,sideKind,10+i);
  }
  for(let i=0;i<spec.plan.length;i++){
    const part=spec.plan[i];
    const offset=Math.floor(rng()*5)-2;
    const left=chooseLeft(Math.round(width*part.at)+offset,part.length);
    if(left!==null)roof(left,part.length,part.rise,part.kind,i+1);
  }
  // Ground-level scenery changes material and combat/destruction patterns,
  // not terrain height. Existing BF-10 collision surfaces and markers survive.
  for(let col=16;col<width-18;col++){
    const row=ground[col],roll=rng();
    if(protectedColumns.has(col))continue;
    if(stageId==='broforce-factory'){
      if(col%13<8&&at(col,row)===TILE.SOIL)tiles[index(col,row)]=TILE.WOOD;
      if(col%29===17&&at(col,row+1)===TILE.SOIL)tiles[index(col,row+1)]=TILE.VOLATILE;
    }else if(stageId==='broforce-city'){
      if(col%17<10&&at(col,row)===TILE.SOIL)tiles[index(col,row)]=TILE.WOOD;
      if(col%19===3&&at(col,row+1)===TILE.SOIL)tiles[index(col,row+1)]=TILE.STONE;
    }else if(stageId==='broforce-desert'){
      if(roll<.30&&at(col,row)===TILE.SOIL)tiles[index(col,row)]=TILE.STONE;
      if(col%23===5&&at(col,row+1)===TILE.SOIL)tiles[index(col,row+1)]=TILE.STONE;
    }else{
      if(roll<.30&&at(col,row)===TILE.SOIL)tiles[index(col,row)]=TILE.WOOD;
      if(col%21===4&&at(col,row+1)===TILE.SOIL)tiles[index(col,row+1)]=TILE.WOOD;
    }
  }
  return {...stage,stageId,theme:spec.theme,title:spec.title,
    missionLabel:spec.missionLabel,flavor:spec.flavor,objective:spec.objective,
    environment:{biome:spec.biome,weather:spec.weather,landmark:spec.landmark,structures},
    extraction:{...stage.extraction,id:'bf-extraction'}};
}
Object.assign(exports,{BROFORCE_STAGE_IDS,generateBroforceVariant});
