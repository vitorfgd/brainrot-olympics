import {
  PLAY_TOP,
  PLAY_BOTTOM,
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  MAX_HP,
  HIT_QUALITY_VALUE,
  HIT_LABELS,
  clamp,
  distance,
  difficultyProfile,
  hpDeltaForHit,
  judgeSpawnRegion,
  qualityFromTiming,
  resolveTargetKind,
  scoreForHit,
  COMBO_MILESTONE_AT,
  milestoneCalloutText,
  JUDGES,
} from './rules.js'
import { finishRun, openContinueOffer, persistSave } from './state.js'
import { activeMoodForHit, inactiveCheerMood } from './judgeReactions.js'
import { emitEffect } from './effects.js'
import { requestRunMusic, requestSound, requestStopRunMusic } from './events.js'
import { randomChoice, randomFloat } from './rng.js'

const TARGET_RADIUS = 44
const TAP_CHAIN_COUNT = 3
const TAP_CHAIN_SPACING = 0.48
const TAP_CHAIN_MIN_POINT_GAP = 96
const TAP_CHAIN_MAX_POINT_GAP = 210
const MISS_WINDOW = 0.35
const SPAWN_PREVIEW_LEAD = 0.56
const SLIDE_START_RADIUS_BONUS = 34
const SLIDE_PATH_HIT_BONUS = 40
const SLIDE_MARKER_RADIUS = 36
const SLIDE_MIN_ENDPOINT_GAP = 170
const SLIDE_MAX_ENDPOINT_GAP = 280
const SLIDE_MIN_ARC_LENGTH = 160
const SLIDE_MAX_ARC_LENGTH = 300
const SLIDE_COMPLETE_PROGRESS = 0.9
const SLIDE_MAX_VERTICAL_DRIFT = 64
const HOLD_RELEASE_CUE_WINDOW = 0.24
const FTUE_GUIDED_TAP_POINTS = [
  { x: 270, y: 472 },
  { x: 204, y: 438 },
  { x: 336, y: 438 },
  { x: 270, y: 540 },
  { x: 170, y: 510 },
  { x: 370, y: 510 },
  { x: 222, y: 610 },
  { x: 318, y: 610 },
  { x: 270, y: 408 },
  { x: 178, y: 560 },
  { x: 362, y: 560 },
  { x: 270, y: 650 },
]

export function updateRun(state) {
  const run = state.run
  if (!run) return

  if (run.status === 'countdown') {
    const tick = Math.max(1, Math.ceil(run.startedAt - state.time))
    if (run.lastCountdownTick !== tick) {
      run.lastCountdownTick = tick
      requestSound(state, 'countdownTick')
    }
    if (state.time >= run.startedAt) {
      run.status = 'playing'
      run.nextSpawnAt = state.time + 0.2
      run.goStartedAt = state.time
      run.goUntil = state.time + 0.62
      showCaption(state, run, 'GO!')
      requestSound(state, 'countdownTick', 1.15)
    }
    return
  }

  if (run.status === 'continueOffer') return

  if (run.status !== 'playing') return

  run.elapsed = state.time - run.startedAt

  updateEndlessJudge(state)

  for (let i = 0; i < run.inactiveMoods.length; i += 1) {
    if (state.time >= run.inactiveMoods[i].until) {
      run.inactiveMoods[i] = { kind: 'idle', until: 0 }
    }
  }

  const profile = difficultyProfile(run)
  const liveTargets = run.targets.filter((target) => !target.resolved).length
  const sequenceActive = hasActiveTapSequence(run)
  if (!sequenceActive && state.time >= run.nextSpawnAt - SPAWN_PREVIEW_LEAD && liveTargets < profile.maxLiveTargets) {
    prepareUpcomingTarget(run, profile, state.time, state.random)
  }
  if (!sequenceActive && state.time >= run.nextSpawnAt && liveTargets < profile.maxLiveTargets) {
    const target = spawnTarget(run, profile, state.random)
    if (isFtueTapOpening(run) && target.id === 0) showCaption(state, run, 'TAP', 1.1)
    requestSound(state, 'targetSpawn')
    run.nextSpawnAt = state.time + profile.spawnInterval
  }

  for (const target of run.targets) {
    if (target.resolved) continue
    target.age += state.deltaTime
    if (target.kind === 'hold' && target.holding) {
      target.heldFor += state.deltaTime
      if (!target.releaseCueShown && shouldShowHoldReleaseCue(target)) {
        target.releaseCueShown = true
        showCaption(state, run, 'RELEASE', 0.5)
      }
    }
    if (target.age > target.deadline) {
      resolveHit(state, target, 'miss', 'MISSED THE BEAT')
    }
  }

  run.targets = run.targets.filter((target) => {
    if (target.removed) return false
    if (target.removeAt && state.time >= target.removeAt) return false
    return target.age < target.deadline + 0.35
  })

  if (run.mode === 'stage' && run.elapsed >= run.duration && !run.timeUpUntil) {
    run.timeUpUntil = state.time + 0.9
    run.caption = 'TIME UP'
    run.captionUntil = run.timeUpUntil
    run.targets = []
    run.activeTargetId = null
    requestStopRunMusic(state)
    requestSound(state, run.hp > 0 ? 'stageClear' : 'runFailed', 0.85)
  }

  if (run.timeUpUntil && state.time >= run.timeUpUntil) {
    finishRun(state, run.hp > 0, run.hp > 0 ? 'STAGE CLEAR' : 'NO HP')
  }
}

export function handleRunPointerDown(state) {
  const run = state.run
  if (!run || run.status !== 'playing') return false
  const { x, y } = state.pointer

  const target = findTargetAt(run, x, y)
  if (!target) return false

  if (target.sequenceGroup != null && !isSequenceTargetAvailable(run, target)) {
    resolveHit(state, target, 'miss', 'WRONG ORDER')
    return true
  }

  if (target.kind === 'slide') {
    const started = target.progress > 0
    if (!started && distance(x, y, target.x, target.y) > TARGET_RADIUS + SLIDE_START_RADIUS_BONUS) {
      resolveHit(state, target, 'miss', 'START ON THE DOT')
      return true
    }
    target.dragging = true
    target.trail = [pointOnSlider(target, clamp(target.progress, 0, 1))]
    run.activeTargetId = target.id
    showCaption(state, run, 'DRAG BALL', 0.75)
    return true
  }

  if (target.kind === 'hold') {
    target.holding = true
    target.heldFor = 0
    run.activeTargetId = target.id
    showCaption(state, run, 'HOLD')
    return true
  }

  const timingError = target.age - target.approach
  const quality = qualityFromTiming(timingError)
  resolveHit(state, target, quality, quality === 'miss' ? tapMissCaption(timingError) : HIT_LABELS[quality])
  return true
}

function tapMissCaption(timingError) {
  return timingError < 0 ? 'TOO EARLY' : 'OFF BEAT'
}

export function handleRunPointerMove(state) {
  const run = state.run
  if (!run || run.status !== 'playing' || run.activeTargetId === null) return

  const lastX = state.pointer.lastMoveX
  const lastY = state.pointer.lastMoveY
  if (lastX != null && lastY != null) {
    const dx = state.pointer.x - lastX
    const dy = state.pointer.y - lastY
    if (dx * dx + dy * dy < 36) return
  }
  state.pointer.lastMoveX = state.pointer.x
  state.pointer.lastMoveY = state.pointer.y

  const target = run.targets.find((item) => item.id === run.activeTargetId)
  if (!target || target.resolved || target.kind !== 'slide') return

  const nearest = sliderRailProgress(target, state.pointer.x, state.pointer.y)
  target.progress = Math.max(target.progress, nearest.progress)
  if (!target.trail) target.trail = []
  const trail = target.trail
  const railPoint = pointOnSlider(target, target.progress)
  const last = trail[trail.length - 1]
  if (!last || distance(last.x, last.y, railPoint.x, railPoint.y) >= 10) {
    trail.push(railPoint)
    if (trail.length > 18) trail.shift()
  }

  if (target.progress >= SLIDE_COMPLETE_PROGRESS) {
    run.activeTargetId = null
    target.dragging = false
    resolveSlideHit(state, target)
  }
}

function resolveSlideHit(state, target) {
  const quality = slideQualityFromTiming(target.age - target.approach)
  resolveHit(state, target, quality, quality === 'miss' ? 'OFF BEAT' : `${HIT_LABELS[quality]} SLIDE`)
}

function slideQualityFromTiming(errorSeconds) {
  if (errorSeconds < -0.42) return 'okay'
  const error = Math.abs(errorSeconds)
  if (error <= 0.18) return 'perfect'
  if (error <= 0.42) return 'good'
  if (error <= 1.15) return 'okay'
  return 'miss'
}

export function handleRunPointerUp(state) {
  const run = state.run
  if (!run || run.status !== 'playing' || run.activeTargetId === null) return

  const target = run.targets.find((item) => item.id === run.activeTargetId)
  if (!target || target.resolved) {
    run.activeTargetId = null
    return
  }

  if (target.kind === 'hold') {
    const quality = qualityFromTiming(target.heldFor - target.holdDuration)
    resolveHit(state, target, quality, quality === 'miss' ? 'RELEASED OFF BEAT' : `${HIT_LABELS[quality]} HOLD`)
  } else if (target.kind === 'slide') {
    target.dragging = false
    if (target.progress >= SLIDE_COMPLETE_PROGRESS) {
      target.progress = 1
      resolveSlideHit(state, target)
    } else {
      showCaption(state, run, 'KEEP DRAGGING', 0.5)
    }
  }

  run.activeTargetId = null
}

export function spawnTarget(run, profile, rng = Math.random) {
  const upcoming = run.upcomingTarget
  const kind = upcoming?.kind || resolveTargetKind(run)
  const point = upcoming?.point || chooseTargetPoint(run, kind, rng)
  if (kind === 'tapChain') {
    return spawnTapChainTargets(run, profile, point, rng)
  }

  const target = {
    id: nextTargetId(run),
    kind,
    x: point.x,
    y: point.y,
    age: 0,
    approach: profile.approach,
    deadline: profile.approach + MISS_WINDOW,
    resolved: false,
    removed: false,
    pulse: randomFloat(rng, 0, Math.PI * 2),
  }

  if (kind === 'slide') {
    const path = createSliderPath(point, profile, run, rng)
    Object.assign(target, path, {
      deadline: profile.approach + 1.35,
      tolerance: profile.slideTolerance,
      progress: 0,
      dragging: false,
      trail: [],
    })
  }

  if (kind === 'hold') {
    Object.assign(target, {
      holdDuration: profile.holdDuration,
      heldFor: 0,
      holding: false,
      releaseCueShown: false,
      deadline: profile.holdDuration + profile.approach + 0.45,
    })
  }

  run.targets.push(target)
  run.upcomingTarget = null
  run.spawnCount += 1
  run.totalNotes += 1
  return target
}

function spawnTapChainTargets(run, profile, firstPoint, rng = Math.random) {
  const points = createTapChainPoints(run, firstPoint, rng)
  const sequenceGroup = nextTargetId(run)
  let firstTarget = null
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]
    const prev = points[index - 1]
    const next = points[index + 1]
    const target = {
      id: index === 0 ? sequenceGroup : nextTargetId(run),
      kind: 'tap',
      x: point.x,
      y: point.y,
      age: -index * TAP_CHAIN_SPACING,
      approach: profile.approach,
      deadline: profile.approach + MISS_WINDOW,
      resolved: false,
      removed: false,
      pulse: randomFloat(rng, 0, Math.PI * 2),
      sequenceGroup,
      sequenceIndex: index,
      sequenceCount: points.length,
      sequenceSpacing: TAP_CHAIN_SPACING,
      sequencePrevX: prev?.x,
      sequencePrevY: prev?.y,
      sequenceNextX: next?.x,
      sequenceNextY: next?.y,
    }
    if (!firstTarget) firstTarget = target
    run.targets.push(target)
  }
  run.upcomingTarget = null
  run.spawnCount += 1
  run.totalNotes += points.length
  return firstTarget
}

function nextTargetId(run) {
  if (!Number.isFinite(run.nextTargetId)) run.nextTargetId = run.spawnCount || 0
  const id = run.nextTargetId
  run.nextTargetId += 1
  return id
}

function createTapChainPoints(run, firstPoint, rng = Math.random) {
  const region = judgeSpawnRegion(run)
  const points = [firstPoint]
  while (points.length < TAP_CHAIN_COUNT) {
    const previous = points[points.length - 1]
    let best = null
    let bestScore = -Infinity
    for (let i = 0; i < 32; i += 1) {
      const point = randomPointInRegion(region, rng)
      const score = tapChainPointScore(run, points, previous, point)
      if (score > bestScore) {
        best = point
        bestScore = score
      }
    }
    points.push(best || randomPointInRegion(region, rng))
  }
  return points
}

function tapChainPointScore(run, points, previous, point) {
  const fromPrev = distance(point.x, point.y, previous.x, previous.y)
  if (fromPrev < TAP_CHAIN_MIN_POINT_GAP || fromPrev > TAP_CHAIN_MAX_POINT_GAP) return -Infinity
  for (const existing of points) {
    if (distance(point.x, point.y, existing.x, existing.y) < TAP_CHAIN_MIN_POINT_GAP) return -Infinity
  }
  const nearest = nearestLiveTargetPoint(run, point, 'tap')
  const idealGap = (TAP_CHAIN_MIN_POINT_GAP + TAP_CHAIN_MAX_POINT_GAP) / 2
  return nearest - Math.abs(fromPrev - idealGap) * 0.45 - Math.abs(point.y - previous.y) * 0.08
}

function shouldShowHoldReleaseCue(target) {
  return target.heldFor >= target.holdDuration - HOLD_RELEASE_CUE_WINDOW
}

function prepareUpcomingTarget(run, profile, time, rng = Math.random) {
  if (run.upcomingTarget) return
  const kind = resolveTargetKind(run)
  run.upcomingTarget = {
    kind,
    point: chooseTargetPoint(run, kind, rng),
    createdAt: time,
    spawnAt: run.nextSpawnAt,
    approach: profile.approach,
  }
}

export function pointOnSlider(target, progress) {
  const inverse = 1 - progress
  return {
    x: inverse * inverse * target.x + 2 * inverse * progress * target.controlX + progress * progress * target.endX,
    y: inverse * inverse * target.y + 2 * inverse * progress * target.controlY + progress * progress * target.endY,
  }
}

export function showCaption(state, run, text, duration = 0.85) {
  run.caption = text
  run.captionUntil = state.time + duration
}

function applyMood(state, run, mood) {
  run.judgeMoodKind = mood.kind
  run.judgeMoodUntil = Math.max(run.judgeMoodUntil, state.time + mood.span)
}

function pingInactiveJudges(state, run) {
  if (run.mode !== 'endless') return
  const cheer = inactiveCheerMood(state.random)
  const candidates = JUDGES.map((_, i) => i).filter((i) => i !== run.activeJudgeIndex)
  const pick = randomChoice(state.random, candidates)
  run.inactiveMoods[pick] = { kind: cheer.kind, until: state.time + cheer.span }
}

function snapshotFatalTarget(target) {
  const snap = {
    kind: target.kind,
    x: target.x,
    y: target.y,
    age: target.age,
    approach: target.approach,
    deadline: target.deadline,
    pulse: target.pulse || 0,
    sequenceGroup: target.sequenceGroup,
    sequenceIndex: target.sequenceIndex,
    sequenceCount: target.sequenceCount,
    sequenceSpacing: target.sequenceSpacing,
    sequencePrevX: target.sequencePrevX,
    sequencePrevY: target.sequencePrevY,
    sequenceNextX: target.sequenceNextX,
    sequenceNextY: target.sequenceNextY,
  }
  if (target.kind === 'slide') {
    Object.assign(snap, {
      endX: target.endX,
      endY: target.endY,
      controlX: target.controlX,
      controlY: target.controlY,
      progress: target.progress || 0,
      tolerance: target.tolerance,
      trail: target.trail ? target.trail.slice(-12) : [],
    })
  }
  if (target.kind === 'hold') {
    Object.assign(snap, {
      holdDuration: target.holdDuration,
      heldFor: target.heldFor,
      holding: target.holding,
    })
  }
  return snap
}

function resolveHit(state, target, quality, caption) {
  const run = state.run
  if (!run || target.resolved) return

  if (quality === 'miss' && run.thisRunComboShield && !run.comboShieldConsumed) {
    run.comboShieldConsumed = true
    target.resolved = true
    target.removed = false
    target.hitQuality = 'shield'
    target.vanishStartedAt = state.time
    target.removeAt = state.time + 0.18
    run.resolvedNotes += 1
    run.hitCounts[quality] += 1
    run.accuracyPoints += HIT_QUALITY_VALUE[quality]
    applyMood(state, run, activeMoodForHit('miss', false))
    run.caption = 'SHIELDED!'
    run.captionUntil = state.time + 0.75
    playHitSfx(state, 'shield')
    return
  }

  target.resolved = true
  target.removed = false
  target.hitQuality = quality
  target.vanishStartedAt = state.time
  target.removeAt = state.time + 0.18
  run.resolvedNotes += 1
  run.hitCounts[quality] += 1
  run.accuracyPoints += HIT_QUALITY_VALUE[quality]

  if (quality === 'miss') {
    playHitSfx(state, quality)
    applyMood(state, run, activeMoodForHit('miss', false))
    run.combo = 0
    const forgiven = shouldForgiveFtueMiss(run)
    if (forgiven) run.ftueFirstMissForgiven = true
    else applyHpDelta(state, run, hpDeltaForHit(quality))
    run.caption = forgiven ? 'WATCH\nTHE RING' : caption
    run.captionUntil = state.time + (forgiven ? 1.15 : 0.85)
    run.internalMissCause = caption
    if (!forgiven && run.hp <= 0) {
      if ((state.save.bankedExtraLife || 0) > 0 && !run.extraLifeUsedThisRun) {
        state.save.bankedExtraLife -= 1
        persistSave(state)
        run.extraLifeUsedThisRun = true
        const heal = MAX_HP - run.hp
        run.hp = MAX_HP
        pulseHp(state, run, heal)
        showCaption(state, run, 'EXTRA LIFE!', 1.1)
        return
      }
      const snap = snapshotFatalTarget(target)
      openContinueOffer(state, caption, snap)
    }
    return
  }

  const nextCombo = run.combo + 1
  const gained = scoreForHit(quality, nextCombo)
  run.score += gained
  if (quality === 'okay' || quality === 'perfect') {
    run.shakeStartedAt = state.time
    run.shakeUntil = state.time + (quality === 'perfect' ? 0.18 : 0.11)
    run.shakeMagnitude = quality === 'perfect' ? 8 : 4
  }
  run.combo = nextCombo
  run.bestCombo = Math.max(run.bestCombo, run.combo)
  applyHpDelta(state, run, hpDeltaForHit(quality))

  const isMilestone = COMBO_MILESTONE_AT.includes(nextCombo)
  const milestoneMood = activeMoodForHit(quality, isMilestone)
  applyMood(state, run, milestoneMood)
  pingInactiveJudges(state, run)

  if (isMilestone) {
    run.caption = milestoneCalloutText(nextCombo)
    run.captionUntil = state.time + 1.48
    run.milestoneFlashUntil = state.time + 0.2
    requestSound(state, 'judgeReactPositive', 0.6)
  } else {
    playHitSfx(state, quality)
    run.caption = ftueHitCaption(run, quality, caption)
    run.captionUntil = state.time + 0.85
  }
}

function isFtueTapOpening(run) {
  return run.ftue && run.stage?.id === 1 && run.spawnCount <= FTUE_GUIDED_TAP_POINTS.length
}

function shouldForgiveFtueMiss(run) {
  return run.ftue && run.stage?.id === 1 && !run.ftueFirstMissForgiven
}

function ftueHitCaption(run, quality, fallback) {
  if (!run.ftue || run.stage?.id !== 1) return fallback
  if (quality === 'perfect') return 'PERFECT!'
  if (quality === 'good') return 'GOOD!'
  if (quality === 'okay') return 'OKAY!'
  return fallback
}

function playHitSfx(state, quality) {
  const key = quality === 'okay' || quality === 'shield' ? 'hitOkay' : quality === 'miss' ? 'hitMiss' : 'hitGood'
  requestSound(state, key)
}

function applyHpDelta(state, run, delta) {
  const before = run.hp
  run.hp = clamp(run.hp + delta, 0, MAX_HP)
  pulseHp(state, run, run.hp - before)
}

function pulseHp(state, run, delta) {
  if (!delta) return
  emitEffect(state, {
    type: 'hpPulse',
    startedAt: state.time,
    until: state.time + 0.34,
    color: delta > 0 ? '#a8fbff' : '#ff4ff0',
  })
}

function updateEndlessJudge(state) {
  const run = state.run
  if (run.mode !== 'endless') return
  const tier = Math.floor(run.elapsed / 30)
  const nextJudgeIndex = tier % 4
  if (run.activeJudgeIndex !== nextJudgeIndex) {
    run.activeJudgeIndex = nextJudgeIndex
    applyMood(state, run, { kind: 'hype', span: 1.05 })
    requestRunMusic(state, JUDGES[nextJudgeIndex].id, state.save.settings.music)
    showCaption(state, run, 'NEW JUDGE', 1.05)
  }
}

function findTargetAt(run, x, y) {
  for (let i = run.targets.length - 1; i >= 0; i -= 1) {
    const target = run.targets[i]
    if (target.resolved) continue
    if (target.kind === 'slide') {
      const start = distance(x, y, target.x, target.y) <= TARGET_RADIUS + 16
      const path = nearestSliderProgress(target, x, y).distance <= target.tolerance + SLIDE_PATH_HIT_BONUS
      if (start || path) return target
    } else if (distance(x, y, target.x, target.y) <= TARGET_RADIUS + 20) {
      return target
    }
  }
  return null
}

function isSequenceTargetAvailable(run, target) {
  if (target.sequenceGroup == null || target.sequenceIndex == null) return true
  return !run.targets.some(
    (item) =>
      item.sequenceGroup === target.sequenceGroup
      && !item.resolved
      && (item.sequenceIndex ?? 0) < target.sequenceIndex,
  )
}

function hasActiveTapSequence(run) {
  return run.targets.some((target) => target.sequenceGroup != null && !target.resolved)
}

function chooseTargetPoint(run, kind = null, rng = Math.random) {
  if (run.ftue && run.stage?.id === 1 && run.spawnCount < FTUE_GUIDED_TAP_POINTS.length) {
    return FTUE_GUIDED_TAP_POINTS[run.spawnCount]
  }
  const region = judgeSpawnRegion(run)
  let best = randomPointInRegion(region, rng)
  let bestScore = -Infinity
  for (let i = 0; i < 16; i += 1) {
    const point = randomPointInRegion(region, rng)
    const nearest = nearestLiveTargetPoint(run, point, kind)
    if (nearest > bestScore) {
      best = point
      bestScore = nearest
    }
  }
  return best
}

function nearestLiveTargetPoint(run, point, kind) {
  let nearest = 999
  for (const target of run.targets) {
    if (target.resolved) continue
    nearest = Math.min(nearest, distance(point.x, point.y, target.x, target.y))
    if (target.kind === 'slide') {
      nearest = Math.min(nearest, distance(point.x, point.y, target.endX, target.endY))
    }
  }
  if (kind === 'slide' && nearest < SLIDE_MIN_ENDPOINT_GAP * 0.45) return -1
  return nearest
}

function randomPointInRegion(region, rng = Math.random) {
  return {
    x: randomFloat(rng, region.minX, region.maxX),
    y: randomFloat(rng, region.minY, region.maxY),
  }
}

function sliderPathLength(target, samples = 28) {
  let length = 0
  let prev = pointOnSlider(target, 0)
  for (let i = 1; i <= samples; i += 1) {
    const point = pointOnSlider(target, i / samples)
    length += distance(prev.x, prev.y, point.x, point.y)
    prev = point
  }
  return length
}

function createSliderPath(start, profile, run, rng = Math.random) {
  const idealGap = (SLIDE_MIN_ENDPOINT_GAP + SLIDE_MAX_ENDPOINT_GAP) / 2
  const idealArc = (SLIDE_MIN_ARC_LENGTH + SLIDE_MAX_ARC_LENGTH) / 2
  let bestPath = null
  let bestScore = -Infinity
  for (let i = 0; i < 48; i += 1) {
    const targetLen = randomFloat(rng, SLIDE_MIN_ENDPOINT_GAP, SLIDE_MAX_ENDPOINT_GAP)
    const direction = start.x < LOGICAL_WIDTH / 2 ? 1 : -1
    const angle = (direction === 1 ? 0 : Math.PI) + randomFloat(rng, -0.5, 0.5) * 0.52
    const endX = clamp(start.x + Math.cos(angle) * targetLen, 70, LOGICAL_WIDTH - 70)
    const endY = clamp(start.y + Math.sin(angle) * targetLen, PLAY_TOP + 70, PLAY_BOTTOM - 70)
    const candidatePath = buildSliderPath(start, endX, endY)
    if (!isSliderPathValid(candidatePath) || !slidePathClearOfOthers(candidatePath, run)) continue
    const sep = distance(start.x, start.y, endX, endY)
    const arc = sliderPathLength(candidatePath)
    const score = -(Math.abs(sep - idealGap) + Math.abs(arc - idealArc) * 0.45)
    if (score > bestScore) {
      bestPath = candidatePath
      bestScore = score
    }
  }
  if (!bestPath) {
    for (let offset = 0; offset < 10; offset += 1) {
      const targetLen =
        SLIDE_MIN_ENDPOINT_GAP + (offset / 9) * (SLIDE_MAX_ENDPOINT_GAP - SLIDE_MIN_ENDPOINT_GAP)
      const direction = start.x < LOGICAL_WIDTH / 2 ? 1 : -1
      const angle = (direction === 1 ? 0 : Math.PI) + (offset - 4.5) * 0.1
      const endX = clamp(start.x + Math.cos(angle) * targetLen, 70, LOGICAL_WIDTH - 70)
      const endY = clamp(start.y + Math.sin(angle) * targetLen, PLAY_TOP + 70, PLAY_BOTTOM - 70)
      const candidatePath = buildSliderPath(start, endX, endY)
      if (isSliderPathValid(candidatePath) && slidePathClearOfOthers(candidatePath, run)) {
        bestPath = candidatePath
        break
      }
    }
    if (!bestPath) {
      const endX = clamp(start.x + idealGap, 70, LOGICAL_WIDTH - 70)
      const endY = clamp(start.y, PLAY_TOP + 70, PLAY_BOTTOM - 70)
      bestPath = buildSliderPath(start, endX, endY)
    }
  }
  return {
    endX: bestPath.endX,
    endY: bestPath.endY,
    controlX: bestPath.controlX,
    controlY: bestPath.controlY,
  }
}

function buildSliderPath(start, endX, endY) {
  const dx = endX - start.x
  const dy = endY - start.y
  const dist = Math.max(1, Math.hypot(dx, dy))
  return {
    x: start.x,
    y: start.y,
    endX,
    endY,
    controlX: (start.x + endX) / 2,
    controlY: (start.y + endY) / 2,
  }
}

function isSliderPathValid(path) {
  const sep = distance(path.x, path.y, path.endX, path.endY)
  if (sep < SLIDE_MIN_ENDPOINT_GAP) return false
  if (sep > SLIDE_MAX_ENDPOINT_GAP) return false
  if (Math.abs(path.endY - path.y) > SLIDE_MAX_VERTICAL_DRIFT) return false
  const arc = sliderPathLength(path)
  if (arc < SLIDE_MIN_ARC_LENGTH) return false
  if (arc > SLIDE_MAX_ARC_LENGTH) return false
  const mid = pointOnSlider(path, 0.5)
  if (distance(mid.x, mid.y, path.x, path.y) < sep * 0.32) return false
  if (distance(mid.x, mid.y, path.endX, path.endY) < sep * 0.32) return false
  for (let i = 1; i < 24; i += 1) {
    const t = i / 24
    if (t < 0.14 || t > 0.86) continue
    const point = pointOnSlider(path, t)
    if (distance(point.x, point.y, path.x, path.y) < SLIDE_MARKER_RADIUS) return false
    if (distance(point.x, point.y, path.endX, path.endY) < SLIDE_MARKER_RADIUS) return false
  }
  return true
}

function slidePathClearOfOthers(path, run) {
  const minSep = SLIDE_MIN_ENDPOINT_GAP * 0.5
  for (const target of run.targets) {
    if (target.resolved || target.kind !== 'slide') continue
    const spots = [
      { x: target.x, y: target.y },
      { x: target.endX, y: target.endY },
    ]
    for (const spot of spots) {
      if (distance(path.x, path.y, spot.x, spot.y) < minSep) return false
      if (distance(path.endX, path.endY, spot.x, spot.y) < minSep) return false
    }
  }
  return true
}

function nearestSliderProgress(target, x, y) {
  let best = { progress: 0, distance: Infinity }
  for (let i = 0; i <= 24; i += 1) {
    const progress = i / 24
    const point = pointOnSlider(target, progress)
    const currentDistance = distance(x, y, point.x, point.y)
    if (currentDistance < best.distance) best = { progress, distance: currentDistance }
  }
  return best
}

function sliderRailProgress(target, x, y) {
  const dx = target.endX - target.x
  const dy = target.endY - target.y
  const lengthSq = Math.max(1, dx * dx + dy * dy)
  const progress = clamp(((x - target.x) * dx + (y - target.y) * dy) / lengthSq, 0, 1)
  const point = pointOnSlider(target, progress)
  return { progress, distance: distance(x, y, point.x, point.y) }
}
