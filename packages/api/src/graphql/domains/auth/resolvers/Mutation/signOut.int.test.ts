import { faker } from '@faker-js/faker';
import { beforeEach, expect, it, vi } from 'vitest';

import { apolloServer } from '../../../../../__tests__/helpers/graphql/apollo-server';
import {
  CreateGraphQLResolversContextOptions,
  createGraphQLResolversContext,
} from '../../../../../__tests__/helpers/graphql/graphql-context';
import { expectGraphQLResponseData } from '../../../../../__tests__/helpers/graphql/response';
import { mongoCollectionStats } from '../../../../../__tests__/helpers/mongodb/mongo-collection-stats';
import {
  resetDatabase,
} from '../../../../../__tests__/helpers/mongodb/mongodb';
import { populateExecuteAll } from '../../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeSessionPopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/session';
import { fakeUserPopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/user';
import { DBSessionSchema } from '../../../../../mongodb/schema/session';
import { DBUserSchema } from '../../../../../mongodb/schema/user';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { Cookies } from '../../../../../services/http/cookies';
import { SessionsCookie } from '../../../../../services/http/sessions-cookie';
import { SignOutInput, SignOutPayload } from '../../../types.generated';

interface Variables {
  input: SignOutInput;
}

const MUTATION = `#graphql
  mutation SignOut($input: SignOutInput!) {
    signOut(input: $input) {
      signedOutUserIds
      availableUsers {
        id
      }
    }
  }
`;

let user: DBUserSchema;
let session: DBSessionSchema;

beforeEach(async () => {
  faker.seed(7657);
  await resetDatabase();

  user = fakeUserPopulateQueue();

  session = fakeSessionPopulateQueue({
    override: {
      userId: user._id,
    },
  });

  await populateExecuteAll();

  mongoCollectionStats.mockClear();
});

async function executeOperation(
  input: Variables['input'],
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  const response = await apolloServer.executeOperation<
    {
      signOut: SignOutPayload;
    },
    Variables
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

  return response;
}

it('signs out specific user', async () => {
  const cookies = new Cookies();
  const sessionsCookie = new SessionsCookie({
    cookies,
  });
  sessionsCookie.update(user._id, session.cookieId);

  const context = createGraphQLResolversContext({
    sessionsCookie,
  });

  const removeUserSpy = vi.spyOn(context.services.auth, 'removeUser');

  const response = await executeOperation(
    {
      user: {
        id: user._id,
      },
    },
    {
      contextValue: context,
    }
  );

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    signOut: {
      signedOutUserIds: [objectIdToStr(user._id)],
      availableUsers: [],
    },
  });

  expect(removeUserSpy).toHaveBeenCalledWith(user._id);
});

it('signs out all users', async () => {
  const cookies = new Cookies();
  const sessionsCookie = new SessionsCookie({
    cookies,
  });

  sessionsCookie.update(user._id, session.cookieId);

  const context = createGraphQLResolversContext({
    sessionsCookie,
  });

  await context.services.auth.addUser(user._id);

  const clearAllUsersSpy = vi.spyOn(context.services.auth, 'clearAllUsers');

  const response = await executeOperation(
    {
      allUsers: true,
    },
    {
      contextValue: context,
    }
  );

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    signOut: {
      signedOutUserIds: [objectIdToStr(user._id)],
      availableUsers: [],
    },
  });

  expect(clearAllUsersSpy).toHaveBeenCalled();
});
