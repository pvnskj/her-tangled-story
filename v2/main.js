import * as T from 'three';
import {buildWorld,groundHeight} from './world.js';
import {loadHero,Braid} from './hero.js';
import {sampleOpening,DURATION,LANDING,phase,clamp,mix} from './timeline.js';
import {findPath,safeMove} from './navigation.js';
import {Adventure} from './adventure.js';
import {WORLD_BOUND} from './story.js';
const $=id=>document.getElementById(id),V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const store={get(k,fallback){try{return localStorage.getItem('tangled-v2-'+k)??fallback;}catch{return fallback;}},set(k,v){try{localStorage.setItem('tangled-v2-'+k,v);}catch{}}};
const quality=store.get('quality',matchMedia('(pointer:coarse)').matches?'low':'balanced');$('quality').value=quality;
let renderer,world,hero,braid,scene,camera,adventure,fastTravel=false,state='loading',time=0,ambientTime=0,paused=false,path=[],speed=0,move={x:0,z:0},keys=new Set(),last=0,returnSeen=store.get('seen','0')==='1',memoryFound=store.get('memory-1','0')==='1';
let audio=null,soundOn=false,toastTimer,drag=null,stickPointer=null,invitationUntil=0;
const orbit={yaw:2.08,pitch:.42,distance:7};const defaultOrbit={...orbit};let controlBasis=null;
const ray=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(V(0,1,0),0),look=V(),target=V(),desired=V();
function message(text){$('toast').textContent=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').textContent='',4200);}
function fail(error){console.error(error);$('error').hidden=false;$('error-text').textContent='The 3D scene could not start. Please try a browser with WebGL enabled, or return to the original adventure.';$('load-status').textContent='The world could not finish loading.';state='error';}
function modalsOpen(){return [...document.querySelectorAll('dialog')].some(d=>d.open);}
function clearInput(){keys.clear();move={x:0,z:0};controlBasis=null;drag=null;stickPointer=null;$('stick').style.transform='';}
function setGameplay(){adventure?.cancel();state='explore';time=DURATION;store.set('seen','1');returnSeen=true;hero.group.position.set(LANDING.x,LANDING.y,LANDING.z);hero.group.rotation.set(0,0,0);hero.play('Idle');Object.assign(orbit,defaultOrbit);path=[];speed=0;clearInput();$('cinema').hidden=true;$('welcome').hidden=true;$('hud').hidden=false;document.body.classList.add('playing');$('chapter-label').textContent='THE TOWER CLEARING';$('invitation').hidden=false;invitationUntil=ambientTime+5;}
function begin(){if(state==='loading'||state==='error')return;adventure?.cancel();document.querySelectorAll('dialog[open]').forEach(d=>d.close());state='cinematic';time=0;paused=false;clearInput();path=[];$('pause').textContent='Pause';$('welcome').hidden=true;$('hud').hidden=true;$('cinema').hidden=false;$('invitation').hidden=true;document.body.classList.remove('playing');}
// Skip uses an in-world camera move to the landing. No fade, replacement or reload.
let skipFrom=null,skipTime=0;
function skip(){if(!hero)return;skipFrom={pos:camera.position.clone(),quat:camera.quaternion.clone()};skipTime=0;setGameplay();state='skipping';$('hud').hidden=true;}
function gameplayCamera(dt,immediate=false){
  look.copy(hero.group.position).add(V(0,1.1,0));desired.copy(look).add(V(Math.sin(orbit.yaw)*orbit.distance,Math.tan(orbit.pitch)*orbit.distance,Math.cos(orbit.yaw)*orbit.distance));
  // Shorten the follow boom against tower and obstacle volumes.
  const direction=desired.clone().sub(look),length=direction.length();direction.normalize();let max=length;
  for(const c of world.colliders){const ox=look.x-c.x,oz=look.z-c.z,a=direction.x**2+direction.z**2,b=2*(ox*direction.x+oz*direction.z),cc=ox**2+oz**2-(c.r+.25)**2,disc=b*b-4*a*cc;if(disc<0||a<1e-8)continue;const hit=(-b-Math.sqrt(disc))/(2*a);if(hit>.1&&hit<max&&look.y+direction.y*hit<(c.height??(c.x===0&&c.z===0?28:6)))max=Math.max(.7,hit-.18);}
  desired.copy(look).addScaledVector(direction,max);desired.y=Math.max(desired.y,groundHeight(desired.x,desired.z)+.5);
  if(immediate)camera.position.copy(desired);else camera.position.lerp(desired,1-Math.exp(-dt*6));camera.lookAt(look);
}
const cameraKeys=[
  [0,[1.35,19.6,-1.25],[0,19.42,1.4]],
  [7,[.85,19.78,.15],[0,19.55,2.65]],
  [12,[-.55,19.5,.72],[0,19.35,2.9]],
  [17,[.05,20.2,4.05],[0,12.5,3.53]],
  [20,[3.7,20.5,7],[.42,19.2,3.65]],
  [24,[5.8,12.8,8.2],[.42,11,3.85]],
  [29,[4.8,3.1,8],[.42,1.6,4.1]],
  [32,[3.7,1.7,8.9],[.42,1.15,5.25]],
  [35,[7.2,3.8,3.2],[.42,1.6,7.4]],
  [40,[LANDING.x+Math.sin(defaultOrbit.yaw)*7,1.1+Math.tan(defaultOrbit.pitch)*7,LANDING.z+Math.cos(defaultOrbit.yaw)*7],[LANDING.x,1.1,LANDING.z]]
];
function cinematicCamera(t){let i=0;while(i<cameraKeys.length-2&&t>cameraKeys[i+1][0])i++;const a=cameraKeys[i],b=cameraKeys[i+1],u=phase(t,a[0],b[0]);camera.position.set(...a[1]).lerp(V(...b[1]),u);target.set(...a[2]).lerp(V(...b[2]),u);camera.lookAt(target);}
const titles=['The tower bedroom','The golden descent','A little courage','A world awaits'];
const lines=['Every adventure begins with a little curiosity.','There is more to the world than the view from a window.','One brave step. A whole new world.','And every little wonder is waiting for you.'];
function stepOpening(dt){time=Math.min(DURATION,time+dt);const s=sampleOpening(time);hero.group.position.set(s.x,s.y,s.z);hero.group.rotation.y=s.yaw;hero.update(dt,{pose:s.pose,time});braid.update(hero,time,true);cinematicCamera(time);$('progress').style.width=time/DURATION*100+'%';$('scene-number').textContent=`0${s.scene+1} / 04`;$('scene-title').textContent=titles[s.scene];$('scene-line').textContent=lines[s.scene];if(time>=DURATION)setGameplay();}
function movePlayer(dt){let ix=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+move.x;let iz=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)-move.z;let dx=0,dz=0;
  if(Math.hypot(ix,iz)>.03){path=[];fastTravel=false;controlBasis??=orbit.yaw;const l=Math.max(1,Math.hypot(ix,iz));ix/=l;iz/=l;dx=Math.cos(controlBasis)*ix-Math.sin(controlBasis)*iz;dz=-Math.sin(controlBasis)*ix-Math.cos(controlBasis)*iz;}
  else {controlBasis=null;if(path.length){const p=path[0],d=Math.hypot(p.x-hero.group.position.x,p.z-hero.group.position.z);if(d<.18){path.shift();if(!path.length)fastTravel=false;}else{dx=(p.x-hero.group.position.x)/d;dz=(p.z-hero.group.position.z)/d;}}}
  const moving=Math.hypot(dx,dz)>.01;speed=T.MathUtils.damp(speed,moving?(fastTravel?5.2:keys.has('shift')?3.1:2.15):0,8,dt);
  if(moving){const p=safeMove(hero.group.position,{x:dx*speed*dt,z:dz*speed*dt},world.colliders,WORLD_BOUND);hero.group.position.set(p.x,groundHeight(p.x,p.z),p.z);const yaw=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(yaw-hero.group.rotation.y),Math.cos(yaw-hero.group.rotation.y));hero.group.rotation.y+=delta*(1-Math.exp(-dt*10));}
  hero.update(dt,{pose:!moving&&waveUntil>ambientTime?'wave':'idle',time:ambientTime,moving,speed});braid.update(hero,ambientTime,false);gameplayCamera(dt);

}
function go(point,quick=false){if(!point){path=[];fastTravel=false;return;}if(state!=='explore'||adventure?.locked)return;path=findPath(hero.group.position,point,world.colliders,WORLD_BOUND);fastTravel=quick&&path.length>0;if(!path.length)message('Choose a clear patch of meadow.');}
function interact(){if(state!=='explore'||modalsOpen())return;adventure?.interact();}

let waveUntil=0;
function chime(){if(!soundOn||!audio)return;[523.25,659.25,783.99].forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=f;o.connect(g);g.connect(audio.destination);const at=audio.currentTime+i*.12;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(.028,at+.03);g.gain.exponentialRampToValueAtTime(.001,at+1.2);o.start(at);o.stop(at+1.3);});}
let ambientGain;
async function toggleAudio(){audio??=new(window.AudioContext||window.webkitAudioContext)();await audio.resume();soundOn=!soundOn;if(!ambientGain){ambientGain=audio.createGain();ambientGain.gain.value=0;ambientGain.connect(audio.destination);[130.81,196,261.63].forEach((f,i)=>{const o=audio.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=i*3;o.connect(ambientGain);o.start();});}ambientGain.gain.setTargetAtTime(soundOn?.009:0,audio.currentTime,.6);$('sound').textContent=soundOn?'Turn ambient sound off':'Turn ambient sound on';chime();}
function fit(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.fov=camera.aspect<1?62:49;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
function frame(ms){requestAnimationFrame(frame);if(!hero||state==='error')return;const dt=Math.min((ms-last)/1000||0,.05);last=ms;if(document.hidden||modalsOpen()||paused)return;ambientTime+=dt;
  if(state==='cinematic')stepOpening(dt);
  else if(state==='skipping'){skipTime+=dt;hero.update(dt,{time:ambientTime});braid.update(hero,ambientTime,false);gameplayCamera(dt,true);const end=camera.position.clone(),q=camera.quaternion.clone(),u=phase(skipTime,0,1.1);camera.position.copy(skipFrom.pos).lerp(end,u);camera.quaternion.copy(skipFrom.quat).slerp(q,u);if(skipTime>=1.1){state='explore';$('hud').hidden=false;}}
  else if(state==='explore'){if(adventure.locked)adventure.step(dt,ambientTime);else movePlayer(dt);}
  else {const s=sampleOpening(0);hero.group.position.set(s.x,s.y,s.z);hero.update(dt,{time:ambientTime});braid.update(hero,0,true);cinematicCamera(0);}
  world.update(dt,state==='ready'?0:state==='cinematic'?time:ambientTime,state==='cinematic'||state==='ready',hero);
  adventure.update(dt,ambientTime,state!=='explore');
  if(state==='explore'&&ambientTime>invitationUntil)$('invitation').hidden=true;renderer.render(scene,camera);
}
async function init(){try{
  renderer=new T.WebGLRenderer({canvas:$('world'),antialias:quality!=='low',powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?2:quality==='low'?1.2:1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;renderer.shadowMap.enabled=quality!=='low';renderer.shadowMap.type=T.PCFSoftShadowMap;
  scene=new T.Scene();camera=new T.PerspectiveCamera(49,1,.06,180);fit();world=buildWorld(scene,quality);$('load-status').textContent='Opening the tower window…';hero=await loadHero(scene);braid=new Braid(scene);adventure=new Adventure({scene,world,hero,braid,camera,quality,store,go,clearInput,message,chime});state='ready';$('begin').disabled=false;$('begin').textContent='Begin her story ↗';$('load-status').textContent='A 40-second opening. Explore whenever you’re ready.';$('direct').hidden=false;requestAnimationFrame(frame);
}catch(error){fail(error);}}
$('begin').onclick=begin;$('direct').onclick=skip;$('skip').onclick=skip;$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Continue':'Pause';};
$('menu-button').onclick=()=>{clearInput();$('settings').showModal();};$('map-button').onclick=()=>{clearInput();$('map').showModal();};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',clearInput));
$('quality').onchange=()=>{store.set('quality',$('quality').value);message('Detail saved for your next visit.');};$('sound').onclick=()=>toggleAudio().catch(()=>message('Audio is unavailable in this browser.'));
$('replay').onclick=()=>{if(!hero)return;$('settings').close();begin();};$('unstuck').onclick=()=>{if(!hero)return;$('settings').close();skip();};$('recover').onclick=()=>Object.assign(orbit,defaultOrbit);
$('interact').onclick=interact;
addEventListener('resize',fit);addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{clearInput();last=performance.now();});
addEventListener('keydown',e=>{if(modalsOpen())return;const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(state!=='explore')return;if(k==='e')interact();else if(k==='m')$('map-button').click();else if(k==='r')$('recover').click();else keys.add(k);});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
$('world').addEventListener('pointerdown',e=>{if(state!=='explore'||modalsOpen())return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};$('world').setPointerCapture(e.pointerId);});
$('world').addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved ||= Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>7;if(drag.moved){orbit.yaw-=dx*.005;orbit.pitch=clamp(orbit.pitch+dy*.004,.16,.9);}drag.x=e.clientX;drag.y=e.clientY;});
$('world').addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;if(!drag.moved&&!adventure.locked){ndc.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(ndc,camera);const p=V();if(ray.ray.intersectPlane(plane,p)&&Math.abs(p.x)<WORLD_BOUND&&Math.abs(p.z)<WORLD_BOUND)go(p);}drag=null;});$('world').addEventListener('pointercancel',()=>drag=null);
$('world').addEventListener('wheel',e=>{if(state==='explore'){e.preventDefault();orbit.distance=clamp(orbit.distance+e.deltaY*.007,3.5,10);}}, {passive:false});
const joy=$('joystick');joy.addEventListener('pointerdown',e=>{stickPointer=e.pointerId;joy.setPointerCapture(e.pointerId);stick(e);});joy.addEventListener('pointermove',e=>{if(stickPointer===e.pointerId)stick(e);});
function stick(e){const r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dz=e.clientY-r.top-r.height/2,len=Math.max(1,Math.hypot(dx,dz)/34);move={x:dx/len/34,z:dz/len/34};$('stick').style.transform=`translate(${dx/len}px,${dz/len}px)`;}
for(const event of ['pointerup','pointercancel','lostpointercapture'])joy.addEventListener(event,()=>{move={x:0,z:0};stickPointer=null;$('stick').style.transform='';});
$('world').addEventListener('webglcontextlost',e=>{e.preventDefault();state='error';$('error').hidden=false;$('error-text').textContent='The browser paused its 3D graphics. Reload to reopen the chapter; your keepsake is saved.';});
init();
