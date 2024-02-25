import { Changeset, SerializedChangeset } from './changeset';
import { Serializable } from './serialize.types';
import { Strip } from './strip';
import { Strips } from './strips';

export interface SerializedRevisionChangeset {
  revision: number;
  changeset: SerializedChangeset;
}

/**
 * Changeset with revision number.
 */
export class RevisionChangeset implements Serializable<SerializedRevisionChangeset> {
  readonly revision: number;
  readonly changeset: Changeset;

  constructor(revision: number, changeset: Changeset | Strips | Readonly<Strip[]>) {
    this.revision = revision;

    if (changeset instanceof Changeset) {
      this.changeset = changeset;
    } else {
      this.changeset = new Changeset(changeset);
    }
  }

  serialize(): SerializedRevisionChangeset {
    return {
      revision: this.revision,
      changeset: this.changeset.serialize(),
    };
  }

  static parseValue(value: unknown) {
    if (!value || typeof value !== 'object') {
      throw new Error(
        `'${String(
          value
        )}' cannot be deserialized as RevisionChangeset. Value is not an object.`
      );
    }

    if (!('revision' in value)) {
      throw new Error(
        `'${String(
          value
        )}' cannot be deserialized as RevisionChangeset. Property 'revision' is missing.`
      );
    }

    if (typeof value.revision !== 'number') {
      throw new Error(
        `'${String(
          value
        )}' cannot be deserialized as RevisionChangeset. Property 'revision' must be a number.`
      );
    }

    if (!('changeset' in value)) {
      throw new Error(
        `'${String(
          value
        )}' cannot be deserialized as RevisionChangeset. Property 'changeset' is missing.`
      );
    }

    return new RevisionChangeset(value.revision, Strips.parseValue(value.changeset));
  }
}
