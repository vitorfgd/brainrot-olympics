# MHS Port Scaffold

This is the handoff plan for creating the Meta Horizon Studio version. The browser project stays the source of truth until the port is alive; use this document to create the first MHS project without reverse-engineering the canvas code.

## First Milestone: Empty Canvas Works

Create this flat layout in the MHS project:

```text
scripts/
  Assets.ts
  Constants.ts
  Types.ts
  GameEvents.ts
  Rendering.ts
  AudioComponent.ts
  CanvasViewModel.ts
  GameComponent.ts
sprites/
  background.png
  ui/
  icons/
  characters/
assets/
  sounds/
xaml/
  game.xaml
```

Set the Custom UI logical design size to `540 x 960`. Before porting gameplay, render only a green rectangle through the `DrawingSurface`. If this fails, fix XAML/data binding before touching game logic.

```xml
<ui:CustomUiView
  xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
  xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
  xmlns:local="using:MetaHorizon.Drawing"
  Width="540"
  Height="960">
  <local:DrawingSurface Commands="{Binding drawCommands}" />
</ui:CustomUiView>
```

```ts
const builder = new DrawingCommandsBuilder(540, 960);
builder.fillRect(0, 0, 540, 960, "#00ff00");
this.viewModel.drawCommands = builder.build();
```

## File Responsibilities

`Constants.ts`
- Port `LOGICAL_WIDTH`, `LOGICAL_HEIGHT`, playfield bounds, HP constants, continue constants, and color constants used across rendering.
- Keep constants numeric/string-only.

`Types.ts`
- Start from [mhs-types-contract.md](C:\Users\Vitor\Documents\Meta\brain-rot-olympics-base\docs\mhs-types-contract.md).
- Keep platform fields out of core state. No DOM, canvas context, audio object, or localStorage equivalent in `GameState`.

`Assets.ts`
- Start from [mhs-asset-map.md](C:\Users\Vitor\Documents\Meta\brain-rot-olympics-base\docs\mhs-asset-map.md).
- Declare static `TextureAsset("@sprites/...")` and sound component names with the existing stable IDs.
- Keep asset IDs identical to browser IDs.

`GameEvents.ts`
- Port the event queue from `src/game/events.js`.
- MHS systems consume events after each update: audio, save, screen change, and lifecycle.

`Rendering.ts`
- Mirror `src/game/canvasRenderer.js` first: clear, push/pop, translate, scale, rotate, alpha, rect, rounded rect, circle, ellipse, line, image, text.
- Convert `RenderState` fixtures into drawing commands before wiring live gameplay.

`AudioComponent.ts`
- Own all MHS `SoundComponent` playback.
- Consume `soundRequested`, `musicRequested`, and `musicSettingChanged`.
- Keep run music and menu music fade logic here, not in gameplay rules.

`CanvasViewModel.ts`
- Holds the command array/binding target for `DrawingSurface`.
- Should not know gameplay rules.

`GameComponent.ts`
- Owns the game loop, save load/save, focused input conversion, event draining, audio component calls, and render submission.
- Converts MHS touches/focused UI into `GameInputCommand`, especially `uiAction`.

## Port Order

1. Green rectangle XAML smoke.
2. Static asset declarations in `Assets.ts`.
3. Type contracts and constants.
4. Event queue.
5. Renderer facade with fixture playback only.
6. Render `docs/render-state-fixtures.json` screens one by one.
7. Port save hydration and initial state creation.
8. Port screen UI actions and menu navigation.
9. Port run update/targets/effects.
10. Port audio event consumption.
11. Port persistence.
12. Full gameplay smoke: FTUE, stages, endless, shop, settings, leaderboard, results.

## Fixture-First Rendering

Before live gameplay, copy [render-state-fixtures.json](C:\Users\Vitor\Documents\Meta\brain-rot-olympics-base\docs\render-state-fixtures.json) into the MHS project as temporary debug data. Add a debug switch that renders one fixture key at a time:

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

This gives the renderer a stable target while gameplay is still being ported.

## Input Mapping

Map MHS pointer/touch data to:

```ts
{ type: "pointerDown", x, y, pointerId }
{ type: "pointerMove", x, y, pointerId }
{ type: "pointerUp", x, y, pointerId }
{ type: "pointerCancel", x, y, pointerId }
```

Map focused buttons and non-canvas UI to:

```ts
{ type: "uiAction", actionId: "stageSelect" }
{ type: "uiAction", actionId: "stage:3" }
{ type: "uiAction", actionId: "tryAgain" }
```

Do not synthesize fake pointer coordinates for UI buttons in MHS.

## Save Shape

Persist the `SaveState` shape from [mhs-types-contract.md](C:\Users\Vitor\Documents\Meta\brain-rot-olympics-base\docs\mhs-types-contract.md). If storage fails or is unavailable, fall back to the browser `DEFAULT_SAVE` equivalent and still allow a session to run.

## Audio Hub

Create one MHS audio hub entity with child sound components named from the future MHS sound names in [mhs-asset-map.md](C:\Users\Vitor\Documents\Meta\brain-rot-olympics-base\docs\mhs-asset-map.md). The gameplay layer should only emit event IDs like `hitGood`, `stageClear`, or `music.dj`.

## Pre-Port Checks In Browser

Run these before copying files into the MHS project:

```bash
npm run smoke:port
npm run smoke:assets
npm run smoke:render-state
npm run smoke:renderer
npm run build
```

## Definition Of Ready For Gameplay Port

- Green rectangle renders in MHS.
- At least one fixture renders through `Rendering.ts`.
- `Assets.ts` declares every asset ID used by fixtures.
- `GameComponent.ts` can accept a `uiAction` command and drain a `screenChanged` event.
- Audio hub can play `click` from a `soundRequested` event.
