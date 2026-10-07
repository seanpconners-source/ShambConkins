const {triviaSeconds}=require("src/engines/trivia.js");
const {initFullscreen, toggleFullscreen, fullscreenSupported, fullscreenButton, exitFullscreen}=require("src/fullscreen.js");
const {touchDiagnostic}=require("src/touchDiagnostic.js");
const {floatingHead}=require("src/headCutouts.js");
const {triviaExplanationHTML, TRIVIA_QUESTIONS}=require("src/triviaCatalog.js");
const {store, newRun, logRun}=require("src/state.js");
const {freshProfile, loadProfile, saveProfile, recruitReward, canRecruitReward, availableCharacters, rememberCollectibles, homePackTurn}=require("src/profile.js");
const {updateBoardBanter}=require("src/boardBanter.js");
const {readJSON, writeJSON, removeSaved, RUN_KEY, PROFILE_KEY, validRun}=require("src/persistence.js");
const {generateBoard, addHorrorBoard, routeOptions, evolveBoard, SPACE_TYPES, SPACE_ICONS}=require("src/board.js");
const {CHARACTERS, character, perkType, differentCharacters, characterIdentity}=require("src/characters.js");
const {location, LOCATIONS}=require("src/locations.js");
const {ITEMS, findItem, itemTag, randomItem, itemDescription, useItemEffect, pointChange, acquireItem, canUseItem, rollMovement, rollDice, settleItemInvestments, itemSupplyChoices}=require("src/items.js");
const {selectItemDrop, selectItemStock}=require("src/itemDrops.js");
const {drawEvent, applyEvent, RARE_EVENTS}=require("src/events.js");
const {showLevelCard,dismissLevelCard}=require("src/levelCard.js");
const {levelLabel,levelInfo}=require("src/levels.js");
const {showBossCard,showDragBanner,showGentlemenCard}=require("src/levelCard.js");
const {warpTransition}=require("src/warpFx.js");
const {buildWarpBoard,pickWarpId,WARP_DEFS}=require("src/warpBoards.js");
const {ensureLevelBosses,bossById,castleName}=require("src/bossGate.js");
const {GAMES, PHONE_TASK, gameById}=require("src/gameRegistry.js");
const {refitCatalog, showView, updateBoard, showDialog, resolveDialog, closeDialog, unlockDialog, toast, repaintCamera, cancelCameraAnimation, clearBoardDetailObserver, refreshPortraits}=require("src/ui.js");
const {applyTheme}=require("src/theme.js");
const {brandHTML, portraitHTML, locationArtHTML, itemArtHTML}=require("src/assets.js");
const {configureLauncher, requestGame, cancelGameLaunch, exitGame, presentResult}=require("src/gameLauncher.js");
const {sound, vibrate, audioContext, startMusic, stopMusic, setMusicZone, setMusicScene, nowPlaying}=require("src/audio.js");
const {biomeFor}=require("src/biomes.js");
const {ART}=require("src/data/art.js");
const {sceneProfile}=require("src/locationScenes.js");
// Board music follows the landmark nearest the current player (same level only).
const musicSceneCache=new Map();
function musicScene(){
 const run=store.run;if(!run?.board||store.view!=='board'||run.warp)return null;
 const n=run.board.nodes[run.players[run.current]?.node];if(!n)return null;
 const key=run.board.seed+':'+n.id;if(musicSceneCache.has(key))return musicSceneCache.get(key);
 let best=null,bestD=Infinity;
 for(const m of Object.values(run.board.nodes)){if(m.type!=='location'||m.realm!==n.realm)continue;const L=location(m.location);if(!L)continue;const d=Math.hypot((m.x||0)-(n.x||0),(m.y||0)-(n.y||0));if(d<bestD){bestD=d;best=L;}}
 const scene=best?{biome:biomeFor(best,sceneProfile(best).kind),place:best.name}:null;
 if(musicSceneCache.size>400)musicSceneCache.clear();musicSceneCache.set(key,scene);return scene;
}
setMusicScene(musicScene);
const {activatePair, drawPairTurn, applyPairTurn, pairChoiceOptions, pairMovementBonus, pairGateBonus, pairForRun}=require("src/pairs.js");
const {updateProgression}=require("src/progression.js");
const {optionView,showRoutePanel,routePanelAction}=require("src/routePanel.js");
const {journeyHint,journeyEvent,journeyStep,assignJourneys}=require("src/journeys.js");
const {resolveEncounterGame}=require("src/encounterGames.js");
const {themedGames, themedItems, themedCharacters, selectThemedEncounter, themedFortune}=require("src/references.js");
const {VERSION}=require("src/version.js");
const {pick, runRandom, wait, escapeHTML, clamp, shuffle, seededRandom}=require("src/utils.js");
const {animateDice, clearEffects, effectSnapshot, effectHTML, boardFeedback, turnFeedback, animateItemTransfers}=require("src/effects.js");
const {installViewport, queueViewportFit}=require("src/viewport.js");
const {installMedia, sourcesHTML, MEDIA_SOURCES}=require("src/media.js");
const {upgradeRunFormat}=require("src/formatMigration.js");
const {focusBoardAction}=require("src/boardCamera.js");
const {edgeObstacle,obstacleType,obstacleIsOpen,obstacleChoices,obstacleRequirement,crossObstacle,shiftObstacles,nearbyTravelTool}=require("src/obstacles.js");
const {obstacleArtHTML}=require("src/obstacleArt.js");
let movementToken=0;
let setupSelected=['sean','amber'],setupNames=['Sean','Amber'],catalogQuery='',catalogFilter='all',catalogPage=0;
const e=escapeHTML;
initFullscreen();{let refit=0;const later=()=>{clearTimeout(refit);refit=setTimeout(refitCatalog,180);};window.addEventListener('resize',later);document.addEventListener('fullscreenchange',later);document.addEventListener('webkitfullscreenchange',later);}
store.profile=loadProfile();const saved=readJSON(RUN_KEY);store.run=validRun(saved)?saved:null;if(store.run&&!store.profile.earnedUnlocks['gordon-ramsay'])for(const p of store.run.players)if(p.character==='gordon-ramsay')p.character=p.owner==='Sean'?'sean':'amber';if(store.run&&!differentCharacters(...store.run.players.map(p=>p.character))){store.run.players[1].character=availableCharacters(store.profile,'Amber').find(id=>differentCharacters(id,store.run.players[0].character))||'amber';if(!differentCharacters(...store.run.players.map(p=>p.character)))store.run.players[0].character='sean';}upgradeRunFormat(store.run);updateProgression(store.profile);
if(store.run)for(const p of store.run.players){if(p.character==='eugenia')p.character=p.owner==='Amber'?'amber':'sean';p.items=p.items.filter(id=>id!=='eugenia-pass');}
function saveRun(){rememberCollectibles(store.profile,store.run);let saved=true;if(store.run)saved=writeJSON(RUN_KEY,store.run);else removeSaved(RUN_KEY);const profileSaved=saveProfile(store.profile);if((!saved||!profileSaved)&&!store.storageNotice){store.storageNotice=true;toast('Browser storage is unavailable. Use Settings → Export backup before closing.');}}
configureLauncher({bossDone:(game,coop)=>bossDone(game,coop),journeyWin:i=>journeyNow('win',{},store.run.players[i]),save:saveRun,endTurn,beforeRoll:resumeItemTurn,arcade:()=>{store.busy=false;store.arcade=false;showCatalog('arcade');}});
const random=()=>store.run?runRandom(store.run):Math.random();
function focusEffect(before){const run=store.run;if(!run)return;const after=effectSnapshot(run),ids=[run.players[run.current].node];for(let i=0;i<2;i++)if(before?.players[i]&&JSON.stringify(before.players[i])!==JSON.stringify(after.players[i])){ids.push(run.players[i].node);if(before.players[i].node!==run.players[i].node)ids.push(before.players[i].node);}focusBoardAction(run,ids);}
function applyPreferences(){document.body.classList.toggle('reduced-motion',store.profile.settings.reducedMotion);}
function showCatalog(type){if(store.view!==type){catalogQuery='';catalogFilter='all';catalogPage=0;}showView(type,{query:catalogQuery,filter:catalogFilter,page:catalogPage});}
function home(){setMusicZone('home');if(store.profile?.settings.music)startMusic();movementToken++;cancelGameLaunch();store.session?.dispose();store.session=null;store.arcade=false;store.boardTour=null;cancelCameraAnimation();clearEffects();closeDialog();store.busy=false;saveRun();showView('home');}
function captureSetup(){setupNames=[0,1].map(i=>document.getElementById(`player-name-${i}`)?.value||setupNames[i]);}
async function startRun(){captureSetup();if(!differentCharacters(...setupSelected))return toast('Choose two different characters.');if(setupSelected.some((id,i)=>!availableCharacters(store.profile,i?'Amber':'Sean').includes(id)))return toast('Choose a character you have unlocked.');const turns=+document.getElementById('run-length').value;const theme=document.getElementById('board-theme')?.value||'Mashup',mode=document.getElementById('game-mode')?.value||'versus';const mates=[0,1].map(i=>document.getElementById(`team-mate-${i}`)?.value);if(mode==='team'&&(mates.some(id=>!id)||new Set([...setupSelected,...mates].map(characterIdentity)).size!==4))return toast('Team Relay needs four different unlocked characters.');const seed=document.getElementById('run-seed').value.trim();if(store.run&&!store.run.finished){const choice=await showDialog({title:'Start a fresh expedition?',body:'Your current run will be replaced. Every character unlock and all lifetime XP carry forward.',choices:[{label:'Start fresh',value:'yes',primary:true},{label:'Keep this run',value:'no'}]});if(choice!=='yes')return;}
 movementToken++;cancelGameLaunch();cancelCameraAnimation();store.boardTour=null;store.mapAspect=null;store.run=newRun(generateBoard(seed||undefined,turns,theme),setupNames,setupSelected,turns);store.run.mode=mode;if(mode==='horror'&&store.profile.horrorSeen){addHorrorBoard(store.run.board);store.run.horror=true;store.run.players.forEach(p=>p.node='horror-0');}store.run.raceToFinish=turns===999999&&mode!=='coop';store.run.endless=turns===999999&&mode==='coop';if(mode==='coop')store.run.mutation={remaining:999999,won:0};if(mode==='team')store.run.players.forEach((p,i)=>p.bench=mates[i]);store.profile.runs++;for(const p of store.run.players)if(perkType(p.character)==='survivor')p.shields++;
 logRun('A new route. The board has made no promises.');const pair=activatePair(store.run,store.profile);store.busy=true;focusBoardAction(store.run,store.run.players.map(p=>p.node));saveRun();setMusicZone(store.run.board.nodes[store.run.players[0].node].realm);audioContext();startMusic();if(!await playBoardIntro())return;if(pair)await introducePair(pair);store.run.players.forEach(q=>q.levelsSeen=[]);await showGentlemenCard();await announceLevel(store.run.players[0]);
}

async function playBoardIntro(){
 const run=store.run,token=movementToken,tour={run,token};store.boardTour=tour;run.camera='overview';showView('board');
 const valid=()=>store.run===run&&movementToken===token&&store.view==='board'&&store.boardTour===tour;
 await wait(store.profile.settings.reducedMotion?2400:6000);if(!valid())return false;
 const from=document.querySelector('#map-root svg')?.getAttribute('viewBox');focusBoardAction(run,run.players.map(p=>p.node));
 await repaintCamera(from,{duration:1100});if(!valid())return false;
 store.boardTour=null;store.busy=false;saveRun();updateBoard();return true;
}
async function introducePair(pair){if(!pair)return;const run=store.run;run.phase='event';run.pending={kind:'pair-intro',pair};const pending=run.pending;store.busy=true;saveRun();const choice=await showDialog({title:pair.rule.title,source:pair.rule.source,body:pair.rule.description,rare:true});if(choice===null||store.run!==run||store.view!=='board'||run.pending!==pending)return;await unlockDialog(pair.unlocked,null);if(store.run!==run||store.view!=='board'||run.pending!==pending)return;run.phase='board';run.pending=null;store.busy=false;saveRun();updateBoard(true);}
async function presentPairTurn(pending){
 const run=store.run;
 if(pending.event.effect==='choice'&&!pending.applied){
  const chosen=await showDialog({title:pending.event.title,source:pending.event.source,body:pending.event.body,html:`<div class="result-portraits">${run.players.map(p=>portraitHTML(p.character,'portrait mini','thinking')).join('')}</div>`,choices:pairChoiceOptions(run,pending.event)});
  if(chosen===null||store.run!==run||run.pending!==pending)return;
  const result=applyPairTurn(run,pending.event,store.profile,chosen);if(result.needsChoice)return presentPairTurn(pending);
  pending.result=result;pending.applied=true;if(result.acquisition)queueItemDiscovery(result.acquisition);reconcileGates(run.players[run.current]);focusEffect(pending.before);saveRun();updateBoard(true);
 }
 if(!pending.logged){logRun(pending.event.title+': '+(pending.result.message||pending.event.body));pending.logged=true;saveRun();}
 const continued=await showDialog({title:pending.event.title,source:pending.event.source,body:pending.result.message||pending.event.body,html:effectHTML(pending.before,{icon:'♥'})});
 if(continued===null||store.run!==run||run.pending!==pending)return;
 animateItemTransfers(pending.before);if(pending.result.skip){endTurn();return;}run.phase='board';run.pending=null;store.busy=false;saveRun();updateBoard(true);await roll(pending.lucky);
}

async function continueRun(){if(!store.run)return home();movementToken++;store.busy=false;focusBoardAction(store.run);updateBoard(true);const run=store.run,token=movementToken;setMusicZone(run.board.nodes[run.players[run.current].node].realm);startMusic();
 if(run.finished)return finishScreen();
 if(run.phase==='moving'){store.busy=true;updateBoard();if(run.pending?.diceAnimation){const p=run.players[run.current];const rolled=await animateDice({...run.pending.dice,name:p.name,character:p.character,valid:()=>store.view==='board'});if(!rolled)return;run.pending.diceAnimation=false;saveRun();}await moveSteps(movementToken);}
 else if(run.phase==='landing'){await resolveLanding();}
 else if(run.phase==='game'){toast('Resuming your interrupted challenge.');await requestGame({id:run.pending.gameId,resume:true});}
 else if(run.phase==='result'){store.busy=true;const pending=run.pending;await presentResult(pending);if(!encounterActive(run,pending,token))return;if(!await unlockDialog(pending.unlocked||[],pending.unlockOwner)||!encounterActive(run,pending,token))return;if(pending.returnToRoll)resumeItemTurn();else endTurn();}
 else if(run.phase==='event'){store.busy=true;const pending=run.pending;if(pending.kind==='shop')await visitShop(pending);else if(pending.kind==='pair-intro')await introducePair(pending.pair);else if(pending.kind==='pair-turn')await presentPairTurn(pending);else if(pending.kind==='boss-gate'){if(pending.stage==='intro'||pending.stage==='drag')await bossGateDrag();else{await startBoss(run.board.realms[run.bossGate.realm].boss,{forced:true});}}else if(pending.kind==='location')await visitLocation(pending.locationId);else if(pending.kind==='location-result'){if(!await unlockDialog(pending.unlocked,pending.owner)||!encounterActive(run,pending,token))return;await showDialog({title:pending.itemId?'Supplies collected':'Landmark discovered',body:pending.message,html:effectHTML(null,pending.itemId?{item:findItem(pending.itemId)}:{icon:'◆'})});if(!encounterActive(run,pending,token))return;await finishEncounter();}else await resolveEvent(pending.event,pending.applied?pending.result:null,!!pending.returnToLanding);}
}
async function roll(lucky=false){const run=store.run;if(!run||store.busy||run.phase!=='board'||run.finished)return;const p=run.players[run.current];if(p.rollCommittedTurn===run.turn||lucky&&!p.rerolls)return;focusBoardAction(run);const pair=drawPairTurn(run,random);if(pair){store.busy=true;const before=effectSnapshot(run);const result=pair.effect==='choice'?null:applyPairTurn(run,pair,store.profile);if(result?.acquisition)queueItemDiscovery(result.acquisition);reconcileGates(p);run.phase='event';run.pending={kind:'pair-turn',event:pair,result,applied:pair.effect!=='choice',lucky,before};saveRun();updateBoard(true);await presentPairTurn(run.pending);return;}store.busy=true;p.mood='thinking';run.zoom=undefined;run.pan=null;const token=++movementToken;
 const {faces,base,note}=rollDice(p,lucky,random);if(lucky)p.rerolls--;const bonus=pairMovementBonus(run)+(p.character==='kc'?1:p.character==='mylo'?(random()<.2?-1:2):0),steps=rollMovement(p,base,bonus);p.rollCommittedTurn=run.turn;
 run.lastRoll=steps;run.phase='moving';run.pending={kind:'move',left:steps,base,dice:{faces,base,steps,note},diceAnimation:true};logRun(`${p.name} rolled ${faces.length>1?`${faces.join(' and ')}, kept ${base}`:base}${steps!==base?` → ${steps} with effects`:''}${note?' · '+note:''}.`);saveRun();updateBoard();sound('roll');
 const visible=await animateDice({...run.pending.dice,name:p.name,character:p.character,valid:()=>token===movementToken});if(!visible||token!==movementToken)return;run.pending.diceAnimation=false;saveRun();vibrate(16);await moveSteps(token);
}
function queueItemDiscovery(found){if(found?.item?.kind!=='transform')return;store.run.itemDiscoveries ||= [];store.run.itemDiscoveries.push({itemId:found.item.id,message:found.message,unlocked:[...found.unlocked],owner:found.owner});toast(found.message);}
async function presentItemDiscoveries(){const run=store.run,token=movementToken;while(run.itemDiscoveries?.length){const found=run.itemDiscoveries[0];saveRun();if(!await unlockDialog(found.unlocked,found.owner)||store.run!==run||movementToken!==token)return;await showDialog({title:'A suspiciously familiar disguise',source:findItem(found.itemId)?.source,body:found.message,html:`<div class="dialog-icon">${itemArtHTML(findItem(found.itemId))}</div>`});if(store.run!==run||movementToken!==token)return;run.itemDiscoveries.shift();saveRun();}}
function reportJourney(messages){for(const m of messages||[]){logRun(m);toast(m);}}
function journeyNow(kind,detail,player=null){const run=store.run;if(!run)return;const p=player||run.players[run.current];reportJourney(journeyEvent(run,p,kind,detail));}
function awardGate(p,n){if(n.type!=='gate'||p.cleared.includes(n.realm)||String(n.realm).startsWith('warp'))return;const before=effectSnapshot();p.cleared.push(n.realm);const dividend=p.gateDividend||0;p.gateDividend=0;p.points+=4+dividend;pairGateBonus(store.run,p);store.profile.xp+=8;if(p.character==='amber')p.rerolls++;if(p.character==='loki')p.shields++;if(perkType(p.character)==='survivor'&&!p.shields)p.shields++;if(perkType(p.character)==='scavenger'&&p.cleared.length>1){const found=acquireItem(store.run,store.profile,p,randomItem(random,{player:p,profile:store.profile}));queueItemDiscovery(found);}logRun(`${p.name} cleared ${n.realm.toUpperCase()}. +${4+dividend} points, +8 XP${dividend?' (includes saved gate dividend)':''}.`);toast(`${p.name} cleared ${n.realm.toUpperCase()} · +${4+dividend} points · +8 XP`);if(!store.run.endless&&(n.realm==='spirit'&&!store.run.horror||n.realm==='horror')){p.finishedPlayer=true;p.points+=8;if(store.run.raceToFinish&&store.run.raceWinner===undefined)store.run.raceWinner=store.run.players.indexOf(p);}boardFeedback(before,{title:n.realm.toUpperCase()+' cleared',icon:'✦'});animateItemTransfers(before);}
function reconcileGates(p){for(const id of [...p.visited,p.node]){const node=store.run.board.nodes[id];if(node)awardGate(p,node);}normalizePocketOwner();}
function normalizePocketOwner(){const run=store.run;if(run.upsideDown){const index=run.players.findIndex(p=>run.board.nodes[p.node]?.realm==='upside-down');if(index>=0)run.upsideDown.owner=index;else run.upsideDown=null;}}
function takeRoute(player,target){const route=target.route;if(!route||route.safe===true)return;const run=store.run,key=route.entry+':'+(player.laps||0);player.routeChoices ||= [];if(player.routeChoices.includes(key))return;player.routeChoices.push(key);if(route.cost)pointChange(player,-route.cost,false);if(route.points)player.points+=route.points;if(route.trap)pointChange(player,player.cloak?0:-route.trap);player.boost+=route.boost||0;player.slowAfterRoll=(player.slowAfterRoll||0)+(route.slow||0);player.shields+=route.shield||0;player.rerolls+=route.reroll||0;if(route.item&&findItem(route.item)){const found=acquireItem(run,store.profile,player,route.item);queueItemDiscovery(found);}logRun(player.name+' chose '+route.name+'. '+route.reward+' '+route.risk);}
async function stepTarget(run,p,token){
 const pending=run.pending,options=routeOptions(run,p.node);if(!options.length)return null;
 let target=options.find(n=>n.id===pending.routeDecision?.targetId)||options[0];
 if(options.length>1&&!pending.routeDecision){
  p.mood='thinking';focusBoardAction(run,[p.node,...options.map(n=>n.id)]);updateBoard();
  const from=run.board.nodes[p.node],ahead=(n,k)=>{const ids=[];let cur=n;for(let i=0;i<k&&cur;i++){ids.push(cur.id);cur=run.board.nodes[cur.next[0]];}return ids;};
  focusBoardAction(run,[p.node,...options.flatMap(n=>ahead(n,7))]);updateBoard();
  const views=options.map((n,i)=>{const o=edgeObstacle(run,p.node,n.id),solutions=o?obstacleChoices(run,p,o).filter(c=>!c.disabled):[],bridge=from.bridge===n.id,lane=run.board.realms[n.realm]?.lanes?.find(l=>l.ids.includes(n.id));
   const label=bridge?`Bridge to ${lane?.name||'the next road'}`:(n.route?.name||n.pathName)||(o?obstacleType(o).name:'Main road · '+(run.board.realms[n.realm]?.title||SPACE_TYPES[n.type]));
   const detail=bridge?'An optional crossing to the neighbouring road. You keep moving forward.':n.route?`${n.route.reward} ${n.route.risk}`:'Standard encounters ahead.';
   return optionView(run,from,{id:n.id,value:n.id,label,sub:`${n.route?.spaces||n.pathRemaining?(n.route?.spaces||n.pathRemaining)+' spaces · ':''}${detail} ${o?obstacleRequirement(run,p,o):''}`.trim(),journey:journeyHint(run,p,n,from),disabled:!!o&&!solutions.length},i);});
  const choice=await showRoutePanel({title:'Choose your road',hint:'Tap a road to light it up on the map, then GO.',options:views});
  if(choice===null||token!==movementToken||store.run!==run)return null;
  target=options.find(n=>n.id===choice)||options[0];pending.routeDecision={from:p.node,targetId:target.id,applied:false};saveRun();
 }
 const o=edgeObstacle(run,p.node,target.id);if(o){
  const d=pending.routeDecision||{from:p.node,targetId:target.id,applied:false};pending.routeDecision=d;
  focusBoardAction(run,[o.from,o.to]);updateBoard();
  if(!d.applied&&obstacleIsOpen(run,o)){d.result=crossObstacle(run,p,o,'open');d.applied=true;saveRun();}
  if(!d.applied){
   saveRun();const solutions=obstacleChoices(run,p,o);
   const chosen=await showDialog({title:obstacleType(o).name,source:obstacleType(o).source,body:obstacleType(o).hint+' Choose how to pass. Carried equipment is reusable; crew repairs and most tools open the path for both players.',html:obstacleArtHTML(run,o),choices:[...solutions.map(c=>({label:c.itemId?`Use ${findItem(c.itemId)?.name||'carried tool'}`:c.label,sub:c.sub,art:c.itemId?itemArtHTML(findItem(c.itemId)):'',value:c.id,disabled:c.disabled,primary:!c.disabled&&c===solutions[0]})),{label:'Take the free main road',value:'main'}]});
   if(chosen===null||token!==movementToken||store.run!==run)return null;
   if(chosen==='main'){delete pending.routeDecision;saveRun();return options[0];}
   const result=crossObstacle(run,p,o,chosen);if(result.blocked){delete pending.routeDecision;saveRun();toast(result.message);return options[0];}
   d.result=result;d.applied=true;logRun(result.message);saveRun();updateBoard();sound('card');
  }
  if(d.result.choiceId!=='open'){const continued=await showDialog({title:'A way through',source:obstacleType(o).source,body:d.result.message,html:obstacleArtHTML(run,o),choices:[{label:'Cross the path',value:'cross',primary:true}]});
  if(continued===null||token!==movementToken||store.run!==run)return null;}
 }
 const before=effectSnapshot();takeRoute(p,target);animateItemTransfers(before);return target;
}
async function announceLevel(p){
 const run=store.run;if(!run||!p)return;const realm=run.board.nodes[p.node]?.realm;if(!realm||String(realm).startsWith('warp'))return;
 if(!p.levelsSeen){p.levelsSeen=[realm,...(p.cleared||[])];return;}
 if(p.levelsSeen.includes(realm))return;
 p.levelsSeen.push(realm);run.levelAnnounced||=[];const first=!run.levelAnnounced.includes(realm);if(first)run.levelAnnounced.push(realm);
 // Anyone standing in the same new level at the same moment arrives together.
 for(const q of run.players)if(q!==p&&q.levelsSeen&&run.board.nodes[q.node]?.realm===realm&&!q.levelsSeen.includes(realm))q.levelsSeen.push(realm);
 logRun(`${p.name} enters ${levelLabel(realm)}.`);setMusicZone(realm);saveRun();
 await showLevelCard(realm,{who:p.name,first});
}

// ------------------------------------------------------------ warp zones and bosses
async function enterWarpZone(pipe=null){
 const run=store.run,token=movementToken,id=pickWarpId(run,random),def=WARP_DEFS[id],boss=bossById(def.bossId);
 const choice=await showDialog({title:'A warp pipe!',source:def.source,rare:true,body:`${def.title}. ${def.intro} You will both be warped there.${boss?` ${boss.name} guards the castle at the end, and beating them unlocks a new character.`:''}`,choices:[{label:`Jump in · ${def.title}`,value:'go',primary:true},{label:'Walk on by',value:'no'}]});
 if(choice===null||store.run!==run||token!==movementToken)return;
 if(choice!=='go'){if(pipe){(pipe.warpDeclined||=[]).push(run.current);saveRun();}await finishEncounter();return;}
 if(pipe)pipe.warpUsed=true;
 const board=buildWarpBoard(id,`${run.seed}:${run.turn}`);if(boss)board.warp.bossName=boss.name;
 run.warpsVisited=[...(run.warpsVisited||[]),id];run.warp={id,returns:run.players.map(q=>q.node),bossId:def.bossId};
 logRun(`The party warps to ${def.title}.`);saveRun();
 await warpTransition(()=>{run.mainBoard=run.board;run.savedTraps=run.traps;run.traps=[];run.board=board;for(const q of run.players){q.warpVisited=q.visited;q.visited=[];q.node=board.realms.warp.start;}run.camera='follow';run.pan=null;focusBoardAction(run,run.players.map(q=>q.node));updateBoard(true);},{title:def.title,subtitle:def.intro,icon:def.icon});
 if(store.run!==run)return;setMusicZone('warp-'+id);saveRun();await finishEncounter();
}
async function exitWarpZone(){
 const run=store.run,w=run.warp;if(!w)return;
 await warpTransition(()=>{run.board=run.mainBoard;delete run.mainBoard;run.players.forEach((q,i)=>{q.node=w.returns[i]&&run.board.nodes[w.returns[i]]?w.returns[i]:run.board.realms.mind.start;q.visited=q.warpVisited||[];delete q.warpVisited;});run.traps=run.savedTraps||[];delete run.savedTraps;run.warp=null;run.camera='follow';run.pan=null;focusBoardAction(run,run.players.map(q=>q.node));updateBoard(true);},{title:'Back on the map',subtitle:'The party returns from the warp zone.',icon:'🌀'});
 if(store.run!==run)return;setMusicZone(run.board.nodes[run.players[run.current].node].realm);saveRun();store.busy=false;endTurn();
}
async function warpJump(p,token){
 const n=run_node(p);if(!n?.jump||store.run.board.format!=='warp')return;
 const to=store.run.board.nodes[n.jump];if(!to)return;const up=to.col>n.col;
 toast(up?'A ladder! Climb!':'A chute! Wheee!');sound(up?'win':'lose');await wait(550);if(token!==movementToken)return;
 p.visited.push(p.node);p.node=to.id;focusBoardAction(store.run);saveRun();updateBoard();await wait(450);
}
const run_node=p=>store.run.board.nodes[p.node];
async function startBoss(bossId,{level=null,forced=false}={}){
 const run=store.run,boss=bossById(bossId);if(!boss){if(run.bossGate)await advanceAfterBoss();else await finishEncounter();return;}
 const warp=!!run.warp,lair=castleName(boss);
 const choices=forced?[{label:'Fight together!',value:'fight',primary:true}]:[{label:'Fight together!',value:'fight',primary:true},{label:warp?'Flee to the map':'Sneak past',value:'flee'}];
 const choice=await showDialog({title:`${boss.name} · ${boss.epithet||'Boss'}`,source:boss.source,rare:true,body:`${warp?'You reach the end of the warp zone.':'The level is over, but '+lair+' blocks the way forward.'} Fight together, win together: beat ${boss.name} to unlock a new character.`,html:`<div class="boss-intro"><span class="boss-icon">${e(boss.icon||'👹')}</span><b>${e(lair)}</b></div>`,choices});
 if(choice===null||store.run!==run)return;
 if(choice!=='fight'){if(warp){await exitWarpZone();}else await finishEncounter();return;}
 await requestGame({id:'boss-'+boss.id,origin:'board'});
}
// A level gate with a boss that has not been fought yet this run.
function bossGateReady(run,n){
 if(run.mutation||run.endless||run.board.format==='warp'||!['mind','body','spirit','horror'].includes(n.realm))return false;
 if((run.bossesSeen||{})[n.realm])return false;ensureLevelBosses(run);const id=run.board.realms[n.realm]?.boss;return !!(id&&gameById('boss-'+id));
}
function shortestPath(run,from,to){
 const prev=new Map([[from,null]]),queue=[from];
 while(queue.length){const id=queue.shift();if(id===to)break;for(const next of run.board.nodes[id]?.next||[])if(!prev.has(next)){prev.set(next,id);queue.push(next);}}
 if(!prev.has(to))return null;const path=[];for(let id=to;id&&id!==from;id=prev.get(id))path.unshift(id);return path;
}
// The first player through a level gate wins the level. Everyone else is dragged to
// the castle along the most direct road, paying half a point per space, then the boss arrives.
async function levelEndBoss(p,gate){
 const run=store.run,realm=gate.realm,boss=bossById(run.board.realms[realm].boss);
 run.bossesSeen||={};run.bossesSeen[realm]=true;run.bossGate={gate:gate.id,realm,winner:run.players.indexOf(p)};
 run.phase='event';run.pending={kind:'boss-gate',stage:'intro'};saveRun();
 logRun(`${p.name} wins ${levelLabel(realm)}.`);sound('win');p.mood='win';updateBoard();
 await showDialog({title:`${p.name} wins ${levelLabel(realm)}!`,source:'ShambConkins',rare:true,body:`${p.name} reached the end of the level first. Everyone else gets dragged to the castle: half a point for every space.`,html:`<div class="result-portraits">${portraitHTML(p.character,'portrait mini','win')}</div>`});
 if(store.run!==run)return;
 await bossGateDrag();
}
async function bossGateDrag(){
 const run=store.run,bg=run.bossGate,gate=run.board.nodes[bg.gate];
 run.pending={kind:'boss-gate',stage:'drag'};saveRun();
 for(const q of run.players){
  if(q.node===gate.id)continue;
  const path=shortestPath(run,q.node,gate.id)||[gate.id];let lost=0;q.mood='sad';
  const banner=showDragBanner(q.name,path.length);
  for(const [i,id] of path.entries()){
   if(store.run!==run){banner.close();return;}
   q.visited.push(q.node);q.node=id;const before=q.points;q.points=Math.max(0,Math.round((q.points-.5)*10)/10);lost+=before-q.points;
   banner.update(i+1,lost);run.focusNodes=[id];run.camera='follow';run.pan=null;updateBoard();sound('tick');
   await wait(store.profile.settings.reducedMotion?60:Math.max(140,420-path.length*12));
  }
  banner.close();logRun(`${q.name} was dragged ${path.length} spaces to the boss (−${Math.round(lost*10)/10}).`);
  q.cleared.includes(gate.realm)||q.cleared.push(gate.realm);
  await wait(400);
 }
 focusBoardAction(run,run.players.map(q=>q.node));updateBoard();
 run.pending={kind:'boss-gate',stage:'fight'};saveRun();
 const boss=bossById(run.board.realms[bg.realm].boss);
 await showBossCard(boss);if(store.run!==run)return;
 await startBoss(boss.id,{level:bg.realm,forced:true});
}
// After a level boss: everyone moves on to the next level together.
async function advanceAfterBoss(){
 const run=store.run,bg=run.bossGate;if(!bg){endTurn();return;}run.bossGate=null;
 const gate=run.board.nodes[bg.gate],next=(gate.next||[]).find(id=>run.board.nodes[id]),final=bg.realm==='horror'||(bg.realm==='spirit'&&!run.horror)||!next;
 for(const q of run.players){q.mood='happy';if(!q.cleared.includes(bg.realm))q.cleared.push(bg.realm);}
 if(final){for(const q of run.players)if(!q.finishedPlayer){q.finishedPlayer=true;}saveRun();store.busy=false;endTurn();return;}
 for(const q of run.players){q.visited.push(q.node);q.node=next;}
 run.phase='board';run.pending=null;focusBoardAction(run,run.players.map(q=>q.node));saveRun();updateBoard(true);setMusicZone(run.board.nodes[next].realm);
 const lead=run.players[bg.winner]||run.players[0];await announceLevel(lead);for(const q of run.players)await announceLevel(q);
 store.busy=false;endTurn();
}
async function bossDone(game,coop){
 const run=store.run;if(!run)return;store.busy=false;
 if(coop?.won){(run.bossesBeaten||=[]).push(game.bossId);logRun(`${bossById(game.bossId)?.name||'The boss'} was defeated together.`);saveRun();if(run.warp)await exitWarpZone();else if(run.bossGate)await advanceAfterBoss();else endTurn();return;}
 const level=!!run.bossGate&&!run.warp;
 const again=await showDialog({title:'The boss wins this round',source:game.source,body:level?'You are both flattened. Fight again, or limp on to the next level (−3 points each)?':'You are both flattened. Fight again, or retreat?',choices:[{label:'Fight again',value:'again',primary:true},{label:run.warp?'Retreat to the map':level?'Limp on (−3 each)':'Retreat',value:'no'}]});
 if(store.run!==run)return;
 if(again==='again'){store.busy=true;await requestGame({id:game.id,origin:'board'});return;}
 if(run.warp)await exitWarpZone();else if(level){for(const q of run.players)q.points=Math.max(0,q.points-3);await advanceAfterBoss();}else endTurn();
}
async function moveSteps(token){
 const run=store.run,p=run.players[run.current];p.mood='walking';
 while(run.pending?.left>0&&token===movementToken){
  const target=await stepTarget(run,p,token);if(token!==movementToken||store.run!==run)return;if(!target){if(routeOptions(run,p.node).length){store.busy=false;saveRun();return;}run.pending.left=0;break;}
  p.mood='walking';p.visited.push(p.node);reportJourney(journeyStep(run,p,p.node,target));const fromRealm=run.board.nodes[p.node]?.realm;p.node=target.id;run.pending.left--;delete run.pending.routeDecision;awardGate(p,target);setMusicZone(target.realm);focusBoardAction(run);saveRun();updateBoard();sound('tap');if(target.type==='gate'&&bossGateReady(run,target)){run.pending.left=0;await levelEndBoss(p,target);return;}if(target.type==='warp'&&!target.warpUsed&&!(target.warpDeclined||[]).includes(run.current)&&run.pending.left>0){run.pending.left=0;toast('A warp pipe! Stop and look inside?');break;}if(target.realm!==fromRealm&&!p.finishedPlayer){await announceLevel(p);if(token!==movementToken||store.run!==run)return;}if(p.finishedPlayer){run.pending.left=0;break;}await wait(store.profile.settings.reducedMotion?35:270);
 }
 if(token!==movementToken)return;await warpJump(p,token);if(token!==movementToken)return;p.mood='happy';run.phase='landing';run.pending={kind:'landing'};focusBoardAction(run);saveRun();store.busy=false;updateBoard();await resolveLanding();
}

async function resolveLanding(){const run=store.run,token=movementToken;if(!run||run.finished)return;store.busy=true;const p=run.players[run.current],n=run.board.nodes[p.node];focusBoardAction(run);updateBoard();reconcileGates(p);if(n.type==='trivia')journeyNow('trivia');else if(n.type==='item')journeyNow('item');if(run.itemDiscoveries?.length)await presentItemDiscoveries();if(store.run!==run||movementToken!==token)return;const trap=run.traps?.findIndex(t=>t.node===p.node&&t.owner!==run.current);if(trap>=0){const damage=run.traps[trap].damage||5;run.traps.splice(trap,1);const r=pointChange(p,p.cloak?0:-damage);toast(r.blocked?'A shield blocked the trap.':r.delta?`Trap · ${r.delta} points`:'Your cloak avoided a trap.');}
 // The home pack is an early encounter, never an instant starter unlock.
 if(run.turn>=homePackTurn(run)&&(!store.profile.shared.includes('kc')||!store.profile.shared.includes('mylo'))){await resolveEvent({id:'early-dogs',title:'Something is barking offscreen',source:'Home',body:'KC and Mylo join the shared roster. Then you continue the space you landed on.',effect:'dogs'},null,true);return;}
 if(p.finishedPlayer){await showDialog({title:'The end of your route',source:'ShambConkins',body:run.raceToFinish?`${p.name} is first to the final camp and wins the race! +8 finish bonus.`:`${p.name} reaches the final camp. +8 finish bonus. The other player can still complete their journey.`,choices:[{label:'Continue',value:'ok',primary:true}]});if(store.run!==run||movementToken!==token)return;endTurn();return;}
 switch(n.type){
  case 'game':case 'minigame':case 'classic':await requestGame();break;
  case 'casino':await requestGame({filter:'casino'});break;
  case 'trivia':await requestGame({filter:'trivia'});break;
  case 'task':await requestGame({filter:'taskmaster'});break;
  case 'dice':await requestGame({id:'full-shambyahtzee'});break;
  case 'shop':await visitShop();break;
  case 'event':await resolveEvent(drawEvent(run,store.profile,random));break;
  case 'location':await visitLocation(n.location);break;
  case 'item':{const before=effectSnapshot(run);const cacheRandom=Number.isFinite(n.cacheSeed)?seededRandom(n.cacheSeed+':'+(n.cacheVisits||0)):random,tool=run.board.obstacles?.length&&(p.travelFinds||0)<2?nearbyTravelTool(run,p,cacheRandom):null,it=tool||randomItem(cacheRandom,{player:p,profile:store.profile}),found=acquireItem(run,store.profile,p,it);if(tool)p.travelFinds=(p.travelFinds||0)+1;n.cacheVisits=(n.cacheVisits||0)+1;logRun(`${p.name}: ${found.message}`);run.phase='event';run.pending={kind:'location-result',message:found.message,unlocked:found.unlocked,owner:found.owner};saveRun();if(found.unlocked.length){sound('unlock');if(!await unlockDialog(found.unlocked,found.owner)||store.run!==run||movementToken!==token)return;}const answer=await showDialog({title:'A useful find',source:it.source,body:found.message,html:`${effectHTML(before,{item:it})}<h3 style="text-align:center">${e(it.name)}</h3><div class="how-to">${e(itemDescription(it))}</div>`,choices:foundChallengeChoices(it)});if(store.run!==run||movementToken!==token)return;animateItemTransfers(before);if(answer==='play')return playFoundChallenge(p,it);await finishEncounter();break;}
  case 'bonus':case 'penalty':{const before=effectSnapshot(run);const fortune=themedFortune(n.type,random),delta=n.type==='bonus'?4:p.cloak?0:-3,r=pointChange(p,delta);logRun(`${p.name}: ${r.blocked?'penalty shield used':(r.delta>=0?'+':'')+r.delta+' points'}.`);run.phase='event';run.pending={kind:'location-result',message:r.blocked?'Your shield took the hit.':`${r.delta>=0?'+':''}${r.delta} points.`,unlocked:[]};saveRun();await showDialog({title:fortune.title,source:fortune.source,body:r.blocked?'Your shield took the hit.':fortune.body,html:`${effectHTML(before,{icon:r.delta<0?'⚡':'✦'})}<div class="reward-delta ${r.delta<0?'bad':''}">${r.delta>=0?'+':''}${r.delta}</div>`});if(store.run!==run||movementToken!==token)return;await finishEncounter();break;}
  case 'warp':if(n.warpUsed||(n.warpDeclined||[]).includes(run.current)){await finishEncounter();break;}await enterWarpZone(n);break;
  case 'gate':if(run.board.format==='warp'){await startBoss(run.board.warp.bossId);break;}await finishEncounter();break;
  case 'start':default:await finishEncounter();break;
 }
}
async function resolveEvent(event,existingResult=null,returnToLanding=false){const run=store.run,token=movementToken;let pending;run.phase='event';pending=run.pending={kind:'event',event,applied:!!existingResult,result:existingResult,returnToLanding};const valid=()=>encounterActive(run,pending,token);saveRun();if(event.question&&!existingResult){const question=event.question;const answer=await showDialog({title:event.title+' · '+question.difficulty.toUpperCase(),source:event.source,body:question.q,seconds:triviaSeconds(question.difficulty),choices:shuffle(question.answers.map((label,i)=>({label,value:i,primary:false})),random)});if(answer===null||!valid())return;event={...event,question:null,answeredQuestion:question,e:['points',answer===question.correct?2:0],body:answer===question.correct?'Correct! +2 points.':(answer==='timeout'?'Time’s up! ':'')+'The answer was '+question.answers[question.correct]+'.'};if(question.id){run.triviaSeen=[...(run.triviaSeen||[]).filter(id=>id!==question.id),question.id].slice(-TRIVIA_QUESTIONS.length);store.profile.recentTrivia=[...store.profile.recentTrivia.filter(id=>id!==question.id),question.id].slice(-TRIVIA_QUESTIONS.length);saveProfile(store.profile);}run.pending.event=event;saveRun();}const continued=await showDialog({title:event.title,source:event.source,body:event.body,html:event.answeredQuestion?triviaExplanationHTML(event.answeredQuestion):event.rare?`<div class="event-reaction">${portraitHTML(run.players[run.current].character,'portrait big',event.effect==='large'?'silly':event.effect==='upside'?'sad':'angry')}</div>`:'',rare:event.rare,choices:[{label:existingResult?'Continue':'Resolve encounter',value:'ok',primary:true}]});if(continued===null||!valid())return;const before=effectSnapshot(run);const result=existingResult||applyEvent(run,store.profile,event,random);run.players[run.current].mood=/lost|lose|paid|stole|trap|slow|penalty/i.test(result.message)?'sad':'happy';reconcileGates(run.players[run.current]);if(event.e?.[0]==='horror')run.players[run.current].finishedPlayer=false;
 logRun(`${event.title}: ${result.message}`);pending=run.pending={kind:'event',event,applied:true,result,returnToLanding};focusEffect(before);saveRun();updateBoard();boardFeedback(before,{title:event.title,icon:event.rare?'✧':'✦'});if(result.unlocked?.length){sound('unlock');for(const id of result.unlocked){if(!await unlockDialog([id],result.unlockOwners?.[id]??(['dogs'].includes(event.effect)||event.e?.[0]==='unlockDogs'?null:run.players[run.current].owner))||!valid())return;}if(result.acquisitions?.some(found=>found.item?.kind==='transform'))await showDialog({title:event.title,source:event.source,body:result.message,html:effectHTML(before,{item:result.item})});}
 else await showDialog({title:event.title,source:event.source,body:result.message,html:effectHTML(before,{icon:event.rare?'✧':'✦'}),rare:event.rare});
 if(!valid())return;animateItemTransfers(before);await announceLevel(run.players[run.current]);if(!valid())return;if(returnToLanding){run.phase='landing';run.pending={kind:'landing'};saveRun();await resolveLanding();}else if(result.game)await requestGame({id:result.game.id});else if(result.roulette)await requestGame({filter:event.e?.[0]==='casino'?'casino':event.e?.[0]==='classic'?'arcade':'all'});else if(result.task)await requestGame({filter:'taskmaster'});else await finishEncounter();
}
function locationVisitors(l,p){
 const owned=availableCharacters(store.profile,p.owner),owner=l.id==='parents'?null:p.owner,reason=l.id==='unlimited-savory-lab'?'lab':l.realm==='horror'?'horror':'encounter';
 let ids=l.characters.filter(id=>canRecruitReward(store.profile,id,owner,reason));
 if(!ids.length)ids=themedCharacters(l.source,{owned}).filter(c=>canRecruitReward(store.profile,c.id,owner)).map(c=>c.id);
 if(!ids.length&&l.source==='Home'&&l.id!=='parents'){
  const identities=new Set();ids=CHARACTERS.filter(c=>{const identity=characterIdentity(c.id);if(identities.has(identity)||!canRecruitReward(store.profile,c.id,owner))return false;identities.add(identity);return true;}).map(c=>c.id);
 }
 return {ids,owner,reason};
}
async function visitLocation(id){
 const run=store.run,token=movementToken,p=run.players[run.current],l=location(id);if(!l)return finishEncounter();run.phase='event';const pending=run.pending={kind:'location',locationId:id};saveRun();
 const game=pick(themedGames(l.source),random)||GAMES.find(g=>l.id==='parents'&&g.engine==='snake'),visitors=locationVisitors(l,p);
 const choices=[{label:visitors.ids.length?'Meet a visitor · unlock a character':'Catch up with a visitor · +3 points',sub:visitors.ids.length?`A new character joins ${visitors.owner===null?'both players’ shared roster':p.owner+'’s roster'}.`:'All available visitors here are already in your roster. Earn 3 points.',value:'recruit',primary:true},{label:'Search for supplies · get an item',sub:'Find one item for your bag. Inspect it and use it before a later roll.',value:'supplies'}];
 if(game)choices.push({label:`Play ${game.title}`,sub:'Start a minigame for both players.',value:'game'});
 const before=effectSnapshot(run),choice=await showDialog({title:l.name,source:l.source,body:l.description,html:locationArtHTML(l),choices});if(choice===null||!encounterActive(run,pending,token))return;
 if(!store.profile.locations.includes(id)){store.profile.locations.push(id);store.profile.xp+=5;}p.points+=perkType(p.character)==='explorer'||p.character==='sean'?4:3;logRun(`${p.name} discovered ${l.name}.`);journeyNow('landmark');if(choice==='game'){saveRun();return requestGame({id:game.id});}
 const unlocked=[];let message='',item=null;
 if(choice==='recruit'){
  const {ids,owner,reason}=locationVisitors(l,p),actual=ids.length?recruitReward(store.profile,pick(ids,random),owner,reason,random):null;
  if(actual){unlocked.push(actual);message=`${character(actual).name} joins ${owner===null?'the shared roster':p.owner+'’s roster'}. Select them on your next expedition.`;}
  else{p.points+=3;message='You caught up with a familiar visitor. All available characters here are already recruited. +3 points.';}
 }else{item=selectItemDrop(themedItems(l.source),{random,player:p,profile:store.profile})||randomItem(random,{player:p,profile:store.profile});const found=acquireItem(run,store.profile,p,item);unlocked.push(...found.unlocked);message=found.message;}
 run.pending={kind:'location-result',locationId:id,message,unlocked,owner:visitors.owner,itemId:item?.id};saveRun();
 if(unlocked.length){if(!await unlockDialog(unlocked,visitors.owner)||store.run!==run||movementToken!==token)return;}
 const answer=!unlocked.length||item?await showDialog({title:item?'Supplies collected · '+item.name:'Visitor met',source:l.source,body:message,html:effectHTML(before,item?{item}:{icon:'◆'})+(item?`<div class="how-to">${e(itemDescription(item))}</div>`:''),choices:foundChallengeChoices(item)}):null;
 if(store.run!==run||movementToken!==token)return;animateItemTransfers(before);if(answer==='play')return playFoundChallenge(p,item);await finishEncounter();
}

// A challenge item found on a landing says it starts a minigame, so offer to play it right
// here; otherwise it waits in the bag for a later pre-roll use.
function foundChallengeGame(it){return it&&['game','duel'].includes(it.kind)?resolveEncounterGame(it.value,{source:it.source,itemId:it.id}):null;}
function foundChallengeChoices(it){const g=foundChallengeGame(it);return g?[{label:`Play ${g.title} now`,sub:'Uses the item. Both players play right away.',value:'play',primary:true},{label:'Keep it in my bag',sub:'Use it before a later roll instead.',value:'keep'}]:undefined;}
function playFoundChallenge(p,it){const g=foundChallengeGame(it),i=p.items.lastIndexOf(it.id);if(i>=0)p.items.splice(i,1);if(!store.profile.itemsSeen.includes(it.id))store.profile.itemsSeen.push(it.id);logRun(`${p.name} used ${it.name} on the spot: ${g.title}.`);saveRun();updateBoard();return requestGame({id:g.id});}
async function visitShop(existing=null){const run=store.run,token=movementToken,before=effectSnapshot(run),p=run.players[run.current],source=run.board.nodes[p.node].source||'Quark’s';const pending=existing||{kind:'shop',stock:selectItemStock(themedItems(source).length>=3?themedItems(source):ITEMS,{random,player:p,profile:store.profile,recent:run.shopItemOffers||[]},3).map(it=>({id:it.id,price:it.kind==='gear'?7:it.kind==='game'?6:4})),applied:false};if(!existing)run.shopItemOffers=[...(run.shopItemOffers||[]),...pending.stock.map(it=>it.id)].slice(-24);run.phase='event';run.pending=pending;saveRun();if(!pending.applied){const chosen=await showDialog({sheet:true,title:'Quark’s shop',source:'Star Trek',body:`${p.name} has ${p.points} points. Buy one item for your bag and use it before a later roll.`,choices:[...pending.stock.map((entry,i)=>{const it=findItem(entry.id),short=p.points<entry.price;return {label:it.name,tag:itemTag(it),sub:itemDescription(it),art:itemArtHTML(it),badge:short?`Need ${entry.price}`:`${entry.price} pts`,disabled:short,value:i};}),{label:'Keep walking',value:'leave',primary:true}]});if(chosen===null||!encounterActive(run,pending,token))return;if(Number.isInteger(chosen)){const entry=pending.stock[chosen];if(p.points>=entry.price){p.points-=entry.price;const found=acquireItem(run,store.profile,p,entry.id);pending.unlocked=found.unlocked;pending.owner=found.owner;pending.boughtId=entry.id;sound('card');pending.message=`Bought ${findItem(entry.id).name} for ${entry.price} points. ${found.message}`;logRun(p.name+': '+pending.message);}else pending.message='Not enough points. Quark has declined your very reasonable explanation.';}else pending.message='You kept your points and your dignity.';pending.applied=true;saveRun();}if(pending.unlocked?.length&&!pending.unlockShown){await unlockDialog(pending.unlocked,pending.owner);if(!encounterActive(run,pending,token))return;pending.unlockShown=true;saveRun();}updateBoard();if(pending.boughtId)boardFeedback(before,{title:'Quark’s shop',item:findItem(pending.boughtId)});toast(pending.message);if(store.run!==run||movementToken!==token)return;animateItemTransfers(before);await finishEncounter();}


function encounterActive(run,pending,token){return store.run===run&&run.pending===pending&&movementToken===token;}
async function finishEncounter(){const run=store.run;run.roundsWithoutGame++;saveRun();if(run.roundsWithoutGame>=3&&!run.players[run.current].finishedPlayer){logRun('Three turns without a challenge: a nearby minigame opens after this encounter.');await requestGame({filter:pairForRun(run)?.taskCadence?'taskmaster':'all'});}else endTurn();}
function endTurn(){const run=store.run;if(!run||run.finished)return;const p=run.players[run.current];if(!['win','sad'].includes(p.mood))p.mood='normal';if(p.large&&p.largeStart<run.turn)p.large--;if(p.cloak)p.cloak--;if(p.pairCrowCooldown){p.slow++;p.pairCrowCooldown=false;}if(run.mode==='team'&&p.bench)[p.character,p.bench]=[p.bench,p.character];if(run.upsideDown&&run.upsideDown.owner===run.current&&run.upsideDown.startTurn<run.turn){run.upsideDown.turns--;if(!run.upsideDown.turns){p.node=run.upsideDown.returnNode;run.upsideDown=null;toast(`${p.name} escapes the Upside Down.`);}}
 if(p.extra&&!p.finishedPlayer){p.extra=false;logRun(`${p.name} takes an extra turn.`);}else{run.current=1-run.current;if(run.players[run.current].finishedPlayer&&!run.players[1-run.current].finishedPlayer)run.current=1-run.current;}
 if(run.endless&&!routeOptions(run,p.node).length){p.node='mind-start';p.cleared=[];p.visited=[];p.laps=(p.laps||0)+1;toast('Another lap through the multiverse.');}run.turn++;for(const message of settleItemInvestments(run)){logRun(message);toast(message);}for(const message of shiftObstacles(run)){logRun(message);toast(message);}focusBoardAction(run);if(run.turn%4===0&&evolveBoard(run,random))logRun('The world shifts: unvisited encounters change ahead.');updateBoardBanter(run);run.phase='board';run.pending=null;run.lastRoll=null;store.busy=false;saveRun();if(run.raceToFinish&&run.raceWinner!==undefined||run.turn>run.maxTurns||run.players.every(q=>q.finishedPlayer)){finishRun();return;}updateBoard(true);turnFeedback(run.players[run.current]);setMusicZone(run.board.nodes[run.players[run.current].node].realm);const pair=activatePair(run,store.profile);if(pair){startMusic();void introducePair(pair);}vibrate(10);
}
function finishRun(){const run=store.run;if(run.finished)return;for(const message of settleItemInvestments(run,true))logRun(message);run.finished=true;run.phase='finished';store.profile.completed++;store.profile.xp+=12;logRun('The expedition ends. Your growing collection remains.');saveRun();sound('win');finishScreen();}
function finishScreen(){const run=store.run,a=run.players[0],b=run.players[1],winner=run.raceToFinish&&run.raceWinner!==undefined?run.players[run.raceWinner]:a.points===b.points?null:a.points>b.points?a:b,coop=run.mode==='coop'?run.coopRecord:null,title=coop?(coop.humanScore===coop.cpuScore?'A relay photo-finish.':coop.humanScore>coop.cpuScore?'Your team beats Mario + Luigi!':'The brothers take the relay.'):(winner?winner.name+(run.raceToFinish?' wins the race to the finish!':' takes the expedition.'):'Honors shared.');cancelCameraAnimation();clearBoardDetailObserver();store.view='finished';clearEffects();document.body.dataset.view='finished';applyTheme('home');document.getElementById('app').innerHTML=`<main class="shell finish-shell"><div class="finish-content"><header class="finish-heading"><div class="overline">THE END OF A VERY STRANGE TRIP</div><h1>${e(title)}</h1><p>${coop?`Your team ${coop.humanScore} — Mario + Luigi ${coop.cpuScore}. ${coop.won} races won · ${coop.lost} lost · ${coop.tied} tied.`:'A new route is waiting. Every unlock comes with you.'}</p></header><div class="finish-grid">${run.players.map((p,i)=>`<article class="panel finish-player p${i+1}">${portraitHTML(p.character,'portrait big',winner===p?'win':'happy')}<h2>${e(p.name)}</h2>${brandHTML(character(p.character).source,'finish-property-logo')}<div class="big-result">${p.points}<small> POINTS</small></div><p>${p.wins} minigame wins · ${p.cleared.length} realms cleared</p></article>`).join('')}</div><nav class="finish-actions" aria-label="Continue after expedition"><button class="primary" data-action="setup">Another expedition ↗</button><button class="ghost" data-action="home">Home</button></nav><p class="finish-summary">SEED ${e(run.seed)} · ${run.gameHistory.length} CHALLENGES · PROGRESS SAVED</p></div></main>`;queueViewportFit();}

function resumeItemTurn(){const run=store.run;if(!run)return;run.phase='board';run.pending=null;store.busy=false;saveRun();updateBoard(true);toast('Item action used. Roll to move.');}
async function useBagItem(index){
 const run=store.run,token=movementToken;if(store.busy||!run||run.phase!=='board')return;const p=run.players[run.current],it=findItem(p.items[index]);if(!it)return;
 const available=canUseItem(run),choice=await showDialog({title:it.name,source:it.source,body:itemDescription(it),html:`<div class="dialog-icon">${itemArtHTML(it)}</div><p class="item-rule">${available?'Use one item, then roll. Movement items reposition you; your dice landing triggers the encounter.':'Your item action is used for this turn. Roll next; inspect or save items for later.'}</p>`,choices:[...(available?[{label:'Use before rolling',value:'use',primary:true}]:[]),{label:available?'Keep it':'Back to bag',value:'cancel'}]});
 if(choice!=='use'||store.run!==run||movementToken!==token||!canUseItem(run))return;const options={};if(it.kind==='chooseSupply'){const offers=itemSupplyChoices(run,store.profile,p,it,index);const chosen=await showDialog({title:'Choose your supplies',source:it.source,body:'Take one of these three items. Cancelling keeps the crate and your item action.',choices:[...offers.map(drop=>({label:drop.name,sub:itemDescription(drop),art:itemArtHTML(drop),value:drop.id})),{label:'Keep the crate',value:'cancel'}]});if(chosen===null||chosen==='cancel'||store.run!==run||movementToken!==token||!canUseItem(run))return;options.choiceId=chosen;}store.busy=true;const before=effectSnapshot();const result=useItemEffect(run,store.profile,index,random,options);if(result.blocked){store.busy=false;toast(result.message);return;}
 reconcileGates(p);logRun(`${p.name} used ${it.name}: ${result.message}`);focusEffect(before);saveRun();updateBoard();sound('card');boardFeedback(before,{title:it.name,item:it});if(result.unlocked?.length&&(!await unlockDialog(result.unlocked,result.owner||p.owner)||store.run!==run||movementToken!==token))return;await showDialog({title:it.name,source:it.source,body:result.message,html:effectHTML(before,{item:it})});if(store.run!==run||movementToken!==token)return;animateItemTransfers(before);
 if(result.game)return requestGame({id:result.game.id,returnToRoll:true});if(result.randomGame)return requestGame({returnToRoll:true});if(result.music){store.profile.settings.music=true;startMusic();}if(p.finishedPlayer)return endTurn();resumeItemTurn();
}
async function openBag(){const p=store.run.players[store.run.current],size=(window.innerHeight||800)<500?2:6;let page=0;
 while(store.run&&store.view==='board'){const start=page*size,items=p.items.slice(start,start+size),choices=items.map((id,i)=>({label:findItem(id)?.name||'Item',sub:findItem(id)?itemDescription(findItem(id)):'',art:findItem(id)?itemArtHTML(findItem(id)):'',value:start+i}));if(page)choices.push({label:'← Previous items',value:'previous'});if(start+size<p.items.length)choices.push({label:'More items →',value:'next'});choices.push({label:'Back to board',value:'cancel',primary:true});const chosen=await showDialog({title:p.name+'’s bag',body:p.items.length?`${p.items.length} items · ${canUseItem(store.run)?'one item available before rolling':'item action used; roll next'}. Choose one to inspect.`:'Your bag is empty. Visit a supply cache or shop.',choices});if(chosen==='next'){page++;continue;}if(chosen==='previous'){page--;continue;}if(Number.isInteger(chosen))await useBagItem(chosen);return;}
}
// Main menu "Exit game": everything is already saved; close the tab when the browser allows it,
// otherwise stop all sound, leave fullscreen and show a quiet closed screen.
async function quitApp(){
 const live=store.run&&!store.run.finished;
 const choice=await showDialog({title:'Exit ShambConkins?',body:live?'Your run is saved. Continue it any time from the title screen.':'Your unlocks and progress are saved on this device.',choices:[{label:'Exit game',value:'exit',primary:true},{label:'Keep playing',value:'stay'}]});
 if(choice!=='exit')return;
 if(store.run)saveRun();stopMusic();exitFullscreen();
 try{window.close();}catch{}
 setTimeout(()=>{if(window.closed)return;store.view='closed';document.body.dataset.view='closed';
  document.getElementById('app').innerHTML=`<main class="shell exit-screen"><div class="exit-card"><img class="exit-logo" src="${ART.brand}" alt="ShambConkins"><h2>Thanks for playing</h2><p>The game is closed and saved. You can close this tab or swipe the browser away.</p><button class="ts-play" data-action="home">Back to the title screen</button></div></main>`;},200);
}
async function settings(){const p=store.profile;const choice=await showDialog({title:'Make yourself comfortable',body:'Progress is saved automatically on this browser.',html:`<div class="settings-row"><span>Full screen</span>${fullscreenSupported()?fullscreenButton('onoff','small'):'<button class="small" disabled>Not available here</button>'}</div><div class="settings-row"><span>Sound effects</span><button class="small" data-action="toggle-setting" data-id="sound">${p.settings.sound?'On':'Off'}</button></div><div class="settings-row"><span>Original synth ambience</span><button class="small" data-action="toggle-setting" data-id="music">${p.settings.music?'On':'Off'}</button></div><div class="settings-row"><span>Original property logos (internet)</span><button class="small" data-action="toggle-setting" data-id="originalLogos">${p.settings.originalLogos?'On':'Off'}</button></div><div class="settings-row"><span>Level drink status (Chardee flavor text)</span><button class="small" data-action="toggle-setting" data-id="drinkStatus">${p.settings.drinkStatus!==false?'On':'Off'}</button></div><div class="settings-row"><span>Reduce motion</span><button class="small" data-action="toggle-setting" data-id="reducedMotion">${p.settings.reducedMotion?'On':'Off'}</button></div><div class="settings-row"><span>Touch controls</span><button class="small" data-action="touch-mode">${{auto:"Automatic",touch:"Compatibility",pointer:"Pointer"}[p.settings.touchMode]||"Automatic"}</button></div><div class="settings-row"><span>Pub flick sensitivity · next match, both players</span><button class="small" data-action="flick-mode">${p.settings.flickSensitivity===.65?"Gentle":p.settings.flickSensitivity===1.35?"Strong":"Standard"}</button></div><div class="settings-row"><span>Check both players’ fingers</span><button class="small" data-action="touch-test">Two-finger test</button></div><div class="settings-row"><span>Keep a portable save</span><button class="small" data-action="backup">Export backup</button></div><div class="settings-row"><span>Restore a backup</span><button class="small" data-action="import">Import backup</button><input id="backup-file" type="file" accept="application/json,.json" hidden></div>`,choices:[{label:'Back to it',value:'ok',primary:true}]});return choice;}
function exportBackup(){const json=JSON.stringify({format:'shambconkins-backup',version:20,profile:store.profile,run:store.run},null,2),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([json],{type:'application/json'}));a.download='ShambConkins-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Backup exported. Keep it with your game file.');}
async function importBackup(file){try{const data=JSON.parse(await file.text());if(data.format!=='shambconkins-backup'||data.profile?.version!==20||(data.run&&!validRun(data.run)))throw new Error('Unsupported backup');const choice=await showDialog({title:'Restore this backup?',body:'This replaces the progress saved in this browser. Export a backup first if you want to keep both.',choices:[{label:'Restore backup',value:'yes',primary:true},{label:'Keep current progress',value:'no'}]});if(choice!=='yes')return;writeJSON(PROFILE_KEY,data.profile);store.profile=loadProfile();store.run=data.run;saveRun();applyPreferences();home();toast('Backup restored.');}catch{toast('This file is not a valid ShambConkins v0.20 backup.');}}
async function action(name,target){
 if(routePanelAction(name,target))return;
 if(name==='exit-game')return exitGame();if(name==='pause-game')return store.session?.manualPause();
 if(name==='toggle-setting'){const key=target.dataset.id;store.profile.settings[key]=!store.profile.settings[key];saveProfile(store.profile);applyPreferences();if(key==='music'){store.profile.settings.music?startMusic():stopMusic();}return settings();}
 if(name==='touch-mode'){const modes=['auto','touch','pointer'];store.profile.settings.touchMode=modes[(modes.indexOf(store.profile.settings.touchMode)+1)%3];saveProfile(store.profile);return settings();}
 if(name==='flick-mode'){const options=[.65,1,1.35];store.profile.settings.flickSensitivity=options[(options.indexOf(store.profile.settings.flickSensitivity)+1)%3];saveProfile(store.profile);return settings();}
 if(name==='touch-test'){await touchDiagnostic();return settings();}
 if(name==='backup')return exportBackup();if(name==='import'){const input=document.getElementById('backup-file');input.onchange=()=>{if(input.files[0])void importBackup(input.files[0]);};input.click();return;}
 if(store.busy&&!['home','camera','zoom-in','zoom-out','recenter'].includes(name))return;
 switch(name){
  case 'home':home();break;
  case 'quit-app':await quitApp();break;
  case 'setup':setupSelected=['sean','amber'];setupNames=['Sean','Amber'];showView('setup',{selected:setupSelected,names:setupNames});break;
  case 'choose-character':{const rosterScroll=[...document.querySelectorAll('.cs-grid')].map(el=>el.scrollTop||0);captureSetup();const length=document.getElementById('run-length').value,seed=document.getElementById('run-seed').value;const preferences=['board-theme','game-mode','team-mate-0','team-mate-1'].map(id=>[id,document.getElementById(id)?.value]);if(!differentCharacters(target.dataset.id,setupSelected[1-(+target.dataset.player)]))return toast('That character is already travelling with the other player.');setupSelected[+target.dataset.player]=target.dataset.id;showView('setup',{selected:setupSelected,names:setupNames});document.querySelectorAll('.cs-grid').forEach((el,i)=>el.scrollTop=rosterScroll[i]||0);document.getElementById('run-length').value=length;document.getElementById('run-seed').value=seed;for(const[id,value]of preferences)if(document.getElementById(id))document.getElementById(id).value=value;break;}
  case 'start-run':await startRun();break;
  case 'continue':case 'board':await continueRun();break;
  case 'roll':await roll();break;
  case 'reroll':await roll(true);break;
  case 'item':await useBagItem(+target.dataset.index);break;
  case 'bag':await openBag();break;
  case 'fullscreen':toggleFullscreen();break;
  case 'roster':case 'arcade':showCatalog(name);break;
  case 'filter':catalogFilter=target.dataset.id;catalogPage=0;showView(store.view,{query:catalogQuery,filter:catalogFilter,page:catalogPage});break;
  case 'catalog-page':catalogPage=Math.max(0,+target.dataset.page||0);showView(store.view,{query:catalogQuery,filter:catalogFilter,page:catalogPage});break;
  case 'arcade-game':await requestGame({id:target.dataset.id,origin:'arcade'});break;
  case 'dev-game':if(store.profile.settings.devMode)await requestGame({id:target.dataset.id,origin:'dev'});break;
  case 'dev-mode':store.profile.settings.devMode=!store.profile.settings.devMode;saveProfile(store.profile);showCatalog('arcade');break;
  case 'media-sources':{let page=0;while(true){const choice=await showDialog({title:'Reference artwork sources',body:'Property logos, posters and image collection links. '+MEDIA_SOURCES.length+' source entries.',html:sourcesHTML(page),choices:[...(page?[{label:'← Previous',value:'prev'}]:[]),...((page+1)*10<MEDIA_SOURCES.length?[{label:'Next sources →',value:'next'}]:[]),{label:'Done',value:'done',primary:true}]});if(choice==='next')page++;else if(choice==='prev')page--;else break;}break;}
  case 'zoom-in':case 'zoom-out':store.run.zoom=clamp((store.run.zoom||1.2)*(name==='zoom-in'?1.25:.8),.35,3);store.run.camera='follow';repaintCamera();break;
  case 'recenter':focusBoardAction(store.run);repaintCamera(document.querySelector('#map-root svg')?.getAttribute('viewBox'));saveRun();break;
  case 'camera':store.run.camera=store.run.camera==='overview'?'follow':'overview';store.run.pan=null;saveRun();updateBoard(true);break;
  case 'settings':await settings();break;
  case 'log':await showDialog({title:'The story so far',html:(store.run?.history||[]).map(line=>`<div class="log-entry">${e(line)}</div>`).join('')||'<p>Your story starts with a new run.</p>'});break;
  case 'space':{if(store.busy)return;const n=store.run.board.nodes[target.dataset.id],p=store.run.players[store.run.current];const l=location(n.location);await showDialog({title:l?.name||SPACE_TYPES[n.type],source:l?.source||n.route?.source||n.source||'ShambConkins',html:l?locationArtHTML(l):'',body:l?.description||(n.route?`${n.route.reward} ${n.route.risk}`:null)||({'game':'Both players compete in a new minigame.','event':'Draw an encounter from the crossover deck.','item':'A supply cache. Find something useful.','casino':'Both players take part in a casino game.','task':'A coded Taskmaster minigame for both players.','trivia':'Both players answer a themed quiz in alternating turns, with steals after a miss. Themes rotate across your references.','bonus':'Gain 4 points.','penalty':'Lose 3 points, unless a shield or cloak blocks it.','gate':'Complete this realm. Gain 4 points and 8 XP.'}[n.type]||'The start of a new route.')});break;}
  case 'obstacle':{if(store.busy||!store.run)return;const run=store.run,o=run.board.obstacles?.find(o=>o.id===target.dataset.id);if(!o)return;const t=obstacleType(o),p=run.players[run.current];await showDialog({title:t.name,source:t.source,body:obstacleRequirement(run,p,o)+' Main-road travel stays available.',html:obstacleArtHTML(run,o),choices:[{label:'Back to the board',value:'ok',primary:true}]});break;}
  case 'reset-run':{const c=await showDialog({title:'Reset this run?',body:'The current board and scores will be cleared. Your roster and lifetime XP stay.',choices:[{label:'Reset run',value:'yes',primary:true},{label:'Keep playing',value:'no'}]});if(c==='yes'){store.run=null;removeSaved(RUN_KEY);home();}break;}
  case 'erase':{const c=await showDialog({title:'Erase all progress?',body:'This clears every character unlock, XP, and current run in this browser. Export a backup from Settings if you want to keep them.',choices:[{label:'Keep my collection',value:'no',primary:true},{label:'Erase everything',value:'yes',danger:true}]});if(c==='yes'){movementToken++;clearEffects();store.session?.dispose();store.session=null;stopMusic();removeSaved(PROFILE_KEY);removeSaved(RUN_KEY);removeSaved('shambconkins-profile-v6');removeSaved('shambconkins-run-v7');store.profile=freshProfile();store.run=null;setupSelected=['sean','amber'];setupNames=['Sean','Amber'];applyPreferences();saveProfile(store.profile);home();toast('Fresh start: Sean and Amber only.');}break;}
  case 'help':await showDialog({title:'A party game for two',source:'ShambConkins',html:'<ol class="help-list"><li>Start as Sean and Amber, or choose from your unlocked rosters.</li><li>Spaces have different shapes: hexagon = minigame, diamond = event, tag = supplies, heart = bonus, triangle = penalty, house = landmark, ticket = task, chip = casino, die = Yahtzee, octagon = shop, star = realm gate. Tap a space for details.</li><li>Detours can have broken bridges, locks and other barriers. Character skills or carried gear get through; most gear repairs help both players. The main road stays free. A three-point crew repair opens a barrier permanently.</li><li>Roll, then choose branches as you reach them. Lucky Roll spends a reroll to keep the better of two dice.</li><li>Every minigame involves both players. Pass the phone and tap Ready; the clock waits for you.</li><li>Meet a landmark visitor to unlock a character; search supplies to receive an item; start a minigame to play together.</li><li>Use buffs before rolling. Movement items and challenge vouchers use your turn.</li><li>Timed games use points; the no-limit race is won by the first player to the finish. Clearing realms pays bonuses. XP and unlocks carry across runs.</li><li>Your run saves automatically. Export a backup to carry it to a new browser or game file.</li></ol>'});break;
 }
}
document.addEventListener('click',event=>{const choice=event.target.closest('[data-dialog-choice]');if(choice){resolveDialog(+choice.dataset.dialogChoice);return;}const target=event.target.closest('[data-action]');if(target&&!(target.closest?.('#map-root')&&performance.now()<(store.suppressMapClickUntil||0)))void action(target.dataset.action,target).catch(error=>{console.error('Action failed',target.dataset.action,error);store.busy=false;saveRun();toast('That action was interrupted. Your progress is saved.');});});
document.addEventListener('input',event=>{if(event.target.id==='catalog-search'){const focus=event.target.selectionStart;catalogQuery=event.target.value;catalogPage=0;showView(store.view,{query:catalogQuery,filter:catalogFilter,page:catalogPage});const input=document.getElementById('catalog-search');input.focus();input.setSelectionRange(focus,focus);}});
document.getElementById('dialog').addEventListener('cancel',event=>{event.preventDefault();const i=store.dialog?.choices.findIndex(c=>['cancel','no','stay'].includes(c.value));if(i>=0)resolveDialog(i);});
window.addEventListener('pagehide',saveRun);window.addEventListener('orientationchange',()=>{if(store.view==='board'&&!store.session)setTimeout(()=>updateBoard(true),100);});
installViewport(()=>{if(store.view==='board'&&!store.session&&!store.boardTour)repaintCamera();});installMedia();installBoardGestures();installPortraitCycle();installSetupFaceCycle();applyPreferences();saveProfile(store.profile);showView('home');
window.ShambConkins={version:VERSION,announceLevel,updateBoard,enterWarpZone,exitWarpZone,startBoss,bossDone,buildWarpBoard,addHorrorBoard,items:ITEMS,locations:LOCATIONS,brandHTML,portraitHTML,itemArtHTML,locationArtHTML,floatingHead,store,startRun,playBoardIntro,requestGame,roll,continueRun,resolveLanding,saveRun,generateBoard,rareEvents:RARE_EVENTS,applyEvent,gameRegistry:GAMES,endTurn,resolveEvent,visitLocation,useBagItem,takeRoute,focusBoardAction,edgeObstacle,crossObstacle,obstacleChoices,shiftObstacles,activatePair,drawPairTurn,applyPairTurn,pairForRun,upgradeRunFormat,nowPlaying,musicScene,unlockDialog,diagnostics:()=>({phase:store.run?.phase,busy:store.busy,game:store.session?.game.id,seed:store.run?.seed,engines:[...new Set(GAMES.map(g=>g.engine))]})};

function installBoardGestures(){
 // One finger pans the map, two fingers pinch-zoom, the mouse wheel zooms. Rolling resets the view.
 const points=new Map();let drag=null,pinch=null;
 const viewBox=map=>map.querySelector('svg')?.getAttribute('viewBox')?.split(' ').map(Number);
 const startPinch=map=>{const view=viewBox(map),[a,b]=[...points.values()];if(!view||!a||!b)return;pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,zoom:store.run.zoom||1.2};drag=null;store.run.camera='follow';store.run.focusNodes=null;store.run.pan={x:view[0]+view[2]/2,y:view[1]+view[3]/2};};
 document.addEventListener('pointerdown',ev=>{const map=ev.target.closest?.('#map-root');if(!map||store.busy||store.view!=='board')return;points.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});if(points.size>=2){startPinch(map);return;}const svg=map.querySelector('svg'),rect=map.getBoundingClientRect(),view=viewBox(map);if(!view)return;drag={id:ev.pointerId,x:ev.clientX,y:ev.clientY,cx:view[0]+view[2]/2,cy:view[1]+view[3]/2,sx:view[2]/rect.width,sy:view[3]/rect.height};try{map.setPointerCapture(ev.pointerId);}catch{}});
 document.addEventListener('pointermove',ev=>{if(points.has(ev.pointerId))points.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});if(!store.run||store.busy||store.view!=='board'){drag=null;pinch=null;return;}
  if(pinch&&points.size>=2){const [a,b]=[...points.values()],d=Math.hypot(a.x-b.x,a.y-b.y);store.run.zoom=clamp(pinch.zoom*d/pinch.d,.35,3.2);store.suppressMapClickUntil=performance.now()+400;repaintCamera();return;}
  if(!drag||ev.pointerId!==drag.id)return;if(Math.hypot(ev.clientX-drag.x,ev.clientY-drag.y)<6)return;store.suppressMapClickUntil=performance.now()+350;store.run.camera='follow';store.run.focusNodes=null;store.run.pan={x:drag.cx-(ev.clientX-drag.x)*drag.sx,y:drag.cy-(ev.clientY-drag.y)*drag.sy};repaintCamera();});
 const end=ev=>{points.delete(ev.pointerId);if(points.size<2)pinch=null;if(drag&&ev.pointerId===drag.id)drag=null;};
 document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);
 document.addEventListener('wheel',ev=>{const map=ev.target.closest?.('#map-root');if(!map||!store.run||store.busy||store.view!=='board')return;ev.preventDefault();const view=viewBox(map);if(!view)return;store.run.camera='follow';store.run.focusNodes=null;store.run.pan={x:view[0]+view[2]/2,y:view[1]+view[3]/2};store.run.zoom=clamp((store.run.zoom||1.2)*(ev.deltaY<0?1.12:.89),.35,3.2);repaintCamera();},{passive:false});
}

// Character select: the selected heads slowly cycle through their expressions.
function installSetupFaceCycle(){setInterval(()=>{if(store.view!=='setup'||document.hidden)return;for(const stage of document.querySelectorAll('.cs-stage')){const faces=[...stage.querySelectorAll('.cs-face')];if(faces.length<2)continue;const at=faces.findIndex(f=>f.classList.contains('on'));faces[Math.max(0,at)].classList.remove('on');faces[(at+1)%faces.length].classList.add('on');}},2800);}
function installPortraitCycle(){let tick=0;setInterval(()=>{if(store.view!=='board'||store.busy||store.session||document.hidden||!store.run||store.run.finished)return;tick++;for(const p of store.run.players)if(!['win','sad'].includes(p.mood)||tick%3===0)p.mood=['normal','happy','thinking','normal'][tick%4];refreshPortraits();},3500);}

Object.assign(exports,{saveRun,continueRun,roll,takeRoute,resolveLanding,endTurn});