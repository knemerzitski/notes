import { Changeset, InsertStrip, RemoveStrip, RetainStrip, Strip } from '..';

/**
 * Finds inverse of {@link changeset} B from {@link original} A
 *
 * @returns iB so that A * B * iB = A
 */
export function inverse(changeset: Changeset, original: string | Changeset): Changeset {
  const originalText = Changeset.is(original) ? original.getText() : original;

  const result: Strip[] = [];
  let posB = 0;
  for (const strip of changeset.strips) {
    if (RemoveStrip.is(strip)) {
      // Removed characters become insertions
      result.push(InsertStrip.create(originalText.substring(strip.start, strip.end)));
    } else if (RetainStrip.is(strip)) {
      // Retained characters stay retained but position is relative to B
      result.push(RetainStrip.create(posB, posB + strip.outputLength));
    }

    posB += strip.outputLength;
  }

  return Changeset.create(changeset.outputLength, result);
}
