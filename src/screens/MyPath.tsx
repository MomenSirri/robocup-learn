import { useMemo } from 'react';
import { PATH, PATH_CASE_IDS, PATH_LABEL } from '../content/path';
import { CASE_BY_ID } from '../content/cases';
import { makeCase } from '../content/caseState';
import { Diagram } from '../ui/Diagram';
import { MoveList, TopBar } from '../ui/widgets';
import { accuracy, isKnown, setKnown } from '../training/store';
import { useProgress } from './Home';
import { parseAlg } from '../cube/cube';
import type { Nav } from '../App';

export function pathProgress() {
  const known = PATH_CASE_IDS.filter(isKnown).length;
  const next = PATH_CASE_IDS.find((id) => !isKnown(id));
  return { known, total: PATH_CASE_IDS.length, next };
}

/**
 * The 2-look roadmap: only the 16 algorithms needed to go from a beginner
 * last layer to 2-look CFOP, in learning order, with what to learn next.
 */
export function MyPath({ nav }: { nav: Nav }) {
  const p = useProgress();
  const { known, total, next } = pathProgress();
  const starts = useMemo(() => Object.fromEntries(PATH_CASE_IDS.map((id) => [id, makeCase(CASE_BY_ID[id]).start])), []);
  return (
    <div className="screen scroll my-path">
      <TopBar title={<><div className="tb-main">My path</div><div className="tb-sub">2-look last layer · 16 algorithms</div></>} onBack={nav.canBack ? nav.back : undefined} />

      <section className="card path-summary">
        <div className="path-count"><b>{known}</b> / {total} learned</div>
        <div className="bar"><div style={{ width: `${(known / total) * 100}%`, background: 'var(--accent)' }} /></div>
        <div className="small muted">Tick the algorithms you already know. The trainer only quizzes you on those, plus the next one to learn.</div>
        <div className="row buttons">
          {next && <button className="cta" onClick={() => nav.push({ name: 'lesson', caseId: next })}>Learn next: {PATH_LABEL[next]}</button>}
          <button className="chip" onClick={() => nav.push({ name: 'train', pool: 'path' })}>Drill my path</button>
        </div>
      </section>

      {PATH.map((step, si) => {
        const done = step.items.filter((i) => p.known[i.caseId]).length;
        return (
          <section key={step.id} className={'family path-step' + (done === step.items.length ? ' complete' : '')}>
            <div className="family-head">
              <span className="glyph">{done === step.items.length ? '✓' : si + 1}</span>
              <div>
                <div className="family-title">{step.title} <span className="muted small">{done}/{step.items.length}</span></div>
                <div className="family-idea">{step.goal}</div>
              </div>
            </div>
            <div className="step-how">👁 {step.how}</div>
            <div className="path-items">
              {step.items.map((item) => {
                const c = CASE_BY_ID[item.caseId];
                const k = !!p.known[item.caseId];
                const acc = accuracy(p.cases[item.caseId]);
                return (
                  <div key={item.caseId} className={'path-item' + (k ? ' known' : '') + (item.caseId === next ? ' is-next' : '')}>
                    <button className="path-item-main" onClick={() => nav.push({ name: 'lesson', caseId: item.caseId })}>
                      <Diagram state={starts[item.caseId]} stage={c.stage} size={56} />
                      <div className="grow">
                        <div className="path-item-name">{item.label}{item.caseId === next && <span className="pill next-pill">next</span>}</div>
                        <div className="small muted">{item.hold}</div>
                        <MoveList moves={parseAlg(c.alg)} />
                        {acc !== null && <div className="small muted">Trainer: {Math.round(acc * 100)}% right</div>}
                      </div>
                    </button>
                    <button className={'know' + (k ? ' on' : '')} onClick={() => setKnown(item.caseId, !k)} aria-pressed={k} aria-label={k ? 'Mark as not known' : 'I know this'}>
                      {k ? '✓' : ''}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <section className="card">
        <div className="section-title">After the path</div>
        <div className="small">When all 16 feel easy and your average is under ~40 seconds, learn the rest of PLL (Learn → PLL). Full PLL usually saves more time than full OLL.</div>
      </section>
    </div>
  );
}
