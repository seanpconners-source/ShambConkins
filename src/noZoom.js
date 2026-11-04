// No browser zoom anywhere (owner, Nov 4: "you can pinch to zoom on the menus... shouldn't happen, in games too"). The page
// is a game screen, not a document: a pinch, a double tap, a trackpad pinch (ctrl + wheel) or iOS's gesture events must not
// scale the page. The board's own pinch/wheel zoom is untouched: it reads pointer events on #map-root (touch-action:none
// there) and handles its own wheel. The viewport tag also says maximum-scale=1, user-scalable=no (index.template.html).
function installNoZoom(){if(typeof document==='undefined')return;
 const st=document.createElement('style');// every element may pan but not zoom (also stops double-tap zoom without blocking fast taps); elements that set their own
 // touch-action (canvases, the board, swipe rows) keep it: a class rule beats `*`
 st.textContent='*{touch-action:pan-x pan-y}html{-webkit-text-size-adjust:100%;text-size-adjust:100%}';document.head.append(st);
 // two fingers moving: never a page zoom (single-finger scrolling is left alone)
 document.addEventListener('touchmove',ev=>{if(ev.touches.length>1&&ev.cancelable)ev.preventDefault();},{passive:false});
 // iOS Safari ignores user-scalable=no; its own pinch comes as gesture events
 for(const t of ['gesturestart','gesturechange','gestureend'])document.addEventListener(t,ev=>ev.preventDefault(),{passive:false});
 // trackpad pinch on a laptop = ctrl + wheel; the board map zooms itself on the wheel already
 document.addEventListener('wheel',ev=>{if(ev.ctrlKey&&ev.cancelable)ev.preventDefault();},{passive:false});
}
Object.assign(exports,{installNoZoom});
