/** Mood keys drive procedural motion in render (no sprite sheets yet). */
export function activeMoodForHit(quality, milestone) {
  if (quality === 'miss') return { kind: 'wince', span: 0.55 }
  if (milestone) return { kind: 'hype', span: 1.35 }
  if (quality === 'perfect') return { kind: 'hype', span: 0.42 }
  if (quality === 'good') return { kind: 'nod', span: 0.36 }
  return { kind: 'nod', span: 0.3 }
}

export function inactiveCheerMood() {
  return Math.random() < 0.55 ? { kind: 'nod', span: 0.34 } : { kind: 'hype', span: 0.3 }
}
