// main.js — boot, game loop, clue discovery, interaction, boat ride, debug.

import * as THREE from "three";
import { CONFIG, DEBUG } from "./config.js?v=20261011c";
import { CLUES } from "./clues.js?v=20261011c";
import { buildWorld, ZONES } from "./world.js?v=20261011c";
import { Player } from "./player.js?v=20261011c";
import { buildNPCs } from "./npcs.js?v=20261011c";
import { UI } from "./ui.js?v=20261011c";

// ---------- renderer / scene ----------
const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 700);

// widen the lens on narrow portrait phones so tall landmarks (her tower)
// and the horizon stay in frame — desktop keeps the tighter diorama look
const fitCamera = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = camera.aspect < 1 ? Math.min(60, 48 + (1 - camera.aspect) * 24) : 48;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};
fitCamera();

window.addEventListener("resize", fitCamera);

// ---------- world, player, npcs ----------
const world = buildWorld(scene);
const player = new Player(scene, world);
camera.position.set(CONFIG.SPAWN.x, 15.5, CONFIG.SPAWN.z + 14.5);
const { npcs, chameleon, update: updateNPCs } = buildNPCs(scene);

// soft diorama shadows: solid meshes cast, transparent ones don't
scene.traverse((o) => {
  if (!o.isMesh) return;
  const transparent = o.material && o.material.transparent;
  o.castShadow = !transparent;
  o.receiveShadow = true;
});

const project = (x, y, z) => {
  const v = new THREE.Vector3(x, y, z).project(camera);
  return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
};

// ---------- clue markers ----------
function sparkleTexture(inner = "rgba(255,240,180,1)", outer = "rgba(255,180,60,0)") {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const sparkTex = sparkleTexture();
const sparkTexBig = sparkleTexture("rgba(255,250,210,1)", "rgba(255,190,80,0)");

// (the chameleon companion carries its own excited "!" + sparkle when it
// senses a hidden memory nearby — the guide, not game chrome)

function makeCritter(kind) {
  const g = new THREE.Group();
  const m = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
  if (kind === "rabbit") {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 7), m(0xe8dcc8));
    b.scale.set(1, 0.85, 1.25); b.position.y = 0.38; g.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 7), m(0xe8dcc8));
    h.position.set(0, 0.72, 0.38); g.add(h);
    [-0.11, 0.11].forEach((ex) => {
      const e = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 5), m(0xd8cbb8));
      e.position.set(ex, 1.05, 0.38); g.add(e);
    });
  } else if (kind === "chameleon") {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 7), m(0x5fbf5a));
    b.scale.set(1, 0.8, 1.4); b.position.y = 0.34; g.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 7), m(0x5fbf5a));
    h.position.set(0, 0.5, 0.4); g.add(h);
  } else { // duck
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 7), m(0xf7f2e8));
    b.scale.set(1, 0.85, 1.3); b.position.y = 0.36; g.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 7), m(0xf7f2e8));
    h.position.set(0, 0.72, 0.35); g.add(h);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 6), m(0xf0a030));
    beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.7, 0.62); g.add(beak);
  }
  return g;
}

// marker per clue; villagers use their NPC instead
const clueMarkers = new Map(); // id -> {group, clue}
const hitMeshes = [];
for (const clue of CLUES) {
  const g = new THREE.Group();
  g.position.set(clue.x, 0, clue.z);
  if (clue.kind === "hidden" || clue.kind === "boat") {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sparkTex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.85 }));
    s.scale.setScalar(clue.kind === "boat" ? 2.2 : 1.4);
    s.position.y = 1.2; g.add(s); g.userData.spark = s;
  } else if (clue.kind === "reflection") {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.5, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; g.add(ring); g.userData.ring = ring;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
    s.scale.setScalar(2.4); s.position.y = 0.6; g.add(s); g.userData.spark = s;
  } else if (clue.kind === "animal") {
    const crit = makeCritter(clue.critter || "rabbit");
    g.add(crit); g.userData.crit = crit;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 }));
    s.scale.setScalar(1.1); s.position.y = 1.1; g.add(s); g.userData.spark = s;
  } else if (clue.kind === "finale") {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 7, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.y = 3.5; g.add(beam); g.userData.beam = beam;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexBig, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(3.2); s.position.y = 2; g.add(s); g.userData.spark = s;
  }
  if (clue.kind !== "villager") {
    g.userData.interact = { kind: "clue", clue };
    scene.add(g); hitMeshes.push(g);
    clueMarkers.set(clue.id, { group: g, clue });
  }
}

// NPC hitboxes for interaction
for (const n of npcs) {
  if (n.kind === "named" || n.kind === "wanderer" || n.kind === "thug") {
    n.group.userData.interact = { kind: "npc", npc: n };
    hitMeshes.push(n.group);
  }
}
world.boat.group.userData.interact = { kind: "boat" };
hitMeshes.push(world.boat.group);

// debug markers
if (DEBUG) {
  for (const clue of CLUES) {
    const mk = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff3333, wireframe: true }));
    mk.position.set(clue.x, 2.5, clue.z);
    mk.userData.debugId = clue.id;
    scene.add(mk);
  }
  console.table(CLUES.map((c) => ({ id: c.id, zone: c.zone, kind: c.kind, x: c.x, z: c.z, photo: c.photo || "—" })));
  console.log("%cdebug: keys 1-6 teleport to zones", "color: gold");
}

// ---------- discovery ----------
const found = new Set();
let modalOpen = false;
let currentZoneId = null;

function discover(clue) {
  if (found.has(clue.id) || modalOpen) return;
  found.add(clue.id);
  UI.setCounter(found.size);
  modalOpen = true;
  const marker = clueMarkers.get(clue.id);
  if (marker) marker.group.visible = false;
  if (DEBUG) console.log(`found clue ${clue.id} (${clue.kind})`);
  if (clue.kind === "finale") {
    UI.fanfare();
    setTimeout(() => UI.finaleModal(clue.photo, CONFIG.FINAL_MESSAGE), 350);
  } else {
    UI.chime();
    setTimeout(() => UI.photoModal(clue), 350);
  }
}
UI.onModalClose = () => { modalOpen = false; };

function npcHeadWorld(n) {
  return { x: n.group.position.x, y: n.group.position.y + n.headY + 0.6, z: n.group.position.z };
}

function interactWith(target) {
  const p = player.group.position;
  if (target.kind === "boat") { tapBoat(); return; }
  if (target.kind === "npc") {
    const n = target.npc;
    const d = Math.hypot(p.x - n.group.position.x, p.z - n.group.position.z);
    if (d > CONFIG.INTERACT_RADIUS + 2) return;
    UI.blip();
    if (n.kind === "named") {
      const clue = CLUES.find((c) => c.id === n.clueId);
      const hw = npcHeadWorld(n);
      if (clue && !found.has(clue.id)) {
        UI.dialogue(n.name, n.hint, hw.x, hw.y, hw.z);
        setTimeout(() => discover(clue), 1700);
      } else {
        UI.dialogue(n.name, n.flavor, hw.x, hw.y, hw.z);
      }
    } else {
      const hw = npcHeadWorld(n);
      UI.dialogue(n.name, n.flavor, hw.x, hw.y, hw.z);
    }
    return;
  }
  if (target.kind === "clue") {
    const clue = target.clue;
    const d = Math.hypot(p.x - clue.x, p.z - clue.z);
    if (d > CONFIG.INTERACT_RADIUS) return;
    UI.blip();
    discover(clue);
  }
}

// ---------- boat ride ----------
function tapBoat() {
  const clue26 = CLUES.find((c) => c.id === 26);
  if (!found.has(26)) { discover(clue26); return; }
  if (world.boat.riding || modalOpen) return;
  UI.blip();
  world.boat.riding = true;
  world.boat.t = 0;
  player.riding = true;
  // from/to endpoints are maintained by updateBoat on arrival (ping-pong)
  UI.banner(world.boat.to.z > 30 ? "Across the lake…" : "Back to the dock…");
}
function updateBoat(dt) {
  const b = world.boat;
  if (!b.riding) return;
  b.t += dt / CONFIG.BOAT_RIDE_TIME;
  const k = Math.min(1, b.t);
  const e = k * k * (3 - 2 * k); // smoothstep
  b.group.position.lerpVectors(b.from, b.to, e);
  b.group.position.y = 0.35 + Math.sin(e * Math.PI * 6) * 0.08;
  b.group.rotation.y = Math.atan2(b.to.x - b.from.x, b.to.z - b.from.z);
  player.group.position.set(b.group.position.x, 0.9, b.group.position.z);
  if (k >= 1) {
    b.riding = false;
    player.riding = false;
    player.group.position.set(b.to.x, 0, b.to.z + 2.5);
    // keep endpoints as-arrived for the next tap (ping-pong handled at tap)
    const arrived = b.to.clone();
    b.from.copy(arrived);
    // recompute the "other side": dock vs far shore
    if (Math.abs(arrived.x + 62) < 1 && Math.abs(arrived.z - 20) < 1) {
      b.to.set(-80, 0.35, 44);
    } else {
      b.to.set(-62, 0.35, 20);
    }
  }
}

// ---------- input: tap + keys ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downInfo = null;
canvas.addEventListener("pointerdown", (e) => { downInfo = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener("pointerup", (e) => {
  if (!downInfo) return;
  const moved = Math.hypot(e.clientX - downInfo.x, e.clientY - downInfo.y);
  const dt = performance.now() - downInfo.t;
  downInfo = null;
  if (moved > 14 || dt > 600 || modalOpen) return;
  pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(hitMeshes, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.interact) o = o.parent;
    if (o) { interactWith(o.userData.interact); return; }
  }
});

const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "KeyE" && !modalOpen) {
    // discover nearest in-range undiscovered clue
    const p = player.group.position;
    let best = null, bd = 1e9;
    for (const clue of CLUES) {
      if (found.has(clue.id)) continue;
      const d = Math.hypot(p.x - clue.x, p.z - clue.z);
      if (d < CONFIG.INTERACT_RADIUS && d < bd) { bd = d; best = { kind: "clue", clue }; }
    }
    if (best) interactWith(best);
  }
  if (DEBUG && /^Digit[1-6]$/.test(e.code)) {
    const zn = ZONES[+e.code.slice(5) - 1];
    player.teleport(zn.x, zn.z);
    console.log("teleported to", zn.name);
  }
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });

function keyVector() {
  let x = 0, z = 0;
  if (keys.KeyW || keys.ArrowUp) z -= 1;
  if (keys.KeyS || keys.ArrowDown) z += 1;
  if (keys.KeyA || keys.ArrowLeft) x -= 1;
  if (keys.KeyD || keys.ArrowRight) x += 1;
  return { x, z };
}

// ---------- UI ----------
UI.init();
UI.onBegin = () => { /* world already running behind overlay */ };

if (DEBUG) {
  window.__game = {
    player, found, discover, CLUES,
    teleport: (x, z) => player.teleport(x, z),
    rideBoat: () => tapBoat(),
    chameleonExcited: () => chameleon.excited,
    boatRiding: () => world.boat.riding,
    zoneAt: (x, z) => { const zn = world.zoneAt(x, z); return zn ? zn.id + " / " + zn.name : "valley"; },
    bannerText: () => document.getElementById("zone-banner").textContent,
  };
}

// ---------- game loop ----------
const clock = new THREE.Clock();
let zoneCheckT = 0;

function nearestUndiscovered(p, maxD) {
  let best = null, bd = 1e9;
  for (const clue of CLUES) {
    if (found.has(clue.id)) continue;
    const d = Math.hypot(p.x - clue.x, p.z - clue.z);
    if (d < maxD && d < bd) { bd = d; best = clue; }
  }
  return best ? { clue: best, d: bd } : null;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // input
  const kv = keyVector();
  const jx = UI.joystick.x + kv.x, jz = UI.joystick.y + kv.z;
  player.setInput(jx, jz);

  player.update(dt);
  updateBoat(dt);
  world.update(dt, t);
  updateNPCs(dt, t, player.group.position);
  player.updateCamera(camera, dt);

  // clue marker idle animation
  for (const { group } of clueMarkers.values()) {
    if (!group.visible) continue;
    const u = group.userData;
    if (u.spark) { u.spark.material.opacity = 0.55 + Math.sin(t * 3 + group.position.x) * 0.3; }
    if (u.ring) { const s = 1 + Math.sin(t * 2.2) * 0.18; u.ring.scale.set(s, s, 1); }
    if (u.beam) { u.beam.rotation.y = t * 0.6; }
    if (u.crit) { u.crit.position.y = Math.abs(Math.sin(t * 4)) * 0.15; u.crit.rotation.y = Math.sin(t * 0.8) * 0.6; }
  }

  // chameleon hot/cold — its own excited hops + sparkle guide her
  const p = player.group.position;
  const sense = nearestUndiscovered(p, CONFIG.CHAMELEON_SENSE);
  chameleon.excited = !!sense;

  // keep the sun's shadow camera centered on her as she roams
  world.sun.position.set(p.x - 40, 55, p.z + 30);
  world.sun.target.position.set(p.x, 0, p.z);

  // zone banner
  zoneCheckT += dt;
  if (zoneCheckT > 0.4) {
    zoneCheckT = 0;
    const zn = world.zoneAt(p.x, p.z);
    const zid = zn ? zn.id : "valley";
    if (zid !== currentZoneId) {
      currentZoneId = zid;
      UI.banner(zn ? zn.name : "The Valley");
    }
  }

  UI.updateDialogue(dt, project);
  if (UI.isMapOpen()) UI.drawMap(ZONES, CLUES, found, p.x, p.z);
  renderer.render(scene, camera);
}
animate();
