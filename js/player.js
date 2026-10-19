// Player: paper-style sprite avatar, joystick + WASD/arrows, follow camera,
// collisions (bounds, circle colliders, water unless boating/on dock).

import * as THREE from "three";
import { CONFIG } from "./config.js?v=20261018story";
import { navigationFor } from "./navigation.js?v=20261018story";

export class Player {
  constructor(scene, world) {
    this.world = world;
    this.navigation = navigationFor(world, CONFIG.WORLD_BOUND);
    const tex = new THREE.TextureLoader().load("assets/sprite.png");
    tex.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    this.sprite.scale.set(1.9, 3.6, 1);
    this.group = new THREE.Group();
    this.group.add(this.sprite);
    this.sprite.position.y = 1.8;
    // V3: Sundrop aura - glowing flower particles
    this.auraGroup = new THREE.Group();
    this.auraFlowers = [];
    const flowerGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const flowerMat = new THREE.MeshBasicMaterial({ 
      color: 0xFFD700, 
      transparent: true, 
      opacity: 0.8 
    });
    for (let i = 0; i < 8; i++) {
      const flower = new THREE.Mesh(flowerGeo, flowerMat.clone());
      const angle = (i / 8) * Math.PI * 2;
      flower.position.set(Math.cos(angle) * 1.2, 1.5 + Math.random() * 1.5, Math.sin(angle) * 1.2);
      flower.userData = { angle, radius: 1.2, speed: 0.5 + Math.random() * 0.5, yBase: flower.position.y };
      this.auraGroup.add(flower);
      this.auraFlowers.push(flower);
    }
    this.group.add(this.auraGroup);
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
    this.camMode = 'top'; // default: bird's-eye — clearest for navigation
    this.fpYaw = 0; // first-person look direction (radians)
    this.fpPitch = 0;
  }

  cycleCamMode() {
    // only two views: bird's-eye (top-down) ↔ first-person
    this.camMode = this.camMode === 'top' ? 'first' : 'top';
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
      this._lastManualLook = performance.now() / 1000; // pause auto-turn after manual look
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
  
  // V3: Animate Sundrop aura flowers
  updateAura(t, isMoving) {
    if (!this.auraFlowers) return;
    for (const f of this.auraFlowers) {
      const u = f.userData;
      // Orbit around her
      u.angle += 0.02 * u.speed * (isMoving ? 2 : 1);
      f.position.x = Math.cos(u.angle) * u.radius;
      f.position.z = Math.sin(u.angle) * u.radius;
      // Bob up and down
      f.position.y = u.yBase + Math.sin(t * 2 + u.angle) * 0.3;
      // Pulse when idle (Sundrop energy!)
      const pulse = isMoving ? 0.6 : 0.8 + Math.sin(t * 3 + u.angle) * 0.2;
      f.material.opacity = pulse;
      // Scale pulse
      const s = 1 + Math.sin(t * 3 + u.angle) * 0.2;
      f.scale.set(s, s, s);
    }
  }

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
    // Walk an obstacle-cleared route at the original 1x pace. Manual input cancels it.
    if (this.autoTarget) {
      if (Math.hypot(this.moveVec.x, this.moveVec.z) > .15) {
        this.autoTarget = null; this._routeTarget = null; this.svel.set(0, 0, 0);
        this.onWalkCancel?.();
      } else {
        const p = this.group.position;
        if (this._routeTarget !== this.autoTarget) {
          this._routeTarget = this.autoTarget;
          this._route = this.navigation.route(p, this.autoTarget);
          this._routeIndex = 0;
          this.svel.set(0, 0, 0);
          if (!this._route) {
            this.autoTarget = null; this.onWalkBlocked?.(); return;
          }
        }
        const walkSpeed=Math.min(CONFIG.PLAYER_SPEED,this.autoWalkSpeed||CONFIG.PLAYER_SPEED);
        let remaining = walkSpeed * dt, dx = 0, dz = 0;
        while (remaining > 0 && this._routeIndex < this._route.length) {
          const q = this._route[this._routeIndex], distance = Math.hypot(q.x - p.x, q.z - p.z);
          if (distance < .001) { this._routeIndex++; continue; }
          dx = (q.x - p.x) / distance; dz = (q.z - p.z) / distance;
          const step = Math.min(remaining, distance), next = {x: p.x + dx * step, z: p.z + dz * step};
          if (!this.navigation.segmentClear(p, next)) {
            this._routeTarget = null; this.svel.set(0, 0, 0); return;
          }
          p.x = next.x; p.z = next.z; remaining -= step;
          if (step === distance) this._routeIndex++;
        }
        this.moving = remaining < walkSpeed * dt;
        this.svel.set(0, 0, 0); // no glide past the arrival point or into a photo
        if (this.moving) {
          this.bobT += dt * 8;
          this.sprite.position.y = 1.8 + Math.abs(Math.sin(this.bobT)) * .12;
          this.group.rotation.y = Math.atan2(dx, dz);
          if (this.camMode === 'first' && performance.now() / 1000 - (this._lastManualLook || 0) > 3) {
            let yaw = Math.atan2(dx, dz) - this.fpYaw;
            while (yaw > Math.PI) yaw -= Math.PI * 2;
            while (yaw < -Math.PI) yaw += Math.PI * 2;
            this.fpYaw += yaw * Math.min(1, dt * 1.5);
          }
        }
        if (window.terrainHeight) p.y += (window.terrainHeight(p.x, p.z) - p.y) * Math.min(1, dt * 10);
        if (this._routeIndex >= this._route.length && this.autoTarget.destinationId) {
          const target=this.autoTarget;this.autoTarget=null;this.onPlaceArrival?.(target.destinationId);
        }
        // Keep the target until main.js dispatches the matching clue/NPC interaction.
        return;
      }
    } else this._routeTarget = null;
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
    const desired = {x: p.x, z: p.z};
    p.copy(prev);
    const distance = Math.hypot(desired.x - prev.x, desired.z - prev.z);
    const steps = Math.max(1, Math.ceil(distance / .2));
    const dx = (desired.x - prev.x) / steps, dz = (desired.z - prev.z) / steps;
    for (let i = 0; i < steps; i++) {
      if (this.navigation.canWalk(p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; }
      else {
        if (this.navigation.canWalk(p.x + dx, p.z)) p.x += dx;
        if (this.navigation.canWalk(p.x, p.z + dz)) p.z += dz;
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
      const eyeH = 3.8; // raised for clearer vision over grass
      const sinY = Math.sin(this.fpYaw), cosY = Math.cos(this.fpYaw);
      const lx = sinY * 16, lz = cosY * 16; // look further ahead
      const ly = eyeH + this.fpPitch * 10;
      // pulled back 3.5 units — wider view so she sees the world, not just grass
      camera.position.set(p.x - sinY * 3.5, eyeH, p.z - cosY * 3.5);
      if (!this.lookSm) this.lookSm = new THREE.Vector3(p.x + lx, ly, p.z + lz);
      // snappy look (no heavy smoothing — first-person needs to feel direct)
      this.lookSm.lerp(new THREE.Vector3(p.x + lx, ly, p.z + lz), 1 - Math.pow(0.000001, dt));
      camera.lookAt(this.lookSm);
      return;
    }
    // TOP-DOWN: clear bird's-eye for easy navigation — close enough to see details
    if (this.camMode === 'top') {
      const tx = p.x, tz = p.z;
      camera.position.lerp(new THREE.Vector3(tx, 28, tz + 7), 1 - Math.pow(0.002, dt));
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
