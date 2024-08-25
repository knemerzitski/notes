import { ObjectId } from 'mongodb';
import { throwNoteNotFound } from '../../../../services/graphql/errors';
import {
  deleteNoteCompletely,
  deleteNoteFromUser,
  findNoteUser,
  findOldestNoteUser,
  UserNoteLink_id,
} from '../../../../services/note/note';
import { assertAuthenticated } from '../../../base/directives/auth';
import {
  NoteCategory,
  NoteDeletionType,
  ResolversTypes,
  type MutationResolvers,
} from './../../../types.generated';
import { isDefined } from '~utils/type-guards/is-defined';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';

export const deleteNote: NonNullable<MutationResolvers['deleteNote']> = async (
  _parent,
  arg,
  ctx
) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;

  const currentUserId = auth.session.userId;

  // Fetch all required to safely delete/unlink the note
  const note = await mongoDB.loaders.note.load({
    id: {
      userId: currentUserId,
      noteId: input.noteId,
    },
    query: {
      _id: 1,
      users: {
        _id: 1,
        createdAt: 1,
        categoryName: 1,
      },
    },
  });

  const noteUsers = note?.users ?? [];
  const noteUser = findNoteUser(currentUserId, note);
  const noteId = note?._id;
  if (!noteId || !noteUser) {
    throwNoteNotFound(input.noteId);
  }

  const oldestNoteUser = findOldestNoteUser(note);

  const isCurrentUserOldest = currentUserId.equals(oldestNoteUser?._id);
  let deletionType: NoteDeletionType;
  let publishUsers: ObjectId[] = [];
  if (isCurrentUserOldest) {
    deletionType = NoteDeletionType.DELETE;
    publishUsers = noteUsers.map((noteUser) => noteUser._id).filter(isDefined);
    await deleteNoteCompletely({
      mongoDB,
      noteId,
      allNoteUsers: noteUsers
        .map((noteUser) => {
          const userId = noteUser._id;
          if (!userId) return;

          return {
            _id: userId,
            categoryName: noteUser.categoryName ?? NoteCategory.DEFAULT,
          };
        })
        .filter(isDefined),
    });
  } else {
    deletionType = NoteDeletionType.UNLINK;
    publishUsers = [currentUserId];
    await deleteNoteFromUser({
      mongoDB,
      noteId,
      userId: currentUserId,
      noteCategoryName: noteUser.categoryName ?? NoteCategory.DEFAULT,
    });
  }

  const payload: ResolversTypes['SignedInUserMutations'] = {
    __typename: 'DeleteNotePayload',
    noteId,
    deletionType,
    userNoteLinkId: UserNoteLink_id(noteId, currentUserId),
  };

  // Publish to everyone involved
  await Promise.all(
    publishUsers.map((userId) =>
      publishSignedInUserMutation(
        userId,
        {
          __typename: 'DeleteNotePayload',
          noteId,
          deletionType,
          userNoteLinkId: UserNoteLink_id(noteId, userId),
        } satisfies ResolversTypes['SignedInUserMutations'],
        ctx
      )
    )
  );

  return payload;
};
