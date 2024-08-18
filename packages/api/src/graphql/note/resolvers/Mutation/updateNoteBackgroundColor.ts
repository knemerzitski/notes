import { assertAuthenticated } from '../../../base/directives/auth';
import { NoteMapper } from '../../schema.mappers';
import { throwNoteNotFound } from '../../utils/note-errors';
import { findNoteUser } from '../../utils/user-note';
import { Note_id } from '../Note';

import { publishNoteUpdated } from '../Subscription/noteEvents';

import type { MutationResolvers } from './../../../types.generated';

export const updateNoteBackgroundColor: NonNullable<
  MutationResolvers['updateNoteBackgroundColor']
> = async (_parent, { input: { noteId, backgroundColor } }, ctx) => {
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
        preferences: {
          backgroundColor: 1,
        },
      },
    },
  });

  const noteUser = findNoteUser(currentUserId, note);
  if (!note?._id || !noteUser) {
    throwNoteNotFound(noteId);
  }

  const noteMapper: NoteMapper = {
    userId: currentUserId,
    query: (query) =>
      mongodb.loaders.note.load({
        id: {
          userId: currentUserId,
          noteId,
        },
        query,
      }),
  };

  if (noteUser.preferences?.backgroundColor === backgroundColor) {
    // Return early, backgroundColor is already correct
    return {
      backgroundColor,
      note: noteMapper,
    };
  }

  const currentNoteUserFilterName = 'currentNoteUser';

  // Commit changes to db
  await mongodb.collections.notes.updateOne(
    {
      _id: noteId,
    },
    {
      $set: {
        [`users.$[${currentNoteUserFilterName}].preferences.backgroundColor`]:
          backgroundColor,
      },
    },
    {
      arrayFilters: [
        {
          [`${currentNoteUserFilterName}._id`]: currentUserId,
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
          preferences: {
            backgroundColor: 1,
          },
        },
      },
    },
    {
      users: note.users?.map((noteUser) => {
        const isOtherUser = !currentUserId.equals(noteUser._id);
        if (isOtherUser) {
          return noteUser;
        }
        return {
          ...noteUser,
          preferences: {
            ...noteUser.preferences,
            backgroundColor,
          },
        };
      }),
    },
    { clearCache: true }
  );

  // Subscription, only to current user
  await publishNoteUpdated(
    currentUserId,
    {
      note: {
        id: () => Note_id(noteMapper),
        preferences: {
          backgroundColor,
        },
      },
    },
    ctx
  );

  // Response
  return {
    backgroundColor,
    note: noteMapper,
  };
};
