/* Touch-friendly card inspection, without changing battle rules. */
const tableRenderBattle=renderBattle;
renderBattle=function(){
 tableRenderBattle();
 document.body.classList.add('in-battle');
 app.querySelectorAll('.hand-zone .card').forEach((el,i)=>{
  const button=document.createElement('button');
  button.className='portrait-inspect';button.textContent='View card';
  button.setAttribute('aria-label',`View ${CARDS[battle.hand[i]].name}`);
  button.onclick=()=>inspectBattleCard('hand',i);el.append(button);
 });
 app.querySelectorAll('.installed').forEach((el,i)=>{
  const button=document.createElement('button');
  button.className='portrait-inspect';button.textContent='Manage';
  button.setAttribute('aria-label',`Manage ${CARDS[battle.machines[i].key].name}`);
  button.onclick=()=>inspectBattleCard('machine',i);el.querySelector('.card').append(button);
 });
};
const beforePortraitRender=render;
render=function(){beforePortraitRender();document.body.classList.toggle('in-battle',view==='battle'&&!!battle&&!reward)};
function inspectBattleCard(zone,i){
 let dialog=document.querySelector('#card-inspector');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='card-inspector';dialog.setAttribute('aria-label','Card details and actions');document.body.append(dialog)}
 const source=zone==='hand'?app.querySelectorAll('.hand-zone .card')[i]:app.querySelectorAll('.installed .card')[i];
 const copy=source.cloneNode(true);copy.querySelectorAll('.portrait-inspect').forEach(el=>el.remove());
 dialog.replaceChildren();
 const close=document.createElement('button');close.className='close';close.textContent='×';close.setAttribute('aria-label','Close card details');close.onclick=()=>dialog.close();
 dialog.append(close,copy);
 for(const [attr,fn]of[['play',play],['activate',activate],['upgrade',upgrade],['scrap',scrap]])dialog.querySelectorAll(`[data-${attr}]`).forEach(el=>el.onclick=()=>{dialog.close();fn(+el.dataset[attr])});
 dialog.showModal();
}
