import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "./Constants";
import type { RenderState } from "./Types";

export interface GameRenderer {
  clear(): void;
  push(): void;
  pop(): void;
  translate(x: number, y: number): void;
  scale(scaleX: number, scaleY: number): void;
  rotate(degrees: number): void;
  setAlpha(alpha: number): void;
  rect(color: string, x: number, y: number, width: number, height: number): void;
  roundedRect(fillColor: string | null, strokeColor: string | null, lineWidth: number, x: number, y: number, width: number, height: number, radius: number): void;
  circle(fillColor: string | null, strokeColor: string | null, lineWidth: number, centerX: number, centerY: number, radius: number): void;
  ellipse(fillColor: string | null, strokeColor: string | null, lineWidth: number, centerX: number, centerY: number, radiusX: number, radiusY: number): void;
  line(color: string, lineWidth: number, x1: number, y1: number, x2: number, y2: number): void;
  image(assetId: string, x: number, y: number, width: number, height: number): void;
  text(value: string, x: number, y: number, width: number, height: number, style?: TextStyle): void;
}

export interface TextStyle {
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontWeight?: number;
  align?: "left" | "center" | "right";
}

export function renderGreenSmoke(renderer: GameRenderer): void {
  renderer.clear();
  renderer.rect("#00ff00", 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
}

export function renderFixtureSmoke(renderer: GameRenderer, renderState: RenderState): void {
  renderer.clear();
  renderer.rect("#05041c", 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  renderer.roundedRect("rgba(18, 9, 54, 0.9)", "#a8fbff", 3, 42, 280, 456, 190, 24);
  renderer.text(renderState.screen.toUpperCase(), 64, 324, 412, 52, {
    color: "#fce76d",
    strokeColor: "#5e315f",
    strokeWidth: 3,
    fontSize: 30,
    fontWeight: 900,
    align: "center",
  });
  renderer.text("RenderState fixture loaded", 64, 390, 412, 36, {
    color: "#a8fbff",
    fontSize: 18,
    fontWeight: 700,
    align: "center",
  });
}

export class DrawingCommandsRenderer implements GameRenderer {
  private builder: any;

  constructor(builder: any) {
    this.builder = builder;
  }

  clear(): void {
    this.builder.clear?.();
  }

  push(): void {
    this.builder.push?.();
  }

  pop(): void {
    this.builder.pop?.();
  }

  translate(x: number, y: number): void {
    this.builder.translate?.(x, y);
  }

  scale(scaleX: number, scaleY: number): void {
    this.builder.scale?.(scaleX, scaleY);
  }

  rotate(degrees: number): void {
    this.builder.rotate?.(degrees);
  }

  setAlpha(alpha: number): void {
    this.builder.opacity?.(alpha);
  }

  rect(color: string, x: number, y: number, width: number, height: number): void {
    this.builder.fillRect?.(x, y, width, height, color);
  }

  roundedRect(fillColor: string | null, strokeColor: string | null, lineWidth: number, x: number, y: number, width: number, height: number, radius: number): void {
    this.builder.roundedRect?.(x, y, width, height, radius, fillColor, strokeColor, lineWidth);
  }

  circle(fillColor: string | null, strokeColor: string | null, lineWidth: number, centerX: number, centerY: number, radius: number): void {
    this.builder.circle?.(centerX, centerY, radius, fillColor, strokeColor, lineWidth);
  }

  ellipse(fillColor: string | null, strokeColor: string | null, lineWidth: number, centerX: number, centerY: number, radiusX: number, radiusY: number): void {
    this.builder.ellipse?.(centerX, centerY, radiusX, radiusY, fillColor, strokeColor, lineWidth);
  }

  line(color: string, lineWidth: number, x1: number, y1: number, x2: number, y2: number): void {
    this.builder.line?.(x1, y1, x2, y2, color, lineWidth);
  }

  image(assetId: string, x: number, y: number, width: number, height: number): void {
    this.builder.image?.(assetId, x, y, width, height);
  }

  text(value: string, x: number, y: number, width: number, height: number, style: TextStyle = {}): void {
    this.builder.text?.(value, x, y, width, height, style);
  }
}
