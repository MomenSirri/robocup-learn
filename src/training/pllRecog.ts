/**
 * Smart 2-side PLL recognition.
 *
 * Looking only at the front and right sides of the top layer (6 stickers),
 * each side is first read as one simple pattern (headlights, block, solved
 * side…). The pair of patterns narrows the case to 1–3 candidates; when
 * more than one remains, at most two sticker comparisons decide it. The
 * comparisons are found automatically from the real case states, so the
 * method is complete and always right (see tests/pllRecog.test.ts).
 */
import { entries, SideColour } from './pllId';

export type SidePattern = 'solved' | 'head-opp' | 'head-adj' | 'block-L' | 'block-R' | 'ends-opp' | 'ends-adj';
export type Relation = 'same' | 'opp' | 'adj';

export const OPPOSITE: Record<SideColour, SideColour> = { F: 'B', B: 'F', R: 'L', L: 'R' };

export const PATTERN_TEXT: Record<SidePattern, { short: string; long: string }> = {
  solved: { short: 'Solved side', long: 'all 3 stickers match' },
  'head-opp': { short: 'Headlights · opposite middle', long: 'corners match; the middle is the opposite colour' },
  'head-adj': { short: 'Headlights · neighbour middle', long: 'corners match; the middle is a neighbouring colour' },
  'block-L': { short: 'Block on the left', long: 'the left corner and the middle match' },
  'block-R': { short: 'Block on the right', long: 'the middle and the right corner match' },
  'ends-opp': { short: 'No match · opposite ends', long: 'nothing matches; the two corners are opposite colours' },
  'ends-adj': { short: 'No match · neighbour ends', long: 'nothing matches; the two corners are neighbouring colours' },
};

export const RELATION_TEXT: Record<Relation, string> = { same: 'match', opp: 'opposite colours', adj: 'neighbouring colours' };

/** Sticker labels as drawn: front 1–3 (left to right), right 4–6 (left to right). */
export const STICKER_LABEL = ['1', '2', '3', '4', '5', '6'];

export function sidePattern(x: SideColour, y: SideColour, z: SideColour): SidePattern {
  if (x === y && y === z) return 'solved';
  if (x === z) return OPPOSITE[x] === y ? 'head-opp' : 'head-adj';
  if (x === y) return 'block-L';
  if (y === z) return 'block-R';
  return OPPOSITE[x] === z ? 'ends-opp' : 'ends-adj';
}

export function relation(a: SideColour, b: SideColour): Relation {
  return a === b ? 'same' : OPPOSITE[a] === b ? 'opp' : 'adj';
}

export interface Check {
  i: number;
  j: number;
}

interface Group {
  key: string;
  front: SidePattern;
  right: SidePattern;
  cases: string[]; // case names (without " perm"); 'Solved' for an AUF-only state
  checks: Check[];
  /** outcome of the checks ('same/opp') → case name */
  outcome: Map<string, string>;
}

// easiest comparisons first: within a side, then the stickers nearest each other
const PAIRS: Check[] = [];
for (const [i, j] of [[0, 1], [1, 2], [0, 2], [3, 4], [4, 5], [3, 5], [1, 3], [2, 4], [1, 4], [0, 4], [1, 5], [0, 3], [2, 5], [0, 5]] as [number, number][]) PAIRS.push({ i, j });

const caseName = (id: string | undefined, name: string | undefined) => (id ? name!.replace(' perm', '') : 'Solved');

let groups: Map<string, Group> | null = null;

function build() {
  const raw = new Map<string, { p: SideColour[]; c: string }[]>();
  for (const e of entries()) {
    const p = e.pattern;
    const key = sidePattern(p[0], p[1], p[2]) + '|' + sidePattern(p[3], p[4], p[5]);
    const list = raw.get(key) ?? [];
    list.push({ p, c: caseName(e.def?.id, e.def?.name) });
    raw.set(key, list);
  }
  const out = new Map<string, Group>();
  for (const [key, list] of raw) {
    const [front, right] = key.split('|') as [SidePattern, SidePattern];
    const cases = Array.from(new Set(list.map((x) => x.c)));
    const tryChecks = (checks: Check[]) => {
      const m = new Map<string, string>();
      for (const x of list) {
        const r = checks.map((c) => relation(x.p[c.i], x.p[c.j])).join('/');
        if (m.has(r) && m.get(r) !== x.c) return null;
        m.set(r, x.c);
      }
      return m;
    };
    let checks: Check[] = [];
    let outcome = new Map<string, string>([['', cases[0]]]);
    if (cases.length > 1) {
      let found = false;
      for (const a of PAIRS) {
        const m = tryChecks([a]);
        if (m) { checks = [a]; outcome = m; found = true; break; }
      }
      for (let x = 0; !found && x < PAIRS.length; x++)
        for (let y = x + 1; !found && y < PAIRS.length; y++) {
          const m = tryChecks([PAIRS[x], PAIRS[y]]);
          if (m) { checks = [PAIRS[x], PAIRS[y]]; outcome = m; found = true; }
        }
      if (!found) throw new Error('no 2-side rule for ' + key);
    }
    out.set(key, { key, front, right, cases, checks, outcome });
  }
  return out;
}

export function allGroups(): Group[] {
  groups ??= build();
  return [...groups.values()];
}

export interface Explanation {
  front: SidePattern;
  right: SidePattern;
  candidates: string[];
  steps: { check: Check; result: Relation }[];
  answer: string | null;
}

/** Why a 2-side view is the case it is, in the order a solver would look. */
export function explain(p: SideColour[]): Explanation {
  groups ??= build();
  const front = sidePattern(p[0], p[1], p[2]);
  const right = sidePattern(p[3], p[4], p[5]);
  const g = groups.get(front + '|' + right);
  if (!g) return { front, right, candidates: [], steps: [], answer: null };
  const steps = g.checks.map((check) => ({ check, result: relation(p[check.i], p[check.j]) }));
  const answer = g.outcome.get(steps.map((s) => s.result).join('/')) ?? null;
  return { front, right, candidates: g.cases, steps, answer };
}

/** Number of distinct 2-side looks and how many need extra checks (for the map screen). */
export function mapStats() {
  const gs = allGroups();
  return { looks: gs.length, direct: gs.filter((g) => g.cases.length === 1).length };
}
