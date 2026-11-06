import { useMemo, useState } from 'react';
import { AlgGroupsView } from './AlgGroups';
import { Segmented } from '../ui/widgets';
import { STAGES, familiesOf, casesOf } from '../content/cases';
import { Stage } from '../cube/analysis';
import { Diagram } from '../ui/Diagram';
import { makeCase } from '../content/caseState';
import { TopBar } from '../ui/widgets';
import { load, accuracy } from '../training/store';
import { useProgress } from './Home';
import type { Nav } from '../App';

/** Concept map: families of related cases, each with its one big idea. */
export function StageMap({ stage, nav }: { stage: Stage; nav: Nav }) {
  useProgress();
  const meta = STAGES.find((s) => s.id === stage)!;
  const fams = familiesOf(stage);
  const starts = useMemo(() => Object.fromEntries(fams.flatMap((f) => casesOf(f.id)).map((c) => [c.id, makeCase(c).start])), [fams]);
  const p = load();
  const [view, setView] = useState<'idea' | 'alg'>('idea');
  return (
    <div className="screen scroll">
      <TopBar title={meta.title} onBack={nav.back} />
      <div className="stage-intro" style={{ ['--accent' as string]: meta.color }}>
        <div className="stage-sub">{meta.subtitle}</div>
        <div className="stage-flow">
          {['Recognise', 'Understand', 'Predict', 'Solve', 'Practise'].map((s, i) => (
            <span key={s}>{i > 0 && <i>›</i>}{s}</span>
          ))}
        </div>
      </div>
      {stage === 'pll' && (
        <button className="tool-card" onClick={() => nav.push({ name: 'pll-id' })}>
          <span className="glyph">?</span>
          <div>
            <div className="family-title">Which PLL do I have?</div>
            <div className="family-idea">Tap in the colours from your real cube and get the case, the setup turn and the algorithm.</div>
          </div>
          <span className="chev">›</span>
        </button>
      )}
      {stage === 'pll' && (
        <button className="tool-card" onClick={() => nav.push({ name: 'pll-2side' })}>
          <span className="glyph">⚡</span>
          <div>
            <div className="family-title">2-side recognition trainer</div>
            <div className="family-idea">The fast way: read any PLL from just the front and right side, with a step-by-step reason after every answer.</div>
          </div>
          <span className="chev">›</span>
        </button>
      )}
      {stage === 'pll' && (
        <div className="group-switch">
          <span className="small muted">Group by</span>
          <Segmented<'idea' | 'alg'> value={view} onChange={setView} options={[{ id: 'idea', label: 'How it looks' }, { id: 'alg', label: 'Similar algorithm' }]} />
        </div>
      )}
      {view === 'alg' ? <AlgGroupsView stage={stage} nav={nav} /> : (<>
      {fams.map((f) => (
        <section key={f.id} className="family">
          <div className="family-head">
            <span className="glyph">{f.glyph}</span>
            <div>
              <div className="family-title">{f.title}</div>
              <div className="family-idea">{f.idea}</div>
            </div>
          </div>
          <ol className="family-steps">
            {f.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
          <div className="case-grid">
            {casesOf(f.id).map((c) => {
              const acc = accuracy(p.cases[c.id]);
              return (
                <button key={c.id} className="case-tile" onClick={() => nav.push(c.stage === 'cross' ? { name: 'discover', caseId: c.id } : { name: 'lesson', caseId: c.id })}>
                  <Diagram state={starts[c.id]} stage={c.stage} size={64} />
                  <span className="case-name">{c.name}</span>
                  {acc !== null && <span className="case-acc" style={{ ['--acc' as string]: acc }}>{Math.round(acc * 100)}%</span>}
                  {p.cases[c.id]?.learned && <span className="case-badge">✓</span>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      </>)}
    </div>
  );
}
