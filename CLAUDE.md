# Thumbafon-Web - Claude Code Project Guide

## Project Overview
A web-based polyphonic synthesizer built with React 19 + TypeScript + Vite. Touch-enabled grid interface for playing musical notes with multiple instrument sounds.

## Architecture

### Audio Engine (`src/audio/`)
- **AudioEngine.ts**: Main audio engine using Web Audio API
  - Fixed pool of 4 voices for polyphony
  - Voice stealing algorithm (oldest-first when all busy)
  - Audio graph: voices → masterGain → volumeGain → dryGain/wetGain → convolver → destination
  - Reverb: 50/50 dry/wet mix using convolver with procedural impulse response

- **Voice.ts**: Individual voice management
  - Each voice: oscillator → gainNode
  - Dynamic note assignment (midiNum can change)
  - ADSR envelope (attack/release)
  - Tracks `startTime` for voice stealing priority

- **Waveforms.ts**: 5 instrument types using PeriodicWave API
  - sine (Piano): pure fundamental
  - organ: first 5 harmonics
  - square (Strings): odd harmonics 1,3,5,7,9
  - saw (Brass): harmonics 1-9
  - triangle (Flute): odd harmonics 1/n²

### UI Components (`src/components/`)
- **App.tsx**: Main app shell
  - Sound selector (5 instruments)
  - Volume slider (0-100%)
  - Handles window blur/visibility to kill notes (safety)

- **ButtonBoard.tsx**: Responsive grid of playable notes
  - Adaptive grid: 4-8 cols × 2-4 rows based on window size
  - Multi-touch via Pointer Events API with pointer capture
  - Supports glissando (drag between notes)
  - Uses ResizeObserver for dynamic layout

- **SynthButton.tsx**: Individual note button (color-coded by pitch)

### Music System (`src/music/`)
- **Scale.ts**: Major pentatonic scale [0,2,4,7,9]
  - MIDI-to-frequency conversion
  - HSL color generation based on note position

## Key Features
- ✅ 4-voice polyphony with voice stealing
- ✅ Multi-touch support (up to 4 simultaneous notes)
- ✅ Glissando (smooth pitch transitions)
- ✅ 5 distinct instrument sounds
- ✅ Reverb effect
- ✅ Volume control
- ✅ Responsive layout
- ✅ Auto-kill notes on window blur/hide

## Development Commands
```bash
npm run dev      # Start dev server (localhost:5173)
npm run build    # Build for production
npm run preview  # Preview production build
```

## Deployment
- **Platform**: GitHub Pages
- **URL**: https://chrislavender.github.io/thumbafon-web/
- **Method**: GitHub Actions (auto-deploys on push to master)
- **Workflow**: `.github/workflows/deploy.yml`

## Important Implementation Details

### Audio Context Management
- AudioContext must be resumed on first user interaction (browser policy)
- Resume happens in `noteOn()` method
- Check: `if (ctx.state === 'suspended') ctx.resume()`

### Gain Management
- **masterGain**: Dynamic scaling (1/n where n = active voice count)
- **volumeGain**: User-controlled volume (0.0 to 1.0)
- **dryGain/wetGain**: Fixed 0.5 each for reverb mix

### Voice Stealing Algorithm
1. Check for idle voices first
2. If all busy, steal voice with earliest `startTime`
3. Prevents note doubling (checks if MIDI already playing)

## Known Patterns
- Single audio engine instance (singleton pattern)
- Preallocated voices for low latency
- Pointer capture for reliable multi-touch
- Fixed 4-voice limit prevents CPU overload

## Future Considerations
- Consider adding ADSR envelope controls
- Potential for more scales/modes
- Effects chain extensibility
- MIDI input support
- Recording/playback functionality

## Code Style
- TypeScript strict mode
- React functional components with hooks
- Minimal external dependencies
- Web Audio API (no Tone.js or similar)

---
*This file helps Claude Code understand the project across sessions. Update as architecture evolves.*
