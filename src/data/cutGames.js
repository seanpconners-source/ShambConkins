// ROADMAP B3: games the owner marked CUT in the triage sheet (https://claude.ai/artifact/4XLQDBkBkUJcQGvK2ST6w2).
// A cut game leaves the board pool, warp boards, encounter challenges and the Arcade list (dev mode still lists it),
// but its id stays registered, so old saves and pending games that name it still load and play.
const CUT_GAMES=new Set([]);
const isCut=g=>!!g&&CUT_GAMES.has(typeof g==='string'?g:g.id);
Object.assign(exports,{CUT_GAMES,isCut});
