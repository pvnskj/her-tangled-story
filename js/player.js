// Player: paper-style sprite avatar, joystick + WASD/arrows, follow camera,
// collisions (bounds, circle colliders, water unless boating/on dock).

import * as THREE from "three";
import { CONFIG } from "./config.js";

export class Player {
  constructor(scene, world) {
    this.world = world;
    const tex = new THREE.TextureLoader().load("assets/sprite.png");
    tex.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    this.sprite.scale.set(1.9, 3.6, 1);
    this.group = new THREE.Group();
    this.group.add(this.sprite);
    this.sprite.position.y = 1.8;
    // blob shadow
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.85, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03;
    this.group.add(sh);
    this.group.position.set(CONFIG.SPAWN.x, 0, CONFIG.SPAWN.z);
    scene.add(this.group);

    this.vel = new THREE.Vector3();
    this.riding = false;
    this.moveVec = { x: 0, z: 0 };
    this.svel = new THREE.Vector3(); // smoothed velocity — the "delightful" in the movement
    this.moving = false;
    this.bobT = 0;
    this.autoTarget = null; // walkthrough mode: auto-walk to a tapped clue
    this.lookSm = null; // smoothed look-at target for buttery camera
    // drag-to-look offsets (radians): yaw/pitch added around the follow target
    this.orbit = { yaw: 0, pitch: 0, lastDrag: -100 };
    // camera modes: 'third' (diorama), 'first' (her POV), 'top' (royalty view)
    this.camMode = 'third';
    this.fpYaw = 0; // first-person look direction (radians)
    this.fpPitch = 0;
  }

  cycleCamMode() {
    this.camMode = this.camMode === 'third' ? 'first' : this.camMode === 'first' ? 'top' : 'third';
    // hide her sprite in first-person so you don't see the back of her head
    if (this.sprite) this.sprite.visible = this.camMode !== 'first';
    // when entering first-person, face her current movement direction
    if (this.camMode === 'first') {
      const ml = Math.hypot(this.moveVec.x, this.moveVec.z);
      if (ml > 0.1) this.fpYaw = Math.atan2(this.moveVec.x, this.moveVec.z);
      this.fpPitch = 0;
    }
    return this.camMode;
  }

  // called from the canvas drag handler: dx/dy are pointer pixels
  addLook(dx, dy) {
    if (this.camMode === 'first') {
      // first-person: drag to look around (drag right = turn right)
      this.fpYaw += dx * 0.005;
      this.fpPitch = THREE.MathUtils.clamp(this.fpPitch + dy * 0.004, -0.6, 0.6);
    } else {
      this.orbit.yaw -= dx * 0.0052;
      this.orbit.pitch = THREE.MathUtils.clamp(this.orbit.pitch + dy * 0.0052, -0.55, 0.55);
    }
    this.orbit.lastDrag = performance.now() / 1000;
  }

  // keyboard look: Z/X yaw, R/F pitch — for desktop users who prefer keys over drag
  keyLook(dt, keys) {
    const spd = 1.8 * dt;
    if (keys.KeyZ) this.orbit.yaw += spd;
    if (keys.KeyX) this.orbit.yaw -= spd;
    if (keys.KeyR) this.orbit.pitch += spd * 0.7;
    if (keys.KeyF) this.orbit.pitch -= spd * 0.7;
    if (keys.KeyZ || keys.KeyX || keys.KeyR || keys.KeyF) {
      this.orbit.pitch = THREE.MathUtils.clamp(this.orbit.pitch, -0.6, 0.6);
      this.orbit.lastDrag = performance.now() / 1000;
    }
  }

  setInput(x, z) { this.moveVec.x = x; this.moveVec.z = z; }

  inWater(x, z) {
    return this.world.waters.some((w) => ((x - w.x) / w.rx) ** 2 + ((z - w.z) / w.rz) ** 2 < 1);
  }
  onDock(x, z) {
    const d = this.world.dockRect;
    return x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1;
  }

  update(dt) {
    if (this.riding) { // boat drives; bleed off any leftover glide
      this.svel.multiplyScalar(Math.max(0, 1 - dt * 4));
      return;
    }
    // WALKTHROUGH MODE: auto-walk toward the tapped clue
    if (this.autoTarget) {
      const p = this.group.position;
      // cancel if the player grabs the joystick/keys
      const manual = Math.hypot(this.moveVec.x, this.moveVec.z) > 0.15;
      const dx = this.autoTarget.x - p.x, dz = this.autoTarget.z - p.z;
      const d = Math.hypot(dx, dz);
      if (manual || d < 1.8) {
        this.autoTarget = null; // arrived or user took over
      } else {
        // steer toward the target
        const sp = CONFIG.PLAYER_SPEED * 0.85;
        this.svel.x += ((dx / d) * sp - this.svel.x) * Math.min(1, dt * 6);
        this.svel.z += ((dz / d) * sp - this.svel.z) * Math.min(1, dt * 6);
        this.moving = true;
        this.bobT += dt * 8;
        this.sprite.position.y = 1.8 + Math.abs(Math.sin(this.bobT)) * 0.12;
        // face the direction of travel
        this.group.rotation.y = Math.atan2(dx, dz);
        // move + collide (shared with manual below)
        const prev = p.clone();
        p.x += this.svel.x * dt; p.z += this.svel.z * dt;
        const B = CONFIG.WORLD_BOUND;
        p.x = Math.max(-B, Math.min(B, p.x));
        p.z = Math.max(-B, Math.min(B, p.z));
        if (this.inWater(p.x, p.z) && !this.onDock(p.x, p.z)) p.copy(prev);
        for (const c of this.world.colliders) {
          const cx = p.x - c.x, cz = p.z - c.z;
          const cd = Math.hypot(cx, cz), min = c.r + 0.55;
          if (cd < min && cd > 1e-4) { p.x = c.x + (cx / cd) * min; p.z = c.z + (cz / cd) * min; }
        }
        if (window.terrainHeight) {
          const targetY = window.terrainHeight(p.x, p.z);
          p.y += (targetY - p.y) * Math.min(1, dt * 10);
        }
        return;
      }
    }
    // in first-person, joystick moves relative to where you're looking
    // (up on stick = forward in view direction)
    let ix = this.moveVec.x, iz = this.moveVec.z;
    if (this.camMode === 'first') {
      const sinY = Math.sin(this.fpYaw), cosY = Math.cos(this.fpYaw);
      // forward = (sinY, cosY); right = forward × up = (-cosY, sinY)
      const rx = (-iz) * sinY + ix * (-cosY);
      const rz = (-iz) * cosY + ix * sinY;
      ix = rx; iz = rz;
    }
    const len = Math.hypot(ix, iz);
    // desired velocity (analog from joystick, digital from keys)
    const nx = len > 1e-4 ? ix / Math.max(1, len) : 0;
    const nz = len > 1e-4 ? iz / Math.max(1, len) : 0;
    const sp = CONFIG.PLAYER_SPEED * Math.min(1, len);
    // smooth acceleration / gentle glide to a stop — playful, not mechanical
    const k = 1 - Math.pow(len > 0.05 ? 0.0008 : 0.02, dt);
    this.svel.x += (nx * sp - this.svel.x) * k;
    this.svel.z += (nz * sp - this.svel.z) * k;
    const spd = Math.hypot(this.svel.x, this.svel.z);
    this.moving = spd > 0.6;
    const prev = this.group.position.clone();

    if (this.moving) {
      this.group.position.x += this.svel.x * dt;
      this.group.position.z += this.svel.z * dt;
      this.bobT += dt * (7 + spd * 0.5);
      this.sprite.position.y = 1.8 + Math.abs(Math.sin(this.bobT)) * (0.08 + spd * 0.008);
      // subtle lean into lateral movement (screen-space tilt)
      const lean = Math.max(-0.09, Math.min(0.09, -this.svel.x * 0.006));
      this.sprite.material.rotation += (lean - this.sprite.material.rotation) * Math.min(1, dt * 8);
    } else {
      this.sprite.position.y = 1.8 + Math.sin(performance.now() * 0.002) * 0.03;
      this.sprite.material.rotation *= Math.max(0, 1 - dt * 6);
    }

    const p = this.group.position;
    // world bounds
    const B = CONFIG.WORLD_BOUND;
    p.x = Math.max(-B, Math.min(B, p.x));
    p.z = Math.max(-B, Math.min(B, p.z));
    // water: blocked unless on the dock
    if (this.inWater(p.x, p.z) && !this.onDock(p.x, p.z)) {
      p.copy(prev);
    }
    // circle colliders: push out
    for (const c of this.world.colliders) {
      const dx = p.x - c.x, dz = p.z - c.z;
      const d = Math.hypot(dx, dz), min = c.r + 0.55;
      if (d < min && d > 1e-4) {
        p.x = c.x + (dx / d) * min;
        p.z = c.z + (dz / d) * min;
      }
    }
    // follow the terrain — feel the slopes!
    if (window.terrainHeight) {
      const targetY = window.terrainHeight(p.x, p.z);
      p.y += (targetY - p.y) * Math.min(1, dt * 10); // smooth
    }
  }

  updateCamera(camera, dt) {
    const p = this.group.position;
    // FIRST-PERSON: see through her eyes — drag to look, joystick moves relative to view
    if (this.camMode === 'first') {
      const eyeH = 2.9;
      const sinY = Math.sin(this.fpYaw), cosY = Math.cos(this.fpYaw);
      const lx = sinY * 12, lz = cosY * 12;
      const ly = eyeH + this.fpPitch * 10;
      // pulled back 2.2 units for a slightly wider, less claustrophobic view
      camera.position.set(p.x - sinY * 2.2, eyeH, p.z - cosY * 2.2);
      if (!this.lookSm) this.lookSm = new THREE.Vector3(p.x + lx, ly, p.z + lz);
      // snappy look (no heavy smoothing — first-person needs to feel direct)
      this.lookSm.lerp(new THREE.Vector3(p.x + lx, ly, p.z + lz), 1 - Math.pow(0.000001, dt));
      camera.lookAt(this.lookSm);
      return;
    }
    // TOP-DOWN ROYALTY: high cinematic view of the whole diorama
    if (this.camMode === 'top') {
      const tx = p.x, tz = p.z;
      camera.position.lerp(new THREE.Vector3(tx, 42, tz + 10), 1 - Math.pow(0.002, dt));
      if (!this.lookSm) this.lookSm = new THREE.Vector3(tx, 0, tz);
      this.lookSm.lerp(new THREE.Vector3(tx, 0, tz), 1 - Math.pow(0.004, dt));
      camera.lookAt(this.lookSm);
      return;
    }
    // pull back on narrow (portrait phone) screens so more world is visible
    const wide = 1 + Math.max(0, 1 - camera.aspect) * 0.55;
    // look-ahead: shift the frame toward her movement direction so landmarks
    // ahead of her stay visible — she "sees what the world is"
    const mx = this.moveVec.x, mz = this.moveVec.z;
    const ml = Math.hypot(mx, mz);
    const lead = ml > 0.05 ? Math.min(1, ml) : 0;
    const lx = lead ? (mx / ml) * 5.5 * lead : 0;
    const lz = lead ? (mz / ml) * 5.5 * lead : 0;
    // bruno-simon-style high diorama angle (~47° down): the world reads as a
    // tiny luminous miniature she walks through — shallow enough on phones
    // that sky, landmarks and horizon stay in frame
    const target = new THREE.Vector3(p.x + lx, 15.5 * wide, p.z + lz + 14.5 * wide);
    camera.position.lerp(target, 1 - Math.pow(0.0015, dt));
    // smoothed look-at target: buttery, no jitter. Aimed a little high so
    // landmarks and sky stay in frame — she "sees what the world is" from
    // the very first frame. (Portrait keeps the framing that worked; desktop
    // gets a slight forward bias toward her tower.)
    const portrait = camera.aspect < 1;
    // ADAPTIVE look height: when the user drags to a low angle (looking up at
    // buildings/trees), lower the target so the view stays level instead of
    // tilting steeply up. When high, raise it for the diorama feel.
    const orbitPitch = this.orbit.pitch || 0;
    const pitchT = THREE.MathUtils.clamp((orbitPitch + 0.5) / 1.0, 0, 1);
    const lookH = THREE.MathUtils.lerp(2.2, portrait ? 5 : 5.5, pitchT);
    const biasZ = portrait ? 0 : -4;
    if (!this.lookSm) this.lookSm = new THREE.Vector3(p.x, lookH, p.z + biasZ);
    this.lookSm.lerp(new THREE.Vector3(p.x + lx * 0.7, lookH, p.z + lz * 0.7 + biasZ), 1 - Math.pow(0.004, dt));
    // drag-to-look: rotate the camera offset around the smoothed target.
    // idle 5s and it eases back to the curated framing (tower/sky in frame).
    const nowS = performance.now() / 1000;
    if (nowS - this.orbit.lastDrag > 5) {
      const e = 1 - Math.pow(0.05, dt);
      this.orbit.yaw *= (1 - e);
      this.orbit.pitch *= (1 - e);
    }
    {
      const off = camera.position.clone().sub(this.lookSm);
      const L = Math.max(1, off.length());
      const basePitch = Math.asin(THREE.MathUtils.clamp(off.y / L, -1, 1));
      const baseYaw = Math.atan2(off.x, off.z);
      const D = THREE.MathUtils.degToRad;
      // clamp total elevation: 15° (low, looking up at the tower) .. 75° (high diorama)
      const pitch = THREE.MathUtils.clamp(basePitch + this.orbit.pitch, D(15), D(75));
      const yaw = baseYaw + this.orbit.yaw;
      off.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(L);
      camera.position.copy(this.lookSm).add(off);
    }
    camera.lookAt(this.lookSm);
  }

  teleport(x, z) {
    this.group.position.set(x, 0, z);
    this.svel.set(0, 0, 0);
    this.riding = false;
  }
}
