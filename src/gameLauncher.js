const {store, newPlayer, logRun}=require("src/state.js");
const {gameById, selectGame, selectBoardGame, PHONE_TASK}=require("src/gameRegistry.js");
const {levelFit,levelInfo,humiliation}=require("src/levels.js");
const {bossById}=require("src/data/bosses.js");
const {ENGINES}=require("src/engines/index.js");
const {GameSession}=require("src/engines/session.js");
const {animateRoulette}=require("src/roulette.js");
const {showDialog, closeDialog, unlockDialog, updateBoard, toast}=require("src/ui.js");
const {gameArtHTML, portraitHTML}=require("src/assets.js");
const {recordGame, recruitReward, availableCharacters, canRecruit, saveProfile, validatedBroforceClaims}=require("src/profile.js");
const {PROFILE_KEY,RUN_KEY,readDurableJSON,writeDurableJSON,validRun,BROFORCE_IDS,validBroforceAttempt,validBroforceTerminal,validBroforceEvidence,validBroforceIntent}=require('src/persistence.js');
const {pickLairVillain}=require("src/data/bondLair.js");
const {pickSouthPark}=require("src/data/southPark.js");
const {CHARACTERS, perkType}=require("src/characters.js");
const {escapeHTML, pick, runRandom, seededRandom}=require("src/utils.js");
const {sound}=require("src/audio.js");
const {pointChange}=require("src/items.js");
const {gameRecruitPool, gameHasGuaranteedRecruit, recruitmentChance, foodGame}=require("src/rewards.js");
const {pairForRun}=require("src/pairs.js");
const {warpTheme,warpGameId,warpAllowsGame}=require("src/warpThemes.js");
const {updateProgression}=require("src/progression.js");
const {drawTriviaDifficulty,chooseTriviaDifficulty,TRIVIA_LEVELS}=require("src/engines/trivia.js");
const {soloKind, soloSettings, recordSolo, soloBest, soloBestText, SOLO_SKILL, SOLO_LEVEL_NAMES}=require("src/solo.js");
const hooks={save(){},endTurn(){},beforeRoll(){},arcade(){},bossDone:null};
let launching=false,launchSerial=0;
function cancelGameLaunch(){launchSerial++;launching=false;}
function configureLauncher(options){Object.assign(hooks,options);}
const bfClone=value=>JSON.parse(JSON.stringify(value));
const bfSame=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Broforce is a normal turn-based score game now. The old co-op devil/extraction flow only survives so a save made
// in the middle of it can still show its result; no new launch enters it.
const bfGame=()=>false;
const bfResultDialogs=new WeakMap();
function showBroforceResultOnce(result,players){
 if(bfResultDialogs.has(result))return bfResultDialogs.get(result);
 const pending=presentBroforceResult(result,players).finally(()=>bfResultDialogs.delete(result));
 bfResultDialogs.set(result,pending);return pending;
}
function registeredBroforce(game){const registered=gameById(game?.id);return BROFORCE_IDS.includes(game?.id)&&game.engine==='broforce'&&game.stageId===game.id&&registered?.engine==='broforce'&&registered.stageId===game.id;}
function saveBroforceRun(run){return validRun(run)&&writeDurableJSON(RUN_KEY,run);}
function prepareBroforceAttempt(game,run,resume){
 if(!registeredBroforce(game))throw new Error('Unregistered Broforce stage');
 if(resume&&run.pending?.bfAttempt){
  const a=run.pending.bfAttempt;
  if(!validBroforceAttempt(a)||a.gameId!==game.id||!run.players.every((p,i)=>p.owner===a.owners[i]&&p.character===a.fighterIds[i]))throw new Error('Invalid saved Broforce attempt');
  return bfClone(a);
 }
 const bytes=new Uint32Array(5);globalThis.crypto.getRandomValues(bytes);
 const attemptId='bf37:'+Array.from(bytes,n=>n.toString(16).padStart(8,'0')).join('');
 const seed=bytes[0],{chooseDevil,devilHasArt}=require('src/engines/broforce/roster.js');
 return {schema:1,attemptId,gameId:game.id,stageId:game.id,seed,origin:'board',owners:['Sean','Amber'],
  fighterIds:run.players.map(p=>p.character),devilId:chooseDevil(store.profile,['Sean','Amber'],seededRandom(seed),devilHasArt)};
}
// BF-34 adapter bridge: use this saved attempt to create the mission, then call
// confirmExtraction with BF-21's completed state BEFORE s.finish. teamResult is
// only a display envelope. This closure is an accident/spoof guard, not a secret
// or a security boundary against someone editing JavaScript/localStorage.
function bindBroforceSession(session,attempt,valid){
 let evidence=null;
 const frozen=bfClone(attempt);Object.freeze(frozen.owners);Object.freeze(frozen.fighterIds);Object.freeze(frozen);
 Object.defineProperty(session,'broforceReward',{value:Object.freeze({attempt:frozen,
  confirmExtraction({devilId,devilDefeated,extraction}={}){
   if(evidence||!valid()||!session.alive||session.paused||devilId!==attempt.devilId||devilDefeated!==true||
      extraction?.active!==true||extraction.phase!=='completed'||extraction.outcome!=='extracted'||extraction.reason!=='departure')return false;
   const bf={schema:1,attemptId:attempt.attemptId,stageId:attempt.stageId,devilId,outcome:'extracted',boarded:extraction.boarded,
    aliveAtBoarding:extraction.receipts?.map(Boolean)};
   const proof={devilId,devilDefeated,receipts:extraction.receipts};
   if(!validBroforceEvidence(proof,bf,attempt))return false;
   evidence=bfClone(proof);return true;
  }
 }),writable:false});
 return ()=>evidence&&bfClone(evidence);
}
function broforceIntent(game,coop,attempt,evidence){
 if(!registeredBroforce(game)||!validBroforceTerminal(coop?.bf,attempt)||coop.kind!=='broforce'||
    coop.won!==(coop.bf.outcome==='extracted')||attempt.devilId!==null&&!CHARACTERS.some(c=>c.id===attempt.devilId))return null;
 const {schema,attemptId,stageId,devilId,outcome,boarded,aliveAtBoarding}=coop.bf;
 const bf=bfClone({schema,attemptId,stageId,devilId,outcome,boarded,aliveAtBoarding});
 if(bf.outcome==='extracted'&&(!validBroforceEvidence(evidence,bf,attempt)||
    !bf.aliveAtBoarding.every((alive,i)=>alive===!!evidence.receipts[i])))return null;
 return {bf,evidence:bf.outcome==='extracted'?bfClone(evidence):null};
}
function recoverBroforceResult(result){
 const run=store.run,a=result.bfAttempt,intent=result.bfIntent;
 if(!a||!intent)return {ok:true,grants:[]}; // Old results never gain new authority.
 if(run?.pending!==result||result.origin!=='board'||!registeredBroforce(gameById(result.gameId))||!validRun(run)||!validBroforceIntent(intent,a))return {ok:false,invalid:true};
 const previous=readDurableJSON(RUN_KEY)?.pending;
 if(!bfSame(previous?.bfAttempt,a)||!['game','result'].includes(previous?.kind)||
    previous.kind==='result'&&!bfSame(previous.bfIntent,intent))return {ok:false,invalid:true};
 // First write is the recoverable intent. A failed write never reaches profile IO.
 if(!saveBroforceRun(run))return {ok:false};
 const durable=readDurableJSON(RUN_KEY)?.pending;
 if(!bfSame(durable?.bfAttempt,a)||!bfSame(durable?.bfIntent,intent))return {ok:false};
 const claims=validatedBroforceClaims(store.profile.broforceClaims||{});
 if(store.profile.broforceClaimsBlocked||!claims||Object.values(claims).some(r=>r.attemptId===a.attemptId&&r.devilId!==a.devilId))return {ok:false,invalid:true};
 try{
  const {planBroforceAwards,applyBroforceAwards}=require('src/engines/broforce/rewardPolicy.js');
  const plan=planBroforceAwards({profile:store.profile,origin:'board',owners:a.owners,attemptId:a.attemptId,devilId:a.devilId,
   boarded:intent.bf.boarded,aliveAtBoarding:intent.bf.aliveAtBoarding,won:intent.bf.outcome==='extracted'});
  const applied=applyBroforceAwards(store.profile,plan);
  // Preserve the photo library's nonenumerable active selection across BF-27's JSON clone.
  if(store.profile.photoHuntPair&&!Object.hasOwn(applied.profile,'photoHuntPair'))Object.defineProperty(applied.profile,'photoHuntPair',{value:store.profile.photoHuntPair,writable:true,configurable:true});
  if(applied.grants.length){
   // Only fresh owner-specific recruits need a new durable profile transaction.
   if(!saveProfile(applied.profile,{durable:true}))return {ok:false};
   Object.assign(store.profile,applied.profile);
  }else{
   // A replay may already have committed receipts. Verify their durable copies
   // before acknowledging, but never require a redundant profile write.
   const persistedClaims=validatedBroforceClaims(readDurableJSON(PROFILE_KEY)?.broforceClaims||{});
   if(!persistedClaims||Object.entries(claims).some(([key,receipt])=>
      receipt.attemptId===a.attemptId&&!bfSame(persistedClaims[key],receipt)))return {ok:false};
  }
  const grants=a.owners.flatMap((owner,i)=>{
   const receipt=store.profile.broforceClaims?.['bf27:'+JSON.stringify([a.attemptId,owner])];
   return intent.bf.outcome==='extracted'&&intent.bf.boarded[i]&&receipt?.devilId===a.devilId?[{owner,characterId:a.devilId}]:[];
  });
  result.bfGrants=grants;result.bfCommitted=true;result.unlocked=[];
  // Ack failure is recoverable: profile receipts are already durable. Never undo them.
  saveBroforceRun(run);
  return {ok:true,grants};
 }catch(error){console.error('Broforce reward recovery rejected',error);return {ok:false,invalid:true};}
}
async function presentBroforceResult(result,players){
 const run=store.run,serial=launchSerial,valid=()=>store.run===run&&serial===launchSerial;
 let recovered={ok:true,grants:[]};
 if(result.origin==='board'){
  recovered=recoverBroforceResult(result);
  while(!recovered.ok&&!recovered.invalid){
   const retry=await showDialog({title:'Reward save pending',body:'Browser storage is unavailable. This reward save is not confirmed. Keep this result open and retry. If you leave, use Settings → Export backup before closing the browser.',choices:[{label:'Retry saving',value:'retry',primary:true}]});
   if(retry===null||!valid())return null;
   recovered=recoverBroforceResult(result);
  }
 }
 const game=gameById(result.gameId),bf=result.bfIntent?.bf||result.coop?.bf;
 const won=bf?.outcome==='extracted',practice=result.origin!=='board';
 const grants=recovered.grants||[];
 // Never fill generic unlocked/unlockOwner: continueRun would show an incorrect
 // shared-roster dialog. The owner-specific cards below are the sole BF reveal.
 result.unlocked=[];
 return showDialog({title:won?'Helicopter extraction complete':'Mission ended',source:game?.source,
  html:`<div class="result-portraits">${players.map((p,i)=>`<div>${portraitHTML(p.character,'portrait mini',bf?.boarded?.[i]?'win':'sad')}<b>${escapeHTML(p.name)}</b></div>`).join('')}</div><div class="big-result">${escapeHTML(result.scores?.[0]??0)} + ${escapeHTML(result.scores?.[1]??0)}</div><p>${escapeHTML(result.label||game?.title||'Broforce')}</p>${grants.map(g=>{const c=CHARACTERS.find(c=>c.id===g.characterId);return `<div class="recruit-result"><strong>NEW CHARACTER ADDED</strong>${portraitHTML(g.characterId,'portrait mini','win')}<b>${escapeHTML(c?.name||g.characterId)}</b><p>Added to ${escapeHTML(g.owner)}’s roster · saved for future games.</p></div>`;}).join('')}<p>${practice?'Practice · No XP, unlocks, or board rewards applied.':recovered.invalid?'Reward evidence could not be verified. No new reward applied.':grants.length?'Only living helicopter boarders receive the exact devil.':'No new character awarded.'}</p>${result.extra?`<p>${escapeHTML(result.extra)}</p>`:''}`,
  choices:[{label:practice?'Back to the arcade':'Back to the board',value:'ok',primary:true}]});
}
async function settleBroforceGame(game,scores,label,origin,players,coop,returnToRoll,authority){
 const run=store.run,serial=launchSerial,valid=()=>serial===launchSerial&&store.run===run;
 store.session=null;
 const result={kind:'result',gameId:game.id,scores:Array.isArray(scores)&&scores.length===2&&scores.every(Number.isFinite)?scores:[0,0],label:typeof label==='string'?label:'',winner:null,rewards:[0,0],extra:'',origin,coop,returnToRoll,unlocked:[]};
 if(origin==='board'){
  const a=authority?.attempt,saved=readDurableJSON(RUN_KEY)?.pending;
  const intent=a&&bfSame(run.pending?.bfAttempt,a)&&bfSame(saved?.bfAttempt,a)&&saved.kind==='game'?
   broforceIntent(game,coop,a,authority.evidence):null;
  if(intent){result.bfAttempt=bfClone(a);result.bfIntent=intent;}
  else result.extra='No reward: this mission’s saved attempt and extraction evidence did not match.';
  run.phase='result';run.pending=result;
  // presentResult persists the intent before any award, including on crash replay.
  if(!intent)saveBroforceRun(run);
 }
 const continued=await presentResult(result,players);
 if(continued===null||!valid())return;
 store.busy=false;if(origin==='board')returnToRoll?hooks.beforeRoll():hooks.endTurn();else hooks.arcade();
}
// Solo players: the chosen person (their New Game pick) and a CPU wearing the other pick (or a random face if both match).
function soloPlayers(run,who){const pickOf=i=>({name:store.setupNames?.[i]??run?.players?.[i]?.name??(i?'Amber':'Sean'),character:store.setupSelected?.[i]||run?.players?.[i]?.character||(i?'amber':'sean')});
 const me=pickOf(who),other=pickOf(1-who),pool=availableCharacters(store.profile,who?'Sean':'Amber').filter(id=>id!==me.character);
 const cpuChar=other.character!==me.character?other.character:(pool.length?pick(pool):'gordon-ramsay');
 const cpuName=`${(CHARACTERS.find(c=>c.id===cpuChar)?.name||'').split(' ')[0]||'Rival'} (CPU)`;
 return [newPlayer(me.name,me.character,who),{...newPlayer('CPU',cpuChar,1-who),name:cpuName}];}
async function requestGame({id=null,filter='all',origin='board',resume=false,returnToRoll=false,solo=false}={}){
 if(launching||store.session)return false;launching=true;store.busy=true;store.arcade=origin!=='board';
 const run=store.run,serial=++launchSerial,valid=()=>serial===launchSerial&&store.run===run;returnToRoll=returnToRoll||!!(resume&&run?.pending?.returnToRoll);const selectionRun=run||{gameHistory:[],familyBags:{}};if(run&&!(origin!=='board'&&BROFORCE_IDS.includes(id)))run.levelRealm=origin==='board'?run.board.nodes[run.players[run.current].node]?.realm:undefined;
 // Practice and arcade play must not consume the saved board's random stream.
 const random=origin==='board'&&run?()=>runRandom(run):Math.random;
 // A themed warp zone only deals its own games: a roulette, a task space or a challenge item there plays the zone's game instead.
 const warp=origin==='board'&&!resume&&warpTheme(run)?run:null;
 if(warp&&id&&id!=='phone-task'&&!warpAllowsGame(run,gameById(id)))id=null;
 if(origin==='board'&&run?.mutation&&!warp&&!BROFORCE_IDS.includes(id))id='rainbow-rivals';
 if(!id&&!warp&&origin==='board'&&run?.pairState?.queuedGames?.length&&filter==='all')id=run.pairState.queuedGames.shift();
 if(warp&&(id==='phone-task'||gameById(id)?.engine==='task'))id=null;
 const warpPick=warp&&!id?warpGameId(run,filter==='trivia'?'trivia':'all',random,g=>!!gameById(g)):null;
 if(origin==='board'&&!resume&&(id==='phone-task'||gameById(id)?.engine==='task')){id=null;filter='taskmaster';}
 let game;try{game=id==='phone-task'?PHONE_TASK:id?gameById(id):warpPick?gameById(warpPick):(origin==='board'?selectBoardGame:selectGame)(selectionRun,store.profile,run?.mutation?'arcade':filter,random);}catch(error){launching=false;store.busy=false;toast('Challenge selection recovered. Try rolling again.');console.error(error);if(origin==='board')returnToRoll?hooks.beforeRoll():hooks.endTurn();return false;}
 if(!resume&&origin==='board'&&game?.engine==='yahtzee'&&game.diceCount!==6&&random()<.5)game=gameById('cheaters-yahtzee');
 if(warpPick&&game){run.gameHistory.push({id:game.id,family:game.family});run.gameHistory=run.gameHistory.slice(-60);}
 else if(!id&&!resume&&selectionRun.gameHistory.at(-1))selectionRun.gameHistory.at(-1).id=game?.id||selectionRun.gameHistory.at(-1).id;
 if(!game||!ENGINES[game.engine]){launching=false;store.busy=false;toast('This challenge could not be found. The board is ready.');if(origin==='board')returnToRoll?hooks.beforeRoll():hooks.endTurn();return false;}
 if(bfGame(game)&&!registeredBroforce(game)){launching=false;store.busy=false;toast('Broforce stage registration is incomplete.');return false;}
 if(origin==='board'&&resume&&BROFORCE_IDS.includes(game.id)&&run.pending?.bfIntent){launching=false;const result=run.pending;const continued=await presentResult(result);if(continued!==null&&valid()){store.busy=false;returnToRoll?hooks.beforeRoll():hooks.endTurn();}return false;}
 let bfAttempt=null;
 if(origin==='board'&&bfGame(game)){
  try{bfAttempt=prepareBroforceAttempt(game,run,resume);}catch(error){console.error(error);launching=false;store.busy=false;toast('Broforce attempt could not be prepared. No reward applied.');return false;}
 }
 if(game.engine==='trivia'){
  const savedDifficulty=resume&&run?.pending?.triviaDifficulty;
  const triviaDifficulty=TRIVIA_LEVELS.includes(savedDifficulty)?savedDifficulty:origin==='dev'?chooseTriviaDifficulty(game.triviaTag||'mixed',random):drawTriviaDifficulty(store.profile,game.triviaTag||'mixed',random);
  game={...game,triviaDifficulty};if(origin==='arcade')saveProfile(store.profile);
 }
 if(id&&!resume&&run&&origin==='board'){run.gameHistory.push({id:game.id,family:game.family});run.gameHistory=run.gameHistory.slice(-60);}
 if(origin==='board'){run.phase='game';run.pending={kind:'game',gameId:game.id,origin,returnToRoll,...(game.triviaDifficulty?{triviaDifficulty:game.triviaDifficulty}:{}),...(bfAttempt?{bfAttempt}:{})};run.roundsWithoutGame=0;
  if(bfAttempt){if(!saveBroforceRun(run)){launching=false;store.busy=false;toast('Browser storage is unavailable. Broforce has not started; retry after storage is available.');return false;}}
  else hooks.save();
 }
 if(!id&&!resume){const played=await animateRoulette(game,run?.mutation?'arcade':game.engine==='trivia'?'trivia':filter,warpPick?warpTheme(run)[game.engine==='trivia'?'trivia':'games'].map(gameById).filter(Boolean):null);if(!valid())return false;if(!played){launching=false;store.busy=false;if(origin==='board')returnToRoll?hooks.beforeRoll():hooks.endTurn();else hooks.arcade();return false;}}
 const soloKindNow=solo&&origin==='arcade'?soloKind(game):null,soloSet=soloKindNow?soloSettings(store.profile):null;
 const soloNote=soloKindNow?`<p class="solo-note"><b>${soloKindNow==='cpu'?`SOLO · VS CPU (${SOLO_LEVEL_NAMES[soloSet.level].toUpperCase()})`:'SOLO RUN'}</b> ${soloKindNow==='cpu'?'You play against a CPU opponent.':'Play level after level until the run ends. Tap Exit any time to bank your score.'}${soloBestText(store.profile,game.id)?` ${escapeHTML(soloBestText(store.profile,game.id))}.`:''}</p>`:'';
 const choice=await showDialog({title:game.title,source:game.source,html:`${gameArtHTML(game)}${soloNote}<div class="how-to"><b>HOW TO PLAY · ${escapeHTML(game.duration.toUpperCase())}</b>${escapeHTML(game.rules)}</div>${run?.mutation&&origin==='board'&&!bfGame(game)?'<p style="font-size:12px">You are one team. Each person races a live CPU driver, then both relay scores are combined.</p>':''}`,choices:[{label:'Start game',value:'start',primary:true},{label:origin==='board'?'Return to board':'Back to arcade',value:'cancel'}]});
 if(!valid())return false;
 if(choice===null){launching=false;store.busy=false;return false;}
 if(choice!=='start'){launching=false;store.busy=false;if(origin==='board')returnToRoll?hooks.beforeRoll():hooks.endTurn();else hooks.arcade();return false;}
 // Arcade play uses the latest new-game screen picks (names + characters); the draft starts from the saved run.
 const players=soloKindNow?soloPlayers(run,soloSet.who):origin==='board'?run.players:run?structuredClone(run.players).map((p,i)=>({...p,name:store.setupNames?.[i]||p.name,character:store.setupSelected?.[i]||p.character})):[newPlayer(store.setupNames?.[0]??'Sean',store.setupSelected?.[0]||'sean',0),newPlayer(store.setupNames?.[1]??'Amber',store.setupSelected?.[1]||'amber',1)];
 let delivered=false,getEvidence=()=>null;
 const session=new GameSession(game,players,(scores,label)=>{
  if(bfGame(game)){
   if(delivered||!valid()||store.session!==session||!session.finished)return;
   delivered=true;
  }
  if(session.solo){void settleSolo(game,scores,label,players,{...session.solo,progress:session.soloProgress},session.broforceRecruits||session.gameRecruits);return;}
  void settleGame(game,scores,label,origin,players,session.teamResult,returnToRoll,bfAttempt?{attempt:bfAttempt,evidence:getEvidence()}:null,session.broforceRecruits||session.gameRecruits);
 });
 if(soloKindNow){const best=soloBest(store.profile,game.id);session.solo={kind:soloKindNow,who:soloSet.who,level:soloSet.level,skill:SOLO_SKILL[soloSet.level],best:best?.score||0,bestLevel:best?.level||0};}
 if(bfAttempt)getEvidence=bindBroforceSession(session,bfAttempt,()=>valid()&&store.session===session&&!delivered);
 session.practice=origin==='dev';session.returnToRoll=returnToRoll;store.session=session;session.active=origin==='board'?run.current:0;session.updateScores();launching=false;
 try{await ENGINES[game.engine](session);}catch(error){console.error('Game engine failure',game.id,error);if(valid()&&session.alive){session.dispose();store.session=null;store.busy=false;await showDialog({title:'Let’s get you back to the board',body:'This challenge was interrupted. No rewards were applied.',choices:[{label:'Continue',value:'ok',primary:true}]});if(!valid())return false;if(origin==='board')returnToRoll?hooks.beforeRoll():hooks.endTurn();else hooks.arcade();}return false;}return valid();
}
// Games that hand out their own recruits (Broforce gold cages, the Sonic boss pilot) skip the random winner recruit.
const cageGame=game=>game.engine==='broforce'||game.engine==='marioBros'||game.engine==='sonic'&&game.sonicMode==='boss';
async function settleGame(game,scores,label,origin,players,coop=null,returnToRoll=false,bfAuthority=null,cageRecruits=null){if(bfGame(game)||coop?.kind==='broforce')return settleBroforceGame(game,scores,label,origin,players,coop,returnToRoll,bfAuthority);const run=store.run,serial=launchSerial,valid=()=>serial===launchSerial&&store.run===run;store.session=null;const winner=coop?null:scores[0]===scores[1]?null:scores[0]>scores[1]?0:1;if(origin!=='dev')recordGame(store.profile,game,winner,scores);const unlocked=[];let rewards=[0,0],extra=coop?.kind==='boss'?`${coop.won?'KNOCKOUT! ':'Defeated. '}Team damage ${coop.humanTotal}${coop.duration?' in '+coop.duration+'s':''}.`:coop?.kind==='survival'?`You survived ${coop.duration}s together. Team score ${coop.humanTotal}. ${coop.won?'Both players win!':'Try moving together and reviving your partner.'}`:coop?`Your team ${coop.humanTotal} · Mario ${coop.cpuScores[0]} + Luigi ${coop.cpuScores[1]} = ${coop.cpuTotal}. ${coop.tied?'Photo-finish tie.':coop.won?'YOU BEAT THEM.':'They take this race.'}`:'';
 if(origin==='board'){
  const run=store.run;rewards=players.map((p,i)=>{const didWin=coop?coop.won:i===winner,tied=coop?coop.tied:winner===null;p.mood=tied?'happy':didWin?'win':'sad';let points=tied?4:didWin?game.reward:2;if(p.double&&didWin){points*=2;p.double--;}const itemBonus=(p.bounty||0)+(foodGame(game)?p.rewardFoodBonus||0:0);points=Math.max(0,points+p.rewardBonus+itemBonus);p.rewardBonus=0;p.bounty=0;p.rewardFoodBonus=0;if(didWin&&perkType(p.character)==='competitor')points++;if(p.character==='gordon-ramsay'){if(didWin)points+=2;else if(!tied)points=Math.max(0,points-1);}p.points+=points;if(didWin)p.wins++;if(p.crash){pointChange(p,-2,false);p.crash=false;p.slow++;}return points;});
  if(coop){const record=run.coopRecord||={rounds:0,won:0,lost:0,tied:0,humanScore:0,cpuScore:0};record.rounds++;record.humanScore+=coop.humanTotal;record.cpuScore+=coop.cpuTotal;record[coop.tied?'tied':coop.won?'won':'lost']++;if(run.mutation){if(coop.won){players.forEach(p=>p.points+=4);rewards=rewards.map(n=>n+4);run.mutation.won=(run.mutation.won||0)+1;}run.mutation.remaining--;if(!run.mutation.remaining)run.mutation=null;}}
  const lvRealm=run.board.nodes[players[run.current]?.node]?.realm;
  if(!coop&&winner!==null&&lvRealm&&levelFit(game,lvRealm)>0){players[winner].points++;rewards[winner]++;extra+=` ${levelInfo(lvRealm).name} bonus: +1 for ${players[winner].name}.`;}
  if(!coop&&winner!==null&&lvRealm==='spirit')extra+=` Public humiliation for ${players[1-winner].name}: ${humiliation()}`;
  run.phase='result';run.pending={kind:'result',gameId:game.id,scores,label,winner,rewards,extra,origin,coop,returnToRoll};logRun(`${game.title}: ${coop?extra:scores[0]+'–'+scores[1]+'. '+(winner===null?'Tie.':players[winner].name+' wins.')}`);hooks.save();
 }
 if(winner!==null&&origin!=='dev'){const p=players[winner],pool=gameRecruitPool(game,store.profile,p);if(origin==='board'&&!coop)hooks.journeyWin?.(winner);const chance=recruitmentChance(store.profile,{...p,recruitGuarantee:origin==='board'&&p.recruitGuarantee,triviaRecruitBonus:game.engine==='trivia'&&p.triviaRecruitBonus},gameHasGuaranteedRecruit(game,store.profile,p));if(!cageGame(game)&&pool.length&&Math.random()<chance){const c=pick(pool);const actual=recruitReward(store.profile,c.id,p.owner,'game');if(actual){unlocked.push(actual);if(origin==='board')p.recruitGuarantee=false;}}if(!cageGame(game))(store.profile.recruitDryStreak||={Sean:0,Amber:0})[p.owner]=unlocked.length?0:1;if(unlocked.length)toast(`${CHARACTERS.find(c=>c.id===unlocked[0])?.name||'New character'} added to ${p.owner}’s roster!`);if(p.recruitBonus)p.recruitBonus=false;if(p.triviaRecruitBonus&&game.engine==='trivia')p.triviaRecruitBonus=false;
  const secret=origin==='board'?pairForRun(store.run)?.winUnlock:null;if(secret?.game===game.id){const actual=recruitReward(store.profile,secret.character,null,'pair');if(actual)unlocked.push(actual);}
  const heir=CHARACTERS.find(c=>c.unlockBy==='character-win'&&c.requires===p.character);if(heir){const actual=recruitReward(store.profile,heir.id,p.owner,'character');if(actual){unlocked.push(actual);toast(`${heir.name} unlocked for ${p.owner}!`);}}
  // South Park warp: every game won in town recruits a South Park character the winner does not have yet.
  if(origin==='board'&&!coop&&store.run?.board?.warp?.id==='south-park'){const id=pickSouthPark(availableCharacters(store.profile,p.owner),cid=>canRecruit(store.profile,cid,p.owner,'southpark'));const actual=id&&recruitReward(store.profile,id,p.owner,'southpark');if(actual){unlocked.push(actual);toast(`${CHARACTERS.find(c=>c.id===actual)?.name||'A South Park kid'} moves in with ${p.owner}!`);}}
 }
 if(coop?.kind==='survival'&&coop.won&&origin!=='dev'){const pool=gameRecruitPool(game,store.profile,players[0]);if(pool.length&&Math.random()<.5){const c=pick(pool);const actual=recruitReward(store.profile,c.id,null,'game');if(actual)unlocked.push(actual);}}
 if(coop?.kind==='boss'&&coop.won&&origin!=='dev'&&game.bossId){const beaten=store.profile.bossesBeaten||=[];if(!beaten.includes(game.bossId))beaten.push(game.bossId);const b=bossById(game.bossId),poolId=b?.unlockPool==='bond-villains'?pickLairVillain(players.flatMap(p=>availableCharacters(store.profile,p.owner)),id=>canRecruit(store.profile,id,null,'boss')):null;if(b?.unlockId){const actual=b.unlockPool?(poolId&&recruitReward(store.profile,poolId,null,'boss')):recruitReward(store.profile,b.unlockId,null,'boss');if(actual){unlocked.push(actual);toast(`${CHARACTERS.find(c=>c.id===actual)?.name||'A boss'} joins both rosters!`);}}}
 const unlockOwners={};if(cageGame(game)&&origin!=='dev'&&Array.isArray(cageRecruits))players.forEach((p,i)=>{for(const id of (cageRecruits[i]||[]).slice(0,3)){const actual=recruitReward(store.profile,id,p.owner,'game');if(actual&&!unlocked.includes(actual)){unlocked.push(actual);unlockOwners[actual]=p.owner;}}});
 const milestones=origin==='dev'?[]:updateProgression(store.profile);if(milestones.length)extra+=" New unlocks: "+milestones.join(', ')+'.';
 if(origin==='board'){if(unlocked.length)store.run.latestRecruit={owner:players[winner]?.owner,name:CHARACTERS.find(c=>c.id===unlocked[0])?.name||'A new character'};store.run.pending.unlocked=unlocked;store.run.pending.unlockOwner=winner===null?null:players[winner].owner;store.run.pending.unlockOwners=unlockOwners;store.run.pending.extra=extra;hooks.save();}if(origin!=='dev')saveProfile(store.profile);sound('win');const continued=await presentResult({gameId:game.id,scores,label,winner,rewards,extra,origin,coop,unlocked,unlockOwner:winner===null?null:players[winner].owner,unlockOwners},players);if(continued===null||!valid())return;for(const owner of [...new Set(unlocked.map(id=>unlockOwners[id]||(winner===null?null:players[winner].owner)))])if(!await unlockDialog(unlocked.filter(id=>(unlockOwners[id]||(winner===null?null:players[winner].owner))===owner),owner)||!valid())return;store.busy=false;
 if(origin==='board'){if(game.bossId&&hooks.bossDone){await hooks.bossDone(game,coop);return;}returnToRoll?hooks.beforeRoll():hooks.endTurn();}else hooks.arcade();
}
// Solo run result: record the best, recruit like an arcade win (only for the human, players[0]), show one card.
async function settleSolo(game,scores,label,players,solo,cageRecruits){
 const serial=launchSerial;store.session=null;const p=players[0],score=Math.max(0,scores[0]|0),level=solo.progress?.level||0;
 const won=typeof solo.won==='boolean'?solo.won:solo.kind==='cpu'?scores[0]>scores[1]:level>0;
 recordGame(store.profile,game,won?0:null,scores);const rec=recordSolo(store.profile,game.id,{score,level});const unlocked=[];
 if(won){const pool=gameRecruitPool(game,store.profile,p),chance=recruitmentChance(store.profile,p,gameHasGuaranteedRecruit(game,store.profile,p));
  if(!cageGame(game)&&pool.length&&Math.random()<chance){const actual=recruitReward(store.profile,pick(pool).id,p.owner,'game');if(actual)unlocked.push(actual);}
  if(!cageGame(game))(store.profile.recruitDryStreak||={Sean:0,Amber:0})[p.owner]=unlocked.length?0:1;
  const heir=CHARACTERS.find(c=>c.unlockBy==='character-win'&&c.requires===p.character);if(heir){const actual=recruitReward(store.profile,heir.id,p.owner,'character');if(actual)unlocked.push(actual);}}
 if(Array.isArray(cageRecruits))for(const id of (cageRecruits[0]||[]).slice(0,10)){const actual=recruitReward(store.profile,id,p.owner,'game');if(actual&&!unlocked.includes(actual))unlocked.push(actual);}
 const milestones=updateProgression(store.profile);saveProfile(store.profile);sound(won||rec.newBest?'win':'lose');
 const cpu=solo.kind==='cpu',title=cpu?(scores[0]>scores[1]?`${p.name} beats the CPU!`:scores[0]===scores[1]?'Dead heat with the CPU':'The CPU takes it'):rec.newBest?'New personal best!':won?'Run banked':'Run over';
 const best=rec.best,bestLine=`Best: ${best.score.toLocaleString()}${best.level?` · ${best.level} cleared`:''}`;
 const html=`<div class="result-portraits"><div>${portraitHTML(p.character,'portrait mini',won||rec.newBest?'win':'sad')}<b>${escapeHTML(p.name)}</b></div>${cpu?`<div>${portraitHTML(players[1].character,'portrait mini',scores[1]>scores[0]?'win':'sad')}<b>${escapeHTML(players[1].name)}</b></div>`:''}</div><p class="solo-result"><b>${cpu?`${scores[0].toLocaleString()} – ${scores[1].toLocaleString()}`:`${score.toLocaleString()} points${level?` · ${level} cleared`:''}`}</b><br>${escapeHTML(label||'')}</p><p class="solo-best">${escapeHTML(bestLine)}${rec.newBest&&(rec.old.score||rec.old.level)?` (was ${rec.old.score.toLocaleString()})`:''}${milestones.length?`<br>New unlocks: ${escapeHTML(milestones.join(', '))}.`:''}</p>`;
 const again=await showDialog({title,source:game.source,html,choices:[{label:'Play again',value:'again',primary:true},{label:'Back to the arcade',value:'ok'}]});
 if(serial!==launchSerial)return;
 if(unlocked.length&&!await unlockDialog(unlocked,p.owner))return;
 store.busy=false;if(again==='again'){store.arcade=true;void requestGame({id:game.id,origin:'arcade',solo:true});}else hooks.arcade();
}
async function presentResult(result,players=store.run?.players){if(result.coop?.kind==='broforce'||result.bfAttempt||result.bfIntent)return showBroforceResultOnce(result,players);const game=result.gameId==='phone-task'?PHONE_TASK:gameById(result.gameId),coop=result.coop,title=coop?.kind==='boss'?(coop.won?'KNOCKOUT!':'The boss wins'):coop?.kind==='survival'?coop.won?'You survived together!':'The horde takes this night':coop?coop.tied?'A photo-finish tie':coop.won?'Your team beats the brothers!':'The brothers take this race':result.winner===null?'Honors shared':`${players[result.winner].name} takes it`;return showDialog({title,source:game.source,html:`<div class="result-portraits">${players.map((p,i)=>`<div>${portraitHTML(p.character,'portrait mini',coop?coop.tied?'silly':coop.won?'win':'sad':result.winner===null?'silly':i===result.winner?'win':'sad')}<b>${escapeHTML(p.name)}</b></div>`).join('')}</div><div class="big-result">${result.scores[0]} <span style="font-size:22px;color:#a59e8b">${coop?'+':'—'}</span> ${result.scores[1]}</div><p>${escapeHTML(result.label||game.title)}</p>${(result.unlocked||[]).map(id=>{const c=CHARACTERS.find(c=>c.id===id);return c?`<div class="recruit-result"><strong>NEW CHARACTER ADDED</strong>${portraitHTML(id,'portrait mini','win')}<b>${escapeHTML(c.name)}</b><p>Added to ${escapeHTML(result.unlockOwners?.[id]||result.unlockOwner||'both players')}’s roster · saved for future games.</p></div>`:'';}).join('')}${result.origin==='board'?`<div class="reward-delta" style="font-size:24px">${players.map((p,i)=>`${escapeHTML(p.name)} +${result.rewards[i]}`).join(' · ')}</div>`:result.origin==='dev'?'<p>DEV TEST · No XP, unlocks, or board rewards applied.</p>':'<p style="margin-top:15px">XP and collection progress saved.</p>'}${result.extra?`<div class="how-to">${escapeHTML(result.extra)}</div>`:''}`,choices:[{label:result.origin==='board'?'Back to the board':'Back to the arcade',value:'ok',primary:true}]});}
async function exitGame(){if(!store.session)return;const s=store.session;s.paused=true;
 const prog=s.solo&&s.soloProgress;if(prog&&(prog.score>0||prog.level>0)){const choice=await showDialog({title:'End your solo run?',body:`Bank ${prog.score.toLocaleString()} points${prog.level?` (${prog.level} cleared)`:''} and see how it stacks up against your best.`,choices:[{label:'Keep playing',value:'stay',primary:true},{label:'Bank & quit',value:'bank'}]});if(store.session!==s||!s.alive)return;if(choice!=='bank'){if(!s.waiting)s.paused=false;return;}s.solo.won=prog.level>0;s.finish([prog.score,0],prog.label||`${s.game.title}: solo run banked.`);return;}
 const choice=await showDialog({title:'End this challenge?',body:store.arcade?'Return to the arcade without a reward.':s.returnToRoll?'Return to the board without a reward. Your item action stays used; you can still roll.':'Return to the board without a reward. The turn passes to the other player.',choices:[{label:'Keep playing',value:'stay',primary:true},{label:'End challenge',value:'exit'}]});if(store.session!==s||!s.alive)return;if(choice!=='exit'){if(!s.waiting)s.paused=false;return;}s.dispose();store.session=null;store.busy=false;launching=false;if(store.arcade)hooks.arcade();else s.returnToRoll?hooks.beforeRoll():hooks.endTurn();}

Object.assign(exports,{cancelGameLaunch,configureLauncher,requestGame,presentResult,exitGame});
