import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { audioEngine } from './audio/AudioEngine';
import type { SoundType } from './audio/IAudioEngine';
import ButtonBoard from './components/ButtonBoard';

const SOUND_TYPES: { label: string; value: SoundType }[] = [
  { label: 'Piano', value: 'sine' },
  { label: 'Organ', value: 'organ' },
  { label: 'Strings', value: 'square' },
  { label: 'Brass', value: 'saw' },
  { label: 'Flute', value: 'triangle' },
];

function App() {
  const [soundType, setSoundType] = useState<SoundType>('sine');

  // Kill all notes when the tab loses focus or is hidden
  useEffect(() => {
    const handleBlur = () => audioEngine.killAll();
    const handleVisibility = () => {
      if (document.hidden) audioEngine.killAll();
    };
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleSoundChange = (type: SoundType) => {
    setSoundType(type);
    audioEngine.setSoundType(type);
  };

  const handleGridChange = useCallback(
    (notes: { midiNum: number }[]) => {
      audioEngine.initVoices(notes);
    },
    [],
  );

  const handleNoteOn = useCallback((midiNum: number) => {
    audioEngine.noteOn(midiNum);
  }, []);

  const handleNoteOff = useCallback((midiNum: number) => {
    audioEngine.noteOff(midiNum);
  }, []);

  const handleNoteChange = useCallback((oldMidi: number, newMidi: number) => {
    audioEngine.changeNote(oldMidi, newMidi);
  }, []);

  const handleKillAll = useCallback(() => {
    audioEngine.killAll();
  }, []);

  return (
    <div className="app">
      <div className="sound-selector">
        {SOUND_TYPES.map(({ label, value }) => (
          <button
            key={value}
            className={`sound-btn${soundType === value ? ' active' : ''}`}
            onClick={() => handleSoundChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <ButtonBoard
        onNoteOn={handleNoteOn}
        onNoteOff={handleNoteOff}
        onNoteChange={handleNoteChange}
        onKillAll={handleKillAll}
        onGridChange={handleGridChange}
      />
    </div>
  );
}

export default App;
