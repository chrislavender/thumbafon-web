import { useEffect, useRef, useState } from 'react';
import './App.css';
import type { SoundType } from './audio/IAudioEngine';

// ButtonBoard and AudioEngine will be filled in by the UI and Audio agents.
// This file is the integration shell — wired up in task 6.

const SOUND_TYPES: { label: string; value: SoundType }[] = [
  { label: 'Piano', value: 'sine' },
  { label: 'Organ', value: 'organ' },
  { label: 'Strings', value: 'square' },
  { label: 'Brass', value: 'saw' },
  { label: 'Flute', value: 'triangle' },
];

function App() {
  const [soundType, setSoundType] = useState<SoundType>('sine');
  const audioEngineRef = useRef<import('./audio/IAudioEngine').IAudioEngine | null>(null);

  // Placeholder: AudioEngine and ButtonBoard imports added during integration (task 6)
  useEffect(() => {
    // AudioEngine initialised here in task 6
  }, []);

  const handleSoundChange = (type: SoundType) => {
    setSoundType(type);
    audioEngineRef.current?.setSoundType(type);
  };

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
      {/* ButtonBoard inserted here during task 6 */}
      <div id="board-placeholder" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
        Board renders here after integration
      </div>
    </div>
  );
}

export default App;
