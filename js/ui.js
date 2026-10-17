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
    el("map-toggle").addEventListener("click", () => this.openMap());
    el("map-close").addEventListener("click", () => this.closeMap());
    el("cam-toggle").addEventListener("click", () => {
      const mode = window.__player?.cycleCamMode();
      const labels = { third: "📷", first: "👁️", top: "👑" };
      el("cam-toggle").textContent = labels[mode] || "📷";
    });
  },

  // ---------- world map ----------
  _mapOpen: false,
  openMap() {
    el("map-overlay").classList.remove("hidden");
    this._mapOpen = true;
  },
  closeMap() {
    el("map-overlay").classList.add("hidden");
    this._mapOpen = false;
  },
  isMapOpen() { return this._mapOpen; },
  drawMap(zones, clues, found, px, pz) {
    const cv = el("map-canvas");
    const g = cv.getContext("2d");
    const S = cv.width, C = S / 2, R = S / 2 - 10, B = 114;
    const mx = (x) => C + (x / B) * R, mz = (z) => C + (z / B) * R;
    g.clearRect(0, 0, S, S);
    const bg = g.createRadialGradient(C, C, 10, C, C, R);
    bg.addColorStop(0, "#2d2350"); bg.addColorStop(1, "#161130");
    g.fillStyle = bg;
    g.beginPath(); g.arc(C, C, R, 0, 7); g.fill();
    g.strokeStyle = "rgba(245,214,123,0.22)"; g.lineWidth = 1;
    g.beginPath(); g.arc(C, C, R * 0.66, 0, 7); g.stroke();
    g.beginPath(); g.arc(C, C, R * 0.33, 0, 7); g.stroke();
    // lake hint
    g.fillStyle = "rgba(95,145,225,0.4)";
    g.beginPath(); g.ellipse(mx(-80), mz(20), 28 * (R / B), 22 * (R / B), 0, 0, 7); g.fill();
    // valley — shaded corridor running forest → Snuggly Duckling on the east side
    g.fillStyle = "rgba(90,140,90,0.28)";
    const vx1 = mx(58), vx2 = mx(108), vz1 = mz(-45), vz2 = mz(50);
    g.beginPath();
    g.moveTo(vx1, vz1); g.lineTo(vx2, vz1); g.lineTo(vx2, vz2); g.lineTo(vx1, vz2);
    g.closePath(); g.fill();
    g.fillStyle = "rgba(140,200,140,0.9)"; g.font = "10px Georgia";
    g.fillText("⛰ Valley", mx(83), mz(-52));
    // zones with per-zone clue progress
    g.textAlign = "center";
    for (const zn of zones) {
      const zx = mx(zn.x), zy = mz(zn.z);
      const total = clues.filter((c) => c.zone === zn.id).length;
      const got = clues.filter((c) => c.zone === zn.id && found.has(c.id)).length;
      const done = total > 0 && got === total;
      g.fillStyle = done ? "#ffd76a" : "rgba(245,214,123,0.9)";
      g.beginPath(); g.arc(zx, zy, done ? 9 : 7, 0, 7); g.fill();
      g.strokeStyle = "#7a5a20"; g.lineWidth = 2; g.stroke();
      g.fillStyle = "#f7ecd4"; g.font = "11px Georgia";
      g.fillText(zn.name, zx, zy - 14);
      g.fillStyle = done ? "#ffd76a" : "rgba(247,236,212,0.8)"; g.font = "10px Georgia";
      g.fillText(`${got}/${total}`, zx, zy + 22);
    }
    // her live marker (pulsing)
    const pulse = 6 + Math.sin(performance.now() * 0.006) * 2;
    g.fillStyle = "#ff6a9a";
    g.beginPath(); g.arc(mx(px), mz(pz), pulse, 0, 7); g.fill();
    g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke();
    g.fillStyle = "#fff"; g.font = "bold 9px Georgia";
    g.fillText("YOU", mx(px), mz(pz) - pulse - 6);
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
  // guidance box: small text telling her where to go next
  setGuide(text) {
    const box = el("guide-box"), t = el("guide-text");
    if (!text) { box.classList.add("hidden"); return; }
    t.textContent = text;
    box.classList.remove("hidden");
  },

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
    // retrigger the dreamy reveal animation each time
    frame.classList.remove("reveal");
    void frame.offsetWidth;
    frame.classList.add("reveal");
  },

  // riddle: fill in the blank OR multiple choice — resolves true (any answer works for choice)
  riddleModal(prompt, answerOrOptions) {
    return new Promise((resolve) => {
      el("riddle-prompt").textContent = prompt;
      el("riddle-error").classList.add("hidden");
      const inputRow = el("riddle-input-row"), optBox = el("riddle-options");
      el("riddle-modal").classList.remove("hidden");
      const close = (val) => {
        el("riddle-modal").classList.add("hidden");
        el("riddle-submit").onclick = null;
        optBox.innerHTML = "";
        resolve(val);
      };
      if (Array.isArray(answerOrOptions)) {
        // multiple choice — any option unlocks!
        inputRow.classList.add("hidden");
        optBox.classList.remove("hidden");
        optBox.innerHTML = "";
        answerOrOptions.forEach((opt) => {
          const b = document.createElement("button");
          b.textContent = opt;
          b.onclick = () => close(true);
          optBox.appendChild(b);
        });
      } else {
        // fill in the blank
        inputRow.classList.remove("hidden");
        optBox.classList.add("hidden");
        el("riddle-input").value = "";
        setTimeout(() => el("riddle-input").focus(), 100);
        const submit = () => {
          const val = el("riddle-input").value.trim().toUpperCase();
          if (val === answerOrOptions.toUpperCase()) close(true);
          else { el("riddle-error").classList.remove("hidden"); el("riddle-input").select(); }
        };
        el("riddle-submit").onclick = submit;
        el("riddle-input").onkeydown = (e) => { if (e.key === "Enter") submit(); };
      }
    });
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
