import { Changeset, InsertStrip } from '..';

export function fromText(text: string, inputLength = 0): Changeset {
  return Changeset.create(inputLength, InsertStrip.create(text));
}
