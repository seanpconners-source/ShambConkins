// ROADMAP B3: games the owner marked CUT in the triage sheet (https://claude.ai/artifact/4XLQDBkBkUJcQGvK2ST6w2).
// A cut game leaves the board pool, warp boards, encounter challenges and the Arcade list (dev mode still lists it),
// but its id stays registered, so old saves and pending games that name it still load and play.
// Nov 11 (owner): the old Sonic games are replaced by Seanic (Shamb Island Acts 1 and 2); the Test Zone was the engine preview
// Nov 14 (owner): BASEketball Shootout is now the Hoop Jones machine; the separate Hoop Jones entry is gone.
const CUT_GAMES=new Set(['sonic-ring-rush','sonic-goal-dash','sonic3-test','baseketball-hoop-jones']);
const isCut=g=>!!g&&CUT_GAMES.has(typeof g==='string'?g:g.id);
Object.assign(exports,{CUT_GAMES,isCut});
