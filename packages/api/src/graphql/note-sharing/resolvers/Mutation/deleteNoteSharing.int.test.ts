/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeEach, expect, it } from 'vitest';

import { CollectionName } from '../../../../mongodb/collections';
import { ShareNoteLinkSchema } from '../../../../mongodb/schema/share-note-link';
import { UserSchema } from '../../../../mongodb/schema/user';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note';
import { apolloServer } from '../../../../test/helpers/apollo-server';
import { createGraphQLResolversContext } from '../../../../test/helpers/graphql-context';
import { mongoCollections, resetDatabase } from '../../../../test/helpers/mongodb';
import {
  createShareNoteLink,
  createUser,
  populateNoteToUser,
  populateWithCreatedData,
} from '../../../../test/helpers/mongodb/populate';
import { GraphQLResolversContext } from '../../../context';
import { DeleteNoteSharingInput, NoteTextField } from '../../../types.generated';

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
let userNote: UserNoteSchema;
let shareNoteLink: ShareNoteLinkSchema;

beforeEach(async () => {
  faker.seed(843);
  await resetDatabase();

  user = createUser();

  const { userNote: tmpUserNote } = populateNoteToUser(
    user,
    Object.values(NoteTextField)
  );
  userNote = tmpUserNote;

  shareNoteLink = createShareNoteLink(userNote);

  await populateWithCreatedData();

  contextValue = createGraphQLResolversContext(user);
});

it('deletes all note sharings', async () => {
  const response = await apolloServer.executeOperation(
    {
      query: MUTATION,
      variables: {
        input: {
          contentId: userNote.note.publicId,
        } as DeleteNoteSharingInput,
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
    deleteNoteSharing: {
      note: {
        id: expect.any(String),
        sharing: null,
      },
    },
  });

  await expect(
    mongoCollections[CollectionName.SHARE_NOTE_LINKS].findOne({
      _id: shareNoteLink._id,
    })
  ).resolves.toBeNull();
});

// TODO create test: when sharing doesn't exist
// TODO create test: deletion is published
