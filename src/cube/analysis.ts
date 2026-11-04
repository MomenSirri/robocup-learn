/**
 * Understanding layer: turns raw cube states into concepts a learner can use —
 * where the F2L pieces are, whether they are paired, which triggers an
 * algorithm is built from, and what each move just did.
 */
import {
  CubeState, Move, Vec, Face, MOVE_DEFS,
  CROSS_EDGES, F2L_SLOTS, LAST_LAYER, FIRST_TWO_LAYERS,
  frame, relPos, relative, stickerDir, isCubieSolved, matEq, allSolved,
  parseAlg, moveToString, isRotation, applyMove,
} from './cube';

// ---------------------------------------------------------------- F2L features

export type Loc = 'top' | 'slot' | 'otherSlot' | 'bottom';

export interface F2LFeatures {
  cornerLoc: Loc;
  edgeLoc: Loc;
  /** where the white (D) sticker of the corner points */
  whiteFacing: 'up' | 'down' | 'side';
  /** corner and edge have the same relative orientation → they form a pair */
  connected: boolean;
  /** corner and edge touch, but colours don't line up */
  adjacentWrong: boolean;
  cornerSolved: boolean;
  edgeSolved: boolean;
  slotSolved: boolean;
}

function slotPos(slot: string): Vec {
  const x = slot.includes('R') ? 1 : -1;
  const z = slot.includes('F') ? 1 : -1;
  return [x, 0, z];
}

export function f2lFeatures(s: CubeState, slot = 'FR'): F2LFeatures {
  const fr = frame(s);
  const { corner, edge } = F2L_SLOTS[slot];
  const cp = relPos(s, corner, fr);
  const ep = relPos(s, edge, fr);
  const sp = slotPos(slot);
  const cornerLoc: Loc = cp[1] === 1 ? 'top' : cp[0] === sp[0] && cp[2] === sp[2] ? 'slot' : 'otherSlot';
  const edgeLoc: Loc = ep[1] === 1 ? 'top' : ep[1] === -1 ? 'bottom' : ep[0] === sp[0] && ep[2] === sp[2] ? 'slot' : 'otherSlot';
  const w = stickerDir(s, corner, 'D', fr);
  const whiteFacing = w[1] === 1 ? 'up' : w[1] === -1 ? 'down' : 'side';
  const connected = matEq(relative(s, corner, fr), relative(s, edge, fr));
  const dist = Math.abs(cp[0] - ep[0]) + Math.abs(cp[1] - ep[1]) + Math.abs(cp[2] - ep[2]);
  const cornerSolved = isCubieSolved(s, corner, fr);
  const edgeSolved = isCubieSolved(s, edge, fr);
  return {
    cornerLoc,
    edgeLoc,
    whiteFacing,
    connected,
    adjacentWrong: dist === 1 && !connected && cp[1] === 1 && ep[1] === 1,
    cornerSolved,
    edgeSolved,
    slotSolved: cornerSolved && edgeSolved,
  };
}

export function describeF2L(f: F2LFeatures): string[] {
  const out: string[] = [];
  if (f.slotSolved) return ['Pair solved in its slot'];
  if (f.connected) out.push('Corner and edge are already paired');
  else if (f.adjacentWrong) out.push('Pieces touch but are mis-paired');
  const c = f.cornerLoc === 'slot' ? (f.cornerSolved ? 'Corner solved in slot' : 'Corner twisted in slot') : f.cornerLoc === 'top' ? 'Corner on top' : 'Corner in another slot';
  out.push(c + (f.cornerLoc !== 'slot' || !f.cornerSolved ? ` · white ${f.whiteFacing === 'side' ? 'on the side' : f.whiteFacing === 'up' ? 'facing up' : 'facing down'}` : ''));
  out.push(f.edgeLoc === 'slot' ? (f.edgeSolved ? 'Edge solved in slot' : 'Edge flipped in slot') : f.edgeLoc === 'top' ? 'Edge on top' : 'Edge elsewhere');
  return out;
}

// ---------------------------------------------------------------- last layer features

export function ollOrientedCount(s: CubeState): number {
  const fr = frame(s);
  let n = 0;
  for (const id of LAST_LAYER) {
    const d = stickerDir(s, id, 'U', fr);
    if (d[1] === 1) n++;
  }
  return n;
}

export function llSolvedCount(s: CubeState): number {
  const fr = frame(s);
  return LAST_LAYER.filter((id) => isCubieSolved(s, id, fr)).length;
}

// ---------------------------------------------------------------- narration

export interface Beat {
  text: string;
  tone: 'good' | 'info' | 'warn';
}

export type Stage = 'cross' | 'f2l' | 'oll' | 'pll';

function crossOk(s: CubeState) {
  return allSolved(s, CROSS_EDGES);
}
function otherF2LOk(s: CubeState, slot: string) {
  const ids = FIRST_TWO_LAYERS.filter((id) => !CROSS_EDGES.includes(id) && id !== F2L_SLOTS[slot].corner && id !== F2L_SLOTS[slot].edge);
  return allSolved(s, ids);
}

/** What did this move accomplish, in human terms? */
export function narrate(prev: CubeState, next: CubeState, stage: Stage, move: Move, slot = 'FR'): Beat[] {
  const beats: Beat[] = [];
  if (isRotation(move)) {
    beats.push({ text: 'Cube rotation — the whole cube turns, nothing is solved or broken', tone: 'info' });
    return beats;
  }
  if (stage === 'f2l') {
    const a = f2lFeatures(prev, slot);
    const b = f2lFeatures(next, slot);
    if (!a.slotSolved && b.slotSolved) beats.push({ text: 'Pair inserted — slot solved!', tone: 'good' });
    else {
      if (!a.connected && b.connected) beats.push({ text: 'Corner and edge are now joined into a pair', tone: 'good' });
      if (a.connected && !b.connected && !a.slotSolved) beats.push({ text: 'Pair split apart (to rebuild it correctly)', tone: 'warn' });
      if (a.cornerLoc === 'slot' && b.cornerLoc === 'top') beats.push({ text: 'Corner lifted out of the slot', tone: 'info' });
      if (a.edgeLoc === 'slot' && b.edgeLoc === 'top') beats.push({ text: 'Edge lifted out of the slot', tone: 'info' });
      if (a.cornerLoc === 'top' && b.cornerLoc === 'top' && a.edgeLoc === 'top' && b.edgeLoc === 'top' && move.base === 'U')
        beats.push({ text: 'U turn: repositions the top pieces without touching solved ones', tone: 'info' });
      if (a.whiteFacing === 'up' && b.whiteFacing === 'side') beats.push({ text: 'White sticker turned to the side — corner is now pairable', tone: 'good' });
      if (a.edgeLoc === 'top' && b.edgeLoc === 'slot' && !b.edgeSolved && !b.slotSolved) beats.push({ text: 'Edge hidden in the slot for a moment', tone: 'info' });
    }
    const crossA = crossOk(prev), crossB = crossOk(next);
    if (crossA && !crossB) beats.push({ text: 'Cross edge lifted temporarily — it must come back down', tone: 'warn' });
    if (!crossA && crossB) beats.push({ text: 'Cross restored', tone: 'good' });
    const oA = otherF2LOk(prev, slot), oB = otherF2LOk(next, slot);
    if (oA && !oB) beats.push({ text: 'Another solved slot was disturbed', tone: 'warn' });
    if (!oA && oB) beats.push({ text: 'Other slots restored', tone: 'good' });
  } else if (stage === 'oll') {
    const a = ollOrientedCount(prev), b = ollOrientedCount(next);
    const fa = allSolved(prev, FIRST_TWO_LAYERS), fb = allSolved(next, FIRST_TWO_LAYERS);
    if (fa && !fb) beats.push({ text: 'F2L opened up — the algorithm borrows a slot', tone: 'warn' });
    if (!fa && fb) beats.push({ text: 'F2L restored', tone: 'good' });
    if (b === 8 && fb) beats.push({ text: 'Top face fully oriented!', tone: 'good' });
    else if (b !== a) beats.push({ text: `${b}/8 top pieces facing up`, tone: b > a ? 'good' : 'info' });
  } else if (stage === 'pll') {
    const fa = allSolved(prev, FIRST_TWO_LAYERS), fb = allSolved(next, FIRST_TWO_LAYERS);
    const oa = ollOrientedCount(prev) === 8, ob = ollOrientedCount(next) === 8;
    if (fa && !fb) beats.push({ text: 'F2L opened up temporarily', tone: 'warn' });
    if (!fa && fb) beats.push({ text: 'F2L restored', tone: 'good' });
    if (oa && !ob && fb) beats.push({ text: 'Top colour broken temporarily', tone: 'warn' });
    if (fb && ob) {
      const n = llSolvedCount(next);
      beats.push({ text: n === 8 ? 'Last layer permuted — solved!' : `${n}/8 top pieces in place`, tone: n === 8 ? 'good' : 'info' });
    }
  } else {
    const n = CROSS_EDGES.filter((id) => isCubieSolved(next, id)).length;
    const p = CROSS_EDGES.filter((id) => isCubieSolved(prev, id)).length;
    if (n !== p) beats.push({ text: `${n}/4 cross edges solved`, tone: n > p ? 'good' : 'warn' });
  }
  return beats;
}

// ---------------------------------------------------------------- triggers

export interface Trigger {
  name: string;
  moves: string;
  idea: string;
  color: string;
}

export const TRIGGERS: Trigger[] = [
  { name: 'F-sexy-F′', moves: "F R U R' U' F'", idea: 'Sexy move wrapped in F: flips edges on top', color: '#f472b6' },
  { name: 'f-sexy-f′', moves: "f R U R' U' f'", idea: 'Wide version: same flip, different edges', color: '#f472b6' },
  { name: 'Sune', moves: "R U R' U R U2 R'", idea: 'Twists three corners — the backbone of corner OLL', color: '#fbbf24' },
  { name: 'Antisune', moves: "R U2 R' U' R U' R'", idea: 'Inverse Sune', color: '#fbbf24' },
  { name: 'Sexy', moves: "R U R' U'", idea: 'Lift–turn–replace: the most used trigger', color: '#60a5fa' },
  { name: 'Reverse sexy', moves: "U R U' R'", idea: 'Sexy move backwards', color: '#60a5fa' },
  { name: 'Sledgehammer', moves: "R' F R F'", idea: 'Swaps the front-right pair through the F face', color: '#a78bfa' },
  { name: 'Hedgeslammer', moves: "F R' F' R", idea: 'Inverse sledgehammer', color: '#a78bfa' },
  { name: 'Insert', moves: "R U R'", idea: 'Opens slot, brings pair over it, closes', color: '#34d399' },
  { name: 'Insert', moves: "R U' R'", idea: 'Opens slot, moves top, closes', color: '#34d399' },
  { name: 'Insert', moves: "R U2 R'", idea: 'Opens slot, half-turn on top, closes', color: '#34d399' },
  { name: 'Front insert', moves: "F' U' F", idea: 'Same idea, through the front face', color: '#2dd4bf' },
  { name: 'Front insert', moves: "F' U F", idea: 'Same idea, through the front face', color: '#2dd4bf' },
  { name: 'Front insert', moves: "F' U2 F", idea: 'Same idea, through the front face', color: '#2dd4bf' },
];

export interface Chunk {
  start: number;
  end: number; // exclusive
  trigger?: Trigger;
}

/** Split an algorithm into recognisable triggers (greedy, longest first). */
export function chunkAlg(moves: Move[]): Chunk[] {
  const strs = moves.map(moveToString);
  const sorted = TRIGGERS.map((t) => ({ t, seq: parseAlg(t.moves).map(moveToString) })).sort((a, b) => b.seq.length - a.seq.length);
  const chunks: Chunk[] = [];
  let i = 0;
  let loose = -1;
  while (i < strs.length) {
    const hit = sorted.find(({ seq }) => seq.every((m, k) => strs[i + k] === m));
    if (hit) {
      if (loose >= 0) { chunks.push({ start: loose, end: i }); loose = -1; }
      chunks.push({ start: i, end: i + hit.seq.length, trigger: hit.t });
      i += hit.seq.length;
    } else {
      if (loose < 0) loose = i;
      i++;
    }
  }
  if (loose >= 0) chunks.push({ start: loose, end: strs.length });
  return chunks;
}

// ---------------------------------------------------------------- solution analysis

/** Merge consecutive turns of the same layer (R R → R2, R R' → nothing, also across parallel layers). */
export function simplify(moves: Move[]): Move[] {
  const out: Move[] = [];
  for (const m of moves) {
    // find a same-base move at the tail that only parallel (same-axis) moves separate
    let j = out.length - 1;
    const axis = MOVE_DEFS[m.base].axis;
    while (j >= 0 && out[j].base !== m.base && MOVE_DEFS[out[j].base].axis === axis && !isRotation(out[j]) && !isRotation(m)) j--;
    if (j >= 0 && out[j].base === m.base) {
      const q = (((out[j].amount === 2 ? 2 : out[j].amount) + (m.amount === 2 ? 2 : m.amount)) % 4 + 4) % 4;
      if (q === 0) out.splice(j, 1);
      else out[j] = { base: m.base, amount: q === 2 ? 2 : q === 1 ? 1 : -1 };
    } else out.push(m);
  }
  return out.length === moves.length ? out : simplify(out);
}

export function countMoves(moves: Move[]): number {
  return moves.filter((m) => !isRotation(m)).length;
}

export interface SolutionReport {
  userMoves: number;
  simplifiedMoves: number;
  referenceMoves: number;
  cancellations: number;
  rotations: number;
  awkwardMoves: string[];
  undoSpots: number[];
  regrips: number;
  verdict: 'optimal' | 'great' | 'good' | 'long';
  points: Beat[];
}

const ERGONOMIC = new Set(['R', 'U', 'F', 'r', 'M', 'L', 'D', 'u']);

/** Estimate regrips: rotations, plus switching between right-hand and left-hand/F groups. */
function estimateRegrips(moves: Move[]): number {
  let n = 0;
  let prevGroup = '';
  for (const m of moves) {
    if (isRotation(m)) { n++; prevGroup = ''; continue; }
    const g = 'RrUuM'.includes(m.base) ? 'right' : m.base === 'F' || m.base === 'f' ? 'front' : 'LlDdBbES'.includes(m.base) ? 'other' : 'right';
    if (prevGroup && g !== prevGroup && g !== 'right' && prevGroup !== 'right') n++;
    if (g === 'other') n++;
    prevGroup = g;
  }
  return n;
}

export function analyzeSolution(user: Move[], reference: Move[], stage: Stage, start?: CubeState): SolutionReport {
  const simplified = simplify(user);
  const userMoves = countMoves(user);
  const simplifiedMoves = countMoves(simplified);
  const referenceMoves = countMoves(reference);
  const rotations = user.filter(isRotation).length;
  const awkward = Array.from(new Set(user.filter((m) => !isRotation(m) && !ERGONOMIC.has(m.base)).map(moveToString)));
  // undo spots: a move immediately reverted
  const undoSpots: number[] = [];
  for (let i = 1; i < user.length; i++) {
    const a = user[i - 1], b = user[i];
    if (a.base === b.base && a.amount !== 2 && b.amount === -a.amount) undoSpots.push(i - 1);
  }
  const regrips = estimateRegrips(simplified);
  const points: Beat[] = [];
  const extra = simplifiedMoves - referenceMoves;
  let verdict: SolutionReport['verdict'];
  if (simplifiedMoves <= referenceMoves) verdict = 'optimal';
  else if (extra <= 2) verdict = 'great';
  else if (extra <= 6) verdict = 'good';
  else verdict = 'long';

  points.push({ text: 'Solved it — you reached the goal state yourself.', tone: 'good' });
  if (simplifiedMoves < referenceMoves) points.push({ text: `Shorter than the reference (${simplifiedMoves} vs ${referenceMoves} moves). Nice find!`, tone: 'good' });
  else if (simplifiedMoves === referenceMoves) points.push({ text: `Same length as the reference solution (${referenceMoves} moves).`, tone: 'good' });
  else points.push({ text: `${simplifiedMoves} moves vs ${referenceMoves} for the reference: ${extra} extra.`, tone: extra > 4 ? 'warn' : 'info' });
  if (simplifiedMoves < userMoves) points.push({ text: `${userMoves - simplifiedMoves} moves cancel out (e.g. R then R′, or R R → R2). Plan before turning.`, tone: 'warn' });
  if (undoSpots.length) points.push({ text: `You undid a move ${undoSpots.length}× — a sign of trial and error. Try predicting where pieces go first.`, tone: 'info' });
  if (rotations) points.push({ text: `${rotations} cube rotation${rotations > 1 ? 's' : ''}: each costs time. Look for an equivalent using F or L moves.`, tone: 'warn' });
  if (awkward.length) points.push({ text: `Awkward moves for ${stage.toUpperCase()}: ${awkward.join(', ')} usually force a regrip.`, tone: 'warn' });
  if (regrips === 0 && !rotations) points.push({ text: 'No regrips needed — finger-trick friendly.', tone: 'good' });
  else if (regrips > 0) points.push({ text: `About ${regrips} regrip${regrips > 1 ? 's' : ''} estimated.`, tone: 'info' });
  void start;
  return { userMoves, simplifiedMoves, referenceMoves, cancellations: userMoves - simplifiedMoves, rotations, awkwardMoves: awkward, undoSpots, regrips, verdict, points };
}

// ---------------------------------------------------------------- piece paths

/** Sampled positions of a cubie (in model coords) while an alg is played from a state. */
export function piecePath(start: CubeState, moves: Move[], cubieIndex: number, home: Vec, samples = 8): Vec[][] {
  const segs: Vec[][] = [];
  let s = start;
  for (const m of moves) {
    const p = applyVec(s[cubieIndex], home);
    const def = MOVE_DEFS[m.base];
    const inLayer = def.layers.includes(p[def.axis]);
    const seg: Vec[] = [];
    if (inLayer) {
      const q = def.dir * (m.amount === 2 ? 2 : m.amount);
      for (let k = 0; k <= samples * Math.abs(q); k++) {
        const ang = (q * Math.PI) / 2 * (k / (samples * Math.abs(q)));
        seg.push(rotVec(p, def.axis, ang));
      }
    } else seg.push(p);
    segs.push(seg);
    s = applyMove(s, m);
  }
  return segs;
}

function applyVec(m: number[], v: Vec): Vec {
  return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
}

function rotVec(v: Vec, axis: number, a: number): Vec {
  const c = Math.cos(a), s = Math.sin(a);
  const [x, y, z] = v;
  if (axis === 0) return [x, c * y - s * z, s * y + c * z];
  if (axis === 1) return [c * x + s * z, y, -s * x + c * z];
  return [c * x - s * y, s * x + c * y, z];
}

export type { Face };
