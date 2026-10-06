const {REFERENCE_GROUPS, REFERENCE_CHECKLIST, REFERENCE_ADDITIONS}=require("src/data/referencePack.js");
// Keep the uploaded catalog intact; this requested discovery is appended.
const EDGAR_CHARACTER_ID = 'edgar-bug';
const EDGAR_SUIT_ID = 'edgar-suit';
const MEN_IN_BLACK_CHARACTER = {
 id: EDGAR_CHARACTER_ID, name: 'Edgar / The Bug', source: 'Men in Black', icon: '🪳',
 assetKey: 'char:edgar-bug', unlockAt: 999, unlockBy: 'item',
 unlockHint: 'Find the slightly rare Edgar Suit at a supply cache, shop or Men in Black encounter.',
 perk: 'Competitor: +1 point on minigame wins. Finding the Edgar Suit also adds +2 to the next roll.'
};
const MEN_IN_BLACK_ITEM = {
 id: EDGAR_SUIT_ID, name: 'Edgar Suit', source: 'Men in Black', icon: '🪳',
 kind: 'transform', value: EDGAR_CHARACTER_ID, findWeight: 6, rarity: 'uncommon',
 assetKey: 'item:edgar-suit',
 desc: 'Slightly rare. On finding it, permanently recruit Edgar / The Bug into your roster and become him for this run. Gain +2 on your next roll. If your opponent already has Edgar, keep the suit to wear later; characters stay distinct.'
};
const MEN_IN_BLACK_CARD = {
 title: 'Sugar. In water.', source: 'Men in Black', level: 'ANY', weight: .7, minTurn: 3,
 body: 'An abandoned Edgar suit is slumped beside a crashed flying saucer. This slightly rare disguise permanently recruits the Bug and changes your current character as soon as you find it. Sugar water not included.',
 e: ['item', EDGAR_SUIT_ID],
 requestedReferences: ['Men in Black', 'Edgar / The Bug', 'Edgar Suit']
};
const citation={label:'Men in Black (1997 film): plot and cast',url:'https://en.wikipedia.org/wiki/Men_in_Black_(1997_film)'};
const MEN_IN_BLACK_TRIVIA = [
 {source:'Men in Black', category:'movies', difficulty:'medium',
  q:'Who plays Edgar / The Bug in the 1997 film Men in Black?',
  answers:["Vincent D’Onofrio",'Tommy Lee Jones','Will Smith','Rip Torn'], correct:0,
  explanation:'Vincent D’Onofrio plays Edgar and the Bug wearing his skin as an Edgar suit.'},
 {source:'Men in Black', category:'movies', difficulty:'easy',
  q:'What does the alien wearing the Edgar Suit demand in his water?',
  answers:['Sugar','Salt','Coffee','Lemon juice'], correct:0,
  explanation:'After taking Edgar’s skin, the Bug demands sugar in water and drinks it down.'},
 {source:'Men in Black', category:'movies', difficulty:'medium',
  q:'What kind of alien is hiding in Edgar’s skin in Men in Black (1997)?',
  answers:['A giant cockroach-like Bug','A squid-like Cephalopoid','A worm alien','A tiny Arquillian'], correct:0,
  explanation:'The Bug is a giant cockroach-like alien disguised in the skin of farmer Edgar.'}
].map(q=>({...q,citations:[{...citation}],provenance:'authored; linked for review; not live verified'}));

function installMenInBlackPack(catalog) {
 const add=(key,record,identity)=>{if(!catalog[key].some(r=>r[identity]===record[identity])){catalog[key].push(record);REFERENCE_ADDITIONS[key].push(record);}};
 add('characters',MEN_IN_BLACK_CHARACTER,'id');
 add('items',MEN_IN_BLACK_ITEM,'id');
 add('cards',MEN_IN_BLACK_CARD,'title');
 for(const q of MEN_IN_BLACK_TRIVIA)if(!catalog.trivia.some(row=>row.source===q.source&&row.q===q.q)){catalog.trivia.push(q);REFERENCE_ADDITIONS.trivia.push(q);}
 if(!REFERENCE_GROUPS.some(g=>g.source==='Men in Black')){
  const group={source:'Men in Black',names:[...MEN_IN_BLACK_CARD.requestedReferences],type:'item',realm:'body',tier:'explicit',story:MEN_IN_BLACK_CARD.body,effect:[...MEN_IN_BLACK_CARD.e]};
  REFERENCE_GROUPS.push(group);
  for(const name of group.names)REFERENCE_CHECKLIST.push({name,source:group.source,type:group.type,tier:group.tier});
 }
}

Object.assign(exports,{EDGAR_CHARACTER_ID,EDGAR_SUIT_ID,MEN_IN_BLACK_CHARACTER,MEN_IN_BLACK_ITEM,MEN_IN_BLACK_CARD,MEN_IN_BLACK_TRIVIA,installMenInBlackPack});