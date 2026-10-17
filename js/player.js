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
    this.camMode = 'first'; // default: her eyes
    this.fpYaw = 0; // first-person look direction (radians)
    this.fpPitch = 0;
  }

  cycleCamMode() {
    // only two views: first-person ↔ bird's-eye (top-down)
    this.camMode = this.camMode === 'first' ? 'top' : 'first';
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
      // waypoint routing: if the straight path hits a collider, go around it
      let tx = this.autoTarget.x, tz = this.autoTarget.z;
      if (!this._wp || Math.hypot(tx - this._wp.x, tz - this._wp.z) > 0.5) {
        this._wp = null; // target changed, recalculate
      }
      if (!this._wp) {
        for (const c of this.world.colliders) {
          // does segment p→target pass within (c.r + 2) of the collider?
          const dxs = tx - p.x, dzs = tz - p.z;
          const len2 = dxs * dxs + dzs * dzs;
          if (len2 < 1e-4) break;
          let t = ((c.x - p.x) * dxs + (c.z - p.z) * dzs) / len2;
          t = Math.max(0, Math.min(1, t));
          const px = p.x + t * dxs, pz = p.z + t * dzs;
          const dist = Math.hypot(px - c.x, pz - c.z);
          if (dist < c.r + 2.5) {
            // route around: waypoint perpendicular to the path, outside the collider
            const ang = Math.atan2(pz - c.z, px - c.x);
            const wr = c.r + 4;
            this._wp = { x: c.x + Math.cos(ang) * wr, z: c.z + Math.sin(ang) * wr };
            break;
          }
        }
      }
      if (this._wp) { tx = this._wp.x; tz = this._wp.z; }
      const dx = tx - p.x, dz = tz - p.z;
      const d = Math.hypot(dx, dz);
      // reached waypoint → clear it and head to the real target
      if (this._wp && d < 2) this._wp = null;
      // arrival: check distance to the REAL target (not the waypoint)
      const realD = Math.hypot(this.autoTarget.x - p.x, this.autoTarget.z - p.z);
      if (manual || realD < 1.8) {
        this.autoTarget = null; this._wp = null; // arrived or user took over
      } else {
        // steer toward the target (slower in first-person — feels too fast up close)
        const speedMul = this.camMode === 'first' ? 0.55 : 0.85;
        const sp = CONFIG.PLAYER_SPEED * speedMul;
        this.svel.x += ((dx / d) * sp - this.svel.x) * Math.min(1, dt * 6);
        this.svel.z += ((dz / d) * sp - this.svel.z) * Math.min(1, dt * 6);
        this.moving = true;
        this.bobT += dt * 8;
        this.sprite.position.y = 1.8 + Math.abs(Math.sin(this.bobT)) * 0.12;
        // face the direction of travel
        this.group.rotation.y = Math.atan2(dx, dz);
        // in first-person, turn the camera to face where she's walking
        if (this.camMode === 'first') {
          const targetYaw = Math.atan2(dx, dz);
          let dy = targetYaw - this.fpYaw;
          while (dy > Math.PI) dy -= Math.PI * 2;
          while (dy < -Math.PI) dy += Math.PI * 2;
          this.fpYaw += dy * Math.min(1, dt * 3); // smooth turn
        }
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
    // slower in first-person — full speed feels frantic up close
    const speedMul = this.camMode === 'first' ? 0.6 : 1;
    const sp = CONFIG.PLAYER_SPEED * Math.min(1, len) * speedMul;
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
    // (third-person removed — only first-person and top-down remain)
    camera.lookAt(this.lookSm);
  }

  teleport(x, z) {
    this.group.position.set(x, 0, z);
    this.svel.set(0, 0, 0);
    this.riding = false;
  }
}
