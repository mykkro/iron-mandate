# Rival engine, four new bosses and nine new cards

Status: design approved in conversation, awaiting spec review.

## Goal

Give battles more variety and more decisions per turn without turning the game into a different game. The deck stays at 15 cards, battles stay short, and the tone stays cozy. Rivals remain automatons, but they become readable and interactive: each shows its next actions and some have parts you can destroy.

Decisions made during brainstorming:

- Rival model **B**: an automaton with a visible action queue and optional destroyable parts (not a second player with a hand).
- The four new bosses come **after** the Frog. The expedition grows from 4 to 8 fights.
- Damage goes to a **current target** the player picks by clicking the rival rig or a part.
- The four existing rivals move onto the new engine and keep their current behaviour.

## Part 1: Rival engine

### Current state

Rival behaviour is spread across `js/game.js`, `js/table.js` and `js/opponent.js`. Each of them defines or wraps `endTurn`, and roughly ten places check rival numbers (`b.enemy===1`, `b.enemy===2`, `reward.enemy===3`). The expedition screen hard-codes 4 rivals (`Math.min(save.unlocked,3)`, `/ 4 rivals defeated`). Portraits are assigned by index in `js/painted.js`.

Only the deck, collection, unlocked count and wins are saved (`localStorage` key `deepforge-v1`). Battles live in memory. Nothing in this design changes the save format, so existing saves keep working and anyone who beat the Frog sees fight 5 open.

### New module: `js/rivals.js`

One file owns:

1. **Rival definitions.** The existing `ENEMIES` entries are extended in place, and the four new rivals are appended. Each definition adds:
   - `script`: an array of action objects, repeated in a cycle.
   - `parts` (optional): an array of `{id, name, hull, effect}`.
   - `portrait`: the art key used by `paintedAsset` (this replaces the index mapping in `painted.js`).
   - `finale` (optional, `true` only for the Hydra): used by the reward screen.
2. **Battle setup.** When a battle starts, the battle state gains:
   - `queue`: the next 3 actions.
   - `scriptPos`: where in the script the next refill comes from.
   - `parts`: a copy of the definition's parts with current Hull and `destroyed: false`.
   - `target`: `'rig'` or a part id.
   - `blocked`: a boolean.
   - `lastDamageTaken`: damage taken during the previous rival turn.
   - `jammed` on each machine.
3. **The rival turn.** A single `endTurn` replaces the versions in `game.js`, `table.js` and `opponent.js`. It keeps the step-by-step reveal and the opponent history panel from `opponent.js`, with the same timing and the same reduced-motion handling.
4. **Targeting and damage.** One `dealDamage(amount)` function used by every player damage source.

The rival-number special cases are removed from `game.js`, `table.js` and `opponent.js`, and the 4-rival assumptions are replaced with `ENEMIES.length`.

### Action types

| Type | Fields | Effect |
|---|---|---|
| `attack` | `name`, `damage`, optional `bonus` | Deals `damage + bonus + escalation + head bonus − bodyguard reduction`, minimum 0. |
| `repair` | `amount` | Rival rig regains Hull, up to its maximum. |
| `tax` | `amount` | Takes up to `amount` Ore. Each Ore short deals 2 damage. |
| `jam` | — | Jams your strongest ready machine until the end of your next turn. |
| `corrode` | `requires` (part id) | Destroys one of your un-upgraded machines; the card goes to your discard pile. |
| `junk` | `count` | Shuffles `count` Red Tape cards into your draw pile. |
| `regrow` | `hull` | Brings back one destroyed head at `hull`. |

Actions may combine. For example, the Manager's third action is an attack plus a repair. This is modelled as an action with `steps: [...]` that resolve in order and show as numbered entries in the opponent panel, the same way repairs show today.

### Rules

- **Escalation:** `floor((turn − 1) / 3)` is added to every attack, as today. It is not added to tax shortfall damage.
- **Queue:** it always shows 3 actions. After the front action resolves it is removed, and the queue refills from `script[scriptPos % script.length]`.
- **Fallbacks keep pressure on.** An action that can't apply turns into the rival's plain attack, so it never fizzles silently:
  - `jam` with no machine to jam.
  - `corrode` while its required part is destroyed, or with no un-upgraded machine.
  - `regrow` with no destroyed head.
- **"Strongest ready machine":** the machine with the highest card cost that was not built this turn and isn't already jammed. Ties go to the leftmost.
- **A jammed machine** can't be activated. The jam clears when your next turn ends.
- **Part effects** apply each rival turn while the part is alive (for example, the Filing Cabinet's repair). Head bonuses apply to every attack.
- **Blocked (Brass Umbrella):** every point of damage from the next rival turn becomes 0, including tax shortfall damage. Jam, corrode, junk, repair and regrow still happen. `blocked` clears after that turn.
- **`lastDamageTaken`** counts only damage from the rival turn, after reductions and blocks. Damage you deal to yourself (for example from DO NOT PUSH) doesn't count.

### Targeting and damage

- `target` starts as `'rig'`. Clicking the rival portrait or a living part sets it.
- All player damage goes through `dealDamage(amount)`:
  - Attacking machines.
  - Surprise Confetti.
  - Scrap Golem's activation and its scrap effect.
  - Spite Engine.
  - Wrench in the Works.
- Damage to a part reduces that part's Hull. Extra damage beyond the part's remaining Hull is lost; it does not carry over to the rig.
- When a part reaches 0 it is destroyed, its effect stops, and `target` returns to `'rig'`.
- **Win condition** is unchanged: the rig reaches 0 Hull. Parts don't need to be destroyed to win.

### Testing

The repo has no automated tests. Add `tools/check_rivals.py`, a Playwright script in the same style as the headless checks used during development. It loads `index.html` and, for each rival, starts a battle with a fixed deck, plays scripted turns and checks:

- Hull values, queue contents and part states.
- Jam, corrode, junk, regrow and tax behaviour.
- Umbrella blocking, Paperwork Jam reordering and target fallback.
- That the four existing rivals deal the same damage per turn as before the change.
- No page errors, in English and in Czech.

## Part 2: Bosses

Starting numbers are expected to change during playtesting. Every attack also gets escalation.

### Existing rivals

Behaviour is unchanged; only the representation changes.

| # | Rival | Hull | Script |
|---|---|---|---|
| 1 | Bert & His Bucket | 28 | Bucket bonk 3 |
| 2 | Professor Oops | 36 | Peer-reviewed explosion 4 → 4 → 4 +3 barrage bonus |
| 3 | The Middle Manager | 44 | Mandatory team building 5 → 5 → 5 + repair 4 |
| 4 | An Extremely Big Frog | 54 | Cosmic ribbit 6 |

The script cycle must reproduce today's "every third turn" rules exactly: turns 3, 6, 9 and so on. The Frog's victory text changes from "expedition complete" to a "the mines go deeper" message. Its rewards don't change.

### New rivals

**5. Sir Reginald Tax, Tollgate Ridge.** Hull 58. No parts.
- **Script:** Audit (attack 5) → Collect Taxes (tax 3) → Audit (attack 5).
- **Teaches:** spend your Ore instead of hoarding it.
- **Rewards:** Lucky Rummage, Brass Umbrella, Overtime Ollie.

**6. Madame Corrosion, The Rust Marsh.** Hull 60.
- **Script:** Rust Spray (attack 5) → Seize Up (jam) → Corrode (corrode, requires `cauldron`).
- **Part: Rust Cauldron** (`cauldron`, 14 Hull). It enables Corrode; it has no per-turn effect.
- **Teaches:** upgrade your machines, or destroy the cauldron.
- **Rewards:** Gear Whisperer, Tin Bodyguard, Scrap Golem.

**7. The Bureaucrat, Ministry of Forms.** Hull 64.
- **Script:** Stamp of Disapproval (attack 6) → File in Triplicate (junk 2) → Stamp of Disapproval (attack 6).
- **Part: Filing Cabinet** (`cabinet`, 12 Hull). While alive, it repairs the rig by 3 at the end of each rival turn.
- **Teaches:** handling a clogged deck, and choosing between the part and racing the rig.
- **Rewards:** Paperwork Jam, Spite Engine, Lucky Rummage.

**8. The Clockwork Hydra, The Gear Abyss.** Hull 50. This is the finale (`finale: true`).
- **Script:** Triple Bite (attack 2) → Triple Bite (attack 2) → Regrow (regrow 8).
- **Parts: Head I, Head II, Head III** (`head1` to `head3`, 14 Hull each). Each living head adds +3 to every attack.
- **Teaches:** using the target to cut its damage, then finishing the body.
- **Rewards:** Wrench in the Works, Spite Engine, Scrap Golem.
- The final victory message ("you completed the expedition") moves here.

## Part 3: Cards

New card IDs are stable and get added to `CARDS`, `FLAVORS`, `CARD_RARITIES` and `cardEffects` (for the effect badges). They come only from rewards, so saves are unaffected.

| ID | Name | Type · Cost | Effect | Rarity |
|---|---|---|---|---|
| `rummage` | Lucky Rummage | Tactic · 1 Power | Draw 2 cards. | Common |
| `jam` | Paperwork Jam | Tactic · 1 Power | Move the rival's next action to the back of its queue. | Uncommon |
| `wrench` | Wrench in the Works | Tactic · 2 Power | Deal 8 damage to the target if it is a part, otherwise 4 to the rig. | Uncommon |
| `brolly` | Brass Umbrella | Tactic · 2 Power | Block all damage from the rival's next turn. | Rare |
| `whisperer` | Gear Whisperer | Crew · 2 Ore | Upgraded machines produce +1 extra Ore, Power or damage. | Uncommon |
| `bodyguard` | Tin Bodyguard | Crew · 3 Ore | Every rival attack deals 2 less damage. | Rare |
| `ollie` | Overtime Ollie | Crew · 3 Ore | Draw up to 6 cards instead of 5. | Rare |
| `golem` | Scrap Golem | Machine · 3 Ore | Activate (free): deal 2 damage. When scrapped: deal 6 damage to the target. | Rare |
| `spite` | Spite Engine | Machine · 3 Ore | Spend 1 Power: deal damage equal to the damage you took last rival turn (max 10). | Unique |
| `redtape` | Red Tape | Junk | Can't be played. Pay 1 Power to throw it away for the rest of the battle. | — |

Rules details:

- **Lucky Rummage** draws 2 even if that takes your hand above 5. If the draw pile runs out, it reshuffles the discard pile, the same way normal drawing does.
- **Paperwork Jam** turns the queue `[a, b, c]` into `[b, c, a]`. Playing it twice in one turn is allowed.
- **Wrench in the Works** with the rig targeted deals 4 to the rig.
- **Brass Umbrella** played twice in one turn has no extra effect.
- **Gear Whisperer and Tin Bodyguard stack** per copy in the crew, as existing crew bonuses do. Gear Whisperer's bonus shows on the badges of upgraded machines.
- **Overtime Ollie:** hand size is `5 + number of Ollies in crew`. Recruiting him takes effect from the next draw.
- **Scrap Golem:** its scrap damage comes on top of Jegor's Ore and Bobo's repair. Its activation, like every new machine, waits one turn after it's built.
- **Spite Engine** with 0 damage taken last turn deals 0; it can still be activated.
- **Red Tape:**
  - It takes up a hand slot and is discarded at turn end like any card, so it comes back around.
  - Throwing it away costs 1 Power and removes it from the battle. It doesn't count as a tactic for the Emotional Support Orb.
  - It never enters `save.deck` or `save.owned`.
- **Changes to existing cards:** Surprise Confetti and attacking machines now hit the current target. Nothing else about them changes.

Every new card gets an English name, rules text and flavour line, Czech translations of all three, and Czech plural handling where numbers appear.

## Part 4: UI

### Rival area

The one-row rival layout from `css/battle-compact.css` stays, with these changes:

- **Portrait:** clickable as the rig target.
- **Action queue**, which replaces the single "Next action" card:
  - Three small action cards in a row. The first is labelled NEXT and the next two are dimmed.
  - Each shows an icon, the action name and the current number, including escalation and head bonuses (for example "Audit · 6 damage" or "Steals 3 Ore").
- **Parts** (only for rivals that have them): small tiles beside the queue.
  - Each shows the name, a Hull bar and a one-line effect.
  - The tiles are clickable to set the target. Destroyed parts are grey with a "Scrapped" stamp, and regrown heads come back.
- **Opponent turn panel:** unchanged.

### Targeting

- The current target gets a highlighted frame and a 🎯 TARGET tag.
- In the sticky top bar, the rival chip shows the targeted part's name and Hull when the target isn't the rig (for example "Head II · 9/14").

### Status markers

- **Blocked:** a "BLOCKED" stamp on the NEXT action. During resolution, damage shows as "0 (blocked)".
- **Jammed machine:** a "JAMMED" stamp on the card. Activate is disabled with the label "Jammed until next turn".
- **Red Tape:** in hand it shows a junk card style and a "Throw away · 1 Power" button instead of Play. The big card preview shows the same button.

### Expedition screen

8 routes, "x / 8 rivals defeated", and Continue goes to the highest unlocked rival.

### Phones

The queue becomes a swipeable row, and parts wrap onto a line under the queue. All targets are at least 44px.

### Czech

All new strings go into the `CZECH` table in `js/locale.js`. Number-dependent words use the existing quantity helpers.

## Artwork

Every image is a 1254×1254 RGB PNG in `assets/images/handdrawn/<id>.png`, in the existing style: ink contours, cross-hatching and watercolor washes on textured paper, a steampunk-fantasy mining setting, and humorous characters.

Until the real art exists, `tools/make_placeholders.py` creates placeholder PNGs with the image's name on a plain toned background, but only for files that don't exist yet. `tools/convert_handdrawn.py` then turns them into JPGs as usual. Dropping in a real PNG and rerunning the conversion script replaces a placeholder.

Cards:

| File | Card | Description |
|---|---|---|
| `rummage.png` | Lucky Rummage | A goblin arm-deep in an overflowing junk crate, flinging out gears, a sock and two glowing cards. |
| `jam.png` | Paperwork Jam | A brass clockwork mechanism choked with crumpled forms and red stamps, gears grinding to a halt. |
| `wrench.png` | Wrench in the Works | A giant wrench wedged between spinning gears of an enemy machine, sparks and snapped teeth flying. |
| `brolly.png` | Brass Umbrella | A small goblin under a huge riveted brass umbrella while explosions and debris bounce off it. |
| `whisperer.png` | Gear Whisperer | A gentle old gnome with an ear trumpet pressed to a humming machine, tiny gears floating around her like fireflies. |
| `bodyguard.png` | Tin Bodyguard | A dented, stoic tin robot in a bowler hat, arms crossed, standing in front of a rig. |
| `ollie.png` | Overtime Ollie | An exhausted but cheerful goblin miner holding six cards fanned out, with a coffee pot strapped to his helmet. |
| `golem.png` | Scrap Golem | A hulking golem assembled from scrap pipes, boilers and a mattress spring, about to fall apart heroically. |
| `spite.png` | Spite Engine | A furious red-hot engine with an angry furnace face, venting steam, covered in dents it remembers. |
| `redtape.png` | Red Tape | A tangle of red ribbon and official forms with wax seals, wrapped around a sad little pickaxe. |

Rival portraits:

| File | Rival | Description |
|---|---|---|
| `taxman.png` | Sir Reginald Tax | A pompous tall-hatted toad-like noble with a monocle and a ledger, a coin-sorting contraption on his back. |
| `corrosion.png` | Madame Corrosion | A swamp witch in rust-coloured robes, stirring a bubbling copper cauldron, flakes of rust drifting around her. |
| `bureaucrat.png` | The Bureaucrat | A thin grey clerk behind towering filing cabinets, with an ink stamp in each of his four hands. |
| `hydra.png` | The Clockwork Hydra | A three-headed brass serpent machine rising from a pit of gears, each head a different furnace-mouthed design. |

## Files touched

New:
- `js/rivals.js`: definitions, engine, targeting.
- `js/new-cards.js`: card data, effects, Red Tape.
- `css/rivals.css`: queue, parts, target and stamps.
- `tools/make_placeholders.py`.
- `tools/check_rivals.py`.
- 14 placeholder PNGs and their JPGs.

Changed:
- `js/game.js`, `js/table.js`, `js/opponent.js`: remove rival-number special cases and the 4-rival assumptions.
- `js/painted.js`: portraits from the rival definitions.
- `js/card-layout.js`: effect badges for the new cards.
- `js/rarity.js`: new rarities.
- `js/locale.js`: Czech strings.
- `index.html`: new files.
- `README.md`: the new bosses and the placeholder workflow.

## Out of scope

- A rival with a real hand or deck (option C).
- Rebalancing existing cards.
- A route map or acts UI.
- Saving battles mid-fight.
