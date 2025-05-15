import { Strip } from '..';

export function maxInputLength(strips: readonly Strip[]): number {
  return strips.map(stripInputLength).reduce(mathMaxBin, 0);
}

export function outputLengthSum(strips: readonly Strip[]): number {
  return strips.map(stripOutputLength).reduce(sumBin, 0);
}

function stripInputLength(strip: Strip) {
  return strip.inputLength;
}

function stripOutputLength(strip: Strip) {
  return strip.outputLength;
}

function mathMaxBin(a: number, b: number) {
  return Math.max(a, b);
}

function sumBin(a: number, b: number) {
  return a + b;
}
