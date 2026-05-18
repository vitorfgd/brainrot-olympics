import {
  BOOST_PRODUCTS,
  JUDGES,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  STAGES,
  gradeRank,
  isEndlessUnlocked,
  isStageUnlocked,
} from './rules.js'

const SHOP_COSMETICS = [
  { judgeId: 'blingbeak', skinId: 'partyhat', color: '#5cff7b', imageId: 'stage.ferret.alt1' },
  { judgeId: 'disco', skinId: 'disco', color: '#a8fbff', imageId: 'stage.manatee.alt1' },
  { judgeId: 'coolman', skinId: 'king', color: '#a8fbff', imageId: 'stage.lemur.alt1' },
  { judgeId: 'dj', skinId: 'punk', color: '#fce76d', imageId: 'stage.vulture.alt1' },
]

const LEADERBOARD_ROWS = [
  { name: 'Sir Brave-Heart', score: 98100, judgeId: 'blingbeak', skinId: 'partyhat' },
  { name: 'Chaos-Bringer', score: 95500, judgeId: 'disco', skinId: 'disco' },
  { name: 'Shadow-Stalker', score: 92200, judgeId: 'coolman', skinId: 'default' },
  { name: 'Pixel-Champion', score: 89800, judgeId: 'dj', skinId: 'default' },
  { name: 'Chaos-Master', score: 87000, judgeId: 'blingbeak', skinId: 'maverick' },
  { name: 'Gamer-King', score: 86200, judgeId: 'disco', skinId: 'default' },
  { name: 'Neon-Knight', score: 85500, judgeId: 'coolman', skinId: 'king' },
  { name: 'Reflex-Ace', score: 85000, judgeId: 'dj', skinId: 'punk' },
  { name: 'Score-Demon', score: 84800, judgeId: 'blingbeak', skinId: 'default' },
  { name: 'Legend-Maker', score: 84700, judgeId: 'disco', skinId: 'galaxy_brain' },
]

export function buildRenderState(state) {
  const run = state.run
  return {
    logicalWidth: LOGICAL_WIDTH,
    logicalHeight: LOGICAL_HEIGHT,
    screen: state.screen,
    time: state.time,
    save: serializeSave(state.save),
    judges: buildJudgesState(state),
    stages: buildStagesState(state),
    home: buildHomeState(state),
    levels: buildLevelsState(state),
    leaderboard: buildLeaderboardState(state),
    shop: buildShopState(state),
    settings: buildSettingsState(state),
    boostSelect: buildBoostSelectState(state),
    results: run ? buildResultsState(run) : null,
    runHud: run ? buildRunHudState(state, run) : null,
    run: run ? serializeRun(run) : null,
    toast: state.toast ? { ...state.toast } : null,
    uiButtons: (state.ui?.buttons || []).map((button) => ({ ...button })),
  }
}

function serializeSave(save) {
  return {
    coins: save.coins,
    highScore: save.highScore,
    ftueCompleted: save.ftueCompleted,
    stageBests: cloneRecord(save.stageBests),
    ownedSkins: cloneArrayRecord(save.ownedSkins),
    equippedSkins: { ...save.equippedSkins },
    bankedExtraLife: save.bankedExtraLife || 0,
    doubleCoinsRunsRemaining: save.doubleCoinsRunsRemaining || 0,
    comboShieldRunsRemaining: save.comboShieldRunsRemaining || 0,
    settings: { ...save.settings },
  }
}

function buildJudgesState(state) {
  return JUDGES.map((judge, index) => {
    const equippedSkin = state.save.equippedSkins[judge.id] || 'default'
    return {
      id: judge.id,
      index,
      name: judge.name,
      title: judge.title,
      color: judge.color,
      imageId: judge.imageId,
      musicId: judge.musicId,
      equippedSkin,
      equippedImageId: skinImageId(judge, equippedSkin),
      skins: judge.skins.map((skin) => ({
        id: skin.id,
        name: skin.name,
        price: skin.price,
        imageId: skin.imageId,
        owned: Boolean(state.save.ownedSkins[judge.id]?.includes(skin.id)),
        equipped: equippedSkin === skin.id,
      })),
    }
  })
}

function buildStagesState(state) {
  return STAGES.map((stage) => {
    const best = state.save.stageBests[stage.id] || null
    return {
      id: stage.id,
      name: stage.name,
      cardTitle: stage.cardTitle,
      color: stage.cardColor,
      duration: stage.duration,
      kinds: [...stage.kinds],
      difficulty: stage.difficulty,
      judgeIndex: stage.judgeIndex,
      judgeId: JUDGES[stage.judgeIndex]?.id || null,
      portraitId: stage.portraitId,
      unlocked: isStageUnlocked(state.save, stage.id),
      cleared: Boolean(best?.cleared),
      best: best ? { ...best } : null,
    }
  })
}

function buildHomeState(state) {
  return {
    coins: state.save.coins,
    highScore: state.save.highScore,
    endlessUnlocked: isEndlessUnlocked(state.save),
    stagesCleared: stagesClearedCount(state.save),
    stagesTotal: STAGES.length,
    primaryButtons: [
      {
        id: isEndlessUnlocked(state.save) ? 'playEndless' : 'playEndlessLocked',
        label: 'PLAY ENDLESS',
        locked: !isEndlessUnlocked(state.save),
      },
      { id: 'stageSelect', label: 'LEVELS', badge: `${stagesClearedCount(state.save)}/${STAGES.length}` },
    ],
    footerButtons: [
      { id: 'leaderboard', iconId: 'iconTrophy' },
      { id: 'shop', iconId: 'iconShop' },
      { id: 'settings', iconId: 'iconSettings' },
    ],
  }
}

function buildLevelsState(state) {
  return {
    title: 'LEVELS',
    stages: buildStagesState(state),
  }
}

function buildLeaderboardState(state) {
  const playerScore = Math.max(state.save.highScore, 84600)
  return {
    title: 'LEADERBOARD',
    playerScore,
    rows: leaderboardDisplayRows(LEADERBOARD_ROWS, playerScore).map((entry, displayIndex) => ({
      displayIndex,
      rank: entry.rank,
      player: entry.player,
      name: entry.player ? 'YOU' : entry.row.name,
      score: entry.score,
      judgeId: entry.player ? 'disco' : entry.row.judgeId,
      skinId: entry.player ? state.save.equippedSkins.disco || 'default' : entry.row.skinId || 'default',
      highlight: entry.player ? 'player' : entry.rank <= 3 ? `top${entry.rank}` : 'normal',
    })),
  }
}

function buildShopState(state) {
  return {
    coins: state.save.coins,
    powerUps: BOOST_PRODUCTS.map((product) => ({
      id: product.id,
      buttonId: `boost:${product.id}`,
      name: product.name,
      subtitle: product.subtitle,
      price: product.price,
      kind: product.kind,
      charges: product.charges || 0,
      ownedCount: product.id === 'extraLife' ? state.save.bankedExtraLife || 0 : null,
      runsRemaining:
        product.id === 'doubleCoins'
          ? state.save.doubleCoinsRunsRemaining || 0
          : product.id === 'comboShield'
            ? state.save.comboShieldRunsRemaining || 0
            : null,
    })),
    cosmetics: SHOP_COSMETICS.map((item) => buildShopSkinState(state, item)),
  }
}

function buildSettingsState(state) {
  return {
    title: 'AUDIO',
    rows: [
      { id: 'toggleMusic', label: 'MUSIC', iconId: 'iconMusic', enabled: Boolean(state.save.settings.music) },
      { id: 'toggleSfx', label: 'SFX', iconId: 'iconVolume', enabled: Boolean(state.save.settings.sfx) },
    ],
  }
}

function buildBoostSelectState(state) {
  const pending = state.boostSelectPending
  if (!pending) return null
  const doubleCoinsCharges = state.save.doubleCoinsRunsRemaining || 0
  const comboShieldCharges = state.save.comboShieldRunsRemaining || 0
  return {
    pending: { ...pending },
    title: 'PRE-RUN BOOSTS',
    runLabel: pending.kind === 'endless' ? 'ENDLESS RUN' : `STAGE ${pending.stageId}`,
    coins: state.save.coins,
    boosts: [
      {
        id: 'doubleCoins',
        buttonId: 'boostToggleDouble',
        label: 'DOUBLE COINS',
        iconId: 'iconCoin',
        available: doubleCoinsCharges > 0,
        charges: doubleCoinsCharges,
        selected: Boolean(state.boostSelectUseDoubleCoins && doubleCoinsCharges > 0),
      },
      {
        id: 'comboShield',
        buttonId: 'boostToggleShield',
        label: 'COMBO SHIELD',
        iconId: 'iconShield',
        available: comboShieldCharges > 0,
        charges: comboShieldCharges,
        selected: Boolean(state.boostSelectUseComboShield && comboShieldCharges > 0),
      },
    ],
    actions: [
      { id: 'boostSelectGo', label: 'START RUN' },
      { id: 'boostSelectCancel', label: 'CANCEL' },
    ],
  }
}

function buildResultsState(run) {
  const accuracy = run.accuracy ?? (run.resolvedNotes ? run.accuracyPoints / run.resolvedNotes : 0)
  const stats = [
    { id: 'score', label: 'FINAL SCORE', value: run.score || 0 },
    { id: 'bestCombo', label: 'BEST COMBO', value: run.bestCombo || 0 },
    { id: 'accuracy', label: 'ACCURACY', value: accuracy },
    { id: 'perfectHits', label: 'PERFECT HITS', value: run.hitCounts?.perfect || 0 },
  ]
  return {
    mode: run.mode,
    stageId: run.stage?.id || null,
    ftue: Boolean(run.ftue),
    completed: Boolean(run.completed),
    failed: Boolean(run.failed),
    headline: run.completed ? 'RUN COMPLETE' : 'ELIMINATED',
    grade: run.grade,
    missCause: run.lastMissCause,
    score: run.score || 0,
    bestCombo: run.bestCombo || 0,
    accuracy,
    accuracyPct: Math.round(accuracy * 100),
    perfectHits: run.hitCounts?.perfect || 0,
    coinsEarned: run.coinsEarned || 0,
    leaderboardRank: run.leaderboardRank || null,
    resultsShownAt: run.resultsShownAt || 0,
    reveal: {
      titleAt: 0,
      medalAt: run.completed ? 0.16 : null,
      statsAt: [0.42, 0.54, 0.66, 0.78],
      coinsAt: 0.96,
      buttonsAt: 1.22,
    },
    medal: run.completed && run.grade !== 'FAILED' ? { grade: run.grade, assetId: 'medalsSheet' } : null,
    stats,
    reward: { coins: run.coinsEarned || 0 },
    actions: buildResultsActions(run),
  }
}

function buildRunHudState(state, run) {
  const remaining = Number.isFinite(run.duration) ? Math.max(0, run.duration - run.elapsed) : null
  return {
    mode: run.mode,
    status: run.status,
    stageId: run.stage?.id || null,
    ftue: Boolean(run.ftue),
    activeJudgeIndex: run.activeJudgeIndex,
    activeJudgeId: JUDGES[run.activeJudgeIndex]?.id || null,
    score: run.score || 0,
    combo: run.combo || 0,
    comboTier: Math.min(10, Math.floor((run.combo || 0) / 10)),
    hp: run.hp,
    hpMax: 100,
    remaining,
    countdown: run.status === 'countdown' ? Math.max(0, run.startedAt - state.time) : null,
    continueOffer:
      run.status === 'continueOffer'
        ? {
            until: run.continueOfferUntil,
            remaining: Math.max(0, run.continueOfferUntil - state.time),
            declineCause: run.continueDeclineCause,
          }
        : null,
    boosts: {
      doubleCoins: Boolean(run.thisRunDoubleCoins),
      comboShield: Boolean(run.thisRunComboShield),
      comboShieldConsumed: Boolean(run.comboShieldConsumed),
      extraLifeUsed: Boolean(run.extraLifeUsedThisRun),
    },
    caption: run.captionUntil > 0 ? { text: run.caption, until: run.captionUntil } : null,
    judgeMood: {
      active: { kind: run.judgeMoodKind, until: run.judgeMoodUntil },
      inactive: (run.inactiveMoods || []).map((mood) => ({ ...mood })),
    },
    effects: {
      shakeUntil: run.shakeUntil || 0,
      shakeMagnitude: run.shakeMagnitude || 0,
      hitStopUntil: run.hitStopUntil || 0,
      milestoneFlashUntil: run.milestoneFlashUntil || 0,
      hpPulseUntil: run.hpPulseUntil || 0,
      hpPulseColor: run.hpPulseColor || null,
      goUntil: run.goUntil || 0,
      timeUpUntil: run.timeUpUntil || 0,
    },
    activeTargetId: run.activeTargetId,
    upcomingTarget: serializeUpcomingTarget(run.upcomingTarget),
    targets: run.targets.map(serializeTarget),
    failSnapshot: run.failSnapshot ? serializeTarget(run.failSnapshot) : null,
  }
}

function serializeRun(run) {
  return {
    mode: run.mode,
    stageId: run.stage?.id || null,
    ftue: Boolean(run.ftue),
    status: run.status,
    completed: Boolean(run.completed),
    failed: Boolean(run.failed),
    grade: run.grade,
    score: run.score,
    combo: run.combo,
    bestCombo: run.bestCombo,
    hp: run.hp,
    elapsed: run.elapsed,
    duration: run.duration,
    activeJudgeIndex: run.activeJudgeIndex,
    caption: run.caption,
    captionUntil: run.captionUntil,
    totalNotes: run.totalNotes,
    resolvedNotes: run.resolvedNotes,
    accuracyPoints: run.accuracyPoints,
    accuracy: run.accuracy ?? null,
    hitCounts: { ...(run.hitCounts || {}) },
    coinsEarned: run.coinsEarned || 0,
    leaderboardRank: run.leaderboardRank || null,
    lastMissCause: run.lastMissCause,
    continueUsed: Boolean(run.continueUsed),
    thisRunDoubleCoins: Boolean(run.thisRunDoubleCoins),
    thisRunComboShield: Boolean(run.thisRunComboShield),
    activeTargetId: run.activeTargetId,
    upcomingTarget: serializeUpcomingTarget(run.upcomingTarget),
    targets: run.targets.map(serializeTarget),
  }
}

function serializeUpcomingTarget(upcomingTarget) {
  if (!upcomingTarget) return null
  return {
    kind: upcomingTarget.kind,
    point: upcomingTarget.point ? { ...upcomingTarget.point } : null,
    createdAt: upcomingTarget.createdAt,
    spawnAt: upcomingTarget.spawnAt,
    approach: upcomingTarget.approach,
  }
}

function serializeTarget(target) {
  const base = {
    id: target.id ?? null,
    kind: target.kind,
    x: target.x,
    y: target.y,
    age: target.age ?? 0,
    approach: target.approach ?? 0,
    deadline: target.deadline ?? 0,
    resolved: Boolean(target.resolved),
    removed: Boolean(target.removed),
    pulse: target.pulse ?? 0,
    hitQuality: target.hitQuality || null,
    vanishStartedAt: target.vanishStartedAt || 0,
    removeAt: target.removeAt || 0,
    sequenceGroup: target.sequenceGroup ?? null,
    sequenceIndex: target.sequenceIndex ?? null,
    sequenceCount: target.sequenceCount ?? null,
    sequenceSpacing: target.sequenceSpacing ?? null,
    sequencePrevX: target.sequencePrevX ?? null,
    sequencePrevY: target.sequencePrevY ?? null,
    sequenceNextX: target.sequenceNextX ?? null,
    sequenceNextY: target.sequenceNextY ?? null,
  }
  if (target.kind === 'slide') {
    return {
      ...base,
      endX: target.endX,
      endY: target.endY,
      controlX: target.controlX,
      controlY: target.controlY,
      tolerance: target.tolerance ?? 0,
      progress: target.progress || 0,
      dragging: Boolean(target.dragging),
      trail: (target.trail || []).map((point) => ({ ...point })),
    }
  }
  if (target.kind === 'hold') {
    return {
      ...base,
      holdDuration: target.holdDuration,
      heldFor: target.heldFor,
      holding: Boolean(target.holding),
      releaseCueShown: Boolean(target.releaseCueShown),
    }
  }
  return base
}

function buildResultsActions(run) {
  if (run.ftue && run.completed) {
    return [
      { id: 'ftueNextStage', label: 'NEXT LEVEL', kind: 'primary' },
      { id: 'resultsHome', label: 'MENU', kind: 'secondary' },
    ]
  }
  if (run.ftue && !run.completed) {
    return [
      { id: 'ftueContinue', label: 'TRY AGAIN', kind: 'primary' },
      { id: 'resultsHome', label: 'MENU', kind: 'secondary' },
    ]
  }
  const retry = resultsRetryAction(run)
  return [
    { id: 'tryAgain', label: retry.label, kind: 'primary', sprite: retry.sprite },
    { id: 'resultsHome', label: 'MENU', kind: 'secondary', sprite: 'buttonCyan' },
  ]
}

function resultsRetryAction(run) {
  if (run.mode === 'stage' && run.completed && run.stage?.id === 1) {
    return { label: 'NEXT LEVEL', sprite: 'buttonCyan' }
  }
  if (run.mode === 'stage' && run.completed && gradeRank(run.grade) >= gradeRank('B')) {
    return { label: 'NEXT STAGE', sprite: 'buttonCyan' }
  }
  if (run.mode === 'endless') return { label: 'TRY AGAIN', sprite: 'buttonPink' }
  return { label: 'RETRY STAGE', sprite: 'buttonPink' }
}

function buildShopSkinState(state, item) {
  const judge = JUDGES.find((candidate) => candidate.id === item.judgeId)
  const skin = judge?.skins.find((candidate) => candidate.id === item.skinId)
  const owned = Boolean(state.save.ownedSkins[item.judgeId]?.includes(item.skinId))
  const equipped = state.save.equippedSkins[item.judgeId] === item.skinId
  return {
    id: `skin:${item.judgeId}:${item.skinId}`,
    judgeId: item.judgeId,
    skinId: item.skinId,
    name: skin?.name || 'Skin',
    price: skin?.price || 0,
    imageId: item.imageId || skin?.imageId || null,
    color: item.color,
    owned,
    equipped,
    status: equipped ? 'EQUIPPED' : owned ? 'EQUIP' : `${skin?.price || 0} coins`,
  }
}

function skinImageId(judge, skinId) {
  return judge.skins.find((skin) => skin.id === skinId)?.imageId || judge.imageId
}

function stagesClearedCount(save) {
  return STAGES.filter((stage) => {
    const grade = save.stageBests[stage.id]?.grade
    return grade && grade !== 'FAILED'
  }).length
}

function leaderboardDisplayRows(rows, playerScore) {
  const playerIndex = leaderboardPlayerInsertIndex(rows, playerScore)
  const entries = rows.map((row, index) => ({ row, rank: index + 1, score: row.score, player: false }))
  entries.splice(playerIndex, 0, { player: true, rank: playerIndex + 1, score: playerScore })
  return entries.slice(0, 10)
}

function leaderboardPlayerInsertIndex(rows, score) {
  const naturalIndex = rows.findIndex((row) => score > row.score)
  const insert = naturalIndex === -1 ? rows.length : naturalIndex
  return Math.max(4, Math.min(6, insert))
}

function cloneRecord(record) {
  return Object.fromEntries(Object.entries(record || {}).map(([key, value]) => [key, value ? { ...value } : value]))
}

function cloneArrayRecord(record) {
  return Object.fromEntries(Object.entries(record || {}).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]))
}
