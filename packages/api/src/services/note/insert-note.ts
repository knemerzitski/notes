import { MongoClient, ObjectId } from 'mongodb';
import { array, assign, object } from 'superstruct';

import { Maybe } from '../../../../utils/src/types';

import { CollectionName } from '../../mongodb/collection-names';
import { MongoDBCollections } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { insertNote as model_insertNote } from '../../mongodb/models/note/insert-note';
import { createInitialCollabText } from '../../mongodb/models/note/utils/create-initial-collab-text';
import { CollabRecordSchema } from '../../mongodb/schema/collab-record';
import { CollabTextSchema } from '../../mongodb/schema/collab-text';
import { NoteSchema } from '../../mongodb/schema/note';
import { NoteUserSchema } from '../../mongodb/schema/note-user';
import { withTransaction } from '../../mongodb/utils/with-transaction';

interface InsertNoteParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<
      MongoDBCollections,
      CollectionName.NOTES | CollectionName.USERS | CollectionName.COLLAB_RECORDS
    >;
    loaders: Pick<MongoDBLoaders, 'note'>;
  };
  userId: ObjectId;
  backgroundColor?: Maybe<string>;
  categoryName: string;
  collabText?: { initialText: string };
}

export async function insertNote({
  mongoDB,
  userId,
  backgroundColor,
  categoryName,
  collabText,
}: InsertNoteParams) {
  let preferences: NoteUserSchema['preferences'] | undefined;
  if (backgroundColor) {
    preferences = {
      backgroundColor,
    };
  }
  const note: NoteSchema = {
    _id: new ObjectId(),
    users: [
      {
        _id: userId,
        createdAt: new Date(),
        isOwner: true,
        categoryName,
        ...(preferences && { preferences }),
      },
    ],
  };

  let collabRecords: CollabRecordSchema[] = [];
  if (collabText?.initialText != null) {
    const initialCollabText = createInitialCollabText({
      collabTextId: note._id,
      creatorUserId: userId,
      initialText: collabText.initialText,
    });
    note.collabText = initialCollabText.collabText;
    collabRecords = initialCollabText.collabRecords;
  }

  await withTransaction(mongoDB.client, ({ runSingleOperation }) =>
    model_insertNote({
      mongoDB: {
        runSingleOperation,
        collections: mongoDB.collections,
      },
      note,
      collabRecords,
    })
  );

  mongoDB.loaders.note.prime(
    {
      id: {
        noteId: note._id,
        userId,
      },
    },
    {
      ...note,
      // Set records in note
      ...(note.collabText
        ? {
            collabText: {
              ...note.collabText,
              records: collabRecords,
            },
          }
        : {
            collabText: undefined,
          }),
    },
    {
      valueToQueryOptions: {
        fillStruct: assign(
          NoteSchema,
          object({
            collabText: assign(
              CollabTextSchema,
              object({
                records: array(CollabRecordSchema),
              })
            ),
          })
        ),

        visitorFn: ({ addPermutationsByPath }) => {
          addPermutationsByPath('collabText.records', [
            {
              $pagination: {
                last: 1,
              },
            },
            {
              $pagination: {
                last: 20,
              },
            },
          ]);
        },
      },
    }
  );

  return {
    note,
    collabRecords,
  };
}
