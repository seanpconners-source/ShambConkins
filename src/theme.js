// Interface colour theme: the title screen's dark look everywhere, tinted per level and per warp zone.
// Sets <body data-theme="…">; the palettes live in src/theme.css. Menus outside a run use the title screen's plum.
const LEVEL_THEMES=['mind','body','spirit','horror','upside-down'];
function themeFor(run){
 if(!run||run.finished||!run.board)return 'home';
 if(run.board.format==='warp')return 'warp-'+(run.board.warp?.id||'rainbow-road');
 const realm=run.board.nodes?.[run.players?.[run.current]?.node]?.realm;
 return LEVEL_THEMES.includes(realm)?realm:String(realm||'').startsWith('warp')?'warp-rainbow-road':'mind';
}
function applyTheme(theme){
 if(typeof document==='undefined'||!document.body||document.body.dataset.theme===theme)return theme;
 document.body.dataset.theme=theme;
 // Phone browser chrome follows the palette too.
 const bg=getComputedStyle(document.body).getPropertyValue('--t-bg0').trim();if(bg)document.querySelector('meta[name=theme-color]')?.setAttribute('content',bg);
 return theme;
}
const applyRunTheme=run=>applyTheme(themeFor(run));
Object.assign(exports,{LEVEL_THEMES,themeFor,applyTheme,applyRunTheme});
