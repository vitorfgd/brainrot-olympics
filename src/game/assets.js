import { JUDGES, STAGES } from './rules.js'
import { IMAGE_ASSETS, MENU_MUSIC_URLS, SFX_URLS, SFX_VOLUMES } from './assetsManifest.js'

const RUN_MUSIC_VOLUME = 0.18
const MENU_MUSIC_VOLUME = 0.03

export function createAssetManager() {
  const images = {}
  const judgeImages = {}
  const stagePortraits = {}
  const music = new Map()
  const menuPlaylist = MENU_MUSIC_URLS.map((url) => {
    const audio = new Audio(url)
    audio.loop = false
    audio.volume = MENU_MUSIC_VOLUME
    return audio
  })

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
      audio.volume = RUN_MUSIC_VOLUME
      music.set(judge.musicSrc, audio)
    }
  }

  for (const stage of STAGES) {
    if (stage.portraitSrc) stagePortraits[stage.id] = loadImage(stage.portraitSrc)
  }

  let activeAudio = null
  let activeMenuAudio = null
  let runMusicBlocked = false
  let menuMusicActive = false
  let menuMusicBlocked = false
  let menuMusicWanted = false
  let menuOrder = []
  let menuOrderIndex = 0
  let lastMenuTrackIndex = -1

  for (let i = 0; i < menuPlaylist.length; i += 1) {
    menuPlaylist[i].addEventListener('ended', () => {
      if (!menuMusicWanted || activeAudio) return
      menuMusicActive = false
      playNextMenuTrack()
    })
  }

  function stopMenuMusic() {
    menuMusicWanted = false
    menuMusicBlocked = false
    if (!menuMusicActive) return
    activeMenuAudio?.pause()
    if (activeMenuAudio) activeMenuAudio.currentTime = 0
    activeMenuAudio = null
    menuMusicActive = false
  }

  function playNextMenuTrack() {
    if (!menuMusicWanted || activeAudio || menuMusicBlocked || !menuPlaylist.length) return
    const index = nextMenuTrackIndex()
    const audio = menuPlaylist[index]
    activeMenuAudio?.pause()
    if (activeMenuAudio) activeMenuAudio.currentTime = 0
    activeMenuAudio = audio
    activeMenuAudio.currentTime = 0
    activeMenuAudio.volume = MENU_MUSIC_VOLUME
    menuMusicActive = true
    activeMenuAudio.play().catch(() => {
      menuMusicActive = false
      menuMusicBlocked = true
    })
  }

  function nextMenuTrackIndex() {
    if (menuOrderIndex >= menuOrder.length) {
      menuOrder = shuffledIndices(menuPlaylist.length)
      menuOrderIndex = 0
      if (menuOrder.length > 1 && menuOrder[0] === lastMenuTrackIndex) {
        const swap = 1 + Math.floor(Math.random() * (menuOrder.length - 1))
        ;[menuOrder[0], menuOrder[swap]] = [menuOrder[swap], menuOrder[0]]
      }
    }
    const index = menuOrder[menuOrderIndex]
    menuOrderIndex += 1
    lastMenuTrackIndex = index
    return index
  }

  return {
    images,
    judgeImages,
    stagePortraits,
    startMenuMusic(enabled) {
      menuMusicWanted = Boolean(enabled)
      if (!enabled || activeAudio) {
        if (!enabled) stopMenuMusic()
        return
      }
      if (menuMusicActive || menuMusicBlocked) return
      playNextMenuTrack()
    },
    stopMenuMusic,
    unlockAudio() {
      if (activeAudio && (activeAudio.paused || runMusicBlocked)) {
        runMusicBlocked = false
        activeAudio.play().catch(() => {
          runMusicBlocked = true
        })
      }
      if (menuMusicBlocked && menuMusicWanted && !activeAudio) {
        menuMusicBlocked = false
        this.startMenuMusic(true)
      }
    },
    startMusic(judge, enabled) {
      if (!enabled) return
      stopMenuMusic()
      const next = music.get(judge.musicSrc)
      if (!next) return
      if (activeAudio && activeAudio !== next) {
        activeAudio.pause()
        activeAudio.currentTime = 0
      }
      activeAudio = next
      runMusicBlocked = false
      activeAudio.play().catch(() => {
        runMusicBlocked = true
      })
    },
    stopMusic() {
      if (!activeAudio) return
      activeAudio.pause()
      activeAudio.currentTime = 0
      activeAudio = null
      runMusicBlocked = false
    },
    setMusicEnabled(enabled) {
      if (!enabled) {
        this.stopMusic()
        stopMenuMusic()
      }
    },
    playSfx(name, enabled, volumeScale = 1) {
      if (!enabled) return
      const url = SFX_URLS[name] || SFX_URLS.click
      if (!url) return
      const clip = new Audio(url)
      clip.volume = Math.max(0, Math.min(1, (SFX_VOLUMES[name] ?? 0.34) * volumeScale))
      clip.play().catch(() => {})
    },
  }
}

function loadImage(src) {
  const image = new Image()
  image.src = src
  return image
}

function shuffledIndices(length) {
  const indices = Array.from({ length }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices
}
