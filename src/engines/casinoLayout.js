// Use the actual game body, including browser chrome and an opened control guide.
function rouletteLayout(width,height){
 width=Math.max(160,Number(width)||680);height=Math.max(100,Number(height)||360);
 const wide=width>=620||(width>=520&&width>height*1.35),seatWidth=(width-(wide?132:28)-20)/2;
 const compact=height<480||seatWidth<230;
 return {mode:wide?'wide':'stacked',compact,tight:height<320,wagerStacked:seatWidth<285,
  wheel:Math.floor(Math.max(42,Math.min(wide?132:110,compact?height*.21:height*.24))),seatWidth};
}
function fitRouletteTable(s){
 const table=s.body.querySelector('.casino-table');
 const fit=()=>{if(!s.alive)return;const bounds=s.body.getBoundingClientRect(),layout=rouletteLayout(s.body.clientWidth||bounds.width,s.body.clientHeight||bounds.height);
  table.dataset.rouletteLayout=layout.mode;table.dataset.rouletteCompact=String(layout.compact);table.dataset.rouletteWagerStacked=String(layout.wagerStacked);table.dataset.rouletteTight=String(layout.tight);
  table.style.setProperty('--roulette-wheel-size',layout.wheel+'px');s.rouletteLayout=layout;
 };
 fit();if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(fit);observer.observe(s.body);s.cleanup(()=>observer.disconnect());}
 s.on(window,'resize',fit);return fit;
}

Object.assign(exports,{rouletteLayout,fitRouletteTable});