import './style.css'
import { createAssetManager } from './game/assets.js'
import { createCanvasGameRenderer } from './game/canvasRenderer.js'
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './game/rules.js'
import { createGameState } from './game/state.js'
import { updateGame, handleGameCommand } from './game/screens.js'
import { drawGame } from './game/render.js'
import {
  handleBrowserGameEvents,
  loadBrowserSave,
  pointerCommandFromEvent,
  resizeBrowserCanvas,
} from './platform/browser.js'

const canvas = document.querySelector('#game')
const ctx = canvas.getContext('2d')
const assets = createAssetManager()
const renderer = createCanvasGameRenderer(ctx, LOGICAL_WIDTH, LOGICAL_HEIGHT, assets.images)
const state = createGameState({ save: loadBrowserSave(), ctx, assets })
state.gameRenderer = renderer
handleBrowserGameEvents(state, assets)

function frame(now) {
  const seconds = now / 1000
  state.deltaTime = state.lastFrame ? Math.min(seconds - state.lastFrame, 0.05) : 0
  state.lastFrame = seconds
  state.time = seconds

  updateGame(state)
  handleBrowserGameEvents(state, assets)
  drawGame(state)
  requestAnimationFrame(frame)
}

function onPointer(event) {
  if (event.type === 'pointerdown' || event.type === 'pointercancel') {
    event.preventDefault()
  }
  const command = pointerCommandFromEvent(event, canvas)

  if (event.type === 'pointerdown') {
    canvas.setPointerCapture?.(event.pointerId)
  }
  handleGameCommand(state, command)
  handleBrowserGameEvents(state, assets)
}

window.addEventListener('resize', () => resizeBrowserCanvas(canvas, ctx))
canvas.addEventListener('pointerdown', onPointer)
canvas.addEventListener('pointermove', onPointer)
canvas.addEventListener('pointerup', onPointer)
canvas.addEventListener('pointercancel', onPointer)

resizeBrowserCanvas(canvas, ctx)
requestAnimationFrame(frame)
