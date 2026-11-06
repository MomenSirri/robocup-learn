import { useMemo } from 'react';
import { CASES, CaseDef } from '../content/cases';
import { groupBySimilarity, LINK_TEXT, AlgGroup } from '../content/algSimilarity';
import { makeCase } from '../content/caseState';
import { Diagram } from '../ui/Diagram';
import { MoveList } from '../ui/widgets';
import { parseAlg } from '../cube/cube';
import { Stage } from '../cube/analysis';
import type { Nav } from '../App';

const short = (c: CaseDef) => c.name.replace(' perm', '');

function title(g: AlgGroup) {
  if (g.sliceOnly) return 'Middle-slice swaps';
  if (g.members.length === 2 && g.links[0].link !== 'same') return `${short(g.members[0])} and ${short(g.members[1])}${g.links[0].ratio >= 0.95 ? ': one algorithm' : ''}`;
  return `The ${short(g.base)} family`;
}

function idea(g: AlgGroup) {
  if (g.sliceOnly) return 'Only M and U moves. Same rhythm, different U turns.';
  if (g.members.length === 2 && g.links[0].link !== 'same') {
    const l = g.links[0];
    const how = l.link === 'inverse' ? 'played backwards (reverse order, every turn the other way)' : l.link === 'mirror' ? 'done as a mirror image (left hand instead of right)' : 'mirrored and played backwards';
    if (l.ratio >= 0.95) return `${short(g.members[1])} is ${short(g.members[0])} ${how}. Learn one and you already know the other.`;
    return `${short(g.members[1])} reuses ${l.seq.length} moves of ${short(g.members[0])}, ${how}. Only the rest is new.`;
  }
  return `These algorithms share long runs of moves. Learn ${short(g.base)} first; each next one mostly reuses moves you already know.`;
}

/**
 * Cases grouped by how similar their algorithms are, in learning order,
 * with the shared moves highlighted.
 */
export function AlgGroupsView({ stage, nav }: { stage: Stage; nav: Nav }) {
  const { groups, loners } = useMemo(() => groupBySimilarity(CASES.filter((c) => c.stage === stage && c.alg)), [stage]);
  const starts = useMemo(() => Object.fromEntries(CASES.filter((c) => c.stage === stage).map((c) => [c.id, makeCase(c).start])), [stage]);
  const byId = Object.fromEntries(CASES.map((c) => [c.id, c]));
  const saved = groups.reduce((n, g) => n + g.members.length - 1, 0);
  return (
    <>
      <div className="alg-intro small muted">
        {groups.length} groups: learn {groups.length} algorithms well and {saved} more come almost for free. Coloured moves are the part a case shares with the one before it.
      </div>
      {groups.map((g) => (
        <section key={g.base.id} className="family">
          <div className="family-head">
            <span className="glyph">{g.members.length}</span>
            <div>
              <div className="family-title">{title(g)}</div>
              <div className="family-idea">{idea(g)}</div>
            </div>
          </div>
          <div className="alg-members">
            {g.members.map((c, k) => {
              const link = k === 0 ? null : g.links[k - 1];
              const n = parseAlg(c.alg).length;
              return (
                <button key={c.id} className="alg-member" onClick={() => nav.push({ name: 'lesson', caseId: c.id })}>
                  <Diagram state={starts[c.id]} stage={stage} size={48} />
                  <div className="grow">
                    <div className="alg-name">
                      <span className="step-no">{k + 1}</span>
                      <b>{c.name}</b>
                      {k === 0 && <span className="pill next-pill">learn first</span>}
                    </div>
                    <MoveList moves={parseAlg(c.alg)} highlight={link ? [link.atA, link.atA + link.seq.length] : undefined} />
                    {link && (
                      <div className="small muted">
                        {link.link === 'same'
                          ? `Shares ${link.seq.length} of its ${n} moves with ${short(byId[link.b])}`
                          : link.ratio >= 0.95
                            ? `${LINK_TEXT[link.link].replace(/^./, (x) => x.toUpperCase())} ${short(byId[link.b])}`
                            : `${link.seq.length} of its ${n} moves are ${short(byId[link.b])} ${link.link === 'inverse' ? 'backwards' : 'mirrored'}`}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {loners.length > 0 && (
        <section className="family">
          <div className="family-head">
            <span className="glyph">1</span>
            <div>
              <div className="family-title">Unique algorithms</div>
              <div className="family-idea">These don't share much with the others. Learn each one on its own.</div>
            </div>
          </div>
          <div className="alg-members">
            {loners.map((c) => (
              <button key={c.id} className="alg-member" onClick={() => nav.push({ name: 'lesson', caseId: c.id })}>
                <Diagram state={starts[c.id]} stage={stage} size={48} />
                <div className="grow">
                  <div className="alg-name"><b>{c.name}</b></div>
                  <MoveList moves={parseAlg(c.alg)} />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
