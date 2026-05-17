import {
  IMAGE_ASSET_PATHS,
  JUDGE_IMAGE_PATHS_BY_ID,
  MENU_MUSIC_ASSET_PATHS,
  MUSIC_ASSET_PATHS_BY_ID,
  SFX_ASSET_PATHS,
  STAGE_PORTRAIT_PATHS_BY_ID,
} from './assetPaths.js'

const ASSET_BASE = import.meta.env.BASE_URL

function withAssetBase(paths) {
  return Object.fromEntries(Object.entries(paths).map(([id, path]) => [id, `${ASSET_BASE}${path}`]))
}

export const IMAGE_ASSETS = withAssetBase(IMAGE_ASSET_PATHS)

export const SFX_URLS = withAssetBase(SFX_ASSET_PATHS)

export const SFX_VOLUMES = {
  click: 0.28,
  cancelClick: 0.28,
  targetSpawn: 0.18,
  hitOkay: 0.32,
  hitGood: 0.34,
  hitMiss: 0.34,
  combo10: 0.38,
  combo25Plus: 0.4,
  countdownTick: 0.52,
  purchaseSuccess: 0.36,
  coinRewardBurst: 0.38,
  coinCountTick: 0.24,
  gradeReveal: 0.34,
  medalPop: 0.36,
  stageClear: 0.42,
  runFailed: 0.42,
  judgeReactPositive: 0.24,
  judgeReactNegative: 0.24,
}

export const MENU_MUSIC_URLS = MENU_MUSIC_ASSET_PATHS.map((path) => `${ASSET_BASE}${path}`)

export const MUSIC_URLS_BY_ID = withAssetBase(MUSIC_ASSET_PATHS_BY_ID)

export const JUDGE_IMAGE_URLS_BY_ID = withAssetBase(JUDGE_IMAGE_PATHS_BY_ID)

export const STAGE_PORTRAIT_URLS_BY_ID = withAssetBase(STAGE_PORTRAIT_PATHS_BY_ID)

/** SFX warmed at boot (FTUE run + results + common UI). */
export const PRELOAD_SFX = [
  'countdownTick',
  'targetSpawn',
  'hitGood',
  'hitOkay',
  'hitMiss',
  'judgeReactPositive',
  'judgeReactNegative',
  'stageClear',
  'runFailed',
  'click',
  'cancelClick',
  'gradeReveal',
  'medalPop',
  'coinCountTick',
  'coinRewardBurst',
]

/** Extra pooled instances for sounds that can overlap. */
export const SFX_POOL_SIZES = {
  hitGood: 2,
  hitOkay: 2,
  hitMiss: 2,
  targetSpawn: 2,
}
