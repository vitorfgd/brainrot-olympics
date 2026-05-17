export function createPointerCommand(type, x, y, pointerId = 0) {
  return { type, x, y, pointerId }
}

export function createUiActionCommand(actionId) {
  return { type: 'uiAction', actionId }
}

export function applyInputCommandToPointer(state, command) {
  if (typeof command.x !== 'number' || typeof command.y !== 'number') return
  state.pointer.x = command.x
  state.pointer.y = command.y
  state.pointer.down = command.type !== 'pointerUp' && command.type !== 'pointerCancel'

  if (command.type === 'pointerDown') {
    state.pointer.lastMoveX = command.x
    state.pointer.lastMoveY = command.y
  } else if (command.type === 'pointerUp' || command.type === 'pointerCancel') {
    state.pointer.lastMoveX = null
    state.pointer.lastMoveY = null
  }
}
