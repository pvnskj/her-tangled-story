// Draft-only cinematic prologue. Independent of the existing Three.js game.
const root=document.createElement('section');
root.id='storybook-intro';root.dataset.scene='cloud';root.setAttribute('aria-label','A magical beginning');
root.innerHTML=`<div class="story-cloud one"></div><div class="story-cloud two"></div><div class="story-sunbeam"></div><div class="story-tower" aria-hidden="true"><i></i><b></b></div><div class="story-stage"><div class="story-kicker">A birthday fairytale</div><div class="story-flower" aria-hidden="true"><div class="stem"></div>${Array.from({length:6},(_,i)=>`<div class="petal" style="--r:${i*60}deg"></div>`).join('')}</div><h1 class="story-title">Her Tangled Story</h1><p class="story-copy" aria-live="polite">Once upon a time, a little golden light found its way into the world…</p><button class="story-action" type="button">Follow the light</button><button class="story-skip" type="button">Skip introduction</button></div>`;
document.body.append(root);
const copy=root.querySelector('.story-copy'),action=root.querySelector('.story-action');
let stage=0;
const chapters=[
  'Once upon a time, a little golden light found its way into the world…',
  'It became a flower, carrying a magic that could illuminate the most precious moments.',
  'Far beyond the clouds, a kingdom was waiting. And every path held a memory.',
  'Today, the story belongs to you.'
];
function close(){document.getElementById('begin-btn')?.click();root.classList.add('fade-out');root.addEventListener('transitionend',()=>root.remove(),{once:true});setTimeout(()=>root.remove(),1100)}
action.addEventListener('click',()=>{stage++;if(stage>=chapters.length){close();return}root.dataset.scene=['cloud','flower','kingdom','tower'][stage];copy.textContent=chapters[stage];action.textContent=stage===chapters.length-1?'Enter the kingdom':'Continue'});
root.querySelector('.story-skip').addEventListener('click',close);
