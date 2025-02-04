import { faker } from '@faker-js/faker';
import { beforeEach, expect, it } from 'vitest';

import { apolloServer } from '../../../../../__tests__/helpers/graphql/apollo-server';
import {
  CreateGraphQLResolversContextOptions,
  createGraphQLResolversContext,
} from '../../../../../__tests__/helpers/graphql/graphql-context';
import { expectGraphQLResponseData } from '../../../../../__tests__/helpers/graphql/response';
import { resetDatabase } from '../../../../../__tests__/helpers/mongodb/mongodb';
import { populateExecuteAll } from '../../../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../../../__tests__/helpers/mongodb/populate/user';
import { SessionSchema } from '../../../../../mongodb/schema/session';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { Cookies } from '../../../../../services/http/cookies';
import { SessionsCookie } from '../../../../../services/http/sessions-cookie';
import {
  SyncSessionCookiesInput,
  SyncSessionCookiesPayload,
} from '../../../types.generated';

interface Variables {
  input: SyncSessionCookiesInput;
}

const MUTATION = `#graphql
  mutation SignOut($input: SyncSessionCookiesInput!) {
    syncSessionCookies(input: $input) {
      availableUsers {
        id
      }
    }
  }
`;

async function executeOperation(
  input: Variables['input'],
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      syncSessionCookies: SyncSessionCookiesPayload;
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
}

beforeEach(async () => {
  faker.seed(532532);
  await resetDatabase();
});

it('removes userIds in cookies not known to client', async () => {
  const user1 = fakeUserPopulateQueue();
  const user2 = fakeUserPopulateQueue();
  await populateExecuteAll();

  const userId = user1._id;
  const cookieId = SessionSchema.schema.cookieId.create(undefined);

  const cookies = new Cookies();
  const sessionsCookie = new SessionsCookie({
    cookies,
  });

  sessionsCookie.update(userId, cookieId);
  sessionsCookie.update(user2._id, SessionSchema.schema.cookieId.create(undefined));

  const context = createGraphQLResolversContext({
    sessionsCookie,
  });

  const response = await executeOperation(
    {
      availableUserIds: [userId],
    },
    {
      contextValue: context,
    }
  );

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    syncSessionCookies: {
      availableUsers: [{ id: objectIdToStr(userId) }],
    },
  });

  expect(context.services.auth.getAvailableUserIds().map(objectIdToStr)).toStrictEqual([
    objectIdToStr(userId),
  ]);

  expect(cookies.getMultiValueHeadersSetCookies()).toStrictEqual([
    `Sessions=${objectIdToStr(userId)}:${cookieId}; HttpOnly; SameSite=Strict; Path=/`,
  ]);
});

it('ignores unknown client userIds not in cookies', async () => {
  const user1 = fakeUserPopulateQueue();
  const user2 = fakeUserPopulateQueue();
  await populateExecuteAll();

  const userId = user1._id;
  const unknownUserId = user2._id;
  const cookieId = SessionSchema.schema.cookieId.create(undefined);

  const cookies = new Cookies();
  const sessionsCookie = new SessionsCookie({
    cookies,
  });

  sessionsCookie.update(userId, cookieId);

  const context = createGraphQLResolversContext({
    sessionsCookie,
  });

  const response = await executeOperation(
    {
      availableUserIds: [userId, unknownUserId],
    },
    {
      contextValue: context,
    }
  );

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    syncSessionCookies: {
      availableUsers: [
        {
          id: objectIdToStr(userId),
        },
      ],
    },
  });

  expect(context.services.auth.getAvailableUserIds().map(objectIdToStr)).toStrictEqual([
    objectIdToStr(userId),
  ]);

  expect(cookies.getMultiValueHeadersSetCookies()).toStrictEqual([
    `Sessions=${objectIdToStr(userId)}:${cookieId}; HttpOnly; SameSite=Strict; Path=/`,
  ]);
});
