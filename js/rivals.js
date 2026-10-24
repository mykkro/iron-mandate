/* Rival engine: scripted action queues, destroyable parts, and the rival turn. */
const QUEUE_SIZE=3;
const attackAction=(name,icon,damage,extra={})=>({name,icon,steps:[{type:'attack',damage,...extra}]});
Object.assign(ENEMIES[0],{portrait:'bert',script:[attackAction('Bucket bonk','💥',3)]});
Object.assign(ENEMIES[1],{portrait:'mechanic',script:[attackAction('Peer-reviewed explosion','💥',4),attackAction('Peer-reviewed explosion','💥',4),attackAction('Peer-reviewed explosion','💥',4,{bonus:3})]});
Object.assign(ENEMIES[2],{portrait:'foreman',script:[attackAction('Mandatory team building','📋',5),attackAction('Mandatory team building','📋',5),{name:'Mandatory team building',icon:'📋',steps:[{type:'attack',damage:5},{type:'repair',amount:4}]}]});
Object.assign(ENEMIES[3],{portrait:'frog',script:[attackAction('Cosmic ribbit','🐸',6)]});

const rivalDef=(b=battle)=>ENEMIES[b.enemy];
const crewCount=(b,key)=>b.crew.filter(k=>k===key).length;
const livingParts=(b,effect)=>(b.parts||[]).filter(p=>!p.destroyed&&(!effect||p.effect===effect));
function setupRival(b){
 const e=rivalDef(b);
 Object.assign(b,{queue:[],scriptPos:0,target:'rig',blocked:false,lastDamageTaken:0,parts:(e.parts||[]).map(p=>({...p,max:p.hull,destroyed:false}))});
 refillQueue(b);
}
function refillQueue(b){const s=rivalDef(b).script;while(b.queue.length<QUEUE_SIZE){b.queue.push(s[b.scriptPos%s.length]);b.scriptPos++}}
function basicAttack(e){for(const a of e.script){const s=a.steps.find(x=>x.type==='attack');if(s)return {name:a.name,...s}}return {name:e.intent,type:'attack',damage:e.damage}}
function attackDamage(b,step,turn=b.turn){
 const heads=livingParts(b,'bite').reduce((n,p)=>n+p.amount,0);
 return Math.max(0,step.damage+(step.bonus||0)+Math.floor((turn-1)/3)+heads-2*crewCount(b,'bodyguard'));
}
function hurt(b,r,amount){
 r.blocked=!!b.blocked&&amount>0;
 const dealt=b.blocked?0:amount;
 r.before=b.hull;b.hull=Math.max(0,b.hull-dealt);r.after=b.hull;r.dealt=dealt;
 if(dealt)log(`${rivalDef(b).name} dealt ${dealt} damage.`);
 return dealt;
}
function fallback(b,r,turn){Object.assign(r,{fallbackFrom:r.type},basicAttack(rivalDef(b)));return STEP_HANDLERS.attack(b,r,turn)}
const STEP_HANDLERS={
 attack(b,r,turn){r.scaling=Math.floor((turn-1)/3);return hurt(b,r,attackDamage(b,r,turn))},
 repair(b,r){const e=rivalDef(b);r.before=b.foe;b.foe=Math.min(e.hull,b.foe+r.amount);r.after=b.foe;r.amount=r.after-r.before;if(r.amount)log(`${r.name} repaired ${r.amount} Hull.`);return 0}
};
const STEP_TEXT={
 attack:(b,s,turn)=>`${attackDamage(b,s,turn)} damage`,
 repair:(b,s)=>`Repairs ${s.amount} Hull`
};
const STEP_RESULTS={
 attack:(r,t)=>r.blocked?`0 ${t.damage}<span>${t.blocked}</span>`:`${r.dealt} ${t.damage}<span>${t.yourRig}: ${r.before} → ${r.after} ${t.hull}</span>`,
 repair:(r,t)=>r.amount?`+${r.amount} ${t.hull}<span>${t.rivalRig}: ${r.before} → ${r.after} ${t.hull}</span>`:`<span>${t.noRepair}</span>`
};
function strongestMachine(list){return list.reduce((best,m)=>!best||CARDS[m.key].cost>CARDS[best.key].cost?m:best,null)}
Object.assign(STEP_HANDLERS,{
 tax(b,r){const paid=Math.min(r.amount,b.ore);b.ore-=paid;r.paid=paid;if(paid)log(`${rivalDef(b).name} collected ${paid} Ore.`);return hurt(b,r,(r.amount-paid)*2)},
 jam(b,r,turn){
  const m=strongestMachine(b.machines.filter(x=>x.builtTurn!==turn&&x.jamTurn!==turn+1));
  if(!m)return fallback(b,r,turn);
  m.jamTurn=turn+1;r.target=m.key;log(`${rivalDef(b).name} jammed ${CARDS[m.key].name}.`);return 0;
 },
 corrode(b,r,turn){
  const m=r.requires&&!livingParts(b).some(p=>p.id===r.requires)?null:strongestMachine(b.machines.filter(x=>!x.level));
  if(!m)return fallback(b,r,turn);
  b.machines.splice(b.machines.indexOf(m),1);b.discard.push(m.key);r.target=m.key;log(`${rivalDef(b).name} dissolved ${CARDS[m.key].name}.`);return 0;
 },
 junk(b,r){for(let n=0;n<r.count;n++)b.deck.splice(Math.floor(Math.random()*(b.deck.length+1)),0,'redtape');log(`${rivalDef(b).name} added ${r.count} Red Tape to your deck.`);return 0},
 regrow(b,r,turn){
  const p=b.parts.find(x=>x.destroyed);
  if(!p)return fallback(b,r,turn);
  Object.assign(p,{destroyed:false,hull:r.hull});r.target=p.name;log(`${rivalDef(b).name} regrew ${p.name}.`);return 0;
 }
});
Object.assign(STEP_TEXT,{
 tax:(b,s)=>`Takes ${s.amount} Ore`,
 jam:()=>'Jams a machine',
 corrode:()=>'Destroys a machine',
 junk:(b,s)=>`Adds ${s.count} Red Tape`,
 regrow:()=>'Regrows a head'
});
const cardLabel=key=>typeof translateText==='function'?translateText(CARDS[key].name):CARDS[key].name;
Object.assign(STEP_RESULTS,{
 tax:(r,t)=>`${t.collected} ${r.paid}${r.dealt||r.blocked?` · ${r.blocked?`0 ${t.damage}`:`${r.dealt} ${t.damage}`}`:''}<span>${t.ore}</span>`,
 jam:(r,t)=>`${t.jammed}: ${cardLabel(r.target)}`,
 corrode:(r,t)=>`${t.corroded}: ${cardLabel(r.target)}`,
 junk:(r,t)=>`+${r.count} ${t.junk}`,
 regrow:(r,t)=>`${t.regrown}: ${typeof translateText==='function'?translateText(r.target):r.target}`
});
const heads=[1,2,3].map(n=>({id:`head${n}`,name:`Head ${['I','II','III'][n-1]}`,hull:14,effect:'bite',amount:3,text:'While intact: +3 damage on every attack.'}));
ENEMIES.push(
 {name:'Sir Reginald Tax',title:'Tollgate Ridge',icon:'🎩',portrait:'taxman',hull:58,damage:5,intent:'Audit',
  description:'Collects a toll on every rock, breath and bad idea. Takes your Ore every few turns.',rewards:['rummage','brolly','ollie'],
  script:[attackAction('Audit','🧾',5),{name:'Collect Taxes',icon:'💰',steps:[{type:'tax',amount:3}]},attackAction('Audit','🧾',5)]},
 {name:'Madame Corrosion',title:'The Rust Marsh',icon:'🧪',portrait:'corrosion',hull:60,damage:5,intent:'Rust Spray',
  description:'Brews rust by the bucket. Jams your machines and dissolves the ones you never upgraded.',rewards:['whisperer','bodyguard','golem'],
  parts:[{id:'cauldron',name:'Rust Cauldron',hull:14,effect:'corrode',text:'While intact: Corrode destroys a machine.'}],
  script:[attackAction('Rust Spray','🌧️',5),{name:'Seize Up',icon:'🔩',steps:[{type:'jam'}]},{name:'Corrode',icon:'🧪',steps:[{type:'corrode',requires:'cauldron'}]}]},
 {name:'The Bureaucrat',title:'Ministry of Forms',icon:'🗂️',portrait:'bureaucrat',hull:64,damage:6,intent:'Stamp of Disapproval',
  description:'Has a stamp for everything, including you. Buries your deck in Red Tape.',rewards:['jam','spite','rummage'],
  parts:[{id:'cabinet',name:'Filing Cabinet',hull:12,effect:'repair',amount:3,text:'While intact: repairs 3 Hull each turn.'}],
  script:[attackAction('Stamp of Disapproval','🔖',6),{name:'File in Triplicate',icon:'🗂️',steps:[{type:'junk',count:2}]},attackAction('Stamp of Disapproval','🔖',6)]},
 {name:'The Clockwork Hydra',title:'The Gear Abyss',icon:'🐍',portrait:'hydra',hull:50,damage:2,intent:'Triple Bite',finale:true,
  description:'Three heads, zero manners. Every head bites harder, and they grow back.',rewards:['wrench','spite','golem'],
  parts:heads,
  script:[attackAction('Triple Bite','🐍',2),attackAction('Triple Bite','🐍',2),{name:'Regrow',icon:'⚙️',steps:[{type:'regrow',hull:8}]}],
  victory:{eyebrow:'CERTIFIED HYDRA WRANGLER',text:'You conquered the deepest mine. Experiment with your deck and challenge the crews again.'}}
);
ENEMIES[3].victory={eyebrow:'CERTIFIED FROG BOTHERER',text:'The mines go deeper… four new rivals wait below.'};
const activateBeforeJam=activate;
activate=function(i){const m=battle?.machines[i];if(m&&m.jamTurn===battle.turn)return toast('Jammed until next turn.');activateBeforeJam(i)};
function markJammed(b){
 app.querySelectorAll('.installed').forEach((el,i)=>{
  if(b.machines[i]?.jamTurn!==b.turn)return;
  el.classList.add('jammed');el.querySelector('.card').insertAdjacentHTML('beforeend','<span class="stamp jam-stamp">JAMMED</span>');
  const button=el.querySelector('[data-activate]');if(button){button.disabled=true;button.textContent='Jammed until next turn'}
 });
}
function stepResultMarkup(r,t){return STEP_RESULTS[r.type]?STEP_RESULTS[r.type](r,t):''}
async function endTurn(){
 const b=battle;if(!b||b.over||b.resolving)return;
 b.resolving=true;
 const action=b.queue.shift(),turn=b.turn;
 const steps=[...action.steps.map(s=>({...s,name:action.name})),...livingParts(b,'repair').map(p=>({type:'repair',amount:p.amount,name:p.name}))];
 const entry={turn,finished:false,actions:steps.map(s=>({...s,state:'queued'}))};
 (b.opponentTurns??=[]).push(entry);
 const update=()=>{if(view==='battle'&&battle===b)render()};
 update();
 let taken=0;
 for(const r of entry.actions){
  await actionDelay();if(battle!==b)return;
  taken+=STEP_HANDLERS[r.type]?STEP_HANDLERS[r.type](b,r,turn):0;
  r.state='resolved';
  if(check())break;
  update();
 }
 b.lastDamageTaken=taken;b.blocked=false;
 (b.actionHistory??=[]).push({name:action.name,damage:taken,turn});
 entry.finished=true;entry.defeat=b.hull<=0;b.resolving=false;
 if(b.over){update();return}
 refillQueue(b);
 b.turn++;b.power=3;b.tactic=false;b.machines.forEach(m=>m.used=false);
 b.discard.push(...b.hand.splice(0));draw();update();
}
// Actions that can't apply in the current state preview the attack they fall back to.
function willFallBack(b,s,turn){
 if(s.type==='regrow')return !b.parts.some(p=>p.destroyed);
 if(s.type==='corrode')return (s.requires&&!livingParts(b).some(p=>p.id===s.requires))||!b.machines.some(m=>!m.level);
 if(s.type==='jam')return !b.machines.some(m=>m.builtTurn!==turn&&m.jamTurn!==turn+1);
 return false;
}
function stepPreview(b,s,turn){
 if(willFallBack(b,s,turn))return STEP_TEXT.attack(b,basicAttack(rivalDef(b)),turn);
 return STEP_TEXT[s.type]?STEP_TEXT[s.type](b,s,turn):'';
}
function queueMarkup(b){
 const when=['NEXT','THEN','LATER'];
 return `<div class="zone-label">NEXT ACTIONS</div><ol class="rival-queue">${b.queue.map((a,i)=>`<li class="queue-card ${i?'later':'next'} ${!i&&b.blocked?'blocked':''}"><span class="queue-when">${when[i]}</span><span class="queue-icon" aria-hidden="true">${a.icon}</span><strong>${a.name}</strong>${a.steps.map(s=>`<span class="queue-effect">${stepPreview(b,s,b.turn+i)}</span>`).join('')}${!i&&b.blocked?'<span class="stamp">BLOCKED</span>':''}</li>`).join('')}</ol>`;
}
const battleBeforeRivals=renderBattle;
renderBattle=function(){
 battleBeforeRivals();
 const b=battle,zone=app.querySelector('.intent-zone');
 zone.innerHTML=queueMarkup(b)+partsMarkup(b);
 zone.querySelectorAll('[data-target]').forEach(el=>el.onclick=()=>setTarget(el.dataset.target));
 markRigTarget(b);
 markJammed(b);
};
function targetPart(b=battle){return b.target==='rig'?null:livingParts(b).find(p=>p.id===b.target)||null}
function setTarget(id){const b=battle;if(!b||b.over)return;b.target=livingParts(b).some(p=>p.id===id)?id:'rig';render()}
function dealDamage(amount){
 const b=battle,part=targetPart(b);
 if(!part){b.foe-=amount;return}
 part.hull=Math.max(0,part.hull-amount);
 if(!part.hull){part.destroyed=true;b.target='rig';log(`${part.name} destroyed.`)}
}
function partsMarkup(b){
 if(!b.parts.length)return '';
 return `<div class="rival-parts">${b.parts.map(p=>`<button class="rival-part ${p.destroyed?'destroyed':''} ${b.target===p.id?'is-target':''}" data-target="${p.id}" aria-pressed="${b.target===p.id}" ${p.destroyed||b.over?'disabled':''}><strong>${p.name}</strong><span class="part-hull">${p.hull} / ${p.max} Hull</span><span class="health"><i style="width:${p.hull/p.max*100}%"></i></span><small>${p.text}</small>${b.target===p.id?'<em class="target-tag">🎯 TARGET</em>':''}${p.destroyed?'<span class="stamp">SCRAPPED</span>':''}</button>`).join('')}</div>`;
}
function markRigTarget(b){
 const rig=app.querySelector('.rival-rig');if(!rig||!b.parts.length)return;
 rig.classList.add('targetable');rig.classList.toggle('is-target',b.target==='rig');
 Object.assign(rig,{tabIndex:0,onclick:()=>setTarget('rig'),onkeydown:ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();setTarget('rig')}}});
 rig.setAttribute('role','button');rig.setAttribute('aria-pressed',String(b.target==='rig'));rig.setAttribute('aria-label','Target the rival rig');
 if(b.target==='rig')rig.insertAdjacentHTML('beforeend','<em class="target-tag">🎯 TARGET</em>');
}
render();
