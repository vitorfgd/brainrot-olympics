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
  hitThemeById,
  JUDGES,
} from './rules.js'
import { finishRun, openContinueOffer, persistSave } from './state.js'
import { activeMoodForHit, inactiveCheerMood } from './judgeReactions.js'

const TARGET_RADIUS = 44
const MISS_WINDOW = 0.35

export function updateRun(state) {
  const run = state.run
  if (!run) return

  if (run.status === 'countdown') {
    if (state.time >= run.startedAt) {
      run.status = 'playing'
      run.nextSpawnAt = state.time + 0.2
      showCaption(state, run, 'GO!')
    }
    return
  }

  if (run.status === 'continueOffer') return

  if (run.status !== 'playing') return

  if (run.paused) {
    run.pauseAccum += state.deltaTime
  }
  run.elapsed = state.time - run.startedAt - run.pauseAccum

  if (run.paused) return

  updateEndlessJudge(state)

  for (let i = 0; i < run.inactiveMoods.length; i += 1) {
    if (state.time >= run.inactiveMoods[i].until) {
      run.inactiveMoods[i] = { kind: 'idle', until: 0 }
    }
  }

  const profile = difficultyProfile(run)
  const liveTargets = run.targets.filter((target) => !target.resolved).length
  if (state.time >= run.nextSpawnAt && liveTargets < profile.maxLiveTargets) {
    spawnTarget(run, profile)
    run.nextSpawnAt = state.time + profile.spawnInterval
  }

  for (const target of run.targets) {
    if (target.resolved) continue
    target.age += state.deltaTime
    if (target.kind === 'hold' && target.holding) {
      target.heldFor += state.deltaTime
    }
    if (target.age > target.deadline) {
      resolveHit(state, target, 'miss', 'MISSED THE BEAT')
    }
  }

  run.targets = run.targets.filter((target) => target.age < target.deadline + 0.35 && !target.removed)

  if (run.mode === 'stage' && run.elapsed >= run.duration) {
    finishRun(state, run.hp > 0, run.hp > 0 ? 'STAGE CLEAR' : 'NO HP')
  }
}

export function handleRunPointerDown(state) {
  const run = state.run
  if (!run || run.status !== 'playing' || run.paused) return false
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
  if (!run || run.status !== 'playing' || run.paused || run.activeTargetId === null) return

  const target = run.targets.find((item) => item.id === run.activeTargetId)
  if (!target || target.resolved || target.kind !== 'slide') return

  const nearest = nearestSliderProgress(target, state.pointer.x, state.pointer.y)
  if (nearest.distance > target.tolerance) {
    target.offPathFor += state.deltaTime
    if (target.offPathFor > 0.2) {
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

  if (distance(state.pointer.x, state.pointer.y, target.endX, target.endY) <= TARGET_RADIUS * 1.1 && target.progress > 0.68) {
    const quality = qualityFromTiming(target.age - target.approach)
    resolveHit(state, target, quality, quality === 'miss' ? 'OFF BEAT' : `${HIT_LABELS[quality]} SLIDE`)
    run.activeTargetId = null
  }
}

export function handleRunPointerUp(state) {
  const run = state.run
  if (!run || run.status !== 'playing' || run.paused || run.activeTargetId === null) return

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
  const kind = resolveTargetKind(run)
  const point = chooseTargetPoint(run)
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
      deadline: profile.holdDuration + profile.approach + 0.45,
    })
  }

  run.targets.push(target)
  run.spawnCount += 1
  run.totalNotes += 1
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

function snapshotFatalTarget(target, themeId) {
  const snap = {
    kind: target.kind,
    x: target.x,
    y: target.y,
    age: target.age,
    approach: target.approach,
    deadline: target.deadline,
    themeId,
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
    run.resolvedNotes += 1
    run.hitCounts[quality] += 1
    run.accuracyPoints += HIT_QUALITY_VALUE[quality]
    applyMood(state, run, activeMoodForHit('miss', false))
    run.caption = 'SHIELDED!'
    run.captionUntil = state.time + 0.75
    return
  }

  target.resolved = true
  target.removed = quality !== 'miss'
  run.resolvedNotes += 1
  run.hitCounts[quality] += 1
  run.accuracyPoints += HIT_QUALITY_VALUE[quality]

  if (quality === 'miss') {
    applyMood(state, run, activeMoodForHit('miss', false))
    run.combo = 0
    run.hp = clamp(run.hp + hpDeltaForHit(quality), 0, MAX_HP)
    run.caption = caption
    run.captionUntil = state.time + 0.85
    run.internalMissCause = caption
    if (run.hp <= 0) {
      if ((state.save.bankedExtraLife || 0) > 0 && !run.extraLifeUsedThisRun) {
        state.save.bankedExtraLife -= 1
        persistSave(state.save)
        run.extraLifeUsedThisRun = true
        run.hp = MAX_HP
        showCaption(state, run, 'EXTRA LIFE!', 1.1)
        return
      }
      const snap = snapshotFatalTarget(target, state.save.equippedHitTheme)
      openContinueOffer(state, caption, snap)
    }
    return
  }

  const nextCombo = run.combo + 1
  const gained = scoreForHit(quality, nextCombo)
  run.score += gained
  run.combo = nextCombo
  run.bestCombo = Math.max(run.bestCombo, run.combo)
  run.hp = clamp(run.hp + hpDeltaForHit(quality), 0, MAX_HP)

  const isMilestone = COMBO_MILESTONE_AT.includes(nextCombo)
  const milestoneMood = activeMoodForHit(quality, isMilestone)
  applyMood(state, run, milestoneMood)
  pingInactiveJudges(state, run)

  const theme = hitThemeById(state.save.equippedHitTheme)
  const burstColor = theme.burst[quality] || theme.burst.okay
  const baseCount = quality === 'perfect' ? 18 : 10
  burst(state, target.x, target.y, burstColor, baseCount, theme, isMilestone)

  if (isMilestone) {
    run.caption = milestoneCalloutText(nextCombo)
    run.captionUntil = state.time + 1.48
    run.milestoneFlashUntil = state.time + 0.2
    state.assets.playSfx('milestone', state.save.settings.sfx)
  } else {
    run.caption = caption
    run.captionUntil = state.time + 0.85
  }
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
  const angle = Math.random() * Math.PI * 2
  const end = {
    x: clamp(start.x + Math.cos(angle) * length, 70, LOGICAL_WIDTH - 70),
    y: clamp(start.y + Math.sin(angle) * length, PLAY_TOP + 70, PLAY_BOTTOM - 70),
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

function burst(state, x, y, color, count, theme, milestoneExtra) {
  const scale = milestoneExtra ? theme.milestoneBurstScale : 1
  const n = Math.max(4, Math.round(count * scale))
  for (let i = 0; i < n; i += 1) {
    const angle = Math.random() * Math.PI * 2
    const speed = (80 + Math.random() * 210) * (milestoneExtra ? 1.08 : 1)
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: (4 + Math.random() * 7) * (milestoneExtra ? 1.12 : 1),
      color,
      age: 0,
      life: 0.5 + Math.random() * 0.25,
    })
  }
}
