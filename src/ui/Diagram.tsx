import { CubeState, Face, Vec, facelets, faceletAt, FIRST_TWO_LAYERS, CUBIES, relPos, frame } from '../cube/cube';
import { Stage } from '../cube/analysis';
import { faceHex } from './scheme';

const HEX: Record<Face, string> = { U: faceHex('U'), D: faceHex('D'), F: faceHex('F'), B: faceHex('B'), R: faceHex('R'), L: faceHex('L') };
const GREY = '#3b4150';

/** Compact 2D case picture: top view for last layer, isometric for F2L/cross. */
export function Diagram({ state, stage, size = 64 }: { state: CubeState; stage: Stage; size?: number }) {
  const f = facelets(state);
  if (stage === 'oll' || stage === 'pll') {
    const cell = 10;
    const strip = 3.2;
    const rects: React.ReactNode[] = [];
    const col = (c: Face | undefined) => (!c ? GREY : stage === 'oll' ? (c === 'U' ? HEX.U : GREY) : HEX[c]);
    for (let z = -1; z <= 1; z++)
      for (let x = -1; x <= 1; x++) {
        rects.push(<rect key={`u${x}${z}`} x={strip + 1 + (x + 1) * cell + 0.6} y={strip + 1 + (z + 1) * cell + 0.6} width={cell - 1.2} height={cell - 1.2} rx={1.6} fill={col(faceletAt(f, [x, 1, z], 'U'))} />);
      }
    const side = (pos: Vec, face: Face, x: number, y: number, w: number, h: number, k: string) =>
      rects.push(<rect key={k} x={x} y={y} width={w} height={h} rx={1} fill={col(faceletAt(f, pos, face))} />);
    for (let i = -1; i <= 1; i++) {
      const o = strip + 1 + (i + 1) * cell + 1;
      side([i, 1, -1], 'B', o, 0, cell - 2, strip, 'b' + i);
      side([i, 1, 1], 'F', o, strip + 2 + 3 * cell, cell - 2, strip, 'f' + i);
      side([-1, 1, i], 'L', 0, o, strip, cell - 2, 'l' + i);
      side([1, 1, i], 'R', strip + 2 + 3 * cell, o, strip, cell - 2, 'r' + i);
    }
    const W = strip * 2 + 2 + 3 * cell;
    return (
      <svg viewBox={`0 0 ${W} ${W}`} width={size} height={size} className="diagram">
        {rects}
      </svg>
    );
  }
  // isometric U/F/R view
  const P = (x: number, y: number, z: number) => [(x - z) * 0.866 * 10, ((x + z) * 0.5 - y) * 10];
  const show = (id: string | undefined) => !id || stage !== 'f2l' || FIRST_TWO_LAYERS.includes(id) || id.length === 1;
  const polys: React.ReactNode[] = [];
  const quad = (c: [number, number, number], du: Vec, dv: Vec, colour: Face | undefined, key: string, cubieShown: boolean) => {
    const pts = [
      [-1, -1], [1, -1], [1, 1], [-1, 1],
    ].map(([a, b]) => P(c[0] + du[0] * a * 0.44 + dv[0] * b * 0.44, c[1] + du[1] * a * 0.44 + dv[1] * b * 0.44, c[2] + du[2] * a * 0.44 + dv[2] * b * 0.44));
    const fill = colour && cubieShown ? HEX[colour] : GREY;
    polys.push(<polygon key={key} points={pts.map((p) => p.join(',')).join(' ')} fill={fill} stroke="#0d0f14" strokeWidth={0.6} strokeLinejoin="round" />);
  };
  const idAt = (pos: Vec) => cubieAt(state, pos);
  for (let x = -1; x <= 1; x++)
    for (let z = -1; z <= 1; z++) quad([x, 1.5, z], [1, 0, 0], [0, 0, 1], faceletAt(f, [x, 1, z], 'U'), `u${x}${z}`, show(idAt([x, 1, z])));
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++) quad([x, y, 1.5], [1, 0, 0], [0, 1, 0], faceletAt(f, [x, y, 1], 'F'), `f${x}${y}`, show(idAt([x, y, 1])));
  for (let z = -1; z <= 1; z++)
    for (let y = -1; y <= 1; y++) quad([1.5, y, z], [0, 0, 1], [0, 1, 0], faceletAt(f, [1, y, z], 'R'), `r${z}${y}`, show(idAt([1, y, z])));
  return (
    <svg viewBox="-30 -30 60 60" width={size} height={size} className="diagram">
      {polys}
    </svg>
  );
}

function cubieAt(s: CubeState, pos: Vec): string | undefined {
  const fr = frame(s);
  for (const c of CUBIES) {
    const p = relPos(s, c.id, fr);
    if (p[0] === pos[0] && p[1] === pos[1] && p[2] === pos[2]) return c.id;
  }
  return undefined;
}
