/* Defeat screen: once the rig falls, cover the table with a clear loss panel and ways forward. */
function defeatMarkup(b){
 const e=ENEMIES[b.enemy];
 return `<div class="defeat-overlay" role="dialog" aria-modal="true" aria-labelledby="defeat-title"><section class="defeat-panel"><span class="stamp defeat-stamp">DEFEATED</span><div class="eyebrow">YOUR RIG IS SCRAP</div><h1 id="defeat-title">You have been defeated.</h1><p class="defeat-foe"><span class="defeat-icon" aria-hidden="true">${e.icon}</span><strong>${e.name}</strong></p><dl class="defeat-stats"><div><dt>Turns survived</dt><dd>${b.turn}</dd></div><div><dt>Rival Hull left</dt><dd>${b.foe} / ${e.hull}</dd></div></dl><p>Your cards are safe. Tune your deck in the Workshop and try again.</p><div class="defeat-actions"><button class="primary" id="defeat-retry">Try again</button><button id="defeat-workshop">Go to Workshop</button><button id="defeat-camp">Return to expedition</button></div><button class="defeat-peek" id="defeat-peek">Look at the wreck</button></section></div>`;
}
const battleBeforeDefeat=renderBattle;
renderBattle=function(){
 battleBeforeDefeat();
 const b=battle;if(!b.over||b.hull>0||b.resolving)return;
 const top=app.querySelector('.battle-top h2');if(top)top.textContent='You have been defeated.';
 const leave=to=>{battle=null;view=to;render()},retry=()=>{const enemy=b.enemy;battle=null;startBattle(enemy)};
 if(b.defeatPeek){
  app.querySelector('#leave')?.insertAdjacentHTML('beforebegin','<button class="primary" id="defeat-again">Try again</button>');
  app.querySelector('#defeat-again').onclick=retry;
  return;
 }
 app.insertAdjacentHTML('beforeend',defeatMarkup(b));
 app.querySelector('#defeat-retry').onclick=retry;
 app.querySelector('#defeat-workshop').onclick=()=>leave('collection');
 app.querySelector('#defeat-camp').onclick=()=>leave('campaign');
 app.querySelector('#defeat-peek').onclick=()=>{b.defeatPeek=true;render()};
 app.querySelector('#defeat-retry').focus();
};
