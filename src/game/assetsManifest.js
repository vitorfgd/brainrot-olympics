import { AssetIds, JudgeImageUrls, StagePortraitUrls } from './assetIds.js'

const ASSET_BASE = import.meta.env.BASE_URL

export const IMAGE_ASSETS = {
  background: `${ASSET_BASE}background.png`,
  homeLogo: `${ASSET_BASE}ui/home-logo.png`,
  shopLogo: `${ASSET_BASE}ui/shop-logo.png`,
  shopMan: `${ASSET_BASE}ui/shop-man.png`,
  shopSpeechBubble: `${ASSET_BASE}ui/shop-speech-bubble.png`,
  medalsSheet: `${ASSET_BASE}ui/medals-sheet.png`,
  confettiLayer1: `${ASSET_BASE}ui/confetti-layer-1.png`,
  confettiLayer2: `${ASSET_BASE}ui/confetti-layer-2.png`,
  confettiLayer3: `${ASSET_BASE}ui/confetti-layer-3.png`,
  buttonPink: `${ASSET_BASE}ui/button-pink-wide.png`,
  buttonGold: `${ASSET_BASE}ui/button-gold-wide.png`,
  buttonCyan: `${ASSET_BASE}ui/button-cyan-wide.png`,
  panelCyan: `${ASSET_BASE}ui/panel-cyan-large.png`,
  footerPurple: `${ASSET_BASE}ui/footer-purple.png`,
  iconCoin: `${ASSET_BASE}icons/coin.png`,
  iconShop: `${ASSET_BASE}icons/shop.png`,
  iconHeart: `${ASSET_BASE}icons/heart.png`,
  iconTrophy: `${ASSET_BASE}icons/trophy.png`,
  iconInfinity: `${ASSET_BASE}icons/infinity.png`,
  iconPlay: `${ASSET_BASE}icons/play.png`,
  iconSettings: `${ASSET_BASE}icons/settings.png`,
  iconBack: `${ASSET_BASE}icons/back.png`,
  iconMusic: `${ASSET_BASE}icons/music.png`,
  iconVolume: `${ASSET_BASE}icons/volume.png`,
  iconLock: `${ASSET_BASE}icons/lock.png`,
  iconShare: `${ASSET_BASE}icons/share.png`,
  iconShield: `${ASSET_BASE}icons/shield.png`,
}

export const SFX_URLS = {
  cancelClick: `${ASSET_BASE}audio/cancel-click.ogg`,
  click: `${ASSET_BASE}audio/click.ogg`,
  coinCountTick: `${ASSET_BASE}audio/coin-count-tick.ogg`,
  coinRewardBurst: `${ASSET_BASE}audio/coin-reward-burst.ogg`,
  combo10: `${ASSET_BASE}audio/combo-10.ogg`,
  combo25Plus: `${ASSET_BASE}audio/combo-25-plus.ogg`,
  countdownTick: `${ASSET_BASE}audio/countdown-tick.ogg`,
  gradeReveal: `${ASSET_BASE}audio/grade-reveal.ogg`,
  hitGood: `${ASSET_BASE}audio/hit-good.ogg`,
  hitMiss: `${ASSET_BASE}audio/hit-miss.ogg`,
  hitOkay: `${ASSET_BASE}audio/hit-okay.ogg`,
  judgeReactNegative: `${ASSET_BASE}audio/judge-react-negative.ogg`,
  judgeReactPositive: `${ASSET_BASE}audio/judge-react-positive.ogg`,
  medalPop: `${ASSET_BASE}audio/medal-pop.ogg`,
  milestone: `${ASSET_BASE}audio/milestone.wav`,
  purchaseSuccess: `${ASSET_BASE}audio/purchase-success.ogg`,
  runFailed: `${ASSET_BASE}audio/run-failed.ogg`,
  scratch: `${ASSET_BASE}audio/scratch.wav`,
  stageClear: `${ASSET_BASE}audio/stage-clear.ogg`,
  targetSpawn: `${ASSET_BASE}audio/target-spawn.ogg`,
}

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

export const MENU_MUSIC_URLS = [
  `${ASSET_BASE}audio/blingbeak_long_ride.ogg`,
  `${ASSET_BASE}audio/disco_ataca.ogg`,
  `${ASSET_BASE}audio/coolman_too_much_burrito.ogg`,
  `${ASSET_BASE}audio/dj_baby_baby_sped_up.ogg`,
]

export const MUSIC_URLS_BY_ID = {
  [AssetIds.music.blingbeak]: `${ASSET_BASE}audio/blingbeak_long_ride.ogg`,
  [AssetIds.music.disco]: `${ASSET_BASE}audio/disco_ataca.ogg`,
  [AssetIds.music.coolman]: `${ASSET_BASE}audio/coolman_too_much_burrito.ogg`,
  [AssetIds.music.dj]: `${ASSET_BASE}audio/dj_baby_baby_sped_up.ogg`,
}

export const JUDGE_IMAGE_URLS_BY_ID = Object.fromEntries(
  Object.entries(JudgeImageUrls).map(([id, path]) => [id, `${ASSET_BASE}${path}`]),
)

export const STAGE_PORTRAIT_URLS_BY_ID = Object.fromEntries(
  Object.entries(StagePortraitUrls).map(([id, path]) => [id, `${ASSET_BASE}${path}`]),
)

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
