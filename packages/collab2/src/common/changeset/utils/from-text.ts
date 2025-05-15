import { Changeset, InsertStrip } from '..';

export function fromText(text: string): Changeset {
  return Changeset.create(0, InsertStrip.create(text));
}
