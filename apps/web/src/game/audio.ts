type AudioContextWindow = typeof window & { webkitAudioContext?: typeof AudioContext };

export class WebAudioSynth {
  private context: AudioContext | null = null;
  private muted = false;

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  async unlock(): Promise<void> {
    if (this.muted || typeof window === 'undefined') return;
    try {
      const audioWindow = window as AudioContextWindow;
      const Constructor = window.AudioContext ?? audioWindow.webkitAudioContext;
      if (!Constructor) return;
      this.context ??= new Constructor();
      if (this.context.state === 'suspended') await this.context.resume();
    } catch {
      // Audio is an enhancement; blocked or unavailable audio never interrupts play.
    }
  }

  playStretch(): void { this.tone(210, 0.06, 'sine', 0.035); }
  playLaunch(): void { this.sweep(180, 540, 0.2, 'triangle', 0.12); }
  playImpact(intensity = 1): void { this.tone(90 + Math.min(intensity, 8) * 12, 0.09, 'square', 0.08); }
  playExplosion(): void { this.sweep(150, 38, 0.35, 'sawtooth', 0.14); }
  playBounce(): void { this.tone(440, 0.12, 'sine', 0.08); }
  playSkill(stage: number): void { this.sweep(260, 720 + stage * 55, 0.23, 'triangle', 0.1); }
  playCatDefeat(): void { this.sweep(340, 120, 0.24, 'sine', 0.08); }
  playEvolution(): void {
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      this.tone(frequency, 0.28, 'sine', 0.07, index * 0.12);
    });
  }

  dispose(): void {
    const context = this.context;
    this.context = null;
    if (context && context.state !== 'closed') void context.close().catch(() => undefined);
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number, delay = 0): void {
    if (this.muted || !this.context || this.context.state === 'closed') return;
    const context = this.context;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private sweep(startHz: number, endHz: number, duration: number, type: OscillatorType, volume: number): void {
    if (this.muted || !this.context || this.context.state === 'closed') return;
    const context = this.context;
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startHz, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endHz), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
}
