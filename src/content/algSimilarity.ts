/**
 * Groups cases whose algorithms are almost the same: they share a long run
 * of moves directly, or one is the other played backwards (inverse) or in a
 * mirror. Computed from the algorithms themselves, so it stays right if an
 * algorithm changes.
 */
import { Move, parseAlg, invertAlg, moveToString } from '../cube/cube';
import { mirrorLR } from './classify';
import { CaseDef } from './cases';

export type Link = 'same' | 'inverse' | 'mirror' | 'mirror-inverse';

export interface Shared {
  a: string; // case id
  b: string;
  link: Link;
  /** the shared run of moves, as written in a's algorithm */
  seq: string[];
  /** where the run starts in a's and b's algorithms (b's as written in the linked form) */
  atA: number;
  atB: number;
  ratio: number;
}

const str = (m: Move[]) => m.map(moveToString);

function longestRun(a: string[], b: string[]) {
  let len = 0, atA = 0, atB = 0;
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) {
      let k = 0;
      while (i + k < a.length && j + k < b.length && a[i + k] === b[j + k]) k++;
      if (k > len) { len = k; atA = i; atB = j; }
    }
  return { len, atA, atB };
}

export function compare(x: CaseDef, y: CaseDef): Shared {
  const a = str(parseAlg(x.alg));
  const ym = parseAlg(y.alg);
  const forms: [Link, string[]][] = [
    ['same', str(ym)],
    ['inverse', str(invertAlg(ym))],
    ['mirror', str(mirrorLR(ym))],
    ['mirror-inverse', str(invertAlg(mirrorLR(ym)))],
  ];
  let best: Shared = { a: x.id, b: y.id, link: 'same', seq: [], atA: 0, atB: 0, ratio: 0 };
  for (const [link, b] of forms) {
    const r = longestRun(a, b);
    if (r.len > best.seq.length) best = { a: x.id, b: y.id, link, seq: a.slice(r.atA, r.atA + r.len), atA: r.atA, atB: r.atB, ratio: r.len / Math.min(a.length, b.length) };
  }
  return best;
}

export interface AlgGroup {
  members: CaseDef[];
  /** the one to learn first: the shortest algorithm in the group */
  base: CaseDef;
  /** for every other member, how it relates to the closest member learned before it */
  links: Shared[];
  sliceOnly?: boolean;
}

/** Shared runs at least this long (as a share of the shorter algorithm) group two cases. */
const THRESHOLD = 0.55;

export function groupBySimilarity(cases: CaseDef[]): { groups: AlgGroup[]; loners: CaseDef[] } {
  const parent = new Map(cases.map((c) => [c.id, c.id]));
  const find = (id: string): string => (parent.get(id) === id ? id : find(parent.get(id)!));
  const sliceOnly = (c: CaseDef) => parseAlg(c.alg).every((m) => m.base === 'M' || m.base === 'U');
  for (let i = 0; i < cases.length; i++)
    for (let j = i + 1; j < cases.length; j++) {
      const both = sliceOnly(cases[i]) && sliceOnly(cases[j]);
      if (both || compare(cases[i], cases[j]).ratio >= THRESHOLD) parent.set(find(cases[i].id), find(cases[j].id));
    }
  const byRoot = new Map<string, CaseDef[]>();
  for (const c of cases) byRoot.set(find(c.id), [...(byRoot.get(find(c.id)) ?? []), c]);
  const groups: AlgGroup[] = [];
  const loners: CaseDef[] = [];
  for (const members of byRoot.values()) {
    if (members.length === 1) { loners.push(members[0]); continue; }
    const len = (c: CaseDef) => parseAlg(c.alg).length;
    const ordered = members.slice().sort((p, q) => len(p) - len(q));
    const base = ordered[0];
    // learning order: each next case is the one sharing the most with something already learned
    const learned = [base];
    const rest = ordered.slice(1);
    const links: Shared[] = [];
    while (rest.length) {
      let bestI = 0;
      let best: Shared | null = null;
      rest.forEach((c, i) => {
        for (const l of learned) {
          const s = compare(c, l);
          if (!best || s.seq.length > best.seq.length) { best = s; bestI = i; }
        }
      });
      links.push(best!);
      learned.push(rest[bestI]);
      rest.splice(bestI, 1);
    }
    groups.push({ members: learned, base, links, sliceOnly: members.every(sliceOnly) });
  }
  groups.sort((p, q) => q.members.length - p.members.length);
  return { groups, loners };
}

export const LINK_TEXT: Record<Link, string> = {
  same: 'shares',
  inverse: 'is the reverse of',
  mirror: 'is the mirror of',
  'mirror-inverse': 'is the reverse mirror of',
};
