import type { RevisionChangesetResolvers } from './../../types.generated';

export const RevisionChangeset: RevisionChangesetResolvers = {
  changeset: async (parent) => {
    return parent.changeset();
  },
  revision: (parent) => {
    return parent.revision();
  },
};
