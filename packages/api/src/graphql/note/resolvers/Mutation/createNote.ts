import { ObjectId } from 'mongodb';

import { isDefined } from '~utils/type-guards/is-defined';
import { wrapRetryOnErrorAsync } from '~utils/wrap-retry-on-error';

import { DeepQueryResult } from '../../../../mongodb/query/query';
import { CollabTextSchema } from '../../../../mongodb/schema/collab-text/collab-text';
import { createCollabText } from '../../../../mongodb/schema/collab-text/utils/create-collab-text';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { NoteUserSchema } from '../../../../mongodb/schema/note/note-user';
import { QueryableNote } from '../../../../mongodb/schema/note/query/queryable-note';
import { getNotesArrayPath } from '../../../../mongodb/schema/user/user';
import {
  MongoErrorCodes,
  retryOnMongoError,
} from '../../../../mongodb/utils/retry-on-mongo-error';
import { assertAuthenticated } from '../../../base/directives/auth';
import {
  NoteCategory,
  NoteTextField,
  type MutationResolvers,
} from '../../../types.generated';
import { NoteQueryMapper } from '../../mongo-query-mapper/note';
import { publishNoteCreated } from '../Subscription/noteEvents';

const _createNote: NonNullable<MutationResolvers['createNote']> = async (
  _parent,
  { input },
  ctx
) => {
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  const seenTextFieldKeys = new Set<string>();
  const collabTextSchemaEntries = input.textFields
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
    .filter(isDefined);

  const noteUser: NoteUserSchema = {
    _id: currentUserId,
    createdAt: new Date(),
    ...(input.preferences && {
      preferences: {
        ...input.preferences,
        backgroundColor: input.preferences.backgroundColor ?? undefined,
      },
    }),
    categoryName: input.categoryName ?? NoteCategory.DEFAULT,
  };

  const noteNoCollabTexts: Omit<NoteSchema, 'collabTexts'> = {
    _id: new ObjectId(),
    users: [noteUser],
    ...(collabTextSchemaEntries != null &&
      collabTextSchemaEntries.length > 0 && {
        collabTexts: collabTextSchemaEntries,
      }),
  };

  const note =
    collabTextSchemaEntries != null && collabTextSchemaEntries.length > 0
      ? {
          ...noteNoCollabTexts,
          collabTexts: collabTextSchemaEntries,
        }
      : noteNoCollabTexts;
  await mongodb.client.withSession((session) =>
    session.withTransaction(async (session) => {
      // First request must not be done in parallel or you get NoSuchTransaction error
      await mongodb.collections.notes.insertOne(note, { session });

      // Now can do requests in parellel
      await mongodb.collections.users.updateOne(
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

  // Build response mapper
  const noteQueryResponse: DeepQueryResult<QueryableNote> = {
    ...noteNoCollabTexts,
    ...(collabTextSchemaEntries != null &&
      collabTextSchemaEntries.length > 0 && {
        collabTexts: Object.fromEntries(
          collabTextSchemaEntries.map<[NoteTextField, CollabTextSchema]>((collabText) => [
            collabText.k,
            collabText.v,
          ])
        ),
      }),
  };

  const noteQueryMapper = new NoteQueryMapper(currentUserId, {
    query() {
      return noteQueryResponse;
    },
  });

  // Subscription
  await publishNoteCreated(
    currentUserId,
    {
      note: noteQueryMapper,
    },
    ctx
  );

  // Response
  return {
    note: noteQueryMapper,
  };
};

export const createNote = wrapRetryOnErrorAsync(
  _createNote,
  retryOnMongoError({
    maxRetries: 3,
    codes: [MongoErrorCodes.DUPLICATE_KEY_E11000],
  })
);
