import { throwNoteNotFound } from '../../../../services/graphql/errors';
import { updateTrashNote } from '../../../../services/note/note';
import { assertAuthenticated } from '../../../domains/base/directives/auth';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';
import {
  NoteCategory,
  ResolversTypes,
  type MutationResolvers,
} from '../../../domains/types.generated';

export const trashUserNoteLink: NonNullable<
  MutationResolvers['trashUserNoteLink']
> = async (_parent, arg, ctx) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;

  const currentUserId = auth.session.userId;

  const trashResult = await updateTrashNote({
    mongoDB,
    defaultCategoryName: NoteCategory.DEFAULT,
    trashCategoryName: NoteCategory.TRASH,
    noteId: input.noteId,
    userId: currentUserId,
    trashDuration: ctx.options?.note?.trashDuration,
  });

  if (trashResult === 'not_found') {
    throwNoteNotFound(input.noteId);
  }

  const payload: ResolversTypes['SignedInUserMutations'] = {
    __typename: 'TrashUserNoteLinkPayload',
    deletedAt: trashResult.expireAt,
    userNoteLink: {
      userId: currentUserId,
      query: (query) =>
        mongoDB.loaders.note.load({
          id: {
            noteId: input.noteId,
            userId: currentUserId,
          },
          query,
        }),
    },
  };

  if (!trashResult.alreadyTrashed) {
    await publishSignedInUserMutation(currentUserId, payload, ctx);
  }

  return payload;
};
