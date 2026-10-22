import { describe, expect, it, vi } from 'vitest';
import { PointerInputController } from './pointer-input';
import type { GameInputHandlers } from './pointer-input';

function pointerEvent(type: string, pointerId: number, clientX: number, clientY: number): Event {
  const event = new Event(type, { bubbles: true });
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    clientX: { value: clientX },
    clientY: { value: clientY },
  });
  return event;
}

function setup() {
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: 640, bottom: 400, width: 640, height: 400, toJSON: () => ({}),
  });
  const handlers: GameInputHandlers = {
    onAimStart: vi.fn(),
    onAimMove: vi.fn(),
    onAimEnd: vi.fn(),
    onSkill: vi.fn(),
    onTarget: vi.fn(),
    onTargetCancel: vi.fn(),
    onAimCancel: vi.fn(),
  };
  return { canvas, handlers, controller: new PointerInputController(canvas, handlers) };
}

describe('PointerInputController', () => {
  it('maps pointer input through the centered letterbox into world coordinates', () => {
    const { canvas, handlers, controller } = setup();
    controller.setMode('AIMING');
    canvas.dispatchEvent(pointerEvent('pointerdown', 1, 80, 272));
    canvas.dispatchEvent(pointerEvent('pointermove', 1, 40, 250));
    canvas.dispatchEvent(pointerEvent('pointerup', 1, 40, 250));
    expect(handlers.onAimStart).toHaveBeenCalledWith({ x: 160, y: 504 });
    expect(handlers.onAimMove).toHaveBeenCalledWith({ x: 80, y: 460 });
    expect(handlers.onAimEnd).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('ignores distant starts, routes in-flight taps to skill, and cancels an active drag', () => {
    const { canvas, handlers, controller } = setup();
    controller.setMode('AIMING');
    canvas.dispatchEvent(pointerEvent('pointerdown', 1, 0, 0));
    expect(handlers.onAimStart).not.toHaveBeenCalled();
    controller.setMode('FLYING');
    canvas.dispatchEvent(pointerEvent('pointerdown', 2, 20, 20));
    expect(handlers.onSkill).toHaveBeenCalledTimes(1);
    controller.setMode('AIMING');
    canvas.dispatchEvent(pointerEvent('pointerdown', 3, 80, 272));
    canvas.dispatchEvent(pointerEvent('pointercancel', 3, 80, 272));
    expect(handlers.onAimEnd).not.toHaveBeenCalled();
    expect(handlers.onAimCancel).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it('removes listeners and restores the previous touch-action style on dispose', () => {
    const canvas = document.createElement('canvas');
    canvas.style.touchAction = 'pan-y';
    const handlers: GameInputHandlers = {
      onAimStart: vi.fn(),
      onAimMove: vi.fn(),
      onAimEnd: vi.fn(),
      onSkill: vi.fn(),
      onTarget: vi.fn(),
      onTargetCancel: vi.fn(),
      onAimCancel: vi.fn(),
    };
    const controller = new PointerInputController(canvas, handlers);
    controller.dispose();
    expect(canvas.style.touchAction).toBe('pan-y');
    canvas.dispatchEvent(pointerEvent('pointerdown', 1, 80, 272));
    expect(handlers.onAimStart).not.toHaveBeenCalled();
  });

  it('prioritizes butter targets over flying skills and cancels a drag without firing', () => {
    const { canvas, handlers, controller } = setup();
    controller.setMode('AIMING');
    canvas.dispatchEvent(pointerEvent('pointerdown', 1, 80, 272));
    controller.setMode('AIMING', 'butter');
    canvas.dispatchEvent(pointerEvent('pointerup', 1, 80, 272));
    expect(handlers.onAimCancel).toHaveBeenCalledOnce();
    expect(handlers.onAimEnd).not.toHaveBeenCalled();
    controller.setMode('FLYING', 'butter');
    canvas.dispatchEvent(pointerEvent('pointerdown', 2, 200, 150));
    expect(handlers.onTarget).toHaveBeenCalledWith({ x: 400, y: 260 });
    expect(handlers.onSkill).not.toHaveBeenCalled();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handlers.onTargetCancel).toHaveBeenCalledOnce();
    controller.dispose();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handlers.onTargetCancel).toHaveBeenCalledOnce();
  });

  it('rejects paused target taps and ignores a second pointer during a drag', () => {
    const { canvas, handlers, controller } = setup();
    controller.setMode('PAUSED', 'butter');
    canvas.dispatchEvent(pointerEvent('pointerdown', 1, 200, 150));
    expect(handlers.onTarget).not.toHaveBeenCalled();
    controller.setMode('AIMING');
    canvas.dispatchEvent(pointerEvent('pointerdown', 2, 80, 272));
    canvas.dispatchEvent(pointerEvent('pointerdown', 3, 80, 272));
    expect(handlers.onAimStart).toHaveBeenCalledOnce();
    canvas.dispatchEvent(pointerEvent('lostpointercapture', 2, 80, 272));
    canvas.dispatchEvent(pointerEvent('pointerup', 2, 80, 272));
    expect(handlers.onAimEnd).not.toHaveBeenCalled();
    expect(handlers.onAimCancel).toHaveBeenCalledOnce();
    controller.dispose();
  });
});
