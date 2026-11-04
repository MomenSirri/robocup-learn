/**
 * Case identity. Two states are the same "case" when they differ only by
 * U turns (AUF), so every stage has a canonical key that ignores them.
 * Also mirrors algorithms, so related cases can be linked automatically.
 */
import { CubeState, Move, MoveBase, applyAlg, solvedState, parseAlg, invertAlg, frame, relPos, stickerDir, LAST_LAYER } from '../cube/cube';
import { Stage } from '../cube/analysis';

const U = parseAlg('U');

function minOver(s: CubeState, key: (s: CubeState) => string) {
  let best = '';
  let t = s;
  for (let k = 0; k < 4; k++) {
    const kk = key(t);
    if (!best || kk < best) best = kk;
    t = applyAlg(t, U);
  }
  return best;
}

const f2lKey = (s: CubeState) => {
  const fr = frame(s);
  return [relPos(s, 'DFR', fr), stickerDir(s, 'DFR', 'D', fr), stickerDir(s, 'DFR', 'F', fr), relPos(s, 'FR', fr), stickerDir(s, 'FR', 'F', fr)].map((v) => v.join(',')).join('|');
};
const ollKey = (s: CubeState) => {
  const fr = frame(s);
  return LAST_LAYER.map((id) => relPos(s, id, fr).join(',') + ':' + stickerDir(s, id, 'U', fr).join(',')).sort().join(';');
};
const pllKey = (s: CubeState) => {
  const fr = frame(s);
  return LAST_LAYER.map((id) => id + '@' + relPos(s, id, fr).join(',')).sort().join(';');
};

/** Canonical key of the case an algorithm solves. */
export function caseKeyOfAlg(stage: Stage, alg: Move[]): string {
  const inv = invertAlg(alg);
  if (stage === 'pll') {
    // forgive both the AUF before (pre) and after (post) the algorithm
    let best = '';
    for (let j = 0; j < 4; j++) {
      const s = applyAlg(solvedState(), [...Array(j).fill(U[0]), ...inv]);
      const k = minOver(s, pllKey);
      if (!best || k < best) best = k;
    }
    return best;
  }
  const s = applyAlg(solvedState(), inv);
  return minOver(s, stage === 'f2l' ? f2lKey : ollKey);
}

type Map_ = Partial<Record<MoveBase, MoveBase>>;
const INVERTED = new Set<MoveBase>(['U', 'D', 'E', 'F', 'B', 'S', 'u', 'd', 'f', 'b', 'y', 'z', 'R', 'L', 'r', 'l']);
const LR: Map_ = { R: 'L', L: 'R', r: 'l', l: 'r' };

/** Left–right mirror (through the M plane): R ↔ L′ etc. Keeps F2L for last-layer algs. */
export function mirrorLR(alg: Move[]): Move[] {
  return alg.map((m) => {
    const base = (LR[m.base] ?? m.base) as MoveBase;
    const inv = INVERTED.has(m.base) && m.base !== 'x';
    return { base, amount: m.amount === 2 ? 2 : inv ? (-m.amount as 1 | -1) : m.amount };
  });
}

const FR: Map_ = { R: 'F', F: 'R', L: 'B', B: 'L', r: 'f', f: 'r', l: 'b', b: 'l', M: 'S', S: 'M', x: 'z', z: 'x' };
/** Mirror through the plane between the F and R faces: keeps the front-right slot. */
export function mirrorFR(alg: Move[]): Move[] {
  return alg.map((m) => {
    const base = (FR[m.base] ?? m.base) as MoveBase;
    // every turn reverses its sense under a reflection, except M↔S (their senses are defined oppositely)
    const keep = m.base === 'M' || m.base === 'S';
    return { base, amount: m.amount === 2 ? 2 : keep ? m.amount : (-m.amount as 1 | -1) };
  });
}
