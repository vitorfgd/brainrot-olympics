# Brainrot Beat MHS Starter

This folder is a copy-ready starting point for the Meta Horizon Studio port. It is not imported by the browser build.

## First Smoke: Green Rectangle

1. Copy `mhs-starter/scripts` into the MHS project `scripts/` folder.
2. Copy `mhs-starter/xaml/game.xaml` into the MHS project `xaml/` folder.
3. Create a Custom UI entity with logical size `540 x 960`.
4. Bind the Custom UI data context to `CanvasViewModel`.
5. In `GameComponent`, call `renderGreenSmoke()` and confirm the DrawingSurface fills with green.

Fix XAML, namespaces, and data context before porting gameplay if this smoke fails.

## Second Smoke: Fixture Rendering

Use `docs/render-state-fixtures.json` as temporary debug data. Render one fixture key at a time through `Rendering.ts` before wiring live gameplay:

- `home`
- `levels`
- `leaderboard`
- `shop`
- `settings`
- `boostSelect`
- `runCountdown`
- `runPlaying`
- `runContinueOffer`
- `resultsComplete`
- `resultsFailed`

## Assets

Copy browser assets from `public/` into:

- `sprites/` for images.
- `assets/sounds/` for SFX and music.

Keep asset IDs identical to the browser IDs in `Assets.ts`. If a path changes, update `Assets.ts` and the browser-side `docs/mhs-asset-map.md` together.

## Port Order

1. Green rectangle XAML smoke.
2. Static assets in `Assets.ts`.
3. Type contracts and constants.
4. Event queue.
5. Renderer facade with fixture playback only.
6. Render fixture screens one by one.
7. Save hydration and initial state creation.
8. Screen UI actions and menu navigation.
9. Run update, targets, and effects.
10. Audio event consumption.
11. Persistence.
12. Full gameplay smoke: FTUE, stages, endless, shop, settings, leaderboard, results.

## Browser Pre-Port Checks

Run these in the browser repo before copying updated files into MHS:

```bash
npm run smoke:port
npm run smoke:assets
npm run smoke:render-state
npm run smoke:renderer
npm run smoke:mhs-scaffold
npm run smoke:mhs-starter
npm run build
```
