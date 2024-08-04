import type { DeleteNotePayloadResolvers } from '../../../graphql/types.generated';

export const DeleteNotePayload: DeleteNotePayloadResolvers = {
  contentId: (note) => {
    return note.contentId();
  },
  id: (note) => {
    return note.id();
  },
};
