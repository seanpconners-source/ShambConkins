const {store}=require("src/state.js");
// Measure the visible area, including mobile browser chrome and split screen.
// Panels own their scroll areas. Never measure a scrolling list or a large image
// to zoom its entire screen: that made each vault page a different size.
function surfaceScale(width,height,availableWidth,availableHeight){return Math.max(.1,Math.min(1,availableWidth/Math.max(1,width),availableHeight/Math.max(1,height)));}
let scheduled=false,mapResize=null;
function clearScale(surface){if(!surface)return;surface.style.zoom='1';surface.style.transform='';delete surface.dataset.fitScale;}
function fitViewport(){scheduled=false;const visual=window.visualViewport,width=Math.floor(visual?.width||window.innerWidth||document.documentElement?.clientWidth||900),height=Math.floor(visual?.height||window.innerHeight||document.documentElement?.clientHeight||800);const style=document.documentElement?.style;if(!style?.setProperty)return;style.setProperty('--viewport-height',height+'px');style.setProperty('--viewport-width',width+'px');
 const map=document.getElementById('map-root'),mapRect=map?.getBoundingClientRect();if(mapRect?.height>0){const aspect=mapRect.width/mapRect.height;if(Math.abs(aspect-(store.mapAspect||0))>.01){store.mapAspect=aspect;mapResize?.();}}clearScale(document.getElementById('app')?.children[0]);
 clearScale(document.querySelector('.game-shell'));
 const dialog=document.getElementById('dialog');if(dialog?.open){clearScale(dialog);clearScale(dialog.querySelector('.dialog-content'));}
}
function queueViewportFit(){if(scheduled)return;scheduled=true;requestAnimationFrame(fitViewport);}
function installViewport(onMapResize=null){mapResize=onMapResize;fitViewport();window.addEventListener('resize',queueViewportFit);window.addEventListener('orientationchange',queueViewportFit);window.visualViewport?.addEventListener('resize',queueViewportFit);window.visualViewport?.addEventListener('scroll',queueViewportFit);if(typeof MutationObserver!=='undefined'){const observer=new MutationObserver(queueViewportFit);observer.observe(document.getElementById('app'),{childList:true,subtree:true});observer.observe(document.getElementById('game-layer'),{childList:true,subtree:true});observer.observe(document.getElementById('dialog'),{childList:true,subtree:true});}}

Object.assign(exports,{surfaceScale,fitViewport,queueViewportFit,installViewport});