import { QueryableCollabRecord } from '../../../../../mongodb/loaders/note/descriptions/collab-record';
import { createValueQueryFn } from '../../../../../mongodb/query/query';
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
  const { mongoDB } = ctx;
  const { input } = arg;

  const noteId = input.note.id;
  const insertRecord = input.insertRecord;

  const currentUserId = input.authUser.id;

  const insertionResult = await insertCollabRecord({
    mongoDB,
    noteId,
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
    noteId,
  });
  const collabTextIdQuery = CollabText_id_fromNoteQueryFn(noteQuery);

  const payload: ResolversTypes['SignedInUserMutation'] = {
    __typename: 'UpdateNoteInsertRecordPayload',
    isDuplicateRecord: insertionResult.type === 'duplicate',
    newRecord: {
      parentId: collabTextIdQuery,
      query: createValueQueryFn<QueryableCollabRecord>(() => insertionResult.record),
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
