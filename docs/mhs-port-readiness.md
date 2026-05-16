# Brainrot Olympics MHS Port Notes

## Fixed Contract
- Logical canvas: `540 x 960`.
- Input commands: `pointerDown`, `pointerMove`, `pointerUp`, `pointerCancel`.
- Core game events: `soundRequested`, `musicRequested`, `musicSettingChanged`, `audioUnlockRequested`, `saveRequested`, `screenChanged`, `runCompleted`.
- Gameplay randomness: route through `state.random`; use a seeded RNG in MHS/debug builds when parity matters.
- Render snapshot: plain data from `buildRenderState(state)`.
- Browser shell owns DOM canvas, pointer conversion, `requestAnimationFrame`, browser audio, and `localStorage`.

## MHS Target Layout
```text
scripts/
  Assets.ts
  Constants.ts
  Types.ts
  GameEvents.ts
  Rendering.ts
  AudioComponent.ts
  GameComponent.ts
  CanvasViewModel.ts
sprites/
assets/sounds/
xaml/game.xaml
```

## MHS Setup Checklist
1. Keep every TypeScript file flat inside `scripts/`.
2. Declare every sprite/audio reference with static asset strings.
3. Match `game.xaml`, `DrawingSurface`, Custom UI design size, and constants to `540 x 960`.
4. Bind `<local:DrawingSurface Commands="{Binding drawCommands}" />`.
5. Set the Custom UI `dataContext` to the canvas ViewModel on entity create.
6. Update game logic from normalized input commands and delta time.
7. Render in late update by converting `RenderState` into `DrawingCommandsBuilder` commands.
8. Map current browser `AssetIds` to MHS `TextureAsset("@sprites/...")` declarations.
9. Map current sound IDs to named child `SoundComponent` entities under an `AudioHub`.

## DrawingSurface Smoke Test
Before porting gameplay, render a full-canvas green rectangle through `DrawingCommandsBuilder` and assign `gameViewModel.drawCommands = builder.build()`. If XAML appears but the green rectangle does not, check the `local:` namespace, the DrawingSurface binding, data context assignment, and matching dimensions first.
