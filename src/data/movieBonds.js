// The legacy `bond` ID is Connery, so existing saves keep their earned agent.
const MOVIE_BONDS = [
 {id:'bond',actor:'Sean Connery'},
 {id:'bond-lazenby',actor:'George Lazenby'},
 {id:'bond-moore',actor:'Roger Moore'},
 {id:'bond-dalton',actor:'Timothy Dalton'},
 {id:'bond-brosnan',actor:'Pierce Brosnan'},
 {id:'bond-craig',actor:'Daniel Craig'}
];
const MOVIE_BOND_IDS = MOVIE_BONDS.map(bond=>bond.id);
function isMovieBond(id){return MOVIE_BOND_IDS.includes(id);}
function missingMovieBonds(owned=[]){return MOVIE_BOND_IDS.filter(id=>!owned.includes(id));}
const MOVIE_BOND_CHARACTERS = MOVIE_BONDS.map(({id,actor})=>({id,actor,name:`James Bond · ${actor}`,source:'James Bond',icon:'🕴️',assetKey:'char:'+id,unlockHint:'A Bond card, visitor or Bond-game reward recruits one random movie Bond you do not own. Collect all six.',unlockPhrase:'Shaken, not stirred.',perkType:'competitor',perk:'Licensed to win: +1 point on a minigame win.'}));
const FACE_PACK_CHARACTERS = [
 {id:'patrick-bateman',name:'Patrick Bateman',source:'American Psycho',icon:'🪪',assetKey:'char:patrick-bateman',unlockHint:'Meet Patrick at an American Psycho encounter or Dorsia landmark.',unlockPhrase:'I have to return some videotapes.',perkType:'explorer',perk:'Business-card collector: +1 point at locations.'},
 {id:'vin-diesel',name:'Vin Diesel',source:'Fast & Furious',icon:'🏎️',assetKey:'char:vin-diesel',unlockHint:'Meet Vin at a Fast & Furious encounter or landmark, or earn a themed racing reward.',unlockPhrase:'Family.',perkType:'competitor',perk:'Quarter-mile champion: +1 point on a minigame win.'}
];

Object.assign(exports,{MOVIE_BONDS,MOVIE_BOND_IDS,isMovieBond,missingMovieBonds,MOVIE_BOND_CHARACTERS,FACE_PACK_CHARACTERS});