// Native online games: both phones run the same 2-player game from one seed, in the same player order, and each phone
// plays only its own player (s.online.me). Every move the local player makes is sent with send(); the other player's
// moves are read in order with next(). A game is "native" when its engine knows s.online (see NET_NATIVE in solo.js).
// Moves ride the room of src/net.js as {k:'np', mid, i, m}; resent after a reconnect, duplicates dropped.
const {sendNet,onNet}=require("src/net.js");
const channels=new Map();   // mid → channel
function openChannel(mid,me){
 const ch={mid,me,remote:1-me,out:[],got:[],read:0,waiters:[],gone:false,onGone:null,
  send(m){const i=ch.out.length;ch.out.push(m);sendNet({k:'np',mid,i,m});},
  // The other player's next move (in the order they made them); null once they have left the game.
  next(){if(ch.read<ch.got.length&&ch.got[ch.read]!==undefined)return Promise.resolve(ch.got[ch.read++]);if(ch.gone)return Promise.resolve(null);return new Promise(r=>ch.waiters.push(r));},
  // A move already waiting (games that peek before they ask, like a timer on the other player's turn).
  ready(){return ch.read<ch.got.length&&ch.got[ch.read]!==undefined;},
  leave(){if(ch.gone)return;ch.gone=true;for(const r of ch.waiters.splice(0))r(null);ch.onGone?.();},
  close(){channels.delete(mid);for(const r of ch.waiters.splice(0))r(null);}};
 channels.set(mid,ch);return ch;
}
function deliver(ch){while(ch.waiters.length&&ch.read<ch.got.length&&ch.got[ch.read]!==undefined)ch.waiters.shift()(ch.got[ch.read++]);}
onNet(ev=>{
 if(ev.t==='msg'){const d=ev.d;
  if(d?.k==='np'){const ch=channels.get(d.mid);if(!ch||!Number.isInteger(d.i)||d.i<0||d.i>100000)return;if(ch.got[d.i]===undefined)ch.got[d.i]=d.m??null;deliver(ch);return;}
  if((d?.k==='quit')){const ch=channels.get(d.mid);if(ch)ch.leave();}
  return;}
 // After a reconnect, send every move again (the other phone keeps the ones it already has).
 if(ev.t==='welcome'||ev.t==='join')for(const ch of channels.values())ch.out.forEach((m,i)=>sendNet({k:'np',mid:ch.mid,i,m}));
});
Object.assign(exports,{openChannel});
