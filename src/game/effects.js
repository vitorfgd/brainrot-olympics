export function emitEffect(state, effect) {
  state.effects ??= []
  state.effects.push(effect)
}

export function applyQueuedEffects(state) {
  const effects = state.effects || []
  if (!effects.length) return
  state.effects = []

  for (const effect of effects) {
    const run = state.run
    if (effect.type === 'hitStop' && run) {
      run.hitStopStartedAt = effect.startedAt
      run.hitStopUntil = effect.until
    } else if (effect.type === 'hpPulse' && run) {
      run.hpPulseStartedAt = effect.startedAt
      run.hpPulseUntil = effect.until
      run.hpPulseColor = effect.color
    } else if (effect.type === 'firework') {
      state.fireworks ??= []
      state.fireworks.push({
        x: effect.x,
        y: effect.y,
        size: effect.size,
        age: 0,
        life: effect.life,
        alpha: effect.alpha,
        hit: Boolean(effect.hit),
      })
    }
  }
}
