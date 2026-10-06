// The four levels of the game, after Chardee MacDennis (It's Always Sunny in
// Philadelphia): Mind, Body and Spirit, with Frank's secret Level IV: Horror.
// Pure data and helpers; the interface lives in ui.js and the pacing in app.js.
const LEVELS={
 mind:{n:1,roman:'I',name:'MIND',tag:'Trivia, puzzles and art',drink:'wine',icon:'🍷',color:'#c99a1b',
  intro:'Trivia, puzzles and art. Sip something civilized.',
  categories:['trivia','puzzle','strategy','casino','dice'],
  families:['photohunt','hangman','sokoban','pipeconnect','sonargrid','fruitmerge','conesort','guesswho','kitchen','towerstack','blocks','tictactoe','microrelay','skynetid']},
 body:{n:2,roman:'II',name:'BODY',tag:'Physical challenges, pain and endurance',drink:'beer',icon:'🍺',color:'#d4622a',
  intro:'Physical challenges, pain and endurance. Pace yourselves, champions.',
  categories:['sports','duel'],
  families:['brawler','boxing','dodgeball','sumo','sword2p','bike','hole','pancakes','flipcup','beerpong','paperboy','crossy','lightcycle','battleroyale','dualrace','gophers','archery','chase']},
 spirit:{n:3,roman:'III',name:'SPIRIT',tag:'Emotional battery and public humiliation',drink:'hard liquor',icon:'🥃',color:'#7a4cc2',
  intro:'Emotional battery and public humiliation. Nobody leaves with dignity.',
  categories:['task'],
  families:['headlaunch','duckturn','slingshot','moneygrab','shred','roast','newlywed','twist','confession','task','horde']},
 horror:{n:4,roman:'IV',name:'HORROR',tag:'Frank’s secret level. It was never in the box.',drink:'whatever is in Frank’s flask',icon:'🧪',color:'#b3121f',
  intro:'Frank added a level. Nobody asked for it. Nobody can stop it.',
  categories:[],families:['horde','sewer','asteroids','pacmaze','battleroyale']},
 'upside-down':{n:0,roman:'?',name:'THE UPSIDE DOWN',tag:'A wrong turn',drink:'nothing, hold your breath',icon:'🫧',color:'#512633',
  intro:'You took a wrong turn.',categories:[],families:[]}
};
const levelInfo=realm=>LEVELS[realm]||LEVELS.mind;
const levelLabel=realm=>{const l=levelInfo(realm);return l.n?`LEVEL ${l.roman} · ${l.name}`:l.name;};
const drinkLine=realm=>{const l=levelInfo(realm);return `${l.icon} Players are drinking: ${l.drink}`;};
const LEVEL_ORDER=['mind','body','spirit','horror'];

// How well a game suits a level (0 neutral, 1 on theme). selectGame uses this
// to lean toward Mind trivia and puzzles, Body challenges and Spirit
// humiliations without ever locking the other games out.
function levelFit(game,realm){
 const l=LEVELS[realm];if(!l||!game)return 0;
 if(l.families.includes(game.family)||l.families.includes(game.engine))return 1;
 if(game.theme===realm||game.level===realm)return 1;
 if(realm==='spirit'&&(game.source==='Taskmaster'||game.triviaTag==='lore'))return 1;
 return l.categories.includes(game.category)?1:0;
}
// Spirit is "emotional battery and public humiliation": whoever loses a Spirit
// challenge owes the table a small, silly, survivable indignity.
const HUMILIATIONS=[
 'Say one sincere compliment about the winner, with no jokes.','Narrate your next move out loud like a nature documentary.','Strike your best “golden god” pose and hold it for five seconds.',
 'Do your most dramatic movie-trailer voice for the next ten seconds.','Announce the winner like a wrestling ring announcer.','Confess your most embarrassing recent purchase.',
 'Apologize to the winner as if you had ruined their wedding.','Speak only in questions until your next turn.','Do a slow-motion victory dance for the winner.',
 'Admit one thing you are bad at and the winner picks a grade for it.','Deliver a tearful thank-you speech for “losing so beautifully”.','Give the winner a nickname they will use for the rest of the run.',
 'Tell the group about the last time you cried at something dumb.','Sing the chorus of any song, badly, with feeling.','Whisper your next dice roll like it is a secret.',
 'Read your most recent text message aloud (skip it if it is truly private).','Let the winner pick your accent for the next two turns.','Say “I am a golden god” without laughing. Try twice.',
 'Describe the winner as if they were a Dateline suspect.','Admit which character you secretly wish you were.','Do your best impression of the other player and let them rate it.',
 'Pitch a terrible movie sequel starring both of you.','Give a one-minute speech on why you deserved to lose.','Recite a movie quote with your whole chest.'
];
const humiliation=random=>HUMILIATIONS[Math.floor((random?random():Math.random())*HUMILIATIONS.length)];
Object.assign(exports,{humiliation,HUMILIATIONS,LEVELS,LEVEL_ORDER,levelInfo,levelLabel,drinkLine,levelFit});
