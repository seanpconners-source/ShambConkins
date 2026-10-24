const {store}=require("src/state.js");
const {escapeHTML:e}=require("src/utils.js");
const {laneStyle,laneKey}=require("src/boardZones.js");
const {netRoute}=require("src/netHooks.js");
const {cpuRoute}=require("src/cpuHooks.js");
// The fork chooser. It docks under the map instead of covering it: the roads stay
// visible, and tapping an option lights up that road on the map before you commit.
let current=null;
function highlight(keys){
 const set=new Set([].concat(keys||[]).filter(Boolean));
 for(const node of document.querySelectorAll('#map-root .jr-lane,#map-root .jr-panel,#map-root .jr-banner,#map-root .jr-bridge')){
  const k=node.dataset.laneKey||'',on=set.has(k);node.classList.toggle('glow',on&&!node.classList.contains('jr-banner'));node.classList.toggle('dim',set.size>0&&!on);
 }
}
function optionView(run,from,option,index){
 const target=run.board.nodes[option.id],lane=run.board.realms[target.realm]?.lanes?.find(l=>l.ids.includes(target.id)),isBridge=!!from.bridge&&from.bridge===target.id,isShortcut=!!from.shortcut&&from.shortcut===target.id;
 const keys=isShortcut?[target.realm+':shortcut:'+target.id,laneKey(run.board,target)]:isBridge?[target.realm+':bridge:'+target.id,laneKey(run.board,target)]:[laneKey(run.board,target)];
 return {...option,keys,bridge:isBridge,shortcut:isShortcut,lane,color:isShortcut?'#ffd34d':isBridge?'#8a6b3f':laneStyle(lane?.lane??0).tag,tag:isShortcut?'SHORTCUT':isBridge?'BRIDGE':(lane?laneStyle(lane.lane).label:'MAIN ROAD'),index};
}
function render(){
 const panel=document.getElementById('route-panel');if(!panel||!current)return;
 const {title,hint,options,selected,watch}=current;
 panel.innerHTML=`<div class="rp-head"><b>${e(title)}</b><small>${e(watch||hint)}</small></div><div class="rp-options" style="--n:${options.length}">${options.map((o,i)=>`<button class="rp-option ${i===selected?'selected':''}" data-action="route-preview" data-id="${i}" style="--tag:${o.color}" ${o.disabled||watch?'disabled':''}><span class="rp-tag">${o.disabled?'🔒 BLOCKED · ':''}${e(o.tag)}</span><b>${e(o.label)}</b><small>${e(o.sub)}</small>${o.journey?`<em>★ ${e(o.journey)}</em>`:''}</button>`).join('')}</div><div class="rp-actions"><button class="primary" data-action="route-go" ${selected<0||watch?'disabled':''}>${watch?'WAITING…':'GO THIS WAY'}</button></div>`;
}
// Online board game: the other phone's player chooses on their own phone (src/netBoard.js); 1P: the CPU picks (src/cpuBoard.js).
function showRoutePanel(opts){return netRoute(opts)||cpuRoute(opts)||openRoutePanel(opts);}
// watch: read-only while the other phone chooses (its taps light up the roads here through routePreview).
// onPreview(i): called when this phone's player lights up a road.
function openRoutePanel({title,hint,options,watch='',onPreview=null}){
 closeRoutePanel();
 const panel=document.getElementById('route-panel');if(!panel)return Promise.resolve(options.find(o=>!o.disabled)?.value??null);
 return new Promise(resolve=>{
  const selected=Math.max(0,options.findIndex(o=>!o.disabled));
  current={title,hint,options,selected,resolve,watch,onPreview};render();
  panel.hidden=false;document.body.classList.add('route-choosing');highlight(options[selected]?.keys);
  window.dispatchEvent(new Event('resize'));
 });
}
function closeRoutePanel(value=null){
 if(!current)return;const {resolve}=current;current=null;
 const panel=document.getElementById('route-panel');if(panel){panel.hidden=true;panel.innerHTML='';}
 document.body.classList.remove('route-choosing');highlight(null);window.dispatchEvent(new Event('resize'));resolve(value);
}
function routePanelAction(name,target){
 if(name==='route-preview'&&current){const i=+target.dataset.id;if(current.watch||!current.options[i]||current.options[i].disabled)return true;routePreview(i);current.onPreview?.(i);return true;}
 if(name==='route-go'&&current){if(current.watch)return true;const o=current.options[current.selected];if(o&&!o.disabled)closeRoutePanel(o.value);return true;}
 return false;
}
function routePreview(i){if(!current?.options[i]||current.options[i].disabled)return;current.selected=i;render();highlight(current.options[i].keys);}
const routePanelOpen=()=>!!current;
Object.assign(exports,{optionView,showRoutePanel,openRoutePanel,routePreview,closeRoutePanel,routePanelAction,routePanelOpen,highlightLane:highlight});
