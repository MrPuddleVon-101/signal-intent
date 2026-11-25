import * as THREE from 'three'
const VERT = `varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}`
const tri = new THREE.BufferGeometry()
tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
tri.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2))
const LEVELS = 4
export const MAX_GLASS = 3
/** HDR render, small bloom, filmic curve, and liquid glass computed right here instead of by the browser. */
export class Post {
  private scene = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4, depthBuffer: true })
  private mips = Array.from({ length: LEVELS }, () => new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false }))
  private quad = new THREE.Mesh(tri)
  private qs = new THREE.Scene()
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private down: THREE.ShaderMaterial
  private up: THREE.ShaderMaterial
  readonly final: THREE.ShaderMaterial
  readonly glass = Array.from({ length: MAX_GLASS }, () => new THREE.Vector4(0, 0, 0, 0))
  constructor(private r: THREE.WebGLRenderer, samples: number) {
    this.scene.samples = samples
    this.quad.frustumCulled = false
    this.qs.add(this.quad)
    const base = { vertexShader: VERT, depthTest: false, depthWrite: false, toneMapped: false }
    this.down = new THREE.ShaderMaterial({ ...base, uniforms: { t: { value: null }, px: { value: new THREE.Vector2() }, first: { value: 0 } }, fragmentShader: `
varying vec2 v;uniform sampler2D t;uniform vec2 px;uniform float first;
vec3 s(vec2 o){vec3 c=texture2D(t,v+o*px).rgb;if(!(dot(c,c)<1e7))c=vec3(0);if(first>.5){float l=max(c.r,max(c.g,c.b));c*=smoothstep(.55,2.6,l);c=min(c,vec3(8.));}return c;}
void main(){vec3 c=s(vec2(0))*2.+s(vec2(1,1))+s(vec2(-1,1))+s(vec2(1,-1))+s(vec2(-1,-1))+s(vec2(2,0))*.5+s(vec2(-2,0))*.5+s(vec2(0,2))*.5+s(vec2(0,-2))*.5;gl_FragColor=vec4(c/8.,1.);}` })
    this.up = new THREE.ShaderMaterial({ ...base, uniforms: { t: { value: null }, px: { value: new THREE.Vector2() } }, transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, fragmentShader: `
varying vec2 v;uniform sampler2D t;uniform vec2 px;
void main(){vec3 c=2.*(texture2D(t,v+px).rgb+texture2D(t,v-px).rgb+texture2D(t,v+px*vec2(1,-1)).rgb+texture2D(t,v+px*vec2(-1,1)).rgb);gl_FragColor=vec4(c/8.*.85,1.);}` })
    this.final = new THREE.ShaderMaterial({
      ...base, transparent: true, blending: THREE.NoBlending,
      uniforms: { t: { value: null }, b: { value: null }, bloom: { value: 0.3 }, time: { value: 0 }, res: { value: new THREE.Vector2() }, gl: { value: this.glass }, gA: { value: new THREE.Color(0x050506) }, expo: { value: 1 }, fr: { value: 0 }, frS: { value: new THREE.Vector2(0.5, 0.5) }, vel: { value: 0 }, fla: { value: new THREE.Vector4(0.5, 0.5, 0, 0) } },
      fragmentShader: `
varying vec2 v;uniform sampler2D t,b;uniform float bloom,time;uniform vec2 res;uniform vec4 gl[${MAX_GLASS}];uniform vec3 gA;uniform float expo,fr,vel;uniform vec2 frS;uniform vec4 fla;float sh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}vec3 sky(vec2 uv){return gA;}
vec3 curve(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
const vec3 PAPER=vec3(.925,.932,.94);
// the whole film can shrink to a framed print on white paper
float card(vec2 p){if(fr<=.0005)return 1.;vec2 h=frS*.5*res,q0=(p-.5)*res;float rad=min(fr*30.,16.);vec2 q=abs(q0)-(h-rad);float d=length(max(q,0.))+min(max(q.x,q.y),0.)-rad;return smoothstep(.8,-.8,d);}
vec2 zm(vec2 p){if(fr<=.0005)return p;float k=max(frS.x,frS.y);return (p-.5)/k+.5;}
// the light arrives
vec3 flare(vec2 p){if(fla.z<=.001)return vec3(0);vec2 q=(p-fla.xy)*vec2(res.x/res.y,1.);float d=length(q);float core=exp(-d*d*90.)*2.4+exp(-d*7.)*.8+exp(-d*2.2)*.34;float st=exp(-abs(q.y)*46.)*exp(-abs(q.x)*1.5)*1.1+exp(-abs(q.x)*70.)*exp(-abs(q.y)*5.)*.25;float halo=exp(-pow((d-.34)*22.,2.))*.07;return (vec3(.93,.96,1.)*core+vec3(.75,.85,1.)*st+vec3(.6,.75,1.)*halo)*fla.z;}
vec4 pic(sampler2D s,vec2 p){vec4 c;if(abs(vel)>.002){vec2 q=p-.5;vec2 o=q*dot(q,q)*vel*.06;c=texture2D(s,p);c.r=texture2D(s,p-o).r;c.b=texture2D(s,p+o).b;}else c=texture2D(s,p);return c;}
void main(){
  vec2 uv=v;float inside=0.,lift=0.,spec=0.;vec2 px=v*res;vec2 off=vec2(0);
  for(int i=0;i<${MAX_GLASS};i++){vec4 g=gl[i];if(g.z<2.)continue;
    vec2 h=g.zw*.5,q0=px-g.xy-h;float rad=min(h.y,34.);vec2 q=abs(q0)-(h-rad);
    float l=length(max(q,0.));float d=l+min(max(q.x,q.y),0.)-rad;
    if(d<1.){
      vec2 n=l>.001?max(q,0.)/l*sign(q0):(q.x>q.y?vec2(sign(q0.x),0.):vec2(0.,sign(q0.y)));
      float k=clamp(1.+d/22.,0.,1.);k=k*k*k;
      off=-n*k*46./res;inside=smoothstep(1.,-.5,d);
      float facing=dot(n,normalize(vec2(-.45,.9)));
      spec=k*k*(pow(max(facing,0.),6.)*.34+pow(max(-facing,0.),8.)*.12);lift=.03;}}
  vec4 c;vec3 g;
  if(inside>0.){
    uv=v+off;float cd=card(uv);vec2 uz=zm(uv);vec2 o=1.6/res;
    c=texture2D(t,uz)*.36+(texture2D(t,uz+o)+texture2D(t,uz-o)+texture2D(t,uz+o*vec2(1,-1))+texture2D(t,uz+o*vec2(-1,1)))*.16;
    g=texture2D(b,uz).rgb*bloom;
    vec3 col=srgb(curve((c.rgb+g)*expo+flare(uz)));
    vec3 sk=sky(uv);
    vec3 full=col+sk*(1.-clamp(c.a,0.,1.));
    full=mix(PAPER,full,cd);
    full=mix(full,vec3(dot(full,vec3(.3,.6,.1))),-.18);
    full=full*.9+lift*.7+spec*.8;
    vec4 o0=texture2D(t,zm(v));vec3 oc=srgb(curve((o0.rgb+g)*expo+flare(v)));vec4 ob=mix(vec4(PAPER,1.),vec4(oc,clamp(max(o0.a,max(oc.r,max(oc.g,oc.b))),0.,1.)),card(v));
    gl_FragColor=mix(ob,vec4(full,1.),inside);return;}
  vec2 z=zm(v);c=pic(t,z);if(!(dot(c.rgb,c.rgb)<1e7))c.rgb=vec3(0);g=texture2D(b,z).rgb*bloom;
  vec3 col=srgb(curve((c.rgb+g)*expo+flare(z)));
  col+=(sh(gl_FragCoord.xy+time)-.5)/200.*c.a;
  col=clamp(col,0.,1.);
  vec4 oo=vec4(col,clamp(max(c.a,max(col.r,max(col.g,col.b))),0.,1.));gl_FragColor=mix(vec4(PAPER,1.),oo,card(v));}`,
    })
  }
  size(w: number, h: number, dpr: number) {
    const W = Math.max(2, Math.round(w * dpr)), H = Math.max(2, Math.round(h * dpr))
    this.scene.setSize(W, H)
    this.mips.forEach((m, i) => m.setSize(Math.max(2, W >> (i + 2)), Math.max(2, H >> (i + 2))))
    this.final.uniforms.res.value.set(w, h)
  }
  private pass(m: THREE.ShaderMaterial, to: THREE.WebGLRenderTarget | null) { this.quad.material = m; this.r.setRenderTarget(to); this.r.render(this.qs, this.cam) }
  render(scene: THREE.Scene, cam: THREE.Camera) {
    const r = this.r
    r.setRenderTarget(this.scene); r.setClearColor(0, 0); r.clear(); r.render(scene, cam)
    r.autoClear = false
    let src = this.scene
    this.mips.forEach((m, i) => {
      this.down.uniforms.t.value = src.texture; this.down.uniforms.px.value.set((i ? 1 : 2) / src.width, (i ? 1 : 2) / src.height); this.down.uniforms.first.value = i ? 0 : 1
      this.pass(this.down, m); src = m
    })
    for (let i = LEVELS - 1; i > 0; i--) {
      this.up.uniforms.t.value = this.mips[i].texture; this.up.uniforms.px.value.set(1 / this.mips[i].width, 1 / this.mips[i].height)
      this.pass(this.up, this.mips[i - 1])
    }
    this.final.uniforms.t.value = this.scene.texture; this.final.uniforms.b.value = this.mips[0].texture
    this.pass(this.final, null)
    r.autoClear = true
  }
}
