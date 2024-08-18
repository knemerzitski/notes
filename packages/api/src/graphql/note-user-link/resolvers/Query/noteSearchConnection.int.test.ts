/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { beforeAll, beforeEach, expect, it } from 'vitest';

import { Changeset } from '~collab/changeset/changeset';

import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import {
  createGraphQLResolversContext,
  CreateGraphQLResolversContextOptions,
} from '../../../../__test__/helpers/graphql/graphql-context';
import { expectGraphQLResponseData } from '../../../../__test__/helpers/graphql/response';
import { dropAndCreateSearchIndexes } from '../../../../__test__/helpers/mongodb/indexes';
import {
  mongoCollectionStats,
  resetDatabase,
} from '../../../../__test__/helpers/mongodb/mongodb';
import {
  populateNotes,
  populateNotesWithText,
} from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { NoteConnection, NoteTextField } from '../../../types.generated';
import { UnwrapFieldWrapper } from '../../../../__test__/helpers/graphql/field-wrap';

interface Variables {
  searchText: string;
  after?: string | number | null;
  before?: string | number | null;
  first?: number;
  last?: number;
}

const QUERY = `#graphql
  query($searchText: String! $after: String, $first: NonNegativeInt, $before: String, $last: NonNegativeInt) {
    noteSearchConnection(searchText: $searchText, after: $after, first: $first, before: $before, last: $last){
      notes {
        noteId
        textFields {
          key
          value {
            headText {
              changeset
            }
          }
        }
      }
      edges {
        node {
          noteId
        }
        cursor
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

beforeAll(async () => {
  faker.seed(42347);
  await resetDatabase();

  populateResult = populateNotesWithText(
    ['bar bar', 'foo foo', 'bar', 'foo foo foo', 'bar bar bar', 'foo'],
    {
      collabTextKeys: Object.values(NoteTextField),
    }
  );

  user = populateResult.user;

  await populateExecuteAll();

  await dropAndCreateSearchIndexes();
});

beforeEach(() => {
  mongoCollectionStats.mockClear();
});

async function executeOperation(
  variables: Variables,
  options?: CreateGraphQLResolversContextOptions,
  query: string = QUERY
) {
  return await apolloServer.executeOperation<
    {
      noteSearchConnection: UnwrapFieldWrapper<NoteConnection>;
    },
    Variables
  >(
    {
      query,
      variables,
    },
    {
      contextValue: createGraphQLResolversContext({
        user,
        ...options,
      }),
    }
  );
}

function getContentFieldTexts(data: UnwrapFieldWrapper<NoteConnection>) {
  return data.notes.map((note) => {
    const contentField = note?.textFields.find(
      (textField) => textField?.key === NoteTextField.CONTENT
    );
    const contentText = Changeset.parseValue(
      contentField?.value?.headText?.changeset
    ).joinInsertions();

    return contentText;
  });
}

it('paginates notes from start to end', async () => {
  // [(foo foo foo),foo foo,foo]
  let response = await executeOperation({
    searchText: 'foo',
    first: 1,
  });
  let data = expectGraphQLResponseData(response);

  expect(mongoCollectionStats.allStats()).toStrictEqual(
    expect.objectContaining({
      readAndModifyCount: 1,
      readCount: 1,
    })
  );

  expect(getContentFieldTexts(data.noteSearchConnection)).toStrictEqual(['foo foo foo']);
  expect(data.noteSearchConnection.pageInfo).toEqual({
    hasNextPage: true,
    hasPreviousPage: false,
    startCursor: expect.any(String),
    endCursor: expect.any(String),
  });

  // [foo foo foo,(foo foo),foo]
  response = await executeOperation({
    searchText: 'foo',
    first: 1,
    after: data.noteSearchConnection.pageInfo?.endCursor,
  });
  data = expectGraphQLResponseData(response);

  expect(getContentFieldTexts(data.noteSearchConnection)).toStrictEqual(['foo foo']);
  expect(data.noteSearchConnection.pageInfo).toEqual({
    hasNextPage: true,
    hasPreviousPage: true,
    startCursor: expect.any(String),
    endCursor: expect.any(String),
  });

  // [foo foo foo,foo foo,(foo)]
  response = await executeOperation({
    searchText: 'foo',
    first: 1,
    after: data.noteSearchConnection.pageInfo?.endCursor,
  });
  data = expectGraphQLResponseData(response);

  expect(getContentFieldTexts(data.noteSearchConnection)).toStrictEqual(['foo']);
  expect(data.noteSearchConnection.pageInfo).toEqual({
    hasNextPage: false,
    hasPreviousPage: true,
    startCursor: expect.any(String),
    endCursor: expect.any(String),
  });

  // [foo foo foo,foo foo,foo,()]
  response = await executeOperation({
    searchText: 'foo',
    first: 1,
    after: data.noteSearchConnection.pageInfo?.endCursor,
  });
  data = expectGraphQLResponseData(response);

  expect(getContentFieldTexts(data.noteSearchConnection)).toStrictEqual([]);
  expect(data.noteSearchConnection.pageInfo).toEqual({
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  });
});

it('paginates notes from end to start', async () => {
  let response = await executeOperation({
    searchText: 'foo',
    last: 1,
  });
  let data = expectGraphQLResponseData(response);

  expect(getContentFieldTexts(data.noteSearchConnection)).toStrictEqual(['foo']);
  expect(data.noteSearchConnection.pageInfo).toEqual({
    hasNextPage: false,
    hasPreviousPage: true,
    startCursor: expect.any(String),
    endCursor: expect.any(String),
  });

  response = await executeOperation({
    searchText: 'foo',
    last: 1,
    before: data.noteSearchConnection.pageInfo?.startCursor,
  });
  data = expectGraphQLResponseData(response);

  expect(getContentFieldTexts(data.noteSearchConnection)).toStrictEqual(['foo foo']);
  expect(data.noteSearchConnection.pageInfo).toEqual({
    hasNextPage: true,
    hasPreviousPage: true,
    startCursor: expect.any(String),
    endCursor: expect.any(String),
  });

  response = await executeOperation({
    searchText: 'foo',
    last: 1,
    before: data.noteSearchConnection.pageInfo?.startCursor,
  });
  data = expectGraphQLResponseData(response);

  expect(getContentFieldTexts(data.noteSearchConnection)).toStrictEqual(['foo foo foo']);
  expect(data.noteSearchConnection.pageInfo).toEqual({
    hasNextPage: true,
    hasPreviousPage: false,
    startCursor: expect.any(String),
    endCursor: expect.any(String),
  });

  response = await executeOperation({
    searchText: 'foo',
    last: 1,
    before: data.noteSearchConnection.pageInfo?.startCursor,
  });
  data = expectGraphQLResponseData(response);

  expect(getContentFieldTexts(data.noteSearchConnection)).toStrictEqual([]);
  expect(data.noteSearchConnection.pageInfo).toEqual({
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  });
});

it('invalid cursor returns empty array', async () => {
  const response = await executeOperation({
    searchText: 'bar',
    first: 1,
    after: 'CAIVisvKPg==',
  });
  const data = expectGraphQLResponseData(response);

  expect(getContentFieldTexts(data.noteSearchConnection)).toStrictEqual([]);
  expect(data.noteSearchConnection.pageInfo).toMatchObject({
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  });
});
