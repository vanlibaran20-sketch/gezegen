/**
 * Web Audio API synthesizer for the Space Battle Game
 * Completely self-contained procedural sound generator
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private musicTimer: any = null;
  private currentSeqStep: number = 0;
  private chordProgression = [
    [110, 137.5, 165],     // Am chord notes
    [130.81, 164.81, 196], // C chord notes
    [116.54, 138.59, 174.61], // Bbm chord notes
    [98, 123.47, 146.83]   // G chord notes
  ];
  private currentChordIndex: number = 0;

  constructor() {
    // Initialized on first user interaction to bypass browser policies
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtxFunc = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AudioCtxFunc) return;
      this.ctx = new AudioCtxFunc();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    } catch (e) {
      console.error("AudioContext initialization failed:", e);
    }
  }

  public resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.resume();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.5, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public setSfxVolume(volume: number) {
    this.resume();
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(volume, this.ctx.currentTime);
    }
  }

  public setMusicVolume(volume: number) {
    this.resume();
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(volume, this.ctx.currentTime);
    }
  }

  // --- SOUND EFFECTS ---

  public playLaser(freq = 880) {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      if (this.sfxGain) gain.connect(this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {
      // Fail silently
    }
  }

  public playLaserEnemy() {
    this.playLaser(440);
  }

  public playExplosion(intensity = 1) {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    try {
      const bufferSize = this.ctx.sampleRate * 0.4 * intensity;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate some white/pink noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.35 * intensity);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.6 * intensity, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.38 * intensity);

      noiseNode.connect(filter);
      filter.connect(gain);
      if (this.sfxGain) gain.connect(this.sfxGain);

      noiseNode.start();
      noiseNode.stop(this.ctx.currentTime + 0.4 * intensity);
    } catch (e) {
      // Fallback synthesizer explosion
      this.playSynthExplosion(intensity);
    }
  }

  private playSynthExplosion(intensity: number) {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.3);
      
      gain.gain.setValueAtTime(0.5 * intensity, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {}
  }

  public playPlayerHit() {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

      osc.connect(gain);
      if (this.sfxGain) gain.connect(this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch (e) {}
  }

  public playPowerUp() {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25]; // C major arpeggio
      notes.forEach((note, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note, now + index * 0.08);
        
        gain.gain.setValueAtTime(0, now + index * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + index * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.08 + 0.2);
        
        osc.connect(gain);
        if (this.sfxGain) gain.connect(this.sfxGain);
        
        osc.start(now + index * 0.08);
        osc.stop(now + index * 0.08 + 0.25);
      });
    } catch (e) {}
  }

  public playBossAlarm() {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(300, now + 0.3);
      osc.frequency.linearRampToValueAtTime(400, now + 0.6);
      
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      
      osc.connect(gain);
      if (this.sfxGain) gain.connect(this.sfxGain);
      
      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {}
  }

  // --- BACKGROUND MUSIC SYNTHESIZER ---

  public startMusic() {
    this.resume();
    if (this.musicTimer) return;
    
    const playSequencerStep = () => {
      if (!this.ctx || this.isMuted) {
        this.musicTimer = setTimeout(playSequencerStep, 500);
        return;
      }

      try {
        const now = this.ctx.currentTime;
        const chords = this.chordProgression[this.currentChordIndex];
        
        // Base synth chord note based on current chord progression
        if (this.currentSeqStep === 0) {
          chords.forEach((note) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note, now);
            
            gain.gain.setValueAtTime(0.0, now);
            gain.gain.linearRampToValueAtTime(0.06, now + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
            
            osc.connect(gain);
            if (this.musicGain) gain.connect(this.musicGain);
            osc.start(now);
            osc.stop(now + 2.0);
          });
        }

        // Retro drum kick simulation
        if (this.currentSeqStep % 4 === 0) {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(120, now);
          kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.12);
          
          kickGain.gain.setValueAtTime(0.2, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          
          kickOsc.connect(kickGain);
          if (this.musicGain) kickGain.connect(this.musicGain);
          kickOsc.start(now);
          kickOsc.stop(now + 0.15);
        }

        // Hi-Hat simulation
        if (this.currentSeqStep % 4 === 2) {
          const bufferSize = this.ctx.sampleRate * 0.05;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
          
          const hatNode = this.ctx.createBufferSource();
          hatNode.buffer = buffer;
          
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(8000, now);
          
          const hatGain = this.ctx.createGain();
          hatGain.gain.setValueAtTime(0.03, now);
          hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          
          hatNode.connect(filter);
          filter.connect(hatGain);
          if (this.musicGain) hatGain.connect(this.musicGain);
          hatNode.start(now);
          hatNode.stop(now + 0.05);
        }

        // Ambient Melody Arpeggio
        if (this.currentSeqStep % 2 === 0) {
          const chordIndex = this.currentSeqStep % chords.length;
          const melodyNote = chords[chordIndex] * 2; // Octave up
          const melOsc = this.ctx.createOscillator();
          const melGain = this.ctx.createGain();
          
          melOsc.type = 'sine';
          melOsc.frequency.setValueAtTime(melodyNote, now);
          
          melGain.gain.setValueAtTime(0.0, now);
          melGain.gain.linearRampToValueAtTime(0.04, now + 0.03);
          melGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          
          melOsc.connect(melGain);
          if (this.musicGain) melGain.connect(this.musicGain);
          melOsc.start(now);
          melOsc.stop(now + 0.3);
        }

        // Advance steps
        this.currentSeqStep = (this.currentSeqStep + 1) % 8;
        if (this.currentSeqStep === 0) {
          this.currentChordIndex = (this.currentChordIndex + 1) % this.chordProgression.length;
        }

        // Each step or tick is 250ms
        this.musicTimer = setTimeout(playSequencerStep, 250);
      } catch (err) {
        this.musicTimer = setTimeout(playSequencerStep, 500);
      }
    };

    playSequencerStep();
  }

  public stopMusic() {
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundEngine = new SoundEngine();
