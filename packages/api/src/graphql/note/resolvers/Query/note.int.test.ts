/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeAll, expect, it } from 'vitest';

import { mongoCollections, resetDatabase } from '../../../../test/helpers/mongodb';
import { GraphQLResolversContext } from '../../../context';

import { apolloServer } from '../../../../test/helpers/apollo-server';
import { UserSchema } from '../../../../mongodb/schema/user';
import { CollectionName } from '../../../../mongodb/collections';
import NotesDataSource from '../../datasource/notes-datasource';
import {
  createUserWithNotes,
  populateWithCreatedData,
} from '../../../../test/helpers/mongodb/populate';
import { NoteTextField } from '../../../types.generated';

import { NoteSchema } from '../../../../mongodb/schema/note';

const QUERY = `#graphql
  query($noteId: String!, $recordsLast: PositiveInt){
    note(noteId: $noteId){
      textFields {
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

function createUserContext(user: UserSchema): GraphQLResolversContext {
  return {
    auth: {
      session: {
        user: {
          _id: user._id,
        },
      },
    },
    datasources: {
      notes: new NotesDataSource({
        mongodb: {
          collections: {
            [CollectionName.Users]: mongoCollections[CollectionName.Users],
            [CollectionName.UserNotes]: mongoCollections[CollectionName.UserNotes],
            [CollectionName.Notes]: mongoCollections[CollectionName.Notes],
            [CollectionName.CollabTexts]: mongoCollections[CollectionName.CollabTexts],
          },
        },
      }),
    },
  } as GraphQLResolversContext;
}

let notes: NoteSchema[];
let user: UserSchema;
let contextValue: GraphQLResolversContext;

beforeAll(async () => {
  faker.seed(5435);
  await resetDatabase();

  const { notes: tmpNotes, user: tmpUser } = createUserWithNotes(
    2,
    Object.values(NoteTextField),
    {
      collabDoc: {
        recordsCount: 2,
        tailRevision: -1,
      },
    }
  );
  notes = tmpNotes;
  user = tmpUser;
  await populateWithCreatedData();

  contextValue = createUserContext(user);
});

it('returns note', async () => {
  const firstNote = notes[0];
  assert(firstNote != null);

  const response = await apolloServer.executeOperation(
    {
      query: QUERY,
      variables: {
        noteId: firstNote.publicId,
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

it('returns one note not found error', async () => {
  const firstNote = notes[0];
  assert(firstNote != null);

  const response = await apolloServer.executeOperation(
    {
      query: QUERY,
      variables: {
        noteId: 'never',
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
