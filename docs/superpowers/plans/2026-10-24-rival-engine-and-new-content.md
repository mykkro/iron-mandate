# Rival Engine and New Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hard-coded rival turn with a data-driven rival engine. The engine gives each rival an action queue, destroyable parts and a player-chosen target. On top of it, add four new rivals (fights 5–8) and nine new cards plus the Red Tape junk card.

**Architecture:** The game is plain browser JavaScript with no build step. Each file in `js/` either declares globals (`js/game.js`) or reassigns earlier globals to layer features on top (`renderBattle=function(){previous();...}`). Load order in `index.html` matters. The plan adds:
- `js/rivals.js`: rival definitions, rival turn, queue, parts, targeting.
- `js/new-cards.js`: card data and effects.
- `css/rivals.css`.

It also removes the old rival-number special cases. Checks run in headless Chromium through Playwright for Python, the same tooling used so far.

**Tech Stack:** HTML/CSS/vanilla JS (classic scripts, globals). Python 3 + `playwright` (already installed; `python -c "import playwright"` works) for checks.

**Spec:** `docs/superpowers/specs/2026-10-24-rival-engine-and-new-content-design.md`

## Global Constraints

- **Do not create, modify or delete anything in `assets/images/handdrawn/`.** The user is generating the new illustrations there. This replaces the spec's `tools/make_placeholders.py` and placeholder PNGs: missing art is handled at runtime (Task 2).
- Save format unchanged: `localStorage` key `deepforge-v1` holds `{deck, owned, unlocked, wins}`. New card IDs only arrive through rewards.
- Card IDs exactly: `rummage`, `jam`, `wrench`, `brolly`, `whisperer`, `bodyguard`, `ollie`, `golem`, `spite`, `redtape`. Art keys for the new rivals: `taxman`, `corrosion`, `bureaucrat`, `hydra`.
- The queue always shows **3** actions. Escalation is `floor((turn − 1) / 3)` on every attack, but not on tax shortfall damage.
- The four existing rivals must deal exactly today's damage per turn (pinned by the Task 1 characterization check).
- Red Tape never enters `save.deck` or `save.owned`.
- Every new player-visible string gets Czech in `js/locale.js` (or in `ACTION_COPY.cs` in `js/opponent.js` for the opponent panel, which is excluded from page translation).
- Match the surrounding code style: compact one-line functions in `game.js`, short `/* ... */` header comment per file, no frameworks.
- Commit after each task, on branch `rival-engine` (Task 1 creates it).

## Review Focus

1. **Scrapping a Scrap Golem that brings the rival to 0** must win the battle. Today `scrap` never calls `check()`. Pinned in Task 6.
2. **The duplicate-card reward fallback must never hand out Red Tape.** When every card is owned twice, `renderReward` picks the first card owned fewer than twice, and that would be `redtape`. Pinned in Task 6.
3. **Leaving a battle while the rival is mid-turn** (Retreat or language switch during the 650 ms reveal) must not apply later steps to a new battle. The engine checks `battle!==b` after every delay. Pinned in Task 3.
4. **Damage beyond a part's Hull must not leak to the rig, and the target must snap back to the rig** when its part dies, including when the part dies from Wrench or Golem's scrap rather than a machine. Pinned in Task 4.
5. **The queue preview must show escalation for future turns** (`turn + i`). Otherwise the queue lies on turns 3→4, 6→7 and so on, exactly when players plan around it. Pinned in Task 3.

---

## File map

| File | Responsibility | Tasks |
|---|---|---|
| `tools/check_rivals.py` (new) | Headless check suite; one function per scenario | 1, 3–7 |
| `js/rivals.js` (new) | Rival definitions, queue, rival turn, parts, targeting, queue/parts rendering | 3, 4, 5 |
| `css/rivals.css` (new) | Queue cards, parts, target marker, stamps | 3, 4, 5 |
| `js/new-cards.js` (new) | New card data, flavours, tactic effects | 6 |
| `js/game.js` | Core rules: remove `damageNext`/`endTurn`; damage via `dealDamage`; helpers `drawOne`, `drawCards`, `handSize`, `payResource`, `machineOutput`; tactic hooks; campaign/reward for 8 rivals | 3, 4, 5, 6 |
| `js/table.js` | Remove dead `endTurn` wrapper and intent card; use helpers | 3, 6 |
| `js/opponent.js` | Remove `endTurn`; generic step markup; panel copy | 3, 5 |
| `js/painted.js` | Portraits from rival data; missing-art fallback | 2 |
| `js/salvage-actions.js` | Golem scrap damage + `check()` | 6 |
| `js/card-layout.js` | Effect badges for new cards; machine output | 6 |
| `js/rarity.js` | New rarities; no rarity label on junk | 6 |
| `js/battle-compact.js` | Sticky rival chip shows target part | 4 |
| `css/card-types.css` | Junk card colour | 6 |
| `css/painted.css` | Missing-art fallback look | 2 |
| `js/locale.js` | Czech strings and patterns | 7 |
| `index.html` | Load new files | 3, 6 |
| `README.md` | Rivals, cards, art workflow | 7 |

Load order after this plan (scripts):

```
game.js, salvage-crew.js, new-cards.js, table.js, portrait.js, punk.js, opponent.js, rivals.js, painted.js, resource-icons.js, salvage-actions.js, sound.js, card-layout.js, rarity.js, workshop-detail.js, crew-management.js, card-preview.js, battle-compact.js, locale.js
```

- `new-cards.js` must come before `painted.js`, which assigns art to every card, and before `rarity.js`, which reads `CARDS` at load.
- `rivals.js` must come after `opponent.js`, because it uses `actionDelay`, and before `painted.js`, which reads `ENEMIES[*].portrait`.

---

### Task 1: Branch, check harness, characterization of today's rivals

**Files:**
- Create: `tools/check_rivals.py`

**Interfaces:**
- Produces:
  - `check(name, cond, detail='')`: records PASS/FAIL.
  - `start(pg, enemy, hand=(), deck=(), **state)`: starts a battle with a fixed hand and draw pile, and assigns any extra battle fields from `state`.
  - `end_turn(pg)`: awaits the full rival turn.
  - `snap(pg)`: returns a dict of battle state.
  - `SCENARIOS`: a list; later tasks append scenario functions `def scenario_x(pg): ...`.
  - The script exits with code 1 on any FAIL.

- [ ] **Step 1: Commit the existing visual work on `main`, then branch**

The working tree has staged, uncommitted work from the visual session (JPG art, previews, card colours, compact battle layout, locale fix, screenshot) and the untracked spec. Confirm with the user before running this step; it is listed here so the plan is complete.

```bash
git add -A
git reset docs/superpowers
git commit -m "Lighter JPG art, bigger card previews, compact battle table, card art overlay

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git switch -c rival-engine
git add docs/superpowers
git commit -m "Add rival engine design spec and implementation plan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: two commits; `git status` clean; `git branch --show-current` prints `rival-engine`.

- [ ] **Step 2: Write the harness with the characterization scenario**

Create `tools/check_rivals.py`:

```python
"""Headless checks for the rival engine and new cards.

Usage: python tools/check_rivals.py
Loads index.html in Chromium (reduced motion, so rival turns resolve instantly),
runs every scenario and exits with code 1 if any check fails.
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
FAILURES = []
SCENARIOS = []


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + ("" if cond or not detail else f" -- {detail}"))
    if not cond:
        FAILURES.append(name)


def scenario(fn):
    SCENARIOS.append(fn)
    return fn


def start(pg, enemy, hand=(), deck=(), **state):
    pg.evaluate(
        """([e, hand, deck, state]) => {
            battle = null; reward = null; view = 'campaign';
            save.deck = [...START]; save.unlocked = ENEMIES.length;
            startBattle(e);
            battle.hand = [...hand]; battle.deck = [...deck]; battle.discard = [];
            Object.assign(battle, state);
            render();
        }""",
        [enemy, list(hand), list(deck), state],
    )


def end_turn(pg):
    pg.evaluate("async () => { await endTurn(); }")


def snap(pg):
    return pg.evaluate(
        """() => ({
            hull: battle.hull, foe: battle.foe, ore: battle.ore, power: battle.power, turn: battle.turn,
            over: battle.over, hand: [...battle.hand], deck: [...battle.deck], discard: [...battle.discard],
            machines: battle.machines.map(m => [m.key, m.level, m.jamTurn || 0]),
            queue: (battle.queue || []).map(a => a.name),
            parts: (battle.parts || []).map(p => [p.id, p.hull, p.destroyed]),
            target: battle.target, blocked: battle.blocked, last: battle.lastDamageTaken,
        })"""
    )


def damage_per_turn(pg, enemy, turns, foe=None):
    """Hull lost on each of `turns` rival turns, resetting Hull to 40 before each."""
    start(pg, enemy, **({"foe": foe} if foe is not None else {}))
    lost, foes = [], []
    for _ in range(turns):
        pg.evaluate("() => { battle.hull = 40; }")
        end_turn(pg)
        s = snap(pg)
        lost.append(40 - s["hull"])
        foes.append(s["foe"])
    return lost, foes


@scenario
def scenario_existing_rivals_unchanged(pg):
    expected = {
        0: [3, 3, 3, 4, 4, 4, 5],
        1: [4, 4, 7, 5, 5, 8, 6],
        2: [5, 5, 5, 6, 6, 6, 7],
        3: [6, 6, 6, 7, 7, 7, 8],
    }
    for enemy, want in expected.items():
        lost, _ = damage_per_turn(pg, enemy, 7)
        check(f"rival {enemy} damage per turn", lost == want, f"got {lost}, want {want}")
    _, foes = damage_per_turn(pg, 2, 6, foe=30)
    check("manager repairs 4 on turns 3 and 6", foes == [30, 30, 34, 34, 34, 38], f"got {foes}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1366, "height": 900}, reduced_motion="reduce")
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto((ROOT / "index.html").as_uri())
        page.wait_for_timeout(300)
        for fn in SCENARIOS:
            try:
                fn(page)
            except Exception as exc:  # a crashing scenario is a failure, keep running the rest
                check(fn.__name__, False, repr(exc))
        check("no page errors", not errors, "; ".join(errors))
        browser.close()
    print(f"\n{len(FAILURES)} failure(s)")
    sys.exit(1 if FAILURES else 0)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Run it against the current code**

Run: `python tools/check_rivals.py`
Expected: every line `PASS`, `0 failure(s)`. This pins today's behaviour. If a line fails here, the expected table is wrong, not the game: re-derive it from `damageNext` in `js/game.js` (`e.damage + floor((turn-1)/3) + (enemy===1 && turn%3===0 ? 3 : 0)`) before continuing.

- [ ] **Step 4: Commit**

```bash
git add tools/check_rivals.py
git commit -m "Add headless rival check harness with characterization of current rivals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Missing-art fallback (instead of placeholder files)

New cards and rivals reference art keys whose JPGs don't exist until the user converts their illustrations. A missing image must show the card's emoji on a toned panel, not a broken-image icon.

**Files:**
- Modify: `js/painted.js` (whole file, 8 lines)
- Modify: `css/painted.css` (append)
- Test: `tools/check_rivals.py`

**Interfaces:**
- Produces:
  - `ART_FALLBACK`: object mapping art key → emoji. It is filled from each card's original `symbol` and each rival's original `icon` before they are replaced.
  - `paintedAsset(key)`: same signature as today.
  - `artMissing(img)`: global, called from the `onerror` handler.

- [ ] **Step 1: Write the failing scenario**

Append to `tools/check_rivals.py` (above `def main`):

```python
@scenario
def scenario_missing_art_falls_back(pg):
    html = pg.evaluate("""() => {
        ART_FALLBACK.nonexistent_art = '🧪';
        const box = document.createElement('div');
        box.innerHTML = paintedAsset('nonexistent_art');
        document.body.append(box);
        return new Promise(r => setTimeout(() => { r(box.innerHTML); box.remove(); }, 400));
    }""")
    check("missing art becomes emoji fallback", 'class="art-missing"' in html and "🧪" in html, html)
```

- [ ] **Step 2: Run to see it fail**

Run: `python tools/check_rivals.py`
Expected: `FAIL scenario_missing_art_falls_back` with `ReferenceError: ART_FALLBACK is not defined` (or the HTML still containing `<img`).

- [ ] **Step 3: Implement**

Replace the whole of `js/painted.js` with this. Note it already reads portraits from rival data, which Task 5 depends on; until then the four existing rivals get `portrait` from Task 3, so for this task keep the explicit list as the fallback.

```js
/* Generated raster artwork: small inline images also serve crew/pile portraits. Missing files fall back to the card's emoji. */
const ART_FALLBACK={};
function artMissing(img){const s=document.createElement('span');s.className='art-missing';s.setAttribute('aria-hidden','true');s.textContent=ART_FALLBACK[img.dataset.art]||'⚙️';img.replaceWith(s)}
function paintedAsset(key){return `<img class="painted-art" data-art="${key}" src="assets/images/handdrawn/${key}.jpg" alt="" loading="lazy" decoding="async" onerror="artMissing(this)">`}
for(const key of Object.keys(CARDS)){ART_FALLBACK[key]=CARDS[key].symbol;CARDS[key].symbol=paintedAsset(key)}
const LEGACY_PORTRAITS=['bert','mechanic','foreman','frog'];
ENEMIES.forEach((e,i)=>{const key=e.portrait||LEGACY_PORTRAITS[i];if(!key)return;ART_FALLBACK[key]??=e.icon;e.icon=paintedAsset(key)});
render();
```

Append to `css/painted.css`:

```css
.art-missing{display:inline-grid;place-items:center;width:1.4em;height:1.4em;background:radial-gradient(circle,#6d6a4c,#2b2f20);color:#f1e7cb;border-radius:4px}
.card .art .card-icon .art-missing{width:100%;height:100%;font-size:64px;border-radius:0}
.rival-portrait .art-missing{width:110px;height:90px;font-size:44px}
.encounter .crest .art-missing{width:100%;height:145px;font-size:64px}
.crew-mini>span .art-missing{width:48px;height:48px;font-size:26px}
```

- [ ] **Step 4: Run to see it pass**

Run: `python tools/check_rivals.py`
Expected: all PASS, including `scenario_existing_rivals_unchanged`.

- [ ] **Step 5: Commit**

```bash
git add js/painted.js css/painted.css tools/check_rivals.py
git commit -m "Fall back to the card emoji when hand-drawn art is missing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Rival engine core (queue, scripted turns, opponent panel)

**Files:**
- Create: `js/rivals.js`
- Create: `css/rivals.css`
- Modify: `js/game.js` (`startBattle`; delete `damageNext`, `endTurn` and the dead `renderBattle`)
- Modify: `js/table.js` (delete the dead `endTurn` wrapper on lines 2-9; replace the intent card in `renderBattle`)
- Modify: `js/opponent.js` (replace `opponentActionMarkup`, delete the `endTurn=async function(){...};` block, extend `ACTION_COPY`)
- Modify: `index.html` (load `js/rivals.js` after `js/opponent.js`, `css/rivals.css` last)
- Test: `tools/check_rivals.py`

**Interfaces:**
- Consumes: `actionDelay()` from `js/opponent.js`; `check()`, `draw()`, `log()`, `render()` from `js/game.js`.
- Produces (globals in `js/rivals.js`):
  - **Constants and lookups:** `QUEUE_SIZE` (3); `rivalDef(b=battle)` → rival definition.
  - **Battle state:** `setupRival(b)` sets `b.queue`, `b.scriptPos`, `b.parts`, `b.target='rig'`, `b.blocked=false` and `b.lastDamageTaken=0`. `refillQueue(b)`.
  - **Damage helpers:** `livingParts(b, effect?)` → array; `crewCount(b, key)` → number; `attackDamage(b, step, turn=b.turn)` → number; `basicAttack(def)` → `{name, type:'attack', damage, bonus?}`.
  - **Step resolution:**
    - `STEP_HANDLERS[type](b, record, turn)` → damage taken (number). The base types are `attack` and `repair`; Task 5 adds more.
    - `hurt(b, record, amount)` → damage taken. It honours `b.blocked`.
    - `fallback(b, record, turn)`: turns a failed step into the plain attack.
  - **Queue and panel text:**
    - `STEP_TEXT[type](b, step, turn)` → short queue string.
    - `STEP_RESULTS[type](record, t)` → panel HTML.
    - `stepResultMarkup(record, t)`.
  - **Turn:** `async function endTurn()`.
- Rival script shape (used by every later task):
  - Action: `{name, icon, steps:[step, ...]}`.
  - Step: `{type:'attack', damage, bonus?}` or `{type:'repair', amount}`. More types arrive in Task 5.
- Resolved record fields:
  - Copies of the step's fields, plus `name`, `state ('queued'|'resolved')`, `before`, `after`.
  - Attacks also get `dealt`, `blocked`, `scaling`, `bonus`.
  - Repairs get `amount` (the Hull actually gained).

- [ ] **Step 1: Write the failing scenarios**

Append to `tools/check_rivals.py`:

```python
@scenario
def scenario_queue_shows_three_and_cycles(pg):
    start(pg, 1)
    s = snap(pg)
    check("queue has 3 actions", len(s["queue"]) == 3, s["queue"])
    texts = pg.eval_on_selector_all(".rival-queue .queue-card", "els => els.map(e => e.innerText)")
    check("queue rendered with 3 cards", len(texts) == 3, texts)
    check("third Oops action shows barrage damage", "7 damage" in texts[2], texts)
    end_turn(pg)
    check("queue refilled after turn", len(snap(pg)["queue"]) == 3)


@scenario
def scenario_queue_preview_escalates(pg):
    start(pg, 0, turn=3)
    texts = pg.eval_on_selector_all(".rival-queue .queue-card", "els => els.map(e => e.innerText)")
    check("turn 3 preview: 3, then 4, then 4 damage",
          ["3 damage" in texts[0], "4 damage" in texts[1], "4 damage" in texts[2]] == [True, True, True], texts)


@scenario
def scenario_blocked_turn_deals_nothing(pg):
    start(pg, 0, blocked=True)
    end_turn(pg)
    s = snap(pg)
    check("blocked attack deals 0", s["hull"] == 40, s)
    check("block clears after the rival turn", s["blocked"] is False, s)
    check("last damage taken recorded as 0", s["last"] == 0, s)
    start(pg, 0)
    end_turn(pg)
    check("last damage taken recorded", snap(pg)["last"] == 3)


@scenario
def scenario_leaving_mid_turn_is_safe(pg):
    pg.emulate_media(reduced_motion="no-preference")
    start(pg, 0)
    pg.evaluate("() => { endTurn(); battle = null; view = 'campaign'; render(); }")
    start(pg, 0)
    pg.wait_for_timeout(900)
    check("new battle untouched by the abandoned rival turn", snap(pg)["hull"] == 40)
    pg.emulate_media(reduced_motion="reduce")


@scenario
def scenario_opponent_panel_shows_result(pg):
    start(pg, 2, foe=30, turn=3)
    pg.evaluate("() => { battle.queue = [ENEMIES[2].script[2], ENEMIES[2].script[0], ENEMIES[2].script[1]]; }")
    end_turn(pg)
    panel = pg.inner_text("#opponent-sequence")
    check("panel shows attack result", "5 damage" in panel and "40 → 35" in panel, panel)
    check("panel shows repair result", "+4 Hull" in panel, panel)
```

- [ ] **Step 2: Run to see them fail**

Run: `python tools/check_rivals.py`
Expected: the five new scenarios FAIL (no `battle.queue`, no `.rival-queue`, `blocked` ignored). `scenario_existing_rivals_unchanged` still PASSes.

- [ ] **Step 3: Create `js/rivals.js`**

```js
/* Rival engine: scripted action queues, destroyable parts, and the rival turn. */
const QUEUE_SIZE=3;
const attackAction=(name,icon,damage,extra={})=>({name,icon,steps:[{type:'attack',damage,...extra}]});
Object.assign(ENEMIES[0],{portrait:'bert',script:[attackAction('Bucket bonk','💥',3)]});
Object.assign(ENEMIES[1],{portrait:'mechanic',script:[attackAction('Peer-reviewed explosion','💥',4),attackAction('Peer-reviewed explosion','💥',4),attackAction('Peer-reviewed explosion','💥',4,{bonus:3})]});
Object.assign(ENEMIES[2],{portrait:'foreman',script:[attackAction('Mandatory team building','📋',5),attackAction('Mandatory team building','📋',5),{name:'Mandatory team building',icon:'📋',steps:[{type:'attack',damage:5},{type:'repair',amount:4}]}]});
Object.assign(ENEMIES[3],{portrait:'frog',script:[attackAction('Cosmic ribbit','🐸',6)]});

const rivalDef=(b=battle)=>ENEMIES[b.enemy];
const crewCount=(b,key)=>b.crew.filter(k=>k===key).length;
const livingParts=(b,effect)=>(b.parts||[]).filter(p=>!p.destroyed&&(!effect||p.effect===effect));
function setupRival(b){
 const e=rivalDef(b);
 Object.assign(b,{queue:[],scriptPos:0,target:'rig',blocked:false,lastDamageTaken:0,parts:(e.parts||[]).map(p=>({...p,max:p.hull,destroyed:false}))});
 refillQueue(b);
}
function refillQueue(b){const s=rivalDef(b).script;while(b.queue.length<QUEUE_SIZE){b.queue.push(s[b.scriptPos%s.length]);b.scriptPos++}}
function basicAttack(e){for(const a of e.script){const s=a.steps.find(x=>x.type==='attack');if(s)return {name:a.name,...s}}return {name:e.intent,type:'attack',damage:e.damage}}
function attackDamage(b,step,turn=b.turn){
 const heads=livingParts(b,'bite').reduce((n,p)=>n+p.amount,0);
 return Math.max(0,step.damage+(step.bonus||0)+Math.floor((turn-1)/3)+heads-2*crewCount(b,'bodyguard'));
}
function hurt(b,r,amount){
 r.blocked=!!b.blocked&&amount>0;
 const dealt=b.blocked?0:amount;
 r.before=b.hull;b.hull=Math.max(0,b.hull-dealt);r.after=b.hull;r.dealt=dealt;
 if(dealt)log(`${rivalDef(b).name} dealt ${dealt} damage.`);
 return dealt;
}
function fallback(b,r,turn){Object.assign(r,{fallbackFrom:r.type},basicAttack(rivalDef(b)));return STEP_HANDLERS.attack(b,r,turn)}
const STEP_HANDLERS={
 attack(b,r,turn){r.scaling=Math.floor((turn-1)/3);return hurt(b,r,attackDamage(b,r,turn))},
 repair(b,r){const e=rivalDef(b);r.before=b.foe;b.foe=Math.min(e.hull,b.foe+r.amount);r.after=b.foe;r.amount=r.after-r.before;if(r.amount)log(`${r.name} repaired ${r.amount} Hull.`);return 0}
};
const STEP_TEXT={
 attack:(b,s,turn)=>`${attackDamage(b,s,turn)} damage`,
 repair:(b,s)=>`Repairs ${s.amount} Hull`
};
const STEP_RESULTS={
 attack:(r,t)=>r.blocked?`0 ${t.damage}<span>${t.blocked}</span>`:`${r.dealt} ${t.damage}<span>${t.yourRig}: ${r.before} → ${r.after} ${t.hull}</span>`,
 repair:(r,t)=>r.amount?`+${r.amount} ${t.hull}<span>${t.rivalRig}: ${r.before} → ${r.after} ${t.hull}</span>`:`<span>${t.noRepair}</span>`
};
function stepResultMarkup(r,t){return STEP_RESULTS[r.type]?STEP_RESULTS[r.type](r,t):''}
async function endTurn(){
 const b=battle;if(!b||b.over||b.resolving)return;
 b.resolving=true;
 const action=b.queue.shift(),turn=b.turn;
 const steps=[...action.steps.map(s=>({...s,name:action.name})),...livingParts(b,'repair').map(p=>({type:'repair',amount:p.amount,name:p.name}))];
 const entry={turn,finished:false,actions:steps.map(s=>({...s,state:'queued'}))};
 (b.opponentTurns??=[]).push(entry);
 const update=()=>{if(view==='battle'&&battle===b)render()};
 update();
 let taken=0;
 for(const r of entry.actions){
  await actionDelay();if(battle!==b)return;
  taken+=STEP_HANDLERS[r.type]?STEP_HANDLERS[r.type](b,r,turn):0;
  r.state='resolved';
  if(check())break;
  update();
 }
 b.lastDamageTaken=taken;b.blocked=false;
 (b.actionHistory??=[]).push({name:action.name,damage:taken,turn});
 entry.finished=true;entry.defeat=b.hull<=0;b.resolving=false;
 if(b.over){update();return}
 refillQueue(b);
 b.turn++;b.power=3;b.tactic=false;b.machines.forEach(m=>m.used=false);
 b.discard.push(...b.hand.splice(0));draw();update();
}
function queueMarkup(b){
 const when=['NEXT','THEN','LATER'];
 return `<div class="zone-label">NEXT ACTIONS</div><ol class="rival-queue">${b.queue.map((a,i)=>`<li class="queue-card ${i?'later':'next'} ${!i&&b.blocked?'blocked':''}"><span class="queue-when">${when[i]}</span><span class="queue-icon" aria-hidden="true">${a.icon}</span><strong>${a.name}</strong>${a.steps.map(s=>`<span class="queue-effect">${STEP_TEXT[s.type]?STEP_TEXT[s.type](b,s,b.turn+i):''}</span>`).join('')}${!i&&b.blocked?'<span class="stamp">BLOCKED</span>':''}</li>`).join('')}</ol>`;
}
const battleBeforeRivals=renderBattle;
renderBattle=function(){
 battleBeforeRivals();
 app.querySelector('.intent-zone').innerHTML=queueMarkup(battle);
};
render();
```

Note: `endTurn` and `damageNext` are no longer declared anywhere else after Steps 4–6, so `async function endTurn` here is the only definition. The page calls it by name at click time.

- [ ] **Step 4: Edit `js/game.js`**

In `startBattle`, set up the rival before drawing. Replace:

```js
tactic:false,over:false};draw();view='battle';render()}
```
with:
```js
tactic:false,over:false};setupRival(battle);draw();view='battle';render()}
```

Delete these three whole lines:
- `function damageNext(){...}`
- `function endTurn(){...}`
- `function renderBattle(){...}`, the original arena layout. It is dead: `js/table.js` redeclares `renderBattle`, and it still contains `damageNext()` and `b.enemy===2` checks.

After this, `grep -n "damageNext\|function endTurn\|function renderBattle" js/game.js` prints nothing. Later tasks refer to `game.js` functions by name, not line number, because these deletions shift the lines.

- [ ] **Step 5: Edit `js/table.js`**

Delete lines 2–9, from `const originalEndTurn=endTurn;` through the closing `};` of that `endTurn=function(){...}` block. Line 1, the header comment, stays. It is dead code (`opponent.js` used to replace `endTurn` entirely), and it now breaks because `endTurn` isn't defined yet when `table.js` loads.

In `renderBattle`, replace:

```js
<div class="intent-zone"><div class="zone-label">NEXT ACTION</div><article class="intent-card"><span class="intent-icon">${b.enemy===3?'🐸':'💥'}</span><h3>${e.intent}</h3><b>${damageNext()} damage</b>${b.enemy===2&&b.turn%3===0?'<span>Also repairs 4 Hull</span>':''}</article></div>
```
with:
```js
<div class="intent-zone"></div>
```

After this, `grep -n "damageNext\|enemy===" js/table.js` prints nothing.

- [ ] **Step 6: Edit `js/opponent.js`**

Delete the block from `endTurn=async function(){` through its closing `};` (currently lines 40–60). Keep `actionDelay` just above it and the guards that follow.

Replace the whole `function opponentActionMarkup(action,index){...}` with:

```js
function opponentActionMarkup(action,index){
 const t=actionCopy(),done=action.state==='resolved';
 const name=typeof translateText==='function'?translateText(action.name||''):action.name;
 return `<li class="opponent-event ${action.state}" data-action-step="${index}"><span class="event-number">${index+1}</span><div><strong>${name}</strong>${done?`<div class="event-effect">${stepResultMarkup(action,t)}</div>`:''}${done&&action.fallbackFrom?`<small>${t.fallback}</small>`:''}${done&&action.bonus?`<small>${t.bonus}</small>`:''}${done&&action.scaling?`<small>${t.scaling}: +${action.scaling}</small>`:''}</div><span class="event-state">${done?t.completed:t.queued}</span></li>`;
}
```

In `ACTION_COPY.en` add `blocked:'Blocked by the Brass Umbrella',fallback:'Nothing to target, so it attacks instead'`. In `ACTION_COPY.cs` add `blocked:'Zablokoval mosazný deštník',fallback:'Nebylo na co cílit, tak útočí'`. Add them just before the closing `}` of each object.

- [ ] **Step 7: Create `css/rivals.css` and load both files**

`css/rivals.css`:

```css
/* Rival action queue, destroyable parts and targeting. */
.intent-zone{min-width:0;text-align:left}
.rival-queue{list-style:none;margin:0;padding:0;display:flex;gap:8px}
.queue-card{position:relative;flex:0 0 132px;min-height:92px;padding:8px 10px;border:2px solid #29321c;border-radius:10px;background:#c8c0a2 url('../assets/images/grit.svg');color:#24291d;display:flex;flex-direction:column;gap:3px;box-shadow:2px 3px 0 #11170d}
.queue-card.later{opacity:.72}
.queue-when{font:600 8px 'IBM Plex Mono',monospace;letter-spacing:.6px;color:#4a5534}
.queue-card.next .queue-when{color:#7a2f1c}
.queue-icon{font-size:20px;line-height:1}
.queue-card strong{font:800 15px 'Barlow Condensed',Impact,sans-serif;line-height:1.05}
.queue-effect{font-size:11px;color:#6b2c1e}
.stamp{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-12deg);padding:2px 8px;border:3px solid #8f2a1a;border-radius:4px;color:#8f2a1a;background:#f1e7cbd9;font:800 16px 'Barlow Condensed',Impact,sans-serif;letter-spacing:1px;pointer-events:none;z-index:3;white-space:nowrap}
.queue-card.blocked .stamp{border-color:#2f5d8a;color:#2f5d8a}
@media(max-width:650px){.rival-queue{overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px}.queue-card{flex-basis:118px;scroll-snap-align:start}}
```

`index.html`: insert `<script src="js/rivals.js"></script>` right after `<script src="js/opponent.js"></script>`. Insert `<link rel="stylesheet" href="css/rivals.css">` right after `<link rel="stylesheet" href="css/card-art.css">`.

- [ ] **Step 8: Run the checks**

Run: `python tools/check_rivals.py`
Expected: all PASS, including `scenario_existing_rivals_unchanged` (same damage as before the refactor), plus `no page errors`.

- [ ] **Step 9: Look at it**

Take a 1366×900 screenshot of a battle against rival 1 (reuse `start()` in a throwaway script in the scratchpad, not in the repo). Confirm three queue cards sit between the portrait and the opponent panel, and the third shows `7 damage`.

- [ ] **Step 10: Commit**

```bash
git add js/rivals.js css/rivals.css js/game.js js/table.js js/opponent.js index.html tools/check_rivals.py
git commit -m "Move rival turns to a scripted engine with a visible three-action queue

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Damage routing, destroyable parts and targeting

**Files:**
- Modify: `js/rivals.js` (append targeting; extend `renderBattle` wrapper)
- Modify: `js/game.js` (`play`, `activate`)
- Modify: `js/battle-compact.js` (rival chip)
- Modify: `css/rivals.css` (append)
- Test: `tools/check_rivals.py`

**Interfaces:**
- Consumes: `battle.parts` items `{id, name, hull, max, destroyed, effect, amount?, text}` and `battle.target` from Task 3.
- Produces:
  - `targetPart(b=battle)` → the living targeted part or `null`.
  - `setTarget(id)`, where `id` is `'rig'` or a part id. It re-renders.
  - `dealDamage(amount)`: every player damage source must call this instead of `b.foe-=`.

- [ ] **Step 1: Write the failing scenarios**

Append to `tools/check_rivals.py`:

```python
TEST_PART = "[{id:'p1',name:'Test Part',hull:10,max:10,destroyed:false,effect:'none',text:'Test'}]"


@scenario
def scenario_targeting_routes_damage(pg):
    start(pg, 0, hand=["blast"], power=5)
    pg.evaluate(f"() => {{ battle.parts = {TEST_PART}; render(); }}")
    pg.click('[data-target="p1"]')
    check("clicking a part sets the target", snap(pg)["target"] == "p1")
    chip = pg.inner_text(".hull-chip.hull-rival")
    check("sticky chip names the targeted part", "Test Part" in chip and "10" in chip, chip)
    pg.evaluate("() => play(0)")
    s = snap(pg)
    check("confetti hits the part, not the rig", s["parts"][0][1] == 5 and s["foe"] == 28, s)
    pg.evaluate("() => { battle.machines = [{key:'cannon',level:0,used:false,builtTurn:0}]; battle.power = 5; render(); activate(0); }")
    s = snap(pg)
    check("overflow damage is lost", s["parts"][0] == ["p1", 0, True] and s["foe"] == 28, s)
    check("target returns to the rig when the part dies", s["target"] == "rig", s)
    pg.evaluate("() => setTarget('p1')")
    check("a destroyed part cannot be targeted", snap(pg)["target"] == "rig")


@scenario
def scenario_rig_target_marker_only_with_parts(pg):
    start(pg, 0)
    check("no target tag without parts", pg.query_selector(".target-tag") is None)
    pg.evaluate(f"() => {{ battle.parts = {TEST_PART}; render(); }}")
    check("rig shows target tag when parts exist", pg.query_selector(".rival-rig .target-tag") is not None)
```

- [ ] **Step 2: Run to see them fail**

Run: `python tools/check_rivals.py`
Expected: both new scenarios FAIL (no `[data-target]`, foe drops instead of the part).

- [ ] **Step 3: Route damage in `js/game.js`**

In `play`, replace `if(c.effect==='blast')b.foe-=5;` with `if(c.effect==='blast')dealDamage(5);`.
In `activate`, replace `if(c.effect==='attack')b.foe-=v;` with `if(c.effect==='attack')dealDamage(v);`.
After this, `grep -n "foe-=" js/*.js` prints nothing.

- [ ] **Step 4: Append targeting to `js/rivals.js`**

Insert before the final `render();` line:

```js
function targetPart(b=battle){return b.target==='rig'?null:livingParts(b).find(p=>p.id===b.target)||null}
function setTarget(id){const b=battle;if(!b||b.over)return;b.target=livingParts(b).some(p=>p.id===id)?id:'rig';render()}
function dealDamage(amount){
 const b=battle,part=targetPart(b);
 if(!part){b.foe-=amount;return}
 part.hull=Math.max(0,part.hull-amount);
 if(!part.hull){part.destroyed=true;b.target='rig';log(`${part.name} destroyed.`)}
}
function partsMarkup(b){
 if(!b.parts.length)return '';
 return `<div class="rival-parts">${b.parts.map(p=>`<button class="rival-part ${p.destroyed?'destroyed':''} ${b.target===p.id?'is-target':''}" data-target="${p.id}" aria-pressed="${b.target===p.id}" ${p.destroyed||b.over?'disabled':''}><strong>${p.name}</strong><span class="part-hull">${p.hull} / ${p.max} Hull</span><span class="health"><i style="width:${p.hull/p.max*100}%"></i></span><small>${p.text}</small>${b.target===p.id?'<em class="target-tag">🎯 TARGET</em>':''}${p.destroyed?'<span class="stamp">SCRAPPED</span>':''}</button>`).join('')}</div>`;
}
function markRigTarget(b){
 const rig=app.querySelector('.rival-rig');if(!rig||!b.parts.length)return;
 rig.classList.add('targetable');rig.classList.toggle('is-target',b.target==='rig');
 Object.assign(rig,{tabIndex:0,onclick:()=>setTarget('rig'),onkeydown:ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();setTarget('rig')}}});
 rig.setAttribute('role','button');rig.setAttribute('aria-pressed',String(b.target==='rig'));rig.setAttribute('aria-label','Target the rival rig');
 if(b.target==='rig')rig.insertAdjacentHTML('beforeend','<em class="target-tag">🎯 TARGET</em>');
}
```

Change the `renderBattle` wrapper body (from Task 3) to:

```js
renderBattle=function(){
 battleBeforeRivals();
 const b=battle,zone=app.querySelector('.intent-zone');
 zone.innerHTML=queueMarkup(b)+partsMarkup(b);
 zone.querySelectorAll('[data-target]').forEach(el=>el.onclick=()=>setTarget(el.dataset.target));
 markRigTarget(b);
};
```

The target tag is an `<em>`, not a `<span>`: `css/battle-compact.css` hides `.rival-rig>span:last-child` and `.rival-rig>strong`.

- [ ] **Step 5: Sticky chip in `js/battle-compact.js`**

Replace:

```js
 app.querySelector('.battle-top .resources').insertAdjacentHTML('afterbegin',hull('YOU',b.hull,40,'hull-you')+hull('RIVAL',b.foe,e.hull,'hull-rival'));
```
with:
```js
 const part=targetPart(b),rival=part?hull(part.name,part.hull,part.max,'hull-rival hull-part'):hull('RIVAL',b.foe,e.hull,'hull-rival');
 app.querySelector('.battle-top .resources').insertAdjacentHTML('afterbegin',hull('YOU',b.hull,40,'hull-you')+rival);
```

`battle-compact.js` loads after `rivals.js`, so `targetPart` exists.

- [ ] **Step 6: Append part styles to `css/rivals.css`**

```css
.rival-parts{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.rival-part{position:relative;width:150px;min-height:44px;padding:7px 9px;text-align:left;display:flex;flex-direction:column;gap:3px;border:2px solid #717c5a;border-radius:10px;background:#46503b url('../assets/images/grit.svg');color:#dedcbb;font-size:10px;cursor:crosshair;box-shadow:none}
.rival-part strong{font-size:13px}
.rival-part .health{height:6px;width:100%}
.rival-part small{font-size:9px;color:#c5caad}
.rival-part.is-target,.rival-rig.is-target .rival-portrait{outline:3px solid #d5e448;outline-offset:2px}
.rival-part.destroyed{filter:grayscale(1);opacity:.6;cursor:default}
.rival-rig.targetable{cursor:crosshair}
.target-tag{font:700 9px 'IBM Plex Mono',monospace;font-style:normal;color:#d5e448;letter-spacing:.5px}
.hull-chip.hull-part{background-color:#c9b27a}
@media(max-width:650px){.rival-part{width:calc(50% - 4px)}}
```

- [ ] **Step 7: Run the checks**

Run: `python tools/check_rivals.py`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add js/rivals.js js/game.js js/battle-compact.js css/rivals.css tools/check_rivals.py
git commit -m "Route player damage to a clickable target with destroyable rival parts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: New action types, four new rivals, eight-fight expedition

**Files:**
- Modify: `js/rivals.js` (extend `STEP_HANDLERS`, `STEP_TEXT`, `STEP_RESULTS`; jam guard and stamp; new rivals; victory copy)
- Modify: `js/game.js` (`renderCampaign`, `renderReward`)
- Modify: `js/opponent.js` (`ACTION_COPY` additions)
- Modify: `css/rivals.css` (append)
- Test: `tools/check_rivals.py`

**Interfaces:**
- Consumes: `hurt`, `fallback`, `livingParts`, `rivalDef`, `STEP_HANDLERS`, `STEP_TEXT` and `STEP_RESULTS` from Task 3, and `battle.parts` from Task 4.
- Produces:
  - **Step types:**
    - `{type:'tax', amount}`: records `paid`, `dealt`.
    - `{type:'jam'}`: records `target` (card key). Sets `machine.jamTurn = turn+1`.
    - `{type:'corrode', requires}`: records `target` (card key).
    - `{type:'junk', count}`.
    - `{type:'regrow', hull}`: records `target` (part name).
  - **Machine selection:** `strongestMachine(list)` → machine or `null`.
  - **Rival definition fields:**
    - `ENEMIES[i].victory = {eyebrow, text}` (optional). It is read by `renderReward`.
    - `ENEMIES[i].finale` (boolean).

- [ ] **Step 1: Write the failing scenarios**

Append to `tools/check_rivals.py`:

```python
@scenario
def scenario_eight_rivals_on_the_expedition(pg):
    pg.evaluate("() => { battle = null; reward = null; view = 'campaign'; save.unlocked = 4; render(); }")
    check("eight encounters listed", len(pg.query_selector_all(".encounter")) == 8)
    check("progress counts eight", "/ 8 rivals defeated" in pg.inner_text("main"))
    check("fight 5 open after the frog", pg.query_selector('[data-fight="4"]').is_enabled())
    check("fight 6 still locked", not pg.query_selector('[data-fight="5"]').is_enabled())
    pg.evaluate("() => { save.unlocked = 8; render(); }")
    pg.click("#continue")
    check("continue goes to the last rival", snap(pg)["foe"] == 50)


@scenario
def scenario_tax_collector(pg):
    start(pg, 4, ore=1)
    end_turn(pg)                      # Audit 5
    end_turn(pg)                      # Collect Taxes: has 1 of 3 Ore
    s = snap(pg)
    check("tax takes the Ore it can", s["ore"] == 0, s)
    check("tax shortfall: 2 damage per missing Ore", s["hull"] == 40 - 5 - 4, s)
    start(pg, 4, ore=5, turn=2)
    pg.evaluate("() => { battle.queue = [ENEMIES[4].script[1], ENEMIES[4].script[2], ENEMIES[4].script[0]]; battle.blocked = true; render(); }")
    end_turn(pg)
    s = snap(pg)
    check("blocked tax still takes Ore", s["ore"] == 2 and s["hull"] == 40, s)


@scenario
def scenario_corrosion(pg):
    start(pg, 5)
    pg.evaluate("() => { battle.machines = [{key:'rivet',level:0,used:false,builtTurn:0},{key:'drill',level:1,used:false,builtTurn:0}]; render(); }")
    end_turn(pg)                      # Rust Spray
    end_turn(pg)                      # Seize Up: jams the costlier rivet until end of turn 3
    s = snap(pg)
    check("jam hits the strongest ready machine", s["machines"][0] == ["rivet", 0, 3], s)
    pg.evaluate("() => { battle.power = 5; activate(0); }")
    check("jammed machine cannot activate", snap(pg)["foe"] == 60)
    check("jammed stamp shown", pg.query_selector(".installed.jammed .jam-stamp") is not None)
    end_turn(pg)                      # Corrode: destroys the un-upgraded rivet
    s = snap(pg)
    check("corrode destroys the un-upgraded machine", [m[0] for m in s["machines"]] == ["drill"] and "rivet" in s["discard"], s)
    start(pg, 5, turn=3)
    pg.evaluate("""() => { battle.machines = [{key:'rivet',level:0,used:false,builtTurn:0}];
        battle.parts[0].destroyed = true; battle.parts[0].hull = 0;
        battle.queue = [ENEMIES[5].script[2], ENEMIES[5].script[0], ENEMIES[5].script[1]]; render(); }""")
    end_turn(pg)
    s = snap(pg)
    check("corrode without the cauldron becomes Rust Spray", s["hull"] == 35 and len(s["machines"]) == 1, s)
    start(pg, 5, turn=2)
    pg.evaluate("() => { battle.queue = [ENEMIES[5].script[1], ENEMIES[5].script[2], ENEMIES[5].script[0]]; }")
    end_turn(pg)
    check("jam with no machines becomes an attack", snap(pg)["hull"] == 35)


@scenario
def scenario_bureaucrat(pg):
    start(pg, 6, foe=50)
    end_turn(pg)                      # Stamp 6, cabinet repairs 3
    s = snap(pg)
    check("filing cabinet repairs 3 per turn", s["foe"] == 53, s)
    end_turn(pg)                      # File in Triplicate
    deck = snap(pg)["deck"] + snap(pg)["hand"]
    check("two Red Tape added to the draw pile", deck.count("redtape") == 2, deck)
    pg.evaluate("() => { battle.parts[0].destroyed = true; battle.foe = 50; }")
    end_turn(pg)
    check("no repair once the cabinet is gone", snap(pg)["foe"] == 50)


@scenario
def scenario_hydra(pg):
    start(pg, 7)
    end_turn(pg)
    check("triple bite with three heads: 2 + 9", snap(pg)["hull"] == 29)
    pg.evaluate("() => { battle.hull = 40; battle.parts[0].destroyed = true; battle.parts[0].hull = 0; }")
    end_turn(pg)
    check("two heads: 2 + 6", snap(pg)["hull"] == 32)
    end_turn(pg)                      # Regrow
    check("regrow brings a head back at 8", snap(pg)["parts"][0] == ["head1", 8, False])
    start(pg, 7, turn=3)
    pg.evaluate("() => { battle.queue = [ENEMIES[7].script[2], ENEMIES[7].script[0], ENEMIES[7].script[1]]; }")
    end_turn(pg)
    check("regrow with no lost head bites instead", snap(pg)["hull"] == 29)


@scenario
def scenario_finale_reward_copy(pg):
    pg.evaluate("() => { battle = null; reward = {enemy: 7, choices: ['cannon']}; render(); }")
    check("hydra victory uses finale copy", "CERTIFIED HYDRA WRANGLER" in pg.inner_text("main"))
    pg.evaluate("() => { reward = {enemy: 3, choices: ['cannon']}; render(); }")
    text = pg.inner_text("main")
    check("frog victory points deeper", "CERTIFIED FROG BOTHERER" in text and "The mines go deeper" in text, text)
    pg.evaluate("() => { reward = null; render(); }")
```

Scenarios that need a specific action next set `battle.queue` directly instead of playing turns to reach it.

The finale scenario uses `choices: ['cannon']` because the Hydra's reward cards only exist after Task 6.

- [ ] **Step 2: Run to see them fail**

Run: `python tools/check_rivals.py`
Expected: the six new scenarios FAIL (`ENEMIES[4]` undefined, only 4 encounters, and so on). Earlier scenarios PASS.

- [ ] **Step 3: Add step types and rivals to `js/rivals.js`**

Insert after the `STEP_RESULTS` declaration:

```js
function strongestMachine(list){return list.reduce((best,m)=>!best||CARDS[m.key].cost>CARDS[best.key].cost?m:best,null)}
Object.assign(STEP_HANDLERS,{
 tax(b,r){const paid=Math.min(r.amount,b.ore);b.ore-=paid;r.paid=paid;if(paid)log(`${rivalDef(b).name} collected ${paid} Ore.`);return hurt(b,r,(r.amount-paid)*2)},
 jam(b,r,turn){
  const m=strongestMachine(b.machines.filter(x=>x.builtTurn!==turn&&x.jamTurn!==turn+1));
  if(!m)return fallback(b,r,turn);
  m.jamTurn=turn+1;r.target=m.key;log(`${rivalDef(b).name} jammed ${CARDS[m.key].name}.`);return 0;
 },
 corrode(b,r,turn){
  const m=r.requires&&!livingParts(b).some(p=>p.id===r.requires)?null:strongestMachine(b.machines.filter(x=>!x.level));
  if(!m)return fallback(b,r,turn);
  b.machines.splice(b.machines.indexOf(m),1);b.discard.push(m.key);r.target=m.key;log(`${rivalDef(b).name} dissolved ${CARDS[m.key].name}.`);return 0;
 },
 junk(b,r){for(let n=0;n<r.count;n++)b.deck.splice(Math.floor(Math.random()*(b.deck.length+1)),0,'redtape');log(`${rivalDef(b).name} added ${r.count} Red Tape to your deck.`);return 0},
 regrow(b,r,turn){
  const p=b.parts.find(x=>x.destroyed);
  if(!p)return fallback(b,r,turn);
  Object.assign(p,{destroyed:false,hull:r.hull});r.target=p.name;log(`${rivalDef(b).name} regrew ${p.name}.`);return 0;
 }
});
Object.assign(STEP_TEXT,{
 tax:(b,s)=>`Takes ${s.amount} Ore`,
 jam:()=>'Jams a machine',
 corrode:()=>'Destroys a machine',
 junk:(b,s)=>`Adds ${s.count} Red Tape`,
 regrow:()=>'Regrows a head'
});
const cardLabel=key=>typeof translateText==='function'?translateText(CARDS[key].name):CARDS[key].name;
Object.assign(STEP_RESULTS,{
 tax:(r,t)=>`${t.collected} ${r.paid}${r.dealt||r.blocked?` · ${r.blocked?`0 ${t.damage}`:`${r.dealt} ${t.damage}`}`:''}<span>${t.ore}</span>`,
 jam:(r,t)=>`${t.jammed}: ${cardLabel(r.target)}`,
 corrode:(r,t)=>`${t.corroded}: ${cardLabel(r.target)}`,
 junk:(r,t)=>`+${r.count} ${t.junk}`,
 regrow:(r,t)=>`${t.regrown}: ${typeof translateText==='function'?translateText(r.target):r.target}`
});
const heads=[1,2,3].map(n=>({id:`head${n}`,name:`Head ${['I','II','III'][n-1]}`,hull:14,effect:'bite',amount:3,text:'While intact: +3 damage on every attack.'}));
ENEMIES.push(
 {name:'Sir Reginald Tax',title:'Tollgate Ridge',icon:'🎩',portrait:'taxman',hull:58,damage:5,intent:'Audit',
  description:'Collects a toll on every rock, breath and bad idea. Takes your Ore every few turns.',rewards:['rummage','brolly','ollie'],
  script:[attackAction('Audit','🧾',5),{name:'Collect Taxes',icon:'💰',steps:[{type:'tax',amount:3}]},attackAction('Audit','🧾',5)]},
 {name:'Madame Corrosion',title:'The Rust Marsh',icon:'🧪',portrait:'corrosion',hull:60,damage:5,intent:'Rust Spray',
  description:'Brews rust by the bucket. Jams your machines and dissolves the ones you never upgraded.',rewards:['whisperer','bodyguard','golem'],
  parts:[{id:'cauldron',name:'Rust Cauldron',hull:14,effect:'corrode',text:'While intact: Corrode destroys a machine.'}],
  script:[attackAction('Rust Spray','🌧️',5),{name:'Seize Up',icon:'🔩',steps:[{type:'jam'}]},{name:'Corrode',icon:'🧪',steps:[{type:'corrode',requires:'cauldron'}]}]},
 {name:'The Bureaucrat',title:'Ministry of Forms',icon:'🗂️',portrait:'bureaucrat',hull:64,damage:6,intent:'Stamp of Disapproval',
  description:'Has a stamp for everything, including you. Buries your deck in Red Tape.',rewards:['jam','spite','rummage'],
  parts:[{id:'cabinet',name:'Filing Cabinet',hull:12,effect:'repair',amount:3,text:'While intact: repairs 3 Hull each turn.'}],
  script:[attackAction('Stamp of Disapproval','🔖',6),{name:'File in Triplicate',icon:'🗂️',steps:[{type:'junk',count:2}]},attackAction('Stamp of Disapproval','🔖',6)]},
 {name:'The Clockwork Hydra',title:'The Gear Abyss',icon:'🐍',portrait:'hydra',hull:50,damage:2,intent:'Triple Bite',finale:true,
  description:'Three heads, zero manners. Every head bites harder, and they grow back.',rewards:['wrench','spite','golem'],
  parts:heads,
  script:[attackAction('Triple Bite','🐍',2),attackAction('Triple Bite','🐍',2),{name:'Regrow',icon:'⚙️',steps:[{type:'regrow',hull:8}]}],
  victory:{eyebrow:'CERTIFIED HYDRA WRANGLER',text:'You conquered the deepest mine. Experiment with your deck and challenge the crews again.'}}
);
ENEMIES[3].victory={eyebrow:'CERTIFIED FROG BOTHERER',text:'The mines go deeper… four new rivals wait below.'};
const activateBeforeJam=activate;
activate=function(i){const m=battle?.machines[i];if(m&&m.jamTurn===battle.turn)return toast('Jammed until next turn.');activateBeforeJam(i)};
function markJammed(b){
 app.querySelectorAll('.installed').forEach((el,i)=>{
  if(b.machines[i]?.jamTurn!==b.turn)return;
  el.classList.add('jammed');el.querySelector('.card').insertAdjacentHTML('beforeend','<span class="stamp jam-stamp">JAMMED</span>');
  const button=el.querySelector('[data-activate]');if(button){button.disabled=true;button.textContent='Jammed until next turn'}
 });
}
```

Add `markJammed(b);` as the last line inside the `renderBattle` wrapper, after `markRigTarget(b);`.

The cards named in the new rewards don't exist until Task 6. Rewards only render after a win, so nothing reads them before then.

- [ ] **Step 4: Expedition and reward screen in `js/game.js`**

In `renderCampaign`, make three replacements:
- `${Math.min(save.unlocked,4)} / 4 rivals defeated` → `${Math.min(save.unlocked,ENEMIES.length)} / ${ENEMIES.length} rivals defeated`
- `${i===0?'STARTER':i===3?'BOSS':'RIVAL'}` → `${i===0?'STARTER':e.finale?'FINALE':i>=3?'BOSS':'RIVAL'}`
- `startBattle(Math.min(save.unlocked,3))` → `startBattle(Math.min(save.unlocked,ENEMIES.length-1))`

In `renderReward`:
- Replace `<div class="eyebrow">${reward.enemy===3?'CERTIFIED FROG BOTHERER':'VICTORY! NOBODY TELL THE INSURER.'}</div>` with `<div class="eyebrow">${ENEMIES[reward.enemy].victory?.eyebrow||'VICTORY! NOBODY TELL THE INSURER.'}</div>`.
- Replace `<p>${reward.enemy===3?'You completed the first expedition. Experiment with your deck and challenge the crews again.':'The next stretch of the expedition is now open.'}</p>` with `<p>${ENEMIES[reward.enemy].victory?.text||'The next stretch of the expedition is now open.'}</p>`.

After this, `grep -n "enemy===" js/*.js` prints nothing.

- [ ] **Step 5: Panel copy in `js/opponent.js`**

Add to `ACTION_COPY.en`:

```js
collected:'Collected',ore:'Ore taken',jammed:'Jammed',corroded:'Destroyed',junk:'Red Tape in your deck',regrown:'Regrown'
```

Add to `ACTION_COPY.cs`:

```js
collected:'Vybráno',ore:'Sebraná ruda',jammed:'Zaseknuto',corroded:'Zničeno',junk:'× úřední šiml v balíčku',regrown:'Dorostla'
```

- [ ] **Step 6: Stamp styles in `css/rivals.css`**

```css
.installed.jammed .card{filter:saturate(.45)}
.jam-stamp{top:38%;font-size:20px}
```

- [ ] **Step 7: Run the checks**

Run: `python tools/check_rivals.py`
Expected: all PASS.

- [ ] **Step 8: Look at it**

In a scratchpad script, screenshot:
- The expedition screen (8 encounters; the new four show emoji fallbacks until art exists).
- A Hydra battle (three head tiles, rig TARGET tag).
- A Corrosion battle after Seize Up (JAMMED stamp).

- [ ] **Step 9: Commit**

```bash
git add js/rivals.js js/game.js js/opponent.js css/rivals.css tools/check_rivals.py
git commit -m "Add tax, jam, corrode, junk and regrow actions and four new rivals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Nine new cards and Red Tape

**Files:**
- Create: `js/new-cards.js`
- Modify: `js/game.js` (helpers, `play`, `activate`, `renderReward` fallback)
- Modify: `js/table.js` (machine output, hand button label)
- Modify: `js/card-layout.js` (`cardEffects`, `card`, `renderBattle` wrapper)
- Modify: `js/salvage-actions.js` (`scrap`)
- Modify: `js/rarity.js`
- Modify: `css/card-types.css` (append)
- Modify: `index.html` (load `js/new-cards.js` after `js/salvage-crew.js`)
- Test: `tools/check_rivals.py`

**Interfaces:**
- Consumes: `dealDamage`, `targetPart`, `crewCount` (Tasks 3–4); `battle.queue`, `battle.blocked`, `battle.lastDamageTaken`.
- Produces, in `js/game.js`:
  - `TACTIC_EFFECTS`: object, `effect name → (b)=>void`.
  - Drawing: `drawOne()` → boolean; `drawCards(n)`; `handSize()` → number.
  - `payResource(c)` → `'ore'|'power'`.
  - `machineOutput(m)` → number.
  - Card flag `junk:true` and type `'junk'`.

- [ ] **Step 1: Write the failing scenarios**

Append to `tools/check_rivals.py`:

```python
@scenario
def scenario_new_tactics(pg):
    start(pg, 0, hand=["rummage"], deck=["drill", "boiler", "rivet"], power=1)
    pg.evaluate("() => play(0)")
    s = snap(pg)
    check("lucky rummage draws 2", len(s["hand"]) == 2 and len(s["deck"]) == 1, s)
    start(pg, 4, hand=["jam"], power=1)   # Audit, Collect Taxes, Audit: distinct names
    before = snap(pg)["queue"]
    pg.evaluate("() => play(0)")
    check("paperwork jam rotates the queue", snap(pg)["queue"] == before[1:] + before[:1])
    start(pg, 7, hand=["wrench", "wrench"], power=4)
    pg.evaluate("() => { setTarget('head1'); play(0); }")
    s = snap(pg)
    check("wrench deals 8 to a targeted part", s["parts"][0][1] == 6 and s["foe"] == 50, s)
    pg.evaluate("() => { setTarget('rig'); play(0); }")
    check("wrench deals 4 to the rig", snap(pg)["foe"] == 46)
    start(pg, 0, hand=["brolly"], power=2)
    pg.evaluate("() => play(0)")
    end_turn(pg)
    s = snap(pg)
    check("brass umbrella blocks the next rival turn", s["hull"] == 40 and s["blocked"] is False, s)


@scenario
def scenario_new_crew(pg):
    start(pg, 0, crew=["whisperer"], ore=0)
    pg.evaluate("() => { battle.machines = [{key:'drill',level:1,used:false,builtTurn:0}]; activate(0); }")
    check("gear whisperer adds 1 to upgraded output", snap(pg)["ore"] == 5)
    start(pg, 0, crew=["bodyguard"])
    end_turn(pg)
    check("tin bodyguard reduces each attack by 2", snap(pg)["hull"] == 39)
    start(pg, 0, crew=["ollie"], deck=["drill"] * 10)
    end_turn(pg)
    check("overtime ollie draws to 6", len(snap(pg)["hand"]) == 6)


@scenario
def scenario_new_machines(pg):
    start(pg, 0, power=0)
    pg.evaluate("() => { battle.machines = [{key:'golem',level:0,used:false,builtTurn:0}]; activate(0); }")
    s = snap(pg)
    check("scrap golem activates for free: 2 damage", s["foe"] == 26 and s["power"] == 0, s)
    pg.evaluate("() => scrap(0)")
    check("scrapped golem deals 6", snap(pg)["foe"] == 20)
    start(pg, 0, foe=6)
    pg.evaluate("() => { battle.machines = [{key:'golem',level:0,used:true,builtTurn:0}]; scrap(0); }")
    s = snap(pg)
    won = pg.evaluate("() => !!reward")
    check("scrapping a golem can win the battle", s["over"] and won, s)
    pg.evaluate("() => { reward = null; }")
    start(pg, 0, power=1, lastDamageTaken=7)
    pg.evaluate("() => { battle.machines = [{key:'spite',level:0,used:false,builtTurn:0}]; activate(0); }")
    s = snap(pg)
    check("spite engine deals last turn's damage", s["foe"] == 21 and s["power"] == 0, s)
    start(pg, 0, power=1, lastDamageTaken=15)
    pg.evaluate("() => { battle.machines = [{key:'spite',level:0,used:false,builtTurn:0}]; activate(0); }")
    check("spite engine caps at 10", snap(pg)["foe"] == 18)


@scenario
def scenario_red_tape(pg):
    start(pg, 6, hand=["redtape"], power=1, crew=["wisp"])
    label = pg.inner_text(".hand-zone [data-play]")
    check("red tape button says throw away", "Throw away" in label and "1 Power" in label, label)
    pg.evaluate("() => play(0)")
    s = snap(pg)
    check("throwing red tape removes it from the battle", "redtape" not in s["hand"] + s["discard"] + s["deck"], s)
    check("throwing red tape costs 1 Power and is not a tactic", s["power"] == 0, s)
    pg.evaluate("""() => { battle = null;
        for (const k of Object.keys(CARDS)) if (!CARDS[k].junk) save.owned[k] = 2;
        reward = {enemy: 0, choices: ['cannon']}; render(); }""")
    pg.click("[data-reward]")
    check("reward fallback never grants red tape", pg.evaluate("() => !save.owned.redtape && !save.deck.includes('redtape')"))


@scenario
def scenario_new_cards_render(pg):
    pg.evaluate("""() => { battle = null; reward = null;
        for (const k of ['rummage','jam','wrench','brolly','whisperer','bodyguard','ollie','golem','spite']) save.owned[k] = 1;
        view = 'collection'; render(); }""")
    names = pg.inner_text(".collection-grid")
    for name in ["Lucky Rummage", "Paperwork Jam", "Wrench in the Works", "Brass Umbrella", "Gear Whisperer",
                 "Tin Bodyguard", "Overtime Ollie", "Scrap Golem", "Spite Engine"]:
        check(f"workshop shows {name}", name.upper() in names.upper())
    check("workshop never shows red tape", "RED TAPE" not in names.upper())
```

- [ ] **Step 2: Run to see them fail**

Run: `python tools/check_rivals.py`
Expected: the five new scenarios FAIL (unknown card keys). Earlier scenarios PASS.

- [ ] **Step 3: Core helpers in `js/game.js`**

After the `START` line (line 19), add:

```js
const TACTIC_EFFECTS={};
function payResource(c){return c.type==='tactic'||c.type==='junk'?'power':'ore'}
function handSize(){return 5+battle.crew.filter(k=>k==='ollie').length}
function machineOutput(m){const c=CARDS[m.key],base=m.key==='spite'?Math.min(10,battle.lastDamageTaken||0):c.value;return base+m.level*2+(m.level?battle.crew.filter(k=>k==='whisperer').length:0)}
```

Replace `function draw(){...}` with:

```js
function drawOne(){if(!battle.deck.length){if(!battle.discard.length)return false;battle.deck=shuffle(battle.discard.splice(0))}battle.hand.push(battle.deck.pop());return true}
function drawCards(n){for(let i=0;i<n;i++)if(!drawOne())break}
function draw(){while(battle.hand.length<handSize()&&drawOne());}
```

In `play`, make three changes:
- Replace `let resource=c.type==='tactic'?'power':'ore';` with `let resource=payResource(c);`.
- Replace `}else{b.discard.push(k);` with `}else if(c.type==='junk'){log(`Threw away ${c.name}.`)}else{b.discard.push(k);`.
- Replace `log(`Played ${c.name}.`)}` with `if(TACTIC_EFFECTS[c.effect])TACTIC_EFFECTS[c.effect](b);log(`Played ${c.name}.`)}`.

In `activate`, replace `let v=c.value+m.level*2;` with `let v=machineOutput(m);`.

In `renderReward`, replace `Object.keys(CARDS).find(x=>(save.owned[x]||0)<2)` with `Object.keys(CARDS).find(x=>!CARDS[x].junk&&(save.owned[x]||0)<2)`.

- [ ] **Step 4: Create `js/new-cards.js`**

```js
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
```

`index.html`: insert `<script src="js/new-cards.js"></script>` right after `<script src="js/salvage-crew.js"></script>`.

- [ ] **Step 5: `js/table.js`**

In `renderBattle`'s `machine` helper, replace `value=c.value+m.level*2` with `value=machineOutput(m)`.

In the hand markup, replace:

```js
${CARDS[k].type==='machine'?'Build':CARDS[k].type==='crew'?'Recruit':'Play'} · ${CARDS[k].cost} ${CARDS[k].type==='tactic'?'Power':'Ore'}</button>
```
with:
```js
${CARDS[k].type==='machine'?'Build':CARDS[k].type==='crew'?'Recruit':CARDS[k].junk?'Throw away':'Play'} · ${CARDS[k].cost} ${payResource(CARDS[k])==='power'?'Power':'Ore'}</button>
```

and in the same expression replace the affordability check `b[CARDS[k].type==='tactic'?'power':'ore']<CARDS[k].cost` with `b[payResource(CARDS[k])]<CARDS[k].cost`.

- [ ] **Step 6: `js/card-layout.js`**

Replace the first three lines of `cardEffects` (from `function cardEffects(key,level=0){` through the `if(c.type==='machine')return ...;` line) with:

```js
function cardEffects(key,level=0,output){
 const c=CARDS[key];
 if(c.type==='machine')return {timing:'PER USE',items:[{kind:c.effect==='attack'?'damage':c.effect,amount:output??(key==='spite'?'X':c.value+level*2),sign:c.effect==='attack'?'':'+'}]};
```

Add these entries to the `special` object:

```js
  rummage:{timing:'ON PLAY',items:[]},
  jam:{timing:'ON PLAY',items:[]},
  wrench:{timing:'ON PLAY',items:[{kind:'damage',amount:8,sign:''}]},
  brolly:{timing:'NEXT RIVAL TURN',items:[]},
  whisperer:{timing:'UPGRADED MACHINES',items:[]},
  bodyguard:{timing:'RIVAL ATTACKS',items:[{kind:'damage',amount:2,sign:'−'}]},
  ollie:{timing:'HAND SIZE',items:[]},
  redtape:{timing:'JUNK',items:[]},
```

Change `function effectBadges(key,level=0){` to `function effectBadges(key,level=0,output){` and its first line `const effect=cardEffects(key,level);` to `const effect=cardEffects(key,level,output);`.

In `card=function(...)`, replace `kind=c.type==='tactic'?'power':'ore'` with `kind=payResource(c)`.

In the `renderBattle` wrapper:
- Replace `effectBadges(m.key,m.level)` with `effectBadges(m.key,m.level,machineOutput(m))`.
- Replace `const c=CARDS[m.key],value=c.value+m.level*2;` with `const c=CARDS[m.key],value=machineOutput(m);`.

- [ ] **Step 7: Golem in `js/salvage-actions.js`**

Replace:

```js
 b.discard.push(m.key);b.ore+=ore;b.hull+=repair;
```
with:
```js
 b.discard.push(m.key);b.ore+=ore;b.hull+=repair;
 if(m.key==='golem')dealDamage(6);
```

and replace the function's final `render();` (just before `};`) with `check();render();`.

- [ ] **Step 8: Rarity and junk styling**

In `js/rarity.js`, add the entries below to `CARD_RARITIES`:

```js
rummage:'common',jam:'uncommon',wrench:'uncommon',whisperer:'uncommon',brolly:'rare',bodyguard:'rare',ollie:'rare',golem:'rare',spite:'unique'
```

Then make the `card` wrapper skip junk. Insert as its first line:

```js
 if(CARDS[key].junk)return cardBeforeRarity(key,action,extra);
```

Append to `css/card-types.css`:

```css
.card.printed-card[data-card-type="junk"]{background-color:#a9a49a}
```

- [ ] **Step 9: Run the checks**

Run: `python tools/check_rivals.py`
Expected: all PASS, including `scenario_existing_rivals_unchanged`.

- [ ] **Step 10: Commit**

```bash
git add js/new-cards.js js/game.js js/table.js js/card-layout.js js/salvage-actions.js js/rarity.js css/card-types.css index.html tools/check_rivals.py
git commit -m "Add nine new cards and the Red Tape junk card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Czech, README, final verification

**Files:**
- Modify: `js/locale.js` (new `Object.assign(CZECH,{...})` block before the `// Long phrases take precedence` comment; new `.replace` lines in `translateText`)
- Modify: `README.md`
- Modify: `assets/screenshots/gameplay.png` (regenerated)
- Test: `tools/check_rivals.py`

**Interfaces:**
- Consumes: every English string introduced in Tasks 3–6.

- [ ] **Step 1: Write the failing scenario**

Append to `tools/check_rivals.py`:

```python
@scenario
def scenario_czech(pg):
    pg.evaluate("() => { language = 'cs'; localizePage(); }")
    start(pg, 7, hand=["rummage", "wrench", "redtape"], power=3)
    pg.wait_for_timeout(200)
    text = pg.inner_text("main")
    for english in ["NEXT ACTIONS", "Triple Bite", "Head I", "TARGET", "Lucky Rummage", "Wrench in the Works",
                    "Red Tape", "Throw away", "While intact", "damage"]:
        check(f"czech replaces '{english}'", english not in text, english)
    for czech in ["PŘÍŠTÍ AKCE", "Trojitý kousanec", "Hlava I", "CÍL", "Šťastné hrabání", "Klíč do soukolí", "Úřední šiml"]:
        check(f"czech shows '{czech}'", czech in text, czech)
    end_turn(pg)
    check("czech opponent panel", "poškození" in pg.inner_text("#opponent-sequence"))
    pg.evaluate("() => { language = 'en'; localizePage(); }")
```

- [ ] **Step 2: Run to see it fail**

Run: `python tools/check_rivals.py`
Expected: `scenario_czech` lines FAIL (English strings still visible).

- [ ] **Step 3: Add the Czech table to `js/locale.js`**

Insert before `// Long phrases take precedence; token boundaries keep names and words intact.`:

```js
Object.assign(CZECH,{
 'NEXT ACTIONS':'PŘÍŠTÍ AKCE','NEXT':'PŘÍŠTÍ','THEN':'POTOM','LATER':'POZDĚJI','TARGET':'CÍL','BLOCKED':'ZABLOKOVÁNO','JAMMED':'ZASEKNUTO','SCRAPPED':'ZNIČENO',
 'Jammed until next turn':'Zaseknuto do příštího kola','Jammed until next turn.':'Zaseknuto do příštího kola.','Target the rival rig':'Zamířit na soupeřův stroj',
 'Jams a machine':'Zasekne stroj','Destroys a machine':'Zničí stroj','Regrows a head':'Nechá dorůst hlavu','Throw away':'Zahodit','junk':'harampádí','FINALE':'FINÁLE',
 'NEXT RIVAL TURN':'PŘÍŠTÍ TAH SOUPEŘE','UPGRADED MACHINES':'VYLEPŠENÉ STROJE','RIVAL ATTACKS':'ÚTOKY SOUPEŘE','HAND SIZE':'VELIKOST RUKY','JUNK':'HARAMPÁDÍ',
 'Lucky Rummage':'Šťastné hrabání','Paperwork Jam':'Papírová zácpa','Wrench in the Works':'Klíč do soukolí','Brass Umbrella':'Mosazný deštník','Gear Whisperer':'Zaříkávačka ozubenic',
 'Tin Bodyguard':'Plechový strážce','Overtime Ollie':'Přesčasový Olda','Scrap Golem':'Šrotový golem','Spite Engine':'Motor zášti','Red Tape':'Úřední šiml',
 'Draw 2 cards.':'Dober si 2 karty.','Move the rival’s next action to the back of its queue.':'Přesuň příští akci soupeře na konec jeho fronty.',
 'Deal 8 damage to the target if it is a part, otherwise 4 to the rig.':'Způsob 8 poškození cíli, pokud je to součást; jinak 4 poškození stroji.',
 'Block all damage from the rival’s next turn.':'Zablokuj veškeré poškození z příštího tahu soupeře.',
 'Upgraded machines produce +1 extra Ore, Power or damage.':'Vylepšené stroje dávají o 1 rudu, energii nebo poškození navíc.',
 'Every rival attack deals 2 less damage.':'Každý útok soupeře způsobí o 2 poškození méně.','Draw up to 6 cards instead of 5.':'Dobírej si do 6 karet místo 5.',
 'Spend 1 Power: deal damage equal to the damage you took last rival turn (max 10).':'Zaplať 1 energii: způsob tolik poškození, kolik jsi utrpěl v minulém tahu soupeře (nejvýše 10).',
 'Cannot be played. Pay 1 Power to throw it away for the rest of the battle.':'Nedá se zahrát. Za 1 energii ho do konce bitvy zahodíš.',
 'Somewhere in here is a plan. Also a sandwich.':'Někde tu je plán. A taky svačina.','Please submit your attack in triplicate.':'Útok prosím podejte ve třech kopiích.',
 'Precision engineering, applied imprecisely.':'Precizní technika, nepřesně použitá.','Forecast: heavy shrapnel, then clearing.':'Předpověď: silné šrapnely, později vyjasnění.',
 'She asks the gears nicely. They listen.':'Ozubenic se hezky zeptá. A ony poslechnou.','Takes hits. Takes no questions.':'Bere rány. Nebere otázky.',
 'Coffee is a food group.':'Káva je potravinová skupina.','Assembly optional. Disassembly spectacular.':'Montáž nepovinná. Demontáž velkolepá.',
 'Runs on grudges. Excellent mileage.':'Jezdí na zášť. Skvělá spotřeba.','Form 27-B, now in triplicate.':'Formulář 27-B, nyní ve třech kopiích.',
 'Sir Reginald Tax':'Sir Reginald Daň','Tollgate Ridge':'Mýtný hřbet','Audit':'Audit','Collect Taxes':'Výběr daní',
 'Collects a toll on every rock, breath and bad idea. Takes your Ore every few turns.':'Vybírá mýto z každého kamene, nádechu a hloupého nápadu. Každých pár kol ti sebere rudu.',
 'Madame Corrosion':'Madame Koroze','The Rust Marsh':'Rezavá bažina','Rust Spray':'Rezavá sprška','Seize Up':'Zadření','Corrode':'Koroze','Rust Cauldron':'Rezavý kotel',
 'Brews rust by the bucket. Jams your machines and dissolves the ones you never upgraded.':'Vaří rez po kýblech. Zasekává ti stroje a rozpouští ty, které jsi nevylepšil.',
 'While intact: Corrode destroys a machine.':'Dokud vydrží: Koroze ničí stroje.',
 'The Bureaucrat':'Byrokrat','Ministry of Forms':'Ministerstvo formulářů','Stamp of Disapproval':'Razítko nesouhlasu','File in Triplicate':'Ve třech kopiích','Filing Cabinet':'Kartotéka',
 'Has a stamp for everything, including you. Buries your deck in Red Tape.':'Má razítko na všechno, i na tebe. Zasype ti balíček úředním šimlem.',
 'While intact: repairs 3 Hull each turn.':'Dokud vydrží: každé kolo obnoví 3 body odolnosti.',
 'The Clockwork Hydra':'Strojová hydra','The Gear Abyss':'Propast ozubenic','Triple Bite':'Trojitý kousanec','Regrow':'Dorůstání','Head I':'Hlava I','Head II':'Hlava II','Head III':'Hlava III',
 'Three heads, zero manners. Every head bites harder, and they grow back.':'Tři hlavy, nula vychování. Každá hlava kousne silněji a dorůstají.',
 'While intact: +3 damage on every attack.':'Dokud vydrží: +3 poškození ke každému útoku.',
 'CERTIFIED HYDRA WRANGLER':'CERTIFIKOVANÝ KROTITEL HYDER','You conquered the deepest mine. Experiment with your deck and challenge the crews again.':'Pokořil jsi nejhlubší důl. Experimentuj s balíčkem a vyzvi posádky znovu.',
 'The mines go deeper… four new rivals wait below.':'Doly jdou hlouběji… dole čekají čtyři noví soupeři.'
});
```

In `translateText`, add these lines to the `.replace` chain right after the `Spend (\d+) Power: deal (\d+) damage` line. Translate the whole golem sentence before the generic patterns; its upgraded "4 damage" variant must still translate.

```js
  .replace(/Activate: deal (\d+) damage\. When scrapped: deal 6 damage to the target\./g,'Aktivace: způsob $1 poškození. Při sešrotování: způsob cíli 6 poškození.')
  .replace(/^Takes (\d+) Ore$/,(_,n)=>`Sebere ${n} ${czechResourceForm(n,'ore')}`)
  .replace(/^Adds (\d+) Red Tape$/,'Přidá $1× úřední šiml')
  .replace(/^Repairs (\d+) Hull$/,'Obnoví $1 odolnosti')
  .replace(/(.*?) jammed (.*?)\./g,'$1 zasekl: $2.')
  .replace(/(.*?) dissolved (.*?)\./g,'$1 rozpustil: $2.')
  .replace(/(.*?) added (\d+) Red Tape to your deck\./g,'$1 ti přidal do balíčku $2× úřední šiml.')
  .replace(/(.*?) regrew (.*?)\./g,'$1: dorostla $2.')
  .replace(/(.*?) collected (\d+) Ore\./g,(_,who,n)=>`${who} vybral ${n} ${czechResourceForm(n,'ore')}.`)
  .replace(/(.*?) repaired (\d+) Hull\./g,'$1 obnovil $2 bodů odolnosti.')
  .replace(/^(.*?) destroyed\.$/,'Zničeno: $1.')
  .replace(/Threw away (.*?)\./g,'Zahozeno: $1.')
```

- [ ] **Step 4: Run the checks**

Run: `python tools/check_rivals.py`
Expected: all PASS. If a specific English string still shows, find its exact source text (including curly apostrophes `’`) and correct the key; don't loosen the check.

- [ ] **Step 5: README**

In `README.md`:
- Replace `- Four rival encounters and seventeen illustrated cards.` with `- Eight rival encounters and twenty-six illustrated cards.`
- Replace `Opponents use escalating attack patterns in this prototype.` with `Each rival shows its next three actions; later rivals steal Ore, jam and dissolve machines, clog your deck with Red Tape, and have parts you can target and destroy.`
- Replace `Core cards and opponents are defined in `js/game.js`; Jegor and Bobo are in `js/salvage-crew.js`.` with `Core cards are defined in `js/game.js`, later cards in `js/new-cards.js`, and Jegor and Bobo in `js/salvage-crew.js`. Rivals, their action scripts and parts are in `js/rivals.js`. Run `python tools/check_rivals.py` (needs Playwright) to check rival and card rules in a headless browser.`
- Append to the last paragraph: ` Cards or rivals whose JPG doesn't exist yet show their emoji instead; add `<id>.png` to `assets/images/handdrawn/` and run the conversion script to give them art.`

- [ ] **Step 6: Full verification**

Run: `python tools/check_rivals.py`
Expected: all PASS, `0 failure(s)`.

Then open `index.html` with a scratchpad Playwright script and screenshot, at both 1366×900 and 390×844:
- The expedition screen.
- A Hydra battle with a head targeted.
- The Workshop with new cards.

Check visually:
- No text overflow.
- The queue scrolls sideways on the phone.
- Emoji fallbacks appear for art that doesn't exist yet.

- [ ] **Step 7: Regenerate the README screenshot**

Use the same staged mid-game board used for the current `assets/screenshots/gameplay.png`: rival 1 (Professor Oops), turn 3, Hull 32, rival 24, Ore 7, Power 5, machines drill (upgraded, used) / boiler / cannon, crew jegor and bobo, hand ore / repair / charge / laser / mend, last tactic blast, one resolved rival turn. Capture full page at 1280 width with the mouse moved to the corner. Save it with Pillow `optimize=True` over `assets/screenshots/gameplay.png`.

- [ ] **Step 8: Commit**

```bash
git add js/locale.js README.md assets/screenshots/gameplay.png tools/check_rivals.py
git commit -m "Translate rival engine and new cards to Czech, update README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
