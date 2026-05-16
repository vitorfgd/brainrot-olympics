import {
  BOOST_PRODUCTS,
  CONTINUE_COST,
  CONTINUE_HP_FRAC,
  CONTINUE_PROMPT_SECONDS,
  HIT_THEMES,
  JUDGES,
  STAGES,
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  MAX_HP,
  eliminationStamp,
  rankForEndlessScore,
  skinsForJudge,
} from './rules.js'

const SAVE_KEY = 'brainRotOlympics:v1'

const DEFAULT_SAVE = {
  ftueCompleted: false,
  coins: 0,
  highScore: 0,
  stageBests: {},
  ownedSkins: {},
  equippedSkins: {},
  equippedHitTheme: 'default',
  bankedExtraLife: 0,
  doubleCoinsRunsRemaining: 0,
  comboShieldRunsRemaining: 0,
  settings: {
    music: true,
    sfx: true,
  },
}

export function createGameState(canvas, ctx, assets) {
  const save = loadSave()
  for (const judge of JUDGES) {
    save.ownedSkins[judge.id] ??= ['default']
    save.equippedSkins[judge.id] ??= 'default'
    if (!skinsForJudge(judge.id).some((skin) => skin.id === save.equippedSkins[judge.id])) {
      save.equippedSkins[judge.id] = 'default'
    }
    if (!save.ownedSkins[judge.id].includes('default')) {
      save.ownedSkins[judge.id].push('default')
    }
  }
  if (!HIT_THEMES.some((t) => t.id === save.equippedHitTheme)) save.equippedHitTheme = 'default'
  save.bankedExtraLife ??= 0
  save.doubleCoinsRunsRemaining ??= 0
  save.comboShieldRunsRemaining ??= 0
  persistSave(save)

  return {
    canvas,
    ctx,
    assets,
    time: 0,
    lastFrame: 0,
    deltaTime: 0,
    screen: 'home',
    pointer: { x: LOGICAL_WIDTH / 2, y: LOGICAL_HEIGHT / 2, down: false },
    ui: { buttons: [] },
    save,
    run: null,
    particles: [],
    toast: null,
    boostSelectPending: null,
    boostSelectUseDoubleCoins: true,
    boostSelectUseComboShield: true,
  }
}

export function resizeCanvas(state) {
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))
  state.canvas.width = Math.round(LOGICAL_WIDTH * dpr)
  state.canvas.height = Math.round(LOGICAL_HEIGHT * dpr)
  state.canvas.style.aspectRatio = `${LOGICAL_WIDTH} / ${LOGICAL_HEIGHT}`
  state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  state.ctx.imageSmoothingEnabled = true
}

export function setPointerFromEvent(state, event) {
  const rect = state.canvas.getBoundingClientRect()
  state.pointer.x = ((event.clientX - rect.left) / rect.width) * LOGICAL_WIDTH
  state.pointer.y = ((event.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT
  state.pointer.down = event.type !== 'pointerup' && event.type !== 'pointercancel'
}

export function startStageRun(state, stageId, options = {}) {
  const stage = STAGES.find((item) => item.id === stageId) || STAGES[0]
  startRun(state, {
    mode: 'stage',
    stage,
    duration: stage.duration,
    activeJudgeIndex: stage.judgeIndex,
    ftue: Boolean(options.ftue),
    thisRunDoubleCoins: Boolean(options.thisRunDoubleCoins),
    thisRunComboShield: Boolean(options.thisRunComboShield),
  })
}

export function startEndlessRun(state, options = {}) {
  startRun(state, {
    mode: 'endless',
    stage: null,
    duration: Infinity,
    activeJudgeIndex: 0,
    thisRunDoubleCoins: Boolean(options.thisRunDoubleCoins),
    thisRunComboShield: Boolean(options.thisRunComboShield),
  })
}

export function startRun(state, options) {
  const judge = JUDGES[options.activeJudgeIndex]
  let useDouble = Boolean(options.thisRunDoubleCoins) && (state.save.doubleCoinsRunsRemaining || 0) > 0
  let useShield = Boolean(options.thisRunComboShield) && (state.save.comboShieldRunsRemaining || 0) > 0
  if (useDouble) state.save.doubleCoinsRunsRemaining -= 1
  if (useShield) state.save.comboShieldRunsRemaining -= 1
  if (useDouble || useShield) persistSave(state.save)

  state.run = {
    mode: options.mode,
    stage: options.stage,
    ftue: Boolean(options.ftue),
    status: 'countdown',
    countdownStartedAt: state.time,
    startedAt: state.time + 3,
    elapsed: 0,
    duration: options.duration,
    completed: false,
    failed: false,
    grade: 'D',
    activeJudgeIndex: options.activeJudgeIndex,
    paused: false,
    pauseAccum: 0,
    judgeMoodKind: 'idle',
    judgeMoodUntil: 0,
    milestoneFlashUntil: 0,
    inactiveMoods: JUDGES.map(() => ({ kind: 'idle', until: 0 })),
    hp: MAX_HP,
    score: 0,
    combo: 0,
    bestCombo: 0,
    totalNotes: 0,
    resolvedNotes: 0,
    accuracyPoints: 0,
    hitCounts: { perfect: 0, good: 0, okay: 0, miss: 0 },
    targets: [],
    activeTargetId: null,
    nextSpawnAt: state.time + 3.3,
    spawnCount: 0,
    caption: '',
    captionUntil: 0,
    resultReadyAt: 0,
    lastMissCause: 'OUT OF SYNC',
    continueUsed: false,
    thisRunDoubleCoins: useDouble,
    thisRunComboShield: useShield,
    comboShieldConsumed: false,
    extraLifeUsedThisRun: false,
    failSnapshot: null,
    continueOfferUntil: 0,
    continueDeclineCause: '',
    internalMissCause: '',
  }
  state.screen = 'run'
  state.particles = []
  state.assets.startMusic(judge, state.save.settings.music)
}

export function finishRun(state, completed, cause = 'OUT OF SYNC', opts = {}) {
  const run = state.run
  if (!run || run.status === 'finished') return

  run.status = 'finished'
  run.completed = completed
  run.failed = !completed
  run.lastMissCause = completed ? cause || 'STAGE CLEAR' : opts.alreadyStamped ? cause : eliminationStamp(cause)
  run.resultReadyAt = state.time + 1.2
  run.targets = []
  run.activeTargetId = null
  run.paused = false
  run.judgeMoodKind = completed ? 'hype' : 'eliminated'
  run.judgeMoodUntil = state.time + 120
  state.assets.stopMusic()
  if (!completed && !opts.skipScratch) {
    state.assets.playSfx('scratch', state.save.settings.sfx)
  }
}

export function openContinueOffer(state, internalCause, failSnapshot) {
  const run = state.run
  if (!run || run.status !== 'playing') return
  if (run.continueUsed) {
    finishRun(state, false, internalCause)
    return
  }
  run.status = 'continueOffer'
  run.continueOfferUntil = state.time + CONTINUE_PROMPT_SECONDS
  run.continueDeclineCause = eliminationStamp(internalCause)
  run.internalMissCause = internalCause
  run.failSnapshot = failSnapshot
  run.targets = []
  run.activeTargetId = null
  state.assets.playSfx('scratch', state.save.settings.sfx)
  state.assets.stopMusic()
}

export function acceptContinue(state) {
  const run = state.run
  if (!run || run.status !== 'continueOffer') return
  if (state.save.coins < CONTINUE_COST) {
    showToast(state, 'Not enough coins')
    return
  }
  state.save.coins -= CONTINUE_COST
  persistSave(state.save)
  run.hp = Math.ceil(MAX_HP * CONTINUE_HP_FRAC)
  run.continueUsed = true
  run.status = 'playing'
  run.failSnapshot = null
  run.continueOfferUntil = 0
  run.nextSpawnAt = state.time + 0.75
  state.assets.startMusic(JUDGES[run.activeJudgeIndex], state.save.settings.music)
}

export function declineContinue(state) {
  const run = state.run
  if (!run || run.status !== 'continueOffer') return
  finishRun(state, false, run.continueDeclineCause, { alreadyStamped: true, skipScratch: true })
}

export function beginRunWithBoostFlow(state, intent) {
  if (intent.ftue) {
    if (intent.kind === 'endless') startEndlessRun(state, {})
    else startStageRun(state, intent.stageId, { ftue: true })
    return
  }
  const s = state.save
  if ((s.doubleCoinsRunsRemaining || 0) > 0 || (s.comboShieldRunsRemaining || 0) > 0) {
    state.boostSelectPending = intent
    state.boostSelectUseDoubleCoins = true
    state.boostSelectUseComboShield = true
    state.screen = 'boostSelect'
    return
  }
  if (intent.kind === 'endless') startEndlessRun(state, {})
  else startStageRun(state, intent.stageId, { ftue: false })
}

export function commitBoostSelection(state) {
  const pending = state.boostSelectPending
  if (!pending) return
  const useD = state.boostSelectUseDoubleCoins && (state.save.doubleCoinsRunsRemaining || 0) > 0
  const useS = state.boostSelectUseComboShield && (state.save.comboShieldRunsRemaining || 0) > 0
  state.boostSelectPending = null
  if (pending.kind === 'endless') startEndlessRun(state, { thisRunDoubleCoins: useD, thisRunComboShield: useS })
  else startStageRun(state, pending.stageId, { ftue: false, thisRunDoubleCoins: useD, thisRunComboShield: useS })
}

export function cancelBoostSelection(state) {
  state.boostSelectPending = null
  state.screen = 'home'
}

export function applyRunResults(state) {
  const run = state.run
  if (!run || run.resultsApplied) return

  const previousStageBest = run.mode === 'stage' ? state.save.stageBests[run.stage.id] : null
  const accuracy = run.resolvedNotes ? run.accuracyPoints / run.resolvedNotes : 0
  run.accuracy = accuracy
  run.grade = run.failed ? 'FAILED' : gradeForRun(run)
  let earned = coinsForRun(run, previousStageBest)
  if (run.thisRunDoubleCoins) earned *= 2
  run.coinsEarned = earned
  state.save.coins += run.coinsEarned

  if (run.mode === 'endless') {
    state.save.highScore = Math.max(state.save.highScore, run.score)
    run.leaderboardRank = rankForEndlessScore(run.score)
  } else {
    const current = previousStageBest || { score: 0, grade: 'FAILED', cleared: false }
    state.save.stageBests[run.stage.id] = {
      score: Math.max(current.score || 0, run.score),
      grade: betterGrade(current.grade || 'FAILED', run.grade),
      accuracy: Math.max(current.accuracy || 0, accuracy),
      cleared: Boolean(current.cleared || run.completed),
    }
    if (run.completed && run.stage.id >= STAGES[STAGES.length - 1].id) {
      state.save.ftueCompleted = true
    }
  }

  persistSave(state.save)
  run.resultsApplied = true
  run.failSnapshot = null
}

export function showToast(state, text) {
  state.toast = { text, until: state.time + 1.6 }
}

export function isSkinOwned(save, judgeId, skinId) {
  return save.ownedSkins[judgeId]?.includes(skinId)
}

export function buyOrEquipSkin(state, judgeId, skinId) {
  const skin = skinsForJudge(judgeId).find((item) => item.id === skinId)
  if (!skin) return
  state.save.ownedSkins[judgeId] ??= ['default']

  if (!isSkinOwned(state.save, judgeId, skinId)) {
    if (state.save.coins < skin.price) {
      showToast(state, 'Not enough coins')
      return
    }
    state.save.coins -= skin.price
    state.save.ownedSkins[judgeId].push(skinId)
    showToast(state, `${skin.name} unlocked`)
  }

  state.save.equippedSkins[judgeId] = skinId
  persistSave(state.save)
}

export function buyBoostProduct(state, productId) {
  const product = BOOST_PRODUCTS.find((p) => p.id === productId)
  if (!product) return
  if (state.save.coins < product.price) {
    showToast(state, 'Not enough coins')
    return
  }
  state.save.coins -= product.price
  if (product.kind === 'bank') {
    state.save.bankedExtraLife = (state.save.bankedExtraLife || 0) + 1
    showToast(state, 'Extra life banked')
  } else if (product.kind === 'charges') {
    const key = product.id === 'doubleCoins' ? 'doubleCoinsRunsRemaining' : 'comboShieldRunsRemaining'
    state.save[key] = (state.save[key] || 0) + (product.charges || 0)
    showToast(state, `${product.name} added`)
  }
  persistSave(state.save)
}

export function persistSave(save) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save))
}

function loadSave() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY))
    return mergeSave(DEFAULT_SAVE, parsed || {})
  } catch {
    return structuredClone(DEFAULT_SAVE)
  }
}

function mergeSave(base, incoming) {
  return {
    ...structuredClone(base),
    ...incoming,
    stageBests: { ...base.stageBests, ...(incoming.stageBests || {}) },
    ownedSkins: { ...base.ownedSkins, ...(incoming.ownedSkins || {}) },
    equippedSkins: { ...base.equippedSkins, ...(incoming.equippedSkins || {}) },
    equippedHitTheme: incoming.equippedHitTheme ?? base.equippedHitTheme,
    bankedExtraLife: incoming.bankedExtraLife ?? base.bankedExtraLife,
    doubleCoinsRunsRemaining: incoming.doubleCoinsRunsRemaining ?? base.doubleCoinsRunsRemaining,
    comboShieldRunsRemaining: incoming.comboShieldRunsRemaining ?? base.comboShieldRunsRemaining,
    settings: { ...base.settings, ...(incoming.settings || {}) },
  }
}

function gradeForRun(run) {
  const accuracy = run.resolvedNotes ? run.accuracyPoints / run.resolvedNotes : 0
  if (accuracy >= 0.95) return 'S'
  if (accuracy >= 0.85) return 'A'
  if (accuracy >= 0.7) return 'B'
  if (accuracy >= 0.55) return 'C'
  return 'D'
}

function gradeValue(grade) {
  return ['FAILED', 'D', 'C', 'B', 'A', 'S'].indexOf(grade)
}

function betterGrade(a, b) {
  return gradeValue(b) > gradeValue(a) ? b : a
}

function coinsForRun(run, previousStageBest) {
  if (run.ftue && !run.completed) return 0
  let coins = Math.max(5, Math.floor(run.score / 500))
  if (run.mode === 'stage' && run.completed && !previousStageBest?.cleared) coins += 50
  if (run.mode === 'stage' && run.completed && gradeValue(run.grade) > gradeValue(previousStageBest?.grade || 'FAILED')) coins += 25
  return coins
}
