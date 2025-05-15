import { RangeStrip, Strip } from '..';

/**
 * @returns `true` when every RangeStrip is ordered ascending without overlaps
 */
export function isOrderedAscending(strips: readonly Strip[]): boolean {
  if (strips.length > 1) {
    let prevEnd = -1;
    for (const strip of strips) {
      if (!strip.isEmpty() && RangeStrip.is(strip)) {
        if (strip.start < prevEnd) {
          return false;
        }
        prevEnd = strip.end;
      }
    }
  }

  return true;
}
