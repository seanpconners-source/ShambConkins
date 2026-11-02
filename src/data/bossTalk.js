// Boss fight radio chatter (ROADMAP K21): Star Fox-style comm-box lines between the boss and the two players.
// Placeholders: {boss} boss name, {me} speaking player's name, {mate} the partner's name, {char} the speaker's character,
// {source} the boss's movie/show/game. Phase exchanges = the boss's own phaseLines (data/bosses.js) or BOSS_PHASE, then a
// player reply. RELATED_* are used when a player's character comes from the boss's own source; SAME_* when a player
// plays as the boss itself. Event lines (hit, parry, super, revive...) are short and never pause the fight.

const BOSS_PHASE=[
 'Is that all you have? I was just warming up.','You should not have come here, {me}.','Now you have made me angry.',
 'Enough! Feel my true power!','You fight like a pair of {source} extras.','I have defeated better than you before breakfast.',
 'Oh, you think this is over? Cute.','Let me show you how we do things in {source}.'];
const BOSS_FINAL=[
 'Enough games. Now I get serious.','You think that was my final form?','No more holding back!','This ends NOW.',
 'I will take you both down with me!','Witness what I can REALLY do!'];
const REPLY_PHASE=[
 'Do a barrel roll!','{mate}, cover me. I\'m going in!','Keep firing! It\'s working!','Whoa, {boss} is getting mad!',
 'Don\'t get cocky, {mate}.','I\'ve got your back, {mate}!','All right, {boss}, show me what you\'ve got.',
 'This guy talks a lot for someone losing.','Watch for the pink ones, {mate}. Swat them right back!',
 'Same plan as always: shoot it until it stops.','Did {boss} just call us extras?!','I\'m NOT dying in {source}.'];
const REPLY_FINAL=[
 'Everything we\'ve got, NOW!','It\'s now or never, {mate}!','Almost there! Don\'t let up!','I\'m running on fumes here!',
 'Hit it with everything!','{mate}, light it up!','Let\'s finish this together!'];
const ON_HIT=['Ow! I\'m hit!','Get this thing off me!','{mate}, help me out here!','That one stung!','My hearts!','Not cool, {boss}!'];
const ON_MATE_DOWN=['{mate}! Hang in there!','{mate} is down! Fly to the bubble!','Don\'t you dare pop, {mate}!'];
const ON_REVIVED=['Thanks, {mate}! I owe you one.','Back in action!','Phew. Good save, {mate}.','You came back for me!'];
const ON_PARRY=['Right back at ya!','Nice try, {boss}!','Return to sender!','Swatted!'];
const ON_SUPER=['Eat this!','Full power!','Fire everything!','Here it comes, {boss}!'];
const ON_BOSS_HIT=['Hah! Felt that one, did you?','Who\'s laughing now?','Ha ha ha!','Too slow, {me}.'];
const OPENERS=['All right, {boss}. Let\'s dance.','Stay sharp, {mate}!','Here we go! Shields up!','Target sighted: {boss}.','Lock and load, {mate}!','Stay on my wing, {mate}.'];
const ON_WIN=['We did it, {mate}!','{boss} is history!','Mission complete!','Another one for the wall!'];
const RELATED_BOSS=[
 '{char}?! I should have finished you back in {source}.','Well, well. {char}. I knew you would show up eventually.',
 'You again, {char}? This is personal now.','{char}! You have no idea how long I have waited for this.'];
const RELATED_REPLY=[
 'Remember me, {boss}? Because I remember you.','Time to settle things from {source}, {boss}.','You were never this tough in {source}.',
 'I\'ve been waiting for a rematch, {boss}.'];
const SAME_BOSS=['Wait... which one of us is the real {boss}?!','How dare you wear my face!','There can be only one {boss}.'];
const SAME_REPLY=['I\'m the better-looking one.','Nobody does {boss} like me.','Two of us? This is weird for everyone.'];

Object.assign(exports,{OPENERS,BOSS_PHASE,BOSS_FINAL,REPLY_PHASE,REPLY_FINAL,ON_HIT,ON_MATE_DOWN,ON_REVIVED,ON_PARRY,ON_SUPER,ON_BOSS_HIT,ON_WIN,RELATED_BOSS,RELATED_REPLY,SAME_BOSS,SAME_REPLY});
