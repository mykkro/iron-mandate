/* Tap card art or a crew portrait during battle to open the large card preview. */
function makePreviewTarget(el,label,open){
 el.classList.add('preview-target');el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',label);el.removeAttribute('aria-hidden');
 el.onclick=event=>{event.stopPropagation();open()};
 el.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}};
}
const battleBeforeCardPreview=renderBattle;
renderBattle=function(){
 battleBeforeCardPreview();
 app.querySelectorAll('.hand-zone .card .art').forEach((el,i)=>makePreviewTarget(el,`View ${CARDS[battle.hand[i]].name}`,()=>inspectBattleCard('hand',i)));
 app.querySelectorAll('.installed .card .art').forEach((el,i)=>makePreviewTarget(el,`View ${CARDS[battle.machines[i].key].name}`,()=>inspectBattleCard('machine',i)));
 app.querySelectorAll('.crew-mini>span').forEach((el,i)=>makePreviewTarget(el,`View ${CARDS[battle.crew[i]].name}`,()=>inspectHiredCrew(i)));
 const tactic=app.querySelector('.last-tactic>.painted-art');
 if(tactic&&battle.lastTactic){const key=battle.lastTactic;makePreviewTarget(tactic,`View ${CARDS[key].name}`,()=>showWorkshopCard(key))}
};
const discardBeforeCardPreview=inspectDiscard;
inspectDiscard=function(){
 discardBeforeCardPreview();
 const keys=[...battle.discard].reverse();
 document.querySelectorAll('#discard-view .card .art').forEach((el,i)=>makePreviewTarget(el,`View ${CARDS[keys[i]].name}`,()=>showWorkshopCard(keys[i])));
};
render();
