import './style.css'
import { createAssetManager } from './game/assets.js'
import { createGameState, resizeCanvas, setPointerFromEvent } from './game/state.js'
import { updateGame, handlePointerDown, handlePointerMove, handlePointerUp } from './game/screens.js'
import { drawGame } from './game/render.js'

const canvas = document.querySelector('#game')
const ctx = canvas.getContext('2d')
const assets = createAssetManager()
const state = createGameState(canvas, ctx, assets)

function frame(now) {
  const seconds = now / 1000
  state.deltaTime = state.lastFrame ? Math.min(seconds - state.lastFrame, 0.05) : 0
  state.lastFrame = seconds
  state.time = seconds

  updateGame(state)
  drawGame(state)
  requestAnimationFrame(frame)
}

function onPointer(event) {
  if (event.type === 'pointerdown' || event.type === 'pointercancel') {
    event.preventDefault()
  }
  setPointerFromEvent(state, event)

  if (event.type === 'pointerdown') {
    state.pointer.lastMoveX = state.pointer.x
    state.pointer.lastMoveY = state.pointer.y
    canvas.setPointerCapture?.(event.pointerId)
    handlePointerDown(state)
  } else if (event.type === 'pointermove') {
    handlePointerMove(state)
  } else {
    state.pointer.lastMoveX = null
    state.pointer.lastMoveY = null
    handlePointerUp(state)
  }
}

window.addEventListener('resize', () => resizeCanvas(state))
canvas.addEventListener('pointerdown', onPointer)
canvas.addEventListener('pointermove', onPointer)
canvas.addEventListener('pointerup', onPointer)
canvas.addEventListener('pointercancel', onPointer)

resizeCanvas(state)
requestAnimationFrame(frame)
