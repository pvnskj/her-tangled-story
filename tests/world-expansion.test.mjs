import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {scene,world,Player,CLUES} from './world-fixture.mjs';
import {ZONES,LAKE,PATHS,STAR_VERTICES,movePoint,offsetFor,segmentDistance} from '../js/world-layout.js';
const {CONFIG}=await import('../js/config.js');
const player=new Player(scene,world),nav=player.navigation;
test('Nine real destinations, all four new landmarks, expanded lake and original pier',()=>{
 assert.equal(ZONES.length,9);assert.equal(new Set(ZONES.map(z=>z.id)).size,9);
 assert.deepEqual(Object.keys(world.landmarks).sort(),['castle','cave','dark','sundrop']);
 for(const landmark of Object.values(world.landmarks))assert.ok(landmark.parent?.parent===scene&&landmark.visible&&landmark.name);
 assert.ok(LAKE.rx*LAKE.rz/(42*32)>2.3);assert.equal(LAKE.x+LAKE.rx,movePoint('lake',{x:-38,z:20}).x);
 const d=offsetFor('lake');assert.deepEqual(world.dockRect,{x0:-58+d.x,x1:-36+d.x,z0:17.5+d.z,z1:22.5+d.z});
 assert.equal(CLUES.length,32);
});
test('Every brown road is visible, matches its walking segment, and has continuous clearance',()=>{
 scene.updateMatrixWorld(true);
 const meshes=scene.children.filter(o=>o.name==='Brown connecting path');assert.equal(meshes.length,world.paths.length);
 for(const path of world.paths){const [ax,az,bx,bz]=path;const mesh=meshes.find(m=>JSON.stringify(m.userData.pathSegment)===JSON.stringify(path));assert.ok(mesh);
  assert.equal(mesh.material.color.getHex(),0x9a8563);
  const half=Math.hypot(bx-ax,bz-az)/2,a=new THREE.Vector3(-half,0,0).applyMatrix4(mesh.matrixWorld),b=new THREE.Vector3(half,0,0).applyMatrix4(mesh.matrixWorld);
  assert.ok(Math.hypot(a.x-ax,a.z-az)<.001&&Math.hypot(b.x-bx,b.z-bz)<.001,'Rendered road orientation differs from navigation');
  for(let t=0;t<=1;t+=.005)assert.ok(nav.canWalk(ax+(bx-ax)*t,az+(bz-az)*t,.85),`Blocked brown road ${path} at ${t}`);
 }
});
test('All 81 entrance-to-entrance journeys stay on the visible brown network',()=>{
 for(const from of ZONES)for(const to of ZONES){const road=nav.roadRoute(from.entry,to.entry);assert.ok(road,`${from.id} to ${to.id}`);
  for(let i=1;i<road.length;i++){const a=road[i-1],b=road[i];for(let t=0;t<=1;t+=.02){const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;assert.ok(nav.canWalk(x,z));assert.ok(nav.pathDistance(x,z)<.001,'Travel left the brown road');}}
 }
});
test('Map destination selections walk and arrive at all nine places without teleporting',()=>{
 player.teleport(CONFIG.SPAWN.x,CONFIG.SPAWN.z);player.setInput(0,0);const arrived=[];player.onPlaceArrival=id=>arrived.push(id);
 for(const place of ZONES){player.autoTarget={...place.entry,radius:1.1,zone:place.id,destinationId:place.id};
  let frames=0;while(player.autoTarget&&frames++<6000){const before=player.group.position.clone();player.update(1/30);assert.ok(nav.canWalk(player.group.position.x,player.group.position.z));assert.ok(before.distanceTo(player.group.position)<11/30+.001);}
  assert.equal(arrived.at(-1),place.id,`${place.id} failed arrival`);
 }
 assert.deepEqual(arrived,ZONES.map(z=>z.id));
});
test('Castle bridge and dry island are walkable while its surrounding bay stays water',()=>{
 const clear=(x,z)=>{const p=movePoint('castle',{x,z});return nav.canWalk(p.x,p.z);};assert.ok(clear(0,142));assert.ok(clear(24,137));assert.equal(clear(-29,160),false);
});
test('Map uses world roads and water; clue and photo UI outside map remains unchanged',()=>{
 const ui=fs.readFileSync(new URL('../js/ui.js',import.meta.url),'utf8');
 assert.match(ui,/for\(const \[ax,az,bx,bz\] of world.paths\)/);
 assert.match(ui,/for\(const water of world.waters\)/);
 assert.match(ui,/for\(const \[i,place\] of ZONES.entries\(\)\)/);
});

test('Expanded scenery uses bounded opacity and finite transforms',()=>{
 world.update(1/60,1,0,-58);
 scene.traverse(object=>{
  assert.ok([...object.position,...object.scale].every(Number.isFinite));
  for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[])assert.ok(material.opacity>=0&&material.opacity<=1,`${object.name}: invalid opacity ${material.opacity}`);
 });
});

test('Nine equally spaced points; all memories spread over nine short chapters',()=>{
 for(let i=0;i<9;i++){
  const a=ZONES[i],b=ZONES[(i+1)%9];
  assert.ok(Math.abs(Math.hypot(a.x,a.z)-205)<.002);
  assert.ok(Math.abs(Math.hypot(a.x-b.x,a.z-b.z)-2*205*Math.sin(Math.PI/9))<.002);
  const count=CLUES.filter(c=>c.zone===a.id).length;assert.ok(count>=2&&count<=5);
 }
 assert.equal(STAR_VERTICES.length,18);assert.equal(PATHS.length,18);
 assert.deepEqual(CLUES.filter((c,i)=>!i||c.zone!==CLUES[i-1].zone).map(c=>c.zone),ZONES.map(z=>z.id));
});
