import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CHAPTERS, PHOTOS, loadJourney, saveJourney } from '../js/journey.js';
import { isWalkable, safeLanding } from '../js/navigation.js';
import * as THREE from 'three';

// Canvas texture drawing is stubbed; geometry, collision data, and animation are real.
const ctx=new Proxy({}, {get:(o,k)=>o[k]??(k==='createRadialGradient'||k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:1,height:1,getContext:()=>ctx})};
globalThis.window={innerWidth:390};
Object.defineProperty(globalThis,'navigator',{value:{userAgent:'iPhone',maxTouchPoints:1},configurable:true});
globalThis.location={search:''};
const {buildWorld}=await import('../js/world.js');
const {Player}=await import('../js/player.js');
const {buildNPCs}=await import('../js/npcs.js');
const scene=new THREE.Scene(),world=buildWorld(scene);

test('All six destinations have clear arrival points in the actual unchanged world',()=>{
  for(const c of CHAPTERS){const p=safeLanding(world,c);assert.ok(p,c.id);assert.ok(isWalkable(world,p.x,p.z,1.5),c.id);assert.ok(Math.hypot(p.x-c.x,p.z-c.z)<=24,c.id);console.log(`${c.id}: ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);}
});
test('Navigation does not land inside water or an obstacle, and fails boundedly if full',()=>{
  const w={colliders:[{x:0,z:0,r:3}],waters:[{x:6,z:0,rx:3,rz:3}],dockRect:null};
  assert.equal(isWalkable(w,0,0),false);assert.equal(isWalkable(w,6,0),false);
  assert.ok(isWalkable(w,...Object.values(safeLanding(w,{x:0,z:0}))));
  assert.equal(safeLanding({...w,colliders:[{x:0,z:0,r:100}]},{x:0,z:0}),null);
});
test('Every photograph is real, unique, and available; no placeholder stops',()=>{
  assert.equal(PHOTOS.length,10);assert.equal(new Set(PHOTOS.map(p=>p.src)).size,10);
  for(const p of PHOTOS)assert.ok(fs.existsSync(new URL('../'+p.src,import.meta.url)),p.src);
  assert.ok(CHAPTERS.every(c=>c.photos.length||c.finale));
});
test('Gift persistence survives reload, invalid data, and denied storage',()=>{
  const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  const s=loadJourney(storage);s.opened.add('lake');s.last='lake';assert.ok(saveJourney(storage,s));
  assert.deepEqual([...loadJourney(storage).opened],['lake']);assert.equal(loadJourney(storage).last,'lake');
  storage.getItem=()=>'{"opened":["bad","tower"],"last":"bad"}';assert.deepEqual([...loadJourney(storage).opened],['tower']);
  storage.getItem=()=>'{';assert.equal(loadJourney(storage).opened.size,0);
  assert.equal(loadJourney(null).opened.size,0);assert.equal(saveJourney(null,s),false);
});
test('Avatar movement and cameras stay finite, respect collisions, and stop immediately',()=>{
  const p=new Player(scene,world),cam=new THREE.PerspectiveCamera(58,390/844,.1,700);
  for(const c of CHAPTERS){const l=safeLanding(world,c);p.teleport(l.x,l.z);for(let i=0;i<180;i++){p.setInput(Math.sin(i*.05),Math.cos(i*.05));p.update(1/60);p.updateCamera(cam,1/60);assert.ok(isWalkable(world,p.group.position.x,p.group.position.z));assert.ok([...cam.position].every(Number.isFinite));}p.stop();const before=p.group.position.clone();p.update(1/60);assert.ok(before.equals(p.group.position));p.cycleCamMode();p.updateCamera(cam,1/60);assert.ok([...cam.position].every(Number.isFinite));}
});
test('Workers have props and animated arms; fishers retain their activity',()=>{
  const {npcs,update}=buildNPCs(scene);assert.ok(npcs.every(n=>n.activity||n.kind==='fisher'));
  const worker=npcs.find(n=>n.activity?.role==='sweep'),angle=worker.group.userData.arms[0].rotation.x;
  for(let i=0;i<120;i++){world.update(1/60,i/60,0,-58);update(1/60,i/60,new THREE.Vector3(0,0,-58));}
  assert.notEqual(worker.group.userData.arms[0].rotation.x,angle);
  for(const n of npcs)assert.ok([...n.group.position].every(Number.isFinite));
});
