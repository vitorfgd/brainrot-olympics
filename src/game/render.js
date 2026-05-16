import {
  BOOST_PRODUCTS,
  COMBO_MILESTONE_AT,
  CONTINUE_COST,
  JUDGES,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  MAX_HP,
  STAGES,
  clamp,
  hitThemeById,
  isStageUnlocked,
  rankForEndlessScore,
} from './rules.js'
import { isSkinOwned } from './state.js'
import { pointOnSlider } from './targets.js'

export function drawGame(state) {
  const ctx = state.ctx
  state.ui.buttons = []
  ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  drawBackground(state)
  drawScrollingConfetti(state)

  if (state.screen === 'home') drawHome(state)
  if (state.screen === 'leaderboard') drawLeaderboard(state)
  if (state.screen === 'stageSelect') drawStageSelect(state)
  if (state.screen === 'shop') drawShop(state)
  if (state.screen === 'settings') drawSettings(state)
  if (state.screen === 'run') drawRun(state)
  if (state.screen === 'results') drawResults(state)
  if (state.screen === 'boostSelect') drawBoostSelect(state)

  drawParticles(state)
  drawToast(state)
}

export function drawText(ctx, text, x, y, size, color = '#fff', align = 'center', weight = 800) {
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.font = `${weight} ${size}px system-ui, Segoe UI, sans-serif`
  ctx.fillText(text, x, y)
}

function drawOutlinedText(ctx, text, x, y, size, color, strokeColor, align = 'center', weight = 900, strokeWidth = 3) {
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.font = `${weight} ${size}px Fredoka, system-ui, Segoe UI, sans-serif`
  ctx.lineJoin = 'round'
  ctx.lineWidth = strokeWidth
  ctx.strokeStyle = strokeColor
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

function drawHome(state) {
  const ctx = state.ctx
  drawHomeJudgePortraits(state)
  drawHomeTopStats(state)
  drawHomeHeroTitle(state)

  if (state.save.ftueCompleted) {
    drawHomeSpriteMenuButton(state, 'playEndless', 46, 622, 448, 102, {
      sprite: 'buttonPink',
      label: 'PLAY ENDLESS',
      icon: 'iconInfinity',
      labelSize: 36,
      labelColor: '#ff4fd8',
    })
  } else {
    drawHomeSpriteMenuButton(state, 'playEndlessLocked', 46, 622, 448, 102, {
      sprite: 'buttonPink',
      label: 'PLAY ENDLESS',
      icon: 'iconLock',
      labelSize: 36,
      labelColor: '#b968a8',
    })
  }

  const stagesDone = stagesClearedCount(state.save)
  drawHomeSpriteMenuButton(state, 'stageSelect', 94, 744, 352, 80, {
    sprite: 'buttonCyan',
    label: 'LEVELS',
    badge: `${stagesDone}/${STAGES.length}`,
    labelSize: 33,
    labelColor: '#a8fbff',
    textYOffset: 2,
  })

  drawCircleIconButton(state, 'leaderboard', 162, 886, 40, 'iconTrophy', '#a8fbff')
  drawCircleIconButton(state, 'shop', 270, 886, 40, 'iconCoin', '#ffe24a')
  drawCircleIconButton(state, 'settings', 378, 886, 40, 'iconSettings', '#a994c8')
}

function stagesClearedCount(save) {
  return STAGES.filter((s) => {
    const g = save.stageBests[s.id]?.grade
    return g && g !== 'FAILED'
  }).length
}

function drawHomeAtmosphere(state) {
  const ctx = state.ctx
  const t = state.time
  ctx.save()
  const vignette = ctx.createRadialGradient(
    LOGICAL_WIDTH / 2,
    LOGICAL_HEIGHT * 0.45,
    40,
    LOGICAL_WIDTH / 2,
    LOGICAL_HEIGHT * 0.5,
    LOGICAL_HEIGHT * 0.75,
  )
  vignette.addColorStop(0, 'rgba(18, 4, 42, 0)')
  vignette.addColorStop(1, 'rgba(8, 2, 28, 0.55)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)

  const spot = ctx.createRadialGradient(LOGICAL_WIDTH / 2, -20, 10, LOGICAL_WIDTH / 2, 200, 380)
  spot.addColorStop(0, 'rgba(140, 210, 255, 0.22)')
  spot.addColorStop(0.45, 'rgba(100, 160, 255, 0.08)')
  spot.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = spot
  ctx.fillRect(0, 0, LOGICAL_WIDTH, 420)

  drawCornerFestoon(ctx, t, 0)
  drawCornerFestoon(ctx, t, 1)
  ctx.restore()
}

/** sideIndex 0 = left edge, 1 = right edge */
function drawCornerFestoon(ctx, t, sideIndex) {
  const right = sideIndex === 1
  const baseX = right ? LOGICAL_WIDTH : 0
  const dir = right ? -1 : 1
  ctx.strokeStyle = 'rgba(255, 100, 200, 0.35)'
  ctx.lineWidth = 3
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath()
    const y0 = 720 + i * 28 + Math.sin(t * 2 + i) * 6
    ctx.moveTo(baseX, y0)
    ctx.quadraticCurveTo(baseX + dir * (90 + i * 12), y0 - 40 - i * 8, baseX + dir * (40 + i * 22), y0 - 120 - i * 14)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(24, 232, 255, 0.28)'
  ctx.lineWidth = 2
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath()
    const y0 = 100 + i * 36 + Math.cos(t * 2.2 + i * 0.7) * 5
    ctx.moveTo(baseX, y0)
    ctx.quadraticCurveTo(baseX + dir * (70 + i * 10), y0 + 50 + i * 6, baseX + dir * (32 + i * 16), y0 + 110 + i * 10)
    ctx.stroke()
  }

  const burstX = right ? LOGICAL_WIDTH - 36 : 36
  drawMiniFirework(ctx, t, burstX, 132 + (right ? 1 : 0) * 6)
  drawMiniFirework(ctx, t * 1.07, burstX, 848 + (right ? -1 : 1) * 4)
}

function drawMiniFirework(ctx, t, burstX, burstY) {
  ctx.strokeStyle = 'rgba(252, 231, 109, 0.45)'
  ctx.lineWidth = 2
  for (let a = 0; a < 8; a += 1) {
    const ang = (a / 8) * Math.PI * 2 + t * 0.4
    const len = 18 + (a % 2) * 10
    ctx.beginPath()
    ctx.moveTo(burstX, burstY)
    ctx.lineTo(burstX + Math.cos(ang) * len, burstY + Math.sin(ang) * len)
    ctx.stroke()
  }
}

function drawHomeGhostJudges(state) {
  const ctx = state.ctx
  const poses = [
    { x: 108, y: 268, s: 108 },
    { x: 432, y: 252, s: 118 },
    { x: 168, y: 388, s: 102 },
    { x: 372, y: 398, s: 108 },
  ]
  ctx.save()
  JUDGES.forEach((judge, i) => {
    const p = poses[i]
    const img = judgeImage(state, judge, state.save.equippedSkins[judge.id])
    ctx.globalAlpha = 0.13
    drawJudgeImage(ctx, img, p.x - p.s / 2, p.y - p.s / 2, p.s, Math.round(p.s * 1.08))
    ctx.globalAlpha = 1
  })
  ctx.restore()
}

const HOME_PORTRAIT_RINGS = ['#ff4fd8', '#5cff7a', '#7ce8ff', '#ffe24a']

function drawHomeJudgePortraits(state) {
  const spots = [
    { x: 48, y: 56, r: 48, scale: 1.28, yOff: 8 },
    { x: 134, y: 64, r: 48, scale: 1.3, yOff: 7 },
    { x: 406, y: 64, r: 48, scale: 1.22, yOff: 3 },
    { x: 492, y: 56, r: 48, scale: 1.24, yOff: 4 },
  ]
  JUDGES.forEach((judge, i) => {
    const p = spots[i]
    const img = judgeImage(state, judge, state.save.equippedSkins[judge.id])
    const ring = HOME_PORTRAIT_RINGS[i] || '#ffffff'
    drawHomePortraitCircle(state, p.x, p.y, p.r, ring, img, p)
  })
}

function drawHomePortraitCircle(state, cx, cy, r, _ringColor, image, framing = {}) {
  const ctx = state.ctx
  ctx.save()
  if (image?.complete && image.naturalWidth > 0) {
    const zoom = framing.scale || 1.18
    const scale = Math.max((r * 2) / image.naturalWidth, (r * 2) / image.naturalHeight) * zoom
    const iw = image.naturalWidth * scale
    const ih = image.naturalHeight * scale
    ctx.drawImage(image, cx - iw / 2, cy - ih / 2 + (framing.yOff || 0), iw, ih)
  } else {
    ctx.fillStyle = '#2a1458'
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  }
  ctx.restore()
}

function drawHomeTopStats(state) {
  const ctx = state.ctx
  const hi = formatScore(state.save.highScore)
  drawHomeScoreLine(ctx, hi, LOGICAL_WIDTH / 2, 190)
  const coinText = formatScore(state.save.coins)
  ctx.font = '1000 38px Fredoka, system-ui, Segoe UI, sans-serif'
  const coinW = ctx.measureText(coinText).width
  const iconSize = 36
  const gap = 12
  const groupX = LOGICAL_WIDTH / 2 - (coinW + gap + iconSize) / 2
  drawOutlinedText(ctx, coinText, groupX + coinW / 2, 238, 38, '#fce76d', '#5e315f', 'center', 1000, 4)
  drawIcon(ctx, state.assets.images.iconCoin, groupX + coinW + gap, 220, iconSize)
}

function drawHomeScoreLine(ctx, score, cx, y) {
  ctx.font = '1000 34px Fredoka, system-ui, Segoe UI, sans-serif'
  const label = 'HIGH SCORE: '
  const labelW = ctx.measureText(label).width
  const scoreW = ctx.measureText(score).width
  const x = cx - (labelW + scoreW) / 2
  drawOutlinedText(ctx, label, x, y, 34, '#a8fbff', '#234b61', 'left', 1000, 4)
  drawOutlinedText(ctx, score, x + labelW, y, 34, '#fce76d', '#5e315f', 'left', 1000, 4)
}

function drawHomeHeroTitle(state) {
  const ctx = state.ctx
  const image = state.assets.images.homeLogo
  if (image?.complete && image.naturalWidth > 0) {
    const sourceY = image.naturalHeight * 0.18
    const sourceH = image.naturalHeight * 0.62
    ctx.drawImage(image, 0, sourceY, image.naturalWidth, sourceH, 34, 316, 472, 260)
    return
  }
  drawStackedGameTitle(ctx, 'BRAINROT', LOGICAL_WIDTH / 2, 370, 46)
  drawStackedGameTitle(ctx, 'OLYMPICS', LOGICAL_WIDTH / 2, 434, 46)
}

function drawStackedGameTitle(ctx, text, x, y, size) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const font = `700 ${size}px Fredoka, system-ui, sans-serif`
  ctx.font = font
  ctx.lineJoin = 'round'
  ctx.lineWidth = 8
  ctx.strokeStyle = '#4a1f7a'
  ctx.strokeText(text, x + 3, y + 4)
  ctx.lineWidth = 5
  ctx.strokeStyle = '#2d0f4e'
  ctx.strokeText(text, x, y)
  const g = ctx.createLinearGradient(x - 120, y - size / 2, x + 120, y + size / 2)
  g.addColorStop(0, '#fff4a8')
  g.addColorStop(0.45, '#fce76d')
  g.addColorStop(1, '#f5c542')
  ctx.fillStyle = g
  ctx.fillText(text, x, y)
}

function drawHomeSpriteMenuButton(state, id, x, y, w, h, options) {
  const ctx = state.ctx
  const { sprite, label, icon, badge, labelSize = 24, labelColor = '#ffffff', textYOffset = 0 } = options
  drawImage(ctx, state.assets.images[sprite], x, y, w, h)
  let textShift = 0
  if (icon) {
    drawIcon(ctx, state.assets.images[icon], x + 28, y + h / 2 - 24, 48)
    textShift = 26
  }
  drawOutlinedText(ctx, label, x + w / 2 + textShift * 0.35, y + h / 2 + textYOffset, labelSize, labelColor, '#552169', 'center', 1000, 4)

  if (badge) {
    const bw = 64
    const bh = 34
    const bx = x + w - bw + 10
    const by = y - 10
    ctx.save()
    ctx.fillStyle = 'rgba(24, 82, 112, 0.94)'
    roundRect(ctx, bx, by, bw, bh, 15)
    ctx.fill()
    ctx.strokeStyle = '#a8fbff'
    ctx.lineWidth = 3
    roundRect(ctx, bx, by, bw, bh, 15)
    ctx.stroke()
    ctx.restore()
    drawOutlinedText(ctx, badge, bx + bw / 2, by + bh / 2, 16, '#ffffff', '#28516a', 'center', 1000, 2)
  }

  button(state, id, x, y, w, h)
}

function drawCircleIconButton(state, id, cx, cy, r, iconKey, ringColor) {
  const ctx = state.ctx
  ctx.save()
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(18, 18, 48, 0.88)'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = ringColor
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.shadowBlur = 0
  drawIcon(ctx, state.assets.images[iconKey], cx - 22, cy - 22, 44)
  ctx.restore()
  button(state, id, cx - r, cy - r, r * 2, r * 2)
}

function drawMenuAmbient(state) {
  const ctx = state.ctx
  const colors = ['#ff3dad', '#a8fbff', '#fce76d', '#ff86ce', '#7cff5b']
  const t = state.time
  for (let i = 0; i < 42; i += 1) {
    const x = (i * 73 + Math.sin(t * 1.2 + i * 0.3) * 14) % LOGICAL_WIDTH
    const y = (t * (14 + (i % 5) * 5) + i * 41) % LOGICAL_HEIGHT
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(t * 0.8 + i * 0.2)
    ctx.fillStyle = colors[i % colors.length]
    const w = 5 + (i % 3)
    const h = 3 + (i % 2)
    roundRect(ctx, -w / 2, -h / 2, w, h, 1.5)
    ctx.fill()
    ctx.restore()
  }
  for (let s = 0; s < 6; s += 1) {
    const side = s % 2 === 0 ? 0 : LOGICAL_WIDTH
    const sy = (t * 40 + s * 160) % LOGICAL_HEIGHT
    ctx.strokeStyle = `rgba(255, 200, 255, ${0.15 + (s % 3) * 0.06})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(side, sy)
    ctx.quadraticCurveTo(side === 0 ? 80 : LOGICAL_WIDTH - 80, sy + 30, LOGICAL_WIDTH / 2, sy + 60 + s * 12)
    ctx.stroke()
  }
}

function drawStageSelect(state) {
  const ctx = state.ctx
  drawStageSelectSpotlights(state)
  drawRoundTealBackButton(state, 48, 56, 36)

  const cardH = 126
  const gap = 12
  const startY = 146
  for (const stage of STAGES) {
    const y = startY + (stage.id - 1) * (cardH + gap)
    const unlocked = isStageUnlocked(state.save, stage.id)
    drawStageLevelCard(state, stage, y, cardH, unlocked)
  }
}

function drawStageSelectSpotlights(state) {
  const ctx = state.ctx
  const t = state.time * 0.35
  ctx.save()
  ctx.fillStyle = 'rgba(4, 6, 22, 0.45)'
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)

  const spots = [
    { x: LOGICAL_WIDTH * 0.22, color: 'rgba(255, 80, 200,' },
    { x: LOGICAL_WIDTH * 0.5, color: 'rgba(100, 255, 150,' },
    { x: LOGICAL_WIDTH * 0.78, color: 'rgba(100, 200, 255,' },
  ]
  for (let i = 0; i < spots.length; i += 1) {
    const s = spots[i]
    const pulse = 0.14 + Math.sin(t + i * 1.2) * 0.04
    const g = ctx.createRadialGradient(s.x, -40, 8, s.x, 220, 320)
    g.addColorStop(0, `${s.color} ${0.18 + pulse})`)
    g.addColorStop(0.5, `${s.color} ${0.06 + pulse * 0.25})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, LOGICAL_WIDTH, 360)
  }
  ctx.restore()
}

function drawRoundTealBackButton(state, cx, cy, r) {
  const ctx = state.ctx
  const ring = '#a8fbff'
  ctx.save()
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(8, 20, 40, 0.92)'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = ring
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.shadowBlur = 0
  drawIcon(ctx, state.assets.images.iconBack, cx - 18, cy - 18, 36)
  ctx.restore()
  button(state, 'back', cx - r, cy - r, r * 2, r * 2)
}

function drawStageLevelCard(state, stage, y, h, unlocked) {
  const ctx = state.ctx
  const x = 30
  const w = LOGICAL_WIDTH - 60
  const accent = stage.cardColor || '#a8fbff'
  const border = unlocked ? accent : '#4a3d6e'
  const best = state.save.stageBests[stage.id]
  const grade = best?.grade

  ctx.save()
  ctx.shadowBlur = 0
  ctx.fillStyle = unlocked ? 'rgba(12, 6, 32, 0.88)' : 'rgba(8, 4, 22, 0.92)'
  roundRect(ctx, x, y, w, h, 14)
  ctx.fill()
  ctx.strokeStyle = border
  ctx.lineWidth = unlocked ? 4 : 3
  roundRect(ctx, x, y, w, h, 14)
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()

  const avSize = 96
  const avX = x + 16
  const avY = y + (h - avSize) / 2
  drawStageCardAvatar(state, stage, avX, avY, avSize, border, unlocked)

  const title = (stage.cardTitle || stage.name).toUpperCase()
  const titleX = avX + avSize + 18
  const titleSize = title.length > 16 ? 27 : 31
  const titleLines = titleStageCardText(title)
  const titleLineGap = 36
  const titleStartY = y + h / 2 - ((titleLines.length - 1) * titleLineGap) / 2
  const titleColor = unlocked ? border : '#8f8aa8'
  titleLines.forEach((line, index) => {
    drawOutlinedText(ctx, line, titleX, titleStartY + index * titleLineGap, titleSize, titleColor, '#2d1648', 'left', 1000, 3)
  })

  const starX0 = x + w - 136
  const starY = y + 16
  const filled = unlocked ? starsFromGrade(grade) : 0
  drawStageCardStars(state, starX0, starY, filled)

  const medalX = x + w - 174
  const medalY = y + h / 2 + 6
  if (unlocked && grade && grade !== 'FAILED') {
    drawStageGradeMedal(state, medalX, medalY, grade, 66)
  }

  const triCx = x + w - 52
  const triCy = y + h / 2 + 10
  drawNeonPlayTriangle(ctx, triCx, triCy, 28, unlocked ? accent : '#6a6682', unlocked)

  if (!unlocked) {
    ctx.save()
    ctx.fillStyle = 'rgba(6, 4, 18, 0.45)'
    roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 16)
    ctx.fill()
    drawIcon(ctx, state.assets.images.iconLock, x + w / 2 - 28, y + h / 2 - 28, 56)
    ctx.restore()
  }

  button(state, `stage:${stage.id}`, x, y, w, h)
}

function titleStageCardText(title) {
  if (title === 'HOLD THE LINE') return ['HOLD', 'THE LINE']
  if (title === 'THE FINAL SHOW') return ['THE FINAL', 'SHOW']
  return title.split(' ').length > 2 ? title.split(' ').reduce((lines, word) => {
    if (!lines.length || `${lines[lines.length - 1]} ${word}`.length > 10) lines.push(word)
    else lines[lines.length - 1] += ` ${word}`
    return lines
  }, []) : title.split(' ')
}

function starsFromGrade(grade) {
  if (!grade || grade === 'FAILED') return 0
  const map = { D: 1, C: 2, B: 3, A: 4, S: 5 }
  return map[grade] ?? 0
}

function drawStageCardStars(state, x0, y, filled) {
  const ctx = state.ctx
  const gold = state.assets.images.iconGoldStar
  const empty = state.assets.images.iconEmptyStar
  for (let i = 0; i < 5; i += 1) {
    const xi = x0 + i * 21
    drawIcon(ctx, i < filled ? gold : empty, xi, y, 19)
  }
}

function drawStageCardAvatar(state, stage, ax, ay, size, borderColor, unlocked) {
  const ctx = state.ctx
  const judge = JUDGES[stage.judgeIndex] || JUDGES[0]
  const img = state.assets.stagePortraits?.[stage.id] || judgeImage(state, judge, state.save.equippedSkins[judge.id])
  ctx.save()
  ctx.shadowBlur = 0
  ctx.strokeStyle = borderColor
  ctx.lineWidth = 4
  roundRect(ctx, ax, ay, size, size, 12)
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.save()
  roundRect(ctx, ax + 4, ay + 4, size - 8, size - 8, 9)
  ctx.fillStyle = 'rgba(14, 8, 36, 0.96)'
  ctx.fill()
  ctx.clip()
  if (img?.complete && img.naturalWidth > 0) {
    const framing = stagePortraitFraming(stage.id)
    const scale = Math.max((size - 10) / img.naturalWidth, (size - 10) / img.naturalHeight) * framing.zoom
    const iw = img.naturalWidth * scale
    const ih = img.naturalHeight * scale
    ctx.globalAlpha = unlocked ? 1 : 0.35
    ctx.drawImage(img, ax + 4 + (size - 8 - iw) / 2 + framing.x, ay + 4 + (size - 8 - ih) / 2 + framing.y, iw, ih)
    ctx.globalAlpha = 1
  } else {
    ctx.fillStyle = '#24124f'
    ctx.fillRect(ax + 4, ay + 4, size - 8, size - 8)
  }
  ctx.restore()
  ctx.restore()
}

function stagePortraitFraming(stageId) {
  if (stageId === 1) return { zoom: 1.12, x: 2, y: 8 }
  if (stageId === 2) return { zoom: 1.04, x: 0, y: 10 }
  if (stageId === 3) return { zoom: 1.08, x: 0, y: 6 }
  if (stageId === 4) return { zoom: 1.1, x: 0, y: 14 }
  return { zoom: 1.08, x: 0, y: 8 }
}

function drawStageGradeMedal(state, cx, cy, grade, size) {
  const ctx = state.ctx
  const image = state.assets.images.medalsSheet
  const order = ['D', 'C', 'B', 'A', 'S']
  const index = order.indexOf(String(grade).toUpperCase())
  if (index < 0) return

  if (image?.complete && image.naturalWidth > 0) {
    const cellW = image.naturalWidth / 5
    const trimX = cellW * 0.07
    const trimY = image.naturalHeight * 0.08
    const sourceX = index * cellW + trimX
    const sourceY = trimY
    const sourceW = cellW - trimX * 2
    const sourceH = image.naturalHeight - trimY * 1.75
    const drawW = size
    const drawH = size * (sourceH / sourceW)
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.drawImage(image, sourceX, sourceY, sourceW, sourceH, cx - drawW / 2, cy - drawH / 2, drawW, drawH)
    ctx.restore()
    return
  }

  drawText(ctx, String(grade).toUpperCase(), cx, cy, 30, '#fce76d', 'center', 1000)
}

function drawNeonPlayTriangle(ctx, cx, cy, r, color, enabled) {
  ctx.save()
  ctx.translate(cx, cy)
  const c = enabled ? color : '#666666'
  ctx.beginPath()
  ctx.moveTo(r * 0.5, 0)
  ctx.lineTo(-r * 0.38, -r * 0.58)
  ctx.lineTo(-r * 0.38, r * 0.58)
  ctx.closePath()
  if (enabled) {
    ctx.shadowBlur = 0
  }
  ctx.fillStyle = enabled ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.25)'
  ctx.fill()
  ctx.strokeStyle = c
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()
}

function drawLeaderboard(state) {
  const ctx = state.ctx
  ctx.fillStyle = 'rgba(5, 4, 28, 0.22)'
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  drawRoundTealBackButton(state, 48, 56, 36)

  const rows = leaderboardRows()
  const startY = 122
  const rowH = 58
  const gap = 10
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    drawLeaderboardRow(state, row, index, startY + index * (rowH + gap), rowH)
  }

  ctx.strokeStyle = '#a8fbff'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(54, 812)
  ctx.lineTo(486, 812)
  ctx.stroke()

  const playerScore = Math.max(state.save.highScore, 84600)
  const pr = rankForEndlessScore(playerScore)
  drawLeaderboardPlayerRow(state, playerScore, pr, 836)
}

function drawShop(state) {
  const ctx = state.ctx
  drawRoundTealBackButton(state, 48, 56, 36)
  drawShopCoinPill(state)
  drawShopHeader(state)
  drawShopMascot(state)

  drawOutlinedText(ctx, 'POWER-UPS', LOGICAL_WIDTH / 2, 268, 32, '#ffffff', '#234b61', 'center', 1000, 4)
  drawPowerUpRow(state, BOOST_PRODUCTS[0], 48, 304, '#ff4fd8', 'iconHeart', 'EXTRA LIFE')
  drawPowerUpRow(state, BOOST_PRODUCTS[1], 48, 358, '#fce76d', 'iconCoin', 'DOUBLE COINS BOOST')
  drawPowerUpRow(state, BOOST_PRODUCTS[2], 48, 412, '#a8fbff', 'iconShield', 'COMBO SHIELD')

  drawOutlinedText(ctx, 'COSMETICS', LOGICAL_WIDTH / 2, 508, 32, '#ffffff', '#234b61', 'center', 1000, 4)
  drawShopCosmeticCard(state, shopSkinItem(state, 'blingbeak', 'partyhat', '#5cff7b'), 50, 542)
  drawShopCosmeticCard(state, shopSkinItem(state, 'disco', 'headband', '#a8fbff'), 286, 542)
  drawShopCosmeticCard(state, shopSkinItem(state, 'coolman', 'king', '#a8fbff'), 50, 724)
  drawShopCosmeticCard(state, shopSkinItem(state, 'dj', 'punk', '#fce76d'), 286, 724)
}

function shopSkinItem(state, judgeId, skinId, color) {
  const judge = JUDGES.find((item) => item.id === judgeId)
  const skin = judge?.skins.find((item) => item.id === skinId)
  return {
    id: `skin:${judgeId}:${skinId}`,
    image: state.assets.judgeImages[judgeId]?.[skinId],
    price: skin?.price || 0,
    color,
  }
}

function drawShopHeader(state) {
  const ctx = state.ctx
  const image = state.assets.images.shopLogo
  if (image?.complete && image.naturalWidth > 0) {
    const w = 260
    const h = (image.naturalHeight / image.naturalWidth) * w
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.drawImage(image, (LOGICAL_WIDTH - w) / 2, 24, w, h)
    ctx.restore()
    return
  }
  drawOutlinedText(ctx, 'BRAINROT MARKET', LOGICAL_WIDTH / 2, 60, 30, '#ff4fd8', '#37154d', 'center', 1000, 4)
}

function drawShopMascot(state) {
  const ctx = state.ctx
  const image = state.assets.images.shopMan
  if (!image?.complete || image.naturalWidth <= 0) return
  const w = 122
  const h = (image.naturalHeight / image.naturalWidth) * w
  drawImage(ctx, image, LOGICAL_WIDTH / 2 - w / 2, 112, w, h)
}

function drawShopCoinPill(state) {
  const ctx = state.ctx
  ctx.save()
  ctx.fillStyle = 'rgba(40, 12, 48, 0.82)'
  roundRect(ctx, 388, 32, 126, 40, 20)
  ctx.fill()
  ctx.strokeStyle = '#ff4fd8'
  ctx.lineWidth = 3
  roundRect(ctx, 388, 32, 126, 40, 20)
  ctx.stroke()
  ctx.restore()
  drawIcon(ctx, state.assets.images.iconCoin, 400, 39, 26)
  drawOutlinedText(ctx, formatScore(state.save.coins), 432, 52, 21, '#fce76d', '#5e315f', 'left', 1000, 3)
}

function drawPowerUpRow(state, product, x, y, color, icon, label) {
  const ctx = state.ctx
  const w = 444
  const h = 48
  ctx.save()
  ctx.fillStyle = 'rgba(18, 9, 54, 0.76)'
  roundRect(ctx, x, y, w, h, 24)
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  roundRect(ctx, x, y, w, h, 24)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + 76, y + 8)
  ctx.lineTo(x + 76, y + h - 8)
  ctx.stroke()
  ctx.restore()
  drawIcon(ctx, state.assets.images[icon], x + 19, y + 9, 30)
  drawOutlinedText(ctx, label, x + 94, y + h / 2, 21, color, '#2d1648', 'left', 1000, 3)
  drawOutlinedText(ctx, `${product.price} coins`, x + w - 18, y + h / 2, 20, '#ffdaee', '#4a123c', 'right', 1000, 3)
  button(state, `boost:${product.id}`, x, y, w, h)
}

function drawShopCosmeticCard(state, item, x, y) {
  const ctx = state.ctx
  const w = 206
  const h = 154
  ctx.save()
  ctx.fillStyle = 'rgba(18, 9, 54, 0.78)'
  roundRect(ctx, x, y, w, h, 18)
  ctx.fill()
  ctx.strokeStyle = item.color
  ctx.lineWidth = 3
  roundRect(ctx, x, y, w, h, 18)
  ctx.stroke()
  ctx.strokeStyle = item.color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y + h - 42)
  ctx.lineTo(x + w, y + h - 42)
  ctx.stroke()
  ctx.restore()

  if (item.image?.complete && item.image.naturalWidth > 0) {
    const boxW = w - 28
    const boxH = h - 52
    const scale = Math.min(boxW / item.image.naturalWidth, boxH / item.image.naturalHeight) * 1.12
    const iw = item.image.naturalWidth * scale
    const ih = item.image.naturalHeight * scale
    ctx.drawImage(item.image, x + (w - iw) / 2, y + 12 + (boxH - ih) / 2, iw, ih)
  }

  drawOutlinedText(ctx, `${item.price} coins`, x + w / 2, y + h - 20, 22, '#ffffff', '#234b61', 'center', 1000, 3)
  button(state, item.id, x, y, w, h)
}

function drawSettings(state) {
  const ctx = state.ctx
  drawRoundTealBackButton(state, 48, 56, 36)

  ctx.save()
  ctx.fillStyle = 'rgba(18, 9, 54, 0.76)'
  roundRect(ctx, 46, 286, 448, 356, 28)
  ctx.fill()
  ctx.strokeStyle = '#a8fbff'
  ctx.lineWidth = 3
  roundRect(ctx, 46, 286, 448, 356, 28)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(78, 384)
  ctx.lineTo(462, 384)
  ctx.stroke()
  ctx.restore()

  drawOutlinedText(ctx, 'AUDIO', LOGICAL_WIDTH / 2, 336, 30, '#fce76d', '#5e315f', 'center', 1000, 4)
  drawSettingsToggleRow(state, 'toggleMusic', 74, 410, 'iconMusic', 'MUSIC', state.save.settings.music)
  drawSettingsToggleRow(state, 'toggleSfx', 74, 498, 'iconVolume', 'SFX', state.save.settings.sfx)

  drawOutlinedText(ctx, 'SAVED AUTOMATICALLY', LOGICAL_WIDTH / 2, 700, 20, '#a8fbff', '#234b61', 'center', 1000, 3)
  drawText(ctx, 'Changes apply right away on this device.', LOGICAL_WIDTH / 2, 732, 15, '#d9fbff', 'center', 800)
}

function drawSettingsToggleRow(state, id, x, y, icon, label, enabled) {
  const ctx = state.ctx
  const w = 392
  const h = 62
  const border = enabled ? '#a8fbff' : '#ff4fd8'
  const valueColor = enabled ? '#5cff7b' : '#ff86ce'

  ctx.save()
  ctx.fillStyle = 'rgba(18, 9, 54, 0.78)'
  roundRect(ctx, x, y, w, h, 31)
  ctx.fill()
  ctx.strokeStyle = border
  ctx.lineWidth = 3
  roundRect(ctx, x, y, w, h, 31)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.42)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + 76, y + 10)
  ctx.lineTo(x + 76, y + h - 10)
  ctx.stroke()
  ctx.restore()

  drawIcon(ctx, state.assets.images[icon], x + 20, y + 14, 34)
  drawOutlinedText(ctx, label, x + 96, y + h / 2, 25, border, '#2d1648', 'left', 1000, 3)
  drawOutlinedText(ctx, enabled ? 'ON' : 'OFF', x + w - 30, y + h / 2, 25, valueColor, '#2d1648', 'right', 1000, 3)
  button(state, id, x, y, w, h)
}

function drawBoostSelect(state) {
  const ctx = state.ctx
  const pending = state.boostSelectPending
  if (!pending) {
    state.screen = 'home'
    return
  }
  drawHeader(state, 'PRE-RUN BOOSTS', 'TOGGLE THEN START')
  drawCurrencyBar(state)
  drawText(
    ctx,
    pending.kind === 'endless' ? 'ENDLESS RUN' : `STAGE ${pending.stageId}`,
    LOGICAL_WIDTH / 2,
    200,
    20,
    '#fce76d',
    'center',
    1000,
  )

  const hasD = (state.save.doubleCoinsRunsRemaining || 0) > 0
  const hasS = (state.save.comboShieldRunsRemaining || 0) > 0
  drawSpritePanel(state, 64, 232, 412, 240, 'panelCyan')
  let ty = 258
  if (hasD) {
    const on = state.boostSelectUseDoubleCoins
    drawSpriteButton(state, 'boostToggleDouble', 90, ty, 360, 62, on ? 'buttonCyan' : 'buttonPink', `DOUBLE COINS ${on ? 'ON' : 'OFF'}`, 'iconCoin')
    ty += 76
  }
  if (hasS) {
    const on = state.boostSelectUseComboShield
    drawSpriteButton(state, 'boostToggleShield', 90, ty, 360, 62, on ? 'buttonCyan' : 'buttonPink', `COMBO SHIELD ${on ? 'ON' : 'OFF'}`, 'iconShield')
  }

  drawSpriteButton(state, 'boostSelectGo', 78, 520, 384, 76, 'buttonGold', 'START RUN', 'iconPlay')
  drawSpriteButton(state, 'boostSelectCancel', 78, 616, 384, 62, 'buttonPink', 'CANCEL', null)
}

function drawResults(state) {
  const ctx = state.ctx
  const run = state.run
  if (!run) {
    state.screen = 'home'
    return
  }

  drawResultsSpotlights(state)
  const cx = LOGICAL_WIDTH / 2

  const headline = run.completed ? 'RUN COMPLETE' : 'ELIMINATED'
  const headBorder = run.completed ? '#a8fbff' : '#ff4f8a'
  drawResultsTitlePill(state, cx, 48, headline, headBorder)

  let nextY = 102
  if (run.completed && run.grade && run.grade !== 'FAILED') {
    drawMedalSparkles(ctx, cx, nextY + 44, state.time)
    drawBigResultsMedal(ctx, cx, nextY + 44, run.grade, run.mode === 'stage' ? run.stage?.cardColor : '#a8fbff')
    nextY = 188
  } else {
    drawText(ctx, run.lastMissCause, cx, nextY + 28, 13, '#ffc8e8', 'center', 800)
    drawText(ctx, run.grade, cx, nextY + 76, 56, gradeColor(run.grade), 'center', 1000)
    nextY = 188
  }

  const cyan = '#a8fbff'
  const pink = '#ff4fd8'
  const gold = '#ffcc00'
  const combo = Math.max(1, run.bestCombo || 0)
  const accPct = Math.round((run.accuracy || 0) * 100)
  const perfects = run.hitCounts?.perfect ?? 0

  nextY = drawResultsStatPill(state, nextY, cyan, `FINAL SCORE — ${formatScore(run.score)}`)
  nextY = drawResultsStatPill(state, nextY, cyan, `BEST COMBO — x${combo}`)
  nextY = drawResultsStatPill(state, nextY, cyan, `ACCURACY — ${accPct}%`)
  nextY = drawResultsStatPill(state, nextY, cyan, `PERFECT HITS — ${perfects}`)

  const rankLine =
    run.mode === 'endless' && run.leaderboardRank != null
      ? `LEADERBOARD RANK: #${run.leaderboardRank}`
      : run.mode === 'stage'
        ? `STAGE — ${(run.stage?.cardTitle || run.stage?.name || 'STAGE').toUpperCase()}`
        : 'LEADERBOARD RANK: —'
  nextY = drawResultsStatPill(state, nextY, pink, rankLine, 'iconTrophy')
  nextY = drawResultsStatPill(state, nextY, gold, `+${run.coinsEarned || 0} COINS`, 'iconCoin')

  if (!run.ftue) {
    drawResultsJudgeRow(state, run)
  }

  if (run.ftue) {
    drawSpriteButton(state, 'ftueContinue', 52, 648, 436, 72, 'buttonCyan', ftueResultButtonLabel(run), 'iconPlay')
    drawText(ctx, run.completed ? ftueResultLine(run) : 'Beat the stage to continue the tutorial.', cx, 738, 14, '#d9fbff', 'center', 800)
    return
  }

  const retry = resultsRetryAction(run)
  drawSpriteButton(state, 'tryAgain', 52, 656, 436, 64, retry.sprite, retry.label, retry.icon)
  drawSpriteButton(state, 'resultsShop', 52, 728, 436, 56, 'buttonGold', 'SHOP', 'iconCoin')
  drawSpriteButton(state, 'resultsHome', 52, 792, 436, 56, 'buttonCyan', 'BACK TO MENU', null)
  drawCircleIconButton(state, 'resultsShare', 498, 848, 28, 'iconShare', '#fce76d')
}

function resultsRetryAction(run) {
  if (run.mode === 'endless') return { label: 'TRY AGAIN', icon: 'iconInfinity', sprite: 'buttonPink' }
  return { label: 'RETRY STAGE', icon: 'iconPlay', sprite: 'buttonPink' }
}

function drawResultsSpotlights(state) {
  const ctx = state.ctx
  const t = state.time * 0.38
  ctx.save()
  ctx.fillStyle = 'rgba(6, 8, 28, 0.5)'
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)

  const left = ctx.createRadialGradient(0, -20, 10, 80, 280, 360)
  left.addColorStop(0, `rgba(0, 230, 255, ${0.16 + Math.sin(t) * 0.04})`)
  left.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = left
  ctx.fillRect(0, 0, LOGICAL_WIDTH * 0.55, 420)

  const right = ctx.createRadialGradient(LOGICAL_WIDTH, -10, 10, LOGICAL_WIDTH - 70, 260, 340)
  right.addColorStop(0, `rgba(255, 210, 60, ${0.14 + Math.cos(t * 1.1) * 0.035})`)
  right.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = right
  ctx.fillRect(LOGICAL_WIDTH * 0.45, 0, LOGICAL_WIDTH * 0.55, 400)
  ctx.restore()
}

function drawResultsTitlePill(state, cx, y, text, border) {
  const ctx = state.ctx
  const h = 42
  ctx.save()
  ctx.font = '800 20px Fredoka, system-ui, sans-serif'
  const w2 = Math.min(400, ctx.measureText(text).width + 72)
  const x2 = cx - w2 / 2
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(10, 12, 36, 0.9)'
  roundRect(ctx, x2, y, w2, h, 21)
  ctx.fill()
  ctx.strokeStyle = border
  ctx.lineWidth = 3
  roundRect(ctx, x2, y, w2, h, 21)
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()
  drawText(ctx, text, cx, y + h / 2, 20, '#ffffff', 'center', 900)
}

function drawMedalSparkles(ctx, cx, cy, time) {
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2 + time * 1.8
    const r = 62 + (i % 3) * 5 + Math.sin(time * 4 + i) * 3
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(200, 240, 255,0.75)'
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2.2, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawBigResultsMedal(ctx, cx, cy, grade, ribbonAccent) {
  const letter = String(grade).toUpperCase()
  let metal = '#e6b422'
  let face = '#ffe98a'
  if (grade === 'A') {
    metal = '#c5d2e0'
    face = '#ffffff'
  } else if (grade === 'B') {
    metal = '#b87333'
    face = '#ffd4a8'
  } else if (grade === 'S') {
    metal = '#ffd700'
    face = '#fff6c2'
  } else if (grade === 'C' || grade === 'D') {
    metal = '#8a7a68'
    face = '#e8ddd0'
  }

  ctx.save()
  ctx.fillStyle = ribbonAccent
  ctx.globalAlpha = 0.95
  ctx.beginPath()
  ctx.moveTo(cx - 22, cy + 40)
  ctx.lineTo(cx - 8, cy + 10)
  ctx.lineTo(cx + 8, cy + 10)
  ctx.lineTo(cx + 22, cy + 40)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.shadowBlur = 0
  ctx.fillStyle = metal
  ctx.beginPath()
  ctx.arc(cx, cy, 44, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.shadowBlur = 0

  ctx.fillStyle = face
  ctx.beginPath()
  ctx.arc(cx, cy, 32, 0, Math.PI * 2)
  ctx.fill()

  ctx.lineWidth = 3
  ctx.strokeStyle = '#ffffff'
  ctx.font = '800 38px Fredoka, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.strokeText(letter, cx, cy)
  ctx.fillStyle = grade === 'S' ? '#ff2fa3' : grade === 'A' ? '#2a7fff' : '#4a3020'
  ctx.fillText(letter, cx, cy)
  ctx.restore()
}

function drawResultsStatPill(state, y, border, line, iconKey = null) {
  const ctx = state.ctx
  const cx = LOGICAL_WIDTH / 2
  const x = 70
  const w = LOGICAL_WIDTH - 140
  const h = 36
  ctx.save()
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(10, 12, 40, 0.88)'
  roundRect(ctx, x, y, w, h, 18)
  ctx.fill()
  ctx.strokeStyle = border
  ctx.lineWidth = 2
  roundRect(ctx, x, y, w, h, 18)
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()
  const mid = y + h / 2
  if (iconKey) {
    drawIcon(ctx, state.assets.images[iconKey], x + 14, mid - 12, 24)
    drawText(ctx, line, cx + 8, mid, 14, '#ffffff', 'center', 800)
  } else {
    drawText(ctx, line, cx, mid, 14, '#ffffff', 'center', 800)
  }
  return y + h + 7
}

function drawResultsJudgeRow(state, run) {
  const ctx = state.ctx
  const hostIndex = run.mode === 'stage' ? run.stage?.judgeIndex ?? run.activeJudgeIndex : run.activeJudgeIndex
  const host = JUDGES[hostIndex] || JUDGES[0]
  const hostImg = judgeImage(state, host, state.save.equippedSkins[host.id])
  const bubble = judgeResultsQuip(run)

  const rowY = 468
  const hostX = 56
  const hostW = 118
  const hostH = 132

  ctx.save()
  ctx.shadowBlur = 0
  roundRect(ctx, hostX, rowY, hostW, hostH, 16)
  ctx.strokeStyle = host.color
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.save()
  roundRect(ctx, hostX + 4, rowY + 4, hostW - 8, hostH - 8, 12)
  ctx.clip()
  if (hostImg?.complete && hostImg.naturalWidth > 0) {
    const sc = Math.max((hostW - 8) / hostImg.naturalWidth, (hostH - 8) / hostImg.naturalHeight)
    const iw = hostImg.naturalWidth * sc
    const ih = hostImg.naturalHeight * sc
    ctx.drawImage(hostImg, hostX + 4 + (hostW - 8 - iw) / 2, rowY + 4 + (hostH - 8 - ih) / 2, iw, ih)
  }
  ctx.restore()
  ctx.restore()

  const bx = hostX + hostW + 10
  const by = rowY + 8
  const bw = 200
  const bh = 44
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  roundRect(ctx, bx, by, bw, bh, 12)
  ctx.fill()
  ctx.strokeStyle = 'rgba(80, 60, 120, 0.35)'
  ctx.lineWidth = 2
  roundRect(ctx, bx, by, bw, bh, 12)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(bx + 14, by + bh)
  ctx.lineTo(bx + 28, by + bh + 10)
  ctx.lineTo(bx + 40, by + bh)
  ctx.fill()
  drawText(ctx, bubble, bx + bw / 2, by + bh / 2, 13, '#2a1a45', 'center', 900)

  const rings = ['#5cff7b', '#a8fbff', '#ffe24a']
  let ri = 0
  for (let i = 0; i < JUDGES.length; i += 1) {
    if (i === hostIndex) continue
    const j = JUDGES[i]
    const img = judgeImage(state, j, state.save.equippedSkins[j.id])
    const cx = LOGICAL_WIDTH - 52 - ri * 52
    const cy = rowY + 28 + ri * 8
    drawHomePortraitCircle(state, cx, cy, 26, rings[ri % rings.length], img)
    ri += 1
    if (ri >= 3) break
  }
}

function judgeResultsQuip(run) {
  if (!run.completed) return 'BRUTAL.'
  const g = run.grade
  if (g === 'S') return 'ABSOLUTE CINEMA.'
  if (g === 'A') return 'NOT BAD.'
  if (g === 'B') return 'SOLID RUN.'
  if (g === 'C' || g === 'D') return "WE'LL TAKE IT."
  return 'GG.'
}

function drawRun(state) {
  const ctx = state.ctx
  const run = state.run
  if (!run) return

  const hitTheme = hitThemeById(state.save.equippedHitTheme)

  drawRunHud(state)
  if (run.ftue) drawFtueRunPrompt(state, run)

  if (run.status === 'countdown') {
    const number = Math.max(1, Math.ceil(run.startedAt - state.time))
    drawText(ctx, String(number), LOGICAL_WIDTH / 2, 500, 120, '#ffffff', 'center', 1000)
    drawText(ctx, 'GET READY', LOGICAL_WIDTH / 2, 590, 22, '#a8fbff', 'center', 1000)
    return
  }

  const freeze = run.failSnapshot && (run.status === 'continueOffer' || run.status === 'finished')

  if (run.status === 'playing') {
    for (const target of run.targets) {
      if (!target.resolved) drawTarget(ctx, target, hitTheme)
    }
  }

  if (freeze) {
    ctx.fillStyle = 'rgba(5, 2, 24, 0.62)'
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    drawFailSnapshot(ctx, run.failSnapshot)
  }

  if (run.milestoneFlashUntil > state.time) {
    ctx.fillStyle = 'rgba(252, 231, 109, 0.2)'
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  }

  if (run.captionUntil > state.time && run.caption) {
    const cap = run.caption
    const isNeg = cap.includes('MISS') || cap.includes('OFF')
    const isMilestone = COMBO_MILESTONE_AT.some(
      (n) => cap.startsWith(`COMBO ${n}`) || cap.startsWith(`${n} —`),
    )
    const size = isMilestone ? 30 : 36
    drawText(ctx, cap, LOGICAL_WIDTH / 2, 312, size, isNeg ? '#ff4f9a' : '#fce76d', 'center', 1000)
  }

  if (run.status === 'finished') {
    ctx.fillStyle = freeze ? 'rgba(12, 5, 38, 0.42)' : 'rgba(12, 5, 38, 0.58)'
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    drawText(ctx, run.completed ? 'STAGE CLEAR' : 'ELIMINATED', LOGICAL_WIDTH / 2, 456, 54, run.completed ? '#a8fbff' : '#ff4f9a', 'center', 1000)
    drawText(ctx, run.lastMissCause, LOGICAL_WIDTH / 2, 514, 18, '#ffffff', 'center', 900)
  }

  if (run.status === 'continueOffer') {
    const left = Math.max(0, run.continueOfferUntil - state.time)
    drawSpritePanel(state, 52, 360, 436, 220, 'panelCyan')
    drawText(ctx, 'CONTINUE?', LOGICAL_WIDTH / 2, 404, 28, '#ffffff', 'center', 1000)
    drawText(ctx, `${CONTINUE_COST} COINS · 50% HP`, LOGICAL_WIDTH / 2, 442, 16, '#d9fbff', 'center', 900)
    drawText(ctx, `${Math.ceil(left)}s`, LOGICAL_WIDTH / 2, 476, 36, '#fce76d', 'center', 1000)
    drawSpriteButton(state, 'continueBuy', 78, 508, 384, 64, 'buttonGold', 'CONTINUE', 'iconCoin')
    drawSpriteButton(state, 'continueDecline', 78, 582, 384, 58, 'buttonPink', 'GIVE UP', null)
  }

  if (run.paused && run.status === 'playing') {
    ctx.fillStyle = 'rgba(12, 5, 38, 0.62)'
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    drawText(ctx, 'PAUSED', LOGICAL_WIDTH / 2, 420, 44, '#ffffff', 'center', 1000)
    drawText(ctx, 'TAP TO RESUME', LOGICAL_WIDTH / 2, 486, 22, '#a8fbff', 'center', 900)
    drawIcon(ctx, state.assets.images.iconPlay, LOGICAL_WIDTH / 2 - 28, 520, 56)
    button(state, 'runResume', 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  }
}

function drawFtueRunPrompt(state, run) {
  const ctx = state.ctx
  const prompt = ftuePrompt(run)
  drawSpritePanel(state, 62, 150, 416, 54, 'footerPurple')
  drawText(ctx, prompt.title, LOGICAL_WIDTH / 2, 169, 15, '#fce76d', 'center', 1000)
  drawText(ctx, prompt.body, LOGICAL_WIDTH / 2, 190, 12, '#ffffff', 'center', 800)
}

function drawRunHud(state) {
  const ctx = state.ctx
  const run = state.run
  drawRunJudgeCorners(state, run)

  drawOutlinedText(ctx, formatScore(run.score), 100, 48, 38, '#ffffff', '#5e315f', 'left', 1000, 4)

  const timeText = run.mode === 'stage' ? `${Math.max(0, Math.ceil(run.duration - run.elapsed))}s` : `${Math.floor(run.elapsed)}s`
  drawText(ctx, timeText, LOGICAL_WIDTH / 2, 42, 20, '#fce76d', 'center', 1000)

  drawOutlinedText(ctx, `${run.combo}x`, LOGICAL_WIDTH / 2, 884, 36, '#a8fbff', '#234b61', 'center', 1000, 4)
  drawIcon(ctx, state.assets.images.iconHeart, 166, 918, 28)
  drawBar(ctx, 202, 925, 170, 15, run.hp / MAX_HP, '#ff4f9a', '#a8fbff')

  let hx = LOGICAL_WIDTH / 2 - 28
  if (run.thisRunDoubleCoins) {
    drawIcon(ctx, state.assets.images.iconCoin, hx, 902, 24)
    hx += 30
  }
  if (run.thisRunComboShield) {
    drawIcon(ctx, state.assets.images.iconShield, hx, 902, 24)
  }
  if (run.status === 'playing' && !run.paused) {
    drawIcon(ctx, state.assets.images.iconPause, LOGICAL_WIDTH / 2 - 17, 64, 34)
    button(state, 'runPause', LOGICAL_WIDTH / 2 - 31, 50, 62, 62)
  }
}

function drawRunJudgeCorners(state, run) {
  const spots = [
    { x: 48, y: 48 },
    { x: LOGICAL_WIDTH - 48, y: 48 },
    { x: 48, y: LOGICAL_HEIGHT - 48 },
    { x: LOGICAL_WIDTH - 48, y: LOGICAL_HEIGHT - 48 },
  ]

  JUDGES.forEach((judge, index) => {
    const skinId = state.save.equippedSkins[judge.id] || 'default'
    const active = index === run.activeJudgeIndex
    const spot = spots[index]
    drawRunJudgePortrait(state, judge, skinId, spot.x, spot.y, active ? 92 : 82)
  })
}

function drawRunJudgePortrait(state, judge, skinId, cx, cy, size) {
  const ctx = state.ctx
  const image = judgeImage(state, judge, skinId)
  if (image?.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, cx - size / 2, cy - size / 2, size, size)
  }
}

function judgeMoodMotion(state, run) {
  const kind = run.judgeMoodKind
  const live = state.time < run.judgeMoodUntil && kind !== 'idle'
  if (kind === 'eliminated') {
    return { scale: 0.96 + Math.sin(state.time * 22) * 0.02, yOff: 2 }
  }
  if (!live) return { scale: 1, yOff: 0 }
  if (kind === 'hype') {
    return { scale: 1 + Math.sin(state.time * 14) * 0.065, yOff: Math.sin(state.time * 17) * 4 }
  }
  if (kind === 'wince') {
    return { scale: 0.93 + Math.sin(state.time * 20) * 0.02, yOff: 5 }
  }
  if (kind === 'nod') {
    return { scale: 1 + Math.sin(state.time * 9) * 0.04, yOff: -Math.abs(Math.sin(state.time * 7)) * 5 }
  }
  return { scale: 1, yOff: 0 }
}

function drawJudgeHost(state, run) {
  const ctx = state.ctx
  const active = JUDGES[run.activeJudgeIndex]
  const activeSkinId = state.save.equippedSkins[active.id]
  const image = judgeImage(state, active, activeSkinId)
  const motion = judgeMoodMotion(state, run)
  ctx.save()
  ctx.translate(LOGICAL_WIDTH / 2, 836 + motion.yOff)
  ctx.scale(motion.scale, motion.scale)
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(18, 9, 54, 0.86)'
  roundRect(ctx, -86, -84, 172, 122, 24)
  ctx.fill()
  ctx.strokeStyle = active.color
  ctx.lineWidth = 5
  ctx.stroke()
  drawJudgeImage(ctx, image, -48, -76, 96, 104)
  drawText(ctx, active.name.toUpperCase(), 0, 54, 13, '#ffffff', 'center', 1000)
  ctx.restore()

  if (run.mode === 'endless') {
    JUDGES.forEach((judge, index) => {
      if (index === run.activeJudgeIndex) return
      const x = 54 + index * 144
      const mood = run.inactiveMoods[index]
      const cheering = mood && state.time < mood.until && mood.kind !== 'idle'
      const bob = cheering ? Math.sin(state.time * 11) * 4 : 0
      ctx.globalAlpha = 0.34 + (cheering ? 0.24 : 0)
      drawJudgeImage(ctx, judgeImage(state, judge, state.save.equippedSkins[judge.id]), x, 150 + bob, 52, 68)
      ctx.globalAlpha = 1
    })
  }
}

function drawTarget(ctx, target, theme) {
  const progress = clamp(target.age / target.approach, 0, 1.25)
  if (target.kind === 'slide') {
    drawSlideTarget(ctx, target, progress, theme)
    return
  }
  if (target.kind === 'hold') {
    drawHoldTarget(ctx, target, progress, theme)
    return
  }
  drawTapTarget(ctx, target, progress, theme)
}

function drawTapTarget(ctx, target, progress, theme) {
  const ring = 44 + (1 - clamp(progress, 0, 1)) * 78
  const { outer, inner } = theme.ringTap
  drawGlowCircle(ctx, target.x, target.y, ring, outer, false)
  drawGlowCircle(ctx, target.x, target.y, 44, inner, true)
}

function drawHoldTarget(ctx, target, progress, theme) {
  const { fill, arc } = theme.ringHold
  drawGlowCircle(ctx, target.x, target.y, 48, fill, true)
  const ringFill = target.holding ? clamp(target.heldFor / target.holdDuration, 0, 1) : clamp(progress, 0, 1)
  ctx.strokeStyle = arc
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.arc(target.x, target.y, 62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ringFill)
  ctx.stroke()
}

function drawSlideTarget(ctx, target, progress, theme) {
  const s = theme.ringSlide
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = s.pathDim
  ctx.lineWidth = 28
  drawSliderPath(ctx, target)
  ctx.stroke()
  ctx.strokeStyle = s.path
  ctx.lineWidth = 18
  drawSliderPath(ctx, target)
  ctx.stroke()
  if (target.trail?.length > 1) {
    ctx.strokeStyle = s.trail
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.moveTo(target.trail[0].x, target.trail[0].y)
    for (const point of target.trail.slice(1)) ctx.lineTo(point.x, point.y)
    ctx.stroke()
  }
  const marker = pointOnSlider(target, clamp(target.progress || progress * 0.25, 0, 1))
  drawGlowCircle(ctx, target.x, target.y, 38, s.start, true)
  drawGlowCircle(ctx, target.endX, target.endY, 38, s.end, true)
  drawGlowCircle(ctx, marker.x, marker.y, 14, '#ffffff', true)
  ctx.restore()
}

function drawFailSnapshot(ctx, snap) {
  if (!snap) return
  const theme = hitThemeById(snap.themeId || 'default')
  drawTarget(ctx, snap, theme)
}

function drawSliderPath(ctx, target) {
  ctx.beginPath()
  ctx.moveTo(target.x, target.y)
  ctx.quadraticCurveTo(target.controlX, target.controlY, target.endX, target.endY)
}

function drawSkinCard(state, judge, skin, x, y) {
  const ctx = state.ctx
  const owned = isSkinOwned(state.save, judge.id, skin.id)
  const equipped = state.save.equippedSkins[judge.id] === skin.id
  drawSpritePanel(state, x, y, 218, 88, 'footerPurple')
  drawJudgeImage(ctx, judgeImage(state, judge, skin.id), x + 12, y + 12, 50, 62)
  drawText(ctx, judge.name.split(' ')[0].toUpperCase(), x + 74, y + 22, 11, '#b5faff', 'left', 900)
  drawText(ctx, skin.name.toUpperCase(), x + 74, y + 40, 12, '#ffffff', 'left', 1000)
  drawText(ctx, equipped ? 'EQUIPPED' : owned ? 'EQUIP' : `${skin.price} COINS`, x + 74, y + 62, 12, equipped ? '#fce76d' : owned ? '#a8fbff' : '#ff86ce', 'left', 900)
  button(state, `skin:${judge.id}:${skin.id}`, x, y, 218, 88)
}

function drawBoostProductCard(state, product, x, y) {
  const ctx = state.ctx
  const ownedLabel =
    product.kind === 'bank'
      ? `${state.save.bankedExtraLife || 0} banked`
      : product.id === 'doubleCoins'
        ? `${state.save.doubleCoinsRunsRemaining || 0} runs`
        : `${state.save.comboShieldRunsRemaining || 0} runs`
  drawSpritePanel(state, x, y, 156, 86, 'footerPurple')
  drawText(ctx, product.name.toUpperCase(), x + 78, y + 22, 11, '#ffffff', 'center', 1000)
  drawText(ctx, product.subtitle, x + 78, y + 40, 9, '#b5faff', 'center', 800)
  drawText(ctx, `${product.price} COINS`, x + 78, y + 58, 11, '#ff86ce', 'center', 900)
  drawText(ctx, ownedLabel, x + 78, y + 74, 9, '#fce76d', 'center', 800)
  button(state, `boost:${product.id}`, x, y, 156, 86)
}

function drawLeaderboardRow(state, row, index, y, h) {
  const ctx = state.ctx
  const colors = ['#fce76d', '#a8fbff', '#ff9f43', '#a8fbff', '#a8fbff', '#a8fbff', '#a8fbff', '#a8fbff', '#a8fbff', '#a8fbff']
  const color = colors[index] || '#a8fbff'
  const x = 38
  const w = 464
  const midY = y + h / 2
  ctx.save()
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(18, 9, 54, 0.86)'
  roundRect(ctx, x, y, w, h, h / 2)
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = index < 3 ? 4 : 3
  ctx.stroke()
  ctx.shadowBlur = 0

  drawOutlinedText(ctx, `#${index + 1}`, 62, midY, 27, color, '#24124f', 'left', 1000, 3)
  ctx.strokeStyle = 'rgba(255,255,255,0.52)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(116, y + 11)
  ctx.lineTo(116, y + h - 11)
  ctx.stroke()
  drawOutlinedText(ctx, row.name, 132, midY, row.name.length > 17 ? 20 : 23, color, '#24124f', 'left', 1000, 3)
  drawOutlinedText(ctx, formatScore(row.score), 436, midY, 23, index < 3 ? '#ff86ce' : '#fce76d', '#24124f', 'right', 1000, 3)
  drawLeaderboardPortrait(state, row, 480, midY, color, 24)
  ctx.restore()
}

function drawLeaderboardPlayerRow(state, score, rank, y) {
  const ctx = state.ctx
  const judge = JUDGES[1]
  const row = { judgeId: judge.id, skinId: state.save.equippedSkins[judge.id] || 'default' }
  const h = 62
  const midY = y + h / 2
  ctx.save()
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(68, 10, 62, 0.86)'
  roundRect(ctx, 38, y, 464, h, h / 2)
  ctx.fill()
  ctx.strokeStyle = '#ff2fa3'
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.shadowBlur = 0
  drawOutlinedText(ctx, `YOU - #${rank}`, 68, midY, 30, '#ffdaee', '#4a123c', 'left', 1000, 4)
  drawOutlinedText(ctx, formatScore(score), 438, midY, 25, '#ffdaee', '#4a123c', 'right', 1000, 3)
  drawLeaderboardPortrait(state, row, 482, midY, '#ff2fa3', 25)
  ctx.restore()
}

function drawLeaderboardPortrait(state, row, x, y, color, r = 21) {
  const ctx = state.ctx
  const judge = JUDGES.find((item) => item.id === row.judgeId) || JUDGES[0]
  const image = judgeImage(state, judge, row.skinId || 'default')
  ctx.save()
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(18, 9, 54, 0.95)'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.clip()
  if (image?.complete && image.naturalWidth > 0) {
    const size = r * 2.35
    ctx.drawImage(image, x - size / 2, y - size / 2, size, size)
  }
  ctx.restore()
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()
}

function leaderboardRows() {
  return [
    { name: 'Sir Brave-Heart', score: 98100, judgeId: 'blingbeak', skinId: 'partyhat' },
    { name: 'Lady Chaos-Bringer', score: 95500, judgeId: 'disco', skinId: 'disco' },
    { name: 'Shadow-Stalker', score: 92200, judgeId: 'coolman', skinId: 'default' },
    { name: 'Pixel-Champion', score: 89800, judgeId: 'dj', skinId: 'default' },
    { name: 'Chaos-Master', score: 87000, judgeId: 'blingbeak', skinId: 'maverick' },
    { name: 'Gamer-King', score: 86200, judgeId: 'disco', skinId: 'headband' },
    { name: 'Neon-Knight', score: 85500, judgeId: 'coolman', skinId: 'king' },
    { name: 'Reflex-Ace', score: 85000, judgeId: 'dj', skinId: 'punk' },
    { name: 'Score-Demon', score: 84800, judgeId: 'blingbeak', skinId: 'default' },
    { name: 'Legend-Maker', score: 84700, judgeId: 'disco', skinId: 'galaxy_brain' },
  ]
}

function drawJudgeLineup(state, y) {
  const ctx = state.ctx
  JUDGES.forEach((judge, index) => {
    const x = 74 + index * 132
    drawJudgeImage(ctx, judgeImage(state, judge, state.save.equippedSkins[judge.id]), x - 42, y - 58, 84, 112)
    drawText(ctx, judge.name.split(' ')[0].toUpperCase(), x, y + 70, 11, '#ffffff', 'center', 900)
  })
}

function drawCurrencyBar(state) {
  const ctx = state.ctx
  drawSpritePanel(state, 38, 104, 464, 52, 'footerPurple')
  drawIcon(ctx, state.assets.images.iconCoin, 58, 112, 34)
  drawText(ctx, `${state.save.coins}`, 100, 130, 21, '#fce76d', 'left', 1000)
  drawIcon(ctx, state.assets.images.iconTrophy, 348, 112, 34)
  drawText(ctx, `${state.save.highScore}`, 390, 130, 18, '#ffffff', 'left', 1000)
}

function drawHeader(state, title, subtitle) {
  const ctx = state.ctx
  drawText(ctx, title, LOGICAL_WIDTH / 2, 52, title.length > 18 ? 28 : 34, '#ffffff', 'center', 1000)
  drawText(ctx, subtitle, LOGICAL_WIDTH / 2, 86, 14, '#fce76d', 'center', 900)
}

function drawBackButton(state) {
  drawIconButton(state, 'back', 32, 28, 'iconBack', '')
}

function drawSpriteButton(state, id, x, y, w, h, sprite, label, icon) {
  const ctx = state.ctx
  drawImage(ctx, state.assets.images[sprite], x, y, w, h)
  if (icon) drawIcon(ctx, state.assets.images[icon], x + 22, y + h / 2 - 22, 44)
  drawText(ctx, label, x + w / 2 + (icon ? 18 : 0), y + h / 2, label.length > 18 ? 17 : 22, '#ffffff', 'center', 1000)
  button(state, id, x, y, w, h)
}

function drawIconButton(state, id, x, y, icon, label) {
  const ctx = state.ctx
  drawSpritePanel(state, x, y, 96, 70, 'footerPurple')
  drawIcon(ctx, state.assets.images[icon], x + 25, y + 8, 46)
  if (label) drawText(ctx, label, x + 48, y + 60, 10, '#ffffff', 'center', 900)
  button(state, id, x, y, 96, 70)
}

function drawSpritePanel(state, x, y, w, h, sprite) {
  drawImage(state.ctx, state.assets.images[sprite], x, y, w, h)
}

function drawSmallStat(ctx, x, y, w, h, label, value) {
  ctx.fillStyle = 'rgba(11, 7, 43, 0.72)'
  roundRect(ctx, x, y, w, h, 18)
  ctx.fill()
  drawText(ctx, label, x + w / 2, y + 18, 10, '#b5faff', 'center', 800)
  drawText(ctx, String(value), x + w / 2, y + 40, 19, '#ffffff', 'center', 1000)
}

function drawBackground(state) {
  const image = state.assets.images.background
  const ctx = state.ctx
  if (image.complete && image.naturalWidth > 0) {
    const scale = Math.max(LOGICAL_WIDTH / image.naturalWidth, LOGICAL_HEIGHT / image.naturalHeight)
    const w = image.naturalWidth * scale
    const h = image.naturalHeight * scale
    ctx.drawImage(image, (LOGICAL_WIDTH - w) / 2, (LOGICAL_HEIGHT - h) / 2, w, h)
    return
  }
  const gradient = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT)
  gradient.addColorStop(0, '#170d45')
  gradient.addColorStop(1, '#3d126d')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
}

function drawScrollingConfetti(state) {
  const ctx = state.ctx
  const layers = [
    { image: state.assets.images.confettiLayer1, speed: 24, alpha: 0.26 },
    { image: state.assets.images.confettiLayer2, speed: 38, alpha: 0.32 },
    { image: state.assets.images.confettiLayer3, speed: 56, alpha: 0.38 },
  ]

  for (const layer of layers) {
    const image = layer.image
    if (!image?.complete || image.naturalWidth <= 0) continue

    const scale = LOGICAL_WIDTH / image.naturalWidth
    const w = LOGICAL_WIDTH
    const h = image.naturalHeight * scale
    const offset = (state.time * layer.speed) % h

    ctx.save()
    ctx.globalAlpha = layer.alpha
    for (let y = offset - h; y < LOGICAL_HEIGHT; y += h) {
      ctx.drawImage(image, 0, y, w, h)
    }
    ctx.restore()
  }
}

function drawAmbientConfetti(state) {
  const ctx = state.ctx
  const colors = ['#ff3dad', '#a8fbff', '#fce76d', '#7cff5b']
  for (let i = 0; i < 28; i += 1) {
    const x = (i * 97 + Math.sin(state.time + i) * 8) % LOGICAL_WIDTH
    const y = (state.time * (10 + (i % 4) * 4) + i * 53) % LOGICAL_HEIGHT
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(state.time + i)
    ctx.fillStyle = colors[i % colors.length]
    roundRect(ctx, -4, -2, 8, 4, 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawParticles(state) {
  const ctx = state.ctx
  for (const particle of state.particles) {
    const alpha = 1 - particle.age / particle.life
    ctx.globalAlpha = alpha
    ctx.fillStyle = particle.color
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawToast(state) {
  if (!state.toast || state.toast.until <= state.time) return
  const ctx = state.ctx
  ctx.fillStyle = 'rgba(11, 7, 43, 0.9)'
  roundRect(ctx, 92, 884, 356, 44, 18)
  ctx.fill()
  drawText(ctx, state.toast.text, LOGICAL_WIDTH / 2, 906, 16, '#ffffff', 'center', 900)
}

function drawGlowCircle(ctx, x, y, radius, color, filled) {
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = 20
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  filled ? ctx.fill() : ctx.stroke()
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(255,255,255,0.86)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(x, y, Math.max(4, radius - 5), 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawBar(ctx, x, y, w, h, value, lowColor, highColor) {
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  roundRect(ctx, x, y, w, h, h / 2)
  ctx.fill()
  const gradient = ctx.createLinearGradient(x, y, x + w, y)
  gradient.addColorStop(0, lowColor)
  gradient.addColorStop(1, highColor)
  ctx.fillStyle = gradient
  roundRect(ctx, x, y, Math.max(0, w * value), h, h / 2)
  ctx.fill()
}

function drawJudgeImage(ctx, image, x, y, w, h) {
  ctx.save()
  roundRect(ctx, x, y, w, h, 18)
  ctx.clip()
  if (image.complete && image.naturalWidth > 0) {
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight)
    const iw = image.naturalWidth * scale
    const ih = image.naturalHeight * scale
    ctx.drawImage(image, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih)
  } else {
    ctx.fillStyle = '#24124f'
    ctx.fillRect(x, y, w, h)
  }
  ctx.restore()
}

function judgeImage(state, judge, skinId) {
  return state.assets.judgeImages[judge.id]?.[skinId] || state.assets.judgeImages[judge.id]?.default
}

function drawIcon(ctx, image, x, y, size) {
  drawImage(ctx, image, x, y, size, size)
}

function drawImage(ctx, image, x, y, w, h) {
  if (image?.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, x, y, w, h)
  }
}

function button(state, id, x, y, w, h) {
  state.ui.buttons.push({ id, x, y, w, h })
}

function gradeColor(grade) {
  if (grade === 'S') return '#a8fbff'
  if (grade === 'A') return '#7cff5b'
  if (grade === 'B') return '#fce76d'
  if (grade === 'C') return '#ffb347'
  if (grade === 'FAILED') return '#ff4f9a'
  return '#ff86ce'
}

function stageKindLabel(stage) {
  if (stage.kinds.length > 1) return 'MIXED RHYTHM'
  return stage.kinds[0].toUpperCase()
}

function stageGradeLabel(grade) {
  if (!grade) return '-'
  return grade === 'FAILED' ? 'FAIL' : grade
}

function formatScore(score) {
  return Math.round(score).toLocaleString('en-US')
}

function ftuePrompt(run) {
  if (run.stage.id === 1) {
    return { title: 'SLIDE LESSON', body: 'Press GO, drag along the path, release on END.' }
  }
  if (run.stage.id === 2) {
    return { title: 'HOLD LESSON', body: 'Press, hold while the ring fills, release on time.' }
  }
  if (run.stage.id === 3) {
    return { title: 'MIXED PRESSURE', body: 'Tap, slide, and hold. Misses cost HP.' }
  }
  return { title: 'CHAOS FINALE', body: 'Survive the mix to unlock the full home screen.' }
}

function ftueResultButtonLabel(run) {
  if (!run.completed) return 'TRY AGAIN'
  return run.stage.id >= STAGES[STAGES.length - 1].id ? 'FINISH' : 'NEXT STAGE'
}

function ftueResultLine(run) {
  if (run.stage.id >= STAGES[STAGES.length - 1].id) return 'Tutorial complete. Endless and the full home screen are ready.'
  return `Stage ${run.stage.id + 1} is next.`
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}
