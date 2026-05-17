import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "./Constants";
import { CanvasViewModel } from "./CanvasViewModel";
import { AudioComponent } from "./AudioComponent";
import { drainGameEvents } from "./GameEvents";
import { DrawingCommandsRenderer, renderGreenSmoke, renderFixtureSmoke } from "./Rendering";
import type { GameInputCommand, GameState, RenderState } from "./Types";

export class GameComponent {
  readonly viewModel = new CanvasViewModel();
  readonly audio = new AudioComponent();
  private state: GameState | null = null;

  initialize(state: GameState): void {
    this.state = state;
  }

  update(deltaSeconds: number): void {
    if (!this.state) return;
    this.state.deltaTime = deltaSeconds;
    this.state.time += deltaSeconds;
    this.drainEvents();
  }

  handleInput(command: GameInputCommand): void {
    if (!this.state) return;
    if (command.type === "uiAction") {
      this.handleUiAction(command.actionId);
      return;
    }
    this.state.pointer.x = command.x;
    this.state.pointer.y = command.y;
    this.state.pointer.down = command.type === "pointerDown" || command.type === "pointerMove";
  }

  renderGreenSmoke(builder: any): void {
    const renderer = new DrawingCommandsRenderer(builder);
    renderGreenSmoke(renderer);
    this.viewModel.setDrawCommands(builder.build?.() ?? []);
  }

  renderFixture(builder: any, renderState: RenderState): void {
    const renderer = new DrawingCommandsRenderer(builder);
    renderFixtureSmoke(renderer, renderState);
    this.viewModel.setDrawCommands(builder.build?.() ?? []);
  }

  private handleUiAction(actionId: string): void {
    // Port browser screen action handling here. Keep action IDs identical:
    // stageSelect, stage:3, tryAgain, resultsHome, toggleMusic, etc.
    if (!this.state) return;
    this.state.ui.buttons = this.state.ui.buttons.filter((button) => button.id !== actionId || button.w >= 0);
  }

  private drainEvents(): void {
    if (!this.state) return;
    for (const event of drainGameEvents(this.state)) {
      this.audio.handleEvent(event);
    }
  }
}

export const MHS_LOGICAL_SIZE = { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT } as const;
