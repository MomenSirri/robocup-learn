import { describe, it, expect } from 'vitest';
import { solvedState, applyAlg, parseAlg, isSolved, invertAlg, relPos, CUBIE_BY_ID, cubiePos, stickerDir } from '../src/cube/cube';
import { simplify, algToStr } from './util';
import { solveCross, crossDistance } from '../src/cube/crossSolver';

describe('cube model', () => {
  it('R4, sexy6 and T-perm2 are identity', () => {
    for (const a of ['R R R R', "(R U R' U')6".replace('6', '').repeat(1), "R U R' U' R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'", "R U R' U' R' F R2 U' R' U' R U R' F' R U R' U' R' F R2 U' R' U' R U R' F'", "M2 U M2 U2 M2 U M2 M2 U M2 U2 M2 U M2"]) {
      if (a.includes('(')) continue;
      expect(isSolved(applyAlg(solvedState(), parseAlg(a)))).toBe(true);
    }
  });
  it('R moves UFR to UBR with green facing up', () => {
    const s = applyAlg(solvedState(), parseAlg('R'));
    expect(cubiePos(s, CUBIE_BY_ID.UFR)).toEqual([1, 1, -1]);
    expect(stickerDir(s, 'UFR', 'F')).toEqual([0, 1, 0]);
  });
  it('U moves UF to UL', () => {
    const s = applyAlg(solvedState(), parseAlg('U'));
    expect(cubiePos(s, CUBIE_BY_ID.UF)).toEqual([-1, 1, 0]);
  });
  it('F moves UF to RF', () => {
    const s = applyAlg(solvedState(), parseAlg('F'));
    expect(cubiePos(s, CUBIE_BY_ID.UF)).toEqual([1, 0, 1]);
  });
  it('rotations keep cube solved (frame invariant)', () => {
    expect(isSolved(applyAlg(solvedState(), parseAlg('x y z2 M E S'))) ).toBe(false);
    expect(isSolved(applyAlg(solvedState(), parseAlg('x y z2'))) ).toBe(true);
    expect(isSolved(applyAlg(solvedState(), parseAlg("r R' M"))) ).toBe(true);
    expect(isSolved(applyAlg(solvedState(), parseAlg("M' x' R L'"))) ).toBe(true);
  });
  it('relative positions ignore rotations', () => {
    const s = applyAlg(solvedState(), parseAlg("y' R y"));
    const t = applyAlg(solvedState(), parseAlg('F'));
    expect(relPos(s, 'UFR')).toEqual(relPos(t, 'UFR'));
  });
  it('inverse undoes', () => {
    const a = parseAlg("R U2 F' D L2 B r M' x");
    expect(isSolved(applyAlg(applyAlg(solvedState(), a), invertAlg(a)))).toBe(true);
  });
  it('simplify cancels', () => {
    expect(algToStr(simplify(parseAlg("R R U U' R"))) ).toBe("R'");
    expect(algToStr(simplify(parseAlg("R L R"))) ).toBe('R2 L');
  });
  it('cross solver is optimal and correct', () => {
    const scr = parseAlg("R U F' D2 L B' U2 R' F D'");
    const s = applyAlg(solvedState(), scr);
    const sol = solveCross(s);
    expect(sol.length).toBe(crossDistance(s));
    expect(sol.length).toBeLessThanOrEqual(8);
    const after = applyAlg(s, sol);
    expect(crossDistance(after)).toBe(0);
  });
});
