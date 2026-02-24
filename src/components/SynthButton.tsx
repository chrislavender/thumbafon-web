import React from 'react';

interface SynthButtonProps {
  midiNum: number;
  color: string;
  highlighted: boolean;
  width: number;
  height: number;
}

const SynthButton: React.FC<SynthButtonProps> = ({
  midiNum,
  color,
  highlighted,
  width,
  height,
}) => (
  <div
    className={`synth-btn${highlighted ? ' active' : ''}`}
    data-midi={midiNum}
    style={{ backgroundColor: color, width: `${width}px`, height: `${height}px` }}
  />
);

export default React.memo(SynthButton);
