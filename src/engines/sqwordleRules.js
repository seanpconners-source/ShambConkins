// SQWORDLE rules (Node-testable): colours for a guess and the points for a finished board.
const ROWS=6,COLS=5;
// 2 = right spot, 1 = elsewhere in the word, 0 = not in it; a repeated letter only counts as often as the answer has it
function grade(guess,ans){const r=Array(COLS).fill(0),left={};
 for(let i=0;i<COLS;i++){if(guess[i]===ans[i])r[i]=2;else left[ans[i]]=(left[ans[i]]||0)+1;}
 for(let i=0;i<COLS;i++)if(r[i]!==2&&left[guess[i]]>0){r[i]=1;left[guess[i]]--;}
 return r;}
// solved: fewer guesses first (100 a guess saved), then speed (up to 90 for under a minute and a half); a miss: 10 a blue tile
const points=r=>r.win?100*(ROWS+1-r.n)+Math.max(0,90-Math.round(r.secs)):r.best*10;
Object.assign(exports,{ROWS,COLS,grade,points});
