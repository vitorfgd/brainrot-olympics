# MHS Asset Map

Use this as the starting point for future MHS `Assets.ts` static declarations.
Browser paths are relative to `public/`. MHS paths should become static string literals such as `new TextureAsset("@sprites/ui/home-logo.png")`.
The source of truth for browser-relative paths is `src/game/assetPaths.js`; run `npm run smoke:assets` after changing assets.

## Core UI Images

| Asset ID | Browser path | Future MHS path |
|---|---|---|
| `background` | `background.png` | `@sprites/background.png` |
| `homeLogo` | `ui/home-logo.png` | `@sprites/ui/home-logo.png` |
| `shopLogo` | `ui/shop-logo.png` | `@sprites/ui/shop-logo.png` |
| `shopMan` | `ui/shop-man.png` | `@sprites/ui/shop-man.png` |
| `shopSpeechBubble` | `ui/shop-speech-bubble.png` | `@sprites/ui/shop-speech-bubble.png` |
| `medalsSheet` | `ui/medals-sheet.png` | `@sprites/ui/medals-sheet.png` |
| `confettiLayer1` | `ui/confetti-layer-1.png` | `@sprites/ui/confetti-layer-1.png` |
| `confettiLayer2` | `ui/confetti-layer-2.png` | `@sprites/ui/confetti-layer-2.png` |
| `confettiLayer3` | `ui/confetti-layer-3.png` | `@sprites/ui/confetti-layer-3.png` |
| `buttonPink` | `ui/button-pink-wide.png` | `@sprites/ui/button-pink-wide.png` |
| `buttonGold` | `ui/button-gold-wide.png` | `@sprites/ui/button-gold-wide.png` |
| `buttonCyan` | `ui/button-cyan-wide.png` | `@sprites/ui/button-cyan-wide.png` |
| `panelCyan` | `ui/panel-cyan-large.png` | `@sprites/ui/panel-cyan-large.png` |
| `footerPurple` | `ui/footer-purple.png` | `@sprites/ui/footer-purple.png` |

## Icons

| Asset ID | Browser path | Future MHS path |
|---|---|---|
| `iconCoin` | `icons/coin.png` | `@sprites/icons/coin.png` |
| `iconShop` | `icons/shop.png` | `@sprites/icons/shop.png` |
| `iconHeart` | `icons/heart.png` | `@sprites/icons/heart.png` |
| `iconTrophy` | `icons/trophy.png` | `@sprites/icons/trophy.png` |
| `iconInfinity` | `icons/infinity.png` | `@sprites/icons/infinity.png` |
| `iconPlay` | `icons/play.png` | `@sprites/icons/play.png` |
| `iconSettings` | `icons/settings.png` | `@sprites/icons/settings.png` |
| `iconBack` | `icons/back.png` | `@sprites/icons/back.png` |
| `iconMusic` | `icons/music.png` | `@sprites/icons/music.png` |
| `iconVolume` | `icons/volume.png` | `@sprites/icons/volume.png` |
| `iconLock` | `icons/lock.png` | `@sprites/icons/lock.png` |
| `iconShare` | `icons/share.png` | `@sprites/icons/share.png` |
| `iconShield` | `icons/shield.png` | `@sprites/icons/shield.png` |

## Judge And Skin Images

| Asset ID | Browser path | Future MHS path |
|---|---|---|
| `judge.blingbeak.default` | `characters/BlingBeak.png` | `@sprites/characters/BlingBeak.png` |
| `judge.blingbeak.partyhat` | `characters/Partyhat.png` | `@sprites/characters/Partyhat.png` |
| `judge.blingbeak.maverick` | `characters/Maverick.png` | `@sprites/characters/Maverick.png` |
| `judge.disco.default` | `characters/Headband.png` | `@sprites/characters/Headband.png` |
| `judge.disco.disco` | `characters/Disco.png` | `@sprites/characters/Disco.png` |
| `judge.disco.galaxy_brain` | `characters/Galaxy_Brain.png` | `@sprites/characters/Galaxy_Brain.png` |
| `judge.coolman.default` | `characters/CoolMan.png` | `@sprites/characters/CoolMan.png` |
| `judge.coolman.king` | `characters/King.png` | `@sprites/characters/King.png` |
| `judge.coolman.dolphin` | `characters/Dolphin.png` | `@sprites/characters/Dolphin.png` |
| `judge.dj.default` | `characters/DJ.png` | `@sprites/characters/DJ.png` |
| `judge.dj.punk` | `characters/Punk.png` | `@sprites/characters/Punk.png` |
| `judge.dj.lab_coat` | `characters/Lab_Coat.png` | `@sprites/characters/Lab_Coat.png` |

## Stage Portraits

| Asset ID | Browser path | Future MHS path |
|---|---|---|
| `stage.1.portrait` | `characters/BlingBeak.png` | `@sprites/characters/BlingBeak.png` |
| `stage.2.portrait` | `characters/stage-sprites/ferret-default.png` | `@sprites/characters/stage-sprites/ferret-default.png` |
| `stage.3.portrait` | `characters/stage-sprites/manatee-default.png` | `@sprites/characters/stage-sprites/manatee-default.png` |
| `stage.4.portrait` | `characters/stage-sprites/lemur-default.png` | `@sprites/characters/stage-sprites/lemur-default.png` |
| `stage.5.portrait` | `characters/stage-sprites/vulture-alt2.png` | `@sprites/characters/stage-sprites/vulture-alt2.png` |

## Music

| Music ID | Browser path | Future MHS sound name |
|---|---|---|
| `music.blingbeak` | `audio/blingbeak_long_ride.ogg` | `MusicBlingbeak` |
| `music.disco` | `audio/disco_ataca.ogg` | `MusicDisco` |
| `music.coolman` | `audio/coolman_too_much_burrito.ogg` | `MusicCoolman` |
| `music.dj` | `audio/dj_baby_baby_sped_up.ogg` | `MusicDj` |

## SFX

| SFX ID | Browser path | Future MHS sound name |
|---|---|---|
| `cancelClick` | `audio/cancel-click.ogg` | `CancelClick` |
| `click` | `audio/click.ogg` | `Click` |
| `coinCountTick` | `audio/coin-count-tick.ogg` | `CoinCountTick` |
| `coinRewardBurst` | `audio/coin-reward-burst.ogg` | `CoinRewardBurst` |
| `combo10` | `audio/combo-10.ogg` | `Combo10` |
| `combo25Plus` | `audio/combo-25-plus.ogg` | `Combo25Plus` |
| `countdownTick` | `audio/countdown-tick.ogg` | `CountdownTick` |
| `gradeReveal` | `audio/grade-reveal.ogg` | `GradeReveal` |
| `hitGood` | `audio/hit-good.ogg` | `HitGood` |
| `hitMiss` | `audio/hit-miss.ogg` | `HitMiss` |
| `hitOkay` | `audio/hit-okay.ogg` | `HitOkay` |
| `judgeReactNegative` | `audio/judge-react-negative.ogg` | `JudgeReactNegative` |
| `judgeReactPositive` | `audio/judge-react-positive.ogg` | `JudgeReactPositive` |
| `medalPop` | `audio/medal-pop.ogg` | `MedalPop` |
| `milestone` | `audio/milestone.wav` | `Milestone` |
| `purchaseSuccess` | `audio/purchase-success.ogg` | `PurchaseSuccess` |
| `runFailed` | `audio/run-failed.ogg` | `RunFailed` |
| `scratch` | `audio/scratch.wav` | `Scratch` |
| `stageClear` | `audio/stage-clear.ogg` | `StageClear` |
| `targetSpawn` | `audio/target-spawn.ogg` | `TargetSpawn` |
