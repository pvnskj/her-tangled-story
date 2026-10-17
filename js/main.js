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
window.__player = player; // for camera toggle button
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
    // golden ring ON THE GROUND — walk into it!
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.15; g.add(ring); g.userData.ring = ring;
    // vertical light beam — visible in ALL 3 camera modes, even through tall grass!
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 9, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.28,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    beam.position.y = 4.5; g.add(beam); g.userData.beam = beam;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sparkTex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.85 }));
    s.scale.setScalar(clue.kind === "boat" ? 2.2 : 1.4);
    s.position.y = 1.2; g.add(s); g.userData.spark = s;
    // invisible fat hit sphere — easy to tap on a phone
    const hit = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6),
      new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 1.2; g.add(hit);
  } else if (clue.kind === "reflection") {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.5, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; g.add(ring); g.userData.ring = ring;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
    s.scale.setScalar(2.4); s.position.y = 0.6; g.add(s); g.userData.spark = s;
    // invisible fat hit disc — easy to tap on a phone
    const hit = new THREE.Mesh(new THREE.CircleGeometry(3, 12),
      new THREE.MeshBasicMaterial({ visible: false }));
    hit.rotation.x = -Math.PI / 2; hit.position.y = 0.3; g.add(hit);
  } else if (clue.kind === "animal") {
    const crit = makeCritter(clue.critter || "rabbit");
    g.add(crit); g.userData.crit = crit;
    // golden ring on the ground — walk into it!
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.15; g.add(ring); g.userData.ring = ring;
    // vertical light beam — visible in ALL camera modes!
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 9, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.28,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    beam.position.y = 4.5; g.add(beam); g.userData.beam = beam;
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
    // generous invisible tap target — phone taps are fiddly, meshes are thin
    const hit = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 3.8, 6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hit.position.y = 1.9;
    n.group.add(hit);
    hitMeshes.push(n.group);
  }
}
const found = new Set();
refreshMarkers(); // show only clue 1 at the start (found is defined above)
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
let modalOpen = false;
let currentZoneId = null;

// SEQUENTIAL REVEAL: only the next undiscovered clue's marker is visible
function refreshMarkers() {
  const nextId = CLUES.find((c) => !found.has(c.id))?.id;
  for (const [id, { group }] of clueMarkers) {
    group.visible = (id === nextId);
  }
}

// guidance: what to show in the guide box for the next undiscovered clue
const GUIDES = {
  1: "🦎 Follow the chameleon! It's excited about something behind the tower, by the rocks…",
  2: "👣 Follow the footprints from the rocks!",
  3: "🗣️ Find Maro the traveler — he wanders near the tower.",
  4: "✨ Check the open field by the tower.",
  5: "🐇 Follow the rabbit!",
  6: "✨ Into the forest — look for sparkles in the clearing.",
};
function updateGuide() {
  const next = CLUES.find((c) => !found.has(c.id));
  if (!next) { UI.setGuide(null); return; }
  UI.setGuide(GUIDES[next.id] || `✨ Find memory ${next.id} of 33 — explore the ${next.zone}!`);
}

async function discover(clue) {
  if (found.has(clue.id) || modalOpen) return;
  modalOpen = true;
  // Clue 1: fill in the blank — "I'm a T__DLER"
  if (clue.id === 1) {
    const ok = await UI.riddleModal("I'm a T__DLER", "OD");
    if (!ok) { modalOpen = false; return; }
  }
  // Clue 2: multiple choice — "What am I?" (any answer works!)
  if (clue.id === 2 && clue.riddle) {
    await UI.riddleModal(clue.riddle.prompt, clue.riddle.options);
  }
  found.add(clue.id);
  UI.setCounter(found.size);
  updateGuide();
  refreshMarkers(); // reveal the next clue's marker, hide the found one
  if (DEBUG) console.log(`found clue ${clue.id} (${clue.kind})`);
  if (clue.kind === "finale") {
    UI.fanfare();
    world.releaseLanterns(); // the sky fills with lanterns — the Tangled moment!
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
      const nextId = CLUES.find((c) => !found.has(c.id))?.id;
      if (clue && !found.has(clue.id) && clue.id === nextId) {
        // it's their turn in the story — give the hint and the clue
        UI.dialogue(n.name, n.hint, hw.x, hw.y, hw.z);
        setTimeout(() => discover(clue), 1700);
      } else if (clue && !found.has(clue.id)) {
        // not yet — tease the story without spoiling
        UI.dialogue(n.name, "Keep following your heart — your story is still unfolding…", hw.x, hw.y, hw.z);
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
    const nextId = CLUES.find((c) => !found.has(c.id))?.id;
    if (clue.id !== nextId) return; // only the story's next clue matters
    const d = Math.hypot(p.x - clue.x, p.z - clue.z);
    if (d < 2.0) {
      UI.blip();
      discover(clue);
    }
    // (far taps do nothing — tap the guide text up top for walkthrough mode)
  }
}

// ---------- boat ride (free rowing on the lake) ----------
const BOAT_PARK = { x: -50, z: 15 }; // beside the pier, visible on approach
function boatNearShore() {
  const b = world.boat.group.position;
  if (Math.hypot(b.x - BOAT_PARK.x, b.z - BOAT_PARK.z) < 8) return true;
  const w = world.waters[0]; // the lake ellipse
  const nx = (b.x - w.x) / w.rx, nz = (b.z - w.z) / w.rz;
  return (nx * nx + nz * nz) > 0.70; // close to the water's rim
}
function tapBoat() {
  const clue26 = CLUES.find((c) => c.id === 26);
  if (!found.has(26)) { discover(clue26); return; }
  if (modalOpen) return;
  const p = player.group.position, b = world.boat.group.position;
  if (!player.riding) {
    if (Math.hypot(p.x - b.x, p.z - b.z) > 9) return;
    UI.blip();
    player.riding = true; world.boat.riding = true;
    player.sprite.position.y = 1.0; // seated in the hull
    UI.banner("Rowing the lake ⛵ — hop out near the shore");
  } else if (boatNearShore()) {
    UI.blip();
    player.riding = false; world.boat.riding = false;
    player.sprite.position.y = 1.8;
    // step onto the nearest dry land: just outside the lake ellipse
    const w = world.waters[0];
    let nx = (b.x - w.x) / w.rx, nz = (b.z - w.z) / w.rz;
    const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
    player.group.position.set(w.x + nx * (w.rx + 2.4), 0, w.z + nz * (w.rz + 2.4));
    player.svel.set(0, 0, 0);
    UI.banner("Back on dry land ✨");
  }
}
function updateBoat(dt, t) {
  const b = world.boat;
  if (!b.riding) return;
  let ix = player.moveVec.x, iz = player.moveVec.z;
  // in first-person, boat steers relative to view (like walking)
  if (player.camMode === 'first') {
    const sinY = Math.sin(player.fpYaw), cosY = Math.cos(player.fpYaw);
    const rx = (-iz) * sinY + ix * (-cosY);
    const rz = (-iz) * cosY + ix * sinY;
    ix = rx; iz = rz;
  }
  const len = Math.hypot(ix, iz);
  const sp = 6.0 * Math.min(1, len); // gentle rowing pace, not twitchy
  if (len > 0.08) { // deadzone so it doesn't drift
    const nx = ix / Math.max(1, len), nz = iz / Math.max(1, len);
    b.group.position.x += nx * sp * dt;
    b.group.position.z += nz * sp * dt;
    const targetRot = Math.atan2(nx, nz);
    let dr = targetRot - b.group.rotation.y;
    while (dr > Math.PI) dr -= Math.PI * 2;
    while (dr < -Math.PI) dr += Math.PI * 2;
    b.group.rotation.y += dr * Math.min(1, dt * 3.5); // smooth turn, not snap
  }
  // stay on the lake: clamp inside the ellipse with a small margin
  const w = world.waters[0];
  const ex = (b.group.position.x - w.x) / (w.rx - 2.5), ez = (b.group.position.z - w.z) / (w.rz - 2.5);
  const e2 = ex * ex + ez * ez;
  if (e2 > 1) {
    const l = Math.sqrt(e2);
    b.group.position.x = w.x + (ex / l) * (w.rx - 2.5);
    b.group.position.z = w.z + (ez / l) * (w.rz - 2.5);
  }
  b.group.position.y = 0.35 + Math.sin(t * 2.2) * 0.09;
  b.group.rotation.z = Math.sin(t * 1.6) * 0.03;
  player.group.position.set(b.group.position.x, 0.9, b.group.position.z);
}

// ---------- input: tap + keys ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downInfo = null;
// drag-to-look: pointer drag anywhere on the canvas (joystick is a separate
// element, so it never reaches here) orbits/pitches the follow camera
let lookDrag = false, lastLX = 0, lastLY = 0;
canvas.addEventListener("pointerdown", (e) => {
  downInfo = { x: e.clientX, y: e.clientY, t: performance.now() };
  lookDrag = false; lastLX = e.clientX; lastLY = e.clientY;
});
canvas.addEventListener("pointermove", (e) => {
  if (!downInfo) return;
  const dx = e.clientX - lastLX, dy = e.clientY - lastLY;
  lastLX = e.clientX; lastLY = e.clientY;
  if (Math.hypot(e.clientX - downInfo.x, e.clientY - downInfo.y) > 12) lookDrag = true;
  if (lookDrag && !modalOpen) player.addLook(dx, dy);
});
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
  if (e.code === "KeyV" && !modalOpen) {
    const mode = player.cycleCamMode();
    const labels = { third: "📷", first: "👁️", top: "👑" };
    document.getElementById("cam-toggle").textContent = labels[mode] || "📷";
  }
  if (e.code === "KeyE" && !modalOpen) {
    const p = player.group.position;
    // nearest interactive villager first, then clues
    let bn = null, bd = 1e9;
    for (const n of npcs) {
      if (n.kind !== "named" && n.kind !== "wanderer" && n.kind !== "thug") continue;
      const d = Math.hypot(p.x - n.group.position.x, p.z - n.group.position.z);
      if (d < CONFIG.INTERACT_RADIUS + 2 && d < bd) { bd = d; bn = n; }
    }
    if (bn) { interactWith({ kind: "npc", npc: bn }); return; }
    if (player.riding) { tapBoat(); return; } // E hops out near shore
    const bp = world.boat.group.position;
    if (Math.hypot(p.x - bp.x, p.z - bp.z) < 9) { tapBoat(); return; }
    // discover nearest in-range undiscovered clue
    let best = null;
    bd = 1e9;
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
UI.onBegin = () => {
  updateGuide(); // show the first hint: follow the chameleon!
};
// tap the guide text → she walks there automatically (walkthrough mode!)
UI.onGuideTap(() => {
  const next = CLUES.find((c) => !found.has(c.id));
  if (!next || modalOpen) return;
  if (next.kind === "villager") {
    // walk to the villager NPC
    const n = npcs.find((x) => x.clueId === next.id);
    if (n) {
      player.autoTarget = { x: n.group.position.x, z: n.group.position.z };
      player._stuckT = 0; player._nudgeDir = 0; // reset anti-stuck
      UI.setGuide(`🚶 Walking to ${n.name}… (touch the joystick to take over)`);
      UI.blip();
    }
  } else {
    player.autoTarget = { x: next.x, z: next.z };
    player._stuckT = 0; player._nudgeDir = 0; // reset anti-stuck
    UI.setGuide(`🚶 Walking to the sparkles… (touch the joystick to take over)`);
    UI.blip();
  }
});

if (DEBUG) {
  window.__game = {
    player, found, discover, CLUES,
    teleport: (x, z) => player.teleport(x, z),
    rideBoat: () => tapBoat(),
    chameleonExcited: () => chameleon.excited,
    boatRiding: () => world.boat.riding,
    zoneAt: (x, z) => { const zn = world.zoneAt(x, z); return zn ? zn.id + " / " + zn.name : "valley"; },
    bannerText: () => document.getElementById("zone-banner").textContent,
    lanternDebug: () => world.lanternDebug(),
    npcScreen: (idx) => { const n = npcs[idx]; const s = project(n.group.position.x, n.group.position.y + n.headY, n.group.position.z); return { x: Math.round(s.x), y: Math.round(s.y), name: n.name, kind: n.kind }; },
    npcCount: () => npcs.length,
    hitCount: () => hitMeshes.length,
    orbit: () => ({ ...player.orbit }),
    proj: (x, y, z) => { const s = project(x, y, z); return { x: Math.round(s.x), y: Math.round(s.y) }; },
    tapTest: (cx, cy) => {
      pointer.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitMeshes, true);
      return hits.slice(0, 4).map((h) => {
        let o = h.object, path = [];
        while (o && path.length < 5) { path.push(o.type + (o.userData.interact ? "[I]" : "")); o = o.parent; }
        return { d: +h.distance.toFixed(1), path: path.join("<") };
      });
    },
    rayDebug: (cx, cy) => {
      pointer.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const n = npcs[0];
      const direct = raycaster.intersectObject(n.group, true);
      const head = new THREE.Vector3();
      n.group.children[1].getWorldPosition(head);
      const toHead = head.clone().sub(raycaster.ray.origin);
      const dist = toHead.length();
      const angle = raycaster.ray.direction.angleTo(toHead.normalize());
      return {
        directHits: direct.length,
        groupChildren: n.group.children.length,
        groupVisible: n.group.visible,
        headWorld: head.toArray().map((v) => +v.toFixed(1)),
        rayOrigin: raycaster.ray.origin.toArray().map((v) => +v.toFixed(1)),
        angleDeg: +(angle * 180 / Math.PI).toFixed(2),
        headAngularSizeDeg: +((0.34 / dist) * 180 / Math.PI).toFixed(2),
        camPos: camera.position.toArray().map((v) => +v.toFixed(1)),
      };
    },
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
  player.keyLook(dt, keys);

  player.update(dt);
  updateBoat(dt, t);
  world.update(dt, t, player.group.position.x, player.group.position.z);
  world.setLanternBoost(!!player.riding); // the Tangled moment while rowing
  updateNPCs(dt, t, player.group.position);
  player.updateCamera(camera, dt);

  // clue marker idle animation
  for (const { group } of clueMarkers.values()) {
    if (!group.visible) continue;
    const u = group.userData;
    if (u.spark) { u.spark.material.opacity = 0.55 + Math.sin(t * 3 + group.position.x) * 0.3; }
    if (u.ring) { const s = 1 + Math.sin(t * 2.2) * 0.18; u.ring.scale.set(s, s, 1); }
    if (u.beam) { u.beam.material.opacity = 0.22 + Math.sin(t * 2.5) * 0.1; u.beam.rotation.y = t * 0.8; }
    if (u.crit) { u.crit.position.y = Math.abs(Math.sin(t * 4)) * 0.15; u.crit.rotation.y = Math.sin(t * 0.8) * 0.6; }
  }

  // walk-into detection: step inside the NEXT clue's ring to discover it (guided story!)
  {
    const p = player.group.position;
    const next = CLUES.find((c) => !found.has(c.id));
    if (next && !modalOpen && ["hidden", "reflection", "animal", "boat"].includes(next.kind)) {
      const d = Math.hypot(p.x - next.x, p.z - next.z);
      // water targets (lake reflections): trigger from shore — she's close enough to see it
      const inWater = player.inWater(next.x, next.z);
      const triggerD = inWater ? 12 : 2.5;
      if (d < triggerD) {
        player.autoTarget = null; // stop walkthrough mode
        discover(next);
      }
    }
    // walkthrough arrival at a villager → auto-talk to them
    if (next && !modalOpen && next.kind === "villager" && player.autoTarget) {
      const n = npcs.find((x) => x.clueId === next.id);
      if (n) {
        const d = Math.hypot(p.x - n.group.position.x, p.z - n.group.position.z);
        if (d < 3.5) {
          player.autoTarget = null;
          // face the NPC in first-person so the dialogue is on screen
          if (player.camMode === 'first') {
            const dx = n.group.position.x - p.x, dz = n.group.position.z - p.z;
            player.fpYaw = Math.atan2(dx, dz);
          }
          interactWith({ kind: "npc", npc: n });
        }
      }
    }
  }

  // chameleon hot/cold — LEADS her to the NEXT story clue!
  const p = player.group.position;
  const nextClue = CLUES.find((c) => !found.has(c.id));
  const sense = nextClue ? nearestUndiscovered(p, CONFIG.CHAMELEON_SENSE) : null;
  // only get excited if the next clue is within sense range
  const nextInRange = nextClue && Math.hypot(p.x - nextClue.x, p.z - nextClue.z) < CONFIG.CHAMELEON_SENSE;
  chameleon.excited = !!nextInRange;
  chameleon.leadTarget = nextInRange ? { x: nextClue.x, z: nextClue.z } : null;

  // interaction prompts: boat board/hop-out, villager talk
  // (the prompt pill itself is tappable — the reliable phone interaction)
  {
    const pr = document.getElementById("interact-prompt");
    let text = null, wx = 0, wy = 0, wz = 0, target = null;
    const bp = world.boat.group.position;
    const bd = Math.hypot(p.x - bp.x, p.z - bp.z);
    if (player.riding) {
      if (boatNearShore()) { text = "⛵ Tap to hop out"; wx = bp.x; wy = 3.4; wz = bp.z; target = { kind: "boat" }; }
    } else if (bd < 9) {
      text = "⛵ Tap to board"; wx = bp.x; wy = 3.4; wz = bp.z; target = { kind: "boat" };
    } else {
      let bn = null, bnd = 1e9;
      for (const n of npcs) {
        if (n.kind !== "named" && n.kind !== "wanderer" && n.kind !== "thug") continue;
        const d = Math.hypot(p.x - n.group.position.x, p.z - n.group.position.z);
        if (d < CONFIG.PROMPT_RADIUS && d < bnd) { bnd = d; bn = n; }
      }
      if (bn) {
        text = `💬 Talk to ${bn.name}`;
        wx = bn.group.position.x; wy = bn.group.position.y + bn.headY + 1.5; wz = bn.group.position.z;
        target = { kind: "npc", npc: bn };
      }
    }
    if (text && !modalOpen && !UI.isMapOpen()) {
      const s = project(wx, wy, wz);
      // keep the pill on-screen even when its target is at the frame edge
      const cx = Math.max(70, Math.min(window.innerWidth - 70, s.x));
      const cy = Math.max(90, Math.min(window.innerHeight - 120, s.y));
      pr.textContent = text;
      pr.style.left = cx + "px"; pr.style.top = cy + "px";
      pr.classList.remove("hidden");
      pr.onclick = () => { if (target) interactWith(target); };
    } else { pr.classList.add("hidden"); pr.onclick = null; }
  }

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
