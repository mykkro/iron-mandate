/* Original local WAV effects. No network, autoplay, or sound-dependent rules. */
const GameSound=(()=>{
 const names=['ore','power','deal-damage','take-damage','repair','build','scrap','upgrade','draw','turn','reward','victory','defeat'];
 let settings={enabled:true,volume:.35};
 try{const saved=JSON.parse(localStorage.getItem('deepforge-sound'));if(saved&&typeof saved.enabled==='boolean'&&Number.isFinite(saved.volume))settings={enabled:saved.enabled,volume:Math.max(0,Math.min(1,saved.volume))}}catch{}
 let interacted=false;
 const voices=new Set(),recent=new Map();
 const samples=Object.fromEntries(names.map(name=>{const sample=new Audio(`assets/audio/${name}.wav`);sample.preload='auto';return[name,sample]}));
 const unlock=()=>{interacted=true};
 document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
 const saveSettings=()=>{try{localStorage.setItem('deepforge-sound',JSON.stringify(settings))}catch{}};
 function stop(){voices.forEach(audio=>{audio.pause();audio.currentTime=0});voices.clear()}
 function play(name,delay=0){
  if(!interacted||!settings.enabled||settings.volume===0||document.hidden||!samples[name])return;
  if(delay){setTimeout(()=>play(name),delay);return}
  const now=performance.now();if(now-(recent.get(name)??-Infinity)<90)return;recent.set(name,now);
  while(voices.size>=4){const oldest=voices.values().next().value;oldest.pause();voices.delete(oldest)}
  const audio=samples[name].cloneNode();audio.volume=settings.volume;voices.add(audio);
  const cleanup=()=>voices.delete(audio);audio.addEventListener('ended',cleanup,{once:true});audio.addEventListener('error',cleanup,{once:true});
  try{audio.play()?.catch(cleanup)}catch{cleanup()}
 }
 function configure(values){Object.assign(settings,values);saveSettings();if(!settings.enabled||settings.volume===0)stop();else voices.forEach(audio=>audio.volume=settings.volume);updateButton()}
 const control=document.createElement('button');control.id='sound-control';control.textContent='SFX';document.querySelector('header').append(control);
 function updateButton(){control.textContent=settings.enabled&&settings.volume>0?'SFX':'SFX ×';control.setAttribute('aria-label',settings.enabled?'Sound settings':'Sound settings (muted)')}
 function showSettings(){
  let dialog=document.querySelector('#sound-settings');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='sound-settings';document.body.append(dialog)}
  dialog.innerHTML=`<button class="close" aria-label="Close sound settings">×</button><div class="eyebrow">WORKSHOP ACOUSTICS</div><h2>Clanks, sparks & questionable noises</h2><label class="sound-toggle"><input id="sound-enabled" type="checkbox" ${settings.enabled?'checked':''}><span>Sound effects</span></label><label class="sound-volume" for="sound-volume">Volume <output id="sound-level">${Math.round(settings.volume*100)}%</output></label><input id="sound-volume" type="range" min="0" max="100" value="${Math.round(settings.volume*100)}"><p>Short effects for resources, cards, machines and battle. Your setting is saved in this browser.</p><div class="sound-previews"><button data-preview-sound="ore">Ore</button><button data-preview-sound="power">Power</button><button data-preview-sound="take-damage">Damage</button><button data-preview-sound="reward">Card reward</button></div>`;
  dialog.querySelector('.close').onclick=()=>dialog.close();
  dialog.querySelector('#sound-enabled').onchange=event=>configure({enabled:event.target.checked});
  dialog.querySelector('#sound-volume').oninput=event=>{const volume=+event.target.value/100;configure({volume});dialog.querySelector('#sound-level').textContent=Math.round(volume*100)+'%'};
  dialog.querySelectorAll('[data-preview-sound]').forEach(button=>button.onclick=()=>play(button.dataset.previewSound));dialog.showModal();
 }
 control.onclick=showSettings;updateButton();
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 let previous=null,totalCards=Object.values(saveCollection()).reduce((a,b)=>a+b,0);
 function saveCollection(){return save.owned}
 function snapshot(){return battle?{ref:battle,hull:battle.hull,foe:battle.foe,ore:battle.ore,power:battle.power,turn:battle.turn,over:battle.over,machines:battle.machines.length,crew:battle.crew.length,upgrades:battle.machines.reduce((n,m)=>n+m.level,0)}:null}
 function sync(){
  const count=Object.values(save.owned).reduce((a,b)=>a+b,0);if(count>totalCards)play('reward');totalCards=count;
  const current=snapshot();
  if(!current){previous=null;return}
  if(!previous||previous.ref!==current.ref){previous=current;play('draw');return}
  const old=previous;previous=current;
  if(!old.over&&current.over){play(current.hull<=0?'defeat':'victory');return}
  let delay=0;
  const cue=name=>{play(name,delay);delay+=85};
  if(current.foe<old.foe)cue('deal-damage');
  if(current.hull<old.hull)cue('take-damage');
  if(current.hull>old.hull||current.foe>old.foe)cue('repair');
  if(current.machines>old.machines||current.crew>old.crew)cue('build');
  if(current.machines<old.machines)cue('scrap');
  if(current.upgrades>old.upgrades)cue('upgrade');
  if(current.ore>old.ore)cue('ore');
  if(current.turn>old.turn){cue('turn');cue('draw')}
  else if(current.power>old.power)cue('power');
 }
 return {play,sync,configure,stop,get settings(){return {...settings}}};
})();
const renderBeforeSound=render;
render=function(){renderBeforeSound();GameSound.sync()};
const battleBeforeSound=renderBattle;
renderBattle=function(){battleBeforeSound();GameSound.sync()};
GameSound.sync();
