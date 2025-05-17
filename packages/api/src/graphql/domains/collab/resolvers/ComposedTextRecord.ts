import type { ComposedTextRecordResolvers } from './../../types.generated';

export const ComposedTextRecord: ComposedTextRecordResolvers = {
  text: async (parent) => {
    return (await parent.query({ changeset: 1 }))?.changeset.getText();
  },
  revision: async (parent) => {
    return (await parent.query({ revision: 1 }))?.revision;
  },
};
