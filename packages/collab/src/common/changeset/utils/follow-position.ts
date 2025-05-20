import { Changeset, InsertStrip, RangeStrip } from '..';

/**
 * @param left On insertion stick to left side or right side on false
 * @returns New position when changeset has already been applied
 */
export function followPosition(pos: number, changeset: Changeset, left: boolean): number {
  if (pos < 0) {
    return -1;
  }

  let changesetPos = 0;
  for (let i = 0; i < changeset.strips.length; i++) {
    const strip = changeset.strips[i];
    if (!strip) {
      continue;
    }
    if (RangeStrip.is(strip)) {
      if (strip.start <= pos && pos <= strip.end) {
        const offset = Math.min(pos - strip.start, strip.outputLength);

        let insertStickyOffset = 0;
        if (offset === 0) {
          // pos is adjacent to prevStrip
          // _ | 5-6
          const prevStrip = changeset.strips[i - 1];
          if (InsertStrip.is(prevStrip)) {
            // pos is adjacent to insertion on left
            // "insert" | 5-6

            const bias = InsertStrip.getStickyPolicy(prevStrip) ?? left;
            insertStickyOffset = bias ? -prevStrip.outputLength : 0;
          }
        } else if (offset === strip.outputLength) {
          // pos is adjacent to nextStrip
          // 5-6 | _
          const nextStrip = changeset.strips[i + 1];
          if (InsertStrip.is(nextStrip)) {
            // pos is adjacent to insertion on right
            // 5-6 | "insert"

            const bias = InsertStrip.getStickyPolicy(nextStrip) ?? left;
            insertStickyOffset = bias ? 0 : nextStrip.outputLength;
          }
        }

        return changesetPos + offset + insertStickyOffset;
      }
    }

    changesetPos += strip.outputLength;
  }

  const firstStrip = changeset.strips[0];
  if (InsertStrip.is(firstStrip)) {
    return left ? 0 : firstStrip.outputLength;
  }

  return -1;
}
