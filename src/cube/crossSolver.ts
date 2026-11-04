/**
 * Optimal cross solver. The four cross edges are tracked as (position, white
 * sticker direction) pairs — 24 states each — and a full BFS distance table
 * over 24^4 tuples gives optimal solutions instantly (~330k bytes).
 */
import { CubeState, Move, MoveBase, Vec, MOVE_DEFS, CROSS_EDGES, relPos, stickerDir, frame, quarter, apply, quarterTurns } from './cube';

const FACE_MOVES: MoveBase[] = ['U', 'D', 'F', 'B', 'R', 'L'];
const MOVES: Move[] = FACE_MOVES.flatMap((b) => [1, -1, 2].map((a) => ({ base: b, amount: a as Move['amount'] })));

// enumerate the 24 edge "slots": (position, sticker normal)
const SLOTS: { p: Vec; n: Vec }[] = [];
for (let x = -1; x <= 1; x++)
  for (let y = -1; y <= 1; y++)
    for (let z = -1; z <= 1; z++) {
      if (Math.abs(x) + Math.abs(y) + Math.abs(z) !== 2) continue;
      const p: Vec = [x, y, z];
      for (let a = 0; a < 3; a++) {
        if (p[a] === 0) continue;
        const n: Vec = [0, 0, 0];
        n[a] = p[a];
        SLOTS.push({ p, n });
      }
    }
const key = (p: Vec, n: Vec) => p.join(',') + '|' + n.join(',');
const SLOT_INDEX = new Map(SLOTS.map((s, i) => [key(s.p, s.n), i]));

const TRANS: Int8Array = (() => {
  const t = new Int8Array(24 * MOVES.length);
  MOVES.forEach((m, mi) => {
    const def = MOVE_DEFS[m.base];
    const R = quarter(def.axis, quarterTurns(m));
    SLOTS.forEach((s, si) => {
      const moved = def.layers.includes(s.p[def.axis]);
      t[si * MOVES.length + mi] = moved ? SLOT_INDEX.get(key(apply(R, s.p), apply(R, s.n)))! : si;
    });
  });
  return t;
})();

const N = 24 ** 4;
let table: Int8Array | null = null;

function encode(a: number[]) {
  return ((a[0] * 24 + a[1]) * 24 + a[2]) * 24 + a[3];
}
function decode(c: number) {
  const a = [0, 0, 0, 0];
  for (let i = 3; i >= 0; i--) { a[i] = c % 24; c = Math.floor(c / 24); }
  return a;
}

const SOLVED = CROSS_EDGES.map((id) => {
  const p: Vec = [id.includes('R') ? 1 : id.includes('L') ? -1 : 0, -1, id.includes('F') ? 1 : id.includes('B') ? -1 : 0];
  return SLOT_INDEX.get(key(p, [0, -1, 0]))!;
});

function buildTable() {
  if (table) return table;
  table = new Int8Array(N).fill(-1);
  let frontier = [encode(SOLVED)];
  table[frontier[0]] = 0;
  let d = 0;
  while (frontier.length) {
    const next: number[] = [];
    for (const c of frontier) {
      const a = decode(c);
      for (let mi = 0; mi < MOVES.length; mi++) {
        const b = a.map((s) => TRANS[s * MOVES.length + mi]);
        const e = encode(b);
        if (table[e] === -1) { table[e] = d + 1; next.push(e); }
      }
    }
    frontier = next;
    d++;
  }
  return table;
}

export function crossCode(s: CubeState): number {
  const fr = frame(s);
  return encode(CROSS_EDGES.map((id) => SLOT_INDEX.get(key(relPos(s, id, fr), stickerDir(s, id, 'D', fr)))!));
}

/** Optimal cross solution (in frame-relative face moves). */
export function solveCross(s: CubeState): Move[] {
  const t = buildTable();
  let c = crossCode(s);
  const out: Move[] = [];
  while (t[c] > 0) {
    const a = decode(c);
    let found = false;
    for (let mi = 0; mi < MOVES.length; mi++) {
      const e = encode(a.map((x) => TRANS[x * MOVES.length + mi]));
      if (t[e] === t[c] - 1) { out.push(MOVES[mi]); c = e; found = true; break; }
    }
    if (!found) break;
  }
  return out;
}

export function crossDistance(s: CubeState): number {
  return buildTable()[crossCode(s)];
}
