/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeEach, expect, it } from 'vitest';

import { CollectionName } from '../../../../mongodb/collections';
import { ShareNoteLinkSchema } from '../../../../mongodb/schema/share-note-link';
import { UserSchema } from '../../../../mongodb/schema/user';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note';
import { apolloServer } from '../../../../test/helpers/graphql/apollo-server';
import { createGraphQLResolversContext } from '../../../../test/helpers/graphql/graphql-context';
import {
  mongoCollections,
  resetDatabase,
} from '../../../../test/helpers/mongodb/mongodb';
import { populateNotes } from '../../../../test/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../test/helpers/mongodb/populate/populate-queue';
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
let userNote: UserNoteSchema;
let shareNoteLink: ShareNoteLinkSchema;

beforeEach(async () => {
  faker.seed(843);
  await resetDatabase();

  const populateResult = populateNotes(1);
  user = populateResult.user;
  assert(populateResult.data[0] != null);
  userNote = populateResult.data[0].userNote;
  shareNoteLink = populateResult.data[0].shareNoteLink;

  contextValue = createGraphQLResolversContext(user);

  await populateExecuteAll();
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
    mongoCollections[CollectionName.SHARE_NOTE_LINKS].findOne({
      _id: shareNoteLink._id,
    })
  ).resolves.toBeNull();
});

// TODO create test: when sharing doesn't exist
// TODO create test: deletion is published
