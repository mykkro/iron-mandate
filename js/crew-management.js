function dismissCrew(index){
 const b=battle;
 if(!b||b.over||b.resolving||!Number.isInteger(index)||index<0||index>=b.crew.length)return;
 const key=b.crew.splice(index,1)[0];
 b.discard.push(key);
 log(`${CARDS[key].name}: dismissed to discard pile.`);
 render();
}
function inspectHiredCrew(index){
 if(!battle?.crew[index])return;
 let dialog=document.querySelector('#card-inspector');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='card-inspector';document.body.append(dialog)}
 dialog.setAttribute('aria-label','Card details and actions');
 dialog.innerHTML=`<button class="close" aria-label="Close card details">X</button>${card(battle.crew[index],`<p class="dismiss-note">Dismiss for free. This card goes to your discard pile. No Ore is refunded.</p><button data-dismiss-crew="${index}" ${battle.over||battle.resolving?'disabled':''}>Dismiss crew</button>`)}`;
 dialog.querySelector('.close').onclick=()=>dialog.close();
 dialog.querySelector('[data-dismiss-crew]').onclick=()=>{dialog.close();dismissCrew(index)};
 dialog.showModal();if(typeof localizePage==='function')localizePage();
}
const battleBeforeCrewManagement=renderBattle;
renderBattle=function(){
 battleBeforeCrewManagement();
 app.querySelectorAll('.crew-mini').forEach((el,index)=>{
  const controls=document.createElement('div');controls.className='crew-management';
  controls.innerHTML=`<button data-dismiss-crew="${index}" ${battle.over||battle.resolving?'disabled':''}>Dismiss crew</button>`;
  controls.querySelector('[data-dismiss-crew]').onclick=()=>dismissCrew(index);
  el.append(controls);
 });
};
