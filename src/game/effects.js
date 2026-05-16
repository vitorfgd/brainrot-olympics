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
    }
  }
}
