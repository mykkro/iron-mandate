"""Generate original, deterministic mono PCM game effects. No dependencies."""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 24000
OUT = Path(__file__).resolve().parents[1] / 'assets' / 'audio'

def render(name, duration, layers):
    samples = [0.0] * int(duration * RATE)
    rng = random.Random(name)
    for kind, start, length, freq, amplitude, decay in layers:
        phase = 0.0
        low = 0.0
        previous = 0.0
        for j in range(int(length * RATE)):
            i = int(start * RATE) + j
            if i >= len(samples):
                break
            t = j / RATE
            progress = t / length
            envelope = min(1, t / .003) * math.exp(-decay * progress) * min(1, (length - t) / .018)
            if kind == 'metal':
                value = (math.sin(2 * math.pi * freq * t) + .55 * math.sin(2 * math.pi * freq * 2.76 * t) + .25 * math.sin(2 * math.pi * freq * 5.41 * t)) / 1.8
            elif kind in ('noise', 'steam', 'grind'):
                noise = rng.uniform(-1, 1)
                low += .12 * (noise - low)
                value = noise - low if kind == 'steam' else low * 2
                if kind == 'grind':
                    value *= .35 + .65 * abs(math.sin(2 * math.pi * freq * t))
            elif kind == 'zap':
                phase += 2 * math.pi * freq * (1 + 1.8 * progress) / RATE
                value = (math.sin(phase) + .22 * math.sin(phase * 3)) * (.7 + .3 * math.sin(2 * math.pi * 35 * t))
            elif kind == 'thud':
                phase += 2 * math.pi * freq * (1 - .7 * progress) / RATE
                value = math.sin(phase)
            else:
                value = math.sin(2 * math.pi * freq * t)
            samples[i] += value * amplitude * envelope
            previous = value
    peak = max(abs(v) for v in samples) or 1
    gain = min(1, .72 / peak)
    payload = b''.join(struct.pack('<h', int(max(-1, min(1, v * gain)) * 32767)) for v in samples)
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as sound:
        sound.setnchannels(1)
        sound.setsampwidth(2)
        sound.setframerate(RATE)
        sound.writeframes(payload)

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    effects = {
        'ore': (.42, [('metal', 0, .26, 1120, .45, 7), ('metal', .09, .3, 1680, .3, 7), ('noise', 0, .1, 0, .25, 5)]),
        'power': (.5, [('zap', 0, .35, 180, .32, 2), ('steam', .02, .2, 0, .08, 4), ('metal', .27, .18, 880, .18, 5)]),
        'deal-damage': (.4, [('thud', 0, .25, 145, .6, 5), ('noise', 0, .14, 0, .8, 6), ('metal', .03, .3, 380, .25, 7)]),
        'take-damage': (.48, [('thud', 0, .38, 85, .65, 4), ('noise', 0, .16, 0, .65, 6), ('metal', .05, .3, 210, .3, 5)]),
        'repair': (.6, [('grind', 0, .16, 42, .6, 2), ('metal', .13, .24, 660, .22, 6), ('tone', .25, .3, 990, .16, 4)]),
        'build': (.48, [('metal', 0, .16, 270, .45, 7), ('noise', .01, .12, 0, .5, 6), ('metal', .15, .23, 540, .34, 6), ('steam', .19, .23, 0, .1, 4)]),
        'scrap': (.55, [('grind', 0, .23, 36, .6, 2), ('metal', .06, .28, 430, .3, 6), ('metal', .19, .28, 1280, .22, 6)]),
        'upgrade': (.7, [('grind', 0, .18, 30, .55, 3), ('metal', .14, .25, 440, .24, 6), ('metal', .27, .25, 660, .24, 6), ('metal', .4, .25, 880, .24, 6)]),
        'draw': (.3, [('steam', 0, .1, 0, .15, 3), ('steam', .07, .12, 0, .13, 3), ('noise', .17, .08, 0, .2, 4)]),
        'turn': (.36, [('metal', 0, .17, 520, .28, 7), ('metal', .13, .2, 780, .22, 6)]),
        'reward': (.85, [('steam', 0, .15, 0, .13, 4), ('metal', .06, .35, 660, .3, 5), ('metal', .19, .35, 880, .28, 5), ('metal', .34, .45, 1320, .26, 5)]),
        'victory': (1.1, [('metal', 0, .4, 330, .28, 4), ('metal', .16, .4, 440, .28, 4), ('metal', .32, .45, 550, .26, 4), ('metal', .51, .55, 660, .3, 4)]),
        'defeat': (.9, [('thud', 0, .5, 120, .4, 3), ('metal', .04, .35, 330, .28, 5), ('metal', .22, .35, 247, .27, 5), ('steam', .33, .5, 0, .15, 3)]),
    }
    for name, (duration, layers) in effects.items():
        render(name, duration, layers)
    print(f'Generated {len(effects)} original PCM sound effects in assets/audio/')

if __name__ == '__main__':
    main()
