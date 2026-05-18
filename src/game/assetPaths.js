import { AssetIds, JudgeImageUrls, StagePortraitUrls } from './assetIds.js'

export const IMAGE_ASSET_PATHS = {
  background: 'background.png',
  homeLogo: 'ui/home-logo.png',
  shopLogo: 'ui/shop-logo.png',
  shopMan: 'ui/shop-man.png',
  shopSpeechBubble: 'ui/shop-speech-bubble.png',
  'stage.ferret.default': 'characters/stage-sprites/ferret-default.png',
  'stage.ferret.alt1': 'characters/stage-sprites/ferret-alt1.png',
  'stage.ferret.alt2': 'characters/stage-sprites/ferret-alt2.png',
  'stage.manatee.default': 'characters/stage-sprites/manatee-default.png',
  'stage.manatee.alt1': 'characters/stage-sprites/manatee-alt1.png',
  'stage.manatee.alt2': 'characters/stage-sprites/manatee-alt2.png',
  'stage.lemur.default': 'characters/stage-sprites/lemur-default.png',
  'stage.lemur.alt1': 'characters/stage-sprites/lemur-alt1.png',
  'stage.lemur.alt2': 'characters/stage-sprites/lemur-alt2.png',
  'stage.vulture.default': 'characters/stage-sprites/vulture-default.png',
  'stage.vulture.alt1': 'characters/stage-sprites/vulture-alt1.png',
  'stage.vulture.alt2': 'characters/stage-sprites/vulture-alt2.png',
  medalsSheet: 'ui/medals-sheet.png',
  confettiLayer1: 'ui/confetti-layer-1.png',
  confettiLayer2: 'ui/confetti-layer-2.png',
  confettiLayer3: 'ui/confetti-layer-3.png',
  buttonPink: 'ui/button-pink-wide.png',
  buttonGold: 'ui/button-gold-wide.png',
  buttonCyan: 'ui/button-cyan-wide.png',
  panelCyan: 'ui/panel-cyan-large.png',
  footerPurple: 'ui/footer-purple.png',
  iconCoin: 'icons/coin.png',
  iconShop: 'icons/shop.png',
  iconHeart: 'icons/heart.png',
  iconTrophy: 'icons/trophy.png',
  iconInfinity: 'icons/infinity.png',
  iconPlay: 'icons/play.png',
  iconSettings: 'icons/settings.png',
  iconBack: 'icons/back.png',
  iconMusic: 'icons/music.png',
  iconVolume: 'icons/volume.png',
  iconLock: 'icons/lock.png',
  iconShare: 'icons/share.png',
  iconShield: 'icons/shield.png',
}

export const SFX_ASSET_PATHS = {
  cancelClick: 'audio/cancel-click.ogg',
  click: 'audio/click.ogg',
  coinCountTick: 'audio/coin-count-tick.ogg',
  coinRewardBurst: 'audio/coin-reward-burst.ogg',
  combo10: 'audio/combo-10.ogg',
  combo25Plus: 'audio/combo-25-plus.ogg',
  countdownTick: 'audio/countdown-tick.ogg',
  gradeReveal: 'audio/grade-reveal.ogg',
  hitGood: 'audio/hit-good.ogg',
  hitMiss: 'audio/hit-miss.ogg',
  hitOkay: 'audio/hit-okay.ogg',
  judgeReactNegative: 'audio/judge-react-negative.ogg',
  judgeReactPositive: 'audio/judge-react-positive.ogg',
  medalPop: 'audio/medal-pop.ogg',
  milestone: 'audio/milestone.wav',
  purchaseSuccess: 'audio/purchase-success.ogg',
  runFailed: 'audio/run-failed.ogg',
  scratch: 'audio/scratch.wav',
  stageClear: 'audio/stage-clear.ogg',
  targetSpawn: 'audio/target-spawn.ogg',
}

export const MENU_MUSIC_ASSET_PATHS = [
  'audio/blingbeak_long_ride.ogg',
  'audio/disco_ataca.ogg',
  'audio/coolman_too_much_burrito.ogg',
  'audio/dj_baby_baby_sped_up.ogg',
]

export const MUSIC_ASSET_PATHS_BY_ID = {
  [AssetIds.music.blingbeak]: 'audio/blingbeak_long_ride.ogg',
  [AssetIds.music.disco]: 'audio/disco_ataca.ogg',
  [AssetIds.music.coolman]: 'audio/coolman_too_much_burrito.ogg',
  [AssetIds.music.dj]: 'audio/dj_baby_baby_sped_up.ogg',
}

export const JUDGE_IMAGE_PATHS_BY_ID = JudgeImageUrls
export const STAGE_PORTRAIT_PATHS_BY_ID = StagePortraitUrls
