/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeAll, expect, it } from 'vitest';

import { NoteSchema } from '../../../../mongodb/schema/note';
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

let notes: NoteSchema[];
let user: UserSchema;
let userNoteCategoryArchive: UserNoteSchema;
let contextValue: GraphQLResolversContext;

beforeAll(async () => {
  faker.seed(5435);
  await resetDatabase();

  ({ notes, user } = populateUserWithNotes(2, Object.values(NoteTextField), {
    collabText: {
      recordsCount: 2,
      tailRevision: 0,
    },
  }));
  const { userNotes: userNotesArchive } = populateUserWithNotes(
    1,
    Object.values(NoteTextField),
    {
      user,
      collabText: {
        recordsCount: 2,
        tailRevision: 0,
      },
      userNote: {
        categoryName: NoteCategory.ARCHIVE,
      },
    }
  );
  assert(userNotesArchive[0] != null);
  userNoteCategoryArchive = userNotesArchive[0];

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

it('returns note category', async () => {
  const response = await apolloServer.executeOperation(
    {
      query: QUERY_CATEGORY,
      variables: {
        contentId: userNoteCategoryArchive.note.publicId,
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
