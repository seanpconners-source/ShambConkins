// BF-18 isolated deterministic tests; runs before module registration / full engine integration.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../src/engines/broforce/controls.js',import.meta.url),'utf8');
const moduleExports={};runInNewContext(source,{exports:moduleExports});
const {createBroforceInputState,attachBroforceControls}=moduleExports;
const EMPTY={move:0,jumpPressed:false,jumpHeld:false,fireHeld:false,specialPressed:false};
function same(actual,expected,label){assert.deepEqual(JSON.parse(JSON.stringify(actual)),expected,label);}
{
 const state=createBroforceInputState();same(state.sample(),[EMPTY,EMPTY],'initial neutral and exactly two objects');
 state.setMove(0,'left',-1);state.setMove(1,'right',1);state.press(0,'jump','one');state.press(0,'jump','two');state.press(0,'fire','one');state.press(1,'special','one');
 same(state.sample(),[{move:-1,jumpPressed:true,jumpHeld:true,fireHeld:true,specialPressed:false},{move:1,jumpPressed:false,jumpHeld:false,fireHeld:false,specialPressed:true}],'two-player multihold');
 same(state.sample(),[{move:-1,jumpPressed:false,jumpHeld:true,fireHeld:true,specialPressed:false},{...EMPTY,move:1}],'one-shot press edges');
 state.release(0,'jump','one');state.press(0,'jump','two');assert.equal(state.sample()[0].jumpPressed,false,'repeat/second held source does not retrigger');
 state.release(0,'jump','two');state.press(0,'jump','three');state.press(1,'special','one');assert.equal(state.sample()[0].jumpPressed,true,'new physical down retriggers');assert.equal(state.sample()[1].specialPressed,false,'special repeat does not retrigger');
 state.setMove(0,'right',1);assert.equal(state.sample()[0].move,0,'opposing keys cancel');state.setMove(0,'left',0);assert.equal(state.sample()[0].move,1,'release one move source retains other');
 state.clear();same(state.sample(),[EMPTY,EMPTY],'clear drops pending edges and holds');
 state.press(0,'special','a');state.release(0,'special','a');assert.equal(state.sample()[0].specialPressed,true,'quick tap survives between frames');assert.equal(state.sample()[0].specialPressed,false,'tap edge still consumed once');
 state.press(4,'jump','invalid');same(state.sample(),[EMPTY,EMPTY],'invalid owner ignored');
}
class Element {
 constructor(tag,ownerDocument){this.tagName=tag.toUpperCase();this.ownerDocument=ownerDocument;this.style={};this.children=[];this.parentElement=null;this.listeners=new Map();this.attrs={};this.captured=new Set();this.className='';this.hidden=false;this.isContentEditable=false;this.textContent='';this.classList={set:new Set(),add:k=>this.classList.set.add(k),remove:k=>this.classList.set.delete(k),contains:k=>this.classList.set.has(k)};}
 appendChild(el){this.children.push(el);el.parentElement=this;return el;}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);this.parentElement=null;}
 setAttribute(k,v){this.attrs[k]=v;}
 getAttribute(k){return this.attrs[k];}
 addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(fn);}
 emit(name,data={}){const ev={type:name,target:this,preventDefault(){this.defaultPrevented=true;},pointerId:0,clientX:0,clientY:0,pointerType:'touch',button:0,...data};for(const fn of this.listeners.get(name)||[])fn(ev);return ev;}
 setPointerCapture(id){this.captured.add(id);}hasPointerCapture(id){return this.captured.has(id);}releasePointerCapture(id){this.captured.delete(id);}
 getBoundingClientRect(){return this.rect||this.parentElement?.getBoundingClientRect()||{left:0,top:0,width:390,height:780};}
}
function fakeSession(w=390,h=780){
 const doc=new Element('document');const win=new Element('window');doc.defaultView=win;doc.createElement=tag=>new Element(tag,doc);
 const body=doc.createElement('div'),frame=doc.createElement('div'),canvas=doc.createElement('canvas');frame.rect={left:10,top:5,width:w,height:h};frame.appendChild(canvas);body.appendChild(frame);canvas.ownerDocument=doc;
 const cleanups=[],resets=[];let changes=0;
 const s={c:canvas,body,players:[{name:'P1'},{name:'P2'}],paused:false,alive:true,on(target,event,fn){target.addEventListener(event,fn);},cleanup(fn){cleanups.push(fn);},resetOnPause(fn){resets.push(fn);},capture(ev){canvas.setPointerCapture(ev.pointerId);},release(ev){canvas.releasePointerCapture(ev.pointerId);},queueCanvasFit(){},pointer(ev){return {x:ev.clientX-10,y:ev.clientY-5};}};
 const api=attachBroforceControls(s,{onChange(){changes++;}});
 const overlay=frame.children.at(-1),sides=overlay.children,stick=i=>sides[i].children.find(c=>c.className==='bf18-stick'),btn=(i,type)=>sides[i].children.find(c=>c.className==='bf18-actions').children.find(c=>c.className==='bf18-action bf18-'+type);
 // The pad is at the outside of its owner's half in actual layout.
 stick(0).rect={left:18,top:650,width:80,height:80};stick(1).rect={left:300,top:650,width:80,height:80};
 const point=(id,x,target,event='pointerdown')=>target.emit(event,{pointerId:id,clientX:x});
 return {s,doc,win,frame,canvas,overlay,stick,btn,api,point,cleanups,resets,getChanges(){return changes;}};
}
{
 const d=fakeSession(),{api,point,btn,stick,win,s}=d;
 const initial=api.sample();same(initial,[EMPTY,EMPTY],'session idle');
 assert.equal(d.frame.style.position,'relative');assert.equal(s.c.style.touchAction,'none');
 assert.equal(s.body.classList.contains('drag-arena-body'),true,'full-bleed canvas layout activated');
 point(1,26,stick(0));point(2,138,btn(0,'jump'));point(3,360,stick(1));point(4,222,btn(1,'fire'));
 point(5,146,btn(0,'fire'));point(6,230,btn(1,'special'));point(14,146,btn(0,'fire'));
 let x=api.sample();assert.equal(x[0].jumpPressed,true);assert.equal(x[0].fireHeld,true);assert.equal(x[1].fireHeld,true);assert.equal(x[1].specialPressed,true);
 assert.equal(x[0].move,-1);assert.equal(x[1].move,1);
 assert.equal(btn(1,'special').getAttribute('aria-pressed'),'true','button has accessible feedback');
 point(1,370,win,'pointermove');point(3,15,win,'pointermove');
 x=api.sample();assert.equal(x[0].move,1,'P1 stays P1 despite dragging into right physical half');assert.equal(x[1].move,-1,'P2 stays P2 despite dragging into left physical half');
 assert.equal(x[0].jumpPressed,false);assert.equal(x[1].specialPressed,false,'edges consumed once');
 point(2,138,win,'pointerup');point(4,222,win,'pointercancel');
 x=api.sample();assert.equal(x[0].jumpHeld,false,'jump released');assert.equal(x[1].fireHeld,false,'cancel releases just owned source');assert.equal(x[0].fireHeld,true,'other player/source still active');
 point(5,146,win,'pointerup');assert.equal(api.sample()[0].fireHeld,true,'same-action second finger keeps fire held');point(14,146,win,'pointerup');point(6,230,win,'pointerup');point(1,370,win,'pointerup');point(3,15,win,'pointerup');same(api.sample(),[EMPTY,EMPTY],'all pointers released');
 point(7,30,stick(0));point(8,360,stick(1));assert.notDeepEqual(api.sample(),[EMPTY,EMPTY]);win.emit('blur');same(api.sample(),[EMPTY,EMPTY],'blur clears both');assert.equal(stick(0).captured.size,0,'captured pointers released on blur');
 point(9,140,btn(0,'jump'));s.paused=true;for(const fn of d.resets)fn();same(api.sample(),[EMPTY,EMPTY],'pause drops press edge');s.paused=false;
 point(10,140,btn(0,'jump'));point(11,222,btn(1,'jump'));d.frame.rect.width=780;d.frame.rect.height=390;win.emit('resize');same(api.sample(),[EMPTY,EMPTY],'resize / rotation clears held states');
 point(12,130,btn(0,'fire'));win.emit('orientationchange');same(api.sample(),[EMPTY,EMPTY],'orientationchange clears held states');
 api.dispose();same(api.sample(),[EMPTY,EMPTY],'disposal neutral forever');assert.equal(d.frame.children.includes(d.overlay),false,'overlay removed');assert.equal(d.frame.style.position,undefined,'inline frame style restored');assert.equal(s.c.style.touchAction,undefined,'inline canvas style restored');assert.equal(s.body.classList.contains('drag-arena-body'),false,'session layout class restored');
 point(13,100,btn(0,'fire'));same(api.sample(),[EMPTY,EMPTY],'disposed ignores all late inputs');api.dispose();
 assert.ok(d.getChanges()>0,'change notification delivered');
}
{
 const d=fakeSession(780,390),{api,point,canvas,win,doc}=d;
 point(21,120,canvas);point(22,550,canvas);point(21,710,win,'pointermove');point(22,40,win,'pointermove');
 same(api.sample(),[{...EMPTY,move:1},{...EMPTY,move:-1}],'full-canvas free gesture retains initial physical owner');
 point(21,710,win,'pointercancel');assert.equal(api.sample()[0].move,0);assert.equal(api.sample()[1].move,-1,'cancel only affected touch');
 point(22,40,win,'pointerup');same(api.sample(),[EMPTY,EMPTY]);
 point(23,140,d.btn(0,'jump'));doc.hidden=true;doc.emit('visibilitychange');same(api.sample(),[EMPTY,EMPTY],'visibility clears');
 api.dispose();
}
{
 const d=fakeSession(),{api,doc,s}=d;
 const key=(type,key,code,target=doc,extra={})=>doc.emit(type,{key,code,target,...extra});
 key('keydown','a','KeyA');key('keydown','w','KeyW');key('keydown',' ','Space');key('keydown','e','KeyE');
 key('keydown','ArrowRight','ArrowRight');key('keydown','ArrowUp','ArrowUp');key('keydown','Enter','Enter');key('keydown','Shift','ShiftLeft');
 same(api.sample(),[{move:-1,jumpPressed:true,jumpHeld:true,fireHeld:true,specialPressed:true},{move:1,jumpPressed:true,jumpHeld:true,fireHeld:true,specialPressed:true}],'documented simultaneous keyboard mappings');
 key('keydown','w','KeyW',{...doc},{repeat:true});same(api.sample(),[{move:-1,jumpPressed:false,jumpHeld:true,fireHeld:true,specialPressed:false},{move:1,jumpPressed:false,jumpHeld:true,fireHeld:true,specialPressed:false}],'repeat edge suppression');
 key('keydown','d','KeyD');assert.equal(api.sample()[0].move,0,'A+D opposing cancellation');key('keyup','a','KeyA');assert.equal(api.sample()[0].move,1,'D held after A release');
 key('keyup','w','KeyW');key('keydown','w','KeyW');assert.equal(api.sample()[0].jumpPressed,true,'new keydown edges');
 const field=doc.createElement('input');key('keydown','ArrowLeft','ArrowLeft',field);key('keydown','e','KeyE',field);assert.equal(api.sample()[1].move,1,'typing input is ignored');
 const editing=doc.createElement('div');editing.isContentEditable=true;const nested=doc.createElement('span');editing.appendChild(nested);key('keydown','a','KeyA',nested);assert.equal(api.sample()[0].move,1,'contenteditable ancestor not intercepted');
 key('keydown','ArrowLeft','ArrowLeft',doc,{ctrlKey:true});assert.equal(api.sample()[1].move,1,'modified shortcuts untouched');
 key('keyup','a','KeyA');key('keyup','d','KeyD');key('keyup','w','KeyW');key('keyup',' ','Space');key('keyup','e','KeyE');
 key('keyup','ArrowRight','ArrowRight');key('keyup','ArrowUp','ArrowUp');key('keyup','Enter','Enter');key('keyup','Shift','ShiftLeft');same(api.sample(),[EMPTY,EMPTY],'keyboard release all');
 key('keydown','Shift','ShiftLeft');key('keydown','Shift','ShiftRight');assert.equal(api.sample()[1].specialPressed,true);key('keyup','Shift','ShiftLeft');key('keyup','Shift','ShiftRight');same(api.sample(),[EMPTY,EMPTY],'both shift sources balanced');
 s.paused=true;key('keydown','w','KeyW');same(api.sample(),[EMPTY,EMPTY],'keyboard blocked during pause');api.dispose();
}
console.log('BF-18 controls: PASS (pure input state, 6+ multitouches, touch ownership, desktop mappings, lifecycle, resize, accessibility)');
