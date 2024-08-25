import { isDefined } from '~utils/type-guards/is-defined';
import { createCollabText } from '../../../../services/collab/collab';
import { assertAuthenticated } from '../../../base/directives/auth';
import {
  NoteCategory,
  ResolversTypes,
  type MutationResolvers,
} from './../../../types.generated';
import { NoteUserSchema } from '../../../../mongodb/schema/note/note-user';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { ObjectId } from 'mongodb';
import { getNotesArrayPath } from '../../../../mongodb/schema/user/user';
import { NoteMapper } from '../../schema.mappers';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';
import { isQueryOnlyId } from '../../../../mongodb/query/utils/is-query-only-id';
import { wrapRetryOnErrorAsync } from '~utils/wrap-retry-on-error';
import {
  retryOnMongoError,
  MongoErrorCodes,
} from '../../../../mongodb/utils/retry-on-mongo-error';

const _createNote: NonNullable<MutationResolvers['createNote']> = async (
  _parent,
  arg,
  ctx
) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;

  const currentUserId = auth.session.userId;

  const seenTextFieldKeys = new Set<string>();

  const textFieldEntries =
    input.collab?.textFields
      ?.map((textField) => {
        if (seenTextFieldKeys.has(textField.key)) {
          return;
        }
        seenTextFieldKeys.add(textField.key);

        return {
          k: textField.key,
          v: createCollabText({
            creatorUserId: currentUserId,
            initalText: textField.value.initialText,
          }),
        };
      })
      .filter(isDefined) ?? [];

  // TODO a service
  const noteUser: NoteUserSchema = {
    _id: currentUserId,
    createdAt: new Date(),
    ...(input.userNoteLink?.preferences && {
      preferences: {
        ...input.userNoteLink.preferences,
        backgroundColor: input.userNoteLink.preferences.backgroundColor ?? undefined,
      },
    }),
    categoryName: input.userNoteLink?.categoryName ?? NoteCategory.DEFAULT,
  };

  // TODO a service?
  const note: NoteSchema = {
    _id: new ObjectId(),
    users: [noteUser],
    collabUpdatedAt: new Date(),
    collabTexts: textFieldEntries,
  };

  // TODO a service
  await mongoDB.client.withSession((session) =>
    session.withTransaction(async (session) => {
      // First request must not be done in parallel or you get NoSuchTransaction error
      await mongoDB.collections.notes.insertOne(note, { session });

      // Now can do requests in parellel
      await mongoDB.collections.users.updateOne(
        {
          _id: currentUserId,
        },
        {
          $push: {
            [getNotesArrayPath(noteUser.categoryName)]: note._id,
          },
        },
        { session }
      );
    })
  );

  const note_collabKeyed = {
    ...note,
    collabTexts: Object.fromEntries(
      textFieldEntries.map((collabText) => [collabText.k, collabText.v])
    ),
  };

  const noteMapper: NoteMapper = {
    query: async (query) => {
      const queryCollabTexts = query.collabTexts;
      if (!queryCollabTexts || Object.keys(note_collabKeyed.collabTexts).length === 0) {
        return note_collabKeyed;
      }

      // Load record creatorUser if queried
      return {
        ...note_collabKeyed,
        collabTexts: Object.fromEntries(
          await Promise.all(
            Object.entries(note_collabKeyed.collabTexts).map(async ([key, value]) => {
              const collabText = note_collabKeyed.collabTexts[key];
              const queryCreatorUser = queryCollabTexts[key]?.records?.creatorUser;
              if (!collabText || !queryCreatorUser) {
                return [key, value];
              }

              return [
                key,
                {
                  ...collabText,
                  records: await Promise.all(
                    collabText.records.map(async (record) => ({
                      ...record,
                      creatorUser: isQueryOnlyId(queryCreatorUser)
                        ? { _id: record.creatorUserId }
                        : await mongoDB.loaders.user.load({
                            id: {
                              userId: record.creatorUserId,
                            },
                            query: queryCreatorUser,
                          }),
                    }))
                  ),
                },
              ];
            })
          )
        ),
      };
    },
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
