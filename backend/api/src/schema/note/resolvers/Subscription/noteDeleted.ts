import type { SubscriptionResolvers } from './../../../types.generated';

export const noteDeleted: NonNullable<SubscriptionResolvers['noteDeleted']> = {
  subscribe: (_parent, _arg, { subscribe }) => {
    return subscribe('NOTE_DELETED');
  },
  resolve(id: string) {
    return id;
  },
};
