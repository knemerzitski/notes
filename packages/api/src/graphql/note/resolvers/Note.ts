import type { NoteResolvers } from '../../../graphql/types.generated';
import { assertAuthenticated } from '../../base/directives/auth';

export const Note: NoteResolvers = {
  id: (parent) => {
    return parent.id();
  },
  preferences: (parent) => {
    return parent.preferences();
  },
  readOnly: (parent) => {
    return parent.readOnly();
  },
  textFields: (parent, args) => {
    return parent.textFields(args);
  },
  contentId: (parent) => {
    return parent.contentId();
  },
  isOwner: async (parent, _args, ctx) => {
    const { auth } = ctx;
    assertAuthenticated(auth);

    const owner = await parent.ownerId();
    if (!owner) return false;

    return owner.equals(auth.session.user._id);
  },
};
