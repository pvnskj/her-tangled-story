// V3 original procedural soundscape: guitar-like plucks, pub cheers,
// cave crystals, village festivity, royal strings and dark cello tones.
// No external audio assets, copyrighted recordings or network dependency.
export function createSoundscapeV3(UI){
 let started=false,lastStep=-1,current='tower',lastChange=-20;
 const palettes={
   tower:[293.66,369.99,440,587.33,440,369.99],
   forest:[329.63,392,493.88,587.33,493.88,392],
   tavern:[392,493.88,587.33,659.26,587.33,493.88],
   cave:[246.94,329.63,392,493.88,392,329.63],
   village:[392,523.25,659.26,783.99,659.26,523.25],
   castle:[349.23,440,523.25,698.46,523.25,440],
   dark:[164.81,196,246.94,293.66,246.94,196],
   sundrop:[440,554.37,659.26,880,659.26,554.37],
   lake:[293.66,440,587.33,739.99,587.33,440]
 };
 function context(){return UI._audio && !UI._muted ? UI._audio : null;}
 function pluck(freq,when=0,vol=.055){
  const ctx=context();if(!ctx)return;
  const start=ctx.currentTime+when;
  // Three harmonics and exponential damping emulate a quiet nylon guitar.
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1900;
  const master=ctx.createGain();master.gain.setValueAtTime(vol,start);
  master.gain.exponentialRampToValueAtTime(.0001,start+1.25);
  filter.connect(master).connect(ctx.destination);
  [1,2,3].forEach((ratio,i)=>{
   const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';
   o.frequency.setValueAtTime(freq*ratio,start);
   g.gain.value=[.7,.19,.07][i];o.connect(g).connect(filter);
   o.start(start);o.stop(start+1.3);
  });
 }
 function string(freq,duration=.9,vol=.052){
  const ctx=context();if(!ctx)return;
  const start=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();
  const low=ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=740;
  o.type='sawtooth';o.frequency.value=freq;
  g.gain.setValueAtTime(.0001,start);
  g.gain.linearRampToValueAtTime(vol,start+.16);
  g.gain.exponentialRampToValueAtTime(.0001,start+duration);
  o.connect(low).connect(g).connect(ctx.destination);o.start(start);o.stop(start+duration+.05);
 }
 function chime(freq=988){
  const ctx=context();if(!ctx)return;
  const t=ctx.currentTime,osc=ctx.createOscillator(),amp=ctx.createGain();
  osc.type='sine';osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(freq*.93,t+.8);
  amp.gain.setValueAtTime(.0001,t);amp.gain.linearRampToValueAtTime(.11,t+.02);amp.gain.exponentialRampToValueAtTime(.0001,t+1.1);
  osc.connect(amp).connect(ctx.destination);osc.start(t);osc.stop(t+1.15);
 }
 function cheer(){
  const ctx=context();if(!ctx)return;
  // A short warm whoop (two pitched voices), not a prerecorded sound.
  const t=ctx.currentTime;
  for(let i=0;i<4;i++){
   const o=ctx.createOscillator(),g=ctx.createGain();
   o.type='triangle';o.frequency.setValueAtTime(320+i*60,t+i*.07);
   o.frequency.linearRampToValueAtTime(460+i*78,t+.25+i*.07);
   g.gain.setValueAtTime(.0001,t+i*.07);
   g.gain.linearRampToValueAtTime(.042,t+.09+i*.07);
   g.gain.exponentialRampToValueAtTime(.0001,t+.55+i*.07);
   o.connect(g).connect(ctx.destination);o.start(t+i*.07);o.stop(t+.65+i*.07);
  }
 }
 return {
  start(){started=true;UI._ensureAudio();pluck(293.66,0,.08);pluck(440,.25,.06);pluck(587.33,.5,.06);},
  zone(id){
   if(!palettes[id]||id===current)return;
   current=id;
   if(!started)return;
   if(id==='castle')string(349.23,1.7,.044);
   if(id==='dark')string(146.83,2.5,.038);
   if(id==='sundrop')chime(1174.66);
  },
  discover(clue){
   if(!started)return;
   if(clue.zone==='tavern'){cheer();pluck(523.25,.25,.07);return;}
   if(clue.zone==='cave'){chime(1174.66);setTimeout(()=>chime(1567.98),190);return;}
   if(clue.zone==='dark'){string(146.83,2.2,.065);return;}
   if(clue.zone==='castle'){string(523.25,1.4,.05);return;}
   if(clue.zone==='sundrop'){chime(1318.51);return;}
   if(clue.zone==='lake'){pluck(440,.05,.065);chime(880);return;}
   pluck(palettes[clue.zone]?.[3]||587.33,0,.075);
  },
  finale(){
    if(!started)return;
    [293.66,369.99,440,587.33,739.99,880].forEach((n,i)=>pluck(n,i*.28,.075));
    string(293.66,3,.042);
  },
  update(time){
   if(!started||!context())return;
   const step=Math.floor(time*1.28);
   if(step===lastStep)return;
   lastStep=step;
   const notes=palettes[current]||palettes.tower;
   const i=(step%notes.length+notes.length)%notes.length;
   if(current==='dark'){if(i%3===0)string(notes[i]/2,1.45,.022);}
   else if(current==='castle'){if(i%2===0)string(notes[i],1.3,.025);}
   else pluck(notes[i],0,current==='tavern'?.048:.035);
  }
 };
}
