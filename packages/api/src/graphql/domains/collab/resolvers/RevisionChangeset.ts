import { Changeset } from '../../../../../../collab2/src';
import type { RevisionChangesetResolvers } from '../../types.generated';

export const RevisionChangeset: RevisionChangesetResolvers = {
  changeset: async (parent) => {
    const text = (await parent.query({ text: 1 }))?.text;
    if (!text) {
      return null;
    }
    return Changeset.fromText(text);
  },
  revision: async (parent) => {
    return (await parent.query({ revision: 1 }))?.revision;
  },
};
