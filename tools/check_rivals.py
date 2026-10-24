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


TEST_PART = "[{id:'p1',name:'Test Part',hull:10,max:10,destroyed:false,effect:'none',text:'Test'}]"


@scenario
def scenario_targeting_routes_damage(pg):
    start(pg, 0, hand=["blast"], power=5)
    pg.evaluate(f"() => {{ battle.parts = {TEST_PART}; render(); }}")
    pg.click('[data-target="p1"]')
    check("clicking a part sets the target", snap(pg)["target"] == "p1")
    chip = pg.inner_text(".hull-chip.hull-rival")
    check("sticky chip names the targeted part", "TEST PART" in chip.upper() and "10" in chip, chip)
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
    check("corrode destroys the un-upgraded machine", [m[0] for m in s["machines"]] == ["drill"] and "rivet" in s["discard"] + s["hand"] + s["deck"], s)
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
