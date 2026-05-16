import { JUDGES, STAGES } from './rules.js'
import {
  IMAGE_ASSETS,
  MENU_MUSIC_URLS,
  PRELOAD_SFX,
  SFX_POOL_SIZES,
  SFX_URLS,
  SFX_VOLUMES,
} from './assetsManifest.js'

const RUN_MUSIC_VOLUME = 0.18
const MENU_MUSIC_VOLUME = 0.03
const RUN_MUSIC_FADE_SECONDS = 0.5
const RUN_MUSIC_FADE_STEP_MS = 40
const HAVE_FUTURE_DATA = 2

export function createAssetManager() {
  const images = {}
  const judgeImages = {}
  const stagePortraits = {}
  const music = new Map()
  const audioByUrl = new Map()
  const sfxPools = new Map()
  const sfxPoolCursor = new Map()

  function preloadAudio(url) {
    if (!url || audioByUrl.has(url)) return audioByUrl.get(url)
    const audio = new Audio(url)
    audio.preload = 'auto'
    audio.load()
    audioByUrl.set(url, audio)
    return audio
  }

  function audioForUrl(url) {
    if (!audioByUrl.has(url)) preloadAudio(url)
    return audioByUrl.get(url)
  }

  const allMusicUrls = [...new Set([...MENU_MUSIC_URLS, ...JUDGES.map((judge) => judge.musicSrc)])]
  for (const url of allMusicUrls) preloadAudio(url)

  const menuPlaylist = MENU_MUSIC_URLS.map((url) => audioForUrl(url))

  for (const [key, src] of Object.entries(IMAGE_ASSETS)) {
    images[key] = loadImage(src)
  }

  for (const judge of JUDGES) {
    judgeImages[judge.id] = {}
    for (const skin of judge.skins) {
      judgeImages[judge.id][skin.id] = loadImage(skin.imageSrc)
    }
    if (!music.has(judge.musicSrc)) music.set(judge.musicSrc, audioForUrl(judge.musicSrc))
  }

  for (const stage of STAGES) {
    if (stage.portraitSrc) stagePortraits[stage.id] = loadImage(stage.portraitSrc)
  }

  for (const name of PRELOAD_SFX) {
    const url = SFX_URLS[name]
    if (!url) continue
    const size = SFX_POOL_SIZES[name] ?? 1
    sfxPools.set(
      name,
      Array.from({ length: size }, () => {
        const audio = new Audio(url)
        audio.preload = 'auto'
        audio.load()
        return audio
      }),
    )
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
  const fadeTimers = new WeakMap()

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
    activeMenuAudio.loop = false
    activeMenuAudio.currentTime = 0
    activeMenuAudio.volume = MENU_MUSIC_VOLUME
    menuMusicActive = true
    playWhenReady(activeMenuAudio, () => {
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

  function stopAudioFade(audio) {
    const timer = fadeTimers.get(audio)
    if (!timer) return
    clearInterval(timer)
    fadeTimers.delete(audio)
  }

  function fadeAudioVolume(audio, to, seconds = RUN_MUSIC_FADE_SECONDS, onDone) {
    if (!audio) return
    stopAudioFade(audio)
    const from = audio.volume
    const startedAt = performance.now()
    const duration = Math.max(1, seconds * 1000)
    const timer = setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / duration)
      audio.volume = from + (to - from) * progress
      if (progress >= 1) {
        clearInterval(timer)
        fadeTimers.delete(audio)
        audio.volume = to
        onDone?.()
      }
    }, RUN_MUSIC_FADE_STEP_MS)
    fadeTimers.set(audio, timer)
  }

  function fadeOutRunAudio(audio) {
    if (!audio) return
    fadeAudioVolume(audio, 0, RUN_MUSIC_FADE_SECONDS, () => {
      audio.pause()
      audio.currentTime = 0
    })
  }

  function playRunMusic(fadeIn = false) {
    if (!activeAudio) return
    stopAudioFade(activeAudio)
    activeAudio.loop = true
    activeAudio.volume = fadeIn ? 0 : RUN_MUSIC_VOLUME
    playWhenReady(activeAudio, () => {
      runMusicBlocked = true
    })
    if (fadeIn) fadeAudioVolume(activeAudio, RUN_MUSIC_VOLUME)
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
        playRunMusic()
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
      const previous = activeAudio
      if (previous && previous !== next) {
        fadeOutRunAudio(previous)
      }
      activeAudio = next
      runMusicBlocked = false
      if (previous !== next) activeAudio.currentTime = 0
      playRunMusic(previous !== next)
    },
    stopMusic() {
      if (!activeAudio) return
      const previous = activeAudio
      activeAudio = null
      runMusicBlocked = false
      fadeOutRunAudio(previous)
    },
    setMusicEnabled(enabled) {
      if (!enabled) {
        this.stopMusic()
        stopMenuMusic()
      }
    },
    playSfx(name, enabled, volumeScale = 1) {
      if (!enabled) return
      const resolved = SFX_URLS[name] ? name : 'click'
      const volume = Math.max(0, Math.min(1, (SFX_VOLUMES[resolved] ?? 0.34) * volumeScale))
      const pool = sfxPools.get(resolved)
      if (pool?.length) {
        const index = sfxPoolCursor.get(resolved) ?? 0
        sfxPoolCursor.set(resolved, (index + 1) % pool.length)
        const clip = pool[index]
        clip.pause()
        clip.currentTime = 0
        clip.volume = volume
        clip.play().catch(() => {})
        return
      }
      const url = SFX_URLS[resolved]
      if (!url) return
      const clip = new Audio(url)
      clip.volume = volume
      clip.play().catch(() => {})
    },
  }
}

function playWhenReady(audio, onFail) {
  const attempt = () => {
    audio.play().catch(() => onFail?.())
  }
  if (audio.readyState >= HAVE_FUTURE_DATA) attempt()
  else audio.addEventListener('canplay', attempt, { once: true })
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
