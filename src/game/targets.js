import {
  PLAY_TOP,
  PLAY_BOTTOM,
  LOGICAL_WIDTH,
  MAX_HP,
  HIT_QUALITY_VALUE,
  HIT_LABELS,
  clamp,
  distance,
  difficultyProfile,
  hpDeltaForHit,
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

const TARGET_RADIUS = 44
const MISS_WINDOW = 0.35
const SPAWN_PREVIEW_LEAD = 0.56
const SLIDE_OFF_PATH_GRACE = 0.28
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
      state.assets.playSfx('countdownTick', state.save.settings.sfx)
    }
    if (state.time >= run.startedAt) {
      run.status = 'playing'
      run.nextSpawnAt = state.time + 0.2
      run.goStartedAt = state.time
      run.goUntil = state.time + 0.62
      showCaption(state, run, 'GO!')
      state.assets.playSfx('countdownTick', state.save.settings.sfx, 1.15)
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
  if (state.time >= run.nextSpawnAt - SPAWN_PREVIEW_LEAD && liveTargets < profile.maxLiveTargets) {
    prepareUpcomingTarget(run, profile, state.time)
  }
  if (state.time >= run.nextSpawnAt && liveTargets < profile.maxLiveTargets) {
    const target = spawnTarget(run, profile)
    if (isFtueTapOpening(run) && target.id === 0) showCaption(state, run, 'TAP', 1.1)
    state.assets.playSfx('targetSpawn', state.save.settings.sfx)
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

  if (run.mode === 'stage' && run.elapsed >= run.duration) {
    finishRun(state, run.hp > 0, run.hp > 0 ? 'STAGE CLEAR' : 'NO HP')
  }
}

export function handleRunPointerDown(state) {
  const run = state.run
  if (!run || run.status !== 'playing') return false
  const { x, y } = state.pointer

  const target = findTargetAt(run, x, y)
  if (!target) return false

  if (target.kind === 'slide') {
    if (distance(x, y, target.x, target.y) > TARGET_RADIUS + 14) {
      resolveHit(state, target, 'miss', 'START ON THE DOT')
      return true
    }
    target.dragging = true
    target.trail = [{ x, y }]
    run.activeTargetId = target.id
    showCaption(state, run, 'SLIDE')
    return true
  }

  if (target.kind === 'hold') {
    target.holding = true
    target.heldFor = 0
    run.activeTargetId = target.id
    showCaption(state, run, 'HOLD')
    return true
  }

  const quality = qualityFromTiming(target.age - target.approach)
  resolveHit(state, target, quality, quality === 'miss' ? 'OFF BEAT' : HIT_LABELS[quality])
  return true
}

export function handleRunPointerMove(state) {
  const run = state.run
  if (!run || run.status !== 'playing' || run.activeTargetId === null) return

  const target = run.targets.find((item) => item.id === run.activeTargetId)
  if (!target || target.resolved || target.kind !== 'slide') return

  const nearest = nearestSliderProgress(target, state.pointer.x, state.pointer.y)
  if (nearest.distance > target.tolerance) {
    target.offPathFor += state.deltaTime
    if (target.offPathFor > SLIDE_OFF_PATH_GRACE) {
      resolveHit(state, target, 'miss', 'LEFT THE PATH')
      run.activeTargetId = null
      return
    }
  } else {
    target.offPathFor = 0
  }

  target.progress = Math.max(target.progress, nearest.progress)
  target.trail.push({ x: state.pointer.x, y: state.pointer.y })
  if (target.trail.length > 18) target.trail.shift()

  if (distance(state.pointer.x, state.pointer.y, target.endX, target.endY) <= TARGET_RADIUS * 1.25 && target.progress > 0.6) {
    const quality = qualityFromTiming(target.age - target.approach)
    resolveHit(state, target, quality, quality === 'miss' ? 'OFF BEAT' : `${HIT_LABELS[quality]} SLIDE`)
    run.activeTargetId = null
  }
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
    resolveHit(state, target, 'miss', 'RELEASED EARLY')
  }

  run.activeTargetId = null
}

export function spawnTarget(run, profile) {
  const upcoming = run.upcomingTarget
  const kind = upcoming?.kind || resolveTargetKind(run)
  const point = upcoming?.point || chooseTargetPoint(run)
  const target = {
    id: run.spawnCount,
    kind,
    x: point.x,
    y: point.y,
    age: 0,
    approach: profile.approach,
    deadline: profile.approach + MISS_WINDOW,
    resolved: false,
    removed: false,
    pulse: Math.random() * Math.PI * 2,
  }

  if (kind === 'slide') {
    const path = createSliderPath(point, profile)
    Object.assign(target, path, {
      deadline: profile.approach + 0.75,
      tolerance: profile.slideTolerance,
      progress: 0,
      dragging: false,
      offPathFor: 0,
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

function shouldShowHoldReleaseCue(target) {
  return target.heldFor >= target.holdDuration - HOLD_RELEASE_CUE_WINDOW
}

function prepareUpcomingTarget(run, profile, time) {
  if (run.upcomingTarget) return
  run.upcomingTarget = {
    kind: resolveTargetKind(run),
    point: chooseTargetPoint(run),
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
  const cheer = inactiveCheerMood()
  const candidates = JUDGES.map((_, i) => i).filter((i) => i !== run.activeJudgeIndex)
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
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
    run.caption = forgiven ? 'WATCH THE RING' : caption
    run.captionUntil = state.time + (forgiven ? 1.15 : 0.85)
    run.internalMissCause = caption
    if (!forgiven && run.hp <= 0) {
      if ((state.save.bankedExtraLife || 0) > 0 && !run.extraLifeUsedThisRun) {
        state.save.bankedExtraLife -= 1
        persistSave(state.save)
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
  if (quality === 'perfect') {
    emitEffect(state, { type: 'hitStop', startedAt: state.time, until: state.time + 0.055 })
  }
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

  spawnHitFirework(state, target.x, target.y, quality, isMilestone)

  if (isMilestone) {
    run.caption = milestoneCalloutText(nextCombo)
    run.captionUntil = state.time + 1.48
    run.milestoneFlashUntil = state.time + 0.2
    state.assets.playSfx(nextCombo === 10 ? 'combo10' : 'combo25Plus', state.save.settings.sfx)
    state.assets.playSfx('judgeReactPositive', state.save.settings.sfx, 0.6)
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
  state.assets.playSfx(key, state.save.settings.sfx)
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
    state.assets.startMusic(JUDGES[nextJudgeIndex], state.save.settings.music)
    showCaption(state, run, 'NEW JUDGE', 1.05)
  }
}

function findTargetAt(run, x, y) {
  for (let i = run.targets.length - 1; i >= 0; i -= 1) {
    const target = run.targets[i]
    if (target.resolved) continue
    if (target.kind === 'slide') {
      const start = distance(x, y, target.x, target.y) <= TARGET_RADIUS + 16
      const path = nearestSliderProgress(target, x, y).distance <= target.tolerance + 10
      if (start || path) return target
    } else if (distance(x, y, target.x, target.y) <= TARGET_RADIUS + 20) {
      return target
    }
  }
  return null
}

function chooseTargetPoint(run) {
  if (run.ftue && run.stage?.id === 1 && run.spawnCount < FTUE_GUIDED_TAP_POINTS.length) {
    return FTUE_GUIDED_TAP_POINTS[run.spawnCount]
  }
  const margin = TARGET_RADIUS + 34
  let best = {
    x: margin + Math.random() * (LOGICAL_WIDTH - margin * 2),
    y: PLAY_TOP + margin + Math.random() * (PLAY_BOTTOM - PLAY_TOP - margin * 2),
  }
  let bestScore = -Infinity
  for (let i = 0; i < 12; i += 1) {
    const point = {
      x: margin + Math.random() * (LOGICAL_WIDTH - margin * 2),
      y: PLAY_TOP + margin + Math.random() * (PLAY_BOTTOM - PLAY_TOP - margin * 2),
    }
    const nearest = run.targets.reduce((min, target) => (target.resolved ? min : Math.min(min, distance(point.x, point.y, target.x, target.y))), 999)
    if (nearest > bestScore) {
      best = point
      bestScore = nearest
    }
  }
  return best
}

function createSliderPath(start, profile) {
  const length = 150 + profile.ramp * 95
  const minGap = 170
  let end = null
  for (let i = 0; i < 12; i += 1) {
    const angle = Math.random() * Math.PI * 2
    const candidate = {
      x: clamp(start.x + Math.cos(angle) * length, 70, LOGICAL_WIDTH - 70),
      y: clamp(start.y + Math.sin(angle) * length, PLAY_TOP + 70, PLAY_BOTTOM - 70),
    }
    end = candidate
    if (distance(start.x, start.y, candidate.x, candidate.y) >= minGap) break
  }
  if (distance(start.x, start.y, end.x, end.y) < minGap) {
    const awayFromCenter = Math.atan2(start.y - (PLAY_TOP + PLAY_BOTTOM) / 2, start.x - LOGICAL_WIDTH / 2)
    end = {
      x: clamp(start.x + Math.cos(awayFromCenter) * minGap, 70, LOGICAL_WIDTH - 70),
      y: clamp(start.y + Math.sin(awayFromCenter) * minGap, PLAY_TOP + 70, PLAY_BOTTOM - 70),
    }
  }
  const dx = end.x - start.x
  const dy = end.y - start.y
  const dist = Math.max(1, Math.hypot(dx, dy))
  const bend = (Math.random() < 0.5 ? -1 : 1) * (24 + profile.ramp * 36)
  return {
    endX: end.x,
    endY: end.y,
    controlX: (start.x + end.x) / 2 + (-dy / dist) * bend,
    controlY: (start.y + end.y) / 2 + (dx / dist) * bend,
  }
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

function spawnHitFirework(state, x, y, quality, milestoneExtra) {
  const baseSize = quality === 'perfect' ? 190 : quality === 'good' ? 158 : 132
  emitEffect(state, {
    type: 'firework',
    x,
    y,
    size: baseSize * (milestoneExtra ? 1.22 : 1),
    life: quality === 'perfect' ? 0.86 : 0.72,
    alpha: quality === 'okay' ? 0.78 : 0.96,
    hit: true,
  })
}
