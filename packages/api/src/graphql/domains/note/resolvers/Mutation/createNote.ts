import { wrapRetryOnError } from '~utils/retry-on-error';

import { QueryableCollabRecord } from '../../../../../mongodb/loaders/note/descriptions/revision-record';
import { createValueQueryFn } from '../../../../../mongodb/query/query';
import {
  retryOnMongoError,
  MongoErrorCodes,
} from '../../../../../mongodb/utils/retry-on-mongo-error';
import { insertNote } from '../../../../../services/note/insert-note';
import {
  CollabText_id_fromNoteQueryFn,
  mapNoteToCollabTextQueryFn,
} from '../../../../../services/note/note-collab';
import {
  NoteCategory,
  ResolversTypes,
  type MutationResolvers,
} from '../../../types.generated';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';
import { NoteMapper } from '../../schema.mappers';

const _createNote: NonNullable<MutationResolvers['createNote']> = async (
  _parent,
  arg,
  ctx
) => {
  const { mongoDB } = ctx;

  const { input } = arg;

  const currentUserId = input.authUser.id;

  const collabInitialText = input.collabText?.initialText;

  const note = await insertNote({
    mongoDB,
    userId: currentUserId,
    categoryName: input.userNoteLink?.categoryName ?? NoteCategory.DEFAULT,
    backgroundColor: input.userNoteLink?.preferences?.backgroundColor,
    collabText: collabInitialText
      ? {
          initialText: collabInitialText,
        }
      : undefined,
  });

  const noteMapper: NoteMapper = {
    query: mongoDB.loaders.note.createQueryFn({
      noteId: note._id,
      userId: currentUserId,
    }),
  };
  const collabTextIdQuery = CollabText_id_fromNoteQueryFn(noteMapper.query);

  const payload: ResolversTypes['SignedInUserMutation'] = {
    __typename: 'CreateNotePayload',
    ...(note.collabText && {
      firstCollabTextRecord: {
        parentId: collabTextIdQuery,
        query: createValueQueryFn<QueryableCollabRecord>(
          () => note.collabText?.records[0]
        ),
      },
      collabText: {
        id: collabTextIdQuery,
        query: mapNoteToCollabTextQueryFn(noteMapper.query),
      },
    }),
    userNoteLink: {
      userId: currentUserId,
      query: noteMapper.query,
    },
    note: noteMapper,
  };

  // Publish to subscriptions
  await publishSignedInUserMutation(currentUserId, payload, ctx);

  return payload;
};

export const createNote = wrapRetryOnError(
  _createNote,
  retryOnMongoError({
    maxRetries: 3,
    codes: [MongoErrorCodes.DUPLICATE_KEY_E11000],
  })
);
