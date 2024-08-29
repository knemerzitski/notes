import { Changeset } from '~collab/changeset/changeset';

import type { RevisionChangesetResolvers } from '../../types.generated';

export const RevisionChangeset: RevisionChangesetResolvers = {
  changeset: async (parent) => {
    const serializedChangeset = (await parent.query({ changeset: 1 }))?.changeset;

    if (serializedChangeset == null) {
      return null;
    }

    return Changeset.parseValue(serializedChangeset);
  },
  revision: async (parent) => {
    return (await parent.query({ revision: 1 }))?.revision;
  },
};
