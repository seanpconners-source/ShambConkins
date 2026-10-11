// BF-36: real pinned roster/profile/controls/camera APIs; explicit future fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const plain=x=>JSON.parse(JSON.stringify(x));
function load(path,deps={},globals={}){
 const exports={};vm.runInNewContext(fs.readFileSync(new URL(path,root),'utf8'),
  {exports,require:id=>{if(!(id in deps))throw Error('Missing fixture: '+id);return deps[id];},...globals},{filename:path});return exports;
}
const utils=load('src/utils.js');
const content={ACTIVE_CATALOG:{characters:[
 {id:'sean',name:'Sean',source:'ShambConkins'},{id:'amber',name:'Amber',source:'ShambConkins'},
 {id:'alpha',name:'Alpha',source:'Fixture'},{id:'beta',name:'Beta',source:'Fixture'},
 {id:'devil-a',name:'Devil A',source:'Fixture'},{id:'devil-b',name:'Devil B',source:'Fixture'}],items:[]}};
const characters=load('src/characters.js',{'src/contentPolicy.js':content,'src/utils.js':utils});
const profiles=load('src/profile.js',{
 'src/photoPairs.js':{normalizePhotoPair:()=>null,photoPairLibrary:()=>[],currentPhotoPair:()=>{},photoProfilePayload:p=>p},
 'src/contentPolicy.js':content,'src/persistence.js':{PROFILE_KEY:'test',readJSON:()=>null,writeJSON:()=>{throw Error('Forbidden save');}},
 'src/characters.js':characters,'src/data/savoryLab.js':{LAB_TEAM:[]},
 'src/data/movieBonds.js':{isMovieBond:()=>false,missingMovieBonds:()=>[]}
});
const roster=load('src/engines/broforce/roster.js',{'src/characters.js':characters,'src/profile.js':profiles});
const controls=load('src/engines/broforce/controls.js');
const camera=load('src/engines/broforce/camera.js');
const terrain=load('src/engines/broforce/terrain.js');
const stageApi=load('src/engines/broforce/stage.js',{'src/engines/broforce/terrain.js':terrain});
const audioApi=load('src/engines/broforce/audio.js');
class Element{
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.style={};this.children=[];this.attrs={};this.listeners=new Map();this.captured=new Set();this.className='';this.hidden=false;this.textContent='';
  this.classList={add:k=>{if(!this.classList.contains(k))this.className+=' '+k;},remove:k=>{this.className=this.className.split(' ').filter(v=>v!==k).join(' ');},contains:k=>this.className.split(' ').includes(k)};}
 appendChild(e){this.children.push(e);e.parentElement=this;return e;}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);this.parentElement=null;}
 setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}removeAttribute(k){delete this.attrs[k];}
 matches(selector){return selector.split(',').some(s=>{s=s.trim();return s==='[data-action]'?'data-action' in this.attrs:s.startsWith('.')?this.classList.contains(s.slice(1)):s.startsWith('#')?this.id===s.slice(1):this.tagName===s.toUpperCase();});}
 closest(s){for(let n=this;n;n=n.parentElement)if(n.matches(s))return n;return null;}
 querySelector(s){for(const child of this.children){if(child.matches(s))return child;const found=child.querySelector(s);if(found)return found;}return null;}
 addEventListener(k,f){if(!this.listeners.has(k))this.listeners.set(k,new Set());this.listeners.get(k).add(f);}
 emit(k,data={}){const e={target:this,key:'',pointerId:1,clientX:0,pointerType:'touch',button:0,preventDefault(){this.defaultPrevented=true;},...data};for(const f of this.listeners.get(k)||[])f(e);return e;}
 setPointerCapture(id){this.captured.add(id);}hasPointerCapture(id){return this.captured.has(id);}releasePointerCapture(id){this.captured.delete(id);}
 getBoundingClientRect(){return this.rect||this.parentElement?.getBoundingClientRect()||{left:0,top:0,width:390,height:780};}
}
function setup(options={}){
 const calls={finish:[],create:[],steps:[],draw:[],generated:[],images:[],proofs:[],audioStop:0,ambienceStop:0,pause:0,resume:0};
 const doc=new Element('document'),win=new Element('window');doc.defaultView=win;doc.createElement=t=>new Element(t,doc);
 win.Image=class{constructor(){calls.images.push(this);this.complete=true;this.naturalWidth=50;this.naturalHeight=70;}removeAttribute(){this.src='';}};
 const media=new Element('media');media.matches=false;win.matchMedia=()=>media;
 const layer=doc.createElement('div'),shell=doc.createElement('section'),body=doc.createElement('div'),actions=doc.createElement('div');
 shell.className='game-shell';actions.className='game-actions';layer.appendChild(shell);shell.appendChild(actions);shell.appendChild(body);
 const exit=doc.createElement('button');exit.setAttribute('data-action','exit-game');actions.appendChild(exit);
 const profile=profiles.freshProfile();profile.shared=['sean','amber'];profile.rosters.Sean=['alpha'];profile.rosters.Amber=['beta'];profile.settings={sound:false,music:false};
 if(options.exhausted)profile.shared=characters.CHARACTERS.map(c=>c.id);
 const players=[{name:'Same display name',owner:'Sean',character:'sean',nested:{keep:1}},
  {name:'Same display name',owner:'Amber',character:'amber',nested:{keep:2}}];
 const store={profile,run:options.run||null};
 const resets=[],cleanups=[],listeners=[];
 const s={alive:true,paused:false,waiting:false,body,players,seed:'session-seed',game:{id:options.stageId||'broforce-jungle',stageId:options.stageId||'broforce-jungle'},
  broforceAttempt:options.attempt,attemptId:options.attemptId,W:390,H:780,
  canvas(w,h,o){assert.deepEqual(plain([w,h,o]),[700,390,{fill:true}]);const frame=doc.createElement('div'),c=doc.createElement('canvas');frame.className='canvas-frame';body.appendChild(frame);frame.appendChild(c);frame.rect={left:0,top:0,width:s.W,height:s.H};s.c=c;s.x={};return[c,s.x];},
  updateScores(){},status(text){calls.status=text;},queueCanvasFit(){},
  on(el,event,fn){el.addEventListener(event,fn);listeners.push([el,event,fn]);},cleanup(fn){cleanups.push(fn);},resetOnPause(fn){resets.push(fn);},resetInputs(){for(const fn of resets)fn();},
  capture(ev){s.c.setPointerCapture(ev.pointerId);},release(ev){s.c.releasePointerCapture(ev.pointerId);},
  async pass(index,text,label,opts){calls.pass={index,text,label,opts};if(options.pass)return options.pass(s);return true;},
  manualPause(){s.resetInputs();s.paused=true;},frame(fn){s.loop=fn;},
  finish(scores,label){calls.finish.push({scores:plain(scores),label,result:plain(s.teamResult)});s.alive=false;s.dispose();},
  dispose(){s.alive=false;for(const fn of cleanups.splice(0))fn();for(const [el,k,fn]of listeners)el.listeners.get(k)?.delete(fn);}
 };
 if(options.reward)Object.defineProperty(s,'broforceReward',{value:Object.freeze({attempt:options.reward,
  confirmExtraction(evidence){calls.proofs.push(plain(evidence));return options.rejectProof!==true;}})});
 const deps={
  'src/state.js':{store},'src/utils.js':utils,'src/engines/broforce/roster.js':roster,
  'src/audio.js':{audioContext:()=>null},'src/engines/broforce/audio.js':{createBroforceAudio(...args){const api=audioApi.createBroforceAudio(...args);return{...api,stop(){calls.audioStop++;api.stop();}};}},
  'src/engines/broforce/controls.js':controls,'src/engines/broforce/camera.js':camera,
  'src/assets.js':{portraitURL:id=>'https://forbidden/'+id,portraitFallbackURL:()=> 'data:image/svg+xml;base64,PHN2Zy8+'},
  'src/headCutouts.js':{headDisplayURL:s=>s},
  'src/engines/broforce/stageVariants.js':{generateBroforceVariant(arg){calls.generated.push(plain(arg));return{...stageApi.generateBroforceStage({seed:arg.seed}),stageId:arg.stageId};}},
  'src/engines/broforce/mission.js':{
   createBroforceMission(arg){calls.create.push(plain(arg));return{...arg,stageId:arg.stage.stageId,players:arg.players.map((p,i)=>({...p,body:{x:40+i*32,y:280,w:12,h:26},alive:true})),terrain:arg.stage};},
   advanceBroforceMission(state,args){calls.steps.push(plain(args));state.players[0].fighterId='alpha';state.players[1].fighterId='beta';
    const terminal=options.terminal?.(state,args,calls.steps.length);
    if(terminal?.won&&options.reward){state.bossDefeated=true;state.extraction={active:true,phase:'completed',outcome:'extracted',reason:'departure',
      boarded:terminal.bf.boarded,receipts:terminal.bf.boarded.map((yes,i)=>yes?{playerIndex:i,owner:state.players[i].owner,boardedAt:3}:null)};}
    return{state,events:[{type:'shot'}],terminal:terminal||null};}
  },
  'src/engines/broforce/sceneRenderer.js':{drawBroforceScene(ctx,args){calls.draw.push(args);args.environmentDraw(ctx,{stageId:args.state.stageId});args.cinematicDraw(ctx,{camera:{x:0,y:0},drawPortrait:()=>{}});args.portraitFor('alpha');}},
  'src/engines/broforce/themeArt.js':{drawBroforceEnvironment(ctx,arg){calls.environment=arg;}},
  'src/engines/broforce/cinematicArt.js':{drawBroforceCinematics(ctx,arg){calls.cinematic=arg;}},
  'src/engines/broforce/ambience.js':{createBroforceAmbience(arg){calls.ambience=arg;return{start(){},pause(){calls.pause++;},resume(){calls.resume++;},stop(){calls.ambienceStop++;},setIntensity(){}};}}
 };
 if(options.missing)delete deps['src/engines/broforce/mission.js'];
 const {broforce}=load('src/engines/broforce.js',deps);
 return{s,store,calls,doc,win,media,shell,layer,players,run:()=>broforce(s),step:(dt=.02)=>s.loop?.(dt,4),
  button(i,kind){return s.c.parentElement.querySelector('.bf18-player-'+(i+1))?.querySelector('.bf18-'+kind);}};
}
function terminal(state,boarded=[true,true],outcome='extracted',alive=boarded){return{kind:'broforce',won:outcome==='extracted'&&boarded.some((b,i)=>b&&alive[i]),bf:{schema:1,
 attemptId:state.attemptId,stageId:state.stageId,devilId:state.devilId,outcome,boarded,aliveAtBoarding:alive}};}
let count=0;
async function check(name,fn){await fn();count++;console.log('PASS '+name);}
for(const boarded of [[true,false],[false,true],[true,true],[false,false]])await check('exact boarding '+JSON.stringify(boarded),async()=>{
 const d=setup({terminal:state=>terminal(state,boarded,boarded.some(Boolean)?'extracted':'failed')});const before=JSON.stringify([d.players,d.store]);await d.run();d.step();d.step();
 assert.equal(d.calls.finish.length,1);assert.deepEqual(d.calls.finish[0].scores,boarded.map(Number));
 assert.deepEqual(d.calls.finish[0].result.bf.boarded,boarded);assert.equal(d.calls.finish[0].result.won,boarded.some(Boolean));
 assert.equal(JSON.stringify([d.players,d.store]),before,'main identities, run, profile unchanged');assert.equal(d.calls.ambienceStop,1);assert.equal(d.calls.audioStop,1);
 assert.equal(d.calls.finish[0].result.duration,.02);assert.equal(d.calls.finish[0].result.cpuTotal,0);assert.equal(d.calls.finish[0].result.tied,false);
});
await check('four distinct stages, repeatable attempt seed and devil',async()=>{
 for(const stageId of ['broforce-jungle','broforce-factory','broforce-city','broforce-desert']){
  const a=setup({stageId,attemptId:'stable-attempt'}),b=setup({stageId,attemptId:'stable-attempt'});await a.run();b.s.seed='different-session-after-reload';await b.run();
  assert.deepEqual(plain(a.s.debug.attempt),plain(b.s.debug.attempt));assert.equal(a.calls.generated[0].stageId,stageId);assert.equal(a.calls.create.length,1);
  assert.deepEqual(a.calls.create[0].players.map(p=>p.fighterId),['sean','amber']);
  assert.deepEqual(a.calls.create[0].players.map(p=>p.fighters),[['sean','amber','alpha'],['sean','amber','beta']]);a.s.dispose();b.s.dispose();
 }
});
await check('fallback token bounded and reproducible',async()=>{
 const a=setup(),b=setup();await a.run();await b.run();assert.deepEqual(plain(a.s.debug.attempt),plain(b.s.debug.attempt));assert.ok(a.s.debug.attempt.attemptId.length<30);a.s.dispose();b.s.dispose();
});
await check('saved attempt and pending seed/devil preserved',async()=>{
 const attempt={attemptId:'saved',stageId:'broforce-jungle',seed:17,devilId:'devil-b'};
 const d=setup({run:{pending:{gameId:'broforce-jungle',bf:attempt}}});await d.run();assert.deepEqual(plain(d.s.debug.attempt),attempt);d.s.dispose();
});
await check('saved mismatch rejected without retry/reroll',async()=>{
 for(const attempt of [{attemptId:'x',stageId:'broforce-city'}, {attemptId:'x',devilId:'alpha'}, {stageId:'broforce-jungle'}, {attemptId:'x',devilId:'devil-a',seed:{}}, {attemptId:'x'.repeat(129)}, {attemptId:'x',stageId:'broforce-jungle'}]){
  const d=setup({attempt});await assert.rejects(d.run());assert.equal(d.calls.create.length,0);assert.equal(d.calls.finish.length,0);
 }
});
await check('no devil candidate completes once without loading mission',async()=>{
 const d=setup({exhausted:true,missing:true});const before=JSON.stringify(d.store);await d.run();assert.equal(d.calls.create.length,0);assert.equal(d.calls.finish.length,1);
 assert.equal(d.calls.finish[0].result.bf.devilId,null);assert.equal(d.calls.finish[0].result.won,false);assert.match(d.calls.pass.text,/No eligible locked devil/);assert.equal(JSON.stringify(d.store),before);
});
await check('intro cancellation, in-flight cancellation and late frames',async()=>{
 let release;const pending=setup({pass:()=>new Promise(resolve=>{release=resolve;})});const start=pending.run();
 pending.s.dispose();release(false);await start;assert.equal(pending.calls.finish.length,0);assert.equal(pending.calls.ambienceStop,1);
 const a=setup({pass:s=>{s.dispose();return false;}});await a.run();assert.equal(a.calls.finish.length,0);assert.equal(a.calls.ambienceStop,1);
 const b=setup();await b.run();b.step();const steps=b.calls.steps.length;b.s.dispose();b.step();assert.equal(b.calls.steps.length,steps);assert.equal(b.calls.finish.length,0);
 assert.equal(b.calls.images.every(i=>!i.src),true);assert.equal(b.shell.classList.contains('bf36-shell'),false);assert.equal(b.layer.classList.contains('bf36-layer'),false);
});
await check('future dependency failure removes scoped resources',async()=>{
 const d=setup({missing:true});await assert.rejects(d.run(),/Missing fixture/);assert.equal(d.shell.classList.contains('bf36-shell'),false);assert.equal(d.calls.finish.length,0);
});
await check('independent held jump/fire/action and menu guard with real BF-18',async()=>{
 const d=setup();await d.run();
 d.doc.emit('keydown',{key:'w',code:'KeyW'});d.doc.emit('keydown',{key:'Enter',code:'Enter'});d.doc.emit('keydown',{key:'e',code:'KeyE'});d.step();d.step();
 assert.equal(d.calls.steps[1].inputs[0].jumpHeld,true);assert.equal(d.calls.steps[1].inputs[0].actionHeld,true);assert.equal(d.calls.steps[1].inputs[0].specialPressed,false);
 assert.equal(d.calls.steps[1].inputs[1].fireHeld,true);assert.equal(d.calls.steps[1].inputs[1].actionHeld,false);
 d.s.resetInputs();d.doc.emit('keydown',{key:'Enter',code:'Enter',target:d.shell.querySelector('button')});d.step();assert.equal(d.calls.steps.at(-1).inputs[1].fireHeld,false);
 const b=d.button(1,'special');b.emit('pointerdown',{pointerId:12,clientX:250});d.step();d.step();assert.equal(d.calls.steps.at(-1).inputs[1].actionHeld,true);
 d.win.emit('pointerup',{pointerId:12});d.step();assert.equal(d.calls.steps.at(-1).inputs[1].actionHeld,false);d.s.dispose();
});
await check('Exit menu clears gameplay holds before directly paused dialog',async()=>{
 const d=setup();await d.run();d.doc.emit('keydown',{key:'e',code:'KeyE'});d.doc.emit('keydown',{key:' ',code:'Space'});
 const exit=d.shell.querySelector('[data-action]');d.shell.emit('pointerdown',{target:exit});d.s.paused=true;d.step();assert.equal(d.calls.steps.length,0);
 d.s.paused=false;d.step();assert.equal(d.calls.steps[0].inputs[0].actionHeld,false);assert.equal(d.calls.steps[0].inputs[0].fireHeld,false);d.s.dispose();
});
await check('pause, resize, visibility, reduced motion and camera continue safely',async()=>{
 const d=setup();await d.run();d.doc.emit('keydown',{key:'e',code:'KeyE'});d.s.paused=true;d.s.resetInputs();d.step();assert.equal(d.calls.steps.length,0);
 d.s.paused=false;d.step();assert.equal(d.calls.steps.at(-1).inputs[0].actionHeld,false);
 d.doc.emit('keydown',{key:' ',code:'Space'});d.s.W=780;d.s.H=390;d.step();assert.equal(d.calls.steps.at(-1).inputs[0].fireHeld,false);
 d.doc.hidden=true;d.doc.emit('visibilitychange');const n=d.calls.steps.length;d.step();assert.equal(d.calls.steps.length,n);d.doc.hidden=false;
 d.store.profile.settings.reducedMotion=true;d.step();assert.equal(d.calls.draw.at(-1).state.fx.reducedMotion,true);assert.equal(d.calls.draw.at(-1).time,0);
 assert.ok(d.calls.draw.at(-1).state.camera.zoom>0);assert.equal(d.calls.cinematic.camera.zoom,1);assert.ok(d.calls.pause>0);d.s.dispose();
});
await check('untrusted/mismatched terminal fails closed; never awards',async()=>{
 const d=setup({terminal:state=>({...terminal(state),bf:{...terminal(state).bf,devilId:'different'}})});await d.run();d.step();assert.equal(d.calls.finish.length,1);
 assert.equal(d.calls.finish[0].result.won,false);assert.deepEqual(d.calls.finish[0].scores,[0,0]);assert.match(d.calls.status,/Invalid Broforce terminal/);
});
await check('dead boarder earns no displayed success; timeout zero scores',async()=>{
 const a=setup({terminal:state=>terminal(state,[true,true],'extracted',[true,false])});await a.run();a.step();assert.deepEqual(a.calls.finish[0].scores,[1,0]);
 const b=setup({terminal:state=>terminal(state,[false,false],'timeout')});await b.run();b.step();assert.equal(b.calls.finish[0].result.bf.outcome,'timeout');assert.deepEqual(b.calls.finish[0].scores,[0,0]);
});
await check('BF-37 protected board attempt is used and completed extraction proof submitted before finish',async()=>{
 const attempt={schema:1,attemptId:'bf37:proof',gameId:'broforce-jungle',stageId:'broforce-jungle',seed:17,
  origin:'board',owners:['Sean','Amber'],fighterIds:['sean','amber'],devilId:'devil-b'};
 const d=setup({reward:attempt,attemptId:'wrong-fallback',terminal:state=>terminal(state,[true,false])});
 await d.run();assert.deepEqual(plain(d.s.debug.attempt),{attemptId:attempt.attemptId,stageId:attempt.stageId,seed:attempt.seed,devilId:attempt.devilId});
 d.step();assert.equal(d.calls.proofs.length,1);assert.equal(d.calls.proofs[0].devilId,'devil-b');
 assert.equal(d.calls.proofs[0].devilDefeated,true);assert.equal(d.calls.proofs[0].extraction.phase,'completed');
 assert.deepEqual(d.calls.proofs[0].extraction.boarded,[true,false]);assert.equal(d.calls.finish[0].result.won,true);
});
await check('BF-37 rejected helicopter evidence fails closed instead of displaying an awarded victory',async()=>{
 const attempt={schema:1,attemptId:'bf37:rejected',gameId:'broforce-jungle',stageId:'broforce-jungle',seed:18,
  origin:'board',owners:['Sean','Amber'],fighterIds:['sean','amber'],devilId:'devil-b'};
 const d=setup({reward:attempt,rejectProof:true,terminal:state=>terminal(state,[true,false])});
 await d.run();d.step();assert.equal(d.calls.proofs.length,1);assert.equal(d.calls.finish.length,1);
 assert.equal(d.calls.finish[0].result.won,false);assert.deepEqual(d.calls.finish[0].scores,[0,0]);
 assert.match(d.calls.status,/extraction proof/i);
});
console.log(`BROFORCE BF-36: ${count} deterministic checks passed. Future BF-28/30/31/32/29/33 are fixtures; not integrated gameplay.`);
