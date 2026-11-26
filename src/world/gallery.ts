/** Real photographs in two places: a ladder that climbs out of a white world, and a ring of screens buried under it. */
import * as THREE from 'three'
import { photo, TRUE_COLOUR } from './util'
import { damp, smooth } from './math'
export interface Pic { n: string; a: number; c: string }
const ALL: Record<string, Pic> = {
  col_1: { n: 'col_1', a: 1.896, c: 'The weave' }, col_5: { n: 'col_5', a: 1.777, c: 'In the sun' }, col_3: { n: 'col_3', a: 1.777, c: 'Worn' }, col_9: { n: 'col_9', a: 1.777, c: 'Hands full' }, col_8: { n: 'col_8', a: 1.777, c: 'Hands busy' }, col_2: { n: 'col_2', a: 1.896, c: 'The ring' },
  col_0: { n: 'col_0', a: 1.896, c: 'The pair' }, col_11: { n: 'col_11', a: 1.777, c: 'Together' }, col_10: { n: 'col_10', a: 1.777, c: 'Captions' }, col_12: { n: 'col_12', a: 1.777, c: 'Answers' }, col_7: { n: 'col_7', a: 1.777, c: 'Directions' }, hero: { n: 'hero', a: 1.777, c: 'The display' },
}
/** rungs, top to bottom */
export const RUNGS = ['col_1', 'col_5', 'col_3', 'col_9', 'col_8', 'col_2'].map((k, i) => { const p = ALL[k], w = [8.6, 7, 6.8, 7, 7, 7.6][i]; return { ...p, w, x: [0, 2.7, -2.5, 2.5, -2.3, 0][i], y: -i * 6.1, z: [0, -0.5, 0.2, -0.3, 0.3, 0][i], rz: [0, -0.045, 0.05, -0.04, 0.045, 0][i] } })
export const RING = ['col_0', 'col_11', 'col_10', 'col_12', 'col_7', 'hero'].map((k) => ALL[k])
export const TOP = -200, FLOOR = TOP - 42, HOLE = 4.6, DEEP = TOP - 112, RAD = 12.4, SH = 6.1, STEP = (Math.PI * 2) / RING.length, ARC = STEP * 0.86
const cover = `vec2 cov(vec2 u,float ia,float pa){u-=.5;if(ia>pa)u.x*=pa/ia;else u.y*=ia/pa;return u+.5;}`
export class Gallery {
  readonly ladder = new THREE.Group()
  readonly cavern = new THREE.Group()
  readonly textures: THREE.Texture[] = []
  readonly ready: Promise<unknown>
  private lm: THREE.ShaderMaterial[] = []; private lo: THREE.Mesh[] = []
  private sm: THREE.ShaderMaterial[] = []; private so: THREE.Mesh[] = []
  private floor: THREE.ShaderMaterial; private shaft: THREE.ShaderMaterial; private sand: THREE.ShaderMaterial
  private cap: THREE.Mesh; private sandMesh: THREE.Mesh
  private ray = new THREE.Raycaster(); private m2 = new THREE.Vector2()
  private tick = 0; private hitL?: THREE.Intersection; private hitS?: THREE.Intersection
  hover = -1; spin = 0; spinV = 0
  constructor(low: boolean) {
    const pr: Promise<unknown>[] = [], cache = new Map<string, THREE.Texture>(), tex = (n: string) => { let t = cache.get(n); if (!t) { t = photo(`./img/real/${n}.webp`, pr); cache.set(n, t); this.textures.push(t) } return t }
    this.ladder.position.y = TOP
    RUNGS.forEach((p) => {
      const h = p.w / p.a, m = new THREE.ShaderMaterial({ side: THREE.DoubleSide, transparent: true, uniforms: { t: { value: tex(p.n) }, sz: { value: new THREE.Vector2(p.w, h) }, vel: { value: 0 }, hv: { value: 0 }, pt: { value: new THREE.Vector2() }, par: { value: 0 } },
        vertexShader: `varying vec2 v;varying float vz;uniform vec2 sz;uniform float vel,hv;uniform vec2 pt;void main(){v=uv;vec3 p=position;vec2 q=uv-.5;
          p.z-=dot(q,q)*1.5;p.z+=sin((uv.y-.5)*3.14)*vel*1.6;p.y+=(1.-cos(q.x*2.6))*vel*2.2;p.z+=hv*.5*exp(-dot(uv-pt,uv-pt)*7.);vz=p.z;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
        fragmentShader: TRUE_COLOUR + `varying vec2 v;varying float vz;uniform sampler2D t;uniform vec2 sz;uniform float hv,par,vel;void main(){
          vec2 u=(v-.5)*(.955-hv*.04)+.5;u.y+=par;vec2 ca=vec2(0.,vel*.012);vec3 c=vec3(texture2D(t,u+ca,-.5).r,texture2D(t,u,-.5).g,texture2D(t,u-ca,-.5).b);
          vec2 d=abs((v-.5)*sz)-sz*.5+.14;float r=length(max(d,0.))-.14;float aa=fwidth(r);
          gl_FragColor=vec4(un(max(c,0.)),smoothstep(aa,-aa,r));}` })
      const o = new THREE.Mesh(new THREE.PlaneGeometry(p.w, h, 28, 20), m); o.position.set(p.x, p.y, p.z); o.rotation.z = p.rz; this.lm.push(m); this.lo.push(o); this.ladder.add(o)
    })
    // the ground, and the way through it
    this.floor = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: {}, vertexShader: 'varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: TRUE_COLOUR + `varying vec2 p;void main(){float d=length(p);float sh=exp(-(d-${HOLE})*.55);vec3 c=mix(vec3(.72,.74,.77),vec3(.2,.21,.24),sh*.75);float lip=smoothstep(${HOLE}+.16,${HOLE}+.1,d);c=mix(c,vec3(.95),lip);gl_FragColor=vec4(un(c),smoothstep(26.,8.,d));}` })
    const f = new THREE.Mesh(new THREE.RingGeometry(HOLE, 27, 160, 1), this.floor); f.rotation.x = -Math.PI / 2; f.position.y = FLOOR; f.renderOrder = 2
    this.shaft = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { dim: { value: 1 } }, vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: TRUE_COLOUR + `varying vec3 p;uniform float dim;void main(){float y=(14.-p.y);float a=atan(p.z,p.x);float seg=floor(y/1.4);float st=fract(y/1.4);float j=smoothstep(0.,.05,st)*smoothstep(1.,.95,st);float col=fract((a+seg*.37)*3.8197);float jc=smoothstep(0.,.02,col)*smoothstep(1.,.98,col);
      float n=fbm(vec2(a*14.,y*3.))*.5+.6+.18*h21(vec2(seg,floor((a+seg*.37)*3.8197)));float li=exp(-y*.17)*(.75+.35*cos(a-1.));float lamp=step(.965,fract(y/5.6+.5))*exp(-y*.02);vec3 c=vec3(.6,.62,.66)*n*li*(.25+.75*j*jc);c+=vec3(.5,.62,1.)*lamp*.9;gl_FragColor=vec4(un(min(c*dim,vec3(.86))),1.);}` })
    const s = new THREE.Mesh(new THREE.CylinderGeometry(HOLE, HOLE, 28, 128, 1, true), this.shaft); s.position.y = FLOOR - 14; s.renderOrder = 1
    this.cap = new THREE.Mesh(new THREE.CircleGeometry(HOLE, 64), new THREE.MeshBasicMaterial({ color: 0 })); this.cap.rotation.x = -Math.PI / 2; this.cap.position.y = FLOOR - 27.9 - TOP
    f.position.y -= TOP; s.position.y -= TOP; this.ladder.add(f, s, this.cap)
    // underground
    this.cavern.position.y = DEEP
    const cols = RING.map(() => new THREE.Vector3(0.3, 0.3, 0.35)), focus = new Float32Array(RING.length)
    RING.forEach((p, i) => {
      const g = new THREE.CylinderGeometry(RAD, RAD, SH, 48, 1, true, -ARC / 2, ARC)
      const m = new THREE.ShaderMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite: false, uniforms: { t: { value: tex(p.n) }, ia: { value: p.a }, pa: { value: (RAD * ARC) / SH }, k: { value: 0 }, seed: { value: i * 7.3 }, hv: { value: 0 } },
        vertexShader: 'varying vec2 v;varying vec3 w;void main(){v=vec2(1.-uv.x,uv.y);w=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}',
        fragmentShader: TRUE_COLOUR + cover + `varying vec2 v;varying vec3 w;uniform sampler2D t;uniform float ia,pa,k,seed,hv;void main(){
          vec2 e=min(v,1.-v)*vec2(pa,1.)*6.1;float m=min(e.x,e.y);float n=m<.8?fbm(v*vec2(pa,1.)*4.+seed):.5;float d=m-.1-n*.55;float a=smoothstep(-.02,.05,d);if(a<.004)discard;
          vec2 u=cov((v-.5)*(.96-hv*.05)+.5,ia,pa);vec3 c=texture2D(t,u,-.5).rgb;float rim=exp(-max(d,0.)*9.);c=min(c,vec3(.7));c=c*(.14+.86*k)+(c*.5+vec3(.3))*rim*(.14+.26*k);
          gl_FragColor=vec4(un(max(c,0.)),a);}` })
      const o = new THREE.Mesh(g, m); o.position.y = SH / 2 + 0.5; o.rotation.y = Math.PI + i * STEP; this.sm.push(m); this.so.push(o); this.cavern.add(o)
    })
    this.sand = new THREE.ShaderMaterial({ transparent: true, uniforms: { col: { value: cols }, foc: { value: focus }, spin: { value: 0 } },
      vertexShader: `attribute float aW;varying vec3 p,vN;varying vec2 r;varying float H,wv;void main(){p=mat3(modelMatrix)*position;vN=mat3(modelMatrix)*normal;r=position.xz;wv=aW;H=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: TRUE_COLOUR + `varying vec3 p,vN;varying vec2 r;varying float H,wv;uniform vec3 col[${RING.length}];uniform float foc[${RING.length}];uniform float spin;
        void main(){vec3 N=normalize(vN);float rp=cos(r.x*4.6+r.y*1.6+wv);N=normalize(N+vec3(rp*.22,0.,rp*.1)+vec3(h21(r*60.)-.5,0.,h21(r*70.)-.5)*.16);
          vec3 L=vec3(0.);for(int i=0;i<${RING.length};i++){float a=spin+float(i)*${STEP.toFixed(5)};vec3 sp=vec3(sin(a+3.14159),0.,cos(a+3.14159))*${RAD.toFixed(2)};vec3 t=vec3(-cos(a),0.,sin(a));vec3 q=p-sp;float al=clamp(dot(q,t),-4.6,4.6);vec3 d=sp+t*al+vec3(0.,2.2,0.)-p;float l=length(d);L+=col[i]*foc[i]*max(0.,dot(N,d/l)+.12)*4.6/(1.+l*l*.36);}
          float gr=.85+.3*h21(floor(r*46.));vec3 al=vec3(.66,.6,.53)*gr;float D=length(p.xz);vec3 o=al*L*(.75+.25*smoothstep(-.6,.6,H));o*=1.-.75*exp(-dot(p.xz,p.xz)*.28);
          gl_FragColor=vec4(un(min(o,vec3(.84))),smoothstep(27.,15.,D));}` })
    // the dunes are sculpted once, here, and only turned after that
    const n = low ? 130 : 220, pg = new THREE.PlaneGeometry(60, 60, n, n).rotateX(-Math.PI / 2), P = pg.getAttribute('position'), W = new Float32Array(P.count)
    const fr = (v: number) => v - Math.floor(v), h = (x: number, y: number) => fr(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453)
    const nz = (x: number, y: number) => { const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); return (h(ix, iy) * (1 - fx) + h(ix + 1, iy) * fx) * (1 - fy) + (h(ix, iy + 1) * (1 - fx) + h(ix + 1, iy + 1) * fx) * fy }
    const fb = (x: number, y: number) => nz(x, y) * 0.5 + nz(x * 2.1 + 7, y * 2.1 + 7) * 0.25 + nz(x * 4.3 + 3, y * 4.3 + 3) * 0.125 + nz(x * 8.7, y * 8.7) * 0.0625
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), d = Math.hypot(x, z); P.setY(i, (fb(x * 0.16 + 3, z * 0.16 + 3) * 2.6 - 0.9) * smooth(3, 10, d) + (fb(x * 0.5, z * 0.5) - 0.45) * 0.35 + Math.sin(x * 0.35 + fb(x * 0.2, z * 0.2) * 6) * 0.22 * smooth(2, 8, d) + smooth(13, 22, d) * 0.9); W[i] = fb(x * 0.5, z * 0.5) * 9 }
    pg.setAttribute('aW', new THREE.BufferAttribute(W, 1)); pg.computeVertexNormals()
    const sand = new THREE.Mesh(pg, this.sand); sand.frustumCulled = false; sand.renderOrder = -1; this.sandMesh = sand; this.cavern.add(sand)
    this.ready = Promise.all(pr).then(() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 4; const x = cv.getContext('2d', { willReadFrequently: true })!
      RING.forEach((p, i) => { x.drawImage(cache.get(p.n)!.image as HTMLImageElement, 0, 0, 4, 4); const d = x.getImageData(0, 0, 4, 4).data; let r = 0, g = 0, b = 0; for (let k = 0; k < 64; k += 4) { r += d[k]; g += d[k + 1]; b += d[k + 2] } const l = Math.max(r, g, b, 1) / 4080, q = 0.45 + 0.55 * l; cols[i].set((r / 4080 / l) ** 1.6 * q, (g / 4080 / l) ** 1.6 * q, (b / 4080 / l) ** 1.6 * q) })
    })
  }
  update(la: number, cv: number, yaw: number, vel: number, dt: number, cam: THREE.PerspectiveCamera, px: number, py: number, drag: boolean) {
    this.ladder.visible = la > 0.5 && cam.position.y > FLOOR - 28; this.cavern.visible = cv > 0.02; this.hover = -1
    if (this.ladder.visible) {
      this.shaft.uniforms.dim.value = smooth(FLOOR - 25, FLOOR - 9, cam.position.y)
      if (this.tick++ % 3 === 0) { this.ray.setFromCamera(this.m2.set(px, py), cam); this.hitL = this.ray.intersectObjects(this.lo, false)[0] } const hit = this.hitL
      this.lo.forEach((o, i) => { const u = this.lm[i].uniforms, on = hit?.object === o; if (on) { this.hover = i; if (hit.uv) u.pt.value.lerp(hit.uv, 1 - Math.exp(-dt * 8)) } u.hv.value = damp(u.hv.value, on ? 1 : 0, 6, dt); u.vel.value = damp(u.vel.value, Math.max(-1, Math.min(1, vel * 0.035)), 7, dt); u.par.value = Math.max(-0.02, Math.min(0.02, (cam.position.y - TOP - RUNGS[i].y) * 0.004)); o.rotation.y = damp(o.rotation.y, (cam.position.x - RUNGS[i].x) * 0.05 + (on ? px * 0.12 : 0), 6, dt); o.rotation.x = damp(o.rotation.x, on ? -py * 0.1 : 0, 6, dt) })
    }
    if (this.cavern.visible) {
      if (!drag) { this.spin += this.spinV * dt; this.spinV *= Math.exp(-dt * 2.2) }
      const a = yaw + this.spin; this.cavern.rotation.y = 0
      if (this.tick++ % 3 === 0) { this.ray.setFromCamera(this.m2.set(px, py), cam); this.hitS = this.ray.intersectObjects(this.so, false)[0] } const hit = this.hitS
      const foc = this.sand.uniforms.foc.value as Float32Array
      this.so.forEach((o, i) => { const t = a + i * STEP; o.rotation.y = Math.PI + t; const face = Math.cos(t), k = 0.22 + 0.78 * smooth(0.72, 0.97, face), up = smooth(i * 0.11, i * 0.11 + 0.42, cv); const u = this.sm[i].uniforms; u.hv.value = damp(u.hv.value, hit?.object === o ? 1 : 0, 6, dt); u.k.value = (k + u.hv.value * 0.15) * up; foc[i] = (0.5 + 0.9 * k) * up })
      this.sand.uniforms.spin.value = a; this.sandMesh.rotation.y = a
    }
  }
  /** a decoded gesture turns the ring by exactly one screen */
  step(dir: number) { this.spinV -= dir * STEP * 2.2 }
  colour(i: number) { return (this.sand.uniforms.col.value as THREE.Vector3[])[i] }
  /** Which screen the camera is facing. */
  facing(yaw: number) { let b = 0, m = -2; for (let i = 0; i < RING.length; i++) { const c = Math.cos(yaw + this.spin + i * STEP); if (c > m) { m = c; b = i } } return b }
}
