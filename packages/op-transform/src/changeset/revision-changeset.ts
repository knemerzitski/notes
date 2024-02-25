import { Changeset } from './changeset';
import { Strip } from './strip';
import { Strips } from './strips';

/**
 * Changeset with revision number.
 */
export class RevisionChangeset extends Changeset {
  readonly revision: number;

  constructor(
    revision: number,
    changeset: Changeset | Readonly<Strips> | readonly Strip[]
  ) {
    super(changeset);
    this.revision = revision;
  }

  asChangeset() {
    return new Changeset(this.strips);
  }
}
