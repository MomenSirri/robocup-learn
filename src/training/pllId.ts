/**
 * Identify a PLL from what you see on a real cube: the 6 top-layer side
 * stickers of two adjacent sides (front and right), the standard
 * "2-side" recognition. Unknown stickers act as wildcards, so candidates
 * narrow down as stickers are entered.
 */
import { Face, Move, Vec, applyAlg, solvedState, parseAlg, invertAlg, facelets, faceletAt, CubeState } from '../cube/cube';
import { CASES, CaseDef } from '../content/cases';

export type SideColour = 'F' | 'R' | 'B' | 'L';
/** Colours in order around the cube, so a cyclic shift = holding the cube from another side. */
const RING: SideColour[] = ['F', 'R', 'B', 'L'];

/** The 6 stickers: front-left, front-middle, front-right, right-left, right-middle, right-right. */
export const VIEW_CELLS: { pos: Vec; face: Face }[] = [
  { pos: [-1, 1, 1], face: 'F' },
  { pos: [0, 1, 1], face: 'F' },
  { pos: [1, 1, 1], face: 'F' },
  { pos: [1, 1, 1], face: 'R' },
  { pos: [1, 1, 0], face: 'R' },
  { pos: [1, 1, -1], face: 'R' },
];

export interface Entry {
  def: CaseDef | null; // null = already solved (only an AUF)
  /** U turns to do before the algorithm, as seen from the solver */
  pre: number;
  pattern: SideColour[];
  state: CubeState;
}

const U: Move = { base: 'U', amount: 1 };
const rep = (n: number) => Array(n).fill(U) as Move[];

let table: Entry[] | null = null;

function build(): Entry[] {
  const out: Entry[] = [];
  const seen = new Set<string>();
  const add = (def: CaseDef | null, setup: Move[], pre: number) => {
    const s = applyAlg(solvedState(), setup);
    const f = facelets(s);
    const pattern = VIEW_CELLS.map((c) => faceletAt(f, c.pos, c.face) as SideColour);
    const k = (def?.id ?? 'solved') + pattern.join('') + pre;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ def, pre, pattern, state: s });
  };
  for (let a = 0; a < 4; a++) add(null, rep(a), a);
  for (const def of CASES.filter((c) => c.stage === 'pll')) {
    const inv = invertAlg(parseAlg(def.alg));
    for (let b = 0; b < 4; b++) for (let a = 0; a < 4; a++) add(def, [...rep(b), ...inv, ...rep(a)], a);
  }
  return out;
}

export function entries() {
  return (table ??= build());
}

/** All cases consistent with the stickers entered so far (null = not entered). */
export function identify(input: (SideColour | null)[]): Entry[] {
  const res: Entry[] = [];
  const seen = new Set<string>();
  for (const e of entries()) {
    const ok = [0, 1, 2, 3].some((k) =>
      input.every((c, i) => c === null || RING[(RING.indexOf(c) + k) % 4] === e.pattern[i]),
    );
    if (!ok) continue;
    const key = (e.def?.id ?? 'solved') + ':' + e.pre;
    if (seen.has(key)) continue;
    seen.add(key);
    res.push(e);
  }
  return res;
}

/** Distinct case ids among candidates. */
export function distinctCases(list: Entry[]): (CaseDef | null)[] {
  const m = new Map<string, CaseDef | null>();
  for (const e of list) m.set(e.def?.id ?? 'solved', e.def);
  return [...m.values()];
}

export function preMove(pre: number): string {
  // undo the extra U turns: pre = number of U turns added after the case
  return ['', "U'", 'U2', 'U'][pre % 4];
}
