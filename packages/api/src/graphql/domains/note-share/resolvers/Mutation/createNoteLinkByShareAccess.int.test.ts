/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';
import { assert, beforeEach, expect, it } from 'vitest';

import { apolloServer } from '../../../../../__tests__/helpers/graphql/apollo-server';
import {
  createGraphQLResolversContext,
  CreateGraphQLResolversContextOptions,
} from '../../../../../__tests__/helpers/graphql/graphql-context';
import { expectGraphQLResponseData } from '../../../../../__tests__/helpers/graphql/response';
import { mongoCollectionStats } from '../../../../../__tests__/helpers/mongodb/mongo-collection-stats';
import {
  mongoCollections,
  resetDatabase,
} from '../../../../../__tests__/helpers/mongodb/mongodb';
import { populateNotes } from '../../../../../__tests__/helpers/mongodb/populate/populate';
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

  otherUser = fakeUserPopulateQueue();

  const populateResult = populateNotes(1, {
    mapShareLink() {
      return {
        override: {
          permissions: {
            user: {
              readOnly: true,
            },
          },
        },
      };
    },
  });
  user = populateResult.user;
  note = populateResult.data[0]!.note;
  assert(populateResult.data[0]?.note.shareLinks?.[0] != null);
  shareNoteLink = populateResult.data[0].note.shareLinks[0];

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

// TODO create test: when sharing doesn't exist
// TODO create test: link is published as new note creation
