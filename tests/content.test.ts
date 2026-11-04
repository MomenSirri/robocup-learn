import { describe, it, expect } from 'vitest';
import { CASES, FAMILIES, CASE_BY_ID, FAMILY_BY_ID } from '../src/content/cases';
import { makeCase } from '../src/content/caseState';
import { applyAlg, allSolved, FIRST_TWO_LAYERS, CROSS_EDGES, isSolved, F2L_SLOTS } from '../src/cube/cube';
import { ollOrientedCount, chunkAlg, analyzeSolution } from '../src/cube/analysis';
import { goalReached } from '../src/training/goals';
import { parseAlg } from '../src/cube/cube';

describe('curriculum content', () => {
  it('every case references a real family and related cases exist', () => {
    for (const c of CASES) {
      expect(FAMILY_BY_ID[c.family], c.id).toBeTruthy();
      expect(FAMILY_BY_ID[c.family].stage).toBe(c.stage);
      for (const r of c.related ?? []) expect(CASE_BY_ID[r.id], `${c.id} → ${r.id}`).toBeTruthy();
    }
    for (const f of FAMILIES) expect(CASES.some((c) => c.family === f.id), f.id).toBe(true);
  });

  for (const c of CASES.filter((x) => x.alg)) {
    it(`${c.id}: case is valid for its stage at every angle`, () => {
      for (let auf = 0; auf < 4; auf++) {
        const inst = makeCase(c, auf);
        const s = inst.start;
        expect(isSolved(s)).toBe(false);
        expect(allSolved(s, CROSS_EDGES)).toBe(true);
        if (c.stage === 'f2l') {
          const others = FIRST_TWO_LAYERS.filter((id) => id !== F2L_SLOTS.FR.corner && id !== F2L_SLOTS.FR.edge);
          expect(allSolved(s, others)).toBe(true);
        } else {
          expect(allSolved(s, FIRST_TWO_LAYERS)).toBe(true);
        }
        if (c.stage === 'pll') expect(ollOrientedCount(s)).toBe(8);
        const end = applyAlg(s, inst.solution);
        expect(goalReached(c.stage, end)).toBe(true);
        if (c.stage !== 'f2l') expect(isSolved(end)).toBe(true);
      }
    });
  }

  it('cross cases are solvable by their reference', () => {
    const inst = makeCase(CASE_BY_ID['cross-1']);
    expect(goalReached('cross', applyAlg(inst.start, inst.solution))).toBe(true);
  });

  it('chunker finds triggers', () => {
    const ch = chunkAlg(parseAlg("R U R' U' R' F R F'"));
    expect(ch.map((c) => c.trigger?.name)).toEqual(['Sexy', 'Sledgehammer']);
  });

  it('analysis notices waste and rotations', () => {
    const r = analyzeSolution(parseAlg("y R R' U R U' R' y'"), parseAlg("U R U' R'"), 'f2l');
    expect(r.rotations).toBe(2);
    expect(r.cancellations).toBe(2);
  });
});
