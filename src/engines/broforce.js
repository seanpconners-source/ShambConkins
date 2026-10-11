// BF-36: session boundary only. Mission owns gameplay; launcher owns all rewards.
const STAGES=['broforce-jungle','broforce-factory','broforce-city','broforce-desert'];
const HOW_TO='Two people share one world. P1 uses the left controls; P2 uses the right. Drag to move; hold ↑ to jump and ● to fire. ★ is action: use it beside the helicopter to board. Rescue cages to change your mission fighter. Defeat the devil, then board alive before departure. Keyboard: P1 A/D, W jump, Space fire, E action; P2 arrows, Enter fire, Shift action.';

async function broforce(s){
 if(!s.alive)return;
 const {store}=require('src/state.js');
 const {hash,seededRandom}=require('src/utils.js');
 const {snapshotFighters,chooseDevil,devilCandidatePool}=require('src/engines/broforce/roster.js');
 const stageId=s.game.stageId||s.game.id;
 if(!STAGES.includes(stageId)||s.game.id!==stageId)throw new Error('Broforce requires one of the four matching mission IDs.');
 const players=s.players.map(p=>({owner:p.owner,name:p.name,character:p.character,
  fighterId:p.character,fighters:snapshotFighters(store.profile,p.owner).slice()}));
 if(players.length!==2||players[0].owner!=='Sean'||players[1].owner!=='Amber')
  throw new Error('Broforce requires owner-aligned Sean and Amber players.');
 // Launcher contract: s.broforceAttempt or board run.pending.bf carries
 // {attemptId,stageId,seed?,devilId?}. The host never writes the run/profile.
 const pending=store.run?.pending;
 // BF-37 owns the durable board-attempt identity and exact reward authority.
 const saved=s.broforceReward?.attempt||s.broforceAttempt||
  ((pending?.gameId===stageId)?(pending.bfAttempt||pending.bf):null);
 const suppliedId=saved?.attemptId??s.attemptId;
 if(suppliedId!==undefined&&(typeof suppliedId!=='string'||!suppliedId.length||suppliedId.length>128))
  throw new Error('Invalid Broforce attempt ID.');
 if(saved?.stageId!==undefined&&saved.stageId!==stageId)throw new Error('Saved Broforce attempt belongs to another mission.');
 if(saved&&!suppliedId)throw new Error('Saved Broforce attempt is missing its ID.');
 if(saved&&!Object.prototype.hasOwnProperty.call(saved,'devilId'))
  throw new Error('Saved Broforce attempt is missing its latched devil. Start a new attempt.');
 // Reproducible, bounded fallback; it is NOT a durable crash/reload identity.
 const attemptId=suppliedId||'bf36-'+hash(JSON.stringify([stageId,String(s.seed||'practice').slice(0,256),
  players.map(p=>[p.owner,p.character])])).toString(16);
 const seed=saved?.seed??hash(attemptId+':'+stageId+':world');
 if(!(typeof seed==='string'&&seed.length<=256)&&!Number.isSafeInteger(seed))
  throw new Error('Invalid saved Broforce world seed.');
 const owners=players.map(p=>p.owner);
 let devilId;
 if(saved&&Object.prototype.hasOwnProperty.call(saved,'devilId')){
  devilId=saved.devilId;
  // Keep saved identity even when no longer eligible. A changed profile must
  // never silently reroll a resumed attempt into a different award target.
  if(devilId!==null&&!devilCandidatePool(store.profile,owners).includes(devilId))
   throw new Error('Saved Broforce devil is no longer an eligible locked character. Start a new attempt.');
 }else devilId=chooseDevil(store.profile,owners,seededRandom(attemptId+':devil'));
 const attempt=Object.freeze({attemptId,stageId,seed,devilId});
 s.shared=true;s.cooperative=true;s.cooperativeLabel='BROFORCE CO-OP';s.updateScores();
 const [canvas,ctx]=s.canvas(700,390,{fill:true});
 const doc=canvas.ownerDocument,win=doc.defaultView;
 const shell=s.body.closest('.game-shell'),layer=shell?.parentElement;
 let disposed=false,settled=false,phase='intro',state=null,elapsed=0;
 let controls=null,ambience=null,sfx=null,resources=null;
 const portraits=new Map(),extraCleanups=[];
 // CSS env() safe areas vary on Fold/phone and remain independent from game pixels.
 // Reserve the real DOM menu strip above the Canvas HUD; no fake Pause target.
 let safeProbe=null;
 function insets(){
  const css=safeProbe&&win.getComputedStyle?.(safeProbe);
  const n=k=>Math.max(0,Math.min(100,parseFloat(css?.[k])||0));
  return {top:n('paddingTop'),right:n('paddingRight'),bottom:n('paddingBottom'),left:n('paddingLeft')};
 }
 function dispose(){
  if(disposed)return;disposed=true;phase='exited';
  // Independent guards ensure a failed disposer cannot strand other resources.
  for(const fn of [()=>controls?.dispose(),()=>ambience?.stop(),()=>sfx?.stop(),...extraCleanups])try{fn();}catch{}
  for(const image of portraits.values()){image.onload=null;image.onerror=null;image.removeAttribute?.('src');}
  portraits.clear();state=null;resources=null;
 }
 s.cleanup(dispose);
 try{
  if(shell){
   const hadShell=shell.classList.contains('bf36-shell'),hadLayer=layer?.classList.contains('bf36-layer');
   shell.classList.add('bf36-shell');layer?.classList.add('bf36-layer');
   const style=doc.createElement('style');
   style.textContent=`
    #game-layer.bf36-layer{padding:0;height:100dvh;max-height:none}
    .game-shell.bf36-shell{position:relative;max-width:none;border:0;border-radius:0;grid-template-rows:minmax(0,1fr);overflow:hidden;background:#102831}
    .bf36-shell>.game-header{position:absolute;right:max(8px,env(safe-area-inset-right));top:max(4px,env(safe-area-inset-top));z-index:12;border:0;background:transparent;padding:0;min-height:0}
    .bf36-shell>.game-header>:not(.game-actions){display:none}
    .bf36-shell .game-actions{gap:4px;display:flex}
    .bf36-shell .game-actions button{min-height:44px;min-width:44px;padding:4px 8px;font-size:12px;background:#102831e8;color:#fff}
    .bf36-shell>#game-scorebar{display:none}
    .bf36-shell>.game-body{padding:0;display:flex;gap:0;overflow:hidden;min-height:0}
    .bf36-shell .canvas-frame{border:0;border-radius:0;flex:1;min-height:0;width:100%;height:100%}
    .bf36-shell .game-canvas{display:block;border:0;border-radius:0;max-width:none;max-height:none}
    .bf36-shell #game-status,.bf36-shell #game-hint,.bf36-shell #game-controls{display:none}
    .bf36-shell .pass-overlay{z-index:30;background:#091c2adb}
    .bf36-shell .bf18-control-surface{opacity:.70}
    .bf36-shell .bf18-action{min-width:44px!important;min-height:44px!important}
   `;
   shell.appendChild(style);extraCleanups.push(()=>{style.remove();if(!hadShell)shell.classList.remove('bf36-shell');if(!hadLayer)layer?.classList.remove('bf36-layer');});
   safeProbe=doc.createElement('div');safeProbe.setAttribute('aria-hidden','true');
   safeProbe.style.cssText='position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
   shell.appendChild(safeProbe);extraCleanups.push(()=>safeProbe?.remove());
  }
  const {audioContext}=require('src/audio.js');
  const {createBroforceAudio}=require('src/engines/broforce/audio.js');
  const settings=()=>store.profile?.settings||{};
  // No AudioContext creation here; reuse the existing host provider on gestures.
  const wakeAudio=()=>{
   if(disposed||s.paused||phase!=='playing'||doc.hidden)return;
   if(!sfx)sfx=createBroforceAudio(audioContext,settings);
   ambience?.start();ambience?.resume();
  };
  const clear=()=>{s.resetInputs();};
  const suspend=()=>{ambience?.pause();sfx?.stop();sfx=null;};
  s.resetOnPause(suspend);
  s.on(win,'blur',()=>{clear();suspend();if(s.alive&&!s.paused&&!s.waiting)s.manualPause();});
  s.on(doc,'visibilitychange',()=>{if(doc.hidden){clear();suspend();}});
  s.on(win,'orientationchange',()=>{clear();suspend();});
  s.on(win,'resize',()=>{clear();suspend();});
  s.on(shell||s.body,'pointerdown',ev=>{
   if(ev.target?.closest?.('[data-action]')){clear();suspend();return;}
   wakeAudio();
  });
  s.on(shell||s.body,'click',ev=>{
   if(ev.target?.closest?.('[data-action]')){clear();suspend();}
  });
  s.on(doc,'keydown',ev=>{if(!ev.ctrlKey&&!ev.altKey&&!ev.metaKey)wakeAudio();});
  let motion=!!settings().reducedMotion;
  const media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
  if(media)s.on(media,'change',()=>{clear();suspend();});
  const help=doc.createElement('button');help.type='button';help.textContent='Help';
  help.setAttribute('aria-label','Broforce controls and extraction help');
  const actions=shell?.querySelector('.game-actions');
  if(actions){actions.appendChild(help);extraCleanups.push(()=>help.remove());s.on(help,'click',()=>{
   if(s.alive&&!s.paused)void s.pass(0,HOW_TO,'Resume mission');
  });}
  if(devilId===null){
   const ready=await s.pass(0,'No eligible locked devil remains for these owners. This mission cannot begin. No character will be awarded.','Return');
   if(ready&&s.alive&&!disposed)finish({kind:'broforce',won:false,bf:{schema:1,attemptId,stageId,devilId:null,outcome:'failed',boarded:[false,false],aliveAtBoarding:[false,false]}});
   else dispose();
   return;
  }
  // Missing future modules deliberately fail through the normal launcher error
  // path. Do not substitute production gameplay or art placeholders.
  const {generateBroforceVariant}=require('src/engines/broforce/stageVariants.js');
  const {createBroforceMission,advanceBroforceMission}=require('src/engines/broforce/mission.js');
  const {drawBroforceScene}=require('src/engines/broforce/sceneRenderer.js');
   const {createBroforceFx,emitBroforceFx,advanceBroforceFx}=require('src/engines/broforce/fxArt.js');
  const {drawBroforceEnvironment}=require('src/engines/broforce/themeArt.js');
  const {drawBroforceCinematics}=require('src/engines/broforce/cinematicArt.js');
  const {createBroforceAmbience}=require('src/engines/broforce/ambience.js');
  const {attachBroforceControls}=require('src/engines/broforce/controls.js');
  const {createBroforceCamera,advanceBroforceCamera}=require('src/engines/broforce/camera.js');
  const {portraitURL,portraitFallbackURL}=require('src/assets.js');
  const {headDisplayURL}=require('src/headCutouts.js');
  const stage=generateBroforceVariant({stageId,seed});
  state=createBroforceMission({stage,seed,devilId,players,attemptId});
  let camera=createBroforceCamera({zoom:2});
   let fxSystem=createBroforceFx(seed,{quality:'high',reducedMotion:motion||!!media?.matches});
  // BF-16 consumes fightersByOwner. Supply snapshots on mission state and on
  // each detached player; the BF-30 integrator must retain this entitlement.
  state={...state,fightersByOwner:Object.fromEntries(players.map(p=>[p.owner,p.fighters.slice()]))};
  resources={advanceBroforceMission,drawBroforceScene,drawBroforceEnvironment,drawBroforceCinematics,advanceBroforceCamera,stage};
  function portraitFor(id){
   if(typeof id!=='string'||portraits.size>=128&&!portraits.has(id))return null;
   if(portraits.has(id))return portraits.get(id);
   let src=portraitURL(id,'normal');
   // portraitURL may choose online art under host settings. BF is offline only.
   if(!src||!/^(data:image\/|blob:)/i.test(src))src=portraitFallbackURL(id);
   src=headDisplayURL(src);
   if(!/^(data:image\/|blob:)/i.test(src))return null;
   const image=new win.Image();image.src=src;portraits.set(id,image);return image;
  }
  for(const p of players)portraitFor(p.fighterId);portraitFor(devilId);
  ambience=createBroforceAmbience({getContext:audioContext,getSettings:settings,stageId});
  const ready=await s.pass(0,HOW_TO,'Both ready — begin',{countdown:3});
  if(!ready||!s.alive||disposed){dispose();return;}
  phase='playing';
  // BF-18 uses the session's listeners, but reject keyboard menu activation.
  const inputSession=Object.create(s);
  const actionHolds=[new Set(),new Set()];
  s.resetOnPause(()=>actionHolds.forEach(a=>a.clear()));
  inputSession.on=(el,event,fn)=>s.on(el,event,ev=>{
   if(event==='keydown'&&(ev.target?.closest?.('button, input, textarea, select, [contenteditable="true"]')||phase!=='playing'))return;
   fn(ev);
   if(!s.alive||s.paused||disposed)return;
   const key=String(ev.key||'').toLowerCase(),source=event.startsWith('key')?'k:'+String(ev.code||ev.key):'p:'+ev.pointerId;
   if(event==='keydown'&&!ev.ctrlKey&&!ev.altKey&&!ev.metaKey&&(key==='e'||key==='shift'))actionHolds[key==='e'?0:1].add(source);
   if(event==='pointerdown'&&ev.defaultPrevented&&el.classList.contains('bf18-special')){
    const owner=el.closest('.bf18-player-1')?0:1,r=canvas.parentElement.getBoundingClientRect();
    if(owner===(ev.clientX<r.left+r.width/2?0:1))actionHolds[owner].add(source);
   }
   if(['keyup','pointerup','pointercancel','lostpointercapture'].includes(event))actionHolds.forEach(a=>a.delete(source));
  });
  controls=attachBroforceControls(inputSession);
  // Allocation is lazy inside play(); ambience begins on a playing gesture.
  sfx=createBroforceAudio(audioContext,settings);
  let size=s.W+'x'+s.H;
  s.frame((dt,time)=>{
   if(disposed||settled||!s.alive||s.paused||doc.hidden||phase!=='playing')return;
   try{
    const safe=insets();
    const viewport={width:s.W,height:s.H,safeInsets:{top:Math.max(56,safe.top+56),right:safe.right,bottom:safe.bottom,left:safe.left}};
    const nextSize=s.W+'x'+s.H,reduce=!!settings().reducedMotion||!!media?.matches;
    if(nextSize!==size||reduce!==motion){
      const motionChanged=reduce!==motion;
      clear();controls.resize();size=nextSize;motion=reduce;
      if(motionChanged)fxSystem=createBroforceFx(seed,{quality:motion?'low':'high',reducedMotion:motion});
     }
    const seconds=Math.max(0,Math.min(.04,Number.isFinite(dt)?dt:0));
    // Preserve BF-18 press/hold fields; explicit aliases match physics and the
    // mission's held boarding intent without transferring input between owners.
    const inputs=controls.sample().map((p,i)=>({...p,jump:p.jumpHeld,fire:p.fireHeld,action:p.specialPressed,actionHeld:actionHolds[i].size>0}));
    const next=resources.advanceBroforceMission(state,{dt:seconds,inputs,paused:false});
    elapsed+=seconds;state=next.state;
    if(next.terminal){finish(next.terminal);return;}
    const map=state.terrain?.map||state.terrain||state.stage||resources.stage;
    camera=resources.advanceBroforceCamera(camera,{players:(state.players||[]).map(p=>({...p,...(p.body||{})})),
     viewport,world:{width:map.width*16,height:map.height*16},dt:seconds,controlsInset:Math.min(145,s.H*.28)});
    // Mission provides finite, per-tick FX events; BF-23 owns active particles,
     // shake and lifetimes. Never spread the raw mission event array into scene.fx.
     for(const event of (Array.isArray(state.fx)?state.fx:[]).slice(0,128))emitBroforceFx(fxSystem,event);
     advanceBroforceFx(fxSystem,seconds);
     const scene={...state,camera,fx:fxSystem,hideHudPause:true,
      mission:{stage:state.stage?.title||s.game.title,
       objective:state.stage?.objective||'Rescue captives and defeat the devil',
       rescues:(state.prisoners||[]).filter(p=>p.rescued).length,
       rescueTarget:(state.prisoners||[]).length}};
    resources.drawBroforceScene(ctx,{state:scene,viewport,time:motion?0:time,quality:motion?'low':'high',portraitFor,
     environmentDraw:resources.drawBroforceEnvironment,
     cinematicDraw:(g,opts)=>resources.drawBroforceCinematics(g,{...opts,camera:{...opts.camera,zoom:1},reducedMotion:motion})});
    ambience.setIntensity(state.devil?.active ? .85 : .35);
    // Mission events contain authoritative sound{name}; other gameplay events
    // must not duplicate the cue or mask a weapon/boss/helicopter identity.
    for(const e of (next.events||[]).filter(e=>e.type==='sound').slice(0,32)){
     if(typeof e.name==='string')sfx?.play(e.name);
    }
   }catch(error){
    s.status('Broforce stopped: '+String(error.message||error));
    finish({kind:'broforce',won:false,bf:{schema:1,attemptId,stageId,devilId,outcome:'failed',boarded:[false,false],aliveAtBoarding:[false,false]}});
   }
  });
  s.debug={engine:'broforce',attempt,get state(){return state;},get phase(){return phase;}};
 }catch(error){dispose();throw error;}

 function finish(terminal){
  if(settled||disposed||!s.alive)return;
  const bf=terminal?.bf;
  if(terminal?.kind!=='broforce'||bf?.schema!==1||bf.attemptId!==attemptId||bf.stageId!==stageId||bf.devilId!==devilId||
   !['extracted','failed','timeout'].includes(bf.outcome)||
   ![bf.boarded,bf.aliveAtBoarding].every(a=>Array.isArray(a)&&a.length===2&&a.every(v=>typeof v==='boolean')))
   throw new Error('Invalid Broforce terminal envelope.');
  const won=bf.outcome==='extracted'&&devilId!==null&&bf.boarded.some((b,i)=>b&&bf.aliveAtBoarding[i]);
  if(terminal.won!==won||(bf.outcome==='extracted'&&!won))
   throw new Error('Broforce terminal success disagrees with live boarding.');
  // BF-37 awards ONLY from completed BF-21 extraction receipts, not the display envelope.
 // Submit the evidence before disposing the live GameSession.
 if(won&&s.broforceReward){
  const confirmed=s.broforceReward.confirmExtraction({
   devilId,devilDefeated:state?.bossDefeated===true,extraction:state?.extraction
  });
  if(!confirmed)throw new Error('Broforce extraction proof could not be verified.');
 }
 settled=true;phase='resolving';
  const scores=bf.boarded.map((b,i)=>won&&b&&bf.aliveAtBoarding[i]?1:0);
  s.teamResult={kind:'broforce',won,tied:false,humanTotal:scores[0]+scores[1],cpuTotal:0,cpuScores:[0,0],duration:elapsed,
   bf:{schema:1,attemptId,stageId,devilId,outcome:bf.outcome,boarded:bf.boarded.slice(),aliveAtBoarding:bf.aliveAtBoarding.slice()}};
  // Dispose before callback: no audio/touch/timer survives synchronous settlement.
  dispose();
  s.finish(scores,won?'Helicopter extraction complete':bf.outcome==='timeout'?'Mission timed out':devilId===null?'No eligible devil available':'Mission failed');
 }
}
Object.assign(exports,{broforce});
