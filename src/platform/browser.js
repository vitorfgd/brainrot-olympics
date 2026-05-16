import { createPointerCommand } from '../game/commands.js'
import { drainGameEvents } from '../game/events.js'
import { JUDGES, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../game/rules.js'
import { hydrateSave, SAVE_KEY } from '../game/state.js'

export function loadBrowserSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return hydrateSave(raw ? JSON.parse(raw) : {})
  } catch {
    return hydrateSave({})
  }
}

export function persistBrowserSave(save) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save))
}

export function resizeBrowserCanvas(canvas, ctx) {
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))
  canvas.width = Math.round(LOGICAL_WIDTH * dpr)
  canvas.height = Math.round(LOGICAL_HEIGHT * dpr)
  canvas.style.aspectRatio = `${LOGICAL_WIDTH} / ${LOGICAL_HEIGHT}`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = true
}

export function pointerCommandFromEvent(event, canvas) {
  const rect = canvas.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * LOGICAL_WIDTH
  const y = ((event.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT
  const type =
    event.type === 'pointerdown'
      ? 'pointerDown'
      : event.type === 'pointermove'
        ? 'pointerMove'
        : event.type === 'pointercancel'
          ? 'pointerCancel'
          : 'pointerUp'
  return createPointerCommand(type, x, y, event.pointerId)
}

export function handleBrowserGameEvents(state, assets) {
  for (const event of drainGameEvents(state)) {
    if (event.type === 'audioUnlockRequested') {
      assets.unlockAudio?.()
    } else if (event.type === 'soundRequested') {
      assets.playSfx(event.soundId, event.enabled, event.volumeScale ?? 1)
    } else if (event.type === 'musicRequested') {
      handleMusicEvent(state, assets, event)
    } else if (event.type === 'musicSettingChanged') {
      assets.setMusicEnabled(event.enabled)
    } else if (event.type === 'saveRequested') {
      persistBrowserSave(state.save)
    }
  }
}

function handleMusicEvent(state, assets, event) {
  if (event.action === 'startRun') {
    const judge = JUDGES.find((item) => item.id === event.judgeId)
    if (judge) assets.startMusic(judge, event.enabled)
    return
  }
  if (event.action === 'stopRun') {
    assets.stopMusic()
    return
  }
  if (event.action === 'startMenu') {
    assets.startMenuMusic(event.enabled)
    return
  }
  if (event.action === 'stopMenu') {
    assets.stopMenuMusic()
  }
}
