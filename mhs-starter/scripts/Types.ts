export type ScreenId =
  | "home"
  | "leaderboard"
  | "stageSelect"
  | "shop"
  | "settings"
  | "run"
  | "results"
  | "boostSelect";

export type RunMode = "stage" | "endless";
export type RunStatus = "countdown" | "playing" | "continueOffer" | "finished";
export type TargetKind = "tap" | "slide" | "hold";
export type HitQuality = "perfect" | "good" | "okay" | "miss" | "shield";
export type Grade = "FAILED" | "D" | "C" | "B" | "A" | "S";
export type JudgeId = "blingbeak" | "disco" | "coolman" | "dj";
export type BoostProductId = "extraLife" | "doubleCoins" | "comboShield";
export type AssetId = string;

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
  imageId: AssetId;
  musicId: AssetId;
  skins: SkinDefinition[];
}

export interface SkinDefinition {
  id: string;
  name: string;
  price: number;
  imageId: AssetId;
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
  portraitId: AssetId;
}

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
  | { kind: "stage"; stageId: number; ftue?: boolean }
  | { kind: "endless"; ftue?: boolean };

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
  hitCounts: Record<"perfect" | "good" | "okay" | "miss", number>;
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
  kind: "tap";
}

export interface SlideTargetState extends BaseTargetState {
  kind: "slide";
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
  kind: "hold";
  holdDuration: number;
  heldFor: number;
  holding: boolean;
  releaseCueShown: boolean;
}

export type GameInputCommand =
  | { type: "pointerDown"; x: number; y: number; pointerId: number }
  | { type: "pointerMove"; x: number; y: number; pointerId: number }
  | { type: "pointerUp"; x: number; y: number; pointerId: number }
  | { type: "pointerCancel"; x: number; y: number; pointerId: number }
  | { type: "uiAction"; actionId: string };

export type GameEvent =
  | { type: "soundRequested"; soundId: string; volumeScale: number; enabled: boolean }
  | { type: "musicRequested"; action: "startRun"; judgeId: JudgeId; enabled: boolean }
  | { type: "musicRequested"; action: "stopRun" }
  | { type: "musicRequested"; action: "startMenu"; enabled: boolean }
  | { type: "musicRequested"; action: "stopMenu" }
  | { type: "musicSettingChanged"; enabled: boolean }
  | { type: "audioUnlockRequested" }
  | { type: "saveRequested" }
  | { type: "toastRequested"; text: string; duration: number }
  | { type: "screenChanged"; screen: ScreenId }
  | { type: "runCompleted"; completed: boolean; cause: string };

export interface EffectState {
  type: string;
  startedAt?: number;
  until?: number;
  color?: string;
}

export interface RenderState {
  logicalWidth: number;
  logicalHeight: number;
  screen: ScreenId;
  time: number;
  save: RenderSaveState;
  judges: RenderJudgeState[];
  stages: RenderStageState[];
  home: RenderHomeState;
  levels: RenderLevelsState;
  leaderboard: RenderLeaderboardState;
  shop: RenderShopState;
  settings: RenderSettingsState;
  boostSelect: RenderBoostSelectState | null;
  results: RenderResultsState | null;
  runHud: RenderRunHudState | null;
  run: RenderRunState | null;
  toast: ToastState | null;
  uiButtons: UiButton[];
}

export interface RenderSaveState extends SaveState {}

export interface RenderJudgeState {
  id: JudgeId;
  index: number;
  name: string;
  title: string;
  color: string;
  imageId: AssetId;
  musicId: AssetId;
  equippedSkin: string;
  equippedImageId: AssetId;
  skins: Array<SkinDefinition & { owned: boolean; equipped: boolean }>;
}

export interface RenderStageState extends StageDefinition {
  color: string;
  judgeId: JudgeId | null;
  unlocked: boolean;
  cleared: boolean;
  best: StageBest | null;
}

export interface RenderHomeState {
  coins: number;
  highScore: number;
  endlessUnlocked: boolean;
  stagesCleared: number;
  stagesTotal: number;
  primaryButtons: Array<{ id: string; label: string; locked?: boolean; badge?: string }>;
  footerButtons: Array<{ id: string; iconId: AssetId }>;
}

export interface RenderLevelsState {
  title: string;
  stages: RenderStageState[];
}

export interface RenderLeaderboardState {
  title: string;
  playerScore: number;
  rows: Array<{
    displayIndex: number;
    rank: number;
    player: boolean;
    name: string;
    score: number;
    judgeId: JudgeId;
    skinId: string;
    highlight: string;
  }>;
}

export interface RenderShopState {
  coins: number;
  powerUps: Array<{
    id: BoostProductId;
    buttonId: string;
    name: string;
    subtitle: string;
    price: number;
    kind: string;
    charges: number;
    ownedCount: number | null;
    runsRemaining: number | null;
  }>;
  cosmetics: Array<{
    id: string;
    judgeId: JudgeId;
    skinId: string;
    name: string;
    price: number;
    imageId: AssetId;
    color: string;
    owned: boolean;
    equipped: boolean;
    status: string;
  }>;
}

export interface RenderSettingsState {
  title: string;
  rows: Array<{ id: string; label: string; iconId: AssetId; enabled: boolean }>;
}

export interface RenderBoostSelectState {
  pending: RunIntent;
  title: string;
  runLabel: string;
  coins: number;
  boosts: Array<{
    id: BoostProductId;
    buttonId: string;
    label: string;
    iconId: AssetId;
    available: boolean;
    charges: number;
    selected: boolean;
  }>;
  actions: Array<{ id: string; label: string }>;
}

export interface RenderResultsState {
  mode: RunMode;
  stageId: number | null;
  ftue: boolean;
  completed: boolean;
  failed: boolean;
  headline: string;
  grade: Grade;
  missCause: string;
  score: number;
  bestCombo: number;
  accuracy: number;
  accuracyPct: number;
  perfectHits: number;
  coinsEarned: number;
  leaderboardRank: number | null;
  stats: Array<{ id: string; label: string; value: number }>;
  reward: { coins: number };
  medal: { grade: Grade; assetId: AssetId } | null;
  actions: Array<{ id: string; label: string; kind: string; sprite?: string }>;
}

export interface RenderRunHudState {
  mode: RunMode;
  status: RunStatus;
  stageId: number | null;
  ftue: boolean;
  activeJudgeIndex: number;
  activeJudgeId: JudgeId | null;
  score: number;
  combo: number;
  comboTier: number;
  hp: number;
  hpMax: number;
  remaining: number | null;
  countdown: number | null;
  continueOffer: { until: number; remaining: number; declineCause: string } | null;
  boosts: Record<string, boolean>;
  caption: { text: string; until: number } | null;
  activeTargetId: number | null;
  upcomingTarget: UpcomingTargetState | null;
  targets: RenderTargetState[];
  failSnapshot: RenderTargetState | null;
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
  | TapTargetState
  | SlideTargetState
  | HoldTargetState;

export interface ToastState {
  text: string;
  until: number;
}
