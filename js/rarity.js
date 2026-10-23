const CARD_TIERS={
 common:{label:'Common',mark:'I'},uncommon:{label:'Uncommon',mark:'II'},rare:{label:'Rare',mark:'III'},unique:{label:'Unique',mark:'IV'},legendary:{label:'Legendary',mark:'V'}
};
const CARD_RARITIES={drill:'common',boiler:'common',rivet:'common',repair:'common',ore:'common',charge:'uncommon',blast:'uncommon',mechanic:'uncommon',excavator:'uncommon',cannon:'rare',crystal:'rare',wisp:'rare',mend:'rare',smith:'unique',bobo:'unique',laser:'legendary',jegor:'legendary'};
for(const [key,c]of Object.entries(CARDS))c.rarity=CARD_RARITIES[key]||'common';
const cardBeforeRarity=card;
card=function(key,action='',extra=''){
 const tier=CARDS[key].rarity,info=CARD_TIERS[tier];
 return cardBeforeRarity(key,action,extra).replace('<article class="card ',`<article data-rarity="${tier}" class="card rarity-${tier} `).replace('</h3>',`</h3><div class="rarity-label"><span class="rarity-mark" aria-hidden="true">${info.mark}</span><span>${info.label}</span></div>`);
};
render();
