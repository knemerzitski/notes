import { assert, beforeAll, describe, it } from 'vitest';
import revisionRecordsPagination, {
  CollabTextRevisionRecordsPaginationInput,
  CollabTextRevisionRecordsPaginationOutput,
  mapRevisionRecordsPaginationInputToOutput,
} from './revisionRecordsPagination';
import { UserDocument } from '../models/user';
import { UserNoteDocument } from '../models/user-note';
import { faker } from '@faker-js/faker';
import {
  createUserWithNotes,
  populateWithCreatedData,
} from '../../test/helpers/mongoose/populate';
import {
  CollabText,
  Note,
  User,
  UserNote,
  resetDatabase,
} from '../../tests/helpers/mongoose';
import relayPaginateUserNotesArray, {
  RelayPaginateUserNotesArrayOuput,
} from './relayPaginateUserNotesArray';

import util from 'util';
import { DefaultCollabTextPipeline, UserNoteLookupOutput } from './lookup/userNoteLookup';

describe('collaborativeDocumentRevisionRecordsPagination', () => {
  enum CollabTextKey {
    CONTENT = 'content',
  }

  let user: UserDocument;
  let userNotes: UserNoteDocument[];

  beforeAll(async () => {
    await resetDatabase();
    faker.seed(88765);

    const { user: tmpUser, userNotes: tmpUserNotes } = createUserWithNotes(
      1,
      Object.values(CollabTextKey),
      {
        collabDoc: {
          recordsCount: 10,
          tailRevision: -1,
        },
        noteMany: {
          enumaratePublicIdByIndex: 0,
        },
      }
    );
    user = tmpUser;
    userNotes = tmpUserNotes;

    await populateWithCreatedData();
  });

  it('sandbox', async () => {
    const paginationInput: CollabTextRevisionRecordsPaginationInput = {
      paginations: [
        {
          before: 3,
          last: 1,
        },
        {
          before: 5,
        },
        {
          after: 17,
        },
      ],
    };

    const recordsPagination = revisionRecordsPagination(paginationInput);

    const operations = relayPaginateUserNotesArray({
      pagination: {
        arrayFieldPath: 'order',
      },
      userNotes: {
        userNoteCollctionName: UserNote.collection.collectionName,
        userNoteLookupInput: {
          note: {
            collectionName: Note.collection.collectionName,
          },
          collabText: {
            collectionName: CollabText.collection.collectionName,
            keys: Object.fromEntries(
              Object.values(CollabTextKey).map((field) => [
                field,
                {
                  pipeline: [
                    {
                      $set: {
                        records: recordsPagination,
                      },
                    },
                  ],
                },
              ])
            ),
          },
        },
      },
    });

    const results = await User.aggregate<
      RelayPaginateUserNotesArrayOuput<
        CollabTextKey,
        UserNoteLookupOutput<
          CollabTextKey,
          Omit<DefaultCollabTextPipeline, 'records'> & {
            records: CollabTextRevisionRecordsPaginationOutput;
          }
        >
      >
    >([
      {
        $match: {
          _id: user._id,
        },
      },
      {
        $project: {
          order: '$notes.category.default.order',
        },
      },
      ...operations,
    ]);

    const result = results[0];
    assert(result != null);

    for (const userNote of result.userNotes) {
      const recordsOutput = userNote.note.collabText.content.records;
      const recordsMapped = mapRevisionRecordsPaginationInputToOutput(
        paginationInput.paginations,
        recordsOutput
      );

      console.log(
        util.inspect(
          {
            input: paginationInput.paginations,
            output: recordsMapped,
          },
          false,
          null,
          true
        )
      );
    }

    // console.log(util.inspect(operations, false, null, true));
    console.log(util.inspect(result, false, null, true));
  });
});
