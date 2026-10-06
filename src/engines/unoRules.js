const {shuffle}=require("src/utils.js");
const UNO_COLORS=Object.freeze(['red','blue','green','yellow']);
function unoDeck(){
 const cards=[];let id=0;
 for(const color of UNO_COLORS){cards.push({id:'u'+id++,color,value:'0'});for(let copy=0;copy<2;copy++)for(const value of ['1','2','3','4','5','6','7','8','9','skip','reverse','draw2'])cards.push({id:'u'+id++,color,value});}
 for(let copy=0;copy<4;copy++)for(const value of ['wild','wild4'])cards.push({id:'u'+id++,color:null,value});return cards;
}
const unoPoints=card=>/^\d$/.test(card.value)?Number(card.value):card.color?20:50;
function newUno(random=Math.random){
 const deck=shuffle(unoDeck(),random),hands=[[],[]];for(let i=0;i<7;i++)for(let p=0;p<2;p++)hands[p].push(deck.pop());
 const index=deck.findIndex(c=>/^\d$/.test(c.value)),top=deck.splice(index,1)[0];
 return {hands,draw:deck,discard:[top],color:top.color,turn:0,phase:'playing',drawnId:null,called:false,moves:0,ended:false,winner:null,reason:'',lastEvent:null};
}
function unoCanPlay(state,card){
 if(state.ended||!card||!state.hands[state.turn].some(c=>c.id===card.id))return false;
 if(state.phase==='after-draw'&&card.id!==state.drawnId)return false;
 if(card.value==='wild4')return !state.hands[state.turn].some(c=>c.color===state.color);
 return !card.color||card.color===state.color||card.value===state.discard.at(-1).value;
}
function unoLegalCards(state){return state.hands[state.turn].filter(c=>unoCanPlay(state,c));}
function take(state,owner,count,random){
 const added=[];for(let i=0;i<count;i++){
  if(!state.draw.length&&state.discard.length>1){const top=state.discard.pop();state.draw=shuffle(state.discard,random);state.discard=[top];}
  const card=state.draw.pop();if(!card)break;state.hands[owner].push(card);added.push(card);
 }return added;
}
function endTurn(state,next){
 state.moves++;state.phase='playing';state.drawnId=null;state.called=false;state.turn=next;
 if(state.moves>=80&&!state.ended){const pips=state.hands.map(h=>h.reduce((n,c)=>n+unoPoints(c),0));state.ended=true;state.winner=pips[0]===pips[1]?null:pips[0]<pips[1]?0:1;state.reason='80-turn limit · lower remaining card value wins';}
}
function unoCall(state){if(state.ended||state.hands[state.turn].length!==2)return false;state.called=true;return true;}
function unoPlay(state,id,color=null,random=Math.random){
 const owner=state.turn,hand=state.hands[owner],index=hand.findIndex(c=>c.id===id),card=hand[index];
 if(!unoCanPlay(state,card)||!card.color&&!UNO_COLORS.includes(color))return {ok:false};
 hand.splice(index,1);state.discard.push(card);state.color=card.color||color;
 const forgotten=hand.length===1&&!state.called,ownPenalty=forgotten?take(state,owner,2,random):[];
 const opponent=1-owner,drawCount=card.value==='draw2'?2:card.value==='wild4'?4:0,drawn=take(state,opponent,drawCount,random);
 const again=['skip','reverse','draw2','wild4'].includes(card.value); // Two-player Reverse acts as Skip.
 if(hand.length===0){state.ended=true;state.winner=owner;state.reason='First player to empty their hand';}
 const event={ok:true,owner,card,forgotten,ownPenalty,drawn,penaltyOwner:opponent,again};state.lastEvent=event;endTurn(state,again?owner:opponent);return event;
}
function unoDraw(state,random=Math.random){
 if(state.ended||state.phase!=='playing')return {ok:false};const owner=state.turn,added=take(state,owner,1,random);state.phase='after-draw';state.drawnId=added[0]?.id||null;state.called=false;
 return state.lastEvent={ok:true,owner,drawn:added,canPlay:!!added[0]&&unoCanPlay(state,added[0])};
}
function unoPass(state){if(state.ended||state.phase!=='after-draw')return false;endTurn(state,1-state.turn);return true;}
function unoResult(state){
 const pips=state.hands.map(h=>h.reduce((n,c)=>n+unoPoints(c),0));
 return state.winner===null?[0,0]:state.winner===0?[100+pips[1],0]:[0,100+pips[0]];
}

Object.assign(exports,{UNO_COLORS,unoDeck,unoPoints,newUno,unoCanPlay,unoLegalCards,unoCall,unoPlay,unoDraw,unoPass,unoResult});