/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeAll, expect, it } from 'vitest';

import { resetDatabase } from '../../../../test/helpers/mongodb';
import { GraphQLResolversContext } from '../../../context';

import { apolloServer } from '../../../../test/helpers/apollo-server';
import { UserSchema } from '../../../../mongodb/schema/user';
import {
  populateUserWithNotes,
  populateWithCreatedData,
} from '../../../../test/helpers/mongodb/populate';
import { NoteTextField } from '../../../types.generated';

import { NoteSchema } from '../../../../mongodb/schema/note';
import { createGraphQLResolversContext } from '../../../../test/helpers/graphql-context';

const QUERY = `#graphql
  query($contentId: String!, $recordsLast: PositiveInt, $fieldName: NoteTextField){
    note(contentId: $contentId){
      textFields(name: $fieldName) {
        key
        value {
          headText {
            revision
            changeset
          }
          recordsConnection(last: $recordsLast) {
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
`;

let notes: NoteSchema[];
let user: UserSchema;
let contextValue: GraphQLResolversContext;

beforeAll(async () => {
  faker.seed(5435);
  await resetDatabase();

  const { notes: tmpNotes, user: tmpUser } = populateUserWithNotes(
    2,
    Object.values(NoteTextField),
    {
      collabText: {
        recordsCount: 2,
        tailRevision: 0,
      },
    }
  );
  notes = tmpNotes;
  user = tmpUser;
  await populateWithCreatedData();

  contextValue = createGraphQLResolversContext(user);
});

it('returns note', async () => {
  const firstNote = notes[0];
  assert(firstNote != null);

  const response = await apolloServer.executeOperation(
    {
      query: QUERY,
      variables: {
        contentId: firstNote.publicId,
        recordsLast: 2,
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
    note: {
      textFields: [
        {
          key: 'CONTENT',
          value: {
            headText: {
              revision: expect.any(Number),
              changeset: expect.any(Array),
            },
            recordsConnection: {
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
        {
          key: 'TITLE',
          value: {
            headText: {
              revision: expect.any(Number),
              changeset: expect.any(Array),
            },
            recordsConnection: {
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
      ],
    },
  });
});

it('returns only specified textField', async () => {
  const firstNote = notes[0];
  assert(firstNote != null);

  const response = await apolloServer.executeOperation(
    {
      query: QUERY,
      variables: {
        contentId: firstNote.publicId,
        recordsLast: 2,
        fieldName: NoteTextField.TITLE,
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
    note: {
      textFields: [
        {
          key: 'TITLE',
          value: {
            headText: {
              revision: expect.any(Number),
              changeset: expect.any(Array),
            },
            recordsConnection: {
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
      ],
    },
  });
});

it('returns one note not found error', async () => {
  const firstNote = notes[0];
  assert(firstNote != null);

  const response = await apolloServer.executeOperation(
    {
      query: QUERY,
      variables: {
        contentId: 'never',
        recordsLast: 3,
      },
    },
    {
      contextValue,
    }
  );

  assert(response.body.kind === 'single');
  const { errors } = response.body.singleResult;
  expect(errors?.length).toStrictEqual(1);
  expect(errors?.[0]?.message).toEqual(expect.stringMatching(/Note '.+' not found/));
});
