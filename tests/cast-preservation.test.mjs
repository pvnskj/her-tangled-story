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

test('Original avatar asset, clue/photo UI, styling and pace remain intact',()=>{
  assert.ok(original('assets/sprite.png').equals(current('assets/sprite.png')));
  const oldUI=source('js/ui.js'),nowUI=current('js/ui.js').toString();
  assert.equal(nowUI.slice(nowUI.indexOf('  // ---------- joystick')),oldUI.slice(oldUI.indexOf('  // ---------- joystick')));
  const oldCSS=source('css/style.css'),nowCSS=current('css/style.css').toString();
  assert.equal(nowCSS.split('/* ---------- world map')[0],oldCSS.split('/* ---------- world map')[0]);
  assert.equal(current('js/config.js').toString().replace('WORLD_BOUND: 300','WORLD_BOUND: 114').replace('nine-point world is ~648x648','world is ~240x240').replace('SPAWN: { x: 0, z: -173 }','SPAWN: { x: 0, z: -58 }').replace('32nd (finale)','33rd (finale)'),source('js/config.js'));
});
test('Original avatar construction and camera controls remain intact',()=>{
  const old=source('js/player.js'),now=current('js/player.js').toString();
  const section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
  assert.equal(section(now,'    const tex =','    this.vel ='),section(old,'    const tex =','    this.vel ='));
  assert.equal(section(now,'  cycleCamMode()','  update(dt)'),section(old,'  cycleCamMode()','  update(dt)'));
  assert.equal(now.slice(now.indexOf('  updateCamera(')),old.slice(old.indexOf('  updateCamera(')));
  assert.equal(current('index.html').toString().replace('css/style.css?v=20261018story','css/style.css?v=20261011c').replace('· 32','· 33').replace('32 memories','33 hidden memories').replace('of 32','of 33').split('  <!-- world map overlay -->')[0],source('index.html').split('  <!-- world map overlay -->')[0]);
});
test('Original lighting, materials, forest generation, tower, village, tavern and festival remain intact',()=>{
 const before=source('js/world.js'),after=current('js/world.js').toString();
 const section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
 for(const [a,b] of [
  ['  // ---------- dusk sky','  // ---------- terrain'],
  ['  const mat =','  // ---------- dirt walking paths'],
  ['  // ---------- Tavern','  // ---------- Lake'],
  ['  // ---------- boat ----------','  // ---------- fireflies']
 ])assert.equal(section(after,a,b),section(before,a,b),a);
});
test('Original photos, captions and riddles survive the 32-character-clue journey',async()=>{
  const old=(await asModule(source('js/clues.js'))).CLUES;
  const content=c=>({photo:c.photo,caption:c.caption,riddle:c.riddle});
  assert.deepEqual(CLUES.map(content),[...old.slice(0,31),old[32]].map(content));assert.equal(CLUES.length,32);
  for(const clue of CLUES){assert.ok(clue.characters.includes(CLUE_CAST[clue.id]));if(clue.photo)assert.ok(original(clue.photo).equals(current(clue.photo)),clue.photo);}

});

const ctx=new Proxy({}, {get:(o,k)=>o[k]??(k==='createRadialGradient'||k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:1,height:1,getContext:()=>ctx})};
globalThis.window={innerWidth:390};Object.defineProperty(globalThis,'navigator',{value:{userAgent:'iPhone',maxTouchPoints:1},configurable:true});
globalThis.location={search:''};
const {buildWorld}=await import('../js/star-world.js');
const {buildNPCs}=await import('../js/star-npcs.js');
const scene=new THREE.Scene(),world=buildWorld(scene),actors=buildNPCs(scene,world);

test('All 34 supplied characters have unique descriptions and representations; Pascal remains the same companion',()=>{
  assert.equal(CAST.length,34);assert.equal(new Set(CAST.map(c=>c.name)).size,34);
  const represented=new Set([...actors.npcs.map(n=>n.castId).filter(Boolean),actors.chameleon.castId]);
  assert.deepEqual([...represented].sort(),CAST.map(c=>c.id).sort());
  assert.ok(CAST.every(c=>c.description.length>30));assert.ok(actors.chameleon.exclaim&&actors.chameleon.spark);
  assert.equal(actors.npcs.find(n=>n.castId==='pascal').group,actors.chameleon.group);
  assert.equal(PLACE_LORE.length,7);
});
test('Clue-givers move with their memories and retain their identities and hints',()=>{
  for(const clue of CLUES.filter(c=>c.npc)){
    const npc=actors.npcs.find(n=>n.clueId===clue.id);
    if(npc.castId!=='pascal'&&!clue.discovery){assert.ok(Math.hypot(npc.group.position.x-clue.x,npc.group.position.z-clue.z)<8);}
    assert.equal(npc.hint,clue.hint);assert.ok(clue.npc.includes(npc.name));
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
    assert.ok((world.dryIslands||[]).some(i=>Math.hypot(p.x-i.x,p.z-i.z)<i.r-.5)||world.waters.every(w=>((p.x-w.x)/w.rx)**2+((p.z-w.z)/w.rz)**2>=1),`${n.name} overlaps water`);
  }
});
