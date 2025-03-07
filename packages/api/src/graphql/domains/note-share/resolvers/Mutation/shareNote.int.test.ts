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
import {
  mongoCollections,
  resetDatabase,
 mongoCollectionStats } from '../../../../../__tests__/helpers/mongodb/instance';
import { populateNotes } from '../../../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { DBNoteSchema } from '../../../../../mongodb/schema/note';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { ShareNoteInput, ShareNotePayload } from '../../../types.generated';

const MUTATION = `#graphql
  mutation($input: ShareNoteInput!){
    shareNote(input: $input) {
      shareAccess {
        id
        readOnly
      }
      note {
        id
      }
    }
  }
`;

let user: DBUserSchema;
let note: DBNoteSchema;

beforeEach(async () => {
  faker.seed(843);
  await resetDatabase();

  const populateResult = populateNotes(1, {
    skipInsert: {
      shareNoteLink: true,
    },
  });
  user = populateResult.user;
  assert(populateResult.data[0] != null);
  note = populateResult.data[0].note;

  await populateExecuteAll();

  mongoCollectionStats.mockClear();
});

async function executeOperation(
  input: Omit<ShareNoteInput, 'note' | 'authUser'> & {
    noteId: ObjectId;
  },
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      shareNote: ShareNotePayload;
    },
    { input?: ShareNoteInput }
  >(
    {
      query,
      variables: {
        input: {
          authUser: {
            id: options?.user?._id ?? new ObjectId(),
          },
          note: {
            id: input.noteId,
          },
          readOnly: input.readOnly,
        },
      },
    },
    {
      contextValue: createGraphQLResolversContext(options),
    }
  );
}

it('creates new note sharing', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
      readOnly: false,
    },
    {
      user,
    }
  );

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    shareNote: {
      shareAccess: {
        id: expect.any(String),
        readOnly: false,
      },
      note: {
        id: objectIdToStr(note._id),
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  expect(dbNote).toStrictEqual(
    expect.objectContaining({
      _id: note._id,
      shareLinks: [
        {
          _id: expect.any(ObjectId),
          creatorUserId: user._id,
          permissions: {
            user: {
              readOnly: false,
            },
          },
        },
      ],
    })
  );
});

// TODO create test: when sharing already exists
// TODO create test: sharing is published
