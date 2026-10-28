// Native online games: both phones run the same 2-player game from one seed, in the same player order, and each phone
// plays only its own player (s.online.me). Every move the local player makes is sent with send(); the other player's
// moves are read in order with next(). A game is "native" when its engine knows s.online (see NET_NATIVE in solo.js).
// Moves ride the room of src/net.js as {k:'np', mid, i, m}; duplicates dropped. Each phone confirms what it has
// ({k:'npa', mid, n} = the first n moves, about once a second), so after a reconnect only the unconfirmed ones go again
// and the confirmed ones are let go (a real-time game sends thousands of snapshots).
const {sendNet,onNet}=require("src/net.js");
const channels=new Map();   // mid → channel
// moves that arrive before this phone has opened the game's channel (the other phone started first) wait here
const early=new Map();   // mid → [[i, m]...]
function openChannel(mid,me){
 const ch={mid,me,remote:1-me,out:[],got:[],read:0,have:0,acked:0,ackSent:0,ackT:null,waiters:[],gone:false,onGone:null,
  send(m){const i=ch.out.length;ch.out.push(m);sendNet({k:'np',mid,i,m});},
  // The other player's next move (in the order they made them); null once they have left the game.
  next(){if(ch.read<ch.got.length&&ch.got[ch.read]!==undefined)return Promise.resolve(take(ch));if(ch.gone)return Promise.resolve(null);return new Promise(r=>ch.waiters.push(r));},
  // A move already waiting (games that peek before they ask, like a timer on the other player's turn).
  ready(){return ch.read<ch.got.length&&ch.got[ch.read]!==undefined;},
  leave(){if(ch.gone)return;ch.gone=true;for(const r of ch.waiters.splice(0))r(null);ch.onGone?.();},
  close(){channels.delete(mid);clearTimeout(ch.ackT);for(const r of ch.waiters.splice(0))r(null);}};
 channels.set(mid,ch);
 for(const [i,m] of early.get(mid)||[])if(ch.got[i]===undefined)ch.got[i]=m;early.delete(mid);confirm(ch);
 return ch;
}
// Moves 0..have-1 have all arrived: tell the other phone (batched, at most about once a second).
function confirm(ch){while(ch.got[ch.have]!==undefined)ch.have++;if(ch.have>ch.ackSent&&!ch.ackT)ch.ackT=setTimeout(()=>{ch.ackT=null;ch.ackSent=ch.have;sendNet({k:'npa',mid:ch.mid,n:ch.have});},ch.have-ch.ackSent>200?100:900);}
function resend(ch){for(let i=ch.acked;i<ch.out.length;i++)sendNet({k:'np',mid:ch.mid,i,m:ch.out[i]});}
// read moves are let go (a duplicate is recognised by its index: below `have`)
function take(ch){const m=ch.got[ch.read];ch.got[ch.read++]=undefined;return m;}
function deliver(ch){while(ch.waiters.length&&ch.read<ch.got.length&&ch.got[ch.read]!==undefined)ch.waiters.shift()(take(ch));}
onNet(ev=>{
 if(ev.t==='msg'){const d=ev.d;
  if(d?.k==='npa'){const ch=channels.get(d.mid);if(ch&&Number.isInteger(d.n)&&d.n>ch.acked&&d.n<=ch.out.length){for(let i=ch.acked;i<d.n;i++)ch.out[i]=undefined;ch.acked=d.n;}return;}
  if(d?.k==='np'){const ch=channels.get(d.mid);if(!Number.isInteger(d.i)||d.i<0||d.i>1e8)return;
   if(!ch){if(typeof d.mid==='string'||typeof d.mid==='number'){if(early.size>8)early.delete(early.keys().next().value);const q=early.get(d.mid)||[];if(q.length<2000)q.push([d.i,d.m??null]);early.set(d.mid,q);}return;}if(d.i>=ch.have&&ch.got[d.i]===undefined)ch.got[d.i]=d.m??null;confirm(ch);deliver(ch);return;}
  if((d?.k==='quit')){const ch=channels.get(d.mid);if(ch)ch.leave();}
  return;}
 // After a reconnect, send every move the other phone hasn't confirmed again (it drops the ones it already has), and
 // repeat our own confirmation (theirs may have been lost with the connection).
 if(ev.t==='welcome'||ev.t==='join')for(const ch of channels.values()){resend(ch);if(ch.have)sendNet({k:'npa',mid:ch.mid,n:ch.have});}
});
Object.assign(exports,{openChannel});
