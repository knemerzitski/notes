import { throwNoteNotFound } from '../../../../__EXCLUDE/errors';
import {
  deleteNoteCompletely,
  deleteNoteFromUser,
  findNoteUser,
  findOldestNoteUser,
  getNoteUsersIds,
  UserNoteLink_id,
} from '../../../../../services/note/note';
import { assertAuthenticated } from '../../../base/directives/auth';
import {
  NoteCategory,
  ResolversTypes,
  type MutationResolvers,
} from '../../../types.generated';
import { isDefined } from '~utils/type-guards/is-defined';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';
import { GraphQLError } from 'graphql';
import { GraphQLErrorCode, ResourceType } from '~api-app-shared/graphql/error-codes';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { ObjectId } from 'mongodb';

export const deleteNote: NonNullable<MutationResolvers['deleteNote']> = async (
  _parent,
  arg,
  ctx
) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;

  const currentUserId = auth.session.userId; // scopeUserId

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
  const oldestUserId = findOldestNoteUser(note)?._id;
  const allNoteUserIds = getNoteUsersIds(note) ?? [];
  if (!noteId || !noteUser || !oldestUserId) {
    throwNoteNotFound(input.noteId);
  }

  let targetUserId: ObjectId;
  if (input.userId && !input.userId.equals(currentUserId)) {
    // Unlink other user note
    targetUserId = input.userId;
    const scopeUserId = currentUserId;
    const scopeNoteUser = noteUser;

    // check permission func
    const targetNoteUser = findNoteUser(targetUserId, note);
    if (!targetNoteUser) {
      throw new GraphQLError(`Note user '${objectIdToStr(targetUserId)}' not found`, {
        extensions: {
          code: GraphQLErrorCode.NOT_FOUND,
          resource: ResourceType.USER,
        },
      });
    }

    if (!scopeNoteUser.createdAt || !targetNoteUser.createdAt) {
      // TODO replace with custom error???
      throw new ErrorWithData('Expected createdAt to be defined', {
        data: {
          scopeNoteUser,
          targetNoteUser,
        },
      });
    }

    const isScopeUserOldest = scopeUserId.equals(oldestUserId);
    const isScopeUserOlderThanTargetUser =
      scopeNoteUser.createdAt < targetNoteUser.createdAt;
    if (!isScopeUserOldest && !isScopeUserOlderThanTargetUser) {
      throw new GraphQLError('Not authorized to delete note for user', {
        extensions: {
          code: GraphQLErrorCode.UNAUTHORIZED,
        },
      });
    }
    //

    await deleteNoteFromUser({
      mongoDB,
      noteId,
      userId: targetUserId,
      noteCategoryName: targetNoteUser.categoryName ?? NoteCategory.DEFAULT,
    });
  } else {
    // Delete note completely or unlink own note
    targetUserId = currentUserId;
    const isCurrentUserOldest = currentUserId.equals(oldestUserId);
    if (isCurrentUserOldest) {
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

      await Promise.all(
        allNoteUserIds.map((userId) =>
          publishSignedInUserMutation(
            userId,
            createDeleteNoteCompletelyPayload(noteId, userId),
            ctx
          )
        )
      );

      return createDeleteNoteCompletelyPayload(noteId, currentUserId);
    } else {
      await deleteNoteFromUser({
        mongoDB,
        noteId,
        userId: currentUserId,
        noteCategoryName: noteUser.categoryName ?? NoteCategory.DEFAULT,
      });
    }
  }

  // Publish to everyone involved
  const publishUsers = getNoteUsersIds(note) ?? [];
  await Promise.all(
    publishUsers.map((userId) =>
      publishSignedInUserMutation(
        userId,
        {
          __typename: 'DeleteNotePayload',
          noteId,
          userNoteLinkId: UserNoteLink_id(noteId, userId), // must be null if not deleted?
          publicUserNoteLinkId: UserNoteLink_id(noteId, userId), // depends..
        } satisfies ResolversTypes['SignedInUserMutations'],
        ctx
      )
    )
  );

  /*
  foreach USER
  - delete note completely
    userNoteLinkId: UserNoteLink_id(noteId, USER)

  - unlink: USER === targetUserId (affected user)
    userNoteLinkId: UserNoteLink_id(noteId, USER)
  - unlink: USER !== targetUserId (other user)
    publicUserNoteLinkId: UserNoteLink_id(noteId, USER)

  const payload: ResolversTypes['SignedInUserMutations'] = {
    __typename: 'DeleteNotePayload',
    noteId,
    userNoteLinkId: UserNoteLink_id(noteId, currentUserId),
    publicUserNoteLinkId: UserNoteLink_id(noteId, currentUserId), // self if deleted own
  };
  */

  return payload;
};

/**
 * Note is delted for user
 */
function createDeleteNoteCompletelyPayload(
  noteId: ObjectId,
  userId: ObjectId
): ResolversTypes['SignedInUserMutations'] {
  return {
    __typename: 'DeleteNotePayload',
    noteId,
    userNoteLinkId: UserNoteLink_id(noteId, userId),
    publicUserNoteLinkId: UserNoteLink_id(noteId, userId),
  };
}

/**
 * Only other user note is deleted
 */
function createUnlinkOtherUserNoteNotePayload(
  noteId: ObjectId,
  userId: ObjectId
): ResolversTypes['SignedInUserMutations'] {
  return {
    __typename: 'DeleteNotePayload',
    publicUserNoteLinkId: UserNoteLink_id(noteId, userId),
  };
}
