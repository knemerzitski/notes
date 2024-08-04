import type { NoteDeletedPayloadResolvers } from '../../../graphql/types.generated';

export const NoteDeletedPayload: NoteDeletedPayloadResolvers = {
  contentId: (note) => {
    return note.contentId();
  },
  id: (note) => {
    return note.id();
  },
};
