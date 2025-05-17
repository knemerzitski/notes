import type { ComposedTextRecordResolvers } from './../../types.generated';

export const ComposedTextRecord: ComposedTextRecordResolvers = {
  text: async (parent) => {
    return (await parent.query({ text: 1 }))?.text;
  },
  revision: async (parent) => {
    return (await parent.query({ revision: 1 }))?.revision;
  },
};
