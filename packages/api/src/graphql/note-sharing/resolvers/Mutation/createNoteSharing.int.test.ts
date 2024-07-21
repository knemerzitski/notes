/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { faker } from '@faker-js/faker';
import { assert, beforeEach, expect, it } from 'vitest';

import { UserSchema } from '../../../../mongodb/schema/user';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note';
import { apolloServer } from '../../../../test/helpers/apollo-server';
import { createGraphQLResolversContext } from '../../../../test/helpers/graphql-context';
import { resetDatabase } from '../../../../test/helpers/mongodb/mongodb';
import { populateNotes } from '../../../../test/helpers/mongodb/populate/populate';
import { populateExecuteAll } from '../../../../test/helpers/mongodb/populate/populate-queue';
import { GraphQLResolversContext } from '../../../context';
import { CreateNoteSharingInput } from '../../../types.generated';

const MUTATION = `#graphql
  mutation($input: CreateNoteSharingInput!){
    createNoteSharing(input: $input) {
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
  userNote = populateResult.data[0].userNote;

  await populateExecuteAll();

  contextValue = createGraphQLResolversContext(user);
});

it('creates a new note sharing', async () => {
  const response = await apolloServer.executeOperation(
    {
      query: MUTATION,
      variables: {
        input: {
          contentId: userNote.note.publicId,
        } as CreateNoteSharingInput,
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
    createNoteSharing: {
      note: {
        id: expect.any(String),
        sharing: {
          id: expect.any(String),
        },
      },
    },
  });
});

// TODO create test: when sharing already exists
// TODO create test: sharing is published
