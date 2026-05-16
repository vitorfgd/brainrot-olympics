export function createRandomSource(seed = null) {
  if (seed == null) return Math.random
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomFloat(rng, min = 0, max = 1) {
  return min + rng() * (max - min)
}

export function randomInt(rng, min, maxExclusive) {
  return Math.floor(randomFloat(rng, min, maxExclusive))
}

export function randomChoice(rng, items) {
  if (!items.length) return null
  return items[randomInt(rng, 0, items.length)]
}
