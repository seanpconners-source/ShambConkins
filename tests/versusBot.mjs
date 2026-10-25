// Bot for online versus games (tests/online-versus.mjs, tests/online-board.mjs VERSUS=1).
// One bot step on a phone: tap Ready, or play a random legal move when it is this phone's turn.
// opts.resign = resign instead of moving, opts.offer = offer a draw first (noMove: and don't move) (chess/checkers);
// opts.peek = only read the state;
// returns {moved, fp, turn, idle}.
export const versusStep=(ph,opts={})=>ph.p.evaluate(opts=>{
 const s=window.ShambConkins.store.session;if(!s||!s.net)return {none:true};
 const ready=document.querySelector('.pass-overlay [data-ready]');if(ready){ready.click();return {ready:true};}
 const d=s.debug||{},e=s.game.engine,me=s.net.seat,pick=a=>a[Math.floor(Math.random()*a.length)];
 let turn,busy=!!d.busy,fp;
 if(e==='ultimate'||e==='mancala'||e==='dots'||e==='chess'||e==='checkers'){turn=d.state?.turn;fp=JSON.stringify(e==='dots'?[d.state.h,d.state.v]:e==='mancala'?d.state.pits:e==='ultimate'?d.state.cells:d.state.board.map(p=>p?p.owner+(p.type||'')+(p.king?'K':''):'.'));}
 else if(e==='connect4'||e==='reversi'){turn=d.player;fp=JSON.stringify(d.board);}
 else if(e==='tictactoe'){turn=d.turn;fp=JSON.stringify([d.board,d.wins]);}
 else if(e==='minichess'){turn=d.turn;busy=busy||d.state!=='play';fp=JSON.stringify(d.b);}
 const idle=!busy&&!s.waiting&&!s.paused&&!s.net.queue.length,out={turn,fp,idle,moves:s.net.sent.length,got:s.net.got};
 if(!idle||turn!==me||opts.peek)return out;
 if(opts.offer&&(e==='chess'||e==='checkers')){const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Offer draw');b?.click();out.offered=!!b;if(opts.noMove)return out;}
 if(opts.resign&&(e==='chess'||e==='checkers')){const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Resign');b?.click();b?.click();out.resigned=!!b;return out;}
 if(e==='ultimate'){const l=d.legal();if(l.length)d.play(pick(l));}
 else if(e==='mancala'){const l=d.legal();if(l.length)d.sow(pick(l));}
 else if(e==='dots'){const l=[...d.state.h.map((o,i)=>o<0?['h',i]:null),...d.state.v.map((o,i)=>o<0?['v',i]:null)].filter(Boolean);if(l.length){const [o,i]=pick(l);d.line(o,i);}}
 else if(e==='chess'||e==='checkers'){const l=d.legal();if(l.length){const m=pick(l);d.choose(m.from);d.choose(m.to);}}
 else if(e==='connect4'){const l=[0,1,2,3,4,5,6].filter(c=>d.board[0][c]<0);if(l.length)d.drop(pick(l));}
 else if(e==='reversi'){const l=d.legal();if(l.length){const [r,c]=pick(l);d.place(r,c);}}
 else if(e==='tictactoe'){const l=d.board.map((v,i)=>v===null?i:-1).filter(i=>i>=0);if(l.length)d.play(pick(l));}
 else if(e==='minichess'){const l=d.legal();if(l.length)d.move(pick(l));}
 out.moved=true;return out;
},opts);
