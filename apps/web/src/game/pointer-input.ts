import { WORLD } from './constants';
import type { GameState, Point } from './types';

export interface GameInputHandlers {
  onAimStart(point: Point): void;
  onAimMove(point: Point): void;
  onAimEnd(): void;
  onSkill(): void;
}

export class PointerInputController {
  private mode: GameState = 'DIALOGUE';
  private pointerId: number | null = null;
  private dragging = false;
  private disposed = false;
  private readonly previousTouchAction: string;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly handlers: GameInputHandlers) {
    this.previousTouchAction = canvas.style.touchAction;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerEnd);
    canvas.addEventListener('pointercancel', this.onPointerCancel);
    canvas.addEventListener('lostpointercapture', this.onPointerCancel);
  }

  setMode(state: GameState): void {
    this.mode = state;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerEnd);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('lostpointercapture', this.onPointerCancel);
    this.canvas.style.touchAction = this.previousTouchAction;
    this.pointerId = null;
    this.dragging = false;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.disposed) return;
    const point = this.toWorld(event);
    if (this.mode === 'FLYING') {
      this.handlers.onSkill();
      return;
    }
    if (this.mode !== 'AIMING' || Math.hypot(point.x - WORLD.cannon.x, point.y - WORLD.cannon.y) > 90) return;
    this.pointerId = event.pointerId;
    this.dragging = true;
    this.canvas.setPointerCapture?.(event.pointerId);
    this.handlers.onAimStart(point);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging || this.pointerId !== event.pointerId || this.disposed) return;
    this.handlers.onAimMove(this.toWorld(event));
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (!this.dragging || this.pointerId !== event.pointerId || this.disposed) return;
    this.finishPointer(event.pointerId);
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (!this.dragging || this.pointerId !== event.pointerId || this.disposed) return;
    this.finishPointer(event.pointerId);
  };

  private finishPointer(pointerId: number): void {
    this.dragging = false;
    this.pointerId = null;
    if (this.canvas.hasPointerCapture?.(pointerId)) this.canvas.releasePointerCapture?.(pointerId);
    this.handlers.onAimEnd();
  }

  private toWorld(event: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / WORLD.width, rect.height / WORLD.height);
    const offsetX = (rect.width - WORLD.width * scale) / 2;
    const offsetY = (rect.height - WORLD.height * scale) / 2;
    return {
      x: (event.clientX - rect.left - offsetX) / scale,
      y: (event.clientY - rect.top - offsetY) / scale,
    };
  }
}
