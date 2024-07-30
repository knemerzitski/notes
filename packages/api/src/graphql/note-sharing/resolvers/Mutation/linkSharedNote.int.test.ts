/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeEach, expect, it } from 'vitest';

import { apolloServer } from '../../../../__test__/helpers/graphql/apollo-server';
import { createGraphQLResolversContext } from '../../../../__test__/helpers/graphql/graphql-context';
import { resetDatabase } from '../../../../__test__/helpers/mongodb/mongodb';
import { populateNotes } from '../../../../__test__/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../__test__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../__test__/helpers/mongodb/populate/user';
import { ShareNoteLinkSchema } from '../../../../mongodb/schema/note/share-note-link';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { GraphQLResolversContext } from '../../../context';
import { LinkSharedNoteInput, LinkSharedNotePayload } from '../../../types.generated';

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
let otherUser: UserSchema;
let shareNoteLink: ShareNoteLinkSchema;

beforeEach(async () => {
  faker.seed(843);
  await resetDatabase();

  otherUser = fakeUserPopulateQueue();

  const populateResult = populateNotes(1);
  assert(populateResult.data[0]?.note.shareNoteLinks[0] != null);
  shareNoteLink = populateResult.data[0].note.shareNoteLinks[0];

  await populateExecuteAll();

  contextValue = createGraphQLResolversContext(otherUser);
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
  expect(errors, JSON.stringify(errors, null, 2)).toBeUndefined();
  expect(data).toEqual({
    linkSharedNote: {
      note: {
        id: expect.any(String),
        contentId: expect.any(String),
        isOwner: false,
        textFields: [
          { key: 'CONTENT', value: { headText: { revision: expect.any(Number) } } },
        ],
        sharing: {
          id: expect.any(String),
        },
      },
    },
  });

  // Executing again returns same UserNote
  const response2 = await apolloServer.executeOperation(
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

  assert(response2.body.kind === 'single');
  const { data: data2, errors: errors2 } = response2.body.singleResult;
  expect(errors2).toBeUndefined();
  expect(
    (data2 as { linkSharedNote: LinkSharedNotePayload }).linkSharedNote.note.id
  ).toEqual((data as { linkSharedNote: LinkSharedNotePayload }).linkSharedNote.note.id);
});

// TODO create test: when sharing doesn't exist
// TODO create test: link is published as new note creation
