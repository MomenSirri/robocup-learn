import { useMemo, useSyncExternalStore } from 'react';
import { CubeStage } from '../ui/CubeStage';
import { STAGES, CASES, familiesOf, casesOf } from '../content/cases';
import { load, subscribe, difficulty, hardestCases, version } from '../training/store';
import { Stage } from '../cube/analysis';
import { Diagram } from '../ui/Diagram';
import { makeCase } from '../content/caseState';
import { CASE_BY_ID } from '../content/cases';
import { applyAlg, solvedState, parseAlg } from '../cube/cube';
import type { Nav } from '../App';
import { pathProgress } from './MyPath';
import { PATH_LABEL } from '../content/path';

export function useProgress() {
  useSyncExternalStore(subscribe, version, version);
  return load();
}

export function mastery(stage: Stage) {
  const list = CASES.filter((c) => c.stage === stage && c.alg);
  if (!list.length) return 0;
  const p = load();
  const score = list.map((c) => {
    const r = p.cases[c.id];
    if (!r || !r.seen) return r?.learned ? 0.2 : 0;
    return Math.max(0, Math.min(1, 1 - difficulty(c.id) / 1.2));
  });
  return score.reduce((a, b) => a + b, 0) / list.length;
}

function Ring({ value, color }: { value: number; color: string }) {
  const r = 16, c = 2 * Math.PI * r;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="ring">
      <circle cx="20" cy="20" r={r} stroke="#1f2937" strokeWidth="4" fill="none" />
      <circle cx="20" cy="20" r={r} stroke={color} strokeWidth="4" fill="none" strokeDasharray={`${c * value} ${c}`} strokeLinecap="round" transform="rotate(-90 20 20)" />
    </svg>
  );
}

export function Home({ nav }: { nav: Nav }) {
  useProgress();
  const weak = hardestCases(undefined, 3).filter((x) => CASE_BY_ID[x.id]);
  const heroState = useMemo(() => applyAlg(solvedState(), parseAlg("R U R' U' R' F R2 U' R' U' R U R' F'")), []);
  return (
    <div className="screen home">
      <div className="hero-title">
        <div className="brand">CFOP Coach</div>
        <div className="tagline">Understand it. Then you won't need to memorise it.</div>
      </div>
      <CubeStage
        className="hero"
        onReady={(v) => {
          v.setState(heroState);
          v.inputEnabled = false;
          let alive = true;
          const spin = () => {
            if (!alive) return;
            v.orbitBy(0.004);
            requestAnimationFrame(spin);
          };
          spin();
          return () => { alive = false; };
        }}
      />
      <div className="sheet">
        <PathCard nav={nav} />
        <div className="path">
          {STAGES.map((s, i) => (
            <button key={s.id} className="path-node" onClick={() => nav.push({ name: 'stage', stage: s.id })}>
              <Ring value={mastery(s.id)} color={s.color} />
              <div className="path-text">
                <div className="path-title">{s.title}</div>
                <div className="path-sub">{s.subtitle}</div>
              </div>
              <div className="path-meta">{familiesOf(s.id).length} idea{familiesOf(s.id).length > 1 ? 's' : ''} · {familiesOf(s.id).reduce((n, f) => n + casesOf(f.id).length, 0)} cases</div>
              {i < STAGES.length - 1 && <span className="path-link" />}
            </button>
          ))}
        </div>
        {weak.length > 0 && (
          <div className="focus-card">
            <div className="section-title">Today's focus</div>
            <div className="focus-row">
              {weak.map(({ id }) => {
                const c = CASE_BY_ID[id];
                return (
                  <button key={id} className="mini-case" onClick={() => nav.push({ name: 'lesson', caseId: id })}>
                    <Diagram state={makeCase(c).start} stage={c.stage} size={52} />
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
            <button className="cta" onClick={() => nav.tab('train')}>Train weak spots</button>
          </div>
        )}
        {weak.length === 0 && (
          <button className="cta" onClick={() => nav.push({ name: 'stage', stage: 'f2l' })}>Start with F2L basics</button>
        )}
      </div>
    </div>
  );
}

function PathCard({ nav }: { nav: Nav }) {
  const { known, total, next } = pathProgress();
  return (
    <button className="tool-card home-path" onClick={() => nav.push({ name: 'path' })}>
      <Ring value={known / total} color="var(--accent)" />
      <div>
        <div className="family-title">My path · 2-look</div>
        <div className="family-idea">{known}/{total} learned{next ? ` · next: ${PATH_LABEL[next]}` : ' · all done!'}</div>
      </div>
      <span className="chev">›</span>
    </button>
  );
}
