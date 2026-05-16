import { JUDGES, STAGES, isStageUnlocked } from './rules.js'
import {
  acceptContinue,
  applyRunResults,
  beginRunWithBoostFlow,
  buyBoostProduct,
  buyOrEquipSkin,
  cancelBoostSelection,
  commitBoostSelection,
  declineContinue,
  persistSave,
  showToast,
  startStageRun,
} from './state.js'
import { handleRunPointerDown, handleRunPointerMove, handleRunPointerUp, updateRun } from './targets.js'

export function updateGame(state) {
  updateParticles(state)
  updateRun(state)

  const run = state.run
  if (run?.status === 'continueOffer' && state.time >= run.continueOfferUntil) {
    declineContinue(state)
  }

  if (run?.status === 'playing' && run.judgeMoodKind !== 'eliminated' && state.time >= run.judgeMoodUntil) {
    run.judgeMoodKind = 'idle'
  }

  if (state.screen === 'run' && run?.status === 'finished' && state.time >= run.resultReadyAt) {
    applyRunResults(state)
    state.screen = 'results'
  }
}

export function handlePointerDown(state) {
  const button = findButton(state)

  if (state.screen === 'run' && state.run?.status === 'continueOffer') {
    if (button?.id === 'continueBuy') {
      acceptContinue(state)
      return
    }
    if (button?.id === 'continueDecline') {
      declineContinue(state)
      return
    }
    return
  }

  if (state.screen === 'run' && state.run?.status === 'playing') {
    if (button?.id === 'runPause') {
      state.run.paused = true
      state.assets.pauseRunMusic()
      return
    }
  }

  if (state.screen === 'run' && state.run?.paused) {
    if (button?.id === 'runResume') {
      state.run.paused = false
      state.assets.resumeRunMusic(state.save.settings.music)
      return
    }
    return
  }

  if (state.screen === 'boostSelect') {
    if (button?.id === 'boostToggleDouble') {
      state.boostSelectUseDoubleCoins = !state.boostSelectUseDoubleCoins
      return
    }
    if (button?.id === 'boostToggleShield') {
      state.boostSelectUseComboShield = !state.boostSelectUseComboShield
      return
    }
    if (button?.id === 'boostSelectGo') {
      commitBoostSelection(state)
      return
    }
    if (button?.id === 'boostSelectCancel') {
      cancelBoostSelection(state)
      return
    }
    return
  }

  if (state.screen === 'run') {
    handleRunPointerDown(state)
    return
  }

  if (!button) return

  if (button.id === 'playEndless') {
    if (!state.save.ftueCompleted) {
      showToast(state, `Clear Stage ${STAGES.length} to unlock Endless`)
      return
    }
    beginRunWithBoostFlow(state, { kind: 'endless' })
    return
  }
  if (button.id === 'playEndlessLocked') {
    showToast(state, `Clear Stage ${STAGES.length} to unlock Endless`)
    return
  }
  if (button.id === 'stageSelect') {
    state.screen = 'stageSelect'
    return
  }
  if (button.id === 'leaderboard') {
    state.screen = 'leaderboard'
    return
  }
  if (button.id === 'shop' || button.id === 'resultsShop') {
    state.screen = 'shop'
    return
  }
  if (button.id === 'settings') {
    state.screen = 'settings'
    return
  }
  if (button.id === 'back' || button.id === 'resultsHome') {
    state.screen = 'home'
    return
  }
  if (button.id.startsWith('stage:')) {
    const stageId = Number(button.id.split(':')[1])
    if (!isStageUnlocked(state.save, stageId)) {
      showToast(state, `Clear Stage ${stageId - 1} to unlock`)
      return
    }
    beginRunWithBoostFlow(state, {
      kind: 'stage',
      stageId,
      ftue: !state.save.ftueCompleted,
    })
    return
  }
  if (button.id.startsWith('skin:')) {
    const [, judgeId, skinId] = button.id.split(':')
    buyOrEquipSkin(state, judgeId, skinId)
    return
  }
  if (button.id.startsWith('boost:')) {
    buyBoostProduct(state, button.id.split(':')[1])
    return
  }
  if (button.id === 'resultsShare') {
    shareRunResult(state)
    return
  }
  if (button.id === 'toggleMusic') {
    state.save.settings.music = !state.save.settings.music
    state.assets.setMusicEnabled(state.save.settings.music)
    persistSave(state.save)
    showToast(state, `Music ${state.save.settings.music ? 'on' : 'off'}`)
    return
  }
  if (button.id === 'toggleSfx') {
    state.save.settings.sfx = !state.save.settings.sfx
    persistSave(state.save)
    showToast(state, `SFX ${state.save.settings.sfx ? 'on' : 'off'}`)
    return
  }
  if (button.id === 'tryAgain') {
    const run = state.run
    if (run?.mode === 'stage') beginRunWithBoostFlow(state, { kind: 'stage', stageId: run.stage.id })
    else beginRunWithBoostFlow(state, { kind: 'endless' })
    return
  }
  if (button.id === 'ftueContinue') {
    const run = state.run
    if (!run?.completed) {
      startStageRun(state, run?.stage?.id || 1, { ftue: true })
      return
    }
    if (run.stage.id >= STAGES[STAGES.length - 1].id) {
      state.save.ftueCompleted = true
      persistSave(state.save)
      showToast(state, 'Tutorial complete')
      state.screen = 'home'
      return
    }
    startStageRun(state, run.stage.id + 1, { ftue: true })
    return
  }
}

export function handlePointerMove(state) {
  if (state.screen === 'boostSelect') return
  if (state.screen === 'run' && state.run?.paused) return
  if (state.screen === 'run') handleRunPointerMove(state)
}

export function handlePointerUp(state) {
  if (state.screen === 'boostSelect') return
  if (state.screen === 'run' && state.run?.paused) return
  if (state.screen === 'run') handleRunPointerUp(state)
}

function findButton(state) {
  const { x, y } = state.pointer
  for (let i = state.ui.buttons.length - 1; i >= 0; i -= 1) {
    const button = state.ui.buttons[i]
    if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
      return button
    }
  }
  return null
}

function updateParticles(state) {
  for (const particle of state.particles) {
    particle.age += state.deltaTime
    particle.x += particle.vx * state.deltaTime
    particle.y += particle.vy * state.deltaTime
    particle.vy += 130 * state.deltaTime
  }
  state.particles = state.particles.filter((particle) => particle.age < particle.life)
}

function shareRunResult(state) {
  const run = state.run
  if (!run) return
  const url = typeof window !== 'undefined' ? window.location.href : ''
  const modeLabel = run.mode === 'endless' ? 'Endless' : `Stage ${run.stage?.id || ''}`
  const text = `Brain Rot Olympics — ${modeLabel} | Score ${run.score} | Grade ${run.grade} | Best combo ${run.bestCombo}`
  const title = 'Brain Rot Olympics'
  const sharePayload = { title, text, url }
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    navigator.share(sharePayload).catch(() => copyShareFallback(state, text, url))
    return
  }
  copyShareFallback(state, text, url)
}

function copyShareFallback(state, text, url) {
  const body = `${text} ${url}`.trim()
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(body).then(
      () => showToast(state, 'Copied to clipboard'),
      () => showToast(state, 'Could not copy'),
    )
  } else {
    showToast(state, 'Share not available here')
  }
}
