import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {scene,world,actors,Player,CLUES,targetFor} from './world-fixture.mjs';
import {movePoint,ZONES} from '../js/world-layout.js';
import {clueTarget,Navigation} from '../js/navigation.js';
const main=fs.readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
const section=(a,b)=>main.slice(main.indexOf(a),main.indexOf(b,main.indexOf(a)));
function harness(){
  const player=new Player(scene,world),found=new Set(),pending=[],modals=[],guides=[];
  const UI={riddleModal:async()=>true,photoModal:c=>modals.push(c.id),finaleModal:()=>modals.push(32),setCounter(){},setGuide:s=>guides.push(s),blip(){},chime(){},fanfare(){},dialogue(){},banner(){}};
  const context=vm.createContext({player,found,CLUES,npcs:actors.npcs,world,UI,GUIDES:{},CONFIG:{INTERACT_RADIUS:5,FINAL_MESSAGE:''},clueTarget,lakeFinale:{locked:false,startBoat(){modals.push(32)},startEscort(){}},DEBUG:false,console,setTimeout:fn=>pending.push(fn),refreshMarkers(){}});
  vm.runInContext('let modalOpen=false;'+section('function updateGuide()', 'UI.onModalClose =')+section('function npcHeadWorld(', '// ---------- boat ride')+section('function walkToClue(', 'UI.onGuideTap(')+section('const BOAT_PARK', 'function updateBoat('),context);
  const arrival=section('  // walk-into detection:', '  // chameleon hot/cold');
  return {player,found,pending,modals,guides,context,async tick(dt){player.update(dt);vm.runInContext(arrival,context);await Promise.resolve();},async close(){while(pending.length){pending.shift()();await Promise.resolve();}vm.runInContext('modalOpen=false',context);}};
}

for(const fps of [20,30,60]) test(`All 32 clues: actual guide/marker/NPC handlers, ${fps}fps, no water or collider penetration`,async()=>{
  const h=harness();let walkTime=0;
  for(const clue of CLUES){
    h.context.next=clue;
    if(clue.id%3===0&&clue.kind==='villager')vm.runInContext('interactWith({kind:"npc",npc:npcs.find(n=>n.clueId===next.id)})',h.context);
    else if(clue.id%3===1)vm.runInContext('interactWith({kind:"clue",clue:next})',h.context);
    else vm.runInContext('walkToClue(next)',h.context);
    let frame=0;const p=h.player;
    while(!h.found.has(clue.id)&&!h.pending.length&&frame<fps*45){
      const before=p.group.position.clone();await h.tick(1/fps);frame++;
      assert.ok(p.navigation.canWalk(p.group.position.x,p.group.position.z),`clue ${clue.id}: solid/water overlap`);
      assert.ok(before.distanceTo(p.group.position)<=11/fps+.001,`clue ${clue.id}: teleport or speed change`);
    }
    await h.close();
    assert.ok(h.found.has(clue.id),`clue ${clue.id} did not arrive at ${fps}fps`);
    walkTime+=frame/fps;
  }
  assert.deepEqual(h.modals,CLUES.map(c=>c.id));assert.ok(walkTime<300,`Nine-place journey took ${walkTime.toFixed(1)} seconds`);console.log(`${fps}fps journey: ${walkTime.toFixed(1)}s walking`);
});

test('Off-path forest starts, dirt-path travel and narrow tree gaps remain navigable',()=>{
  const p=new Player(scene,world),nav=p.navigation;
  for(const start of [{x:80,z:-40},{x:72,z:-25},{x:90,z:-55}].map(p=>movePoint('forest',p))){
    if(!nav.canWalk(start.x,start.z))continue;
    p.teleport(start.x,start.z);p.setInput(0,0);p.autoTarget=targetFor(CLUES[5]);
    let frame=0;for(;frame<3600;frame++){p.update(1/60);assert.ok(nav.canWalk(p.group.position.x,p.group.position.z));if(Math.hypot(p.group.position.x-CLUES[5].x,p.group.position.z-CLUES[5].z)<p.autoTarget.radius)break;}
    assert.ok(frame<3600,JSON.stringify(start));p.autoTarget=null;
  }
  const route=nav.route(ZONES.find(z=>z.id==='village').entry,{...ZONES.find(z=>z.id==='tavern').entry,zone:'tavern',radius:1.1});
  let length=0,onRoad=0;
  for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],d=Math.hypot(b.x-a.x,b.z-a.z);length+=d;if(nav.pathDistance((a.x+b.x)/2,(a.z+b.z)/2)<2)onRoad+=d;}
  assert.ok(onRoad/length>.85,`Dirt path usage ${onRoad/length}`);
  const small={paths:[],waters:[],dockRect:world.dockRect,colliders:[{x:0,z:0,r:1},{x:3,z:0,r:1}]};
  const gapNav=new Navigation(small,10),gap=gapNav.route({x:1.5,z:-4},{x:1.5,z:4,radius:1});
  assert.ok(gap);assert.ok(gap.some(q=>q.x<-.5||q.x>3.5),'Route should go around the too-narrow gap');
});

test('Manual takeover cancels immediately; manual motion slides without entering solid scenery',()=>{
  const p=new Player(scene,world);p.autoTarget=targetFor(CLUES[0]);p.update(1/60);p.setInput(1,0);p.update(1/60);assert.equal(p.autoTarget,null);
  for(const direction of [[1,1],[-1,0],[0,-1],[-1,1],[1,0]]){p.setInput(...direction);for(let frame=0;frame<900;frame++){p.update(1/30);assert.ok(p.navigation.canWalk(p.group.position.x,p.group.position.z));}}
});

test('Boat cannot bypass Flynn or reveal the finale out of order',async()=>{
 const h=harness();vm.runInContext('tapBoat()',h.context);assert.equal(h.found.size,0);
 for(let i=1;i<32;i++)h.found.add(i);vm.runInContext('tapBoat()',h.context);assert.equal(h.found.has(32),false);assert.ok(h.player.autoTarget);
});

test('Photo/riddle and map overlays pause walking and boat input',()=>{
 assert.match(main,/if \(!modalOpen && !UI\.isMapOpen\(\)\) \{\s*player\.update\(dt\);\s*updateBoat\(dt, t\);/);
});

test('Boat exits around the lake land on clear, reachable ground',()=>{
 const h=harness(),w=world.waters[0];for(let i=1;i<=32;i++)h.found.add(i);
 const saved=world.boat.group.position.clone();
 for(let angle=0;angle<Math.PI*2;angle+=Math.PI/12){
   world.boat.group.position.set(w.x+Math.cos(angle)*w.rx*.95,.35,w.z+Math.sin(angle)*w.rz*.95);
   h.player.riding=true;world.boat.riding=true;
   const landing=h.player.navigation.nearestWalkable(world.boat.group.position,16);
   vm.runInContext('tapBoat()',h.context);
   assert.equal(h.player.riding,!landing,'Stay aboard when this edge is beyond the playable shore');
   if(landing)assert.ok(h.player.navigation.canWalk(h.player.group.position.x,h.player.group.position.z));
 }
 world.boat.group.position.copy(saved);world.boat.riding=false;
});
