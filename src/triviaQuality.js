const {TRIVIA_FIXES}=require("src/data/triviaFixes.js");
// Question hygiene applied to the whole trivia bank at load time, so new packs are
// vetted too. Removes answer giveaways and near-duplicates, applies the reviewed
// difficulty recalibration.
const STOP=new Set('the a an of in on at to is was what which who whose how does do did for and or by with from as that this are be its it his her their'.split(' '));
const norm=s=>String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const tokens=s=>norm(s).split(' ').filter(t=>t&&!STOP.has(t));
// The answer (or every word of it) already appears in the question.
function givesAwayAnswer(q){
 const a=norm(q.answers[q.correct]);if(!a)return false;
 const question=' '+norm(q.q)+' ';
 if(a.length>=3&&question.includes(' '+a+' '))return true;
 const parts=a.split(' ');
 return parts.length>1&&parts.every(t=>t.length>2&&question.includes(' '+t+' '));
}
function jaccard(a,b){const A=new Set(a),B=new Set(b);let n=0;for(const t of A)if(B.has(t))n++;return n/Math.max(1,A.size+B.size-n);}
function cleanTrivia(questions){
 const removed=new Set(TRIVIA_FIXES.remove);
 const out=[],seen=new Map();
 for(const raw of questions){
  if(removed.has(raw.id)||givesAwayAnswer(raw))continue;
  const q=TRIVIA_FIXES.difficulty[raw.id]?{...raw,difficulty:TRIVIA_FIXES.difficulty[raw.id]}:raw;
  const key=norm(q.answers[q.correct]),toks=tokens(q.q),bucket=seen.get(q.source+'|'+key)||[];
  if(bucket.some(t=>jaccard(t,toks)>=.6))continue;
  bucket.push(toks);seen.set(q.source+'|'+key,bucket);out.push(q);
 }
 return out;
}
Object.assign(exports,{givesAwayAnswer,cleanTrivia});
