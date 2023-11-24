import type { Note, SubscriptionResolvers } from './../../../types.generated';
export const noteCreated: NonNullable<SubscriptionResolvers['noteCreated']> = {
  subscribe: (_parent, _arg, { subscribe }) => {
    return subscribe('NOTE_CREATED');
  },
  resolve(note: Note) {
    return note;
  },
};
