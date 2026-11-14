// Paddy's Pool rules: 8-ball and 9-ball (WPA-style, with the common bar calls noted). Pure: judge() looks at the table
// before the shot (which balls were up), the shot record from physics.js (first ball hit, rails, pots) and the match
// state, and says what happens. Node-tested in tests/pool-rules.mjs.
//  9-BALL: hit the lowest ball first; pocket any ball (or a ball must reach a rail after contact). A legal 9 wins the rack,
//   also early (combos) and on the break (golden break). Fouls (scratch, wrong ball first, no hit, no rail) = ball in hand
//   anywhere; a 9 pocketed on a foul comes back up. Three fouls in a row lose the rack. Break: the 1 first, and a ball in or
//   four balls to a rail.
//  8-BALL: break (a ball in or four to a rail, else foul); the table is open until someone pockets a ball after the break:
//   that ball's group (solids 1-7 / stripes 9-15) is theirs. Hit your own group first, clear it, then call a pocket and sink
//   the 8. Sinking the 8 early, in another pocket or with a foul loses the rack; 8 on the break wins (bar rule) unless you
//   scratch (then it comes back up). Fouls = ball in hand anywhere (behind the head string after a scratch on the break).
const SOLIDS=[1,2,3,4,5,6,7],STRIPES=[9,10,11,12,13,14,15];
const groupOf=id=>id>=1&&id<=7?'solid':id>=9&&id<=15?'stripe':id===8?'eight':null;
function newMatch(game,{race=1,breaker=0}={}){return {game,race,racks:[0,0],turn:breaker,breaker,rackNo:1,isBreak:true,open:true,group:[null,null],fouls:[0,0],call:-1,bih:{who:breaker,kitchen:true,free:false},over:null,runOut:[0,0],shots:0};}
// on = ids on the table at the start of the shot (cue ball excluded); rec = physics record
function targets(m,on,who=m.turn){
 if(m.game==='nine'){const low=Math.min(...on.filter(i=>i>0));return Number.isFinite(low)?[low]:[];}
 if(m.isBreak||m.open||!m.group[who])return on.filter(i=>i>0&&i!==8);
 const mine=on.filter(i=>groupOf(i)===m.group[who]);return mine.length?mine:[8];
}
function judge(m,on,rec){
 const who=m.turn,pots=rec.pots.map(p=>p.id),objPots=pots.filter(i=>i>0),scratch=pots.includes(0),tg=targets(m,on,who);
 const out={who,foul:null,keep:false,winner:null,why:'',respot:[],assign:null,bih:null,tags:[],pots:objPots};
 // ---- fouls
 if(scratch)out.foul='Scratch';
 else if(rec.first===null)out.foul='No ball hit';
 else if(!tg.includes(rec.first))out.foul=m.game==='nine'?`Hit the ${rec.first} first, not the ${tg[0]}`:rec.first===8?'Hit the 8 first':'Wrong group first';
 else if(m.isBreak&&!objPots.length&&rec.railBalls.length<4)out.foul='Illegal break';
 else if(!m.isBreak&&!objPots.length&&!rec.railAfter)out.foul='No rail after contact';
 // ---- shot tags (commentary + cash)
 for(const p of rec.pots){if(!p.id||m.isBreak)continue;if(p.rails>0&&p.id===rec.first&&!out.tags.includes('bank'))out.tags.push('bank');if(p.kissed!==undefined&&p.id!==rec.first&&!out.tags.includes('combo'))out.tags.push('combo');}
 if(objPots.length&&rec.cueRailsBeforeHit>0&&!out.foul&&!m.isBreak)out.tags.push('kick');
 if(objPots.length>=2&&!m.isBreak)out.tags.push('multi');
 if(m.game==='nine'){
  if(objPots.includes(9)){if(out.foul)out.respot.push(9);else{out.winner=who;out.why=m.isBreak?'golden':'nine';}}
 }else{
  if(objPots.includes(8)){
   if(m.isBreak){if(scratch)out.respot.push(8);else{out.winner=who;out.why='break8';}}
   else if(out.foul){out.winner=1-who;out.why='8foul';}
   else if(!tg.includes(8)){out.winner=1-who;out.why='8early';}
   else{const p=rec.pots.find(q=>q.id===8);if(m.call>=0&&p&&p.pocket!==m.call){out.winner=1-who;out.why='8wrong';}else{out.winner=who;out.why='8';}}
  }
 }
 // ---- groups (8-ball): first legal pot after the break on an open table
 if(m.game==='eight'&&!m.isBreak&&m.open&&!out.foul){const first=rec.pots.find(p=>p.id&&p.id!==8);if(first)out.assign=groupOf(first.id);}
 // ---- keep shooting?
 if(!out.foul&&out.winner===null){
  if(m.game==='nine')out.keep=objPots.length>0;
  else if(m.isBreak)out.keep=objPots.length>0;
  else{const g=out.assign||m.group[who];out.keep=g?objPots.some(i=>groupOf(i)===g):objPots.length>0;}
 }
 // three fouls in a row (9-ball)
 if(m.game==='nine'&&out.foul&&out.winner===null&&m.fouls[who]>=2){out.winner=1-who;out.why='3fouls';}
 if(out.foul&&out.winner===null)out.bih={who:1-who,kitchen:m.isBreak&&scratch&&m.game==='eight',free:true};
 return out;
}
// apply a judged shot to the match; returns the match (mutated)
function apply(m,out){
 m.shots++;const who=out.who;
 if(out.assign){m.group[who]=out.assign;m.group[1-who]=out.assign==='solid'?'stripe':'solid';m.open=false;}
 m.fouls[who]=out.foul?m.fouls[who]+1:0;
 if(!out.foul&&out.pots.length)m.runOut[who]+=out.pots.length;else if(out.foul||!out.keep)m.runOut[who]=0;
 m.isBreak=false;m.call=-1;m.bih=out.bih;
 if(out.winner!==null){m.racks[out.winner]++;if(m.racks[out.winner]>=m.race)m.over=out.winner;return m;}
 if(!out.keep)m.turn=1-who;
 return m;
}
function nextRack(m){const b=1-m.breaker;Object.assign(m,{breaker:b,turn:b,rackNo:m.rackNo+1,isBreak:true,open:true,group:[null,null],fouls:[0,0],call:-1,bih:{who:b,kitchen:true,free:false},runOut:[0,0]});return m;}
const WHY={golden:'GOLDEN BREAK!',nine:'NINE BALL!',break8:'8 ON THE BREAK!','8':'EIGHT BALL!','8foul':'Fouled on the 8','8early':'8 went down early','8wrong':'8 in the wrong pocket','3fouls':'Three fouls in a row'};
Object.assign(exports,{SOLIDS,STRIPES,groupOf,newMatch,targets,judge,apply,nextRack,WHY});
