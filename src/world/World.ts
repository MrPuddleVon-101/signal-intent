import * as THREE from 'three'
import { live, liveEnvelope, onCommand, onTrialStart, store, tick } from '../store'
import { TRIAL_SECONDS } from '../model/generator'
import { Band, PARTS } from './band'
import { buildEnvironment } from './fx'
import { Hand } from './hand'
import { MAX_GLASS, Post } from './post'
import { BASE, SHOTS, type ShotState } from './shots'
import { glassEls, manual, pointer, scroll } from './shared'
import { Flesh } from './flesh'
import { DEEP, Gallery, RAD } from './gallery'
import { Reveal } from './reveal'
import { Forms } from './forms'
import { Portraits } from './portraits'
import { clamp, damp, smooth } from './util'

interface Anchor { y: number; s: ShotState }
const KEYS = Object.keys(BASE) as (keyof ShotState)[]
export class World {
  readonly r: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly cam = new THREE.PerspectiveCamera(30, 1, 0.05, 70)
  readonly band = new Band()
  readonly hand = new Hand()
  readonly lines = new Flesh()
  readonly gallery: Gallery
  readonly reveal = new Reveal()
  private envs: THREE.Texture[] = []; private tone = -1; private grey = -1
  readonly rig = new THREE.Group()
  readonly forms = new Forms()
  readonly portraits = new Portraits()
  private post: Post
  private anchors: Anchor[] = []
  readonly st: ShotState = { ...BASE }
  override: Partial<ShotState> = {}
  private w = 1; private h = 1; private dpr = 1; private q = 1
  private mx = 0; private my = 0; private born = 0; private placement = 0; private loose = 0; private pinch = 0
  private key = new THREE.DirectionalLight('#ffffff', 2.2); private back = new THREE.DirectionalLight('#9db4ff', 2)
  readonly torch = new THREE.PointLight('#e8eeff', 0, 14, 1.6)
  lit = -1; drag = false; private hit = 0; private vel = 0
  private last = performance.now(); private warmup = 0; private wasPlaying = false
  private times: number[] = []; private before = 0; private qBefore = 1; private locked = false
  readonly mobile: boolean
  private ready = false
  private moved = false
  private v = new THREE.Vector3(); private v2 = new THREE.Vector3(); private qa = new THREE.Quaternion(); private qb = new THREE.Quaternion(); private e = new THREE.Euler(); private pA = new THREE.Vector3(); private sA = new THREE.Vector3(); private rot = new THREE.Quaternion(); private X = new THREE.Vector3(1, 0, 0)
  readonly lensTarget = new THREE.Vector3(4, 0, 0)
  ground: HTMLElement[] = []

  constructor(canvas: HTMLCanvasElement) {
    this.mobile = matchMedia('(max-width: 820px), (pointer: coarse)').matches
    this.r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' })
    this.r.toneMapping = THREE.NoToneMapping; this.r.outputColorSpace = THREE.LinearSRGBColorSpace
    this.gallery = new Gallery(this.mobile)
    this.post = new Post(this.r, this.mobile ? 2 : 4)
    this.envs = [buildEnvironment(this.r, false), buildEnvironment(this.r, true)]; this.scene.environment = this.envs[0]; this.scene.environmentIntensity = 1
    this.key.position.set(-4, 6, 7); this.back.position.set(5, 2, -6)
    this.scene.add(this.key, this.back, this.rig, this.band.group, this.lines.group, this.gallery.ladder, this.gallery.cavern, this.forms.group, this.portraits.group, this.reveal.mesh, this.torch)
    this.rig.add(this.hand.group)
    addEventListener('resize', this.resize)
    addEventListener('pointermove', (e) => { this.moved = e.pointerType !== 'touch'; pointer.x = (e.clientX / innerWidth) * 2 - 1; pointer.y = -(e.clientY / innerHeight) * 2 + 1 }, { passive: true })
    onCommand(() => { this.hit = 1 })
    onTrialStart((t) => this.forms.write(t, store.getState().decoder.threshold))
    this.ground = Array.from(document.querySelectorAll<HTMLElement>('#ground > i'))
  }
  async init(demo: Parameters<Forms['write']>[0]) {
    await Promise.all([this.hand.load(this.mobile ? 1 : 2), this.band.load(), this.gallery.ready, this.reveal.ready, this.portraits.ready])
    this.lines.bind(this.hand, this.mobile)
    this.lines.load(store.getState().idle.recording.sourceDrive)
    this.forms.write(store.getState().trial ?? demo, store.getState().decoder.threshold)
    this.resize()
    // Everything is compiled, uploaded and drawn once behind the loader, so nothing is met for the first time mid-scroll.
    for (const t of [...this.gallery.textures, ...this.reveal.textures, ...this.portraits.textures]) this.r.initTexture(t)
    const hidden: THREE.Object3D[] = []; this.scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true } })
    const culled: THREE.Object3D[] = []; this.scene.traverse((o) => { if (o.frustumCulled) { culled.push(o); o.frustumCulled = false } })
    this.forms.update(1, 1, 1, 1)
    await this.r.compileAsync(this.scene, this.cam)
    this.reveal.update(this.r, 0.016, 0, 1, 0, 0, 1.6, 0, 0, true)
    for (const e of this.envs) { this.scene.environment = e; this.post.render(this.scene, this.cam) }
    this.scene.environment = this.envs[0]
    hidden.forEach((o) => { o.visible = false }); culled.forEach((o) => { o.frustumCulled = true })
    this.born = this.last = performance.now()
    this.ready = true
    store.setState({ worldReady: true })
  }
  resize = () => {
    this.w = innerWidth; this.h = innerHeight
    this.dpr = Math.min(devicePixelRatio, this.mobile ? 1.5 : 1.65) * this.q
    this.r.setPixelRatio(this.dpr); this.r.setSize(this.w, this.h, false); this.post.size(this.w, this.h, this.dpr); this.forms.size(this.w, this.h)
    this.measure()
  }
  measure = () => {
    const portrait = this.w / this.h < 0.9
    this.anchors = SHOTS.flatMap((sh) => { const el = document.getElementById(sh.at); return el ? [{ y: el.offsetTop + sh.p * Math.max(1, el.offsetHeight - this.h), s: { ...BASE, ...sh.s, ...(portrait ? sh.m : {}) } }] : [] })
    // One continuous move. Monotone cubic tangents: no stop at every key, and never an overshoot.
    const A = this.anchors, n = A.length
    this.slope = A.map(() => ({ ...BASE }))
    for (const K of KEYS) for (let i = 0; i < n; i++) {
      if (i === 0 || i === n - 1) { this.slope[i][K] = 0; continue }
      const h0 = Math.max(1, A[i].y - A[i - 1].y), h1 = Math.max(1, A[i + 1].y - A[i].y), d0 = (A[i].s[K] - A[i - 1].s[K]) / h0, d1 = (A[i + 1].s[K] - A[i].s[K]) / h1
      const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0
      this.slope[i][K] = d0 * d1 <= 0 ? 0 : (w1 + w2) / (w1 / d0 + w2 / d1)
    }
  }
  private slope: ShotState[] = []
  private blend(y: number) {
    const A = this.anchors; if (!A.length) return
    let i = 0; while (i < A.length - 1 && A[i + 1].y <= y) i++
    const j = Math.min(i + 1, A.length - 1), a = A[i], b = A[j], h = Math.max(1, b.y - a.y), t = i === j ? 0 : Math.max(0, Math.min(1, (y - a.y) / h)), t2 = t * t, t3 = t2 * t
    const p0 = 2 * t3 - 3 * t2 + 1, m0 = (t3 - 2 * t2 + t) * h, p1 = -2 * t3 + 3 * t2, m1 = (t3 - t2) * h
    for (const K of KEYS) this.st[K] = this.override[K] ?? (a.s[K] === b.s[K] ? a.s[K] : a.s[K] * p0 + this.slope[i][K] * m0 + b.s[K] * p1 + this.slope[j][K] * m1)
  }
  screen(v: THREE.Vector3) { v.project(this.cam); return { x: (v.x * 0.5 + 0.5) * this.w, y: (-v.y * 0.5 + 0.5) * this.h } }
  part(name: (typeof PARTS)[number]) { return this.screen(this.band.partPoint(name, this.v)) }
  at(x: number, y: number, z: number) { return this.screen(this.v.set(x, y, z)) }
  /** Keep the frame budget. If resolution is not the bottleneck, give the sharpness back. */
  private govern(raw: number) {
    if (raw > 0.25 || this.locked) return
    this.times.push(raw); if (this.times.length < 45) return
    const med = [...this.times].sort((a, b) => a - b)[22]; this.times.length = 0
    if (this.before && med > this.before * 0.92) { this.q = this.qBefore; this.locked = true; this.resize(); return }
    this.before = 0
    if (med > 0.0195 && this.q > 0.6) { this.before = med; this.qBefore = this.q; this.q = Math.max(0.6, this.q * 0.82); this.resize() }
  }
  frame = (now: number) => {
    if (!this.ready) return
    const raw = (now - this.last) / 1000, dt = Math.min(0.05, Math.max(0.001, raw)); this.last = now
    const S = store.getState(); tick(now)
    const calm = S.reduced || S.paused
    if (this.warmup < 4) { this.warmup++; this.born = now } else this.govern(raw)
    if (S.playing !== this.wasPlaying) { this.wasPlaying = S.playing; this.lines.load((S.playing && S.trial ? S.trial : S.idle).recording.sourceDrive) }
    this.blend(scroll.y)
    const s = this.st; const lit = this.light(now, calm)
    this.mx = damp(this.mx, calm ? 0 : pointer.x, 5, dt); this.my = damp(this.my, calm ? 0 : pointer.y, 5, dt)
    const clock = calm ? 0 : now / 1000, dist = Math.hypot(s.cx - s.tx, s.cy - s.ty, s.cz - s.tz)
    const push = 1 - 0.16 * lit.push
    this.cam.position.set(s.tx + (s.cx - s.tx) * push + this.mx * dist * 0.05, s.ty + (s.cy - s.ty) * push + this.my * dist * 0.035, s.tz + (s.cz - s.tz) * push)
    if (s.cm > 0.5) {
      // the crane: from straight above to eye level in a single arc, with the horizon always level
      const k = s.cr, e = k * k * (3 - 2 * k), el = Math.PI / 2 + (0.03 - Math.PI / 2) * e, r0 = 38 + (1 - smooth(0, 1, s.cv)) * 9, rr = r0 + (8.4 - r0) * smooth(0, 1, Math.min(1, k * 1.08))
      this.cam.position.set(this.mx * rr * 0.04, DEEP + 1.9 * e + rr * Math.sin(el) * (1 - 0.1 * e) + this.my * rr * 0.02, rr * Math.cos(el))
      this.cam.up.set(0, Math.cos(el) + 0.0001, -Math.sin(el)); this.cam.lookAt(0, DEEP + 2.35 * e, -RAD * e)
    } else { this.cam.up.set(0, 1, 0); this.cam.lookAt(s.tx, s.ty, s.tz); this.cam.rotateZ(-s.roll) }
    const ar = this.w / this.h
    this.cam.fov = s.fov * (ar < 1.35 && ar >= 0.9 ? 1.18 : 1); this.cam.aspect = ar
    this.cam.setViewOffset(this.w, this.h, -s.fx * this.w * 0.5, s.fy * this.h * 0.5, this.w, this.h); this.cam.updateMatrixWorld()

    const L = live(now), env = liveEnvelope(now)
    this.pose(S.playing && S.trial ? S.trial.config.requestedGesture : 'rest', L.t, S.playing && S.trial ? S.trial.config.intensity : 1, dt)
    const br = calm ? 0 : Math.sin(now / 2100) * 0.012
    this.rig.rotation.set(s.arx + br - this.my * 0.06, s.ary + this.mx * 0.09, s.arz + br * 0.7, 'ZYX'); this.rig.updateMatrixWorld(true)
    this.hand.updateMats()

    // band: wrist transform, free transform, and the blend between them
    this.placement = damp(this.placement, S.settings.placementAngle, 10, dt); this.loose = damp(this.loose, 1 - S.settings.contactQuality, 10, dt)
    this.qa.copy(this.rig.quaternion).multiply(this.rot.setFromAxisAngle(this.X, (this.placement * Math.PI) / 180))
    this.qb.setFromEuler(this.e.set(s.brx + this.my * -0.05, s.bry + this.mx * 0.08, s.brz, 'ZYX'))
    const f = smooth(0, 1, s.bf), g = this.band.group
    g.quaternion.copy(this.qa).slerp(this.qb, f)
    this.pA.set(-this.loose * 0.12, -this.loose * 0.06, 0).applyQuaternion(this.rig.quaternion)
    g.position.set(this.pA.x + (s.bx - this.pA.x) * f, this.pA.y + (s.by - this.pA.y) * f, this.pA.z + (s.bz - this.pA.z) * f)
    const bs = (1 + (s.bs - 1) * f) * Math.max(0.0001, smooth(0, 1, s.bv)); g.visible = s.bv > 0.02
    this.sA.set(bs, bs * (1 + this.loose * 0.1), bs * (1 + this.loose * 0.12)); g.scale.copy(this.sA)
    this.hit = Math.max(0, this.hit - dt / 1.1); this.band.u.uG.value = lit.glow + this.hit * this.hit * 1.6 + manual.effort * manual.effort * 0.55
    this.band.pose(s.ex, s.xr, env, S.selected, clock)
    let peak = 0; for (const v of env) peak = Math.max(peak, v)
    const u = this.lines.u
    u.uPulse.value = damp(u.uPulse.value, Math.max(0, peak - 0.16), 14, dt); u.uManual.value = damp(u.uManual.value, manual.effort, 14, dt)
    u.uTime.value = clock; this.lines.show(s.hv, s.skin, false); u.uFib.value = s.fib; u.uSkin.value = s.skin; u.uT.value = L.t / TRIAL_SECONDS
    u.uHand.value.copy(this.hand.group.matrixWorld).multiply((this.hand as unknown as { inner: THREE.Group }).inner.matrix)
    this.hand.tip('index-finger-tip', this.v); this.hand.tip('thumb-tip', this.v2)
    this.pinch = damp(this.pinch, S.playing && S.trial?.config.requestedGesture === 'pinch' ? smooth(0.5, 0.15, this.v.distanceTo(this.v2)) : 0, 12, dt)
    u.uPinch.value.set((this.v.x + this.v2.x) / 2, (this.v.y + this.v2.y) / 2, (this.v.z + this.v2.z) / 2, this.pinch)
    this.forms.update(s.wv, s.tr, s.tw, S.playing ? L.t / TRIAL_SECONDS : 1)
    this.portraits.update(s.mi, s.mo)
    this.vel = damp(this.vel, calm ? 0 : scroll.v, 9, dt)
    this.gallery.update(s.la, s.cv, s.yw, this.vel, dt, this.cam, calm ? 0 : pointer.x, calm ? 0 : pointer.y, this.drag)
    this.reveal.update(this.r, dt, now, s.rv, s.rf, s.rc, ar, pointer.x, pointer.y, calm)
    // a light in the visitor's hand
    this.v.set(pointer.x, pointer.y, 0.5).unproject(this.cam).sub(this.cam.position).normalize().multiplyScalar(dist * 0.62).add(this.cam.position)
    this.torch.position.lerp(this.v, 1 - Math.exp(-dt * 7)); this.torch.intensity = calm || !this.moved ? 0 : 9 * s.to * lit.on
    // tone: the room changes, and so does everything reflected in the metal
    const lt = s.lt, gy = s.gy * lit.ground, env0 = lt > 0.5 ? this.envs[1] : this.envs[0]
    if (this.scene.environment !== env0) this.scene.environment = env0
    this.scene.environmentIntensity = lit.env
    this.key.intensity = (1.6 + lt * 1.2) * lit.on; this.back.intensity = (2.2 - lt * 1.4) * Math.max(lit.on, 0.4)
    const white = lt > 0.5 || s.fr > 0.5
    if (Math.abs(lt - this.tone) > 0.002) { this.tone = lt; this.ground[0]?.style.setProperty('opacity', lt.toFixed(3)) }
    if (Math.abs(gy - this.grey) > 0.002) { this.grey = gy; this.ground[1]?.style.setProperty('opacity', gy.toFixed(3)) }
    const tn = white ? 'light' : 'dark', de = document.documentElement; if (de.dataset.tone !== tn) de.dataset.tone = tn
    const fu = this.post.final.uniforms
    ;(fu.gA.value as THREE.Color).setRGB(0.02 + lt * 0.82 + gy * 0.3, 0.02 + lt * 0.83 + gy * 0.305, 0.024 + lt * 0.85 + gy * 0.31)
    const fr = smooth(0, 1, s.fr), tall = ar < 0.9; fu.fr.value = fr; (fu.frS.value as THREE.Vector2).set(1 - fr * (tall ? 0.14 : 0.5), 1 - fr * (tall ? 0.52 : 0.32))
    fu.expo.value = lit.expo; fu.bloom.value = 0.3 - 0.22 * lt - 0.2 * s.cv - 0.15 * s.rv; fu.vel.value = Math.max(-1, Math.min(1, this.vel / 60)) * (1 - fr)
    if (lit.flare > 0.001) { this.band.group.getWorldPosition(this.v); this.v.project(this.cam); (fu.fla.value as THREE.Vector4).set(this.v.x * 0.5 + 0.5, this.v.y * 0.5 + 0.5, lit.flare, 0) } else fu.fla.value.z = 0

    this.scene.updateMatrixWorld()
    let gi = 0
    if (document.documentElement.dataset.lit) glassEls.forEach((el) => { if (gi >= MAX_GLASS) return; const r = el.getBoundingClientRect(); if (r.width > 4 && r.bottom > 0 && r.top < this.h) this.post.glass[gi++].set(r.left, this.h - r.bottom, r.width, r.height) })
    for (; gi < MAX_GLASS; gi++) this.post.glass[gi].set(0, 0, 0, 0)
    fu.time.value = clock % 10
    this.post.render(this.scene, this.cam)
  }
  /** Ignition: a held breath, two flickers, the flare, and the room. Seconds since the visitor entered. */
  private L = { on: 1, env: 1, expo: 1, glow: 0, flare: 0, ground: 1, push: 0 }
  private light(now: number, calm: boolean) {
    const o = this.L
    if (calm || this.lit === -2) { o.on = o.env = o.expo = o.ground = 1; o.glow = o.flare = o.push = 0; if (document.documentElement.dataset.lit !== '1') document.documentElement.dataset.lit = '1'; return o }
    const t = this.lit < 0 ? 0 : (now - this.lit) / 1000, x = (a: number, b: number) => smooth(a, b, t)
    const flick = (t > 0.72 && t < 0.79) || (t > 0.86 && t < 0.98) || t > 1.12 ? 1 : 0
    o.env = 0.16 * x(0, 0.7) + 0.84 * x(1.9, 2.25); o.on = x(1.85, 2.3); o.ground = x(1.92, 2.35)
    o.glow = flick * (0.9 + 3.4 * x(1.3, 2)) * (1 - x(2.2, 3.6))
    o.flare = (0.1 * flick * (1 - x(1.2, 1.4)) + 0.22 * flick * x(1.2, 1.5) + 2.6 * x(1.55, 2.05)) * (1 - x(2.1, 3.3))
    o.expo = t < 1.9 ? 1 : 1 + 2.2 * x(1.9, 2.1) * (1 - x(2.12, 3.4))
    o.push = 1 - x(0.4, 4.6)
    if (t > 2.55 && document.documentElement.dataset.lit !== '1') document.documentElement.dataset.lit = '1'
    if (t > 5.2) this.lit = -2
    return o
  }
  private pose(g: string, t: number, intensity: number, dt: number) {
    const k = smooth(0.2, 0.5, t) * (1 - smooth(1.0, 1.4, t)) * clamp(0.35 + intensity * 0.65)
    const m = this.hand.mix, tgt = { relaxed: 1, pinch: 0, fist: 0, tl: 0, tr: 0 }
    if (g === 'pinch') { tgt.pinch = k; tgt.relaxed = 1 - k }
    if (g === 'left' || g === 'right') { const e = smooth(0.15, 0.38, t) * (1 - smooth(1.1, 1.45, t)), go = smooth(0.4, 0.85, t), from = g === 'left' ? 'tr' : 'tl', to = g === 'left' ? 'tl' : 'tr'; tgt.relaxed = 1 - e; tgt[from] = e * (1 - go); tgt[to] = e * go }
    if (manual.effort > 0.01) { tgt.relaxed = 1 - manual.effort * 0.85; tgt.fist = manual.effort * 0.85; tgt.pinch = tgt.tl = tgt.tr = 0 }
    let ch = false
    for (const K of Object.keys(tgt) as (keyof typeof tgt)[]) { const n = damp(m[K], tgt[K], 20, dt); if (Math.abs(n - m[K]) > 2e-4) ch = true; m[K] = n }
    if (ch) this.hand.apply()
  }
}
