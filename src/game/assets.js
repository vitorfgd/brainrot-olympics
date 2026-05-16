import { JUDGES, STAGES } from './rules.js'

const ASSET_BASE = import.meta.env.BASE_URL

const IMAGE_ASSETS = {
  background: `${ASSET_BASE}background.png`,
  homeLogo: `${ASSET_BASE}ui/home-logo.png`,
  shopLogo: `${ASSET_BASE}ui/shop-logo.png`,
  shopMan: `${ASSET_BASE}ui/shop-man.png`,
  medalsSheet: `${ASSET_BASE}ui/medals-sheet.png`,
  fireworkSheet: `${ASSET_BASE}ui/firework-sheet.png`,
  confettiLayer1: `${ASSET_BASE}ui/confetti-layer-1.png`,
  confettiLayer2: `${ASSET_BASE}ui/confetti-layer-2.png`,
  confettiLayer3: `${ASSET_BASE}ui/confetti-layer-3.png`,
  buttonPink: `${ASSET_BASE}ui/button-pink-wide.png`,
  buttonGold: `${ASSET_BASE}ui/button-gold-wide.png`,
  buttonCyan: `${ASSET_BASE}ui/button-cyan-wide.png`,
  panelCyan: `${ASSET_BASE}ui/panel-cyan-large.png`,
  footerPurple: `${ASSET_BASE}ui/footer-purple.png`,
  iconCoin: `${ASSET_BASE}icons/coin.png`,
  iconHeart: `${ASSET_BASE}icons/heart.png`,
  iconTrophy: `${ASSET_BASE}icons/trophy.png`,
  iconInfinity: `${ASSET_BASE}icons/infinity.png`,
  iconPlay: `${ASSET_BASE}icons/play.png`,
  iconSettings: `${ASSET_BASE}icons/settings.png`,
  iconBack: `${ASSET_BASE}icons/back.png`,
  iconMusic: `${ASSET_BASE}icons/music.png`,
  iconVolume: `${ASSET_BASE}icons/volume.png`,
  iconLock: `${ASSET_BASE}icons/lock.png`,
  iconGoldStar: `${ASSET_BASE}icons/gold-star.png`,
  iconEmptyStar: `${ASSET_BASE}icons/empty-star.png`,
  iconShare: `${ASSET_BASE}icons/share.png`,
  iconShield: `${ASSET_BASE}icons/shield.png`,
}

const SFX_URLS = {
  milestone: `${ASSET_BASE}audio/milestone.wav`,
  scratch: `${ASSET_BASE}audio/scratch.wav`,
}

export function createAssetManager() {
  const images = {}
  const judgeImages = {}
  const stagePortraits = {}
  const music = new Map()

  for (const [key, src] of Object.entries(IMAGE_ASSETS)) {
    images[key] = loadImage(src)
  }

  for (const judge of JUDGES) {
    judgeImages[judge.id] = {}
    for (const skin of judge.skins) {
      judgeImages[judge.id][skin.id] = loadImage(skin.imageSrc)
    }
    if (!music.has(judge.musicSrc)) {
      const audio = new Audio(judge.musicSrc)
      audio.loop = true
      audio.volume = 0.22
      music.set(judge.musicSrc, audio)
    }
  }

  for (const stage of STAGES) {
    if (stage.portraitSrc) stagePortraits[stage.id] = loadImage(stage.portraitSrc)
  }

  let activeAudio = null

  return {
    images,
    judgeImages,
    stagePortraits,
    startMusic(judge, enabled) {
      if (!enabled) return
      const next = music.get(judge.musicSrc)
      if (!next) return
      if (activeAudio && activeAudio !== next) {
        activeAudio.pause()
        activeAudio.currentTime = 0
      }
      activeAudio = next
      activeAudio.play().catch(() => {})
    },
    stopMusic() {
      if (!activeAudio) return
      activeAudio.pause()
      activeAudio.currentTime = 0
      activeAudio = null
    },
    setMusicEnabled(enabled) {
      if (!enabled) this.stopMusic()
    },
    playSfx(name, enabled) {
      if (!enabled) return
      const url = SFX_URLS[name]
      if (!url) return
      const clip = new Audio(url)
      clip.volume = 0.34
      clip.play().catch(() => {})
    },
  }
}

function loadImage(src) {
  const image = new Image()
  image.src = src
  return image
}
