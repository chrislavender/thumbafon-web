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
  private static readonly MAX_POLYPHONY = 3;

  private ctx: AudioContext | null = null;
  private voicePool: Voice[] = [];
  private waveforms: Record<WaveformType, WaveformDef> | null = null;
  private currentType: WaveformType = 'sine';

  private masterGain: GainNode | null = null;
  private volumeGain: GainNode | null = null;
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
    this.volumeGain?.disconnect();
    this.dryGain?.disconnect();
    this.wetGain?.disconnect();
    this.convolver?.disconnect();

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1;

    this.volumeGain = ctx.createGain();
    this.volumeGain.gain.value = 0.7; // Default 70% volume

    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 0.5;

    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0.5;

    this.convolver = ctx.createConvolver();
    this.convolver.buffer = buildIR(ctx);

    // Audio graph: masterGain → volumeGain → dryGain/wetGain → destination
    this.masterGain.connect(this.volumeGain);
    this.volumeGain.connect(this.dryGain);
    this.volumeGain.connect(this.wetGain);
    this.dryGain.connect(ctx.destination);
    this.wetGain.connect(this.convolver);
    this.convolver.connect(ctx.destination);
  }

  private updateMasterGain(): void {
    if (!this.masterGain || !this.ctx) return;
    const playingCount = this.voicePool.filter(v => v.isPlaying).length;
    // Scale gain based on number of active voices to prevent clipping
    // 1 voice = 1.0, 2 voices = 0.5, 3 voices = 0.33
    const targetGain = playingCount > 0 ? 1.0 / playingCount : 1.0;
    const now = this.ctx.currentTime;
    const rampTime = 0.015; // 15ms smooth ramp to prevent clicks

    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);

    // Use exponentialRamp for smoother transitions, but handle zero case
    if (targetGain > 0) {
      this.masterGain.gain.exponentialRampToValueAtTime(targetGain, now + rampTime);
    } else {
      // For zero target, ramp to a very small value then set to zero
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + rampTime);
    }
  }

  private findAvailableVoice(): Voice | null {
    // First, try to find an idle voice
    for (const voice of this.voicePool) {
      if (!voice.isPlaying) return voice;
    }
    // All voices busy - steal the oldest one
    let oldestVoice = this.voicePool[0];
    for (const voice of this.voicePool) {
      if (voice.isPlaying && voice.startTime < oldestVoice.startTime) {
        oldestVoice = voice;
      }
    }
    return oldestVoice;
  }

  private findVoiceByMidi(midiNum: number): Voice | null {
    return this.voicePool.find(v => v.isPlaying && v.midiNum === midiNum) || null;
  }

  private get currentWaveform(): WaveformDef {
    return this.waveforms![this.currentType];
  }

  initVoices(_notes: NoteInit[]): void {
    const ctx = this.ensureContext();

    // Kill all existing voices
    for (const voice of this.voicePool) {
      voice.kill();
    }
    this.voicePool = [];

    // Rebuild the audio graph
    this.buildGraph(ctx);

    // Create fixed pool of 3 voices
    const { wave, params } = this.currentWaveform;
    for (let i = 0; i < AudioEngine.MAX_POLYPHONY; i++) {
      const voice = new Voice(ctx, wave, params, this.masterGain!);
      this.voicePool.push(voice);
    }
  }

  noteOn(midiNum: number): void {
    const ctx = this.ctx;
    if (!ctx) return;

    // Resume AudioContext if suspended (required by browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(err => console.error('Failed to resume audio context:', err));
    }

    // Check if this note is already playing
    const existingVoice = this.findVoiceByMidi(midiNum);
    if (existingVoice) return; // Note already playing

    // Get an available voice (may steal oldest)
    const voice = this.findAvailableVoice();
    if (!voice) return;

    const freq = noteNumToFreq(midiNum);
    voice.noteOn(ctx, midiNum, freq, this.currentWaveform.params);
    this.updateMasterGain();
  }

  noteOff(midiNum: number): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const voice = this.findVoiceByMidi(midiNum);
    if (!voice) return;

    voice.noteOff(ctx, this.currentWaveform.params);
    this.updateMasterGain();
  }

  changeNote(oldMidi: number, newMidi: number): void {
    const ctx = this.ctx;
    if (!ctx) return;

    // Find the voice playing the old note
    const voice = this.findVoiceByMidi(oldMidi);
    if (!voice) {
      // Old note not playing, just start new note
      this.noteOn(newMidi);
      return;
    }

    // Reuse the same voice for the new note (glissando effect)
    const freq = noteNumToFreq(newMidi);
    voice.midiNum = newMidi;
    voice.setFrequency(freq);
  }

  killAll(): void {
    for (const voice of this.voicePool) {
      voice.kill();
    }
    this.updateMasterGain();
  }

  setSoundType(type: SoundType): void {
    this.currentType = type as WaveformType;
    if (!this.waveforms) return;
    const { wave } = this.waveforms[this.currentType];
    for (const voice of this.voicePool) {
      voice.updateWave(wave);
    }
  }

  setVolume(volume: number): void {
    if (!this.volumeGain) return;
    // Clamp volume to 0-1 range
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.volumeGain.gain.value = clampedVolume;
  }
}

export const audioEngine = new AudioEngine();
