export function emitGameEvent(state, event) {
  state.events ??= []
  state.events.push(event)
}

export function drainGameEvents(state) {
  const events = state.events || []
  state.events = []
  return events
}

export function requestSound(state, soundId, volumeScale = 1) {
  emitGameEvent(state, { type: 'soundRequested', soundId, volumeScale, enabled: state.save?.settings?.sfx !== false })
}

export function requestRunMusic(state, judgeId, enabled = true) {
  emitGameEvent(state, { type: 'musicRequested', action: 'startRun', judgeId, enabled })
}

export function requestStopRunMusic(state) {
  emitGameEvent(state, { type: 'musicRequested', action: 'stopRun' })
}

export function requestMenuMusic(state, enabled = true) {
  emitGameEvent(state, { type: 'musicRequested', action: 'startMenu', enabled })
}

export function requestStopMenuMusic(state) {
  emitGameEvent(state, { type: 'musicRequested', action: 'stopMenu' })
}

export function requestMusicSettingsSync(state, enabled) {
  emitGameEvent(state, { type: 'musicSettingChanged', enabled })
}

export function requestAudioUnlock(state) {
  emitGameEvent(state, { type: 'audioUnlockRequested' })
}

export function requestSave(state) {
  emitGameEvent(state, { type: 'saveRequested' })
}

export function requestToast(state, text, duration = 1.6) {
  emitGameEvent(state, { type: 'toastRequested', text, duration })
}

export function notifyScreenChanged(state, screen) {
  emitGameEvent(state, { type: 'screenChanged', screen })
}

export function notifyRunCompleted(state, completed, cause) {
  emitGameEvent(state, { type: 'runCompleted', completed, cause })
}
