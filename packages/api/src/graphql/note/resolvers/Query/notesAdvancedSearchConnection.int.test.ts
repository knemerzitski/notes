/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import mapObject from 'map-obj';
import { assert, beforeAll, expect, it } from 'vitest';

import { Changeset } from '~collab/changeset/changeset';

import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import { createGraphQLResolversContext } from '../../../../__test__/helpers/graphql/graphql-context';
import {
  mongoCollections,
  resetDatabase,
} from '../../../../__test__/helpers/mongodb/mongodb';
import {
  populateNotes,
  populateNotesWithText,
} from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { GraphQLResolversContext } from '../../../context';
import { NoteConnection, NoteTextField } from '../../../types.generated';

const QUERY = `#graphql
  query($searchText: String! $after: String, $first: NonNegativeInt, $before: String, $last: NonNegativeInt) {
    notesAdvancedSearchConnection(searchText: $searchText, after: $after, first: $first, before: $before, last: $last){
      notes {
        textFields {
          key
          value {
            headText {
              changeset
            }
          }
        }
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
`;

let populateResult: ReturnType<typeof populateNotes>;
let user: UserSchema;
let contextValue: GraphQLResolversContext;

beforeAll(async () => {
  faker.seed(42347);
  await resetDatabase();

  populateResult = populateNotesWithText([
    {
      [NoteTextField.TITLE]: '1',
      [NoteTextField.CONTENT]: 'bar bar',
    },
    {
      [NoteTextField.TITLE]: '2',
      [NoteTextField.CONTENT]: 'foo foo',
    },
    {
      [NoteTextField.TITLE]: '3',
      [NoteTextField.CONTENT]: 'bar',
    },
    {
      [NoteTextField.TITLE]: '4',
      [NoteTextField.CONTENT]: 'foo foo foo',
    },
    {
      [NoteTextField.TITLE]: '5',
      [NoteTextField.CONTENT]: 'bar bar bar',
    },
    {
      [NoteTextField.TITLE]: '6',
      [NoteTextField.CONTENT]: 'foo',
    },
  ]);

  user = populateResult.user;

  await populateExecuteAll();

  contextValue = createGraphQLResolversContext(user);

  // TODO defined search index in note schema
  const searchIndexes = await mongoCollections.notes.listSearchIndexes().toArray();
  if (searchIndexes.length > 0) {
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

async function fetchPaginate(variables: {
  searchText: string;
  after?: string | number | null;
  before?: string | number | null;
  first?: number;
  last?: number;
}) {
  const response = await apolloServer.executeOperation(
    {
      query: QUERY,
      variables,
    },
    {
      contextValue,
    }
  );

  assert(response.body.kind === 'single');
  const { data, errors } = response.body.singleResult;
  expect(errors, JSON.stringify(errors, null, 2)).toBeUndefined();

  assert(data != null);

  return data.notesAdvancedSearchConnection as NoteConnection;
}

function getContentFieldTexts(data: NoteConnection) {
  return data.notes.map((note) => {
    const contentField = note.textFields.find(
      (textField) => textField.key === NoteTextField.CONTENT
    );
    const contentText = Changeset.parseValue(
      contentField?.value.headText.changeset
    ).joinInsertions();

    return contentText;
  });
}

it('paginates notes from start to end', async () => {
  // [(foo foo foo),foo foo,foo]
  let pagination = await fetchPaginate({
    searchText: 'foo',
    first: 1,
  });
  expect(getContentFieldTexts(pagination)).toStrictEqual(['foo foo foo']);
  expect(pagination.pageInfo).toEqual({
    hasNextPage: true,
    hasPreviousPage: false,
    startCursor: expect.any(String),
    endCursor: expect.any(String),
  });

  // [foo foo foo,(foo foo),foo]
  pagination = await fetchPaginate({
    searchText: 'foo',
    first: 1,
    after: pagination.pageInfo.endCursor,
  });
  expect(getContentFieldTexts(pagination)).toStrictEqual(['foo foo']);
  expect(pagination.pageInfo).toEqual({
    hasNextPage: true,
    hasPreviousPage: true,
    startCursor: expect.any(String),
    endCursor: expect.any(String),
  });

  // [foo foo foo,foo foo,(foo)]
  pagination = await fetchPaginate({
    searchText: 'foo',
    first: 1,
    after: pagination.pageInfo.endCursor,
  });
  expect(getContentFieldTexts(pagination)).toStrictEqual(['foo']);
  expect(pagination.pageInfo).toEqual({
    hasNextPage: false,
    hasPreviousPage: true,
    startCursor: expect.any(String),
    endCursor: expect.any(String),
  });

  // [foo foo foo,foo foo,foo,()]
  pagination = await fetchPaginate({
    searchText: 'foo',
    first: 1,
    after: pagination.pageInfo.endCursor,
  });
  expect(getContentFieldTexts(pagination)).toStrictEqual([]);
  expect(pagination.pageInfo).toEqual({
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  });
});

it('paginates notes from end to start', async () => {
  let result = await fetchPaginate({
    searchText: 'foo',
    last: 1,
  });
  expect(getContentFieldTexts(result)).toStrictEqual(['foo']);
  expect(result.pageInfo).toEqual({
    hasNextPage: false,
    hasPreviousPage: true,
    startCursor: expect.any(String),
    endCursor: expect.any(String),
  });

  result = await fetchPaginate({
    searchText: 'foo',
    last: 1,
    before: result.pageInfo.startCursor,
  });
  expect(getContentFieldTexts(result)).toStrictEqual(['foo foo']);
  expect(result.pageInfo).toEqual({
    hasNextPage: true,
    hasPreviousPage: true,
    startCursor: expect.any(String),
    endCursor: expect.any(String),
  });

  result = await fetchPaginate({
    searchText: 'foo',
    last: 1,
    before: result.pageInfo.startCursor,
  });
  expect(getContentFieldTexts(result)).toStrictEqual(['foo foo foo']);
  expect(result.pageInfo).toEqual({
    hasNextPage: true,
    hasPreviousPage: false,
    startCursor: expect.any(String),
    endCursor: expect.any(String),
  });

  result = await fetchPaginate({
    searchText: 'foo',
    last: 1,
    before: result.pageInfo.startCursor,
  });
  expect(getContentFieldTexts(result)).toStrictEqual([]);
  expect(result.pageInfo).toEqual({
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  });
});

it('invalid cursor returns empty array', async () => {
  const pagination = await fetchPaginate({
    searchText: 'bar',
    first: 1,
    after: 'CAIVisvKPg==',
  });

  expect(getContentFieldTexts(pagination)).toStrictEqual([]);
  expect(pagination.pageInfo).toMatchObject({
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  });
});
