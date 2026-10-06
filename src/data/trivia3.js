// v0.46 trivia expansion (Tarantino, caped crusaders, 80s/90s action, comedy, games...).
// Same line format as legendsTrivia.js; see that file for the parser.
const FACTS=`
`;
const levels={e:'easy',m:'medium',h:'hard',i:'impossible'};
function parseFacts(text){let source,category,page;return text.trim().split('\n').filter(Boolean).flatMap(line=>{
 if(line.startsWith('@')){[source,category,page]=line.slice(1).split('|');return [];}
 const[difficulty,q,answer,a,b,c,explanation]=line.split('|');
 return [{source,category,difficulty:levels[difficulty],q,answers:[answer,a,b,c],correct:0,explanation,provenance:'v0.46 authored factual expansion; subject page linked for review',citations:[{label:source,url:'https://en.wikipedia.org/wiki/'+page}]}];
});}
const TRIVIA3=parseFacts(FACTS);
const TRIVIA3_THEMES=[
];
Object.assign(exports,{TRIVIA3,TRIVIA3_THEMES});
