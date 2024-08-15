import type { NoteUserResolvers } from './../../types.generated';

export const NoteUser: NoteUserResolvers = {
  readOnly: (parent) => {
    return parent.readOnly();
  },
  user: (parent) => {
    return parent.user();
  },
  higherScope: (parent) => {
    return parent.higherScope();
  },
};
