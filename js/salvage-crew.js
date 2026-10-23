/* Stable card IDs keep the new crew compatible with existing collections. */
CARDS.jegor={name:'Jegor Kokotovič',type:'crew',cost:2,symbol:'',text:'Space garbageman. Whenever you scrap a machine, gain 1 extra Ore per Jegor.'};
CARDS.bobo={name:'Bobo',type:'crew',cost:2,symbol:'',text:'Jegor’s faithful robot. Whenever you scrap a machine, repair 2 Hull per Bobo.'};
FLAVORS.jegor='One civilization’s space junk is Jegor’s pension plan.';
FLAVORS.bobo='Loyalty: unlimited. Warranty: long expired.';
ENEMIES[0].rewards.push('jegor');
ENEMIES[1].rewards.push('bobo');
let salvageCrewAdded=false;
for(const key of ['jegor','bobo'])if(!save.owned[key]){save.owned[key]=1;salvageCrewAdded=true}
if(salvageCrewAdded)persist();
