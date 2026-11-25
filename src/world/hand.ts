import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export const S = 20
/** Model space (fingers -Y, palm -X, thumb -Z) to arm space (fingers +X, thumb +Y, back of hand +Z). */
const ORIGIN = new THREE.Vector3(0.039, 0.066, 0.0105)
export const TO_ARM = new THREE.Matrix4().set(0, -S, 0, S * ORIGIN.y, 0, 0, -S, S * ORIGIN.z, S, 0, 0, -S * ORIGIN.x, 0, 0, 0, 1)

/** One round of Loop subdivision that carries skin weights, so close-ups stay smooth. */
function subdivide(pos: number[][], wts: Float32Array[], tris: number[][]) {
  const key = (a: number, b: number) => (a < b ? a * 1e5 + b : b * 1e5 + a)
  const edges = new Map<number, { a: number; b: number; opp: number[]; id: number }>()
  const nb: Set<number>[] = pos.map(() => new Set())
  for (const t of tris) for (let i = 0; i < 3; i++) {
    const a = t[i], b = t[(i + 1) % 3], c = t[(i + 2) % 3], k = key(a, b)
    if (!edges.has(k)) edges.set(k, { a, b, opp: [], id: 0 })
    edges.get(k)!.opp.push(c); nb[a].add(b); nb[b].add(a)
  }
  const bound = new Set<number>()
  edges.forEach((e) => { if (e.opp.length === 1) { bound.add(e.a); bound.add(e.b) } })
  const mix = (parts: [number, number][]) => {
    const p = [0, 0, 0], w = new Float32Array(25)
    for (const [i, k] of parts) { for (let d = 0; d < 3; d++) p[d] += pos[i][d] * k; for (let j = 0; j < 25; j++) w[j] += wts[i][j] * k }
    return { p, w }
  }
  const np: number[][] = [], nw: Float32Array[] = []
  pos.forEach((_, i) => {
    let parts: [number, number][]
    if (bound.has(i)) {
      const bn = [...nb[i]].filter((j) => edges.get(key(i, j))!.opp.length === 1).slice(0, 2)
      parts = [[i, 0.75], ...bn.map((j) => [j, 0.25 / bn.length] as [number, number])]
    } else {
      const n = nb[i].size, be = n === 3 ? 3 / 16 : 3 / (8 * n)
      parts = [[i, 1 - n * be], ...[...nb[i]].map((j) => [j, be] as [number, number])]
    }
    const m = mix(parts); np.push(m.p); nw.push(m.w)
  })
  edges.forEach((e) => {
    e.id = np.length
    const m = mix(e.opp.length === 2 ? [[e.a, 0.375], [e.b, 0.375], [e.opp[0], 0.125], [e.opp[1], 0.125]] : [[e.a, 0.5], [e.b, 0.5]])
    np.push(m.p); nw.push(m.w)
  })
  const nt: number[][] = []
  for (const [a, b, c] of tris) {
    const ab = edges.get(key(a, b))!.id, bc = edges.get(key(b, c))!.id, ca = edges.get(key(c, a))!.id
    nt.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca])
  }
  return { pos: np, wts: nw, tris: nt }
}

function refine(src: THREE.BufferGeometry, rounds: number) {
  const P = src.getAttribute('position'), J = src.getAttribute('skinIndex'), W = src.getAttribute('skinWeight'), I = src.index!
  const map = new Map<string, number>(), remap: number[] = [], pos: number[][] = [], wts: Float32Array[] = []
  for (let i = 0; i < P.count; i++) {
    const k = [P.getX(i), P.getY(i), P.getZ(i)].map((v) => Math.round(v * 2e5)).join()
    let id = map.get(k)
    if (id === undefined) {
      id = pos.length; map.set(k, id); pos.push([P.getX(i), P.getY(i), P.getZ(i)])
      const w = new Float32Array(25)
      for (let c = 0; c < 4; c++) w[J.getComponent(i, c)] += W.getComponent(i, c)
      wts.push(w)
    }
    remap.push(id)
  }
  const tris: number[][] = []
  for (let i = 0; i < I.count; i += 3) {
    const t = [remap[I.getX(i)], remap[I.getX(i + 1)], remap[I.getX(i + 2)]]
    if (t[0] !== t[1] && t[1] !== t[2] && t[2] !== t[0]) tris.push(t)
  }
  let m = { pos, wts, tris }
  for (let r = 0; r < rounds; r++) m = subdivide(m.pos, m.wts, m.tris)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(m.pos.flat(), 3))
  const si: number[] = [], sw: number[] = []
  for (const w of m.wts) {
    const o = Array.from(w).map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 4)
    const s = o.reduce((x, y) => x + y[0], 0)
    o.forEach(([v, i]) => { si.push(i); sw.push(v / s) })
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4))
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4))
  g.setIndex(m.tris.flat())
  g.computeVertexNormals()
  // Subdivision shrinks thin forms: give the fingers their volume back.
  const pa = g.getAttribute('position'), na = g.getAttribute('normal')
  for (let i = 0; i < pa.count; i++) {
    const y = pa.getY(i), k = 0.0006 + 0.0005 * Math.max(0, Math.min(1, (0.0 - y) / 0.06))
    pa.setXYZ(i, pa.getX(i) + na.getX(i) * k, y + na.getY(i) * k, pa.getZ(i) + na.getZ(i) * k)
  }
  g.computeVertexNormals()
  return g
}

type Pose = Record<string, [number, number, number]> // degrees about model Z (flex), X (spread), Y (twist)
const FINGERS = ['index-finger', 'middle-finger', 'ring-finger', 'pinky-finger']
const curl = (a: number, b: number, c: number, name: string, spread = 0): Pose => ({
  [`${name}-phalanx-proximal`]: [-a, spread, 0], [`${name}-phalanx-intermediate`]: [-b, 0, 0], [`${name}-phalanx-distal`]: [-c, 0, 0],
})
const relaxed: Pose = { ...curl(16, 20, 12, 'index-finger', 2), ...curl(22, 26, 16, 'middle-finger', 0), ...curl(27, 30, 18, 'ring-finger', -1), ...curl(30, 32, 20, 'pinky-finger', -4) }
const fist: Pose = { ...curl(38, 62, 34, 'index-finger', 0), ...curl(52, 74, 40, 'middle-finger', 0), ...curl(60, 78, 42, 'ring-finger', 0), ...curl(64, 78, 42, 'pinky-finger', -2) }
const pinchFingers: Pose = { ...curl(40, 48, 26, 'index-finger', 0), ...curl(26, 28, 16, 'middle-finger', 0), ...curl(21, 24, 14, 'ring-finger', -2), ...curl(18, 22, 14, 'pinky-finger', -6) }

export class Hand {
  readonly group = new THREE.Group()
  private bones = new Map<string, THREE.Bone>()
  private restLocal = new Map<string, THREE.Quaternion>()
  private parentRest = new Map<string, THREE.Quaternion>()
  poses: Record<string, Pose> = {}
  mix: Record<string, number> = { relaxed: 1, pinch: 0, fist: 0, tl: 0, tr: 0 }

  async load(rounds = 2) {
    const gltf = await new GLTFLoader().loadAsync('models/hand.glb')
    let mesh!: THREE.SkinnedMesh
    gltf.scene.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) mesh = o as THREE.SkinnedMesh })
    gltf.scene.updateMatrixWorld(true)
    const geo = refine(mesh.geometry, rounds)
    const skel = mesh.skeleton
    const inner = new THREE.Group()
    inner.matrixAutoUpdate = false
    inner.matrix.copy(TO_ARM)
    skel.bones.forEach((b) => { this.bones.set(b.name.replace(/\./g, ''), b); inner.add(b) })
    inner.updateMatrixWorld(true)
    const wrist = this.bones.get('wrist')!
    const chain = (names: string[]) => names.reduce((p, n) => { const b = this.bones.get(n)!; p.attach(b); return b }, wrist)
    chain(['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'])
    for (const f of FINGERS) chain([`${f}-metacarpal`, `${f}-phalanx-proximal`, `${f}-phalanx-intermediate`, `${f}-phalanx-distal`, `${f}-tip`])
    // rest orientation in model space
    const q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), inv = TO_ARM.clone().invert(), tmp = new THREE.Matrix4()
    inner.updateMatrixWorld(true)
    this.bones.forEach((b, n) => {
      this.restLocal.set(n, b.quaternion.clone())
      const par = b.parent === inner ? new THREE.Matrix4() : tmp.copy(inner.matrixWorld).invert().multiply(b.parent!.matrixWorld).clone()
      par.decompose(p, q, s); this.parentRest.set(n, q.clone())
    })
    void inv
    this.geometry = geo; this.skeleton = skel; this.inner = inner
    this.group.add(inner)
    this.solvePoses()
    this.apply()
  }
  private inner!: THREE.Group
  geometry!: THREE.BufferGeometry
  skeleton!: THREE.Skeleton
  readonly mats = Array.from({ length: 25 }, () => new THREE.Matrix4())
  private t = new THREE.Matrix4()
  /** Bone matrices in model space, for the swarm's own skinning. */
  updateMats() {
    this.t.copy(this.inner.matrixWorld).invert()
    this.skeleton.bones.forEach((b, i) => this.mats[i].copy(this.t).multiply(b.matrixWorld).multiply(this.skeleton.boneInverses[i]))
  }
  tip(n: string, out: THREE.Vector3) { return out.setFromMatrixPosition(this.bones.get(n)!.matrixWorld) }

  private setBone(n: string, e: [number, number, number]) {
    const b = this.bones.get(n); if (!b) return
    const P = this.parentRest.get(n)!, R = new THREE.Quaternion().setFromEuler(new THREE.Euler((e[1] * Math.PI) / 180, (e[2] * Math.PI) / 180, (e[0] * Math.PI) / 180, 'ZXY'))
    b.quaternion.copy(P).invert().multiply(R).multiply(P).multiply(this.restLocal.get(n)!)
  }
  private local(n: string) {
    const v = new THREE.Vector3().setFromMatrixPosition(this.bones.get(n)!.matrixWorld)
    return this.inner.worldToLocal(v)
  }
  private applyPose(p: Pose) {
    this.bones.forEach((_, n) => this.setBone(n, p[n] ?? [0, 0, 0]))
    this.inner.updateMatrixWorld(true)
  }
  /** Finds thumb (and index) angles that actually touch, by coordinate descent on tip distance. */
  private solve(base: Pose, free: [string, number, number, number][], cost: () => number): Pose {
    const pose: Pose = JSON.parse(JSON.stringify(base))
    for (const [b] of free) pose[b] ??= [0, 0, 0]
    const start = free.map(([b, a]) => pose[b][a])
    const total = () => { this.applyPose(pose); return cost() * 1e4 + free.reduce((s, [b, a], i) => s + ((pose[b][a] - start[i]) / 55) ** 2 * 0.05, 0) }
    let best = total()
    for (let step = 16; step > 0.6; step *= 0.6)
      for (let it = 0; it < 3; it++)
        for (const [b, a, lo, hi] of free)
          for (const d of [step, -step]) {
            const old = pose[b][a]
            pose[b][a] = Math.max(lo, Math.min(hi, old + d))
            const c = total()
            if (c < best) best = c; else pose[b][a] = old
          }
    return pose
  }
  private solvePoses() {
    const thumb: [string, number, number, number][] = [
      ['thumb-metacarpal', 0, -40, 25], ['thumb-metacarpal', 1, -35, 35], ['thumb-metacarpal', 2, -35, 35],
      ['thumb-phalanx-proximal', 0, -30, 20], ['thumb-phalanx-proximal', 1, -40, 40], ['thumb-phalanx-distal', 1, -45, 45],
    ]
    const near = (a: string, target: () => THREE.Vector3, gap: number) => () => (this.local(a).distanceTo(target()) - gap) ** 2
    const index: [string, number, number, number][] = [['index-finger-phalanx-proximal', 0, -70, -10], ['index-finger-phalanx-intermediate', 0, -75, -20], ['index-finger-phalanx-distal', 0, -45, -8]]
    const pinch = this.solve(pinchFingers, [...thumb, ...index], near('thumb-tip', () => this.local('index-finger-tip'), 0.0105))
    const along = (k: number) => () => {
      const a = this.local('index-finger-phalanx-proximal'), b = this.local('index-finger-phalanx-intermediate')
      return a.lerp(b, k).add(new THREE.Vector3(-0.007, 0, -0.017))
    }
    const mid = this.solve(fist, thumb, near('thumb-tip', along(0.75), 0.004))
    this.poses = {
      relaxed: { ...relaxed, 'thumb-phalanx-distal': [0, 6, 0] }, pinch, fist: mid,
      tl: this.solve(mid, thumb, near('thumb-tip', along(0.5), 0.006)),
      tr: this.solve(mid, thumb, near('thumb-tip', along(1.25), 0.004)),
    }
  }
  apply() {
    const out: Pose = {}
    let sum = 0
    for (const k in this.mix) sum += this.mix[k]
    for (const k in this.mix) {
      const w = this.mix[k] / (sum || 1); if (w < 1e-4) continue
      for (const [n, e] of Object.entries(this.poses[k] ?? {})) { const o = (out[n] ??= [0, 0, 0]); for (let i = 0; i < 3; i++) o[i] += e[i] * w }
    }
    this.bones.forEach((_, n) => this.setBone(n, out[n] ?? [0, 0, 0]))
  }
}
