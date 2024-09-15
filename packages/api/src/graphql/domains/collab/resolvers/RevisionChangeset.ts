import type { RevisionChangesetResolvers } from '../../types.generated';

export const RevisionChangeset: RevisionChangesetResolvers = {
  changeset: async (parent) => {
    return (await parent.query({ changeset: 1 }))?.changeset;
  },
  revision: async (parent) => {
    return (await parent.query({ revision: 1 }))?.revision;
  },
};
