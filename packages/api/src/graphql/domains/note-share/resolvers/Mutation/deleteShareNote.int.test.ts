import { faker } from '@faker-js/faker';
import { assert, beforeEach, expect, it } from 'vitest';

import { apolloServer } from '../../../../../__tests__/helpers/graphql/apollo-server';
import {
  createGraphQLResolversContext,
  CreateGraphQLResolversContextOptions,
} from '../../../../../__tests__/helpers/graphql/graphql-context';
import { expectGraphQLResponseData } from '../../../../../__tests__/helpers/graphql/response';
import {
  mongoCollections,
  mongoCollectionStats,
  resetDatabase,
} from '../../../../../__tests__/helpers/mongodb/mongodb';
import { populateNotes } from '../../../../../__tests__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { DBNoteSchema } from '../../../../../mongodb/schema/note';
import { ShareNoteLinkSchema } from '../../../../../mongodb/schema/share-note-link';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { DeleteShareNoteInput, DeleteShareNotePayload } from '../../../types.generated';

const MUTATION = `#graphql
  mutation($input: DeleteShareNoteInput!){
    deleteShareNote(input: $input) {
      shareAccessId
      note {
        id
      }
    }
  }
`;

let user: DBUserSchema;
let note: DBNoteSchema;
let shareNoteLink: ShareNoteLinkSchema;

beforeEach(async () => {
  faker.seed(843);
  await resetDatabase();

  const populateResult = populateNotes(1);
  user = populateResult.user;
  assert(populateResult.data[0]?.note.shareLinks?.[0] != null);
  note = populateResult.data[0].note;
  shareNoteLink = populateResult.data[0].note.shareLinks[0];

  await populateExecuteAll();

  mongoCollectionStats.mockClear();
});

async function executeOperation(
  input?: DeleteShareNoteInput,
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      shareNote: DeleteShareNotePayload;
    },
    { input?: DeleteShareNoteInput }
  >(
    {
      query,
      variables: {
        input,
      },
    },
    {
      contextValue: createGraphQLResolversContext(options),
    }
  );
}

it('deletes all note share links', async () => {
  const response = await executeOperation(
    {
      noteId: note._id,
    },
    {
      user,
    }
  );

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    deleteShareNote: {
      shareAccessId: objectIdToStr(shareNoteLink._id),
      note: {
        id: objectIdToStr(note._id),
      },
    },
  });

  expect(mongoCollectionStats.readAndModifyCount()).toStrictEqual(2);

  const dbNote = await mongoCollections.notes.findOne({
    _id: note._id,
  });
  expect(dbNote?.shareLinks).toBeUndefined();
});

// TODO create test: when sharing doesn't exist
// TODO create test: deletion is published
