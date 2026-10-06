// Android browsers and embedded viewers do not always expose the same pointer
// stream. Touch mode keeps every changed touch, with stable independent IDs.
function inputMode(preference='auto',environment=globalThis) {
 const touch=typeof environment.TouchEvent==='function'||'ontouchstart' in environment;
 if(preference==='pointer')return 'pointer';
 if(preference==='touch')return touch?'touch':'pointer';
 return touch&&(Number(environment.navigator?.maxTouchPoints)>0||'ontouchstart' in environment||typeof environment.PointerEvent!=='function')?'touch':'pointer';
}
const touchEvents={pointerdown:'touchstart',pointermove:'touchmove',pointerup:'touchend',pointercancel:'touchcancel'};
function listenGameInput(element,event,callback,{signal,mode='pointer'}={}) {
 const options={signal,...(/^(pointer|touch)/.test(event)?{passive:false}:{})};
 const pointer=ev=>{if(event.startsWith('pointer')&&mode==='touch'&&(ev.pointerType==='touch'||ev.sourceCapabilities?.firesTouchEvents))return;return callback(ev);};
 element.addEventListener(event,pointer,options);
 // A lost capture must release held steering just like a cancelled pointer.
 if(event==='pointercancel')element.addEventListener('lostpointercapture',pointer,{signal});
 if(mode==='touch'&&touchEvents[event])element.addEventListener(touchEvents[event],ev=>{
  for(const touch of Array.from(ev.changedTouches||[])){
   if(touch.target&&touch.target!==element&&element!==globalThis.document&&element!==globalThis.window&&!element.contains?.(touch.target))continue;
   callback({type:event,pointerId:-2-touch.identifier,pointerType:'touch',isPrimary:ev.touches?.[0]?.identifier===touch.identifier,
    clientX:touch.clientX,clientY:touch.clientY,pageX:touch.pageX,pageY:touch.pageY,
    button:0,buttons:event==='pointerup'||event==='pointercancel'?0:1,
    target:touch.target||ev.target,currentTarget:element,timeStamp:ev.timeStamp,
    preventDefault:()=>ev.preventDefault(),stopPropagation:()=>ev.stopPropagation?.(),originalEvent:ev});
  }
 },{signal,passive:false});
 return element;
}

Object.assign(exports,{inputMode,listenGameInput});