import { getNoteUsersIds } from '../../../../../services/note/note';
import { updateReadOnly } from '../../../../../services/note/update-read-only';
import type { MutationResolvers, ResolversTypes } from '../../../types.generated';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';

export const updateUserNoteLinkReadOnly: NonNullable<
  MutationResolvers['updateUserNoteLinkReadOnly']
> = async (_parent, arg, ctx) => {
  const { mongoDB } = ctx;
  const { input } = arg;

  const currentUserId = input.authUser.id;
  const noteId = input.note.id;

  const targetUserId = input.userId ?? currentUserId;

  const { type: readOnlyResultType, note } = await updateReadOnly({
    mongoDB,
    noteId,
    scopeUserId: currentUserId,
    targetUserId,
    readOnly: input.readOnly,
  });

  const noteQuery = mongoDB.loaders.note.createQueryFn({
    userId: currentUserId,
    noteId,
  });

  const payload: ResolversTypes['SignedInUserMutation'] = {
    __typename: 'UpdateUserNoteLinkReadOnlyPayload',
    readOnly: input.readOnly,
    userNoteLink: {
      userId: targetUserId,
      query: noteQuery,
    },
    note: {
      query: noteQuery,
    },
  };

  if (readOnlyResultType !== 'already_read_only') {
    const publishUserIds = getNoteUsersIds(note);
    await Promise.all(
      publishUserIds.map((userId) => publishSignedInUserMutation(userId, payload, ctx))
    );
  }

  return payload;
};
