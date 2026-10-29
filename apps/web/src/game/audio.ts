type AudioContextWindow = typeof window & { webkitAudioContext?: typeof AudioContext };

export class WebAudioSynth {
  private context: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicPaused = false;
  private musicStep = 0;
  private nextMusicTime = 0;
  private muted = false;

  setMuted(muted: boolean): void {
    if (this.muted === muted) return;
    this.muted = muted;
    this.fadeMusic(muted ? 0 : 0.24);
    if (muted) this.stopMusic();
    else this.startMusic();
  }

  setMusicPaused(paused: boolean): void {
    if (this.musicPaused === paused) return;
    this.musicPaused = paused;
    this.fadeMusic(paused ? 0 : 0.24);
    if (paused) this.stopMusic();
    else this.startMusic();
  }

  async unlock(): Promise<void> {
    if (this.muted || typeof window === 'undefined') return;
    try {
      const audioWindow = window as AudioContextWindow;
      const Constructor = window.AudioContext ?? audioWindow.webkitAudioContext;
      if (!Constructor) return;
      this.context ??= new Constructor();
      if (this.context.state === 'suspended') await this.context.resume();
      if (this.context.state === 'running') {
        this.ensureMusicBus();
        this.startMusic();
      }
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
  playBossHit(): void { this.sweep(125, 62, 0.19, 'sawtooth', 0.16); }
  playVictoryFanfare(): void {
    [659.25, 783.99, 987.77, 1318.51].forEach((frequency, index) => {
      this.tone(frequency, 0.42, index === 3 ? 'triangle' : 'sine', 0.1, index * 0.14);
    });
    this.tone(523.25, 0.72, 'triangle', 0.055, 0.48);
  }
  playEvolution(): void {
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      this.tone(frequency, 0.28, 'sine', 0.07, index * 0.12);
    });
  }

  dispose(): void {
    this.stopMusic();
    const context = this.context;
    this.context = null;
    this.musicGain = null;
    if (context && context.state !== 'closed') void context.close().catch(() => undefined);
  }

  private ensureMusicBus(): void {
    if (this.musicGain || !this.context || this.context.state === 'closed') return;
    this.musicGain = this.context.createGain();
    this.musicGain.gain.setValueAtTime(0, this.context.currentTime);
    this.musicGain.connect(this.context.destination);
  }

  private startMusic(): void {
    const context = this.context;
    if (!context || context.state !== 'running' || this.muted || this.musicPaused || this.musicTimer !== null) return;
    this.ensureMusicBus();
    if (!this.musicGain) return;
    this.musicStep = 0;
    this.nextMusicTime = context.currentTime + 0.08;
    this.fadeMusic(0.24);
    this.musicTimer = setInterval(() => this.scheduleMusic(), 40);
  }

  private stopMusic(): void {
    if (this.musicTimer !== null) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private fadeMusic(value: number): void {
    const context = this.context;
    if (!context || context.state === 'closed' || !this.musicGain) return;
    const now = context.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setTargetAtTime(value, now, 0.055);
  }

  private scheduleMusic(): void {
    const context = this.context;
    if (!context || context.state !== 'running' || !this.musicGain || this.muted || this.musicPaused) {
      this.stopMusic();
      return;
    }
    if (this.nextMusicTime < context.currentTime - 0.25) {
      const missedSteps = Math.ceil((context.currentTime - this.nextMusicTime) / 0.25);
      this.nextMusicTime += missedSteps * 0.25;
      this.musicStep = (this.musicStep + missedSteps) % 32;
    }

    const melody = [659.25, 587.33, 493.88, null, 440, 493.88, 587.33, null,
      659.25, 783.99, 659.25, 587.33, 493.88, null, 440, null,
      392, 440, 493.88, null, 587.33, 493.88, 440, null,
      493.88, 587.33, 659.25, null, 587.33, 493.88, 440, null] as const;
    const bass = [98, 146.83, 164.81, 130.81] as const;
    const horizon = context.currentTime + 0.12;
    while (this.nextMusicTime < horizon) {
      const step = this.musicStep;
      const when = this.nextMusicTime;
      const note = melody[step];
      if (note !== null) this.musicTone(note, step % 8 === 0 ? 0.29 : 0.2, 'triangle', 0.06, when);
      if (step % 4 === 0) {
        this.musicTone(bass[Math.floor(step / 8) % bass.length], 0.48, 'sine', 0.095, when);
        this.musicTone(73.42, 0.075, 'sine', 0.025, when);
      }
      if (step === 6 || step === 14 || step === 22 || step === 30) {
        this.musicTone(note ?? 783.99, 0.42, 'sine', 0.028, when);
      }
      this.nextMusicTime += 0.25;
      this.musicStep = (step + 1) % 32;
    }
  }

  private musicTone(frequency: number, duration: number, type: OscillatorType, volume: number, start: number): void {
    const context = this.context;
    const output = this.musicGain;
    if (!context || !output || context.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
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
