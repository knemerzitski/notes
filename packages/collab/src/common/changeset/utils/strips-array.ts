import { Changeset, Strip } from '..';

export function stripsArray(value: Changeset | readonly Strip[] | Strip) {
  if (Changeset.is(value)) {
    return value.strips;
  }

  if (Strip.is(value)) {
    return [value];
  }

  return value;
}
