import type { NoteUpdatedPayloadResolvers } from '../../../graphql/types.generated';

export const NoteUpdatedPayload: NoteUpdatedPayloadResolvers = {
  contentId: (parent) => {
    return parent.contentId();
  },
  patch: (parent) => {
    return parent.patch?.();
  },
};
