# Iron Mandate sound effects

Original procedural sound effects generated locally with Python's standard library. No external recordings or audio service were used. All files are mono, 24 kHz, 16-bit PCM WAVs with short attack/release envelopes and peaks below clipping.

| File | Sound |
| --- | --- |
| ore.wav | Metallic ore clinks |
| power.wav | Electrical coil surge |
| deal-damage.wav | Sharp weapon impact |
| take-damage.wav | Low Hull impact |
| repair.wav | Ratchet and repair chime |
| build.wav | Assembly clanks and steam |
| scrap.wav | Grinding and falling metal |
| upgrade.wav | Mechanical rising chimes |
| draw.wav | Card shuffle |
| turn.wav | Two-note turn signal |
| reward.wav | Card acquisition fanfare |
| victory.wav | Rising industrial fanfare |
| defeat.wav | Falling metal and steam |

Regenerate from the project root with `python tools/generate_sounds.py`. This overwrites these generated WAV files. Playback is implemented in `js/sound.js`, starts only after user interaction, and respects saved mute/volume settings.
