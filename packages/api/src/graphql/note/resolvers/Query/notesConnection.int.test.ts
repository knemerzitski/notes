/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeAll, expect, it } from 'vitest';

import { UserSchema } from '../../../../mongodb/schema/user';
import { apolloServer } from '../../../../test/helpers/graphql/apollo-server';
import { createGraphQLResolversContext } from '../../../../test/helpers/graphql/graphql-context';
import { resetDatabase } from '../../../../test/helpers/mongodb/mongodb';
import { populateNotes } from '../../../../test/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../test/helpers/mongodb/populate/populate-queue';
import { GraphQLResolversContext } from '../../../context';
import { NoteCategory, NoteConnection, NoteEdge } from '../../../types.generated';

const QUERY = `#graphql
  query($after: String, $first: NonNegativeInt, $before: String, $last: NonNegativeInt, $category: NoteCategory) {
    notesConnection(after: $after, first: $first, before: $before, last: $last, category: $category){
      edges {
        cursor
        node {
          id
          contentId
          textFields {
            key
            value {
              headText {
                revision
                changeset
              }
              recordsConnection(last: 2) {
                edges {
                  node {
                    change {
                      revision
                    }
                  }
                }
              }
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
let populateResultArchive: ReturnType<typeof populateNotes>;

let user: UserSchema;

let contextValue: GraphQLResolversContext;

beforeAll(async () => {
  faker.seed(5435);
  await resetDatabase();

  populateResult = populateNotes(10, {
    collabText() {
      return {
        recordsCount: 2,
      };
    },
    note(noteIndex) {
      return {
        override: {
          publicId: `publicId_${noteIndex}`,
        },
      };
    },
  });
  user = populateResult.user;

  populateResultArchive = populateNotes(3, {
    user,
    userNote() {
      return {
        override: {
          category: {
            name: NoteCategory.ARCHIVE,
          },
        },
      };
    },
  });

  await populateExecuteAll();

  contextValue = createGraphQLResolversContext(user);
});

it('returns last 2 notes, after: 7, first 4 => 8,9 (10 notes total)', async () => {
  const userNote7 = populateResult.data[7]?.userNote;
  assert(userNote7 != null);

  const response = await apolloServer.executeOperation(
    {
      query: QUERY,
      variables: {
        after: userNote7._id.toString('base64'),
        first: 4,
      },
    },
    {
      contextValue,
    }
  );

  assert(response.body.kind === 'single');
  const { data, errors } = response.body.singleResult;
  expect(errors).toBeUndefined();
  const typedData = data as { notesConnection: NoteConnection };

  expect(
    typedData.notesConnection.edges.map((edge) => {
      if (!edge) return null;
      return (edge as NoteEdge).node.contentId;
    })
  ).toStrictEqual(['publicId_8', 'publicId_9']);

  expect(typedData.notesConnection.pageInfo).toEqual({
    hasPreviousPage: true,
    hasNextPage: false,
    startCursor: typedData.notesConnection.edges[0]?.cursor,
    endCursor: typedData.notesConnection.edges[1]?.cursor,
  });
});

it('returns nothing when cursor is invalid', async () => {
  const userNote6 = populateResult.data[6]?.userNote;
  assert(userNote6 != null);

  const response = await apolloServer.executeOperation(
    {
      query: QUERY,
      variables: {
        before: 'never',
      },
    },
    {
      contextValue,
    }
  );

  assert(response.body.kind === 'single');
  const { data, errors } = response.body.singleResult;
  expect(errors).toBeUndefined();
  expect(data).toEqual({
    notesConnection: {
      edges: [],
      pageInfo: {
        hasPreviousPage: false,
        hasNextPage: false,
        startCursor: null,
        endCursor: null,
      },
    },
  });
});

it('returns empty array when cursor is not found', async () => {
  const userNote6 = populateResult.data[6]?.userNote;
  assert(userNote6 != null);

  const response = await apolloServer.executeOperation(
    {
      query: QUERY,
      variables: {
        before: '1234567890abcdef',
        last: 5,
      },
    },
    {
      contextValue,
    }
  );

  assert(response.body.kind === 'single');
  const { data, errors } = response.body.singleResult;
  expect(errors).toBeUndefined();
  expect(data).toEqual({
    notesConnection: {
      edges: [],
      pageInfo: {
        hasPreviousPage: false,
        hasNextPage: false,
        startCursor: null,
        endCursor: null,
      },
    },
  });
});

it('returns notes from different category: ARCHIVE', async () => {
  const response = await apolloServer.executeOperation(
    {
      query: QUERY,
      variables: {
        first: 10,
        category: NoteCategory.ARCHIVE,
      },
    },
    {
      contextValue,
    }
  );

  assert(response.body.kind === 'single');
  const { data, errors } = response.body.singleResult;
  expect(errors).toBeUndefined();
  const typedData = data as { notesConnection: NoteConnection };

  expect(
    typedData.notesConnection.edges.map((edge) => {
      if (!edge) return null;
      return (edge as NoteEdge).node.id;
    })
  ).toStrictEqual(
    populateResultArchive.data
      .map(({ userNote }) => userNote)
      .map((n) => n._id.toString('base64'))
  );
});
