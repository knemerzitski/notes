import { MongoClient, ObjectId } from 'mongodb';
import { Maybe } from '~utils/types';

import { MongoDBCollections, CollectionName } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { createCollabText } from '../../mongodb/models/note/create-collab-text';
import { insertNote as model_insertNote } from '../../mongodb/models/note/insert-note';
import { NoteSchema } from '../../mongodb/schema/note';
import { NoteUserSchema } from '../../mongodb/schema/note-user';
import { withTransaction } from '../../mongodb/utils/with-transaction';

interface InsertNoteParams {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
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
    collabText:
      collabText?.initialText != null
        ? createCollabText({
            creatorUserId: userId,
            initialText: collabText.initialText,
          })
        : undefined,
  };

  await withTransaction(mongoDB.client, ({ runSingleOperation }) =>
    model_insertNote({
      mongoDB: {
        runSingleOperation,
        collections: mongoDB.collections,
      },
      note,
    })
  );

  mongoDB.loaders.note.prime(
    {
      id: {
        noteId: note._id,
        userId,
      },
    },
    note,
    {
      valueToQueryOptions: {
        fillStruct: NoteSchema,
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

  return note;
}
