// Board items (ROADMAP F6, src/boardMarks.js): roadblocks, toll booths, coin stacks, magnet jump. Node, no DOM.
// Uses each reworked item through items.js useItemEffect on fresh runs, then walks the other player into the marks.
import {m, freshRun} from './sim.mjs';
import {req} from './load.mjs';
const bm=req('src/boardMarks.js'),{validRun}=req('src/persistence.js'),{ITEM_REWORK}=req('src/data/balance.js');
let bad=0;const check=(ok,msg)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok)bad++;};
const use=(run,profile,id)=>{const p=run.players[run.current];p.items.unshift(id);p.itemUsedTurn=-1;p.rollCommittedTurn=-1;run.phase='board';return m.items.useItemEffect(run,profile,0,Math.random);};
const walk=(run,who,steps)=>{const p=run.players[who],hits=[];for(let k=0;k<steps;k++){const nx=run.board.nodes[p.node].next.find(id=>run.board.nodes[id]);if(!nx)break;p.visited.push(p.node);p.node=nx;const h=bm.passMarks(run,who,nx);hits.push(...h);if(h.some(x=>x.kind==='block'))break;}return hits;};
// every reworked item exists, has its new kind and a rule text
for(const id of Object.keys(ITEM_REWORK)){const it=m.items.ITEMS.find(i=>i.id===id);check(it&&it.kind===ITEM_REWORK[id].kind&&m.items.itemDescription(it).length>20,`${id} is a ${ITEM_REWORK[id].kind} item with a rule text`);}
let blocks=0,stops=0,tolls=0,paid=0,coins=0,grabbed=0,mags=0,jumped=0,valid=0,runs=0;
for(let seed=1;seed<=40;seed++){
 const {run,profile}=freshRun(seed);runs++;
 run.current=0;const [a,b]=run.players;
 // roadblock: Sean blocks Amber; Amber walks into it and stops
 const r1=use(run,profile,'cone');const placed=(run.marks||[]).filter(x=>x.kind==='block');if(placed.length)blocks++;
 if(placed.length){const h=walk(run,1,6);if(h.some(x=>x.kind==='block')&&placed.some(x=>x.node===b.node))stops++;}
 // toll: Sean builds a booth where he stands; Amber is put two behind it and walks through
 run.marks=[];run.current=0;a.items=[];walk(run,0,3);const tollNode=a.node;use(run,profile,'banana-cash');
 if(run.marks.some(x=>x.kind==='toll')){tolls++;const back=Object.values(run.board.nodes).find(n=>n.next.includes(tollNode)&&n.realm===run.board.nodes[tollNode].realm);
  if(back){b.node=back.id;b.points=10;b.shields=0;b.cloak=0;const before=a.points;b.node=tollNode;const h=bm.passMarks(run,1,tollNode);if(h.some(x=>x.kind==='toll'&&x.amount===3)&&a.points===before+3&&b.points===7)paid++;}}
 // coins: scattered ahead of Sean; Sean walks the road and picks some up
 run.marks=[];run.current=0;use(run,profile,'cheesy-poofs');const n=run.marks.filter(x=>x.kind==='coin').length;if(n)coins++;
 if(n){const pts=a.points,spot=run.marks.find(x=>x.kind==='coin').node,near=bm.roadAhead(run,a.node,8).includes(spot),h=bm.passMarks(run,0,spot);if(near&&h.length===1&&a.points===pts+3&&run.marks.filter(x=>x.kind==='coin').length===n-1)grabbed++;}
 // magnet: Amber three spaces ahead of Sean on his road → Sean jumps there
 run.marks=[];run.current=0;const ahead=bm.spacesAhead(run,a.node,3)[0];
 if(ahead){b.node=ahead;mags++;use(run,profile,'hoverboard');if(a.node===ahead)jumped++;}
 // the run with marks on it still loads (validRun), and survives a JSON round trip
 run.marks=[];use(run,profile,'cone');use(run,profile,'snoochie');use(run,profile,'dino-can');
 if(validRun(JSON.parse(JSON.stringify(run))))valid++;
}
check(blocks>=35,`roadblocks placed ahead of the opponent (${blocks}/${runs})`);
check(stops===blocks,`the opponent always stops on the roadblock (${stops}/${blocks})`);
check(tolls===runs&&paid>=tolls-3,`toll booths charge 3 points on the way through (${paid}/${tolls})`);
check(coins>=35&&grabbed>=coins-3,`coin stacks scattered and picked up for 3 each (${grabbed}/${coins})`);
check(mags>=30&&jumped===mags,`magnet jumps to an opponent ahead (${jumped}/${mags})`);
check(valid===runs,`runs with marks still load (${valid}/${runs})`);
// ward blocks the roadblock; a shield gets you through a toll free
{const {run,profile}=freshRun(7);run.current=0;run.players[1].ward=1;const r=use(run,profile,'cone');check(!(run.marks||[]).length&&/ward/i.test(r.message),'an attack ward stops a roadblock');}
{const {run}=freshRun(8);const a=run.players[0],b=run.players[1];bm.placeToll(run,0,3);b.node=a.node;b.shields=1;b.points=9;const h=bm.passMarks(run,1,a.node);check(h[0]?.blocked&&b.points===9&&b.shields===0,'a shield gets through a toll free');}
{const {run}=freshRun(9);bm.placeToll(run,0,2);const h=bm.passMarks(run,0,run.players[0].node);check(!h.length,'your own toll booth never charges you');}
console.log(bad?`${bad} problem(s)`:'BOARD MARKS OK');process.exit(bad?1:0);
