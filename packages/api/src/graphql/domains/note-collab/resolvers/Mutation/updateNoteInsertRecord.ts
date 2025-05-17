import { wrapRetryOnError } from '../../../../../../../utils/src/retry-on-error';

import { QueryableCollabRecord } from '../../../../../mongodb/loaders/note/descriptions/collab-record';
import {
  createValueQueryFn,
  PartialQueryResultDeep,
} from '../../../../../mongodb/query/query';
import {
  retryOnMongoError,
  MongoErrorCodes,
} from '../../../../../mongodb/utils/retry-on-mongo-error';
import { insertCollabRecord } from '../../../../../services/note/insert-collab-record';
import { getNoteUsersIds } from '../../../../../services/note/note';
import {
  CollabText_id_fromNoteQueryFn,
  mapNoteToCollabTextQueryFn,
} from '../../../../../services/note/note-collab';
import type { MutationResolvers, ResolversTypes } from '../../../types.generated';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';

const _updateNoteInsertRecord: NonNullable<
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
    maxRecordsCount: ctx.options.collabText.maxRecordsCount,
    insertRecord: {
      changeset: insertRecord.changeset,
      revision: insertRecord.targetRevision,
      selectionInverse: insertRecord.selectionInverse,
      selection: insertRecord.selection,
      idempotencyId: insertRecord.id,
    },
    connectionId: ctx.connectionId,
    openNoteDuration: ctx.options.note.openNoteDuration,
  });

  const noteQuery = mongoDB.loaders.note.createQueryFn({
    userId: currentUserId,
    noteId,
  });
  const collabTextIdQuery = CollabText_id_fromNoteQueryFn(noteQuery);

  const queryableCollabRecord: PartialQueryResultDeep<QueryableCollabRecord> = {
    ...insertionResult.record,
    author: {
      _id: insertionResult.record?.authorId,
    },
  };

  const payload: ResolversTypes['SignedInUserMutation'] = {
    __typename: 'UpdateNoteInsertRecordPayload',
    isDuplicateRecord: insertionResult.type === 'duplicate',
    newRecord: {
      parentId: collabTextIdQuery,
      query: createValueQueryFn<QueryableCollabRecord>(() => queryableCollabRecord),
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

export const updateNoteInsertRecord = wrapRetryOnError(
  _updateNoteInsertRecord,
  retryOnMongoError({
    maxRetries: 3,
    codes: [MongoErrorCodes.DUPLICATE_KEY_E11000],
  })
);
