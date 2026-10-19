// UI: HUD, joystick, dialogue bubbles, modals, banners, tiny WebAudio sounds.

import { CONFIG } from "./config.js?v=20261018story";
import { ZONES } from "./world-layout.js?v=20261018story";

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
    // Cloud prologue Begin button (same as main Begin)
    const cloudBegin = el("cloud-begin-btn");
    const beginHandler = () => {
      this._ensureAudio();
      // Cloud prologue: part clouds, then swoop camera
      const clouds = document.getElementById("cloud-prologue");
      if (clouds) {
        clouds.classList.add("parting");
        // After clouds part (4s), hide start overlay and begin camera swoop
        setTimeout(() => {
          clouds.style.display = "none";
          el("start-overlay").classList.add("hidden");
          if (this.onBegin) this.onBegin();
          // UI fades in after camera swoop (4s)
          setTimeout(() => {
            el("hud").classList.remove("hidden");
            document.getElementById("joystick").classList.add("started");
            const hint = el("hint-tap");
            setTimeout(() => (hint.style.opacity = "0"), 9000);
          }, 4000);
        }, 1000);
      } else {
        // Fallback if no clouds
        el("start-overlay").classList.add("hidden");
        el("hud").classList.remove("hidden");
        document.getElementById("joystick").classList.add("started");
        if (this.onBegin) this.onBegin();
      }
    };
    if (cloudBegin) cloudBegin.addEventListener("click", beginHandler);
    el("begin-btn").addEventListener("click", () => {
      this._ensureAudio();
      // Cloud prologue: part clouds, then swoop camera
      const clouds = document.getElementById("cloud-prologue");
      if (clouds) {
        clouds.classList.add("parting");
        // After clouds part (4s), hide start overlay and begin camera swoop
        setTimeout(() => {
          clouds.style.display = "none";
          el("start-overlay").classList.add("hidden");
          if (this.onBegin) this.onBegin();
          // UI fades in after camera swoop (4s)
          setTimeout(() => {
            el("hud").classList.remove("hidden");
            document.getElementById("joystick").classList.add("started");
            const hint = el("hint-tap");
            setTimeout(() => (hint.style.opacity = "0"), 9000);
          }, 4000);
        }, 1000);
      } else {
        // Fallback if no clouds
        el("start-overlay").classList.add("hidden");
        el("hud").classList.remove("hidden");
        document.getElementById("joystick").classList.add("started");
        if (this.onBegin) this.onBegin();
      }
    });
    el("photo-close").addEventListener("click", () => {
      el("photo-modal").classList.add("hidden");
      if (this.onModalClose) this.onModalClose();
    });
    el("finale-replay").addEventListener("click", () => location.reload());
    el("map-toggle").addEventListener("click", () => this.openMap());
    el("map-close").addEventListener("click", () => this.closeMap());
    const destinations=el("map-destinations");
    for(const [i,place] of ZONES.entries()) {
      const button=document.createElement("button");button.type="button";
      button.textContent=`${i+1}. ${place.name}`;
      button.setAttribute("aria-label",`Walk to ${place.name}`);
      button.addEventListener("click",()=>{this.closeMap();this.onPlaceSelect?.(place);});
      destinations.appendChild(button);
    }
    el("cam-toggle").addEventListener("click", () => {
      const mode = window.__player?.cycleCamMode();
      const labels = { first: "👁️", top: "🦅" };
      el("cam-toggle").textContent = labels[mode] || "🦅";
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
  drawMap(zones, clues, found, px, pz, world) {
    const cv = el("map-canvas");
    const g = cv.getContext("2d");
    const S = cv.width, C = S / 2, R = S / 2 - 10, B = CONFIG.WORLD_BOUND + 8;
    const mx = (x) => C + (x / B) * R, mz = (z) => C + (z / B) * R;
    g.clearRect(0, 0, S, S);
    const bg = g.createRadialGradient(C, C, 10, C, C, R);
    bg.addColorStop(0, "#2d2350"); bg.addColorStop(1, "#161130");
    g.fillStyle = bg;
    g.beginPath(); g.arc(C, C, R, 0, 7); g.fill();
    g.strokeStyle = "rgba(245,214,123,0.22)"; g.lineWidth = 1;
    g.beginPath(); g.arc(C, C, R * 0.66, 0, 7); g.stroke();
    g.beginPath(); g.arc(C, C, R * 0.33, 0, 7); g.stroke();
    // Draw the actual water and the exact brown roads used by walking routes.
    g.fillStyle = "rgba(95,145,225,0.4)";
    for(const water of world.waters){g.beginPath();g.ellipse(mx(water.x),mz(water.z),water.rx*R/B,water.rz*R/B,0,0,7);g.fill();}
    g.fillStyle="#726b62";
    for(const island of world.dryIslands||[]){g.beginPath();g.arc(mx(island.x),mz(island.z),island.r*R/B,0,7);g.fill();}
    g.strokeStyle="#9a8563";g.lineWidth=2.5;g.lineCap="round";
    for(const [ax,az,bx,bz] of world.paths){g.beginPath();g.moveTo(mx(ax),mz(az));g.lineTo(mx(bx),mz(bz));g.stroke();}
    // zones with per-zone clue progress
    g.textAlign = "center";
    for (const [index, zn] of zones.entries()) {
      const zx = mx(zn.x), zy = mz(zn.z);
      const total = clues.filter((c) => c.zone === zn.id).length;
      const got = clues.filter((c) => c.zone === zn.id && found.has(c.id)).length;
      const done = total > 0 && got === total;
      g.fillStyle = done ? "#ffd76a" : "rgba(245,214,123,0.9)";
      g.beginPath(); g.arc(zx, zy, done ? 9 : 7, 0, 7); g.fill();
      g.strokeStyle = "#7a5a20"; g.lineWidth = 2; g.stroke();
      g.fillStyle = "#f7ecd4"; g.font = "11px Georgia";
      g.fillText(zn.mapLabel, zx, zy - 14);
      g.fillStyle="#332545";g.font="bold 10px Georgia";g.fillText(String(index+1),zx,zy+3);
      g.fillStyle = done ? "#ffd76a" : "rgba(247,236,212,0.8)"; g.font = "10px Georgia";
      if(total)g.fillText(`${got}/${total}`, zx, zy + 22);
    }
    const festival=world.festival;
    if(festival){g.fillStyle="#eecb7e";g.font="10px Georgia";g.fillText("✦",mx(festival.x),mz(festival.z));g.fillText(`${clues.filter(c=>c.zone==='festival'&&found.has(c.id)).length}/5`,mx(festival.x),mz(festival.z)+13);}
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
  // tap the guide box → walkthrough mode (auto-walk to the next clue)
  onGuideTap(fn) { el("guide-box").addEventListener("click", fn); },

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

  // Choice modal: question with options, shows response, then continue
  choiceModal(speaker, prompt, options, responses, outro) {
    return new Promise((resolve) => {
      el("choice-speaker").textContent = speaker;
      el("choice-prompt").textContent = prompt;
      el("choice-response").classList.add("hidden");
      el("choice-continue").classList.add("hidden");
      const optBox = el("choice-options");
      optBox.innerHTML = "";
      el("choice-modal").classList.remove("hidden");
      options.forEach((opt, i) => {
        const b = document.createElement("button");
        b.textContent = opt;
        b.onclick = () => {
          // Show response
          optBox.innerHTML = "";
          const resp = el("choice-response");
          resp.textContent = responses[i] + (outro ? " " + outro : "");
          resp.classList.remove("hidden");
          el("choice-continue").classList.remove("hidden");
          el("choice-continue").onclick = () => {
            el("choice-modal").classList.add("hidden");
            resolve(i);
          };
        };
        optBox.appendChild(b);
      });
    });
  },

  // Dialogue modal: just shows text with a continue button (for supportive narrative)
  dialogueModal(speaker, text) {
    return new Promise((resolve) => {
      el("choice-speaker").textContent = speaker;
      el("choice-prompt").textContent = text;
      el("choice-options").innerHTML = "";
      el("choice-response").classList.add("hidden");
      const btn = el("choice-continue");
      btn.textContent = "Continue 💜";
      btn.classList.remove("hidden");
      el("choice-modal").classList.remove("hidden");
      btn.onclick = () => {
        el("choice-modal").classList.add("hidden");
        resolve(true);
      };
    });
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
  // V3: Per-zone discovery sounds
  tavernCheer() { 
    // Boisterous drunken cheer - multiple voices
    [392, 494, 587, 784].forEach((f, i) => {
      this._tone(f, i * 0.08, 0.3, "sawtooth");
      this._tone(f * 1.5, i * 0.08 + 0.05, 0.25, "triangle");
    });
  },
  crystalChime() {
    // Sharp glassy chime for cave crystals
    [2093, 2637, 3136].forEach((f, i) => this._tone(f, i * 0.1, 0.5, "sine"));
  },
  darkCello() {
    // Deep resonant cello for dark kingdom
    [130, 196, 262].forEach((f, i) => this._tone(f, i * 0.2, 0.8, "sawtooth"));
  },
  // Play zone-specific discovery sound
  zoneChime(zoneId) {
    if (zoneId === 'tavern') this.tavernCheer();
    else if (zoneId === 'cave') this.crystalChime();
    else if (zoneId === 'dark') this.darkCello();
    else this.chime();
  },

  // ===== MINI-GAMES =====

  playGame(gameId, title, intro) {
    return new Promise((resolve) => {
      el("game-title").textContent = title;
      el("game-intro").textContent = intro;
      el("game-outro").classList.add("hidden");
      el("game-done").classList.add("hidden");
      el("game-modal").classList.remove("hidden");
      const area = el("game-area");
      area.innerHTML = "";

      const done = () => {
        el("game-done").classList.remove("hidden");
        el("game-done").onclick = () => {
          el("game-modal").classList.add("hidden");
          resolve(true);
        };
      };

      if (gameId === "paint-lantern") this._gamePaintLantern(area, done);
      else if (gameId === "find-pascal") this._gameFindPascal(area, done);
      else if (gameId === "flower-crown") this._gameFlowerCrown(area, done);
      else if (gameId === "tic-tac-toe") this._gameTicTacToe(area, done);
      else if (gameId === "light-lanterns") this._gameLightLanterns(area, done);
    });
  },

  setGameOutro(text) {
    const o = el("game-outro");
    o.textContent = text;
    o.classList.remove("hidden");
  },

  _gamePaintLantern(area, done) {
    const colors = ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff", "#5f27cd", "#1dd1a1", "#ffd700"];
    let selected = colors[0];
    const pal = document.createElement("div");
    pal.className = "game-colors";
    colors.forEach((c, i) => {
      const d = document.createElement("div");
      d.className = "color-dot" + (i === 0 ? " selected" : "");
      d.style.background = c;
      d.onclick = () => {
        selected = c;
        pal.querySelectorAll(".color-dot").forEach(x => x.classList.remove("selected"));
        d.classList.add("selected");
      };
      pal.appendChild(d);
    });
    area.appendChild(pal);
    // Lantern SVG with 4 paintable sections
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "lantern-svg");
    svg.setAttribute("viewBox", "0 0 100 130");
    svg.innerHTML = `
      <rect x="35" y="5" width="30" height="10" fill="#8b5a2b" rx="3"/>
      <rect class="lantern-section" x="25" y="18" width="50" height="25" fill="#ddd" stroke="#8b5a2b" stroke-width="2" rx="8"/>
      <rect class="lantern-section" x="25" y="45" width="50" height="25" fill="#ddd" stroke="#8b5a2b" stroke-width="2" rx="8"/>
      <rect class="lantern-section" x="25" y="72" width="50" height="25" fill="#ddd" stroke="#8b5a2b" stroke-width="2" rx="8"/>
      <rect x="35" y="100" width="30" height="8" fill="#8b5a2b" rx="3"/>
      <circle cx="50" cy="115" r="4" fill="#ffd700"/>
    `;
    let painted = 0;
    svg.querySelectorAll(".lantern-section").forEach(sec => {
      sec.onclick = () => {
        if (sec.getAttribute("fill") === "#ddd") painted++;
        sec.setAttribute("fill", selected);
        if (painted >= 3) {
          this.setGameOutro("Beautiful! Your lantern glows!");
          this._tone(880, 0, 0.3); this._tone(1318, 0.15, 0.4);
          setTimeout(done, 800);
        }
      };
    });
    area.appendChild(svg);
    const hint = document.createElement("p");
    hint.textContent = "Tap a color, then tap the lantern to paint!";
    hint.style.fontSize = "14px"; hint.style.opacity = "0.8";
    area.appendChild(hint);
  },

  _gameFindPascal(area, done) {
    const row = document.createElement("div");
    row.className = "bush-row";
    let picks = 0;
    for (let i = 0; i < 3; i++) {
      const b = document.createElement("div");
      b.className = "bush";
      b.textContent = "🌿";
      b.onclick = () => {
        picks++;
        if (picks === 2) {
          b.textContent = "🦎";
          b.classList.add("found");
          this.setGameOutro("Ack! You found me!");
          this._tone(660, 0, 0.2); this._tone(880, 0.1, 0.3);
          setTimeout(done, 800);
        } else {
          b.textContent = "🍃";
          b.style.opacity = "0.5";
          b.style.pointerEvents = "none";
        }
      };
      row.appendChild(b);
    }
    area.appendChild(row);
    const hint = document.createElement("p");
    hint.textContent = "Pascal is hiding behind a bush! Tap to find him!";
    hint.style.fontSize = "14px"; hint.style.opacity = "0.8";
    area.appendChild(hint);
  },

  _gameFlowerCrown(area, done) {
    const flowers = ["🌹", "🌼", "🌸", "🌻", "🌷", "💮"];
    const crown = document.createElement("div");
    crown.className = "crown-display";
    crown.textContent = "⭕⭕⭕⭕⭕";
    area.appendChild(crown);
    const opts = document.createElement("div");
    opts.className = "flower-options";
    let placed = 0;
    const crownArr = ["⭕","⭕","⭕","⭕","⭕"];
    flowers.forEach(f => {
      const btn = document.createElement("div");
      btn.className = "flower-btn";
      btn.textContent = f;
      btn.onclick = () => {
        if (placed < 5) {
          crownArr[placed] = f;
          crown.textContent = crownArr.join("");
          btn.classList.add("used");
          placed++;
          this._tone(500 + placed * 100, 0, 0.15);
          if (placed >= 5) {
            this.setGameOutro("Beautiful crown! We're twins!");
            setTimeout(done, 800);
          }
        }
      };
      opts.appendChild(btn);
    });
    area.appendChild(opts);
  },

  _gameTicTacToe(area, done) {
    const board = document.createElement("div");
    board.className = "ttt-board";
    // Pre-set: X X _ / O O _ / _ _ _
    const state = ["X", "X", "", "O", "O", "", "", "", ""];
    const cells = [];
    state.forEach((val, i) => {
      const c = document.createElement("div");
      c.className = "ttt-cell";
      c.textContent = val;
      if (!val) {
        c.onclick = () => {
          c.textContent = "X";
          c.classList.add("winner");
          // Highlight the winning row
          cells[0].classList.add("winner");
          cells[1].classList.add("winner");
          this.setGameOutro("You win! Varian's calculations were correct!");
          this.fanfare();
          setTimeout(done, 1000);
        };
      }
      cells.push(c);
      board.appendChild(c);
    });
    area.appendChild(board);
    const hint = document.createElement("p");
    hint.textContent = "Tap the empty spot to complete three X's!";
    hint.style.fontSize = "14px"; hint.style.opacity = "0.8";
    area.appendChild(hint);
  },

  _gameLightLanterns(area, done) {
    const grid = document.createElement("div");
    grid.className = "lantern-grid";
    let lit = 0;
    for (let i = 0; i < 7; i++) {
      const l = document.createElement("div");
      l.className = "mini-lantern";
      l.textContent = "🏮";
      l.onclick = () => {
        if (!l.classList.contains("lit")) {
          l.classList.add("lit");
          lit++;
          this._tone(400 + lit * 80, 0, 0.2);
          if (lit >= 7) {
            this.setGameOutro("All lanterns lit! They float up to the sky...");
            this.fanfare();
            setTimeout(done, 1200);
          }
        }
      };
      grid.appendChild(l);
    }
    area.appendChild(grid);
    const hint = document.createElement("p");
    hint.textContent = "Tap each lantern to light it!";
    hint.style.fontSize = "14px"; hint.style.opacity = "0.8";
    area.appendChild(hint);
  },
};
