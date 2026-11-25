# Signal / Intent

**A visitor tries a tiny finger gesture, watches simulated electrical activity change around a wristband, sees an independently implemented decoder turn that pattern into a command, then learns why moving the band can confuse the decoder.**

An independent educational project for the Global Virtual Hackathon 2026. Not affiliated with Meta, Ray-Ban or EssilorLuxottica.

## Run it

```bash
npm install
npm run dev
```

`npm test` runs the model tests. `npm run build` writes a static site to `dist/` that works from any folder with no server, keys or network calls.
Add `?dev` to log each trial. Add `?shift=42&contact=0.5&strength=1&noise=1` to share settings (no parameter can set a prediction).

## How a gesture becomes a command

1. `generator.ts`: six generic muscle groups fire signed, spiky activity with seeded randomness.
2. Each group is mixed into eight contacts by circular distance. Rotating the band rotates that mixing. A loose contact loses gain and gains artifact.
3. `decoder.ts`: 20 Hz high-pass, then RMS in four consecutive 150 ms windows per contact, as a log ratio to quiet baseline (32 numbers).
4. Distance to four templates becomes a bounded **match score**: `exp(-mean(d²) / 2σ²)`. It is not a probability.
5. Activation gate, threshold, margin, three agreeing frames, then one event. Ready, Candidate, Fired, Cooldown, Ready. Cooldown needs a release as well as time.
6. `commandReducer`: the glasses change only when an event arrives. Focus clamps at the ends. SELECT toggles the focused card.

The decoder's signature accepts samples and configuration only. A test feeds it lying labels and checks that nothing changes.

| Folder | Contents |
| --- | --- |
| `src/model` | generator, decoder, templates, calibration, reducer, motor unit figure (plain TypeScript, no dependencies) |
| `src/store.ts` | one central store, trial playhead, event boundary |
| `src/world` | three.js film: shots, the band (GLB, opens along its axis, x-ray), sculpted hand and muscle strands, liquid portrait reveal, photo ladder, buried ring of screens, waveforms and score towers, HDR post and liquid glass |
| `src/ui` | scenes, figures, labs, cursor, sources |
| `tests` | model tests (34) |
| `scripts/tune.ts` | prints confusion counts while tuning. Synthetic behaviour, not accuracy claims |

## Teaching choices, not measurements

Source angles, burst timings, spatial selectivity, noise, sigma 0.5, threshold 0.66, margin 0.12, gate 0.16, 1 kHz sampling, eight contacts and 1.6 s trials were all chosen so the mechanism is visible. Units are arbitrary. None are Meta's constants.

**The figures.** Every figure is written from one trial object: eight lines from samples, bars from the 32 features, towers from match scores, the word from the emitted event.

**Calibration split.** A held-out trial is generated and scored first. Three examples per class with other seeds update the references (blend 0.85). The same held-out samples are scored again, so only the references differ. It can make the old position worse, and the page shows that. It cannot recover signal that never reached a contact.

## Limitations

Synthetic sources and noise. Generic geometry. Simplified filter and classifier. No electrodes: nothing here reads your muscles. No verified consumer teardown. No product accuracy claimed. Real recordings are omitted: the public dataset is CC BY-NC 4.0 and a tiny sample would prove little.

## Evidence

1. Meta, Meta Ray-Ban Display announcement, 17 September 2025: https://about.fb.com/news/2025/09/meta-ray-ban-display-ai-glasses-emg-wristband/
2. Meta, EMG Wristbands and Technology: https://www.meta.com/emerging-tech/emg-wearable-technology/
3. Kaifosh, Reardon and CTRL-labs at Reality Labs, Nature 645, 702 to 711 (2025): https://pmc.ncbi.nlm.nih.gov/articles/PMC12443603/ (article licence CC BY-NC-ND 4.0, paraphrased, no figures reused)
4. https://github.com/facebookresearch/generic-neuromotor-interface (CC BY-NC 4.0)

## Assets

- Hand mesh: WebXR Input Profiles generic hand, MIT, Amazon (`public/models/hand-LICENSE.md`). Subdivided and posed in code.
- Type: Unbounded and Host Grotesk, SIL Open Font Licence, bundled.
- Band model: our own conceptual geometry, built in Blender (`blender/export_glb.py` writes `public/models/band.glb`). Not a verified teardown.
- Photographs: see `PHOTO-CREDITS.md`. Meta press images must be cleared before publishing. No endorsement implied.
- Score: original, synthesised by `scripts/score.py` (no samples). Enter starts it, the nav mutes it.
- The portrait reveal is a composite of a press portrait and a product photograph (`scripts/reveal.py`), and the page says so.
- Everything else (materials, hand surface, lightning, figures) is generated in code.
- Code was written with Claude. The team should be ready to explain every module above.

## Still to do by the team

- Team ownership table.
- Three cold-user tests (PRD section 36) and what changed because of them.
- Demo video.
