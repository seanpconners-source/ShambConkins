// Loads the kart3d CommonJS modules in Node (no DOM) for the kart tests.
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url);const cache=new Map();
export function load(id){
 if(cache.has(id))return cache.get(id).exports;
 const mod={exports:{}};cache.set(id,mod);
 runInNewContext(readFileSync(new URL(id,root),'utf8'),{exports:mod.exports,require:load,Math,console,Float32Array,Uint8Array,Error,Object,Array,Number,JSON,Infinity,NaN,isFinite},{filename:id});
 return mod.exports;
}
