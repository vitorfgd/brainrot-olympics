export const LOGICAL_WIDTH = 540
export const LOGICAL_HEIGHT = 960
export const PLAY_TOP = 190
export const PLAY_BOTTOM = 760
export const MAX_HP = 100
export const HIT_QUALITY_VALUE = { perfect: 1, good: 0.75, okay: 0.45, miss: 0 }
export const HIT_LABELS = { perfect: 'PERFECT', good: 'GOOD', okay: 'OKAY', miss: 'MISS' }

const ASSET_BASE = import.meta.env.BASE_URL
const JUDGE_MUSIC_SRC = {
  blingbeak: `${ASSET_BASE}audio/blingbeak_long_ride.ogg`,
  disco: `${ASSET_BASE}audio/disco_ataca.ogg`,
  coolman: `${ASSET_BASE}audio/coolman_too_much_burrito.ogg`,
  dj: `${ASSET_BASE}audio/dj_baby_baby_sped_up.ogg`,
}

export const JUDGES = [
  {
    id: 'blingbeak',
    name: 'BlingBeak',
    title: 'Beat Inspector',
    color: '#ff4ff0',
    imageSrc: `${ASSET_BASE}characters/BlingBeak.png`,
    musicSrc: JUDGE_MUSIC_SRC.blingbeak,
    skins: [
      { id: 'default', name: 'BlingBeak', price: 0, imageSrc: `${ASSET_BASE}characters/BlingBeak.png` },
      { id: 'partyhat', name: 'Partyhat', price: 1000, imageSrc: `${ASSET_BASE}characters/Partyhat.png` },
      { id: 'maverick', name: 'Maverick', price: 200, imageSrc: `${ASSET_BASE}characters/Maverick.png` },
    ],
  },
  {
    id: 'disco',
    name: 'Disco',
    title: 'Combo Prophet',
    color: '#70f66b',
    imageSrc: `${ASSET_BASE}characters/Disco.png`,
    musicSrc: JUDGE_MUSIC_SRC.disco,
    skins: [
      { id: 'default', name: 'Disco', price: 0, imageSrc: `${ASSET_BASE}characters/Disco.png` },
      { id: 'headband', name: 'Headband', price: 1500, imageSrc: `${ASSET_BASE}characters/Headband.png` },
      { id: 'galaxy_brain', name: 'Galaxy Brain', price: 200, imageSrc: `${ASSET_BASE}characters/Galaxy_Brain.png` },
    ],
  },
  {
    id: 'coolman',
    name: 'CoolMan',
    title: 'Gold Standard',
    color: '#a8fbff',
    imageSrc: `${ASSET_BASE}characters/CoolMan.png`,
    musicSrc: JUDGE_MUSIC_SRC.coolman,
    skins: [
      { id: 'default', name: 'CoolMan', price: 0, imageSrc: `${ASSET_BASE}characters/CoolMan.png` },
      { id: 'king', name: 'King', price: 800, imageSrc: `${ASSET_BASE}characters/King.png` },
      { id: 'dolphin', name: 'Dolphin', price: 200, imageSrc: `${ASSET_BASE}characters/Dolphin.png` },
    ],
  },
  {
    id: 'dj',
    name: 'DJ',
    title: 'Chaos Curator',
    color: '#ffce24',
    imageSrc: `${ASSET_BASE}characters/DJ.png`,
    musicSrc: JUDGE_MUSIC_SRC.dj,
    skins: [
      { id: 'default', name: 'DJ', price: 0, imageSrc: `${ASSET_BASE}characters/DJ.png` },
      { id: 'punk', name: 'Punk', price: 2000, imageSrc: `${ASSET_BASE}characters/Punk.png` },
      { id: 'lab_coat', name: 'Lab Coat', price: 200, imageSrc: `${ASSET_BASE}characters/Lab_Coat.png` },
    ],
  },
]

/** Default target + hit burst colors. */
export const DEFAULT_HIT_THEME = {
  id: 'default',
  name: 'Neon Arena',
  ringTap: { outer: '#a8fbff', inner: '#ff4ff0', label: '#171236' },
  ringSlide: { path: '#a8fbff', pathDim: 'rgba(255, 255, 255, 0.86)', start: '#ff4ff0', end: '#fce76d', trail: '#ffffff' },
  ringHold: { fill: '#fce76d', arc: '#a8fbff', label: '#171236' },
  burst: { perfect: '#a8fbff', good: '#ffd22e', okay: '#ff8af5' },
  milestoneBurstScale: 1.35,
}

export const COMBO_MILESTONE_AT = [10, 25, 50, 100, 200]

export function hitThemeById() {
  return DEFAULT_HIT_THEME
}

export function milestoneCalloutText(combo) {
  if (combo === 10) return 'COMBO 10 - WARMING UP'
  if (combo === 25) return '25 - HEATING UP'
  if (combo === 50) return '50 - ON FIRE'
  if (combo === 100) return '100 - UNHINGED'
  if (combo === 200) return '200 - MAX BRAINROT'
  return ''
}

/** Mid-run continue (PDF: ~200 coins, 50% HP, one per run). */
export const CONTINUE_COST = 200
export const CONTINUE_HP_FRAC = 0.5
export const CONTINUE_PROMPT_SECONDS = 5

/** Mock leaderboard scores (same order as UI rows) for local rank. */
export const MOCK_LEADERBOARD_TOP_SCORES = [98100, 95500, 92200, 89800, 87000, 86200, 85500, 85000, 84800, 84700]

export function rankForEndlessScore(score) {
  return MOCK_LEADERBOARD_TOP_SCORES.filter((s) => s > score).length + 1
}

const ELIMINATION_STAMP_POOLS = {
  'MISSED THE BEAT': ['MISSED THE DROP', 'OUT OF SYNC', 'MISSED THE DROP', 'TOO LATE'],
  'OFF BEAT': ['OFF BEAT', 'OUT OF SYNC', 'EARLY HIT'],
  'START ON THE DOT': ['START ON THE DOT', 'WRONG START', 'OFF BEAT'],
  'LEFT THE PATH': ['LEFT THE PATH', 'OFF RAIL', 'OUT OF SYNC'],
  'RELEASED EARLY': ['RELEASED EARLY', 'TOO EARLY', 'OFF BEAT'],
  'RELEASED OFF BEAT': ['RELEASED OFF BEAT', 'OFF BEAT', 'OUT OF SYNC'],
  'NO HP': ['NO HP', 'ENERGY GONE', 'OUT OF GAS'],
}

const ELIMINATION_STAMP_GENERIC = [
  'DROPPED COMBO',
  'OFF BEAT',
  'OUT OF SYNC',
  'MISSED THE DROP',
  'TOO EARLY',
  'OUT OF GROOVE',
]

/** Map internal miss / fail caption to a punchy stamp for results / ELIMINATED overlay. */
export function eliminationStamp(internalCause) {
  const pool = ELIMINATION_STAMP_POOLS[internalCause]
  if (pool?.length) return pool[Math.floor(Math.random() * pool.length)]
  return ELIMINATION_STAMP_GENERIC[Math.floor(Math.random() * ELIMINATION_STAMP_GENERIC.length)]
}

export const BOOST_PRODUCTS = [
  { id: 'extraLife', name: 'Extra life', subtitle: 'Bank 1 free revive', price: 500, kind: 'bank' },
  { id: 'doubleCoins', name: 'Double coins', subtitle: '+3 runs 2x coins', price: 300, kind: 'charges', charges: 3 },
  { id: 'comboShield', name: 'Combo shield', subtitle: '+3 runs 1 soaker', price: 400, kind: 'charges', charges: 3 },
]

export function skinsForJudge(judgeId) {
  return JUDGES.find((judge) => judge.id === judgeId)?.skins || []
}

export const STAGES = [
  {
    id: 1,
    name: 'Tap Lesson',
    cardTitle: 'TAP LIKE A STAR',
    cardColor: '#ff4ff0',
    duration: 45,
    kinds: ['tap'],
    difficulty: 0.08,
    judgeIndex: 0,
    portraitSrc: `${ASSET_BASE}characters/BlingBeak.png`,
  },
  {
    id: 2,
    name: 'Slide Lesson',
    cardTitle: 'SLIDE OR DIE',
    cardColor: '#5ecbff',
    duration: 45,
    kinds: ['slide'],
    difficulty: 0.12,
    judgeIndex: 1,
    portraitSrc: `${ASSET_BASE}characters/stage-sprites/ferret-default.png`,
  },
  {
    id: 3,
    name: 'Hold Lesson',
    cardTitle: 'HOLD THE LINE',
    cardColor: '#fce76d',
    duration: 45,
    kinds: ['hold'],
    difficulty: 0.16,
    judgeIndex: 2,
    portraitSrc: `${ASSET_BASE}characters/stage-sprites/manatee-default.png`,
  },
  {
    id: 4,
    name: 'Mixed Pressure',
    cardTitle: 'MIXED CHAOS',
    cardColor: '#5cff7b',
    duration: 60,
    kinds: ['tap', 'slide', 'hold'],
    difficulty: 0.34,
    judgeIndex: 3,
    portraitSrc: `${ASSET_BASE}characters/stage-sprites/lemur-default.png`,
  },
  {
    id: 5,
    name: 'Chaos Finale',
    cardTitle: 'THE FINAL SHOW',
    cardColor: '#9b7dff',
    duration: 75,
    kinds: ['tap', 'slide', 'hold'],
    difficulty: 0.56,
    judgeIndex: 0,
    portraitSrc: `${ASSET_BASE}characters/stage-sprites/vulture-alt2.png`,
  },
]

/** Stage 1 always unlocked; stage N requires stage N-1 cleared (not FAILED). */
export function isStageUnlocked(save, stageId) {
  if (stageId <= 1) return true
  const g = save.stageBests[stageId - 1]?.grade
  return Boolean(g && g !== 'FAILED')
}

export function isEndlessUnlocked(save) {
  return Boolean(save.stageBests[STAGES[STAGES.length - 1].id]?.cleared)
}

export function comboMultiplier(combo) {
  if (combo >= 100) return 8
  if (combo >= 50) return 5
  if (combo >= 25) return 3
  if (combo >= 10) return 2
  return 1
}

export function gradeForAccuracy(accuracy, failed = false) {
  if (failed) return 'FAILED'
  if (accuracy >= 0.95) return 'S'
  if (accuracy >= 0.85) return 'A'
  if (accuracy >= 0.7) return 'B'
  if (accuracy >= 0.55) return 'C'
  return 'D'
}

export function gradeRank(grade) {
  return ['FAILED', 'D', 'C', 'B', 'A', 'S'].indexOf(grade)
}

export function gradeForRun(run) {
  const accuracy = run.resolvedNotes ? run.accuracyPoints / run.resolvedNotes : 0
  return gradeForAccuracy(accuracy, run.failed)
}

export function betterGrade(a, b) {
  return gradeRank(b) > gradeRank(a) ? b : a
}

export function scoreForHit(quality, combo) {
  const base = quality === 'perfect' ? 100 : quality === 'good' ? 60 : quality === 'okay' ? 30 : 0
  return base * comboMultiplier(combo)
}

export function hpDeltaForHit(quality) {
  if (quality === 'perfect') return 5
  if (quality === 'good') return 2
  if (quality === 'miss') return -15
  return 0
}

export function qualityFromTiming(errorSeconds) {
  const error = Math.abs(errorSeconds)
  if (error <= 0.075) return 'perfect'
  if (error <= 0.15) return 'good'
  if (error <= 0.25) return 'okay'
  return 'miss'
}

export function difficultyProfile(run) {
  const elapsed = run.elapsed
  const tier = run.mode === 'endless' ? Math.floor(elapsed / 30) : 0
  const stageBoost = run.mode === 'stage' ? run.stage.difficulty : 0
  if (run.ftue && run.stage?.id === 1 && run.spawnCount < 12) {
    return {
      tier,
      ramp: 0,
      spawnInterval: 1.45,
      approach: 1.38,
      slideTolerance: 58,
      holdDuration: 0.82,
      maxLiveTargets: 1,
    }
  }
  const ramp = Math.min(1, tier * 0.14 + elapsed / 180 + stageBoost)
  return {
    tier,
    ramp,
    spawnInterval: lerp(1.25, 0.52, ramp),
    approach: lerp(1.18, 0.62, ramp),
    slideTolerance: lerp(68, 44, ramp),
    holdDuration: lerp(0.82, 1.28, ramp),
    maxLiveTargets: run.mode === 'stage' && run.stage.id < 5 ? 1 : Math.min(1 + Math.floor(ramp * 3), 4),
  }
}

export function resolveTargetKind(run) {
  if (run.mode === 'stage') {
    return run.stage.kinds[run.spawnCount % run.stage.kinds.length]
  }

  const tier = Math.floor(run.elapsed / 30)
  const cycle = tier < 1 ? ['tap', 'tap', 'hold'] : tier < 2 ? ['tap', 'slide', 'tap', 'hold'] : ['tap', 'slide', 'hold', 'tap', 'slide']
  return cycle[run.spawnCount % cycle.length]
}

export function coinsForResults(run, previousStageBest) {
  if (run.ftue && !run.completed) return 0
  let coins = Math.max(5, Math.floor(run.score / 500))
  if (run.mode === 'stage' && run.completed && !previousStageBest?.cleared) coins += 50
  if (run.mode === 'stage' && run.completed && gradeRank(run.grade) > gradeRank(previousStageBest?.grade || 'FAILED')) coins += 25
  return coins
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function lerp(start, end, amount) {
  return start + (end - start) * amount
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2)
}
