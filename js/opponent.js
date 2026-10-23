/* Resolve real rival effects one at a time, retaining every turn's full record. */
const ACTION_COPY={
 en:{heading:'Opponent turn',empty:'No opponent actions yet. End your turn to let the rival act.',attack:'Attack',repair:'Repair',damage:'damage',hull:'Hull',yourRig:'Your rig',rivalRig:'Rival rig',noRepair:'Already at full Hull',history:'All opponent turns',close:'Close opponent history',turn:'Turn',acting:'Opponent acting…',done:'Your turn',lost:'Your rig is down',queued:'Waiting',completed:'Resolved',bonus:'Includes a +3 barrage bonus',scaling:'Escalation bonus',historyTitle:'Opponent action history'},
 cs:{heading:'Soupeřův tah',empty:'Soupeř zatím nehrál. Ukonči kolo a pusť ho na tah.',attack:'Útok',repair:'Oprava',damage:'poškození',hull:'odolnost',yourRig:'Tvůj stroj',rivalRig:'Soupeřův stroj',noRepair:'Odolnost už je plná',history:'Všechny soupeřovy tahy',close:'Zavřít historii soupeře',turn:'Kolo',acting:'Soupeř hraje…',done:'Jsi na tahu',lost:'Tvůj stroj je zničený',queued:'Čeká',completed:'Provedeno',bonus:'Včetně bonusu +3 za salvu',scaling:'Bonus za delší boj',historyTitle:'Historie soupeřových akcí'}
};
const actionCopy=()=>ACTION_COPY[typeof language!=='undefined'&&language==='cs'?'cs':'en'];
function opponentActionMarkup(action,index){
 const t=actionCopy(),isAttack=action.type==='attack';
 action={...action,name:typeof translateText==='function'?translateText(action.name||''):action.name};
 return `<li class="opponent-event ${action.state}" data-action-step="${index}"><span class="event-number">${index+1}</span><div><strong>${isAttack?action.name:t.repair}</strong><div class="event-effect">${isAttack?`${action.amount} ${t.damage}`:`+${action.amount} ${t.hull}`}<span>${isAttack?t.yourRig:t.rivalRig}: ${action.before} → ${action.after} ${t.hull}</span></div>${!isAttack&&action.amount===0?`<small>${t.noRepair}</small>`:''}${action.bonus?`<small>${t.bonus}</small>`:''}${action.scaling?`<small>${t.scaling}: +${action.scaling}</small>`:''}</div><span class="event-state">${action.state==='queued'?t.queued:t.completed}</span></li>`;
}
function opponentTurnMarkup(entry){
 const t=actionCopy();
 return `<div class="opponent-turn-record"><div class="opponent-turn-label">${t.turn} ${entry.turn} <span>${entry.finished?(entry.defeat?t.lost:t.done):t.acting}</span></div><ol class="opponent-events">${entry.actions.map(opponentActionMarkup).join('')}</ol></div>`;
}
function refreshOpponentUI(){
 const panel=document.querySelector('#opponent-sequence');if(!panel||!battle)return;
 panel.dataset.locale=typeof language!=='undefined'?language:'en';
 const t=actionCopy(),turns=battle.opponentTurns||[],latest=turns.at(-1);
 panel.innerHTML=`<div class="sequence-heading"><h3>${t.heading}</h3><button id="opponent-history" ${turns.length?'':'disabled'}>${t.history} (${turns.length})</button></div><div aria-live="polite" aria-atomic="true">${latest?opponentTurnMarkup(latest):`<p class="sequence-empty">${t.empty}</p>`}</div>`;
 document.querySelector('#opponent-history').onclick=showOpponentHistory;
 if(battle.resolving){
  app.querySelectorAll('[data-play],[data-activate],[data-upgrade],[data-scrap],#end,#leave').forEach(button=>button.disabled=true);
  document.querySelector('#end').textContent=t.acting;
 }
}
const renderBeforeActions=renderBattle;
renderBattle=function(){
 renderBeforeActions();
 const panel=document.createElement('section');panel.id='opponent-sequence';panel.className='opponent-sequence';panel.setAttribute('aria-label','Opponent actions');panel.dataset.languageControl='true';
 document.querySelector('.opponent-side').append(panel);refreshOpponentUI();
};
function showOpponentHistory(){
 let dialog=document.querySelector('#opponent-history-dialog');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='opponent-history-dialog';dialog.dataset.languageControl='true';document.body.append(dialog)}
 const t=actionCopy();dialog.innerHTML=`<button class="close" aria-label="${t.close}">×</button><h2>${t.historyTitle}</h2>${[...(battle.opponentTurns||[])].reverse().map(opponentTurnMarkup).join('')}`;
 dialog.querySelector('.close').onclick=()=>dialog.close();dialog.showModal();
}
const actionDelay=()=>new Promise(resolve=>setTimeout(resolve,window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:650));
endTurn=async function(){
 const b=battle;if(!b||b.over||b.resolving)return;
 b.resolving=true;
 const e=ENEMIES[b.enemy],amount=damageNext();
 const entry={turn:b.turn,finished:false,actions:[{type:'attack',name:e.intent,amount,before:b.hull,after:Math.max(0,b.hull-amount),state:'queued',scaling:Math.floor((b.turn-1)/3),bonus:b.enemy===1&&b.turn%3===0}]};
 if(b.enemy===2&&b.turn%3===0)entry.actions.push({type:'repair',amount:Math.min(4,e.hull-b.foe),before:b.foe,after:Math.min(e.hull,b.foe+4),state:'queued'});
 (b.opponentTurns??=[]).push(entry);
 const update=()=>{if(view==='battle'&&battle===b)render()};
 update();
 for(const action of entry.actions){
  await actionDelay();if(battle!==b)return;
  if(action.type==='attack'){b.hull=action.after;log(`${e.name} dealt ${action.amount} damage.`)}
  else{b.foe=action.after;log(`The Foreman repaired ${action.amount} Hull.`)}
  action.state='resolved';update();
 }
 (b.actionHistory??=[]).push({name:e.intent,damage:amount,turn:b.turn,repair:entry.actions.some(a=>a.type==='repair')});
 entry.finished=true;entry.defeat=b.hull<=0;b.resolving=false;
 if(check()){update();return}
 b.turn++;b.power=3;b.tactic=false;b.machines.forEach(m=>m.used=false);
 b.discard.push(...b.hand.splice(0));draw();update();
};
// Guard keyboard, dialog, and programmatic actions during the opponent's turn too.
const playBeforeOpponentGuard=play;play=function(i){if(!battle?.resolving)playBeforeOpponentGuard(i)};
const activateBeforeOpponentGuard=activate;activate=function(i){if(!battle?.resolving)activateBeforeOpponentGuard(i)};
const upgradeBeforeOpponentGuard=upgrade;upgrade=function(i){if(!battle?.resolving)upgradeBeforeOpponentGuard(i)};
const scrapBeforeOpponentGuard=scrap;scrap=function(i){if(!battle?.resolving)scrapBeforeOpponentGuard(i)};
