import { faker } from '@faker-js/faker';
import { assert, beforeAll, it } from 'vitest';
import {
  populateWithCreatedData,
  createUserWithNotes,
} from '../../test/helpers/mongoose/populate';
import {
  CollabText,
  Note,
  UserNote,
  resetDatabase,
} from '../../tests/helpers/mongoose';
import { UserNoteDocument } from '../models/user-note';
import projectUserNote, { ProjectUserNoteOutput } from './projectUserNote';

enum CollabTextKey {
  TITLE = 'title',
  CONTENT = 'content',
}

let userNote: UserNoteDocument;

beforeAll(async () => {
  await resetDatabase();
  faker.seed(65464);

  const { userNotes: tmpUserNotes } = createUserWithNotes(
    1,
    Object.values(CollabTextKey),
    {
      collabDoc: {
        recordsCount: 1,
      },
    }
  );
  assert(tmpUserNotes[0] != null);
  userNote = tmpUserNotes[0];

  await populateWithCreatedData();
});

it('returns userNote data in expected format', async () => {
  const results = await UserNote.aggregate<ProjectUserNoteOutput<CollabTextKey>>([
    {
      $match: {
        _id: userNote._id,
      },
      ...projectUserNote({
        collectionNames: {
          note: Note.collection.collectionName,
          collaborativeDocument: CollabText.collection.collectionName,
        },
      }),
    },
  ]);

  // TODO check
  const result = results[0];
  assert(result != null);

  // const result2 = await User.aggregate<
  //   UserNotesArrayOutput<CollabTextKey, ProjectCollaborativeDocumentOutput>
  // >([
  //   {
  //     $match: {
  //       _id: user._id,
  //     },
  //   },
  //   {
  //     $project: {
  //       order: '$notes.category.default.order',
  //     },
  //   },
  //   ...userNotesArray({
  //     fieldPath: 'order',
  //     noteTextFields: Object.values(CollabTextKey),
  //     collectionNames: {
  //       userNote: UserNote.collection.collectionName,
  //       note: Note.collection.collectionName,
  //       collaborativeDocument: CollaborativeDocument.collection.collectionName,
  //     },
  //     lookupNote: true,
  //     collaborativeDocumentPipeline: [
  //       {
  //         $project: projectCollaborativeDocument({
  //           headDocument: true,
  //         }),
  //       },
  //     ],
  //   }),
  // ]);

  // const userNote2 = result[0]?.userNotes[0];
  // assert(userNote2 != null);

  // expect(userNote2).toMatchObject({
  //   _id: expect.any(ObjectId),
  //   note: {
  //     id: expect.any(ObjectId),
  //     publicId: expect.any(String),
  //     textFields: {
  //       title: {
  //         _id: expect.any(ObjectId),
  //         headDocument: {
  //           changeset: expect.any(Array),
  //           revision: expect.any(Number),
  //         },
  //       },
  //       content: {
  //         _id: expect.any(ObjectId),
  //         headDocument: {
  //           changeset: expect.any(Array),
  //           revision: expect.any(Number),
  //         },
  //       },
  //     },
  //     lookupNote: {
  //       ownerId: expect.any(ObjectId),
  //     },
  //   },
  //   preferences: {
  //     backgroundColor: expect.any(String),
  //   },
  //   readOnly: expect.any(Boolean),
  // });
});
