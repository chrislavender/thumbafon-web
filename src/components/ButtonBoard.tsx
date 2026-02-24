import React, { useCallback, useEffect, useRef, useState } from 'react';
import { noteInfoForIndex, type NoteInfo } from '../music/Scale';
import SynthButton from './SynthButton';

interface ButtonBoardProps {
  onNoteOn: (midiNum: number) => void;
  onNoteOff: (midiNum: number) => void;
  onNoteChange: (oldMidi: number, newMidi: number) => void;
  onKillAll: () => void;
  onGridChange: (notes: { midiNum: number; color: string }[]) => void;
}


const ButtonBoard: React.FC<ButtonBoardProps> = ({
  onNoteOn,
  onNoteOff,
  onNoteChange,
  onKillAll,
  onGridChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, number | null>());
  const lastOrientation = useRef<'portrait' | 'landscape'>('landscape');

  const [notes, setNotes] = useState<NoteInfo[]>([]);
  const [btnW, setBtnW] = useState(160);
  const [btnH, setBtnH] = useState(180);
  const [cols, setCols] = useState(4);
  const [highlightedMidis, setHighlightedMidis] = useState<Set<number>>(
    () => new Set(),
  );

  // Recalculate grid on resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;

      const compact = width <= 768;
      const bw = compact ? 120 : 160;
      const bh = compact ? 130 : 180;

      // Only update the stored orientation when the window is large enough
      // to meaningfully fit the minimum grid for that orientation.
      // Portrait min: 2 cols × 4 rows. Landscape min: 4 cols × 2 rows.
      const fitsPortrait  = width >= bw * 2 && height >= bh * 4;
      const fitsLandscape = width >= bw * 4 && height >= bh * 2;
      if (fitsPortrait || fitsLandscape) {
        lastOrientation.current = height >= width ? 'portrait' : 'landscape';
      }

      // Calculate maximum columns and rows that fit completely
      const c = Math.floor(width  / bw);
      const r = Math.floor(height / bh);
      const total = c * r;

      const ascending: NoteInfo[] = [];
      for (let i = 0; i < total; i++) {
        ascending.push(noteInfoForIndex(i, total));
      }
      // Reverse row order: lowest notes at the bottom, highest at the top.
      // Slice each row then reverse the row array before flattening.
      const newNotes: NoteInfo[] = [];
      for (let row = r - 1; row >= 0; row--) {
        for (let col = 0; col < c; col++) {
          newNotes.push(ascending[row * c + col]);
        }
      }

      setBtnW(bw);
      setBtnH(bh);
      setCols(c);
      setNotes(newNotes);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Notify parent when notes change
  useEffect(() => {
    if (notes.length > 0) {
      onGridChange(notes);
    }
  }, [notes, onGridChange]);

  function getMidiFromPoint(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const midi = el?.closest('[data-midi]')?.getAttribute('data-midi');
    return midi ? parseInt(midi, 10) : null;
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const midi = getMidiFromPoint(e.clientX, e.clientY);
      pointers.current.set(e.pointerId, midi);
      if (midi !== null) {
        onNoteOn(midi);
        setHighlightedMidis((prev) => {
          const next = new Set(prev);
          next.add(midi);
          return next;
        });
      }
    },
    [onNoteOn],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      const oldMidi = pointers.current.get(e.pointerId)!;
      const newMidi = getMidiFromPoint(e.clientX, e.clientY);

      if (newMidi === oldMidi) return;

      pointers.current.set(e.pointerId, newMidi);

      if (oldMidi !== null && newMidi !== null) {
        onNoteChange(oldMidi, newMidi);
      } else if (oldMidi !== null && newMidi === null) {
        onNoteOff(oldMidi);
      } else if (oldMidi === null && newMidi !== null) {
        onNoteOn(newMidi);
      }

      setHighlightedMidis(() => {
        const active = new Set<number>();
        for (const midi of pointers.current.values()) {
          if (midi !== null) active.add(midi);
        }
        return active;
      });
    },
    [onNoteOn, onNoteOff, onNoteChange],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const midi = pointers.current.get(e.pointerId);
      if (midi !== null && midi !== undefined) {
        onNoteOff(midi);
      }
      pointers.current.delete(e.pointerId);

      setHighlightedMidis(() => {
        const active = new Set<number>();
        for (const midi of pointers.current.values()) {
          if (midi !== null) active.add(midi);
        }
        return active;
      });
    },
    [onNoteOff],
  );

  const handlePointerCancel = useCallback(() => {
    onKillAll();
    pointers.current.clear();
    setHighlightedMidis(new Set());
  }, [onKillAll]);

  return (
    <div
      ref={containerRef}
      className="button-board"
      style={{ touchAction: 'none', userSelect: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div
        className="button-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, ${btnW}px)` }}
      >
        {notes.map((note) => (
          <SynthButton
            key={note.midiNum}
            midiNum={note.midiNum}
            color={note.color}
            highlighted={highlightedMidis.has(note.midiNum)}
            width={btnW}
            height={btnH}
          />
        ))}
      </div>
    </div>
  );
};

export default ButtonBoard;
