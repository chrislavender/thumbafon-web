import type { VoiceParams } from './Voice';

export type WaveformType = 'sine' | 'organ' | 'square' | 'saw' | 'triangle';

export interface WaveformDef {
  wave: PeriodicWave;
  params: VoiceParams;
}

export function buildWaveforms(ctx: AudioContext): Record<WaveformType, WaveformDef> {
  return {
    sine: buildSine(ctx),
    organ: buildOrgan(ctx),
    square: buildSquare(ctx),
    saw: buildSaw(ctx),
    triangle: buildTriangle(ctx),
  };
}

function createWave(ctx: AudioContext, real: Float32Array, imag: Float32Array): PeriodicWave {
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
}

function buildSine(ctx: AudioContext): WaveformDef {
  const real = new Float32Array(2);
  const imag = new Float32Array(2);
  imag[1] = 1.0;
  return {
    wave: createWave(ctx, real, imag),
    params: { attackTime: 0.005, releaseTime: 0.010, sustainLevel: 0.9 },
  };
}

function buildOrgan(ctx: AudioContext): WaveformDef {
  const len = 6; // indices 0..5
  const real = new Float32Array(len);
  const imag = new Float32Array(len);
  for (let n = 1; n <= 5; n++) {
    imag[n] = 1.0;
  }
  return {
    wave: createWave(ctx, real, imag),
    params: { attackTime: 0.010, releaseTime: 0.050, sustainLevel: 1.0 },
  };
}

function buildSquare(ctx: AudioContext): WaveformDef {
  const len = 10; // indices 0..9
  const real = new Float32Array(len);
  const imag = new Float32Array(len);
  for (const n of [1, 3, 5, 7, 9]) {
    imag[n] = 1.0 / n;
  }
  return {
    wave: createWave(ctx, real, imag),
    params: { attackTime: 0.500, releaseTime: 0.500, sustainLevel: 1.0 },
  };
}

function buildSaw(ctx: AudioContext): WaveformDef {
  const len = 10; // indices 0..9
  const real = new Float32Array(len);
  const imag = new Float32Array(len);
  for (let n = 1; n <= 9; n++) {
    imag[n] = 1.0 / n;
  }
  return {
    wave: createWave(ctx, real, imag),
    params: { attackTime: 0.009, releaseTime: 0.010, sustainLevel: 0.6 },
  };
}

function buildTriangle(ctx: AudioContext): WaveformDef {
  const len = 8; // indices 0..7
  const real = new Float32Array(len);
  const imag = new Float32Array(len);
  for (const n of [1, 3, 5, 7]) {
    imag[n] = 1.0 / (n * n);
  }
  return {
    wave: createWave(ctx, real, imag),
    params: { attackTime: 0.050, releaseTime: 0.050, sustainLevel: 1.0 },
  };
}
