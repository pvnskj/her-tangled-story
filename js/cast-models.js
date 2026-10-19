import * as THREE from 'three';
import { getCharacter } from './cast.js?v=20261018story';
const material = color => new THREE.MeshStandardMaterial({color,roughness:.9});
const facialWhite=new THREE.MeshBasicMaterial({color:0xfff8ed});
const facialDark=new THREE.MeshBasicMaterial({color:0x392b32});
const eyeGeometry=new THREE.SphereGeometry(.056,8,6);
const pupilGeometry=new THREE.SphereGeometry(.027,8,6);
const smileGeometry=new THREE.TorusGeometry(.075,.012,4,12,Math.PI);

function mesh(parent,geo,color,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material(color));m.position.set(x,y,z);parent.add(m);return m;}
const box=(g,c,x,y,z,w,h,d)=>mesh(g,new THREE.BoxGeometry(w,h,d),c,x,y,z);
const ball=(g,c,x,y,z,r)=>mesh(g,new THREE.SphereGeometry(r,10,8),c,x,y,z);
function cylinder(g,c,x,y,z,r,h){return mesh(g,new THREE.CylinderGeometry(r,r,h,8),c,x,y,z);}

export function dressCharacter(n,c){
  if(!c)return;
  const g=n.group,body=g.children[0],head=g.children[1],hair=g.children[2];
  n.castId=c.id;n.name=c.name;n.description=c.description;n.flavor=c.line;g.name=c.name;
  body.material=material(c.color);hair.material=material(c.hair);
  const seated=body.position.y<.7,shoulder=seated?.95:1.5,headY=head.position.y;
  // Expressive storybook faces: visible eyes, gentle smile, and real blink animation.
  // Keep all facial pieces parented to the original head; no replacement model.
  const faceEyes=[-.125,.125].map(x=>{
    const eye=new THREE.Group();eye.position.set(x,.06,.295);head.add(eye);
    const white=new THREE.Mesh(eyeGeometry,facialWhite);eye.add(white);
    const pupil=new THREE.Mesh(pupilGeometry,facialDark);pupil.position.z=.05;eye.add(pupil);
    return eye;
  });
  const smile=new THREE.Mesh(smileGeometry,facialDark);
  smile.position.set(0,-.115,.324);smile.rotation.z=Math.PI;head.add(smile);

  const arms=[-1,1].map(side=>{const a=new THREE.Group();a.position.set(side*.43,shoulder,0);g.add(a);cylinder(a,c.color,0,-.25,0,.12,.48);ball(a,0xe8b88a,0,-.54,0,.13);return a;});
  if(c.detail==='small'||c.detail==='pigtails'){const f=c.id==='braids'?1:.8;g.scale.multiplyScalar(f);n.headY*=f;}
  if(['ruffian','hook','patch','sideburns'].includes(c.detail))g.scale.x*=1.14;
  if(c.detail==='braid'){
    for(let i=0;i<13;i++)ball(g,c.hair,Math.sin(i*.9)*.08,headY+.08-i*.14,-.32-i*.025,.16-i*.006);
    const skirt=mesh(g,new THREE.CylinderGeometry(.38,.72,.95,12),c.color,0,.58,0);skirt.scale.z=.85;
  }
  if(c.detail==='pigtails')for(const side of [-1,1])for(let i=0;i<4;i++)ball(g,c.hair,side*(.3+i*.025),headY-.08-i*.14,-.1,.13);
  if(c.detail==='curls')for(let i=0;i<9;i++){const a=i/8*Math.PI;ball(g,c.hair,Math.cos(a)*.36,headY-.2+Math.sin(i)*.08,-.22,.2);}
  if(c.detail==='sideburns')for(const side of [-1,1])box(g,c.hair,side*.28,headY-.15,.1,.13,.36,.16);
  if(c.detail==='patch'){
    box(g,0x2f2824,-.15,headY,.3,.22,.2,.03);const band=mesh(g,new THREE.TorusGeometry(.345,.025,5,20),0x2f2824,0,headY,0);band.rotation.x=Math.PI/2;
  }
  if(['crown','darkCrown','tiara'].includes(c.detail)){
    const color=c.detail==='darkCrown'?0x798194:0xe6bd62;
    const circ=mesh(g,new THREE.TorusGeometry(.32,.045,5,16),color,0,headY+.23,0);circ.rotation.x=Math.PI/2;
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;mesh(g,new THREE.ConeGeometry(.06,.22,4),color,Math.cos(a)*.3,headY+.35,Math.sin(a)*.3);}
  }
  if(c.detail==='helmet'||c.detail==='fullHelmet'){
    const helmet=mesh(g,new THREE.SphereGeometry(.39,12,8,0,Math.PI*2,0,c.detail==='fullHelmet'?2.2:1.6),0x8b94a2,0,headY+.05,0);
    box(g,0x687383,0,shoulder-.2,.37,.66,.7,.14);
    if(c.detail==='fullHelmet')box(g,0x48505d,0,headY,.34,.36,.04,.035);
    else mesh(g,new THREE.ConeGeometry(.13,.4,5),0x334b7a,0,headY+.48,0);
  }
  if(c.detail==='cape'||c.detail==='darkCrown')box(g,c.id==='adira'?0x61343f:0x28384d,0,shoulder-.35,-.4,.8,1.25,.08);
  if(c.detail==='vest')box(g,0xdecfab,0,shoulder-.25,.41,.19,.65,.06);
  if(c.detail==='goggles'){
    for(const x of [-.17,.17]){const rim=mesh(g,new THREE.TorusGeometry(.13,.035,6,12),0xa68c62,x,headY+.25,.3);ball(g,0x6ac3c5,x,headY+.25,.3,.095);}
    box(g,0x409cb4,-.15,headY+.33,.15,.12,.2,.14);
  }
  if(c.detail==='horns')for(const side of [-1,1]){const h=mesh(g,new THREE.ConeGeometry(.13,.55,6),0x392740,side*.31,headY+.38,0);h.rotation.z=-side*.4;}
  if(c.detail==='hook'){arms[0].children[1].visible=false;const h=mesh(arms[0],new THREE.TorusGeometry(.16,.045,6,14,Math.PI*1.6),0xabb3bc,0,-.55,0);h.rotation.z=.3;}
  const prop=new THREE.Group();prop.position.set(0,seated?.8:1.08,.68);g.add(prop);
  const moving=[];
  switch(c.activity){
    case 'paint':
      {const palette=ball(prop,0xbc9567,-.1,.03,0,.28);palette.scale.set(1,.2,.8);for(let i=0;i<4;i++)ball(prop,[0xe0ab49,0xa065af,0x7bba8b,0xeb7e7e][i],Math.cos(i*1.5)*.15,.1,Math.sin(i*1.5)*.15,.04);const brush=cylinder(arms[1],0xa67c49,0,-.55,.12,.035,.5);brush.rotation.x=.7;break;}
    case 'map':case 'scroll':case 'design':
      box(prop,0xe1d2ab,0,0,0,.72,.055,.5);box(prop,c.activity==='design'?0xba86ae:0x867453,0,.032,0,.43,.01,.025);
      for(const x of [-.36,.36]){const roll=cylinder(prop,0xc8b17a,x,0,0,.055,.53);roll.rotation.x=Math.PI/2;}break;
    case 'mirror':
      {const mirror=ball(prop,0xb4c5c9,.3,.4,0,.24);mirror.scale.set(1,1.4,.18);const rim=mesh(prop,new THREE.TorusGeometry(.25,.035,6,16),0xc59f54,.3,.4,0);rim.scale.y=1.4;cylinder(prop,0xc59f54,.3,.02,0,.035,.35);break;}
    case 'lantern':
      cylinder(prop,0xf8d68d,0,.2,0,.25,.5);{const ring=mesh(prop,new THREE.TorusGeometry(.16,.025,5,12),0xa78249,0,.57,0);moving.push(ring);}break;
    case 'guard':
      {const shield=box(prop,0x677d98,-.42,.25,0,.46,.65,.12);box(prop,0xe1bd65,-.42,.25,.07,.13,.26,.02);const spear=cylinder(prop,0x7d6240,.55,.55,0,.035,2.3);mesh(prop,new THREE.ConeGeometry(.13,.35,5),0xaeb7c0,.55,1.85,0);break;}
    case 'sharpen':
      {const blade=box(prop,c.id==='adira'?0x272732:0xb2bbc1,0,.12,0,.95,.09,.13);blade.rotation.z=.15;box(prop,0x8d7245,-.52,.04,0,.2,.18,.17);break;}
    case 'rope':
      for(let i=0;i<3;i++){const rope=mesh(prop,new THREE.TorusGeometry(.21,.038,5,16),0xbf9f6a,0,i*.06,0);rope.rotation.x=Math.PI/2;}break;
    case 'piano':
      box(prop,0x44322e,0,-.08,.1,1.3,.25,.65);for(let i=0;i<10;i++){box(prop,0xf1e3c8,-.55+i*.12,.08,.08,.1,.07,.35);if(i%3!==0)box(prop,0x2c242a,-.5+i*.12,.13,-.02,.045,.05,.18);}break;
    case 'flowers':
      mesh(prop,new THREE.ConeGeometry(.28,.5,8),0xc6a16f,0,0,0);for(let i=0;i<6;i++){const a=i*Math.PI/3;cylinder(prop,0x6b9b59,Math.cos(a)*.18,.25,Math.sin(a)*.18,.02,.42);ball(prop,[0xe3a2bf,0xd4b5eb,0xf1d58d][i%3],Math.cos(a)*.2,.5,Math.sin(a)*.2,.14);}break;
    case 'unicorn':
      {ball(prop,0xe6dded,0,.15,0,.23);cylinder(prop,0xe6dded,.16,.34,0,.09,.3);ball(prop,0xe6dded,.2,.49,0,.13);mesh(prop,new THREE.ConeGeometry(.04,.19,5),0xdbb967,.2,.65,0);break;}
    case 'bake':case 'bread':
      cylinder(prop,0x94734e,0,0,0,.38,.05);for(const x of [-.18,.18]){if(c.activity==='bake'){cylinder(prop,0xb7794d,x,.12,0,.13,.2);ball(prop,0xe1a3c4,x,.26,0,.16);}else{const loaf=ball(prop,0xd9ae6d,x,.16,0,.22);loaf.scale.set(.65,.7,1.2);}}break;
    case 'mug':
      cylinder(prop,0xa7885e,0,.1,0,.18,.32);mesh(prop,new THREE.TorusGeometry(.12,.035,6,12),0xa7885e,.2,.15,0);break;
    case 'mime':prop.visible=false;break;
    case 'sew':
      box(prop,0xbf8cad,0,0,0,.6,.05,.4);cylinder(prop,0x959caa,.15,.15,0,.012,.35);break;
    case 'puppet':
      {const puppet=new THREE.Group();prop.add(puppet);ball(puppet,0xe7ba91,0,.38,0,.12);mesh(puppet,new THREE.ConeGeometry(.15,.3,6),0xa37cb2,0,.16,0);moving.push(puppet);break;}
    case 'barrel':
      cylinder(prop,0x9a754c,0,.03,0,.3,.55);for(const y of [-.14,.2]){const hoop=mesh(prop,new THREE.TorusGeometry(.3,.025,5,16),0x5c5350,0,y,0);hoop.rotation.x=Math.PI/2;}break;
    case 'alchemy':
      {const flask=ball(prop,0x75c7c3,-.12,.16,0,.22);cylinder(prop,0x81bdb6,-.12,.4,0,.07,.24);ball(prop,0xe5ca7a,.25,.12,0,.13);moving.push(flask);break;}
    case 'magic':
      {const orb=ball(prop,0xb08ace,0,.4,0,.2);orb.material.emissive.setHex(0x46285e);orb.material.emissiveIntensity=.3;moving.push(orb);break;}
  }
  if(c.activity==='paint'){
    for(const x of [-.45,.45])cylinder(g,0x8c6947,x,.85,1.5,.045,1.7);
    box(g,0xe9d9b4,0,1.55,1.5,1.2,.9,.08);
    ball(g,0xe1b84e,.24,1.72,1.44,.16);box(g,0x8baa76,-.18,1.35,1.44,.7,.15,.03);
  }
  if(c.activity==='alchemy')for(let i=0;i<3;i++){const bubble=ball(prop,0xa6e6ce,-.12,.6+i*.12,0,.035);bubble.userData.bubble=i;moving.push(bubble);}
  n.castRig={arms,prop,moving,baseY:prop.position.y,activity:c.activity,head,headBaseY:head.position.y,hello:0,faceEyes};
}

export function animateCharacter(n,t,playerPos){
  const r=n.castRig;if(!r)return;
  const phase=t*(r.activity==='piano'?5:2)+(n.phase||0);
  // Short blinks approximately every four seconds, slightly offset per character.
  const blinkPhase=(t+(n.phase||0)*1.7)%4.35;
  const blink=Math.max(0,1-Math.abs(blinkPhase-2.25)*12);
  r.faceEyes?.forEach(eye=>{eye.scale.y=Math.max(.08,1-blink*.92);});

  r.prop.position.y=r.baseY+Math.sin(phase)*.025;
  r.arms.forEach((arm,i)=>{
    arm.rotation.x=-.85+Math.sin(phase+i*1.5)*(r.activity==='piano'?.22:.12);
    arm.rotation.z=(i?-.1:.1);
    if(r.activity==='mime'){arm.rotation.x=-1.4+Math.sin(phase)*.3;arm.rotation.z=Math.sin(phase+i)*.45;}
    if(r.activity==='guard')arm.rotation.x=-.3+Math.sin(phase+i*Math.PI)*.15;
    if(r.activity==='paint'&&i===1)arm.rotation.x=-1.3+Math.sin(phase)*.3;
    if(r.activity==='sharpen'&&i===1)arm.rotation.z=Math.sin(phase)*.28;
  });
  const wave=Math.sin(phase),reach=(wave+1)/2;
  switch(r.activity){
    case 'mirror':r.prop.rotation.y=wave*.25;r.arms[1].rotation.x=-1.4+wave*.15;break;
    case 'map':case 'scroll':r.arms[1].rotation.x=-1.15+wave*.16;break;
    case 'design':r.arms[1].rotation.z=wave*.25;break;
    case 'rope':r.prop.rotation.y=wave*.3;r.arms[0].rotation.x=-1+wave*.3;break;
    case 'flowers':r.arms[1].rotation.x=-1.1+wave*.35;r.prop.rotation.y=wave*.13;break;
    case 'unicorn':r.prop.rotation.y=t*.25;r.arms[1].rotation.z=wave*.25;break;
    case 'bake':r.arms[1].rotation.x=-1.2+wave*.25;r.arms[1].rotation.z=wave*.18;break;
    case 'bread':case 'mug':r.prop.position.y=r.baseY+reach*.35;r.arms[0].rotation.x=-.9-reach*.65;break;
    case 'sew':r.arms[1].rotation.x=-1.15+Math.sin(t*6)*.17;break;
    case 'puppet':r.arms[0].rotation.x=-1+wave*.4;break;
    case 'barrel':r.prop.position.y=r.baseY+reach*.16;r.prop.rotation.y=wave*.2;break;
    case 'alchemy':r.arms[0].rotation.x=-1.15+wave*.3;break;
  }
  // A little eye contact, head tilt, and an occasional friendly wave when she approaches.
  // Additive gestures preserve each character's existing named activity and prop.
  if(playerPos&&n.group.visible){
    const dx=playerPos.x-n.group.position.x,dz=playerPos.z-n.group.position.z;
    const near=Math.hypot(dx,dz)<8;
    const greeting=near&&Math.sin(t*.85+(n.phase||0))>.1;
    r.hello+=(Number(greeting)-r.hello)*.09;
    r.head.rotation.z=Math.sin(t*1.2+(n.phase||0))*.035+r.hello*.12;
    r.head.rotation.y=near?Math.sin(t*.65+(n.phase||0))*.12:Math.sin(t*.35+(n.phase||0))*.045;
    r.head.position.y=r.headBaseY+Math.sin(t*2+(n.phase||0))*.015;
    // Wave with one hand only; characters keep holding their task props.
    if(!['piano','guard','sharpen','paint','mime'].includes(r.activity)){
      r.arms[0].rotation.x-=r.hello*.7;
      r.arms[0].rotation.z+=r.hello*(.25+Math.sin(t*7)*.12);
    }
    // Ulf's mime performance becomes a short playful silent bow.
    if(r.activity==='mime'){
      r.head.rotation.z=Math.sin(t*1.5)*(.08+r.hello*.16);
      r.arms[0].rotation.z+=r.hello*.35;
    }
  }
  // NPCs who just handed over a memory briefly raise both arms in celebration.
  if((r.celebrateUntil||0)>t){
    r.arms[0].rotation.x=-2.05;r.arms[1].rotation.x=-2.05;
    r.arms[0].rotation.z=.24;r.arms[1].rotation.z=-.24;
    r.head.rotation.z=Math.sin(t*7)*.11;
  }
  for(const object of r.moving){
    object.rotation.z=wave*(r.activity==='alchemy'?.3:.12);
    if(r.activity==='magic'){object.position.y=.4+wave*.12;object.scale.setScalar(1+wave*.12);}
    if(r.activity==='puppet')object.position.y=Math.abs(wave)*.18;
    if(object.userData.bubble!==undefined){const cycle=(t*.6+object.userData.bubble/3)%1;object.position.y=.5+cycle*.55;object.scale.setScalar(1-cycle*.8);}
  }
}

function horse(color){
  const g=new THREE.Group();box(g,color,0,1.3,0,.85,.85,1.8);
  for(const x of [-.3,.3])for(const z of [-.6,.6]){cylinder(g,color,x,.6,z,.1,1.15);cylinder(g,0x3f3636,x,.08,z,.11,.15);}
  const neck=new THREE.Group();neck.position.set(0,1.55,.72);g.add(neck);box(neck,color,0,.4,0,.4,.9,.4);box(neck,color,0,.85,.3,.38,.4,.7);
  for(const x of [-.13,.13])mesh(neck,new THREE.ConeGeometry(.075,.28,5),color,x,1.15,.15);
  box(neck,0x57433c,0,.4,-.23,.12,.85,.15);box(g,0x635472,0,1.78,-.1,.9,.08,.65);
  const tail=cylinder(g,0x57433c,0,1.35,-1,.07,.8);tail.rotation.x=.4;
  return {group:g,neck,tail};
}
export function installAnimalCast(scene,npcs,chameleon){
  chameleon.name='Pascal';chameleon.castId='pascal';chameleon.description=getCharacter('pascal').description;chameleon.group.name='Pascal';
  const add=(id,group,headY,rig={})=>{const c=getCharacter(id);group.name=c.name;const n={...c,castId:id,group,headY,kind:'wanderer',flavor:c.line,castAnimal:true,animalRig:rig};npcs.push(n);return n;};
  // Reuse the existing village horse and its original grazing/swishing animation.
  const maximus=scene.children.find(o=>o.userData.castHorse||(o.isGroup&&o.position.x===-20&&o.position.z===70));
  if(maximus){maximus.traverse(o=>{if(o.isMesh&&o.material?.color){const hex=o.material.color.getHex();if(hex===0x8a5a30||hex===0x6a4224){o.material=o.material.clone();o.material.color.setHex(hex===0x8a5a30?0xe9e3cc:0xcfbd8e);}}});add('maximus',maximus,4);}
  const fidella=horse(0xa98d79);fidella.group.position.set(-27,0,76);fidella.group.rotation.y=.7;scene.add(fidella.group);add('fidella',fidella.group,3,fidella);
  const raccoon=new THREE.Group();const body=ball(raccoon,0x8a8580,0,.45,0,.36);body.scale.set(1,1,1.4);ball(raccoon,0xb1a99e,0,.8,.27,.25);
  for(const x of [-.17,.17])ball(raccoon,0x625d5b,x,1,.26,.1);
  // A fur mask, without eyes or a human-like face.
  box(raccoon,0x4a4746,0,.82,.48,.35,.1,.04);
  for(let i=0;i<5;i++)ball(raccoon,i%2?0x534f4c:0xaaa198,0,.35-i*.02,-.35-i*.14,.14-i*.01);
  const paws=[-.19,.19].map(x=>ball(raccoon,0x645e59,x,.45,.4,.09));const flask=ball(raccoon,0x83bcbd,0,.48,.56,.12);raccoon.position.set(16,0,-67);scene.add(raccoon);add('ruddiger',raccoon,1.2,{paws,flask});
  const owl=new THREE.Group();cylinder(owl,0x74563c,0,.7,0,.08,1.4);const bird=new THREE.Group();bird.position.y=1.5;owl.add(bird);const belly=ball(bird,0x8b7562,0,.3,0,.3);belly.scale.y=1.3;const head=ball(bird,0xb3a08a,0,.65,0,.25);const wings=[-.24,.24].map(x=>{const wing=ball(bird,0x6a584b,x,.3,0,.17);wing.scale.set(.45,1.5,1);return wing;});owl.position.set(22,0,89);scene.add(owl);add('owl',owl,2.6,{head,wings});
}
export function animateAnimal(n,t,playerPos){
  const r=n.animalRig;if(!r)return;
  if(r.neck){r.neck.rotation.x=.15+Math.sin(t*.65)*.2;r.tail.rotation.z=Math.sin(t*1.5)*.25;}
  if(r.paws){r.paws.forEach((p,i)=>p.position.y=.45+Math.sin(t*3+i)*.04);r.flask.rotation.z=Math.sin(t*2)*.15;}
  if(r.head)r.head.rotation.y=Math.sin(t*.7)*.5;
  if(r.wings)r.wings.forEach((w,i)=>w.rotation.z=Math.sin(t*1.4)*.1*(i?1:-1));
}
