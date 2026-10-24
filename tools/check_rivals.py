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
