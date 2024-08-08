import { GraphQLError } from 'graphql';

import { ObjectId } from 'mongodb';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { isDefined } from '~utils/type-guards/is-defined';

import { MongoQuery } from '../../../../mongodb/query/query';
import { QueryableNote } from '../../../../mongodb/schema/note/query/queryable-note';
import { getNotesArrayPath } from '../../../../mongodb/schema/user/user';
import { assertAuthenticated } from '../../../base/directives/auth';
import {
  NoteCategory,
  type MutationResolvers,
  type ResolversTypes,
} from '../../../types.generated';
import { NoteQueryMapper } from '../../mongo-query-mapper/note';
import { findUserNote } from '../../utils/find-user-note';
import { publishNoteDeleted } from '../Subscription/noteDeleted';

export const deleteNote: NonNullable<MutationResolvers['deleteNote']> = async (
  _parent,
  { input: { contentId: notePublicId } },
  ctx
) => {
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  const note = await mongodb.loaders.note.load({
    id: {
      userId: currentUserId,
      publicId: notePublicId,
    },
    query: {
      _id: 1,
      publicId: 1,
      userNotes: {
        $query: {
          userId: 1,
          isOwner: 1,
          categoryName: 1,
        },
      },
    },
  });

  const noteId = note?._id;
  const userNotes = note?.userNotes ?? [];
  const userNote = findUserNote(currentUserId, note);
  const otherUserIds: ObjectId[] =
    note?.userNotes
      ?.map((userNote) => userNote.userId)
      .filter(isDefined)
      .filter((userId) => !userId.equals(currentUserId)) ?? [];

  if (!noteId || !userNote) {
    throw new GraphQLError(`Note '${notePublicId}' not found`, {
      extensions: {
        code: GraphQLErrorCode.NOT_FOUND,
      },
    });
  }

  const deleteNoteCompletely = userNote.isOwner ?? false;
  if (deleteNoteCompletely) {
    await mongodb.client.withSession((session) =>
      session.withTransaction(async (session) => {
        await mongodb.collections.notes.deleteOne(
          {
            _id: noteId,
          },
          { session }
        );
        await mongodb.collections.users.bulkWrite(
          userNotes.map((userNote) => ({
            updateOne: {
              filter: {
                _id: userNote.userId,
              },
              update: {
                $pull: {
                  [getNotesArrayPath(userNote.categoryName ?? NoteCategory.DEFAULT)]:
                    note._id,
                },
              },
            },
          })),
          { session }
        );
      })
    );
  } else {
    const userNote = userNotes.find((userNote) => userNote.userId?.equals(currentUserId));
    if (!userNote) {
      throw new GraphQLError(`Note '${notePublicId}' not found`, {
        extensions: {
          code: GraphQLErrorCode.NOT_FOUND,
        },
      });
    }

    // Unlink note for current user
    await mongodb.client.withSession((session) =>
      session.withTransaction(async (session) => {
        await mongodb.collections.notes.updateOne(
          {
            _id: note._id,
          },
          {
            $pull: {
              userNotes: {
                userId: currentUserId,
              },
            },
          },
          {
            session,
          }
        );
        await mongodb.collections.users.updateOne(
          {
            _id: currentUserId,
          },
          {
            $pull: {
              [getNotesArrayPath(userNote.categoryName ?? NoteCategory.DEFAULT)]:
                note._id,
            },
          },
          { session }
        );
      })
    );
  }

  const noteQuery: MongoQuery<QueryableNote> = {
    query() {
      return note;
    },
  };

  // TODO payload should have field "note: Note", instead of root?, inside note is DeletedNote with fields id and content only

  const currentUserPayload: ResolversTypes['DeleteNotePayload'] &
    ResolversTypes['NoteDeletedPayload'] = new NoteQueryMapper(currentUserId, noteQuery);

  // Subscription
  await Promise.all([
    await publishNoteDeleted(currentUserId, currentUserPayload, ctx),
    deleteNoteCompletely &&
      otherUserIds.map((otherUserId) =>
        publishNoteDeleted(otherUserId, new NoteQueryMapper(otherUserId, noteQuery), ctx)
      ),
  ]);

  // Response
  return currentUserPayload;
};
