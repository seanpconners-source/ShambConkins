// BASEketball (engine key basketball2p). Owner, Nov 14 round 3: the movie-rules game (pick a base, flick to shoot) and the
// separate Hoop Jones mode are gone; BASEketball Shootout (game id baseketball-shootout) is now the Megatouch Hoop Jones
// machine in the Beers' stadium: src/engines/hoopJones.js. The old Hoop Jones id (baseketball-hoop-jones) is cut
// (src/data/cutGames.js) but still loads the same game for old saves. The movie-rules code is in git history
// (before this commit) if it's ever wanted back.
const {hoopJones}=require("src/engines/hoopJones.js");
async function basketball2p(s){return hoopJones(s);}
Object.assign(exports,{basketball2p});
