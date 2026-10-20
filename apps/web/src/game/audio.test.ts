import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebAudioSynth } from './audio';

function mockContext(state: AudioContextState = 'running') {
  const oscillator = {
    type: 'sine',
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
  };
  const gain = {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  };
  const context = {
    state,
    currentTime: 0,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gain),
  };
  class FakeAudioContext {
    constructor() { return context as unknown as AudioContext; }
  }
  vi.stubGlobal('AudioContext', FakeAudioContext);
  Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeAudioContext });
  return { context, oscillator };
}

afterEach(() => vi.unstubAllGlobals());

describe('WebAudioSynth', () => {
  it('creates and resumes audio only after explicit unlock', async () => {
    const { context } = mockContext('suspended');
    const synth = new WebAudioSynth();
    expect(context.createOscillator).not.toHaveBeenCalled();
    await synth.unlock();
    expect(context.resume).toHaveBeenCalledTimes(1);
    synth.playLaunch();
    expect(context.createOscillator).toHaveBeenCalledTimes(1);
    synth.dispose();
  });

  it('does not initialize or schedule audio while muted', async () => {
    const { context } = mockContext();
    const synth = new WebAudioSynth();
    synth.setMuted(true);
    await synth.unlock();
    synth.playExplosion();
    expect(context.createOscillator).not.toHaveBeenCalled();
    synth.dispose();
  });
});
