import * as THREE from 'three'
export { clamp, damp, lerp, smooth } from './math'
export const BLUE = new THREE.Color('#86a4ff')
export const VOLT = new THREE.Color('#ffffff')
export const WHITE = new THREE.Color('#f3f6ff')
/** Adds light without adding coverage, so the page behind the canvas still shows through. */
export const additive = {
  transparent: true, depthWrite: false, blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
} as const
/** Caps a material's output. Thin HDR rims alias badly under MSAA; a ceiling keeps edges clean. */
export function ceiling<T extends THREE.Material>(m: T, v: number): T {
  const prev = m.onBeforeCompile
  m.onBeforeCompile = (s, r) => { prev?.call(m, s, r); s.fragmentShader = s.fragmentShader.replace('#include <opaque_fragment>', `outgoingLight=min(outgoingLight,vec3(${v.toFixed(2)}));\n#include <opaque_fragment>`) }
  m.customProgramCacheKey = () => 'cap' + v + m.uuid
  return m
}
export function rng(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647 } }
/** Photographs come out of the filmic curve exactly as they went in. */
export const TRUE_COLOUR = `vec3 un(vec3 y){y=min(y,vec3(.86));vec3 a=2.51-2.43*y,b=.03-.59*y,c=-.14*y;return (-b+sqrt(b*b-4.*a*c))/(2.*a);}
float h21(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return n2(p)*.5+n2(p*2.1+7.)*.25+n2(p*4.3+3.)*.125+n2(p*8.7)*.0625;}
`
export function photo(src: string, pr: Promise<unknown>[]) { const t = new THREE.Texture(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; pr.push(new THREE.ImageLoader().loadAsync(src).then(async (im) => { await im.decode?.().catch(() => {}); const M = matchMedia('(max-width: 820px)').matches ? 1400 : 4096; if (im.width > M) { const c = document.createElement('canvas'); c.width = M; c.height = Math.round(im.height * M / im.width); const x = c.getContext('2d')!; x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, c.width, c.height); t.image = c } else t.image = im; t.needsUpdate = true })); return t }
