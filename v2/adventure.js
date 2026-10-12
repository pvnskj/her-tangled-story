import * as T from 'three';
import {buildValley} from './valley.js';
import {groundHeight} from './world.js';
import {REGIONS,MEMORIES,CORE,DOCK,canCelebrate,coreRemaining,nextMemory,nearestRegion,nearestMemory,restoreProgress,boatSample,DIALOGUES} from './story.js';
const $=id=>document.getElementById(id),V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const ease=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
export class Adventure {
  constructor({scene,world,hero,braid,camera,quality,store,go,clearInput,message,chime}){
    Object.assign(this,{scene,world,hero,braid,camera,store,go,clearInput,message,chime});
    Object.assign(this,restoreProgress(store.get('progress','{}'),store.get('memory-1','0')==='1'));
    this.valley=buildValley(scene,world,hero,quality);this.mode='explore';this.elapsed=0;this.travelSpeed=1;this.active=null;this.following=false;this.region='tower';this.finalMessage='Happy birthday, my love. Every step of this valley holds a piece of your story — and every piece led me to you.';
    this.valley.syncProgress(this.found);this.refresh();this.bind();
  }
  get locked(){return this.mode!=='explore';}
  save(){this.store.set('progress',JSON.stringify({found:[...this.found],visited:[...this.visited]}));}
  refresh(){
    $('count').textContent=this.found.size;$('core-count').textContent=`${CORE.filter(id=>this.found.has(id)).length} / 5 story moments`;
    const next=nextMemory(this.found);$('objective-eyebrow').textContent=canCelebrate(this.found)?this.found.has(33)?'MORE LITTLE WONDERS':'THE LANTERNS ARE READY':'YOUR NEXT STORY MOMENT';
    $('objective-text').textContent=next?next.label+'.':'Every page of the valley is yours.';$('guide').hidden=!next;
    $('map-destinations').replaceChildren();
    for(const r of REGIONS){const card=document.createElement('div');card.className='destination';card.style.setProperty('--zone-color',r.color);const title=document.createElement('strong');title.textContent=`${r.icon} ${r.name}`;const small=document.createElement('span');small.textContent=`${MEMORIES.filter(m=>m.zone===r.id&&this.found.has(m.id)).length} / ${MEMORIES.filter(m=>m.zone===r.id).length} memories`;const p=document.createElement('p');p.textContent=r.description;const walk=document.createElement('button');walk.textContent='Walk here ↗';walk.onclick=()=>{if(!this.canNavigate())return;$('map').close();this.go({x:r.x,z:r.z});};card.append(title,small,p,walk);if(this.visited.has(r.id)){const quick=document.createElement('button');quick.className='quick-travel';quick.textContent='Follow the lantern path';quick.onclick=()=>{if(!this.canNavigate())return;$('map').close();this.go({x:r.x,z:r.z},true);};card.append(quick);}$('map-destinations').append(card);}
    $('journal-grid').replaceChildren();for(const m of MEMORIES){const b=document.createElement('button');b.className=this.found.has(m.id)?'journal-found':'';b.textContent=String(m.id).padStart(2,'0');b.disabled=!this.found.has(m.id);b.setAttribute('aria-label',`Memory ${m.id}: ${this.found.has(m.id)?m.label:'undiscovered'}`);b.onclick=()=>{$('journal').close();this.showMemory(m,false);};$('journal-grid').append(b);}
    $('journal-count').textContent=`${this.found.size} of 33 memories discovered`;
    $('finale-lock').textContent=canCelebrate(this.found)?'Your birthday lantern is ready.':'Discover the keepsake, rabbit glade, tavern dream, painter’s photo, and boat ride to unlock the celebration.';
  }
  canNavigate(){if(this.locked){this.message('Finish this little moment first.');return false;}return true;}
  bind(){
    $('guide').onclick=()=>{const next=nextMemory(this.found);if(next)this.go({x:next.x,z:next.z});};
    $('journal-button').onclick=()=>{this.clearInput();this.refresh();$('journal').showModal();};
    $('sequence-skip').onclick=()=>{if(this.mode==='boat')this.travelSpeed=4;else if(this.mode==='finale')this.finishFinale();};
    $('wish-save').onclick=()=>{const text=$('wish-input').value.trim().slice(0,180);this.store.set('wish',text);$('wish').close();this.showMemory(MEMORIES[31]);this.message(text?'Your wish is tied to a little lantern.':'A quiet wish is a wish all the same.');};
    $('finale-close').onclick=()=>{$('finale').close();this.clearInput();};
    $('memory-photo').onerror=()=>{$('photo-wrap').hidden=true;$('memory-placeholder').hidden=false;$('memory-placeholder').textContent='This photograph could not load. Your memory is still saved.';};
  }
  collect(m){if(!this.found.has(m.id)){this.found.add(m.id);this.valley.syncProgress(this.found);this.save();this.refresh();}this.valley.activate(m.id);}
  showMemory(m,collect=true){if(collect)this.collect(m);this.clearInput();this.go(null);$('memory-title').textContent=m.id===1?'Where it all began.':`${REGIONS.find(r=>r.id===m.zone).short} · Memory ${m.id}`;$('memory-caption').textContent=m.caption;$('photo-wrap').hidden=!m.photo;$('memory-placeholder').hidden=!!m.photo;$('memory-placeholder').textContent='A page waiting for your photograph.';if(m.photo){$('memory-photo').alt=`Memory ${m.id}: ${m.caption}`;$('memory-photo').src=new URL('../'+m.photo,import.meta.url).href;}$('memory').showModal();this.chime();}
  interact(){if(this.locked)return;const m=nearestMemory(this.hero.group.position);if(!m)return;
    this.go(null);this.clearInput();
    if(m.action==='finale'){if(!canCelebrate(this.found)){const next=nextMemory(this.found);this.message(`${coreRemaining(this.found).length} story moments remain. Next: ${next.label.toLowerCase()}.`);return;}this.startFinale();return;}
    if(m.action==='boat'){this.startBoat();return;}
    if(m.action==='rabbit'&&!this.found.has(7)){if(!this.following){this.valley.followRabbit();this.following=true;this.go({x:22,z:20.1});this.message('Stay close. Your little guide knows a secret.');}return;}
    if(m.action==='wish'){$('wish-input').value=this.store.get('wish','');$('wish').showModal();return;}
    if(DIALOGUES[m.id]){this.dialogue(m);return;}
    if(m.action==='music'){this.valley.activate(m.id);this.startMoment(m,5.5,'A song for the dreams we keep.');return;}
    this.startMoment(m,1.1,{
      horse:'An apple, a nuzzle, a new friend.',hollow:'A little light lives inside the old tree.',mushroom:'A tiny woodland melody.',fern:'A memory tucked between the leaves.',deer:'Sometimes the quietest company is the best.',pollen:'A little sunlight, caught just for a moment.',fountain:'A wish disappears into the ripples.',duck:'The smallest visitors are always hungry.',lantern:'Let a little wish find its way.',companion:'Your tiny guide has found something.',ribbon:'One ribbon for a year of possibilities.',arch:'Every celebration needs someone to welcome home.'
    }[m.action]||'Another little piece of your story.');
  }
  dialogue(m){const d=DIALOGUES[m.id];$('dialogue-speaker').textContent=d.speaker;$('dialogue-line').textContent=d.line;$('dialogue-choices').replaceChildren();d.choices.forEach(choice=>{const b=document.createElement('button');b.textContent=choice;b.onclick=()=>{$('conversation').close();this.message(d.reply);this.valley.activate(m.id);this.showMemory(m);};$('dialogue-choices').append(b);});$('conversation').showModal();}
  startMoment(m,duration,text){this.active=m;this.mode='moment';this.elapsed=0;this.duration=duration;this.valley.activate(m.id);this.message(text);this.chime();}
  startBoat(){this.mode='boarding';this.elapsed=0;this.travelSpeed=1;this.startPosition=this.hero.group.position.clone();this.startRotation=this.hero.group.quaternion.clone();this.valley.startBoat();this.clearInput();$('sequence-controls').hidden=false;$('sequence-title').textContent='A little closer to the sky';$('sequence-skip').textContent='Return to shore';$('sequence-skip').disabled=true;$('interact').hidden=true;this.message('The whole world can wait a little while.');}
  startFinale(){this.mode='finale';this.elapsed=0;this.cameraStart=this.camera.position.clone();this.cameraRotation=this.camera.quaternion.clone();this.valley.startFinale();this.clearInput();$('sequence-controls').hidden=false;$('sequence-title').textContent='For all the wishes still to come';$('sequence-skip').textContent='Keep this moment';$('sequence-skip').disabled=false;$('interact').hidden=true;this.chime();}
  finishFinale(){this.collect(MEMORIES[32]);this.valley.stopFinale();this.mode='explore';$('sequence-controls').hidden=true;$('finale-message').textContent=this.finalMessage;const wish=this.store.get('wish','');$('saved-wish').textContent=wish?`Your wish: ${wish}`:'';$('finale').showModal();this.clearInput();}
  cancel(){this.mode='explore';this.following=false;this.valley.stopBoat();this.valley.stopFinale();$('sequence-controls').hidden=true;this.clearInput();}
  step(dt,t){
    this.elapsed+=dt;
    if(this.mode==='moment'){this.hero.update(dt,{pose:this.active.action==='bench'?'sit':this.active.action==='music'?'dance':'wave',time:t});this.braid.update(this.hero,t,false);if(this.elapsed>=this.duration){const m=this.active;this.mode='explore';this.showMemory(m);}return;}
    if(this.mode==='boarding'){
      const u=ease(this.elapsed/1.5),seat=V(-10.8,-.24,15.56);this.hero.group.position.copy(this.startPosition).lerp(seat,u);this.hero.group.quaternion.copy(this.startRotation).slerp(new T.Quaternion(),u);this.hero.update(dt,{pose:u>.7?'sit':'gather',time:t});
      if(u>=1){this.mode='boat';this.elapsed=0;$('sequence-skip').disabled=false;}
    }else if(this.mode==='boat'){
      this.elapsed+=dt*(this.travelSpeed-1);const b=boatSample(this.elapsed),boatPos=V(b.x,b.y,b.z),off=V(0,-.32,.56).applyAxisAngle(V(0,1,0),b.yaw);this.hero.group.position.copy(boatPos).add(off);this.hero.group.rotation.set(0,b.yaw,0);this.hero.update(dt,{pose:'sit',time:t});
      if(b.done){this.mode='disembarking';this.elapsed=0;this.startPosition=this.hero.group.position.clone();this.valley.stopBoat();$('sequence-skip').disabled=true;}
    }else if(this.mode==='disembarking'){
      const u=ease(this.elapsed/1.5);this.hero.group.position.copy(this.startPosition).lerp(V(DOCK.x,groundHeight(DOCK.x,DOCK.z),DOCK.z),u);this.hero.update(dt,{pose:u<.2?'sit':'idle',time:t});if(u>=1){this.mode='explore';$('sequence-controls').hidden=true;this.showMemory(MEMORIES[25]);}
    }else if(this.mode==='finale'){
      this.hero.update(dt,{pose:this.elapsed<3?'wave':'idle',time:t});const u=ease(this.elapsed/22),pos=V(-16+Math.sin(u*1.5)*17,3+u*26,-4+u*18),target=V(-16,1.6+u*6,-9);this.camera.position.copy(this.cameraStart).lerp(pos,ease(this.elapsed/3));this.camera.lookAt(target);if(this.elapsed>=24)this.finishFinale();
    }
    if(['boarding','boat','disembarking'].includes(this.mode)){const p=this.hero.group.position,offset=V(4.1,2.4,4.6);this.camera.position.lerp(p.clone().add(offset),1-Math.exp(-dt*1.8));this.camera.lookAt(p.clone().add(V(0,1,0)));}
    this.braid.update(this.hero,t,false);
  }
  update(dt,t,cinematic=false){
    const p=this.hero.group.position;this.valley.update(dt,t,p,{cinematic,boatProgress:this.mode==='boat'?this.elapsed:0,finaleProgress:this.mode==='finale'?this.elapsed:0});
    if(cinematic)return;
    const region=nearestRegion(p);$('chapter-label').textContent=region.name.toUpperCase();
    if(Math.hypot(p.x-region.x,p.z-region.z)<6&&!this.visited.has(region.id)){this.visited.add(region.id);this.save();this.refresh();this.message(region.name+' — '+region.description);}
    const m=nearestMemory(p);$('interact').hidden=this.locked||!m;$('interact').textContent=m?m.action==='finale'&&!canCelebrate(this.found)?'The lanterns await five story moments':m.label+' · E':'';
    if(this.following){const r=this.valley.rabbitStatus();if(r.done&&p.distanceTo(r.position)<2.5){this.following=false;this.showMemory(MEMORIES[6]);}}
  }
}
