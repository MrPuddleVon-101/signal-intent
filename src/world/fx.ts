import * as THREE from 'three'
/** Two photographic studios: a black one with hard strips, and a white one with big soft sources and black flags. */
export function buildEnvironment(r: THREE.WebGLRenderer, light: boolean) {
  const s = new THREE.Scene(); s.background = new THREE.Color(light ? '#b9bec6' : '#050608')
  const panel = (w: number, h: number, c: string, k: number, p: [number, number, number]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...p); m.lookAt(0, 0, 0); s.add(m) }
  if (light) { panel(16, 9, '#ffffff', 3.2, [0, 10, 2]); panel(5, 12, '#ffffff', 2.4, [-10, 2, 4]); panel(3, 12, '#eef3ff', 3, [10, 1, 1]); panel(2.2, 14, '#000000', 1, [-6.5, 0, 9]); panel(1.6, 14, '#000000', 1, [5.5, 0, 10]); panel(16, 1.6, '#000000', 1, [0, -2.4, 10]); panel(14, 6, '#6f7684', 1, [0, -9, 0]) }
  else { panel(9, 2.4, '#ffffff', 4.2, [-1, 9, 2]); panel(0.9, 14, '#ffffff', 9, [-10, 1, 1]); panel(0.5, 14, '#dfe8ff', 9, [9, 1, -3]); panel(0.6, 10, '#ffffff', 4, [4, 0, 11]); panel(12, 1.2, '#8fa6ff', 1.6, [0, -9, 3]) }
  const g = new THREE.PMREMGenerator(r), t = g.fromScene(s, 0.012).texture; g.dispose(); return t
}
