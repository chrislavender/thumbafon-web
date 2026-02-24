import type { IAudioEngine, NoteInit, SoundType } from './IAudioEngine';
import { Voice } from './Voice';
import { buildWaveforms, type WaveformDef, type WaveformType } from './Waveforms';
import { noteNumToFreq } from '../music/Scale';

function buildIR(ctx: AudioContext, duration = 3): AudioBuffer {
  const len = ctx.sampleRate * duration;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  }
  return buf;
}

export default class AudioEngine implements IAudioEngine {
  private ctx: AudioContext | null = null;
  private voices = new Map<number, Voice>();
  private waveforms: Record<WaveformType, WaveformDef> | null = null;
  private currentType: WaveformType = 'sine';

  private masterGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'interactive' });
      this.waveforms = buildWaveforms(this.ctx);
    }
    return this.ctx;
  }

  private buildGraph(ctx: AudioContext): void {
    // Disconnect old graph nodes if they exist
    this.masterGain?.disconnect();
    this.dryGain?.disconnect();
    this.wetGain?.disconnect();
    this.convolver?.disconnect();

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1;

    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 0.5;

    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0.5;

    this.convolver = ctx.createConvolver();
    this.convolver.buffer = buildIR(ctx);

    this.masterGain.connect(this.dryGain);
    this.masterGain.connect(this.wetGain);
    this.dryGain.connect(ctx.destination);
    this.wetGain.connect(this.convolver);
    this.convolver.connect(ctx.destination);
  }

  private updateMasterGain(): void {
    if (!this.masterGain) return;
    let playingCount = 0;
    for (const voice of this.voices.values()) {
      if (voice.isPlaying) playingCount++;
    }
    this.masterGain.gain.value = 1 / Math.max(1, playingCount);
  }

  private get currentWaveform(): WaveformDef {
    return this.waveforms![this.currentType];
  }

  initVoices(notes: NoteInit[]): void {
    const ctx = this.ensureContext();

    // Kill all existing voices
    for (const voice of this.voices.values()) {
      voice.kill();
    }
    this.voices.clear();

    // Rebuild the audio graph
    this.buildGraph(ctx);

    const { wave, params } = this.currentWaveform;
    for (const note of notes) {
      const freq = noteNumToFreq(note.midiNum);
      const voice = new Voice(ctx, note.midiNum, freq, wave, params, this.masterGain!);
      this.voices.set(note.midiNum, voice);
    }
  }

  noteOn(midiNum: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const voice = this.voices.get(midiNum);
    if (!voice || voice.isPlaying) return;
    voice.noteOn(ctx, this.currentWaveform.params);
    this.updateMasterGain();
  }

  noteOff(midiNum: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const voice = this.voices.get(midiNum);
    if (!voice || !voice.isPlaying) return;
    voice.noteOff(ctx, this.currentWaveform.params);
    this.updateMasterGain();
  }

  changeNote(oldMidi: number, newMidi: number): void {
    this.noteOff(oldMidi);
    this.noteOn(newMidi);
  }

  killAll(): void {
    for (const voice of this.voices.values()) {
      voice.kill();
    }
    if (this.masterGain) {
      this.masterGain.gain.value = 1;
    }
  }

  setSoundType(type: SoundType): void {
    this.currentType = type as WaveformType;
    if (!this.waveforms) return;
    const { wave } = this.waveforms[this.currentType];
    for (const voice of this.voices.values()) {
      voice.updateWave(wave);
    }
  }
}

export const audioEngine = new AudioEngine();
