const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function seededRandom(seed) { let n = typeof seed === 'number' ? seed >>> 0 : hash(seed); return () => { n += 0x6D2B79F5; let t = Math.imul(n ^ n >>> 15, 1 | n); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(a, random = Math.random) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pick = (a, random = Math.random) => a[Math.floor(random() * a.length)];
function weighted(a, random = Math.random, weight = x => x.weight ?? x.w ?? 1) { let n = random() * a.reduce((s, x) => s + weight(x), 0); for (const x of a) { n -= weight(x); if (n <= 0) return x; } return a.at(-1); }
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function runRandom(run) { run.rng = (Math.imul(run.rng || hash(run.seed), 1664525) + 1013904223) >>> 0; return run.rng / 4294967296; }

Object.assign(exports,{clamp,escapeHTML,slug,hash,seededRandom,shuffle,pick,weighted,wait,runRandom});