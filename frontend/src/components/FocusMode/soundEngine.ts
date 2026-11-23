// Procedural Web Audio API sound generator for Focusage Focus Mode.
// 100% royalty-free, zero network requests, lightweight, and fully offline.

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private masterVolume = 0.7;

  // Active sound layers
  private rainGain: GainNode | null = null;

  private windGain: GainNode | null = null;

  private fireGain: GainNode | null = null;
  private fireTimer: number | null = null;

  private cafeGain: GainNode | null = null;

  // Lo-Fi Chord Synthesizer
  private lofiGain: GainNode | null = null;
  private lofiTimer: number | null = null;
  private isLofiPlaying: boolean = false;

  private initContext() {
    if (this.ctx?.state === "closed") this.reset();
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => undefined);
    }
  }

  // --- Noise Generators ---
  private createPinkNoiseNode(): AudioNode | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    noise.start(0);
    return noise;
  }

  private createBrownNoiseNode(): AudioNode | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    noise.start(0);
    return noise;
  }

  // --- Rain Layer ---
  public setRainVolume(vol: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (!this.rainGain) {
      this.rainGain = this.ctx.createGain();
      const noise = this.createPinkNoiseNode();
      if (!noise) return;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1000, this.ctx.currentTime);

      const highpass = this.ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.setValueAtTime(300, this.ctx.currentTime);

      noise.connect(highpass);
      highpass.connect(filter);
      filter.connect(this.rainGain);
      this.rainGain.connect(this.masterGain);
    }

    this.rainGain.gain.setTargetAtTime(vol * 0.5, this.ctx.currentTime, 0.05);
  }

  // --- Wind Layer ---
  public setWindVolume(vol: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (!this.windGain) {
      this.windGain = this.ctx.createGain();
      const noise = this.createBrownNoiseNode();
      if (!noise) return;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);
      filter.Q.setValueAtTime(3.0, this.ctx.currentTime);

      // Low frequency modulation for wind breathing
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.18, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(180, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      noise.connect(filter);
      filter.connect(this.windGain);
      this.windGain.connect(this.masterGain);
    }

    this.windGain.gain.setTargetAtTime(vol * 0.45, this.ctx.currentTime, 0.05);
  }

  // --- Fireplace Layer (Crackle + Rumble) ---
  public setFireVolume(vol: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (!this.fireGain) {
      this.fireGain = this.ctx.createGain();
      const rumble = this.createBrownNoiseNode();
      if (rumble) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(240, this.ctx.currentTime);
        rumble.connect(filter);
        filter.connect(this.fireGain);
      }
      this.fireGain.connect(this.masterGain);

      // Schedule random crackle bursts
      const triggerCrackle = () => {
        if (!this.ctx || !this.fireGain) return;
        if (this.fireGain.gain.value > 0.01) {
          const osc = this.ctx.createOscillator();
          const burstGain = this.ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(600 + Math.random() * 1200, this.ctx.currentTime);

          burstGain.gain.setValueAtTime(0.04 * (this.fireGain.gain.value / 0.5), this.ctx.currentTime);
          burstGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.03 + Math.random() * 0.04);

          osc.connect(burstGain);
          burstGain.connect(this.masterGain!);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.08);
        }
        const nextTime = 120 + Math.random() * 450;
        this.fireTimer = window.setTimeout(triggerCrackle, nextTime);
      };
      triggerCrackle();
    }

    this.fireGain.gain.setTargetAtTime(vol * 0.5, this.ctx.currentTime, 0.05);
  }

  // --- Café Ambience Layer ---
  public setCafeVolume(vol: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (!this.cafeGain) {
      this.cafeGain = this.ctx.createGain();
      const noise = this.createPinkNoiseNode();
      if (!noise) return;

      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(450, this.ctx.currentTime);

      const highpass = this.ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.setValueAtTime(120, this.ctx.currentTime);

      noise.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(this.cafeGain);
      this.cafeGain.connect(this.masterGain);
    }

    this.cafeGain.gain.setTargetAtTime(vol * 0.4, this.ctx.currentTime, 0.05);
  }

  // --- Lo-Fi Chords Music Generator ---
  public setLofiVolume(vol: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (!this.lofiGain) {
      this.lofiGain = this.ctx.createGain();
      this.lofiGain.connect(this.masterGain);
    }
    this.lofiGain.gain.setTargetAtTime(vol * 0.35, this.ctx.currentTime, 0.05);

    if (vol > 0.01 && !this.isLofiPlaying) {
      this.startLofiProgression();
    } else if (vol <= 0.01 && this.isLofiPlaying) {
      this.stopLofiProgression();
    }
  }

  private startLofiProgression() {
    this.isLofiPlaying = true;
    // Soothing Neo-Soul / Lo-Fi chord progressions (frequencies in Hz)
    // Progression: Ebmaj9 -> Cm9 -> Fm9 -> Bb13
    const progressions = [
      [155.56, 196.00, 233.08, 293.66, 349.23], // Eb3, G3, Bb3, D4, F4
      [130.81, 196.00, 233.08, 293.66, 311.13], // C3, G3, Bb3, D4, Eb4
      [174.61, 220.00, 261.63, 329.63, 392.00], // F3, A3, C4, E4, G4
      [116.54, 185.00, 233.08, 293.66, 369.99], // Bb2, F#3, Bb3, D4, F#4
    ];

    let chordIdx = 0;

    const playNextChord = () => {
      if (!this.isLofiPlaying || !this.ctx || !this.lofiGain) return;

      const chord = progressions[chordIdx % progressions.length];
      chordIdx++;

      chord.forEach((freq, i) => {
        if (!this.ctx || !this.lofiGain) return;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Soft sine + triangle warmth
        osc.type = i === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // Warm LP filter to emulate vintage tape Rhodes
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(800 + Math.random() * 200, this.ctx.currentTime);

        const now = this.ctx.currentTime;
        const dur = 4.2;

        noteGain.gain.setValueAtTime(0.0001, now);
        // Staggered arpeggiation
        const noteStart = now + i * 0.08;
        noteGain.gain.setValueAtTime(0.0001, noteStart);
        noteGain.gain.linearRampToValueAtTime(0.06, noteStart + 0.4);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + dur);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(this.lofiGain);

        osc.start(noteStart);
        osc.stop(noteStart + dur + 0.1);
      });

      this.lofiTimer = window.setTimeout(playNextChord, 4500);
    };

    playNextChord();
  }

  private stopLofiProgression() {
    this.isLofiPlaying = false;
    if (this.lofiTimer) {
      window.clearTimeout(this.lofiTimer);
      this.lofiTimer = null;
    }
  }

  // --- Master Controls ---
  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    this.initContext();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  public toggleMute(restoreVolume = 0.7): boolean {
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      this.masterVolume = Math.max(0, Math.min(1, restoreVolume));
    }
    if (this.masterGain && this.ctx && this.ctx.state !== "closed") {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public stopAll() {
    this.stopLofiProgression();
    if (this.fireTimer) {
      window.clearTimeout(this.fireTimer);
      this.fireTimer = null;
    }
    if (!this.ctx || this.ctx.state === "closed") return;
    if (this.rainGain) this.rainGain.gain.setValueAtTime(0, this.ctx.currentTime);
    if (this.windGain) this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);
    if (this.fireGain) this.fireGain.gain.setValueAtTime(0, this.ctx.currentTime);
    if (this.cafeGain) this.cafeGain.gain.setValueAtTime(0, this.ctx.currentTime);
    if (this.lofiGain) this.lofiGain.gain.setValueAtTime(0, this.ctx.currentTime);
  }

  public reset() {
    const context = this.ctx;
    this.stopAll();
    this.ctx = null;
    this.masterGain = null;
    this.rainGain = null;
    this.windGain = null;
    this.fireGain = null;
    this.cafeGain = null;
    this.lofiGain = null;
    this.fireTimer = null;
    this.lofiTimer = null;
    this.isLofiPlaying = false;
    this.isMuted = false;
    this.masterVolume = 0.7;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);
  }
}

export const ambientSound = new AmbientSoundEngine();
