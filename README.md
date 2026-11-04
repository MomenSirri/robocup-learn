# CFOP Coach

A mobile-first, interactive 3D trainer that teaches CFOP through understanding:
**Recognise → Understand → Predict → Solve → Practise**.

- Interactive 3D cube: orbit, swipe-to-turn, step through algorithms forwards and backwards, change speed, see glowing piece paths, ghost targets and move arrows
- Cases grouped by *idea* (e.g. "Split pair: join, then insert", "The Sune family") with links between related cases (mirror, inverse, shared triggers)
- Per-move narration generated from the cube state ("pair formed", "cross lifted temporarily", "F2L restored")
- Progressive hints: key pieces → where they go → first move → full solution
- Recognition trainer that adapts to the cases you struggle with or confuse
- Discovery mode: find your own solution, then compare it with an expert line (move count, cancellations, rotations, regrips)
- Progress tracking: recognition and execution times, accuracy, hardest cases, confusion pairs

See **[docs/DESIGN.md](docs/DESIGN.md)** for the learning system, UX, architecture and roadmap.

## Run

```bash
npm install
npm run dev        # open the printed URL on your phone (same network)
npm test           # cube model + curriculum validity tests
npm run build      # production PWA in dist/
```

Optional end-to-end gesture smoke test (needs Playwright and `npm run preview` running):

```bash
node scripts/smoke-gestures.cjs
```
