/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { beforeAll, beforeEach, expect, it } from 'vitest';

import { apolloServer } from '../../../../__tests__/helpers/graphql/apollo-server';
import {
  createGraphQLResolversContext,
  CreateGraphQLResolversContextOptions,
} from '../../../../__tests__/helpers/graphql/graphql-context';
import { expectGraphQLResponseData } from '../../../../__tests__/helpers/graphql/response';
import {
  mongoCollectionStats,
  resetDatabase,
} from '../../../../__tests__/helpers/mongodb/mongodb';
import { fakeNotePopulateQueue } from '../../../../__tests__/helpers/mongodb/populate/note';
import { userAddNote } from '../../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeSessionPopulateQueue } from '../../../../__tests__/helpers/mongodb/populate/session';
import { fakeUserPopulateQueue } from '../../../../__tests__/helpers/mongodb/populate/user';
import { DBNoteSchema } from '../../../../mongodb/schema/note';
import { DBSessionSchema } from '../../../../mongodb/schema/session';
import { DBUserSchema } from '../../../../mongodb/schema/user';
import { UserNoteLink } from '../../types.generated';

interface Variables {
  userId: ObjectId;
  noteId: ObjectId;
  recordsLast?: number;
}

const QUERY = `#graphql
  query($userId: ObjectID!, $noteId: ObjectID!, $recordsLast: PositiveInt){
    signedInUser(by: {id: $userId}) {
      noteLink(by: {noteId: $noteId}){
        note {
          collabText {
            headText {
              revision
              changeset
            }
            recordConnection(last: $recordsLast) {
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
  }
`;

let user: DBUserSchema;
let session: DBSessionSchema;
let note: DBNoteSchema;

beforeAll(async () => {
  faker.seed(5435);
  await resetDatabase();

  user = fakeUserPopulateQueue();
  note = fakeNotePopulateQueue(user, {
    collabText: {
      recordsCount: 2,
    },
  });
  userAddNote(user, note);

  session = fakeSessionPopulateQueue({
    override: {
      userId: user._id,
    },
  });

  await populateExecuteAll();
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
      userNoteLink: UserNoteLink;
    },
    Variables
  >(
    {
      query,
      variables,
    },
    {
      contextValue: createGraphQLResolversContext(options),
    }
  );
}

it('returns note', async () => {
  const response = await executeOperation(
    {
      userId: user._id,
      noteId: note._id,
      recordsLast: 2,
    },
    { user, session }
  );

  const data = expectGraphQLResponseData(response);

  // Response
  expect(data).toEqual({
    signedInUser: {
      noteLink: {
        note: {
          collabText: {
            headText: {
              revision: expect.any(Number),
              changeset: expect.any(Array),
            },
            recordConnection: {
              edges: [
                {
                  node: {
                    change: {
                      revision: expect.any(Number),
                    },
                  },
                },
                {
                  node: {
                    change: {
                      revision: expect.any(Number),
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
  });

  expect(mongoCollectionStats.allStats()).toStrictEqual(
    expect.objectContaining({
      readAndModifyCount: 2,
      readCount: 2,
    })
  );
});
