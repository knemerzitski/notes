import { QueryableRevisionRecord } from '../../../../../mongodb/loaders/note/descriptions/revision-record';
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
  const { services, mongoDB } = ctx;
  const { input } = arg;

  const auth = await services.auth.getAuth(input.authUser.id);
  const noteId = input.note.id;
  const insertRecord = input.insertRecord;

  const currentUserId = auth.session.userId;

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
