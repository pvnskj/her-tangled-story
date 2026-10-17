import { CHAPTERS, PHOTOS } from './journey.js?v=20261017g';
const el = id => document.getElementById(id);
export const UI = {
  joystick:{x:0,y:0}, _muted:false, _audio:null, active:null, _dlgTimer:0, walking:false,
  init(state, actions) {
    this.state=state;this.actions=actions;
    if('ontouchstart' in window || navigator.maxTouchPoints>0)document.body.classList.add('touch');
    this._wireJoystick();
    el('begin-btn').textContent=state.opened.size?'Welcome back ♡':'Step inside ♡';
    el('begin-btn').onclick=()=>{this._ensureAudio();el('start-overlay').classList.add('hidden');el('hud').classList.remove('hidden');el('journey-bar').classList.remove('hidden');actions.begin();};
    el('sound-toggle').onclick=()=>{this._muted=!this._muted;el('sound-toggle').textContent=this._muted?'♪̸':'♪';el('sound-toggle').setAttribute('aria-label',this._muted?'Turn sound on':'Turn sound off');};
    el('cam-toggle').onclick=()=>{const mode=actions.camera();el('cam-toggle').textContent=mode==='top'?'Overhead':'View';};
    el('map-toggle').onclick=()=>this.openPlaces();el('album-toggle').onclick=()=>this.openAlbum();
    el('walk-toggle').onclick=()=>{this.walking=!this.walking;document.body.classList.toggle('walking',this.walking);el('walk-toggle').textContent=this.walking?'Pause walking':'Walk yourself';el('walk-toggle').setAttribute('aria-pressed',String(this.walking));actions.stop();if(this.walking)this.banner(document.body.classList.contains('touch')?'Use the joystick to stroll. Drag the world to look around.':'Use WASD or arrow keys to stroll. Drag to look around.');};
    el('journey-go').onclick=()=>actions.go(this.selected);
    document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>this.close());
    el('unwrap-btn').onclick=el('unwrap-text').onclick=()=>this.unwrap();
    el('gift-stay').onclick=()=>this.close();
    el('gift-next').onclick=()=>{const next=CHAPTERS.find(c=>!state.opened.has(c.id));this.close();if(next)actions.travel(next.id);else this.openAlbum();};
    el('wish-release').onclick=()=>{el('wish-input').value='';el('wish-status').textContent='A little wish, sent into the evening. ✧';this.chime();actions.wish();};
    el('lantern-release').onclick=()=>{this.close();actions.celebrate();};
    el('lightbox-close').onclick=()=>this.closePhoto();el('photo-prev').onclick=()=>this.showPhoto(this.photoIndex-1);el('photo-next').onclick=()=>this.showPhoto(this.photoIndex+1);
    let startX=null;
    el('lightbox-img').addEventListener('pointerdown',e=>{startX=e.clientX;});
    el('lightbox-img').addEventListener('pointerup',e=>{if(startX!==null&&Math.abs(e.clientX-startX)>55)this.showPhoto(this.photoIndex+(e.clientX<startX?1:-1));startX=null;});
    window.addEventListener('keydown',e=>{
      if(!el('lightbox').classList.contains('hidden')){if(e.key==='ArrowLeft'){this.showPhoto(this.photoIndex-1);e.preventDefault();}if(e.key==='ArrowRight'){this.showPhoto(this.photoIndex+1);e.preventDefault();}if(e.key==='Escape'){this.closePhoto();return;}}
      else if(e.key==='Escape'&&this.active){this.close();return;}
      const dialog=!el('lightbox').classList.contains('hidden')?el('lightbox'):this.active?el(this.active):!el('start-overlay').classList.contains('hidden')?el('start-overlay'):null;
      if(e.key==='Tab'&&dialog){const focusables=[...dialog.querySelectorAll('button,textarea,input,[tabindex="0"]')].filter(n=>n.offsetParent!==null);const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){last?.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first?.focus();e.preventDefault();}}
    });
    el('begin-btn').focus();
  },
  show(id){this.close(false);this.restoreFocus=document.activeElement;this.active=id;this.actions.stop();document.body.classList.add('in-modal');el(id).classList.remove('hidden');el(id).querySelector('button')?.focus();},
  close(restore=true){if(this.active)el(this.active).classList.add('hidden');this.active=null;document.body.classList.remove('in-modal');this.actions?.stop();if(restore)this.restoreFocus?.focus();},
  blocked(){return !!this.active||!el('lightbox').classList.contains('hidden');},
  setJourney(chapter,near){this.selected=chapter.id;el('journey-place').textContent=chapter.place;el('journey-title').textContent=chapter.title;const opened=this.state.opened.has(chapter.id);el('journey-go').textContent=near?(opened?'Open again ♡':'Open your surprise ♡'):'Take me there →';el('journey-count').textContent=this.state.opened.size?`${this.state.opened.size} little keepsakes`:'Made with love';},
  openPlaces(){this.show('places-modal');const grid=el('places-grid');grid.replaceChildren();for(const c of CHAPTERS){const b=document.createElement('button');b.className='place-card';const icon=document.createElement('span');icon.className='place-icon';icon.textContent=c.icon;const title=document.createElement('strong');title.textContent=c.place;const sub=document.createElement('small');sub.textContent=this.state.opened.has(c.id)?'Visit again ♡':'A surprise awaits';b.append(icon,title,sub);b.onclick=()=>{this.close();this.actions.travel(c.id);};grid.append(b);}},
  openGift(chapter){this.chapter=chapter;this.show('gift-modal');el('gift-place').textContent=chapter.place;el('gift-title').textContent=chapter.title;el('gift-sealed').classList.remove('hidden');el('gift-open').classList.add('hidden');el('gift-modal').classList.remove('unwrapped');if(this.state.opened.has(chapter.id))this.revealGift();},
  unwrap(){if(!el('gift-open').classList.contains('hidden'))return;this.state.opened.add(this.chapter.id);this.actions.opened(this.chapter.id);this.chime();el('gift-modal').classList.add('unwrapped');this.revealGift();el('gift-open').querySelector('button,textarea')?.focus();},
  revealGift(){const c=this.chapter;el('gift-sealed').classList.add('hidden');el('gift-open').classList.remove('hidden');el('gift-note').textContent=c.note;const grid=el('gift-photos');grid.replaceChildren();grid.className=c.photos.length===1?'single-photo':'photo-strip';for(const p of c.photos)grid.append(this.photoButton(p));el('wish-area').classList.toggle('hidden',!c.wish);el('wish-status').textContent='';el('wish-input').value='';el('lantern-release').classList.toggle('hidden',!c.finale);const real=el('real-gift');real.replaceChildren();real.classList.toggle('hidden',!c.gift);if(c.gift){const title=document.createElement('h3'),note=document.createElement('p');title.textContent=c.gift.title;note.textContent=c.gift.message;real.append(title,note);}el('gift-next').textContent=CHAPTERS.some(c=>!this.state.opened.has(c.id))?'Another little surprise →':'Revisit your album ♡';},
  photoButton(p){const b=document.createElement('button');b.className='photo-card';b.setAttribute('aria-label',`View photograph: ${p.caption}`);const img=document.createElement('img');img.src=p.src;img.alt=p.caption;img.loading='lazy';const cap=document.createElement('span');cap.textContent=p.caption;b.append(img,cap);b.onclick=()=>this.openPhoto(PHOTOS.findIndex(x=>x.src===p.src));return b;},
  openAlbum(){this.show('album-modal');const grid=el('album-grid');grid.replaceChildren();PHOTOS.forEach(p=>grid.append(this.photoButton(p)));},
  openPhoto(index){this.photoFocus=document.activeElement;this.showPhoto(index);el('lightbox').classList.remove('hidden');if(this.active)el(this.active).inert=true;el('lightbox-close').focus();},
  showPhoto(index){this.photoIndex=(index+PHOTOS.length)%PHOTOS.length;const p=PHOTOS[this.photoIndex],img=el('lightbox-img');img.src=p.src;img.alt=p.caption;el('lightbox-caption').textContent=p.caption;el('photo-position').textContent=`${this.photoIndex+1} / ${PHOTOS.length}`;},
  closePhoto(){el('lightbox').classList.add('hidden');if(this.active)el(this.active).inert=false;this.photoFocus?.focus();},
  banner(text){el('zone-banner').textContent=text;el('zone-banner').classList.add('show');clearTimeout(this._bannerT);this._bannerT=setTimeout(()=>el('zone-banner').classList.remove('show'),3200);},
  dialogue(name,text){el('dlg-name').textContent=name;el('dlg-text').textContent=text;el('dialogue').classList.remove('hidden');clearTimeout(this._dialogueT);this._dialogueT=setTimeout(()=>el('dialogue').classList.add('hidden'),4000);},
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
