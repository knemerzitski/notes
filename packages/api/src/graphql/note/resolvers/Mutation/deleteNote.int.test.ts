/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeEach, describe, expect, it } from 'vitest';
import { Subscription } from '~lambda-graphql/dynamodb/models/subscription';

import { CollectionName } from '../../../../mongodb/collections';
import { NoteSchema } from '../../../../mongodb/schema/note';
import { UserSchema } from '../../../../mongodb/schema/user';
import { apolloServer } from '../../../../test/helpers/apollo-server';
import {
  createPublisher,
  createGraphQLResolversContext,
  mockSocketApi,
  mockSubscriptionsModel,
} from '../../../../test/helpers/graphql-context';
import { mongoCollections, resetDatabase } from '../../../../test/helpers/mongodb';
import {
  addExistingNoteToExistingUser,
  createUser,
  populateUserWithNotes,
  populateWithCreatedData,
} from '../../../../test/helpers/mongodb/populate';
import {
  DeleteNoteInput,
  NoteDeletedInput,
  NoteTextField,
} from '../../../types.generated';



const MUTATION = `#graphql
  mutation($input: DeleteNoteInput!){
    deleteNote(input: $input) {
      deleted
    }
  }
`;

let userOwner: UserSchema;
let userOther: UserSchema;
let note: NoteSchema;

beforeEach(async () => {
  faker.seed(778);
  await resetDatabase();

  const { notes: tmpNotes, user: tmpUser } = populateUserWithNotes(
    1,
    Object.values(NoteTextField),
    {
      collabText: {
        recordsCount: 1,
        tailRevision: 0,
      },
      noteMany: {
        enumaratePublicIdByIndex: 0,
      },
    }
  );

  userOwner = tmpUser;
  assert(tmpNotes[0] != null);
  note = tmpNotes[0];

  userOther = createUser();

  await populateWithCreatedData();
});

describe('delete', () => {
  it('deletes everything for note as owner', async () => {
    const response = await apolloServer.executeOperation(
      {
        query: MUTATION,
        variables: {
          input: {
            contentId: note.publicId,
          } as DeleteNoteInput,
        },
      },
      {
        contextValue: createGraphQLResolversContext(userOwner),
      }
    );

    assert(response.body.kind === 'single');
    const { data, errors } = response.body.singleResult;
    expect(errors).toBeUndefined();
    expect(data).toEqual({
      deleteNote: {
        deleted: true,
      },
    });

    await expect(
      mongoCollections[CollectionName.Notes].findOne({
        publicId: note.publicId,
      }),
      'Note should be deleted'
    ).resolves.toBeNull();
  });

  it('unlinks note if not owner', async () => {
    addExistingNoteToExistingUser(userOther, note);
    await populateWithCreatedData();

    const response = await apolloServer.executeOperation(
      {
        query: MUTATION,
        variables: {
          input: {
            contentId: note.publicId,
          } as DeleteNoteInput,
        },
      },
      {
        contextValue: createGraphQLResolversContext(userOther),
      }
    );

    assert(response.body.kind === 'single');
    const { data, errors } = response.body.singleResult;
    expect(errors).toBeUndefined();
    expect(data).toEqual({
      deleteNote: {
        deleted: true,
      },
    });

    await expect(
      mongoCollections[CollectionName.Notes].findOne({
        publicId: note.publicId,
      }),
      'Note should not be deleted'
    ).resolves.not.toBeNull();
  });

  it('throws error if user has no UserNote document', async () => {
    const response = await apolloServer.executeOperation(
      {
        query: MUTATION,
        variables: {
          input: {
            contentId: note.publicId,
          } as DeleteNoteInput,
        },
      },
      {
        contextValue: createGraphQLResolversContext(userOther),
      }
    );

    assert(response.body.kind === 'single');
    const { errors } = response.body.singleResult;
    expect(errors?.length).toStrictEqual(1);
    expect(errors?.[0]?.message).toEqual(expect.stringMatching(/Note '.+' not found/));
  });
});

describe('publish', () => {
  const SUBSCRIPTION = `#graphql
    subscription($input: NoteDeletedInput!) {
      noteDeleted(input: $input) {
        contentId
      }
    }
  `;

  it('publishes deletion of own note', async () => {
    mockSubscriptionsModel.queryAllByTopic.mockResolvedValueOnce([
      {
        subscription: {
          query: SUBSCRIPTION,
          variables: {
            input: {
              contentId: note.publicId,
            } as NoteDeletedInput,
          },
        },
      } as unknown as Subscription,
    ]);

    await apolloServer.executeOperation(
      {
        query: MUTATION,
        variables: {
          input: {
            contentId: note.publicId,
          } as DeleteNoteInput,
        },
      },
      {
        contextValue: createGraphQLResolversContext(userOwner, {
          createPublisher
        }),
      }
    );

    expect(mockSocketApi.post.mock.lastCall).toEqual([
      {
        message: {
          type: 'next',
          payload: {
            data: {
              noteDeleted: {
                contentId: note.publicId,
              },
            },
          },
        },
      },
    ]);
  });
});
