export interface VoiceParams {
  attackTime: number;   // seconds
  releaseTime: number;  // seconds
  sustainLevel: number; // 0..1
}

export class Voice {
  private osc: OscillatorNode;
  private gainNode: GainNode;
  midiNum: number | null = null;
  isPlaying: boolean = false;
  startTime: number = 0;

  constructor(
    ctx: AudioContext,
    wave: PeriodicWave,
    _params: VoiceParams,
    destination: AudioNode
  ) {
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0;
    this.gainNode.connect(destination);

    this.osc = ctx.createOscillator();
    this.osc.frequency.value = 440;
    this.osc.setPeriodicWave(wave);
    this.osc.connect(this.gainNode);
    this.osc.start();
  }

  setFrequency(freq: number): void {
    this.osc.frequency.value = freq;
  }

  noteOn(ctx: AudioContext, midiNum: number, freq: number, params: VoiceParams): void {
    const now = ctx.currentTime;

    // If voice is being stolen (currently playing), fade out quickly first
    if (this.isPlaying) {
      const fadeOutTime = 0.010; // 10ms quick fade to prevent clicks
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      this.gainNode.gain.linearRampToValueAtTime(0, now + fadeOutTime);

      // Schedule the new note to start after fade-out
      const startTime = now + fadeOutTime;
      this.midiNum = midiNum;
      this.startTime = startTime;
      this.osc.frequency.setValueAtTime(freq, startTime);
      this.gainNode.gain.setValueAtTime(0, startTime);
      this.gainNode.gain.linearRampToValueAtTime(params.sustainLevel, startTime + params.attackTime);
    } else {
      // Normal note start (voice was idle)
      this.midiNum = midiNum;
      this.isPlaying = true;
      this.startTime = now;
      this.osc.frequency.value = freq;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(0, now);
      this.gainNode.gain.linearRampToValueAtTime(params.sustainLevel, now + params.attackTime);
    }

    this.isPlaying = true;
  }

  noteOff(ctx: AudioContext, params: VoiceParams): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    const now = ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(0, now + params.releaseTime);
  }

  kill(): void {
    this.gainNode.gain.cancelScheduledValues(0);
    this.gainNode.gain.value = 0;
    this.isPlaying = false;
    this.midiNum = null;
  }

  updateWave(wave: PeriodicWave): void {
    this.osc.setPeriodicWave(wave);
  }

  setDestination(newDest: AudioNode): void {
    this.gainNode.disconnect();
    this.gainNode.connect(newDest);
  }
}
