const {shuffle}=require("src/utils.js");
const CARD_SUITS=['♣','♦','♥','♠'];
const CARD_NAMES=['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];
function casinoDeck(random){return shuffle(Array.from({length:52},(_,i)=>({rank:i%13+1,suit:CARD_SUITS[Math.floor(i/13)],id:i})),random);}
function blackjackValue(hand){let total=0,aces=0;for(const c of hand){if(c.rank===1){total+=11;aces++;}else total+=Math.min(c.rank,10);}while(total>21&&aces){total-=10;aces--;}return total;}
function blackjackOutcome(hand,dealer){
 const a=blackjackValue(hand),b=blackjackValue(dealer),natural=a===21&&hand.length===2,houseNatural=b===21&&dealer.length===2;
 if(a>21)return {label:'Bust',gross:0};if(houseNatural)return {label:natural?'Natural push':'Dealer blackjack',gross:natural?1:0};
 if(natural)return {label:'Blackjack · pays 3:2',gross:2.5};if(b>21||a>b)return {label:b>21?'Dealer bust · you win':'You beat the dealer',gross:2};
 return a===b?{label:'Push · wager returned',gross:1}:{label:'House wins',gross:0};
}
function pokerRank(hand){const ranks=hand.map(c=>c.rank===1?14:c.rank).sort((a,b)=>b-a),counts=new Map();for(const r of ranks)counts.set(r,(counts.get(r)||0)+1);const groups=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]);const flush=hand.every(c=>c.suit===hand[0].suit),unique=[...new Set(ranks)].sort((a,b)=>a-b),straight=unique.length===5&&(unique[4]-unique[0]===4||unique.join(',')==='2,3,4,5,14'),high=unique.join(',')==='2,3,4,5,14'?5:ranks[0];if(straight&&flush)return [8,high];if(groups[0][1]===4)return [7,groups[0][0],groups[1][0]];if(groups[0][1]===3&&groups[1][1]===2)return [6,groups[0][0],groups[1][0]];if(flush)return [5,...ranks];if(straight)return [4,high];if(groups[0][1]===3)return [3,groups[0][0],...groups.slice(1).map(g=>g[0])];if(groups[0][1]===2&&groups[1][1]===2)return [2,Math.max(groups[0][0],groups[1][0]),Math.min(groups[0][0],groups[1][0]),groups[2][0]];if(groups[0][1]===2)return [1,groups[0][0],...groups.slice(1).map(g=>g[0])];return [0,...ranks];}
function comparePoker(a,b){const ar=pokerRank(a),br=pokerRank(b);for(let i=0;i<Math.max(ar.length,br.length);i++)if((ar[i]||0)!==(br[i]||0))return Math.sign((ar[i]||0)-(br[i]||0));return 0;}
const POKER_NAMES=['High card','Pair','Two pair','Three of a kind','Straight','Flush','Full house','Four of a kind','Straight flush'];
const ROULETTE_RED=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const ROULETTE_ORDER=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
function roulettePayout(number,bet,stake){const win=bet==='red'?ROULETTE_RED.has(number):bet==='black'?number>0&&!ROULETTE_RED.has(number):bet==='even'?number>0&&number%2===0:bet==='odd'?number%2===1:/^\d+$/.test(String(bet))&&Number(bet)===number;return win?stake*(/^\d+$/.test(String(bet))?36:2):0;}
const baccaratValue=hand=>hand.reduce((sum,rank)=>sum+(rank<10?rank:0),0)%10;
function baccaratDeal(deck){const player=[deck.pop()],banker=[deck.pop()];player.push(deck.pop());banker.push(deck.pop());let pv=baccaratValue(player),bv=baccaratValue(banker);if(pv>=8||bv>=8)return {player,banker,pv,bv,winner:pv===bv?'tie':pv>bv?'player':'banker'};let third=null;if(pv<=5){const card=deck.pop();player.push(card);third=card<10?card:0;}const draw=third===null?bv<=5:bv<=2||bv===3&&third!==8||bv===4&&third>=2&&third<=7||bv===5&&third>=4&&third<=7||bv===6&&third>=6&&third<=7;if(draw)banker.push(deck.pop());pv=baccaratValue(player);bv=baccaratValue(banker);return {player,banker,pv,bv,winner:pv===bv?'tie':pv>bv?'player':'banker'};}
function baccaratPayout(bet,winner,stake){if(winner==='tie'&&bet!=='tie')return stake;if(bet!==winner)return 0;return bet==='tie'?stake*9:bet==='banker'?stake*1.95:stake*2;}

Object.assign(exports,{CARD_SUITS,CARD_NAMES,casinoDeck,blackjackValue,blackjackOutcome,pokerRank,comparePoker,POKER_NAMES,ROULETTE_RED,ROULETTE_ORDER,roulettePayout,baccaratValue,baccaratDeal,baccaratPayout});