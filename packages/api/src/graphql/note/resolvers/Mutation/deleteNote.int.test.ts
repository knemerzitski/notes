/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeEach, describe, expect, it } from 'vitest';

import { Subscription } from '~lambda-graphql/dynamodb/models/subscription';

import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import {
  createPublisher,
  createGraphQLResolversContext,
  mockSocketApi,
  mockSubscriptionsModel,
} from '../../../../__test__/helpers/graphql/graphql-context';
import {
  mongoCollections,
  resetDatabase,
} from '../../../../__test__/helpers/mongodb/mongodb';
import {
  populateAddNoteToUser,
  populateNotes,
} from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../__test__/helpers/mongodb/populate/user';
import { CollectionName } from '../../../../mongodb/collections';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { DeleteNoteInput, NoteDeletedInput } from '../../../types.generated';

const MUTATION = `#graphql
  mutation($input: DeleteNoteInput!){
    deleteNote(input: $input) {
      deleted
    }
  }
`;

let populateResult: ReturnType<typeof populateNotes>;

let userOwner: UserSchema;
let userOther: UserSchema;

let note: NoteSchema;

beforeEach(async () => {
  faker.seed(778);
  await resetDatabase();

  populateResult = populateNotes(1);

  userOwner = populateResult.user;
  const firstNote = populateResult.data[0]?.note;
  assert(firstNote != null);
  note = firstNote;

  userOther = fakeUserPopulateQueue();

  await populateExecuteAll();
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
      mongoCollections[CollectionName.NOTES].findOne({
        publicId: note.publicId,
      }),
      'Note should be deleted'
    ).resolves.toBeNull();
  });

  it('unlinks note if not owner', async () => {
    populateAddNoteToUser(userOther, note);
    await populateExecuteAll();

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
      mongoCollections[CollectionName.NOTES].findOne({
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
          createPublisher,
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
