// Visible shapes are 17–22 board units; transparent targets stay forgiving.
const SPACE_SHAPES={
 start:'<path d="M0-18L16-10V9L0 19-16 9V-10Z"/>',
 game:'<path d="M-17 0-9-16H9L17 0 9 16H-9Z"/>',
 event:'<path d="M0-19L16 0 0 19-16 0Z"/>',
 item:'<path d="M-16-12H7L17-2V15H-16Z"/>',
 bonus:'<path d="M0 17C-32-3-12-27 0-13C12-27 32-3 0 17Z"/>',
 penalty:'<path d="M0-19L19 15H-19Z"/>',
 location:'<path d="M-18-2L0-18 18-2V16H-18Z"/>',
 trivia:'<path d="M-18-13Q-8-17 0-10Q8-17 18-13V14Q8 10 0 17Q-8 10-18 14Z"/>',
 task:'<path d="M-19-12H19V-5Q9 0 19 5V12H-19V5Q-9 0-19-5Z"/>',
 casino:'<circle r="17"/><circle class="chip-detail" r="12" fill="none" stroke-dasharray="3 4"/>',
 dice:'<rect x="-16" y="-16" width="32" height="32" rx="7"/>',
 shop:'<path d="M-8-17H8L17-8V8L8 17H-8L-17 8V-8Z"/>',
 gate:'<path d="M0-22L6-8 21-7 10 3 13 19 0 11-13 19-10 3-21-7-6-8Z"/>'
};
function spaceShapeHTML(type,color){return `<circle class="space-hit" r="29" fill="transparent"/><g class="space-shape" style="fill:${color}">${SPACE_SHAPES[type]||SPACE_SHAPES.event}</g>`;}

Object.assign(exports,{SPACE_SHAPES,spaceShapeHTML});