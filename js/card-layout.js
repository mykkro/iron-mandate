/* Printed-card visual grammar shared by collection, battle, rewards and dialogs. */
function cardEffects(key,level=0){
 const c=CARDS[key];
 if(c.type==='machine')return {timing:'PER USE',items:[{kind:c.effect==='attack'?'damage':c.effect,amount:c.value+level*2,sign:c.effect==='attack'?'':'+'}]};
 const special={
  mechanic:{timing:'UPGRADES',items:[{kind:'ore',amount:1,sign:'−'}]},
  smith:{timing:'ON UPGRADE',items:[{kind:'hull',amount:3,sign:'+'}]},
  wisp:{timing:'FIRST TACTIC',items:[{kind:'power',amount:1,sign:'+'}]},
  jegor:{timing:'ON SCRAP',items:[{kind:'ore',amount:1,sign:'+'}]},
  bobo:{timing:'ON SCRAP',items:[{kind:'hull',amount:2,sign:'+'}]},
  charge:{timing:'ON PLAY',items:[{kind:'power',amount:3,sign:'+'},{kind:'hull',amount:1,sign:'−'}]},
  repair:{timing:'ON PLAY',items:[{kind:'hull',amount:6,sign:'+'}]},
  blast:{timing:'ON PLAY',items:[{kind:'damage',amount:5,sign:''}]},
  ore:{timing:'ON PLAY',items:[{kind:'ore',amount:3,sign:'+'}]},
  mend:{timing:'ON PLAY',items:[{kind:'hull',amount:10,sign:'+'},{kind:'ore',amount:1,sign:'+'}]}
 };
 return special[key]||{timing:'ABILITY',items:[]};
}
function effectIcon(kind){return kind==='damage'?`<span class="damage-icon">${resourceIcon('hull')}<span aria-hidden="true">✕</span></span>`:resourceIcon(kind)}
function effectBadges(key,level=0){
 const effect=cardEffects(key,level);
 return `<div class="card-yield"><div class="yield-values">${effect.items.map(item=>`<span class="effect-badge effect-${item.kind} ${item.sign==='−'?'effect-loss':''}" aria-label="${item.sign}${item.amount} ${item.kind==='damage'?'damage':item.kind==='hull'?'Hull':item.kind==='ore'?'Ore':'Power'}"><b>${item.sign}${item.amount}</b>${effectIcon(item.kind)}</span>`).join('')}</div><span class="effect-timing">${effect.timing}</span></div>`;
}
card=function(key,action='',extra=''){
 const c=CARDS[key],kind=c.type==='tactic'?'power':'ore',label=kind==='ore'?'Ore':'Power';
 const activation=c.type==='machine'?`<div class="activation-line"><span>Activate</span><span class="activation-payment">${c.activation?`${c.activation} ${resourceIcon('power')}`:'Free'}</span><span class="once-per-turn">Once per turn</span><span class="once-per-turn">New machines wait one turn</span></div>`:'';
 return `<article class="card printed-card ${c.theme||c.type}" data-card-key="${key}"><div class="card-corners"><div class="price-corner"><span class="cost illustrated-cost" aria-label="${c.cost} ${label}"><b>${c.cost}</b>${resourceIcon(kind)}</span><span class="price-label">PRICE</span></div>${effectBadges(key)}</div><div class="art" aria-hidden="true"><span class="card-icon">${c.symbol}</span></div><h3>${c.name}</h3><div class="type">${c.type}${c.theme?' · Aethercraft':''}</div><div class="rules-box">${activation}<p>${c.text}</p></div><div class="flavor">${FLAVORS[key]||''}</div>${action}${extra}</article>`;
};
const battleBeforeCardLayout=renderBattle;
renderBattle=function(){
 battleBeforeCardLayout();
 app.querySelectorAll('.installed .card').forEach((el,i)=>{
  const m=battle.machines[i];
  el.querySelector('.card-yield').outerHTML=effectBadges(m.key,m.level);
  if(m.level){
   const c=CARDS[m.key],value=c.value+m.level*2;
   const unit=c.effect==='attack'?'damage':c.effect==='ore'?'Ore':'Power';
   el.querySelector('.rules-box p').textContent=c.text.replace(c.value+' '+unit,value+' '+unit);
  }
 });
};
render();
