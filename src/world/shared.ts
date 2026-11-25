import type { World } from './World'
/** Small bridge so the page never has to wait for the 3D bundle. */
export const pointer = { x: 0, y: 0, down: false }
export const manual = { effort: 0 }
export const scroll = { y: 0, v: 0 }
export const world: { w: World | null } = { w: null }
/** Elements that want to be liquid glass. Their rectangles are handed to the final shader. */
export const glassEls = new Set<HTMLElement>()
