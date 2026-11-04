import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  CUBIES, CUBIE_BY_ID, CubeState, Move, MoveBase, MOVE_DEFS, Mat, Vec, Face,
  applyMove, layerMembers, quarterTurns, solvedState, frame,
} from '../cube/cube';

export const COLORS: Record<Face, number> = {
  U: 0xffd23f,
  D: 0xf5f5f0,
  F: 0x15b85a,
  B: 0x2563eb,
  R: 0xe0303d,
  L: 0xff7a1a,
};
const GREY = 0x3b4150;
const BODY = 0x0d0f14;

export type StickerFn = (cubieId: string, colour: Face) => 'color' | 'grey';

interface StickerObj {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  face: Face;
}

interface CubieObj {
  group: THREE.Group;
  stickers: StickerObj[];
  body: THREE.Mesh;
  bodyMat: THREE.MeshStandardMaterial;
}

export interface PathSpec {
  segments: Vec[][];
  color: number;
}

function mat4(m: Mat): THREE.Matrix4 {
  return new THREE.Matrix4().set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);
}

function roundedRect(size: number, r: number) {
  const s = size / 2;
  const sh = new THREE.Shape();
  sh.moveTo(-s + r, -s);
  sh.lineTo(s - r, -s);
  sh.quadraticCurveTo(s, -s, s, -s + r);
  sh.lineTo(s, s - r);
  sh.quadraticCurveTo(s, s, s - r, s);
  sh.lineTo(-s + r, s);
  sh.quadraticCurveTo(-s, s, -s, s - r);
  sh.lineTo(-s, -s + r);
  sh.quadraticCurveTo(-s, -s, -s + r, -s);
  return new THREE.ShapeGeometry(sh, 4);
}

const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];

export class CubeView {
  el: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private root = new THREE.Group();
  private cubies: CubieObj[] = [];
  private overlay = new THREE.Group();
  private ghostGroup = new THREE.Group();
  private arrowGroup = new THREE.Group();
  private raf = 0;
  private disposed = false;
  private resizeObs: ResizeObserver;

  state: CubeState = solvedState();
  private mask: StickerFn = () => 'color';
  private focus: Set<string> | null = null;
  private highlight = new Set<string>();
  private queue: Promise<void> = Promise.resolve();
  private animating: { ids: number[]; axis: number; angle: number; t0: number; dur: number; resolve: () => void; move: Move } | null = null;

  // camera orbit
  private azimuth = 0.62;
  private elevation = 0.5;
  private targetAz = 0.62;
  private targetEl = 0.5;
  private radius = 11.5;

  inputEnabled = true;
  onUserMove: ((m: Move) => void) | null = null;
  /** called when the user starts interacting (used to dismiss hints etc.) */
  onTouch: (() => void) | null = null;

  constructor(el: HTMLElement) {
    this.el = el;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.style.display = 'block';

    this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(4, 8, 6);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x93c5fd, 0.6);
    rim.position.set(-6, -2, -5);
    this.scene.add(rim);

    this.scene.add(this.root);
    this.root.add(this.overlay);
    this.root.add(this.ghostGroup);
    this.root.add(this.arrowGroup);
    this.build();
    this.applyState();

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(el);
    this.resize();
    this.bindInput();
    const loop = (t: number) => {
      if (this.disposed) return;
      this.tick(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------ build

  private build() {
    const body = new RoundedBoxGeometry(0.97, 0.97, 0.97, 3, 0.1);
    const sticker = roundedRect(0.82, 0.12);
    for (const c of CUBIES) {
      const group = new THREE.Group();
      group.matrixAutoUpdate = false;
      const bodyMat = new THREE.MeshStandardMaterial({ color: BODY, roughness: 0.55, metalness: 0.1 });
      const bodyMesh = new THREE.Mesh(body, bodyMat);
      bodyMesh.position.set(...c.home);
      bodyMesh.userData.cubie = c.index;
      group.add(bodyMesh);
      const stickers: StickerObj[] = [];
      for (const st of c.stickers) {
        const mat = new THREE.MeshStandardMaterial({ color: COLORS[st.face], roughness: 0.32, metalness: 0.0, emissive: 0x000000 });
        const m = new THREE.Mesh(sticker, mat);
        const n = new THREE.Vector3(...st.normal);
        m.position.set(c.home[0] + n.x * 0.487, c.home[1] + n.y * 0.487, c.home[2] + n.z * 0.487);
        m.lookAt(m.position.clone().add(n));
        m.userData.cubie = c.index;
        group.add(m);
        stickers.push({ mesh: m, mat, face: st.face });
      }
      this.root.add(group);
      this.cubies.push({ group, stickers, body: bodyMesh, bodyMat });
    }
  }

  // ------------------------------------------------------------ state & looks

  setState(s: CubeState) {
    this.state = s;
    this.applyState();
  }

  private applyState() {
    this.cubies.forEach((o, i) => {
      o.group.matrix.copy(mat4(this.state[i]));
      o.group.matrixWorldNeedsUpdate = true;
    });
  }

  setMask(fn: StickerFn) {
    this.mask = fn;
    this.refreshLooks();
  }
  setFocus(ids: string[] | null) {
    this.focus = ids ? new Set(ids) : null;
    this.refreshLooks();
  }
  setHighlight(ids: string[]) {
    this.highlight = new Set(ids);
    this.refreshLooks();
  }

  private refreshLooks() {
    CUBIES.forEach((c, i) => {
      const o = this.cubies[i];
      const dim = this.focus && !this.focus.has(c.id) && c.kind !== 'center';
      for (const st of o.stickers) {
        const mode = this.mask(c.id, st.face);
        const col = new THREE.Color(mode === 'grey' ? GREY : COLORS[st.face]);
        if (dim) col.multiplyScalar(0.28);
        st.mat.color.copy(col);
        st.mat.emissive.setHex(0);
      }
      o.bodyMat.color.setHex(BODY);
      o.bodyMat.emissive.setHex(0);
    });
  }

  // ------------------------------------------------------------ ghosts (target positions)

  setGhosts(ids: string[] | null) {
    this.ghostGroup.clear();
    if (!ids) return;
    const fr = frame(this.state);
    const box = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.06, 1.06, 1.06));
    for (const id of ids) {
      const c = CUBIE_BY_ID[id];
      const g = new THREE.Group();
      g.matrixAutoUpdate = false;
      g.matrix.copy(mat4(fr));
      const lines = new THREE.LineSegments(box, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
      lines.position.set(...c.home);
      g.add(lines);
      for (const st of c.stickers) {
        const m = new THREE.Mesh(roundedRect(0.7, 0.1), new THREE.MeshBasicMaterial({ color: COLORS[st.face], transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
        const n = new THREE.Vector3(...st.normal);
        m.position.set(c.home[0] + n.x * 0.56, c.home[1] + n.y * 0.56, c.home[2] + n.z * 0.56);
        m.lookAt(m.position.clone().add(n));
        g.add(m);
      }
      g.userData.pulse = true;
      this.ghostGroup.add(g);
    }
  }

  // ------------------------------------------------------------ paths

  /**
   * Draw where key pieces travel. The segment of the next move is bright,
   * what already happened is faint, and the rest of the journey is a hint.
   */
  setPaths(paths: PathSpec[], progress = 0) {
    this.overlay.clear();
    const scale = 1.58;
    for (const p of paths) {
      const done: THREE.Vector3[] = [];
      const now: THREE.Vector3[] = [];
      const later: THREE.Vector3[] = [];
      p.segments.forEach((seg, i) => {
        const pts = seg.map((v) => new THREE.Vector3(v[0], v[1], v[2]).multiplyScalar(scale));
        (i < progress ? done : i === progress ? now : later).push(...pts);
      });
      if (done.length && now.length) now.unshift(done[done.length - 1]);
      const tail = now.length ? now : done;
      if (tail.length && later.length) later.unshift(tail[tail.length - 1]);
      const addTube = (pts: THREE.Vector3[], opacity: number, radius: number) => {
        const uniq = pts.filter((v, k) => k === 0 || v.distanceTo(pts[k - 1]) > 1e-4);
        if (uniq.length < 2) return;
        const curve = new THREE.CatmullRomCurve3(uniq, false, 'catmullrom', 0.1);
        const tube = new THREE.TubeGeometry(curve, Math.max(8, uniq.length * 3), radius, 6, false);
        this.overlay.add(new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity })));
      };
      addTube(done, 0.3, 0.03);
      addTube(later, 0.22, 0.025);
      addTube(now, 1, 0.06);
      // the piece's current location and its final destination
      const here = (now[0] ?? tail[tail.length - 1]) as THREE.Vector3 | undefined;
      const all = [...done, ...now, ...later];
      const dest = all[all.length - 1];
      if (here) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshBasicMaterial({ color: p.color }));
        s.position.copy(here);
        this.overlay.add(s);
      }
      if (dest && (!here || dest.distanceTo(here) > 1e-3)) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 24), new THREE.MeshBasicMaterial({ color: p.color }));
        ring.position.copy(dest);
        ring.lookAt(dest.clone().multiplyScalar(2));
        this.overlay.add(ring);
      }
    }
  }

  // ------------------------------------------------------------ move arrows

  showMoveArrow(m: Move | null) {
    this.arrowGroup.clear();
    if (!m) return;
    const def = MOVE_DEFS[m.base];
    const axis = AXES[def.axis];
    const layerC = def.layers.reduce((a, b) => a + b, 0) / def.layers.length;
    const q = quarterTurns(m);
    const r = 1.95;
    // choose arc centred on the camera-facing side
    const camDir = this.camera.position.clone().normalize();
    const u = AXES[(def.axis + 1) % 3];
    const v = AXES[(def.axis + 2) % 3];
    const ang0 = Math.atan2(camDir.dot(v), camDir.dot(u));
    const span = (Math.abs(q) === 2 ? 2.4 : 1.35) * Math.sign(q);
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 24; k++) {
      const a = ang0 - span / 2 + (span * k) / 24;
      pts.push(axis.clone().multiplyScalar(layerC * (def.layers.length === 3 ? 0 : 1.02)).add(u.clone().multiplyScalar(Math.cos(a) * r)).add(v.clone().multiplyScalar(Math.sin(a) * r)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.06, 8, false), mat);
    tube.renderOrder = 10;
    this.arrowGroup.add(tube);
    const end = pts[pts.length - 1];
    const tangent = curve.getTangent(1);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.4, 16), mat);
    cone.position.copy(end);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    cone.renderOrder = 10;
    this.arrowGroup.add(cone);
    this.arrowGroup.userData.pulse = true;
  }

  // ------------------------------------------------------------ animation

  /** Queue an animated move. Resolves when finished. */
  animate(m: Move, ms = 260): Promise<void> {
    this.queue = this.queue.then(
      () =>
        new Promise<void>((resolve) => {
          if (this.disposed) return resolve();
          if (ms <= 0) {
            this.setState(applyMove(this.state, m));
            return resolve();
          }
          const def = MOVE_DEFS[m.base];
          this.animating = {
            ids: layerMembers(this.state, m),
            axis: def.axis,
            angle: (quarterTurns(m) * Math.PI) / 2,
            t0: performance.now(),
            dur: ms * (Math.abs(quarterTurns(m)) === 2 ? 1.5 : 1),
            resolve,
            move: m,
          };
        }),
    );
    return this.queue;
  }

  get busy() {
    return this.animating !== null;
  }

  /** Cancel queued animations and jump to state. */
  jump(s: CubeState) {
    if (this.animating) {
      const a = this.animating;
      this.animating = null;
      a.resolve();
    }
    this.queue = Promise.resolve();
    this.setState(s);
  }

  private tick(t: number) {
    // orbit easing
    this.azimuth += (this.targetAz - this.azimuth) * 0.2;
    this.elevation += (this.targetEl - this.elevation) * 0.2;
    const ce = Math.cos(this.elevation);
    this.camera.position.set(Math.sin(this.azimuth) * ce * this.radius, Math.sin(this.elevation) * this.radius, Math.cos(this.azimuth) * ce * this.radius);
    this.camera.lookAt(0, 0, 0);

    if (this.animating) {
      const a = this.animating;
      const k = Math.min(1, (t - a.t0) / a.dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const rot = new THREE.Matrix4().makeRotationAxis(AXES[a.axis], a.angle * e);
      for (const i of a.ids) {
        const o = this.cubies[i];
        o.group.matrix.copy(rot).multiply(mat4(this.state[i]));
        o.group.matrixWorldNeedsUpdate = true;
        for (const st of o.stickers) st.mat.emissive.setHex(0x1a1a1a);
      }
      if (k >= 1) {
        for (const i of a.ids) for (const st of this.cubies[i].stickers) st.mat.emissive.setHex(0);
        this.animating = null;
        this.setState(applyMove(this.state, a.move));
        a.resolve();
      }
    }

    // pulses
    const pulse = 0.5 + 0.5 * Math.sin(t / 220);
    if (this.highlight.size) {
      CUBIES.forEach((c, i) => {
        if (!this.highlight.has(c.id)) return;
        const o = this.cubies[i];
        o.bodyMat.emissive.setRGB(0.16 * pulse + 0.05, 0.16 * pulse + 0.05, 0.2 * pulse + 0.07);
        for (const st of o.stickers) if (!this.animating) st.mat.emissive.setRGB(0.12 * pulse, 0.12 * pulse, 0.12 * pulse);
      });
    }
    this.ghostGroup.children.forEach((g) => {
      g.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (m && 'opacity' in m) (m as THREE.MeshBasicMaterial).opacity = 0.35 + 0.5 * pulse;
      });
    });
    if (this.arrowGroup.children.length) {
      const s = 1 + 0.04 * pulse;
      this.arrowGroup.scale.set(s, s, s);
    }
    this.renderer.render(this.scene, this.camera);
  }

  private resize() {
    const w = this.el.clientWidth || 1;
    const h = this.el.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px';
    this.renderer.domElement.style.height = h + 'px';
    this.camera.aspect = w / h;
    // fit the cube (plus a margin for arrows) in both directions
    const half = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.radius = 2.75 / (half * Math.min(1, w / h));
    this.camera.updateProjectionMatrix();
    // resizing clears the drawing buffer: draw immediately to avoid a blank frame
    this.renderer.render(this.scene, this.camera);
  }

  /** Move the (single, shared) canvas into another container and reset everything. */
  attach(el: HTMLElement) {
    this.el = el;
    el.appendChild(this.renderer.domElement);
    this.resizeObs.disconnect();
    this.resizeObs.observe(el);
    this.resize();
    this.reset();
  }

  /** Back to a neutral solved cube with no overlays or callbacks. */
  reset() {
    this.jump(solvedState());
    this.mask = () => 'color';
    this.focus = null;
    this.highlight = new Set();
    this.refreshLooks();
    this.setGhosts(null);
    this.setPaths([]);
    this.showMoveArrow(null);
    this.onUserMove = null;
    this.onTouch = null;
    this.inputEnabled = true;
    this.targetAz = this.azimuth = 0.62;
    this.targetEl = this.elevation = 0.5;
  }

  resetView() {
    this.targetAz = 0.62;
    this.targetEl = 0.5;
  }

  /** Rotate the camera to look at a given side (e.g. to show the back face). */
  orbitBy(dAz: number, dEl = 0) {
    this.targetAz += dAz;
    this.targetEl = Math.max(-1.3, Math.min(1.3, this.targetEl + dEl));
  }

  // ------------------------------------------------------------ input

  private bindInput() {
    const el = this.renderer.domElement;
    const ray = new THREE.Raycaster();
    let start: { x: number; y: number; hit: THREE.Intersection | null; id: number } | null = null;
    let last = { x: 0, y: 0 };
    let decided = false;

    const ndc = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };

    el.addEventListener('pointerdown', (e) => {
      if (start) return; // single pointer only
      this.onTouch?.();
      el.setPointerCapture(e.pointerId);
      ray.setFromCamera(ndc(e), this.camera);
      const objs = this.cubies.flatMap((o) => [o.body, ...o.stickers.map((s) => s.mesh)]);
      const hits = ray.intersectObjects(objs, false);
      start = { x: e.clientX, y: e.clientY, hit: this.inputEnabled ? hits[0] ?? null : null, id: e.pointerId };
      last = { x: e.clientX, y: e.clientY };
      decided = false;
    });

    el.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (start.hit) {
        if (!decided && Math.hypot(dx, dy) > 14) {
          decided = true;
          const m = this.gestureMove(start.hit, dx, dy);
          if (m && this.onUserMove) this.onUserMove(m);
        }
      } else {
        this.targetAz -= (e.clientX - last.x) * 0.0105;
        this.targetEl = Math.max(-1.3, Math.min(1.3, this.targetEl + (e.clientY - last.y) * 0.0105));
        this.azimuth = this.targetAz;
        this.elevation = this.targetEl;
      }
      last = { x: e.clientX, y: e.clientY };
    });

    const end = (e: PointerEvent) => {
      if (start && e.pointerId === start.id) start = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  private project(v: THREE.Vector3) {
    const p = v.clone().project(this.camera);
    return new THREE.Vector2(p.x * this.el.clientWidth, -p.y * this.el.clientHeight);
  }

  /** Turn a swipe on a sticker into a move. */
  private gestureMove(hit: THREE.Intersection, dx: number, dy: number): Move | null {
    if (!hit.face) return null;
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const ax = [Math.abs(normal.x), Math.abs(normal.y), Math.abs(normal.z)];
    const ni = ax.indexOf(Math.max(...ax));
    const n = new THREE.Vector3();
    n.setComponent(ni, Math.sign(normal.getComponent(ni)));
    const point = hit.point.clone();
    const drag = new THREE.Vector2(dx, dy).normalize();
    const p0 = this.project(point);
    let best: { axis: number; sign: number; score: number } | null = null;
    for (let a = 0; a < 3; a++) {
      if (a === ni) continue;
      const d = this.project(point.clone().add(AXES[a].clone().multiplyScalar(0.5))).sub(p0).normalize();
      const s = d.dot(drag);
      if (!best || Math.abs(s) > Math.abs(best.score)) best = { axis: a, sign: Math.sign(s), score: s };
    }
    if (!best) return null;
    const dir = AXES[best.axis].clone().multiplyScalar(best.sign);
    const w = new THREE.Vector3().crossVectors(n, dir); // rotation axis (+90° about w moves the sticker along dir)
    const wa = [Math.abs(w.x), Math.abs(w.y), Math.abs(w.z)];
    const axis = wa.indexOf(Math.max(...wa));
    const q = Math.sign(w.getComponent(axis));
    const cubieIdx = hit.object.userData.cubie as number;
    const pos = new THREE.Vector3(...CUBIES[cubieIdx].home).applyMatrix4(this.cubies[cubieIdx].group.matrix);
    const layer = Math.round(pos.getComponent(axis));
    const candidates: MoveBase[] = (['R', 'L', 'M', 'U', 'D', 'E', 'F', 'B', 'S'] as MoveBase[]).filter((b) => MOVE_DEFS[b].axis === axis && MOVE_DEFS[b].layers.length === 1 && MOVE_DEFS[b].layers[0] === layer);
    const base = candidates[0];
    if (!base) return null;
    const amount = (q / MOVE_DEFS[base].dir) as 1 | -1;
    return { base, amount };
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
