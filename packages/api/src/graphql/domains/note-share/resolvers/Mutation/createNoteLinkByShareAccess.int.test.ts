 
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { assert, beforeEach, expect, it } from 'vitest';

import { apolloServer } from '../../../../../__tests__/helpers/graphql/apollo-server';
import {
  createGraphQLResolversContext,
  CreateGraphQLResolversContextOptions,
} from '../../../../../__tests__/helpers/graphql/graphql-context';
import {
  expectGraphQLResponseData,
  expectGraphQLResponseError,
} from '../../../../../__tests__/helpers/graphql/response';
import {
  mongoCollections,
  resetDatabase,
  mongoCollectionStats,
} from '../../../../../__tests__/helpers/mongodb/instance';
import { fakeNotePopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/note';
import { userAddNote } from '../../../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/user';
import { DBNoteSchema } from '../../../../../mongodb/schema/note';
import { ShareNoteLinkSchema } from '../../../../../mongodb/schema/share-note-link';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import { UserNoteLink_id } from '../../../../../services/note/user-note-link-id';
import {
  CreateNoteLinkByShareAccessInput,
  CreateNoteLinkByShareAccessPayload,
  NoteCategory,
} from '../../../types.generated';

const MUTATION = `#graphql
  mutation($input: CreateNoteLinkByShareAccessInput!){
    createNoteLinkByShareAccess(input: $input) {
      userNoteLink {
        id
        categoryName
        note {
          users {
            id
          }
        }
      }
    }
  }
`;

let note: DBNoteSchema;
let user: DBUserSchema;
let otherUser: DBUserSchema;
let shareNoteLink: ShareNoteLinkSchema;

beforeEach(async () => {
  faker.seed(843);
  await resetDatabase();

  user = fakeUserPopulateQueue();
  otherUser = fakeUserPopulateQueue();

  ({ note } = fakeNotePopulateQueue(user, {
    override: {
      shareLinks: [
        {
          permissions: {
            user: {
              readOnly: true,
            },
          },
        },
      ],
    },
  }));
  userAddNote(user, note);

  assert(note.shareLinks?.[0] != null);
  shareNoteLink = note.shareLinks[0];

  await populateExecuteAll();

  mongoCollectionStats.mockClear();
});

async function executeOperation(
  input: Omit<CreateNoteLinkByShareAccessInput, 'authUser'>,
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      createNoteLinkByShareAccess: CreateNoteLinkByShareAccessPayload;
    },
    { input?: CreateNoteLinkByShareAccessInput }
  >(
    {
      query,
      variables: {
        input: {
          ...input,
          authUser: {
            id: options?.user?._id ?? new ObjectId(),
          },
        },
      },
    },
    {
      contextValue: createGraphQLResolversContext(options),
    }
  );
}

it('links existing note and creates UserNote with access to note', async () => {
  const response = await executeOperation(
    {
      shareAccessId: shareNoteLink._id,
    },
    {
      user: otherUser,
    }
  );

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    createNoteLinkByShareAccess: {
      userNoteLink: {
        id: UserNoteLink_id(note._id, otherUser._id),
        categoryName: NoteCategory.DEFAULT,
        note: {
          users: [
            {
              id: UserNoteLink_id(note._id, user._id),
            },
            {
              id: UserNoteLink_id(note._id, otherUser._id),
            },
          ],
        },
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(3);

  // Database, User
  const dbUser = await mongoCollections.users.findOne({
    _id: otherUser._id,
  });

  expect(dbUser).toStrictEqual(
    expect.objectContaining({
      note: {
        categories: {
          [NoteCategory.DEFAULT]: {
            noteIds: [note._id],
          },
        },
      },
    })
  );

  // Database, Note
  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  expect(dbNote).toStrictEqual(
    expect.objectContaining({
      _id: note._id,
      users: expect.arrayContaining([
        {
          _id: otherUser._id,
          categoryName: NoteCategory.DEFAULT,
          createdAt: expect.any(Date),
          readOnly: true,
        },
      ]),
    })
  );
});

it('throws error on invalid access id', async () => {
  const response = await executeOperation(
    {
      shareAccessId: new ObjectId(),
    },
    {
      user: otherUser,
    }
  );

  expectGraphQLResponseError(response, 'Note not found');
});

it('throws users count limit reached', async () => {
  const response = await executeOperation(
    {
      shareAccessId: shareNoteLink._id,
    },
    {
      user: otherUser,
      override: {
        options: {
          note: {
            maxUsersCount: 1,
          },
        },
      },
    }
  );

  expectGraphQLResponseError(response, 'Users count limit reached');
});

// TODO create test: link is published as new note creation
