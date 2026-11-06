import { SideColour } from '../training/pllId';
import { Explanation, PATTERN_TEXT, RELATION_TEXT, STICKER_LABEL } from '../training/pllRecog';

export const SIDE_HEX: Record<SideColour, string> = { F: '#15b85a', R: '#e0303d', B: '#2563eb', L: '#ff7a1a' };
export const SIDE_NAME: Record<SideColour, string> = { F: 'Green', R: 'Red', B: 'Blue', L: 'Orange' };
const YELLOW = '#ffd23f';
const EMPTY = '#2a3040';

// isometric projection of the top layer: front face on the left, right face on the right
const P = (x: number, y: number, z: number) => [(x - z) * 0.866 * 30, ((x + z) * 0.5 - y) * 30];
function quad(c: number[], du: number[], dv: number[], s = 0.44) {
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    .map(([a, b]) => P(c[0] + du[0] * a * s + dv[0] * b * s, c[1] + du[1] * a * s + dv[1] * b * s, c[2] + du[2] * a * s + dv[2] * b * s).join(','))
    .join(' ');
}
const CENTRES = [...[-1, 0, 1].map((x) => P(x, 1, 1.5)), ...[1, 0, -1].map((z) => P(1.5, 1, z))];
const STICKERS = [
  ...[-1, 0, 1].map((x) => quad([x, 1, 1.5], [1, 0, 0], [0, 1, 0])),
  ...[1, 0, -1].map((z) => quad([1.5, 1, z], [0, 0, -1], [0, 1, 0])),
];

/**
 * The view a solver actually has: the top layer from the front-right corner,
 * with the 6 side stickers that decide the PLL. Optionally tappable, and
 * able to mark the stickers a recognition step compares.
 */
export function TwoSideView({ colours, selected, onTap, marks, numbers }: {
  colours: (SideColour | null)[];
  selected?: number;
  onTap?: (i: number) => void;
  /** sticker index → small badge text (e.g. "A") drawn on it */
  marks?: Record<number, string>;
  numbers?: boolean;
}) {
  return (
    <svg viewBox="-100 -96 200 204" className="pll-input" role="group" aria-label="Top layer, front and right sides">
      {[-1, 0, 1].flatMap((x) => [-1, 0, 1].map((z) => <polygon key={`t${x}${z}`} points={quad([x, 1.5, z], [1, 0, 0], [0, 0, 1])} fill={YELLOW} stroke="#05060a" strokeWidth={2} />))}
      {[-1, 0, 1].flatMap((x) => [0, -1].map((y) => <polygon key={`f${x}${y}`} points={quad([x, y, 1.5], [1, 0, 0], [0, 1, 0])} fill="#1b202b" stroke="#05060a" strokeWidth={2} />))}
      {[1, 0, -1].flatMap((z) => [0, -1].map((y) => <polygon key={`r${z}${y}`} points={quad([1.5, y, z], [0, 0, -1], [0, 1, 0])} fill="#1b202b" stroke="#05060a" strokeWidth={2} />))}
      {STICKERS.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill={colours[i] ? SIDE_HEX[colours[i]!] : EMPTY}
          stroke={i === selected ? '#ffffff' : marks?.[i] ? '#ffffff' : '#05060a'}
          strokeWidth={i === selected ? 4 : marks?.[i] ? 3 : 2}
          className={onTap ? 'tap' : undefined}
          onClick={onTap ? () => onTap(i) : undefined}
        />
      ))}
      {numbers && CENTRES.map(([x, y], i) => (
        <text key={'n' + i} x={x} y={y + 4} className="sticker-num">{STICKER_LABEL[i]}</text>
      ))}
      {marks && Object.entries(marks).map(([i, t]) => {
        const [x, y] = CENTRES[+i];
        return (
          <g key={'m' + i}>
            <circle cx={x} cy={y - 14} r={7} className="mark-dot" />
            <text x={x} y={y - 11} className="mark-text">{t}</text>
          </g>
        );
      })}
      <text x={-62} y={104} className="svg-label">FRONT</text>
      <text x={32} y={104} className="svg-label">RIGHT</text>
    </svg>
  );
}

/** Step-by-step reasoning for a 2-side view. */
export function RecogSteps({ ex }: { ex: Explanation }) {
  return (
    <ol className="recog-steps">
      <li>
        <b>Front (1–3):</b> {PATTERN_TEXT[ex.front].short}
        <span className="muted"> · {PATTERN_TEXT[ex.front].long}</span>
      </li>
      <li>
        <b>Right (4–6):</b> {PATTERN_TEXT[ex.right].short}
        <span className="muted"> · {PATTERN_TEXT[ex.right].long}</span>
      </li>
      <li>
        {ex.candidates.length === 1 ? <>That look is always <b>{ex.answer}</b>.</> : <>That look means one of: <b>{ex.candidates.join(', ')}</b></>}
      </li>
      {ex.steps.map((s, k) => (
        <li key={k}>
          Compare <b>{STICKER_LABEL[s.check.i]}</b> and <b>{STICKER_LABEL[s.check.j]}</b>: {RELATION_TEXT[s.result]}
          {k === ex.steps.length - 1 && <> → <b>{ex.answer}</b></>}
        </li>
      ))}
    </ol>
  );
}
