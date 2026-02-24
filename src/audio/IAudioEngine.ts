export type SoundType = 'sine' | 'organ' | 'square' | 'saw' | 'triangle';

export interface NoteInit {
  midiNum: number;
}

export interface IAudioEngine {
  /** Called once when the grid is (re)built. Creates/replaces the voice pool. */
  initVoices(notes: NoteInit[]): void;

  /** Start playing a note (ramp gain up). No-op if already playing. */
  noteOn(midiNum: number): void;

  /** Stop playing a note (ramp gain down). No-op if not playing. */
  noteOff(midiNum: number): void;

  /** Slide from one note to another without re-triggering attack. */
  changeNote(oldMidi: number, newMidi: number): void;

  /** Immediately silence all voices (pointer cancel / focus loss). */
  killAll(): void;

  /** Swap the active waveform. Takes effect on next noteOn. */
  setSoundType(type: SoundType): void;

  /** Set master volume (0.0 to 1.0). */
  setVolume(volume: number): void;
}
