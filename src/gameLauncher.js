const {store, newPlayer, logRun}=require("src/state.js");
const {gameById, selectGame, selectBoardGame, PHONE_TASK}=require("src/gameRegistry.js");
const {ENGINES}=require("src/engines/index.js");
const {GameSession}=require("src/engines/session.js");
const {animateRoulette}=require("src/roulette.js");
const {showDialog, closeDialog, unlockDialog, updateBoard, toast}=require("src/ui.js");
const {gameArtHTML, portraitHTML}=require("src/assets.js");
const {recordGame, recruitReward, availableCharacters, saveProfile}=require("src/profile.js");
const {CHARACTERS, perkType}=require("src/characters.js");
const {escapeHTML, pick, runRandom}=require("src/utils.js");
const {sound}=require("src/audio.js");
const {pointChange}=require("src/items.js");
const {gameRecruitPool, gameHasGuaranteedRecruit, recruitmentChance, foodGame}=require("src/rewards.js");
const {pairForRun}=require("src/pairs.js");
const {updateProgression}=require("src/progression.js");
const {drawTriviaDifficulty,chooseTriviaDifficulty,TRIVIA_LEVELS}=require("src/engines/trivia.js");
const hooks={save(){},endTurn(){},beforeRoll(){},arcade(){}};
let launching=false,launchSerial=0;
function cancelGameLaunch(){launchSerial++;launching=false;}
function configureLauncher(options){Object.assign(hooks,options);}
async function requestGame({id=null,filter='all',origin='board',resume=false,returnToRoll=false}={}){
 if(launching||store.session)return false;launching=true;store.busy=true;store.arcade=origin!=='board';
 const run=store.run,serial=++launchSerial,valid=()=>serial===launchSerial&&store.run===run;returnToRoll=returnToRoll||!!(resume&&run?.pending?.returnToRoll);const selectionRun=run||{gameHistory:[],familyBags:{}};
 // Practice and arcade play must not consume the saved board's random stream.
 const random=origin==='board'&&run?()=>runRandom(run):Math.random;
 if(origin==='board'&&run?.mutation)id='rainbow-rivals';
 if(!id&&origin==='board'&&run?.pairState?.queuedGames?.length&&filter==='all')id=run.pairState.queuedGames.shift();
 if(origin==='board'&&!resume&&(id==='phone-task'||gameById(id)?.engine==='task')){id=null;filter='taskmaster';}
 let game;try{game=id==='phone-task'?PHONE_TASK:id?gameById(id):(origin==='board'?selectBoardGame:selectGame)(selectionRun,store.profile,run?.mutation?'arcade':filter,random);}catch(error){launching=false;store.busy=false;toast('Challenge selection recovered. Try rolling again.');console.error(error);if(origin==='board')returnToRoll?hooks.beforeRoll():hooks.endTurn();return false;}
 if(!resume&&origin==='board'&&game?.engine==='yahtzee'&&game.diceCount!==6&&random()<.5)game=gameById('cheaters-yahtzee');
 if(!id&&!resume&&selectionRun.gameHistory.at(-1))selectionRun.gameHistory.at(-1).id=game?.id||selectionRun.gameHistory.at(-1).id;
 if(!game||!ENGINES[game.engine]){launching=false;store.busy=false;toast('This challenge could not be found. The board is ready.');if(origin==='board')returnToRoll?hooks.beforeRoll():hooks.endTurn();return false;}
 if(game.engine==='trivia'){
  const savedDifficulty=resume&&run?.pending?.triviaDifficulty;
  const triviaDifficulty=TRIVIA_LEVELS.includes(savedDifficulty)?savedDifficulty:origin==='dev'?chooseTriviaDifficulty(game.triviaTag||'mixed',random):drawTriviaDifficulty(store.profile,game.triviaTag||'mixed',random);
  game={...game,triviaDifficulty};if(origin==='arcade')saveProfile(store.profile);
 }
 if(id&&!resume&&run&&origin==='board'){run.gameHistory.push({id:game.id,family:game.family});run.gameHistory=run.gameHistory.slice(-60);}
 if(origin==='board'){run.phase='game';run.pending={kind:'game',gameId:game.id,origin,returnToRoll,...(game.triviaDifficulty?{triviaDifficulty:game.triviaDifficulty}:{})};run.roundsWithoutGame=0;hooks.save();}
 if(!id&&!resume){const played=await animateRoulette(game,run?.mutation?'arcade':game.engine==='trivia'?'trivia':filter);if(!valid())return false;if(!played){launching=false;store.busy=false;if(origin==='board')returnToRoll?hooks.beforeRoll():hooks.endTurn();else hooks.arcade();return false;}}
 const choice=await showDialog({title:game.title,source:game.source,html:`${gameArtHTML(game)}<div class="how-to"><b>HOW TO PLAY · ${escapeHTML(game.duration.toUpperCase())}</b>${escapeHTML(game.rules)}</div>${run?.mutation&&origin==='board'?'<p style="font-size:12px">You are one team. Each person races a live CPU driver, then both relay scores are combined.</p>':''}`,choices:[{label:'Start game',value:'start',primary:true},{label:origin==='board'?'Return to board':'Back to arcade',value:'cancel'}]});
 if(!valid())return false;
 if(choice===null){launching=false;store.busy=false;return false;}
 if(choice!=='start'){launching=false;store.busy=false;if(origin==='board')returnToRoll?hooks.beforeRoll():hooks.endTurn();else hooks.arcade();return false;}
 const players=origin==='board'?run.players:run?structuredClone(run.players):[newPlayer('Sean','sean',0),newPlayer('Amber','amber',1)];
 const session=new GameSession(game,players,(scores,label)=>void settleGame(game,scores,label,origin,players,session.teamResult,returnToRoll));session.practice=origin==='dev';session.returnToRoll=returnToRoll;store.session=session;session.active=origin==='board'?run.current:0;session.updateScores();launching=false;
 try{await ENGINES[game.engine](session);}catch(error){console.error('Game engine failure',game.id,error);if(valid()&&session.alive){session.dispose();store.session=null;store.busy=false;await showDialog({title:'Let’s get you back to the board',body:'This challenge was interrupted. No rewards were applied.',choices:[{label:'Continue',value:'ok',primary:true}]});if(!valid())return false;if(origin==='board')returnToRoll?hooks.beforeRoll():hooks.endTurn();else hooks.arcade();}return false;}return valid();
}
async function settleGame(game,scores,label,origin,players,coop=null,returnToRoll=false){const run=store.run,serial=launchSerial,valid=()=>serial===launchSerial&&store.run===run;store.session=null;const winner=coop?null:scores[0]===scores[1]?null:scores[0]>scores[1]?0:1;if(origin!=='dev')recordGame(store.profile,game,winner,scores);const unlocked=[];let rewards=[0,0],extra=coop?.kind==='survival'?`You survived ${coop.duration}s together. Team score ${coop.humanTotal}. ${coop.won?'Both players win!':'Try moving together and reviving your partner.'}`:coop?`Your team ${coop.humanTotal} · Mario ${coop.cpuScores[0]} + Luigi ${coop.cpuScores[1]} = ${coop.cpuTotal}. ${coop.tied?'Photo-finish tie.':coop.won?'YOU BEAT THEM.':'They take this race.'}`:'';
 if(origin==='board'){
  const run=store.run;rewards=players.map((p,i)=>{const didWin=coop?coop.won:i===winner,tied=coop?coop.tied:winner===null;p.mood=tied?'happy':didWin?'win':'sad';let points=tied?4:didWin?game.reward:2;if(p.double&&didWin){points*=2;p.double--;}const itemBonus=(p.bounty||0)+(foodGame(game)?p.rewardFoodBonus||0:0);points=Math.max(0,points+p.rewardBonus+itemBonus);p.rewardBonus=0;p.bounty=0;p.rewardFoodBonus=0;if(didWin&&perkType(p.character)==='competitor')points++;if(p.character==='gordon-ramsay'){if(didWin)points+=2;else if(!tied)points=Math.max(0,points-1);}p.points+=points;if(didWin)p.wins++;if(p.crash){pointChange(p,-2,false);p.crash=false;p.slow++;}return points;});
  if(coop){const record=run.coopRecord||={rounds:0,won:0,lost:0,tied:0,humanScore:0,cpuScore:0};record.rounds++;record.humanScore+=coop.humanTotal;record.cpuScore+=coop.cpuTotal;record[coop.tied?'tied':coop.won?'won':'lost']++;if(run.mutation){if(coop.won){players.forEach(p=>p.points+=4);rewards=rewards.map(n=>n+4);run.mutation.won=(run.mutation.won||0)+1;}run.mutation.remaining--;if(!run.mutation.remaining)run.mutation=null;}}
  run.phase='result';run.pending={kind:'result',gameId:game.id,scores,label,winner,rewards,extra,origin,coop,returnToRoll};logRun(`${game.title}: ${coop?extra:scores[0]+'–'+scores[1]+'. '+(winner===null?'Tie.':players[winner].name+' wins.')}`);hooks.save();
 }
 if(winner!==null&&origin!=='dev'){const p=players[winner],pool=gameRecruitPool(game,store.profile,p);const chance=recruitmentChance(store.profile,{...p,recruitGuarantee:origin==='board'&&p.recruitGuarantee,triviaRecruitBonus:game.engine==='trivia'&&p.triviaRecruitBonus},gameHasGuaranteedRecruit(game,store.profile,p));if(pool.length&&Math.random()<chance){const c=pick(pool);const actual=recruitReward(store.profile,c.id,p.owner,'game');if(actual){unlocked.push(actual);if(origin==='board')p.recruitGuarantee=false;}}(store.profile.recruitDryStreak||={Sean:0,Amber:0})[p.owner]=unlocked.length?0:1;if(unlocked.length)toast(`${CHARACTERS.find(c=>c.id===unlocked[0])?.name||'New character'} added to ${p.owner}’s roster!`);if(p.recruitBonus)p.recruitBonus=false;if(p.triviaRecruitBonus&&game.engine==='trivia')p.triviaRecruitBonus=false;
  const secret=origin==='board'?pairForRun(store.run)?.winUnlock:null;if(secret?.game===game.id){const actual=recruitReward(store.profile,secret.character,null,'pair');if(actual)unlocked.push(actual);}
 }
 if(coop?.kind==='survival'&&coop.won&&origin!=='dev'){const pool=gameRecruitPool(game,store.profile,players[0]);if(pool.length&&Math.random()<.5){const c=pick(pool);const actual=recruitReward(store.profile,c.id,null,'game');if(actual)unlocked.push(actual);}}
 const milestones=origin==='dev'?[]:updateProgression(store.profile);if(milestones.length)extra+=" New unlocks: "+milestones.join(', ')+'.';
 if(origin==='board'){if(unlocked.length)store.run.latestRecruit={owner:players[winner]?.owner,name:CHARACTERS.find(c=>c.id===unlocked[0])?.name||'A new character'};store.run.pending.unlocked=unlocked;store.run.pending.unlockOwner=winner===null?null:players[winner].owner;store.run.pending.extra=extra;hooks.save();}if(origin!=='dev')saveProfile(store.profile);sound('win');const continued=await presentResult({gameId:game.id,scores,label,winner,rewards,extra,origin,coop,unlocked,unlockOwner:winner===null?null:players[winner].owner},players);if(continued===null||!valid())return;if(!await unlockDialog(unlocked,winner===null?null:players[winner].owner)||!valid())return;store.busy=false;
 if(origin==='board')returnToRoll?hooks.beforeRoll():hooks.endTurn();else hooks.arcade();
}
async function presentResult(result,players=store.run?.players){const game=result.gameId==='phone-task'?PHONE_TASK:gameById(result.gameId),coop=result.coop,title=coop?.kind==='survival'?coop.won?'You survived together!':'The horde takes this night':coop?coop.tied?'A photo-finish tie':coop.won?'Your team beats the brothers!':'The brothers take this race':result.winner===null?'Honors shared':`${players[result.winner].name} takes it`;return showDialog({title,source:game.source,html:`<div class="result-portraits">${players.map((p,i)=>`<div>${portraitHTML(p.character,'portrait mini',coop?coop.tied?'silly':coop.won?'win':'sad':result.winner===null?'silly':i===result.winner?'win':'sad')}<b>${escapeHTML(p.name)}</b></div>`).join('')}</div><div class="big-result">${result.scores[0]} <span style="font-size:22px;color:#a59e8b">${coop?'+':'—'}</span> ${result.scores[1]}</div><p>${escapeHTML(result.label||game.title)}</p>${(result.unlocked||[]).map(id=>{const c=CHARACTERS.find(c=>c.id===id);return c?`<div class="recruit-result"><strong>NEW CHARACTER ADDED</strong>${portraitHTML(id,'portrait mini','win')}<b>${escapeHTML(c.name)}</b><p>Added to ${escapeHTML(result.unlockOwner||'both players')}’s roster · saved for future games.</p></div>`:'';}).join('')}${result.origin==='board'?`<div class="reward-delta" style="font-size:24px">${players.map((p,i)=>`${escapeHTML(p.name)} +${result.rewards[i]}`).join(' · ')}</div>`:result.origin==='dev'?'<p>DEV TEST · No XP, unlocks, or board rewards applied.</p>':'<p style="margin-top:15px">XP and collection progress saved.</p>'}${result.extra?`<div class="how-to">${escapeHTML(result.extra)}</div>`:''}`,choices:[{label:result.origin==='board'?'Back to the board':'Back to the arcade',value:'ok',primary:true}]});}
async function exitGame(){if(!store.session)return;const s=store.session;s.paused=true;const choice=await showDialog({title:'End this challenge?',body:store.arcade?'Return to the arcade without a reward.':s.returnToRoll?'Return to the board without a reward. Your item action stays used; you can still roll.':'Return to the board without a reward. The turn passes to the other player.',choices:[{label:'Keep playing',value:'stay',primary:true},{label:'End challenge',value:'exit'}]});if(store.session!==s||!s.alive)return;if(choice!=='exit'){if(!s.waiting)s.paused=false;return;}s.dispose();store.session=null;store.busy=false;launching=false;if(store.arcade)hooks.arcade();else s.returnToRoll?hooks.beforeRoll():hooks.endTurn();}

Object.assign(exports,{cancelGameLaunch,configureLauncher,requestGame,presentResult,exitGame});