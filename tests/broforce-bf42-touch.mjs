// BF-42 Android/Fold ownership: event-level DOM fixture with the real touchInput event adapter.
// No engine/session or persistent reward mocks are used as evidence for gameplay integration.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

class Node {
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.style={};this.children=[];this.parentElement=null;this.listeners=new Map();this.attrs={};this.captured=new Set();this.className='';this.hidden=false;this.isContentEditable=false;this.classList={_set:new Set(),add(n){this._set.add(n);},remove(n){this._set.delete(n);},contains(n){return this._set.has(n);}};}
 appendChild(n){n.parentElement=this;this.children.push(n);return n;}
 contains(other){for(let n=other;n;n=n.parentElement)if(n===this)return true;return false;}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);this.parentElement=null;}
 addEventListener(t,fn){if(!this.listeners.has(t))this.listeners.set(t,[]);this.listeners.get(t).push(fn);}
 setAttribute(k,v){this.attrs[k]=String(v);}
 getAttribute(k){return this.attrs[k];}
 getBoundingClientRect(){return this.rect||this.parentElement?.getBoundingClientRect()||{left:10,top:0,width:390,height:780};}
 setPointerCapture(id){if(id<0)throw Error('touch compatibility id');this.captured.add(id);}
 hasPointerCapture(id){return this.captured.has(id);}
 releasePointerCapture(id){this.captured.delete(id);}
 emit(type,properties={}){const event={type,pointerId:0,pointerType:'touch',button:0,clientX:0,clientY:0,target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...properties};
  for(let el=this;el;el=el.parentElement){event.currentTarget=el;for(const f of el.listeners.get(type)||[])f(event);if(event.stopped)break;}return event;
 }
}
const load=(path,context)=>{const obj={};runInNewContext(readFileSync(new URL(path,import.meta.url),'utf8'),{...context,exports:obj});return obj;};
const controls=load('../src/engines/broforce/controls.js',{});
const EMPTY={move:0,jumpPressed:false,jumpHeld:false,fireHeld:false,specialPressed:false};
const same=(a,b,label)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),b,label);

function fixture(width,height,mode='pointer'){
 const win=new Node('window'),doc=new Node('document');doc.defaultView=win;doc.parentElement=win;doc.createElement=tag=>new Node(tag,doc);
 const body=doc.createElement('div'),frame=doc.createElement('div'),canvas=doc.createElement('canvas');doc.appendChild(body);body.appendChild(frame);frame.appendChild(canvas);frame.rect={left:10,top:0,width,height};
 const touchAdapter=load('../src/touchInput.js',{window:win,document:doc}); // adapter's globalThis is this VM context
 const resets=[],cleanups=[];let fits=0;
 const s={body,c:canvas,players:[{name:'Sean display'},{name:'Amber display'}],paused:false,alive:true,
  on(el,t,fn){return touchAdapter.listenGameInput(el,t,fn,{mode});},
  cleanup(fn){cleanups.push(fn);},resetOnPause(fn){resets.push(fn);},
  capture(ev){if(ev.pointerId>=0)canvas.setPointerCapture(ev.pointerId);},release(ev){if(ev.pointerId>=0&&canvas.hasPointerCapture(ev.pointerId))canvas.releasePointerCapture(ev.pointerId);},
  queueCanvasFit(){fits++;}
 };
 const api=controls.attachBroforceControls(s),overlay=frame.children.at(-1),sides=overlay.children;
 const stick=i=>sides[i].children.find(n=>n.className==='bf18-stick');
 const button=(i,k)=>sides[i].children.find(n=>n.className==='bf18-actions').children.find(n=>n.className==='bf18-action bf18-'+k);
 const center=r=>r.left+r.width/2;
 function position(){for(let i=0;i<2;i++){
  const pad=stick(i),size=parseFloat(pad.style.width),half=width/2;
  pad.rect={left:i===0?18:10+width-8-size,top:height-size-8,width:size,height:size};
  const actionWidth=parseFloat(button(i,'fire').style.width),cluster=actionWidth*2+3;
  const x=i===0?10+half-cluster-10:10+half+7;
  const top=height-cluster-8;
  for(const k of ['jump','special','fire']){const col=k==='jump'?0:1,row=k==='fire'?1:0;
   button(i,k).rect={left:x+col*(actionWidth+3),top:top+row*(actionWidth+3),width:actionWidth,height:actionWidth};}
 }}
 position();
 const ptr=(node,type,id,x=center(node.getBoundingClientRect()),props={})=>node.emit(type,{pointerId:id,clientX:x,...props});
 const touch=(node,type,id,x=center(node.getBoundingClientRect()))=>{
  const t={identifier:id,target:node,clientX:x,clientY:height-30};
  return node.emit(type,{changedTouches:[t],touches:type==='touchend'||type==='touchcancel'?[]:[t]});
 };
 return {s,win,doc,frame,canvas,api,overlay,stick,button,ptr,touch,resets,cleanups,position,setSize(w,h){width=w;height=h;frame.rect={left:10,top:0,width:w,height:h};win.emit('resize');position();},get fits(){return fits;}};
}

// Strict single-finger edge state and exact physical-owner retention across a midline drag.
for(const [w,h] of [[390,780],[780,390],[840,700]]){
 const f=fixture(w,h),{api,stick,button,ptr,canvas,win}=f;
 assert.equal(canvas.style.touchAction,'none','canvas blocks scroll stealing');
 assert.equal(f.overlay.style.touchAction,'none','overlay blocks scroll stealing');
 for(let i=0;i<2;i++){
  assert.ok(parseFloat(stick(i).style.width)>=44,`P${i+1} stick ${w}x${h}`);
  for(const k of ['jump','fire','special']){
   assert.ok(parseFloat(button(i,k).style.width)>=44,`P${i+1} ${k} 44px touch target at ${w}x${h}`);
   assert.equal(button(i,k).style.touchAction,'none');
  }
 }
 const p1=stick(0).getBoundingClientRect(),p2=stick(1).getBoundingClientRect();
 const d1=ptr(stick(0),'pointerdown',11,p1.left+1),d2=ptr(stick(1),'pointerdown',21,p2.left+p2.width-1);
 assert.equal(d1.defaultPrevented,true);assert.equal(d2.defaultPrevented,true);
 ptr(button(0,'jump'),'pointerdown',12);
 ptr(button(0,'fire'),'pointerdown',13);
 ptr(button(1,'fire'),'pointerdown',22);
 ptr(button(1,'special'),'pointerdown',23);
 same(api.sample(),[{move:-1,jumpPressed:true,jumpHeld:true,fireHeld:true,specialPressed:false},{move:1,jumpPressed:false,jumpHeld:false,fireHeld:true,specialPressed:true}],`${w}x${h} simultaneous six inputs`);
 for(let i=0;i<6;i++)same(api.sample(),[{move:-1,jumpPressed:false,jumpHeld:true,fireHeld:true,specialPressed:false},{move:1,jumpPressed:false,jumpHeld:false,fireHeld:true,specialPressed:false}],'held special never auto-repeats');
 // Pointer leave with capture must retain ownership and held state.
 ptr(stick(0),'pointerleave',11,w+100);ptr(stick(1),'pointerleave',21,-100);
 const mv1=ptr(stick(0),'pointermove',11,p1.left+p1.width+70),mv2=ptr(stick(1),'pointermove',21,p2.left-70);
 assert.equal(mv1.defaultPrevented,true);assert.equal(mv2.defaultPrevented,true);
 same(api.sample(),[{move:1,jumpPressed:false,jumpHeld:true,fireHeld:true,specialPressed:false},{move:-1,jumpPressed:false,jumpHeld:false,fireHeld:true,specialPressed:false}],`drag crosses owners ${w}x${h}`);
 ptr(button(1,'fire'),'lostpointercapture',22);assert.equal(api.sample()[1].fireHeld,false,'lost capture releases only the lost action');
 assert.equal(api.sample()[0].fireHeld,true,'other owner still firing');
 ptr(button(0,'jump'),'pointercancel',12);assert.equal(api.sample()[0].jumpHeld,false,'cancel jump independently');
 ptr(button(1,'special'),'pointerup',23);ptr(button(1,'special'),'pointerdown',24);
 assert.equal(api.sample()[1].specialPressed,true,'new special press after physical release fires one edge');
 ptr(button(1,'special'),'pointerup',24);ptr(button(0,'fire'),'pointerup',13);
 ptr(stick(0),'pointerup',11);ptr(stick(1),'pointerup',21);same(api.sample(),[EMPTY,EMPTY],'final neutral');
 api.dispose();
}

// Display zoom decreases CSS viewport width: 44 CSS px is the minimum here.
{
 const f=fixture(320,600);
 for(let i=0;i<2;i++)for(const k of ['jump','fire','special'])
  assert.ok(parseFloat(f.button(i,k).style.width)>=44,`zoom P${i+1} ${k} target >= 44px`);
 f.api.dispose();
}

// Canvas gesture moves must never be reassigned to the other player; cancels are local.
{
 const f=fixture(840,700),{canvas,win,ptr,api}=f;
 const one=ptr(canvas,'pointerdown',31,90),two=ptr(canvas,'pointerdown',32,740);
 assert.ok(one.defaultPrevented&&two.defaultPrevented,'canvas down default prevented');
 ptr(win,'pointermove',31,780);ptr(win,'pointermove',32,30);
 assert.equal(api.sample()[0].move,1);assert.equal(api.sample()[1].move,-1);
 ptr(win,'pointercancel',31);assert.equal(api.sample()[0].move,0);assert.equal(api.sample()[1].move,-1);
 ptr(win,'pointerup',32);same(api.sample(),[EMPTY,EMPTY]);f.api.dispose();
}

// Real session adapter fallback: touchstart/move/end with independent changed touch IDs.
{
 const f=fixture(390,780,'touch'),{touch,stick,button,api}=f;
 touch(stick(0),'touchstart',101,19);touch(stick(1),'touchstart',202,379);
 touch(button(0,'jump'),'touchstart',102);touch(button(0,'fire'),'touchstart',103);
 touch(button(1,'fire'),'touchstart',203);touch(button(1,'special'),'touchstart',204);
 let a=api.sample();assert.equal(a[0].move,-1);assert.equal(a[1].move,1);assert.equal(a[0].jumpPressed,true);assert.equal(a[0].fireHeld,true);assert.equal(a[1].fireHeld,true);assert.equal(a[1].specialPressed,true);
 // In touch fallback, native pointer events from the same touches must not produce second presses.
 f.ptr(button(1,'special'),'pointerdown',204,undefined,{pointerType:'touch'});
 assert.equal(api.sample()[1].specialPressed,false,'touch/pointer event streams are not doubled');
 touch(stick(0),'touchmove',101,350);touch(stick(1),'touchmove',202,20);
 a=api.sample();assert.equal(a[0].move,1);assert.equal(a[1].move,-1);
 touch(button(1,'fire'),'touchcancel',203);assert.equal(api.sample()[1].fireHeld,false);assert.equal(api.sample()[0].fireHeld,true);
 for(const [n,id] of [[stick(0),101],[stick(1),202],[button(0,'jump'),102],[button(0,'fire'),103],[button(1,'special'),204]])touch(n,'touchend',id);
 same(api.sample(),[EMPTY,EMPTY],'synthetic touch clears');f.api.dispose();
}

// Focus gating must not hijack inputs, native button activation, shortcuts or text editing.
{
 const f=fixture(390,780),{doc,api,button}=f;
 const key=(t,key,code,target=doc,extra={})=>doc.emit(t,{key,code,target,...extra});
 const field=doc.createElement('input'),buttonUI=doc.createElement('button'),link=doc.createElement('a');
 const editable=doc.createElement('div');editable.isContentEditable=true;const child=doc.createElement('span');editable.appendChild(child);
 for(const target of [field,buttonUI,link,child]){
  key('keydown',' ','Space',target);key('keydown','Enter','Enter',target);key('keydown','w','KeyW',target);
  same(api.sample(),[EMPTY,EMPTY],'focusable UI does not create gameplay input');
 }
 doc.activeElement=buttonUI;
 key('keydown',' ','Space');same(api.sample(),[EMPTY,EMPTY],'document-level key also respects currently focused element');
 doc.activeElement=null;
 key('keydown','w','KeyW');key('keydown',' ','Space');key('keydown','ArrowRight','ArrowRight');key('keydown','Enter','Enter');
 let a=api.sample();assert.equal(a[0].jumpPressed,true);assert.equal(a[0].fireHeld,true);assert.equal(a[1].move,1);assert.equal(a[1].fireHeld,true);
 // Existing held keys always release, even if focus moved mid-press.
 key('keyup','w','KeyW',field);key('keyup',' ','Space',field);key('keyup','ArrowRight','ArrowRight',field);key('keyup','Enter','Enter',field);
 same(api.sample(),[EMPTY,EMPTY],'keyup unfocus cleanup');
 key('keydown','e','KeyE',doc,{ctrlKey:true});same(api.sample(),[EMPTY,EMPTY],'modified app shortcuts ignored');
 key('keydown','e','KeyE');assert.equal(api.sample()[0].specialPressed,true);
 f.win.emit('blur');same(api.sample(),[EMPTY,EMPTY],'blur clears pending/holds');
 key('keyup','e','KeyE');same(api.sample(),[EMPTY,EMPTY]);api.dispose();
}

// Resize, fold/rotate, visibility and pause must drop all held keys/pointers without phantom edges.
{
 const f=fixture(390,780),{ptr,stick,button,api,doc,win,s,resets}=f;
 ptr(stick(0),'pointerdown',71,19);ptr(button(1,'special'),'pointerdown',72);
 f.setSize(780,390);same(api.sample(),[EMPTY,EMPTY],'landscape rotation clears held pointers');
 ptr(button(0,'fire'),'pointerdown',73);f.setSize(840,700);same(api.sample(),[EMPTY,EMPTY],'unfold changes CSS rect clears input');
 ptr(button(0,'jump'),'pointerdown',74);win.emit('orientationchange');same(api.sample(),[EMPTY,EMPTY],'orientation even before bounding box changes');
 ptr(button(1,'fire'),'pointerdown',75);doc.hidden=true;doc.emit('visibilitychange');same(api.sample(),[EMPTY,EMPTY],'background clears touches');
 doc.hidden=false;ptr(button(1,'special'),'pointerdown',76);s.paused=true;for(const fn of resets)fn();same(api.sample(),[EMPTY,EMPTY],'pause clears queued special edge');
 s.paused=false;ptr(button(0,'jump'),'pointerdown',77);s.alive=false;same(api.sample(),[EMPTY,EMPTY],'finished/disposed session neutral');api.dispose();
}
console.log('BF-42: PASS — pointer and touch adapter multi-owner input, drag/cancel, zoom targets, keyboard focus, lifecycle, 3 layouts');
