import { Changeset } from '../changeset';
import { RevisionChangeset } from '../records/record';

export type OrRevisionChangeset = Changeset | RevisionChangeset;

export function getOrRevision(value: OrRevisionChangeset): number | null {
  return value instanceof Changeset ? null : value.revision;
}

export function getOrChangeset(value: OrRevisionChangeset): Changeset {
  return value instanceof Changeset ? value : value.changeset;
}
