import { GraphQLError } from 'graphql';
import { GraphQLErrorCode, ResourceType } from '~api-app-shared/graphql/error-codes';
import { assertAuthenticated } from '../../../base/directives/auth';
import { objectIdToStr } from '../../../base/resolvers/ObjectID';
import { throwNoteNotFound } from '../../utils/note-errors';
import { findNoteUser, findOldestNoteUser } from '../../utils/user-note';
import type { MutationResolvers } from './../../../types.generated';
import { ErrorWithData } from '~utils/logger';
import { isDefined } from '~utils/type-guards/is-defined';
import { publishNoteUpdated } from '../Subscription/noteEvents';
import { ObjectId } from 'mongodb';
import { NoteMapper, NoteUserMapper } from '../../schema.mappers';
import { Note_id } from '../Note';

export const updateNoteSetUserReadOnly: NonNullable<
  MutationResolvers['updateNoteSetUserReadOnly']
> = async (_parent, { input: { noteId, userId: modifyUserId, readOnly } }, ctx) => {
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  const note = await mongodb.loaders.note.load({
    id: {
      userId: currentUserId,
      noteId,
    },
    query: {
      _id: 1,
      users: {
        _id: 1,
        createdAt: 1,
        readOnly: 1,
      },
    },
  });

  const noteUsers = note?.users ?? [];
  const currentNoteUser = findNoteUser(currentUserId, note);
  const oldestUserId = findOldestNoteUser(note)?._id;
  if (!note?._id || !currentNoteUser?._id || !oldestUserId) {
    throwNoteNotFound(noteId);
  }

  const modifyNoteUser = findNoteUser(modifyUserId, note);
  if (!modifyNoteUser?._id) {
    throw new GraphQLError(`Note user '${objectIdToStr(modifyUserId)}' not found`, {
      extensions: {
        code: GraphQLErrorCode.NOT_FOUND,
        resource: ResourceType.USER,
      },
    });
  }

  function createNoteMapperForUser(userId: ObjectId): NoteMapper {
    return {
      userId,
      query: (query) =>
        mongodb.loaders.note.load({
          id: {
            userId,
            noteId,
          },
          query,
        }),
    };
  }

  const currentUserNoteMapper = createNoteMapperForUser(currentUserId);

  if (modifyNoteUser.readOnly === readOnly) {
    // Return early, value is already correct
    return {
      readOnly,
      note: currentUserNoteMapper,
    };
  }

  if (!currentNoteUser.createdAt || !modifyNoteUser.createdAt) {
    throw new ErrorWithData(`Expected createdAt to be defined`, {
      currentNoteUser,
      modifyNoteUser,
    });
  }

  const isCurrentUserOldest = currentUserId.equals(oldestUserId);
  const isCurrentUserOlder = currentNoteUser.createdAt < modifyNoteUser.createdAt;
  if (!isCurrentUserOldest && !isCurrentUserOlder) {
    throw new GraphQLError('Not allowed to modify user read-only property', {
      extensions: {
        code: GraphQLErrorCode.UNAUTHORIZED,
      },
    });
  }

  const modifyNoteUserFilterName = 'modifyNoteUser';

  // Commit changes to db
  await mongodb.collections.notes.updateOne(
    {
      _id: noteId,
    },
    {
      $set: {
        [`users.$[${modifyNoteUserFilterName}].readOnly`]: readOnly,
      },
    },
    {
      arrayFilters: [
        {
          [`${modifyNoteUserFilterName}._id`]: modifyUserId,
        },
      ],
    }
  );

  // Update loader
  mongodb.loaders.note.prime(
    {
      id: {
        userId: currentUserId,
        noteId,
      },
      query: {
        users: {
          readOnly: 1,
        },
      },
    },
    {
      users: noteUsers.map((noteUser) => {
        const isOtherUser = !modifyUserId.equals(noteUser._id);
        if (isOtherUser) {
          return noteUser;
        }
        return {
          ...noteUser,
          readOnly,
        };
      }),
    },
    { clearCache: true }
  );

  // Subscription
  const modifiedNoteMapper = createNoteMapperForUser(modifyUserId);
  const publishToUsers = noteUsers.map((noteUser) => noteUser._id).filter(isDefined);
  await Promise.all([
    publishNoteUpdated(
      modifyUserId,
      {
        note: {
          id: () => Note_id(modifiedNoteMapper),
          readOnly: () => readOnly,
          users: () => [
            {
              user: {
                id: objectIdToStr(modifyUserId) ?? 'ddd',
              },
              readOnly,
            },
          ],
          // users changed... must let everyone know, and modified user that they are now diff
        },
      },
      ctx
    ),
    ...publishToUsers.map((userId) => {
      const noteMapper = createNoteMapperForUser(userId);

      return publishNoteUpdated(
        userId,
        {
          note: {
            id: () => Note_id(noteMapper),
            // users changed... must let everyone know, and modified user that they are now diff
          },
        },
        ctx
      );
    }),
  ]);

  const queryAllUsers: NoteUserMapper['queryAllUsers'] = async (query) =>
    (
      await mongodb.loaders.note.load({
        id: {
          userId: currentUserId,
          noteId,
        },
        query: {
          users: query,
        },
      })
    )?.users;

  // Response
  return {
    readOnly,
    user: {
      currentUserId,
      queryAllUsers,
      queryUser: async (query) =>
        (await queryAllUsers(query))?.find((user) => modifyUserId.equals(user._id)),
    },

    note: currentUserNoteMapper,
  };
};
