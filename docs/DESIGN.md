# CFOP Coach: design proposal

A mobile-first trainer that teaches *why* CFOP works. Algorithms come out of
understanding, not the other way round.

---

## 1. Learning system

### 1.1 The loop: Recognise → Understand → Predict → Solve → Practise

Every case is taught through the same five steps. Each one is a tab on the
lesson screen, with the 3D cube always at the centre.

| Step | Question it answers | What the app does |
|---|---|---|
| **Recognise** (See) | *What am I looking at?* | Dims everything except the key pieces and pulses them. Shows *computed* cues (e.g. "Corner on top · white on the side; edge on top"), a 2D diagram, ghost targets ("where they go") and "another angle" (the same case after a U turn). |
| **Understand** (Why) | *Why does this sequence work?* | Steps through the solution move by move, forwards or backwards, at 0.5×/1×/2×. Glowing 3D paths show where each key piece travels: the current move is bright, past moves are faint. A move arrow shows the next turn. The algorithm is split into **triggers** (Sexy, Sledgehammer, Insert, Sune…), each with a one-line job. Every move gets a generated **narration** ("Corner and edge are now joined into a pair", "Cross edge lifted temporarily, it must come back down", "F2L restored"). |
| **Predict** | *Can I anticipate the next move?* | Before each move the learner picks the next turn from 3 options. After 2 misses an arrow reveals it. Each correct choice plays with narration. This turns watching into active reasoning. |
| **Solve** | *Can I do it myself?* | The learner solves the case on the 3D cube by swiping stickers or using the move pad. Hints are progressive (see 1.3). On success, a solution analysis is shown (see 1.4). |
| **Practise** (Drill) | *Can I do it from any angle, fast?* | Random pre-AUF, a timer and execution tracking. |

### 1.2 Concepts, not lists

Cases are grouped into **families that share one idea**. Each family has a
glyph, a one-line idea and a 2–4 step mental model:

- **Cross**: plan the 4 edges *relative to each other* (an optimal solver gives the benchmark).
- **F2L**: *Basic inserts* · *Split pair: join, then insert* · *White on top* (turn it sideways first) · *Corner stuck in slot* · *Edge stuck in slot* · *Both in slot*.
- **OLL**: *Edge flips* (F-sexy-F′ and the wide f version; dot = both) · *The Sune family* (every corner-only OLL is Sune-based) · *Trigger combos* (sexy + sledge, fat Sune, …).
- **PLL**: *Edges only* (U, H, Z) · *Adjacent corner swap* (T, J) · *Corner 3-cycles & diagonals* (A, E, Y, V).

Cases link to each other with **relations**: *mirror*, *inverse*,
*same triggers*, *extended version*, *first/second half of*. The learner sees
"I already know this — it's the Sune again with r" instead of a new alg.
"Another angle" and random AUF in drills show that one idea covers four
orientations.

### 1.3 Smart hints (progressive)

1. **Key pieces**: dim the cube and pulse the pieces that matter.
2. **Where they go**: translucent ghost pieces at their solved positions.
3. **First move**: a 3D arrow on the layer to turn. It is computed *from the
   learner's current state*, so it adapts if they have already made moves (cross
   hints come from an optimal solver).
4. **Full solution**: the remaining move sequence.

Hint use is recorded and lowers the case's mastery score.

### 1.4 Solution analysis (Discovery)

When the learner reaches the goal by themselves, the analyser reports:

- move count vs. the reference, after **cancellation** (R R → R2, R R′ → nothing, also across parallel layers)
- **undo spots** (trial and error)
- **cube rotations** and an estimated **regrip** count
- **awkward moves** for the stage (B, D, …)
- the line an **experienced solver** would use (for the cross: an optimal BFS solution)

### 1.5 Adaptive training model

For each case it stores: attempts, correct and wrong answers, the last 20
recognition times, the last 20 execution times, hints, streak, last seen, and a
*confused-with* histogram. Also daily aggregates, mistake kinds and self-found
solutions.

- **Difficulty** = error rate (Laplace-smoothed) + slowness (recognition time over ~4 s) + hint rate − streak bonus.
- **Scheduler**: weighted random by difficulty plus staleness, never the same case twice in a row.
- **Distractors**: past confusions first, then same family, so the trainer drills the distinctions you actually miss.
- **Two quiz modes**: *Name it* (which case?) and *Idea* (which approach/family?).

---

## 2. UX structure (mobile-first)

- **Bottom tab bar**: Learn · Train · Discover · Progress. Each tab keeps its own navigation stack.
- **Hero cube**: every working screen gives the cube the flexible top area. Controls sit in a bottom sheet (thumb zone), text is minimal, and segmented controls replace menus.
- **Gestures**: swipe a sticker to turn its layer (the direction is resolved in screen space, so it works from any viewing angle). Drag the background to orbit. The move pad is the precise alternative.
- **Visual language**: pulsing glow = important · ghost outline = destination · tube path = travel · white arrow = next turn · colour-coded trigger chunks in the timeline · green/amber/blue narration beats (progress / temporary breakage / information).
- **Stage masks** reduce noise: in F2L the unrelated top-layer pieces are grey, in OLL only yellow stickers show, in the cross only cross edges.

### Main screens

1. **Home / Learn**: rotating hero cube, CFOP path (Cross → F2L → OLL → PLL) with mastery rings, "Today's focus" (weakest cases).
2. **Stage concept map**: families, each with its idea and steps, plus case tiles (2D diagrams, accuracy, learned badge).
3. **Lesson**: See / Why / Predict / Solve / Drill tabs around the 3D cube.
4. **Recognition trainer**: pool (F2L/OLL/PLL/Mix), mode (Name it / Idea), live recognition timer, answer grid with diagrams, feedback that compares the case with the one you picked side by side, optional execution (virtual cube or "done on my real cube").
5. **Discover**: free experimentation on a random or chosen case, hint ladder, an "expert line" reveal, and the analysis report.
6. **Progress**: attempts, accuracy, average recognition and execution time, mastery per stage, trends, hardest cases, confusion pairs, common mistakes.

---

## 3. Technical architecture

```
src/
  cube/            pure TypeScript domain model (no UI) — fully unit-tested
    cube.ts        cubie model: each cubie = home position + 3×3 rotation matrix;
                   notation parser (face, wide, slice, rotations), inverse, scrambles,
                   frame-relative "solved" checks (rotation-invariant)
    analysis.ts    F2L features (pair connected? white facing? where?), LL counts,
                   per-move narration, trigger chunking, cancellation/simplify,
                   solution analysis, piece path sampling for 3D trails
    crossSolver.ts optimal cross via full BFS table over 24^4 edge states
  content/
    cases.ts       stages, families (concepts) and cases (alg, cue, why, relations)
    caseState.ts   case instances (state = inverse(alg) + AUF), key pieces, masks
  training/
    store.ts       learner model, persistence (localStorage), scheduler, distractors
    goals.ts       goal detection per stage, hint labels
  three/
    CubeView.ts    three.js renderer: one shared WebGL context, animated layer turns,
                   highlight/focus/mask, ghosts, paths, move arrows, gesture → move
  ui/              React hooks & widgets: usePlayer, useSolve, Diagram (SVG),
                   MovePad, Timeline, HintLadder, ReportCard…
  screens/         Home, StageMap, Lesson, Trainer, Discover, Stats
```

Key decisions:

- **Correct by construction.** A case is generated by applying the inverse of its algorithm to a solved cube, so the case and its solution can never drift apart. Tests check every case at all 4 AUFs: the stage invariants hold (cross and other slots intact for F2L, F2L intact for OLL, orientation intact for PLL), and the solution reaches the goal.
- **One model drives everything.** The same rotation matrices feed the 3D meshes, the analysis and the 2D diagrams. "Solved" is measured relative to the centres, so cube rotations and slice moves never confuse it.
- **Generated explanations.** Narration and F2L recognition cues are computed from the state rather than hand-written, so they stay accurate from every angle.
- **Stack**: Vite + React 19 + TypeScript + three.js, shipped as an installable PWA (manifest + offline service worker). The domain layer has no DOM dependency, so it can be reused in a React Native / Capacitor shell or a native port unchanged.
- **Mobile performance**: a single WebGL context reused across screens (iOS limits contexts), pixel ratio capped at 2, ~80 meshes, and no post-processing.

---

## 4. Implementation plan

### Phase 1: first functional version ✅ (this commit)
- [x] Cube engine, notation, inverse, simplify, scrambles, frame-relative checks
- [x] Optimal cross solver
- [x] Concept-grouped curriculum: cross plus the full sets: 41 F2L, 57 OLL, 21 PLL, with automatic inverse/mirror relations (F2L algorithms not hand-written are generated from inserts by `scripts/gen-f2l.ts`)
- [x] 3D cube: orbit, swipe-to-turn, animated moves, speed, step back/forward, highlight, focus/dim, ghosts, piece paths, move arrows
- [x] Lesson flow: See / Why / Predict / Solve / Drill
- [x] Progressive 4-level hints
- [x] Recognition trainer with adaptive scheduling, confusion-aware distractors, recognition and execution timing
- [x] Discovery sandbox with solution analysis
- [x] Progress dashboard
- [x] PWA shell, unit tests (cube model, content validity, analysis)

- [x] **My path**: the 2-look last layer (16 algorithms in 4 steps) with "I know this" ticks, the next algorithm to learn, computer-checked holding tips and a path-only drill
- [x] **Which PLL?**: identify a PLL by entering 6 stickers from a real cube

### Phase 2: deeper understanding
- Back-slot F2L variants (solving into the other three slots without rotating)
- "Setup move" lessons: show explicitly how a U/y setup turns an unfamiliar case into a known one (a side-by-side transform animation)
- Pair-centric camera: auto-orbit so the pair being built stays in view
- Live partial-turn gestures (the layer follows the finger) and haptics
- Recognition drills on partial views (only two sides visible, as in real solves)

### Phase 3: smarter coach
- Short IDA* search for F2L (⟨R,U,F⟩ generators) so Discovery can compare against the *optimal* solution, not just the reference
- Mistake taxonomy from move logs (wrong AUF, mirrored alg, inverse direction)
- Spaced repetition (SM-2 style intervals) on top of the difficulty weighting
- Full-solve mode: scramble → cross → F2L → OLL → PLL with per-stage splits and look-ahead tips

### Phase 4: platform
- Capacitor wrapper for the iOS/Android stores, cloud sync of progress
- Bluetooth smart-cube support (moves come straight from a real cube, so execution timing is exact)
