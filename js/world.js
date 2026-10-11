// buildWorld(scene): terrain, 6 themed zones, props, colliders, water, boat.
// Returns { colliders, waters, dockRect, boat, zoneAt, update }.

import * as THREE from "three";

export const ZONES = [
  { id: "tower",    name: "Tower Hill",           x: 0,   z: -90, r: 36 },
  { id: "forest",   name: "The Forest",           x: 80,  z: -40, r: 40 },
  { id: "tavern",   name: "The Snuggly Duckling", x: 85,  z: 45,  r: 32 },
  { id: "village",  name: "Corona Village",       x: 0,   z: 90,  r: 42 },
  { id: "lake",     name: "The Lake",             x: -80, z: 20,  r: 44 },
  { id: "festival", name: "Lantern Festival",     x: -45, z: -60, r: 36 },
];

// deterministic RNG so the world is identical every visit
function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildWorld(scene) {
  const rand = lcg(20261026);
  const colliders = [];   // {x,z,r}
  const waters = [];      // {x,z,rx,rz}
  const addCollider = (x, z, r) => colliders.push({ x, z, r });

  // ---------- sky, fog, lights ----------
  scene.background = new THREE.Color(0x2b1a44);
  scene.fog = new THREE.Fog(0x2b1a44, 70, 230);
  scene.add(new THREE.HemisphereLight(0x9a7bd0, 0x2f4a2a, 0.85));
  const sun = new THREE.DirectionalLight(0xffd9a0, 1.15);
  sun.position.set(60, 90, 30);
  scene.add(sun);

  // stars
  {
    const n = 350, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, e = rand() * 0.9 + 0.15, r = 400;
      pos[i*3] = Math.cos(a) * Math.cos(e) * r;
      pos[i*3+1] = Math.sin(e) * r;
      pos[i*3+2] = Math.sin(a) * Math.cos(e) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff6d8, size: 1.6, sizeAttenuation: false })));
  }

  // ---------- terrain ----------
  {
    const geo = new THREE.PlaneGeometry(240, 240, 56, 56);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const cGrass = new THREE.Color(0x4d7f45), cDry = new THREE.Color(0x6f8f4a),
          cDark = new THREE.Color(0x3a6638), cSand = new THREE.Color(0x9a8a5e), tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const n = Math.sin(x * 0.35) * Math.cos(z * 0.3) + Math.sin(x * 0.08 + z * 0.11);
      tmp.copy(cGrass).lerp(n > 0.4 ? cDry : cDark, Math.min(0.55, Math.abs(n) * 0.4));
      // sandy rim near the lake
      const ldx = (x + 80) / 30, ldz = (z - 20) / 24;
      const ld = ldx * ldx + ldz * ldz;
      if (ld < 1.7) tmp.lerp(cSand, Math.max(0, 1 - ld / 1.7) * 0.65);
      colors[i*3] = tmp.r; colors[i*3+1] = tmp.g; colors[i*3+2] = tmp.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
  }

  const mat = (c, e = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, emissive: e });
  const glowMat = (c) => new THREE.MeshBasicMaterial({ color: c });

  // ---------- helpers ----------
  function box(w, h, d, c, x, y, z, ry = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m;
  }
  function cyl(rt, rb, h, c, x, y, z, seg = 10) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c));
    m.position.set(x, y, z); scene.add(m); return m;
  }

  // ---------- Tower Hill ----------
  {
    // grassy mound
    const mound = new THREE.Mesh(new THREE.SphereGeometry(11, 12, 8), mat(0x55853f));
    mound.scale.set(1, 0.35, 1); mound.position.set(0, 0, -95); scene.add(mound);
    cyl(5, 6, 18, 0x9a93a8, 0, 9, -95, 12);            // tower body
    cyl(6.2, 6.2, 5, 0x8a8398, 0, 20, -95, 12);        // top room
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7.5, 7, 12), mat(0x6a4a8a));
    roof.position.set(0, 26, -95); scene.add(roof);
    box(2.4, 4, 0.6, 0x3a2a1a, 0, 2, -89.2);           // door (faces south)
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2),
      new THREE.MeshBasicMaterial({ color: 0xffd98a }));
    win.position.set(0, 20, -88.9); scene.add(win);    // lit window
    for (let i = 0; i < 3; i++) box(4 - i, 0.8, 2.4, 0x8a8398, 0, 0.4 + i * 0.8, -87 + i * 1.6); // stairs
    addCollider(0, -95, 7);
  }

  // ---------- trees (instanced) ----------
  const treeSpots = [];
  {
    const avoid = [[-6,-92],[3,-89],[8,-84],[-7,-100],[10,-95],[70,-30],[88,-48],[78,-22],
      [95,-32],[72,-52],[85,-15],[80,40],[98,40],[90,45],[0,90],[0,-95]];
    const clearOf = (x, z, d) => avoid.every(([ax, az]) => (x-ax)**2 + (z-az)**2 > d*d);
    let guard = 0;
    while (treeSpots.length < 70 && guard++ < 3000) {
      const x = 55 + rand() * 50, z = -65 + rand() * 50;
      if (!clearOf(x, z, 4)) continue;
      if (treeSpots.some(([tx, tz]) => (x-tx)**2 + (z-tz)**2 < 16)) continue;
      const pdx = (x - 85) / 10, pdz = (z + 15) / 8;
      if (pdx*pdx + pdz*pdz < 1.4) continue; // keep the pond clear
      treeSpots.push([x, z]);
    }
    // scattered trees elsewhere
    guard = 0;
    while (treeSpots.length < 96 && guard++ < 3000) {
      const x = -110 + rand() * 220, z = -110 + rand() * 220;
      if (Math.hypot(x - 80, z + 40) < 52) continue;
      if (Math.hypot(x, z - 90) < 30) continue;
      if (Math.hypot(x + 80, z - 20) < 36) continue;
      if (Math.hypot(x + 45, z + 60) < 24) continue;
      if (Math.hypot(x - 85, z - 45) < 20) continue;
      if (Math.hypot(x, z + 95) < 18) continue;
      if (!clearOf(x, z, 3)) continue;
      treeSpots.push([x, z]);
    }
    const trunkG = new THREE.CylinderGeometry(0.45, 0.65, 3, 7);
    const folG = new THREE.IcosahedronGeometry(2.3, 0);
    const trunks = new THREE.InstancedMesh(trunkG, mat(0x6a4a30), treeSpots.length);
    const fols = new THREE.InstancedMesh(folG, new THREE.MeshStandardMaterial({ roughness: 1 }), treeSpots.length);
    const d = new THREE.Object3D(), col = new THREE.Color();
    treeSpots.forEach(([x, z], i) => {
      const s = 0.8 + rand() * 0.7;
      d.position.set(x, 1.5 * s, z); d.scale.setScalar(s); d.rotation.y = rand() * 6; d.updateMatrix();
      trunks.setMatrixAt(i, d.matrix);
      d.position.set(x, (3 + 1.6) * s, z); d.updateMatrix();
      fols.setMatrixAt(i, d.matrix);
      fols.setColorAt(i, col.setHSL(0.29 + rand() * 0.06, 0.5, 0.3 + rand() * 0.14));
    });
    scene.add(trunks, fols);
    treeSpots.slice(0, 70).forEach(([x, z]) => addCollider(x, z, 0.9));
  }

  // ---------- flowers (instanced) ----------
  {
    const n = 260, g = new THREE.ConeGeometry(0.16, 0.55, 5);
    const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 1 }), n);
    const d = new THREE.Object3D(), col = new THREE.Color();
    const palette = [0xff9ecf, 0xc39bff, 0xffffff, 0xffd94d, 0xff8a7a];
    for (let i = 0; i < n; i++) {
      const x = -112 + rand() * 224, z = -112 + rand() * 224;
      const inLake = ((x + 80) / 28) ** 2 + ((z - 20) / 22) ** 2 < 1.05;
      const inPond = ((x - 85) / 8) ** 2 + ((z + 15) / 6) ** 2 < 1.2;
      if (inLake || inPond) { d.position.set(0, -5, 0); }
      else d.position.set(x, 0.28, z);
      d.updateMatrix(); m.setMatrixAt(i, d.matrix);
      m.setColorAt(i, col.set(palette[i % palette.length]));
    }
    scene.add(m);
  }

  // ---------- Tavern (Snuggly Duckling) ----------
  {
    box(12, 6, 9, 0x7a5a38, 90, 3, 45);                       // hut
    const roof = new THREE.Mesh(new THREE.ConeGeometry(9, 4.5, 4), mat(0x5a3a22));
    roof.position.set(90, 8.2, 45); roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 0.95);
    scene.add(roof);
    const winM = new THREE.MeshBasicMaterial({ color: 0xffc46a });
    [[84.2, 3.4, 45, Math.PI/2], [90, 3.4, 40.4, 0], [95.8, 3.4, 45, -Math.PI/2]].forEach(([x,y,z,ry]) => {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), winM);
      w.position.set(x, y, z); w.rotation.y = ry + Math.PI; scene.add(w);
    });
    box(2.2, 3.6, 0.5, 0x3a2a1a, 84, 1.8, 45);                // door faces west
    cyl(1, 1.1, 2.2, 0x6a5a48, 97, 1.1, 53, 10);              // rain barrel
    addCollider(90, 45, 8.5);

    // tables with mugs
    const mugM = mat(0xc9a05a);
    [[78, 50], [84, 58]].forEach(([tx, tz]) => {
      cyl(1.8, 1.8, 0.35, 0x8a6238, tx, 1.15, tz, 12);
      cyl(0.3, 0.35, 1.1, 0x6a4a30, tx, 0.55, tz, 8);
      for (let k = 0; k < 3; k++) {
        const a = rand() * Math.PI * 2;
        const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.4, 8), mugM);
        mug.position.set(tx + Math.cos(a) * 0.9, 1.55, tz + Math.sin(a) * 0.9);
        scene.add(mug);
      }
      // benches
      box(3.4, 0.35, 0.8, 0x7a5a38, tx, 0.75, tz + 2.4);
      box(3.4, 0.35, 0.8, 0x7a5a38, tx, 0.75, tz - 2.4);
      addCollider(tx, tz, 2.4);
    });
  }

  // ---------- Village ----------
  const stripeTex = (() => {
    const c = document.createElement("canvas"); c.width = 64; c.height = 16;
    const g = c.getContext("2d");
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#c9566c" : "#f7ecd4"; g.fillRect(i * 8, 0, 8, 16); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  {
    const houseCols = [0xe8d8b8, 0xd8b8c8, 0xb8d0e8, 0xe8c8a8];
    [[-20, 80, 0.3], [20, 82, -0.2], [-18, 102, -0.3], [18, 104, 0.25]].forEach(([hx, hz, ry], i) => {
      box(8, 5, 7, houseCols[i], hx, 2.5, hz, ry);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 3.6, 4), mat(0x8a5a3a));
      roof.position.set(hx, 6.8, hz); roof.rotation.y = Math.PI / 4 + ry; scene.add(roof);
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), glowMat(0xffc46a));
      w.position.set(hx, 3, hz + 3.55); w.rotation.y = ry; scene.add(w);
      addCollider(hx, hz, 5.5);
    });
    // market stalls
    [[-12, 96], [-6, 98], [12, 94]].forEach(([sx, sz]) => {
      box(3.6, 0.25, 2.6, 0x8a6238, sx, 2.6, sz);
      const awn = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 3.2),
        new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 1 }));
      awn.position.set(sx, 3.4, sz); awn.rotation.z = 0.12; scene.add(awn);
      [[-1.6, -1.1], [1.6, -1.1], [-1.6, 1.1], [1.6, 1.1]].forEach(([px, pz]) =>
        box(0.22, 2.6, 0.22, 0x6a4a30, sx + px, 1.3, sz + pz));
      addCollider(sx, sz, 2.4);
    });
    // well
    cyl(1.8, 2, 1.6, 0x8a8a95, 0, 0.8, 90, 12);
    box(0.3, 2.6, 0.3, 0x6a4a30, -1.6, 2.4, 90); box(0.3, 2.6, 0.3, 0x6a4a30, 1.6, 2.4, 90);
    const wroof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.6, 6), mat(0x8a5a3a));
    wroof.position.set(0, 4.4, 90); scene.add(wroof);
    addCollider(0, 90, 2.6);
    // flower cart
    box(2.6, 1, 1.6, 0x9a6a42, -5, 0.9, 100);
    [[-0.9], [0.9]].forEach(([wx]) => {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.25, 10), mat(0x4a3524));
      wh.rotation.z = Math.PI / 2; wh.position.set(-5 + wx, 0.55, 101); scene.add(wh);
    });
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 5),
        new THREE.MeshStandardMaterial({ color: [0xff9ecf, 0xc39bff, 0xffd94d][i % 3], roughness: 1 }));
      f.position.set(-6 + rand() * 2, 1.6, 99.6 + rand() * 0.8); scene.add(f);
    }
    addCollider(-5, 100, 1.8);
  }

  // ---------- Lake ----------
  let lakeMesh, pondMesh;
  {
    const mkWater = (rx, rz, x, z) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(1, 44),
        new THREE.MeshStandardMaterial({ color: 0x4a7fc9, transparent: true, opacity: 0.82, roughness: 0.12, metalness: 0.55 }));
      m.rotation.x = -Math.PI / 2; m.scale.set(rx, rz, 1); m.position.set(x, 0.06, z);
      scene.add(m); waters.push({ x, z, rx, rz }); return m;
    };
    lakeMesh = mkWater(28, 22, -80, 20);
    pondMesh = mkWater(8, 6, 85, -15);
  }
  const dockRect = { x0: -68, x1: -46, z0: 17.5, z1: 22.5 };
  {
    for (let i = 0; i < 7; i++) box(2.6, 0.25, 4.4, 0x8a6a48, -48 - i * 3, 0.35, 20);
    [[-48, 18.2], [-48, 21.8], [-63, 18.2], [-63, 21.8]].forEach(([px, pz]) =>
      cyl(0.25, 0.25, 1.6, 0x5a4228, px, 0, pz, 8));
  }

  // ---------- boat ----------
  const boat = { group: new THREE.Group(), from: V3(-62, 0.35, 20), to: V3(-80, 0.35, 44), t: 0, riding: false };
  {
    const g = boat.group;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 1.9), mat(0x7a5230));
    hull.position.y = 0.45; g.add(hull);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.3, 2.2), mat(0x5f4023));
    rim.position.y = 0.95; g.add(rim);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 1.4), mat(0x3d2c17));
    inner.position.y = 0.8; g.add(inner);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 1.4), mat(0x9a7448));
    seat.position.set(0.8, 1, 0); g.add(seat);
    const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), mat(0x8a6a48));
    oar.rotation.z = 1.1; oar.position.set(-0.6, 1.1, 1.2); g.add(oar);
    g.position.copy(boat.from);
    scene.add(g);
  }

  // ---------- Festival clearing ----------
  const dancers = [];
  {
    // stage
    box(10, 1, 8, 0x8a6a48, -45, 0.5, -65);
    box(3, 0.5, 1.6, 0x7a5a38, -40, 0.25, -61);
    const gold = new THREE.Mesh(new THREE.TorusGeometry(6, 0.28, 8, 40), glowMat(0xf5d67b));
    gold.rotation.x = -Math.PI / 2; gold.position.set(-45, 0.12, -57); scene.add(gold);
    // lantern poles
    const poleTops = [];
    [[-55, -55], [-35, -55], [-55, -70], [-35, -70]].forEach(([px, pz]) => {
      cyl(0.18, 0.24, 5.4, 0x5a4228, px, 2.7, pz, 8);
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.65, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xffc46a }));
      l.position.set(px, 5.8, pz); scene.add(l); poleTops.push(l);
      addCollider(px, pz, 0.8);
    });
    // bunting strings between poles
    const flagCols = [0xff9ecf, 0xc39bff, 0xffd94d, 0x9fd8ff];
    [[[-55, -55], [-35, -55]], [[-55, -70], [-35, -70]]].forEach(([a, b], si) => {
      for (let i = 1; i < 9; i++) {
        const f = i / 9, fx = a[0] + (b[0] - a[0]) * f, fz = a[1] + (b[1] - a[1]) * f;
        const fy = 5.4 - Math.sin(f * Math.PI) * 0.7;
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.7),
          new THREE.MeshBasicMaterial({ color: flagCols[(i + si) % 4], side: THREE.DoubleSide }));
        flag.position.set(fx, fy - 0.35, fz); scene.add(flag);
      }
    });
    // dancing crowd (simple low-poly figures)
    const danceRand = lcg(77);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, r = 3.4 + danceRand() * 1.4;
      const g = new THREE.Group();
      const bodyC = [0xc9566c, 0x6a9fd8, 0x7fbf6a, 0xd8a05a, 0x9a6ad8][i % 5];
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 1.5, 8), mat(bodyC));
      body.position.y = 0.95; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 7), mat(0xe8b88a));
      head.position.y = 2; g.add(head);
      g.position.set(-45 + Math.cos(a) * r, 0, -57 + Math.sin(a) * r);
      g.userData.phase = danceRand() * 6;
      scene.add(g); dancers.push(g);
    }
  }

  // ---------- fireflies ----------
  let fireflies, fireflyBase;
  {
    const n = 130, pos = new Float32Array(n * 3);
    fireflyBase = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const inForest = i < 80;
      const x = inForest ? 55 + rand() * 50 : -70 + rand() * 50;
      const z = inForest ? -65 + rand() * 50 : -80 + rand() * 40;
      fireflyBase[i*3] = x; fireflyBase[i*3+1] = 0.8 + rand() * 2.4; fireflyBase[i*3+2] = z;
    }
    pos.set(fireflyBase);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    fireflies = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0xffe98a, size: 0.35, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(fireflies);
  }

  // ---------- floating lanterns ----------
  let skyLanterns, skyLanternBase;
  {
    const n = 36;
    skyLanterns = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 8, 7),
      new THREE.MeshBasicMaterial({ color: 0xffb84d }), n);
    skyLanternBase = [];
    const d = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const x = -100 + rand() * 200, z = -100 + rand() * 200, y = 14 + rand() * 16;
      skyLanternBase.push({ x, y, z, ph: rand() * 6, sp: 0.3 + rand() * 0.5 });
      d.position.set(x, y, z); d.updateMatrix(); skyLanterns.setMatrixAt(i, d.matrix);
    }
    scene.add(skyLanterns);
  }

  // ---------- per-frame animation ----------
  const dummy = new THREE.Object3D();
  function update(dt, t) {
    // sky lanterns bob
    for (let i = 0; i < skyLanternBase.length; i++) {
      const L = skyLanternBase[i];
      dummy.position.set(L.x + Math.sin(t * 0.3 + L.ph) * 1.5, L.y + Math.sin(t * L.sp + L.ph) * 1.2, L.z);
      dummy.updateMatrix(); skyLanterns.setMatrixAt(i, dummy.matrix);
    }
    skyLanterns.instanceMatrix.needsUpdate = true;
    // fireflies drift
    const p = fireflies.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      p.array[i*3]   = fireflyBase[i*3] + Math.sin(t * 0.7 + i) * 0.8;
      p.array[i*3+1] = fireflyBase[i*3+1] + Math.sin(t * 1.1 + i * 1.7) * 0.5;
      p.array[i*3+2] = fireflyBase[i*3+2] + Math.cos(t * 0.5 + i * 0.6) * 0.8;
    }
    p.needsUpdate = true;
    // water shimmer
    const sh = 0.78 + Math.sin(t * 1.4) * 0.06;
    lakeMesh.material.opacity = sh; pondMesh.material.opacity = sh;
    // dancers bounce
    dancers.forEach((g) => { g.position.y = Math.abs(Math.sin(t * 3 + g.userData.phase)) * 0.35; });
  }

  function zoneAt(x, z) {
    let best = null, bd = 1e9;
    for (const zn of ZONES) {
      const d = Math.hypot(x - zn.x, z - zn.z);
      if (d < zn.r && d < bd) { bd = d; best = zn; }
    }
    return best;
  }

  return { colliders, waters, dockRect, boat, zoneAt, update };
}
