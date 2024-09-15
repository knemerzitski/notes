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

  const collabInitialText = input.collab?.text?.initialText;

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
