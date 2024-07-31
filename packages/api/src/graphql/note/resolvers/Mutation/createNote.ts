import mapObject from 'map-obj';
import { ObjectId } from 'mongodb';

import { DeepQueryResult } from '../../../../mongodb/query/query';
import createCollabText from '../../../../mongodb/schema/collab-text/utils/createCollabText';
import { NoteSchema, noteDefaultValues } from '../../../../mongodb/schema/note/note';
import { QueryableNote } from '../../../../mongodb/schema/note/query/queryable-note';
import { getNotesArrayPath } from '../../../../mongodb/schema/user/user';
import { assertAuthenticated } from '../../../base/directives/auth';
import {
  NoteCategory,
  NoteTextField,
  ResolversTypes,
  type MutationResolvers,
} from '../../../types.generated';
import { NoteQueryMapper } from '../../mongo-query-mapper/note';
import { publishNoteCreated } from '../Subscription/noteCreated';

export const createNote: NonNullable<MutationResolvers['createNote']> = async (
  _parent,
  { input },
  ctx
) => {
  const { auth, mongodb } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

  const categoryName = NoteCategory.DEFAULT;
  const notesArrayPath = getNotesArrayPath(categoryName);

  // Initialize data
  const note: NoteSchema = {
    _id: new ObjectId(),
    publicId: noteDefaultValues.publicId(),
    userNotes: [
      {
        userId: currentUserId,
        isOwner: true,
        preferences: {
          backgroundColor: input.note?.preferences?.backgroundColor ?? undefined,
        },
        category: {
          name: categoryName,
        },
      },
    ],
    collabTexts: mapObject(NoteTextField, (_key, fieldName) => {
      const fieldValue = input.note?.textFields?.find((s) => s.key === fieldName)?.value;
      const text = fieldValue?.initialText ?? '';
      return [
        fieldName,
        createCollabText({
          creatorUserId: currentUserId,
          initalText: text,
        }),
      ];
    }),
    shareNoteLinks: [],
  };

  // Insert to DB
  await mongodb.client.withSession((session) =>
    session.withTransaction(async (session) => {
      // TODO handle duplicate _id and publicId
      await Promise.all([
        mongodb.collections.notes.insertOne(note, { session }),
        mongodb.collections.users.updateOne(
          {
            _id: currentUserId,
          },
          {
            $push: {
              [notesArrayPath]: note._id,
            },
          },
          { session }
        ),
      ]);
    })
  );

  // Build response mapper
  const noteQueryResponse: DeepQueryResult<QueryableNote> = note;

  const noteQueryMapper = new NoteQueryMapper(currentUserId, {
    query() {
      return noteQueryResponse;
    },
  });

  // Send response
  const payload: ResolversTypes['CreateNotePayload'] &
    ResolversTypes['NoteCreatedPayload'] = {
    note: noteQueryMapper,
  };

  await publishNoteCreated(ctx, payload);

  return payload;
};
