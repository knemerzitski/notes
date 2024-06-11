/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { assert, beforeEach, expect, it } from 'vitest';
import { UserSchema } from '../../../../mongodb/schema/user';
import { resetDatabase } from '../../../../test/helpers/mongodb';
import { GraphQLResolversContext } from '../../../context';
import { faker } from '@faker-js/faker';
import {
  createShareNoteLink,
  createUser,
  populateNoteToUser,
  populateWithCreatedData,
} from '../../../../test/helpers/mongodb/populate';
import { LinkSharedNoteInput, NoteTextField } from '../../../types.generated';
import { apolloServer } from '../../../../test/helpers/apollo-server';

import { createGraphQLResolversContext } from '../../../../test/helpers/graphql-context';
import { ShareNoteLinkSchema } from '../../../../mongodb/schema/share-note-link';

const MUTATION = `#graphql
  mutation($input: LinkSharedNoteInput!){
    linkSharedNote(input: $input) {
      note {
        id
        contentId
        isOwner
        textFields(name: CONTENT) {
          key
          value {
            headText {
              revision
            }
          }
        }
        sharing {
          id
        }
      }
    }
  }
`;

let contextValue: GraphQLResolversContext;
let user: UserSchema;
let shareNoteLink: ShareNoteLinkSchema;

beforeEach(async () => {
  faker.seed(843);
  await resetDatabase();

  const ownerUser = createUser();
  user = createUser();

  const { userNote } = populateNoteToUser(ownerUser, Object.values(NoteTextField));
  shareNoteLink = createShareNoteLink(userNote);

  await populateWithCreatedData();

  contextValue = createGraphQLResolversContext(user);
});

it('links existing note and creates UserNote with access to note', async () => {
  const response = await apolloServer.executeOperation(
    {
      query: MUTATION,
      variables: {
        input: {
          shareId: shareNoteLink.publicId,
        } as LinkSharedNoteInput,
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
    linkSharedNote: {
      note: {
        id: expect.any(String),
        contentId: expect.any(String),
        isOwner: false,
        textFields: [
          { key: 'CONTENT', value: { headText: { revision: expect.any(Number) } } },
        ],
        sharing: null,
      },
    },
  });
});

// TODO create test: when sharing doesn't exist
// TODO create test: link is published as new note creation
