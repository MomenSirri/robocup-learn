import { describe, it, expect } from 'vitest';
import { entries } from '../src/training/pllId';
import { explain, allGroups } from '../src/training/pllRecog';

describe('2-side PLL recognition', () => {
  it('names the right case for every case, angle and colour scheme rotation', () => {
    const ring = ['F', 'R', 'B', 'L'] as const;
    for (const e of entries())
      for (let k = 0; k < 4; k++) {
        const p = e.pattern.map((c) => ring[(ring.indexOf(c) + k) % 4]);
        const want = e.def ? e.def.name.replace(' perm', '') : 'Solved';
        expect(explain(p).answer, `${want} ${e.pattern.join('')} k${k}`).toBe(want);
      }
  });
  it('never needs more than two sticker comparisons', () => {
    for (const g of allGroups()) expect(g.checks.length).toBeLessThanOrEqual(2);
  });
});
