import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildRenderState } from '../src/game/renderState.js'
import { createGameState, startStageRun } from '../src/game/state.js'
import { STAGES } from '../src/game/rules.js'

const FIXTURE_PATH = join(process.cwd(), 'docs', 'render-state-fixtures.json')

const sampleSave = {
  ftueCompleted: true,
  coins: 2600,
  highScore: 86420,
  stageBests: {
    1: { score: 42000, grade: 'A', accuracy: 0.88, cleared: true },
    2: { score: 39000, grade: 'B', accuracy: 0.74, cleared: true },
    3: { score: 51000, grade: 'S', accuracy: 0.96, cleared: true },
  },
  ownedSkins: {
    blingbeak: ['default', 'partyhat'],
    disco: ['default', 'disco'],
    coolman: ['default', 'king'],
    dj: ['default'],
  },
  equippedSkins: {
    blingbeak: 'partyhat',
    disco: 'disco',
    coolman: 'king',
    dj: 'default',
  },
  bankedExtraLife: 1,
  doubleCoinsRunsRemaining: 2,
  comboShieldRunsRemaining: 1,
  settings: {
    music: true,
    sfx: true,
  },
}

export function buildRenderStateFixtures() {
  return {
    home: screenFixture('home'),
    levels: screenFixture('stageSelect'),
    leaderboard: screenFixture('leaderboard'),
    shop: screenFixture('shop'),
    settings: screenFixture('settings'),
    boostSelect: boostSelectFixture(),
    runCountdown: runFixture('countdown'),
    runPlaying: runFixture('playing'),
    runContinueOffer: runFixture('continueOffer'),
    resultsComplete: resultsFixture(true),
    resultsFailed: resultsFixture(false),
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const fixtures = buildRenderStateFixtures()
  if (process.argv.includes('--write')) {
    mkdirSync(dirname(FIXTURE_PATH), { recursive: true })
    writeFileSync(FIXTURE_PATH, `${JSON.stringify(fixtures, null, 2)}\n`)
    console.log(`Wrote ${FIXTURE_PATH}`)
  } else {
    console.log(JSON.stringify(fixtures, null, 2))
  }
}

function screenFixture(screen) {
  const state = baseState()
  state.screen = screen
  state.time = 12
  return buildRenderState(state)
}

function boostSelectFixture() {
  const state = baseState()
  state.screen = 'boostSelect'
  state.boostSelectPending = { kind: 'stage', stageId: 4, ftue: false }
  state.boostSelectUseDoubleCoins = true
  state.boostSelectUseComboShield = true
  state.time = 14
  return buildRenderState(state)
}

function runFixture(status) {
  const state = baseState()
  startStageRun(state, 3, { thisRunDoubleCoins: true, thisRunComboShield: true })
  state.time = 18
  state.run.status = status
  state.run.startedAt = 15
  state.run.elapsed = 3
  state.run.score = 12800
  state.run.combo = 18
  state.run.bestCombo = 24
  state.run.hp = 76
  state.run.caption = status === 'continueOffer' ? '' : 'GOOD'
  state.run.captionUntil = 19
  state.run.targets = [tapTarget(), slideTarget(), holdTarget()]
  state.run.upcomingTarget = {
    kind: 'tap',
    point: { x: 328, y: 420 },
    createdAt: 17.52,
    spawnAt: 18.08,
    approach: 0.82,
  }
  if (status === 'countdown') {
    state.time = 13.6
    state.run.countdownStartedAt = 12
    state.run.startedAt = 15
    state.run.elapsed = 0
    state.run.targets = []
  }
  if (status === 'continueOffer') {
    state.run.continueOfferUntil = 22
    state.run.continueDeclineCause = 'OFF BEAT'
    state.run.failSnapshot = slideTarget()
    state.run.targets = []
  }
  return buildRenderState(state)
}

function resultsFixture(completed) {
  const state = baseState()
  startStageRun(state, completed ? 3 : 2)
  state.screen = 'results'
  state.time = 32
  Object.assign(state.run, {
    status: 'finished',
    completed,
    failed: !completed,
    grade: completed ? 'A' : 'FAILED',
    score: completed ? 84600 : 1200,
    combo: completed ? 0 : 3,
    bestCombo: completed ? 127 : 6,
    resolvedNotes: completed ? 120 : 8,
    accuracyPoints: completed ? 108 : 2,
    accuracy: completed ? 0.9 : 0.25,
    hitCounts: completed
      ? { perfect: 72, good: 28, okay: 20, miss: 0 }
      : { perfect: 1, good: 1, okay: 0, miss: 6 },
    coinsEarned: completed ? 240 : 0,
    lastMissCause: completed ? 'STAGE CLEAR' : 'MISSED THE BEAT',
    resultsShownAt: 31.2,
  })
  return buildRenderState(state)
}

function baseState() {
  const state = createGameState({
    seed: 4242,
    save: structuredClone(sampleSave),
  })
  state.events = []
  state.run = null
  state.screen = 'home'
  state.time = 0
  return state
}

function tapTarget() {
  return {
    id: 101,
    kind: 'tap',
    x: 270,
    y: 452,
    age: 0.44,
    approach: 0.9,
    deadline: 1.25,
    resolved: false,
    pulse: 0,
  }
}

function slideTarget() {
  return {
    id: 102,
    kind: 'slide',
    x: 152,
    y: 526,
    endX: 386,
    endY: 526,
    controlX: 269,
    controlY: 504,
    tolerance: 104,
    progress: 0.56,
    dragging: true,
    trail: [
      { x: 152, y: 526 },
      { x: 214, y: 516 },
      { x: 284, y: 512 },
    ],
    age: 0.7,
    approach: 1,
    deadline: 2.35,
    resolved: false,
    pulse: 0,
  }
}

function holdTarget() {
  return {
    id: 103,
    kind: 'hold',
    x: 334,
    y: 618,
    age: 0.88,
    approach: 1,
    deadline: 2.2,
    holdDuration: 0.78,
    heldFor: 0.34,
    holding: true,
    releaseCueShown: false,
    resolved: false,
    pulse: 0,
  }
}
