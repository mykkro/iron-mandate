function showWorkshopCard(key){
 let dialog=document.querySelector('#card-inspector');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='card-inspector';document.body.append(dialog)}
 dialog.setAttribute('aria-label','Card details and actions');
 dialog.innerHTML=`<button class="close" aria-label="Close card details">X</button>${card(key)}`;
 dialog.querySelector('.close').onclick=()=>dialog.close();dialog.showModal();
 if(typeof localizePage==='function')localizePage();
}
const workshopBeforeDetails=renderCollection;
renderCollection=function(){
 workshopBeforeDetails();
 app.querySelectorAll('.collection-grid .card').forEach(el=>{
  const key=el.dataset.cardKey;el.tabIndex=0;el.classList.add('inspectable-card');el.setAttribute('aria-label',`View ${CARDS[key].name}`);
  el.onclick=event=>{if(!event.target.closest('button'))showWorkshopCard(key)};
  el.onkeydown=event=>{if(event.target===el&&(event.key==='Enter'||event.key===' ')){event.preventDefault();showWorkshopCard(key)}};
 });
};
