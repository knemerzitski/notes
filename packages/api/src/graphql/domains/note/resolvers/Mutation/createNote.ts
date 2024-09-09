import {
  NoteCategory,
  ResolversTypes,
  type MutationResolvers,
} from '../../../types.generated';
import { NoteMapper } from '../../schema.mappers';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';
import { wrapRetryOnErrorAsync } from '~utils/wrap-retry-on-error';
import {
  retryOnMongoError,
  MongoErrorCodes,
} from '../../../../../mongodb/utils/retry-on-mongo-error';
import { groupByFirst } from '~utils/array/group-by';
import mapObject from 'map-obj';
import { queryWithNoteSchema } from '../../../../../services/note/note';
import { assertAuthenticated } from '../../../../../services/auth/auth';
import { insertNote } from '../../../../../services/note/insert-note';

const _createNote: NonNullable<MutationResolvers['createNote']> = async (
  _parent,
  arg,
  ctx
) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;

  const currentUserId = auth.session.userId;

  const initialTextByTextField = input.collab?.textFields
    ? mapObject(
        groupByFirst(input.collab.textFields, (field) => field.key),
        (key, entry) => [key, { initialText: entry.value.initialText }]
      )
    : null;

  const note = await insertNote({
    mongoDB,
    userId: currentUserId,
    categoryName: input.userNoteLink?.categoryName ?? NoteCategory.DEFAULT,
    backgroundColor: input.userNoteLink?.preferences?.backgroundColor,
    collabTexts: initialTextByTextField,
  });

  const noteMapper: NoteMapper = {
    query: queryWithNoteSchema({
      note,
      userLoader: mongoDB.loaders.user,
    }),
  };

  const payload: ResolversTypes['SignedInUserMutations'] = {
    __typename: 'CreateNotePayload',
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

export const createNote = wrapRetryOnErrorAsync(
  _createNote,
  retryOnMongoError({
    maxRetries: 3,
    codes: [MongoErrorCodes.DUPLICATE_KEY_E11000],
  })
);
