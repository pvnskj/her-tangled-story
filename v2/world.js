import * as T from 'three';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';
import {phase} from './timeline.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export const PALETTE={stone:0xd6c4a4,wood:0x674732,trim:0x392e39,roof:0x79609b,grass:0x6b914f,gold:0xeecf88};
export function groundHeight(x,z){const edge=Math.max(0,Math.hypot(x,z)-15)/20;return Math.sin(x*.13)*Math.cos(z*.14)*edge*1.7;}
function random(seed=1237){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const mat=(color,opts={})=>new T.MeshStandardMaterial({color,roughness:.88,...opts});
const materials=new Map();const M=color=>{if(!materials.has(color))materials.set(color,mat(color));return materials.get(color);};
function mesh(parent,g,m,x=0,y=0,z=0){const o=new T.Mesh(g,typeof m==='number'?M(m):m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
const box=(p,w,h,d,c,x,y,z)=>mesh(p,new T.BoxGeometry(w,h,d),c,x,y,z);
const ell=(p,s,c,x,y,z)=>{const o=mesh(p,new T.SphereGeometry(1,12,10),c,x,y,z);o.scale.set(...s);return o;};
function line(p,points,r,color){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(q=>V(...q))),Math.max(8,points.length*5),r,7,false),color);}
function painting(parent,x,y,z,w,h,seed){
  const c=document.createElement('canvas');c.width=256;c.height=320;const ctx=c.getContext('2d'),rnd=random(seed);
  ctx.fillStyle='#f6dfa9';ctx.fillRect(0,0,256,320);ctx.fillStyle='#efbc64';ctx.beginPath();ctx.arc(170,72,37,0,7);ctx.fill();
  for(let k=0;k<4;k++){ctx.fillStyle=['#a9b9a2','#769a84','#608477','#405f5a'][k];ctx.beginPath();ctx.moveTo(0,320);for(let i=0;i<8;i++)ctx.lineTo(i*42,150+k*30-rnd()*60);ctx.lineTo(256,320);ctx.fill();}
  for(let i=0;i<45;i++){ctx.fillStyle=['#f4bd8a','#d195ae','#f5e1a6'][i%3];ctx.beginPath();ctx.arc(rnd()*256,245+rnd()*75,2+rnd()*3,0,7);ctx.fill();}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;
  const g=new T.Group();g.position.set(x,y,z);parent.add(g);box(g,w+.15,h+.15,.09,0xc89450,0,0,0);mesh(g,new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:t,roughness:1}),0,0,.051);return g;
}
function flower(parent,x,y,z,color=0xe9b4cc,scale=1){const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);line(g,[[0,0,0],[.02,.22,0],[0,.38,0]],.014,0x506a39);for(let k=0;k<5;k++){let a=k*Math.PI*.4;ell(g,[.085,.045,.055],color,Math.cos(a)*.066,.39,Math.sin(a)*.066);}ell(g,[.036,.035,.036],0xf3cc70,0,.415,0);return g;}
export function buildWorld(scene,quality='balanced') {
  const rnd=random(),colliders=[{x:0,z:0,r:3.45}],animated=[],trees=[];
  scene.background=new T.Color(0x9fd4e8);scene.fog=new T.Fog(0xbfe0ea,45,120);
  scene.add(new T.HemisphereLight(0xe6f4ed,0x687453,2.05));
  const sun=new T.DirectionalLight(0xffe4b5,3.2);sun.position.set(-18,34,13);sun.castShadow=true;sun.shadow.mapSize.setScalar(quality==='high'?2048:1024);sun.shadow.camera.left=-26;sun.shadow.camera.right=26;sun.shadow.camera.top=28;sun.shadow.camera.bottom=-20;sun.shadow.camera.near=.5;sun.shadow.camera.far=85;sun.shadow.normalBias=.025;sun.shadow.bias=-.00012;scene.add(sun);scene.add(sun.target);
  const floor=new T.PlaneGeometry(170,170,130,130);floor.rotateX(-Math.PI/2);const colors=[];const a=floor.attributes.position;
  for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i),h=groundHeight(x,z);a.setY(i,h-.04);const c=new T.Color().setHSL(.26+rnd()*.02,.42+rnd()*.1,.3+rnd()*.05);colors.push(c.r,c.g,c.b);}floor.setAttribute('color',new T.Float32BufferAttribute(colors,3));floor.computeVertexNormals();mesh(scene,floor,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));
  // Carefully composed distant ridgelines, out of the playable clearing.
  for(let i=0;i<20;i++){const ang=i/20*Math.PI*2,r=65+rnd()*20,h=10+rnd()*19;const hill=mesh(scene,new T.SphereGeometry(1,12,10),[0x91aaa0,0xa1b5aa,0xb0c2b6][i%3],Math.sin(ang)*r,h*.1,Math.cos(ang)*r);hill.scale.set(15+rnd()*15,h,15+rnd()*10);hill.castShadow=false;}
  // Winding ochre path with uneven stepping stones.
  const pathPoints=[[0,.005,5],[-2,.005,9],[-1,.005,13],[5,.005,18],[9,.005,24]];
  const pathCurve=new T.CatmullRomCurve3(pathPoints.map(p=>V(...p)));
  for(let i=0;i<95;i++){const p=pathCurve.getPoint(i/94),s=ell(scene,[.78,.045,.57],i%3?0xc2b38a:0xcdbd94,p.x,p.y,p.z);s.rotation.y=rnd()*3;s.castShadow=false;}
  // Tower: tapered stone shaft, a full chamber, and a real window aperture.
  const tower=new T.Group();scene.add(tower);
  mesh(tower,new T.CylinderGeometry(3.04,3.34,18,36,1,true),PALETTE.stone,0,9,0);
  const stones=new T.InstancedMesh(new T.BoxGeometry(.47,.31,.13),mat(0xc5b493),620);let count=0,dummy=new T.Object3D();
  for(let row=0;row<40;row++)for(let k=0;k<15;k++){const ang=(k/15+row%2/30)*Math.PI*2,r=3.35-row*.007;dummy.position.set(Math.sin(ang)*r,.4+row*.43,Math.cos(ang)*r);dummy.rotation.set(0,ang,0);dummy.scale.set(.75+rnd()*.7,.65+rnd()*.5,1);dummy.updateMatrix();stones.setMatrixAt(count++,dummy.matrix);stones.setColorAt(count-1,new T.Color().setHSL(.10,.18,.59+rnd()*.17));}stones.count=count;stones.castShadow=true;tower.add(stones);
  {const wallG=new T.CylinderGeometry(3.28,3.34,17.4,28,1,true);const wall=new T.Mesh(wallG,mat(0xbfae8e,{side:T.DoubleSide}));wall.position.y=8.9;wall.castShadow=true;wall.receiveShadow=true;tower.add(wall);}
  for(const y of [2.1,11.5,17.9])mesh(tower,new T.TorusGeometry(y===17.9?3.03:3.37-y*.017,.105,6,48),0xb6a381,0,y,0).rotation.x=Math.PI/2;
  mesh(tower,new T.CylinderGeometry(3.16,2.7,.45,36),0x8c7253,0,17.8,0);
  mesh(tower,new T.CylinderGeometry(3.06,3.06,.12,48),0xa17c55,0,17.98,0);
  for(let i=0;i<16;i++){const x=-2.8+i*.36,len=2*Math.sqrt(Math.max(0,8.8-x*x));box(tower,.017,.006,len,0x805e41,x,18.045,0);}
  for(let i=0;i<56;i++) {
    const ang=i/56*Math.PI*2,x=Math.sin(ang)*3,z=Math.cos(ang)*3;
    const front=Math.abs(x)<1.04&&z>0;
    if(front){box(tower,.35,.8,.27,0xe8d9b8,x,18.4,z).rotation.y=ang;box(tower,.35,.95,.27,0xe8d9b8,x,21.55,z).rotation.y=ang;}
    else box(tower,.35,4,.27,0xe8d9b8,x,20,z).rotation.y=ang;
  }
  // Window surround, wooden sill, opened painted shutters and swaying curtains.
  box(tower,2.4,.14,.65,0x805e41,0,18.82,3.04);
  for(const s of [-1,1]){box(tower,.17,2.3,.36,0x82594b,s*1.12,19.94,2.9);const shutter=new T.Group();shutter.position.set(s*1.16,19.9,3.06);shutter.rotation.y=s*1.1;tower.add(shutter);box(shutter,.85,2.15,.075,0x688b8b,s*.42,0,0);for(let k=0;k<6;k++)box(shutter,.73,.025,.025,0xb9cba8,s*.42,-.86+k*.34,.055);
    const curtain=mesh(tower,new T.PlaneGeometry(.55,2.35,10,16),mat(0xe2afae,{side:T.DoubleSide}),s*1.24,20,2.68);animated.push({kind:'curtain',mesh:curtain,base:curtain.geometry.attributes.position.array.slice(),phase:s});
  }
  line(tower,[[-1.12,21,2.9],[-.8,21.6,2.9],[0,21.82,2.9],[.8,21.6,2.9],[1.12,21,2.9]],.11,0x82594b);
  // Anchor is visible beside the window; hair passes around its top.
  mesh(tower,new T.CylinderGeometry(.105,.14,1.3,12),0x684734,-.85,18.67,2.45);ell(tower,[.18,.12,.18],0xc79753,-.85,19.35,2.45);
  // Conical roof built from overlapping curved tile rings and a finial.
  mesh(tower,new T.ConeGeometry(3.9,5.3,48),0x554967,0,24.62,0);
  const tiles=new T.InstancedMesh(new T.SphereGeometry(1,7,5),mat(PALETTE.roof),600);count=0;
  for(let row=0;row<15;row++){const y=22.03+row*.31,r=3.8*(1-row/17),n=Math.floor(44*(1-row/19));for(let k=0;k<n;k++){const ang=(k+.5*(row%2))/n*Math.PI*2;dummy.position.set(Math.sin(ang)*r,y,Math.cos(ang)*r);dummy.rotation.set(0,ang,0);dummy.scale.set(.31,.12,.43);dummy.updateMatrix();tiles.setMatrixAt(count,dummy.matrix);tiles.setColorAt(count,new T.Color().setHSL(.72+rnd()*.025,.17,.32+rnd()*.15));count++;}}tiles.count=count;tiles.castShadow=true;tower.add(tiles);ell(tower,[.12,.65,.12],0xc9a35d,0,27.55,0);
  // Furnished room: woven rug, bed, easel, bookshelf, jars and flowers.
  const rug=mesh(tower,new T.CircleGeometry(1.85,48),0x97719b,0,18.065,-.4);rug.rotation.x=-Math.PI/2;
  for(const r of [.55,1.1,1.68]){const ring=mesh(tower,new T.TorusGeometry(r,.025,5,64),0xd5ad8e,0,18.08,-.4);ring.rotation.x=Math.PI/2;}
  box(tower,1.12,.4,1.95,0x694b38,-1.65,18.3,-.85);box(tower,1.06,.19,1.88,0xe9d7b5,-1.65,18.59,-.85);box(tower,1.08,.12,1.35,0x9c86a2,-1.65,18.73,-.52);ell(tower,[.42,.12,.28],0xf4e4c5,-1.65,18.76,-1.49);
  for(const x of [-2.18,-1.12])for(const z of [-1.81,.11]){mesh(tower,new T.CylinderGeometry(.038,.044,.95,8),0x6b4d3a,x,18.5,z);ell(tower,[.08,.08,.08],0xc39a60,x,19,z);}
  const shelf=new T.Group();shelf.position.set(1.7,18,-1.3);shelf.rotation.y=-.55;tower.add(shelf);box(shelf,1.28,2,.16,0x78583b,0,1,0);for(const y of [.1,.65,1.2,1.8]){box(shelf,1.4,.07,.4,0x825b3f,0,y,.13);for(let k=0;k<6;k++){const h=.22+rnd()*.26;box(shelf,.105,h,.2,[0x9d6978,0x648e87,0xd2b675,0x6d6a8b][k%4],-.52+k*.19,y+h/2+.04,.13);}}
  painting(tower,.15,20,-2.78,1.25,1.5,27);painting(tower,-1.3,20.5,-2.36,.65,.9,18).rotation.y=.46;
  const easel=new T.Group();easel.position.set(1.7,18,.5);easel.rotation.y=-.6;tower.add(easel);for(const s of [-1,1])box(easel,.05,1.45,.05,0x9a7046,s*.3,.72,0).rotation.z=s*-.13;painting(easel,0,1.22,.04,.64,.82,9);box(easel,.85,.045,.19,0x825b3f,0,.79,.07);
  mesh(tower,new T.CylinderGeometry(.28,.32,.05,24),0x8c6447,-2.1,18.86,1.04);for(let k=0;k<3;k++)box(tower,.04,.8,.04,0x694a37,-2.1+Math.cos(k*2.09)*.23,18.43,1.04+Math.sin(k*2.09)*.23);
  mesh(tower,new T.CylinderGeometry(.11,.09,.24,12),0xb78371,-2.1,19,1.04);for(let k=0;k<5;k++)flower(tower,-2.1+(rnd()-.5)*.18,19.08,1.04+(rnd()-.5)*.18,0xf1c4b8,.5);
  const lamp=new T.PointLight(0xffc388,14,9,2);lamp.position.set(-1,20,-1);scene.add(lamp);
  // Garden vines climb the tower, with deliberate lavender clusters.
  for(let k=0;k<7;k++){const ang=k*.91+.5,points=[];for(let j=0;j<9;j++){const y=j*1.95,r=3.4-y*.017;points.push([Math.sin(ang+Math.sin(j)*.14)*r,y,Math.cos(ang+Math.sin(j)*.14)*r]);}line(tower,points,.025,0x63724a);for(let j=0;j<25;j++){const y=rnd()*17,angle=ang+Math.sin(y/1.9)*.14,r=3.44-y*.017;const leaf=ell(tower,[.24,.1,.14],j%3?0x678251:0x829660,Math.sin(angle)*r,y,Math.cos(angle)*r);leaf.rotation.z=rnd()*3;if(j%5===0)ell(tower,[.15,.28,.12],0xaa8fb6,Math.sin(angle)*r,y-.2,Math.cos(angle)*r);}}
  // Low garden gate and stone stairs visually connect the landmark to the clearing.
  box(tower,1.35,2.7,.1,0x665442,0,1.4,3.07);for(let i=0;i<6;i++)box(tower,.014,2.55,.02,0x9b825b,-.55+i*.22,1.4,3.13);ell(tower,[.048,.048,.03],0xe2be6c,.38,1.28,3.17);
  // Original branch silhouettes and layered broadleaf crowns, shared geometry.
  function tree(x,z,scale,seed,pal){const r=random(seed),g=new T.Group();pal=pal||[0x7fae6a,0x6a9a5e,0x93bd7d,0xa8c98a];g.position.set(x,groundHeight(x,z),z);g.scale.setScalar(scale);scene.add(g);line(g,[[0,0,0],[.09,1.4,0],[-.12,2.5,.06],[.05,3.5,.1]],.17,0x6a5946);
    for(let k=0;k<6;k++){const ang=k*2.4;const end=[Math.sin(ang)*(1+r()*.5),3.0+r()*1.6,Math.cos(ang)*(1+r()*.5)];line(g,[[0,1.9+k*.12,0],[end[0]*.55,end[1]-.5,end[2]*.55],end],.075,0x6a5946);for(let j=0;j<3;j++){const o=ell(g,[.93+r()*.32,.55+r()*.25,.78+r()*.4],pal[(j+k)%4],end[0]+(r()-.5)*.9,end[1]+j*.12,end[2]+(r()-.5)*.9);o.rotation.set(r(),r(),r());}}
    for(let j=0;j<4;j++)line(g,[[0,.4,0],[Math.sin(j*1.6)*.45,.06,Math.cos(j*1.6)*.45],[Math.sin(j*1.6)*.7,.01,Math.cos(j*1.6)*.7]],.055,0x6a5946);trees.push(g);if(Math.abs(x)<24&&Math.abs(z)<24)colliders.push({x,z,r:.23*scale});return g;}
  [[-8,-5,2],[-10,3,1.8],[11,-8,2.3],[15,2,1.9],[-16,-12,2.5],[19,-15,2.8],[-20,7,2.2],[18,14,2],[-16,24,2.3],[25,24,2.4],[4,-15,1.7],[-22,-24,2.8],[26,-22,2.5]].forEach((p,i)=>tree(...p,30+i));
  for(let i=0;i<24;i++){const ang=rnd()*6.28;tree(Math.sin(ang)*42,Math.cos(ang)*42,1.8+rnd()*2,i+120);}
  const blossom=[0xf2b8d0,0xe89ec0,0xf7cfe2,0xdd92b8];
  [[16,9,2.1],[-13,3,1.9],[24,-4,2.3]].forEach((p,i)=>tree(p[0],p[1],p[2],300+i,blossom));
  // Instanced, tapered grass blades: one draw call, vertex wind, no frame allocations.
  const grassG=new T.BufferGeometry();grassG.setAttribute('position',new T.Float32BufferAttribute([-.05,0,0,.05,0,0,-.03,.22,.008,.03,.22,.008,.035,.5,.035],3));grassG.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,.45,1,.45,.5,1],2));grassG.setIndex([0,1,2,1,3,2,2,3,4]);grassG.computeVertexNormals();
  const wind={value:0};const gm=mat(0x809b59,{side:T.DoubleSide});gm.onBeforeCompile=shader=>{shader.uniforms.uWind=wind;shader.vertexShader='uniform float uWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n float gust=.55+.45*sin(uWind*.45+instanceMatrix[3].x*.06+instanceMatrix[3].z*.04);\n transformed.x += sin(uWind*1.7+instanceMatrix[3].x*.4+instanceMatrix[3].z*.3)*pow(uv.y,2.0)*.24*gust;\n transformed.z += cos(uWind*1.15+instanceMatrix[3].z*.5+instanceMatrix[3].x*.2)*pow(uv.y,2.0)*.09*gust;');};
  const gc=quality==='low'?6000:quality==='high'?20000:12000,grass=new T.InstancedMesh(grassG,gm,gc);let gi=0;
  for(let i=0;i<gc*3&&gi<gc;i++){const x=(rnd()-.5)*62,z=(rnd()-.5)*62;if(Math.hypot(x,z)<3.5||Math.hypot(x-9,z+2)<3.3||Math.hypot(x+18,z-15)<8.7)continue;
    if(z>4&&z<25&&Math.abs(x-(z<13?-1:(z-13)*.85-1))<1.25)continue;dummy.position.set(x,groundHeight(x,z),z);dummy.rotation.set(0,rnd()*6.28,0);dummy.scale.setScalar(.7+rnd()*.7);dummy.updateMatrix();grass.setMatrixAt(gi,dummy.matrix);grass.setColorAt(gi,new T.Color().setHSL(.26+rnd()*.03,.55,.42+rnd()*.12));gi++;}grass.count=gi;grass.receiveShadow=true;scene.add(grass);
  // Flower heads and stems share instance buffers across the meadow.
  const petals=new T.InstancedMesh(new T.SphereGeometry(1,7,5),mat(0xffffff),1800),stems=new T.InstancedMesh(new T.CylinderGeometry(.008,.013,.3,4),mat(0x526e3a),360);let fi=0;
  for(let i=0;i<360;i++){const x=(rnd()-.5)*35,z=(rnd()-.5)*35;if(Math.hypot(x,z)<3.6)continue;const h=.18+rnd()*.24,y=groundHeight(x,z);dummy.position.set(x,y+h/2,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,h/.3,1);dummy.updateMatrix();stems.setMatrixAt(fi,dummy.matrix);
    for(let k=0;k<5;k++){const a=k*1.257;dummy.position.set(x+Math.cos(a)*.045,y+h,z+Math.sin(a)*.045);dummy.scale.set(.057,.022,.035);dummy.rotation.y=-a;dummy.updateMatrix();petals.setMatrixAt(fi*5+k,dummy.matrix);petals.setColorAt(fi*5+k,new T.Color([0xefc898,0xd9b7d4,0xf4e6bb,0xcab6e1][i%4]));}fi++;}petals.count=fi*5;stems.count=fi;scene.add(petals,stems);
  // Stable: open timber bay with roof, fence, hay and a water trough.
  const stable=new T.Group();stable.position.set(9,0,-2);scene.add(stable);colliders.push({x:9,z:-2,r:2.15});
  for(const x of [-2,2])for(const z of [-1.5,1.5])box(stable,.16,2.7,.16,0x6a4d36,x,1.35,z);
  box(stable,4.25,.17,3.3,0x684c3b,0,2.7,0);for(const s of [-1,1]){const roof=box(stable,2.65,.13,3.65,0x74637d,s*1.1,3.19,0);roof.rotation.z=-s*.39;}
  for(let i=0;i<9;i++)box(stable,.37,1.65,.08,0x96744b,-1.8+i*.45,.83,-1.47);for(const x of [-2,2])for(let i=0;i<3;i++)box(stable,.1,.13,2.9,0x94754d,x,.45+i*.47,0);
  for(let i=0;i<3;i++)box(stable,.75,.55,.6,0xbaad6e,-1.35+i*.8,.28,-.85);box(stable,1.1,.35,.48,0x846949,1.8,.2,1.95);box(stable,.91,.015,.32,0x8db8b2,1.8,.38,1.95);
  // Backdrop village stays clearly visible from the valley reveal.
  for(let i=0;i<7;i++){const x=-10+i*3.8,z=28+Math.sin(i)*2,g=new T.Group();g.position.set(x,groundHeight(x,z),z);scene.add(g);const h=2.4+rnd()*1.8;box(g,2.8,h,2.5,[0xe4c7a4,0xd6ab98,0xe5d6ae,0xbec4ad][i%4],0,h/2,0);for(const s of [-1,1]){const r=box(g,2,.15,2.95,[0x84667c,0x9b7061,0x637c7c][i%3],s*.78,h+.58,0);r.rotation.z=-s*.58;}for(const x of [-1.27,1.27])box(g,.12,h,.12,0x6e5949,x,h/2,1.28);box(g,.57,1.4,.08,0x735c4d,0,.7,1.28);for(const x of [-.83,.83]){box(g,.5,.67,.04,0x638686,x,h*.64,1.29);box(g,.04,.67,.05,0xe9d4ac,x,h*.64,1.32);}box(g,.33,1.1,.4,0xb89b84,.7,h+1,-.5);}
  // Pond and waterfall provide a visible destination without expanding this slice.
  const water=mesh(scene,new T.CircleGeometry(8.4,64),mat(0x79aaa6,{metalness:.32,roughness:.23,transparent:true,opacity:.86}),-18,.015,15);water.rotation.x=-Math.PI/2;colliders.push({x:-18,z:15,r:8.4});
  for(let i=0;i<13;i++){let a=i/13*Math.PI*2;ell(scene,[.65,.3,.48],0x929e8d,-18+Math.cos(a)*8.5,.12,15+Math.sin(a)*8.5);}
  for(let i=0;i<7;i++)ell(scene,[2.3,2.5,1.5],0x93a294,-8+i*.8,1.3+i*.3,-12-i*.5);
  const falls=mesh(scene,new T.PlaneGeometry(.65,5,6,20),mat(0xd4e6d9,{transparent:true,opacity:.78,side:T.DoubleSide}),-5,2.6,-13);animated.push({kind:'waterfall',mesh:falls});
  // Keepsake sits a few seconds from the landing, not in an anonymous marker.
  const chest=new T.Group();chest.position.set(-2.2,0,7.6);chest.rotation.y=.55;scene.add(chest);box(chest,.7,.4,.46,0x846049,0,.29,0);
  const lid=new T.Group();lid.position.set(0,.5,-.23);chest.add(lid);const dome=mesh(lid,new T.CylinderGeometry(.23,.23,.7,20,1,false,0,Math.PI),0x9d7555,0,0,.23);dome.rotation.z=Math.PI/2;dome.rotation.y=Math.PI/2;
  for(const x of [-.24,.24])box(chest,.045,.43,.48,0xd4ad62,x,.31,0);box(chest,.10,.12,.035,0xe1bb6e,0,.45,.25);
  const keepsakeLight=new T.PointLight(0xffd993,0,3);keepsakeLight.position.set(-2.2,.85,7.6);scene.add(keepsakeLight);
  // Drifting leaves and cherry petals ride the breeze across the meadow.
  const LN=140,leafData=[];
  const leaves=new T.InstancedMesh(new T.PlaneGeometry(.11,.08),mat(0xffffff,{side:T.DoubleSide,transparent:true,opacity:.92}),LN);
  leaves.frustumCulled=false;
  for(let i=0;i<LN;i++){const petal=i%3===0;leafData.push({x:(rnd()-.5)*55,y:.4+rnd()*6.5,z:(rnd()-.5)*55,ph:rnd()*6.28,sp:.22+rnd()*.45,sw:.4+rnd()*.9});leaves.setColorAt(i,new T.Color(petal?[0xf6c6da,0xef9ec3,0xf9d9e8][i%3]:[0xd8b96a,0xc9a54e,0xe4cf8a][i%3]));}
  scene.add(leaves);
  // Airborne pollen: points, no texture request, soft circular shader.
  const pp=[];for(let i=0;i<100;i++)pp.push((rnd()-.5)*34,.5+rnd()*7,(rnd()-.5)*34);const pg=new T.BufferGeometry();pg.setAttribute('position',new T.Float32BufferAttribute(pp,3));const pollen=new T.Points(pg,new T.PointsMaterial({color:0xffe6ad,size:.055,transparent:true,opacity:.66,depthWrite:false}));scene.add(pollen);
  // Static geometry is merged per material and spatial tile. Individual tree
  // leaves and room props do not each consume their own draw call.
  batchStatics(scene,new Set([chest,water,...animated.map(a=>a.mesh)]));
  const animals=buildAnimals(scene);
  let chestOpen=false;
  return {colliders,chest,animals,sun,openChest(){chestOpen=true;},update(dt,t,opening,hero) {
    wind.value=t;
    for(let i=0;i<LN;i++){const L=leafData[i];L.y-=L.sp*dt;L.x+=(Math.sin(t*.7+L.ph)*L.sw+.4)*dt;L.z+=Math.cos(t*.55+L.ph)*.35*dt;if(L.y<.06){L.y=4.5+rnd()*4;L.x=(rnd()-.5)*55;L.z=(rnd()-.5)*55;}dummy.position.set(L.x,L.y,L.z);dummy.rotation.set(t*.9+L.ph,L.ph*2,t*.6+L.ph);dummy.scale.setScalar(1);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);}
    leaves.instanceMatrix.needsUpdate=true;
    for(const a of animated){if(a.kind==='curtain'){const p=a.mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,a.base[i*3+2]+Math.sin(t*1.3+a.base[i*3+1]*2+a.phase)*.08);p.needsUpdate=true;}else a.mesh.material.opacity=.66+Math.sin(t*4)*.07;}
    lid.rotation.x=T.MathUtils.damp(lid.rotation.x,chestOpen?-1.25:0,4,dt);keepsakeLight.intensity=T.MathUtils.damp(keepsakeLight.intensity,chestOpen?5:0,4,dt);
    pollen.rotation.y=t*.008;water.material.roughness=.23+Math.sin(t)*.025;
    animals.update(dt,t,opening,hero);
  }};
}
function batchStatics(scene,exclude) {
  scene.updateMatrixWorld(true);const batches=new Map(),remove=[];
  scene.traverse(o=>{if(!o.isMesh||o.isInstancedMesh)return;let p=o;while(p){if(exclude.has(p))return;p=p.parent;}
    if(Array.isArray(o.material))return;
    const pos=o.getWorldPosition(V()),key=`${o.material.uuid}/${o.castShadow}/${Math.floor(pos.x/16)}/${Math.floor(pos.z/16)}`;
    if(!batches.has(key))batches.set(key,{material:o.material,cast:o.castShadow,geometries:[]});
    batches.get(key).geometries.push(o.geometry.clone().applyMatrix4(o.matrixWorld));remove.push(o);
  });
  for(const o of remove)o.removeFromParent();
  for(const {material,cast,geometries} of batches.values()){const g=mergeGeometries(geometries,false);if(!g)throw new Error('Unable to batch static environment geometry');const m=new T.Mesh(g,material);m.castShadow=cast;m.receiveShadow=true;scene.add(m);for(const geo of geometries)geo.dispose();}
}
function buildAnimals(scene) {
  // Horse silhouette: chest, sloping neck, muzzle, articulated hocks and ears.
  const horse=new T.Group();horse.position.set(6,0,5);horse.rotation.y=-.8;scene.add(horse);
  ell(horse,[.39,.48,.83],0xe6deca,0,1.07,0);ell(horse,[.32,.49,.32],0xd9d0bc,0,1.2,.48);
  const neck=new T.Group();neck.position.set(0,1.3,.5);horse.add(neck);const n=ell(neck,[.24,.65,.24],0xe6deca,0,.43,.18);n.rotation.x=.38;ell(neck,[.24,.28,.42],0xe6deca,0,.93,.42);ell(neck,[.21,.17,.24],0xbeb5a3,0,.81,.71);
  const ears=[];for(const s of [-1,1]) {const e=ell(neck,[.07,.23,.09],0xe6deca,s*.15,1.21,.34);ears.push(e);ell(neck,[.055,.06,.034],0x392e2b,s*.22,.99,.48);ell(neck,[.055,.035,.027],0x6e635c,s*.13,.84,.91);}
  line(neck,[[0,1.15,.2],[0,.9,-.03],[0,.45,-.06],[0,.1,-.12]],.10,0x9a8d79);ell(neck,[.13,.17,.11],0x8a7d6b,0,1.34,.28);
  const legs=[];for(const x of [-.25,.25])for(const z of [-.5,.52]){const leg=new T.Group();leg.position.set(x,1.03,z);horse.add(leg);line(leg,[[0,0,0],[.02,-.42,.03],[0,-.85,-.04]],.068,0xd8cfbb);ell(leg,[.075,.1,.075],0xf2ede2,0,-.72,-.02);ell(leg,[.10,.10,.16],0x71665a,0,-.94,0);legs.push(leg);}
  const tail=new T.Group();tail.position.set(0,1.35,-.77);horse.add(tail);line(tail,[[0,0,0],[0,-.32,-.21],[0,-.81,-.13]],.11,0x9a8d79);
  const companion=new T.Group();scene.add(companion);ell(companion,[.055,.075,.145],0x71974d,0,0,0);ell(companion,[.075,.073,.081],0x84a65c,0,.033,.14);
  for(const s of [-1,1]){ell(companion,[.038,.039,.038],0xb6c67a,s*.065,.066,.15);ell(companion,[.014,.02,.013],0x253d27,s*.092,.07,.169);for(const z of [-.07,.07])line(companion,[[s*.04,-.01,z],[s*.082,-.055,z+.015],[s*.069,-.075,z+.04]],.013,0x628841);}
  line(companion,[[0,-.01,-.13],[.02,-.035,-.23],[.065,.005,-.27],[.08,.044,-.24],[.055,.055,-.21]],.021,0x72974d);
  const butterflies=[];for(let i=0;i<9;i++){const g=new T.Group();scene.add(g);const wings=[];for(const s of [-1,1]){const pivot=new T.Group();g.add(pivot);const w=ell(pivot,[.13,.018,.085],[0xe4b968,0xb39dc8,0xe1c9a3][i%3],s*.10,0,0);w.rotation.y=s*.35;wings.push(pivot);}butterflies.push({g,wings});}
  const birds=[];for(let i=0;i<6;i++){const g=new T.Group();scene.add(g);for(const s of [-1,1]){const w=box(g,.26,.023,.07,0x576468,s*.12,0,0);w.rotation.z=s*.2;}birds.push(g);}
  let greeted=false;
  return {horse,companion,greet(){greeted=true;},update(dt,t,opening,hero){
    const landing=opening?phase(t,30,35):1;const p=hero.group.position;
    const approach=opening?landing:greeted?1:0;const target=V(approach?3.6:6,0,approach?6.5:5);horse.position.lerp(target,1-Math.exp(-dt*.6));
    neck.rotation.x=T.MathUtils.damp(neck.rotation.x,opening&&t<30?.52:Math.sin(t*.6)*.08,2,dt);tail.rotation.z=Math.sin(t*1.8)*.23;ears.forEach((e,i)=>e.rotation.z=Math.sin(t*1.2+i)*.12);const walking=horse.position.distanceTo(target)>.15;legs.forEach((l,i)=>l.rotation.x=walking?Math.sin(t*5+i%2*Math.PI)*.22:0);
    if(opening&&t<31){
      const ride=phase(t,20,22),ground=phase(t,29,31);
      companion.position.set(.58,18.96,2.89).lerp(V(.1,p.y+2.1,3.3),ride).lerp(V(-.7,.12,5.4),ground);
      companion.rotation.y=.5+Math.sin(t*.6)*.2;companion.scale.setScalar(1.3-ground*.3);
    }else{
      const shoulder=hero.bones.Chest.getWorldPosition(V()).add(V(-.27,.09,.015).applyQuaternion(hero.group.quaternion));
      const hop=opening?phase(t,31,33):1;const start=V(-.7,.12,5.4);companion.position.copy(start.lerp(shoulder,hop));companion.position.y+=Math.sin(hop*Math.PI)*.8;companion.quaternion.copy(hero.group.quaternion);companion.scale.setScalar(1);}
    butterflies.forEach((b,i)=>{const a=t*.3+i*2.4,burst=opening?Math.sin(phase(t,29,34)*Math.PI)*1.8:0;b.g.position.set(Math.sin(a)*(2.3+burst)+i%3-1,1.0+Math.sin(t+i)*.3+burst*.4,6+Math.cos(a*.8)*2);b.wings.forEach((w,j)=>w.rotation.z=(j?1:-1)*Math.sin(t*12+i)*.9);});
    birds.forEach((b,i)=>{const a=t*.12+i; b.position.set(Math.sin(a)*14,12+i*.7+Math.sin(t+i)*.2,10+Math.cos(a)*13);b.rotation.y=-a;b.children.forEach((w,j)=>w.rotation.z=(j?1:-1)*Math.sin(t*7+i)*.35);});
  }};
}
