import type { GameEvent, GameState, JudgeId, ScreenId } from "./Types";

export function emitGameEvent(state: GameState, event: GameEvent): void {
  state.events ??= [];
  state.events.push(event);
}

export function drainGameEvents(state: GameState): GameEvent[] {
  const events = state.events || [];
  state.events = [];
  return events;
}

export function requestSound(state: GameState, soundId: string, volumeScale = 1): void {
  emitGameEvent(state, {
    type: "soundRequested",
    soundId,
    volumeScale,
    enabled: state.save.settings.sfx,
  });
}

export function requestRunMusic(state: GameState, judgeId: JudgeId, enabled: boolean): void {
  emitGameEvent(state, { type: "musicRequested", action: "startRun", judgeId, enabled });
}

export function requestStopRunMusic(state: GameState): void {
  emitGameEvent(state, { type: "musicRequested", action: "stopRun" });
}

export function requestMenuMusic(state: GameState, enabled: boolean): void {
  emitGameEvent(state, { type: "musicRequested", action: "startMenu", enabled });
}

export function requestStopMenuMusic(state: GameState): void {
  emitGameEvent(state, { type: "musicRequested", action: "stopMenu" });
}

export function requestMusicSettingsSync(state: GameState, enabled: boolean): void {
  emitGameEvent(state, { type: "musicSettingChanged", enabled });
}

export function requestAudioUnlock(state: GameState): void {
  emitGameEvent(state, { type: "audioUnlockRequested" });
}

export function requestSave(state: GameState): void {
  emitGameEvent(state, { type: "saveRequested" });
}

export function requestToast(state: GameState, text: string, duration = 1.6): void {
  emitGameEvent(state, { type: "toastRequested", text, duration });
}

export function notifyScreenChanged(state: GameState, screen: ScreenId): void {
  emitGameEvent(state, { type: "screenChanged", screen });
}

export function notifyRunCompleted(state: GameState, completed: boolean, cause: string): void {
  emitGameEvent(state, { type: "runCompleted", completed, cause });
}
