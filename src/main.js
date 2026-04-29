import './style.css'

const LOGICAL_WIDTH = 540
const LOGICAL_HEIGHT = 960
const PLAY_TOP = 180
const PLAY_BOTTOM = 780
const TARGET_RADIUS = 48
const MAX_PERFORMANCE = 100
const START_TIME = performance.now() / 1000
const FLAG_COLORS = ['#ff8fab', '#fee440', '#00f5d4', '#b9fbc0', '#c77dff', '#ffafcc']
const CONFETTI_COLORS = ['#ff3b5c', '#fee440', '#00f5d4', '#c1ff72', '#f15bb5', '#9b5de5']
const ASSET_BASE = import.meta.env.BASE_URL
const MEDAL_TIERS = [
  { name: 'Participant', short: 'PARTICIPANT', color: '#bde0fe', score: 0, streak: 0 },
  { name: 'Bronze', short: 'BRONZE', color: '#ffb86b', score: 500, streak: 4 },
  { name: 'Silver', short: 'SILVER', color: '#dbe7ff', score: 1300, streak: 9 },
  { name: 'Gold', short: 'GOLD', color: '#fee440', score: 2600, streak: 16 },
  { name: 'Rainbow Gold', short: 'RAINBOW', color: '#f15bb5', score: 4300, streak: 24 },
  { name: 'Brain Rot Champion', short: 'CHAMPION', color: '#00f5d4', score: 6500, streak: 34 },
]
const CHARACTERS = [
  { id: 'traffic_vulture', name: 'TRAFFIC VULTURE', color: '#ff8fab', shape: 'blob', imageSrc: `${ASSET_BASE}characters/traffic-vulture.png` },
  { id: 'rainbow_ferret', name: 'RAINBOW FERRET', color: '#00f5d4', shape: 'capsule', imageSrc: `${ASSET_BASE}characters/rainbow-ferret.png` },
  { id: 'trophy_manatee', name: 'TROPHY MANATEE', color: '#fee440', shape: 'circle', imageSrc: `${ASSET_BASE}characters/trophy-manatee.png` },
  { id: 'vacuum_lemur', name: 'VACUUM LEMUR', color: '#c77dff', shape: 'diamond', imageSrc: `${ASSET_BASE}characters/vacuum-lemur.png` },
]
for (const character of CHARACTERS) {
  character.image = new Image()
  character.image.addEventListener('load', () => {
    character.transparentImage = createTransparentCharacterImage(character.image)
  })
  character.image.src = character.imageSrc
}
const canvas = document.querySelector('#game')
const ctx = canvas.getContext('2d')
const backgroundMusic = new Audio(`${ASSET_BASE}audio/goofy.wav`)
backgroundMusic.loop = true
backgroundMusic.volume = 0.2

const state = {
  status: 'selecting',
  time: 0,
  deltaTime: 0,
  lastFrame: 0,
  inputCount: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  missCount: 0,
  medalTier: 0,
  medalFlashUntil: 0,
  feverUntil: 0,
  screenBumpUntil: 0,
  redShakeUntil: 0,
  streakGlowUntil: 0,
  warningPulseUntil: 0,
  redFlashUntil: 0,
  crowdFlashUntil: 0,
  medalSpotlightUntil: 0,
  performance: 78,
  runStartedAt: 0,
  countdownStartedAt: 0,
  spawnCount: 0,
  nextSpawnAt: 0,
  lastGreenHitAt: 0,
  eliminatedReason: '',
  elimination: {
    at: 0,
    inputReadyAt: 0,
    cause: 'momentum',
    stamp: 'ELIMINATED',
    finalScore: 0,
    finalStreak: 0,
    finalSurvival: 0,
    finalRank: 3,
  },
  announcer: 'OPENING CEREMONY: KEEP PERFORMING OR GET CUT.',
  caption: {
    text: 'STILL IN!',
    kind: 'info',
    until: 0,
  },
  pointer: {
    active: false,
    x: LOGICAL_WIDTH / 2,
    y: LOGICAL_HEIGHT / 2,
  },
  selectedCharacterId: null,
  selectedCharacter: null,
  race: {
    competitors: [],
    cameraY: 0,
    lastPlayerRank: 2,
    alertUntil: 0,
    alertText: '',
  },
  activeSliderId: null,
  targets: [],
  particles: [],
  floatTexts: [],
  ripples: [],
}

function difficultyProfile() {
  const survived = survivedSeconds()
  const ramp = smoothstep(clamp(survived / 60, 0, 1))
  const sequenceRamp = smoothstep(clamp((survived - 8) / 26, 0, 1))
  const chaosRamp = smoothstep(clamp((survived - 24) / 34, 0, 1))
  const lateRamp = smoothstep(clamp((survived - 45) / 35, 0, 1))

  return {
    survived,
    ramp,
    sequenceRamp,
    chaosRamp,
    level: Math.floor(ramp * 5) + 1,
    spawnInterval: lerp(0.95, 0.42, ramp) * (isFeverActive() ? 0.78 : 1),
    targetLife: lerp(1.42, 0.72, ramp),
    drainRate: lerp(5.4, 12.6, ramp) * (isFeverActive() ? 0.84 : 1),
    redChance: lerp(0.11, 0.27, ramp),
    sliderChance: lerp(0.06, 0.2, ramp),
    greenChain: Math.max(3, Math.round(lerp(3, 5, sequenceRamp) + lateRamp + (isFeverActive() ? 2 : 0))),
  }
}

function resizeCanvas() {
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))

  canvas.width = Math.round(LOGICAL_WIDTH * dpr)
  canvas.height = Math.round(LOGICAL_HEIGHT * dpr)
  canvas.style.aspectRatio = `${LOGICAL_WIDTH} / ${LOGICAL_HEIGHT}`

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = true
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * LOGICAL_WIDTH
  const y = ((event.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT

  return {
    x: clamp(x, 0, LOGICAL_WIDTH),
    y: clamp(y, 0, LOGICAL_HEIGHT),
  }
}

function handlePointer(event) {
  event.preventDefault()

  const point = getCanvasPoint(event)
  state.pointer.x = point.x
  state.pointer.y = point.y
  state.pointer.active = event.type !== 'pointerup' && event.type !== 'pointercancel'

  if (event.type === 'pointerdown') {
    startBackgroundMusic()
    canvas.setPointerCapture?.(event.pointerId)
    state.inputCount += 1
    state.ripples.push({ x: point.x, y: point.y, age: 0, maxAge: 0.55 })
    handlePointerDown(point.x, point.y)
  }

  if (event.type === 'pointermove') {
    updateActiveSlider(point.x, point.y)
  }

  if (event.type === 'pointerup' || event.type === 'pointercancel') {
    releaseActiveSlider()
  }
}

function tick(now) {
  const seconds = now / 1000 - START_TIME
  state.deltaTime = state.lastFrame ? Math.min(seconds - state.lastFrame, 0.05) : 0
  state.lastFrame = seconds
  state.time = seconds

  update(state.deltaTime)
  draw()
  requestAnimationFrame(tick)
}

function update(deltaTime) {
  if (state.status === 'countdown' && state.time - state.countdownStartedAt >= 3) {
    startGameplay()
  }

  if (state.status === 'playing') {
    updateRace(deltaTime)

    if (state.time >= state.nextSpawnAt) {
      spawnTarget()
    }

    for (const target of state.targets) {
      target.age += deltaTime
      if (target.kind === 'slider' && !target.resolved && target.age >= target.life) {
        failSlider(target, 'SLIDER TIMED OUT!', 'slow')
      }
      if (target.kind === 'green' && !target.resolved && target.age >= target.life) {
        target.resolved = true
        target.cracked = true
        state.missCount += 1
        applyPerformancePenalty(16, 'MISSED GREEN: MOMENTUM DIPPED.', state.missCount >= 4 ? 'misses' : 'slow')
        showCaption('REACTION TOO SLOW!', 'bad', 1)
        missJuice(target.x, target.y)
        burst(target.x, target.y, '#ff4d6d', 10)
      }
    }

    state.targets = state.targets.filter((target) => target.age < target.life + 0.25 && !target.removed)
    state.performance = clamp(state.performance - performanceDrainRate() * deltaTime, 0, MAX_PERFORMANCE)

    if (state.performance <= 0) {
      eliminateFromRaceCutoff()
    }

    if (shouldEliminateFromRace()) {
      eliminateFromRaceCutoff()
    }
  }

  for (const particle of state.particles) {
    particle.age += deltaTime
    particle.x += particle.vx * deltaTime
    particle.y += particle.vy * deltaTime
    particle.vy += 180 * deltaTime
  }

  for (const text of state.floatTexts) {
    text.age += deltaTime
    text.y -= text.speed * deltaTime
  }

  state.particles = state.particles.filter((particle) => particle.age < particle.life)
  state.floatTexts = state.floatTexts.filter((text) => text.age < text.life)
  state.ripples = state.ripples
    .map((ripple) => ({ ...ripple, age: ripple.age + deltaTime }))
    .filter((ripple) => ripple.age < ripple.maxAge)
}

function isFeverActive() {
  return state.status === 'playing' && state.feverUntil > state.time
}

function draw() {
  clear()

  if (state.status === 'selecting') {
    drawCharacterSelection()
    drawParticles()
    drawRipples()
    return
  }

  ctx.save()
  applyScreenBump()
  applyImpactShake()
  applyEliminationShake()
  drawRainbowSky()
  drawSpotlights()
  drawFlags()
  drawConfetti()
  drawCrowd()
  drawTrack()
  drawRaceLayer()
  drawTargets()
  drawParticles()
  drawFloatingTexts()
  drawRipples()
  drawPointerBeacon()
  drawCriticalPulse()
  drawWarningPulse()
  drawRedFlash()
  drawMedalSpotlight()
  drawBroadcastHud()
  ctx.restore()
  if (state.status === 'countdown') {
    drawCountdownOverlay()
  }
  if (state.status === 'eliminated') {
    drawEliminationOverlay()
  }
  drawCaption()
}

function clear() {
  ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
}

function drawRainbowSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT)
  const energy = openingEnergy()
  if (isFeverActive()) {
    gradient.addColorStop(0, '#ffafcc')
    gradient.addColorStop(0.2, '#fee440')
    gradient.addColorStop(0.42, '#00f5d4')
    gradient.addColorStop(0.68, '#9b5de5')
    gradient.addColorStop(1, '#caffbf')
  } else {
    gradient.addColorStop(0, '#fff0f8')
    gradient.addColorStop(0.2, '#ffd6f6')
    gradient.addColorStop(0.42, '#bde0fe')
    gradient.addColorStop(0.68, '#fdffb6')
    gradient.addColorStop(1, '#caffbf')
  }
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)

  const blobCount = isFeverActive() ? 13 : 9 + Math.round(energy * 4)
  for (let i = 0; i < blobCount; i += 1) {
    const hue = (i * 42 + state.time * (isFeverActive() ? 58 : 18 + energy * 24)) % 360
    ctx.fillStyle = `hsla(${hue}, 95%, 72%, ${isFeverActive() ? 0.34 : 0.22 + energy * 0.08})`
    ctx.beginPath()
    ctx.ellipse(34 + i * 62, 116 + Math.sin(state.time + i) * 12, 142, 44, -0.35, 0, Math.PI * 2)
    ctx.fill()
  }

  drawText(arenaTagline(), LOGICAL_WIDTH / 2, 178, 16, '#6d597a', 'center', 900)

  const pressure = 1 - state.performance / MAX_PERFORMANCE
  if (pressure > 0.45) {
    ctx.fillStyle = `rgba(255, 59, 92, ${(pressure - 0.45) * 0.34})`
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  }
}

function drawSpotlights() {
  const energy = openingEnergy()
  const sweep = Math.sin(state.time * (0.9 + energy * 1.1)) * (54 + energy * 34)
  const lights = [
    { x: -24, top: 0, bottom: 520 + sweep, color: 'rgba(255, 255, 255, 0.18)' },
    { x: LOGICAL_WIDTH + 24, top: 0, bottom: 520 - sweep, color: 'rgba(0, 245, 212, 0.13)' },
    { x: LOGICAL_WIDTH / 2, top: 0, bottom: 590, color: 'rgba(255, 175, 204, 0.16)' },
  ]

  for (const light of lights) {
    const gradient = ctx.createLinearGradient(light.x, light.top, LOGICAL_WIDTH / 2, light.bottom)
    gradient.addColorStop(0, light.color)
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(light.x, light.top)
    ctx.lineTo(LOGICAL_WIDTH / 2 - 92, light.bottom)
    ctx.lineTo(LOGICAL_WIDTH / 2 + 92, light.bottom)
    ctx.closePath()
    ctx.fill()
  }
}

function drawFlags() {
  ctx.strokeStyle = 'rgba(109, 89, 122, 0.42)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(20, 190)
  ctx.quadraticCurveTo(LOGICAL_WIDTH / 2, 136, LOGICAL_WIDTH - 20, 190)
  ctx.stroke()

  for (let i = 0; i < 14; i += 1) {
    const t = i / 13
    const x = lerp(34, LOGICAL_WIDTH - 34, t)
    const y = 188 - Math.sin(t * Math.PI) * 42
    const sway = Math.sin(state.time * 2.4 + i) * 3
    ctx.fillStyle = FLAG_COLORS[i % FLAG_COLORS.length]
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 18 + sway, y + 14)
    ctx.lineTo(x, y + 28)
    ctx.closePath()
    ctx.fill()
  }
}

function drawConfetti() {
  const energy = openingEnergy()
  const count = 42 + Math.round(energy * 18)
  for (let i = 0; i < count; i += 1) {
    const lane = (i * 67) % LOGICAL_WIDTH
    const fall = (state.time * (22 + energy * 24 + (i % 5) * 7) + i * 31) % 430
    const x = lane + Math.sin(state.time * 1.7 + i) * 12
    const y = 46 + fall
    if (y > 470) continue

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(state.time * 2 + i)
    ctx.fillStyle = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
    roundRect(-4, -2, 8, 4, 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawCrowd() {
  const energy = openingEnergy()
  const stand = ctx.createLinearGradient(0, 220, 0, 414)
  stand.addColorStop(0, 'rgba(255, 255, 255, 0.38)')
  stand.addColorStop(0.46, 'rgba(199, 125, 255, 0.32)')
  stand.addColorStop(1, 'rgba(73, 49, 133, 0.48)')
  ctx.fillStyle = stand
  ctx.beginPath()
  ctx.moveTo(0, 232)
  ctx.quadraticCurveTo(LOGICAL_WIDTH / 2, 190, LOGICAL_WIDTH, 232)
  ctx.lineTo(LOGICAL_WIDTH, 420)
  ctx.lineTo(0, 420)
  ctx.closePath()
  ctx.fill()

  for (let band = 0; band < 4; band += 1) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.22 - band * 0.03})`
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(0, 262 + band * 36)
    ctx.quadraticCurveTo(LOGICAL_WIDTH / 2, 226 + band * 36, LOGICAL_WIDTH, 262 + band * 36)
    ctx.stroke()
  }

  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 20; col += 1) {
      const x = 10 + col * 28 + (row % 2) * 8
      const y = 252 + row * 22
      const wave = Math.sin(state.time * (4 + energy * 5) + col * 0.6 + row) * (3 + energy * 4)
      ctx.fillStyle = `hsl(${(col * 24 + row * 35 + state.time * energy * 80) % 360}, 88%, ${68 + (row % 3) * 5}%)`
      ctx.beginPath()
      ctx.arc(x, y + wave, 5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'rgba(23, 18, 54, 0.38)'
      ctx.beginPath()
      ctx.arc(x, y + wave + 8, 5, Math.PI, 0)
      ctx.fill()
    }
  }

}

function drawTrack() {
  const gradient = ctx.createLinearGradient(0, 388, 0, LOGICAL_HEIGHT)
  gradient.addColorStop(0, '#ffafcc')
  gradient.addColorStop(0.35, '#ffc8dd')
  gradient.addColorStop(0.66, '#bde0fe')
  gradient.addColorStop(1, '#a2d2ff')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.moveTo(0, 414)
  ctx.quadraticCurveTo(LOGICAL_WIDTH / 2, 500, LOGICAL_WIDTH, 414)
  ctx.lineTo(LOGICAL_WIDTH, LOGICAL_HEIGHT)
  ctx.lineTo(0, LOGICAL_HEIGHT)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)'
  ctx.lineWidth = 4
  for (let i = 1; i < 5; i += 1) {
    const y = 490 + i * 78
    ctx.beginPath()
    ctx.moveTo(24, y)
    ctx.quadraticCurveTo(LOGICAL_WIDTH / 2, y + 42, LOGICAL_WIDTH - 24, y)
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.36)'
  for (let i = 0; i < 8; i += 1) {
    const x = 34 + i * 68
    ctx.beginPath()
    ctx.ellipse(x, 506 + Math.sin(i) * 16, 20, 8, -0.24, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawTargets() {
  for (const target of state.targets) {
    if (target.kind === 'slider') {
      drawSliderTarget(target)
      continue
    }

    const progress = clamp(target.age / target.life, 0, 1)
    const pop = easeOutBack(clamp(target.age / 0.18, 0, 1))
    const radius = TARGET_RADIUS * pop
    const ringRadius = lerp(TARGET_RADIUS * target.ringStart, TARGET_RADIUS * 1.05, progress)
    const alpha = target.resolved ? clamp(1 - (target.age - target.life) / 0.25, 0, 1) : 1
    const style = targetStyle(target.kind)

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.shadowColor = style.shadow
    ctx.shadowBlur = target.kind === 'rainbow' ? 28 : 18
    ctx.strokeStyle = style.ring
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.arc(target.x, target.y, ringRadius, 0, Math.PI * 2)
    ctx.stroke()

    ctx.shadowBlur = 0
    if (target.kind === 'rainbow') {
      const gradient = ctx.createLinearGradient(target.x - radius, target.y - radius, target.x + radius, target.y + radius)
      gradient.addColorStop(0, '#ff3b5c')
      gradient.addColorStop(0.25, '#fee440')
      gradient.addColorStop(0.5, '#00f5d4')
      gradient.addColorStop(0.75, '#9b5de5')
      gradient.addColorStop(1, '#f15bb5')
      ctx.fillStyle = gradient
    } else {
      ctx.fillStyle = style.core
    }
    ctx.beginPath()
    ctx.arc(target.x, target.y, radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(target.x, target.y, radius - 4, 0, Math.PI * 2)
    ctx.stroke()

    if (target.kind === 'red') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.moveTo(target.x - radius * 0.42, target.y - radius * 0.42)
      ctx.lineTo(target.x + radius * 0.42, target.y + radius * 0.42)
      ctx.moveTo(target.x + radius * 0.42, target.y - radius * 0.42)
      ctx.lineTo(target.x - radius * 0.42, target.y + radius * 0.42)
      ctx.stroke()

      ctx.strokeStyle = '#3d2c5f'
      ctx.lineWidth = 3
      ctx.stroke()
    }

    if (target.cracked) {
      ctx.strokeStyle = 'rgba(61, 44, 95, 0.72)'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(target.x - radius * 0.45, target.y - radius * 0.15)
      ctx.lineTo(target.x - radius * 0.05, target.y + radius * 0.08)
      ctx.lineTo(target.x + radius * 0.28, target.y - radius * 0.2)
      ctx.moveTo(target.x - radius * 0.12, target.y - radius * 0.44)
      ctx.lineTo(target.x + radius * 0.05, target.y + radius * 0.38)
      ctx.stroke()
    }

    drawText(style.text, target.x, target.y + 1, style.text.length > 3 ? 19 : 24, '#171236', 'center', 1000)
    ctx.restore()
  }
}

function drawSliderTarget(target) {
  const progress = clamp(target.age / target.life, 0, 1)
  const pop = easeOutBack(clamp(target.age / 0.18, 0, 1))
  const alpha = target.resolved ? clamp(1 - (target.age - target.life) / 0.25, 0, 1) : 1
  const pathColor = target.failed ? '#ff3b5c' : target.dragging ? '#00f5d4' : '#f15bb5'
  const indicator = pointOnSlider(target, target.sliderProgress || progress * 0.15)
  const endPulse = 1 + Math.sin(state.time * 10) * 0.08

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (target.failed) ctx.setLineDash([16, 12])

  ctx.shadowColor = target.failed ? 'rgba(255, 59, 92, 0.75)' : 'rgba(0, 245, 212, 0.7)'
  ctx.shadowBlur = target.dragging ? 28 : 16
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.86)'
  ctx.lineWidth = 32
  drawSliderPath(target)
  ctx.stroke()

  ctx.strokeStyle = pathColor
  ctx.lineWidth = 20
  drawSliderPath(target)
  ctx.stroke()

  ctx.setLineDash([])
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(61, 44, 95, 0.28)'
  ctx.lineWidth = 4
  drawSliderPath(target)
  ctx.stroke()

  if (target.trail.length > 1) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)'
    ctx.lineWidth = 9
    ctx.beginPath()
    ctx.moveTo(target.trail[0].x, target.trail[0].y)
    for (const point of target.trail.slice(1)) {
      ctx.lineTo(point.x, point.y)
    }
    ctx.stroke()
  }

  drawSliderCircle(target.endX, target.endY, TARGET_RADIUS * 0.82 * endPulse, '#fee440', 'END')
  drawSliderCircle(target.x, target.y, TARGET_RADIUS * pop, '#00f5d4', 'HOLD')

  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#3d2c5f'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(indicator.x, indicator.y, 15 + Math.sin(state.time * 18) * 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.restore()
}

function drawSliderPath(target) {
  ctx.beginPath()
  ctx.moveTo(target.x, target.y)
  ctx.quadraticCurveTo(target.controlX, target.controlY, target.endX, target.endY)
}

function drawSliderCircle(x, y, radius, color, label) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(x, y, radius - 4, 0, Math.PI * 2)
  ctx.stroke()

  drawText(label, x, y, label.length > 3 ? 16 : 20, '#171236', 'center', 1000)
}

function targetStyle(kind) {
  if (kind === 'red') {
    return { core: '#ff3b5c', ring: '#ffffff', shadow: 'rgba(255, 59, 92, 0.72)', text: 'NO!' }
  }
  if (kind === 'gold') {
    return { core: '#fee440', ring: '#fff3b0', shadow: 'rgba(254, 228, 64, 0.72)', text: 'BONUS' }
  }
  if (kind === 'rainbow') {
    return { core: '#f15bb5', ring: '#ffffff', shadow: 'rgba(241, 91, 181, 0.76)', text: 'FEVER' }
  }
  return { core: '#2ee59d', ring: '#c1ff72', shadow: 'rgba(46, 229, 157, 0.5)', text: 'TAP' }
}

function drawPodium() {
  const baseY = 742
  const steps = [
    { x: 116, y: baseY + 46, w: 96, h: 74, label: '3', color: '#caffbf' },
    { x: 222, y: baseY - 4, w: 96, h: 124, label: '1', color: '#fdffb6' },
    { x: 328, y: baseY + 26, w: 96, h: 94, label: '2', color: '#ffc8dd' },
  ]

  ctx.fillStyle = 'rgba(23, 18, 54, 0.18)'
  ctx.beginPath()
  ctx.ellipse(LOGICAL_WIDTH / 2, baseY + 120, 210, 38, 0, 0, Math.PI * 2)
  ctx.fill()

  for (const step of steps) {
    ctx.fillStyle = step.color
    roundRect(step.x, step.y, step.w, step.h, 16)
    ctx.fill()
    ctx.strokeStyle = 'rgba(61, 44, 95, 0.34)'
    ctx.lineWidth = 4
    ctx.stroke()
    drawText(step.label, step.x + step.w / 2, step.y + 49, 38, '#9b5de5', 'center', 1000)
  }

}

function drawParticles() {
  for (const particle of state.particles) {
    const progress = particle.age / particle.life
    ctx.globalAlpha = 1 - progress
    ctx.fillStyle = particle.color
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.size * (1 - progress * 0.5), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawFloatingTexts() {
  for (const text of state.floatTexts) {
    const progress = text.age / text.life
    ctx.globalAlpha = 1 - progress
    drawText(text.text, text.x, text.y, text.size, text.color, 'center', 1000)
  }
  ctx.globalAlpha = 1
}

function drawRipples() {
  for (const ripple of state.ripples) {
    const progress = ripple.age / ripple.maxAge
    ctx.strokeStyle = `rgba(255, 255, 255, ${1 - progress})`
    ctx.lineWidth = 7 * (1 - progress)
    ctx.beginPath()
    ctx.arc(ripple.x, ripple.y, 20 + progress * 95, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function drawPointerBeacon() {
  if (!state.pointer.active) return

  const pulse = 1 + Math.sin(state.time * 14) * 0.12
  ctx.fillStyle = 'rgba(255, 255, 255, 0.84)'
  ctx.beginPath()
  ctx.arc(state.pointer.x, state.pointer.y, 18 * pulse, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#00f5d4'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(state.pointer.x, state.pointer.y, 30 * pulse, 0, Math.PI * 2)
  ctx.stroke()
}

function drawBroadcastHud() {
  const meterValue = state.performance / MAX_PERFORMANCE
  const warning = pressureState()
  const line = broadcastLine()

  drawPanel(22, 18, 496, 128, 'rgba(255, 255, 255, 0.86)')
  ctx.strokeStyle = '#f15bb5'
  ctx.lineWidth = 5
  roundRect(22, 18, 496, 128, 24)
  ctx.stroke()
  drawText('BRAIN ROT OLYMPICS', LOGICAL_WIDTH / 2, 48, 28, '#3d2c5f', 'center', 1000)
  drawText(line, LOGICAL_WIDTH / 2, 78, 14, '#6d597a', 'center', 800)
  drawScoreChip(42, 104, 140, 'SCORE', state.score)
  drawScoreChip(200, 104, 140, 'STREAK', state.streak)
  drawScoreChip(358, 104, 140, 'TIME', `${survivedSeconds().toFixed(1)}s`)

  drawPanel(36, 822, 468, 94, 'rgba(23, 18, 54, 0.76)')
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
  ctx.lineWidth = 3
  roundRect(36, 822, 468, 94, 24)
  ctx.stroke()
  drawText(warning.headline, LOGICAL_WIDTH / 2, 846, 17, warning.color, 'center', 900)
  drawMeter(66, 872, 408, 15, meterValue, warning)
  const feverText = isFeverActive() ? `FEVER ${Math.ceil(state.feverUntil - state.time)}s` : `PERFORMANCE ${Math.round(state.performance)}%`
  drawText(feverText, 66, 900, 15, isFeverActive() ? '#00f5d4' : '#fee440', 'left', 900)
  drawText(warning.label, 474, 900, 15, warning.color, 'right', 900)
  drawMedalProgress(66, 916, 408, 10)
}

function drawCaption() {
  if (state.caption.until <= state.time) return

  const remaining = clamp(state.caption.until - state.time, 0, 1)
  const scale = 1 + Math.sin(state.time * 28) * 0.025
  const color = state.caption.kind === 'bad' ? '#ff3b5c' : state.caption.kind === 'perfect' ? '#00f5d4' : '#fee440'

  ctx.save()
  ctx.translate(LOGICAL_WIDTH / 2, 246)
  ctx.scale(scale, scale)
  ctx.globalAlpha = clamp(remaining * 2.2, 0, 1)
  drawPanel(-190, -30, 380, 60, 'rgba(255, 255, 255, 0.9)')
  ctx.strokeStyle = color
  ctx.lineWidth = 5
  roundRect(-190, -30, 380, 60, 22)
  ctx.stroke()
  drawText(state.caption.text, 0, 0, 30, color, 'center', 1000)
  ctx.restore()
}

function drawOpeningPrompt() {
  const survived = survivedSeconds()
  if (state.status !== 'playing' || survived > 5) return

  const pulse = 1 + Math.sin(state.time * 8) * 0.03
  ctx.save()
  ctx.translate(LOGICAL_WIDTH / 2, 258)
  ctx.scale(pulse, pulse)
  drawPanel(-176, -34, 352, 68, 'rgba(255, 255, 255, 0.9)')
  ctx.strokeStyle = '#00f5d4'
  ctx.lineWidth = 5
  roundRect(-176, -34, 352, 68, 24)
  ctx.stroke()
  drawText('KEEP PERFORMING!', 0, -8, 28, '#3d2c5f', 'center', 1000)
  drawText('GREEN GO  /  RED NO', 0, 20, 14, '#f15bb5', 'center', 900)
  ctx.restore()
}

function drawScoreChip(x, y, width, label, value) {
  const streakGlow = label === 'STREAK' && state.streakGlowUntil > state.time
  if (streakGlow) {
    ctx.shadowColor = '#f15bb5'
    ctx.shadowBlur = 18
  }
  ctx.fillStyle = 'rgba(199, 245, 255, 0.78)'
  roundRect(x, y, width, 28, 14)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(61, 44, 95, 0.16)'
  ctx.lineWidth = 2
  ctx.stroke()
  drawText(label, x + 12, y + 14, 11, '#6d597a', 'left', 900)
  drawText(String(value), x + width - 12, y + 14, 15, '#3d2c5f', 'right', 1000)
}

function drawMedalChip(x, y, width, medal, pulse) {
  ctx.save()
  ctx.translate(x + width / 2, y + 14)
  ctx.scale(pulse, pulse)
  ctx.fillStyle = medal.color
  roundRect(-width / 2, -14, width, 28, 14)
  ctx.fill()
  ctx.strokeStyle = 'rgba(61, 44, 95, 0.22)'
  ctx.lineWidth = 2
  ctx.stroke()
  drawText('MEDAL', -width / 2 + 12, 0, 11, '#6d597a', 'left', 900)
  drawText(medal.short, width / 2 - 10, 0, medal.short.length > 8 ? 12 : 14, '#3d2c5f', 'right', 1000)
  ctx.restore()
}

function drawMedalProgress(x, y, width, height) {
  const progress = medalProgressRatio()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
  roundRect(x, y, width, height, height / 2)
  ctx.fill()

  const gradient = ctx.createLinearGradient(x, y, x + width, y)
  for (let i = 0; i < MEDAL_TIERS.length; i += 1) {
    gradient.addColorStop(i / (MEDAL_TIERS.length - 1), MEDAL_TIERS[i].color)
  }
  ctx.fillStyle = gradient
  roundRect(x, y, width * progress, height, height / 2)
  ctx.fill()

  for (let i = 0; i < MEDAL_TIERS.length; i += 1) {
    const px = x + width * (i / (MEDAL_TIERS.length - 1))
    ctx.fillStyle = i <= state.medalTier ? MEDAL_TIERS[i].color : 'rgba(255, 255, 255, 0.35)'
    ctx.beginPath()
    ctx.arc(px, y + height / 2, i === state.medalTier ? 5 : 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function medalProgressRatio() {
  if (state.medalTier >= MEDAL_TIERS.length - 1) return 1

  const current = MEDAL_TIERS[state.medalTier]
  const next = MEDAL_TIERS[state.medalTier + 1]
  const scoreProgress = (state.score - current.score) / Math.max(1, next.score - current.score)
  const streakProgress = (state.streak - current.streak) / Math.max(1, next.streak - current.streak)
  const tierProgress = clamp(Math.max(scoreProgress, streakProgress), 0, 1)

  return (state.medalTier + tierProgress) / (MEDAL_TIERS.length - 1)
}

function drawCriticalPulse() {
  if (state.status !== 'playing' || pressureState().label !== 'CRITICAL') return

  const pulse = 0.16 + Math.sin(state.time * 13) * 0.08
  ctx.fillStyle = `rgba(255, 59, 92, ${pulse})`
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)

  ctx.strokeStyle = `rgba(255, 255, 255, ${0.45 + pulse})`
  ctx.lineWidth = 9
  ctx.strokeRect(10, 10, LOGICAL_WIDTH - 20, LOGICAL_HEIGHT - 20)
}

function applyScreenBump() {
  if (state.screenBumpUntil <= state.time) return

  const remaining = clamp((state.screenBumpUntil - state.time) / 0.18, 0, 1)
  const bump = Math.sin(remaining * Math.PI) * 5
  ctx.translate(0, -bump)
}

function applyImpactShake() {
  if (state.redShakeUntil <= state.time) return

  const remaining = clamp((state.redShakeUntil - state.time) / 0.5, 0, 1)
  const strength = remaining * 11
  ctx.translate(Math.sin(state.time * 120) * strength, Math.cos(state.time * 96) * strength)
}

function drawWarningPulse() {
  if (state.warningPulseUntil <= state.time) return

  const alpha = clamp((state.warningPulseUntil - state.time) / 0.35, 0, 1) * 0.24
  ctx.fillStyle = `rgba(254, 228, 64, ${alpha})`
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
}

function drawRedFlash() {
  if (state.redFlashUntil <= state.time) return

  const remaining = clamp((state.redFlashUntil - state.time) / 0.45, 0, 1)
  ctx.fillStyle = `rgba(255, 59, 92, ${remaining * 0.38})`
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
}

function drawMedalSpotlight() {
  const active = state.medalSpotlightUntil > state.time || state.crowdFlashUntil > state.time
  if (!active) return

  if (state.crowdFlashUntil > state.time) {
    const alpha = clamp((state.crowdFlashUntil - state.time) / 0.75, 0, 1) * 0.22
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.fillRect(0, 210, LOGICAL_WIDTH, 222)
  }

  if (state.medalSpotlightUntil > state.time) {
    const alpha = clamp((state.medalSpotlightUntil - state.time) / 1.1, 0, 1)
    const sweep = Math.sin(state.time * 8) * 90
    const gradient = ctx.createLinearGradient(LOGICAL_WIDTH / 2 + sweep, 0, LOGICAL_WIDTH / 2, 760)
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.34 * alpha})`)
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(LOGICAL_WIDTH / 2 + sweep, 0)
    ctx.lineTo(LOGICAL_WIDTH / 2 - 150, 760)
    ctx.lineTo(LOGICAL_WIDTH / 2 + 150, 760)
    ctx.closePath()
    ctx.fill()
  }
}

function applyEliminationShake() {
  if (state.status !== 'eliminated') return

  const elapsed = state.time - state.elimination.at
  if (elapsed > 0.7) return

  const strength = (1 - elapsed / 0.7) * 13
  const x = Math.sin(state.time * 91) * strength
  const y = Math.cos(state.time * 77) * strength
  const rotation = Math.sin(state.time * 63) * 0.012 * (1 - elapsed / 0.7)
  ctx.translate(LOGICAL_WIDTH / 2 + x, LOGICAL_HEIGHT / 2 + y)
  ctx.rotate(rotation)
  ctx.translate(-LOGICAL_WIDTH / 2, -LOGICAL_HEIGHT / 2)
}

function drawEliminationOverlay() {
  const elapsed = Math.max(0, state.time - state.elimination.at)
  const stampScale = easeOutBack(clamp(elapsed / 0.32, 0, 1))
  const revealStats = elapsed > 0.45
  const restartReady = state.time >= state.elimination.inputReadyAt

  ctx.fillStyle = 'rgba(61, 44, 95, 0.66)'
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  drawBroadcastStatic(elapsed)
  drawEliminationConfetti(elapsed)

  ctx.save()
  ctx.translate(LOGICAL_WIDTH / 2, 272)
  ctx.rotate(-0.1 + Math.sin(state.time * 20) * 0.01)
  ctx.scale(stampScale, stampScale)
  drawPanel(-232, -54, 464, 108, 'rgba(255, 255, 255, 0.94)')
  ctx.strokeStyle = '#ff3b5c'
  ctx.lineWidth = 9
  roundRect(-232, -54, 464, 108, 16)
  ctx.stroke()
  drawText(state.elimination.stamp, 0, -8, stampTextSize(state.elimination.stamp), '#ff3b5c', 'center', 1000)
  drawText('OFFICIAL BRAIN ROT OLYMPICS RULING', 0, 34, 14, '#9b5de5', 'center', 900)
  ctx.restore()

  drawPanel(38, 396, 464, 318, 'rgba(255, 255, 255, 0.92)')
  ctx.strokeStyle = '#fee440'
  ctx.lineWidth = 7
  roundRect(38, 396, 464, 318, 24)
  ctx.stroke()
  drawText('BROADCAST DISASTER RECAP', LOGICAL_WIDTH / 2, 434, 22, '#3d2c5f', 'center', 1000)
  drawText(state.eliminatedReason, LOGICAL_WIDTH / 2, 468, 17, '#6d597a', 'center', 900)
  if (revealStats) {
    drawFinalStat(78, 506, 'FINAL SCORE', state.elimination.finalScore)
    drawFinalStat(78, 542, 'BEST STREAK', state.elimination.finalStreak)
    drawFinalStat(78, 578, 'SURVIVED', `${state.elimination.finalSurvival.toFixed(1)}s`)
    drawFinalStat(78, 614, 'FINAL RANK', ordinal(state.elimination.finalRank))
  }
  drawRestartButton(118, 650, 304, 44, restartReady)
}

function drawBroadcastStatic(elapsed) {
  const alpha = elapsed < 0.45 ? 0.28 : 0.13
  for (let y = 0; y < LOGICAL_HEIGHT; y += 6) {
    const shade = (Math.sin(y * 12.989 + state.time * 88) + 1) * 0.5
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * shade})`
    ctx.fillRect(0, y, LOGICAL_WIDTH, 2)
  }
}

function drawEliminationConfetti(elapsed) {
  for (let i = 0; i < 38; i += 1) {
    const x = (i * 71 + Math.sin(i) * 19) % LOGICAL_WIDTH
    const y = (elapsed * (180 + (i % 5) * 44) + i * 29) % LOGICAL_HEIGHT
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(elapsed * 7 + i)
    ctx.fillStyle = CONFETTI_COLORS[(i + 2) % CONFETTI_COLORS.length]
    roundRect(-7, -3, 14, 6, 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawFinalStat(x, y, label, value) {
  drawPanel(x, y - 18, 384, 32, 'rgba(199, 245, 255, 0.72)')
  drawText(label, x + 18, y, 14, '#6d597a', 'left', 900)
  drawText(String(value), x + 366, y, 18, '#3d2c5f', 'right', 1000)
}

function stampTextSize(text) {
  if (text.length > 20) return 25
  if (text.length > 15) return 31
  return 39
}

function drawRestartButton(x, y, width, height, enabled = true) {
  const pulse = enabled ? 1 + Math.sin(state.time * 8) * 0.02 : 1
  ctx.save()
  ctx.translate(x + width / 2, y + height / 2)
  ctx.scale(pulse, pulse)
  ctx.fillStyle = enabled ? '#00f5d4' : 'rgba(255, 255, 255, 0.55)'
  roundRect(-width / 2, -height / 2, width, height, 18)
  ctx.fill()
  ctx.strokeStyle = '#3d2c5f'
  ctx.lineWidth = 4
  ctx.stroke()
  drawText(enabled ? 'RESTART EVENT' : 'RESULTS LOCKED', 0, 0, enabled ? 21 : 18, '#3d2c5f', 'center', 1000)
  ctx.restore()
  if (!enabled) {
    drawText('TAP TO RESTART', LOGICAL_WIDTH / 2, y + height + 24, 13, 'rgba(61, 44, 95, 0.55)', 'center', 900)
  }
}

function drawCountdownOverlay() {
  const elapsed = state.time - state.countdownStartedAt
  const number = 3 - Math.floor(elapsed)
  const text = number > 0 ? String(number) : 'GO!'
  const pulse = 1 + Math.sin(state.time * 10) * 0.04

  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)

  ctx.save()
  ctx.translate(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2)
  ctx.scale(pulse, pulse)
  drawPanel(-130, -92, 260, 184, 'rgba(255, 255, 255, 0.9)')
  ctx.strokeStyle = text === 'GO!' ? '#00f5d4' : '#f15bb5'
  ctx.lineWidth = 8
  roundRect(-130, -92, 260, 184, 34)
  ctx.stroke()
  drawText(text, 0, -12, text === 'GO!' ? 70 : 92, text === 'GO!' ? '#00f5d4' : '#3d2c5f', 'center', 1000)
  drawText('GET READY', 0, 58, 18, '#6d597a', 'center', 900)
  ctx.restore()
}

function drawCharacterSelection() {
  drawSelectionBackground()

  drawPanel(30, 34, 480, 118, 'rgba(255, 255, 255, 0.88)')
  ctx.strokeStyle = '#f15bb5'
  ctx.lineWidth = 5
  roundRect(30, 34, 480, 118, 28)
  ctx.stroke()
  drawText('CHOOSE YOUR BRAINROT', LOGICAL_WIDTH / 2, 76, 31, '#3d2c5f', 'center', 1000)
  drawText('PICK YOUR QUESTIONABLE ATHLETE', LOGICAL_WIDTH / 2, 112, 15, '#f15bb5', 'center', 900)

  for (const character of CHARACTERS) {
    drawCharacterCard(character)
  }

  drawStartSelectionButton()
}

function drawSelectionBackground() {
  const hue = (state.time * 18) % 360
  const gradient = ctx.createLinearGradient(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  gradient.addColorStop(0, `hsl(${hue}, 100%, 88%)`)
  gradient.addColorStop(0.45, '#bde0fe')
  gradient.addColorStop(1, `hsl(${(hue + 120) % 360}, 100%, 88%)`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)

  for (let i = 0; i < 10; i += 1) {
    ctx.fillStyle = `hsla(${(hue + i * 35) % 360}, 95%, 72%, 0.24)`
    ctx.beginPath()
    ctx.ellipse(48 + i * 58, 220 + Math.sin(state.time * 1.2 + i) * 18, 96, 34, -0.25, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawCharacterCard(character) {
  const bounds = characterBounds(character)
  const selected = state.selectedCharacterId === character.id
  const bounce = Math.sin(state.time * 3.2 + CHARACTERS.indexOf(character)) * 5
  const pulse = selected ? 1 + Math.sin(state.time * 9) * 0.035 : 1

  ctx.save()
  ctx.translate(bounds.x + bounds.w / 2, bounds.y + bounds.h / 2 + bounce)
  ctx.scale(selected ? 1.06 * pulse : 1, selected ? 1.06 * pulse : 1)
  ctx.shadowColor = selected ? character.color : 'rgba(61, 44, 95, 0.18)'
  ctx.shadowBlur = selected ? 26 : 8
  drawPanel(-bounds.w / 2, -bounds.h / 2, bounds.w, bounds.h, 'rgba(255, 255, 255, 0.82)')
  ctx.shadowBlur = 0
  ctx.strokeStyle = selected ? character.color : 'rgba(61, 44, 95, 0.22)'
  ctx.lineWidth = selected ? 6 : 3
  roundRect(-bounds.w / 2, -bounds.h / 2, bounds.w, bounds.h, 24)
  ctx.stroke()

  drawCharacterShape(character, 0, -20)
  drawText(character.name, 0, 52, character.name.length > 10 ? 12 : 14, '#3d2c5f', 'center', 1000)
  drawText(selected ? 'LOCKED IN' : 'TAP', 0, 74, 12, selected ? '#f15bb5' : '#6d597a', 'center', 900)
  ctx.restore()
}

function drawCharacterShape(character, x, y) {
  if (character.image?.complete && character.image.naturalWidth > 0) {
    drawCharacterImage(character, x, y)
    return
  }

  ctx.fillStyle = character.color
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.86)'
  ctx.lineWidth = 5

  if (character.shape === 'square') {
    roundRect(x - 34, y - 34, 68, 68, 14)
    ctx.fill()
    ctx.stroke()
  } else if (character.shape === 'triangle') {
    ctx.beginPath()
    ctx.moveTo(x, y - 42)
    ctx.lineTo(x + 42, y + 34)
    ctx.lineTo(x - 42, y + 34)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  } else if (character.shape === 'diamond') {
    ctx.beginPath()
    ctx.moveTo(x, y - 44)
    ctx.lineTo(x + 38, y - 4)
    ctx.lineTo(x + 18, y + 42)
    ctx.lineTo(x - 42, y + 24)
    ctx.lineTo(x - 30, y - 24)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  } else if (character.shape === 'capsule') {
    roundRect(x - 28, y - 46, 56, 92, 28)
    ctx.fill()
    ctx.stroke()
  } else if (character.shape === 'blob') {
    ctx.beginPath()
    ctx.ellipse(x - 8, y, 44, 34, 0.18, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(x + 18, y + 8, 34, 38, -0.28, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.arc(x, y, 39, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  drawCharacterFace(x, y)
}

function drawCharacterImage(character, x, y) {
  const maxWidth = 118
  const maxHeight = 126
  const image = character.transparentImage || character.image
  const imageWidth = image.naturalWidth || image.width
  const imageHeight = image.naturalHeight || image.height
  const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale

  ctx.save()
  ctx.shadowColor = character.color
  ctx.shadowBlur = 10
  roundRect(x - maxWidth / 2, y - maxHeight / 2, maxWidth, maxHeight, 24)
  ctx.clip()
  ctx.drawImage(image, x - width / 2, y - height / 2, width, height)
  ctx.restore()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.86)'
  ctx.lineWidth = 4
  roundRect(x - maxWidth / 2, y - maxHeight / 2, maxWidth, maxHeight, 24)
  ctx.stroke()
}

function createTransparentCharacterImage(image) {
  const buffer = document.createElement('canvas')
  const bufferContext = buffer.getContext('2d')
  buffer.width = image.naturalWidth
  buffer.height = image.naturalHeight
  bufferContext.drawImage(image, 0, 0)

  const imageData = bufferContext.getImageData(0, 0, buffer.width, buffer.height)
  const pixels = imageData.data
  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i]
    const green = pixels[i + 1]
    const blue = pixels[i + 2]
    const brightness = Math.max(red, green, blue)
    if (brightness < 30) {
      pixels[i + 3] = 0
    } else if (brightness < 58) {
      pixels[i + 3] = Math.min(pixels[i + 3], Math.round((brightness - 30) * 9))
    }
  }
  bufferContext.putImageData(imageData, 0, 0)
  return buffer
}

function drawCharacterFace(x, y) {
  ctx.fillStyle = '#171236'
  ctx.beginPath()
  ctx.arc(x - 13, y - 6, 5, 0, Math.PI * 2)
  ctx.arc(x + 13, y - 6, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#171236'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(x, y + 8, 13, 0.1, Math.PI - 0.1)
  ctx.stroke()
}

function drawRaceLayer() {
  if (!state.race.competitors.length) return

  const player = playerCompetitor()
  const baseY = 650
  const scale = 1.2
  const laneXs = [146, LOGICAL_WIDTH / 2, 394]

  ctx.save()
  ctx.globalAlpha = 0.9
  for (const x of laneXs) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(x, 250)
    ctx.lineTo(x, 770)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(255, 59, 92, 0.38)'
  ctx.lineWidth = 5
  ctx.setLineDash([14, 12])
  ctx.beginPath()
  ctx.moveTo(62, baseY + 156)
  ctx.lineTo(LOGICAL_WIDTH - 62, baseY + 156)
  ctx.stroke()
  ctx.setLineDash([])
  drawText('CUTOFF', LOGICAL_WIDTH - 74, baseY + 142, 12, '#ff3b5c', 'right', 900)

  const sorted = raceStandings()
  for (const competitor of state.race.competitors) {
    const laneIndex = competitor.isPlayer ? 1 : competitor.lane
    const y = baseY - (competitor.position - state.race.cameraY) * scale
    if (y < 232 || y > 792) {
      drawRaceIndicator(competitor, laneXs[laneIndex], y < 232)
      continue
    }
    drawRaceCompetitor(competitor, laneXs[laneIndex], y, sorted.findIndex((item) => item.id === competitor.id) + 1)
  }

  drawRaceRankChip(sorted)
  if (state.race.alertUntil > state.time) {
    drawText(state.race.alertText, LOGICAL_WIDTH / 2, 786, 23, '#fee440', 'center', 1000)
  }
  ctx.restore()
}

function drawRaceCompetitor(competitor, x, y, rank) {
  const character = competitor.character
  const pulse = competitor.isPlayer ? 1 + Math.sin(state.time * 8) * 0.035 : 1
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(competitor.isPlayer ? 0.62 * pulse : 0.48, competitor.isPlayer ? 0.62 * pulse : 0.48)
  ctx.shadowColor = competitor.isPlayer ? character.color : 'rgba(61, 44, 95, 0.35)'
  ctx.shadowBlur = competitor.isPlayer ? 22 : 8
  drawCharacterShape(character, 0, 0)
  ctx.restore()

  drawPanel(x - 42, y + 34, 84, 24, competitor.isPlayer ? 'rgba(0, 245, 212, 0.78)' : 'rgba(255, 255, 255, 0.72)')
  drawText(competitor.isPlayer ? `YOU ${ordinal(rank)}` : ordinal(rank), x, y + 46, 13, '#3d2c5f', 'center', 1000)
}

function drawRaceIndicator(competitor, x, above) {
  const y = above ? 244 : 786
  ctx.fillStyle = competitor.character.color
  ctx.beginPath()
  if (above) {
    ctx.moveTo(x, y - 12)
    ctx.lineTo(x + 15, y + 12)
    ctx.lineTo(x - 15, y + 12)
  } else {
    ctx.moveTo(x, y + 12)
    ctx.lineTo(x + 15, y - 12)
    ctx.lineTo(x - 15, y - 12)
  }
  ctx.closePath()
  ctx.fill()
  drawText(competitor.name, x, above ? y + 30 : y - 30, 11, '#3d2c5f', 'center', 900)
}

function drawRaceRankChip(sorted) {
  const rank = sorted.findIndex((item) => item.isPlayer) + 1
  drawPanel(394, 184, 112, 34, 'rgba(255, 255, 255, 0.82)')
  drawText(`RACE ${ordinal(rank)}`, 450, 201, 15, rank === 1 ? '#00b894' : rank === 2 ? '#9b5de5' : '#ff3b5c', 'center', 1000)
}

function drawStartSelectionButton() {
  const bounds = selectionStartBounds()
  const enabled = Boolean(state.selectedCharacterId)
  const pulse = enabled ? 1 + Math.sin(state.time * 7) * 0.025 : 1

  ctx.save()
  ctx.translate(bounds.x + bounds.w / 2, bounds.y + bounds.h / 2)
  ctx.scale(pulse, pulse)
  ctx.fillStyle = enabled ? '#00f5d4' : 'rgba(255, 255, 255, 0.46)'
  roundRect(-bounds.w / 2, -bounds.h / 2, bounds.w, bounds.h, 24)
  ctx.fill()
  ctx.strokeStyle = enabled ? '#3d2c5f' : 'rgba(61, 44, 95, 0.3)'
  ctx.lineWidth = 5
  ctx.stroke()
  drawText(enabled ? 'START EVENT' : 'SELECT ATHLETE', 0, 0, 25, enabled ? '#3d2c5f' : '#6d597a', 'center', 1000)
  ctx.restore()
}

function drawMeter(x, y, width, height, value, warning) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
  roundRect(x, y, width, height, height / 2)
  ctx.fill()

  const fillWidth = Math.max(0, width * value)
  const gradient = ctx.createLinearGradient(x, y, x + width, y)
  gradient.addColorStop(0, '#ff3b5c')
  gradient.addColorStop(0.45, '#fee440')
  gradient.addColorStop(0.72, '#00f5d4')
  gradient.addColorStop(1, '#c1ff72')
  ctx.fillStyle = gradient
  if (fillWidth > 0) {
    roundRect(x, y, fillWidth, height, height / 2)
    ctx.fill()
  }

  const pulse = state.warningPulseUntil > state.time ? 0.9 : warning.label === 'CRITICAL' ? 0.7 : warning.label === 'DANGER' ? 0.42 : 0.18
  ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`
  ctx.lineWidth = warning.label === 'SAFE' ? 2 : 4
  roundRect(x - 3, y - 3, width + 6, height + 6, height / 2 + 3)
  ctx.stroke()
}

function handlePointerDown(x, y) {
  if (state.status === 'selecting') {
    handleCharacterSelectionTap(x, y)
    return
  }

  if (state.status === 'countdown') return

  if (state.status === 'eliminated') {
    if (state.time < state.elimination.inputReadyAt) return
    resetGame()
    return
  }

  const slider = findSliderAt(x, y)
  if (slider) {
    if (distance(x, y, slider.x, slider.y) <= TARGET_RADIUS + 14) {
      startSlider(slider, x, y)
      return
    }
    failSlider(slider, 'START ON THE CIRCLE!', 'slow')
    return
  }

  handleTap(x, y)
}

function handleTap(x, y) {
  const target = findTargetAt(x, y)
  if (!target) {
    applyPerformancePenalty(6, 'AIRBALL TAP: THE JUDGES BLINKED.', 'crowd')
    showCaption('FALSE START!', 'bad', 0.85)
    missJuice(x, y)
    return
  }

  if (target.kind === 'red') {
    target.removed = true
    applyPerformancePenalty(45, 'RED HIT: PERFORMANCE MELTDOWN.', 'red')
    showCaption(state.performance <= 0 ? 'DISQUALIFIED!' : 'DANGER TARGET!', 'bad', 1)
    redHitJuice(target.x, target.y)
    burst(target.x, target.y, '#ff3b5c', 18)
    return
  }

  if (target.kind === 'gold') {
    hitPositiveTarget(target, 250, 34, 'GOLDEN BONUS!', '#fee440')
    return
  }

  if (target.kind === 'rainbow') {
    state.feverUntil = state.time + 7
    hitPositiveTarget(target, 500, 45, 'RAINBOW FEVER!', '#f15bb5')
    medalConfettiBurst('#f15bb5')
    state.announcer = 'RAINBOW FEVER: CROWD HAS ENTERED WIGGLE MODE.'
    return
  }

  const timing = target.age / target.life
  target.removed = true
  state.score += (100 + state.streak * 10) * (isFeverActive() ? 2 : 1)
  state.streak += 1
  applyRaceImpulse(24 + Math.min(state.streak, 8) * 2, 'MOVING UP!')
  state.bestStreak = Math.max(state.bestStreak, state.streak)
  state.missCount = Math.max(0, state.missCount - 1)
  state.lastGreenHitAt = state.time
  state.performance = clamp(state.performance + 28, 0, MAX_PERFORMANCE)
  const medalUpgraded = updateMedalProgression()
  if (!medalUpgraded) {
    state.announcer = hypeLine()
    showCaption(hitCaption(timing), timing > 0.72 ? 'perfect' : 'info')
  }
  hitJuice(target.x, target.y, `+${Math.floor((100 + (state.streak - 1) * 10) * (isFeverActive() ? 2 : 1))}`, '#2ee59d')
  burst(target.x, target.y, '#2ee59d', 20)
}

function handleCharacterSelectionTap(x, y) {
  for (const character of CHARACTERS) {
    const bounds = characterBounds(character)
    if (pointInRect(x, y, bounds)) {
      state.selectedCharacterId = character.id
      state.selectedCharacter = character
      state.announcer = `${character.name} ENTERS THE DOME.`
      state.screenBumpUntil = state.time + 0.16
      burst(bounds.x + bounds.w / 2, bounds.y + bounds.h / 2, character.color, 12)
      return
    }
  }

  const start = selectionStartBounds()
  if (state.selectedCharacterId && pointInRect(x, y, start)) {
    resetGame()
  }
}

function initRace() {
  const playerCharacter = state.selectedCharacter || CHARACTERS[0]
  const opponents = CHARACTERS.filter((character) => character.id !== playerCharacter.id).slice(0, 2)
  state.race.competitors = [
    {
      id: 'opponent_a',
      name: opponents[0].name,
      character: opponents[0],
      isPlayer: false,
      lane: 0,
      position: 18,
      velocity: 0,
      tempo: 1.15,
      surgeUntil: 0,
    },
    {
      id: 'player',
      name: playerCharacter.name,
      character: playerCharacter,
      isPlayer: true,
      lane: 1,
      position: 0,
      velocity: 0,
      tempo: 1,
      surgeUntil: 0,
    },
    {
      id: 'opponent_b',
      name: opponents[1].name,
      character: opponents[1],
      isPlayer: false,
      lane: 2,
      position: -12,
      velocity: 0,
      tempo: 0.92,
      surgeUntil: 0,
    },
  ]
  state.race.cameraY = 0
  state.race.lastPlayerRank = playerRaceRank()
  state.race.alertUntil = 0
  state.race.alertText = ''
}

function updateRace(deltaTime) {
  if (!state.race.competitors.length) return

  const profile = difficultyProfile()
  for (const competitor of state.race.competitors) {
    if (competitor.isPlayer) {
      const performancePush = (state.performance - 58) * 0.11
      const streakPush = Math.min(state.streak, 12) * 0.22
      competitor.velocity += (performancePush + streakPush - competitor.velocity) * 0.08
    } else {
      if (state.time > competitor.surgeUntil && Math.random() < 0.006 + profile.ramp * 0.008) {
        competitor.surgeUntil = state.time + 1.2 + Math.random() * 1.3
      }
      const playerGap = playerCompetitor().position - competitor.position
      const catchup = clamp(playerGap / 55, -1.4, 3.8)
      const surge = competitor.surgeUntil > state.time ? lerp(4.4, 7.2, profile.ramp) : 0
      const wobble = Math.sin(state.time * competitor.tempo + competitor.lane * 2.1) * lerp(1.4, 2.4, profile.ramp)
      const targetVelocity = 3.4 + profile.ramp * 3.8 + catchup + surge + wobble
      competitor.velocity += (targetVelocity - competitor.velocity) * 0.052
    }
    competitor.position += competitor.velocity * deltaTime
  }

  syncRaceToPerformance(profile)

  const player = playerCompetitor()
  state.race.cameraY = lerp(state.race.cameraY, player.position, 0.12)

  const rank = playerRaceRank()
  if (rank !== state.race.lastPlayerRank) {
    state.race.alertText = rank < state.race.lastPlayerRank ? 'OVERTAKE!' : 'THEY PASSED YOU!'
    state.race.alertUntil = state.time + 1.1
    state.announcer = rank < state.race.lastPlayerRank ? 'YOU PASSED THEM!' : 'THEY PASSED YOU!'
    if (rank < state.race.lastPlayerRank) medalConfettiBurst('#00f5d4')
    state.race.lastPlayerRank = rank
  }
}

function applyRaceImpulse(amount, alert = '') {
  const player = playerCompetitor()
  if (!player) return

  player.position += amount
  player.velocity += amount * 0.12
  if (alert) {
    state.race.alertText = alert
    state.race.alertUntil = state.time + 0.9
  }
}

function playerCompetitor() {
  return state.race.competitors.find((competitor) => competitor.isPlayer)
}

function raceStandings() {
  return [...state.race.competitors].sort((a, b) => b.position - a.position)
}

function playerRaceRank() {
  const standings = raceStandings()
  const rank = standings.findIndex((competitor) => competitor.isPlayer)
  return rank === -1 ? 3 : rank + 1
}

function shouldEliminateFromRace() {
  if (survivedSeconds() < 10 || !state.race.competitors.length) return false

  const player = playerCompetitor()
  const standings = raceStandings()
  const leader = standings[0]
  const second = standings[1]
  return playerRaceRank() === 3 && second.position - player.position > 78 && leader.position - player.position > 125
}

function syncRaceToPerformance(profile) {
  const player = playerCompetitor()
  if (!player) return

  const performanceRatio = state.performance / MAX_PERFORMANCE
  const pressure = 1 - performanceRatio
  if (performanceRatio > 0.72) return

  for (const competitor of state.race.competitors) {
    if (competitor.isPlayer) continue

    const aheadAtZero = competitor.lane === 0 ? 126 : 82
    const catchupStart = competitor.lane === 0 ? -118 : -150
    const catchupProgress = smoothstep(clamp((0.72 - performanceRatio) / 0.72, 0, 1))
    const targetGap = lerp(catchupStart, aheadAtZero, catchupProgress)
    const targetPosition = player.position + targetGap
    const pull = 0.025 + pressure * 0.13 + profile.ramp * 0.018
    if (competitor.position < targetPosition) {
      competitor.position += (targetPosition - competitor.position) * pull
    }
  }
}

function forceRaceCutoffVisual() {
  const player = playerCompetitor()
  if (!player) return

  const lowestOpponent = state.race.competitors
    .filter((competitor) => !competitor.isPlayer)
    .reduce((lowest, competitor) => Math.min(lowest, competitor.position), Infinity)

  player.position = Math.min(player.position, lowestOpponent - 90)
  player.velocity = Math.min(player.velocity, -18)
  state.race.cameraY = player.position
  state.race.alertText = 'NOT EVEN TOP THREE!'
  state.race.alertUntil = state.time + 1.4
}

function eliminateFromRaceCutoff() {
  forceRaceCutoffVisual()
  eliminate('NOT EVEN TOP THREE ANYMORE.', 'cutoff')
}

function handlePerformanceCrash() {
  eliminateFromRaceCutoff()
}

function ordinal(value) {
  if (value >= 4) return 'OUT'
  return value === 1 ? '1ST' : value === 2 ? '2ND' : '3RD'
}

function hitPositiveTarget(target, scoreBonus, performanceBonus, caption, color) {
  target.removed = true
  state.score += scoreBonus * (isFeverActive() ? 2 : 1)
  state.streak += 1
  applyRaceImpulse(target.kind === 'rainbow' ? 52 : 36, target.kind === 'rainbow' ? 'FEVER SURGE!' : 'CLIMBING!')
  state.bestStreak = Math.max(state.bestStreak, state.streak)
  state.lastGreenHitAt = state.time
  state.performance = clamp(state.performance + performanceBonus, 0, MAX_PERFORMANCE)
  const medalUpgraded = updateMedalProgression()
  if (!medalUpgraded) {
    state.announcer = caption
    showCaption(caption, target.kind === 'rainbow' ? 'perfect' : 'info', 1.05)
  }
  hitJuice(target.x, target.y, `+${scoreBonus * (isFeverActive() ? 2 : 1)}`, color)
  burst(target.x, target.y, color, target.kind === 'rainbow' ? 34 : 24)
}

function startSlider(target, x, y) {
  target.dragging = true
  target.sliderProgress = 0
  target.trail = [{ x, y }]
  state.activeSliderId = target.id
  state.announcer = 'SLIDER EVENT: HOLD AND DRAG!'
  showCaption('DRAG!', 'info', 0.7)
  addFloatingText(target.x, target.y - 58, 'HOLD', '#00f5d4', 22)
}

function updateActiveSlider(x, y) {
  if (state.activeSliderId === null || state.status !== 'playing') return

  const target = state.targets.find((item) => item.id === state.activeSliderId)
  if (!target || target.resolved || target.removed) {
    state.activeSliderId = null
    return
  }

  const nearest = nearestSliderProgress(target, x, y)
  if (nearest.distance > target.tolerance) {
    target.offPathSince ??= state.time
    if (state.time - target.offPathSince > 0.28) {
      failSlider(target, 'LEFT THE LINE!', 'slow')
      return
    }
  } else {
    target.offPathSince = null
  }

  target.sliderProgress = Math.max(target.sliderProgress, nearest.progress)
  target.trail.push({ x, y })
  if (target.trail.length > 12) target.trail.shift()

  if (distance(x, y, target.endX, target.endY) <= sliderCompletionRadius()) {
    completeSlider(target)
  }
}

function releaseActiveSlider() {
  if (state.activeSliderId === null) return

  const target = state.targets.find((item) => item.id === state.activeSliderId)
  if (target && !target.resolved && !target.removed) {
    failSlider(target, 'RELEASED TOO EARLY!', 'slow')
  }
  state.activeSliderId = null
}

function completeSlider(target) {
  target.resolved = true
  target.removed = true
  target.dragging = false
  state.activeSliderId = null
  const points = sliderSamplePoints(target, 7)
  state.score += 360 * (isFeverActive() ? 2 : 1)
  state.streak += 2
  applyRaceImpulse(62, 'SLIDER SURGE!')
  state.bestStreak = Math.max(state.bestStreak, state.streak)
  state.missCount = Math.max(0, state.missCount - 1)
  state.lastGreenHitAt = state.time
  state.performance = clamp(state.performance + 42, 0, MAX_PERFORMANCE)
  const medalUpgraded = updateMedalProgression()
  if (!medalUpgraded) {
    state.announcer = 'SLIDER CLEARED: THE CROWD IS DOING WAVEFORM NOISES.'
    showCaption('SLIDER CLEAR!', 'perfect', 1)
  }
  hitJuice(target.endX, target.endY, `+${360 * (isFeverActive() ? 2 : 1)}`, '#00f5d4')
  for (const point of points) {
    burst(point.x, point.y, '#00f5d4', 5)
  }
}

function failSlider(target, caption, cause = 'slow') {
  if (target.resolved || target.removed) return

  target.resolved = true
  target.failed = true
  target.dragging = false
  if (state.activeSliderId === target.id) state.activeSliderId = null
  applyPerformancePenalty(20, 'SLIDER BOTCHED: MOMENTUM DIPPED.', cause)
  showCaption(caption, 'bad', 0.9)
  state.redFlashUntil = state.time + 0.25
  state.redShakeUntil = state.time + 0.28
  missJuice(target.x, target.y)
  burst(target.x, target.y, '#ff3b5c', 12)
}

function findTargetAt(x, y) {
  for (let i = state.targets.length - 1; i >= 0; i -= 1) {
    const target = state.targets[i]
    if (target.resolved || target.removed) continue
    if (target.kind === 'slider') continue
    if (distance(x, y, target.x, target.y) <= TARGET_RADIUS + 18) return target
  }
  return null
}

function findSliderAt(x, y) {
  for (let i = state.targets.length - 1; i >= 0; i -= 1) {
    const target = state.targets[i]
    if (target.kind !== 'slider' || target.resolved || target.removed) continue
    const startHit = distance(x, y, target.x, target.y) <= TARGET_RADIUS + 16
    const endHit = distance(x, y, target.endX, target.endY) <= TARGET_RADIUS + 16
    const pathHit = nearestSliderProgress(target, x, y).distance <= target.tolerance + 10
    if (startHit || endHit || pathHit) return target
  }
  return null
}

function spawnTarget() {
  const profile = difficultyProfile()
  const kind = nextTargetKind(profile)
  const point = openingTargetPoint(kind) || chooseTargetPoint()
  const slider = kind === 'slider' ? createSliderPath(point, profile) : null

  state.targets.push({
    id: state.spawnCount,
    kind,
    x: point.x,
    y: point.y,
    endX: slider?.end.x,
    endY: slider?.end.y,
    controlX: slider?.control.x,
    controlY: slider?.control.y,
    sliderProgress: 0,
    tolerance: slider?.tolerance,
    offPathSince: null,
    dragging: false,
    failed: false,
    trail: [],
    age: 0,
    life: targetLifeForKind(kind, profile),
    ringStart: lerp(2.45, 1.85, profile.ramp),
    resolved: false,
    removed: false,
  })

  state.spawnCount += 1
  state.nextSpawnAt = state.time + spawnInterval()
}

function nextTargetKind(profile) {
  if (profile.survived < 5) {
    const openingKinds = ['green', 'green', 'red', 'green', 'green']
    return openingKinds[state.spawnCount] || 'green'
  }
  if (profile.survived > 12 && state.spawnCount % 12 === 0 && !hasLiveSlider() && Math.random() < profile.sliderChance) return 'slider'
  if (!isFeverActive() && profile.survived > 18 && state.spawnCount % 23 === 0) return 'rainbow'
  if (profile.survived > 10 && state.spawnCount % 10 === 0) return 'gold'
  if (isFeverActive() && state.spawnCount % 5 === 0) return 'gold'
  if (profile.survived > 24 && state.spawnCount % 15 === 0 && Math.random() < profile.redChance) return 'red'

  const cycleLength = profile.greenChain + 1
  const cycleIndex = state.spawnCount % cycleLength
  if (cycleIndex < profile.greenChain) return 'green'

  const redRoll = lerp(profile.redChance, 1, profile.ramp)
  return Math.random() < redRoll ? 'red' : 'green'
}

function targetLifeForKind(kind, profile) {
  if (kind === 'slider') return lerp(2.6, 1.65, profile.ramp)
  if (profile.survived < 5) return kind === 'red' ? 1.85 : 1.7
  return profile.targetLife
}

function createSliderPath(start, profile) {
  const length = lerp(150, 245, profile.ramp)
  const angle = Math.random() * Math.PI * 2
  const margin = TARGET_RADIUS + 42
  const end = {
    x: clamp(start.x + Math.cos(angle) * length, margin, LOGICAL_WIDTH - margin),
    y: clamp(start.y + Math.sin(angle) * length, PLAY_TOP + margin, PLAY_BOTTOM - margin),
  }
  const curve = profile.survived < 20 ? 0 : lerp(18, 58, profile.chaosRamp) * (Math.random() < 0.5 ? -1 : 1)
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2
  const dx = end.x - start.x
  const dy = end.y - start.y
  const distanceToEnd = Math.max(1, Math.hypot(dx, dy))

  return {
    end,
    control: {
      x: clamp(midX + (-dy / distanceToEnd) * curve, margin, LOGICAL_WIDTH - margin),
      y: clamp(midY + (dx / distanceToEnd) * curve, PLAY_TOP + margin, PLAY_BOTTOM - margin),
    },
    tolerance: lerp(58, 44, profile.ramp),
  }
}

function sliderCompletionRadius() {
  return TARGET_RADIUS * 1.28
}

function hasLiveSlider() {
  return state.targets.some((target) => target.kind === 'slider' && !target.resolved && !target.removed)
}

function pointOnSlider(target, progress) {
  const inverse = 1 - progress
  return {
    x: inverse * inverse * target.x + 2 * inverse * progress * target.controlX + progress * progress * target.endX,
    y: inverse * inverse * target.y + 2 * inverse * progress * target.controlY + progress * progress * target.endY,
  }
}

function nearestSliderProgress(target, x, y) {
  let best = { progress: 0, distance: Infinity }
  for (let i = 0; i <= 20; i += 1) {
    const progress = i / 20
    const point = pointOnSlider(target, progress)
    const pointDistance = distance(x, y, point.x, point.y)
    if (pointDistance < best.distance) {
      best = { progress, distance: pointDistance }
    }
  }
  return best
}

function sliderSamplePoints(target, count) {
  const points = []
  for (let i = 0; i < count; i += 1) {
    points.push(pointOnSlider(target, i / Math.max(1, count - 1)))
  }
  return points
}

function openingTargetPoint(kind) {
  if (survivedSeconds() >= 5) return null

  const points = [
    { x: 188, y: 390 },
    { x: 352, y: 478 },
    { x: 270, y: 360 },
    { x: 162, y: 590 },
    { x: 378, y: 635 },
  ]
  const point = points[state.spawnCount]
  if (!point) return null
  return kind === 'red' ? { ...point, y: Math.max(PLAY_TOP + 92, point.y - 22) } : point
}

function chooseTargetPoint() {
  const margin = TARGET_RADIUS + 32
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
    const nearest = state.targets.reduce((min, target) => {
      if (target.resolved || target.removed) return min
      return Math.min(min, distance(point.x, point.y, target.x, target.y))
    }, 999)

    if (nearest > bestScore) {
      best = point
      bestScore = nearest
    }
  }

  return best
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2
    const speed = 120 + Math.random() * 210
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 4 + Math.random() * 8,
      age: 0,
      life: 0.45 + Math.random() * 0.25,
      color,
    })
  }
}

function addFloatingText(x, y, text, color, size = 24) {
  state.floatTexts.push({
    x,
    y,
    text,
    color,
    size,
    age: 0,
    life: 0.75,
    speed: 76,
  })
  if (state.floatTexts.length > 24) {
    state.floatTexts.shift()
  }
}

function hitJuice(x, y, text, color) {
  state.screenBumpUntil = state.time + 0.18
  state.streakGlowUntil = state.time + 0.55
  state.crowdFlashUntil = Math.max(state.crowdFlashUntil, state.time + 0.18)
  state.ripples.push({ x, y, age: 0, maxAge: 0.34 })
  addFloatingText(x, y - 58, text, color, 26)
  if (state.streak > 1) {
    addFloatingText(x, y + 56, `${state.streak}x STREAK`, '#f15bb5', 19)
  }
}

function missJuice(x, y) {
  state.warningPulseUntil = state.time + 0.35
  addFloatingText(x, y - 42, '-MOMENTUM', '#fee440', 20)
}

function redHitJuice(x, y) {
  state.redFlashUntil = state.time + 0.45
  state.redShakeUntil = state.time + 0.5
  state.warningPulseUntil = state.time + 0.5
  state.screenBumpUntil = state.time + 0.24
  state.crowdFlashUntil = Math.max(state.crowdFlashUntil, state.time + 0.45)
  addFloatingText(x, y - 62, 'DANGER!', '#ff3b5c', 30)
}

function medalUpgradeJuice(tier) {
  state.screenBumpUntil = state.time + 0.22
  state.streakGlowUntil = state.time + 1
  state.crowdFlashUntil = state.time + 0.9
  state.medalSpotlightUntil = state.time + 1.25
  addFloatingText(LOGICAL_WIDTH / 2, 252, `${tier.short}!`, tier.color, tier.short.length > 8 ? 32 : 40)
  medalConfettiBurst(tier.color)
  burst(LOGICAL_WIDTH / 2, 180, tier.color, 24)
}

function medalConfettiBurst(primaryColor) {
  for (let i = 0; i < 52; i += 1) {
    const angle = -Math.PI + (Math.PI * i) / 51
    const speed = 150 + Math.random() * 240
    state.particles.push({
      x: LOGICAL_WIDTH / 2,
      y: 146,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 80,
      size: 5 + Math.random() * 9,
      age: 0,
      life: 0.8 + Math.random() * 0.35,
      color: i % 3 === 0 ? primaryColor : CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    })
  }
}

function applyPerformancePenalty(amount, line, cause = 'crowd') {
  state.performance = clamp(state.performance - amount, 0, MAX_PERFORMANCE)
  state.streak = 0
  state.announcer = line
  applyRaceImpulse(-amount * 0.9, amount >= 16 ? 'YOU\'RE FALLING!' : '')
  if (state.performance <= 0) {
    if (cause === 'red') {
      eliminate('RED TARGET SENT YOU TO THE SHADOW REALM.', 'red')
    } else {
      eliminateFromRaceCutoff()
    }
  }
}

function eliminate(reason, cause = 'momentum') {
  if (state.status === 'eliminated') return
  const finalStreak = Math.max(state.streak, state.bestStreak)
  state.status = 'eliminated'
  state.eliminatedReason = reason
  state.elimination.at = state.time
  state.elimination.inputReadyAt = state.time + 1
  state.elimination.cause = cause
  state.elimination.stamp = eliminationStamp(cause)
  state.elimination.finalScore = state.score
  state.elimination.finalStreak = finalStreak
  state.elimination.finalSurvival = survivedSeconds()
  state.elimination.finalRank = cause === 'cutoff' ? 4 : playerRaceRank()
  state.announcer = 'BROADCAST SIGNAL LOST.'
  state.activeSliderId = null
  state.pointer.active = false
  state.targets = []
  showCaption(cause === 'red' ? 'DISQUALIFIED!' : 'ELIMINATED!', 'bad', 1.4)
  burst(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, '#ff3b5c', 32)
}

function resetGame() {
  state.status = 'countdown'
  state.score = 0
  state.streak = 0
  state.missCount = 0
  state.medalTier = 0
  state.medalFlashUntil = 0
  state.feverUntil = 0
  state.screenBumpUntil = 0
  state.redShakeUntil = 0
  state.streakGlowUntil = 0
  state.warningPulseUntil = 0
  state.redFlashUntil = 0
  state.crowdFlashUntil = 0
  state.medalSpotlightUntil = 0
  state.performance = 78
  state.runStartedAt = state.time + 3
  state.countdownStartedAt = state.time
  state.spawnCount = 0
  state.nextSpawnAt = state.time + 3.25
  state.lastGreenHitAt = state.time + 3
  state.eliminatedReason = ''
  state.elimination.at = 0
  state.elimination.inputReadyAt = 0
  state.elimination.cause = 'momentum'
  state.elimination.stamp = 'ELIMINATED'
  state.elimination.finalScore = 0
  state.elimination.finalStreak = 0
  state.elimination.finalSurvival = 0
  state.elimination.finalRank = 3
  state.announcer = 'NEW HEAT: KEEP MOVING.'
  showCaption('STILL IN!', 'info')
  initRace()
  state.activeSliderId = null
  state.targets = []
  state.particles = []
  state.floatTexts = []
  state.ripples = []
}

function startGameplay() {
  state.status = 'playing'
  state.runStartedAt = state.time
  state.nextSpawnAt = state.time + 0.25
  state.lastGreenHitAt = state.time
  state.announcer = 'GO! KEEP MOVING.'
  showCaption('GO!', 'perfect', 0.65)
}

function survivedSeconds() {
  return Math.max(0, state.time - state.runStartedAt)
}

function medalStatus() {
  return MEDAL_TIERS[state.medalTier]
}

function currentEarnedMedalTier() {
  for (let i = MEDAL_TIERS.length - 1; i >= 0; i -= 1) {
    const tier = MEDAL_TIERS[i]
    if (state.score >= tier.score || state.streak >= tier.streak) return i
  }
  return 0
}

function updateMedalProgression() {
  const earned = currentEarnedMedalTier()
  if (earned <= state.medalTier) return false

  state.medalTier = earned
  state.medalFlashUntil = state.time + 1.1
  const tier = MEDAL_TIERS[earned]
  state.announcer = `MEDAL UPGRADE: ${tier.name.toUpperCase()}!`
  showCaption(`${tier.short} MEDAL!`, earned >= 4 ? 'perfect' : 'info', 1.15)
  medalUpgradeJuice(tier)
  return true
}

function eliminationStamp(cause) {
  const stamps = {
    red: 'DISQUALIFIED',
    cutoff: 'CUT FROM PODIUM',
    slow: 'REACTION TOO SLOW',
    stood_still: 'STOOD STILL TOO LONG',
    misses: 'FAILED THE VIBE CHECK',
    crowd: 'FAILED THE CROWD',
    momentum: 'ELIMINATED',
  }
  return stamps[cause] || 'ELIMINATED'
}

function showCaption(text, kind = 'info', duration = 0.85) {
  state.caption.text = text
  state.caption.kind = kind
  state.caption.until = state.time + duration
}

function hitCaption(timing) {
  const profile = difficultyProfile()
  if (profile.level >= 5 && state.streak > 0 && state.streak % 4 === 0) return 'MAXIMUM BRAIN ROT!'
  if (isFeverActive() && state.streak > 0 && state.streak % 2 === 0) return 'FEVER CHAIN!'
  if (profile.level >= 4 && state.streak > 0 && state.streak % 3 === 0) return 'CROWD DEMANDS MORE!'
  if (timing > 0.72) return 'PERFECT!'
  if (state.streak > 0 && state.streak % 5 === 0) return 'CROWD GOES WILD!'
  if (state.streak > 0 && state.streak % 3 === 0) return 'BRAIN ROT SPEED!'
  return 'STILL IN!'
}

function spawnInterval() {
  const profile = difficultyProfile()
  if (profile.survived < 5) return 0.95
  if (profile.survived < 10) return Math.max(0.78, profile.spawnInterval)
  if (profile.survived < 30) return Math.max(0.56, profile.spawnInterval)
  if (profile.survived < 60) return Math.max(0.48, profile.spawnInterval)
  return Math.max(0.42, profile.spawnInterval)
}

function performanceDrainRate() {
  return difficultyProfile().drainRate
}

function pressureState() {
  const profile = difficultyProfile()
  const dangerLine = profile.survived > 18 ? 68 : 62
  const criticalLine = profile.survived > 18 ? 34 : 28
  if (state.performance > dangerLine) {
    return {
      label: 'SAFE',
      headline: profile.survived < 5 ? 'KEEP PERFORMING!' : profile.level >= 4 ? 'CROWD IS SPEEDING UP!' : 'PERFORMANCE METER HOLDING',
      color: '#c1ff72',
    }
  }

  if (state.performance > criticalLine) {
    return {
      label: 'DANGER',
      headline: profile.survived > 15 ? 'SLOWING DOWN IS DANGER!' : profile.level >= 4 ? 'THE HEAT IS GETTING STUPID!' : 'DON\'T FREEZE!',
      color: '#fee440',
    }
  }

  const urgent =
    profile.level >= 4
      ? ['KEEP MOVING!', 'PERFORM OR PERISH!', 'CROWD WANTS CHAOS!', 'OLYMPIC BRAIN MELT!']
      : ['KEEP MOVING!', 'PERFORM!', 'CROWD IS WATCHING!', 'DON\'T FREEZE!']
  return {
    label: 'CRITICAL',
    headline: urgent[Math.floor(state.time * 5) % urgent.length],
    color: '#ff8fab',
  }
}

function hypeLine() {
  const profile = difficultyProfile()
  if (profile.survived < 5) return 'OPENING HEAT: GREEN MEANS GO.'
  if (profile.survived < 15) {
    const earlyLines = [
      'ANNOUNCER: THE FIRST STREAK IS REAL.',
      'JUDGES SEE MEDAL POTENTIAL.',
      'BROADCAST CAM HAS LOCKED ON.',
      'CROWD REACTS TO EVERY TAP.',
    ]
    return earlyLines[state.streak % earlyLines.length]
  }
  if (profile.survived < 30) {
    const chaosLines = [
      'THE CROWD IS GETTING LOUDER.',
      'TARGET CHAINS ARE STACKING UP.',
      'PRESSURE METER IS NOW PERSONAL.',
      'BROADCAST BOOTH HAS LOST CONTROL.',
    ]
    return chaosLines[state.streak % chaosLines.length]
  }
  const lines =
    profile.level >= 4
      ? [
          'THE CROWD IS DEMANDING ILLEGAL SPEED.',
          'BRAIN ROT VELOCITY HAS ENTERED THE CHAT.',
          'JUDGES ARE THROWING MEDALS AT THE SCREEN.',
          'THE STADIUM IS NOW A REACTION BLENDER.',
          'NO BLINKING ALLOWED IN THIS HEAT.',
        ]
      : [
          'GREEN HIT: CROWD HAS LOST STRUCTURAL INTEGRITY.',
          'REFLEX CHECK PASSED. KEEP MOVING.',
          'PODIUM CAM LOVES THIS NONSENSE.',
          'THE ANNOUNCER IS SWEATING GLITTER.',
          'MEDAL COMMITTEE IS PANICKING LIVE.',
        ]
  return lines[state.streak % lines.length]
}

function drawPanel(x, y, width, height, color) {
  ctx.fillStyle = color
  roundRect(x, y, width, height, 24)
  ctx.fill()
}

function characterBounds(character) {
  const index = CHARACTERS.indexOf(character)
  const col = index % 2
  const row = Math.floor(index / 2)
  return {
    x: 80 + col * 202,
    y: 218 + row * 224,
    w: 178,
    h: 194,
  }
}

function selectionStartBounds() {
  return { x: 82, y: 808, w: 376, h: 66 }
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
}

function startBackgroundMusic() {
  if (!backgroundMusic.paused) return

  backgroundMusic.play().catch(() => {
    // Browsers may block audio until a trusted user gesture is available.
  })
}

function openingEnergy() {
  return smoothstep(clamp(survivedSeconds() / 30, 0, 1))
}

function arenaTagline() {
  if (isFeverActive()) return 'RAINBOW FEVER: CROWD GOES MAXIMUM'
  const survived = survivedSeconds()
  if (survived < 5) return 'OPENING CEREMONY: KEEP PERFORMING'
  if (survived < 15) return 'LIVE FROM THE BRAIN ROT DOME: FIRST MEDAL PUSH'
  if (survived < 30) return 'BROADCAST CHAOS RISING: DO NOT SLOW DOWN'
  return 'LIVE FROM THE BRAIN ROT DOME'
}

function broadcastLine() {
  if (state.caption.until > state.time || state.medalFlashUntil > state.time || isFeverActive()) return state.announcer

  const survived = survivedSeconds()
  if (survived < 5) return 'GREEN TARGETS SCORE. RED TARGETS RUIN EVERYTHING.'
  if (survived < 15) return state.streak >= 4 ? 'FIRST MEDAL PUSH IS LIVE.' : 'BUILD THE STREAK. FEED THE METER.'
  if (survived < 30) return state.performance < 68 ? 'DANGER STATE IS CREEPING IN.' : 'CHAINS ARE SPEEDING UP.'
  return state.announcer
}

function drawText(text, x, y, size, color, align = 'left', weight = 700) {
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.font = `${weight} ${size}px system-ui, Segoe UI, sans-serif`
  ctx.fillText(text, x, y)
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function smoothstep(value) {
  return value * value * (3 - 2 * value)
}

function lerp(start, end, amount) {
  return start + (end - start) * amount
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2)
}

function easeOutBack(value) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2)
}

window.addEventListener('resize', resizeCanvas)
canvas.addEventListener('pointerdown', handlePointer)
canvas.addEventListener('pointermove', handlePointer)
canvas.addEventListener('pointerup', handlePointer)
canvas.addEventListener('pointercancel', handlePointer)

resizeCanvas()
requestAnimationFrame(tick)
