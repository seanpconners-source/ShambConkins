const {ACTIVE_CATALOG:CATALOG}=require("src/contentPolicy.js");
const {TRIVIA_PACK}=require("src/data/triviaPack.js");
const {EXPANDED_TRIVIA_THEMES_V42}=require("src/data/expandedTriviaV42.js");
const {PARTY_TRIVIA_THEMES}=require("src/data/partyTrivia.js");
const {LEGENDS_TRIVIA_THEMES}=require("src/data/legendsTrivia.js");
const {hash, escapeHTML}=require("src/utils.js");
const key=s=>String(s).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const authored=new Map(TRIVIA_PACK.map(q=>[key(q.source),q]));
for(const[from,to]of [['The Adventures of Pete & Pete','Pete & Pete'],['Nickelodeon GUTS','GUTS'],['Star Trek: The Next Generation','Star Trek'],['Resident Evil 2','Resident Evil'],['Resident Evil 3','Resident Evil'],['Silent Hill 2','Silent Hill']])authored.set(key(from),authored.get(key(to)));
authored.set(key('Hey Dude'),{category:'nick',citations:[{label:'Hey Dude',url:'https://en.wikipedia.org/wiki/Hey_Dude'}]});
const valid=q=>q.q&&Array.isArray(q.answers)&&q.answers.length===4&&new Set(q.answers.map(key)).size===4&&Number.isInteger(q.correct)&&q.correct>=0&&q.correct<4;
// Preserve the original IDs and source records. Metadata is added to copies.
const {cleanTrivia}=require("src/triviaQuality.js");
const TRIVIA_QUESTIONS=cleanTrivia(Array.from(new Map(CATALOG.trivia.filter(valid).map(q=>{
 const model=authored.get(key(q.source));
 return [q.source+'|'+q.q,{...q,id:hash(q.source+'|'+q.q).toString(36),category:q.category||model?.category||'comedy',
  citations:q.citations||model?.citations||[],provenance:q.provenance||'original catalog; reference article linked for review'}];
})).values()));
function triviaExplanationHTML(q) {
 const citations=(q.citations||[]).filter(c=>/^https:\/\//.test(c.url));
 return `<div class="trivia-explanation" data-trivia-explanation><p>${escapeHTML(q.explanation||q.answers[q.correct])}</p>${q.category==='lore'?'<small>ShambConkins game lore · your expedition rules</small>':citations.map(c=>`<a href="${escapeHTML(c.url)}" target="_blank" rel="noopener noreferrer">Reference: ${escapeHTML(c.label)}</a>`).join(' · ')}</div>`;
}
const TRIVIA_TOPIC_GAMES=[
 ['movies','Cult Movie Night','🎬','Film characters, filmmakers and story details.'],
 ['music','Record Store Quiz','🎸','Heavy, psychedelic and electronic music from the listening booths.'],
 ['horror','Midnight Horror Quiz','🕯','Creature features, horror filmmakers and supernatural rules.'],
 ['anime','Anime Crossover Quiz','⚡','Dragon Ball, Hunter × Hunter and the wider anime screening club.'],
 ['arcade','Arcade Cabinet Quiz','🕹','Arcade classics, console favorites and mobile games.'],
 ['tabletop','Cards, Dice & Pub Games','🎲','Real rules of casino, board and pub games.'],
 ['animation','Cartoon Club Quiz','📺','Nickelodeon, Cartoon Network and other animated favorites.'],
 ['lore','ShambConkins Home Quiz','🐾','Six questions about the personal expedition rules.'],
 ...[...PARTY_TRIVIA_THEMES,...EXPANDED_TRIVIA_THEMES_V42,...LEGENDS_TRIVIA_THEMES].map(t=>[t.tag,t.title,t.icon,t.description,t.source])
];
const TRIVIA_TAGS=['mixed','nick','dbz','hxh','sitcom','hard',...TRIVIA_TOPIC_GAMES.map(([tag])=>tag)];

Object.assign(exports,{TRIVIA_QUESTIONS,triviaExplanationHTML,TRIVIA_TOPIC_GAMES,TRIVIA_TAGS});