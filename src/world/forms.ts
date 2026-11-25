/** Solid data. Lines from samples, bars from features, towers from match scores. Nothing invented. */
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import type { Trial } from '../model/trial'
import { GESTURES } from '../model/types'
import { clamp, smooth } from './math'
import { BLUE, WHITE } from './util'
const PTS = 620, TI = new THREE.Color('#7b828f'), DIM = new THREE.Color('#1b1e24'), ACC = new THREE.Color('#2f5bff')
export class Forms {
  readonly group = new THREE.Group()
  private lines: Line2[] = []; private lm = new LineMaterial({ linewidth: 2.4, vertexColors: true, transparent: true, toneMapped: false })
  private bars: THREE.InstancedMesh; private h = new Float32Array(32)
  private towers: { m: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>; h: number }[] = []
  private level: THREE.Mesh
  private M = new THREE.Matrix4(); private Q = new THREE.Quaternion(); private P = new THREE.Vector3(); private S = new THREE.Vector3(); private C = new THREE.Color()
  constructor() {
    for (let i = 0; i < 8; i++) { const l = new Line2(new LineGeometry(), this.lm); l.frustumCulled = false; l.renderOrder = 4; this.lines.push(l); this.group.add(l) }
    const box = new RoundedBoxGeometry(0.88, 1, 0.98, 4, 0.05); box.translate(0, 0.5, 0)
    this.bars = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0.65, envMapIntensity: 1.3 }), 32); this.bars.frustumCulled = false; this.group.add(this.bars)
    for (let i = 0; i < 4; i++) { const g = new RoundedBoxGeometry(1.3, 1, 1.3, 5, 0.06); g.translate(0, 0.5, 0); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ roughness: 0.16, metalness: 0.6, envMapIntensity: 1.4 })); m.position.set((i - 1.5) * 2.3, -2.1, 0); this.towers.push({ m, h: 0.1 }); this.group.add(m) }
    this.level = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false })); this.group.add(this.level)
  }
  size(w: number, h: number) { this.lm.resolution.set(w, h) }
  write(t: Trial, threshold: number) {
    const D = t.decision
    this.lines.forEach((l, ch) => {
      const raw = D.filtered[ch], env = D.envelope[ch], p: number[] = [], c: number[] = []
      for (let i = 0; i < PTS; i++) { const k = Math.floor((i / (PTS - 1)) * (raw.length - 1)), e = clamp((env[k] - 0.08) * 1.1); p.push(-4.4 + (i / (PTS - 1)) * 9.2, (3.5 - ch) * 0.66 + clamp(raw[k], -2.6, 2.6) * 0.27, 0); this.C.copy(BLUE).multiplyScalar(1.25).lerp(WHITE, e); c.push(this.C.r, this.C.g, this.C.b) }
      l.geometry.setPositions(p); l.geometry.setColors(c)
    })
    for (let i = 0; i < 32; i++) { const v = D.features[i]; this.h[i] = 0.06 + v * 1.15; this.C.set('#0e1014').lerp(TI, clamp(v / 1.1)).lerp(WHITE, smooth(1.1, 2.2, v)); this.bars.setColorAt(i, this.C) }
    this.bars.instanceColor!.needsUpdate = true
    GESTURES.forEach((g, i) => { const win = g === D.ranked[0], o = this.towers[i]; o.h = 0.06 + D.scores[g] * 4.2; o.m.material.color.copy(win && D.event ? ACC : win ? WHITE : DIM); o.m.material.emissive.copy(o.m.material.color).multiplyScalar(win ? 0.16 : 0.05) })
    this.level.position.set(0, threshold * 4.2 - 2.1, 0)
  }
  update(wv: number, tr: number, tw: number, play: number) {
    const on = wv > 0.01
    this.lines.forEach((l, i) => { l.visible = on; l.scale.y = 1; l.position.y = 0; l.geometry.instanceCount = Math.max(1, Math.floor((PTS - 1) * Math.min(play, smooth(i * 0.05, 0.55 + i * 0.05, wv)))) })
    this.lm.opacity = smooth(0.3, 0.9, wv)
    this.bars.visible = tr > 0.01
    if (tr > 0.01) { for (let i = 0; i < 32; i++) { const c = Math.floor(i / 4), w = i % 4, d = (c * 0.6 + w) * 0.055, g = smooth(d, d + 0.5, tr); this.P.set((c - 3.5) * 1.02, -1.4, (w - 1.5) * 1.12); this.S.set(g, Math.max(0.001, this.h[i] * g), g); this.M.compose(this.P, this.Q, this.S); this.bars.setMatrixAt(i, this.M) } this.bars.instanceMatrix.needsUpdate = true }
    this.towers.forEach((o, i) => { const g = smooth(i * 0.1, i * 0.1 + 0.6, tw); o.m.visible = g > 0.01; o.m.scale.set(g, Math.max(0.001, o.h * g), g) })
    this.level.visible = tw > 0.5; (this.level.material as THREE.MeshBasicMaterial).opacity = 0.16 * smooth(0.6, 1, tw)
  }
}
