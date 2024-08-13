import { ObjectId } from 'mongodb';

import { getNotesArrayPath } from '../../../../mongodb/schema/user/user';
import { assertAuthenticated } from '../../../base/directives/auth';
import { NoteQueryMapper } from '../../mongo-query-mapper/note';
import { throwNoteNotFound } from '../../utils/note-errors';
import { findNoteUser } from '../../utils/user-note';

import { publishNoteUpdated } from '../Subscription/noteEvents';

import { NoteCategory, type MutationResolvers } from './../../../types.generated';



export const trashNote: NonNullable<MutationResolvers['trashNote']> = async (
  _parent,
  { input: { noteId } },
  ctx
) => {
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
        $query: {
          _id: 1,
          categoryName: 1,
          trashed: {
            expireAt: 1,
          },
        },
      },
    },
  });

  const noteUser = findNoteUser(currentUserId, note);
  if (!note?._id || !noteUser) {
    throwNoteNotFound(noteId);
  }

  function createNoteMapperForUser(userId: ObjectId) {
    return new NoteQueryMapper(userId, {
      query: (query) =>
        mongodb.loaders.note.load({
          id: {
            userId,
            noteId,
          },
          query,
        }),
    });
  }

  const existingExpireAt = noteUser.trashed?.expireAt;
  if (existingExpireAt != null) {
    // Return early since note is already trashed
    return {
      deletedAt: existingExpireAt,
      note: createNoteMapperForUser(currentUserId),
    };
  }

  const existingCategoryName = noteUser.categoryName ?? NoteCategory.DEFAULT;

  const newExpireAt = new Date(
    Date.now() + (ctx.options?.note?.trashDuration ?? 1000 * 60 * 60 * 24 * 30)
  );

  const currentNoteUserFilterName = 'currentNoteUser';

  await mongodb.client.withSession((session) =>
    session.withTransaction(async (session) => {
      await mongodb.collections.notes.updateOne(
        {
          _id: note._id,
        },
        {
          $set: {
            [`users.$[${currentNoteUserFilterName}].trashed`]: {
              expireAt: newExpireAt,
              originalCategoryName: existingCategoryName,
            },
            [`users.$[${currentNoteUserFilterName}].categoryName`]: NoteCategory.TRASH,
          },
        },
        {
          arrayFilters: [
            {
              [`${currentNoteUserFilterName}._id`]: currentUserId,
            },
          ],
          session,
        }
      );
      await mongodb.collections.users.updateOne(
        {
          _id: currentUserId,
        },
        {
          $pull: {
            [getNotesArrayPath(existingCategoryName)]: note._id,
          },
          $push: {
            [getNotesArrayPath(NoteCategory.TRASH)]: note._id,
          },
        },
        { session }
      );
    })
  );

  mongodb.loaders.note.prime(
    {
      id: {
        userId: currentUserId,
        noteId,
      },
      query: {
        users: {
          $query: {
            trashed: {
              expireAt: 1,
              originalCategoryName: 1,
            },
          },
        },
      },
    },
    {
      users: note.users?.map((noteUser) => {
        const userId = noteUser._id;
        if (!userId || !currentUserId.equals(userId)) {
          return noteUser;
        }

        return {
          ...noteUser,
          categoryName: NoteCategory.TRASH,
          trashed: {
            ...noteUser.trashed,
            expireAt: newExpireAt,
            originalCategoryName: existingCategoryName,
          },
        };
      }),
    },
    { clearCache: true }
  );

  const noteMapper = createNoteMapperForUser(currentUserId);

  // Subscription
  await publishNoteUpdated(
    currentUserId,
    {
      note: {
        id: () => noteMapper.id(),
        categoryName: () => NoteCategory.TRASH,
        deletedAt: () => newExpireAt,
      },
    },
    ctx
  );

  // Resposne
  return {
    deletedAt: newExpireAt,
    note: noteMapper,
  };
};
