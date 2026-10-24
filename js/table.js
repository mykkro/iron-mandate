/* Table presentation; existing card rules and save data are unchanged. */
const originalPlay=play;
play=function(i){
 const b=battle,k=b.hand[i],before=b.hand.length;
 originalPlay(i);
 if(b.hand.length<before&&CARDS[k].type==='tactic'){
  b.lastTactic=k;
  if(!reward&&view==='battle')renderBattle();
 }
};
function tablePile(kind,count,content,clickable=false){
 return `<${clickable?'button':'div'} class="table-pile ${kind} ${count?'':'is-empty'}" ${clickable?'id="inspect-discard" aria-label="Inspect discard pile"':''}><span class="pile-face">${content}</span><strong>${count}</strong><span class="pile-name">${kind==='draw-pile'?'Draw pile':'Discard pile'}</span></${clickable?'button':'div'}>`;
}
function inspectDiscard(){
 let dialog=document.querySelector('#discard-view');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='discard-view';document.body.append(dialog)}
 dialog.innerHTML=`<button class="close" aria-label="Close discard pile">×</button><div class="eyebrow">THE SLIGHTLY USED DEPARTMENT</div><h2>Discard pile · ${battle.discard.length} cards</h2><p>Newest cards first. These reshuffle into your draw pile when it runs out.</p><div class="collection-grid">${[...battle.discard].reverse().map(k=>card(k)).join('')||'<p>No cards here yet. Give it a turn.</p>'}</div>`;
 dialog.querySelector('.close').onclick=()=>dialog.close();dialog.showModal();
}
function renderBattle(){
 const b=battle,e=ENEMIES[b.enemy],history=b.actionHistory||[],last=history.at(-1);
 const machine=(m,i)=>{
  const c=CARDS[m.key],value=machineOutput(m),cost=Math.max(1,3-b.crew.filter(x=>x==='mechanic').length);
  return `<div class="installed ${m.used?'exhausted':''}">${card(m.key,`<div class="installed-output">${m.level?'★ Upgraded · ':''}${c.effect==='attack'?`${value} damage / ${c.activation} Power`:`Gain ${value} ${c.effect==='ore'?'Ore':'Power'}`}</div><button data-activate="${i}" ${m.used||b.over||b.power<(c.activation||0)?'disabled':''}>${m.builtTurn===b.turn?'Ready next turn':m.used?'✓ Used this turn':'Activate'}</button><div class="machine-options"><button data-upgrade="${i}" ${m.level||b.over||b.ore<cost?'disabled':''}>${m.level?'Upgraded':`Upgrade ${cost} Ore`}</button><button data-scrap="${i}" ${b.over?'disabled':''}>Scrap +1 Ore</button></div>`)}</div>`;
 };
 app.innerHTML=`<div class="battle-top"><div><div class="eyebrow">${e.title.toUpperCase()} · TURN ${b.turn}</div><h2>${b.over?'The wheels have left the chat.':'Welcome to the clank table.'}</h2></div><div class="resources"><div class="resource"><b>${b.ore}</b> Ore</div><div class="resource"><b>${b.power}</b> Power</div><button class="primary" id="end" ${b.over?'disabled':''}>End turn →</button></div></div>
 <div class="game-table">
 <section class="opponent-side" aria-label="Rival play area"><div class="table-status"><div><span class="eyebrow">RIVAL PLAY AREA</span><h3>${e.icon} ${e.name}</h3></div><div class="hull-label">${b.foe} / ${e.hull} Hull<div class="health"><i style="width:${b.foe/e.hull*100}%"></i></div></div></div>
 <div class="opponent-layout"><div class="rival-rig"><span class="rival-portrait">${e.icon}</span><strong>${e.name}</strong><span>Automated rival rig</span></div><div class="intent-zone"></div><div class="action-pile"><div class="zone-label">COMPLETED ACTIONS · ${history.length}</div><div class="past-action ${last?'':'is-empty'}">${last?`<span>💨</span><strong>${last.name}</strong><span>Turn ${last.turn} · ${last.damage} damage${last.repair?' · +4 Hull':''}</span>`:'No bonks yet.'}</div></div></div></section>
 <section class="shared-strip" aria-label="Common play area"><span class="zone-label">COMMON AREA · LAST TACTIC</span>${b.lastTactic?`<span class="last-tactic">${CARDS[b.lastTactic].symbol} <b>${CARDS[b.lastTactic].name}</b><span>${CARDS[b.lastTactic].text}</span></span>`:'<span class="table-hint">A suspiciously clean patch of table. Play a tactic to fix that.</span>'}<span class="table-hint">Rival damage grows every 3 turns.</span></section>
 <section class="player-side" aria-label="Your play area"><div class="table-status"><div><span class="eyebrow">YOUR PLAY AREA</span><h3>🛠️ The Probably Fine</h3></div><div class="hull-label">${b.hull} / 40 Hull<div class="health"><i style="width:${b.hull/40*100}%"></i></div></div></div>
 <div class="player-layout"><div class="piles">${tablePile('draw-pile',b.deck.length,'<span class="card-back-mark">⚙</span><span>IRON MANDATE</span>')}${tablePile('discard-pile',b.discard.length,b.discard.length?`<span class="discard-symbol">${CARDS[b.discard.at(-1)].symbol}</span><span>${CARDS[b.discard.at(-1)].name}</span>`:'<span>↻</span><span>Nothing yet</span>',true)}</div>
 <div class="machine-zone"><div class="zone-label">MACHINES · ${b.machines.length} / 3</div><div class="table-machines">${[0,1,2].map(i=>b.machines[i]?machine(b.machines[i],i):`<div class="card-slot"><span>＋</span><b>Machine ${i+1}</b><small>Park nonsense here</small></div>`).join('')}</div></div>
 <div class="crew-zone"><div class="zone-label">CREW · ${b.crew.length} / 2</div><div class="table-crew">${[0,1].map(i=>b.crew[i]?`<div class="crew-mini"><span>${CARDS[b.crew[i]].symbol}</span><strong>${CARDS[b.crew[i]].name}</strong><small>${CARDS[b.crew[i]].text}</small></div>`:'<div class="crew-slot">＋<small>Crew seat<br>Snacks included</small></div>').join('')}</div></div></div></section>
 <section class="hand-zone" aria-label="Your hand"><div class="hand-heading"><span class="zone-label">YOUR HAND · ${b.hand.length} CARDS</span><span>Unused cards go to discard at turn end. Draw back to five.</span></div><div class="hand">${b.hand.map((k,i)=>card(k,`<button data-play="${i}" ${b.over||b[payResource(CARDS[k])]<CARDS[k].cost?'disabled':''}>${CARDS[k].type==='machine'?'Build':CARDS[k].type==='crew'?'Recruit':CARDS[k].junk?'Throw away':'Play'} · ${CARDS[k].cost} ${payResource(CARDS[k])==='power'?'Power':'Ore'}</button>`)).join('')}</div></section></div>
 <div class="table-bottom"><details class="table-journal"><summary>Clank log · ${b.logs[0]}</summary>${b.logs.map(t=>`<p>${t}</p>`).join('')}</details><button id="leave">${b.over?'Return to expedition':'Retreat to camp'}</button></div>`;
 document.querySelector('#end').onclick=endTurn;
 document.querySelector('#leave').onclick=()=>{battle=null;view='campaign';render()};
 document.querySelector('#inspect-discard').onclick=inspectDiscard;
 for(const [attr,fn]of[['play',play],['activate',activate],['upgrade',upgrade],['scrap',scrap]])app.querySelectorAll(`[data-${attr}]`).forEach(el=>el.onclick=()=>fn(+el.dataset[attr]));
}
