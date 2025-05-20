import { Changeset, RetainStrip } from '..';

export function identity(length: number) {
  if (length === 0) {
    return Changeset.EMPTY;
  }

  return Changeset.create(length, RetainStrip.create(0, length));
}
