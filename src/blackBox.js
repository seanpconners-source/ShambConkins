// Black box (owner, Nov 13: the Horde froze the whole app at the same moment of the night, three runs in a row, and it
// never happened headless). While a game runs, a short report of what it is doing is saved every 2 s to localStorage
// sc-blackbox: game, version, the game's own brief (s.debug.brief()), recent crumbs (s.crumb) and long frames. A game that
// ends or is left normally clears it. If the app froze or was killed, the box is still there at the next start: lastCrash()
// moves it to sc-crashes (last 5) and returns it so the app can show it once.
const KEY='sc-blackbox',HIST='sc-crashes';
let cur=null,sess=null,timer=0;
const now=()=>Date.now();
function write(){if(!cur||!sess)return;try{cur.at=now();cur.brief=sess.debug?.brief?.()??null;cur.err=sess.frameErrors||0;localStorage.setItem(KEY,JSON.stringify(cur));}catch{}}
function boxStart(s,version){boxEnd();sess=s;cur={game:s.game?.id,v:version,start:now(),at:now(),crumbs:[],slow:[]};
 s.crumb=t=>boxCrumb(t);write();timer=setInterval(write,2000);}
function boxCrumb(t){if(!cur)return;const sec=Math.round((now()-cur.start)/1000);cur.crumbs.push(sec+'s '+String(t).slice(0,120));if(cur.crumbs.length>30)cur.crumbs.splice(0,cur.crumbs.length-30);}
// a frame that took long (main thread busy) is worth keeping: the last one before a freeze says the most
function boxSlow(ms){if(!cur)return;const sec=Math.round((now()-cur.start)/1000);cur.slow.push(sec+'s '+Math.round(ms)+'ms');if(cur.slow.length>12)cur.slow.splice(0,cur.slow.length-12);if(ms>1000)write();}
function boxEnd(){clearInterval(timer);timer=0;cur=null;sess=null;try{localStorage.removeItem(KEY);}catch{}}
function lastCrash(){let b=null;try{b=JSON.parse(localStorage.getItem(KEY)||'null');localStorage.removeItem(KEY);}catch{}
 if(!b||!b.game)return null;
 try{const L=JSON.parse(localStorage.getItem(HIST)||'[]');L.push(b);localStorage.setItem(HIST,JSON.stringify(L.slice(-5)));}catch{}
 let errs=[];try{errs=JSON.parse(localStorage.getItem('sc-errors')||'[]').filter(e=>e.game===b.game&&Date.parse(e.at)>=b.start-1000);}catch{}
 b.errors=errs.slice(-3);return b;}
function crashText(b){const mins=s=>{s=Math.max(0,Math.round(s/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
 const L=[`${b.game} · v${b.v} · stopped ${mins(b.at-b.start)} into the game`];
 if(b.brief)L.push('Last state: '+(typeof b.brief==='string'?b.brief:JSON.stringify(b.brief)));
 if(b.err)L.push('Frame errors: '+b.err);for(const e of b.errors||[])L.push('Error: '+e.msg+' @ '+(e.stack||'').split(' | ')[1]);
 if(b.slow?.length)L.push('Slow frames: '+b.slow.join(', '));
 if(b.crumbs?.length)L.push('Last things that happened:\n'+b.crumbs.slice(-14).join('\n'));
 return L.join('\n');}
Object.assign(exports,{boxStart,boxEnd,boxCrumb,boxSlow,lastCrash,crashText});
