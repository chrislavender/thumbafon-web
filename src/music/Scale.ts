export const BASE_SCALE = [0, 2, 4, 7, 9]; // major pentatonic offsets
export const BASE_OCTAVE = 4;              // start octave (5 for small grids ≤12 buttons)

export function noteNumToFreq(midi: number): number {
  return Math.pow(2, (midi - 69) / 12) * 440;
}

export interface NoteInfo {
  midiNum: number;
  color: string;
}

export function noteInfoForIndex(
  buttonIndex: number,
  totalButtons: number
): NoteInfo {
  const noteIndex = buttonIndex % BASE_SCALE.length;
  const rawNote = BASE_SCALE[noteIndex];
  const octaveOffset = totalButtons > 12 ? BASE_OCTAVE : BASE_OCTAVE + 1;
  const octaveNumber =
    buttonIndex === 0
      ? octaveOffset
      : Math.floor(buttonIndex / BASE_SCALE.length) + octaveOffset;
  const midiNum = rawNote + 12 * octaveNumber;

  const degrees = noteIndex * (180 / Math.PI);
  const hue = degrees / 360;
  const sat = 1.0 / (octaveNumber + 1 - octaveOffset) + 0.15;
  const color = `hsl(${hue * 360}deg ${Math.min(sat, 1) * 100}% 60%)`;

  return { midiNum, color };
}
