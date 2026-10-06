// New content stays separate from the uploaded catalog.
const MIGHTY_DUCKS_CHARACTER = {
 id:'emilio-estevez', name:'Emilio Estevez / Gordon Bombay', source:'The Mighty Ducks', icon:'🏒',
 assetKey:'char:emilio-estevez', unlockAt:999, unlockBy:'game-win',
 unlockHint:'Win Mighty Ducks air hockey or the hockey shootout. Your first win recruits Emilio into your own roster.',
 perkType:'competitor', perk:'Coach Bombay: +1 point on minigame wins.'
};
const citation={label:'The Mighty Ducks (1992 film): cast and plot',url:'https://en.wikipedia.org/wiki/The_Mighty_Ducks_(film)'};
const MIGHTY_DUCKS_TRIVIA = [
 {q:'Who plays coach Gordon Bombay in The Mighty Ducks?',answers:['Emilio Estevez','Charlie Sheen','Joshua Jackson','Paul Newman'],correct:0,difficulty:'easy',explanation:'Emilio Estevez plays Gordon Bombay, the lawyer who becomes the team’s coach.'},
 {q:'Which sport do the kids play in the 1992 film The Mighty Ducks?',answers:['Ice hockey','Baseball','Basketball','Football'],correct:0,difficulty:'easy',explanation:'Bombay coaches a youth ice-hockey team.'},
 {q:'What is the Ducks’ signature formation called?',answers:['The Flying V','The Triangle','The Pick and Roll','The Wildcat'],correct:0,difficulty:'medium',explanation:'The Ducks use their Flying V formation in the film.'}
].map(q=>({...q,source:'The Mighty Ducks',category:'movies',citations:[{...citation}],provenance:'authored; linked for review; not live verified'}));

Object.assign(exports,{MIGHTY_DUCKS_CHARACTER,MIGHTY_DUCKS_TRIVIA});