import { SoundComponentNames } from "./Assets";
import type { GameEvent } from "./Types";

export class AudioComponent {
  private sounds: Record<string, any> = {};

  registerSound(id: string, soundComponent: any): void {
    this.sounds[id] = soundComponent;
  }

  handleEvent(event: GameEvent): void {
    if (event.type === "soundRequested") {
      this.playSound(event.soundId, event.enabled, event.volumeScale);
      return;
    }
    if (event.type === "musicRequested") {
      this.handleMusic(event);
      return;
    }
    if (event.type === "musicSettingChanged" && !event.enabled) {
      this.stopAllMusic();
    }
  }

  private playSound(soundId: string, enabled: boolean, volumeScale: number): void {
    if (!enabled) return;
    const componentName = SoundComponentNames[soundId as keyof typeof SoundComponentNames] || soundId;
    this.sounds[componentName]?.play?.({ volumeScale });
  }

  private handleMusic(event: Extract<GameEvent, { type: "musicRequested" }>): void {
    if (event.action === "stopRun" || event.action === "stopMenu") {
      this.stopAllMusic();
      return;
    }
    if (!event.enabled) return;
    const musicId = event.action === "startRun" ? `music.${event.judgeId}` : "music.blingbeak";
    const componentName = SoundComponentNames[musicId as keyof typeof SoundComponentNames];
    this.sounds[componentName]?.play?.({ loop: true, volumeScale: 0.18 });
  }

  private stopAllMusic(): void {
    for (const key of ["MusicBlingbeak", "MusicDisco", "MusicCoolman", "MusicDj"]) {
      this.sounds[key]?.stop?.();
    }
  }
}
