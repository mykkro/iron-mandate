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
