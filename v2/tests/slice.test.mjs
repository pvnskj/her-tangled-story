import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {sampleOpening,DURATION,LANDING,safeMove} from '../timeline.js';
import {findPath} from '../navigation.js';
import {createHero,Braid} from '../hero.js';
import {buildWorld} from '../world.js';
const asset=new URL('../assets/story-hero.glb',import.meta.url);
async function model(){const b=await readFile(asset);return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
test('all scene boundaries are continuous; control begins at the landing',()=>{
  for(const t of [9,12,13,18,20,21,29,30,31.5,32,33,35,40]){const a=sampleOpening(t-1e-5),b=sampleOpening(t+1e-5);assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.002,`position discontinuity at ${t}`);assert.ok(Math.abs(a.yaw-b.yaw)<.002,`rotation discontinuity at ${t}`);}
  for(let t=0;t<40;t+=.05)assert.equal(sampleOpening(t).control,false);
  assert.deepEqual(((s)=>({x:s.x,y:s.y,z:s.z}))(sampleOpening(DURATION)),LANDING);assert.equal(sampleOpening(40).control,true);
});
test('climb clears the window sill before crossing the tower wall',()=>{for(let t=18;t<=21;t+=.01){const s=sampleOpening(t);if(s.z>2.7&&s.z<3.28)assert.ok(s.y>=18.82,`sill collision at ${t.toFixed(2)}`);}});
test('avatar is a skinned glTF with usable animation clips and stable vertices',async()=>{
  const gltf=await model(),scene=new T.Scene(),hero=createHero(scene,gltf);let skins=0;
  hero.group.traverse(o=>{if(o.isSkinnedMesh){skins++;assert.ok(o.skeleton.bones.length>=18);const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)));}});
  assert.ok(skins>15);assert.deepEqual(gltf.animations.map(a=>a.name).sort(),['Descent','Gather','Idle','Landing','Walk','Wave']);
  for(let i=0;i<2400;i++){const s=sampleOpening(i/60);hero.group.position.set(s.x,s.y,s.z);hero.group.rotation.y=s.yaw;hero.update(1/60,{pose:s.pose,time:s.t});}
  hero.group.updateMatrixWorld(true);hero.group.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
});
test('descent hands reach the grip targets throughout the slide',async()=>{
  const hero=createHero(new T.Scene(),await model());
  for(const t of [21,22,24,26,28]){const s=sampleOpening(t);hero.group.position.set(s.x,s.y,s.z);hero.group.rotation.y=s.yaw;hero.update(.1,{pose:s.pose,time:t});hero.group.updateMatrixWorld(true);
    for(const [side,target]of [['L',new T.Vector3(.02,s.y+1.25,s.z-.32)],['R',new T.Vector3(.08,s.y+1.47,s.z-.34)]]){
      const actual=hero.bones['Hand'+side].getWorldPosition(new T.Vector3());assert.ok(actual.distanceTo(target)<.025,`${side} hand misses by ${actual.distanceTo(target)} at ${t}`);
    }
  }
});
test('braid geometry remains finite during release and gameplay',async()=>{const scene=new T.Scene(),hero=createHero(scene,await model()),braid=new Braid(scene);for(const t of [0,12,13,17,20,24,29,30,31,32,34,39,40]){const s=sampleOpening(t);hero.group.position.set(s.x,s.y,s.z);hero.group.rotation.y=s.yaw;hero.update(.01,{pose:s.pose,time:t});braid.update(hero,t,t<40);for(const m of braid.strands)assert.ok(m.geometry.attributes.position.array.every(Number.isFinite));}});
test('walking cannot tunnel through the tower or leave the clearing',()=>{const c=[{x:0,z:0,r:3.45}];const result=safeMove({x:0,z:6},{x:0,z:-14},c);assert.ok(Math.hypot(result.x,result.z)>=3.73-1e-8);const bounded=safeMove({x:23,z:23},{x:100,z:100},c);assert.ok(bounded.x<=24&&bounded.z<=24);});
test('click navigation routes around the tower, rejects water and reaches the keepsake',()=>{const c=[{x:0,z:0,r:3.45},{x:-18,z:15,r:8.4}];const path=findPath({x:0,z:6},{x:0,z:-6},c);assert.ok(path.length>15);for(const p of path)assert.ok(Math.hypot(p.x,p.z)>=3.89);assert.deepEqual(findPath(LANDING,{x:-18,z:15},c),[]);assert.ok(findPath(LANDING,{x:-1.4,z:7.9},c).length>0);});
test('world builds with merged static geometry and instanced vegetation',()=>{
  // Canvas stand-in permits structural scene checks only; it does not render or
  // pretend to validate WebGL, typography, screenshots, or browser performance.
  globalThis.document={createElement(){return {width:0,height:0,getContext(){return new Proxy({},{get:()=>()=>{}});}};}};
  const scene=new T.Scene(),world=buildWorld(scene,'low');let instances=0,meshCount=0;
  scene.traverse(o=>{if(o.isInstancedMesh){instances++;assert.ok(o.count<=o.instanceMatrix.count);}if(o.isMesh)meshCount++;});
  assert.ok(instances>=5);assert.ok(meshCount<430,`too many scene meshes: ${meshCount}`);assert.ok(world.colliders.length>=10);assert.ok(world.chest.position.distanceTo(new T.Vector3(LANDING.x,0,LANDING.z))<4);
});
test('V2 first-memory integration keeps all 33 original records available',async()=>{const {CLUES}=await import('../../js/clues.js');assert.equal(CLUES.length,33);assert.equal(new Set(CLUES.map(c=>c.id)).size,33);const c=CLUES.find(c=>c.id===1);assert.ok((await readFile(new URL('../../'+c.photo,import.meta.url))).length>1000);});
