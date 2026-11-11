// The Arcade's Featured shelf, in the order shown (owner picks these: add a game's id when it has just been worked on,
// take one out when it has had its turn). Ids are game ids from gameRegistry.js and packs/; an unknown id is skipped.
const FEATURED_GAMES=[
 'sonic3-zone1-act2',         // Seanic Act 2 (Nov 11 night)
 'sonic3-zone1',              // Seanic Act 1
 'major-league-fielding',     // Major League Baseball (Nov 4)
 'blackjack',                 // Vegas blackjack (new table, Nov 4)
 'bond-baccarat',             // Casino Royale baccarat (Nov 4)
 'roulette',                  // Vegas roulette (Nov 4)
 'five-card',                 // five-card draw (Nov 4)
 'greed-island-mancala',      // Tony Hawk's Pro Mancala
 'django-hangman',            // Hangman Unchained
 'bucketheadland-pinball',    // Bucketheadland pinball
 'smb-world-1',               // Super Mario Bros. World 1
 'cv-symphony',               // Symphony of the Night
 'broforce',                  // Sean of a Gun
 'doom',                      // DOOM
 'rainbow-road-kart',         // Mario Kart Grand Prix
 'paddys-hole',               // Hole.it
];
Object.assign(exports,{FEATURED_GAMES});
