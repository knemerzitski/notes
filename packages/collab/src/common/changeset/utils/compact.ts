import { Strip } from '..';

export function compact(strips: readonly Strip[]): Strip[] {
  if (strips.length == 0) {
    return [];
  }

  if (strips.length === 1) {
    const firstStrip = strips[0];
    if (!firstStrip || firstStrip.isEmpty()) {
      return [];
    }
    return [firstStrip];
  }

  const result = strips.reduce<Strip[]>((result, strip) => {
    if (strip.isEmpty()) {
      return result;
    }

    const prevStrip = result[result.length - 1];
    if (!prevStrip) {
      result.push(strip);
    } else {
      const concatStrips = prevStrip.concat(strip);
      if (Strip.is(concatStrips)) {
        result.splice(-1, 1, concatStrips);
      } else {
        result.push(strip);
      }
    }

    return result;
  }, []);

  return result;
}
