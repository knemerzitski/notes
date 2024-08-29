import { ObjectId } from 'mongodb';
import { expect, it } from 'vitest';
import { apolloServer } from '../../../../../__test__/helpers/graphql/apollo-server';
import {
  CreateGraphQLResolversContextOptions,
  createGraphQLResolversContext,
} from '../../../../../__test__/helpers/graphql/graphql-context';
import { expectGraphQLResponseData } from '../../../../../__test__/helpers/graphql/response';
import { sessionDefaultValues } from '../../../../../mongodb/schema/session';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { Cookies } from '../../../../../services/http/cookies';
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
      availableUserIds
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

it('removes userIds in cookies not known to client', async () => {
  const userId = new ObjectId();
  const cookieId = sessionDefaultValues.cookieId();

  const cookies = new Cookies();
  cookies.setSession(userId, cookieId);
  cookies.setSession(new ObjectId(), sessionDefaultValues.cookieId());

  const multiValueHeaders: Record<string, (string | number | boolean)[]> = {};

  const response = await executeOperation(
    {
      availableUserIds: [objectIdToStr(userId)],
    },
    {
      override: {
        cookies,
        response: {
          multiValueHeaders,
        },
      },
    }
  );

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    syncSessionCookies: {
      availableUserIds: [objectIdToStr(userId)],
    },
  });

  expect(cookies.getAvailableSessionUserIds()).toStrictEqual([objectIdToStr(userId)]);

  expect(multiValueHeaders).toEqual({
    'Set-Cookie': [
      `Sessions=${objectIdToStr(userId)}:${cookieId}; HttpOnly; SameSite=Strict; Path=/`,
    ],
  });
});

it('ignores unknown client userIds not in cookies', async () => {
  const userId = new ObjectId();
  const unknownUserId = new ObjectId();
  const cookieId = sessionDefaultValues.cookieId();

  const cookies = new Cookies();
  cookies.setSession(userId, cookieId);

  const multiValueHeaders: Record<string, (string | number | boolean)[]> = {};

  const response = await executeOperation(
    {
      availableUserIds: [objectIdToStr(userId), objectIdToStr(unknownUserId)],
    },
    {
      override: {
        cookies,
        response: {
          multiValueHeaders,
        },
      },
    }
  );

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    syncSessionCookies: {
      availableUserIds: [objectIdToStr(userId)],
    },
  });

  expect(cookies.getAvailableSessionUserIds()).toStrictEqual([objectIdToStr(userId)]);

  expect(multiValueHeaders).toEqual({
    'Set-Cookie': [
      `Sessions=${objectIdToStr(userId)}:${cookieId}; HttpOnly; SameSite=Strict; Path=/`,
    ],
  });
});
