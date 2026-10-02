/**
 * Audio System for PARADOX ROOM — Room 02
 * Synthesizes dynamic ambient soundscapes and event audio
 * using pure Web Audio API with zero external assets.
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Ambient loop nodes
  private ambientR1Osc: OscillatorNode | null = null;
  private ambientR1Gain: GainNode | null = null;
  private ambientR2Osc: OscillatorNode | null = null;
  private ambientR2Gain: GainNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private isAmbienceRunning = false;

  private currentReality: 1 | 2 = 1;
  private volume: number = 0.7;

  constructor() {
    // Initialized on first user interaction
  }

  public init() {
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupAmbience();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  private setupAmbience() {
    if (!this.ctx || !this.masterGain || this.isAmbienceRunning) return;

    const t = this.ctx.currentTime;

    // Filter for warm space drone
    this.ambientFilter = this.ctx.createBiquadFilter();
    this.ambientFilter.type = 'lowpass';
    this.ambientFilter.frequency.setValueAtTime(260, t);
    this.ambientFilter.connect(this.masterGain);

    // Reality 1: Deep stable fundamental (55 Hz - A1)
    this.ambientR1Osc = this.ctx.createOscillator();
    this.ambientR1Osc.type = 'sine';
    this.ambientR1Osc.frequency.setValueAtTime(55, t);

    this.ambientR1Gain = this.ctx.createGain();
    this.ambientR1Gain.gain.setValueAtTime(0.04, t);
    this.ambientR1Osc.connect(this.ambientR1Gain);
    this.ambientR1Gain.connect(this.ambientFilter);
    this.ambientR1Osc.start();

    // Reality 2: Anomalous harmonic drone (73.4 Hz + 110 Hz shimmer)
    this.ambientR2Osc = this.ctx.createOscillator();
    this.ambientR2Osc.type = 'triangle';
    this.ambientR2Osc.frequency.setValueAtTime(73.42, t);

    this.ambientR2Gain = this.ctx.createGain();
    this.ambientR2Gain.gain.setValueAtTime(0.0001, t); // initially silent in R1
    this.ambientR2Osc.connect(this.ambientR2Gain);
    this.ambientR2Gain.connect(this.ambientFilter);
    this.ambientR2Osc.start();

    this.isAmbienceRunning = true;
  }

  public updateRealityAmbience(reality: 1 | 2) {
    this.currentReality = reality;
    if (!this.ctx || !this.ambientR1Gain || !this.ambientR2Gain || !this.ambientFilter) return;

    const t = this.ctx.currentTime;
    const fadeDuration = 0.4;

    if (reality === 1) {
      // Crossfade to Reality 1 (pure, grounded lowpass)
      this.ambientR1Gain.gain.setTargetAtTime(0.04, t, fadeDuration);
      this.ambientR2Gain.gain.setTargetAtTime(0.0001, t, fadeDuration);
      this.ambientFilter.frequency.setTargetAtTime(260, t, fadeDuration);
    } else {
      // Crossfade to Reality 2 (distorted anomalous pulse)
      this.ambientR1Gain.gain.setTargetAtTime(0.015, t, fadeDuration);
      this.ambientR2Gain.gain.setTargetAtTime(0.045, t, fadeDuration);
      this.ambientFilter.frequency.setTargetAtTime(480, t, fadeDuration);
    }
  }

  public playFootstep(isSprinting: boolean = false) {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(75 + Math.random() * 20, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.07);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);

    const stepVol = isSprinting ? 0.05 : 0.035;
    gain.gain.setValueAtTime(stepVol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playRealityShift(toReality: 1 | 2) {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    // Sub bass drop
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(toReality === 1 ? 130 : 100, t);
    subOsc.frequency.exponentialRampToValueAtTime(40, t + 0.35);

    subGain.gain.setValueAtTime(0.25, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 0.38);

    // Quantum phase shimmer sweep
    const shimmerOsc = this.ctx.createOscillator();
    const shimmerFilter = this.ctx.createBiquadFilter();
    const shimmerGain = this.ctx.createGain();

    shimmerOsc.type = 'sawtooth';
    shimmerOsc.frequency.setValueAtTime(toReality === 1 ? 400 : 300, t);
    shimmerOsc.frequency.linearRampToValueAtTime(toReality === 1 ? 800 : 500, t + 0.28);

    shimmerFilter.type = 'bandpass';
    shimmerFilter.Q.setValueAtTime(6, t);
    shimmerFilter.frequency.setValueAtTime(250, t);
    shimmerFilter.frequency.exponentialRampToValueAtTime(2400, t + 0.25);

    shimmerGain.gain.setValueAtTime(0.1, t);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    shimmerOsc.connect(shimmerFilter);
    shimmerFilter.connect(shimmerGain);
    shimmerGain.connect(this.masterGain);

    shimmerOsc.start(t);
    shimmerOsc.stop(t + 0.32);

    this.updateRealityAmbience(toReality);
  }

  public playButtonSound() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playMachineSound() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    // Turbine spin-up
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.5);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.7);

    // Harmonic power-grid lock
    const notes = [220, 277.18, 329.63, 440, 554.37];
    notes.forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const start = t + 0.2 + i * 0.08;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f, start);
      g.gain.setValueAtTime(0.07, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      o.connect(g);
      g.connect(this.masterGain);
      o.start(start);
      o.stop(start + 0.35);
    });
  }

  public playTerminalSound() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const freqs = [587.33, 739.99, 880, 1174.66];
    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const noteTime = t + idx * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.06, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.1);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.1);
    });
  }

  public playDoorUnlocked() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, t);
    osc.frequency.setValueAtTime(659.25, t + 0.08);
    osc.frequency.setValueAtTime(1046.5, t + 0.16);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  public playPlayerFall() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.35);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  public playWinSound() {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const chords = [
      { freqs: [440, 554.37, 659.25], start: 0, dur: 0.25 },
      { freqs: [493.88, 622.25, 739.99], start: 0.22, dur: 0.25 },
      { freqs: [554.37, 698.46, 830.61], start: 0.44, dur: 0.3 },
      { freqs: [659.25, 830.61, 987.77], start: 0.72, dur: 0.8 },
    ];

    chords.forEach((chord) => {
      chord.freqs.forEach((freq) => {
        if (!this.ctx || !this.masterGain) return;
        const noteStart = t + chord.start;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);
        gain.gain.setValueAtTime(0.08, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + chord.dur);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(noteStart);
        osc.stop(noteStart + chord.dur);
      });
    });
  }

  // Helper aliases for event triggers
  public playHazardReset() {
    this.playPlayerFall();
  }

  public playTerminalBeep() {
    this.playTerminalSound();
  }

  public playInteract() {
    this.playButtonSound();
  }

  public playSwitchToggle() {
    this.playButtonSound();
  }

  public playBridgeAlign() {
    this.playMachineSound();
  }

  public playVictory() {
    this.playWinSound();
  }
}

export const audioManager = new AudioManager();
