import test from 'node:test';
import assert from 'node:assert/strict';
import {scene,world,actors,Player,CLUES} from './world-fixture.mjs';
import {CAST} from '../js/cast.js';
import {createLakeFinale} from '../js/lake-finale.js';
import {buildDiscoveries} from '../js/story-discoveries.js';
import {ZONES} from '../js/world-layout.js';
test('32 mixed clues cover all nine places and all 34 characters, with Maximus then Flynn',()=>{
 assert.equal(CLUES.length,32);assert.equal(CLUES.filter(c=>c.discovery).length,18);
 assert.deepEqual([...new Set(CLUES.flatMap(c=>c.characters))].sort(),CAST.map(c=>c.id).sort());
 assert.equal(CLUES[30].characters[0],'maximus');assert.equal(CLUES[31].characters[0],'eugene');assert.ok(CLUES[31].finale);
 assert.ok(CLUES.slice(-2).every(c=>c.zone==='lake'));
 for(const z of ZONES)assert.ok(CLUES.some(c=>c.zone===z.id));
 for(const clue of CLUES)for(const id of clue.characters)assert.ok(actors.npcs.some(n=>n.castId===id&&n.clueId===clue.id));
 const animate=buildDiscoveries(scene,CLUES,actors.npcs);animate(2);
 for(const c of CLUES.filter(c=>c.discovery))assert.ok(scene.children.some(o=>o.name===c.discovery.label&&o.userData.clueId===c.id));
});
test('Maximus escorts along clear ground, waits for her, and Flynn rides with her before the final memory',()=>{
 const player=new Player(scene,world),horse=actors.npcs.find(n=>n.castId==='maximus'),flynn=actors.npcs.find(n=>n.castId==='eugene');
 player.teleport(horse.group.position.x+2,horse.group.position.z);let completed=0;
 const ending=createLakeFinale({world,player,npcs:actors.npcs,onComplete:()=>completed++});
 ending.startEscort();assert.equal(ending.phase,'escorting');
 const frozen=horse.group.position.clone();ending.update(1,0,true);assert.deepEqual(horse.group.position,frozen);
 for(let f=0;f<3000;f++){
  player.update(1/30);world.update(1/30,f/30,player.group.position.x,player.group.position.z);actors.update(1/30,f/30,player.group.position);ending.update(1/30,f/30);
  assert.ok(player.navigation.canWalk(player.group.position.x,player.group.position.z));
  assert.ok(player.navigation.canWalk(horse.group.position.x,horse.group.position.z));
  if(player.group.position.distanceTo(flynn.group.position)<3.5)break;
 }
 assert.ok(player.group.position.distanceTo(flynn.group.position)<3.5);
 ending.startBoat();assert.equal(completed,0);
 let sailingFrames=0;
 for(let f=0;f<3000&&ending.phase!=='complete';f++){
  player.setInput(0,0);player.update(1/30);world.update(1/30,f/30,player.group.position.x,player.group.position.z);actors.update(1/30,f/30,player.group.position);ending.update(1/30,f/30);
  if(ending.phase==='sailing'){
   sailingFrames++;const b=world.boat.group.position,w=world.waters[0];
   assert.ok(((b.x-w.x)/w.rx)**2+((b.z-w.z)/w.rz)**2<1);
   assert.ok(player.group.position.distanceTo(flynn.group.position)<2.1);
   assert.ok(player.riding&&world.boat.riding);
  }
 }
 assert.equal(ending.phase,'complete');assert.equal(completed,1);assert.ok(sailingFrames>=719);
});
