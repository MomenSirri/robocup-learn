import { useEffect, useRef } from 'react';
import { CubeView } from '../three/CubeView';

// One WebGL context for the whole app: mobile browsers only allow a few, and
// creating one per screen is slow. The canvas is moved between screens.
let shared: CubeView | null = null;
let owner: HTMLElement | null = null;

/** Hosts the shared CubeView. The cube is the hero: it fills whatever space it gets. */
export function CubeStage({ onReady, className, children }: { onReady: (v: CubeView) => void | (() => void); className?: string; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  useEffect(() => {
    const el = ref.current!;
    if (!shared) {
      shared = new CubeView(el);
      // exposed for end-to-end smoke tests
      (window as unknown as { __cube: CubeView }).__cube = shared;
    }
    else shared.attach(el);
    owner = el;
    const cleanup = onReadyRef.current(shared);
    return () => {
      if (typeof cleanup === 'function') cleanup();
      if (owner === el) {
        shared?.reset();
        owner = null;
      }
    };
  }, []);
  return (
    <div className={'cube-stage ' + (className ?? '')}>
      <div ref={ref} className="cube-canvas" />
      {children}
    </div>
  );
}
