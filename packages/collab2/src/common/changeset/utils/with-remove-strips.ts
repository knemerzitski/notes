import { RemoveStrip, RetainStrip, Strip } from '..';

/**
 * Adds RemoveStrips between RetainStrips. InsertStrip will always come before any RemoveStrip
 * @param target
 * @returns
 */
export function withRemoveStrips(
  inputLength: number,
  strips: readonly Strip[]
): readonly Strip[] {
  let prevEnd = 0;

  const result: Strip[] = [];

  for (const strip of strips) {
    if (strip.isEmpty()) {
      continue;
    }

    if (RetainStrip.is(strip)) {
      if (prevEnd < strip.start) {
        result.push(RemoveStrip.create(prevEnd, strip.start));
      }

      prevEnd = strip.end;
    } else if (RemoveStrip.is(strip)) {
      // Abort since already found removed characters
      return strips;
    }

    result.push(strip);
  }

  if (prevEnd < inputLength) {
    result.push(RemoveStrip.create(prevEnd, inputLength));
  }

  return result;
}
