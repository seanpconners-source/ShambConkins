// The Vegas tables (ROADMAP G1 + F10): each casino theme has a dealer from its own movie/show, regulars who sit in the
// empty seats, its felt and its lines. Break the bank at a table (finish with half again your buy-in) and the dealer is
// impressed and joins your party: new dealer-only characters (unlockBy:'dealer') only come that way; dealers who were
// already in the roster (Quark, Vesper) can come that way too.
// Theme ids match CASINO_THEMES in data/tacticalItems.js.
const DEALER_PERKS={
 competitor:'Competitor: +1 point on every minigame win.',
 scavenger:'Scavenger: bonus spaces pay +1 extra.',
 explorer:'Explorer: +1 point at every landmark.'};
// [id, name, source, icon, photo page (Wikipedia), perk, line, dealer-only]
const DEALER_ROWS=[
 ['elvis-presley','Elvis Presley','Elvis Presley','🕺','Elvis Presley','competitor','Thank you. Thank you very much. Deals the cards with a lip curl.',true],
 ['leslie-chow','Mr. Chow','The Hangover','🦹','Ken Jeong','scavenger','Toodaloo! Runs a table nobody should sit at.',true],
 ['alan-garner','Alan Garner','The Hangover','🧔','Zach Galifianakis','explorer','Counted cards at Caesars once. Wolfpack of one.',false],
];
const DEALER_CHARACTERS=DEALER_ROWS.map(([id,name,source,icon,actor,perk,line,only])=>({
 id,name,source,icon,actor,assetKey:'char:'+id,unlockAt:999,perkType:perk,perk:DEALER_PERKS[perk],unlockPhrase:line,
 ...(only?{unlockBy:'dealer',unlockHint:`Break the bank at ${name}’s blackjack table (finish with half again your chips) and ${name} joins you.`}
  :{unlockHint:`Win minigames or visit a ${source} landmark to recruit ${name}.`})}));

const TABLES={
 bond:{dealer:'vesper',regulars:['le-chiffre','bond-craig','bond-m','moneypenny'],felt:'#0f5a4c',felt2:'#08352d',rail:'#3a1d12',trim:'#d9b45a',ink:'#f3e2b0',back:'#7a1022',
  name:'CASINO ROYALE',sub:'MONTENEGRO · HIGH STAKES',
  lines:{hello:['I’m the money.','Every penny of it.'],bet:['Place your bets.','Shall we?'],bust:['Too many.','Pity.'],bj:['Blackjack.','Lucky.'],house:['The house thanks you.','Be careful.'],win:['Well played.','Impressive.'],shuffle:['A fresh shoe.'],impressed:['You’ve got a very good bluff. Count me in.']}},
 vegas:{dealer:'elvis-presley',regulars:[],felt:'#7a1f4f',felt2:'#4a0f2e',rail:'#2a1408',trim:'#f2c94c',ink:'#ffe9a8',back:'#1f3a8a',
  name:'VIVA LAS VEGAS',sub:'THE KING’S TABLE',
  lines:{hello:['Thank you very much.','Viva Las Vegas!'],bet:['Bets down, baby.','Let’s go, honey.'],bust:['Uh-huh-huh.','Don’t be cruel.'],bj:['Blackjack, baby!','Hunka hunka blackjack!'],house:['The King wins.','Return to sender.'],win:['That’s all right, mama.','You win, baby.'],shuffle:['A little less conversation…'],impressed:['Elvis has left the building. With you.']}},
 hangover:{dealer:'leslie-chow',regulars:['alan-garner'],felt:'#14605e',felt2:'#0a3b3a',rail:'#1a1a1a',trim:'#c7c7c7',ink:'#e8fff8',back:'#a31515',
  name:'THE WOLFPACK',sub:'ONE VERY STRANGE NIGHT',
  lines:{hello:['Toodaloo!','Hello, sexy.'],bet:['Bet! Bet!','Come on, bet already.'],bust:['Ha! Bust!','So funny.'],bj:['Blackjack? Damn.','Lucky boy.'],house:['Chow wins!','Mr. Chow takes it.'],win:['Okay, okay.','You win, cheater.'],shuffle:['New shoe. No counting!'],impressed:['You beat Chow? Chow comes with you.']}},
 quark:{dealer:'quark',regulars:['odo','sisko','worf','data'],felt:'#3d5a32',felt2:'#22351c',rail:'#3a2a1a',trim:'#d18b2e',ink:'#ffe2b8',back:'#5b2a7a',
  name:'QUARK’S',sub:'THE HOUSE ALWAYS TAKES A CUT',
  lines:{hello:['Welcome to Quark’s!','Latinum on the table.'],bet:['Bets, please.','Every bet counts.'],bust:['Rule 45: Expand or die.','Ha!'],bj:['Hmm. Blackjack.','Don’t get used to it.'],house:['Once you have their money…','The house thanks you.'],win:['Lucky hoo-man.','Hmph. Paid.'],shuffle:['Fresh cards. Nothing up my sleeve.'],impressed:['A hoo-man who wins at Quark’s? I’m coming with you.']}},
};
// regulars for a table with none of its own: anyone with own art fits in Vegas
const VEGAS_DRIFTERS=['frank','dennis','charlie','mac','dee','jules','vincent','the-dude','walter','kramer','george-costanza','elaine','jerry','homer','bender'];

Object.assign(exports,{DEALER_CHARACTERS,DEALER_ROWS,TABLES,VEGAS_DRIFTERS});
