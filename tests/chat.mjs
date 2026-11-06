// Online chat (src/chat.js + data/chatLines.js + the friends lobby): needs `npx --yes wrangler@3 dev --local --port 8787` in
// cloudflare/ and a served --pwa build (SHAMB_URL). Two phones join a room: both get the 💬 button; the sheet deals 2 lines
// for the moment, 3 nice, 4 nasty (2 crude) and 16 emotes, a fresh hand each time; a tapped line and a typed message arrive
// on the other phone as a bubble with an unread count; keys typed in the chat don't reach the page behind; the button
// works over an open dialog; Clean chat drops the crude lines; a friend outside the room gets a message through the lobby.
import {launchBrowser,screenshotPath,appURL} from './lib.mjs';
import {req} from './load.mjs';
const URL0=(await appURL()),HOST=process.env.NET_HOST||'ws://localhost:8787';
const {CRASS}=req('src/data/chatLines.js');
let bad=0;const check=(ok,m)=>{console.log((ok?'ok   ':'FAIL ')+m);if(!ok)bad++;};
const browser=await launchBrowser();
async function phone(){
 const ctx=await browser.newContext({viewport:{width:390,height:780}});
 await ctx.addInitScript(h=>{try{localStorage.setItem('sc-net-host',h);localStorage.setItem('sc-friends-on','true');}catch{}},HOST);
 const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
 await p.goto(URL0,{timeout:180000});await p.waitForSelector('.title-screen',{timeout:120000});await p.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:90000});
 await p.addStyleTag({content:'#sc-dl{display:none!important}'});return p;
}
const act=(p,name)=>p.evaluate(n=>{const b=document.createElement('button');b.dataset.action=n;document.body.append(b);b.click();b.remove();},name);
const until=(p,fn,arg,ms=15000)=>p.waitForFunction(fn,arg,{timeout:ms}).then(()=>true,()=>false);
const choose=(p,l)=>p.evaluate(l=>{const b=[...document.querySelectorAll('#dialog[open] button')].find(b=>b.textContent.trim().startsWith(l));b?.click();return !!b;},l);
async function join(p,who,room){
 await act(p,'arcade');await p.waitForSelector('.solo-strip');await act(p,'online-mode');
 await p.waitForFunction(()=>/Play online/.test(document.querySelector('#dialog[open]')?.innerText||''));
 await p.fill('#net-room',room);await p.check(`input[name="net-who"][value="${who}"]`);await choose(p,'Join room');
}
const sean=await phone(),amber=await phone(),room='chat test '+Math.random().toString(36).slice(2,6);
await join(sean,0,room);await join(amber,1,room);
check(await until(sean,()=>!!window.ShambConkins.chat().button())&&await until(amber,()=>!!window.ShambConkins.chat().button()),'both phones show the 💬 button once the other is in the room');
// the sheet: a fresh hand
await sean.click('#sc-chat');await sean.waitForSelector('#sc-chat-dlg[open]');
const hand=await sean.evaluate(()=>{const g=[...document.querySelectorAll('#sc-chat-dlg .chat-group')].map(x=>({k:x.querySelector('small').textContent,lines:[...x.querySelectorAll('.chat-line')].map(b=>b.dataset.say)}));return {g,emotes:document.querySelectorAll('#sc-chat-dlg .chat-emote').length};});
const by=k=>hand.g.find(x=>x.k===k)?.lines||[];
check(by('Right now').length===2&&by('Nice').length===3&&by('Nasty').length===4&&hand.emotes===16,`the sheet deals 2 now / 3 nice / 4 nasty + 16 emotes (${JSON.stringify(hand.g.map(x=>x.lines.length))}, ${hand.emotes})`);
check(by('Nasty').filter(l=>CRASS.includes(l)).length===2,'two of the nasty lines are crude ones: '+by('Nasty').join(' | '));
await sean.screenshot({path:screenshotPath('chat-sheet.png')});
// tap a nasty line: it goes, the sheet closes, Amber gets a bubble + an unread count
const line=by('Nasty')[0];await sean.click(`#sc-chat-dlg .chat-line.nasty >> nth=0`);
check(await until(sean,()=>!window.ShambConkins.chat().open),'tapping a line sends it and closes the sheet');
check(await until(amber,t=>[...document.querySelectorAll('#sc-chat-bubbles .chat-bubble')].some(b=>b.innerText.includes(t)),line),'Amber sees it in a bubble: '+line);
check(await amber.evaluate(()=>/Sean/i.test(document.querySelector('#sc-chat-bubbles .chat-bubble b')?.textContent||'')),'the bubble names Sean');
check(await amber.evaluate(()=>window.ShambConkins.chat().unread===1&&document.querySelector('#sc-chat i').textContent==='1'),'Amber\'s 💬 shows 1 unread');
await amber.screenshot({path:screenshotPath('chat-bubble.png')});
// Amber answers by typing; the keys stay in the chat
await amber.evaluate(()=>{window.__keys=0;addEventListener('keydown',()=>window.__keys++);});
await amber.click('#sc-chat');await amber.waitForSelector('#sc-chat-dlg[open]');
check(await amber.evaluate(t=>document.querySelector('#chat-log').innerText.includes(t),line),'Amber\'s sheet shows Sean\'s message in the log');
await amber.click('#sc-chat-dlg .chat-input');await amber.keyboard.type('ur mom, Sean 123');await amber.keyboard.press('Enter');
check(await amber.evaluate(()=>window.__keys===0),'keys typed in the chat never reach the page behind it');
check(await until(sean,()=>[...document.querySelectorAll('#sc-chat-bubbles .chat-bubble')].some(b=>b.innerText.includes('ur mom, Sean 123'))),'Sean gets Amber\'s typed message');
// a new hand next time (mostly different lines)
await sean.click('#sc-chat');await sean.waitForSelector('#sc-chat-dlg[open]');
const hand2=await sean.evaluate(()=>[...document.querySelectorAll('#sc-chat-dlg .chat-line:not(.quote)')].map(b=>b.dataset.say));
const same=hand2.filter(l=>hand.g.flatMap(x=>x.lines).includes(l)).length;check(same<=1,`opening again deals fresh lines (${same} repeated)`);
await sean.click('#sc-chat-dlg [data-chat="deal"]');const hand3=await sean.evaluate(()=>[...document.querySelectorAll('#sc-chat-dlg .chat-line:not(.quote)')].map(b=>b.dataset.say));
check(hand3.filter(l=>hand2.includes(l)).length<=1,'🎲 deals another hand');
await sean.click('#sc-chat-dlg [data-chat="close"]');
// Clean chat: no crude lines
await sean.evaluate(()=>{window.ShambConkins.store.profile.settings.chatClean=true;});
const clean=await sean.evaluate(()=>{const h=window.ShambConkins.chat().deal();return h.nasty;});
check(clean.length===4&&!clean.some(l=>CRASS.includes(l)),'Clean chat deals no crude lines: '+clean.join(' | '));
await sean.evaluate(()=>{window.ShambConkins.store.profile.settings.chatClean=false;});
// over a dialog: the button moves inside it and still opens the chat
await act(amber,'settings');await amber.waitForSelector('#dialog[open]');
check(await until(amber,()=>!!document.querySelector('#dialog[open] #sc-chat:not([hidden])')),'with a dialog open the 💬 button sits inside it');
await amber.click('#sc-chat');check(await until(amber,()=>window.ShambConkins.chat().open),'and tapping it opens the chat over the dialog');
await amber.screenshot({path:screenshotPath('chat-over-dialog.png')});
await amber.keyboard.press('Escape');await until(amber,()=>!window.ShambConkins.chat().open);
// a friend outside the room: through the lobby
const codeA=await amber.evaluate(()=>window.ShambConkins.friends().code);
check(await until(sean,c=>window.ShambConkins.friends().presence.some(p=>p.code===c),codeA,20000),'the room made them friends and Sean sees Amber online');
await sean.evaluate(c=>{const C=window.ShambConkins.chat();C.openChat(c);},codeA);await sean.waitForSelector('#sc-chat-dlg[open]');
await sean.fill('#sc-chat-dlg .chat-input','friend ping');await sean.click('#sc-chat-dlg .chat-send');
check(await until(amber,()=>[...document.querySelectorAll('#sc-chat-bubbles .chat-bubble')].some(b=>b.innerText.includes('friend ping'))),'a message to a friend arrives through the lobby');
check(!sean.errs.length&&!amber.errs.length,'no page errors '+[...sean.errs,...amber.errs].slice(0,2).join(' | '));
await browser.close();
console.log(bad?`chat: ${bad} FAILED`:'chat OK');process.exit(bad?1:0);
