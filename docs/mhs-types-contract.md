# MHS Types Contract

This is the TypeScript shape we should recreate in Meta Horizon Studio `scripts/Types.ts`.
The browser game is still JavaScript, but these interfaces describe the stable data boundaries we are now preserving.

## Primitive Unions

```ts
export type ScreenId =
  | 'home'
  | 'leaderboard'
  | 'stageSelect'
  | 'shop'
  | 'settings'
  | 'run'
  | 'results'
  | 'boostSelect';

export type RunMode = 'stage' | 'endless';
export type RunStatus = 'countdown' | 'playing' | 'continueOffer' | 'finished';
export type TargetKind = 'tap' | 'slide' | 'hold';
export type HitQuality = 'perfect' | 'good' | 'okay' | 'miss' | 'shield';
export type Grade = 'FAILED' | 'D' | 'C' | 'B' | 'A' | 'S';
export type JudgeId = 'blingbeak' | 'disco' | 'coolman' | 'dj';
export type BoostProductId = 'extraLife' | 'doubleCoins' | 'comboShield';
```

## Save And Config Data

```ts
export interface SaveState {
  ftueCompleted: boolean;
  coins: number;
  highScore: number;
  stageBests: Record<number, StageBest>;
  ownedSkins: Record<JudgeId, string[]>;
  equippedSkins: Record<JudgeId, string>;
  bankedExtraLife: number;
  doubleCoinsRunsRemaining: number;
  comboShieldRunsRemaining: number;
  settings: SettingsState;
}

export interface SettingsState {
  music: boolean;
  sfx: boolean;
}

export interface StageBest {
  score: number;
  grade: Grade;
  accuracy: number;
  cleared: boolean;
}

export interface JudgeDefinition {
  id: JudgeId;
  name: string;
  title: string;
  color: string;
  imageId: string;
  musicId: string;
  skins: SkinDefinition[];
}

export interface SkinDefinition {
  id: string;
  name: string;
  price: number;
  imageId: string;
}

export interface StageDefinition {
  id: number;
  name: string;
  cardTitle: string;
  cardColor: string;
  duration: number;
  kinds: TargetKind[];
  difficulty: number;
  judgeIndex: number;
  portraitId: string;
}
```

## Runtime State

```ts
export interface GameState {
  time: number;
  lastFrame: number;
  deltaTime: number;
  screen: ScreenId;
  pointer: PointerState;
  ui: UiState;
  save: SaveState;
  random: () => number;
  events: GameEvent[];
  run: RunState | null;
  effects: EffectState[];
  toast: ToastState | null;
  boostSelectPending: RunIntent | null;
  boostSelectUseDoubleCoins: boolean;
  boostSelectUseComboShield: boolean;

  // Browser-only fields stay optional and should not be used in MHS core logic.
  ctx?: unknown;
  assets?: unknown;
  gameRenderer?: unknown;
  renderState?: RenderState;
}

export interface PointerState {
  x: number;
  y: number;
  down: boolean;
  lastMoveX?: number | null;
  lastMoveY?: number | null;
}

export interface UiState {
  buttons: UiButton[];
}

export interface UiButton {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type RunIntent =
  | { kind: 'stage'; stageId: number; ftue?: boolean }
  | { kind: 'endless'; ftue?: boolean };
```

## Run And Target State

```ts
export interface RunState {
  mode: RunMode;
  stage: StageDefinition | null;
  ftue: boolean;
  status: RunStatus;
  countdownStartedAt: number;
  startedAt: number;
  lastCountdownTick: number;
  goStartedAt: number;
  goUntil: number;
  elapsed: number;
  duration: number;
  completed: boolean;
  failed: boolean;
  grade: Grade;
  activeJudgeIndex: number;
  judgeMoodKind: string;
  judgeMoodUntil: number;
  inactiveMoods: MoodState[];
  hp: number;
  score: number;
  combo: number;
  bestCombo: number;
  totalNotes: number;
  resolvedNotes: number;
  accuracyPoints: number;
  hitCounts: Record<'perfect' | 'good' | 'okay' | 'miss', number>;
  targets: TargetState[];
  upcomingTarget: UpcomingTargetState | null;
  activeTargetId: number | null;
  nextSpawnAt: number;
  spawnCount: number;
  caption: string;
  captionUntil: number;
  resultReadyAt: number;
  lastMissCause: string;
  continueUsed: boolean;
  thisRunDoubleCoins: boolean;
  thisRunComboShield: boolean;
  comboShieldConsumed: boolean;
  extraLifeUsedThisRun: boolean;
  ftueFirstMissForgiven: boolean;
  failSnapshot: TargetState | null;
  continueOfferUntil: number;
  continueDeclineCause: string;
  internalMissCause: string;
  timeUpUntil: number;
}

export interface MoodState {
  kind: string;
  until: number;
}

export interface UpcomingTargetState {
  kind: TargetKind;
  point: { x: number; y: number };
  createdAt: number;
  spawnAt: number;
  approach: number;
}

export type TargetState = TapTargetState | SlideTargetState | HoldTargetState;

export interface BaseTargetState {
  id: number;
  kind: TargetKind;
  x: number;
  y: number;
  age: number;
  approach: number;
  deadline: number;
  resolved: boolean;
  removed: boolean;
  pulse: number;
  hitQuality?: HitQuality;
  vanishStartedAt?: number;
  removeAt?: number;
}

export interface TapTargetState extends BaseTargetState {
  kind: 'tap';
}

export interface SlideTargetState extends BaseTargetState {
  kind: 'slide';
  endX: number;
  endY: number;
  controlX: number;
  controlY: number;
  tolerance: number;
  progress: number;
  dragging: boolean;
  trail: Array<{ x: number; y: number }>;
}

export interface HoldTargetState extends BaseTargetState {
  kind: 'hold';
  holdDuration: number;
  heldFor: number;
  holding: boolean;
  releaseCueShown: boolean;
}
```

## Commands And Events

```ts
export type GameInputCommand =
  | { type: 'pointerDown'; x: number; y: number; pointerId: number }
  | { type: 'pointerMove'; x: number; y: number; pointerId: number }
  | { type: 'pointerUp'; x: number; y: number; pointerId: number }
  | { type: 'pointerCancel'; x: number; y: number; pointerId: number };

export type GameEvent =
  | { type: 'soundRequested'; soundId: string; volumeScale: number; enabled: boolean }
  | { type: 'musicRequested'; action: 'startRun'; judgeId: JudgeId; enabled: boolean }
  | { type: 'musicRequested'; action: 'stopRun' }
  | { type: 'musicRequested'; action: 'startMenu'; enabled: boolean }
  | { type: 'musicRequested'; action: 'stopMenu' }
  | { type: 'musicSettingChanged'; enabled: boolean }
  | { type: 'audioUnlockRequested' }
  | { type: 'saveRequested' }
  | { type: 'toastRequested'; text: string; duration: number }
  | { type: 'screenChanged'; screen: ScreenId }
  | { type: 'runCompleted'; completed: boolean; cause: string };
```

## Render State

```ts
export interface RenderState {
  logicalWidth: number;
  logicalHeight: number;
  screen: ScreenId;
  time: number;
  save: RenderSaveState;
  judges: RenderJudgeState[];
  stages: RenderStageState[];
  run: RenderRunState | null;
  toast: ToastState | null;
  uiButtons: UiButton[];
}

export interface RenderSaveState {
  coins: number;
  highScore: number;
  ftueCompleted: boolean;
  settings: SettingsState;
}

export interface RenderJudgeState {
  id: JudgeId;
  name: string;
  color: string;
  imageId: string;
  equippedSkin: string;
}

export interface RenderStageState {
  id: number;
  name: string;
  cardTitle: string;
  color: string;
  portraitId: string;
  best: StageBest | null;
}

export interface RenderRunState {
  mode: RunMode;
  status: RunStatus;
  completed: boolean;
  failed: boolean;
  grade: Grade;
  score: number;
  combo: number;
  bestCombo: number;
  hp: number;
  elapsed: number;
  duration: number;
  activeJudgeIndex: number;
  caption: string;
  captionUntil: number;
  targets: RenderTargetState[];
}

export type RenderTargetState =
  | Pick<TapTargetState, 'id' | 'kind' | 'x' | 'y' | 'age' | 'approach' | 'deadline' | 'resolved' | 'hitQuality'>
  | Pick<SlideTargetState, 'id' | 'kind' | 'x' | 'y' | 'age' | 'approach' | 'deadline' | 'resolved' | 'hitQuality' | 'endX' | 'endY' | 'controlX' | 'controlY' | 'progress' | 'dragging'>
  | Pick<HoldTargetState, 'id' | 'kind' | 'x' | 'y' | 'age' | 'approach' | 'deadline' | 'resolved' | 'hitQuality' | 'holdDuration' | 'heldFor' | 'holding'>;

export interface ToastState {
  text: string;
  until: number;
}
```

## Keep-Compatible Checklist

- New gameplay state should be plain data: numbers, strings, booleans, arrays, and records.
- Browser-only objects must stay optional and isolated: canvas context, loaded images, audio elements, localStorage, DOM events.
- New audio/save/toast actions should become `GameEvent` variants before they call platform services.
- New images/audio should get stable IDs first, then browser URLs in `assetsManifest.js`, then MHS static assets later.
- New render work should first add plain fields to `RenderState`; the renderer can stay canvas-backed until the MHS port.
