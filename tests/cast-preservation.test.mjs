import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as THREE from 'three';
import { CAST, CLUE_CAST, getCharacter, PLACE_LORE } from '../js/cast.js';
import { CLUES } from '../js/clues.js';
const baseline='7037a0babdd317b996b970755811a728cfba86b3';
const original=p=>execFileSync('git',['show',`${baseline}:${p}`],{maxBuffer:16*1024*1024});
const current=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const source=p=>original(p).toString();
const asModule=s=>import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'));

test('Original player artwork, photo UI, styles and configuration remain byte-identical',()=>{
  for(const file of ['assets/sprite.png','js/ui.js','css/style.css','js/config.js'])assert.ok(original(file).equals(current(file)),file);
});
test('Original avatar construction and camera controls remain intact',()=>{
  const old=source('js/player.js'),now=current('js/player.js').toString();
  const section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
  assert.equal(section(now,'    const tex =','    this.vel ='),section(old,'    const tex =','    this.vel ='));
  assert.equal(section(now,'  cycleCamMode()','  update(dt)'),section(old,'  cycleCamMode()','  update(dt)'));
  assert.equal(now.slice(now.indexOf('  updateCamera(')),old.slice(old.indexOf('  updateCamera(')));
  assert.equal(current('index.html').toString().replaceAll('js/main.js?v=20261018nav','js/main.js?v=20261011c'),source('index.html'));
});
test('World geometry, forest, lake, boats, paths and scenery are unchanged; only two place labels differ',()=>{
  const normalized=current('js/world.js').toString().replaceAll('name: "Rapunzel’s Tower"','name: "Tower Hill"').replaceAll('name: "The Kingdom of Corona"','name: "Corona Village"');
  assert.equal(normalized,source('js/world.js'));
});
test('All 33 clue locations, photo captions, hints, riddles and sequence fields are unchanged',async()=>{
  const old=(await asModule(source('js/clues.js'))).CLUES;
  const strip=items=>items.map(({npc,...rest})=>rest);
  assert.deepEqual(strip(CLUES),strip(old));assert.equal(CLUES.length,33);
  for(const clue of CLUES){if(clue.npc)assert.equal(clue.npc,getCharacter(CLUE_CAST[clue.id]).name);if(clue.photo)assert.ok(original(clue.photo).equals(current(clue.photo)),clue.photo);}
});

const ctx=new Proxy({}, {get:(o,k)=>o[k]??(k==='createRadialGradient'||k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:1,height:1,getContext:()=>ctx})};
globalThis.window={innerWidth:390};Object.defineProperty(globalThis,'navigator',{value:{userAgent:'iPhone',maxTouchPoints:1},configurable:true});
globalThis.location={search:''};
const {buildWorld}=await import('../js/world.js');
const {buildNPCs}=await import('../js/npcs.js');
const scene=new THREE.Scene(),world=buildWorld(scene),actors=buildNPCs(scene);

test('All 34 supplied characters have unique descriptions and representations; Pascal remains the same companion',()=>{
  assert.equal(CAST.length,34);assert.equal(new Set(CAST.map(c=>c.name)).size,34);
  const represented=new Set([...actors.npcs.map(n=>n.castId).filter(Boolean),actors.chameleon.castId]);
  assert.deepEqual([...represented].sort(),CAST.map(c=>c.id).sort());
  assert.ok(CAST.every(c=>c.description.length>30));assert.ok(actors.chameleon.exclaim&&actors.chameleon.spark);
  assert.ok(!actors.npcs.some(n=>n.castId==='pascal'),'Pascal must not take over the nearest-NPC clue interaction');
  assert.equal(PLACE_LORE.length,7);
});
test('Existing clue-giver positions and hint contracts stay intact',async()=>{
  const old=(await asModule(source('js/npcs.js'))).buildNPCs(new THREE.Scene());
  for(const before of old.npcs.filter(n=>n.kind==='named')){
    const after=actors.npcs.find(n=>n.clueId===before.clueId);
    assert.deepEqual(after.group.position,before.group.position);assert.equal(after.hint,before.hint);assert.equal(after.kind,before.kind);assert.equal(after.name,getCharacter(CLUE_CAST[before.clueId]).name);
  }
});
test('Character activities and original world update run with finite transforms',()=>{
  const hook=actors.npcs.find(n=>n.castId==='hook');const before=hook.castRig.arms[0].rotation.x;
  for(let i=0;i<240;i++){world.update(1/60,i/60,0,-58);actors.update(1/60,i/60,new THREE.Vector3(0,0,-58));}
  assert.notEqual(hook.castRig.arms[0].rotation.x,before);
  for(const n of actors.npcs)n.group.traverse(o=>assert.ok([...o.position,...o.rotation.toArray().slice(0,3),...o.scale].every(Number.isFinite),n.name));
});
test('New animal cameos stay away from paths, water and existing solid scenery',()=>{
  const dist=(p,[ax,az,bx,bz])=>{const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((p.x-ax)*dx+(p.z-az)*dz)/(dx*dx+dz*dz)));return Math.hypot(p.x-ax-t*dx,p.z-az-t*dz);};
  for(const n of actors.npcs.filter(n=>['fidella','ruddiger','owl'].includes(n.castId))){const p=n.group.position;
    assert.ok(world.paths.every(path=>dist(p,path)>3),`${n.name} overlaps a walking path`);
    assert.ok(world.colliders.every(c=>Math.hypot(p.x-c.x,p.z-c.z)>c.r+.8),`${n.name} overlaps existing scenery`);
    assert.ok(world.waters.every(w=>((p.x-w.x)/w.rx)**2+((p.z-w.z)/w.rz)**2>1.1),`${n.name} overlaps water`);
  }
});
