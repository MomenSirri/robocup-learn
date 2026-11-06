import { describe, it, expect } from 'vitest';
import { CASES } from '../src/content/cases';
import { groupBySimilarity, compare } from '../src/content/algSimilarity';
import { parseAlg, moveToString, invertAlg } from '../src/cube/cube';

const pll = CASES.filter((c) => c.stage === 'pll');
const names = (ids: { name: string }[]) => ids.map((c) => c.name.replace(' perm', '')).sort();

describe('PLL grouped by similar algorithms', () => {
  const { groups, loners } = groupBySimilarity(pll);
  it('finds the expected families', () => {
    const sets = groups.map((g) => names(g.members).join(','));
    expect(sets).toContain(['F', 'Jb', 'Na', 'T', 'Y'].join(','));
    for (const pair of [['Ua', 'Ub'], ['Aa', 'Ab'], ['Ga', 'Gb'], ['Gc', 'Gd'], ['H', 'Z']]) expect(sets).toContain(pair.join(','));
    expect(groups.reduce((n, g) => n + g.members.length, 0) + loners.length).toBe(21);
  });
  it('highlighted runs really are in both algorithms', () => {
    for (const g of groups)
      for (const l of g.links) {
        const a = parseAlg(pll.find((c) => c.id === l.a)!.alg).map(moveToString);
        expect(a.slice(l.atA, l.atA + l.seq.length)).toEqual(l.seq);
        const bm = parseAlg(pll.find((c) => c.id === l.b)!.alg);
        if (l.link === 'same') expect(bm.map(moveToString).join(' ')).toContain(l.seq.join(' '));
        if (l.link === 'inverse') expect(invertAlg(bm).map(moveToString).join(' ')).toContain(l.seq.join(' '));
      }
  });
  it('Ub is exactly Ua backwards', () => {
    const r = compare(pll.find((c) => c.id === 'pll-ub')!, pll.find((c) => c.id === 'pll-ua')!);
    expect(r.link).toBe('inverse');
    expect(r.ratio).toBe(1);
  });
});
