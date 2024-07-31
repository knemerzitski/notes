/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeAll, expect, it } from 'vitest';

import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import { createGraphQLResolversContext } from '../../../../__test__/helpers/graphql/graphql-context';
import { resetDatabase } from '../../../../__test__/helpers/mongodb/mongodb';
import { populateNotes } from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { GraphQLResolversContext } from '../../../context';
import { NoteCategory, NoteTextField } from '../../../types.generated';

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

const QUERY_CATEGORY = `#graphql
  query($contentId: String!){
    note(contentId: $contentId){
      categoryName
    }
  }
`;

let user: UserSchema;
let note: NoteSchema;
let noteArchive: NoteSchema;
let contextValue: GraphQLResolversContext;

beforeAll(async () => {
  faker.seed(5435);
  await resetDatabase();

  const populateResult = populateNotes(2, {
    collabText() {
      return {
        recordsCount: 2,
      };
    },
    userNote(noteIndex) {
      if (noteIndex === 1) {
        return {
          override: {
            category: {
              name: NoteCategory.ARCHIVE,
            },
          },
        };
      }
      return;
    },
  });

  assert(populateResult.data[0] != null);
  assert(populateResult.data[1] != null);

  user = populateResult.user;
  note = populateResult.data[0].note;
  noteArchive = populateResult.data[1].note;

  await populateExecuteAll();

  contextValue = createGraphQLResolversContext(user);
});

it('returns note', async () => {
  const response = await apolloServer.executeOperation(
    {
      query: QUERY,
      variables: {
        contentId: note.publicId,
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
  const response = await apolloServer.executeOperation(
    {
      query: QUERY,
      variables: {
        contentId: note.publicId,
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

it('returns note category', async () => {
  const response = await apolloServer.executeOperation(
    {
      query: QUERY_CATEGORY,
      variables: {
        contentId: noteArchive.publicId,
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
      categoryName: NoteCategory.ARCHIVE,
    },
  });
});
