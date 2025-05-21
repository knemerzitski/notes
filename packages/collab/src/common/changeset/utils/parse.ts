import { ChangesetStruct } from '..';
import { Changeset } from '../changeset';
import { ChangesetParseError } from '../error';

export function parse(value: string): Changeset {
  try {
    return ChangesetStruct.create(value);
  } catch (err) {
    if (err instanceof ChangesetParseError) {
      throw err;
    } else {
      console.error(value);
      throw new ChangesetParseError('Failed to parse Changeset', {
        cause: err,
      });
    }
  }
}
