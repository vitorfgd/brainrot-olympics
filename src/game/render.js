import {
  BOOST_PRODUCTS,
  COMBO_MILESTONE_AT,
  CONTINUE_COST,
  JUDGES,
  JUDGE_CORNER_SPOTS,
  JUDGE_PORTRAIT_SIZE,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  MAX_HP,
  STAGES,
  clamp,
  gradeRank,
  hitThemeById,
  isEndlessUnlocked,
  isStageUnlocked,
} from './rules.js'
import { pointOnSlider } from './targets.js'
import { HOME_LAYOUT, RESULTS_LAYOUT, RUN_HUD_LAYOUT } from './layout.js'

const HOT_PINK = '#ff4ff0'
const TOUCH_DEVICE = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
const SOFT_PINK = '#ff8af5'
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
  if (state.drawnScreen !== state.screen) {
    const from = state.drawnScreen
    if (from === 'run' || state.screen === 'run') {
      state.screenTransition = {
        from,
        to: state.screen,
        startedAt: state.time,
        completed: Boolean(state.run?.completed),
      }
    } else {
      state.screenTransition = null
    }
    state.drawnScreen = state.screen
    state.screenEnteredAt = state.time
  }
  drawBackground(state)

  const shake = runShakeOffset(state)
  if (shake) ctx.save()
  if (shake) ctx.translate(shake.x, shake.y)
  if (!shouldSkipRunConfetti(state)) drawScrollingConfetti(state)

  if (state.screen === 'home') drawHome(state)
  if (state.screen === 'leaderboard') drawLeaderboard(state)
  if (state.screen === 'stageSelect') drawStageSelect(state)
  if (state.screen === 'shop') drawShop(state)
  if (state.screen === 'settings') drawSettings(state)
  if (state.screen === 'run') drawRun(state)
  if (state.screen === 'results') drawResults(state)
  if (state.screen === 'boostSelect') drawBoostSelect(state)

  if (shake) ctx.restore()
  drawScreenTransition(state)
  drawToast(state)
}

function drawScreenTransition(state) {
  const transition = state.screenTransition
  if (!transition) return
  const ctx = state.ctx
  const enteringRun = transition.to === 'run'
  const leavingRun = transition.from === 'run'
  const duration = enteringRun ? 0.56 : 0.62
  const p = clamp((state.time - transition.startedAt) / duration, 0, 1)
  if (p >= 1) {
    state.screenTransition = null
    return
  }

  ctx.save()
  if (enteringRun) {
    const fade = 1 - p
    ctx.fillStyle = `rgba(4, 2, 22, ${0.82 * fade})`
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  } else if (leavingRun) {
    const fail = !transition.completed
    const color = fail ? '255, 79, 240' : '168, 251, 255'
    const gold = transition.completed ? '252, 231, 109' : '255, 79, 240'
    const flash = Math.max(0, 1 - p * 1.8)
    ctx.fillStyle = `rgba(${color}, ${0.34 * flash})`
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)

    const wipe = easeOutCubic(p)
    const bandH = 180 * (1 - p)
    ctx.fillStyle = `rgba(${gold}, ${0.22 * (1 - p)})`
    ctx.fillRect(0, LOGICAL_HEIGHT * wipe - bandH / 2, LOGICAL_WIDTH, bandH)
  }
  ctx.restore()
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

const CAPTION_MAX_WIDTH = 468

export function drawText(ctx, text, x, y, size, color = '#fff', align = 'center', weight = 800) {
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.font = `${weight} ${size}px Bungee, system-ui, Segoe UI, sans-serif`
  ctx.fillText(text, x, y)
}

function measureDisplayFont(ctx, size, weight) {
  ctx.font = `${weight} ${size}px Bungee, system-ui, Segoe UI, sans-serif`
}

function wrapDisplayLines(ctx, text, maxWidth, size, weight = 1000, maxLines = 2) {
  measureDisplayFont(ctx, size, weight)
  const lines = []
  for (const paragraph of String(text).split('\n')) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (!words.length) continue
    let current = words[0]
    for (let i = 1; i < words.length; i += 1) {
      const trial = `${current} ${words[i]}`
      if (ctx.measureText(trial).width <= maxWidth) current = trial
      else {
        lines.push(current)
        current = words[i]
        if (lines.length >= maxLines) return lines.slice(0, maxLines)
      }
    }
    lines.push(current)
    if (lines.length >= maxLines) return lines.slice(0, maxLines)
  }
  return lines.slice(0, maxLines)
}

function drawTextBlock(ctx, text, x, y, size, color, align, weight, maxWidth, maxLines = 2) {
  const lines = wrapDisplayLines(ctx, text, maxWidth, size, weight, maxLines)
  const lineHeight = size * 1.1
  const startY = y - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((line, index) => {
    drawText(ctx, line, x, startY + index * lineHeight, size, color, align, weight)
  })
  return lines.length
}

function bungeeVisualCenterY(ctx, anchorY, size, weight = 1000, sample = '0') {
  ctx.font = `${weight} ${size}px Bungee, system-ui, Segoe UI, sans-serif`
  const metrics = ctx.measureText(sample)
  const ascent = metrics.actualBoundingBoxAscent ?? size * 0.82
  const descent = metrics.actualBoundingBoxDescent ?? size * 0.2
  const height = ascent + descent
  return anchorY + (ascent - height / 2)
}

function drawOutlinedText(ctx, text, x, y, size, color, strokeColor, align = 'center', weight = 900, strokeWidth = 3) {
  const visualY = bungeeVisualCenterY(ctx, y, size, weight, text)
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.font = `${weight} ${size}px Bungee, system-ui, Segoe UI, sans-serif`
  ctx.lineJoin = 'round'
  ctx.lineWidth = strokeWidth
  ctx.strokeStyle = strokeColor
  ctx.strokeText(text, x, visualY)
  ctx.fillStyle = color
  ctx.fillText(text, x, visualY)
}

function drawHome(state) {
  const ctx = state.ctx
  drawHomeJudgePortraits(state)
  drawHomeTopStats(state)
  drawHomeHeroTitle(state)

  const endless = HOME_LAYOUT.endlessButton
  if (isEndlessUnlocked(state.save)) {
    drawHomeSpriteMenuButton(state, 'playEndless', endless.x, endless.y, endless.w, endless.h, {
      sprite: 'buttonPink',
      label: 'PLAY ENDLESS',
      icon: 'iconInfinity',
      labelSize: 36,
      labelColor: HOT_PINK,
    })
  } else {
    drawHomeSpriteMenuButton(state, 'playEndlessLocked', endless.x, endless.y, endless.w, endless.h, {
      sprite: 'buttonPink',
      label: 'PLAY ENDLESS',
      icon: 'iconLock',
      labelSize: 36,
      labelColor: '#b968a8',
    })
  }

  const stagesDone = stagesClearedCount(state.save)
  const levels = HOME_LAYOUT.levelsButton
  drawHomeSpriteMenuButton(state, 'stageSelect', levels.x, levels.y, levels.w, levels.h, {
    sprite: 'buttonCyan',
    label: 'LEVELS',
    badge: `${stagesDone}/${STAGES.length}`,
    labelSize: 33,
    labelColor: '#a8fbff',
    textYOffset: 2,
  })

  const footer = HOME_LAYOUT.footerButtons
  drawCircleIconButton(state, 'leaderboard', footer.leaderboard.cx, footer.leaderboard.cy, footer.leaderboard.r, 'iconTrophy', '#a8fbff')
  drawCircleIconButton(state, 'shop', footer.shop.cx, footer.shop.cy, footer.shop.r, 'iconShop', '#ffe24a', 72)
  drawCircleIconButton(state, 'settings', footer.settings.cx, footer.settings.cy, footer.settings.r, 'iconSettings', '#a994c8')
}

function stagesClearedCount(save) {
  return STAGES.filter((s) => {
    const g = save.stageBests[s.id]?.grade
    return g && g !== 'FAILED'
  }).length
}

const HOME_PORTRAIT_RINGS = [HOT_PINK, '#5cff7a', '#7ce8ff', '#ffe24a']

function drawHomeJudgePortraits(state) {
  const spots = [
    { x: 48, y: 56, r: 48, scale: 1.28, yOff: 8 },
    { x: 134, y: 64, r: 48, scale: 1.3, yOff: 7 },
    { x: 406, y: 64, r: 48, scale: 1.22, yOff: 3 },
    { x: 492, y: 56, r: 48, scale: 1.24, yOff: 4 },
  ]
  JUDGES.forEach((judge, i) => {
    const p = spots[i]
    const img = equippedJudgeImage(state, judge)
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
  ctx.font = '1000 38px Bungee, system-ui, Segoe UI, sans-serif'
  const coinW = ctx.measureText(coinText).width
  const iconSize = 36
  const gap = 12
  const groupX = LOGICAL_WIDTH / 2 - (coinW + gap + iconSize) / 2
  drawOutlinedText(ctx, coinText, groupX + coinW / 2, 238, 38, '#fce76d', '#5e315f', 'center', 1000, 4)
  drawIcon(ctx, state.assets.images.iconCoin, groupX + coinW + gap, 220, iconSize)
}

function drawHomeScoreLine(ctx, score, cx, y) {
  ctx.font = '1000 34px Bungee, system-ui, Segoe UI, sans-serif'
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
  const bob = Math.sin(state.time * 1.8) * 4
  if (image?.complete && image.naturalWidth > 0) {
    const sourceY = image.naturalHeight * 0.18
    const sourceH = image.naturalHeight * 0.62
    ctx.drawImage(image, 0, sourceY, image.naturalWidth, sourceH, 34, 316 + bob, 472, 260)
    return
  }
  drawStackedGameTitle(ctx, 'BRAINROT', LOGICAL_WIDTH / 2, 370 + bob, 46)
  drawStackedGameTitle(ctx, 'OLYMPICS', LOGICAL_WIDTH / 2, 434 + bob, 46)
}

function drawStackedGameTitle(ctx, text, x, y, size) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const font = `700 ${size}px Bungee, system-ui, sans-serif`
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
    drawIconFit(ctx, state.assets.images[icon], x + 26, y + h / 2 - 24, 54, 48)
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

function drawCircleIconButton(state, id, cx, cy, r, iconKey, ringColor, iconSize = 44) {
  const ctx = state.ctx
  const scale = pressScale(state, cx - r, cy - r, r * 2, r * 2, 0.9)
  const half = iconSize / 2
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(scale, scale)
  ctx.translate(-cx, -cy)
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(18, 18, 48, 0.88)'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = ringColor
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.shadowBlur = 0
  drawIcon(ctx, state.assets.images[iconKey], cx - half, cy - half, iconSize)
  ctx.restore()
  button(state, id, cx - r, cy - r, r * 2, r * 2)
}

function drawStageSelect(state) {
  const ctx = state.ctx
  drawStageSelectSpotlights(state)
  drawRoundTealBackButton(state, 48, 56, 36)
  drawOutlinedText(ctx, 'LEVELS', LOGICAL_WIDTH / 2, 56, 38, '#fce76d', '#5e315f', 'center', 1000, 4)

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

  const medalX = x + w - 116
  const medalY = y + h / 2 + 6
  if (unlocked && grade && grade !== 'FAILED') {
    drawStageGradeMedal(state, medalX, medalY, grade, 66)
  }

  const triCx = x + w - 52
  const triCy = y + h / 2
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
    ctx.drawImage(image, sourceX, sourceY, sourceW, sourceH, cx - drawW / 2, cy - drawH / 2, drawW, drawH)
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
  const renderer = state.gameRenderer
  if (renderer) renderer.drawRect('rgba(5, 4, 28, 0.22)', 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  else {
    ctx.fillStyle = 'rgba(5, 4, 28, 0.22)'
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  }
  drawRoundTealBackButton(state, 48, 56, 36)
  drawOutlinedText(ctx, 'LEADERBOARD', LOGICAL_WIDTH / 2, 68, 34, '#fce76d', '#5e315f', 'center', 1000, 4)

  const rows = leaderboardRows()
  const startY = 154
  const rowH = 60
  const gap = 14
  const playerH = 82
  const playerScore = Math.max(state.save.highScore, 84600)
  const displayRows = leaderboardDisplayRows(rows, playerScore)
  let y = startY
  for (let index = 0; index < displayRows.length; index += 1) {
    const entry = displayRows[index]
    if (entry.player) {
      drawLeaderboardPlayerRow(state, entry.score, entry.rank, y, playerH, index)
      y += playerH + gap
    } else {
      drawLeaderboardRow(state, entry.row, entry.rank, index, y, rowH)
      y += rowH + gap
    }
  }
}

function drawShop(state) {
  const ctx = state.ctx
  drawRoundTealBackButton(state, 48, 56, 36)
  drawShopCoinPill(state)
  drawShopMascot(state)

  drawOutlinedText(ctx, 'POWER-UPS', LOGICAL_WIDTH / 2, 320, 34, '#ffffff', '#234b61', 'center', 1000, 4)
  drawPowerUpRow(state, BOOST_PRODUCTS[0], 38, 358, HOT_PINK, 'iconHeart', 'EXTRA LIFE')
  drawPowerUpRow(state, BOOST_PRODUCTS[1], 38, 414, '#fce76d', 'iconCoin', 'DOUBLE COINS')
  drawPowerUpRow(state, BOOST_PRODUCTS[2], 38, 470, '#a8fbff', 'iconShield', 'COMBO SHIELD')

  drawOutlinedText(ctx, 'COSMETICS', LOGICAL_WIDTH / 2, 560, 34, '#ffffff', '#234b61', 'center', 1000, 4)
  drawShopCosmeticCard(state, shopSkinItem(state, 'blingbeak', 'partyhat', '#5cff7b'), 44, 594)
  drawShopCosmeticCard(state, shopSkinItem(state, 'disco', 'disco', '#a8fbff'), 282, 594)
  drawShopCosmeticCard(state, shopSkinItem(state, 'coolman', 'king', '#a8fbff'), 44, 772)
  drawShopCosmeticCard(state, shopSkinItem(state, 'dj', 'punk', '#fce76d'), 282, 772)
}

function shopSkinItem(state, judgeId, skinId, color) {
  const judge = JUDGES.find((item) => item.id === judgeId)
  const skin = judge?.skins.find((item) => item.id === skinId)
  const owned = state.save.ownedSkins[judgeId]?.includes(skinId)
  const equipped = state.save.equippedSkins[judgeId] === skinId
  return {
    id: `skin:${judgeId}:${skinId}`,
    image: state.assets.judgeImages[judgeId]?.[skinId],
    price: skin?.price || 0,
    name: skin?.name || 'Skin',
    owned,
    equipped,
    color,
  }
}

function drawShopMascot(state) {
  const ctx = state.ctx
  const image = state.assets.images.shopMan
  if (!image?.complete || image.naturalWidth <= 0) return
  const w = 272
  const h = (image.naturalHeight / image.naturalWidth) * w
  const x = LOGICAL_WIDTH / 2 - w / 2 - 42
  const y = 28
  drawImage(ctx, image, x, y, w, h)
  drawShopSpeechBubble(state, x, y, w, h)
}

function drawShopSpeechBubble(state, manX, manY, manW, manH) {
  const ctx = state.ctx
  const image = state.assets.images.shopSpeechBubble
  if (!image?.complete || image.naturalWidth <= 0) return

  const bubbleW = 318
  const bubbleH = (image.naturalHeight / image.naturalWidth) * bubbleW
  const bubbleX = manX + manW * 0.28
  const bubbleY = manY + manH * 0.3

  ctx.drawImage(image, bubbleX, bubbleY, bubbleW, bubbleH)

  const bodyTop = bubbleY + bubbleH * 0.2
  const bodyBottom = bubbleY + bubbleH * 0.82
  const textX = bubbleX + bubbleW * 0.5
  const centerY = (bodyTop + bodyBottom) / 2
  const lineGap = 32
  drawOutlinedText(ctx, 'WELCOME TO', textX, centerY - lineGap / 2, 26, '#171236', '#ffffff', 'center', 1000, 3)
  drawOutlinedText(ctx, 'SHOP', textX, centerY + lineGap / 2, 32, '#171236', '#ffffff', 'center', 1000, 3)
}

function drawShopCoinPill(state) {
  const ctx = state.ctx
  const text = formatScore(state.save.coins)
  ctx.save()
  ctx.font = '1000 27px Bungee, system-ui, Segoe UI, sans-serif'
  const pillW = Math.max(142, ctx.measureText(text).width + 68)
  const x = LOGICAL_WIDTH - pillW - 24
  const y = 32
  ctx.fillStyle = 'rgba(40, 12, 48, 0.82)'
  roundRect(ctx, x, y, pillW, 48, 24)
  ctx.fill()
  ctx.strokeStyle = HOT_PINK
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
  const scalePressed = pressScale(state, x, y, w, h, 0.975)
  ctx.translate(x + w / 2, y + h / 2)
  ctx.scale(scalePressed, scalePressed)
  ctx.translate(-(x + w / 2), -(y + h / 2))
  ctx.fillStyle = 'rgba(18, 9, 54, 0.78)'
  roundRect(ctx, x, y, w, h, 18)
  ctx.fill()
  ctx.strokeStyle = item.color
  ctx.lineWidth = 3
  roundRect(ctx, x, y, w, h, 18)
  ctx.stroke()
  if (item.image?.complete && item.image.naturalWidth > 0) {
    const boxW = w - 28
    const boxH = h - 44
    const scale = Math.min(boxW / item.image.naturalWidth, boxH / item.image.naturalHeight) * 1.22
    const iw = item.image.naturalWidth * scale
    const ih = item.image.naturalHeight * scale
    ctx.drawImage(item.image, x + (w - iw) / 2, y + 12 + (boxH - ih) / 2, iw, ih)
  }

  const status = item.equipped ? 'EQUIPPED' : item.owned ? 'EQUIP' : `${item.price} coins`
  const statusColor = item.equipped ? '#7cff5b' : item.owned ? '#a8fbff' : '#ffe8ff'
  drawOutlinedText(ctx, status, x + w / 2, y + h - 22, status.length > 9 ? 23 : 26, statusColor, '#234b61', 'center', 1000, 4)
  if (item.equipped) {
    ctx.save()
    ctx.fillStyle = 'rgba(124, 255, 91, 0.18)'
    roundRect(ctx, x + 12, y + 12, 88, 26, 13)
    ctx.fill()
    ctx.strokeStyle = '#7cff5b'
    ctx.lineWidth = 2
    roundRect(ctx, x + 12, y + 12, 88, 26, 13)
    ctx.stroke()
    ctx.restore()
    drawOutlinedText(ctx, 'ON', x + 56, y + 25, 15, '#7cff5b', '#1a4320', 'center', 1000, 2)
  }
  ctx.restore()
  button(state, item.id, x, y, w, h)
}

function drawSettings(state) {
  const ctx = state.ctx
  const renderer = state.gameRenderer
  drawRoundTealBackButton(state, 48, 56, 36)

  if (renderer) {
    renderer.drawRoundedRect('rgba(18, 9, 54, 0.76)', '#a8fbff', 3, 46, 286, 448, 356, 28)
    renderer.drawLine('rgba(255,255,255,0.35)', 2, 78, 384, 462, 384)
  } else {
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
  }

  drawOutlinedText(ctx, 'AUDIO', LOGICAL_WIDTH / 2, 336, 30, '#fce76d', '#5e315f', 'center', 1000, 4)
  drawSettingsToggleRow(state, 'toggleMusic', 78, 432, 'iconMusic', 'MUSIC', state.save.settings.music)
  drawSettingsToggleRow(state, 'toggleSfx', 78, 514, 'iconVolume', 'SFX', state.save.settings.sfx)

  drawOutlinedText(ctx, 'SAVED AUTOMATICALLY', LOGICAL_WIDTH / 2, 700, 20, '#a8fbff', '#234b61', 'center', 1000, 3)
  drawText(ctx, 'Changes apply right away on this device.', LOGICAL_WIDTH / 2, 732, 15, '#d9fbff', 'center', 800)
}

function drawSettingsToggleRow(state, id, x, y, icon, label, enabled) {
  const ctx = state.ctx
  const renderer = state.gameRenderer
  const w = 384
  const h = 62
  const border = enabled ? '#a8fbff' : HOT_PINK
  const valueColor = enabled ? '#5cff7b' : SOFT_PINK

  if (renderer) {
    renderer.drawRoundedRect('rgba(18, 9, 54, 0.78)', border, 3, x, y, w, h, 31)
    renderer.drawLine('rgba(255,255,255,0.42)', 2, x + 76, y + 10, x + 76, y + h - 10)
  } else {
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
  }

  drawIconFit(ctx, state.assets.images[icon], x + 18, y + 13, 38, 36)
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
  drawResultsConfetti(state)
  const cx = LOGICAL_WIDTH / 2
  const elapsed = state.time - run.resultsShownAt

  const headline = run.completed ? 'RUN COMPLETE' : 'ELIMINATED'
  const headBorder = run.completed ? '#a8fbff' : HOT_PINK

  let nextY
  if (run.completed && run.grade && run.grade !== 'FAILED') {
    withReveal(ctx, delayedReveal(elapsed, 0.16, 0.22), () => drawResultsMedalSprite(state, cx, 210, run.grade, elapsed - 0.16))
    nextY = 384
  } else {
    drawFailurePulse(ctx, elapsed)
    withReveal(ctx, delayedReveal(elapsed, 0.12, 0.18), () => {
      drawText(ctx, run.lastMissCause, cx, 176, 19, '#ffd7f4', 'center', 900)
      drawSlammedFailureText(ctx, run.grade, cx, 242, elapsed - 0.18)
    })
    nextY = 318
  }
  withReveal(ctx, delayedReveal(elapsed, 0, 0.18), () => drawResultsTitlePill(state, cx, 42, headline, headBorder))

  const cyan = '#a8fbff'
  const gold = '#ffcc00'
  const reveal = resultsRevealProgress(state, run)
  const combo = Math.max(1, run.bestCombo || 0)
  const accPct = Math.round((run.accuracy || 0) * 100)
  const perfects = run.hitCounts?.perfect ?? 0

  nextY = drawSequencedStat(state, elapsed, 0.42, nextY, cyan, 'FINAL SCORE', formatScore(animatedInt(run.score, reveal)))
  nextY = drawSequencedStat(state, elapsed, 0.54, nextY, cyan, 'BEST COMBO', `x${animatedInt(combo, reveal)}`)
  nextY = drawSequencedStat(state, elapsed, 0.66, nextY, cyan, 'ACCURACY', `${animatedInt(accPct, reveal)}%`)
  nextY = drawSequencedStat(state, elapsed, 0.78, nextY, cyan, 'PERFECT HITS', String(animatedInt(perfects, reveal)))

  const statsBottom = nextY - RESULTS_LAYOUT.stat.gap
  const buttonTopY = resultsFirstButtonY(run)
  const coinY = resultsCoinY(statsBottom, buttonTopY)
  withReveal(ctx, delayedReveal(elapsed, 0.96, 0.22), () => drawResultsCoinReward(state, coinY, gold, animatedInt(run.coinsEarned || 0, reveal), elapsed - 0.96))

  const retry = resultsRetryAction(run)
  if (elapsed < 1.22) return
  if (run.ftue) {
    if (run.completed) {
      drawSpriteButton(state, 'ftueNextStage', RESULTS_LAYOUT.retryButton.x, buttonTopY, RESULTS_LAYOUT.retryButton.w, RESULTS_LAYOUT.retryButton.h, 'buttonCyan', 'NEXT LEVEL', null)
      drawSpriteButton(state, 'resultsHome', RESULTS_LAYOUT.menuButton.x, buttonTopY + 112, RESULTS_LAYOUT.menuButton.w, RESULTS_LAYOUT.menuButton.h, 'buttonPink', 'MENU', null)
      return
    }
    drawSpriteButton(state, 'ftueContinue', RESULTS_LAYOUT.retryButton.x, buttonTopY, RESULTS_LAYOUT.retryButton.w, RESULTS_LAYOUT.retryButton.h, 'buttonPink', ftueResultButtonLabel(run), null)
    drawSpriteButton(state, 'resultsHome', RESULTS_LAYOUT.menuButton.x, buttonTopY + 112, RESULTS_LAYOUT.menuButton.w, RESULTS_LAYOUT.menuButton.h, 'buttonCyan', 'MENU', null)
    return
  }

  drawSpriteButton(state, 'tryAgain', RESULTS_LAYOUT.retryButton.x, buttonTopY, RESULTS_LAYOUT.retryButton.w, RESULTS_LAYOUT.retryButton.h, retry.sprite, retry.label, retry.icon)
  drawSpriteButton(state, 'resultsHome', RESULTS_LAYOUT.menuButton.x, buttonTopY + 112, RESULTS_LAYOUT.menuButton.w, RESULTS_LAYOUT.menuButton.h, 'buttonCyan', 'MENU', null)
}

function resultsRevealProgress(state, run) {
  const startedAt = run.resultsShownAt ?? state.time
  const t = clamp((state.time - startedAt) / 0.95, 0, 1)
  return 1 - Math.pow(1 - t, 3)
}

function animatedInt(value, progress) {
  return Math.round(Math.max(0, value || 0) * progress)
}

function drawSequencedStat(state, elapsed, start, y, border, label, value) {
  const alpha = delayedReveal(elapsed, start, 0.18)
  withReveal(state.ctx, alpha, () => drawResultsStatPill(state, y, border, label, value))
  return y + RESULTS_LAYOUT.stat.h + RESULTS_LAYOUT.stat.gap
}

function drawFailurePulse(ctx, elapsed) {
  const alpha = Math.max(0, 0.42 * (1 - elapsed / 0.5))
  if (alpha <= 0) return
  ctx.save()
  ctx.fillStyle = `rgba(255, 79, 240, ${alpha})`
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  ctx.restore()
}

function drawSlammedFailureText(ctx, text, x, y, elapsed) {
  const t = clamp(elapsed / 0.34, 0, 1)
  const slam = 1 + (1 - easeOutBack(t)) * 0.55
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(slam, slam)
  drawOutlinedText(ctx, text, 0, 0, 76, gradeColor(text), '#421139', 'center', 1000, 5)
  ctx.restore()
}

function resultsFirstButtonY(run) {
  if (run.ftue && !run.completed) return RESULTS_LAYOUT.retryButton.yFailed
  return run.completed ? RESULTS_LAYOUT.retryButton.yCompleted : RESULTS_LAYOUT.retryButton.yFailed
}

function resultsCoinY(statsBottom, buttonTopY) {
  const coinH = RESULTS_LAYOUT.coin.h
  return statsBottom + (buttonTopY - statsBottom - coinH) / 2
}

function resultsRetryAction(run) {
  if (run.mode === 'stage' && run.completed && run.stage?.id === 1) return { label: 'NEXT LEVEL', icon: null, sprite: 'buttonCyan' }
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
  ctx.font = '900 30px Bungee, system-ui, sans-serif'
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

function drawResultsMedalSprite(state, cx, cy, grade, revealElapsed = 1) {
  const ctx = state.ctx
  const image = state.assets.images.medalsSheet
  const order = ['D', 'C', 'B', 'A', 'S']
  const index = order.indexOf(String(grade).toUpperCase())
  if (index < 0) return

  const time = state.time
  const pop = easeOutBack(clamp(revealElapsed / 0.42, 0, 1))
  const scale = (0.68 + pop * 0.32) * (1 + Math.sin(time * 3.2) * 0.018)

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
    ctx.drawImage(image, sourceX, sourceY, sourceW, sourceH, -drawW / 2 + centerFix, -drawH / 2, drawW, drawH)
  } else {
    drawOutlinedText(ctx, String(grade).toUpperCase(), 0, 0, 92, gradeColor(grade), '#421139', 'center', 1000, 5)
  }
  ctx.restore()
}

function drawResultsStatPill(state, y, border, label, value, iconKey = null) {
  const ctx = state.ctx
  const { x, w, h } = RESULTS_LAYOUT.stat
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

function drawResultsCoinReward(state, y, border, coins, revealElapsed = 1) {
  const ctx = state.ctx
  const text = `+${coins} COINS`
  const { w, h } = RESULTS_LAYOUT.coin
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
  drawCoinBurst(state, x + w / 2, y + h / 2, revealElapsed)
  ctx.font = '1000 31px Bungee, system-ui, Segoe UI, sans-serif'
  const iconSize = 34
  const gap = 11
  const textW = ctx.measureText(text).width
  const groupX = x + (w - iconSize - gap - textW) / 2
  drawIcon(ctx, state.assets.images.iconCoin, groupX, y + (h - iconSize) / 2, iconSize)
  drawOutlinedText(ctx, text, groupX + iconSize + gap, y + h / 2, 31, '#fce76d', '#5e315f', 'left', 1000, 4)
  return y + h + 10
}

function drawCoinBurst(state, cx, cy, elapsed) {
  const ctx = state.ctx
  const t = clamp(elapsed / 0.62, 0, 1)
  if (t <= 0 || t >= 1) return
  const alpha = 1 - t
  for (let i = 0; i < 7; i += 1) {
    const angle = -Math.PI * 0.9 + i * (Math.PI * 0.3)
    const distanceOut = 18 + t * (36 + (i % 3) * 10)
    const x = cx + Math.cos(angle) * distanceOut
    const y = cy - 8 + Math.sin(angle) * distanceOut - t * 26
    ctx.save()
    ctx.globalAlpha = alpha
    drawIcon(ctx, state.assets.images.iconCoin, x - 9, y - 9, 18)
    ctx.restore()
  }
}

function drawRun(state) {
  const ctx = state.ctx
  const run = state.run
  if (!run) return

  const hitTheme = hitThemeById()

  drawRunHud(state)
  if (run.ftue && run.stage?.id !== 1) drawFtueRunPrompt(state, run)

  if (run.status === 'countdown') {
    drawCountdownStep(state, run)
    return
  }

  const freeze = run.failSnapshot && (run.status === 'continueOffer' || run.status === 'finished')
  const visualTime = run.hitStopUntil > state.time ? run.hitStopStartedAt || state.time : state.time

  if (run.status === 'playing') {
    if (shouldShowStageTimer(state, run)) {
      drawStageTimer(ctx, run)
    }
    drawUpcomingTargetCue(state, run, hitTheme)
    for (const target of run.targets) {
      if (!target.resolved) drawTarget(ctx, target, hitTheme)
      else if (target.removeAt) drawVanishingTarget(ctx, target, hitTheme, visualTime)
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
      (n) => cap.startsWith(`COMBO ${n}`) || cap.startsWith(`${n} COMBO`) || cap.startsWith(`${n} -`),
    )
    const size = isMilestone ? 46 : 44
    if (cap !== 'GO!') {
      drawTextBlock(ctx, cap, LOGICAL_WIDTH / 2, 224, size, isNeg ? HOT_PINK : '#fce76d', 'center', 1000, CAPTION_MAX_WIDTH)
    }
  }

  if (run.goUntil > state.time) {
    drawGoSplash(state, run)
  }

  if (run.timeUpUntil > state.time) {
    drawTimeUpSplash(state, run)
  }

  if (run.status === 'finished') {
    ctx.fillStyle = freeze ? 'rgba(12, 5, 38, 0.42)' : 'rgba(12, 5, 38, 0.58)'
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    drawText(ctx, run.completed ? 'STAGE CLEAR' : 'ELIMINATED', LOGICAL_WIDTH / 2, 456, 54, run.completed ? '#a8fbff' : HOT_PINK, 'center', 1000)
    drawTextBlock(ctx, run.lastMissCause, LOGICAL_WIDTH / 2, 220, 22, '#ffffff', 'center', 900, CAPTION_MAX_WIDTH)
  }

  if (run.status === 'continueOffer') {
    const left = Math.max(0, run.continueOfferUntil - state.time)
    const pulse = left <= 2.1 ? 1 + Math.sin(state.time * Math.PI * 2) * 0.018 : 1
    drawScaledSpritePanel(state, 42, 198, 456, 568, 'panelCyan', pulse)
    drawOutlinedText(ctx, 'CONTINUE?', LOGICAL_WIDTH / 2, 306, 38, '#ffffff', '#234b61', 'center', 1000, 4)
    drawText(ctx, 'A few seconds to stay in the run.', LOGICAL_WIDTH / 2, 356, 17, '#d9fbff', 'center', 900)
    drawOutlinedText(ctx, `${Math.ceil(left)}s`, LOGICAL_WIDTH / 2, 430, 68, left < 2 ? HOT_PINK : '#fce76d', '#5e315f', 'center', 1000, 6)
    drawText(ctx, `BUY BACK - ${CONTINUE_COST} COINS`, LOGICAL_WIDTH / 2, 482, 21, '#fce76d', 'center', 1000)
    drawSpriteButton(state, 'continueBuy', 72, 530, 396, 92, 'buttonGold', `${CONTINUE_COST} COINS`, 'iconCoin')
    drawSpriteButton(state, 'continueDecline', 102, 646, 336, 72, 'buttonPink', 'GIVE UP', null)
  }

}

function drawCountdownStep(state, run) {
  const ctx = state.ctx
  const remaining = Math.max(0, run.startedAt - state.time)
  const number = Math.max(1, Math.ceil(remaining))
  const progress = clamp(number - remaining, 0, 1)
  const scale = 2.2 - easeOutCubic(progress) * 1.15
  ctx.save()
  ctx.globalAlpha = 0.72 + (1 - progress) * 0.28
  ctx.translate(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2)
  ctx.scale(scale, scale)
  drawOutlinedText(ctx, String(number), 0, 0, 104, '#ffffff', '#234b61', 'center', 1000, 6)
  ctx.restore()
  drawOutlinedText(ctx, 'GET READY', LOGICAL_WIDTH / 2, 620, 28, '#a8fbff', '#234b61', 'center', 1000, 4)
}

function drawGoSplash(state, run) {
  const ctx = state.ctx
  const progress = clamp((state.time - run.goStartedAt) / Math.max(0.01, run.goUntil - run.goStartedAt), 0, 1)
  const scale = 1.95 - easeOutCubic(progress) * 0.52
  ctx.save()
  ctx.globalAlpha = 1 - progress * 0.25
  ctx.translate(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2)
  ctx.scale(scale, scale)
  drawOutlinedText(ctx, 'GO!', 0, 0, 86, '#fce76d', '#5e315f', 'center', 1000, 6)
  ctx.restore()
}

function drawTimeUpSplash(state, run) {
  const ctx = state.ctx
  const remaining = Math.max(0, run.timeUpUntil - state.time)
  const progress = 1 - clamp(remaining / 0.9, 0, 1)
  const color = run.hp > 0 ? '#a8fbff' : HOT_PINK
  ctx.save()
  ctx.fillStyle = `rgba(8, 4, 30, ${0.42 + (1 - progress) * 0.18})`
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  ctx.globalAlpha = 1 - progress * 0.15
  ctx.translate(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2)
  ctx.scale(1.25 - easeOutCubic(progress) * 0.15, 1.25 - easeOutCubic(progress) * 0.15)
  drawOutlinedText(ctx, 'TIME UP', 0, -8, 58, color, '#234b61', 'center', 1000, 6)
  drawOutlinedText(ctx, run.hp > 0 ? 'STAGE CLEAR' : 'NO HP', 0, 54, 28, run.hp > 0 ? '#fce76d' : HOT_PINK, '#421139', 'center', 1000, 4)
  ctx.restore()
}

function drawFtueRunPrompt(state, run) {
  const ctx = state.ctx
  const prompt = ftuePrompt(run)
  const bodyLines = wrapDisplayLines(ctx, prompt.body, 380, 12, 800, 2)
  const panelH = bodyLines.length > 1 ? 68 : 54
  const panelY = 150
  drawSpritePanel(state, 62, panelY, 416, panelH, 'footerPurple')
  drawText(ctx, prompt.title, LOGICAL_WIDTH / 2, panelY + 19, 15, '#fce76d', 'center', 1000)
  drawTextBlock(ctx, prompt.body, LOGICAL_WIDTH / 2, panelY + (bodyLines.length > 1 ? 46 : 40), 12, '#ffffff', 'center', 800, 380, 2)
}

function drawRunHud(state) {
  const ctx = state.ctx
  const run = state.run
  drawRunJudgeCorners(state, run)

  const judgeSpot = JUDGE_CORNER_SPOTS[run.activeJudgeIndex ?? 0]
  const scoreSize = 48
  const scoreX = judgeSpot.x + JUDGE_PORTRAIT_SIZE.active / 2 + 14
  drawOutlinedText(ctx, formatScore(run.score), scoreX, judgeSpot.y, scoreSize, '#ffffff', '#5e315f', 'left', 1000, 5)

  drawComboMeter(ctx, run)
  const hp = RUN_HUD_LAYOUT.hp
  drawIcon(ctx, state.assets.images.iconHeart, hp.iconX, hp.iconY, hp.iconSize)
  drawPulsedHpBar(ctx, run, hp.barX, hp.barY, hp.barW, hp.barH)

  let hx = LOGICAL_WIDTH / 2 - 28
  if (run.thisRunDoubleCoins) {
    drawIcon(ctx, state.assets.images.iconCoin, hx, 874, 24)
    hx += 30
  }
  if (run.thisRunComboShield) {
    drawIcon(ctx, state.assets.images.iconShield, hx, 874, 24)
  }
}

function drawRunJudgeCorners(state, run) {
  JUDGES.forEach((judge, index) => {
    const skinId = state.save.equippedSkins[judge.id] || 'default'
    const active = index === run.activeJudgeIndex
    const spot = JUDGE_CORNER_SPOTS[index]
    const size = active ? JUDGE_PORTRAIT_SIZE.active : JUDGE_PORTRAIT_SIZE.inactive
    drawRunJudgePortrait(state, judge, skinId, spot.x, spot.y, size, active, index < 2)
  })
}

function drawRunJudgePortrait(state, judge, skinId, cx, cy, size, active, onTopRow = false) {
  const ctx = state.ctx
  const image = judgeImage(state, judge, skinId)
  ctx.save()
  ctx.globalAlpha = active ? 1 : onTopRow ? 0.88 : 0.72
  if (!TOUCH_DEVICE && active) {
    ctx.shadowColor = judge.color
    ctx.shadowBlur = 16
  }
  if (image?.complete && image.naturalWidth > 0) {
    const focusY = cy + size * 0.06
    ctx.drawImage(image, cx - size / 2, focusY - size / 2, size, size)
  }
  ctx.restore()
}

function drawStageTimer(ctx, run) {
  const { cx, y } = RUN_HUD_LAYOUT.timer
  const remaining = Math.max(0, run.duration - run.elapsed)
  const secs = Math.ceil(remaining)
  const mins = Math.floor(secs / 60)
  const label = `${mins}:${String(secs % 60).padStart(2, '0')}`
  const urgent = remaining <= 10

  ctx.save()
  ctx.globalAlpha = urgent ? 0.52 : 0.38
  drawOutlinedText(ctx, label, cx, y, 128, urgent ? HOT_PINK : '#a8fbff', '#234b61', 'center', 1000, 6)
  ctx.restore()
}

function shouldShowStageTimer(state, run) {
  return (
    run.mode === 'stage'
    && Number.isFinite(run.duration)
    && state.time >= (run.goUntil || 0)
  )
}

function drawComboMeter(ctx, run) {
  const { cx, textY } = RUN_HUD_LAYOUT.combo
  const tier = Math.min(10, Math.floor((run.combo || 0) / 10))
  const glow = tier / 10
  drawOutlinedText(ctx, `${run.combo}x`, cx, textY, 48 + glow * 6, '#a8fbff', '#234b61', 'center', 1000, 4)
}

function drawPulsedHpBar(ctx, run, x, y, w, h) {
  const active = run.hpPulseUntil > run.elapsed + run.startedAt || run.hpPulseUntil > 0
  const remaining = Math.max(0, (run.hpPulseUntil || 0) - (run.startedAt + run.elapsed))
  const pulse = active ? clamp(remaining / 0.34, 0, 1) : 0
  ctx.save()
  if (pulse > 0) {
    ctx.shadowColor = run.hpPulseColor || '#a8fbff'
    ctx.shadowBlur = 12 + pulse * 18
  }
  drawBar(ctx, x, y - pulse * 2, w, h + pulse * 5, run.hp / MAX_HP, HOT_PINK, '#a8fbff')
  ctx.restore()
}

function drawTarget(ctx, target, theme) {
  const progress = clamp(target.age / target.approach, 0, 1.25)
  drawTargetAnticipation(ctx, target, progress, theme)
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

function drawUpcomingTargetCue(state, run, theme) {
  const cue = run.upcomingTarget
  if (!cue) return
  const ctx = state.ctx
  const span = Math.max(0.01, cue.spawnAt - cue.createdAt)
  const t = clamp((state.time - cue.createdAt) / span, 0, 1)
  const ease = easeOutCubic(t)
  const x = cue.point.x
  const y = cue.point.y
  const color = cue.kind === 'hold' ? theme.ringHold.arc : cue.kind === 'slide' ? theme.ringSlide.path : theme.ringTap.outer
  const radius = 18 + ease * 48
  const alpha = 0.14 + ease * 0.36

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = 3 + ease * 3
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = alpha * 0.48
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, 8 + ease * 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawTargetAnticipation(ctx, target, progress, theme) {
  const color = target.kind === 'hold' ? theme.ringHold.arc : target.kind === 'slide' ? theme.ringSlide.path : theme.ringTap.outer

  if (target.kind === 'hold') return

  if (target.kind === 'slide') {
    if (progress <= 1.05) {
      const t = clamp(progress, 0, 1)
      const radius = 76 - t * 52
      ctx.save()
      ctx.globalAlpha = (1 - t) * 0.5
      ctx.strokeStyle = color
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(target.x, target.y, radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
    if (progress > 0.75 && progress < 1.2) {
      const t = clamp((progress - 0.75) / 0.25, 0, 1)
      const radius = 58 - t * 40
      ctx.save()
      ctx.globalAlpha = (1 - t) * 0.42
      ctx.strokeStyle = theme.ringSlide.end
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(target.endX, target.endY, radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
    return
  }

  if (target.age > 0.22 || progress > 0.22) return
  const t = clamp(target.age / 0.22, 0, 1)
  const radius = 76 - t * 18
  ctx.save()
  ctx.globalAlpha = (1 - t) * 0.42
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(target.x, target.y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function collapseThemeForQuality(theme, quality) {
  const color =
    quality === 'perfect'
      ? '#a8fbff'
      : quality === 'good'
        ? '#fce76d'
        : quality === 'okay'
        ? SOFT_PINK
          : quality === 'shield'
            ? '#7cff5b'
            : HOT_PINK
  return {
    ...theme,
    ringTap: { ...theme.ringTap, outer: color, inner: color },
    ringSlide: { ...theme.ringSlide, path: color, start: color, end: color, trail: color },
    ringHold: { ...theme.ringHold, fill: color, arc: color },
  }
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
  drawTarget(ctx, target, collapseThemeForQuality(theme, target.hitQuality))
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
  const holdT = target.holding ? clamp(target.heldFor / target.holdDuration, 0, 1.15) : 0
  const releaseWindow = target.holding && target.heldFor >= target.holdDuration - 0.24
  const late = target.holding && target.heldFor > target.holdDuration + 0.18
  const color = late ? HOT_PINK : releaseWindow ? '#fce76d' : arc

  drawGlowCircle(ctx, target.x, target.y, releaseWindow ? 54 : 50, releaseWindow ? '#fce76d' : fill, true)

  ctx.strokeStyle = color
  ctx.lineWidth = releaseWindow ? 12 : 10
  ctx.beginPath()
  ctx.arc(target.x, target.y, 62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(holdT, 0, 1))
  ctx.stroke()

  if (target.holding && !releaseWindow) {
    const left = Math.max(0, target.holdDuration - target.heldFor)
    drawOutlinedText(ctx, left.toFixed(1), target.x, target.y, 24, '#171236', '#ffffff', 'center', 1000, 3)
  }
  if (releaseWindow) drawSimpleReleasePulse(ctx, target, color)
  else if (!target.holding) drawOutlinedText(ctx, 'HOLD', target.x, target.y - 82, 20, arc, '#234b61', 'center', 1000, 3)
}

function drawSimpleReleasePulse(ctx, target, color) {
  const pulse = (Math.sin(target.heldFor * 24) + 1) / 2
  const radius = 72 + pulse * 16
  ctx.save()
  ctx.globalAlpha = 0.84 - pulse * 0.24
  ctx.strokeStyle = color
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(target.x, target.y, radius, 0, Math.PI * 2)
  ctx.stroke()
  drawOutlinedText(ctx, 'RELEASE', target.x, target.y - 86, 22, color, '#421139', 'center', 1000, 3)
  ctx.restore()
}

function drawSlideTarget(ctx, target, progress, theme) {
  const s = theme.ringSlide
  const beatT = clamp(target.age / target.approach, 0, 1)
  const beatPoint = pointOnSlider(target, beatT)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.save()
  ctx.globalAlpha = target.dragging ? 0.22 : 0.16
  ctx.strokeStyle = s.path
  ctx.lineWidth = 82
  drawSliderPath(ctx, target)
  ctx.stroke()
  ctx.restore()

  ctx.strokeStyle = s.pathDim
  ctx.lineWidth = 44
  drawSliderPath(ctx, target)
  ctx.stroke()
  ctx.strokeStyle = s.path
  ctx.lineWidth = 30
  drawSliderPath(ctx, target)
  ctx.stroke()

  ctx.save()
  ctx.strokeStyle = '#fce76d'
  ctx.lineWidth = 14
  drawSliderSegment(ctx, target, beatT)
  ctx.stroke()
  ctx.restore()

  drawSlideTimeHint(ctx, target, beatT)

  if (target.trail?.length > 1) {
    ctx.strokeStyle = s.trail
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.moveTo(target.trail[0].x, target.trail[0].y)
    for (const point of target.trail.slice(1)) ctx.lineTo(point.x, point.y)
    ctx.stroke()
  }

  const beadPoint = pointOnSlider(target, clamp(target.progress, 0, 1))

  drawGlowCircle(ctx, target.x, target.y, 38, s.start, true)
  drawGlowCircle(ctx, target.endX, target.endY, 38, s.end, true)
  drawSlideEndpointLabel(ctx, 'START', target.x, target.y - 58, s.start, progress < 1.08)
  drawSlideEndpointLabel(ctx, 'END', target.endX, target.endY - 58, s.end, progress > 0.35)

  drawSlideFollowCircle(ctx, beatPoint.x, beatPoint.y, target.dragging)
  drawSlidePlayerBead(ctx, beadPoint.x, beadPoint.y, target.dragging)
  ctx.restore()
}

function drawSlideTimeHint(ctx, target, beatT) {
  const remaining = clamp((target.deadline - target.age) / Math.max(0.01, target.deadline - target.approach), 0, 1)
  const cx = target.endX
  const cy = target.endY
  ctx.save()
  ctx.globalAlpha = 0.92
  ctx.strokeStyle = remaining < 0.24 ? HOT_PINK : '#fce76d'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(cx, cy, 52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remaining)
  ctx.stroke()
  ctx.globalAlpha = 0.78
  drawOutlinedText(ctx, beatT < 1 ? 'TIME' : 'NOW', cx, cy + 58, 17, beatT < 1 ? '#fce76d' : '#a8fbff', '#24124f', 'center', 1000, 3)
  ctx.restore()
}

function drawSlideFollowCircle(ctx, x, y, dragging) {
  const color = '#fce76d'
  ctx.save()
  ctx.globalAlpha = dragging ? 0.48 : 0.34
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(x, y, dragging ? 42 : 34, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
  drawGlowCircle(ctx, x, y, dragging ? 18 : 16, color, true)
}

function drawSlidePlayerBead(ctx, x, y, active) {
  ctx.save()
  ctx.shadowColor = '#a8fbff'
  ctx.shadowBlur = active ? 24 : 14
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#a8fbff'
  ctx.lineWidth = active ? 8 : 6
  ctx.beginPath()
  ctx.arc(x, y, active ? 30 : 25, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#a8fbff'
  ctx.beginPath()
  ctx.arc(x, y, active ? 14 : 11, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawSlideEndpointLabel(ctx, text, x, y, color, visible) {
  if (!visible) return
  ctx.save()
  ctx.globalAlpha = 0.92
  drawOutlinedText(ctx, text, x, y, 17, color, '#24124f', 'center', 1000, 3)
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

function drawSliderSegment(ctx, target, endProgress) {
  const steps = Math.max(2, Math.ceil(24 * clamp(endProgress, 0, 1)))
  ctx.beginPath()
  const first = pointOnSlider(target, 0)
  ctx.moveTo(first.x, first.y)
  for (let i = 1; i <= steps; i += 1) {
    const point = pointOnSlider(target, clamp((i / steps) * endProgress, 0, 1))
    ctx.lineTo(point.x, point.y)
  }
}

function drawLeaderboardRow(state, row, rank, displayIndex, y, h) {
  const ctx = state.ctx
  const renderer = state.gameRenderer
  const colors = ['#fce76d', SOFT_PINK, '#7cff5b', '#a8fbff', '#a8fbff', '#a8fbff', '#a8fbff', '#a8fbff', '#a8fbff', '#a8fbff']
  const color = colors[rank - 1] || '#a8fbff'
  const enter = delayedReveal(screenElapsed(state), displayIndex * 0.035, 0.26)
  y += (1 - enter) * 34
  const x = 38
  const w = 464
  const midY = y + h / 2
  ctx.save()
  ctx.globalAlpha *= enter
  if (renderer) {
    renderer.drawRoundedRect('rgba(18, 9, 54, 0.86)', color, rank <= 3 ? 4 : 3, x, y, w, h, h / 2)
  } else {
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(18, 9, 54, 0.86)'
    roundRect(ctx, x, y, w, h, h / 2)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = rank <= 3 ? 4 : 3
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  drawOutlinedText(ctx, `#${rank}`, 56, midY, rank >= 10 ? 24 : 26, color, '#24124f', 'left', 1000, 3)
  if (renderer) renderer.drawLine('rgba(255,255,255,0.52)', 2, 128, y + 11, 128, y + h - 11)
  else {
    ctx.strokeStyle = 'rgba(255,255,255,0.52)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(128, y + 11)
    ctx.lineTo(128, y + h - 11)
    ctx.stroke()
  }
  drawOutlinedText(ctx, row.name, 146, midY, row.name.length > 14 ? 18 : 21, color, '#24124f', 'left', 1000, 3)
  drawOutlinedText(ctx, formatScore(row.score), 440, midY, 22, rank <= 3 ? SOFT_PINK : '#fce76d', '#24124f', 'right', 1000, 3)
  drawLeaderboardPortrait(state, row, 480, midY, color, 27)
  ctx.restore()
}

function drawLeaderboardPlayerRow(state, score, rank, y, h = 64, displayIndex = 0) {
  const ctx = state.ctx
  const renderer = state.gameRenderer
  const judge = JUDGES[1]
  const row = { judgeId: judge.id, skinId: state.save.equippedSkins[judge.id] || 'default' }
  const enter = delayedReveal(screenElapsed(state), displayIndex * 0.035, 0.26)
  y += (1 - enter) * 34
  const midY = y + h / 2
  const pulse = 0.5 + Math.sin(state.time * 3.2) * 0.5
  ctx.save()
  ctx.globalAlpha *= enter
  ctx.shadowColor = HOT_PINK
  ctx.shadowBlur = 8 + pulse * 10
  if (renderer) {
    renderer.drawRoundedRect('rgba(68, 10, 62, 0.86)', HOT_PINK, 4, 38, y, 464, h, h / 2)
  } else {
    ctx.fillStyle = 'rgba(68, 10, 62, 0.86)'
    roundRect(ctx, 38, y, 464, h, h / 2)
    ctx.fill()
    ctx.strokeStyle = HOT_PINK
    ctx.lineWidth = 4
    ctx.stroke()
  }
  ctx.shadowBlur = 0
  drawOutlinedText(ctx, `YOU - #${rank}`, 56, midY, rank >= 10 ? 27 : 30, '#ffe8ff', '#4a123c', 'left', 1000, 4)
  drawOutlinedText(ctx, formatScore(score), 440, midY, 24, '#ffe8ff', '#4a123c', 'right', 1000, 3)
  drawLeaderboardPortrait(state, row, 482, midY, HOT_PINK, 30)
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
    const focusY = y + r * 0.1
    ctx.drawImage(image, x - size / 2, focusY - size / 2, size, size)
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
  return clamp(insert, 4, 6)
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
  const scale = pressScale(state, x, y, w, h, 0.965)
  ctx.save()
  ctx.translate(x + w / 2, y + h / 2)
  ctx.scale(scale, scale)
  ctx.translate(-(x + w / 2), -(y + h / 2))
  drawImage(ctx, state.assets.images[sprite], x, y, w, h)
  if (icon) drawIcon(ctx, state.assets.images[icon], x + 22, y + h / 2 - 22, 44)
  drawOutlinedText(ctx, label, x + w / 2 + (icon ? 18 : 0), y + h / 2, label.length > 18 ? 20 : 27, spriteButtonTextColor(sprite), '#2d1648', 'center', 1000, 3)
  ctx.restore()
  button(state, id, x, y, w, h)
}

function spriteButtonTextColor(sprite) {
  if (sprite === 'buttonGold') return '#fce76d'
  if (sprite === 'buttonPink') return HOT_PINK
  if (sprite === 'buttonCyan') return '#a8fbff'
  return '#ffffff'
}

function drawSpritePanel(state, x, y, w, h, sprite) {
  drawImage(state.ctx, state.assets.images[sprite], x, y, w, h)
}

function drawScaledSpritePanel(state, x, y, w, h, sprite, scale) {
  const ctx = state.ctx
  ctx.save()
  ctx.translate(x + w / 2, y + h / 2)
  ctx.scale(scale, scale)
  ctx.translate(-(x + w / 2), -(y + h / 2))
  drawSpritePanel(state, x, y, w, h, sprite)
  ctx.restore()
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

function drawToast(state) {
  if (!state.toast || state.toast.until <= state.time) return
  const ctx = state.ctx
  ctx.fillStyle = 'rgba(11, 7, 43, 0.9)'
  roundRect(ctx, 92, 884, 356, 44, 18)
  ctx.fill()
  drawText(ctx, state.toast.text, LOGICAL_WIDTH / 2, 906, 16, '#ffffff', 'center', 900)
}

function drawGlowCircle(ctx, x, y, radius, color, filled) {
  const glow = !TOUCH_DEVICE
  ctx.save()
  if (glow) {
    ctx.shadowColor = color
    ctx.shadowBlur = 20
  }
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = glow ? 7 : 6
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  filled ? ctx.fill() : ctx.stroke()
  if (glow) ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(255,255,255,0.86)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(x, y, Math.max(4, radius - 5), 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawResultsConfetti(state) {
  const ctx = state.ctx
  const clipTop = 370
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, clipTop, LOGICAL_WIDTH, LOGICAL_HEIGHT - clipTop)
  ctx.clip()
  drawScrollingConfetti(state)
  ctx.restore()
}

function shouldSkipRunConfetti(state) {
  if (state.screen === 'results') return true
  return TOUCH_DEVICE && state.screen === 'run' && state.run?.status === 'playing'
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

function equippedJudgeImage(state, judge) {
  const equippedSkin = state.save.equippedSkins?.[judge.id] || 'default'
  return judgeImage(state, judge, equippedSkin)
}

function drawIcon(ctx, image, x, y, size) {
  drawImage(ctx, image, x, y, size, size)
}

function drawIconFit(ctx, image, x, y, w, h) {
  if (!image?.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) return
  const scale = Math.min(w / image.naturalWidth, h / image.naturalHeight)
  const drawW = image.naturalWidth * scale
  const drawH = image.naturalHeight * scale
  ctx.drawImage(image, x + (w - drawW) / 2, y + (h - drawH) / 2, drawW, drawH)
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
  if (grade === 'FAILED') return HOT_PINK
  return SOFT_PINK
}

function formatScore(score) {
  return Math.round(score).toLocaleString('en-US')
}

function delayedReveal(elapsed, start, duration) {
  return easeOutCubic(clamp((elapsed - start) / duration, 0, 1))
}

function withReveal(ctx, alpha, draw) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha *= alpha
  draw()
  ctx.restore()
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

function easeOutBack(t) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function pressScale(state, x, y, w, h, downScale) {
  const p = state.pointer
  if (!p?.down) return 1
  return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h ? downScale : 1
}

function screenElapsed(state) {
  return state.time - (state.screenEnteredAt ?? state.time)
}

function ftuePrompt(run) {
  if (run.stage.id === 1) {
    return { title: 'TAP LESSON', body: 'Tap when the outer ring meets the target.' }
  }
  if (run.stage.id === 2) {
    return { title: 'SLIDE LESSON', body: 'Grab START and drag the ball on rails to END.' }
  }
  if (run.stage.id === 3) {
    return { title: 'HOLD LESSON', body: 'Mostly holds — a few taps and slides will pop up.' }
  }
  if (run.stage.id === 4) {
    return { title: 'MIXED PRESSURE', body: 'Tap, slide, and hold. Misses cost HP.' }
  }
  return { title: 'CHAOS FINALE', body: 'Survive the mix to unlock the full home screen.' }
}

function ftueResultButtonLabel(run) {
  if (!run.completed) return 'TRY AGAIN'
  return 'TRY AGAIN'
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
