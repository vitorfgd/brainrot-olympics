export class CanvasViewModel {
  drawCommands: unknown[] = [];

  setDrawCommands(commands: unknown[]): void {
    this.drawCommands = commands;
  }
}
