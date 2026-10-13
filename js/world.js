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

// walking-path network: dirt strips connecting the six zones (also grass exclusions)
const PATHS = [
  [0, -90, -45, -60],    // tower -> festival
  [-45, -60, -80, 20],   // festival -> lake
  [-80, 20, 0, 90],      // lake -> village
  [0, 90, 85, 45],       // village -> tavern
  [85, 45, 80, -40],     // tavern -> forest
  [80, -40, 0, -90],     // forest -> tower
  [-45, -60, -45, -40],  // festival approach spur
  [0, 90, 0, 65],        // village north gate spur
];
function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
  let t = L2 ? ((px - ax) * dx + (pz - az) * dz) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
function onPath(x, z, halfW) {
  for (const [ax, az, bx, bz] of PATHS)
    if (distToSeg(x, z, ax, az, bx, bz) < halfW) return true;
  return false;
}

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
  // registry of animated bits the per-frame update() drives
  const worldAnims = { mist: [], swayCanopy: null, petals: null, streaks: [], flags: [],
                       waterfallTex: null, lanterns: null, lanternGlowPts: null, fireflies: null, fireflyBase: null,
                       flicker: [], rippleTex2: null, moonPath: null };

  // ---------- dusk sky, fog, lights (luminous Kinkade dusk — never black) ----------
  scene.background = null;
  scene.fog = new THREE.Fog(0x54407a, 110, 330);

  // shared radial glow texture (lanterns, windows, moon, light pools, mist)
  function radialTex(stops) {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    for (const [o, col] of stops) gr.addColorStop(o, col);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const glowTex = radialTex([[0, "rgba(255,200,110,1)"], [0.4, "rgba(255,160,70,0.45)"], [1, "rgba(255,140,50,0)"]]);
  const mistTex = radialTex([[0, "rgba(200,190,230,0.55)"], [1, "rgba(200,190,230,0)"]]);
  const poolTex = radialTex([[0, "rgba(255,190,110,0.85)"], [0.6, "rgba(255,160,80,0.28)"], [1, "rgba(255,150,70,0)"]]);

  // gradient sky dome: indigo zenith -> purple -> warm gold horizon band
  {
    const g = new THREE.SphereGeometry(430, 24, 16);
    const p = g.attributes.position, col = new Float32Array(p.count * 3);
    const top = new THREE.Color(0x16133c), mid = new THREE.Color(0x53307c),
          hor = new THREE.Color(0xe09a52), bot = new THREE.Color(0x1c1636), t = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 430;
      if (y > 0.22) t.copy(mid).lerp(top, (y - 0.22) / 0.78);
      else if (y > -0.02) t.copy(hor).lerp(mid, (y + 0.02) / 0.24);
      else t.copy(hor).lerp(bot, Math.min(1, (-y - 0.02) * 4));
      col[i*3] = t.r; col[i*3+1] = t.g; col[i*3+2] = t.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const dome = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    dome.renderOrder = -10;
    scene.add(dome);
    worldAnims.skyDome = dome; // for per-zone mood shifts
  }

  // ---------- per-zone sky moods (the sky is never "always the same") ----------
  // forest = deep mysterious indigo, lake = golden serene, festival = pink festive,
  // village = warm cozy, default = classic dusk purple
  const SKY_MOODS = [
    { x: -22, z: -75, r: 35, tint: 0x8a7ab8, fog: 0x3a2a5a }, // forest: cool deep
    { x: -80, z: 20, r: 40, tint: 0xffd8a8, fog: 0x5a3a6a },  // lake: golden
    { x: -45, z: -60, r: 30, tint: 0xffb8d8, fog: 0x6a2a5a }, // festival: pink
    { x: 0, z: 90, r: 35, tint: 0xffc890, fog: 0x5a3050 },    // village: warm
  ];
  const _skyTint = new THREE.Color(0xffffff), _fogC = new THREE.Color();
  worldAnims.updateSky = (px, pz) => {
    _skyTint.set(0xffffff); _fogC.set(0x54407a);
    let best = 0;
    for (const m of SKY_MOODS) {
      const d = Math.hypot(px - m.x, pz - m.z);
      const w = Math.max(0, 1 - d / m.r);
      if (w > best) {
        best = w;
        _skyTint.set(0xffffff).lerp(new THREE.Color(m.tint), w * 0.45);
        _fogC.set(0x54407a).lerp(new THREE.Color(m.fog), w * 0.6);
      }
    }
    if (worldAnims.skyDome) worldAnims.skyDome.material.color.copy(_skyTint);
    scene.fog.color.copy(_fogC);
  };

  // moon + halo
  {
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: 0xf4ead0, fog: false, depthWrite: false, transparent: true }));
    moon.position.set(-170, 42, -350); moon.scale.setScalar(40); scene.add(moon);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xd8c9a0, fog: false, depthWrite: false, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }));
    halo.position.copy(moon.position); halo.scale.setScalar(110); scene.add(halo);
  }

  // strong ambient (the world must stay clearly readable) + low warm sun
  // dusk grade: cool fill + warm key, total kept moderate for mood
  scene.add(new THREE.HemisphereLight(0x9a7ff0, 0x46543c, 1.3));
  const sun = new THREE.DirectionalLight(0xffc182, 1.25);
  sun.position.set(-80, 55, 60);
  // soft diorama shadows: modest shadow camera that main.js keeps centered on her
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -45; sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45;
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.0015; sun.shadow.normalBias = 0.6;
  scene.add(sun);
  scene.add(sun.target);
  // a few warm accent lights at key landmarks (distance-limited)
  const pl = (c, i, x, y, z, d) => {
    const L = new THREE.PointLight(c, i, d, 2); L.position.set(x, y, z); scene.add(L);
  };
  pl(0xffb060, 90, 0, 22, -90, 60);     // tower
  pl(0xffb060, 70, 90, 5, 45, 45);      // tavern
  pl(0xffc070, 90, -45, 6, -57, 60);    // festival stage

  // stars
  {
    const n = 520, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, e = rand() * 0.85 + 0.18, r = 400;
      pos[i*3] = Math.cos(a) * Math.cos(e) * r;
      pos[i*3+1] = Math.sin(e) * r;
      pos[i*3+2] = Math.sin(a) * Math.cos(e) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff6d8, size: 1.7, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9 })));
  }

  // small helper: additive glow sprite in the world
  function addGlow(x, y, z, scale, color = 0xffb060, opacity = 0.55) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.position.set(x, y, z); s.scale.setScalar(scale); scene.add(s); return s;
  }
  function addPool(x, z, scale, opacity = 0.4) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(scale, scale),
      new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.09, z); scene.add(m); return m;
  }

  // ---------- terrain ----------
  {
    const geo = new THREE.PlaneGeometry(240, 240, 56, 56);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const cGrass = new THREE.Color(0x5c9154), cDry = new THREE.Color(0x8f8f5a),
          cDark = new THREE.Color(0x3f6b40), cSand = new THREE.Color(0x9a8563),
          cMist = new THREE.Color(0x453063), tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const n = Math.sin(x * 0.35) * Math.cos(z * 0.3) + Math.sin(x * 0.08 + z * 0.11);
      tmp.copy(cGrass).lerp(n > 0.4 ? cDry : cDark, Math.min(0.55, Math.abs(n) * 0.4));
      // sandy rim near the lake
      const ldx = (x + 80) / 44, ldz = (z - 20) / 34;
      const ld = ldx * ldx + ldz * ldz;
      if (ld < 1.7) tmp.lerp(cSand, Math.max(0, 1 - ld / 1.7) * 0.65);
      // diorama edge: dissolve the rim into mist so it feels like a tiny world
      const edge = Math.max(Math.abs(x), Math.abs(z));
      if (edge > 100) tmp.lerp(cMist, Math.min(1, (edge - 100) / 20));
      colors[i*3] = tmp.r; colors[i*3+1] = tmp.g; colors[i*3+2] = tmp.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    ground.receiveShadow = true;
    scene.add(ground);
    // diorama plinth: the world sits like a miniature on a dusky base
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(168, 178, 12, 48),
      new THREE.MeshStandardMaterial({ color: 0x241f38, roughness: 1 }));
    plinth.position.y = -6.4; scene.add(plinth);
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
  // reusable food stall: 4 posts + striped awning + counter + goods
  function foodStall(sx, sz, awnCols, goods, ry = 0) {
    const g = new THREE.Group(); g.position.set(sx, 0, sz); g.rotation.y = ry; scene.add(g);
    const gb = (w, h, d, c, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
      m.position.set(x, y, z); g.add(m); return m;
    };
    [[-1.6, -1.1], [1.6, -1.1], [-1.6, 1.1], [1.6, 1.1]].forEach(([px, pz]) =>
      gb(0.22, 2.6, 0.22, 0x6a4a30, px, 1.3, pz));
    for (let i = 0; i < 6; i++) {
      const a = gb(0.75, 0.12, 3.4, awnCols[i % 2], -1.875 + i * 0.75, 3.45 - (i % 2) * 0.06, 0);
      a.rotation.z = 0.1;
    }
    gb(3.4, 1, 2.2, 0x8a6238, 0, 0.5, 0);
    gb(3.6, 0.15, 2.4, 0x9a7248, 0, 1.05, 0);
    const gy = 1.35;
    const gm = (geo, c, x, y, z) => {
      const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); g.add(m); return m;
    };
    if (goods === "apples") {
      for (let i = 0; i < 7; i++)
        gm(new THREE.SphereGeometry(0.2, 8, 7), i % 3 ? 0xc93a3a : 0x7fbf3a,
           -1.1 + (i % 4) * 0.7, gy + Math.floor(i / 4) * 0.35, (i % 2) * 0.5 - 0.25);
    } else if (goods === "bread") {
      for (let i = 0; i < 5; i++) {
        const b = gm(new THREE.CylinderGeometry(0.22, 0.22, 0.55, 8), 0xd8a05a, -1 + i * 0.55, gy, 0);
        b.rotation.z = Math.PI / 2; b.rotation.y = (i % 2) * 0.4;
      }
    } else if (goods === "pies") {
      for (let i = 0; i < 4; i++) {
        const px = -0.9 + i * 0.65, pz = ((i % 2) - 0.5) * 0.6;
        gm(new THREE.CylinderGeometry(0.32, 0.28, 0.18, 10), 0xe8b86a, px, gy, pz);
        gm(new THREE.SphereGeometry(0.16, 7, 6), 0xc9566c, px, gy + 0.16, pz);
      }
    } else { // veg
      for (let i = 0; i < 6; i++)
        gm(new THREE.SphereGeometry(0.18, 7, 6), [0x7fbf3a, 0xd86a3a, 0xe8d83a][i % 3],
           -1.1 + (i % 3) * 0.75, gy, -0.4 + Math.floor(i / 3) * 0.8);
    }
    addCollider(sx, sz, 2.4);
  }
  // reusable wooden bench: 2 legs + seat + backrest, faces +z of its group
  function bench(bx, bz, ry) {
    const g = new THREE.Group(); g.position.set(bx, 0, bz); g.rotation.y = ry; scene.add(g);
    const bm = (w, h, d, c, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
      m.position.set(x, y, z); g.add(m); return m;
    };
    bm(0.3, 0.75, 0.7, 0x6a4a30, -1.2, 0.375, 0); // legs
    bm(0.3, 0.75, 0.7, 0x6a4a30, 1.2, 0.375, 0);
    bm(3.0, 0.18, 0.85, 0x8a6238, 0, 0.84, 0);    // seat
    bm(0.25, 1.0, 0.7, 0x6a4a30, -1.2, 1.3, -0.42); // backrest posts
    bm(0.25, 1.0, 0.7, 0x6a4a30, 1.2, 1.3, -0.42);
    bm(3.0, 0.5, 0.14, 0x8a6238, 0, 1.45, -0.42);  // backrest plank
    addCollider(bx, bz, 1.5);
  }

  // ---------- Tower Hill ----------
  {
    // grassy mound
    const mound = new THREE.Mesh(new THREE.SphereGeometry(11, 12, 8), mat(0x55853f));
    mound.scale.set(1, 0.35, 1); mound.position.set(0, 0, -95); scene.add(mound);
    cyl(5, 6, 18, 0xbdb5d2, 0, 9, -95, 12);            // tower body
    cyl(6.2, 6.2, 5, 0xaca4c4, 0, 20, -95, 12);        // top room
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7.5, 7, 12), mat(0x7d5f9e));
    roof.position.set(0, 26, -95); scene.add(roof);
    box(2.4, 4, 0.6, 0x3a2a1a, 0, 2, -89.2);           // door (faces south)
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2), winMat);
    win.position.set(0, 20, -88.7); scene.add(win);    // lit window
    const win2 = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.7), winMat);
    win2.position.set(0, 12, -89.35); scene.add(win2);
    const win3 = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.7), winMat);
    win3.position.set(2.45, 16, -90.51); win3.rotation.y = 0.5; scene.add(win3);
    for (let i = 0; i < 3; i++) box(4 - i, 0.8, 2.4, 0x8a8398, 0, 0.4 + i * 0.8, -87 + i * 1.6); // stairs
    addCollider(0, -95, 7);
    addGlow(0, 20, -88.4, 5, 0xffc46a, 0.5);      // window halo
    addGlow(0, 2.5, -88.6, 3.4, 0xffb060, 0.4);  // doorway glow
    addPool(0, -84, 16, 0.35);                    // warm pool at the doorstep

    // cliffs behind the tower + waterfall with mist
    const rockM = mat(0x6e6880);
    [[-18, -114, 5], [8, -116, 6], [-4, -120, 6.5], [18, -112, 4.5], [-26, -109, 4], [28, -118, 5]].forEach(([x, z, s]) => {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM);
      r.position.set(x, s * 0.35, z);
      r.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      scene.add(r);
    });
    const wc = document.createElement("canvas"); wc.width = 64; wc.height = 128;
    {
      const g = wc.getContext("2d");
      g.fillStyle = "rgba(140,180,230,0.18)"; g.fillRect(0, 0, 64, 128);
      for (let i = 0; i < 16; i++) {
        const x0 = rand() * 64, w = 1.5 + rand() * 3;
        const vg = g.createLinearGradient(0, 0, 0, 128);
        vg.addColorStop(0, "rgba(235,245,255,0)");
        vg.addColorStop(0.5, "rgba(235,245,255," + (0.35 + rand() * 0.4).toFixed(2) + ")");
        vg.addColorStop(1, "rgba(235,245,255,0)");
        g.fillStyle = vg;
        g.fillRect(x0, 0, w, 128);
      }
    }
    const wtex = new THREE.CanvasTexture(wc);
    wtex.wrapS = wtex.wrapT = THREE.RepeatWrapping; wtex.colorSpace = THREE.SRGBColorSpace;
    const wf = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 17),
      new THREE.MeshBasicMaterial({ map: wtex, transparent: true, opacity: 0.38, depthWrite: false }));
    wf.position.set(-13, 6.5, -101); wf.rotation.y = 0.25; scene.add(wf);
    const wf2 = wf.clone(); wf2.scale.set(0.55, 0.65, 1); wf2.position.set(-18, 4.5, -99); scene.add(wf2);
    worldAnims.waterfallTex = wtex;
    // mist at the waterfall base
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, opacity: 0.22, depthWrite: false }));
      m.position.set(-12 + rand() * 10, 1.5 + rand() * 2, -102 + rand() * 4);
      m.scale.setScalar(9 + rand() * 7);
      scene.add(m);
      worldAnims.mist.push({ s: m, ph: rand() * 6, bx: m.position.x });
    }
  }

  // ---------- horse (village entrance) — stylized, alive ----------
  {
    const g = new THREE.Group();
    const brown = mat(0x8a5a30), dark = mat(0x6a4224);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.1, 2.3), brown);
    body.position.y = 1.55; g.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 6), brown);
    belly.scale.set(0.8, 0.75, 1.5); belly.position.y = 1.5; g.add(belly);
    [[-0.42, -0.82], [0.42, -0.82], [-0.42, 0.82], [0.42, 0.82]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 1.5, 6), dark);
      leg.position.set(x, 0.75, z); g.add(leg);
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.18, 6), mat(0x3a2a1a));
      hoof.position.set(x, 0.09, z); g.add(hoof);
    });
    // neck+head on a pivot so it can graze
    const neckG = new THREE.Group(); neckG.position.set(0, 1.95, 1.05); g.add(neckG);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.15, 0.55), brown);
    neck.position.y = 0.42; neck.rotation.x = 0.3; neckG.add(neck);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.52, 0.95), brown);
    head.position.set(0, 1.02, 0.42); neckG.add(head);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.4), dark);
    muzzle.position.set(0, 0.92, 0.9); neckG.add(muzzle);
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.34), dark);
    mane.position.set(0, 0.55, -0.28); neckG.add(mane);
    const ears = [];
    [[-0.16], [0.16]].forEach(([x]) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 5), dark);
      ear.position.set(x, 1.36, 0.28); neckG.add(ear); ears.push(ear);
    });
    // tail on a pivot for swishing
    const tailG = new THREE.Group(); tailG.position.set(0, 1.85, -1.15); g.add(tailG);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.04, 1.2, 6), dark);
    tail.position.y = -0.55; tailG.add(tail);
    g.position.set(-20, 0, 70); g.rotation.y = 0.8;
    scene.add(g);
    addCollider(-20, 70, 1.5);
    worldAnims.horse = { group: g, neckG, tailG, ears, grazeT: rand() * 9, earT: 2 + rand() * 3, twitch: 0 };
  }

  // ---------- trees (instanced) ----------
  const treeSpots = [];
  {
    const avoid = [[-6,-92],[3,-89],[8,-84],[-7,-100],[10,-95],[70,-30],[88,-48],[78,-22],
      [95,-32],[72,-52],[85,-15],[80,40],[98,40],[90,45],[0,90],[0,-95]];
    const clearOf = (x, z, d) => avoid.every(([ax, az]) => (x-ax)**2 + (z-az)**2 > d*d);
    let guard = 0;
    while (treeSpots.length < 95 && guard++ < 4000) {
      const x = 55 + rand() * 50, z = -65 + rand() * 50;
      if (!clearOf(x, z, 4)) continue;
      if (treeSpots.some(([tx, tz]) => (x-tx)**2 + (z-tz)**2 < 16)) continue;
      const pdx = (x - 85) / 10, pdz = (z + 15) / 8;
      if (pdx*pdx + pdz*pdz < 1.4) continue; // keep the pond clear
      treeSpots.push([x, z]);
    }
    // scattered trees elsewhere
    guard = 0;
    while (treeSpots.length < 121 && guard++ < 4000) {
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
    // enchanted forest ARCH: tall trees set BACK from the path, canopies meet HIGH overhead
    // (not in your face — you see through the arch, not at blobs)
    const groveStart = treeSpots.length;
    {
      const ax = 0, az = -90, bx = -45, bz = -60; // tower -> festival path
      const segs = 10;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
        // perpendicular direction
        const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
        const nx = -dz / len, nz = dx / len;
        for (const side of [-1, 1]) {
          const off = 11 + (s % 2) * 2; // set BACK — clear sightlines along the path
          const x = px + nx * off * side, z = pz + nz * off * side;
          if (Math.hypot(x, z + 95) < 18) continue; // tower itself
          treeSpots.push([x, z, 1.7]); // TALL — canopies high overhead, not at eye level
        }
      }
      // a few extra wild trees behind the arch rows for depth
      let placed = 0, guard = 0;
      while (placed < 8 && guard++ < 1000) {
        const a = rand() * Math.PI * 2, r = 16 + rand() * 14;
        const x = -22 + Math.cos(a) * r, z = -75 + Math.sin(a) * r;
        if (onPath(x, z, 9)) continue;
        if (treeSpots.some(([tx, tz]) => (x-tx)**2 + (z-tz)**2 < 25)) continue;
        treeSpots.push([x, z, 1.4]);
        placed++;
      }
    }
    // hero trees: hand-placed, larger — frame the tower and the lake shore
    // (kept clear of clue spots, the dock, and walking lines)
    const heroes = [[-16,-68,1.6],[18,-70,1.45],[-20,-98,1.7],[16,-102,1.35],
                    [-52,4,1.4],[-48,36,1.5],[-104,44,1.45],[-108,-6,1.55]];
    const heroStart = treeSpots.length;
    for (const [hx, hz, hs] of heroes) treeSpots.push([hx, hz, hs]);
    const trunkG = new THREE.CylinderGeometry(0.45, 0.65, 3, 7);
    const folG = new THREE.IcosahedronGeometry(1.7, 1);
    const folG2 = new THREE.IcosahedronGeometry(1.1, 1);
    const folG3 = new THREE.IcosahedronGeometry(0.75, 1);
    const trunks = new THREE.InstancedMesh(trunkG, mat(0x6a4a30), treeSpots.length);
    const canA = new THREE.InstancedMesh(folG, new THREE.MeshStandardMaterial({ roughness: 1 }), treeSpots.length);
    const canB = new THREE.InstancedMesh(folG2, new THREE.MeshStandardMaterial({ roughness: 1 }), treeSpots.length);
    const canC = new THREE.InstancedMesh(folG3, new THREE.MeshStandardMaterial({ roughness: 1 }), treeSpots.length);
    const d = new THREE.Object3D(), col = new THREE.Color();
    const duskShadow = new THREE.Color(0x4a3a6e), goldKiss = new THREE.Color(0xd8a850);
    const swayData = [];
    treeSpots.forEach(([x, z, hs], i) => {
      const s = (hs || 1) * (0.7 + rand() * 0.5), ph = rand() * 6;
      d.position.set(x, 1.5 * s, z); d.scale.setScalar(s); d.rotation.y = rand() * 6; d.updateMatrix();
      trunks.setMatrixAt(i, d.matrix);
      d.position.set(x, 4.6 * s, z); d.updateMatrix();
      canA.setMatrixAt(i, d.matrix);
      d.position.set(x + 0.9 * s, 6.3 * s, z - 0.5 * s); d.updateMatrix();
      canB.setMatrixAt(i, d.matrix);
      d.position.set(x - 0.5 * s, 7.7 * s, z + 0.4 * s); d.updateMatrix();
      canC.setMatrixAt(i, d.matrix);
      // dusk-graded canopy: cool purple-shadowed underside, sun-kissed gold crown
      // ~30% get Bruno-style autumn colors (orange, gold, red)
      const r = rand();
      const autumn = rand() < 0.3;
      if (autumn) {
        const warm = [0xd86a3a, 0xc9a53a, 0xa83a4a][Math.floor(rand() * 3)];
        col.set(warm).offsetHSL((rand() - 0.5) * 0.03, 0, (rand() - 0.5) * 0.08);
      }
      else if (r < 0.12) col.setHSL(0.93 + rand() * 0.04, 0.55, 0.55 + rand() * 0.1);
      else if (r < 0.24) col.setHSL(0.11 + rand() * 0.03, 0.6, 0.42 + rand() * 0.08);
      else col.setHSL(0.29 + rand() * 0.07, 0.5, 0.3 + rand() * 0.14);
      canA.setColorAt(i, col.clone().lerp(duskShadow, 0.38).offsetHSL(0, 0, -0.03));
      canB.setColorAt(i, col.clone());
      canC.setColorAt(i, col.clone().lerp(goldKiss, 0.38).offsetHSL(0, 0.04, 0.06));
      swayData.push({ x, z, s, ph });
    });
    scene.add(trunks, canA, canB, canC);
    worldAnims.swayCanopy = { canA, canB, canC, swayData, dummy: new THREE.Object3D() };
    treeSpots.slice(0, 95).forEach(([x, z]) => addCollider(x, z, 0.9));
    for (let i = heroStart; i < treeSpots.length; i++) addCollider(treeSpots[i][0], treeSpots[i][1], 1.2);
    for (let i = groveStart; i < heroStart; i++) addCollider(treeSpots[i][0], treeSpots[i][1], 1.1);
  }

  // ---------- elephants (ambient, enchanted grove — not interactive) ----------
  {
    const gray = mat(0x8a8a9a), dark = mat(0x6a6a7a);
    const espots = [[18, -76, 0.5], [-32, -80, -2.2]];
    const elephants = [];
    for (const [ex, ez, ry] of espots) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 10), gray);
      body.scale.set(1, 0.95, 1.35); body.position.y = 2.2; g.add(body);
      [[-0.75, -0.9], [0.75, -0.9], [-0.75, 0.9], [0.75, 0.9]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 2.2, 8), dark);
        leg.position.set(x, 1.1, z); g.add(leg);
      });
      const headG = new THREE.Group(); headG.position.set(0, 2.9, 1.9); g.add(headG);
      headG.add(new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), gray));
      const ears = [];
      [-1, 1].forEach(s => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), dark);
        ear.scale.set(0.25, 1, 0.9); ear.position.set(s * 0.85, 0.15, -0.1);
        headG.add(ear); ears.push(ear);
      });
      const trunkG = new THREE.Group(); trunkG.position.set(0, -0.2, 0.8); headG.add(trunkG);
      let ty = 0, tz = 0;
      for (let k = 0; k < 3; k++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.22 - k * 0.05, 0.26 - k * 0.05, 0.7, 8), gray);
        seg.position.set(0, ty - 0.3, tz + 0.15); seg.rotation.x = 0.35 + k * 0.25;
        trunkG.add(seg); ty -= 0.55; tz += 0.28;
      }
      [-1, 1].forEach(s => {
        const tusk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.6, 6), mat(0xe8dcc0));
        tusk.position.set(s * 0.35, -0.55, 0.75); tusk.rotation.x = 0.9; headG.add(tusk);
      });
      const tailG = new THREE.Group(); tailG.position.set(0, 2.8, -2.0); g.add(tailG);
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 1.4, 6), dark);
      tail.position.y = -0.7; tailG.add(tail);
      g.position.set(ex, 0, ez); g.rotation.y = ry;
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      scene.add(g);
      addCollider(ex, ez, 2.2);
      elephants.push({ group: g, headG, trunkG, tailG, ears, ph: rand() * 6 });
    }
    worldAnims.elephants = elephants;
  }

  // ---------- deers + pandas (ambient, visible from paths — not interactive) ----------
  {
    const deers = [], pandas = [];
    // DEERS: slender body, long legs, neck, head with antlers
    const deerSpots = [[-15, -65, 0.8], [-30, -55, -0.5], [25, 30, 2.1]];
    for (const [dx, dz, ry] of deerSpots) {
      const g = new THREE.Group();
      const brown = mat(0x9a6a45), dark = mat(0x6a452a);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), brown);
      body.scale.set(1, 1, 1.4); body.position.y = 1.6; g.add(body);
      for (const [lx, lz] of [[-0.4, -0.6], [0.4, -0.6], [-0.4, 0.6], [0.4, 0.6]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 1.6, 6), dark);
        leg.position.set(lx, 0.8, lz); g.add(leg);
      }
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.2, 8), brown);
      neck.position.set(0, 2.5, 1.1); neck.rotation.x = 0.5; g.add(neck);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), brown);
      head.position.set(0, 3.1, 1.5); g.add(head);
      for (const s of [-1, 1]) { // antlers
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.9, 5), dark);
        ant.position.set(s * 0.25, 3.7, 1.4); ant.rotation.z = s * 0.4; g.add(ant);
      }
      g.position.set(dx, 0, dz); g.rotation.y = ry;
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
      scene.add(g);
      deers.push({ group: g, head, ph: rand() * 6 });
    }
    // PANDAS: round body, black/white, sitting
    const pandaSpots = [[-25, -70, 0.3], [10, 40, -1.2]];
    for (const [px, pz, ry] of pandaSpots) {
      const g = new THREE.Group();
      const white = mat(0xf0ece0), black = mat(0x2a2a30);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10), white);
      body.position.y = 0.85; g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), white);
      head.position.set(0, 1.7, 0.3); g.add(head);
      for (const s of [-1, 1]) { // ears + eye patches
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), black);
        ear.position.set(s * 0.35, 2.15, 0.25); g.add(ear);
        const patch = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), black);
        patch.position.set(s * 0.22, 1.78, 0.72); patch.scale.set(1, 1.3, 0.5); g.add(patch);
      }
      for (const s of [-1, 1]) { // arms
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.5, 4, 8), black);
        arm.position.set(s * 0.7, 0.7, 0.3); arm.rotation.z = s * 0.5; g.add(arm);
      }
      g.position.set(px, 0, pz); g.rotation.y = ry;
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
      scene.add(g);
      pandas.push({ group: g, head, ph: rand() * 6 });
    }
    worldAnims.deers = deers; worldAnims.pandas = pandas;
  }

  // ---------- flowers (instanced) ----------
  {
    const n = 650, g = new THREE.ConeGeometry(0.16, 0.55, 5);
    const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 1, emissive: 0x1a1210 }), n);
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

  // ---------- flowering bushes (instanced, Kinkade blossoms) ----------
  {
    const n = 130, g = new THREE.IcosahedronGeometry(1.1, 0);
    const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 1 }), n);
    const d = new THREE.Object3D(), col = new THREE.Color();
    const palette = [0xff8ab8, 0xffffff, 0xff5a6a, 0xffd94d, 0xc39bff, 0x7fbf6a];
    let placed = 0, guard = 0;
    while (placed < n && guard++ < 4000) {
      const x = -112 + rand() * 224, z = -112 + rand() * 224;
      if (((x + 80) / 44) ** 2 + ((z - 20) / 34) ** 2 < 1.15) continue; // lake
      if (Math.hypot(x, z - 90) < 26) continue;   // village clearing
      if (Math.hypot(x + 45, z + 60) < 20) continue; // festival clearing
      if (Math.hypot(x, z + 95) < 16) continue;  // tower
      if (Math.hypot(x - 85, z - 45) < 16) continue; // tavern
      const s = 0.7 + rand() * 1.1;
      d.position.set(x, 0.55 * s, z); d.scale.set(s, s * 0.75, s);
      d.rotation.y = rand() * 6; d.updateMatrix();
      m.setMatrixAt(placed, d.matrix);
      m.setColorAt(placed, col.set(palette[Math.floor(rand() * palette.length)]).offsetHSL(0, 0, (rand() - 0.5) * 0.08));
      placed++;
    }
    m.count = placed;
    scene.add(m);
  }

  // ---------- dirt walking paths (visible strips, grass exclusions) ----------
  {
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x9a8563, roughness: 1,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    for (const [ax, az, bx, bz] of PATHS) {
      const len = Math.hypot(bx - ax, bz - az);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 3.6), pathMat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = -Math.atan2(bz - az, bx - ax);
      m.position.set((ax + bx) / 2, 0.08, (az + bz) / 2);
      m.receiveShadow = true;
      scene.add(m);
    }
  }

  // ---------- grass blades (instanced carpet, Bruno-style density) ----------
  {
    // simple 3-vertex blade: two base verts, one tip vert with a slight bend
    // LONG soft blades (user request) — lush meadow feel
    const bg = new THREE.BufferGeometry();
    bg.setAttribute("position", new THREE.Float32BufferAttribute([
      -0.16, 0, 0,
       0.16, 0, 0,
       0.05, 0.72, 0.06,
    ], 3));
    bg.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
    bg.computeVertexNormals();
    const isLow = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (window.innerWidth < 500 && navigator.maxTouchPoints > 0);
    const n = isLow ? 60000 : 160000;
    const m = new THREE.InstancedMesh(bg, new THREE.MeshStandardMaterial({
      roughness: 1, side: THREE.DoubleSide }), n);
    const d = new THREE.Object3D(), col = new THREE.Color();
    let placed = 0, guard = 0;
    while (placed < n && guard++ < n * 4) {
      const x = -112 + rand() * 224, z = -112 + rand() * 224;
      if (((x + 80) / 44) ** 2 + ((z - 20) / 34) ** 2 < 1.15) continue; // lake
      if (((x - 85) / 10) ** 2 + ((z + 15) / 8) ** 2 < 1.3) continue;  // pond
      if (Math.hypot(x, z - 90) < 24) continue;   // village clearing
      if (Math.hypot(x + 45, z + 60) < 18) continue; // festival clearing
      if (Math.hypot(x, z + 95) < 15) continue;  // tower
      if (Math.hypot(x - 85, z - 45) < 15) continue; // tavern
      if (onPath(x, z, 2.3)) continue; // keep dirt paths clear and readable
      const s = 0.8 + rand() * 0.7;
      d.position.set(x, 0, z);
      d.scale.set(s, s * (0.9 + rand() * 0.5), s);
      d.rotation.y = rand() * 6;
      d.updateMatrix(); m.setMatrixAt(placed, d.matrix);
      // varied greens with warm yellow-green highlights
      m.setColorAt(placed, col.setHSL(0.22 + rand() * 0.08, 0.5, 0.35 + rand() * 0.15));
      placed++;
    }
    m.count = placed;
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
    const tg1 = addGlow(90, 3.4, 40.9, 7, 0xffc46a, 0.7);
    const tg2 = addGlow(90, 3.4, 49.1, 7, 0xffc46a, 0.7);
    const tg3 = addGlow(83.6, 2, 45, 6, 0xffb060, 0.6);                   // doorway
    worldAnims.flicker.push({ glow: tg1, pool: null, ph: rand() * 6, gb: 0.7, pb: 0 });
    worldAnims.flicker.push({ glow: tg2, pool: null, ph: rand() * 6, gb: 0.7, pb: 0 });
    worldAnims.flicker.push({ glow: tg3, pool: null, ph: rand() * 6, gb: 0.6, pb: 0 });
    addPool(80, 45, 22, 0.35);
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
      addGlow(hx, 3, hz + 3.9, 3.6, 0xffc46a, 0.45);
      addCollider(hx, hz, 5.5);
    });
    // six more houses: fill out the village (varied roofs, clear of clues/stalls/paths)
    const newHouses = [
      { x: -32, z: 95,  ry: 0.4,  wall: 0xd8c8a8, roof: 0x5a6a8a }, // slate blue
      { x: 32,  z: 95,  ry: -0.35, wall: 0xe8d8b8, roof: 0xc96a3a }, // terracotta
      { x: -28, z: 112, ry: -0.5, wall: 0xc8b898, roof: 0x8a6a3a }, // thatch brown
      { x: 28,  z: 112, ry: 0.45, wall: 0xd8b8a8, roof: 0x5a6a8a }, // slate blue
      { x: 0,   z: 115, ry: 0.1,  wall: 0xe8c8a8, roof: 0xc96a3a }, // terracotta
      { x: -35, z: 80,  ry: 0.7,  wall: 0xb8c8d8, roof: 0x8a6a3a }, // thatch brown
    ];
    for (const h of newHouses) {
      box(7, 4.5, 6, h.wall, h.x, 2.25, h.z, h.ry);
      const nr = new THREE.Mesh(new THREE.ConeGeometry(5.6, 3.2, 4), mat(h.roof));
      nr.position.set(h.x, 6.1, h.z); nr.rotation.y = Math.PI / 4 + h.ry; scene.add(nr);
      const nw = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), glowMat(0xffc46a));
      // window faces the village center
      const wa = Math.atan2(0 - h.x, 90 - h.z);
      nw.position.set(h.x + Math.sin(wa) * 3.05, 2.6, h.z + Math.cos(wa) * 3.05);
      nw.rotation.y = wa; scene.add(nw);
      addGlow(h.x + Math.sin(wa) * 3.4, 2.6, h.z + Math.cos(wa) * 3.4, 3.2, 0xffc46a, 0.4);
      addCollider(h.x, h.z, 5);
    }
    addPool(0, 92, 34, 0.32); // warm heart of the village
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
    // food stalls with goods (Bruno-style market density)
    foodStall(-16, 92, [0xc9566c, 0xf7ecd4], "apples");
    foodStall(-2, 94, [0x6a9fd8, 0xf7ecd4], "bread");
    foodStall(8, 96, [0x7fbf6a, 0xf7ecd4], "pies");
    foodStall(18, 92, [0xd8a05a, 0xf7ecd4], "veg");
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

  // ---------- Lake (big turquoise border water — clear enough to see fish) ----------
  let lakeMesh, pondMesh;
  {
    const mkWater = (rx, rz, x, z) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(1, 44),
        new THREE.MeshStandardMaterial({ color: 0x35b8c8, emissive: 0x0a3a44, transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.3 }));
      m.rotation.x = -Math.PI / 2; m.scale.set(rx, rz, 1); m.position.set(x, 0.06, z);
      scene.add(m); waters.push({ x, z, rx, rz }); return m;
    };
    lakeMesh = mkWater(42, 32, -80, 20); // BIG — borders the west map edge
    pondMesh = mkWater(8, 6, 98, -28); // off the tavern→forest path (was blocking it)
    // lantern reflection streaks on the lake (vertical warm gradients)
    const sc = document.createElement("canvas"); sc.width = 32; sc.height = 128;
    {
      const g = sc.getContext("2d");
      const gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, "rgba(255,190,110,0.9)"); gr.addColorStop(1, "rgba(255,150,70,0)");
      g.fillStyle = gr; g.fillRect(8, 0, 16, 128);
    }
    // lantern reflections: warm glow sprites floating on the water
    const streaks = [];
    for (let i = 0; i < 10; i++) {
      const sx = -100 + rand() * 40, sz = 6 + rand() * 28;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa050,
        transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      sp.position.set(sx, 0.5, sz);
      sp.scale.set(2.5 + rand() * 2.5, 1.6 + rand() * 1.4, 1);
      scene.add(sp); streaks.push({ m: sp, ph: rand() * 6 });
    }
    worldAnims.streaks = streaks;
    // ---------- koi fish (colorful, visible through clear turquoise water) ----------
    const koiColors = [0xff7a3a, 0xffd94d, 0xffffff, 0x4da8ff, 0xff4d8a];
    const kois = [];
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      const c = koiColors[i % koiColors.length];
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
      body.scale.set(1, 0.7, 1.8); g.add(body);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 6),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, transparent: true, opacity: 0.85 }));
      tail.rotation.x = Math.PI / 2; tail.position.z = -0.8; g.add(tail);
      // random swim position in the lake
      const a = rand() * Math.PI * 2, r = 8 + rand() * 28;
      const kx = -80 + Math.cos(a) * r * 0.9, kz = 20 + Math.sin(a) * r * 0.7;
      g.position.set(kx, 0.15, kz);
      scene.add(g);
      kois.push({ g, tail, cx: -80, cz: 20, rx: 10 + rand() * 25, rz: 8 + rand() * 18,
        a: rand() * 6, sp: 0.3 + rand() * 0.4, ph: rand() * 6 });
    }
    worldAnims.kois = kois;
    // ---------- turtles (slow, cute, basking near shore) ----------
    const turtles = [];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        mat(0x4a6a3a));
      shell.position.y = 0.15; g.add(shell);
      const belly = new THREE.Mesh(new THREE.CircleGeometry(0.55, 12), mat(0xd8c890));
      belly.rotation.x = -Math.PI / 2; belly.position.y = 0.16; g.add(belly);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), mat(0x5a7a4a));
      head.position.set(0, 0.4, 0.7); g.add(head);
      for (const [fx, fz] of [[-0.5, 0.3], [0.5, 0.3], [-0.5, -0.4], [0.5, -0.4]]) {
        const flip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat(0x5a7a4a));
        flip.scale.set(1, 0.5, 1.4); flip.position.set(fx, 0.2, fz); g.add(flip);
      }
      const a = rand() * Math.PI * 2;
      const tx = -80 + Math.cos(a) * 35, tz = 20 + Math.sin(a) * 26;
      g.position.set(tx, 0.12, tz); g.rotation.y = rand() * 6;
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      scene.add(g);
      turtles.push({ g, head, ph: rand() * 6, hx: tx, hz: tz });
    }
    worldAnims.turtles = turtles;
    const rc = document.createElement("canvas"); rc.width = 128; rc.height = 128;
    {
      const g = rc.getContext("2d");
      g.clearRect(0, 0, 128, 128);
      // fine soft glints — small and dim so they read as sparkle, not scratches
      for (let i = 0; i < 150; i++) {
        g.fillStyle = "rgba(255,205,135," + (0.04 + rand() * 0.08).toFixed(2) + ")";
        g.fillRect(rand() * 128, rand() * 128, 3 + rand() * 5, 1);
      }
      // tiny bright sparkles
      for (let i = 0; i < 150; i++) {
        g.fillStyle = "rgba(255,235,200," + (0.15 + rand() * 0.3).toFixed(2) + ")";
        const s = 1 + rand() * 1.6;
        g.fillRect(rand() * 128, rand() * 128, s, s);
      }
    }
    const rtex = new THREE.CanvasTexture(rc);
    rtex.wrapS = rtex.wrapT = THREE.RepeatWrapping; rtex.colorSpace = THREE.SRGBColorSpace;
    const ripple = new THREE.Mesh(new THREE.PlaneGeometry(56, 44),
      new THREE.MeshBasicMaterial({ map: rtex, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }));
    ripple.rotation.x = -Math.PI / 2; ripple.position.set(-80, 0.14, 20);
    scene.add(ripple);
    worldAnims.rippleTex = rtex;
    // second, finer sparkle layer drifting the other way — water depth
    const rtex2 = rtex.clone(); rtex2.needsUpdate = true;
    const ripple2 = new THREE.Mesh(new THREE.PlaneGeometry(40, 32),
      new THREE.MeshBasicMaterial({ map: rtex2, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false }));
    ripple2.rotation.x = -Math.PI / 2; ripple2.rotation.z = 0.7; ripple2.position.set(-80, 0.18, 20);
    scene.add(ripple2);
    worldAnims.rippleTex2 = rtex2;
    // moonlight sparkle path: a luminous road across the water toward the moon
    {
      const mc = document.createElement("canvas"); mc.width = 64; mc.height = 256;
      const g = mc.getContext("2d");
      const vg = g.createLinearGradient(0, 256, 0, 0);
      vg.addColorStop(0, "rgba(255,220,160,0)");
      vg.addColorStop(0.35, "rgba(255,215,150,0.35)");
      vg.addColorStop(0.75, "rgba(255,225,170,0.75)");
      vg.addColorStop(1, "rgba(255,240,200,0.95)");
      g.fillStyle = vg; g.fillRect(0, 0, 64, 256);
      g.globalCompositeOperation = "destination-in";
      const hg = g.createLinearGradient(0, 0, 64, 0);
      hg.addColorStop(0, "rgba(0,0,0,0)"); hg.addColorStop(0.5, "rgba(0,0,0,1)"); hg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = hg; g.fillRect(0, 0, 64, 256);
      const mtex = new THREE.CanvasTexture(mc); mtex.colorSpace = THREE.SRGBColorSpace;
      const moonPath = new THREE.Mesh(new THREE.PlaneGeometry(13, 26),
        new THREE.MeshBasicMaterial({ map: mtex, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
      moonPath.rotation.set(-Math.PI / 2, 0, 0.239); // aimed at the moon
      moonPath.position.set(-82, 0.12, 12);
      scene.add(moonPath);
      worldAnims.moonPath = moonPath;
    }
    addGlow(-80, 3, 20, 42, 0xff9a50, 0.22); // broad warm shimmer over the lake
    addPool(-56, 20, 18, 0.3);               // dock lamplight
  }
  const dockRect = { x0: -68, x1: -46, z0: 17.5, z1: 22.5 };
  {
    for (let i = 0; i < 7; i++) box(2.6, 0.25, 4.4, 0x8a6a48, -48 - i * 3, 0.35, 20);
    [[-48, 18.2], [-48, 21.8], [-63, 18.2], [-63, 21.8]].forEach(([px, pz]) =>
      cyl(0.25, 0.25, 1.6, 0x5a4228, px, 0, pz, 8));
  }
  // lantern posts along the lake's east/south shore — their reflections shimmer below
  // (positions hug the shoreline ellipse; kept clear of clues, the dock, and the fisher)
  {
    const orbM = new THREE.MeshBasicMaterial({ color: 0xffd98a });
    const postM = mat(0x4a3826);
    const posts = [
      { px: -50.6, pz: 5.8,  sx: -60, sz: 5.8 },   // north-east shore
      { px: -50.6, pz: 34.2, sx: -60, sz: 34.2 },  // south-east shore
      { px: -63.3, pz: 0.4,  sx: -69, sz: 0.4 },   // north shore
    ];
    for (const { px, pz, sx, sz } of posts) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 4.6, 8), postM);
      post.position.set(px, 2.3, pz); scene.add(post);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), orbM);
      orb.position.set(px, 5, pz); scene.add(orb);
      const gl = addGlow(px, 5, pz, 8, 0xffb060, 0.8);
      const pool = addPool(px, pz, 13, 0.35);
      worldAnims.flicker.push({ glow: gl, pool, ph: rand() * 6, gb: 0.8, pb: 0.35 });
      // reflection: vertical warm streak floating on the water toward the lake
      const st = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffa050,
        transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
      st.position.set(sx, 0.5, sz); st.scale.set(2.4, 6.5, 1);
      scene.add(st);
      worldAnims.streaks.push({ m: st, ph: rand() * 6 });
      addCollider(px, pz, 0.6);
    }
  }

  // ---------- lantern posts lining the main walking paths (tower→festival→lake→village) ----------
  // alternating warm white + cherry blossom pink — magical in first-person POV
  {
    const warmM = new THREE.MeshBasicMaterial({ color: 0xfff2d8 }); // warm white
    const pinkM = new THREE.MeshBasicMaterial({ color: 0xffb8d8 }); // cherry blossom pink
    const postM = mat(0x4a3826);
    const postG = new THREE.CylinderGeometry(0.14, 0.2, 4.2, 8);
    const orbG = new THREE.SphereGeometry(0.5, 10, 8);
    const segs = [
      [0, -90, -45, -60],    // tower -> festival
      [-45, -60, -80, 20],   // festival -> lake
      [-80, 20, 0, 90],      // lake -> village
    ];
    let side = 1, colorFlip = false;
    for (const [ax, az, bx, bz] of segs) {
      const len = Math.hypot(bx - ax, bz - az);
      const dx = (bx - ax) / len, dz = (bz - az) / len;
      const nx = -dz, nz = dx;
      const count = Math.max(2, Math.floor(len / 12));
      for (let i = 1; i <= count; i++) {
        const f = i / (count + 1);
        const px = ax + dx * len * f + nx * 2.8 * side;
        const pz = az + dz * len * f + nz * 2.8 * side;
        side *= -1; colorFlip = !colorFlip;
        if (((px + 80) / 44) ** 2 + ((pz - 20) / 34) ** 2 < 1) continue; // keep out of the lake
        const post = new THREE.Mesh(postG, postM);
        post.position.set(px, 2.1, pz); post.castShadow = true; scene.add(post);
        const orb = new THREE.Mesh(orbG, colorFlip ? pinkM : warmM);
        orb.position.set(px, 4.5, pz); scene.add(orb);
        const glowColor = colorFlip ? 0xff90c0 : 0xffe0a0;
        const gl = addGlow(px, 4.5, pz, 7, glowColor, 0.75);
        worldAnims.flicker.push({ glow: gl, pool: null, ph: rand() * 6, gb: 0.75, pb: 0 });
        addCollider(px, pz, 0.5);
      }
    }
  }

  // ---------- boat ----------
  const boat = { group: new THREE.Group(), from: V3(-58, 0.35, 15), to: V3(-80, 0.35, 44), t: 0, riding: false };
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
      // star treatment: big soft halo + warm pool on the grass + live flicker
      const gl = addGlow(px, 5.8, pz, 9, 0xffb060, 0.85);
      const pool = addPool(px, pz, 15, 0.32);
      worldAnims.flicker.push({ glow: gl, pool, ph: rand() * 6, gb: 0.85, pb: 0.32 });
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
        worldAnims.flags.push({ m: flag, ph: rand() * 6 });
      }
    });
    addPool(-45, -57, 30, 0.4);   // festival heart glow
    addPool(-45, -65, 16, 0.3);   // stage glow
    // dancing crowd (simple low-poly figures)
    const danceRand = lcg(77);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, r = 3.4 + danceRand() * 2.2;
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
    // audience benches: two arcs north of the dancers, all facing the stage (south)
    bench(-52, -48, Math.PI); bench(-45, -47, Math.PI); bench(-38, -48, Math.PI);
    bench(-54, -42, Math.PI); bench(-45, -41, Math.PI); bench(-36, -42, Math.PI);
    // festival food stalls (east side, clear of dancers/poles/clues)
    foodStall(-28, -45, [0xc9566c, 0xf7ecd4], "apples", -Math.PI / 2);
    foodStall(-26, -55, [0x6a9fd8, 0xf7ecd4], "bread", -Math.PI / 2);
    foodStall(-28, -65, [0xd8a05a, 0xf7ecd4], "pies", -Math.PI / 2);
  }

  // ---------- fireflies ----------
  let fireflies, fireflyBase;
  {
    const n = 160, pos = new Float32Array(n * 3);
    fireflyBase = new Float32Array(n * 3);
    const spots = [
      [55, -65, 50, 50],   // forest
      [-25, 90, 55, 35],   // village
      [-80, 20, 45, 35],   // lake
      [-45, -60, 40, 30],  // festival
    ];
    for (let i = 0; i < n; i++) {
      const s = spots[i % spots.length];
      fireflyBase[i*3] = s[0] + (rand() - 0.5) * s[2];
      fireflyBase[i*3+1] = 0.8 + rand() * 2.6;
      fireflyBase[i*3+2] = s[1] + (rand() - 0.5) * s[3];
    }
    pos.set(fireflyBase);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    fireflies = new THREE.Points(g, new THREE.PointsMaterial({
      map: mistTex, color: 0xffe98a, size: 0.55, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(fireflies);
    worldAnims.fireflies = fireflies; worldAnims.fireflyBase = fireflyBase;
  }

  // ---------- enchanted grove fireflies (second swarm, warm gold, tower forest) ----------
  {
    const n = 80, pos = new Float32Array(n * 3);
    const base = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      base[i*3]   = -10 + (rand() - 0.5) * 40;
      base[i*3+1] = 0.8 + rand() * 3.2;
      base[i*3+2] = -74 + (rand() - 0.5) * 32;
    }
    pos.set(base);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({
      map: mistTex, color: 0xffd76a, size: 0.65, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(pts);
    worldAnims.groveFlies = { pts, base };
  }

  // ---------- floating sky lanterns (the iconic Tangled image) ----------
  // concentrated over the festival clearing + the lake, a few drifting elsewhere
  {
    const n = 32;
    const bodyG = new THREE.CylinderGeometry(0.42, 0.5, 0.95, 8);
    const bodyM = new THREE.MeshBasicMaterial({ color: 0xffc06a, fog: false });
    const inst = new THREE.InstancedMesh(bodyG, bodyM, n);
    const gp = new Float32Array(n * 3);
    const gg = new THREE.BufferGeometry();
    gg.setAttribute("position", new THREE.BufferAttribute(gp, 3));
    const glowPts = new THREE.Points(gg, new THREE.PointsMaterial({
      map: glowTex, color: 0xffb050, size: 6.5, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    const data = [];
    const homes = [
      { x: -80, z: 20,  r: 34, w: 9 },   // the lake — the main release
      { x: -45, z: -60, r: 30, w: 13 },  // festival clearing
    ];
    for (let i = 0; i < n; i++) {
      let hx, hz, hr, home;
      if (i < 26) { const h = homes[(i % 10) < 7 ? 0 : 1]; hx = h.x; hz = h.z; hr = h.r; home = (i % 10) < 7 ? 0 : 1; }
      else { hx = 0; hz = 0; hr = 220; home = -1; } // a few wanderers over the whole valley
      const x = hx + (rand() - 0.5) * hr, z = hz + (rand() - 0.5) * hr;
      // lake lanterns stay low and drift over the water (visible in-frame);
      // festival ones climb high into the sky
      const maxY = home === 0 ? 15 : 44;
      data.push({ x, z, hx, hz, hr, home, maxY, y: 1.5 + rand() * (home === 0 ? 8 : 30),
                  sp: home === 0 ? 0.4 + rand() * 0.5 : 0.9 + rand() * 1.5,
                  ph: rand() * 6, sw: 1 + rand() * 2.2 });
    }
    scene.add(inst, glowPts);
    worldAnims.lanterns = { inst, glowPts, data, dummy: new THREE.Object3D() };
  }

  // ---------- drifting petals ----------
  {
    const n = 150, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const c = new THREE.Color();
    const pal = [0xffb8d4, 0xffffff, 0xffd9ec, 0xc39bff];
    const meta = [];
    for (let i = 0; i < n; i++) {
      meta.push({ x: -115 + rand() * 230, z: -115 + rand() * 230, y: rand() * 15,
                  fall: 0.5 + rand() * 0.9, ph: rand() * 6, sw: 0.6 + rand() * 1.4 });
      c.set(pal[i % pal.length]);
      col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.4, vertexColors: true,
      map: mistTex, transparent: true, opacity: 0.9, depthWrite: false }));
    scene.add(pts);
    worldAnims.petals = { pts, meta };
  }

  // ---------- guiding leaves: wind streams along tower → festival → lake → village ----------
  {
    const route = [[0,-90],[-45,-60],[-80,20],[0,90]];
    const segLen = [];
    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const L = Math.hypot(route[i+1][0]-route[i][0], route[i+1][1]-route[i][1]);
      segLen.push(L); total += L;
    }
    const n = 120, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const meta = [];
    const pal = [0xd8a53a, 0xc96a2a, 0xa83a4a, 0xe0c060];
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      meta.push({ d: Math.random() * total, lat: (Math.random()-0.5) * 5,
                  y: 0.5 + Math.random() * 2.5, sp: 2.5 + Math.random() * 2, ph: Math.random() * 6 });
      c.set(pal[i % pal.length]).offsetHSL((Math.random()-0.5)*0.03, 0, (Math.random()-0.5)*0.08);
      col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.55, vertexColors: true,
      map: mistTex, transparent: true, opacity: 0.95, depthWrite: false }));
    scene.add(pts);
    worldAnims.leaves = { pts, meta, route, segLen, total };
  }

  // ---------- ambient mist sprites ----------
  {
    const spots = [[-80, 1.5, 34, 26], [-62, 1.2, 8, 20], [70, 1.2, -40, 24],
                   [-45, 1.2, -57, 22], [0, 1.2, 92, 26], [85, 1.2, -15, 18]];
    for (const [x, y, z, s] of spots) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, opacity: 0.13, depthWrite: false }));
      m.position.set(x, y, z); m.scale.setScalar(s); scene.add(m);
      worldAnims.mist.push({ s: m, ph: rand() * 6, bx: x });
    }
  }

  // ---------- per-frame animation (everything alive) ----------
  function update(dt, t, px, pz) {
    // per-zone sky moods — the sky shifts as she travels
    if (px !== undefined && worldAnims.updateSky) worldAnims.updateSky(px, pz);
    // rising lanterns: climb, sway, fade out at the top, respawn over home turf
    // (lanternBoost: while she's rowing the boat, the lake release intensifies)
    {
      const { inst, glowPts, data, dummy } = worldAnims.lanterns;
      const gp = glowPts.geometry.attributes.position;
      const boost = worldAnims.lanternBoost ? 1.9 : 1;
      for (let i = 0; i < data.length; i++) {
        const L = data[i];
        L.y += L.sp * boost * dt;
        if (L.y > L.maxY) {
          L.y = 1.5 + Math.random() * 3;
          if (boost > 1 && L.home !== -1) L.home = 0; // the Tangled moment: all over the lake
          if (L.home === 0) L.maxY = 15;
          const hx = L.home === -1 ? 0 : (L.home === 0 ? -80 : -45);
          const hz = L.home === -1 ? 0 : (L.home === 0 ? 20 : -60);
          const hr = L.home === -1 ? 220 : (L.home === 0 ? 34 : 30);
          L.x = hx + (Math.random() - 0.5) * hr;
          L.z = hz + (Math.random() - 0.5) * hr;
        }
        const sx = L.x + Math.sin(t * 0.5 + L.ph) * L.sw;
        const sz = L.z + Math.cos(t * 0.4 + L.ph) * L.sw;
        const fade = L.y > L.maxY - 8 ? Math.max(0, 1 - (L.y - (L.maxY - 8)) / 8) : 1;
        dummy.position.set(sx, L.y, sz);
        dummy.rotation.y = t * 0.3 + L.ph;
        dummy.scale.setScalar(Math.max(0.001, fade));
        dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
        gp.array[i*3] = sx; gp.array[i*3+1] = fade > 0 ? L.y : -10; gp.array[i*3+2] = sz;
      }
      inst.instanceMatrix.needsUpdate = true;
      gp.needsUpdate = true;
    }
    // fireflies drift + twinkle
    {
      const p = worldAnims.fireflies.geometry.attributes.position;
      const fb = worldAnims.fireflyBase;
      for (let i = 0; i < p.count; i++) {
        p.array[i*3]   = fb[i*3] + Math.sin(t * 0.7 + i) * 0.9;
        p.array[i*3+1] = fb[i*3+1] + Math.sin(t * 1.1 + i * 1.7) * 0.55;
        p.array[i*3+2] = fb[i*3+2] + Math.cos(t * 0.5 + i * 0.6) * 0.9;
      }
      p.needsUpdate = true;
      worldAnims.fireflies.material.opacity = 0.75 + Math.sin(t * 2.3) * 0.2;
    }
    // grove fireflies drift + twinkle (warm gold, enchanted forest)
    {
      const gf = worldAnims.groveFlies;
      if (gf) {
        const p = gf.pts.geometry.attributes.position, fb = gf.base;
        for (let i = 0; i < p.count; i++) {
          p.array[i*3]   = fb[i*3] + Math.sin(t * 0.6 + i * 1.3) * 1.1;
          p.array[i*3+1] = fb[i*3+1] + Math.sin(t * 1.0 + i * 2.1) * 0.6;
          p.array[i*3+2] = fb[i*3+2] + Math.cos(t * 0.45 + i * 0.8) * 1.1;
        }
        p.needsUpdate = true;
        gf.pts.material.opacity = 0.8 + Math.sin(t * 2.0 + 1) * 0.2;
      }
    }
    // elephants: gentle sway + ear flaps + trunk sway
    for (const e of (worldAnims.elephants || [])) {
      e.group.rotation.z = Math.sin(t * 0.7 + e.ph) * 0.02;
      e.headG.rotation.y = Math.sin(t * 0.4 + e.ph) * 0.15;
      e.trunkG.rotation.x = Math.sin(t * 0.9 + e.ph) * 0.12;
      e.tailG.rotation.x = Math.sin(t * 1.6 + e.ph) * 0.3;
      e.ears[0].rotation.z = 0.2 + Math.sin(t * 1.1 + e.ph) * 0.15;
      e.ears[1].rotation.z = -0.2 - Math.sin(t * 1.1 + e.ph + 0.5) * 0.15;
    }
    for (const d of (worldAnims.deers || [])) {
      d.head.position.y = 3.1 + Math.sin(t * 0.8 + d.ph) * 0.15; // grazing bob
      d.group.rotation.y += Math.sin(t * 0.2 + d.ph) * 0.0005;
    }
    for (const p of (worldAnims.pandas || [])) {
      p.head.rotation.z = Math.sin(t * 0.6 + p.ph) * 0.12; // cute head tilt
      p.head.rotation.y = Math.sin(t * 0.35 + p.ph) * 0.2;
    }
    for (const k of (worldAnims.kois || [])) { // koi swim in lazy circles
      k.a += k.sp * dt;
      const x = k.cx + Math.cos(k.a) * k.rx, z = k.cz + Math.sin(k.a) * k.rz;
      k.g.position.set(x, 0.15 + Math.sin(t * 2 + k.ph) * 0.05, z);
      k.g.rotation.y = -k.a;
      k.tail.rotation.y = Math.sin(t * 6 + k.ph) * 0.4; // tail swish
    }
    for (const tu of (worldAnims.turtles || [])) { // turtles paddle slowly
      tu.head.position.y = 0.4 + Math.sin(t * 1.2 + tu.ph) * 0.08;
      tu.g.position.x = tu.hx + Math.sin(t * 0.15 + tu.ph) * 3;
      tu.g.position.z = tu.hz + Math.cos(t * 0.12 + tu.ph) * 3;
      tu.g.rotation.y += Math.sin(t * 0.1 + tu.ph) * 0.002;
    }
    // guiding leaves stream along tower → festival → lake → village
    {
      const GL = worldAnims.leaves;
      if (GL) {
        const p = GL.pts.geometry.attributes.position;
        for (let i = 0; i < GL.meta.length; i++) {
          const m = GL.meta[i];
          m.d += m.sp * dt;
          if (m.d > GL.total) { m.d -= GL.total; m.lat = (Math.random()-0.5) * 5; }
          let d = m.d, si = 0;
          while (si < GL.segLen.length - 1 && d > GL.segLen[si]) { d -= GL.segLen[si]; si++; }
          const ax = GL.route[si][0], az = GL.route[si][1];
          const dx = GL.route[si+1][0] - ax, dz = GL.route[si+1][1] - az;
          const f = d / GL.segLen[si], len = GL.segLen[si];
          const bob = Math.sin(t * 2 + m.ph) * 0.4;
          p.array[i*3]   = ax + dx * f + (-dz / len) * m.lat + Math.sin(t * 1.3 + m.ph) * 0.8;
          p.array[i*3+1] = m.y + bob;
          p.array[i*3+2] = az + dz * f + (dx / len) * m.lat + Math.cos(t * 1.1 + m.ph) * 0.8;
        }
        p.needsUpdate = true;
      }
    }
    // horse: graze cycle + tail swish + ear twitches — alive, not a statue
    {
      const h = worldAnims.horse;
      if (h) {
        h.grazeT += dt;
        const cyc = h.grazeT % 10;
        const target = cyc < 4.5 ? 0.95 : 0; // head down grazing, then up alert
        h.neckG.rotation.x += (target - h.neckG.rotation.x) * Math.min(1, dt * 1.6);
        h.tailG.rotation.x = Math.sin(t * 1.9) * 0.4;
        h.tailG.rotation.z = Math.sin(t * 1.3 + 1) * 0.25;
        h.earT -= dt;
        if (h.earT <= 0) { h.earT = 2.5 + Math.random() * 4; h.twitch = 0.4; }
        if (h.twitch > 0) {
          h.twitch -= dt;
          h.ears[1].rotation.z = Math.sin(t * 45) * 0.35;
        } else h.ears[1].rotation.z = 0;
        // weight shift: subtle body rock while grazing
        h.group.rotation.z = Math.sin(t * 0.9) * 0.015;
      }
    }
    // petals fall and swirl
    {
      const { pts, meta } = worldAnims.petals;
      const p = pts.geometry.attributes.position;
      for (let i = 0; i < meta.length; i++) {
        const m = meta[i];
        m.y -= m.fall * dt;
        if (m.y < 0.1) { m.y = 12 + Math.random() * 4; m.x = -115 + Math.random() * 230; m.z = -115 + Math.random() * 230; }
        p.array[i*3]   = m.x + Math.sin(t * 1.2 + m.ph) * m.sw;
        p.array[i*3+1] = m.y;
        p.array[i*3+2] = m.z + Math.cos(t * 0.9 + m.ph) * m.sw;
      }
      p.needsUpdate = true;
    }
    // tree canopies sway in the breeze (crown sways most)
    {
      const { canA, canB, canC, swayData, dummy } = worldAnims.swayCanopy;
      for (let i = 0; i < swayData.length; i++) {
        const s = swayData[i];
        const ox = Math.sin(t * 1.1 + s.ph) * 0.22 * s.s;
        const oz = Math.cos(t * 0.9 + s.ph) * 0.18 * s.s;
        dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(s.s);
        dummy.position.set(s.x + ox, 4.6 * s.s, s.z + oz); dummy.updateMatrix();
        canA.setMatrixAt(i, dummy.matrix);
        dummy.position.set(s.x + 0.9 * s.s + ox * 1.3, 6.3 * s.s, s.z - 0.5 * s.s + oz * 1.3); dummy.updateMatrix();
        canB.setMatrixAt(i, dummy.matrix);
        dummy.position.set(s.x - 0.5 * s.s + ox * 1.7, 7.7 * s.s, s.z + 0.4 * s.s + oz * 1.7); dummy.updateMatrix();
        canC.setMatrixAt(i, dummy.matrix);
      }
      canA.instanceMatrix.needsUpdate = true;
      canB.instanceMatrix.needsUpdate = true;
      canC.instanceMatrix.needsUpdate = true;
    }
    // waterfall flows
    if (worldAnims.waterfallTex) worldAnims.waterfallTex.offset.y -= dt * 0.9;
    // mist drifts
    for (const m of worldAnims.mist) {
      m.s.position.x = m.bx + Math.sin(t * 0.25 + m.ph) * 3;
      m.s.material.opacity = 0.1 + Math.sin(t * 0.5 + m.ph) * 0.05;
    }
    // lake reflection streaks shimmer + ripple drift
    for (const s of worldAnims.streaks) {
      s.m.material.opacity = 0.45 + Math.sin(t * 1.8 + s.ph) * 0.25;
    }
    if (worldAnims.rippleTex) { worldAnims.rippleTex.offset.x = t * 0.02; worldAnims.rippleTex.offset.y = Math.sin(t * 0.4) * 0.05; }
    // second ripple layer drifts against the first; the moonlight road breathes
    if (worldAnims.rippleTex2) { worldAnims.rippleTex2.offset.x = -t * 0.013; worldAnims.rippleTex2.offset.y = Math.cos(t * 0.3) * 0.06; }
    if (worldAnims.moonPath) worldAnims.moonPath.material.opacity = 0.42 + Math.sin(t * 0.9) * 0.1;
    // lantern flicker: warm candle-like breathing on every lantern halo + pool
    for (const f of worldAnims.flicker) {
      const fl = 0.9 + 0.1 * Math.sin(t * 9 + f.ph) * Math.sin(t * 5.3 + f.ph * 1.7);
      f.glow.material.opacity = f.gb * fl;
      if (f.pool) f.pool.material.opacity = f.pb * (0.92 + 0.08 * Math.sin(t * 7 + f.ph));
    }
    // bunting flags flutter
    for (const f of worldAnims.flags) {
      f.m.rotation.x = Math.sin(t * 2.4 + f.ph) * 0.3;
      f.m.rotation.y = Math.cos(t * 1.7 + f.ph) * 0.25;
    }
    // water shimmer
    const sh = 0.78 + Math.sin(t * 1.4) * 0.06;
    lakeMesh.material.opacity = sh; pondMesh.material.opacity = sh;
    // dancers: bounce + sway (a real celebration)
    dancers.forEach((g) => {
      const ph = g.userData.phase;
      g.position.y = Math.abs(Math.sin(t * 3.2 + ph)) * 0.5;
      g.rotation.z = Math.sin(t * 3.2 + ph) * 0.14;
      g.rotation.y += Math.sin(t * 1.1 + ph) * 0.01;
    });
    // boat bobs gently at the dock when not riding
    if (!boat.riding) {
      boat.group.position.y = 0.35 + Math.sin(t * 1.8) * 0.07;
      boat.group.rotation.z = Math.sin(t * 1.3) * 0.035;
    }
  }

  function zoneAt(x, z) {
    let best = null, bd = 1e9;
    for (const zn of ZONES) {
      const d = Math.hypot(x - zn.x, z - zn.z);
      if (d < zn.r && d < bd) { bd = d; best = zn; }
    }
    return best;
  }

  return { colliders, waters, dockRect, boat, zoneAt, update, sun,
           setLanternBoost: (b) => { worldAnims.lanternBoost = b; },
           lanternDebug: () => worldAnims.lanterns ? worldAnims.lanterns.data.slice(0, 8).map((L) => ({ x: +L.x.toFixed(1), y: +L.y.toFixed(1), z: +L.z.toFixed(1), home: L.home, maxY: L.maxY })) : null };
}
