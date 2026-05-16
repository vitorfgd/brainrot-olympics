import { JUDGES, LOGICAL_HEIGHT, LOGICAL_WIDTH, STAGES, gradeRank, isEndlessUnlocked, isStageUnlocked } from './rules.js'
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
  updateFireworks(state)
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
    run.resultsShownAt = state.time
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
    if (!isEndlessUnlocked(state.save)) {
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
  if (button.id === 'shop') {
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
      ftue: false,
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
    if (run?.mode === 'stage' && run.completed && gradeRank(run.grade) >= gradeRank('B')) {
      if (run.ftue) {
        state.save.ftueCompleted = true
        persistSave(state.save)
      }
      state.screen = 'stageSelect'
    } else if (run?.mode === 'stage') beginRunWithBoostFlow(state, { kind: 'stage', stageId: run.stage.id })
    else beginRunWithBoostFlow(state, { kind: 'endless' })
    return
  }
  if (button.id === 'ftueContinue') {
    const run = state.run
    if (!run?.completed) {
      startStageRun(state, run?.stage?.id || 1, { ftue: true })
      return
    }
    state.save.ftueCompleted = true
    persistSave(state.save)
    showToast(state, 'Levels unlocked')
    state.screen = 'home'
    return
  }
}

export function handlePointerMove(state) {
  if (state.screen === 'boostSelect') return
  if (state.screen === 'run') handleRunPointerMove(state)
}

export function handlePointerUp(state) {
  if (state.screen === 'boostSelect') return
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

function updateFireworks(state) {
  state.fireworks ??= []
  for (const firework of state.fireworks) {
    firework.age += state.deltaTime
  }
  state.fireworks = state.fireworks.filter((firework) => firework.age < firework.life)

  if (state.time < (state.nextAmbientFireworkAt || 0)) return

  const runIsPlaying = state.screen === 'run' && state.run?.status === 'playing'
  if (!runIsPlaying) {
    state.fireworks.push({
      x: 72 + Math.random() * (LOGICAL_WIDTH - 144),
      y: 92 + Math.random() * (LOGICAL_HEIGHT * 0.36),
      size: 128 + Math.random() * 92,
      age: 0,
      life: 0.95,
      alpha: 0.42,
      ambient: true,
    })
  }

  state.nextAmbientFireworkAt = state.time + 1.9 + Math.random() * 2.8
}

