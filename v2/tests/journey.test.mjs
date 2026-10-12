// Controller integration, not a browser/render test: real scene/rig and
// interaction controller with a minimal DOM adapter for modal/buttons/storage.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {buildWorld} from '../world.js';
import {createHero,Braid} from '../hero.js';
import {Adventure} from '../adventure.js';
import {MEMORIES,canCelebrate} from '../story.js';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
class Element{constructor(){this.children=[];this.style={setProperty(){}};this.hidden=false;this.open=false;this.textContent='';this.value='';}append(...nodes){this.children.push(...nodes);}replaceChildren(){this.children=[];}setAttribute(){}showModal(){this.open=true;}close(){this.open=false;}getContext(){return new Proxy({},{get:()=>()=>{}});}}
test('every referenced UI element exists exactly once in the shipped HTML',async()=>{const matches=[...html.matchAll(/\bid="([^"]+)"/g)];assert.equal(matches.length,ids.size);for(const file of ['main.js','adventure.js']){const src=await readFile(new URL('../'+file,import.meta.url),'utf8');for(const [,id]of src.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.has(id),`${file}: missing #${id}`);}});
test('complete core journey, dialogue, rowboat, birthday finale and saved reload',async()=>{
  const nodes=new Map([...ids].map(id=>[id,new Element()]));globalThis.document={getElementById(id){assert.ok(nodes.has(id),id);return nodes.get(id);},createElement(){return new Element();}};
  const scene=new T.Scene(),world=buildWorld(scene,'low'),buf=await readFile(new URL('../assets/story-hero.glb',import.meta.url)),gltf=await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),'');
  const hero=createHero(scene,gltf),braid=new Braid(scene),camera=new T.PerspectiveCamera(49,1,.06,180),saved=new Map(),store={get:(k,f)=>saved.get(k)??f,set:(k,v)=>saved.set(k,v)};
  const a=new Adventure({scene,world,hero,braid,camera,quality:'low',store,go(){},clearInput(){},message(){},chime(){}});
  let time=0;const tick=(duration)=>{for(let t=0;t<duration;t+=.1){time+=.1;if(a.locked)a.step(.1,time);a.update(.1,time);}};
  const at=id=>{const m=MEMORIES[id-1];hero.group.position.set(m.x,0,m.z);a.interact();};
  at(33);assert.equal(a.locked,false);assert.equal(a.found.has(33),false);
  at(1);tick(1.3);assert.ok(a.found.has(1));nodes.get('memory').close();
  at(7);hero.group.position.set(22,0,20.1);tick(7);assert.ok(a.found.has(7));nodes.get('memory').close();
  at(12);assert.ok(nodes.get('conversation').open);assert.equal(nodes.get('dialogue-choices').children.length,2);nodes.get('dialogue-choices').children[1].onclick();assert.ok(a.found.has(12));nodes.get('memory').close();
  at(17);tick(1.3);assert.ok(a.found.has(17));nodes.get('memory').close();
  const object=hero.group;at(26);assert.equal(a.mode,'boarding');tick(1.7);assert.equal(a.mode,'boat');tick(26);tick(1.7);assert.equal(a.mode,'explore');assert.ok(a.found.has(26));assert.equal(hero.group,object);assert.ok(Math.hypot(hero.group.position.x+8,hero.group.position.z-15)<.001);assert.ok(canCelebrate(a.found));nodes.get('memory').close();
  at(32);nodes.get('wish-input').value='Another year of adventures.';nodes.get('wish-save').onclick();nodes.get('memory').close();
  at(33);assert.equal(a.mode,'finale');tick(24.2);assert.ok(a.found.has(33));assert.ok(nodes.get('finale').open);assert.match(nodes.get('saved-wish').textContent,/Another year/);assert.equal(a.mode,'explore');assert.equal(hero.group,object);
  const progress=JSON.parse(saved.get('progress'));for(const id of [1,7,12,17,26,32,33])assert.ok(progress.found.includes(id));assert.equal(nodes.get('count').textContent,a.found.size);
  // Optional memories remain discoverable after the finale.
  nodes.get('finale').close();at(2);tick(1.3);assert.ok(a.found.has(2));
  // Manual seated/dance poses never leak into a later idle pose.
  hero.update(.1,{pose:'sit'});hero.update(.1,{pose:'idle'});assert.ok(Math.abs(hero.bones.ThighL.rotation.x)<.01);
});
