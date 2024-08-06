import type { UpdateNotePayloadResolvers } from '../../../graphql/types.generated';

export const UpdateNotePayload: UpdateNotePayloadResolvers = {
  contentId: (parent) => {
    return parent.contentId();
  },
  patch: (parent) => {
    return parent.patch?.();
  },
};
