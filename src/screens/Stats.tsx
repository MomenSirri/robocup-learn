import { CASE_BY_ID, STAGES } from '../content/cases';
import { accuracy, avg, hardestCases, resetProgress, topConfusions } from '../training/store';
import { useProgress, mastery } from './Home';
import { Diagram } from '../ui/Diagram';
import { makeCase } from '../content/caseState';
import { Stat, TopBar } from '../ui/widgets';
import type { Nav } from '../App';

function Spark({ values, color, max }: { values: number[]; color: string; max?: number }) {
  if (values.length < 2) return <div className="muted small">Train on a few days to see a trend.</div>;
  const m = max ?? Math.max(...values, 1);
  const w = 280, h = 56;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / m) * (h - 6) - 3}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function name(id: string) {
  if (id.startsWith('family:')) return 'wrong idea';
  return CASE_BY_ID[id]?.name ?? id;
}

export function Stats({ nav }: { nav: Nav }) {
  const p = useProgress();
  const recs = Object.entries(p.cases);
  const attempts = recs.reduce((n, [, r]) => n + r.seen, 0);
  const correct = recs.reduce((n, [, r]) => n + r.correct, 0);
  const recogAll = recs.flatMap(([, r]) => r.recog);
  const execAll = recs.flatMap(([, r]) => r.exec);
  const days = p.days.slice(-21);
  const hard = hardestCases(undefined, 6).filter((h) => CASE_BY_ID[h.id]);
  const conf = topConfusions(5);
  return (
    <div className="screen scroll">
      <TopBar title="Progress" onBack={nav.canBack ? nav.back : undefined} />
      <div className="stat-row">
        <Stat k="attempts" v={attempts} />
        <Stat k="accuracy" v={attempts ? Math.round((correct / attempts) * 100) + '%' : '—'} />
        <Stat k="recognise" v={recogAll.length ? (avg(recogAll) / 1000).toFixed(1) + 's' : '—'} />
        <Stat k="execute" v={execAll.length ? (avg(execAll) / 1000).toFixed(1) + 's' : '—'} />
      </div>

      <section className="card">
        <div className="section-title">Mastery</div>
        {STAGES.filter((s) => s.id !== 'cross').map((s) => (
          <div key={s.id} className="bar-row">
            <span>{s.title}</span>
            <div className="bar"><div style={{ width: `${Math.round(mastery(s.id) * 100)}%`, background: s.color }} /></div>
            <span className="muted">{Math.round(mastery(s.id) * 100)}%</span>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="section-title">Accuracy over time</div>
        <Spark values={days.map((d) => (d.attempts ? d.correct / d.attempts : 0))} color="#22c55e" max={1} />
        <div className="section-title">Recognition time</div>
        <Spark values={days.map((d) => (d.recogN ? d.recogSum / d.recogN / 1000 : 0))} color="#60a5fa" />
      </section>

      <section className="card">
        <div className="section-title">Most difficult</div>
        {hard.length === 0 && <div className="muted small">No data yet — try the trainer.</div>}
        {hard.map(({ id }) => {
          const c = CASE_BY_ID[id];
          const r = p.cases[id];
          const acc = accuracy(r);
          return (
            <button key={id} className="list-item" onClick={() => nav.push({ name: 'lesson', caseId: id })}>
              <Diagram state={makeCase(c).start} stage={c.stage} size={40} />
              <div className="grow">
                <b>{c.name}</b>
                <span className="muted small">{acc !== null ? Math.round(acc * 100) + '% · ' : ''}{r.recog.length ? (avg(r.recog) / 1000).toFixed(1) + 's' : ''}</span>
              </div>
              <span className="chev">›</span>
            </button>
          );
        })}
      </section>

      <section className="card">
        <div className="section-title">Cases you confuse</div>
        {conf.length === 0 && <div className="muted small">No confusions recorded.</div>}
        {conf.map((c) => (
          <div key={c.a + c.b} className="confusion">
            <b>{name(c.a)}</b> <span className="muted">mistaken for</span> <b>{name(c.b)}</b> <span className="pill">{c.n}×</span>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="section-title">Common mistakes</div>
        {Object.keys(p.mistakes).length === 0 && <div className="muted small">Nothing yet.</div>}
        {Object.entries(p.mistakes).map(([k, n]) => (
          <div key={k} className="confusion"><span>{k}</span> <span className="pill">{n}×</span></div>
        ))}
        {p.discoveries.length > 0 && (
          <div className="muted small">Self-found solutions: {p.discoveries.length} · avg {(avg(p.discoveries.map((d) => d.moves - d.ref))).toFixed(1)} moves over reference</div>
        )}
      </section>

      <button className="chip danger" onClick={() => confirm('Reset all progress?') && resetProgress()}>Reset progress</button>
    </div>
  );
}
