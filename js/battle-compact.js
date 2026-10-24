/* Denser battle table: sticky turn bar with both Hulls, one-row rival area, slim hand cards. */
const battleBeforeCompact=renderBattle;
renderBattle=function(){
 battleBeforeCompact();
 const b=battle,e=ENEMIES[b.enemy];
 const hull=(who,now,max,cls)=>`<div class="resource hull-chip ${cls}" aria-label="${who} · Hull ${now} / ${max}">${resourceIcon('hull')}<span><small>${who}</small><b>${now}</b>/ ${max}</span></div>`;
 const part=targetPart(b),rival=part?hull(part.name,part.hull,part.max,'hull-rival hull-part'):hull('RIVAL',b.foe,e.hull,'hull-rival');
 app.querySelector('.battle-top .resources').insertAdjacentHTML('afterbegin',hull('YOU',b.hull,40,'hull-you')+rival);
 const layout=app.querySelector('.opponent-layout'),sequence=document.querySelector('#opponent-sequence');
 if(layout&&sequence)layout.append(sequence);
};
render();
