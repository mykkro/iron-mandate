/* Cards that answer the deeper rivals: queue tricks, parts damage, draw and junk. Stable IDs keep saves compatible. */
Object.assign(CARDS,{
 rummage:{name:'Lucky Rummage',type:'tactic',cost:1,symbol:'🧺',text:'Draw 2 cards.',effect:'rummage'},
 jam:{name:'Paperwork Jam',type:'tactic',cost:1,symbol:'📎',text:'Move the rival’s next action to the back of its queue.',effect:'jam'},
 wrench:{name:'Wrench in the Works',type:'tactic',cost:2,symbol:'🔧',text:'Deal 8 damage to the target if it is a part, otherwise 4 to the rig.',effect:'wrench'},
 brolly:{name:'Brass Umbrella',type:'tactic',cost:2,symbol:'☂️',text:'Block all damage from the rival’s next turn.',effect:'brolly'},
 whisperer:{name:'Gear Whisperer',type:'crew',cost:2,symbol:'👂',text:'Upgraded machines produce +1 extra Ore, Power or damage.'},
 bodyguard:{name:'Tin Bodyguard',type:'crew',cost:3,symbol:'🤖',text:'Every rival attack deals 2 less damage.'},
 ollie:{name:'Overtime Ollie',type:'crew',cost:3,symbol:'☕',text:'Draw up to 6 cards instead of 5.'},
 golem:{name:'Scrap Golem',type:'machine',cost:3,symbol:'🗿',text:'Activate: deal 2 damage. When scrapped: deal 6 damage to the target.',effect:'attack',value:2,activation:0},
 spite:{name:'Spite Engine',type:'machine',cost:3,symbol:'😤',text:'Spend 1 Power: deal damage equal to the damage you took last rival turn (max 10).',effect:'attack',value:0,activation:1},
 redtape:{name:'Red Tape',type:'junk',cost:1,symbol:'📜',text:'Cannot be played. Pay 1 Power to throw it away for the rest of the battle.',junk:true}
});
Object.assign(FLAVORS,{
 rummage:'Somewhere in here is a plan. Also a sandwich.',
 jam:'Please submit your attack in triplicate.',
 wrench:'Precision engineering, applied imprecisely.',
 brolly:'Forecast: heavy shrapnel, then clearing.',
 whisperer:'She asks the gears nicely. They listen.',
 bodyguard:'Takes hits. Takes no questions.',
 ollie:'Coffee is a food group.',
 golem:'Assembly optional. Disassembly spectacular.',
 spite:'Runs on grudges. Excellent mileage.',
 redtape:'Form 27-B, now in triplicate.'
});
Object.assign(TACTIC_EFFECTS,{
 rummage:()=>drawCards(2),
 jam:b=>b.queue.push(b.queue.shift()),
 wrench:()=>dealDamage(targetPart()?8:4),
 brolly:b=>{b.blocked=true}
});
