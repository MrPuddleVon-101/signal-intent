/** One print with two sides. It turns in the dark, and the other side is the idea. */
import * as THREE from 'three'
import { photo, TRUE_COLOUR } from './util'
const W = 4, H = 5
export class Portraits {
  readonly group = new THREE.Group()
  readonly textures: THREE.Texture[]
  readonly ready: Promise<unknown>
  private box: THREE.Mesh
  private slab = new THREE.Group()
  private faces: THREE.ShaderMaterial[] = []
  private edge = new THREE.MeshStandardMaterial({ color: '#050506', metalness: 0.2, roughness: 0.6, envMapIntensity: 0.4 })
  constructor() {
    const pr: Promise<unknown>[] = [], a = photo('./img/real/rev_p.webp', pr), b = photo('./img/real/semg.webp', pr)
    this.textures = [a, b]; this.ready = Promise.all(pr)
    const face = (t: THREE.Texture, z: number) => {
      const m = new THREE.ShaderMaterial({ transparent: true, uniforms: { t: { value: t }, o: { value: 0 }, back: { value: z < 0 ? 1 : 0 } },
        vertexShader: 'varying vec2 v;varying vec3 n,p;void main(){v=uv;n=normalMatrix*normal;vec4 m=modelViewMatrix*vec4(position,1.);p=m.xyz;gl_Position=projectionMatrix*m;}',
        fragmentShader: TRUE_COLOUR + `varying vec2 v;varying vec3 n,p;uniform sampler2D t;uniform float o,back;void main(){
          vec3 c=texture2D(t,v,-.5).rgb;vec3 N=normalize(n),V=normalize(-p);float f=max(dot(N,V),0.);
          float gl=pow(max(0.,1.-abs(dot(reflect(-V,N),normalize(vec3(.55,.5,.67)))-.97)*9.),3.)*.1*(1.-f*f);
          vec2 e=min(v,1.-v);c*=mix(1.,smoothstep(0.,.2,e.x)*smoothstep(0.,.06,1.-v.y)*smoothstep(0.,.09,v.y),back);gl_FragColor=vec4((un(c)*(.12+.88*smoothstep(0.,.9,f))+vec3(gl)*(1.-back)),o*mix(1.,clamp(max(c.r,max(c.g,c.b))*9.-.1,0.,1.),back));}` })
      this.faces.push(m); const q = new THREE.Mesh(new THREE.PlaneGeometry(W, H), m); q.position.z = z; if (z < 0) q.rotation.y = Math.PI; return q
    }
    this.box = new THREE.Mesh(new THREE.BoxGeometry(W + 0.03, H + 0.03, 0.16), this.edge)
    this.slab.add(this.box, face(a, 0.082), face(b, -0.082)); this.group.add(this.slab)
  }
  update(light: number, turn: number) {
    this.group.visible = light > 0.002
    this.slab.rotation.y = turn
    this.faces.forEach((m) => { m.uniforms.o.value = light }); this.edge.envMapIntensity = 0.4 * light; this.box.visible = light > 0.98 && Math.cos(turn) > -0.35
  }
}
