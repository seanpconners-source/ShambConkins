// Kingpin Bowling: the alley screen before an Arcade game (DOM over the 3D alley, like Paddy's Pool Hall): pick the game
// length and bowl, or spend the alley's cash: upgrade each PART of the alley one era at a time (the 3D alley behind changes as
// you look at an upgrade), buy balls (they play differently), shoes, decor and perks. src/data/bowlAlley.js holds the catalog.
const AL=require("src/data/bowlAlley.js");
const SC=require("src/engines/bowl/scene.js");
const SP=require("src/data/bowlSprites.js");
const CSS=`.bw-shop{position:absolute;inset:0;z-index:8;display:flex;flex-direction:column;justify-content:flex-end;pointer-events:none;font-family:system-ui,sans-serif;color:#f5efe2}
.bw-shop *{box-sizing:border-box}
.bw-top{pointer-events:auto;position:absolute;left:8px;top:8px;right:150px;display:flex;align-items:center;gap:10px}
.bw-logo{font:900 22px/1 "Arial Black",Impact,sans-serif;color:#ffd23f;text-shadow:0 2px 0 #7a2b00,0 0 12px rgba(255,140,0,.5);letter-spacing:1px}
.bw-logo img{height:46px;display:block}
.bw-cash{background:#000b;border:1px solid #ffd23f88;border-radius:999px;padding:4px 10px;font-weight:800;color:#9fe39f;white-space:nowrap}
.bw-panel{pointer-events:auto;background:linear-gradient(#17120ef2,#0b0908f8);border-top:2px solid #ffd23f66;max-height:58%;display:flex;flex-direction:column}
.bw-tabs{display:flex;gap:2px;overflow-x:auto;padding:6px 6px 0;scrollbar-width:none}
.bw-tabs button{flex:0 0 auto;background:#2a211a;color:#d8cbb4;border:0;border-radius:10px 10px 0 0;padding:8px 12px;font-weight:800;font-size:13px;min-height:0}
.bw-tabs button.on{background:#ffd23f;color:#2a1605}
.bw-body{overflow-y:auto;padding:10px;display:grid;gap:8px;border-top:2px solid #ffd23f}
.bw-row{display:flex;align-items:center;gap:10px;background:#231b15;border:1px solid #3a2e24;border-radius:12px;padding:8px 10px}
.bw-row.sel{border-color:#ffd23f;background:#2e2416}
.bw-row .bw-t{flex:1;min-width:0}.bw-row b{display:block;font-size:15px}.bw-row small{display:block;color:#bfb29c;font-size:12px;line-height:1.3}
.bw-row .bw-era{color:#ffd23f;font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase}
.bw-btn{background:#ffd23f;color:#2a1605;border:0;border-radius:10px;padding:8px 12px;font-weight:900;font-size:13px;min-height:0;white-space:nowrap}
.bw-btn.dim{background:#4a3d30;color:#cbbda5}.bw-btn.ok{background:#3fae5a;color:#fff}
.bw-play{display:grid;gap:10px}
.bw-seg{display:flex;gap:6px}.bw-seg button{flex:1;background:#2a211a;color:#eee;border:2px solid #3a2e24;border-radius:12px;padding:10px 4px;font-weight:900;font-size:15px;min-height:0}
.bw-seg button.on{border-color:#ffd23f;color:#ffd23f}
.bw-go{background:linear-gradient(#ffdf5e,#f2a516);color:#2a1605;border:0;border-radius:16px;padding:14px;font:900 22px "Arial Black",Impact,sans-serif;letter-spacing:1px;box-shadow:0 4px 0 #8a4b00}
.bw-ball{width:46px;height:46px;border-radius:50%;flex:0 0 46px;box-shadow:inset -6px -8px 12px #0008,inset 4px 4px 8px #fff4}
.bw-bars{display:grid;grid-template-columns:auto 1fr;gap:2px 6px;font-size:11px;color:#bfb29c;margin-top:3px;align-items:center}
.bw-bars i{display:block;height:6px;border-radius:3px;background:#ffd23f}
@media (orientation:landscape) and (min-width:700px){.bw-shop{flex-direction:row;justify-content:flex-end;align-items:stretch}.bw-panel{width:min(46%,460px);max-height:none;border-top:0;border-left:2px solid #ffd23f66;margin-top:0;padding-top:44px}.bw-top{right:auto}}`;
function alleyScreen(s,{alley,save,frame,preview,sfx}){return new Promise(resolve=>{
 const root=document.createElement('div');root.className='bw-shop';const st=document.createElement('style');st.textContent=CSS;root.appendChild(st);frame.appendChild(root);
 let tab='play',sel=null;const done=v=>{root.remove();resolve(v);};s.cleanup(()=>{if(root.isConnected)done(null);});
 const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const money=n=>'$'+n.toLocaleString();
 const ballSwatch=b=>`background:radial-gradient(circle at 35% 30%,${b.look[1]} 0 12%,${b.look[0]} 45%,#050505 100%)`;
 function look(){const pp={...alley.parts};if(sel&&sel.kind==='part'&&sel.era!=null)pp[sel.id]=sel.era;preview(pp,sel&&sel.kind==='ball'?sel.id:alley.ball);}
 function render(){const logo=SP.picture('logo');
  root.innerHTML=`<style>${CSS}</style><div class="bw-top"><div class="bw-logo">${logo?`<img src="${logo.src}" alt="Kingpin Bowling">`:'KINGPIN<br>BOWLING'}</div><div class="bw-cash">${money(alley.cash)}</div></div>
  <div class="bw-panel"><div class="bw-tabs">${[['play','Bowl'],['alley','Alley'],['ball','Balls'],['shoes','Shoes'],['decor','Decor'],['perks','Perks'],['stats','Stats']].map(([k,l])=>`<button data-tab="${k}" class="${tab===k?'on':''}">${l}</button>`).join('')}</div>
  <div class="bw-body">${body()}</div></div>`;
  root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=e=>{e.stopPropagation();tab=b.dataset.tab;sel=null;look();sfx.tap();render();});
  root.querySelectorAll('[data-act]').forEach(b=>b.onclick=e=>{e.stopPropagation();act(b.dataset.act,b.dataset.id,b);});
  root.querySelectorAll('[data-sel]').forEach(b=>b.onclick=e=>{e.stopPropagation();const [kind,id,era]=b.dataset.sel.split(':');sel={kind,id,era:era!=null?+era:null};look();render();});}
 function body(){const h=alley,era=i=>AL.ERAS[i];
  if(tab==='play')return `<div class="bw-play"><div class="bw-row"><div class="bw-t"><span class="bw-era">${esc(era(AL.alleyEra(h)).year)}</span><b>${esc(era(AL.alleyEra(h)).name)}</b><small>${esc(era(AL.alleyEra(h)).desc)}</small></div></div>
   <div><small style="color:#bfb29c">Game length</small><div class="bw-seg">${[3,5,10].map(n=>`<button data-act="frames" data-id="${n}" class="${h.set.frames===n?'on':''}">${n} frames</button>`).join('')}</div></div>
   <div class="bw-seg"><button data-act="guide" class="${h.set.guide?'on':''}">Aim line ${h.set.guide?'ON':'OFF'}</button><button data-act="tab" data-id="ball">Ball: ${esc(AL.byId(AL.BALLS,h.ball).name)}</button></div>
   <button class="bw-go" data-act="go">BOWL!</button></div>`;
  if(tab==='alley')return AL.PART_IDS.map(k=>{const p=AL.PARTS[k],cur=h.parts[k],nx=AL.nextPart(h,k),isSel=sel&&sel.kind==='part'&&sel.id===k;
   return `<div class="bw-row ${isSel?'sel':''}" data-sel="part:${k}:${nx?nx.era:cur}"><div class="bw-t"><span class="bw-era">${esc(era(cur).name)} · ${esc(era(cur).year)}</span><b>${esc(p.name)}</b><small>${esc(p.tiers[cur])}${nx?`<br>Next: <b style="display:inline;color:#ffd23f">${esc(era(nx.era).name)}</b> — ${esc(p.tiers[nx.era])}`:'<br>Maxed out: the space age.'}</small></div>
    ${nx?`<button class="bw-btn ${h.cash<nx.price?'dim':''}" data-act="part" data-id="${k}">${money(nx.price)}</button>`:'<span class="bw-btn ok">✓</span>'}</div>`;}).join('')+`<small style="color:#bfb29c">Tap an upgrade to preview it on the alley behind. Lanes play differently: old wood has dead spots, pro lanes are true, space lanes hook like crazy.</small>`;
  if(tab==='ball')return AL.BALLS.map(b=>{const own=AL.owns(h,'ball',b.id),on=h.ball===b.id,isSel=sel&&sel.kind==='ball'&&sel.id===b.id;
   return `<div class="bw-row ${on||isSel?'sel':''}" data-sel="ball:${b.id}"><div class="bw-ball" style="${ballSwatch(b)}"></div><div class="bw-t"><b>${esc(b.name)}</b><small>${esc(b.desc)}</small>
    <div class="bw-bars"><span>Hook</span><i style="width:${Math.round((b.cover-.5)/.75*100)}%"></i><span>Revs</span><i style="width:${Math.round((b.revs-.6)/.7*100)}%"></i><span>${b.lb} lb</span><i style="width:${Math.round((b.lb-11)/5*100)}%"></i></div></div>
    ${on?'<span class="bw-btn ok">Using</span>':own?`<button class="bw-btn" data-act="equip-ball" data-id="${b.id}">Use</button>`:`<button class="bw-btn ${h.cash<b.price?'dim':''}" data-act="buy-ball" data-id="${b.id}">${money(b.price)}</button>`}</div>`;}).join('');
  if(tab==='shoes')return AL.SHOES.map(b=>{const own=AL.owns(h,'shoes',b.id),on=h.shoes===b.id;
   return `<div class="bw-row ${on?'sel':''}"><div class="bw-t"><b>${esc(b.name)}</b><small>${esc(b.desc)}<br>Steadier aim +${Math.round(b.steady*100)}% · approach speed +${Math.round(b.speed*100)}%</small></div>
    ${on?'<span class="bw-btn ok">Wearing</span>':own?`<button class="bw-btn" data-act="equip-shoes" data-id="${b.id}">Wear</button>`:`<button class="bw-btn ${h.cash<b.price?'dim':''}" data-act="buy-shoes" data-id="${b.id}">${money(b.price)}</button>`}</div>`;}).join('');
  if(tab==='decor')return AL.DECOR.map(d=>{const own=h.decor.includes(d.id),shown=AL.showsDecor(h,d.id);
   return `<div class="bw-row"><div class="bw-t"><b>${esc(d.name)}</b><small>${esc(d.desc)}</small></div>${own?`<button class="bw-btn ${shown?'ok':'dim'}" data-act="decor-toggle" data-id="${d.id}">${shown?'Shown':'Hidden'}</button>`:`<button class="bw-btn ${h.cash<d.price?'dim':''}" data-act="buy-decor" data-id="${d.id}">${money(d.price)}</button>`}</div>`;}).join('');
  if(tab==='perks')return AL.PERKS.map(d=>{const own=h.perks.includes(d.id);return `<div class="bw-row"><div class="bw-t"><b>${esc(d.name)}</b><small>${esc(d.desc)}</small></div>${own?'<span class="bw-btn ok">Owned</span>':`<button class="bw-btn ${h.cash<d.price?'dim':''}" data-act="buy-perk" data-id="${d.id}">${money(d.price)}</button>`}</div>`;}).join('');
  if(tab==='stats'){const st=h.stats;return `<div class="bw-row"><div class="bw-t"><b>Your alley</b><small>Games ${st.games} · High game ${st.best} · Strikes ${st.strikes} · Spares ${st.spares} · Turkeys ${st.turkeys} · Gutters ${st.gutters}${st.perfect?` · PERFECT GAMES ${st.perfect}`:''}<br>Alley finished: ${Math.round(AL.progress(h)*100)}%</small></div></div>`;}
  return '';}
 function act(a,id){
  if(a==='go'){sfx.tap();save();done({frames:alley.set.frames});return;}
  if(a==='frames'){alley.set.frames=+id;sfx.tap();save();}
  else if(a==='guide'){alley.set.guide=!alley.set.guide;sfx.tap();save();}
  else if(a==='tab'){tab=id;}
  else if(a==='part'){if(AL.buyPart(alley,id)){sfx.cheer(false);save();sel=null;look();}else sfx.buzz();}
  else if(a==='buy-ball'){if(AL.buy(alley,'ball',id)){AL.equip(alley,'ball',id);sfx.cheer(false);save();look();}else sfx.buzz();}
  else if(a==='equip-ball'){AL.equip(alley,'ball',id);sfx.tap();save();look();}
  else if(a==='buy-shoes'){if(AL.buy(alley,'shoes',id)){AL.equip(alley,'shoes',id);sfx.cheer(false);save();}else sfx.buzz();}
  else if(a==='equip-shoes'){AL.equip(alley,'shoes',id);sfx.tap();save();}
  else if(a==='buy-decor'){if(AL.buyDecor(alley,id)){sfx.cheer(false);save();look();}else sfx.buzz();}
  else if(a==='decor-toggle'){const i=alley.hide.indexOf(id);if(i>=0)alley.hide.splice(i,1);else alley.hide.push(id);sfx.tap();save();look();}
  else if(a==='buy-perk'){if(AL.buyPerk(alley,id)){sfx.cheer(false);save();}else sfx.buzz();}
  render();}
 // test hook
 Object.assign(s.debug,{shop:{tab:t=>{tab=t;render();},act:(a,id)=>act(a,id),go:()=>act('go'),get el(){return root;}}});
 void SC;render();});}
Object.assign(exports,{alleyScreen});
