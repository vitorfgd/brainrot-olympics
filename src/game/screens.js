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
import { applyQueuedEffects } from './effects.js'

export function updateGame(state) {
  updateFireworks(state)
  updateRun(state)
  applyQueuedEffects(state)

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

  updateResultsSfx(state)
  syncMenuMusic(state)
}

export function handlePointerDown(state) {
  state.assets.unlockAudio?.()
  const button = findButton(state)

  if (state.screen === 'run' && state.run?.status === 'continueOffer') {
    if (button?.id === 'continueBuy') {
      playClick(state)
      acceptContinue(state)
      return
    }
    if (button?.id === 'continueDecline') {
      playCancelClick(state)
      declineContinue(state)
      return
    }
    return
  }

  if (state.screen === 'boostSelect') {
    if (button?.id === 'boostToggleDouble') {
      playClick(state)
      state.boostSelectUseDoubleCoins = !state.boostSelectUseDoubleCoins
      return
    }
    if (button?.id === 'boostToggleShield') {
      playClick(state)
      state.boostSelectUseComboShield = !state.boostSelectUseComboShield
      return
    }
    if (button?.id === 'boostSelectGo') {
      playClick(state)
      commitBoostSelection(state)
      return
    }
    if (button?.id === 'boostSelectCancel') {
      playCancelClick(state)
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
  if (!isToggleButton(button.id)) {
    if (isCancelButton(button.id)) playCancelClick(state)
    else playClick(state)
  }

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
    const enabled = !state.save.settings.music
    playToggleClick(state, enabled)
    state.save.settings.music = enabled
    state.assets.setMusicEnabled(state.save.settings.music)
    persistSave(state.save)
    showToast(state, `Music ${state.save.settings.music ? 'on' : 'off'}`)
    return
  }
  if (button.id === 'toggleSfx') {
    const enabled = !state.save.settings.sfx
    if (!enabled) playToggleClick(state, enabled)
    state.save.settings.sfx = enabled
    persistSave(state.save)
    if (enabled) playToggleClick(state, enabled)
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

function playClick(state) {
  state.assets.playSfx('click', state.save.settings.sfx)
}

function playCancelClick(state) {
  state.assets.playSfx('cancelClick', state.save.settings.sfx)
}

function playToggleClick(state, enabled) {
  state.assets.playSfx(enabled ? 'click' : 'cancelClick', state.save.settings.sfx)
}

function isCancelButton(id) {
  return id === 'back' || id === 'resultsHome'
}

function isToggleButton(id) {
  return id === 'toggleMusic' || id === 'toggleSfx'
}

function syncMenuMusic(state) {
  if (isMenuMusicScreen(state.screen)) state.assets.startMenuMusic(state.save.settings.music)
  else state.assets.stopMenuMusic()
}

function isMenuMusicScreen(screen) {
  return screen === 'home' || screen === 'leaderboard' || screen === 'stageSelect' || screen === 'shop' || screen === 'settings' || screen === 'boostSelect' || screen === 'results'
}

function updateResultsSfx(state) {
  const run = state.screen === 'results' ? state.run : null
  if (!run?.resultsShownAt) return
  run.resultsSfx ??= {}
  const elapsed = state.time - run.resultsShownAt
  playResultSfxAt(state, run, elapsed, 'title', 0, 'gradeReveal')
  if (run.completed && run.grade !== 'FAILED') {
    playResultSfxAt(state, run, elapsed, 'medal', 0.16, 'medalPop')
    playResultSfxAt(state, run, elapsed, 'stats', 0.42, 'coinCountTick')
    playResultSfxAt(state, run, elapsed, 'coins', 0.96, 'coinRewardBurst')
  }
}

function playResultSfxAt(state, run, elapsed, id, at, sfx) {
  if (run.resultsSfx[id] || elapsed < at) return
  run.resultsSfx[id] = true
  state.assets.playSfx(sfx, state.save.settings.sfx)
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

