import type { Note, SubscriptionResolvers } from './../../../types.generated';

export const noteUpdated: NonNullable<SubscriptionResolvers['noteUpdated']> = {
  subscribe: (_parent, _arg, { subscribe }) => {
    return subscribe('NOTE_UPDATED');
  },
  resolve(note: Note) {
    return note;
  },
};
