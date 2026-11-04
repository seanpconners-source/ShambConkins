// Blackjack rules shared by the Vegas table (engines/vegasBlackjack.js) and its tests: card values, hand totals
// (soft/hard), naturals, and basic strategy for a dealer who stands on all 17s with double after split allowed.
const cardVal=c=>c.r===1?11:Math.min(10,c.r);
function total(cards){let t=0,aces=0;for(const c of cards){t+=cardVal(c);if(c.r===1)aces++;}while(t>21&&aces){t-=10;aces--;}return {t,soft:aces>0&&t<=21};}
const isBJ=cards=>cards.length===2&&total(cards).t===21;
// basic strategy, dealer stands on soft 17, double after split allowed
function basic(cards,up,canD,canP){const u=cardVal(up),{t,soft}=total(cards),d=a=>canD?'d':a;
 if(canP&&cards.length===2&&cardVal(cards[0])===cardVal(cards[1])){const v=cardVal(cards[0]);
  if(v===11||v===8)return 'p';if(v===9&&(u<=6||u===8||u===9))return 'p';if(v===7&&u<=7)return 'p';if(v===6&&u<=6)return 'p';if(v===4&&(u===5||u===6))return 'p';if((v===2||v===3)&&u<=7)return 'p';}
 if(soft){if(t>=19)return 's';if(t===18)return u>=3&&u<=6?d('s'):u<=8?'s':'h';if(t===17)return u>=3&&u<=6?d('h'):'h';if(t>=15)return u>=4&&u<=6?d('h'):'h';return u>=5&&u<=6?d('h'):'h';}
 if(t>=17)return 's';if(t>=13)return u<=6?'s':'h';if(t===12)return u>=4&&u<=6?'s':'h';if(t===11)return d('h');if(t===10)return u<=9?d('h'):'h';if(t===9)return u>=3&&u<=6?d('h'):'h';return 'h';}

Object.assign(exports,{cardVal,total,isBJ,basic});
