import { QueryableRevisionRecord } from '../../../../../mongodb/loaders/note/descriptions/revision-record';
import { createValueQueryFn } from '../../../../../mongodb/query/query';
import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';
import { insertCollabRecord } from '../../../../../services/note/insert-collab-record';
import { getNoteUsersIds } from '../../../../../services/note/note';
import {
  CollabText_id_fromNoteQueryFn,
  mapNoteToCollabTextQueryFn,
} from '../../../../../services/note/note-collab';
import type { MutationResolvers, ResolversTypes } from '../../../types.generated';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';

export const updateNoteInsertRecord: NonNullable<
  MutationResolvers['updateNoteInsertRecord']
> = async (_parent, arg, ctx) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;
  const { insertRecord } = input;

  const currentUserId = auth.session.userId;

  const insertionResult = await insertCollabRecord({
    mongoDB,
    noteId: input.noteId,
    userId: currentUserId,
    maxRecordsCount: ctx.options?.collabText?.maxRecordsCount,
    insertRecord: {
      changeset: insertRecord.change.changeset,
      revision: insertRecord.change.revision,
      afterSelection: {
        start: insertRecord.afterSelection.start,
        end: insertRecord.afterSelection.end ?? undefined,
      },
      beforeSelection: {
        start: insertRecord.beforeSelection.start,
        end: insertRecord.beforeSelection.end ?? undefined,
      },
      userGeneratedId: insertRecord.generatedId,
    },
  });

  const noteQuery = mongoDB.loaders.note.createQueryFn({
    userId: currentUserId,
    noteId: input.noteId,
  });
  const collabTextIdQuery = CollabText_id_fromNoteQueryFn(noteQuery);

  const payload: ResolversTypes['SignedInUserMutations'] = {
    __typename: 'UpdateNoteInsertRecordPayload',
    isDuplicateRecord: insertionResult.type === 'duplicate',
    newRecord: {
      parentId: collabTextIdQuery,
      query: createValueQueryFn<QueryableRevisionRecord>(() => insertionResult.record),
    },
    collabText: {
      id: collabTextIdQuery,
      query: mapNoteToCollabTextQueryFn(noteQuery),
    },
    note: {
      query: noteQuery,
    },
  };

  if (insertionResult.type === 'new') {
    const publishUsers = getNoteUsersIds(insertionResult.note);
    await Promise.all(
      publishUsers.map((userId) => publishSignedInUserMutation(userId, payload, ctx))
    );
  }

  return payload;
};
