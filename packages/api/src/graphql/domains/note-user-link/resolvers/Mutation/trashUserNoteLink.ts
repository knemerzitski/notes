import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';
import { updateTrashNote } from '../../../../../services/note/update-trash-note';
import {
  NoteCategory,
  ResolversTypes,
  type MutationResolvers,
} from '../../../types.generated';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';

export const trashUserNoteLink: NonNullable<
  MutationResolvers['trashUserNoteLink']
> = async (_parent, arg, ctx) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;

  const currentUserId = auth.session.userId;

  const trashResult = await updateTrashNote({
    mongoDB,
    trashCategoryName: NoteCategory.TRASH,
    noteId: input.noteId,
    userId: currentUserId,
    trashDuration: ctx.options?.note?.trashDuration,
  });

  const payload: ResolversTypes['SignedInUserMutation'] = {
    __typename: 'TrashUserNoteLinkPayload',
    deletedAt: trashResult.expireAt,
    userNoteLink: {
      userId: currentUserId,
      query: mongoDB.loaders.note.createQueryFn({
        userId: currentUserId,
        noteId: input.noteId,
      }),
    },
  };

  if (trashResult.type !== 'already_trashed') {
    await publishSignedInUserMutation(currentUserId, payload, ctx);
  }

  return payload;
};
