scrap=function(i){
 const b=battle;
 if(!b||b.over||b.resolving||!b.machines[i])return;
 const m=b.machines.splice(i,1)[0];
 const ore=1+b.crew.filter(k=>k==='jegor').length;
 const repair=Math.min(b.max-b.hull,2*b.crew.filter(k=>k==='bobo').length);
 b.discard.push(m.key);b.ore+=ore;b.hull+=repair;
 log(`Scrapped ${CARDS[m.key].name}. Ore +${ore}.`);
 if(b.crew.includes('bobo'))log(`Bobo: Hull +${repair}.`);
 render();
};
const battleBeforeSalvageLabels=renderBattle;
renderBattle=function(){
 battleBeforeSalvageLabels();
 const ore=1+battle.crew.filter(k=>k==='jegor').length;
 app.querySelectorAll('[data-scrap]').forEach(el=>el.textContent=`Scrap +${ore} Ore`);
};
