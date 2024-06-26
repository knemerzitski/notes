/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeAll, expect, it } from 'vitest';

import { UserSchema } from '../../../../mongodb/schema/user';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note';
import { apolloServer } from '../../../../test/helpers/apollo-server';
import { createGraphQLResolversContext } from '../../../../test/helpers/graphql-context';
import { resetDatabase } from '../../../../test/helpers/mongodb';
import {
  populateUserWithNotes,
  populateWithCreatedData,
} from '../../../../test/helpers/mongodb/populate';
import { GraphQLResolversContext } from '../../../context';
import { NoteConnection, NoteEdge, NoteTextField } from '../../../types.generated';

const QUERY = `#graphql
  query($after: String, $first: NonNegativeInt, $before: String, $last: NonNegativeInt) {
    notesConnection(after: $after, first: $first, before: $before, last: $last){
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

let userNotes: UserNoteSchema[];
let user: UserSchema;
let contextValue: GraphQLResolversContext;

beforeAll(async () => {
  faker.seed(5435);
  await resetDatabase();

  const { user: tmpUser, userNotes: tmpUserNotes } = populateUserWithNotes(
    10,
    Object.values(NoteTextField),
    {
      collabText: {
        recordsCount: 2,
        tailRevision: 0,
      },
      noteMany: {
        enumaratePublicIdByIndex: 0,
      },
    }
  );
  user = tmpUser;
  userNotes = tmpUserNotes;
  await populateWithCreatedData();

  contextValue = createGraphQLResolversContext(user);
});

it('returns last 2 notes, after: 7, first 4 => 8,9 (10 notes total)', async () => {
  const userNote7 = userNotes[7];
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
  const userNote6 = userNotes[6];
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
  const userNote6 = userNotes[6];
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
