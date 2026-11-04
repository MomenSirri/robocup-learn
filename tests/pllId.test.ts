import { describe, it, expect } from 'vitest';
import { identify, distinctCases, preMove, VIEW_CELLS, SideColour } from '../src/training/pllId';
import { CASES } from '../src/content/cases';
import { applyAlg, solvedState, parseAlg, invertAlg, CUBIES, apply, faceOfNormal, CubeState } from '../src/cube/cube';
import { goalReached } from '../src/training/goals';

/** What a person actually sees: stickers in the fixed viewing frame (no centre correction). */
function seen(s: CubeState): SideColour[] {
  const map = new Map<string, string>();
  for (const c of CUBIES) {
    const M = s[c.index];
    const p = apply(M, c.home);
    for (const st of c.stickers) map.set(p.join(',') + faceOfNormal(apply(M, st.normal)), st.face);
  }
  return VIEW_CELLS.map((v) => map.get(v.pos.join(',') + v.face) as SideColour);
}

describe('PLL identifier', () => {
  const plls = CASES.filter((c) => c.stage === 'pll');
  for (const def of plls) {
    it(`${def.id}: identified from 2 sides, from any angle, with a working solution`, () => {
      for (let b = 0; b < 4; b++)
        for (let a = 0; a < 4; a++)
          for (let y = 0; y < 4; y++) {
            const setup = [...parseAlg('U '.repeat(b)), ...invertAlg(parseAlg(def.alg)), ...parseAlg('U '.repeat(a)), ...parseAlg('y '.repeat(y))];
            const s = applyAlg(solvedState(), setup);
            const found = identify(seen(s));
            const cases = distinctCases(found);
            expect(cases.map((c) => c?.id), `${def.id} b${b} a${a} y${y}`).toEqual([def.id]);
            for (const e of found) {
              const after = applyAlg(s, parseAlg(preMove(e.pre) + ' ' + def.alg));
              expect(goalReached('pll', after), `${def.id} pre ${e.pre}`).toBe(true);
            }
          }
    });
  }
  it('a solved top layer is recognised as "only AUF"', () => {
    const found = identify(seen(applyAlg(solvedState(), parseAlg('U y'))));
    expect(distinctCases(found)).toEqual([null]);
  });
  it('wildcards narrow down gradually', () => {
    expect(distinctCases(identify([null, null, null, null, null, null])).length).toBe(22);
  });
});
