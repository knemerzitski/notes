/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import mapObject from 'map-obj';
import { beforeAll, it, expect, assert } from 'vitest';

import { Changeset } from '~collab/changeset/changeset';

import { resetDatabase, mongoCollections } from '../../__test__/helpers/mongodb/mongodb';
import {
  populateNotes,
  populateNotesWithText,
} from '../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../__test__/helpers/mongodb/populate/populate-queue';
import { NoteTextField } from '../../graphql/types.generated';
import { UserSchema } from '../schema/user/user';

import notesSearchBatchLoad, {
  NotesSearchBatchLoadContext,
  QueryableNotesSearchLoadKey,
} from './notesSearchBatchLoad';

let populateResult: ReturnType<typeof populateNotes>;
let user: UserSchema;

let context: NotesSearchBatchLoadContext;

function resultByText(title: string, content: string) {
  return {
    cursor: expect.any(String),
    note: {
      collabTexts: {
        [NoteTextField.TITLE]: {
          headText: {
            changeset: Changeset.fromInsertion(title).serialize(),
          },
        },
        [NoteTextField.CONTENT]: {
          headText: {
            changeset: Changeset.fromInsertion(content).serialize(),
          },
        },
      },
    },
  };
}

function createLoadKey(
  searchText: string,
  override?: Partial<Omit<QueryableNotesSearchLoadKey, 'searchText'>>
): QueryableNotesSearchLoadKey {
  return {
    userId: user._id,
    searchText,
    ...override,
    searchQuery: {
      cursor: 1,
      ...override?.searchQuery,
      note: {
        collabTexts: {
          TITLE: {
            headText: {
              changeset: 1,
            },
          },
          CONTENT: {
            headText: {
              changeset: 1,
            },
          },
        },
        ...override?.searchQuery?.note,
      },
    },
  };
}

beforeAll(async () => {
  await resetDatabase();
  faker.seed(3325);

  populateResult = populateNotesWithText([
    {
      [NoteTextField.TITLE]: 'foo',
      [NoteTextField.CONTENT]: 'bar',
    },
    {
      [NoteTextField.TITLE]: 'bar',
      [NoteTextField.CONTENT]: 'bar',
    },
    {
      [NoteTextField.TITLE]: 'foo',
      [NoteTextField.CONTENT]: 'foo',
    },
  ]);

  user = populateResult.user;

  await populateExecuteAll();

  context = {
    collections: mongoCollections,
  };

  // TOOD defined search index in note schema
  const serachIndexes = await mongoCollections.notes.listSearchIndexes().toArray();
  if (serachIndexes.length > 0) {
    await mongoCollections.notes.dropSearchIndex('collabTextsHeadText');
  }
  await mongoCollections.notes.createSearchIndex({
    name: 'collabTextsHeadText',
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          userNotes: {
            type: 'document',
            fields: {
              userId: {
                type: 'objectId',
              },
            },
          },
          collabTexts: {
            type: 'document',
            fields: mapObject(NoteTextField, (_key, fieldName) => [
              fieldName,
              {
                type: 'document',
                fields: {
                  headText: {
                    type: 'document',
                    fields: {
                      changeset: {
                        type: 'string',
                        analyzer: 'lucene.english',
                      },
                    },
                  },
                },
              },
            ]),
          },
        },
      },
    },
  });

  // Wait for search index to be ready
  while (
    (
      (await mongoCollections.notes.listSearchIndexes().next()) as {
        name: string;
        status: string;
      } | null
    )?.status !== 'READY'
  ) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
});

it('finds a note, {first: 1}', async () => {
  const result = await notesSearchBatchLoad(
    [
      createLoadKey('foo', {
        pagination: {
          first: 1,
        },
      }),
    ],
    context
  );

  expect(result).toEqual([[resultByText('foo', 'foo')]]);
});

it('continues pagination with a cursor', async () => {
  const result1 = await notesSearchBatchLoad(
    [
      createLoadKey('foo', {
        pagination: {
          first: 1,
        },
      }),
    ],
    context
  );

  assert(!(result1[0] instanceof Error));
  const cursor = result1[0]?.[0]?.cursor;
  assert(cursor != null);

  const result2 = await notesSearchBatchLoad(
    [
      createLoadKey('foo', {
        pagination: {
          after: cursor,
          first: 1,
        },
      }),
    ],
    context
  );

  expect(result2).toEqual([[resultByText('foo', 'bar')]]);
});

it('returns empty array on no match', async () => {
  const result = await notesSearchBatchLoad([createLoadKey('random')], context);

  expect(result).toEqual([[]]);
});
