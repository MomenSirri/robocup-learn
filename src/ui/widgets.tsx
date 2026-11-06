import { useState } from 'react';
import { Move, MoveBase, moveToString } from '../cube/cube';
import { Beat, Chunk, SolutionReport } from '../cube/analysis';
import { HINT_LABELS, HintLevel } from '../training/goals';
import { faceHex } from './scheme';

const FACE_TINT: Record<string, string> = { U: faceHex('U'), D: faceHex('D'), F: faceHex('F'), B: faceHex('B'), R: faceHex('R'), L: faceHex('L'), M: '#94a3b8', E: '#94a3b8', S: '#94a3b8', x: '#64748b', y: '#64748b', z: '#64748b' };

export function MovePad({ onMove, onUndo, compact }: { onMove: (m: Move) => void; onUndo?: () => void; compact?: boolean }) {
  const [prime, setPrime] = useState(false);
  const [double, setDouble] = useState(false);
  const bases: MoveBase[] = compact ? ['U', 'R', 'F', 'L', 'D', 'M'] : ['U', 'R', 'F', 'L', 'D', 'B', 'M', 'y'];
  const amount = double ? 2 : prime ? -1 : 1;
  return (
    <div className="movepad">
      <div className="movepad-keys">
        {bases.map((b) => (
          <button key={b} className="key" style={{ ['--tint' as string]: FACE_TINT[b] }} onClick={() => onMove({ base: b, amount: amount as Move['amount'] })}>
            {moveToString({ base: b, amount: amount as Move['amount'] })}
          </button>
        ))}
      </div>
      <div className="movepad-mods">
        <button className={'mod' + (prime ? ' on' : '')} onClick={() => { setPrime(!prime); setDouble(false); }}>′</button>
        <button className={'mod' + (double ? ' on' : '')} onClick={() => { setDouble(!double); setPrime(false); }}>2</button>
        {onUndo && <button className="mod" onClick={onUndo} aria-label="Undo">↶</button>}
      </div>
    </div>
  );
}

export function Timeline({ moves, index, chunks, onSeek }: { moves: Move[]; index: number; chunks: Chunk[]; onSeek: (i: number) => void }) {
  return (
    <div className="timeline">
      {chunks.map((c, ci) => (
        <div key={ci} className="chunk" style={{ ['--chunk' as string]: c.trigger?.color ?? '#475569' }} title={c.trigger?.name}>
          {moves.slice(c.start, c.end).map((m, k) => {
            const i = c.start + k;
            return (
              <button key={i} className={'mv' + (i < index ? ' done' : '') + (i === index ? ' next' : '')} onClick={() => onSeek(i + 1)}>
                {moveToString(m)}
              </button>
            );
          })}
          {c.trigger && <span className="chunk-name">{c.trigger.name}</span>}
        </div>
      ))}
    </div>
  );
}

export function Beats({ beats, fallback }: { beats: Beat[]; fallback?: string }) {
  if (!beats.length) return fallback ? <div className="beats"><div className="beat info">{fallback}</div></div> : null;
  return (
    <div className="beats">
      {beats.map((b, i) => (
        <div key={i + b.text} className={'beat ' + b.tone}>{b.text}</div>
      ))}
    </div>
  );
}

export function HintLadder({ level, onNext }: { level: HintLevel; onNext: () => void }) {
  return (
    <div className="hints">
      {[1, 2, 3, 4].map((l) => (
        <button key={l} className={'hint' + (level >= l ? ' used' : '') + (level + 1 === l ? ' next' : '')} disabled={level + 1 !== l} onClick={onNext}>
          <span className="hint-n">{l}</span>
          {HINT_LABELS[l as 1 | 2 | 3 | 4]}
        </button>
      ))}
    </div>
  );
}

export function MoveList({ moves, label, highlight }: { moves: Move[]; label?: string; highlight?: [number, number] }) {
  return (
    <div className="movelist">
      {label && <span className="movelist-label">{label}</span>}
      {moves.length ? moves.map((m, i) => <span key={i} className={'mv small' + (highlight && i >= highlight[0] && i < highlight[1] ? ' shared' : '')}>{moveToString(m)}</span>) : <span className="muted">—</span>}
    </div>
  );
}

export function ReportCard({ report, reference, elapsed }: { report: SolutionReport; reference?: Move[]; elapsed?: number }) {
  const label = { optimal: 'Optimal', great: 'Great', good: 'Good', long: 'Room to improve' }[report.verdict];
  return (
    <div className={'report ' + report.verdict}>
      <div className="report-head">
        <div className="report-verdict">{label}</div>
        <div className="report-stats">
          <Stat k="moves" v={report.simplifiedMoves} />
          <Stat k="reference" v={report.referenceMoves} />
          {elapsed !== undefined && <Stat k="seconds" v={(elapsed / 1000).toFixed(1)} />}
        </div>
      </div>
      <Beats beats={report.points} />
      {reference && <MoveList moves={reference} label="Experienced solver" />}
    </div>
  );
}

export function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="stat">
      <div className="stat-v">{v}</div>
      <div className="stat-k">{k}</div>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.id} className={o.id === value ? 'on' : ''} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

export function TopBar({ title, onBack, right }: { title: React.ReactNode; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <div className="topbar">
      {onBack ? <button className="icon-btn" onClick={onBack} aria-label="Back">‹</button> : <span className="icon-btn ghost" />}
      <div className="topbar-title">{title}</div>
      <div className="topbar-right">{right}</div>
    </div>
  );
}
