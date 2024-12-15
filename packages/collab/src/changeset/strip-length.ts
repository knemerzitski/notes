import { DeleteStrip } from '.';

export function getDefaultStripLength(strip: Readonly<{ readonly length: number }>) {
  return strip.length;
}

export const getStripLengthIncludeDeletion: typeof getDefaultStripLength = (strip) => {
  if (strip instanceof DeleteStrip) {
    return strip.deleteLength;
  }

  return getDefaultStripLength(strip);
};
