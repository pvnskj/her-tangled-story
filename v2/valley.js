import * as T from 'three';
import {mesh,box,ell,line,painting,flower,batchStatics,groundHeight} from './world.js';
import {cloneVillager} from './hero.js';
import {REGIONS,MEMORIES,boatSample} from './story.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.8,...extra});
function group(parent,x=0,z=0,y=groundHeight(x,z)){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
function sign(parent,text,x,y,z,width=2.3){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#5b4735';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#d9c298';ctx.lineWidth=5;ctx.strokeRect(10,10,492,108);ctx.fillStyle='#fff1ce';ctx.font='32px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return mesh(parent,new T.PlaneGeometry(width,width/4),new T.MeshStandardMaterial({map:tex,side:T.DoubleSide}),x,y,z);}
function lantern(parent,x,y,z,scale=.4){const g=group(parent,x,z,y);g.scale.setScalar(scale);mesh(g,new T.CylinderGeometry(.4,.32,.85,8,1,true),material(0xffce83,{emissive:0xffa443,emissiveIntensity:.4,side:T.DoubleSide}),0,0,0);for(const h of [-.44,.44])mesh(g,new T.TorusGeometry(.36,.025,4,12),0x896348,0,h,0).rotation.x=Math.PI/2;ell(g,[.06,.12,.06],material(0xffe5a5,{emissive:0xffc165,emissiveIntensity:2}),0,-.23,0);return g;}
function tree(parent,x,z,size=1,willow=false){const g=group(parent,x,z);g.scale.setScalar(size);line(g,[[0,0,0],[-.12,1.8,0],[.17,3.8,.1],[0,5.2,0]],.24,0x736148);for(let k=0;k<7;k++){const a=k*2.4,ex=Math.sin(a)*1.5,ez=Math.cos(a)*1.5;line(g,[[0,2.4,0],[ex*.5,3.6,ez*.5],[ex,4.4,ez]],.08,0x736148);ell(g,[1.55,.9,1.35],k%2?0x678c68:0x8fa775,ex,4.55+(k%3)*.27,ez);if(willow)for(let j=0;j<4;j++)line(g,[[ex,4.2,ez],[ex*1.3,2.9,ez*1.3],[ex*1.4+(j-.5)*.2,1.15,ez*1.4]],.055,0x70956a);}return g;}
function bench(parent,x,z,angle=0){const g=group(parent,x,z);g.rotation.y=angle;box(g,1.5,.1,.45,0x92704d,0,.42,0);box(g,1.5,.35,.07,0x92704d,0,.78,-.22);for(const s of [-1,1])box(g,.08,.4,.38,0x654c35,s*.57,.2,0);return g;}
function barrel(parent,x,z,scale=1){const g=group(parent,x,z);g.scale.setScalar(scale);mesh(g,new T.CylinderGeometry(.31,.34,.8,14),0x94704c,0,.4,0);for(const y of [.13,.63])mesh(g,new T.TorusGeometry(.342,.02,5,16),0x59564b,0,y,0).rotation.x=Math.PI/2;return g;}
function rabbit(parent,x,z){const g=group(parent,x,z),body=ell(g,[.16,.18,.25],0xe9e4d8,0,.18,0);ell(g,[.13,.14,.14],0xf2ecdd,0,.32,.19);for(const s of [-1,1]){const ear=ell(g,[.035,.20,.05],0xe9e4d8,s*.06,.52,.2);ear.rotation.z=s*.16;ell(g,[.028,.035,.018],0x40382c,s*.09,.36,.29);ell(g,[.065,.045,.09],0xe5decd,s*.12,.045,.11);}ell(g,[.085,.08,.08],0xfff2dd,0,.18,-.24);return {g,body,home:V(x,0,z)};}
function deer(parent,x,z){const g=group(parent,x,z);ell(g,[.27,.34,.52],0xb79b6f,0,.8,0);const neck=group(g,0,.39,.9);ell(neck,[.12,.34,.15],0xb79b6f,0,.2,.08);ell(neck,[.14,.15,.25],0xc0a477,0,.5,.2);const legs=[];for(const sx of [-.18,.18])for(const sz of [-.32,.32]){const l=group(g,sx,sz,.74);line(l,[[0,0,0],[.01,-.33,.02],[0,-.7,0]],.036,0xa38a60);legs.push(l);}for(const s of [-1,1]){ell(neck,[.06,.16,.04],0xbda377,s*.17,.62,.11).rotation.z=s*.6;ell(neck,[.025,.029,.02],0x302b25,s*.126,.53,.33);}return {g,neck,legs};}
function sunEmblem(parent,x,y,z,r=.42){const g=group(parent,x,z,y);mesh(g,new T.CircleGeometry(r*.42,20),0xe8c47a);for(let i=0;i<12;i++){const a=i/12*Math.PI*2,p=box(g,.035,r*.45,.025,0xe8c47a,Math.sin(a)*r*.75,Math.cos(a)*r*.75,0);p.rotation.z=-a;}return g;}

export function buildValley(scene,world,hero,quality='balanced'){
  const staticRoot=new T.Group(),dynamicRoot=new T.Group();scene.add(staticRoot,dynamicRoot);
  const props=new Map(),actors=[],fireflies=[],flags=[],roofs=[],windows=[],lights=[];
  const floorAt=(x,z)=>groundHeight(x,z)+.02;
  function paving(x,z,r,color=0xbfb294){const p=mesh(staticRoot,new T.CircleGeometry(r,48),color,x,floorAt(x,z),z);p.rotation.x=-Math.PI/2;return p;}
  for(const r of REGIONS){const s=group(staticRoot,r.x-1,r.z+1.5);box(s,.06,1.45,.06,0x795f42,0,.72,0);sign(s,r.short,0,1.35,.02,1.25);}

  // ENCHANTED FOREST: arching branches, ferns and a sunlit hollow.
  for(const [x,z,s]of [[17,21,1.35],[24,12,1.3],[30,14,1.6],[29,25,1.5],[19,28,1.25],[32,22,1.5]]){tree(staticRoot,x,z,s);world.colliders.push({x,z,r:.3*s,height:5*s});}
  const hollow=group(staticRoot,22,22.9);mesh(hollow,new T.CylinderGeometry(.75,1.03,4.8,12),0x786349,0,2.4,0);mesh(hollow,new T.CircleGeometry(.47,22),material(0xffd081,{emissive:0xffbd60,emissiveIntensity:.55}),0,1.05,-.91).rotation.y=Math.PI;
  for(let k=0;k<5;k++){const a=k*1.26;line(hollow,[[0,3,0],[Math.sin(a),4.7,Math.cos(a)],[Math.sin(a)*2.6,5.4,Math.cos(a)*2]],.13,0x786349);ell(hollow,[1.5,.8,1.2],k%2?0x799360:0x91a873,Math.sin(a)*2,5.3,Math.cos(a)*2);}
  world.colliders.push({x:22,z:22.9,r:.95,height:5});
  for(let i=0;i<55;i++){const a=i*2.399,r=3.5+(i%9)*.35,x=23+Math.sin(a)*r,z=19+Math.cos(a)*r;const g=group(staticRoot,x,z);for(let k=0;k<5;k++){const b=k*1.26;const leaf=ell(g,[.035,.23,.1],i%2?0x5a8055:0x829961,Math.sin(b)*.15,.19,Math.cos(b)*.15);leaf.rotation.z=Math.cos(b)*.65;leaf.rotation.x=Math.sin(b)*.65;}if(i%4===0){mesh(g,new T.CylinderGeometry(.018,.022,.16,6),0xe9d9b4,.2,.08,0);ell(g,[.10,.055,.10],0xb78a81,.2,.18,0);}}
  const bunny=rabbit(dynamicRoot,19,17),friends=[rabbit(dynamicRoot,26,15),rabbit(dynamicRoot,20,24)],stag=deer(dynamicRoot,28,19);
  const pollenPositions=[];for(let i=0;i<100;i++)pollenPositions.push(19+(i*1.37)%9,.5+(i*.41)%4,15+(i*.73)%10);const pg=new T.BufferGeometry();pg.setAttribute('position',new T.Float32BufferAttribute(pollenPositions,3));const pollen= new T.Points(pg,new T.PointsMaterial({color:0xf8db94,size:.07,transparent:true,opacity:.7,depthWrite:false}));dynamicRoot.add(pollen);

  // TAVERN: crooked timber shell and playable open doorway, hearth and music.
  const tavern=group(staticRoot,25,-3);box(tavern,6.6,.08,6.2,0x9c7b53,0,.04,0);
  box(tavern,6.6,3.2,.18,0xc6b18c,0,1.6,-3);for(const s of [-1,1]){box(tavern,.18,3.2,6.1,0xc6b18c,s*3.2,1.6,0);box(tavern,1.9,2.9,.15,0xc6b18c,s*2.23,1.45,3);}
  for(let k=-3;k<=3;k++){world.colliders.push({x:25+k,z:-6,r:.38,height:3.3});if(Math.abs(k)>1)world.colliders.push({x:25+k,z:0,r:.35,height:3.3});}for(let k=-5;k<=0;k++)for(const x of [21.8,28.2])world.colliders.push({x,z:k,r:.34,height:3.3});
  for(const x of [-3.16,0,3.16])box(tavern,.18,3.6,.2,0x5d4734,x,1.8,-2.95);for(const x of [-3.15,3.15])for(const z of [-3,0,3])box(tavern,.18,3.5,.18,0x5d4734,x,1.75,z);
  for(const y of [.55,2.6,3.3])box(tavern,6.65,.16,.2,0x5d4734,0,y,-2.92);
  for(const s of [-1,1]){const roof=box(dynamicRoot,4.3,.18,6.95,material(0x696077,{transparent:true}),25+s*1.73,4.03,-3);roof.rotation.z=-s*.45;roofs.push(roof);}
  sign(tavern,'The Snuggly Duckling',0,3.15,3.2,3.2);sunEmblem(tavern,0,2.45,3.15,.34);
  box(tavern,1.5,1.7,.9,0x8c8272,1.9,.9,-2.5);box(tavern,.94,.7,.09,0x4e4034,1.9,.55,-2.01);const flame=ell(dynamicRoot,[.21,.35,.08],material(0xffbd63,{emissive:0xff9c3b,emissiveIntensity:2}),26.9,.49,-4.93);
  const hearthLight=new T.PointLight(0xffbf75,7,7,2);hearthLight.position.set(26.7,1,-4.3);dynamicRoot.add(hearthLight);lights.push(hearthLight);
  for(const [x,z]of [[24,-3.8],[26,-2]]){mesh(staticRoot,new T.CylinderGeometry(.6,.6,.07,20),0x8d6c48,x,.82,z);box(staticRoot,.14,.77,.14,0x5e4936,x,.4,z);for(const s of [-1,1])bench(staticRoot,x+s*1,z,s*Math.PI/2);world.colliders.push({x,z,r:.62,height:.9});}
  barrel(staticRoot,29,1.5);barrel(staticRoot,29,-.5,.8);bench(staticRoot,27,-1);for(const x of [22,28])lantern(staticRoot,x,2.8,.1,.45);
  box(tavern,.8,.8,.7,0x75563b,-2,.4,-2.6);for(let k=0;k<7;k++)box(tavern,.055,.55,.03,0xf1d7a5,-2.27+k*.09,.5,-2.23);

  // VILLAGE: cobbles, a working fountain, bakery and flower stalls, portrait wall.
  paving(4,22,7.4,0xc9c0a5);const cobbles=new T.InstancedMesh(new T.BoxGeometry(.24,.025,.18),material(0xb3ab97),500),dummy=new T.Object3D();
  for(let i=0;i<500;i++){const a=i*2.399,r=Math.sqrt(i/500)*7.1;dummy.position.set(4+Math.sin(a)*r,.05,22+Math.cos(a)*r);dummy.rotation.y=a;dummy.updateMatrix();cobbles.setMatrixAt(i,dummy.matrix);}staticRoot.add(cobbles);
  mesh(staticRoot,new T.CylinderGeometry(1.2,1.35,.3,28),0xa7a69a,5,.15,22);const fountainWater=mesh(dynamicRoot,new T.CircleGeometry(1.06,36),material(0x9dc6bd,{metalness:.25,roughness:.15}),5,.32,22);fountainWater.rotation.x=-Math.PI/2;mesh(staticRoot,new T.CylinderGeometry(.12,.2,1.35,12),0xb4b1a1,5,.86,22);mesh(staticRoot,new T.SphereGeometry(.26,12,8),0xb4b1a1,5,1.58,22);world.colliders.push({x:5,z:22,r:1.28,height:1.8});
  const jets=[];for(let i=0;i<7;i++){const a=i/7*6.28;const jet=line(dynamicRoot,[[5,1.6,22],[5+Math.sin(a)*.6,1.7,22+Math.cos(a)*.6],[5+Math.sin(a)*.9,.36,22+Math.cos(a)*.9]],.018,material(0xd3e7d9,{transparent:true,opacity:.6}));jets.push(jet);}
  function stall(x,z,color,label){const g=group(staticRoot,x,z);box(g,2,.08,1,0x947451,0,.9,0);for(const sx of [-.92,.92])box(g,.07,2.1,.07,0x78583c,sx,1.05,-.4);for(let i=0;i<8;i++)box(g,.27,.055,1.4,i%2?0xead6b2:color,-.94+i*.27,2,-.03).rotation.x=.14;sign(g,label,0,1.35,.55,1.7);world.colliders.push({x,z,r:.75,height:2.2});return g;}
  const bakery=stall(9,18.8,0xab7888,'Sella’s Bakery');for(let i=0;i<12;i++)ell(bakery,[.13,.1,.10],i%2?0xcfaa6b:0xba8954,(i%4)*.31-.48,1.04,Math.floor(i/4)*.22-.25);
  const flowers=stall(-1,16.7,0x879c7c,'Flowers for you');for(let i=0;i<8;i++)flower(flowers,(i%4)*.4-.6,.91,Math.floor(i/4)*.3-.2,[0xe6a7b6,0xead5a2,0xbda8cb][i%3],.75);
  for(const [x,z]of [[-3,24.1],[1.4,23.1]]){const g=group(staticRoot,x,z);for(const s of [-1,1])box(g,.045,1.5,.045,0x8e6741,s*.29,.75,0).rotation.z=-s*.11;painting(g,0,1.2,.03,.65,.8,x<0?57:72);box(g,.85,.06,.21,0x8e6741,0,.83,.05);}
  for(let i=0;i<9;i++){const a=i/8;line(staticRoot,[[-3,3.3,19.1],[4,2.7,19.1],[11,3.3,19.1]],.012,0x6c604c);const flag=mesh(dynamicRoot,new T.PlaneGeometry(.32,.45,2,3),material(i%2?0xc7a56c:0xa48cb3,{side:T.DoubleSide}),-3+a*14,2.8+Math.abs(a-.5)*.8,19.1);flags.push(flag);}
  bench(staticRoot,-.5,25.2);bench(staticRoot,10.8,25.5);

  // LAKE: reeds, willows, boardwalk, boat with rower, ducks and fireflies.
  tree(staticRoot,-27,12,1.3,true);tree(staticRoot,-21,26,1.2,true);
  for(let i=0;i<55;i++){const a=i/55*6.28,x=-18+Math.cos(a)*8.7,z=15+Math.sin(a)*8.7;if(x>-10.8&&Math.abs(z-15)<2)continue;for(let k=0;k<3;k++){line(staticRoot,[[x,0,z],[x+.05,.5+k*.14,z],[x+.12,.85+k*.13,z+.04]],.012,0x819166);ell(staticRoot,[.034,.11,.034],0x9a8662,x+.12,.85+k*.13,z+.04);}}
  for(let i=0;i<16;i++)box(staticRoot,.24,.1,1.35,0xa4885e,-7.8-i*.24,.19,15);for(const x of [-8.1,-10.8])for(const z of [14.3,15.7]){box(staticRoot,.10,.8,.10,0x796448,x,-.1,z);lantern(staticRoot,x,.7,z,.3);}
  const boat=group(dynamicRoot,-10.8,15,.08),hullShape=new T.Shape();hullShape.moveTo(0,1.6);hullShape.bezierCurveTo(-.8,1.1,-.8,-1.1,0,-1.6);hullShape.bezierCurveTo(.8,-1.1,.8,1.1,0,1.6);
  const hull=mesh(boat,new T.ExtrudeGeometry(hullShape,{depth:.13,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.035,bevelThickness:.04}),0x8b6544);hull.rotation.x=Math.PI/2;hull.position.y=.16;
  for(const s of [-1,1])line(boat,[[0,.15,1.6],[s*.56,.36,.8],[s*.64,.36,0],[s*.55,.36,-.8],[0,.15,-1.6]],.075,0x805938);for(const z of [-.65,.55])box(boat,1.02,.09,.25,0xb18b57,0,.34,z);
  const oars=[];for(const s of [-1,1]){const o=group(boat,s*.4,0,.4);line(o,[[0,0,0],[s*.6,0,.3],[s*1.2,-.1,.8]],.025,0x73523a);ell(o,[.13,.035,.29],0x9c784e,s*1.2,-.1,.8);oars.push(o);}
  const ducks=[];for(let i=0;i<5;i++){const g=group(dynamicRoot,-18+i,20,.08);ell(g,[.18,.14,.28],0xe5dfc8,0,.11,0);ell(g,[.10,.12,.10],0x66836e,0,.29,.19);ell(g,[.07,.026,.09],0xdcb575,0,.26,.3);ducks.push(g);}
  const ff=[];for(let i=0;i<70;i++)ff.push(-27+(i*2.13)%18,.3+(i*.37)%2.7,7+(i*1.27)%18);const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(ff,3));const firefly=new T.Points(fg,new T.PointsMaterial({color:0xffe18e,size:.085,transparent:true,opacity:.38,depthWrite:false}));dynamicRoot.add(firefly);

  // FESTIVAL: sun banners, flower arch, lantern stand and a shared sky finale.
  paving(-16,-9,5.7,0xc4b498);const plaza=group(staticRoot,-16,-9);
  mesh(plaza,new T.CylinderGeometry(1.9,2,.16,40),0xae977c,0,.1,-1.8);sunEmblem(plaza,0,.7,-2.8,.85);
  const arch=line(plaza,[[-2,0,4.5],[-2,2,4.5],[-1.2,3.2,4.5],[0,3.6,4.5],[1.2,3.2,4.5],[2,2,4.5],[2,0,4.5]],.075,0x8f8862);
  for(let i=0;i<26;i++){const a=i/25*Math.PI;ell(plaza,[.18,.13,.16],i%2?0xe5b7c4:0xe8cf9d,Math.cos(a)*2,1.4+Math.sin(a)*2.1,4.5);}
  for(const x of [-4.6,4.6])for(const z of [-3.8,3.8]){box(plaza,.085,3.1,.085,0x85714e,x,1.55,z);lantern(plaza,x,3,z,.6);const flag=mesh(dynamicRoot,new T.PlaneGeometry(.75,1.3,3,8),material(0x9b7ea6,{side:T.DoubleSide}),x-16,2.1,z-9);flags.push(flag);sunEmblem(plaza,x,2.1,z+.03,.32);}
  for(let i=0;i<12;i++)lantern(staticRoot,-20+i*.73,3.2+Math.sin(i/11*Math.PI)*-.8,-7,.28);
  line(plaza,[[-4.6,3.2,2],[0,2.4,2],[4.6,3.2,2]],.02,0x766346);
  const launchLantern=lantern(dynamicRoot,-16,1,-10,.55);const lamp= new T.PointLight(0xffcb7d,3,9,2);lamp.position.set(-16,2,-10);dynamicRoot.add(lamp);lights.push(lamp);
  tree(staticRoot,-21,-10,.65);for(let i=0;i<10;i++){const ribbon=mesh(dynamicRoot,new T.PlaneGeometry(.10,.6,1,4),material(i%2?0xc9a4b6:0xe8c781,{side:T.DoubleSide}),-21+Math.sin(i)*.8,1.5+i*.12,-10+Math.cos(i)*.8);flags.push(ribbon);}
  bench(staticRoot,-19,-12,Math.PI/2);bench(staticRoot,-12,-11,-Math.PI/2);

  // Distinct, inspectable props carry each optional memory.
  for(const m of MEMORIES){if([1,5,7,10,12,14,15,17,19,20,21,22,23,25,26,28,29,33].includes(m.id))continue;const g=group(staticRoot,m.x,m.z);props.set(m.id,g);
    if(['book','sign','history','wish'].includes(m.action)){box(g,.55,.07,.4,0x8b677c,0,.67,0);box(g,.49,.03,.34,0xe9dabc,0,.71,0);box(g,.12,.63,.13,0x89704d,0,.32,0);}
    else if(m.action==='painting'){painting(g,0,1,.08,.65,.75,89);box(g,.08,.8,.08,0x86623e,0,.4,0);}
    else if(m.action==='flowers'){for(let i=0;i<7;i++)flower(g,Math.sin(i*2.4)*.28,0,Math.cos(i*2.4)*.28,0xe3c4b9,.8);}
    else if(m.action==='mushroom'){for(let i=0;i<5;i++){mesh(g,new T.CylinderGeometry(.025,.04,.24,6),0xded1b2,Math.sin(i)*.3,.12,Math.cos(i)*.3);ell(g,[.15,.08,.15],0xb591ab,Math.sin(i)*.3,.27,Math.cos(i)*.3);}}
    else if(m.action==='lantern')lantern(g,0,.75,0,.48);
    else if(m.action==='fern'){for(let i=0;i<7;i++){const leaf=ell(g,[.05,.37,.14],0x749765,Math.sin(i)*.18,.33,Math.cos(i)*.18);leaf.rotation.z=Math.sin(i)*.8;}}
  }
  // A small paper keepsake responds when approached; its light is local, never
  // a screen-covering marker. The actual interaction remains the environment prop.
  const tokens=new Map();for(const m of MEMORIES){const token=mesh(dynamicRoot,new T.OctahedronGeometry(.075),material(0xe9cc89,{emissive:0x9c7339,emissiveIntensity:.25}),m.x,.8,m.z);tokens.set(m.id,token);}
  // Author all static scenery before batching; dynamic characters stay separate.
  batchStatics(staticRoot,new Set());
  function actor(x,z,color,hair,scale=1,width=1,role='idle'){
    const a=cloneVillager(dynamicRoot,hero,{color,hair,scale,width});a.group.position.set(x,groundHeight(x,z),z);a.group.rotation.y=Math.PI;const entry={a,home:V(x,groundHeight(x,z),z),role,phase:actors.length*.83};actors.push(entry);return entry;
  }
  actor(25,-.05,0x71827d,0x75543f,1.1,1.16,'host');actor(23,-1.1,0x97705f,0x523a33,.94,.95,'music');actor(27,-2.8,0x9d8864,0x79513e,1.03,1.1,'clap');
  actor(1.2,22.8,0x678c93,0x503b31,.99,.94,'paint');actor(9.1,19.6,0xb97e8a,0x795c3e,.99,1.04,'baker');actor(7.1,24.1,0x85965f,0x67462e,.8,.9,'wave');actor(11.5,24,0x9a89a4,0xc4b49e,.95,1,'greet');actor(-7,17.8,0x739ba0,0x634f38,1.06,1,'fisher');
  const rower=actor(-10.8,15,0x758da1,0x634c3a,1,1,'rower');actor(-13.3,-10,0xa98096,0x6c4d36,1,.98,'dance');actor(-18.4,-8.5,0x839879,0x987149,.93,1.07,'dance');
  // Props are attached to bones, so hands and tools animate together.
  const musician=actors[1].a;const lute=group(musician.bones.HandL,0,.08,-.08);ell(lute,[.14,.2,.045],0xa57e4f,0,0,0);box(lute,.045,.35,.035,0x735136,0,.25,0);for(let k=0;k<3;k++)box(lute,.004,.4,.004,0xdbd0ac,k*.015-.015,.16,.05);
  const brush=box(actors[3].a.bones.HandR,.015,.22,.015,0x87623f,0,-.06,.04);ell(actors[4].a.bones.HandL,[.15,.08,.12],0xc6a171,0,0,.07);line(actors[7].a.bones.HandR,[[0,0,0],[0,.5,.15],[0,1.1,.45]],.013,0x8a744e);
  // Instanced sky lanterns are reused for the boat scene and finale.
  const lanternCount=quality==='low'?110:quality==='high'?360:220;
  const skyLanterns=new T.InstancedMesh(new T.CylinderGeometry(.19,.16,.37,6),material(0xffd49b,{emissive:0xffb76f,emissiveIntensity:.8}),lanternCount);skyLanterns.frustumCulled=false;skyLanterns.visible=false;scene.add(skyLanterns);
  const initialSky=scene.background.clone(),nightSky=new T.Color(0x202b4f),initialFog=scene.fog.color.clone(),nightFog=new T.Color(0x384b61);const hemi=scene.children.find(o=>o.isHemisphereLight);let night=0,event=null,eventTime=0,musicUntil=0,boatActive=false,boatTime=0,finaleActive=false,finaleTime=0,found=new Set(),glowUntil=new Map();
  function mark(id){glowUntil.set(id,4);if(id===1)world.openChest();if(id===5)world.animals.greet();if(id===14||id===12)musicUntil=10;}
  return {boat,rower:rower.a,actors,tokens,skyLanterns,props,
    syncProgress(ids){found=new Set(ids);},activate:mark,
    followRabbit(){event='rabbit';eventTime=0;},rabbitStatus(){return {position:bunny.g.position.clone(),done:event==='rabbitDone'};},
    startBoat(){boatActive=true;boatTime=0;},stopBoat(){boatActive=false;boat.position.set(-10.8,.08,15);boat.rotation.set(0,0,0);},
    startFinale(){finaleActive=true;finaleTime=0;},stopFinale(){finaleActive=false;},
    update(dt,t,p,{cinematic=false,boatProgress=0,finaleProgress=0}={}){
      const isNear=(x,z,r)=>Math.hypot(p.x-x,p.z-z)<r;
      if(event==='rabbit'){const target=V(22,0,20.1),d=target.clone().sub(bunny.g.position);if(isNear(bunny.g.position.x,bunny.g.position.z,5.5)){eventTime+=dt;const step=Math.min(d.length(),dt*1.05);d.normalize();bunny.g.position.addScaledVector(d,step);bunny.g.rotation.y=Math.atan2(d.x,d.z);bunny.g.position.y=Math.abs(Math.sin(eventTime*7))*.23;if(bunny.g.position.distanceTo(target)<.2){event='rabbitDone';bunny.g.position.copy(target);}}}
      else if(event!=='rabbitDone'){bunny.g.position.y=Math.sin(t*2)*.012;}
      friends.forEach((r,i)=>{r.g.position.x=r.home.x+Math.sin(t*.25+i)*.5;r.g.position.y=Math.abs(Math.sin(t*3+i))*.08;});stag.neck.rotation.x=isNear(28,19,2.5)?-.14:.38+Math.sin(t*.6)*.14;
      for(const [id,token]of tokens){const m=MEMORIES[id-1],near=isNear(m.x,m.z,6);token.visible=!cinematic&&near&&!found.has(id);token.position.y=.88+Math.sin(t*1.4+id)*.1;token.rotation.y=t*.5;const left=glowUntil.get(id)||0;if(left>0){glowUntil.set(id,left-dt);token.visible=true;token.scale.setScalar(1+Math.sin(left*3)*.25);}else token.scale.setScalar(1);}
      roofs.forEach(r=>r.material.opacity=T.MathUtils.damp(r.material.opacity,isNear(25,-2,6)?0.12:1,5,dt));flame.scale.y=1+Math.sin(t*11)*.13;hearthLight.intensity=6.5+Math.sin(t*7)*.4;
      flags.forEach((f,i)=>{f.rotation.y=Math.sin(t*1.3+i)*.14;f.rotation.z=Math.sin(t+i)*.035;});jets.forEach((j,i)=>j.material.opacity=.45+Math.sin(t*3+i)*.12);pollen.rotation.y=Math.sin(t*.1)*.015;fountainWater.material.roughness=.2+Math.sin(t)*.04;
      ducks.forEach((d,i)=>{const a=t*.08+i*1.1;d.position.set(-18+Math.sin(a)*3.7,.10+Math.sin(t*2+i)*.02,15+Math.cos(a)*3.7);d.rotation.y=a+Math.PI/2;});firefly.material.opacity=.38+Math.sin(t*1.7)*.18;
      musicUntil=Math.max(0,musicUntil-dt);
      for(const n of actors){const distance=Math.hypot(p.x-n.home.x,p.z-n.home.z);n.a.group.visible=distance<34||n.role==='rower';if(!n.a.group.visible)continue;
        let pose=n.role==='rower'?'sit':n.role==='dance'&&(finaleActive||isNear(-16,-9,9))?'dance':n.role==='clap'&&musicUntil>0?'dance':n.role==='wave'&&distance<5?'wave':'idle';n.a.update(dt,{pose,time:t+n.phase});
        if(['music','paint','fisher'].includes(n.role)){n.a.bones.UpperArmL.rotation.x=-.7;n.a.bones.ForearmL.rotation.x=-.8;n.a.bones.UpperArmR.rotation.x=-.6;n.a.bones.ForearmR.rotation.x=-.7+Math.sin(t*(n.role==='music'?5:1.5))*.17;}
        if(n.role==='host'&&distance<5)n.a.bones.Head.rotation.y=Math.atan2(p.x-n.home.x,p.z-n.home.z)-n.a.group.rotation.y;
      }
      if(boatActive){boatTime+=dt;const b=boatSample(boatProgress);boat.position.set(b.x,b.y+Math.sin(t*1.7)*.015,b.z);boat.rotation.y=b.yaw;boat.rotation.z=Math.sin(t)*.018;}else boat.rotation.z=Math.sin(t)*.012;
      boat.updateMatrixWorld(true);rower.a.group.position.copy(boat.localToWorld(V(0,-.32,-.58)));rower.a.group.quaternion.copy(boat.quaternion);oars.forEach((o,i)=>{o.rotation.y=boatActive?Math.sin(t*2)*(i?1:-1)*.35:0;o.rotation.z=boatActive?Math.cos(t*2)*.13:0;});
      if(finaleActive)finaleTime=finaleProgress;
      const desiredNight=cinematic?0:finaleActive?Math.min(1,finaleTime/7):boatActive?.55:found.has(33)?.75:0;
      night=T.MathUtils.damp(night,desiredNight,1,dt);scene.background.copy(initialSky).lerp(nightSky,night);scene.fog.color.copy(initialFog).lerp(nightFog,night);world.sun.intensity=3.2*(1-night*.84);if(hemi)hemi.intensity=2.05*(1-night*.61);world.water.material.color.setHex(0x79aaa6).lerp(new T.Color(0x486381),night);
      const active=finaleActive||boatActive||found.has(33);skyLanterns.visible=active;
      if(active){const n=finaleActive?lanternCount:boatActive?Math.min(45,lanternCount):Math.min(100,lanternCount);skyLanterns.count=n;for(let i=0;i<n;i++){const a=i*2.399,r=Math.sqrt(i/n)*27,age=finaleActive?Math.max(0,finaleTime-i*.023):t*.16+i*.14;const center=finaleActive?{x:-16,z:-9}:{x:-18,z:15};dummy.position.set(center.x+Math.sin(a)*r+Math.sin(age*.3+i)*.5,1.6+age*.48+(i%7)*.5,center.z+Math.cos(a)*r);dummy.rotation.set(Math.sin(t+i)*.07,a,Math.cos(t+i)*.06);dummy.scale.setScalar(finaleActive?Math.min(1,Math.max(0,(finaleTime-i*.023)*2)):.8);dummy.updateMatrix();skyLanterns.setMatrixAt(i,dummy.matrix);}skyLanterns.instanceMatrix.needsUpdate=true;}
      launchLantern.position.y=finaleActive?1+Math.max(0,finaleTime-2)*.6:1+Math.sin(t)*.035;
    }
  };
}
