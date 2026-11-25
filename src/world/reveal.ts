/** Two registered portraits and a liquid brush. Sweep across the first and the second is underneath. */
import * as THREE from 'three'
import { photo, TRUE_COLOUR } from './util'
import { damp } from './math'
const VERT = 'varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}'
export class Reveal {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  readonly textures: THREE.Texture[]
  readonly ready: Promise<unknown>
  private rt = [0, 1].map(() => new THREE.WebGLRenderTarget(320, 180, { type: THREE.HalfFloatType, depthBuffer: false }))
  private sim: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private p = new THREE.Vector2(0.5, 0.6); private q = new THREE.Vector2(0.5, 0.6); private idle = 9; private cleared = true; private lastP = new THREE.Vector2()
  constructor() {
    const pr: Promise<unknown>[] = [], a = photo('./img/real/rev_a.webp', pr), b = photo('./img/real/rev_b.webp', pr), mt = photo('./img/real/rev_m.webp', pr); mt.colorSpace = THREE.NoColorSpace
    this.textures = [a, b, mt]; this.ready = Promise.all(pr)
    const g = new THREE.PlaneGeometry(2, 2)
    this.sim = new THREE.Mesh(g, new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { t: { value: null }, a: { value: new THREE.Vector2() }, b: { value: new THREE.Vector2() }, ar: { value: 1 }, r: { value: 0 }, k: { value: 0 }, tm: { value: 0 } }, vertexShader: VERT, fragmentShader: TRUE_COLOUR + `
      varying vec2 v;uniform sampler2D t;uniform vec2 a,b;uniform float ar,r,k,tm;
      void main(){vec2 w=vec2(n2(v*7.+tm*.5),n2(v*7.+31.-tm*.5))-.5;float o=texture2D(t,v+w*.006).r;o=max(0.,o*k-.0016);
      vec2 A=vec2(ar,1.),pa=(v-a)*A,ba=(b-a)*A;float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-6),0.,1.);float d=length(pa-ba*h);
      o=max(o,smoothstep(r,r*.12,d)*step(.001,r));gl_FragColor=vec4(o,o,o,1.);}` }))
    this.sim.frustumCulled = false
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, transparent: true, uniforms: { a: { value: a }, b: { value: b }, mt: { value: mt }, m: { value: null }, ar: { value: 1 }, full: { value: 0 }, show: { value: 0 }, tm: { value: 0 }, off: { value: new THREE.Vector2() }, zoom: { value: 1 }, crop: { value: 0 } }, vertexShader: VERT, fragmentShader: TRUE_COLOUR + `
      varying vec2 v;uniform sampler2D a,b,m,mt;uniform float ar,full,show,tm,zoom,crop;uniform vec2 off;
      // the sitter is on black with a matte: the room is drawn behind, so there is no edge to see
      vec3 face(sampler2D t,vec2 u,vec3 wall){vec2 in2=step(vec2(0.),u)*step(u,vec2(1.));float k=in2.x*in2.y;vec2 q=clamp(u,0.,1.);vec3 c=texture2D(t,q,-.5).rgb*k;return c+wall*(1.-texture2D(mt,q,-.5).r*k);}
      void main(){
        vec2 u=v-vec2(.5,0.);u.x*=ar;u/=zoom;u.x/=1.01574;u+=vec2(.5,0.)+off;
        float s=texture2D(m,v).r;float nz=fbm(v*vec2(ar,1.)*5.+tm*.12)-.45;
        vec2 fc=(v-vec2(.5,.62*zoom))*vec2(ar,1.);float f=full*1.9-length(fc)+nz*.16;
        float k=max(smoothstep(.2,.26,s+nz*.22),smoothstep(0.,.02,f)*step(.001,full));
        float fm=smoothstep(0.,.02,f)*step(.001,full);float rim=max(smoothstep(.12,.23,s+nz*.22)*smoothstep(.36,.24,s+nz*.22)*(1.-fm),smoothstep(-.03,0.,f)*smoothstep(.05,0.,f)*step(.001,full)*step(full,.999));
        vec2 w=vec2(dFdx(s),dFdy(s))*rim*.6;
        vec2 ub=u+w;vec2 ua=u-w;float ed=abs(v.x-.5);
        vec2 gg=(v-vec2(.5,.66))*vec2(ar,1.);vec3 wa=vec3(.006)+vec3(.052,.055,.062)*exp(-dot(gg,gg)*2.6);
        vec2 g=(v-vec2(.5,.64));float gd=clamp(1.-length(vec2(g.x*ar/.95/.8,g.y/.85)),0.,1.);vec3 wb=vec3(.035,.075,.36)+gd*vec3(.08,.16,.62);wb=pow(wb,vec3(2.2));
        vec3 A=face(a,ua,wa),B=face(b,ub+(v-.5)*-.012*(1.-full),wb);
        vec3 c=mix(A,B,k)+vec3(.5,.62,1.)*rim*.16;c+=(h21(gl_FragCoord.xy+fract(tm))-.5)*.004;
        float hw=.8*.5*zoom/ar;float win=mix(1.,smoothstep(hw+.0015,hw-.0015,ed),smoothstep(0.,.02,crop));if(crop>0.)win=smoothstep(mix(.5,hw,crop)+.0015,mix(.5,hw,crop)-.0015,ed);
        gl_FragColor=vec4(un(max(c,0.)),show*win);}` }))
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 30
  }
  /** show: opacity. full: the second portrait takes over. crop: closes to a 4 by 5 print. */
  update(r: THREE.WebGLRenderer, dt: number, now: number, show: number, full: number, crop: number, ar: number, px: number, py: number, calm: boolean) {
    this.mesh.visible = show > 0.002
    if (!this.mesh.visible) { if (!this.cleared) { for (const t of this.rt) { r.setRenderTarget(t); r.setClearColor(0, 1); r.clear() } r.setRenderTarget(null); this.cleared = true } return }
    this.cleared = false
    const u = this.mesh.material.uniforms, s = this.sim.material.uniforms
    // it follows the hand. Left alone, it sweeps across by itself, so nobody misses it.
    const moved = Math.hypot(px - this.lastP.x, py - this.lastP.y) > 0.002; this.lastP.set(px, py); this.idle = moved ? 0 : this.idle + dt
    let tx = px * 0.5 + 0.5, ty = py * 0.5 + 0.5
    if (this.idle > 1.6 && !calm) { const w = now / 1000; tx = 0.5 + Math.sin(w * 1.15) * 0.17 / Math.max(0.6, ar * 0.7); ty = 0.6 + Math.sin(w * 2.3 + 0.6) * 0.1 }
    if (calm) { tx = 0.5; ty = 0.62 }
    this.q.copy(this.p); this.p.x = damp(this.p.x, tx, 11, dt); this.p.y = damp(this.p.y, ty, 11, dt)
    const sp = Math.min(1, this.p.distanceTo(this.q) / Math.max(dt, 1e-3) / 1.2)
    s.a.value.copy(this.q); s.b.value.copy(this.p); s.ar.value = ar; s.r.value = full > 0.98 ? 0 : 0.13 + sp * 0.07; s.k.value = Math.exp(-dt * 1.05); s.tm.value = now / 1000; s.t.value = this.rt[0].texture
    r.setRenderTarget(this.rt[1]); r.render(this.sim, this.cam); r.setRenderTarget(null); this.rt.reverse()
    u.m.value = this.rt[0].texture; u.ar.value = ar; u.full.value = full; u.show.value = show; u.crop.value = crop; u.tm.value = now / 1000
    const z = ar < 0.9 ? 0.74 : 0.97; u.zoom.value = z * (1 + (1 - show) * 0.06)
    u.off.value.set(-px * 0.006, 0)
  }
}
