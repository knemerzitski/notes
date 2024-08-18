/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeEach, expect, it } from 'vitest';

import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import { createGraphQLResolversContext } from '../../../../__test__/helpers/graphql/graphql-context';
import {
  mongoCollections,
  resetDatabase,
} from '../../../../__test__/helpers/mongodb/mongodb';
import { populateNotes } from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { ShareNoteLinkSchema } from '../../../../mongodb/schema/note/share-note-link';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { GraphQLResolversContext } from '../../../context';
import { DeleteNoteSharingInput } from '../../../types.generated';

const MUTATION = `#graphql
  mutation($input: DeleteNoteSharingInput!){
    deleteNoteSharing(input: $input) {
      note {
        id
        sharing {
          id
        }
      }
    }
  }
`;

let contextValue: GraphQLResolversContext;
let user: UserSchema;
let note: NoteSchema;
let shareNoteLink: ShareNoteLinkSchema;

beforeEach(async () => {
  faker.seed(843);
  await resetDatabase();

  const populateResult = populateNotes(1);
  user = populateResult.user;
  assert(populateResult.data[0]?.note.shareNoteLinks?.[0] != null);
  note = populateResult.data[0].note;
  shareNoteLink = populateResult.data[0].note.shareNoteLinks[0];

  contextValue = createGraphQLResolversContext({ user });

  await populateExecuteAll();
});

it('deletes all note sharings', async () => {
  await expect(
    mongoCollections.notes.findOne({
      'shareNoteLinks.publicId': shareNoteLink.publicId,
    })
  ).resolves.not.toBeNull();

  const response = await apolloServer.executeOperation(
    {
      query: MUTATION,
      variables: {
        input: {
          contentId: note.publicId,
        } as DeleteNoteSharingInput,
      },
    },
    {
      contextValue,
    }
  );

  assert(response.body.kind === 'single');
  const { data, errors } = response.body.singleResult;
  expect(errors, JSON.stringify(errors, null, 2)).toBeUndefined();
  expect(data).toEqual({
    deleteNoteSharing: {
      note: {
        id: expect.any(String),
        sharing: null,
      },
    },
  });

  await expect(
    mongoCollections.notes.findOne({
      'shareNoteLinks.publicId': shareNoteLink.publicId,
    })
  ).resolves.toBeNull();
});

// TODO create test: when sharing doesn't exist
// TODO create test: deletion is published
