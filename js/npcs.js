// NPCs: named hint-givers, village wanderers, tavern thugs, rabbits, birds,
// and the chameleon companion (hot/cold clue helper).

import * as THREE from "three";

const FLAVOR = [
  "Lovely evening for lanterns, no?",
  "The valley hides so many memories…",
  "Have you tried the tavern stew? Divine!",
  "I heard the festival will be the grandest yet.",
  "Watch the lake at dusk — it remembers things.",
];

function personMesh(bodyColor, scale = 1, seated = false) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });
  const bodyH = seated ? 0.9 : 1.5;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.58, bodyH, 8), mat(bodyColor));
  body.position.y = (seated ? 0.55 : 0.95) * 1; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), mat(0xe8b88a));
  head.position.y = (seated ? 1.25 : 2.0); g.add(head);
  // hair cap
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8, 0, Math.PI * 2, 0, 1.4),
    mat([0x3a2a1a, 0x6a4a2a, 0x8a8a8a, 0x2a1a2a][Math.floor(Math.random() * 4)]));
  hair.position.y = head.position.y + 0.06; g.add(hair);
  g.scale.setScalar(scale);
  return { group: g, headY: head.position.y * scale + 0.5 };
}

const NAMED = [
  { name: "Maro the traveler", x: 8, z: -84, clueId: 3, color: 0x4a9a8a,
    hint: "They say golden sparkles hide behind the tower stairs… keep looking around here." },
  { name: "Bram the thug", x: 80, z: 40, clueId: 12, color: 0x8a4a3a, seated: true,
    hint: "A rain barrel out back? I hid nothin', I swear! …Or did I? Go see." },
  { name: "Old Tom", x: 98, z: 40, clueId: 14, color: 0x6a6a8a, seated: true,
    hint: "Somethin' shiny under the bench where I nap. Don't tell the others." },
  { name: "Mira", x: -8, z: 84, clueId: 17, color: 0xc9566c,
    hint: "The old well keeps secrets behind it. I saw sparkles there at dusk." },
  { name: "Sella the baker", x: 10, z: 98, clueId: 19, color: 0xd8a05a,
    hint: "Check under my market stall — mind the pies, they're hot!" },
  { name: "Pip", x: 5, z: 80, clueId: 21, color: 0x6a9fd8, scale: 0.7,
    hint: "I saw sparkles by the flower cart! Shiny shiny!" },
  { name: "Elder Asha", x: -10, z: 88, clueId: 23, color: 0x9a6ad8,
    hint: "The festival stage holds the greatest treasure of all. You'll see." },
  { name: "Dev the fisher", x: -50, z: 16, clueId: 25, color: 0x4a7a9a,
    hint: "The lake shows memories in its reflection. And the old boat? It remembers too." },
];

export function buildNPCs(scene) {
  const npcs = [];
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });

  // named hint-givers
  for (const def of NAMED) {
    const { group, headY } = personMesh(def.color, def.scale || 1, def.seated);
    group.position.set(def.x, 0, def.z);
    scene.add(group);
    npcs.push({ ...def, kind: "named", group, headY, phase: Math.random() * 6,
      flavor: "The valley is full of memories — keep exploring!" });
  }

  // village wanderers
  const wanderCols = [0x7fbf6a, 0xd86a9a, 0x6a9fd8, 0xd8c05a, 0x9a6ad8, 0x5ab8a8, 0xc97a4a, 0x8a9a5a,
                      0xd84a6a, 0x4ad8c8, 0x8a6ad8, 0xd8a04a, 0x6ad88a, 0xc86a9a, 0x9ad84a, 0x5a8ad8];
  for (let i = 0; i < 16; i++) {
    const { group, headY } = personMesh(wanderCols[i]);
    const x = -22 + Math.random() * 44, z = 76 + Math.random() * 30;
    group.position.set(x, 0, z);
    scene.add(group);
    npcs.push({ name: "Villager", kind: "wanderer", group, headY,
      flavor: FLAVOR[i % FLAVOR.length], phase: Math.random() * 6,
      wp: { x: -22 + Math.random() * 44, z: 76 + Math.random() * 30 }, wait: 0 });
  }

  // extra tavern thugs (seated, generic)
  const thugSpots = [[76.5, 51.5, 0x7a5a2a], [79.5, 48.5, 0x5a7a3a], [82.5, 59.5, 0x3a6a8a], [85.5, 56.5, 0x8a3a5a]];
  const thugs = [];
  for (const [x, z, c] of thugSpots) {
    const { group, headY } = personMesh(c, 1.25, true);
    group.position.set(x, 0, z);
    group.rotation.y = Math.atan2(78 - x, 50 - z);
    scene.add(group);
    thugs.push({ group, phase: Math.random() * 6, headY });
    npcs.push({ name: "Thug", kind: "thug", group, headY, flavor: "We dream big dreams at the Snuggly Duckling!", phase: Math.random() * 6 });
  }

  // rabbits (forest hoppers)
  const rabbits = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 7), mat(0xd8cfc0));
    body.scale.set(1, 0.85, 1.25); body.position.y = 0.4; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 7), mat(0xd8cfc0));
    head.position.set(0, 0.75, 0.4); g.add(head);
    [[-0.12], [0.12]].forEach(([ex]) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 5), mat(0xc8bfb0));
      ear.position.set(ex, 1.1, 0.4); g.add(ear);
    });
    const x = 60 + Math.random() * 40, z = -60 + Math.random() * 40;
    g.position.set(x, 0, z);
    scene.add(g);
    rabbits.push({ group: g, hx: x, hz: z, tx: x, tz: z, hop: Math.random() * 6, wait: Math.random() * 2 });
  }

  // birds circling overhead
  const birds = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group();
    const wingM = new THREE.MeshBasicMaterial({ color: 0xf7ecd4, side: THREE.DoubleSide });
    const wl = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.4), wingM);
    const wr = wl.clone(); wl.position.x = -0.55; wr.position.x = 0.55; g.add(wl, wr);
    scene.add(g);
    birds.push({ group: g, wl, wr, cx: -20 + i * 30, cz: -20 + (i % 2) * 60, r: 14 + i * 3, h: 16 + i * 1.5, a: Math.random() * 6, sp: 0.5 + Math.random() * 0.3 });
  }

  // chameleon companion — follows the player, hops when excited
  const chameleon = (() => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 7), mat(0x5fbf5a));
    body.scale.set(1, 0.8, 1.4); body.position.y = 0.35; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 7), mat(0x5fbf5a));
    head.position.set(0, 0.5, 0.42); g.add(head);
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.08, 6, 10, Math.PI * 1.5), mat(0x4aa84a));
    tail.position.set(0, 0.3, -0.45); g.add(tail);
    [[-0.14, 1], [0.14, 1], [-0.14, -1], [0.14, -1]].forEach(([ex, ez]) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), mat(0xffffff));
      eye.position.set(ex, 0.58, 0.42 + ez * 0.1); g.add(eye);
    });
    // "!" + sparkle shown when it senses a hidden clue nearby
    const exc = document.createElement("canvas"); exc.width = exc.height = 64;
    {
      const c2 = exc.getContext("2d");
      c2.font = "bold 46px Georgia"; c2.textAlign = "center"; c2.textBaseline = "middle";
      c2.lineWidth = 9; c2.strokeStyle = "#7a4a00"; c2.strokeText("!", 32, 34);
      c2.fillStyle = "#ffe98a"; c2.fillText("!", 32, 34);
    }
    const exTex = new THREE.CanvasTexture(exc); exTex.colorSpace = THREE.SRGBColorSpace;
    const exclaim = new THREE.Sprite(new THREE.SpriteMaterial({ map: exTex, transparent: true, depthWrite: false }));
    exclaim.scale.setScalar(1.1); exclaim.position.y = 1.7; exclaim.visible = false; g.add(exclaim);
    const spc = document.createElement("canvas"); spc.width = spc.height = 64;
    {
      const c2 = spc.getContext("2d");
      const gr = c2.createRadialGradient(32, 32, 2, 32, 32, 30);
      gr.addColorStop(0, "rgba(255,250,200,1)"); gr.addColorStop(1, "rgba(255,200,90,0)");
      c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64);
    }
    const spTex = new THREE.CanvasTexture(spc); spTex.colorSpace = THREE.SRGBColorSpace;
    const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: spTex, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
    spark.scale.setScalar(1.6); spark.position.y = 0.7; spark.visible = false; g.add(spark);
    g.position.set(2, 0, -80);
    scene.add(g);
    return { group: g, excited: false, hop: 0, exclaim, spark };
  })();

  function facePlayer(n, dt, playerPos, maxD) {
    const dx = playerPos.x - n.group.position.x, dz = playerPos.z - n.group.position.z;
    if (Math.hypot(dx, dz) > maxD) return;
    const target = Math.atan2(dx, dz);
    let diff = target - n.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    n.group.rotation.y += diff * Math.min(1, dt * 6);
  }

  function update(dt, t, playerPos) {
    // named: gentle sway
    for (const n of npcs) {
      if (n.kind === "named" || n.kind === "thug") {
        if (n.kind === "thug") {
          // mid-song: hearty rocking side to side
          n.group.position.y = Math.abs(Math.sin(t * 2.6 + n.phase)) * 0.22;
          n.group.rotation.z = Math.sin(t * 2.6 + n.phase) * 0.1;
        } else {
          n.group.position.y = Math.abs(Math.sin(t * 2.2 + n.phase)) * 0.06;
          n.group.rotation.y += Math.sin(t * 0.6 + n.phase) * 0.002;
        }
        facePlayer(n, dt, playerPos, 9); // turn to greet her when she's near
      } else if (n.kind === "wanderer") {
        // stroll between waypoints
        const dx = n.wp.x - n.group.position.x, dz = n.wp.z - n.group.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 1) {
          n.wait += dt;
          facePlayer(n, dt, playerPos, 9); // chat while waiting
          if (n.wait > 2 + (n.phase % 2)) {
            n.wp = { x: -22 + Math.random() * 44, z: 76 + Math.random() * 30 }; n.wait = 0;
          }
        } else {
          n.group.position.x += (dx / d) * 1.6 * dt;
          n.group.position.z += (dz / d) * 1.6 * dt;
          n.group.rotation.y = Math.atan2(dx, dz);
          n.group.position.y = Math.abs(Math.sin(t * 8)) * 0.08;
        }
      }
    }
    // rabbits hop
    for (const r of rabbits) {
      const dx = r.tx - r.group.position.x, dz = r.tz - r.group.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.8) {
        r.wait += dt;
        if (r.wait > 1.5 + (r.hop % 1.5)) {
          r.tx = r.hx + (Math.random() - 0.5) * 22; r.tz = r.hz + (Math.random() - 0.5) * 22; r.wait = 0;
        }
      } else {
        r.hop += dt * 9;
        r.group.position.x += (dx / d) * 3.2 * dt;
        r.group.position.z += (dz / d) * 3.2 * dt;
        r.group.position.y = Math.abs(Math.sin(r.hop)) * 0.45;
        r.group.rotation.y = Math.atan2(dx, dz);
      }
    }
    // birds
    for (const b of birds) {
      b.a += dt * b.sp;
      const x = b.cx + Math.cos(b.a) * b.r, z = b.cz + Math.sin(b.a) * b.r;
      b.group.position.set(x, b.h + Math.sin(t + b.a) * 0.8, z);
      b.group.rotation.y = -b.a;
      const flap = Math.sin(t * 10 + b.a) * 0.6;
      b.wl.rotation.y = flap; b.wr.rotation.y = -flap;
    }
    // chameleon follows + hops when excited (obvious hot/cold helper)
    {
      const c = chameleon.group;
      const tx = playerPos.x - 1.6, tz = playerPos.z + 1.2;
      const dx = tx - c.position.x, dz = tz - c.position.z, d = Math.hypot(dx, dz);
      if (d > 0.6) {
        const sp = chameleon.excited ? 9 : 5;
        c.position.x += (dx / d) * Math.min(sp * dt, d);
        c.position.z += (dz / d) * Math.min(sp * dt, d);
        c.rotation.y = Math.atan2(dx, dz);
      }
      chameleon.hop += dt * (chameleon.excited ? 15 : 6);
      const exc = chameleon.excited;
      c.position.y = Math.abs(Math.sin(chameleon.hop)) * (exc ? 0.7 : 0.12);
      const pulse = exc ? 1 + Math.sin(t * 9) * 0.12 : 1;
      c.scale.setScalar(pulse);
      chameleon.exclaim.visible = exc;
      chameleon.spark.visible = exc;
      if (exc) {
        chameleon.exclaim.position.y = 1.7 + Math.sin(t * 7) * 0.14;
        chameleon.spark.material.opacity = 0.5 + Math.sin(t * 11) * 0.4;
        chameleon.spark.scale.setScalar(1.3 + Math.sin(t * 11) * 0.5);
      }
    }
  }

  return { npcs, chameleon, update };
}
