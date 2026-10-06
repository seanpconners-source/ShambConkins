const {obstacleType,obstacleIsOpen}=require("src/obstacles.js");
const {worldNode}=require("src/boardCamera.js");
const {escapeHTML}=require("src/utils.js");
const {logoURL}=require("src/assets.js");
const drawings={
 bridge:'<path d="M-42 7H-12m24 0h30" stroke="#8a653f" stroke-width="14"/><path d="M-38-20L-12-8m24 0 26-12" stroke="#b79555" stroke-width="4"/><path d="M-6 7l-3 20m14-20 4 20" stroke="#8a653f" stroke-width="5"/><path d="M-42 22Q0 41 42 22" fill="none" stroke="#76afd1" stroke-width="8"/>',
 lock:'<path d="M-17-3v-13q17-21 34 0v13" fill="none" stroke="#dbb561" stroke-width="9"/><rect x="-27" y="-4" width="54" height="35" rx="7" fill="#b47c38"/><circle cy="9" r="5" fill="#302f41"/><path d="M0 9v11" stroke="#302f41" stroke-width="5"/>',
 tree:'<path d="M-40 24L34-19" stroke="#876045" stroke-width="20"/><path d="M-5 4L-18-23M9-1l28 13" stroke="#876045" stroke-width="9"/><ellipse cx="35" cy="-20" rx="12" ry="11" fill="#c5a467"/>',
 water:'<path d="M-42-7q10-12 21 0t21 0t21 0t21 0M-42 12q10-12 21 0t21 0t21 0t21 0M-42 29q10-12 21 0t21 0t21 0t21 0" fill="none" stroke="#61b9d0" stroke-width="8"/>',
 checkpoint:'<path d="M-38-22v49m76-49v49" stroke="#778ea0" stroke-width="8"/><path d="M-33-4H33" stroke="#e8dfca" stroke-width="16"/><path d="M-24-11l13 14M-1-11 12 3m9-14 12 14" stroke="#c6534d" stroke-width="8"/>',
 toxic:'<path d="M-40 21q2-34 22-15 3-38 26-25 20-9 20 13 26-5 13 27z" fill="#8ebe57"/><circle cx="0" cy="9" r="20" fill="#ddd05a"/><path d="M0 5L-5-11H5ZM-4 11L-18 17-13 7ZM4 11L18 17 13 7Z" fill="#3e4941"/>',
 laser:'<path d="M-39-23v52m78-52v52" stroke="#657e8e" stroke-width="9"/><path d="M-33-14H33m-66 17h66m-66 17h66" stroke="#d73e75" stroke-width="5"/>',
 pipe:'<ellipse cx="0" cy="4" rx="37" ry="29" fill="#64a579" stroke="#356658" stroke-width="9"/><ellipse cx="0" cy="4" rx="14" ry="17" fill="#263c44"/>',
 haunted:'<path d="M-39 26V-8q0-32 39-32T39-8v34" fill="none" stroke="#806c9b" stroke-width="10"/><path d="M-22 25V-5q22-30 44 0v30l-10-8-12 8-12-8Z" fill="#d1d7e5"/><circle cx="-8" cy="3" r="4" fill="#51446f"/><circle cx="8" cy="3" r="4" fill="#51446f"/>',
 heavy:'<path d="M-41-28v60m82-60v60" stroke="#6a7d79" stroke-width="10"/><rect x="-31" y="-22" width="62" height="48" fill="#72817a"/><path d="M-24-13H24m-48 13h48m-48 13h48" stroke="#d8b86b" stroke-width="6"/>',
 cliff:'<path d="M-43 32L-26-26H22L43 32Z" fill="#a79078"/><path d="M-18 27L-8-10 6-7 14-27" fill="none" stroke="#d9b657" stroke-width="5"/>',
 fog:'<path d="M-42-16H19q20 0 20 12M-28 3H33M-38 23H15q16 0 16-9" fill="none" stroke="#a4b2c2" stroke-width="10" stroke-linecap="round"/>'
};
function obstacleDrawing(o,open=false){const t=obstacleType(o);return open?'<path d="M-38 11H38" stroke="#d0b779" stroke-width="18"/><path d="M-15 3L-3 17 24-14" fill="none" stroke="#4eb895" stroke-width="9"/>':drawings[t?.kind]||drawings.lock;}
function obstacleArtHTML(run,o){return `<svg class="obstacle-picture" viewBox="-65 -52 130 105" role="img" aria-label="${escapeHTML(obstacleType(o)?.name||'Obstacle')}"><rect x="-61" y="-48" width="122" height="96" rx="20" fill="#e7e1d1"/>${obstacleDrawing(o,obstacleIsOpen(run,o))}</svg>`;}
function obstacleMarkerHTML(run,o){const t=obstacleType(o),a=worldNode(run,run.board.nodes[o.from]),b=worldNode(run,run.board.nodes[o.to]),open=obstacleIsOpen(run,o);return `<g class="route-obstacle ${open?'open':'blocked'} ${o.openedTurn===run.turn||o.openUntil===run.turn+1?'changing':''}" data-action="obstacle" data-id="${o.id}" transform="translate(${(a.x+b.x)/2},${(a.y+b.y)/2})" role="button" aria-label="${escapeHTML(t.name)} · ${open?'open':'blocked'}"><title>${escapeHTML(t.name)} · ${open?'open':'blocked'} — ${escapeHTML(t.hint)}</title><rect x="-49" y="-38" width="98" height="75" rx="13"/>${obstacleDrawing(o,open)}<text class="barrier-tag" y="-45">${open?'OPEN':'BARRIER'}</text><image href="${logoURL(t.source)}" x="-52" y="39" width="104" height="22"/></g>`;}

Object.assign(exports,{obstacleDrawing,obstacleArtHTML,obstacleMarkerHTML});