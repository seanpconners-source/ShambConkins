// Pure casino rules for the Vegas tables (baccarat, five-card draw, roulette), kept out of the drawing code so the
// tests can check them in Node. Cards are {r:1..13, s:'s'|'h'|'d'|'c'} (r 1 = ace).

// ---- baccarat (Punto Banco)
const bacValue=c=>c.r>=10?0:c.r;
const bacTotal=hand=>hand.reduce((t,c)=>t+bacValue(c),0)%10;
// the banker's third-card rule: b = banker's two-card total, p3 = the player's third card value (null if the player stood)
function bankerDraws(b,p3){if(p3==null)return b<=5;if(b<=2)return true;if(b===3)return p3!==8;if(b===4)return p3>=2&&p3<=7;if(b===5)return p3>=4&&p3<=7;if(b===6)return p3===6||p3===7;return false;}

// ---- poker hands (five cards): [category, tie-breakers...], higher compares bigger
const POKER_NAMES=['High card','Pair','Two pair','Three of a kind','Straight','Flush','Full house','Four of a kind','Straight flush','Royal flush'];
function pokerRank(hand){const ranks=hand.map(c=>c.r===1?14:c.r).sort((a,b)=>b-a),counts=new Map();for(const r of ranks)counts.set(r,(counts.get(r)||0)+1);
 const groups=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]),flush=hand.every(c=>c.s===hand[0].s),uniq=[...new Set(ranks)].sort((a,b)=>a-b);
 const wheel=uniq.join(',')==='2,3,4,5,14',straight=uniq.length===5&&(uniq[4]-uniq[0]===4||wheel),high=wheel?5:ranks[0];
 if(straight&&flush)return high===14?[9,14]:[8,high];if(groups[0][1]===4)return [7,groups[0][0],groups[1][0]];if(groups[0][1]===3&&groups[1][1]===2)return [6,groups[0][0],groups[1][0]];
 if(flush)return [5,...ranks];if(straight)return [4,high];if(groups[0][1]===3)return [3,groups[0][0],...groups.slice(1).map(g=>g[0])];
 if(groups[0][1]===2&&groups[1][1]===2)return [2,Math.max(groups[0][0],groups[1][0]),Math.min(groups[0][0],groups[1][0]),groups[2][0]];if(groups[0][1]===2)return [1,groups[0][0],...groups.slice(1).map(g=>g[0])];return [0,...ranks];}
function compareRank(a,b){for(let i=0;i<Math.max(a.length,b.length);i++)if((a[i]||0)!==(b[i]||0))return Math.sign((a[i]||0)-(b[i]||0));return 0;}
const RANK_WORD={2:'Twos',3:'Threes',4:'Fours',5:'Fives',6:'Sixes',7:'Sevens',8:'Eights',9:'Nines',10:'Tens',11:'Jacks',12:'Queens',13:'Kings',14:'Aces'};
const HIGH_WORD={...Object.fromEntries(Object.entries(RANK_WORD).map(([k,v])=>[k,v.replace(/s$/,'').replace(/xe$/,'x')])),6:'Six'};
function handName(rank){const [k,a,b]=rank;if(k===9)return 'Royal flush';if(k===8)return `Straight flush, ${HIGH_WORD[a]} high`;if(k===7)return `Four ${RANK_WORD[a]}`;if(k===6)return `Full house, ${RANK_WORD[a]} over ${RANK_WORD[b]}`;
 if(k===5)return `Flush, ${HIGH_WORD[a]} high`;if(k===4)return `Straight, ${HIGH_WORD[a]} high`;if(k===3)return `Three ${RANK_WORD[a]}`;if(k===2)return `Two pair, ${RANK_WORD[a]} and ${RANK_WORD[b]}`;if(k===1)return `Pair of ${RANK_WORD[a]}`;return `${HIGH_WORD[a]} high`;}
// which cards to throw away in five-card draw (indexes): keep made hands, four to a flush/straight, pairs, else the two
// highest (an ace and a kicker); at most 3 (4 when keeping an ace)
function drawPlan(hand){const rank=pokerRank(hand),k=rank[0];if(k>=4&&k!==7)return [];
 const r=c=>c.r===1?14:c.r,idx=[0,1,2,3,4];if(k===7)return idx.filter(i=>r(hand[i])!==rank[1]&&r(hand[i])<11);
 if(k===3||k===2||k===1){const keep=new Set(idx.filter(i=>{const n=hand.filter(c=>r(c)===r(hand[i])).length;return n>=2;}));return idx.filter(i=>!keep.has(i));}
 for(const su of ['s','h','d','c']){const same=idx.filter(i=>hand[i].s===su);if(same.length===4)return idx.filter(i=>hand[i].s!==su);}
 const sorted=[...idx].sort((a,b)=>r(hand[a])-r(hand[b]));for(let skip=0;skip<5;skip++){const four=sorted.filter((_,j)=>j!==skip),vals=four.map(i=>r(hand[i]));if(new Set(vals).size===4&&vals[3]-vals[0]===3&&vals[0]>=2)return [sorted[skip]];}
 const byHigh=[...idx].sort((a,b)=>r(hand[b])-r(hand[a]));if(r(hand[byHigh[0]])===14)return byHigh.slice(1);return byHigh.slice(2);}
// rough strength 0..1 of a five-card hand for betting
function handStrength(hand){const [k,a]=pokerRank(hand);return Math.min(1,[.08+a/140,.3+a/60,.62,.74,.82,.86,.92,.97,.99,1][k]);}

// ---- roulette (single zero)
const WHEEL=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
// a bet key: 'n7' a straight number, 'd1'..'d3' dozens, 'c1'..'c3' columns, 'red','black','odd','even','low','high'
const BET_PAYS={n:35,d:2,c:2,red:1,black:1,odd:1,even:1,low:1,high:1};
function betWins(key,n){if(key[0]==='n'&&/^n\d+$/.test(key))return +key.slice(1)===n;if(n===0)return false;
 if(/^d[123]$/.test(key))return Math.ceil(n/12)===+key[1];if(/^c[123]$/.test(key))return (n-1)%3+1===+key[1];
 return key==='red'?RED.has(n):key==='black'?!RED.has(n):key==='odd'?n%2===1:key==='even'?n%2===0:key==='low'?n<=18:key==='high'?n>=19:false;}
const betPays=key=>BET_PAYS[/^n\d+$/.test(key)?'n':/^[dc][123]$/.test(key)?key[0]:key]||0;
// what a bet returns (stake + winnings), 0 if it lost
const betReturn=(key,stake,n)=>betWins(key,n)?stake*(1+betPays(key)):0;
const betLabel=key=>/^n\d+$/.test(key)?key.slice(1):{d1:'1st 12',d2:'2nd 12',d3:'3rd 12',c1:'2 to 1 ·1',c2:'2 to 1 ·2',c3:'2 to 1 ·3',red:'RED',black:'BLACK',odd:'ODD',even:'EVEN',low:'1-18',high:'19-36'}[key]||key;

// ---- roulette, the full table (engines/rouletteGame.js). Bet keys:
//  n:K straight · s:A:B split · t:0:1:2 / t:0:2:3 trio · st:R street (row R = 3R+1..3R+3) · c:A corner (A, A+1, A+3, A+4) ·
//  f4 first four (0-3) · sl:R six line (rows R and R+1) · col:C column (C 0..2 = numbers C+1, C+4..) · doz:D dozen (D 0..2) ·
//  low / high / even / odd / red / black. Pays 36/n - 1 to 1 for n numbers covered (35, 17, 11, 8, 5, 2, 1).
function rCover(key){const k=String(key),m=k.split(':'),N=i=>+m[i],R=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
 if(m[0]==='n')return N(1)>=0&&N(1)<=36?[N(1)]:[];
 if(m[0]==='s'){const a=N(1),b=N(2);return a>=0&&b<=36&&a<b?[a,b]:[];}
 if(m[0]==='t')return [N(1),N(2),N(3)];
 if(m[0]==='st'){const r=N(1);return r>=0&&r<=11?R(3*r+1,3*r+3):[];}
 if(m[0]==='c'){const a=N(1);return a>=1&&a<=32&&a%3!==0?[a,a+1,a+3,a+4]:[];}
 if(k==='f4')return [0,1,2,3];
 if(m[0]==='sl'){const r=N(1);return r>=0&&r<=10?R(3*r+1,3*r+6):[];}
 if(m[0]==='col'){const c=N(1);return c>=0&&c<=2?R(0,11).map(r=>3*r+c+1):[];}
 if(m[0]==='doz'){const d=N(1);return d>=0&&d<=2?R(12*d+1,12*d+12):[];}
 const all=R(1,36);
 return {low:all.filter(n=>n<=18),high:all.filter(n=>n>18),even:all.filter(n=>n%2===0),odd:all.filter(n=>n%2),red:all.filter(n=>RED.has(n)),black:all.filter(n=>!RED.has(n))}[k]||[];}
const rPays=key=>{const n=rCover(key).length;return n?36/n-1:0;};
const rReturn=(key,amt,num)=>rCover(key).includes(num)?amt*(1+rPays(key)):0;
const rKind=key=>{const k=String(key).split(':')[0];return {n:'STRAIGHT',s:'SPLIT',t:'TRIO',st:'STREET',c:'CORNER',f4:'FIRST FOUR',sl:'SIX LINE',col:'COLUMN',doz:'DOZEN'}[k]||'EVEN MONEY';};
function rLabel(key){const k=String(key),c=rCover(k),m=k.split(':');
 if(m[0]==='n')return `${c[0]} STRAIGHT`;if(m[0]==='col')return `COLUMN ${+m[1]+1}`;if(m[0]==='doz')return ['1ST 12','2ND 12','3RD 12'][+m[1]];
 if({low:1,high:1,even:1,odd:1,red:1,black:1}[k])return {low:'1-18',high:'19-36',even:'EVEN',odd:'ODD',red:'RED',black:'BLACK'}[k];
 return `${rKind(k)} ${c.length>4?c[0]+'-'+c[c.length-1]:c.join('/')}`;}
const rColor=n=>n===0?'green':RED.has(n)?'red':'black';
Object.assign(exports,{bacValue,bacTotal,bankerDraws,POKER_NAMES,pokerRank,compareRank,handName,drawPlan,handStrength,WHEEL,RED,betWins,betPays,betReturn,betLabel,rCover,rPays,rReturn,rKind,rLabel,rColor});
