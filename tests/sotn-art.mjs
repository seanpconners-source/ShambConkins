// Contact sheet of the Symphony of the Night art (hero poses, after-image, monsters, Death, Dracula, the demon,
// pickups) drawn large on a dark page: /tmp/claude-0/sc/sotn-art.png. Usage: node tests/sotn-art.mjs
import {open} from './lib.mjs';
const {browser,page,errors}=await open({viewport:{width:1400,height:1000}});
await page.evaluate(()=>{window.ShambConkins.requestGame({id:'cv-symphony',origin:'arcade'});});
await page.waitForTimeout(400);await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
await page.waitForTimeout(1500);
await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug,A=d.art;const c=document.createElement('canvas');c.width=1400;c.height=1000;Object.assign(c.style,{position:'fixed',left:0,top:0,zIndex:99999});document.body.append(c);
 const g=c.getContext('2d');g.fillStyle='#2a2430';g.fillRect(0,0,1400,1000);g.lineCap='round';g.lineJoin='round';
 const poses=['stand','walk','jump','fall','crouch','attack','crouchAtk','dash','hurt','cast','dead'];
 poses.forEach((pose,k)=>{g.save();g.translate(60+k*120,150);g.scale(2.6,2.6);A.drawHero(g,{i:0,x:0,y:0,facing:1,pose,anim:1.2,vx:pose==='walk'?1.7:pose==='dash'?-4:0,vy:pose==='jump'?-3:pose==='fall'?3:0,t:2,atkK:pose.includes('tk')||pose==='attack'?.45:0,weapon:'short'},{head:d.head(0)});g.restore();});
 ['alucard','short','claymore','fist'].forEach((w2,k)=>{g.save();g.translate(80+k*130,330);g.scale(2.6,2.6);A.drawHero(g,{i:1,x:0,y:0,facing:k%2?-1:1,pose:'attack',anim:0,vx:0,vy:0,t:1,atkK:.5,weapon:w2},{head:d.head(1)});g.restore();});
 g.save();g.translate(640,330);g.scale(2.6,2.6);A.drawAfterimage(g,{i:0,x:0,y:0,facing:1,pose:'walk',anim:2,vx:1.7,vy:0,t:1,weapon:'short'},.9);g.restore();
 const foes=[['zombie','walk'],['bloody','swipe'],['warg','run'],['warg','lunge'],['skeleton','throw'],['bat','fly'],['merman','spit'],['armor','walk']];
 foes.forEach(([type,state],k)=>{g.save();g.translate(80+k*160,560);g.scale(2.6,2.6);A.drawFoe(g,{type,state,x:0,y:0,facing:1,anim:1,t:10,flash:0},1);g.restore();});
 g.save();g.translate(120,900);g.scale(2.4,2.4);A.drawDeath(g,0,0,1,1,0);g.restore();
 g.save();g.translate(330,900);g.scale(2.4,2.4);A.drawDracula(g,{x:0,y:0,facing:1,vis:1,open:0},1);g.restore();
 g.save();g.translate(520,900);g.scale(2.4,2.4);A.drawDracula(g,{x:0,y:0,facing:-1,vis:1,open:1},1);g.restore();
 g.save();g.translate(840,960);g.scale(1.8,1.8);A.drawDemon(g,{x:0,y:0,facing:1},1);g.restore();
 ['heart','bigheart','money','potion','roast','short','claymore','dagger','axe','holy','cross','leap','orb'].forEach((t,k)=>{g.save();g.translate(1080+(k%4)*80,700+Math.floor(k/4)*70);g.scale(2.4,2.4);A.drawPickup(g,t,0,0,1);g.restore();});
});
await page.waitForTimeout(600);
await page.screenshot({path:'/tmp/claude-0/sc/sotn-art.png'});
if(errors.length)console.log('errors',errors);
await browser.close();
