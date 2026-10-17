import * as THREE from 'three';
import { buildWorld, ZONES } from './world.js';
import { Player } from './player.js?v=20261017g';
import { buildNPCs } from './npcs.js?v=20261017g';
import { UI } from './ui.js?v=20261017g';
import { CHAPTERS, loadJourney, saveJourney } from './journey.js?v=20261017g';
import { safeLanding } from './navigation.js?v=20261017g';

const canvas=document.getElementById('game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.1,700);
function resize(){camera.aspect=innerWidth/innerHeight;camera.fov=camera.aspect<1?58:48;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
window.addEventListener('resize',resize);resize();
// The original world builder is deliberately unchanged.
const world=buildWorld(scene),player=new Player(scene,world);
const {npcs,chameleon,update:updateNPCs}=buildNPCs(scene);
scene.traverse(o=>{if(o.isMesh){o.castShadow=!o.material?.transparent;o.receiveShadow=true;}});
let storage;try{storage=window.localStorage;}catch{storage=null;}
const state=loadJourney(storage);
const landings=new Map(CHAPTERS.map(c=>[c.id,safeLanding(world,c)]));
let selected=CHAPTERS.find(c=>c.id===state.last)||CHAPTERS[0];
const initial=landings.get(selected.id);if(initial)player.teleport(initial.x,initial.z);
player.updateCamera(camera,0,true);
let started=false,traveling=false,celebrating=false,currentZone='',promptTarget=null;
const keys={},reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function stop(){for(const k of Object.keys(keys))delete keys[k];UI.joystick.x=UI.joystick.y=0;document.getElementById('stick').style.transform='translate(-50%,-50%)';player.stop();}
function blocked(){return !started||traveling||UI.blocked();}
const chapterById=id=>CHAPTERS.find(c=>c.id===id);
function near(c){const l=landings.get(c.id);return l&&Math.hypot(player.group.position.x-l.x,player.group.position.z-l.z)<10;}
function refresh(){UI.setJourney(selected,near(selected));}
function persist(){saveJourney(storage,state);}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function travel(id){
  const c=chapterById(id);if(!c||traveling)return;
  const landing=landings.get(id);if(!landing){UI.banner('Let’s choose another place for now.');return;}
  UI.close();stop();traveling=true;document.body.classList.add('traveling');
  const veil=document.getElementById('travel-veil');document.getElementById('travel-label').textContent=c.place;veil.classList.add('show');
  await delay(reducedMotion?0:300);
  if(player.riding)leaveBoat();
  player.teleport(landing.x,landing.z);player.updateCamera(camera,0,true);
  chameleon.group.position.set(landing.x+1,0,landing.z+1);
  selected=c;state.last=c.id;persist();refresh();
  document.getElementById('cam-toggle').textContent='View';
  await delay(reducedMotion?0:180);veil.classList.remove('show');
  await delay(reducedMotion?0:280);traveling=false;document.body.classList.remove('traveling');
  UI.banner(c.place);UI.openGift(c);
}
function go(id){if(blocked())return;const c=chapterById(id);if(near(c)){stop();UI.openGift(c);}else travel(id);}
function celebrate(){celebrating=true;world.releaseLanterns();UI.fanfare();UI.banner('Happy birthday, my love. ♡');}
UI.init(state,{
  begin(){started=true;refresh();UI.banner('Welcome to your little world ♡');},
  camera(){const mode=player.cycleCamMode();document.getElementById('cam-toggle').setAttribute('aria-label',mode==='top'?'Switch to story view':'Switch to overhead view');return mode;},stop,go,travel,
  opened(id){state.opened.add(id);persist();refresh();},
  wish(){world.releaseLanterns();},celebrate,
});

// The existing boat remains usable, with an always-available return to shore.
const boatPark=world.boat.group.position.clone();
function boardBoat(){
  if(blocked())return;
  player.riding=true;world.boat.riding=true;player.stop();UI.walking=true;document.body.classList.add('walking');
  document.getElementById('walk-toggle').textContent='Pause walking';document.getElementById('walk-toggle').setAttribute('aria-pressed','true');
  UI.banner('Use the joystick or arrow keys to drift across the lake.');
}
function leaveBoat(){world.boat.riding=false;player.riding=false;world.boat.group.position.copy(boatPark);world.boat.group.rotation.set(0,0,0);const l=landings.get('lake');if(l)player.teleport(l.x,l.z);player.sprite.position.y=0;}
function returnToShore(){stop();leaveBoat();player.updateCamera(camera,0,true);selected=chapterById('lake');refresh();UI.banner('Back by the water’s edge.');}
function updateBoat(dt,t){
  if(!player.riding)return;
  const b=world.boat.group,w=world.waters[0];
  if(!blocked()&&UI.walking){const {x,z}=player.moveVec,len=Math.max(1,Math.hypot(x,z)),a=player.orbit.yaw;
    const dx=(x*Math.cos(a)+z*Math.sin(a))/len*6*dt,dz=(-x*Math.sin(a)+z*Math.cos(a))/len*6*dt;
    const nx=b.position.x+dx,nz=b.position.z+dz;
    if(((nx-w.x)/w.rx)**2+((nz-w.z)/w.rz)**2<.95){b.position.x=nx;b.position.z=nz;}
    if(Math.hypot(dx,dz)>.001)b.rotation.y=Math.atan2(dx,dz);
  }
  b.position.y=.35+Math.sin(t*1.8)*.07;player.group.position.set(b.position.x,.6,b.position.z);player.group.rotation.y=b.rotation.y;
}

function talk(n){if(blocked())return;UI.blip();UI.dialogue(n.name,n.activityLine||n.flavor||'A lovely evening, made just for you.');}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let down=null,last=null;
canvas.addEventListener('pointerdown',e=>{if(blocked())return;down={x:e.clientX,y:e.clientY};last=down;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!down||blocked())return;const p={x:e.clientX,y:e.clientY};if(Math.hypot(p.x-down.x,p.y-down.y)>10)player.addLook(p.x-last.x,p.y-last.y);last=p;});
canvas.addEventListener('pointerup',e=>{
  const start=down;down=last=null;if(!start||blocked()||Math.hypot(e.clientX-start.x,e.clientY-start.y)>12)return;
  pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);raycaster.setFromCamera(pointer,camera);
  for(const hit of raycaster.intersectObjects(npcs.map(n=>n.group),true)){let o=hit.object;while(o&&!o.userData.npc)o=o.parent;const n=o?.userData.npc;if(n&&player.group.position.distanceTo(n.group.position)<9){talk(n);break;}}
});
canvas.addEventListener('pointercancel',()=>{down=last=null;});
canvas.addEventListener('lostpointercapture',()=>{down=last=null;});
for(const n of npcs)n.group.userData.npc=n;
window.addEventListener('keydown',e=>{
  if(blocked()||e.target.matches('textarea,input'))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  keys[e.code]=true;
  if(e.code==='KeyE'&&!e.repeat)promptTarget?.();
  if(e.code==='KeyV'&&!e.repeat)document.getElementById('cam-toggle').click();
});
window.addEventListener('keyup',e=>delete keys[e.code]);window.addEventListener('blur',stop);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
const prompt=document.getElementById('interact-prompt');prompt.onclick=()=>promptTarget?.();
const clock=new THREE.Clock();let hudT=0;
function animate(){
  requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
  const canMove=!blocked(),manualKeys=canMove?{x:(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),z:(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0)}:{x:0,z:0};
  player.setInput(canMove?manualKeys.x+(UI.walking?UI.joystick.x:0):0,canMove?manualKeys.z+(UI.walking?UI.joystick.y:0):0);
  if(canMove)player.update(dt);updateBoat(dt,t);
  const p=player.group.position;world.update(dt,t,p.x,p.z);world.setLanternBoost(player.riding||celebrating);updateNPCs(dt,t,p);player.updateCamera(camera,dt);
  chameleon.excited=false;chameleon.leadTarget=null;
  world.sun.position.set(p.x-40,55,p.z+30);world.sun.target.position.set(p.x,0,p.z);
  hudT+=dt;
  if(hudT>.25){hudT=0;if(started)refresh();
    const zone=world.zoneAt(p.x,p.z);if(started&&!blocked()&&zone?.id!==currentZone){currentZone=zone?.id;if(zone)UI.banner(zone.name);}
    let text=null;promptTarget=null;
    if(!blocked()){
      if(player.riding){text='Back to shore';promptTarget=returnToShore;}
      else if(Math.hypot(p.x-world.boat.group.position.x,p.z-world.boat.group.position.z)<16){text='Take a boat ride';promptTarget=boardBoat;}
      else{const n=npcs.filter(n=>Math.hypot(p.x-n.group.position.x,p.z-n.group.position.z)<6).sort((a,b)=>p.distanceTo(a.group.position)-p.distanceTo(b.group.position))[0];if(n){text=`Say hello · ${n.name}`;promptTarget=()=>talk(n);}}
    }
    prompt.classList.toggle('hidden',!text);if(text)prompt.textContent=text;
  }
  renderer.render(scene,camera);
}
animate();
// Read-only diagnostic surface for local checks; only exposed with ?debug=1.
if(new URLSearchParams(location.search).has('debug'))window.__game={player,world,npcs,landings,CHAPTERS,state,travel,UI};
