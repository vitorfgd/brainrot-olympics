import { JUDGES, STAGES, gradeRank, isEndlessUnlocked, isStageUnlocked } from './rules.js'
import { applyInputCommandToPointer } from './commands.js'
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
import {
  notifyScreenChanged,
  requestAudioUnlock,
  requestMenuMusic,
  requestMusicSettingsSync,
  requestSound,
  requestStopMenuMusic,
} from './events.js'
import { buildRenderState } from './renderState.js'

export function updateGame(state) {
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
  updateScreenEvent(state)
  state.renderState = buildRenderState(state)
}

export function handleGameCommand(state, command) {
  if (command.type === 'uiAction') {
    requestAudioUnlock(state)
    handleUiAction(state, command.actionId)
    return
  }
  applyInputCommandToPointer(state, command)
  if (command.type === 'pointerDown') handlePointerDown(state)
  else if (command.type === 'pointerMove') handlePointerMove(state)
  else if (command.type === 'pointerUp' || command.type === 'pointerCancel') handlePointerUp(state)
}

export function handlePointerDown(state) {
  requestAudioUnlock(state)
  const button = findButton(state)

  if (state.screen === 'run' && state.run?.status === 'continueOffer') {
    if (button) handleUiAction(state, button.id)
    return
  }

  if (state.screen === 'boostSelect') {
    if (button) handleUiAction(state, button.id)
    return
  }

  if (state.screen === 'run') {
    handleRunPointerDown(state)
    return
  }

  if (!button) return
  handleUiAction(state, button.id)
}

export function handleUiAction(state, actionId) {
  if (!isKnownAction(actionId)) return false
  if (!isToggleButton(actionId)) {
    if (isCancelButton(actionId)) playCancelClick(state)
    else playClick(state)
  }

  if (actionId === 'continueBuy') {
    acceptContinue(state)
    return true
  }
  if (actionId === 'continueDecline') {
    declineContinue(state)
    return true
  }
  if (actionId === 'boostToggleDouble') {
    state.boostSelectUseDoubleCoins = !state.boostSelectUseDoubleCoins
    return true
  }
  if (actionId === 'boostToggleShield') {
    state.boostSelectUseComboShield = !state.boostSelectUseComboShield
    return true
  }
  if (actionId === 'boostSelectGo') {
    commitBoostSelection(state)
    return true
  }
  if (actionId === 'boostSelectCancel') {
    cancelBoostSelection(state)
    return true
  }
  if (actionId === 'playEndless') {
    if (!isEndlessUnlocked(state.save)) {
      showToast(state, `Clear Stage ${STAGES.length} to unlock Endless`)
      return true
    }
    beginRunWithBoostFlow(state, { kind: 'endless' })
    return true
  }
  if (actionId === 'playEndlessLocked') {
    showToast(state, `Clear Stage ${STAGES.length} to unlock Endless`)
    return true
  }
  if (actionId === 'stageSelect') {
    state.screen = 'stageSelect'
    return true
  }
  if (actionId === 'leaderboard') {
    state.screen = 'leaderboard'
    return true
  }
  if (actionId === 'shop') {
    state.screen = 'shop'
    state.shopSelectedJudgeId ||= JUDGES[0]?.id || 'blingbeak'
    return true
  }
  if (actionId === 'settings') {
    state.screen = 'settings'
    return true
  }
  if (actionId === 'back' || actionId === 'resultsHome') {
    if (state.screen === 'results' && state.run?.ftue && state.run.completed) {
      state.save.ftueCompleted = true
      persistSave(state)
    }
    state.screen = 'home'
    return true
  }
  if (actionId.startsWith('stage:')) {
    const stageId = Number(actionId.split(':')[1])
    if (!isStageUnlocked(state.save, stageId)) {
      showToast(state, `Clear Stage ${stageId - 1} to unlock`)
      return true
    }
    beginRunWithBoostFlow(state, {
      kind: 'stage',
      stageId,
      ftue: false,
    })
    return true
  }
  if (actionId.startsWith('skin:')) {
    const [, judgeId, skinId] = actionId.split(':')
    buyOrEquipSkin(state, judgeId, skinId)
    return true
  }
  if (actionId.startsWith('shopJudge:')) {
    const judgeId = actionId.split(':')[1]
    if (JUDGES.some((judge) => judge.id === judgeId)) {
      state.shopSelectedJudgeId = judgeId
    }
    return true
  }
  if (actionId.startsWith('boost:')) {
    buyBoostProduct(state, actionId.split(':')[1])
    return true
  }
  if (actionId === 'toggleMusic') {
    const enabled = !state.save.settings.music
    playToggleClick(state, enabled)
    state.save.settings.music = enabled
    requestMusicSettingsSync(state, state.save.settings.music)
    persistSave(state)
    showToast(state, `Music ${state.save.settings.music ? 'on' : 'off'}`)
    return true
  }
  if (actionId === 'toggleSfx') {
    const enabled = !state.save.settings.sfx
    if (!enabled) playToggleClick(state, enabled)
    state.save.settings.sfx = enabled
    persistSave(state)
    if (enabled) playToggleClick(state, enabled)
    showToast(state, `SFX ${state.save.settings.sfx ? 'on' : 'off'}`)
    return true
  }
  if (actionId === 'tryAgain') {
    const run = state.run
    if (run?.mode === 'stage' && run.completed) {
      const canAdvance = run.stage.id === 1 || gradeRank(run.grade) >= gradeRank('B')
      if (canAdvance) {
        if (run.ftue) {
          state.save.ftueCompleted = true
          persistSave(state)
        }
        const nextId = run.stage.id + 1
        if (nextId <= STAGES.length) {
          beginRunWithBoostFlow(state, { kind: 'stage', stageId: nextId, ftue: false })
          return true
        }
        state.screen = 'stageSelect'
        return true
      }
      beginRunWithBoostFlow(state, { kind: 'stage', stageId: run.stage.id })
    } else if (run?.mode === 'stage') beginRunWithBoostFlow(state, { kind: 'stage', stageId: run.stage.id })
    else beginRunWithBoostFlow(state, { kind: 'endless' })
    return true
  }
  if (actionId === 'ftueNextStage') {
    state.save.ftueCompleted = true
    persistSave(state)
    beginRunWithBoostFlow(state, { kind: 'stage', stageId: 2, ftue: false })
    return true
  }
  if (actionId === 'ftueContinue') {
    const run = state.run
    if (!run?.completed) {
      startStageRun(state, run?.stage?.id || 1, { ftue: true })
    }
    return true
  }
  return false
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
  requestSound(state, 'click')
}

function playCancelClick(state) {
  requestSound(state, 'cancelClick')
}

function playToggleClick(state, enabled) {
  requestSound(state, enabled ? 'click' : 'cancelClick')
}

function isCancelButton(id) {
  return id === 'back' || id === 'resultsHome' || id === 'continueDecline' || id === 'boostSelectCancel'
}

function isToggleButton(id) {
  return id === 'toggleMusic' || id === 'toggleSfx'
}

function isKnownAction(id) {
  return (
    id === 'continueBuy'
    || id === 'continueDecline'
    || id === 'boostToggleDouble'
    || id === 'boostToggleShield'
    || id === 'boostSelectGo'
    || id === 'boostSelectCancel'
    || id === 'playEndless'
    || id === 'playEndlessLocked'
    || id === 'stageSelect'
    || id === 'leaderboard'
    || id === 'shop'
    || id === 'settings'
    || id === 'back'
    || id === 'resultsHome'
    || id === 'toggleMusic'
    || id === 'toggleSfx'
    || id === 'tryAgain'
    || id === 'ftueNextStage'
    || id === 'ftueContinue'
    || id.startsWith('stage:')
    || id.startsWith('skin:')
    || id.startsWith('shopJudge:')
    || id.startsWith('boost:')
  )
}

function syncMenuMusic(state) {
  if (isMenuMusicScreen(state.screen)) requestMenuMusic(state, state.save.settings.music)
  else requestStopMenuMusic(state)
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
  requestSound(state, sfx)
}

function updateScreenEvent(state) {
  if (state.eventedScreen === state.screen) return
  state.eventedScreen = state.screen
  notifyScreenChanged(state, state.screen)
}

