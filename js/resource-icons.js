function resourceIcon(kind){return `<img class="resource-icon icon-${kind}" src="assets/icons/${kind}.png" alt="" aria-hidden="true" decoding="async">`}
const cardBeforeResourceIcons=card;
card=function(key,action='',extra=''){
 const c=CARDS[key],kind=c.type==='tactic'?'power':'ore',label=kind==='ore'?'Ore':'Power';
 return cardBeforeResourceIcons(key,action,extra).replace(/<span class="cost">[^<]*<\/span>/,`<span class="cost illustrated-cost" aria-label="${c.cost} ${label}"><span>${c.cost}</span>${resourceIcon(kind)}</span>`);
};
const battleBeforeResourceIcons=renderBattle;
renderBattle=function(){
 battleBeforeResourceIcons();
 app.querySelectorAll('.battle-top .resource').forEach((el,i)=>el.insertAdjacentHTML('afterbegin',resourceIcon(i===0?'ore':'power')));
 app.querySelectorAll('.hull-label').forEach(el=>el.insertAdjacentHTML('afterbegin',resourceIcon('hull')));
 app.querySelectorAll('.installed-output').forEach((el,i)=>{
  const c=CARDS[battle.machines[i].key];
  if(c.effect==='ore'||c.effect==='power')el.insertAdjacentHTML('afterbegin',resourceIcon(c.effect));
 });
};
render();
