// UI: HUD, joystick, dialogue bubbles, modals, banners, tiny WebAudio sounds.

import { CONFIG } from "./config.js";

function el(id) { return document.getElementById(id); }

export const UI = {
  joystick: { x: 0, y: 0 },
  _audio: null,
  _muted: false,
  _dlgTimer: 0,
  _dlgWorld: null,

  init() {
    if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
      document.body.classList.add("touch");
    }
    this._wireJoystick();
    el("sound-toggle").addEventListener("click", () => {
      this._muted = !this._muted;
      el("sound-toggle").textContent = this._muted ? "🔇" : "🔊";
    });
    el("begin-btn").addEventListener("click", () => {
      this._ensureAudio();
      el("start-overlay").classList.add("hidden");
      el("hud").classList.remove("hidden");
      document.getElementById("joystick").classList.add("started");
      const hint = el("hint-tap");
      setTimeout(() => (hint.style.opacity = "0"), 9000);
      if (this.onBegin) this.onBegin();
    });
    el("photo-close").addEventListener("click", () => {
      el("photo-modal").classList.add("hidden");
      if (this.onModalClose) this.onModalClose();
    });
    el("finale-replay").addEventListener("click", () => location.reload());
  },

  // ---------- joystick (touch + mouse) ----------
  _wireJoystick() {
    const base = el("joystick"), stick = el("stick");
    let active = null;
    const R = 44;
    const setFromEvent = (cx, cy) => {
      const r = base.getBoundingClientRect();
      let dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
      stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.joystick.x = dx / R; this.joystick.y = dy / R;
    };
    const reset = () => {
      active = null;
      stick.style.transform = "translate(-50%,-50%)";
      this.joystick.x = 0; this.joystick.y = 0;
    };
    base.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0]; active = t.identifier;
      setFromEvent(t.clientX, t.clientY); e.preventDefault();
    }, { passive: false });
    base.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) if (t.identifier === active) setFromEvent(t.clientX, t.clientY);
      e.preventDefault();
    }, { passive: false });
    base.addEventListener("touchend", (e) => {
      for (const t of e.changedTouches) if (t.identifier === active) reset();
    });
    base.addEventListener("touchcancel", () => reset());
    base.addEventListener("mousedown", (e) => { active = "mouse"; setFromEvent(e.clientX, e.clientY); });
    window.addEventListener("mousemove", (e) => { if (active === "mouse") setFromEvent(e.clientX, e.clientY); });
    window.addEventListener("mouseup", () => { if (active === "mouse") reset(); });
  },

  // ---------- HUD ----------
  setCounter(found) { el("found-count").textContent = found; },

  banner(text) {
    const b = el("zone-banner");
    b.textContent = text;
    b.classList.add("show");
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => b.classList.remove("show"), 2600);
  },

  // ---------- dialogue bubble ----------
  dialogue(name, text, wx, wy, wz) {
    el("dlg-name").textContent = name;
    el("dlg-text").textContent = text;
    el("dialogue").classList.remove("hidden");
    this._dlgWorld = { x: wx, y: wy, z: wz };
    this._dlgTimer = 2.8;
  },
  updateDialogue(dt, project) {
    if (this._dlgTimer <= 0) return;
    this._dlgTimer -= dt;
    if (this._dlgTimer <= 0 || !this._dlgWorld) {
      el("dialogue").classList.add("hidden"); this._dlgWorld = null; return;
    }
    const p = project(this._dlgWorld.x, this._dlgWorld.y, this._dlgWorld.z);
    const d = el("dialogue");
    d.style.left = p.x + "px"; d.style.top = p.y + "px";
  },

  // ---------- modals ----------
  photoModal(clue) {
    el("photo-num").textContent = clue.id;
    const frame = el("photo-frame");
    frame.innerHTML = clue.photo
      ? `<img src="${clue.photo}" alt="memory ${clue.id}">`
      : `<div class="placeholder-card">✨ A new memory is on its way… ✨</div>`;
    el("photo-caption").textContent = clue.caption;
    el("photo-modal").classList.remove("hidden");
  },

  finaleModal(photo, message) {
    el("finale-frame").innerHTML = `<img src="${photo}" alt="finale memory">`;
    el("finale-message").textContent = message;
    el("finale-modal").classList.remove("hidden");
  },

  // ---------- sounds ----------
  _ensureAudio() {
    if (!this._audio) {
      try { this._audio = new (window.AudioContext || window.webkitAudioContext)(); }
      catch { this._audio = null; }
    }
    if (this._audio && this._audio.state === "suspended") this._audio.resume();
  },
  _tone(freq, t0, dur, type = "sine", vol = 0.18) {
    if (!this._audio || this._muted) return;
    const o = this._audio.createOscillator(), g = this._audio.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, this._audio.currentTime + t0);
    g.gain.linearRampToValueAtTime(vol, this._audio.currentTime + t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, this._audio.currentTime + t0 + dur);
    o.connect(g).connect(this._audio.destination);
    o.start(this._audio.currentTime + t0); o.stop(this._audio.currentTime + t0 + dur + 0.05);
  },
  blip() { this._tone(660, 0, 0.09, "triangle"); },
  chime() { this._tone(880, 0, 0.25); this._tone(1318, 0.12, 0.35); },
  fanfare() { [523, 659, 784, 1046, 1318].forEach((f, i) => this._tone(f, i * 0.14, 0.4)); },
};
