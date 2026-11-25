/** The arm as one dark, polished sculpture. Its surface can turn to glass, and the muscle inside is made of solid strands. */
import * as THREE from 'three'
import { SOURCES } from '../model/generator'
import { radii, strand } from './anatomy'
import { TO_ARM, type Hand } from './hand'
export const DRIVE_W = 256
const SKIN_V = `attribute vec4 aI,aW;uniform mat4 uBones[25];uniform mat4 uHand;varying vec3 vWp;varying float vNear,vArm;\n`
export class Flesh {
  readonly group = new THREE.Group()
  readonly drive = new Uint8Array(DRIVE_W * SOURCES)
  private tex = new THREE.DataTexture(this.drive, DRIVE_W, SOURCES, THREE.RedFormat)
  readonly u: Record<string, THREE.IUniform> = { uBones: { value: [] }, uHand: { value: new THREE.Matrix4() }, uSkin: { value: 1 }, uFib: { value: 0 }, uPulse: { value: 0 }, uManual: { value: 0 }, uT: { value: 0 }, uTime: { value: 0 }, uDrive: { value: null }, uPinch: { value: new THREE.Vector4() } }
  readonly skin = new THREE.MeshPhysicalMaterial({ color: '#2b2d31', metalness: 0.15, roughness: 0.46, clearcoat: 0.55, clearcoatRoughness: 0.32, envMapIntensity: 1, transparent: true })
  readonly fibre = new THREE.MeshStandardMaterial({ color: '#8d939e', metalness: 0.2, roughness: 0.3, envMapIntensity: 1.2 })
  private strands!: THREE.Mesh
  private shell!: THREE.Mesh
  constructor() { this.tex.minFilter = this.tex.magFilter = THREE.LinearFilter; this.u.uDrive.value = this.tex }
  bind(hand: Hand, low: boolean) {
    const inv = TO_ARM.clone().invert(), v = new THREE.Vector3(), n = new THREE.Vector3(), g = hand.geometry
    this.u.uBones.value = hand.mats
    const P = g.getAttribute('position'), N = g.getAttribute('normal'), SI = g.getAttribute('skinIndex'), SW = g.getAttribute('skinWeight')
    const pos = Array.from(P.array as Float32Array), nor = Array.from(N.array as Float32Array), si = Array.from(SI.array as ArrayLike<number>), sw = Array.from(SW.array as Float32Array), idx = Array.from(g.index!.array as ArrayLike<number>)
    // forearm: one smooth lathe that begins under the band
    const base = pos.length / 3, A = 80, R = 46
    for (let i = 0; i <= R; i++) { const d = -0.2 + Math.pow(i / R, 1.2) * 11.5, [ry, rz] = radii(Math.max(0, d)), [ry2, rz2] = radii(Math.max(0, d) + 0.05), k = 1 - 0.12 * Math.max(0, 0.2 - d)
      for (let j = 0; j <= A; j++) { const a = (j / A) * 6.28319, c = Math.cos(a), s = Math.sin(a), tend = 1 + 0.035 * Math.exp(-d * 0.7) * Math.cos(a * 5 + 0.6)
        v.set(-d, c * ry * k * tend, s * rz * k * tend).applyMatrix4(inv); n.set((((ry2 - ry) / 0.05) * c * c + ((rz2 - rz) / 0.05) * s * s), c / ry, s / rz).normalize().transformDirection(inv)
        pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z); si.push(0, 0, 0, 0); sw.push(1, 0, 0, 0) } }
    for (let i = 0; i < R; i++) for (let j = 0; j < A; j++) { const a = base + i * (A + 1) + j, b = a + A + 1; idx.push(a, b, a + 1, b, b + 1, a + 1) }
    const G = new THREE.BufferGeometry()
    G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); G.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); G.setAttribute('aI', new THREE.Float32BufferAttribute(si, 4)); G.setAttribute('aW', new THREE.Float32BufferAttribute(sw, 4)); G.setIndex(idx)
    this.skin.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, this.u)
      s.vertexShader = SKIN_V + s.vertexShader
        .replace('#include <beginnormal_vertex>', 'mat4 B=uBones[int(aI.x)]*aW.x+uBones[int(aI.y)]*aW.y+uBones[int(aI.z)]*aW.z+uBones[int(aI.w)]*aW.w;vec3 objectNormal=normalize(mat3(uHand)*(mat3(B)*normal));')
        .replace('#include <begin_vertex>', 'vec3 transformed=(uHand*(B*vec4(position,1.))).xyz;vWp=transformed;vArm=20.*(position.y-.066);vNear=exp(-abs(position.y-.066)*34.);')
      s.fragmentShader = 'uniform float uSkin,uPulse;uniform vec4 uPinch;varying vec3 vWp;varying float vNear,vArm;\n' + s.fragmentShader
        .replace('#include <opaque_fragment>', `float fr=1.-abs(dot(normalize(vViewPosition),normal));float pi=exp(-dot(vWp-uPinch.xyz,vWp-uPinch.xyz)*5.)*uPinch.w;
          outgoingLight+=vec3(.62,.72,1.)*(vNear*uPulse*.16*(.3+fr)+pi*.3);
          outgoingLight=min(outgoingLight,vec3(2.));
          float gl=pow(fr,2.2);outgoingLight=mix(outgoingLight*(.35+gl)+vec3(.5,.6,.85)*gl*.35,outgoingLight,uSkin);diffuseColor.a=mix(clamp(.06+gl*.75,0.,1.),1.,uSkin);float af=smoothstep(10.,5.5,vArm);outgoingLight*=af;diffuseColor.a*=smoothstep(0.,.5,af);
          #include <opaque_fragment>`)
    }
    this.shell = new THREE.Mesh(G, this.skin); this.shell.frustumCulled = false; this.shell.renderOrder = 3
    // strands: thick, few, glossy
    const F = low ? 9 : 16, L = low ? 60 : 96, S = 7, fp: number[] = [], fn: number[] = [], fk: number[] = [], fi: number[] = []
    const T = new THREE.Vector3(), U = new THREE.Vector3(), W = new THREE.Vector3(), up = new THREE.Vector3(0.2, 1, 0.1), c = new THREE.Vector3(), q = new THREE.Vector3()
    for (let s = 0; s < SOURCES; s++) for (let f = 0; f < F; f++) {
      const b0 = fp.length / 3, zz = ((f * 0.618 + s * 0.31) % 1)
      for (let i = 0; i <= L; i++) {
        const t = i / L; c.fromArray(strand(s, f, t).p); q.fromArray(strand(s, f, Math.min(1, t + 0.004)).p); if (i === L) q.copy(c).add(new THREE.Vector3(0.01, 0, 0))
        T.subVectors(q, c).normalize(); U.crossVectors(T, up).normalize(); W.crossVectors(T, U)
        const d = Math.max(0, -c.x), belly = Math.exp(-(((d - 4.1) / 2.3) ** 2)), r = (0.018 + 0.058 * belly * (0.6 + 0.6 * zz)) * Math.min(1, t * 14) * Math.min(1, (1 - t) * 14)
        for (let j = 0; j < S; j++) { const a = (j / S) * 6.28319; n.copy(U).multiplyScalar(Math.cos(a)).addScaledVector(W, Math.sin(a)); v.copy(c).addScaledVector(n, r); v.applyMatrix4(inv); n.transformDirection(inv); fp.push(v.x, v.y, v.z); fn.push(n.x, n.y, n.z); fk.push(t, s, zz) }
      }
      for (let i = 0; i < L; i++) for (let j = 0; j < S; j++) { const a = b0 + i * S + j, b = b0 + i * S + ((j + 1) % S); fi.push(a, b, a + S, b, b + S, a + S) }
    }
    const H = new THREE.BufferGeometry(); H.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); H.setAttribute('normal', new THREE.Float32BufferAttribute(fn, 3)); H.setAttribute('aK', new THREE.Float32BufferAttribute(fk, 3)); H.setIndex(fi)
    this.fibre.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, this.u)
      s.vertexShader = 'attribute vec3 aK;varying vec3 vK;uniform mat4 uHand;\n' + s.vertexShader.replace('#include <beginnormal_vertex>', 'vec3 objectNormal=normalize(mat3(uHand)*normal);').replace('#include <begin_vertex>', 'vK=aK;vec3 transformed=(uHand*vec4(position,1.)).xyz;')
      s.fragmentShader = 'varying vec3 vK;uniform float uT,uTime,uManual,uFib;uniform sampler2D uDrive;\n' + s.fragmentShader.replace('#include <opaque_fragment>', `
        float dr=texture2D(uDrive,vec2(clamp(uT-abs(vK.x-.5)*.2,0.,1.),(vK.y+.5)/${SOURCES}.)).r;float run=fract(vK.x*1.6-uTime*.3-vK.z*3.7-vK.y*.17);float sp=smoothstep(.6,.98,run)*smoothstep(1.,.985,run);
        float ac=max(dr,uManual*smoothstep(0.,.2,uManual*1.15-fract(vK.y*.37+vK.z*.6)));
        outgoingLight=outgoingLight*(.55+.45*uFib)*(.75+.5*vK.z)+vec3(.45,.58,1.)*(sp*.22+ac*(.5+sp*1.3))*uFib;outgoingLight=min(outgoingLight,vec3(1.6));
        outgoingLight*=smoothstep(26.,4.,length(vViewPosition));
        #include <opaque_fragment>`)
    }
    this.strands = new THREE.Mesh(H, this.fibre); this.strands.frustumCulled = false; this.strands.renderOrder = 1
    this.group.add(this.strands, this.shell)
  }
  /** skin 1: solid sculpture. skin 0: glass over muscle. */
  show(v: number, skin: number, inside: boolean) {
    this.group.visible = v > 0.004; if (!this.group.visible) return
    this.u.uSkin.value = skin; this.strands.visible = skin < 0.995 || inside; this.shell.visible = !inside || skin > 0.02
    this.skin.depthWrite = skin > 0.6; this.group.scale.setScalar(1)
  }
  load(drive: Float32Array[]) {
    for (let s = 0; s < SOURCES; s++) for (let i = 0; i < DRIVE_W; i++) this.drive[s * DRIVE_W + i] = Math.min(255, Math.max(0, (drive[s][Math.min(drive[s].length - 1, Math.floor((i / DRIVE_W) * drive[s].length))] - 0.05) * 225))
    this.tex.needsUpdate = true
  }
}
