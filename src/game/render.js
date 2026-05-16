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
  gradeRank,
  hitThemeById,
  isEndlessUnlocked,
  isStageUnlocked,
  rankForEndlessScore,
} from './rules.js'
import { pointOnSlider } from './targets.js'

const FIREWORK_FRAME_COUNT = 8
const RESULT_MEDAL_CENTER_FIX = {
  D: -7,
  C: 3,
  B: 9,
  A: -7,
  S: 17,
}

export function drawGame(state) {
  const ctx = state.ctx
  state.ui.buttons = []
  ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  drawBackground(state)

  const shake = runShakeOffset(state)
  if (shake) ctx.save()
  if (shake) ctx.translate(shake.x, shake.y)
  drawScrollingConfetti(state)
  drawFireworks(state)

  if (state.screen === 'home') drawHome(state)
  if (state.screen === 'leaderboard') drawLeaderboard(state)
  if (state.screen === 'stageSelect') drawStageSelect(state)
  if (state.screen === 'shop') drawShop(state)
  if (state.screen === 'settings') drawSettings(state)
  if (state.screen === 'run') drawRun(state)
  if (state.screen === 'results') drawResults(state)
  if (state.screen === 'boostSelect') drawBoostSelect(state)

  if (shake) ctx.restore()
  drawToast(state)
}

function runShakeOffset(state) {
  const run = state.screen === 'run' ? state.run : null
  if (!run?.shakeUntil || state.time >= run.shakeUntil) return null
  const span = Math.max(0.01, run.shakeUntil - (run.shakeStartedAt || state.time))
  const t = clamp((state.time - (run.shakeStartedAt || state.time)) / span, 0, 1)
  const amp = (run.shakeMagnitude || 0) * (1 - t)
  return {
    x: Math.sin(state.time * 120) * amp,
    y: Math.cos(state.time * 96) * amp * 0.65,
  }
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

  if (isEndlessUnlocked(state.save)) {
    drawHomeSpriteMenuButton(state, 'playEndless', 46, 622, 448, 102, {
      sprite: 'buttonPink',
      label: 'PLAY ENDLESS',
      icon: 'iconInfinity',
      labelSize: 36,
      labelColor: '#ff78ff',
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

const HOME_PORTRAIT_RINGS = ['#ff78ff', '#5cff7a', '#7ce8ff', '#ffe24a']

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
  if (title === 'TAP LIKE A STAR') return ['TAP LIKE', 'A STAR']
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
  if (stageId === 1) return { zoom: 1.18, x: 0, y: 4 }
  if (stageId === 2) return { zoom: 1.12, x: 2, y: 8 }
  if (stageId === 3) return { zoom: 1.04, x: 0, y: 10 }
  if (stageId === 4) return { zoom: 1.08, x: 0, y: 6 }
  if (stageId === 5) return { zoom: 1.1, x: 0, y: 14 }
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
  drawLeaderboardHeader(state)

  const rows = leaderboardRows()
  const startY = 168
  const rowH = 52
  const gap = 12
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
  drawLeaderboardPlayerRow(state, playerScore, pr, 842)
}

function drawLeaderboardHeader(state) {
  const ctx = state.ctx
  drawOutlinedText(ctx, 'HALL OF CHAOS', LOGICAL_WIDTH / 2, 108, 40, '#fce76d', '#5e315f', 'center', 1000, 5)
}

function drawShop(state) {
  const ctx = state.ctx
  drawRoundTealBackButton(state, 48, 56, 36)
  drawShopCoinPill(state)
  drawShopMascot(state)

  drawOutlinedText(ctx, 'POWER-UPS', LOGICAL_WIDTH / 2, 274, 34, '#ffffff', '#234b61', 'center', 1000, 4)
  drawPowerUpRow(state, BOOST_PRODUCTS[0], 38, 312, '#ff78ff', 'iconHeart', 'EXTRA LIFE')
  drawPowerUpRow(state, BOOST_PRODUCTS[1], 38, 368, '#fce76d', 'iconCoin', 'DOUBLE COINS BOOST')
  drawPowerUpRow(state, BOOST_PRODUCTS[2], 38, 424, '#a8fbff', 'iconShield', 'COMBO SHIELD')

  drawOutlinedText(ctx, 'COSMETICS', LOGICAL_WIDTH / 2, 516, 34, '#ffffff', '#234b61', 'center', 1000, 4)
  drawShopCosmeticCard(state, shopSkinItem(state, 'blingbeak', 'partyhat', '#5cff7b'), 44, 550)
  drawShopCosmeticCard(state, shopSkinItem(state, 'disco', 'headband', '#a8fbff'), 282, 550)
  drawShopCosmeticCard(state, shopSkinItem(state, 'coolman', 'king', '#a8fbff'), 44, 728)
  drawShopCosmeticCard(state, shopSkinItem(state, 'dj', 'punk', '#fce76d'), 282, 728)
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

function drawShopMascot(state) {
  const ctx = state.ctx
  const image = state.assets.images.shopMan
  if (!image?.complete || image.naturalWidth <= 0) return
  const w = 148
  const h = (image.naturalHeight / image.naturalWidth) * w
  drawImage(ctx, image, LOGICAL_WIDTH / 2 - w / 2, 106, w, h)
}

function drawShopCoinPill(state) {
  const ctx = state.ctx
  const text = formatScore(state.save.coins)
  ctx.save()
  ctx.font = '1000 27px Fredoka, system-ui, Segoe UI, sans-serif'
  const pillW = Math.max(142, ctx.measureText(text).width + 68)
  const x = LOGICAL_WIDTH - pillW - 24
  const y = 32
  ctx.fillStyle = 'rgba(40, 12, 48, 0.82)'
  roundRect(ctx, x, y, pillW, 48, 24)
  ctx.fill()
  ctx.strokeStyle = '#ff78ff'
  ctx.lineWidth = 3
  roundRect(ctx, x, y, pillW, 48, 24)
  ctx.stroke()
  ctx.restore()
  drawIcon(ctx, state.assets.images.iconCoin, x + 13, y + 8, 32)
  drawOutlinedText(ctx, text, x + 54, y + 24, 27, '#fce76d', '#5e315f', 'left', 1000, 3)
}

function drawPowerUpRow(state, product, x, y, color, icon, label) {
  const ctx = state.ctx
  const w = 464
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
  drawOutlinedText(ctx, `${product.price} coins`, x + w - 18, y + h / 2, 20, '#ffe8ff', '#4a123c', 'right', 1000, 3)
  button(state, `boost:${product.id}`, x, y, w, h)
}

function drawShopCosmeticCard(state, item, x, y) {
  const ctx = state.ctx
  const w = 214
  const h = 158
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
    const scale = Math.min(boxW / item.image.naturalWidth, boxH / item.image.naturalHeight) * 1.22
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
  drawSettingsToggleRow(state, 'toggleMusic', 78, 416, 'iconMusic', 'MUSIC', state.save.settings.music)
  drawSettingsToggleRow(state, 'toggleSfx', 78, 500, 'iconVolume', 'SFX', state.save.settings.sfx)

  drawOutlinedText(ctx, 'SAVED AUTOMATICALLY', LOGICAL_WIDTH / 2, 700, 20, '#a8fbff', '#234b61', 'center', 1000, 3)
  drawText(ctx, 'Changes apply right away on this device.', LOGICAL_WIDTH / 2, 732, 15, '#d9fbff', 'center', 800)
}

function drawSettingsToggleRow(state, id, x, y, icon, label, enabled) {
  const ctx = state.ctx
  const w = 384
  const h = 62
  const border = enabled ? '#a8fbff' : '#ff78ff'
  const valueColor = enabled ? '#5cff7b' : '#ff9ee8'

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
  run.resultsShownAt ??= state.time

  drawResultsSpotlights(state)
  const cx = LOGICAL_WIDTH / 2

  const headline = run.completed ? 'RUN COMPLETE' : 'ELIMINATED'
  const headBorder = run.completed ? '#a8fbff' : '#ff4f8a'

  let nextY
  if (run.completed && run.grade && run.grade !== 'FAILED') {
    drawResultsMedalSprite(state, cx, 210, run.grade)
    nextY = 384
  } else {
    drawText(ctx, run.lastMissCause, cx, 176, 19, '#ffc8e8', 'center', 900)
    drawOutlinedText(ctx, run.grade, cx, 242, 76, gradeColor(run.grade), '#421139', 'center', 1000, 5)
    nextY = 318
  }
  drawResultsTitlePill(state, cx, 42, headline, headBorder)

  const cyan = '#a8fbff'
  const gold = '#ffcc00'
  const reveal = resultsRevealProgress(state, run)
  const combo = Math.max(1, run.bestCombo || 0)
  const accPct = Math.round((run.accuracy || 0) * 100)
  const perfects = run.hitCounts?.perfect ?? 0

  nextY = drawResultsStatPill(state, nextY, cyan, 'FINAL SCORE', formatScore(animatedInt(run.score, reveal)))
  nextY = drawResultsStatPill(state, nextY, cyan, 'BEST COMBO', `x${animatedInt(combo, reveal)}`)
  nextY = drawResultsStatPill(state, nextY, cyan, 'ACCURACY', `${animatedInt(accPct, reveal)}%`)
  nextY = drawResultsStatPill(state, nextY, cyan, 'PERFECT HITS', String(animatedInt(perfects, reveal)))
  nextY = drawResultsCoinReward(state, nextY + 16, gold, animatedInt(run.coinsEarned || 0, reveal))

  const retry = resultsRetryAction(run)
  if (run.ftue) {
    if (run.completed) {
      drawSpriteButton(state, 'tryAgain', 86, 738, 368, 94, retry.sprite, retry.label, retry.icon)
      drawSpriteButton(state, 'ftueContinue', 150, 850, 240, 62, 'buttonCyan', ftueResultButtonLabel(run), null)
      return
    }
    drawSpriteButton(state, 'ftueContinue', 86, 674, 368, 94, 'buttonPink', ftueResultButtonLabel(run), null)
    drawSpriteButton(state, 'resultsHome', 150, 790, 240, 62, 'buttonCyan', 'MENU', null)
    drawText(ctx, 'Try again now or come back from the menu.', cx, 852, 15, '#d9fbff', 'center', 800)
    return
  }

  const buttonY = run.completed ? 728 : 674
  drawSpriteButton(state, 'tryAgain', 86, buttonY, 368, 94, retry.sprite, retry.label, retry.icon)
  drawSpriteButton(state, 'resultsHome', 150, buttonY + 112, 240, 62, 'buttonCyan', 'MENU', null)
}

function resultsRevealProgress(state, run) {
  const startedAt = run.resultsShownAt ?? state.time
  const t = clamp((state.time - startedAt) / 0.95, 0, 1)
  return 1 - Math.pow(1 - t, 3)
}

function animatedInt(value, progress) {
  return Math.round(Math.max(0, value || 0) * progress)
}

function resultsRetryAction(run) {
  if (run.mode === 'stage' && run.completed && gradeRank(run.grade) >= gradeRank('B')) return { label: 'NEXT STAGE', icon: null, sprite: 'buttonCyan' }
  if (run.mode === 'endless') return { label: 'TRY AGAIN', icon: null, sprite: 'buttonPink' }
  return { label: 'RETRY STAGE', icon: null, sprite: 'buttonPink' }
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
  const h = 56
  ctx.save()
  ctx.font = '900 30px Fredoka, system-ui, sans-serif'
  const w2 = Math.min(430, ctx.measureText(text).width + 92)
  const x2 = cx - w2 / 2
  ctx.shadowBlur = 0
  ctx.fillStyle = '#080b2d'
  roundRect(ctx, x2, y, w2, h, 20)
  ctx.fill()
  ctx.strokeStyle = border
  ctx.lineWidth = 3
  roundRect(ctx, x2, y, w2, h, 20)
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()
  drawOutlinedText(ctx, text, cx, y + h / 2, 30, border, '#234b61', 'center', 1000, 4)
}

function drawResultsMedalSprite(state, cx, cy, grade) {
  const ctx = state.ctx
  const image = state.assets.images.medalsSheet
  const order = ['D', 'C', 'B', 'A', 'S']
  const index = order.indexOf(String(grade).toUpperCase())
  if (index < 0) return

  const time = state.time
  const scale = 1 + Math.sin(time * 3.2) * 0.025

  ctx.save()
  ctx.translate(cx, cy)

  if (image?.complete && image.naturalWidth > 0) {
    const cellW = image.naturalWidth / 5
    const trimX = cellW * 0.07
    const trimY = image.naturalHeight * 0.08
    const sourceX = index * cellW + trimX
    const sourceY = trimY
    const sourceW = cellW - trimX * 2
    const sourceH = image.naturalHeight - trimY * 1.75
    const baseW = grade === 'S' ? 252 : grade === 'A' ? 244 : 232
    const drawW = baseW * scale
    const drawH = drawW * (sourceH / sourceW)
    const centerFix = (RESULT_MEDAL_CENTER_FIX[String(grade).toUpperCase()] || 0) * (drawW / sourceW)
    ctx.globalCompositeOperation = 'screen'
    ctx.drawImage(image, sourceX, sourceY, sourceW, sourceH, -drawW / 2 + centerFix, -drawH / 2, drawW, drawH)
  } else {
    drawOutlinedText(ctx, String(grade).toUpperCase(), 0, 0, 92, gradeColor(grade), '#421139', 'center', 1000, 5)
  }
  ctx.restore()
}

function drawResultsStatPill(state, y, border, label, value, iconKey = null) {
  const ctx = state.ctx
  const x = 92
  const w = 356
  const h = 48
  ctx.save()
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(10, 12, 40, 0.88)'
  roundRect(ctx, x, y, w, h, 21)
  ctx.fill()
  ctx.strokeStyle = border
  ctx.lineWidth = 3
  roundRect(ctx, x, y, w, h, 21)
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()
  const mid = y + h / 2
  const labelX = iconKey ? x + 58 : x + 22
  if (iconKey) {
    drawIcon(ctx, state.assets.images[iconKey], x + 18, mid - 15, 30)
  }
  drawOutlinedText(ctx, label, labelX, mid, 19, border, '#181238', 'left', 1000, 3)
  drawOutlinedText(ctx, value, x + w - 22, mid, String(value).length > 12 ? 20 : 25, border, '#181238', 'right', 1000, 3)
  return y + h + 12
}

function drawResultsCoinReward(state, y, border, coins) {
  const ctx = state.ctx
  const text = `+${coins} COINS`
  const w = 286
  const h = 58
  const x = (LOGICAL_WIDTH - w) / 2
  ctx.save()
  ctx.fillStyle = 'rgba(48, 28, 10, 0.9)'
  roundRect(ctx, x, y, w, h, 24)
  ctx.fill()
  ctx.strokeStyle = border
  ctx.lineWidth = 4
  roundRect(ctx, x, y, w, h, 24)
  ctx.stroke()
  ctx.restore()
  drawIcon(ctx, state.assets.images.iconCoin, x + 30, y + 13, 34)
  drawOutlinedText(ctx, text, x + 76, y + h / 2, 31, '#fce76d', '#5e315f', 'left', 1000, 4)
  return y + h + 10
}

function drawRun(state) {
  const ctx = state.ctx
  const run = state.run
  if (!run) return

  const hitTheme = hitThemeById()

  drawRunHud(state)
  if (run.ftue && run.stage?.id !== 1) drawFtueRunPrompt(state, run)

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
      else if (target.removeAt) drawVanishingTarget(ctx, target, hitTheme, state.time)
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
      (n) => cap.startsWith(`COMBO ${n}`) || cap.startsWith(`${n} -`),
    )
    const size = isMilestone ? 52 : 48
    drawText(ctx, cap, LOGICAL_WIDTH / 2, 224, size, isNeg ? '#ff66bf' : '#fce76d', 'center', 1000)
  }

  if (run.status === 'finished') {
    ctx.fillStyle = freeze ? 'rgba(12, 5, 38, 0.42)' : 'rgba(12, 5, 38, 0.58)'
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    drawText(ctx, run.completed ? 'STAGE CLEAR' : 'ELIMINATED', LOGICAL_WIDTH / 2, 456, 54, run.completed ? '#a8fbff' : '#ff66bf', 'center', 1000)
    drawText(ctx, run.lastMissCause, LOGICAL_WIDTH / 2, 220, 22, '#ffffff', 'center', 900)
  }

  if (run.status === 'continueOffer') {
    const left = Math.max(0, run.continueOfferUntil - state.time)
    drawSpritePanel(state, 36, 252, 468, 470, 'panelCyan')
    drawOutlinedText(ctx, 'CONTINUE?', LOGICAL_WIDTH / 2, 332, 36, '#ffffff', '#234b61', 'center', 1000, 4)
    drawText(ctx, `${CONTINUE_COST} COINS - 50% HP`, LOGICAL_WIDTH / 2, 382, 19, '#d9fbff', 'center', 900)
    drawOutlinedText(ctx, `${Math.ceil(left)}s`, LOGICAL_WIDTH / 2, 442, 50, '#fce76d', '#5e315f', 'center', 1000, 5)
    drawSpriteButton(state, 'continueBuy', 68, 520, 404, 84, 'buttonGold', 'CONTINUE', 'iconCoin')
    drawSpriteButton(state, 'continueDecline', 68, 624, 404, 78, 'buttonPink', 'GIVE UP', null)
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

  drawOutlinedText(ctx, formatScore(run.score), 118, 50, 48, '#ffffff', '#5e315f', 'left', 1000, 5)

  drawOutlinedText(ctx, `${run.combo}x`, LOGICAL_WIDTH / 2, 870, 44, '#a8fbff', '#234b61', 'center', 1000, 4)
  drawIcon(ctx, state.assets.images.iconHeart, 132, 912, 36)
  drawBar(ctx, 178, 922, 230, 22, run.hp / MAX_HP, '#ff66bf', '#a8fbff')

  let hx = LOGICAL_WIDTH / 2 - 28
  if (run.thisRunDoubleCoins) {
    drawIcon(ctx, state.assets.images.iconCoin, hx, 902, 24)
    hx += 30
  }
  if (run.thisRunComboShield) {
    drawIcon(ctx, state.assets.images.iconShield, hx, 902, 24)
  }
}

function drawRunJudgeCorners(state, run) {
  const spots = [
    { x: 58, y: 58 },
    { x: LOGICAL_WIDTH - 58, y: 58 },
    { x: 58, y: LOGICAL_HEIGHT - 56 },
    { x: LOGICAL_WIDTH - 58, y: LOGICAL_HEIGHT - 56 },
  ]

  JUDGES.forEach((judge, index) => {
    const skinId = state.save.equippedSkins[judge.id] || 'default'
    const active = index === run.activeJudgeIndex
    const spot = spots[index]
    drawRunJudgePortrait(state, judge, skinId, spot.x, spot.y, active ? 106 : 92, active)
  })
}

function drawRunJudgePortrait(state, judge, skinId, cx, cy, size, active) {
  const ctx = state.ctx
  const image = judgeImage(state, judge, skinId)
  ctx.save()
  ctx.globalAlpha = active ? 1 : 0.48
  ctx.filter = active ? 'none' : 'grayscale(0.85) saturate(0.55)'
  ctx.shadowColor = active ? judge.color : 'transparent'
  ctx.shadowBlur = active ? 16 : 0
  if (image?.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, cx - size / 2, cy - size / 2, size, size)
  }
  ctx.restore()
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

function drawVanishingTarget(ctx, target, theme, time) {
  const duration = Math.max(0.01, (target.removeAt || time) - (target.vanishStartedAt || time))
  const t = clamp((time - (target.vanishStartedAt || time)) / duration, 0, 1)
  const scale = Math.max(0.04, 1 - t)
  ctx.save()
  ctx.globalAlpha = 1 - t
  ctx.translate(target.x, target.y)
  ctx.scale(scale, scale)
  ctx.translate(-target.x, -target.y)
  drawTarget(ctx, target, theme)
  ctx.restore()
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
  drawSlideArrow(ctx, target, s.end)
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

function drawSlideArrow(ctx, target, color) {
  const mid = pointOnSlider(target, 0.62)
  const ahead = pointOnSlider(target, 0.7)
  const angle = Math.atan2(ahead.y - mid.y, ahead.x - mid.x)
  ctx.save()
  ctx.translate(mid.x, mid.y)
  ctx.rotate(angle)
  ctx.fillStyle = color
  ctx.strokeStyle = 'rgba(60, 28, 18, 0.7)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(22, 0)
  ctx.lineTo(-10, -16)
  ctx.lineTo(-3, 0)
  ctx.lineTo(-10, 16)
  ctx.closePath()
  ctx.stroke()
  ctx.fill()
  ctx.restore()
}

function drawFailSnapshot(ctx, snap) {
  if (!snap) return
  const theme = hitThemeById()
  drawTarget(ctx, snap, theme)
}

function drawSliderPath(ctx, target) {
  ctx.beginPath()
  ctx.moveTo(target.x, target.y)
  ctx.quadraticCurveTo(target.controlX, target.controlY, target.endX, target.endY)
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
  drawOutlinedText(ctx, formatScore(row.score), 436, midY, 23, index < 3 ? '#ff9ee8' : '#fce76d', '#24124f', 'right', 1000, 3)
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
  ctx.strokeStyle = '#ff5bd6'
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.shadowBlur = 0
  drawOutlinedText(ctx, `YOU - #${rank}`, 68, midY, 30, '#ffe8ff', '#4a123c', 'left', 1000, 4)
  drawOutlinedText(ctx, formatScore(score), 438, midY, 25, '#ffe8ff', '#4a123c', 'right', 1000, 3)
  drawLeaderboardPortrait(state, row, 482, midY, '#ff5bd6', 25)
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

function drawSpriteButton(state, id, x, y, w, h, sprite, label, icon) {
  const ctx = state.ctx
  drawImage(ctx, state.assets.images[sprite], x, y, w, h)
  if (icon) drawIcon(ctx, state.assets.images[icon], x + 22, y + h / 2 - 22, 44)
  drawOutlinedText(ctx, label, x + w / 2 + (icon ? 18 : 0), y + h / 2, label.length > 18 ? 20 : 27, spriteButtonTextColor(sprite), '#2d1648', 'center', 1000, 3)
  button(state, id, x, y, w, h)
}

function spriteButtonTextColor(sprite) {
  if (sprite === 'buttonGold') return '#fce76d'
  if (sprite === 'buttonPink') return '#ff78ff'
  if (sprite === 'buttonCyan') return '#a8fbff'
  return '#ffffff'
}

function drawSpritePanel(state, x, y, w, h, sprite) {
  drawImage(state.ctx, state.assets.images[sprite], x, y, w, h)
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
  const combo = state.screen === 'run' ? state.run?.combo || 0 : 0
  const comboBoost = Math.min(1, combo / 100)
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
    ctx.globalAlpha = Math.min(0.7, layer.alpha + comboBoost * 0.22)
    for (let y = offset - h; y < LOGICAL_HEIGHT; y += h) {
      ctx.drawImage(image, 0, y, w, h)
    }
    ctx.restore()
  }
}

function drawFireworks(state) {
  const fireworks = state.fireworks || []
  if (!fireworks.length) return

  const image = state.assets.images.fireworkSheet
  if (!image?.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) return

  const ctx = state.ctx
  const frameW = image.naturalWidth / FIREWORK_FRAME_COUNT
  const frameH = image.naturalHeight

  for (const firework of fireworks) {
    const life = Math.max(0.01, firework.life || 0.75)
    const progress = clamp(firework.age / life, 0, 0.999)
    const frame = Math.min(FIREWORK_FRAME_COUNT - 1, Math.floor(progress * FIREWORK_FRAME_COUNT))
    const fade = progress > 0.74 ? 1 - (progress - 0.74) / 0.26 : 1
    const size = firework.size || 150
    const drawW = size
    const drawH = size * (frameH / frameW)

    ctx.save()
    ctx.globalAlpha = (firework.alpha ?? 1) * clamp(fade, 0, 1)
    ctx.globalCompositeOperation = 'screen'
    ctx.drawImage(
      image,
      frame * frameW,
      0,
      frameW,
      frameH,
      firework.x - drawW / 2,
      firework.y - drawH / 2,
      drawW,
      drawH,
    )
    ctx.restore()
  }
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
  if (grade === 'FAILED') return '#ff66bf'
  return '#ff9ee8'
}

function formatScore(score) {
  return Math.round(score).toLocaleString('en-US')
}

function ftuePrompt(run) {
  if (run.stage.id === 1) {
    return { title: 'TAP LESSON', body: 'Tap when the outer ring meets the target.' }
  }
  if (run.stage.id === 2) {
    return { title: 'SLIDE LESSON', body: 'Press GO, drag along the path, release on END.' }
  }
  if (run.stage.id === 3) {
    return { title: 'HOLD LESSON', body: 'Press, hold while the ring fills, release on time.' }
  }
  if (run.stage.id === 4) {
    return { title: 'MIXED PRESSURE', body: 'Tap, slide, and hold. Misses cost HP.' }
  }
  return { title: 'CHAOS FINALE', body: 'Survive the mix to unlock the full home screen.' }
}

function ftueResultButtonLabel(run) {
  if (!run.completed) return 'TRY AGAIN'
  return 'MENU'
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
