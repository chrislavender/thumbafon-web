export interface VoiceParams {
  attackTime: number;   // seconds
  releaseTime: number;  // seconds
  sustainLevel: number; // 0..1
}

export class Voice {
  private osc: OscillatorNode;
  private gainNode: GainNode;
  readonly midiNum: number;
  isPlaying: boolean = false;

  constructor(
    ctx: AudioContext,
    midiNum: number,
    freq: number,
    wave: PeriodicWave,
    _params: VoiceParams,
    destination: AudioNode
  ) {
    this.midiNum = midiNum;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0;
    this.gainNode.connect(destination);

    this.osc = ctx.createOscillator();
    this.osc.frequency.value = freq;
    this.osc.setPeriodicWave(wave);
    this.osc.connect(this.gainNode);
    this.osc.start();
  }

  noteOn(ctx: AudioContext, params: VoiceParams): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    const now = ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(0, now);
    this.gainNode.gain.linearRampToValueAtTime(params.sustainLevel, now + params.attackTime);
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
  }

  updateWave(wave: PeriodicWave): void {
    this.osc.setPeriodicWave(wave);
  }

  setDestination(newDest: AudioNode): void {
    this.gainNode.disconnect();
    this.gainNode.connect(newDest);
  }
}
