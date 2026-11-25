/** The product. One machined object, modelled in Blender (blender/export_glb.py), alive through the whole film. */
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { smooth } from './math'
export const RY = 0.64, RZ = 0.49
export const PARTS = ['sleeve', 'frame', 'flex', 'contacts', 'lid', 'core', 'base'] as const
type Part = (typeof PARTS)[number]
/** Where each part goes when the band opens along its axis, and when it starts. */
const OPEN: Record<Part, [number, number, number]> = { sleeve: [-1.9, 0, 0], frame: [-0.82, 0.04, 0], flex: [0.1, 0.1, 0], contacts: [0.94, 0.16, 0], lid: [1.95, 0.05, 0.36], core: [1.95, 0.1, 0], base: [1.95, 0.15, -0.36] }
const BRUSH = `float hs(vec3 p){return fract(sin(dot(p,vec3(12.99,78.23,37.72)))*43758.5);}
float ns(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hs(i),hs(i+vec3(1,0,0)),f.x),mix(hs(i+vec3(0,1,0)),hs(i+vec3(1,1,0)),f.x),f.y),mix(mix(hs(i+vec3(0,0,1)),hs(i+vec3(1,0,1)),f.x),mix(hs(i+vec3(0,1,1)),hs(i+vec3(1,1,1)),f.x),f.y),f.z);}`
function knit() {
  const N = 128, h = new Float32Array(N * N)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = Math.floor(y / 32), u = (((x + (r % 2) * 16) % 32) - 16) / 16, v = ((y % 32) - 16) / 16, k = u + v * 0.35, d = Math.sqrt(k * k * 1.2 + v * v * 1.05); h[y * N + x] = Math.max(0, 1 - d * d) * (0.86 + 0.14 * Math.sin((u * 6 + v * 3) * 3)) }
  const mk = (f: (at: (x: number, y: number) => number, x: number, y: number) => number[], srgb: boolean) => { const c = document.createElement('canvas'); c.width = c.height = N; const q = c.getContext('2d')!, im = q.createImageData(N, N), at = (x: number, y: number) => h[((y + N) % N) * N + ((x + N) % N)]; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) im.data.set([...f(at, x, y), 255], (y * N + x) * 4); q.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(38, 6.2); t.anisotropy = 16; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t }
  return { n: mk((at, x, y) => { const a = (at(x - 1, y) - at(x + 1, y)) * 5, b = (at(x, y - 1) - at(x, y + 1)) * 5, l = Math.hypot(a, b, 1); return [(a / l) * 127 + 128, (b / l) * 127 + 128, (1 / l) * 127 + 128] }, false), a: mk((at, x, y) => { const s = 50 + at(x, y) * 205; return [s, s, s] }, true) }
}
export class Band {
  readonly group = new THREE.Group()
  readonly parts = {} as Record<Part, THREE.Object3D>
  readonly anchor = new THREE.Object3D()
  readonly u = { uX: { value: 0 }, uE: { value: new Float32Array(8) }, uTime: { value: 0 }, uG: { value: 0 } }
  private open = 0
  async load() {
    const g = await new GLTFLoader().loadAsync('models/band.glb'), k = knit(), M = new Map<string, THREE.Material>()
    const std = (p: THREE.MeshStandardMaterialParameters, brush = 0, contact = false, glow = false) => this.dress(new THREE.MeshStandardMaterial(p), brush, contact, glow)
    M.set('titanium', std({ color: '#b4b3b0', metalness: 1, roughness: 0.27, envMapIntensity: 1.15 }, 1)); M.set('titanium_dark', std({ color: '#34363b', metalness: 1, roughness: 0.3, envMapIntensity: 1.2 }, 1))
    M.set('polished', std({ color: '#eceef0', metalness: 1, roughness: 0.06, envMapIntensity: 1.3 }, 0, false, true)); M.set('gold', std({ color: '#d9a35f', metalness: 1, roughness: 0.2, envMapIntensity: 1.25 }, 0.5))
    M.set('ceramic', std({ color: '#08080a', metalness: 0, roughness: 0.12, envMapIntensity: 1.1 })); M.set('core', std({ color: '#06070a', metalness: 0.3, roughness: 0.05, envMapIntensity: 1.5 }, 0, false, true)); M.set('film', std({ color: '#16171b', metalness: 0.5, roughness: 0.24, envMapIntensity: 1 }))
    M.set('cloth', std({ color: '#7b7d82', map: k.a, normalMap: k.n, normalScale: new THREE.Vector2(1.7, 1.7), roughness: 0.86, envMapIntensity: 0.85 }))
    M.set('contact', std({ color: '#f0f1f3', metalness: 1, roughness: 0.08, envMapIntensity: 1.3, emissive: '#9db4ff', emissiveIntensity: 0 }, 0, true))
    g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { const [part, mat] = m.name.split('__'); m.material = (part === 'contacts' && mat === 'polished' ? M.get('contact') : M.get(mat)) ?? M.get('titanium')!; m.frustumCulled = false } })
    for (const p of PARTS) { const o = g.scene.getObjectByName(p)!; this.parts[p] = o }
    this.group.add(g.scene, this.anchor); this.anchor.position.set(0, -RY, -0.2)
  }
  private dress(m: THREE.MeshStandardMaterial, brush: number, contact: boolean, glow: boolean) {
    m.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, this.u)
      s.vertexShader = 'varying vec3 vOb;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvOb=position;')
      s.fragmentShader = 'varying vec3 vOb;uniform float uX,uTime,uG;uniform float uE[8];\n' + (brush ? BRUSH + '\n' : '') + s.fragmentShader
        .replace('#include <roughnessmap_fragment>', brush ? `float an=atan(vOb.z,vOb.y);float b1=ns(vec3(an*9.,vOb.x*420.,1.)),b2=ns(vec3(an*26.,vOb.x*900.,4.));float br=(b1+b2*.6-.8)*${brush.toFixed(1)};float roughnessFactor=clamp(roughness+br*.16,.05,1.);` : 'float roughnessFactor=roughness;')
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + (brush ? '\nnormal=normalize(normal+vec3(br*.05,br*.02,0.));' : ''))
        .replace('#include <emissivemap_fragment>', contact ? `float ch=mod(floor(atan(vOb.z/${RZ},vOb.y/${RY})/.785398+.5)+8.,8.);float en=0.;for(int i=0;i<8;i++)if(abs(float(i)-ch)<.5)en=uE[i];totalEmissiveRadiance+=vec3(.5,.62,1.)*en;` : '')
        // x-ray: every part becomes light at its edges
        .replace('#include <opaque_fragment>', `outgoingLight=min(outgoingLight,vec3(1.7));${glow ? 'outgoingLight+=vec3(.86,.93,1.)*uG;' : ''}
          if(uX>.001){float f=1.-abs(dot(normalize(vViewPosition),normal));vec3 xr=mix(vec3(.02,.06,.3),vec3(.75,.86,1.),pow(f,1.6))+vec3(1.)*pow(f,6.)*.8;float scan=.5+.5*sin(vOb.x*70.-uTime*5.);xr*=.75+.25*scan;outgoingLight=mix(outgoingLight,xr,uX);}
          #include <opaque_fragment>`)
    }
    const id = `band${brush}${contact}${glow}`; m.customProgramCacheKey = () => id + (m.map ? 'k' : '')
    return m
  }
  pose(open: number, xray: number, env: number[], selected: number | null, time: number) {
    this.open = open; this.u.uX.value = xray; this.u.uTime.value = time
    for (let i = 0; i < 8; i++) this.u.uE.value[i] = Math.min(2.2, Math.max(0, (env[i] - 0.12) * 2.4)) + (selected === i ? 0.8 : 0)
    const zc = RZ + 0.085, order: Record<Part, number> = { lid: 0, core: 0.02, base: 0.04, contacts: 0.1, flex: 0.2, frame: 0.3, sleeve: 0.16 }
    for (const p of PARTS) { const t = smooth(order[p], order[p] + 0.62, open), o = OPEN[p], mod = p === 'lid' || p === 'core' || p === 'base'; this.parts[p].position.set(o[0] * t, o[1] * t, (o[2] - (mod ? zc : 0)) * t) }
  }
  partPoint(p: Part, out: THREE.Vector3) { const o = this.parts[p]; out.set(0, p === 'sleeve' || p === 'frame' || p === 'flex' || p === 'contacts' ? -RY : 0, p === 'lid' || p === 'core' || p === 'base' ? (RZ + 0.085) * 1 : 0); return o.localToWorld(out) }
  get opened() { return this.open }
}
