import { useCallback, useMemo, useState } from 'react';
import { Home } from './screens/Home';
import { StageMap } from './screens/StageMap';
import { Lesson } from './screens/Lesson';
import { Trainer } from './screens/Trainer';
import { Discover } from './screens/Discover';
import { Stats } from './screens/Stats';
import { Stage } from './cube/analysis';

export type Route =
  | { name: 'home' }
  | { name: 'stage'; stage: Stage }
  | { name: 'lesson'; caseId: string }
  | { name: 'train' }
  | { name: 'discover'; caseId?: string }
  | { name: 'stats' };

export type Tab = 'learn' | 'train' | 'discover' | 'stats';

export interface Nav {
  push: (r: Route) => void;
  replace: (r: Route) => void;
  back: () => void;
  tab: (t: Tab) => void;
  canBack: boolean;
}

const ROOT: Record<Tab, Route> = {
  learn: { name: 'home' },
  train: { name: 'train' },
  discover: { name: 'discover' },
  stats: { name: 'stats' },
};

export function App() {
  const [tab, setTab] = useState<Tab>('learn');
  const [stacks, setStacks] = useState<Record<Tab, Route[]>>({ learn: [ROOT.learn], train: [ROOT.train], discover: [ROOT.discover], stats: [ROOT.stats] });
  const stack = stacks[tab];
  const route = stack[stack.length - 1];

  const push = useCallback((r: Route) => setStacks((s) => ({ ...s, [tab]: [...s[tab], r] })), [tab]);
  const replace = useCallback((r: Route) => setStacks((s) => ({ ...s, [tab]: [...s[tab].slice(0, -1), r] })), [tab]);
  const back = useCallback(() => setStacks((s) => ({ ...s, [tab]: s[tab].length > 1 ? s[tab].slice(0, -1) : s[tab] })), [tab]);
  const nav: Nav = useMemo(() => ({ push, replace, back, tab: setTab, canBack: stack.length > 1 }), [push, replace, back, stack.length]);

  const key = tab + ':' + stack.length + ':' + JSON.stringify(route);
  let screen: React.ReactNode;
  switch (route.name) {
    case 'home': screen = <Home nav={nav} />; break;
    case 'stage': screen = <StageMap stage={route.stage} nav={nav} />; break;
    case 'lesson': screen = <Lesson caseId={route.caseId} nav={nav} />; break;
    case 'train': screen = <Trainer nav={nav} />; break;
    case 'discover': screen = <Discover nav={nav} caseId={route.caseId} />; break;
    case 'stats': screen = <Stats nav={nav} />; break;
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'learn', label: 'Learn', icon: '◈' },
    { id: 'train', label: 'Train', icon: '◎' },
    { id: 'discover', label: 'Discover', icon: '✦' },
    { id: 'stats', label: 'Progress', icon: '▤' },
  ];

  return (
    <div className="app">
      <main key={key} className="main">{screen}</main>
      <nav className="tabbar">
        {tabs.map((t) => (
          <button key={t.id} className={t.id === tab ? 'on' : ''} onClick={() => (t.id === tab ? setStacks((s) => ({ ...s, [t.id]: [ROOT[t.id]] })) : setTab(t.id))}>
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
