import assert from 'node:assert/strict'

import { createPointerCommand, createUiActionCommand } from '../src/game/commands.js'
import { drainGameEvents } from '../src/game/events.js'
import { updateGame, handleGameCommand } from '../src/game/screens.js'
import { createGameState } from '../src/game/state.js'

const state = createGameState({
  seed: 1234,
  save: {
    ftueCompleted: true,
    settings: { music: true, sfx: true },
  },
})

let events = drainGameEvents(state)
assert.equal(events.some((event) => event.type === 'saveRequested'), true)
assert.equal(state.screen, 'home')
assert.equal(typeof state.random, 'function')
assert.equal(typeof document, 'undefined')
assert.equal(typeof localStorage, 'undefined')

state.ui.buttons = [{ id: 'settings', x: 0, y: 0, w: 120, h: 120 }]
handleGameCommand(state, createPointerCommand('pointerDown', 24, 24, 1))
events = drainGameEvents(state)

assert.equal(state.screen, 'settings')
assert.equal(events.some((event) => event.type === 'audioUnlockRequested'), true)
assert.equal(events.some((event) => event.type === 'soundRequested' && event.soundId === 'click'), true)

updateGame(state)
events = drainGameEvents(state)
assert.equal(state.renderState.screen, 'settings')
assert.equal(state.renderState.logicalWidth, 540)
assert.equal(state.renderState.logicalHeight, 960)
assert.equal(state.renderState.settings.rows.length, 2)
assert.equal(state.renderState.levels.stages.length, 5)
assert.equal(state.renderState.leaderboard.rows.length, 10)
assert.equal(state.renderState.shop.powerUps.length, 3)
assert.equal(state.renderState.shop.cosmetics.length, 4)
assert.equal(state.renderState.home.footerButtons.length, 3)
assert.equal(events.some((event) => event.type === 'screenChanged' && event.screen === 'settings'), true)
assert.equal(events.some((event) => event.type === 'musicRequested' && event.action === 'startMenu'), true)

state.ui.buttons = [{ id: 'toggleSfx', x: 0, y: 0, w: 120, h: 120 }]
handleGameCommand(state, createPointerCommand('pointerDown', 24, 24, 1))
events = drainGameEvents(state)

assert.equal(state.save.settings.sfx, false)
assert.equal(events.some((event) => event.type === 'saveRequested'), true)
assert.equal(events.some((event) => event.type === 'toastRequested'), true)

handleGameCommand(state, createUiActionCommand('toggleMusic'))
events = drainGameEvents(state)

assert.equal(state.save.settings.music, false)
assert.equal(events.some((event) => event.type === 'musicSettingChanged' && event.enabled === false), true)

console.log('Port-readiness smoke passed')
