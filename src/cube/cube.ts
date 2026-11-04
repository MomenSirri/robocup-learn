/**
 * Cube model.
 *
 * Every cubie is described by its home position and a 3x3 integer rotation
 * matrix M. Its current position is M·home and each sticker's current normal
 * is M·homeNormal. A move left-multiplies M by a quarter-turn rotation for
 * every cubie inside the turning layer. This keeps the model tiny, exact and
 * trivially renderable (the same matrix drives the 3D mesh).
 *
 * Axes: +x = R, +y = U, +z = F.
 */

export type Vec = [number, number, number];
/** Row-major 3x3 matrix. */
export type Mat = number[];
export type Face = 'U' | 'D' | 'F' | 'B' | 'R' | 'L';
export type CubieKind = 'corner' | 'edge' | 'center';

export interface Sticker {
  face: Face; // colour identity (the face it belongs to when solved)
  normal: Vec; // home normal
}

export interface Cubie {
  id: string;
  index: number;
  home: Vec;
  kind: CubieKind;
  stickers: Sticker[];
}

export const FACE_NORMAL: Record<Face, Vec> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
  R: [1, 0, 0],
  L: [-1, 0, 0],
};

export const FACES: Face[] = ['U', 'D', 'F', 'B', 'R', 'L'];

export function faceOfNormal(n: Vec): Face {
  for (const f of FACES) {
    const m = FACE_NORMAL[f];
    if (m[0] === n[0] && m[1] === n[1] && m[2] === n[2]) return f;
  }
  throw new Error('bad normal ' + n.join(','));
}

function cubieName(v: Vec): string {
  let s = '';
  if (v[1] === 1) s += 'U';
  if (v[1] === -1) s += 'D';
  if (v[2] === 1) s += 'F';
  if (v[2] === -1) s += 'B';
  if (v[0] === 1) s += 'R';
  if (v[0] === -1) s += 'L';
  return s;
}

export const CUBIES: Cubie[] = (() => {
  const list: Cubie[] = [];
  for (let y = 1; y >= -1; y--)
    for (let z = 1; z >= -1; z--)
      for (let x = -1; x <= 1; x++) {
        const nz = (x !== 0 ? 1 : 0) + (y !== 0 ? 1 : 0) + (z !== 0 ? 1 : 0);
        if (nz === 0) continue;
        const home: Vec = [x, y, z];
        const stickers: Sticker[] = [];
        if (y !== 0) stickers.push({ face: y > 0 ? 'U' : 'D', normal: [0, y, 0] });
        if (z !== 0) stickers.push({ face: z > 0 ? 'F' : 'B', normal: [0, 0, z] });
        if (x !== 0) stickers.push({ face: x > 0 ? 'R' : 'L', normal: [x, 0, 0] });
        list.push({
          id: cubieName(home),
          index: list.length,
          home,
          kind: nz === 3 ? 'corner' : nz === 2 ? 'edge' : 'center',
          stickers,
        });
      }
  return list;
})();

export const CUBIE_BY_ID: Record<string, Cubie> = Object.fromEntries(CUBIES.map((c) => [c.id, c]));

// ---------------------------------------------------------------- matrices

export const IDENTITY: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function mul(a: Mat, b: Mat): Mat {
  const r = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += a[i * 3 + k] * b[k * 3 + j];
      r[i * 3 + j] = s;
    }
  return r;
}

export function transpose(a: Mat): Mat {
  return [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]];
}

export function apply(m: Mat, v: Vec): Vec {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

export function matEq(a: Mat, b: Mat): boolean {
  for (let i = 0; i < 9; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Rotation by q quarter turns (counter-clockwise, right-hand rule) about axis. */
export function quarter(axis: 0 | 1 | 2, q: number): Mat {
  const qq = ((q % 4) + 4) % 4;
  const c = [1, 0, -1, 0][qq];
  const s = [0, 1, 0, -1][qq];
  if (axis === 0) return [1, 0, 0, 0, c, -s, 0, s, c];
  if (axis === 1) return [c, 0, s, 0, 1, 0, -s, 0, c];
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

// ---------------------------------------------------------------- moves

export type MoveBase =
  | 'U' | 'D' | 'F' | 'B' | 'R' | 'L'
  | 'u' | 'd' | 'f' | 'b' | 'r' | 'l'
  | 'M' | 'E' | 'S'
  | 'x' | 'y' | 'z';

export interface Move {
  base: MoveBase;
  /** 1 = clockwise quarter, -1 = counter-clockwise, 2 = half turn */
  amount: 1 | -1 | 2;
}

interface MoveDef {
  axis: 0 | 1 | 2;
  layers: number[];
  /** quarter turns (in the right-hand sense about +axis) for one clockwise turn */
  dir: 1 | -1;
}

export const MOVE_DEFS: Record<MoveBase, MoveDef> = {
  R: { axis: 0, layers: [1], dir: -1 },
  L: { axis: 0, layers: [-1], dir: 1 },
  M: { axis: 0, layers: [0], dir: 1 },
  r: { axis: 0, layers: [0, 1], dir: -1 },
  l: { axis: 0, layers: [-1, 0], dir: 1 },
  x: { axis: 0, layers: [-1, 0, 1], dir: -1 },
  U: { axis: 1, layers: [1], dir: -1 },
  D: { axis: 1, layers: [-1], dir: 1 },
  E: { axis: 1, layers: [0], dir: 1 },
  u: { axis: 1, layers: [0, 1], dir: -1 },
  d: { axis: 1, layers: [-1, 0], dir: 1 },
  y: { axis: 1, layers: [-1, 0, 1], dir: -1 },
  F: { axis: 2, layers: [1], dir: -1 },
  B: { axis: 2, layers: [-1], dir: 1 },
  S: { axis: 2, layers: [0], dir: -1 },
  f: { axis: 2, layers: [0, 1], dir: -1 },
  b: { axis: 2, layers: [-1, 0], dir: 1 },
  z: { axis: 2, layers: [-1, 0, 1], dir: -1 },
};

export function isRotation(m: Move): boolean {
  return m.base === 'x' || m.base === 'y' || m.base === 'z';
}

export function quarterTurns(m: Move): number {
  return MOVE_DEFS[m.base].dir * (m.amount === 2 ? 2 : m.amount);
}

export function moveToString(m: Move): string {
  return m.base + (m.amount === 2 ? '2' : m.amount === -1 ? "'" : '');
}

export function algToString(moves: Move[]): string {
  return moves.map(moveToString).join(' ');
}

export function parseAlg(text: string): Move[] {
  const out: Move[] = [];
  const re = /([UDFBRLudfbrlMESxyz])(w?)(\d*)('?)/g;
  const clean = text.replace(/[()[\]]/g, ' ').replace(/’/g, "'");
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) {
    let base = m[1] as MoveBase;
    if (m[2] === 'w') base = base.toLowerCase() as MoveBase;
    const n = m[3] ? parseInt(m[3], 10) % 4 : 1;
    if (n === 0) continue;
    let amt = n === 2 ? 2 : n === 3 ? -1 : 1;
    if (m[4] && amt !== 2) amt = -amt;
    out.push({ base, amount: amt as Move['amount'] });
  }
  return out;
}

export function invertMove(m: Move): Move {
  return { base: m.base, amount: m.amount === 2 ? 2 : (-m.amount as 1 | -1) };
}

export function invertAlg(moves: Move[]): Move[] {
  return moves.slice().reverse().map(invertMove);
}

// ---------------------------------------------------------------- state

/** One orientation matrix per cubie (indexed like CUBIES). */
export type CubeState = Mat[];

export function solvedState(): CubeState {
  return CUBIES.map(() => IDENTITY.slice());
}

export function cloneState(s: CubeState): CubeState {
  return s.map((m) => m.slice());
}

export function cubiePos(s: CubeState, c: Cubie): Vec {
  return apply(s[c.index], c.home);
}

/** Indices of cubies that a move turns, evaluated on the given state. */
export function layerMembers(s: CubeState, m: Move): number[] {
  const def = MOVE_DEFS[m.base];
  const res: number[] = [];
  for (const c of CUBIES) {
    const p = cubiePos(s, c);
    if (def.layers.includes(p[def.axis])) res.push(c.index);
  }
  return res;
}

export function applyMove(s: CubeState, m: Move): CubeState {
  const def = MOVE_DEFS[m.base];
  const R = quarter(def.axis, quarterTurns(m));
  const next = s.slice();
  for (const i of layerMembers(s, m)) next[i] = mul(R, s[i]);
  return next;
}

export function applyAlg(s: CubeState, moves: Move[]): CubeState {
  let cur = s;
  for (const m of moves) cur = applyMove(cur, m);
  return cur;
}

// ---------------------------------------------------------------- frame

/**
 * The cube's orientation frame, derived from where the U and F centres are.
 * A cubie is solved iff its matrix equals the frame. Slice moves and cube
 * rotations move the centres, so everything here is rotation-invariant.
 */
export function frame(s: CubeState): Mat {
  const u = cubiePos(s, CUBIE_BY_ID.U);
  const f = cubiePos(s, CUBIE_BY_ID.F);
  const r: Vec = [u[1] * f[2] - u[2] * f[1], u[2] * f[0] - u[0] * f[2], u[0] * f[1] - u[1] * f[0]];
  // columns: r, u, f
  return [r[0], u[0], f[0], r[1], u[1], f[1], r[2], u[2], f[2]];
}

/** Cubie orientation relative to the frame (identity == solved). */
export function relative(s: CubeState, id: string, fr = frame(s)): Mat {
  return mul(transpose(fr), s[CUBIE_BY_ID[id].index]);
}

export function isCubieSolved(s: CubeState, id: string, fr = frame(s)): boolean {
  const c = CUBIE_BY_ID[id];
  if (c.kind === 'center') return true;
  return matEq(s[c.index], fr);
}

/** Position of a cubie in frame coordinates. */
export function relPos(s: CubeState, id: string, fr = frame(s)): Vec {
  return apply(relative(s, id, fr), CUBIE_BY_ID[id].home);
}

/** Where (in frame coordinates) the sticker of the given colour currently points. */
export function stickerDir(s: CubeState, id: string, colour: Face, fr = frame(s)): Vec {
  const c = CUBIE_BY_ID[id];
  const st = c.stickers.find((x) => x.face === colour);
  if (!st) throw new Error(`${id} has no ${colour} sticker`);
  return apply(relative(s, id, fr), st.normal);
}

export function isSolved(s: CubeState): boolean {
  const fr = frame(s);
  return CUBIES.every((c) => isCubieSolved(s, c.id, fr));
}

export function allSolved(s: CubeState, ids: string[]): boolean {
  const fr = frame(s);
  return ids.every((id) => isCubieSolved(s, id, fr));
}

/**
 * Facelet colours: for a given frame face and grid position returns colour.
 * Used by the 2D diagrams. Coordinates are frame coordinates.
 */
export function facelets(s: CubeState): Map<string, Face> {
  const fr = frame(s);
  const frT = transpose(fr);
  const map = new Map<string, Face>();
  for (const c of CUBIES) {
    const M = mul(frT, s[c.index]);
    const p = apply(M, c.home);
    for (const st of c.stickers) {
      const n = apply(M, st.normal);
      map.set(`${p.join(',')}|${faceOfNormal(n)}`, st.face);
    }
  }
  return map;
}

export function faceletAt(map: Map<string, Face>, pos: Vec, face: Face): Face | undefined {
  return map.get(`${pos.join(',')}|${face}`);
}

// ---------------------------------------------------------------- piece groups

export const CROSS_EDGES = ['DF', 'DR', 'DB', 'DL'];
export const F2L_SLOTS: Record<string, { corner: string; edge: string }> = {
  FR: { corner: 'DFR', edge: 'FR' },
  FL: { corner: 'DFL', edge: 'FL' },
  BR: { corner: 'DBR', edge: 'BR' },
  BL: { corner: 'DBL', edge: 'BL' },
};
export const FIRST_TWO_LAYERS = CUBIES.filter((c) => c.home[1] < 1 && c.kind !== 'center').map((c) => c.id);
export const LAST_LAYER = CUBIES.filter((c) => c.home[1] === 1 && c.kind !== 'center').map((c) => c.id);

// ---------------------------------------------------------------- scrambles

const FACE_MOVES: MoveBase[] = ['U', 'D', 'F', 'B', 'R', 'L'];
const AXIS_OF: Record<string, number> = { U: 1, D: 1, F: 2, B: 2, R: 0, L: 0 };

export function randomScramble(length = 20, rng = Math.random): Move[] {
  const out: Move[] = [];
  while (out.length < length) {
    const base = FACE_MOVES[Math.floor(rng() * 6)];
    const last = out[out.length - 1];
    const prev = out[out.length - 2];
    if (last && last.base === base) continue;
    if (last && prev && AXIS_OF[last.base] === AXIS_OF[base] && prev.base === base) continue;
    const amt = ([1, -1, 2] as const)[Math.floor(rng() * 3)];
    out.push({ base, amount: amt });
  }
  return out;
}
